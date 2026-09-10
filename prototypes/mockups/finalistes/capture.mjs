// Run from a folder where `playwright` is installed (during the session: the pw/ scratchpad):
//   node <repo>/prototypes/mockups/finalistes/capture.mjs
// Capture the finalist artboards (light + dark), the share cards at natural size, and audit
// fonts, horizontal overflow and text contrast (WCAG 2.2 AA, 4.5:1 body / 3:1 ≥ 24 px or ≥ 19 px bold).
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const src = '<repo>/prototypes/mockups/finalistes';
const out = '<repo>/docs/discovery/captures/2026-09-09/maquettes/finalistes';
fs.mkdirSync(out, { recursive: true });
const screens = fs.readdirSync(src).filter((f) => /^f[12]-\d\d-.*\.html$/.test(f)).sort();

const auditFn = () => {
  const parse = (s) => {
    const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  };
  const lum = ({ r, g, b }) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05); };
  const hex = ({ r, g, b }) => '#' + [r, g, b].map((n) => Math.round(n).toString(16).padStart(2, '0')).join('').toUpperCase();
  const bgOf = (el) => {
    let e = el;
    while (e) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c && c.a > 0) return c;
      e = e.parentElement;
    }
    return parse(getComputedStyle(document.body).backgroundColor) || { r: 255, g: 255, b: 255, a: 1 };
  };
  const rows = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  let n;
  while ((n = walker.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (!el || seen.has(el)) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    const fg = parse(cs.color);
    const bg = bgOf(el);
    if (!fg) continue;
    const size = parseFloat(cs.fontSize);
    const weight = parseInt(cs.fontWeight, 10);
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const r = ratio(fg, bg);
    const need = large ? 3 : 4.5;
    rows.push({ text: n.textContent.trim().slice(0, 40), tag: el.tagName.toLowerCase(), cls: el.className && typeof el.className === 'string' ? el.className.split(' ')[0] : '', fg: hex(fg), bg: hex(bg), size, weight, ratio: Math.round(r * 100) / 100, need, ok: r >= need, font: cs.fontFamily.split(',')[0].replace(/"/g, '') });
  }
  return {
    fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
    shadows3d: [...document.querySelectorAll('.screen .display')].length,
    failing: rows.filter((r) => !r.ok),
    pairs: [...new Set(rows.map((r) => `${r.fg} on ${r.bg} = ${r.ratio}`))],
    count: rows.length,
  };
};

const browser = await chromium.launch();
const report = {};
for (const scheme of ['light', 'dark']) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
  const page = await ctx.newPage();
  const fontReqs = [];
  page.on('request', (r) => { if (!r.url().startsWith('file://')) fontReqs.push(r.url()); });
  for (const f of screens) {
    const name = f.replace(/\.html$/, '');
    await page.goto('file://' + path.join(src, f), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    const info = await page.evaluate(auditFn);
    const png = path.join(out, `${name}${scheme === 'dark' ? '.dark' : ''}.png`);
    await page.screenshot({ path: png, fullPage: true });
    report[`${name}.${scheme}`] = { png, ...info, externalRequests: fontReqs.splice(0) };
    console.log(scheme, name, `h=${info.scrollHeight}`, `w=${info.scrollWidth}`, `fonts=${info.fonts.length}`, `fail=${info.failing.length}`, `display=${info.shadows3d}`);
  }
  await ctx.close();
}
// Share cards at natural size (light palette only: an image is not themed)
{
  const ctx = await browser.newContext({ viewport: { width: 1300, height: 2000 }, deviceScaleFactor: 1, colorScheme: 'light' });
  const page = await ctx.newPage();
  for (const f of ['f1-05-carte.html', 'f2-05-carte.html']) {
    await page.goto('file://' + path.join(src, f), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.body.classList.add('cards-natural'));
    await page.waitForTimeout(150);
    const cards = page.locator('.og');
    const n = await cards.count();
    for (let i = 0; i < n; i++) {
      const el = cards.nth(i);
      const cls = await el.getAttribute('class');
      const kind = /story/.test(cls) ? 'story' : 'og';
      const box = await el.boundingBox();
      const png = path.join(out, `${f.replace(/\.html$/, '')}.${kind}.png`);
      await el.screenshot({ path: png });
      console.log('card', png, box.width, box.height);
      report[`${f}.${kind}`] = { png, width: box.width, height: box.height };
    }
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
console.log('report', path.join(out, 'report.json'));
