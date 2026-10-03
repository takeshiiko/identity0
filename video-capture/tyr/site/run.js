/* run.html's own script, lifted out of the page so the CSP can refuse
   inline script entirely. Loaded after common.js, in the same order it
   ran inline. */
let CFG = null, TOKEN = null, QUOTE = null, PLAN = null, LAST = null;




/**
 * The advanced settings are pickers with a "custom…" escape. A picker reads
 * as the number it shows; custom reads the field beside it. Setting a value
 * the list does not have switches to custom rather than silently to blank.
 */
const PICKS = ['feePct', 'spacing', 'rangePct', 'slip', 'binStep'];
function pickVal(id) {
  const sel = $(id);
  return sel.value === 'custom' ? $(`${id}-custom`).value.trim() : sel.value;
}
function setPick(id, value) {
  const sel = $(id);
  const has = [...sel.options].some((o) => o.value === String(value));
  const hasCustom = [...sel.options].some((o) => o.value === 'custom');
  sel.value = has ? String(value) : (hasCustom ? 'custom' : sel.options[0]?.value);
  if (!has && hasCustom) $(`${id}-custom`).value = value;
  $(`${id}-custom`).classList.toggle('hidden', sel.value !== 'custom');
}
for (const id of PICKS) {
  $(id).addEventListener('change', () => {
    const custom = $(id).value === 'custom';
    $(`${id}-custom`).classList.toggle('hidden', !custom);
    if (custom) $(`${id}-custom`).focus();
  });
}

function boot() {
  $('m-wallet').textContent = CFG.wallet ?? $('m-wallet').textContent;
  // The defaults used to be named in the header too; the ticket itself
  // shows every one of them, already set.
  $('quote').value = CFG.quoteToken;
  // Name what the confirm button signs. It used to say "Permit2 approvals and a
  // PositionManager multicall on chain 4663" on every chain, including the one
  // with none of those things.
  $('exec-note').textContent = CFG.chainKind === 'svm'
    ? `This signs a Meteora DAMM v2 pool creation on ${CFG.chainName} and pays account rent. Re-read the report before confirming.`
    : `This signs the approvals and a position-manager multicall on ${CFG.chainName}. Re-read the report before confirming.`;
  setPick('feePct', CFG.defaults.feePercent);
  setPick('spacing', CFG.defaults.tickSpacing);
  setPick('rangePct', CFG.defaults.rangePercent);
  setPick('slip', CFG.defaults.slippagePercent);
  HAS_PROTOS = CFG.chainKind === 'svm' ? Boolean(CFG.dlmm) : Boolean(CFG.v3Positions);
  setProto(HAS_PROTOS ? PROTO : protoPair()[0][0]);
  // The budget starts empty on purpose. A number already in the field is a
  // number someone can send without ever deciding it -- and on Solana the
  // quote is SOL, where a forgotten 100 is not a rounding error.
  $('total').value = '';
  $('total').placeholder = `up to ${CFG.defaults.maxQuoteSpend}`;
  // The picker hangs off the market panel's own header. A chain with no
  // price feed has no market panel, so there it falls back to the ticket,
  // under the mode row that asks for it.
  if (!CFG.hasMarket) {
    $('pool-list').classList.remove('in-head');
    $('mode-block').appendChild($('pool-list'));
  }
  // The ladder is a DLMM shape: offered only where DLMM is.
  $('preset-block').classList.toggle('hidden', !CFG.dlmm);
  // The cards start on two-sided, and a card owns the venue -- so the card
  // has to actually set it rather than leave whatever the boot default was.
  if (presetsOn()) setPreset(PRESET);
  // The mode starts on `create` from the markup, so nothing has run through
  // setMode yet -- and the words that explain the two buttons live there now.
  setMode(MODE);
  if (CFG.dryRun) $('m-dry').classList.remove('hidden');
  prefillFromQuery();
  loadBalances();
  watchTicket();
}

/**
 * The wallet page's "pair" button lands here. It carries the token and the fact
 * that we already hold it; the budget stays blank because only the operator
 * knows how much of the bag to commit.
 */
function prefillFromQuery() {
  const q = new URLSearchParams(location.search);
  const ca = q.get('ca');
  if (!isTokenAddress(ca)) return;
  $('ca').value = ca;
  if (q.get('skipBuy') === '1') {
    $('skipBuy').checked = true;
    // skipBuy lives under <details>; opening it keeps the setting visible
    // instead of silently changing what the run does.
    $('skipBuy').closest('details')?.setAttribute('open', '');
  }
  // The rest of the ticket, as a rebalance hands it over: the same pool and
  // the same settings, so only the band is being decided again.
  if (q.get('proto')) setProto(q.get('proto'));
  if (q.get('shape')) setShape(q.get('shape'));
  if (q.get('mode')) setMode(q.get('mode'));
  for (const [param, pick] of [['fee', 'feePct'], ['spacing', 'spacing'], ['range', 'rangePct'], ['slip', 'slip'], ['binStep', 'binStep']]) {
    if (q.get(param)) setPick(pick, q.get(param));
  }
  // Which ladder it was, if it was one. Applied before the rest, because a
  // preset sets the shape and the band wholesale and the explicit values
  // below are the ones the closed position actually held.
  if (q.get('preset')) setPreset(q.get('preset'));
  if (q.get('budget')) $('total').value = q.get('budget');
  // The pool the closed position was in, not whichever is deepest now.
  if (q.get('pool')) JOIN_POOL = q.get('pool');
  // Its band, side by side: a position that was 40% below and 20% above
  // stays that way rather than snapping back to the symmetric default. One
  // side may be zero -- that is what a ladder is.
  const lower = Number(q.get('rangeLower')); const upper = Number(q.get('rangeUpper'));
  const sides = lower > 0 || upper > 0 ? { lower: Math.max(0, Math.round(lower)), upper: Math.max(0, Math.round(upper)) } : null;
  if (sides) {
    RANGE_SIDES = { ...sides };
    // The picker shows one number for a band with two sides. On a ladder
    // only one side exists, and the average of it and a zero is a reach the
    // position never had.
    setPick('rangePct', sides.lower && sides.upper
      ? Math.round((sides.lower + sides.upper) / 2)
      : Math.max(sides.lower, sides.upper));
  }
  // What the close actually returned. The run pairs at most this much, so a
  // separate bag of the same token stays out of the new position.
  const cap = q.get('tokenAmount');
  REBALANCE = (cap && Number(cap) > 0) || sides
    ? { tokenCap: cap && Number(cap) > 0 ? cap : null, sides, token: ca, from: q.get('rebalance') ?? null }
    : null;
  const from = q.get('rebalance');
  if (from) {
    const note = document.createElement('div');
    note.className = 'note';
    note.id = 'rebalance-note';
    const short = from.length > 12 ? `${from.slice(0, 6)}…${from.slice(-4)}` : from;
    note.innerHTML = `Rebalancing <b>#${esc(short)}</b> — closed, and the ${esc(q.get('sym') ?? 'tokens')} it held `
      + 'are in the wallet. The pool, the fee and the band come from it'
      + (REBALANCE?.tokenCap ? `, and only the <b>${esc(fmt(REBALANCE.tokenCap, 4))} ${esc(q.get('sym') ?? 'tokens')}</b> it returned are paired` : '')
      + '. The shape is not recorded on chain, so it starts at spot. Press run, then execute.';
    $('ca').closest('.body')?.prepend(note);
  }
  $('total').focus();
}

let BAL = null;   // the last /api/balances answer, for MAX and the budget line
async function loadBalances() {
  try {
    const b = await api('/api/balances');
    BAL = b;
    // Say the wallet cannot afford to act before the moment of signing, at the
    // floor this chain actually needs -- Solana charges account rent to open a
    // pool, so its floor is far above what a transaction costs.
    const lowGas = Number(b.nativeHuman) < (CFG.defaults.lowNativeBalance ?? 0.0015);
    $('m-bal').innerHTML = `${fmt(b.quoteHuman, 4)} ${esc(b.quoteSymbol)} · `
      + `<span style="color:${lowGas ? 'var(--warn)' : 'inherit'}">${fmt(b.nativeHuman, 5)} `
      + `${esc(CFG.nativeSymbol ?? 'ETH')}${lowGas ? ' — low, top up' : ''}</span>`;
    // The budget covers BOTH legs, so it can never exceed the quote balance.
    $('total').max = b.quoteHuman;
    $('btn-max').title = `fill in what the wallet can commit — it holds ${fmt(b.quoteHuman, 5)} ${b.quoteSymbol}`
      + (b.quoteSymbol === (CFG?.nativeSymbol ?? '') ? `, and ${NATIVE_RESERVE} is left for rent and fees` : '');
    budgetHint();
  } catch { /* header nicety only */ }
}




/**
 * v4 or v3. v3 is offered only where the chain registry has the v3 position
 * manager (Arc). Its fee is one of four factory tiers and its spacing follows
 * the tier, so those two pickers change shape with the protocol; and a v3
 * pool is one per (pair, fee), so "join" is not a choice -- the plan joins
 * the tier's pool if it exists and creates it if not.
 */
let PROTO = 'v4';
let SHAPE = 'spot';
// Two protocols per chain kind: the EVM pair is Uniswap v4/v3, the Solana
// pair Meteora DAMM v2/DLMM. The switch's two buttons carry whichever the
// chain has; the first is the default.
const PROTOS = {
  evm: [['v4', 'uniswap v4'], ['v3', 'uniswap v3']],
  svm: [['damm', 'meteora damm v2'], ['dlmm', 'meteora dlmm']],
};
const PROTO_HINTS = {
  v4: 'v4: any fee you like, native-key pools, compound and increase — but the chain\'s aggregators and radardex route v3 only.',
  v3: 'v3: fee is one of 0.01 / 0.05 / 0.3 / 1%; the pool for a tier is shared, so this joins it if it exists (at its price) or opens it at the market. This is what radardex and the routers see.',
  damm: 'DAMM v2: one curve over one range shared by the whole pool. Simple, one transaction.',
  dlmm: 'DLMM: liquidity in price bins with a shape — flat, piled at the price, or pushed to the edges. One position holds up to 69 bins; the bin step sets how far that reaches.',
};
const SHAPE_HINTS = {
  spot: 'Even across every bin. No view on where price settles.',
  curve: 'Heaviest at the current price, thinning to the edges. For a price you expect to stay put.',
  bidask: 'Heaviest at the edges. Buys more as price falls and sells more as it rises — a ladder, the shape that would have sold the PEG run-up gradually instead of all at the top.',
};
const FEE_OPTIONS = {
  v4: '<option value="0.3">0.3%</option><option value="1">1%</option><option value="2">2%</option>'
    + '<option value="5">5%</option><option value="10">10%</option><option value="25">25%</option>'
    + '<option value="50">50%</option><option value="custom">custom…</option>',
  v3: '<option value="0.01">0.01%</option><option value="0.05">0.05%</option><option value="0.3">0.3%</option><option value="1">1%</option>',
  damm: '<option value="0.25">0.25%</option><option value="1">1%</option><option value="2">2%</option><option value="4">4%</option>'
    + '<option value="6">6%</option><option value="10">10%</option><option value="custom">custom…</option>',
  dlmm: '<option value="0.25">0.25%</option><option value="0.5">0.5%</option><option value="1">1%</option><option value="2">2%</option>'
    + '<option value="4">4%</option><option value="10">10%</option><option value="custom">custom…</option>',
};
function protoPair() { return PROTOS[CFG?.chainKind === 'svm' ? 'svm' : 'evm']; }
let HAS_PROTOS = false;
/** Are the strategy cards on this chain? They are a DLMM shape. */
function presetsOn() { return Boolean(CFG?.dlmm); }
/**
 * Which rows the ticket shows. The venue and the shape are the two questions a
 * strategy card already answers, so a card hides them and `custom` hands them
 * back; the mode is not one of them -- create-or-join is a decision every run
 * makes, ladder or not. The bin step and the tick spacing follow the venue,
 * because on the other one they set nothing.
 */
