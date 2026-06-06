# setup/ — Algorand TestNet account helpers

Node scripts (using `algosdk`) so the team can create, opt-in, and check accounts without
installing AlgoKit. **TestNet only — funds are free and valueless.**

## Install
```bash
cd setup && pnpm install
```

## Use
```bash
# 1) Generate SELLER + BUYER accounts (prints address + mnemonic)
node generate.mjs

# 2) (after funding ALGO at https://lora.algokit.io/testnet/fund)
#    Opt both accounts into USDC
node optin.mjs "<seller mnemonic>"
node optin.mjs "<buyer mnemonic>"

# 3) (after funding USDC at https://faucet.circle.com → Algorand Testnet)
#    Check balances
node balances.mjs <seller address>
node balances.mjs <buyer address>
```

## Notes
- USDC asset id (TestNet): `10458941`. Override via `USDC_ASSET_ID`.
- Default node: AlgoNode TestNet (`https://testnet-api.algonode.cloud`). Override via `ALGOD_URL`.
- Mnemonics are **secrets** — put the buyer's into `consumer/agent/.env`, never commit it.
