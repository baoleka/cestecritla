// Headless probe of the deployed lab: opens the page with a mobile Chromium, waits for the Turnstile
// token, submits it to /verify, replays it, and records every cookie, storage key, third-party request,
// CSP violation and timing. Output: out/<mode>-<variant>.json (raw) and out/summary.json (redacted).
// Run: npm run probe   (LAB_BASE, LAB_OUT, LAB_MODES, LAB_VARIANTS override the defaults)

import {
  chromium,
  firefox,
  webkit,
  devices,
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  type Cookie,
  type Page,
} from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.env['LAB_BASE'] ?? 'https://lab.cestecritla.fr';
const OUT_DIR = process.env['LAB_OUT'] ?? 'out';
const VARIANTS = (process.env['LAB_VARIANTS'] ?? '/,/nonce').split(',');
const TOKEN_TIMEOUT_MS = 45_000;
const FIRST_PARTY_HOST = new URL(BASE).host;

type Mode =
  | 'headless-shell'
  | 'chromium-headless'
  | 'chromium-headed'
  | 'chromium-headed-noautomation'
  | 'firefox'
  | 'webkit';
const KNOWN_MODES: ReadonlySet<string> = new Set([
  'headless-shell',
  'chromium-headless',
  'chromium-headed',
  'chromium-headed-noautomation',
  'firefox',
  'webkit',
]);
const MODES: readonly Mode[] = (process.env['LAB_MODES'] ?? 'headless-shell,chromium-headless')
  .split(',')
  .map((mode) => {
    if (!KNOWN_MODES.has(mode)) throw new Error(`unknown mode ${mode}`);
    return mode as Mode;
  });

interface LabEvent {
  readonly type: string;
  readonly at: number;
  readonly detail?: string;
}

interface LabState {
  readonly variant: string;
  readonly scriptLoadedAt: number | null;
  readonly renderedAt: number | null;
  readonly token: string | null;
  readonly tokenAt: number | null;
  readonly widgetId: string | null;
  readonly events: readonly LabEvent[];
  readonly cspViolations: readonly string[];
  readonly verifyResult: unknown;
  readonly replayResult: unknown;
}

interface RequestRecord {
  readonly url: string;
  readonly host: string;
  readonly method: string;
  readonly resourceType: string;
  readonly frameUrl: string;
  status: number | null;
  setCookie: string[];
}

interface FrameStorage {
  readonly frameUrl: string;
  readonly origin: string;
  readonly localStorage: Readonly<Record<string, string>>;
  readonly sessionStorage: Readonly<Record<string, string>>;
  readonly documentCookie: string;
  readonly indexedDb: readonly string[];
  readonly error: string | null;
}

interface RunResult {
  readonly mode: Mode;
  readonly variant: string;
  readonly url: string;
  readonly startedAt: string;
  readonly userAgent: string;
  readonly chromiumVersion: string;
  readonly passed: boolean;
  readonly tokenMsFromNavigation: number | null;
  readonly wallMsToToken: number | null;
  readonly scriptLoadedMs: number | null;
  readonly renderedMs: number | null;
  readonly widgetVisible: boolean | null;
  readonly events: readonly LabEvent[];
  readonly cspViolations: readonly string[];
  readonly consoleMessages: readonly string[];
  readonly pageErrors: readonly string[];
  readonly verifyResult: unknown;
  readonly replayResult: unknown;
  readonly cookies: readonly Cookie[];
  readonly setCookieHeaders: readonly { url: string; header: string }[];
  readonly frames: readonly FrameStorage[];
  /** After page.reload() in the same context: same localStorage keys, and is `cf.turnstile.u` byte-identical? */
  readonly afterReload: {
    readonly keys: readonly string[];
    readonly turnstileUSameValue: boolean | null;
  } | null;
  readonly requests: readonly RequestRecord[];
  readonly thirdPartyHosts: readonly string[];
}

/** Evaluated inside every frame (cross-origin frames included: Playwright drives OOPIFs).
 * Kept as a source string: tsx/esbuild would otherwise inject a `__name` helper that does not exist in the page. */
