# How the Transaction Works — End-to-End Flow

A walkthrough of everything that happens to make one autonomous energy payment, using the
**real Phase 0 demo** as the running example. Read this to understand how the pieces connect.

## There are TWO layers — keep them separate in your head

| Layer | What it is | Who/what does it | Depends on x402? |
|---|---|---|---|
| **1. Accounts & money** | Blockchain identities + balances (ALGO for gas, USDC to spend) | You, manually, with `setup/` scripts + faucets | ❌ No — pure Algorand |
| **2. x402 protocol** | The HTTP "pay-to-access" handshake between buyer & seller | Our `server/` + `consumer/agent/` code | ✅ Yes — the `@x402/*` SDK |

Layer 2 **uses** the accounts from Layer 1. You can't do the x402 payment until Layer 1 exists
(funded, opted-in accounts). That's why we set up wallets first.

---

## Layer 1 — accounts & money (what you did manually)

This is plain Algorand; no x402 involved yet.

| Step | Command / action | What it does on-chain |
|---|---|---|
| 1. Create keys | `node setup/generate.mjs` | Generates 2 keypairs **locally** (address = public, mnemonic = secret). Chain doesn't know them yet. |
| 2. Fund ALGO | Lora faucet + `setup/send-algo.mjs` | First funding **creates the account on-chain**. ALGO pays the 0.1 min-balance + tx fees. |
| 3. Opt-in USDC | `node setup/optin.mjs "<mnemonic>"` | A 0-amount self-transfer that lets the account **hold** USDC (Algorand requires opt-in per token). |
| 4. Fund USDC | Circle faucet → buyer | Puts the **spendable money** in the buyer's wallet. |
| 5. Verify | `node setup/balances.mjs <address>` | Reads live chain state (ALGO + USDC). |

After this: **buyer** = `53IZ…JRJSRQ` (had 20 USDC), **seller** = `LSVA…BNGNBM` (opted in, 0 USDC).

> These `setup/` scripts are **ours** (written with `algosdk`). The demo repo assumes you *already*
> have funded accounts, so it doesn't include them — we added them for convenience.

---

## Layer 2 — the x402 protocol (the code we built)

### Where this code came from
We cloned the official **`algorandfoundation/x402-demo`** (x402 **v2.11.0**) and adapted two examples:

| Our file | Adapted from | Changes |
|---|---|---|
| `server/src/index.ts` | `x402-demo/x402-examples/server/hono/index.ts` | route `/weather` → `/energy/buy`; added free `/health`; energy JSON; price from env |
| `consumer/agent/src/index.ts` | `x402-demo/x402-examples/client/fetch/index.ts` | endpoint → `/energy/buy`; added explorer link; same signer + `wrapFetchWithPayment` |

So the payment logic is the **proven reference implementation**, not invented by us. We just renamed
the product from "weather data" to "energy."

### The handshake (what happens when the agent buys)

```
BUYER (consumer/agent)                 SELLER (server)                 FACILITATOR + TESTNET
       │                                     │                                  │
  (1)  │ ── GET /energy/buy ───────────────► │                                  │
       │                                     │                                  │
  (2)  │ ◄── 402 Payment Required ────────── │   body: { scheme:"exact",        │
       │     "you must pay $0.01"            │           network:TestNet,       │
       │                                     │           payTo: SELLER addr,    │
       │                                     │           asset: USDC }          │
       │                                     │                                  │
  (3)  │ build USDC transfer (buyer→seller,  │                                  │
       │ 0.01) and SIGN it with buyer's key  │                                  │
       │ (mnemonic from agent/.env)          │                                  │
       │                                     │                                  │
  (4)  │ ── GET /energy/buy + X-PAYMENT ───► │ ── verify + settle ────────────► │
       │     (signed payment in header)      │                                  │ (5) submit asset
       │                                     │ ◄── settled, tx id ───────────── │     transfer to chain
       │                                     │                                  │     (~3s, confirmed
  (6)  │ ◄── 200 OK + energy JSON ────────── │                                  │      in a block)
       │     + settlement (tx id)            │                                  │
       │                                     │                                  │
  (7)  │ print Lora explorer link            │                                  │
```

**Step by step:**
1. **Agent requests** the resource (`GET /energy/buy`) — no payment yet.
2. **Server replies `402 Payment Required`** with the *payment requirements*: scheme `exact`, the
   network (TestNet CAIP-2), `payTo` = seller's address, price `$0.01` (mapped to USDC).
3. **Agent builds + signs** the USDC transfer (buyer → seller) using the buyer's private key
   derived from the mnemonic. *Nothing is on-chain yet — it's a signed, ready-to-submit payment.*
4. **Agent retries** the same request with the signed payment in the **`X-PAYMENT`** header.
5. **Server → facilitator → chain:** the server forwards the payment to the hosted **facilitator**
   (`facilitator.goplausible.xyz`), which **verifies** it and **settles** it by submitting the asset
   transfer to TestNet. Validators confirm it in a block (~3s). *(Fee was sponsored — buyer paid 0.)*
6. **Server returns `200 OK`** + the energy data + the settlement info (the **tx id**).
7. **Agent prints** the Lora explorer link to the real transaction.

### How Layer 2 uses Layer 1
- Buyer's **mnemonic** (`consumer/agent/.env` → `AVM_MNEMONIC`) → signs the payment in step 3.
- Seller's **address** (`server/.env` → `AVM_ADDRESS`) → the `payTo` in step 2.
- **USDC asset** (`10458941`) + **TestNet** (CAIP-2) → the rails the transfer runs on.
- The buyer's **USDC balance** → the money that actually moves.

---

## The proof (Phase 0 result)

- Settled tx: `NL2FAXW72GC2BBBCM3D2T5DAHDBN36IY3L6JLLJ66SJOATXXPH2A`
- On-chain: `axfer`, asset `10458941`, amount `10000` (= 0.01 USDC), buyer → seller, confirmed block `64103805`.
- Balances moved: buyer `20 → 19.99`, seller `0 → 0.01`.
- Verify yourself: `curl -s https://testnet-idx.algonode.cloud/v2/transactions/<txid> | python3 -m json.tool`
  or open https://lora.algokit.io/testnet/tx/NL2FAXW72GC2BBBCM3D2T5DAHDBN36IY3L6JLLJ66SJOATXXPH2A

## One-line mental model

> **Layer 1** gives the agents wallets with money. **Layer 2 (x402)** is the HTTP handshake where a
> server says "pay first," the agent signs a stablecoin payment, a facilitator settles it on
> Algorand, and only then is the resource returned — all with no human in the loop.
