/**
 * Lighthouse 13 (CLI, Playwright's Chromium, headless) on both deployed variants:
 * mobile emulation, applied devtools throttling (CPU x4, Slow 4G), N runs each (default 3),
 * per-metric median. Same flags as design/perf-budget.md §5.1.
 *
 * Outputs: measure/out/lighthouse/<variant>.<run>.json (full reports), measure/out/lighthouse.json
 * (summary). Usage: tsx measure/lighthouse.ts [runs] [variant...]
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { CHROME_PATH, lab, median, outDir, THROTTLING, VARIANTS } from './common.ts';

interface Audit {
  numericValue?: number;
  score?: number | null;
  details?: { items?: unknown[] };
}
interface LhrNetworkItem {
  url: string;
  transferSize: number;
  resourceSize: number;
  resourceType?: string;
  statusCode?: number;
}
interface Lhr {
  lighthouseVersion: string;
  fetchTime: string;
  userAgent: string;
  environment: { hostUserAgent: string; networkUserAgent: string; benchmarkIndex: number };
  configSettings: {
    throttlingMethod: string;
    throttling: Record<string, number>;
    formFactor: string;
  };
  categories: { performance: { score: number | null } };
  audits: Record<string, Audit>;
}

interface RunSummary {
  run: number;
  file: string;
  fetchTime: string;
  score: number | null;
  fcp: number;
  lcp: number;
  tbt: number;
  cls: number;
  speedIndex: number;
  ttfb: number;
  lcpElement: string;
  lcpBreakdown: Record<string, number>;
  /** Total main-thread work (ms, throttled clock), `mainthread-work-breakdown`. */
  mainThreadMs: number;
  /** Script evaluation + parse time (ms), `bootup-time`. */
  bootupMs: number;
  requests: number;
  transferTotal: number;
  transferByType: Record<string, number>;
  benchmarkIndex: number;
}

const runsArg = Number(process.argv[2] ?? '3');
const only = process.argv.slice(3);
/** Optional pass name (env TAG), e.g. "inline-css": suffixes report and summary file names. */
const tag = process.env['TAG'] ?? '';
/** SUMMARIZE_ONLY=1: rebuild the summary from the saved reports without running Lighthouse. */
const summarizeOnly = process.env['SUMMARIZE_ONLY'] === '1';
const suffix = tag.length > 0 ? `-${tag}` : '';
const lhDir = resolve(outDir, 'lighthouse');
mkdirSync(lhDir, { recursive: true });
const bin = resolve(lab, 'node_modules', '.bin', 'lighthouse');

/** LCP element selector, from the `lcp-breakdown-insight` audit (Lighthouse 13 insight audits). */
function lcpElementOf(lhr: Lhr): string {
  const items = (lhr.audits['lcp-breakdown-insight']?.details?.items ?? []) as {
    type?: string;
    selector?: string;
  }[];
  return items.find((it) => it.type === 'node')?.selector ?? '';
}

/** LCP sub-parts (ms) from the same insight: ttfb, loadDelay, loadDuration, renderDelay. */
function lcpBreakdownOf(lhr: Lhr): Record<string, number> {
  const items = (lhr.audits['lcp-breakdown-insight']?.details?.items ?? []) as {
    type?: string;
    items?: { subpart: string; duration: number }[];
  }[];
  const table = items.find((it) => it.type === 'table');
  const out: Record<string, number> = {};
  for (const row of table?.items ?? []) out[row.subpart] = row.duration;
  return out;
}

const summary: Record<
  string,
  { label: string; url: string; runs: RunSummary[]; median: Record<string, number> }
> = {};

