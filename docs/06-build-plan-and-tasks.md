# Build Plan & Tasks (from the team repo)

> **Source of truth:** the team repo `Dakavon/algorand-x402-hackathon` — this working dir is its
> `main` branch. Full detail at the repo root: `idea.md` and `plan.md`. This doc distills the
> **actionable tasks** and adapts the work split for our **team of 5** (the original plan was for 2).

---

## Concrete architecture (decided)

A physical, interactive demo across two machines on a wired Ethernet link.

| Component | Machine | Lang / framework | Port | Role |
|---|---|---|---|---|
| **Producer service** | Raspberry Pi 4 | Python / FastAPI | 8001 | Reads hardware, simulates battery, computes price, SQLite history |
| **x402 Server** | Laptop | TypeScript / Hono | 4021 | Polls Pi, wraps `/energy/buy` behind x402 paywall, verifies+settles, logs |
| **Consumer Agent** | Laptop | TypeScript | 4022 | Autonomous buyer: state machine, evaluates price vs budget, pays, tracks delivery |
| **Dashboard** | Laptop | Python / Streamlit | 8501 | Live gauges, charts, payment log with Lora links |

**Hardware:** Raspberry Pi 4 + breadboard. B50K potentiometer → MCP3008 ADC (SPI) → solar
output (0–5 kW). Jumper/switch → GPIO17 → "EV plug inserted" trigger. Laptop ↔ Pi over **wired
Ethernet** (no venue WiFi dependency); static IP or `raspberrypi.local` (mDNS).

**Mock fallback:** if `spidev`/GPIO imports fail, Producer uses sinusoidal solar + random EV
toggles — so the whole stack runs on a laptop with no hardware (critical for parallel dev).

### Data flow

```
Potentiometer/GPIO → Pi FastAPI (:8001) → Hono x402 server (:4021) → Consumer Agent (:4022)
                          │                        │                         │
                       SQLite                  JSONL log              x402 payment
                          │                        │                         ▼
                          └──────────► Streamlit Dashboard (:8501) ◄── Algorand Testnet
                                                                     (USDC settle via facilitator)
```

---

## Directory structure (target)

```
algorand/                      # the project root (team repo)
├── producer/                  # Pi — Python
│   ├── main.py                # FastAPI: GPIO, battery sim, pricing, SQLite
│   ├── requirements.txt       # fastapi, uvicorn, spidev, gpiozero, RPi.GPIO
│   └── .env.template          # ACCEL=60
├── server/                    # Laptop — TypeScript
│   ├── src/index.ts           # Hono app, custom x402 handler, Pi poller, JSONL
│   ├── .env.template          # SELLER_ADDRESS, FACILITATOR_URL, PI_URL
│   ├── package.json
│   └── tsconfig.json
├── consumer/
│   ├── agent/                 # Laptop — TypeScript
│   │   ├── src/index.ts       # x402 client, state machine, delivery tracking
│   │   ├── .env.template      # BUYER_MNEMONIC, SERVER_URL, BUDGET_USD
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── dashboard/             # Laptop — Python
│       ├── app.py             # Streamlit
│       └── requirements.txt   # streamlit, requests, plotly
├── idea.md
└── plan.md
```

---

## Key constants & setup

| Constant | Value |
|---|---|
| USDC ASA ID (Algorand Testnet) | `10458941` |
| USDC decimals | `6` |
| Algorand Testnet CAIP-2 | `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=` |
| Facilitator URL | `https://facilitator.goplausible.xyz` |
| ALGO faucet | https://lora.algokit.io/testnet/fund |
| USDC faucet | https://faucet.circle.com (select Algorand Testnet; ~20 USDC, 1 req / 2h) |
| Explorer | https://lora.algokit.io/testnet |

**Server packages:** `@x402/core @x402/avm @x402/hono hono @hono/node-server dotenv` (+ `-D typescript @types/node tsx`)
**Agent packages:** `@x402/core @x402/fetch @x402/avm dotenv hono @hono/node-server` (+ `-D typescript @types/node tsx`)

**.env files (never commit):**
- `server/.env`: `SELLER_ADDRESS`, `FACILITATOR_URL=https://facilitator.goplausible.xyz`, `PI_URL=http://raspberrypi.local:8001`
- `consumer/agent/.env`: `BUYER_MNEMONIC`, `SERVER_URL=http://localhost:4021`, `BUDGET_USD=5.00`
- `producer/.env`: `ACCEL=60`

---

## Energy & pricing model

