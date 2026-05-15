"use client";

import { useEffect, useState, useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { identity0Abi, deployments } from "@identity0/shared";

const CONTRACT  = deployments.find(d => d.chainId === 1)!.address;
const GATEWAY   = "https://ipfs.io/ipfs/";
const PAGE_SIZE = 6;
const API_URL   = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

function ipfsToHttp(uri: string): string {
  if (uri.startsWith("ipfs://")) return GATEWAY + uri.slice(7);
  return uri;
}

interface TokenMeta {
  tokenId: number;
  name:    string;
  image:   string;
  rarity:  string;
  revealed: boolean;
}

export function CollectionGallery() {
  const [cache,       setCache]       = useState<Record<number, TokenMeta>>({});
  const [loading,     setLoading]     = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [search,      setSearch]      = useState("");

  const { data: totalSupply } = useReadContract({
    address: CONTRACT,
    abi: identity0Abi,
    functionName: "totalSupply",
  });

  const count      = totalSupply ? Number(totalSupply) : 0;
  const totalPages = Math.ceil(count / PAGE_SIZE);

  // Search: sadece geçerli sayı girilmişse arama moduna gir
  const searchId = useMemo(() => {
    const n = parseInt(search, 10);
    return !isNaN(n) && n >= 1 && n <= count ? n : null;
  }, [search, count]);

  const isSearchMode = searchId !== null;

  // Hangi token ID'leri göstereceğiz
  const pageTokenIds = useMemo(() => {
    if (isSearchMode) return [searchId!];
    const start = (currentPage - 1) * PAGE_SIZE + 1;
    const end   = Math.min(start + PAGE_SIZE - 1, count);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, i) => start + i);
  }, [isSearchMode, searchId, currentPage, count]);

  // Yalnızca cache'de olmayan token'ları RPC'den çek
  const missingIds = pageTokenIds.filter(id => !cache[id]);

  const { data: uris } = useReadContracts({
    contracts: missingIds.map(id => ({
      address: CONTRACT,
      abi: identity0Abi,
      functionName: "tokenURI",
      args: [BigInt(id)],
    })) as any,
    query: { enabled: missingIds.length > 0 },
  });

  useEffect(() => {
    if (!uris || uris.length === 0) return;

    setLoading(true);
    async function fetchMeta() {
      const updates: Record<number, TokenMeta> = {};
      for (let i = 0; i < missingIds.length; i++) {
        const tokenId = missingIds[i]!;
        const uri = uris![i]?.result as string | undefined;
        if (!uri) {
          updates[tokenId] = { tokenId, name: `Kandinsky #${tokenId}`, image: "", rarity: "Common", revealed: false };
          continue;
        }
        try {
          const ctrl  = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 10_000);
          const res   = await fetch(ipfsToHttp(uri), { signal: ctrl.signal });
          clearTimeout(timer);
          const meta = await res.json();

          const isUnrevealed =
            !meta.attributes ||
            meta.attributes.length === 0 ||
            meta.attributes.some((a: any) => a.trait_type === "Status" && a.value === "Unrevealed");

          // On-chain henüz reveal edilmemiş → API'deki pending_reveals'a bak
          if (isUnrevealed) {
            try {
              const fallback = await fetch(`${API_URL}/api/token-meta/${tokenId}`);
              const fb = await fallback.json();
              if (fb.found && fb.meta) {
                const rarity = fb.meta.attributes?.find((a: any) => a.trait_type === "Rarity")?.value ?? "Common";
                updates[tokenId] = {
                  tokenId,
                  name: fb.meta.name ?? `Kandinsky #${tokenId}`,
                  image: ipfsToHttp(fb.meta.image ?? ""),
                  rarity,
                  revealed: true,
                };
                continue;
              }
            } catch { /* fallback başarısız, aşağıya devam */ }
          }

          const rarity = meta.attributes?.find((a: any) => a.trait_type === "Rarity")?.value ?? "Common";
          updates[tokenId] = {
            tokenId,
            name: meta.name ?? `Kandinsky #${tokenId}`,
            image: ipfsToHttp(meta.image ?? ""),
            rarity,
            revealed: !isUnrevealed,
          };
        } catch {
          updates[tokenId] = { tokenId, name: `Kandinsky #${tokenId}`, image: "", rarity: "Common", revealed: false };
        }
      }
      setCache(prev => ({ ...prev, ...updates }));
      setLoading(false);
    }
    fetchMeta();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uris]);

  // Sayfa değişince loading başlat (cache'de yoksa)
  useEffect(() => {
    if (missingIds.length > 0) setLoading(true);
    else setLoading(false);
  }, [missingIds.length]);

  // Arama kutusunu temizle
  const clearSearch = () => {
    setSearch("");
    setCurrentPage(1);
  };

  // Sayfa numaraları (ellipsis ile)
  const pageNumbers = useMemo((): (number | "…")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "…")[] = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push("…");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push("…");
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push("…");
      pages.push(currentPage - 1, currentPage, currentPage + 1);
      pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  if (count === 0) {
    return <p className="collectionEmpty">No tokens minted yet.</p>;
  }

  const shownTokens = pageTokenIds.map(id =>
    cache[id] ?? { tokenId: id, name: `Kandinsky #${id}`, image: "", rarity: "", revealed: false }
  );

  return (
    <>
      {/* Arama çubuğu */}
      <div className="collectionSearchWrap">
        <input
          type="number"
          min={1}
          max={count}
          placeholder={`Search by token number (1 – ${count.toLocaleString("en-US")})`}
          value={search}
          onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
          className="collectionSearchInput"
        />
        {search && (
          <button type="button" className="collectionSearchClear" onClick={clearSearch} aria-label="Clear">
            ✕
          </button>
        )}
      </div>

      {/* Grid */}
      <div className="collectionGrid">
        {shownTokens.map(({ tokenId, name, image, rarity, revealed }) => (
          loading && !cache[tokenId] ? (
            <article key={tokenId} className="collectionCard collectionCardLoading">
              <div className="collectionCardImg" />
              <strong>Loading…</strong>
            </article>
          ) : (
            <article key={tokenId} className="collectionCard">
              <a
                href={`https://opensea.io/assets/ethereum/${CONTRACT}/${tokenId}`}
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
              {rarity && <span>{rarity}</span>}
            </article>
          )
        ))}
      </div>

      {/* Arama sonucu bulunamadı */}
      {isSearchMode && searchId! > count && (
        <p className="collectionEmpty">Token #{search} doesn&apos;t exist yet.</p>
      )}

      {/* Sayfa numaraları — arama modunda gizle */}
      {!isSearchMode && totalPages > 1 && (
        <div className="collectionPagination">
          <button
            type="button"
            className="collectionPageBtn collectionPageNav"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>

          {pageNumbers.map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="collectionPageEllipsis">…</span>
            ) : (
              <button
                key={p}
                type="button"
                className={`collectionPageBtn${currentPage === p ? " collectionPageBtnActive" : ""}`}
                onClick={() => setCurrentPage(p as number)}
              >
                {p}
              </button>
            )
          )}

          <button
            type="button"
            className="collectionPageBtn collectionPageNav"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
