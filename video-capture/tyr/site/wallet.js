/* wallet.html's own script, lifted out of the page so the CSP can refuse
   inline script entirely. Loaded after common.js, in the same order it
   ran inline. */
let CFG = null;
let W = null;
let QUOTE = 'USDG';

// A bag worth less than this is noise from an airdrop or a rounding remainder;
// it cannot be sold for more than the gas it would cost.
const DUST_QUOTE = 0.01;

/**
 * The two the desk spends rather than trades.
 *
 * Gas and the dollar it settles in sit in the same list as every airdropped
 * bag, with the same `sell` and `pair` buttons beside them -- and one row of a
 * long table looks like any other. Selling the dollar swaps your dry powder
 * for the gas token; pairing it opens a stablecoin position this desk is not
 * for; and spending the gas down to nothing means the next run cannot pay the
 * rent it allocates. So they are marked, by mint rather than by ticker: a
 * bag calling itself USDC is not USDC.
 */
const STABLE_MINTS = {
  // the canonical dollars, per chain -- an address, because the symbol is
  // whatever the mint's metadata claims it is
  solana: {
    EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: 'USDC',
    Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: 'USDT',
  },
  base: {
    '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
    '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2': 'USDT',
  },
};
const stableOf = (addr) => {
  const table = STABLE_MINTS[CFG?.chain] ?? {};
  return table[addr] ?? table[String(addr).toLowerCase()] ?? null;
};
/** Why this row is marked, or null when it is an ordinary bag. */
function reserveNote(t) {
  const quote = String(CFG?.quoteToken ?? '');
  const isQuote = quote && String(t.address).toLowerCase() === quote.toLowerCase();
  const stable = stableOf(t.address);
  if (isQuote) return `${t.symbol} is the quote leg — the desk pairs with it. Selling it here is not a trade, it is spending your own settlement.`;
  if (stable) return `This is real ${stable}, not a bag. Selling it swaps your dollars for ${CFG?.nativeSymbol ?? 'gas'}; pairing it opens a stablecoin position this desk is not for.`;
  return null;
}

function boot() {
  api('/api/config').then((c) => {
    CFG = c;
    $('m-wallet').textContent = c.wallet ?? $('m-wallet').textContent;
  }).catch(() => {});
  load();
}

$('btn-refresh').onclick = (e) => { e.preventDefault(); load(); };
$('hide-dust').onchange = render;

