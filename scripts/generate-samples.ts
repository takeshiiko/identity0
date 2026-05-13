import { config } from "dotenv";
import { resolve } from "node:path";
config({ path: resolve(process.cwd(), ".env") });
import { writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { readFile } from "node:fs/promises";
console.log("REPLICATE_API_TOKEN:", process.env.REPLICATE_API_TOKEN ? "✓ loaded" : "✗ missing");

import { analyzeWallet } from "@identity0/wallet-analyzer";
import { generateComposition } from "@identity0/geometry-engine";
import { stylizeSvg } from "@identity0/ai-pipeline";

// Farklı profil tiplerini temsil eden örnek cüzdanlar
const SAMPLE_WALLETS: { address: `0x${string}`; label: string }[] = [
  { address: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label: "vitalik" },       // Vitalik — legendary
  { address: "0x742d35Cc6634C0532925a3b8D4C9C4a4b8d3fE0c", label: "whale" },         // Whale wallet
  { address: "0x2B5AD5c4795c026514f8317c7a215E218DcCD6cF", label: "degen" },          // Active degen
  { address: "0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B", label: "collector" },      // NFT collector
];

async function main() {
  const outDir = resolve(process.cwd(), "sample-portraits");
  await mkdir(outDir, { recursive: true });

  const styleRef = await readFile(
    resolve(process.cwd(), "services/api/assets/style-reference.png")
  ).catch(() => undefined);

  for (const { address, label } of SAMPLE_WALLETS) {
    console.log(`\n[${label}] Analyzing ${address}...`);

    try {
      const profile = await analyzeWallet(address, {
        alchemyApiKey: process.env.ALCHEMY_API_KEY,
        covalentApiKey: process.env.COVALENT_API_KEY,
        tokenId: Math.floor(Math.random() * 3333) + 1,
      });

      console.log(`  Tier: ${profile.rarityTier} | Score: ${Math.round(profile.compositeScore)}`);

      const svg = generateComposition(profile);
      await writeFile(resolve(outDir, `${label}.svg`), svg);

      console.log(`  Generating AI portrait...`);
      const result = await stylizeSvg(svg, {
        profile,
        preset: "ip-adapter-cubist",
        model: (process.env.REPLICATE_MODEL ?? "stability-ai/stable-diffusion-3.5-large") as `${string}/${string}` | `${string}/${string}:${string}`,
        maxAttempts: 2,
        enforceQuality: false,
      });

      const imgPath = resolve(outDir, `${label}.webp`);
      await writeFile(imgPath, result.imageBuffer);
      console.log(`  ✓ Saved → sample-portraits/${label}.webp`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("\n=== Done ===");
  console.log(`Portraits saved to: ${outDir}`);
}

main().catch(console.error);
