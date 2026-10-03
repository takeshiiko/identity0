/* radar.html's own script, lifted out of the page so the CSP can refuse
   inline script entirely. Loaded after common.js, in the same order it
   ran inline. */
let CFG = null;
let LIST = 'trending', DUR = '5m';
let ROWS = [];
let SORT = { key: 'vol.m5', dir: -1 };
let SEEN_HOT = new Set();
let timer = null;
let lastAt = 0;
const PREF = 'vidar.radar';

function boot() {
  $('m-wallet').textContent = CFG.wallet ?? $('m-wallet').textContent;
  // Listed but not open yet: the rail says so, and so does the room.
  const here = Boolean(CFG.radar) && !SOON_PAGES.has('radar');
  if (SOON_PAGES.has('radar')) {
    const body = $('not-here').querySelector('.body');
    if (body) {
      body.innerHTML = '<p class="hint"><b>Not open yet.</b> The radar reads GeckoTerminal for what is '
        + 'moving on Solana right now. It goes on with the next release.</p>';
    }
  }
  $('not-here').classList.toggle('hidden', here);
  $('sec-radar').classList.toggle('hidden', !here);
  if (!here) return;
  try {
    const p = JSON.parse(localStorage.getItem(PREF) || '{}');
    for (const k of ['f-mcap', 'f-liq', 'f-hot']) if (p[k]) $(k).value = p[k];
    if (p.list) { LIST = p.list; DUR = p.dur ?? DUR; }
    if (p.sort) SORT = p.sort;
  } catch { /* fresh */ }
  markTab();
  load();
  clearInterval(timer);
  timer = setInterval(load, 20_000);
  setInterval(() => { if (lastAt) $('tick').textContent = `${Math.round((Date.now() - lastAt) / 1000)}s ago`; }, 1000);
}

function savePref() {
  try { localStorage.setItem(PREF, JSON.stringify({ 'f-mcap': $('f-mcap').value, 'f-liq': $('f-liq').value, 'f-hot': $('f-hot').value, list: LIST, dur: DUR, sort: SORT })); } catch { /* private mode */ }
}
function markTab() {
  $('lists').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.list === LIST && b.dataset.dur === DUR));
}
$('lists').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-list]');
  if (!b) return;
  LIST = b.dataset.list; DUR = b.dataset.dur;
  if (LIST === 'new' && SORT.key === 'vol.m5') SORT = { key: 'createdAt', dir: -1 };
  markTab(); savePref(); load();
});
for (const k of ['f-mcap', 'f-liq', 'f-hot']) $(k).addEventListener('input', () => { savePref(); render(); });
$('f-notify').addEventListener('change', () => { if ($('f-notify').checked && 'Notification' in window && Notification.permission === 'default') Notification.requestPermission(); });

async function load() {
  try {
    const r = await api(`/api/radar?list=${LIST}&duration=${DUR}&pages=2`);
    const prev = new Map(ROWS.map((x) => [x.token, x]));
    ROWS = r.rows.map((x) => ({ ...x, _prev: prev.get(x.token) ?? null }));
    lastAt = r.at;
    $('s0').textContent = r.cached ? 'cached' : 'live';
    render();
  } catch (e) {
    $('s0').textContent = 'error';
    if (!ROWS.length) $('list').innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  }
}

