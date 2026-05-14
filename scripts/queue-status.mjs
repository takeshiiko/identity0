#!/usr/bin/env node
// Usage: node scripts/queue-status.mjs

const API = process.env.API_URL ?? "https://identity0-production.up.railway.app";
const KEY = process.env.ADMIN_KEY ?? process.argv[2];

if (!KEY) {
  console.error("Usage: ADMIN_KEY=xxx node scripts/queue-status.mjs");
  process.exit(1);
}

const res = await fetch(`${API}/api/admin/queue-stats`, {
  headers: { "x-admin-key": KEY }
});

if (!res.ok) {
  console.error("Error:", res.status, await res.text());
  process.exit(1);
}

const d = await res.json();

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";
const WHITE  = "\x1b[97m";
const GRAY   = "\x1b[90m";

const bar = (filled, total, width = 28) => {
  const pct = total === 0 ? 0 : Math.round((filled / total) * width);
  const done = "█".repeat(pct);
  const empty = "░".repeat(width - pct);
  return `${GREEN}${done}${GRAY}${empty}${RESET}`;
};

const pct = d.queue.total === 0 ? 0 : ((d.queue.completed / 3333) * 100).toFixed(1);

const phaseLabel = { analyzing: "Analyzing wallet", composing: "Composing SVG", generating: "AI generating", uploading: "Uploading IPFS", revealing: "Revealing on-chain" };

const tierEmoji = { legendary: "👑", epic: "💎", rare: "✨", uncommon: "🔷", common: "⬜" };

const hrs = Math.floor(d.estimatedMinutes / 60);
const mins = d.estimatedMinutes % 60;
const eta = hrs > 0 ? `~${hrs}h ${mins}m` : `~${mins}m`;

console.log();
console.log(`  ${BOLD}${WHITE}KANDINSKY  ·  Generation Queue${RESET}`);
console.log(`  ${GRAY}${"─".repeat(42)}${RESET}`);
console.log();

console.log(`  ${bar(d.queue.completed, 3333)}  ${BOLD}${pct}%${RESET}`);
console.log(`  ${GREEN}${d.queue.completed.toLocaleString("en-US")}${RESET}${GRAY} / 3,333 revealed${RESET}   ${DIM}${eta} remaining${RESET}`);
console.log();

console.log(`  ${GRAY}${"─".repeat(42)}${RESET}`);
console.log(`  ${CYAN}⚙  Active    ${RESET}${BOLD}${d.queue.active}${RESET}`);
console.log(`  ${YELLOW}⏳ Waiting   ${RESET}${BOLD}${d.queue.waiting}${RESET}`);
console.log(`  ${GREEN}✓  Completed ${RESET}${BOLD}${d.queue.completed}${RESET}`);
console.log(`  ${RED}✗  Failed    ${RESET}${BOLD}${d.queue.failed}${RESET}`);
console.log(`  ${GRAY}${"─".repeat(42)}${RESET}`);

if (d.activeJobs.length > 0) {
  console.log();
  console.log(`  ${BOLD}Now processing${RESET}`);
  for (const j of d.activeJobs) {
    const phase = typeof j.progress === "object" ? j.progress?.status : j.progress;
    const label = phaseLabel[phase] ?? phase ?? "—";
    console.log(`  ${GRAY}#${String(j.tokenId).padEnd(5)}${RESET} ${label}`);
  }
}

const tierEntries = Object.entries(d.tiers).filter(([, v]) => v > 0);
if (tierEntries.length > 0) {
  console.log();
  console.log(`  ${BOLD}Tier distribution${RESET}`);
  for (const [tier, count] of tierEntries) {
    const emoji = tierEmoji[tier] ?? "·";
    const label = tier.charAt(0).toUpperCase() + tier.slice(1);
    console.log(`  ${emoji}  ${label.padEnd(12)}${BOLD}${count}${RESET}`);
  }
}

if (d.failedJobs?.length > 0) {
  console.log();
  console.log(`  ${RED}${BOLD}Failed jobs${RESET}`);
  for (const j of d.failedJobs) {
    const short = (j.reason ?? "unknown").slice(0, 48);
    console.log(`  ${GRAY}#${String(j.tokenId).padEnd(5)}${RESET} ${RED}${short}${RESET}`);
  }
}

console.log();
console.log(`  ${GRAY}kandisky.art  ·  ${new Date().toLocaleTimeString("en-US")}${RESET}`);
console.log();
