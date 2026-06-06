# Legal Basis — §42c EnWG (German Energy Sharing)

> ✅ **Verified 2026-06-06** against the official statute text plus German/English legal explainers
> (sources at bottom). Supersedes the earlier unverified draft.
>
> **Official text:** https://www.gesetze-im-internet.de/enwg_2005/__42c.html

## Title

**§42c EnWG — "Gemeinsame Nutzung elektrischer Energie aus Anlagen zur Erzeugung von Elektrizität
aus erneuerbaren Energien"** = *Joint use of electrical energy from renewable generation
facilities.* Added to the EnWG (Energiewirtschaftsgesetz) by the 2026 reform.

## ⚠️ The single most important nuance (read this)

**§42c is "joint use / sharing" (gemeinsame Nutzung), NOT a free peer-to-peer electricity sale
market.** Precisely:

- Shared renewable electricity **supplements** each participant's existing residual supply
  (Reststrom); **participants keep their existing energy supplier** — sharing does not replace it.
- It is a regulated community arrangement with **two mandatory contracts** and **15-minute interval
  metering**, not an ad-hoc spot trade.
- So the team's one-liner — *"households sell surplus solar directly to neighbors"* — is a
  **simplification**. There *is* a payment dimension (the joint-use contract must define
  remuneration/Entgelt + an allocation key), but it is not an open P2P market price.

➡️ See **"How to frame the project honestly"** below — this is fixable and our build still maps on.

## Verified facts

### In-force dates (phased)
- **1 June 2026** — energy sharing within a **single distribution system operator's balancing area**
  (Bilanzierungsgebiet).
- **1 June 2028** — extended to **adjacent balancing areas within the same control zone** (Regelzone).

### Who may participate
- **Final consumers (Letztverbraucher)** as facility *users*: natural persons, micro-/small &
  medium enterprises (SMEs per EU def.), municipalities / public-law entities.
- **Facility operator:** a natural person, partnership, or private-law entity whose members are all
  final consumers or public-law entities; operation must **not predominantly serve a commercial
  activity**.

### Spatial scope — Bilanzierungsgebiet (balancing area)
All participating units (generation + consumption points) must sit in the **same balancing area**
of one distribution network operator. A Bilanzierungsgebiet is normally the grid area of a
distribution network operator, assigned a unique ID by the responsible transmission operator.
(From 2028: adjacent balancing areas in the same control zone.) Use of the public grid is allowed.

### Generation source
**Renewable only.** Storage facilities qualify only if charged **exclusively** with renewable
electricity. Fossil generation is excluded.

### Contractual structure (two separate contracts — mandatory)
1. **Supply contract** (Energieliefervertrag) — facility operator → final consumer.
2. **Joint-use contract** (Vertrag über die gemeinsame Nutzung) — must define: **allocation of the
   generated quantities, assignment to each participant, and remuneration/Entgelt structure.**

### Metering
Both the **generated/stored** electricity and the **consumed** electricity at each supply point must
be measured by **interval metering at 15-minute resolution** (Zählerstandsgangmessung /
viertelstündliche registrierende Leistungsmessung, per §2 S.1 Nr.27 Messstellenbetriebsgesetz).

### Capacity limits (confirm exact applicability)
The statute (Absatz 7) appears to reference thresholds of **30 kW** (single-household operator) and
**100 kW** (multi-unit building). One English explainer did not surface these, so treat the *exact
scope* of these limits as **to-confirm against the full Absatz 7 text** before quoting in the pitch.

## How to frame the project honestly (for judges who know the law)

Our agentic layer maps onto §42c **without overclaiming**, if framed as the **automation +
settlement layer for the joint-use contract's remuneration**:

- §42c *requires* a joint-use contract with an **allocation key** and a **remuneration (Entgelt)**
  arrangement, plus **15-min metering** — but says nothing about *how* communities compute, agree,
  and settle that remuneration. Today that's manual/clunky (idea.md's own "Problem" section).
- **Our agents automate exactly that gap:** the producer agent prices surplus dynamically per the
  community's allocation logic; the consumer agent decides and **settles the remuneration instantly
  via x402 on Algorand**, per metered interval. That is squarely within §42c's framework.

**Safer pitch wording:** "§42c legalized neighbor-to-neighbor energy sharing — but the law leaves
the *settlement and automation* of the shared-energy remuneration unsolved. We built the agentic
layer that prices, meters, and settles it instantly on-chain." (Avoid "free P2P energy market" /
"replace your utility" — both are inaccurate under §42c.)

> For the hackathon demo it is fine to **simplify to a direct buyer↔seller flow** as a *vision of
> where this goes* — just don't assert it's literally what §42c permits today. The 15-min metering
> interval even lines up nicely with our per-interval purchase model.

## Sources

- Official statute: [§42c EnWG (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/enwg_2005/__42c.html)
- [Gleiss Lutz — Energy sharing under new §42c EnWG (EN)](https://www.gleisslutz.com/en/know-how/energy-sharing-joint-use-renewable-electricity-under-new-section-42c-energy-industry-act)
- [FfE — Energy Sharing under §42c EnWG: framework & next steps (EN)](https://www.ffe.de/en/publications/energy-sharing-under-%C2%A7-42c-enwg-a-legislative-milestone-framework-conditions-and-next-steps/)
- [GÖRG — Ausblick auf das ab 1. Juni 2026 geltende Energy Sharing (DE)](https://www.goerg.de/de/aktuelles/veroeffentlichungen/13-04-2026/bald-strom-mit-nachbarn-teilen-ein-ausblick-auf-das-ab-1-juni-2026-geltende-energy-sharing-gemaess-ss-42c-enwg-chancen-und-grenzen)
- [Baker Tilly — Energy Sharing: neuer Rechtsrahmen im EnWG (DE)](https://www.bakertilly.de/beitrag/energy-sharing-enwg-novelle-schafft-neuen-rechtlichen-rahmen)
- [Germanwatch — Energy Sharing nach §42c EnWG (DE)](https://www.germanwatch.org/de/93470)
