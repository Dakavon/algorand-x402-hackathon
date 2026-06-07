# P2P Agentic Energy Sharing — Project Dossier ⚡️🤖

> **The complete record of what we built** for the **Algorand Builders Berlin — Agentic Commerce x402 Hackathon** (42 Berlin, 6–7 June 2026).
> Source of truth for the **pitch, presentation deck, and demo video**.

---

## 1. One-liner & elevator pitch

> **Your EV autonomously buys cheap surplus solar from your neighbour, pays per-kWh via x402 on Algorand — settling a real, MiCA-regulated digital euro (Quantoz EURD) on mainnet — and charges while you sleep.**

Germany's new **§42c EnWG** energy-sharing law (in force **1 June 2026**) makes per-kWh neighbour energy sharing legal. We built the **autonomous agent + on-chain settlement layer** that makes it actually happen.

---

## 2. Executive summary

| | |
|---|---|
| **Category** | Agentic Commerce — machine customer (EV) buying a metered good (energy) |
| **Primary track** | Track 1 — Agentic Commerce ($11,000) |
| **Bonus track held** | Quantoz **EURD/EURQ** — real **mainnet EURD** micropayments |
| **Mandatory reqs** | ✅ x402 on Algorand · ✅ Agentic Commerce theme · ✅ New project (all code written during event) |
| **Proof** | Real on-chain settlements with clickable **Lora explorer** links; already on **MAINNET** |
| **Differentiator** | Nobody has done a real **machine-customer energy utility** on x402+Algorand, tied to a **live German law** |
| **Mainnet milestone** | Already live on mainnet → directly satisfies the prize pool's 50/50 milestone model |

**What works end-to-end today:** a customer plugs in → the buyer agent detects the charger, evaluates the price, and **autonomously pays per-kWh in real EURD on Algorand mainnet** in a continuous metered loop → the producer (Raspberry Pi) releases energy and lights its charging LED → a mobile app shows live telemetry, the agent's reasoning, savings vs. the grid, the wallet balance, and every settled transaction with a Lora link → the customer hits **Stop** and the Pi is notified the session is complete.

---

## 3. The problem & the legal wedge (§42c EnWG)

**Problem.** With §42c EnWG, households *can* be paid per kWh for sharing renewable surplus with neighbours in the same balancing area — but today it's human-driven and slow: no automated supply/demand matching, no dynamic pricing, billing too complex, solar surplus wasted.

**Legal accuracy (verified, see `docs/04-law-42c-enwg.md`).** §42c *does* allow per-kWh remuneration (`entgeltliche Gegenleistung … in Cent pro Kilowattstunde`, Abs. 3 Nr. 3) for renewable electricity, including from a battery storing only renewable energy. Real limits: same balancing area, renewable-only, operator not predominantly commercial, supplements (not replaces) the supplier, 15-min metering. **It is regulated *energy sharing*, not an open P2P market.** We pitch our agents as the **automation + on-chain settlement of §42c's per-kWh remuneration** — not a utility replacement.

---

## 4. What we built (the solution)

An **agent-driven, regulated local energy-sharing layer**:

