/* The how-to page. It reads the desk's config for the header and draws the
   one diagram that is easier to generate than to hand-letter. */

let CFG = null;

function boot() {
  $('m-wallet').textContent = CFG.wallet ?? $('m-wallet').textContent;
  drawShapes();
}

/**
 * Three bin ladders, side by side: how each shape spreads the same deposit.
 * Drawn rather than drafted, because the curves are the point and a hand-set
 * one would be a drawing of a shape instead of the shape.
 */
function drawShapes() {
  const g = document.querySelector('.g-bars');
  if (!g) return;
  const BINS = 17;
  const W = 760; const H = 130;
  const panel = W / 3;
  const shapes = {
    spot: () => 1,
    curve: (t) => Math.exp(-((t - 0.5) ** 2) / 0.035),
    'bid-ask': (t) => 0.12 + ((2 * Math.abs(t - 0.5)) ** 1.6),
  };
  let out = '';
  Object.entries(shapes).forEach(([name, f], panelIndex) => {
    const x0 = panelIndex * panel + 26;
    const width = panel - 52;
    const step = width / BINS;
    const vals = Array.from({ length: BINS }, (_, i) => f(BINS === 1 ? 0.5 : i / (BINS - 1)));
    const max = Math.max(...vals);
    vals.forEach((v, i) => {
      const h = Math.max(3, (v / max) * 72);
      out += `<rect x="${(x0 + i * step).toFixed(1)}" y="${(96 - h).toFixed(1)}" `
        + `width="${Math.max(2, step - 3).toFixed(1)}" height="${h.toFixed(1)}"/>`;
    });
    out += `<text x="${(x0 + width / 2).toFixed(1)}" y="118">${name}</text>`;
  });
  g.innerHTML = out;
}
