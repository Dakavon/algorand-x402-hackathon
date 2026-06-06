// Opt an account into the TestNet USDC asset (required before it can hold/receive USDC).
// An ASA opt-in is a 0-amount transfer of the asset to yourself.
//
//   node setup/optin.mjs "<25-word mnemonic>"
//
// Env overrides: USDC_ASSET_ID (default 10458941), ALGOD_URL (default AlgoNode TestNet).
import algosdk from "algosdk";

const USDC = Number(process.env.USDC_ASSET_ID ?? 10458941);
const ALGOD = process.env.ALGOD_URL ?? "https://testnet-api.algonode.cloud";

const mnemonic = (process.argv[2] ?? process.env.MNEMONIC ?? "").trim();
if (!mnemonic) {
  console.error('Usage: node setup/optin.mjs "<25-word mnemonic>"');
  process.exit(1);
}

const { addr, sk } = algosdk.mnemonicToSecretKey(mnemonic);
const client = new algosdk.Algodv2("", ALGOD, "");

try {
  const sp = await client.getTransactionParams().do();
  const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
    from: addr,
    to: addr,
    assetIndex: USDC,
    amount: 0,
    suggestedParams: sp,
  });
  const signed = txn.signTxn(sk);
  const { txId } = await client.sendRawTransaction(signed).do();
  console.log(`Opt-in submitted: ${txId}  (account ${addr})`);
  await algosdk.waitForConfirmation(client, txId, 4);
  console.log(`✅ ${addr} is now opted into USDC (asset ${USDC}).`);
} catch (err) {
  const msg = String(err?.message ?? err);
  if (msg.includes("already") || msg.includes("has already opted in")) {
    console.log(`ℹ️  ${addr} is already opted into USDC (asset ${USDC}).`);
  } else if (msg.includes("overspend") || msg.includes("below min") || msg.includes("balance")) {
    console.error(`❌ ${addr} needs TestNet ALGO first. Fund at https://lora.algokit.io/testnet/fund`);
    process.exit(1);
  } else {
    console.error("❌ Opt-in failed:", msg);
    process.exit(1);
  }
}
