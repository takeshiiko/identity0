import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import sharp from "sharp";
import { keccak256, toBytes } from "viem";
import { generateComposition, getArtParameters, getPortraitTraits } from "../packages/geometry-engine/dist/index.js";

const outDir = resolve("visual-poc");

const examples = [
  {
    label: "Fresh Wallet",
    address: "0x1111111111111111111111111111111111111111",
    scores: { age: 8, tx: 6, defi: 4, nft: 2, risk: 8, multichain: 0, wealth: 5 }
  },
  {
    label: "Old High-Tx",
    address: "0x2222222222222222222222222222222222222222",
    scores: { age: 94, tx: 88, defi: 28, nft: 18, risk: 22, multichain: 18, wealth: 34 }
  },
  {
    label: "DeFi Native",
    address: "0x3333333333333333333333333333333333333333",
    scores: { age: 72, tx: 76, defi: 96, nft: 30, risk: 42, multichain: 58, wealth: 66 }
  },
  {
    label: "NFT Collector",
    address: "0x4444444444444444444444444444444444444444",
    scores: { age: 64, tx: 52, defi: 20, nft: 92, risk: 18, multichain: 34, wealth: 48 }
  },
  {
    label: "High Risk",
    address: "0x5555555555555555555555555555555555555555",
    scores: { age: 46, tx: 69, defi: 62, nft: 36, risk: 96, multichain: 44, wealth: 39 }
  },
  {
    label: "Multichain Bridge",
    address: "0x6666666666666666666666666666666666666666",
    scores: { age: 70, tx: 64, defi: 54, nft: 44, risk: 34, multichain: 94, wealth: 58 }
  },
  {
    label: "Whale",
    address: "0x7777777777777777777777777777777777777777",
    scores: { age: 86, tx: 78, defi: 82, nft: 74, risk: 38, multichain: 76, wealth: 98 }
  },
  {
    label: "Soft Muse",
    address: "0x8888888888888888888888888888888888888888",
    scores: { age: 42, tx: 34, defi: 78, nft: 72, risk: 18, multichain: 36, wealth: 52 }
  },
  {
    label: "Gallery Patron",
    address: "0x9999999999999999999999999999999999999999",
    scores: { age: 58, tx: 44, defi: 32, nft: 96, risk: 12, multichain: 28, wealth: 74 }
  },
  {
    label: "Quiet Collector",
    address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    scores: { age: 36, tx: 28, defi: 24, nft: 68, risk: 8, multichain: 18, wealth: 42 }
  },
  {
    label: "Sage Operator",
    address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    scores: { age: 76, tx: 84, defi: 52, nft: 48, risk: 28, multichain: 62, wealth: 44 }
  },
  {
    label: "Arctic Persona",
    address: "0xcccccccccccccccccccccccccccccccccccccccc",
    scores: { age: 28, tx: 58, defi: 72, nft: 58, risk: 24, multichain: 88, wealth: 22 }
  },
  {
    label: "Terracotta Mask",
    address: "0xdddddddddddddddddddddddddddddddddddddddd",
    scores: { age: 62, tx: 72, defi: 44, nft: 40, risk: 88, multichain: 36, wealth: 64 }
  },
  {
    label: "Royal Signal",
    address: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    scores: { age: 92, tx: 92, defi: 76, nft: 86, risk: 44, multichain: 78, wealth: 92 }
  },
  {
    label: "Legend Candidate",
    address: "0xffffffffffffffffffffffffffffffffffffffff",
    scores: { age: 98, tx: 96, defi: 94, nft: 96, risk: 72, multichain: 94, wealth: 98 }
  },
  {
    label: "Minimal Face",
    address: "0x1234567890123456789012345678901234567890",
    scores: { age: 18, tx: 14, defi: 10, nft: 12, risk: 20, multichain: 8, wealth: 16 }
  },
  {
    label: "Blue Steel",
    address: "0x2345678901234567890123456789012345678901",
    scores: { age: 48, tx: 66, defi: 64, nft: 54, risk: 30, multichain: 72, wealth: 18 }
  },
  {
    label: "Amber Profile",
    address: "0x3456789012345678901234567890123456789012",
    scores: { age: 82, tx: 48, defi: 36, nft: 76, risk: 22, multichain: 42, wealth: 88 }
  },
  {
    label: "Risk Icon",
    address: "0x4567890123456789012345678901234567890123",
    scores: { age: 52, tx: 82, defi: 68, nft: 34, risk: 100, multichain: 56, wealth: 46 }
  },
  {
    label: "Pastel Chain",
    address: "0x5678901234567890123456789012345678901234",
    scores: { age: 44, tx: 54, defi: 86, nft: 66, risk: 16, multichain: 96, wealth: 36 }
  },
  {
    label: "Epic Archive",
    address: "0x6789012345678901234567890123456789012345",
    scores: { age: 90, tx: 86, defi: 84, nft: 90, risk: 36, multichain: 82, wealth: 86 }
  },
  {
    label: "Rose Cipher",
    address: "0x7890123456789012345678901234567890123456",
    scores: { age: 34, tx: 46, defi: 74, nft: 88, risk: 14, multichain: 40, wealth: 56 }
  },
  {
    label: "Mint Matriarch",
    address: "0x8901234567890123456789012345678901234567",
    scores: { age: 68, tx: 62, defi: 82, nft: 84, risk: 20, multichain: 54, wealth: 68 }
  },
  {
    label: "Violet Curator",
    address: "0x9012345678901234567890123456789012345678",
    scores: { age: 72, tx: 38, defi: 40, nft: 98, risk: 10, multichain: 24, wealth: 82 }
  },
  {
    label: "Ink Minimalist",
    address: "0xa012345678901234567890123456789012345679",
    scores: { age: 26, tx: 22, defi: 18, nft: 36, risk: 52, multichain: 16, wealth: 24 }
  },
  {
    label: "Citrus Bridge",
    address: "0xb012345678901234567890123456789012345679",
    scores: { age: 56, tx: 74, defi: 88, nft: 62, risk: 26, multichain: 98, wealth: 48 }
  },
  {
    label: "Porcelain Whale",
    address: "0xc012345678901234567890123456789012345679",
    scores: { age: 88, tx: 70, defi: 76, nft: 80, risk: 18, multichain: 72, wealth: 100 }
  },
  {
    label: "Clay Rebel",
    address: "0xd012345678901234567890123456789012345679",
    scores: { age: 40, tx: 92, defi: 54, nft: 28, risk: 92, multichain: 64, wealth: 58 }
  },
  {
    label: "Seafoam Lens",
    address: "0xe012345678901234567890123456789012345679",
    scores: { age: 50, tx: 40, defi: 92, nft: 70, risk: 12, multichain: 84, wealth: 32 }
  },
  {
    label: "Legend Muse",
    address: "0xf012345678901234567890123456789012345679",
    scores: { age: 96, tx: 94, defi: 96, nft: 100, risk: 60, multichain: 96, wealth: 100 }
  }
];

