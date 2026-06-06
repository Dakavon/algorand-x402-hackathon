# Build Plan — Agentic Energy Sharing Marketplace

> 36 hours, 2 people, live in-person demo, Algorand/x402 prize track

## Architecture

```
Raspberry Pi 4 (Python only :8001)       Laptop
┌────────────────────────────────┐      ┌──────────────────────────────────────┐
│  FastAPI                       │      │  Hono Producer :4021 (TypeScript)    │
│  ├─ MCP3008 ADC → solar_kw    │      │  ├─ polls Pi /status every 2s        │
│  ├─ GPIO pin → ev_plugged     │      │  ├─ GET /status (free, cached)       │
│  ├─ Battery simulation        │      │  ├─ GET /energy/buy?kwh=X (x402)     │
│  │   solar charges, 1kW drain │      │  │   custom handler (verify/settle)   │
│  ├─ Pricing formula           │      │  ├─ POST to Pi /consume on payment   │
│  ├─ Time acceleration (ACCEL) │      │  ├─ JSONL payment log                │
│  ├─ SQLite time-series        │      │  └─ facilitator: goplausible.xyz     │
│  ├─ GET /status               │ ETH  │                                      │
│  │   {solar_kw, battery_kwh,  │◄────►│  Consumer Agent :4022 (TypeScript)   │
│  │    battery_pct, price,     │      │  ├─ polls Hono /status every 2s      │
│  │    ev_plugged, has_offer}  │      │  ├─ state machine (IDLE→EVAL→PAY→    │
│  ├─ GET /history              │      │  │   CHARGING→IDLE)                   │
│  │   (SQLite time-series)     │      │  ├─ variable kWh per buy request     │
│  └─ POST /consume { kwh }     │      │  ├─ delivery tracking (3 kW rate)    │
│      (decrements battery)     │      │  └─ GET /state, GET /events          │
│                               │      │                                      │
│  Mock fallback if no SPI/GPIO │      │  Streamlit Dashboard :8501 (Python)  │
│                               │      │  ├─ Hono /status → gauges + price    │
│                               │      │  ├─ Pi /history → time-series charts │
│                               │      │  ├─ Agent /state → state badge       │
│                               │      │  └─ Agent /events → payment log      │
└────────────────────────────────┘      └──────────────────────────────────────┘
```

## Directory Structure

```
algorand/
├── producer/
│   ├── main.py                # FastAPI app (GPIO, battery sim, pricing, SQLite)
│   ├── requirements.txt       # fastapi, uvicorn, spidev, gpiozero, RPi.GPIO
│   └── .env.template          # ACCEL=60
│
├── server/
│   ├── src/
│   │   └── index.ts           # Hono app, x402 custom handler, Pi poller, JSONL
│   ├── .env.template          # SELLER_ADDRESS, FACILITATOR_URL, PI_URL
│   ├── package.json
│   └── tsconfig.json
│
├── consumer/
│   ├── agent/
│   │   ├── src/
│   │   │   └── index.ts      # x402 client, state machine, delivery tracking
│   │   ├── .env.template     # BUYER_MNEMONIC, SERVER_URL, BUDGET_USD
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── dashboard/
│       ├── app.py             # Streamlit app
│       └── requirements.txt   # streamlit, requests, plotly
│
├── idea.md
└── plan.md
```

## Energy Model

### Constants (rounded values)

| Parameter | Value |
|-----------|-------|
| Battery capacity | 10 kWh |
| Self-consumption | 1 kW |
| Solar (potentiometer) | 0–5 kW |
| EV charge rate | 3 kW |
| Grid price (worst case) | $0.30/kWh |
| Price floor | $0.01/kWh |
| Acceleration | env `ACCEL` (default 60) |

### Pricing Formula

```
price = 0.30 - (battery_pct * 0.15) - (solar_kw * 0.02)
price = max(price, 0.01)
```

| Scenario | Solar | Battery | Price/kWh |
|----------|-------|---------|-----------|
| Worst | 0 kW | 0% | $0.30 |
| Mid | 2 kW | 50% | $0.19 |
| Best | 5 kW | 100% | $0.05 |

### Battery Simulation (runs on Pi, every 1s)

