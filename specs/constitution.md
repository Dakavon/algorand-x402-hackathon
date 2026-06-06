# Project Constitution

> P2P Agentic Energy Sharing

## Problem

With §42c EnWG (Energy Sharing), households can sell surplus electricity directly to neighbors. Current challenges:

- No automated matching of supply & demand
- No dynamic pricing
- Billing & processes too complex
- Inefficient use of solar surplus

Result: Energy Sharing is technically possible, but practically hard to use.

## Vision

> Households trade energy autonomously with each other — without an intermediary.

## Mission

Enable households to exchange surplus solar energy autonomously via AI agents, with instant x402 micropayments settled on Algorand.

## Elevator Pitch

> Your electric car autonomously buys cheap solar energy from your neighbor, pays instantly via x402, and charges — while you sleep.

## Core Principles

### 1. Autonomy First

Agents make buy/sell decisions without human intervention. The system should work while the user sleeps.

- **Producer Agent** (household with PV) — knows solar output, knows storage fill level, publishes a dynamic offer
- **Consumer Agent** (e.g. EV) — knows energy demand, knows budget, decides automatically: buy or skip

### 2. Real Hardware, Real Payments

- Physical potentiometer controls solar output (0–5 kW via MCP3008 ADC)
- GPIO pin detects EV plug inserted (jumper to GND)
- USDC transfers on Algorand Testnet (Circle ASA `10458941`) — verifiable on-chain
- No mocks in the live demo

### 3. Simplicity Over Features

- Single producer, single consumer
- One asset (USDC), one payment scheme (exact)
- Three endpoints per service maximum
- No user accounts, no admin UI, no database migrations

### 4. Time Acceleration

Demo-friendly simulation: `ACCEL=60` compresses 1 hour into 1 minute. Battery charges/discharges at 60x real-world rate.

### 5. Fail Gracefully

- Pi unreachable? Return cached state
- Insufficient battery? Return 409, agent waits
- Facilitator down? Log error, retry next cycle
- Budget exhausted? Stop buying, show status

## Architecture Constraints

### Language Boundaries

| Component | Language | Framework |
|-----------|----------|-----------|
| Producer (Pi) | Python only | FastAPI |
| x402 Server (Laptop) | TypeScript | Hono |
| Consumer Agent (Laptop) | TypeScript | Hono + @x402/fetch |
| Dashboard (Laptop) | Python | Streamlit |

No mixing. Python on Pi for GPIO libraries. TypeScript for x402 SDK.

### Network

- Wired Ethernet between Pi and Laptop — no venue WiFi dependency
- Static IP or mDNS (`raspberrypi.local`)
- Ports: Pi=8001, Hono=4021, Agent=4022, Dashboard=8501

### Data Flow

```
Potentiometer -> ADC -> Pi (/status)
                          |
                          v (polled 2s)
                       Hono (/status, /energy/buy)
                          |
                          v (polled 2s)
                   Consumer Agent (state machine)
                          |
                          v (polled 2s)
                   Streamlit Dashboard
```

### Energy Flow

```
Solar → Self-consumption → Storage → Sale → Neighbor / EV
```

### Payment Flow (x402)

1. Consumer Agent discovers an offer via `/status`
2. Sends request to Producer API
3. Response → 402 Payment Required (Algorand challenge)
4. Agent signs & submits payment via @x402/avm (USDC ASA `10458941` on Algorand Testnet)
5. Facilitator (goplausible.xyz) verifies & settles on-chain
6. Producer grants access — Pi `/consume` decrements battery, Hono returns 200 with tx_id
7. Agent tracks delivery locally at 3 kW (time-accelerated)

## Energy Model

### Assumptions

| Component | Value |
|-----------|-------|
| PV capacity | 5 kW |
| Self-consumption | 1 kW |
| Storage | 10 kWh |
| EV charge rate | 3 kW |
| Grid price (worst case) | $0.30 / kWh |
| Price floor | $0.01 / kWh |

### Pricing Formula

The worst case for the consumer is paying the grid price (no discount). Discounts apply when the producer has surplus (storage full, solar high).

```
price = $0.30 - (battery_pct * $0.15) - (solar_kw * $0.02)
price = max(price, $0.01)
```

| Condition | Solar | Storage | Price ($/kWh) |
|-----------|-------|---------|---------------|
| Worst (grid price) | 0 kW | 0% | $0.30 |
| Mid (normal) | 2 kW | 50% | $0.19 |
| Best (surplus) | 5 kW | 100% | $0.05 |

