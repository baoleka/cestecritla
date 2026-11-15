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
 *   7. the explained words (D16.62): the acronyms and technical terms of the question and of
 *      the sentences on the screen, found on the phone in a file fetched whole — nothing is
 *      sent to find a word; each opens on a short text under a label that says an AI wrote and
 *      checked it; what the question names is open; a freeze or a request for a vote shows
 *      none; every text an AI wrote carries a mark a machine can read;
 *   8. nothing is written on the phone, nothing in the address; the thread empties;
 *   9. the policy of the page names nobody but us; the sheet passes the accessibility audit
 *      at 390 and 320 px — an explained word open — and does not overflow.
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

type Scenario =
  'deux' | 'ia offerte' | 'local' | 'panne' | 'autre livre' | 'silence' | 'balise' | 'mots';

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
      case 'mots':
        // Invented sentences that use two terms of data/2026/terms.json, in this order.
        return {
          body: {
            kind: 'gists',
            corpus,
            gists: all.map((gist) => ({
              ...gist,
              text: `Le programme prévoit un moratoire d'essai sur la T2A, pour ${gist.id}.`,
            })),
            ai: false,
          },
        };
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
    const FOUND_NOTHING = /Rien trouvé avec ces mots\./;
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
    // Three measures stand close enough to the best one for this question (src/lib/chat-local.ts,
    // `MIN_SHARE_OF_BEST`), and none of its words is one the sheet explains.
    const QUESTION = 'et l’hôpital, moi infirmière de nuit';
    await page.locator('#q').pressSequentially(QUESTION, { delay: 20 });
    await page.waitForTimeout(900);
    const carrying = (): string[] =>
      requested.filter((url) =>
        /infirmi|nuit|retraite|zorglub|montcuq|h[oô]pital|t2a|moratoire|smic/i.test(
          decodeURIComponent(url.split('#')[0] ?? ''),
        ),
      );
    check(
      'typing sends the words nowhere',
      carrying().length === 0 && posted.gists.length === 0 && posted.chat.length === 0,
    );
    check(
      'typing leaves nothing in the address',
      !page.url().includes('#') && !/pital|zorglub/i.test(page.url()),
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
    sim.gists = 'ia offerte';
    const offered = await ask('et la règle verte ?');
    check(
      'a Worker that says an AI is available changes nothing: no offer, no explanation',
      (await count('#chat-thread .c-ai')) === 0 &&
        (await count('#chat-thread [data-offer]')) === 0 &&
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

    // --- 7. the explained words: found on the phone, written ahead, labelled
    const TERMS = `${LAST} .c-terms:not(.c-asked)`;
    const ASKED = `${LAST} .c-terms.c-asked`;
    const termsShown = (scope: string): Promise<{ term: string; open: boolean }[]> =>
      page.evaluate<{ term: string; open: boolean }[]>(
        `Array.from(document.querySelectorAll(${JSON.stringify(`${scope} details`)})).map((d) => ({ term: d.querySelector('summary')?.textContent ?? '', open: d.open }))`,
      );
    /** True when, in the last turn, the first block stands before the second. */
    const before = (first: string, second: string): Promise<boolean> =>
      page.evaluate<boolean>(
        `(() => { const turn = document.querySelector(${JSON.stringify(LAST)}); const a = turn?.querySelector(${JSON.stringify(first)}); const b = turn?.querySelector(${JSON.stringify(second)}); return !!a && !!b && (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0; })()`,
      );
    const plainFiles = (): string[] => requested.filter((url) => /\/data\/clair-/.test(url));
    check(
      'the file of explanations is fetched whole, once, by its name alone',
      plainFiles().length === 1 && /\/data\/clair-[0-9a-f]{16}\.json$/.test(plainFiles()[0] ?? ''),
      plainFiles().join(' '),
    );
    check(
      'a turn whose question and sentences use no explained word shows no block of words',
      (await count('#chat-thread .c-terms')) === 0,
    );
    sim.gists = 'mots';
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
      JSON.stringify(closed) ===
        JSON.stringify([
          { term: 'moratoire', open: false },
          { term: 'T2A', open: false },
        ]) && (await count(ASKED)) === 0,
      JSON.stringify(closed),
    );
    check(
      'the words of the sentences stand under the sentences, never above them',
      await before('.c-gists', '.c-terms:not(.c-asked)'),
    );
    check('no explained word says a word of failure', !FAILURE.test(withWords));
    const asked = requested.length;
    await page.click(`${TERMS} details:first-of-type summary`);
    await until(
      page,
      `document.querySelector(${JSON.stringify(`${TERMS} details`)})?.open === true`,
    );
    const explanation = await text(`${TERMS} details:first-of-type p`);
    check(
      'pressing a word opens its explanation: a short text, general, with a mark a machine can read',
      /^Un moratoire suspend/.test(explanation) &&
        explanation.length <= 200 &&
        !/programme/i.test(explanation) &&
        (await count(`${TERMS} details:first-of-type p[data-generated-by="ai"]`)) === 1,
      explanation,
    );
    await page.waitForTimeout(300);
    check(
      'opening a word sends nothing to anyone',
      requested.length === asked && posted.chat.length === 0,
      requested.slice(asked).join(' '),
    );
    check(
      'finding the words sent nothing but the measures: one request for the whole turn',
      requested.slice(sentBefore).length === 1 && /\/api\/gists$/.test(requested[sentBefore] ?? ''),
      requested.slice(sentBefore).join(' '),
    );
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
        JSON.stringify([
          { term: 'T2A', open: false },
          { term: 'moratoire', open: false },
        ]) &&
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
    const links = await page.evaluate<{ target: string; rel: string; says: string | null }[]>(
      `Array.from(document.querySelectorAll('#chat-thread a')).map((a) => ({ target: a.target, rel: a.rel, says: a.getAttribute('aria-describedby') }))`,
    );
    check(
      'every link of the sheet opens beside the conversation, says so, and tells the other site nothing',
      links.length >= 3 &&
        links.every(
          (link) =>
            link.target === '_blank' &&
            link.rel === 'noopener noreferrer' &&
            link.says === 'chat-new-tab',
        ) &&
        (await page.evaluate<string>(
          "document.querySelector('#chat-new-tab')?.textContent ?? ''",
        )) === 'Ouvre un nouvel onglet.',
      JSON.stringify(links.slice(0, 2)),
    );
    // The question asks what a word means: that word is what was asked — first, and open.
    await ask('c’est quoi la t2a à l’hôpital ?');
    const named = await termsShown(ASKED);
    const rest = await termsShown(TERMS);
    check(
      'a word the question asks about stands above the measures, under its own title, open',
      (await text(`${ASKED} h3`)) === 'Les mots de ta question' &&
        (await text(`${ASKED} .c-badge`)) === 'Explications écrites et vérifiées par une IA' &&
        JSON.stringify(named) === JSON.stringify([{ term: 'T2A', open: true }]) &&
        (await before('.c-terms.c-asked', '.c-gists')),
      JSON.stringify(named),
    );
    check(
      '…and it is not explained twice: the other words stay under the measures, closed',
      JSON.stringify(rest) === JSON.stringify([{ term: 'moratoire', open: false }]) &&
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
        JSON.stringify(alone) === JSON.stringify([{ term: 'moratoire', open: true }]) &&
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
    sim.gists = 'mots';
    const vote = await ask('pour qui voter avec le smic ?');
    check(
      'a request for a vote: one sentence of ours, and no word explained',
      /Ici, on ne parle que du programme/.test(vote) && (await count(`${LAST} .c-terms`)) === 0,
      vote.slice(0, 120),
    );
    sim.gists = 'deux';

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
    check('a question about the site says no word of failure', !FAILURE.test(about));
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
          (FOUND_NOTHING.test(stranger) || HOW.test(stranger)),
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
          (FOUND_NOTHING.test(pointed) || HOW.test(pointed)),
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
    for (const question of [
      'candidat antisémitisme',
      'ce parti et l’antisémitisme',
      'l’auteur du programme et l’antisémitisme',
      'celui qui a dit la République c’est moi et l’antisémitisme',
      'eux et la fraude fiscale',
      'les Roms et la délinquance',
      // Letters typed apart are a name all the same (seventh review).
      'L.F.I. antisémitisme',
    ]) {
      const beside = await ask(question);
      check(
        `« ${question} »: links — a sensitive subject is not asked alone`,
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
          (await count(`${LAST} .c-gists .c-badge`)) === 0 &&
          HOW.test(beside) &&
          /Par exemple «\s(?:antisémitisme|fraude|délinquance)\s»\./.test(beside),
        beside.slice(0, 260),
      );
    }
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
    const objected = JSON.parse(posted.gists[sentSoFar] ?? '{}') as { ids?: string[] };
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
    // …with our sentences when the question is the objection and nothing more: a charge that
    // rides along keeps our written answer and its measures, as links — and sends nothing.
    const afterObjection = posted.gists.length;
    const ridden = await ask(
      'Ils veulent sortir de l’UE et de l’euro, comme l’antisémitisme de Zorglub',
    );
    check(
      'an objection that carries a charge along: our answer, its measures as links, nothing sent',
      (await count(`${LAST} .c-plain`)) === 1 &&
        (await count(`${LAST} .c-gists .c-row`)) >= 2 &&
        (await count(`${LAST} .c-gists [data-generated-by]`)) === 0 &&
        HOW.test(ridden) &&
        posted.gists.length === afterObjection,
      ridden.slice(0, 260),
    );

    // --- 8. nothing is written on the phone; the thread empties
    check(
      'nothing was written on the phone during the whole conversation',
      (await page.evaluate<string>(
        'JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)])',
      )) === stored,
    );
    check(
      'nothing typed went into the address',
      !/retraite|verte|pital|t2a|moratoire|smic/i.test(page.url()),
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
    check('no request ever went to /api/chat', posted.chat.length === 0, posted.chat.join(' | '));
    check(
      'no request carried a word typed',
      carrying().length === 0 &&
        posted.gists.every(
          (body) =>
            !/zorglub|montcuq|infirmi|nuit|retraite|verte|pital|t2a|moratoire|smic/i.test(body),
        ),
    );
    check(
      'nothing was asked of anyone but us',
      escaped.length === 0,
      escaped.slice(0, 3).join(' '),
    );

    // --- 9. the policy, and the accessibility of the open sheet
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
        // Judged with everything it can hold: sentences, and an explained word, open.
        sim.gists = 'mots';
        await view.fill('#q', 'et les retraites ?');
        await view.click('#ask');
        await until(view, "document.querySelector('#chat-thread .c-gists .c-row') !== null");
        await until(view, "document.querySelector('#chat-thread .c-terms details') !== null");
        await view.click('#chat-thread .c-terms details summary');
        await until(view, "document.querySelector('#chat-thread .c-terms details').open");
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
        const box: { sw: number; cw: number; sheet: number } = await view.evaluate(
          "({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth, sheet: document.querySelector('#chat-sheet').scrollWidth - document.querySelector('#chat-sheet').clientWidth })",
        );
        check(
          `the sheet does not overflow at ${label}`,
          box.sw <= box.cw && box.sheet <= 0,
          `${String(box.sw)} > ${String(box.cw)} / ${String(box.sheet)}`,
        );
        const target: { height: number } = await view.evaluate(
          "({ height: document.querySelector('#chat-thread .c-terms summary').getBoundingClientRect().height })",
        );
        check(
          `a word to press is tall enough for a finger at ${label}`,
          target.height >= 44,
          String(target.height),
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
