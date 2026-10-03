/* pools.html's own script, lifted out of the page so the CSP can refuse
   inline script entirely. Loaded after common.js, in the same order it
   ran inline. */
let ALL = [];
let TAB = 'live';
let CFG = null;

// A position is live while it still holds liquidity and the NFT is still ours.
// Everything else -- withdrawn, burned, transferred away -- reads as closed.
const isLive = (p) => !p.error && !p.closed && p.stillOwned !== false;

function boot() {
  api('/api/config').then((c) => {
    CFG = c;
    $('m-wallet').textContent = c.wallet ?? $('m-wallet').textContent;
    render();
  }).catch(() => {});
  load();
}

$('btn-refresh').onclick = (e) => { e.preventDefault(); load(); };
$('tab-live').onclick = () => select('live');
$('tab-closed').onclick = () => select('closed');

function select(tab) {
  TAB = tab;
  $('tab-live').classList.toggle('on', tab === 'live');
  $('tab-closed').classList.toggle('on', tab === 'closed');
  $('list-title').textContent = `${tab} positions`;
  render();
}

async function load() {
  $('list').innerHTML = '<div class="hint">loading…</div>';
  try {
    const known = knownPositions.get();
    const { positions, index } = await api(`/api/positions?limit=200${known.length ? `&known=${known.join(',')}` : ''}`);
    ALL = positions;
    for (const p of positions) if (!p.error && p.protocol !== 'v3' && p.stillOwned !== false) knownPositions.add(p.tokenId);
    summarise();
    render();
    if (index?.scanError) {
      $('list').insertAdjacentHTML('afterbegin', `<div class="note">The chain scan did not finish: ${esc(index.scanError)} Showing the positions already known; refresh to try the rest.</div>`);
    }
  } catch (e) {
    $('list').innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

function summarise() {
  const live = ALL.filter(isLive);
  $('n-live').textContent = live.length;
  $('n-closed').textContent = ALL.length - live.length;
  $('n-inrange').textContent = live.filter((p) => p.inRange).length;

  // Value the live positions in the quote asset: the quote leg at face value,
  // the token leg marked at the pool's current spot.
  let value = 0;
  let quoteSymbol = '';
  for (const p of live) {
    if (!p.holds || !p.spot) continue;
    value += Number(p.holds.quote) + Number(p.holds.token) * p.spot;
    quoteSymbol = p.quoteSymbol;
  }
  $('n-value').textContent = value ? `${fmt(value, 2)} ${quoteSymbol}` : '—';

  // What those positions cost to open, from their mint transactions.
  let cost = 0;
  let costKnown = false;
  for (const p of live) {
    if (!p.pnl || p.pnl.cost === null || p.pnl.cost === undefined) continue;
    cost += p.pnl.cost;
    costKnown = true;
  }
  $('n-cost').textContent = costKnown ? `${fmt(cost, 2)} ${quoteSymbol}` : '—';

  // Unclaimed fees across every live position, valued in the quote asset.
  let fees = 0;
  let known = false;
  for (const p of live) {
    if (!p.fees || p.fees.valueQuote === null) continue;
    fees += p.fees.valueQuote;
    known = true;
  }
  $('n-fees').textContent = known ? `${fmt(fees, 4)} ${quoteSymbol}` : '—';
}

/**
 * Closing moves money, so the confirmation spells out what comes back and the
 * button is disabled while the transaction is in flight.
 */
// A v3 and a v4 position can share a number; the protocol tells them apart.
const findPos = (tokenId, proto = 'v4') => ALL.find((x) => x.tokenId === tokenId && (x.protocol ?? 'v4') === proto);
const btnSel = (p) => `button[data-id="${p.tokenId}"][data-proto="${p.protocol ?? 'v4'}"]`;

/**
 * Follow a sent-but-unmined transaction to its receipt.
 *
 * Two minutes of asking, and then the truth: a transaction that has not been
 * mined is not a transaction that succeeded. This used to fall out of the
 * loop and carry on as if it had -- which for a rebalance meant opening the
 * new-position ticket while the close was still in flight.
 */
async function follow(r, what) {
  for (let i = 0; i < 40; i++) {
    await new Promise((res) => setTimeout(res, 3000));
    const t = await api(`/api/tx?hash=${encodeURIComponent(r.hash)}`);
    if (!t.landed) continue;
    if (t.status !== 'success') throw new Error(`${what} reverted: ${t.url}`);
    return { ...r, url: t.url, received: r.received ?? null, landed: true };
  }
  throw new Error(`the ${what} is still not mined after two minutes. It is out and may yet land — `
    + 'check the explorer and reload this page before trying again.');
}

async function onPositionAction(tokenId, mode, proto = 'v4') {
  const p = findPos(tokenId, proto);
  if (!p) return;
  if (mode === 'compound') return onCompound(p);
  if (mode === 'increase') return onIncrease(p);
  if (mode === 'realign') return onRealign(p);
  if (mode === 'rebalance') return onRebalance(p);
  const back = mode === 'close'
    ? `${fmt(p.holds?.quote ?? 0, 4)} ${p.quoteSymbol} + ${fmt(p.holds?.token ?? 0, 4)} ${p.tokenSymbol}`
      + ` (fees included: ${fmt(p.fees?.quote ?? 0, 4)} ${p.quoteSymbol} + ${fmt(p.fees?.token ?? 0, 4)} ${p.tokenSymbol})`
    : `${fmt(p.fees?.quote ?? 0, 4)} ${p.quoteSymbol} + ${fmt(p.fees?.token ?? 0, 4)} ${p.tokenSymbol}`;
  const what = mode === 'close'
    ? `Close ${p.pair} #${tokenId}?\n\nBurns the position NFT and returns roughly:\n${back}`
    : `Collect fees from ${p.pair} #${tokenId}?\n\nThe position stays open. Returns roughly:\n${back}`;
  if (!confirm(what)) return;

  const buttons = [...document.querySelectorAll(btnSel(p))];
  buttons.forEach((b) => { b.disabled = true; });
  const status = document.createElement('div');
  status.className = 'note';
  status.textContent = `${mode}…`;
  const host = buttons[0]?.closest('td');
  if (host) host.appendChild(status);

  try {
    let r = await apiSigned('/api/close', { tokenId, mode, protocol: p.protocol ?? 'v4' }, {
      onStep: (m) => { status.textContent = m; },
      // A DLMM close can take several transactions; the server says when more follow.
      resume: (sent, need) => (need.meta?.then === 'close' ? {} : null),
    });
    if (r.signed) r = { ...r, url: r.txUrl, received: null };
    // Sent but not yet mined when the call's time ran out: follow the hash
    // here rather than leave the row saying nothing about a transaction that
    // is out and will land.
    if (r.pending) {
      status.innerHTML = `${mode} sent · <a href="${esc(r.url)}" target="_blank">tx</a> · waiting for the receipt…`;
      r = await follow(r, mode);
    }
    status.className = 'ok';
    const link = r.url ?? r.txUrl;
    const cost = r.gasUsed ?? r.gas ?? (r.units ? `${r.units} compute units` : null);
    status.innerHTML = r.dryRun
      ? `DRY_RUN — simulation passed${cost ? ` (${esc(cost)})` : ''}. Nothing was sent.`
      : (r.received
        ? `${mode === 'collect' ? 'collected' : 'received'} ${fmt(r.received.quote, 6)} ${esc(r.received.quoteSymbol)} + `
          + `${fmt(r.received.token, 6)} ${esc(r.received.tokenSymbol)}`
        : `${mode === 'collect' ? 'collected' : 'closed'}`)
        + (link ? ` · <a href="${esc(link)}" target="_blank">tx</a>` : '');
    setTimeout(load, 2500);
  } catch (e) {
    status.className = 'alert';
    status.textContent = e.message;
    buttons.forEach((b) => { b.disabled = false; });
  }
}

/**
 * Out of range and staying there: close the position and open the next one
 * around the price now.
 *
 * Two acts, not one transaction -- the close returns the assets to the
 * wallet, and what to do with them is a decision (a wider band? the same
 * one? none at all?). So this closes, then hands the ticket over with the
 * pool, the fee, the shape and the band already set: press run, then
 * execute. Nothing is opened behind the operator's back.
 */
async function onRebalance(p) {
  const back = `${fmt(p.holds?.quote ?? 0, 4)} ${p.quoteSymbol} + ${fmt(p.holds?.token ?? 0, 4)} ${p.tokenSymbol}`;
  if (!confirm(`Rebalance ${p.pair} #${p.tokenId}?\n\n1. Closes the position — roughly ${back} (fees included) comes back to the wallet.\n`
    + '2. Opens the run ticket for the same pool with the same settings, so you can open the new band.\n\n'
    + 'Nothing is opened until you press run and execute.')) return;
  const buttons = [...document.querySelectorAll(btnSel(p))];
  buttons.forEach((b) => { b.disabled = true; });
  const status = document.createElement('div');
  status.className = 'note';
  status.textContent = 'closing…';
  buttons[0]?.closest('td')?.appendChild(status);
  try {
    let r = await apiSigned('/api/close', { tokenId: p.tokenId, mode: 'close', protocol: p.protocol ?? 'v4' }, {
      onStep: (m) => { status.textContent = m; },
      resume: (sent, need) => (need.meta?.then === 'close' ? {} : null),
    });
    if (r.signed) r = { ...r, url: r.txUrl };
    if (r.pending) {
      status.innerHTML = `close sent · <a href="${esc(r.url)}" target="_blank">tx</a> · waiting for the receipt…`;
      r = await follow(r, 'close');
    }
    if (r.dryRun) { status.className = 'note'; status.textContent = 'DRY_RUN — nothing was sent, so there is nothing to reopen.'; buttons.forEach((b) => { b.disabled = false; }); return; }
    status.className = 'ok';
    status.textContent = 'closed — opening the ticket for the new band…';
    // The quote that came back is the budget for the new position; the token
    // leg is already in the wallet, so the run does not buy again.
    const quoteBack = r.received?.quote ?? p.holds?.quote ?? '';
    const tokenBack = r.received?.token ?? p.holds?.token ?? '';
    const q = new URLSearchParams({
      ca: p.tokenAddress, skipBuy: '1', mode: 'join', rebalance: p.tokenId, sym: p.tokenSymbol,
      proto: p.protocol ?? 'v4', fee: String(p.feePercent ?? ''),
    });
    if (quoteBack !== '' && Number(quoteBack) > 0) q.set('budget', String(Number(quoteBack).toFixed(6)));
    // Only what this position returned goes into the next one.
    if (tokenBack !== '' && Number(tokenBack) > 0) q.set('tokenAmount', String(tokenBack));
    // The pool it was in, and the band it held, side by side.
    if (p.poolId) q.set('pool', p.poolId);
    if (p.spot > 0 && p.priceLower > 0 && p.priceUpper > 0) {
      const lower = Math.max(0, Math.round((1 - p.priceLower / p.spot) * 100));
      const upper = Math.max(0, Math.round((p.priceUpper / p.spot - 1) * 100));
      // A one-sided band has a zero on one side, and requiring both to be
      // positive dropped the whole band for exactly the positions whose
      // shape matters most.
      if (lower > 0 || upper > 0) { q.set('rangeLower', String(lower)); q.set('rangeUpper', String(upper)); }
      // Which ladder this was, read off the band rather than looked up: the
      // shape a DLMM position was opened with is not recorded on chain, so
      // a band that sits entirely on one side of the price is the only
      // evidence there is. Without it the sell ladder comes back as spot.
      if (p.protocol === 'dlmm') {
        if (lower === 0 && upper > 0) q.set('preset', 'ladder');
        else if (upper === 0 && lower > 0) q.set('preset', 'bid');
      }
    }
    if (p.binStep) q.set('binStep', String(p.binStep));
    if (p.tickSpacing) q.set('spacing', String(p.tickSpacing));
    setTimeout(() => { location.href = `/?${q}`; }, 900);
  } catch (e) {
    status.className = 'alert';
    status.textContent = e.message;
    buttons.forEach((b) => { b.disabled = false; });
  }
}

/**
 * Fees back into the position, one transaction, nothing through the wallet
 * but the leg that did not fit the range at this price.
 */
async function onCompound(p) {
  const fees = `${fmt(p.fees?.quote ?? 0, 4)} ${p.quoteSymbol} + ${fmt(p.fees?.token ?? 0, 4)} ${p.tokenSymbol}`;
  // On Meteora there is no reinvest instruction: the fees are claimed to the
  // wallet and added back, which is two signatures rather than one.
  const dlmm = p.protocol === 'dlmm';
  if (!confirm(`Compound the fees of ${p.pair} #${p.tokenId} back into it?\n\nAccrued: ${fees}\n`
    + (dlmm
      ? 'Two transactions: the fees are claimed to your wallet, then added back over the same bins.'
      : 'What fits the range at the current price is added; the rest comes to the wallet.'))) return;
  const buttons = [...document.querySelectorAll(btnSel(p))];
  buttons.forEach((b) => { b.disabled = true; });
  const status = document.createElement('div');
  status.className = 'note';
  status.textContent = 'compounding…';
  const host = buttons[0]?.closest('td');
  if (host) host.appendChild(status);
  try {
    // Each claim the wallet signs is named back to the server: the amounts
    // added are read from those transactions, never taken from this page.
    const claimed = [];
    let r = await apiSigned('/api/compound', { tokenId: p.tokenId, protocol: p.protocol ?? 'v4' }, {
      onStep: (m) => { status.textContent = m; },
      resume: (sent, need) => {
        if (need.meta?.then === 'compound') { claimed.push(sent.signature); return { claimedSignatures: claimed.slice() }; }
        if (need.meta?.then === 'compound-add') return { claimedSignatures: claimed.slice() };
        return null;
      },
    });
    if (r.signed) r = { ...r, url: r.txUrl, preview: r.meta?.preview ?? r.preview };
    if (r.pending) {
      status.innerHTML = `sent · <a href="${esc(r.url)}" target="_blank">tx</a> · waiting for the receipt…`;
      r = await follow(r, 'compound');
    }
    const pv = r.preview;
    status.className = r.dryRun ? 'note' : 'ok';
    if (!pv) { status.innerHTML = `compounded${r.url ? ` · <a href="${esc(r.url)}" target="_blank">tx</a>` : ''}`; setTimeout(load, 2500); return; }
    status.innerHTML = (r.dryRun ? 'DRY_RUN — simulation passed, nothing sent. Would add ' : 'added ')
      + `<b>${fmt(pv.added.quote, 6)} ${esc(pv.quoteSymbol)} + ${fmt(pv.added.token, 4)} ${esc(pv.tokenSymbol)}</b>`
      + ((Number(pv.leftover.quote) > 0 || Number(pv.leftover.token) > 0)
        ? ` · ${fmt(pv.leftover.quote, 6)} ${esc(pv.quoteSymbol)} + ${fmt(pv.leftover.token, 4)} ${esc(pv.tokenSymbol)} to the wallet` : '')
      + (r.url ? ` · <a href="${esc(r.url)}" target="_blank">tx</a>` : '');
    if (!r.dryRun) setTimeout(load, 2500);
  } catch (e) {
    status.className = 'alert';
    status.textContent = e.message;
    buttons.forEach((b) => { b.disabled = false; });
  }
}

/**
 * More capital into a position: a budget, a preview of how the band splits
 * it at this price, then the buy and the add. The form lives in the row.
 */
/**
 * A full-width row under the position for an inline form: the action cell
 * is too narrow to hold a preview, and a note wedged there scrolls the table.
 */
function slotFor(p) {
  const row = document.querySelector(btnSel(p))?.closest('tr');
  if (!row) return null;
  let host = row.nextElementSibling;
  if (!host?.classList.contains('slotrow')) {
    host = document.createElement('tr');
    host.className = 'slotrow';
    host.innerHTML = `<td colspan="${row.children.length}"><div class="slot"></div></td>`;
    row.after(host);
  }
  return host.querySelector('.slot');
}

function onIncrease(p) {
  const slot = slotFor(p);
  if (!slot) return;
  slot.innerHTML = `<div class="note">
    <label for="inc-${esc(p.tokenId)}">add to #${esc(p.tokenId)} · budget (${esc(p.quoteSymbol)}, 0 = only what the wallet holds)</label>
    <input id="inc-${esc(p.tokenId)}" inputmode="decimal" placeholder="0.00" style="margin-bottom:8px">
    <div class="acts"><button data-inc="preview" data-id="${esc(p.tokenId)}">preview</button><button data-inc="cancel" data-id="${esc(p.tokenId)}">cancel</button></div>
    <div class="inc-out"></div>
  </div>`;
  slot.querySelector('input').focus();
  slot.onclick = async (e) => {
    const b = e.target.closest('button[data-inc]');
    if (!b) return;
    const out = slot.querySelector('.inc-out');
    const budget = slot.querySelector('input').value.trim() || '0';
    if (b.dataset.inc === 'cancel') { slot.closest('tr').remove(); return; }
    b.disabled = true;
    try {
      if (b.dataset.inc === 'preview') {
        out.innerHTML = '<div class="cell-sub">previewing…</div>';
        const { preview: pv } = await api('/api/increase', { tokenId: p.tokenId, quoteAmount: budget, preview: true });
        out.innerHTML = `<div class="cell-sub">band takes <b>${fmt(pv.tokenSharePercent, 0)}% ${esc(pv.tokenSymbol)}</b> at this price${pv.inRange ? '' : ' · <b>out of range</b>'}</div>`
          + (Number(pv.buy.quote) > 0 ? `<div class="cell-sub">buy ${fmt(pv.buy.quote, 4)} ${esc(pv.quoteSymbol)} → ~${fmt(pv.buy.expectedTokens, 2)} ${esc(pv.tokenSymbol)} via ${esc(pv.buy.route)}${pv.buy.routeFeePercent != null ? ` (${fmt(pv.buy.routeFeePercent, 2)}% fee)` : ''}</div>` : '')
          + `<div class="cell-sub">add <b>${fmt(pv.add.token, 2)} ${esc(pv.tokenSymbol)} + ${fmt(pv.add.quote, 4)} ${esc(pv.quoteSymbol)}</b> · liquidity +${fmt(pv.growthPercent ?? 0, 1)}%</div>`
          + `<div class="acts" style="margin-top:8px"><button data-inc="go" data-id="${esc(p.tokenId)}" class="danger">confirm — buy &amp; add</button></div>`;
      } else if (b.dataset.inc === 'go') {
        if (!confirm(`Add to ${p.pair} #${p.tokenId} with a ${budget} ${p.quoteSymbol} budget?\n\nThis buys the token leg the band needs, then adds both legs to the position.`)) { b.disabled = false; return; }
        out.innerHTML = '<div class="cell-sub">buying, then adding…</div>';
        let r = await apiSigned('/api/increase', { tokenId: p.tokenId, quoteAmount: budget }, { onStep: (m) => { out.innerHTML = `<div class="cell-sub">${esc(m)}</div>`; } });
        for (let attempt = 2; r.approvalsPending && attempt <= 4; attempt++) {
          out.innerHTML = `<div class="cell-sub">approvals confirming — continuing (${attempt})…</div>`;
          await new Promise((res) => setTimeout(res, 2500));
          r = await api('/api/increase', { tokenId: p.tokenId, quoteAmount: r.resume?.quoteAmount ?? '0', noBuy: true });
        }
        if (r.pending) {
          out.innerHTML = `<div class="cell-sub">sent · <a href="${esc(r.url)}" target="_blank">tx</a> · waiting…</div>`;
          r = { ...(await follow(r, 'increase')), added: r.preview?.add };
        }
        const added = r.added ?? r.preview?.add;
        out.innerHTML = `<div class="${r.dryRun ? 'note' : 'ok'}">${r.dryRun ? 'DRY_RUN — simulated, nothing sent. Would add ' : 'added '}<b>${fmt(added.token, 2)} ${esc(p.tokenSymbol)} + ${fmt(added.quote, 4)} ${esc(p.quoteSymbol)}</b>`
          + (r.bought?.txUrl ? ` · <a href="${esc(r.bought.txUrl)}" target="_blank">buy tx</a>` : '') + (r.url ? ` · <a href="${esc(r.url)}" target="_blank">add tx</a>` : '') + '</div>';
        if (!r.dryRun) setTimeout(load, 2500);
      }
    } catch (err) {
      out.innerHTML = `<div class="alert">${esc(err.message)}</div>`;
    }
    b.disabled = false;
  };
}

/**
 * Move the pool to the market price: the preview names the reference it
 * aligns to (and the others it did not pick), sizes the swap from the curve
 * and says where the fee lands. Nothing moves until the confirm.
 */
function onRealign(p) {
  const slot = slotFor(p);
  if (!slot) return;
  slot.innerHTML = '<div class="note"><div class="cell-sub">sizing the swap…</div></div>';
  const out = slot.querySelector('.note');
  const price = (v) => Number(v).toPrecision(5);
  (async () => {
    try {
      const { preview: pv } = await api('/api/realign', { tokenId: p.tokenId, preview: true });
      const refs = (pv.references ?? []).map((r) => `<div class="cell-sub">· ${price(r.price)} ${esc(pv.quoteSymbol)} — ${esc(r.source)} (${fmt(r.depthQuote, 2)} ${esc(pv.quoteSymbol)} within ±10%)</div>`).join('');
      if (pv.nothingToDo) {
        out.innerHTML = `<div class="cell-sub">pool ${price(pv.spot)} vs market ${price(pv.marketPrice)} ${esc(pv.quoteSymbol)}: ${esc(pv.note)}.</div>${refs}<div class="acts" style="margin-top:8px"><button data-re="cancel">close</button></div>`;
      } else {
        out.innerHTML = `<div class="cell-sub">pool <b>${price(pv.spot)}</b> → market <b>${price(pv.marketPrice)}</b> ${esc(pv.quoteSymbol)} (${pv.gapPercent >= 0 ? '+' : ''}${fmt(pv.gapPercent, 1)}% now)</div>`
          + `<div class="cell-sub">reference: ${esc(pv.marketSource)}${pv.thinReference ? ` — <b>thin</b>, only ${fmt(pv.marketDepthQuote, 2)} ${esc(pv.quoteSymbol)} sits within ±10% of it` : ''}</div>`
          + (pv.references.length > 1 ? `<div class="cell-sub" style="margin-top:4px">every reference seen:</div>${refs}` : '')
          + `<div class="cell-sub" style="margin-top:6px">${esc(pv.direction)}: sell <b>${fmt(pv.sell.amount, 4)} ${esc(pv.sell.symbol)}</b> (${fmt(pv.sell.fee, 4)} of it is the ${fmt(pv.feePercent, 2)}% fee) → receive ~<b>${fmt(pv.receive.amount, 4)} ${esc(pv.receive.symbol)}</b></div>`
          + `<div class="cell-sub">${esc(pv.feeNote)}</div>`
          + `<div class="cell-sub">wallet holds ${fmt(pv.wallet.holds, 4)} ${esc(pv.sell.symbol)}${Number(pv.wallet.short) > 0 ? ` — short ${fmt(pv.wallet.short, 4)}${pv.buyFirst ? `; buys ~${fmt(pv.buyFirst.tokens, 2)} ${esc(pv.tokenSymbol)} for ${fmt(pv.buyFirst.quote, 4)} ${esc(pv.quoteSymbol)} on the market first` : ''}` : ''}</div>`
          + `<div class="acts" style="margin-top:8px"><button data-re="go" class="danger">confirm — swap into this pool</button><button data-re="cancel">cancel</button></div>`;
      }
      out.onclick = async (e) => {
        const b = e.target.closest('button[data-re]');
        if (!b) return;
        if (b.dataset.re === 'cancel') { slot.closest('tr').remove(); return; }
        if (!confirm(`Sell ${fmt(pv.sell.amount, 4)} ${pv.sell.symbol} into ${p.pair} #${p.tokenId} to move its price ${price(pv.spot)} → ${price(pv.marketPrice)} ${pv.quoteSymbol}?`)) return;
        b.disabled = true;
        try {
          out.innerHTML = '<div class="cell-sub">swapping…</div>';
          let r = await apiSigned('/api/realign', { tokenId: p.tokenId }, { onStep: (m) => { out.innerHTML = `<div class="cell-sub">${esc(m)}</div>`; } });
          for (let attempt = 2; r.approvalsPending && attempt <= 4; attempt++) {
            out.innerHTML = `<div class="cell-sub">approvals confirming — continuing (${attempt})…</div>`;
            await new Promise((res) => setTimeout(res, 2500));
            r = await api('/api/realign', { tokenId: p.tokenId });
          }
          if (r.pending) {
            out.innerHTML = `<div class="cell-sub">sent · <a href="${esc(r.url)}" target="_blank">tx</a> · waiting…</div>`;
            r = await follow(r, 'swap');
          }
          out.innerHTML = r.dryRun
            ? '<div class="note">DRY_RUN — simulated, nothing sent.</div>'
            : `<div class="ok">sold <b>${fmt(r.sold ?? pv.sell.amount, 4)} ${esc(pv.sell.symbol)}</b> for <b>${fmt(r.received ?? pv.receive.amount, 4)} ${esc(pv.receive.symbol)}</b>`
              + (r.spotAfter ? ` · pool now ${price(r.spotAfter)} (${r.gapAfterPercent >= 0 ? '+' : ''}${fmt(r.gapAfterPercent, 2)}% vs market)` : '')
              + (r.partial ? ' · partial: the wallet ran short' : '')
              + (r.bought?.txUrl ? ` · <a href="${esc(r.bought.txUrl)}" target="_blank">buy tx</a>` : '') + (r.url ? ` · <a href="${esc(r.url)}" target="_blank">swap tx</a>` : '') + '</div>';
          if (!r.dryRun) setTimeout(load, 2500);
        } catch (err) {
          out.innerHTML = `<div class="alert">${esc(err.message)}</div>`;
        }
      };
    } catch (err) {
      out.innerHTML = `<div class="alert">${esc(err.message)}</div>`;
    }
  })();
}

$('list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-act]');
  if (!b) return;
  // The card only reads what is already on screen -- nothing is signed.
  if (b.dataset.act === 'card') downloadPnlCard(b.dataset.id, ALL);
  else onPositionAction(b.dataset.id, b.dataset.act, b.dataset.proto ?? 'v4');
});

function render() {
  const rows = ALL.filter((p) => (TAB === 'live' ? isLive(p) : !isLive(p)));
  $('list').className = 'tablehost';
  $('list').innerHTML = rows.length
    ? renderPositionsTable(rows, {
      actions: TAB === 'live',
      // Both are Uniswap v4 calls, which every EVM chain here has; the row
      // itself hides them on a v3 or DLMM position. This used to name Arc,
      // the chain they were first tried on.
      compound: TAB === 'live' && CFG?.chainKind === 'evm',
      realign: TAB === 'live' && CFG?.chainKind === 'evm',
    })
    : `<div class="hint">No ${TAB} positions.</div>`;
  loadActivity();
}
