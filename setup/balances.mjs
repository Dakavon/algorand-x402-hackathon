// Show ALGO + USDC balance for an address on Algorand TestNet.
//
//   node setup/balances.mjs <address>
//
import algosdk from "algosdk";

const USDC = Number(process.env.USDC_ASSET_ID ?? 10458941);
const ALGOD = process.env.ALGOD_URL ?? "https://testnet-api.algonode.cloud";

const addr = process.argv[2];
if (!addr) {
  console.error("Usage: node setup/balances.mjs <address>");
  process.exit(1);
}

const client = new algosdk.Algodv2("", ALGOD, "");
const info = await client.accountInformation(addr).do();

const algo = Number(info.amount) / 1e6;
const usdcAsset = (info.assets ?? []).find(a => Number(a["asset-id"]) === USDC);

console.log(`Account : ${addr}`);
console.log(`ALGO    : ${algo}`);
console.log(`USDC    : ${usdcAsset ? Number(usdcAsset.amount) / 1e6 : "NOT opted in"}`);
console.log(`Explorer: https://lora.algokit.io/testnet/account/${addr}`);
