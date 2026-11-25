/**
 * End-to-end checks of the explained words outside the sheet (PLAN-MOTS, lots 4 to 6; D20.11,
 * D20.13) — on dist-gists/, the test build that shows every surface. Three engines.
 *
 *   npm run build:gists && npx tsx scripts/e2e-words.ts [--engines chromium]
 *   npx tsx scripts/e2e-words.ts --origin https://beta.cestecritla.fr --root dist
 *                       (a live host, built from dist/ — lot 16: what it serves is that build)
 *
 * What it holds, on a page of a section, of one of our cards and of one of our answers:
 *   1. the page carries a folded line, closed, and nothing of a word: no word is fetched, nor
 *      the script that draws them, while the line is closed;
 *   2. opened, the line asks for ONE file — the one of this page, at an address that names the
 *      page and no word (D20.13) — and shows under it the label that says an AI wrote the
 *      explanations, then one line per word, closed, each text with a mark a machine reads;
 *   3. a word opens on its explanation, then its example when it has one;
 *   4. a link to « #mots » arrives on the line open; without script the line is not shown;
 *   5. the page does not move once painted (Chromium); with the line and a word open it passes
 *      the accessibility audit at 390 and 320 px, and nothing overflows.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Browser, Page, Route } from 'playwright';
import {
  ENGINES,
  STILL,
  checker,
  lateLayoutShift,
  report,
  serve,
  until,
  heldContext,
} from './e2e-kit.js';
import type { Outcome } from './e2e-kit.js';

const flag = (name: string): string | null => {
  const at = process.argv.indexOf(name);
  return at < 0 ? null : (process.argv[at + 1] ?? null);
};
/** The build whose files name the pages: dist-gists/ by default; dist/ for a host built from it. */
const ROOT = flag('--root') ?? 'dist-gists';
/**
 * A live host to test instead of a local copy of the build (PLAN-MOTS, lot 16): what it serves
 * must be the build of `--root` — the names of the files come from there.
 */
const ORIGIN = flag('--origin');
const BADGE = 'Explications écrites et vérifiées par une IA';
const SHELL = 'details.words';

/** The file of a page's words, as the build wrote it. */
interface PageFile {
  written_by: string;
  labels: { badge: string; how: string; example: string };
  terms: [string, string, string, string?][];
}

/** One page of each kind that has words, with the name of its file — read from the build. */
function pagesWithWords(): { path: string; file: string; words: PageFile }[] {
  const dir = join(ROOT, 'data');
  const files = readdirSync(dir).filter((name) => /^mots-[0-9a-f]{16}-[scr]-/.test(name));
  const out: { path: string; file: string; words: PageFile }[] = [];
  for (const [kind, prefix] of [
    ['s', '/s/'],
    ['c', '/mot/'],
    ['r', '/r/'],
  ] as const) {
    const name = files.find((file) => new RegExp(`^mots-[0-9a-f]{16}-${kind}-`).test(file));
    if (name === undefined) continue;
    const key = name.replace(/^mots-[0-9a-f]{16}-[scr]-/, '').replace(/\.json$/, '');
    out.push({
      path: `${prefix}${key}/`,
      file: name,
      words: JSON.parse(readFileSync(join(dir, name), 'utf8')) as PageFile,
    });
  }
  return out;
}

