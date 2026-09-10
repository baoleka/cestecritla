/** Shared constants and helpers of the measurement scripts. */
import { mkdirSync } from 'node:fs';
import { request } from 'node:https';
import { homedir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const here = dirname(fileURLToPath(import.meta.url));
export const lab = resolve(here, '..');
export const outDir = resolve(here, 'out');
mkdirSync(outDir, { recursive: true });

export interface Variant {
  readonly name: 'react' | 'react-ssg' | 'astro';
  readonly label: string;
  readonly url: string;
  readonly dist: string;
  /** Directory of hashed build assets inside dist. */
  readonly assetsDir: string;
}

export const VARIANTS: readonly Variant[] = [
  {
    name: 'react',
    label: 'React 19 + Vite 6 + Tailwind v4',
    url: 'https://aec-lab-fw-react.baoleka.workers.dev/',
    dist: resolve(lab, 'react', 'dist'),
    assetsDir: 'assets',
  },
  {
    name: 'react-ssg',
    label: 'React 19 + Vite 6 + Tailwind v4, prerendered + hydration',
    url: 'https://aec-lab-fw-react-ssg.baoleka.workers.dev/',
    dist: resolve(lab, 'react', 'dist-ssg'),
    assetsDir: 'assets',
  },
  {
    name: 'astro',
    label: 'Astro 5 (static + vanilla script)',
    url: 'https://aec-lab-fw-astro.baoleka.workers.dev/',
    dist: resolve(lab, 'astro', 'dist'),
    assetsDir: '_astro',
  },
];

/** Playwright's Chromium (same binary as design/perf-budget.md §5.1). */
export const CHROME_PATH =
  process.env['CHROME_PATH'] ??
  resolve(homedir(), '.cache', 'ms-playwright', 'chromium-1243', 'chrome-linux64', 'chrome');

/** Lighthouse "Slow 4G" devtools throttling values (perf-budget.md §5.1, applied throttling). */
export const THROTTLING = {
  cpuSlowdownMultiplier: 4,
  rttMs: 150,
  throughputKbps: 1638.4,
  requestLatencyMs: 562.5,
  downloadThroughputKbps: 1474.56,
  uploadThroughputKbps: 675,
} as const;

export interface WireSize {
  status: number;
  bytesOnWire: number;
  encoding: string;
  contentType: string;
}

/** Bytes actually transferred for a URL with the given Accept-Encoding (body only, compressed). */
export function wireSize(url: string, acceptEncoding = 'br, gzip'): Promise<WireSize> {
  return new Promise((resolvePromise, reject) => {
    const req = request(url, { headers: { 'accept-encoding': acceptEncoding } }, (res) => {
      let bytes = 0;
      res.on('data', (chunk: Buffer) => {
        bytes += chunk.byteLength;
      });
      res.on('end', () => {
        resolvePromise({
          status: res.statusCode ?? 0,
          bytesOnWire: bytes,
          encoding: String(res.headers['content-encoding'] ?? 'identity'),
          contentType: String(res.headers['content-type'] ?? ''),
        });
      });
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

export function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const a = sorted[mid];
  const b = sorted[mid - 1];
  if (a === undefined) return Number.NaN;
  if (sorted.length % 2 === 1 || b === undefined) return a;
  return (a + b) / 2;
}
