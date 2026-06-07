import { Zap, Receipt, Wallet } from "lucide-react";
import { motion } from "motion/react";

export type Tab = "charge" | "activity" | "wallet";

const TABS = [
  { id: "charge", label: "Charge", icon: Zap },
  { id: "activity", label: "Activity", icon: Receipt },
  { id: "wallet", label: "Wallet", icon: Wallet },
] as const;

interface Props {
  active: Tab;
  onChange: (t: Tab) => void;
  activityBadge?: boolean;
}

export function TabBar({ active, onChange, activityBadge }: Props) {
  return (
    <nav className="grid grid-cols-3 gap-1 rounded-2xl border bg-card p-1 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      {TABS.map((t) => {
        const on = active === t.id;
        return (
          <motion.button
            key={t.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => onChange(t.id)}
            className={`relative flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-colors ${
              on ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
            {t.id === "activity" && activityBadge && !on && (
              <span className="absolute right-2.5 top-1.5 h-2 w-2 rounded-full bg-energy ring-2 ring-card" />
            )}
          </motion.button>
        );
      })}
    </nav>
  );
}
