import { StateChip } from "./StateChip";
import type { LifecycleState } from "@/lib/ev/types";

interface Props {
  online: boolean;
  isDemo: boolean;
  state: LifecycleState | null;
}

export function Header({ online, isDemo, state }: Props) {
  return (
    <header className="flex items-center justify-between gap-3 pt-6 pb-3">
      <div className="flex items-center gap-3">
        {/* Brand mark */}
        <div className="relative">
          <div className="absolute -inset-1 rounded-xl bg-solar/30 blur-md" aria-hidden />
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl bg-foreground shadow-sm">
            <svg
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-5 w-5 text-solar drop-shadow-[0_0_6px_oklch(0.82_0.16_84/0.7)]"
              aria-hidden
            >
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
            <div
              className="ev-sweep pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              aria-hidden
            />
          </div>
        </div>

        {/* Wordmark + meta */}
        <div className="flex flex-col">
          <h1 className="text-base font-bold leading-none tracking-tight">EV Charge</h1>
          <div
            className="mt-1 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-hint"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
          >
            <span className="rounded border border-border/70 bg-surface px-1.5 py-[1px] font-medium text-foreground/70">
              Algorand TestNet
            </span>
            <span className="text-solar">•</span>
            <span className="rounded border border-solar/30 bg-solar/10 px-1.5 py-[1px] font-medium text-amber-700">
              x402
            </span>
          </div>
        </div>
      </div>

      {/* Right side: state + live/demo pill */}
      <div className="flex items-center gap-2">
        {state && <StateChip state={state} />}
        {isDemo ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-solar/30 bg-solar/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-900">
            <span className="h-1.5 w-1.5 rounded-full bg-solar" />
            Demo
          </span>
        ) : online ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-energy/25 bg-energy/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-energy opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-energy" />
            </span>
            Live
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-neutral-400" />
            Offline
          </span>
        )}
      </div>
    </header>
  );
}
