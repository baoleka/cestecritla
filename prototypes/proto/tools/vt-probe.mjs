// vt-probe.mjs — does the concept -> section transition ever block input? (design/motion-spec.md §3.2)
// usage: node vt-probe.mjs [base=http://127.0.0.1:8765] [cpuRate=4]
// Three runs, each navigating /concept/?slug=regle-verte -> /section/ through the « Lire la section »
// button tagged data-motion="crossfade", on a 390×844 @2x touch viewport at CPU ×<rate>:
//   1. proto      the prototype as served: the section renders its content by script, so motion.js skips
//                 the cross-document transition and fades the content in (200 ms, opacity);
//   2. prerender  the section HTML is served with data-ready on its content container (what T7's
//                 pre-rendering gives): the cross-document View Transition plays, 200 ms cross-fade;
//   3. slow       same as 2 with every animation 5x slower (CDP Animation.setPlaybackRate), so the
//                 cross-fade lasts 1 000 ms and a trusted tap is delivered in the middle of it.
// Measured on the destination page from `pagereveal`: whether a transition existed and was skipped,
// its `finished` time, the hit-tested element at the title's centre every 30 ms (elementFromPoint
// returns <html> when the ::view-transition overlay swallows the point), the target of a real tap sent
// by Playwright during the animation, and the rAF frame deltas (P6) over the first 600 ms.
const { chromium } = await import(process.env.PLAYWRIGHT ?? 'playwright');
const [, , base = 'http://127.0.0.1:8765', rateArg = '4'] = process.argv;

const initScript = () => {
  window.__vt = { reveal: null, hits: [], clicks: [], deltas: [] };
  addEventListener('pagereveal', (e) => {
    const t0 = performance.now();
    const container = document.querySelector('[data-motion="content"]');
    window.__vt.reveal = {
      t: t0,
      hasTransition: !!e.viewTransition,
      contentPending: !!(container && !container.hasAttribute('data-ready')),
    };
    if (e.viewTransition) {
      e.viewTransition.ready
        .then(() => (window.__vt.ready = performance.now() - t0))
        .catch((err) => (window.__vt.readyErr = err.name));
      e.viewTransition.finished
        .then(() => (window.__vt.finished = performance.now() - t0))
        .catch((err) => (window.__vt.finishedErr = err.name));
    }
    // Hit testing at the centre of the viewport every 30 ms for 600 ms.
    const x = innerWidth / 2;
    const y = 130; // just under the header: inside <main> in the shell, on the part line once rendered
    const probe = () => {
      const el = document.elementFromPoint(x, y);
      const pe = getComputedStyle(document.documentElement, '::view-transition').pointerEvents;
      window.__vt.hits.push([
        Math.round(performance.now() - t0),
        el ? el.tagName + (el.id ? '#' + el.id : '') : null,
        pe,
      ]);
      if (performance.now() - t0 < 600) setTimeout(probe, 30);
    };
    probe();
    // Frame deltas from the reveal.
    let last = performance.now();
    const tick = (now) => {
      window.__vt.deltas.push([Math.round(now - t0), +(now - last).toFixed(1)]);
      last = now;
      if (now - t0 < 600) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // Content readiness (prototype fade-in).
    if (container)
      new MutationObserver(() => (window.__vt.contentReadyAt ??= performance.now() - t0)).observe(
        container,
        { attributes: true, attributeFilter: ['data-ready'] },
      );
  });
  document.addEventListener(
    'click',
    (e) =>
      window.__vt.clicks.push([
        Math.round(performance.now() - (window.__vt.reveal?.t ?? 0)),
        e.target.tagName +
          (e.target.className ? '.' + String(e.target.className).split(' ')[0] : ''),
        e.isTrusted,
      ]),
    true,
  );
};

async function run(mode) {
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rateArg) });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.addInitScript(initScript);
  if (mode !== 'proto') {
    // What T7's pre-rendering gives: the content container is ready when the HTML is parsed.
    await page.addInitScript(() => {
      if (!location.pathname.includes('/section/')) return;
      const mo = new MutationObserver(() => {
        const c = document.querySelector('[data-motion="content"]');
        if (c) {
          c.setAttribute('data-ready', '');
          mo.disconnect();
        }
      });
      mo.observe(document, { childList: true, subtree: true });
    });
  }
  if (mode === 'slow') {
    // Every animation of the page 5x slower (CDP), so the 200 ms cross-fade lasts 1 000 ms.
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 0.2 });
  }
  await page.goto(`${base}/concept/?slug=regle-verte`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    document.querySelector('.btn[data-motion="crossfade"]').scrollIntoView({ block: 'center' }),
  );
  await page.waitForTimeout(100);
  const link = page.locator('.btn[data-motion="crossfade"]');
  await Promise.all([page.waitForURL(/\/section\//), link.tap()]);
  // A real tap as early as the driver allows, at the centre of the viewport (the section title area).
  await page.touchscreen.tap(195, 130);
  const tapAt = await page.evaluate(() =>
    Math.round(performance.now() - (window.__vt.reveal?.t ?? 0)),
  );
  await page.waitForTimeout(1300);
  const out = await page.evaluate(() => {
    const stats = (pairs) => {
      const d = pairs.map((p) => p[1]);
      const sorted = [...d].sort((a, b) => a - b);
      const pct = (t) =>
        +((100 * d.filter((x) => x > t).length) / Math.max(1, d.length)).toFixed(1);
      return {
        n: d.length,
        p95: +(sorted[Math.floor(0.95 * sorted.length)] ?? 0).toFixed(1),
        max: +(sorted.at(-1) ?? 0).toFixed(1),
        pctOver20: pct(20),
        pctOver50: pct(50),
      };
    };
    const all = window.__vt.deltas;
    // The animated window: the cross-fade (from reveal) or, in the prototype, the fade-in of the content.
    // The frame that injects the content (the module's render task, not motion) is reported apart.
    const from = window.__vt.contentReadyAt ?? 0;
    const after = all.filter((p) => p[0] > from);
    const renderFrame = window.__vt.contentReadyAt == null ? null : (after[0] ?? null);
    const anim = (window.__vt.contentReadyAt == null ? all : after.slice(1)).filter(
      (p) => p[0] <= from + 320,
    );
    return {
      reveal: window.__vt.reveal,
      ready: window.__vt.ready == null ? null : +window.__vt.ready.toFixed(1),
      finished: window.__vt.finished == null ? null : +window.__vt.finished.toFixed(1),
      finishedErr: window.__vt.finishedErr ?? null,
      contentReadyAt:
        window.__vt.contentReadyAt == null ? null : +window.__vt.contentReadyAt.toFixed(1),
      htmlClass: document.documentElement.className,
      hits: window.__vt.hits,
      clicks: window.__vt.clicks,
      frames600: stats(all),
      renderFrame,
      framesAnimated: stats(anim),
      longFrames: all.filter((p) => p[1] > 50),
      url: location.pathname + location.search,
    };
  });
  await browser.close();
  return { mode, cpuRate: Number(rateArg), tapSentAt: tapAt, ...out, errors };
}

const results = [];
for (const mode of ['proto', 'prerender', 'slow']) results.push(await run(mode));
console.log(JSON.stringify(results, null, 1));
