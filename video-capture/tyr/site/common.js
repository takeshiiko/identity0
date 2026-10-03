const $ = (id) => document.getElementById(id);
const fmt = (n, p = 8) => {
  const x = Number(n);
  if (!isFinite(x)) return String(n);
  if (x !== 0 && Math.abs(x) < 1e-6) return x.toExponential(4);
  return x.toLocaleString('en-US', { maximumFractionDigits: p });
};
const setStatus = (id, text, cls) => { const e = $(id); e.textContent = text; e.style.color = cls || ''; };
function pushLog(lines) {
  const box = $('log');
  if (!box) return;
  const list = lines || [];
  // Tint a line by what it says: failures magenta, waits amber, wins lime.
  const tone = (l) => (/\b(error|fail(ed)?|revert(ed)?|blocked|stopped)\b/i.test(l) ? 'e'
    : /\b(warn(ing)?|pending|rate.?limit(ed)?|retry(ing)?|waiting)\b/i.test(l) ? 'w'
      : /\b(done|ok|confirmed|minted|created|ready)\b/i.test(l) ? 'o' : '');
  const LV = { e: 'ERR', w: 'WRN', o: 'OK', '': 'INF' };
  box.innerHTML = list.map((l) => { const t = tone(l); return `<div class="${t}"><b class="lv">${LV[t]}</b><span>${esc(l)}</span></div>`; }).join('');
  box.scrollTop = box.scrollHeight;
  // The log is folded until it has something to say; the count on the fold
  // says how much, and a run that produced lines opens it.
  const cnt = $('log-cnt');
  if (cnt) cnt.textContent = list.length ? `${list.length} lines` : '';
  const wrap = $('logwrap');
  if (wrap && list.length) wrap.open = true;
}
/**
 * Text that is safe wherever it lands in HTML -- inside an element or inside
 * a quoted attribute.
 *
 * Quotes matter: token symbols, names and image URLs are metadata their
 * minter wrote, and half the templates here put them in attributes. Without
 * the quotes escaped, `" onerror="…` walks straight out of src="…" -- and on
 * a page that asks a wallet to sign, injected script is not a defacement.
 */
const esc = (s) => String(s).replace(/[<>&"']/g, (c) => ({
  '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;',
}[c]));

/**
 * A URL safe to put in src/href, or null.
 *
 * Absolute http(s) only. No base is passed on purpose: resolving against our
 * own origin would turn every unparseable string -- including the empty one
 * and the literal "null" -- into a same-origin path, which is how a missing
 * token image became a request for /null.
 */
const safeUrl = (u) => {
  if (!u || typeof u !== 'string') return null;
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:' ? x.href : null;
  } catch {
    return null;
  }
};
// Persisted per browser, not per tab: the password is typed once and survives
// closing the window. The gate itself stays -- it is the only thing between a
// deployment URL and a funded wallet.
const PW_KEY = 'vidar_pw';
const pwStore = {
  get() { try { return localStorage.getItem(PW_KEY) || ''; } catch { return ''; } },
  set(v) { try { localStorage.setItem(PW_KEY, v); } catch { /* private mode */ } },
  clear() { try { localStorage.removeItem(PW_KEY); } catch { /* private mode */ } },
};
let PW = pwStore.get();

// Rooms that are listed but not open yet. The rail shows them with a tag and
// refuses the click; the page itself says the same thing to anyone who kept
// the link. One set, so turning a room on is one edit.
const SOON_PAGES = new Set(['radar']);

// Which network every call below is for. Kept per browser like the password:
// switching chain is a deliberate act, and it should survive a reload rather
// than silently snapping back to the default mid-session.
const CHAIN_KEY = 'vidar_chain';
const chainStore = {
  get() { try { return localStorage.getItem(CHAIN_KEY) || ''; } catch { return ''; } },
  set(v) { try { localStorage.setItem(CHAIN_KEY, v); } catch { /* private mode */ } },
};
let CHAIN = chainStore.get();

/**
 * Position ids this browser saw minted here, per chain. The positions page
 * sends them along so a mint the chain scan has not reached yet (a throttled
 * endpoint, a block-old mint) is still listed; the scan fills in the rest.
 */
const knownPositions = {
  key: () => `vidar.positions.${CHAIN || 'default'}`,
  get() { try { return JSON.parse(localStorage.getItem(this.key()) || '[]'); } catch { return []; } },
  add(id) {
    if (!/^\d+$/.test(String(id ?? ''))) return;
    try {
      const list = this.get().filter((x) => x !== String(id));
      list.unshift(String(id));
      localStorage.setItem(this.key(), JSON.stringify(list.slice(0, 100)));
    } catch { /* storage may be unavailable */ }
  },
};

/**
 * Is this a token address on the chain we are pointed at?
 *
 * Hardcoding the 0x shape here rejected every Solana mint before the request
 * left the page -- the pools panel just kept saying "paste a token address"
 * for an address that was already pasted and perfectly valid.
 */
function isTokenAddress(v) {
  const s = String(v ?? '').trim();
  return CFG?.chainKind === 'svm'
    ? /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s)      // base58, no 0 O I l
    : /^0x[0-9a-fA-F]{40}$/.test(s);
}

async function api(path, body) {
  // The chain rides on every request. Sent explicitly rather than held as
  // server state, because on Vercel the next request may land on a different
  // instance -- and a request that guessed its own chain would read the wrong
  // contracts and report the answer as fact.
  let url = path;
  if (CHAIN) {
    url += `${path.includes('?') ? '&' : '?'}chain=${encodeURIComponent(CHAIN)}`;
  }
  const res = await fetch(url, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', 'x-app-password': PW, ...(connectedAddress() ? { 'x-wallet': connectedAddress() } : {}) },
    body: body ? JSON.stringify(CHAIN ? { ...body, chain: CHAIN } : body) : undefined,
  });
  // Not everything that answers is the API. Vercel cuts a function at 60s
  // and replies in plain text ("An error occurred with your deployment /
  // FUNCTION_INVOCATION_TIMEOUT"), which res.json() turned into
  // "Unexpected token 'A' ... is not valid JSON" on screen.
  const text = await res.text();
  let j;
  try { j = JSON.parse(text); } catch {
    const timedOut = res.status === 504 || /TIMEOUT/i.test(text);
    throw new Error(timedOut
      ? 'the request ran past the 60s a server call gets, so nothing came back. On a chain read '
        + 'through a capped or rate-limited RPC this is the pool scan for an older token: set '
        + `${(CHAIN || 'the chain').toUpperCase()}_LOG_RPC_URLS to a keyed endpoint, or try a newer token.`
      : `the server answered ${res.status} with something that is not JSON: ${text.slice(0, 120).trim()}`);
  }
  if (!j.ok) throw new Error(j.error || 'request failed');
  if (j.log) pushLog(j.log);
  return j;
}
async function unlock(pw) {
  PW = pw;
  // A wallet connected last time reconnects without a prompt (the wallet
  // remembers the site); only then is the config asked, so it names it.
  try { if (localStorage.getItem(solWallet.key) && solWallet.detect()) await solWallet.connect({ silent: true }); } catch { /* not trusted any more */ }
  try { if (localStorage.getItem(evmWallet.key)) await evmWallet.connect({ silent: true }); } catch { /* not trusted any more */ }
  try {
    CFG = await api('/api/config');         // throws on a wrong password
  } catch (e) {
    // A chain this browser remembers may be gone from the registry -- the
    // server refuses an unknown slug rather than answering about the wrong
    // chain, which would otherwise lock the desk shut on a stale preference.
    if (!/unknown chain|is not open yet/i.test(e.message)) throw e;
    CHAIN = '';
    try { localStorage.removeItem(CHAIN_KEY); } catch { /* private mode */ }
    CFG = await api('/api/config');
  }
  if (pw) pwStore.set(pw);
  mountChainSwitch();
  mountNativePrice();
  mountWalletButton();
  $('gate').classList.add('hidden');
  $('app').classList.remove('hidden');
  boot();
}

