#!/usr/bin/env node
/**
 * Reveal pipeline for a single minted token.
 * Usage:
 *   node scripts/reveal-token.mjs <tokenId> [walletAddress]
 *   node scripts/reveal-token.mjs 1 0x353982b4cef4e9dc7c3bc9ba7936e646380e7140
 *
 * Requires in .env:
 *   OPERATOR_PRIVATE_KEY, ETH_SEPOLIA_RPC_URL, CONTRACT_ADDRESS
 *   REPLICATE_API_TOKEN   (for AI generation)
 *   PINATA_JWT            (for IPFS upload)
 *
 * Optional:
 *   COVALENT_API_KEY      (multi-chain wallet scoring)
 *   ALCHEMY_API_KEY       (Ethereum enrichment)
 *
 * Dry-run (no PINATA_JWT): generates portrait and saves to ./reveal-output/
 */

import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, "../.env") });

const CONTRACT    = process.env.CONTRACT_ADDRESS ?? "0xC87eBF55F27fa5B0fC415d93B24d30590f7bF390";
const RPC         = process.env.ETH_SEPOLIA_RPC_URL;
const OPERATOR_KEY = process.env.OPERATOR_PRIVATE_KEY;
const PINATA_JWT  = process.env.PINATA_JWT;
const OUTPUT_DIR        = resolve(__dirname, "../reveal-output");
const STYLE_REFERENCE   = resolve(__dirname, "../assets/style-reference.png");

const TOKEN_ID      = parseInt(process.argv[2] ?? "1", 10);
const WALLET_ADDRESS = (process.argv[3] ?? "").toLowerCase() || null;

if (!TOKEN_ID || isNaN(TOKEN_ID)) {
  console.error("Usage: node scripts/reveal-token.mjs <tokenId> [walletAddress]");
  process.exit(1);
}

// ── 1. Resolve wallet address ────────────────────────────────────────────────

async function getOwnerOf(tokenId) {
  const selector = "0x6352211e"; // ownerOf(uint256)
  const data = selector + tokenId.toString(16).padStart(64, "0");
  const res = await rpcCall("eth_call", [{ to: CONTRACT, data }, "latest"]);
  return "0x" + res.result.slice(-40);
}

// ── 2. Wallet analysis via @identity0/wallet-analyzer ───────────────────────

async function analyzeWallet(address) {
  const { analyzeWallet: analyze } = await import("../packages/wallet-analyzer/dist/index.js");
  const profile = await analyze(address, {
    covalentApiKey: process.env.COVALENT_API_KEY,
    alchemyApiKey: process.env.ALCHEMY_API_KEY,
    tokenId: TOKEN_ID,
  });
  return profile;
}

// ── 3. SVG generation ────────────────────────────────────────────────────────

async function generateSVG(profile) {
  const { generateComposition } = await import("../packages/geometry-engine/dist/index.js");
  return generateComposition(profile);
}

async function getPortraitTraits(profile) {
  const { getPortraitTraits: get } = await import("../packages/geometry-engine/dist/index.js");
  return get(profile);
}

// ── 4. AI stylization ────────────────────────────────────────────────────────

async function stylize(svg, profile) {
  if (!process.env.REPLICATE_API_TOKEN) {
    console.log("  No REPLICATE_API_TOKEN — skipping AI, using SVG raster only");
    const { rasterizeSvg } = await import("../packages/ai-pipeline/dist/index.js");
    return rasterizeSvg(svg);
  }

  const { stylizeSvg } = await import("../packages/ai-pipeline/dist/index.js");

  // Load style reference image if available
  let styleReferenceImage;
  if (existsSync(STYLE_REFERENCE)) {
    styleReferenceImage = await readFile(STYLE_REFERENCE);
    console.log("  Using style reference: assets/style-reference.png");
  }

  console.log("  Running Replicate AI (ip-adapter-cubist, up to 3 attempts)…");
  const result = await stylizeSvg(svg, {
    profile,
    preset: "ip-adapter-cubist",
    model: process.env.REPLICATE_MODEL_OVERRIDE ?? "lucataco/ip_adapter-sdxl-face:226c6bf67a75a129b0f978e518fed33e1fb13956e15761c1ac53c9d2f898c9af",
    ipAdapterScale: Number(process.env.IP_ADAPTER_SCALE ?? 0.82),
    styleReferenceImage,
    maxAttempts: 3,
    enforceQuality: true
  });
  console.log(`  Quality: ${result.quality.passed ? "✓ passed" : "✗ failed"} | metrics:`, result.quality.metrics);
  return result.imageBuffer;
}

