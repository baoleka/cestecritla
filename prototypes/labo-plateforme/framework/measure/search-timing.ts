/**
 * Time to first search result on both deployed variants (Playwright + CDP, cold cache each run):
 * mobile viewport, CPU x4, Slow 4G devtools throttling (same values as Lighthouse). From the focus
 * of the search box (which starts the lazy load) and from the first keystroke to the first `li.hit`
 * inserted in the DOM (MutationObserver, `performance.now()` in the page), plus the lazy-load
 * phases marked by shared/search/lazy.ts and a warm search (index ready, second query).
 *
 * Output: measure/out/search-timing.json, screenshots in measure/out/screenshots/.
 * Usage: tsx measure/search-timing.ts [runs] [variant...]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { CHROME_PATH, median, outDir, THROTTLING, VARIANTS } from './common.ts';

interface PageTimings {
  focus: number;
  firstInput: number;
  firstHit: number;
  loadStart: number;
  fetched: number;
  ready: number;
  indexBuildMs: number;
  hitCount: number;
  status: string;
  warmInput: number;
  warmFirstHit: number;
  warmHitCount: number;
  /** Ids of the hits for the cold query, in order (behaviour identity check across variants). */
  hitIds: string;
  /** Web fonts in status "loaded" (document.fonts), out of the faces declared with a url(). */
  fontsLoaded: string;
}

interface RunResult {
  run: number;
  focusToFirstHitMs: number;
  inputToFirstHitMs: number;
  lazyLoadMs: number;
  fetchPhaseMs: number;
  indexBuildMs: number;
  hitCount: number;
  warmInputToHitMs: number;
  warmHitCount: number;
  navigationLoadMs: number;
  hitIds: string;
  fontsLoaded: string;
}

const runsArg = Number(process.argv[2] ?? '3');
const only = process.argv.slice(3);
const QUERY = 'règle verte';
const WARM_QUERY = 'planification';
const shots = resolve(outDir, 'screenshots');
mkdirSync(shots, { recursive: true });

const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
const summary: Record<
  string,
  { label: string; runs: RunResult[]; median: Record<string, number> }
> = {};

