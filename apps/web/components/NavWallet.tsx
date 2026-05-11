"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";

export function NavWallet() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openConnectModal, openAccountModal, openChainModal, mounted }) => {
        if (!mounted) return <div className="navOrb" aria-hidden="true" />;

        if (!account) {
          return (
            <button type="button" className="navWalletBtn" onClick={openConnectModal}>
              Connect
            </button>
          );
        }

        if (chain?.unsupported) {
          return (
            <button type="button" className="navWalletBtn navWalletError" onClick={openChainModal}>
              Wrong network
            </button>
          );
        }

        return (
          <button type="button" className="navWalletBtn navWalletConnected" onClick={openAccountModal}>
            <span className="navWalletDot" />
            {account.displayName}
          </button>
        );
      }}
    </ConnectButton.Custom>
  );
}
