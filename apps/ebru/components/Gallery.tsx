"use client";

import { useEffect, useRef, useState } from "react";

/* Each placeholder card gets a unique CSS ebru swirl palette */
const CARD_PALETTES = [
  { a: "rgba(201,168,76,0.22)", b: "rgba(46,196,182,0.14)", c: "rgba(139,105,20,0.18)" },
  { a: "rgba(46,196,182,0.20)", b: "rgba(201,168,76,0.12)", c: "rgba(26,158,146,0.16)" },
  { a: "rgba(139,105,20,0.24)", b: "rgba(201,168,76,0.16)", c: "rgba(46,196,182,0.10)" },
  { a: "rgba(201,168,76,0.15)", b: "rgba(139,105,20,0.22)", c: "rgba(46,196,182,0.18)" },
  { a: "rgba(26,158,146,0.22)", b: "rgba(201,168,76,0.18)", c: "rgba(139,105,20,0.12)" },
  { a: "rgba(201,168,76,0.20)", b: "rgba(46,196,182,0.22)", c: "rgba(26,158,146,0.14)" },
  { a: "rgba(139,105,20,0.20)", b: "rgba(46,196,182,0.16)", c: "rgba(201,168,76,0.18)" },
  { a: "rgba(46,196,182,0.16)", b: "rgba(139,105,20,0.18)", c: "rgba(201,168,76,0.22)" },
  { a: "rgba(201,168,76,0.18)", b: "rgba(26,158,146,0.20)", c: "rgba(139,105,20,0.16)" },
];

function EbruCardBg({ p }: { p: typeof CARD_PALETTES[0] }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: `
          radial-gradient(ellipse 65% 55% at 25% 35%, ${p.a} 0%, transparent 65%),
          radial-gradient(ellipse 50% 65% at 72% 28%, ${p.b} 0%, transparent 65%),
          radial-gradient(ellipse 75% 45% at 55% 72%, ${p.c} 0%, transparent 65%),
          radial-gradient(ellipse 40% 55% at 80% 78%, ${p.a} 0%, transparent 65%),
          #080808
        `,
        filter: "blur(8px) saturate(1.3)",
      }}
    />
  );
}

function NFTCard({ index, p }: { index: number; p: typeof CARD_PALETTES[0] }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className="nft-card group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="card-inner">
        <EbruCardBg p={p} />

        {/* Overlay grid lines (Turkish-inspired lattice) */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(201,168,76,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.4) 1px, transparent 1px)",
            backgroundSize: "20% 20%",
          }}
        />

        {/* Centered token number */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span
            className="font-cormorant text-gold/70 transition-all duration-400"
            style={{
              fontSize: "clamp(2rem, 6vw, 3.5rem)",
              transform: hovered ? "scale(1.08)" : "scale(1)",
              textShadow: "0 0 30px rgba(201,168,76,0.4)",
            }}
          >
            #{String(index + 1).padStart(3, "0")}
          </span>
          <span className="font-inter text-[10px] tracking-[0.25em] uppercase text-white/25 transition-opacity duration-300"
            style={{ opacity: hovered ? 1 : 0 }}>
            Dervish
          </span>
        </div>

        {/* Hover shine overlay */}
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            opacity: hovered ? 1 : 0,
            background:
              "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, transparent 50%, rgba(46,196,182,0.04) 100%)",
          }}
        />
      </div>

      {/* Card footer */}
      <div className="px-4 py-3 border-t border-gold/8">
        <p className="font-cormorant text-sm text-gold/60 tracking-wider">Dervish #{String(index + 1).padStart(3, "0")}</p>
        <p className="font-inter text-[10px] tracking-wider uppercase text-white/20 mt-0.5">Coming Soon</p>
      </div>
    </div>
  );
}

export default function Gallery() {
  const sectionRef = useRef<HTMLDivElement>(null);

  /* Reveal animation on scroll */
  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll(".reveal") ?? [];
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.1 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="gallery" ref={sectionRef} className="relative py-32 px-6 ebru-bg">
      {/* Section header */}
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16 reveal">
          <p className="font-inter text-[10px] tracking-[0.4em] uppercase text-turquoise/60 mb-4">
            Collection
          </p>
          <h2
            className="font-cormorant font-light text-gold-light"
            style={{ fontSize: "clamp(2.5rem,6vw,5rem)", letterSpacing: "0.06em" }}
          >
            Gallery
          </h2>
          <div className="w-16 gold-divider mx-auto mt-6 opacity-60" />
          <p className="font-inter text-[12px] text-white/30 tracking-wider mt-6 max-w-md mx-auto leading-relaxed">
            Each token carries the unique colors and patterns of ebru art.
            No two are ever alike.
          </p>
        </div>

        {/* Grid */}
        <div
          className="grid gap-4 reveal"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          }}
        >
          {CARD_PALETTES.map((p, i) => (
            <NFTCard key={i} index={i} p={p} />
          ))}
        </div>

        {/* View all CTA */}
        <div className="text-center mt-16 reveal">
          <button className="btn-outline">
            View Full Collection
          </button>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="gold-divider opacity-30 mt-24" />
    </section>
  );
}
