import { formatKWh, formatUSDC } from "@/lib/ev/format";

interface Props {
  kwh: number;
  spent: number;
  payments: number;
}

export function SessionSummary({ kwh, spent, payments }: Props) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-energy/15 text-xl">✅</div>
        <div>
          <p className="text-base font-semibold">Charge complete</p>
          <p className="text-sm text-muted-foreground">Your session ended. Here's the receipt.</p>
        </div>
      </div>
      <div className="mt-4 divide-y rounded-xl border bg-surface">
        <Row label="Total energy" value={`${formatKWh(kwh)} kWh`} />
        <Row label="Total paid" value={formatUSDC(spent)} accent />
        <Row label="Payments" value={String(payments)} />
      </div>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular font-semibold ${accent ? "text-energy" : ""}`}>{value}</span>
    </div>
  );
}