for (const v of VARIANTS) {
  if (only.length > 0 && !only.includes(v.name)) continue;
  const runs: RunSummary[] = [];
  for (let run = 1; run <= runsArg; run += 1) {
    const file = resolve(lhDir, `${v.name}${suffix}.${String(run)}.json`);
    const args = [
      v.url,
      '--form-factor=mobile',
      '--screenEmulation.mobile',
      '--throttling-method=devtools',
      `--throttling.cpuSlowdownMultiplier=${String(THROTTLING.cpuSlowdownMultiplier)}`,
      `--throttling.rttMs=${String(THROTTLING.rttMs)}`,
      `--throttling.throughputKbps=${String(THROTTLING.throughputKbps)}`,
      `--throttling.requestLatencyMs=${String(THROTTLING.requestLatencyMs)}`,
      `--throttling.downloadThroughputKbps=${String(THROTTLING.downloadThroughputKbps)}`,
      `--throttling.uploadThroughputKbps=${String(THROTTLING.uploadThroughputKbps)}`,
      '--only-categories=performance',
      '--chrome-flags=--headless=new --no-sandbox',
      '--output=json',
      `--output-path=${file}`,
      '--quiet',
    ];
    if (summarizeOnly) {
      console.log(`summarize ${v.name} run ${String(run)} from ${file}`);
    } else {
      console.log(`lighthouse ${v.name} run ${String(run)}/${String(runsArg)}`);
      const res = spawnSync(bin, args, {
        env: { ...process.env, CHROME_PATH },
        stdio: ['ignore', 'inherit', 'inherit'],
        timeout: 300_000,
      });
      if (res.status !== 0) throw new Error(`lighthouse exited with ${String(res.status)}`);
    }
    const lhr = JSON.parse(readFileSync(file, 'utf8')) as Lhr;
    const a = lhr.audits;
    const num = (id: string): number => a[id]?.numericValue ?? Number.NaN;
    const netItems = (a['network-requests']?.details?.items ?? []) as LhrNetworkItem[];
    const byType: Record<string, number> = {};
    for (const it of netItems) {
      const t = it.resourceType ?? 'Other';
      byType[t] = (byType[t] ?? 0) + it.transferSize;
    }
    runs.push({
      run,
      file,
      fetchTime: lhr.fetchTime,
      score: lhr.categories.performance.score,
      fcp: num('first-contentful-paint'),
      lcp: num('largest-contentful-paint'),
      tbt: num('total-blocking-time'),
      cls: num('cumulative-layout-shift'),
      speedIndex: num('speed-index'),
      ttfb: num('server-response-time'),
      lcpElement: lcpElementOf(lhr),
      lcpBreakdown: lcpBreakdownOf(lhr),
      mainThreadMs: num('mainthread-work-breakdown'),
      bootupMs: num('bootup-time'),
      requests: netItems.length,
      transferTotal: netItems.reduce((n, it) => n + it.transferSize, 0),
      transferByType: byType,
      benchmarkIndex: lhr.environment.benchmarkIndex,
    });
  }
  const med = (key: keyof RunSummary): number => median(runs.map((r) => Number(r[key])));
  const medians = {
    score: med('score'),
    fcp: med('fcp'),
    lcp: med('lcp'),
    tbt: med('tbt'),
    cls: med('cls'),
    speedIndex: med('speedIndex'),
    ttfb: med('ttfb'),
    mainThreadMs: med('mainThreadMs'),
    bootupMs: med('bootupMs'),
    transferTotal: med('transferTotal'),
    requests: med('requests'),
  };
  summary[v.name] = {
    label: v.label,
    url: v.url,
    runs,
    median: medians,
  };
  console.log(v.name, JSON.stringify(medians));
}

const first = Object.values(summary)[0]?.runs[0];
const meta =
  first === undefined
    ? {}
    : (() => {
        const lhr = JSON.parse(readFileSync(first.file, 'utf8')) as Lhr;
        return {
          lighthouseVersion: lhr.lighthouseVersion,
          hostUserAgent: lhr.environment.hostUserAgent,
          networkUserAgent: lhr.environment.networkUserAgent,
          throttlingMethod: lhr.configSettings.throttlingMethod,
          throttling: lhr.configSettings.throttling,
          formFactor: lhr.configSettings.formFactor,
          chromePath: CHROME_PATH,
        };
      })();
// Merge with a previous summary of the same pass (a partial run keeps the other variant's results).
const summaryFile = resolve(outDir, `lighthouse${suffix}.json`);
const previous = existsSync(summaryFile)
  ? (JSON.parse(readFileSync(summaryFile, 'utf8')) as { variants?: typeof summary })
  : {};
writeFileSync(
  summaryFile,
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      pass: tag,
      runsPerVariant: runsArg,
      ...meta,
      variants: { ...previous.variants, ...summary },
    },
    null,
    2,
  ),
);
