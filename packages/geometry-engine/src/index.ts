import type { WalletProfile, WalletScores } from "@identity0/shared";

export const SVG_SIZE = 1024;

type PaletteName =
  | "warm_gold"
  | "cool_sage"
  | "deep_blue"
  | "terracotta"
  | "mist_grey"
  | "forest_dusk"
  | "royal_amber"
  | "arctic_steel";

interface Palette {
  name: PaletteName;
  primary: string;
  secondary: string;
  dark: string;
  paper: string;
}

interface ArtParameters {
  palette: PaletteName;
  sunRadius: number;
  towerCount: number;
  sphereCount: number;
  diagonalCount: number;
  hasBridge: boolean;
  hasRareSymbol: boolean;
  riskOpacity: number;
  ageMultiplier: number;
}

export type FaceArchetype = "oval" | "angular" | "mask" | "profile" | "soft" | "monolith" | "split-face";

export interface PortraitTraits {
  faceArchetype: FaceArchetype;
  expression: "neutral" | "soft" | "severe" | "fragmented";
  paletteFamily: string;
  hasFeminineForm: boolean;
  rareItemLevel: number;
}

interface CompositionLayout {
  faceArchetype: FaceArchetype;
  variant: number;
  isFeminine: boolean;
  hairStyle: number;
  columnPattern: number;
  facadePattern: number;
  spherePattern: number;
  rampPattern: number;
  groundPattern: number;
  diamondX: number;
  centralX: number;
  sunCx: number;
  sunCy: number;
  sphereAnchorX: number;
  sphereAnchorY: number;
  lowerShift: number;
  rampStartY: number;
  rampEndX: number;
  rampEndY: number;
  mirror: boolean;
}

type SvgPart = string;

const palettes: Palette[] = [
  { name: "warm_gold", primary: "#C4572A", secondary: "#B8941A", dark: "#4A6B8A", paper: "#F5F0E8" },
  { name: "cool_sage", primary: "#4A6741", secondary: "#4A6B8A", dark: "#2A1E0F", paper: "#E8E2D4" },
  { name: "deep_blue", primary: "#1A3A5C", secondary: "#4A6B8A", dark: "#B8941A", paper: "#E8E2D4" },
  { name: "terracotta", primary: "#C4572A", secondary: "#8B3A20", dark: "#1A1208", paper: "#D4C5A0" },
  { name: "mist_grey", primary: "#7A7A72", secondary: "#4A4A44", dark: "#B8941A", paper: "#F5F0E8" },
  { name: "forest_dusk", primary: "#2A4A2A", secondary: "#4A6741", dark: "#C4572A", paper: "#E8E2D4" },
  { name: "royal_amber", primary: "#8B6914", secondary: "#B8941A", dark: "#4A2A0A", paper: "#F5E8C8" },
  { name: "arctic_steel", primary: "#3A5A6A", secondary: "#5A7A8A", dark: "#B8B0A0", paper: "#E8EEF0" }
];

const towerWidths = [24, 36, 48, 60] as const;

export function generateComposition(profile: WalletProfile): string {
  const rng = createRng(profile.seed);
  const scores = clampScores(profile.scores);
  const palette = selectPalette(scores.wealth);
  const params = getArtParameters(scores);
  const layout = createLayout(rng, scores);

  return renderCuratedPortraitComposition(profile, palette, scores, params, layout, rng);
}

export function getPortraitTraits(profile: WalletProfile): PortraitTraits {
  const rng = createRng(profile.seed);
  const scores = clampScores(profile.scores);
  const layout = createLayout(rng, scores);
  const palette = selectPalette(scores.wealth);
  const colors = portraitColorSet(palette, layout);
  const blueprint = createCuratedBlueprint(profile, scores, layout, rng);

  return {
    faceArchetype: layout.faceArchetype,
    expression: layout.faceArchetype === "mask" || scores.risk > 80 ? "severe" : layout.faceArchetype === "split-face" ? "fragmented" : layout.isFeminine ? "soft" : "neutral",
    paletteFamily: colors.name,
    hasFeminineForm: layout.isFeminine,
    rareItemLevel: blueprint.rareItem
  };
}

function renderPortraitComposition(
  profile: WalletProfile,
  palette: Palette,
  scores: WalletScores,
  params: ArtParameters,
  layout: CompositionLayout,
  rng: () => number
): string {
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" role="img" aria-label="Identity.0 deterministic Bauhaus wallet composition">`,
    `<defs>${renderDefs(profile, palette)}</defs>`,
    renderPortraitBackground(palette, scores, layout, rng),
    renderPortraitBackShapes(palette, scores, layout),
    renderPortraitRarityAura(profile, palette, layout),
    renderPortraitHairBack(palette, scores, layout),
    renderPortraitNeckAndShoulders(palette, scores, layout),
    renderPortraitHair(scores, layout),
    renderPortraitHead(palette, scores, params, layout),
    renderPortraitColorPlanes(palette, scores, layout),
    renderPortraitEyes(palette, scores, layout),
    renderPortraitNose(palette, scores, layout),
    renderPortraitMouth(palette, scores, layout),
    renderPortraitFeminineDetails(palette, scores, layout),
    renderPortraitClothingDetails(palette, scores, layout),
    renderPortraitRarityTraits(profile, palette, scores, layout),
    renderPortraitAccents(palette, scores, params, layout, rng),
    renderPaperTexture(),
    `</svg>`
  ];

  return svg.join("");
}

interface CuratedPortraitBlueprint {
  face: number;
  headTurn: number;
  hair: number;
  eyes: number;
  nose: number;
  mouth: number;
  clothing: number;
  background: number;
  rareItem: number;
  paletteShift: number;
  isFeminine: boolean;
}

function renderCuratedPortraitComposition(
  profile: WalletProfile,
  palette: Palette,
  scores: WalletScores,
  params: ArtParameters,
  layout: CompositionLayout,
  rng: () => number
): string {
  const colors = portraitColorSet(palette, layout);
  const blueprint = createCuratedBlueprint(profile, scores, layout, rng);
  const cx = 512 + (blueprint.headTurn - 1) * 28;
  const parts = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SVG_SIZE}" height="${SVG_SIZE}" viewBox="0 0 ${SVG_SIZE} ${SVG_SIZE}" role="img" aria-label="Kandinsky deterministic wallet portrait">`,
    `<defs>${renderDefs(profile, palette)}</defs>`,
    renderCuratedBackground(colors, scores, blueprint),
    renderCuratedRarityAura(profile, colors, blueprint),
    renderCuratedHairBack(colors, blueprint, cx),
    renderCuratedHead(colors, scores, blueprint, cx),
    renderCuratedFacePlanes(colors, scores, blueprint, cx),
    renderCuratedHairFront(colors, blueprint, cx),
    renderCuratedEyes(colors, scores, blueprint, cx),
    renderCuratedNose(colors, scores, blueprint, cx),
    renderCuratedMouth(colors, blueprint, cx),
    renderCuratedClothing(colors, scores, blueprint, cx),
    renderCuratedRareItem(profile, colors, params, blueprint, cx),
    renderCuratedLinework(colors, blueprint, cx),
    renderPaperTexture(),
    `</svg>`
  ];

  return parts.join("");
}

function createCuratedBlueprint(profile: WalletProfile, scores: WalletScores, layout: CompositionLayout, rng: () => number): CuratedPortraitBlueprint {
  const composite = clamp(profile.compositeScore);
  const face = scores.multichain > 82 ? 5 : scores.risk > 78 ? 4 : scores.nft > 84 ? 3 : scores.wealth > 86 ? 6 : Math.floor(rng() * 8);
  const isFeminine = selectFeminineForm(scores, layout.faceArchetype, rng);
  const headTurn = scores.multichain > 70 ? Math.floor(rng() * 3) : Math.floor(rng() * 2);
  const rareBias = composite > 80 ? 2 : composite > 65 ? 1 : 0;
  const hairPool = isFeminine ? [1, 3, 4, 5, 6, 7] : [0, 2, 5, 8, 9, 10];

  return {
    face,
    headTurn,
    hair: hairPool[Math.floor(rng() * hairPool.length)] ?? 0,
    eyes: scores.nft > 88 ? 5 : scores.risk > 76 ? 4 : Math.floor(rng() * 6),
    nose: Math.floor(rng() * 6),
    mouth: isFeminine ? 2 + Math.floor(rng() * 4) : Math.floor(rng() * 6),
    clothing: Math.min(7, Math.floor(rng() * 5) + rareBias),
    background: Math.floor(rng() * 10),
    rareItem: profile.rarityTier === "Legendary" ? 5 : profile.rarityTier === "Epic" ? 4 : profile.rarityTier === "Rare" ? 2 + Math.floor(rng() * 2) : profile.rarityTier === "Uncommon" ? 1 : 0,
    paletteShift: Math.floor(rng() * 5),
    isFeminine
  };
}

function renderCuratedBackground(colors: PortraitColorSet, scores: WalletScores, blueprint: CuratedPortraitBlueprint): SvgPart {
  const blocks: string[] = [
    `<rect x="0" y="0" width="1024" height="1024" fill="${colors.bg}"/>`,
    `<rect x="0" y="0" width="1024" height="1024" fill="${colors.bgWash}" opacity="0.22"/>`
  ];
  const palette = [
    colors.backShapes[blueprint.paletteShift % colors.backShapes.length] ?? colors.warm,
    colors.gold,
    colors.cool,
    colors.softBlocks[(blueprint.paletteShift + 1) % colors.softBlocks.length] ?? colors.bgWash,
    colors.warmDark
  ];
  const circleR = lerp(105, 165, scores.wealth / 100);

  if (blueprint.background % 6 === 0) {
    blocks.push(`<rect x="56" y="108" width="292" height="398" fill="${palette[0]}" opacity="0.78"/>`);
    blocks.push(`<polygon points="642,122 930,438 590,438" fill="${palette[1]}" opacity="0.56"/>`);
    blocks.push(`<polygon points="0,685 330,465 330,1024 0,1024" fill="${palette[2]}" opacity="0.28"/>`);
  } else if (blueprint.background % 6 === 1) {
    blocks.push(`<circle cx="730" cy="205" r="${circleR}" fill="${palette[0]}" opacity="0.34"/>`);
    blocks.push(`<rect x="58" y="660" width="390" height="245" fill="${palette[2]}" opacity="0.3"/>`);
    blocks.push(`<polygon points="0,360 310,120 310,620 0,620" fill="${palette[1]}" opacity="0.36"/>`);
  } else if (blueprint.background % 6 === 2) {
    blocks.push(`<rect x="704" y="88" width="245" height="548" fill="${palette[2]}" opacity="0.32"/>`);
    blocks.push(`<polygon points="80,105 382,105 80,438" fill="${palette[1]}" opacity="0.45"/>`);
    blocks.push(`<polygon points="110,720 430,540 520,1024 110,1024" fill="${palette[0]}" opacity="0.34"/>`);
  } else if (blueprint.background % 6 === 3) {
    blocks.push(`<rect x="0" y="0" width="1024" height="1024" fill="${palette[2]}" opacity="0.1"/>`);
    blocks.push(`<circle cx="292" cy="250" r="184" fill="${palette[0]}" opacity="0.26"/>`);
    blocks.push(`<polygon points="655,710 1024,520 1024,1024 655,1024" fill="${palette[4]}" opacity="0.2"/>`);
  } else if (blueprint.background % 6 === 4) {
    blocks.push(`<rect x="90" y="130" width="175" height="660" fill="${palette[3]}" opacity="0.52"/>`);
    blocks.push(`<rect x="756" y="112" width="142" height="650" fill="${palette[2]}" opacity="0.26"/>`);
    blocks.push(`<polygon points="220,708 642,395 770,1024 220,1024" fill="${palette[0]}" opacity="0.31"/>`);
  } else {
    blocks.push(`<rect x="0" y="92" width="325" height="430" fill="${palette[0]}" opacity="0.55"/>`);
    blocks.push(`<polygon points="694,130 1000,130 1000,520 790,442" fill="${palette[1]}" opacity="0.34"/>`);
    blocks.push(`<rect x="625" y="682" width="399" height="248" fill="${palette[2]}" opacity="0.25"/>`);
  }

  blocks.push(`<rect x="0" y="0" width="1024" height="1024" fill="url(#paper-vignette)" opacity="0.36"/>`);
  return `<g id="curated-background">${blocks.join("")}</g>`;
}

function renderCuratedRarityAura(profile: WalletProfile, colors: PortraitColorSet, blueprint: CuratedPortraitBlueprint): SvgPart {
  if (profile.rarityTier === "Common") {
    return `<g id="curated-rarity-aura"></g>`;
  }
  if (profile.rarityTier === "Uncommon") {
    return `<g id="curated-rarity-aura" opacity="0.18"><rect x="780" y="150" width="92" height="92" fill="${colors.accent}"/></g>`;
  }
  if (profile.rarityTier === "Rare") {
    return `<g id="curated-rarity-aura" opacity="0.24"><polygon points="760,130 910,130 910,280" fill="${colors.gold}"/><rect x="128" y="705" width="165" height="86" fill="${colors.cool}"/></g>`;
  }
  if (profile.rarityTier === "Epic") {
    return `<g id="curated-rarity-aura" opacity="0.28"><rect x="104" y="116" width="190" height="190" fill="${colors.warm}"/><polygon points="720,118 918,315 720,315" fill="${colors.gold}"/></g>`;
  }

  return `<g id="curated-rarity-aura" opacity="0.34">
    <rect x="82" y="100" width="220" height="250" fill="${colors.warm}"/>
    <polygon points="735,95 960,350 735,350" fill="${colors.gold}"/>
    <rect x="770" y="670" width="150" height="210" fill="${colors.cool}"/>
    <path d="${blueprint.isFeminine ? "M360 210 L430 138 L500 210 L570 138 L640 210" : "M325 215 L390 135 L455 215 L520 135 L585 215 L650 135 L715 215"}" fill="none" stroke="${colors.gold}" stroke-width="7"/>
  </g>`;
}

