/**
 * A lab probe of the budget card (design/perf-budget.md: P1, P4, P5) on a build of the app.
 *
 *   npx tsx scripts/perf-probe.ts [--root dist-ask] [--runs 5] [--write <file.json>]
 *
 * The lab is the one the card defines: « Slow 4G » — 150 ms of latency, 1.6 Mbit/s down,
 * 750 kbit/s up — and a processor four times slower, on a 390 × 844 screen, in Chromium. Files
 * are served compressed, as a host serves them.
 *
 *   P1  LCP   median of the cold loads of `/`, under 2.5 s in the lab
 *   P4  CLS   the worst of those loads, under 0.1
 *   P5  INP   each key interaction under 200 ms: a key in the field (the search answers while
 *             one types), Enter, a tile of the game, « Mot suivant », her sheet
 *
 * What this is not: a phone. It measures this machine, slowed down; what it archives is
 * PROBABLE in the vocabulary of the dossier, and a real Android stays a gesture of the editor
 * (PLAN-JEU §9.1). It exits 1 when a budget is not held, so that it can be made a gate the day
 * its numbers have been seen stable.
 *
 * An interaction shorter than 16 ms leaves no entry in the browser's Event Timing: it is
 * reported as 0, which reads « under 16 ms ».
 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, normalize, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { chromium, type CDPSession, type Page } from 'playwright';
import { serve } from './e2e-kit.js';

const SLOW_4G = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};
const CPU_RATE = 4;
const VIEWPORT = { width: 390, height: 844 };
export const BUDGET = { lcpMs: 2500, cls: 0.1, inpMs: 200 };

const COMPRESSIBLE: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
};

/** Observers installed before any script of the page: what it paints, what moves, what waits. */
const OBSERVE = `(() => {
  window.__perf = { lcp: 0, cls: 0, events: [] };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__perf.lcp = entry.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__perf.cls += entry.value;
  }).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      window.__perf.events.push({ name: entry.name, duration: entry.duration, start: entry.startTime });
    }
  }).observe({ type: 'event', durationThreshold: 16, buffered: true });
})()`;

interface Seen {
  lcp: number;
  cls: number;
  events: { name: string; duration: number; start: number }[];
}

const median = (values: readonly number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};

async function throttled(page: Page): Promise<CDPSession> {
  const client = await page.context().newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', SLOW_4G);
  await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_RATE });
  return client;
}

export interface PerfReport {
  root: string;
  lab: string;
  machine_note: string;
  measured_on: string;
  chromium: string;
  runs: number;
  lcp_ms: { median: number; all: number[] };
  cls: { worst: number; all: number[] };
  /** The longest event of each interaction, in ms; 0 reads « under 16 ms ». */
  interactions: Record<string, number>;
  budget: typeof BUDGET;
  held: boolean;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const value = (name: string): string | undefined => {
    const at = args.indexOf(name);
    return at === -1 ? undefined : args[at + 1];
  };
  const root = resolve(value('--root') ?? 'dist-ask');
  const runs = Number(value('--runs') ?? '5');
  if (!existsSync(join(root, 'index.html'))) throw new Error(`${root}: no build there`);

  // Compressed, as a host serves text: the lab's bandwidth is spent on real transfer sizes.
  const { server, origin } = await serve(root, (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) return false;
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    const type = COMPRESSIBLE[extname(file)];
    if (type === undefined || !existsSync(file)) return false;
    res.writeHead(200, {
      'content-type': type,
      'content-encoding': 'gzip',
      date: new Date().toUTCString(),
    });
    res.end(gzipSync(readFileSync(file)));
    return true;
  });

  const browser = await chromium.launch();
  const lcps: number[] = [];
  const shifts: number[] = [];
  const interactions: Record<string, number> = {};
  try {
    // --- P1 and P4: cold loads, each in a context that has never seen the site
    for (let run = 0; run < runs; run += 1) {
      const context = await browser.newContext({ viewport: VIEWPORT });
      await context.addInitScript(OBSERVE);
      const page = await context.newPage();
      await throttled(page);
      await page.goto(`${origin}/`, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const seen = await page.evaluate<Seen>('window.__perf');
      lcps.push(Math.round(seen.lcp));
      shifts.push(Number(seen.cls.toFixed(4)));
      await context.close();
    }

    // --- P5: the key interactions, on a processor four times slower
    const context = await browser.newContext({ viewport: VIEWPORT });
    await context.addInitScript(OBSERVE);
    const page = await context.newPage();
    await throttled(page);
    await page.goto(`${origin}/`, { waitUntil: 'load' });
    await page.waitForTimeout(1500);
    /** The longest event the browser timed while `act` ran and the page settled. */
    const during = async (name: string, act: () => Promise<void>): Promise<void> => {
      const from = await page.evaluate<number>('performance.now()');
      await act();
      await page.waitForTimeout(700);
      const seen = await page.evaluate<Seen>('window.__perf');
      const mine = seen.events.filter((event) => event.start >= from);
      interactions[name] = Math.max(0, ...mine.map((event) => event.duration));
    };
    await page.locator('#q').click();
    // The index and the titles are fetched at the first focus: typing starts once they are in.
    await page.waitForTimeout(2500);
    await during('a key in the field, results while typing', async () => {
      await page.locator('#q').pressSequentially('retraite', { delay: 130 });
    });
    await during('Enter, the focus moves to the results', async () => {
      await page.keyboard.press('Enter');
    });
    const game = page.locator('#jeu');
    if ((await game.count()) > 0) {
      await game.scrollIntoViewIfNeeded();
      await page.waitForTimeout(1500);
      await during('a tile of the game, the card of the place', async () => {
        await page.locator('#game-live .g-tile').first().click();
      });
      await during('« Mot suivant »', async () => {
        await page.getByRole('button', { name: 'Mot suivant' }).click();
      });
      await during('her sheet opens', async () => {
        await page.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      });
    }
    await context.close();
  } finally {
    const version = browser.version();
    await browser.close();
    server.close();
    const report: PerfReport = {
      root: value('--root') ?? 'dist-ask',
      lab: 'Slow 4G (150 ms, 1.6 Mbit/s down, 750 kbit/s up), CPU x4, 390x844, files gzipped',
      machine_note:
        'this machine, slowed down: not a phone. PROBABLE until a real Android is measured',
      measured_on: new Date().toISOString().slice(0, 10),
      chromium: version,
      runs,
      lcp_ms: { median: median(lcps), all: lcps },
      cls: { worst: Math.max(0, ...shifts), all: shifts },
      interactions,
      budget: BUDGET,
      held:
        lcps.length === runs &&
        median(lcps) < BUDGET.lcpMs &&
        Math.max(0, ...shifts) < BUDGET.cls &&
        Object.values(interactions).every((ms) => ms < BUDGET.inpMs),
    };
    console.log(
      `LCP  median ${String(report.lcp_ms.median)} ms of ${String(BUDGET.lcpMs)} — ${lcps.join(', ')}`,
    );
    console.log(
      `CLS  worst ${String(report.cls.worst)} of ${String(BUDGET.cls)} — ${shifts.join(', ')}`,
    );
    for (const [name, ms] of Object.entries(interactions)) {
      console.log(`INP  ${ms === 0 ? '< 16' : String(ms)} ms of ${String(BUDGET.inpMs)} — ${name}`);
    }
    console.log(report.held ? 'the three budgets are held, in this lab' : 'a budget is NOT held');
    const out = value('--write');
    if (out !== undefined) {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, `${JSON.stringify(report, null, 2)}\n`);
      console.log(`written: ${out}`);
    }
    if (!report.held) process.exitCode = 1;
  }
}

await main();