- **Producer agent** (household with PV+battery) exposes an **x402-paywalled "buy energy" endpoint** and prices surplus dynamically.
- **Consumer agent** (the EV) discovers the offer, checks budget/price policy, and **pays per kWh via x402**, then tracks delivery.
- **Facilitator** (GoPlausible) verifies + settles each payment **on-chain**.
- **Mobile app** (the customer's phone) controls the session and shows live proof.

Real micropayments, instant finality, cheap fees — purpose-built for streamed/metered energy.

---

## 5. System architecture

```
┌──────────────┐   plug/solar    ┌──────────────┐   x402 402+pay   ┌──────────────┐   /charge/*   ┌──────────────┐
│  Producer    │  ────────────▶  │  Seller x402 │  ◀────────────▶  │ Consumer     │  ◀──────────  │  Mobile App  │
│  (Raspberry  │   GET /status   │  server      │   GET /energy/buy│ agent (buyer)│   GET /state  │ (volt-connect)│
│   Pi)        │   POST /consume │  (Hono)      │                  │  (Hono)      │   GET /events │   React      │
│  FastAPI     │  ◀────────────  │  :4021       │                  │  :4022       │   GET /wallet │   :8080      │
│  :8001       │ POST /charging- │              │                  │  signs x402  │  ──────────▶  │              │
└──────┬───────┘   complete      └──────┬───────┘                  └──────┬───────┘               └──────────────┘
       │ GPIO 17 = EV plugged            │ polls Pi + agent                 │ pays in EURD
       │ ADC (pot) = solar               │ paywall + control plane          │ on Algorand mainnet
       │ GPIO 27 = charging LED          │ JSONL payment ledger             ▼
       │ SQLite history                  │                          ┌──────────────┐
       └─────────────────────────────────┘                          │ GoPlausible  │
                                                                     │ facilitator  │ ──▶ Algorand (settles on-chain)
                                                                     └──────────────┘
```

**Boundary rule we enforced:** *money movement & autonomous decisions live in the backend (agent/server — they hold keys); the client only visualizes and configures. The client never signs.*

---

## 6. The four services (detailed)

### 6.1 Producer — Raspberry Pi (`producer/main.py`, Python/FastAPI, :8001)
Simulates a solar household with real hardware inputs; falls back to simulation on a laptop.
- **Hardware:** B50K potentiometer → MCP3008 ADC (SPI) = solar 0–5 kW; jumper → **GPIO 17** = "EV plugged"; **GPIO 27** = charging LED; SQLite history.
- **Battery/pricing sim** (time-accelerated, `ACCEL=60`): `price = max(0.01, 0.30 − battery%·0.15 − solar·0.02)`.
- **Endpoints:**
  - `GET /status` — `solar_kw, battery_kwh, battery_pct, price_per_kwh, ev_plugged, has_offer, available_kwh`
  - `GET /history?minutes=N` — time-series from SQLite
  - `POST /consume {kwh}` — decrement battery on purchase, light the charging LED for `CHARGING_LED_SECONDS` (default 5s, re-extended per buy); returns HTTP 409 if battery insufficient
  - **`POST /charging-complete {session_kwh, session_spent}`** *(added for the app)* — switches the charging LED off / closes the session (`end_session()`)
- **Demo config:** `EV_PLUGGED_DEFAULT=true EV_AUTO_TOGGLE=false` for a stable presentation. Battery sizing via `BATTERY_CAPACITY_KWH`/`BATTERY_INITIAL_KWH`; battery charges at `(solar_kw − 1.0)·ACCEL/3600`; SQLite keeps a 30-min rolling history at 1 Hz.

### 6.2 Seller x402 server (`server/src/index.ts`, TypeScript/Hono, :4021)
Holds only the seller's **public** address; wraps energy behind x402.
- **Paywalled:** `GET /energy/buy?kwh=N` → returns **HTTP 402** with price, settles via facilitator, then calls Pi `/consume`.
- **Free/read:** `GET /health`, `GET /api/health` (producer/x402/agent health + last-seen), `GET /status` (proxies the producer snapshot), `GET /api/snapshot` (adds totals: sold_kwh, spent, tx_count), `GET /api/history`, `GET /api/events` (merges server + agent events), `GET /api/payments`
- **`POST /report-payment`** — the buyer reports the **real settled tx id** → ledger + Lora links (server never fabricates a tx).
- **Control plane** (interactive demo): `POST /control/ev|buy|mode|config|stop|reset` (proxies to the agent).
- **Asset config:** USDC (`$X`) or a **custom ASA** (EURD/EURQ) via `PAYMENT_ASSET_ID/SYMBOL/DECIMALS`; mainnet/testnet via `PAYMENT_NETWORK`. **We run EURD by setting these in `server/.env`** (the code default is the network's USDC). Price is evaluated **per request** from live producer status; payments persist to `server/payments.jsonl`; polls Pi + agent every 2 s; CORS open for the separate-origin UI.

### 6.3 Consumer agent — the buyer (`consumer/agent/src/index.ts`, TypeScript/Hono, :4022)
The autonomous EV. **The only component that signs payments.**
- **State machine:** `IDLE → EVALUATING → PAYING → CHARGING → WAITING → ERROR`.
- **Signer:** supports **Pera 24-word HD (BIP-39)** *and* legacy 25-word mnemonics → `@x402/avm` signer (verified on mainnet). HD account/index selectable via `HD_ACCOUNT`/`HD_INDEX`. With no mnemonic it runs in **observer mode** (reads state, cannot pay).
- **Purchase modes:** `fixed` (one-time; never auto-buys — purchase only via `/buy-now` or by switching to metered) and **`metered`** (autonomous re-buy loop — the "continuous transactions").
- **Policy:** budget cap + max price/kWh; retries with backoff on node throttling (`BUY_RETRIES`). Delivery is simulated at 3 kW, time-accelerated by `ACCEL` (drives the CHARGING→IDLE transition between buys).
- **Endpoints:**
  - `GET /state` — full snapshot: `state, mode, charger_connected, solar_kw, battery_pct, price_per_kwh, available_kwh, delivery_remaining_kwh, budget_remaining, max_price_per_kwh, chunk_kwh, session_kwh, session_spent, last_tx_id, decision_reason`
  - `GET /health` — liveness + current state
  - **`GET /wallet`** *(added)* — read-only on-chain balance (EURD + ALGO) from algod; auto-detects decimals
  - `GET /events?limit=N` — live `STATE/DECISION/PAYMENT/ERROR` feed; PAYMENT carries real `tx_id` + `lora_url`
  - **`POST /charge/start {chunk_kwh, budget_usd, max_price_per_kwh}`** *(added)* — start the metered session, kick first buy
  - **`POST /charge/stop`** *(added)* — stop the loop, notify the Pi (`PI_URL/charging-complete`)
  - `POST /buy-now`, `/mode`, `/config`, `/pause`, `/reset`

### 6.4 Mobile app — `volt-connect` (`consumer/app/`, TanStack Start + React 19 + Tailwind, :8080)
The customer's phone app (generated in Lovable, then extended). Talks **only** to the agent (`VITE_AGENT_URL`, default `:4022`). Polls `/state` + `/events` every 2s, `/wallet` every 15s; a **4 s request timeout** triggers a **demo-mode fallback** (mainnet/EURD-flavoured mock data) when the agent is slow/offline. Fires a toast on each new on-chain payment.
- **Core flow:** Connect (charger detected) → configure (chunk/budget/max-price) → **Start charging** → live metered buys → **Stop** → session summary.
- **Tier-1 dashboard (added):**
  - **WalletCard** — EURD + ALGO balance, "≈ Y kWh" affordable (via `GET /wallet`)
  - **TelemetryTiles** — solar kW, battery %, available kWh, live price
  - **SavingsCard** — % cheaper vs ~€0.35 grid, € saved, kg CO₂ avoided (§42c framing)
  - **AgentReasoningFeed** — narrates the agent's `DECISION`/`STATE` events with a live "thinking" pulse (the autonomy story)
  - **PaymentsList** — every settled tx with a clickable **Lora** link
- **Design:** Uber-style — light, minimal, black bottom-CTA, energy-green accent, amounts shown in **€**.

---

## 7. End-to-end flow (what happens on stage)

1. Customer plugs in → Pi **GPIO 17** high → `/status.ev_plugged = true`.
2. Server polls Pi; agent polls server → `/state.charger_connected = true` → app shows **"Charger connected"**, Start enables.
3. Customer sets chunk (e.g. 0.2 kWh), budget, max price → taps **Start charging** → `POST /charge/start`.
4. Agent: `EVALUATING` (price ≤ cap, budget ok) → `PAYING` → requests `GET /energy/buy?kwh=…` → **HTTP 402** → signs + pays **EURD on Algorand mainnet** → facilitator settles.
5. Server calls Pi `/consume` (battery drops, LED pulses); agent reports the **real tx** via `/report-payment`.
6. App shows a new **PAYMENT** row + toast with a clickable **Lora mainnet** link; `session_kwh`/spent/CO₂/savings update live.
7. Delivery completes → agent **re-buys** the next chunk (metered loop) → multiple real on-chain txs.
8. Customer taps **Stop** → `POST /charge/stop` → agent pauses + **notifies Pi `/charging-complete`** → LED off → app shows session summary.

---

## 8. Real on-chain settlement (the credibility anchor)

- **Live network:** **Algorand MAINNET** (most teams stay on TestNet — we settle real value).
- **Asset:** **Quantoz EURD** — ASA `1221682136`, 2 decimals, MiCA-regulated euro. **`default-frozen` (Quantoz-controlled)** — our wallet had to be **whitelisted by Quantoz** to hold it, which is a *stronger* "real regulated money" signal, not a weaker one.
- **Agent wallet (public):** `HYHQP6GEYGBAGYJ4VOYBV7S6WGQC3TPBRVLIGWIU755N7RGQ6IOJCJ3QSA` (Pera 24-word HD). **Live balance: ≈9.996 ALGO + 1.00 EURD** (mainnet).
- **Facilitator:** `facilitator.goplausible.xyz`.
- **Algod:** `https://mainnet-api.4160.nodely.dev`.
- **Explorer:** every payment → `https://lora.algokit.io/mainnet/tx/<txid>`.
- **✅ Live MAINNET EURD proof:** e.g. tx `SDLASLD23VEVSLUV3G5WHJZBSMUWFWS3MGN2ZKIVEMINBWOC2XVQ` (round 61913203, 0.01 EURD) → [open on Lora](https://lora.algokit.io/mainnet/tx/SDLASLD23VEVSLUV3G5WHJZBSMUWFWS3MGN2ZKIVEMINBWOC2XVQ). The wallet has a series of these consecutive per-kWh EURD settlements.
- **Phase-0 proof (TestNet USDC, ASA `10458941`):** tx `NL2FAXW72GC2BBBCM3D2T5DAHDBN36IY3L6JLLJ66SJOATXXPH2A`.

---

## 9. Bonus tracks — verified status (on-chain checked)

| Bonus | Verified facts | Our status | Verdict |
|---|---|---|---|
| **Quantoz EURD/EURQ** ($900 EURQ) | EURD = ASA `1221682136` (2 dp) ✅ live; EURQ = ASA `2768422954` (6 dp), MiCA, not frozen | **EARNED** — real autonomous **mainnet EURD** micropayment stream; EURQ is a one-env-var swap (id known) but wallet holds 0 EURQ (needs opt-in + funding) | **Hold EURD; "EURQ-ready"** |
| **Folks Finance xALGO** ($1,000) | Folks V2 xALGO = ASA `2611138444` (`fxALGO`, 6 dp); mint via Folks liquid-staking contract | We have ALGO to stake but it's a real contract integration; tangential to core loop | **Deferred (risk)** |
| **Alpha Arcade** ($1,000) | First/3rd-largest prediction market on Algorand; has an `@alpha-arcade/mcp` for agents | No energy market exists; highest effort + weakest fit | **Roadmap only** |

> **The "buy tomorrow's solar today" prediction-market angle is a strong roadmap slide, not a final-hours build.**

---

## 10. Build timeline — what we did (from git)

**Main repo `Dakavon/algorand-x402-hackathon` (6–7 June 2026):**

- **Foundation & legal** — initial docs, **§42c verified** against official text + safe pitch framing, project constitution, pre-phase setup plan, agent-skills.
- **Phase 0 (payment rail)** — scaffolded setup scripts + x402 server + agent (x402 v2.11.0); `setup/send-algo.mjs` faucet workaround; **first live x402 USDC payment settled on TestNet** (`4f594b2`); transaction-flow explainer.
- **Integration** — FastAPI **producer** + real-time backend-agent integration; **React dashboard** from specs; RUN.md roles (server=seller, agent=buyer); competitive-landscape research.
- **Agent intelligence** — restore **real settlement tx ids** (Lora proof); mirror decisions/payments to terminal; `MOCK_EV_PLUGGED` laptop sim; **dashboard control plane** + configurable algod node (fixes 403 drops); **fixed vs metered** purchase modes.
- **Hardware** — **ADC** solar support + **RPi producer fixes** (battery/GPIO/LED).
- **Mainnet + EURD** — **Pera 24-word HD signer + mainnet EURD** custom-asset x402 route (`7875ae4`); repo-wide **EURD refactor** (USDC→EURD, unify pricing).
- **Client-app pipeline** — `feat: connect consumer mobile app to agent + Pi charging lifecycle` (`00f88a8`): `/charge/start`, `/charge/stop`, new `/state` fields, Pi `/charging-complete`.
- **Wallet** — `feat(agent): add GET /wallet` (`7eb88de`) — live mainnet balance for the UI.
- Branch `feat/consumer-app-charging-pipeline` pushed; local `main` kept in sync (origin/main reserved for PRs).

**UI repo `Jaseelkt007/volt-connect`:**
- Lovable-generated EV-charge app → published → `updates` → **`feat: Tier-1 dashboard — wallet, telemetry, savings/CO2, agent activity`** (`f226a5a`), EURD field alignment, € formatting.

---

## 11. Tech stack

- **Producer:** Python, FastAPI, spidev (MCP3008), RPi.GPIO, SQLite.
- **Server & agent:** TypeScript, Hono, `@x402/hono`, `@x402/avm`, `@x402/fetch`, `@x402/core`, `@algorandfoundation/algokit-utils` (Pera HD derivation), tsx.
- **App:** React 19, TanStack Start/Router, React Query, Tailwind v4, shadcn/Radix, Framer Motion, sonner; bun.
- **Rails:** x402 on Algorand, GoPlausible facilitator, Quantoz EURD (mainnet), USDC TestNet (`10458941`), Lora explorer, AlgoKit.

---

## 12. How to run (demo)

```bash
# 1. Producer (Pi sim) — stable for demo
cd producer && pip install -r requirements.txt
EV_PLUGGED_DEFAULT=true EV_AUTO_TOGGLE=false PORT=8001 python main.py

# 2. Seller x402 server  (server/.env: AVM_ADDRESS, FACILITATOR_URL, PAYMENT_NETWORK=mainnet, EURD asset)
cd server && pnpm install && pnpm dev          # :4021

# 3. Consumer agent / buyer  (consumer/agent/.env: AVM_MNEMONIC, ALGOD_URL, PI_URL, PAYMENT_NETWORK=mainnet)
cd consumer/agent && pnpm start                 # :4022

# 4. Mobile app
cd consumer/app && bun install && bun run dev    # :8080 (defaults to agent :4022)
```
> Cross-machine Pi: set `PI_URL=http://<pi-ip>:8001` in the agent `.env`. No `.env` needed for the app locally.

---

## 13. Demo script & talking points (3–4 min)

1. **Hook (10s):** *"Germany just legalised P2P energy sharing. We built the autonomous agent layer that makes it real — your EV buys your neighbour's solar and pays per-kWh on Algorand, while you sleep."*
2. **Plug in (the Pi):** flip the jumper → app flips to **"Charger connected."**
3. **Start charging:** set a small chunk → tap **Start** → watch the **agent reasoning feed** ("price ≤ cap → buying").
4. **The credibility beat:** a **PAYMENT** row appears → click the **Lora mainnet** link → *"that's a real, MiCA-regulated digital-euro settlement, on Algorand mainnet, right now."*
5. **The story beats:** **Savings vs grid** (97% cheaper) + **CO₂ avoided**; **Wallet** balance ticking down; multiple real txs streaming (metered loop).
6. **Spend policy (security):** show the agent **refuse to overspend** when budget/price cap is hit ("Budget exhausted").
7. **Stop:** tap **Stop** → Pi LED off (session complete).
8. **Close:** *"Already on mainnet, settling real EURD — and our mainnet milestone is done, not promised."* → roadmap (multi-neighbour discovery, ARC-58 on-chain spend policy, prediction markets for tomorrow's solar).

**Risk mitigations:** pre-funded wallet; rehearse 3× clean runs; keep a **backup screen-recording** in case mainnet hiccups live; demo-mode fallback in the app.

---

## 14. Roadmap (the mainnet 50/50 milestone & beyond)

- ✅ **Mainnet live** (milestone satisfied).
- Multi-neighbour **discovery** (Bazaar registry) + cheapest/greenest selection.
- **ARC-58** on-chain spend-policy: a rogue agent's overspend **blocked on-chain** (spectacle + security).
- **EURQ** upgrade (one env var; opt-in + fund).
- **Folks xALGO** idle-budget yield (treasury).
- **Alpha Arcade** forward market — *buy tomorrow's solar surplus today*.

---

## 15. Repository map

```
algorand-x402-hackathon/        (Dakavon — main repo)
├─ producer/        Raspberry Pi FastAPI service (:8001)        ← live producer
├─ server/          Seller x402 Hono server (:4021)             ← live seller
├─ consumer/agent/  Buyer agent — signs x402 (:4022)            ← live buyer
├─ consumer/app/    volt-connect mobile UI (:8080)  [own git, gitignored here] ← live client
├─ consumer/dashboard/  earlier React/Vite client UI  [reference]
├─ src/             earlier canonical layout (x402/, frontend/, raspberrypi/)  [reference]
├─ specs/           plan, design specs, constitution, client-app-demo-plan.md
└─ docs/            vision, rules, law, strategy, resources, THIS dossier
```

---

## 16. Quick reference (facts for the deck)

| Item | Value |
|---|---|
| Primary track | Track 1 — Agentic Commerce ($11,000) |
| Live network | Algorand **mainnet** |
| Payment asset | **Quantoz EURD** — ASA `1221682136` (2 dp, default-frozen) |
| Mainnet proof tx | `SDLASLD23VEVSLUV3G5WHJZBSMUWFWS3MGN2ZKIVEMINBWOC2XVQ` (0.01 EURD) |
| EURQ (ready) | ASA `2768422954` (6 dp) |
| Folks xALGO | ASA `2611138444` (`fxALGO`, 6 dp) |
| USDC TestNet | ASA `10458941` |
| Agent wallet | `HYHQ…JCJ3QSA` (Pera 24-word HD) · ≈9.996 ALGO + 1.00 EURD |
| Facilitator | `facilitator.goplausible.xyz` |
| Explorer | `lora.algokit.io/mainnet/tx/<txid>` |
| Ports | Pi `8001` · server `4021` · agent `4022` · app `8080` |
| Deadline | 13:00, 7 June 2026 |
