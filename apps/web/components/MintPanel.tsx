"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMint, MINT_PHASE_LABEL } from "../hooks/useMint";

export function MintPanel() {
  const {
    address, isConnected, isWrongChain,
    priceEth, remaining, maxSupply, minted, maxPerWallet,
    soldOut, walletFull, paused,
    phase, tokenId, errorMsg, canMint,
    mint, reset
  } = useMint();

  const statusSteps = [
    { label: "Wallet Connected", state: isConnected ? "Completed" : "Pending", active: isConnected },
    { label: "Seed Generated", state: isConnected ? "Completed" : "Pending", active: isConnected },
    { label: "AI Composition", state: ["queuing", "done"].includes(phase) ? "In Progress" : "Queued", active: ["queuing", "done"].includes(phase) },
    { label: "Attribute Scoring", state: phase === "done" ? "In Progress" : "Queued", active: phase === "done" },
    { label: "Portrait Finalized", state: "Queued", active: false }
  ];

  return (
    <>
      <div className="walletBox">
        <span>Wallet</span>
        <div className="walletRow">
          {isConnected ? (
            <>
              <EthIcon />
              <strong>{address!.slice(0, 6)}...{address!.slice(-4)}</strong>
              <span className="walletMeta">{minted} / {maxPerWallet} minted</span>
            </>
          ) : (
            <ConnectButton.Custom>
              {({ openConnectModal }) => (
                <button type="button" className="connectInlineBtn" onClick={openConnectModal}>
                  Connect Wallet →
                </button>
              )}
            </ConnectButton.Custom>
          )}
        </div>
        <small>
          {soldOut
            ? `Sold out — ${maxSupply.toLocaleString()} / ${maxSupply.toLocaleString()} minted.`
            : walletFull
            ? `Wallet limit reached (${maxPerWallet} / ${maxPerWallet}).`
            : paused
            ? "Minting is currently paused."
            : isConnected
            ? `${priceEth} ETH per mint · ${remaining !== null ? remaining.toLocaleString() : "—"} / ${maxSupply.toLocaleString()} remaining`
            : "Connect any Web3 wallet. Your address deterministically generates your portrait."}
        </small>
      </div>

      <div className="statusPanel">
        <h2>Generation status</h2>
        {statusSteps.map(({ label, state, active }) => (
          <div className={active ? "statusLine active" : "statusLine"} key={label}>
            <i />
            <span>{label}</span>
            <b />
            <small>{state}</small>
          </div>
        ))}
      </div>

      <div className="heroActions">
        {phase === "done" && tokenId ? (
          <div className="mintDone">
            <span>Portrait #{tokenId} minted! Generation queued.</span>
            <button type="button" className="mintButton" onClick={reset}>Mint Another</button>
          </div>
        ) : isWrongChain ? (
          <ConnectButton.Custom>
            {({ openChainModal }) => (
              <button type="button" className="mintButton" onClick={openChainModal}>
                Switch to Sepolia
              </button>
            )}
          </ConnectButton.Custom>
        ) : !isConnected ? (
          <ConnectButton.Custom>
            {({ openConnectModal }) => (
              <>
                <a className="generateButton" href="#rarity">Rarity System</a>
                <button type="button" className="mintButton" onClick={openConnectModal}>
                  Connect Wallet
                </button>
              </>
            )}
          </ConnectButton.Custom>
        ) : (
          <>
            <a className="generateButton" href="#rarity">Rarity System</a>
            <button
              type="button"
              className="mintButton"
              onClick={phase === "error" ? reset : mint}
              disabled={!canMint && phase !== "error"}
              style={{ opacity: canMint || phase === "error" ? 1 : 0.5, cursor: canMint || phase === "error" ? "pointer" : "default" }}
            >
              {MINT_PHASE_LABEL[phase]}
            </button>
          </>
        )}
        {errorMsg && <p className="mintError">{errorMsg}</p>}
      </div>
    </>
  );
}

function EthIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" style={{ width: 24, height: 24, flexShrink: 0 }}>
      <path d="M12 2 5 13l7 4 7-4-7-11Z" fill="#14130f" />
      <path d="m5 14 7 8 7-8-7 4-7-4Z" fill="#14130f" opacity="0.72" />
    </svg>
  );
}
