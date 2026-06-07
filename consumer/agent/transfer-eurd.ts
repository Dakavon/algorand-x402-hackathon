// One-off MAINNET proof: sign a 0.01 EURD self-transfer with the 24-word Pera HD wallet.
// Derives the signer exactly the way we'll wire into the agent, then sends on mainnet.
import { config } from "dotenv";
import { pbkdf2Sync } from "node:crypto";
import { peikertXHdWalletGenerator } from "@algorandfoundation/algokit-utils/crypto";
import { generateAddressWithSigners } from "@algorandfoundation/algokit-utils/transact";
import { AlgorandClient } from "@algorandfoundation/algokit-utils";

config();

const ALGOD = "https://mainnet-api.4160.nodely.dev"; // force MAINNET (ignore testnet ALGOD_URL in .env)
const ALGOD_TOKEN = process.env.ALGOD_TOKEN ?? "";
const EURD_ID = 1221682136n;
const ACCOUNT = "HYHQP6GEYGBAGYJ4VOYBV7S6WGQC3TPBRVLIGWIU755N7RGQ6IOJCJ3QSA";

// 1) Derive the signer from the 24-word BIP-39 HD mnemonic (BIP-39 PBKDF2 seed -> peikertX).
const m = (process.env.AVM_MNEMONIC ?? "").trim().replace(/\s+/g, " ");
const seed64 = new Uint8Array(pbkdf2Sync(m.normalize("NFKD"), "mnemonic", 2048, 64, "sha512"));
const { accountGenerator } = await peikertXHdWalletGenerator(seed64);
const generated = await accountGenerator(0, 0);
const aws = generateAddressWithSigners(generated);
const address = aws.addr.toString();
console.log("🔑 derived signer address:", address);
if (address !== ACCOUNT) {
  console.error("✗ derived address ≠ expected funded account — aborting (won't sign as the wrong key)");
  process.exit(1);
}

// 2) Figure out EURD decimals so 0.01 EURD is the right base-unit amount.
const assetResp = await fetch(`${ALGOD}/v2/assets/${EURD_ID}`,
  ALGOD_TOKEN ? { headers: { "X-Algo-API-Token": ALGOD_TOKEN } } : undefined);
const assetJson = (await assetResp.json()) as { params?: { decimals?: number; "unit-name"?: string } };
const decimals = Number(assetJson?.params?.decimals ?? 2);
const unit = assetJson?.params?.["unit-name"] ?? "EURD";
let amount = BigInt(Math.round(0.01 * 10 ** decimals)); // 0.01 EURD in base units
if (amount < 1n) amount = 1n;
console.log(`💶 asset ${EURD_ID} (${unit}) decimals=${decimals} → 0.01 ${unit} = ${amount} base units`);

// 3) Mainnet client + register the HD signer, then send the self-transfer.
const algorand = AlgorandClient.fromConfig({ algodConfig: { server: ALGOD, token: ALGOD_TOKEN } });
algorand.account.setSigner(aws.addr, aws.signer);

console.log("📡 submitting 0.01", unit, "self-transfer on MAINNET…");
let lastErr: unknown;
for (let attempt = 1; attempt <= 4; attempt++) {
  try {
    const result: any = await algorand.send.assetTransfer({
      sender: address,
      receiver: ACCOUNT,
      assetId: EURD_ID,
      amount,
    });
    const txId = result?.txIds?.[0] ?? result?.txId ?? result?.transaction?.txID?.();
    console.log("\n✅ SIGNED & SUBMITTED by the 24-word HD wallet. tx id:");
    console.log("   " + txId);
    console.log("   https://lora.algokit.io/mainnet/tx/" + txId);
    process.exit(0);
  } catch (e) {
    lastErr = e;
    const msg = e instanceof Error ? e.message : String(e);
    if (/\b(403|429|5\d\d)\b|params|rate|ECONN|ETIMEDOUT|fetch failed/i.test(msg) && attempt < 4) {
      const backoff = 500 * 2 ** (attempt - 1);
      console.log(`   node throttled (attempt ${attempt}/4) — retrying in ${backoff}ms`);
      await new Promise(r => setTimeout(r, backoff));
      continue;
    }
    break;
  }
}
console.error("\n✗ send failed:", lastErr instanceof Error ? lastErr.message : lastErr);
process.exit(1);
