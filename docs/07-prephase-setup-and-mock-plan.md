# Pre-Phase Setup & Local Mock-Payment Plan

> **Audience:** the whole team. Read this before we touch the Raspberry Pi or the energy logic.
> **Goal of this stage:** prove that **one real x402 payment settles on Algorand TestNet**, running
> entirely on a laptop. Nothing else (hardware, dashboard, pricing) matters until this works.
>
> This is "Phase 0" — it comes *before* the implementation phases in
> [../specs/plan.md](../specs/plan.md).

---

## 1. What we're building (the 10-second version)

An EV agent that **autonomously buys solar energy from a neighbor and pays per-kWh in stablecoin
(USDC) on Algorand**, under Germany's new §42c energy-sharing law. Before the full system, we first
prove the **payment rail** with a minimal local demo.

## 2. Mental model — who is who

The system has **two Algorand accounts (wallets)**. Each is attached to one program:

| Account (wallet) | Program / role | Holds | Why |
|---|---|---|---|
| **Seller** (neighbor's house / producer) | **The SERVER** (`src/x402/server/`, Hono) — returns "402 Payment Required", *receives* money | only its **public address** | The server never signs a spend; it just says "pay to this address" |
| **Buyer** (your EV / consumer) | **The CLIENT / agent** (`src/x402/client/`) — *pays* | the **25-word mnemonic** | Only the payer needs to sign the transaction |

**Key points everyone should internalise:**
- x402 runs on plain HTTP: a **client** requests a URL → the **server** demands payment → client
  attaches payment → server returns the resource. So **Seller = server, Buyer = client.**
- The **seller's address is public** (safe to share). The **buyer's mnemonic is secret** (lives in
  `.env`, never committed — `.gitignore` already blocks it).
- The **money** is a real stablecoin transfer (**USDC**, TestNet asset id `10458941`). **ALGO** is
  only the network fee (gas). EURQ (digital €) is a later bonus-track swap.
- We **do not** build a facilitator or run our own blockchain. We point at the **hosted facilitator**
  and settle on **public TestNet** (free, valueless tokens, but real on-chain txs we can show).

```
   LAPTOP (localhost)                              ALGORAND TESTNET (public chain)
 ┌──────────────────────────┐
 │ Consumer Agent = BUYER    │  GET /energy/buy
 │  (buyer MNEMONIC, signs)  │ ───────────────►   ┌─────────────────────────┐
 │                           │ ◄── 402 "pay $X" ──│ Hono server = SELLER     │
 │                           │  retry + X-PAYMENT │  (seller ADDRESS only)   │
 │                           │ ───────────────►   └──────────┬──────────────┘
 └──────────────────────────┘                               │ verify + settle
                                                             ▼
                                              GoPlausible Facilitator (hosted, fixed URL)
                                                             │  submits USDC transfer
                                                             ▼
                                          USDC moves  BUYER ➜ SELLER  on TestNet
                                                 (clickable on Lora explorer)
```

## 3. Fixed IDs / constants (given by organizers — TestNet, free)

| Value | Meaning |
|---|---|
| `algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=` | Network id = **Algorand TestNet** |
| `10458941` | **USDC** asset id (ASA) on TestNet — the payment token |
| `https://facilitator.goplausible.xyz` | **Facilitator** — verifies + settles payments (we just point at it) |
| `https://lora.algokit.io/testnet/fund` | Free **ALGO** faucet (gas) |
| `https://faucet.circle.com` | Free **USDC** faucet (select *Algorand Testnet*) |
| `https://lora.algokit.io/testnet` | Block explorer (proof of settled txs) |

## 4. Verified SDK (x402 **v2.11.0**, from the official `algorandfoundation/x402-demo`)

> NOTE: this **supersedes API names guessed in early planning docs** (e.g. there is no custom
> `verifyPayment()/settlePayment()` handler in the basic flow — the server uses `paymentMiddleware`).

- **Server packages:** `@x402/hono`, `@x402/core`, `@x402/avm`, `hono`, `@hono/node-server`, `dotenv`
- **Client packages:** `@x402/fetch`, `@x402/avm`, `@x402/core`, `@algorandfoundation/algokit-utils`, `dotenv`
- **Server env:** `SELLER_ADDRESS` (seller address), `FACILITATOR_URL`, `PORT` (default 4021)
- **Client env:** `BUYER_MNEMONIC` (buyer 25-word phrase), `SERVER_URL`, `ENDPOINT_PATH`
- Official examples may use `AVM_ADDRESS`, `AVM_MNEMONIC`, or `RESOURCE_SERVER_URL`; our repo
  normalizes to `SELLER_ADDRESS`, `BUYER_MNEMONIC`, and `SERVER_URL`.
- **Price format:** a string like `"$0.01"`. The facilitator maps `$` → TestNet USDC, so we likely
  don't even hardcode the asset id for the happy path.

---

## 5. Pre-phase setup — the actual tasks

### 5a. Create + fund the two wallets (one person can do this for the team)

1. **Create 2 TestNet accounts** — "Seller" and "Buyer-Agent".
   - Option A (visual): **Pera Wallet** (perawallet.app) or **Lute** web wallet → create both,
     save each 25-word passphrase.
   - Option B (fastest, no app): run a generate helper script (Node + `algosdk`, no AlgoKit
     install needed). *(To be written — see "What we'll build".)*
2. **Fund ALGO (gas):** paste each address at `https://lora.algokit.io/testnet/fund`.
3. **Opt in to USDC** (required before an account can receive USDC): add asset id `10458941` to each
   account (Pera "Add asset", or an opt-in helper script). *(Costs a tiny ALGO fee — fund first.)*
4. **Fund USDC:** at `https://faucet.circle.com` (select Algorand Testnet), ~10 USDC to each address.
5. **Verify** both accounts on `https://lora.algokit.io/testnet` (ALGO + USDC visible).

**Outputs to capture (this is what unblocks coding):**
- Seller **address** → safe to share; goes in `src/x402/server/.env` as `SELLER_ADDRESS`.
- Buyer **25-word mnemonic** → ⚠️ **secret**; goes in `src/x402/client/.env` as `BUYER_MNEMONIC`.
  Do **not** paste it in chat/Slack — put it directly in the `.env`. (TestNet key = no real value,
  but keep the habit.)

### 5b. Local mock-payment milestone (the 3 sub-steps)

| Step | What | Why |
|---|---|---|
| **0** | Run the **official demo's** Hono server + fetch client as-is, with our funded accounts. Get the sample resource back + a **settled tx on Lora**. | Proves SDK + facilitator + wallets all work, isolated from our code. **This is the real first milestone.** |
| **1** | Fork the demo into **our** `src/x402/server/` (route `GET /energy/buy`, returns `{granted_kwh, price_paid, tx_id}`, fixed price) + **our** one-shot `src/x402/client/`. | Our names, still simplest possible. |
| **2** | Add mock "producer state" (solar/battery/price in memory — the Pi's job, faked on laptop), the **pricing formula**, and the agent **state machine** (IDLE→EVAL→PAY→CHARGING) + budget cap + re-buy. | Makes it *agentic & dynamic*, still no hardware. |

**Known technical risk (flagged early):** the demo prices payments **statically** in
`paymentMiddleware`; our price is **dynamic** (varies with kWh + surplus). Step 2 needs either a
per-request price or the lower-level resource-server API. **Steps 0–1 don't depend on it**, so we
prove payments first, then solve dynamic pricing.

After Step 2 works on the laptop → move the producer onto the **Raspberry Pi** (Phases 2–6 in doc 06).

---

## 6. What we'll build for this stage (so the team knows the deliverables)

- Optional setup helpers — `generate` + `optin` scripts (Node/`algosdk`) if account creation needs automation.
- `src/x402/server/` — minimal Hono x402 server (from the verified v2.11.0 pattern) + `.env.template`.
- `src/x402/client/` — minimal x402 client/agent + `.env.template`.
- Short `RUN.md` — exact commands to reproduce the settled payment.

## 7. Definition of done (Phase 0)

- ✅ Two funded TestNet accounts (ALGO + USDC), both opted into USDC.
- ✅ Running our `src/x402/server/` + `src/x402/client/` on the laptop produces a **real USDC payment from
  Buyer → Seller**, settled on TestNet.
- ✅ The transaction is **viewable on the Lora explorer** (this link is the demo proof).

## 8. Who needs what / suggested split for this stage

- **1 person:** create + fund + opt-in the 2 wallets (§5a), share the seller address, put the buyer
  mnemonic in `.env`.
- **1 person (+ AI):** scaffold `src/x402/server/`, `src/x402/client/`, and any needed setup helpers, then run Steps 0–1.
- **Everyone else:** read this doc + skim the official demo (`algorandfoundation/x402-demo`,
  `x402-examples/server/hono` and `x402-examples/client/fetch`) so we share the same mental model
  before we parallelise into the 6 build phases.
