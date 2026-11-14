/**
 * End-to-end checks of « Où est-ce écrit ? » (lot L2), in three browser engines, on the test
 * build — the page as it will be once the list of words is validated (dist-ask/, which nothing
 * deploys).
 *
 *   npm run build:ask && npx tsx scripts/e2e-game.ts            Chromium, Firefox, WebKit
 *   npx tsx scripts/e2e-game.ts --engines chromium
 *
 * What is checked:
 *   1. without JavaScript the first round is whole and playable: three words, the six official
 *      titles in full, a card of the place for every tile, anchors that say a position only;
 *   2. the script takes the block over without moving the focus, with ONE request — a static
 *      file — and a whole round then sends nothing and writes nothing;
 *   3. a choice is never wrong: « Oui. » where the game shows the word, and otherwise where it
 *      is written, in the affirmative; the focus goes to the sentence that answers a gesture;
 *   4. the end of a round is the only moment anything changes: the turtle, then the depth of
 *      the questions — the chapter once a word was found in every part that has one;
 *   5. the game's own voice never judges, never counts against a total, and its buttons are
 *      never in the colour of action;
 *   6. the data cannot be had: the round of the HTML goes on working;
 *   7. the tab remembers from the first reveal, the phone only after « Garder ta tortue »; what
 *      is written never depends on a choice; another tab follows; the privacy page names every
 *      field that is really there and erases it; a storage that refuses breaks nothing;
 *   8. the turtle is a button that opens her sheet; she keeps her place on every screen, pushes
 *      nothing and carries no number; nothing moves 2.1 s after a gesture, a tap during her
 *      evolution reaches its target, and with less motion asked nothing starts at all;
 *   9. electoral silence: in a window the game is not shown and nothing of it is fetched — hidden
 *      by the guard of the <head> before any script of ours; a clock that disagrees with our
 *      server is not believed; the override closes it by hand; a freeze that starts during a
 *      round stops it, and the game is back when the window ends;
 *  10. the four screens of the game — question, card, end of round, her sheet — pass the
 *      accessibility audit, fit their window and keep 44 px targets under the nine conditions
 *      every page is audited under (320 px, 320 × 256, dark, fonts at 130, 150 and 200 %, a
 *      150 % zoom, reduced motion).
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Page } from 'playwright';
import {
  ROUND,
  depthOf,
  locate,
  otherParts,
  playable,
  type GameData,
} from '../src/lib/game-engine.js';
import { KEPT_FIELDS, STORAGE_KEY, TAB_FIELDS } from '../src/lib/game-state.js';
import { STORAGE_MAP } from '../src/lib/storage-map.js';
import type { Manifest } from './aec26-types.js';
import { CONDITIONS, rootFontScript } from './a11y-conditions.js';
import { ENGINES, checker, report, serve, until, type Outcome } from './e2e-kit.js';

const ROOT = 'dist-ask';

/** What the local server is told to do for a check: fail the game's data, or set its own hour. */
interface ServerState {
  failData: boolean;
  /** `/flags.json` as served: the hour in its `Date` header, and the override. Null: the file. */
  flags: { date: Date; override?: string } | null;
}
/** What the game's own voice never says (titles of the book are not ours, and are left out). */
const NEVER =
  /\b(?:faux|fausse|perdu|perdue|raté|ratée|erreur|mauvais|mauvaise|bravo|score|niveau|classement|points?)\b|%|\d\s*(?:\/|sur)\s*\d/i;

/** The text of the block that is ours: the word and the official titles removed. */
const OWN_VOICE = `(() => {
  const copy = document.querySelector('#jeu').cloneNode(true);
  for (const node of copy.querySelectorAll('[data-programme], script, [hidden]')) node.remove();
  return copy.textContent.replace(/\\s+/g, ' ').trim();
})()`;

/** Everything the two storages of the page hold, key by key: what a test reads of a phone. */
const stores = `(() => {
  const dump = (area) => Object.fromEntries(Object.keys(area).map((k) => [k, area.getItem(k)]));
  return { tab: dump(sessionStorage), phone: dump(localStorage) };
})()`;
interface Stores {
  tab: Record<string, string>;
  phone: Record<string, string>;
}