function renderCuratedHairBack(colors: PortraitColorSet, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const hair = "#15140F";
  if (blueprint.hair === 8) {
    return `<g id="curated-hair-back"><path d="M ${cx - 250} 185 L ${cx + 215} 185 L ${cx + 238} 318 L ${cx + 120} 285 L ${cx + 95} 210 L ${cx - 40} 198 L ${cx - 132} 245 L ${cx - 168} 560 L ${cx - 252} 620 Z" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 9) {
    return `<g id="curated-hair-back"><path d="M ${cx - 260} 250 C ${cx - 220} 95 ${cx + 135} 70 ${cx + 250} 185 L ${cx + 220} 330 C ${cx + 60} 262 ${cx - 108} 292 ${cx - 250} 410 Z" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 10) {
    return `<g id="curated-hair-back"><rect x="${cx - 230}" y="150" width="420" height="150" fill="${hair}"/><polygon points="${cx - 230},300 ${cx - 130},300 ${cx - 190},570 ${cx - 255},620" fill="${hair}"/><polygon points="${cx + 190},300 ${cx + 235},300 ${cx + 210},480 ${cx + 160},450" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 0) {
    return `<g id="curated-hair-back"><path d="M ${cx - 250} 210 C ${cx - 188} 72 ${cx + 200} 65 ${cx + 278} 214 C ${cx + 340} 330 ${cx + 280} 458 ${cx + 182} 458 C ${cx + 130} 310 ${cx + 42} 245 ${cx - 102} 280 L ${cx - 142} 600 L ${cx - 238} 660 Z" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 1) {
    return `<g id="curated-hair-back"><path d="M ${cx - 252} 260 C ${cx - 230} 80 ${cx + 205} 45 ${cx + 295} 218 L ${cx + 262} 760 C ${cx + 90} 840 ${cx - 120} 820 ${cx - 260} 740 Z" fill="${hair}"/><rect x="${cx - 238}" y="470" width="82" height="330" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 2) {
    return `<g id="curated-hair-back"><path d="M ${cx - 270} 195 C ${cx - 145} 38 ${cx + 155} 44 ${cx + 270} 190 L ${cx + 270} 382 L ${cx + 118} 335 L ${cx + 95} 215 L ${cx - 18} 182 L ${cx - 118} 245 L ${cx - 150} 640 L ${cx - 260} 640 Z" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 3) {
    return `<g id="curated-hair-back"><path d="M ${cx - 305} 255 C ${cx - 245} 80 ${cx + 210} 62 ${cx + 292} 238 C ${cx + 375} 430 ${cx + 218} 710 ${cx + 318} 945 L ${cx + 120} 945 C ${cx + 70} 692 ${cx + 82} 410 ${cx - 10} 165 C ${cx - 70} 432 ${cx - 120} 705 ${cx - 55} 945 L ${cx - 250} 945 C ${cx - 150} 710 ${cx - 380} 470 ${cx - 305} 255 Z" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 4) {
    return `<g id="curated-hair-back"><path d="M ${cx - 278} 224 C ${cx - 260} 84 ${cx + 250} 82 ${cx + 282} 230 L ${cx + 282} 700 C ${cx + 140} 800 ${cx - 125} 795 ${cx - 270} 705 Z" fill="${hair}"/><rect x="${cx - 230}" y="252" width="430" height="46" fill="${colors.accent}" opacity="0.26"/></g>`;
  }
  if (blueprint.hair === 5) {
    return `<g id="curated-hair-back"><path d="M ${cx - 280} 155 L ${cx + 250} 155 L ${cx + 250} 310 C ${cx + 150} 245 ${cx - 65} 225 ${cx - 280} 315 Z" fill="${hair}"/><polygon points="${cx - 250},300 ${cx - 170},250 ${cx - 205},640 ${cx - 280},690" fill="${hair}"/></g>`;
  }
  return `<g id="curated-hair-back"><path d="M ${cx - 250} 200 C ${cx - 160} 60 ${cx + 190} 55 ${cx + 274} 212 L ${cx + 220} 412 C ${cx + 70} 345 ${cx - 70} 338 ${cx - 230} 425 Z" fill="${hair}"/></g>`;
}

function renderCuratedHead(colors: PortraitColorSet, scores: WalletScores, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const height = lerp(540, 680, scores.age / 100);
  const width = lerp(390, 530, scores.wealth / 100);
  const top = 165;
  const bottom = top + height;
  const left = cx - width / 2;
  const right = cx + width / 2;
  const skin = colors.skin;

  if (blueprint.face === 1) {
    return `<g id="curated-head"><polygon points="${left + 40},${top + 90} ${cx + 120},${top + 20} ${right},${top + 140} ${right - 30},${bottom - 150} ${cx + 20},${bottom + 10} ${left + 80},${bottom - 70} ${left - 20},${top + 250}" fill="${skin}"/></g>`;
  }
  if (blueprint.face === 2) {
    return `<g id="curated-head"><rect x="${left + 30}" y="${top + 70}" width="${width - 40}" height="${height - 130}" fill="${skin}"/><polygon points="${left + 30},${top + 70} ${cx - 20},${top - 8} ${right - 10},${top + 70}" fill="${skin}"/></g>`;
  }
  if (blueprint.face === 3) {
    return `<g id="curated-head"><path d="M ${left + 130} ${top + 10} C ${right - 80} ${top - 44} ${right + 45} ${top + 210} ${right - 55} ${bottom - 95} C ${right - 130} ${bottom + 55} ${left + 140} ${bottom + 45} ${left + 50} ${bottom - 115} C ${left - 35} ${top + 240} ${left + 24} ${top + 90} ${left + 130} ${top + 10} Z" fill="${skin}"/></g>`;
  }
  if (blueprint.face === 4) {
    return `<g id="curated-head"><path d="M ${left + 90} ${top + 35} L ${right - 20} ${top + 85} L ${right + 10} ${top + 330} L ${cx + 40} ${bottom} L ${left + 35} ${bottom - 100} L ${left - 20} ${top + 260} Z" fill="${skin}"/></g>`;
  }
  if (blueprint.face === 5) {
    return `<g id="curated-head"><path d="M ${left + 45} ${top + 115} C ${left + 125} ${top - 8} ${right - 25} ${top + 24} ${right + 35} ${top + 170} C ${right + 82} ${top + 315} ${right - 45} ${bottom - 20} ${cx - 5} ${bottom + 20} C ${cx - 140} ${bottom - 40} ${left - 30} ${top + 300} ${left + 45} ${top + 115} Z" fill="${skin}"/></g>`;
  }
  if (blueprint.face === 6) {
    return `<g id="curated-head"><path d="M ${left + 115} ${top + 10} C ${right - 20} ${top - 20} ${right + 15} ${top + 205} ${right - 70} ${bottom - 80} C ${right - 150} ${bottom + 35} ${left + 100} ${bottom + 40} ${left + 35} ${bottom - 100} C ${left - 25} ${top + 250} ${left + 2} ${top + 70} ${left + 115} ${top + 10} Z" fill="${skin}"/></g>`;
  }
  return `<g id="curated-head"><path d="M ${left + 110} ${top + 4} C ${right - 25} ${top - 24} ${right + 18} ${top + 220} ${right - 60} ${bottom - 85} C ${right - 135} ${bottom + 38} ${left + 85} ${bottom + 34} ${left + 42} ${bottom - 108} C ${left - 20} ${top + 245} ${left + 4} ${top + 72} ${left + 110} ${top + 4} Z" fill="${skin}"/></g>`;
}

function renderCuratedFacePlanes(colors: PortraitColorSet, scores: WalletScores, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const red = colors.backShapes[0] ?? colors.warm;
  const cheek = colors.cheek;
  const blue = colors.chin;
  const gold = colors.gold;
  const accent = colors.accent;
  const opacity = lerp(0.66, 0.9, scores.tx / 100);
  const split = blueprint.headTurn === 2 ? 30 : blueprint.headTurn === 0 ? -30 : 0;
  const rareAccent = blueprint.rareItem >= 3
    ? `<rect x="${cx + 115}" y="500" width="96" height="142" fill="${accent}" opacity="0.38"/>`
    : "";

  const variants = [
    `<polygon points="${cx - 230},330 ${cx - 55},292 ${cx - 105},548 ${cx - 260},540" fill="${red}" opacity="0.68"/><polygon points="${cx - 2},238 ${cx + 168},298 ${cx + 145},640 ${cx - 4},718" fill="${gold}" opacity="0.9"/><rect x="${cx - 185}" y="575" width="362" height="126" fill="${blue}" opacity="${opacity}"/>`,
    `<rect x="${cx - 238}" y="282" width="168" height="150" fill="${red}" opacity="0.7"/><polygon points="${cx - 58},252 ${cx + 84},345 ${cx - 22},530" fill="${gold}" opacity="0.84"/><polygon points="${cx - 228},590 ${cx - 20},555 ${cx + 66},712 ${cx - 122},730" fill="${blue}" opacity="0.9"/>`,
    `<polygon points="${cx - 226},365 ${cx - 42},292 ${cx - 80},548 ${cx - 248},540" fill="${cheek}" opacity="0.62"/><polygon points="${cx - 6},252 ${cx + 150},224 ${cx + 230},420 ${cx - 4},430" fill="${gold}" opacity="0.88"/><path d="M ${cx - 168} 558 L ${cx + 210} 548 L ${cx + 240} 670 L ${cx - 122} 698 Z" fill="${blue}" opacity="0.86"/>`,
    `<rect x="${cx - 232}" y="258" width="184" height="176" fill="${red}" opacity="0.68"/><rect x="${cx - 44}" y="258" width="118" height="320" fill="${gold}" opacity="0.82"/><rect x="${cx - 205}" y="582" width="405" height="116" fill="${blue}" opacity="0.88"/>`,
    `<polygon points="${cx - 248},375 ${cx - 68},305 ${cx - 112},548 ${cx - 292},548" fill="${red}" opacity="0.62"/><path d="M ${cx - 162} 558 L ${cx + 238} 548 L ${cx + 272} 660 L ${cx - 120} 695 Z" fill="${blue}" opacity="0.84"/><polygon points="${cx + 178},430 ${cx + 270},515 ${cx + 190},620" fill="${gold}" opacity="0.66"/>`,
    `<polygon points="${cx - 184 + split},305 ${cx - 68 + split},262 ${cx - 92 + split},710 ${cx - 188 + split},702" fill="${gold}" opacity="0.84"/><polygon points="${cx + 56},318 ${cx + 230},372 ${cx + 206},548 ${cx + 60},520" fill="${red}" opacity="0.7"/><rect x="${cx - 112}" y="578" width="320" height="88" fill="${blue}" opacity="0.9"/>`
  ];

  return `<g id="curated-face-planes">${variants[blueprint.face % variants.length]}${rareAccent}</g>`;
}

function renderCuratedHairFront(colors: PortraitColorSet, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const hair = "#15140F";
  if (blueprint.hair === 8) {
    return `<g id="curated-hair-front"><polygon points="${cx - 228},215 ${cx - 38},178 ${cx - 132},505" fill="${hair}"/><rect x="${cx - 38}" y="178" width="265" height="86" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 9) {
    return `<g id="curated-hair-front"><path d="M ${cx - 235} 245 C ${cx - 80} 115 ${cx + 215} 135 ${cx + 275} 292 C ${cx + 160} 252 ${cx + 5} 242 ${cx - 205} 360 Z" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 10) {
    return `<g id="curated-hair-front"><rect x="${cx - 230}" y="150" width="420" height="96" fill="${hair}"/><rect x="${cx - 60}" y="150" width="70" height="390" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 6) {
    return `<g id="curated-hair-front"><path d="M ${cx - 235} 245 C ${cx - 90} 122 ${cx + 188} 132 ${cx + 255} 252 C ${cx + 120} 235 ${cx - 20} 245 ${cx - 205} 355 Z" fill="${hair}"/><polygon points="${cx + 60},245 ${cx + 240},270 ${cx + 230},520 ${cx + 135},430" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 7) {
    return `<g id="curated-hair-front"><path d="M ${cx - 270} 220 C ${cx - 165} 80 ${cx + 170} 72 ${cx + 270} 220 L ${cx + 250} 335 C ${cx + 60} 272 ${cx - 80} 278 ${cx - 250} 365 Z" fill="${hair}"/><rect x="${cx - 250}" y="348" width="86" height="360" fill="${hair}"/><rect x="${cx + 175}" y="330" width="82" height="380" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 2 || blueprint.hair === 5) {
    return `<g id="curated-hair-front"><polygon points="${cx - 215},220 ${cx - 45},185 ${cx - 145},520" fill="${hair}"/><path d="M ${cx - 35} 190 C ${cx + 95} 122 ${cx + 300} 150 ${cx + 310} 310 C ${cx + 295} 385 ${cx + 220} 412 ${cx + 160} 370 L ${cx + 140} 220 C ${cx + 70} 190 ${cx + 15} 190 ${cx - 35} 190 Z" fill="${hair}"/></g>`;
  }
  if (blueprint.hair === 3 || blueprint.hair === 4) {
    return `<g id="curated-hair-front"><path d="M ${cx - 235} 242 C ${cx - 110} 145 ${cx + 130} 150 ${cx + 248} 245 L ${cx + 220} 330 C ${cx + 70} 295 ${cx - 82} 292 ${cx - 220} 350 Z" fill="${hair}"/><path d="M ${cx - 180} 238 C ${cx - 55} 188 ${cx + 110} 190 ${cx + 205} 245" fill="none" stroke="${colors.bg}" stroke-width="20" opacity="0.86"/></g>`;
  }
  return `<g id="curated-hair-front"><path d="M ${cx - 245} 245 C ${cx - 95} 128 ${cx + 230} 150 ${cx + 280} 300 C ${cx + 260} 360 ${cx + 205} 385 ${cx + 145} 355 C ${cx + 120} 260 ${cx + 40} 215 ${cx - 95} 245 L ${cx - 135} 490 L ${cx - 205} 540 Z" fill="${hair}"/></g>`;
}

function renderCuratedEyes(colors: PortraitColorSet, scores: WalletScores, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const y = lerp(400, 430, scores.age / 100);
  const gap = blueprint.face === 5 ? 126 : 148;
  const iris = scores.wealth > 70 ? colors.cool : "#2F6F91";
  const left = renderCuratedEye(cx - gap, y + (blueprint.headTurn === 0 ? 8 : 0), 132, iris, -7);
  const right = renderCuratedEye(cx + gap * 0.82, y + (blueprint.headTurn === 2 ? 8 : -3), blueprint.headTurn === 0 ? 96 : 132, iris, 5);
  const brows = `<path d="M ${cx - gap - 70} ${y - 48} Q ${cx - gap} ${y - 84} ${cx - gap + 92} ${y - 42}" fill="none" stroke="#15140F" stroke-width="22" stroke-linecap="round"/><path d="M ${cx + gap * 0.82 - 70} ${y - 50} Q ${cx + gap * 0.82} ${y - 82} ${cx + gap * 0.82 + 92} ${y - 44}" fill="none" stroke="#15140F" stroke-width="22" stroke-linecap="round"/>`;
  const glasses = blueprint.eyes === 5 || blueprint.rareItem >= 4
    ? `<circle cx="${cx - gap}" cy="${y}" r="58" fill="none" stroke="#15140F" stroke-width="12"/><circle cx="${cx + gap * 0.82}" cy="${y - 3}" r="58" fill="none" stroke="#15140F" stroke-width="12"/><line x1="${cx - gap + 58}" y1="${y}" x2="${cx + gap * 0.82 - 58}" y2="${y - 3}" stroke="#15140F" stroke-width="9"/>`
    : "";

  return `<g id="curated-eyes">${brows}${left}${right}${glasses}</g>`;
}

function renderCuratedEye(cx: number, cy: number, width: number, iris: string, tilt: number): SvgPart {
  const h = width * 0.28;
  return `<g transform="rotate(${tilt} ${cx} ${cy})"><path d="M ${cx - width / 2} ${cy} Q ${cx} ${cy - h} ${cx + width / 2} ${cy} Q ${cx} ${cy + h * 0.72} ${cx - width / 2} ${cy} Z" fill="#F7EEDB" stroke="#15140F" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="${h * 0.54}" fill="${iris}"/><circle cx="${cx}" cy="${cy}" r="${h * 0.3}" fill="#15140F"/></g>`;
}

function renderCuratedNose(colors: PortraitColorSet, scores: WalletScores, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const lean = lerp(-35, 38, scores.multichain / 100) + (blueprint.headTurn - 1) * 18;
  const fill = blueprint.nose % 2 === 0 ? colors.warmDark : colors.coolDark;
  if (blueprint.nose === 3) {
    return `<g id="curated-nose"><polygon points="${cx - 5},345 ${cx + lean + 70},625 ${cx - 82},600" fill="${fill}" opacity="0.64"/><polygon points="${cx + 22},386 ${cx + lean + 38},590 ${cx - 10},566" fill="${colors.bg}" opacity="0.9"/><path d="M ${cx - 72} 610 C ${cx - 20} 632 ${cx + 50} 612 ${cx + 78} 628" fill="none" stroke="#15140F" stroke-width="10" stroke-linecap="round"/></g>`;
  }
  return `<g id="curated-nose"><polygon points="${cx},350 ${cx + lean},610 ${cx - 95},585" fill="${fill}" opacity="0.68"/><polygon points="${cx + 18},382 ${cx + lean + 26},585 ${cx - 20},560" fill="${colors.bg}" opacity="0.92"/><path d="M ${cx - 86} 600 C ${cx - 34} 628 ${cx + 52} 604 ${cx + 70} 624" fill="none" stroke="#15140F" stroke-width="11" stroke-linecap="round"/></g>`;
}

function renderCuratedMouth(colors: PortraitColorSet, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const y = 675;
  const w = blueprint.mouth % 3 === 0 ? 178 : 138;
  const lip = blueprint.isFeminine ? colors.lip : colors.backShapes[0] ?? colors.warm;
  if (blueprint.mouth === 4) {
    return `<g id="curated-mouth"><polygon points="${cx - w / 2},${y} ${cx - 8},${y - 25} ${cx + w / 2},${y + 2} ${cx + 8},${y + 24}" fill="${lip}"/><line x1="${cx - w / 2 - 12}" y1="${y + 18}" x2="${cx + w / 2 + 14}" y2="${y + 18}" stroke="#15140F" stroke-width="5"/></g>`;
  }
  return `<g id="curated-mouth"><path d="M ${cx - w / 2} ${y} C ${cx - 32} ${y - 36} ${cx - 8} ${y - 18} ${cx} ${y} C ${cx + 32} ${y - 36} ${cx + w / 2} ${y - 4} ${cx + w / 2} ${y} C ${cx + 48} ${y + 32} ${cx - 58} ${y + 32} ${cx - w / 2} ${y} Z" fill="${lip}"/><path d="M ${cx - w / 2 - 12} ${y + 16} C ${cx - 20} ${y + 42} ${cx + 55} ${y + 38} ${cx + w / 2 + 18} ${y + 16}" fill="none" stroke="#15140F" stroke-width="5"/></g>`;
}

function renderCuratedClothing(colors: PortraitColorSet, scores: WalletScores, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const clothing = portraitClothingColors(colors, {
    faceArchetype: "oval",
    variant: blueprint.face,
    isFeminine: blueprint.isFeminine,
    hairStyle: blueprint.hair,
    columnPattern: blueprint.clothing % 4,
    facadePattern: blueprint.clothing % 4,
    spherePattern: 0,
    rampPattern: blueprint.background % 4,
    groundPattern: blueprint.clothing % 4,
    diamondX: 0,
    centralX: 0,
    sunCx: 0,
    sunCy: 0,
    sphereAnchorX: 0,
    sphereAnchorY: 0,
    lowerShift: 0,
    rampStartY: 0,
    rampEndX: 0,
    rampEndY: 0,
    mirror: false
  });
  const neckW = lerp(130, 220, scores.age / 100);
  const x = cx - neckW / 2;
  const jacket = clothing[blueprint.clothing % clothing.length] ?? colors.cool;
  const panel = clothing[(blueprint.clothing + 2) % clothing.length] ?? colors.warm;
  const shirt = clothing[(blueprint.clothing + 4) % clothing.length] ?? colors.bg;
  const brooch = blueprint.rareItem >= 2 ? `<rect x="${cx + 84}" y="774" width="52" height="52" fill="${colors.gold}" opacity="0.72" transform="rotate(45 ${cx + 110} 800)"/><rect x="${cx + 74}" y="764" width="72" height="72" fill="none" stroke="${colors.warm}" stroke-width="6" opacity="0.38" transform="rotate(45 ${cx + 110} 800)"/>` : "";

  return `<g id="curated-clothing">
    <rect x="${x}" y="720" width="${neckW}" height="280" fill="${jacket}" opacity="0.92"/>
    <polygon points="${x + neckW},758 910,1024 ${x + neckW},1024" fill="${panel}" opacity="0.9"/>
    <polygon points="${x},762 145,1024 ${x},1024" fill="${shirt}" opacity="0.9"/>
    <polygon points="${cx - 75},760 ${cx},860 ${cx + 75},760" fill="${colors.bg}" opacity="0.88"/>
    ${blueprint.clothing >= 5 ? `<rect x="${cx - 160}" y="820" width="320" height="54" fill="${colors.gold}" opacity="0.52"/>` : ""}
    ${brooch}
  </g>`;
}

function renderCuratedRareItem(profile: WalletProfile, colors: PortraitColorSet, params: ArtParameters, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  if (blueprint.rareItem === 0 && !params.hasRareSymbol) {
    return `<g id="curated-rare-item"></g>`;
  }
  if (blueprint.rareItem === 1) {
    return `<g id="curated-rare-item"><rect x="${cx + 190}" y="255" width="42" height="42" fill="none" stroke="${colors.accent}" stroke-width="5" transform="rotate(18 ${cx + 211} 276)" opacity="0.72"/></g>`;
  }
  if (blueprint.rareItem === 2) {
    return `<g id="curated-rare-item"><rect x="${cx + 186}" y="510" width="58" height="58" fill="none" stroke="${colors.gold}" stroke-width="7" opacity="0.72" transform="rotate(45 ${cx + 215} 539)"/></g>`;
  }
  if (blueprint.rareItem === 3) {
    return `<g id="curated-rare-item"><polygon points="${cx + 165},250 ${cx + 210},190 ${cx + 255},250 ${cx + 210},310" fill="none" stroke="${colors.gold}" stroke-width="8"/><rect x="${cx - 258}" y="590" width="62" height="48" fill="${colors.accent}" opacity="0.46"/></g>`;
  }
  if (blueprint.rareItem === 4) {
    return `<g id="curated-rare-item"><path d="M ${cx - 260} 235 L ${cx - 205} 155 L ${cx - 150} 235 L ${cx - 70} 145 L ${cx} 235 L ${cx + 70} 145 L ${cx + 150} 235 L ${cx + 205} 155 L ${cx + 260} 235" fill="none" stroke="${colors.gold}" stroke-width="8" opacity="0.82"/></g>`;
  }
  return `<g id="curated-rare-item"><path d="M ${cx - 285} 232 L ${cx - 220} 130 L ${cx - 155} 232 L ${cx - 65} 118 L ${cx} 232 L ${cx + 65} 118 L ${cx + 155} 232 L ${cx + 220} 130 L ${cx + 285} 232" fill="none" stroke="${colors.gold}" stroke-width="10"/><rect x="${cx + 212}" y="502" width="76" height="76" fill="${colors.gold}" opacity="0.44" transform="rotate(45 ${cx + 250} 540)"/></g>`;
}

function renderCuratedLinework(_colors: PortraitColorSet, blueprint: CuratedPortraitBlueprint, cx: number): SvgPart {
  const vertical = blueprint.headTurn === 2 ? cx + 5 : cx - 8;
  return `<g id="curated-linework" opacity="0.36">
    <line x1="${vertical}" y1="165" x2="${vertical}" y2="760" stroke="#15140F" stroke-width="2"/>
    <line x1="${cx - 330}" y1="735" x2="${cx + 330}" y2="735" stroke="#15140F" stroke-width="2"/>
    <line x1="${cx - 230}" y1="330" x2="${cx + 250}" y2="280" stroke="#15140F" stroke-width="1.5"/>
  </g>`;
}

export function getArtParameters(scores: WalletScores): ArtParameters {
  const clamped = clampScores(scores);
  const palette = selectPalette(clamped.wealth).name;
  const towerCount = Math.max(2, Math.min(9, Math.floor(2 + (clamped.tx / 100) * 7)));
  const sphereCount = Math.max(1, Math.min(6, Math.round(1 + (clamped.defi / 100) * 5)));
  const diagonalCount = Math.max(1, Math.min(8, Math.round(1 + (clamped.risk / 100) * 7)));
  const riskOpacity = clamped.risk < 40 ? lerp(0.05, 0.15, clamped.risk / 40) : lerp(0.16, 0.4, (clamped.risk - 40) / 60);

  return {
    palette,
    sunRadius: lerp(60, 180, clamped.wealth / 100),
    towerCount,
    sphereCount,
    diagonalCount,
    hasBridge: clamped.multichain > 60,
    hasRareSymbol: clamped.nft > 68,
    riskOpacity,
    ageMultiplier: lerp(0.7, 1.4, clamped.age / 100)
  };
}

