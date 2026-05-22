"use client";

import { useEffect, useState } from "react";

interface BurnStats {
  total_burns: number;
  gtd_count:   number;
  fcfs_count:  number;
  wallets:     number;
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
      } catch {
        /* sessizce yok say */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="burnCounter">
        <div className="burnCounterRow">
          <span className="burnStat burnStatLoading" />
          <span className="burnStat burnStatLoading" />
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const remaining = 3333 - stats.total_burns;

  return (
    <div className="burnCounter">
      <div className="burnCounterRow">
        <div className="burnStatBlock">
          <strong>{stats.total_burns.toLocaleString("en-US")}</strong>
          <span>Burned</span>
        </div>
        <div className="burnDividerV" />
        <div className="burnStatBlock">
          <strong>{remaining.toLocaleString("en-US")}</strong>
          <span>Remaining</span>
        </div>
      </div>
    </div>
  );
}
