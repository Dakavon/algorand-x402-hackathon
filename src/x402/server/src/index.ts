// Energy seller: Hono x402 resource server.
// Holds only the seller public address; the buyer signs in src/x402/client.

import { config } from "dotenv";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

config();

const ALGORAND_TESTNET_CAIP2 = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as const;
const ALGORAND_MAINNET_CAIP2 = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=" as const;

const sellerAddress = process.env.SELLER_ADDRESS;
const facilitatorUrl = process.env.FACILITATOR_URL;
const port = Number(process.env.PORT ?? 4021);
const pricePerKwh = process.env.PRICE_PER_KWH ?? process.env.PRICE_PER_KWH_USD ?? "0.01";
const paymentAssetSymbol = process.env.PAYMENT_ASSET_SYMBOL ?? "USDC";
const paymentAssetId = process.env.PAYMENT_ASSET_ID ?? process.env.USDC_ASSET_ID ?? "10458941";
const paymentAssetDecimals = Number(process.env.PAYMENT_ASSET_DECIMALS ?? 6);
const paymentNetwork = process.env.PAYMENT_NETWORK ?? ALGORAND_TESTNET_CAIP2;
const mockEvPlugged = process.env.MOCK_EV_PLUGGED === "true";
const mockPricePerKwh = process.env.MOCK_PRICE_PER_KWH;
const producerUrl = process.env.PI_URL ?? "http://localhost:8001";
const agentUrl = process.env.AGENT_URL ?? "http://localhost:4022";
const KWH_PER_PURCHASE = 1;
const MIN_KWH_PER_PURCHASE = 0.1;
const POLL_INTERVAL_MS = 2000;
const STALE_AFTER_MS = 5000;
const PAYMENTS_LOG = join(process.cwd(), "payments.jsonl");
const loraNetworkPath = paymentNetwork === ALGORAND_MAINNET_CAIP2 ? "mainnet" : "testnet";

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

type ConsumeResponse = {
  ok: boolean;
  battery_kwh?: number;
  battery_pct?: number;
  error?: string;
};

type AgentState = {
  state: "IDLE" | "EVALUATING" | "PAYING" | "CHARGING" | "WAITING" | "ERROR";
  delivery_remaining_kwh: number;
  budget_remaining_usdc: number;
  max_price_per_kwh: number;
  payment_symbol?: string;
  last_tx_id?: string;
  decision_reason?: string;
};

type DashboardEvent = {
  ts: number;
  type: "STATE" | "DECISION" | "PAYMENT" | "ERROR";
  message: string;
  kwh?: number;
  price_usdc?: number;
  asset_symbol?: string;
  tx_id?: string;
  lora_url?: string;
};

type PaymentRow = {
  ts: number;
  kwh: number;
  price_paid_usdc: number;
  asset_symbol?: string;
  tx_id: string;
  lora_url?: string;
};

type ApiErrorCode =
  | "PRODUCER_UNREACHABLE"
  | "AGENT_UNREACHABLE"
  | "NO_OFFER_AVAILABLE"
  | "INSUFFICIENT_BATTERY"
  | "INVALID_KWH"
  | "INTERNAL_ERROR";

const fallbackProducer: ProducerStatus = {
  ts: Date.now() / 1000,
  solar_kw: mockEvPlugged ? 4.2 : 0,
  battery_kwh: 10,
  battery_pct: 1,
  price_per_kwh: Number(mockPricePerKwh || pricePerKwh),
  ev_plugged: mockEvPlugged,
  has_offer: mockEvPlugged,
  stale: true,
};

const fallbackAgent: AgentState = {
  state: "IDLE",
  delivery_remaining_kwh: 0,
  budget_remaining_usdc: 0,
  max_price_per_kwh: Number(pricePerKwh),
  payment_symbol: paymentAssetSymbol,
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
  if (!producerLastSeenMs) return mockEvPlugged ? "stale" : "down";
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

  const rows: PaymentRow[] = [];
  for (const line of content.split("\n")) {
    try {
      const parsed = JSON.parse(line) as PaymentRow;
      rows.push({ asset_symbol: paymentAssetSymbol, ...parsed });
    } catch {
      // Ignore malformed historical rows.
    }
  }
  return rows.sort((a, b) => b.ts - a.ts);
}

function appendPayment(row: PaymentRow): void {
  appendFileSync(PAYMENTS_LOG, `${JSON.stringify(row)}\n`, "utf8");
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(paymentAssetDecimals === 2 ? 2 : 6)}`;
}

function loraTxUrl(txId: string): string {
  return `https://lora.algokit.io/${loraNetworkPath}/tx/${txId}`;
}