function renderPortraitBackground(palette: Palette, scores: WalletScores, layout: CompositionLayout, rng: () => number): SvgPart {
  const colors = portraitColorSet(palette, layout);
  const blocks = Array.from({ length: 3 + Math.round(scores.tx / 35) }, (_, index) => {
    const x = snap(35 + rng() * 830, 20);
    const y = snap(80 + rng() * 690, 20);
    const w = snap(70 + rng() * 150, 10);
    const h = snap(90 + rng() * 220, 10);
    const color = colors.softBlocks[index % colors.softBlocks.length] ?? colors.bg;
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}" opacity="${lerp(0.12, 0.28, rng())}"/>`;
  });

  return `<g id="portrait-background">
    <rect x="0" y="0" width="1024" height="1024" fill="${colors.bg}"/>
    <rect x="0" y="0" width="1024" height="1024" fill="${colors.bgWash}" opacity="0.34"/>
    <rect x="0" y="0" width="1024" height="1024" fill="url(#paper-vignette)" opacity="0.42"/>
    ${blocks.join("")}
    <path d="M ${layout.mirror ? 820 : 70} 205 L ${layout.mirror ? 650 : 250} 330 L ${layout.mirror ? 810 : 250} 905 L ${layout.mirror ? 955 : 58} 850 Z" fill="${colors.warm}" opacity="${lerp(0.3, 0.62, scores.risk / 100)}"/>
  </g>`;
}

function renderPortraitBackShapes(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const colors = portraitColorSet(palette, layout);
  const back = colors.backShapes;
  const red = back[0] ?? colors.warm;
  const redAlt = back[1] ?? colors.cheek;
  const redSoft = back[2] ?? colors.accent;
  const yellow = colors.gold;
  const blue = colors.cool;

  if (layout.variant === 1 || layout.variant === 4) {
    return `<g id="portrait-back-shapes">
      <rect x="88" y="255" width="350" height="122" fill="${yellow}" opacity="0.9"/>
      <polygon points="438,255 640,255 640,450 438,450" fill="${red}" opacity="0.88"/>
      <rect x="640" y="350" width="86" height="170" fill="${blue}" opacity="0.92"/>
      <polygon points="138,377 300,377 168,505" fill="${redAlt}" opacity="0.72"/>
      <rect x="705" y="210" width="110" height="72" fill="${redSoft}" opacity="0.36"/>
    </g>`;
  }

  if (layout.variant === 2) {
    return `<g id="portrait-back-shapes">
      <circle cx="300" cy="330" r="145" fill="${yellow}" opacity="0.86"/>
      <rect x="92" y="150" width="270" height="285" fill="${red}" opacity="0.86"/>
      <polygon points="555,220 730,415 525,415" fill="${redAlt}" opacity="0.8"/>
      <rect x="675" y="360" width="92" height="155" fill="${blue}" opacity="0.9"/>
      <circle cx="760" cy="245" r="54" fill="${redSoft}" opacity="0.24"/>
    </g>`;
  }

  return `<g id="portrait-back-shapes">
    <rect x="${layout.mirror ? 650 : 90}" y="130" width="300" height="355" fill="${red}" opacity="0.86"/>
    <polygon points="${layout.mirror ? "650,330 500,330 650,490" : "90,330 245,330 90,490"}" fill="${yellow}" opacity="0.92"/>
    <polygon points="${layout.mirror ? "565,520 730,350 730,620" : "460,520 295,350 295,620"}" fill="${blue}" opacity="0.88"/>
    <rect x="${layout.mirror ? 720 : 182}" y="520" width="150" height="98" fill="${redAlt}" opacity="0.42"/>
    <polygon points="${layout.mirror ? "845,205 905,285 785,285" : "180,205 240,285 120,285"}" fill="${redSoft}" opacity="0.34"/>
  </g>`;
}

function renderPortraitNeckAndShoulders(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const x = layout.mirror ? 360 : 455;
  const neckW = lerp(140, 230, scores.age / 100);
  const colors = portraitColorSet(palette, layout);
  const clothing = portraitClothingColors(colors, layout);
  const jacket = clothing[layout.groundPattern % clothing.length] ?? colors.cool;
  const vest = clothing[(layout.groundPattern + 2) % clothing.length] ?? colors.warm;
  const blouse = layout.isFeminine ? clothing[3] ?? colors.bg : clothing[4] ?? "#F0E7D6";

  return `<g id="portrait-neck-shoulders">
    <rect x="${x}" y="665" width="${neckW}" height="240" fill="${vest}" opacity="0.9"/>
    <polygon points="${x + neckW},705 885,930 ${x + neckW},930" fill="${jacket}" opacity="0.94"/>
    <polygon points="${x - 25},745 210,930 ${x - 25},930" fill="${blouse}" opacity="0.9"/>
    <polygon points="760,705 940,980 760,930" fill="${clothing[(layout.groundPattern + 1) % clothing.length] ?? colors.coolDark}" opacity="${lerp(0.58, 0.86, scores.risk / 100)}"/>
    ${layout.isFeminine ? `<path d="M ${x - 18} 745 Q ${x + neckW / 2} 820 ${x + neckW + 26} 745" fill="none" stroke="${colors.gold}" stroke-width="10" opacity="0.54"/>` : ""}
    ${layout.rampPattern === 2 ? `<rect x="${x + neckW + 20}" y="750" width="72" height="145" fill="${clothing[(layout.groundPattern + 3) % clothing.length] ?? colors.accent}" opacity="0.58"/>` : ""}
  </g>`;
}

function renderPortraitHairBack(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  if (!layout.isFeminine) {
    return `<g id="portrait-hair-back"></g>`;
  }

  const colors = portraitColorSet(palette, layout);
  const cx = layout.mirror ? 560 : 500;
  const length = lerp(520, 720, scores.age / 100);
  const shine = layout.hairStyle % 2 === 0 ? colors.warmDark : colors.coolDark;

  if (layout.hairStyle === 1) {
    return `<g id="portrait-hair-back">
      <path d="M ${cx - 280} 190 C ${cx - 390} 380 ${cx - 300} 735 ${cx - 150} 945 L ${cx - 10} 945 C ${cx - 98} 650 ${cx - 88} 365 ${cx - 5} 150 Z" fill="#111318" opacity="0.98"/>
      <path d="M ${cx + 30} 155 C ${cx + 265} 250 ${cx + 330} 610 ${cx + 245} 930 L ${cx + 80} 930 C ${cx + 115} 620 ${cx + 95} 360 ${cx - 5} 150 Z" fill="#111318" opacity="0.98"/>
      <path d="M ${cx + 82} 245 C ${cx + 178} 410 ${cx + 190} 650 ${cx + 135} ${length}" fill="none" stroke="${shine}" stroke-width="18" opacity="0.22"/>
    </g>`;
  }

  if (layout.hairStyle === 2) {
    return `<g id="portrait-hair-back">
      <path d="M ${cx - 260} 215 C ${cx - 205} 90 ${cx + 205} 70 ${cx + 292} 225 L ${cx + 250} 690 C ${cx + 120} 760 ${cx - 110} 760 ${cx - 250} 690 Z" fill="#111318" opacity="0.98"/>
      <rect x="${cx - 240}" y="455" width="90" height="360" fill="#111318"/>
      <rect x="${cx + 165}" y="455" width="92" height="360" fill="#111318"/>
      <path d="M ${cx - 210} 235 C ${cx - 60} 160 ${cx + 100} 160 ${cx + 235} 235" fill="none" stroke="${colors.bg}" stroke-width="26" opacity="0.86"/>
    </g>`;
  }

  if (layout.hairStyle === 3) {
    return `<g id="portrait-hair-back">
      <path d="M ${cx - 310} 260 C ${cx - 250} 80 ${cx + 210} 64 ${cx + 292} 238 C ${cx + 380} 430 ${cx + 215} 710 ${cx + 320} 930 L ${cx + 120} 930 C ${cx + 72} 700 ${cx + 82} 410 ${cx - 15} 165 C ${cx - 70} 430 ${cx - 115} 700 ${cx - 55} 930 L ${cx - 250} 930 C ${cx - 150} 700 ${cx - 390} 470 ${cx - 310} 260 Z" fill="#111318"/>
      <polygon points="${cx - 110},230 ${cx + 24},165 ${cx - 55},610" fill="${colors.bg}" opacity="0.92"/>
    </g>`;
  }

  if (layout.hairStyle === 4) {
    return `<g id="portrait-hair-back">
      <path d="M ${cx - 270} 230 C ${cx - 260} 90 ${cx + 250} 85 ${cx + 282} 232 L ${cx + 282} 705 C ${cx + 140} 800 ${cx - 125} 795 ${cx - 270} 705 Z" fill="#111318"/>
      <polygon points="${cx - 255},700 ${cx - 135},930 ${cx - 15},700" fill="#111318"/>
      <polygon points="${cx + 70},700 ${cx + 195},930 ${cx + 285},700" fill="#111318"/>
      <rect x="${cx - 215}" y="258" width="420" height="45" fill="${colors.accent}" opacity="0.32"/>
    </g>`;
  }

  return `<g id="portrait-hair-back">
    <path d="M ${cx - 270} 210 C ${cx - 210} 55 ${cx + 195} 55 ${cx + 275} 208 C ${cx + 365} 395 ${cx + 255} 730 ${cx + 322} 950 L ${cx + 115} 950 C ${cx + 85} 655 ${cx + 110} 355 ${cx} 150 C ${cx - 95} 360 ${cx - 70} 655 ${cx - 110} 950 L ${cx - 310} 950 C ${cx - 230} 720 ${cx - 360} 400 ${cx - 270} 210 Z" fill="#111318"/>
    <path d="M ${cx - 175} 265 C ${cx - 112} 520 ${cx - 145} 720 ${cx - 205} 900" fill="none" stroke="${colors.accent}" stroke-width="14" opacity="0.2"/>
  </g>`;
}

function renderPortraitHead(palette: Palette, scores: WalletScores, _params: ArtParameters, layout: CompositionLayout): SvgPart {
  const colors = portraitColorSet(palette, layout);
  const cx = layout.mirror ? 560 : 500;
  const cy = 475;
  const width = lerp(410, 545, scores.wealth / 100);
  const height = lerp(555, 690, scores.age / 100);
  const left = cx - width / 2;
  const right = cx + width / 2;
  const top = cy - height / 2;
  const bottom = cy + height / 2;
  const chinInset = lerp(65, 135, scores.risk / 100);

  if (layout.isFeminine && (layout.variant === 0 || layout.variant === 2 || layout.variant === 5)) {
    return `<g id="portrait-head">
      <path d="M ${left + 140} ${top + 18} C ${right - 75} ${top - 52} ${right + 42} ${cy + 40} ${right - 42} ${bottom - 92} C ${right - 120} ${bottom + 50} ${left + 150} ${bottom + 64} ${left + 58} ${bottom - 98} C ${left - 38} ${cy - 12} ${left + 20} ${top + 88} ${left + 140} ${top + 18} Z" fill="${colors.skin}"/>
      <path d="M ${cx - 5} ${top + 28} C ${right - 95} ${top + 26} ${right - 2} ${cy + 68} ${right - 68} ${bottom - 84} C ${right - 132} ${bottom + 22} ${cx + 12} ${bottom + 36} ${cx - 5} ${bottom - 8} Z" fill="${colors.gold}" opacity="0.84"/>
      <path d="M ${left + 78} ${cy + 100} C ${left + 190} ${cy + 154} ${cx + 52} ${cy + 130} ${right - 74} ${cy + 118} L ${right - 104} ${bottom - 92} C ${cx + 18} ${bottom + 48} ${left + 100} ${bottom - 26} ${left + 78} ${cy + 100} Z" fill="${colors.chin}" opacity="0.9"/>
    </g>`;
  }

  if (layout.variant === 1) {
    return `<g id="portrait-head">
      <polygon points="${cx - 230},${top + 80} ${cx + 210},${top + 20} ${cx + 255},${cy + 165} ${cx + 80},${bottom + 18} ${cx - 170},${bottom - 40} ${cx - 265},${cy + 40}" fill="#F0E7D6"/>
      <polygon points="${cx + 5},${top + 55} ${cx + 240},${top + 100} ${cx + 210},${bottom - 58} ${cx + 10},${bottom + 12}" fill="${colors.gold}" opacity="0.95"/>
      <polygon points="${cx - 235},${cy + 65} ${cx + 42},${cy + 80} ${cx + 48},${bottom - 42} ${cx - 145},${bottom - 8}" fill="${colors.chin}" opacity="0.9"/>
    </g>`;
  }

  if (layout.variant === 3) {
    return `<g id="portrait-head">
      <rect x="${cx - 245}" y="${top + 75}" width="470" height="${height - 130}" fill="#F0E7D6"/>
      <polygon points="${cx - 245},${top + 75} ${cx - 40},${top + 5} ${cx + 225},${top + 75}" fill="#F0E7D6"/>
      <polygon points="${cx + 2},${top + 75} ${cx + 225},${top + 75} ${cx + 225},${bottom - 90} ${cx + 2},${bottom + 10}" fill="${colors.gold}" opacity="0.95"/>
      <rect x="${cx - 205}" y="${cy + 70}" width="395" height="145" fill="${colors.chin}" opacity="0.92"/>
    </g>`;
  }

  if (layout.variant === 4) {
    return `<g id="portrait-head">
      <path d="M ${cx - 300} ${top + 180} C ${cx - 245} ${top + 15} ${cx + 85} ${top - 48} ${cx + 255} ${top + 125} C ${cx + 360} ${cy + 250} ${cx + 5} ${bottom + 58} ${cx - 205} ${bottom - 80} C ${cx - 305} ${bottom - 160} ${cx - 360} ${cy + 20} ${cx - 300} ${top + 180} Z" fill="#F0E7D6"/>
      <path d="M ${cx - 5} ${top + 8} C ${cx + 185} ${top + 22} ${cx + 302} ${cy + 70} ${cx + 185} ${bottom - 60} C ${cx + 90} ${bottom + 20} ${cx + 20} ${bottom + 20} ${cx - 5} ${bottom - 20} Z" fill="${colors.gold}" opacity="0.82"/>
      <path d="M ${cx - 235} ${cy + 78} C ${cx - 120} ${cy + 120} ${cx + 60} ${cy + 108} ${cx + 180} ${cy + 102} L ${cx + 170} ${bottom - 90} C ${cx + 16} ${bottom + 22} ${cx - 205} ${bottom - 55} ${cx - 235} ${cy + 78} Z" fill="${colors.chin}" opacity="0.72"/>
    </g>`;
  }

  if (layout.variant === 2 || layout.variant === 5) {
    return `<g id="portrait-head">
      <path d="M ${left + 120} ${top + 30} C ${right - 30} ${top - 35} ${right + 20} ${cy + 45} ${right - 54} ${bottom - 72} C ${right - 125} ${bottom + 42} ${left + 100} ${bottom + 48} ${left + 38} ${bottom - 95} C ${left - 28} ${cy - 10} ${left + 18} ${top + 80} ${left + 120} ${top + 30} Z" fill="#F0E7D6"/>
      <path d="M ${cx} ${top + 20} C ${right - 30} ${top + 10} ${right + 5} ${cy + 55} ${right - 52} ${bottom - 78} C ${right - 105} ${bottom + 28} ${cx + 5} ${bottom + 22} ${cx} ${bottom - 20} Z" fill="${colors.gold}" opacity="0.9"/>
    </g>`;
  }

  return `<g id="portrait-head">
    <path d="M ${left + 110} ${top + 5} C ${right - 22} ${top - 25} ${right + 18} ${cy + 20} ${right - 58} ${bottom - 85} C ${right - 138} ${bottom + 38} ${left + chinInset} ${bottom + 34} ${left + 42} ${bottom - 108} C ${left - 18} ${cy - 55} ${left + 4} ${top + 74} ${left + 110} ${top + 5} Z" fill="#F0E7D6"/>
    <path d="M ${cx - 14} ${top + 12} L ${right - 34} ${top + 86} L ${right - 72} ${bottom - 90} C ${right - 150} ${bottom + 12} ${cx - 10} ${bottom + 8} ${cx - 14} ${bottom - 30} Z" fill="${colors.gold}" opacity="0.94"/>
    <path d="M ${left + 60} ${cy + 92} L ${cx + 8} ${cy + 85} L ${cx + 10} ${bottom - 30} C ${left + 150} ${bottom + 22} ${left + 72} ${bottom - 34} ${left + 60} ${cy + 92} Z" fill="${colors.chin}" opacity="0.92"/>
  </g>`;
}

