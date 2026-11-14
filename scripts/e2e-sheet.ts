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
 * here from a table. `/api/chat` is answered too — with an explanation — so that a page which
 * asked for one would SHOW it: the test holds that the page never asks.
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
 *      of the book, electoral silence — none says a word of failure;
 *   6. a sentence of the base is text: markup in it creates no element;
 *   7. nothing is written on the phone, nothing in the address; the thread empties;
 *   8. the policy of the page names nobody but us; the sheet passes the accessibility audit
 *      at 390 and 320 px and does not overflow.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page, Route } from 'playwright';
import type { Manifest } from './aec26-types.js';
import { loadPage } from './ask-page.js';
import { ENGINES, checker, report, serve, until } from './e2e-kit.js';
import type { Outcome } from './e2e-kit.js';

const ROOT = 'dist-gists';
const OFFICIAL = 'https://melenchon2027.fr';
/** Words a page must never show when something did not come: every state is a normal one. */
const FAILURE = /erreur|panne|indisponible|désolé|malheureusement|réessa|error|undefined|\bnull\b/i;
/** What a page that offered or showed a live AI would carry. */
const LIVE_AI =
  /Expliquer avec l’IA|Ne plus demander à l’IA|Demander aussi à l’IA|IA ·|Mistral|Llama|Gemma/;

type Scenario = 'deux' | 'ia offerte' | 'local' | 'panne' | 'autre livre' | 'silence' | 'balise';

