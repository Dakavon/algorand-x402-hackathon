// Energy BUYER — autonomous EV agent (x402 client + state server).

import { config } from "dotenv";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { toClientAvmSigner } from "@x402/avm";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import {
  ed25519SigningKeyFromWrappedSecret,
  type WrappedEd25519Seed,
} from "@algorandfoundation/algokit-utils/crypto";
import { seedFromMnemonic } from "@algorandfoundation/algokit-utils/algo25";

config();

const ALGORAND_TESTNET_CAIP2 = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as const;
const ALGORAND_MAINNET_CAIP2 = "algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=" as const;

const avmMnemonic = process.env.AVM_MNEMONIC;
const resourceServerUrl = process.env.RESOURCE_SERVER_URL ?? "http://localhost:4021";
const endpointPath = process.env.ENDPOINT_PATH ?? "/energy/buy";
const buyUrl = `${resourceServerUrl}${endpointPath}`;
const port = Number(process.env.PORT ?? 4022);
const budgetAmount = Number(process.env.BUDGET_AMOUNT ?? process.env.BUDGET_USD ?? 5);
const maxPricePerKwh = Number(process.env.MAX_PRICE_PER_KWH ?? 0.2);
const kwhPerPurchase = Number(process.env.KWH_PER_PURCHASE ?? 1);
const pollIntervalMs = Number(process.env.POLL_INTERVAL_MS ?? 2000);
const accel = Number(process.env.ACCEL ?? 60);
const paymentSymbol = process.env.PAYMENT_ASSET_SYMBOL ?? "USDC";
const paymentNetwork = process.env.PAYMENT_NETWORK ?? ALGORAND_TESTNET_CAIP2;
const loraNetworkPath = paymentNetwork === ALGORAND_MAINNET_CAIP2 ? "mainnet" : "testnet";
const chargeRateKw = 3;

// Algod node used to build payment transactions. If unset, @x402/avm falls back to
// the FREE public AlgoNode endpoint, which rate-limits and returns HTTP 403 under
// load (the cause of "Failed to create payment payload ... /v2/transactions/params
// failed with status 403"). Point ALGOD_URL at a dedicated node (+ token) to avoid it.
const algodUrl = process.env.ALGOD_URL;
const algodToken = process.env.ALGOD_TOKEN ?? "";
// How many times to retry a purchase when the node is transiently throttling (403/429/5xx).
const buyRetries = Math.max(1, Number(process.env.BUY_RETRIES ?? 4));

// Purchase mode:
//   "fixed"   (default) — buy a user-selected amount in ONE payment, then go IDLE.
//                         Few transactions; safest for rate-limited nodes & mainnet.
//   "metered" — autonomous re-buy loop: keep buying small chunks as energy is used.
// Switchable live via POST /mode (and the server's POST /control/mode).
let purchaseMode: "fixed" | "metered" =
  (process.env.PURCHASE_MODE ?? "fixed").toLowerCase() === "metered" ? "metered" : "fixed";
// Amount (kWh) a one-time fixed purchase grabs when the caller doesn't specify one.
const fixedKwh = Math.max(0.001, Number(process.env.FIXED_KWH ?? 5));

type AgentLifecycle = "IDLE" | "EVALUATING" | "PAYING" | "CHARGING" | "WAITING" | "ERROR";

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
  state: AgentLifecycle;
  mode: "fixed" | "metered";
  solar_kw: number;
  battery_pct: number;
  price_per_kwh: number;
  delivery_remaining_kwh: number;
  budget_remaining_usdc: number;
  max_price_per_kwh: number;
  payment_symbol?: string;
  last_tx_id?: string;
  decision_reason?: string;
};

type AgentEvent = {
  ts: number;
  type: "STATE" | "DECISION" | "PAYMENT" | "ERROR";
  message: string;
  kwh?: number;
  price_usdc?: number;
  asset_symbol?: string;
  tx_id?: string;
  lora_url?: string;
};

