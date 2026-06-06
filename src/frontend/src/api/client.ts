import type { DashboardEvent, DashboardSnapshot, HistoryPoint, PaymentRow } from '../types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4021'

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`)
  if (!response.ok) {
    throw new Error(`${path} failed with status ${response.status}`)
  }
  return (await response.json()) as T
}

export async function getSnapshot(): Promise<DashboardSnapshot> {
  return fetchJson<DashboardSnapshot>('/api/snapshot')
}

export async function getHistory(minutes = 10): Promise<HistoryPoint[]> {
  return fetchJson<HistoryPoint[]>(`/api/history?minutes=${minutes}`)
}

export async function getEvents(limit = 100): Promise<DashboardEvent[]> {
  return fetchJson<DashboardEvent[]>(`/api/events?limit=${limit}`)
}

export async function getPayments(): Promise<PaymentRow[]> {
  return fetchJson<PaymentRow[]>('/api/payments')
}
