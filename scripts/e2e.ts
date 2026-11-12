/**
 * End-to-end checks of the built app, in three browser engines (lot D6).
 *
 *   npm run build && npx tsx scripts/e2e.ts                    Chromium, Firefox, WebKit
 *   npx tsx scripts/e2e.ts --engines chromium
 *   npx tsx scripts/e2e.ts --real     (local) official pages answered from the stored crawl:
 *                                     a click on a measure must land on that measure
 *
 * dist/ is served from a local port. Every request to any other host is intercepted: the
 * official site is answered by a stub (or, with --real, by the stored pages), anything else is
 * aborted and reported. Nothing leaves the machine, and nothing may try to.
 *
 * What is checked:
 *   1. without JavaScript the search does not exist and the table of contents does;
 *   2. a search finds sections, says how many, and keeps the query after `#` — and no request
 *      ever carries the words typed;
 *   3. hostile input is displayed as text: `#q=<img onerror=…>` creates no element and runs
 *      nothing;
 *   4. links into the book are section anchors in the HTML and gain their text directive from
 *      the script, where the engine supports it;
 *   5. a bridge of the 2025 edition leads to a page of the 2026 edition;
 *   6. the Content-Security-Policy of the pages is violated by nothing we ship.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';
import { chromium, firefox, webkit, type BrowserType, type Page } from 'playwright';
import { CRAWL_ROOT, type FetchLog } from './aec26-source.js';
import type { Manifest } from './aec26-types.js';

const ENGINES: Record<string, BrowserType> = { chromium, firefox, webkit };
const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};
const OFFICIAL = 'https://melenchon2027.fr';

function serve(root: string): Promise<{ server: Server; origin: string }> {
  const server = createServer((req, res) => {
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
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
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

/** The stored official pages, by URL — only with --real, only where private/ exists. */
function storedPages(stamp: string): Map<string, string> {
  const dir = resolve(CRAWL_ROOT, stamp);
  const log = JSON.parse(readFileSync(resolve(dir, 'fetch-log.json'), 'utf8')) as FetchLog;
  return new Map(log.pages.map((p) => [p.url, readFileSync(resolve(dir, p.file), 'utf8')]));
}

const STUB =
  '<!doctype html><html lang="fr"><title>stub</title><body><main><h1>Page officielle (bouchon de test)</h1></main></body></html>';

interface Outcome {
  engine: string;
  passed: string[];
  failed: string[];
}

