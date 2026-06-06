# RUN — local mock payment (Phase 0)

Prove one real x402 USDC payment settles on Algorand TestNet, on a laptop. No Raspberry Pi.

**Prereqs:** Node 18+, pnpm. See [docs/07](docs/07-prephase-setup-and-mock-plan.md) for the why.

## 0. Install dependencies
```bash
cd setup           && pnpm install && cd ..
cd server          && pnpm install && cd ..
cd consumer/agent  && pnpm install && cd ../..
```

## 1. Create + fund two accounts (one-time)
```bash
node setup/generate.mjs                 # prints SELLER + BUYER (address + mnemonic)
```
- Fund **ALGO** (gas) for both addresses: https://lora.algokit.io/testnet/fund
```bash
node setup/optin.mjs "<seller mnemonic>"
node setup/optin.mjs "<buyer mnemonic>"
```
- Fund **USDC** for both addresses (select *Algorand Testnet*): https://faucet.circle.com
```bash
node setup/balances.mjs <seller address>   # expect ALGO + USDC
node setup/balances.mjs <buyer address>    # expect ALGO + USDC
```

## 2. Configure env
```bash
cp server/.env.template server/.env
cp consumer/agent/.env.template consumer/agent/.env
```
- `server/.env` → set `AVM_ADDRESS` = **seller address**
- `consumer/agent/.env` → set `AVM_MNEMONIC` = **buyer mnemonic** (secret; gitignored)

## 3. Run
```bash
# terminal A — the seller (x402 server)
cd server && pnpm start

# terminal B — the buyer (EV agent)
cd consumer/agent && pnpm start
```

## ✅ Expected
The agent prints `energy granted`, `payment settled`, and a **Lora explorer link**.
Open it → a real USDC transfer **Buyer → Seller** on TestNet. That's Phase 0 done.

> Troubleshooting: `402` with no settle → buyer not opted-in/funded with USDC, or facilitator
> unreachable. Run `node setup/balances.mjs <buyer address>` and check `FACILITATOR_URL`.
