# Team Operating Model

Owner: B maintains this file and keeps assignments current.

## Team

| Person | Primary role | Current context |
|---|---|---|
| N | Technical initiator, Pi owner, x402 lead | Brought Raspberry Pis and house emulator; understands current x402 direction best. |
| S | Frontend/demo UX engineer | Strong frontend background; no blockchain experience assumed. |
| J | LLM/AI expert | Owns agent reasoning and research synthesis; keeps LLM work off the critical path. |
| B | Coordinator/generalist | Has blockchain and software background; coordinates and pairs with N on x402. |

## Operating Principles

1. Owner: B. Keep the critical path visible at all times.
2. Owner: B. Every task in planning docs must have an owner.
3. Owner: N and B. Remove the x402 bus factor early through pairing.
4. Owner: S. Build UI against mocked JSON before all backend pieces are ready.
5. Owner: J. Make agent decisions explainable, but do not block payment integration on LLM features.
6. Owner: all. Prefer a working narrow demo over a broad unfinished prototype.

## Workstreams

| Workstream | Owner | Backup | Outcome |
|---|---|---|---|
| Producer/house emulator | N | B | FastAPI service with hardware or mock mode, pricing, history, and consume endpoint. |
| x402 payment loop | N | B | Real TestNet x402 payment from consumer to producer, visible on Lora. |
| Consumer agent | J | B | State machine that decides, pays, tracks delivery, and exposes state/events. |
| Dashboard/demo UX | S | B | React/Vite dashboard with state, charts, events, and transaction links. |
| Integration/release | B | N | Start order, env readiness, dry runs, fallback recording, and final submission hygiene. |
| Market/legal research | J | B | Research brief distilled into product differentiation and pitch material. |

## Capability Cards

Each person should fill their row before detailed task assignment.

| Person | Available hours | Strongest skills | Avoid / weak spots | Can own | Can pair on | Current blocker |
|---|---|---|---|---|---|---|
| N | TODO by N | TODO by N | TODO by N | Pi, FastAPI, x402 lead | B on x402, S on data needs | TODO by N |
| S | TODO by S | Frontend/demo UX | Blockchain/x402 ramp-up | React dashboard/demo UI | B on API mocks, J on explanations | TODO by S |
| J | TODO by J | LLM/AI | TODO by J | Agent reasoning, research | B on agent state, S on explainability UI | TODO by J |
| B | TODO by B | Coordination, software, blockchain | TODO by B | Integration, decisions, x402 understudy | N on x402, all on blockers | TODO by B |

## Immediate Assignments

| Assignment | Owner | Support | Done when |
|---|---|---|---|
| Explain and document the x402 request/payment/settlement path | N | B | B can describe and test the flow without N driving. |
| Keep the Pi producer runnable in mock mode | N | B | S and J can develop without physical hardware. |
| Own React dashboard design and implementation | S | B | React dashboard renders mocked and live backend state with charts, payment log, Lora links, and clear stale/offline states. |
| Define consumer agent state and event vocabulary | J | B | Dashboard and logs can show why the agent bought, waited, or stopped. |
| Set up funding/env readiness checklist | B | N | Accounts, ALGO, USDC opt-in, and `.env` ownership are clear. |
| Start market/legal deep research | J | B | Findings are summarized into project differentiation, not raw links only. |

## Coordination Cadence

| Moment | Owner | Purpose |
|---|---|---|
| Start of build block | B | Confirm critical-path owner, blocker, and next integration target. |
| After x402 milestone | N and B | Freeze the payment path and publish exact commands/env needs. |
| Before dashboard polish | S and B | Confirm the dashboard reflects real backend state, not fake-only state. |
| Before adding bonus features | B | Decide if the core demo is stable enough for bonus work. |
| Final rehearsal | All | Run the full sequence three times and record fallback evidence. |

## Escalation Rules

1. Owner: B. If a person is blocked for more than 20 minutes, B reassigns support.
2. Owner: B. If a task threatens the core payment milestone, it is paused or descoped.
3. Owner: N. If x402 behavior is unclear, N and B pair before others build around assumptions.
4. Owner: S. If UI needs data that does not exist yet, S creates a mock contract and asks B to confirm.
5. Owner: J. If LLM/research work produces a product claim, J flags it for B to verify before pitch use.
