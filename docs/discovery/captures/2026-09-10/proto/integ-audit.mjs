// Integration audit of the proto: console errors/warnings, failed + external requests, fonts, dark mode.
import { chromium } from 'playwright';
const base = process.argv[2] ?? 'http://127.0.0.1:8790';
const pages = [
  '/', '/home/', '/home/#q=loyer', '/home/?silence=1',
  '/link/?id=c12-s01-k01', '/link/?id=c9-s01-m04', '/link/?id=c12-s01', '/link/?id=nope',
  '/section/?id=c12-s01', '/section/?id=c14-s02#c14-s02-m09', '/section/?id=nope',
  '/concept/', '/concept/?slug=regle-verte', '/concept/?slug=planification-ecologique', '/concept/?slug=nope',
  '/defi/', '/defi/?n=1', '/defi/?n=254', '/defi/?n=254#r=ddsdp',
  '/q/', '/q/?s=c12-s01', '/q/?s=c12-s01&from=link', '/q/card.html?s=c12-s01', '/q/?s=nope',
  '/riposte/', '/riposte/?id=rip-01', '/riposte/?id=rip-14#texte', '/riposte/?flash=1', '/riposte/?id=nope',
  '/nope',
];
const b = await chromium.launch();
const out = {};
for (const path of pages) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: scheme });
    const p = await ctx.newPage();
    const errors = [], warnings = [], failed = [], external = [], statuses = [];
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
    p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    p.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
    p.on('request', (r) => { if (!r.url().startsWith(base)) external.push(r.url()); });
    p.on('response', (r) => { if (r.status() >= 400) statuses.push(`${r.status()} ${r.url()}`); });
    const resp = await p.goto(base + path, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    const info = await p.evaluate(() => {
      const cs = getComputedStyle(document.body);
      return {
        title: document.title,
        scrollWidth: document.documentElement.scrollWidth,
        fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
        bodyBg: cs.backgroundColor, bodyColor: cs.color,
        shadows: [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).boxShadow !== 'none').length,
        text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 160),
      };
    });
    const key = `${path} [${scheme}]`;
    out[key] = { status: resp?.status(), errors, warnings, failed, statuses, external, ...info };
    const flag = errors.length || failed.length || external.length || statuses.length ? 'XX' : 'ok';
    console.log(`${flag} ${key} ${resp?.status()} sw=${info.scrollWidth} bg=${info.bodyBg} fonts=${info.fonts.length} shadows=${info.shadows} | ${info.title}`);
    if (flag === 'XX') console.log('   ', JSON.stringify({ errors, warnings, failed, statuses, external }));
    if (warnings.length) console.log('    warn:', JSON.stringify(warnings));
    await ctx.close();
  }
}
await b.close();
import fs from 'node:fs';
fs.writeFileSync(process.argv[3] ?? '/dev/null', JSON.stringify(out, null, 1));
