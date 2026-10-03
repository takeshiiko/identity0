# tyrliquidity.app mirror notes

- Headless Chromium capture failed (`ERR_CERT_AUTHORITY_INVALID` behind the proxy); static files were mirrored with curl into `site/` instead.
- `/` was byte-identical to `/index.html`, so only `site/index.html` is kept.
- `vendor-solana-web3.js` is ~484 KB (under 15 MB), so it is included.
- No second-level static references were found in guide.css / guide.js / pools.js / radar.js / wallet.js.

## Skipped: API / dynamic endpoints (not mirrored)
Same-origin: /api/balances, /api/close, /api/compound, /api/config, /api/create, /api/increase,
/api/native-price, /api/realign, /api/replan, /api/run, /api/sell, /api/sell/preview, /api/solana/send,
/api/wallet, /api/wallet/prices, /api/candles?..., /api/pool-activity?..., /api/pools?..., /api/positions?...,
/api/radar?..., /api/tx?...
External RPC: api.mainnet-beta.solana.com, api.devnet.solana.com, api.testnet.solana.com.
Pages that load data from these will render empty/loading states locally.

## External fonts
- `site/_external/google-fonts.css`: Google Fonts CSS for Chakra Petch, Cinzel, JetBrains Mono and Noto Sans Runic
  (imported by app.css). It was fetched OK. The woff2 files it points to on fonts.gstatic.com were NOT downloaded.