```python
net_flow = solar_kw - 1  # solar minus self-consumption (1 kW)
battery += net_flow * (ACCEL / 3600)
battery = clamp(battery, 0, 10)
```

No EV draw in the tick — purchases account for that via instant decrement.

### No-Offer Guard

If `battery == 0` AND `solar < 1 kW` → `has_offer = false`. Nothing to sell.

### Purchase Flow

1. Agent requests X kWh → Hono computes `total = X * price_per_kwh`
2. Hono returns 402 with total price
3. Agent signs + retries with X-PAYMENT
4. Facilitator verifies + settles on-chain
5. Hono calls Pi `POST /consume { kwh: X }` → Pi decrements battery
6. Hono logs to JSONL, returns 200

### Delivery Tracking (Agent side)

After purchase: `delivery_remaining = X kWh`
Every 1s: `delivery_remaining -= 3 * (ACCEL / 3600)`
When `delivery_remaining <= 0`: agent can buy again

### Demo Timing at ACCEL=60

| Event | Duration |
|-------|----------|
| Delivery of 1 kWh at 3 kW | 20 real seconds |
| Battery recovery of 1 kWh (5 kW solar) | 15 real seconds |
| Full battery drain (0 solar) | ~2.5 minutes |
| USDC per payment (mid-price, 1 kWh) | ~$0.19 |
| Total USDC for 2-min demo (~6 buys) | ~$1.14 |

## Key Constants

| Constant | Value |
|----------|-------|
| USDC ASA ID (Algorand Testnet) | `10458941` |
| USDC decimals | 6 |
| Algorand Testnet CAIP-2 | `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=` |
| Facilitator URL | `https://facilitator.goplausible.xyz` |
| ALGO faucet | https://lora.algokit.io/testnet/fund |
| USDC faucet | https://faucet.circle.com (select Algorand Testnet) |
| Explorer | https://lora.algokit.io/testnet |

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Facilitator down during demo | Payments fail | Test 1h before; backup video |
| Alpha SDK breaks | Build fails | Pin exact version |
| Pi unreachable (network) | Hono returns stale/error | Static IPs; Hono caches last-known state |
| Noisy ADC readings | Flickering price | Moving average (5 samples) |
| Circle faucet rate limit (20 USDC/2h) | Run out during demo | Pre-fund day before |
| Price drift between 402 and settlement | Payment mismatch | Accept payment >= 402'd price |

## Work Split

```
Person A (Pi)                    Person B (Laptop)
────────────────                 ─────────────────────────
Phase 1 (together)               Phase 1 (together)
Phase 2: FastAPI + SQLite +      Phase 3: Hono server (mock Pi
  battery sim + pricing +          data until Pi ready) +
  /status + /history +             custom x402 handler +
  /consume + mock fallback         JSONL log + Pi poller
                                 Phase 4: Consumer agent +
                                   state machine + delivery +
                                   /state + /events
Phase 5: help with dashboard     Phase 5: Streamlit dashboard
Phase 6 (together)               Phase 6 (together)
```

---

## Phase 1 — Account & Testnet Setup

**Goal**: Two funded Algorand testnet accounts opted into USDC.
**Time**: ~1 hour (together)

### Steps

1. Generate two keypairs:
   ```
   algokey generate  # seller (producer)
   algokey generate  # buyer (consumer agent)
   ```

2. Fund both with testnet ALGO:
   - https://lora.algokit.io/testnet/fund
   - Need >= 0.5 ALGO each (min balance + fees + USDC opt-in)

3. Opt both into USDC (ASA `10458941`):
   ```
   algokit task opt-in --asset 10458941 --account <ADDRESS> --network testnet
   ```

4. Fund both with testnet USDC:
   - https://faucet.circle.com → Algorand Testnet
   - 20 USDC each (rate limit: 1 req / 2h per address)

5. Verify on https://lora.algokit.io/testnet

6. Create `.env` files (NOT committed):
   - `server/.env`:
     ```
     SELLER_ADDRESS=<seller_public_address>
     FACILITATOR_URL=https://facilitator.goplausible.xyz
     PI_URL=http://raspberrypi.local:8001
     ```
   - `consumer/agent/.env`:
     ```
     BUYER_MNEMONIC=<buyer_25_word_mnemonic>
     SERVER_URL=http://localhost:4021
     BUDGET_USD=5.00
     ```
   - `producer/.env`:
     ```
     ACCEL=60
     ```

