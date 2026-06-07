import { Sun, BatteryCharging, Zap, Tag } from "lucide-react";
import type { AgentState } from "@/lib/ev/types";
import { formatEUR, formatKWh } from "@/lib/ev/format";

/** Slim live producer telemetry shown on the Charge tab while a session is active. */
export function TelemetryStrip({ state }: { state: AgentState }) {
  const items = [
    { icon: Sun, value: `${state.solar_kw.toFixed(1)} kW` },
    { icon: BatteryCharging, value: `${Math.round(state.battery_pct * 100)}%` },
    { icon: Zap, value: `${formatKWh(state.available_kwh)} kWh` },
    { icon: Tag, value: formatEUR(state.price_per_kwh) },
  ];
  return (
    <div className="grid grid-cols-4 gap-2 rounded-2xl border bg-card px-2 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      {items.map((it, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <it.icon className="h-4 w-4 text-energy" />
          <span className="tabular text-xs font-semibold">{it.value}</span>
        </div>
      ))}
    </div>
  );
}