/**
 * The gas token's dollar price, beside the brand.
 *
 * Every number on this desk is counted in it -- a budget, a rent, a fee, a
 * PnL -- so what it is worth is part of what they mean, and on a chain whose
 * gas token moves 10% in a day that is not a detail. The cell is built here
 * rather than in each page's markup because every page has the same header
 * and none of them should have to remember it.
 *
 * The server keeps the price for a minute (one GeckoTerminal call inside a
 * 30-a-minute budget the charts also spend), so the header asks on the same
 * clock. A chain with no feed has no cell at all.
 */
const NATIVE_PRICE_MS = 60_000;
/**
 * A stat cell with nothing in it is a dash in a box.
 *
 * The strips print every cell from the first paint, so a desk with no wallet
 * connected showed six of them reading "—" above an empty panel. A cell with
 * no number steps out, and the strip itself goes when none of them have one.
 */
function trimStats() {
  // Same thing in the bar: "wallet —" and "balance —" are two cells holding a
  // dash until a wallet is connected, next to the key that connects it.
  for (const cell of document.querySelectorAll('header .meta.trim')) {
    const v = (cell.querySelector('b')?.textContent ?? '').trim();
    const empty = v === '' || v === '—' || v === '-';
    if (cell.classList.contains('hidden') !== empty) cell.classList.toggle('hidden', empty);
  }
  for (const sum of document.querySelectorAll('.sum')) {
    let last = null;
    for (const cell of sum.children) {
      const v = (cell.querySelector('b')?.textContent ?? '').trim();
      const empty = v === '' || v === '—' || v === '-';
      if (cell.classList.contains('hidden') !== empty) cell.classList.toggle('hidden', empty);
      cell.classList.remove('last');
      if (!empty) last = cell;
    }
    last?.classList.add('last');
    sum.classList.toggle('hidden', !last);
  }
}
// The pages fill these at their own pace -- a balance here, a price there --
// so the strip watches itself rather than asking every one of them to call.
(() => {
  let queued = false;
  const o = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; trimStats(); });
  });
  const start = () => {
    for (const el of document.querySelectorAll('.sum, header .meta.trim')) {
      o.observe(el, { childList: true, characterData: true, subtree: true });
    }
    trimStats();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();

function mountNativePrice() {
  const head = document.querySelector('header');
  if (!head) return;
  let cell = $('m-price');
  if (!cell) {
    cell = document.createElement('div');
    cell.id = 'm-price';
    cell.className = 'meta price-cell hidden';
    head.querySelector('.brand')?.after(cell);
  }
  const tick = async () => {
    try {
      const { symbol, usd, note } = await api('/api/native-price');
      if (!(usd > 0)) { cell.classList.add('hidden'); return; }
      cell.innerHTML = `${esc(String(symbol).toLowerCase())} price `
        + `<b>$${esc(fmt(usd, usd >= 100 ? 2 : 4))}</b>`;
      // Where the number came from matters when it did not come from here.
      cell.title = `${symbol} in dollars, read from GeckoTerminal and no more than a minute old`
        + (note ? ` · ${note}` : '');
      cell.classList.remove('hidden');
    } catch { /* a header nicety: it never takes the page down with it */ }
  };
  tick();
  clearInterval(mountNativePrice.timer);
  mountNativePrice.timer = setInterval(tick, NATIVE_PRICE_MS);
}

$('btn-login').onclick = async () => {
  const btn = $('btn-login');
  if (btn.disabled) return;
  $('gate-err').innerHTML = '';
  // The first request after a deploy wakes a cold function, which can take
  // several seconds -- long enough that a silent button reads as a refused
  // password. Say what is happening, and refuse a second click meanwhile.
  btn.disabled = true;
  btn.textContent = 'checking…';
  const slow = setTimeout(() => {
    $('gate-err').innerHTML = '<div class="hint">waking the server — first request after a deploy is slow</div>';
  }, 2500);
  try {
    await unlock($('pw').value);
    $('gate-err').innerHTML = '';
  } catch (e) {
    $('gate-err').innerHTML = `<div class="alert">${esc(e.message)}</div>`;
  } finally {
    clearTimeout(slow);
    btn.disabled = false;
    btn.textContent = 'unlock';
  }
};
$('pw').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btn-login').click(); });
/**
 * Build the network switch from what the server says it supports.
 *
 * Changing it reloads the page rather than re-fetching in place. A plan, a
 * pool list and a set of balances on screen all belong to the chain they were
 * read from; re-pointing the requests without clearing them would leave Base
 * numbers under a Robinhood heading until each panel happened to refresh.
 */
/**
 * The wallet that signs for the chain on screen. The server holds no key:
 * every request names the connected wallet in a header, the server builds
 * and simulates for that address and hands back what to sign, and the
 * wallet signs here. Solana wallets (Phantom, Solflare, Backpack) and EVM
 * wallets (MetaMask, Rabby, Coinbase Wallet -- whatever injects
 * window.ethereum) each keep their own connection; the chain picks one.
 */
const connectedWallet = () => (CFG?.chainKind === 'svm' ? solWallet : CFG?.chainKind === 'evm' ? evmWallet : null);
const connectedAddress = () => connectedWallet()?.address ?? solWallet.address ?? evmWallet.address ?? null;

const evmWallet = {
  address: null,
  provider: null,
  key: 'vidar.evmwallet',
  detect() {
    const w = window;
    const list = w.ethereum?.providers ?? (w.ethereum ? [w.ethereum] : []);
    return list.find((p) => p.isMetaMask && !p.isBraveWallet) ?? list.find((p) => p.isRabby) ?? list[0] ?? w.ethereum ?? null;
  },
  async waitForProvider(ms = 2500) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const p = this.detect();
      if (p) return p;
      await new Promise((r) => setTimeout(r, 100));
    }
    return this.detect();
  },
  async connect({ silent = false } = {}) {
    const p = silent ? await this.waitForProvider() : this.detect();
    if (!p) throw new Error('no EVM wallet found in this browser (install MetaMask, Rabby or Coinbase Wallet)');
    // eth_accounts answers without a prompt for a site the wallet already
    // trusts; eth_requestAccounts opens the wallet.
    const accounts = await p.request({ method: silent ? 'eth_accounts' : 'eth_requestAccounts' });
    const a = accounts?.[0];
    if (!a) throw new Error(silent ? 'the wallet did not reconnect' : 'the wallet shared no account');
    this.provider = p; this.address = a;
    try { localStorage.setItem(this.key, a); } catch { /* private mode */ }
    p.on?.('accountsChanged', (acc) => { if (acc?.[0]) { this.address = acc[0]; location.reload(); } else this.disconnect({ fromWallet: true }); });
    p.on?.('disconnect', () => { if (this.address) this.disconnect({ fromWallet: true }); });
    return a;
  },
  async disconnect({ fromWallet = false } = {}) {
    if (!fromWallet) { try { await this.provider?.request({ method: 'wallet_revokePermissions', params: [{ eth_accounts: {} }] }); } catch { /* not every wallet can */ } }
    this.address = null; this.provider = null;
    try { localStorage.removeItem(this.key); } catch { /* private mode */ }
    location.reload();
  },
  /** Put the wallet on the chain the transaction is for, adding it if the wallet has never seen it. */
  async ensureChain(need) {
    const want = `0x${Number(need.chainId).toString(16)}`;
    const cur = await this.provider.request({ method: 'eth_chainId' });
    if (String(cur).toLowerCase() === want) return;
    try {
      await this.provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: want }] });
    } catch (e) {
      const unknown = e?.code === 4902 || e?.data?.originalError?.code === 4902 || /unrecognized|not been added|4902/i.test(e?.message ?? '');
      if (!unknown || !need.rpc) throw e;
      await this.provider.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: want, chainName: need.chainName, rpcUrls: [need.rpc],
          nativeCurrency: need.native ?? { name: 'Ether', symbol: 'ETH', decimals: 18 },
          blockExplorerUrls: need.explorer ? [need.explorer] : [],
        }],
      });
    }
  },
  /** Sign and send what the server built, then wait for it to be mined. The receipt comes from the wallet's own node. */
  async signAndSend(need) {
    if (!this.provider || !this.address) throw new Error('no wallet connected');
    if (need.tx.from.toLowerCase() !== this.address.toLowerCase()) throw new Error('the wallet is on another account than the one this was built for; reload the page');
    await this.ensureChain(need);
    const hash = await this.provider.request({ method: 'eth_sendTransaction', params: [need.tx] });
    const url = need.explorer ? `${need.explorer}/tx/${hash}` : null;
    for (let i = 0; i < 240; i++) {
      const r = await this.provider.request({ method: 'eth_getTransactionReceipt', params: [hash] }).catch(() => null);
      if (r) {
        if (r.status !== '0x1') throw new Error(`the ${need.label} reverted: ${url ?? hash}`);
        return { hash, txHash: hash, url, txUrl: url, status: 'success', blockNumber: parseInt(r.blockNumber, 16) };
      }
      await new Promise((res) => setTimeout(res, 1500));
    }
    throw new Error(`the ${need.label} went out (${url ?? hash}) but has not been mined after six minutes; check the explorer before trying again`);
  },
};