const READ_FRAME_STORAGE = `(() => {
  const dump = (storage) => {
    const entries = {};
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key !== null) entries[key] = storage.getItem(key) ?? '';
    }
    return entries;
  };
  return {
    origin: location.origin,
    localStorage: dump(localStorage),
    sessionStorage: dump(sessionStorage),
    documentCookie: document.cookie,
  };
})()`;
const READ_INDEXED_DB = `indexedDB.databases().then((dbs) => dbs.map((db) => db.name ?? '(unnamed)'))`;

type FrameStorageDump = Pick<
  FrameStorage,
  'origin' | 'localStorage' | 'sessionStorage' | 'documentCookie'
>;

async function collectFrames(page: Page): Promise<FrameStorage[]> {
  const results: FrameStorage[] = [];
  for (const frame of page.frames()) {
    const frameUrl = frame.url();
    try {
      const storage = (await frame.evaluate(READ_FRAME_STORAGE)) as FrameStorageDump;
      let indexedDb: string[] = [];
      try {
        indexedDb = (await frame.evaluate(READ_INDEXED_DB)) as string[];
      } catch (error) {
        indexedDb = [`error: ${error instanceof Error ? error.message : 'unknown'}`];
      }
      results.push({ frameUrl, ...storage, indexedDb, error: null });
    } catch (error) {
      results.push({
        frameUrl,
        origin: '(unreadable)',
        localStorage: {},
        sessionStorage: {},
        documentCookie: '',
        indexedDb: [],
        error: error instanceof Error ? error.message : 'unknown',
      });
    }
  }
  return results;
}

async function launch(mode: Mode): Promise<Browser> {
  switch (mode) {
    case 'headless-shell':
      // Playwright default: chromium_headless_shell (old headless mode).
      return chromium.launch({ headless: true });
    case 'chromium-headless':
      // Full Chromium binary in the new headless mode.
      return chromium.launch({ headless: true, channel: 'chromium' });
    case 'chromium-headed':
      // Real window on $DISPLAY (visible for a few seconds on the session desktop).
      return chromium.launch({ headless: false, channel: 'chromium' });
    case 'chromium-headed-noautomation':
      // Same, without Chromium's automation banner/flag (navigator.webdriver): our own widget, our own page,
      // to observe what a *passing* challenge stores. Documented Playwright launch options, nothing else.
      return chromium.launch({
        headless: false,
        channel: 'chromium',
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--disable-blink-features=AutomationControlled'],
      });
    case 'firefox':
      return firefox.launch({ headless: true });
    case 'webkit':
      return webkit.launch({ headless: true });
  }
}

/** Mobile emulation per engine: isMobile is Chromium-only, WebKit gets an iPhone descriptor. */
function contextOptions(mode: Mode): BrowserContextOptions {
  const base: BrowserContextOptions = { locale: 'fr-FR', timezoneId: 'Europe/Paris' };
  if (mode === 'webkit') {
    const iphone = devices['iPhone 14'];
    if (iphone === undefined) throw new Error('iPhone 14 device descriptor missing');
    return { ...iphone, ...base };
  }
  const pixel = devices['Pixel 7'];
  if (pixel === undefined) throw new Error('Pixel 7 device descriptor missing');
  if (mode === 'firefox') {
    // Firefox: no isMobile emulation and its own user agent (a Chrome UA on Gecko is itself a bot signal).
    const {
      isMobile: _isMobile,
      hasTouch: _hasTouch,
      defaultBrowserType: _engine,
      userAgent: _ua,
      ...rest
    } = pixel;
    return { ...rest, ...base };
  }
  const { defaultBrowserType: _engine, ...rest } = pixel;
  return { ...rest, ...base };
}