function renderPortraitColorPlanes(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const cx = layout.mirror ? 560 : 500;
  const colors = portraitColorSet(palette, layout);
  const blue = colors.chin;
  const red = colors.warm;
  const yellow = colors.gold;
  const cheek = colors.cheek;
  const accent = colors.accent;

  if (layout.variant === 0) {
    return `<g id="portrait-color-planes">
      <polygon points="${cx - 250},360 ${cx - 95},330 ${cx - 150},555 ${cx - 295},520" fill="${red}" opacity="${lerp(0.42, 0.74, scores.risk / 100)}"/>
      <polygon points="${cx - 25},260 ${cx + 175},300 ${cx + 150},650 ${cx - 25},715" fill="${yellow}" opacity="0.9"/>
      <polygon points="${cx - 210},585 ${cx - 10},540 ${cx + 95},690 ${cx - 145},725" fill="${blue}" opacity="0.96"/>
      <polygon points="${cx + 78},370 ${cx + 240},420 ${cx + 210},560 ${cx + 40},520" fill="${accent}" opacity="0.62"/>
    </g>`;
  }

  if (layout.variant === 1) {
    return `<g id="portrait-color-planes">
      <rect x="${cx - 275}" y="310" width="215" height="118" fill="${yellow}" opacity="0.9"/>
      <polygon points="${cx - 70},240 ${cx + 80},350 ${cx - 20},525" fill="${red}" opacity="0.82"/>
      <rect x="${cx + 20}" y="450" width="${lerp(235, 385, scores.tx / 100)}" height="118" fill="${accent}" opacity="0.58"/>
      <polygon points="${cx - 255},585 ${cx - 30},555 ${cx + 65},720 ${cx - 120},735" fill="${blue}" opacity="0.95"/>
    </g>`;
  }

  if (layout.variant === 2) {
    return `<g id="portrait-color-planes">
      <polygon points="${cx - 245},360 ${cx - 50},300 ${cx - 82},560 ${cx - 255},545" fill="${red}" opacity="0.68"/>
      <polygon points="${cx - 8},250 ${cx + 145},228 ${cx + 245},420 ${cx - 5},430" fill="${yellow}" opacity="0.9"/>
      <path d="M ${cx - 185} 560 C ${cx - 55} 525 ${cx + 145} 548 ${cx + 230} 608 C ${cx + 95} 715 ${cx - 105} 735 ${cx - 205} 645 Z" fill="${blue}" opacity="0.92"/>
      <circle cx="${cx + 110}" cy="690" r="${lerp(44, 76, scores.defi / 100)}" fill="${cheek}" opacity="0.72"/>
    </g>`;
  }

  if (layout.variant === 3) {
    return `<g id="portrait-color-planes">
      <rect x="${cx - 255}" y="255" width="190" height="170" fill="${red}" opacity="0.74"/>
      <rect x="${cx - 62}" y="255" width="126" height="305" fill="${yellow}" opacity="0.88"/>
      <polygon points="${cx + 64},255 ${cx + 230},355 ${cx + 230},565 ${cx + 64},565" fill="${red}" opacity="0.84"/>
      <rect x="${cx - 210}" y="575" width="420" height="120" fill="${blue}" opacity="0.95"/>
      <circle cx="${cx - 20}" cy="715" r="${lerp(34, 64, scores.defi / 100)}" fill="${colors.bg}" opacity="0.9"/>
    </g>`;
  }

  if (layout.variant === 4) {
    return `<g id="portrait-color-planes">
      <polygon points="${cx - 275},370 ${cx - 70},300 ${cx - 112},555 ${cx - 300},550" fill="${red}" opacity="0.7"/>
      <polygon points="${cx - 20},260 ${cx + 175},230 ${cx + 260},420 ${cx + 0},435" fill="${yellow}" opacity="0.88"/>
      <path d="M ${cx - 170} 552 L ${cx + lerp(70, 255, scores.wealth / 100)} 540 L ${cx + lerp(110, 285, scores.wealth / 100)} 660 L ${cx - 120} 695 Z" fill="${blue}" opacity="0.88"/>
      <polygon points="${cx + 190},430 ${cx + 285},515 ${cx + 195},630" fill="${red}" opacity="0.62"/>
    </g>`;
  }

  if (layout.variant === 5) {
    return `<g id="portrait-color-planes">
      <rect x="${cx - 188}" y="300" width="105" height="385" fill="#F0E7D6" opacity="0.72"/>
      <polygon points="${cx - 70},260 ${cx + 72},245 ${cx + 50},720 ${cx - 90},710" fill="${yellow}" opacity="0.9"/>
      <polygon points="${cx + 56},310 ${cx + 238},370 ${cx + 210},555 ${cx + 60},520" fill="${red}" opacity="0.8"/>
      <rect x="${cx - 115}" y="570" width="${lerp(220, 330, scores.tx / 100)}" height="88" fill="${blue}" opacity="0.94"/>
      <circle cx="${cx - 72}" cy="642" r="34" fill="${colors.bg}" opacity="0.88"/>
    </g>`;
  }

  const planes = [
    `<polygon points="${cx - 235},390 ${cx - 70},360 ${cx - 95},545 ${cx - 260},545" fill="${red}" opacity="${lerp(0.45, 0.78, scores.risk / 100)}"/>`,
    `<polygon points="${cx - 20},325 ${cx + 130},220 ${cx + 250},420 ${cx - 10},420" fill="${red}" opacity="0.88"/>`,
    `<rect x="${cx - 5}" y="420" width="${lerp(210, 330, scores.tx / 100)}" height="150" fill="${yellow}" opacity="0.88"/>`,
    `<rect x="${cx - 135}" y="560" width="${lerp(270, 440, scores.wealth / 100)}" height="160" fill="${blue}" opacity="0.9"/>`
  ];

  if (layout.facadePattern === 2 || layout.variant === 5) {
    planes.push(`<circle cx="${cx - 80}" cy="690" r="${lerp(36, 72, scores.defi / 100)}" fill="${colors.bg}" opacity="0.92"/>`);
  } else {
    planes.push(`<polygon points="${cx - 35},410 ${cx + 45},575 ${cx - 65},575" fill="${yellow}" opacity="0.92"/>`);
  }

  return `<g id="portrait-color-planes">${planes.join("")}</g>`;
}

function renderPortraitHair(scores: WalletScores, layout: CompositionLayout): SvgPart {
  const cx = layout.mirror ? 560 : 500;
  const top = lerp(86, 140, scores.age / 100);
  const right = cx + lerp(230, 320, scores.wealth / 100);
  const left = cx - lerp(250, 325, scores.tx / 100);
  const hairDepth = lerp(180, 270, scores.risk / 100);

  if (layout.isFeminine) {
    const sweep = layout.mirror ? -1 : 1;
    if (layout.hairStyle === 2 || layout.hairStyle === 4) {
      return `<g id="portrait-hair">
        <path d="M ${cx - 250} ${top + 118} C ${cx - 118} ${top + 8} ${cx + 142} ${top + 12} ${cx + 252} ${top + 126} L ${cx + 220} ${top + 205} C ${cx + 70} ${top + 160} ${cx - 78} ${top + 160} ${cx - 230} ${top + 212} Z" fill="#111318"/>
        <path d="M ${cx - 182} ${top + 108} C ${cx - 48} ${top + 48} ${cx + 92} ${top + 46} ${cx + 198} ${top + 114}" fill="none" stroke="#F0E7D6" stroke-width="22" opacity="0.92"/>
        <polygon points="${cx - 230},${top + 150} ${cx - 142},${top + 96} ${cx - 158},${top + 308} ${cx - 220},${top + 350}" fill="#111318"/>
      </g>`;
    }

    return `<g id="portrait-hair">
      <path d="M ${left + 72} ${top + 205} C ${left + 135} ${top - 60} ${right - 100} ${top - 58} ${right + 22} ${top + 80} C ${right + 76} ${top + 150} ${right + 22} ${top + 232} ${right - 44} ${top + 238} C ${right - 58} ${top + 150} ${cx + 42} ${top + 92} ${left + 110} ${top + 120} Z" fill="#111318"/>
      <path d="M ${cx - 150 * sweep} ${top + 64} C ${cx - 34 * sweep} ${top + 38} ${cx + 136 * sweep} ${top + 68} ${cx + 190 * sweep} ${top + 178} C ${cx + 42 * sweep} ${top + 136} ${cx - 38 * sweep} ${top + 150} ${cx - 160 * sweep} ${top + 226} Z" fill="#F0E7D6" opacity="0.94"/>
      <polygon points="${cx - 204},${top + 245} ${cx - 138},${top + 145} ${cx - 128},${top + 360} ${cx - 198},${top + 430}" fill="#111318"/>
    </g>`;
  }

  if (layout.variant === 1) {
    return `<g id="portrait-hair">
      <polygon points="${cx - 275},${top + 110} ${cx - 18},${top + 40} ${cx - 110},${top + 360}" fill="#111318"/>
      <path d="M ${cx - 35} ${top + 48} C ${cx + 95} ${top - 20} ${cx + 305} ${top + 5} ${cx + 310} ${top + 170} C ${cx + 300} ${top + 260} ${cx + 230} ${top + 300} ${cx + 165} ${top + 260} L ${cx + 140} ${top + 100} C ${cx + 68} ${top + 70} ${cx + 10} ${top + 70} ${cx - 35} ${top + 48} Z" fill="#111318"/>
    </g>`;
  }

  if (layout.variant === 3) {
    return `<g id="portrait-hair">
      <path d="M ${cx - 250} ${top + 70} C ${cx - 70} ${top - 42} ${cx + 235} ${top - 16} ${cx + 275} ${top + 140} C ${cx + 286} ${top + 210} ${cx + 236} ${top + 262} ${cx + 182} ${top + 248} L ${cx + 148} ${top + 92} C ${cx + 12} ${top + 50} ${cx - 96} ${top + 64} ${cx - 250} ${top + 132} Z" fill="#111318"/>
      <polygon points="${cx - 250},${top + 132} ${cx - 188},${top + 104} ${cx - 205},${top + 345} ${cx - 258},${top + 395}" fill="#111318"/>
    </g>`;
  }

  if (layout.variant === 4) {
    return `<g id="portrait-hair">
      <path d="M ${left + 68} ${top + 165} C ${left + 205} ${top - 50} ${right - 48} ${top - 34} ${right + 28} ${top + 92} C ${right + 60} ${top + 170} ${right + 24} ${top + 260} ${right - 70} ${top + 278} C ${right - 75} ${top + 165} ${cx + 40} ${top + 95} ${left + 112} ${top + 118} Z" fill="#111318"/>
      <polygon points="${left + 155},${top + 118} ${cx - 18},${top + 76} ${left + 190},${top + 300}" fill="#F0E7D6"/>
      <polygon points="${left + 88},${top + 160} ${left + 158},${top + 122} ${left + 140},${top + 330} ${left + 86},${top + 350}" fill="#111318"/>
    </g>`;
  }

  if (layout.columnPattern === 1) {
    return `<g id="portrait-hair">
      <path d="M ${left + 80} ${top + 70} C ${cx - 50} ${top - 42} ${right - 40} ${top - 25} ${right + 10} ${top + 130} C ${right + 40} ${top + 220} ${right - 10} ${top + 278} ${right - 76} ${top + 260} L ${right - 125} ${top + 95} C ${cx + 55} ${top + 42} ${cx - 20} ${top + 46} ${cx - 160} ${top + 78} L ${cx - 160} ${top + 280} L ${cx - 210} ${top + 330} L ${cx - 230} ${top + 96} Z" fill="#111318"/>
      <rect x="${cx - 175}" y="${top + 78}" width="62" height="280" fill="#111318"/>
    </g>`;
  }

  if (layout.columnPattern === 2) {
    return `<g id="portrait-hair">
      <path d="M ${left + 55} ${top + 130} C ${cx - 65} ${top - 30} ${right + 10} ${top - 30} ${right + 30} ${top + 145} C ${right + 42} ${top + 275} ${right - 75} ${top + 310} ${right - 120} ${top + 210} L ${right - 160} ${top + 70} C ${cx + 30} ${top + 45} ${cx - 60} ${top + 62} ${left + 120} ${top + 135} Z" fill="#111318"/>
      <polygon points="${cx - 120},${top + 55} ${cx - 20},${top + 40} ${cx - 105},${top + 325}" fill="#F0E7D6"/>
    </g>`;
  }

  return `<g id="portrait-hair">
    <path d="M ${left + 30} ${top + hairDepth - 20} C ${left + 78} ${top + 42} ${cx - 38} ${top - 18} ${right - 42} ${top + 36} C ${right + 48} ${top + 84} ${right + 42} ${top + 240} ${right - 18} ${top + 292} C ${right - 118} ${top + 300} ${right - 98} ${top + 158} ${right - 172} ${top + 96} C ${cx + 18} ${top + 48} ${cx - 58} ${top + 48} ${left + 122} ${top + 98} L ${left + 138} ${top + 280} L ${left + 90} ${top + 336} Z" fill="#111318"/>
    <polygon points="${cx - 170},${top + 86} ${cx - 62},${top + 62} ${cx - 145},${top + 280}" fill="#F0E7D6"/>
  </g>`;
}

function renderPortraitEyes(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const cx = layout.mirror ? 560 : 500;
  const y = lerp(390, 438, scores.age / 100);
  const eyeGap = lerp(132, 184, scores.tx / 100);
  const leftEyeX = cx - eyeGap;
  const rightEyeX = cx + eyeGap * 0.8;
  const eyeW = lerp(120, 170, scores.nft / 100);
  const iris = scores.wealth > 60 ? "#1767A8" : palette.dark;
  const browOpacity = lerp(0.78, 0.96, scores.risk / 100);
  const lashes = layout.isFeminine
    ? `<g id="portrait-lashes" opacity="0.72">
      <line x1="${leftEyeX - 52}" y1="${y - 16}" x2="${leftEyeX - 72}" y2="${y - 42}" stroke="#111318" stroke-width="4"/>
      <line x1="${leftEyeX + 48}" y1="${y - 18}" x2="${leftEyeX + 66}" y2="${y - 44}" stroke="#111318" stroke-width="4"/>
      <line x1="${rightEyeX + 48}" y1="${y - 24}" x2="${rightEyeX + 68}" y2="${y - 50}" stroke="#111318" stroke-width="4"/>
    </g>`
    : "";

  if (layout.variant === 1) {
    return `<g id="portrait-eyes">
      ${renderEye(cx - eyeGap * 1.12, y + 10, eyeW * 0.82, iris, browOpacity, -18)}
      ${renderEye(cx + eyeGap * 0.62, y - 20, eyeW * 1.16, iris, browOpacity, 2)}
    </g>`;
  }

  if (layout.variant === 2) {
    return `<g id="portrait-eyes">
      ${renderEye(cx - eyeGap * 0.72, y + 6, eyeW * 0.92, iris, browOpacity, -5)}
      <path d="M ${cx + 62} ${y - 10} Q ${cx + 155} ${y - 42} ${cx + 245} ${y - 8}" fill="none" stroke="#111318" stroke-width="18" stroke-linecap="round" opacity="${browOpacity}"/>
      <line x1="${cx + 76}" y1="${y + 14}" x2="${cx + 228}" y2="${y + 8}" stroke="#111318" stroke-width="7" opacity="0.74"/>
    </g>`;
  }

  if (layout.variant === 3) {
    return `<g id="portrait-eyes">
      ${renderEye(cx - eyeGap * 0.92, y - 12, eyeW * 0.72, iris, browOpacity, -2)}
      ${renderEye(cx + eyeGap * 0.88, y - 12, eyeW * 0.72, iris, browOpacity, 2)}
      <rect x="${cx - 40}" y="${y - 50}" width="62" height="90" fill="#111318" opacity="0.88"/>
    </g>`;
  }

  if (layout.variant === 4) {
    return `<g id="portrait-eyes">
      ${renderEye(cx - eyeGap * 1.08, y, eyeW * 1.25, iris, browOpacity, -12)}
      ${renderEye(cx + eyeGap * 0.7, y + 4, eyeW * 0.7, iris, browOpacity, 7)}
    </g>`;
  }

  return `<g id="portrait-eyes">
    ${renderEye(leftEyeX, y, eyeW, iris, browOpacity, layout.variant % 2 === 0 ? -8 : 4)}
    ${renderEye(rightEyeX, y - 8, eyeW * lerp(0.86, 1.08, scores.multichain / 100), iris, browOpacity, layout.variant % 2 === 0 ? 5 : -7)}
    ${lashes}
  </g>`;
}

function renderEye(cx: number, cy: number, width: number, iris: string, browOpacity: number, tilt: number): SvgPart {
  const h = width * 0.3;
  return `<g transform="rotate(${tilt} ${cx} ${cy})">
    <path d="M ${cx - width / 2} ${cy} Q ${cx} ${cy - h} ${cx + width / 2} ${cy} Q ${cx} ${cy + h * 0.72} ${cx - width / 2} ${cy} Z" fill="#F0E7D6" stroke="#111318" stroke-width="7"/>
    <circle cx="${cx}" cy="${cy}" r="${h * 0.56}" fill="${iris}"/>
    <circle cx="${cx}" cy="${cy}" r="${h * 0.32}" fill="#111318"/>
    <path d="M ${cx - width / 2 - 14} ${cy - h - 18} Q ${cx - 5} ${cy - h - 48} ${cx + width / 2 + 16} ${cy - h - 10}" fill="none" stroke="#111318" stroke-width="24" stroke-linecap="round" opacity="${browOpacity}"/>
  </g>`;
}

function renderPortraitNose(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const colors = portraitColorSet(palette, layout);
  const noseFill = layout.faceArchetype === "mask" ? colors.coolDark : colors.warmDark;
  const cx = layout.mirror ? 545 : 485;
  const top = lerp(340, 385, scores.age / 100);
  const bottom = lerp(565, 625, scores.risk / 100);
  const lean = lerp(-38, 48, scores.multichain / 100);

  if (layout.variant === 1 || layout.variant === 4) {
    return `<g id="portrait-nose">
      <polygon points="${cx - 18},${top - 20} ${cx + lean + 58},${bottom + 10} ${cx - 70},${bottom - 12}" fill="${noseFill}" opacity="0.68"/>
      <polygon points="${cx + 8},${top + 38} ${cx + lean + 35},${bottom - 14} ${cx - 14},${bottom - 34}" fill="#F0E7D6" opacity="0.88"/>
      <path d="M ${cx - 62} ${bottom + 2} C ${cx - 4} ${bottom + 23} ${cx + 56} ${bottom + 8} ${cx + 85} ${bottom + 18}" fill="none" stroke="#111318" stroke-width="9" stroke-linecap="round"/>
    </g>`;
  }

  return `<g id="portrait-nose">
    <polygon points="${cx},${top} ${cx + lean},${bottom} ${cx - 92},${bottom - 25}" fill="${noseFill}" opacity="0.72"/>
    <polygon points="${cx + 18},${top + 32} ${cx + lean + 26},${bottom - 18} ${cx - 20},${bottom - 44}" fill="#F0E7D6" opacity="0.92"/>
    <path d="M ${cx - 82} ${bottom - 8} C ${cx - 34} ${bottom + 18} ${cx + 52} ${bottom - 2} ${cx + 68} ${bottom + 18}" fill="none" stroke="#111318" stroke-width="12" stroke-linecap="round"/>
  </g>`;
}

function renderPortraitMouth(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const cx = layout.mirror ? 535 : 485;
  const y = lerp(650, 700, scores.age / 100);
  const w = lerp(140, 220, scores.tx / 100);
  const red = layout.isFeminine ? portraitColorSet(palette, layout).lip : portraitRed(palette);

  if (layout.variant === 1) {
    return `<g id="portrait-mouth">
      <path d="M ${cx - w * 0.72} ${y + 8} C ${cx - 35} ${y - 20} ${cx - 12} ${y - 8} ${cx + 4} ${y + 7} C ${cx + 48} ${y - 18} ${cx + w * 0.62} ${y + 4} ${cx + w * 0.7} ${y + 14} C ${cx + 35} ${y + 44} ${cx - 70} ${y + 40} ${cx - w * 0.72} ${y + 8} Z" fill="${red}"/>
      <line x1="${cx - w * 0.76}" y1="${y + 25}" x2="${cx + w * 0.76}" y2="${y + 18}" stroke="#111318" stroke-width="5"/>
    </g>`;
  }

  if (layout.variant === 3) {
    return `<g id="portrait-mouth">
      <polygon points="${cx - w / 2},${y} ${cx - 8},${y - 26} ${cx + w / 2},${y + 2} ${cx + 8},${y + 24}" fill="${red}"/>
      <line x1="${cx - w / 2 - 12}" y1="${y + 18}" x2="${cx + w / 2 + 14}" y2="${y + 18}" stroke="#111318" stroke-width="5"/>
    </g>`;
  }

  if (layout.spherePattern === 2) {
    return `<g id="portrait-mouth">
      <path d="M ${cx - w / 2} ${y} C ${cx - 30} ${y - 46} ${cx - 4} ${y - 18} ${cx} ${y} C ${cx + 34} ${y - 45} ${cx + w / 2} ${y - 6} ${cx + w / 2 + 12} ${y + 2} C ${cx + 42} ${y + 34} ${cx - 72} ${y + 34} ${cx - w / 2} ${y} Z" fill="${red}"/>
      <line x1="${cx - w / 2 - 18}" y1="${y + 18}" x2="${cx + w / 2 + 30}" y2="${y + 18}" stroke="#111318" stroke-width="5"/>
    </g>`;
  }

  return `<g id="portrait-mouth">
    <path d="M ${cx - w / 2} ${y} C ${cx - 35} ${y - 36} ${cx - 8} ${y - 18} ${cx} ${y} C ${cx + 35} ${y - 36} ${cx + w / 2} ${y - 4} ${cx + w / 2} ${y} C ${cx + 50} ${y + 32} ${cx - 58} ${y + 32} ${cx - w / 2} ${y} Z" fill="${red}"/>
    <path d="M ${cx - w / 2 - 12} ${y + 16} C ${cx - 20} ${y + 42} ${cx + 55} ${y + 38} ${cx + w / 2 + 18} ${y + 16}" fill="none" stroke="#111318" stroke-width="6"/>
  </g>`;
}

