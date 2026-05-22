"use client";

import { useState } from "react";
import { NavWallet } from "../components/NavWallet";
import { CollectionGallery } from "../components/CollectionGallery";
import { HeroPortrait } from "../components/HeroPortrait";
import { BurnCounter } from "../components/BurnCounter";

// Score labels match actual WalletScores keys (age, tx, defi, nft, risk, multichain, wealth)
// Values are illustrative — real values are derived per wallet at mint time
const scoreRows = [
  ["Wallet Age",       72, "#356f95"],
  ["Transactions",     58, "#d44f36"],
  ["DeFi Activity",    84, "#cda846"],
  ["NFT Holdings",     46, "#6d8f84"],
  ["Risk Profile",     61, "#14130f"],
  ["Multi-chain",      40, "#8e7294"],
  ["Portfolio Wealth", 68, "#2f7188"]
] as const;

const pipeline = [
  ["1. Connect", "Connect any EVM-compatible wallet — MetaMask, Coinbase, WalletConnect and more."],
  ["2. Analyze", "Your wallet's on-chain history is analyzed across seven dimensions: age, transactions, DeFi activity, NFT holdings, risk profile, multi-chain presence and portfolio wealth."],
  ["3. Compose", "A deterministic Bauhaus composition is generated from your scores — face archetype, palette, expression and rare items are all derived from your identity."],
  ["4. Render", "An AI model stylizes your composition into a final portrait using your wallet's unique parameters. No two wallets produce the same result."],
  ["5. Mint & Reveal", "Your portrait is minted on-chain and revealed automatically within 2–3 minutes. Rarity tier is determined by your composite score."]
] as const;

// Categories match geometry-engine composition layers
const attributes = [
  ["Face Archetype", 7],
  ["Eyes",           6],
  ["Nose",           5],
  ["Mouth",          5],
  ["Hair",           8],
  ["Clothing",       5],
  ["Rare Items",     7]
] as const;

// Ranges match RARITY_RULES in @identity0/shared
const rarityRows = [
  ["Common",    "0 – 40",   "circle"],
  ["Uncommon",  "41 – 65",  "square"],
  ["Rare",      "66 – 80",  "triangle"],
  ["Epic",      "81 – 92",  "diamond"],
  ["Legendary", "93 – 100", "hexagon"]
] as const;


