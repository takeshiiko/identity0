#!/usr/bin/env node
/**
 * Tüm mintlenmiş tokenları Alchemy NFT API ile çeker,
 * kuyruğa alınmamış olanları yeniden işleme alır.
 *
 * Usage:
 *   node scripts/requeue-missing.mjs           (gerçek)
 *   node scripts/requeue-missing.mjs --dry-run (sadece listele)
 */

import "dotenv/config";

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY ?? process.env.ETH_MAINNET_RPC_URL?.split("/").pop();
const CONTRACT    = (process.env.CONTRACT_ADDRESS ?? "0x1e9fe9a5bba33d0403368fc2dce7af660daf5b1e").toLowerCase();
const API         = process.env.API_URL ?? "https://identity0-production.up.railway.app";
const KEY         = process.env.ADMIN_KEY;
const DRY         = process.argv.includes("--dry-run");
const BATCH_SIZE  = 5;
const DELAY_MS    = 600;

if (!ALCHEMY_KEY || !KEY) {
  console.error("ALCHEMY_API_KEY ve ADMIN_KEY gerekli");
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function getAllOwners() {
  console.log("📡 Alchemy NFT API — tüm token sahipleri çekiliyor...");
  const owners = new Map(); // tokenId → walletAddress
  let pageKey = null;
  let page = 0;

  do {
    const url = new URL(`https://eth-mainnet.g.alchemy.com/nft/v3/${ALCHEMY_KEY}/getOwnersForContract`);
    url.searchParams.set("contractAddress", CONTRACT);
    url.searchParams.set("withTokenBalances", "true");
    if (pageKey) url.searchParams.set("pageKey", pageKey);

    const res = await fetch(url.toString());
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Alchemy API ${res.status}: ${txt.slice(0, 200)}`);
    }
    const json = await res.json();

    for (const owner of json.owners ?? []) {
      const wallet = owner.ownerAddress.toLowerCase();
      for (const tb of owner.tokenBalances ?? []) {
        const tokenId = parseInt(tb.tokenId, 10);
        if (!isNaN(tokenId)) owners.set(tokenId, wallet);
      }
    }

    pageKey = json.pageKey ?? null;
    page++;
    process.stdout.write(`\r  Sayfa ${page} — ${owners.size} token bulundu...`);
    await sleep(200);
  } while (pageKey);

  console.log(`\n✓ Toplam ${owners.size} token sahibi bulundu`);
  return owners;
}

async function getQueueStats() {
  const res = await fetch(`${API}/api/admin/queue-stats`, {
    headers: { "x-admin-key": KEY }
  });
  if (!res.ok) throw new Error(`queue-stats: ${res.status}`);
  return res.json();
}

async function requeueBatch(batch) {
  const res = await fetch(`${API}/api/admin/requeue`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": KEY },
    body: JSON.stringify({ tokens: batch })
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? res.status);
  return json;
}

async function main() {
  console.log(`\n${"═".repeat(54)}`);
  console.log(`  KANDINSKY — Requeue Missing Tokens`);
  console.log(`  Mode: ${DRY ? "DRY RUN" : "LIVE"}`);
  console.log(`${"═".repeat(54)}\n`);

  // 1. Tüm token sahiplerini al
  const owners = await getAllOwners();

  // 2. Mevcut queue durumu
  console.log("\n📊 Mevcut queue durumu:");
  const stats = await getQueueStats();
  console.log(`  Completed: ${stats.queue.completed}`);
  console.log(`  Waiting  : ${stats.queue.waiting}`);
  console.log(`  Active   : ${stats.queue.active}`);
  console.log(`  Failed   : ${stats.queue.failed}`);

  const allTokenIds = [...owners.keys()].sort((a, b) => a - b);
  console.log(`\n📋 ${allTokenIds.length} token bulundu, kuyruğa gönderilecek`);
  console.log(`   (API duplicate olanları otomatik atlayacak)\n`);

  if (DRY) {
    console.log("İlk 20 token:");
    allTokenIds.slice(0, 20).forEach(id => {
      console.log(`  #${String(id).padEnd(5)} ${owners.get(id)}`);
    });
    if (allTokenIds.length > 20) console.log(`  ... ve ${allTokenIds.length - 20} tane daha`);
    console.log("\n--dry-run olmadan tekrar çalıştır.");
    return;
  }

  // 3. Batch halinde admin endpoint'e gönder (rate limit bypass)
  let queued = 0, skipped = 0, errors = 0;

  for (let i = 0; i < allTokenIds.length; i += 50) {
    const batch = allTokenIds.slice(i, i + 50).map(tokenId => ({
      tokenId,
      walletAddress: owners.get(tokenId)
    }));

    try {
      const result = await requeueBatch(batch);
      queued  += result.queued  ?? 0;
      skipped += result.skipped ?? 0;
    } catch (err) {
      errors += batch.length;
      console.error(`\nBatch hata: ${err.message}`);
    }

    const done = Math.min(i + 50, allTokenIds.length);
    process.stdout.write(`\r  İşlendi: ${done}/${allTokenIds.length} | 🆕 Yeni: ${queued} | ↩ Atlandı: ${skipped} | ✗ Hata: ${errors}   `);
    await sleep(300);
  }

  console.log(`\n\n${"═".repeat(54)}`);
  console.log(`  🆕 Yeni kuyruğa alınan : ${queued}`);
  console.log(`  ↩  Zaten kuyruktaki   : ${skipped}`);
  console.log(`  ✗  Hata               : ${errors}`);
  console.log(`${"═".repeat(54)}`);

  console.log("\n✅ Tamamlandı! Canlı takip için:");
  console.log(`   ADMIN_KEY=${KEY} node scripts/queue-status.mjs --watch\n`);
}

main().catch(err => {
  console.error("\n❌ Fatal:", err.message);
  process.exit(1);
});
