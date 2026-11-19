/**
 * A sweep of the whole game at phone sizes (lot 8 of docs/discovery/PLAN-JEU-DABORD.md): every
 * word in the order the game deals it, at the depth it is asked at, then the end of each round.
 * What the end-to-end gate checks on a few screens, measured here on ALL of them — after any
 * change of the list, of a sentence, or of the layout of the block.
 *
 * On each of five sizes, under Chromium, with less motion asked (the layout is the same, and
 * nothing has to be waited for):
 *
 *   - the question: no tile holds more than five lines of title, nothing overflows sideways;
 *   - the card, after the gesture that asked for it: « Mot suivant » is whole in the window —
 *     the criterion of the plan is 390 × 844 — and the word is still above it;
 *   - the sentence of the card, where the build shows one: there, under its label;
 *   - the end of the round: « Trois autres mots » is whole in the window, « Tu te souviens ? »
 *     offers one word at the first round and two afterwards.
 *
 * It prints identifiers and numbers only, never a word of the programme, and exits with 1 when
 * one of the two criteria of the plan fails (a tile over five lines at any size; a card whose
 * way on is out of the window at 390 × 844).
 *
 * Run: npm run build:ask && npm run sweep:game            (dist-ask/ by default)
 *      npx tsx scripts/sweep-game.ts --root dist-gists
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Page } from 'playwright';
import { ROUND, draw, endOfRound, type GameData, type Standing } from '../src/lib/game-engine.js';
import { STORAGE_KEY } from '../src/lib/game-state2.js';
import { serve, until } from './e2e-kit.js';

const rootAt = process.argv.indexOf('--root');
const root = resolve(rootAt === -1 ? 'dist-ask' : (process.argv[rootAt + 1] ?? 'dist-ask'));

/** Width × height, as a phone shows a page: small and old, small, common, large. */
const SIZES = [
  [320, 568],
  [360, 640],
  [360, 740],
  [390, 844],
  [412, 915],
] as const;
/** The size the plan names: there, the way on of every card is in the window. */
const NAMED = '390 × 844';
const MAX_LINES = 5;

function gameOf(dir: string): GameData {
  const folder = join(dir, 'data');
  const name = existsSync(folder)
    ? readdirSync(folder).find((file) => /^jeu-.*\.json$/.test(file))
    : undefined;
  if (name === undefined) throw new Error(`${dir} holds no game: build it first`);
  return JSON.parse(readFileSync(join(folder, name), 'utf8')) as GameData;
}

/** The game as a tab holds it before round `round` starts: nothing under way. */
function before(data: GameData, round: number): string {
  let standing: Standing = { depth: 1, state: 0, arcs: [0, 0, 0] };
  let seen: string[] = [];
  for (let played = 1; played < round; played += 1) {
    const words = draw(data, seen, seen.at(-1) ?? null);
    seen = [...seen, ...words.filter((id) => !seen.includes(id))];
    const end = endOfRound(data, standing, seen);
    standing = { depth: end.depth, state: end.state, arcs: end.arcs };
  }
  return JSON.stringify({
    corpus: data.corpus,
    seen,
    depth: standing.depth,
    turtle: standing.state,
    arcs: standing.arcs,
    round: null,
    declined: true,
  });
}

interface Question {
  /** The most lines a tile holds, and the tile that holds them. */
  lines: number;
  tile: string;
  tiles: number;
  /** How far the foot of the last tile is under the window: 0 or less, the question fits. */
  under: number;
  sideways: number;
}
/**
 * Lines are counted on the TEXT of a tile — the boxes of its text nodes, whose tops within half
 * a line of one another are one line: the box of a block (the number of a part, on its own
 * line) is not a line of its own.
 */
