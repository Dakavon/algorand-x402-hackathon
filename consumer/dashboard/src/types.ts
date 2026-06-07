export type HealthStatus = 'ok' | 'stale' | 'down' | 'error'

export type ProducerStatus = {
  ts: number
  solar_kw: number
  battery_kwh: number
  battery_pct: number
  price_per_kwh: number
  ev_plugged: boolean
  has_offer: boolean
  stale?: boolean
}

export type AgentLifecycle = 'IDLE' | 'EVALUATING' | 'PAYING' | 'CHARGING' | 'WAITING' | 'ERROR'

export type AgentState = {
  state: AgentLifecycle
  delivery_remaining_kwh: number
  budget_remaining: number
  max_price_per_kwh: number
  last_tx_id?: string
  decision_reason?: string
}

export type DashboardSnapshot = {
  producer: ProducerStatus
  agent: AgentState
  totals: {
    sold_kwh: number
    spent: number
    tx_count: number
    ev_power_kw: number
  }
  health: {
    producer: HealthStatus
    x402: HealthStatus
    agent: HealthStatus
  }
}

export type DashboardEvent = {
  ts: number
  type: 'STATE' | 'DECISION' | 'PAYMENT' | 'ERROR'
  message: string
  kwh?: number
  price?: number
  tx_id?: string
  lora_url?: string
}

export type HistoryPoint = {
  ts: number
  solar_kw: number
  battery_kwh: number
  battery_pct: number
  price_per_kwh: number
  ev_plugged: boolean
}

export type PaymentRow = {
  ts: number
  kwh: number
  price_paid: number
  tx_id: string
  lora_url?: string
}
