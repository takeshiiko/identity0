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

  const maxQty = Math.max(1, maxPerWallet - minted);
  const [qty, setQty] = useState(1);
  const effectiveQty = isConnected ? Math.min(qty, maxQty) : qty;
  const totalEth = (parseFloat(priceEth) * effectiveQty).toFixed(5);

  if (phase === "done" && tokenId) {
    return (
      <div className="mintBox">
        <span>Mint</span>
        <div className="mintBoxDone">
          <strong>Portrait #{tokenId} minted!</strong>
          <span>Generation queued — portrait arrives in ~2 min.</span>
          <button type="button" className="mintAgainBtn" onClick={reset}>Mint another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mintBox">
      <span>Mint</span>
      <div className="mintBoxInner">

        {/* Quantity */}
        <div className="qtyRow">
          <span className="qtyLabel">Quantity</span>
          <div className="qtyStepper">
            <button type="button" onClick={() => setQty(q => Math.max(1, q - 1))} disabled={qty <= 1}>−</button>
            <strong>{effectiveQty}</strong>
            <button type="button" onClick={() => setQty(q => Math.min(3, q + 1))} disabled={qty >= 3}>+</button>
          </div>
          {isConnected && <span className="qtyMax">{minted} / {maxPerWallet} minted</span>}
        </div>

        {/* Price */}
        <div className="mintInfoRow">
          <span>0.00065 ETH × {effectiveQty}</span>
          <strong>{totalEth} ETH</strong>
        </div>

        {/* Supply */}
        <div className="mintInfoRow mintInfoRowMuted">
          <span>Remaining</span>
          <span>{remaining !== null ? remaining.toLocaleString() : "3,333"} / {maxSupply.toLocaleString()}</span>
        </div>

        {/* Mint button */}
        {!isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <button type="button" className="mintActionBtn" onClick={openConnectModal}>
                Connect &amp; Mint
                <span className="btnArrow">►</span>
              </button>
            )}
          </ConnectButton.Custom>
        ) : isWrongChain ? (
          <ConnectButton.Custom>
            {({ openChainModal }) => (
              <button type="button" className="mintActionBtn" onClick={openChainModal}>
                Switch to Ethereum
                <span className="btnArrow">►</span>
              </button>
            )}
          </ConnectButton.Custom>
        ) : (
          <button
            type="button"
            className="mintActionBtn"
            onClick={() => phase === "error" ? reset() : mint(effectiveQty)}
            disabled={!canMint && phase !== "error"}
          >
            {phase === "idle" ? "Mint Identity" : MINT_PHASE_LABEL[phase]}
            <span className="btnArrow">►</span>
          </button>
        )}

        {errorMsg && <p className="mintError">{errorMsg}</p>}

        {isConnected && (soldOut || walletFull || paused) && (
          <small className="mintBoxNote">
            {soldOut ? "Sold out." : walletFull ? `Wallet limit reached (${maxPerWallet}/${maxPerWallet}).` : "Minting paused."}
          </small>
        )}
      </div>
    </div>
  );
}