function parseRequestedKwh(raw: string | undefined): number | null {
  const requestedKwh = Number(raw ?? String(KWH_PER_PURCHASE));
  if (!Number.isFinite(requestedKwh) || requestedKwh < MIN_KWH_PER_PURCHASE) {
    return null;
  }
  return requestedKwh;
}

function normalizeProducer(status: ProducerStatus): ProducerStatus {
  return {
    ...status,
    ev_plugged: mockEvPlugged || status.ev_plugged,
    price_per_kwh: mockPricePerKwh ? Number(mockPricePerKwh) : Number(status.price_per_kwh),
  };
}

function canSellKwh(kwh: number): { ok: true } | { ok: false; status: number; code: ApiErrorCode; message: string } {
  if (!producerCache.has_offer) {
    return { ok: false, status: 409, code: "NO_OFFER_AVAILABLE", message: "No surplus energy is available" };
  }
  if (producerCache.battery_kwh < kwh) {
    return { ok: false, status: 409, code: "INSUFFICIENT_BATTERY", message: "Not enough stored energy is available" };
  }
  if (producerHealth() === "down" && !mockEvPlugged) {
    return { ok: false, status: 503, code: "PRODUCER_UNREACHABLE", message: "Producer is unreachable" };
  }
  return { ok: true };
}

function applyFallbackConsume(kwh: number): ConsumeResponse {
  producerCache = {
    ...producerCache,
    battery_kwh: Number(Math.max(0, producerCache.battery_kwh - kwh).toFixed(3)),
  };
  producerCache = {
    ...producerCache,
    battery_pct: Number((producerCache.battery_kwh / 10).toFixed(3)),
    has_offer: producerCache.battery_kwh > 0 || producerCache.solar_kw >= 1,
  };
  return {
    ok: true,
    battery_kwh: producerCache.battery_kwh,
    battery_pct: producerCache.battery_pct,
  };
}

