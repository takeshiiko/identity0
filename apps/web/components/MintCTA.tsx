"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useMint, MINT_PHASE_LABEL } from "../hooks/useMint";

export function MintCTA() {
  const { isConnected, isWrongChain, phase, tokenId, canMint, mint, reset } = useMint();

  if (!isConnected) {
    return (
      <ConnectButton.Custom>
        {({ openConnectModal }) => (
          <button type="button" onClick={openConnectModal}>Connect Wallet</button>
        )}
      </ConnectButton.Custom>
    );
  }

  if (isWrongChain) {
    return (
      <ConnectButton.Custom>
        {({ openChainModal }) => (
          <button type="button" onClick={openChainModal}>Switch to Sepolia</button>
        )}
      </ConnectButton.Custom>
    );
  }

  if (phase === "done" && tokenId) {
    return (
      <span style={{ color: "var(--paper)", fontSize: "0.9rem", fontWeight: 700 }}>
        Portrait #{tokenId} minted!
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={phase === "error" ? reset : mint}
      disabled={!canMint && phase !== "error"}
      style={{ opacity: canMint || phase === "error" ? 1 : 0.5 }}
    >
      {MINT_PHASE_LABEL[phase]}
    </button>
  );
}