type BuyResponse = {
  granted_kwh: number;
  price_paid_usdc: number;
  asset_symbol?: string;
  tx_id?: string;
  lora_url?: string;
};

const events: AgentEvent[] = [];
let currentState: AgentState = {
  state: "IDLE",
  mode: purchaseMode,
  solar_kw: 0,
  battery_pct: 0,
  price_per_kwh: 0,
  delivery_remaining_kwh: 0,
  budget_remaining_usdc: Number(budgetAmount.toFixed(6)),
  max_price_per_kwh: maxPricePerKwh,
  payment_symbol: paymentSymbol,
  decision_reason: "Initializing",
};

let paymentFetch: ((input: RequestInfo | URL, init?: RequestInit) => Promise<Response>) | null =
  null;
let paymentInspector: x402HTTPClient | null = null;
let loopBusy = false;
let paused = false;
let lastTickMs = Date.now();

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

function pushEvent(event: AgentEvent): void {
  events.unshift(event);
  if (events.length > 100) {
    events.length = 100;
  }
  // Mirror every event to the terminal so you can watch the agent live.
  const icon =
    event.type === "PAYMENT" ? "💸" :
    event.type === "DECISION" ? "🤔" :
    event.type === "ERROR" ? "⚠️ " : "·";
  let line = `${icon} [${event.type}] ${event.message}`;
  if (event.price_usdc !== undefined) line += `  ($${event.price_usdc.toFixed(3)})`;
  if (event.tx_id) line += `\n     ↳ tx ${event.tx_id}\n     ↳ ${event.lora_url ?? `https://lora.algokit.io/testnet/tx/${event.tx_id}`}`;
  console.log(line);
}

function setState(nextState: AgentLifecycle, reason: string): void {
  if (currentState.state !== nextState) {
    pushEvent({
      ts: nowSeconds(),
      type: "STATE",
      message: `${currentState.state} -> ${nextState}`,
    });
  }
  currentState = {
    ...currentState,
    state: nextState,
    decision_reason: reason,
  };
}

function setDecision(reason: string): void {
  currentState = {
    ...currentState,
    decision_reason: reason,
  };
  pushEvent({
    ts: nowSeconds(),
    type: "DECISION",
    message: reason,
  });
}

function applyDeliveryTick(): void {
  const now = Date.now();
  const dtSeconds = (now - lastTickMs) / 1000;
  lastTickMs = now;
  if (currentState.delivery_remaining_kwh <= 0) return;

  const delivered = chargeRateKw * (accel * dtSeconds / 3600);
  const nextDelivery = Math.max(0, currentState.delivery_remaining_kwh - delivered);
  currentState = {
    ...currentState,
    delivery_remaining_kwh: Number(nextDelivery.toFixed(6)),
  };
}

async function fetchProducerStatus(): Promise<ProducerStatus> {
  const response = await fetch(`${resourceServerUrl}/status`);
  if (!response.ok) {
    throw new Error(`status fetch failed (${response.status})`);
  }
  return (await response.json()) as ProducerStatus;
}

async function buyEnergy(kwh: number): Promise<BuyResponse> {
  if (!paymentFetch || !paymentInspector) {
    throw new Error("AVM_MNEMONIC is not configured; agent can only observe state");
  }

  const response = await paymentFetch(`${buyUrl}?kwh=${kwh}`, { method: "GET" });
  const body = (await response.json()) as BuyResponse;
  if (!response.ok) {
    throw new Error(`buy failed (${response.status}): ${JSON.stringify(body)}`);
  }

  const settle = paymentInspector.getPaymentSettleResponse(name => response.headers.get(name));
  const settleRecord = settle as Record<string, unknown> | null;
  // Prefer the REAL on-chain settlement tx (the server no longer fabricates one).
  const txId =
    (settleRecord?.["transaction"] as string | undefined) ??
    (settleRecord?.["txId"] as string | undefined) ??
    (settleRecord?.["txID"] as string | undefined) ??
    body.tx_id;

  return {
    ...body,
    ...(txId
      ? { tx_id: txId, lora_url: `https://lora.algokit.io/${loraNetworkPath}/tx/${txId}` }
      : {}),
  };
}

