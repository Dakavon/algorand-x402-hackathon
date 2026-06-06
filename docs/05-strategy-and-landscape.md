# Strategy & Competitive Landscape

Research notes on what's already built in the x402 ecosystem, what wins these hackathons, and how
P2P Agentic Energy Sharing differentiates.

## What already exists — don't rebuild this

x402 is **fully supported on Algorand**: the spec is merged with Coinbase, the GoPlausible
facilitator is live, Bazaar is running, and tooling is ready. GoPlausible ships SDKs (TS/Python/Go)
with Express/FastAPI/Hono middleware and fee abstraction.

➡️ A "basic x402 SDK / paywall middleware" is **dead on arrival** as an idea. Build a *product on
top of* the rails, not the rails.

## What has won prior x402 / agentic-payment hackathons

**Solana x402 (400+ submissions):**
- Intelligence Cubed (i³) — platform to use/buy/sell/invest in AI models, tokenized model ownership.
- PlaiPin — cheap ESP32 chips managing their own wallets; **IoT devices act as independent
  merchants** selling data / buying services. ← closest analog to our EV-as-machine-customer.
- x402 Shopify Commerce — Shopify stores accept native x402 orders from agents (Best MCP Server).
- Amiko — on-chain identity, behavior records, reputation management.
- MoneyMQ — message-queue architecture for scalable agent payment flows.
- Partner-track winners: Galaksio (USDC→compute/storage), ParallaxPay (AI agent marketplace),
  Polycaster (prediction-market analytics), x402Resolve (oracle-verified payment escrow).

**Ethereum Foundation x402 (Jan 2026):**
- Superfluid x402-sf — continuous streaming subscription payments. ← relevant: streamed energy.
- Cheddr — payment channels for micropayment streaming.
- x402r — refund handling for undelivered data services.

**EasyA × Consensus Miami (May 2026, ~1,000 devs):**
- Giggy (3rd) — marketplace to hire AI agents; payments locked in escrow while agents pay for
  premium APIs via x402.
- Chainlens — trust layer connecting agents to verified APIs, releasing payment only after
  responses are authenticated.

**Coinbase "Agents in Action":** decentralized payroll, protocol fee routers, pay-per-use
marketplaces, bots spinning up AI jobs on decentralized compute and settling usage on-chain.

### Recurring winning patterns
1. **Agent marketplaces** (hire agents, pay agents).
2. **Escrow / verified delivery** (solving "pay-and-pray").
3. **Machine customers** (IoT / compute buying for themselves). ← **our category**.
4. **Commerce bridges** (Shopify-for-agents).
5. **Prediction-market analytics.**

> Judges repeatedly reward solving **"pay-and-pray"** (trust + escrow) and showing **real
> settled on-chain transactions**.

## How energy sharing differentiates

- **Nobody has done energy / a real machine-customer utility on x402+Algorand** at these events.
  PlaiPin is the closest (IoT-as-merchant) but it's data, not energy, and not tied to a live law.
- **A real, current law (§42c EnWG)** as the wedge — timely, local to the German audience.
- **Streamed/metered micropayments** map naturally onto Algorand's cheap, instant settlement.
- **Tangible & legible**: "your EV buys your neighbor's solar while you sleep" beats abstract
  data-trading demos for memorability.

## Organizers' own wishlist this maps onto

From the official ideas doc, our project demonstrates several listed items at once:
- "A2A Agentic commerce — agents autonomously negotiate, transact, and settle payments."
- "A2A Data/marketplace — agents that buy, sell, and verify access in real time."
- "A2A Payments with built-in spend limits and programmable rules" (← ARC-58 spend cap moment).
- "A2A Lending Desk" / yield (← Folks Finance xALGO for idle earnings).

## Demo & pitch strategy (how these events are won)

> Hackathons are won by the **demo and the story**, not the codebase.

- **One-sentence narrative:** "Germany just legalized P2P energy sharing; we built the autonomous
  agent layer that makes it actually happen — your EV buys your neighbor's solar and pays
  per-kWh over x402 on Algorand, while you sleep."
- **Show real settlement constantly:** every payment must be a genuinely settled on-chain TX with
  a **clickable Lora explorer link** on screen. This is the credibility anchor.
- **Include one "serious" beat:** an **ARC-58 spend-policy** moment — a rogue/over-eager EV agent
  tries to exceed its nightly budget and gets **blocked on-chain**. Spectacle + security +
  Algorand-native in one shot.
- **Frame as a product, not a toy:** this is the settlement + trust layer for the coming
  P2P energy economy that §42c unlocks — with a clear mainnet milestone (matches the 50/50
  prize model).
- **Reserve the last 4–5 hours strictly for rehearsal + pitch deck.**

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Filed under "cute demo" | Lead with the law + product framing; show real on-chain TXs; add the ARC-58 security beat |
| Over-scoping (5 bonus tracks) | Organizers explicitly prefer focus. Ship core happy-path first; add **at most one** bonus integration |
| Payments don't settle live on stage | Pre-fund wallets; rehearse on TestNet; have a recorded fallback clip |
| Legal overclaiming | Reference §42c as motivation only; verify any specific claim against the official text |

## Recommended team split (5 people)

1. **World / frontend** — dashboard + transaction ticker with explorer links.
2. **Merchant / seller** — energy-selling x402 endpoint(s) + dynamic pricing (+ Bazaar reg if time).
3. **Agent brains** — buyer (EV) + seller LLM loops: perceive → discover → decide → pay via x402.
4. **Bonus economy** — EURQ payment asset, or Folks xALGO yield, or Alpha Arcade forward market
   (in that order of effort). Pick **one** first.
5. **Floater** — integration glue, the ARC-58 "rogue agent blocked" set piece, and the pitch.

**First milestone for everyone to rally around:** one EV agent buys one energy increment from one
seller with a **real settled TestNet transaction**. Everything else layers on that.