async function runOnce(browser: Browser, mode: Mode, variant: string): Promise<RunResult> {
  const context: BrowserContext = await browser.newContext(contextOptions(mode));
  const page = await context.newPage();
  const requests: RequestRecord[] = [];
  const setCookieHeaders: { url: string; header: string }[] = [];
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];
  const byRequest = new WeakMap<object, RequestRecord>();

  page.on('request', (request) => {
    const url = request.url();
    const record: RequestRecord = {
      url,
      host: new URL(url).host,
      method: request.method(),
      resourceType: request.resourceType(),
      frameUrl: request.frame().url(),
      status: null,
      setCookie: [],
    };
    requests.push(record);
    byRequest.set(request, record);
  });
  page.on('response', async (response) => {
    const record = byRequest.get(response.request());
    if (record === undefined) return;
    record.status = response.status();
    try {
      for (const { name, value } of await response.headersArray()) {
        if (name.toLowerCase() === 'set-cookie') {
          record.setCookie.push(value);
          setCookieHeaders.push({ url: record.url, header: value });
        }
      }
    } catch {
      // headersArray can fail for aborted responses: ignore
    }
  });
  page.on('console', (message) => consoleMessages.push(`[${message.type()}] ${message.text()}`));
  page.on('pageerror', (error) => pageErrors.push(error.message));

  const url = new URL(variant, BASE).toString();
  const startedAt = new Date().toISOString();
  const wallStart = Date.now();
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  let passed = false;
  let wallMsToToken: number | null = null;
  try {
    await page.waitForFunction(
      () => {
        const lab = (window as Window & { __lab?: LabState }).__lab;
        return (
          lab !== undefined &&
          (lab.token !== null ||
            lab.events.some((event) => event.type === 'error' || event.type === 'unsupported'))
        );
      },
      undefined,
      { timeout: TOKEN_TIMEOUT_MS },
    );
    const state = await page.evaluate(
      () => (window as Window & { __lab?: LabState }).__lab ?? null,
    );
    passed = state?.token !== null && state?.token !== undefined;
    if (passed) wallMsToToken = Date.now() - wallStart;
  } catch {
    passed = false;
  }

  const outDir = path.resolve(OUT_DIR);
  await mkdir(outDir, { recursive: true });
  const slug = `${mode}-${variant === '/' ? 'static' : variant.replaceAll('/', '')}`;
  await page.screenshot({ path: path.join(outDir, `${slug}-token.png`), fullPage: true });

  const widgetVisible = await page
    .locator('#cf-turnstile iframe')
    .first()
    .isVisible()
    .catch(() => null);

  if (passed) {
    await page.click('#submit-button');
    await page.waitForFunction(
      () => {
        const lab = (window as Window & { __lab?: LabState }).__lab;
        return lab !== undefined && lab.replayResult !== null;
      },
      undefined,
      { timeout: 20_000 },
    );
    await page.screenshot({ path: path.join(outDir, `${slug}-verified.png`), fullPage: true });
  }
  // Leave time for any late beacons / storage writes after the challenge.
  await page.waitForTimeout(2_000);

  const state = await page.evaluate(() => (window as Window & { __lab?: LabState }).__lab ?? null);
  const frames = await collectFrames(page);
  const cookies = await context.cookies();

  // Persistence check: reload in the same profile and compare the challenge origin's storage.
  const challengeStorage = (list: readonly FrameStorage[]): FrameStorage | undefined =>
    list.find((frame) => frame.origin === 'https://challenges.cloudflare.com');
  let afterReload: RunResult['afterReload'] = null;
  const before = challengeStorage(frames);
  if (before !== undefined) {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(5_000);
    const after = challengeStorage(await collectFrames(page));
    const beforeValue = before.localStorage['cf.turnstile.u'];
    const afterValue = after?.localStorage['cf.turnstile.u'];
    afterReload = {
      keys: after === undefined ? [] : Object.keys(after.localStorage),
      turnstileUSameValue:
        beforeValue === undefined || afterValue === undefined ? null : beforeValue === afterValue,
    };
  }
  const thirdPartyHosts = [
    ...new Set(requests.map((request) => request.host).filter((host) => host !== FIRST_PARTY_HOST)),
  ].sort();

  const result: RunResult = {
    mode,
    variant,
    url,
    startedAt,
    userAgent: await page.evaluate(() => navigator.userAgent),
    chromiumVersion: browser.version(),
    passed,
    tokenMsFromNavigation: state?.tokenAt ?? null,
    wallMsToToken,
    scriptLoadedMs: state?.scriptLoadedAt ?? null,
    renderedMs: state?.renderedAt ?? null,
    widgetVisible,
    events: state?.events ?? [],
    cspViolations: state?.cspViolations ?? [],
    consoleMessages,
    pageErrors,
    verifyResult: state?.verifyResult ?? null,
    replayResult: state?.replayResult ?? null,
    cookies,
    setCookieHeaders,
    frames,
    afterReload,
    requests,
    thirdPartyHosts,
  };
  await writeFile(path.join(outDir, `${slug}.json`), JSON.stringify(result, null, 2));
  await context.close();
  return result;
}

