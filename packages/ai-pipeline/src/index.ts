import Replicate from "replicate";
import sharp from "sharp";
import type { WalletProfile, WalletScores } from "@identity0/shared";

export interface GenerationResult {
  imageBuffer: Buffer;
  pHash: string;
  aestheticScore: number;
  dominantColors: string[];
  attempts: number;
  quality: QualityGateResult;
}

export interface QualityGateResult {
  passed: boolean;
  reasons: string[];
  metrics: {
    brightness: number;
    darkRatio: number;
    edgeDensity: number;
    colorVariance: number;
    minHashDistance?: number | undefined;
  };
}

export interface StylizeOptions {
  profile?: WalletProfile;
  apiToken?: string;
  model?: `${string}/${string}` | `${string}/${string}:${string}`;
  outputFormat?: "png" | "webp" | "jpg";
  dryRun?: boolean;
  preset?: AiPresetName;
  styleReferenceImage?: Buffer | string;
  ipAdapterScale?: number;
  enforceQuality?: boolean;
  maxAttempts?: number;
  existingPHashes?: string[];
  minHashDistance?: number;
}

export interface AiPrompt {
  positive: string;
  negative: string;
  controlnetConditioningScale: number;
  strength: number;
  guidanceScale: number;
  numInferenceSteps: number;
  seed?: number | undefined;
  ipAdapterScale?: number | undefined;
}

export type AiPresetName = "collection" | "clean-strong-control" | "balanced-poster" | "painterly-clean" | "sd35-cubist" | "ip-adapter-cubist";

export const BASE_POSITIVE_PROMPT = [
  "Bauhaus inspired abstract geometric portrait",
  "premium NFT portrait artwork",
  "surreal constructivist face composition",
  "abstract human face made of colorful geometric planes",
  "bold black hair shape",
  "no black clothing",
  "asymmetric cubist eyes",
  "angular nose",
  "red lips",
  "oxide red ochre cobalt sage mauve warm cream color blocks",
  "cream paper background",
  "retro modernism",
  "Kandinsky style abstraction",
  "aged paper grain",
  "soft grainy texture",
  "gouache and airbrush painting",
  "vintage poster print",
  "muted pastel palette",
  "cinematic composition",
  "highly artistic",
  "textured canvas"
].join(", ");

export const CLEAN_POSITIVE_PROMPT = [
  "clean Bauhaus geometric portrait",
  "minimal constructivist face",
  "flat gouache poster",
  "large simple color planes",
  "clear facial silhouette",
  "clean almond eyes",
  "angular nose",
  "small red geometric lips",
  "muted oxide red ochre cobalt blue sage green and warm cream",
  "minimal paper background",
  "aged paper grain",
  "vintage modernist print",
  "collection-ready NFT portrait",
  "same artist style",
  "no text",
  "no watermark"
].join(", ");

export const CUBIST_STYLE_ANCHOR = [
  "cubist portrait painting",
  "Bauhaus geometric style",
  "Kandinsky color theory",
  "abstract face with angular geometric planes",
  "fragmented facial features",
  "bold color blocking",
  "flat gouache paint texture",
  "vintage modernist poster aesthetic",
  "inspired by Fernand Leger and Juan Gris",
  "strong geometric facial structure",
  "overlapping angular shapes",
  "art deco composition",
  "paper grain texture",
  "masterwork illustration",
  "high quality",
  "clean readable face",
  "two to four large colored facial sections",
  "three to four large background geometric blocks",
  "minimal uncluttered composition",
  "plain warm paper background"
].join(", ");

export const NEGATIVE_PROMPT = [
  "photorealistic",
  "photography",
  "3D render",
  "anime",
  "manga",
  "cartoon",
  "smooth skin",
  "realistic face",
  "text",
  "watermark",
  "signature",
  "ugly",
  "deformed",
  "blurry",
  "low quality",
  "oversaturated",
  "neon colors",
  "glitch effects",
  "logo",
  "letters",
  "real people",
  "black jacket",
  "black robe",
  "black clothing",
  "earrings",
  "overly detailed",
  "busy composition",
  "cluttered background",
  "many small shapes",
  "small tile mosaic",
  "tiny background blocks",
  "excessive lines",
  "chaotic geometry",
  "ornamental",
  "complex texture",
  "extra symbols",
  "messy face",
  "multiple faces"
].join(", ");

