// SAFE read-only diagnostic for a Pera HD (24-word BIP-39) wallet.
// Derives candidate ADDRESSES only — never prints the mnemonic, never signs, never
// touches the network. Compare the printed address to what Pera shows, then delete me.
import { config } from "dotenv";
import { pbkdf2Sync } from "node:crypto";
import { peikertXHdWalletGenerator } from "@algorandfoundation/algokit-utils/crypto";
import { generateAddressWithSigners } from "@algorandfoundation/algokit-utils/transact";

config();

const m = (process.env.AVM_MNEMONIC ?? "").trim().replace(/\s+/g, " ");
const words = m ? m.split(" ") : [];
console.log("AVM_MNEMONIC word count:", words.length, "(Pera HD = 24, legacy single = 25)");
if (!words.length) {
  console.log("→ AVM_MNEMONIC is empty in .env");
  process.exit(1);
}

async function deriveAddr(seed: Uint8Array, account: number, index: number): Promise<string> {
  const { accountGenerator } = await peikertXHdWalletGenerator(seed);
  const generated = await accountGenerator(account, index);
  const aws = generateAddressWithSigners(generated);
  return aws.addr.toString();
}

// Standard BIP-39: mnemonic (NFKD) -> 64-byte PBKDF2-HMAC-SHA512 seed, salt "mnemonic".
const seed64 = new Uint8Array(pbkdf2Sync(m.normalize("NFKD"), "mnemonic", 2048, 64, "sha512"));
const seed32 = seed64.slice(0, 32);

console.log("\n>>> Compare these to the address Pera displays for your account <<<");
console.log("  [A] BIP-39 seed(64B)  account 0 / index 0 :", await deriveAddr(seed64, 0, 0));
console.log("  [A] BIP-39 seed(64B)  account 0 / index 1 :", await deriveAddr(seed64, 0, 1));
console.log("  [A] BIP-39 seed(64B)  account 1 / index 0 :", await deriveAddr(seed64, 1, 0));
console.log("  [B] BIP-39 seed(32B)  account 0 / index 0 :", await deriveAddr(seed32, 0, 0));
console.log("\nWhichever line matches Pera tells us the exact derivation to wire in.");