async function runEngine(name: string, origin: string, manifest: Manifest): Promise<Outcome> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const { out, check } = checker(name);
  const corpus = manifest.meta.corpus_version;
  const pageInNode = loadPage();

  const sim: { gists: Scenario } = { gists: 'deux' };
  const inBase = (id: string): string => `Le programme prévoit une phrase d'essai, pour ${id}.`;
  const sentence = (id: string): string => `Le programme prévoit une phrase d’essai, pour ${id}.`;
  const gistsAnswer = (ids: readonly string[]): { status?: number; body: unknown } => {
    const all = ids.map((id) => ({ id, text: inBase(id) }));
    switch (sim.gists) {
      case 'deux':
        // The third measure has no sentence: it keeps its link alone. No AI: `ai` is false.
        return { body: { kind: 'gists', corpus, gists: all.slice(0, 2), ai: false } };
      case 'ia offerte':
        // A Worker that would say an AI is available: the page of this build has nothing to
        // offer it with, and must ask nothing of it.
        return { body: { kind: 'gists', corpus, gists: all, ai: true } };
      case 'local':
        return { body: { kind: 'local' } };
      case 'panne':
        return { status: 500, body: { error: 'Service indisponible' } };
      case 'autre livre':
        return { body: { kind: 'gists', corpus: 'ffffffffffffffff', gists: all, ai: false } };
      case 'silence':
        return { body: { kind: 'silence', reopen: '2027-04-18T18:00:00.000Z' } };
      case 'balise':
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
  try {
    const escaped: string[] = [];
    const requested: string[] = [];
    const posted = { gists: [] as string[], chat: [] as string[] };
    const violations: string[] = [];
    const dialogs: string[] = [];

    const guard = async (page: Page): Promise<void> => {
      await page.route('**/*', async (route: Route) => {
        const request = route.request();
        const url = request.url();
        requested.push(url);
        const fulfil = (answer: { status?: number; body: unknown }): Promise<void> =>
          route.fulfill({
            status: answer.status ?? 200,
            contentType: 'application/json; charset=utf-8',
            body: typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body),
          });
        if (url === `${origin}/api/gists`) {
          const body = request.postData() ?? '';
          posted.gists.push(body);
          const ids = (JSON.parse(body) as { ids?: string[] }).ids ?? [];
          return fulfil(gistsAnswer(ids));
        }
        if (url === `${origin}/api/chat`) {
          // Never expected. Answered as a model would, so that a page which asked shows it.
          posted.chat.push(request.postData() ?? '');
          return fulfil({
            body: {
              kind: 'explain',
              corpus,
              sentences: ['Une explication que personne ne doit voir.'],
            },
          });
        }
        if (url.startsWith(origin)) return route.continue();
        if (url.startsWith(OFFICIAL) && request.resourceType() === 'document') {
          return route.fulfill({
            status: 200,
            contentType: 'text/html',
            body: '<title>stub</title>',
          });
        }
        escaped.push(url);
        return route.abort();
      });
      page.on('dialog', (dialog) => {
        dialogs.push(dialog.message());
        void dialog.dismiss();
      });
      page.on('console', (message) => {
        if (/content security policy|refused to/i.test(message.text()))
          violations.push(message.text());
      });
      page.on('pageerror', (error) => violations.push(`page error: ${error.message}`));
    };

    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    await guard(page);
    const text = (selector: string): Promise<string> =>
      page.evaluate<string>(
        `document.querySelector(${JSON.stringify(selector)})?.textContent ?? ''`,
      );
    const count = (selector: string): Promise<number> =>
      page.evaluate<number>(`document.querySelectorAll(${JSON.stringify(selector)}).length`);
    const LAST = '#chat-thread .c-turn:last-child';
    const settled = `document.querySelector(${JSON.stringify(LAST)})?.getAttribute('aria-busy') === 'false'`;
    const ask = async (question: string): Promise<string> => {
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
    const stored = await page.evaluate<string>(
      'JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)])',
    );
    const hint = await text('#search-hint');
    check(
      'the notice says what asking gives, and that an AI wrote it',
      /phrases écrites d’avance par une IA/.test(hint) && /reste sur ce téléphone/.test(hint),
      hint,
    );
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    check(
      'no model is named on the page, and none is said to explain',
      !LIVE_AI.test(hint) && !LIVE_AI.test(await text('body')) && !/Cloudflare/.test(hint),
      hint,
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
    check(
      'the script of the sheet is not fetched with the page',
      !requested.some((url) => /\/_astro\/chat\./.test(url)),
    );
    check('before any gesture nothing is asked of anyone but us', escaped.length === 0);

    // --- 2. typing sends nothing; the gesture sends identifiers — not the sentence
    const QUESTION = 'et les retraites des infirmières, moi zorglub de montcuq';
    await page.locator('#q').pressSequentially(QUESTION, { delay: 20 });
    await page.waitForTimeout(900);
    const carrying = (): string[] =>
      requested.filter((url) =>
        /infirmi|retraite|zorglub|montcuq/i.test(decodeURIComponent(url.split('#')[0] ?? '')),
      );
    check(
      'typing sends the words nowhere',
      carrying().length === 0 && posted.gists.length === 0 && posted.chat.length === 0,
    );
    check(
      'typing leaves nothing in the address',
      !page.url().includes('#') && !/retraite/i.test(page.url()),
      page.url(),
    );
    await page.click('#ask');
    await until(page, "document.querySelector('#chat-sheet').open");
    await until(page, settled);
    check('« Demander » sends once, to /api/gists', posted.gists.length === 1);
    const gistsBody = posted.gists[0] ?? '{}';
    const sent = JSON.parse(gistsBody) as { corpus?: unknown; ids?: string[] };
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
      !/zorglub|montcuq|infirmi|retraite|moi/i.test(gistsBody),
      gistsBody.slice(0, 160),
    );

    // --- 3. the sheet: the frame, the sentences, their label, their links
    check(
      'the sheet says « Site non officiel. » in its frame',
      /Site non officiel\./.test(await text('#chat-sheet .c-head')),
    );
    check(
      'the sentences come under their title, with who wrote and checked them: an AI',
      /Ce que prévoit le programme/.test(await text(`${LAST} .c-gists h3`)) &&
        /Phrases écrites et vérifiées par une IA/.test(await text(`${LAST} .c-gists .c-badge`)),
      await text(`${LAST} .c-gists`),
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
    sim.gists = 'ia offerte';
    const offered = await ask('et la règle verte ?');
    check(
      'a Worker that says an AI is available changes nothing: no offer, no explanation',
      (await count('#chat-thread .c-ai')) === 0 &&
        (await count('#chat-thread [data-offer]')) === 0 &&
        (await count('#chat-thread [data-generated-by]')) === 0 &&
        !LIVE_AI.test(offered) &&
        !/Une explication que personne ne doit voir/.test(offered),
      offered.slice(0, 200),
    );
    await page.waitForTimeout(600);
    check('nothing was asked of /api/chat', posted.chat.length === 0, posted.chat.join(' | '));
    sim.gists = 'deux';

    // --- 5. every other state is a normal one
    for (const [scenario, label] of [
      ['local', 'the route closed'],
      ['panne', 'the Worker broken'],
      ['autre livre', 'another state of the book'],
    ] as const) {
      sim.gists = scenario;
      const shownText = await ask('et les retraites ?');
      check(
        `${label}: the links stand alone, and nothing says a word of failure`,
        (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
          (await count(`${LAST} .c-gists .c-row > p:not(.sources)`)) === 0 &&
          !FAILURE.test(shownText),
        shownText.slice(0, 160),
      );
    }
    sim.gists = 'silence';
    const silent = await ask('et les retraites ?');
    check(
      'electoral silence: the sheet says when questions come back, and shows no sentence',
      /18 avril|reprennent|revien/i.test(silent) &&
        (await count(`${LAST} .c-gists .c-row > p:not(.sources)`)) === 0,
      silent.slice(0, 200),
    );

    // --- 6. a sentence of the base is text
    sim.gists = 'balise';
    const marked = await ask('et les retraites ?');
    check(
      'markup in a sentence creates no element',
      (await count('#chat-thread img')) === 0 && /<img src=x/.test(marked) && dialogs.length === 0,
    );
    sim.gists = 'deux';

    // --- 7. nothing is written on the phone; the thread empties
    check(
      'nothing was written on the phone during the whole conversation',
      (await page.evaluate<string>(
        'JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)])',
      )) === stored,
    );
    check('nothing typed went into the address', !/retraite|verte/i.test(page.url()), page.url());
    await page.click('#chat-clear');
    check(
      '« Effacer la conversation » empties the thread',
      (await count('#chat-thread .c-turn')) === 0,
    );
    check('no request ever went to /api/chat', posted.chat.length === 0, posted.chat.join(' | '));
    check(
      'no request carried a word typed',
      carrying().length === 0 &&
        posted.gists.every((body) => !/zorglub|montcuq|retraite|verte/i.test(body)),
    );
    check(
      'nothing was asked of anyone but us',
      escaped.length === 0,
      escaped.slice(0, 3).join(' '),
    );

    // --- 8. the policy, and the accessibility of the open sheet
    check(
      'nothing the page ships violates its policy',
      violations.length === 0,
      violations.join(' | '),
    );
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
        const view = await audited.newPage();
        await guard(view);
        await view.goto(`${origin}/`);
        await until(
          view,
          "document.querySelector('#ask') && !document.querySelector('#ask').disabled",
        );
        await view.fill('#q', 'et les retraites ?');
        await view.click('#ask');
        await until(view, "document.querySelector('#chat-thread .c-gists .c-row') !== null");
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
          `the sheet with its sentences passes the accessibility audit at ${label}`,
          serious.length === 0,
          serious.join(','),
        );
        const box: { sw: number; cw: number; sheet: number } = await view.evaluate(
          "({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sheet: document.querySelector('#chat-sheet').scrollWidth - document.querySelector('#chat-sheet').clientWidth })",
        );
        check(
          `the sheet does not overflow at ${label}`,
          box.sw <= box.cw && box.sheet <= 0,
          `${String(box.sw)} > ${String(box.cw)} / ${String(box.sheet)}`,
        );
        await audited.close();
      }
    }
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
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
  const { server, origin } = await serve(resolve(ROOT));
  try {
    await report((engine) => runEngine(engine, origin, manifest));
  } finally {
    server.close();
  }
}

await main();