async function runEngine(name: string, origin: string): Promise<Outcome> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const { out, check } = checker(name);
  const pages = pagesWithWords();
  check(
    'a page of each kind has words to explain',
    pages.length === 3,
    JSON.stringify(pages.map((p) => p.path)),
  );
  const browser: Browser = await type.launch();
  try {
    for (const { path, file, words } of pages) {
      const context = await heldContext(
        browser,
        { viewport: { width: 390, height: 844 } },
        ORIGIN === null,
      );
      const page: Page = await context.newPage();
      const requested: string[] = [];
      await page.route('**/*', async (route: Route) => {
        requested.push(route.request().url());
        await route.continue();
      });
      const violations: string[] = [];
      page.on('console', (message) => {
        if (
          /content[- ]security[- ]policy|refused to|requires '?trusted|TrustedHTML|TrustedScript/i.test(
            message.text(),
          )
        ) {
          violations.push(message.text());
        }
      });
      await page.goto(`${origin}${path}`);
      await page.waitForTimeout(400);
      const html = await page.content();
      check(
        `${path}: a folded line, closed`,
        (await page.locator(SHELL).count()) === 1 &&
          (await page.evaluate<boolean>(`document.querySelector('${SHELL}').open === false`)),
      );
      check(
        `${path}: nothing of a word in the page, and no word fetched while the line is closed`,
        !html.includes(words.labels.badge) &&
          words.terms.every(([, , plain]) => !html.includes(plain.slice(0, 40))) &&
          !requested.some((url) => /\/data\/mots-|\/_astro\/words-view\./.test(url)),
        requested.filter((url) => /mots|words/.test(url)).join(' '),
      );
      const before = requested.length;
      await page.click(`${SHELL} summary`);
      await until(page, `document.querySelector('${SHELL}').dataset.filled !== undefined`);
      const fetched = requested.slice(before).filter((url) => /\/data\//.test(url));
      check(
        `${path}: opened, the line asks for one file — its page's, whose address names no word`,
        fetched.length === 1 && fetched[0]?.endsWith(`/data/${file}`) === true,
        fetched.join(' '),
      );
      const shown = await page.evaluate<{
        badge: string;
        terms: string[];
        marked: number;
        open: number;
      }>(
        `(() => { const shell = document.querySelector('${SHELL}'); return { badge: shell.querySelector('.c-badge')?.firstChild?.textContent ?? '', terms: Array.from(shell.querySelectorAll('details.c-term summary')).map((s) => s.textContent ?? ''), marked: shell.querySelectorAll('details.c-term > p[data-generated-by="ai"]').length, open: shell.querySelectorAll('details.c-term[open]').length }; })()`,
      );
      const typeset = (text: string): string => text.replace(/'/g, '’');
      check(
        `${path}: the label says an AI wrote the explanations, then one closed line per word`,
        shown.badge.startsWith(BADGE) &&
          JSON.stringify(shown.terms) ===
            JSON.stringify(words.terms.map(([, term]) => typeset(term))) &&
          shown.open === 0 &&
          shown.marked ===
            words.terms.reduce((n, [, , , example]) => n + (example === undefined ? 1 : 2), 0),
        JSON.stringify(shown),
      );
      await page.click(`${SHELL} details.c-term summary`);
      const explained = await page.evaluate<string>(
        `document.querySelector('${SHELL} details.c-term[open] p')?.textContent ?? ''`,
      );
      check(
        `${path}: a word opens on its explanation`,
        explained === typeset(words.terms[0]?.[2] ?? '-'),
        explained.slice(0, 80),
      );
      check(
        `${path}: the policy of the page refused nothing`,
        violations.length === 0,
        violations.join(' | '),
      );
      await context.close();
    }

    // --- the page « Mots du programme » (lot 5)
    await hubChecks(browser, origin, check);

    // --- the line of the search (lot 6)
    await searchChecks(browser, origin, check);

    // --- 4. a link to « #mots » arrives on the line open; without script it is not shown
    const first = pages[0];
    if (first !== undefined) {
      const context = await heldContext(
        browser,
        { viewport: { width: 390, height: 844 } },
        ORIGIN === null,
      );
      const page = await context.newPage();
      await page.goto(`${origin}${first.path}#mots`);
      await until(page, `document.querySelector('${SHELL}').dataset.filled !== undefined`);
      check(
        'a link to « #mots » arrives on the line, open and filled',
        await page.evaluate<boolean>(`document.querySelector('${SHELL}').open`),
      );
      await context.close();
      const quiet = await heldContext(browser, { javaScriptEnabled: false }, ORIGIN === null);
      const still = await quiet.newPage();
      await still.goto(`${origin}${first.path}`);
      check(
        'without script, the line is not shown: it would open on nothing',
        await still.evaluate<boolean>(
          `getComputedStyle(document.querySelector('${SHELL}')).display === 'none'`,
        ),
      );
      await quiet.close();
    }

    // --- 5. the page does not move; the audit, with a word open (Chromium measures both)
    if (name === 'chromium' && first !== undefined) {
      const shift = await lateLayoutShift(browser, `${origin}${first.path}`, '', ORIGIN === null);
      check(
        `the page of a section does not move once painted (${shift.toFixed(4)})`,
        shift < STILL,
      );
      const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
      for (const width of [390, 320]) {
        const audited = await heldContext(
          browser,
          {
            viewport: { width, height: 700 },
            bypassCSP: true,
          },
          ORIGIN === null,
        );
        const view = await audited.newPage();
        await view.goto(`${origin}${first.path}#mots`);
        await until(view, `document.querySelector('${SHELL}').dataset.filled !== undefined`);
        await view.click(`${SHELL} details.c-term summary`);
        await view.addScriptTag({ content: axe });
        const result: { violations: { id: string; impact: string | null }[] } = await view.evaluate(
          'window.axe.run(document, { resultTypes: ["violations"] })',
        );
        const serious = result.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => v.id);
        check(
          `the line and a word open pass the accessibility audit at ${String(width)} px`,
          serious.length === 0,
          serious.join(','),
        );
        const box = await view.evaluate<{ sw: number; cw: number }>(
          '({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })',
        );
        check(
          `nothing overflows at ${String(width)} px`,
          box.sw <= box.cw,
          `${String(box.sw)} > ${String(box.cw)}`,
        );
        const target = await view.evaluate<number>(
          `document.querySelector('${SHELL} details.c-term summary').getBoundingClientRect().height`,
        );
        check(
          `a word to press is tall enough for a finger at ${String(width)} px`,
          target >= 44,
          String(target),
        );
        await audited.close();
      }
    }
  } finally {
    await browser.close();
  }
  return out;
}