// ── 5. IPFS upload ───────────────────────────────────────────────────────────

async function uploadToIPFS(buffer, filename) {
  if (!PINATA_JWT) return null;
  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}` },
    body: form
  });
  if (!res.ok) throw new Error(`Pinata image upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.IpfsHash;
}

async function uploadJsonToIPFS(obj, filename) {
  if (!PINATA_JWT) return null;
  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${PINATA_JWT}`, "content-type": "application/json" },
    body: JSON.stringify({ pinataContent: obj, pinataMetadata: { name: filename } })
  });
  if (!res.ok) throw new Error(`Pinata metadata upload failed: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.IpfsHash;
}

// ── 6. On-chain reveal ───────────────────────────────────────────────────────

async function revealOnChain(tokenId, metadataUri) {
  if (!OPERATOR_KEY || !RPC) {
    console.log("  Missing OPERATOR_PRIVATE_KEY or ETH_SEPOLIA_RPC_URL — skipping on-chain reveal");
    return null;
  }

  const { createPublicClient, createWalletClient, getContract, http, parseAbi } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const { sepolia } = await import("viem/chains");

  const account = privateKeyToAccount(OPERATOR_KEY);
  const transport = http(RPC);
  const publicClient = createPublicClient({ chain: sepolia, transport });
  const walletClient = createWalletClient({ account, chain: sepolia, transport });
  const contract = getContract({
    address: CONTRACT,
    abi: parseAbi(["function revealToken(uint256 tokenId,string ipfsCidOrURI) external"]),
    client: { public: publicClient, wallet: walletClient }
  });

  const hash = await contract.write.revealToken([BigInt(tokenId), metadataUri]);
  console.log(`  revealToken tx: ${hash}`);
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ── Soft cap ─────────────────────────────────────────────────────────────────

// Tier → cap sayıları (packages/shared/RARITY_RULES ile eşleşmeli)
const TIER_CAPS = { Legendary: 83, Epic: 250, Rare: 500, Uncommon: 1000, Common: Infinity };
const TIER_ORDER = ["Legendary", "Epic", "Rare", "Uncommon", "Common"];

async function claimTierSlot(scoredTier) {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.log("  ⚠  REDIS_URL not set — soft cap bypassed (script mode)");
    return scoredTier;
  }

  const { Redis } = await import("ioredis");
  const redis = new Redis(redisUrl, { maxRetriesPerRequest: 2, lazyConnect: true });
  try {
    await redis.connect();
  } catch {
    console.log("  ⚠  Redis bağlantısı kurulamadı — soft cap bypassed");
    redis.disconnect();
    return scoredTier;
  }

  try {
    const startIdx = TIER_ORDER.indexOf(scoredTier);
    for (let i = startIdx; i < TIER_ORDER.length; i++) {
      const tier = TIER_ORDER[i];
      const cap = TIER_CAPS[tier];
      if (!isFinite(cap)) return tier;
      const count = await redis.incr(`kandinsky:tier:${tier.toLowerCase()}`);
      if (count <= cap) return tier;
      await redis.decr(`kandinsky:tier:${tier.toLowerCase()}`);
    }
    return "Common";
  } finally {
    redis.disconnect();
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreLabel(key) {
  return { age: "Wallet Age", tx: "Transactions", defi: "DeFi Activity", nft: "NFT Holdings", risk: "Risk Profile", multichain: "Multi-chain", wealth: "Portfolio Wealth" }[key] ?? key;
}

async function rpcCall(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 })
  });
  return res.json();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  if (!existsSync(OUTPUT_DIR)) await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`\n═══════════════════════════════════════`);
  console.log(`  Reveal pipeline — Token #${TOKEN_ID}`);
  console.log(`═══════════════════════════════════════`);

  // 1. Resolve wallet
  const wallet = WALLET_ADDRESS ?? (await getOwnerOf(TOKEN_ID));
  console.log(`\n[1] Wallet: ${wallet}`);

  // 2. Analyze
  console.log("\n[2] Analyzing wallet…");
  const profile = await analyzeWallet(wallet);
  console.log(`    Scores: age=${Math.round(profile.scores.age)} tx=${Math.round(profile.scores.tx)} defi=${Math.round(profile.scores.defi)} nft=${Math.round(profile.scores.nft)} multichain=${Math.round(profile.scores.multichain)} wealth=${Math.round(profile.scores.wealth)}`);
  console.log(`    Composite: ${profile.compositeScore.toFixed(1)} → ${profile.rarityTier}`);

  const assignedTier = await claimTierSlot(profile.rarityTier);
  if (assignedTier !== profile.rarityTier) {
    console.log(`    ⚠  Soft cap: ${profile.rarityTier} dolu → ${assignedTier} atandı`);
    profile.rarityTier = assignedTier;
  }

  // 3. Generate SVG + collect visual traits
  console.log("\n[3] Generating Bauhaus composition…");
  let svg, traits;
  try {
    [svg, traits] = await Promise.all([generateSVG(profile), getPortraitTraits(profile)]);
    await writeFile(resolve(OUTPUT_DIR, `token-${TOKEN_ID}.svg`), svg);
    console.log(`    SVG saved → reveal-output/token-${TOKEN_ID}.svg`);
    console.log(`    Traits: face=${traits.faceArchetype} palette=${traits.paletteFamily} expression=${traits.expression} rareItem=${traits.rareItemLevel}`);
  } catch (err) {
    console.error("  SVG generation failed:", err.message);
    process.exit(1);
  }

  // 4. AI stylization
  console.log("\n[4] AI stylization…");
  let imageBuffer;
  try {
    imageBuffer = await stylize(svg, profile);
    await writeFile(resolve(OUTPUT_DIR, `token-${TOKEN_ID}.webp`), imageBuffer);
    console.log(`    WebP saved → reveal-output/token-${TOKEN_ID}.webp`);
  } catch (err) {
    console.error("  AI stylization failed:", err.message);
    process.exit(1);
  }

  // 5. IPFS upload
  console.log("\n[5] IPFS upload…");
  if (!PINATA_JWT) {
    console.log("    ⚠  PINATA_JWT not set — dry run mode.");
    console.log("    Files saved locally. Add PINATA_JWT to .env and rerun to upload and reveal.");
    console.log(`\nOutput files:`);
    console.log(`  SVG:  reveal-output/token-${TOKEN_ID}.svg`);
    console.log(`  PNG:  reveal-output/token-${TOKEN_ID}.png`);
    return;
  }

  console.log("    Uploading image…");
  const imageCid = await uploadToIPFS(imageBuffer, `kandinsky-${TOKEN_ID}.webp`);
  console.log(`    Image CID: ${imageCid}`);

  const rareItemLabel = ["None", "Accent", "Brooch", "Symbol", "Aura", "Crown"][traits.rareItemLevel] ?? "None";
  const metadata = {
    name: `Kandinsky #${TOKEN_ID}`,
    description: "A wallet-derived AI cubist portrait generated deterministically from on-chain identity signals.",
    image: `ipfs://${imageCid}`,
    attributes: [
      { trait_type: "Rarity", value: profile.rarityTier },
      { trait_type: "Composite Score", value: Math.round(profile.compositeScore) },
      { trait_type: "Face Archetype", value: traits.faceArchetype },
      { trait_type: "Expression", value: traits.expression },
      { trait_type: "Palette", value: traits.paletteFamily },
      { trait_type: "Form", value: traits.hasFeminineForm ? "Feminine" : "Masculine" },
      { trait_type: "Rare Item", value: rareItemLabel },
      ...Object.entries(profile.scores).map(([k, v]) => ({ trait_type: scoreLabel(k), value: Math.round(v) }))
    ]
  };

  console.log("    Uploading metadata…");
  const metadataCid = await uploadJsonToIPFS(metadata, `kandinsky-${TOKEN_ID}.json`);
  const metadataUri = `ipfs://${metadataCid}`;
  console.log(`    Metadata CID: ${metadataCid}`);

  await writeFile(resolve(OUTPUT_DIR, `token-${TOKEN_ID}-metadata.json`), JSON.stringify(metadata, null, 2));

  // 6. On-chain reveal
  console.log("\n[6] Revealing on-chain…");
  const txHash = await revealOnChain(TOKEN_ID, metadataUri);
  if (txHash) {
    console.log(`    ✓ Token #${TOKEN_ID} revealed!`);
    console.log(`    Metadata: ${metadataUri}`);
    console.log(`    Etherscan: https://sepolia.etherscan.io/tx/${txHash}`);
    console.log(`    OpenSea: https://testnets.opensea.io/assets/sepolia/${CONTRACT}/${TOKEN_ID}`);
  }
}

main().catch(err => {
  console.error("\nFatal:", err.message);
  process.exit(1);
});