### Done when
- Both accounts visible on Lora with ALGO + USDC
- `.env` files created

---

## Phase 2 — Producer Service (Python, Pi)

**Goal**: FastAPI service that reads hardware, simulates battery, computes price, persists to SQLite, and exposes HTTP endpoints.
**Time**: ~6 hours (Person A)
**Dependency**: None (runs standalone)

### Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/status` | free | `{ solar_kw, battery_kwh, battery_pct, price_per_kwh, ev_plugged, has_offer }` |
| GET | `/history?minutes=5` | free | `[{ ts, solar_kw, battery_kwh, price_per_kwh, ev_plugged }, ...]` |
| POST | `/consume` | free | `{ ok, battery_kwh }` — body: `{ "kwh": 1.0 }` |

### Implementation

1. `producer/requirements.txt`:
   ```
   fastapi
   uvicorn
   spidev
   gpiozero
   RPi.GPIO
   ```

2. `producer/main.py`:
   - FastAPI on port 8001
   - **Hardware layer**: MCP3008 ADC (SPI ch0) → 0-1023 → 0.0-5.0 kW. GPIO17 pulled high, GND = EV plugged. Moving average (last 5 reads).
   - **Mock fallback**: if `spidev` import fails, use sinusoidal solar + random EV toggles.
   - **Battery simulation** (background task, every 1s):
     ```python
     net = solar_kw - 1  # solar minus self-consumption
     battery += net * (ACCEL / 3600)
     battery = max(0, min(10, battery))
     ```
   - **Pricing**:
     ```python
     price = 0.30 - (battery_pct * 0.15) - (solar_kw * 0.02)
     price = max(price, 0.01)
     ```
   - **No-offer guard**: `has_offer = battery > 0 or solar >= 1`
   - **SQLite**: one table `readings(ts REAL, solar_kw REAL, battery_kwh REAL, price REAL, ev_plugged INT)`. Insert every 1s tick.
   - **POST /consume**: validate `kwh <= battery`, decrement, return new state. Return 409 if insufficient.

3. Test:
   - Pi: `uvicorn main:app --host 0.0.0.0 --port 8001`
   - Laptop: `curl http://raspberrypi.local:8001/status`
   - Turn pot → solar changes; plug jumper → ev_plugged flips

### Done when
- `/status` returns live sensor + computed price
- `/history` returns SQLite rows
- `/consume` decrements battery and rejects if insufficient
- Mock mode works on laptop for development

---

## Phase 3 — Hono x402 Server (TypeScript, Laptop)

**Goal**: x402-protected energy buy endpoint. Calls Pi for state, handles payment, calls Pi /consume on success.
**Time**: ~5 hours (Person B)
**Dependency**: Can develop against mock Pi data until Phase 2 is ready.

### Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/status` | free | Cached Pi status (2s fresh) |
| GET | `/energy/buy?kwh=1` | x402 | `{ granted_kwh, price_paid, tx_id, timestamp }` |

### Implementation

1. Initialize:
   ```
   cd server
   pnpm init
   pnpm add @x402/core @x402/avm @x402/hono hono @hono/node-server dotenv
   pnpm add -D typescript @types/node tsx
   ```