### Battery Simulation (time-accelerated, runs every 1s on Pi)

```
net_flow = solar_kw - 1  # solar minus self-consumption
battery += net_flow * (ACCEL / 3600)
battery = clamp(battery, 0, 10)
```

Purchases decrement battery instantly (`POST /consume`). No EV draw in the tick formula — that would double-count.

### Purchase Model

- Buyer specifies kWh per request: `GET /energy/buy?kwh=1`
- Payment = `kwh * current_price_per_kwh`
- After purchase: agent tracks delivery locally at 3 kW rate (time-accelerated)
- When delivery completes: agent can buy again

## No-Offer Guard

If storage is empty AND solar output is below self-consumption (1 kW), no energy is available to sell. The Producer returns `{"has_offer": false}`.

## State Machine (Consumer Agent)

```
IDLE -> EVALUATING -> PAYING -> CHARGING -> IDLE
  ^                                |
  +--------------------------------+
```

Transitions:
- IDLE + ev_plugged + has_offer + price <= budget → EVALUATING
- EVALUATING → PAYING (immediate)
- PAYING + 200 response → CHARGING
- PAYING + error → IDLE (log error)
- CHARGING + delivery_complete → IDLE
- CHARGING + ev_unplugged → IDLE

## Live Demo Sequence

1. **Turn potentiometer** → B50K → MCP3008 ADC → live solar output on dashboard
2. **Price recalculates** in real time — higher solar → lower $/kWh
3. **Connect EV plug pin** → jumper to GND → Pi GPIO detects → `/status` reports `ev_plugged: true`
4. **Consumer Agent** picks up the event via Hono `/status` → checks budget vs current price:
   - price ≤ budget → "Charging approved" + x402 payment
   - price > budget → "Price too high — waiting for surplus"
5. **Battery decreases** instantly on purchase (visible sawtooth on chart)
6. **EV flow indicator** shows 3 kW delivery rate; delivery countdown ticking
7. **Solar recharges** battery between purchases (visible recovery on chart)
8. **x402 payment** → USDC on Algorand Testnet → settled via facilitator → tx link in dashboard
9. **Delivery completes** → agent buys again → multiple on-chain transactions visible

## UI (Streamlit Dashboard)

- Solar output (kW) — real-time from potentiometer input
- Battery level (%) — sawtooth: drops on purchase, recovers from solar
- Price $/kWh — live from pricing formula
- EV flow indicator — 3 kW during delivery, 0 kW between purchases
- Live charts (solar, battery, price over time) from Pi SQLite history
- Agent state badge (IDLE / EVALUATING / PAYING / CHARGING)
- Payment log with clickable Lora explorer links

## File Structure

```
src/
  producer/           # Python FastAPI (runs on Pi)
  server/             # TypeScript Hono x402 server
  consumer/
    agent/            # TypeScript x402 client
    dashboard/        # Python Streamlit
specs/
  constitution.md     # This file
  features/           # Feature specifications
```

## Environment Variables

### Producer (.env)
```
ACCEL=60
```

### Server (.env)
```
SELLER_ADDRESS=<algorand_address>
FACILITATOR_URL=https://facilitator.goplausible.xyz
PI_URL=http://raspberrypi.local:8001
```

### Consumer Agent (.env)
```
BUYER_MNEMONIC=<25_word_mnemonic>
SERVER_URL=http://localhost:4021
BUDGET_USD=5.00
ACCEL=60
```

## Security Boundaries

- Mnemonics in `.env` files only, never committed
- No authentication on local endpoints (demo simplicity)
- Facilitator handles payment verification
- All code runs on trusted hardware (Pi + Laptop)

## Out of Scope

- Multiple producers/consumers
- Real grid integration
- Fiat on/off ramps
- Mobile apps
- Persistent user accounts
- Production deployment
- EURQ stablecoin (bonus track only)
- Prediction markets (bonus track only)

## Success Criteria

1. Potentiometer turn → price change visible on dashboard
2. EV plug → agent evaluates and pays (if conditions met)
3. Payment settles on Algorand Testnet (verifiable on Lora)
4. Battery decreases on purchase, recovers from solar
5. Multiple payments in a 2-minute demo window
6. Full sequence runs 3x without failure

## Glossary

| Term | Definition |
|------|------------|
| x402 | HTTP-native micropayment protocol using 402 status code |
| ASA | Algorand Standard Asset (token) |
| USDC | USD Coin stablecoin |
| Facilitator | Service that verifies and settles x402 payments |
| ACCEL | Time acceleration factor for demo (default 60) |
