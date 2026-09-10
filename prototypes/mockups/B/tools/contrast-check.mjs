// Computes the WCAG ratio of every visible text node against its effective background (light and dark).
import { chromium } from 'playwright';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = ['home-link','home-direct','concept','section','chat','story','mascotte'];
const b = await chromium.launch();
const bad = []; let total = 0; const pairs = new Map();
for (const scheme of ['light','dark']) {
  for (const f of files) {
    if (f === 'story' && scheme === 'dark') continue;
    const ctx = await b.newContext({ viewport: { width: f === 'mascotte' ? 1180 : 390, height: 844 }, colorScheme: scheme });
    const p = await ctx.newPage();
    await p.goto(`file://${SRC}/${f}.html`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const res = await p.evaluate(() => {
      const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return m.length === 4 && m[3] === 0 ? null : m.slice(0,3); };
      const lum = (rgb) => { const c = rgb.map(v => v/255).map(v => v <= 0.03928 ? v/12.92 : ((v+0.055)/1.055)**2.4); return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]; };
      const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05); };
      const bgOf = (el) => { while (el) { const bg = parse(getComputedStyle(el).backgroundColor); if (bg) return bg; el = el.parentElement; } return [255,255,255]; };
      const out = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) {
        if (!n.textContent.trim()) continue;
        const el = n.parentElement;
        if (!el || ['SCRIPT','STYLE','SYMBOL','SVG','TITLE'].includes(el.tagName)) continue;
        const cs = getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden) continue;
        const r = el.getBoundingClientRect(); if (r.width === 0 || r.height === 0) continue;
        const fg = parse(cs.color); const bg = bgOf(el);
        const size = parseFloat(cs.fontSize); const weight = parseInt(cs.fontWeight);
        const large = size >= 24 || (size >= 18.66 && weight >= 700);
        out.push({ text: n.textContent.trim().slice(0, 40), fg: cs.color, bg: `rgb(${bg.join(', ')})`, ratio: +ratio(fg, bg).toFixed(2), size, large });
      }
      return out;
    });
    for (const r of res) { total++; const k = `${scheme} ${r.fg} on ${r.bg}`; pairs.set(k, r.ratio); if (r.ratio < 4.5) bad.push({ f, scheme, ...r }); }
    await ctx.close();
  }
}
await b.close();
console.log('text nodes checked:', total);
console.log('distinct pairs:'); for (const [k, v] of [...pairs].sort((a,b)=>b[1]-a[1])) console.log('  ', k, v);
console.log('below 4.5:', bad.length); for (const x of bad) console.log('  ', JSON.stringify(x));
