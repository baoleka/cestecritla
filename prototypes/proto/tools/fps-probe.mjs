// fps-probe.mjs — frame sampler at CPU ×4 (design/perf-budget.md §5.2, P6), version of the motion spec.
// usage: node fps-probe.mjs <url> [cpuRate=4] [durationMs=2000] [selectorToClick] [scrollToSelector]
//   - no selector: the entry animation of the page is measured. The sampler is armed before the page
//     runs and starts at the first reveal (a [data-motion="reveal"] element receiving .m-in), or at
//     `load` when the page has none, so the frames of the animation itself are sampled, not the idle
//     frames after networkidle;
//   - selectorToClick: pressed (pointer down, 90 ms, pointer up) once sampling has started («Passer»);
//   - scrollToSelector: scrolled into view once sampling has started (reveal on scroll).
// Output, one JSON line: { frames, fpsAvg, p50, p95, max, pctOver20, pctOver50, startedBy }.
// Threshold P6: 0 frame > 50 ms, <= 5 % of frames > 20 ms. Headless Chromium has no GPU: a pass here
// is necessary, not sufficient (confirm on the Android of design/perf-budget.md §5.4).
// Playwright is resolved from PLAYWRIGHT (path to node_modules/playwright/index.mjs) or the usual lookup.
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const [, , url, rateArg = '4', durArg = '2000', selector, scrollTo] = process.argv;
if (!url) {
  console.error(
    'usage: node fps-probe.mjs <url> [cpuRate=4] [durationMs=2000] [selectorToClick] [scrollToSelector]',
  );
  process.exit(2);
}
const duration = Number(durArg);
const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rateArg) });

const sampleInPage = (duration) =>
  new Promise((resolve) => {
    const deltas = [];
    let last = performance.now();
    const start = last;
    const tick = (now) => {
      deltas.push(now - last);
      last = now;
      if (now - start < duration) requestAnimationFrame(tick);
      else resolve(deltas);
    };
    requestAnimationFrame(tick);
  });

const entryMode = !selector && !scrollTo;
if (entryMode) {
  // Armed before any page script: starts at the first reveal, else at load.
  await page.addInitScript(
    ({ duration, sampler }) => {
      const sample = new Function('return ' + sampler)();
      let started = false;
      let startedAt = 0;
      window.__revealAt = null;
      const start = (by) => {
        if (started) return;
        started = true;
        startedAt = performance.now();
        window.__fps = sample(duration).then((deltas) => ({
          deltas,
          startedBy: by,
          revealAt: window.__revealAt,
        }));
      };
      const mo = new MutationObserver((records) => {
        for (const r of records)
          if (r.target.matches?.('[data-motion="reveal"]') && r.target.classList.contains('m-in')) {
            window.__revealAt ??= started ? +(performance.now() - startedAt).toFixed(0) : 0;
            start('reveal');
          }
      });
      document.addEventListener('DOMContentLoaded', () =>
        mo.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true }),
      );
      addEventListener('load', () => setTimeout(() => start('load'), 0));
    },
    { duration, sampler: sampleInPage.toString() },
  );
}

await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
let result;
if (entryMode) {
  result = await page.evaluate(() => window.__fps);
} else {
  const sampler = page.evaluate(sampleInPage, duration);
  await page.waitForTimeout(50);
  if (scrollTo)
    await page
      .evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'center' }), scrollTo)
      .catch(() => {});
  if (selector) {
    const box = await page
      .locator(selector)
      .first()
      .boundingBox()
      .catch(() => null);
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(90);
      await page.mouse.up();
    }
  }
  result = { deltas: await sampler, startedBy: selector ? 'click' : 'scroll' };
}
const { deltas, startedBy, revealAt = null } = result;
const stats = (d) => {
  const sorted = [...d].sort((a, b) => a - b);
  const pct = (t) => +((100 * d.filter((x) => x > t).length) / Math.max(1, d.length)).toFixed(1);
  const total = d.reduce((a, b) => a + b, 0);
  return {
    frames: d.length,
    fpsAvg: +((1000 * d.length) / Math.max(1, total)).toFixed(1),
    p50: +(sorted[Math.floor(0.5 * sorted.length)] ?? 0).toFixed(1),
    p95: +(sorted[Math.floor(0.95 * sorted.length)] ?? 0).toFixed(1),
    max: +(sorted.at(-1) ?? 0).toFixed(1),
    pctOver20: pct(20),
    pctOver50: pct(50),
  };
};
const out = { url, cpuRate: Number(rateArg), startedBy, ...stats(deltas) };
if (revealAt != null && revealAt > 0) {
  // Frames from the moment the reveal started (the frames before it belong to the page render).
  let t = 0;
  const fromReveal = deltas.filter((d) => (t += d) > revealAt);
  out.revealAt = revealAt;
  out.fromReveal = stats(fromReveal);
}
console.log(JSON.stringify(out));
await browser.close();
