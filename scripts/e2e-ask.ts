/**
 * End-to-end checks of the sheet of « Demander » (PLAN-CHAT §1, §2 and §8), in three browser
 * engines, against a Worker that is SIMULATED: nothing is deployed, no model runs, no neuron
 * is spent.
 *
 *   npm run build:ask && npx tsx scripts/e2e-ask.ts            Chromium, Firefox, WebKit
 *   npx tsx scripts/e2e-ask.ts --engines chromium
 *
 * dist-ask/ — the app as it would be if the site answered questions (scripts/build.ts
 * --ask-test chat) — is served from a local port. `/api/gists` and `/api/chat` are answered
 * here from a table, one canned answer per scenario the test names before a gesture. Every
 * request to another host is aborted and reported: there is none to expect.
 *
 * What is checked:
 *   1. before any gesture: the notice of what asking does, with the model's name; the sheet
 *      closed, its script not even fetched; no request to anyone but us;
 *   2. typing sends nothing. « Demander » opens the sheet and sends ONCE, to `/api/gists`,
 *      `corpus` and `ids` and nothing else — the measures the page's own search ranks best,
 *      exactly what scripts/ask-page.ts computes for the same question — and not a word typed;
 *   3. the read sentences are shown with their links; a measure without one keeps its link
 *      alone; the offer stands in place of the explanation — one notice, one button — and
 *      until the button is pressed nothing is asked of the AI, however many questions follow;
 *   4. pressed: `/api/chat` carries the measures whose sentence is on the screen, the words of
 *      OUR sentences that the question uses, the cards it names — and nothing else, follow-ups
 *      included: NO REQUEST EVER CARRIES THE QUESTION, nor a word of it that is not ours
 *      (D16.53). What the model wrote carries its label in the text and a mark a machine reads;
 *   5. every other state is a normal one, and none says a word of failure: the model silent,
 *      the allowance spent (and then no question leaves any more), the Worker broken, another
 *      state of the book, nothing found, an objection a person answered (never sent), a card,
 *      a request for a vote, electoral silence;
 *   6. a sentence of the base or of the model is text: markup in it creates no element;
 *   7. nothing is written on the phone — no storage, no address — after a whole conversation;
 *      the thread is emptied by its button, and is gone when the page is left;
 *   8. the Content-Security-Policy of every page names nobody but us and nothing we ship
 *      violates it; the sheet is reachable by keyboard, passes the accessibility audit at 390
 *      and 320 px, and does not make the page move.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page, Route } from 'playwright';
import { askedWords } from '../src/lib/chat-local.js';
import type { Manifest } from './aec26-types.js';
import { loadPage } from './ask-page.js';
import { ENGINES, STILL, checker, lateLayoutShift, report, serve, until } from './e2e-kit.js';
import type { Outcome } from './e2e-kit.js';

const ROOT = 'dist-ask';
const OFFICIAL = 'https://melenchon2027.fr';
const MODEL = 'Mistral Small 3.1';
/** Words a page must never show when something did not come: every state is a normal one. */
const FAILURE = /erreur|panne|indisponible|désolé|malheureusement|réessa|error|undefined|\bnull\b/i;

type GistsScenario =
  | 'toutes'
  | 'deux'
  | 'fermée'
  | 'local'
  | 'panne'
  | 'charabia'
  | 'autre livre'
  | 'silence'
  | 'balise';
type ChatScenario =
  'explique' | 'rien' | 'épuisé' | 'panne' | 'charabia' | 'autre livre' | 'balise';