const solWallet = {
  address: null,
  provider: null,
  key: 'vidar.solwallet',
  detect() {
    const w = window;
    return w.phantom?.solana ?? (w.solana?.isPhantom ? w.solana : null) ?? w.solflare ?? w.backpack?.solana ?? w.solana ?? null;
  },
  // Extensions inject their provider around page load, sometimes after the
  // script has already run; a reconnect that looks once sees nothing.
  async waitForProvider(ms = 2500) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const p = this.detect();
      if (p) return p;
      await new Promise((r) => setTimeout(r, 100));
    }
    return this.detect();
  },
  async connect({ silent = false } = {}) {
    const p = silent ? await this.waitForProvider() : this.detect();
    if (!p) throw new Error('no Solana wallet found in this browser (install Phantom, Solflare or Backpack)');
    let r;
    try {
      r = await p.connect(silent ? { onlyIfTrusted: true } : undefined);
    } catch (e) {
      // Not every wallet knows onlyIfTrusted; a plain connect on a site it
      // already approved comes back without a prompt.
      if (!silent || p.isPhantom) throw e;
      r = await p.connect();
    }
    const pk = (r?.publicKey ?? p.publicKey)?.toString?.();
    if (!pk) throw new Error('the wallet did not share an address');
    this.provider = p; this.address = pk;
    try { localStorage.setItem(this.key, pk); } catch { /* private mode */ }
    p.on?.('disconnect', () => { if (this.address) this.disconnect({ fromWallet: true }); });
    p.on?.('accountChanged', (npk) => { if (npk) { this.address = npk.toString(); location.reload(); } else this.disconnect({ fromWallet: true }); });
    return pk;
  },
  async disconnect({ fromWallet = false } = {}) {
    if (!fromWallet) { try { await this.provider?.disconnect?.(); } catch { /* already gone */ } }
    this.address = null; this.provider = null;
    try { localStorage.removeItem(this.key); } catch { /* private mode */ }
    location.reload();
  },
  /** Sign what the server built and send it through the server; the confirmation comes back. */
  async signAndSend(need) {
    if (!this.provider) throw new Error('no wallet connected');
    if (!window.solanaWeb3) throw new Error('the Solana library did not load; reload the page');
    const bytes = Uint8Array.from(atob(need.tx), (c) => c.charCodeAt(0));
    const tx = need.versioned ? window.solanaWeb3.VersionedTransaction.deserialize(bytes) : window.solanaWeb3.Transaction.from(bytes);
    const signed = await this.provider.signTransaction(tx);
    const raw = signed.serialize();
    const b64 = btoa(String.fromCharCode(...raw));
    return api('/api/solana/send', { tx: b64, label: need.label });
  },
};

/**
 * Run a write call for a connected wallet: whenever the server answers with
 * something to sign, sign and send it, then call again with `resume(sent)`
 * merged into the body until the server answers with a result. Without a
 * connected wallet this is a plain api() call.
 */
async function apiSigned(path, body, { onStep = () => {}, resume = () => ({}), maxSteps = 8 } = {}) {
  let payload = body;
  for (let step = 0; step < maxSteps; step++) {
    const r = await api(path, payload);
    if (!r.needsSignature) return r;
    const need = r.needsSignature;
    const evm = need.kind === 'evm';
    onStep(`sign the ${need.label} in your wallet…`);
    const sent = await (evm ? evmWallet : solWallet).signAndSend(need);
    onStep(`${need.label} confirmed`);
    // An EVM hand-off says itself how to go on: `final` ends the flow (the
    // hand-off carries what the result needs), otherwise the same call is
    // made again -- with the hash under `hashField` and `resume` merged in
    // -- and finds the approval granted or the buy in the wallet.
    const next = evm
      ? (need.meta?.final ? null : { ...(need.meta?.resume ?? {}), ...(need.meta?.hashField ? { [need.meta.hashField]: sent.hash } : {}) })
      : resume(sent, need);
    if (next === null) return { ...(evm ? need.meta : {}), ...sent, needsSignature: null, meta: need.meta, signed: true };
    payload = { ...payload, ...next };
  }
  throw new Error('too many signing steps; check the wallet and the explorer before trying again');
}

