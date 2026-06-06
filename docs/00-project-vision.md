# Project Vision — P2P Agentic Energy Sharing

## The pitch

With **§42c EnWG** (German Energy Sharing law, in force **1 June 2026**), households can now share
surplus (solar) electricity with neighbors in the same balancing area. Today this is human-driven
and slow.

> ⚖️ **Legal accuracy:** §42c *does* let you be **paid per kWh** (`entgeltliche Gegenleistung … in
> Cent pro Kilowattstunde`, Abs. 3 Nr. 3) for renewable electricity — **including from a battery that
> stores only renewable energy** (Abs. 1 S. 1). The real limits: same balancing area, renewable-only,
> operator **not predominantly commercial**, supplements (not replaces) your supplier, 15-min
> metering. It's regulated *energy sharing*, not an open P2P market. Pitch our agents as the
> **automation + on-chain settlement of §42c's per-kWh remuneration**. Full detail + safe pitch
> wording in [04-law-42c-enwg.md](04-law-42c-enwg.md).

**Vision:** Fully autonomous, agent-driven energy trading between households.
No intermediary, no utility middleman, no manual coordination.

**MVP:** Your EV autonomously buys cheap solar from your neighbor, pays instantly via
**x402 (Algorand)**, and charges — while you sleep.

**Outlook:** Prediction markets for ahead-of-time energy trading — *buy tomorrow's solar
surplus today*.

> Let's make P2P energy sharing solarpunk again ☀️⚡️

## Why this is a strong hackathon fit

- **On-theme:** It is literally agent-to-agent commerce — a buyer agent (EV) paying a seller
  agent (household battery/inverter) for a metered good. Maps directly onto Track 1.
- **Real micropayments:** Energy is sold continuously in small increments (per kWh / per minute
  of charging). x402 + Algorand's low fees and instant finality are purpose-built for this.
- **Timely & local:** The §42c law just came into force; the audience is German. "Agents
  transacting MiCA-regulated digital euros for energy under a brand-new German law" is a
  narrative judges remember.
- **Tangible:** Unlike abstract "agents buying data," everyone understands an EV charging from
  a neighbor's solar. The demo tells itself.

## Core actors

| Actor | Role | Agent behavior |
|---|---|---|
| **Producer household** | Has solar + battery + surplus | Runs a **seller agent** exposing an x402-paywalled "buy energy" endpoint; prices surplus dynamically |
| **Consumer / EV** | Needs to charge | Runs a **buyer agent** that discovers offers, picks the cheapest/greenest, pays per kWh via x402, charges |
| **Meter / settlement** | Proves delivery | Reports kWh delivered; ties payment to actual energy flow |
| **(Optional) Market** | Forward trading | Prediction market where agents buy tomorrow's surplus today |

## The autonomous loop (vision)

This is the full conceptual flow. **The MVP collapses steps 2–3 to a single, directly-connected
producer** (no discovery / no multi-neighbor comparison) — see MVP scope below.

1. EV agent detects: battery low, electricity needed, user asleep.
2. EV agent **discovers** neighbor offers (Bazaar registry / multi-neighbor). *(vision; MVP = one fixed producer)*
3. EV agent compares prices (€/kWh) + greenness + availability, picks the best neighbor. *(vision)*
4. EV agent requests energy → seller returns **HTTP 402 Payment Required** with price.
5. EV agent **pays via x402** (USDC on TestNet; EURQ as bonus).
6. Facilitator **verifies + settles** on-chain.
7. Seller **releases energy** — Pi decrements battery (`POST /consume`); agent tracks delivery at 3 kW.
8. Dashboard payment log shows the settled transaction with a **Lora explorer link** — proof it's real.
9. Repeat per purchase until EV is charged / budget hit / surplus exhausted.

## MVP scope (what to actually build in 36h)

> Full task breakdown in [06-build-plan-and-tasks.md](06-build-plan-and-tasks.md). The demo is
> **physical and interactive**: one Producer (Raspberry Pi + potentiometer "sun" + jumper
> "EV plug") and one autonomous Consumer Agent on a laptop.

**Must have (the demo's wow moment):**
- One Producer service (Pi/FastAPI) + one x402 server (Hono) + one autonomous Consumer Agent.
- Turn the potentiometer → solar rises → price drops → agent decides to buy.
- A real, settled **x402 USDC payment** on Algorand TestNet per purchase, visible on Lora.
- A live React dashboard: solar/battery/price gauges, sawtooth battery chart, payment log.

**Should have:**
- Dynamic pricing tied to surplus (full battery + strong sun → cheapest).
- Budget / spend cap on the agent ("max $5 tonight") that visibly stops buying when price > budget.
- Re-buy loop: delivery completes → agent buys again → multiple on-chain txs.

**Could have (bonus tracks / "serious" features — add at most one to the live demo):**
- **EURQ** as the payment asset (Quantoz bonus + German digital-euro narrative).
- **ARC-58 spend policy**: a "rogue agent tries to overspend → blocked on-chain" moment
  (spectacle + security + Algorand-native).
- **Folks Finance xALGO**: seller parks earnings to earn yield while idle.
- **Alpha Arcade**: forward market — anonymized solar telemetry → predict/pre-buy tomorrow's surplus.

**Won't have (YAGNI for 36h):**
- Real meters / real grid integration (hardware is a *simulation* via pot + GPIO).
- Multi-neighbor discovery / Bazaar registry (single producer ↔ single consumer for MVP).
- Full legal compliance engine for §42c (we *reference* the law, we don't implement it).
- Production-grade dispute resolution / escrow (mention as roadmap).

## Build order (de-risk first)

Follow the 6 phases in [06-build-plan-and-tasks.md](06-build-plan-and-tasks.md):
1. **Phase 1** — generate + fund two TestNet accounts, opt into USDC, `.env` files.
2. **First milestone:** agent buys 1 kWh from the server with a **real settled USDC tx** — in
   laptop **mock mode** (no Pi needed). This is the minimum viable demo; everything layers on it.
3. **Phases 2–4** — Producer (Pi) + Hono x402 server + Consumer Agent, in parallel via mock data.
4. **Phase 5** — React dashboard with Lora explorer links.
5. Add **one** bonus-track / "serious" feature (EURQ or ARC-58 spend cap) for differentiation.
6. **Phase 6 + last 4–5 hours** — integration, 3× clean dry runs, backup recording, pitch rehearsal.

## Resolved decisions (from plan.md)

- **Unit of sale:** per kWh. Buyer specifies kWh per request (`GET /energy/buy?kwh=1`).
- **Payment cadence:** pay-per-purchase — settle one x402 payment per buy; re-buy after delivery.
- **Delivery proof (MVP):** simulated meter — Pi decrements battery on `POST /consume`; agent
  tracks delivery locally at 3 kW (time-accelerated). Trust + on-chain tx ticker for the demo.
- **Payment asset:** **USDC** TestNet (ASA `10458941`) as the safe default; **EURQ** as a bonus
  add-on behind a flag.
- **Discovery:** none for MVP — single producer, direct wired link (Pi ↔ laptop). Bazaar optional/later.
- **Time:** accelerated via `ACCEL` (default 60) so a battery cycle takes ~minutes, not hours.