function syncManual() {
  const manual = !presetsOn() || PRESET === 'custom';
  $('proto-block').classList.toggle('hidden', !(HAS_PROTOS && manual));
  $('shape-block').classList.toggle('hidden', !(PROTO === 'dlmm' && manual));
  $('mode-block').classList.toggle('hidden', PROTO === 'v3');
  $('pick-binstep').classList.toggle('hidden', PROTO !== 'dlmm');
  $('pick-spacing').classList.toggle('hidden', PROTO === 'v3' || CFG?.chainKind === 'svm');
}
function setProto(proto) {
  const [a, b] = protoPair();
  if (proto !== a[0] && proto !== b[0]) proto = a[0];
  PROTO = proto;
  $('proto-v4').textContent = a[1]; $('proto-v3').textContent = b[1];
  $('proto-v4').classList.toggle('on', proto === a[0]);
  $('proto-v3').classList.toggle('on', proto === b[0]);
  // The explanation used to be a paragraph under the row. Five of those, one
  // per row, were most of what the ticket was -- the words are the same, they
  // just wait to be asked for now, and the sentence above RUN says the rest.
  $('proto-v4').title = PROTO_HINTS[a[0]]; $('proto-v3').title = PROTO_HINTS[b[0]];
  syncManual();
  const fee = pickVal('feePct');
  $('feePct').innerHTML = FEE_OPTIONS[proto];
  const allowed = [...$('feePct').options].map((o) => o.value);
  setPick('feePct', allowed.includes(String(Number(fee))) || allowed.includes('custom') ? fee : allowed[allowed.length - 1]);
  if (proto === 'v3') setMode('create');
  if (CFG?.chainKind === 'svm') {
    $('exec-note').textContent = proto === 'dlmm'
      ? `This signs a Meteora DLMM pair creation (when the pair is new) and a shaped position on ${CFG.chainName}, and pays account rent. Re-read the report before confirming.`
      : `This signs a Meteora DAMM v2 pool creation on ${CFG.chainName} and pays account rent. Re-read the report before confirming.`;
  }
}
$('proto-v4').onclick = () => { setProto(protoPair()[0][0]); if (!PLAN) watchTicket(); };
$('proto-v3').onclick = () => { setProto(protoPair()[1][0]); if (!PLAN) watchTicket(); };
function setShape(shape) {
  SHAPE = shape;
  for (const k of ['spot', 'curve', 'bidask']) {
    $(`shape-${k}`).classList.toggle('on', k === shape);
    $(`shape-${k}`).title = SHAPE_HINTS[k];
  }
}
for (const k of ['spot', 'curve', 'bidask']) $(`shape-${k}`).onclick = () => { setShape(k); if (LAST && PROTO === 'dlmm') replanRange(RANGE_SIDES ?? { lower: Number(pickVal('rangePct')), upper: Number(pickVal('rangePct')) }); else if (CFG?.hasMarket) drawChart(null, null); };

/**
 * The sell ladder: the tokens you already hold, laddered above the price.
 *
 * A band that starts at the price and reaches up holds no quote at all, so
 * every bin is token waiting to be sold. Rising price fills the ladder from
 * the bottom and pays the pool's fee on each fill; falling price leaves the
 * band behind, which is the point -- the position never buys the way down,
 * the way a two-sided one does.
 */
const PRESET_HINTS = {
  none: 'A plain two-sided position around the price: half the budget each side, earning in both directions until the price leaves the band.',
  custom: 'Pick the venue, the shape and the band yourself. Nothing is set for you.',
  ladder: 'Your tokens only, laddered from the price upward: it sells into a rise and '
    + 'earns the fee on every fill. It never buys a fall. Needs the tokens in the wallet already.',
  bid: 'Your quote only, laddered from the price downward: it buys a fall in steps and earns the '
    + 'fee on every fill instead of paying one. It never sells a rise — you end up holding the '
    + 'token, so run it on one you would want cheaper.',
};
let PRESET = 'none';
function setPreset(name) {
  PRESET = name;
  for (const [id, key] of [['preset-clear', 'none'], ['preset-ladder', 'ladder'], ['preset-bid', 'bid'], ['preset-custom', 'custom']]) {
    $(id).classList.toggle('on', name === key);
    $(id).setAttribute('aria-pressed', String(name === key));
    $(id).title = PRESET_HINTS[key];
  }
  if (name === 'custom') {
    // Nothing is set: custom is the escape from the cards, not a fifth shape.
    // Whatever the last card left behind stays, and the rows come back so it
    // can be seen and changed.
  } else if (name === 'ladder') {
    setProto('dlmm');
    setShape('bidask');
    setMode('join');
    $('skipBuy').checked = true;
    $('skipBuy').closest('details')?.setAttribute('open', '');
    $('total').value = '';
    // Up from the price, and nothing below it.
    const up = Math.max(50, Number(pickVal('rangePct')) || 100);
    RANGE_SIDES = { lower: 0, upper: up };
    setPick('rangePct', up);
    // 69 bins at a 2.5% step reach about +440%: enough room for a token that runs.
    if (pickVal('binStep') === 'auto') setPick('binStep', 250);
  } else if (name === 'bid') {
    setProto('dlmm');
    // Weight in the middle rather than at the edges: going down, bid-ask
    // spends most of the budget at the very bottom of the band, which is
    // the worst place to have spent it if the price keeps going.
    setShape('spot');
    setMode('join');
    $('skipBuy').checked = true;
    $('skipBuy').closest('details')?.setAttribute('open', '');
    // Down from the price, and nothing above it.
    const down = Math.min(90, Math.max(20, Number(pickVal('rangePct')) || 50));
    RANGE_SIDES = { lower: down, upper: 0 };
    setPick('rangePct', down);
    if (pickVal('binStep') === 'auto') setPick('binStep', 100);
  } else {
    // DLMM where the chain has it. A two-sided position works on either
    // venue, but only DLMM's band can be dragged on the chart and only DLMM
    // has a shape -- picking DAMM v2 for the default card hid both behind
    // `custom`. DAMM v2 is still one click away, there.
    setProto(presetsOn() ? 'dlmm' : protoPair()[0][0]);
    setShape('spot');
    $('skipBuy').checked = false;
    RANGE_SIDES = null;
  }
  syncManual();
  budgetHint();
  if (LAST && PROTO === 'dlmm') replanRange(RANGE_SIDES ?? { lower: Number(pickVal('rangePct')), upper: Number(pickVal('rangePct')) });
  else if (CFG?.hasMarket) drawChart(null, null);
}
$('preset-ladder').onclick = () => setPreset('ladder');
$('preset-bid').onclick = () => setPreset('bid');
$('preset-clear').onclick = () => setPreset('none');
$('preset-custom').onclick = () => setPreset('custom');

/** What the budget field means right now -- it means two different things. */
function budgetHint() {
  const skip = $('skipBuy').checked;
  $('total').title = PRESET === 'bid'
    ? 'The whole budget waits under the price, and buys as it falls.'
    : skip
      ? 'Nothing is bought — the budget is the quote leg only, and may be left empty.'
      : 'Half of it buys the token; half becomes the quote leg.';
  $('total').placeholder = skip ? 'optional' : `up to ${CFG?.defaults?.maxQuoteSpend ?? ''}`;
  // Say which of the two ticked the box, because on a ladder it ticks itself.
  $('skip-why').textContent = skip && (PRESET === 'ladder' || PRESET === 'bid')
    ? `  — set by the ${PRESET === 'bid' ? 'buy' : 'sell'} ladder` : '';
}
$('skipBuy').addEventListener('change', budgetHint);

/**
 * MAX: what the wallet can actually commit, not what it holds.
 *
 * On Solana the quote IS the gas token, so filling the field with the whole
 * balance leaves nothing for the rent a position allocates -- the run would
 * get as far as signing and then fail. It stops short of the balance by that
 * much, and the server's own ceiling still caps it.
 */
const NATIVE_RESERVE = 0.05;
$('btn-max').onclick = () => {
  if (!BAL) return;
  const native = BAL.quoteSymbol === (CFG?.nativeSymbol ?? '');
  const room = Math.max(0, Number(BAL.quoteHuman) - (native ? NATIVE_RESERVE : 0));
  const cap = Number(CFG?.defaults?.maxQuoteSpend);
  const v = Math.min(room, cap > 0 ? cap : room);
  $('total').value = v > 0 ? String(Number(v.toFixed(6))) : '';
  $('total').dispatchEvent(new Event('input', { bubbles: true }));
  $('total').focus();
};
$('btn-max').title = 'fill in what the wallet can commit';

/**
 * The tuning drawer's handle. Closed, it is the only thing on screen that says
 * what is inside it, so it prints the values and not the word "settings".
 */
function tuningSummary() {
  const bits = [];
  const fee = pickVal('feePct');
  if (fee) bits.push(`${fee}%`);
  const rp = Number(pickVal('rangePct')) || 0;
  const lo = Math.round(RANGE_SIDES?.lower ?? rp); const up = Math.round(RANGE_SIDES?.upper ?? rp);
  bits.push(lo && up ? (lo === up ? `±${up}%` : `−${lo}%/+${up}%`)
    : up ? `0/+${up}%` : lo ? `−${lo}%/0` : 'no band');
  if (!$('pick-binstep').classList.contains('hidden')) {
    const b = pickVal('binStep');
    bits.push(`bin ${!b || b === 'auto' ? 'auto' : `${Number(b) / 100}%`}`);
  }
  if (!$('pick-spacing').classList.contains('hidden')) bits.push(`spacing ${pickVal('spacing')}`);
  const slip = pickVal('slip');
  if (slip) bits.push(`slip ${slip}%`);
  const text = bits.join(' · ');
  if ($('tuning-sum').textContent !== text) $('tuning-sum').textContent = text;
}

/**
 * What the run will do, in a sentence, directly above the key that runs it.
 *
 * The echo under it prints the command; this prints the consequence. It names
 * the three things that decide whether a run was a mistake -- whether anything
 * is bought, which side of the price the money ends up on, and whose pool it
 * lands in -- because none of them are obvious from a column of values.
 */
