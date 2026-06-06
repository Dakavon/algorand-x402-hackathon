// Energy SELLER — Hono x402 server.
// Sells solar energy per kWh; payment is settled in USDC on Algorand TestNet
// by the hosted facilitator. The server only knows the seller's PUBLIC address.
//
// Verified against algorandfoundation/x402-demo (x402 v2.11.0).

import { config } from "dotenv";
import { paymentMiddleware, x402ResourceServer } from "@x402/hono";
import { ExactAvmScheme } from "@x402/avm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { Hono } from "hono";
import { serve } from "@hono/node-server";

config();

// Algorand TestNet network id (CAIP-2), provided by the organizers.
const NETWORK = "algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=" as const;

const avmAddress = process.env.AVM_ADDRESS;
const facilitatorUrl = process.env.FACILITATOR_URL;
const port = Number(process.env.PORT ?? 4021);
const pricePerKwhUsd = process.env.PRICE_PER_KWH_USD ?? "0.01";
const KWH_PER_PURCHASE = 1;

if (!avmAddress || avmAddress.includes("PASTE")) {
  console.error("❌ AVM_ADDRESS (seller address) is required in server/.env");
  process.exit(1);
}
if (!facilitatorUrl) {
  console.error("❌ FACILITATOR_URL is required in server/.env");
  process.exit(1);
}

const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });

const accepts = [
  {
    scheme: "exact",
    price: `$${pricePerKwhUsd}`,
    network: NETWORK,
    payTo: avmAddress,
  },
];

const server = new x402ResourceServer(facilitatorClient).register(
  NETWORK,
  new ExactAvmScheme(),
);

const app = new Hono();

// Free: health/status (no payment).
app.get("/health", c =>
  c.json({
    ok: true,
    role: "seller",
    network: NETWORK,
    price_per_kwh_usd: pricePerKwhUsd,
    pay_to: avmAddress,
  }),
);

// Paywalled: buying energy requires an x402 payment.
app.use(
  paymentMiddleware(
    {
      "GET /energy/buy": {
        accepts,
        description: "Buy solar energy (per kWh), settled in USDC on Algorand",
        mimeType: "application/json",
      },
    },
    server,
  ),
);

app.get("/energy/buy", c =>
  c.json({
    granted_kwh: KWH_PER_PURCHASE,
    price_paid_usd: pricePerKwhUsd,
    asset: "USDC",
    network: NETWORK,
    timestamp: new Date().toISOString(),
  }),
);

serve({ fetch: app.fetch, port });

console.log(`⚡ Energy seller (x402 server) listening at http://localhost:${port}`);
console.log(`   pay-to : ${avmAddress}`);
console.log(`   price  : $${pricePerKwhUsd}/kWh`);
console.log(`   facil. : ${facilitatorUrl}`);
