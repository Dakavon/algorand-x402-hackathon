import type { AgentEvent, AgentState, StartChargePayload, WalletInfo } from "./types";

export const AGENT_URL =
  (import.meta.env.VITE_AGENT_URL as string | undefined) ?? "http://localhost:4022";

const ctrl = () => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), 4000);
  return { signal: c.signal, done: () => clearTimeout(t) };
};

export async function fetchState(): Promise<AgentState> {
  const c = ctrl();
  try {
    const r = await fetch(`${AGENT_URL}/state`, { signal: c.signal });
    if (!r.ok) throw new Error(`state ${r.status}`);
    return (await r.json()) as AgentState;
  } finally {
    c.done();
  }
}

export async function fetchEvents(limit = 50): Promise<AgentEvent[]> {
  const c = ctrl();
  try {
    const r = await fetch(`${AGENT_URL}/events?limit=${limit}`, { signal: c.signal });
    if (!r.ok) throw new Error(`events ${r.status}`);
    return (await r.json()) as AgentEvent[];
  } finally {
    c.done();
  }
}

export async function startCharge(payload: StartChargePayload): Promise<void> {
  await fetch(`${AGENT_URL}/charge/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function stopCharge(): Promise<void> {
  await fetch(`${AGENT_URL}/charge/stop`, { method: "POST" });
}

export async function fetchWallet(): Promise<WalletInfo> {
  const c = ctrl();
  try {
    const r = await fetch(`${AGENT_URL}/wallet`, { signal: c.signal });
    if (!r.ok) throw new Error(`wallet ${r.status}`);
    return (await r.json()) as WalletInfo;
  } finally {
    c.done();
  }
}
