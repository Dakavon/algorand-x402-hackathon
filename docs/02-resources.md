# Resources — Official Docs, SDKs, Templates, Tools

Curated from the organizers' Hackathon Resource Guide. Algorand's low fees + fast finality make
it ideal for micropayments, pay-per-API, and agentic commerce.

## 1. Start here — official documentation

### Algorand x402
- **x402 on Algorand — Developer Portal guide** (read this first; protocol + payment flow
  client → server → facilitator, getting started).
- x402 + Agentic Commerce on Algorand (overview).

### x402 protocol (underlying spec)
- x402 protocol repository — headers, payment payloads, facilitator role.
- x402 docs: networks & token support.

## 2. Template (fork this — working code, not a blank page)

- **x402 starter project template** — full working x402 payment flow on Algorand to fork and
  extend.

## 3. Demos & tools

- **x402 demo repo** — complete x402 payment flow you can clone. (`algorandfoundation/x402-demo`
  contains a TypeScript client, a basic facilitator, and a Hono server — the minimal x402 loop.)
- **VibeKit** — sets up an Algorand project with one command (AI skills + tools to build on
  Algorand).
- **GoPlausible facilitator** — hosted facilitator that verifies and settles x402 payments on
  Algorand.

## 4. SDKs & packages (x402 / AVM)

AVM implementation of the x402 payment protocol using the **Exact** payment scheme with **ASA**
(Algorand Standard Asset) transfers.

- **`@x402/avm`** npm package.
- TypeScript SDK packages & examples.
- GoPlausible ships SDKs in **TypeScript, Python, and Go**, with **Express / FastAPI / Hono**
  middleware and fee abstraction. (So a "basic x402 SDK / paywall middleware" is already done —
  build on top, don't rebuild it.)

## 5. AI agent skills (for Claude / coding agents)

- **Algorand DevRel agent skills (GitHub)** — give your AI assistant deep knowledge of Algorand
  smart contracts, x402 (TS + Python), frontends, and project setup, so it writes correct AVM
  code first try.
- AI resources — Algorand Dev Portal.

> ⚙️ **Action item:** install the Algorand agent skills before serious coding.

## 6. Development environment — AlgoKit

All-in-one Algorand toolkit: project scaffolding, LocalNet, typed clients, deployment.
**Recommended flow: build on LocalNet → then test on TestNet.**

- AlgoKit quick start.
- AlgoKit CLI reference.

## 7. TestNet essentials — explorer & faucets

You need test **ALGO** (for fees) and test **USDC** (the x402 payment token).

- **Lora** — Algorand TestNet explorer (use this for the demo's clickable proof links).
- **Lora TestNet faucet** (ALGO).
- **Circle faucet** (TestNet USDC).

## Bonus-track resources

### Quantoz (EURQ / EURD — regulated digital euro)
- Quantoz API / x402 hackathon guide: https://docs.ai.quantozpay.com/hackathon/guide/
- npm: `@ever_amsterdam/x402-euro-eurd` — https://www.npmjs.com/package/@ever_amsterdam/x402-euro-eurd

### Folks Finance (xALGO liquid staking)
- Intro video: https://www.youtube.com/watch?v=5ZiCiHiG0QA
- JS SDK: https://github.com/Folks-Finance/algorand-js-sdk
- Example (xALGO stake): https://github.com/Folks-Finance/algorand-js-sdk/blob/main/examples/xalgo/stake.ts
- Smart contracts: https://github.com/Folks-Finance/algo-liquid-staking-contracts
- Docs: https://docs.folks.finance/functionalities/xalgo-liquid-staking

### Alpha Arcade (on-chain prediction markets)
- How it works (video): https://www.alphaarcade.com/how-to-video
- Learn center / FAQ: https://www.alphaarcade.com/how-it-works
- SDK: https://github.com/phara23/alpha-sdk
- MCP: https://github.com/phara23/alpha-mcp
- LP rewards explainer: https://www.alphaarcade.com/rewards-getting-started
- LP rewards live: https://www.alphaarcade.com/rewards

### Featherless AI (LLM credits)
- Setup guide + $25 credits (1-month plan):
  https://docs.google.com/document/d/1AaRPLEOkMqKHxdj2YBFVXGkUacZEeWyUwQ5C98Il2XY/edit

## Organizer-suggested project patterns

The best x402 projects are products where forcing users to create an account, subscribe, or set
up billing would slow everything down — **pay once, get access, move on.**

- **Data products:** per-call crypto prices / weather / sports / flight status; IoT sensor
  readings; per-row research datasets; gated premium feeds.
- **AI services:** per-request LLM completions; pay-then-return image/video gen; embedding /
  classification APIs; pay-per-query RAG.
- **MCP servers & agent tools:** payment-gated MCP tools; premium context providers; agent
  endpoints where the agent pays instead of using OAuth/keys.
- **Access & digital goods:** content unlock; license keys / signed JWTs on demand; secrets vault
  releasing a decryption key after payment.
- **Infrastructure & automation:** pay-per-job compute; webhook relay; one-time API usage credits.
- **Consumer / creator:** tipping infra; digital item unlocks.

> Our energy-sharing idea is an **IoT / machine-customer** pattern: the EV is a machine customer
> paying per metered unit — pay-per-kWh instead of a utility subscription.
