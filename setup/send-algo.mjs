// Send ALGO from one account to another on TestNet.
// Handy when the faucet rate-limits you: fund one account, then top up the other.
//
//   node setup/send-algo.mjs "<sender mnemonic>" <receiver address> <amount in ALGO>
//
import algosdk from "algosdk";

const ALGOD = process.env.ALGOD_URL ?? "https://testnet-api.algonode.cloud";

const mnemonic = (process.argv[2] ?? "").trim();
const to = process.argv[3];
const amountAlgo = Number(process.argv[4] ?? "0");

if (!mnemonic || !to || !amountAlgo) {
  console.error('Usage: node setup/send-algo.mjs "<sender mnemonic>" <receiver address> <amount in ALGO>');
  process.exit(1);
}

const { addr, sk } = algosdk.mnemonicToSecretKey(mnemonic);
const client = new algosdk.Algodv2("", ALGOD, "");

const sp = await client.getTransactionParams().do();
const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
  from: addr,
  to,
  amount: Math.round(amountAlgo * 1e6), // ALGO -> microAlgos
  suggestedParams: sp,
});
const signed = txn.signTxn(sk);
const { txId } = await client.sendRawTransaction(signed).do();
console.log(`Sent ${amountAlgo} ALGO: ${addr} -> ${to}  (tx ${txId})`);
await algosdk.waitForConfirmation(client, txId, 4);
console.log(`✅ confirmed: https://lora.algokit.io/testnet/tx/${txId}`);