async function runEngine(name: string, origin: string, manifest: Manifest): Promise<Outcome> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const { out, check } = checker(name);
  const corpus = manifest.meta.corpus_version;
  const objection = (
    JSON.parse(readFileSync('data/2026/riposte.json', 'utf8')) as {
      entries: { slug: string; objection: string }[];
    }
  ).entries[1];
  if (objection === undefined) throw new Error('no objection to type');
  const pageInNode = loadPage();

  /** The simulated Worker: what each route answers until the test says otherwise. */
  const sim: { gists: GistsScenario; chat: ChatScenario } = { gists: 'deux', chat: 'explique' };
  /** As the base holds it — a straight apostrophe — and as the page must show it. */
  const inBase = (id: string): string => `Phrase relue d'essai sur la retraite, pour ${id}.`;
  const sentence = (id: string): string => `Phrase relue d’essai sur la retraite, pour ${id}.`;
  const gistsAnswer = (ids: readonly string[]): { status?: number; body: unknown } => {
    const all = ids.map((id) => ({ id, text: inBase(id) }));
    switch (sim.gists) {
      case 'toutes':
        return { body: { kind: 'gists', corpus, gists: all, ai: true } };
      case 'deux':
        // The third measure has no read sentence: it keeps its link alone.
        return { body: { kind: 'gists', corpus, gists: all.slice(0, 2), ai: true, debug: 'X' } };
      case 'fermée':
        return { body: { kind: 'gists', corpus, gists: all, ai: false } };
      case 'local':
        return { body: { kind: 'local' } };
      case 'panne':
        return { status: 500, body: { error: 'Service indisponible' } };
      case 'charabia':
        return { body: 'pas du JSON' };
      case 'autre livre':
        return { body: { kind: 'gists', corpus: 'ffffffffffffffff', gists: all, ai: true } };
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
            ai: true,
          },
        };
    }
  };
  const chatAnswer = (follow: unknown): { status?: number; body: unknown } => {
    const sentences =
      follow === 'simpler'
        ? ['Une explication plus simple, écrite pour ce test.']
        : ['Une première explication d’essai.', 'Une seconde, sur un autre mot.'];
    switch (sim.chat) {
      case 'explique':
        return { body: { kind: 'explain', corpus, sentences, model: 'X', ids: ['p1c1-s01-k01'] } };
      case 'rien':
        return { body: { kind: 'quiet', why: 'none' } };
      case 'épuisé':
        return { body: { kind: 'quiet', why: 'spent' } };
      case 'panne':
        return { status: 500, body: { error: 'Service indisponible' } };
      case 'charabia':
        return { body: 'pas du JSON' };
      case 'autre livre':
        return { body: { kind: 'explain', corpus: 'ffffffffffffffff', sentences } };
      case 'balise':
        return {
          body: {
            kind: 'explain',
            corpus,
            sentences: ['<script>alert(2)</script><img src=x onerror=alert(3)> texte d’essai.'],
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
          const body = request.postData() ?? '';
          posted.chat.push(body);
          return fulfil(chatAnswer((JSON.parse(body) as { follow?: unknown }).follow));
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
    /** True once the last turn has stopped waiting for anything. */
    const settled = `document.querySelector(${JSON.stringify(LAST)})?.getAttribute('aria-busy') === 'false'`;
    /** Asks from the field of the sheet, and waits for the turn to come to rest. */
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
      'the notice names an AI and its model before the first use',
      /\bIA\b/.test(hint) && hint.includes(MODEL) && /Cloudflare/.test(hint),
      hint,
    );
    check(
      'the notice says what asking gives, and that the AI explains only when asked',
      /phrases relues/.test(hint) &&
        /sur demande/.test(hint) &&
        /reste sur ce téléphone/.test(hint),
      hint,
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
    check(
      '…nor announced to the browser in advance',
      !/rel="modulepreload"[^>]*chat\./.test(readFileSync(join(ROOT, 'index.html'), 'utf8')),
    );
    check(
      'before any gesture nothing is asked of anyone but us',
      escaped.length === 0,
      escaped.slice(0, 3).join(' '),
    );

    // --- 2. typing sends nothing; the gesture sends identifiers — not the sentence
    // « zorglub » and « montcuq » are words no programme writes: what a visitor says of
    // themselves has nothing to leave the phone as, until they agree to send the question.
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
    await page.waitForSelector('#search-list > li');
    check(
      'the same field still searches while one types',
      (await page.locator('#search-list > li').count()) >= 1,
    );

    await page.click('#ask');
    await until(page, "document.querySelector('#chat-sheet').open");
    await until(page, settled);
    check(
      'the script of the sheet is fetched at the first press',
      requested.filter((url) => /\/_astro\/chat\./.test(url)).length === 1,
    );
    check('« Demander » sends once, to /api/gists', posted.gists.length === 1);
    const gistsBody = posted.gists[0] ?? '{}';
    const sentGists = JSON.parse(gistsBody) as { corpus?: unknown; ids?: string[] };
    check(
      'the request is the state of the book and measures — and nothing else',
      JSON.stringify(Object.keys(sentGists).sort()) === '["corpus","ids"]' &&
        sentGists.corpus === corpus,
      JSON.stringify(Object.keys(sentGists)),
    );
    const rows = pageInNode(QUESTION).rows;
    check(
      'what leaves is what the search of the page ranks best: the same measures, in order',
      JSON.stringify(sentGists.ids) === JSON.stringify(rows) && rows.length === 3,
      JSON.stringify(sentGists.ids),
    );
    check(
      'the sentence typed is not in it, nor a word of it',
      !/zorglub|montcuq|infirmi|retraite|moi/i.test(gistsBody),
      gistsBody.slice(0, 160),
    );
    check('nothing is asked of the AI before the button is pressed', posted.chat.length === 0);
    check('nothing typed travels in an address either', carrying().length === 0);

    // --- 3. the sheet: the frame, the thread, the read sentences, the offer
    check(
      'the sheet says « Site non officiel. » in its frame',
      /Site non officiel\./.test(await text('#chat-sheet .c-head')),
    );
    check(
      'the question stands in the thread, as written',
      (await text(`${LAST} .c-question`)).includes(QUESTION),
    );
    check(
      'the read sentences come under their title, with what they are',
      /Ce que prévoit le programme/.test(await text(`${LAST} .c-gists h3`)) &&
        /écrites par une IA, relues par l’éditeur/.test(await text(`${LAST} .c-gists .c-badge`)),
      await text(`${LAST} .c-gists`),
    );
    const shownRows = await page.evaluate<{ gist: string; href: string; words: number }[]>(
      `Array.from(document.querySelectorAll(${JSON.stringify(`${LAST} .c-gists .c-row`)})).map((row) => ({ gist: row.querySelector(':scope > p:not(.sources)')?.textContent ?? '', href: row.querySelector('.sources a')?.href ?? '', words: row.querySelectorAll('.first-words').length }))`,
    );
    check(
      'a row per measure, each with its link into the official page',
      shownRows.length === 3 && shownRows.every((row) => row.href.startsWith(OFFICIAL)),
      JSON.stringify(shownRows.map((row) => row.href)).slice(0, 200),
    );
    check(
      'a measure with a read sentence shows it; one without keeps its link alone',
      shownRows[0]?.gist === sentence(rows[0] ?? '') &&
        shownRows[1]?.gist === sentence(rows[1] ?? '') &&
        shownRows[2]?.gist === '',
      JSON.stringify(shownRows.map((row) => row.gist)),
    );
    // A link that stands alone shows the first words its measure allows (D16.32); a read
    // sentence already says what the measure provides.
    const policy = await page.evaluate<string>(
      "document.querySelector('#search').dataset.firstWords",
    );
    check(
      'first words stand under a link alone, as the citation policy allows — never under a sentence',
      shownRows[0]?.words === 0 &&
        shownRows[1]?.words === 0 &&
        (policy === 'search' ? (shownRows[2]?.words ?? 0) <= 1 : shownRows[2]?.words === 0),
      JSON.stringify(shownRows.map((row) => row.words)),
    );
    check(
      'a field the contract does not name never reaches the page',
      !(await text('#chat-sheet')).includes('debug'),
    );
    const offer = await text(`${LAST} .c-offer`);
    check(
      'the offer stands in place of the explanation: who would explain, and what it is sent',
      /Une IA peut expliquer ces mots/.test(offer) &&
        offer.includes(MODEL) &&
        /Cloudflare/.test(offer) &&
        /Ta question ne lui est pas envoyée/.test(offer) &&
        /seulement les mots de ces phrases/.test(offer),
      offer,
    );
    check(
      '…and nothing of an agreement to send a question: there is none to give',
      !/J’accepte|15 ans|rien sur toi|telle que tu l’as écrite/.test(offer),
      offer,
    );
    const buttons = await page.evaluate<string[]>(
      `Array.from(document.querySelectorAll(${JSON.stringify(`${LAST} .c-offer button`)})).map((b) => b.textContent.trim())`,
    );
    check(
      'one button, and it says what it does',
      buttons.length === 1 && buttons[0] === 'Expliquer avec l’IA',
      JSON.stringify(buttons),
    );
    check(
      'the offer links to what leaves, and where',
      (await page.locator(`${LAST} .c-offer a`).getAttribute('href')) ===
        '/confidentialite/#demander',
    );
    check(
      'the focus is in the sheet',
      await page.evaluate<boolean>(
        "document.querySelector('#chat-sheet').contains(document.activeElement)",
      ),
    );
    check(
      'no explanation is shown before the button is pressed',
      (await count('[data-generated-by]')) === 0,
    );

    // --- 3 bis. not pressing is refusing: another question, and still nothing is asked
    const waited = await ask('et les retraites');
    check(
      'a second question without the button: its sentences, the offer under it — and no call',
      waited.includes('et les retraites') &&
        (await count('#chat-thread .c-offer')) === 1 &&
        (await count(`${LAST} .c-offer`)) === 1 &&
        posted.chat.length === 0,
      String(posted.chat.length),
    );
    await page.click('#chat-clear');
    await page.fill('#chat-q', QUESTION);
    await page.press('#chat-q', 'Enter');
    await until(page, `document.querySelector(${JSON.stringify(`${LAST} .c-offer`)}) !== null`);

    // --- 4. the button: an explanation is asked once — and the question is not in it
    await page.click(`${LAST} [data-offer="accept"]`);
    await until(
      page,
      `document.querySelector(${JSON.stringify(`${LAST} [data-generated-by="ai"]`)}) !== null`,
    );
    check('pressed: one request goes to /api/chat', posted.chat.length === 1);
    const chatBody = JSON.parse(posted.chat[0] ?? '{}') as Record<string, unknown>;
    check(
      'the request is measures, words, cards and the state of the book — nothing else',
      JSON.stringify(Object.keys(chatBody).sort()) === '["cards","corpus","ids","words"]' &&
        chatBody['corpus'] === corpus,
      JSON.stringify(Object.keys(chatBody)),
    );
    check(
      'the measures named are those whose read sentence is on the screen',
      JSON.stringify(chatBody['ids']) === JSON.stringify(rows.slice(0, 2)),
      JSON.stringify(chatBody['ids']),
    );
    // What the page computed is what the pure rule computes from the same sentences: the one
    // word of the question that is a word of ours.
    const expected = askedWords(
      QUESTION,
      rows.slice(0, 2).map((id) => inBase(id)),
    );
    check(
      'the words sent are words of OUR sentences that the question uses — here, one',
      expected.length === 1 && JSON.stringify(chatBody['words']) === JSON.stringify(expected),
      JSON.stringify(chatBody['words']),
    );
    check(
      'the question is not in the request: no field for it, and no word of it that is not ours',
      !('question' in chatBody) &&
        !/zorglub|montcuq|infirmi|\bmoi\b/i.test(posted.chat[0] ?? '') &&
        !(posted.chat[0] ?? '').includes(QUESTION),
      (posted.chat[0] ?? '').slice(0, 200),
    );
    const explained = await text(`${LAST} .c-ai`);
    check(
      'the explanation is shown, with its label in the text itself',
      /Une première explication d’essai\. Une seconde, sur un autre mot\./.test(explained) &&
        explained.includes(`IA · ${MODEL}`),
      explained,
    );
    check(
      'what a model wrote carries a mark a machine can read — and only that',
      (await count(`${LAST} .c-ai [data-generated-by="ai"]`)) === 1 &&
        (await count('.c-gists [data-generated-by], .c-plain [data-generated-by]')) === 0,
    );
    check(
      'the mention says an AI wrote it, which, where — and what it does not say',
      /Écrit par une IA/.test(explained) && /pas le programme/.test(explained),
      explained,
    );
    check(
      '« Comment c’est fabriqué » leads to the accuracy page',
      (await page.locator(`${LAST} .c-ai .ref a`).getAttribute('href')) === '/exactitude/',
    );
    check(
      '« Ne plus demander à l’IA » stays within reach once the AI is on',
      (await page.locator('#chat-ai-stop').isVisible()) &&
        !(await page.locator('#chat-ai-start').isVisible()),
    );

    // --- 4 bis. a follow-up is a word, never a text: nothing of the thread travels back
    const follow = page.locator(`${LAST} .c-ai .c-actions button`);
    check('two follow-ups are offered', (await follow.count()) === 2, String(await follow.count()));
    await follow.filter({ hasText: 'Plus simple' }).click();
    await until(
      page,
      `document.querySelectorAll(${JSON.stringify(`${LAST} [data-generated-by="ai"]`)}).length === 2`,
    );
    const followBody = JSON.parse(posted.chat[1] ?? '{}') as Record<string, unknown>;
    check(
      'a follow-up sends the same request with one word more',
      posted.chat.length === 2 &&
        JSON.stringify(Object.keys(followBody).sort()) ===
          '["cards","corpus","follow","ids","words"]' &&
        followBody['follow'] === 'simpler' &&
        JSON.stringify(followBody['words']) === JSON.stringify(chatBody['words']) &&
        JSON.stringify(followBody['ids']) === JSON.stringify(chatBody['ids']),
      JSON.stringify(followBody).slice(0, 200),
    );
    check(
      'no sentence of the model, nor of the thread, is sent back',
      !/explication|Phrase relue|history|messages/i.test(posted.chat[1] ?? ''),
    );
    check(
      'a follow-up asked once is not offered again; the other stays',
      (await text(`${LAST} .c-ai .c-actions`)).trim() === 'Un exemple',
      await text(`${LAST} .c-ai .c-actions`),
    );
    check(
      'the focus stays in the sheet after a follow-up',
      await page.evaluate<boolean>(
        "document.querySelector('#chat-sheet').contains(document.activeElement)",
      ),
    );

    // --- 4 ter. the next question: the AI is on for the page, and explains without a new press
    const second = await ask('la retraite à soixante ans');
    check(
      'a second question gets its turn under the first',
      (await count('#chat-thread .c-turn')) === 2 && second.includes('la retraite à soixante ans'),
    );
    check(
      '…its read sentences, then its explanation, without a second press',
      posted.gists.length === 4 &&
        posted.chat.length === 3 &&
        (await count(`${LAST} .c-offer`)) === 0 &&
        (await count(`${LAST} [data-generated-by="ai"]`)) === 1,
      `${String(posted.gists.length)} / ${String(posted.chat.length)}`,
    );
    check(
      'the first turn keeps what was explained',
      (await count('#chat-thread .c-turn:first-child [data-generated-by="ai"]')) === 2,
    );

    // --- 5. every other state is a normal one
    for (const [label, as] of [
      ['the model has nothing to explain', 'rien'],
      ['the Worker fails on the explanation', 'panne'],
      ['the Worker answers gibberish', 'charabia'],
      ['the explanation is for another state of the book', 'autre livre'],
    ] as const) {
      sim.chat = as;
      const turn = await ask('la retraite à soixante ans');
      check(
        `${label}: the read sentences stand alone`,
        (await count(`${LAST} .c-gists .c-row`)) >= 1 && (await count(`${LAST} .c-ai`)) === 0,
      );
      check(`${label}: no word of failure`, !FAILURE.test(turn), turn.slice(0, 200));
    }
    sim.chat = 'explique';
    for (const [label, as] of [
      ['the base is closed', 'local'],
      ['the Worker fails on the sentences', 'panne'],
      ['the Worker answers gibberish for the sentences', 'charabia'],
      ['the sentences are for another state of the book', 'autre livre'],
    ] as const) {
      sim.gists = as;
      const before = posted.chat.length;
      const turn = await ask('la retraite à soixante ans');
      const links = await count(`${LAST} .c-gists .sources a`);
      check(
        `${label}: the measures keep their links, at most three`,
        links >= 1 && links <= 3,
        String(links),
      );
      check(
        `${label}: no sentence, no AI, no question sent`,
        (await count(`${LAST} .c-gists .c-row > p:not(.sources)`)) === 0 &&
          (await count(`${LAST} .c-ai`)) === 0 &&
          posted.chat.length === before,
      );
      check(`${label}: no word of failure`, !FAILURE.test(turn), turn.slice(0, 200));
    }
    sim.gists = 'fermée';
    {
      const before = posted.chat.length;
      await ask('la retraite à soixante ans');
      check(
        'the model does not answer now: the read sentences are shown, the question stays',
        (await count(`${LAST} .c-gists .c-row > p:not(.sources)`)) === 3 &&
          (await count(`${LAST} .c-ai`)) === 0 &&
          posted.chat.length === before,
      );
    }
    sim.gists = 'silence';
    {
      const silent = await ask('la retraite un jour de scrutin');
      check(
        'silence: the sheet says when questions reopen, and nothing else',
        /Les questions reprennent/.test(silent) &&
          /18 avril/.test(silent) &&
          (await count(`${LAST} .c-gists`)) === 0,
        silent,
      );
    }
    sim.gists = 'toutes';

    // An objection a person answered: « En clair » first — and the question never leaves.
    {
      const before = posted.chat.length;
      const typed = objection.objection.replace(/[«»]/g, '').trim();
      await ask(typed);
      const plain = await text(`${LAST} .c-plain`);
      check(
        'an objection we answered is recognised on the phone, and answered « en clair »',
        /En clair/.test(plain) && /Relu par un humain/.test(plain) && plain.length > 120,
        plain.slice(0, 160),
      );
      check(
        '…with the link to the answer a person wrote',
        (await page.locator(`${LAST} .c-plain a`).getAttribute('href')) === `/r/${objection.slug}/`,
      );
      check(
        '…the read sentences come all the same; nothing is asked of the AI, on or not',
        (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
          (await count(`${LAST} .c-ai`)) === 0 &&
          posted.chat.length === before,
      );
    }
    {
      await ask('c’est quoi la règle verte ?');
      const plain = await text(`${LAST} .c-plain`);
      check(
        'a notion we wrote a card for is explained by the card first',
        /En clair/.test(plain) && /Relu par un humain/.test(plain) && /Voir la carte/.test(plain),
        plain.slice(0, 200),
      );
      check(
        '…with the link to its card',
        (await page.locator(`${LAST} .c-plain a`).getAttribute('href')) === '/mot/regle-verte/',
      );
      check(
        '…and the model may still explain its words',
        (await count(`${LAST} [data-generated-by="ai"]`)) === 1,
      );
    }
    {
      const before = [posted.gists.length, posted.chat.length];
      const nothing = await ask('zorglub montcuq');
      check(
        'nothing found: said of the words, never of the programme',
        /Rien trouvé avec ces mots/.test(nothing) &&
          !/n’en parle pas|ne traite pas|aucune mesure ne/i.test(nothing),
        nothing,
      );
      check(
        '…and nothing was sent: there was nothing to send',
        posted.gists.length === before[0] && posted.chat.length === before[1],
      );
      const vote = await ask('franchement je dois voter pour qui ?');
      check(
        'whom to vote for: « Ici, on ne parle que du programme. »',
        /Ici, on ne parle que du programme/.test(vote),
        vote,
      );
      check(
        '…no measure shown, nothing sent',
        (await count(`${LAST} .c-gists`)) === 0 &&
          posted.gists.length === before[0] &&
          posted.chat.length === before[1],
      );
    }

    // --- 6. a sentence of the base, a sentence of the model: text, never markup
    sim.gists = 'balise';
    sim.chat = 'balise';
    {
      const hostile = await ask('la retraite à soixante ans');
      const injected = await count(
        '#chat-sheet img, #chat-sheet script:not(#chat-config), #chat-sheet [onerror]',
      );
      check('markup in a sentence creates no element', injected === 0, String(injected));
      check(
        '…and is shown as the text it is',
        hostile.includes('<img src=x') && hostile.includes('<script>alert(2)</script>'),
      );
      check('…and runs nothing', dialogs.length === 0, dialogs.join(' '));
    }
    sim.gists = 'toutes';

    // --- 5 bis. the allowance spent: this question gets no explanation, the next is not sent
    sim.chat = 'épuisé';
    {
      const spent = await ask('la retraite à soixante ans');
      check(
        'the allowance spent: no explanation, no word of it',
        (await count(`${LAST} .c-ai`)) === 0 &&
          !FAILURE.test(spent) &&
          !/quota|limite/i.test(spent),
      );
      const before = posted.chat.length;
      sim.chat = 'explique';
      await ask('et les loyers ?');
      check(
        '…and no question leaves any more on this page: the read sentences answer alone',
        posted.chat.length === before &&
          (await count(`${LAST} .c-gists .c-row`)) >= 1 &&
          (await count(`${LAST} .c-ai`)) === 0,
      );
    }

    // --- 6 bis. after a dozen turns the sheet has not moved: only its thread scrolls
    {
      const frame = await page.evaluate<{
        sheet: number;
        over: number;
        head: number;
        top: number;
        field: number;
        bottom: number;
        page: number;
      }>(
        "(() => { const d = document.querySelector('#chat-sheet'); const box = (e) => e.getBoundingClientRect(); return { sheet: d.scrollTop, over: d.scrollHeight - d.clientHeight, head: Math.round(box(d.querySelector('.c-head')).top), top: Math.round(box(d).top), field: Math.round(box(d.querySelector('.c-foot')).bottom), bottom: Math.round(box(d).bottom), page: window.scrollY }; })()",
      );
      check(
        'the sheet itself never scrolls: its head and its field stay where they are',
        frame.sheet === 0 &&
          frame.over <= 0 &&
          frame.head >= frame.top &&
          frame.field <= frame.bottom,
        JSON.stringify(frame),
      );
      check('…and the page behind it has not moved', frame.page === 0, String(frame.page));
      const last = await page.evaluate<{ top: number; scroll: number }>(
        `(() => { const s = document.querySelector('#chat-scroll'); const t = document.querySelector(${JSON.stringify(LAST)}); return { top: Math.round(t.getBoundingClientRect().top - s.getBoundingClientRect().top), scroll: s.scrollTop }; })()`,
      );
      check(
        'the last question stands at the top of what scrolls, its answer under it',
        last.scroll > 0 && last.top >= -1 && last.top <= 24,
        JSON.stringify(last),
      );
    }

    // --- 7. nothing written on the phone; the thread emptied, the sheet closed and reopened
    check(
      'after a whole conversation nothing was written: no storage, no address',
      (await page.evaluate<string>(
        'JSON.stringify([Object.keys(localStorage), Object.keys(sessionStorage)])',
      )) === stored && page.url() === `${origin}/`,
      page.url(),
    );
    check(
      'no page says the programme does not speak of something',
      !/n’en parle pas|ne traite pas|aucune mesure ne/i.test(await text('#chat-thread')),
    );
    await page.click('#chat-clear');
    check(
      '« Effacer la conversation » empties the thread',
      (await count('#chat-thread .c-turn')) === 0,
    );
    await page.keyboard.press('Escape');
    await until(page, "!document.querySelector('#chat-sheet').open");
    check(
      'Escape closes the sheet and gives the focus back to its button',
      (await page.evaluate<string>('document.activeElement.id')) === 'ask',
      await page.evaluate<string>('document.activeElement.id'),
    );
    await page.click('#ask');
    await until(page, "document.querySelector('#chat-sheet').open");
    await until(page, settled);
    check(
      'reopened: what is in the field is asked again, once',
      (await count('#chat-thread .c-turn')) === 1,
    );
    await page.keyboard.press('Escape');
    await page.click('#ask');
    await until(page, "document.querySelector('#chat-sheet').open");
    await page.waitForTimeout(300);
    check(
      'closed and reopened: the thread is still there, and nothing is asked twice',
      (await count('#chat-thread .c-turn')) === 1,
    );
    await page.keyboard.press('Escape');
    // Leaving the page and coming back: the thread is gone.
    await page.goto(`${origin}/sommaire/`);
    await page.goBack();
    await until(page, "document.querySelector('#ask') && !document.querySelector('#ask').disabled");
    check(
      'back from another page: the sheet is closed and the thread empty',
      (await page.evaluate<boolean>("document.querySelector('#chat-sheet').open === false")) &&
        (await count('#chat-thread .c-turn')) === 0,
    );

    // --- 8. the policy, here and elsewhere
    const policyOf = (path: string): string => {
      const html = readFileSync(join(ROOT, path), 'utf8');
      return /http-equiv="content-security-policy" content="([^"]*)"/.exec(html)?.[1] ?? '';
    };
    for (const other of ['index.html', 'sommaire/index.html', 'exactitude/index.html']) {
      check(`${other} opens no third party`, !policyOf(other).includes('https://'));
    }
    check(
      'nothing we ship violates the Content-Security-Policy',
      violations.length === 0,
      violations.slice(0, 3).join(' | '),
    );
    check(
      'no request went to anyone but us, from the first paint to the last answer',
      escaped.length === 0,
      escaped.slice(0, 3).join(' '),
    );
    await context.close();

    // --- 8 bis. ten minutes on the page: a question still gets its sentences and, once asked,
    // its explanation. The hour of the server, read at arrival, ages with the device's clock —
    // it used not to, and five minutes after arriving every question stayed on the phone.
    {
      const late = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const view = await late.newPage();
      await guard(view);
      await view.goto(`${origin}/`);
      await until(
        view,
        "document.querySelector('#ask') && !document.querySelector('#ask').disabled",
      );
      const sent = [posted.gists.length, posted.chat.length];
      sim.gists = 'toutes';
      sim.chat = 'explique';
      await view.clock.setFixedTime(new Date(Date.now() + 10 * 60 * 1000));
      await view.fill('#q', 'la retraite, dix minutes plus tard');
      await view.click('#ask');
      await until(view, "document.querySelector('#chat-thread .c-offer') !== null");
      await view.click('#chat-thread [data-offer="accept"]');
      await until(view, "document.querySelector('#chat-thread [data-generated-by]') !== null");
      check(
        'ten minutes after arriving, a question is still answered and, on request, explained',
        posted.gists.length === (sent[0] ?? 0) + 1 && posted.chat.length === (sent[1] ?? 0) + 1,
      );
      await late.close();
    }

    // --- 8 ter. once painted, the page does not move (Chromium is the engine that measures it)
    if (name === 'chromium') {
      const shift = await lateLayoutShift(browser, `${origin}/`);
      check(
        'the page does not move once painted, even when its scripts arrive late',
        shift < STILL,
        shift.toFixed(4),
      );
    }

    // --- 8 quater. accessibility of the open sheet (Chromium: axe is injected, so the policy
    // is bypassed), with the offer, then with an explanation
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
        await view.fill('#q', 'c’est quoi la règle verte ?');
        await view.click('#ask');
        await until(view, "document.querySelector('#chat-thread .c-offer') !== null");
        await view.addScriptTag({ content: axe });
        const audit = async (): Promise<string[]> => {
          // The sheet rises in 180 ms, from transparent: audited before it has landed, its
          // text is judged at half its colour — a contrast failure that no reader ever sees,
          // and that a slow machine reports two times in three (CI, 14/11/2026). What is
          // judged is the sheet as it stands.
          await view.evaluate(
            'Promise.all(document.getAnimations().map((a) => a.finished.catch(() => undefined)))',
          );
          const result: { violations: { id: string; impact: string | null }[] } =
            await view.evaluate('window.axe.run(document, { resultTypes: ["violations"] })');
          return result.violations
            .filter((v) => v.impact === 'serious' || v.impact === 'critical')
            .map((v) => v.id);
        };
        const asked = await audit();
        check(
          `the sheet with its offer passes the accessibility audit at ${label}`,
          asked.length === 0,
          asked.join(','),
        );
        await view.click('#chat-thread [data-offer="accept"]');
        await until(view, "document.querySelector('#chat-thread [data-generated-by]') !== null");
        const answered = await audit();
        check(
          `the sheet with an explanation passes the accessibility audit at ${label}`,
          answered.length === 0,
          answered.join(','),
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
    console.error(`e2e-ask: no ${ROOT}/ — run \`npm run build:ask\` first`);
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
