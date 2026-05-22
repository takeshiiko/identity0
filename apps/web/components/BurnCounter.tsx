"use client";

import { useEffect, useState } from "react";

interface BurnStats {
  total_burns: number;
  gtd_count:   number;
  fcfs_count:  number;
  wallets:     number;
}

const TOTAL = 3333;

const TICKER_ITEMS = [
  "BURN TO MINT",
  "◈",
  "KANDINSKY × DERVISH",
  "◈",
  "PROOF OF FIRE",
  "◈",
  "ON-CHAIN BURN",
  "◈",
  "BURN TO MINT",
  "◈",
  "KANDINSKY × DERVISH",
  "◈",
  "PROOF OF FIRE",
  "◈",
  "ON-CHAIN BURN",
  "◈",
];

export function BurnCounter() {
  const [stats,   setStats]   = useState<BurnStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("https://dervisheth.art/api/burn-stats");
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        setStats(data);
      } catch { /* sessizce yok say */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const burned    = stats?.total_burns ?? 0;
  const remaining = TOTAL - burned;
  const pct       = (burned / TOTAL) * 100;

  return (
    <div className="burnWidget">

      {/* Counter */}
      <div className="burnCounterRow">
        <div className="burnStatBlock">
          {loading
            ? <span className="burnStatLoading" />
            : <strong>{burned.toLocaleString("en-US")}</strong>}
          <span>Burned</span>
        </div>
        <div className="burnDividerV" />
        <div className="burnStatBlock">
          {loading
            ? <span className="burnStatLoading" />
            : <strong>{remaining.toLocaleString("en-US")}</strong>}
          <span>Remaining</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="burnProgressWrap">
        <div
          className="burnProgressBar"
          style={{ width: loading ? "0%" : `${pct}%` }}
        />
        {!loading && burned > 0 && (
          <span className="burnProgressLabel" style={{ left: `${Math.min(pct, 92)}%` }}>
            {pct.toFixed(1)}%
          </span>
        )}
      </div>

      {/* Animated ticker */}
      <div className="burnTicker">
        <div className="burnTickerTrack">
          {TICKER_ITEMS.map((item, i) => (
            <span key={i} className={item === "◈" ? "burnTickerDot" : "burnTickerText"}>
              {item}
            </span>
          ))}
        </div>
      </div>

    </div>
  );
}