/** Keeps names, sizes and attributes; truncates values (they are Cloudflare's, not ours, but no need to publish them). */
function redact(value: string): string {
  return value.length <= 12 ? value : `${value.slice(0, 12)}…(${value.length} chars)`;
}

function summarize(runs: readonly RunResult[]): unknown {
  return runs.map((run) => ({
    mode: run.mode,
    variant: run.variant,
    chromiumVersion: run.chromiumVersion,
    userAgent: run.userAgent,
    passed: run.passed,
    tokenMsFromNavigation:
      run.tokenMsFromNavigation === null ? null : Math.round(run.tokenMsFromNavigation),
    wallMsToToken: run.wallMsToToken,
    scriptLoadedMs: run.scriptLoadedMs === null ? null : Math.round(run.scriptLoadedMs),
    renderedMs: run.renderedMs === null ? null : Math.round(run.renderedMs),
    widgetVisible: run.widgetVisible,
    events: run.events.map(
      (event) =>
        `${Math.round(event.at)} ms ${event.type}${event.detail === undefined ? '' : ` (${event.detail})`}`,
    ),
    cspViolations: run.cspViolations,
    consoleMessages: run.consoleMessages,
    pageErrors: run.pageErrors,
    verifyResult: run.verifyResult,
    replayResult: run.replayResult,
    cookies: run.cookies.map((cookie) => ({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      expires: cookie.expires === -1 ? 'session' : new Date(cookie.expires * 1000).toISOString(),
      httpOnly: cookie.httpOnly,
      secure: cookie.secure,
      sameSite: cookie.sameSite,
      partitionKey: (cookie as Cookie & { partitionKey?: unknown }).partitionKey ?? null,
      valueLength: cookie.value.length,
    })),
    setCookieHeaders: run.setCookieHeaders.map(({ url, header }) => ({
      url,
      header: header.replace(/=([^;]+)/, (_match, value: string) => `=${redact(value)}`),
    })),
    storage: run.frames.map((frame) => ({
      frameUrl: frame.frameUrl.replace(/\?.*$/, '?…'),
      origin: frame.origin,
      localStorageKeys: Object.fromEntries(
        Object.entries(frame.localStorage).map(([key, value]) => [key, redact(value)]),
      ),
      sessionStorageKeys: Object.fromEntries(
        Object.entries(frame.sessionStorage).map(([key, value]) => [key, redact(value)]),
      ),
      documentCookie: frame.documentCookie === '' ? '' : redact(frame.documentCookie),
      indexedDb: frame.indexedDb,
      error: frame.error,
    })),
    afterReload: run.afterReload,
    thirdPartyHosts: run.thirdPartyHosts,
    requestsByHost: Object.fromEntries(
      [...new Set(run.requests.map((request) => request.host))].map((host) => [
        host,
        run.requests
          .filter((request) => request.host === host)
          .map(
            (request) =>
              `${request.method} ${request.url.replace(/\?.*$/, '?…').slice(0, 140)} [${request.resourceType}] → ${request.status ?? 'n/a'}${request.setCookie.length > 0 ? ' +set-cookie' : ''}`,
          ),
      ]),
    ),
  }));
}

async function main(): Promise<void> {
  const runs: RunResult[] = [];
  for (const mode of MODES) {
    const browser = await launch(mode);
    try {
      for (const variant of VARIANTS) {
        process.stdout.write(`▶ ${mode} ${variant}\n`);
        const run = await runOnce(browser, mode, variant);
        process.stdout.write(
          `  passed=${run.passed} token=${run.tokenMsFromNavigation === null ? 'n/a' : `${Math.round(run.tokenMsFromNavigation)} ms`} cookies=${run.cookies.length} csp=${run.cspViolations.length} thirdParty=${run.thirdPartyHosts.join(',')}\n`,
        );
        runs.push(run);
      }
    } finally {
      await browser.close();
    }
  }
  const outDir = path.resolve(OUT_DIR);
  await writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summarize(runs), null, 2));
  process.stdout.write(`✔ ${runs.length} run(s) → ${outDir}/summary.json\n`);
}

main().catch((error: unknown) => {
  process.stderr.write(
    `probe failed: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}\n`,
  );
  process.exitCode = 1;
});
