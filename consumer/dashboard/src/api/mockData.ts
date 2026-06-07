import type { DashboardEvent, DashboardSnapshot, HistoryPoint, PaymentRow } from '../types'

const now = () => Math.floor(Date.now() / 1000)

export function mockSnapshot(): DashboardSnapshot {
  const ts = now()
  return {
    producer: {
      ts,
      solar_kw: 3.6,
      battery_kwh: 7.4,
      battery_pct: 0.74,
      price_per_kwh: 0.13,
      ev_plugged: true,
      has_offer: true,
      stale: false,
    },
    agent: {
      state: 'CHARGING',
      delivery_remaining_kwh: 0.58,
      budget_remaining: 4.72,
      max_price_per_kwh: 0.2,
      last_tx_id: 'MOCKTX123',
      decision_reason: 'Bought 1 kWh because price 0.13 <= max 0.20',
    },
    totals: {
      sold_kwh: 2,
      spent: 0.28,
      tx_count: 2,
      ev_power_kw: 3,
    },
    health: {
      producer: 'ok',
      x402: 'ok',
      agent: 'ok',
    },
  }
}

export function mockHistory(minutes = 10): HistoryPoint[] {
  const points = Math.max(12, Math.floor(minutes * 6))
  const baseTs = now() - points * 10
  return Array.from({ length: points }, (_, index) => {
    const t = index / points
    const solar_kw = Math.max(0, Math.min(5, 2.8 + Math.sin(t * Math.PI * 2.2) * 1.4))
    const battery_pct = Math.max(0.12, Math.min(0.95, 0.62 + Math.sin(t * Math.PI * 1.2) * 0.22))
    const price_per_kwh = Math.max(0.01, 0.3 - battery_pct * 0.15 - solar_kw * 0.02)
    return {
      ts: baseTs + index * 10,
      solar_kw: Number(solar_kw.toFixed(2)),
      battery_kwh: Number((battery_pct * 10).toFixed(2)),
      battery_pct: Number(battery_pct.toFixed(2)),
      price_per_kwh: Number(price_per_kwh.toFixed(3)),
      ev_plugged: index % 13 !== 0,
    }
  })
}

export function mockEvents(): DashboardEvent[] {
  const ts = now()
  return [
    {
      ts,
      type: 'PAYMENT',
      message: 'Paid 0.13 EURD for 1 kWh',
      kwh: 1,
      price: 0.13,
      tx_id: 'MOCKTX123',
      lora_url: 'https://lora.algokit.io/testnet/transaction/MOCKTX123',
    },
    {
      ts: ts - 9,
      type: 'DECISION',
      message: 'Price acceptable, initiating buy request',
    },
    {
      ts: ts - 15,
      type: 'STATE',
      message: 'Transition: EVALUATING -> PAYING',
    },
    {
      ts: ts - 21,
      type: 'STATE',
      message: 'Transition: IDLE -> EVALUATING',
    },
  ]
}

export function mockPayments(): PaymentRow[] {
  return [
    {
      ts: now(),
      kwh: 1,
      price_paid: 0.13,
      tx_id: 'MOCKTX123',
      lora_url: 'https://lora.algokit.io/testnet/transaction/MOCKTX123',
    },
  ]
}
