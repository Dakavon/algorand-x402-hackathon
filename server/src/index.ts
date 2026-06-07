// Energy SELLER — Hono x402 server.
// Sells solar energy per kWh; payment is settled in USDC on Algorand TestNet
// by the hosted facilitator. The server only knows the seller's PUBLIC address.
//
// Verified against algorandfoundation/x402-demo (x402 v2.11.0).

import { config } from "dotenv";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

config();

// Algorand network ids (CAIP-2). Default TestNet; set PAYMENT_NETWORK=mainnet in .env
// to settle on MainNet (real USDC, ASA 31566704 — auto-selected by @x402/avm per network).
const ALGORAND_TESTNET_CAIP2 = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as const;
const ALGORAND_MAINNET_CAIP2 = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=" as const;
const NETWORK =
  (process.env.PAYMENT_NETWORK ?? "testnet").toLowerCase() === "mainnet"
    ? ALGORAND_MAINNET_CAIP2
    : ALGORAND_TESTNET_CAIP2;

const avmAddress = process.env.AVM_ADDRESS;
const facilitatorUrl = process.env.FACILITATOR_URL;
const port = Number(process.env.PORT ?? 4021);
const defaultPrice = process.env.PRICE_PER_KWH ?? "0.01";
// Payment asset. Defaults to USDC for the network; override for a custom ASA (e.g. EURD).
// The `price` ("$X") is interpreted in THIS asset's units, using these decimals.
const isMainnetNet = NETWORK === ALGORAND_MAINNET_CAIP2;
const networkAssetId = isMainnetNet ? "31566704" : "10458941";
const paymentAssetId = process.env.PAYMENT_ASSET_ID ?? networkAssetId;
const paymentAssetDecimals = Number(process.env.PAYMENT_ASSET_DECIMALS ?? 6);
const paymentAssetSymbol = process.env.PAYMENT_ASSET_SYMBOL ?? "EURD";
// "$X" prices always resolve to USDC. A custom ASA (EURD/EURQ) must be priced as
// { amount: <atomic units>, asset: <asa id> }. Atomic = price * 10^decimals.
const usesCustomAsset = paymentAssetId !== networkAssetId;
const producerUrl = process.env.PI_URL ?? "http://localhost:8001";
const agentUrl = process.env.AGENT_URL ?? "http://localhost:4022";
const KWH_PER_PURCHASE = 1;
const POLL_INTERVAL_MS = 2000;
const STALE_AFTER_MS = 5000;
const PAYMENTS_LOG = join(process.cwd(), "payments.jsonl");

type HealthStatus = "ok" | "stale" | "down" | "error";

type ProducerStatus = {
  ts: number;
  solar_kw: number;
  battery_kwh: number;
  battery_pct: number;
  price_per_kwh: number;
  ev_plugged: boolean;
  has_offer: boolean;
  available_kwh?: number;
  stale?: boolean;
};

type AgentState = {
  state: "IDLE" | "EVALUATING" | "PAYING" | "CHARGING" | "WAITING" | "ERROR";
  mode?: "fixed" | "metered";
  delivery_remaining_kwh: number;
  budget_remaining: number;
  max_price_per_kwh: number;
  last_tx_id?: string;
  decision_reason?: string;
};

type DashboardEvent = {
  ts: number;
  type: "STATE" | "DECISION" | "PAYMENT" | "ERROR";
  message: string;
  kwh?: number;
  price?: number;
  tx_id?: string;
  lora_url?: string;
};

type PaymentRow = {
  ts: number;
  kwh: number;
  price_paid: number;
  tx_id: string;
  lora_url?: string;
};

type ApiErrorCode =
  | "PRODUCER_UNREACHABLE"
  | "AGENT_UNREACHABLE"
  | "NO_OFFER_AVAILABLE"
  | "INVALID_KWH"
  | "INTERNAL_ERROR";

// Laptop-only simulation: when no Pi is connected, MOCK_EV_PLUGGED=true makes the
// fallback producer behave like a live producer with the EV plugged in, so the agent
// will autonomously buy on a loop. Has no effect once a real Pi is reachable (its
// real /status overrides this cache). Remove/set false before relying on the Pi.
const mockEvPlugged = process.env.MOCK_EV_PLUGGED === "true";
const fallbackProducer: ProducerStatus = {
  ts: Date.now() / 1000,
  solar_kw: mockEvPlugged ? 4.2 : 0,
  battery_kwh: 10,
  battery_pct: 1,
  price_per_kwh: Number(defaultPrice),
  ev_plugged: mockEvPlugged,
  has_offer: true,
  available_kwh: 10,
  stale: true,
};

// Runtime sim controls driven by the dashboard (POST /control/*). These only shape
// the no-Pi fallback producer; a live Pi's fresh /status still overrides them.
const simControl = {
  ev_plugged: mockEvPlugged,
  price_per_kwh: Number(defaultPrice),
};

