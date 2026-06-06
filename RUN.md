# RUN — local x402 payment (Phase 0)

Prove one real x402 USDC payment settles on Algorand TestNet, on a laptop. No Raspberry Pi.

**Prereqs:** Node 18+, pnpm. See [docs/07](docs/07-prephase-setup-and-mock-plan.md) and
[docs/08](docs/08-transaction-flow-explained.md) for the *why*.

## Who is who (folder → role)

| Folder | Role | x402 role | Runs how |
|---|---|---|---|
| `server/` | **Seller** (the energy producer) | x402 **server** (returns "402, pay me"; *receives* USDC) | long-running, port **4021** |
| `consumer/agent/` | **Buyer** (the EV/consumer) | x402 **client** (signs + *pays*) | runs once, pays, exits |
| `setup/` | account tooling | — | one-off scripts |

> The buyer is a **client**, not a server: it makes one request, pays, prints the tx, and exits.
> Only the seller stays running. **Both run on the laptop** for this phase.

---

## TL;DR (if accounts + `.env` are already set up)

```bash
# Terminal A — start the SELLER first, leave it running:
cd server && pnpm start            # → listening on http://localhost:4021

# Terminal B — run the BUYER (this sends ONE payment, then exits):
cd consumer/agent && pnpm start    # → "energy granted" + "payment settled" + Lora link
```
**Order matters: server first, then agent.** Each agent run = **one** payment buyer → seller.
Run the agent again to send another.

---

## First-time setup (once)

### 0. Install dependencies
```bash
cd setup           && pnpm install && cd ..
cd server          && pnpm install && cd ..
cd consumer/agent  && pnpm install && cd ../..
```

### 1. Create + fund two accounts
```bash
node setup/generate.mjs                 # prints SELLER + BUYER (address + 25-word mnemonic)
```
- Fund **ALGO** (gas) for both addresses: https://lora.algokit.io/testnet/fund
  - Faucet rate-limited? Fund one, then top up the other:
    `node setup/send-algo.mjs "<funded mnemonic>" <other address> 5`
```bash
node setup/optin.mjs "<seller mnemonic>"   # opt each account into USDC (needs a little ALGO)
node setup/optin.mjs "<buyer mnemonic>"
```
- Fund **USDC** for the **buyer** (select *Algorand Testnet*): https://faucet.circle.com
```bash
node setup/balances.mjs <buyer address>    # expect ALGO + USDC
node setup/balances.mjs <seller address>   # expect ALGO (USDC optional; it receives)
```

### 2. Configure env (never commit these)
```bash
cp server/.env.template server/.env
cp consumer/agent/.env.template consumer/agent/.env
```
- `server/.env` → `AVM_ADDRESS` = **seller address** (public)
- `consumer/agent/.env` → `AVM_MNEMONIC` = **buyer mnemonic** (secret; gitignored)

---

## Control the payment amount

The amount the agent pays is set by one line in **`server/.env`**:
```bash
PRICE_PER_KWH_USD=0.01     # default: each buy = $0.01
# PRICE_PER_KWH_USD=1.00   # set to 1.00 to send exactly 1 USDC per buy
```
⚠️ The server reads `.env` **only at startup** — after changing it, **restart the seller**
(Ctrl+C in Terminal A, then `pnpm start` again) before running the agent.

## Verify the transfer
```bash
node setup/balances.mjs <buyer address>    # goes down by the price
node setup/balances.mjs <seller address>   # goes up by the price
```
Or open the **Lora explorer link** the agent printed → see the on-chain USDC transfer.

## ✅ Expected
The agent prints `energy granted`, `payment settled`, and a **Lora explorer link**.
Open it → a real USDC transfer **Buyer → Seller** on TestNet. That's Phase 0 done.

## Troubleshooting
- **`EADDRINUSE` on :4021** → a seller is already running. Stop it (Ctrl+C) or
  `pkill -f "server/src/index.ts"`, then start again.
- **Agent fails to connect** → start the **server first**; confirm it says "listening".
- **`402` returned but no settle** → buyer not opted-in / no USDC, or facilitator unreachable.
  Run `node setup/balances.mjs <buyer address>` and check `FACILITATOR_URL` in `server/.env`.
- **Wrong amount sent** → you changed `PRICE_PER_KWH_USD` but didn't restart the server.
