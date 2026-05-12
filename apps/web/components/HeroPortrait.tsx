"use client";

import { useEffect, useState } from "react";
import { useReadContract } from "wagmi";
import { identity0Abi, deployments } from "@identity0/shared";

const CONTRACT = deployments.find(d => d.chainId === 11155111)!.address;
const GATEWAY = "https://ipfs.io/ipfs/";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) return GATEWAY + uri.slice(7);
  return uri;
}

export function HeroPortrait() {
  const [image, setImage] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ name: string; rarity: string } | null>(null);

  const { data: tokenURI } = useReadContract({
    address: CONTRACT,
    abi: identity0Abi,
    functionName: "tokenURI",
    args: [BigInt(1)],
  });

  useEffect(() => {
    if (!tokenURI) return;
    fetch(ipfsToHttp(tokenURI as string))
      .then(r => r.json())
      .then(m => {
        const isUnrevealed = m.attributes?.some((a: any) => a.value === "Unrevealed");
        if (!isUnrevealed) {
          setImage(ipfsToHttp(m.image));
          const rarity = m.attributes?.find((a: any) => a.trait_type === "Rarity")?.value ?? "";
          setMeta({ name: m.name, rarity });
        }
      })
      .catch(() => null);
  }, [tokenURI]);

  if (!image) {
    return (
      <section className="portraitWall portraitWallSingle">
        <div className="heroPortraitPlaceholder" />
      </section>
    );
  }

  return (
    <section className="portraitWall portraitWallSingle">
      <div className="heroPortraitWrap">
        <img src={image} alt={meta?.name ?? "Kandinsky portrait"} />
        <aside className="heroPortraitMeta">
          <h2>{meta?.name}</h2>
          <span>{meta?.rarity}</span>
        </aside>
      </div>
    </section>
  );
}
