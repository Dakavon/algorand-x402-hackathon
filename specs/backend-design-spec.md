# Backend Design Spec

Owner: B maintains this spec. N owns producer and x402 correctness. J owns agent state and event
vocabulary. S consumes these contracts for the React dashboard.

## Goal

Expose a small, stable backend surface for the live demo: producer telemetry, dynamic pricing,
agent decisions, x402 payment settlement, and dashboard aggregation.

## Services

| Service | Port | Tech | Owner | Responsibility |
|---|---:|---|---|---|
| Producer | 8001 | Python/FastAPI | N | Hardware or mock telemetry, battery simulation, price, history, consume endpoint. |
| x402 server | 4021 | TypeScript/Hono | N with B | Cached producer status, x402-protected energy purchase, payment log, dashboard API aggregation. |
| Consumer agent | 4022 | TypeScript/Hono | J with B | Autonomous state machine, x402 client, budget, delivery countdown, events. |
| React dashboard | 5173 | React/Vite | S | Read-only UI that polls the x402 server dashboard API. |

## Producer API

### `GET /status`

Returns the current producer state.

```json
{
  "ts": 1780754400.0,
  "solar_kw": 3.2,
  "battery_kwh": 7.2,
  "battery_pct": 0.72,
  "price_per_kwh": 0.14,
  "ev_plugged": true,
  "has_offer": true
}
```

### `GET /history?minutes=10`

Returns recent producer readings sorted ascending by timestamp.

```json
[
  {
    "ts": 1780754400.0,
    "solar_kw": 3.2,
    "battery_kwh": 7.2,
    "battery_pct": 0.72,
    "price_per_kwh": 0.14,
    "ev_plugged": true
  }
]
```

### `POST /consume`

Request body:

```json
{ "kwh": 1 }
```

Success response:

```json
{ "ok": true, "battery_kwh": 6.2, "battery_pct": 0.62 }
```

If there is not enough energy, return `409`:

```json
{ "ok": false, "error": "insufficient_battery" }
```

## x402 Server API

### `GET /status`

Free endpoint. Returns the last producer status cached by the Hono poller. Include `stale: true`
when the producer has not responded recently.

### `GET /energy/buy?kwh=1`

x402-protected endpoint. The consumer agent calls this with `@x402/fetch`.

No `X-PAYMENT` header:

- Validate `kwh` with default `1`, minimum `0.1`, and maximum current available battery.
- Reject if `has_offer` is false.
- Compute `price_usdc = kwh * price_per_kwh` using the cached status at challenge time.
- Return HTTP `402 Payment Required` with Algorand TestNet USDC requirements.

With `X-PAYMENT` header:

- Verify payment with the facilitator.
- Settle payment on Algorand TestNet.
- Call producer `POST /consume` after settlement succeeds.
- Append a payment row to `src/x402/server/payments.jsonl`.
- Return the granted result.

Success response:

```json
{
  "granted_kwh": 1,
  "price_paid_usdc": 0.14,
  "tx_id": "ABC123",
  "timestamp": 1780754402.0,
  "new_battery_kwh": 6.2,
  "lora_url": "https://lora.algokit.io/testnet/transaction/ABC123"
}
```

## Dashboard Aggregation API

The React dashboard should call the Hono x402 server only. This keeps browser CORS simple and keeps
all service aggregation in one place.

### `GET /api/snapshot`

Returns the current producer state, agent state, totals, and health.

```json
{
  "producer": {
    "ts": 1780754400.0,
    "solar_kw": 3.2,
    "battery_kwh": 7.2,
    "battery_pct": 0.72,
    "price_per_kwh": 0.14,
    "ev_plugged": true,
    "has_offer": true,
    "stale": false
  },
  "agent": {
    "state": "CHARGING",
    "delivery_remaining_kwh": 0.6,
    "budget_remaining_usdc": 4.72,
    "max_price_per_kwh": 0.2,
    "last_tx_id": "ABC123",
    "decision_reason": "Bought 1 kWh because price 0.14 <= max 0.20"
  },
  "totals": {
    "sold_kwh": 2,
    "spent_usdc": 0.28,
    "tx_count": 2,
    "ev_power_kw": 3
  },
  "health": {
    "producer": "ok",
    "x402": "ok",
    "agent": "ok"
  }
}
```

### `GET /api/history?minutes=10`

Proxy producer history and normalize field names. Return an empty array if producer history is
temporarily unavailable, plus expose stale state through `/api/health`.

### `GET /api/events?limit=100`

Returns recent agent and payment events sorted newest first.

```json
[
  {
    "ts": 1780754402.0,
    "type": "PAYMENT",
    "message": "Paid 0.14 USDC for 1 kWh",
    "kwh": 1,
    "price_usdc": 0.14,
    "tx_id": "ABC123",
    "lora_url": "https://lora.algokit.io/testnet/transaction/ABC123"
  }
]
```

### `GET /api/payments`

Returns settled x402 payment records from `payments.jsonl`.

### `GET /api/health`

Returns service health for lightweight UI checks.

```json
{
  "producer": "ok",
  "x402": "ok",
  "agent": "ok",
  "last_producer_seen_ts": 1780754400.0,
  "last_agent_seen_ts": 1780754401.0
}
```

## Agent API

### `GET /state`

```json
{
  "state": "CHARGING",
  "solar_kw": 3.2,
  "battery_pct": 0.72,
  "price_per_kwh": 0.14,
  "delivery_remaining_kwh": 0.6,
  "budget_remaining_usdc": 4.72,
  "max_price_per_kwh": 0.2,
  "last_tx_id": "ABC123",
  "decision_reason": "Bought 1 kWh because price 0.14 <= max 0.20"
}
```

### `GET /events`

Returns up to 100 recent events. Event types should be `STATE`, `DECISION`, `PAYMENT`, or `ERROR`.

## Environment

Server `src/x402/server/.env`:

```txt
SELLER_ADDRESS=<seller_public_address>
FACILITATOR_URL=https://facilitator.goplausible.xyz
PI_URL=http://raspberrypi.local:8001
AGENT_URL=http://localhost:4022
```

Agent `src/x402/client/.env`:

```txt
BUYER_MNEMONIC=<buyer_25_word_mnemonic>
SERVER_URL=http://localhost:4021
BUDGET_USD=5.00
MAX_PRICE_PER_KWH=0.20
ACCEL=60
```

Frontend `.env`:

```txt
VITE_API_BASE_URL=http://localhost:4021
```

## Implementation Notes

- Keep private keys only in the consumer agent process.
- Accept payment amounts greater than or equal to the challenged price to tolerate minor price drift.
- If producer `/consume` returns `409` after settlement, return an explicit error and log it; refund is roadmap.
- Mark producer status stale if the poller has not refreshed for more than 5 seconds.
- Mark agent status down if `/state` has not responded for more than 5 seconds.
- The first integration milestone remains one settled USDC TestNet transaction visible on Lora.
