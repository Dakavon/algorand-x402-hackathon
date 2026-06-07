import type { LifecycleState } from "@/lib/ev/types";

const META: Record<LifecycleState, { label: string; cls: string; dot: string }> = {
  IDLE:       { label: "Idle",       cls: "bg-neutral-100 text-neutral-700", dot: "bg-neutral-400" },
  EVALUATING: { label: "Evaluating", cls: "bg-amber-50 text-amber-800",      dot: "bg-solar" },
  PAYING:     { label: "Paying",     cls: "bg-amber-50 text-amber-800",      dot: "bg-solar" },
  CHARGING:   { label: "Charging",   cls: "bg-emerald-50 text-emerald-800",  dot: "bg-energy ev-pulse" },
  WAITING:    { label: "Waiting",    cls: "bg-sky-50 text-sky-800",          dot: "bg-sky-500" },
  ERROR:      { label: "Error",      cls: "bg-red-50 text-destructive",      dot: "bg-destructive" },
};

export function StateChip({ state }: { state: LifecycleState }) {
  const m = META[state];
  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${m.cls}`}>
      <span className={`h-2 w-2 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}