| Parameter | Value |
|---|---|
| Battery capacity | 10 kWh |
| Self-consumption | 1 kW |
| Solar (potentiometer) | 0–5 kW |
| EV charge rate | 3 kW |
| Grid price (worst case) | $0.30/kWh |
| Price floor | $0.01/kWh |
| Time acceleration | env `ACCEL` (default 60) |

**Pricing:** `price = 0.30 - (battery_pct * 0.15) - (solar_kw * 0.02)`, floored at `0.01`.
Cheaper when surplus is high (full battery + strong sun). Worst case = grid price (no discount).

| Scenario | Solar | Battery | Price/kWh |
|---|---|---|---|
| Worst | 0 kW | 0% | $0.30 |
| Mid | 2 kW | 50% | $0.19 |
| Best | 5 kW | 100% | $0.05 |

**Battery sim (Pi, every 1s):** `battery += (solar_kw - 1) * (ACCEL/3600)`, clamped `[0,10]`.
No EV draw in the tick — purchases decrement battery instantly via `POST /consume` (avoids
double-counting). **No-offer guard:** `has_offer = battery > 0 OR solar >= 1`.

**Delivery (agent side):** after buying X kWh, `delivery_remaining -= 3 * (ACCEL/3600)` each tick;
when `<= 0`, agent may buy again.

**Demo timing @ ACCEL=60:** 1 kWh delivery ≈ 20s; 1 kWh recharge (5 kW sun) ≈ 15s; full drain
(no sun) ≈ 2.5 min; ~$0.19 USDC per mid-price buy; ~$1.14 for a ~6-buy, 2-min demo.

---

## Build phases (task checklist)

> Time estimates are from the 2-person plan. With 5 people, several phases overlap — see
> "Team of 5 adaptation" below.

