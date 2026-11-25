/**
 * End-to-end checks of the sheet of « Demander » AS IT OPENS (D16.59, D16.60): sentences
 * written ahead, one per measure found — and no live AI. Three browser engines, against a
 * Worker that is SIMULATED: nothing is deployed, nothing is sent to anyone.
 *
 *   npm run build:gists && npx tsx scripts/e2e-sheet.ts          Chromium, Firefox, WebKit
 *   npx tsx scripts/e2e-sheet.ts --engines chromium
 *
 * dist-gists/ — the app as it is when data/2026/ask.json says "chat" and names no model
 * (scripts/build.ts --ask-test gists) — is served from a local port. `/api/gists` is answered
 * here from a table, after the Worker's own reader of requests: a body the Worker would refuse
 * is refused here too. `/api/chat` is answered as a model would — a page of this build has no
 * way to draw it, so what holds is the count: the page never asks.
 *
 * Every CONTEXT of the run is guarded, not its pages one by one: a page the sheet opens is
 * routed and recorded like the first. What every request carried — its address, its headers,
 * its body — is read for the words typed; every socket is refused and counted; the refusals of
 * the policy are counted from the event every engine fires; and all of it is judged once every
 * context is done (review 19). The clock of every context is held outside the windows of 2027,
 * and `/flags.json` says the same hour: a gate on the real hour would fail for 136 hours of
 * 2027 (U13). The phone's own freeze is played on purpose, inside a window and under a stop
 * thrown by hand (§5 ter).
 *
 * scripts/e2e-ask.ts is the test of the other sheet, the one with a model that explains:
 * closed since D16.60, kept and tested. This file holds what production opens with:
 *   1. before any gesture: the notice says what asking gives and who wrote it — an AI; no
 *      model is named anywhere; the offer of an explanation is not in the page at all;
 *   2. typing sends nothing. « Demander » sends ONCE, to `/api/gists`, `corpus` and `ids` and
 *      nothing else — and not a word typed;
 *   3. the sentences come under a label that says who wrote and checked them: an AI — not
 *      the editor, not a person; each keeps its link to the official page;
 *   4. NO REQUEST EVER GOES TO `/api/chat`, whatever the Worker answers — even a Worker that
 *      says an AI is available — and no gesture of the sheet offers one;
 *   5. every other state is a normal one: the route closed, the Worker broken, another state
 *      of the book, electoral silence — none says a word of failure; and a file of titles the
 *      script cannot read never leaves a question searching for ever (R73);
 *   6. a sentence of the base is text: markup in it creates no element;
 *   7. the explained words (D16.62, D20.10): the acronyms and technical terms of the question
 *      and of the sentences on the screen, found on the phone by their wordings — one file,
 *      fetched with the sheet; nothing is sent to find a word. Their texts come the first time
 *      one is opened: two more files, the same whatever the word (D20.13), and nothing more
 *      after. Each opens on a short text under a label that says an AI wrote and checked it;
 *      what the question names is open; a freeze, a request for a vote or a charge shows
 *      none; every text an AI wrote — a sentence, an explanation, « En clair » (D21.49) —
 *      carries a mark a machine can read, and no link does;
 *   8. nothing is written on the phone — no storage, no base, no cache, no cookie — nothing in
 *      the address; the thread empties;
 *   9. the policy of the page names nobody but us, read directive by directive; the sheet
 *      passes the accessibility audit at 390 and 320 px — an explained word open — and neither
 *      it nor the conversation inside it overflows.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { BrowserContext, Page, Route } from 'playwright';
import { parseGistsRequest } from '../src/lib/chat-contract.js';
import { formatReopenTimeFr } from '../src/lib/silence.js';
import { MODELS } from '../src/worker/models.js';
import type { Manifest } from './aec26-types.js';
import { loadPage } from './ask-page.js';
import { ENGINES, GATE_HOUR, checker, report, serve, until } from './e2e-kit.js';
import { beforePolicy, metaPolicy, policyProblems } from './page-policy.js';
import { QUIET_QUESTION, plainSentence, sheetCase, wordySentence } from './terms-fixtures.js';
import type { Outcome } from './e2e-kit.js';

const ROOT = 'dist-gists';

/**
 * What the build says its words mean, and their examples (src/lib/words-data.ts): the texts the
 * sheet must show, read in the very files it fetches.
 */
function builtTexts(): { meanings: Record<string, string>; examples: Record<string, string> } {
  const dir = join(ROOT, 'data');
  const texts = (suffix: string): Record<string, string> => {
    const name = readdirSync(dir).find((file) => file.startsWith('mots-') && file.endsWith(suffix));
    if (name === undefined) throw new Error(`${ROOT}: no file of words ending in ${suffix}`);
    const file = JSON.parse(readFileSync(join(dir, name), 'utf8')) as {
      texts: Record<string, string>;
    };
    return file.texts;
  };
  return { meanings: texts('-sens.json'), examples: texts('-exemples.json') };
}
const OFFICIAL = 'https://melenchon2027.fr';
/**
 * Words a page must never show when something did not come: every state is a normal one. Whole
 * words only — « terroristes » holds « error », « panneaux » holds « panne » — and read in our
 * own lines of a turn, never in the question nor in the book's titles (`ours`; review 19).
 */
const FAILURE =
  /(?<![\p{L}\p{N}])(?:erreur|panne|indisponible|désolé|malheureusement|réessa\p{L}*|error|undefined|null)(?![\p{L}\p{N}])/iu;
/** What a page that offered or showed a live AI would carry… */
const LIVE_AI =
  /Expliquer avec l’IA|Ne plus demander à l’IA|Demander aussi à l’IA|IA ·|Mistral|Llama|Gemma|gpt-oss/;
/** …and any model of the catalogue, by its key, its identifier or its name, in any case. */
const MODEL_NAMES = new RegExp(
  Object.entries(MODELS)
    .flatMap(([key, model]) => [key, model.id, model.name])
    .map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'i',
);
const namesAModel = (text: string): boolean => LIVE_AI.test(text) || MODEL_NAMES.test(text);
/** The hour every context of the run is held at: outside the windows of 2027 (U13). */
const AT = GATE_HOUR;
/** Inside the first window of 2027: the phone freezes by itself (§5 ter). */
const IN_A_WINDOW = new Date('2027-04-17T10:00:00.000Z');
/** When the questions come back after that window — what the Worker says in « silence ». */
const REOPEN = '2027-04-18T18:00:00.000Z';
/** A string of the kit as the pages show it (src/lib/strings.ts, `t`: typographic apostrophes). */
const KIT = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, unknown>;
const kitString = (key: string): string => {
  const value = KIT[key];
  if (typeof value !== 'string') throw new Error(`design/strings.json: no string ${key}`);
  return value.replace(/'/g, '’');
};
/** The line a frozen turn shows, as the sheet composes it (src/components/ChatSheet.astro). */
const REOPEN_LINE = kitString('silence.chat.local').replace(
  '{reopenTime}',
  formatReopenTimeFr(new Date(REOPEN)),
);
/** The line of a stop thrown by hand. */
const PAUSED_LINE = kitString('silence.paused');

/** The words of a text as the checks compare them: no accent, no case, four letters at least. */
function wordsOf(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 4);
}

/** Every file under a folder, for the age of the sources. */
function filesUnder(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const at = join(dir, name);
    return statSync(at).isDirectory() ? filesUnder(at) : [at];
  });
}

type Scenario =
  'two' | 'ai-offered' | 'local' | 'broken' | 'other-book' | 'silence' | 'markup' | 'words';