const fallbackAgent: AgentState = {
  state: "IDLE",
  delivery_remaining_kwh: 0,
  budget_remaining: 0,
  max_price_per_kwh: Number(defaultPrice),
  decision_reason: "Agent not reachable yet",
};

let producerCache: ProducerStatus = fallbackProducer;
let producerLastSeenMs = 0;
let agentCache: AgentState = fallbackAgent;
let agentLastSeenMs = 0;
const events: DashboardEvent[] = [];

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function addEvent(event: DashboardEvent): void {
  events.unshift(event);
  if (events.length > 100) {
    events.length = 100;
  }
}

function apiError(code: ApiErrorCode, message: string, retryable: boolean): {
  ok: false;
  error: { code: ApiErrorCode; message: string; retryable: boolean };
  ts: number;
} {
  return {
    ok: false,
    error: { code, message, retryable },
    ts: nowSeconds(),
  };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${url} failed with status ${response.status}`);
  }
  return (await response.json()) as T;
}

async function postAgentJson(path: string, body: unknown): Promise<boolean> {
  try {
    const r = await fetch(`${agentUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    return r.ok;
  } catch {
    return false;
  }
}

// Producer status the rest of the app should read. A fresh Pi wins; otherwise the
// dashboard-controllable simulation (simControl) drives it.
function currentProducerStatus(): ProducerStatus {
  if (producerHealth() === "ok") {
    return { ...producerCache, stale: false };
  }
  return {
    ...fallbackProducer,
    ts: Date.now() / 1000,
    ev_plugged: simControl.ev_plugged,
    solar_kw: simControl.ev_plugged ? 4.2 : 0,
    price_per_kwh: simControl.price_per_kwh,
    has_offer: true,
    stale: true,
  };
}

function producerHealth(): HealthStatus {
  if (!producerLastSeenMs) return "down";
  const age = Date.now() - producerLastSeenMs;
  return age > STALE_AFTER_MS ? "stale" : "ok";
}

function agentHealth(): HealthStatus {
  if (!agentLastSeenMs) return "down";
  const age = Date.now() - agentLastSeenMs;
  return age > STALE_AFTER_MS ? "down" : "ok";
}

function readPaymentsLog(): PaymentRow[] {
  if (!existsSync(PAYMENTS_LOG)) return [];
  const content = readFileSync(PAYMENTS_LOG, "utf8").trim();
  if (!content) return [];

  const lines = content.split("\n");
  const rows: PaymentRow[] = [];
  for (const line of lines) {
    try {
      const parsed = JSON.parse(line) as PaymentRow;
      rows.push(parsed);
    } catch {
      // Ignore malformed historical rows.
    }
  }
  return rows.sort((a, b) => b.ts - a.ts);
}

function appendPayment(row: PaymentRow): void {
  appendFileSync(PAYMENTS_LOG, `${JSON.stringify(row)}\n`, "utf8");
}

function snapshotPayload() {
  const producerStatus = currentProducerStatus();
  const payments = readPaymentsLog();
  const soldKwh = payments.reduce((sum, row) => sum + row.kwh, 0);
  const totalSpent = payments.reduce((sum, row) => sum + row.price_paid, 0);
  return {
    producer: producerStatus,
    agent: agentCache,
    totals: {
      sold_kwh: Number(soldKwh.toFixed(3)),
      spent: Number(totalSpent.toFixed(6)),
      tx_count: payments.length,
      ev_power_kw: agentCache.state === "CHARGING" ? 3 : 0,
    },
    health: {
      producer: producerHealth(),
      x402: "ok" as const,
      agent: agentHealth(),
    },
  };
}

async function pollProducer(): Promise<void> {
  try {
    const status = await fetchJson<ProducerStatus>(`${producerUrl}/status`);
    producerCache = {
      ...status,
      price_per_kwh:
        typeof status.price_per_kwh === "number"
          ? status.price_per_kwh
          : typeof status.price_per_kwh === "undefined"
            ? Number(defaultPrice)
            : Number(status.price_per_kwh),
    };
    producerLastSeenMs = Date.now();
  } catch {
    // Keep last known cache and allow stale reporting.
  }
}

async function pollAgent(): Promise<void> {
  try {
    const state = await fetchJson<AgentState>(`${agentUrl}/state`);
    agentCache = state;
    agentLastSeenMs = Date.now();
  } catch {
    // Keep last known cache and allow stale reporting.
  }
}

if (!avmAddress || avmAddress.includes("PASTE")) {
  console.error("❌ AVM_ADDRESS (seller address) is required in server/.env");
  process.exit(1);
}
if (!facilitatorUrl) {
  console.error("❌ FACILITATOR_URL is required in server/.env");
  process.exit(1);
}

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

