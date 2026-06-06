# Legal Basis — §42c EnWG (German Energy Sharing)

> ⚠️ **VERIFY BEFORE QUOTING.** The summary below reflects our working understanding from the
> project framing. The authoritative text is the official source — fetch and confirm specifics
> (effective date, exact scope, who may share with whom, metering/billing duties) before putting
> any legal claim in the pitch.
>
> **Official source:** https://www.gesetze-im-internet.de/enwg_2005/__42c.html
> (§42c of the EnWG — Energiewirtschaftsgesetz / German Energy Industry Act.)

## Why this law is the foundation of the project

The project's entire premise is that **§42c EnWG enables households to sell surplus
(solar) electricity directly to neighbors** ("energy sharing"), in force around **June 2026**.
This legal change is what makes P2P, intermediary-free, agent-driven energy trading newly
*legal* — and therefore newly *buildable*. The freshness of the law (days old at hackathon time)
is a core part of the narrative.

## Working understanding (to confirm against the official text)

- Introduces a framework for **"Energy Sharing"** — sharing/selling self-generated (typically
  renewable, e.g. rooftop solar) electricity within a local community or to neighbors.
- Aims to let **prosumers** (households that both produce and consume) distribute surplus locally
  rather than only feeding back to the grid at a fixed tariff.
- Likely involves rules on: who qualifies as a participant, the local/geographic scope of
  sharing, metering and accounting of shared energy, and how settlement/billing is handled.

## What we DON'T claim (to stay honest)

- We are **not** building a legally compliant energy-trading platform.
- We **reference** §42c as the real-world enabler and motivation; the hackathon build is a
  **proof-of-concept** of the *agentic payment + settlement layer* that such trading would need.
- Any specific figures, eligibility rules, or obligations must be sourced from the official text
  — do not invent them.

## Pitch framing

"Germany just legalized neighbor-to-neighbor energy sharing under §42c EnWG. The law says you
*can* sell your surplus solar to your neighbor — but it says nothing about *how* the machines
that produce and consume that energy should discover each other, agree a price, and settle
instantly. That missing layer is what we built: autonomous agents trading energy and paying
per-kWh over x402 on Algorand."

## TODO

- [ ] Fetch the official §42c text and replace the "working understanding" with verified points.
- [ ] Note the precise in-force date and any transitional provisions.
- [ ] Capture any constraints that meaningfully shape the demo (e.g. local-community requirement).
