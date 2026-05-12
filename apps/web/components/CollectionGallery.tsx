"use client";

import { useEffect, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { identity0Abi, deployments } from "@identity0/shared";

const CONTRACT = deployments.find(d => d.chainId === 11155111)!.address;
const GATEWAY = "https://ipfs.io/ipfs/";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) return GATEWAY + uri.slice(7);
  return uri;
}

interface TokenMeta {
  tokenId: number;
  name: string;
  image: string;
  rarity: string;
  revealed: boolean;
}

export function CollectionGallery() {
  const [tokens, setTokens] = useState<TokenMeta[]>([]);

  const { data: totalSupply } = useReadContract({
    address: CONTRACT,
    abi: identity0Abi,
    functionName: "totalSupply",
  });

  const count = totalSupply ? Number(totalSupply) : 0;

  const { data: uris } = useReadContracts({
    contracts: Array.from({ length: count }, (_, i) => ({
      address: CONTRACT,
      abi: identity0Abi,
      functionName: "tokenURI",
      args: [BigInt(i + 1)],
    })) as any,
    query: { enabled: count > 0 },
  });

  useEffect(() => {
    if (!uris || uris.length === 0) return;

    async function fetchMeta() {
      const results: TokenMeta[] = [];
      for (let i = 0; i < uris!.length; i++) {
        const tokenId = i + 1;
        const uriResult = uris![i];
        const uri = uriResult?.result as string | undefined;
        if (!uri) continue;

        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 10_000);
          const res = await fetch(ipfsToHttp(uri), { signal: controller.signal });
          clearTimeout(timer);
          const meta = await res.json();
          const rarity = meta.attributes?.find((a: any) => a.trait_type === "Rarity")?.value ?? "Common";
          const isUnrevealed =
            !meta.attributes ||
            meta.attributes.length === 0 ||
            meta.attributes.some((a: any) => a.trait_type === "Status" && a.value === "Unrevealed");
          results.push({
            tokenId,
            name: meta.name ?? `Kandinsky #${tokenId}`,
            image: ipfsToHttp(meta.image ?? ""),
            rarity,
            revealed: !isUnrevealed,
          });
        } catch {
          results.push({ tokenId, name: `Kandinsky #${tokenId}`, image: "", rarity: "Common", revealed: false });
        }
      }
      setTokens(results);
    }

    fetchMeta();
  }, [uris]);

  if (count === 0) {
    return <p className="collectionEmpty">No tokens minted yet.</p>;
  }

  if (tokens.length === 0) {
    return (
      <div className="collectionGrid">
        {Array.from({ length: count }, (_, i) => (
          <article key={i} className="collectionCard collectionCardLoading">
            <div className="collectionCardImg" />
            <strong>Loading…</strong>
          </article>
        ))}
      </div>
    );
  }

  return (
    <div className="collectionGrid">
      {tokens.map(({ tokenId, name, image, rarity, revealed }) => (
        <article key={tokenId} className="collectionCard">
          <a
            href={`https://testnets.opensea.io/assets/sepolia/${CONTRACT}/${tokenId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="collectionCardImg"
          >
            {image ? (
              <img src={image} alt={name} loading="lazy" />
            ) : (
              <div className="collectionCardPlaceholder" />
            )}
            {!revealed && <span className="collectionCardBadge">Unrevealed</span>}
          </a>
          <strong>{name}</strong>
          <span>{rarity}</span>
        </article>
      ))}
    </div>
  );
}