function renderPortraitFeminineDetails(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  if (!layout.isFeminine) {
    return `<g id="portrait-feminine-details"></g>`;
  }

  const colors = portraitColorSet(palette, layout);
  const cheekX = layout.mirror ? 610 : 430;

  return `<g id="portrait-feminine-details">
    <path d="M ${cheekX - 72} 560 C ${cheekX - 8} 532 ${cheekX + 72} 542 ${cheekX + 132} 578" fill="none" stroke="${colors.cheek}" stroke-width="18" opacity="0.26"/>
    <line x1="${cheekX - 92}" y1="612" x2="${cheekX + 118}" y2="596" stroke="#111318" stroke-width="2" opacity="0.16"/>
  </g>`;
}

function renderPortraitClothingDetails(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const colors = portraitColorSet(palette, layout);
  const clothing = portraitClothingColors(colors, layout);
  const x = layout.mirror ? 355 : 450;
  const collar = layout.facadePattern % 2 === 0
    ? `<polygon points="${x - 70},780 ${x + 35},890 ${x - 24},930" fill="${clothing[4] ?? colors.bg}" opacity="0.78"/>
      <polygon points="${x + 190},780 ${x + 85},890 ${x + 150},930" fill="${clothing[5] ?? colors.bgWash}" opacity="0.78"/>
      <rect x="${x + 30}" y="796" width="122" height="18" fill="${clothing[2] ?? colors.gold}" opacity="0.45"/>`
    : `<rect x="${x - 15}" y="768" width="180" height="42" fill="${clothing[2] ?? colors.gold}" opacity="0.68"/>
      <rect x="${x + 35}" y="826" width="94" height="92" fill="${clothing[0] ?? colors.warm}" opacity="0.38"/>
      <polygon points="${x - 38},850 ${x + 18},920 ${x - 28},930" fill="${clothing[5] ?? colors.cheek}" opacity="0.5"/>`;
  const accessory = scores.nft > 70
    ? `<circle cx="${x + 82}" cy="820" r="18" fill="${clothing[3] ?? colors.accent}" opacity="0.84"/>
      <circle cx="${x + 82}" cy="820" r="32" fill="none" stroke="${clothing[1] ?? colors.coolDark}" stroke-width="4" opacity="0.34"/>`
    : "";

  return `<g id="portrait-clothing-details">${collar}${accessory}</g>`;
}

function renderPortraitRarityAura(profile: WalletProfile, palette: Palette, layout: CompositionLayout): SvgPart {
  const colors = portraitColorSet(palette, layout);

  if (profile.rarityTier === "Common") {
    return `<g id="rarity-aura"></g>`;
  }

  if (profile.rarityTier === "Uncommon") {
    return `<g id="rarity-aura" opacity="0.22">
      <circle cx="500" cy="468" r="330" fill="none" stroke="${colors.accent}" stroke-width="10"/>
    </g>`;
  }

  if (profile.rarityTier === "Rare") {
    return `<g id="rarity-aura" opacity="0.26">
      <circle cx="500" cy="468" r="330" fill="none" stroke="${colors.gold}" stroke-width="16"/>
      <circle cx="500" cy="468" r="255" fill="none" stroke="${colors.cool}" stroke-width="6"/>
    </g>`;
  }

  if (profile.rarityTier === "Epic") {
    return `<g id="rarity-aura" opacity="0.34">
      <path d="M 185 520 C 330 150 720 145 865 520" fill="none" stroke="${colors.gold}" stroke-width="22"/>
      <path d="M 230 545 C 360 230 680 220 820 545" fill="none" stroke="${colors.accent}" stroke-width="8"/>
    </g>`;
  }

  return `<g id="rarity-aura" opacity="0.42">
    <circle cx="500" cy="468" r="352" fill="none" stroke="${colors.gold}" stroke-width="24"/>
    <path d="M 145 525 C 310 80 745 78 890 525" fill="none" stroke="${colors.warm}" stroke-width="10"/>
    <path d="M 220 220 L 265 145 L 310 220 L 385 132 L 455 220 L 525 132 L 595 220 L 670 145 L 715 220" fill="none" stroke="#111318" stroke-width="8" opacity="0.72"/>
  </g>`;
}

function renderPortraitRarityTraits(profile: WalletProfile, palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const colors = portraitColorSet(palette, layout);
  const x = layout.mirror ? 372 : 632;

  if (profile.rarityTier === "Common") {
    return `<g id="rarity-traits"></g>`;
  }

  if (profile.rarityTier === "Uncommon") {
    return `<g id="rarity-traits">
      <rect x="${x}" y="250" width="34" height="34" fill="none" stroke="${colors.accent}" stroke-width="5" opacity="0.66" transform="rotate(18 ${x + 17} 267)"/>
    </g>`;
  }

  if (profile.rarityTier === "Rare") {
    return `<g id="rarity-traits">
      <rect x="${x - 18}" y="238" width="42" height="42" fill="none" stroke="${colors.gold}" stroke-width="6" opacity="0.78" transform="rotate(24 ${x + 3} 259)"/>
      <circle cx="${layout.mirror ? 300 : 715}" cy="555" r="18" fill="${colors.accent}" opacity="0.8"/>
    </g>`;
  }

  if (profile.rarityTier === "Epic") {
    return `<g id="rarity-traits">
      <polygon points="${x - 50},245 ${x},190 ${x + 50},245 ${x},300" fill="none" stroke="${colors.gold}" stroke-width="8" opacity="0.86"/>
      <circle cx="${layout.mirror ? 300 : 715}" cy="555" r="22" fill="${colors.gold}" opacity="0.84"/>
      <circle cx="${layout.mirror ? 300 : 715}" cy="555" r="36" fill="none" stroke="#111318" stroke-width="4" opacity="0.36"/>
    </g>`;
  }

  return `<g id="rarity-traits">
    <polygon points="${x - 70},250 ${x - 25},175 ${x},250 ${x + 35},175 ${x + 75},250" fill="${colors.gold}" opacity="0.78"/>
    <circle cx="${layout.mirror ? 300 : 715}" cy="555" r="26" fill="${colors.gold}" opacity="0.9"/>
    <circle cx="${layout.mirror ? 300 : 715}" cy="555" r="44" fill="none" stroke="${colors.warm}" stroke-width="8" opacity="0.5"/>
    <path d="M 392 815 Q 505 880 620 815" fill="none" stroke="${colors.gold}" stroke-width="12" opacity="${lerp(0.34, 0.72, scores.wealth / 100)}"/>
  </g>`;
}

function renderPortraitAccents(
  palette: Palette,
  scores: WalletScores,
  params: ArtParameters,
  layout: CompositionLayout,
  rng: () => number
): SvgPart {
  const count = Math.max(2, Math.min(8, params.diagonalCount));
  const accents = Array.from({ length: count }, (_, index) => {
    const x = snap(120 + rng() * 760, 20);
    const y = snap(110 + rng() * 710, 20);
    const size = lerp(20, 58, rng());
    const colors = portraitColorSet(palette, layout);
    const color = [colors.warm, colors.gold, colors.cool, colors.accent][index % 4] ?? colors.warm;
    if (index % 4 === 0) {
      return `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="none" stroke="${color}" stroke-width="4" opacity="0.34" transform="rotate(${lerp(-28, 28, rng())} ${x} ${y})"/>`;
    }
    if (index % 4 === 1) {
      return `<line x1="${x - size}" y1="${y}" x2="${x + size * 2}" y2="${y - size * 0.25}" stroke="#111318" stroke-width="3" opacity="0.22"/>`;
    }
    return `<polygon points="${x},${y - size} ${x + size},${y + size} ${x - size},${y + size}" fill="${color}" opacity="0.2"/>`;
  });

  return `<g id="portrait-accents">${accents.join("")}</g>`;
}

function renderDefs(profile: WalletProfile, palette: Palette): SvgPart {
  return `
    <linearGradient id="sky-gradient" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0%" stop-color="${mix("#B9CED0", palette.paper, 0.36)}"/>
      <stop offset="42%" stop-color="${palette.paper}"/>
      <stop offset="100%" stop-color="${mix("#D7C593", palette.paper, 0.42)}"/>
    </linearGradient>
    <radialGradient id="paper-vignette" cx="50%" cy="40%" r="78%">
      <stop offset="0%" stop-color="#F7E8BE" stop-opacity="0.46"/>
      <stop offset="58%" stop-color="#F5F0E8" stop-opacity="0"/>
      <stop offset="100%" stop-color="#183E4B" stop-opacity="0.32"/>
    </radialGradient>
    <filter id="paper-noise" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018 0.032" numOctaves="5" seed="${Number.parseInt(profile.seed.slice(2, 8), 16) % 997}" stitchTiles="stitch"/>
      <feColorMatrix type="saturate" values="0"/>
      <feComponentTransfer><feFuncA type="table" tableValues="0 0.22"/></feComponentTransfer>
    </filter>
  `;
}

function renderSky(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const horizon = lerp(575, 645, scores.age / 100);

  return `<g id="sky">
    <rect x="0" y="0" width="1024" height="1024" fill="url(#sky-gradient)"/>
    <rect x="0" y="0" width="1024" height="1024" fill="url(#paper-vignette)"/>
    <rect x="0" y="${horizon}" width="1024" height="${1024 - horizon}" fill="${mix("#5E7774", palette.dark, 0.22)}" opacity="0.48"/>
    <rect x="0" y="${horizon - 18}" width="1024" height="18" fill="#D6C38D" opacity="0.3"/>
    ${renderSkyMotifs(palette, scores, layout)}
    ${renderThinLineAccents(scores, layout)}
    ${scores.nft > 42 ? renderCloud() : ""}
  </g>`;
}

function renderSun(palette: Palette, scores: WalletScores, params: ArtParameters, layout: CompositionLayout): SvgPart {
  const cx = layout.sunCx;
  const cy = layout.sunCy;
  const sunColor = scores.wealth > 80 ? "#E88924" : scores.wealth < 40 ? "#D19C56" : "#DF7F2B";
  const r = Math.max(105, params.sunRadius);

  return `<g id="sun">
    <circle cx="${cx}" cy="${cy}" r="${r * 1.24}" fill="#F0C66D" opacity="0.18"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="${sunColor}" opacity="${scores.wealth > 70 ? 0.86 : 0.72}"/>
  </g>`;
}

