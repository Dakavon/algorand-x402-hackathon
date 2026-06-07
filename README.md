# P2P Agentic Energy Sharing ⚡️🤖

> **Your EV autonomously buys your neighbour's surplus solar, pays per-kWh via x402 on Algorand — settling a real, MiCA-regulated digital euro (Quantoz EURD) on mainnet — and charges while you sleep.**

Built for the **Algorand Builders Berlin — Agentic Commerce x402 Hackathon** (42 Berlin, 6–7 June 2026).

**Primary track:** 🧠 Track 1 — Agentic Commerce · **Bonus:** 💶 Quantoz EURD/EURQ

📄 Full deep-dive: **[docs/PROJECT-DOSSIER.md](docs/PROJECT-DOSSIER.md)** · Legal basis: [docs/04-law-42c-enwg.md](docs/04-law-42c-enwg.md) · Strategy: [docs/05-strategy-and-landscape.md](docs/05-strategy-and-landscape.md)

---

## Why this matters

Germany's **§42c EnWG** energy-sharing law (in force **1 June 2026**) lets households be paid **per kWh** for sharing renewable surplus with neighbours in the same balancing area. But today it's human-driven and slow — no automated matching, no dynamic pricing, billing too complex, solar surplus wasted.

**We built the autonomous agent + on-chain settlement layer that makes §42c actually usable:** a buyer agent (your EV) and a seller agent (your neighbour's solar+battery) that **negotiate and settle per-kWh micropayments themselves**, with instant finality on Algorand.

> Legal framing is deliberately accurate: §42c permits per-kWh remuneration for renewable energy under conditions (same balancing area, renewable-only, supplements your supplier, 15-min metering). We automate **§42c's per-kWh settlement** — we do not replace utilities or create an open market. Details + verbatim citations in [docs/04-law-42c-enwg.md](docs/04-law-42c-enwg.md).

---

## ✅ Hackathon requirements — met

| Requirement | Status |
|---|---|
| **Implements x402 on Algorand** | ✅ Every energy purchase is an x402 `402 → pay → settle` flow via the GoPlausible facilitator |
| **Fits "Agentic Commerce"** | ✅ A machine customer (EV agent) autonomously buys a metered good (energy) from a seller agent |
| **New project** (code written during event) | ✅ All code written 6–7 June 2026 |
| **Real on-chain settlement** | ✅ And on **MAINNET** — settling real **Quantoz EURD** (most teams only reach TestNet) |
| **Bonus: Quantoz EURD/EURQ** | ✅ Live autonomous **mainnet EURD** micropayment stream |

---

## What we built

A complete, working pipeline across four services:

1. **Producer (Raspberry Pi)** — a solar household: potentiometer = sun, jumper = "EV plugged" (GPIO), LED = charging, battery + dynamic pricing, SQLite history. Falls back to simulation on a laptop.
2. **Seller x402 server** — wraps `/energy/buy` behind an x402 paywall; settles via facilitator; keeps a real on-chain payment ledger.
3. **Consumer agent (the EV)** — the autonomous buyer. A state machine (`IDLE → EVALUATING → PAYING → CHARGING`) that **signs and pays in EURD on Algorand mainnet**, in a continuous **metered** loop, under a budget + max-price policy.
4. **Mobile app (`volt-connect`)** — the customer's phone: connect → start → watch live, then stop. Shows the agent's reasoning, savings vs. the grid, CO₂ avoided, wallet balance, and **every settled transaction with a clickable Lora explorer link**.

### The end-to-end demo
Plug in → app shows **"Charger connected"** → tap **Start** → the agent evaluates, pays per-kWh in **real EURD on mainnet**, and re-buys each chunk while delivering → the Pi drains its battery and lights the LED → tap **Stop** → the agent notifies the Pi the session is complete.

---

## Architecture

```
Producer (Pi)        Seller x402 server      Consumer agent (buyer)     Mobile app
FastAPI :8001   ───▶  Hono :4021        ◀──▶  Hono :4022           ◀───  React :8080
GPIO/ADC/LED         x402 paywall +           signs x402, pays           live state,
battery+pricing      control plane +          EURD on mainnet,           reasoning,
SQLite history       payment ledger           /charge/start|stop         payments+Lora
     ▲                     │                        │
     └── /charging-complete┘                        ▼
                                            GoPlausible facilitator ──▶ Algorand (settles)
```

**Design rule:** money movement and autonomous decisions live in the backend (agent/server, which hold the keys). **The client app never signs** — it only visualizes and configures.

Endpoints we added for the full pipeline: agent `POST /charge/start`, `POST /charge/stop`, `GET /wallet`, enriched `GET /state`; producer `POST /charging-complete`. Full endpoint inventory in [docs/PROJECT-DOSSIER.md](docs/PROJECT-DOSSIER.md) §6.

---

## Features

- 🔌 **Charger detection** — GPIO "EV plugged" propagates Pi → server → agent → app; the app gates "Start" until connected.
- 🤖 **Autonomous metered buying** — the agent re-buys small chunks per delivery under a budget + max-price cap (multiple real on-chain txs).
- 💶 **Real EURD settlement on mainnet** — each chunk is a genuine Quantoz EURD payment, verifiable on Lora.
- 🧠 **Agent reasoning feed** — the app narrates the agent's live decisions ("price ≤ cap → buying 0.2 kWh").
- 📉 **Savings vs. grid + CO₂** — % cheaper than the ~€0.35 grid tariff and kg CO₂ avoided, framed against §42c.
- 👛 **Live wallet** — on-chain EURD + ALGO balance and "≈ kWh affordable."
- 📊 **Live telemetry** — solar kW, battery %, available kWh, live price.
- 🧾 **Payment ledger** — every tx with a clickable **Lora** link (the credibility anchor).
- 🛡️ **Spend policy** — the agent refuses to exceed its budget/price cap ("Budget exhausted").

---

## How to run (live stack)

> Four terminals. The app talks only to the agent (`:4022`); the agent pays via the server (`:4021`); the server drives the Pi (`:8001`).

```bash
# 1. Producer (Pi sim) — stable for a demo
cd producer && pip install -r requirements.txt
EV_PLUGGED_DEFAULT=true EV_AUTO_TOGGLE=false PORT=8001 python main.py

# 2. Seller x402 server  (server/.env: AVM_ADDRESS, FACILITATOR_URL, PAYMENT_NETWORK, EURD asset)
cd server && pnpm install && pnpm dev          # :4021

# 3. Consumer agent / buyer  (consumer/agent/.env: AVM_MNEMONIC, ALGOD_URL, PI_URL, PAYMENT_NETWORK)
cd consumer/agent && pnpm start                 # :4022

# 4. Mobile app  (defaults to the agent at http://localhost:4022)
cd consumer/app && bun install && bun run dev    # :8080
```

- **Mobile app repo:** the UI lives in its own repo and is cloned into `consumer/app`:
  `git clone https://github.com/Jaseelkt007/volt-connect consumer/app` (run from the repo root).
- **No Pi?** Set `MOCK_EV_PLUGGED=true` in `server/.env` — the charger reads as connected and metered buys still flow.
- **Pi on another machine?** Set `PI_URL=http://<pi-ip>:8001` in the agent `.env`.
- `.env.template` files are provided per service; secrets (mnemonics) are gitignored.

> `RUN.md` documents the earlier `src/*` layout; the **top-level** `producer/`, `server/`, `consumer/*` is the live stack.

---

## How to verify it's real (for judges)

1. In the app, tap **Start** → a **Payment** row appears per chunk.
2. Click the **tx link** → it opens on **`lora.algokit.io/mainnet`** — a real, settled Algorand transaction.
3. It's a **Quantoz EURD** asset transfer (ASA `1221682136`) — a MiCA-regulated digital euro, signed by the EV agent's wallet, settled via the GoPlausible facilitator.
4. The wallet balance in the app (and `GET http://localhost:4022/wallet`) reflects the real on-chain balance.

| Reference | Value |
|---|---|
| Live network | Algorand **mainnet** |
| Payment asset | **Quantoz EURD** — ASA `1221682136` (2 dp) · EURQ-ready: ASA `2768422954` |
| Agent wallet (public) | `HYHQP6GEYGBAGYJ4VOYBV7S6WGQC3TPBRVLIGWIU755N7RGQ6IOJCJ3QSA` |
| Facilitator | `facilitator.goplausible.xyz` |
| Explorer | `https://lora.algokit.io/mainnet/tx/<txid>` |
| ✅ Mainnet EURD proof tx | [`SDLASLD23VEVSLUV3G5WHJZBSMUWFWS3MGN2ZKIVEMINBWOC2XVQ`](https://lora.algokit.io/mainnet/tx/SDLASLD23VEVSLUV3G5WHJZBSMUWFWS3MGN2ZKIVEMINBWOC2XVQ) (0.01 EURD) |
| Phase-0 proof (TestNet USDC) | tx `NL2FAXW72GC2BBBCM3D2T5DAHDBN36IY3L6JLLJ66SJOATXXPH2A` |

---

## Repository structure

```
├─ producer/        Raspberry Pi FastAPI service (:8001)        ← live producer
├─ server/          Seller x402 Hono server (:4021)             ← live seller
├─ consumer/agent/  Buyer agent — signs x402 (:4022)            ← live buyer
├─ consumer/app/    volt-connect mobile UI (:8080) [own git]    ← live client
├─ src/             earlier canonical layout (reference)
├─ specs/           plan, design specs, constitution
└─ docs/            vision, rules, §42c law, strategy, PROJECT-DOSSIER.md
```

Key docs: **[PROJECT-DOSSIER.md](docs/PROJECT-DOSSIER.md)** (everything) · [00-project-vision.md](docs/00-project-vision.md) · [01-hackathon-rules.md](docs/01-hackathon-rules.md) · [03-x402-and-agentic-commerce.md](docs/03-x402-and-agentic-commerce.md) · [04-law-42c-enwg.md](docs/04-law-42c-enwg.md) · [specs/system-design.md](specs/system-design.md)

---

## Roadmap (mainnet milestone & beyond)

- ✅ **Live on mainnet** — satisfies the prize pool's 50/50 mainnet milestone (done, not promised).
- Multi-neighbour **discovery** (Bazaar) + cheapest/greenest selection.
- **ARC-58** on-chain spend policy — a rogue agent's overspend blocked on-chain.
- **EURQ** upgrade (one env var) · **Folks xALGO** idle-budget yield · **Alpha Arcade** "buy tomorrow's solar."

---

## Tech stack

Python · FastAPI · TypeScript · Hono · React 19 · TanStack Start · Tailwind · `@x402/avm` · `@x402/hono` · `@x402/fetch` · AlgoKit (Pera HD signer) · GoPlausible facilitator · Quantoz EURD (mainnet) · Lora explorer.

---

*See [docs/PROJECT-DOSSIER.md](docs/PROJECT-DOSSIER.md) for the complete technical record, build timeline, bonus-track verification, and the demo script.*
