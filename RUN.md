# RUN — live demo

How to run the **actual** project: Producer (Raspberry Pi) → Seller x402 server → Consumer agent (EV) → Mobile app. Runs fully on a laptop (the Pi is simulated when absent).

> This is the **live** top-level stack. The earlier `src/*` layout is kept for reference only — don't run it.

## Services

| Folder | Role | Port | Run |
|---|---|---:|---|
| `producer/` | Raspberry Pi producer (solar/battery/GPIO/LED, or laptop sim) | 8001 | `python main.py` |
| `server/` | Seller x402 resource server (paywall + ledger + control plane) | 4021 | `pnpm dev` |
| `consumer/agent/` | Buyer EV agent — **signs & pays x402** | 4022 | `pnpm start` |
| `consumer/app/` | `volt-connect` mobile app (customer UI) | 8080 | `bun run dev` |

Prereqs: Node ≥ 20 + pnpm, Python ≥ 3.10, bun. The EURD demo runs on **Algorand mainnet** — the agent wallet must hold EURD + ALGO.

## 1. Get the mobile app (its own repo)

```bash
# from the repo root
git clone https://github.com/Jaseelkt007/volt-connect consumer/app
```

## 2. Configure env (per service)

```bash
cp producer/.env.template       producer/.env
cp server/.env.template         server/.env
cp consumer/agent/.env.template consumer/agent/.env
```

Key values:

```txt
# server/.env  (seller — PUBLIC address only)
AVM_ADDRESS=<seller public address>
FACILITATOR_URL=https://facilitator.goplausible.xyz
PAYMENT_NETWORK=mainnet
PAYMENT_ASSET_ID=1221682136      # Quantoz EURD
PAYMENT_ASSET_SYMBOL=EURD
PAYMENT_ASSET_DECIMALS=2
PRICE_PER_KWH=0.01
MOCK_EV_PLUGGED=true             # laptop demo without the Pi

# consumer/agent/.env  (buyer — holds the signing key)
AVM_MNEMONIC=<24-word Pera HD or 25-word legacy mnemonic>
RESOURCE_SERVER_URL=http://localhost:4021
PI_URL=http://localhost:8001     # or http://<pi-ip>:8001 if the Pi is remote
ALGOD_URL=https://mainnet-api.4160.nodely.dev
PAYMENT_NETWORK=mainnet
BUDGET_USD=5
MAX_PRICE_PER_KWH=0.2
```

The app needs no env locally — it defaults to the agent at `http://localhost:4022` (override with `VITE_AGENT_URL`). Secrets (`.env`) are gitignored.

## 3. Run (4 terminals)

Start order matters: the agent polls the server, which polls the Pi. Bring up A → B → C → D.

```bash
# A — Producer (stable for a demo: EV stays plugged, no random toggling)
cd producer && pip install -r requirements.txt
EV_PLUGGED_DEFAULT=true EV_AUTO_TOGGLE=false PORT=8001 python main.py

# B — Seller x402 server
cd server && pnpm install && pnpm dev          # :4021

# C — Consumer agent / buyer (signs payments)
cd consumer/agent && pnpm start                 # :4022

# D — Mobile app
cd consumer/app && bun install && bun run dev    # http://localhost:8080
```

## 4. Drive the demo

1. Open the app (`:8080`) → header dot goes online, **"Charger connected"** appears (from the Pi's `ev_plugged`, or `MOCK_EV_PLUGGED`).
2. Set **chunk** (e.g. `0.2` kWh), **budget**, **max price** → tap **Start charging**.
3. The agent runs `IDLE → EVALUATING → PAYING → CHARGING` and **re-buys each chunk** (metered loop) — every buy is a **real EURD tx on Algorand mainnet**.
4. Each payment shows in the app with a clickable **Lora** link; telemetry, savings, CO₂, and the wallet update live.
5. Tap **Stop** → the agent pauses and notifies the Pi (`/charging-complete`) → LED off → session summary.

## 5. Verify it's real

```bash
curl http://localhost:4022/wallet    # live on-chain EURD + ALGO balance
curl http://localhost:4022/state     # agent state machine + session totals
curl http://localhost:4022/events    # live decision + payment feed (with tx ids)
```
Click any payment's tx in the app → it opens a settled transaction on `https://lora.algokit.io/mainnet/tx/<txid>`.

## Notes / troubleshooting

- **No Raspberry Pi?** Keep `MOCK_EV_PLUGGED=true` in `server/.env` — charger reads as connected and metered buys still flow; the whole demo runs on one laptop.
- **TestNet instead of mainnet?** Set `PAYMENT_NETWORK=testnet` and USDC (`PAYMENT_ASSET_ID=10458941`, decimals 6) in **both** `server/.env` and `consumer/agent/.env`; fund the wallet with TestNet ALGO + USDC.
- **Faster txs for a demo:** use a smaller chunk size (e.g. `0.2` kWh).
- `EADDRINUSE` on `:4021`/`:4022`/`:8001`: stop the existing process (`fuser -k <port>/tcp`).
- Agent stays `IDLE`/`WAITING`: producer reports `ev_plugged=false` → set `MOCK_EV_PLUGGED=true`, or check `RESOURCE_SERVER_URL`.
- `402` but no settle: check the wallet's EURD balance + opt-in and `FACILITATOR_URL`.
- Full details: [docs/PROJECT-DOSSIER.md](docs/PROJECT-DOSSIER.md) · [README.md](README.md).
```
