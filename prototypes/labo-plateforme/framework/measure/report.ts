/**
 * Consolidates measure/out/*.json into measurements.json at the lab root, with the verdicts
 * against design/perf-budget.md (P1 LCP < 2 500 ms lab, P2 initial JS < 100 000 B gzip,
 * P3 critical path <= 150 000 B, P4 CLS < 0,1).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lab, outDir } from './common.ts';

interface SizesFile {
  measuredAt: string;
  variants: { name: string; label: string; totals: Record<string, number>; files: unknown[] }[];
}
interface LighthouseFile {
  measuredAt: string;
  pass: string;
  runsPerVariant: number;
  lighthouseVersion: string;
  hostUserAgent: string;
  throttlingMethod: string;
  throttling: Record<string, number>;
  variants: Record<
    string,
    { label: string; url: string; runs: Record<string, unknown>[]; median: Record<string, number> }
  >;
}
interface SearchFile {
  measuredAt: string;
  runsPerVariant: number;
  query: string;
  warmQuery: string;
  emulation: Record<string, unknown>;
  variants: Record<
    string,
    { label: string; runs: Record<string, unknown>[]; median: Record<string, number> }
  >;
}

const read = <T>(name: string): T | undefined => {
  const p = resolve(outDir, name);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : undefined;
};

const sizesInline = read<SizesFile>('sizes.json');
const sizesExternal = read<SizesFile>('sizes-external-css.json');
const lhExternal = read<LighthouseFile>('lighthouse.json');
const lhInline = read<LighthouseFile>('lighthouse-inline-css.json');
const search = read<SearchFile>('search-timing.json');
if (sizesInline === undefined || lhInline === undefined || search === undefined)
  throw new Error('run the measurements first');

const BUDGET = {
  lcpLabMs: 2500,
  jsInitialGzip: 100_000,
  criticalPathBytes: 150_000,
  cls: 0.1,
  clsFonts: 0.02,
} as const;

interface Verdict {
  variant: string;
  pass: string;
  lcpMs: number;
  jsInitialGzip: number;
  criticalPathWire: number;
  cls: number;
  p1LcpOk: boolean;
  p2JsOk: boolean;
  p3CriticalOk: boolean;
  p4ClsOk: boolean;
  lcpMarginMs: number;
  jsMarginBytes: number;
}

const verdicts: Verdict[] = [];
const addVerdicts = (
  pass: string,
  lh: LighthouseFile | undefined,
  sizes: SizesFile | undefined,
): void => {
  if (lh === undefined || sizes === undefined) return;
  for (const [name, v] of Object.entries(lh.variants)) {
    const s = sizes.variants.find((x) => x.name === name);
    if (s === undefined) continue;
    const lcp = v.median['lcp'] ?? Number.NaN;
    const js = s.totals['jsInitialGzip'] ?? Number.NaN;
    const critical = s.totals['criticalPathWire'] ?? Number.NaN;
    const cls = v.median['cls'] ?? Number.NaN;
    verdicts.push({
      variant: name,
      pass,
      lcpMs: Math.round(lcp),
      jsInitialGzip: js,
      criticalPathWire: critical,
      cls: Number(cls.toFixed(4)),
      p1LcpOk: lcp < BUDGET.lcpLabMs,
      p2JsOk: js < BUDGET.jsInitialGzip,
      p3CriticalOk: critical <= BUDGET.criticalPathBytes,
      p4ClsOk: cls < BUDGET.cls,
      lcpMarginMs: Math.round(BUDGET.lcpLabMs - lcp),
      jsMarginBytes: BUDGET.jsInitialGzip - js,
    });
  }
};
addVerdicts('external-css', lhExternal, sizesExternal);
addVerdicts('inline-css', lhInline, sizesInline);

const report = {
  lab: 'framework',
  date: '2026-09-09',
  budget: BUDGET,
  environment: {
    lighthouseVersion: lhInline.lighthouseVersion,
    hostUserAgent: lhInline.hostUserAgent,
    throttlingMethod: lhInline.throttlingMethod,
    throttling: lhInline.throttling,
    searchEmulation: search.emulation,
    node: process.version,
  },
  deployments: Object.fromEntries(Object.entries(lhInline.variants).map(([k, v]) => [k, v.url])),
  sizes: { 'external-css': sizesExternal, 'inline-css': sizesInline },
  lighthouse: { 'external-css': lhExternal, 'inline-css': lhInline },
  searchTiming: search,
  verdicts,
};
writeFileSync(resolve(lab, 'measurements.json'), JSON.stringify(report, null, 2));
console.table(verdicts);
