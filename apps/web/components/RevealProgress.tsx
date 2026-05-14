"use client";

import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const REFRESH_MS = 10_000;

const PHASE_LABEL: Record<string, string> = {
  analyzing:  "Analyzing wallet",
  composing:  "Composing",
  generating: "AI rendering",
  uploading:  "Uploading",
  revealing:  "Revealing on-chain",
  processing: "Processing",
};

const TIER_COLOR: Record<string, string> = {
  legendary: "#cda846",
  epic:      "#8e7294",
  rare:      "#356f95",
  uncommon:  "#6d8f84",
  common:    "#14130f",
};

interface ProgressData {
  revealed: number;
  total: number;
  active: number;
  waiting: number;
  tiers: Record<string, number>;
  nowProcessing: { tokenId: number; phase: string }[];
}

export function RevealProgress() {
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch(`${API_URL}/api/reveal/progress`);
        if (res.ok && alive) setData(await res.json());
      } catch { /* silently ignore */ }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const pct = data ? Math.min(100, (data.revealed / data.total) * 100) : 0;
  const tierEntries = data
    ? Object.entries(data.tiers).filter(([, v]) => v > 0)
    : [];
  const allDone = data ? data.revealed >= data.total && data.active === 0 && data.waiting === 0 : false;

  return (
    <div className="revealBox">
      <span>Generation Progress</span>
      <div className="revealBoxInner">

        {/* Progress bar */}
        <div className="revealBarWrap">
          <div className="revealBar" style={{ width: `${pct}%` }} />
        </div>

        {/* Count row */}
        <div className="revealCountRow">
          <strong className="revealCount">
            {data ? data.revealed.toLocaleString("en-US") : "—"}
          </strong>
          <span className="revealCountOf">/ {(data?.total ?? 3333).toLocaleString("en-US")} portraits generated</span>
          <span className="revealPct">{pct.toFixed(1)}%</span>
        </div>

        {/* Active / Waiting */}
        {data && !allDone && (
          <div className="revealStatusRow">
            <span className="revealStatusChip revealStatusActive">
              ⚙ {data.active} generating
            </span>
            <span className="revealStatusChip">
              ⏳ {data.waiting.toLocaleString("en-US")} queued
            </span>
          </div>
        )}

        {/* Now processing */}
        {data && data.nowProcessing.length > 0 && (
          <div className="revealProcessing">
            {data.nowProcessing.slice(0, 4).map(({ tokenId, phase }) => (
              <div key={tokenId} className="revealProcessingRow">
                <span className="revealTokenId">#{tokenId}</span>
                <span className="revealPhaseDot" />
                <span className="revealPhase">{PHASE_LABEL[phase] ?? phase}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tier distribution */}
        {tierEntries.length > 0 && (
          <div className="revealTiers">
            {tierEntries.map(([tier, count]) => (
              <div key={tier} className="revealTierRow">
                <span
                  className="revealTierDot"
                  style={{ background: TIER_COLOR[tier] ?? "#14130f" }}
                />
                <span className="revealTierName">
                  {tier.charAt(0).toUpperCase() + tier.slice(1)}
                </span>
                <span className="revealTierCount">{count}</span>
              </div>
            ))}
          </div>
        )}

        <p className="revealNote">
          {allDone
            ? "All portraits generated — on-chain reveal incoming."
            : "Each portrait is generated from your wallet's on-chain history. On-chain reveal will be done in a single batch."}
        </p>
      </div>
    </div>
  );
}
