# Frontend React Design Spec

Owner: S owns this spec and the React dashboard implementation. B supports API contracts and mocks.
N supports producer data. J supports agent event wording.

## Goal

Build the live demo dashboard judges can understand in seconds: sun goes up, price drops, the EV
agent buys energy, x402 settles on Algorand, the battery drops, and the transaction appears on Lora.

## Scope

The dashboard is read-only. It never stores wallet mnemonics, never signs payments, and never calls
`/energy/buy` directly. The autonomous consumer agent performs all x402 purchases.

## Runtime

| Item | Value |
|---|---|
| Framework | React + Vite + TypeScript |
| Port | 5173 |
| API base | `VITE_API_BASE_URL`, default `http://localhost:4021` |
| Primary API | Hono x402 server `/api/*` endpoints |
| Refresh | Snapshot/events every 2s, history every 5s |

## Suggested Directory

```txt
src/frontend/
├── src/
│   ├── api/client.ts
│   ├── components/
│   │   ├── AgentPanel.tsx
│   │   ├── BatteryChart.tsx
│   │   ├── EnergyFlow.tsx
│   │   ├── MetricStrip.tsx
│   │   ├── PaymentLedger.tsx
│   │   ├── SolarPriceChart.tsx
│   │   └── SystemHealth.tsx
│   ├── hooks/useDashboardData.ts
│   ├── types.ts
│   ├── App.tsx
│   └── main.tsx
├── package.json
└── vite.config.ts
```

## Data Types

```ts
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

export type AgentState = {
  state: 'IDLE' | 'EVALUATING' | 'PAYING' | 'CHARGING' | 'WAITING' | 'ERROR'
  delivery_remaining_kwh: number
  budget_remaining_usdc: number
  max_price_per_kwh: number
  last_tx_id?: string
  decision_reason?: string
}

export type DashboardSnapshot = {
  producer: ProducerStatus
  agent: AgentState
  totals: {
    sold_kwh: number
    spent_usdc: number
    tx_count: number
    ev_power_kw: number
  }
  health: {
    producer: 'ok' | 'stale' | 'down'
    x402: 'ok' | 'error'
    agent: 'ok' | 'down'
  }
}

export type DashboardEvent = {
  ts: number
  type: 'STATE' | 'DECISION' | 'PAYMENT' | 'ERROR'
  message: string
  kwh?: number
  price_usdc?: number
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
```

## Layout

Use one responsive page.

Desktop:

```txt
Header: title, Algorand/x402 badge, service health
Metric strip: solar, battery, price, EV, agent state
Main: energy flow visual + agent panel
Charts: solar/price chart + battery chart
Ledger: payment and event log with Lora links
```

Mobile:

```txt
Header
Metric cards in two columns
Agent panel
Energy flow visual
Charts stacked
Ledger
```

## Components

### `MetricStrip`

Shows the five demo numbers that matter most.

| Metric | Source | Format |
|---|---|---|
| Solar | `snapshot.producer.solar_kw` | `3.2 kW` |
| Battery | `snapshot.producer.battery_pct` | `72%` |
| Price | `snapshot.producer.price_per_kwh` | `0.14 USDC/kWh` |
| EV Plug | `snapshot.producer.ev_plugged` | `Plugged` / `Unplugged` |
| Agent | `snapshot.agent.state` | State badge |

### `EnergyFlow`

Shows producer house, x402 payment, and EV consumer as a clear animated flow.

States:

| Condition | Visual |
|---|---|
| `has_offer=false` | Producer dimmed, label `No surplus` |
| `ev_plugged=false` | EV dimmed, label `Waiting for EV` |
| `agent.state=PAYING` | Payment path highlighted, label `x402 settling` |
| `agent.state=CHARGING` | Energy path highlighted, label `3 kW charging` |

### `AgentPanel`

Shows state, decision reason, budget remaining, max price, delivery remaining, and last tx.

This is where J's explainability work appears. Keep wording short and deterministic.

### `SolarPriceChart`

Shows solar output and price on one time axis. This makes the core mechanic obvious: more sun means
lower price.

### `BatteryChart`

Shows battery percentage over time with payment markers. The desired demo shape is a sawtooth:
solar refills the battery and each settled purchase drops it.

### `PaymentLedger`

Shows recent events and payment rows.

Columns:

| Column | Format |
|---|---|
| Time | Local time, seconds precision |
| Type | `PAYMENT`, `DECISION`, `STATE`, `ERROR` |
| Message | Short human-readable event |
| Amount | `1 kWh @ 0.14 USDC` when present |
| Tx | Short tx id and Lora link when present |

### `SystemHealth`

Shows `producer`, `x402`, and `agent` health. If any backend is stale or down, make that visible
without breaking the rest of the page.

## API Client

Implement a small client with typed fetch helpers.

```ts
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4021'

export async function getSnapshot(): Promise<DashboardSnapshot> {
  const res = await fetch(`${API_BASE}/api/snapshot`)
  if (!res.ok) throw new Error(`snapshot failed: ${res.status}`)
  return res.json()
}
```

Recommended hook behavior:

- Poll snapshot and events every 2 seconds.
- Poll history every 5 seconds.
- Keep rendering the last good response if a poll fails.
- Show an error banner or stale badge instead of blanking the dashboard.
- Use mocked JSON while backend endpoints are incomplete.

## Visual Direction

Use a demo-first energy-console look, not a generic admin dashboard.

Recommended style:

- Dark background with high-contrast solar yellow, battery green, and Algorand cyan accents.
- Large metric cards visible from a few meters away.
- Clear labels: `Solar`, `Battery`, `Price`, `EV`, `Agent`.
- Keep legal/blockchain detail out of the first visual layer; show Lora links in the ledger.

## Mock Data

S can start before backend integration using local mock fixtures that match
[backend-design-spec.md](backend-design-spec.md).

Minimum mock scenarios:

| Scenario | What it proves |
|---|---|
| High price, EV unplugged | Agent waits. |
| High solar, EV plugged | Price drops and agent decides to buy. |
| Paying | x402 path is visible. |
| Charging | EV flow is 3 kW and delivery countdown decreases. |
| Payment settled | Ledger row has tx id and Lora link. |
| Producer stale | UI degrades clearly without crashing. |

## Acceptance Criteria

- Dashboard runs with `pnpm dev` on port 5173.
- It can render fully against mock JSON before live backend integration.
- It polls `/api/snapshot`, `/api/history`, and `/api/events` when backend is available.
- Solar, battery, price, EV plugged, and agent state update every ~2 seconds.
- Battery chart shows purchase drops and recharge recovery.
- Payment ledger shows settled USDC transactions with clickable Lora links.
- Stale/offline producer or agent state is visible.
- No wallet mnemonic, private key, or x402 signing code exists in the frontend.

## Out Of Scope For S

- x402 payment signing.
- Facilitator integration.
- Producer battery simulation.
- Agent purchase policy internals beyond display text and event rendering.
