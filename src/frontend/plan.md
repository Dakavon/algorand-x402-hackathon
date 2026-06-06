# Frontend Plan

Source authority: `specs/plan.md` and `specs/frontend-react-design-spec.md`.

## Role

React/Vite dashboard for the live demo. It shows producer state, agent decisions, payment events,
service health, and clickable Lora transaction proof.

## Runtime

- Path: `src/frontend`
- Port: `5173`
- API base: `VITE_API_BASE_URL`, default `http://localhost:4021`
- Primary API: `src/x402/server` dashboard endpoints under `/api/*`

## Build Against

- `GET /api/snapshot`
- `GET /api/history?minutes=10`
- `GET /api/events?limit=100`
- `GET /api/payments`
- `GET /api/health`

## Deliverables

- Metric strip: solar, battery, price, EV plug, agent state
- Energy flow visual: producer -> x402 payment -> EV charging
- Charts: solar/price and battery with payment markers
- Agent panel: budget, delivery remaining, decision reason, last tx
- Payment ledger: event rows with Lora links
- Stale/offline states that keep the dashboard usable during backend hiccups

## Boundary

The dashboard is read-only. It must not store mnemonics, sign payments, or call `/energy/buy`
directly. The consumer agent owns purchases.