function mountWalletButton() {
  const host = $('m-wallet');
  if (!host) return;
  const cell = host.parentElement;
  const w = connectedWallet();
  // Chains with no browser wallet keep the plain readout.
  if (!w) { cell.classList.remove('wallet-cell'); return; }
  let remembered = null;
  try { remembered = localStorage.getItem(w.key); } catch { /* private mode */ }
  const names = w === solWallet ? 'phantom · solflare · backpack' : 'metamask · rabby · coinbase';
  const addr = w.address;
  const short = addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '';
  const explorer = CFG?.explorer ? `${CFG.explorer}/${w === solWallet ? 'account' : 'address'}/${addr}` : null;

  // One control, two states. Not connected: a single key that connects.
  // Connected: the address is the key, and it opens a menu with disconnect.
  // #m-wallet stays as the hook other scripts write to; the key draws its own.
  cell.className = `meta wallet-cell${addr ? ' connected' : ''}`;
  cell.innerHTML = addr
    ? `<button type="button" id="m-connect" class="wkey on" aria-haspopup="menu" aria-expanded="false" title="${esc(addr)}">
         <i class="wdot" aria-hidden="true"></i><span class="wtxt"><small>wallet</small><b>${esc(short)}</b></span><span class="caret" aria-hidden="true">▾</span>
       </button>
       <div class="wmenu hidden" role="menu">
         <div class="wm-head"><small>signing as</small><code>${esc(addr)}</code></div>
         <button type="button" role="menuitem" data-act="copy"><span>copy address</span><kbd>c</kbd></button>
         ${explorer ? `<a role="menuitem" href="${esc(explorer)}" target="_blank" rel="noopener"><span>view on explorer</span><kbd>↗</kbd></a>` : ''}
         <button type="button" role="menuitem" data-act="disconnect" class="bad"><span>disconnect</span><kbd>⏏</kbd></button>
       </div>
       <b id="m-wallet" class="hidden">${esc(addr)}</b>`
    : `<button type="button" id="m-connect" class="wkey" title="sign with ${esc(names)}; the server holds no key">
         <span class="wtxt"><small>${remembered ? 'not reconnected' : 'no wallet'}</small><b>${remembered ? 'reconnect' : 'connect wallet'}</b></span><span class="cur" aria-hidden="true"></span>
       </button>
       <b id="m-wallet" class="hidden"></b>`;

  const btn = $('m-connect');
  const menu = cell.querySelector('.wmenu');
  if (!addr) {
    btn.onclick = async () => {
      btn.disabled = true; btn.querySelector('b').textContent = 'connecting…';
      try { await w.connect(); location.reload(); } catch (e) { alert(e.message); mountWalletButton(); }
    };
    return;
  }
  const open = (on) => {
    menu.classList.toggle('hidden', !on);
    // on a phone the menu is pinned to the screen, just under the key
    if (on && getComputedStyle(menu).position === 'fixed') menu.style.top = `${btn.getBoundingClientRect().bottom + 1}px`;
    btn.setAttribute('aria-expanded', String(on)); if (on) menu.querySelector('[role=menuitem]')?.focus(); };
  btn.onclick = (e) => { e.stopPropagation(); open(menu.classList.contains('hidden')); };
  menu.onclick = async (e) => {
    e.stopPropagation();
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'copy') {
      try { await navigator.clipboard.writeText(addr); } catch { /* no clipboard: the address is on screen */ }
      const t = menu.querySelector('[data-act=copy] span'); t.textContent = 'copied ✓'; setTimeout(() => { t.textContent = 'copy address'; }, 1200);
    }
    if (act === 'disconnect') { open(false); try { await w.disconnect(); } catch (err) { alert(err.message); } }
  };
  if (!mountWalletButton.wired) {
    mountWalletButton.wired = true;
    document.addEventListener('click', () => { const m = document.querySelector('.wmenu'); if (m && !m.classList.contains('hidden')) { m.classList.add('hidden'); $('m-connect')?.setAttribute('aria-expanded', 'false'); } });
    document.addEventListener('keydown', (e) => {
      const m = document.querySelector('.wmenu');
      if (!m || m.classList.contains('hidden')) return;
      if (e.key === 'Escape') { m.classList.add('hidden'); $('m-connect')?.setAttribute('aria-expanded', 'false'); $('m-connect')?.focus(); }
      if (e.key === 'c' && !e.target.closest('input')) m.querySelector('[data-act=copy]')?.click();
    });
  }
}

function mountChainSwitch() {
  const wrap = $('m-chainwrap');
  if (!wrap || !CFG?.chains?.length) return;
  // CFG.chain is what the server actually served, which is the truth when
  // nothing is stored yet or a stored slug no longer exists.
  CHAIN = CFG.chain;
  chainStore.set(CFG.chain);
  wrap.dataset.chain = CFG.chain;
  /*
   * The networks, by their own marks.
   *
   * The switch used to spell each chain out in display caps, which cost a
   * quarter of the bar for three words nobody reads twice. A chain is a logo:
   * you recognise Base's disc and Solana's bars faster than you read either
   * name, and the name is still there on hover and under the mark.
   *
   * A chain that is not open yet keeps its place and its mark, dimmed, with
   * the tag over it -- hiding it would say the desk does not know about it.
   */
  wrap.innerHTML = CFG.chains.map((c) => `<button type="button" role="radio" data-chain="${esc(c.key)}"
      ${c.soon ? 'disabled aria-disabled="true" class="soon"' : ''}
      aria-checked="${c.key === CFG.chain}" tabindex="${c.key === CFG.chain ? 0 : -1}"
      title="${esc(c.name)} · chain ${esc(c.id)}${c.soon ? ' · not open yet' : ''}">
      ${c.logo
        ? `<img class="chain-mark" src="${esc(c.logo)}" alt="${esc(c.name)}">`
        : `<b>${esc(c.short ?? c.name.replace(/\s+chain$/i, ''))}</b>`}
      ${c.soon ? '<i class="soon-tag">soon</i>' : ''}</button>`).join('');

  // The radar rides on the same idea: listed, labelled, and not yet a door.
  const radarLink = SOON_PAGES.has('radar') ? $('nav-radar') : null;
  if (radarLink) {
    radarLink.classList.remove('hidden');
    radarLink.classList.add('soon');
    radarLink.setAttribute('aria-disabled', 'true');
    radarLink.removeAttribute('href');
    // Inside the label, not above the bar: the bar scrolls sideways, and
    // anything positioned outside it is clipped away.
    const label = radarLink.querySelector('span');
    if (label && !label.querySelector('.soon-tag')) {
      const tag = document.createElement('i');
      tag.className = 'soon-tag';
      tag.textContent = 'soon';
      label.prepend(tag);
    }
  }

  // Only the open ones answer a click or a function key.
  const keys = CFG.chains.filter((c) => !c.soon).map((c) => c.key);
  const pick = (key) => {
    if (!key || key === CFG.chain || !keys.includes(key)) return;
    // Light the new key before the reload so the click reads as taken.
    wrap.querySelectorAll('button').forEach((b) => { b.setAttribute('aria-checked', String(b.dataset.chain === key)); });
    wrap.classList.add('switching');
    chainStore.set(key);
    location.reload();
  };
  wrap.onclick = (e) => pick(e.target.closest('button[data-chain]')?.dataset.chain);
  // F6, F7, F8… pick a network, in the order the keycaps show them.
  document.addEventListener('keydown', (e) => {
    const m = /^F(\d+)$/.exec(e.key);
    const key = m && CFG.chains[Number(m[1]) - 6]?.key;
    if (!key) return;
    e.preventDefault();
    pick(key);
  });
  // Arrow keys move between networks like a radio group; the move is the choice.
  wrap.onkeydown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const i = keys.indexOf(CFG.chain);
    const next = keys[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 1) + keys.length) % keys.length];
    pick(next);
  };
}

