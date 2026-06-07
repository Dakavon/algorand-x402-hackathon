import { Wallet } from "lucide-react";
import type { WalletInfo } from "@/lib/ev/types";
import { formatEUR, formatKWh } from "@/lib/ev/format";

interface Props {
  wallet: WalletInfo | null;
  pricePerKwh: number;
}

/** One-line balance summary for the Charge tab. Full breakdown lives on the Wallet tab. */
export function WalletStrip({ wallet, pricePerKwh }: Props) {
  const balance = wallet?.balance ?? 0;
  const kwh = pricePerKwh > 0 ? `${formatKWh(balance / pricePerKwh)} kWh` : "—";
  return (
    <div className="flex items-center justify-between rounded-2xl border bg-card px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-hint">
        <Wallet className="h-3.5 w-3.5" /> Agent wallet
      </span>
      {!wallet ? (
        <div className="ev-skeleton h-5 w-24 rounded-md" />
      ) : !wallet.configured ? (
        <span className="text-xs text-muted-foreground">observer mode</span>
      ) : (
        <span className="tabular text-sm font-semibold">
          {formatEUR(balance)} <span className="font-normal text-muted-foreground">· ≈ {kwh}</span>
        </span>
      )}
    </div>
  );
}
