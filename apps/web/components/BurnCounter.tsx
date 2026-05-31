"use client";

const BURNED    = 469;
const TOTAL     = 3333;
const REMAINING = TOTAL - BURNED;
const PCT       = (BURNED / TOTAL) * 100;

const TICKER_ITEMS = [
  "BURN TO MINT", "◈", "KANDINSKY × DERVISH", "◈",
  "PROOF OF FIRE", "◈", "ON-CHAIN BURN", "◈",
  "BURN TO MINT", "◈", "KANDINSKY × DERVISH", "◈",
  "PROOF OF FIRE", "◈", "ON-CHAIN BURN", "◈",
];

function Flame() {
  return (
    <svg className="burnFlame" viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path className="burnFlameCore" d="M16 38 C6 32 4 22 8 14 C10 10 10 6 8 2 C14 6 14 10 12 14 C18 10 20 4 18 0 C26 8 28 18 24 26 C22 30 20 34 16 38Z" />
      <path className="burnFlameInner" d="M16 34 C10 28 10 20 13 14 C15 18 14 22 16 26 C18 22 17 18 19 14 C22 20 22 28 16 34Z" />
      <ellipse className="burnFlameEmber" cx="16" cy="36" rx="4" ry="2" />
    </svg>
  );
}

export function BurnCounter() {
  return (
    <div className="burnWidget">

      {/* Counter */}
      <div className="burnCounterRow">
        <div className="burnStatBlock burnStatBlockFire">
          <Flame />
          <strong>{BURNED.toLocaleString("en-US")}</strong>
          <span>Burned</span>
          <span className="burnPctBadge">{PCT.toFixed(1)}%</span>
        </div>
        <div className="burnDividerV" />
        <div className="burnStatBlock">
          <strong>{REMAINING.toLocaleString("en-US")}</strong>
          <span>Remaining Supply</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="burnProgressWrap">
        <div className="burnProgressBar" style={{ width: `${PCT}%` }} />
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