const QUESTION = `(() => {
  let lines = 0;
  let tile = '';
  const tiles = [...document.querySelectorAll('#game-live .g-tile')];
  for (const node of tiles) {
    const title = node.querySelector('[data-programme="title"]') ?? node;
    const half = parseFloat(getComputedStyle(title).lineHeight) / 2 || 10;
    const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
    const tops = [];
    for (let text = walker.nextNode(); text !== null; text = walker.nextNode()) {
      const range = document.createRange();
      range.selectNodeContents(text);
      for (const box of range.getClientRects()) {
        if (box.width > 0 && !tops.some((top) => Math.abs(top - box.top) < half)) tops.push(box.top);
      }
    }
    if (tops.length > lines) {
      lines = tops.length;
      tile = node.dataset.tile ?? '';
    }
  }
  const last = tiles.at(-1);
  return {
    lines,
    tile,
    tiles: tiles.length,
    under: last === undefined ? 0 : Math.round(last.getBoundingClientRect().bottom - innerHeight),
    sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

interface Card {
  /** How far the foot of « Mot suivant » is under the window: 0 or less, it is whole in it. */
  under: number;
  /** The word is still in the window, under the header of the site. */
  word: boolean;
  sentence: boolean;
  label: boolean;
  sideways: number;
}
const CARD = `(() => {
  const next = document.querySelector('#game-live .g-place .g-next');
  const word = document.querySelector('#game-live .g-the-word');
  const header = document.querySelector('header.site').getBoundingClientRect().bottom;
  const at = word === null ? null : word.getBoundingClientRect();
  return {
    under: next === null ? 9999 : Math.round(next.getBoundingClientRect().bottom - innerHeight),
    word: at !== null && at.top >= header - 1 && at.bottom <= innerHeight,
    sentence: document.querySelector('#game-live .g-place [data-generated-by="ai"]') !== null,
    label: document.querySelector('#game-live .g-place .g-gist-badge') !== null,
    sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

interface End {
  under: number;
  recall: number;
  ahead: number;
  sideways: number;
}
const END = `(() => {
  const panel = document.querySelector('#game-live .g-end');
  const again = panel === null ? null : panel.querySelector('.g-actions button');
  return {
    under: again === null ? 9999 : Math.round(again.getBoundingClientRect().bottom - innerHeight),
    recall: document.querySelectorAll('#game-live .g-recall .g-reopen').length,
    ahead: document.querySelectorAll('#game-live .g-ahead [data-programme="word"]').length,
    sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  };
})()`;

const press = async (page: Page, name: string): Promise<void> => {
  await page.getByRole('button', { name, exact: true }).first().click();
};

async function main(): Promise<void> {
  const data = gameOf(root);
  const rounds = Math.ceil(data.words.length / ROUND);
  const withSentence = data.words.filter((word) => word.gist !== undefined).length;
  const { server, origin } = await serve(root);
  const browser = await chromium.launch();
  const failures: string[] = [];
  console.log(
    `${String(data.words.length)} words, ${String(rounds)} rounds, ${String(withSentence)} cards with a sentence — ${root.split('/').at(-1) ?? root}`,
  );
  try {
    for (const [width, height] of SIZES) {
      const size = `${String(width)} × ${String(height)}`;
      let most = { lines: 0, tile: '', word: '' };
      const overLines: string[] = [];
      const asksUnder: string[] = [];
      const cardsUnder: string[] = [];
      const wordGone: string[] = [];
      const unlabelled: string[] = [];
      const endsUnder: string[] = [];
      const sideways: string[] = [];
      let sentences = 0;
      let played = 0;
      /** The least room left under « Mot suivant », and how far the entrance's door goes. */
      let tightest = Infinity;
      let doorUnder = 0;
      for (let round = 1; round <= rounds; round += 1) {
        const context = await browser.newContext({
          viewport: { width, height },
          reducedMotion: 'reduce',
          locale: 'fr-FR',
        });
        await context.addInitScript(
          `if (location.protocol.startsWith('http') && window.name !== 'seeded') { window.name = 'seeded'; sessionStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(before(data, round))}); }`,
        );
        const page = await context.newPage();
        await page.goto(`${origin}/`);
        await page.locator('#jeu').scrollIntoViewIfNeeded();
        await until(page, "!document.querySelector('#game-live').hidden");
        const dealt = data.words.slice((round - 1) * ROUND, round * ROUND);
        for (const word of dealt) {
          // A newcomer finds three words to touch (D19.16): the first of them, and its card.
          const entrance = page.locator('#game-live .g-pick-word').first();
          if ((await entrance.count()) > 0) {
            const door = await page.evaluate<number>(
              "Math.round(document.querySelector('#game-live .g-door').getBoundingClientRect().bottom - innerHeight)",
            );
            if (door > 0) doorUnder = door;
            await entrance.click();
            await until(page, "document.querySelector('#game-live .g-place .g-next') !== null");
            const first = await page.evaluate<Card>(CARD);
            played += 1;
            tightest = Math.min(tightest, -first.under);
            if (first.under > 0) cardsUnder.push(`${word.id}(+${String(first.under)})`);
            if (first.sentence) sentences += 1;
            if (first.sentence !== first.label || first.sentence !== (word.gist !== undefined)) {
              unlabelled.push(word.id);
            }
            await press(page, 'Mot suivant');
            continue;
          }
          const asked = await page.evaluate<Question>(QUESTION);
          if (asked.lines > most.lines)
            most = { lines: asked.lines, tile: asked.tile, word: word.id };
          if (asked.lines > MAX_LINES)
            overLines.push(`${word.id}:${asked.tile}(${String(asked.lines)})`);
          if (asked.under > 0) asksUnder.push(`${word.id}(+${String(asked.under)})`);
          if (asked.sideways > 0) sideways.push(`${word.id}?`);
          await page.locator('#game-live .g-tile').first().click();
          await until(page, "document.querySelector('#game-live .g-place .g-next') !== null");
          const card = await page.evaluate<Card>(CARD);
          played += 1;
          tightest = Math.min(tightest, -card.under);
          if (card.under > 0) cardsUnder.push(`${word.id}(+${String(card.under)})`);
          if (!card.word) wordGone.push(word.id);
          if (card.sentence) sentences += 1;
          if (card.sentence !== card.label || card.sentence !== (word.gist !== undefined)) {
            unlabelled.push(word.id);
          }
          if (card.sideways > 0) sideways.push(`${word.id}!`);
          await press(page, 'Mot suivant');
        }
        await until(page, "document.querySelector('#game-live .g-end') !== null");
        const end = await page.evaluate<End>(END);
        if (end.under > 0) endsUnder.push(`${String(round)}(+${String(end.under)})`);
        // The words to come are announced while one of them is new: not once all are found.
        if (end.recall !== (round === 1 ? 1 : 2) || end.ahead !== (round === rounds ? 0 : ROUND)) {
          failures.push(
            `${size}: round ${String(round)} offers ${String(end.recall)} word(s) to remember and ${String(end.ahead)} to come`,
          );
        }
        if (end.sideways > 0) sideways.push(`end ${String(round)}`);
        await context.close();
      }
      console.log(`\n${size} — ${String(played)} cards, ${String(sentences)} with their sentence`);
      console.log(
        `  tiles: ${String(most.lines)} lines at most (${most.word}, ${most.tile})${overLines.length === 0 ? '' : ` — OVER ${String(MAX_LINES)}: ${overLines.join(', ')}`}`,
      );
      console.log(
        `  questions: every tile in the window on ${String(played - asksUnder.length)} of ${String(played)}${asksUnder.length === 0 ? '' : ` — the last tile under it: ${asksUnder.join(', ')}`}`,
      );
      console.log(
        `  entrance: its last line ${doorUnder > 0 ? `ends ${String(doorUnder)} px under the window` : 'is in the window'}`,
      );
      console.log(
        `  cards: « Mot suivant » whole in the window on ${String(played - cardsUnder.length)} of ${String(played)}${cardsUnder.length === 0 ? ` — ${String(tightest)} px to spare on the tightest` : ` — under it: ${cardsUnder.join(', ')}`}`,
      );
      if (wordGone.length > 0)
        console.log(`  the word is out of the window on: ${wordGone.join(', ')}`);
      console.log(
        `  round ends: « Trois autres mots » whole in the window on ${String(rounds - endsUnder.length)} of ${String(rounds)}${endsUnder.length === 0 ? '' : ` — under it: ${endsUnder.join(', ')}`}`,
      );
      if (sideways.length > 0)
        failures.push(`${size}: overflows sideways at ${sideways.join(', ')}`);
      if (unlabelled.length > 0) {
        failures.push(
          `${size}: a sentence without its label, or missing: ${unlabelled.join(', ')}`,
        );
      }
      if (overLines.length > 0) failures.push(`${size}: tiles over ${String(MAX_LINES)} lines`);
      if (size === NAMED && cardsUnder.length > 0) {
        failures.push(`${size}: « Mot suivant » out of the window on ${cardsUnder.join(', ')}`);
      }
      if (sentences !== withSentence) {
        failures.push(
          `${size}: ${String(sentences)} sentences shown for ${String(withSentence)} in the file`,
        );
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  if (failures.length > 0) {
    console.log(`\n${String(failures.length)} failure(s):\n  ${failures.join('\n  ')}`);
    process.exitCode = 1;
  } else {
    console.log(
      '\nthe two criteria of the plan hold: no tile over five lines; at 390 × 844 every card shows its way on',
    );
  }
}

await main();