2. `server/src/index.ts`:
   - Load `.env` (SELLER_ADDRESS, FACILITATOR_URL, PI_URL)
   - **Background poller** (every 2s):
     ```ts
     let piStatus = { solar_kw: 0, battery_kwh: 10, battery_pct: 1, price_per_kwh: 0.05, ev_plugged: false, has_offer: true };
     setInterval(async () => {
       piStatus = await fetch(`${PI_URL}/status`).then(r => r.json()).catch(() => piStatus);
     }, 2000);
     ```
   - **GET /status**: returns `piStatus` immediately
   - **GET /energy/buy?kwh=X**: custom x402 handler (NOT paymentMiddleware):
     1. Parse `kwh` from query (default 1, max = battery_kwh)
     2. Compute `totalPrice = kwh * piStatus.price_per_kwh`
     3. If no X-PAYMENT header → return 402 with payment requirements:
        ```ts
        { scheme: 'exact', network: ALGORAND_TESTNET_CAIP2, payTo: SELLER_ADDRESS, price: `$${totalPrice}`, extra: { asset: 10458941 } }
        ```
     4. If X-PAYMENT header present → call `resourceServer.verifyPayment()` then `resourceServer.settlePayment()`
     5. On settlement success → call Pi `POST /consume { kwh }`
     6. If Pi returns 409 (insufficient) → refund logic or error
     7. Log to JSONL: `{ ts, tx_id, kwh, price, buyer }`
     8. Return 200: `{ granted_kwh, price_paid, tx_id, timestamp, new_battery_kwh }`
   - **JSONL logging**: append to `server/payments.jsonl`

3. Test:
   - Mock Pi: run producer in mock mode on localhost:8001 OR hardcode piStatus
   - `pnpm tsx src/index.ts`
   - `curl localhost:4021/status`
   - `curl localhost:4021/energy/buy?kwh=1` → expect 402

### Done when
- `/status` returns cached Pi data
- `/energy/buy` returns 402 with correct requirements
- With valid payment: settles, calls Pi /consume, logs to JSONL, returns 200

---

## Phase 4 — Consumer Agent (TypeScript, Laptop)

**Goal**: Autonomous agent that polls, evaluates, pays, and tracks delivery.
**Time**: ~5 hours (Person B)
**Dependency**: Phase 3 (Hono server running)

### Endpoints (state server)

| Method | Path | Response |
|--------|------|----------|
| GET | `/state` | `{ state, solar_kw, battery_pct, price, delivery_remaining, budget_remaining, last_tx }` |
| GET | `/events` | `[{ ts, type, details }, ...]` (max 100) |

### Implementation

1. Initialize:
   ```
   cd consumer/agent
   pnpm init
   pnpm add @x402/core @x402/fetch @x402/avm dotenv hono @hono/node-server
   pnpm add -D typescript @types/node tsx
   ```

2. `consumer/agent/src/index.ts`:
   - Load `.env` (BUYER_MNEMONIC, SERVER_URL, BUDGET_USD)
   - Init x402 client:
     ```ts
     const signer = toClientAvmSigner(mnemonicToSecretKey(BUYER_MNEMONIC));
     const client = new x402Client().register(ALGORAND_TESTNET_CAIP2, new ExactAvmScheme(signer));
     const fetchPay = wrapFetchWithPayment(fetch, client);
     ```
   - **State machine**:
     ```
     IDLE → EVALUATING → PAYING → CHARGING → IDLE
     ```
   - **Polling loop** (every 2s):
     ```
     status = GET SERVER_URL/status
     switch(state):
       IDLE:
         if ev_plugged AND has_offer AND price <= budget:
           state = EVALUATING → PAYING
           response = fetchPay(SERVER_URL/energy/buy?kwh=1)
           if 200: state = CHARGING, delivery_remaining = 1
           else: state = IDLE, log error
         if ev_plugged AND (price > budget OR !has_offer):
           log "waiting" (price too high or no offer)
       CHARGING:
         delivery_remaining -= 3 * (ACCEL / 3600) * 2  // 2s elapsed
         if delivery_remaining <= 0:
           state = IDLE  // ready to buy again
         if !ev_plugged:
           state = IDLE  // EV unplugged
     ```
   - **Budget tracking**: `budget_remaining -= price_paid` on each purchase
   - **Events array**: push timestamped events (state transitions, payments, errors)
   - **State server** (Hono on :4022): serves `/state` and `/events`

3. Test:
   - Start Hono server (Phase 3)
   - `pnpm tsx src/index.ts`
   - Plug EV on Pi → agent logs transitions → payment settles
   - `curl localhost:4022/state` → see state + delivery remaining
   - Verify tx on Lora explorer

### Done when
- Agent autonomously buys when conditions met
- State machine transitions correctly
- Delivery countdown works (agent re-buys after delivery completes)
- Budget enforcement works
- `/state` and `/events` return correct data

---

## Phase 5 — Streamlit Dashboard (Python, Laptop)

