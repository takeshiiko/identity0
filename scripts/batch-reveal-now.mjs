#!/usr/bin/env node
/**
 * pending_reveals'tan ilk N×100 token'ı batchReveal ile on-chain reveal eder.
 *
 * Usage:
 *   node scripts/batch-reveal-now.mjs            → varsayılan 5 batch (500 token)
 *   node scripts/batch-reveal-now.mjs --batches=10
 *   node scripts/batch-reveal-now.mjs --dry-run   → tx göndermez, sadece listeler
 */
import "dotenv/config";
import { createPublicClient, createWalletClient, getContract, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { mainnet } from "viem/chains";
import { Redis } from "ioredis";

const REDIS_URL      = process.env.REDIS_URL ?? "redis://localhost:6379";
const CONTRACT_ADDR  = process.env.CONTRACT_ADDRESS ?? "0x1e9fe9a5bba33d0403368fc2dce7af660daf5b1e";
const RPC            = process.env.ETH_MAINNET_RPC_URL ?? process.env.ETH_RPC_URL;
const OPERATOR_KEY   = process.env.OPERATOR_PRIVATE_KEY;
const BATCH_SIZE     = 100;

const BATCHES = (() => {
  const arg = process.argv.find(a => a.startsWith("--batches="));
  return arg ? Number(arg.split("=")[1]) : 5;
})();
const DRY = process.argv.includes("--dry-run");

if (!RPC || !OPERATOR_KEY) {
  console.error("ETH_MAINNET_RPC_URL (veya ETH_RPC_URL) ve OPERATOR_PRIVATE_KEY gerekli");
  process.exit(1);
}

const ABI = parseAbi([
  "function batchReveal(uint256[] calldata tokenIds, string[] calldata ipfsCidsOrURIs) external",
]);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getGwei() {
  const pub = createPublicClient({ chain: mainnet, transport: http(RPC) });
  const price = await pub.getGasPrice();
  return Number(price) / 1e9;
}

async function main() {
  console.log(`\n${"═".repeat(56)}`);
  console.log(`  KANDINSKY — Batch Reveal`);
  console.log(`  Mode   : ${DRY ? "DRY RUN" : "LIVE"}`);
  console.log(`  Batches: ${BATCHES}  (${BATCHES * BATCH_SIZE} token)`);
  console.log(`${"═".repeat(56)}\n`);

  const redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });

  // pending_reveals'tan tüm entry'leri çek
  const all = await redis.hgetall("kandinsky:pending_reveals") ?? {};
  const allEntries = Object.entries(all)
    .map(([tokenId, uri]) => ({ tokenId: Number(tokenId), uri }))
    .sort((a, b) => a.tokenId - b.tokenId);

  console.log(`pending_reveals toplam: ${allEntries.length} token`);

  if (allEntries.length === 0) {
    console.log("Reveal edilecek token yok.");
    await redis.quit();
    return;
  }

  // İstenen kadar al
  const toReveal = allEntries.slice(0, BATCHES * BATCH_SIZE);
  console.log(`Reveal edilecek      : ${toReveal.length} token (${Math.ceil(toReveal.length / BATCH_SIZE)} batch)\n`);

  // Gas fiyatı
  const gwei = await getGwei();
  console.log(`Şu an gas fiyatı: ${gwei.toFixed(3)} gwei`);
  const gasPerBatch = 4_500_000;
  const ethPerBatch = gasPerBatch * gwei / 1e9;
  const totalEth = ethPerBatch * Math.ceil(toReveal.length / BATCH_SIZE);
  console.log(`Tahmini maliyet : ${totalEth.toFixed(5)} ETH (~$${(totalEth * 2500).toFixed(0)} @ $2500)\n`);

  if (DRY) {
    console.log("İlk 10 token:");
    toReveal.slice(0, 10).forEach(e => console.log(`  #${e.tokenId}  ${e.uri}`));
    if (toReveal.length > 10) console.log(`  ... ve ${toReveal.length - 10} tane daha`);
    console.log("\n--dry-run olmadan tekrar çalıştır.");
    await redis.quit();
    return;
  }

  // Viem setup
  const account = privateKeyToAccount(OPERATOR_KEY);
  const transport = http(RPC);
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = createWalletClient({ account, chain: mainnet, transport });
  const contract = getContract({
    address: CONTRACT_ADDR,
    abi: ABI,
    client: { public: publicClient, wallet: walletClient },
  });

  console.log(`Operator: ${account.address}\n`);

  let totalRevealed = 0;

  for (let i = 0; i < toReveal.length; i += BATCH_SIZE) {
    const batch = toReveal.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const tokenIds = batch.map(e => BigInt(e.tokenId));
    const uris = batch.map(e => e.uri);

    process.stdout.write(`Batch ${batchNum}/${Math.ceil(toReveal.length / BATCH_SIZE)}: #${batch[0].tokenId}–#${batch[batch.length - 1].tokenId} gönderiliyor...`);

    try {
      const hash = await contract.write.batchReveal([tokenIds, uris]);
      process.stdout.write(` tx: ${hash}\n  Confirm bekleniyor...`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
      process.stdout.write(` ✅ blok #${receipt.blockNumber}\n`);

      // Redis'ten sil + revealed flag koy (30 gün TTL)
      const pipeline = redis.pipeline();
      for (const e of batch) {
        pipeline.hdel("kandinsky:pending_reveals", String(e.tokenId));
        pipeline.set(`kandinsky:revealed:${e.tokenId}`, "1", "EX", 30 * 24 * 3600);
      }
      await pipeline.exec();

      totalRevealed += batch.length;
    } catch (err) {
      console.error(`\n❌ Batch ${batchNum} hata: ${err.message}`);
    }

    if (i + BATCH_SIZE < toReveal.length) await sleep(2000); // tx'ler arası kısa bekleme
  }

  const remaining = await redis.hlen("kandinsky:pending_reveals");
  console.log(`\n${"═".repeat(56)}`);
  console.log(`  ✅ Reveal tamamlandı: ${totalRevealed} token`);
  console.log(`  Kalan pending_reveals: ${remaining}`);
  console.log(`${"═".repeat(56)}\n`);

  await redis.quit();
}

main().catch(err => {
  console.error("❌ Fatal:", err.message);
  process.exit(1);
});
