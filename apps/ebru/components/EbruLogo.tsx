import React from "react";

interface Props {
  size?: "sm" | "md" | "lg";
  /** stacked = mark on top, wordmark below | horizontal = side by side */
  layout?: "stacked" | "horizontal";
  className?: string;
}

const SIZES = {
  sm:  { mark: 48,  title: 22, sub: 7,  gap: 10 },
  md:  { mark: 72,  title: 34, sub: 9,  gap: 14 },
  lg:  { mark: 110, title: 52, sub: 11, gap: 20 },
};

/** The abstract ebru mark — oval vessel of flowing pigments */
function EbruMark({ size }: { size: number }) {
  const s = size;
  const cx = s / 2;
  const cy = s / 2;
  const rx = s * 0.46;
  const ry = s * 0.38;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="markGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(201,168,76,0.08)" />
          <stop offset="100%" stopColor="rgba(201,168,76,0)"    />
        </radialGradient>
        <clipPath id="ovalClip">
          <ellipse cx={cx} cy={cy} rx={rx - 1} ry={ry - 1} />
        </clipPath>
        <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#8b6914" />
          <stop offset="45%"  stopColor="#e8cc7a" />
          <stop offset="100%" stopColor="#c9a84c" />
        </linearGradient>
        <linearGradient id="tealLine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"  stopColor="#1a9e92" />
          <stop offset="100%" stopColor="#4eddd5" />
        </linearGradient>
      </defs>

      {/* Outer oval frame */}
      <ellipse cx={cx} cy={cy} rx={rx}     ry={ry}     stroke="url(#goldLine)" strokeWidth={s * 0.012} fill="url(#markGlow)" />
      {/* Inner oval */}
      <ellipse cx={cx} cy={cy} rx={rx - s * 0.08} ry={ry - s * 0.08} stroke="rgba(201,168,76,0.25)" strokeWidth={s * 0.006} fill="none" />

      {/* Ebru swirl strokes — clipped inside oval */}
      <g clipPath="url(#ovalClip)">
        {/* Main flowing curves (marbling comb strokes) */}
        <path
          d={`M${s*0.04} ${cy} Q${cx*0.6} ${cy - ry*0.5} ${cx} ${cy} Q${cx*1.4 + s*0.1} ${cy + ry*0.5} ${s*0.96} ${cy}`}
          stroke="url(#goldLine)" strokeWidth={s * 0.018} fill="none" strokeLinecap="round"
        />
        <path
          d={`M${s*0.04} ${cy - ry*0.28} Q${cx*0.7} ${cy - ry*0.72} ${cx} ${cy - ry*0.28} Q${cx*1.3 + s*0.06} ${cy + ry*0.22} ${s*0.96} ${cy - ry*0.28}`}
          stroke="rgba(201,168,76,0.45)" strokeWidth={s * 0.01} fill="none" strokeLinecap="round"
        />
        <path
          d={`M${s*0.04} ${cy + ry*0.28} Q${cx*0.65} ${cy - ry*0.15} ${cx} ${cy + ry*0.28} Q${cx*1.35 + s*0.08} ${cy + ry*0.72} ${s*0.96} ${cy + ry*0.28}`}
          stroke="url(#tealLine)" strokeWidth={s * 0.014} fill="none" strokeLinecap="round" opacity={0.7}
        />
        <path
          d={`M${s*0.04} ${cy - ry*0.55} Q${cx*0.55} ${cy - ry*0.9} ${cx} ${cy - ry*0.55} Q${cx*1.45 + s*0.1} ${cy} ${s*0.96} ${cy - ry*0.55}`}
          stroke="rgba(139,105,20,0.6)" strokeWidth={s * 0.009} fill="none" strokeLinecap="round"
        />
        <path
          d={`M${s*0.04} ${cy + ry*0.55} Q${cx*0.7} ${cy + ry*0.25} ${cx} ${cy + ry*0.55} Q${cx*1.3 + s*0.06} ${cy + ry*0.88} ${s*0.96} ${cy + ry*0.55}`}
          stroke="rgba(46,196,182,0.4)" strokeWidth={s * 0.009} fill="none" strokeLinecap="round"
        />

        {/* Vertical comb lines */}
        {Array.from({ length: 9 }).map((_, i) => {
          const x = cx - rx * 0.75 + i * (rx * 1.5 / 8);
          const shift = i % 2 === 0 ? s * 0.04 : -s * 0.04;
          return (
            <line key={i}
              x1={x} y1={cy - ry + s*0.02}
              x2={x + shift} y2={cy + ry - s*0.02}
              stroke="rgba(201,168,76,0.1)"
              strokeWidth={s * 0.005}
            />
          );
        })}
      </g>

      {/* Centre dot */}
      <circle cx={cx} cy={cy} r={s * 0.028} fill="rgba(201,168,76,0.7)" />
      <circle cx={cx} cy={cy} r={s * 0.012} fill="#e8cc7a" />

      {/* Corner ticks on oval (top/bottom/left/right) */}
      {[
        [cx,          cy - ry - s*0.06],
        [cx,          cy + ry + s*0.06],
        [cx - rx - s*0.06, cy],
        [cx + rx + s*0.06, cy],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={s * 0.018} fill="rgba(201,168,76,0.5)" />
      ))}
    </svg>
  );
}