**Goal**: Single-page real-time visualization of all system state.
**Time**: ~4 hours (Person B, Person A assists)
**Dependency**: Phases 2, 3, 4 running

### Data Sources

| Source | URL | Frequency | Data |
|--------|-----|-----------|------|
| Hono | `localhost:4021/status` | 2s | Live gauges + price |
| Pi | `raspberrypi.local:8001/history?minutes=5` | 5s | Time-series charts |
| Agent | `localhost:4022/state` | 2s | Agent state + delivery |
| Agent | `localhost:4022/events` | 2s | Payment event log |

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  Solar: 3.2 kW    Battery: 72%    Price: $0.14/kWh    EV: ON   │
│  [====>      ]    [████████░░]                        Agent:    │
│                                                       CHARGING  │
├─────────────────────────────────────────────────────────────────┤
│  [Solar kW chart ~~~~~~~~~~~~]  [Battery % chart ~~~~~~~~~~]   │
│  [Price $/kWh chart ~~~~~~~~~ budget line ─────────────────]   │
├─────────────────────────────────────────────────────────────────┤
│  EV Flow: 3 kW  │  Delivery: 0.6 kWh remaining                │
├─────────────────────────────────────────────────────────────────┤
│  Payment Log                                                    │
│  14:02:31  PAID  1 kWh @ $0.14  tx: ABC...XYZ  [Lora link]    │
│  14:02:09  EVAL  price $0.14 <= budget $5.00 → buying          │
│  14:02:07  IDLE  EV plugged, checking offer                    │
└─────────────────────────────────────────────────────────────────┘
```

### Implementation

1. `consumer/dashboard/requirements.txt`: `streamlit`, `requests`, `plotly`

2. `consumer/dashboard/app.py`:
   - Auto-refresh via `st.rerun()` with 2s sleep
   - Gauges: `st.metric` for solar, battery, price
   - Charts: `plotly.graph_objects` line charts from `/history`
   - EV flow indicator: 3 kW when `delivery_remaining > 0`, else 0
   - Event log: `st.dataframe` with Lora explorer links

3. Test: `streamlit run app.py`

### Done when
- Live gauges update with potentiometer changes
- Charts show battery sawtooth pattern during purchases
- Payment events show with clickable Lora links
- Agent state badge reflects current state

---

## Phase 6 — Integration & Demo Polish

**Goal**: End-to-end demo runs reliably 3x in a row.
**Time**: ~4 hours (together)

### Steps

1. **Network**: static IPs or verify `raspberrypi.local` resolves over Ethernet

2. **Process management** on Pi:
   ```bash
   # producer/start.sh
   uvicorn main:app --host 0.0.0.0 --port 8001
   ```

3. **Laptop startup script**:
   ```bash
   # start.sh
   cd server && pnpm tsx src/index.ts &
   cd consumer/agent && pnpm tsx src/index.ts &
   cd consumer/dashboard && streamlit run app.py &
   ```

4. **End-to-end dry run** (full demo sequence):
   1. All services running, dashboard open
   2. Potentiometer low → price high ($0.28) → no purchase
   3. Potentiometer high → price drops ($0.08) → agent still idle (no EV)
   4. Plug EV jumper → agent detects → evaluates → pays → CHARGING
   5. Dashboard: battery drops, EV flow = 3 kW, payment in log
   6. Delivery completes → agent buys again → second payment
   7. Verify both tx IDs on Lora explorer
   8. Potentiometer low → price rises above budget → agent stops
   9. Unplug EV → agent returns to IDLE

5. **Error handling**:
   - Pi unreachable → Hono returns last-known cached status
   - Insufficient battery → Pi returns 409 → Hono returns error → agent logs + waits
   - Budget exhausted → agent stops buying, dashboard shows "budget depleted"
   - Facilitator timeout → agent logs error, retries next cycle

6. **Demo script** (for judges):
   - 30s elevator pitch
   - 2-min live walkthrough of the sequence above
   - Backup: screen recording of a successful run

### Done when
- Full sequence runs 3x without failure
- Each run shows 2+ on-chain payments visible on Lora
- All error cases handled gracefully
- Demo script rehearsed
