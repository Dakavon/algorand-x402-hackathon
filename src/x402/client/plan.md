# x402 Client Plan

Source authority: `specs/plan.md` and `specs/backend-design-spec.md`.

## Role

TypeScript consumer agent that watches producer status, applies deterministic budget rules, pays via
x402 when conditions are acceptable, tracks charging delivery, and exposes state/events for the
dashboard.

## Runtime

- Path: `src/x402/client`
- Port: `4022`
- Env: `BUYER_MNEMONIC`, `SERVER_URL`, `BUDGET_USD`, `MAX_PRICE_PER_KWH`, `ACCEL`

## State Machine

`IDLE -> EVALUATING -> PAYING -> CHARGING -> IDLE`

## Behavior

- Poll `SERVER_URL/status` every 2 seconds
- Buy when `ev_plugged && has_offer && price_per_kwh <= max_price_per_kwh`
- Call `GET /energy/buy?kwh=1` with x402 payment support
- Decrement budget after each successful purchase
- Track delivery at 3 kW with `ACCEL`
- Re-buy after delivery completes if conditions still hold
- Stop when unplugged, over budget, no offer, or price too high

## Endpoints

- `GET /state`: current state, budget, delivery remaining, last tx, decision reason
- `GET /events`: recent state, decision, payment, and error events

## Boundary

Only this service holds the buyer mnemonic. It must not expose the mnemonic through logs, events,
dashboard APIs, or error messages.
