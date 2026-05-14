#!/usr/bin/env node
// Usage:
//   node scripts/queue-status.mjs          → tek seferlik
//   node scripts/queue-status.mjs --watch  → canlı (5sn refresh)

const API     = process.env.API_URL  ?? "https://identity0-production.up.railway.app";
const KEY     = process.env.ADMIN_KEY ?? process.argv.find(a => !a.startsWith("--") && a !== process.argv[1]);
const WATCH   = process.argv.includes("--watch");
const INTERVAL = 5_000; // ms

if (!KEY) {
  console.error("Usage: ADMIN_KEY=xxx node scripts/queue-status.mjs [--watch]");
  process.exit(1);
}

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";
const WHITE  = "\x1b[97m";
const GRAY   = "\x1b[90m";
const CLEAR  = "\x1bc"; // terminal'i temizle

const bar = (filled, total, width = 30) => {
  const pct = total === 0 ? 0 : Math.round((filled / total) * width);
  return `${GREEN}${"█".repeat(pct)}${GRAY}${"░".repeat(width - pct)}${RESET}`;
};

const phaseLabel = {
  analyzing:  "🔍 Analyzing wallet",
  composing:  "✏️  Composing SVG",
  generating: "🎨 AI generating",
  uploading:  "📤 Uploading IPFS",
  revealing:  "⛓️  Revealing on-chain",
};

const tierEmoji = { legendary: "👑", epic: "💎", rare: "✨", uncommon: "🔷", common: "⬜" };

async function fetchStats() {
  const res = await fetch(`${API}/api/admin/queue-stats`, {
    headers: { "x-admin-key": KEY }
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res.json();
}

function render(d) {
  const pct     = ((d.queue.completed / 3333) * 100).toFixed(1);
  const hrs     = Math.floor(d.estimatedMinutes / 60);
  const mins    = d.estimatedMinutes % 60;
  const eta     = hrs > 0 ? `~${hrs}h ${mins}m` : mins > 0 ? `~${mins}m` : "almost done";
  const now     = new Date().toLocaleTimeString("en-US");
  const lines   = [];

  const p = s => lines.push(s);

  p(``);
  p(`  ${BOLD}${WHITE}KANDINSKY  ·  Generation Queue${RESET}${WATCH ? `${GRAY}  (live · refreshes every 5s)${RESET}` : ""}`);
  p(`  ${GRAY}${"─".repeat(48)}${RESET}`);
  p(``);
  p(`  ${bar(d.queue.completed, 3333)}  ${BOLD}${pct}%${RESET}`);
  p(`  ${GREEN}${d.queue.completed.toLocaleString("en-US")}${RESET}${GRAY} / 3,333 revealed${RESET}   ${DIM}${eta} remaining${RESET}`);
  p(``);
  p(`  ${GRAY}${"─".repeat(48)}${RESET}`);
  p(`  ${CYAN}⚙  Active      ${RESET}${BOLD}${String(d.queue.active).padStart(4)}${RESET}`);
  p(`  ${YELLOW}⏳ Waiting     ${RESET}${BOLD}${String(d.queue.waiting).padStart(4)}${RESET}`);
  p(`  ${GREEN}✓  Completed   ${RESET}${BOLD}${String(d.queue.completed).padStart(4)}${RESET}`);
  p(`  ${RED}✗  Failed      ${RESET}${BOLD}${String(d.queue.failed).padStart(4)}${RESET}`);
  p(`  ${GRAY}${"─".repeat(48)}${RESET}`);

  if (d.activeJobs.length > 0) {
    p(``);
    p(`  ${BOLD}Now processing${RESET}`);
    for (const j of d.activeJobs) {
      const phase = typeof j.progress === "object" ? j.progress?.status : j.progress;
      const label = phaseLabel[phase] ?? phase ?? "—";
      p(`  ${GRAY}#${String(j.tokenId).padEnd(6)}${RESET}${label}`);
    }
  }

  const tierEntries = Object.entries(d.tiers).filter(([, v]) => v > 0);
  if (tierEntries.length > 0) {
    p(``);
    p(`  ${BOLD}Tier distribution${RESET}`);
    for (const [tier, count] of tierEntries) {
      const emoji = tierEmoji[tier] ?? "·";
      const label = (tier.charAt(0).toUpperCase() + tier.slice(1)).padEnd(12);
      p(`  ${emoji}  ${label}${BOLD}${count}${RESET}`);
    }
  }

  if (d.failedJobs?.length > 0) {
    p(``);
    p(`  ${RED}${BOLD}Failed jobs${RESET}`);
    for (const j of d.failedJobs) {
      const short = (j.reason ?? "unknown").slice(0, 50);
      p(`  ${GRAY}#${String(j.tokenId).padEnd(6)}${RESET}${RED}${short}${RESET}`);
    }
  }

  p(``);
  p(`  ${GRAY}kandisky.art  ·  ${now}${RESET}`);
  p(``);

  return lines.join("\n");
}

async function run() {
  try {
    const d = await fetchStats();
    if (WATCH) process.stdout.write(CLEAR);
    process.stdout.write(render(d) + "\n");
  } catch (err) {
    if (WATCH) process.stdout.write(CLEAR);
    console.error(`  ${RED}Fetch error: ${err.message}${RESET}`);
  }
}

await run();

if (WATCH) {
  setInterval(run, INTERVAL);
  // Ctrl+C ile temiz çıkış
  process.on("SIGINT", () => {
    console.log(`\n  ${GRAY}Stopped.${RESET}\n`);
    process.exit(0);
  });
}