for (const v of VARIANTS) {
  if (only.length > 0 && !only.includes(v.name)) continue;
  const runs: RunResult[] = [];
  for (let run = 1; run <= runsArg; run += 1) {
    const context = await browser.newContext({
      viewport: { width: 412, height: 823 },
      deviceScaleFactor: 1.75,
      isMobile: true,
      hasTouch: true,
      locale: 'fr-FR',
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: THROTTLING.requestLatencyMs,
      downloadThroughput: (THROTTLING.downloadThroughputKbps * 1024) / 8,
      uploadThroughput: (THROTTLING.uploadThroughputKbps * 1024) / 8,
    });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: THROTTLING.cpuSlowdownMultiplier });

    const navStart = Date.now();
    await page.goto(v.url, { waitUntil: 'load' });
    await page.waitForSelector('#q', { state: 'visible' });
    const navigationLoadMs = Date.now() - navStart;

    // Instrument the page before interacting: listeners on focus/input, observer on the results list.
    await page.evaluate(() => {
      const w = window as unknown as { __t: Record<string, number>; __warm: boolean };
      w.__t = { focus: 0, firstInput: 0, firstHit: 0, warmInput: 0, warmFirstHit: 0 };
      w.__warm = false;
      const input = document.getElementById('q');
      if (input === null) throw new Error('#q missing');
      // Capture phase on the document: runs before the app's own handlers.
      document.addEventListener(
        'focus',
        (e) => {
          if (e.target === input && w.__t['focus'] === 0) w.__t['focus'] = performance.now();
        },
        { capture: true },
      );
      document.addEventListener(
        'input',
        (e) => {
          if (e.target !== input) return;
          if (!w.__warm) {
            if (w.__t['firstInput'] === 0) w.__t['firstInput'] = performance.now();
          } else if (w.__t['warmInput'] === 0) w.__t['warmInput'] = performance.now();
        },
        { capture: true },
      );
      const observer = new MutationObserver(() => {
        const hit = document.querySelector('li.hit');
        if (hit === null) return;
        if (!w.__warm) {
          if (w.__t['firstHit'] === 0) w.__t['firstHit'] = performance.now();
        } else if (w.__t['warmFirstHit'] === 0) w.__t['warmFirstHit'] = performance.now();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    });

    await page.focus('#q');
    await page.keyboard.type(QUERY, { delay: 60 });
    await page.waitForSelector('li.hit', { timeout: 60_000 });
    await page.waitForTimeout(300);

    // Warm search: index ready; clear the box (no hits), then one `input` event with the new query
    // (page.fill dispatches a single input event) -> first li.hit inserted.
    await page.fill('#q', '');
    await page.waitForSelector('li.hit', { state: 'detached', timeout: 20_000 });
    await page.waitForTimeout(300);
    await page.evaluate(() => {
      (window as unknown as { __warm: boolean }).__warm = true;
    });
    await page.fill('#q', WARM_QUERY);
    await page.waitForSelector('li.hit', { timeout: 20_000 });
    await page.waitForTimeout(200);

    const t = await page.evaluate((): PageTimings => {
      const w = window as unknown as { __t: Record<string, number> };
      const mark = (name: string): number =>
        performance.getEntriesByName(name, 'mark')[0]?.startTime ?? 0;
      const measure = performance.getEntriesByName('search:index-build', 'measure')[0];
      const get = (k: string): number => w.__t[k] ?? 0;
      return {
        focus: get('focus'),
        firstInput: get('firstInput'),
        firstHit: get('firstHit'),
        loadStart: mark('search:load-start'),
        fetched: mark('search:fetched'),
        ready: mark('search:ready'),
        indexBuildMs: measure?.duration ?? 0,
        hitCount: document.querySelectorAll('li.hit').length,
        status: document.querySelector('.search .status, [aria-live] p')?.textContent ?? '',
        warmInput: get('warmInput'),
        warmFirstHit: get('warmFirstHit'),
        warmHitCount: document.querySelectorAll('li.hit').length,
        hitIds: '',
        fontsLoaded: [...document.fonts]
          .filter((f) => f.status === 'loaded')
          .map((f) => `${f.family} ${f.weight} ${f.style}`)
          .sort()
          .join(' | '),
      };
    });
    // Behaviour identity: the hit list for the cold query, as ids in order (section title + text).
    await page.fill('#q', QUERY);
    await page.waitForSelector('li.hit');
    await page.waitForTimeout(200);
    t.hitIds = await page.evaluate(() =>
      [...document.querySelectorAll('li.hit')]
        .map(
          (li) =>
            `${li.querySelector('span')?.textContent ?? ''} :: ${(li.querySelector('p')?.textContent ?? '').slice(0, 40)}`,
        )
        .join(' || '),
    );
    if (run === 1) {
      await page.screenshot({ path: resolve(shots, `${v.name}-search.png`), fullPage: false });
      await page.fill('#q', '');
      await page.waitForTimeout(200);
      await page.screenshot({ path: resolve(shots, `${v.name}-page.png`), fullPage: true });
    }
    const result: RunResult = {
      run,
      focusToFirstHitMs: t.firstHit - t.focus,
      inputToFirstHitMs: t.firstHit - t.firstInput,
      lazyLoadMs: t.ready - t.loadStart,
      fetchPhaseMs: t.fetched - t.loadStart,
      indexBuildMs: t.indexBuildMs,
      hitCount: t.hitCount,
      warmInputToHitMs: t.warmFirstHit - t.warmInput,
      warmHitCount: t.warmHitCount,
      navigationLoadMs,
      hitIds: t.hitIds,
      fontsLoaded: t.fontsLoaded,
    };
    console.log(
      v.name,
      run,
      JSON.stringify({ ...result, hitIds: undefined, fontsLoaded: undefined }),
      t.status,
    );
    runs.push(result);
    await context.close();
  }
  const med = (key: keyof RunResult): number => median(runs.map((r) => Number(r[key])));
  summary[v.name] = {
    label: v.label,
    runs,
    median: {
      focusToFirstHitMs: med('focusToFirstHitMs'),
      inputToFirstHitMs: med('inputToFirstHitMs'),
      lazyLoadMs: med('lazyLoadMs'),
      fetchPhaseMs: med('fetchPhaseMs'),
      indexBuildMs: med('indexBuildMs'),
      warmInputToHitMs: med('warmInputToHitMs'),
      navigationLoadMs: med('navigationLoadMs'),
    },
  };
}
await browser.close();
writeFileSync(
  resolve(outDir, 'search-timing.json'),
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      runsPerVariant: runsArg,
      query: QUERY,
      warmQuery: WARM_QUERY,
      emulation: {
        viewport: '412x823 @1.75',
        cpuSlowdown: THROTTLING.cpuSlowdownMultiplier,
        network: 'devtools Slow 4G',
        chromePath: CHROME_PATH,
      },
      variants: summary,
    },
    null,
    2,
  ),
);
