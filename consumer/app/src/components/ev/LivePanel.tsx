import { motion, AnimatePresence } from "motion/react";
import type { AgentState } from "@/lib/ev/types";
import { formatKWh, formatUSDC } from "@/lib/ev/format";

interface Props {
  state: AgentState;
  paymentCount: number;
}

export function LivePanel({ state, paymentCount }: Props) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-hint">This session</p>
        <p className="text-xs text-muted-foreground">
          {state.state === "PAYING" ? "Paying on Algorand…" : `${formatUSDC(state.price_per_kwh)} / kWh`}
        </p>
      </div>

      <div className="mt-3 flex items-end gap-3">
        <AnimatePresence mode="popLayout">
          <motion.div
            key={formatKWh(state.session_kwh)}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="tabular text-5xl font-bold leading-none tracking-tight"
          >
            {formatKWh(state.session_kwh)}
          </motion.div>
        </AnimatePresence>
        <span className="pb-1 text-sm font-medium text-muted-foreground">kWh delivered</span>
      </div>

      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
        <motion.div
          className="h-full bg-energy"
          initial={{ width: "10%" }}
          animate={{ width: state.state === "CHARGING" ? "100%" : "55%" }}
          transition={{ duration: 1.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
        />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Metric label="Spent" value={formatUSDC(state.session_spent)} accent />
        <Metric label="Payments" value={String(paymentCount)} />
        <Metric label="Remaining chunk" value={`${formatKWh(state.delivery_remaining_kwh)} kWh`} />
      </div>

      <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-xs text-muted-foreground">
        {state.decision_reason || "—"}
      </p>
    </div>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-hint">{label}</p>
      <p className={`tabular mt-1 text-base font-semibold ${accent ? "text-energy" : ""}`}>{value}</p>
    </div>
  );
}