export default function Page() {
  const [selected, setSelected] = useState("Epic");

  return (
    <main>
      <section className="posterHero">
        <nav className="topbar">
          <a className="mark" href="#" aria-label="Kandinsky home">
            <img src="/logo.png" alt="Kandinsky" className="markLogo" />
            <strong>Kandinsky</strong>
          </a>
          <nav className="navLinks">
            <a href="/kandinsky">Who is Kandinsky?</a>
          </nav>
          <NavWallet />
        </nav>

        <div className="heroBody" id="generator">
          <section className="controlPanel">
            <h1>Your wallet.<br />Your art.</h1>
            <p>
              Your wallet's on-chain history — transactions, DeFi positions, NFT holdings, age — is scored across seven dimensions and translated into a Bauhaus AI portrait. Your identity, rendered in art.
            </p>

            <BurnCounter />

            <a href="https://dervisheth.art" target="_blank" rel="noopener noreferrer" className="burnCta">
              <span className="burnCtaText">Want a spot in the Dervish collection? Burn yours.</span>
              <span className="burnCtaArrow">→</span>
            </a>

            <div className="scorePanel">
              <h2>Seven-dimension score</h2>
              {scoreRows.map(([label, value, color]) => (
                <div className="scoreLine" key={label}>
                  <i style={{ background: color }} />
                  <span>{label}</span>
                  <b><em style={{ inlineSize: `${value}%`, background: color }} /></b>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </section>

          <HeroPortrait />
        </div>
      </section>

      <section className="pipelineSection">
        <h2>Wallet-to-art pipeline</h2>
        <div className="pipeline">
          {pipeline.map(([title, body], index) => (
            <article key={title}>
              <PipelineIcon index={index} />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="systemSplit" id="rarity">
        <article className="attributePanel">
          <h2>Attribute system</h2>
          <p>7 composition layers · deterministic per wallet</p>
          <div className="attributeBody">
            <div className="attributeList">
              {attributes.map(([name, count]) => (
                <div key={name}>
                  <span>{name}</span>
                  <strong>{count}</strong>
                </div>
              ))}
            </div>
            <AttributeGlyph />
          </div>
          <small>Traits combine through rules and weightings to produce one wallet-specific composition.</small>
        </article>

        <article className="rarityPanel">
          <h2>Rarity mapping</h2>
          <p>Rarity is multi-dimensional</p>
          <div className="rarityBody">
            <div className="rarityLegend">
              {rarityRows.map(([tier, range, shape]) => (
                <button className={selected === tier ? "selected" : ""} key={tier} onClick={() => setSelected(tier)} type="button">
                  <RarityShape shape={shape} />
                  <span>{tier}<small>{range}</small></span>
                </button>
              ))}
            </div>
            <RarityChart selected={selected} />
          </div>
          <small>Each portrait is mapped across seven dimensions to determine overall rarity and placement.</small>
        </article>
      </section>

      <section className="collectionSection" id="collection">
        <h2>The Kandinsky collection</h2>
        <p>A living gallery of on-chain identities <span className="galleryNote">(Your portrait will be revealed automatically — the AI render completes in 2–3 minutes.)</span></p>
        <CollectionGallery />
        <a className="collectionButton" href="https://opensea.io/collection/kandinsky-774051143" target="_blank" rel="noopener noreferrer">View on OpenSea</a>
      </section>

    </main>
  );
}

function MiniPortrait({ warm, cool, index }: { warm: string; cool: string; index: number }) {
  const flip = index % 2 === 1;
  const hair = index === 4 ? "#2d2b24" : "#15140f";

  return (
    <svg viewBox="0 0 360 450" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect width="360" height="450" fill="#efe4cf" />
      <rect x={flip ? 228 : 28} y="48" width="118" height="184" fill={warm} opacity="0.84" />
      <circle cx={flip ? 100 : 252} cy="92" r="62" fill="#cda846" opacity="0.28" />
      <path d={flip ? "M108 72 C198 12 318 82 292 214 C270 330 128 346 82 232 C50 156 58 105 108 72 Z" : "M76 72 C168 12 288 82 262 214 C240 330 98 346 52 232 C20 156 26 105 76 72 Z"} fill={hair} />
      <path d={flip ? "M102 94 C188 40 292 88 276 212 C258 326 128 336 86 230 C58 162 58 122 102 94 Z" : "M72 94 C158 40 262 88 246 212 C228 326 98 336 56 230 C28 162 28 122 72 94 Z"} fill="#f1e5d4" />
      <polygon points={flip ? "180,86 282,140 252,292 180,342" : "154,86 256,140 224,292 154,342"} fill="#e0be42" opacity="0.88" />
      <rect x={flip ? 100 : 74} y="250" width="188" height="64" fill={cool} opacity="0.92" />
      <path d={flip ? "M88 166 Q142 132 198 166" : "M58 166 Q114 132 170 166"} fill="none" stroke="#15140f" strokeWidth="11" strokeLinecap="round" />
      <path d={flip ? "M194 166 Q246 134 294 166" : "M166 166 Q218 134 266 166"} fill="none" stroke="#15140f" strokeWidth="11" strokeLinecap="round" />
      <polygon points={flip ? "170,154 208,260 138,252" : "144,154 182,260 112,252"} fill="#a85d69" opacity="0.72" />
      <path d={flip ? "M122 296 C162 272 204 292 232 304 C188 328 154 328 122 296 Z" : "M92 296 C132 272 174 292 202 304 C158 328 124 328 92 296 Z"} fill={warm} />
      <rect x={flip ? 126 : 104} y="326" width="102" height="92" fill="#6d8f84" />
      <polygon points={flip ? "228,350 338,428 228,428" : "206,350 334,428 206,428"} fill="#c98968" opacity="0.88" />
      <circle cx={flip ? 258 : 88} cy="266" r="19" fill="#cda846" opacity={index > 1 ? "0.95" : "0.48"} />
      <circle cx={flip ? 258 : 88} cy="266" r="34" fill="none" stroke={warm} strokeWidth="5" opacity={index > 0 ? "0.5" : "0"} />
    </svg>
  );
}

function EthereumIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 5 13l7 4 7-4-7-11Z" fill="#14130f" />
      <path d="m5 14 7 8 7-8-7 4-7-4Z" fill="#14130f" opacity="0.72" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="8" y="8" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M6 15H4V4h11v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PipelineIcon({ index }: { index: number }) {
  const colors = ["#14130f", "#cda846", "#356f95", "#d44f36", "#6d8f84"];
  return (
    <svg viewBox="0 0 86 66" aria-hidden="true">
      <rect x="10" y="14" width="46" height="36" fill={colors[index]} opacity="0.92" />
      <circle cx="60" cy="34" r="14" fill="#efe4cf" stroke="#14130f" strokeWidth="1.5" />
      <path d="M18 46h42" stroke="#14130f" strokeWidth="2" />
    </svg>
  );
}

function AttributeGlyph() {
  return (
    <svg viewBox="0 0 220 180" aria-hidden="true">
      <circle cx="104" cy="88" r="58" fill="none" stroke="#14130f" />
      <path d="M104 30 A58 58 0 0 1 162 88 L104 88Z" fill="#d44f36" />
      <path d="M104 88 162 88 104 146Z" fill="#cda846" />
      <path d="M104 30 104 146 58 120Z" fill="#efe4cf" stroke="#14130f" />
      <rect x="124" y="8" width="54" height="54" fill="#14130f" />
      <rect x="150" y="118" width="18" height="48" fill="#356f95" />
      <line x1="12" y1="88" x2="210" y2="88" stroke="#14130f" />
      <line x1="104" y1="0" x2="104" y2="180" stroke="#14130f" />
    </svg>
  );
}

function RarityShape({ shape }: { shape: string }) {
  if (shape === "triangle") return <i className="shape triangle" />;
  if (shape === "diamond") return <i className="shape diamond" />;
  if (shape === "hexagon") return <i className="shape hexagon" />;
  if (shape === "square") return <i className="shape square" />;
  return <i className="shape circle" />;
}

function RarityChart({ selected }: { selected: string }) {
  // X axis = Rarity Potential midpoint of each tier range (0-40 / 41-65 / 66-80 / 81-92 / 93-100)
  const activeX = selected === "Legendary" ? 96 : selected === "Epic" ? 86 : selected === "Rare" ? 73 : selected === "Uncommon" ? 53 : 20;
  const activeY = selected === "Legendary" ? 26 : selected === "Epic" ? 40 : selected === "Rare" ? 56 : selected === "Uncommon" ? 72 : 88;

  return (
    <svg viewBox="0 0 300 210" aria-hidden="true">
      <defs>
        <radialGradient id="heat" cx="66%" cy="36%" r="58%">
          <stop offset="0%" stopColor="#d44f36" stopOpacity="0.7" />
          <stop offset="45%" stopColor="#cda846" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#356f95" stopOpacity="0.24" />
        </radialGradient>
      </defs>
      <rect width="300" height="210" fill="transparent" />
      <circle cx="185" cy="85" r="84" fill="url(#heat)" />
      <line x1="34" y1="156" x2="276" y2="156" stroke="#14130f" />
      <line x1="60" y1="24" x2="60" y2="180" stroke="#14130f" />
      <line x1="60" y1="92" x2="276" y2="92" stroke="#14130f" opacity="0.28" />
      <circle cx={(activeX / 100) * 220 + 60} cy={(activeY / 100) * 150 + 18} r="10" fill="#d44f36" stroke="#efe4cf" strokeWidth="5" />
      <text x="142" y="198" fontSize="12" fill="#14130f">Rarity Potential</text>
      <text x="10" y="98" fontSize="12" fill="#14130f" transform="rotate(-90 10 98)">Uniqueness</text>
    </svg>
  );
}