const accepts = [
  {
    scheme: "exact",
    // Price is evaluated per-request from the live producer status.
    // Custom ASA (EURD): { amount: <atomic units>, asset: <asa id> }.
    // Default ($X): auto-mapped by the facilitator from the $ string.
    price: () => {
      const status = currentProducerStatus();
      const currentPrice = status.price_per_kwh || Number(defaultPrice);
      return usesCustomAsset
        ? { amount: String(Math.round(currentPrice * 10 ** paymentAssetDecimals)), asset: paymentAssetId }
        : `$${currentPrice}`;
    },
    network: NETWORK,
    payTo: avmAddress,
  },
];

const server = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactAvmScheme(),
);

const app = new Hono();

// Allow the dashboard (separate origin, e.g. :5173 or a Lovable export) to call us.
app.use("*", cors());

// Free: health/status (no payment).
app.get("/health", c =>
  c.json({
    ok: true,
    role: "seller",
    network: NETWORK,
    default_price_per_kwh: defaultPrice,
    pay_to: avmAddress,
  }),
);

app.get("/status", c => c.json(currentProducerStatus()));

app.get("/api/health", c =>
  c.json({
    producer: producerHealth(),
    x402: "ok",
    agent: agentHealth(),
    last_producer_seen_ts: producerLastSeenMs ? Math.floor(producerLastSeenMs / 1000) : 0,
    last_agent_seen_ts: agentLastSeenMs ? Math.floor(agentLastSeenMs / 1000) : 0,
  }),
);

app.get("/api/snapshot", c => c.json(snapshotPayload()));

app.get("/api/history", async c => {
  const minutesRaw = c.req.query("minutes") ?? "10";
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return c.json(apiError("INVALID_KWH", "minutes query must be a positive number", false), 400);
  }

  try {
    const rows = await fetchJson<unknown[]>(`${producerUrl}/history?minutes=${minutes}`);
    return c.json(rows);
  } catch {
    return c.json([]);
  }
});

app.get("/api/events", async c => {
  const limitRaw = c.req.query("limit") ?? "100";
  const limit = Math.max(1, Math.min(100, Number(limitRaw) || 100));

  let agentEvents: DashboardEvent[] = [];
  try {
    agentEvents = await fetchJson<DashboardEvent[]>(`${agentUrl}/events?limit=${limit}`);
  } catch {
    // Keep local events only if agent events are unavailable.
  }

  const merged = [...events, ...agentEvents]
    .sort((a, b) => b.ts - a.ts)
    .slice(0, limit);
  return c.json(merged);
});

app.get("/api/payments", c => c.json(readPaymentsLog()));

// The buyer reports a settled payment (with the REAL on-chain tx) so the ledger
// and dashboard show genuine, clickable Lora links.
app.post("/report-payment", async c => {
  const body = (await c.req.json().catch(() => null)) as Partial<PaymentRow> | null;
  if (
    !body ||
    typeof body.kwh !== "number" ||
    typeof body.price_paid !== "number" ||
    !body.tx_id
  ) {
    return c.json(apiError("INTERNAL_ERROR", "invalid payment report", false), 400);
  }
  const row: PaymentRow = {
    ts: nowSeconds(),
    kwh: body.kwh,
    price_paid: body.price_paid,
    tx_id: body.tx_id,
    ...(body.lora_url ? { lora_url: body.lora_url } : {}),
  };
  appendPayment(row);
  addEvent({
    ts: row.ts,
    type: "PAYMENT",
    message: `Paid ${row.price_paid.toFixed(2)} ${paymentAssetSymbol} for ${row.kwh.toFixed(2)} kWh`,
    kwh: row.kwh,
    price: row.price_paid,
    tx_id: row.tx_id,
    ...(row.lora_url ? { lora_url: row.lora_url } : {}),
  });
  return c.json({ ok: true });
});

// --- Dashboard control plane (interactive demo) ---
// Plug/unplug the EV: start or stop the autonomous buying loop.
app.post("/control/ev", async c => {
  const body = (await c.req.json().catch(() => ({}))) as { plugged?: boolean };
  simControl.ev_plugged = Boolean(body.plugged);
  await postAgentJson("/pause", { paused: !simControl.ev_plugged });
  addEvent({
    ts: nowSeconds(),
    type: "DECISION",
    message: `EV ${simControl.ev_plugged ? "plugged in" : "unplugged"} from dashboard`,
  });
  return c.json({ ok: true, ev_plugged: simControl.ev_plugged });
});

// Fire one immediate purchase (manual buy-one). In fixed mode, omit kwh to buy the
// agent's configured one-time amount; pass kwh to let the user pick how much to buy.
app.post("/control/buy", async c => {
  const body = (await c.req.json().catch(() => ({}))) as { kwh?: number };
  const ok = await postAgentJson("/buy-now", { kwh: body.kwh });
  return c.json({ ok });
});