async function runEngine(name: string, origin: string, manifest: Manifest): Promise<Outcome> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const { out, check } = checker(name);
  const corpus = manifest.meta.corpus_version;
  const pageInNode = loadPage();

  const sim: { gists: Scenario } = { gists: 'two' };
  // The sentences the sheet is shown, and the words they hold: shared with the unit tests of the
  // words (scripts/terms-fixtures.ts), which read them against data/2026/terms.json as it stands.
  const inBase = plainSentence;
  const sentence = (id: string): string => `Le programme prévoit une phrase d’essai, pour ${id}.`;
  const gistsAnswer = (ids: readonly string[]): { status?: number; body: unknown } => {
    const all = ids.map((id) => ({ id, text: inBase(id) }));
    switch (sim.gists) {
      case 'two':
        // The third measure has no sentence: it keeps its link alone. No AI: `ai` is false.
        return { body: { kind: 'gists', corpus, gists: all.slice(0, 2), ai: false } };
      case 'ai-offered':
        // A Worker that would say an AI is available: the page of this build has nothing to
        // offer it with, and must ask nothing of it.
        return { body: { kind: 'gists', corpus, gists: all, ai: true } };
      case 'local':
        return { body: { kind: 'local' } };
      case 'broken':
        return { status: 500, body: { error: 'Service indisponible' } };
      case 'other-book':
        return { body: { kind: 'gists', corpus: 'ffffffffffffffff', gists: all, ai: false } };
      case 'silence':
        return { body: { kind: 'silence', reopen: REOPEN } };
      case 'words':
        // Invented sentences that use two terms of data/2026/terms.json, in this order.
        return {
          body: {
            kind: 'gists',
            corpus,
            gists: all.map((gist) => ({
              ...gist,
              text: wordySentence(gist.id),
            })),
            ai: false,
          },
        };
      case 'markup':
        return {
          body: {
            kind: 'gists',
            corpus,
            gists: all.map((gist) => ({
              ...gist,
              text: `<img src=x onerror=alert(1)> ${gist.text}`,
            })),
            ai: false,
          },
        };
    }
  };

  const browser = await type.launch();
  // What the run asked of anyone, from every context — read once all of them are done (§10).
  const escaped: string[] = [];
  /** The main page's requests and posts: the accounting of the conversation. */
  const requested: string[] = [];
  const posted = { gists: [] as string[], chat: [] as string[] };
  const violations: string[] = [];
  const dialogs: string[] = [];
  /** Every request of every context: what it carried, to be read for the words typed. */
  const traffic: { from: string; url: string; headers: Record<string, string>; body: string }[] =
    [];
  const sockets: string[] = [];
  /** Bodies sent to /api/gists that the Worker's own reader refuses, and requests not read. */
  const refused: string[] = [];
  const unread: string[] = [];
  /** Calls to the Worker other than /api/gists, from the pages that are not the conversation. */
  const elsewhere: string[] = [];
  /** Every word typed so far, in any field of any page of the run. */
  const typed = new Set<string>();
  const typing = (question: string): void => {
    for (const word of wordsOf(question)) typed.add(word);
  };
  let lastAsked = '';
  try {
    const watched = new WeakSet<Page>();
    /** The listeners of a page — the first of its context, or one it opened. */
    const watch = (seen: Page, from: string, errors: string[]): void => {
      if (watched.has(seen)) return;
      watched.add(seen);
      seen.on('dialog', (dialog) => {
        dialogs.push(`${from}: ${dialog.message()}`);
        void dialog.dismiss();
      });
      // Firefox writes « Content-Security-Policy », Chromium « requires 'TrustedHTML' »: the
      // event counted below is the one that does not depend on the wording.
      seen.on('console', (message) => {
        if (
          /content[- ]security[- ]policy|refused to|requires '?trusted|TrustedHTML|TrustedScript/i.test(
            message.text(),
          )
        ) {
          violations.push(`${from}: ${message.text()}`);
        }
      });
      seen.on('pageerror', (error) => errors.push(`${from}: page error: ${error.message}`));
    };
    /**
     * Guards a context, and opens its page: the clock is held at `at` and `/flags.json` says that
     * hour (and the switch, when one is thrown); every request of every page is routed and
     * recorded; every socket is refused; `rewrite` serves a file of the build otherwise.
     */
    const guard = async (
      context: BrowserContext,
      from: string,
      options: {
        at?: Date;
        override?: 'auto' | 'on';
        rewrite?: (path: string) => string | null;
        errors?: string[];
      } = {},
    ): Promise<Page> => {
      const at = options.at ?? AT;
      await context.clock.setFixedTime(at);
      await context.addInitScript(
        "window.__refusals = []; document.addEventListener('securitypolicyviolation', (event) => { window.__refusals.push(event.violatedDirective + ' ' + event.blockedURI); });",
      );
      await context.routeWebSocket(/.*/, (socket) => {
        sockets.push(`${from}: ${socket.url()}`);
        void socket.close();
      });
      await context.route('**/*', async (route: Route) => {
        const request = route.request();
        const url = request.url();
        try {
          const body = request.postData() ?? '';
          traffic.push({ from, url, headers: await request.allHeaders(), body });
          if (from === 'main') requested.push(url);
          const fulfil = (answer: { status?: number; body: unknown }): Promise<void> =>
            route.fulfill({
              status: answer.status ?? 200,
              contentType: 'application/json; charset=utf-8',
              body: typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body),
            });
          if (url.startsWith(`${origin}/`)) {
            const where = new URL(url).pathname;
            if (where === '/flags.json') {
              await route.fulfill({
                status: 200,
                contentType: 'application/json; charset=utf-8',
                headers: { date: at.toUTCString(), 'cache-control': 'no-store' },
                body:
                  options.override === undefined
                    ? readFileSync(join(ROOT, 'flags.json'), 'utf8')
                    : JSON.stringify({ silence_override: options.override }),
              });
              return;
            }
            const rewritten = options.rewrite?.(where) ?? null;
            if (rewritten !== null) {
              await fulfil({ body: rewritten });
              return;
            }
            if (where === '/api/gists') {
              if (from === 'main') posted.gists.push(body);
              // Read as the Worker reads it (src/worker/index.ts): what it refuses gets a 400.
              let read: unknown = null;
              try {
                read = JSON.parse(body) as unknown;
              } catch {
                read = null;
              }
              const asked = request.method() === 'POST' ? parseGistsRequest(read) : null;
              if (asked === null || asked.corpus !== corpus) {
                refused.push(`${from}: ${request.method()} ${body.slice(0, 160)}`);
                await route.fulfill({ status: 400, body: '' });
                return;
              }
              await fulfil(gistsAnswer(asked.ids));
              return;
            }
            if (where.startsWith('/api/')) {
              // Never expected — /api/chat or any other address of the Worker, whatever its
              // query or its last slash. Answered as a model would.
              (from === 'main' ? posted.chat : elsewhere).push(
                `${from}: ${request.method()} ${url} ${body.slice(0, 120)}`,
              );
              await fulfil({
                body: {
                  kind: 'explain',
                  corpus,
                  sentences: ['Une explication que personne ne doit voir.'],
                },
              });
              return;
            }
            await route.continue();
            return;
          }
          if (url.startsWith(OFFICIAL) && request.resourceType() === 'document') {
            await route.fulfill({
              status: 200,
              contentType: 'text/html',
              body: '<title>stub</title>',
            });
            return;
          }
          escaped.push(`${from}: ${url}`);
          await route.abort();
        } catch (error) {
          // A request the stand-ins cannot read is a finding, never a crash of the run.
          unread.push(`${from}: ${url}: ${error instanceof Error ? error.message : String(error)}`);
          await route.abort().catch(() => undefined);
        }
      });
      const errors = options.errors ?? violations;
      context.on('page', (opened) => {
        watch(opened, from, errors);
      });
      const first = await context.newPage();
      watch(first, from, errors);
      return first;
    };
    /** What the policy refused on a page, as the page itself was told. */
    const refusalsOf = async (on: Page, from: string): Promise<string[]> =>
      (
        JSON.parse(await on.evaluate<string>('JSON.stringify(window.__refusals ?? [])')) as string[]
      ).map((refusal) => `${from}: ${refusal}`);
    /** What is kept on the phone: both storages, their values, the bases, the caches. */
    const stores = (on: Page): Promise<string> =>
      on.evaluate<string>(
        "(async () => JSON.stringify({ local: Object.entries(localStorage), session: Object.entries(sessionStorage), bases: typeof indexedDB.databases === 'function' ? (await indexedDB.databases()).map((base) => base.name) : [], caches: typeof caches === 'undefined' ? [] : await caches.keys() }))()",
      );
    /** What a turn says in our own words: not the question, nor the book's titles and first words, nor what an AI wrote. */
    const oursOf = (on: Page, selector: string): Promise<string> =>
      on.evaluate<string>(
        `(() => { const node = document.querySelector(${JSON.stringify(selector)})?.cloneNode(true); if (!node) return ''; for (const part of node.querySelectorAll('.c-question, [data-programme], [data-generated-by], .sources a')) part.remove(); return node.textContent ?? ''; })()`,
      );
    /** The words typed that a text holds. */
    const typedIn = (text: string): string[] => {
      const words = new Set(wordsOf(text));
      return [...typed].filter((word) => words.has(word));
    };
    /** A body as JSON, or nothing: a body the page should not have sent fails a check, not the run. */
    const parsed = (body: string | undefined): { corpus?: unknown; ids?: string[] } => {
      try {
        return JSON.parse(body ?? '{}') as { corpus?: unknown; ids?: string[] };
      } catch {
        return {};
      }
    };

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await guard(context, 'main');
    const ours = (selector: string): Promise<string> => oursOf(page, selector);
    const text = (selector: string): Promise<string> =>
      page.evaluate<string>(
        `document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`,
      );
    const count = (selector: string): Promise<number> =>
      page.evaluate<number>(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
    const LAST = '#chat-thread .c-turn:last-child';
    const FOUND_NOTHING = /Rien trouvé avec ces mots\./;
    const settled = `document.querySelector(${JSON.stringify(LAST)})?.getAttribute('aria-busy') === 'false'`;
    const ask = async (question: string): Promise<string> => {
      lastAsked = question;
      typing(question);
      const turns = await count('#chat-thread .c-turn');
      await page.fill('#chat-q', question);
      await page.press('#chat-q', 'Enter');
      await until(
        page,
        `document.querySelectorAll('#chat-thread .c-turn').length === ${String(turns + 1)}`,
      );
      await until(page, settled);
      return text(LAST);
    };

    // --- 1. before any gesture
    await page.goto(`${origin}/`);
    await until(page, "!document.querySelector('#ask').disabled");
    const stored = await stores(page);
    const hint = await text('#search-hint');
    check(
      'the notice says what asking gives, and that an AI wrote it',
      /phrases écrites d’avance par une IA/.test(hint) && /reste sur ce téléphone/.test(hint),
      hint,
    );
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    check(
      'no model is named on the page, and none is said to explain',
      !namesAModel(hint) && !namesAModel(await text('body')) && !/Cloudflare/.test(hint),
      hint,
    );
    const policy = [...policyProblems(metaPolicy(html)), ...beforePolicy(html)];
    check(
      'the policy of the page names nobody but us, read directive by directive where a browser obeys it',
      policy.length === 0,
      policy.join(' | '),
    );
    check(
      'the offer of an explanation is not in the page at all',
      (await count('#chat-offer')) === 0 &&
        (await count('#chat-ai-stop')) === 0 &&
        (await count('#chat-ai-start')) === 0 &&
        !/chat-offer|data-offer/.test(html),
    );
    check(
      '« Demander » is the one button of the field',
      (await page.locator('#search button').count()) === 1,
    );
    check(
      'the sheet is in the page, closed',
      await page.evaluate<boolean>("document.querySelector('#chat-sheet').open === false"),
    );
    await page.focus('#q');
    await page.waitForTimeout(400);
    // By its name in the build: a sheet folded into the field's script would leave no request
    // named after it, and a check on a name alone would pass (review 19).
    const sheetScripts = readdirSync(join(ROOT, '_astro')).filter((file) =>
      /^chat\.[\w-]+\.js$/.test(file),
    );
    check(
      'the build holds one script for the sheet',
      sheetScripts.length === 1,
      sheetScripts.join(' '),
    );
    const sheetScript = `/_astro/${sheetScripts[0] ?? 'none'}`;
    check(
      'the script of the sheet is not fetched with the page',
      !requested.some((url) => url.endsWith(sheetScript) || /\/_astro\/chat\./.test(url)),
    );
    check('before any gesture nothing is asked of anyone but us', escaped.length === 0);

    // --- 2. typing sends nothing; the gesture sends identifiers — not the sentence
    // Three measures stand close enough to the best one for this question (src/lib/chat-local.ts,
    // `MIN_SHARE_OF_BEST`), and none of its words is one the sheet explains.
    const QUESTION = QUIET_QUESTION;
    typing(QUESTION);
    await page.locator('#q').pressSequentially(QUESTION, { delay: 20 });
    await page.waitForTimeout(900);
    /** Every request of the run that carried a word typed — in its address, a header, its body. */
    const carrying = (): string[] =>
      traffic.flatMap(({ from, url, headers, body }) => {
        let address = url;
        try {
          address = decodeURIComponent(url);
        } catch {
          address = url;
        }
        const found = typedIn([address, ...Object.values(headers), body].join(' '));
        return found.length === 0 ? [] : [`${from}: ${url.slice(0, 80)} (${found.join(', ')})`];
      });
    check(
      'typing sends the words nowhere',
      carrying().length === 0 && posted.gists.length === 0 && posted.chat.length === 0,
    );
    check(
      'typing leaves nothing in the address',
      !page.url().includes('#') && typedIn(decodeURIComponent(page.url())).length === 0,
      page.url(),
    );
    await page.click('#ask');
    await until(page, "document.querySelector('#chat-sheet').open");
    await until(page, settled);
    check('« Demander » sends once, to /api/gists', posted.gists.length === 1);
    check(
      'the script of the sheet is fetched at the first press, once',
      requested.filter((url) => url.endsWith(sheetScript)).length === 1,
    );
    const gistsBody = posted.gists[0] ?? '{}';
    const sent = parsed(gistsBody);
    check(
      'the request is the state of the book and measures — and nothing else',
      JSON.stringify(Object.keys(sent).sort()) === '["corpus","ids"]' && sent.corpus === corpus,
      JSON.stringify(Object.keys(sent)),
    );
    const rows = pageInNode(QUESTION).rows;
    check(
      'what leaves is what the search of the page ranks best: the same measures, in order',
      JSON.stringify(sent.ids) === JSON.stringify(rows) && rows.length === 3,
      JSON.stringify(sent.ids),
    );
    check(
      'the sentence typed is not in it, nor a word of it',
      !/zorglub|montcuq|infirmi|nuit|pital|moi/i.test(gistsBody),
      gistsBody.slice(0, 160),
    );

    // --- 3. the sheet: the frame, the sentences, their label, their links
    check(
      'the sheet says « Site non officiel. » in its frame',
      /Site non officiel\./.test(await text('#chat-sheet .c-head')),
    );
    check(
      'the sentences come under their title, with who wrote and checked them: an AI',
      /Mesures trouvées/.test(await text(`${LAST} .c-gists h3`)) &&
        /^Phrases écrites et vérifiées par une IA/.test(await text(`${LAST} .c-gists .c-badge`)),
      await text(`${LAST} .c-gists`),
    );
    check(
      'next to the label, one link says how the sentences are made',
      (await page
        .locator(`${LAST} .c-gists .c-badge a[href="/methodologie/#demander"]`)
        .textContent()) === 'Comment c’est fabriqué',
    );
    check(
      'the label claims no reading by a person',
      !/éditeur|relu|humain|personne/i.test(await text(`${LAST} .c-gists .c-badge`)),
      await text(`${LAST} .c-gists .c-badge`),
    );
    const shown = await page.evaluate<{ gist: string; href: string }[]>(
      `Array.from(document.querySelectorAll(${JSON.stringify(`${LAST} .c-gists .c-row`)})).map((row) => ({ gist: row.querySelector(':scope > p:not(.sources)')?.textContent ?? '', href: row.querySelector('.sources a')?.href ?? '' }))`,
    );
    check(
      'two sentences are shown as the base holds them, and the third measure keeps its link alone',
      shown.length === 3 &&
        shown[0]?.gist === sentence(rows[0] ?? '') &&
        shown[1]?.gist === sentence(rows[1] ?? '') &&
        shown[2]?.gist === '',
      JSON.stringify(shown.map((row) => row.gist)),
    );
    check(
      'every measure shown links to the official page',
      shown.every((row) => row.href.startsWith(`${OFFICIAL}/`)),
      shown.map((row) => row.href).join(' '),
    );

    // --- 4. no AI: nothing offers one, nothing asks one — whatever the Worker says
    check(
      'no block of the thread speaks of an AI that would explain',
      (await count('#chat-thread .c-ai')) === 0 && (await count('#chat-thread .c-offer')) === 0,
    );
    sim.gists = 'ai-offered';
    const beforeOffered = posted.gists.length;
    const offered = await ask('et la règle verte ?');
    // The only scenario where the Worker says an AI is there: it must have been asked, and its
    // sentences drawn — or the absences below would hold for a question that asks nothing.
    check(
      'a Worker that says an AI is available is asked, and its sentences are drawn',
      posted.gists.length === beforeOffered + 1 &&
        (await count(`${LAST} .c-gists .c-row > p[data-generated-by="ai"]`)) >= 1,
      offered.slice(0, 200),
    );
    check(
      'a Worker that says an AI is available changes nothing: no offer, no explanation',
      (await count('#chat-thread .c-ai')) === 0 &&
        (await count('#chat-thread [data-offer]')) === 0 &&
        !namesAModel(offered) &&
        !/Une explication que personne ne doit voir/.test(offered),
      offered.slice(0, 200),
    );
    await page.waitForTimeout(600);
    check('nothing was asked of /api/chat', posted.chat.length === 0, posted.chat.join(' | '));
    sim.gists = 'two';

    // --- 5. every other state is a normal one
    for (const [scenario, label] of [
      ['local', 'the route closed'],
      ['broken', 'the Worker broken'],
      ['other-book', 'another state of the book'],
    ] as const) {
      sim.gists = scenario;
      const shownText = await ask('et les retraites ?');
      check(
        `${label}: the links stand alone, and nothing says a word of failure`,
        (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
          (await count(`${LAST} .c-gists .c-row > p:not(.sources)`)) === 0 &&
          !FAILURE.test(await ours(LAST)),
        shownText.slice(0, 160),
      );
    }
    sim.gists = 'silence';
    const silent = await ask('et les retraites ?');
    // The hour the Worker gave, as the sheet writes it — not the template's own word.
    check(
      'electoral silence: the sheet says when questions come back — the hour the Worker gave — and shows no sentence',
      silent.includes(REOPEN_LINE) &&
        /dimanche 18 avril, 20\sh/.test(silent) &&
        (await count(`${LAST} .c-gists`)) === 0 &&
        !FAILURE.test(await ours(LAST)),
      silent.slice(0, 200),
    );

    // --- 5 bis. a file of titles the script cannot read: the question never searches for ever.
    // A browser that had searched before 23/11/2026 kept the titles of then for a year, without
    // `book_words`, and « Demander » showed « On cherche dans le programme… » for ever (R73). The
    // files are named by what they hold now — such a file is never asked for again —, and
    // whatever fails once the question is on the screen leaves the turn whole: nothing found,
    // nothing of ours, no word of failure. The error is reported to the console, and only there.
    {
      // Guarded like every context: its error path is the one only this page runs, and what it
      // could send is read with the rest (review 19).
      const stale = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const reported: string[] = [];
      sim.gists = 'local';
      const kept = await guard(stale, 'stale titles', {
        errors: reported,
        rewrite: (where) => {
          if (!/^\/data\/meta-[0-9a-f]{16}\.json$/.test(where)) return null;
          const titles = JSON.parse(readFileSync(join(ROOT, where), 'utf8')) as Record<
            string,
            unknown
          >;
          delete titles['book_words'];
          return JSON.stringify(titles);
        },
      });
      await kept.goto(`${origin}/`);
      await until(kept, "!document.querySelector('#ask').disabled");
      typing('et les retraites ?');
      await kept.fill('#q', 'et les retraites ?');
      await kept.click('#ask');
      const whole = `document.querySelector(${JSON.stringify(LAST)})?.getAttribute('aria-busy') === 'false'`;
      let settledThere = true;
      try {
        await until(kept, whole, 8_000);
      } catch {
        settledThere = false;
      }
      const shownThere = await kept.evaluate<string>(
        `document.querySelector(${JSON.stringify(LAST)})?.textContent ?? ''`,
      );
      check(
        'a file of titles the script cannot read: the turn settles, nothing found, no word of failure',
        settledThere &&
          !/On cherche dans le programme/.test(shownThere) &&
          FOUND_NOTHING.test(shownThere) &&
          (await kept.locator(`${LAST} .c-plain, ${LAST} .c-gists`).count()) === 0 &&
          !FAILURE.test(await oursOf(kept, LAST)),
        shownThere.slice(0, 200),
      );
      check(
        '…and the error is reported to the console, not to the reader',
        reported.some((message) => /iterable|undefined/i.test(message)),
        reported.join(' | ').slice(0, 200),
      );
      // A word asked about there: no explanation of ours stands above « Rien trouvé » either —
      // the turn the error leaves is charged (B12).
      const meaning = 'c’est quoi la t2a ?';
      typing(meaning);
      await kept.fill('#chat-q', meaning);
      await kept.press('#chat-q', 'Enter');
      let meaningSettled = true;
      try {
        await until(kept, "document.querySelectorAll('#chat-thread .c-turn').length === 2", 8_000);
        await until(kept, whole, 8_000);
      } catch {
        meaningSettled = false;
      }
      check(
        '…and a word asked about there is not explained above « Rien trouvé »',
        meaningSettled && (await kept.locator(`${LAST} .c-terms`).count()) === 0,
        (await oursOf(kept, LAST)).slice(0, 200),
      );
      violations.push(...(await refusalsOf(kept, 'stale titles')));
      check('the page of the stale titles opened no other', stale.pages().length === 1);
      await stale.close();
    }

    // --- 5 ter. the phone's own freeze (D16.16): decided on the phone, before anything is sent.
    // The Worker's « silence » above answers once the measures were named to it; this one comes
    // first — inside a window of 2027, and under a stop thrown by hand — and nothing at all is
    // sent. Without it, a sheet that forgot to ask the calendar passed (review 19).
    for (const [label, at, override, expected] of [
      ['inside a window of 2027', IN_A_WINDOW, 'auto', REOPEN_LINE],
      ['under a stop thrown by hand', AT, 'on', PAUSED_LINE],
    ] as const) {
      const from = `freeze, ${label}`;
      const held = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const frozen = await guard(held, from, { at, override });
      await frozen.goto(`${origin}/`);
      await until(frozen, "!document.querySelector('#ask').disabled");
      typing('et les retraites ?');
      await frozen.fill('#q', 'et les retraites ?');
      await frozen.click('#ask');
      let settledThere = true;
      try {
        await until(frozen, "document.querySelector('#chat-sheet').open");
        await until(
          frozen,
          `document.querySelector(${JSON.stringify(LAST)})?.getAttribute('aria-busy') === 'false'`,
        );
      } catch {
        settledThere = false;
      }
      const said = await frozen.evaluate<string>(
        `document.querySelector(${JSON.stringify(LAST)})?.textContent ?? ''`,
      );
      check(
        `the phone's own freeze, ${label}: one sentence of ours, nothing of the book, nothing sent`,
        settledThere &&
          said.includes(expected) &&
          (await frozen.locator(`${LAST} .c-gists, ${LAST} .c-terms, ${LAST} .c-plain`).count()) ===
            0 &&
          traffic.every((sent) => sent.from !== from || !sent.url.includes('/api/')) &&
          !FAILURE.test(await oursOf(frozen, LAST)),
        said.slice(0, 200),
      );
      violations.push(...(await refusalsOf(frozen, from)));
      check(`${from}: the page opened no other`, held.pages().length === 1);
      await held.close();
    }

    // --- 6. a sentence of the base is text
    sim.gists = 'markup';
    const marked = await ask('et les retraites ?');
    check(
      'markup in a sentence creates no element',
      (await count('#chat-thread img')) === 0 && /<img src=x/.test(marked) && dialogs.length === 0,
    );
    sim.gists = 'two';

    // --- 7. the explained words: found on the phone, written ahead, labelled
    const TERMS = `${LAST} .c-terms:not(.c-asked)`;
    const ASKED = `${LAST} .c-terms.c-asked`;
    /** What a block of words is expected to show: these terms, all open, or all closed. */
    const openAs = (terms: readonly string[]): { term: string; open: boolean }[] =>
      terms.map((term) => ({ term, open: true }));
    const closedAs = (terms: readonly string[]): { term: string; open: boolean }[] =>
      terms.map((term) => ({ term, open: false }));
    const termsShown = (scope: string): Promise<{ term: string; open: boolean }[]> =>
      page.evaluate<{ term: string; open: boolean }[]>(
        `Array.from(document.querySelectorAll(${JSON.stringify(`${scope} details`)})).map((d) => ({ term: d.querySelector('summary')?.textContent ?? '', open: d.open }))`,
      );
    /** True when, in the last turn, the first block stands before the second — and neither holds the other. */
    const before = (first: string, second: string): Promise<boolean> =>
      page.evaluate<boolean>(
        `(() => { const turn = document.querySelector(${JSON.stringify(LAST)}); const a = turn?.querySelector(${JSON.stringify(first)}); const b = turn?.querySelector(${JSON.stringify(second)}); return !!a && !!b && !a.contains(b) && !b.contains(a) && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0; })()`,
      );
    const plainFiles = (): string[] => requested.filter((url) => /\/data\/clair-/.test(url));
    const wordFiles = (): string[] => requested.filter((url) => /\/data\/mots-/.test(url));
    check(
      'the texts of « En clair » and the wordings of the words are each fetched once, by their names alone',
      plainFiles().length === 1 &&
        /\/data\/clair-[0-9a-f]{16}\.json$/.test(plainFiles()[0] ?? '') &&
        wordFiles().length === 1 &&
        /\/data\/mots-[0-9a-f]{16}\.json$/.test(wordFiles()[0] ?? ''),
      [...plainFiles(), ...wordFiles()].join(' '),
    );
    const built = builtTexts();
    check(
      'a turn whose question and sentences use no explained word shows no block of words',
      (await count('#chat-thread .c-terms')) === 0,
    );
    sim.gists = 'words';
    const sentBefore = requested.length;
    const withWords = await ask('et l’hôpital ?');
    check(
      'the words of the sentences come under their title, with who wrote and checked them: an AI',
      (await text(`${TERMS} h3`)) === 'Des mots expliqués' &&
        (await text(`${TERMS} .c-badge`)) === 'Explications écrites et vérifiées par une IA',
      (await text(TERMS)).slice(0, 160),
    );
    const closed = await termsShown(TERMS);
    check(
      'each term of the sentences is there once, in the order they use them, closed',
      JSON.stringify(closed) === JSON.stringify(closedAs(sheetCase('et l’hôpital ?').below)) &&
        (await count(ASKED)) === 0,
      JSON.stringify(closed),
    );
    check(
      'the words of the sentences stand under the sentences, never above them',
      await before('.c-gists', '.c-terms:not(.c-asked)'),
    );
    check(
      'no explained word says a word of failure',
      !FAILURE.test(await ours(LAST)),
      withWords.slice(0, 160),
    );
    const asked = requested.length;
    await page.click(`${TERMS} details:first-of-type summary`);
    await until(
      page,
      `document.querySelector(${JSON.stringify(`${TERMS} details`)})?.open === true`,
    );
    // Its text comes with the first word opened: in place, under the line just pressed.
    await until(
      page,
      `document.querySelector(${JSON.stringify(`${TERMS} details`)})?.dataset.filled !== undefined`,
    );
    const explanation = await text(`${TERMS} details:first-of-type p`);
    const meaning = built.meanings['moratoire'] ?? '';
    check(
      'pressing a word opens its explanation: a short text, general, with a mark a machine can read',
      meaning !== '' &&
        explanation === meaning &&
        explanation.length <= 200 &&
        !/programme/i.test(explanation) &&
        (await count(`${TERMS} details:first-of-type p[data-generated-by="ai"]`)) ===
          (built.examples['moratoire'] === undefined ? 1 : 2),
      explanation,
    );
    await page.waitForTimeout(300);
    const textFiles = requested.slice(asked);
    check(
      'the first word opened asks for the texts of the words — two files, the same whatever the word — and for nothing else',
      textFiles.length === 2 &&
        textFiles.every((url) => /\/data\/mots-[0-9a-f]{16}-(?:sens|exemples)\.json$/.test(url)) &&
        new Set(textFiles).size === 2 &&
        posted.chat.length === 0,
      textFiles.join(' '),
    );
    check(
      'finding the words sent nothing but the measures: one request for the whole turn',
      requested.slice(sentBefore, asked).length === 1 &&
        /\/api\/gists$/.test(requested[sentBefore] ?? ''),
      requested.slice(sentBefore, asked).join(' '),
    );
    // A second word: its text is already here, and nothing is asked of anyone.
    const opened = requested.length;
    const SECOND = `${TERMS} details:nth-of-type(2)`;
    await page.click(`${SECOND} summary`);
    await until(
      page,
      `(() => { const item = document.querySelector(${JSON.stringify(SECOND)}); return !!item && item.open && item.dataset.filled !== undefined; })()`,
    );
    await page.waitForTimeout(300);
    check(
      'a second word opened asks for nothing: its text was already on the phone',
      requested.length === opened && posted.chat.length === 0,
      requested.slice(opened).join(' '),
    );
    await page.click(`${SECOND} summary`);
    await until(page, `document.querySelector(${JSON.stringify(SECOND)})?.open === false`);
    check(
      'every sentence written ahead carries the mark a machine can read — and no link does',
      (await count(`${LAST} .c-gists .c-row > p[data-generated-by="ai"]`)) ===
        (await count(`${LAST} .c-gists .c-row > p:not(.sources)`)) &&
        (await count(`${LAST} .c-gists .c-row > p[data-generated-by="ai"]`)) >= 1 &&
        (await count(`${LAST} .sources[data-generated-by]`)) === 0,
    );
    // The question holds a term without asking what it means: the measures come first.
    await ask('et la t2a à l’hôpital ?');
    const held = await termsShown(TERMS);
    check(
      'a term the question merely holds comes first among the words, under the measures, closed',
      JSON.stringify(held) ===
        JSON.stringify(closedAs(sheetCase('et la t2a à l’hôpital ?').below)) &&
        (await count(ASKED)) === 0 &&
        (await before('.c-gists', '.c-terms:not(.c-asked)')),
      JSON.stringify(held),
    );
    const kept = await termsShown('#chat-thread .c-turn:nth-last-child(2) .c-terms:not(.c-asked)');
    check(
      'a turn drawn again keeps the word its reader opened',
      kept[0]?.term === 'moratoire' && kept[0].open && kept[1]?.open === false,
      JSON.stringify(kept),
    );
    // A turn is put in the thread once, then brought up to date where it stands. It used to be
    // put in three times as it settled, and the turn before it once more: a screen reader that
    // follows the log would have been told as many times (personas, 15/11/2026).
    await page.evaluate(
      `(() => { window.__turnsAdded = 0; new MutationObserver((records) => { for (const record of records) for (const node of record.addedNodes) if (node.nodeName === 'ARTICLE') window.__turnsAdded += 1; }).observe(document.querySelector('#chat-thread'), { childList: true }); })()`,
    );
    await ask('et les lits de l’hôpital ?');
    const added = await page.evaluate<number>('window.__turnsAdded');
    check(
      'a question puts one turn in the thread, once — no turn is taken out and put in again',
      added === 1,
      String(added),
    );
    const titled = await page.evaluate<boolean>(
      `(() => { const scroll = document.querySelector('#chat-scroll'); const turns = Array.from(document.querySelectorAll('#chat-thread .c-turn')); const names = turns.map((turn) => turn.getAttribute('aria-labelledby')); return scroll.getAttribute('role') === 'group' && scroll.getAttribute('aria-label') === 'Conversation' && turns.length > 1 && turns.every((turn, at) => !!names[at] && turn.querySelector('.c-question')?.id === names[at]) && new Set(names).size === turns.length; })()`,
    );
    check('what scrolls has a name, and each turn is named after its own question', titled);
    /** Every link of the thread opens beside the conversation, says so, and tells the other site nothing. */
    const linksBeside = async (at: string): Promise<void> => {
      const links = await page.evaluate<
        { href: string; target: string; rel: string; says: string | null }[]
      >(
        `Array.from(document.querySelectorAll('#chat-thread a')).map((a) => ({ href: a.getAttribute('href'), target: a.target, rel: a.rel, says: a.getAttribute('aria-describedby') }))`,
      );
      const astray = links.filter(
        (link) =>
          link.target !== '_blank' ||
          link.rel !== 'noopener noreferrer' ||
          link.says !== 'chat-new-tab',
      );
      check(
        `every link of the sheet opens beside the conversation, says so, and tells the other site nothing (${at})`,
        links.length >= 3 &&
          astray.length === 0 &&
          (await page.evaluate<string>(
            "document.querySelector('#chat-new-tab')?.textContent ?? ''",
          )) === 'Ouvre un nouvel onglet.',
        JSON.stringify(astray.slice(0, 2)),
      );
    };
    await linksBeside('the sentences and the words');
    // The question asks what a word means: that word is what was asked — first, and open.
    await ask('c’est quoi la t2a à l’hôpital ?');
    const named = await termsShown(ASKED);
    const rest = await termsShown(TERMS);
    check(
      'a word the question asks about stands above the measures, under its own title, open',
      (await text(`${ASKED} h3`)) === 'Les mots de ta question' &&
        (await text(`${ASKED} .c-badge`)) === 'Explications écrites et vérifiées par une IA' &&
        JSON.stringify(named) ===
          JSON.stringify(openAs(sheetCase('c’est quoi la t2a à l’hôpital ?').asked)) &&
        (await before('.c-terms.c-asked', '.c-gists')),
      JSON.stringify(named),
    );
    check(
      '…and it is not explained twice: the other words stay under the measures, closed',
      JSON.stringify(rest) ===
        JSON.stringify(closedAs(sheetCase('c’est quoi la t2a à l’hôpital ?').below)) &&
        (await before('.c-gists', '.c-terms:not(.c-asked)')),
      JSON.stringify(rest),
    );
    // No sentence on the screen: the question alone is read — still on the phone.
    sim.gists = 'local';
    await ask('c’est quoi un moratoire à l’hôpital ?');
    const alone = await termsShown(ASKED);
    check(
      'the route closed: the links stand alone, and the word of the question is still explained',
      (await count(`${LAST} .c-gists .c-row > p:not(.sources)`)) === 0 &&
        JSON.stringify(alone) ===
          JSON.stringify(openAs(sheetCase('c’est quoi un moratoire à l’hôpital ?').asked)) &&
        (await count(TERMS)) === 0,
      JSON.stringify(alone),
    );
    // One sentence of ours and nothing else: no word is explained under it.
    sim.gists = 'silence';
    await ask('c’est quoi la t2a à l’hôpital ?');
    check(
      'electoral silence: no word is explained',
      (await count(`${LAST} .c-terms`)) === 0 && (await count(`${LAST} details`)) === 0,
    );
    sim.gists = 'words';
    // A refusal that asks what a word means: no explanation of ours stands over a vote or a
    // charge. (A question that merely holds a word never gets it explained: asked that way, the
    // check could not fail — review 19.)
    for (const question of [
      'pour qui voter, c’est quoi le smic ?',
      'Mélenchon antisémite, c’est quoi l’antisémitisme ?',
    ]) {
      const vote = await ask(question);
      check(
        `« ${question} »: one sentence of ours, and no word explained`,
        /Ici, on ne parle que du programme/.test(vote) && (await count(`${LAST} .c-terms`)) === 0,
        vote.slice(0, 160),
      );
    }
    sim.gists = 'two';

    // --- 7 bis. a question about the site: the site answers for itself, and sends nothing
    const beforeAbout = [posted.gists.length, requested.length];
    const about = await ask('Qui a écrit ces réponses ?');
    check(
      'a question about the site gets what the site says of itself: who makes it, who wrote the sentences',
      (await text(`${LAST} .c-about h3`)) === 'Sur ce site' &&
        /projet militant indépendant/.test(about) &&
        /Une IA les a écrites, puis vérifiées elle-même contre le livre\. Personne ne les a relues une à une\./.test(
          about,
        ) &&
        /aucune IA ne répond en direct/.test(about),
      about.slice(0, 300),
    );
    check(
      '…with where to read more, and no measure next to it',
      (await page.locator(`${LAST} .c-about a[href="/a-propos/"]`).count()) === 1 &&
        (await page.locator(`${LAST} .c-about a[href="/methodologie/#demander"]`).count()) === 1 &&
        (await page.locator(`${LAST} .c-about a[href="/confidentialite/#demander"]`).count()) ===
          1 &&
        (await count(`${LAST} .c-gists`)) === 0 &&
        (await count(`${LAST} .c-terms`)) === 0,
    );
    check(
      '…and nothing was sent for it',
      posted.gists.length === beforeAbout[0] && requested.length === beforeAbout[1],
      requested.slice(beforeAbout[1]).join(' '),
    );
    check('a question about the site says no word of failure', !FAILURE.test(await ours(LAST)));
    const paid = await ask('Vous êtes payés par la France insoumise ?');
    check(
      'the question a hostile visitor tries first gets the same answer — not a measure that shares a word',
      (await count(`${LAST} .c-about`)) === 1 &&
        (await count(`${LAST} .c-gists`)) === 0 &&
        /hors des équipes de campagne/.test(paid),
      paid.slice(0, 200),
    );

    // --- 7 ter. what the second review photographed (15/11/2026): a charge with no verb, a
    // vote asked with a name, the site asked about in other words — and a position, which is
    // a question about the book
    const beforeCharges = posted.gists.length;
    for (const charge of ['Mélenchon antisémite ?', 'Mélanchon est un dictateur']) {
      const refused = await ask(charge);
      check(
        `« ${charge} » gets no measure`,
        /Ici, on ne parle que du programme/.test(refused) &&
          (await count(`${LAST} .c-gists`)) === 0,
        refused.slice(0, 120),
      );
    }
    const why = await ask('Pourquoi voter Mélenchon ?');
    check(
      'a vote asked with a name is a vote asked',
      /Ici, on ne parle que du programme/.test(why) && (await count(`${LAST} .c-gists`)) === 0,
      why.slice(0, 120),
    );
    const machine = await ask('c’est une ia ?');
    check(
      '« c’est une ia ? » is answered by the site: no AI answers live',
      (await count(`${LAST} .c-about`)) === 1 &&
        (await count(`${LAST} .c-gists`)) === 0 &&
        /aucune IA ne répond en direct/.test(machine),
      machine.slice(0, 160),
    );
    check('none of those sent anything', posted.gists.length === beforeCharges);
    // A question that names someone is a search like any other — shown as LINKS: no sentence
    // of ours stands under a name, whatever the question says of it (third review).
    const beforeNamed = posted.gists.length;
    const position = await ask('Mélenchon est pour le RIC ?');
    check(
      'a position asked of the candidate of the book is searched, not refused',
      (await count(`${LAST} .c-gists`)) === 1 && !/Ici, on ne parle que/.test(position),
      position.slice(0, 160),
    );
    const HOW = /Pour cette question, voici des liens\. Pour des phrases, demande un sujet seul\./;
    check(
      '…and shown as links: no sentence, no label of an AI, one line that says how to get sentences',
      (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
        (await count(`${LAST} .c-gists .c-badge`)) === 0 &&
        HOW.test(position) &&
        // …with a word of the question itself as the example: the one that found the measures.
        /Par exemple «\sRIC\s»\./.test(position),
      position.slice(0, 300),
    );
    // A name nobody listed, typed as a phone types it: the book does not hold that word.
    for (const question of [
      'obono antisémite',
      'Rima Hassan antisémite ?',
      'quatennens violences conjugales',
    ]) {
      const stranger = await ask(question);
      check(
        `« ${question} »: links — no sentence of ours stands under a name, listed or not`,
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
          (await count(`${LAST} .c-gists .c-badge`)) === 0 &&
          (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
          HOW.test(stranger),
        stranger.slice(0, 200),
      );
    }
    // A title, a nickname, a name that is also a word: somebody is pointed at (fifth review).
    for (const question of [
      'l’antisémitisme du candidat',
      'papy fraude fiscale',
      'marine inéligible',
    ]) {
      const pointed = await ask(question);
      check(
        `« ${question} »: links — a sentence of ours under it would answer for somebody`,
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
          (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
          HOW.test(pointed),
        pointed.slice(0, 200),
      );
    }
    const charged = await ask('leur chef est antisémite');
    check(
      'an epithet thrown at nobody named — every word of it is a word of the book: links',
      (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 && HOW.test(charged),
      charged.slice(0, 200),
    );
    // A sensitive subject with anything that can be its target — a title without its article,
    // a party pointed at, a description, a pronoun, two subjects no measure holds together
    // (sixth review): links, and the subject itself as the example to ask alone.
    // Each with the subject it holds as the example: a reader who asked about tax fraud is not
    // told to ask about antisemitism (review 19).
    for (const [question, subject] of [
      ['candidat antisémitisme', 'antisémitisme'],
      ['ce parti et l’antisémitisme', 'antisémitisme'],
      ['l’auteur du programme et l’antisémitisme', 'antisémitisme'],
      ['celui qui a dit la République c’est moi et l’antisémitisme', 'antisémitisme'],
      ['eux et la fraude fiscale', 'fraude'],
      // Letters typed apart are a name all the same (seventh review).
      ['L.F.I. antisémitisme', 'antisémitisme'],
    ] as const) {
      const beside = await ask(question);
      check(
        `« ${question} »: links — a sensitive subject is not asked alone`,
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
          (await count(`${LAST} .c-gists .c-badge`)) === 0 &&
          HOW.test(beside) &&
          new RegExp(`Par exemple «\\s${subject}\\s»\\.`).test(beside),
        beside.slice(0, 260),
      );
    }
    // Two subjects no measure holds together — and next to a people, no word of the question
    // is given as the subject to ask.
    const married = await ask('les Roms et la délinquance');
    check(
      '« les Roms et la délinquance »: links, and no example',
      (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
        HOW.test(married) &&
        !/Par exemple/.test(married),
      married.slice(0, 220),
    );
    // A date that is not the date of a measure found one by its month alone (seventh review):
    // links, and no word of it given as an example.
    const otherDay = await ask('le 7 octobre');
    check(
      '« le 7 octobre »: no sentence on another day of October stands under it',
      (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
        (FOUND_NOTHING.test(otherDay) || (HOW.test(otherDay) && !/Par exemple/.test(otherDay))),
      otherDay.slice(0, 220),
    );
    check(
      'none of these sent anything: a question shown as links asks nothing of the base',
      posted.gists.length === beforeNamed,
    );
    // …and the same subject asked alone is a question about the book: its measures are named
    // to the base, like any other.
    const byItself = await ask('que prévoit le programme contre l’antisémitisme ?');
    check(
      'a sensitive subject asked alone is a question about the book: its measures are asked for',
      (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
        !HOW.test(byItself) &&
        posted.gists.length === beforeNamed + 1,
      byItself.slice(0, 200),
    );
    check(
      'in the sheet a link is said to be the measure — « C’est écrit là » is the search’s, and never stands under a charge',
      (await count('#chat-thread .sources')) > 3 &&
        (await page.evaluate<boolean>(
          "Array.from(document.querySelectorAll('#chat-thread .sources')).every((line) => (line.textContent ?? '').startsWith('La mesure, sur le site officiel') && !/écrit là/.test(line.textContent ?? ''))",
        )),
    );
    // A recognised objection: the measures our written answer rests on, not what its words find.
    const sentSoFar = posted.gists.length;
    await ask('Ils veulent sortir de l’UE et de l’euro');
    const objected = parsed(posted.gists[sentSoFar]);
    const rests = await page.evaluate<string[]>(
      "JSON.parse(document.querySelector('#chat-config').textContent).objections.find((o) => o.slug === 'europe').supports",
    );
    check(
      'a recognised objection shows « En clair », then the measures its answer rests on',
      (await count(`${LAST} .c-plain`)) === 1 &&
        rests.length >= 2 &&
        JSON.stringify(objected.ids) === JSON.stringify(rests.slice(0, 3)),
      `${JSON.stringify(objected.ids)} / ${JSON.stringify(rests)}`,
    );
    // The sixteenth answer (D21.4): the same, and its link leads to the page of the studies.
    const beforeExile = posted.gists.length;
    await ask('Avec la taxe Zucman, les riches vont tous partir');
    const exiled = parsed(posted.gists[beforeExile]);
    const exileRests = await page.evaluate<string[]>(
      "JSON.parse(document.querySelector('#chat-config').textContent).objections.find((o) => o.slug === 'exil-fiscal').supports",
    );
    check(
      'the objection on tax exile: « En clair », its measures, and the link to its page (D21.4)',
      (await count(`${LAST} .c-plain`)) === 1 &&
        (await count(`${LAST} .c-plain a[href="/r/exil-fiscal/"]`)) === 1 &&
        exileRests.length >= 2 &&
        JSON.stringify(exiled.ids) === JSON.stringify(exileRests.slice(0, 3)),
      `${JSON.stringify(exiled.ids)} / ${JSON.stringify(exileRests)}`,
    );
    // …when the question is the objection and nothing more. With a charge that rides along it
    // is a question like another: neither our written answer nor a sentence — and nothing sent.
    const afterObjection = posted.gists.length;
    const ridden = await ask(
      'Ils veulent sortir de l’UE et de l’euro, comme l’antisémitisme de Zorglub',
    );
    check(
      'an objection that carries a charge along: no « En clair », no sentence, nothing sent',
      (await count(`${LAST} .c-plain`)) === 0 &&
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
        (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
        HOW.test(ridden) &&
        posted.gists.length === afterObjection,
      ridden.slice(0, 260),
    );
    // A hateful statement and nothing else is refused like an insult, once the files of the
    // sheet say what it is (eighth review)…
    const hate = await ask('les musulmans sont des terroristes');
    check(
      'a bare hateful statement: the sentence an insult gets, no measure, no answer of ours',
      /Ici, on ne parle que du programme/.test(hate) &&
        (await count(`${LAST} .c-gists`)) === 0 &&
        (await count(`${LAST} .c-plain`)) === 0,
      hate.slice(0, 200),
    );
    // …and nobody who reports one, asks about one, or types a coded phrase or a slur is
    // turned away (ninth review): links — the measures of the subject to ask in its place.
    for (const [question, subject] of [
      ['je me suis fait traiter de sale juif', 'antisémitisme'],
      ['la finance apatride', 'antisémitisme'],
      ['que dit le programme sur la préférence nationale ?', 'immigration'],
    ] as const) {
      const coded = await ask(question);
      check(
        `« ${question} »: not refused — links, and « ${subject} » to ask in its place`,
        !/Ici, on ne parle que du programme/.test(coded) &&
          (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
          (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
          (await count(`${LAST} .c-plain`)) === 0 &&
          HOW.test(coded) &&
          new RegExp(`Par exemple «\\s${subject}\\s»\\.`).test(coded),
        coded.slice(0, 260),
      );
    }
    for (const question of [
      'mon oncle dit que les musulmans sont tous des terroristes, que répondre ?',
      'les musulmans sont des terroristes, c’est faux',
      'les migrants malades et l’AME',
      'Avec eux, c’est l’immigration sans limite, les musulmans sont des terroristes',
    ]) {
      const reported = await ask(question);
      check(
        `« ${question.slice(0, 48)}… »: neither refused, nor answered with a sentence or with « En clair »`,
        !/Ici, on ne parle que du programme/.test(reported) &&
          (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
          (await count(`${LAST} .c-plain`)) === 0 &&
          (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
          HOW.test(reported),
        reported.slice(0, 220),
      );
    }
    // The card of a word of ours does not stand above a charge either; alone, the word has it.
    const carded = await ask('la règle verte et l’antisémitisme de Zorglub');
    check(
      'a word of ours next to a charge: no « En clair », no sentence',
      (await count(`${LAST} .c-plain`)) === 0 &&
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
        (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
        HOW.test(carded),
      carded.slice(0, 220),
    );
    // …nor an explained word: a charged turn has nothing of ours above its links (B12). Asked
    // without « c’est quoi », the word would not be explained anyway, and the check could not fail.
    const chargedWord = await ask('c’est quoi l’antisémitisme de Zorglub ?');
    check(
      'a word asked about next to a charge: no explanation of ours above the links, no sentence',
      (await count(`${LAST} .c-terms`)) === 0 &&
        (await count(`${LAST} .c-plain`)) === 0 &&
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
        (HOW.test(chargedWord) || FOUND_NOTHING.test(chargedWord)),
      chargedWord.slice(0, 220),
    );
    check('none of those sent anything either', posted.gists.length === afterObjection);
    // « En clair » — our answers and our cards, prepared with an AI — carries the mark a machine
    // can read on every text it shows, like the sentences and the words; its links carry none
    // (D21.49; the legal file says so of every text an AI wrote in the sheet: review 19, Y11).
    const plainTexts = await count('#chat-thread .c-plain > p:not(.c-badge):not(:has(a))');
    check(
      '« En clair » carries the mark of an AI on each of its texts, and none on its links',
      plainTexts >= 2 &&
        (await count(
          '#chat-thread .c-plain > p:not(.c-badge):not(:has(a))[data-generated-by="ai"]',
        )) === plainTexts &&
        (await count('#chat-thread .c-plain p[data-generated-by] a')) === 0,
      String(plainTexts),
    );
    await linksBeside('the whole conversation: our answers, the site, the objections');

    // --- 8. nothing is written on the phone; the thread empties
    const storedNow = await stores(page);
    const cookies = await context.cookies();
    check(
      'nothing was written on the phone during the whole conversation — no storage, no base, no cache, no cookie',
      storedNow === stored &&
        cookies.length === 0 &&
        traffic.every((sent) => sent.headers['cookie'] === undefined),
      `${storedNow} ${JSON.stringify(cookies.map((cookie) => cookie.name))}`,
    );
    check(
      'nothing typed went into the address',
      typedIn(decodeURIComponent(page.url())).length === 0,
      page.url(),
    );
    await page.click('#chat-clear');
    check(
      '« Effacer la conversation » empties the thread — and says so to who cannot see it empty',
      (await count('#chat-thread .c-turn')) === 0 &&
        (await page.evaluate<string>(
          "(() => { const s = document.querySelector('#chat-status'); return s?.getAttribute('role') === 'status' ? s.textContent : ''; })()",
        )) === 'Conversation effacée.',
    );
    violations.push(...(await refusalsOf(page, 'main')));
    check('no page of the conversation opened another', context.pages().length === 1);
    // Over the whole conversation, each file of the sheet once, by its name alone: a file fetched
    // per answer or per word would tell the server what was asked (review 19).
    const fetchedData = requested.filter((url) => url.includes('/data/'));
    check(
      'over the whole conversation, each file of data was fetched once',
      new Set(fetchedData).size === fetchedData.length &&
        plainFiles().length === 1 &&
        wordFiles().length === 3,
      fetchedData.map((url) => url.slice(url.lastIndexOf('/') + 1)).join(' '),
    );

    // --- 9. the accessibility of the open sheet
    if (name === 'chromium') {
      const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
      for (const [label, width] of [
        ['390 px', 390],
        ['320 px', 320],
      ] as const) {
        const audited = await browser.newContext({
          viewport: { width, height: 700 },
          bypassCSP: true,
        });
        const view = await guard(audited, `audit at ${label}`);
        await view.goto(`${origin}/`);
        await until(
          view,
          "document.querySelector('#ask') && !document.querySelector('#ask').disabled",
        );
        // Judged with everything it can hold: sentences, and an explained word, open.
        sim.gists = 'words';
        typing('et les retraites ?');
        await view.fill('#q', 'et les retraites ?');
        await view.click('#ask');
        await until(view, "document.querySelector('#chat-thread .c-gists .c-row') !== null");
        await until(view, "document.querySelector('#chat-thread .c-terms details') !== null");
        await view.click('#chat-thread .c-terms details summary');
        await until(view, "document.querySelector('#chat-thread .c-terms details').open");
        await until(
          view,
          "document.querySelector('#chat-thread .c-terms details[data-filled]') !== null",
        );
        await view.addScriptTag({ content: axe });
        // The sheet rises in 180 ms, from transparent: it is judged as it stands (see e2e-ask).
        await view.evaluate(
          'Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))',
        );
        const result: { violations: { id: string; impact: string | null }[] } = await view.evaluate(
          'window.axe.run(document, { resultTypes: ["violations"] })',
        );
        const serious = result.violations
          .filter((v) => v.impact === 'serious' || v.impact === 'critical')
          .map((v) => v.id);
        check(
          `the sheet with its sentences and an explained word passes the accessibility audit at ${label}`,
          serious.length === 0,
          serious.join(','),
        );
        // The conversation scrolls in a box of its own (#chat-scroll): what overflows there
        // moves neither number of the page nor the sheet's (review 19).
        const box: { sw: number; cw: number; sheet: number; scroll: number } = await view.evaluate(
          "({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sheet: document.querySelector('#chat-sheet').scrollWidth - document.querySelector('#chat-sheet').clientWidth, scroll: document.querySelector('#chat-scroll').scrollWidth - document.querySelector('#chat-scroll').clientWidth })",
        );
        check(
          `the sheet does not overflow at ${label}, nor the conversation inside it`,
          box.sw <= box.cw && box.sheet <= 0 && box.scroll <= 0,
          `${String(box.sw)} > ${String(box.cw)} / ${String(box.sheet)} / ${String(box.scroll)}`,
        );
        const target: { height: number } = await view.evaluate(
          "({ height: document.querySelector('#chat-thread .c-terms summary').getBoundingClientRect().height })",
        );
        check(
          `a word to press is tall enough for a finger at ${label}`,
          target.height >= 44,
          String(target.height),
        );
        check(`the audit at ${label}: the page opened no other`, audited.pages().length === 1);
        await audited.close();
      }
    }

    // --- 10. what left, from every context of the run: the conversation, the stale titles, the
    // freeze, the audit — read once all of them are done (review 19)
    check(
      'no request went to /api/chat, nor to any other address of the Worker',
      posted.chat.length === 0 && elsewhere.length === 0,
      [...posted.chat, ...elsewhere].slice(0, 3).join(' | '),
    );
    check(
      'every request to /api/gists is one the Worker reads: the state of the book and measures, nothing else',
      refused.length === 0 && unread.length === 0,
      [...refused, ...unread].slice(0, 3).join(' | '),
    );
    check(
      'no request carried a word typed — not in its address, not in a header, not in its body',
      carrying().length === 0,
      carrying().slice(0, 3).join(' | '),
    );
    check('no page opened a socket', sockets.length === 0, sockets.slice(0, 3).join(' | '));
    check(
      'nothing was asked of anyone but us',
      escaped.length === 0,
      escaped.slice(0, 3).join(' '),
    );
    check(
      'nothing the pages ship violates their policy',
      violations.length === 0,
      violations.slice(0, 3).join(' | '),
    );
    check('no page opened a dialog', dialogs.length === 0, dialogs.slice(0, 3).join(' | '));
  } catch (error) {
    // A wait that timed out, a page that closed: a failure of this engine, said with what it
    // was asking — never a bare stack that hides the other engines (review 19).
    const said = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error);
    check('the run of this engine reached its end', false, `${said} — at « ${lastAsked} »`);
  } finally {
    await browser.close();
  }
  return out;
}

async function main(): Promise<void> {
  if (!existsSync(join(ROOT, 'index.html'))) {
    console.error(`e2e-sheet: no ${ROOT}/ — run \`npm run build:gists\` first`);
    process.exit(1);
  }
  // A test build carries no marker of the tree it was made from: older than a source, it is
  // the page of another tree, judged against the rules of this one (review 19).
  const built = statSync(join(ROOT, 'index.html')).mtimeMs;
  const newer = [
    ...filesUnder('src'),
    ...filesUnder('data'),
    ...filesUnder('design'),
    'astro.config.ts',
  ].filter((file) => existsSync(file) && statSync(file).mtimeMs > built);
  if (newer.length > 0) {
    console.error(
      `e2e-sheet: ${ROOT}/ is older than ${newer[0] ?? ''}${newer.length > 1 ? ` and ${String(newer.length - 1)} more` : ''} — run \`npm run build:gists\` first`,
    );
    process.exit(1);
  }
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
  const { server, origin } = await serve(resolve(ROOT));
  try {
    await report((engine) => runEngine(engine, origin, manifest));
  } finally {
    server.close();
  }
}

await main();
