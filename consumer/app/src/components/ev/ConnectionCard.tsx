import { formatEUR, formatKWh } from "@/lib/ev/format";

interface Props {
  connected: boolean;
  availableKwh: number;
  pricePerKwh: number;
  compact?: boolean;
}

export function ConnectionCard({ connected, availableKwh, pricePerKwh, compact }: Props) {
  if (connected && compact) {
    return (
      <div
        className="relative flex items-center justify-between overflow-hidden rounded-2xl px-4 py-3 text-white shadow-[0_8px_24px_-16px_rgba(20,140,90,0.55)]"
        style={{ backgroundImage: "var(--gradient-connected)" }}
      >
        <span className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs ring-1 ring-inset ring-white/30">
            ✓
          </span>
          Charger connected
        </span>
        <span className="tabular text-sm font-medium text-white/90">
          {formatKWh(availableKwh)} kWh · {formatEUR(pricePerKwh)}/kWh
        </span>
      </div>
    );
  }
  if (!connected) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-gradient-to-b from-surface to-card p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-dashed border-neutral-300 bg-background text-2xl">
            🔌
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Connect your charger</p>
            <p className="text-sm text-muted-foreground">
              Waiting for the charger to be plugged in…
            </p>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-[0_12px_32px_-14px_rgba(20,140,90,0.55),inset_0_1px_0_rgba(255,255,255,0.18)]"
      style={{ backgroundImage: "var(--gradient-connected)" }}
    >
      {/* Watermark glyph */}
      <div className="pointer-events-none absolute -right-2 -top-2 text-[120px] leading-none opacity-[0.07] select-none">
        ⚡
      </div>
      {/* Sweep shimmer */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="ev-sweep absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white ring-1 ring-inset ring-white/30 backdrop-blur-sm">
          ✓
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-semibold tracking-tight">Charger connected</p>
          <p className="text-sm text-white/75">Ready to receive energy from this stall.</p>
        </div>
      </div>

      <div className="relative mt-4 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">
            Available
          </p>
          <p className="tabular text-base font-semibold">{formatKWh(availableKwh)} kWh</p>
        </div>
        <div className="border-l border-white/15 pl-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/60">Price</p>
          <p className="tabular text-base font-semibold">
            {formatEUR(pricePerKwh)}{" "}
            <span className="text-xs font-normal text-white/65">/ kWh</span>
          </p>
        </div>
      </div>
    </div>
  );
}
