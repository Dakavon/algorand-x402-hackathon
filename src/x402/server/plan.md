# x402 Server Plan

Source authority: `specs/plan.md`, `specs/backend-design-spec.md`, and
`docs/07-prephase-setup-and-mock-plan.md` for Phase 0.

## Role

TypeScript/Hono resource server that turns producer state into an x402-protected `/energy/buy`
resource, logs settled payments, and aggregates dashboard APIs.

## Runtime

- Path: `src/x402/server`
- Port: `4021`
- Env: `SELLER_ADDRESS`, `FACILITATOR_URL`, `PI_URL`, `AGENT_URL`
- Payment asset: TestNet USDC ASA `10458941`
- Facilitator: `https://facilitator.goplausible.xyz`

## Phase 0

Start with the verified official x402 flow from `docs/07-prephase-setup-and-mock-plan.md`: fixed
price, hosted facilitator, real settled TestNet USDC transaction, Lora proof.

## Target Endpoints

- `GET /status`: cached producer status
- `GET /energy/buy?kwh=1`: x402-protected purchase endpoint
- `GET /api/snapshot`: dashboard aggregate
- `GET /api/history?minutes=10`: normalized producer history
- `GET /api/events?limit=100`: agent/payment events
- `GET /api/payments`: settled payment rows from JSONL
- `GET /api/health`: service health

## Dynamic Pricing Target

After Phase 0 succeeds, compute `price_usdc = kwh * price_per_kwh` from cached producer state at
challenge time. If x402 middleware cannot express per-request requirements, use the lower-level SDK
path confirmed during implementation.

## Boundary

The server holds only the seller public address. It must not hold the buyer mnemonic. It calls
`src/raspberrypi` `/consume` only after x402 settlement succeeds.
