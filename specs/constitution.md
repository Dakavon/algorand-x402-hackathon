# Project Constitution

Status: working agreement for the current build.
Owner: B maintains this file; any team member may propose changes.

## Mission

Build the agentic settlement layer for regulated local renewable energy sharing: producer agents
price renewable surplus, consumer agents decide whether to buy, and x402 on Algorand settles the
per-kWh remuneration with auditable on-chain proof.

## Non-Negotiable Milestone

The first milestone is one consumer agent buying 1 kWh from one producer with a real settled x402
payment on Algorand TestNet, visible on Lora.

Everything else is secondary until this works in laptop mock mode and then in the Pi demo.

## Legal Truth

The project is grounded in Section 42c EnWG energy sharing. The statute allows paid ct/kWh
remuneration for shared renewable electricity, including renewable-only battery storage, under
conditions: same balancing area, renewable-only source/storage, not predominantly commercial,
15-minute metering, residual supplier remains, and required contracts.

We do not pitch this as an open energy spot market, a utility replacement, trading with anyone
anywhere, or a production-compliant energy platform.

## Demo Truth

The Raspberry Pi house is an emulator for solar output, battery state, EV plug state, and metered
consumption. The demo proves agentic decision-making, x402 payment, settlement, and state changes;
it does not deliver real grid energy.

## Product Hypothesis

If this grows beyond the hackathon, the product is not "crypto P2P electricity trading." It is
automation, metering, pricing, and settlement infrastructure for regulated local energy sharing
communities, municipal utilities, building operators, EV charging operators, and aggregators.

## Scope Rules

1. Owner: B. No feature may block the core x402 payment loop.
2. Owner: N. The Pi producer must run in mock mode so others are never blocked by hardware.
3. Owner: B. Every task recorded in project docs must have an explicit owner.
4. Owner: B. Any bonus-track work must be behind a safe fallback, with USDC/x402 as the default demo path.
5. Owner: S. UI polish must serve demo clarity: state, price, battery, and Lora proof are more important than visual density.
6. Owner: J. LLM behavior must make the agent explainable; it must not replace the deterministic buy/pay/charge loop.

## Decision Rules

1. Owner: B. B coordinates priorities, integration order, and tradeoffs.
2. Owner: N. N is the initial technical authority on x402 and the Pi/house emulator.
3. Owner: B and N. B pairs with N early enough to remove the x402 bus factor.
4. Owner: all. If two approaches both work, choose the smaller one with fewer new moving parts.
5. Owner: all. Disagreements are resolved by the critical path: payment proof first, everything else second.

## Security Rules

1. Owner: B. No mnemonics, private keys, faucet secrets, or `.env` files are committed.
2. Owner: N and B. TestNet accounts are funded early and verified on Lora before payment integration depends on them.
3. Owner: all. Any command or file change that affects secrets must be reviewed by B or N.

## Pitch Rules

1. Owner: B. Say: "paid per-kWh energy sharing under Section 42c constraints."
2. Owner: B. Avoid: "open P2P energy market," "replace your utility," "trade with anyone anywhere," and "fully compliant platform."
3. Owner: S. The live demo must show real settlement evidence through a Lora transaction link.
4. Owner: J. Agent explanations must cite observable state: price, budget, EV plugged, battery, offer availability, and payment status.

## Definition Of Done

The project is demo-ready when the team can run the full sequence three times in a row: producer
state changes, price changes, EV plugs in, consumer agent pays through x402, settlement appears on
Lora, producer battery decreases, dashboard updates, and the agent stops when budget or availability
conditions fail.
