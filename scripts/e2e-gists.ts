/**
 * End-to-end checks of the editor's reading desk (scripts/gists-2026.ts, `--serve`), in three
 * browser engines — on an INVENTED book (scripts/gists-fixture.ts): the page is the one place
 * where the text of the programme is shown, so nothing here may hold a word of it, and nothing
 * needs to. The desk is started on this machine, on a port the system gives, and stopped at
 * the end.
 *
 *   npx tsx scripts/e2e-gists.ts            Chromium, Firefox, WebKit
 *   npx tsx scripts/e2e-gists.ts --engines chromium
 *
 * What the unit tests cannot hold — the script of the page, which no gate reads — is held
 * here:
 *   1. the page comes up whole behind its token, and not at all without it;
 *   2. a key keeps a sentence: the choice is posted at once, its block folds, the next one
 *      takes the focus, the count moves;
 *   3. « Revenir » reopens the last verdict, and another choice replaces it;
 *   4. « Corriger » opens the box with the sentence in it; a sentence the control refuses is
 *      not kept, its rule is named, and the box keeps the focus; a digit typed in the box is a
 *      character, never a verdict; Enter keeps a sentence that passes;
 *   5. the keys move between the measures still open, and Escape closes the box;
 *   6. the mouse does what the keys do;
 *   7. at the end of the lot the focus is on the next one;
 *   8. a measure whose verdict no longer holds is back, with the sentence that was kept;
 *   9. the page asks for nothing but itself and its own endpoint, and breaks no rule of its
 *      own policy; at 320 px it does not scroll sideways.
 */
import type { Page } from 'playwright';
import { ENGINES, checker, report, type Outcome } from './e2e-kit.js';
import { DEFAULT_WRITERS, measureTexts, startDesk, type DeskDeps } from './gists-2026.js';
import type { RunLine, VerdictLine } from './gists-core.js';
import {
  BOOKMOBILES,
  BUSES,
  LIBRARY,
  MANIFEST,
  PRIVATE,
  TREES,
  run,
  said,
  verdict,
} from './gists-fixture.js';

const TOKEN = '5eedc0de5eedc0de5eedc0de5eedc0de';
const SECOND = 'Chaque commune ouvre une bibliothèque de quartier tous les jours de la semaine.';

