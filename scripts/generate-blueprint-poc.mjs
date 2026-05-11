import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { keccak256, toBytes } from "viem";
import { generateComposition, getPortraitTraits } from "../packages/geometry-engine/dist/index.js";

const outDir = resolve("visual-poc/blueprint-v1");
await mkdir(outDir, { recursive: true });

const profiles = Array.from({ length: 50 }, (_, index) => {
  const n = index + 1;
  const address = `0x${n.toString(16).padStart(40, "0")}`;
  const scores = scoreSet(index);
  const compositeScore = weightedComposite(scores);

  return {
    label: `Kandinsky Blueprint #${String(n).padStart(2, "0")}`,
    address,
    scores,
    compositeScore,
    rarityTier: rarityTier(compositeScore),
    seed: keccak256(toBytes(address.toLowerCase())),
    analyzedAt: new Date("2026-05-11T00:00:00.000Z").toISOString()
  };
});

for (const profile of profiles) {
  await writeFile(resolve(outDir, `${slug(profile.label)}.svg`), generateComposition(profile), "utf8");
}

await writeContactSheet(profiles);
await writeGallery(profiles);

console.log(`Generated ${profiles.length} curated blueprint portraits at ${outDir}`);

function scoreSet(index) {
  const presets = [
    { age: 18, tx: 24, defi: 10, nft: 12, risk: 18, multichain: 8, wealth: 16 },
    { age: 42, tx: 36, defi: 22, nft: 58, risk: 18, multichain: 28, wealth: 38 },
    { age: 62, tx: 72, defi: 48, nft: 40, risk: 84, multichain: 36, wealth: 64 },
    { age: 76, tx: 64, defi: 88, nft: 62, risk: 24, multichain: 92, wealth: 48 },
    { age: 84, tx: 78, defi: 76, nft: 86, risk: 32, multichain: 72, wealth: 92 },
    { age: 96, tx: 94, defi: 96, nft: 98, risk: 58, multichain: 96, wealth: 100 },
    { age: 58, tx: 44, defi: 34, nft: 96, risk: 12, multichain: 26, wealth: 74 },
    { age: 70, tx: 86, defi: 52, nft: 48, risk: 28, multichain: 66, wealth: 42 },
    { age: 30, tx: 62, defi: 78, nft: 72, risk: 18, multichain: 84, wealth: 30 },
    { age: 88, tx: 52, defi: 42, nft: 82, risk: 20, multichain: 42, wealth: 88 }
  ];
  const base = presets[index % presets.length];
  const wave = Math.floor(index / presets.length) * 7;

  return Object.fromEntries(
    Object.entries(base).map(([key, value], offset) => [key, Math.max(0, Math.min(100, value + ((index + offset) % 3) * wave - wave))])
  );
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

function slug(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function writeContactSheet(items) {
  const size = 220;
  const columns = 10;
  const rows = Math.ceil(items.length / columns);
  const composites = await Promise.all(
    items.map(async (profile, index) => ({
      input: await sharp(resolve(outDir, `${slug(profile.label)}.svg`)).resize(size, size).png().toBuffer(),
      left: (index % columns) * size,
      top: Math.floor(index / columns) * size
    }))
  );

  await sharp({
    create: {
      width: columns * size,
      height: rows * size,
      channels: 4,
      background: "#efe4cf"
    }
  })
    .composite(composites)
    .png()
    .toFile(resolve(outDir, "kandinsky-blueprint-50-sheet.png"));
}

async function writeGallery(items) {
  const cards = items
    .map((profile) => {
      const traits = getPortraitTraits(profile);
      return `<article>
        <img src="./${slug(profile.label)}.svg" alt="${profile.label}"/>
        <h2>${profile.label}</h2>
        <p>${profile.rarityTier} / ${Math.round(profile.compositeScore)} / ${traits.faceArchetype} / ${traits.paletteFamily}</p>
      </article>`;
    })
    .join("");

  await writeFile(
    resolve(outDir, "index.html"),
    `<!doctype html><html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Kandinsky Blueprint POC</title><style>
      body{margin:0;background:#efe4cf;color:#14130f;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
      header{padding:36px 42px;border-bottom:1px solid rgba(20,19,15,.3)}
      h1{font-family:Georgia,serif;font-size:52px;line-height:.95;margin:0 0 12px}
      header p{max-width:780px;line-height:1.7;opacity:.65;margin:0}
      main{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#14130f}
      article{background:#efe4cf;padding:14px}
      img{display:block;width:100%;aspect-ratio:1;object-fit:cover;border:1px solid rgba(20,19,15,.25)}
      h2{font-size:12px;margin:12px 0 4px;text-transform:uppercase}
      article p{font-size:11px;line-height:1.5;opacity:.65;margin:0}
      @media(max-width:1100px){main{grid-template-columns:repeat(3,1fr)}}@media(max-width:680px){main{grid-template-columns:1fr}}
    </style></head><body><header><h1>Kandinsky Blueprint POC</h1><p>50 deterministic wallet portraits. This layer is the ControlNet/AI conditioning target: silhouette, face structure, clothing, rare items, and palette should already differ before AI styling.</p></header><main>${cards}</main></body></html>`,
    "utf8"
  );
}
