import { Leaf, TrendingDown } from "lucide-react";
import type { AgentState } from "@/lib/ev/types";
import { formatEUR, formatKg, formatPct } from "@/lib/ev/format";

// German residential reference: grid tariff ~€0.35/kWh, grid CO2 intensity ~0.38 kg/kWh.
const GRID_PRICE_EUR = 0.35;
const GRID_CO2_KG_PER_KWH = 0.38;

interface Props {
  state: AgentState;
}

export function SavingsCard({ state }: Props) {
  const hasSession = state.session_kwh > 0;
  const gridCost = state.session_kwh * GRID_PRICE_EUR;
  const saved = Math.max(0, gridCost - state.session_spent);
  const pct =
    hasSession && gridCost > 0
      ? (saved / gridCost) * 100
      : Math.max(0, (1 - state.price_per_kwh / GRID_PRICE_EUR) * 100);
  const co2 = state.session_kwh * GRID_CO2_KG_PER_KWH;

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-hint">Savings vs grid</p>
        <span className="flex items-center gap-1 text-xs text-energy">
          <TrendingDown className="h-3.5 w-3.5" /> {formatPct(pct)} cheaper
        </span>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <div className="tabular text-4xl font-bold leading-none tracking-tight text-energy">
          {formatPct(pct)}
        </div>
        <span className="pb-1 text-sm font-medium text-muted-foreground">below grid price</span>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Stat label="Saved this session" value={hasSession ? formatEUR(saved) : "—"} />
        <Stat label="CO₂ avoided" value={hasSession ? formatKg(co2) : "—"} icon />
      </div>

      <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-xs text-muted-foreground">
        Solar {formatEUR(state.price_per_kwh)}/kWh vs grid {formatEUR(GRID_PRICE_EUR)}/kWh — neighbour
        energy shared under §42c EnWG.
      </p>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-hint">{label}</p>
      <p className="tabular mt-1 flex items-center gap-1 text-base font-semibold">
        {icon && <Leaf className="h-4 w-4 text-energy" />}
        {value}
      </p>
    </div>
  );
}