/**
 * Try to open the desk before showing anyone a password box.
 *
 * The gate may not be up at all -- the server decides, and the only way to
 * ask is to call /api/config and see whether it answers. So every page tries
 * once: an answer means the desk is open (or the remembered password still
 * works) and the gate is never seen; a 401 means the gate is real, and the
 * password box appears then rather than flashing up first.
 *
 * It waits for DOMContentLoaded because the page's own script declares CFG
 * and this file loads before it: unlocking here and now reads that binding
 * inside its dead zone, the unlock rejects on a ReferenceError, and the desk
 * sits at the gate as if the password were wrong.
 */
const gateBusy = (on) => {
  const box = $('gate')?.querySelector('.gatebox');
  if (!box) return;
  for (const el of [box.querySelector('label'), $('pw'), $('btn-login')]) {
    if (el) el.classList.toggle('hidden', on);
  }
  const hint = box.querySelector('.hint');
  if (hint) hint.textContent = on ? 'opening the desk…' : 'Enter the shared password to open the desk.';
};
gateBusy(true);
const auto = async () => {
  try {
    await unlock(PW);
  } catch {
    // Either the gate is up and nothing is remembered, or what was
    // remembered no longer works. Both end at the password box.
    if (PW) pwStore.clear();
    gateBusy(false);
  }
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', auto, { once: true });
else auto();
function renderPosition(p) {
  if (p.error) {
    return `<div class="pos"><div class="pos-h"><b>#${esc(p.tokenId)}</b></div>`
      + `<div class="pos-m">${esc(p.error)}</div></div>`;
  }
  const when = p.timestamp
    ? new Date(p.timestamp * 1000).toLocaleString(undefined,
        { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';
  const tag = p.closed ? ['closed', 'closed'] : p.inRange ? ['in', 'in range'] : ['out', 'out of range'];

  // Clamp the marker so an out-of-range position still shows which edge it left.
  let at = null;
  if (p.spot && p.priceUpper > p.priceLower) {
    const f = Math.log(p.spot / p.priceLower) / Math.log(p.priceUpper / p.priceLower);
    at = Math.max(0, Math.min(1, f)) * 100;
  }

  return `<div class="pos">
    <div class="pos-h"><b>${esc(p.pair)}</b><time>${esc(when)}</time></div>
    <div class="pos-m">fee ${esc(p.feePercent)}% ·
      <a href="${esc(p.txUrl)}" target="_blank">#${esc(p.tokenId)}</a>
      <span class="tag ${tag[0]}" style="float:right">${tag[1]}</span></div>
    <div class="minibar">${at === null ? '' : `<i style="left:${at}%"></i>`}</div>
    <div class="pos-r"><span>${fmt(p.priceLower, 6)}</span><span>${fmt(p.priceUpper, 6)}</span></div>
    ${renderAmounts(p)}
    ${renderFees(p)}
    ${typeof onPositionAction === 'function' && !p.closed && p.stillOwned !== false ? `
      <div class="acts">
        <button data-act="collect" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}">collect fees</button>
        <button data-act="close" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}" class="danger">close</button>
      </div>` : ''}
  </div>`;
}

/**
 * What went in versus what is there now, both valued in the quote asset so the
 * two lines compare directly. The deposit is read from the mint transaction --
 * the budget typed into the form is never stored anywhere.
 */
function renderAmounts(p) {
  const line = (label, a, cls = '') => (!a ? '' :
    `<div class="amt ${cls}"><span>${label}</span>`
    + `<b>${fmt(a.quote, 4)} ${esc(p.quoteSymbol)} + ${fmt(a.token, 4)} ${esc(p.tokenSymbol)}</b>`
    + (a.valueQuote === null || a.valueQuote === undefined ? ''
      : `<i>≈ ${fmt(a.valueQuote, 4)} ${esc(p.quoteSymbol)}</i>`)
    + '</div>');
  return line('deposited', p.deposited) + line('now', p.holds, 'now');
}

/**
 * How fast the fees are coming in.
 *
 * The total says what a position has earned since it was opened or last
 * claimed; it says nothing about whether it is earning *now*, which on a
 * token that moves is the only question. So each visit records what the
 * uncollected fees were and when, and the next one reports the difference.
 * Per hour, as a share of the position -- the number an exit rule is
 * written against.
 *
 * Kept per browser: it is a reading of this screen over time, not a fact
 * about the chain, and a server that keeps no state cannot answer it.
 *
 * What is sampled is the two fee amounts, not what they are worth. A fee
 * balance held in the token grows in quote terms whenever the token does,
 * and reading that as income would have every pumping position look like it
 * was earning. Only the amounts can rise from a trade; the price they are
 * valued at is applied afterwards, once.
 */
const feeSamples = {
  // A v3 and a v4 position can share a number -- which is why the rows are
  // found by id and protocol together. The key has to say both.
  key: (p) => `vidar.feerate.${CHAIN || 'default'}.${p.protocol ?? 'v4'}.${p.tokenId}`,
  read(p) {
    try { return JSON.parse(localStorage.getItem(this.key(p)) || 'null'); } catch { return null; }
  },
  write(p, sample) {
    try { localStorage.setItem(this.key(p), JSON.stringify(sample)); } catch { /* private mode */ }
  },
};

// Long enough that a couple of trades' worth of noise does not become an
// hourly rate. Under it the last sample is kept and the clock keeps running.
const FEE_SAMPLE_MIN_MINUTES = 3;

function feeRateLine(p) {
  if (!p.fees || p.fees.error || p.closed) return '';
  const token = Number(p.fees.token);
  const quote = Number(p.fees.quote);
  const value = Number(p.holds?.valueQuote ?? 0);
  if (!isFinite(token) || !isFinite(quote)) return '';
  const at = Date.now();
  const prev = feeSamples.read(p);
  if (!prev || !isFinite(prev.token) || !isFinite(prev.quote)) {
    feeSamples.write(p, { token, quote, at });
    return '<div class="cell-sub">rate: measuring…</div>';
  }
  // Either amount falling means they were claimed: the clock starts again
  // rather than reporting a negative rate.
  if (token < prev.token || quote < prev.quote) {
    feeSamples.write(p, { token, quote, at });
    return '<div class="cell-sub">rate: restarted (fees claimed)</div>';
  }
  const mins = (at - prev.at) / 60000;
  if (mins < FEE_SAMPLE_MIN_MINUTES) return '';
  feeSamples.write(p, { token, quote, at });
  // New fee, valued now -- not the change in what the old fee is worth.
  const delta = (token - prev.token) * Number(p.spot ?? 0) + (quote - prev.quote);
  const perHour = (delta / mins) * 60;
  const pct = value > 0 ? (perHour / value) * 100 : null;
  const hot = pct !== null && pct >= 1;
  return `<div class="cell-sub${hot ? ' hot' : ''}">+${fmt(delta, 5)} in ${fmt(mins, 0)}m`
    + (pct === null ? '' : ` · <b>${fmt(pct, 2)}%/h</b>`) + '</div>';
}

/** Fees earned and still unclaimed. Zero is worth showing; unknown is not. */
function renderFees(p) {
  if (!p.fees) return '';
  const zero = Number(p.fees.token) === 0 && Number(p.fees.quote) === 0;
  const value = p.fees.valueQuote === null ? '' : ` ≈ ${fmt(p.fees.valueQuote, 4)} ${esc(p.quoteSymbol)}`;
  return `<div class="fees${zero ? ' zero' : ''}">fees earned `
    + `<b>${fmt(p.fees.token, 4)} ${esc(p.tokenSymbol)} + ${fmt(p.fees.quote, 4)} ${esc(p.quoteSymbol)}</b>`
    + `<span>${value}</span></div>`;
}

/**
 * Positions as one scannable table, the shape a portfolio actually wants.
 *
 * "vs hold" is (value now + fees) - deposited, with the deposit valued at
 * TODAY's price. That makes it the LP-versus-holding comparison, not profit and
 * loss: it answers "was providing liquidity better than just keeping the two
 * amounts", which is a different question from "am I up in USDG".
 */
function renderPositionsTable(rows, { actions = false, compound = false, realign = false } = {}) {
  if (!rows.length) return '';
  const head = ['position', 'cost', 'value now', 'fees earned', 'pnl', 'range',
    ...(actions ? ['&nbsp;'] : [])];
  return '<div class="tablewrap"><table class="pos-t"><thead><tr>'
    + head.map((h) => `<th>${h}</th>`).join('')
    + '</tr></thead><tbody>'
    + rows.map((p) => renderPositionRow(p, actions, compound, realign)).join('')
    + '</tbody></table></div>';
}

function amountCell(a, p, extra = '') {
  if (!a) return '<td><span class="cell-sub">—</span></td>';
  const value = a.valueQuote === null || a.valueQuote === undefined ? ''
    : `<div class="cell-val">${fmt(a.valueQuote, 4)} ${esc(p.quoteSymbol)}</div>`;
  return `<td>${value}<div class="cell-sub">${fmt(a.token, 4)} ${esc(p.tokenSymbol)}`
    + `<br>${fmt(a.quote, 4)} ${esc(p.quoteSymbol)}</div>${extra}</td>`;
}

/**
 * The price the position went in at.
 *
 * Recovered from the mint itself -- the deposit amounts plus the range bounds
 * pin the price exactly -- which is the same number the cost column is valued
 * at. Shown next to it so the cost figure says what it is priced at instead of
 * leaving that to be inferred.
 */
function entryPriceLine(p) {
  const at = p.deposited?.mintPrice;
  if (at === null || at === undefined) return '';
  return `<div class="cell-sub entry">@ ${fmt(at, 8)} ${esc(p.quoteSymbol)}</div>`;
}

function renderPositionRow(p, actions, compound = false, realign = false) {
  if (p.error) {
    return `<tr><td class="pair-name">#${esc(p.tokenId)}</td>`
      + `<td colspan="${actions ? 6 : 5}"><span class="cell-sub">${esc(p.error)}</span></td></tr>`;
  }
  const when = p.timestamp
    ? new Date(p.timestamp * 1000).toLocaleString(undefined,
        { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : '—';
  const tag = p.closed ? ['closed', 'closed'] : p.inRange ? ['in', 'in range'] : ['out', 'out of range'];

  // Where spot sits inside the band, clamped so an exited position still reads.
  let at = null;
  if (p.spot && p.priceUpper > p.priceLower) {
    const f = Math.log(p.spot / p.priceLower) / Math.log(p.priceUpper / p.priceLower);
    at = Math.max(0, Math.min(1, f)) * 100;
  }

  // Realised against what the position cost, not against holding: the cost is
  // the deposit priced at the moment it was made, recovered from the mint.
  const dep = p.pnl?.cost;
  const diff = p.pnl ? p.pnl.abs : null;
  const pct = p.pnl ? p.pnl.percent : null;

  // Rounding noise reads as "-1.0000e-6 USDG / -0%", which looks like a loss.
  // Anything under a hundredth of a percent of the deposit is flat.
  const flat = diff !== null && Math.abs(diff) < Math.max(1e-6, Math.abs(dep ?? 0) * 1e-4);
  const vsHold = diff === null ? '<span class="cell-sub">—</span>'
    : flat ? '<span class="cell-sub">flat</span>'
      : `<span class="delta ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${fmt(diff, 4)} ${esc(p.quoteSymbol)}`
        + (pct === null ? '' : `<div class="cell-sub delta ${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '+' : ''}${fmt(pct, 2)}%</div>`)
        + '</span>';

  // Values use the market price; the pool's own price can be somewhere else
  // entirely, and that gap is what an exit would actually run into.
  const drift = p.poolVsMarketPercent;
  const driftNote = drift !== null && drift !== undefined && Math.abs(drift) > 10
    ? `<div class="pair-meta" style="color:var(--warn)">pool price ${drift >= 0 ? '+' : ''}${fmt(drift, 0)}% vs market</div>`
    : '';

  const v3 = p.protocol === 'v3' || p.protocol === 'dlmm';   // rows without the v4-only actions
  const ptag = p.protocol === 'v3' ? 'v3' : p.protocol === 'dlmm' ? 'dlmm' : null;
  return `<tr>
    <td>
      <div class="pair-name">${esc(p.pair)} <span class="tag ${tag[0]}">${tag[1]}</span>${ptag ? ` <span class="tag closed" title="${ptag === 'v3' ? 'a Uniswap v3 position' : 'a Meteora DLMM position'}">${ptag}</span>` : ''}</div>
      <div class="pair-meta">fee ${esc(p.feePercent)}% ·
        <a href="${esc(p.txUrl)}" target="_blank">#${esc(p.tokenId)}</a> · ${esc(when)}</div>
      ${p.poolId ? `<div class="pair-meta act" data-pool="${esc(p.poolId)}"
        data-since="${esc(p.timestamp ?? '')}" data-from="${esc(p.blockNumber ?? '')}">activity …</div>` : ''}
      ${driftNote}
    </td>
    ${amountCell(p.deposited ? { ...p.deposited, valueQuote: p.deposited.costQuote } : null, p, entryPriceLine(p))}
    ${amountCell(p.holds, p)}
    ${amountCell(p.fees && !p.fees.error ? p.fees : null, p, feeRateLine(p))}
    <td>${vsHold}</td>
    <td class="rangecell">
      <div class="minibar">${at === null ? '' : `<i style="left:${at}%"></i>`}</div>
      <div class="cell-sub">${fmt(p.priceLower, 6)} … ${fmt(p.priceUpper, 6)}</div>
    </td>
    ${actions ? `<td><div class="acts-inline">
      <button data-act="collect" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}">fees</button>
      ${compound && !v3 ? `<button data-act="compound" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}" title="put the accrued fees back into this position">compound</button>
      <button data-act="increase" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}" title="add more capital to this position">increase</button>` : ''}
      ${p.protocol === 'dlmm' && !p.closed ? `<button data-act="compound" data-id="${esc(p.tokenId)}" data-proto="dlmm" title="claim the fees and add them back over the same bins">compound</button>` : ''}
      ${!p.closed ? `<button data-act="rebalance" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}" title="close this position and open the next one around the price now">rebalance</button>` : ''}
      ${realign && !v3 && !p.closed ? `<button data-act="realign" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}" title="one swap into this pool that moves its price to the market">match market</button>` : ''}
      <button data-act="close" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}" class="danger">close</button>
      <button data-act="card" data-id="${esc(p.tokenId)}" data-proto="${esc(p.protocol ?? 'v4')}">pnl</button>
    </div></td>` : ''}
  </tr>`;
}

/**
 * Fill in how much each pool has traded since the position opened.
 *
 * Asked after the table is on screen, one pool at a time: the answer is a log
 * or signature scan, and the positions themselves should not wait on it. A
 * pool that cannot be read says so in its own row and nothing else changes.
 */
async function loadActivity() {
  const cells = [...document.querySelectorAll('.act[data-pool]')];
  const ago = (t) => {
    const s = Math.max(0, Math.floor(Date.now() / 1000 - t));
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };
  for (const cell of cells) {
    try {
      const q = new URLSearchParams({ pool: cell.dataset.pool });
      if (cell.dataset.since) q.set('since', cell.dataset.since);
      if (cell.dataset.from) q.set('fromBlock', cell.dataset.from);
      const a = await api(`/api/pool-activity?${q}`);
      const n = `${a.count.toLocaleString('en-US')}${a.capped ? '+' : ''}`;
      cell.innerHTML = `<b>${esc(n)}</b> ${esc(a.unit)} since open`
        + (a.lastAt ? ` · last ${esc(ago(a.lastAt))}` : ' · none yet');
    } catch (e) {
      cell.textContent = `activity: ${e.message}`.slice(0, 90);
    }
  }
}

/* ------------------------------------------------------------------ *
 * PnL card
 * ------------------------------------------------------------------ */

const CARD_BG = '/img/pnl-bg.webp';
const CARD_MARK = '/img/logo.webp';
const cardImages = new Map();
function cardImage(src) {
  if (!cardImages.has(src)) {
    cardImages.set(src, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;   // same origin, so the canvas stays untainted
    }));
  }
  return cardImages.get(src);
}
const cardBackground = () => cardImage(CARD_BG);

