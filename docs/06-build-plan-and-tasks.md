# Build Plan & Tasks (from the team repo)

> **Implementation authority:** use `specs/*`, especially [../specs/plan.md](../specs/plan.md).
> This doc is a historical/task distillation for quick lookup.

---

## Concrete architecture (decided)

A physical, interactive demo across two machines on a wired Ethernet link.

| Component | Machine | Lang / framework | Port | Role |
|---|---|---|---|---|
| **Producer service** | Raspberry Pi 4 | Python / FastAPI | 8001 | Reads hardware, simulates battery, computes price, SQLite history |
| **x402 Server** | Laptop | TypeScript / Hono | 4021 | Polls Pi, wraps `/energy/buy` behind x402 paywall, verifies+settles, logs |
| **Consumer Agent** | Laptop | TypeScript | 4022 | Autonomous buyer: state machine, evaluates price vs budget, pays, tracks delivery |
| **Dashboard** | Laptop | React / Vite | 5173 | Live gauges, charts, payment log with Lora links |

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
                          └──────────► React Dashboard (:5173) ◄── Algorand Testnet
                                                                     (USDC settle via facilitator)
```

---

## Directory structure (target)

```
algorand/                      # the project root (team repo)
├── src/
│   ├── raspberrypi/           # Pi — Python/FastAPI producer
│   ├── x402/
│   │   ├── server/            # Laptop — TypeScript/Hono x402 resource server
│   │   └── client/            # Laptop — TypeScript x402 consumer agent
│   └── frontend/              # Laptop — React/Vite dashboard
├── specs/                     # implementation authority
│   ├── constitution.md
│   ├── plan.md
│   ├── backend-design-spec.md
│   ├── frontend-react-design-spec.md
│   └── system-design.md
├── docs/                      # lookup/reference; doc 07 is Phase 0 authority
└── idea.md
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
- `src/x402/server/.env`: `SELLER_ADDRESS`, `FACILITATOR_URL=https://facilitator.goplausible.xyz`, `PI_URL=http://raspberrypi.local:8001`
- `src/x402/client/.env`: `BUYER_MNEMONIC`, `SERVER_URL=http://localhost:4021`, `BUDGET_USD=5.00`
- `src/raspberrypi/.env`: `ACCEL=60`

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

> Time estimates are rough. Several phases can overlap once the payment rail is proven.

