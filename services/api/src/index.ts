import "dotenv/config";
import { createHash, createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { Queue, Worker, QueueEvents, type Job } from "bullmq";
import { Redis } from "ioredis";
import { createPublicClient, createWalletClient, getContract, http, isAddress, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet, sepolia } from "viem/chains";
import { analyzeWallet } from "@identity0/wallet-analyzer";
import { generateComposition, getPortraitTraits } from "@identity0/geometry-engine";
import { stylizeSvg } from "@identity0/ai-pipeline";
import { RARITY_RULES } from "@identity0/shared";

type MintJobData = {
  tokenId: number;
  walletAddress: `0x${string}`;
  txHash?: `0x${string}`;
  cachedImageCid?: string;
  cachedMetadataCid?: string;
};

type MintJobResult = {
  tokenId: number;
  walletAddress: string;
  metadataUri: string;
  imageCid: string;
  pHash: string;
  revealTxHash?: string;
};

const app = express();
const port = Number(process.env.PORT ?? 4000);
const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const mintQueue = new Queue<MintJobData, MintJobResult>("kandinsky-reveal", { connection });
const queueEvents = new QueueEvents("kandinsky-reveal", { connection });

const mintRequests = new Map<string, { tokenId: number; walletAddress: `0x${string}`; txHash?: `0x${string}`; createdAt: string }>();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "https://identity0.vercel.app",
  "http://localhost:3000",
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) return cb(null, true);
    cb(new Error("Not allowed by CORS"));
  }
}));

// Raw body'yi webhook doğrulaması için sakla (express.json verify ile — stream tüketilmez)
app.use(express.json({
  limit: "1mb",
  verify: (req: express.Request & { rawBody?: Buffer }, _res, buf) => { req.rawBody = buf; }
}));
app.use(rateLimit({ windowMs: 60_000, limit: 100 }));

// Wallet başına max 3 mint/initiate isteği (MAX_MINTS_PER_WALLET ile eşit)
const mintInitiateLimit = rateLimit({
  windowMs: 60_000 * 60,
  limit: 3,
  keyGenerator: (req) => (req.body?.walletAddress ?? req.ip ?? "unknown").toLowerCase(),
  message: { error: "Wallet mint limit reached. Maximum 3 per wallet." },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "kandinsky-api" });
});

app.post("/api/mint/initiate", mintInitiateLimit, async (req, res) => {
  const { tokenId, walletAddress, txHash } = req.body as Partial<MintJobData>;
  if (!Number.isInteger(tokenId) || !walletAddress || !isAddress(walletAddress)) {
    res.status(400).json({ error: "tokenId and walletAddress are required" });
    return;
  }

  // tokenId geçerli aralıkta mı?
  if (Number(tokenId) < 1 || Number(tokenId) > 3333) {
    res.status(400).json({ error: "Invalid tokenId" });
    return;
  }

  // txHash format doğrulaması (varsa)
  if (txHash && !/^0x[a-fA-F0-9]{64}$/.test(txHash)) {
    res.status(400).json({ error: "Invalid txHash format" });
    return;
  }

  // Aynı tokenId için duplicate job önle — jobId ile
  const jobId = `token-${tokenId}`;
  const existingJob = await mintQueue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === "active" || state === "waiting" || state === "delayed") {
      res.json({ jobId: existingJob.id, status: "already_queued", estimatedTime: "60-180s" });
      return;
    }
  }

  const normalizedWallet = walletAddress.toLowerCase() as `0x${string}`;
  const numericTokenId = Number(tokenId);
  const data: MintJobData = { tokenId: numericTokenId, walletAddress: normalizedWallet };
  if (txHash) data.txHash = txHash;

  const job = await mintQueue.add(
    `token-${tokenId}`,
    data,
    { jobId, attempts: 3, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 1000, removeOnFail: 1000 }
  );

  mintRequests.set(job.id!, { ...data, createdAt: new Date().toISOString() });
  res.json({ jobId: job.id, status: "queued", estimatedTime: "60-180s" });
});

app.post("/api/webhooks/mint", async (req, res) => {
  // HMAC-SHA256 signature doğrulama (Alchemy raw body formatı)
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers["x-alchemy-signature"] ?? req.headers["x-webhook-signature"];
    const rawBody = (req as express.Request & { rawBody?: Buffer }).rawBody ?? Buffer.from(JSON.stringify(req.body));
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!sig || sig !== expected) {
      res.status(401).json({ error: "Invalid webhook signature" });
      return;
    }
  }

  const events = extractMintEvents(req.body);
  const jobs = [];
  for (const event of events) {
    const jobId = `token-${event.tokenId}`;
    const job = await mintQueue.add(
      jobId,
      event,
      { jobId, attempts: 3, backoff: { type: "exponential", delay: 30_000 }, removeOnComplete: 1000, removeOnFail: 1000 }
    );
    jobs.push({ jobId: job.id, tokenId: event.tokenId });
  }

  res.json({ accepted: jobs.length, jobs });
});

