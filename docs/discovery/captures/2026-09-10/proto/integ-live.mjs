// Live audit + captures of proto.cestecritla.fr: console, failed/external requests, fonts, dark mode, sizes.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const base = process.argv[2] ?? 'https://proto.cestecritla.fr';
const outRoot = process.argv[3] ?? '<repo>/docs/discovery/captures/2026-09-10/proto';
const shots = [
  { module: 'root', name: 'live-index', path: '/' },
  { module: 'home', name: 'live-home', path: '/home/' },
  { module: 'link', name: 'live-link-c12-s01-k01', path: '/link/?id=c12-s01-k01' },
  { module: 'section', name: 'live-section-c12-s01', path: '/section/?id=c12-s01' },
  { module: 'concept', name: 'live-concept', path: '/concept/' },
  { module: 'defi', name: 'live-defi-254', path: '/defi/?n=254' },
  { module: 'defi', name: 'live-defi-n1-fallback', path: '/defi/?n=1' },
  { module: 'q', name: 'live-q-c12-s01', path: '/q/?s=c12-s01' },
  { module: 'q', name: 'live-q-card-c12-s01', path: '/q/card?s=c12-s01', viewport: { width: 1200, height: 630 }, scale: 1 },
  { module: 'riposte', name: 'live-riposte-grille', path: '/riposte/' },
  { module: 'riposte', name: 'live-riposte-rip-01', path: '/riposte/?id=rip-01' },
  { module: 'riposte', name: 'live-riposte-flash', path: '/riposte/?flash=1' },
  { module: 'root', name: 'live-404', path: '/nope', expect: 404 },
];
const b = await chromium.launch();
const report = { base, date: new Date().toISOString(), pages: {} };
const files = [];
for (const shot of shots) {
  for (const scheme of ['light', 'dark']) {
    const ctx = await b.newContext({ viewport: shot.viewport ?? { width: 390, height: 844 }, deviceScaleFactor: shot.scale ?? 2, colorScheme: scheme });
    const p = await ctx.newPage();
    const errors = [], warnings = [], failed = [], external = [], responses = [];
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); else if (m.type() === 'warning') warnings.push(m.text()); });
    p.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
    p.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText ?? ''}`));
    p.on('request', (r) => { if (!r.url().startsWith(base)) external.push(r.url()); });
    p.on('response', async (r) => { try { const h = r.headers(); responses.push({ url: r.url().replace(base, ''), status: r.status(), type: h['content-type'], enc: h['content-encoding'], cache: h['cf-cache-status'] }); } catch {} });
    const resp = await p.goto(base + shot.path, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(600);
    const info = await p.evaluate(() => ({
      title: document.title,
      scrollWidth: document.documentElement.scrollWidth,
      fonts: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight} ${f.style}`),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      bodyColor: getComputedStyle(document.body).color,
      shadows: [...document.querySelectorAll('*')].filter((e) => getComputedStyle(e).boxShadow !== 'none').length,
      text: document.body.innerText.replace(/\s+/g, ' ').slice(0, 120),
    }));
    const dir = path.join(outRoot, shot.module);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `${shot.name}${scheme === 'dark' ? '.dark' : ''}.png`);
    await p.screenshot({ path: file, fullPage: false });
    files.push(file);
    // the expected 404 status of /nope shows up as a console "Failed to load resource" line: keep it apart
    const realErrors = shot.expect === 404 ? errors.filter((e) => !/status of 404/.test(e)) : errors;
    report.pages[`${shot.path} [${scheme}]`] = { status: resp?.status(), errors: realErrors, warnings, failed, external, ...info, responses: scheme === 'light' ? responses : undefined };
    const flag = realErrors.length || failed.length || external.length ? 'XX' : 'ok';
    console.log(`${flag} ${shot.path} [${scheme}] ${resp?.status()} sw=${info.scrollWidth} bg=${info.bodyBg} fonts=${info.fonts.length} shadows=${info.shadows} | ${info.title}`);
    if (flag === 'XX') console.log('   ', JSON.stringify({ errors: realErrors, failed, external }));
    if (warnings.length) console.log('    warn:', JSON.stringify(warnings));
    await ctx.close();
  }
}
await b.close();
fs.writeFileSync(path.join(outRoot, 'live-report.json'), JSON.stringify(report, null, 1));
const sums = files.map((f) => `${crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')}  ${path.relative(outRoot, f)}`).join('\n') + '\n';
fs.writeFileSync(path.join(outRoot, 'SHA256SUMS-live.txt'), sums);
console.log('files', files.length);
