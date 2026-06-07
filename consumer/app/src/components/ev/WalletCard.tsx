import { Wallet } from "lucide-react";
import type { WalletInfo } from "@/lib/ev/types";
import { formatEUR, formatKWh, shortTx } from "@/lib/ev/format";

interface Props {
  wallet: WalletInfo | null;
  pricePerKwh: number;
}

export function WalletCard({ wallet, pricePerKwh }: Props) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-hint">
          <Wallet className="h-3.5 w-3.5" /> Agent wallet
        </p>
        {wallet?.network && (
          <span className="text-xs capitalize text-muted-foreground">{wallet.network}</span>
        )}
      </div>

      {!wallet ? (
        <div className="ev-skeleton mt-3 h-10 w-32 rounded-lg" />
      ) : !wallet.configured ? (
        <p className="mt-3 text-xs text-muted-foreground">No wallet configured (observer mode).</p>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-3">
            <div className="tabular text-4xl font-bold leading-none tracking-tight">
              {formatEUR(wallet.balance ?? 0)}
            </div>
            <span className="pb-1 text-sm font-medium text-muted-foreground">
              {wallet.asset_symbol ?? "EURD"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <Stat
              label="≈ Energy"
              value={pricePerKwh > 0 ? `${formatKWh((wallet.balance ?? 0) / pricePerKwh)} kWh` : "—"}
            />
            <Stat label="ALGO (fees)" value={(wallet.algo ?? 0).toFixed(3)} />
          </div>

          {wallet.address && (
            <p className="mt-4 rounded-xl bg-surface px-3 py-2 text-xs text-muted-foreground">
              {shortTx(wallet.address)}
            </p>
          )}
          {wallet.error && (
            <p className="mt-2 text-xs text-red-500">Balance unavailable: {wallet.error}</p>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-hint">{label}</p>
      <p className="tabular mt-1 text-base font-semibold">{value}</p>
    </div>
  );
}