let MKT_SYM = null;   // the ticker, once the market panel has read one
function runSummary() {
  const el = $('run-sum'); const cost = $('run-cost');
  const ca = $('ca').value.trim();
  const sym = TOKEN?.symbol || MKT_SYM || 'the token';
  const quote = $('u-quote').textContent || 'quote';
  const raw = $('total').value.trim(); const budget = Number(raw);
  const skip = $('skipBuy').checked;
  const say = (html, sub = '') => {
    if (el.dataset.h !== html) { el.dataset.h = html; el.innerHTML = html; }
    if (cost.dataset.h !== sub) { cost.dataset.h = sub; cost.innerHTML = sub; }
  };
  if (!isTokenAddress(ca)) return say('Paste a token address to see what a run would do.');
  if (!skip && !(budget > 0)) return say(`Type a budget — how much <b>${esc(quote)}</b> to commit to <b>${esc(sym)}</b>.`);
  if (raw !== '' && !(budget >= 0)) return say('The budget has to be a number.');

  const half = fmt(budget / 2, 4);
  const legs = skip
    ? (budget > 0
      ? `Pairs the <b>${esc(sym)}</b> already in the wallet with <b>${esc(fmt(budget, 4))} ${esc(quote)}</b>`
      : `Pairs the <b>${esc(sym)}</b> already in the wallet — nothing is bought`)
    : `Buys <b>${esc(half)} ${esc(quote)}</b> of <b>${esc(sym)}</b> and pairs it with the other <b>${esc(half)}</b>`;

  const rp = Number(pickVal('rangePct')) || 0;
  const lo = Math.round(RANGE_SIDES?.lower ?? rp); const up = Math.round(RANGE_SIDES?.upper ?? rp);
  const reach = PROTO === 'dlmm' ? 'laddered' : 'reaching';
  const band = lo && up ? (lo === up ? `across <b>±${up}%</b> of the price` : `across <b>−${lo}% / +${up}%</b> of the price`)
    : up ? `${reach} from the price <b>up to +${up}%</b>`
    : lo ? `${reach} from the price <b>down to −${lo}%</b>`
    : 'at the price itself';

  const venue = (protoPair().find(([k]) => k === PROTO) || [])[1] ?? PROTO;
  const pool = PLAN?.poolId ? ` <b>${esc(`${PLAN.poolId.slice(0, 4)}…${PLAN.poolId.slice(-4)}`)}</b>` : '';
  const where = MODE === 'join'
    ? `in the ${esc(venue)} pool it already trades in${pool}`
    : `in a new ${esc(venue)} pool of your own at <b>${esc(pickVal('feePct'))}%</b>`;

  // The numbers only a planned run knows: before that the line stays empty.
  const bits = [];
  if (PLAN?.rent) bits.push(`rent ~${fmt(PLAN.rent.totalSol, 3)} SOL${PLAN.rent.estimated ? ' (est.)' : ''}`);
  if (PLAN?.fee?.nowPercent > 0) bits.push(`fee now <b>${fmt(PLAN.fee.nowPercent, 2)}%</b>`);
  if (PLAN?.activeShare?.percent > 0) bits.push(`~${fmt(PLAN.activeShare.percent, 2)}% of the active bin (est.)`);
  say(`${legs}, ${band}, ${where}.`, bits.join(' · '));
}

/** RUN carries what it is still waiting for, so six hints do not have to. */
function runKey() {
  const b = $('btn-run');
  if (b.disabled) return;
  const ca = isTokenAddress($('ca').value.trim());
  const raw = $('total').value.trim(); const n = Number(raw);
  const label = !ca ? 'paste a token'
    : !$('skipBuy').checked && !(n > 0) ? 'type a budget'
    : raw !== '' && !(n >= 0) ? 'budget is not a number'
    : 'run';
  if (b.textContent !== label) b.textContent = label;
  b.classList.toggle('wait', label !== 'run');
  // Nothing to fill in until a wallet has been read.
  $('btn-max').disabled = !BAL;
}

/** The quote is the chain's own token: shown, and typed only on purpose. */
$('btn-quote-edit').onclick = () => {
  $('quote').classList.remove('hidden');
  $('quote-show').classList.add('hidden');
  $('btn-quote-edit').classList.add('hidden');
  $('quote').focus();
};

let MODE = 'create';
const MODE_HINTS = {
  create: "Your own pool: you set the fee and keep all of it, but only if trades route to you.",
  join: "The pool the token already trades in: the flow is there, but you earn its fee tier split by your share of the liquidity.",
};
let JOIN_POOL = null;   // chosen pool id, null = the deepest one
// It hangs over the chart now, so it closes the way a menu does: a click
// anywhere that is not inside it puts it away.
document.addEventListener('click', (e) => {
  const d = $('poolpick');
  if (d?.open && !d.contains(e.target)) { d.open = false; POOLS_OPEN = false; }
});
// Whether the pool list is unfolded. It starts shut: the bar already says
// which pool you are in, and the count says how many others there are.
let POOLS_OPEN = false;

function setMode(mode) {
  MODE = mode;
  $('mode-create').classList.toggle('on', mode === 'create');
  $('mode-join').classList.toggle('on', mode === 'join');
  $('mode-create').title = MODE_HINTS.create; $('mode-join').title = MODE_HINTS.join;
  $('pool-list').classList.toggle('hidden', mode !== 'join');
  if (mode === 'join') loadPools();
  // The mode decides whether the band on the chart is yours to set at all --
  // a DAMM v2 join adds to the pool's own curve -- so the preview has to be
  // redrawn, or it keeps the last mode's lines and its last mode's handlers.
  if (!PLAN && CFG?.hasMarket) drawChart(null, null);
}

/**
 * A token usually has many pools -- CUTE/USDG has 20, SPY/USDG has 91 -- and
 * which one you join decides both the fee you earn and how big your share is.
 * Picking one silently would be picking for the operator.
 */
/** The market reference, and how far each pool has drifted from it. */
function renderDeviation(p) {
  if (p.isReference) return '<span class="dev ref">market</span>';
  const d = p.deviationPercent;
  if (d === null || d === undefined) return '<span class="dev"></span>';
  const cls = Math.abs(d) > 25 ? 'bad' : Math.abs(d) > 5 ? 'warn' : 'ok';
  return `<span class="dev ${cls}">${d >= 0 ? '+' : ''}${fmt(d, 1)}%</span>`;
}

/**
 * The pool's address, short, and a link when the explorer has a page for it.
 * A Solana pool is an account, so Solscan does; a v4 pool id is a hash of its
 * key, not an address, so nothing does -- it is shown, not linked.
 */
function renderPoolAddr(id) {
  if (!id) return '<span class="pa"></span>';
  const short = `${id.slice(0, 4)}…${id.slice(-4)}`;
  const linkable = CFG?.chainKind === 'svm' && CFG?.explorer;
  const inner = linkable
    ? `<a href="${esc(CFG.explorer)}/account/${esc(id)}" target="_blank" rel="noopener" data-stop>${esc(short)}</a>`
    : esc(short);
  // Clicking the address must not toggle the radio it sits inside; copy is
  // what someone reaching for an address usually wants. The handler is bound
  // once, below: an onclick attribute is script the CSP would have to allow.
  return `<span class="pa" data-copy="${esc(id)}" title="${esc(id)}">${inner}</span>`;
}

