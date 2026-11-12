/**
 * Draws the one link-preview image of the app: public/og/cestecritla-v1.png (1200 × 630).
 *
 *   npx tsx scripts/og-image.ts
 *
 * One image for every page, on purpose (D15.7): a preview travels alone, stripped of its page —
 * so it carries the name, "Site non officiel", and not a word of the programme. No logo of LFI
 * or of the campaign, no mascot: colours and typefaces of design/tokens.json, and nothing else
 * (design/identity-decision.md §5.2).
 *
 * Rendered by Chromium from the project's own fonts, so the committed file is reproducible.
 * A local tool, run when the identity changes; the build only copies the result.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright';

const OUT = 'public/og/cestecritla-v1.png';
const font = readFileSync('public/fonts/PublicSans-Variable-latin.woff2').toString('base64');

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><style>
@font-face { font-family: 'Public Sans'; src: url(data:font/woff2;base64,${font}) format('woff2-variations'); font-weight: 100 900; }
html, body { margin: 0; }
body { width: 1200px; height: 630px; background: #FFFCF4; color: #212320; font-family: 'Public Sans', sans-serif;
  display: flex; flex-direction: column; justify-content: center; box-sizing: border-box; padding: 0 96px;
  border-left: 32px solid #4C0297; }
.label { font-size: 30px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #4C0297; }
.name { font-size: 132px; line-height: 1.08; font-weight: 900; text-transform: uppercase; color: #4C0297; margin: 20px 0 30px; }
.name span { color: #D1271C; }
.line { font-size: 38px; line-height: 1.3; max-width: 900px; }
</style></head><body>
<div class="label">Site non officiel</div>
<div class="name">C’est écrit <span>là</span></div>
<div class="line">Retrouver une mesure de L’Avenir en commun, et la lire à sa source.</div>
</body></html>`;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate('document.fonts.ready');
  mkdirSync('public/og', { recursive: true });
  writeFileSync(OUT, await page.screenshot({ type: 'png' }));
  console.log(`written: ${OUT}`);
} finally {
  await browser.close();
}