/** Four measures to read: the first has two sentences, the last lacks a label. */
const RUNS: readonly RunLine[] = [
  run(LIBRARY, {
    judges: [
      { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
      { model: 'llama-3.3-70b', verdict: 'ajout', answered: true },
    ],
  }),
  run(LIBRARY, {
    writer: 'mistral-small-3.1',
    text: SECOND,
    judges: [{ model: 'gemma-4-26b', verdict: 'ecart', answered: true }],
  }),
  run(TREES),
  run(BUSES),
  run(BOOKMOBILES, {
    judges: [
      { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
      { model: 'llama-3.3-70b', verdict: null, answered: false },
    ],
  }),
];

interface Desk {
  origin: string;
  kept: VerdictLine[];
  printed: string[];
  close: () => Promise<void>;
}

async function desk(already: readonly VerdictLine[] = []): Promise<Desk> {
  const kept: VerdictLine[] = [...already];
  const printed: string[] = [];
  let nonce = 0;
  const deps: DeskDeps = {
    token: TOKEN,
    manifest: MANIFEST,
    minOverlap: 0.5,
    lot: 150,
    unwritten: false,
    only: '',
    writers: DEFAULT_WRITERS,
    texts: () => measureTexts(PRIVATE),
    runs: () => [...RUNS],
    verdicts: () => [...kept],
    record: (line) => {
      kept.push(line);
    },
    today: () => '2026-11-16',
    nonce: () => {
      nonce += 1;
      return Buffer.from(`nonce-${String(nonce)}`).toString('base64');
    },
    print: (line) => {
      printed.push(line);
    },
  };
  const server = await startDesk(deps, 0);
  const address = server.address();
  const port = typeof address === 'object' && address !== null ? address.port : 0;
  return {
    origin: `http://127.0.0.1:${String(port)}`,
    kept,
    printed,
    close: () =>
      new Promise((done) => {
        server.close(() => {
          done();
        });
      }),
  };
}

const text = async (page: Page, selector: string): Promise<string> =>
  (await page.locator(selector).first().textContent()) ?? '';
const current = (page: Page): Promise<string | null> =>
  page.locator('article.current').first().getAttribute('data-id');
const folded = (page: Page, id: string): Promise<unknown> =>
  page.waitForSelector(`article[data-id="${id}"].done`);

async function runEngine(name: string): Promise<Outcome> {
  const type = ENGINES[name];
  const { out, check } = checker(name);
  if (type === undefined) {
    check('a known engine', false, name);
    return out;
  }
  const browser = await type.launch();
  const first = await desk();
  const url = `${first.origin}/${TOKEN}/`;
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const troubles: string[] = [];
    const asked: string[] = [];
    page.on('console', (message) => {
      // A browser looks for an icon by itself; the policy of the page refuses even that, and
      // one engine says so in the console. It is the browser's request, not the page's.
      if (message.text().includes('/favicon.ico')) return;
      if (message.type() === 'error' || message.type() === 'warning') troubles.push(message.text());
    });
    page.on('pageerror', (error) => troubles.push(error.message));
    page.on('request', (request) =>
      asked.push(`${request.method()} ${new URL(request.url()).pathname}`),
    );

    // 1. Behind its token, whole; without it, nothing.
    const refused = await page.goto(`${first.origin}/`);
    check('without the token the desk answers 404', refused?.status() === 404);
    asked.length = 0;
    troubles.length = 0;
    await page.goto(url);
    check('the lot is on the page', (await page.locator('article').count()) === 4);
    check(
      'the banner says what the page holds',
      (await text(page, '.banner')) ===
        'Page locale : elle contient le texte du livre, ne pas partager',
    );
    check('the first measure is the current one', (await current(page)) === LIBRARY);
    check('the count starts at the lot', (await text(page, '#left-lot')) === '4');

    // 2. A key keeps a sentence.
    await page.keyboard.press('1');
    await folded(page, LIBRARY);
    check(
      '« 1 » keeps the first sentence, at once',
      first.kept.length === 1 &&
        first.kept[0]?.writer === 'gemma-4-26b' &&
        first.kept[0].text === said(LIBRARY),
      JSON.stringify(first.kept.map((line) => [line.id, line.writer])),
    );
    check('the next measure takes the focus', (await current(page)) === TREES);
    check(
      'the count moves',
      (await text(page, '#left-lot')) === '3' && (await text(page, '#ruled')) === '1',
    );
    check(
      'the folded block says what was kept',
      /^Fidèle — Gemma 4 26B — enregistré/.test(await text(page, 'article.done .recorded')),
    );

    // 3. « Revenir », and another choice.
    await page.keyboard.press('u');
    await page.waitForSelector(`article[data-id="${LIBRARY}"]:not(.done)`);
    check('« u » reopens the last verdict', (await current(page)) === LIBRARY);
    await page.keyboard.press('2');
    await folded(page, LIBRARY);
    check(
      'another choice replaces the first',
      first.kept.length === 2 &&
        first.kept[1]?.writer === 'mistral-small-3.1' &&
        first.kept[1].text === SECOND,
    );

    // 4. « Corriger »: refused with its rule, then kept.
    await page.keyboard.press('c');
    const area = page.locator('article.current textarea');
    await area.waitFor({ state: 'visible' });
    check('« c » opens the box with the sentence in it', (await area.inputValue()) === said(TREES));
    await area.fill('Le programme prévoit de planter 400 arbres fruitiers chaque année.');
    await area.press('Enter');
    const refusal = page.locator('article.current .refusal');
    await refusal.waitFor({ state: 'visible' });
    check(
      'a sentence the control refuses is not kept, and its rule is named',
      first.kept.length === 2 &&
        /\(règle « number »\)\.$/.test((await refusal.textContent()) ?? ''),
      (await refusal.textContent()) ?? '',
    );
    check(
      'the box keeps the focus after a refusal',
      (await page.evaluate(() => document.activeElement?.tagName)) === 'TEXTAREA',
    );
    await area.press('0');
    await area.press('u');
    check(
      'a key typed in the box is a character, never a verdict',
      first.kept.length === 2 && (await area.inputValue()).endsWith('0u'),
    );
    await area.fill('Le programme prévoit de planter chaque année 300 arbres fruitiers ici.');
    await area.press('Enter');
    await folded(page, TREES);
    check(
      'Enter keeps a sentence that passes, under the editor’s name',
      first.kept.length === 3 &&
        first.kept[2]?.writer === 'editor' &&
        first.kept[2].from === 'gemma-4-26b',
    );

    // 5. The keys move; Escape closes the box.
    check('the focus went on', (await current(page)) === BUSES);
    await page.keyboard.press('j');
    const down = await current(page);
    await page.keyboard.press('k');
    check('« j » and « k » move between open measures', down === BOOKMOBILES);
    check('…and back', (await current(page)) === BUSES);
    await page.keyboard.press('c');
    await page.locator('article.current textarea').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    check('Escape closes the box', await page.locator('article.current form').isHidden());

    // 6. The mouse.
    await page.locator(`article[data-id="${BOOKMOBILES}"] button[data-action="link-only"]`).click();
    await folded(page, BOOKMOBILES);
    check(
      'a click keeps the link alone, pinned to the measure above it too',
      first.kept[3]?.verdict === 'link-only' && first.kept[3].lead_sha256 !== undefined,
    );

    // 7. The end of the lot.
    await page.keyboard.press('0');
    await folded(page, BUSES);
    check('« 0 » keeps the link alone', first.kept[4]?.verdict === 'link-only');
    check(
      'the lot is over, and the focus is on the next one',
      (await text(page, '#left-lot')) === '0' &&
        (await page.evaluate(() => document.activeElement?.textContent)) === 'Lot suivant',
    );
    await page.keyboard.press('Enter');
    await page.getByText('Rien à lire pour l’instant').waitFor();
    check(
      'Enter opens the next lot: nothing is left',
      (await page.locator('article').count()) === 0,
    );

    // 9. Nothing but itself and its endpoint, and no rule of its own policy broken.
    const paths = [...new Set(asked)].sort();
    check(
      'the page asks for itself and its endpoint, nothing else',
      paths.join(' ') === `GET /${TOKEN}/ POST /${TOKEN}/verdict`,
      paths.join(' '),
    );
    check('no error, no refusal of its own policy', troubles.length === 0, troubles.join(' | '));
    check(
      'the terminal was told identifiers and verdicts',
      first.printed.join(' ') ===
        `${LIBRARY} read (gemma-4-26b) ${LIBRARY} read (mistral-small-3.1) ${TREES} read (editor) ` +
          `${BOOKMOBILES} link-only ${BUSES} link-only`,
      first.printed.join(' '),
    );
    await page.close();
  } finally {
    await first.close();
  }

  // 8. A verdict that no longer holds: the measure is back, with the sentence that was kept.
  const mine = 'Le programme prévoit 500 bibliothèques de quartier dans les communes.';
  const second = await desk([verdict(LIBRARY, { writer: 'editor', text: mine }), verdict(TREES)]);
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 640 } });
    await page.goto(`${second.origin}/${TOKEN}/`);
    const block = page.locator(`article[data-id="${LIBRARY}"]`);
    check(
      'a measure whose kept sentence the control refuses today is back',
      (await page.locator('article').count()) === 3 &&
        /Déjà lue le 2026-11-16/.test((await block.textContent()) ?? ''),
    );
    check(
      'the sentence that was kept is offered, without « Fidèle »',
      (await block.locator('.candidate').count()) === 3 &&
        (await block.locator('.candidate').nth(2).locator('.sentence').textContent()) === mine &&
        (await block.locator('[data-action="read"]').count()) === 2,
    );
    // 9. A narrow window.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    check('at 320 px the page does not scroll sideways', overflow <= 0, `${String(overflow)} px`);
    await page.close();
  } finally {
    await second.close();
  }

  // 10. A key rules once, on the block the editor is in, whatever his keyboard writes, and
  // never over what he typed (review 15, H2, H3, H21, H23).
  const third = await desk();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${third.origin}/${TOKEN}/`);
    // A keydown as the browser sends it, with what Playwright's keyboard cannot give: a repeat,
    // or a key that writes another character than its place says.
    const press = (init: { key: string; code: string; repeat?: boolean }): Promise<void> =>
      page.evaluate(({ key, code, repeat }) => {
        const target = document.activeElement ?? document.body;
        const repeated = repeat === true;
        target.dispatchEvent(
          new KeyboardEvent('keydown', { key, code, repeat: repeated, bubbles: true }),
        );
      }, init);
    const settled = (): Promise<void> => page.waitForTimeout(400);
    await press({ key: '1', code: 'Digit1', repeat: true });
    await settled();
    check('a key held down rules nothing by its repeats', third.kept.length === 0);
    // On a French keyboard, the key of « 1 » writes « & ».
    await press({ key: '&', code: 'Digit1' });
    await folded(page, LIBRARY);
    check(
      'the digit is read by its place on the keyboard: « & » on a French one',
      third.kept.length === 1 && third.kept[0]?.writer === 'gemma-4-26b',
    );
    await press({ key: '1', code: 'Digit1', repeat: true });
    await settled();
    check('…and its repeats rule nothing on the next measure', third.kept.length === 1);
    await press({ key: 'J', code: 'KeyJ' });
    check('a letter is read whatever the lock', (await current(page)) === BUSES);
    // The block the editor is in — the focus on one of its buttons — is the one ruled on.
    await page.locator(`article[data-id="${TREES}"] button[data-action="link-only"]`).focus();
    check('the focus selects its block', (await current(page)) === TREES);
    await press({ key: '0', code: 'Digit0' });
    await folded(page, TREES);
    check(
      'a key rules on the block that has the focus',
      third.kept[1]?.id === TREES && third.kept[1].verdict === 'link-only',
    );
    // What was typed is never replaced by « c ».
    await page.locator(`article[data-id="${BUSES}"] .book`).click();
    await page.keyboard.press('c');
    const box = page.locator(`article[data-id="${BUSES}"] textarea`);
    await box.waitFor({ state: 'visible' });
    await box.fill('Une phrase en cours, pas encore gardée.');
    await page.locator(`article[data-id="${BUSES}"] .book`).click();
    await page.keyboard.press('c');
    check(
      '« c » brings back the box as it was typed',
      (await box.inputValue()) === 'Une phrase en cours, pas encore gardée.',
    );
    await page.close();
  } finally {
    await third.close();
    await browser.close();
  }
  return out;
}

await report(runEngine);
