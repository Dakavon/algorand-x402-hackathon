import { Sun, BatteryCharging, Zap, Tag } from "lucide-react";
import type { AgentState } from "@/lib/ev/types";
import { formatEUR, formatKWh } from "@/lib/ev/format";

interface Props {
  state: AgentState;
}

export function TelemetryTiles({ state }: Props) {
  const tiles = [
    { icon: Sun, label: "Solar", value: `${state.solar_kw.toFixed(1)} kW` },
    { icon: BatteryCharging, label: "Battery", value: `${Math.round(state.battery_pct * 100)}%` },
    { icon: Zap, label: "Available", value: `${formatKWh(state.available_kwh)} kWh` },
    { icon: Tag, label: "Price", value: `${formatEUR(state.price_per_kwh)}/kWh` },
  ];

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-hint">Live telemetry</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="flex items-center gap-3 rounded-xl bg-surface px-3 py-3">
            <t.icon className="h-5 w-5 shrink-0 text-energy" />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-hint">{t.label}</p>
              <p className="tabular text-base font-semibold">{t.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