// Switch the agent's purchase mode: "fixed" (one-time, default) <-> "metered" (loop).
app.post("/control/mode", async c => {
  const body = (await c.req.json().catch(() => ({}))) as { mode?: string };
  if (body.mode !== "fixed" && body.mode !== "metered") {
    return c.json(apiError("INVALID_KWH", "mode must be 'fixed' or 'metered'", false), 400);
  }
  const ok = await postAgentJson("/mode", { mode: body.mode });
  addEvent({
    ts: nowSeconds(),
    type: "DECISION",
    message: `Purchase mode set to ${body.mode} from dashboard`,
  });
  return c.json({ ok, mode: body.mode });
});

// Live knobs: per-kWh price (producer) + budget / max-price policy (agent).
app.post("/control/config", async c => {
  const body = (await c.req.json().catch(() => ({}))) as {
    price_per_kwh?: number;
    budget_usd?: number;
    max_price_per_kwh?: number;
  };
  if (typeof body.price_per_kwh === "number") simControl.price_per_kwh = body.price_per_kwh;
  const agentCfg: Record<string, number> = {};
  if (typeof body.budget_usd === "number") agentCfg.budget_usd = body.budget_usd;
  if (typeof body.max_price_per_kwh === "number") agentCfg.max_price_per_kwh = body.max_price_per_kwh;
  if (Object.keys(agentCfg).length) await postAgentJson("/config", agentCfg);
  return c.json({ ok: true, price_per_kwh: simControl.price_per_kwh });
});

// Stop buying (kill switch).
app.post("/control/stop", async c => {
  simControl.ev_plugged = false;
  await postAgentJson("/pause", { paused: true });
  addEvent({ ts: nowSeconds(), type: "DECISION", message: "Buying stopped from dashboard" });
  return c.json({ ok: true });
});

// Reset the session: clear the on-ledger history + restore the agent's budget.
app.post("/control/reset", async c => {
  try {
    writeFileSync(PAYMENTS_LOG, "", "utf8");
  } catch {
    // non-fatal
  }
  events.length = 0;
  await postAgentJson("/reset", {});
  addEvent({ ts: nowSeconds(), type: "DECISION", message: "Session reset from dashboard" });
  return c.json({ ok: true });
});

// Paywalled: buying energy requires an x402 payment.
app.use(
  paymentMiddleware(
    {
      "GET /energy/buy": {
        accepts,
        description: "Buy solar energy (per kWh), settled on Algorand",
        mimeType: "application/json",
      },
    },
    server,
  ),
);

app.get("/energy/buy", async c => {
  const requestedKwhRaw = c.req.query("kwh") ?? String(KWH_PER_PURCHASE);
  const requestedKwh = Number(requestedKwhRaw);
  if (!Number.isFinite(requestedKwh) || requestedKwh <= 0) {
    return c.json(apiError("INVALID_KWH", "kwh query must be a positive number", false), 400);
  }

  const status = currentProducerStatus();
  if (!status.has_offer) {
    return c.json(apiError("NO_OFFER_AVAILABLE", "No surplus energy is available", true), 409);
  }

  const unitPrice = status.price_per_kwh || Number(defaultPrice);
  const pricePaid = Number((requestedKwh * unitPrice).toFixed(6));

  if (producerHealth() === "ok") {
    try {
      await fetch(`${producerUrl}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kwh: requestedKwh }),
      });
    } catch {
      // Producer unavailable — still grant; battery sync catches up on next poll.
    }
  }

  // The REAL on-chain tx id is known to the buyer (from the x402 settle response),
  // not here. The agent reports it via POST /report-payment, which is the source
  // of truth for the ledger + Lora links. We deliberately do NOT fabricate a tx.
  return c.json({
    granted_kwh: requestedKwh,
    price_paid: pricePaid,
    timestamp: new Date().toISOString(),
  });
});

void pollProducer();
void pollAgent();
setInterval(() => {
  void pollProducer();
  void pollAgent();
}, POLL_INTERVAL_MS);

serve({ fetch: app.fetch, port });

console.log(`⚡ Energy seller (x402 server) listening at http://localhost:${port}`);
console.log(`   network: ${isMainnetNet ? "⚠️  MAINNET (REAL FUNDS)" : "TestNet"}`);
console.log(`   asset  : ${paymentAssetSymbol} (ASA ${paymentAssetId}, ${paymentAssetDecimals} dp)`);
console.log(`   pay-to : ${avmAddress}`);
console.log(`   price  : ${defaultPrice} ${paymentAssetSymbol}/kWh (default)`);
console.log(`   facil. : ${facilitatorUrl}`);
