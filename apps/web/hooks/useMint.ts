"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient, useChainId } from "wagmi";
import { parseEventLogs, formatEther } from "viem";
import { mainnet } from "viem/chains";
import { identity0Abi, deployments } from "@identity0/shared";

const CONTRACT = deployments.find(d => d.chainId === 1)!.address;
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const MAX_SUPPLY = 3333;
const MAX_PER_WALLET = 3;

export type MintPhase = "idle" | "signing" | "confirming" | "queuing" | "done" | "error";

export const MINT_PHASE_LABEL: Record<MintPhase, string> = {
  idle: "Mint Identity",
  signing: "Sign in wallet...",
  confirming: "Confirming...",
  queuing: "Queuing portrait...",
  done: "Minted!",
  error: "Try Again"
};

export function useMint() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: mainnet.id });
  const [phase, setPhase] = useState<MintPhase>("idle");
  const [tokenId, setTokenId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { data: mintPrice } = useReadContract({
    address: CONTRACT,
    abi: identity0Abi,
    functionName: "mintPrice"
  });

  const { data: totalSupply } = useReadContract({
    address: CONTRACT,
    abi: identity0Abi,
    functionName: "totalSupply"
  });

  const { data: mintedCount, refetch: refetchMinted } = useReadContract({
    address: CONTRACT,
    abi: identity0Abi,
    functionName: "mintedByWallet",
    args: [address!],
    query: { enabled: !!address }
  });

  const { data: paused } = useReadContract({
    address: CONTRACT,
    abi: identity0Abi,
    functionName: "paused"
  });

  const { writeContractAsync } = useWriteContract();

  const isWrongChain = isConnected && chainId !== mainnet.id;
  const supply = totalSupply !== undefined ? Number(totalSupply) : null;
  const minted = mintedCount !== undefined ? Number(mintedCount) : 0;
  const soldOut = supply !== null && supply >= MAX_SUPPLY;
  const walletFull = minted >= MAX_PER_WALLET;
  const priceEth = mintPrice !== undefined ? formatEther(mintPrice) : "0.02";
  const remaining = supply !== null ? MAX_SUPPLY - supply : null;
  const canMint =
    isConnected &&
    !isWrongChain &&
    !paused &&
    !soldOut &&
    !walletFull &&
    phase === "idle" &&
    mintPrice !== undefined;

  async function mint(quantity = 1) {
    if (!address || !publicClient || !canMint || mintPrice === undefined) return;
    setErrorMsg(null);
    const qty = Math.max(1, Math.min(quantity, MAX_PER_WALLET - minted));

    let successCount = 0;
    try {
      setPhase("signing");

      for (let i = 0; i < qty; i++) {
        if (i > 0) setPhase("confirming");
        const hash = await writeContractAsync({
          address: CONTRACT,
          abi: identity0Abi,
          functionName: "mint",
          value: mintPrice
        });

        setPhase("confirming");
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const logs = parseEventLogs({ abi: identity0Abi, logs: receipt.logs, eventName: "TokenMinted" });
        const mintedLog = logs.find(l => l.args.minter?.toLowerCase() === address.toLowerCase());
        const id = mintedLog ? Number(mintedLog.args.tokenId) : null;
        if (id) setTokenId(id);
        successCount++;

        try {
          await fetch(`${API_URL}/api/mint/initiate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokenId: id, walletAddress: address, txHash: hash })
          });
        } catch {
          // API offline — mint succeeded on-chain regardless
        }
      }

      await refetchMinted();
      setPhase("done");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "";
      const cancelled = msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("denied");
      if (successCount > 0) {
        setErrorMsg(`${successCount} of ${qty} minted successfully. Remaining transaction failed.`);
      } else {
        setErrorMsg(cancelled ? "Transaction cancelled." : "Mint failed. Try again.");
      }
      await refetchMinted();
      setPhase("error");
    }
  }

  function reset() {
    setPhase("idle");
    setErrorMsg(null);
  }

  return {
    address,
    isConnected,
    isWrongChain,
    mintPrice,
    priceEth,
    supply,
    remaining,
    minted,
    maxPerWallet: MAX_PER_WALLET,
    maxSupply: MAX_SUPPLY,
    paused,
    soldOut,
    walletFull,
    phase,
    tokenId,
    errorMsg,
    canMint,
    mint,
    reset
  };
}
