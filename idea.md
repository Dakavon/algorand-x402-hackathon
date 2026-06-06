# ⚡ Agentic Energy Sharing Marketplace (x402 + Algorand)

> Product/pitch vision. For implementation details, follow `specs/*`. Use `docs/*` as lookup and
> reference material, except `docs/07-prephase-setup-and-mock-plan.md` as the Phase 0 payment-rail
> authority.

## 🧠 Problem

With the introduction of §42c EnWG (Energy Sharing), households can be paid per kWh for sharing
renewable surplus electricity with neighbors in the same balancing area, under regulated conditions.
Current challenges:

- No automated matching of supply & demand
- No dynamic pricing
- Billing & processes too complex
- Inefficient use of solar surplus

👉 Result: Energy Sharing is technically possible, but practically hard to use.

---

## 🚀 Solution

An **agent-driven, regulated local energy-sharing layer** where:

- Households offer their solar electricity
- Consumers automatically source energy
- AI Agents make decisions
- Payments are settled directly via **x402 on Algorand** (USDC for the demo, EURQ as addon)
- EURQ can add regulated euro settlement as a bonus path

---

## ⚙️ System Overview

### 🔋 Energy Flow

Solar → Self-consumption → Storage → Paid sharing → Neighbor / EV

---

### 🤖 Agents

#### Producer Agent (household with PV)
- knows current solar output
- knows storage fill level
- publishes a dynamic offer

#### Consumer Agent (e.g. EV)
- knows energy demand
- knows budget
- decides automatically: buy or skip

---

## 💸 Payment Flow (x402)

1. Consumer Agent discovers an offer
2. Sends request to Producer API
3. Response → 402 Payment Required (Algorand challenge)
4. Agent signs & submits payment via **@x402/avm** (USDC ASA `10458941` on Algorand Testnet)
5. Facilitator (goplausible.xyz) verifies & settles on-chain
6. Producer grants access

---

## 🏗️ Architecture

### Hardware
- **Raspberry Pi (4)** — Producer service (sensors + battery sim + pricing + SQLite)
- **Breadboard + B50K potentiometer** → MCP3008 ADC (SPI) → Solar output (0–5 kW)
- **Breadboard + jumper/switch** → GPIO pin → "EV plug inserted" trigger
- **Laptop/PC** → x402 Hono server + Consumer Agent + React Dashboard

### Producer (Pi — Python only)
- **FastAPI** — GPIO reads, battery simulation, pricing formula, SQLite persistence
- Endpoints: `GET /status`, `GET /history`, `POST /consume`
- Time-accelerated simulation (configurable `ACCEL` factor for demo)

### x402 Server (Laptop — TypeScript)
- **Hono** — polls Pi for state, wraps `/energy/buy` behind x402 paywall
- Start from the verified x402 payment flow; add dynamic pricing based on buyer-specified kWh after the payment rail is proven
- Hosted facilitator at `facilitator.goplausible.xyz` (verifies + settles payments)
- **USDC** on Algorand Testnet — Circle's official ASA `10458941`
- JSONL payment log for persistence

### Consumer Agent (Laptop — TypeScript)
- **@x402/fetch + @x402/avm** — autonomous buyer with state machine
- Delivery tracking (3 kW rate, time-accelerated)
- Exposes `/state` + `/events` for dashboard

### Network
- **Wired Ethernet** — Pi ↔ Laptop direct link. No venue WiFi dependency.
- Static IP or mDNS (`raspberrypi.local`) for Pi discovery.

### Dashboard (Laptop — React/Vite)
- React — live gauges, time-series charts, energy flow, agent state, payment log
- Queries Hono `/api/*` dashboard endpoints for producer history, live state, agent events, and payments

---

## 🔋 Energy Model

### Assumptions

