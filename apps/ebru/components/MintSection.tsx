"use client";

import { useState } from "react";

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gold/8 last:border-0">
      <span className="font-inter text-[10px] tracking-[0.15em] uppercase text-white/30">{label}</span>
      <span className="font-cormorant text-sm text-gold/85 tracking-wide">{value}</span>
    </div>
  );
}

/* Ebru swirl preview — left panel */
function PreviewPanel() {
  return (
    <div
      className="relative flex-shrink-0 flex items-center justify-center overflow-hidden"
      style={{
        width: "clamp(260px, 38%, 380px)",
        background:
          "radial-gradient(ellipse 75% 65% at 28% 38%, rgba(201,168,76,0.14) 0%, transparent 62%)," +
          "radial-gradient(ellipse 55% 75% at 72% 62%, rgba(46,196,182,0.11) 0%, transparent 62%)," +
          "radial-gradient(ellipse 85% 45% at 52% 82%, rgba(139,105,20,0.12) 0%, transparent 62%)," +
          "radial-gradient(ellipse 40% 60% at 80% 20%, rgba(46,196,182,0.07) 0%, transparent 60%)," +
          "#080808",
      }}
    >
      {/* Comb stroke lines — ebru feel */}
      <svg
        className="absolute inset-0 w-full h-full opacity-20"
        viewBox="0 0 380 480"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
      >
        <path d="M0 240 Q95 120 190 240 Q285 360 380 240"  stroke="rgba(201,168,76,0.6)"  strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d="M0 260 Q95 140 190 260 Q285 380 380 260"  stroke="rgba(201,168,76,0.3)"  strokeWidth="0.5" fill="none" strokeLinecap="round" />
        <path d="M0 220 Q95 100 190 220 Q285 340 380 220"  stroke="rgba(46,196,182,0.4)"  strokeWidth="0.6" fill="none" strokeLinecap="round" />
        <path d="M20 360 Q140 200 240 330 Q320 420 380 300" stroke="rgba(139,105,20,0.5)"  strokeWidth="0.8" fill="none" strokeLinecap="round" />
        <path d="M0 140 Q120 80 180 180 Q240 280 380 120"   stroke="rgba(46,196,182,0.25)" strokeWidth="0.5" fill="none" strokeLinecap="round" />
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i}
            x1={i * 28} y1="0" x2={i * 28 + (i % 2 === 0 ? -10 : 10)} y2="480"
            stroke={i % 3 === 0 ? "rgba(201,168,76,0.1)" : "rgba(46,196,182,0.07)"}
            strokeWidth="0.4"
          />
        ))}
        <circle cx="190" cy="240" r="70" stroke="rgba(201,168,76,0.18)" strokeWidth="0.5" />
        <circle cx="190" cy="240" r="45" stroke="rgba(46,196,182,0.14)" strokeWidth="0.5" />
        <circle cx="190" cy="240" r="22" stroke="rgba(201,168,76,0.22)" strokeWidth="0.6" />
        <circle cx="190" cy="240" r="5"  fill="rgba(201,168,76,0.35)" />
      </svg>

      {/* Centre label */}
      <div className="relative z-10 flex flex-col items-center gap-2 text-center px-8">
        <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
          <circle cx="24" cy="24" r="22" stroke="rgba(201,168,76,0.35)" strokeWidth="0.8" />
          <circle cx="24" cy="24" r="13" stroke="rgba(46,196,182,0.25)" strokeWidth="0.7" />
          <circle cx="24" cy="24" r="4"  fill="rgba(201,168,76,0.4)" />
        </svg>
        <span className="font-cormorant italic text-white/20 text-base mt-1">Coming Soon</span>
      </div>

      {/* Corner marks */}
      {["top-3 left-3","top-3 right-3 rotate-90","bottom-3 right-3 rotate-180","bottom-3 left-3 -rotate-90"].map((c,i) => (
        <div key={i} className={`absolute ${c}`}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M0 14 L0 0 L14 0" stroke="rgba(201,168,76,0.35)" strokeWidth="0.7" fill="none"/>
          </svg>
        </div>
      ))}
    </div>
  );
}

export default function MintSection() {
  const [qty, setQty] = useState(1);
  const MAX = 5;

  return (
    <section id="mint" className="relative py-28 px-6 ebru-bg">
      <div className="gold-divider opacity-30 mb-20" />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14 reveal">
          <p className="font-inter text-[10px] tracking-[0.4em] uppercase text-turquoise/60 mb-4">
            Token Acquisition
          </p>
          <h2
            className="font-cormorant font-light text-gold-light"
            style={{ fontSize: "clamp(2.5rem,6vw,5rem)", letterSpacing: "0.06em" }}
          >
            Mint
          </h2>
          <div className="w-16 gold-divider mx-auto mt-6 opacity-60" />
        </div>

        {/* ── Horizontal card ── */}
        <div
          className="reveal border-gold-glow rounded-sm overflow-hidden flex flex-col md:flex-row"
          style={{ background: "rgba(10,10,10,0.97)", minHeight: 380 }}
        >
          {/* Left — preview */}
          <PreviewPanel />

          {/* Vertical separator */}
          <div className="hidden md:block w-px self-stretch bg-gradient-to-b from-transparent via-gold/20 to-transparent flex-shrink-0" />

          {/* Right — mint controls */}
          <div className="flex-1 flex flex-col justify-between p-8 md:p-10">

            {/* Info rows */}
            <div className="mb-6">
              <InfoRow label="Price"        value="TBD ETH" />
              <InfoRow label="Total Supply" value="TBD" />
              <InfoRow label="Available"    value="TBD" />
              <InfoRow label="Max Per Wallet" value="5" />
              <InfoRow label="Network"      value="Ethereum Mainnet" />
            </div>

            {/* Progress bar */}
            <div className="mb-7">
              <div className="flex justify-between mb-2">
                <span className="font-inter text-[9px] tracking-[0.18em] uppercase text-white/25">Mint Progress</span>
                <span className="font-inter text-[9px] text-gold/40">— / —</span>
              </div>
              <div className="w-full h-px bg-white/6 overflow-hidden">
                <div
                  className="h-full"
                  style={{ width: "0%", background: "linear-gradient(90deg,#8b6914,#c9a84c,#e8cc7a)" }}
                />
              </div>
            </div>

            {/* Quantity + mint */}
            <div className="flex items-center gap-5 mb-5">
              {/* Qty selector */}
              <div className="flex items-center gap-4 border border-gold/15 px-4 py-2">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty <= 1}
                  className="text-gold/60 hover:text-gold disabled:opacity-20 transition-colors font-inter text-base leading-none"
                >
                  −
                </button>
                <span className="font-cormorant text-2xl text-gold min-w-[1.5ch] text-center">{qty}</span>
                <button
                  onClick={() => setQty(Math.min(MAX, qty + 1))}
                  disabled={qty >= MAX}
                  className="text-gold/60 hover:text-gold disabled:opacity-20 transition-colors font-inter text-base leading-none"
                >
                  +
                </button>
              </div>

              {/* Mint button */}
              <button className="btn-mint flex-1">
                Mint Now
              </button>
            </div>

            {/* Total + hint */}
            <div className="flex items-center justify-between">
              <p className="font-inter text-[10px] text-white/20 tracking-wide">
                Total: <span className="text-gold/50">TBD ETH × {qty} = TBD ETH</span>
              </p>
              <p className="font-inter text-[10px] text-white/18 tracking-wide">
                Connect your wallet to mint
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="gold-divider opacity-30 mt-20" />
    </section>
  );
}
