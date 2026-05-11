import { generateComposition } from "@identity0/geometry-engine";
import type { WalletProfile } from "@identity0/shared";

const previewProfile: WalletProfile = {
  address: "0x0000000000000000000000000000000000000000",
  scores: {
    age: 74,
    tx: 68,
    defi: 52,
    nft: 44,
    risk: 31,
    multichain: 63,
    wealth: 81
  },
  compositeScore: 64,
  rarityTier: "Uncommon",
  seed: "0x0000000000000000000000000000000000000000000000000000000000000000",
  analyzedAt: "2026-05-10T00:00:00.000Z"
};

export function BauhausPreview() {
  const svg = generateComposition(previewProfile);

  return <div className="preview" dangerouslySetInnerHTML={{ __html: svg }} />;
}