function renderMotifs(palette: Palette, scores: WalletScores, params: ArtParameters, layout: CompositionLayout, rng: () => number): SvgPart {
  const cluster = [
    { cx: layout.sphereAnchorX - 60, cy: layout.sphereAnchorY - 65, r: 125, color: "#D9B978" },
    { cx: layout.sphereAnchorX + 62, cy: layout.sphereAnchorY + 35, r: 132, color: "#C75D62" },
    { cx: layout.sphereAnchorX + 145, cy: layout.sphereAnchorY + 105, r: 92, color: "#2A6F86" },
    { cx: layout.sphereAnchorX, cy: layout.sphereAnchorY + 92, r: 145, color: "#E0B56E" },
    { cx: layout.sphereAnchorX + 140, cy: layout.sphereAnchorY + 160, r: 78, color: "#6DB1A8" },
    { cx: layout.sphereAnchorX - 95, cy: layout.sphereAnchorY + 55, r: 110, color: "#F0B98D" }
  ];
  const motifs = Array.from({ length: params.sphereCount }, (_, index) => {
    const preset = cluster[index % cluster.length] ?? cluster[0]!;
    const r = preset.r * lerp(0.86, 1.16, rng());
    const cx = snap(preset.cx + lerp(-36, 36, rng()), 10);
    const cy = snap(preset.cy + lerp(-30, 30, rng()), 10);
    const opacity = scores.risk > 70 ? lerp(0.26, 0.42, rng()) : lerp(0.18, 0.3, scores.defi / 100);
    const stroke = index % 2 === 0 ? "#1A1208" : palette.dark;
    const fill = preset.color;

    if (layout.spherePattern === 1 && index % 2 === 0) {
      return `<path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} L ${cx - r} ${cy} Z" fill="${fill}" opacity="${opacity}"/>
        <line x1="${cx - r}" y1="${cy}" x2="${cx + r}" y2="${cy}" stroke="${stroke}" stroke-width="2" opacity="0.25"/>`;
    }

    if (layout.spherePattern === 2) {
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${fill}" stroke-width="${lerp(14, 34, rng())}" opacity="${opacity}"/>
        <circle cx="${cx}" cy="${cy}" r="${r * 0.48}" fill="none" stroke="${stroke}" stroke-width="2" opacity="0.2"/>`;
    }

    if (layout.spherePattern === 3) {
      return `<path d="M ${cx - r} ${cy + r * 0.45} Q ${cx} ${cy - r * 1.1} ${cx + r} ${cy + r * 0.45}" fill="none" stroke="${fill}" stroke-width="${lerp(22, 44, rng())}" opacity="${opacity}"/>
        <circle cx="${cx + r * 0.35}" cy="${cy + r * 0.16}" r="${r * 0.28}" fill="${stroke}" opacity="0.12"/>`;
    }

    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" opacity="${opacity}"/>
      <circle cx="${cx}" cy="${cy}" r="${r * 1.01}" fill="none" stroke="${stroke}" stroke-width="${lerp(0.8, 1.8, scores.defi / 100)}" opacity="${Math.min(0.26, opacity)}"/>`;
  });

  return `<g id="wallet-motifs">${motifs.join("")}</g>`;
}

function renderArchitecture(palette: Palette, scores: WalletScores, params: ArtParameters, layout: CompositionLayout, rng: () => number): SvgPart {
  const extras = Math.max(0, params.towerCount - 6);
  const extraTowers = Array.from({ length: extras }, (_, index) => {
    const width = towerWidths[Math.floor(rng() * towerWidths.length)] ?? 48;
    const x = snap(layout.mirror ? 830 - index * 74 + rng() * 30 : 50 + index * 74 + rng() * 30, 10);
    const height = lerp(120, 280, rng()) * params.ageMultiplier;
    const y = 690 - height;
    const color = index % 2 === 0 ? "#C85E35" : "#1E4052";
    return `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${color}" opacity="0.58"/>${renderWindows(x, y, width, 5, palette, layout, rng)}`;
  });

  return `<g id="architecture">
    ${renderArchitectureArchetype(palette, scores, params, layout)}
    ${extraTowers.join("")}
    ${renderLowerCity(scores, params, layout)}
    ${layout.variant % 2 === 0 ? renderStairs(scores, layout) : ""}
  </g>`;
}

function renderArchitectureArchetype(palette: Palette, scores: WalletScores, params: ArtParameters, layout: CompositionLayout): SvgPart {
  if (layout.variant === 1) {
    return `${renderCentralGlass(scores, layout)}
      ${renderHorizontalBridgeCity(palette, scores, layout)}
      ${renderSmallPatternColumn(scores, layout, layout.diamondX, 245, 82, 390)}`;
  }

  if (layout.variant === 2) {
    return `${renderArchMonument(palette, scores, layout)}
      ${renderCentralGlass(scores, layout)}`;
  }

  if (layout.variant === 3) {
    return `${renderDiamondTower(scores, layout)}
      ${renderRadialBlock(palette, scores, layout)}`;
  }

  if (layout.variant === 4) {
    return `${renderStackedCourtyard(palette, scores, params, layout)}
      ${renderSmallPatternColumn(scores, layout, layout.mirror ? 780 : 96, 300, 72, 330)}`;
  }

  if (layout.variant === 5) {
    return `${renderCentralGlass(scores, layout)}
      ${renderMonolithPair(palette, scores, layout)}`;
  }

  return `${renderDiamondTower(scores, layout)}${renderCentralGlass(scores, layout)}`;
}

function renderDiamondTower(scores: WalletScores, layout: CompositionLayout): SvgPart {
  const x = layout.diamondX;
  const y = snap(150 + (scores.risk / 100) * 50, 10);
  const width = snap(104 + (scores.tx / 100) * 44, 4);
  const height = lerp(500, 700, scores.age / 100);
  const bottom = y + height;
  const pattern = renderColumnPattern(x, y, width, height, scores, layout);

  return `<g id="left-diamond-tower">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#E0A91E"/>
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#B46C16" opacity="${lerp(0.04, 0.16, scores.age / 100)}"/>
    ${pattern}
    <line x1="${x + width / 2}" y1="0" x2="${x + width / 2}" y2="${y}" stroke="#1A1208" stroke-width="2" opacity="0.78"/>
    <circle cx="${x + width / 2 + (layout.mirror ? -28 : 28)}" cy="88" r="16" fill="#1A1208" opacity="0.9"/>
    <rect x="${x + 8}" y="${bottom}" width="${width - 16}" height="42" fill="#69706B" opacity="0.62"/>
  </g>`;
}

function renderCentralGlass(scores: WalletScores, layout: CompositionLayout): SvgPart {
  const height = lerp(390, 560, scores.age / 100);
  const y = 675 - height;
  const opacity = lerp(0.64, 0.86, scores.tx / 100);
  const x = layout.centralX;

  return `<g id="central-glass-towers">
    <rect x="${x}" y="${y + 44}" width="92" height="${height - 44}" fill="#86A9A4" opacity="${opacity}"/>
    <polygon points="${x},${y + 44} ${x + 92},${y + 94} ${x + 92},${y + height} ${x},${y + height}" fill="#0E6088" opacity="0.52"/>
    <rect x="${x + 88}" y="${y + 128}" width="106" height="${height - 128}" fill="#0B4B73" opacity="${opacity}"/>
    <rect x="${x + 194}" y="${y + 170}" width="74" height="${height - 170}" fill="#0A3556" opacity="0.86"/>
    <polygon points="${x},${y + 44} ${x + 92},${y + 94} ${x + 194},${y + 128} ${x + 92},${y - 30}" fill="#9BBCC0" opacity="0.42"/>
    <rect x="${x + 34}" y="${y + height - 150}" width="26" height="26" fill="#1A1208" opacity="0.86"/>
    ${renderFacadePattern(x, y, height, layout)}
  </g>`;
}

function renderSmallPatternColumn(scores: WalletScores, layout: CompositionLayout, x: number, y: number, width: number, height: number): SvgPart {
  return `<g id="pattern-column-small">
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#E0A91E" opacity="0.88"/>
    ${renderColumnPattern(x, y, width, height, scores, layout)}
  </g>`;
}

function renderHorizontalBridgeCity(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const y = 455 + layout.variant * 8;
  const opacity = lerp(0.42, 0.76, scores.multichain / 100);

  return `<g id="horizontal-bridge-city">
    <rect x="92" y="${y}" width="760" height="38" fill="${palette.dark}" opacity="${opacity}"/>
    <rect x="160" y="${y - 52}" width="120" height="52" fill="#C85E35" opacity="0.48"/>
    <rect x="310" y="${y - 74}" width="180" height="74" fill="#D8C793" opacity="0.58"/>
    <rect x="555" y="${y - 98}" width="142" height="98" fill="#143B52" opacity="0.72"/>
    <line x1="92" y1="${y + 18}" x2="852" y2="${y - 34}" stroke="#1A1208" stroke-width="4" opacity="0.28"/>
    <path d="M 185 ${y + 38} L 255 ${y + 38} L 255 720 L 185 720 Z" fill="#102E42" opacity="0.86"/>
    <path d="M 630 ${y + 38} L 720 ${y + 38} L 720 720 L 630 720 Z" fill="#111318" opacity="0.76"/>
  </g>`;
}

function renderArchMonument(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const x = layout.mirror ? 520 : 170;
  const y = 285;
  const w = 285;
  const h = lerp(330, 500, scores.age / 100);

  return `<g id="arch-monument">
    <rect x="${x}" y="${y + 120}" width="${w}" height="${h - 120}" fill="#D8C793" opacity="0.78"/>
    <path d="M ${x + 44} ${y + h} L ${x + 44} ${y + 210} A ${w / 2 - 44} ${w / 2 - 44} 0 0 1 ${x + w - 44} ${y + 210} L ${x + w - 44} ${y + h} Z" fill="#143B52" opacity="0.9"/>
    <path d="M ${x + 94} ${y + h} L ${x + 94} ${y + 250} A ${w / 2 - 94} ${w / 2 - 94} 0 0 1 ${x + w - 94} ${y + 250} L ${x + w - 94} ${y + h} Z" fill="${palette.paper}" opacity="0.82"/>
    <rect x="${x - 60}" y="${y + 260}" width="76" height="${h - 260}" fill="#1E4052" opacity="0.72"/>
    <rect x="${x + w + 16}" y="${y + 210}" width="92" height="${h - 210}" fill="#C85E35" opacity="0.62"/>
    <circle cx="${x + w + 62}" cy="${y + 180}" r="34" fill="${palette.secondary}" opacity="0.52"/>
  </g>`;
}

function renderRadialBlock(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const cx = layout.mirror ? 380 : 620;
  const cy = 500;
  const rings = Array.from({ length: 4 }, (_, index) => {
    const r = 64 + index * 42;
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${index % 2 === 0 ? palette.secondary : "#1A1208"}" stroke-width="${index === 0 ? 28 : 18}" opacity="${0.2 + index * 0.08}"/>`;
  });

  return `<g id="radial-block">
    <rect x="${cx - 180}" y="425" width="120" height="270" fill="#0B4B73" opacity="0.82"/>
    <rect x="${cx + 72}" y="360" width="96" height="335" fill="#D8C793" opacity="0.68"/>
    <polygon points="${cx - 50},700 ${cx + 170},420 ${cx + 215},700" fill="#1A1208" opacity="${lerp(0.42, 0.78, scores.risk / 100)}"/>
    ${rings.join("")}
  </g>`;
}

function renderStackedCourtyard(palette: Palette, scores: WalletScores, params: ArtParameters, layout: CompositionLayout): SvgPart {
  const baseX = layout.mirror ? 135 : 430;
  const rows = Array.from({ length: 6 }, (_, index) => {
    const width = 320 - index * 34;
    const x = baseX + index * 22;
    const y = 670 - index * 62;
    const color = index % 3 === 0 ? "#D8C793" : index % 3 === 1 ? "#143B52" : palette.primary;
    return `<rect x="${x}" y="${y}" width="${width}" height="58" fill="${color}" opacity="${lerp(0.54, 0.84, scores.tx / 100)}"/>`;
  });

  return `<g id="stacked-courtyard">
    ${rows.join("")}
    <path d="M ${baseX + 92} 700 L ${baseX + 92} 580 A 60 60 0 0 1 ${baseX + 212} 580 L ${baseX + 212} 700 Z" fill="#101014" opacity="0.82"/>
    <circle cx="${baseX + 255}" cy="455" r="${params.hasBridge ? 74 : 48}" fill="${palette.secondary}" opacity="0.34"/>
  </g>`;
}

function renderMonolithPair(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const x = layout.centralX + 130;
  const h = lerp(410, 630, scores.age / 100);
  const y = 690 - h;

  return `<g id="monolith-pair">
    <rect x="${x}" y="${y}" width="132" height="${h}" fill="#111318" opacity="0.78"/>
    <rect x="${x + 132}" y="${y + 74}" width="150" height="${h - 74}" fill="#226273" opacity="0.72"/>
    <path d="M ${x} ${y} L ${x + 132} ${y + 74} L ${x + 132} ${y + h} L ${x} ${y + h} Z" fill="${palette.primary}" opacity="0.25"/>
    <circle cx="${x + 242}" cy="${y + 155}" r="68" fill="${palette.secondary}" opacity="0.28"/>
    <rect x="${x + 46}" y="${y + 150}" width="28" height="${h - 220}" fill="#E0A91E" opacity="0.74"/>
  </g>`;
}

function renderLowerCity(scores: WalletScores, params: ArtParameters, layout: CompositionLayout): SvgPart {
  if (layout.variant === 1) {
    return renderLowerBridgeCity(scores, params, layout);
  }

  if (layout.variant === 2) {
    return renderLowerArchCity(scores, layout);
  }

  if (layout.variant === 4) {
    return renderLowerCourtyardCity(scores, params, layout);
  }

  if (layout.variant === 5) {
    return renderLowerSparseCity(scores, layout);
  }

  const riskDark = lerp(0.84, 0.98, scores.risk / 100);
  const wealthGlow = lerp(0.24, 0.66, scores.wealth / 100);
  const s = layout.lowerShift;

  return `<g id="lower-city">
    <rect x="0" y="690" width="92" height="175" fill="#574B58" opacity="0.72"/>
    <rect x="42" y="570" width="58" height="122" fill="#E1A093" opacity="0.46"/>
    <rect x="${205 + s * 0.25}" y="585" width="92" height="280" fill="#102E42" opacity="0.92"/>
    <rect x="${298 + s * 0.2}" y="705" width="160" height="160" fill="#D8C793" opacity="0.78"/>
    <path d="M ${335 + s * 0.2} 865 L ${335 + s * 0.2} 785 A 34 34 0 0 1 ${403 + s * 0.2} 785 L ${403 + s * 0.2} 865 Z" fill="#103C3F" opacity="0.86"/>
    <rect x="${525 + s}" y="700" width="72" height="165" fill="#2D4146" opacity="0.72"/>
    <rect x="${600 + s}" y="770" width="170" height="95" fill="#111318" opacity="${riskDark}"/>
    <rect x="${770 + s * 0.4}" y="675" width="254" height="190" fill="#0D1116" opacity="${riskDark}"/>
    <rect x="${825 + s * 0.3}" y="640" width="210" height="82" fill="#226273" opacity="${lerp(0.56, 0.82, scores.multichain / 100)}"/>
    <polygon points="${862 + s * 0.3},640 ${960 + s * 0.3},580 1024,622 1024,640" fill="#8C6680" opacity="${params.hasBridge ? 0.62 : 0.38}"/>
    <circle cx="${820 + s * 0.25}" cy="855" r="${lerp(92, 128, scores.wealth / 100)}" fill="#E2C366" opacity="${wealthGlow + 0.24}"/>
    <path d="M ${820 + s * 0.25} 737 A 118 118 0 0 1 ${820 + s * 0.25} 973 Z" fill="#F2D479" opacity="0.78"/>
    <path d="M ${820 + s * 0.25} 737 A 118 118 0 0 1 ${938 + s * 0.25} 855 A 118 118 0 0 1 ${820 + s * 0.25} 973 Z" fill="#D84E35" opacity="${lerp(0.58, 0.86, scores.wealth / 100)}"/>
    <rect x="${770 + s * 0.4}" y="675" width="55" height="190" fill="#101014" opacity="0.78"/>
    <path d="M ${610 + s * 0.5} 585 L ${672 + s * 0.5} 585 L ${672 + s * 0.5} 642 Z" fill="#111318" opacity="0.94"/>
    <rect x="${670 + s * 0.5}" y="642" width="74" height="223" fill="#143B52" opacity="0.9"/>
    <polygon points="${670 + s * 0.5},642 ${744 + s * 0.5},642 ${744 + s * 0.5},665 ${670 + s * 0.5},618" fill="#D9502F" opacity="0.88"/>
    <circle cx="${708 + s * 0.5}" cy="612" r="12" fill="#111318" opacity="0.92"/>
    <circle cx="${708 + s * 0.5}" cy="612" r="24" fill="none" stroke="#E3D4A8" stroke-width="2" opacity="0.34"/>
  </g>`;
}

function renderLowerBridgeCity(scores: WalletScores, params: ArtParameters, layout: CompositionLayout): SvgPart {
  const s = layout.lowerShift;
  return `<g id="lower-bridge-city">
    <rect x="0" y="735" width="1024" height="130" fill="#31494C" opacity="0.58"/>
    <rect x="${70 + s * 0.2}" y="675" width="155" height="190" fill="#101014" opacity="0.75"/>
    <rect x="${245 + s * 0.25}" y="700" width="105" height="165" fill="#D8C793" opacity="0.66"/>
    <rect x="${650 + s * 0.35}" y="665" width="260" height="200" fill="#143B52" opacity="0.72"/>
    <rect x="${650 + s * 0.35}" y="610" width="260" height="54" fill="#226273" opacity="0.8"/>
    <line x1="0" y1="720" x2="1024" y2="${params.hasBridge ? 610 : 690}" stroke="#1A1208" stroke-width="14" opacity="0.42"/>
    <line x1="0" y1="758" x2="1024" y2="${params.hasBridge ? 648 : 728}" stroke="#E0A52C" stroke-width="7" opacity="${lerp(0.2, 0.48, scores.wealth / 100)}"/>
    <circle cx="${850 + s * 0.2}" cy="840" r="${lerp(70, 120, scores.wealth / 100)}" fill="#D84E35" opacity="0.58"/>
  </g>`;
}

function renderLowerArchCity(scores: WalletScores, layout: CompositionLayout): SvgPart {
  const s = layout.lowerShift;
  return `<g id="lower-arch-city">
    <rect x="0" y="770" width="1024" height="95" fill="#30494A" opacity="0.58"/>
    <rect x="${150 + s * 0.2}" y="710" width="165" height="155" fill="#D8C793" opacity="0.72"/>
    <path d="M ${190 + s * 0.2} 865 L ${190 + s * 0.2} 795 A 42 42 0 0 1 ${274 + s * 0.2} 795 L ${274 + s * 0.2} 865 Z" fill="#102E42" opacity="0.9"/>
    <rect x="${410 + s * 0.25}" y="690" width="92" height="175" fill="#C85E35" opacity="0.52"/>
    <circle cx="${500 + s * 0.25}" cy="700" r="${lerp(38, 82, scores.defi / 100)}" fill="#E0A52C" opacity="0.34"/>
    <rect x="${650 + s * 0.15}" y="745" width="230" height="120" fill="#101014" opacity="0.78"/>
    <path d="M ${650 + s * 0.15} 745 L ${765 + s * 0.15} 675 L ${880 + s * 0.15} 745 Z" fill="#8C6680" opacity="0.46"/>
  </g>`;
}

function renderLowerCourtyardCity(scores: WalletScores, params: ArtParameters, layout: CompositionLayout): SvgPart {
  const s = layout.lowerShift;
  const blocks = Array.from({ length: 7 }, (_, index) => {
    const x = 95 + s * 0.25 + index * 78;
    const h = 55 + (index % 3) * 35;
    return `<rect x="${x}" y="${865 - h}" width="${index % 2 === 0 ? 68 : 52}" height="${h}" fill="${index % 2 === 0 ? "#D8C793" : "#143B52"}" opacity="0.72"/>`;
  });
  return `<g id="lower-courtyard-city">
    <rect x="0" y="800" width="1024" height="65" fill="#4E665C" opacity="0.54"/>
    ${blocks.join("")}
    <circle cx="${760 + s * 0.2}" cy="824" r="${params.hasBridge ? 105 : 78}" fill="#E0A52C" opacity="${lerp(0.26, 0.54, scores.wealth / 100)}"/>
    <path d="M ${760 + s * 0.2} 720 A 104 104 0 0 1 ${864 + s * 0.2} 824 A 104 104 0 0 1 ${760 + s * 0.2} 928 Z" fill="#D84E35" opacity="0.48"/>
  </g>`;
}

function renderLowerSparseCity(scores: WalletScores, layout: CompositionLayout): SvgPart {
  const s = layout.lowerShift;
  return `<g id="lower-sparse-city">
    <rect x="0" y="805" width="1024" height="60" fill="#5D6E66" opacity="0.5"/>
    <rect x="${145 + s * 0.2}" y="665" width="82" height="200" fill="#143B52" opacity="0.78"/>
    <rect x="${285 + s * 0.25}" y="760" width="178" height="105" fill="#D8C793" opacity="0.64"/>
    <path d="M ${328 + s * 0.25} 865 L ${328 + s * 0.25} 800 A 34 34 0 0 1 ${396 + s * 0.25} 800 L ${396 + s * 0.25} 865 Z" fill="#101014" opacity="0.88"/>
    <rect x="${720 + s * 0.1}" y="700" width="96" height="165" fill="#101014" opacity="${lerp(0.58, 0.86, scores.risk / 100)}"/>
    <circle cx="${820 + s * 0.1}" cy="790" r="70" fill="#2A6F86" opacity="0.28"/>
  </g>`;
}

function renderStairs(scores: WalletScores, layout: CompositionLayout): SvgPart {
  const steps = Math.max(4, Math.round(4 + scores.age / 18));
  const left = Array.from({ length: steps }, (_, index) => {
    const size = 22;
    const x = layout.diamondX - 22 + index * size;
    const y = 842 - index * size;
    return `<rect x="${x}" y="${y}" width="${size}" height="${size * (index + 1)}" fill="#D8C793" opacity="0.82"/>`;
  });
  const center = Array.from({ length: steps + 1 }, (_, index) => {
    const size = 18;
    const x = 430 + layout.lowerShift * 0.25 + index * size;
    const y = 865 - index * size;
    return `<rect x="${x}" y="${y}" width="${size}" height="${size * (index + 1)}" fill="#D8C793" opacity="0.62"/>`;
  });

  return `<g id="stairs">${left.join("")}${center.join("")}</g>`;
}

function renderSkyMotifs(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  if (layout.variant === 0) {
    return `<g id="sky-motifs" opacity="0.28">
      <path d="M 86 310 C 190 250 295 250 396 314" fill="none" stroke="${palette.primary}" stroke-width="10"/>
      <path d="M 112 350 C 230 296 328 298 450 360" fill="none" stroke="${palette.secondary}" stroke-width="5"/>
    </g>`;
  }

  if (layout.variant === 1 || layout.variant === 5) {
    return `<g id="sky-motifs" opacity="${lerp(0.18, 0.38, scores.multichain / 100)}">
      <rect x="58" y="260" width="86" height="86" fill="none" stroke="${palette.primary}" stroke-width="4" transform="rotate(32 101 303)"/>
      <rect x="112" y="210" width="54" height="54" fill="none" stroke="#1A1208" stroke-width="3" transform="rotate(32 139 237)"/>
      <line x1="0" y1="405" x2="360" y2="342" stroke="${palette.dark}" stroke-width="3"/>
    </g>`;
  }

  if (layout.variant === 2) {
    return `<g id="sky-motifs" opacity="0.3">
      <circle cx="145" cy="230" r="52" fill="none" stroke="${palette.secondary}" stroke-width="18"/>
      <circle cx="145" cy="230" r="18" fill="#1A1208"/>
      <line x1="88" y1="230" x2="202" y2="230" stroke="${palette.paper}" stroke-width="6"/>
    </g>`;
  }

  return `<g id="sky-motifs" opacity="0.24">
    <polygon points="120,235 250,205 225,330" fill="${palette.primary}"/>
    <polygon points="175,245 315,245 225,330" fill="${palette.dark}"/>
  </g>`;
}

function renderColumnPattern(x: number, y: number, width: number, height: number, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const opacity = lerp(0.78, 0.96, scores.risk / 100);

  if (layout.columnPattern === 1) {
    const rows = Array.from({ length: 9 }, (_, index) => {
      const h = height / 9;
      const fill = index % 2 === 0 ? "#111318" : "#E0A91E";
      return `<rect x="${x}" y="${y + index * h}" width="${width}" height="${h}" fill="${fill}" opacity="${index % 2 === 0 ? opacity : 0.2}"/>`;
    });
    return rows.join("");
  }

  if (layout.columnPattern === 2) {
    const cells = Array.from({ length: 14 }, (_, index) => {
      const row = Math.floor(index / 2);
      const col = index % 2;
      const size = width / 2;
      return `<rect x="${x + col * size}" y="${y + row * size}" width="${size}" height="${size}" fill="${(row + col) % 2 === 0 ? "#111318" : "#E0A91E"}" opacity="${(row + col) % 2 === 0 ? opacity : 0.2}"/>`;
    });
    return cells.join("");
  }

  if (layout.columnPattern === 3) {
    const chevrons = Array.from({ length: 6 }, (_, index) => {
      const top = y + index * (height / 6);
      const mid = top + height / 12;
      const bottom = top + height / 6;
      return `<polyline points="${x},${top} ${x + width / 2},${mid} ${x + width},${top}" fill="none" stroke="#111318" stroke-width="20" opacity="${opacity}"/>
        <polyline points="${x},${bottom} ${x + width / 2},${mid} ${x + width},${bottom}" fill="none" stroke="#111318" stroke-width="20" opacity="${opacity}"/>`;
    });
    return chevrons.join("");
  }

  const diamonds = Array.from({ length: 6 }, (_, index) => {
    const cy = y + 58 + index * (height - 110) / 5;
    return `<polygon points="${x + width / 2},${cy - 58} ${x + width},${cy} ${x + width / 2},${cy + 58} ${x},${cy}" fill="#111318" opacity="${opacity}"/>`;
  });
  return diamonds.join("");
}

function renderFacadePattern(x: number, y: number, height: number, layout: CompositionLayout): SvgPart {
  if (layout.facadePattern === 1) {
    return Array.from({ length: 7 }, (_, index) => {
      const yy = y + 150 + index * 42;
      return `<line x1="${x + 16}" y1="${yy}" x2="${x + 252}" y2="${yy + 24}" stroke="#E5D7AA" stroke-width="3" opacity="0.18"/>`;
    }).join("");
  }

  if (layout.facadePattern === 2) {
    return Array.from({ length: 18 }, (_, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      return `<circle cx="${x + 38 + col * 64}" cy="${y + height - 300 + row * 38}" r="7" fill="#E7C46A" opacity="0.26"/>`;
    }).join("");
  }

  if (layout.facadePattern === 3) {
    return `<path d="M ${x + 18} ${y + height - 80} L ${x + 70} ${y + height - 260} L ${x + 122} ${y + height - 80} Z" fill="#1A1208" opacity="0.22"/>
      <path d="M ${x + 130} ${y + height - 80} L ${x + 188} ${y + height - 285} L ${x + 248} ${y + height - 80} Z" fill="#F1D26A" opacity="0.2"/>`;
  }

  return Array.from({ length: 5 }, (_, index) => {
    const yy = y + 140 + index * 58;
    return `<rect x="${x + 118}" y="${yy}" width="18" height="22" fill="#1A1208" opacity="0.26"/>
      <rect x="${x + 172}" y="${yy + 18}" width="18" height="22" fill="#E7C46A" opacity="0.18"/>`;
  }).join("");
}

function renderThinLineAccents(scores: WalletScores, layout: CompositionLayout): SvgPart {
  const count = scores.tx > 70 ? 4 : 3;
  const lines = Array.from({ length: count }, (_, index) => {
    const y = layout.sunCy - 85 + index * 13;
    const x = Math.min(900, layout.sunCx + 10 + index * 36);
    return `<line x1="${x}" y1="${y}" x2="${Math.min(990, x + 280 + index * 40)}" y2="${y}" stroke="#1A1208" stroke-width="2" opacity="${lerp(0.46, 0.86, scores.risk / 100)}"/>`;
  });

  return `<g id="line-accents">
    ${lines.join("")}
    <rect x="${Math.min(910, layout.sunCx + 210)}" y="${layout.sunCy - 110}" width="28" height="38" fill="#7E6692" opacity="${lerp(0.42, 0.75, scores.nft / 100)}"/>
    <circle cx="${Math.min(930, layout.sunCx + 170)}" cy="${layout.sunCy + 20}" r="15" fill="#111318" opacity="0.9"/>
  </g>`;
}

function renderCloud(): SvgPart {
  return `<g id="cloud" opacity="0.5">
    <path d="M 880 350 C 892 318 938 314 948 350 C 970 350 988 364 998 382 L 860 382 C 866 366 872 356 880 350 Z" fill="#F5E7B6"/>
    <line x1="842" y1="382" x2="1024" y2="382" stroke="#F5E7B6" stroke-width="3"/>
  </g>`;
}

function renderWindows(
  x: number,
  y: number,
  width: number,
  count: number,
  palette: Palette,
  layout: CompositionLayout,
  rng: () => number
): SvgPart {
  const cols = width >= 48 ? 2 : 1;
  const windows: string[] = [];

  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = x + 8 + col * 14;
      const wy = y + 42 + row * 28;
      if (wy < 792 && rng() > 0.22) {
        if (layout.facadePattern === 2) {
          windows.push(`<circle cx="${wx + 4}" cy="${wy + 7}" r="5" fill="${palette.secondary}" opacity="${lerp(0.28, 0.78, rng())}"/>`);
        } else if (layout.facadePattern === 3) {
          windows.push(`<polygon points="${wx},${wy + 13} ${wx + 4},${wy} ${wx + 8},${wy + 13}" fill="${palette.secondary}" opacity="${lerp(0.28, 0.78, rng())}"/>`);
        } else {
          windows.push(`<rect x="${wx}" y="${wy}" width="8" height="13" fill="${palette.secondary}" opacity="${lerp(0.28, 0.78, rng())}"/>`);
        }
      }
    }
  }

  return windows.join("");
}

