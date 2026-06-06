# RUN

Run the constitution-aligned local demo from `src/*`.

## Roles

| Folder | Role | Port |
|---|---|---:|
| `src/raspberrypi/` | Producer telemetry and battery simulation | 8001 |
| `src/x402/server/` | Seller x402 resource server | 4021 |
| `src/x402/client/` | Buyer EV agent | 4022 |
| `src/frontend/` | React dashboard | 5173 |
| `setup/` | TestNet account helpers | - |

## First-Time Setup

```bash
(cd setup && pnpm install)
(cd src/x402/server && pnpm install)
(cd src/x402/client && pnpm install)
(cd src/frontend && pnpm install)
```

Create and fund accounts from the repo root:

```bash
node setup/generate.mjs
node setup/optin.mjs "<seller mnemonic>"
node setup/optin.mjs "<buyer mnemonic>"
node setup/balances.mjs <buyer address>
node setup/balances.mjs <seller address>
```

Fund ALGO on Lora and USDC on Circle before running the payment demo.

## Configure Env

```bash
cp src/raspberrypi/.env.template src/raspberrypi/.env
cp src/x402/server/.env.template src/x402/server/.env
cp src/x402/client/.env.template src/x402/client/.env
cp src/frontend/.env.template src/frontend/.env
```

Set these values:

```txt
src/x402/server/.env
SELLER_ADDRESS=<seller public address>
FACILITATOR_URL=https://facilitator.goplausible.xyz
PI_URL=http://localhost:8001
```

```txt
src/x402/client/.env
BUYER_MNEMONIC=<buyer 25-word mnemonic>
SERVER_URL=http://localhost:4021
BUDGET_USD=5.00
```

For laptop-only payment proof without the producer process, set this in `src/x402/server/.env`:

```txt
MOCK_EV_PLUGGED=true
```

## Run Full Local Demo

Terminal A:

```bash
cd src/raspberrypi && python3 main.py
```

Terminal B:

```bash
cd src/x402/server && pnpm start
```

Terminal C:

```bash
cd src/x402/client && pnpm start
```

Terminal D:

```bash
cd src/frontend && pnpm dev
```

Open `http://localhost:5173`.

## Expected

The agent moves through `IDLE -> EVALUATING -> PAYING -> CHARGING`, settles USDC on Algorand TestNet, and the dashboard shows the transaction link.

## Troubleshooting

- `EADDRINUSE` on `:4021` or `:4022`: stop the existing server/agent process.
- `402` returned but no settle: check buyer USDC balance, opt-in, and `FACILITATOR_URL`.
- Agent stays `IDLE`: producer reports `ev_plugged=false`; use the producer mock loop or set `MOCK_EV_PLUGGED=true` for payment-only testing.
- `PRODUCER_UNREACHABLE`: start `src/raspberrypi` or use `MOCK_EV_PLUGGED=true` for laptop-only fallback.
