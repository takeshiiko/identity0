import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Who is Kandinsky? — Kandinsky NFT",
  description: "Wassily Kandinsky — pioneer of abstract art, Bauhaus master, and the inspiration behind Kandinsky NFT.",
};

export default function KandinskyPage() {
  return (
    <main className="kandinskyPage">
      <nav className="kandinskyTopbar">
        <Link className="mark" href="/">
          <img src="/logo.png" alt="Kandinsky" className="markLogo" />
          <strong>Kandinsky</strong>
        </Link>
        <Link className="kandinskyBack" href="/">← Back</Link>
      </nav>

      <header className="kandinskyHero">
        <div className="kandinskyHeroText">
          <p className="kandinskyEyebrow">1866 — 1944</p>
          <h1>Wassily<br />Kandinsky</h1>
          <p className="kandinskyLead">
            The painter who proved that color and geometry could speak without words — and that abstraction is not the absence of meaning, but its purest form.
          </p>
        </div>
        <div className="kandinskyHeroArt">
          <CompositionVIII />
        </div>
      </header>

      <section className="kandinskyBio">
        <div className="kandinskyBioGrid">
          <article>
            <h2>The Pioneer</h2>
            <p>
              Born in Moscow in 1866, Wassily Kandinsky abandoned a promising legal career at 30 to pursue painting in Munich. He went on to become one of the most influential artists of the 20th century — widely credited as the creator of the first purely abstract works in Western art history.
            </p>
            <p>
              Kandinsky experienced synesthesia: he saw colors when he heard music and heard sounds when he painted. This neurological gift became his artistic philosophy — that visual art, like music, could evoke emotion purely through form, color, and composition, independent of any reference to the physical world.
            </p>
          </article>
          <article>
            <h2>The Bauhaus Years</h2>
            <p>
              From 1922 to 1933, Kandinsky taught at the Bauhaus — the legendary German school that fused fine art, craft, and industrial design. There he developed his most systematic theories: the triangle, circle, and square each corresponded to a primary color (yellow, blue, red); every form carried an emotional temperature.
            </p>
            <p>
              His Bauhaus works — precise geometric compositions layered with organic tension — are the direct visual ancestors of this collection. When a Kandinsky portrait is generated from your wallet, it follows the same logic: form derived from data, color from behavior, composition from identity.
            </p>
          </article>
          <article>
            <h2>The Legacy</h2>
            <p>
              Kandinsky published <em>Concerning the Spiritual in Art</em> in 1911 — a manifesto arguing that art must transcend mere representation and reach for inner necessity. The work influenced every major abstract movement that followed: Abstract Expressionism, Minimalism, Color Field painting.
            </p>
            <p>
              He died in Neuilly-sur-Seine in 1944, leaving behind over 700 paintings and a theory of visual language that remains as radical today as it was a century ago. His core conviction — that your inner world has a unique visual signature — is exactly what drives this project.
            </p>
          </article>
        </div>
      </section>

      <section className="kandinskyGallery">
        <h2>Works</h2>
        <p className="kandinskyGalleryNote">Selected paintings from the Bauhaus and Munich periods.</p>
        <div className="kandinskyGalleryGrid">
          <figure>
            <img src="/kandinsky-several-circles.jpg" alt="Several Circles" loading="lazy" />
            <figcaption>
              <strong>Several Circles</strong>
              <span>1926 · Oil on canvas</span>
            </figcaption>
          </figure>
          <figure>
            <img src="/kandinsky-yellow-red-blue.jpg" alt="Yellow-Red-Blue" loading="lazy" />
            <figcaption>
              <strong>Yellow-Red-Blue</strong>
              <span>1925 · Oil on canvas</span>
            </figcaption>
          </figure>
          <figure>
            <img src="/kandinsky-on-white-ii.webp" alt="On White II" loading="lazy" />
            <figcaption>
              <strong>On White II</strong>
              <span>1923 · Oil on canvas</span>
            </figcaption>
          </figure>
          <figure>
            <img src="/kandinsky-accent-in-pink.jpg" alt="Accent in Pink" loading="lazy" />
            <figcaption>
              <strong>Accent in Pink</strong>
              <span>1926 · Oil on canvas</span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="kandinskyQuote">
        <blockquote>
          "Color is a power which directly influences the soul. Color is the keyboard, the eyes are the hammers, the soul is the piano with many strings."
        </blockquote>
        <cite>— Wassily Kandinsky, Concerning the Spiritual in Art, 1911</cite>
      </section>

      <section className="kandinskyConnection">
        <div className="kandinskyConnectionInner">
          <h2>Why Kandinsky?</h2>
          <p>
            Every wallet has a history — transactions, positions, behaviors, patterns accumulated over time. Kandinsky believed that every inner experience has a unique visual form. We build the bridge: your on-chain identity, scored across seven dimensions, becomes the formal parameters of a Bauhaus composition — and an AI renders it as a portrait in Kandinsky's spirit.
          </p>
          <p>
            No two wallets are the same. No two portraits are the same. Your art.
          </p>
          <Link href="/#generator" className="kandinskyMintLink">Mint your portrait →</Link>
        </div>
      </section>

      <footer className="kandinskyFooter">
        <span>© 2026 Kandinsky NFT</span>
        <Link href="/">kandisky.art</Link>
      </footer>
    </main>
  );
}

