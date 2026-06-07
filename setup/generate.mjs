// Generate two Algorand TestNet accounts: SELLER (producer) and BUYER (EV agent).
// Prints address + 25-word mnemonic for each. The mnemonics are SECRETS.
//
//   node setup/generate.mjs
//
import algosdk from "algosdk";

function make(label) {
  const a = algosdk.generateAccount();
  return { label, address: a.addr, mnemonic: algosdk.secretKeyToMnemonic(a.sk) };
}

const accounts = [
  make("SELLER (producer / x402 server)"),
  make("BUYER  (EV agent / x402 client)"),
];

console.log("\n=== Generated Algorand TestNet accounts ===");
console.log("⚠️  The mnemonics below are SECRETS — do not paste them into chat/Slack.\n");
for (const a of accounts) {
  console.log(`# ${a.label}`);
  console.log(`address : ${a.address}`);
  console.log(`mnemonic: ${a.mnemonic}\n`);
}

console.log("NEXT STEPS");
console.log("1) Fund ALGO  : https://lora.algokit.io/testnet/fund   (paste EACH address)");
console.log('2) Opt-in USDC: node setup/optin.mjs "<mnemonic>"      (run for BOTH accounts)');
console.log("3) Fund USDC  : https://faucet.circle.com              (select Algorand Testnet)");
console.log("4) Verify     : node setup/balances.mjs <address>      (both should show ALGO + USDC)\n");
console.log("THEN PUT");
console.log("  SELLER address  -> src/x402/server/.env   as SELLER_ADDRESS");
console.log("  BUYER  mnemonic -> src/x402/client/.env   as BUYER_MNEMONIC   (never commit)\n");