async function runEngine(
  name: string,
  origin: string,
  data: GameData,
  manifest: Manifest,
  server: ServerState,
  scrutin: { origin: string; state: ServerState } | null,
): Promise<Outcome> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const { out, check } = checker(name);
  const browser = await type.launch();
  const first = data.words.slice(0, ROUND);
  const partTitles = manifest.parts
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((p) => p.title);
  const sectionUrl = (id: string): string => manifest.sections.find((s) => s.id === id)?.url ?? '';
  /** Text as a reader sees it: every kind of space folded into one plain space. */
  const text = (value: string | null): string => (value ?? '').replace(/\s+/g, ' ').trim();
  const visibleHeadings = async (page: Page): Promise<string[]> =>
    (await page.locator('#jeu h3:visible').allTextContents()).map(text);

  try {
    // --- 1. without JavaScript
    {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        javaScriptEnabled: false,
      });
      const page = await context.newPage();
      await page.goto(`${origin}/`);
      check(
        'without script, the game is on the page, below the field',
        (await page.locator('#jeu').count()) === 1,
      );
      const words = (
        await page.locator('#game-static [data-programme="word"]').allTextContents()
      ).map(text);
      check(
        'the first round is in the HTML: the first three words of the list',
        JSON.stringify(words) === JSON.stringify(first.map((w) => w.word)),
        words.join(','),
      );
      check(
        'one question shows at a time',
        JSON.stringify(await visibleHeadings(page)) ===
          JSON.stringify(['Dans quelle partie est-il écrit ?']),
        (await visibleHeadings(page)).join(' | '),
      );
      const tiles = (await page.locator('.g-word-1 .g-tile').allTextContents()).map(text);
      check(
        'the six tiles are the six official titles, whole',
        JSON.stringify(tiles) === JSON.stringify(partTitles),
        tiles.join(' | '),
      );
      const hrefs = await page
        .locator('#game-static a[href^="#"]')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
      check(
        'an anchor says a position, never a word or an answer',
        hrefs.length > 0 && hrefs.every((h) => /^#(?:m[1-3](?:-[0-6])?|fin)$/.test(h)),
        hrefs.filter((h) => !/^#(?:m[1-3](?:-[0-6])?|fin)$/.test(h)).join(','),
      );

      // Every tile of the first word leads to its card, and the card never judges.
      const word = first[0];
      const place = word === undefined ? null : locate(data, word.section);
      if (word === undefined || place === null) throw new Error('the first word has no place');
      const also = otherParts(data, word.id);
      let cards = 0;
      for (let tile = 0; tile <= 6; tile += 1) {
        await page.goto(`${origin}/#m1-${String(tile)}`);
        const [heading = ''] = await visibleHeadings(page);
        const n = String(place.part.number);
        const expected =
          tile === place.part.number
            ? `Oui. C’est écrit dans la partie ${n}.`
            : also.includes(tile)
              ? `Oui, là aussi. Le jeu te montre la partie ${n}.`
              : `C’est écrit dans la partie ${n}.`;
        if (heading === expected && (await visibleHeadings(page)).length === 1) cards += 1;
      }
      check(
        'every tile, and « Je ne sais pas », leads to the card of the place',
        cards === 7,
        String(cards),
      );
      await page.goto(`${origin}/#m1-${String(place.part.number)}`);
      const where = (await page.locator('.g-word-1 .g-where li').allTextContents()).map(text);
      check(
        'the card names the part, the chapter and the section by their official titles',
        JSON.stringify(where) ===
          JSON.stringify([place.part.title, place.chapter.title, place.section.title]),
        where.join(' | '),
      );
      const cta = page.locator('.g-word-1 .g-place a.cta');
      check(
        '« C’est écrit là » leads to the section in the official book',
        (await cta.getAttribute('href')) === sectionUrl(word.section) &&
          (await cta.getAttribute('rel')) === 'noopener',
        (await cta.getAttribute('href')) ?? '',
      );
      check(
        'the tiles fold when the card shows',
        !(await page.locator('.g-word-1 .g-tiles').isVisible()),
      );
      // The whole round, link by link.
      await page.locator('.g-word-1 .g-place a.g-quiet').click();
      const second = text(await page.locator('[data-programme="word"]:visible').textContent());
      await page.locator('.g-word-2 .g-with a').click();
      await page.locator('.g-word-2 .g-place a.g-quiet').click();
      await page.locator('.g-word-3 .g-tile').first().click();
      await page.locator('.g-word-3 .g-place a.g-quiet').click();
      check(
        'the round is played to its end with links alone',
        second === first[1]?.word &&
          JSON.stringify(await visibleHeadings(page)) ===
            JSON.stringify(['Trois mots, trois endroits du livre.']) &&
          (await page.locator('.g-end a[href="/sommaire/"]').isVisible()),
        (await visibleHeadings(page)).join(' | '),
      );
      const voice: string = await page.evaluate(OWN_VOICE);
      check(
        'without script, the game’s voice never judges nor counts',
        !NEVER.test(voice),
        NEVER.exec(voice)?.[0],
      );
      const box: { sw: number; cw: number } = await page.evaluate(
        '({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })',
      );
      check('without script, nothing overflows at 390 px', box.sw <= box.cw, String(box.sw));
      await context.close();
    }

    // --- 2. the script takes the block over
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const requests: { url: string; method: string }[] = [];
    const violations: string[] = [];
    page.on('request', (r) => requests.push({ url: r.url(), method: r.method() }));
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()) && !/duplicate/i.test(m.text())) {
        violations.push(m.text());
      }
    });
    page.on('pageerror', (e) => violations.push(String(e)));
    await page.goto(`${origin}/`);
    await until(
      page,
      "document.querySelector('#game-live') && !document.querySelector('#game-live').hidden",
    );
    const outside = requests.filter((r) => !r.url.startsWith(origin));
    const game = requests.filter((r) => r.url.includes('/data/jeu-'));
    check(
      'nothing is asked of anyone but us',
      outside.length === 0,
      outside.map((r) => r.url).join(','),
    );
    check(
      'the game asks for one static file, whose address says nothing',
      game.length === 1 &&
        game[0]?.method === 'GET' &&
        /\/data\/jeu-[0-9a-f]{16}\.json$/.test(game[0].url),
      game.map((r) => r.url).join(','),
    );
    check(
      'the script arrives without taking the focus',
      await page.evaluate<boolean>('document.activeElement === document.body'),
    );
    check(
      'the round of the HTML has given way to the script’s',
      (await page.locator('#game-static').isHidden()) &&
        text(await page.locator('#game-live [data-programme="word"]').textContent()) ===
          first[0]?.word,
    );
    check(
      'nothing of her moves at arrival',
      await page.evaluate<boolean>('document.getAnimations().length === 0'),
    );
    await until(page, "document.querySelector('#jeu svg.turtle').hasAttribute('data-live')");

    // --- 3. a round: the right tile, another one, not knowing
    const seenBefore = requests.length;
    const playWord = async (index: number, how: 'here' | 'other' | 'unknown'): Promise<string> => {
      const word = first[index];
      const place = word === undefined ? null : locate(data, word.section);
      if (word === undefined || place === null) throw new Error(`no word at ${String(index)}`);
      const right = String(place.part.number);
      const taken = new Set([place.part.number, ...otherParts(data, word.id)]);
      const other = String(data.parts.map((p) => p.number).find((n) => !taken.has(n)) ?? 0);
      if (how === 'unknown') await page.getByRole('button', { name: 'Je ne sais pas' }).click();
      else
        await page
          .locator(`#game-live .g-tile[data-tile="${how === 'here' ? right : other}"]`)
          .click();
      return right;
    };
    let right = await playWord(0, 'here');
    check(
      'the right tile: « Oui. », and where',
      text(await page.locator('#game-live .g-place h3').textContent()) ===
        `Oui. C’est écrit dans la partie ${right}.`,
      text(await page.locator('#game-live .g-place h3').textContent()),
    );
    check(
      'the focus goes to the sentence of the card',
      await page.evaluate<boolean>(
        "document.activeElement === document.querySelector('#game-live .g-place h3')",
      ),
    );
    const firstPlace = locate(data, first[0]?.section ?? '');
    const shown = (await page.locator('#game-live .g-where li').allTextContents()).map(text);
    check(
      'the card names the place by its three official titles',
      JSON.stringify(shown) ===
        JSON.stringify([
          firstPlace?.part.title,
          firstPlace?.chapter.title,
          firstPlace?.section.title,
        ]),
      shown.join(' | '),
    );
    const href = (await page.locator('#game-live a.cta').getAttribute('href')) ?? '';
    check(
      '« C’est écrit là » leads to the measure in the official book',
      href.startsWith(sectionUrl(first[0]?.section ?? '-')) &&
        (await page.locator('#game-live a.cta').getAttribute('rel')) === 'noopener',
      href,
    );
    // The start of the measure first — it is where the page scrolls — then, where three
    // browsers were seen to light it up in that measure, the word itself.
    const fragment = (await page.locator('#game-live a.cta').getAttribute('data-fragment')) ?? '';
    check(
      '…with the directive of its measure, and of the word where it was seen lit',
      fragment === first[0]?.fragment &&
        /^text=[^&]+(?:&text=[^&]+)?$/.test(fragment) &&
        (href.endsWith(`:~:${fragment}`) || !href.includes(':~:')),
      `${fragment} | ${href.split('#')[1] ?? ''}`,
    );
    await page.getByRole('button', { name: 'Mot suivant' }).click();
    check(
      'the next word, and the focus on its question',
      text(await page.locator('#game-live [data-programme="word"]').textContent()) ===
        first[1]?.word &&
        (await page.evaluate<boolean>(
          "document.activeElement === document.querySelector('#game-live .g-ask')",
        )),
    );
    right = await playWord(1, 'other');
    check(
      'another tile: where the word is written, and nothing about the choice',
      text(await page.locator('#game-live .g-place h3').textContent()) ===
        `C’est écrit dans la partie ${right}.`,
      text(await page.locator('#game-live .g-place h3').textContent()),
    );
    let voice: string = await page.evaluate(OWN_VOICE);
    check('the card never judges nor counts', !NEVER.test(voice), NEVER.exec(voice)?.[0]);
    await page.getByRole('button', { name: 'Mot suivant' }).click();
    // A tile answers the keyboard like a finger.
    await page.locator('#game-live .g-tile').first().focus();
    await page.keyboard.press('Enter');
    check('a tile answers the keyboard', await page.locator('#game-live .g-place').isVisible());

    // --- 4. the end of a round
    await page.getByRole('button', { name: 'Mot suivant' }).click();
    check(
      'the end of the round says what was done, and takes the focus',
      text(await page.locator('#game-live .g-end h3').textContent()) ===
        'Trois mots, trois endroits du livre.' &&
        (await page.evaluate<boolean>(
          "document.activeElement === document.querySelector('#game-live .g-end h3')",
        )),
    );
    await page.waitForTimeout(1100);
    const turtle = (): Promise<{
      state: string | null;
      passage: boolean;
      arcs: (string | null)[];
    }> =>
      page.locator('#jeu svg.turtle').evaluate((svg) => ({
        state: svg.getAttribute('data-state'),
        passage: svg.hasAttribute('data-passage'),
        arcs: Array.from(svg.querySelectorAll('.t-arc')).map((a) =>
          a.getAttribute('stroke-dasharray'),
        ),
      }));
    const afterOne = await turtle();
    check(
      'she changes at the end of the round: her first arc, and the accent of a passage',
      afterOne.state === '1' &&
        afterOne.passage &&
        afterOne.arcs[0] !== '0 6' &&
        afterOne.arcs[1] === '0 6',
      JSON.stringify(afterOne),
    );
    check(
      'a round sent nothing',
      requests.length === seenBefore,
      requests
        .slice(seenBefore)
        .map((r) => r.url)
        .join(','),
    );
    const stored: number = await page.evaluate('localStorage.length');
    check('nothing is kept on the phone that was not asked for', stored === 0, String(stored));
    await page.getByRole('button', { name: 'Trois autres mots' }).click();
    check(
      'the next round is the next three words of the list, and the accent is gone',
      text(await page.locator('#game-live [data-programme="word"]').textContent()) ===
        data.words[3]?.word && !(await turtle()).passage,
    );

    // The depth: with every part that has a word found, the chapter is asked.
    const deepAfter = [1, 2, 3].find(
      (rounds) =>
        depthOf(
          data,
          data.words.slice(0, rounds * ROUND).map((w) => w.id),
        ) >= 2,
    );
    if (deepAfter === undefined) {
      check(
        'the list reaches every part that has a word within three rounds',
        false,
        String(playable(data).parts.size),
      );
    } else {
      for (let round = 1; round < deepAfter; round += 1) {
        for (let i = 0; i < ROUND; i += 1) {
          await page.getByRole('button', { name: 'Je ne sais pas' }).click();
          await page.getByRole('button', { name: 'Mot suivant' }).click();
        }
        if (round + 1 < deepAfter)
          await page.getByRole('button', { name: 'Trois autres mots' }).click();
      }
      voice = await page.evaluate(OWN_VOICE);
      check(
        'a word found in every part that has one: the game says it now asks the chapter',
        voice.includes('Maintenant, le jeu demande aussi le chapitre.'),
        voice,
      );
      check(
        'opening a depth is not a rank: the sentence never judges',
        !NEVER.test(voice),
        NEVER.exec(voice)?.[0],
      );
      // A passage rewards nobody: the lait-fraise line was withdrawn (D16.37 — none of the seven
      // personas received it well). No emoji in the sentences of the end of a round, no word of
      // congratulation, and nothing written in her drawing.
      const passage = await page.evaluate<{ text: string; inDrawing: string }>(`({
        text: document.querySelector('#game-live .g-end')?.textContent ?? '',
        inDrawing: document.querySelector('#jeu .g-turtle svg').textContent.trim(),
      })`);
      check(
        'at her second passage, the end of a round carries no emoji and congratulates nobody',
        passage.text !== '' &&
          !/\p{Extended_Pictographic}/u.test(passage.text) &&
          !/lait|fraise|mérit/i.test(passage.text) &&
          passage.inDrawing === '',
        passage.text,
      );
      await page.waitForTimeout(1100);
      const afterDepth = await turtle();
      check(
        'she has grown: her first arc is whole, the second has started',
        afterDepth.state === '2' && afterDepth.arcs[0] === '6 6' && afterDepth.arcs[1] !== '0 6',
        JSON.stringify(afterDepth),
      );
      await page.getByRole('button', { name: 'Trois autres mots' }).click();
      const word = data.words[deepAfter * ROUND];
      const place = word === undefined ? null : locate(data, word.section);
      if (word === undefined || place === null) throw new Error('no word after the depth opened');
      // The hint: three tiles say « par ici »; none is taken away.
      await page.getByRole('button', { name: 'Un indice' }).click();
      const marked = await page
        .locator('#game-live .g-tile:has(.g-mark)')
        .evaluateAll((tiles) => tiles.map((t) => (t as HTMLElement).dataset['tile'] ?? ''));
      check(
        'the hint points at three tiles, the right one among them, and rules none out',
        JSON.stringify(marked) === JSON.stringify(word.hint.map(String)) &&
          marked.includes(String(place.part.number)) &&
          (await page.locator('#game-live .g-tile').count()) === data.parts.length,
        marked.join(','),
      );
      check(
        'the hint is said in words, once',
        text(await page.locator('#game-status').textContent()).startsWith(
          'Elle regarde du côté des parties',
        ) && (await page.getByRole('button', { name: 'Un indice' }).count()) === 0,
        text(await page.locator('#game-status').textContent()),
      );
      await page.locator(`#game-live .g-tile[data-tile="${String(place.part.number)}"]`).click();
      const chapters = (await page.locator('#game-live .g-tile').allTextContents()).map(text);
      check(
        'after the part, the chapters of that part, by their official titles',
        text(await page.locator('#game-live .g-ask').textContent()) === 'Dans quel chapitre ?' &&
          text(await page.locator('#game-live .g-said').textContent()) ===
            `Oui. C’est écrit dans la partie ${String(place.part.number)}.` &&
          JSON.stringify(chapters) === JSON.stringify(place.part.chapters.map((c) => c.title)),
        chapters.join(' | '),
      );
      await page.locator(`#game-live .g-tile[data-tile="${place.chapter.id}"]`).click();
      check(
        'the right chapter: « Oui. », and its number',
        text(await page.locator('#game-live .g-place h3').textContent()) ===
          `Oui. C’est écrit dans le chapitre ${String(place.chapter.number)}.`,
        text(await page.locator('#game-live .g-place h3').textContent()),
      );
    }

    // --- 5. the colour of the game's gestures
    const colours: { action: string; used: string[] } = await page.evaluate(`(() => {
      const probe = document.createElement('span');
      probe.style.color = 'var(--action)';
      document.body.append(probe);
      const action = getComputedStyle(probe).color;
      probe.remove();
      const used = [...document.querySelectorAll('#jeu a, #jeu button')].map((n) => getComputedStyle(n).backgroundColor);
      return { action, used };
    })()`);
    check(
      'no gesture of the game is in the colour of action',
      colours.used.length > 0 && !colours.used.includes(colours.action),
      colours.action,
    );
    check(
      'nothing we ship breaks our own security policy',
      violations.length === 0,
      violations.join(' | '),
    );
    await context.close();

    // --- 6. the data cannot be had: the round of the HTML goes on
    {
      server.failData = true;
      const offline = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const view = await offline.newPage();
      await view.goto(`${origin}/`);
      await view.waitForTimeout(500);
      await view.locator('.g-word-1 .g-tile').first().click();
      check(
        'without its data the game is still the round of the HTML',
        (await view.locator('#game-live').isHidden()) &&
          (await view.locator('.g-word-1 .g-place').isVisible()),
      );
      await offline.close();
      server.failData = false;
    }

    // --- 7. what the game remembers: the tab from the first reveal, the phone only after « Garder »
    {
      const arrive = async (view: Page, path = '/'): Promise<void> => {
        await view.goto(`${origin}${path}`);
        await until(view, "!document.querySelector('#game-live').hidden");
      };
      const playRound = async (view: Page): Promise<void> => {
        for (let i = 0; i < ROUND; i += 1) {
          await view.getByRole('button', { name: 'Je ne sais pas' }).click();
          await view.getByRole('button', { name: 'Mot suivant' }).click();
        }
      };
      const word = first[0];
      const place = word === undefined ? null : locate(data, word.section);
      if (word === undefined || place === null) throw new Error('the first word has no place');
      const other = data.parts.map((p) => p.number).find((n) => n !== place.part.number) ?? 0;

      // Two visitors, two different choices for the same word: what is written is the same
      // string — a choice has nowhere to go.
      const written: string[] = [];
      for (const tile of [place.part.number, other]) {
        const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const view = await visitor.newPage();
        await arrive(view);
        const before: Stores = await view.evaluate(stores);
        if (tile === place.part.number) {
          check(
            'nothing is written before a first word has been shown',
            Object.keys(before.tab).length === 0 && Object.keys(before.phone).length === 0,
            JSON.stringify(before),
          );
        }
        await view.locator(`#game-live .g-tile[data-tile="${String(tile)}"]`).click();
        const after: Stores = await view.evaluate(stores);
        written.push(after.tab[STORAGE_KEY] ?? '');
        if (tile === place.part.number) {
          const state = JSON.parse(after.tab[STORAGE_KEY] ?? '{}') as Record<string, unknown>;
          check(
            'from the first reveal the tab holds one key, with the declared fields and no other',
            JSON.stringify(Object.keys(after.tab)) === JSON.stringify([STORAGE_KEY]) &&
              JSON.stringify(Object.keys(state)) === JSON.stringify([...TAB_FIELDS]) &&
              JSON.stringify(state['seen']) === JSON.stringify([word.id]),
            after.tab[STORAGE_KEY],
          );
          check('…and the phone holds nothing', Object.keys(after.phone).length === 0);
          // The tab is left and found again: the same word, its card, and no word about a choice.
          await arrive(view);
          check(
            'a round left in the tab is found again at its card, which says nothing of a choice',
            text(await view.locator('#game-live [data-programme="word"]').textContent()) ===
              word.word &&
              text(await view.locator('#game-live .g-place h3').textContent()) ===
                `C’est écrit dans la partie ${String(place.part.number)}.`,
            text(await view.locator('#game-live').textContent()),
          );
          check(
            'coming back does not take the focus',
            await view.evaluate<boolean>('document.activeElement === document.body'),
          );
          // « Ne pas garder »
          await view.getByRole('button', { name: 'Mot suivant' }).click();
          for (let i = 1; i < ROUND; i += 1) {
            await view.getByRole('button', { name: 'Je ne sais pas' }).click();
            await view.getByRole('button', { name: 'Mot suivant' }).click();
          }
          const card = view.locator('#game-live .g-keep');
          const lines = (await card.locator('p:not(.g-actions)').allTextContents()).map(text);
          check(
            'the end of the round asks whether to keep, and says what keeping means first',
            lines.length >= 5 &&
              lines[0] ===
                'Garder, c’est écrire sur ce téléphone. Il retient alors les mots déjà vus, où en est le jeu et ta tortue.' &&
              lines[1] === 'Tes choix ne sont pas gardés. Rien n’est envoyé.',
            lines.join(' | '),
          );
          // Said before the gesture, not found afterwards: five personas out of seven answered
          // that they could not erase, two that they did not know (session of 14/11/2026).
          check(
            'the card says how to erase everything, before anything is kept',
            lines.at(-1) === 'Pour tout effacer ensuite : touche ta tortue, puis « Tout effacer ».',
            lines.at(-1),
          );
          const weights: string[] = await card.locator('button').evaluateAll((buttons) =>
            buttons.map((b) => {
              const style = getComputedStyle(b);
              return [
                style.backgroundColor,
                style.borderTopColor,
                style.fontWeight,
                style.color,
              ].join(' ');
            }),
          );
          check(
            'the two gestures weigh the same',
            weights.length === 2 && weights[0] === weights[1],
            weights.join(' / '),
          );
          await view.getByRole('button', { name: 'Ne pas garder' }).click();
          const declined: Stores = await view.evaluate(stores);
          check(
            '« Ne pas garder »: the card leaves, the phone stays empty, the focus goes on',
            (await card.count()) === 0 &&
              Object.keys(declined.phone).length === 0 &&
              (JSON.parse(declined.tab[STORAGE_KEY] ?? '{}') as { declined?: boolean }).declined ===
                true &&
              (await view.evaluate<boolean>(
                "document.activeElement?.textContent.trim() === 'Trois autres mots'",
              )),
          );
          await view.getByRole('button', { name: 'Trois autres mots' }).click();
          await playRound(view);
          check('…and the question is not asked again in this tab', (await card.count()) === 0);
        }
        await visitor.close();
      }
      check(
        'what is written does not depend on what was chosen',
        written.length === 2 && written[0] !== '' && written[0] === written[1],
      );

      // « Garder ta tortue », then another tab of the same phone.
      const phone = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const tab = await phone.newPage();
      await arrive(tab);
      await playRound(tab);
      await tab.getByRole('button', { name: 'Garder ta tortue' }).click();
      const kept: Stores = await tab.evaluate(stores);
      const onPhone = JSON.parse(kept.phone[STORAGE_KEY] ?? '{}') as Record<string, unknown>;
      check(
        '« Garder ta tortue »: the phone holds one key, with the declared fields and no other',
        JSON.stringify(Object.keys(kept.phone)) === JSON.stringify([STORAGE_KEY]) &&
          JSON.stringify(Object.keys(onPhone)) === JSON.stringify([...KEPT_FIELDS]) &&
          JSON.stringify(onPhone['seen']) === JSON.stringify(first.map((w) => w.id)),
        kept.phone[STORAGE_KEY],
      );
      check(
        '…and it is said, once',
        text(await tab.locator('#game-status').textContent()) ===
          'Elle est gardée sur ce téléphone.',
        text(await tab.locator('#game-status').textContent()),
      );
      const second = await phone.newPage();
      await arrive(second);
      const arrived = await second.locator('#jeu svg.turtle').evaluate((svg) => ({
        state: svg.getAttribute('data-state'),
        arc: svg.querySelector('.t-arc-1')?.getAttribute('stroke-dasharray'),
      }));
      check(
        'another tab of the same phone goes on from what was kept, without a movement',
        text(await second.locator('#game-live [data-programme="word"]').textContent()) ===
          data.words[ROUND]?.word &&
          arrived.state === '1' &&
          arrived.arc !== '0 6' &&
          (await second.evaluate<boolean>('document.getAnimations().length === 0')),
        JSON.stringify(arrived),
      );
      // The second tab finds three more words: the phone follows, and so does the first tab.
      await playRound(second);
      await until(
        tab,
        `JSON.parse(localStorage.getItem('${STORAGE_KEY}')).seen.length === ${String(2 * ROUND)}`,
      );
      // The tab that played shows its new arcs once its evolution has drawn them (360 ms in);
      // the other one, where nothing was done, follows at once.
      await second.waitForTimeout(1100);
      const followed = await tab
        .locator('#jeu svg.turtle .t-arc-1')
        .getAttribute('stroke-dasharray');
      const lead = await second
        .locator('#jeu svg.turtle .t-arc-1')
        .getAttribute('stroke-dasharray');
      check(
        'what one tab finds, the other sees on her shell',
        followed === lead && followed !== null,
        `${String(followed)} / ${String(lead)}`,
      );

      // One tab stops keeping: the phone forgets, and the other tab is not emptied for it —
      // « Tout effacer » is another gesture, with another button.
      await second.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      const secondSheet = second.locator('#turtle-sheet');
      await secondSheet.getByRole('button', { name: 'Ne plus garder sur ce téléphone' }).click();
      await tab.waitForTimeout(300);
      const released: Stores = await second.evaluate(stores);
      const beside: Stores = await tab.evaluate(stores);
      check(
        'one tab stops keeping: the phone is empty, and neither tab loses its game',
        Object.keys(released.phone).length === 0 &&
          released.tab[STORAGE_KEY] !== undefined &&
          beside.tab[STORAGE_KEY] !== undefined &&
          (await tab.locator('#jeu svg.turtle .t-arc-1').getAttribute('stroke-dasharray')) ===
            followed,
        JSON.stringify({ phone: released.phone, beside: Object.keys(beside.tab) }),
      );
      await secondSheet.getByRole('button', { name: 'Garder ta tortue' }).click();
      await second.keyboard.press('Escape');
      await until(
        tab,
        `JSON.parse(localStorage.getItem('${STORAGE_KEY}') ?? '{}').seen?.length === ${String(2 * ROUND)}`,
      );

      // The privacy page names everything that is really there, and erases it.
      const all: Stores = await second.evaluate(stores);
      const named = (storage: string): string[] =>
        STORAGE_MAP.find((entry) => entry.storage === storage)?.fields.map((f) => f.name) ?? [];
      const really = (value: string | undefined): string[] =>
        Object.keys(JSON.parse(value ?? '{}') as object);
      check(
        'nothing is in a storage that the map of writings does not name',
        Object.keys(all.tab).every((k) => k === STORAGE_KEY) &&
          Object.keys(all.phone).every((k) => k === STORAGE_KEY) &&
          really(all.tab[STORAGE_KEY]).every((f) => named('sessionStorage').includes(f)) &&
          really(all.phone[STORAGE_KEY]).every((f) => named('localStorage').includes(f)),
        JSON.stringify(all),
      );
      const privacy = await phone.newPage();
      await privacy.goto(`${origin}/confidentialite/`);
      const listed = await privacy
        .locator('ul[data-storage] li')
        .evaluateAll((items) =>
          items.map(
            (li) =>
              `${li.parentElement?.getAttribute('data-storage') ?? ''}:${li.getAttribute('data-field') ?? ''}`,
          ),
        );
      check(
        'the privacy page lists every field of both storages',
        JSON.stringify(listed) ===
          JSON.stringify(
            STORAGE_MAP.flatMap((entry) => entry.fields.map((f) => `${entry.storage}:${f.name}`)),
          ) && ((await privacy.locator('main').textContent()) ?? '').includes(STORAGE_KEY),
        listed.join(','),
      );
      await privacy.getByRole('button', { name: 'Tout effacer' }).click();
      const erased: Stores = await privacy.evaluate(stores);
      check(
        '« Tout effacer »: the phone is empty, and it is said',
        Object.keys(erased.phone).length === 0 &&
          text(await privacy.locator('#erase-status').textContent()) === 'Tout est effacé.',
        JSON.stringify(erased.phone),
      );
      await until(
        tab,
        "document.querySelector('#jeu svg.turtle').getAttribute('data-state') === '0'",
      );
      const forgotten: Stores = await tab.evaluate(stores);
      check(
        '…and a tab still open forgets too: the first word, a plain shell, nothing written',
        text(await tab.locator('#game-live [data-programme="word"]').textContent()) ===
          first[0]?.word && Object.keys(forgotten.tab).length === 0,
        JSON.stringify(forgotten.tab),
      );
      await phone.close();

      // A link is something anyone can send. « /#fin » shows no word: followed, it writes
      // nothing and moves nothing. « /#m2-3 » shows one card: that word is found, and no other.
      const linked = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const landing = await linked.newPage();
      await arrive(landing, '/#fin');
      const fromEnd: Stores = await landing.evaluate(stores);
      check(
        'a link to the end of a round writes nothing and moves nothing',
        Object.keys(fromEnd.tab).length === 0 &&
          text(await landing.locator('#game-live [data-programme="word"]').textContent()) ===
            first[0]?.word &&
          (await landing.locator('#jeu svg.turtle').getAttribute('data-state')) === '0' &&
          !landing.url().includes('#'),
        JSON.stringify(fromEnd.tab),
      );
      // Away and back: a change of fragment alone would not load the page again.
      await landing.goto('about:blank');
      await arrive(landing, '/#m2-3');
      const fromCard: Stores = await landing.evaluate(stores);
      check(
        'a link to a card shows that card and writes nothing: arriving is not a gesture',
        Object.keys(fromCard.tab).length === 0 &&
          Object.keys(fromCard.phone).length === 0 &&
          text(await landing.locator('#game-live [data-programme="word"]').textContent()) ===
            first[1]?.word &&
          (await landing.locator('#game-live .g-place').count()) === 1 &&
          !landing.url().includes('#'),
        `${JSON.stringify(fromCard)} ${landing.url()}`,
      );
      // The first gesture is the first writing: the word of the card, no other — and it heads
      // a whole round, so that its end can say « trois mots ».
      await landing.getByRole('button', { name: 'Mot suivant' }).click();
      const afterCard: Stores = await landing.evaluate(stores);
      const played = JSON.parse(afterCard.tab[STORAGE_KEY] ?? '{}') as {
        seen?: string[];
        round?: { words?: string[]; at?: number };
      };
      check(
        '…the first gesture finds the word of that card, at the head of a round of three',
        JSON.stringify(played.seen) === JSON.stringify([first[1]?.id]) &&
          played.round?.words?.length === ROUND &&
          played.round.words[0] === first[1]?.id &&
          played.round.at === 1 &&
          Object.keys(afterCard.phone).length === 0,
        afterCard.tab[STORAGE_KEY],
      );
      for (let i = 1; i < ROUND; i += 1) {
        await landing.getByRole('button', { name: 'Je ne sais pas' }).click();
        await landing.getByRole('button', { name: 'Mot suivant' }).click();
      }
      check(
        '…and the round it opened ends on three words',
        text(await landing.locator('#game-live .g-end h3').textContent()) ===
          'Trois mots, trois endroits du livre.',
        text(await landing.locator('#game-live .g-end h3').textContent()),
      );
      // « Tout effacer » on the privacy page reaches a tab that kept nothing on the phone too.
      const elsewhere = await linked.newPage();
      await elsewhere.goto(`${origin}/confidentialite/`);
      await elsewhere.getByRole('button', { name: 'Tout effacer' }).click();
      await until(landing, `sessionStorage.getItem('${STORAGE_KEY}') === null`);
      check(
        '« Tout effacer » elsewhere empties a tab that had kept nothing on the phone',
        text(await landing.locator('#game-live [data-programme="word"]').textContent()) ===
          first[0]?.word,
      );
      await linked.close();

      // A browser that refuses to store anything: the game is played all the same.
      const refusing = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await refusing.addInitScript(
        "Storage.prototype.setItem = function () { throw new DOMException('refused', 'QuotaExceededError'); };",
      );
      const strict = await refusing.newPage();
      const broken: string[] = [];
      strict.on('pageerror', (e) => broken.push(String(e)));
      await arrive(strict);
      await playRound(strict);
      await strict.getByRole('button', { name: 'Garder ta tortue' }).click();
      await strict.getByRole('button', { name: 'Trois autres mots' }).click();
      check(
        'a storage that refuses is not an error: the round is played, the next one starts',
        broken.length === 0 &&
          text(await strict.locator('#game-live [data-programme="word"]').textContent()) ===
            data.words[ROUND]?.word,
        broken.join(' | '),
      );
      await refusing.close();
    }

    // --- 8. the turtle: touched, her sheet, her place, her movement
    {
      const her = "document.querySelector('#jeu .g-turtle svg')";
      const arrive = async (view: Page): Promise<void> => {
        await view.goto(`${origin}/`);
        await until(view, "!document.querySelector('#game-live').hidden");
      };
      const visitor = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const view = await visitor.newPage();
      await arrive(view);
      const press = view.getByRole('button', { name: 'Ta tortue', exact: true });
      check(
        'she is a button, by her name, and says it opens something',
        (await press.count()) === 1 && (await press.getAttribute('aria-haspopup')) === 'dialog',
      );
      // Where she stands, relative to the block, on each screen: she moves along nothing.
      const standing = (): Promise<string> =>
        view.evaluate<string>(`(() => {
          const block = document.querySelector('#jeu').getBoundingClientRect();
          const box = ${her}.getBoundingClientRect();
          return [box.left - block.left, box.top - block.top, box.width].map((n) => n.toFixed(1)).join(' ');
        })()`);
      // « Site non officiel. » is in the frame of every screen of the game: a label one can
      // read, inside the viewport, while the block is on screen.
      const labelled = (): Promise<boolean> =>
        view.evaluate<boolean>(`(() => {
          const dialog = document.querySelector('#turtle-sheet[open]');
          const scope = dialog ?? document;
          return [...scope.querySelectorAll('.unofficial')].some((label) => {
            const box = label.getBoundingClientRect();
            return (
              label.textContent.trim() === 'Site non officiel.' &&
              box.height > 0 && box.top >= 0 && box.bottom <= innerHeight && box.left >= 0 && box.right <= innerWidth
            );
          });
        })()`);
      await view.locator('#jeu').scrollIntoViewIfNeeded();
      const frames = [await labelled()];
      const places = [await standing()];
      await view.getByRole('button', { name: 'Je ne sais pas' }).click();
      frames.push(await labelled());
      places.push(await standing());
      await view.getByRole('button', { name: 'Mot suivant' }).click();
      for (let i = 1; i < ROUND; i += 1) {
        await view.getByRole('button', { name: 'Je ne sais pas' }).click();
        await view.getByRole('button', { name: 'Mot suivant' }).click();
      }
      // A tap during her evolution reaches what it aims at: nothing holds the finger.
      await view.getByRole('button', { name: 'Trois autres mots' }).click();
      check(
        'a tap during her evolution reaches its target',
        text(await view.locator('#game-live [data-programme="word"]').textContent()) ===
          data.words[ROUND]?.word,
      );
      for (let i = 0; i < ROUND; i += 1) {
        await view.getByRole('button', { name: 'Je ne sais pas' }).click();
        await view.getByRole('button', { name: 'Mot suivant' }).click();
      }
      places.push(await standing());
      frames.push(await labelled());
      check(
        '« Site non officiel. » is in the frame on the question, the card and the end of the round',
        frames.every(Boolean),
        frames.join(','),
      );
      check(
        'she keeps her place on the question, the card and the end of the round',
        new Set(places).size === 1,
        places.join(' | '),
      );
      const role: { bars: number; digits: boolean; company: number } = await view.evaluate(`({
        bars: document.querySelectorAll('#jeu progress, #jeu meter, #jeu [role="progressbar"], #jeu [role="meter"]').length,
        digits: /\\d/.test(${her}.textContent + (${her}.closest('button').getAttribute('aria-label') || '')),
        company: document.querySelector('#jeu .g-turtle').querySelectorAll(':scope > *').length,
      })`);
      check(
        'she pushes nothing, stands on nothing, carries no number',
        role.bars === 0 && !role.digits && role.company === 1,
        JSON.stringify(role),
      );

      // Touched: she raises her head, and her sheet opens.
      await view.waitForTimeout(1100);
      await press.click();
      const sheet = view.locator('#turtle-sheet');
      check(
        'touching her raises her head and opens her sheet',
        (await sheet.evaluate((d) => (d as HTMLDialogElement).open)) &&
          (await view.evaluate<boolean>(`${her}.getAttribute('data-pose') === 'up'`)) &&
          text(await view.locator('#turtle-sheet-said').textContent()) === 'Elle lève la tête.',
        text(await view.locator('#turtle-sheet-said').textContent()),
      );
      check('« Site non officiel. » is in the frame of her sheet too', await labelled());
      const large = sheet.locator('.t-sheet-her svg');
      check(
        'in her sheet she is large, in the same state',
        (await large.getAttribute('data-state')) ===
          (await view.locator('#jeu .g-turtle svg').getAttribute('data-state')) &&
          (await large.evaluate((svg) => svg.getBoundingClientRect().width)) >= 160,
      );
      await sheet.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      const lowered =
        (await large.getAttribute('data-pose')) === 'rest' &&
        text(await view.locator('#turtle-sheet-said').textContent()) === '';
      await sheet.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      check(
        'she can be touched again: she lowers her head, then raises it',
        lowered && (await large.getAttribute('data-pose')) === 'up',
      );
      await view.waitForTimeout(2100);
      check(
        'nothing of her moves 2.1 s after a gesture',
        await view.evaluate<boolean>('document.getAnimations().length === 0'),
      );
      const found = (
        await sheet.locator('#turtle-sheet-found [data-programme="word"]').allTextContents()
      ).map(text);
      check(
        'her sheet lists the words she has found, and no total',
        JSON.stringify(found) ===
          JSON.stringify(data.words.slice(0, 2 * ROUND).map((w) => w.word)) &&
          !/\d/.test(text(await view.locator('#turtle-sheet-found').textContent())),
        found.join(','),
      );
      // What « Garder » would write, and who would see it: said before the gesture, here as
      // on the card — her sheet must not be a shorter way to the same writing.
      const BEFORE_KEEPING = [
        'Rien n’est gardé une fois cette page fermée.',
        'Garder, c’est écrire sur ce téléphone. Il retient alors les mots déjà vus, où en est le jeu et ta tortue.',
        'Tes choix ne sont pas gardés. Rien n’est envoyé.',
        'Qui ouvre le site dans ce navigateur la verra.',
      ];
      const keptLines = async (): Promise<string[]> =>
        (await view.locator('#turtle-sheet-kept p').allTextContents()).map(text);
      const release = sheet.getByRole('button', { name: 'Ne plus garder sur ce téléphone' });
      check(
        '…and says what is kept — nothing on the phone yet — and what « Garder » would write',
        JSON.stringify(await keptLines()) === JSON.stringify(BEFORE_KEEPING) &&
          (await release.count()) === 0,
        (await keptLines()).join(' | '),
      );
      await sheet.getByRole('button', { name: 'Garder ta tortue' }).click();
      check(
        '« Garder ta tortue » is within reach in her sheet too, and so is its undoing',
        (await view.evaluate<boolean>(`localStorage.getItem('${STORAGE_KEY}') !== null`)) &&
          JSON.stringify(await keptLines()) ===
            JSON.stringify([
              'Ce téléphone garde les mots déjà vus, où en est le jeu et ta tortue.',
            ]) &&
          (await sheet.getByRole('button', { name: 'Garder ta tortue' }).count()) === 0 &&
          (await view.evaluate<boolean>("document.activeElement?.id === 'turtle-sheet-release'")),
        (await keptLines()).join(' | '),
      );
      // What was asked of the phone is taken back as simply: the phone forgets, the tab goes on.
      await release.click();
      const unkept: Stores = await view.evaluate(stores);
      check(
        '« Ne plus garder sur ce téléphone »: the phone is empty, the game of the tab untouched',
        Object.keys(unkept.phone).length === 0 &&
          (JSON.parse(unkept.tab[STORAGE_KEY] ?? '{}') as { seen?: string[] }).seen?.length ===
            2 * ROUND &&
          text(await view.locator('#turtle-sheet-said').textContent()) ===
            'Ce téléphone ne la garde plus. Elle reste tant que cette page est ouverte.' &&
          JSON.stringify(await keptLines()) === JSON.stringify(BEFORE_KEEPING) &&
          (await release.count()) === 0 &&
          (await view.evaluate<boolean>("document.activeElement?.id === 'turtle-sheet-keep'")),
        `${JSON.stringify(unkept.phone)} ${(await keptLines()).join(' | ')}`,
      );
      await sheet.getByRole('button', { name: 'Garder ta tortue' }).click();
      await view.keyboard.press('Escape');
      // The dialog tells of its closing in an event: what follows it is waited for, not assumed.
      await until(view, `${her}.getAttribute('data-pose') === 'rest'`, 3000).catch(() => undefined);
      check(
        'Escape closes her sheet, the focus goes back to her, and she rests',
        !(await sheet.evaluate((d) => (d as HTMLDialogElement).open)) &&
          (await view.evaluate<boolean>(
            "document.activeElement?.getAttribute('aria-label') === 'Ta tortue'",
          )) &&
          (await view.evaluate<boolean>(`${her}.getAttribute('data-pose') === 'rest'`)),
      );
      await press.click();
      await sheet.getByRole('button', { name: 'Tout effacer' }).click();
      const wiped: { tab: number; phone: number } = await view.evaluate(
        '({ tab: sessionStorage.length, phone: localStorage.length })',
      );
      check(
        '« Tout effacer » in her sheet: nothing left anywhere, a plain shell, the first word again',
        wiped.tab === 0 &&
          wiped.phone === 0 &&
          text(await view.locator('#turtle-sheet-said').textContent()) === 'Tout est effacé.' &&
          text(await view.locator('#turtle-sheet-found').textContent()) ===
            'Elle n’a pas encore vu de mot.' &&
          (await view.evaluate<boolean>(`${her}.getAttribute('data-state') === '0'`)) &&
          text(await view.locator('#game-live [data-programme="word"]').textContent()) ===
            first[0]?.word,
        JSON.stringify(wiped),
      );
      await visitor.close();

      // The third depth: what she found, in the order of the book, each with its way there.
      const seen = data.words.map((w) => w.id);
      const deep = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await deep.addInitScript(
        `sessionStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(
          JSON.stringify({
            corpus: data.corpus,
            seen: [...seen].reverse(),
            depth: 3,
            turtle: 3,
            arcs: [6, 6, 4],
            round: null,
            declined: true,
          }),
        )});`,
      );
      const third = await deep.newPage();
      await arrive(third);
      await third.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      const listed: string[][] = await third
        .locator('#turtle-sheet-found li')
        .evaluateAll((items) =>
          items.map((li) => [
            li.querySelector('[data-programme="word"]')?.textContent ?? '',
            li.querySelector('a')?.getAttribute('href') ?? '',
            li.querySelector('a [data-programme="title"]')?.textContent ?? '',
          ]),
        );
      const order = new Map<string, number>();
      for (const part of data.parts) {
        for (const chapter of part.chapters) {
          for (const section of chapter.sections) order.set(section.id, order.size);
        }
      }
      const expected = [...data.words]
        .sort((a, b) => (order.get(a.section) ?? 0) - (order.get(b.section) ?? 0))
        .map((w) => [w.word, sectionUrl(w.section), locate(data, w.section)?.section.title ?? '']);
      check(
        'at the third depth her sheet lists where each word is written, in the order of the book',
        listed.length === expected.length &&
          listed.every((row, i) => {
            const [word = '', href = '', title = ''] = row;
            const [wantWord = '', wantUrl = '-', wantTitle = ''] = expected[i] ?? [];
            return word === wantWord && href.startsWith(wantUrl) && text(title) === wantTitle;
          }),
        listed.map((l) => l[0]).join(','),
      );
      await deep.close();

      // The longest words of the list, at the narrowest width the gates hold: each stands whole
      // on one line. Fifteen letters or more are set one step smaller for that (LONG_WORD); a
      // longer word, one day, is caught here before a phone cuts it in two.
      const longest = [...data.words].sort((a, b) => b.word.length - a.word.length).slice(0, 3);
      const cut: string[] = [];
      for (const long of longest) {
        const narrow = await browser.newContext({ viewport: { width: 320, height: 640 } });
        await narrow.addInitScript(
          `sessionStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(
            JSON.stringify({
              corpus: data.corpus,
              seen: seen.filter((id) => id !== long.id),
              depth: 3,
              turtle: 3,
              arcs: [6, 6, 4],
              round: null,
              declined: true,
            }),
          )});`,
        );
        const small = await narrow.newPage();
        await arrive(small);
        const shown = small.locator('#game-live .g-the-word');
        const lines: number = await shown.evaluate((node) =>
          Math.round(
            node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight),
          ),
        );
        if (text(await shown.textContent()) !== long.word || lines !== 1) {
          cut.push(`${long.id}: ${String(lines)} line(s)`);
        }
        await narrow.close();
      }
      check(
        'at 320 px the three longest words of the list each stand whole on one line',
        cut.length === 0,
        cut.join(', '),
      );

      // Less motion asked: her sheet opens, and nothing starts.
      const calm = await browser.newContext({
        viewport: { width: 390, height: 844 },
        reducedMotion: 'reduce',
      });
      await calm.addInitScript(
        `sessionStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(
          JSON.stringify({
            corpus: data.corpus,
            seen: data.words.slice(0, 2 * ROUND).map((w) => w.id),
            depth: 2,
            turtle: 2,
            arcs: [6, 1, 0],
            round: null,
            declined: true,
          }),
        )});`,
      );
      const still = await calm.newPage();
      await arrive(still);
      await still.getByRole('button', { name: 'Un indice' }).click();
      const hinted = {
        marks: await still.locator('#game-live .g-mark').count(),
        said: text(await still.locator('#game-status').textContent()),
        pose: await still.locator('#jeu .g-turtle svg').getAttribute('data-pose'),
      };
      check(
        'less motion: the hint marks its tiles and is said, and she does not move',
        hinted.marks === 3 && hinted.said.startsWith('Elle regarde') && hinted.pose === 'rest',
        JSON.stringify(hinted),
      );
      await still.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      const opened = {
        open: await still.locator('#turtle-sheet').evaluate((d) => (d as HTMLDialogElement).open),
        pose: await still.locator('#jeu .g-turtle svg').getAttribute('data-pose'),
        said: text(await still.locator('#turtle-sheet-said').textContent()),
      };
      await still
        .locator('#turtle-sheet')
        .getByRole('button', { name: 'Ta tortue', exact: true })
        .click();
      check(
        'less motion: her sheet opens, no gesture starts, and no movement is announced',
        opened.open &&
          opened.pose === 'rest' &&
          opened.said === '' &&
          (await still.locator('.t-sheet-her svg').getAttribute('data-pose')) === 'rest',
        JSON.stringify(opened),
      );
      await still.keyboard.press('Escape');
      for (let i = 0; i < ROUND; i += 1) {
        await still.getByRole('button', { name: 'Je ne sais pas' }).click();
        await still.getByRole('button', { name: 'Mot suivant' }).click();
      }
      const settled = await still.locator('#jeu .g-turtle svg').evaluate((svg) => ({
        arc: svg.querySelector('.t-arc-2')?.getAttribute('stroke-dasharray'),
        moving: document.getAnimations().length,
        duration: getComputedStyle(svg.querySelector('.t-all') ?? svg).transitionDuration,
      }));
      check(
        'less motion: what she became shows at once, with no transition at all',
        settled.arc !== '0 6' && settled.moving === 0 && /^0s/.test(settled.duration),
        JSON.stringify(settled),
      );
      await calm.close();
    }

    // --- 8 bis. « Envoyer le lien du jeu »: the bare address, and nothing else (D16.17). The
    // button names what it sends: under « Rien n’est envoyé », « Envoyer le jeu » read to four
    // personas out of seven as a contradiction (session of 14/11/2026).
    {
      const sharing = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await sharing.addInitScript(
        'window.__shared = []; navigator.share = (data) => { window.__shared.push(data); return Promise.resolve(); };',
      );
      const view = await sharing.newPage();
      await view.goto(`${origin}/`);
      await until(view, "!document.querySelector('#game-live').hidden");
      for (let i = 0; i < ROUND; i += 1) {
        await view.getByRole('button', { name: 'Je ne sais pas' }).click();
        await view.getByRole('button', { name: 'Mot suivant' }).click();
      }
      await view.getByRole('button', { name: 'Envoyer le lien du jeu' }).click();
      const shared: Record<string, unknown>[] = await view.evaluate('window.__shared');
      check(
        '« Envoyer le lien du jeu » shares the bare address of the site: no text, no word, no answer',
        shared.length === 1 && JSON.stringify(shared[0]) === JSON.stringify({ url: `${origin}/` }),
        JSON.stringify(shared),
      );
      await sharing.close();

      // No share sheet: the address is copied, and it is said.
      const copying = await browser.newContext({ viewport: { width: 390, height: 844 } });
      await copying.addInitScript(
        "window.__copied = []; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: (text) => { window.__copied.push(text); return Promise.resolve(); } }, configurable: true });",
      );
      const plain = await copying.newPage();
      await plain.goto(`${origin}/`);
      await until(plain, "!document.querySelector('#game-live').hidden");
      for (let i = 0; i < ROUND; i += 1) {
        await plain.getByRole('button', { name: 'Je ne sais pas' }).click();
        await plain.getByRole('button', { name: 'Mot suivant' }).click();
      }
      await plain.getByRole('button', { name: 'Envoyer le lien du jeu' }).click();
      await until(plain, "document.querySelector('#game-status').textContent !== ''");
      const copied: string[] = await plain.evaluate('window.__copied');
      check(
        'without a share sheet the address is copied, and it is said',
        JSON.stringify(copied) === JSON.stringify([`${origin}/`]) &&
          text(await plain.locator('#game-status').textContent()) === 'Lien copié.',
        JSON.stringify(copied),
      );
      await copying.close();
    }

    // --- 9. electoral silence (D16.16): the game is not shown, and no gesture of it does anything
    {
      const inside = new Date('2027-04-17T10:00:00Z');
      const outside = new Date('2026-11-20T10:00:00Z');
      const state = (view: Page): Promise<{ attr: boolean; game: boolean; note: string }> =>
        view.evaluate(`({
          attr: document.documentElement.hasAttribute('data-silence'),
          game: document.querySelector('#jeu').getClientRects().length > 0,
          note: document.querySelector('#game-silence').getClientRects().length > 0
            ? document.querySelector('#game-silence').textContent.replace(/\\s+/g, ' ').trim()
            : '',
        })`);
      const visit = async (
        clock: Date,
        flags: { date: Date; override?: string },
        prepare?: (view: Page) => Promise<void>,
      ): Promise<{ view: Page; asked: string[]; close: () => Promise<void> }> => {
        server.flags = flags;
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const view = await context.newPage();
        const asked: string[] = [];
        view.on('request', (r) => asked.push(r.url()));
        await view.clock.setFixedTime(clock);
        await prepare?.(view);
        await view.goto(`${origin}/`);
        await view.waitForTimeout(500);
        return { view, asked, close: () => context.close() };
      };

      // In a window, by the device's clock and by ours.
      let visitor = await visit(inside, { date: inside });
      let seen = await state(visitor.view);
      check(
        'in a silence window the game is not shown, and one sentence says what is paused',
        seen.attr &&
          !seen.game &&
          seen.note.startsWith('Les questions, le jeu et le partage sont en pause.') &&
          seen.note.includes('C’est la règle du silence électoral') &&
          /Tout revient à .*20/.test(seen.note),
        JSON.stringify(seen),
      );
      check(
        '…nothing of the game is fetched, and no word of it is on screen',
        !visitor.asked.some((url) => url.includes('/data/jeu-')) &&
          (await visitor.view.locator('[data-programme="word"]:visible').count()) === 0,
      );
      await visitor.view.fill('#q', 'retraite');
      await until(visitor.view, "document.querySelectorAll('#search-list > li').length > 0");
      check('…and the search stays open', true);
      await visitor.close();

      // The few lines of the <head> hide it by themselves: the game's own script never arrives.
      visitor = await visit(inside, { date: inside }, async (view) => {
        await view.route('**/_astro/Game.*', (route) => route.abort());
      });
      seen = await state(visitor.view);
      check(
        'the guard in the <head> hides the game before any script of ours runs',
        seen.attr && !seen.game,
        JSON.stringify(seen),
      );
      await visitor.close();

      // A clock that disagrees with ours is not believed — whichever of the two is in a window.
      visitor = await visit(inside, { date: outside });
      seen = await state(visitor.view);
      check(
        'device in a window, server outside: closed when in doubt, and no hour is announced',
        seen.attr && !seen.game && !/Tout revient/.test(seen.note),
        JSON.stringify(seen),
      );
      await visitor.close();
      visitor = await visit(outside, { date: inside });
      seen = await state(visitor.view);
      check(
        'server in a window, device outside: closed when in doubt',
        seen.attr && !seen.game,
        JSON.stringify(seen),
      );
      await visitor.close();

      // The switch: outside any election, one field of our own file closes the game.
      visitor = await visit(outside, { date: outside, override: 'on' });
      seen = await state(visitor.view);
      check(
        'the override closes the game outside any window, with no hour to announce',
        seen.attr && !seen.game && seen.note !== '' && !/Tout revient/.test(seen.note),
        JSON.stringify(seen),
      );
      await visitor.close();

      // Outside a window, with a clock that agrees: the game is there.
      visitor = await visit(outside, { date: outside });
      seen = await state(visitor.view);
      check(
        'outside a window the game is shown, and the sentence is not',
        !seen.attr && seen.game && seen.note === '',
        JSON.stringify(seen),
      );
      await visitor.close();

      // The two hours part for two reasons the page cannot tell apart: a clock moved by hand,
      // and a phone that slept — its monotonic clock does not count the sleep, so our hour falls
      // behind. Far from any vote, with no window between them, that is no reason to close.
      visitor = await visit(new Date('2026-11-13T13:00:00Z'), {
        date: new Date('2026-11-13T12:00:00Z'),
      });
      seen = await state(visitor.view);
      check(
        'two clocks an hour apart and no window between them: the game is shown',
        !seen.attr && seen.game && seen.note === '',
        JSON.stringify(seen),
      );
      await visitor.close();
      // A clock that says the vote is over while ours says it has not come: the window lies
      // between the two, and the true hour may be in it.
      visitor = await visit(new Date('2027-04-20T12:00:00Z'), {
        date: new Date('2027-04-10T12:00:00Z'),
      });
      seen = await state(visitor.view);
      check(
        'a window between what the two clocks say: closed when in doubt, and no hour announced',
        seen.attr && !seen.game && seen.note !== '' && !/Tout revient/.test(seen.note),
        JSON.stringify(seen),
      );
      await visitor.close();

      // A freeze that starts while the page is open, and ends while it still is.
      const eve = new Date('2027-04-15T21:00:00Z');
      visitor = await visit(eve, { date: eve });
      await until(visitor.view, "!document.querySelector('#game-live').hidden");
      await visitor.view.getByRole('button', { name: 'Je ne sais pas' }).click();
      const midnight = new Date('2027-04-15T22:10:00Z');
      await visitor.view.clock.setFixedTime(midnight);
      await visitor.view.getByRole('button', { name: 'Mot suivant' }).click();
      seen = await state(visitor.view);
      check(
        'a freeze that starts during a round: the next gesture does nothing, the game leaves',
        seen.attr && !seen.game && seen.note !== '',
        JSON.stringify(seen),
      );
      check(
        '…and what she had found is still in the tab',
        await visitor.view.evaluate<boolean>(`sessionStorage.getItem('${STORAGE_KEY}') !== null`),
      );
      const after = new Date('2027-04-18T18:30:00Z');
      server.flags = { date: after };
      await visitor.view.clock.setFixedTime(after);
      await visitor.view.evaluate("document.dispatchEvent(new Event('visibilitychange'))");
      await until(visitor.view, "!document.documentElement.hasAttribute('data-silence')");
      seen = await state(visitor.view);
      check(
        'when the window ends and the tab is looked at again, the game is back',
        !seen.attr && seen.game,
        JSON.stringify(seen),
      );
      await visitor.close();
      server.flags = null;
    }

    // --- 10. accessibility of the screens, under the nine conditions every page is audited under
    // (Chromium: axe is injected, so the policy is bypassed)
    if (name === 'chromium') {
      const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
      for (const condition of CONDITIONS) {
        const audited = await browser.newContext({ ...condition.options, bypassCSP: true });
        const percent = condition.rootFontPercent ?? 100;
        if (percent !== 100) await audited.addInitScript(rootFontScript(percent));
        const view = await audited.newPage();
        await view.goto(`${origin}/`);
        // In a small window the block is more than a screen away: the script takes it over
        // when the reader gets near, not before.
        await view.locator('#jeu').scrollIntoViewIfNeeded();
        await until(view, "!document.querySelector('#game-live').hidden");
        await view.addScriptTag({ content: axe });
        const steps: [string, () => Promise<void>][] = [
          ['the question', () => Promise.resolve()],
          ['the card of the place', async () => view.locator('#game-live .g-tile').first().click()],
          [
            'the end of the round',
            async () => {
              for (let i = 0; i < ROUND; i += 1) {
                if (i > 0) await view.getByRole('button', { name: 'Je ne sais pas' }).click();
                await view.getByRole('button', { name: 'Mot suivant' }).click();
              }
            },
          ],
          [
            'her sheet',
            async () => view.getByRole('button', { name: 'Ta tortue', exact: true }).click(),
          ],
        ];
        const failures: string[] = [];
        for (const [label, reach] of steps) {
          await reach();
          const result: { violations: { id: string; impact: string | null }[] } =
            await view.evaluate(
              'window.axe.run(document.querySelector("#jeu"), { resultTypes: ["violations"] })',
            );
          const serious = result.violations.filter(
            (v) => v.impact === 'serious' || v.impact === 'critical',
          );
          if (serious.length > 0) failures.push(`${label}: ${serious.map((v) => v.id).join(',')}`);
          const box: { sw: number; cw: number; small: number; cut: number } =
            await view.evaluate(`({
            sw: document.documentElement.scrollWidth,
            cw: document.documentElement.clientWidth,
            small: [...document.querySelectorAll('#game-live button, #game-live a, #turtle-sheet[open] button')].filter((n) => n.getClientRects().length > 0 && n.getBoundingClientRect().height < 44).length,
            // A title is never cut: nothing of the game hides what overflows it.
            cut: [...document.querySelectorAll('#game-live [data-programme], #turtle-sheet[open] [data-programme]')].filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'visible').length,
          })`);
          if (box.sw > box.cw)
            failures.push(`${label}: overflows (${String(box.sw)} > ${String(box.cw)})`);
          if (box.small > 0) failures.push(`${label}: ${String(box.small)} target(s) under 44 px`);
          if (box.cut > 0) failures.push(`${label}: ${String(box.cut)} title(s) cut`);
        }
        check(
          `the four screens of the game pass the audit, fit and keep their targets: ${condition.label}`,
          failures.length === 0,
          failures.join(' | '),
        );
        await audited.close();
      }
    }

    // --- the scrutin build says until when (D16.41): six personas out of seven read « en
    // pause » and asked « jusqu'à quand ? ». From the eve of a window to its last minute, and
    // never once it is over — the next one is two weeks away.
    if (scrutin !== null) {
      const noteAt = async (clock: Date, serverDate: Date): Promise<string> => {
        scrutin.state.flags = { date: serverDate };
        const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
        const view = await context.newPage();
        await view.clock.setFixedTime(clock);
        await view.goto(`${scrutin.origin}/`);
        await view.waitForTimeout(800);
        const said = text(await view.locator('#scrutin-note').textContent());
        await context.close();
        return said;
      };
      const HOUR = /Tout revient après dimanche 18 avril, 20 h\.$/;
      const eve = new Date('2027-04-15T21:00:00Z');
      const during = new Date('2027-04-17T10:00:00Z');
      const over = new Date('2027-04-18T18:30:00Z');
      let said = await noteAt(eve, eve);
      check('the scrutin build says until when, from the eve of the window', HOUR.test(said), said);
      said = await noteAt(during, during);
      check('…and during the window', HOUR.test(said), said);
      said = await noteAt(over, over);
      check(
        '…and announces no hour once the window is over',
        /en pause/.test(said) && !/Tout revient/.test(said),
        said,
      );
      said = await noteAt(during, new Date('2027-03-01T10:00:00Z'));
      check(
        '…nor on a clock our own server contradicts',
        /en pause/.test(said) && !/Tout revient/.test(said),
        said,
      );
    }
  } finally {
    await browser.close();
  }
  return out;
}

