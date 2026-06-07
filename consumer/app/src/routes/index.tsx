import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { Header } from "@/components/ev/Header";

import { ConnectionCard } from "@/components/ev/ConnectionCard";
import { ConfigSheet } from "@/components/ev/ConfigSheet";
import { LivePanel } from "@/components/ev/LivePanel";
import { SessionSummary } from "@/components/ev/SessionSummary";
import { PaymentsList } from "@/components/ev/PaymentsList";
import { BottomCTA } from "@/components/ev/BottomCTA";
import { TabBar, type Tab } from "@/components/ev/TabBar";
import { WalletCard } from "@/components/ev/WalletCard";
import { WalletStrip } from "@/components/ev/WalletStrip";
import { TelemetryStrip } from "@/components/ev/TelemetryStrip";
import { SavingsCard } from "@/components/ev/SavingsCard";
import { usePolling } from "@/lib/ev/usePolling";
import { useWallet } from "@/lib/ev/useWallet";
import { formatEUR } from "@/lib/ev/format";
import type { StartChargePayload } from "@/lib/ev/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EV Charge — Autonomous Solar Charging" },
      {
        name: "description",
        content:
          "Plug into a neighbour's solar charger and let an autonomous agent buy energy in real time on Algorand.",
      },
      { property: "og:title", content: "EV Charge" },
      {
        property: "og:description",
        content: "Autonomous peer-to-peer solar charging with x402 micropayments.",
      },
    ],
  }),
  component: Index,
});

const ACTIVE_STATES = new Set(["EVALUATING", "PAYING", "CHARGING"]);

function Index() {
  const { state, events, isDemo, isOnline, loading, start, stop } = usePolling();
  const wallet = useWallet();

  const [cfg, setCfg] = useState<StartChargePayload>({
    chunk_kwh: 1,
    budget_usd: 5,
    max_price_per_kwh: 0.05,
  });
  const [starting, setStarting] = useState(false);
  const [lastSummary, setLastSummary] = useState<{
    kwh: number;
    spent: number;
    payments: number;
  } | null>(null);
  const [tab, setTab] = useState<Tab>("charge");
  const [hasNewActivity, setHasNewActivity] = useState(false);
  const prevActiveRef = useRef(false);
  const seenTxRef = useRef<Set<string>>(new Set());
  const firstLoadRef = useRef(true);
  const tabRef = useRef<Tab>(tab);

  const paymentCount = useMemo(() => events.filter((e) => e.type === "PAYMENT").length, [events]);

  // Keep the active tab in a ref so the payment effect can read it without re-subscribing,
  // and clear the Activity badge whenever the user opens that tab.
  useEffect(() => {
    tabRef.current = tab;
    if (tab === "activity") setHasNewActivity(false);
  }, [tab]);

  // Toast on new payments; flag the Activity tab when the user isn't looking at it.
  useEffect(() => {
    if (firstLoadRef.current) {
      events.forEach((e) => e.tx_id && seenTxRef.current.add(e.tx_id));
      firstLoadRef.current = false;
      return;
    }
    for (const e of events) {
      if (e.type !== "PAYMENT" || !e.tx_id) continue;
      if (!seenTxRef.current.has(e.tx_id)) {
        seenTxRef.current.add(e.tx_id);
        toast(`⚡ Bought ${(e.kwh ?? 0).toFixed(2)} kWh — ${formatEUR(e.price ?? 0)}`);
        if (tabRef.current !== "activity") setHasNewActivity(true);
      }
    }
  }, [events]);

  // Track session summary when transitioning out of an active state
  useEffect(() => {
    const active = state ? ACTIVE_STATES.has(state.state) : false;
    if (prevActiveRef.current && !active && state && state.session_kwh > 0) {
      setLastSummary({
        kwh: state.session_kwh,
        spent: state.session_spent,
        payments: paymentCount,
      });
    }
    if (active) {
      setLastSummary(null);
      if (starting) setStarting(false);
    }
    prevActiveRef.current = active;
  }, [state, paymentCount, starting]);

  const isActive = state ? ACTIVE_STATES.has(state.state) : false;
  const charger = state?.charger_connected ?? false;

  const onStart = async () => {
    setTab("charge");
    setStarting(true);
    try {
      await start(cfg);
      toast("Starting…", { description: "Agent is evaluating the offer." });
    } catch {
      setStarting(false);
    }
  };
  const onStop = async () => {
    await stop();
    toast("Stopping…", { description: "Closing the session." });
  };
  const onChargeAgain = () => setLastSummary(null);

  // Primary action button (shared across tabs). Shown on the Charge tab always, and on
  // other tabs only while a session is active so "Stop charging" stays reachable.
  const cta = isActive ? (
    <BottomCTA label="Stop charging" variant="danger" onClick={onStop} />
  ) : lastSummary ? (
    <BottomCTA label="Charge again" onClick={onChargeAgain} />
  ) : (
    <BottomCTA
      label={starting ? "Starting…" : "Start charging"}
      onClick={onStart}
      disabled={!charger || starting}
      hint={!charger ? "Plug in your charger to begin" : undefined}
    />
  );
  const showCta = tab === "charge" || isActive;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-[480px] flex-col bg-surface px-4">
      <Toaster
        position="top-center"
        toastOptions={{ className: "!rounded-2xl !border !bg-card !text-foreground" }}
      />
      <Header online={isOnline} isDemo={isDemo} state={state?.state ?? null} />

      <main className="flex-1 space-y-4 pb-4">
        {loading && !state ? (
          <Skeleton />
        ) : (
          <>
            {tab === "charge" && state && (
              <>
                {isActive ? (
                  <>
                    <ConnectionCard
                      connected={charger}
                      availableKwh={state.available_kwh}
                      pricePerKwh={state.price_per_kwh}
                      compact
                    />
                    <LivePanel state={state} paymentCount={paymentCount} />
                    <TelemetryStrip state={state} />
                  </>
                ) : lastSummary ? (
                  <>
                    <SessionSummary
                      kwh={lastSummary.kwh}
                      spent={lastSummary.spent}
                      payments={lastSummary.payments}
                    />
                    <WalletStrip wallet={wallet} pricePerKwh={state.price_per_kwh} />
                  </>
                ) : (
                  <>
                    <ConnectionCard
                      connected={charger}
                      availableKwh={state.available_kwh}
                      pricePerKwh={state.price_per_kwh}
                    />
                    <ConfigSheet defaults={cfg} onChange={setCfg} />
                    <WalletStrip wallet={wallet} pricePerKwh={state.price_per_kwh} />
                  </>
                )}
              </>
            )}

            {tab === "activity" && <PaymentsList events={events} />}

            {tab === "wallet" && state && (
              <>
                <WalletCard wallet={wallet} pricePerKwh={state.price_per_kwh} />
                <SavingsCard state={state} />
              </>
            )}
          </>
        )}
      </main>

      {!loading && state && (
        <div
          className="sticky bottom-0 z-20 -mx-4 bg-gradient-to-t from-surface via-surface to-surface/0 px-4 pt-6"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          {showCta && <div className="mb-3">{cta}</div>}
          <TabBar active={tab} onChange={setTab} activityBadge={hasNewActivity} />
        </div>
      )}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-4 pt-2">
      <div className="ev-skeleton h-16 rounded-2xl" />
      <div className="ev-skeleton h-28 rounded-2xl" />
      <div className="ev-skeleton h-40 rounded-2xl" />
      <div className="ev-skeleton h-64 rounded-2xl" />
    </div>
  );
}