/**
 * The page « Mots du programme » (lot 5): the names of the words in the HTML and the label that
 * says who wrote what they mean; nothing of what they mean until a word is opened — then the two
 * files of texts, once; a field that filters on the phone and never says a word is missing from
 * the programme; a link to « #mot-… » that arrives on that word, open.
 */
async function hubChecks(
  browser: Browser,
  origin: string,
  check: (label: string, ok: boolean, detail?: string) => void,
): Promise<void> {
  const context = await heldContext(
    browser,
    { viewport: { width: 390, height: 844 } },
    ORIGIN === null,
  );
  const page = await context.newPage();
  const requested: string[] = [];
  await page.route('**/*', async (route: Route) => {
    requested.push(route.request().url());
    await route.continue();
  });
  await page.goto(`${origin}/mot/`);
  await page.waitForTimeout(300);
  const html = await page.content();
  const meanings = JSON.parse(
    readFileSync(
      join(
        ROOT,
        'data',
        readdirSync(join(ROOT, 'data')).find((n) => n.endsWith('-sens.json')) ?? '',
      ),
      'utf8',
    ),
  ) as { texts: Record<string, string> };
  const words = await page.locator('#mots-az details.c-term').count();
  check(
    'the page of the words lists every explained word, under its label, and none of what they mean',
    words === Object.keys(meanings.texts).length &&
      html.includes(BADGE) &&
      !Object.values(meanings.texts).some((text) => html.includes(text.slice(0, 40))) &&
      !requested.some((url) => /\/data\/mots-/.test(url)),
    `${String(words)} words; ${requested.filter((url) => /mots/.test(url)).join(' ')}`,
  );
  const before = requested.length;
  await page.click('#mot-smic summary');
  await until(page, "document.querySelector('#mot-smic').dataset.filled !== undefined");
  const fetched = requested.slice(before).filter((url) => /\/data\//.test(url));
  check(
    'a word opened asks for the two files of texts — the same whatever the word — and shows what it means',
    fetched.length === 2 &&
      fetched.every((url) => /\/data\/mots-[0-9a-f]{16}-(?:sens|exemples)\.json$/.test(url)) &&
      (await page.evaluate<string>("document.querySelector('#mot-smic p')?.textContent ?? ''")) ===
        (meanings.texts['smic'] ?? '-'),
    fetched.join(' '),
  );
  const opened = requested.length;
  await page.click('#mot-t2a summary');
  await until(page, "document.querySelector('#mot-t2a').dataset.filled !== undefined");
  check(
    'a second word asks for nothing',
    requested.length === opened,
    requested.slice(opened).join(' '),
  );
  await page.fill('#mots-filtre', 'smi');
  const kept = await page.evaluate<string[]>(
    "Array.from(document.querySelectorAll('#mots-az li')).filter((li) => !li.hidden && !li.closest('[data-letter]').hidden).map((li) => li.querySelector('summary').textContent)",
  );
  check(
    'the field filters the words on the phone',
    kept.includes('SMIC') && kept.length < words && requested.length === opened,
    kept.slice(0, 6).join(', '),
  );
  await page.fill('#mots-filtre', 'zorglubique');
  const none = await page.evaluate<{ shown: boolean; text: string }>(
    "({ shown: !document.querySelector('#mots-aucun').hidden, text: document.querySelector('#mots-aucun').textContent ?? '' })",
  );
  check(
    'no word matching: one line says none of the explained words does — never that the programme lacks it',
    none.shown &&
      !/n[’']est pas dans le programme|absent|ne contient pas|n[’']en parle pas/i.test(none.text),
    none.text,
  );
  await context.close();

  const arriving = await heldContext(
    browser,
    { viewport: { width: 390, height: 844 } },
    ORIGIN === null,
  );
  const view = await arriving.newPage();
  await view.goto(`${origin}/mot/#mot-moratoire`);
  await until(view, "document.querySelector('#mot-moratoire').dataset.filled !== undefined");
  check(
    'a link to « #mot-… » arrives on that word, open, with what it means',
    await view.evaluate<boolean>("document.querySelector('#mot-moratoire').open"),
  );
  check(
    '…and the focus on its line: a keyboard or a screen reader starts from the word asked for',
    await view.evaluate<boolean>(
      "document.activeElement === document.querySelector('#mot-moratoire > summary')",
    ),
  );
  await arriving.close();
}

/**
 * The search (lot 6): typing an explained word — or asking what one means — puts one line above
 * the results, leading to its explanation, or to our card; anything else, no line. How the words
 * are found is fetched once, at the first sign of a search, and nothing typed leaves the phone.
 */
async function searchChecks(
  browser: Browser,
  origin: string,
  check: (label: string, ok: boolean, detail?: string) => void,
): Promise<void> {
  const context = await heldContext(
    browser,
    { viewport: { width: 390, height: 844 } },
    ORIGIN === null,
  );
  const page = await context.newPage();
  const requested: string[] = [];
  await page.route('**/*', async (route: Route) => {
    requested.push(route.request().url());
    await route.continue();
  });
  await page.goto(`${origin}/sommaire/`);
  await page.focus('#q');
  await until(page, 'true');
  const read = (): Promise<{ shown: boolean; text: string; href: string }> =>
    page.evaluate<{ shown: boolean; text: string; href: string }>(
      "(() => { const row = document.querySelector('#search-word'); const a = row?.querySelector('a'); return { shown: !!row && !row.hidden, text: a?.textContent ?? '', href: a?.getAttribute('href') ?? '' }; })()",
    );
  /**
   * What the line says once the search has drawn. On a live host the file that finds the words
   * may arrive after the results: a line that is due is then awaited a little (lot 16).
   */
  const line = async (
    typed: string,
    due = true,
  ): Promise<{ shown: boolean; text: string; href: string }> => {
    await page.fill('#q', typed);
    await page.waitForTimeout(500);
    let seen = await read();
    for (let waited = 0; due && !seen.shown && waited < 3000; waited += 250) {
      await page.waitForTimeout(250);
      seen = await read();
    }
    return seen;
  };
  const smic = await line('smic');
  check(
    'an explained word typed alone: one line leads to what it means',
    smic.shown && smic.text.includes('SMIC') && smic.href === '/mot/#mot-smic',
    JSON.stringify(smic),
  );
  const asked = await line('c’est quoi la t2a');
  check(
    'a question that asks what a word means: the same line',
    asked.shown && asked.href === '/mot/#mot-t2a',
    JSON.stringify(asked),
  );
  const card = await line('la règle verte');
  check(
    'the term of one of our cards: the line leads to the card',
    card.shown && card.href === '/mot/regle-verte/',
    JSON.stringify(card),
  );
  const plain = await line('les retraites à 60 ans', false);
  check('a search for a subject: no line', !plain.shown, JSON.stringify(plain));
  const finders = requested.filter((url) => /\/data\/mots-[0-9a-f]{16}\.json$/.test(url));
  check(
    'how the words are found is fetched once, by its name alone — nothing typed leaves',
    finders.length === 1 &&
      !requested.some((url) =>
        /smic|t2a|verte|retraite/i.test(decodeURIComponent(url.split('#')[0] ?? '')),
      ) &&
      !requested.some((url) => /\/data\/mots-[0-9a-f]{16}-/.test(url)),
    requested.filter((url) => /mots|smic|t2a/.test(url)).join(' '),
  );
  await context.close();
}

async function main(): Promise<void> {
  if (!existsSync(join(ROOT, 'index.html'))) {
    console.error(`no ${ROOT}/ — run \`npm run build:gists\` first`);
    process.exitCode = 1;
    return;
  }
  if (ORIGIN !== null) {
    if (!/^https:\/\/[a-z.]+$/.test(ORIGIN)) throw new Error('--origin takes https://host');
    await report((engine) => runEngine(engine, ORIGIN));
    return;
  }
  const { server, origin } = await serve(ROOT);
  try {
    await report((engine) => runEngine(engine, origin));
  } finally {
    server.close();
  }
}

void main();
