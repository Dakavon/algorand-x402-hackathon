import { useState } from "react";
import type { StartChargePayload } from "@/lib/ev/types";

interface Props {
  defaults: StartChargePayload;
  onChange: (p: StartChargePayload) => void;
}

export function ConfigSheet({ defaults, onChange }: Props) {
  const [chunk, setChunk] = useState(defaults.chunk_kwh);
  const [maxPrice, setMaxPrice] = useState(defaults.max_price_per_kwh);
  const [budget, setBudget] = useState(defaults.budget_usd);

  const update = (next: Partial<StartChargePayload>) => {
    const merged = { chunk_kwh: chunk, max_price_per_kwh: maxPrice, budget_usd: budget, ...next };
    setChunk(merged.chunk_kwh);
    setMaxPrice(merged.max_price_per_kwh);
    setBudget(merged.budget_usd);
    onChange(merged);
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <p className="text-[11px] font-bold uppercase tracking-wider text-hint">Session settings</p>
      <h3 className="mt-1 text-lg font-semibold">How should the agent buy?</h3>
      <div className="mt-4 divide-y">
        <Field
          label="Chunk size"
          suffix="kWh"
          value={chunk}
          step={0.5}
          min={0.5}
          max={10}
          onChange={(v) => update({ chunk_kwh: v })}
          hint="Energy bought per on-chain payment"
        />
        <Field
          label="Max price"
          suffix="€ / kWh"
          value={maxPrice}
          step={0.005}
          min={0.001}
          max={1}
          onChange={(v) => update({ max_price_per_kwh: v })}
          hint="Agent will skip chunks above this"
        />
        <Field
          label="Session budget"
          suffix="EURD"
          value={budget}
          step={1}
          min={0.1}
          max={1000}
          onChange={(v) => update({ budget_usd: v })}
          hint="Total spending cap for this session"
        />
      </div>
    </div>
  );
}

function Field({
  label, suffix, value, step, min, max, onChange, hint,
}: {
  label: string; suffix: string; value: number; step: number; min: number; max: number;
  onChange: (v: number) => void; hint: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{hint}</p>
      </div>
      <div className="flex items-center gap-1 rounded-full border bg-surface px-1 py-1">
        <button
          type="button"
          className="h-7 w-7 rounded-full text-base font-semibold text-foreground active:scale-95"
          onClick={() => onChange(Math.max(min, +(value - step).toFixed(3)))}
        >−</button>
        <input
          inputMode="decimal"
          className="tabular w-16 bg-transparent text-center text-sm font-semibold outline-none"
          value={value}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (Number.isFinite(v)) onChange(Math.min(max, Math.max(min, v)));
          }}
        />
        <button
          type="button"
          className="h-7 w-7 rounded-full text-base font-semibold text-foreground active:scale-95"
          onClick={() => onChange(Math.min(max, +(value + step).toFixed(3)))}
        >+</button>
        <span className="pl-1 pr-2 text-[10px] font-medium uppercase tracking-wide text-hint">{suffix}</span>
      </div>
    </div>
  );
}