| Component         | Value  |
|-------------------|--------|
| PV capacity       | 5 kW   |
| Self-consumption  | 1 kW   |
| Storage           | 10 kWh |
| EV charge rate    | 3 kW   |
| Grid price        | $0.30 / kWh |
| Price floor       | $0.01 / kWh |

---

### Pricing

The worst case for the consumer is paying the grid price (no discount).
Discounts apply when the producer has surplus (storage full, solar high).

```python
GRID_PRICE = 0.30       # $/kWh
STORAGE_DISCOUNT = 0.15 # $/kWh when storage is 100%
SOLAR_DISCOUNT = 0.02   # $/kWh per kW solar

price = GRID_PRICE
       - (storage_fill_ratio * STORAGE_DISCOUNT)
       - (solar_power_kw   * SOLAR_DISCOUNT)
price = max(price, 0.01)
```

| Condition           | Solar  | Storage | Price ($/kWh) |
|---------------------|--------|---------|---------------|
| Worst (grid price)  | 0 kW   | 0%      | $0.30         |
| Mid (normal)        | 2 kW   | 50%     | $0.19         |
| Best (surplus)      | 5 kW   | 100%    | $0.05         |

### No-Offer Guard

If storage is empty AND solar output is below self-consumption (1 kW), no energy is available to sell. The Producer returns `{"has_offer": false}` instead of publishing a price.

### Battery Simulation (time-accelerated)

```python
# Runs every 1s on Pi, ACCEL configurable (default 60)
net_flow = solar_kw - 1  # solar minus self-consumption
battery += net_flow * (ACCEL / 3600)
battery = clamp(battery, 0, 10)
```

Purchases decrement battery instantly (`POST /consume`). No EV draw in the tick formula — that would double-count.

### Purchase Model

- Buyer (agent) specifies kWh per request: `GET /energy/buy?kwh=1`
- Payment = `kwh * current_price_per_kwh`
- After purchase: agent tracks delivery locally at 3 kW rate (time-accelerated)
- When delivery completes: agent can buy again

---

## 📊 Live Demo

1. **Turn potentiometer** → B50K → MCP3008 ADC → live solar output on dashboard
2. **Price recalculates** in real time — higher solar → lower $/kWh
3. **Connect EV plug pin** → jumper to GND → Pi GPIO detects → Pi API reports `ev_plugged: true`
4. **Laptop Consumer Agent** picks up the event via Hono `/status` → checks budget vs current price:
   - price ≤ budget → "Charging approved" + x402 payment: `GET /energy/buy?kwh=1`
   - price > budget → "Price too high — waiting for surplus"
5. **Battery decreases** instantly on purchase (visible sawtooth on chart)
6. **EV flow indicator** shows 3 kW delivery rate; delivery countdown ticking
7. **Solar recharges** battery between purchases (visible recovery on chart)
8. **x402 payment** → USDC transfer (Circle ASA `10458941`) on Algorand Testnet → settled via facilitator → tx link in dashboard
9. **Delivery completes** → agent buys again → multiple on-chain transactions visible

---

## 🖥️ UI (React)

- Solar output (kW) — real-time from potentiometer input
- Battery level (%) — sawtooth: drops on purchase, recovers from solar
- Price $/kWh — live from pricing formula
- EV flow indicator — 3 kW during delivery, 0 kW between purchases
- Live charts (solar, battery, price over time) from Pi SQLite history
- Agent state badge (IDLE / EVALUATING / PAYING / CHARGING)
- Payment log with clickable Lora explorer links

---

## 🎯 Vision

> Households trade energy autonomously with each other — without an intermediary.

---

## 🧨 Elevator Pitch

> Your electric car autonomously buys cheap solar energy from your neighbor, pays instantly via x402, and charges — while you sleep.

---

## Bonus Track (Optional)

1. **Quantoz EURQ/EURD** — swap USDC for EURQ stablecoin settlement once available on Algorand
2. **Alpha Arcade** — anonymized solar telemetry → prediction market for local energy forecasting
