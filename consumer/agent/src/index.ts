// Energy BUYER — autonomous EV agent (x402 client).
// Requests energy from the seller's server; x402 transparently pays in USDC on
// Algorand TestNet, signing with the buyer's mnemonic.
//
// Verified against algorandfoundation/x402-demo (x402 v2.11.0).
//
// Phase 0/1: a single one-shot purchase. The state-machine loop (IDLE→EVAL→PAY→
// CHARGING) and dynamic pricing come in Phase 2.

import { config } from "dotenv";
import { x402Client, wrapFetchWithPayment, x402HTTPClient } from "@x402/fetch";
import { toClientAvmSigner } from "@x402/avm";
import { ExactAvmScheme } from "@x402/avm/exact/client";
import {
  ed25519SigningKeyFromWrappedSecret,
  type WrappedEd25519Seed,
} from "@algorandfoundation/algokit-utils/crypto";
import { seedFromMnemonic } from "@algorandfoundation/algokit-utils/algo25";

config();

const avmMnemonic = process.env.AVM_MNEMONIC;
const baseURL = process.env.RESOURCE_SERVER_URL ?? "http://localhost:4021";
const endpointPath = process.env.ENDPOINT_PATH ?? "/energy/buy";
const url = `${baseURL}${endpointPath}`;

if (!avmMnemonic || avmMnemonic.includes("PASTE")) {
  console.error("❌ AVM_MNEMONIC (buyer 25-word mnemonic) is required in consumer/agent/.env");
  process.exit(1);
}

// Convert a standard 25-word Algorand mnemonic into the base64 secret key the
// AVM signer expects (seed || pubkey). Lifted from the official demo.
async function getSecretKeyFromMnemonic(mnemonic: string): Promise<string> {
  const seed = seedFromMnemonic(mnemonic);
  const seedCopy = new Uint8Array(seed);
  const wrappedSeed: WrappedEd25519Seed = {
    unwrapEd25519Seed: async () => seed,
    wrapEd25519Seed: async () => {},
  };
  const wrappedSecret = await ed25519SigningKeyFromWrappedSecret(wrappedSeed);
  return Buffer.concat([
    Buffer.from(seedCopy),
    Buffer.from(wrappedSecret.ed25519Pubkey),
  ]).toString("base64");
}

async function main(): Promise<void> {
  const secretKey = await getSecretKeyFromMnemonic(avmMnemonic as string);
  const avmSigner = toClientAvmSigner(secretKey);

  const client = new x402Client().register("algorand:*", new ExactAvmScheme(avmSigner));
  console.info(`🔌 EV agent (buyer): ${avmSigner.address}`);
  console.log(`→ requesting energy from ${url}\n`);

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  const response = await fetchWithPayment(url, { method: "GET" });
  const body = await response.json();

  if (!response.ok) {
    console.log(`❌ no payment settled (status ${response.status}):`, body);
    process.exit(1);
  }

  console.log("✅ energy granted:", body);

  const settle = new x402HTTPClient(client).getPaymentSettleResponse(name =>
    response.headers.get(name),
  );
  console.log("\n💸 payment settled:", JSON.stringify(settle, null, 2));

  // Best-effort: surface the tx id as a clickable explorer link.
  const s = settle as Record<string, unknown> | null;
  const txId =
    (s?.["transaction"] as string | undefined) ??
    (s?.["txId"] as string | undefined) ??
    (s?.["txID"] as string | undefined);
  if (txId) {
    console.log(`\n🔗 explorer: https://lora.algokit.io/testnet/tx/${txId}`);
  } else {
    console.log("\n🔗 explorer: https://lora.algokit.io/testnet  (find the tx id above)");
  }
}

main().catch(error => {
  console.error(error?.response?.data?.error ?? error);
  process.exit(1);
});