async function runEngine(
  name: string,
  origin: string,
  manifest: Manifest,
  official: Map<string, string> | null,
): Promise<Outcome> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const out: Outcome = { engine: name, passed: [], failed: [] };
  const check = (label: string, ok: boolean, detail = ''): void => {
    (ok ? out.passed : out.failed).push(detail === '' || ok ? label : `${label} — ${detail}`);
  };
  const browser = await type.launch();
  try {
    const escaped: string[] = [];
    const requested: string[] = [];
    const violations: string[] = [];
    const dialogs: string[] = [];

    const guard = async (page: Page): Promise<void> => {
      await page.route('**/*', async (route) => {
        const url = route.request().url();
        requested.push(url);
        if (url.startsWith(origin)) return route.continue();
        if (url.startsWith(OFFICIAL) && route.request().resourceType() === 'document') {
          const body = official?.get(url.split('#')[0] ?? '') ?? STUB;
          return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body });
        }
        // What an OFFICIAL page asks for once we have left is its business (and is aborted too):
        // only a request made by one of our own pages counts as ours trying to leave.
        let from = '';
        try {
          from = route.request().frame().url();
        } catch {
          from = '';
        }
        if (!url.startsWith(OFFICIAL) && from.startsWith(origin)) escaped.push(url);
        return route.abort();
      });
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        void dialog.dismiss();
      });
      // Only while one of OUR pages is showing: the stored official pages, loaded without
      // their scripts and styles, complain about jQuery, and that says nothing about us.
      const ours = (): boolean => page.url().startsWith(origin);
      page.on('console', (message) => {
        if (ours() && /content security policy|refused to/i.test(message.text())) {
          violations.push(message.text());
        }
      });
      page.on('pageerror', (error) => {
        if (ours()) violations.push(`page error: ${error.message}`);
      });
    };

    // --- 1. without JavaScript
    {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      await guard(page);
      await page.goto(`${origin}/`);
      check('no JS: the search form stays hidden', !(await page.locator('#search').isVisible()));
      const links = await page.locator('.toc a').count();
      check(
        'no JS: the table of contents links every section',
        links === manifest.sections.length,
        `${String(links)} links`,
      );
      await context.close();
    }

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await guard(page);

    // --- 2. a search
    await page.goto(`${origin}/`);
    check('the search form appears with JavaScript', await page.locator('#search').isVisible());
    await page.fill('#q', 'retraite à 60 ans');
    await page.press('#q', 'Enter');
    await page.waitForSelector('#search-list li');
    const found = await page.locator('#search-list li').count();
    check('a search lists sections', found >= 1 && found <= 8, `${String(found)} results`);
    const status = (await page.locator('#search-status').textContent()) ?? '';
    check('the status says how many were found', /trouvé/.test(status), status);
    check(
      'the query is kept after #',
      page.url().endsWith('#q=retraite%20%C3%A0%2060%20ans'),
      page.url(),
    );
    const carrying = requested.filter((url) =>
      /retraite/i.test(decodeURIComponent(url.split('#')[0] ?? '')),
    );
    check('no request carries the words typed', carrying.length === 0, carrying.join(' '));
    const resultHref = (await page.locator('#search-list h3 a').first().getAttribute('href')) ?? '';
    check(
      'a result links to its section page',
      /^\/s\/p\dc\d+-s\d\d\/$/.test(resultHref),
      resultHref,
    );

    // --- 4. links into the book (search results)
    const supports = await page.evaluate<boolean>("'fragmentDirective' in document");
    // In-page code is sent as a string: tsx would wrap a function in a helper the page lacks.
    const hitHref = await page.evaluate<string>(
      "document.querySelector('#search-list .hits a').href",
    );
    check(
      'a hit links into the official book',
      hitHref.startsWith(`${OFFICIAL}/programme/livre/`),
      hitHref.slice(0, 60),
    );
    if (supports) {
      const withDirective = await page.evaluate<number>(
        "Array.from(document.querySelectorAll('#search-list .hits a[data-fragment]')).filter((el) => el.href.includes(':~:text=')).length",
      );
      const marked = await page.locator('#search-list .hits a[data-fragment]').count();
      check(
        'search hits gain their text directive',
        marked > 0 && withDirective === marked,
        `${String(withDirective)}/${String(marked)}`,
      );
    }

    // --- 3. hostile input
    await page.goto(
      `${origin}/#q=${encodeURIComponent('<img src=x onerror=alert(1)><script>alert(2)</script>')}`,
    );
    await page.waitForFunction("document.querySelector('#search-status').textContent !== ''");
    const injected = await page.evaluate<number>(
      "document.querySelectorAll('#search-list img, #search-status img, main script:not([type])').length",
    );
    const shown = await page.inputValue('#q');
    check('hostile input creates no element', injected === 0);
    check('hostile input is shown as the text it is', shown.startsWith('<img src=x'), shown);
    check('hostile input runs nothing', dialogs.length === 0, dialogs.join(' '));

    // --- 4. links into the book (section page)
    const section = manifest.sections.find(
      (s) => s.items.filter((i) => typeof i.locator === 'string').length >= 3,
    );
    if (section === undefined) throw new Error('no section with three located propositions');
    const html = readFileSync(`dist/s/${section.id}/index.html`, 'utf8');
    check('static HTML: no text directive in an href', !/href="[^"]*:~:/.test(html));
    await page.goto(`${origin}/s/${section.id}/`);
    const pills = page.locator('.pills a');
    const hrefs = await page.evaluate<string[]>(
      "Array.from(document.querySelectorAll('.pills a')).map((el) => el.href)",
    );
    check(
      'every pill links to the official section',
      hrefs.every((h) => h.startsWith(section.url)),
      `${String(hrefs.length)} pills`,
    );
    check(
      supports ? 'pills gain their text directive' : 'no directive where the engine has no support',
      supports ? hrefs.some((h) => h.includes(':~:text=')) : hrefs.every((h) => !h.includes(':~:')),
    );
    check(
      'the main link is the plain section anchor',
      (await page.locator('a.cta').first().getAttribute('href')) === section.url,
    );

    if (official !== null && supports) {
      // The real thing: click the third located measure, and it must be on screen.
      const target = section.items.filter((i) => i.kind !== 'paragraph');
      const index = target.findIndex((i, n) => n >= 2 && typeof i.locator === 'string');
      await pills.nth(index).click();
      await page.waitForLoadState('load');
      await page.waitForTimeout(1200);
      const visible = await page.evaluate<boolean>(`(() => {
        const heading = document.getElementById(${JSON.stringify(section.anchor)});
        const items = [];
        for (const el of Array.from(heading.parentElement.children)) {
          if (el.matches('div.mesure-cle')) items.push(el.querySelector('p'));
          else if (el.matches('ul.wp-block-list')) for (const li of Array.from(el.children)) {
            if (li.matches('li.mesure')) items.push(li); else items.push(...Array.from(li.querySelectorAll(':scope > ul > li')));
          }
        }
        const rect = items[${String(index)}].getBoundingClientRect();
        return rect.top < window.innerHeight && rect.bottom > 0 && window.scrollY > 0;
      })()`);
      check('real pages: a click lands on the measure itself', visible);
    }

    // --- 5. a bridge of the 2025 edition
    await page.goto(`${origin}/m/c12-s01-k01/`);
    const target = page.locator('.targets a').first();
    check('a bridge names a section of the 2026 edition', (await target.count()) === 1);
    await target.click();
    await page.waitForLoadState('load');
    check('…and leads to its pointer page', /\/s\/p\dc\d+-s\d\d\/$/.test(page.url()), page.url());
    check(
      'a bridge reached without its trailing slash still answers',
      (await page.goto(`${origin}/m/c12-s01-k01`))?.status() === 200,
    );

    // --- 6. the page's own security policy
    check(
      'nothing we ship violates the Content-Security-Policy',
      violations.length === 0,
      violations.slice(0, 3).join(' | '),
    );
    check(
      'no request tried to leave for a third party',
      escaped.length === 0,
      escaped.slice(0, 3).join(' '),
    );
    await context.close();
  } finally {
    await browser.close();
  }
  return out;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const engines = (args[args.indexOf('--engines') + 1] ?? 'chromium,firefox,webkit').split(',');
  const selected = args.includes('--engines') ? engines : ['chromium', 'firefox', 'webkit'];
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
  const stamp = manifest.meta.crawled_at.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const official = args.includes('--real') ? storedPages(stamp) : null;
  const { server, origin } = await serve(resolve('dist'));
  let failed = 0;
  try {
    for (const engine of selected) {
      const result = await runEngine(engine, origin, manifest, official);
      console.log(
        `${result.engine}: ${String(result.passed.length)} passed, ${String(result.failed.length)} failed`,
      );
      for (const line of result.failed) console.log(`  ✖ ${line}`);
      failed += result.failed.length;
    }
  } finally {
    server.close();
  }
  if (failed > 0) process.exit(1);
}

await main();