app.get("/api/mint/status/:jobId", async (req, res) => {
  const job = await mintQueue.getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: "job not found" });
    return;
  }

  const state = await job.getState();
  res.json({
    jobId: job.id,
    state,
    progress: job.progress,
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason
  });
});

// Admin: token reveal cache'ini sıfırla (ADMIN_SECRET ile korunur)
app.delete("/api/admin/reveal-cache/:tokenId", async (req, res) => {
  const secret = process.env.ADMIN_KEY;
  if (!secret || req.headers["x-admin-key"] !== secret) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const tokenId = Number(req.params.tokenId);
  if (!Number.isInteger(tokenId) || tokenId < 1 || tokenId > 3333) {
    res.status(400).json({ error: "Invalid tokenId" });
    return;
  }
  const revealedKey = `kandinsky:revealed:${tokenId}`;
  const jobId = `token-${tokenId}`;
  await connection.del(revealedKey);
  const job = await mintQueue.getJob(jobId);
  if (job) await job.remove();
  res.json({ ok: true, deleted: [revealedKey, jobId] });
});

app.get("/api/token/:tokenId", async (req, res) => {
  const tokenId = Number(req.params.tokenId);
  const request = [...mintRequests.values()].find((item) => item.tokenId === tokenId);
  res.json({ tokenId, request: request ?? null });
});

new Worker<MintJobData, MintJobResult>(
  "kandinsky-reveal",
  async (job) => runRevealWorkflow(job),
  { connection, concurrency: Number(process.env.REVEAL_WORKER_CONCURRENCY ?? 1) }
);

queueEvents.on("failed", ({ jobId, failedReason }) => {
  console.error(`Reveal job ${jobId} failed: ${failedReason}`);
});

app.listen(port, () => {
  console.log(`Kandinsky API listening on ${port}`);
});

