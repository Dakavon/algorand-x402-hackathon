import { AnimatePresence, motion } from "motion/react";
import type { AgentState, LifecycleState } from "@/lib/ev/types";

interface Props {
  state: AgentState | null;
}

type Tone = "muted" | "solar" | "energy" | "sky" | "destructive";

function headline(s: AgentState | null): string {
  if (!s) return "Loading…";
  if (!s.charger_connected) return "Plug in to begin";
  switch (s.state) {
    case "IDLE":       return "Ready to charge";
    case "EVALUATING": return "Evaluating offer…";
    case "PAYING":     return "Buying energy…";
    case "CHARGING":   return `Charging — ${s.session_kwh.toFixed(2)} kWh delivered`;
    case "WAITING":    return "Waiting for next chunk";
    case "ERROR":      return "Something went wrong";
  }
}

function sub(s: AgentState | null): string {
  if (!s) return "Talking to the charging agent.";
  if (!s.charger_connected) return "Connect the cable to a neighbour's solar charger.";
  if (s.state === "IDLE") return "Set your limits and start an autonomous session.";
  return s.decision_reason || "Working…";
}

function chipLabel(s: AgentState | null): string {
  if (!s) return "Sync";
  if (!s.charger_connected) return "Unplugged";
  return s.state.charAt(0) + s.state.slice(1).toLowerCase();
}

const toneFor = (s: AgentState | null): Tone => {
  if (!s || !s.charger_connected) return "muted";
  switch (s.state) {
    case "IDLE": return "solar";
    case "EVALUATING":
    case "PAYING": return "solar";
    case "CHARGING": return "energy";
    case "WAITING": return "sky";
    case "ERROR": return "destructive";
  }
};

const toneStyles: Record<Tone, { glow: string; ring: string; icon: string; chipBg: string; chipText: string }> = {
  muted:       { glow: "bg-neutral-300/30",     ring: "border-neutral-300",          icon: "text-neutral-500",     chipBg: "bg-neutral-100",        chipText: "text-neutral-600" },
  solar:       { glow: "bg-solar/20",           ring: "border-solar/40",             icon: "text-solar",           chipBg: "bg-solar/10",           chipText: "text-amber-700" },
  energy:      { glow: "bg-energy/20",          ring: "border-energy/40",            icon: "text-energy",          chipBg: "bg-energy/10",          chipText: "text-emerald-700" },
  sky:         { glow: "bg-sky-300/30",         ring: "border-sky-300",              icon: "text-sky-500",         chipBg: "bg-sky-100",            chipText: "text-sky-700" },
  destructive: { glow: "bg-destructive/20",     ring: "border-destructive/40",       icon: "text-destructive",     chipBg: "bg-destructive/10",     chipText: "text-destructive" },
};

export function StatusHero({ state }: Props) {
  const tone = toneFor(state);
  const t = toneStyles[tone];
  const charging = state?.state === "CHARGING";
  const h = headline(state);

  return (
    <div className="flex items-center gap-3 px-0.5 py-1">
      <div className="relative shrink-0">
        <motion.div
          className={`absolute inset-0 scale-110 rounded-full ${t.glow}`}
          animate={charging ? { opacity: [0.6, 1, 0.6], scale: [1.08, 1.22, 1.08] } : { opacity: [0.5, 0.9, 0.5] }}
          transition={{ duration: charging ? 1.4 : 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className={`relative flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-sm ${t.ring}`}>
          <svg viewBox="0 0 24 24" className={`h-4 w-4 fill-current ${t.icon}`} xmlns="http://www.w3.org/2000/svg" aria-hidden>
            <path d="M13 10V3L4 14H11V21L20 10H13Z" />
          </svg>
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={chipLabel(state)}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="mb-0 inline-flex"
          >
            <span
              className={`rounded-sm px-1.5 py-0.5 text-[9px] font-medium uppercase leading-none tracking-[0.12em] ${t.chipBg} ${t.chipText}`}
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, SFMono-Regular, monospace' }}
            >
              {chipLabel(state)}
            </span>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence mode="wait">
          <motion.h2
            key={h}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="text-base font-semibold leading-tight tracking-tight text-foreground"
          >
            {h}
          </motion.h2>
        </AnimatePresence>

        <p className="mt-0 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{sub(state)}</p>
      </div>
    </div>
  );
}