function CompositionVIII() {
  return (
    <svg viewBox="0 0 600 500" xmlns="http://www.w3.org/2000/svg" aria-label="Composition VIII interpretation">
      <rect width="600" height="500" fill="#efe4cf" />
      <circle cx="420" cy="130" r="110" fill="none" stroke="#14130f" strokeWidth="2.5" />
      <circle cx="420" cy="130" r="78" fill="none" stroke="#356f95" strokeWidth="1.5" />
      <circle cx="420" cy="130" r="48" fill="#356f95" opacity="0.22" />
      <line x1="60" y1="60" x2="540" y2="60" stroke="#14130f" strokeWidth="3" />
      <line x1="60" y1="80" x2="540" y2="80" stroke="#14130f" strokeWidth="1" />
      <polygon points="80,120 180,240 80,360" fill="#cda846" opacity="0.72" />
      <polygon points="80,120 180,240 200,120" fill="#d44f36" opacity="0.58" />
      <rect x="200" y="200" width="140" height="140" fill="none" stroke="#14130f" strokeWidth="2" transform="rotate(22 270 270)" />
      <rect x="215" y="215" width="110" height="110" fill="#14130f" opacity="0.08" transform="rotate(22 270 270)" />
      <line x1="300" y1="60" x2="60" y2="440" stroke="#14130f" strokeWidth="1.5" />
      <line x1="380" y1="60" x2="140" y2="440" stroke="#14130f" strokeWidth="0.8" opacity="0.5" />
      <line x1="460" y1="60" x2="220" y2="440" stroke="#14130f" strokeWidth="0.8" opacity="0.3" />
      <circle cx="160" cy="380" r="36" fill="#d44f36" opacity="0.68" />
      <circle cx="160" cy="380" r="20" fill="#cda846" opacity="0.9" />
      <circle cx="160" cy="380" r="8" fill="#14130f" />
      <polygon points="470,280 560,420 380,420" fill="none" stroke="#14130f" strokeWidth="2" />
      <polygon points="470,280 560,420 380,420" fill="#6d8f84" opacity="0.18" />
      <line x1="350" y1="300" x2="550" y2="160" stroke="#d44f36" strokeWidth="2.5" />
      <line x1="340" y1="320" x2="540" y2="180" stroke="#d44f36" strokeWidth="1" opacity="0.4" />
      <rect x="230" y="380" width="8" height="60" fill="#14130f" />
      <rect x="250" y="380" width="8" height="60" fill="#356f95" />
      <rect x="270" y="380" width="8" height="60" fill="#d44f36" />
      <rect x="290" y="380" width="8" height="60" fill="#cda846" />
      <rect x="310" y="380" width="8" height="60" fill="#14130f" opacity="0.4" />
    </svg>
  );
}
