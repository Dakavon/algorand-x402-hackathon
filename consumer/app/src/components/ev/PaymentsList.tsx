import { useMemo, useState } from "react";
import { ExternalLink, Zap } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { AgentEvent } from "@/lib/ev/types";
import { formatKWh, formatEUR, relativeTime, shortTx } from "@/lib/ev/format";

interface Props {
  events: AgentEvent[];
}

export function PaymentsList({ events }: Props) {
  const [showAll, setShowAll] = useState(false);

  const payments = useMemo(() => events.filter((e) => e.type === "PAYMENT"), [events]);
  const others = useMemo(() => events.filter((e) => e.type !== "PAYMENT"), [events]);

  const total = useMemo(
    () => payments.reduce((acc, e) => acc + (e.price ?? 0), 0),
    [payments],
  );
  const totalKwh = useMemo(
    () => payments.reduce((acc, e) => acc + (e.kwh ?? 0), 0),
    [payments],
  );

  return (
    <section className="rounded-2xl border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <header className="flex items-center justify-between px-5 pt-5">
        <div>
          <h2 className="text-base font-semibold">Payments</h2>
          <p className="text-xs text-muted-foreground">Every on-chain micropayment, newest first.</p>
        </div>
        {others.length > 0 && (
          <button
            onClick={() => setShowAll((v) => !v)}
            className="rounded-full border px-3 py-1 text-[11px] font-semibold text-muted-foreground active:scale-95"
          >
            {showAll ? "Hide activity" : "Activity"}
          </button>
        )}
      </header>

      <div className="mx-5 mt-4 flex items-center justify-between rounded-xl bg-surface px-4 py-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-hint">Total</p>
          <motion.p
            key={total.toFixed(6)}
            initial={{ scale: 1, color: "var(--color-energy)" }}
            animate={{ scale: [1.06, 1], color: ["var(--color-energy)", "var(--color-foreground)"] }}
            transition={{ duration: 0.6 }}
            className="tabular text-lg font-bold"
          >
            {formatEUR(total)}
          </motion.p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-hint">Energy</p>
          <p className="tabular text-lg font-bold">{formatKWh(totalKwh)} kWh</p>
        </div>
      </div>

      <ul className="mt-2 divide-y px-2 pb-2">
        <AnimatePresence initial={false}>
          {payments.length === 0 ? (
            <li key="empty" className="px-3 py-8 text-center text-sm text-muted-foreground">
              No payments yet — start charging to see live on-chain micropayments.
            </li>
          ) : (
            payments.map((e) => <PaymentRow key={e.tx_id ?? e.ts} e={e} />)
          )}
        </AnimatePresence>

        {showAll && others.length > 0 && (
          <li className="mt-2 border-t pt-3">
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-hint">Activity</p>
            <ul className="space-y-1">
              {others.slice(0, 20).map((e, i) => (
                <li
                  key={`${e.ts}-${i}`}
                  className="flex items-start gap-3 rounded-lg px-3 py-2 text-xs text-muted-foreground"
                >
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      e.type === "ERROR" ? "bg-destructive" : "bg-neutral-400"
                    }`}
                  />
                  <span className="flex-1">{e.message}</span>
                  <span className="tabular shrink-0">{relativeTime(e.ts)}</span>
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </section>
  );
}

function PaymentRow({ e }: { e: AgentEvent }) {
  const inner = (
    <div className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-surface">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-energy/15 text-energy">
        <Zap size={16} strokeWidth={2.5} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="tabular text-sm font-semibold">
          {formatKWh(e.kwh ?? 0)} kWh · {formatEUR(e.price ?? 0)}
        </p>
        <p className="text-xs text-muted-foreground">
          {relativeTime(e.ts)} · {shortTx(e.tx_id)}
        </p>
      </div>
      {e.lora_url && <ExternalLink size={16} className="text-hint" />}
    </div>
  );
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      {e.lora_url ? (
        <a href={e.lora_url} target="_blank" rel="noopener noreferrer">{inner}</a>
      ) : (
        inner
      )}
    </motion.li>
  );
}
