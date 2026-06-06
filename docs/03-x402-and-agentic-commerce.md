# x402 & Agentic Commerce — Concepts

Background notes from the hackathon session "x402 on Algorand." Use this to build the right
mental model before wiring payments.

## Agentic commerce — why it matters

- **Machine-to-machine, API-driven, continuously optimizing** — versus human-initiated commerce
  (UI-driven, slow, expensive coordination).
- **Second-order effects:** long-tail markets become viable, the marginal cost of a decision
  trends to ~0, and capital allocates itself in real time.
- **Market framing:** McKinsey projects agentic commerce as a **$3–5T** opportunity reshaping the
  global economy by 2030.

## Crypto's role as the rail

- **Payment rail:** instant, cheap micro-transactions.
- **Programmable:** smart contracts, multi-party settlement, escrowed intents.
- **Transparency / trust:** on-chain agent identities, reputation, auditable history.
- **Traceability:** immutable transaction history.

## Emerging standards in the space

MCP, A2A, **x402**, AP2, ERC-8004, AGUI, A2UI, UCP.

## x402 — the standard

- Coinbase-proposed, internet-native payment standard built on **HTTP 402 "Payment Required"**.
- Enables micropayments at scale. Use cases: pay-per-API, on-demand compute, premium data/content.

### The flow

1. Agent requests a resource → server returns **402 Payment Required** with payment requirements.
2. Agent attaches an on-chain payment + signed transaction.
3. A **Facilitator** **verifies** the payment (and simulates on-chain).
4. Facilitator **settles** the transaction on the Algorand blockchain.
5. Server returns the content/data/result.

### Concrete walkthrough (the live demo at the session)

Paywalled resource at `x402.goplausible.xyz/protected` for **0.1 USDC**:
user requests → server returns `402` with requirements → user connects wallet (Pera), confirms →
sends payment TX → server calls Facilitator to **verify** (TX verified & simulated on-chain) →
OK → user receives content → facilitator **settles** the TX on Algorand.

### AVM specifics

The Algorand implementation uses the **Exact** payment scheme with **ASA** transfers (USDC is an
ASA). Atomic transaction groups + instant finality make escrowed intents natural on Algorand.

## Open challenges (organizers' own "but there's more…")

These are the explicit gaps judges care about:

- **Discovery** — finding agents with specific skills.
- **Trust** — who to trust in an agent-filled world.
- **Security** — do agents control their own spending accounts? preventing rogue behavior.
- **X-chain collaboration** — how x402 works cross-chain.
- **User experience** — the plumbing exists, seamless UX doesn't yet.

> The official x402 2026 roadmap also lists **e-commerce refunds & escrow**, **arbitrary token
> support**, and a **Facilitator Router** as open items. Building something on the roadmap is a
> cheat code with judges.

## Discovery Bazaar (Algorand Bazaar)

A registry / discovery interface for A2A agents, x402/AP2 merchants, resources, and facilitators.
Accessible via API, ABI, MCP, and A2A. Endpoints:

- `/discovery/agents` — on-chain agent registrar; query by bio/URL/skills/capabilities; verifiable
  identity.
- `/discovery/merchants` — agentic & non-agentic merchants + their resources/payment methods.
- `/discovery/resources` — fixed, dynamic, periodic, and conditional pricing.
- `/discovery/payment_methods` — assets/tokens, fee delegation, transaction-group blueprints.
- `/discovery/facilitators` — verify off/on-chain, settle on-chain, supported chains/methods.

> For our project, Bazaar could power **neighbor discovery** (each household = a registered
> merchant agent selling energy). Optional for MVP; impressive if time allows.

## Security approaches (ARCs)

### ARC-90 + instant top-ups
- Agent wallets stay **empty by default** → no fund-misuse risk from hallucinations.
- Agent pops a **QR code** for the exact required amount; user scans and tops up in one TX.
- Works user-present or not. Simplest DX.

### ARC-58 account abstraction
- Tackles unbound agent access to spending accounts via a **plug-in system** that constrains
  agents to **pre-approved transactions** within scope.
- **Flash rekeying** combines rekeying + atomic groups so the agent has fund access only for the
  duration of the approved transaction: `rekeyToPlugin → doSomething → verifyAuthBack`.

> Our "rogue agent tries to overspend → blocked on-chain" demo moment = an ARC-58 spend policy.
> Combines spectacle + security + Algorand-native tech in one memorable beat.

## Build-idea themes (top agentic-commerce use cases)

Shopping agents, bot-to-bot payments, autonomous subscriptions, micropayments, crypto rewards,
tokenized checkout. Theme: **speed-first agents with stablecoin wallets.**
