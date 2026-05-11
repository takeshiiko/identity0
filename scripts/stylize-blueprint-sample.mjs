import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { keccak256, toBytes } from "viem";
import { stylizeSvg } from "../packages/ai-pipeline/dist/index.js";

const dryRun = process.argv.includes("--dry-run");
const preset = readArg("--preset") ?? "collection";
const model = readArg("--model");
const reference = readArg("--reference");
const ipAdapterScale = readNumberArg("--ip-adapter-scale");
const sampleCount = Math.max(1, Math.min(50, Math.round(readNumberArg("--count") ?? 5)));
const outDir = resolve("visual-poc/ai-sample-v1");
const blueprintDir = resolve("visual-poc/blueprint-v1");

await loadDotEnv();
await mkdir(outDir, { recursive: true });
const styleReferenceImage = reference ? await readFile(resolve(reference)) : undefined;

const baseSamples = [
  {
    label: "rare-halo-curator",
    svg: "kandinsky-blueprint-04.svg",
    address: "0x0000000000000000000000000000000000000004",
    scores: { age: 76, tx: 64, defi: 88, nft: 62, risk: 24, multichain: 92, wealth: 48 }
  },
  {
    label: "epic-crown-architect",
    svg: "kandinsky-blueprint-06.svg",
    address: "0x0000000000000000000000000000000000000006",
    scores: { age: 96, tx: 94, defi: 96, nft: 98, risk: 58, multichain: 96, wealth: 100 }
  },
  {
    label: "rare-glasses-collector",
    svg: "kandinsky-blueprint-15.svg",
    address: "0x000000000000000000000000000000000000000f",
    scores: { age: 84, tx: 78, defi: 76, nft: 86, risk: 32, multichain: 72, wealth: 92 }
  },
  {
    label: "uncommon-soft-portrait",
    svg: "kandinsky-blueprint-22.svg",
    address: "0x0000000000000000000000000000000000000016",
    scores: { age: 42, tx: 36, defi: 22, nft: 58, risk: 18, multichain: 28, wealth: 38 }
  },
  {
    label: "legendary-golden-signal",
    svg: "kandinsky-blueprint-36.svg",
    address: "0x0000000000000000000000000000000000000024",
    scores: { age: 96, tx: 94, defi: 96, nft: 98, risk: 58, multichain: 96, wealth: 100 }
  }
];
const samples = buildSampleSet(sampleCount);

const outputs = [];

for (const sample of samples) {
  const svg = await readFile(resolve(blueprintDir, sample.svg), "utf8");
  const profile = buildProfile(sample);
  const result = await stylizeWithRetry(svg, { profile, dryRun, preset, model, styleReferenceImage, ipAdapterScale });
  const suffix = dryRun ? "raster" : preset === "collection" ? "ai" : `ai-${preset}`;
  const outputPath = resolve(outDir, `${sample.label}-${suffix}.png`);

  await writeFile(outputPath, result.imageBuffer);
  outputs.push(outputPath);
  console.log(`${sample.label}: ${outputPath} attempts=${result.attempts} pHash=${result.pHash} quality=${result.quality.passed ? "pass" : result.quality.reasons.join("|")} colors=${result.dominantColors.join(",")}`);
}

await writeContactSheet(outputs, dryRun, preset);

console.log(`Generated ${outputs.length} ${dryRun ? "raster dry-run" : `${preset} AI stylized`} samples at ${outDir}`);

