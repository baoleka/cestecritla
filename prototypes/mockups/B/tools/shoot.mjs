// Screenshots for prototypes/mockups/B — 390×844 @2x (story 360×640 @3x, mascot board 1180 @2x).
// Usage: node prototypes/mockups/B/tools/shoot.mjs [screen]  (needs the `playwright` package + Chromium).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..');
const OUT = resolve(HERE, '../../../../docs/discovery/captures/2026-09-09/maquettes/B');
mkdirSync(OUT, { recursive: true });

const only = process.argv[2]; // optional screen name filter

const shots = [
  { name: 'home-link', vp: { width: 390, height: 844 }, dsf: 2 },
  { name: 'home-direct', vp: { width: 390, height: 844 }, dsf: 2 },
  { name: 'concept', vp: { width: 390, height: 844 }, dsf: 2 },
  { name: 'section', vp: { width: 390, height: 844 }, dsf: 2 },
  { name: 'chat', vp: { width: 390, height: 844 }, dsf: 2 },
  { name: 'story', vp: { width: 360, height: 640 }, dsf: 3, clip: true },
  { name: 'mascotte', vp: { width: 1180, height: 900 }, dsf: 2 },
  { name: 'mascotte', suffix: '-390', vp: { width: 390, height: 844 }, dsf: 2 },
];

const browser = await chromium.launch();
const report = [];
for (const s of shots) {
  if (only && s.name !== only) continue;
  for (const scheme of ['light', 'dark']) {
    if (s.name === 'story' && scheme === 'dark') continue; // story is a fixed-colour image
    const ctx = await browser.newContext({ viewport: s.vp, deviceScaleFactor: s.dsf, colorScheme: scheme });
    const page = await ctx.newPage();
    await page.goto(`file://${SRC}/${s.name}.html`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    // Full-page capture: sticky bars would otherwise be painted at the first viewport's bottom edge.
    await page.addStyleTag({ content: '.tabbar, .composer { position: static !important; }' });
    await page.waitForTimeout(300);
    const fonts = await page.evaluate(() =>
      [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
    );
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
    const file = `${OUT}/${s.name}${s.suffix ?? ''}${scheme === 'dark' ? '.dark' : ''}.png`;
    if (s.clip) {
      await page.screenshot({ path: file, clip: { x: 0, y: 0, width: s.vp.width, height: s.vp.height } });
    } else {
      await page.screenshot({ path: file, fullPage: true });
    }
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    report.push({ file, scheme, fonts: fonts.length, overflowX: overflow, height: h });
    await ctx.close();
  }
}
await browser.close();
for (const r of report) console.log(`${r.file}  fonts=${r.fonts}  overflowX=${r.overflowX}  h=${r.height}`);
