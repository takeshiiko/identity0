"use client";

import { useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMint, MINT_PHASE_LABEL } from "../hooks/useMint";

export function MintPanel() {
  const {
    isConnected, isWrongChain,
    priceEth, remaining, maxSupply, minted, maxPerWallet,
    soldOut, walletFull, paused,
    phase, tokenId, errorMsg, canMint,
    mint, reset
  } = useMint();

  const maxQty = Math.max(0, maxPerWallet - minted);
  const [qty, setQty] = useState(1);
  const effectiveQty = Math.min(qty, maxQty);
  const totalEth = (parseFloat(priceEth) * effectiveQty).toFixed(5);

  const statusSteps = [
    { label: "Wallet Connected", active: isConnected },
    { label: "Seed Generated",   active: isConnected },
    { label: "AI Composition",   active: ["queuing","done"].includes(phase) },
    { label: "Attribute Scoring",active: phase === "done" },
    { label: "Portrait Finalized",active: false }
  ];

  const statusLabel = (i: number) => {
    if (!isConnected && i >= 1) return "Pending";
    if (phase === "done" && i <= 3) return "Completed";
    if (["queuing","done"].includes(phase) && i === 2) return "In Progress";
    if (i <= 1 && isConnected) return "Completed";
    if (i === 2 && ["signing","confirming"].includes(phase)) return "In Progress";
    return i === 0 ? (isConnected ? "Completed" : "Pending") : "Queued";
  };

  return (
    <>
      {/* ── Mint box ── */}
      <div className="mintBox">
        <span>Mint</span>

        {!isConnected ? (
          <div className="mintBoxInner">
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button type="button" className="connectInlineBtn" onClick={openConnectModal}>
                  Connect wallet to mint →
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        ) : isWrongChain ? (
          <div className="mintBoxInner">
            <ConnectButton.Custom>
              {({ openChainModal }) => (
                <button type="button" className="connectInlineBtn" onClick={openChainModal}>
                  Switch to Sepolia →
                </button>
              )}
            </ConnectButton.Custom>
          </div>
        ) : phase === "done" && tokenId ? (
          <div className="mintBoxDone">
            <strong>Portrait #{tokenId} minted!</strong>
            <span>Generation queued — portrait arrives in ~2 min.</span>
            <button type="button" className="mintAgainBtn" onClick={reset}>Mint another</button>
          </div>
        ) : (
          <div className="mintBoxInner">
            {/* Quantity selector */}
            <div className="qtyRow">
              <span className="qtyLabel">Quantity</span>
              <div className="qtyStepper">
                <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
                <strong>{effectiveQty}</strong>
                <button type="button" onClick={() => setQty(q => Math.min(maxQty, q + 1))} disabled={qty >= maxQty}>+</button>
              </div>
              <span className="qtyMax">{minted} / {maxPerWallet} minted</span>
            </div>

            {/* Price row */}
            <div className="mintInfoRow">
              <span>{priceEth} ETH × {effectiveQty}</span>
              <strong>{totalEth} ETH</strong>
            </div>

            {/* Supply row */}
            <div className="mintInfoRow mintInfoRowMuted">
              <span>Remaining</span>
              <span>{remaining !== null ? remaining.toLocaleString() : "—"} / {maxSupply.toLocaleString()}</span>
            </div>

            {/* Mint button */}
            <button
              type="button"
              className="mintActionBtn"
              onClick={() => phase === "error" ? reset() : mint(effectiveQty)}
              disabled={!canMint && phase !== "error"}
            >
              {phase === "idle" ? "Mint Identity" : MINT_PHASE_LABEL[phase]}
              <span className="btnArrow">►</span>
            </button>

            {errorMsg && <p className="mintError">{errorMsg}</p>}
          </div>
        )}

        {(soldOut || walletFull || paused) && !["done"].includes(phase) && (
          <small className="mintBoxNote">
            {soldOut ? "Sold out." : walletFull ? `Wallet limit reached (${maxPerWallet}/${maxPerWallet}).` : "Minting paused."}
          </small>
        )}
      </div>

      {/* ── Generation status ── */}
      <div className="statusPanel">
        <h2>Generation status</h2>
        {statusSteps.map(({ label, active }, i) => (
          <div className={active ? "statusLine active" : "statusLine"} key={label}>
            <i />
            <span>{label}</span>
            <b />
            <small>{statusLabel(i)}</small>
          </div>
        ))}
      </div>
    </>
  );
}
