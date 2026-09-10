// Captures of the three micro-interactions (design/motion-spec.md): 390×844 @2x, light + dark.
// Animations are slowed 10x through CDP (Animation.setPlaybackRate) so a frame in the middle of each
// motion can be captured; the numbers of the spec come from tools/fps-probe.mjs and tools/vt-probe.mjs.
// usage: PLAYWRIGHT=<path to playwright/index.mjs> node motion-capture.mjs [base=http://127.0.0.1:8766] [outRoot]
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const base = process.argv[2] ?? 'http://127.0.0.1:8766';
const outRoot = process.argv[3] ?? new URL('./', import.meta.url).pathname;
const b = await chromium.launch();
const report = [];

async function shoot(p, module, name, scheme, extra = {}) {
  const dir = path.join(outRoot, module);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${name}${scheme === 'dark' ? '.dark' : ''}.png`);
  await p.screenshot({ path: file, fullPage: false });
  report.push({ module, name, scheme, file: path.relative(outRoot, file), ...extra });
}

for (const scheme of ['light', 'dark']) {
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    colorScheme: scheme,
    reducedMotion: 'no-preference',
  });
  const p = await ctx.newPage();
  const errors = [];
  const external = [];
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  p.on('request', (r) => !r.url().startsWith(base) && external.push(r.url()));
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.1 });

  // 1. Reveal de citation: the related measures rise into place when scrolled to (10x slower: 2,4 s).
  await p.goto(`${base}/concept/?slug=regle-verte`, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(300);
  await p.evaluate(() =>
    document
      .querySelector(
        'h2.h + .verbatim.compact[data-motion="reveal"], .verbatim.compact[data-motion="reveal"]',
      )
      .scrollIntoView({ block: 'center' }),
  );
  await p.waitForTimeout(900); // ~ 40 % of the slowed 2,4 s reveal
  const mid = await p.evaluate(() =>
    [...document.querySelectorAll('.verbatim.compact[data-motion="reveal"]')].map((e) => ({
      opacity: getComputedStyle(e).opacity,
      transform: getComputedStyle(e).transform,
    })),
  );
  await shoot(p, 'concept', 'motion-reveal-mid', scheme, { state: mid });
  await p.waitForTimeout(2200);
  await shoot(p, 'concept', 'motion-reveal-done', scheme);

  // 2. Concept -> section: in the prototype the content fades in on arrival (10x slower: 2 s).
  await p.evaluate(() =>
    document.querySelector('.btn[data-motion="crossfade"]').scrollIntoView({ block: 'center' }),
  );
  await p.waitForTimeout(100);
  await Promise.all([
    p.waitForURL(/\/section\//),
    p.locator('.btn[data-motion="crossfade"]').tap(),
  ]);
  await p.waitForFunction(() =>
    document.querySelector('[data-motion="content"]')?.hasAttribute('data-ready'),
  );
  await p.waitForTimeout(700); // ~ 35 % of the slowed 2 s fade-in
  const arrive = await p.evaluate(() => ({
    html: document.documentElement.className,
    opacity: getComputedStyle(document.querySelector('[data-motion="content"]')).opacity,
  }));
  await shoot(p, 'section', 'motion-arrive-mid', scheme, { state: arrive });
  await p.waitForTimeout(2000);
  await shoot(p, 'section', 'motion-arrive-done', scheme);

  // 3. « Passer »: the pressed state on /defi/ and /q/ (held under the finger, 10x slower: 1,2 s to scale).
  for (const [module, url, sel] of [
    ['defi', '/defi/', '.pass-row [data-motion="press"]'],
    ['q', '/q/?id=c12-s01', '.q-controls [data-motion="press"]'],
  ]) {
    await p.goto(`${base}${url}`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    const box = await p.locator(sel).first().boundingBox();
    await p.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    const box2 = await p.locator(sel).first().boundingBox();
    await p.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await p.mouse.down();
    await p.waitForTimeout(1300); // the slowed 120 ms press has reached scale(0.96)
    const pressed = await p.evaluate((s) => {
      const e = document.querySelector(s);
      return {
        cls: e.className,
        transform: getComputedStyle(e).transform,
        text: e.textContent.trim(),
      };
    }, sel);
    await shoot(p, module, 'motion-press-held', scheme, { state: pressed, target: box });
    await p.mouse.up();
    await p.waitForTimeout(1600);
  }
  report.push({ scheme, errors, external });
  await ctx.close();
}
await b.close();
fs.writeFileSync(path.join(outRoot, 'motion-report.json'), JSON.stringify(report, null, 2));
// SHA-256 of the motion captures, appended to the folder's sums (capture.mjs rewrites the whole file when re-run).
const sums = [];
for (const r of report)
  if (r.file)
    sums.push(
      `${crypto
        .createHash('sha256')
        .update(fs.readFileSync(path.join(outRoot, r.file)))
        .digest('hex')}  ${r.file}`,
    );
fs.appendFileSync(path.join(outRoot, 'SHA256SUMS.txt'), sums.join('\n') + '\n');
console.log(JSON.stringify(report, null, 1));
