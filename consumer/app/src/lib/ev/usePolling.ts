import { useEffect, useRef, useState } from "react";
import { fetchEvents, fetchState, startCharge, stopCharge } from "./api";
import {
  getMockEvents,
  getMockState,
  mockStart,
  mockStop,
} from "./mock";
import type { AgentEvent, AgentState, StartChargePayload } from "./types";

export interface PollingResult {
  state: AgentState | null;
  events: AgentEvent[];
  isDemo: boolean;
  isOnline: boolean;
  loading: boolean;
  start: (p: StartChargePayload) => Promise<void>;
  stop: () => Promise<void>;
}

export function usePolling(): PollingResult {
  const [state, setState] = useState<AgentState | null>(null);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [isDemo, setDemo] = useState(false);
  const [isOnline, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const demoRef = useRef(false);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [s, e] = await Promise.all([fetchState(), fetchEvents(50)]);
        if (!alive) return;
        setState(s);
        setEvents(e);
        setDemo(false);
        demoRef.current = false;
        setOnline(true);
      } catch {
        if (!alive) return;
        demoRef.current = true;
        setDemo(true);
        setOnline(false);
        setState(getMockState());
        setEvents(getMockEvents());
      } finally {
        if (alive) setLoading(false);
      }
    };
    tick();
    const id = setInterval(tick, 2000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const start = async (p: StartChargePayload) => {
    if (demoRef.current) {
      mockStart(p);
      setState(getMockState());
      return;
    }
    try {
      await startCharge(p);
    } catch {
      mockStart(p);
      demoRef.current = true;
      setDemo(true);
    }
  };

  const stop = async () => {
    if (demoRef.current) {
      mockStop();
      setState(getMockState());
      return;
    }
    try {
      await stopCharge();
    } catch {
      mockStop();
    }
  };

  return { state, events, isDemo, isOnline, loading, start, stop };
}