async function reportPaymentToServer(result: BuyResponse): Promise<void> {
  try {
    await fetch(`${resourceServerUrl}/report-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kwh: result.granted_kwh,
        price_paid_usdc: result.price_paid_usdc,
        asset_symbol: result.asset_symbol ?? paymentSymbol,
        tx_id: result.tx_id,
        lora_url: result.lora_url,
      }),
    });
  } catch {
    // Non-fatal: the agent's own /events still carries the real tx.
  }
}

async function initPaymentClient(): Promise<void> {
  if (!avmMnemonic || avmMnemonic.includes("PASTE")) {
    currentState = {
      ...currentState,
      decision_reason: "No mnemonic configured: running in observer mode",
    };
    return;
  }

  const seed = seedFromMnemonic(avmMnemonic);
  const seedCopy = new Uint8Array(seed);
  const wrappedSeed: WrappedEd25519Seed = {
    unwrapEd25519Seed: async () => seed,
    wrapEd25519Seed: async () => {},
  };
  const wrappedSecret = await ed25519SigningKeyFromWrappedSecret(wrappedSeed);
  const secretKey = Buffer.concat([
    Buffer.from(seedCopy),
    Buffer.from(wrappedSecret.ed25519Pubkey),
  ]).toString("base64");

  const signer = toClientAvmSigner(secretKey);
  const schemeConfig = algodUrl ? { algodUrl, algodToken } : undefined;
  const client = new x402Client().register("algorand:*", new ExactAvmScheme(signer, schemeConfig));
  paymentFetch = wrapFetchWithPayment(fetch, client);
  paymentInspector = new x402HTTPClient(client);
  console.log(`🔌 Agent signer address: ${signer.address}`);
  console.log(`   algod : ${algodUrl ?? "(default public AlgoNode — may rate-limit; set ALGOD_URL)"}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Buy with exponential backoff. Transient node/rate-limit errors (algod 403/429/5xx,
// suggested-params failures) are common on the free public node; retrying a few times
// with backoff lets most purchases through instead of dropping them.
async function buyWithRetry(kwh: number): Promise<BuyResponse> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= buyRetries; attempt++) {
    try {
      return await buyEnergy(kwh);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      const transient = /\b(403|409|429|5\d\d)\b|params failed|ECONN|ETIMEDOUT|fetch failed|rate/i.test(msg);
      if (!transient || attempt === buyRetries) break;
      const backoffMs = Math.min(4000, 400 * 2 ** (attempt - 1));
      pushEvent({
        ts: nowSeconds(),
        type: "DECISION",
        message: `Node throttled (attempt ${attempt}/${buyRetries}) — retrying in ${backoffMs}ms`,
      });
      await sleep(backoffMs);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("buy failed");
}

// Execute a single x402 purchase and apply the result to agent state.
// Used by both the autonomous loop and the manual /buy-now control.
async function executePurchase(kwh: number): Promise<void> {
  setState("PAYING", "Submitting x402 payment");

  const result = await buyWithRetry(kwh);
  currentState = {
    ...currentState,
    delivery_remaining_kwh: Number((currentState.delivery_remaining_kwh + result.granted_kwh).toFixed(6)),
    budget_remaining_usdc: Number(
      Math.max(0, currentState.budget_remaining_usdc - result.price_paid_usdc).toFixed(6),
    ),
    ...(result.tx_id ? { last_tx_id: result.tx_id } : {}),
  };

  pushEvent({
    ts: nowSeconds(),
    type: "PAYMENT",
    message: `Paid ${result.price_paid_usdc.toFixed(3)} USDC for ${result.granted_kwh.toFixed(2)} kWh`,
    kwh: result.granted_kwh,
    price_usdc: result.price_paid_usdc,
    ...(result.tx_id ? { tx_id: result.tx_id } : {}),
    ...(result.lora_url ? { lora_url: result.lora_url } : {}),
  });

  if (result.tx_id) {
    void reportPaymentToServer(result);
  }

  setState("CHARGING", `Delivery started (${currentState.delivery_remaining_kwh.toFixed(2)} kWh pending)`);
}

async function agentLoop(): Promise<void> {
  if (loopBusy) return;
  loopBusy = true;

  try {
    applyDeliveryTick();
    const producer = await fetchProducerStatus();

    currentState = {
      ...currentState,
      solar_kw: producer.solar_kw,
      battery_pct: producer.battery_pct,
      price_per_kwh: producer.price_per_kwh,
      max_price_per_kwh: maxPricePerKwh,
    };

    if (paused) {
      setState("WAITING", "Paused by operator");
      return;
    }

    if (!producer.ev_plugged) {
      setState("IDLE", "EV is unplugged");
      return;
    }

    if (currentState.delivery_remaining_kwh > 0) {
      setState("CHARGING", `Delivering ${currentState.delivery_remaining_kwh.toFixed(2)} kWh`);
      return;
    }

    // Fixed (one-time) mode never auto-buys. The user selects an amount and pays once
    // via /buy-now (server /control/buy); the agent then charges and returns here IDLE,
    // waiting for the next explicit request. Only "metered" mode runs the re-buy loop.
    if (purchaseMode === "fixed") {
      setState("IDLE", "Fixed mode: waiting for a purchase request");
      return;
    }

    if (!producer.has_offer) {
      setState("WAITING", "No producer offer available");
      return;
    }

    if (producer.price_per_kwh > maxPricePerKwh) {
      setState(
        "WAITING",
        `Price ${producer.price_per_kwh.toFixed(3)} exceeds max ${maxPricePerKwh.toFixed(3)}`,
      );
      return;
    }

    const estimatedCost = Number((kwhPerPurchase * producer.price_per_kwh).toFixed(6));
    if (currentState.budget_remaining_usdc < estimatedCost) {
      setState("WAITING", "Budget exhausted for next purchase");
      return;
    }

    setState("EVALUATING", "Policy passed; preparing payment");
    setDecision(
      `Buying ${kwhPerPurchase.toFixed(2)} kWh because price ${producer.price_per_kwh.toFixed(3)} <= max ${maxPricePerKwh.toFixed(3)}`,
    );

    const result = await buyEnergy(kwhPerPurchase);
    currentState = {
      ...currentState,
      delivery_remaining_kwh: Number((currentState.delivery_remaining_kwh + result.granted_kwh).toFixed(6)),
      budget_remaining_usdc: Number(
        Math.max(0, currentState.budget_remaining_usdc - result.price_paid_usdc).toFixed(6),
      ),
      ...(result.tx_id ? { last_tx_id: result.tx_id } : {}),
    };

    pushEvent({
      ts: nowSeconds(),
      type: "PAYMENT",
      message: `Paid ${result.price_paid_usdc.toFixed(3)} ${result.asset_symbol ?? paymentSymbol} for ${result.granted_kwh.toFixed(2)} kWh`,
      kwh: result.granted_kwh,
      price_usdc: result.price_paid_usdc,
      asset_symbol: result.asset_symbol ?? paymentSymbol,
      ...(result.tx_id ? { tx_id: result.tx_id } : {}),
      ...(result.lora_url ? { lora_url: result.lora_url } : {}),
    });

    if (result.tx_id) {
      void reportPaymentToServer(result);
    }

    setState("CHARGING", `Delivery started (${currentState.delivery_remaining_kwh.toFixed(2)} kWh pending)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown agent error";
    pushEvent({
      ts: nowSeconds(),
      type: "ERROR",
      message,
    });
    setState("WAITING", message);
  } finally {
    loopBusy = false;
  }
}

const app = new Hono();

// The server (and any direct dashboard call) may be a different origin.
app.use("*", cors());

app.get("/health", c =>
  c.json({
    ok: true,
    state: currentState.state,
    ts: nowSeconds(),
  }),
);

app.get("/state", c => c.json(currentState));

app.get("/events", c => {
  const limit = Math.max(1, Math.min(100, Number(c.req.query("limit") ?? "100") || 100));
  return c.json(events.slice(0, limit));
});

// --- Control plane (called by the server's /control/* endpoints) ---
app.post("/buy-now", async c => {
  const body = (await c.req.json().catch(() => ({}))) as { kwh?: number };
  // In fixed mode a bare /buy-now grabs the configured one-time amount; in metered
  // mode it falls back to the small per-chunk size used by the loop.
  const defaultKwh = purchaseMode === "fixed" ? fixedKwh : kwhPerPurchase;
  const kwh = typeof body.kwh === "number" && body.kwh > 0 ? body.kwh : defaultKwh;
  if (loopBusy) return c.json({ ok: false, error: "agent busy" }, 409);
  loopBusy = true;
  try {
    await executePurchase(kwh);
    return c.json({ ok: true, last_tx_id: currentState.last_tx_id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "buy failed";
    pushEvent({ ts: nowSeconds(), type: "ERROR", message });
    return c.json({ ok: false, error: message }, 500);
  } finally {
    loopBusy = false;
  }
});

// Switch purchase mode live (fixed one-time <-> metered loop).
app.post("/mode", async c => {
  const body = (await c.req.json().catch(() => ({}))) as { mode?: string };
  if (body.mode === "fixed" || body.mode === "metered") {
    if (purchaseMode !== body.mode) {
      purchaseMode = body.mode;
      currentState = { ...currentState, mode: purchaseMode };
      pushEvent({
        ts: nowSeconds(),
        type: "DECISION",
        message: `Purchase mode -> ${purchaseMode}${purchaseMode === "fixed" ? ` (one-time ${fixedKwh.toFixed(2)} kWh)` : " (pay-as-you-use loop)"}`,
      });
    }
  }
  return c.json({ ok: true, mode: purchaseMode, fixed_kwh: fixedKwh });
});

app.post("/config", async c => {
  const body = (await c.req.json().catch(() => ({}))) as {
    budget_usd?: number;
    max_price_per_kwh?: number;
  };
  if (typeof body.budget_usd === "number") {
    currentState = { ...currentState, budget_remaining_usdc: Number(body.budget_usd.toFixed(6)) };
  }
  if (typeof body.max_price_per_kwh === "number") {
    maxPricePerKwh = body.max_price_per_kwh;
    currentState = { ...currentState, max_price_per_kwh: maxPricePerKwh };
  }
  return c.json({
    ok: true,
    budget_remaining_usdc: currentState.budget_remaining_usdc,
    max_price_per_kwh: maxPricePerKwh,
  });
});

app.post("/pause", async c => {
  const body = (await c.req.json().catch(() => ({}))) as { paused?: boolean };
  paused = Boolean(body.paused);
  return c.json({ ok: true, paused });
});

app.post("/reset", async c => {
  paused = false;
  events.length = 0;
  currentState = {
    state: "IDLE",
    mode: purchaseMode,
    solar_kw: 0,
    battery_pct: 0,
    price_per_kwh: 0,
    delivery_remaining_kwh: 0,
    budget_remaining_usdc: Number(budgetUsd.toFixed(6)),
    max_price_per_kwh: maxPricePerKwh,
    decision_reason: "Reset by operator",
  };
  return c.json({ ok: true });
});

await initPaymentClient();
void agentLoop();
setInterval(() => {
  void agentLoop();
}, pollIntervalMs);

serve({ fetch: app.fetch, port });

console.log(`🤖 Consumer agent service listening at http://localhost:${port}`);
console.log(`   server : ${resourceServerUrl}`);
console.log(`   buy    : ${endpointPath}`);
console.log(`   asset  : ${paymentSymbol}`);
console.log(`   network: ${paymentNetwork}`);
console.log(`   budget : ${budgetAmount.toFixed(2)} ${paymentSymbol}`);
console.log(`   max px : ${maxPricePerKwh.toFixed(3)} ${paymentSymbol}/kWh`);
