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
  "BURN TO MINT", "◈", "KANDINSKY × DERVISH", "◈",
  "PROOF OF FIRE", "◈", "ON-CHAIN BURN", "◈",
  "BURN TO MINT", "◈", "KANDINSKY × DERVISH", "◈",
  "PROOF OF FIRE", "◈", "ON-CHAIN BURN", "◈",
];

function Flame() {
  return (
    <svg className="burnFlame" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Ana alev */}
      <path className="burnFlameCore" d="M16 38 C6 32 4 22 8 14 C10 10 10 6 8 2 C14 6 14 10 12 14 C18 10 20 4 18 0 C26 8 28 18 24 26 C22 30 20 34 16 38Z" />
      {/* İç alev */}
      <path className="burnFlameInner" d="M16 34 C10 28 10 20 13 14 C15 18 14 22 16 26 C18 22 17 18 19 14 C22 20 22 28 16 34Z" />
      {/* Kor */}
      <ellipse className="burnFlameEmber" cx="16" cy="36" rx="4" ry="2" />
    </svg>
  );
}

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
        {/* Burned — alev animasyonlu */}
        <div className="burnStatBlock burnStatBlockFire">
          <Flame />
          {loading
            ? <span className="burnStatLoading" />
            : <strong>{burned.toLocaleString("en-US")}</strong>}
          <span>Burned</span>
        </div>
        <div className="burnDividerV" />
        {/* Remaining */}
        <div className="burnStatBlock">
          {loading
            ? <span className="burnStatLoading" />
            : <strong>{remaining.toLocaleString("en-US")}</strong>}
          <span>Remaining</span>
        </div>
      </div>

      {/* Progress bar — label bar içinde kalır */}
      <div className="burnProgressWrap">
        <div className="burnProgressBar" style={{ width: loading ? "0%" : `${pct}%` }} />
        {!loading && burned > 0 && (
          <span
            className="burnProgressLabel"
            style={{ left: `clamp(12px, ${pct}%, calc(100% - 28px))` }}
          >
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
