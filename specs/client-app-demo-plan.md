# Client Mobile App — Integration & Demo Plan

The buyer-facing mobile app (**`consumer/app`**, the Lovable `volt-connect` repo) lets a
customer plug in, start an autonomous **metered** charging session, watch real on-chain
micropayments stream in, and stop on demand. This doc tracks how it connects and how to
run the full demo locally.

## Architecture (local)

```
consumer/app  ──HTTP──▶  consumer/agent  ──x402──▶  server  ──/consume──▶  producer (Pi)
 (mobile UI)   :4022      (buyer agent)    :4021    (seller)    :8001
   React           /state /events                  paywall          solar/battery/LED
              /charge/start /charge/stop
                     │
                     └──/charging-complete──▶ producer (Pi)   [LED off]
```

- The app talks **only** to the consumer agent (`VITE_AGENT_URL`, default `http://localhost:4022`).
- The agent signs + pays via x402 against the seller `server`, which drains the producer battery.
- Each settled purchase is a **real Algorand tx**; the agent surfaces it on `/events`
  (`tx_id` + `lora_url`) and the app renders it in the Payments list.

## Repo / git setup

- `consumer/app` is its **own git clone** of `Jaseelkt007/volt-connect` and is **gitignored**
  by this repo (see root `.gitignore`). The two gits never interfere.
- Update the UI in Lovable, then pull it in: `cd consumer/app && git pull`.
- The app needs **no source edits** to connect locally (it defaults to `:4022`).
  To point at a non-local agent, create `consumer/app/.env` with `VITE_AGENT_URL=...`.

## API contract (agent ⇄ app)

`GET /state` → `{ state, mode, charger_connected, solar_kw, battery_pct, price_per_kwh,
available_kwh, delivery_remaining_kwh, budget_remaining_usdc, max_price_per_kwh,
chunk_kwh, session_kwh, session_spent_usdc, last_tx_id, decision_reason }`

`GET /events?limit=50` → newest-first list; `PAYMENT` events carry `kwh, price_usdc, tx_id, lora_url`.

`POST /charge/start { chunk_kwh, budget_usd, max_price_per_kwh }` → metered loop on, session reset, first buy kicked.

`POST /charge/stop` → loop paused, mode→fixed, Pi notified via `/charging-complete`.

## Status

### ✅ Done — consumer agent (`consumer/agent/src/index.ts`)
- `/state` now exposes `charger_connected`, `available_kwh`, `chunk_kwh`, `session_kwh`,
  `session_spent_usdc` (the fields the app reads).
- `POST /charge/start` and `POST /charge/stop` implemented.
- Per-session totals accumulate on each purchase and reset on start.
- `chunk_kwh` is now settable live (was a constant).
- `PI_URL` env + best-effort `notifyChargingComplete()` on stop.
- Type-checks clean (`npx tsc --noEmit`).

### ⏳ Next — producer / Raspberry Pi (`producer/main.py`)
Add a `POST /charging-complete` endpoint so the Pi switches the LED off when the session
ends (today the LED is only a ~5s timer per `consume`). Drop-in:

```python
class ChargingComplete(BaseModel):
    session_kwh: float | None = None
    session_spent_usdc: float | None = None

@app.post("/charging-complete")
def post_charging_complete(payload: ChargingComplete) -> dict[str, bool]:
    with runtime.lock:
        runtime._charging_until = 0.0
        runtime._set_led(False)
    return {"ok": True}
```
*(Optional companion: `POST /charging-start` → solid LED for the whole session.)*
Until this lands, Stop still works end-to-end; the Pi just won't toggle the LED.

### ❌ Not needed
- `server/src/index.ts` — unchanged (app bypasses it; new agent fields pass through).
- Seller dashboards (`src/frontend`, `consumer/dashboard`) — unchanged; they
  auto-show client-driven payments because the agent already reports them.

## Run the demo (4 terminals)

```bash
# 1. Producer (Pi sim) — keep EV plugged + steady for a clean demo
cd producer && pip install -r requirements.txt
EV_PLUGGED_DEFAULT=true EV_AUTO_TOGGLE=false PORT=8001 python main.py

# 2. Seller x402 server  (needs server/.env: AVM_ADDRESS, FACILITATOR_URL)
cd server && pnpm install && pnpm dev          # :4021

# 3. Consumer agent      (needs consumer/agent/.env: AVM_MNEMONIC, etc.)
cd consumer/agent && pnpm install && pnpm dev   # :4022

# 4. Mobile app
cd consumer/app && bun install && bun run dev    # opens on the printed port
```

> `charger_connected` is driven by the producer's `ev_plugged`, which the agent reads via
> the seller server's `/status`. For the demo, run the producer with
> `EV_PLUGGED_DEFAULT=true EV_AUTO_TOGGLE=false`. (No producer? Set `MOCK_EV_PLUGGED=true`
> on the server, or toggle it from the seller dashboard's EV control.)

## End-to-end smoke test

1. Open the app → it leaves DEMO mode and shows live data (header dot online).
2. **Connection card** shows "Charger connected" + available kWh + price.
3. Set chunk (try **0.2 kWh** for fast, frequent txs), budget, max price → **Start charging**.
4. State runs `EVALUATING → PAYING → CHARGING`; a toast + a new row appears in Payments
   per chunk, each with a clickable **Lora** link to the real tx.
5. Watch `session_kwh` / spent / tx count climb; battery on the seller dashboard drops in lockstep.
6. **Stop charging** → session summary shows; agent POSTs the Pi `/charging-complete`
   (LED off once that endpoint exists).
7. Confirm the same payments appear on the **seller dashboard** ledger (auto-reported).

## Tuning knobs

- Chunk size = tx frequency. Delivering one chunk takes ~`chunk_kwh / 0.05` seconds
  (with `ACCEL=60`, 3 kW charger) → 1 kWh ≈ 20 s, 0.2 kWh ≈ 4 s.
- `BUDGET_USD`, `MAX_PRICE_PER_KWH`, `KWH_PER_PURCHASE` set the agent defaults (overridable per session by the app).
- For a mainnet/EURD demo, see the existing `consumer/agent/.env` toggles (`PAYMENT_NETWORK`, `AVM_MNEMONIC`, `ALGOD_URL`).
```
