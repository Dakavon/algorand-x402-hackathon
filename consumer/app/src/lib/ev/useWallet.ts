import { useEffect, useState } from "react";
import { fetchWallet } from "./api";
import { getMockWallet } from "./mock";
import type { WalletInfo } from "./types";

// Polls the agent's /wallet endpoint on a slow cadence (balances change rarely and the
// lookup hits algod, which rate-limits). Falls back to mock data when offline.
export function useWallet(): WalletInfo | null {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const w = await fetchWallet();
        if (alive) setWallet(w);
      } catch {
        if (alive) setWallet(getMockWallet());
      }
    };
    void tick();
    const id = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  return wallet;
}
