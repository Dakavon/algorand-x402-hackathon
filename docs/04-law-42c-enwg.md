# Legal Basis — §42c EnWG (German Energy Sharing)

> ✅ **Verified 2026-06-06** against the **verbatim** official statute text plus German/English legal
> explainers (sources at bottom).
>
> **Official text:** https://www.gesetze-im-internet.de/enwg_2005/__42c.html

## Title

**§42c EnWG — "Gemeinsame Nutzung elektrischer Energie aus Anlagen zur Erzeugung von Elektrizität
aus erneuerbaren Energien"** = *Joint use of electrical energy from renewable generation
facilities.*

## Can a household sell energy from its battery to neighbors? — YES, with conditions

This is the key question. The statute explicitly permits it:

- **Storage is in scope.** Absatz 1 Satz 1 names *"der Betreiber … einer Energiespeicheranlage, in
  der **ausschließlich aus erneuerbaren Energien** stammende Elektrizität zwischengespeichert
  wird"* — i.e. the operator of a **battery that stores only renewable electricity** may jointly use
  it with other final consumers. (Storage must also meet §19 Abs. 3b EEG.)
- **Per-kWh payment is explicitly allowed.** Absatz 3 Nr. 3 says the joint-use contract states
  *"ob eine **entgeltliche Gegenleistung** … an den Betreiber zu leisten ist sowie … deren **Höhe in
  Cent pro Kilowattstunde**."* So a payment to the operator **priced in ct/kWh** is exactly what
  the law anticipates — that is *our build's model*.
- **It runs as a supply relationship.** Absatz 1 Nr. 2: *"die Belieferung erfolgt durch den
  Betreiber … auf der Grundlage eines **Liefervertrages**"* (delivery via the public grid under a
  **supply contract**), plus Nr. 3: a separate **joint-use contract** (Vertrag zur gemeinsamen
  Nutzung).

➡️ So "selling surplus from your renewable-charged battery to neighbors, paid per kWh" is **within
§42c** — provided the conditions below hold. The important correction is that there *is* an explicit
per-kWh `entgeltliche Gegenleistung`; the limit is that this remains regulated energy sharing, not
an open spot market.

## The real constraints (what actually limits you)

1. **Renewable-only storage.** The battery must store **exclusively** renewable electricity
   (Absatz 1 Satz 1 + §19 Abs. 3b EEG). A battery that also charges from the grid/fossil does **not**
   qualify.
2. **Not predominantly commercial.** Absatz 1 Nr. 5: operating the facility *"dient weder überwiegend
   der gewerblichen noch überwiegend der selbständigen beruflichen Tätigkeit"* — you may be paid, but
   you **can't run it as your predominant commercial energy business**. This is citizen/prosumer
   energy, not a for-profit energy-trading operation.
3. **Same balancing area.** Absatz 4: from **1 June 2026** within one distribution operator's
   **Bilanzierungsgebiet**; from **1 June 2028** also a directly adjacent balancing area in the same
   control zone. Buyer and seller must share that grid area.
4. **Supplements, doesn't replace.** The shared energy is supplied alongside each participant's
   normal residual supply; they keep their main supplier for the rest (practical structure confirmed
   by legal explainers). It is **not** an open, anyone-to-anyone P2P spot market.
5. **15-minute interval metering** of both generated/stored and consumed electricity is mandatory
   (Zählerstandsgangmessung / viertelstündliche registrierende Leistungsmessung, §2 S.1 Nr.27 MsbG).
6. **Two mandatory contracts** (Absatz 1 Nr. 2–3): the **Liefervertrag** + the **joint-use contract**,
   the latter defining the **allocation key** and the **ct/kWh remuneration** (Absatz 3).

## Who may participate

- **Final consumers (Letztverbraucher)** as users: natural persons, micro-/SMEs, municipalities /
  public-law entities.
- **Operator:** a natural person / partnership / private-law entity whose members are all final
  consumers or public-law entities, subject to the non-commercial limit (Nr. 5 above).

## In-force dates

- **1 June 2026** — within a single distribution **Bilanzierungsgebiet**.
- **1 June 2028** — extended to a directly adjacent balancing area in the same control zone.

## Capacity limits (confirm exact applicability)

Secondary sources differ: the gesetze-im-internet extract referenced **30 kW** (single household) /
**100 kW** (multi-unit building) thresholds (Absatz 7), while one English explainer did not surface
them. Treat the **exact scope** of these limits as *to-confirm against the full Absatz 7 text*
before quoting in the pitch.

## How to frame the project (accurate AND strong)

The law explicitly contemplates a **ct/kWh `entgeltliche Gegenleistung`** to the battery/PV operator,
defined in the **joint-use contract**, with **15-min metering** — but says **nothing about how a
community computes, agrees, and settles** that payment. Today it's manual and clunky (idea.md's own
"Problem"). **That gap is our product.**

**Pitch wording:** "§42c lets households share — and be paid in cents per kWh — for renewable
electricity with neighbors in their grid area. It mandates a price and 15-minute metering but leaves
the *pricing, agreement, and settlement* manual. Our agents do exactly that: the producer prices
surplus dynamically, the consumer (EV) decides and **settles the per-kWh remuneration instantly via
x402 on Algorand**, metered per interval."

- ✅ Accurate to say: "paid per kWh," "energy sharing," "within your balancing area," "renewable-only."
- ⚠️ Avoid: "open P2P energy market," "replace your utility," "trade with anyone anywhere," or
  positioning the household as a commercial energy trader.

> Demo note: simplifying to a direct buyer↔seller flow is fine as the *vision*; just present it as
> automating §42c's remuneration, not as something beyond what §42c permits. The 15-min metering
> interval even maps onto our per-interval purchase model.

## Sources

- Official statute: [§42c EnWG (gesetze-im-internet.de)](https://www.gesetze-im-internet.de/enwg_2005/__42c.html)
- [Gleiss Lutz — Energy sharing under new §42c EnWG (EN)](https://www.gleisslutz.com/en/know-how/energy-sharing-joint-use-renewable-electricity-under-new-section-42c-energy-industry-act)
- [FfE — Energy Sharing under §42c EnWG: framework & next steps (EN)](https://www.ffe.de/en/publications/energy-sharing-under-%C2%A7-42c-enwg-a-legislative-milestone-framework-conditions-and-next-steps/)
- [GÖRG — Ausblick auf das ab 1. Juni 2026 geltende Energy Sharing (DE)](https://www.goerg.de/de/aktuelles/veroeffentlichungen/13-04-2026/bald-strom-mit-nachbarn-teilen-ein-ausblick-auf-das-ab-1-juni-2026-geltende-energy-sharing-gemaess-ss-42c-enwg-chancen-und-grenzen)
- [Baker Tilly — Energy Sharing: neuer Rechtsrahmen im EnWG (DE)](https://www.bakertilly.de/beitrag/energy-sharing-enwg-novelle-schafft-neuen-rechtlichen-rahmen)
- [Germanwatch — Energy Sharing nach §42c EnWG (DE)](https://www.germanwatch.org/de/93470)