export function buildAiPrompt(profile?: WalletProfile, preset: AiPresetName = "collection"): AiPrompt {
  const scores = profile?.scores;
  const modifiers = scores ? buildWalletModifiers(scores) : ["balanced geometric portrait layout"];
  const risk = scores?.risk ?? 45;
  const wealth = scores?.wealth ?? 50;
  const seed = seedFromProfile(profile);
  const controlnetConditioningScale = clampNumber(0.68 + (risk - 50) * 0.0012 - (wealth - 50) * 0.0006, 0.65, 0.75);

  if (preset === "sd35-cubist") {
    return {
      positive: `${CUBIST_STYLE_ANCHOR}, ${buildCubistWalletModifiers(scores).join(", ")}`,
      negative: NEGATIVE_PROMPT,
      controlnetConditioningScale: 0.55,
      strength: scores && scores.tx < 40 ? 0.42 : 0.5,
      guidanceScale: 8.5,
      numInferenceSteps: 40,
      seed
    };
  }

  if (preset === "ip-adapter-cubist") {
    return {
      positive: `${CUBIST_STYLE_ANCHOR}, ${buildCubistWalletModifiers(scores).join(", ")}, unique NFT portrait variation, preserve the reference artwork style without copying exact layout, background limited to three or four large geometric blocks, no small mosaic shapes`,
      negative: NEGATIVE_PROMPT,
      controlnetConditioningScale: 0,
      strength: 1,
      guidanceScale: 0,
      numInferenceSteps: 25,
      seed,
      ipAdapterScale: 0.82
    };
  }

  if (preset === "clean-strong-control") {
    return {
      positive: `${CLEAN_POSITIVE_PROMPT}, simple background, maximum seven facial color planes, one rare item only, ${modifiers.join(", ")}`,
      negative: NEGATIVE_PROMPT,
      controlnetConditioningScale: 0.9,
      strength: 0.48,
      guidanceScale: 6.2,
      numInferenceSteps: 28,
      seed
    };
  }

  if (preset === "balanced-poster") {
    return {
      positive: `${CLEAN_POSITIVE_PROMPT}, balanced poster composition, restrained geometric detail, ${modifiers.join(", ")}`,
      negative: NEGATIVE_PROMPT,
      controlnetConditioningScale: 0.82,
      strength: 0.58,
      guidanceScale: 6.8,
      numInferenceSteps: 30,
      seed
    };
  }

  if (preset === "painterly-clean") {
    return {
      positive: `${CLEAN_POSITIVE_PROMPT}, soft gouache paint texture, subtle airbrush shading, low clutter, ${modifiers.join(", ")}`,
      negative: NEGATIVE_PROMPT,
      controlnetConditioningScale: 0.78,
      strength: 0.52,
      guidanceScale: 7,
      numInferenceSteps: 30,
      seed
    };
  }

  return {
    positive: `${BASE_POSITIVE_PROMPT}, ${modifiers.join(", ")}`,
    negative: NEGATIVE_PROMPT,
    controlnetConditioningScale,
    strength: 0.72,
    guidanceScale: 7.5,
    numInferenceSteps: 30,
    seed
  };
}