async function load() {
  $('list').innerHTML = '<div class="hint">scanning transfer logs…</div>';
  try {
    W = await api('/api/wallet');
    QUOTE = W.quoteSymbol || QUOTE;
    // Both labels come from the chain. "eth" and "usdg" were baked into the
    // markup, which is wrong on two of the three chains this page serves.
    $('l-native').textContent = (W.nativeSymbol ?? CFG?.nativeSymbol ?? 'native').toLowerCase();
    $('l-quote').textContent = QUOTE.toLowerCase();
    $('n-eth').textContent = fmt(W.nativeHuman, 6);
    $('n-quote').textContent = fmt(W.quoteHuman, 4);
    markReserves();
    $('n-bags').textContent = W.tokens.length;
    // Balances are on screen before a single price is asked for, so a rate
    // limit downgrades the page instead of emptying it.
    render();
    await fetchPrices();
  } catch (e) {
    $('list').innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

/**
 * Prices arrive a few bags at a time. GMGN's per-token lookup is the bottleneck
 * and asking for all 17 at once got the key banned, so this walks the list in
 * chunks and stops at the first rate limit rather than digging the hole deeper.
 */
async function fetchPrices() {
  const CHUNK = 2;
  const pending = W.tokens.filter((t) => t.price === undefined);
  for (let i = 0; i < pending.length; i += CHUNK) {
    const slice = pending.slice(i, i + CHUNK);
    setPricingNote(`pricing ${i + 1}–${Math.min(i + CHUNK, pending.length)} of ${pending.length}…`);
    let priced;
    try {
      ({ tokens: priced } = await api('/api/wallet/prices', {
        tokens: slice.map((t) => ({ address: t.address, decimals: t.decimals, symbol: t.symbol, balance: t.balance })),
      }));
    } catch (e) {
      setPricingNote(`pricing stopped: ${e.message}`, true);
      return;
    }
    for (const p of priced) {
      const t = W.tokens.find((x) => x.address.toLowerCase() === p.address.toLowerCase());
      if (t) Object.assign(t, p);
    }
    summarise();
    render();
  }
  setPricingNote('');
}

/**
 * Mark the two numbers at the top when the wallet actually holds them.
 *
 * The gas token is always marked; the quote only when it is a different asset,
 * because on Solana the quote IS the gas and one warning is enough.
 */
function markReserves() {
  const nat = $('w-native'); const q = $('w-quote');
  const holdsNative = Number(W?.nativeHuman) > 0;
  const holdsQuote = Number(W?.quoteHuman) > 0;
  const nativeSym = W?.nativeSymbol ?? CFG?.nativeSymbol ?? 'gas';
  nat.textContent = 'gas + rent — keep a reserve';
  nat.title = `${nativeSym} pays for every signature and for the accounts a position allocates. `
    + 'A run that spends it all cannot open the position it just planned.';
  nat.classList.toggle('hidden', !holdsNative);
  const quoteIsNative = String(QUOTE).toUpperCase() === String(nativeSym).toUpperCase();
  q.textContent = 'the quote leg — not a bag';
  q.title = `${QUOTE} is what every position pairs with. It is spent by a run, not sold by one.`;
  q.classList.toggle('hidden', !holdsQuote || quoteIsNative);
}

function setPricingNote(text, bad = false) {
  $('pricing').textContent = text;
  $('pricing').className = bad ? 'alert' : 'hint';
}

function summarise() {
  const priced = W.tokens.filter((t) => t.valueQuote !== null && t.valueQuote !== undefined);
  $('n-value').textContent = `${fmt(priced.reduce((s, t) => s + t.valueQuote, 0), 4)} ${QUOTE}`;
  $('n-unpriced').textContent = W.tokens.length - priced.length;
}

// Unpriced bags are never dust: an absent price means we could not value them,
// not that they are worthless, so they stay on screen.
const isDust = (t) => typeof t.valueQuote === 'number' && t.valueQuote < DUST_QUOTE;

function render() {
  if (!W) return;
  // Pricing re-renders the table after every chunk, which would wipe an open
  // sell preview mid-quote -- the panel is inside a cell the rebuild replaces.
  // Carry those panels across the rebuild instead of dropping them.
  const openPanels = new Map();
  for (const row of document.querySelectorAll('tr[data-row]')) {
    const slot = row.querySelector('.slot');
    if (slot && slot.innerHTML.trim()) openPanels.set(row.dataset.row, slot.innerHTML);
  }
  const hide = $('hide-dust').checked;
  const rows = W.tokens.filter((t) => !(hide && isDust(t)));
  const hidden = W.tokens.length - rows.length;

  if (!rows.length) {
    $('list').innerHTML = `<div class="hint">No loose tokens.${hidden ? ` (${hidden} dust hidden)` : ''}</div>`;
    return;
  }

  $('list').innerHTML = '<div class="tablewrap"><table class="pos-t"><thead><tr>'
    + ['token', 'balance', 'price', `sell value (${esc(QUOTE)})`, 'source', '&nbsp;']
      .map((h) => `<th>${h}</th>`).join('')
    + '</tr></thead><tbody>'
    + rows.map(walletRow).join('')
    + '</tbody></table></div>'
    + (hidden ? `<p class="hint">${hidden} dust bag(s) under ${DUST_QUOTE} ${esc(QUOTE)} hidden.</p>` : '');

  for (const [address, html] of openPanels) {
    const slot = document.querySelector(`tr[data-row="${address}"] .slot`);
    if (slot) slot.innerHTML = html;
  }
}

function walletRow(t) {
  // Three distinct states, and conflating them is how a rate limit ends up
  // reading as "this token is worthless": not asked yet, asked and refused,
  // asked and answered.
  let value;
  if (t.price === undefined) {
    value = '<span class="cell-sub">…</span>';
  } else if (t.valueQuote === null || t.valueQuote === undefined) {
    value = `<span class="cell-sub" title="${esc(t.priceError || 'no reference pool found')}">unpriced</span>`;
  } else {
    value = `<span class="cell-val">${fmt(t.valueQuote, 4)}</span>`;
  }

  const source = t.priceSource || (t.price === undefined ? '' : t.priceError) || '—';
  const reserve = reserveNote(t);
  return `<tr data-row="${esc(t.address)}">`
    + `<td class="pair-name">${esc(t.symbol)}`
      + (reserve ? `<i class="rsv" title="${esc(reserve)}" aria-label="${esc(reserve)}"></i>` : '')
      // The name is the other half of the label and, when the symbol is a
      // ticker like "Nvidia" or a bare address, the half that says what it is.
      + (t.name && t.name !== t.symbol ? `<div class="cell-sub tname">${esc(t.name)}</div>` : '')
      + `<div class="cell-sub"><a href="${esc(EXPLORER_TOKEN(t.address))}" target="_blank">${esc(short(t.address))}</a></div></td>`
    + `<td>${fmt(t.balanceHuman, 6)}</td>`
    + `<td><span class="cell-sub">${t.price == null ? '—' : fmt(t.price, 8)}</span></td>`
    + `<td>${value}</td>`
    + `<td><span class="cell-sub">${esc(String(source).slice(0, 60))}</span></td>`
    + '<td><div class="acts-inline">'
      + `<button data-act="sell" data-ca="${esc(t.address)}">sell</button>`
      + `<button data-act="pair" data-ca="${esc(t.address)}">pair</button>`
    + '</div><div class="slot"></div></td></tr>';
}


const short = (a) => `${a.slice(0, 6)}…${a.slice(-4)}`;
// The explorer follows the chain. This was Robinhood's Blockscout, hardcoded,
// so a Solana bag linked to a Blockscout page that had never heard of it.
// Blockscout, BaseScan and Solscan all put tokens under /token/, so one path
// serves all three; only the host differs, and CFG carries it.
const EXPLORER_TOKEN = (a) => `${CFG?.explorer ?? ''}/token/${a}`;

$('list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  if (b.dataset.act === 'pair') pair(b.dataset.ca);
  else if (b.dataset.act === 'sell') previewSell(b.dataset.ca, b);
  else if (b.dataset.act === 'confirm') confirmSell(b.dataset.ca, b);
  else if (b.dataset.act === 'cancel') slotOf(b).innerHTML = '';
});

const slotOf = (el) => el.closest('td').querySelector('.slot');
const rowButtons = (ca) => [...document.querySelectorAll(`tr[data-row="${ca}"] button`)];

/**
 * Step 1 of a sale: ask the pool. These bags are mostly illiquid, so the
 * mark-to-market value on the left of the row is not what a sale returns --
 * nothing is signed until the quote is on screen and clicked a second time.
 */
async function previewSell(ca, btn) {
  const slot = slotOf(btn);
  const pct = Number(prompt('Sell what percent of the bag?', '100'));
  if (!Number.isFinite(pct) || pct <= 0 || pct > 100) return;

  slot.innerHTML = '<div class="note">quoting…</div>';
  try {
    const p = await api('/api/sell/preview', { tokenAddress: ca, percent: pct });
    const impact = p.impactPercent == null ? null : p.impactPercent;
    const bad = impact !== null && impact < -20;
    slot.innerHTML = `<div class="note ${bad ? 'alert' : ''}">`
      + `sell ${fmt(p.amountInHuman, 6)} ${esc(p.token.symbol)}`
      + ` → <b>${fmt(p.amountOutHuman, 6)} ${esc(p.quote.symbol)}</b>`
      + `<div class="cell-sub">min out ${fmt(p.minOutHuman, 6)} at ${p.slippage}% slippage`
      + (p.pool?.feeLabel
        ? ` · ${esc(p.pool.feeLabel)}${p.poolsQuoted ? ` (${p.poolsQuoted})` : ''}`
        : (p.route ? ` · ${esc(p.route)}` : ''))
      + (impact === null ? ` · no market reference${p.marketError ? ` (${esc(p.marketError)})` : ''}`
        : ` · ${impact >= 0 ? '+' : ''}${fmt(impact, 1)}% vs ${esc(p.marketSource || 'market')}`)
      + '</div>'
      + (bad ? '<div class="cell-sub">The pool pays well under the reference price.</div>' : '')
      + '<div class="acts" style="margin-top:8px">'
        + `<button class="danger" data-act="confirm" data-ca="${esc(ca)}" data-pct="${pct}">confirm sell</button>`
        + '<button data-act="cancel">cancel</button>'
      + '</div></div>';
  } catch (e) {
    slot.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

/** Step 2: actually send it. */
async function confirmSell(ca, btn) {
  const pct = btn.dataset.pct;
  const slot = slotOf(btn);
  const buttons = rowButtons(ca);
  buttons.forEach((b) => { b.disabled = true; });
  slot.innerHTML = '<div class="note">selling…</div>';
  try {
    let r = await apiSigned('/api/sell', { tokenAddress: ca, percent: Number(pct) }, {
      onStep: (m) => { slot.innerHTML = `<div class="note">${esc(m)}</div>`; },
      resume: () => null,
    });
    if (r.signed) r = { ...r, receivedHuman: null };
    slot.innerHTML = r.dryRun
      ? '<div class="ok">DRY_RUN — nothing was sent.</div>'
      : `<div class="ok">${r.receivedHuman === null || r.receivedHuman === undefined ? 'sold' : `received ${fmt(r.receivedHuman, 6)} ${esc(r.quoteSymbol || QUOTE)}`}`
        + (r.txUrl ? ` · <a href="${esc(r.txUrl)}" target="_blank">tx</a>` : '') + '</div>';
    setTimeout(load, 3000);
  } catch (e) {
    slot.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
    buttons.forEach((b) => { b.disabled = false; });
  }
}

/** Hand the bag to the run page: same token, no buy, budget left to the user. */
function pair(ca) {
  location.href = `/?ca=${encodeURIComponent(ca)}&skipBuy=1`;
}