/**
 * Text with a dark outline, so it survives whatever is underneath it: the
 * scene is dark and busy, so the glyphs are light and the outline is the
 * shadow that lifts them off it. Stroked first and filled second: the
 * outline sits behind the glyph instead of eating into it.
 */
const CARD_INK = '#f1e6c8';       // parchment, like the gold of the mark
const CARD_MUTE = '#c9bb98';
// Cinzel: carved Roman capitals, the closest thing on the web to a rune
// stone. The card is a picture people post, not a terminal, so it leaves
// the monospace of the desk behind. Canvas does not load a font by using
// it -- cardFont() does that before anything is drawn.
const CARD_FONT = '"Cinzel", "Iowan Old Style", Georgia, serif';
async function cardFont() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all(['400 20px "Cinzel"', '600 30px "Cinzel"', '800 84px "Cinzel"', '500 19px "JetBrains Mono"']
      .map((f) => document.fonts.load(f)));
  } catch { /* the fallback serif still draws */ }
}
const CARD_MONO = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
// Burgundy, for the address. Dark enough to read as wine rather than alarm,
// light enough to hold against the sky in the card's top right.
const CARD_WINE = '#a3243a';
function outlined(ctx, text, x, y, { size = 28, fill = CARD_INK, weight = '700', align = 'left', width = 0, stroke = 'rgba(0,0,0,0.85)', spacing = null, font = CARD_FONT } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  if (spacing && 'letterSpacing' in ctx) ctx.letterSpacing = spacing;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = width || Math.max(3, size * 0.16);
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/** How long the position has been open, as the clock the card leads with. */
function cardElapsed(timestamp) {
  if (!timestamp) return '--:--:--';
  const secs = Math.max(0, Math.floor(Date.now() / 1000 - timestamp));
  const pad = (n) => String(n).padStart(2, '0');
  const h = Math.floor(secs / 3600);
  const rest = `${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;
  // Past four days the hour count stops being a number anyone reads; the
  // days carry it from there.
  return h < 100 ? `${pad(h)}:${rest}` : `${Math.floor(h / 24)}d ${pad(h % 24)}:${rest.slice(0, 2)}`;
}

async function buildPnlCard(p) {
  const W = 1200;
  const H = 675;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  await cardFont();

  try {
    const bg = await cardBackground();
    ctx.drawImage(bg, 0, 0, W, H);
  } catch {
    ctx.fillStyle = '#07090b';
    ctx.fillRect(0, 0, W, H);
  }

  // The scene is lit from the right (the sunburst): the text sits on the
  // left, over the figure, so the scrim leans left and heavier at the foot.
  const scrim = ctx.createLinearGradient(0, 0, W, 0);
  scrim.addColorStop(0, 'rgba(3,5,7,0.78)');
  scrim.addColorStop(0.38, 'rgba(3,5,7,0.46)');
  scrim.addColorStop(0.7, 'rgba(3,5,7,0.18)');
  scrim.addColorStop(1, 'rgba(3,5,7,0.08)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, 0, W, H);
  const foot = ctx.createLinearGradient(0, H * 0.6, 0, H);
  foot.addColorStop(0, 'rgba(3,5,7,0)');
  foot.addColorStop(1, 'rgba(3,5,7,0.72)');
  ctx.fillStyle = foot;
  ctx.fillRect(0, 0, W, H);

  const up = (p.pnl?.abs ?? 0) >= 0;
  const green = '#8ff0b4';
  const red = '#ff6b6b';

  // The mark, top left, with the name beside it.
  try {
    const mark = await cardImage(CARD_MARK);
    ctx.save();
    ctx.beginPath(); ctx.arc(86, 60, 30, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
    ctx.drawImage(mark, 56, 30, 60, 60);
    ctx.restore();
    ctx.strokeStyle = 'rgba(224,194,122,0.5)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(86, 60, 30, 0, Math.PI * 2); ctx.stroke();
    outlined(ctx, 'TYR', 132, 69, { size: 26, fill: '#e0c27a', weight: '800', spacing: '5px' });
  } catch {
    outlined(ctx, 'TYR', 56, 69, { size: 26, fill: '#e0c27a', weight: '800', spacing: '5px' });
  }
  // The address closes the same line, at the far edge. Mono, because Cinzel
  // has no lowercase -- it would set the domain in small capitals.
  outlined(ctx, 'tyrliquidity.app', W - 56, 69, {
    size: 19, fill: CARD_WINE, weight: '600', align: 'right', spacing: '3px', font: CARD_MONO,
  });

  // --- left column: how long, what, how much --------------------------------
  const X = 56;
  outlined(ctx, 'TIME', X, 168, { size: 22, fill: CARD_MUTE, weight: '600', spacing: '3px' });
  outlined(ctx, cardElapsed(p.timestamp), X, 240, { size: 72, weight: '800', width: 9 });

  const venue = (p.protocol ?? 'v4').toUpperCase().replace('DAMM', 'DAMM V2');
  const state = p.closed ? 'CLOSED' : (p.inRange ? 'IN RANGE' : 'OUT OF RANGE');
  outlined(ctx, `${venue} · ${state}`, X, 282, { size: 22, fill: CARD_MUTE, weight: '600', spacing: '3px' });
  outlined(ctx, p.pair.replace('/', '-').toUpperCase(), X, 348, { size: 56, weight: '800', spacing: '2px' });

  outlined(ctx, `PROFIT (${p.quoteSymbol})`, X, 400, { size: 22, fill: CARD_MUTE, weight: '600', spacing: '3px' });
  if (p.pnl) {
    const sign = up ? '+' : '';
    outlined(ctx, `${sign}${fmt(p.pnl.abs, 4)}`, X, 482, { size: 84, fill: up ? green : red, weight: '800', width: 11 });
  } else {
    outlined(ctx, 'unavailable', X, 482, { size: 64, weight: '800' });
  }

  // --- the strip: the four numbers that explain the profit ------------------
  // Bin step is a DLMM idea; the v3/v4 pools answer with their tick spacing,
  // and a pool that has neither says what band it holds instead.
  const band = p.priceLower && p.priceUpper && p.spot
    ? `±${fmt(((p.priceUpper / p.spot - 1) * 100 + (1 - p.priceLower / p.spot) * 100) / 2, 0)}%`
    : '—';
  const [stepLabel, stepValue] = p.binStep
    ? ['BIN STEP', String(p.binStep)]
    : (p.tickSpacing ? ['SPACING', String(p.tickSpacing)] : ['RANGE', band]);
  const strip = [
    ['TVL', p.holds ? `${fmt(p.holds.valueQuote, 2)} ${p.quoteSymbol}` : '—'],
    [stepLabel, stepValue],
    ['BASE FEE', p.feePercent === null || p.feePercent === undefined ? '—' : `${fmt(p.feePercent, 2)}%`],
    ['PNL', p.pnl?.percent === null || p.pnl?.percent === undefined ? '—' : `${up ? '+' : ''}${fmt(p.pnl.percent, 2)}%`],
  ];
  strip.forEach(([label, value], i) => {
    const x = X + i * 272;
    outlined(ctx, label, x, 592, { size: 20, fill: CARD_MUTE, weight: '600', spacing: '2.5px' });
    outlined(ctx, value, x, 630, { size: 30, fill: i === 3 && p.pnl ? (up ? green : red) : CARD_INK, weight: '800' });
  });

  return canvas;
}

async function downloadPnlCard(tokenId, rows) {
  const p = rows.find((x) => x.tokenId === tokenId);
  if (!p) return;
  const canvas = await buildPnlCard(p);
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnl-${p.pair.replace('/', '-')}-${p.tokenId}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}

// Rooms on the number keys, in the order the bottom bar shows them (1..5).
document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || !/^[1-9]$/.test(e.key)) return;
  if (e.target.closest('input,select,textarea,[contenteditable]')) return;
  const rooms = [...document.querySelectorAll('.rail a')].filter((a) => !a.classList.contains('hidden'));
  const a = rooms[Number(e.key) - 1];
  if (a && !a.classList.contains('on')) location.href = a.href;
});

/**
 * The rooms open and shut.
 *
 * Shut, the rail is a column of icons and each room's name is its tooltip;
 * open, the names stand beside them. The state is the browser's, not the
 * page's, so it survives moving between rooms -- which is the only thing a
 * room switcher is for.
 */
const RAIL_KEY = 'vidar_rail';
(() => {
  const rail = document.querySelector('.rail');
  if (!rail) return;
  // The icons carry the whole label when the rail is shut, so each one says
  // what it is on hover. The name is the text beside the tag, not the tag.
  for (const a of rail.querySelectorAll('a')) {
    const name = a.querySelector('span')?.lastChild?.textContent?.trim();
    if (name) a.title = a.classList.contains('soon') ? `${name} — not open yet` : name;
  }
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'rail-toggle';
  const apply = (open) => {
    document.documentElement.classList.toggle('rail-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.title = open ? 'narrow the rooms to icons' : 'show the rooms by name';
    btn.setAttribute('aria-label', btn.title);
  };
  btn.onclick = () => {
    const open = !document.documentElement.classList.contains('rail-open');
    apply(open);
    try { localStorage.setItem(RAIL_KEY, open ? 'open' : 'shut'); } catch { /* private mode */ }
  };
  rail.prepend(btn);
  let stored = null;
  try { stored = localStorage.getItem(RAIL_KEY); } catch { /* private mode */ }
  apply(stored === 'open');
})();

// The bar's right end: the network and a clock, like a status line.
(() => {
  const rail = document.querySelector('.rail');
  if (!rail) return;
  const c = document.createElement('div');
  c.className = 'clock';
  rail.appendChild(c);
  const tick = () => {
    const net = document.getElementById('m-chainwrap')?.dataset.chain || '—';
    c.innerHTML = `<span>net <b>${esc(net)}</b></span><span>${new Date().toTimeString().slice(0, 8)}</span><span>${esc(location.port ? `port ${location.port}` : location.hostname)}</span>`;
  };
  tick(); setInterval(tick, 1000);
})();
