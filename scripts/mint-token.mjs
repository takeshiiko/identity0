#!/usr/bin/env node
/**
 * Mint a Kandinsky token directly via script.
 * Usage:
 *   node scripts/mint-token.mjs [recipientAddress]
 *
 * If no recipient given, mints to the OPERATOR wallet.
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const CONTRACT   = process.env.CONTRACT_ADDRESS ?? "0xC87eBF55F27fa5B0fC415d93B24d30590f7bF390";
const RPC        = process.env.ETH_SEPOLIA_RPC_URL;
const MINTER_KEY = process.env.OPERATOR_PRIVATE_KEY;

if (!RPC || !MINTER_KEY) {
  console.error("❌  ETH_SEPOLIA_RPC_URL veya OPERATOR_PRIVATE_KEY eksik");
  process.exit(1);
}

async function main() {
  const { createPublicClient, createWalletClient, getContract, http, parseAbi, parseEther, formatEther } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { sepolia } = await import("viem/chains");

  const account   = privateKeyToAccount(MINTER_KEY);
  const transport = http(RPC);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({ account, chain: sepolia, transport });

  const abi = parseAbi([
    "function mint() external payable",
    "function mintPrice() external view returns (uint256)",
    "function totalSupply() external view returns (uint256)",
    "function mintedByWallet(address) external view returns (uint256)",
    "event TokenMinted(address indexed to, uint256 indexed tokenId)"
  ]);

  const contract = getContract({ address: CONTRACT, abi, client: { public: publicClient, wallet: walletClient } });

  const recipient = account.address;

  // Read current state
  const [mintPrice, totalSupply, alreadyMinted] = await Promise.all([
    contract.read.mintPrice(),
    contract.read.totalSupply(),
    contract.read.mintedByWallet([recipient])
  ]);

  console.log("\n══════════════════════════════════════");
  console.log("  Kandinsky — Mint");
  console.log("══════════════════════════════════════");
  console.log(`  Contract:    ${CONTRACT}`);
  console.log(`  Recipient:   ${recipient}`);
  console.log(`  Mint price:  ${formatEther(mintPrice)} ETH`);
  console.log(`  Total minted: ${totalSupply}`);
  console.log(`  Wallet minted: ${alreadyMinted}/3`);

  if (Number(alreadyMinted) >= 3) {
    console.error("\n❌  Bu cüzdan zaten 3 token mintledi (max).");
    process.exit(1);
  }

  console.log("\n[1] Mint TX gönderiliyor…");
  const hash = await contract.write.mint([], { value: mintPrice });
  console.log(`    TX: https://sepolia.etherscan.io/tx/${hash}`);

  console.log("[2] Onay bekleniyor…");
  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  // Parse TokenMinted event to get tokenId
  const { parseEventLogs } = await import("viem");
  const logs = parseEventLogs({ abi, logs: receipt.logs, eventName: "TokenMinted" });
  const tokenId = logs[0]?.args?.tokenId;

  console.log(`\n✓ Mint başarılı!`);
  console.log(`  Token ID:  #${tokenId}`);
  console.log(`  OpenSea:   https://testnets.opensea.io/assets/sepolia/${CONTRACT}/${tokenId}`);
  console.log(`  Etherscan: https://sepolia.etherscan.io/nft/${CONTRACT}/${tokenId}`);
  console.log("\n══════════════════════════════════════");
  console.log(`  Reveal için:`);
  console.log(`  node scripts/reveal-token.mjs ${tokenId} ${recipient}`);
  console.log("══════════════════════════════════════\n");
}

main().catch(err => {
  console.error("\n❌  Fatal:", err.message);
  process.exit(1);
});