function snapshotPayload() {
  const producerStatus = {
    ...producerCache,
    stale: producerHealth() !== "ok",
  };
  const payments = readPaymentsLog();
  const soldKwh = payments.reduce((sum, row) => sum + row.kwh, 0);
  const spentAmount = payments.reduce((sum, row) => sum + row.price_paid_usdc, 0);
  return {
    payment_symbol: paymentAssetSymbol,
    payment_asset_id: paymentAssetId,
    payment_network: paymentNetwork,
    producer: producerStatus,
    agent: {
      ...agentCache,
      payment_symbol: agentCache.payment_symbol ?? paymentAssetSymbol,
    },
    totals: {
      sold_kwh: Number(soldKwh.toFixed(3)),
      spent_usdc: Number(spentAmount.toFixed(6)),
      spent_amount: Number(spentAmount.toFixed(6)),
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
    producerCache = normalizeProducer(status);
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

if (!sellerAddress || sellerAddress.includes("PASTE")) {
  console.error("SELLER_ADDRESS is required in src/x402/server/.env");
  process.exit(1);
}
if (!facilitatorUrl) {
  console.error("FACILITATOR_URL is required in src/x402/server/.env");
  process.exit(1);
}

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

const accepts = [
  {
    scheme: "exact",
    price: (context: { adapter?: { getQueryParam?: (name: string) => string | undefined } }) => {
      const kwh = parseRequestedKwh(context.adapter?.getQueryParam?.("kwh")) ?? KWH_PER_PURCHASE;
      const unitPrice = producerCache.price_per_kwh || Number(pricePerKwh);
      return formatPrice(kwh * unitPrice);
    },
    network: paymentNetwork,
    payTo: sellerAddress,
    extra: {
      asset: paymentAssetId,
      decimals: paymentAssetDecimals,
      name: paymentAssetSymbol,
    },
  },
];

const server = new x402ResourceServer(facilitatorClient).register(
  paymentNetwork,
  new ExactAvmScheme(),
);

const app = new Hono();

app.get("/health", c =>
  c.json({
    ok: true,
    role: "seller",
    network: paymentNetwork,
    payment_asset_id: paymentAssetId,
    payment_symbol: paymentAssetSymbol,
    price_per_kwh: Number(pricePerKwh),
    price_per_kwh_usd: Number(pricePerKwh),
    pay_to: sellerAddress,
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
  const minutes = Number(c.req.query("minutes") ?? "10");
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
  const limit = Math.max(1, Math.min(100, Number(c.req.query("limit") ?? "100") || 100));

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

app.post("/report-payment", async c => {
  const body = (await c.req.json().catch(() => null)) as Partial<PaymentRow> | null;
  if (!body || typeof body.kwh !== "number" || typeof body.price_paid_usdc !== "number" || !body.tx_id) {
    return c.json(apiError("INTERNAL_ERROR", "invalid payment report", false), 400);
  }
  const row: PaymentRow = {
    ts: nowSeconds(),
    kwh: body.kwh,
    price_paid_usdc: body.price_paid_usdc,
    asset_symbol: body.asset_symbol ?? paymentAssetSymbol,
    tx_id: body.tx_id,
    lora_url: body.lora_url ?? loraTxUrl(body.tx_id),
  };
  appendPayment(row);
  addEvent({
    ts: row.ts,
    type: "PAYMENT",
    message: `Paid ${row.price_paid_usdc.toFixed(2)} ${row.asset_symbol ?? paymentAssetSymbol} for ${row.kwh.toFixed(2)} kWh`,
    kwh: row.kwh,
    price_usdc: row.price_paid_usdc,
    asset_symbol: row.asset_symbol ?? paymentAssetSymbol,
    tx_id: row.tx_id,
    ...(row.lora_url ? { lora_url: row.lora_url } : {}),
  });
  return c.json({ ok: true });
});

app.use("/energy/buy", async (c, next) => {
  const requestedKwh = parseRequestedKwh(c.req.query("kwh"));
  if (requestedKwh === null) {
    return c.json(apiError("INVALID_KWH", "kwh query must be at least 0.1", false), 400);
  }

  const sellable = canSellKwh(requestedKwh);
  if (!sellable.ok) {
    const body = apiError(sellable.code, sellable.message, sellable.status >= 500);
    return sellable.status === 503 ? c.json(body, 503) : c.json(body, 409);
  }

  await next();
});

app.use(
  paymentMiddleware(
    {
      "GET /energy/buy": {
        accepts,
        description: `Buy solar energy (per kWh), settled in ${paymentAssetSymbol} on Algorand`,
        mimeType: "application/json",
      },
    },
    server,
  ),
);

app.get("/energy/buy", async c => {
  const requestedKwh = parseRequestedKwh(c.req.query("kwh"));
  if (requestedKwh === null) {
    return c.json(apiError("INVALID_KWH", "kwh query must be at least 0.1", false), 400);
  }

  const unitPrice = producerCache.price_per_kwh || Number(pricePerKwh);
  const pricePaid = Number((requestedKwh * unitPrice).toFixed(paymentAssetDecimals));
  let consumeResult: ConsumeResponse;

  if (producerHealth() === "ok") {
    try {
      const response = await fetch(`${producerUrl}/consume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kwh: requestedKwh }),
      });
      consumeResult = (await response.json().catch(() => ({ ok: false }))) as ConsumeResponse;
      if (response.status === 409) {
        return c.json(apiError("INSUFFICIENT_BATTERY", consumeResult.error ?? "insufficient_battery", true), 409);
      }
      if (!response.ok || !consumeResult.ok) {
        return c.json(apiError("PRODUCER_UNREACHABLE", "Producer consume failed after payment", true), 502);
      }
      if (typeof consumeResult.battery_kwh === "number" && typeof consumeResult.battery_pct === "number") {
        producerCache = {
          ...producerCache,
          battery_kwh: consumeResult.battery_kwh,
          battery_pct: consumeResult.battery_pct,
          has_offer: consumeResult.battery_kwh > 0 || producerCache.solar_kw >= 1,
        };
      }
    } catch {
      return c.json(apiError("PRODUCER_UNREACHABLE", "Producer consume failed after payment", true), 502);
    }
  } else {
    consumeResult = applyFallbackConsume(requestedKwh);
  }

  return c.json({
    granted_kwh: requestedKwh,
    price_paid_usdc: pricePaid,
    asset_symbol: paymentAssetSymbol,
    timestamp: new Date().toISOString(),
    new_battery_kwh: consumeResult.battery_kwh ?? producerCache.battery_kwh,
    new_battery_pct: consumeResult.battery_pct ?? producerCache.battery_pct,
  });
});

void pollProducer();
void pollAgent();
setInterval(() => {
  void pollProducer();
  void pollAgent();
}, POLL_INTERVAL_MS);

serve({ fetch: app.fetch, port });

console.log(`Energy x402 server listening at http://localhost:${port}`);
console.log(`  pay-to : ${sellerAddress}`);
console.log(`  asset  : ${paymentAssetSymbol} (${paymentAssetId})`);
console.log(`  network: ${paymentNetwork}`);
console.log(`  price  : ${pricePerKwh} ${paymentAssetSymbol}/kWh`);
console.log(`  facil. : ${facilitatorUrl}`);