export default function EbruLogo({ size = "md", layout = "stacked", className = "" }: Props) {
  const d = SIZES[size];

  if (layout === "horizontal") {
    return (
      <div className={`flex items-center ${className}`} style={{ gap: d.gap }}>
        <EbruMark size={d.mark} />
        {/* Thin vertical separator */}
        <div style={{ width: 1, height: d.mark * 0.55, background: "linear-gradient(to bottom, transparent, rgba(201,168,76,0.4), transparent)" }} />
        <div className="flex flex-col" style={{ gap: d.gap * 0.2 }}>
          <span
            className="font-cormorant font-light tracking-[0.22em] uppercase select-none"
            style={{
              fontSize: d.title,
              lineHeight: 1,
              background: "linear-gradient(135deg, #8b6914 0%, #c9a84c 35%, #e8cc7a 60%, #c9a84c 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Ebru
          </span>
          <span
            className="font-inter tracking-[0.35em] uppercase text-white/30 select-none"
            style={{ fontSize: d.sub, letterSpacing: "0.35em" }}
          >
            NFT Collection
          </span>
        </div>
      </div>
    );
  }

  /* Stacked layout (default) */
  return (
    <div className={`flex flex-col items-center select-none ${className}`} style={{ gap: d.gap * 0.6 }}>
      <EbruMark size={d.mark} />

      {/* Thin top ornament line */}
      <div style={{ display: "flex", alignItems: "center", gap: d.gap * 0.5, width: "100%" }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(201,168,76,0.4))" }} />
        <div style={{ width: d.mark * 0.06, height: d.mark * 0.06, borderRadius: "50%", background: "rgba(201,168,76,0.5)" }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(201,168,76,0.4))" }} />
      </div>

      {/* Wordmark */}
      <span
        className="font-cormorant font-light tracking-[0.28em] uppercase"
        style={{
          fontSize: d.title,
          lineHeight: 1,
          background: "linear-gradient(135deg, #8b6914 0%, #c9a84c 30%, #e8cc7a 55%, #c9a84c 80%, #8b6914 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Ebru
      </span>

      {/* Bottom ornament line */}
      <div style={{ display: "flex", alignItems: "center", gap: d.gap * 0.5, width: "100%" }}>
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, transparent, rgba(46,196,182,0.3))" }} />
        <div style={{ width: d.mark * 0.05, height: d.mark * 0.05, borderRadius: "50%", background: "rgba(46,196,182,0.4)" }} />
        <div style={{ flex: 1, height: 1, background: "linear-gradient(to left, transparent, rgba(46,196,182,0.3))" }} />
      </div>

      {/* Subtitle */}
      <span
        className="font-inter tracking-[0.38em] uppercase text-white/30"
        style={{ fontSize: d.sub }}
      >
        NFT Collection
      </span>
    </div>
  );
}