export async function stylizeSvg(svg: string, options: StylizeOptions = {}): Promise<GenerationResult> {
  const prompt = buildAiPrompt(options.profile, options.preset);
  const controlImage = await rasterizeSvg(svg);

  if (options.dryRun) {
    return buildGenerationResult(controlImage, 0, options);
  }

  const apiToken = options.apiToken ?? process.env.REPLICATE_API_TOKEN;
  if (!apiToken) {
    throw new Error("REPLICATE_API_TOKEN is required to stylize SVGs. Use dryRun for local raster-only checks.");
  }

  const replicate = new Replicate({ auth: apiToken });
  const model = options.model ?? getReplicateModel();
  const maxAttempts = Math.max(1, Math.min(3, Math.round(options.maxAttempts ?? 3)));
  let lastResult: GenerationResult | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const attemptPrompt = promptForAttempt(prompt, attempt);
    const output = await replicate.run(model, {
      input: buildReplicateInput(controlImage, attemptPrompt, model, options.outputFormat ?? "png", options)
    });
    const imageUrl = extractOutputUrl(output);
    const imageBuffer = await downloadImage(imageUrl);
    const result = await buildGenerationResult(imageBuffer, attempt, options);
    lastResult = result;

    if (options.enforceQuality === false || result.quality.passed) {
      return result;
    }
  }

  throw new QualityGateError("Generated image failed quality gate after maximum attempts.", lastResult);
}

export async function rasterizeSvg(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).resize(1024, 1024, { fit: "contain", background: "#efe4cf" }).png().toBuffer();
}

function buildReplicateInput(
  controlImage: Buffer,
  prompt: AiPrompt,
  model: `${string}/${string}` | `${string}/${string}:${string}`,
  outputFormat: "png" | "webp" | "jpg",
  options: StylizeOptions
): Record<string, unknown> {
  const image = `data:image/png;base64,${controlImage.toString("base64")}`;

  if (model.startsWith("lucataco/sdxl-controlnet")) {
    return {
      image,
      prompt: prompt.positive,
      negative_prompt: prompt.negative,
      num_inference_steps: prompt.numInferenceSteps,
      condition_scale: prompt.controlnetConditioningScale,
      seed: prompt.seed ?? 0
    };
  }

  if (model.startsWith("stability-ai/stable-diffusion-3.5-large")) {
    return {
      image,
      prompt: `${prompt.positive}. Avoid: ${prompt.negative}.`,
      prompt_strength: clampNumber(prompt.strength, 0.1, 1),
      cfg: Math.max(1, prompt.guidanceScale || 4.5),
      steps: prompt.numInferenceSteps,
      seed: prompt.seed,
      output_format: outputFormat,
      output_quality: 100
    };
  }

  if (model.startsWith("lucataco/ip_adapter-sdxl-face") || model.startsWith("chigozienri/ip_adapter-sdxl")) {
    return {
      image: toImageInput(options.styleReferenceImage ?? controlImage),
      prompt: prompt.positive,
      negative_prompt: prompt.negative,
      scale: clampNumber(options.ipAdapterScale ?? prompt.ipAdapterScale ?? 0.84, 0, 1),
      num_outputs: 1,
      num_inference_steps: prompt.numInferenceSteps,
      seed: prompt.seed
    };
  }

  return {
    image,
    prompt: prompt.positive,
    negative_prompt: prompt.negative,
    control_image: image,
    conditioning_image: image,
    controlnet_conditioning_scale: prompt.controlnetConditioningScale,
    strength: prompt.strength,
    guidance_scale: prompt.guidanceScale,
    num_inference_steps: prompt.numInferenceSteps,
    seed: prompt.seed,
    num_outputs: 1,
    output_format: outputFormat,
    scheduler: "K_EULER",
    refine: "expert_ensemble_refiner"
  };
}

function toImageInput(image: Buffer | string): string {
  if (typeof image === "string") {
    return image;
  }

  return `data:image/png;base64,${image.toString("base64")}`;
}

function getReplicateModel(): `${string}/${string}` | `${string}/${string}:${string}` {
  const model = process.env.REPLICATE_MODEL ?? "lucataco/sdxl-controlnet";
  return model as `${string}/${string}` | `${string}/${string}:${string}`;
}

