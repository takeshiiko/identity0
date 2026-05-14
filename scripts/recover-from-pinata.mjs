#!/usr/bin/env node
/**
 * Pinata'daki tüm metadata JSON dosyalarını bulur,
 * pending_reveals'ta olmayan tokenları admin endpoint üzerinden ekler.
 * Böylece re-generate gerek kalmadan tüm tokenlar reveal edilebilir.
 *
 * Usage: node scripts/recover-from-pinata.mjs
 */
import "dotenv/config";

const PINATA_JWT = process.env.PINATA_JWT;
const API        = process.env.API_URL ?? "https://identity0-production.up.railway.app";
const KEY        = process.env.ADMIN_KEY;

if (!PINATA_JWT || !KEY) {
  console.error("PINATA_JWT ve ADMIN_KEY gerekli");
  process.exit(1);
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Pinata'dan tüm kandinsky-*.json dosyalarını çek
async function fetchPinataMetadata() {
  console.log("📦 Pinata'dan metadata dosyaları çekiliyor...");
  const map = new Map(); // tokenId → ipfs://CID
  let offset = 0;
  const limit = 1000;

  while (true) {
    const url = `https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=${limit}&pageOffset=${offset}&metadata[name]=kandinsky-`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${PINATA_JWT}` }
    });
    const json = await res.json();
    const rows = json.rows ?? [];

    for (const row of rows) {
      const name = row.metadata?.name ?? "";
      // sadece JSON dosyaları (metadata), görsel değil
      if (!name.endsWith(".json")) continue;
      const match = name.match(/kandinsky-(\d+)\.json/);
      if (!match) continue;
      const tokenId = Number(match[1]);
      // En son yükleneni al (aynı token için birden fazla varsa)
      if (!map.has(tokenId)) {
        map.set(tokenId, `ipfs://${row.ipfs_pin_hash}`);
      }
    }

    process.stdout.write(`\r  ${map.size} metadata bulundu (sayfa offset: ${offset})...`);

    if (rows.length < limit) break;
    offset += limit;
    await sleep(300);
  }

  console.log(`\n✓ Toplam ${map.size} token metadata'sı bulundu`);
  return map;
}

// Mevcut pending_reveals'ı al
async function getPendingReveals() {
  const res = await fetch(`${API}/api/admin/queue-stats`, {
    headers: { "x-admin-key": KEY }
  });
  const data = await res.json();
  return data.pendingReveal ?? 0;
}

// pending_reveals'a toplu ekle
async function addToPendingReveals(entries) {
  const res = await fetch(`${API}/api/admin/add-pending-reveals`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": KEY },
    body: JSON.stringify({ entries })
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

async function main() {
  console.log(`\n${"═".repeat(52)}`);
  console.log(`  KANDINSKY — Recover from Pinata`);
  console.log(`${"═".repeat(52)}\n`);

  const pinataMap = await fetchPinataMetadata();

  const pendingBefore = await getPendingReveals();
  console.log(`\nŞu an pending_reveals: ${pendingBefore}`);
  console.log(`Pinata'da bulunan    : ${pinataMap.size}`);
  console.log(`Eklenecek            : ~${pinataMap.size - pendingBefore}`);

  // Batch halinde gönder
  const entries = [...pinataMap.entries()].map(([tokenId, uri]) => ({ tokenId, uri }));
  const BATCH = 200;
  let added = 0;

  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    try {
      const result = await addToPendingReveals(batch);
      added += result.added ?? batch.length;
    } catch (err) {
      console.error(`\nBatch hata: ${err.message}`);
    }
    process.stdout.write(`\r  Gönderildi: ${Math.min(i + BATCH, entries.length)}/${entries.length}`);
    await sleep(200);
  }

  console.log(`\n\n✅ ${added} token pending_reveals'a eklendi`);
  console.log(`\nŞimdi kuyruğu durdur ve MAX_GAS_GWEI'yi artır → hepsi reveal olur.`);
}

main().catch(err => {
  console.error("❌", err.message);
  process.exit(1);
});