async function main(): Promise<void> {
  const name = existsSync(join(ROOT, 'data'))
    ? readdirSync(join(ROOT, 'data')).find((f) => f.startsWith('jeu-'))
    : undefined;
  if (name === undefined) {
    console.error(`e2e-game: no game in ${ROOT}/ — run \`npm run build:ask\` first`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8')) as GameData;
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
  const state: ServerState = { failData: false, flags: null };
  const { server, origin } = await serve(resolve(ROOT), (req, res) => {
    const url = req.url ?? '';
    if (state.failData && url.includes('/data/jeu-')) {
      res.writeHead(503).end();
      return true;
    }
    if (state.flags !== null && url.startsWith('/flags.json')) {
      res.writeHead(200, {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-cache',
        date: state.flags.date.toUTCString(),
      });
      res.end(JSON.stringify({ silence_override: state.flags.override ?? 'auto' }));
      return true;
    }
    return false;
  });
  // The scrutin build of the same test site, when it was built (npm run build:scrutin:test).
  const scrutinState: ServerState = { failData: false, flags: null };
  const scrutinServer = existsSync(join('dist-scrutin', 'index.html'))
    ? await serve(resolve('dist-scrutin'), (req, res) => {
        if (scrutinState.flags === null || !(req.url ?? '').startsWith('/flags.json')) return false;
        res.writeHead(200, {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-cache',
          date: scrutinState.flags.date.toUTCString(),
        });
        res.end(JSON.stringify({ silence_override: scrutinState.flags.override ?? 'auto' }));
        return true;
      })
    : null;
  const scrutin =
    scrutinServer === null ? null : { origin: scrutinServer.origin, state: scrutinState };
  try {
    await report((engine) => runEngine(engine, origin, data, manifest, state, scrutin));
  } finally {
    server.close();
    scrutinServer?.server.close();
  }
}

await main();