function renderDiagonals(
  palette: Palette,
  scores: WalletScores,
  params: ArtParameters,
  layout: CompositionLayout,
  rng: () => number
): SvgPart {
  if (layout.variant === 1) {
    return renderHorizontalConstructivistBands(palette, scores, layout, rng);
  }

  if (layout.variant === 2) {
    return renderArcConstructivistBands(palette, scores, layout);
  }

  if (layout.variant === 4) {
    return renderStackedDiagonalPlanes(palette, scores, layout, rng);
  }

  const rampOpacity = lerp(0.72, 0.94, scores.risk / 100);
  const rampStartX = layout.mirror ? 1024 : -20;
  const rampBaseX = layout.mirror ? 780 : 235;
  const rampBaseY = 1024;
  const mainRamp = renderRamp(scores, layout, rampStartX, rampBaseX, rampBaseY, rampOpacity);

  const diagonals = Array.from({ length: Math.max(0, params.diagonalCount - 1) }, (_, index) => {
    const y = lerp(365, 560, rng());
    const thickness = lerp(3, 18, scores.risk / 100);
    const color = index % 2 === 0 ? palette.primary : "#1A1208";
    return `<polygon points="${lerp(20, 260, rng())},${y} ${lerp(760, 1060, rng())},${y - lerp(40, 110, rng())} ${lerp(760, 1060, rng())},${y - lerp(40, 110, rng()) + thickness} ${lerp(20, 260, rng())},${y + thickness}" fill="${color}" opacity="${lerp(0.08, 0.22, scores.risk / 100)}"/>`;
  });

  const bridge = params.hasBridge
    ? `<g id="bridge-geometry" opacity="${lerp(0.26, 0.48, scores.multichain / 100)}">
      <polygon points="310,210 490,330 490,588 310,470" fill="#79A9B2"/>
      <polygon points="365,258 490,330 490,588 365,512" fill="#0C567B" opacity="0.62"/>
      <polygon points="395,230 525,340 525,595 395,490" fill="#0E4568" opacity="0.55"/>
    </g>`
    : "";

  return `<g id="diagonals">${bridge}${diagonals.join("")}${mainRamp}</g>`;
}

function renderHorizontalConstructivistBands(
  palette: Palette,
  scores: WalletScores,
  layout: CompositionLayout,
  rng: () => number
): SvgPart {
  const count = 4 + Math.round(scores.tx / 35);
  const bands = Array.from({ length: count }, (_, index) => {
    const y = 445 + index * 44 + rng() * 16;
    const x1 = lerp(-80, 160, rng());
    const x2 = lerp(760, 1120, rng());
    const color = index % 3 === 0 ? palette.primary : index % 3 === 1 ? "#1A1208" : palette.secondary;
    return `<polygon points="${x1},${y} ${x2},${y - 34} ${x2},${y - 18} ${x1},${y + 16}" fill="${color}" opacity="${lerp(0.12, 0.32, scores.risk / 100)}"/>`;
  });
  return `<g id="horizontal-constructivist-bands">
    ${bands.join("")}
    <line x1="0" y1="${layout.rampEndY}" x2="1024" y2="${layout.rampEndY - 82}" stroke="#1A1208" stroke-width="4" opacity="0.28"/>
  </g>`;
}

function renderArcConstructivistBands(palette: Palette, scores: WalletScores, layout: CompositionLayout): SvgPart {
  const cx = layout.mirror ? 310 : 720;
  const cy = 625;
  return `<g id="arc-constructivist-bands">
    <path d="M ${cx - 260} ${cy + 145} A 300 300 0 0 1 ${cx + 270} ${cy + 120}" fill="none" stroke="${palette.primary}" stroke-width="28" opacity="${lerp(0.18, 0.42, scores.risk / 100)}"/>
    <path d="M ${cx - 210} ${cy + 70} A 230 230 0 0 1 ${cx + 190} ${cy + 90}" fill="none" stroke="${palette.secondary}" stroke-width="22" opacity="0.32"/>
    <path d="M ${cx - 150} ${cy + 15} A 160 160 0 0 1 ${cx + 142} ${cy + 28}" fill="none" stroke="#1A1208" stroke-width="12" opacity="0.28"/>
    <polygon points="${cx - 270},865 ${cx - 88},670 ${cx - 40},865" fill="#4A2B62" opacity="0.42"/>
  </g>`;
}

function renderStackedDiagonalPlanes(
  palette: Palette,
  scores: WalletScores,
  layout: CompositionLayout,
  rng: () => number
): SvgPart {
  const planes = Array.from({ length: 5 }, (_, index) => {
    const y = 575 + index * 58;
    const skew = lerp(120, 260, rng());
    const color = index % 2 === 0 ? "#4A2B62" : palette.primary;
    return `<polygon points="0,${y + skew * 0.22} ${1024},${y - skew} ${1024},${y - skew + 24} 0,${y + skew * 0.22 + 24}" fill="${color}" opacity="${lerp(0.1, 0.28, scores.risk / 100)}"/>`;
  });
  return `<g id="stacked-diagonal-planes">${planes.join("")}
    <polygon points="${layout.mirror ? 1024 : 0},1024 ${layout.rampEndX},${layout.rampEndY} ${layout.rampEndX + (layout.mirror ? -120 : 120)},1024" fill="#4A2B62" opacity="0.58"/>
  </g>`;
}

function renderRamp(
  scores: WalletScores,
  layout: CompositionLayout,
  rampStartX: number,
  rampBaseX: number,
  rampBaseY: number,
  rampOpacity: number
): SvgPart {
  const base = `<polygon points="${rampStartX},${layout.rampStartY} ${layout.rampEndX},${layout.rampEndY} ${rampBaseX},${rampBaseY} ${rampStartX},1024" fill="#4A2B62" opacity="${rampOpacity}"/>`;
  const dark = `<polygon points="${layout.rampEndX - 285},${layout.rampEndY + 120} ${layout.rampEndX},${layout.rampEndY} ${layout.rampEndX + 5},${layout.rampEndY + 45} ${layout.rampEndX - 255},${layout.rampEndY + 180}" fill="#1A1208" opacity="${lerp(0.55, 0.9, scores.risk / 100)}"/>`;
  const gold = `<polygon points="${layout.rampEndX - 45},${layout.rampEndY + 25} ${layout.rampEndX},${layout.rampEndY} ${layout.rampEndX},${layout.rampEndY + 140} ${layout.rampEndX - 43},${layout.rampEndY + 140}" fill="#E0A52C" opacity="0.92"/>`;

  if (layout.rampPattern === 1) {
    const stripes = Array.from({ length: 5 }, (_, index) => {
      const y = layout.rampStartY + index * 28;
      return `<polygon points="${rampStartX + index * 26},${y} ${layout.rampEndX - 180 + index * 38},${layout.rampEndY + 88 + index * 8} ${layout.rampEndX - 170 + index * 38},${layout.rampEndY + 108 + index * 8} ${rampStartX + index * 26},${y + 20}" fill="#E7C46A" opacity="0.2"/>`;
    });
    return `${base}${stripes.join("")}${dark}${gold}`;
  }

  if (layout.rampPattern === 2) {
    const teeth = Array.from({ length: 8 }, (_, index) => {
      const x = layout.mirror ? layout.rampEndX + index * 22 : layout.rampEndX - 260 + index * 22;
      const y = layout.rampEndY + 80 + index * 10;
      return `<polygon points="${x},${y} ${x + 22},${y + 12} ${x},${y + 24}" fill="#F0D997" opacity="0.42"/>`;
    });
    return `${base}${teeth.join("")}${dark}${gold}`;
  }

  if (layout.rampPattern === 3) {
    return `${base}<line x1="${rampStartX}" y1="${layout.rampStartY}" x2="${layout.rampEndX}" y2="${layout.rampEndY}" stroke="#111318" stroke-width="12" opacity="0.42"/>
      <line x1="${rampStartX}" y1="${layout.rampStartY + 44}" x2="${layout.rampEndX + 40}" y2="${layout.rampEndY + 74}" stroke="#D9502F" stroke-width="7" opacity="0.36"/>${gold}`;
  }

  return `${base}${dark}${gold}`;
}

function renderRareSymbols(palette: Palette, scores: WalletScores, params: ArtParameters, rng: () => number): SvgPart {
  if (!params.hasRareSymbol) {
    return `<g id="rare-symbols"></g>`;
  }

  const symbols = Math.max(1, Math.round(scores.nft / 28));
  const parts = Array.from({ length: symbols }, (_, index) => {
    const cx = snap(120 + rng() * 760, 20);
    const cy = snap(110 + rng() * 660, 20);
    const size = lerp(24, 58, rng());
    const rotate = lerp(-22, 22, rng());

    if (index % 2 === 0) {
      return `<polygon points="${cx},${cy - size} ${cx + size},${cy} ${cx},${cy + size} ${cx - size},${cy}" fill="none" stroke="${palette.secondary}" stroke-width="3" opacity="0.66" transform="rotate(${rotate} ${cx} ${cy})"/>`;
    }

    return `<path d="M ${cx - size} ${cy} L ${cx} ${cy - size} L ${cx + size} ${cy} L ${cx} ${cy + size} Z" fill="${palette.primary}" opacity="0.18" transform="rotate(${rotate} ${cx} ${cy})"/>`;
  });

  return `<g id="rare-symbols">${parts.join("")}</g>`;
}

function renderForeground(palette: Palette, scores: WalletScores, layout: CompositionLayout, rng: () => number): SvgPart {
  const base = mix("#3F5D5E", palette.dark, 0.2);
  const textureLines = Array.from({ length: 12 }, (_, index) => {
    const y = 870 + index * 11 + rng() * 8;
    return `<line x1="0" y1="${y}" x2="1024" y2="${y + lerp(-5, 5, rng())}" stroke="#1A1208" stroke-width="1" opacity="${lerp(0.05, 0.1, scores.age / 100)}"/>`;
  });
  const groundMotif = renderGroundMotif(scores, layout);

  return `<g id="foreground">
    <rect x="0" y="865" width="1024" height="159" fill="${base}" opacity="0.82"/>
    ${groundMotif}
    <line x1="145" y1="948" x2="675" y2="948" stroke="#1A1208" stroke-width="2" opacity="0.32"/>
    ${textureLines.join("")}
  </g>`;
}

function renderGroundMotif(scores: WalletScores, layout: CompositionLayout): SvgPart {
  const hotOpacity = lerp(0.45, 0.86, scores.wealth / 100);
  if (layout.groundPattern === 1) {
    return `<rect x="0" y="918" width="190" height="106" fill="#D8512C" opacity="${hotOpacity}"/>
      <path d="M 0 918 L 190 918 L 95 1024 Z" fill="#1A1208" opacity="0.4"/>
      <circle cx="430" cy="958" r="54" fill="#CFC3A0" opacity="0.86"/>`;
  }

  if (layout.groundPattern === 2) {
    return `<circle cx="128" cy="955" r="86" fill="#D8512C" opacity="${hotOpacity}"/>
      <circle cx="128" cy="955" r="48" fill="none" stroke="#F0D997" stroke-width="18" opacity="0.55"/>
      <path d="M 356 1024 A 96 96 0 0 1 548 1024 Z" fill="#CFC3A0" opacity="0.88"/>`;
  }

  if (layout.groundPattern === 3) {
    return `<path d="M 0 1010 C 115 900 230 900 360 1010 L 360 1024 L 0 1024 Z" fill="#D8512C" opacity="${hotOpacity}"/>
      <path d="M 330 1024 C 410 910 520 910 610 1024 Z" fill="#CFC3A0" opacity="0.88"/>
      <line x1="360" y1="930" x2="620" y2="930" stroke="#1A1208" stroke-width="2" opacity="0.28"/>`;
  }

  return `<path d="M 0 1000 A 78 78 0 0 1 156 1000 L 156 1024 L 0 1024 Z" fill="#D8512C" opacity="${hotOpacity}"/>
    <circle cx="390" cy="970" r="72" fill="#CFC3A0" opacity="0.92"/>
    <circle cx="390" cy="970" r="72" fill="#1A1208" opacity="${lerp(0.08, 0.22, scores.risk / 100)}"/>`;
}

function renderPaperTexture(): SvgPart {
  return `<g id="paper-texture" opacity="0.82" style="mix-blend-mode:multiply">
    <rect x="0" y="0" width="1024" height="1024" filter="url(#paper-noise)" opacity="1"/>
    <rect x="0" y="0" width="1024" height="1024" fill="#C5B17C" opacity="0.08"/>
  </g>`;
}

function createLayout(rng: () => number, scores: WalletScores): CompositionLayout {
  const faceArchetype = selectFaceArchetype(scores, rng);
  const variant = variantForFaceArchetype(faceArchetype);
  const isFeminine = selectFeminineForm(scores, faceArchetype, rng);
  const hairStyle = Math.floor(rng() * 5);
  const columnPattern = Math.floor(rng() * 4);
  const facadePattern = Math.floor(rng() * 4);
  const spherePattern = Math.floor(rng() * 4);
  const rampPattern = Math.floor(rng() * 4);
  const groundPattern = Math.floor(rng() * 4);
  const mirror = variant === 3 || variant === 5 || rng() > 0.78;
  const diamondBands = mirror
    ? [
        [660, 790],
        [710, 850],
        [610, 735]
      ]
    : [
        [45, 160],
        [120, 245],
        [190, 310]
      ];
  const centralBands = [
    [250, 430],
    [360, 540],
    [155, 315],
    [430, 610],
    [285, 485],
    [210, 390]
  ];
  const sunBands = [
    [430, 680],
    [590, 830],
    [300, 520],
    [650, 845],
    [360, 610],
    [520, 760]
  ];
  const sphereBands = [
    [520, 760],
    [430, 650],
    [620, 840],
    [350, 560],
    [575, 805],
    [455, 710]
  ];
  const rampEndBands = [
    [620, 910],
    [480, 760],
    [700, 980],
    [360, 650],
    [610, 820],
    [760, 1010]
  ];
  const diamondBand = diamondBands[variant % diamondBands.length] ?? diamondBands[0]!;
  const centralBand = centralBands[variant] ?? centralBands[0]!;
  const sunBand = sunBands[variant] ?? sunBands[0]!;
  const sphereBand = sphereBands[variant] ?? sphereBands[0]!;
  const rampBand = rampEndBands[variant] ?? rampEndBands[0]!;
  const diamondX = snap(lerp(diamondBand[0]!, diamondBand[1]!, rng()), 10);
  const centralX = snap(lerp(centralBand[0]!, centralBand[1]!, rng()), 10);
  const sunCx = Math.max(240, Math.min(850, snap(lerp(sunBand[0]!, sunBand[1]!, rng()) + (scores.wealth - 50) * 1.1, 20)));
  const sunCy = snap(variant === 2 ? lerp(205, 360, rng()) : lerp(125, 295, rng()), 20);
  const sphereAnchorX = Math.max(320, Math.min(850, snap(lerp(sphereBand[0]!, sphereBand[1]!, rng()) + (scores.defi - 50) * 0.8, 10)));
  const sphereAnchorY = snap(variant === 4 ? lerp(250, 380, rng()) : lerp(310, 485, rng()), 10);
  const lowerShift = lerp(-170, 150, rng());
  const rampEndX = snap(lerp(rampBand[0]!, rampBand[1]!, rng()), 10);
  const rampEndY = snap(variant === 3 ? lerp(520, 640, rng()) : lerp(575, 735, rng()), 10);
  const rampStartY = snap(lerp(880, 1015, rng()), 10);

  return {
    faceArchetype,
    variant,
    isFeminine,
    hairStyle,
    columnPattern,
    facadePattern,
    spherePattern,
    rampPattern,
    groundPattern,
    diamondX,
    centralX,
    sunCx,
    sunCy,
    sphereAnchorX,
    sphereAnchorY,
    lowerShift,
    rampStartY,
    rampEndX,
    rampEndY,
    mirror
  };
}

function selectFaceArchetype(scores: WalletScores, rng: () => number): FaceArchetype {
  const average = (scores.age + scores.tx + scores.defi + scores.nft + scores.risk + scores.multichain + scores.wealth) / 7;

  if (average < 16) {
    return "oval";
  }
  if (scores.risk >= 82) {
    return "mask";
  }
  if (scores.nft >= 78) {
    return "soft";
  }
  if (scores.multichain >= 84) {
    return "split-face";
  }
  if (scores.defi >= 78) {
    return "profile";
  }
  if (scores.age >= 78 && scores.tx >= 72) {
    return "angular";
  }
  if (scores.wealth >= 88) {
    return "monolith";
  }

  const archetypes: FaceArchetype[] = ["oval", "angular", "mask", "profile", "soft", "monolith", "split-face"];
  return archetypes[Math.floor(rng() * archetypes.length)] ?? "oval";
}

function selectFeminineForm(scores: WalletScores, faceArchetype: FaceArchetype, rng: () => number): boolean {
  const average = (scores.age + scores.tx + scores.defi + scores.nft + scores.risk + scores.multichain + scores.wealth) / 7;
  const roll = rng();
  let chance = 0.12;

  if (faceArchetype === "soft") {
    chance += 0.18;
  }
  if (faceArchetype === "oval") {
    chance += 0.08;
  }
  if (scores.nft >= 86) {
    chance += 0.14;
  }
  if (scores.defi >= 78 && scores.risk <= 45) {
    chance += 0.08;
  }
  if (average >= 81) {
    chance += 0.06;
  }
  if (scores.risk >= 82 || faceArchetype === "mask") {
    chance -= 0.08;
  }
  if (average < 41) {
    chance -= 0.06;
  }

  return roll < Math.max(0.06, Math.min(0.36, chance));
}

