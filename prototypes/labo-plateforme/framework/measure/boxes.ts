/**
 * Layout identity check: bounding boxes and computed typography of the same elements on every
 * deployed variant (mobile viewport, fonts loaded). Differences here mean the two pages are not
 * the same page. Output: measure/out/boxes.json
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { CHROME_PATH, outDir, VARIANTS } from './common.ts';

const SELECTORS = [
  'header',
  'header a',
  'section',
  'section label',
  '#q',
  'section p',
  'section div',
  'article',
  'article p',
  'h1',
  'h2',
  'ol.measures, article ol',
  'article ol li',
  'aside',
  'footer',
];

type Box = [
  top: number,
  height: number,
  fontSize: string,
  lineHeight: string,
  marginTop: string,
  paddingTop: string,
  family: string,
];

const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
const out: Record<string, Record<string, Box>> = {};
for (const v of VARIANTS) {
  const page = await browser.newPage({
    viewport: { width: 412, height: 823 },
    deviceScaleFactor: 1.75,
    isMobile: true,
  });
  await page.goto(v.url, { waitUntil: 'networkidle' });
  await page.waitForSelector('#q');
  out[v.name] = await page.evaluate((selectors: string[]): Record<string, Box> => {
    const boxes: Record<string, Box> = {};
    for (const s of selectors) {
      const el = document.querySelector(s);
      if (el === null) continue;
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      boxes[s] = [
        Math.round(r.top * 100) / 100,
        Math.round(r.height * 100) / 100,
        cs.fontSize,
        cs.lineHeight,
        cs.marginTop,
        cs.paddingTop,
        cs.fontFamily.slice(0, 24),
      ];
    }
    return boxes;
  }, SELECTORS);
  await page.close();
}
await browser.close();
writeFileSync(resolve(outDir, 'boxes.json'), JSON.stringify(out, null, 2));
const names = Object.keys(out);
const reference = out[names[0] ?? ''] ?? {};
let differences = 0;
for (const [sel, box] of Object.entries(reference)) {
  const row = names.map((n) => JSON.stringify(out[n]?.[sel]));
  const same = row.every((r) => r === row[0]);
  if (!same) differences += 1;
  console.log(`${same ? '=' : '≠'} ${sel.padEnd(24)} ${row.join('  |  ')}`);
}
console.log(`${String(differences)} selector(s) differ across ${names.join(', ')}`);