async function stylizeWithRetry(svg, options) {
  const maxAttempts = 4;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await stylizeSvg(svg, options);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const retryAfter = Number(error?.response?.headers?.get?.("retry-after") ?? 0);
      const isRateLimit = message.includes("429") || message.toLowerCase().includes("rate limit") || retryAfter > 0;
      if (!isRateLimit || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = Math.max(1500, retryAfter * 1000) + attempt * 750;
      console.log(`Rate limited by Replicate; retrying in ${Math.round(delayMs / 1000)}s (${attempt}/${maxAttempts})`);
      await sleep(delayMs);
    }
  }

  throw new Error("AI stylization retry loop exited unexpectedly.");
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function buildProfile(sample) {
  const compositeScore = weightedComposite(sample.scores);
  return {
    address: sample.address,
    scores: sample.scores,
    compositeScore,
    rarityTier: rarityTier(compositeScore),
    seed: keccak256(toBytes(sample.address.toLowerCase())),
    analyzedAt: new Date("2026-05-11T00:00:00.000Z").toISOString()
  };
}

function weightedComposite(scores) {
  return scores.age * 0.2 + scores.tx * 0.15 + scores.defi * 0.18 + scores.nft * 0.12 + scores.risk * 0.1 + scores.multichain * 0.1 + scores.wealth * 0.15;
}

function rarityTier(score) {
  if (score >= 93) return "Legendary";
  if (score >= 81) return "Epic";
  if (score >= 66) return "Rare";
  if (score >= 41) return "Uncommon";
  return "Common";
}

async function writeContactSheet(paths, isDryRun, activePreset) {
  const size = 320;
  const columns = paths.length <= 5 ? paths.length : 5;
  const rows = Math.ceil(paths.length / columns);
  const composites = await Promise.all(
    paths.map(async (path, index) => ({
      input: await sharp(path).resize(size, size).png().toBuffer(),
      left: (index % columns) * size,
      top: Math.floor(index / columns) * size
    }))
  );

  await sharp({
    create: {
      width: size * columns,
      height: size * rows,
      channels: 4,
      background: "#efe4cf"
    }
  })
    .composite(composites)
    .png()
    .toFile(resolve(outDir, isDryRun ? "ai-sample-5-dry-run-sheet.png" : activePreset === "collection" ? "ai-sample-5-sheet.png" : `ai-sample-5-${activePreset}-sheet.png`));
}

function buildSampleSet(count) {
  if (count <= baseSamples.length) {
    return baseSamples.slice(0, count);
  }

  const samples = [...baseSamples];
  for (let index = baseSamples.length + 1; index <= count; index += 1) {
    samples.push(buildGeneratedSample(index));
  }

  return samples;
}

function buildGeneratedSample(index) {
  const archetype = index % 5;
  const scoresByArchetype = [
    { age: 22, tx: 18, defi: 12, nft: 18, risk: 14, multichain: 12, wealth: 20 },
    { age: 52, tx: 44, defi: 34, nft: 46, risk: 24, multichain: 36, wealth: 48 },
    { age: 72, tx: 70, defi: 64, nft: 70, risk: 34, multichain: 68, wealth: 70 },
    { age: 86, tx: 82, defi: 78, nft: 88, risk: 42, multichain: 76, wealth: 88 },
    { age: 96, tx: 94, defi: 92, nft: 96, risk: 54, multichain: 94, wealth: 98 }
  ];
  const scores = scoresByArchetype[archetype] ?? scoresByArchetype[1];
  const svgIndex = String(((index * 7) % 50) + 1).padStart(2, "0");
  const addressSuffix = (10_000 + index).toString(16).padStart(40, "0");

  return {
    label: `batch-${String(index).padStart(2, "0")}`,
    svg: `kandinsky-blueprint-${svgIndex}.svg`,
    address: `0x${addressSuffix}`,
    scores
  };
}

function readArg(name) {
  const arg = process.argv.find((value) => value.startsWith(`${name}=`));
  return arg ? arg.slice(name.length + 1) : undefined;
}

function readNumberArg(name) {
  const value = readArg(name);
  if (value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function loadDotEnv() {
  try {
    const env = await readFile(resolve(".env"), "utf8");
    for (const line of env.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;

      const key = trimmed.slice(0, separator);
      const value = trimmed.slice(separator + 1);
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env is optional; explicit environment variables work too.
  }
}