async function runRevealWorkflow(job: Job<MintJobData, MintJobResult>): Promise<MintJobResult> {
  let imageCid = job.data.cachedImageCid;
  let metadataCid = job.data.cachedMetadataCid;

  if (!imageCid || !metadataCid) {
    await job.updateProgress({ status: "analyzing" });
    const analyzerOptions: { alchemyApiKey?: string; covalentApiKey?: string; tokenId?: number } = {};
    if (process.env.ALCHEMY_API_KEY) analyzerOptions.alchemyApiKey = process.env.ALCHEMY_API_KEY;
    if (process.env.COVALENT_API_KEY) analyzerOptions.covalentApiKey = process.env.COVALENT_API_KEY;
    analyzerOptions.tokenId = job.data.tokenId;
    const profile = await analyzeWallet(job.data.walletAddress, analyzerOptions);
    // Tier claim sadece ilk denemede yapılır — retry'da counter şişmez
    if (job.attemptsMade === 0) {
      const assignedTier = await claimTierSlot(connection, profile.rarityTier);
      if (assignedTier !== profile.rarityTier) {
        console.log(`  Soft cap: ${profile.rarityTier} → ${assignedTier} for token #${job.data.tokenId}`);
        profile.rarityTier = assignedTier;
      }
    }

    await job.updateProgress({ status: "composing" });
    const svg = generateComposition(profile);
    const traits = getPortraitTraits(profile);

    await job.updateProgress({ status: "generating" });
    const styleReferenceImage = await loadStyleReference();
    const stylizeOptions: Parameters<typeof stylizeSvg>[1] = {
      profile,
      preset: "ip-adapter-cubist",
      model: (process.env.REPLICATE_MODEL_OVERRIDE ?? process.env.REPLICATE_MODEL ?? "stability-ai/stable-diffusion-3.5-large") as `${string}/${string}` | `${string}/${string}:${string}`,
      ipAdapterScale: Number(process.env.IP_ADAPTER_SCALE ?? 0.82),
      maxAttempts: 3,
      enforceQuality: true
    };
    if (styleReferenceImage) {
      stylizeOptions.styleReferenceImage = styleReferenceImage;
    }
    const generated = await stylizeSvg(svg, stylizeOptions);

    await job.updateProgress({ status: "uploading" });
    imageCid = await uploadBufferToIPFS(generated.imageBuffer, `kandinsky-${job.data.tokenId}.webp`);
    const rareItemLabel = (["None", "Accent", "Brooch", "Symbol", "Aura", "Crown"] as const)[traits.rareItemLevel] ?? "None";
    const scoreKeyLabel: Record<string, string> = { age: "Wallet Age", tx: "Transactions", defi: "DeFi Activity", nft: "NFT Holdings", risk: "Risk Profile", multichain: "Multi-chain", wealth: "Portfolio Wealth" };
    const metadata = {
      name: `Kandinsky #${job.data.tokenId}`,
      description: "Your wallet's on-chain history — transactions, DeFi positions, NFT holdings, age — scored across seven dimensions and rendered as a Bauhaus AI portrait. Each identity is unique, deterministic, and permanent.",
      image: `ipfs://${imageCid}`,
      external_url: `https://www.kandisky.art`,
      attributes: [
        { trait_type: "Tier",            value: profile.rarityTier },
        { trait_type: "Face Archetype", value: traits.faceArchetype },
        { trait_type: "Expression",     value: traits.expression },
        { trait_type: "Palette",        value: traits.paletteFamily },
        { trait_type: "Form",           value: traits.hasFeminineForm ? "Feminine" : "Masculine" },
        { trait_type: "Rare Item",      value: rareItemLabel },
        { display_type: "boost_number", trait_type: "Composite Score", value: Math.round(profile.compositeScore), max_value: 100 },
        ...Object.entries(profile.scores).map(([key, value]) => ({
          display_type: "boost_number" as const,
          trait_type: scoreKeyLabel[key] ?? key,
          value: Math.round(value),
          max_value: 100
        }))
      ]
    };
    metadataCid = await uploadJsonToIPFS(metadata, `kandinsky-${job.data.tokenId}.json`);
    // Retry durumunda generation'ı atlamak için CID'leri job data'ya kaydet
    await job.updateData({ ...job.data, cachedImageCid: imageCid, cachedMetadataCid: metadataCid });
  } else {
    console.log(`  Token #${job.data.tokenId}: cached CIDs found, skipping generation`);
  }
  const metadataUri = `ipfs://${metadataCid}`;

  await job.updateProgress({ status: "revealing" });
  const revealTxHash = await revealToken(job.data.tokenId, metadataUri);

  await job.updateProgress({ status: "complete" });
  const result: MintJobResult = {
    tokenId: job.data.tokenId,
    walletAddress: job.data.walletAddress,
    metadataUri,
    imageCid,
    pHash: ""
  };
  if (revealTxHash) {
    result.revealTxHash = revealTxHash;
  }
  return result;
}

async function loadStyleReference(): Promise<Buffer | undefined> {
  const path = process.env.STYLE_REFERENCE_IMAGE_PATH;
  if (!path) {
    return undefined;
  }
  return readFile(resolve(path));
}

async function uploadBufferToIPFS(buffer: Buffer, filename: string): Promise<string> {
  if (!process.env.PINATA_JWT) {
    return mockCid(buffer, filename);
  }

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(buffer)]), filename);
  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    body: form
  });
  if (!response.ok) {
    throw new Error(`Pinata image upload failed: ${response.status} ${await response.text()}`);
  }
  const json = (await response.json()) as { IpfsHash: string };
  return json.IpfsHash;
}

