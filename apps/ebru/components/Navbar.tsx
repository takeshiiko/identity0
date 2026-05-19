"use client";

import { useEffect, useState } from "react";

const links = [
  { label: "Mint", href: "#mint" },
  { label: "Gallery", href: "#gallery" },
  { label: "Ebru", href: "#about" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 transition-all duration-500"
      style={{
        background: scrolled
          ? "rgba(5,5,5,0.88)"
          : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(201,168,76,0.12)" : "none",
      }}
    >
      <nav className="max-w-7xl mx-auto px-6 md:px-10 flex items-center justify-between h-16 md:h-20">
        {/* Logo — geometric medallion */}
        <a href="#top" aria-label="Back to top" className="flex items-center select-none opacity-80 hover:opacity-100 transition-opacity duration-300">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="16" cy="16" r="15" stroke="rgba(201,168,76,0.55)" strokeWidth="0.7" />
            <circle cx="16" cy="16" r="10" stroke="rgba(201,168,76,0.35)" strokeWidth="0.6" />
            <circle cx="16" cy="16" r="5"  stroke="rgba(46,196,182,0.4)"  strokeWidth="0.6" />
            <circle cx="16" cy="16" r="1.5" fill="rgba(201,168,76,0.7)" />
            <line x1="16" y1="1"  x2="16" y2="31" stroke="rgba(201,168,76,0.2)" strokeWidth="0.5" />
            <line x1="1"  y1="16" x2="31" y2="16" stroke="rgba(201,168,76,0.2)" strokeWidth="0.5" />
            <polygon points="16,5 27,16 16,27 5,16" stroke="rgba(201,168,76,0.25)" strokeWidth="0.5" fill="none" />
          </svg>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-10">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-xs tracking-[0.2em] uppercase text-white/50 hover:text-gold transition-colors duration-300 font-inter"
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Connect Wallet — desktop */}
        <div className="hidden md:block">
          <button className="btn-outline text-xs py-2.5 px-5">
            Connect Wallet
          </button>
        </div>

        {/* Hamburger — mobile */}
        <button
          className="md:hidden flex flex-col gap-[5px] p-2"
          onClick={() => setOpen(!open)}
          aria-label="Menü"
        >
          <span
            className="block w-6 h-px bg-gold/70 transition-all duration-300"
            style={{ transform: open ? "rotate(45deg) translate(4px,4px)" : undefined }}
          />
          <span
            className="block w-4 h-px bg-gold/70 transition-all duration-300 self-end"
            style={{ opacity: open ? 0 : 1 }}
          />
          <span
            className="block w-6 h-px bg-gold/70 transition-all duration-300"
            style={{ transform: open ? "rotate(-45deg) translate(4px,-4px)" : undefined }}
          />
        </button>
      </nav>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-ebru-bg/95 backdrop-blur-lg border-t border-gold/10">
          <div className="flex flex-col items-center gap-6 py-8">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm tracking-[0.25em] uppercase text-white/60 hover:text-gold transition-colors font-inter"
              >
                {l.label}
              </a>
            ))}
            <button className="btn-outline text-xs py-2.5 px-6 mt-2">
              Connect Wallet
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