await mkdir(outDir, { recursive: true });

const profiles = examples.map((example) => {
  const compositeScore = weightedComposite(example.scores);
  return {
    ...example,
    compositeScore,
    rarityTier: rarityTier(compositeScore),
    seed: keccak256(toBytes(example.address.toLowerCase())),
    analyzedAt: new Date("2026-05-10T00:00:00.000Z").toISOString()
  };
});

for (const profile of profiles) {
  await writeFile(resolve(outDir, `${slug(profile.label)}.svg`), generateComposition(profile), "utf8");
}

await writeContactSheet(profiles);

const cards = profiles
  .map((profile) => {
    const svg = generateComposition(profile);
    const params = getArtParameters(profile.scores);
    const portraitTraits = getPortraitTraits(profile);
    const scoreRows = Object.entries(profile.scores)
      .map(([key, value]) => `<div><span>${key}</span><strong>${value}</strong></div>`)
      .join("");

    return `<article class="card">
      <div class="art">${svg}</div>
      <div class="meta">
        <p class="label">${profile.label}</p>
        <h2>${profile.rarityTier} · ${Math.round(profile.compositeScore)}</h2>
        <p class="address">${profile.address}</p>
        <div class="params">
          <span>${params.palette}</span>
          <span>${portraitTraits.faceArchetype}</span>
          <span>${portraitTraits.paletteFamily}</span>
          <span>${portraitTraits.hasFeminineForm ? "feminine form" : "neutral form"}</span>
          <span>${params.towerCount} towers</span>
          <span>${params.sphereCount} spheres</span>
          <span>${params.diagonalCount} diagonals</span>
          <span>${params.hasBridge ? "bridge geometry" : "no bridge"}</span>
          <span>${params.hasRareSymbol ? "rare symbols" : "no rare symbols"}</span>
        </div>
        <div class="scores">${scoreRows}</div>
      </div>
    </article>`;
  })
  .join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Identity.0 Visual POC</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#F5F0E8;color:#1A1208;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
    header{padding:48px 48px 28px;border-bottom:1px solid rgba(26,18,8,.16)}
    h1{font-family:Georgia,serif;font-size:56px;line-height:.95;margin:0 0 16px}
    header p{max-width:760px;font-size:14px;line-height:1.7;opacity:.68;margin:0}
    main{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;background:rgba(26,18,8,.18)}
    .card{background:#F5F0E8;display:grid;grid-template-columns:minmax(0,1.15fr) minmax(300px,.85fr);min-height:520px}
    .art{background:#1A1208;display:flex;align-items:center;justify-content:center}
    .art svg{display:block;width:100%;height:auto}
    .meta{padding:32px;display:flex;flex-direction:column;gap:18px}
    .label{color:#C4572A;text-transform:uppercase;letter-spacing:.16em;font-size:11px;margin:0}
    h2{font-family:Georgia,serif;font-weight:400;font-size:30px;margin:0}
    .address{font-size:11px;line-height:1.5;opacity:.58;word-break:break-all;margin:0}
    .params{display:flex;flex-wrap:wrap;gap:8px}
    .params span{border:1px solid rgba(26,18,8,.2);padding:6px 8px;font-size:10px;text-transform:uppercase;letter-spacing:.08em}
    .scores{display:grid;grid-template-columns:repeat(2,1fr);gap:1px;background:rgba(26,18,8,.14);margin-top:auto}
    .scores div{background:#E8E2D4;padding:12px}
    .scores span{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.1em;opacity:.55}
    .scores strong{font-family:Georgia,serif;font-size:24px;font-weight:400}
    .systems{padding:44px 48px;background:#1A1208;color:#F5F0E8;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:1px}
    .system{padding:28px;background:rgba(245,240,232,.08);border:1px solid rgba(245,240,232,.12)}
    .system h2{font-size:28px;margin:0 0 14px}
    .system p{font-size:12px;line-height:1.8;opacity:.68;margin:0}
    @media(max-width:1100px){main{grid-template-columns:1fr}.card{grid-template-columns:1fr}.art svg{max-height:720px}}
    @media(max-width:900px){.systems{grid-template-columns:1fr}}
    @media(max-width:640px){header{padding:28px 22px}h1{font-size:42px}.meta{padding:22px}.scores{grid-template-columns:1fr}}
  </style>
</head>
<body>
  <header>
    <h1>Identity.0 Visual POC</h1>
    <p>Thirty synthetic wallet profiles rendered through the deterministic Bauhaus geometry engine. This is the pre-AI ControlNet conditioning layer: if these differ clearly, the AI styling step has a strong structural signal to preserve.</p>
  </header>
  <section class="systems">
    <article class="system">
      <h2>Clothing</h2>
      <p>Collars, robes, high-neck blocks, shoulder panels, brooches, and garment geometry vary by wallet activity and collection traits.</p>
    </article>
    <article class="system">
      <h2>Rare Items</h2>
      <p>Auras, crown arcs, forehead glyphs, rings, emblems, and symbolic geometry unlock progressively from Uncommon to Legendary.</p>
    </article>
    <article class="system">
      <h2>Wallet Mapping</h2>
      <p>Low-score wallets stay cleaner and common; high-score wallets mint denser portraits with richer palettes, stronger accessories, and rarer visual systems.</p>
    </article>
  </section>
  <main>${cards}</main>
</body>
</html>`;

await writeFile(resolve(outDir, "index.html"), html, "utf8");

console.log(`Generated ${profiles.length} SVGs, contact sheet, and gallery at ${resolve(outDir, "index.html")}`);

async function writeContactSheet(items) {
  const size = 220;
  const columns = 5;
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
      background: "#EFE8DA"
    }
  })
    .composite(composites)
    .png()
    .toFile(resolve(outDir, "portrait-30-sheet-v5.png"));
}

function weightedComposite(scores) {
  return (
    scores.age * 0.2 +
    scores.tx * 0.15 +
    scores.defi * 0.18 +
    scores.nft * 0.12 +
    scores.risk * 0.1 +
    scores.multichain * 0.1 +
    scores.wealth * 0.15
  );
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
