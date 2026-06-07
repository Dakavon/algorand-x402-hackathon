export function formatUSDC(n: number): string {
  if (!Number.isFinite(n)) return "$0";
  const s = n.toFixed(6);
  const trimmed = s.replace(/\.?0+$/, "");
  return `$${trimmed === "" ? "0" : trimmed}`;
}

// Payment asset is EURD (a euro stablecoin), so amounts read in euros.
export function formatEUR(n: number): string {
  if (!Number.isFinite(n)) return "€0";
  const s = n.toFixed(6);
  const trimmed = s.replace(/\.?0+$/, "");
  return `€${trimmed === "" ? "0" : trimmed}`;
}

export function formatKWh(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

export function formatPct(n: number): string {
  if (!Number.isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

export function formatKg(n: number): string {
  if (!Number.isFinite(n)) return "0 kg";
  return n < 1 ? `${(n * 1000).toFixed(0)} g` : `${n.toFixed(2)} kg`;
}

export function shortTx(id?: string): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return `${id.slice(0, 6)}…${id.slice(-4)}`;
}

export function relativeTime(ts: number): string {
  const now = Date.now() / 1000;
  const d = Math.max(0, now - ts);
  if (d < 5) return "just now";
  if (d < 60) return `${Math.floor(d)}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
}