const get = (o, path) => path.split('.').reduce((v, k) => (v == null ? v : v[k]), o);
const usd = (v) => (v === null || v === undefined ? '—' : `$${short(v)}`);
function short(v) {
  const a = Math.abs(v);
  if (a >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
  return Number(v).toFixed(a < 10 ? 2 : 0);
}
const pct = (v) => (v === null || v === undefined ? '<span class="cell-sub">—</span>' : `<span class="delta ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</span>`);
function age(iso) {
  if (!iso) return '—';
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m`;
  if (s < 86400) return `${(s / 3600).toFixed(1)}h`;
  return `${Math.round(s / 86400)}d`;
}

function render() {
  const minMcap = Number($('f-mcap').value) || 0;
  const minLiq = Number($('f-liq').value) || 0;
  const hotAt = Number($('f-hot').value) || 100_000;
  let rows = ROWS.filter((x) => (x.mcap ?? 0) >= minMcap && (x.liquidity ?? 0) >= minLiq);
  rows.sort((a, b) => {
    const av = get(a, SORT.key); const bv = get(b, SORT.key);
    const an = SORT.key === 'createdAt' ? new Date(av ?? 0).getTime() : (av ?? -Infinity);
    const bn = SORT.key === 'createdAt' ? new Date(bv ?? 0).getTime() : (bv ?? -Infinity);
    return (an < bn ? -1 : an > bn ? 1 : 0) * SORT.dir;
  });
  const maxV5 = Math.max(1, ...rows.map((x) => x.vol.m5 ?? 0));
  const cols = [
    ['token', 'token', 'l'], ['mcap', 'mcap'], ['vol.m5', '5m vol'], ['vol.m15', '15m vol'], ['vol.h1', '1h vol'], ['vol.h24', '24h vol'],
    ['pct.m5', '5m'], ['pct.h1', '1h'], ['pct.h24', '24h'], ['tx.m5.buys', '5m b/s'], ['liquidity', 'liq'], ['createdAt', 'age'], ['dex', 'dex', 'l'],
  ];
  const th = cols.map(([k, label, l]) => `<th data-key="${k}" class="${l ?? ''} ${SORT.key === k ? 'on' : ''}">${label}</th>`).join('');
  const changed = (x, path) => x._prev && get(x._prev, path) !== get(x, path) ? ' tick' : '';
  const body = rows.map((x) => {
    const hot = (x.vol.m5 ?? 0) >= hotAt;
    const a = age(x.createdAt);
    return `<tr data-token="${esc(x.token)}" class="${hot ? 'hot' : ''}">
      <td class="l"><div class="tk">${safeUrl(x.image) ? `<img src="${esc(safeUrl(x.image))}" alt="" loading="lazy">` : `<span class="ph">${esc(String(x.symbol).slice(0, 2))}</span>`}<div><b>${esc(x.symbol)}</b><small>${esc(x.token.slice(0, 4))}…${esc(x.token.slice(-4))}${x.pools > 1 ? ` · ${x.pools} pools` : ''}</small></div></div></td>
      <td class="${changed(x, 'mcap')}">${usd(x.mcap)}</td>
      <td class="${changed(x, 'vol.m5')}"><span class="bar" style="width:${Math.round(((x.vol.m5 ?? 0) / maxV5) * 40)}px"></span>${usd(x.vol.m5)}</td>
      <td class="${changed(x, 'vol.m15')}">${usd(x.vol.m15)}</td>
      <td class="${changed(x, 'vol.h1')}">${usd(x.vol.h1)}</td>
      <td>${usd(x.vol.h24)}</td>
      <td class="chg${changed(x, 'pct.m5')}">${pct(x.pct.m5)}</td>
      <td class="chg">${pct(x.pct.h1)}</td>
      <td class="chg">${pct(x.pct.h24)}</td>
      <td class="bs${changed(x, 'tx.m5.buys')}"><i class="b">${esc(x.tx.m5.buys)}</i> / <i class="s">${esc(x.tx.m5.sells)}</i></td>
      <td>${usd(x.liquidity)}</td>
      <td><span class="age ${a.endsWith('m') ? 'new' : ''}">${esc(a)}</span></td>
      <td class="l cell-sub">${esc(x.dex ?? '—')}</td>
    </tr>`;
  }).join('');
  $('list').innerHTML = rows.length
    ? `<table class="radar"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`
    : '<div class="hint">nothing passes the filters.</div>';
  $('count').textContent = rows.length;

  // Announce a row that just crossed the hot line, once per token.
  if ($('f-notify').checked && 'Notification' in window && Notification.permission === 'granted') {
    for (const x of rows) {
      if ((x.vol.m5 ?? 0) >= hotAt && !SEEN_HOT.has(x.token)) {
        SEEN_HOT.add(x.token);
        new Notification(`${x.symbol} · 5m vol ${usd(x.vol.m5)}`, { body: `mcap ${usd(x.mcap)} · 5m ${x.pct.m5 == null ? '—' : `${x.pct.m5 > 0 ? '+' : ''}${x.pct.m5.toFixed(1)}%`} · liq ${usd(x.liquidity)}` });
      }
    }
  }
}

$('list').addEventListener('click', (e) => {
  const th = e.target.closest('th[data-key]');
  if (th) {
    const k = th.dataset.key;
    SORT = SORT.key === k ? { key: k, dir: -SORT.dir } : { key: k, dir: -1 };
    savePref(); render(); return;
  }
  const tr = e.target.closest('tr[data-token]');
  if (tr) location.href = `/?ca=${encodeURIComponent(tr.dataset.token)}`;
});
