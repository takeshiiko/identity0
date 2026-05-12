import type { WalletProfile, WalletScores } from "@identity0/shared";
import { keccak256, toBytes } from "viem";

export interface AnalyzeWalletOptions {
  alchemyApiKey?: string;
  covalentApiKey?: string;
  tokenId?: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, max = 100): number {
  return Math.min(max, Math.max(0, v));
}

function buildProfile(
  address: `0x${string}`,
  seed: `0x${string}`,
  scores: WalletScores
): WalletProfile {
  const weights: WalletScores = {
    age: 0.2,
    tx: 0.15,
    defi: 0.18,
    nft: 0.12,
    risk: 0.1,
    multichain: 0.1,
    wealth: 0.15,
  };
  const compositeScore = (Object.keys(scores) as (keyof WalletScores)[]).reduce(
    (s, k) => s + scores[k] * weights[k],
    0
  );
  const tier =
    compositeScore >= 93
      ? "Legendary"
      : compositeScore >= 81
      ? "Epic"
      : compositeScore >= 66
      ? "Rare"
      : compositeScore >= 41
      ? "Uncommon"
      : "Common";

  return {
    address,
    scores,
    compositeScore,
    rarityTier: tier,
    seed,
    analyzedAt: new Date().toISOString(),
  };
}

function placeholderScores(seed: `0x${string}`): WalletScores {
  const n = (offset: number, range: number) => {
    const byte = parseInt(seed.slice(2 + offset * 2, 4 + offset * 2), 16);
    return Math.round((byte / 255) * range);
  };
  return {
    age: n(0, 80) + 10,
    tx: n(1, 80) + 10,
    defi: n(2, 90),
    nft: n(3, 90),
    risk: n(4, 80) + 10,
    multichain: n(5, 70),
    wealth: n(6, 80) + 5,
  };
}

// ── Covalent multi-chain analysis ─────────────────────────────────────────────

async function fetchCovalentScores(
  address: string,
  apiKey: string
): Promise<WalletScores> {
  const headers = { Authorization: `Bearer ${apiKey}` };
  const chains = [1, 137, 42161, 10, 8453]; // eth, polygon, arb, op, base

  const txCountsP = chains.map((chainId) =>
    fetch(
      `https://api.covalenthq.com/v1/${chainId}/address/${address}/transactions_v3/?page-size=1`,
      { headers }
    )
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
  );

  const nftP = fetch(
    `https://api.covalenthq.com/v1/1/address/${address}/balances_v2/?nft=true&no-nft-fetch=true`,
    { headers }
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const defiP = fetch(
    `https://api.covalenthq.com/v1/1/address/${address}/portfolio_v2/`,
    { headers }
  )
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const [txResults, nftData, defiData] = await Promise.all([
    Promise.all(txCountsP),
    nftP,
    defiP,
  ]);

  const totalTx = (txResults as any[]).reduce(
    (sum: number, d: any) => sum + (d?.data?.pagination?.total_count ?? 0),
    0
  );
  const activeChainsCount = (txResults as any[]).filter(
    (d: any) => (d?.data?.pagination?.total_count ?? 0) > 0
  ).length;

  const nftItems =
    (nftData as any)?.data?.items?.filter((i: any) => i.type === "nft") ?? [];
  const nftCount = nftItems.reduce(
    (s: number, i: any) => s + (i.balance ?? 0),
    0
  );

  const defiPositions =
    (defiData as any)?.data?.items?.filter((i: any) => (i.quote ?? 0) > 0) ??
    [];
  const totalValueUsd = defiPositions.reduce(
    (s: number, i: any) => s + (i.quote ?? 0),
    0
  );

  const ethBalanceItem = (nftData as any)?.data?.items?.find(
    (i: any) =>
      i.contract_address === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  );
  const ethUsd = ethBalanceItem?.quote ?? 0;

  const firstTxDate = (nftData as any)?.data?.items?.[0]?.last_transferred_at;
  const accountAgeMonths = firstTxDate
    ? Math.min(
        100,
        Math.max(
          0,
          (Date.now() - new Date(firstTxDate).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        )
      )
    : 12;

  return {
    age: clamp(accountAgeMonths),
    tx: clamp(totalTx / 5),
    defi: clamp(defiPositions.length * 15),
    nft: clamp(nftCount * 8),
    risk: clamp(
      (totalTx > 200 ? 70 : 40) + (activeChainsCount > 2 ? 20 : 0)
    ),
    multichain: clamp(activeChainsCount * 20),
    wealth: clamp((totalValueUsd + ethUsd) / 500),
  };
}

// ── Alchemy enrichment ────────────────────────────────────────────────────────

async function enrichWithAlchemy(
  address: string,
  apiKey: string,
  scores: WalletScores
): Promise<WalletScores> {
  try {
    const { Alchemy, Network } = await import("alchemy-sdk");
    const alchemy = new Alchemy({ apiKey, network: Network.ETH_MAINNET });

    const [nfts, txCount, ethBalance] = await Promise.all([
      alchemy.nft.getNftsForOwner(address, { pageSize: 100 }),
      alchemy.core.getTransactionCount(address),
      alchemy.core.getBalance(address),
    ]);

    // ETH balance in USD (rough: assume 3000 USD/ETH)
    const ethAmount = Number(ethBalance) / 1e18;
    const ethUsdEstimate = ethAmount * 3000;

    // NFT count from Alchemy (more accurate than Covalent for mainnet)
    const nftCount = nfts.totalCount;

    // Only override if Alchemy gives higher values (more reliable)
    return {
      ...scores,
      tx: clamp(Math.max(scores.tx, txCount / 5)),
      nft: clamp(Math.max(scores.nft, nftCount * 8)),
      wealth: clamp(Math.max(scores.wealth, ethUsdEstimate / 500)),
    };
  } catch {
    // Alchemy enrichment is best-effort
    return scores;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function analyzeWallet(
  address: `0x${string}`,
  options: AnalyzeWalletOptions = {}
): Promise<WalletProfile> {
  const { covalentApiKey, alchemyApiKey, tokenId } = options;
  // tokenId dahil edilince aynı cüzdanın farklı mintleri benzeyip özdeş olmaz
  const seedInput = tokenId != null
    ? `${address.toLowerCase()}:${tokenId}`
    : address.toLowerCase();
  const seed = keccak256(toBytes(seedInput)) as `0x${string}`;

  let scores: WalletScores;

  if (covalentApiKey) {
    try {
      scores = await fetchCovalentScores(address, covalentApiKey);

      if (alchemyApiKey) {
        scores = await enrichWithAlchemy(address, alchemyApiKey, scores);
      }
    } catch {
      scores = placeholderScores(seed);
    }
  } else if (alchemyApiKey) {
    try {
      // Alchemy-only path (no multi-chain, but accurate for mainnet)
      scores = placeholderScores(seed); // base
      scores = await enrichWithAlchemy(address, alchemyApiKey, scores);
    } catch {
      scores = placeholderScores(seed);
    }
  } else {
    scores = placeholderScores(seed);
  }

  return buildProfile(address, seed, scores);
}