async function loadPools() {
  const ca = $('ca').value.trim();
  const box = $('pool-list');
  if (!isTokenAddress(ca)) {
    box.innerHTML = '<p class="hint">Paste a token address to list its pools.</p>';
    return;
  }
  box.innerHTML = '<p class="hint">listing pools…</p>';
  try {
    const q = encodeURIComponent($('quote').value.trim());
    const { pools } = await api(`/api/pools?token=${ca}&quote=${q}&withLiquidityOnly=1`);
    if (!pools.length) {
      // The mode selector is sticky, so a token with nothing to join would
      // otherwise strand the operator on an option that cannot work.
      JOIN_POOL = null;
      setMode('create');
      $('pool-list').classList.remove('hidden');
      $('pool-list').innerHTML =
        '<div class="note">No v4 pool with liquidity for this pair, so there is nothing to join — '
        + 'switched to <b>open my own</b>.</div>';
      return;
    }
    // Only some venues can be joined -- a Meteora DLMM pool is listed for its
    // price and depth, but this bot mints DAMM v2 positions and choosing one
    // would fail at signing. The default has to be a pool we can actually use.
    const joinable = pools.filter((p) => p.joinable !== false);
    if (!joinable.length) {
      JOIN_POOL = null;
      setMode('create');
      box.classList.remove('hidden');
      box.innerHTML = '<div class="note">Pools exist for this pair, but none this bot can '
        + 'join — switched to <b>open my own</b>.</div>';
      return;
    }
    // Deepest first, and the default is the top of that order rather than
    // whatever the feed happened to list first -- the list is now sorted the
    // same way, so the pool the bar names is the pool at the top of it.
    joinable.sort((a, b) => Number(b.depthQuoteHuman ?? 0) - Number(a.depthQuoteHuman ?? 0));
    JOIN_POOL = JOIN_POOL && joinable.some((p) => p.poolId === JOIN_POOL) ? JOIN_POOL : joinable[0].poolId;
    const off = pools.filter((p) => !p.isReference && Math.abs(p.deviationPercent ?? 0) > 5).length;

    // Grouped by venue rather than listed flat. The two are not alternatives:
    // one is where this bot can mint, the other is only evidence about price.
    // A single list interleaved them by depth, which read as one menu of
    // equal choices with three of the entries mysteriously greyed out.
    const groups = [];
    for (const p of pools) {
      const key = p.venue ?? 'pool';
      let g = groups.find((x) => x.venue === key);
      if (!g) groups.push(g = { venue: key, rows: [], joinable: p.joinable !== false, depth: 0 });
      g.rows.push(p);
      g.depth += Number(p.depthQuoteHuman ?? 0);
    }
    // The venue this bot can actually mint into leads, whichever is deeper:
    // the left column is where the decision gets made.
    groups.sort((a, b) => (b.joinable ? 1 : 0) - (a.joinable ? 1 : 0));
    const sym = pools[0]?.quoteSymbol ?? '';

    // Deepest first inside a venue: the list is a ranking, and the pool this
    // bot would have picked on its own should be the one at the top of it.
    for (const g of groups) g.rows.sort((a, b) => Number(b.depthQuoteHuman ?? 0) - Number(a.depthQuoteHuman ?? 0));
    const chosen = pools.find((x) => x.poolId === JOIN_POOL) ?? null;
    const chosenOff = chosen && !chosen.isReference && Math.abs(chosen.deviationPercent ?? 0) > 5;

    // Collapsed, the panel is the pool you are in; open, it is every pool you
    // could be in. A token with 91 of them used to print all 91 down the
    // right-hand column, and the one that mattered -- the chosen one -- was
    // a highlighted row somewhere inside that.
    box.innerHTML = `<details class="poolpick" id="poolpick"${POOLS_OPEN ? ' open' : ''}>
        <summary class="pp-bar">
          <span class="pp-l">pool</span>
          <span class="venue pp-venue">${esc(chosen?.venue ?? '—')}</span>
          <span class="pp-fee">${esc(chosen?.feeLabel ?? '—')}</span>
          <span class="pp-sub">${chosen
            ? `depth ${esc(chosen.depthQuoteHuman ?? '—')} ${esc(sym)}`
            : 'none chosen'}</span>
          ${chosen ? renderDeviation(chosen) : ''}
          <span class="pp-count">${pools.length}</span>
        </summary>
        <div class="pp-body">
          <p class="hint">You mint at the chosen pool's own price. A pool far from the market
            opens your position at a price nobody else agrees with — the gap is what the first
            arbitrage takes.${off ? ` <b>${off}</b> of these are more than 5% away.` : ''}</p>
          <div class="poolgrid">${groups.map((g) => `
        <section class="venuegroup${g.joinable ? '' : ' ro'}">
          <div class="vg-head">
            <span class="vg-name">${esc(g.venue)}</span>
            <span class="vg-sum">${g.rows.length} · ${fmt(g.depth, 3)} ${esc(sym)}</span>
          </div>
          <div class="vg-body">${g.rows.map((p) => `
            <label class="poolrow${p.poolId === JOIN_POOL ? ' on' : ''}${g.joinable ? '' : ' ro'}"
                   title="${esc(p.poolId)}">
              <input type="radio" name="pool" value="${esc(p.poolId)}"
                     ${p.poolId === JOIN_POOL ? 'checked' : ''} ${g.joinable ? '' : 'disabled'}>
              <span class="pf">${esc(p.feeLabel)}</span>
              <span class="pp">${p.price === null ? '—' : fmt(p.price, 8)}</span>
              ${renderDeviation(p)}
              <span class="pd">${p.depthQuoteHuman !== undefined
                ? `${esc(p.depthQuoteHuman)}`
                : `L ${fmt(p.liquidity, 0)}`}</span>
              ${renderPoolAddr(p.poolId)}
            </label>`).join('')}
          </div>
          <div class="vg-foot">${g.joinable
            ? 'this bot mints here'
            : 'reference only — priced, not mintable'}</div>
        </section>`).join('')}</div>
        </div>
      </details>`;

    // The chosen pool being off the market is the one thing worth seeing with
    // the list shut, so the bar carries it rather than the paragraph inside.
    $('poolpick').classList.toggle('off', Boolean(chosenOff));
    $('poolpick').addEventListener('toggle', () => { POOLS_OPEN = $('poolpick').open; });

    box.querySelectorAll('input[name=pool]').forEach((r) => {
      r.onchange = () => {
        JOIN_POOL = r.value;
        box.querySelectorAll('.poolrow').forEach((el) => el.classList.remove('on'));
        r.closest('.poolrow').classList.add('on');
        // Picking one is the end of picking: the bar now says what you chose.
        POOLS_OPEN = false;
        loadPools();
      };
    });
  } catch (e) {
    box.innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}
$('ca').addEventListener('change', () => { if (MODE === 'join') loadPools(); });
$('mode-create').onclick = () => setMode('create');
$('mode-join').onclick = () => setMode('join');

/**
 * Switching pool mode after the buy must not cost another buy, so it re-prices
 * the holdings we already have instead of re-running.
 */
function replanPayload(mode) {
  return {
    tokenAddress: $('ca').value.trim(),
    quoteAddress: $('quote').value.trim(),
    quoteAmount: LAST.split ? LAST.split.lpQuote : $('total').value.trim(),
    tokenAmountHuman: LAST.tokenAmountHuman,
    fee: Math.round(Number(pickVal('feePct')) * 10000),
    tickSpacing: Number(pickVal('spacing')),
    rangePercent: Number(pickVal('rangePct')),
    slippage: Number(pickVal('slip')),
    poolMode: mode,
    joinPoolId: mode === 'join' ? JOIN_POOL : null,
    protocol: PROTO,
    shape: SHAPE,
    binStep: pickVal('binStep') === 'auto' ? null : Number(pickVal('binStep')),
    rangeLowerPercent: RANGE_SIDES?.lower ?? null,
    rangeUpperPercent: RANGE_SIDES?.upper ?? null,
  };
}

// Both of the above, bound once on the page rather than written into the
// markup: an inline handler is script, and the CSP no longer allows any.
document.addEventListener('click', (e) => {
  const sw = e.target.closest('[data-switch]');
  if (sw) { e.preventDefault(); switchMode(sw.dataset.switch); return; }
  const stop = e.target.closest('[data-stop]');
  if (stop) { e.stopPropagation(); return; }
  const copy = e.target.closest('[data-copy]');
  if (copy) { e.preventDefault(); navigator.clipboard?.writeText(copy.dataset.copy); }
});

async function switchMode(mode) {
  if (!LAST) return;
  setStatus('s2', 're-pricing…', 'var(--acc2)');
  try {
    const r = await api('/api/replan', replanPayload(mode));
    setMode(mode);
    PLAN = r.plan;
    $('report-out').innerHTML = renderReport(LAST, r.plan);
    setStatus('s2', 'ready', 'var(--acc)');
  } catch (e) {
    $('exec-out').innerHTML = `<div class="alert">${esc(e.message)}</div>`;
    setStatus('s2', 'error', 'var(--bad)');
  }
}

$('btn-run').onclick = async () => {
  const btn = $('btn-run');
  // Said here rather than after a round trip: the chain's answer to an empty
  // address is an RPC error about eth_call, which explains nothing.
  if (!isTokenAddress($('ca').value)) {
    $('run-out').innerHTML = '<div class="alert">paste the token\'s contract address first</div>';
    $('ca').focus();
    return;
  }
  // Said here rather than by the chain: an empty budget reaches parseUnits
  // as an empty string, and what comes back explains nothing. With the buy
  // skipped there is nothing for a budget to buy: the position is whatever
  // the wallet already holds, and an empty field means exactly that.
  const raw = $('total').value.trim();
  const budget = Number(raw);
  if (!$('skipBuy').checked && !(budget > 0)) {
    $('run-out').innerHTML = `<div class="alert">type a budget first — how much ${esc($('u-quote').textContent)} to commit</div>`;
    $('total').focus();
    return;
  }
  if (raw !== '' && !(budget >= 0)) {
    $('run-out').innerHTML = '<div class="alert">the budget has to be a number</div>';
    $('total').focus();
    return;
  }
  btn.disabled = true;
  $('report-out').innerHTML = ''; $('sec-exec').classList.add('hidden');
  // One empty state, and it is the blotter's. The pipeline used to sit above
  // it from the moment the page loaded, five columns of instructions in the
  // place the report would land -- a status display with nothing to report.
  $('blotter-empty')?.classList.add('hidden');
  $('sec-tape')?.classList.remove('hidden');
  $('sec-report').classList.remove('hidden');
  $('report-out').innerHTML = '<p class="hint">running — scanning, buying, planning…</p>';
  setStatus('s1', 'running…', 'var(--acc2)');
  try {
    const r = await apiSigned('/api/run', {
      tokenAddress: $('ca').value.trim(),
      quoteAddress: $('quote').value.trim(),
      totalBudget: $('total').value.trim() || '0',
      fee: Math.round(Number(pickVal('feePct')) * 10000),
      tickSpacing: Number(pickVal('spacing')),
      rangePercent: Number(pickVal('rangePct')),
      slippage: Number(pickVal('slip')),
      skipBuy: $('skipBuy').checked,
      force: $('force').checked,
      poolMode: MODE,
      joinPoolId: MODE === 'join' ? JOIN_POOL : null,
      protocol: PROTO,
      shape: SHAPE,
      binStep: pickVal('binStep') === 'auto' ? null : Number(pickVal('binStep')),
      rangeLowerPercent: RANGE_SIDES?.lower ?? null,
      rangeUpperPercent: RANGE_SIDES?.upper ?? null,
      tokenCap: REBALANCE?.tokenCap ?? null,
    }, {
      onStep: (m) => { setStatus('s1', m, 'var(--acc2)'); $('report-out').innerHTML = `<p class="hint">${esc(m)}</p>`; },
      // The buy was the wallet's; the run continues from its signature.
      resume: (sent) => ({ boughtSignature: sent.signature }),
    });
    LAST = r; TOKEN = r.inspected.token; QUOTE = r.inspected.quote; PLAN = r.plan;
    $('sec-report').classList.remove('hidden');
    $('blotter-empty')?.classList.add('hidden');

    if (r.rateLimited) {
      const secs = r.rateLimited.retryAfterSec;
      $('report-out').innerHTML = renderIdent(r.inspected)
        + `<div class="note">GMGN rate limit — <b>nothing was spent</b>, the swap was rejected before it ran.`
        + `<br>Retrying in <b id="rl-count">${secs}</b>s…`
        + (safeUrl(r.rateLimited.upgradeUrl)
            ? ` <a href="${esc(safeUrl(r.rateLimited.upgradeUrl))}" target="_blank" rel="noopener noreferrer">raise the limit</a>` : '')
        + '</div>';
      setStatus('s1', 'rate limited', 'var(--warn)');
      setStatus('s2', 'waiting', 'var(--warn)');
      countdownRetry(secs);
    } else if (r.pendingOrder) {
      $('report-out').innerHTML = renderIdent(r.inspected)
        + `<div class="note">GMGN order <b>${esc(r.pendingOrder)}</b> has not confirmed yet. `
        + 'Wait for it, then run again with “skip the buy” ticked — the tokens will already be in the wallet.</div>';
      setStatus('s1', 'order pending', 'var(--warn)');
      setStatus('s2', 'pending', 'var(--warn)');
    } else if (r.stopped) {
      $('report-out').innerHTML = renderIdent(r.inspected) + renderFlags(r, null)
        + '<div class="flag info">Nothing was bought. Tick “override the security gate” in advanced if you accept this.</div>';
      setStatus('s1', 'stopped', 'var(--bad)');
      setStatus('s2', 'blocked', 'var(--bad)');
    } else {
      $('report-out').innerHTML = renderReport(r);
      setStatus('s1', 'done', 'var(--acc)');
      setStatus('s2', r.plan.poolExists ? 'pool exists' : 'ready', 'var(--acc)');
      loadBalances();
      $('sec-exec').classList.remove('hidden');
    }
  } catch (e) {
    $('run-out').innerHTML = `<div class="alert">${esc(e.message)}</div>`;
    setStatus('s1', 'error', 'var(--bad)');
  }
  btn.disabled = false;
};

/**
 * One formatter for every number on the strip. fmt() picks exponential per
 * value, so a range could read "3.9e-7 … 0.00000157" -- two notations for two
 * numbers a factor of four apart. The smallest decides for all of them.
 */
function stripFmt(values) {
  const min = Math.min(...values.filter((v) => v > 0));
  const exp = min < 1e-6;
  return (v) => (v > 0 ? (exp ? v.toExponential(4) : fmt(v, 8)) : '—');
}

/** Where a price sits inside the range, 0..100, on a log scale. */
function posIn(price, lower, upper) {
  if (!(price > 0 && lower > 0 && upper > lower)) return null;
  return (Math.log(price / lower) / Math.log(upper / lower)) * 100;
}

/** Token, quote, security, address: one line, read once. */
function renderIdent(ins) {
  const sec = {
    honeypot: ['bad', 'HONEYPOT — do not buy'],
    clear: ['ok', `no honeypot · tax ${fmt(ins.buyTax, 2)}% / ${fmt(ins.sellTax, 2)}%`],
    unscreened: ['', 'not screened'],
  }[ins.securityStatus] ?? ['', 'not screened'];
  return `<div class="ident">
    <b>${esc(ins.token.symbol)} / ${esc(ins.quote.symbol)}</b>
    <span>${esc(ins.token.decimals)} dec</span>
    <span class="addr">${esc(ins.token.address)}</span>
    <span class="sec ${sec[0]}">${esc(sec[1])}</span>
  </div>`;
}

/**
 * The position as a range, with the pool's price and the market's price on
 * the same line. A market marker off the strip is drawn as an arrow at the
 * edge it left through: out of range is a fact worth a glance.
 */
function renderStrip(p, gap, quote) {
  if (!p || !(p.priceLower > 0 && p.priceUpper > p.priceLower)) return '';
  const spot = posIn(p.spotPrice, p.priceLower, p.priceUpper);
  const mkt = gap?.marketPrice ? posIn(gap.marketPrice, p.priceLower, p.priceUpper) : null;
  const clamp = (v) => Math.max(0, Math.min(100, v));
  const f = stripFmt([p.priceLower, p.priceUpper, p.spotPrice, gap?.marketPrice ?? 0]);

  let mktMark = '';
  if (mkt !== null) {
    const cls = mkt < 0 ? 'out lo' : (mkt > 100 ? 'out hi' : '');
    mktMark = `<i class="mk mkt ${cls}" style="left:${clamp(mkt)}%" title="market ${f(gap.marketPrice)}"></i>`;
  }
  const gapText = gap?.unavailable
    ? `<span class="gap">market: ${esc(gap.unavailable)}</span>`
    : (gap && gap.percent !== null && gap.percent !== undefined
      ? `<span class="gap ${gap.breached ? 'bad' : ''}">pool vs market ${gap.percent >= 0 ? '+' : ''}${fmt(gap.percent, 1)}%</span>`
      : '');

  return `<div class="strip">
    <div class="strip-track">
      ${spot === null ? '' : `<i class="mk spot" style="left:${clamp(spot)}%" title="spot ${f(p.spotPrice)}"></i>`}
      ${mktMark}
    </div>
    <div class="strip-lbl"><span>${f(p.priceLower)}</span><b>${rangeLabel(p)}</b><span>${f(p.priceUpper)}</span></div>
    <div class="strip-key">
      <span><i class="spot"></i>spot ${f(p.spotPrice)} ${esc(quote.symbol)}</span>
      ${mkt === null ? '' : `<span><i class="mkt"></i>market ${f(gap.marketPrice)} ${esc(quote.symbol)}</span>`}
      ${gapText}
    </div>
  </div>`;
}

/**
 * What the strip's middle says about the band. Our own pool has the width we
 * chose; a joined pool has whatever width it was opened with, and a DAMM v2
 * pool spanning the whole price line is better named than measured.
 */
function rangeLabel(p) {
  if (p.rangePercent !== null && p.rangePercent !== undefined) return `±${esc(p.rangePercent)}%`;
  if (p.rangeLowerPercent !== undefined && p.rangeUpperPercent !== undefined) return `-${esc(p.rangeLowerPercent)}% / +${esc(p.rangeUpperPercent)}%`;
  const full = p.priceLower > 0 && p.priceUpper / p.priceLower > 1e12;
  return full ? 'full range' : "pool's range";
}

/** Deposit, buy, pool: the three numbers that decide whether to confirm. */
function renderTiles(r, p) {
  const t = r.inspected.token, q = r.inspected.quote;
  const tiles = [];

  // What stays behind is part of the deposit's story: a leg that did not fit
  // at the anchor is the cost of the buy's fill, shown rather than hidden.
  const left = p.surplus && (Number(p.surplus.quote) > 0 || Number(p.surplus.token) > 0)
    ? ` · ${Number(p.surplus.quote) > 0
        ? `${fmt(p.surplus.quote, 4)} ${esc(q.symbol)}`
        : `${fmt(p.surplus.token, 2)} ${esc(t.symbol)}`} stays in wallet`
    : '';
  tiles.push({
    k: 'deposit',
    v: `${fmt(p.deposit.quote, 6)} ${esc(q.symbol)}`,
    s: `+ ${fmt(p.deposit.token, 4)} ${esc(t.symbol)}${left}`,
  });

  if (!r.buy) {
    tiles.push({ k: 'buy', v: 'skipped', s: 'planning against the balance you hold', fg: true });
  } else if (r.buy.dryRun) {
    tiles.push({ k: 'buy', v: 'not sent', s: 'dry run — planned on the quoted amount', fg: true, warn: true });
  } else {
    const fill = r.buy.fillPrice
      ?? (Number(r.split?.buy) > 0 && Number(r.tokenAmountHuman) > 0
        ? Number(r.split.buy) / Number(r.tokenAmountHuman) : null);
    const link = r.buy.txUrl ? ` · <a href="${esc(r.buy.txUrl)}" target="_blank">tx</a>` : '';
    tiles.push({
      k: 'bought',
      v: `${esc(r.split?.buy ?? '?')} ${esc(q.symbol)} → ${fmt(r.tokenAmountHuman, 4)} ${esc(t.symbol)}`,
      s: (fill ? `@ ${fmt(fill)} ${esc(q.symbol)}` : '') + (r.buy.route ? ` · ${esc(r.buy.route)}` : '') + link,
    });
  }

  const mode = p.poolMode === 'join' ? 'join' : (p.poolExists ? 'exists' : 'new');
  tiles.push({
    k: 'pool',
    // The headline fee is what the pair charges at rest. What a trade pays
    // now is that plus the part that rises with volatility -- on a token
    // that is moving, several times larger, and the whole reason to be here.
    v: `${p.protocol === 'v3' ? 'v3 · ' : p.protocol === 'dlmm' ? 'dlmm · ' : ''}${mode} · ${esc(p.feePercent)}% fee`
      + (p.fee?.nowPercent > p.feePercent ? ` <b class="live">now ${fmt(p.fee.nowPercent, 2)}%</b>` : '')
      + `${p.protocol === 'dlmm' ? ` · ${esc(p.shape)} · ${esc(p.bins)} bins @ ${esc(p.binStep / 100)}%` : ''}`,
    // Share of the bin the price is in, not of the pool: that is what the
    // flow actually crosses. An estimate, and it says so -- the figure
    // divides the deposit evenly across the band, which is what spot does;
    // curve puts more of it in this bin and bid-ask less.
    s: (p.joined
      ? (p.activeShare
        ? (p.activeShare.percent
          ? `~${fmt(p.activeShare.percent, 2)}% of the active bin`
            + (p.activeShare.evenSpread
              ? (p.shape && p.shape !== 'spot' ? ` (flat spread — ${esc(p.shape)} shifts it)` : ' (flat spread)')
              : '')
          : `outside the active bin (it is ${esc(p.activeShare.outside ?? '—')} the band)`)
        : `your share ${fmt(p.joined.sharePercent, 3)}%`)
        + ` · pool ${p.joined.liquidityUsd != null ? `$${fmt(p.joined.liquidityUsd, 0)}` : `${esc(String(p.joined.poolId).slice(0, 4))}…${esc(String(p.joined.poolId).slice(-4))}`}`
      : `anchor: ${esc(p.anchorSource ?? '—')}`)
      + (p.rent ? ` · rent ~${fmt(p.rent.totalSol, 3)} SOL${p.rent.estimated ? ' (est.)' : ''}` : ''),
    fg: true,
  });

  return `<div class="tiles">${tiles.map((x) => `
    <div class="tile${x.warn ? ' warn' : ''}">
      <div class="k">${x.k}</div>
      <div class="v${x.fg ? ' fg' : ''}" title="${esc(String(x.v).replace(/<[^>]+>/g, ''))}">${x.v}</div>
      <div class="s">${x.s}</div>
    </div>`).join('')}</div>`;
}

/**
 * Every reason to hesitate, in one list. Severity is colour; the text says
 * what is wrong and what to do about it, and nothing here is decorative.
 */
function renderFlags(r, p) {
  const ins = r.inspected;
  const flags = [];
  const add = (lvl, html) => flags.push(`<div class="flag ${lvl}">${html}</div>`);

  (ins.warnings || []).forEach((w) => add('bad', esc(w)));
  (ins.blockers || []).forEach((b) => add('bad', esc(b)));

  const g = ins.marketGap;
  if (g?.breached) add('bad', `<b>pool vs market ${g.percent >= 0 ? '+' : ''}${fmt(g.percent, 1)}%</b> — ${esc(g.note)}`);
  else if (g?.unavailable) add('info', `No second opinion on price (${esc(g.unavailable)}). The reference is one AMM's view only.`);

  if (p?.joined?.deviationPercent != null && Math.abs(p.joined.deviationPercent) > 5) {
    add('warn', `<b>${fmt(p.joined.deviationPercent, 1)}%</b> from the deepest pool for this pair. You mint at this pool's price, not the market's.`);
  }
  if (p?.joined?.hookTouchesLiquidity) add('warn', "This pool's hook runs on add-liquidity — it can reject or alter the mint.");
  (p?.warnings || []).forEach((w) => add('warn', esc(w)));

  // The other route, offered rather than hidden.
  if (MODE === 'join') {
    add('info', 'Joining the existing pool. <a href="#" data-switch="create">open my own instead</a>');
  } else if (r.existingPool?.found && r.existingPool.joinable) {
    add('info', `This token already trades in a pool (fee ${fmt(r.existingPool.lpFee / 10000, 4)}%${r.existingPool.liquidityUsd != null ? `, $${fmt(r.existingPool.liquidityUsd, 0)}` : (r.existingPool.depthQuoteHuman ? `, ${fmt(r.existingPool.depthQuoteHuman, 2)} ${esc(r.inspected?.quote?.symbol ?? '')} within ±10%` : '')}). `
      + '<a href="#" data-switch="join">join it instead</a>');
  } else if (r.existingPool?.found && !r.existingPool.joinable) {
    add('info', `No joinable pool: ${esc(r.existingPool.reason)}`);
  }

  return flags.length ? `<div class="flags">${flags.join('')}</div>` : '';
}

/** Everything else, folded: still there for the operator who wants it. */
function renderDetails(r, p) {
  const ins = r.inspected;
  const rows = [];
  (ins.prices || []).forEach((x) => rows.push([esc(x.source), `<span class="num">${fmt(x.price)}</span>`]));
  if (p) {
    if (p.poolId) rows.push(['pool id', esc(p.poolId)]);
    if (p.anchorSource) rows.push(['anchor', esc(p.anchorSource)]);
    if (p.currentTick != null) rows.push(['tick', esc(p.currentTick)]);
    if (p.tickLower != null) rows.push(['ticks', `${esc(p.tickLower)} … ${esc(p.tickUpper)} · spacing ${esc(p.tickSpacing)}`]);
    if (p.liquidity) rows.push(['liquidity', esc(p.liquidity)]);
    if (p.driftPercent != null) rows.push(['drift from anchor', `${fmt(p.driftPercent, 2)}%`]);
  }
  if (r.split) rows.push(['budget', `${esc(r.split.total)} total → ${esc(r.split.buy)} buy + ${esc(r.split.lpQuote)} lp`]);
  if (!rows.length) return '';
  return `<details class="drawer"><summary>details</summary>
    <table>${rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')}</table>
  </details>`;
}

function renderReport(r, plan = r.plan) {
  const q = r.inspected.quote;
  const html = renderIdent(r.inspected)
    + (plan ? renderStrip(plan, r.inspected.marketGap, q) : '')
    + (plan ? renderTiles(r, plan) : '')
    + renderFlags(r, plan)
    + renderDetails(r, plan);
  // The market panel above follows the plan from here on.
  if (CFG?.chainKind === 'svm') setTimeout(() => drawChart(r, plan), 0);
  return html;
}

// The market panel, before any run: the token's price history and its day,
// with the band and the bin profile the ticket WOULD open -- worked out on
// the page from the form, at the chart's last price. A run replaces those
// with the plan's own numbers (the real pair, its step, its active bin).
let MARKET_TOKEN = null;
let marketTimer = null;
function watchTicket() {
  const ca = $('ca').value.trim();
  // Whether there is a market panel is whether this chain has a price feed --
  // not whether it is Solana. Base has the same feed; Robinhood Chain has no
  // public indexer, so there it stays shut and the pool menu lives in the
  // ticket instead.
  if (!CFG?.hasMarket) { $('sec-market').classList.add('hidden'); return; }
  $('sec-market').classList.remove('hidden');
  if (!isTokenAddress(ca)) {
    MARKET_TOKEN = null;
    $('mkt-head').innerHTML = '';
    $('chart').innerHTML = '<div class="hint">paste a token address to see its market</div>';
    $('s0').textContent = '—';
    return;
  }
  clearTimeout(marketTimer);
  marketTimer = setTimeout(() => {
    if (ca !== MARKET_TOKEN) {
      MARKET_TOKEN = ca; LAST = null; PLAN = null;
      // A new token means a new band -- except when a rebalance handed this
      // ticket the band the closed position held. That is the point of the
      // handover, and typing the address does not undo it.
      RANGE_SIDES = REBALANCE?.sides && REBALANCE.token === ca ? { ...REBALANCE.sides } : null;
    }
    drawChart(null, null);
  }, 250);
}
$('ca').addEventListener('input', watchTicket);
for (const id of ['rangePct', 'binStep', 'feePct']) $(id).addEventListener('change', () => { if (!PLAN) drawChart(null, null); });
for (const id of ['rangePct-custom', 'binStep-custom']) $(id).addEventListener('input', () => { if (!PLAN) drawChart(null, null); });

const BIN_STEPS = [1, 5, 10, 25, 50, 80, 100, 125, 150, 200, 250, 400];
function suggestBinStep(rangePercent) {
  return BIN_STEPS.find((step) => 2 * Math.ceil(Math.log(1 + rangePercent / 100) / Math.log(1 + step / 10_000)) + 1 <= 69) ?? 400;
}

function renderMarketHead(data, token, quoteSymbol) {
  const st = data.stats ?? {};
  const pct = (v) => (v === null || v === undefined ? '—' : `<span class="delta ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : ''}${fmt(v, 1)}%</span>`);
  const usd = (v) => (v === null || v === undefined ? '—' : `$${short(v)}`);
  const [name, quote] = data.pool.name.split(' / ');
  const last = data.candles?.length ? data.candles[data.candles.length - 1][4] : null;
  const px = last === null ? '—' : `$${last < 1 ? Number(last.toPrecision(4)) : fmt(last, 4)}`;
  return `<div class="pair">
      <div><h1>${esc(name)}<small>/ ${esc(quote ?? quoteSymbol ?? '')}</small></h1>
        <div class="ca">ca <b>${esc(token.slice(0, 6))}…${esc(token.slice(-4))}</b> · ${esc(data.pool.dex ?? 'pool')} · deepest pool ref</div></div>
      <div class="px"><b>${px}</b><span>24h ${pct(st.change24hPercent)} · vol ${usd(st.volume24hUsd)}</span></div>
    </div>
    <div class="stats">
      <div class="stat"><span>market cap</span><b class="c">${usd(st.marketCapUsd)}</b></div>
      <div class="stat"><span>1h</span><b>${pct(st.change1hPercent)}</b></div>
      <div class="stat"><span>liquidity</span><b class="c">${usd(data.pool.reserveUsd)}</b></div>
      <div class="stat"><span>24h trades</span><b>${st.buys24h === null || st.buys24h === undefined ? '—' : `${esc(st.buys24h)} <i class="up">▲</i> ${esc(st.sells24h ?? 0)} <i class="down">▼</i>`}</b></div>
      <div class="stat"><span>pools</span><b class="l">${esc(st.pools ?? '—')}</b></div>
    </div>`;
}

// --- price chart with the band drawn over it, and the position's bin profile ---
//
// The history comes from GeckoTerminal (USD); the plan speaks SOL per token,
// so both are shown in USD through SOL's price, with a market-cap axis for
// tokens whose price is a row of zeros. The band's two edges can be dragged;
// letting go re-plans the position with the new sides.
let CANDLES = null;   // { token, tf, data }
let CHART_UNIT = 'mcap';
let CHART_TF = '5m';
const TFS = { '1m': ['minute', 1], '5m': ['minute', 5], '15m': ['minute', 15], '1h': ['hour', 1], '4h': ['hour', 4], '1d': ['day', 1] };

async function loadCandles(token) {
  const [tf, agg] = TFS[CHART_TF];
  if (CANDLES && CANDLES.token === token && CANDLES.tf === CHART_TF) return CANDLES.data;
  const data = await api(`/api/candles?token=${encodeURIComponent(token)}&tf=${tf}&agg=${agg}`);
  CANDLES = { token, tf: CHART_TF, data };
  return data;
}

/** Weight of each bin under a shape, symmetric about the active bin. */
function binWeights(plan) {
  const below = plan.binsBelow ?? 0; const above = plan.binsAbove ?? 0;
  const n = Math.max(below, above, 1);
  const out = [];
  for (let d = -below; d <= above; d++) {
    const t = Math.abs(d) / n;
    const w = plan.shape === 'curve' ? Math.max(0.08, 1 - t * t) : plan.shape === 'bidask' ? 0.08 + t : 1;
    out.push({ d, w, side: d < 0 ? 'quote' : d > 0 ? 'token' : 'active' });
  }
  return out;
}

async function drawChart(r, plan) {
  const host = $('chart');
  if (!host) return;
  const token = r ? r.inspected.token.address : $('ca').value.trim();
  if (!isTokenAddress(token)) return;
  const tokenSymbol = r ? r.inspected.token.symbol : 'token';
  const quoteSymbol = r ? r.inspected.quote.symbol : (CFG?.nativeSymbol ?? 'SOL');
  $('s0').textContent = 'loading…';
  let data;
  try { data = await loadCandles(token); } catch (e) { host.innerHTML = `<div class="hint">no price history: ${esc(e.message)}</div>`; $('s0').textContent = 'no data'; return; }
  if (token !== (r ? r.inspected.token.address : $('ca').value.trim())) return;   // the ticket moved on
  MKT_SYM = r ? r.inspected.token.symbol : (data.pool.name.split(' / ')[0] || null);
  $('mkt-head').innerHTML = renderMarketHead(data, token, quoteSymbol);
  const sol = data.solUsd || 0;
  const supply = data.supply || 0;
  const cs = data.candles;
  if (!cs.length || !sol) { host.innerHTML = '<div class="hint">no candles for this token yet</div>'; $('s0').textContent = 'no candles'; return; }
  $('s0').textContent = plan ? 'planned' : 'preview';

  // Everything in USD per token; the label switch decides what is printed.
  const toUsd = (solPerToken) => solPerToken * sol;
  const lab = (usd) => (CHART_UNIT === 'mcap' && supply ? `$${short(usd * supply)}` : `$${usd.toPrecision(3)}`);
  // Without a plan the band is the ticket's, drawn around the chart's last
  // price: same shape, same step rule, the numbers the plan will confirm.
  if (!plan) {
    const rp = Number(pickVal('rangePct')) || 100;
    const lower = RANGE_SIDES?.lower ?? rp; const upper = RANGE_SIDES?.upper ?? rp;
    const dlmm = PROTO === 'dlmm';
    const stepPick = pickVal('binStep');
    const step = dlmm ? (stepPick === 'auto' || !Number(stepPick) ? suggestBinStep(Math.max(lower, upper)) : Number(stepPick)) : null;
    const binsOf = (pct) => Math.max(0, Math.ceil(Math.log(1 + pct / 100) / Math.log(1 + step / 10_000)));
    let below = dlmm ? binsOf(lower) : 0; let above = dlmm ? binsOf(upper) : 0;
    if (dlmm && below + above + 1 > 69) { const sc = 68 / (below + above); below = Math.floor(below * sc); above = 68 - below; }
    const last = cs[cs.length - 1][4];
    plan = {
      preview: true, protocol: dlmm ? 'dlmm' : 'damm', shape: SHAPE, binStep: step, bins: below + above + 1, binsBelow: below, binsAbove: above,
      spotPrice: last / sol,
      priceLower: dlmm ? (last / (1 + step / 10_000) ** below) / sol : (last / (1 + lower / 100)) / sol,
      priceUpper: dlmm ? (last * (1 + step / 10_000) ** above) / sol : (last * (1 + upper / 100)) / sol,
      rangeLowerPercent: dlmm ? ((1 + step / 10_000) ** below - 1) * 100 : lower,
      rangeUpperPercent: dlmm ? ((1 + step / 10_000) ** above - 1) * 100 : upper,
    };
  }
  const lo0 = toUsd(plan.priceLower); const hi0 = toUsd(plan.priceUpper); const spot = toUsd(plan.spotPrice);
  const closes = cs.map((c) => c[4]);
  let yMin = Math.min(...cs.map((c) => c[3]), lo0) ; let yMax = Math.max(...cs.map((c) => c[2]), hi0);
  yMin = Math.min(yMin, spot); yMax = Math.max(yMax, spot);
  const pad = (yMax - yMin) * 0.12 || yMax * 0.1; yMin = Math.max(0, yMin - pad); yMax += pad;

  const W = 720, H = 260, L = 8, R = 92, T = 10, B = 24;   // plot box
  const PW = W - L - R - 70;   // profile bars take the right 70px
  const x = (i) => L + (i / Math.max(1, cs.length - 1)) * PW;
  const y = (v) => T + (1 - (v - yMin) / (yMax - yMin)) * (H - T - B);
  const path = closes.map((c, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(c).toFixed(1)}`).join(' ');
  const t0 = new Date(cs[0][0] * 1000); const t1 = new Date(cs[cs.length - 1][0] * 1000);
  const hm = (d) => d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // The bin profile: one bar per bin at its price, width by weight.
  const bars = plan.protocol === 'dlmm' ? binWeights(plan).map((b) => {
    const price = spot * (1 + plan.binStep / 10_000) ** b.d;
    const step = Math.abs(y(price * (1 + plan.binStep / 10_000)) - y(price));
    const h = Math.max(1, Math.min(step - 0.5, 6));
    const wpx = 6 + b.w * 60;
    return `<rect class="bin ${b.side}" x="${L + PW + 4}" y="${(y(price) - h / 2).toFixed(1)}" width="${wpx.toFixed(1)}" height="${h.toFixed(1)}"/>`;
  }).join('') : `<rect class="bin band" x="${L + PW + 4}" y="${y(hi0).toFixed(1)}" width="40" height="${(y(lo0) - y(hi0)).toFixed(1)}"/>`;

  // DLMM's two edges are independent: a band can reach 150% up and nothing
  // down, which is what a ladder is. DAMM v2 is one symmetric curve, so its
  // two edges are one control. And a DAMM v2 *join* has no band of its own --
  // it adds to the pool's existing curve -- so there is nothing to drag.
  const twoEdges = plan.protocol === 'dlmm';
  const poolMode = plan.preview ? MODE : (plan.poolMode ?? MODE);
  const draggable = twoEdges || poolMode !== 'join';

  const gridN = 4;
  // Axis labels step aside for the spot label rather than print over it.
  const grid = Array.from({ length: gridN + 1 }, (_, i) => { const v = yMin + (i / gridN) * (yMax - yMin); const near = Math.abs(y(v) - y(spot)) < 12; return `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>${near ? '' : `<text class="ax" x="${W - R + 6}" y="${(y(v) + 3).toFixed(1)}">${lab(v)}</text>`}`; }).join('');

  host.innerHTML = `<div class="chart-bar">
      <span class="chart-tfs">${Object.keys(TFS).map((k) => `<button type="button" data-tf="${k}" class="${k === CHART_TF ? 'on' : ''}">${k}</button>`).join('')}</span>
      <span class="chart-units"><button type="button" data-unit="price" class="${CHART_UNIT === 'price' ? 'on' : ''}">price</button><button type="button" data-unit="mcap" class="${CHART_UNIT === 'mcap' ? 'on' : ''}">mcap</button></span>
      <span class="chart-src">${esc(data.pool.name)} · ${esc(data.pool.dex ?? '')} · $${short(data.pool.reserveUsd)} liq · SOL $${sol.toFixed(0)}</span>
    </div>
    <svg viewBox="0 0 ${W} ${H}" class="chart-svg" id="chart-svg" preserveAspectRatio="none">
      ${grid}
      <defs><pattern id="hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line class="hatch" x1="0" y1="0" x2="0" y2="10"/></pattern></defs>
      <rect class="bandfill" x="${L}" width="${PW}" y="${y(hi0).toFixed(1)}" height="${(y(lo0) - y(hi0)).toFixed(1)}"/>
      <rect fill="url(#hatch)" x="${L}" width="${PW}" y="${y(hi0).toFixed(1)}" height="${(y(lo0) - y(hi0)).toFixed(1)}"/>
      <path class="line" d="${path}"/>
      <line class="spotline" x1="${L}" x2="${W - R}" y1="${y(spot).toFixed(1)}" y2="${y(spot).toFixed(1)}"/>
      ${bars}
      <g class="edge" data-edge="hi"><line x1="${L}" x2="${W - R}" y1="${y(hi0).toFixed(1)}" y2="${y(hi0).toFixed(1)}"/><rect class="grab" x="${L}" y="${(y(hi0) - 6).toFixed(1)}" width="${PW}" height="12"/><text x="${L + 4}" y="${(y(hi0) - 4).toFixed(1)}">max ${lab(hi0)} · +${fmt(plan.rangeUpperPercent ?? plan.rangePercent, 0)}%</text></g>
      <g class="edge" data-edge="lo"><line x1="${L}" x2="${W - R}" y1="${y(lo0).toFixed(1)}" y2="${y(lo0).toFixed(1)}"/><rect class="grab" x="${L}" y="${(y(lo0) - 6).toFixed(1)}" width="${PW}" height="12"/><text x="${L + 4}" y="${(y(lo0) + 12).toFixed(1)}">min ${lab(lo0)} · -${fmt((1 - lo0 / spot) * 100, 0)}%</text></g>
      <text class="ax" x="${L}" y="${H - 6}">${hm(t0)}</text><text class="ax" x="${(L + PW - 40).toFixed(0)}" y="${H - 6}">${hm(t1)}</text>
      <text class="ax spot" x="${W - R + 6}" y="${(y(spot) + 3).toFixed(1)}">▸ ${lab(spot)}</text>
    </svg>
    <div class="chart-key"><span><i class="quote"></i>${esc(quoteSymbol)} side</span><span><i class="token"></i>${esc(tokenSymbol)} side</span><span><i class="active"></i>active bin</span>${plan.protocol === 'dlmm' ? `<span>${esc(plan.shape)} · ${esc(plan.bins)} bins @ ${esc(plan.binStep / 100)}%</span><span class="hint">drag the min/max lines to reshape the band</span>` : `<span class="hint">DAMM v2: one band, no shape</span><span class="hint">${draggable ? 'drag either line to widen or narrow it — both move together' : 'joining uses the pool\'s own curve, so there is no band to drag'}</span>`}${plan.preview ? '<span class="hint">preview from the ticket — run to plan on the real pair</span>' : ''}</div>`;

  host.querySelectorAll('button[data-tf]').forEach((b) => { b.onclick = () => { CHART_TF = b.dataset.tf; drawChart(r, plan); }; });
  host.querySelectorAll('button[data-unit]').forEach((b) => { b.onclick = () => { CHART_UNIT = b.dataset.unit; drawChart(r, plan); }; });

  if (!draggable) return;
  // Dragging an edge: the line follows the pointer; on release the band is
  // re-planned with that side's new distance from spot.
  const svg = $('chart-svg');
  const pxToUsd = (clientY) => { const box = svg.getBoundingClientRect(); const yy = ((clientY - box.top) / box.height) * H; return yMin + (1 - (yy - T) / (H - T - B)) * (yMax - yMin); };
  const edges = new Map([...svg.querySelectorAll('.edge')].map((g) => [g.dataset.edge, g]));
  /** Put one edge's line, its grab strip and its label at a price. */
  const place = (g, usd) => {
    const edge = g.dataset.edge;
    const yy = y(usd).toFixed(1);
    g.querySelector('line').setAttribute('y1', yy); g.querySelector('line').setAttribute('y2', yy);
    g.querySelector('rect').setAttribute('y', (Number(yy) - 6).toFixed(1));
    const t = g.querySelector('text');
    t.setAttribute('y', (Number(yy) + (edge === 'hi' ? -4 : 12)).toFixed(1));
    // Shown as the move from spot (a floor cannot fall 105%); the plan's
    // own convention (price / (1 + r)) is what gets sent on release.
    const shown = edge === 'hi' ? (usd / spot - 1) * 100 : (1 - usd / spot) * 100;
    t.textContent = `${edge === 'hi' ? 'max' : 'min'} ${lab(usd)} · ${edge === 'hi' ? '+' : '-'}${shown.toFixed(0)}%`;
  };
  for (const [edge, g] of edges) {
    g.onpointerdown = (e) => {
      e.preventDefault(); g.setPointerCapture(e.pointerId); g.classList.add('drag');
      let usd = edge === 'hi' ? hi0 : lo0;
      const move = (ev) => {
        // Bounded three ways. Inside the plot, because dragging is for the
        // chart you can see and anything past it belongs in the range picker.
        // Never through spot, because the two edges cannot cross. And never
        // to the axis floor: yMin can be zero, and "how far below spot" at a
        // price of zero is Infinity -- which used to reach the picker, the
        // echo and the plan as an infinite band.
        usd = Math.min(Math.max(pxToUsd(ev.clientY), Math.max(yMin, spot * 0.01)), yMax);
        usd = edge === 'hi' ? Math.max(usd, spot * 1.005) : Math.min(usd, spot * 0.995);
        place(g, usd);
        // One curve: the other edge is this one's mirror, the same distance
        // from spot, and it has to be seen moving with it.
        if (!twoEdges) {
          const r = edge === 'hi' ? usd / spot - 1 : spot / usd - 1;
          const other = edges.get(edge === 'hi' ? 'lo' : 'hi');
          if (other) place(other, edge === 'hi' ? spot / (1 + r) : spot * (1 + r));
        }
      };
      const up = () => {
        g.onpointermove = null; g.onpointerup = null; g.classList.remove('drag');
        const pct = edge === 'hi' ? (usd / spot - 1) * 100 : (spot / usd - 1) * 100;
        if (!twoEdges) {
          // One number, and it is the picker's: the DAMM v2 planner reads the
          // range from there and knows nothing about two sides. Writing it
          // back keeps the ticket and the chart saying the same thing.
          const sym = Math.max(1, Math.round(pct));
          setPick('rangePct', sym);
          document.querySelector('.ticket')?.dispatchEvent(new Event('input', { bubbles: true }));
          if (plan.preview) { RANGE_SIDES = null; drawChart(null, null); } else replanRange({ lower: sym, upper: sym });
          return;
        }
        const sides = { lower: edge === 'lo' ? pct : (plan.rangeLowerPercent ?? plan.rangePercent), upper: edge === 'hi' ? pct : (plan.rangeUpperPercent ?? plan.rangePercent) };
        if (plan.preview) {
          RANGE_SIDES = { lower: Math.max(0, Math.round(sides.lower)), upper: Math.max(0, Math.round(sides.upper)) };
          drawChart(null, null);
        } else {
          replanRange(sides);
        }
      };
      g.onpointermove = move; g.onpointerup = up;
    };
  }
}

function short(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return v.toPrecision(3);
}

let RANGE_SIDES = null;   // { lower, upper } once an edge has been dragged
// Set when a rebalance handed this ticket over: what the closed position
// returned, which caps what the new one pairs.
let REBALANCE = null;
async function replanRange(sides) {
  RANGE_SIDES = { lower: Math.max(0, Math.round(sides.lower)), upper: Math.max(0, Math.round(sides.upper)) };
  setStatus('s2', 're-planning…', 'var(--acc2)');
  try {
    const r = await api('/api/replan', replanPayload(MODE));
    PLAN = r.plan;
    $('report-out').innerHTML = renderReport(LAST, r.plan);
    setStatus('s2', 'ready', 'var(--acc)');
  } catch (e) {
    $('exec-out').innerHTML = `<div class="alert">${esc(e.message)}</div>`;
    setStatus('s2', 'error', 'var(--bad)');
  }
}

let retryTimer = null;
function countdownRetry(secs) {
  clearInterval(retryTimer);
  let left = secs + 2;   // a small cushion; the window is server-side
  retryTimer = setInterval(() => {
    left -= 1;
    const el = $('rl-count');
    if (el) el.textContent = Math.max(0, left);
    if (left <= 0) {
      clearInterval(retryTimer);
      if ($('rl-count')) $('btn-run').click();
    }
  }, 1000);
}

/**
 * What the mint did, in whichever chain's vocabulary it happened.
 *
 * An EVM receipt has a block and gas; a Solana confirmation has compute
 * units and a signature. Reading EVM fields off a Solana result printed
 * "status undefined · block undefined · gas undefined" under a pool that had
 * just opened successfully. The two things that matter on either chain lead:
 * the position id, which closing will ask for, and the pool.
 */
function renderExecResult(r) {
  const link = r.url ?? r.txUrl ?? null;
  const ref = r.hash ?? r.signature ?? null;
  const position = r.positionTokenId ?? r.tokenId ?? null;
  const pool = r.poolId ?? null;

  if (r.dryRun) {
    const cost = r.gasUsed ?? r.gas ?? (r.units ? `${r.units} compute units` : null);
    return `<div class="note">DRY_RUN — simulation passed${cost ? ` (${esc(cost)})` : ''}. Nothing was sent.</div>`;
  }

  const rows = [];
  if (position) rows.push(['position', `<b>${esc(position)}</b>`]);
  if (pool) rows.push(['pool', esc(pool)]);
  if (r.blockNumber) rows.push(['block', `${esc(r.blockNumber)} · gas ${esc(r.gasUsed ?? '?')}`]);
  if (r.units) rows.push(['compute', `${esc(r.units)} units`]);
  if (ref) rows.push(['tx', link ? `<a href="${esc(link)}" target="_blank">${esc(ref)}</a>` : esc(ref)]);

  return `<div class="ok"><div class="big">minted${r.status ? ` · ${esc(r.status)}` : ''}</div>
    <table style="margin-top:8px">${rows.map(([k, v]) => `<tr><td>${k}</td><td class="addr">${v}</td></tr>`).join('')}</table>
  </div>`;
}

$('btn-create').onclick = async () => {
  if (!confirm('Create the pool and mint the position?')) return;
  runCreate({ confirmed: true });
};

/**
 * One confirm may take more than one call: approvals go on chain in the
 * first, and if they are still confirming when the call's time is up the
 * server says so and this asks again -- the approvals are then already
 * granted and the mint goes out. Nothing is signed twice.
 */
async function runCreate({ attempt = 1 } = {}) {
  const btn = $('btn-create'); btn.disabled = true;
  setStatus('s3', attempt === 1 ? 'sending…' : `continuing (${attempt})…`, 'var(--acc2)');
  try {
    const r = await apiSigned('/api/create', {
      tokenAddress: $('ca').value.trim(),
      quoteAddress: $('quote').value.trim(),
      quoteAmount: LAST.split.lpQuote,
      tokenAmountHuman: LAST.tokenAmountHuman,
      fee: Math.round(Number(pickVal('feePct')) * 10000),
      tickSpacing: Number(pickVal('spacing')),
      rangePercent: Number(pickVal('rangePct')),
      slippage: Number(pickVal('slip')),
      expectSpot: PLAN.spotPrice,   // whatever is on screen right now
      expectPoolId: PLAN.poolId,
      poolMode: MODE,
      joinPoolId: MODE === 'join' ? JOIN_POOL : null,
      protocol: PROTO,
      shape: SHAPE,
      binStep: pickVal('binStep') === 'auto' ? null : Number(pickVal('binStep')),
      rangeLowerPercent: RANGE_SIDES?.lower ?? null,
      rangeUpperPercent: RANGE_SIDES?.upper ?? null,
    }, {
      onStep: (m) => { setStatus('s3', m, 'var(--acc2)'); $('exec-out').innerHTML = `<div class="note">${esc(m)}</div>`; },
      // A pair creation is followed by the position (call again); a position
      // or a deposit is the end.
      resume: (sent, need) => (need.meta?.then === 'create' ? {} : null),
    });
    if (r.signed) {
      // The wallet signed the last step; what it minted is in the hand-off
      // (Solana) or in the receipt (EVM: the manager's mint Transfer).
      let positionTokenId = r.meta?.tokenId ?? null;
      if (r.needsSignature === null && r.hash && CFG?.chainKind === 'evm') {
        const t = await api(`/api/tx?hash=${encodeURIComponent(r.hash)}`).catch(() => null);
        if (t?.mintedTokenId) { positionTokenId = t.mintedTokenId; if (t.mintedBy === 'v4') knownPositions.add(t.mintedTokenId); }
      }
      $('exec-out').innerHTML = renderExecResult({ ...r, url: r.txUrl, positionTokenId, poolId: r.meta?.poolId ?? PLAN?.poolId ?? null, signature: r.signature });
      setStatus('s3', 'done', 'var(--acc)');
      loadBalances();
      return;
    }
    if (r.driftBlocked) {
      // Re-priced, not minted: show the new numbers and let one click accept them.
      PLAN = r.plan;
      $('report-out').innerHTML = renderReport(LAST, r.plan);
      $('exec-out').innerHTML =
        `<div class="note">Price moved <b>${fmt(r.drift, 2)}%</b> since the report `
        + `(limit ${esc(r.limit)}%) — <b>nothing was minted</b>. The position above has been `
        + `re-priced at ${fmt(r.plan.spotPrice)}. Confirm again to mint at this price.</div>`;
      $('btn-create').textContent = 'confirm at the updated price';
      setStatus('s3', 're-priced', 'var(--warn)');
      btn.disabled = false;
      return;
    }
    if (r.approvalsPending) {
      const sent = (r.approvals ?? []).map((a) => `<a href="${esc(a.url)}" target="_blank">${esc(a.step)}</a>`).join(', ');
      $('exec-out').innerHTML = `<div class="note">Approvals sent${sent ? ` (${sent})` : ''} and still confirming — continuing to the mint…</div>`;
      if (attempt >= 4) throw new Error('the approvals did not confirm across four calls; check the wallet on the explorer and press confirm again');
      await new Promise((res) => setTimeout(res, 2500));
      return runCreate({ attempt: attempt + 1 });
    }
    if (r.positionTokenId && PROTO !== 'v3') knownPositions.add(r.positionTokenId);
    $('exec-out').innerHTML = renderExecResult(r);
    setStatus('s3', r.dryRun ? 'simulated' : 'done', r.dryRun ? 'var(--warn)' : 'var(--acc)');
    loadBalances();
  } catch (e) { $('exec-out').innerHTML = `<div class="alert">${esc(e.message)}</div>`; setStatus('s3', 'error', 'var(--bad)'); btn.disabled = false; }
}

/* ---- rune terminal: chips, the command echo, the pipeline tape -------------
   All of this only reads and mirrors the page; the run and the confirm are
   untouched. The selects stay the source of truth: a chip sets its select and
   fires 'change', and every chip re-reads its select. */
(() => {
  const vis = (id) => { const e = $(id); return e && !e.classList.contains('hidden') && !e.closest('.hidden'); };
  const onTxt = (sel) => document.querySelector(`${sel} button.on`)?.textContent.trim();
  const short = (a) => (a.length > 16 ? `${a.slice(0, 8)}…${a.slice(-4)}` : a);
  const e = (x) => esc(String(x));

  // chips: one per option, labelled by the option's first word
  function chips() {
    document.querySelectorAll('.chips[data-for]').forEach((box) => {
      const sel = $(box.dataset.for);
      const opts = [...sel.options].map((o) => [o.value, o.textContent.split(' · ')[0].replace('…', '')]);
      const key = opts.map((o) => o.join('=')).join('|') + '#' + sel.value;
      if (box.dataset.key === key) return;
      box.dataset.key = key;
      box.innerHTML = opts.map(([v, t]) => `<button type="button" class="opt" data-v="${e(v)}" aria-pressed="${v === sel.value}">${e(t)}</button>`).join('');
    });
  }
  document.querySelector('.ticket').addEventListener('click', (ev) => {
    const b = ev.target.closest('.chips .opt');
    if (!b) return;
    const sel = $(b.parentElement.dataset.for);
    sel.value = b.dataset.v;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    chips();
  });

  /**
   * The two labels the ticket cannot work out for itself.
   *
   * This used to also build the command echo under the ticket -- a flag per
   * control, in the order the controls appear. It said the same thing as the
   * controls directly above it, and the sentence above those says the part
   * that actually matters, so three readings of one state became one.
   */
  function labels() {
    const quote = BAL?.quoteSymbol || CFG?.nativeSymbol || '';
    if ($('u-quote')) $('u-quote').textContent = quote || 'quote';
    if ($('quote-show')) {
      $('quote-show').textContent = `${quote || 'quote'} · ${short($('quote').value.trim()) || '—'}`;
    }
  }

  // five stages read off s1/s2/s3 and what is on screen
  const STATE = { 'var(--acc)': 'ok', 'var(--acc2)': 'run', 'var(--warn)': 'wait', 'var(--bad)': 'bad' };
  const st = (id) => STATE[$(id).style.color] || '';
  const txt = (id) => $(id).textContent.trim();
  function tape() {
    const s1 = st('s1'); const t1 = txt('s1');
    const buying = s1 === 'run' && /buy|swap|sign/i.test(t1);
    const report = vis('sec-report'); const exec = vis('sec-exec');
    const s3 = exec ? st('s3') : '';
    const stages = [
      ['ᛁ', 'scan', s1 === 'run' && !buying ? 'run' : s1 === 'ok' || buying ? 'ok' : s1 === 'bad' ? 'bad' : '', s1 && !buying ? t1 : 'contract, tax, honeypot, owner'],
      ['ᚷ', 'buy', buying ? 'run' : s1 === 'ok' ? 'ok' : s1 === 'wait' ? 'wait' : '', buying ? t1 : s1 === 'ok' ? ($('skipBuy').checked ? 'skipped — held' : 'bought') : s1 === 'wait' ? t1 : 'half the budget swaps into the token'],
      ['ᛈ', 'plan', report && s1 === 'ok' ? (st('s2') || 'ok') : st('s2') === 'bad' ? 'bad' : '', report && s1 === 'ok' ? txt('s2') : 'ticks, amounts, min-out'],
      ['ᛊ', 'sign', exec ? (s3 === 'ok' ? 'ok' : s3 || 'wait') : '', exec ? (s3 ? txt('s3') : 'awaiting confirm') : 'wallet signs only after confirm'],
      ['ᛏ', 'confirm', s3 === 'ok' ? 'ok' : '', s3 === 'ok' ? txt('s3') : 'receipt, position, range'],
    ];
    $('tape').innerHTML = stages.map(([r, name, state, p], i) => `<div class="stage" data-s="${state}"><div class="bar"><u></u></div>`
      + `<i><span class="r">${r}</span>0${i + 1}</i><b>${name}</b><p title="${e(p)}">${e(p)}</p></div>`).join('');
    $('tape-st').innerHTML = s3 === 'ok' ? '<span style="color:var(--acc)">done</span>'
      : exec ? '<span style="color:var(--warn)">awaiting confirm</span>' : 'nothing signed until confirm';
  }

  // EXECUTE is armed only while the confirm section is up
  let armed = false;
  function arm() {
    const up = vis('sec-exec');
    if (up !== armed) { armed = up; $('btn-create').disabled = !up; }
  }
  // The badge is for the world that is NOT the normal one. "live · signing"
  // sat in the corner of every production page, saying the desk was doing the
  // thing it exists to do; a warning that is always on is not a warning.
  function badge() {
    const b = $('m-dry');
    if (!CFG) return;
    b.textContent = 'dry run';
    b.classList.toggle('hidden', !CFG.dryRun);
  }

  const all = () => { chips(); labels(); tape(); arm(); badge(); };
  // The sentence, the drawer's handle and the key follow the same events the
  // echo does -- they are describing the same ticket.
  const readouts = () => { tuningSummary(); runSummary(); runKey(); };
  const mo = new MutationObserver(() => { tape(); arm(); });
  for (const id of ['s1', 's2', 's3', 'sec-report', 'sec-exec']) {
    mo.observe($(id), { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  }
  const t = document.querySelector('.ticket');
  ['input', 'change'].forEach((ev) => t.addEventListener(ev, () => { chips(); labels(); readouts(); }));
  t.addEventListener('click', () => setTimeout(() => { labels(); readouts(); }, 0));
  new MutationObserver(labels).observe(t, { subtree: true, attributes: true, attributeFilter: ['class'] });
  // boot fills the ticket by assignment, which fires no event
  setInterval(() => { all(); readouts(); }, 1000);
  all(); readouts();
})();