function extractOutputUrl(output: unknown): string {
  if (typeof output === "string") {
    return output;
  }
  if (Array.isArray(output) && typeof output[0] === "string") {
    return output[0];
  }
  if (Array.isArray(output) && output[0] && typeof output[0] === "object" && "url" in output[0]) {
    const url = output[0].url;
    if (typeof url === "string") {
      return url;
    }
    if (typeof url === "function") {
      const resolvedUrl = url.call(output[0]);
      if (typeof resolvedUrl === "string") {
        return resolvedUrl;
      }
    }
  }
  if (output && typeof output === "object" && "url" in output && typeof output.url === "string") {
    return output.url;
  }
  if (output && typeof output === "object" && "url" in output && typeof output.url === "function") {
    const resolvedUrl = output.url();
    if (typeof resolvedUrl === "string") {
      return resolvedUrl;
    }
  }

  throw new Error(`Replicate returned an unsupported output shape: ${JSON.stringify(output)}`);
}

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download Replicate output ${url}: ${response.status} ${response.statusText}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

export class QualityGateError extends Error {
  constructor(message: string, readonly result?: GenerationResult) {
    super(message);
    this.name = "QualityGateError";
  }
}

async function buildGenerationResult(imageBuffer: Buffer, attempts: number, options: StylizeOptions = {}): Promise<GenerationResult> {
  const png = await sharp(imageBuffer)
    .resize(1000, 1000, { fit: "cover" })
    .webp({ quality: 90 })
    .toBuffer();
  const stats = await sharp(png).stats();
  const dominantColors = stats.dominant ? [rgbToHex(stats.dominant.r, stats.dominant.g, stats.dominant.b)] : [];
  const pHash = await perceptualHash(png);
  const quality = await evaluateQuality(png, pHash, options);

  return {
    imageBuffer: png,
    pHash,
    aestheticScore: 0,
    dominantColors,
    attempts,
    quality
  };
}

function promptForAttempt(prompt: AiPrompt, attempt: number): AiPrompt {
  if (attempt <= 1) {
    return prompt;
  }

  const baseSeed = prompt.seed ?? 100_000;
  return {
    ...prompt,
    seed: (baseSeed + attempt * 9973) >>> 0
  };
}

async function evaluateQuality(imageBuffer: Buffer, pHash: string, options: StylizeOptions): Promise<QualityGateResult> {
  const grayscale = await sharp(imageBuffer).resize(128, 128, { fit: "cover" }).greyscale().raw().toBuffer();
  let darkPixels = 0;
  let brightnessTotal = 0;
  let varianceTotal = 0;

  for (const value of grayscale) {
    brightnessTotal += value;
    if (value < 28) {
      darkPixels += 1;
    }
  }

  const brightness = brightnessTotal / grayscale.length;
  for (const value of grayscale) {
    varianceTotal += (value - brightness) ** 2;
  }

  const darkRatio = darkPixels / grayscale.length;
  const colorVariance = Math.sqrt(varianceTotal / grayscale.length);
  const edgeDensity = edgeDensityFromGrayscale(grayscale, 128, 128);
  const distances = (options.existingPHashes ?? []).map((hash) => hammingDistance(pHash, hash));
  const minHashDistance = distances.length > 0 ? Math.min(...distances) : undefined;
  const reasons: string[] = [];

  if (brightness < 38) {
    reasons.push("too_dark");
  }
  if (brightness > 238) {
    reasons.push("too_washed_out");
  }
  if (darkRatio > 0.42) {
    reasons.push("dominant_black_or_shadow");
  }
  if (edgeDensity > 0.34) {
    reasons.push("overly_cluttered_or_multi_face_risk");
  }
  if (edgeDensity < 0.025 || colorVariance < 18) {
    reasons.push("too_flat_or_low_detail");
  }
  if (minHashDistance !== undefined && minHashDistance < (options.minHashDistance ?? 12)) {
    reasons.push("near_duplicate_phash");
  }

  return {
    passed: reasons.length === 0,
    reasons,
    metrics: {
      brightness: roundMetric(brightness),
      darkRatio: roundMetric(darkRatio),
      edgeDensity: roundMetric(edgeDensity),
      colorVariance: roundMetric(colorVariance),
      minHashDistance
    }
  };
}

