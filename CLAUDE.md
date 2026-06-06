# P2P Agentic Energy Sharing ⚡️🤖

> Autonomous, agent-driven energy trading between households — no intermediary.
> Built for the **Algorand Builders Berlin — Agentic Commerce x402 Hackathon** (June 6–7, 2026, @ 42 Berlin).

This file is the entry point for any developer or AI agent working in this repo.
Read the docs in `docs/` for full context before building.

---

## One-liner

Your EV autonomously buys cheap surplus solar from your neighbor, pays instantly via
**x402 on Algorand**, and charges — while you sleep. Grounded in Germany's new
**§42c EnWG** energy-sharing law (in force 06/2026).

## Team

4 people. At least **one member must be fully on-site** to present the final pitch.
⚠️ Note: the build plan in the repo (`plan.md`) was written for **2 people** — see
[docs/team-operating-model.md](docs/team-operating-model.md) for current ownership and
[docs/06-build-plan-and-tasks.md](docs/06-build-plan-and-tasks.md) for the original phase checklist.

## Source of truth

This working dir **is** the team repo `Dakavon/algorand-x402-hackathon` (`origin` → GitHub, branch
`main`). The authoritative plan lives at the repo root: `idea.md` and `plan.md`. Our `CLAUDE.md`
and `docs/` add hackathon context, strategy, and a task distillation the repo doesn't have.

## Mandatory constraints (to qualify for prizes)

- Must implement **x402 on Algorand**.
- Must fit the **"Agentic Commerce"** theme.
- **New project**: all code written *during* the hackathon (ideation beforehand is fine).
- Submit project + presentation **before 13:00 on June 7, 2026**.

## Target tracks

- **Primary:** Track 1 — Agentic Commerce ($11,000). (Agents transacting over x402.)
- **Bonus (opportunistic):** Quantoz EURQ (regulated digital euro — strong German narrative),
  Folks Finance xALGO (idle-treasury yield), Alpha Arcade (prediction markets for
  "buy tomorrow's solar today").

## Stack (decided — see plan.md)

- **Producer:** Raspberry Pi 4 — Python/FastAPI (:8001). Potentiometer→ADC = solar, GPIO = "EV plugged",
  battery sim, dynamic pricing, SQLite. Mock fallback for laptop-only dev.
- **x402 Server:** Laptop — TypeScript/Hono (:4021). Custom x402 handler wraps `/energy/buy`.
- **Consumer Agent:** Laptop — TypeScript (:4022). State machine buyer (IDLE→EVAL→PAY→CHARGING).
- **Dashboard:** Laptop — React/Vite (:5173). Gauges, charts, payment log w/ Lora links.
- **Payments:** x402 (`@x402/avm`, `@x402/fetch`, `@x402/hono`), GoPlausible facilitator,
  **USDC TestNet (ASA `10458941`)**; EURQ as a bonus add-on.
- **Tooling:** AlgoKit / algokey, Lora explorer + faucet, Circle USDC faucet.

## Docs index

| File | What's in it |
|---|---|
| [docs/00-project-vision.md](docs/00-project-vision.md) | The idea, MVP, outlook, why it wins |
| [docs/01-hackathon-rules.md](docs/01-hackathon-rules.md) | Rules, tracks, prizes, timeline, submission |
| [docs/02-resources.md](docs/02-resources.md) | All official docs, SDKs, templates, tools, faucets |
| [docs/03-x402-and-agentic-commerce.md](docs/03-x402-and-agentic-commerce.md) | x402 flow, agentic commerce concepts, Bazaar, ARCs, security |
| [docs/04-law-42c-enwg.md](docs/04-law-42c-enwg.md) | Verified §42c EnWG legal basis and safe pitch framing |
| [docs/05-strategy-and-landscape.md](docs/05-strategy-and-landscape.md) | Prior winners, differentiation, demo & pitch strategy |
| [docs/06-build-plan-and-tasks.md](docs/06-build-plan-and-tasks.md) | **Concrete architecture, constants, 6-phase task checklist** |
| [docs/07-prephase-setup-and-mock-plan.md](docs/07-prephase-setup-and-mock-plan.md) | **Pre-phase: wallet setup, roles, verified SDK, local mock-payment milestone (share this)** |
| [docs/08-transaction-flow-explained.md](docs/08-transaction-flow-explained.md) | **End-to-end flow: accounts layer vs x402 protocol layer, the 402 handshake, code provenance** |
| [docs/09-competitive-landscape-and-crypto-fit.md](docs/09-competitive-landscape-and-crypto-fit.md) | **Verified competitive landscape + why crypto/x402 fits; killed-claims cheat-sheet for the pitch** |
| [docs/backend-design-spec.md](docs/backend-design-spec.md) | Backend service contracts and dashboard API endpoints |
| [docs/frontend-react-design-spec.md](docs/frontend-react-design-spec.md) | React dashboard ownership, layout, components, and data needs |
| [docs/system-design.md](docs/system-design.md) | System architecture, payment flow, boundaries, future product shape |
| [docs/team-operating-model.md](docs/team-operating-model.md) | 4-person ownership, capability cards, coordination cadence |
| [docs/research-brief.md](docs/research-brief.md) | Assigned market, legal, and competitive research workstream |
| [specs/constitution.md](specs/constitution.md) | Project constitution, scope rules, decision rules, pitch rules |

## Status

✅ **Phase 0 complete** — an autonomous agent bought 1 kWh and settled a **real USDC payment on
Algorand TestNet** (laptop, mock; no Pi yet).
- Settled tx: `NL2FAXW72GC2BBBCM3D2T5DAHDBN36IY3L6JLLJ66SJOATXXPH2A`
  (buyer −0.01 / seller +0.01 USDC, verified on-chain).
- Reproduce: see [RUN.md](RUN.md). Code in `server/` (seller) + `consumer/agent/` (buyer).

**Next:** Phase 2 (still local) — dynamic per-kWh pricing + mock producer state (solar/battery) +
agent state machine (IDLE→EVAL→PAY→CHARGING) + budget cap + re-buy loop. Then dashboard, then Pi.