### Phase 1 — Accounts & Testnet setup (~1h, together)
- [ ] **Owner: B, support: N.** Generate two keypairs (`algokey generate`): seller (producer) + buyer (consumer).
- [ ] **Owner: B, support: N.** Fund both with ≥ 0.5 testnet ALGO (https://lora.algokit.io/testnet/fund).
- [ ] **Owner: B, support: N.** Opt both into USDC: `algokit task opt-in --asset 10458941 --account <ADDR> --network testnet`.
- [ ] **Owner: B, support: N.** Fund both with ~20 testnet USDC (https://faucet.circle.com → Algorand Testnet). **Pre-fund early** (rate limit 1 req/2h).
- [ ] **Owner: B, support: N.** Verify balances on Lora; create the three `.env` files.
- **Done when:** both accounts show ALGO + USDC on Lora; `.env` files exist.

### Phase 2 — Producer service (Python/Pi, ~6h)
- [ ] **Owner: N, support: B.** FastAPI on :8001. Endpoints: `GET /status`, `GET /history?minutes=5`, `POST /consume {kwh}`.
- [ ] **Owner: N.** Hardware layer: MCP3008 ADC ch0 → 0–5 kW; GPIO17 → ev_plugged; moving average (5 reads).
- [ ] **Owner: N, support: B.** Mock fallback when `spidev` import fails (sinusoidal solar + random EV toggle).
- [ ] **Owner: N.** Battery sim background task (1s tick) + pricing formula + no-offer guard.
- [ ] **Owner: N.** SQLite `readings(ts, solar_kw, battery_kwh, price, ev_plugged)`, insert each tick.
- [ ] **Owner: N, support: B.** `POST /consume`: validate `kwh <= battery`, decrement, return new state; **409 if insufficient**.
- **Done when:** `/status` live values, `/history` rows, `/consume` decrements/rejects, mock mode works on laptop.

### Phase 3 — Hono x402 server (TS/laptop, ~5h) — can dev against mock Pi
- [ ] **Owner: N, support: B.** Hono on :4021. Background poller fetches Pi `/status` every 2s (caches last-known).
- [ ] **Owner: N, support: B.** `GET /status` (free, cached). `GET /energy/buy?kwh=X` behind x402. Phase 0 uses the official demo/payment-middleware path first; dynamic pricing follows after one settled payment works.
- [ ] **Owner: N, support: B.** Buy handler: parse kwh (default 1, max = battery); `total = kwh * price_per_kwh`.
- [ ] **Owner: N, support: B.** No `X-PAYMENT` → return **402** with requirements (`scheme: exact`, network CAIP-2, `payTo: SELLER_ADDRESS`, `extra.asset: 10458941`).
- [ ] **Owner: N, support: B.** With `X-PAYMENT` → verify and settle through the chosen x402 SDK/facilitator path → on success `POST` Pi `/consume {kwh}`.
- [ ] **Owner: N, support: B.** Handle Pi 409 (refund/error). Append to `payments.jsonl`. Return 200 `{granted_kwh, price_paid, tx_id, timestamp, new_battery_kwh}`.
- **Done when:** `/status` cached data; `/energy/buy` returns 402 then settles+consumes+logs on valid payment.

### Phase 4 — Consumer agent (TS/laptop, ~5h) — needs Phase 3
- [ ] **Owner: J, support: B.** x402 client: `toClientAvmSigner(mnemonicToSecretKey(BUYER_MNEMONIC))` → `x402Client().register(CAIP2, ExactAvmScheme)` → `wrapFetchWithPayment`.
- [ ] **Owner: J, support: B.** State machine: `IDLE → EVALUATING → PAYING → CHARGING → IDLE`.
- [ ] **Owner: J, support: B.** Poll server `/status` every 2s; buy when `ev_plugged && has_offer && price <= budget` via `fetchPay(/energy/buy?kwh=1)`.
- [ ] **Owner: J.** Delivery countdown (3 kW rate); re-buy when delivery completes; stop when unplugged / over budget.
- [ ] **Owner: J.** Budget tracking (`budget_remaining -= price_paid`); events array (max 100).
- [ ] **Owner: J, support: B.** State server (Hono :4022): `GET /state`, `GET /events`.
- **Done when:** agent autonomously buys, transitions correctly, re-buys after delivery, enforces budget; `/state` + `/events` correct; tx visible on Lora.

### Phase 5 — React dashboard (laptop, ~4h) — needs 2/3/4
- [ ] **Owner: S, support: B.** React/Vite dashboard on :5173 with auto-refresh (~2s) against Hono `/api/*` endpoints.
- [ ] **Owner: S, support: B.** Build against mocked JSON first; confirm contracts in [../specs/backend-design-spec.md](../specs/backend-design-spec.md) and [../specs/frontend-react-design-spec.md](../specs/frontend-react-design-spec.md).
- [ ] **Owner: S, support: N.** Time-series charts for solar, battery sawtooth, and price from `/api/history`.
- [ ] **Owner: S, support: J.** Agent state, decision reason, delivery countdown, and EV flow indicator from `/api/snapshot` and `/api/events`.
- [ ] **Owner: S, support: B.** Payment ledger with settled USDC tx IDs and **clickable Lora explorer links**.
- **Done when:** gauges track potentiometer; charts show sawtooth; payments show with Lora links; state badge correct; stale/offline backend states are visible.

### Phase 6 — Integration & demo polish (~4h, together)
- [ ] **Owner: B, support: N.** Network: static IPs / verify `raspberrypi.local` over Ethernet.
- [ ] **Owner: B, support: all.** Start scripts (Pi `start.sh`; laptop `start.sh` launching server + agent + dashboard).
- [ ] **Owner: B, support: all.** End-to-end dry run: low pot → high price → no buy; high pot → price drops; plug EV → pay → CHARGING → battery drops, EV flow 3 kW, payment in log; delivery completes → re-buy; verify 2 tx on Lora; raise price above budget → agent stops; unplug → IDLE.
- [ ] **Owner: B, support: N and J.** Error handling: Pi unreachable → cached status; 409 → agent waits; budget exhausted → stop; facilitator timeout → retry next cycle.
- [ ] **Owner: B, support: S and J.** Demo script: 30s elevator pitch + 2-min walkthrough + **backup screen recording**.
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

## Workstream adaptation

Keep the core critical path narrow and use the operating model in
[team-operating-model.md](team-operating-model.md) for current ownership.

| Area | Owner | Support | Notes |
|---|---|---|---|
| Pi/house emulator | N | B | N owns Raspberry Pi, FastAPI producer, hardware/mock state, pricing, and `/consume`. |
| x402 payment loop | N | B | N leads, B pairs early to reduce the x402 bus factor. |
| Consumer agent | J | B | J owns explainable agent behavior; deterministic state machine remains the critical path. |
| Dashboard/demo UX | S | B | S owns visual clarity, payment log, and Lora proof; blockchain details are abstracted behind APIs. |
| Coordination/integration | B | All | B owns task ownership, env readiness, integration order, dry runs, and tradeoffs. |
| Market/legal research | J | B | J researches prior solutions and risks; B filters claims for product/pitch use. |

> Organizers explicitly reward **focus over prize-stacking**. Ship the core happy path first;
> add **at most one** bonus integration to the live demo. Others can be "shown but not central."

### First milestone everyone rallies around
**One Consumer Agent buys 1 kWh from the Producer with a real settled USDC transaction on
Algorand Testnet, visible on Lora.** Achievable on laptops in mock mode (no Pi) — get this green
before hardware, dashboard, or bonus work expands.
