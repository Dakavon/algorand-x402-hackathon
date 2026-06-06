import { useEffect, useState } from 'react'
import { getEvents, getHistory, getPayments, getSnapshot } from '../api/client'
import { mockEvents, mockHistory, mockPayments, mockSnapshot } from '../api/mockData'
import type { DashboardEvent, DashboardSnapshot, HistoryPoint, PaymentRow } from '../types'

type DashboardData = {
  snapshot: DashboardSnapshot
  history: HistoryPoint[]
  events: DashboardEvent[]
  payments: PaymentRow[]
  loading: boolean
  usingMockData: boolean
  errorMessage: string | null
}

const initialState: DashboardData = {
  snapshot: mockSnapshot(),
  history: mockHistory(10),
  events: mockEvents(),
  payments: mockPayments(),
  loading: true,
  usingMockData: true,
  errorMessage: null,
}

export function useDashboardData() {
  const [state, setState] = useState<DashboardData>(initialState)

  useEffect(() => {
    let cancelled = false

    const applyUpdate = (update: Partial<DashboardData>) => {
      if (cancelled) return
      setState((prev) => ({ ...prev, ...update }))
    }

    const fetchSnapshotAndEvents = async () => {
      try {
        const [snapshot, events, payments] = await Promise.all([
          getSnapshot(),
          getEvents(100),
          getPayments(),
        ])
        applyUpdate({
          snapshot,
          events,
          payments,
          loading: false,
          usingMockData: false,
          errorMessage: null,
        })
      } catch {
        applyUpdate({
          loading: false,
          usingMockData: true,
          errorMessage: 'Live API unavailable. Preserving last dashboard data.',
        })
      }
    }

    const fetchHistoryData = async () => {
      try {
        const history = await getHistory(10)
        applyUpdate({ history })
      } catch {
        applyUpdate({ usingMockData: true })
      }
    }

    void fetchSnapshotAndEvents()
    void fetchHistoryData()

    const fastPoll = window.setInterval(() => {
      void fetchSnapshotAndEvents()
    }, 2000)

    const historyPoll = window.setInterval(() => {
      void fetchHistoryData()
    }, 5000)

    return () => {
      cancelled = true
      window.clearInterval(fastPoll)
      window.clearInterval(historyPoll)
    }
  }, [])

  return state
}