function variantForFaceArchetype(faceArchetype: FaceArchetype): number {
  switch (faceArchetype) {
    case "angular":
      return 1;
    case "profile":
      return 2;
    case "soft":
      return 3;
    case "mask":
      return 4;
    case "monolith":
    case "split-face":
      return 5;
    case "oval":
    default:
      return 0;
  }
}

function createRng(seed: `0x${string}`): () => number {
  let state = Number.parseInt(seed.slice(2, 18), 16);
  if (!Number.isFinite(state) || state === 0) {
    state = 0x9e3779b97f4a7c15;
  }

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clampScores(scores: WalletScores): WalletScores {
  return {
    age: clamp(scores.age),
    tx: clamp(scores.tx),
    defi: clamp(scores.defi),
    nft: clamp(scores.nft),
    risk: clamp(scores.risk),
    multichain: clamp(scores.multichain),
    wealth: clamp(scores.wealth)
  };
}

function selectPalette(wealthScore: number): Palette {
  const index = Math.max(0, Math.min(palettes.length - 1, Math.floor((clamp(wealthScore) * palettes.length) / 101)));
  return palettes[index] ?? palettes[0]!;
}

function snap(value: number, grid: number): number {
  return Math.round(value / grid) * grid;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
}

function lerp(min: number, max: number, t: number): number {
  return min + (max - min) * clamp01(t);
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function mix(hexA: string, hexB: string, amount: number): string {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  const t = clamp01(amount);

  return `#${[0, 1, 2]
    .map((index) => Math.round(lerp(a[index] ?? 0, b[index] ?? 0, t)).toString(16).padStart(2, "0"))
    .join("")}`;
}

function parseHex(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  const value = Number.parseInt(normalized, 16);

  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

interface PortraitColorSet {
  name: string;
  bg: string;
  bgWash: string;
  skin: string;
  warm: string;
  warmDark: string;
  gold: string;
  cool: string;
  coolDark: string;
  chin: string;
  cheek: string;
  accent: string;
  lip: string;
  backShapes: string[];
  softBlocks: string[];
}

const portraitColorSets: PortraitColorSet[] = [
  {
    name: "classic-primary",
    bg: "#EFE6D2",
    bgWash: "#D8D4B8",
    skin: "#F0E7D6",
    warm: "#E23427",
    warmDark: "#9D2E25",
    gold: "#F2C51F",
    cool: "#1767A8",
    coolDark: "#123B55",
    chin: "#1767A8",
    cheek: "#D97161",
    accent: "#7A95A7",
    lip: "#E23427",
    backShapes: ["#E23427", "#D97161", "#C56C54", "#B75C73"],
    softBlocks: ["#E9B3A1", "#E6D98A", "#AFC8C8", "#D9C4A1"]
  },
  {
    name: "sage-muted",
    bg: "#E8E2D4",
    bgWash: "#C7D0C1",
    skin: "#EFE2CC",
    warm: "#C4572A",
    warmDark: "#7E2E1B",
    gold: "#DDBB45",
    cool: "#4A6B8A",
    coolDark: "#1D3F56",
    chin: "#4A6B8A",
    cheek: "#B9786C",
    accent: "#4A6741",
    lip: "#C94A34",
    backShapes: ["#C4572A", "#B9786C", "#A45E4A", "#C88B63"],
    softBlocks: ["#D6A08E", "#C6C994", "#A8BEB8", "#D8C793"]
  },
  {
    name: "arctic-pastel",
    bg: "#E8EEF0",
    bgWash: "#D5DFDE",
    skin: "#ECE2D1",
    warm: "#D85B42",
    warmDark: "#8A3124",
    gold: "#E0B94D",
    cool: "#3A5A6A",
    coolDark: "#173747",
    chin: "#6E7E8C",
    cheek: "#C7888E",
    accent: "#8C7FA3",
    lip: "#D94B3D",
    backShapes: ["#D85B42", "#C7888E", "#B66A86", "#D0846B"],
    softBlocks: ["#D7A6A4", "#D6C99D", "#AFC3CC", "#C9C0D5"]
  },
  {
    name: "amber-paper",
    bg: "#F5E8C8",
    bgWash: "#E3D6B3",
    skin: "#F2E3C1",
    warm: "#B94A2E",
    warmDark: "#6E2C1C",
    gold: "#B8941A",
    cool: "#2F6F7F",
    coolDark: "#123F49",
    chin: "#2F6F7F",
    cheek: "#C77F64",
    accent: "#7A6B91",
    lip: "#C94335",
    backShapes: ["#B94A2E", "#C77F64", "#A75D47", "#C89555"],
    softBlocks: ["#DCA18C", "#D9C875", "#A7C0B6", "#CDBB9D"]
  },
  {
    name: "rose-porcelain",
    bg: "#F3E4DC",
    bgWash: "#E8CFCB",
    skin: "#F1DFD4",
    warm: "#C94848",
    warmDark: "#7A2730",
    gold: "#D9A83E",
    cool: "#527B92",
    coolDark: "#213F52",
    chin: "#8CA7B4",
    cheek: "#D48C95",
    accent: "#A67A9A",
    lip: "#C83A45",
    backShapes: ["#C94848", "#D48C95", "#B76C8A", "#DE9B86"],
    softBlocks: ["#E5B7B1", "#D8B7C8", "#B5CAD0", "#E2D2AA"]
  },
  {
    name: "mint-coral",
    bg: "#EAF0DF",
    bgWash: "#CFE1CF",
    skin: "#EFE6D0",
    warm: "#D65A3A",
    warmDark: "#823323",
    gold: "#E1BD4D",
    cool: "#3E8A86",
    coolDark: "#1E4F53",
    chin: "#62A39A",
    cheek: "#E09A7E",
    accent: "#5F7F5B",
    lip: "#D34839",
    backShapes: ["#D65A3A", "#E09A7E", "#C9825D", "#E0B06C"],
    softBlocks: ["#E7B8A0", "#C7DCA9", "#A9CBC6", "#E0C982"]
  },
  {
    name: "lavender-steel",
    bg: "#ECE8F0",
    bgWash: "#D8D4E5",
    skin: "#EFE3D5",
    warm: "#D25745",
    warmDark: "#7B2E37",
    gold: "#D6B555",
    cool: "#586F96",
    coolDark: "#253A58",
    chin: "#7E88A8",
    cheek: "#C589A4",
    accent: "#7B66A1",
    lip: "#C94352",
    backShapes: ["#D25745", "#C589A4", "#A96A95", "#D18476"],
    softBlocks: ["#D9B4C7", "#C5C7E0", "#B9C8D6", "#E2CBA6"]
  },
  {
    name: "ochre-ink",
    bg: "#EFE2C4",
    bgWash: "#DCCB9F",
    skin: "#F1E1BF",
    warm: "#B84A2B",
    warmDark: "#592B20",
    gold: "#C79A22",
    cool: "#255E70",
    coolDark: "#102C35",
    chin: "#315F66",
    cheek: "#B97B5D",
    accent: "#7F6B48",
    lip: "#B9372E",
    backShapes: ["#B84A2B", "#B97B5D", "#91503A", "#C07944"],
    softBlocks: ["#D8A070", "#C9B76B", "#A2B9A8", "#C6A884"]
  },
  {
    name: "powder-blue",
    bg: "#E6EEF2",
    bgWash: "#CDDCE3",
    skin: "#EFE7DA",
    warm: "#D7654D",
    warmDark: "#8C3528",
    gold: "#D8BF62",
    cool: "#4C7F9D",
    coolDark: "#1D4158",
    chin: "#6FA0B8",
    cheek: "#D69A88",
    accent: "#8EA0A8",
    lip: "#D94D45",
    backShapes: ["#D7654D", "#D69A88", "#B46D76", "#DA8B6B"],
    softBlocks: ["#D8AAA0", "#CAD9E0", "#AEC7D4", "#E1D4A8"]
  },
  {
    name: "olive-theatre",
    bg: "#E7E4CF",
    bgWash: "#D1D4B8",
    skin: "#EEE1C8",
    warm: "#C95A36",
    warmDark: "#71351F",
    gold: "#CFB13E",
    cool: "#4D7180",
    coolDark: "#193D45",
    chin: "#587A61",
    cheek: "#C68570",
    accent: "#6C7E43",
    lip: "#C83D33",
    backShapes: ["#C95A36", "#C68570", "#A35F44", "#B88452"],
    softBlocks: ["#D7A58C", "#C7CC8F", "#A8BDAA", "#D7C28A"]
  },
  {
    name: "peach-aqua",
    bg: "#F4E3D2",
    bgWash: "#EBD1C5",
    skin: "#F3DEC9",
    warm: "#E26B4F",
    warmDark: "#914131",
    gold: "#E6B94C",
    cool: "#3F91A6",
    coolDark: "#174E5C",
    chin: "#67A9B4",
    cheek: "#E1A08B",
    accent: "#77A88E",
    lip: "#D94D45",
    backShapes: ["#E26B4F", "#E1A08B", "#C98472", "#DFA15F"],
    softBlocks: ["#EDB9A5", "#C8DDD2", "#ACD3DA", "#E5C77F"]
  },
  {
    name: "dusty-plum",
    bg: "#ECE2E4",
    bgWash: "#D7C5CF",
    skin: "#EFE0D4",
    warm: "#B64B58",
    warmDark: "#6A2936",
    gold: "#C9A953",
    cool: "#536C89",
    coolDark: "#25364A",
    chin: "#7F7897",
    cheek: "#C58796",
    accent: "#8B5D83",
    lip: "#B9354C",
    backShapes: ["#B64B58", "#C58796", "#9D5F83", "#C7776A"],
    softBlocks: ["#D8A7B2", "#C8B7D0", "#AEBFD0", "#D7C58D"]
  },
  {
    name: "butter-sky",
    bg: "#F3EBCF",
    bgWash: "#E4DDAF",
    skin: "#F0E3CA",
    warm: "#D95F34",
    warmDark: "#80351F",
    gold: "#E8C84A",
    cool: "#5A93B8",
    coolDark: "#224C67",
    chin: "#8AB1C7",
    cheek: "#DB9079",
    accent: "#D1B960",
    lip: "#D64235",
    backShapes: ["#D95F34", "#DB9079", "#C37D55", "#D4A048"],
    softBlocks: ["#E5AF95", "#E7D775", "#B8D0DA", "#D4CDA2"]
  },
  {
    name: "seafoam-rust",
    bg: "#E2ECE4",
    bgWash: "#CADDD0",
    skin: "#EFE3D0",
    warm: "#B85B3A",
    warmDark: "#66301F",
    gold: "#C9B64B",
    cool: "#3D8178",
    coolDark: "#1A4C48",
    chin: "#4F978B",
    cheek: "#C8866D",
    accent: "#6E9468",
    lip: "#BA4135",
    backShapes: ["#B85B3A", "#C8866D", "#A6684E", "#C49B55"],
    softBlocks: ["#D59F86", "#BCD4C4", "#95C0B5", "#D2C477"]
  },
  {
    name: "ink-rose",
    bg: "#EEE5DF",
    bgWash: "#DBCBC9",
    skin: "#F2E2D6",
    warm: "#D34A42",
    warmDark: "#6D2224",
    gold: "#CCAA4A",
    cool: "#263F5E",
    coolDark: "#101A29",
    chin: "#3E5874",
    cheek: "#D08A8F",
    accent: "#A16976",
    lip: "#CF3342",
    backShapes: ["#D34A42", "#D08A8F", "#AA6570", "#C77E63"],
    softBlocks: ["#DFACAA", "#D3B8BE", "#AAB8C7", "#D5C28B"]
  },
  {
    name: "pale-citrus",
    bg: "#EEF0D8",
    bgWash: "#DCE4B8",
    skin: "#EEE2C6",
    warm: "#D86D3F",
    warmDark: "#874126",
    gold: "#D8C83E",
    cool: "#609E99",
    coolDark: "#265552",
    chin: "#92B9A8",
    cheek: "#D99773",
    accent: "#A0A94A",
    lip: "#D84A36",
    backShapes: ["#D86D3F", "#D99773", "#C88953", "#D1AD4D"],
    softBlocks: ["#DFA889", "#DCE08A", "#B7D3C0", "#D5C985"]
  },
  {
    name: "clay-violet",
    bg: "#EEE1D7",
    bgWash: "#D8C3BD",
    skin: "#F0DFD0",
    warm: "#C75B3D",
    warmDark: "#6C3023",
    gold: "#CFA74A",
    cool: "#5E6A8D",
    coolDark: "#29324B",
    chin: "#7A718F",
    cheek: "#C68778",
    accent: "#765B91",
    lip: "#BE3A35",
    backShapes: ["#C75B3D", "#C68778", "#A76678", "#C37C63"],
    softBlocks: ["#D5A08D", "#C8B4D1", "#AEB7CF", "#D8C083"]
  },
  {
    name: "porcelain-green",
    bg: "#E9EEE7",
    bgWash: "#D4DFD6",
    skin: "#EFE4D6",
    warm: "#C85A43",
    warmDark: "#743324",
    gold: "#D0B64A",
    cool: "#507E86",
    coolDark: "#1F484D",
    chin: "#6E988E",
    cheek: "#CE8B79",
    accent: "#5C8757",
    lip: "#C93F38",
    backShapes: ["#C85A43", "#CE8B79", "#A96F5B", "#C89558"],
    softBlocks: ["#DCA08E", "#BED5C3", "#A7C2C7", "#D7C580"]
  },
  {
    name: "apricot-stone",
    bg: "#F1E6D7",
    bgWash: "#DFD0BE",
    skin: "#F0DDC9",
    warm: "#D7784E",
    warmDark: "#8C4B35",
    gold: "#D6B35A",
    cool: "#5A8290",
    coolDark: "#274C59",
    chin: "#7DA0A7",
    cheek: "#DAA187",
    accent: "#A88B68",
    lip: "#C24A3C",
    backShapes: ["#D7784E", "#DAA187", "#BD7B63", "#E0B16B"],
    softBlocks: ["#E7B89D", "#D8C694", "#B9CDD0", "#D9BDA6"]
  },
  {
    name: "mauve-celadon",
    bg: "#ECE7DF",
    bgWash: "#D7D7C8",
    skin: "#EFE1D0",
    warm: "#B85F65",
    warmDark: "#744044",
    gold: "#C9B463",
    cool: "#6E8F85",
    coolDark: "#37574F",
    chin: "#83A49A",
    cheek: "#C9919A",
    accent: "#8E809F",
    lip: "#B6404D",
    backShapes: ["#B85F65", "#C9919A", "#A97891", "#C89C74"],
    softBlocks: ["#D9A7AC", "#C9D3B7", "#B7CCC5", "#D6C69D"]
  },
  {
    name: "pomegranate-cream",
    bg: "#F0E4D8",
    bgWash: "#DDC8C0",
    skin: "#F1DDCD",
    warm: "#AA3940",
    warmDark: "#672832",
    gold: "#D0A84F",
    cool: "#446D83",
    coolDark: "#223D51",
    chin: "#698CA0",
    cheek: "#C77C83",
    accent: "#98667C",
    lip: "#A92F3C",
    backShapes: ["#AA3940", "#C77C83", "#98576F", "#C48062"],
    softBlocks: ["#D7A0A2", "#D4B7A0", "#A9BEC8", "#D5C184"]
  },
  {
    name: "linen-cobalt",
    bg: "#EEE8DA",
    bgWash: "#D4D5C7",
    skin: "#EFE2D0",
    warm: "#CB6A46",
    warmDark: "#7D412F",
    gold: "#D9BE5E",
    cool: "#2E6EA3",
    coolDark: "#1A4769",
    chin: "#4B83B2",
    cheek: "#D2937C",
    accent: "#7B8AA0",
    lip: "#C94039",
    backShapes: ["#CB6A46", "#D2937C", "#B8746E", "#D3A55E"],
    softBlocks: ["#DFAE95", "#D8D09B", "#B3C9D6", "#D8C0A1"]
  },
  {
    name: "shell-saffron",
    bg: "#F2E9D9",
    bgWash: "#E2D6BD",
    skin: "#F0E0CB",
    warm: "#C96C55",
    warmDark: "#80423A",
    gold: "#E0BE42",
    cool: "#5B8C95",
    coolDark: "#2D5660",
    chin: "#86A9AB",
    cheek: "#D59A91",
    accent: "#B59B52",
    lip: "#C64A42",
    backShapes: ["#C96C55", "#D59A91", "#BE8379", "#DBB35F"],
    softBlocks: ["#E2B1A8", "#E0CE91", "#BBD0CC", "#D8C7AA"]
  },
  {
    name: "mist-lilac",
    bg: "#ECEAF0",
    bgWash: "#D7D2E0",
    skin: "#EEE0D4",
    warm: "#C4675C",
    warmDark: "#7C3E42",
    gold: "#CDB35C",
    cool: "#617A9E",
    coolDark: "#304864",
    chin: "#8492B0",
    cheek: "#C993A0",
    accent: "#8D76A6",
    lip: "#B9434B",
    backShapes: ["#C4675C", "#C993A0", "#A9789B", "#C99D70"],
    softBlocks: ["#D9A9AD", "#C8C5E0", "#B9C7D7", "#D6C59A"]
  }
];

function portraitColorSet(palette: Palette, layout: CompositionLayout): PortraitColorSet {
  const archetypeOffset = ["oval", "angular", "mask", "profile", "soft", "monolith", "split-face"].indexOf(layout.faceArchetype);
  const index = (layout.variant + layout.columnPattern + layout.groundPattern + Math.max(0, archetypeOffset)) % portraitColorSets.length;
  const selected = portraitColorSets[index] ?? portraitColorSets[0]!;

  if (palette.name === "forest_dusk" || palette.name === "cool_sage") {
    return { ...selected, accent: "#4A6741", cool: "#4A6B8A", chin: index % 2 === 0 ? "#4A6B8A" : "#4A6741" };
  }

  if (palette.name === "arctic_steel") {
    return { ...selected, bg: "#E8EEF0", bgWash: "#D9E4E4", cool: "#3A5A6A", chin: "#5A7A8A" };
  }

  return selected;
}

function portraitClothingColors(colors: PortraitColorSet, layout: CompositionLayout): string[] {
  const sets = [
    [colors.cool, colors.coolDark, colors.gold, colors.accent, colors.bg, colors.bgWash],
    [colors.warm, colors.cheek, colors.gold, colors.cool, colors.skin, colors.backShapes[1] ?? colors.cheek],
    [colors.chin, colors.accent, colors.backShapes[2] ?? colors.warm, colors.gold, colors.bgWash, colors.skin],
    [colors.backShapes[0] ?? colors.warm, colors.cool, colors.cheek, colors.gold, colors.bg, colors.backShapes[3] ?? colors.accent],
    [colors.accent, colors.chin, colors.warm, colors.cheek, colors.bgWash, colors.gold]
  ];

  return sets[(layout.facadePattern + layout.rampPattern + layout.groundPattern) % sets.length] ?? sets[0]!;
}

function portraitRed(palette: Palette): string {
  if (palette.name === "cool_sage" || palette.name === "forest_dusk") {
    return "#C4572A";
  }
  if (palette.name === "deep_blue" || palette.name === "arctic_steel") {
    return "#D84E35";
  }
  return "#E23427";
}

function portraitCream(palette: Palette): string {
  if (palette.name === "royal_amber") {
    return "#F2E3C1";
  }
  if (palette.name === "arctic_steel") {
    return "#E8E2D4";
  }
  return palette.paper;
}
