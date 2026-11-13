/**
 * What the end-to-end scripts share: a static server for a build, a way to wait that our own
 * security policy allows, and a list of checks that reads like one.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { chromium, firefox, webkit, type Browser, type BrowserType, type Page } from 'playwright';

export const ENGINES: Record<string, BrowserType> = { chromium, firefox, webkit };

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

/**
 * Serves a build from a local port. `intercept` may answer a request itself (and return true):
 * a file made to fail, an endpoint that does not exist yet.
 */
export function serve(
  root: string,
  intercept?: (req: IncomingMessage, res: ServerResponse) => boolean,
): Promise<{ server: Server; origin: string }> {
  const server = createServer((req, res) => {
    if (intercept?.(req, res) === true) return;
    const path = decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/');
    let file = normalize(join(root, path));
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!existsSync(file)) {
      res
        .writeHead(404, { 'content-type': MIME['.html'] })
        .end(readFileSync(join(root, '404.html')));
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[extname(file)] ?? 'application/octet-stream',
      date: new Date().toUTCString(),
    });
    res.end(readFileSync(file));
  });
  return new Promise((done) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address !== null ? address.port : 0;
      done({ server, origin: `http://127.0.0.1:${String(port)}` });
    });
  });
}

/** Asks from Node: the page's policy refuses the `eval` a string given to waitForFunction needs. */
export async function until(page: Page, expression: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (await page.evaluate<boolean>(`Boolean(${expression})`)) return;
    if (Date.now() > deadline) throw new Error(`timed out waiting for: ${expression}`);
    await page.waitForTimeout(40);
  }
}

/** Under this a page is said not to move: a font that settles shifts a line by less. */
export const STILL = 0.02;

/**
 * How much a page moves after its first paint, when its scripts arrive late — the sum of its
 * layout shifts, as Chromium measures them (the other engines do not). A block a script
 * reveals above something already painted is exactly what this catches: on 13/11/2026 the
 * search field, shown by its script, pushed the whole home page 130 px down (0.17).
 * Every script is held back 400 ms, so that the answer does not depend on which of the paint
 * and the script wins on a fast machine. `also` runs in the page before anything else: it is
 * how a caller makes the page misbehave, to see that this measure notices.
 */
export async function lateLayoutShift(browser: Browser, url: string, also = ''): Promise<number> {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript(
    'window.__shift = 0; new PerformanceObserver((list) => { for (const entry of list.getEntries()) { if (!entry.hadRecentInput) window.__shift += entry.value; } }).observe({ type: "layout-shift", buffered: true });',
  );
  if (also !== '') await context.addInitScript(also);
  const page = await context.newPage();
  await page.route('**/*.js', async (route) => {
    await new Promise((done) => setTimeout(done, 400));
    await route.continue();
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(900);
  const shift = await page.evaluate<number>('window.__shift');
  await context.close();
  return shift;
}

export interface Outcome {
  engine: string;
  passed: string[];
  failed: string[];
}

/** A list of checks: each says what it holds, and what it saw when it does not. */
export function checker(engine: string): {
  out: Outcome;
  check: (label: string, ok: boolean, detail?: string) => void;
} {
  const out: Outcome = { engine, passed: [], failed: [] };
  return {
    out,
    check: (label, ok, detail = '') => {
      (ok ? out.passed : out.failed).push(detail === '' || ok ? label : `${label} — ${detail}`);
    },
  };
}

/** Runs the engines asked for (`--engines chromium,webkit`), prints, and exits 1 on a failure. */
export async function report(
  run: (engine: string) => Promise<Outcome>,
  args: readonly string[] = process.argv.slice(2),
): Promise<void> {
  const selected = args.includes('--engines')
    ? (args[args.indexOf('--engines') + 1] ?? '').split(',')
    : Object.keys(ENGINES);
  let failed = 0;
  for (const engine of selected) {
    const result = await run(engine);
    console.log(
      `${result.engine}: ${String(result.passed.length)} passed, ${String(result.failed.length)} failed`,
    );
    for (const line of result.failed) console.log(`  ✖ ${line}`);
    failed += result.failed.length;
  }
  if (failed > 0) process.exitCode = 1;
}
