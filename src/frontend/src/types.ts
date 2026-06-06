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
  budget_remaining_usdc: number
  max_price_per_kwh: number
  payment_symbol?: string
  last_tx_id?: string
  decision_reason?: string
}

export type DashboardSnapshot = {
  payment_symbol?: string
  payment_asset_id?: string
  payment_network?: string
  producer: ProducerStatus
  agent: AgentState
  totals: {
    sold_kwh: number
    spent_usdc: number
    spent_amount?: number
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
  price_usdc?: number
  asset_symbol?: string
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
  price_paid_usdc: number
  asset_symbol?: string
  tx_id: string
  lora_url?: string
}
