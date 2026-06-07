import type { AgentEvent, AgentState, LifecycleState, WalletInfo } from "./types";

const ALPHA = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function randTx(): string {
  let s = "";
  for (let i = 0; i < 52; i++) s += ALPHA[Math.floor(Math.random() * ALPHA.length)];
  return s;
}
const loraUrl = (id: string) => `https://lora.algokit.io/mainnet/tx/${id}`;

const PRICE = 0.012;
const CHUNK = 1;
const TOTAL_KWH = 6;

interface MockStore {
  startedAt: number;
  events: AgentEvent[];
  sessionKwh: number;
  sessionSpent: number;
  lastTx: string;
  cycleStart: number;
  paidChunks: number;
  active: boolean;
  lastSummary: { kwh: number; spent: number; payments: number } | null;
}

const seedTs = Math.floor(Date.now() / 1000);
const seedEvents: AgentEvent[] = [
  {
    ts: seedTs - 3600,
    type: "PAYMENT" as const,
    message: "Paid 0.012 EURD for 1.00 kWh",
    kwh: 1,
    price: 0.012,
    tx_id: randTx(),
  },
  {
    ts: seedTs - 3500,
    type: "PAYMENT" as const,
    message: "Paid 0.012 EURD for 1.00 kWh",
    kwh: 1,
    price: 0.012,
    tx_id: randTx(),
  },
  {
    ts: seedTs - 3400,
    type: "PAYMENT" as const,
    message: "Paid 0.012 EURD for 1.00 kWh",
    kwh: 1,
    price: 0.012,
    tx_id: randTx(),
  },
].map((e) => ({ ...e, lora_url: loraUrl(e.tx_id!) }));

const store: MockStore = {
  startedAt: Date.now(),
  events: seedEvents,
  sessionKwh: 0,
  sessionSpent: 0,
  lastTx: "",
  cycleStart: Date.now(),
  paidChunks: 0,
  active: false,
  lastSummary: null,
};

export function mockStart(payload: { chunk_kwh: number; budget_usd: number; max_price_per_kwh: number }) {
  store.active = true;
  store.cycleStart = Date.now();
  store.sessionKwh = 0;
  store.sessionSpent = 0;
  store.paidChunks = 0;
  store.lastSummary = null;
  void payload;
}

export function mockStop() {
  if (store.active) {
    store.lastSummary = {
      kwh: store.sessionKwh,
      spent: store.sessionSpent,
      payments: store.paidChunks,
    };
  }
  store.active = false;
}

function lifecycleFromCycle(elapsedSec: number): LifecycleState {
  // 0-2s EVALUATING, 2-4s PAYING, 4s+ CHARGING until target
  if (elapsedSec < 2) return "EVALUATING";
  if (elapsedSec < 4) return "PAYING";
  return "CHARGING";
}

function tick() {
  if (!store.active) return;
  const elapsed = (Date.now() - store.cycleStart) / 1000;
  // Each chunk: 6s pay+charge cycle
  const targetChunks = Math.min(TOTAL_KWH, Math.floor(elapsed / 6));
  while (store.paidChunks < targetChunks) {
    store.paidChunks += 1;
    store.sessionKwh += CHUNK;
    store.sessionSpent += PRICE * CHUNK;
    const tx = randTx();
    store.lastTx = tx;
    store.events.unshift({
      ts: Math.floor(Date.now() / 1000),
      type: "DECISION",
      message: `Price ${PRICE.toFixed(3)} ≤ cap 0.050 → buying ${CHUNK.toFixed(2)} kWh`,
    });
    store.events.unshift({
      ts: Math.floor(Date.now() / 1000),
      type: "PAYMENT",
      message: `Paid ${(PRICE * CHUNK).toFixed(3)} EURD for ${CHUNK.toFixed(2)} kWh`,
      kwh: CHUNK,
      price: PRICE * CHUNK,
      tx_id: tx,
      lora_url: loraUrl(tx),
    });
    if (store.events.length > 100) store.events.length = 100;
  }
  if (store.sessionKwh >= TOTAL_KWH) {
    mockStop();
  }
}

export function getMockState(): AgentState {
  tick();
  const cycleElapsed = ((Date.now() - store.cycleStart) / 1000) % 6;
  const state: LifecycleState = store.active ? lifecycleFromCycle(cycleElapsed) : "IDLE";
  const remaining = store.active ? Math.max(0, TOTAL_KWH - store.sessionKwh) : 0;
  return {
    state,
    mode: "metered",
    charger_connected: true,
    solar_kw: 4.2,
    battery_pct: 0.78,
    price_per_kwh: PRICE,
    available_kwh: 8.4,
    delivery_remaining_kwh: store.active && state === "CHARGING" ? Math.min(CHUNK, remaining) : 0,
    budget_remaining: Math.max(0, 5 - store.sessionSpent),
    max_price_per_kwh: 0.05,
    chunk_kwh: CHUNK,
    session_kwh: store.sessionKwh,
    session_spent: store.sessionSpent,
    last_tx_id: store.lastTx,
    decision_reason: store.active
      ? state === "EVALUATING"
        ? "Evaluating next chunk…"
        : state === "PAYING"
          ? `Paying ${(PRICE * CHUNK).toFixed(3)} EURD for ${CHUNK.toFixed(2)} kWh`
          : `Delivering ${CHUNK.toFixed(2)} kWh`
      : store.lastSummary
        ? "Session complete"
        : "Ready to charge",
  };
}

export function getMockEvents(): AgentEvent[] {
  return store.events.slice(0, 50);
}

export function getMockLastSummary() {
  return store.lastSummary;
}

export function getMockWallet(): WalletInfo {
  return {
    configured: true,
    address: "HYHQP6GEYGBAGYJ4VOYBV7S6WGQC3TPBRVLIGWIU755N7RGQ6IOJCJ3QSA",
    algo: 4.873,
    balance: Math.max(0, 5 - store.sessionSpent),
    asset_symbol: "EURD",
    asset_id: 1221682136,
    decimals: 2,
    network: "mainnet",
  };
}