async function uploadJsonToIPFS(json: unknown, filename: string): Promise<string> {
  const body = JSON.stringify({ pinataContent: json, pinataMetadata: { name: filename } });
  if (!process.env.PINATA_JWT) {
    return mockCid(Buffer.from(body), filename);
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}`, "content-type": "application/json" },
    body
  });
  if (!response.ok) {
    throw new Error(`Pinata metadata upload failed: ${response.status} ${await response.text()}`);
  }
  const result = (await response.json()) as { IpfsHash: string };
  return result.IpfsHash;
}

// Concurrent reveal'larda nonce çakışmasını önlemek için Redis mutex
async function revealToken(tokenId: number, metadataUri: string): Promise<string | undefined> {
  if (!process.env.CONTRACT_ADDRESS || !process.env.OPERATOR_PRIVATE_KEY || process.env.SKIP_CHAIN_REVEAL === "true") {
    return undefined;
  }

  const chain = Number(process.env.CHAIN_ID ?? 11155111) === 1 ? mainnet : sepolia;
  const transport = http(process.env.ETH_RPC_URL ?? process.env.ETH_SEPOLIA_RPC_URL ?? process.env.ETH_MAINNET_RPC_URL);
  const account = privateKeyToAccount(process.env.OPERATOR_PRIVATE_KEY as `0x${string}`);
  const publicClient = createPublicClient({ chain, transport });
  const walletClient = createWalletClient({ account, chain, transport });

  // Redis lock — aynı anda sadece 1 tx gönderilir, nonce çakışmaz
  const lockKey = "kandinsky:reveal:lock";
  const lockTtl = 60; // saniye
  while (true) {
    const acquired = await connection.set(lockKey, "1", "EX", lockTtl, "NX");
    if (acquired) break;
    await new Promise(r => setTimeout(r, 500));
  }

  try {
    // Double-reveal koruması — daha önce başarıyla reveal edildiyse atla
    const revealedKey = `kandinsky:revealed:${tokenId}`;
    const alreadyRevealed = await connection.get(revealedKey);
    if (alreadyRevealed) {
      console.log(`  Token #${tokenId} already revealed (cached), skipping`);
      return alreadyRevealed;
    }

    const nonce = await publicClient.getTransactionCount({ address: account.address });
    const contract = getContract({
      address: process.env.CONTRACT_ADDRESS as `0x${string}`,
      abi: parseAbi(["function revealToken(uint256 tokenId,string ipfsCidOrURI) external"]),
      client: { public: publicClient, wallet: walletClient }
    });
    const hash = await contract.write.revealToken([BigInt(tokenId), metadataUri], { nonce });
    await publicClient.waitForTransactionReceipt({ hash });
    // 30 gün saklı kalır
    await connection.set(revealedKey, hash, "EX", 60 * 60 * 24 * 30);
    return hash;
  } finally {
    await connection.del(lockKey);
  }
}

// Tier sırasına göre cap kontrolü — dolu ise bir alt tiere kaydır.
// Redis INCR atomik olduğundan race condition yok.
// Bir job başarısız olursa sayaç düzeltilmez — bu kabul edilebilir bir edge case.
async function claimTierSlot(redis: Redis, scoredTier: string): Promise<typeof RARITY_RULES[number]["tier"]> {
  const tierOrder = RARITY_RULES.slice().reverse().map(r => r.tier); // Legendary → Common
  const caps = Object.fromEntries(RARITY_RULES.map(r => [r.tier, r.targetSupply]));

  const startIdx = tierOrder.indexOf(scoredTier as (typeof tierOrder)[number]);
  if (startIdx === -1) return scoredTier as typeof RARITY_RULES[number]["tier"];

  for (let i = startIdx; i < tierOrder.length; i++) {
    const tier = tierOrder[i]!;
    const cap = caps[tier];
    if (cap === undefined || cap >= 9999) return tier; // Common: no hard cap

    const count = await redis.incr(`kandinsky:tier:${tier.toLowerCase()}`);
    if (count <= cap) return tier;
    await redis.decr(`kandinsky:tier:${tier.toLowerCase()}`);
  }

  return "Common";
}

function mockCid(buffer: Buffer, filename: string): string {
  const digest = createHash("sha256").update(filename).update(buffer).digest("hex");
  return `mock-${digest.slice(0, 46)}`;
}

function extractMintEvents(payload: unknown): MintJobData[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const direct = payload as Partial<MintJobData>;
  if (Number.isInteger(direct.tokenId) && direct.walletAddress && isAddress(direct.walletAddress)) {
    const event: MintJobData = { tokenId: Number(direct.tokenId), walletAddress: direct.walletAddress.toLowerCase() as `0x${string}` };
    if (direct.txHash) event.txHash = direct.txHash;
    return [event];
  }

  const maybeActivities = (payload as { event?: { activity?: unknown[] }; activity?: unknown[] }).event?.activity ?? (payload as { activity?: unknown[] }).activity;
  if (!Array.isArray(maybeActivities)) {
    return [];
  }

  return maybeActivities.flatMap((activity) => {
    if (!activity || typeof activity !== "object") return [];
    const item = activity as { fromAddress?: string; toAddress?: string; tokenId?: string | number; hash?: string };
    const walletAddress = item.toAddress ?? item.fromAddress;
    const tokenId = typeof item.tokenId === "string" ? Number.parseInt(item.tokenId, 10) : item.tokenId;
    if (!Number.isInteger(tokenId) || !walletAddress || !isAddress(walletAddress)) return [];
    const event: MintJobData = { tokenId: Number(tokenId), walletAddress: walletAddress.toLowerCase() as `0x${string}` };
    if (item.hash) event.txHash = item.hash as `0x${string}`;
    return [event];
  });
}
