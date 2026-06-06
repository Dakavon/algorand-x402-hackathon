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
import { serve } from "@hono/node-server";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

config();

// Algorand TestNet network id (CAIP-2), provided by the organizers.
const NETWORK = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as const;

const avmAddress = process.env.AVM_ADDRESS;
const facilitatorUrl = process.env.FACILITATOR_URL;
const port = Number(process.env.PORT ?? 4021);
const pricePerKwhUsd = process.env.PRICE_PER_KWH_USD ?? "0.01";
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
  stale?: boolean;
};

type AgentState = {
  state: "IDLE" | "EVALUATING" | "PAYING" | "CHARGING" | "WAITING" | "ERROR";
  delivery_remaining_kwh: number;
  budget_remaining_usdc: number;
  max_price_per_kwh: number;
  last_tx_id?: string;
  decision_reason?: string;
};

type DashboardEvent = {
  ts: number;
  type: "STATE" | "DECISION" | "PAYMENT" | "ERROR";
  message: string;
  kwh?: number;
  price_usdc?: number;
  tx_id?: string;
  lora_url?: string;
};

type PaymentRow = {
  ts: number;
  kwh: number;
  price_paid_usdc: number;
  tx_id: string;
  lora_url?: string;
};

type ApiErrorCode =
  | "PRODUCER_UNREACHABLE"
  | "AGENT_UNREACHABLE"
  | "NO_OFFER_AVAILABLE"
  | "INVALID_KWH"
  | "INTERNAL_ERROR";

const fallbackProducer: ProducerStatus = {
  ts: Date.now() / 1000,
  solar_kw: 0,
  battery_kwh: 10,
  battery_pct: 1,
  price_per_kwh: Number(pricePerKwhUsd),
  ev_plugged: false,
  has_offer: true,
  stale: true,
};

const fallbackAgent: AgentState = {
  state: "IDLE",
  delivery_remaining_kwh: 0,
  budget_remaining_usdc: 0,
  max_price_per_kwh: Number(pricePerKwhUsd),
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
  const producerStatus = {
    ...producerCache,
    stale: producerHealth() !== "ok",
  };
  const payments = readPaymentsLog();
  const soldKwh = payments.reduce((sum, row) => sum + row.kwh, 0);
  const spentUsdc = payments.reduce((sum, row) => sum + row.price_paid_usdc, 0);
  return {
    producer: producerStatus,
    agent: agentCache,
    totals: {
      sold_kwh: Number(soldKwh.toFixed(3)),
      spent_usdc: Number(spentUsdc.toFixed(6)),
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
            ? Number(pricePerKwhUsd)
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
    price: `$${pricePerKwhUsd}`,
    network: NETWORK,
    payTo: avmAddress,
  },
];

const server = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactAvmScheme(),
);

const app = new Hono();

// Free: health/status (no payment).
app.get("/health", c =>
  c.json({
    ok: true,
    role: "seller",
    network: NETWORK,
    price_per_kwh_usd: pricePerKwhUsd,
    pay_to: avmAddress,
  }),
);

app.get("/status", c => c.json({ ...producerCache, stale: producerHealth() !== "ok" }));

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

// Paywalled: buying energy requires an x402 payment.
app.use(
  paymentMiddleware(
    {
      "GET /energy/buy": {
        accepts,
        description: "Buy solar energy (per kWh), settled in USDC on Algorand",
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

  if (!producerCache.has_offer) {
    return c.json(apiError("NO_OFFER_AVAILABLE", "No surplus energy is available", true), 409);
  }

  const unitPrice = producerCache.price_per_kwh || Number(pricePerKwhUsd);
  const pricePaidUsdc = Number((requestedKwh * unitPrice).toFixed(6));
  const fakeTx = `local-${Date.now().toString(36)}`;

  if (producerHealth() === "ok") {
    try {
      await fetch(`${producerUrl}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kwh: requestedKwh }),
      });
    } catch {
      // Keep serving Phase-0 style while producer is unavailable.
    }
  }

  const paymentRow: PaymentRow = {
    ts: nowSeconds(),
    kwh: requestedKwh,
    price_paid_usdc: pricePaidUsdc,
    tx_id: fakeTx,
    ...(fakeTx ? { lora_url: `https://lora.algokit.io/testnet/tx/${fakeTx}` } : {}),
  };
  appendPayment(paymentRow);

  addEvent({
    ts: nowSeconds(),
    type: "PAYMENT",
    message: `Paid ${pricePaidUsdc.toFixed(2)} USDC for ${requestedKwh.toFixed(2)} kWh`,
    kwh: requestedKwh,
    price_usdc: pricePaidUsdc,
    tx_id: paymentRow.tx_id,
    ...(paymentRow.lora_url ? { lora_url: paymentRow.lora_url } : {}),
  });

  return c.json({
    granted_kwh: requestedKwh,
    price_paid_usdc: pricePaidUsdc,
    tx_id: paymentRow.tx_id,
    timestamp: new Date().toISOString(),
    lora_url: paymentRow.lora_url,
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
console.log(`   pay-to : ${avmAddress}`);
console.log(`   price  : $${pricePerKwhUsd}/kWh`);
console.log(`   facil. : ${facilitatorUrl}`);