### Phase 1 — Accounts & Testnet setup (~1h, together)
- [ ] Generate two keypairs (`algokey generate`): seller (producer) + buyer (consumer).
- [ ] Fund both with ≥ 0.5 testnet ALGO (https://lora.algokit.io/testnet/fund).
- [ ] Opt both into USDC: `algokit task opt-in --asset 10458941 --account <ADDR> --network testnet`.
- [ ] Fund both with ~20 testnet USDC (https://faucet.circle.com → Algorand Testnet). **Pre-fund early** (rate limit 1 req/2h).
- [ ] Verify balances on Lora; create the three `.env` files.
- **Done when:** both accounts show ALGO + USDC on Lora; `.env` files exist.

### Phase 2 — Producer service (Python/Pi, ~6h)
- [ ] FastAPI on :8001. Endpoints: `GET /status`, `GET /history?minutes=5`, `POST /consume {kwh}`.
- [ ] Hardware layer: MCP3008 ADC ch0 → 0–5 kW; GPIO17 → ev_plugged; moving average (5 reads).
- [ ] Mock fallback when `spidev` import fails (sinusoidal solar + random EV toggle).
- [ ] Battery sim background task (1s tick) + pricing formula + no-offer guard.
- [ ] SQLite `readings(ts, solar_kw, battery_kwh, price, ev_plugged)`, insert each tick.
- [ ] `POST /consume`: validate `kwh <= battery`, decrement, return new state; **409 if insufficient**.
- **Done when:** `/status` live values, `/history` rows, `/consume` decrements/rejects, mock mode works on laptop.

### Phase 3 — Hono x402 server (TS/laptop, ~5h) — can dev against mock Pi
- [ ] Hono on :4021. Background poller fetches Pi `/status` every 2s (caches last-known).
- [ ] `GET /status` (free, cached). `GET /energy/buy?kwh=X` behind **custom x402 handler** (not middleware).
- [ ] Buy handler: parse kwh (default 1, max = battery); `total = kwh * price_per_kwh`.
- [ ] No `X-PAYMENT` → return **402** with requirements (`scheme: exact`, network CAIP-2, `payTo: SELLER_ADDRESS`, `extra.asset: 10458941`).
- [ ] With `X-PAYMENT` → `verifyPayment()` then `settlePayment()` → on success `POST` Pi `/consume {kwh}`.
- [ ] Handle Pi 409 (refund/error). Append to `payments.jsonl`. Return 200 `{granted_kwh, price_paid, tx_id, timestamp, new_battery_kwh}`.
- **Done when:** `/status` cached data; `/energy/buy` returns 402 then settles+consumes+logs on valid payment.

### Phase 4 — Consumer agent (TS/laptop, ~5h) — needs Phase 3
- [ ] x402 client: `toClientAvmSigner(mnemonicToSecretKey(BUYER_MNEMONIC))` → `x402Client().register(CAIP2, ExactAvmScheme)` → `wrapFetchWithPayment`.
- [ ] State machine: `IDLE → EVALUATING → PAYING → CHARGING → IDLE`.
- [ ] Poll server `/status` every 2s; buy when `ev_plugged && has_offer && price <= budget` via `fetchPay(/energy/buy?kwh=1)`.
- [ ] Delivery countdown (3 kW rate); re-buy when delivery completes; stop when unplugged / over budget.
- [ ] Budget tracking (`budget_remaining -= price_paid`); events array (max 100).
- [ ] State server (Hono :4022): `GET /state`, `GET /events`.
- **Done when:** agent autonomously buys, transitions correctly, re-buys after delivery, enforces budget; `/state` + `/events` correct; tx visible on Lora.

### Phase 5 — Streamlit dashboard (Python/laptop, ~4h) — needs 2/3/4
- [ ] Auto-refresh (~2s). Gauges (`st.metric`) for solar/battery/price from Hono `/status`.
- [ ] Plotly time-series (solar, battery sawtooth, price + budget line) from Pi `/history`.
- [ ] Agent state badge from `/state`; EV flow indicator (3 kW when delivering).
- [ ] Payment log (`st.dataframe`) from `/events` with **clickable Lora explorer links**.
- **Done when:** gauges track potentiometer; charts show sawtooth; payments show with Lora links; state badge correct.

### Phase 6 — Integration & demo polish (~4h, together)
- [ ] Network: static IPs / verify `raspberrypi.local` over Ethernet.
- [ ] Start scripts (Pi `start.sh`; laptop `start.sh` launching server + agent + dashboard).
- [ ] End-to-end dry run: low pot → high price → no buy; high pot → price drops; plug EV → pay → CHARGING → battery drops, EV flow 3 kW, payment in log; delivery completes → re-buy; verify 2 tx on Lora; raise price above budget → agent stops; unplug → IDLE.
- [ ] Error handling: Pi unreachable → cached status; 409 → agent waits; budget exhausted → stop; facilitator timeout → retry next cycle.
- [ ] Demo script: 30s elevator pitch + 2-min walkthrough + **backup screen recording**.
- **Done when:** full sequence runs **3× without failure**, each run shows **2+ on-chain payments on Lora**, errors handled, script rehearsed.

---

## Risks & mitigations (from plan)

| Risk | Mitigation |
|---|---|
| Facilitator down during demo | Test 1h before; backup video |
| `@x402/avm` SDK breaks | Pin exact version |
| Pi unreachable (network) | Static IPs; Hono caches last-known state |
| Noisy ADC → flickering price | Moving average (5 samples) |
| Circle faucet rate limit (20 USDC/2h) | Pre-fund the day before |
| Price drift between 402 and settlement | Accept payment ≥ the 402'd price |

---

## Team of 5 adaptation

The repo's split is 2 people (**Person A = Pi/Python**, **Person B = Laptop/TS+dashboard**).
That's the critical path — keep those two owners. The extra **3 people** should run in parallel
**without blocking the core happy path**:

- **Person C — Bonus track #1 (EURQ):** swap/extend payment asset to **Quantoz EURQ** (German
  digital-euro narrative; Quantoz bonus). Use `@ever_amsterdam/x402-euro-eurd`. Build behind a
  config flag so USDC stays the safe default for the live demo.
- **Person D — "Serious" feature + pitch:** the **ARC-58 spend-policy** beat ("rogue agent tries
  to exceed nightly budget → blocked on-chain"), plus owns the **pitch deck + demo script +
  §42c law framing**. This is what lifts the project from "cute" to "fundable."
- **Person E — Reliability + secondary bonus:** owns the **end-to-end dry-run harness, backup
  recording, and network/process scripts** (de-risks the live demo), then opportunistically adds
  **Folks Finance xALGO** (seller parks earnings to earn yield) *or* **Alpha Arcade** (anonymized
  solar telemetry → forward/prediction market) — only if the core is rock-solid.

> Organizers explicitly reward **focus over prize-stacking**. Ship the core happy path first;
> add **at most one** bonus integration to the live demo. Others can be "shown but not central."

### First milestone everyone rallies around
**One Consumer Agent buys 1 kWh from the Producer with a real settled USDC transaction on
Algorand Testnet, visible on Lora.** Achievable on laptops in mock mode (no Pi) — get this green
before hardware, dashboard, or bonus work expands.