async function perceptualHash(imageBuffer: Buffer): Promise<string> {
  const size = 16;
  const pixels = await sharp(imageBuffer).resize(size, size, { fit: "cover" }).greyscale().raw().toBuffer();
  const average = pixels.reduce((sum, value) => sum + value, 0) / pixels.length;
  let bits = "";

  for (const value of pixels) {
    bits += value >= average ? "1" : "0";
  }

  return BigInt(`0b${bits}`).toString(16).padStart(64, "0");
}

function edgeDensityFromGrayscale(pixels: Buffer, width: number, height: number): number {
  let edgeCount = 0;
  let comparisons = 0;

  for (let y = 0; y < height - 1; y += 1) {
    for (let x = 0; x < width - 1; x += 1) {
      const index = y * width + x;
      const current = pixels[index] ?? 0;
      const right = pixels[index + 1] ?? current;
      const below = pixels[index + width] ?? current;
      const gradient = Math.abs(current - right) + Math.abs(current - below);
      if (gradient > 54) {
        edgeCount += 1;
      }
      comparisons += 1;
    }
  }

  return edgeCount / comparisons;
}

function hammingDistance(left: string, right: string): number {
  const normalizedLeft = left.replace(/^0x/, "");
  const normalizedRight = right.replace(/^0x/, "");
  const maxLength = Math.max(normalizedLeft.length, normalizedRight.length);
  const leftValue = BigInt(`0x${normalizedLeft.padStart(maxLength, "0")}`);
  const rightValue = BigInt(`0x${normalizedRight.padStart(maxLength, "0")}`);
  let value = leftValue ^ rightValue;
  let distance = 0;

  while (value > 0n) {
    distance += Number(value & 1n);
    value >>= 1n;
  }

  return distance;
}

function roundMetric(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, "0")).join("")}`;
}

function buildWalletModifiers(scores: WalletScores): string[] {
  const modifiers: string[] = [];

  modifiers.push(scores.age > 70 ? "mature elongated face silhouette" : "young compact face silhouette");
  modifiers.push(scores.tx > 70 ? "dense layered facial planes" : "minimal open negative space around the face");
  modifiers.push(scores.defi > 70 ? "overlapping translucent cheek and eye planes" : "flat opaque facial color blocks");
  modifiers.push(scores.nft > 70 ? "rare abstract facial emblem accents" : "restrained geometric face symbols");
  modifiers.push(scores.risk > 70 ? "sharp black angular facial contrast" : "soft low-contrast facial edges");
  modifiers.push(scores.multichain > 60 ? "fragmented split-face composition" : "single-mask portrait composition");
  modifiers.push(scores.wealth > 75 ? "warm yellow and red dominant face palette" : "faded muted portrait tones");

  return modifiers;
}

function buildCubistWalletModifiers(scores?: WalletScores): string[] {
  if (!scores) {
    return ["balanced terracotta and sage green palette", "simple bold composition, few large geometric shapes"];
  }

  const modifiers: string[] = [];
  if (scores.wealth > 80) {
    modifiers.push("warm gold and amber tones, rich ochre palette");
  } else if (scores.wealth >= 40) {
    modifiers.push("balanced terracotta and sage green palette");
  } else {
    modifiers.push("cool muted blues and grays");
  }

  modifiers.push(scores.tx > 75 ? "moderately fragmented portrait, clean geometric planes" : "simple bold composition, few large geometric shapes");
  modifiers.push(scores.risk > 70 ? "high contrast, sharp angular outlines, dramatic shadows" : "soft restrained contrast, readable facial features");
  modifiers.push(scores.age > 80 ? "heavily aged paper texture, vintage patina" : "subtle aged paper texture");
  modifiers.push(scores.defi > 70 ? "deep layered transparent overlapping geometric planes" : "flat opaque Bauhaus color sections");
  modifiers.push(scores.nft > 70 ? "one rare geometric emblem integrated into the portrait" : "no extra ornaments");

  return modifiers;
}

function seedFromProfile(profile?: WalletProfile): number | undefined {
  if (!profile?.seed) {
    return undefined;
  }

  return Number.parseInt(profile.seed.replace(/^0x/, "").slice(0, 8), 16);
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}
