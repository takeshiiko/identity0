#!/usr/bin/env node
/**
 * Creates the unrevealed metadata JSON, pins it to IPFS, and calls setUnrevealedURI.
 *
 * Usage:
 *   node scripts/set-unrevealed-uri.mjs
 *
 * Requires in .env:
 *   PINATA_JWT
 *   OPERATOR_PRIVATE_KEY (or owner key)
 *   ETH_SEPOLIA_RPC_URL
 *   CONTRACT_ADDRESS
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const CONTRACT    = process.env.CONTRACT_ADDRESS ?? "0xC87eBF55F27fa5B0fC415d93B24d30590f7bF390";
const RPC         = process.env.ETH_SEPOLIA_RPC_URL;
const OWNER_KEY   = process.env.OPERATOR_PRIVATE_KEY; // owner can call setUnrevealedURI
const PINATA_JWT  = process.env.PINATA_JWT;

// The PNG already pinned on Pinata — use its CID directly
const UNREVEALED_IMAGE_CID = "bafkreiehth2c2lsxqiig2nsgfszypwtebs25gbpohuwa3j4siq2czubssu";

const UNREVEALED_METADATA = {
  name: "Kandinsky — Unrevealed",
  description: "This portrait is still generating. Your wallet's unique Bauhaus identity will be revealed soon.",
  image: `ipfs://${UNREVEALED_IMAGE_CID}`,
  attributes: [
    { trait_type: "Status", value: "Unrevealed" }
  ]
};

if (!PINATA_JWT) {
  console.error("❌  PINATA_JWT is not set in .env");
  console.error("    → https://app.pinata.cloud/developers/api-keys");
  process.exit(1);
}

if (!OWNER_KEY || !RPC) {
  console.error("❌  OPERATOR_PRIVATE_KEY or ETH_SEPOLIA_RPC_URL missing in .env");
  process.exit(1);
}

async function pinJSON(obj, name) {
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PINATA_JWT}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ pinataContent: obj, pinataMetadata: { name } })
  });
  if (!res.ok) throw new Error(`Pinata error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.IpfsHash;
}

async function setUnrevealedURI(uri) {
  const { createPublicClient, createWalletClient, getContract, http, parseAbi } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { sepolia } = await import("viem/chains");

  const account   = privateKeyToAccount(OWNER_KEY);
  const transport = http(RPC);
  const pubClient = createPublicClient({ chain: sepolia, transport });
  const walClient = createWalletClient({ account, chain: sepolia, transport });

  const contract = getContract({
    address: CONTRACT,
    abi: parseAbi(["function setUnrevealedURI(string uri) external"]),
    client: { public: pubClient, wallet: walClient }
  });

  const hash = await contract.write.setUnrevealedURI([uri]);
  console.log(`  tx: ${hash}`);
  await pubClient.waitForTransactionReceipt({ hash });
  return hash;
}

async function main() {
  console.log("\n══════════════════════════════════════");
  console.log("  Set Unrevealed URI");
  console.log("══════════════════════════════════════");
  console.log("\nMetadata:");
  console.log(JSON.stringify(UNREVEALED_METADATA, null, 2));

  console.log("\n[1] Pinning metadata JSON to IPFS…");
  const cid = await pinJSON(UNREVEALED_METADATA, "kandinsky-unrevealed.json");
  const uri = `ipfs://${cid}`;
  console.log(`    CID: ${cid}`);
  console.log(`    URI: ${uri}`);
  console.log(`    Preview: https://ipfs.io/ipfs/${cid}`);

  console.log("\n[2] Calling setUnrevealedURI on contract…");
  const tx = await setUnrevealedURI(uri);
  console.log(`    ✓ Done!`);

  console.log("\n══════════════════════════════════════");
  console.log("  All unrevealed tokens now show the");
  console.log("  mystery portrait on OpenSea / Etherscan.");
  console.log(`\n  Etherscan NFT:`);
  console.log(`  https://sepolia.etherscan.io/nft/${CONTRACT}/1`);
  console.log("══════════════════════════════════════\n");
}

main().catch(err => {
  console.error("\n❌  Fatal:", err.message);
  process.exit(1);
});
