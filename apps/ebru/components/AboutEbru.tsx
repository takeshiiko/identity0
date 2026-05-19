"use client";

import { useEffect, useRef } from "react";

const FACTS = [
  {
    num: "XVI",
    label: "Century",
    desc: "Ebru art blossomed in Anatolia during the Ottoman era and reached perfection in the palace workshops.",
  },
  {
    num: "500+",
    label: "Years",
    desc: "Passed from artist to artist for over five centuries, this tradition is now on UNESCO's Cultural Heritage of Humanity List.",
  },
  {
    num: "∞",
    label: "Repetitions",
    desc: "No two ebru works are ever alike. Every mark left on water is unique and eternal.",
  },
];

function EbruIllustration() {
  return (
    <div className="relative" style={{ width: 420, maxWidth: "100%", aspectRatio: "1 / 1" }}>
      {/* Photo */}
      <img
        src="/ebru-art.jpg"
        alt="Turkish Ebru marbling art"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "center",
          display: "block",
        }}
      />

      {/* Subtle gold border */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ border: "1px solid rgba(201,168,76,0.25)" }}
      />

      {/* Corner ornaments */}
      {[
        "top-3 left-3",
        "top-3 right-3 rotate-90",
        "bottom-3 right-3 rotate-180",
        "bottom-3 left-3 -rotate-90",
      ].map((pos, i) => (
        <div key={i} className={`absolute ${pos}`}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M0 20 L0 0 L20 0" stroke="rgba(201,168,76,0.5)" strokeWidth="1" fill="none" />
          </svg>
        </div>
      ))}
    </div>
  );
}

export default function AboutEbru() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = sectionRef.current?.querySelectorAll(".reveal") ?? [];
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("visible")),
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <section id="about" ref={sectionRef} className="relative py-32 px-6 ebru-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-20 reveal">
          <p className="font-inter text-[10px] tracking-[0.4em] uppercase text-turquoise/60 mb-4">
            Origins of the Art
          </p>
          <h2
            className="font-cormorant font-light text-gold-light"
            style={{ fontSize: "clamp(2.5rem,6vw,5rem)", letterSpacing: "0.06em" }}
          >
            What is Ebru?
          </h2>
          <div className="w-16 gold-divider mx-auto mt-6 opacity-60" />
        </div>

        {/* Two-column layout */}
        <div className="grid md:grid-cols-2 gap-16 items-center mb-24">
          {/* Text column */}
          <div className="reveal space-y-6">
            <p
              className="font-cormorant italic text-white/60 leading-relaxed"
              style={{ fontSize: "clamp(1.1rem, 2vw, 1.35rem)" }}
            >
              &ldquo;Pigments dancing on water forge a dialogue that transcends time —
              between the artist and nature, between the past and the future.&rdquo;
            </p>

            <div className="gold-divider w-20 opacity-40" />

            <p className="font-inter font-light text-white/40 leading-loose text-sm">
              Ebru, also known as Turkish paper marbling, is a water art with roots stretching
              back to Central Asia. Reaching its peak in 16th-century Anatolia, the artist drops
              natural pigments onto a surface of water mixed with ox bile.
            </p>

            <p className="font-inter font-light text-white/35 leading-loose text-sm">
              Using fine sticks and combs, the pigments are coaxed into motion — forming
              fluid, unrepeatable patterns like veils of silk. When paper is laid on the surface
              and lifted, that single moment is fixed forever.
            </p>

            <p className="font-inter font-light text-white/35 leading-loose text-sm">
              This collection carries the tangible elegance of ebru into the immutable records
              of the chain. Each NFT dedicates its own colorful instant to the permanent memory
              of Ethereum.
            </p>

            {/* UNESCO badge */}
            <div className="inline-flex items-center gap-3 border border-gold/15 px-4 py-3 rounded-sm mt-2">
              <span className="font-cormorant text-gold/60 text-xl">✦</span>
              <div>
                <p className="font-inter text-[10px] tracking-[0.2em] uppercase text-white/40">UNESCO</p>
                <p className="font-inter text-[11px] text-gold/50 mt-0.5">Cultural Heritage of Humanity</p>
              </div>
            </div>
          </div>

          {/* Illustration column */}
          <div className="reveal flex justify-center md:justify-end">
            <EbruIllustration />
          </div>
        </div>

        {/* Fact cards */}
        <div className="grid md:grid-cols-3 gap-6 reveal">
          {FACTS.map((f) => (
            <div
              key={f.num}
              className="border border-gold/12 p-8 hover:border-gold/28 transition-all duration-400 group"
              style={{ background: "rgba(10,10,10,0.7)" }}
            >
              <div className="font-cormorant text-4xl text-gold/70 mb-1 group-hover:text-gold transition-colors duration-400">
                {f.num}
              </div>
              <div className="font-inter text-[10px] tracking-[0.25em] uppercase text-turquoise/50 mb-4">
                {f.label}
              </div>
              <p className="font-inter text-[12px] text-white/35 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom divider */}
      <div className="gold-divider opacity-30 mt-24" />
    </section>
  );
}
