"use client";

import { useEffect, useRef } from "react";

/* Decorative SVG motif — minimal Turkish geometric pattern */
function GeometricAccent({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="60" cy="60" r="58" stroke="rgba(201,168,76,0.18)" strokeWidth="0.5" />
      <circle cx="60" cy="60" r="44" stroke="rgba(201,168,76,0.12)" strokeWidth="0.5" />
      <circle cx="60" cy="60" r="28" stroke="rgba(46,196,182,0.14)" strokeWidth="0.5" />
      <line x1="60" y1="2" x2="60" y2="118" stroke="rgba(201,168,76,0.1)" strokeWidth="0.5" />
      <line x1="2" y1="60" x2="118" y2="60" stroke="rgba(201,168,76,0.1)" strokeWidth="0.5" />
      <line x1="19" y1="19" x2="101" y2="101" stroke="rgba(46,196,182,0.08)" strokeWidth="0.5" />
      <line x1="101" y1="19" x2="19" y2="101" stroke="rgba(46,196,182,0.08)" strokeWidth="0.5" />
      <polygon
        points="60,16 104,60 60,104 16,60"
        stroke="rgba(201,168,76,0.15)"
        strokeWidth="0.5"
        fill="none"
      />
    </svg>
  );
}

export default function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  /* Subtle parallax on mouse move */
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 18;
      const y = (e.clientY / innerHeight - 0.5) * 12;
      if (titleRef.current) {
        titleRef.current.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
      }
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  return (
    <section className="ebru-bg relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* ── Background video — horizontal, full cover ── */}
      <video
        aria-hidden
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: "cover", objectPosition: "center center", opacity: 0.18 }}
      >
        <source src="/video/ebru-bg-loop.mp4" type="video/mp4" />
      </video>

      {/* ── Dark vignette over video to keep text readable ── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 20%, rgba(5,5,5,0.55) 70%, rgba(5,5,5,0.85) 100%)",
        }}
      />

      {/* ── Ebru color tint overlay (gold/turquoise hue) ── */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 55% at 50% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)",
        }}
      />

      {/* ── Corner geometric accents ── */}
      <GeometricAccent className="absolute top-20 left-8 md:left-16 opacity-50 animate-[float_8s_ease-in-out_infinite]" />
      <GeometricAccent className="absolute bottom-16 right-8 md:right-16 opacity-40 animate-[float_10s_ease-in-out_infinite_reverse]" />

      {/* ── Top gold line ── */}
      <div className="absolute top-0 left-0 right-0 h-px gold-divider opacity-60" />

      {/* ── Content ── */}
      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-5xl mx-auto">

        {/* Eyebrow */}
        <p className="font-inter text-[10px] tracking-[0.45em] uppercase text-turquoise/70 mb-8 animate-[fadeIn_1s_ease-out_0.2s_both]">
          Ethereum Special Edition
        </p>

        {/* ── Main title ── */}
        <div
          ref={titleRef}
          className="transition-transform duration-75 ease-out mb-6"
        >
          <h1
            className="font-cormorant font-light select-none"
            style={{
              fontSize: "clamp(5rem, 18vw, 16rem)",
              lineHeight: 0.9,
              letterSpacing: "0.06em",
              background: "linear-gradient(160deg, #8b6914 0%, #c9a84c 30%, #e8cc7a 55%, #c9a84c 75%, #8b6914 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              animationFillMode: "both",
            }}
          >
            EBRU
          </h1>
        </div>

        {/* Subtitle in Turkish italic */}
        <p
          className="font-cormorant italic text-white/40 mb-3 animate-[fadeUp_1s_ease-out_0.5s_both]"
          style={{ fontSize: "clamp(1rem, 2.5vw, 1.5rem)", letterSpacing: "0.08em" }}
        >
          The Digital Touch of Turkish Marbling Art
        </p>

        {/* Thin gold divider */}
        <div className="w-24 gold-divider my-8 opacity-70 animate-[fadeIn_1s_ease-out_0.7s_both]" />

        {/* Description */}
        <p
          className="font-inter font-light text-white/40 max-w-md leading-relaxed mb-12 animate-[fadeUp_1s_ease-out_0.8s_both]"
          style={{ fontSize: "0.82rem", letterSpacing: "0.03em" }}
        >
          Born from 500 years of Ottoman ebru art,
          a special collection living on the Ethereum blockchain.
          Every token is an unrepeatable marbling moment.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 animate-[fadeUp_1s_ease-out_1s_both]">
          <a href="#mint">
            <button className="btn-mint">Mint Now</button>
          </a>
          <a href="#about">
            <button className="btn-outline">About Ebru</button>
          </a>
        </div>

        {/* Stats row */}
        <div className="flex flex-wrap gap-10 justify-center mt-20 animate-[fadeIn_1s_ease-out_1.2s_both]">
          {[
            { label: "Total Supply", value: "TBD" },
            { label: "Network", value: "Ethereum" },
            { label: "Standard", value: "ERC-721" },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-1">
              <span className="font-cormorant text-gold text-2xl tracking-wide">{s.value}</span>
              <span className="font-inter text-[10px] tracking-[0.2em] uppercase text-white/30">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Scroll indicator ── */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-[fadeIn_1s_ease-out_1.5s_both]">
        <span className="font-inter text-[9px] tracking-[0.3em] uppercase text-white/25">Explore</span>
        <div className="w-px h-12 bg-gradient-to-b from-gold/40 to-transparent animate-[float_2s_ease-in-out_infinite]" />
      </div>

      {/* ── Bottom gold line ── */}
      <div className="absolute bottom-0 left-0 right-0 h-px gold-divider opacity-40" />
    </section>
  );
}
