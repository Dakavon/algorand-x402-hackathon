# System Design

Owner: B maintains this document. N owns hardware/x402 technical correctness. S owns dashboard
clarity. J owns agent reasoning clarity.

## System Goal

Demonstrate an autonomous energy-sharing transaction: a simulated house offers renewable surplus,
an EV-like consumer agent decides whether to buy, and x402 on Algorand settles the per-kWh payment.

## Actors

| Actor | Owner | Role |
|---|---|---|
| Producer household | N | Simulated solar, battery, EV plug signal, dynamic price, and consumption endpoint. |
| x402 resource server | N and B | Converts producer state into an x402-protected `buy energy` resource. |
| Consumer EV agent | J and B | Watches state, applies budget policy, pays, and tracks delivery. |
| Dashboard operator | S | Shows state, decisions, payment log, and Lora proof. |
| Facilitator | N and B | Verifies and settles x402 payments on Algorand TestNet. |

## Component Architecture

| Component | Owner | Runtime | Responsibility |
|---|---|---|---|
| Producer service | N | Raspberry Pi or laptop mock, Python/FastAPI, port 8001 | Sensor/mock state, battery sim, price, SQLite history, `/consume`. |
| x402 server | N with B pairing | Laptop, TypeScript/Hono, port 4021 | Poll producer, return free status, protect `/energy/buy` with x402, log payments. |
| Consumer agent | J with B pairing | Laptop, TypeScript/Hono, port 4022 | State machine, budget decisions, x402 client, event log. |
| Dashboard | S | Laptop, Python/Streamlit, port 8501 | Live visualization and clickable transaction evidence. |

## Data Flow

1. Owner: N. Producer reads or mocks `solar_kw`, `battery_kwh`, `battery_pct`, `ev_plugged`, and `has_offer`.
2. Owner: N. Producer computes `price_per_kwh` from surplus and battery state.
3. Owner: N and B. x402 server polls producer `/status` and caches the latest state.
4. Owner: J. Consumer agent polls x402 server `/status` and evaluates budget, offer, and EV plug state.
5. Owner: J and B. If the policy allows buying, the agent requests `/energy/buy?kwh=1`.
6. Owner: N and B. x402 server returns HTTP `402 Payment Required` when no payment is attached.
7. Owner: J and B. Consumer agent signs and retries with `X-PAYMENT`.
8. Owner: N and B. Facilitator verifies and settles the payment on Algorand TestNet.
9. Owner: N. x402 server calls producer `/consume` after settlement succeeds.
10. Owner: S. Dashboard shows updated state, agent event, and Lora transaction link.

## Payment Design

| Decision | Owner | Value |
|---|---|---|
| Unit | N and B | kWh per request. MVP uses `1` kWh. |
| Asset | N and B | USDC TestNet ASA `10458941` as safe default. EURQ only as optional extension. |
| Settlement proof | S | Lora TestNet transaction link visible in dashboard. |
| Payment cadence | J and B | Pay per purchase; re-buy after delivery completes. |
| Price source | N | Current producer state at payment challenge time. |

## Trust And Boundary Assumptions

| Boundary | Owner | Assumption |
|---|---|---|
| Metering | N | Pi readings emulate metering; not certified real-world metering. |
| Delivery | N and J | Producer battery decrement plus agent delivery countdown are the demo proof of delivery. |
| Legal compliance | B | The demo approximates Section 42c remuneration flow; it is not a compliance product. |
| Payment settlement | N and B | TestNet settlement demonstrates x402 mechanics, not production payment compliance. |
| Agent policy | J | Agent decisions are constrained by deterministic budget and availability rules. |

## Regulatory Boundary

Section 42c EnWG allows paid energy sharing under constraints. The production version would need
real contracts, participant eligibility checks, same-balancing-area validation, renewable-only
storage proof, compliant 15-minute metering, billing transparency, consumer protection, and residual
supply handling.

The demo only proves the missing automation layer: pricing, agent decision-making, payment request,
on-chain settlement, and auditable transaction history.

## Future Product Shape

| Area | Owner | Future requirement |
|---|---|---|
| Certified metering | N | Integrate real meter APIs and 15-minute interval records. |
| Contract/allocation logic | B | Encode Section 42c joint-use contract terms, allocation keys, and remuneration rules. |
| Agent policies | J | User-defined constraints: max nightly spend, minimum green share, latest charge time. |
| Operator dashboard | S | Compliance exports, participant billing views, settlement reconciliation. |
| Payments | N and B | Evaluate EURQ/e-money, fiat settlement, refunds, escrow, and accounting integration. |

## Integration Priority

| Priority | Owner | Outcome |
|---|---|---|
| 1 | N and B | x402 server returns valid payment requirements for `/energy/buy`. |
| 2 | J and B | Consumer agent pays successfully and receives a granted response. |
| 3 | N | Producer `/consume` changes battery state after settlement. |
| 4 | S | Dashboard shows payment proof and updated system state. |
| 5 | All | End-to-end demo runs three times without manual repair. |
