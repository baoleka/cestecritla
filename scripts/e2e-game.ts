/**
 * End-to-end checks of « Où est-ce écrit ? » and its mascot — the second generation, served
 * since 15 November 2026 (D17.1 to D17.36; docs/discovery/PLAN-TORTUE.md) —, in three browser
 * engines, on the test build of the app (dist-ask/, which nothing deploys).
 *
 *   npm run build:ask && npm run e2e:game                          Chromium, Firefox, WebKit
 *   npx tsx scripts/e2e-game.ts --engines chromium
 *   npx tsx scripts/e2e-game.ts --engines chromium --no-lab      on a machine that is not at rest
 *   npm run build && npx tsx scripts/e2e-game.ts --root dist       the build a host serves
 *   npx tsx scripts/e2e-game.ts --root dist --origin https://beta.cestecritla.fr   …where it is served
 *
 * Until lot F this file was scripts/e2e-game2.ts, and scripts/e2e-game.ts held the game of the
 * first generation on its own build; that generation and its gate are in the history of the
 * repository. The game is the same, rule for rule. What this file holds:
 *
 *   1. without JavaScript the first round is whole and playable, she is there once, as the
 *      turtle, and nothing is offered that only a script can answer;
 *   2. the script takes the block over without moving the focus or the page, with ONE request,
 *      and nothing of her moves at arrival;
 *   3. a choice is never wrong, and her small move for a word found is the same whatever was
 *      chosen; what will make her change is said beside her before a first word is found;
 *   4. the end of a round: she takes the stage, the three finds come to her, and — the round
 *      that earns it — she passes to her next form, beat by beat as the choreography says,
 *      once, ending on the still look, with its sentence said when it has been seen;
 *   5. a passage is skipped by « Passer », by a touch on the stage, by Escape, by any button of
 *      the game — whose press reaches its target; with less motion asked nothing starts;
 *      nothing is played at load, from the tab, the phone, another tab or the browser's cache;
 *   6. her goal is said in words at the end of every round, never a number, never a judgement;
 *   7. the tab remembers from the first reveal, the phone only after « Garder ta tortue »; what
 *      is written never depends on a choice, and without a colour it is byte for byte what the
 *      first generation writes; what the first generation wrote reads back as it was;
 *   8. her sheet: her figure, the forms she has had and never one to come, « Revoir », her
 *      colour — six by their name, or none —, which is on her flamingo and nowhere else, in no
 *      request and no address; on the phone only once it keeps; the last gesture wins;
 *   9. where she stands and how large, at the widths of real phones;
 *   9 bis. what the independent readings of 15/11/2026 found: the word never cut beside her,
 *      « Site non officiel. » in the frame of her sheet wherever it is scrolled, a key held down
 *      pressing once, the focus kept when her sheet closes, a passage cut short still said,
 *      a tap meant for « Passer » opening nothing, the question heard with its word;
 *  10. electoral silence, as before — and a freeze that starts during a passage stops it;
 *  11. the screens of the game pass the accessibility audit under the nine conditions every
 *      page is audited under;
 *  12. in Chromium: the page does not move once painted; every passage keeps its frames with
 *      the processor slowed four times, on the page of the game itself; and, filmed there in
 *      both themes, none of them flashes.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Browser, BrowserContext, Page } from 'playwright';
import {
  ROUND,
  depthOf,
  draw,
  isLongWord,
  isShortWord,
  endOfRound,
  locate,
  otherParts,
  type GameData,
  type RoundEnd,
  type Standing,
} from '../src/lib/game-engine.js';
import { DOOR_THEMES } from '../src/lib/game-door.js';
import { lineAtRoundEnd, nextRoundChangesHer } from '../src/lib/game-goal.js';
import { recallFor } from '../src/lib/game-recall.js';
import { KEPT_FIELDS, TAB_FIELDS, serialiseTab } from '../src/lib/game-state.js';
import { KEPT_FIELDS2, STORAGE_KEY, TAB_FIELDS2 } from '../src/lib/game-state2.js';
import {
  PASSAGES,
  PULSE_HOLD_MS,
  TRICK_HOLD_MS,
  evolution,
  evolutionLasts,
  lookOf,
  passageTo,
  type MascotLook,
  type MascotTint,
  type Passage,
  type TurtleState,
} from '../src/lib/mascot2.js';
import { STORAGE_MAP } from '../src/lib/storage-map.js';
import { arcAttributes } from '../src/lib/turtle.js';
import type { Manifest } from './aec26-types.js';
import { CONDITIONS, rootFontScript } from './a11y-conditions.js';
import {
  ENGINES,
  STILL,
  checker,
  lateLayoutShift,
  report,
  serve,
  until,
  type Outcome,
} from './e2e-kit.js';
import { FLASH_AREA_PX, LINE_MIN, contrastRatio } from './mascot2-kit.js';
import { flashesOf, readPng, withinFlashRule, type Picture } from './picture-kit.js';

/**
 * The build that is played: the test build of the app — or, with `--root dist`, the build a host
 * serves.
 */
const rootAt = process.argv.indexOf('--root');
const ROOT = rootAt === -1 ? 'dist-ask' : (process.argv[rootAt + 1] ?? 'dist-ask');

/** What the local server is told to do for a check: fail the game's data, or set its own hour. */
interface ServerState {
  failData: boolean;
  /** `/flags.json` as served: the hour in its `Date` header, and the override. Null: the file. */
  flags: { date: Date; override?: string } | null;
}
/** What the game's own voice never says (titles of the book are not ours, and are left out). */
const NEVER =
  /\b(?:faux|fausse|perdu|perdue|raté|ratée|erreur|mauvais|mauvaise|bravo|félicitations?|score|niveau|classement|points?)\b|%|\d\s*(?:\/|sur)\s*\d/i;

/**
 * The text of the block that is the INTERFACE's: the word and the official titles removed —
 * and the sentence of a measure (D19.2), which is ours but not the game speaking: it says what a
 * measure provides, numbers and all, and is held to its own checks (its label, its marking,
 * the file it comes from).
 */
const OWN_VOICE = `(() => {
  const copy = document.querySelector('#jeu').cloneNode(true);
  for (const node of copy.querySelectorAll('[data-programme], [data-generated-by], script, [hidden]')) node.remove();
  return copy.textContent.replace(/\\s+/g, ' ').trim();
})()`;

/** The entrance of the game (D19.15, D19.16), as the HTML holds it or as the script draws it. */
interface Entrance {
  lead: string[];
  /**
   * The three words to touch, in order: the word, what completes its name for a screen
   * reader, what it is (`a` in the HTML, `button` once drawn), its anchor, and whether the
   * word is marked as a word of the programme.
   */
  words: [string, string, string, string | null, boolean][];
  how: string;
  /** The other door: its title, the way to the search, the themes (text, link, name aloud). */
  findTitle: string;
  find: [string, string | null];
  themes: [string, string | null, string | null][];
  /** What an entrance never holds: a tile, a question, a sentence about her — shown. */
  tiles: number;
  asks: number;
  ofHer: number;
  /** The order of what it holds, and where its pieces stand on the page. */
  order: string[];
  at: { lead: number; rows: number[]; rowHeights: number[]; how: number; door: number };
}
const entranceIn = (root: string): string => `(() => {
  const flat = (node) => (node ? node.textContent.replace(/\\s+/g, ' ').trim() : '');
  const seen = (node) => node !== null && node.getClientRects().length > 0;
  const down = (node) => Math.round(node.getBoundingClientRect().top + scrollY);
  const scope = document.querySelector(${JSON.stringify(root)});
  const box = scope.querySelector('.g-enter');
  const door = box.querySelector('.g-door');
  const find = door.querySelector('.g-find');
  const rows = [...box.querySelectorAll('.g-pick .g-pick-word')];
  return {
    lead: [...box.querySelectorAll('.g-lead span')].map(flat),
    words: rows.map((row) => [
      flat(row.querySelector('.g-picked')),
      flat(row.querySelector('.sr-only')),
      row.tagName.toLowerCase(),
      row.getAttribute('href'),
      row.querySelector('.g-picked').getAttribute('data-programme') === 'word',
    ]),
    how: flat(box.querySelector('.g-how')),
    findTitle: flat(door.querySelector('h3')),
    find: [flat(find), find.getAttribute('href')],
    themes: [...door.querySelectorAll('li a')].map((a) => [flat(a), a.getAttribute('href'), a.getAttribute('aria-label')]),
    tiles: [...scope.querySelectorAll('.g-tile')].filter(seen).length,
    asks: [...scope.querySelectorAll('.g-ask')].filter(seen).length,
    ofHer: [...scope.querySelectorAll('.g-goal')].filter(seen).length,
    order: [...box.children].map((node) => node.classList[0] || node.tagName.toLowerCase()),
    at: {
      lead: down(box.querySelector('.g-lead')),
      rows: rows.map(down),
      rowHeights: rows.map((row) => Math.round(row.getBoundingClientRect().height)),
      how: down(box.querySelector('.g-how')),
      door: Math.round(door.getBoundingClientRect().bottom + scrollY),
    },
  };
})()`;

/** What the end of a round holds under its title (lot 6), as the page shows it. */
interface EndPanel {
  /** Its children, in order: the first class of each, or its tag. */
  order: string[];
  line: string;
  title: string;
  lead: string;
  /** The words of « Tu te souviens ? », and whether each is open. */
  words: string[];
  expanded: string[];
  cards: number;
  ahead: string;
  aheadWords: string[];
  keep: string;
}
const END_PANEL = `(() => {
  const flat = (node) => (node ? node.textContent.replace(/\\s+/g, ' ').trim() : '');
  const panel = document.querySelector('#game-live .g-end');
  const recall = panel.querySelector('.g-recall');
  return {
    order: [...panel.children].map((node) => node.classList[0] || node.tagName.toLowerCase()),
    line: flat(panel.querySelector('.g-line')),
    title: flat(recall && recall.querySelector('h4')),
    lead: flat(recall && recall.querySelector('p')),
    words: recall ? [...recall.querySelectorAll('button [data-programme="word"]')].map(flat) : [],
    expanded: recall ? [...recall.querySelectorAll('button')].map((b) => b.getAttribute('aria-expanded')) : [],
    cards: panel.querySelectorAll('.g-recall .g-place').length,
    ahead: flat(panel.querySelector('.g-ahead')),
    aheadWords: [...panel.querySelectorAll('.g-ahead [data-programme="word"]')].map(flat),
    keep: flat(panel.querySelector('.g-keep-ask')),
  };
})()`;

/** A list of words whose card opens again (« Tu te souviens ? », her sheet): what is open. */
interface Reopened {
  cards: number;
  /** The card is the very next item after the word that opened it. */
  next: boolean;
  /** The focus is on a word that says it is open — or, nothing being open, on a word. */
  focus: boolean;
  /** The card's top is in view: in the window, and in her sheet when it is there. */
  inView: boolean;
  said: string;
  where: string[];
  href: string;
  gist: string;
  badge: string;
  /** Ways on in the card (« Mot suivant »): none. */
  ways: number;
  titles: number;
  gistAsProgramme: number;
  expanded: string[];
}
const reopenedIn = (selector: string): string => `(() => {
  const box = document.querySelector(${JSON.stringify(selector)});
  const flat = (node) => (node ? node.textContent.replace(/\\s+/g, ' ').trim() : '');
  const card = box.querySelector('.g-again .g-place');
  const open = [...box.querySelectorAll('button[aria-expanded="true"]')];
  const active = document.activeElement;
  const sheet = box.closest('dialog');
  const frame = sheet ? sheet.getBoundingClientRect() : { top: 0, bottom: innerHeight };
  const top = card ? card.getBoundingClientRect().top : -1;
  return {
    cards: box.querySelectorAll('.g-place').length,
    next: card !== null && open.length === 1 && open[0].closest('li').nextElementSibling === card.closest('li'),
    focus: active !== null && active.matches('button.g-reopen') && box.contains(active) && (open.length === 0 || active === open[0]),
    inView: card !== null && top >= Math.max(0, frame.top) && top < Math.min(innerHeight, frame.bottom),
    said: flat(card && card.querySelector('.g-said')),
    where: card ? [...card.querySelectorAll('.g-where li')].map(flat) : [],
    href: card ? card.querySelector('a.cta').getAttribute('href') : '',
    gist: flat(card && card.querySelector('[data-generated-by="ai"]')),
    badge: flat(card && card.querySelector('.g-gist-badge')),
    ways: card ? card.querySelectorAll('.g-next, .g-actions').length : 0,
    titles: card ? card.querySelectorAll('.g-where [data-programme="title"]').length : 0,
    gistAsProgramme: card ? card.querySelectorAll('.g-gist [data-programme], .g-gist[data-programme]').length : 0,
    expanded: open.map(flat),
  };
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

/** Her drawing in the block — the one — and the large copy of her sheet. */
const HER = '#game-her svg.mascot';
const LARGE = '#turtle-sheet-her svg.mascot';

/** What is written on a drawing of her, read from the page. */
interface Written {
  state: string | null;
  pose: string | null;
  tint: string | null;
  sign: string | null;
  passage: boolean;
  phase: string | null;
  live: boolean;
  /** For each of her three arcs, every copy of it: `dasharray|dashoffset`. */
  arcs: string[][];
}
const written = (selector: string): string => `(() => {
  const svg = document.querySelector(${JSON.stringify(selector)});
  if (svg === null) return null;
  return {
    state: svg.getAttribute('data-state'),
    pose: svg.getAttribute('data-pose'),
    tint: svg.getAttribute('data-tint'),
    sign: svg.getAttribute('data-sign'),
    passage: svg.hasAttribute('data-passage'),
    phase: svg.getAttribute('data-phase'),
    live: svg.hasAttribute('data-live'),
    arcs: [1, 2, 3].map((n) =>
      [...svg.querySelectorAll('.m-arc-' + String(n))].map(
        (arc) => arc.getAttribute('stroke-dasharray') + '|' + arc.getAttribute('stroke-dashoffset'),
      ),
    ),
  };
})()`;

/** Whether what is written on a drawing is this look, at rest in time: no beat under way. */
function isLook(seen: Written | null, look: MascotLook): boolean {
  if (seen === null) return false;
  const arcs = look.arcs.map((steps) => {
    const { dasharray, dashoffset } = arcAttributes(steps);
    return `${dasharray}|${dashoffset}`;
  });
  return (
    seen.state === String(look.state) &&
    seen.pose === look.pose &&
    seen.tint === String(look.tint) &&
    seen.sign === String(look.sign) &&
    seen.passage === look.passage &&
    seen.phase === null &&
    seen.arcs.every(
      (copies, index) => copies.length === 3 && copies.every((a) => a === arcs[index]),
    )
  );
}

/**
 * Installed in a page: a log of everything written on a drawing of her — one line each time a
 * script writes on it — and a way to press a button of the game and start the clock at once.
 */
const WATCH = `(() => {
  window.__watch = (selector) => {
    const svg = document.querySelector(selector);
    const seen = { log: [], t0: performance.now(), most: 0 };
    new MutationObserver(() => {
      seen.most = Math.max(seen.most, document.getAnimations().length);
      seen.log.push([
        Math.round(performance.now() - seen.t0),
        svg.getAttribute('data-phase') ?? '',
        svg.getAttribute('data-state'),
        svg.getAttribute('data-pose'),
        svg.hasAttribute('data-passage') ? 1 : 0,
        svg.getAttribute('data-tint'),
      ]);
    }).observe(svg, { attributes: true });
    return seen;
  };
  window.__press = (name, scope) => {
    const button = [...document.querySelectorAll((scope ?? '#jeu') + ' button')].find(
      (b) => b.textContent.trim() === name && b.getClientRects().length > 0,
    );
    for (const seen of Object.values(window.__seen ?? {})) {
      seen.log.length = 0;
      seen.most = 0;
      seen.t0 = performance.now();
    }
    button.click();
  };
  // Every frame for a while, timed and nothing else: what a measure must not slow.
  window.__frames = (forMs) =>
    new Promise((done) => {
      const deltas = [];
      const start = performance.now();
      let last = start;
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (now - start < forMs) requestAnimationFrame(tick);
        else done(deltas);
      };
      requestAnimationFrame(tick);
    });
  window.__seen = {};
})()`;
/** One line of the log: when, the beat, her state, her pose, the accent, her colour. */
type Logged = [number, string, string | null, string | null, number, string | null];

/**
 * `--no-lab`: the machine is not at rest — a shared runner of the CI. What only a quiet machine
 * can measure is then left to the editor's (her frames with the processor slowed, the film of
 * her flashes), and a timer is forgiven for being late. Every rule is held all the same.
 */
const LAB = !process.argv.includes('--no-lab');
/**
 * `--only visit,sheet`: some sections of the gate, to work on one. Never the gate: a run asked
 * for in part says so, and does not end as a success.
 */
const onlyAt = process.argv.indexOf('--only');
const ONLY = onlyAt === -1 ? null : (process.argv[onlyAt + 1] ?? '').split(',');
/**
 * `--origin https://…`: the same game, played on a host that serves the build in `--root` — what
 * was deployed, where it is served. Three sections stay with the local run: two need a server
 * this script commands (`offline`: a file made to fail; `silence`: an hour it sets), and the
 * measures and audits read files that are, byte for byte, the ones a local run has read.
 */
const originAt = process.argv.indexOf('--origin');
const ONLINE = originAt === -1 ? null : (process.argv[originAt + 1] ?? '').replace(/\/$/, '');
const LOCAL_ONLY = new Set(['offline', 'silence', 'audit', 'forced', 'measures']);
/** How late a timer of a browser may give her a beat, and how early (it never does). */
const LATE_MS = LAB ? 150 : 500;
const EARLY_MS = 5;
/** After a passage, a tap on « Sa fiche » or on her within this is taken for a tap meant for it. */
const HANDOVER_MS = 500;
/** A sentence carried past a passage is said this long after the new screen is up. */
const SAY_LATER_MS = 150;
/** A card comes in over this long, after the gesture that asked for it (`--duration-reveal`). */
const REVEAL_MS = 240;
/** Her drawings swap their form or colour at most once this long, at a press. */
const SWAP_GAP_MS = 350;
/** How long she looks at the tiles before a hint marks them. */
const LOOKS_FOR_MS = 240;
/** After a gesture, and after the end of a round that earns a passage: nothing moves any more. */
const ALONE_MS = 2100;
const ALONE_AFTER_PASSAGE_MS = 5000;

/** The game after a number of whole rounds, played in the order of the list. */
function after(data: GameData, rounds: number): { standing: Standing; seen: string[] } {
  let standing: Standing = { depth: 1, state: 0, arcs: [0, 0, 0] };
  const seen: string[] = [];
  for (let round = 0; round < rounds; round += 1) {
    // The draw is the game's: the order of the list, and on from there once all is found.
    for (const id of draw(data, seen, seen.at(-1) ?? null)) if (!seen.includes(id)) seen.push(id);
    const end = endOfRound(data, standing, seen);
    standing = { depth: end.depth, state: end.state, arcs: end.arcs };
  }
  return { standing, seen };
}

/** What the end of a round is, for the game and for her: computed, never typed. */
interface Ending {
  before: Standing;
  end: RoundEnd;
  /** The last card of the round is on screen: one press ends it. */
  stored: string;
  /** The sentences said of her under the title, in order. */
  said: string[];
  passage: Passage | null;
  /** The words of the round, and everything found once it has ended. */
  words: string[];
  seen: string[];
}
function ending(
  data: GameData,
  kit: Readonly<Record<string, string>>,
  round: number,
  more: { tint?: MascotTint; declined?: boolean } = {},
): Ending {
  const { standing: before, seen: seenBefore } = after(data, round - 1);
  const words = draw(data, seenBefore, seenBefore.at(-1) ?? null);
  const seen = [...seenBefore, ...words.filter((id) => !seenBefore.includes(id))];
  const end = endOfRound(data, before, seen);
  const line = lineAtRoundEnd(end, nextRoundChangesHer(data, end, seen, words.at(-1) ?? null));
  const said = [
    ...(line.passage === null ? [] : [kit[`turtle.passage.${String(line.passage)}`] ?? '']),
    ...(line.goal === null ? [] : [kit[`turtle.goal.${line.goal}`] ?? '']),
  ];
  const stored = {
    corpus: data.corpus,
    seen,
    depth: before.depth,
    turtle: before.state,
    arcs: before.arcs,
    round: { words, at: words.length - 1, shown: true },
    declined: more.declined ?? true,
    ...(more.tint === undefined || more.tint === 0 ? {} : { tint: more.tint }),
  };
  return {
    before,
    end,
    stored: JSON.stringify(stored),
    said,
    passage: end.passage && end.state === before.state + 1 ? passageTo(end.state) : null,
    words,
    seen,
  };
}

/** The game at the start of a round, as a tab holds it: nothing under way. */
function resting(data: GameData, rounds: number, tint: MascotTint = 0): string {
  const { standing, seen } = after(data, rounds);
  return JSON.stringify({
    corpus: data.corpus,
    seen,
    depth: standing.depth,
    turtle: standing.state,
    arcs: standing.arcs,
    round: null,
    declined: true,
    ...(tint === 0 ? {} : { tint }),
  });
}

/**
 * Writes a game in the tab before the page reads it — once: a reload finds what was played.
 * (Only on a page of ours: the empty page a tab opens on has no storage of the site.)
 */
const seedTab = (stored: string): string =>
  `if (location.protocol.startsWith('http') && window.name !== 'seeded') { window.name = 'seeded'; sessionStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(stored)}); }`;

/** Text as a reader sees it: every kind of space folded into one plain space. */
const text = (value: string | null): string => (value ?? '').replace(/\s+/g, ' ').trim();
/** A sentence of the kit as a page shows it. */
const shown = (sentence: string): string => text(sentence.replace(/'/g, '’'));

async function runEngine(
  name: string,
  origin: string,
  data: GameData,
  manifest: Manifest,
  server: ServerState,
): Promise<Outcome> {
  const type = ENGINES[name];
  if (type === undefined) throw new Error(`unknown engine ${name}`);
  const { out, check } = checker(name);
  // Online, the pages are served with `Cross-Origin-Opener-Policy: same-origin`: Firefox gives
  // each tab a process of its own, and the driver of the automated Firefox then never sees a
  // second tab of a context load — on production too, which this gate does not touch (found on
  // 15/11/2026). That Firefox is told to ignore the policy; nothing the game does depends on it.
  const browser = await type.launch(
    ONLINE !== null && name === 'firefox'
      ? { firefoxUserPrefs: { 'browser.tabs.remote.useCrossOriginOpenerPolicy': false } }
      : {},
  );
  const kit = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, string>;
  const says = (key: string): string => shown(kit[key] ?? `(no ${key})`);
  const first = data.words.slice(0, ROUND);
  const partTitles = manifest.parts
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((p) => p.title);
  const sectionUrl = (id: string): string => manifest.sections.find((s) => s.id === id)?.url ?? '';
  /** A word of the game by its identifier, as the page writes it. */
  const wordOf = (id: string | null): string =>
    data.words.find((w) => w.id === id)?.word ?? '(none)';
  const visibleHeadings = async (page: Page): Promise<string[]> =>
    (await page.locator('#jeu h3:visible').allTextContents()).map(text);
  const phone = { viewport: { width: 390, height: 844 } };

  /** What any visit of this run broke: an error of ours, or our own security policy. */
  const breaches: string[] = [];
  const watched = new WeakSet<Page>();
  /** A page on the game, the script in charge of the block, her log started. */
  const arrive = async (view: Page, path = '/'): Promise<void> => {
    if (!watched.has(view)) {
      watched.add(view);
      view.on('pageerror', (e) => breaches.push(String(e)));
      view.on('console', (m) => {
        if (
          /Content Security Policy|Trusted ?Types|Refused to/i.test(m.text()) &&
          !/duplicate/i.test(m.text())
        ) {
          breaches.push(m.text());
        }
      });
    }
    await view.goto(`${origin}${path}`);
    await until(view, "!document.querySelector('#game-live').hidden");
    await view.evaluate(WATCH);
    await view.evaluate(`window.__seen.her = window.__watch(${JSON.stringify(HER)})`);
  };
  /** A visitor whose tab already holds a game. */
  const visitor = async (
    stored: string | null,
    options: Parameters<Browser['newContext']>[0] = phone,
  ): Promise<{ context: BrowserContext; view: Page }> => {
    const context = await browser.newContext(options);
    if (stored !== null) await context.addInitScript(seedTab(stored));
    const view = await context.newPage();
    await arrive(view);
    return { context, view };
  };
  const press = (view: Page, label: string, scope?: string): Promise<void> =>
    view.evaluate(
      `window.__press(${JSON.stringify(label)}${scope === undefined ? '' : `, ${JSON.stringify(scope)}`})`,
    );
  const her = (view: Page, selector = HER): Promise<Written | null> =>
    view.evaluate<Written | null>(written(selector));
  const logOf = (view: Page, which = 'her'): Promise<Logged[]> =>
    view.evaluate<Logged[]>(`window.__seen[${JSON.stringify(which)}].log`);
  const moving = (view: Page): Promise<number> =>
    view.evaluate<number>('document.getAnimations().length');
  /** The card of « Garder ta tortue », opened by its quiet button (D19.11). */
  const openKeep = async (view: Page): Promise<void> => {
    await view.getByRole('button', { name: says('turtle.keep.open') }).click();
  };
  /**
   * The card of a word, without a choice: on the entrance — three words to touch (D19.16) —
   * the first of them, or the one asked for; on a question, « Je ne sais pas ». The same
   * gesture under two names: both show the card and judge nothing.
   */
  const reveal = async (view: Page, row = 0): Promise<void> => {
    const entrance = view.locator('#game-live .g-pick-word');
    if ((await entrance.count()) > 0) await entrance.nth(row).click();
    else await view.getByRole('button', { name: 'Je ne sais pas' }).click();
  };
  const playRound = async (view: Page): Promise<void> => {
    for (let i = 0; i < ROUND; i += 1) {
      await reveal(view);
      await view.getByRole('button', { name: 'Mot suivant' }).click();
    }
  };
  /** What is visible of the row under the stage, of the line about her, of the stage itself. */
  interface Staged {
    stage: boolean;
    width: number;
    height: number;
    block: number;
    skip: boolean;
    sheet: boolean;
    tint: boolean;
    line: string;
    lineSeen: boolean;
    status: string;
    again: number;
  }
  const staged = (view: Page): Promise<Staged> =>
    view.evaluate<Staged>(`(() => {
      const seen = (node) =>
        node !== null && node.getClientRects().length > 0 && getComputedStyle(node).visibility === 'visible';
      const box = document.querySelector('${HER}').getBoundingClientRect();
      const line = document.querySelector('#game-live .g-line');
      const again = [...document.querySelectorAll('#game-live button')].find(
        (b) => b.textContent.trim() === 'Trois autres mots',
      );
      return {
        stage: document.querySelector('#jeu').hasAttribute('data-stage'),
        width: box.width,
        height: box.height,
        block: document.querySelector('#jeu').getBoundingClientRect().width,
        skip: seen(document.querySelector('#game-skip')),
        sheet: seen(document.querySelector('#game-sheet-link')),
        tint: seen(document.querySelector('#game-tint-link')),
        line: line === null ? '' : line.textContent.replace(/\\s+/g, ' ').trim(),
        lineSeen: seen(line),
        status: document.querySelector('#game-status').textContent.replace(/\\s+/g, ' ').trim(),
        again: again === undefined ? -1 : Math.round(again.getBoundingClientRect().top + scrollY),
      };
    })()`);

  /** The beats a log holds, in the order they were given to her. */
  const beats = (log: readonly Logged[]): string[] =>
    log.map((line) => line[1]).filter((phase, index, all) => phase !== all[index - 1]);
  /** Every frame was given to her when the choreography says: never early, and hardly late. */
  const onTime = (
    log: readonly Logged[],
    frames: readonly { at: number; phase: string | null }[],
  ): boolean =>
    frames.every((frame) => {
      const line = log.find(
        (entry) => entry[1] === (frame.phase ?? '') && entry[0] >= frame.at - EARLY_MS,
      );
      return line !== undefined && line[0] <= frame.at + LATE_MS;
    });
  const sheetOpen = (view: Page): Promise<boolean> =>
    view.locator('#turtle-sheet').evaluate((dialog) => (dialog as HTMLDialogElement).open);
  /** The word on screen — or, on the entrance, its three words, « a · b · c ». */
  const wordShown = async (view: Page): Promise<string> =>
    (
      await view
        .locator('#game-live .g-the-word[data-programme="word"], #game-live .g-picked')
        .allTextContents()
    )
      .map(text)
      .join(' · ');
  /** What `wordShown` says on the entrance of a game where nothing has been found. */
  const ENTRANCE = first.map((w) => w.word).join(' · ');
  /** The round whose end makes each passage, on the list as it is. */
  const total = Math.ceil(data.words.length / ROUND);
  const passageRound = new Map<Passage, number>();
  for (let round = 1; round <= total; round += 1) {
    const { passage } = ending(data, kit, round);
    if (passage !== null && !passageRound.has(passage)) passageRound.set(passage, round);
  }
  /** How many whole rounds give her each state. */
  const roundsFor = (state: TurtleState): number =>
    Array.from({ length: total + 1 }, (_, rounds) => rounds).find(
      (rounds) => after(data, rounds).standing.state === state,
    ) ?? 0;

  // --- 4 bis. her four passages, each from a tab that is one press from the end of its round
  async function runPassages(): Promise<void> {
    check(
      'the list makes her pass four times, one state at a time',
      PASSAGES.every((passage) => passageRound.has(passage)),
      JSON.stringify([...passageRound]),
    );
    for (const passage of PASSAGES) {
      const round = passageRound.get(passage);
      if (round === undefined) continue;
      // A flamingo has the colour it was given: her passages are played in it.
      const tint: MascotTint = passage === '23' || passage === '34' ? 3 : 0;
      const at = ending(data, kit, round, { tint });
      const from = { state: at.before.state, arcs: at.before.arcs, tint };
      const to = { state: at.end.state, arcs: at.end.arcs, tint };
      const frames = evolution(from, to);
      const { context, view } = await visitor(at.stored);
      check(
        `${passage}: before the round ends she is as she was, and nothing has been played`,
        isLook(await her(view), lookOf(from)) &&
          (await logOf(view)).length === 0 &&
          (await moving(view)) === 0,
        JSON.stringify(await her(view)),
      );
      await press(view, 'Mot suivant');
      await view.waitForTimeout(evolutionLasts(passage) + LATE_MS + 100);
      const log = await logOf(view);
      check(
        `${passage}: played beat by beat as the choreography says — ${String(evolutionLasts(passage))} ms —, never early`,
        JSON.stringify(beats(log)) === JSON.stringify(frames.map((f) => f.phase ?? '')) &&
          onTime(log, frames) &&
          evolutionLasts(passage) === (frames.at(-1)?.at ?? 0),
        JSON.stringify(log.map((line) => [line[0], line[1]])),
      );
      const most = await view.evaluate<number>('window.__seen.her.most');
      check(`${passage}: she moved while she passed`, most > 0, String(most));
      const became = await her(view);
      check(
        `${passage}: she ends as the still look draws her, with the accent of a passage, and nothing moves`,
        isLook(became, lookOf({ ...to, passage: true })) && (await moving(view)) === 0,
        JSON.stringify(became),
      );
      const end = await staged(view);
      check(
        `${passage}: its sentence is said when it has been seen — « ${at.said[0] ?? ''} »`,
        end.lineSeen &&
          end.line === at.said.map(shown).join(' ') &&
          end.status === end.line &&
          at.said[0] === kit[`turtle.passage.${String(at.end.state)}`] &&
          !end.skip &&
          end.sheet,
        JSON.stringify(end),
      );
      await view.waitForTimeout(ALONE_AFTER_PASSAGE_MS - evolutionLasts(passage) - LATE_MS - 100);
      check(`${passage}: nothing of her moves 5 s after the gesture`, (await moving(view)) === 0);
      // Left and found again in the same tab: what she became, at once. The round is over.
      await arrive(view);
      const again = await staged(view);
      check(
        `${passage}: found again in the tab, she is what she became — at rest, beside the word, and nothing is played`,
        isLook(await her(view), lookOf(to)) &&
          (await logOf(view)).length === 0 &&
          (await moving(view)) === 0 &&
          !again.stage,
        JSON.stringify(await her(view)),
      );
      await context.close();
    }
  }

  // --- 5. skipping a passage; less motion; nothing played that was not earned here, now
  async function runSkipping(): Promise<void> {
    const at = ending(data, kit, passageRound.get('12') ?? 2);
    const became = lookOf({ state: at.end.state, arcs: at.end.arcs, passage: true });
    const ways: [string, (view: Page) => Promise<void>][] = [
      ['Escape', (view) => view.keyboard.press('Escape')],
      ['a touch on the stage', (view) => view.locator('#game-her button').click()],
    ];
    for (const [label, skip] of ways) {
      const { context, view } = await visitor(at.stored);
      await press(view, 'Mot suivant');
      await view.waitForTimeout(900);
      const mid = await her(view);
      await skip(view);
      const end = await staged(view);
      check(
        `${label} skips her passage: she is what she became, at once, with her sentence`,
        mid?.phase != null &&
          isLook(await her(view), became) &&
          (await moving(view)) === 0 &&
          end.lineSeen &&
          end.status === end.line &&
          end.line === at.said.map(shown).join(' ') &&
          !end.skip,
        `${String(mid?.phase)} ${JSON.stringify(end)}`,
      );
      check(`${label}: her sheet has not opened`, !(await sheetOpen(view)));
      await context.close();
    }
    // Any button of the game: its press reaches its target, and she is where the game is.
    {
      const { context, view } = await visitor(at.stored);
      await press(view, 'Mot suivant');
      await view.waitForTimeout(900);
      await view.getByRole('button', { name: 'Trois autres mots' }).click();
      const next = await staged(view);
      check(
        'a press during her passage reaches its target: the next round starts, and she is what she became, at rest',
        (await wordShown(view)) === data.words[(passageRound.get('12') ?? 2) * ROUND]?.word &&
          isLook(await her(view), lookOf({ state: at.end.state, arcs: at.end.arcs })) &&
          !next.stage,
        JSON.stringify(await her(view)),
      );
      await view.waitForTimeout(ALONE_MS);
      check('…and nothing of her moves 2.1 s after it', (await moving(view)) === 0);
      await context.close();
    }
    // The tab is left while she passes, or less motion is asked for meanwhile: her passage ends
    // there, on what she became — nothing is left to be played in a burst, or against a wish.
    for (const [label, leave] of [
      [
        'the tab is left',
        (view: Page) =>
          view.evaluate(
            "(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); })()",
          ),
      ],
      ['less motion is asked for', (view: Page) => view.emulateMedia({ reducedMotion: 'reduce' })],
    ] as const) {
      const { context, view } = await visitor(at.stored);
      await press(view, 'Mot suivant');
      await view.waitForTimeout(900);
      const mid = await her(view);
      await leave(view);
      await view.waitForTimeout(100);
      const end = await staged(view);
      const stopped = await her(view);
      await view.waitForTimeout(evolutionLasts('12'));
      check(
        `${label} while she passes: her passage ends there, on what she became, with its sentence — and nothing follows`,
        mid?.phase != null &&
          isLook(stopped, became) &&
          isLook(await her(view), became) &&
          end.lineSeen &&
          !end.skip &&
          (await moving(view)) === 0,
        `${String(mid?.phase)} ${JSON.stringify(stopped)}`,
      );
      await context.close();
    }
    // « Garder ta tortue », pressed while she passes: the gesture is done, on what she became.
    {
      const asked = ending(data, kit, passageRound.get('12') ?? 2, { declined: false });
      const { context, view } = await visitor(asked.stored);
      await press(view, 'Mot suivant');
      await view.waitForTimeout(600);
      await openKeep(view);
      await view.getByRole('button', { name: 'Garder ta tortue' }).click();
      const held: Stores = await view.evaluate(stores);
      const onPhone = JSON.parse(held.phone[STORAGE_KEY] ?? '{}') as { turtle?: number };
      check(
        '« Garder ta tortue », pressed while she passes, keeps what she became',
        onPhone.turtle === asked.end.state &&
          isLook(await her(view), became) &&
          text(await view.locator('#game-status').textContent()) ===
            [...asked.said.map(shown), 'Elle est gardée sur ce téléphone.'].join(' '),
        held.phone[STORAGE_KEY],
      );
      await context.close();
    }
    // Less motion asked: nothing starts. What she became is information, and is shown.
    {
      const { context, view } = await visitor(at.stored, { ...phone, reducedMotion: 'reduce' });
      await press(view, 'Mot suivant');
      const end = await staged(view);
      const log = await logOf(view);
      check(
        'less motion: what she became shows at once, with its sentence, and no beat is played',
        isLook(await her(view), became) &&
          log.length > 0 &&
          log.every((line) => line[1] === '') &&
          (await moving(view)) === 0 &&
          end.stage &&
          end.lineSeen &&
          end.line === at.said.map(shown).join(' ') &&
          end.status === end.line,
        JSON.stringify(log),
      );
      check(
        'less motion: « Passer » is never there, « Sa fiche » and « Choisir sa couleur » are',
        !end.skip && end.sheet && end.tint,
        JSON.stringify(end),
      );
      const duration = await view.evaluate<string>(
        `getComputedStyle(document.querySelector('${HER} .m-bird')).transitionDuration`,
      );
      check('less motion: no transition at all on her', /^0s/.test(duration), duration);
      await context.close();
    }
    // The phone keeps a flamingo — written by the first generation: no colour. A tab opens.
    {
      const rounds = (passageRound.get('23') ?? 7) - 1;
      const held = after(data, rounds);
      const string = JSON.stringify({
        seen: held.seen,
        depth: held.standing.depth,
        turtle: held.standing.state,
        arcs: held.standing.arcs,
      });
      const context = await browser.newContext(phone);
      const setup = await context.newPage();
      await setup.goto(`${origin}/sommaire/`);
      await setup.evaluate(`localStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(string)})`);
      await setup.close();
      const tab = await context.newPage();
      await arrive(tab);
      check(
        'a turtle kept by the first generation comes back as a pale flamingo: at once, at rest, nothing played, nothing lost',
        held.standing.state === 2 &&
          isLook(await her(tab), lookOf({ state: 2, arcs: held.standing.arcs })) &&
          (await logOf(tab)).length === 0 &&
          (await moving(tab)) === 0 &&
          (await wordShown(tab)) === data.words[rounds * ROUND]?.word,
        JSON.stringify(await her(tab)),
      );
      const untouched: Stores = await tab.evaluate(stores);
      check(
        '…and arriving wrote nothing: the phone holds the very string it held',
        untouched.phone[STORAGE_KEY] === string && Object.keys(untouched.tab).length === 0,
        JSON.stringify(untouched),
      );
      // Another tab earns her next passage: this one follows, and plays nothing.
      const second = await context.newPage();
      await arrive(second);
      await playRound(second);
      await until(tab, `document.querySelector('${HER}').getAttribute('data-state') === '3'`);
      const flown = after(data, rounds + 1).standing;
      const followed = await logOf(tab);
      check(
        'another tab earns her passage: this one follows at once — no beat is played here, nothing moves',
        followed.length > 0 &&
          followed.every((line) => line[1] === '') &&
          isLook(await her(tab), lookOf({ state: 3, arcs: flown.arcs })) &&
          (await moving(tab)) === 0,
        JSON.stringify(followed),
      );
      check(
        '…while the tab that earned it plays it',
        (await logOf(second)).some((line) => line[1].startsWith('23-')),
      );
      // The browser's own cache gives the page back as it was left: what is kept is read again.
      await second.waitForTimeout(evolutionLasts('23') + LATE_MS);
      await tab.evaluate('window.__seen.her.log.length = 0');
      await tab.evaluate(
        "window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: true }))",
      );
      check(
        'a page that comes back from the browser’s own cache plays nothing',
        (await logOf(tab)).every((line) => line[1] === '') &&
          isLook(await her(tab), lookOf({ state: 3, arcs: flown.arcs })) &&
          (await moving(tab)) === 0,
        JSON.stringify(await logOf(tab)),
      );
      await context.close();
    }
  }

  // --- 6. what is said of her at the end of every round of the game, and the signs she shows
  async function runLines(): Promise<void> {
    const wrong: string[] = [];
    const lines: string[] = [];
    const signs: string[] = [];
    // Every round of the list, and one more: the game goes on once everything is found.
    for (let round = 1; round <= total + 1; round += 1) {
      const tint: MascotTint = after(data, round - 1).standing.state >= 2 ? 3 : 0;
      const at = ending(data, kit, round, { tint });
      const { context, view } = await visitor(at.stored, { ...phone, reducedMotion: 'reduce' });
      await press(view, 'Mot suivant');
      const end = await staged(view);
      const expected = at.said.map(shown).join(' ');
      if (end.line !== expected || at.said.length < 1 || at.said.length > 2) {
        wrong.push(`round ${String(round)}: « ${end.line} » for « ${expected} »`);
      }
      const look = lookOf({
        state: at.end.state,
        arcs: at.end.arcs,
        tint,
        passage: at.end.passage,
      });
      if (!isLook(await her(view), look)) wrong.push(`round ${String(round)}: her look`);
      // « À la prochaine manche, elle change » is true: the round after this one is a passage.
      const announces = end.line.includes(says('turtle.goal.next').replace(/\.$/, ''));
      const next = ending(data, kit, round + 1);
      if (announces !== next.end.passage) wrong.push(`round ${String(round)}: « la prochaine »`);
      // A sentence about a passage is said at that passage, and at no other round.
      const passed = [1, 2, 3, 4].filter((n) =>
        end.line.includes(says(`turtle.passage.${String(n)}`)),
      );
      if (JSON.stringify(passed) !== JSON.stringify(at.end.passage ? [at.end.state] : [])) {
        wrong.push(`round ${String(round)}: passages ${passed.join(',')}`);
      }
      if (look.sign !== 0) signs.push(`${String(round)}:${String(look.sign)}`);
      lines.push(end.line);
      await context.close();
    }
    check(
      'at the end of every round, one line about her — her passage, then her goal — as the rules say, and the look they give her',
      wrong.length === 0 && lines.length === total + 1,
      wrong.join(' | '),
    );
    check(
      'what is said of her is never a number, a count, a judgement or a word about the player',
      lines.every(
        (line) =>
          line !== '' && !/\d/.test(line) && !NEVER.test(line) && !/\b(?:tu as|bien)\b/i.test(line),
      ),
      lines.find((line) => /\d/.test(line) || NEVER.test(line)),
    );
    check(
      'once everything is found the game goes on, and says so of her in four words',
      lines.at(-1) === says('turtle.goal.done'),
      lines.at(-1),
    );
    // Her signs that a change is near (D17.5): an attitude, at the rounds her arcs say.
    check(
      'she shows a sign that a change is near at some rounds — and it is never a quantity',
      signs.length > 0 && signs.every((sign) => /^\d+:[12]$/.test(sign)),
      signs.join(' '),
    );
    console.log(`  ${name}: signs at rounds ${signs.join(' ')}`);
  }

  // --- 7. what the game remembers: the tab from the first reveal, the phone only after « Garder »
  async function runMemory(): Promise<void> {
    const word = first[0];
    const place = word === undefined ? null : locate(data, word.section);
    if (word === undefined || place === null) throw new Error('the first word has no place');

    // Two visitors, two different choices for the same word: what is written is the same
    // string — a choice has nowhere to go. The first word is given (D19.15): the first choice
    // one can make is on the second.
    const inTab: string[] = [];
    {
      const asked = first[1];
      const there = asked === undefined ? null : locate(data, asked.section);
      if (asked === undefined || there === null) throw new Error('the second word has no place');
      const elsewhere = data.parts.map((p) => p.number).find((n) => n !== there.part.number) ?? 0;
      for (const tile of [there.part.number, elsewhere]) {
        const context = await browser.newContext(phone);
        const view = await context.newPage();
        await arrive(view);
        await reveal(view);
        await view.getByRole('button', { name: 'Mot suivant' }).click();
        await view.locator(`#game-live .g-tile[data-tile="${String(tile)}"]`).click();
        inTab.push((await view.evaluate<Stores>(stores)).tab[STORAGE_KEY] ?? '');
        await context.close();
      }
    }
    for (const tile of [place.part.number]) {
      const context = await browser.newContext(phone);
      const view = await context.newPage();
      await arrive(view);
      const before: Stores = await view.evaluate(stores);
      if (tile === place.part.number) {
        check(
          'nothing is written before a first word has been shown',
          Object.keys(before.tab).length === 0 && Object.keys(before.phone).length === 0,
          JSON.stringify(before),
        );
      }
      await reveal(view);
      const afterIt: Stores = await view.evaluate(stores);
      if (tile === place.part.number) {
        const state = JSON.parse(afterIt.tab[STORAGE_KEY] ?? '{}') as Record<string, unknown>;
        check(
          'from the first reveal the tab holds one key, with the fields of the first generation and no other: she has no colour',
          JSON.stringify(Object.keys(afterIt.tab)) === JSON.stringify([STORAGE_KEY]) &&
            JSON.stringify(Object.keys(state)) === JSON.stringify([...TAB_FIELDS]) &&
            JSON.stringify(state['seen']) === JSON.stringify([word.id]),
          afterIt.tab[STORAGE_KEY],
        );
        // Byte for byte what the first generation writes of the same game: a step back to it
        // loses nothing (src/lib/game-state2.ts).
        const asFirst = serialiseTab({
          corpus: data.corpus,
          seen: [word.id],
          depth: 1,
          turtle: 0,
          arcs: [0, 0, 0],
          round: { words: first.map((w) => w.id), at: 0, shown: true },
          declined: false,
        });
        check(
          '…and it is, byte for byte, the string the first generation writes of the same game',
          afterIt.tab[STORAGE_KEY] === asFirst,
          afterIt.tab[STORAGE_KEY],
        );
        check('…and the phone holds nothing', Object.keys(afterIt.phone).length === 0);
        // The tab is left and found again: the same word, its card, and no word about a choice.
        await arrive(view);
        check(
          'a round left in the tab is found again at its card, which says nothing of a choice',
          (await wordShown(view)) === word.word &&
            text(await view.locator('#game-live .g-place h3').textContent()) ===
              `C’est écrit dans la partie ${String(place.part.number)}.`,
          text(await view.locator('#game-live').textContent()),
        );
        check(
          'coming back does not take the focus, and nothing of her moves',
          (await view.evaluate<boolean>('document.activeElement === document.body')) &&
            (await logOf(view)).length === 0 &&
            (await moving(view)) === 0,
        );
        // « Ne pas garder »
        await view.getByRole('button', { name: 'Mot suivant' }).click();
        for (let i = 1; i < ROUND; i += 1) {
          await view.getByRole('button', { name: 'Je ne sais pas' }).click();
          await view.getByRole('button', { name: 'Mot suivant' }).click();
        }
        // The card is behind a quiet button since D19.11: one line says nothing is kept, the
        // button opens the card — whose sentences and two gestures are those of before.
        const ask = view.locator('#game-live .g-keep-ask');
        const closed = {
          said: (await ask.locator('p').allTextContents()).map(text),
          buttons: (await ask.locator('button').allTextContents()).map(text),
          cards: await view.locator('#game-live .g-keep').count(),
          phone: Object.keys((await view.evaluate<Stores>(stores)).phone).length,
        };
        check(
          'the end of the round says that nothing is kept, and offers the way to keep her — quietly: one outlined button, the card not shown yet',
          JSON.stringify(closed.said) === JSON.stringify([says('turtle.sheet.tab_only')]) &&
            JSON.stringify(closed.buttons) === JSON.stringify([says('turtle.keep.open')]) &&
            closed.cards === 0 &&
            closed.phone === 0 &&
            (await ask.locator('button').evaluate((b) => b.classList.contains('g-quiet'))),
          JSON.stringify(closed),
        );
        await openKeep(view);
        check(
          'opening the card writes nothing: the phone is still empty',
          Object.keys((await view.evaluate<Stores>(stores)).phone).length === 0,
        );
        const card = view.locator('#game-live .g-keep');
        const lines = (await card.locator('p:not(.g-actions)').allTextContents()).map(text);
        check(
          'the end of the round asks whether to keep, and says first what keeping means — her colour too',
          lines.length >= 5 &&
            lines[0] === `${says('turtle.keep.what')} ${says('turtle.keep.tint')}` &&
            lines[1] === says('turtle.keep.not_kept.tint'),
          lines.join(' | '),
        );
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
      await context.close();
    }
    check(
      'what is written does not depend on what was chosen',
      inTab.length === 2 && inTab[0] !== '' && inTab[0] === inTab[1],
    );

    // « Garder ta tortue », then another tab of the same phone.
    const pocket = await browser.newContext(phone);
    const tab = await pocket.newPage();
    await arrive(tab);
    await playRound(tab);
    await openKeep(tab);
    await tab.getByRole('button', { name: 'Garder ta tortue' }).click();
    const held: Stores = await tab.evaluate(stores);
    const onPhone = JSON.parse(held.phone[STORAGE_KEY] ?? '{}') as Record<string, unknown>;
    check(
      '« Garder ta tortue »: the phone holds one key, with the fields of the first generation and no other',
      JSON.stringify(Object.keys(held.phone)) === JSON.stringify([STORAGE_KEY]) &&
        JSON.stringify(Object.keys(onPhone)) === JSON.stringify([...KEPT_FIELDS]) &&
        JSON.stringify(onPhone['seen']) === JSON.stringify(first.map((w) => w.id)),
      held.phone[STORAGE_KEY],
    );
    check(
      '…and it is said, once — after what happened to her, whose passage that press cut short',
      text(await tab.locator('#game-status').textContent()) ===
        [...ending(data, kit, 1).said.map(shown), 'Elle est gardée sur ce téléphone.'].join(' '),
      text(await tab.locator('#game-status').textContent()),
    );
    const second = await pocket.newPage();
    await arrive(second);
    const one = after(data, 1).standing;
    check(
      'another tab of the same phone goes on from what was kept, without a movement',
      (await wordShown(second)) === data.words[ROUND]?.word &&
        isLook(await her(second), lookOf({ state: one.state, arcs: one.arcs })) &&
        (await moving(second)) === 0,
      JSON.stringify(await her(second)),
    );
    // The second tab finds three more words: the phone follows, and so does the first tab.
    await tab.waitForTimeout(evolutionLasts('01') + LATE_MS);
    await tab.evaluate('window.__seen.her.log.length = 0');
    await playRound(second);
    await until(
      tab,
      `JSON.parse(localStorage.getItem('${STORAGE_KEY}')).seen.length === ${String(2 * ROUND)}`,
    );
    const two = after(data, 2).standing;
    await until(
      tab,
      `document.querySelector('${HER}').getAttribute('data-state') === '${String(two.state)}'`,
    );
    check(
      'what one tab finds, the other sees on her — at once, and no beat is played there',
      isLook(await her(tab), lookOf({ state: two.state, arcs: two.arcs })) &&
        (await logOf(tab)).every((line) => line[1] === ''),
      JSON.stringify(await her(tab)),
    );
    await second.waitForTimeout(evolutionLasts('12') + LATE_MS + HANDOVER_MS);

    // One tab stops keeping: the phone forgets, and the other tab is not emptied for it.
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
        isLook(await her(tab), lookOf({ state: two.state, arcs: two.arcs })),
      JSON.stringify({ phone: released.phone, beside: Object.keys(beside.tab) }),
    );
    // She is given a colour, then kept again: the phone holds it, and the other tab wears it.
    await secondSheet.getByRole('button', { name: 'Jaune', exact: true }).click();
    const unkept: Stores = await second.evaluate(stores);
    check(
      'a colour given while nothing is kept is in the tab, and not on the phone',
      (JSON.parse(unkept.tab[STORAGE_KEY] ?? '{}') as { tint?: number }).tint === 4 &&
        Object.keys(unkept.phone).length === 0,
      JSON.stringify(unkept.phone),
    );
    await tab.evaluate('window.__seen.her.log.length = 0');
    await secondSheet.getByRole('button', { name: 'Garder ta tortue' }).click();
    await second.keyboard.press('Escape');
    await until(tab, `document.querySelector('${HER}').getAttribute('data-tint') === '4'`);
    const all: Stores = await second.evaluate(stores);
    const named = (storage: string): string[] =>
      STORAGE_MAP.find((entry) => entry.storage === storage)?.fields.map((f) => f.name) ?? [];
    const really = (value: string | undefined): string[] =>
      Object.keys(JSON.parse(value ?? '{}') as object);
    check(
      '« Garder ta tortue » with a colour: the phone holds the declared fields and no other, her colour last',
      JSON.stringify(really(all.phone[STORAGE_KEY])) === JSON.stringify([...KEPT_FIELDS2]) &&
        JSON.stringify(really(all.tab[STORAGE_KEY])) === JSON.stringify([...TAB_FIELDS2]),
      JSON.stringify(all),
    );
    check(
      'nothing is in a storage that the map of writings does not name',
      Object.keys(all.tab).every((k) => k === STORAGE_KEY) &&
        Object.keys(all.phone).every((k) => k === STORAGE_KEY) &&
        really(all.tab[STORAGE_KEY]).every((f) => named('sessionStorage').includes(f)) &&
        really(all.phone[STORAGE_KEY]).every((f) => named('localStorage').includes(f)),
      JSON.stringify(all),
    );
    check(
      'the other tab wears the colour she was given elsewhere — at once, and nothing is played',
      isLook(await her(tab), lookOf({ state: two.state, arcs: two.arcs, tint: 4 })) &&
        (await logOf(tab)).every((line) => line[1] === '') &&
        (await moving(tab)) === 0,
      JSON.stringify(await her(tab)),
    );
    // The last gesture wins: the first tab gives her another colour, the second follows.
    await tab.getByRole('button', { name: 'Ta tortue', exact: true }).click();
    await tab.locator('#turtle-sheet').getByRole('button', { name: 'Rouge', exact: true }).click();
    await tab.keyboard.press('Escape');
    await until(second, `document.querySelector('${HER}').getAttribute('data-tint') === '5'`);
    const last: Stores = await second.evaluate(stores);
    check(
      'her colour is the last one given, in whatever tab: the phone and both tabs agree',
      (JSON.parse(last.phone[STORAGE_KEY] ?? '{}') as { tint?: number }).tint === 5 &&
        (await her(tab))?.tint === '5' &&
        (await her(second))?.tint === '5',
      last.phone[STORAGE_KEY],
    );
    // A round ends in the tab that did not choose: what it writes keeps the last colour.
    await second.getByRole('button', { name: 'Trois autres mots' }).click();
    await playRound(second);
    const written3: Stores = await second.evaluate(stores);
    check(
      'a round that ends does not take her colour back',
      (JSON.parse(written3.phone[STORAGE_KEY] ?? '{}') as { tint?: number }).tint === 5 &&
        (JSON.parse(written3.tab[STORAGE_KEY] ?? '{}') as { tint?: number }).tint === 5,
      written3.phone[STORAGE_KEY],
    );

    // The privacy page names everything that is really there, and erases it.
    const privacy = await pocket.newPage();
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
      'the privacy page lists every field of both storages — her colour among them, in words',
      JSON.stringify(listed) ===
        JSON.stringify(
          STORAGE_MAP.flatMap((entry) => entry.fields.map((f) => `${entry.storage}:${f.name}`)),
        ) &&
        ((await privacy.locator('main').textContent()) ?? '').includes(STORAGE_KEY) &&
        (await privacy.locator('ul[data-storage] li[data-field="tint"]').allTextContents()).every(
          (line) => text(line) === says('privacy.game.field.tint'),
        ) &&
        (await privacy.locator('svg.mascot').count()) === 0,
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
    await until(tab, `document.querySelector('${HER}').getAttribute('data-state') === '0'`);
    const forgotten: Stores = await tab.evaluate(stores);
    check(
      '…and a tab still open forgets too: the entrance, the turtle she started as, no colour, nothing written',
      (await wordShown(tab)) === ENTRANCE &&
        Object.keys(forgotten.tab).length === 0 &&
        isLook(await her(tab), lookOf({ state: 0 })) &&
        (await moving(tab)) === 0,
      JSON.stringify(forgotten.tab),
    );
    await pocket.close();

    // A link is something anyone can send. « /#fin » shows no word: followed, it writes
    // nothing and moves nothing — like an anchor of the round as it was before the entrance
    // (« /#m2-3 »). « /#b2-3 » shows one card: that word is found, and no other.
    const linked = await browser.newContext(phone);
    const landing = await linked.newPage();
    await arrive(landing, '/#fin');
    const fromEnd: Stores = await landing.evaluate(stores);
    check(
      'a link to the end of a round writes nothing and moves nothing: the entrance, as for anyone',
      Object.keys(fromEnd.tab).length === 0 &&
        (await wordShown(landing)) === ENTRANCE &&
        isLook(await her(landing), lookOf({ state: 0 })) &&
        !(await staged(landing)).stage &&
        !landing.url().includes('#'),
      JSON.stringify(fromEnd.tab),
    );
    // Away and back: a change of fragment alone would not load the page again.
    await landing.goto('about:blank');
    await arrive(landing, '/#m2-3');
    check(
      'an anchor of the round as it was before the entrance is forgotten: the entrance, nothing written, nothing in the address',
      (await wordShown(landing)) === ENTRANCE &&
        Object.keys((await landing.evaluate<Stores>(stores)).tab).length === 0 &&
        !landing.url().includes('#'),
      landing.url(),
    );
    // The card of a word that was touched on the entrance of the HTML: given, no verdict.
    await landing.goto('about:blank');
    await arrive(landing, '/#a3');
    const thirdPlace = locate(data, first[2]?.section ?? '');
    check(
      'a link to the card of a word touched on the entrance shows that card, as given: where it is written, and nothing of a choice',
      (await wordShown(landing)) === first[2]?.word &&
        text(await landing.locator('#game-live .g-place h3').textContent()) ===
          `C’est écrit dans la partie ${String(thirdPlace?.part.number)}.` &&
        Object.keys((await landing.evaluate<Stores>(stores)).tab).length === 0 &&
        !landing.url().includes('#'),
      text(await landing.locator('#game-live .g-place h3').textContent()),
    );
    // A question of the round of the HTML: the question, not the entrance — someone was playing.
    await landing.goto('about:blank');
    await arrive(landing, '/#c1');
    check(
      'a link to a question shows that question, for that word — not the entrance — and writes nothing',
      (await wordShown(landing)) === first[0]?.word &&
        text(await landing.locator('#game-live .g-ask').textContent()) ===
          'Dans quelle partie est-il écrit ?' &&
        (await landing.locator('#game-live .g-enter').count()) === 0 &&
        Object.keys((await landing.evaluate<Stores>(stores)).tab).length === 0,
      text(await landing.locator('#game-live').textContent()),
    );
    await landing.goto('about:blank');
    await arrive(landing, '/#b2-3');
    const fromCard: Stores = await landing.evaluate(stores);
    check(
      'a link to a card shows that card and writes nothing: arriving is not a gesture',
      Object.keys(fromCard.tab).length === 0 &&
        Object.keys(fromCard.phone).length === 0 &&
        (await wordShown(landing)) === first[1]?.word &&
        (await landing.locator('#game-live .g-place').count()) === 1 &&
        (await her(landing))?.pose === 'rest' &&
        !landing.url().includes('#'),
      `${JSON.stringify(fromCard)} ${landing.url()}`,
    );
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
    const emptied = await staged(landing);
    check(
      '« Tout effacer » elsewhere empties a tab that had kept nothing on the phone — and stops her passage there',
      (await wordShown(landing)) === ENTRANCE &&
        !emptied.stage &&
        isLook(await her(landing), lookOf({ state: 0 })),
      JSON.stringify(await her(landing)),
    );
    await linked.close();

    // A browser that refuses to store anything: the game is played all the same.
    const refusing = await browser.newContext(phone);
    await refusing.addInitScript(
      "Storage.prototype.setItem = function () { throw new DOMException('refused', 'QuotaExceededError'); };",
    );
    const strict = await refusing.newPage();
    const broken: string[] = [];
    strict.on('pageerror', (e) => broken.push(String(e)));
    await arrive(strict);
    await playRound(strict);
    await openKeep(strict);
    await strict.getByRole('button', { name: 'Garder ta tortue' }).click();
    await strict.getByRole('button', { name: 'Trois autres mots' }).click();
    check(
      'a storage that refuses is not an error: the round is played, the next one starts',
      broken.length === 0 && (await wordShown(strict)) === data.words[ROUND]?.word,
      broken.join(' | '),
    );
    await refusing.close();
  }

  // --- 8. her sheet: her figure, the forms she has had, « Revoir », her colour
  async function runSheet(): Promise<void> {
    const FIGURES = [
      'turtle.raises_head',
      'turtle.figure.surf',
      'turtle.figure.wings',
      'turtle.figure.wings',
      'turtle.figure.sky',
    ];
    const GOALS = ['start', 'parts', 'chapters', 'words', 'done'];
    /** What her sheet shows, read once. */
    interface Sheet {
      open: boolean;
      said: string;
      goal: string;
      width: number;
      path: { state: string | null; said: string; again: string; described: boolean }[];
      hidden: boolean;
      tints: { name: string; pressed: string | null; tint: string | null }[];
      label: boolean;
    }
    const sheetOf = (view: Page): Promise<Sheet> =>
      view.evaluate<Sheet>(`(() => {
        const sheet = document.querySelector('#turtle-sheet');
        const flat = (node) => (node?.textContent ?? '').replace(/\\s+/g, ' ').trim();
        const label = [...sheet.querySelectorAll('.unofficial')].some((node) => flat(node) === 'Site non officiel.');
        return {
          open: sheet.open,
          said: flat(sheet.querySelector('#turtle-sheet-said')),
          goal: flat(sheet.querySelector('#turtle-sheet-goal')),
          width: sheet.querySelector('${LARGE}')?.getBoundingClientRect().width ?? 0,
          path: [...sheet.querySelectorAll('#turtle-sheet-path > li')].map((item) => {
            const again = item.querySelector('button');
            const about = item.querySelector('p');
            return {
              state: item.querySelector('svg.mascot')?.getAttribute('data-state') ?? null,
              said: flat(about),
              again: flat(again),
              described: again === null || (about !== null && again.getAttribute('aria-describedby') === about.id),
            };
          }),
          hidden: sheet.querySelector('#turtle-sheet-tint').hidden,
          tints: [...sheet.querySelectorAll('#turtle-sheet-tints button')].map((choice) => ({
            name: flat(choice),
            pressed: choice.getAttribute('aria-pressed'),
            tint: choice.querySelector('svg.mascot')?.getAttribute('data-tint') ?? null,
          })),
          label,
        };
      })()`);

    // Touched, in each of her five forms: her sheet opens, and she does her figure in it.
    const wrong: string[] = [];
    for (const state of [0, 1, 2, 3, 4] as const) {
      const rounds = roundsFor(state);
      const tint: MascotTint = state >= 2 ? 5 : 0;
      const standing = after(data, rounds).standing;
      const { context, view } = await visitor(rounds === 0 ? null : resting(data, rounds, tint));
      const as = lookOf({ state, arcs: standing.arcs, tint });
      if (standing.state !== state) wrong.push(`${String(state)}: no round gives her this state`);
      await view.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      const sheet = await sheetOf(view);
      const large = await her(view, LARGE);
      if (!sheet.open) wrong.push(`${String(state)}: her sheet did not open`);
      if (large?.pose !== 'trick' || large.state !== String(state) || large.tint !== String(tint)) {
        wrong.push(`${String(state)}: no figure (${JSON.stringify(large)})`);
      }
      if (sheet.said !== says(FIGURES[state] ?? ''))
        wrong.push(`${String(state)}: « ${sheet.said} »`);
      if (!isLook(await her(view), as)) wrong.push(`${String(state)}: she moved in the block`);
      if (Math.abs(sheet.width - 240) > 1)
        wrong.push(`${String(state)}: ${String(sheet.width)} px`);
      if (sheet.goal !== says(`turtle.goal.${GOALS[state] ?? ''}`)) {
        wrong.push(`${String(state)}: goal « ${sheet.goal} »`);
      }
      // « Son parcours »: the forms she has had, in order — never one to come.
      const expected = Array.from({ length: state + 1 }, (_, form) => ({
        state: String(form),
        said: form === 0 ? '' : says(`turtle.passage.${String(form)}`),
        again: form === 0 ? '' : 'Revoir',
        described: true,
      }));
      if (JSON.stringify(sheet.path) !== JSON.stringify(expected)) {
        wrong.push(`${String(state)}: path ${JSON.stringify(sheet.path)}`);
      }
      // « Sa couleur »: hers to give once she is a flamingo, and not before.
      if (sheet.hidden !== state < 2 || sheet.tints.length !== (state < 2 ? 0 : 7)) {
        wrong.push(
          `${String(state)}: colours ${String(sheet.hidden)} ${String(sheet.tints.length)}`,
        );
      }
      if (!sheet.label) wrong.push(`${String(state)}: « Site non officiel. » is not in her sheet`);
      await view.waitForTimeout(TRICK_HOLD_MS[state] + LATE_MS);
      if (!isLook(await her(view, LARGE), as)) wrong.push(`${String(state)}: figure not ended`);
      await view.waitForTimeout(ALONE_MS - TRICK_HOLD_MS[state] - LATE_MS);
      if ((await moving(view)) !== 0) wrong.push(`${String(state)}: still moving after 2.1 s`);
      // She can be touched again, in her sheet.
      await view
        .locator('#turtle-sheet')
        .getByRole('button', { name: 'Ta tortue', exact: true })
        .click();
      if ((await her(view, LARGE))?.pose !== 'trick') wrong.push(`${String(state)}: second touch`);
      await context.close();
    }
    check(
      'touched, in each of her five forms: her sheet opens, she does her figure in it — large, 240 px —, and it is said; in the block she does not move',
      wrong.filter((line) => !/path|colours|goal|officiel/.test(line)).length === 0,
      wrong.join(' | '),
    );
    check(
      'her sheet shows the forms she has had, in order, each with its sentence and « Revoir » — never a form to come',
      wrong.filter((line) => /path/.test(line)).length === 0,
      wrong.filter((line) => /path/.test(line)).join(' | '),
    );
    check(
      'her sheet says what will make her change, offers her colour only once she is a flamingo, and carries « Site non officiel. »',
      wrong.filter((line) => /colours|goal|officiel/.test(line)).length === 0,
      wrong.filter((line) => /colours|goal|officiel/.test(line)).join(' | '),
    );

    // A flamingo, at the end of the round that made her one: « Sa fiche », « Revoir », her colour.
    const at = ending(data, kit, passageRound.get('12') ?? 2);
    const { context, view } = await visitor(at.stored);
    const asked: { url: string; body: string }[] = [];
    view.on('request', (r) => asked.push({ url: r.url(), body: r.postData() ?? '' }));
    const address = view.url();
    await press(view, 'Mot suivant');
    await view.waitForTimeout(evolutionLasts('12') + LATE_MS + HANDOVER_MS + 100);
    await view.getByRole('button', { name: 'Sa fiche' }).click();
    let sheet = await sheetOf(view);
    const now = { state: at.end.state, arcs: at.end.arcs, tint: 0 as MascotTint };
    check(
      '« Sa fiche », under the stage, opens her sheet — and she does no figure nobody asked for',
      sheet.open &&
        sheet.said === '' &&
        isLook(await her(view, LARGE), lookOf(now)) &&
        (await moving(view)) === 0,
      JSON.stringify(await her(view, LARGE)),
    );
    check(
      'at the end of a round her sheet says what the round’s end says of her goal',
      sheet.goal === says(`turtle.goal.${at.said.length > 1 ? 'next' : 'chapters'}`),
      sheet.goal,
    );
    // « Revoir »: her first passage, on the large copy; the same button is « Passer » meanwhile.
    await view.evaluate(`window.__seen.large = window.__watch(${JSON.stringify(LARGE)})`);
    const again = view.locator('#turtle-sheet-path button');
    await again.nth(0).click();
    await view.waitForTimeout(700);
    const midway = await her(view, LARGE);
    check(
      '« Revoir » plays a passage she has made, on the large copy — and the button is « Passer » meanwhile',
      midway?.phase?.startsWith('01-') === true &&
        text(await again.nth(0).textContent()) === says('turtle.skip') &&
        (await moving(view)) > 0 &&
        isLook(await her(view), lookOf({ ...now, passage: true })),
      JSON.stringify(midway),
    );
    await view.waitForTimeout(evolutionLasts('01') - 700 + LATE_MS + 100);
    const replayed = await logOf(view, 'large');
    const frames01 = evolution(
      { state: 0, arcs: lookOf({ state: 0 }).arcs, tint: 0 },
      { state: 1, arcs: lookOf({ state: 1 }).arcs, tint: 0 },
    );
    sheet = await sheetOf(view);
    check(
      '…beat by beat, as it was played when she earned it; then its sentence, and « Revoir » again',
      JSON.stringify(beats(replayed).filter((beat, index) => index > 0 || beat !== '')) ===
        JSON.stringify(frames01.map((f) => f.phase ?? '')) &&
        isLook(await her(view, LARGE), lookOf({ state: 1, passage: true })) &&
        sheet.said === says('turtle.passage.1') &&
        text(await again.nth(0).textContent()) === 'Revoir' &&
        (await moving(view)) === 0,
      JSON.stringify(replayed.map((line) => [line[0], line[1]])),
    );
    // Touched after a passage seen again: she is as she is now, and does her figure.
    await view
      .locator('#turtle-sheet')
      .getByRole('button', { name: 'Ta tortue', exact: true })
      .click();
    const backNow = await her(view, LARGE);
    check(
      'touched after a passage seen again, she is as she is now — and does her figure',
      backNow?.state === String(now.state) && backNow.pose === 'trick' && backNow.phase === null,
      JSON.stringify(backNow),
    );
    await view.waitForTimeout(TRICK_HOLD_MS[2] + LATE_MS);
    // « Passer », on the very button: the end of that passage at once.
    await again.nth(1).click();
    await view.waitForTimeout(600);
    await again.nth(1).click();
    sheet = await sheetOf(view);
    check(
      '« Passer » ends a passage seen again at once: its last look, its sentence, nothing moving',
      isLook(await her(view, LARGE), lookOf({ state: 2, passage: true })) &&
        sheet.said === says('turtle.passage.2') &&
        text(await again.nth(1).textContent()) === 'Revoir' &&
        (await moving(view)) === 0,
      JSON.stringify(await her(view, LARGE)),
    );
    // Another « Revoir » while one plays: the first gives way. (Each press here comes after the
    // gap her drawings keep between two swaps at a press: one closer would be refused.)
    await view.waitForTimeout(SWAP_GAP_MS);
    await again.nth(0).click();
    await view.waitForTimeout(SWAP_GAP_MS + 50);
    await again.nth(1).click();
    await view.waitForTimeout(SWAP_GAP_MS + 50);
    const swapped = await her(view, LARGE);
    check(
      'another « Revoir » while one plays: the first gives way, the second plays',
      text(await again.nth(0).textContent()) === 'Revoir' &&
        text(await again.nth(1).textContent()) === says('turtle.skip') &&
        swapped?.phase?.startsWith('12-') === true,
      JSON.stringify(swapped),
    );
    // A touch on her while a passage is seen again is « Passer », and no figure.
    await view
      .locator('#turtle-sheet')
      .getByRole('button', { name: 'Ta tortue', exact: true })
      .click();
    check(
      'a touch on her while a passage is seen again ends it, and is no figure',
      isLook(await her(view, LARGE), lookOf({ state: 2, passage: true })) &&
        text(await again.nth(1).textContent()) === 'Revoir',
      JSON.stringify(await her(view, LARGE)),
    );
    // Escape closes her sheet whatever is playing in it; the focus goes back where it was.
    await view.waitForTimeout(SWAP_GAP_MS);
    await again.nth(0).click();
    await view.waitForTimeout(300);
    await view.keyboard.press('Escape');
    await view.waitForTimeout(200);
    check(
      'Escape closes her sheet while a passage is seen again: nothing goes on moving, the focus is back on « Sa fiche »',
      !(await sheetOpen(view)) &&
        (await moving(view)) === 0 &&
        (await view.evaluate<boolean>("document.activeElement?.id === 'game-sheet-link'")),
    );

    // « Choisir sa couleur » opens her sheet on her colours.
    await view.getByRole('button', { name: 'Choisir sa couleur' }).click();
    sheet = await sheetOf(view);
    const NAMES = ['Bleu ciel', 'Orange', 'Vert', 'Jaune', 'Rouge', 'Violet', 'Sans couleur'];
    check(
      '« Choisir sa couleur » opens her sheet on her colours: six by their name, then « Sans couleur » — none chosen, each shown on a small flamingo',
      sheet.open &&
        JSON.stringify(sheet.tints.map((choice) => choice.name)) === JSON.stringify(NAMES) &&
        sheet.tints.every(
          (choice, index) => choice.pressed === 'false' && choice.tint === String(index + 1),
        ) &&
        (await view.evaluate<boolean>(
          "document.activeElement === document.querySelector('#turtle-sheet-tints button')",
        )) &&
        // No sentence ties a colour to a part of the book (D17.31).
        (await view.locator('#turtle-sheet-tint p').count()) === 0,
      JSON.stringify(sheet.tints),
    );
    check(
      'no colour is named by a part of the book, and none carries a number',
      sheet.tints.every((choice) => !/partie|\d/i.test(choice.name)),
    );
    await view.locator('#turtle-sheet').getByRole('button', { name: 'Vert', exact: true }).click();
    sheet = await sheetOf(view);
    const green: Stores = await view.evaluate(stores);
    const inTab = JSON.parse(green.tab[STORAGE_KEY] ?? '{}') as Record<string, unknown>;
    check(
      'a colour chosen: she wears it at once — in the block, in her sheet, on the form of her path — and the button says so',
      (await her(view))?.tint === '3' &&
        (await her(view, LARGE))?.tint === '3' &&
        (await view
          .locator('#turtle-sheet-path svg.mascot')
          .evaluateAll((all) => all.every((svg) => svg.getAttribute('data-tint') === '3'))) &&
        JSON.stringify(sheet.tints.map((choice) => choice.pressed)) ===
          JSON.stringify(['false', 'false', 'true', 'false', 'false', 'false', 'false']) &&
        (await view.evaluate<boolean>(
          "document.activeElement?.getAttribute('aria-pressed') === 'true'",
        )),
      JSON.stringify(sheet.tints),
    );
    check(
      '…it is written in the tab, one field more and the last; nothing is on the phone, which was not asked to keep',
      JSON.stringify(Object.keys(inTab)) === JSON.stringify([...TAB_FIELDS2]) &&
        inTab['tint'] === 3 &&
        Object.keys(green.phone).length === 0,
      green.tab[STORAGE_KEY],
    );
    check(
      '…and it goes nowhere: no request, nothing in the address',
      asked.every((r) => !/tint|couleur|colou?r/i.test(r.url + r.body)) &&
        asked.filter((r) => !r.url.includes('/flags.json')).length === 0 &&
        view.url() === address,
      asked.map((r) => r.url).join(','),
    );
    // Her colour is on her flamingo, and nowhere else (D17.12).
    const painted = await view.evaluate<{
      body: string;
      tints: string[];
      strays: string[];
      pale: string;
    }>(`(() => {
      const probe = document.createElement('span');
      document.body.append(probe);
      const resolved = (name) => {
        probe.style.color = 'var(' + name + ')';
        return getComputedStyle(probe).color;
      };
      const tints = [1, 2, 3, 4, 5, 6].map((n) => resolved('--mascot-tint-' + String(n)));
      const pale = resolved('--turtle-eye');
      probe.remove();
      const strays = [];
      for (const node of document.querySelectorAll('#jeu *')) {
        if (node.closest('svg.mascot') !== null) continue;
        const style = getComputedStyle(node);
        for (const colour of [style.backgroundColor, style.borderTopColor, style.color, style.outlineColor]) {
          if (tints.includes(colour)) strays.push(node.tagName + '.' + node.className + ' ' + colour);
        }
      }
      return {
        body: getComputedStyle(document.querySelector('${HER} .m-body')).fill,
        tints,
        strays,
        pale,
      };
    })()`);
    check(
      'her colour is on her flamingo, and on nothing else of the block',
      painted.body === painted.tints[2] &&
        painted.strays.length === 0 &&
        painted.pale !== painted.body,
      JSON.stringify(painted),
    );
    await view.locator('#turtle-sheet').getByRole('button', { name: 'Sans couleur' }).click();
    // A colour chosen within the gap of the one before is worn when the gap is over.
    await view.waitForTimeout(SWAP_GAP_MS + 50);
    const none = await view.evaluate<string>(
      `getComputedStyle(document.querySelector('${HER} .m-body')).fill`,
    );
    check(
      '« Sans couleur » is a choice too: she is pale again, and the game remembers that it was chosen',
      none === painted.pale &&
        (
          JSON.parse((await view.evaluate<Stores>(stores)).tab[STORAGE_KEY] ?? '{}') as {
            tint?: number;
          }
        ).tint === 7 &&
        (await sheetOf(view)).tints.at(-1)?.pressed === 'true',
      none,
    );
    await view
      .locator('#turtle-sheet')
      .getByRole('button', { name: 'Orange', exact: true })
      .click();
    // What is kept, said before the gesture and after it — her colour named where it is kept.
    const keptLines = async (): Promise<string[]> =>
      (await view.locator('#turtle-sheet-kept p').allTextContents()).map(text);
    const BEFORE_KEEPING = [
      'Rien n’est gardé une fois cette page fermée.',
      `${says('turtle.keep.what')} ${says('turtle.keep.tint')}`,
      says('turtle.keep.not_kept.tint'),
      'Qui ouvre le site dans ce navigateur la verra.',
    ];
    const release = view
      .locator('#turtle-sheet')
      .getByRole('button', { name: 'Ne plus garder sur ce téléphone' });
    check(
      'her sheet says what is kept — nothing on the phone yet — and what « Garder » would write, her colour included',
      JSON.stringify(await keptLines()) === JSON.stringify(BEFORE_KEEPING) &&
        (await release.count()) === 0,
      (await keptLines()).join(' | '),
    );
    await view.locator('#turtle-sheet').getByRole('button', { name: 'Garder ta tortue' }).click();
    const kept: Stores = await view.evaluate(stores);
    check(
      '« Garder ta tortue » in her sheet: the phone holds her colour with the rest, and the sheet says so',
      (JSON.parse(kept.phone[STORAGE_KEY] ?? '{}') as { tint?: number }).tint === 2 &&
        JSON.stringify(await keptLines()) ===
          JSON.stringify([
            `${says('turtle.sheet.on_phone')} ${says('turtle.sheet.on_phone_tint')}`,
          ]) &&
        (await view.evaluate<boolean>("document.activeElement?.id === 'turtle-sheet-release'")),
      (await keptLines()).join(' | '),
    );
    await release.click();
    const unkept: Stores = await view.evaluate(stores);
    check(
      '« Ne plus garder sur ce téléphone »: the phone is empty, the game and her colour stay in the tab',
      Object.keys(unkept.phone).length === 0 &&
        (JSON.parse(unkept.tab[STORAGE_KEY] ?? '{}') as { tint?: number }).tint === 2 &&
        text(await view.locator('#turtle-sheet-said').textContent()) ===
          'Ce téléphone ne la garde plus. Elle reste tant que cette page est ouverte.' &&
        JSON.stringify(await keptLines()) === JSON.stringify(BEFORE_KEEPING) &&
        (await view.evaluate<boolean>("document.activeElement?.id === 'turtle-sheet-keep'")),
      JSON.stringify(unkept.phone),
    );
    const found = (
      await view.locator('#turtle-sheet-found [data-programme="word"]').allTextContents()
    ).map(text);
    check(
      'her sheet lists the words she has found, and no total',
      JSON.stringify(found) ===
        JSON.stringify(
          data.words.slice(0, (passageRound.get('12') ?? 2) * ROUND).map((w) => w.word),
        ) && !/\d/.test(text(await view.locator('#turtle-sheet-found').textContent())),
      found.join(','),
    );
    await view.locator('#turtle-sheet').getByRole('button', { name: 'Tout effacer' }).click();
    const wiped: { tab: number; phone: number } = await view.evaluate(
      '({ tab: sessionStorage.length, phone: localStorage.length })',
    );
    sheet = await sheetOf(view);
    check(
      '« Tout effacer » in her sheet: nothing left anywhere — the turtle she started as, no colour, no path, the first word again',
      wiped.tab === 0 &&
        wiped.phone === 0 &&
        sheet.said === 'Tout est effacé.' &&
        text(await view.locator('#turtle-sheet-found').textContent()) ===
          'Elle n’a pas encore vu de mot.' &&
        isLook(await her(view), lookOf({ state: 0 })) &&
        isLook(await her(view, LARGE), lookOf({ state: 0 })) &&
        sheet.path.length === 1 &&
        sheet.hidden &&
        (await wordShown(view)) === ENTRANCE &&
        !(await staged(view)).stage,
      JSON.stringify(wiped),
    );
    await context.close();

    // The third depth: what she found, in the order of the book, each with its way there.
    {
      const flying = await visitor(
        JSON.stringify({
          corpus: data.corpus,
          seen: data.words.map((w) => w.id).reverse(),
          depth: 3,
          turtle: 3,
          arcs: [6, 6, 4],
          round: null,
          declined: true,
        }),
      );
      await flying.view.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      const found = flying.view.locator('#turtle-sheet-found');
      const listed = (await found.locator('li [data-programme="word"]').allTextContents()).map(
        text,
      );
      const order = new Map<string, number>();
      for (const part of data.parts) {
        for (const chapter of part.chapters) {
          for (const section of chapter.sections) order.set(section.id, order.size);
        }
      }
      const sorted = [...data.words].sort(
        (a, b) => (order.get(a.section) ?? 0) - (order.get(b.section) ?? 0),
      );
      check(
        'at the third depth her sheet lists what she found in the order of the book — each word a button, no card open, no total',
        JSON.stringify(listed) === JSON.stringify(sorted.map((w) => w.word)) &&
          (await found.locator('li button[aria-expanded="false"]').count()) === sorted.length &&
          (await found.locator('.g-place').count()) === 0 &&
          text(await found.locator('p').first().textContent()) === says('turtle.found.lead') &&
          !/\d/.test(text(await found.textContent())),
        listed.join(','),
      );
      // A word pressed: its card opens under the list — where it is written, the way there, and
      // the sentence of its measure where this build shows one. Pressed again, it closes.
      const third = sorted[2];
      if (third === undefined) throw new Error('the list holds fewer than three words');
      const place = locate(data, third.section);
      const before: Stores = await flying.view.evaluate<Stores>(stores);
      await found.locator('li button').nth(2).click();
      const opened = await flying.view.evaluate<Reopened>(reopenedIn('#turtle-sheet-found'));
      check(
        'a word of her sheet opens its card again, right after it: its three titles, the way to the book, its sentence under its label',
        opened.cards === 1 &&
          opened.next &&
          JSON.stringify(opened.where) ===
            JSON.stringify([place?.part.title, place?.chapter.title, place?.section.title]) &&
          opened.href.startsWith(sectionUrl(third.section)) &&
          opened.gist === (third.gist === undefined ? '' : shown(third.gist)) &&
          opened.badge === (third.gist === undefined ? '' : says('game.gist.badge')) &&
          opened.ways === 0 &&
          JSON.stringify(opened.expanded) === JSON.stringify([third.word]),
        JSON.stringify(opened),
      );
      check(
        '…the focus stays on the word, and the card is in view inside her sheet — which scrolls by itself',
        opened.focus && opened.inView,
        JSON.stringify(opened),
      );
      // A word far down the list: its card opens under it all the same, and is brought there.
      const far = sorted.length - 2;
      await found.locator('li button').nth(far).click();
      const farther = await flying.view.evaluate<Reopened>(reopenedIn('#turtle-sheet-found'));
      check(
        '…one card at a time: another word pressed — the last but one of the list — takes its place, in view under its own word',
        farther.cards === 1 &&
          farther.next &&
          farther.inView &&
          farther.focus &&
          JSON.stringify(farther.expanded) === JSON.stringify([sorted[far]?.word]),
        JSON.stringify(farther),
      );
      await found.locator('li button').nth(far).click();
      const shut = await flying.view.evaluate<Reopened>(reopenedIn('#turtle-sheet-found'));
      check(
        '…pressed again, it closes — and a card read again is not a word found: nothing was written for it',
        shut.cards === 0 &&
          shut.expanded.length === 0 &&
          JSON.stringify(await flying.view.evaluate<Stores>(stores)) === JSON.stringify(before),
        JSON.stringify(shut),
      );
      await flying.context.close();
    }

    // The ends of later rounds (lot 6): « Tu te souviens ? » offers the round's first word and
    // an earlier one. Rounds 5, 10 and 13 are those where her drawing has just shown a sign —
    // her wings ajar, her eyes up, a first star: nothing names it (the three sentences that
    // did were withdrawn on 19/11/2026, after the readings of lot 8), and what is said of her
    // there is her goal, as at any other round.
    for (const round of [2, 5, 10, 13]) {
      const at = ending(data, kit, round);
      const { context, view } = await visitor(at.stored);
      await press(view, 'Mot suivant');
      // What is said of her waits for the end of her passage, where there is one.
      await until(
        view,
        "(() => { const line = document.querySelector('#game-live .g-line'); return line !== null && !line.hasAttribute('data-wait'); })()",
      );
      const under = await view.evaluate<EndPanel>(END_PANEL);
      const recalled = recallFor(data, at.seen, at.words);
      check(
        `round ${String(round)}: « Tu te souviens ? » offers the first word of the round and one of an earlier round — two buttons, closed`,
        recalled.old !== null &&
          !at.words.includes(recalled.old) &&
          JSON.stringify(under.words) ===
            JSON.stringify([wordOf(recalled.fresh), wordOf(recalled.old)]) &&
          JSON.stringify(under.expanded) === JSON.stringify(['false', 'false']) &&
          under.cards === 0,
        JSON.stringify(under.words),
      );
      const coming = draw(data, at.seen, at.words.at(-1) ?? null).map(wordOf);
      check(
        `round ${String(round)}: the next words are those the next round deals`,
        JSON.stringify(under.aheadWords) === JSON.stringify(coming) && coming.length === ROUND,
        under.ahead,
      );
      check(
        `round ${String(round)}: what is said of her is what the game computes — ${at.said.length === 1 ? 'one sentence' : 'two sentences'}`,
        under.line === at.said.map(shown).join(' ') && at.said.length <= 2,
        under.line,
      );
      if (round !== 2) {
        // To a screen reader a passage is its sentence, said when it can be seen: where there
        // is none, nothing is announced — the line is read in its place, under the title.
        check(
          `round ${String(round)}: no passage here — what is said of her is her goal alone, and nothing is announced apart`,
          !at.end.passage &&
            at.said.length === 1 &&
            text(await view.locator('#game-status').textContent()) === '',
          `${under.line} | ${text(await view.locator('#game-status').textContent())}`,
        );
        // The second of the two words, pressed: its card — the card of an earlier round.
        await view.locator('#game-live .g-recall button').nth(1).click();
        const again = await view.evaluate<Reopened>(reopenedIn('#game-live .g-recall'));
        const old = data.words.find((w) => w.id === recalled.old);
        check(
          `round ${String(round)}: the earlier word opens its own card, under the two words`,
          again.cards === 1 &&
            again.next &&
            again.focus &&
            again.inView &&
            old !== undefined &&
            again.href.startsWith(sectionUrl(old.section)) &&
            JSON.stringify(again.expanded) === JSON.stringify([old.word]),
          JSON.stringify(again),
        );
      }
      await context.close();
    }

    // Less motion asked: her sheet opens, and nothing starts.
    {
      // The hint lives where the part is asked — the first depth (D19.4, D19.7).
      const early = await visitor(resting(data, 1), { ...phone, reducedMotion: 'reduce' });
      await early.view.getByRole('button', { name: 'Un indice' }).click();
      const hinted = {
        marks: await early.view.locator('#game-live .g-mark').count(),
        said: text(await early.view.locator('#game-status').textContent()),
        pose: (await her(early.view))?.pose,
      };
      check(
        'less motion: the hint marks its tiles at once and is said, and she does not move',
        hinted.marks === 3 && hinted.said.startsWith('Elle regarde') && hinted.pose === 'rest',
        JSON.stringify(hinted),
      );
      await early.context.close();
      const calm = await visitor(resting(data, passageRound.get('12') ?? 2), {
        ...phone,
        reducedMotion: 'reduce',
      });
      const still = calm.view;
      const as = lookOf({ state: 2, arcs: after(data, passageRound.get('12') ?? 2).standing.arcs });
      await still.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      const calmSheet = await sheetOf(still);
      check(
        'less motion: her sheet opens, no figure starts, and no movement is announced',
        calmSheet.open &&
          calmSheet.said === '' &&
          isLook(await her(still, LARGE), as) &&
          isLook(await her(still), as) &&
          (await moving(still)) === 0,
        JSON.stringify(calmSheet),
      );
      check(
        'less motion: in her sheet she is a drawing, not a button that would do nothing — and the focus starts at its title',
        (await still.locator('#turtle-sheet-her button').count()) === 0 &&
          (await still.evaluate<boolean>(
            "document.activeElement === document.querySelector('#turtle-sheet-title')",
          )),
      );
      check(
        'less motion: her path shows her forms and their sentences, and « Revoir » is not offered',
        calmSheet.path.length === 3 &&
          calmSheet.path.every((form) => form.again === '') &&
          calmSheet.path[2]?.said === says('turtle.passage.2'),
        JSON.stringify(calmSheet.path),
      );
      await still.locator('#turtle-sheet-found li button').first().click();
      check(
        'less motion: a word of her sheet opens its card at once — the card does not come in',
        (await still.locator('#turtle-sheet-found .g-place').count()) === 1 &&
          (await moving(still)) === 0,
      );
      await still.locator('#turtle-sheet-found li button').first().click();
      await still
        .locator('#turtle-sheet')
        .getByRole('button', { name: 'Violet', exact: true })
        .click();
      check(
        'less motion: her colour can be chosen all the same',
        (await her(still))?.tint === '6' && (await moving(still)) === 0,
      );
      await still.keyboard.press('Escape');
      await playRound(still);
      check(
        'less motion: a word found and a round that ends move nothing',
        (await logOf(still)).every((line) => line[1] === '' && line[3] !== 'pulse') &&
          (await moving(still)) === 0,
        JSON.stringify(await logOf(still)),
      );
      await calm.context.close();
    }
  }

  // --- the entrance: any of its three words may be touched first (D19.16)
  async function runEntrance(): Promise<void> {
    const second = first[1];
    const third = first[2];
    const opener = first[0];
    if (opener === undefined || second === undefined || third === undefined) {
      throw new Error('the first round has fewer than three words');
    }
    const { context, view } = await visitor(null);
    await reveal(view, 1);
    const place = locate(data, second.section);
    check(
      'the second of the three words, touched first: its card, as given — where it is written, nothing of a choice — and the focus on its sentence',
      (await wordShown(view)) === second.word &&
        text(await view.locator('#game-live .g-place h3').textContent()) ===
          `C’est écrit dans la partie ${String(place?.part.number)}.` &&
        (await view.evaluate<boolean>(
          "document.activeElement === document.querySelector('#game-live .g-place h3')",
        )),
      text(await view.locator('#game-live .g-place h3').textContent()),
    );
    check(
      '…she makes her small move for it, as for any word found',
      (await her(view))?.pose === 'pulse',
      JSON.stringify(await her(view)),
    );
    const held = JSON.parse((await view.evaluate<Stores>(stores)).tab[STORAGE_KEY] ?? '{}') as {
      seen?: string[];
      round?: { words?: string[]; at?: number };
    };
    check(
      '…and the tab holds a round that goes round the three words from the one that was touched',
      JSON.stringify(held.seen) === JSON.stringify([second.id]) &&
        JSON.stringify(held.round?.words) === JSON.stringify([second.id, third.id, opener.id]) &&
        held.round?.at === 0,
      JSON.stringify(held),
    );
    await view.getByRole('button', { name: 'Mot suivant' }).click();
    check(
      '…then the third word, with its question',
      (await wordShown(view)) === third.word &&
        text(await view.locator('#game-live .g-ask').textContent()) ===
          'Dans quelle partie est-il écrit ?',
      await wordShown(view),
    );
    await view.getByRole('button', { name: 'Je ne sais pas' }).click();
    await view.getByRole('button', { name: 'Mot suivant' }).click();
    check(
      '…then the first word of the list, with its question too: the entrance does not come back',
      (await wordShown(view)) === opener.word &&
        (await view.locator('#game-live .g-enter').count()) === 0 &&
        (await view.locator('#game-live .g-tile').count()) === partTitles.length,
      await wordShown(view),
    );
    const openerPlace = locate(data, opener.section);
    await view
      .locator(`#game-live .g-tile[data-tile="${String(openerPlace?.part.number)}"]`)
      .click();
    check(
      '…where the right tile says « Oui. », as for any word that is asked',
      text(await view.locator('#game-live .g-place h3').textContent()) ===
        `Oui. C’est écrit dans la partie ${String(openerPlace?.part.number)}.`,
      text(await view.locator('#game-live .g-place h3').textContent()),
    );
    await view.getByRole('button', { name: 'Mot suivant' }).click();
    await until(
      view,
      "(() => { const line = document.querySelector('#game-live .g-line'); return line !== null && !line.hasAttribute('data-wait'); })()",
    );
    const under = await view.evaluate<EndPanel>(END_PANEL);
    const ended = JSON.parse((await view.evaluate<Stores>(stores)).tab[STORAGE_KEY] ?? '{}') as {
      seen?: string[];
    };
    check(
      'the round it opened ends on three words — the three of the entrance, whatever was touched first —, « Tu te souviens ? » offers the word that was touched, and the words to come are the next of the list',
      text(await view.locator('#game-live .g-end h3').textContent()) ===
        'Trois mots, trois endroits du livre.' &&
        JSON.stringify([...(ended.seen ?? [])].sort()) ===
          JSON.stringify(first.map((w) => w.id).sort()) &&
        JSON.stringify(under.words) === JSON.stringify([second.word]) &&
        JSON.stringify(under.aheadWords) ===
          JSON.stringify(data.words.slice(ROUND, 2 * ROUND).map((w) => w.word)),
      JSON.stringify(under),
    );
    await context.close();

    // By the keyboard: the three words are reached one after the other, and Enter gives the card.
    {
      const keyed = await visitor(null);
      const rows = keyed.view.locator('#game-live .g-pick-word');
      await rows.first().focus();
      await keyed.view.keyboard.press('Tab');
      await keyed.view.keyboard.press('Tab');
      const onThird = await keyed.view.evaluate<boolean>(
        "document.activeElement === document.querySelectorAll('#game-live .g-pick-word')[2]",
      );
      await keyed.view.keyboard.press('Enter');
      check(
        'by the keyboard: the three words follow one another, and Enter on the third gives its card',
        onThird &&
          (await wordShown(keyed.view)) === third.word &&
          (await keyed.view.locator('#game-live .g-place').count()) === 1,
        await wordShown(keyed.view),
      );
      await keyed.context.close();
    }

    // The way to the search: the section of the field, the focus in the field, nothing in the
    // address — and she is no longer whole on screen with it (D19.9).
    {
      const seeker = await visitor(null);
      await seeker.view.locator('#game-live .g-door .g-find').click();
      await seeker.view.waitForTimeout(300);
      const found = await seeker.view.evaluate<{
        field: boolean;
        her: boolean;
        hash: string;
      }>(`(() => {
        const box = document.querySelector('${HER}').getBoundingClientRect();
        return {
          field: document.activeElement === document.querySelector('#q'),
          her: box.top >= 0 && box.bottom <= innerHeight,
          hash: location.hash,
        };
      })()`);
      check(
        'the way to the search leads to the field, which takes the focus — nothing in the address, and she is not whole on screen with it',
        found.field && !found.her && found.hash === '',
        JSON.stringify(found),
      );
      await seeker.context.close();
    }
  }

  // --- the data cannot be had: the round of the HTML goes on
  async function runWithoutData(): Promise<void> {
    server.failData = true;
    const offline = await browser.newContext(phone);
    const view = await offline.newPage();
    await view.goto(`${origin}/`);
    await view.waitForTimeout(500);
    const entries = await view.evaluate<number>('history.length');
    await view.locator('#game-static .g-pick-word').first().click();
    check(
      'without its data the game is still the round of the HTML, and she is the turtle she arrived as',
      (await view.locator('#game-live').isHidden()) &&
        (await view.locator('.g-word-1 .g-place').isVisible()) &&
        (await view.locator(HER).getAttribute('data-state')) === '0' &&
        (await view.locator('#jeu button:visible').count()) === 0,
    );
    // The round of the HTML is played with anchors. Once the script of the game runs, each
    // REPLACES the entry it leaves: a tile that was followed is not kept in the history of
    // the browser, where the page says no choice is kept (security review of 19/11/2026).
    await view.locator('#game-static .g-next:visible').click();
    await view.locator('#game-static .g-tile:visible').nth(2).click();
    check(
      '…and the anchors of that round leave no entry behind them in the history: « back » does not go through the tiles',
      (await view.evaluate<number>('history.length')) === entries &&
        /#b2-[1-6]$/.test(view.url()) &&
        (await view.locator('.g-word-2 .g-place').isVisible()),
      `${String(entries)} → ${String(await view.evaluate<number>('history.length'))} ${view.url()}`,
    );
    await offline.close();
    server.failData = false;
  }

  // --- « Envoyer le lien du jeu »: the bare address, and nothing else (D16.17, D17.10)
  async function runShare(): Promise<void> {
    // A flamingo with a colour: nothing of her is in what is sent.
    const stored = resting(data, passageRound.get('12') ?? 2, 4);
    const sharing = await browser.newContext(phone);
    await sharing.addInitScript(
      'window.__shared = []; navigator.share = (data) => { window.__shared.push(data); return Promise.resolve(); };',
    );
    await sharing.addInitScript(seedTab(stored));
    const view = await sharing.newPage();
    await arrive(view);
    await playRound(view);
    await view.getByRole('button', { name: 'Envoyer le lien du jeu' }).click();
    const shared: Record<string, unknown>[] = await view.evaluate('window.__shared');
    check(
      '« Envoyer le lien du jeu » shares the bare address of the site: no text, no word, no answer, nothing of her — not her colour',
      shared.length === 1 && JSON.stringify(shared[0]) === JSON.stringify({ url: `${origin}/` }),
      JSON.stringify(shared),
    );
    await sharing.close();

    // No share sheet: the address is copied, and it is said.
    const copying = await browser.newContext(phone);
    await copying.addInitScript(
      "window.__copied = []; Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: (text) => { window.__copied.push(text); return Promise.resolve(); } }, configurable: true });",
    );
    const plain = await copying.newPage();
    await arrive(plain);
    await playRound(plain);
    // Pressed while her first passage plays: the press cuts it short, and what happened to her
    // is said with the copy (found by the review of the code).
    await plain.getByRole('button', { name: 'Envoyer le lien du jeu' }).click();
    await until(
      plain,
      "document.querySelector('#game-status').textContent.endsWith('Lien copié.')",
    );
    const copied: string[] = await plain.evaluate('window.__copied');
    const said = text(await plain.locator('#game-status').textContent());
    check(
      'without a share sheet the address is copied, and it is said — after what happened to her',
      JSON.stringify(copied) === JSON.stringify([`${origin}/`]) &&
        said === [...ending(data, kit, 1).said.map(shown), 'Lien copié.'].join(' '),
      `${JSON.stringify(copied)} ${said}`,
    );
    await copying.close();
  }

  // --- the keyboard: from the end of a round to her, into her sheet, and back
  async function runKeyboard(): Promise<void> {
    const at = ending(data, kit, passageRound.get('12') ?? 2);
    const { context, view } = await visitor(at.stored);
    const focused = (): Promise<string> =>
      view.evaluate<string>(`(() => {
        const node = document.activeElement;
        if (node === null || node === document.body) return '';
        return node.id || node.getAttribute('aria-label') || node.textContent.replace(/\\s+/g, ' ').trim();
      })()`);
    const inSheet = (): Promise<boolean> =>
      view.evaluate<boolean>("document.activeElement?.closest('#turtle-sheet') !== null");
    // The round is ended with a key, her passage skipped with another.
    await view.locator('#game-live button').filter({ hasText: 'Mot suivant' }).focus();
    await view.keyboard.press('Enter');
    await view.waitForTimeout(400);
    await view.keyboard.press('Escape');
    // From the sentence of the round's end, backwards: what is under the stage, then her.
    const back = [await focused()];
    for (let step = 0; step < 3; step += 1) {
      await view.keyboard.press('Shift+Tab');
      back.push(await focused());
    }
    check(
      'with a keyboard, from the sentence of the round’s end and backwards: « Choisir sa couleur », « Sa fiche », then her',
      JSON.stringify(back) ===
        JSON.stringify([
          'Trois mots, trois endroits du livre.',
          'game-tint-link',
          'game-sheet-link',
          'Ta tortue',
        ]),
      back.join(' → '),
    );
    await view.keyboard.press('Enter');
    check(
      'Enter on her opens her sheet, the focus goes into it, and she does her figure',
      (await sheetOpen(view)) && (await inSheet()) && (await her(view, LARGE))?.pose === 'trick',
      await focused(),
    );
    // Tab goes through her sheet in the order it reads, and stays in it. What she has found
    // is on the way since lot 6: each word is a button that opens its card again.
    const stops: string[] = [];
    let stayed = true;
    for (let step = 0; step < 13 + at.seen.length; step += 1) {
      await view.keyboard.press('Tab');
      stops.push(await focused());
      stayed &&= await inSheet();
    }
    check(
      'Tab goes through her sheet in the order it reads — « Revoir », her colours, the words she has found, what is kept, the way out — and stays in it',
      stayed &&
        JSON.stringify(stops) ===
          JSON.stringify([
            'Revoir',
            'Revoir',
            'Bleu ciel',
            'Orange',
            'Vert',
            'Jaune',
            'Rouge',
            'Violet',
            'Sans couleur',
            ...at.seen.map(wordOf),
            'turtle-sheet-keep',
            'turtle-sheet-erase',
            'Tout le détail, page Confidentialité',
            'Fermer',
          ]),
      stops.join(' → '),
    );
    // A colour is given with a key, and the focus stays on it.
    for (let step = 0; step < 7 + at.seen.length; step += 1) await view.keyboard.press('Shift+Tab');
    const on = await focused();
    await view.keyboard.press('Space');
    check(
      'a colour is given with a key, and the focus stays on it',
      on === 'Jaune' &&
        (await her(view))?.tint === '4' &&
        (await view.evaluate<boolean>(
          "document.activeElement?.getAttribute('aria-pressed') === 'true'",
        )),
      on,
    );
    await view.keyboard.press('Escape');
    check(
      'Escape closes her sheet, and the focus goes back to her',
      !(await sheetOpen(view)) && (await focused()) === 'Ta tortue',
      await focused(),
    );
    await context.close();
  }

  // --- what the independent readings of 15/11/2026 found, held from now on
  async function runReadings(): Promise<void> {
    const focusedName = (view: Page): Promise<string> =>
      view.evaluate<string>(`(() => {
        const node = document.activeElement;
        if (node === null || node === document.body) return '(the page)';
        return node.getAttribute('aria-label') ?? node.id ?? '';
      })()`);

    // The word of the programme is never cut, and never under her drawing: every word of the
    // list, written in turn in the panel of a question that follows a gesture — beside her, at
    // the widths of real phones, in her first form and once she is a flamingo.
    const words = JSON.stringify(
      data.words.map((w) => [w.word, isLongWord(w.word), isShortWord(w.word)]),
    );
    const cut: string[] = [];
    for (const width of [320, 360, 390]) {
      for (const rounds of [0, 2]) {
        const { context, view } = await visitor(rounds === 0 ? null : resting(data, rounds), {
          viewport: { width, height: 740 },
        });
        await reveal(view);
        await view.getByRole('button', { name: 'Mot suivant' }).click();
        const found = await view.evaluate<string[]>(`(() => {
          const node = document.querySelector('#game-live .g-the-word');
          const her = document.querySelector('${HER}').getBoundingClientRect();
          const out = [];
          for (const [word, long, short] of ${words}) {
            node.textContent = word;
            node.toggleAttribute('data-long', long);
            node.toggleAttribute('data-short', short);
            const box = node.getBoundingClientRect();
            const lines = Math.round(box.height / parseFloat(getComputedStyle(node).lineHeight));
            const range = document.createRange();
            range.selectNodeContents(node);
            const ink = range.getBoundingClientRect();
            const under = ink.right > her.left && ink.left < her.right && ink.bottom > her.top + 1 && ink.top < her.bottom - 1;
            if (lines !== 1 || under || box.right > innerWidth) out.push(word + ' (' + lines + (under ? ', under her' : '') + ')');
          }
          return out;
        })()`);
        cut.push(
          ...found.map((word) => `${String(width)} px, round ${String(rounds + 1)}: ${word}`),
        );
        await context.close();
      }
    }
    check(
      'the word of the programme is never cut nor under her drawing — each of the list, in the question after a gesture, at 320, 360 and 390 px, beside the turtle and beside the flamingo',
      cut.length === 0,
      cut.slice(0, 6).join(' | '),
    );

    // « Site non officiel. » is in the frame of her sheet: at its opening, halfway down, at its
    // end — in each of her forms, at the sizes of real phones; and nothing covers it.
    const unlabelled: string[] = [];
    for (const [width, height] of [
      [320, 568],
      [390, 844],
      [430, 932],
    ] as const) {
      for (const state of [0, 1, 2, 3, 4] as const) {
        const rounds = roundsFor(state);
        const { context, view } = await visitor(
          rounds === 0 ? null : resting(data, rounds, state >= 2 ? 4 : 0),
          { viewport: { width, height } },
        );
        await view.getByRole('button', { name: 'Ta tortue', exact: true }).click();
        for (const where of ['0', 'sheet.scrollHeight / 2', 'sheet.scrollHeight']) {
          const seen = await view.evaluate<boolean>(`(() => {
            const sheet = document.querySelector('#turtle-sheet');
            sheet.scrollTop = ${where};
            const frame = sheet.getBoundingClientRect();
            return [...sheet.querySelectorAll('.unofficial')].some((label) => {
              const box = label.getBoundingClientRect();
              const above = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
              return label.textContent.trim() === 'Site non officiel.' && box.height > 0 &&
                box.top >= Math.max(0, frame.top) - 0.5 && box.bottom <= Math.min(innerHeight, frame.bottom) + 0.5 &&
                above !== null && label.contains(above);
            });
          })()`);
          if (!seen)
            unlabelled.push(
              `${String(width)}×${String(height)}, state ${String(state)}, scrolled ${where}`,
            );
        }
        // Before a first passage there is no path to tell: no title over an empty list.
        if (state === 0 && (await view.locator('#turtle-sheet-way').isVisible())) {
          unlabelled.push('state 0: « Son parcours » over nothing');
        }
        await context.close();
      }
    }
    check(
      '« Site non officiel. » is in the frame of her sheet, uncovered, wherever it is scrolled — in each of her forms, at the sizes of real phones',
      unlabelled.length === 0,
      unlabelled.slice(0, 6).join(' | '),
    );

    // A key held down presses once: on « Revoir », her form swaps once; on « Garder ta tortue »,
    // the phone keeps — and does not end on a toss between keeping and not keeping.
    {
      const { context, view } = await visitor(resting(data, passageRound.get('23') ?? 7, 3));
      await view.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      await view.evaluate(`window.__seen.large = window.__watch(${JSON.stringify(LARGE)})`);
      // Six presses if the repeats were heard: an even number, so that a toggle pressed by each
      // of them would end where it began — and could not pass by luck.
      const hold = async (): Promise<void> => {
        await view.keyboard.down('Enter');
        for (let i = 0; i < 5; i += 1) {
          await view.waitForTimeout(40);
          await view.keyboard.down('Enter');
        }
        await view.keyboard.up('Enter');
      };
      const again = view.locator('#turtle-sheet-path button').first();
      await again.focus();
      await hold();
      const swaps = (await logOf(view, 'large')).filter(
        (line, index, all) => index > 0 && line[2] !== all[index - 1]?.[2],
      ).length;
      check(
        'a key held on « Revoir » presses it once: the passage plays, and her form is not swapped back and forth',
        text(await again.textContent()) === says('turtle.skip') && swaps <= 1,
        `${text(await again.textContent())}, ${String(swaps)} swap(s)`,
      );
      await view.waitForTimeout(evolutionLasts('12') + LATE_MS);
      await view.locator('#turtle-sheet-keep').focus();
      await hold();
      const kept: Stores = await view.evaluate(stores);
      check(
        'a key held on « Garder ta tortue » presses it once: the phone keeps her, and the focus is on its undoing',
        kept.phone[STORAGE_KEY] !== undefined &&
          (await focusedName(view)) === 'turtle-sheet-release',
        `${String(kept.phone[STORAGE_KEY] !== undefined)} ${await focusedName(view)}`,
      );
      await context.close();
    }
    // Her sheet closed after the button that opened it is gone: the focus goes back to her.
    {
      const at = ending(data, kit, passageRound.get('12') ?? 2);
      const { context, view } = await visitor(at.stored);
      await press(view, 'Mot suivant');
      await view.keyboard.press('Escape');
      await view.getByRole('button', { name: 'Sa fiche' }).click();
      await view.locator('#turtle-sheet').getByRole('button', { name: 'Tout effacer' }).click();
      await view.keyboard.press('Escape');
      check(
        'her sheet opened by « Sa fiche », closed after « Tout effacer » — « Sa fiche » is gone —: the focus goes back to her',
        !(await sheetOpen(view)) && (await focusedName(view)) === 'Ta tortue',
        await focusedName(view),
      );
      await context.close();
    }
    {
      const at = ending(data, kit, passageRound.get('12') ?? 2);
      const { context, view } = await visitor(at.stored);
      await press(view, 'Mot suivant');
      await view.keyboard.press('Escape');
      await view.getByRole('button', { name: 'Choisir sa couleur' }).click();
      await view.locator('#turtle-sheet').getByRole('button', { name: 'Bleu ciel' }).click();
      await view.keyboard.press('Escape');
      check(
        'her sheet closed after a colour was chosen — « Choisir sa couleur » is gone —: the focus goes back to her',
        !(await sheetOpen(view)) && (await focusedName(view)) === 'Ta tortue',
        await focusedName(view),
      );
      // « Sans couleur » is a choice the phone keeps, not a colour she has: not named as one.
      await view.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      await view.locator('#turtle-sheet').getByRole('button', { name: 'Sans couleur' }).click();
      await view.locator('#turtle-sheet').getByRole('button', { name: 'Garder ta tortue' }).click();
      const lines = (await view.locator('#turtle-sheet-kept p').allTextContents()).map(text);
      check(
        '« Sans couleur » kept: her sheet does not say « Sa couleur aussi. »',
        JSON.stringify(lines) === JSON.stringify([says('turtle.sheet.on_phone')]),
        lines.join(' | '),
      );
      await context.close();
    }

    // A passage cut short by a press that draws the next screen is said there, once that screen
    // is up: the new screen used to clear it before anyone could hear it.
    for (const [label, gesture] of [
      ['« Trois autres mots »', 'Trois autres mots'],
      ['« Ne pas garder »', 'Ne pas garder'],
    ] as const) {
      const at = ending(data, kit, passageRound.get('12') ?? 2, { declined: false });
      const { context, view } = await visitor(at.stored);
      await press(view, 'Mot suivant');
      await view.waitForTimeout(900);
      // « Ne pas garder » is on the card the quiet button opens: that press is the one that
      // falls while she passes.
      if (gesture === 'Ne pas garder') await openKeep(view);
      await view.getByRole('button', { name: gesture }).click();
      await view.waitForTimeout(SAY_LATER_MS + 200);
      const said = text(await view.locator('#game-status').textContent());
      check(
        `${label}, pressed while she passes: what happened to her is said, once the next screen is up`,
        said === at.said.map(shown).join(' '),
        said,
      );
      await context.close();
    }

    // A tap meant for « Passer », landing on « Sa fiche » that has just taken its place, opens
    // nothing; a deliberate one does.
    {
      const at = ending(data, kit, passageRound.get('12') ?? 2);
      const { context, view } = await visitor(at.stored);
      await press(view, 'Mot suivant');
      await view.waitForTimeout(600);
      const box = await view.locator('#game-skip').boundingBox();
      if (box === null) throw new Error('« Passer » has no box');
      const [x, y] = [box.x + box.width / 2, box.y + box.height / 2];
      const tapped = Date.now();
      await view.mouse.click(x, y);
      await view.waitForTimeout(120);
      await view.mouse.click(x, y);
      // On a machine too slow to tap twice within the handover, the first half says nothing.
      const quick = Date.now() - tapped < HANDOVER_MS - 100;
      const twice = quick && (await sheetOpen(view));
      await view.waitForTimeout(HANDOVER_MS + 100);
      await view.mouse.click(x, y);
      check(
        'a second tap meant for « Passer » does not open her sheet; a deliberate tap on « Sa fiche » does',
        !twice && (await sheetOpen(view)),
        `${String(twice)} ${String(await sheetOpen(view))}`,
      );
      await context.close();
    }

    // Two tabs of a phone that keeps her: one left on the end of round 1, the other plays round
    // 2. The first shows the flamingo — and says what she is now, not « Elle prend la vague ».
    {
      const pocket = await browser.newContext(phone);
      const tab = await pocket.newPage();
      await arrive(tab);
      await playRound(tab);
      await openKeep(tab);
      await tab.getByRole('button', { name: 'Garder ta tortue' }).click();
      const other = await pocket.newPage();
      await arrive(other);
      await playRound(other);
      await until(tab, `document.querySelector('${HER}').getAttribute('data-state') === '2'`);
      const now = after(data, 2);
      const next = nextRoundChangesHer(data, now.standing, now.seen, first.at(-1)?.id ?? null);
      const line = text(await tab.locator('#game-live .g-line').textContent());
      check(
        'the end of a round left on screen while another tab played on says what she is now',
        line === says(`turtle.goal.${next ? 'next' : 'chapters'}`),
        line,
      );
      await pocket.close();
    }

    // The question is heard with its word — and, at the chapter, with what the game gives above
    // it (D19.4): the focus lands on the question, and the rest is above it.
    {
      const named = (view: Page): Promise<string[]> =>
        view.evaluate<string[]>(`(() => {
          const heading = document.querySelector('#game-live .g-ask');
          return (heading.getAttribute('aria-labelledby') ?? '').split(' ').map((id) => {
            const node = document.getElementById(id);
            return node === null ? '(missing ' + id + ')' : node.textContent.replace(/\\s+/g, ' ').trim();
          });
        })()`);
      // The first depth: the part is asked, and the hint is there to be pressed by a key.
      const early = await visitor(resting(data, 1));
      await early.view.getByRole('button', { name: 'Un indice' }).focus();
      await early.view.keyboard.press('Enter');
      check(
        'the hint pressed by a key: the focus goes to the question it helps with, not to the page',
        await early.view.evaluate<boolean>(
          "document.activeElement === document.querySelector('#game-live .g-ask')",
        ),
        await focusedName(early.view),
      );
      const atPart = await named(early.view);
      await early.context.close();
      // The second depth: the part is given — in a sentence, then by its official title — and
      // the chapter is the one question.
      const { context, view } = await visitor(resting(data, 2));
      const word = data.words[2 * ROUND];
      const place = word === undefined ? null : locate(data, word.section);
      const atChapter = await named(view);
      check(
        'the question is named with its word, and at the chapter with the part the game gives',
        JSON.stringify(atPart) ===
          JSON.stringify([data.words[ROUND]?.word, 'Dans quelle partie est-il écrit ?']) &&
          JSON.stringify(atChapter) ===
            JSON.stringify([
              word?.word,
              `C’est écrit dans la partie ${String(place?.part.number)}.`,
              place?.part.title,
              'Dans quel chapitre ?',
            ]),
        `${atPart.join(' / ')} || ${atChapter.join(' / ')}`,
      );
      check(
        '…and where the part is given there is no hint left to ask for',
        (await view.getByRole('button', { name: 'Un indice' }).count()) === 0,
      );
      await context.close();
    }

    // What the review of the code found (15/11/2026), held from now on.
    // Her large copy swaps at most once every 350 ms, whatever is pressed in turn: « Revoir »
    // and a touch on her, ten times a second for two seconds.
    {
      const { context, view } = await visitor(resting(data, passageRound.get('34') ?? 16, 3));
      await view.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      await view.waitForTimeout(TRICK_HOLD_MS[4] + LATE_MS);
      await view.evaluate(`window.__seen.large = window.__watch(${JSON.stringify(LARGE)})`);
      const again = view.locator('#turtle-sheet-path button').last();
      const touch = view.locator('#turtle-sheet-her button');
      for (let i = 0; i < 20; i += 1) {
        await (i % 2 === 0 ? again : touch).dispatchEvent('click');
        await view.waitForTimeout(100);
      }
      const log = await logOf(view, 'large');
      const swaps = log
        .filter((line, index) => index > 0 && line[2] !== log[index - 1]?.[2])
        .map((line) => line[0]);
      const worst = Math.max(
        0,
        ...swaps.map((at) => swaps.filter((t) => t >= at && t < at + 1000).length),
      );
      check(
        '« Revoir » and a touch on her in turn, ten a second: her large copy swaps its form three times a second at most',
        worst <= 3,
        `${String(worst)} swaps in the worst second`,
      );
      await context.close();
    }
    // « Envoyer le lien du jeu » pressed while she passes, where the address is copied: what
    // happened to her is said with « Lien copié. », not wiped by it.
    {
      const at = ending(data, kit, passageRound.get('12') ?? 2);
      const copying = await browser.newContext(phone);
      await copying.addInitScript(
        "Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.resolve() }, configurable: true });",
      );
      await copying.addInitScript(seedTab(at.stored));
      const view = await copying.newPage();
      await arrive(view);
      await press(view, 'Mot suivant');
      await view.waitForTimeout(900);
      await view.getByRole('button', { name: 'Envoyer le lien du jeu' }).click();
      await until(
        view,
        "document.querySelector('#game-status').textContent.includes('Lien copié.')",
      );
      const said = text(await view.locator('#game-status').textContent());
      check(
        '« Envoyer le lien du jeu » pressed while she passes: what happened to her is said with « Lien copié. »',
        said === [...at.said.map(shown), 'Lien copié.'].join(' '),
        said,
      );
      await copying.close();
    }
    // Her sheet says the phone keeps her colour only when the phone holds it: a colour given in
    // one tab while nothing was kept, then « Garder » in another tab that has none.
    {
      const pocket = await browser.newContext(phone);
      await pocket.addInitScript(seedTab(resting(data, passageRound.get('12') ?? 2)));
      const one = await pocket.newPage();
      await arrive(one);
      await one.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      await one.locator('#turtle-sheet').getByRole('button', { name: 'Bleu ciel' }).click();
      const two = await pocket.newPage();
      await arrive(two);
      await two.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      await two.locator('#turtle-sheet').getByRole('button', { name: 'Garder ta tortue' }).click();
      await until(one, "document.querySelector('#turtle-sheet-release').hidden === false");
      const held: Stores = await one.evaluate(stores);
      const lines = (await one.locator('#turtle-sheet-kept p').allTextContents()).map(text);
      const phoneTint = (JSON.parse(held.phone[STORAGE_KEY] ?? '{}') as { tint?: number }).tint;
      check(
        'her sheet names her colour as kept only when the phone holds it',
        phoneTint === undefined &&
          JSON.stringify(lines) === JSON.stringify([says('turtle.sheet.on_phone')]),
        `${String(phoneTint)} | ${lines.join(' | ')}`,
      );
      await pocket.close();
    }
    // A hint asked for in one tab while another tab of the phone finds a word: the tiles are
    // marked all the same.
    {
      const pocket = await browser.newContext(phone);
      // After the first round: the part is still what is asked, so the hint is there (D19.7).
      await pocket.addInitScript(seedTab(resting(data, 1)));
      const one = await pocket.newPage();
      await arrive(one);
      await one.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      await one.locator('#turtle-sheet').getByRole('button', { name: 'Garder ta tortue' }).click();
      await one.keyboard.press('Escape');
      const two = await pocket.newPage();
      await arrive(two);
      await one.getByRole('button', { name: 'Un indice' }).click();
      await two.getByRole('button', { name: 'Je ne sais pas' }).click();
      await one.waitForTimeout(LOOKS_FOR_MS + LATE_MS + 300);
      check(
        'a hint asked in one tab while another tab finds a word: three tiles are marked all the same',
        (await one.locator('#game-live .g-mark').count()) === 3,
        String(await one.locator('#game-live .g-mark').count()),
      );
      await pocket.close();
    }
    // The end of a round left on screen keeps the sentence of the passage it played when
    // another tab finds a word without changing her: nothing changes there without a gesture.
    {
      const at = ending(data, kit, 1, { declined: false });
      const pocket = await browser.newContext(phone);
      // The first tab only: the second arrives on what the phone keeps.
      const one = await pocket.newPage();
      await one.addInitScript(seedTab(at.stored));
      await arrive(one);
      await press(one, 'Mot suivant');
      await one.waitForTimeout(evolutionLasts('01') + LATE_MS);
      await openKeep(one);
      await one.getByRole('button', { name: 'Garder ta tortue' }).click();
      const before = text(await one.locator('#game-live .g-line').textContent());
      const two = await pocket.newPage();
      await arrive(two);
      await two.getByRole('button', { name: 'Je ne sais pas' }).click();
      await one.waitForTimeout(500);
      const after1 = text(await one.locator('#game-live .g-line').textContent());
      check(
        'another tab finds a word without changing her: the line at the end of the round stays as it was',
        before === at.said.map(shown).join(' ') && after1 === before,
        `${before} → ${after1}`,
      );
      await pocket.close();
    }

    // Someone already in the round of the HTML, by the keyboard, when the script takes it over:
    // the focus follows them into the script's round.
    {
      const context = await browser.newContext(phone);
      const view = await context.newPage();
      await view.route('**/data/jeu-*.json', async (route) => {
        await new Promise((done) => setTimeout(done, 1200));
        await route.continue();
      });
      await view.goto(`${origin}/`);
      await view.locator('#game-static .g-pick-word').nth(1).focus();
      await until(view, "!document.querySelector('#game-live').hidden");
      check(
        'a focus already on one of the three words of the HTML’s entrance follows onto the same word of the script’s when it takes over',
        await view.evaluate<boolean>(
          "document.activeElement === document.querySelectorAll('#game-live .g-pick-word')[1]",
        ),
        await focusedName(view),
      );
      await context.close();
    }
    // …on the way to the search, onto the way to the search…
    {
      const context = await browser.newContext(phone);
      const view = await context.newPage();
      await view.route('**/data/jeu-*.json', async (route) => {
        await new Promise((done) => setTimeout(done, 1200));
        await route.continue();
      });
      await view.goto(`${origin}/`);
      await view.locator('#game-static .g-door .g-find').focus();
      await until(view, "!document.querySelector('#game-live').hidden");
      check(
        '…a focus on the way to the search follows onto the way to the search',
        await view.evaluate<boolean>(
          "document.activeElement === document.querySelector('#game-live .g-door .g-find')",
        ),
        await focusedName(view),
      );
      await context.close();
    }
    // …and on a theme of the other door, onto the same theme — never back up to the words.
    {
      const context = await browser.newContext(phone);
      const view = await context.newPage();
      await view.route('**/data/jeu-*.json', async (route) => {
        await new Promise((done) => setTimeout(done, 1200));
        await route.continue();
      });
      await view.goto(`${origin}/`);
      await view.locator('#game-static .g-door li a').nth(3).focus();
      await until(view, "!document.querySelector('#game-live').hidden");
      check(
        '…and a focus on a link of the other door follows onto the same link',
        await view.evaluate<boolean>(
          "document.activeElement === document.querySelectorAll('#game-live .g-door li a')[3]",
        ),
        await focusedName(view),
      );
      await context.close();
    }
    // Someone further in the round of the HTML — a question, by its anchor: onto the question.
    {
      const context = await browser.newContext(phone);
      const view = await context.newPage();
      await view.route('**/data/jeu-*.json', async (route) => {
        await new Promise((done) => setTimeout(done, 1200));
        await route.continue();
      });
      await view.goto(`${origin}/#b2`);
      await view.locator('#game-static .g-word-2 .g-tile:visible').first().focus();
      await until(view, "!document.querySelector('#game-live').hidden");
      check(
        '…and a focus on a tile of the HTML’s second word follows onto the script’s question',
        await view.evaluate<boolean>(
          "document.activeElement === document.querySelector('#game-live .g-ask')",
        ),
        await focusedName(view),
      );
      await context.close();
    }
  }

  // --- 9. where she stands and how large, at the widths of real phones
  async function runSizes(): Promise<void> {
    const SCREENS: [number, number][] = [
      [320, 568],
      [360, 740],
      [390, 844],
      [430, 932],
      [844, 390],
    ];
    interface Placed {
      her: { top: number; bottom: number; left: number; right: number; width: number };
      tile: number;
      header: number;
      height: number;
      overflow: boolean;
      block: { left: number; right: number; width: number };
      /** The field is far enough below her that both are never whole on screen (D19.9). */
      apart: boolean;
    }
    const placed = (view: Page): Promise<Placed> =>
      view.evaluate<Placed>(`(() => {
        const box = document.querySelector('${HER}').getBoundingClientRect();
        const tile = document.querySelector('#game-live .g-tile');
        const block = document.querySelector('#jeu').getBoundingClientRect();
        const header = document.querySelector('header.site').getBoundingClientRect().bottom;
        const field = document.querySelector('#q');
        return {
          her: { top: box.top, bottom: box.bottom, left: box.left, right: box.right, width: box.width },
          tile: tile === null ? 0 : tile.getBoundingClientRect().bottom,
          header,
          height: innerHeight,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
          block: { left: block.left, right: block.right, width: block.width },
          // From her top to the bottom of the field: more than the window keeps under its frame.
          apart: field === null || field.getBoundingClientRect().bottom - box.top > innerHeight - header,
        };
      })()`);
    const wrong: string[] = [];
    const sizes: string[] = [];
    for (const [width, height] of SCREENS) {
      const screen = `${String(width)} × ${String(height)}`;
      // One press from the end of the round that makes her a flamingo: she surfs, her widest form.
      const at = ending(data, kit, passageRound.get('12') ?? 2);
      const { context, view } = await visitor(at.stored, { viewport: { width, height } });
      // The question of the next word would be the same screen: the card is left for it.
      await view.evaluate(
        `sessionStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(resting(data, 1))})`,
      );
      await arrive(view);
      // The first tile at the very bottom of the window: she is still on screen, whole.
      await view.evaluate(
        "document.querySelector('#game-live .g-tile').scrollIntoView({ block: 'end' })",
      );
      const asking = await placed(view);
      const beside = Math.min(96, 0.25 * width);
      if (Math.abs(asking.her.width - beside) > 1) {
        wrong.push(`${screen}: ${asking.her.width.toFixed(1)} px beside the word`);
      }
      if (asking.her.top < asking.header - 0.5 || asking.her.bottom > asking.height + 0.5) {
        wrong.push(`${screen}: she is off screen when the first tile is on it`);
      }
      if (
        asking.her.left < asking.block.left - 0.5 ||
        asking.her.right > asking.block.right + 0.5
      ) {
        wrong.push(`${screen}: she leaves the block`);
      }
      if (asking.overflow) wrong.push(`${screen}: the question overflows`);
      if (!asking.apart) wrong.push(`${screen}: she and the field fit one screen while one plays`);
      // The end of a round: the stage — brought into view, whole, under the header.
      await view.evaluate(`sessionStorage.setItem('${STORAGE_KEY}', ${JSON.stringify(at.stored)})`);
      await arrive(view);
      await view.evaluate(
        "[...document.querySelectorAll('#game-live button')].find((b) => b.textContent.trim() === 'Mot suivant').scrollIntoView({ block: 'end' })",
      );
      await view.getByRole('button', { name: 'Mot suivant' }).click();
      await view.waitForTimeout(300);
      const ended = await placed(view);
      const stage = Math.min(240, 0.62 * width);
      if (Math.abs(ended.her.width - stage) > 1) {
        wrong.push(`${screen}: ${ended.her.width.toFixed(1)} px on the stage`);
      }
      if (ended.her.width > 0.7 * ended.block.width + 0.5)
        wrong.push(`${screen}: over 70 % of the block`);
      if (ended.her.bottom - ended.her.top > 150.5) wrong.push(`${screen}: the stage is too high`);
      if (ended.her.top < ended.header - 0.5 || ended.her.bottom > ended.height + 0.5) {
        wrong.push(`${screen}: the stage is not whole on screen when the round ends`);
      }
      if (ended.overflow) wrong.push(`${screen}: the end of the round overflows`);
      if (!ended.apart) wrong.push(`${screen}: she and the field fit one screen when a round ends`);
      // Her sheet: as large as the stage, and nothing wider than its window.
      await view.keyboard.press('Escape');
      await view.getByRole('button', { name: 'Sa fiche' }).click();
      const inSheet = await view.evaluate<{ large: number; wide: boolean; fits: boolean }>(`(() => {
        const sheet = document.querySelector('#turtle-sheet');
        const box = sheet.getBoundingClientRect();
        return {
          large: sheet.querySelector('${LARGE}').getBoundingClientRect().width,
          wide: sheet.scrollWidth > sheet.clientWidth + 1,
          fits: box.left >= 0 && box.right <= innerWidth && box.top >= 0 && box.bottom <= innerHeight,
        };
      })()`);
      if (Math.abs(inSheet.large - stage) > 1)
        wrong.push(`${screen}: ${String(inSheet.large)} px in her sheet`);
      if (inSheet.wide || !inSheet.fits) wrong.push(`${screen}: her sheet does not fit its window`);
      sizes.push(`${screen}: ${asking.her.width.toFixed(0)} / ${ended.her.width.toFixed(0)} px`);
      await context.close();
    }
    check(
      'at the widths of real phones: 96 px beside the word (80 at 320), 240 px on the stage and in her sheet, never more than 70 % of the block, 150 px high at most',
      wrong.filter((line) => /px|70 %|too high/.test(line)).length === 0,
      wrong.join(' | '),
    );
    check(
      '…she is on screen, whole, when the first tile is; the stage is whole on screen when a round ends; nothing overflows',
      wrong.filter((line) => !/px|70 %|too high|the field/.test(line)).length === 0,
      wrong.join(' | '),
    );
    // D19.9 (which makes D17.9 precise): she stays in the block of the game, and the field is a
    // section of its own, one phone screen further down — whatever the screen of the game.
    check(
      '…and she is never whole on screen together with the field: it is one screen below the game',
      wrong.filter((line) => /the field/.test(line)).length === 0,
      wrong.join(' | '),
    );
    console.log(`  ${name}: ${sizes.join(' · ')}`);

    // The longest words of the list, at the narrowest width the gates hold: each stands whole
    // on one line — beside her when there is room, under her when there is not.
    const longest = [...data.words].sort((a, b) => b.word.length - a.word.length).slice(0, 3);
    const cut: string[] = [];
    for (const long of longest) {
      const narrow = await visitor(
        JSON.stringify({
          corpus: data.corpus,
          seen: data.words.map((w) => w.id).filter((id) => id !== long.id),
          depth: 3,
          turtle: 3,
          arcs: [6, 6, 4],
          round: null,
          declined: true,
        }),
        { viewport: { width: 320, height: 640 } },
      );
      const word = narrow.view.locator('#game-live .g-the-word');
      const fit = await word.evaluate((node) => {
        const lines = Math.round(
          node.getBoundingClientRect().height / parseFloat(getComputedStyle(node).lineHeight),
        );
        const mascot = document.querySelector('#game-her svg.mascot')?.getBoundingClientRect();
        const box = node.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(node);
        const ink = range.getBoundingClientRect();
        // The letters and her never share a place.
        const over =
          mascot !== undefined &&
          ink.right > mascot.left &&
          ink.left < mascot.right &&
          ink.bottom > mascot.top + 1 &&
          ink.top < mascot.bottom - 1;
        return { lines, over, wide: box.right > innerWidth };
      });
      if (text(await word.textContent()) !== long.word || fit.lines !== 1 || fit.over || fit.wide) {
        cut.push(`${long.id}: ${JSON.stringify(fit)}`);
      }
      await narrow.context.close();
    }
    check(
      'at 320 px the three longest words of the list each stand whole on one line, and never under her drawing',
      cut.length === 0,
      cut.join(', '),
    );
  }

  // --- 10. electoral silence (D16.16): the game is not shown, and no gesture of it does anything
  async function runSilence(): Promise<void> {
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
      prepare?: (context: BrowserContext, view: Page) => Promise<void>,
    ): Promise<{ view: Page; asked: string[]; close: () => Promise<void> }> => {
      server.flags = flags;
      const context = await browser.newContext(phone);
      const view = await context.newPage();
      const asked: string[] = [];
      view.on('request', (r) => asked.push(r.url()));
      await view.clock.setFixedTime(clock);
      await prepare?.(context, view);
      await view.goto(`${origin}/`);
      await view.waitForTimeout(500);
      return { view, asked, close: () => context.close() };
    };

    // In a window, by the device's clock and by ours.
    let seen = await visit(inside, { date: inside });
    let now = await state(seen.view);
    check(
      'in a silence window the game is not shown, and one sentence says what is paused',
      now.attr &&
        !now.game &&
        now.note.startsWith('Les questions, le jeu et le partage sont en pause.') &&
        now.note.includes('C’est la règle du silence électoral') &&
        /Tout revient à .*20/.test(now.note),
      JSON.stringify(now),
    );
    check(
      '…nothing of the game is fetched, no word of it is on screen, and she is not shown',
      !seen.asked.some((url) => url.includes('/data/jeu-')) &&
        (await seen.view.locator('[data-programme="word"]:visible').count()) === 0 &&
        (await seen.view.locator('svg.mascot:visible').count()) === 0,
    );
    await seen.view.fill('#q', 'retraite');
    await until(seen.view, "document.querySelectorAll('#search-list > li').length > 0");
    check('…and the search stays open', true);
    await seen.close();

    // The few lines of the <head> hide it by themselves: the game's own script never arrives.
    seen = await visit(inside, { date: inside }, async (_context, view) => {
      await view.route('**/_astro/Game2.*', (route) => route.abort());
    });
    now = await state(seen.view);
    check(
      'the guard in the <head> hides the game before any script of ours runs',
      now.attr && !now.game,
      JSON.stringify(now),
    );
    await seen.close();

    // A clock that disagrees with ours is not believed — whichever of the two is in a window.
    seen = await visit(inside, { date: outside });
    now = await state(seen.view);
    check(
      'device in a window, server outside: closed when in doubt, and no hour is announced',
      now.attr && !now.game && !/Tout revient/.test(now.note),
      JSON.stringify(now),
    );
    await seen.close();
    seen = await visit(outside, { date: inside });
    now = await state(seen.view);
    check(
      'server in a window, device outside: closed when in doubt',
      now.attr && !now.game,
      JSON.stringify(now),
    );
    await seen.close();

    // The switch: outside any election, one field of our own file closes the game.
    seen = await visit(outside, { date: outside, override: 'on' });
    now = await state(seen.view);
    check(
      'the override closes the game outside any window, with no hour to announce',
      now.attr && !now.game && now.note !== '' && !/Tout revient/.test(now.note),
      JSON.stringify(now),
    );
    await seen.close();

    // Outside a window, with a clock that agrees: the game is there.
    seen = await visit(outside, { date: outside });
    now = await state(seen.view);
    check(
      'outside a window the game is shown, and the sentence is not',
      !now.attr && now.game && now.note === '',
      JSON.stringify(now),
    );
    await seen.close();

    // A freeze that starts while the page is open, and ends while it still is.
    const eve = new Date('2027-04-15T21:00:00Z');
    seen = await visit(eve, { date: eve });
    await until(seen.view, "!document.querySelector('#game-live').hidden");
    await reveal(seen.view);
    const midnight = new Date('2027-04-15T22:10:00Z');
    await seen.view.clock.setFixedTime(midnight);
    await seen.view.getByRole('button', { name: 'Mot suivant' }).click();
    now = await state(seen.view);
    check(
      'a freeze that starts during a round: the next gesture does nothing, the game leaves',
      now.attr && !now.game && now.note !== '',
      JSON.stringify(now),
    );
    check(
      '…and what she had found is still in the tab',
      await seen.view.evaluate<boolean>(`sessionStorage.getItem('${STORAGE_KEY}') !== null`),
    );
    const afterIt = new Date('2027-04-18T18:30:00Z');
    server.flags = { date: afterIt };
    await seen.view.clock.setFixedTime(afterIt);
    await seen.view.evaluate("document.dispatchEvent(new Event('visibilitychange'))");
    await until(seen.view, "!document.documentElement.hasAttribute('data-silence')");
    now = await state(seen.view);
    check(
      'when the window ends and the tab is looked at again, the game is back',
      !now.attr && now.game,
      JSON.stringify(now),
    );
    await seen.close();

    // A freeze that starts at the end of a round: a card read again is the game speaking too.
    {
      const over = ending(data, kit, 3);
      seen = await visit(eve, { date: eve }, async (context) => {
        await context.addInitScript(seedTab(over.stored));
      });
      await until(seen.view, "!document.querySelector('#game-live').hidden");
      await seen.view.getByRole('button', { name: 'Mot suivant' }).click();
      const offered = await seen.view.locator('#game-live .g-recall button').count();
      await seen.view.clock.setFixedTime(midnight);
      await seen.view.locator('#game-live .g-recall button').first().click();
      now = await state(seen.view);
      check(
        'a freeze that starts at the end of a round: a word of « Tu te souviens ? » opens no card, the game leaves',
        offered === 2 &&
          now.attr &&
          !now.game &&
          (await seen.view.locator('#game-live .g-place').count()) === 0,
        JSON.stringify(now),
      );
      await seen.close();
    }

    // A freeze that starts while she passes: everything of hers stops, on what she became.
    const at = ending(data, kit, passageRound.get('12') ?? 2);
    seen = await visit(eve, { date: eve }, async (context) => {
      await context.addInitScript(seedTab(at.stored));
    });
    await until(seen.view, "!document.querySelector('#game-live').hidden");
    await seen.view.evaluate(WATCH);
    await seen.view.evaluate(`window.__seen.her = window.__watch(${JSON.stringify(HER)})`);
    await press(seen.view, 'Mot suivant');
    await seen.view.waitForTimeout(700);
    const passing = await her(seen.view);
    server.flags = { date: midnight };
    await seen.view.clock.setFixedTime(midnight);
    await seen.view.evaluate("document.dispatchEvent(new Event('visibilitychange'))");
    await seen.view.waitForTimeout(300);
    now = await state(seen.view);
    const stopped = await her(seen.view);
    await seen.view.waitForTimeout(evolutionLasts('12'));
    check(
      'a freeze that starts while she passes: the game leaves, and her passage stops there — on what she became, with nothing left to play',
      passing?.phase != null &&
        now.attr &&
        !now.game &&
        isLook(stopped, lookOf({ state: at.end.state, arcs: at.end.arcs, passage: true })) &&
        isLook(
          await her(seen.view),
          lookOf({ state: at.end.state, arcs: at.end.arcs, passage: true }),
        ) &&
        (await moving(seen.view)) === 0,
      `${String(passing?.phase)} ${JSON.stringify(stopped)}`,
    );
    server.flags = { date: afterIt };
    await seen.view.clock.setFixedTime(afterIt);
    await seen.view.evaluate("document.dispatchEvent(new Event('visibilitychange'))");
    await until(seen.view, "!document.documentElement.hasAttribute('data-silence')");
    const backAgain = await staged(seen.view);
    check(
      '…and when the game is back, what happened to her is said, and « Passer » is gone',
      backAgain.lineSeen && backAgain.line === at.said.map(shown).join(' ') && !backAgain.skip,
      JSON.stringify(backAgain),
    );
    await seen.close();
    server.flags = null;
  }

  // --- 11. accessibility of the screens, under the nine conditions every page is audited under
  // (Chromium: axe is injected, so the policy is bypassed)
  async function runAudit(): Promise<void> {
    const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
    const at = ending(data, kit, passageRound.get('12') ?? 2, { declined: false });
    for (const condition of CONDITIONS) {
      const failures: string[] = [];
      const percent = condition.rootFontPercent ?? 100;
      const audit = async (view: Page, label: string): Promise<void> => {
        const result: { violations: { id: string; impact: string | null }[] } = await view.evaluate(
          'window.axe.run(document.querySelector("#jeu"), { resultTypes: ["violations"] })',
        );
        const serious = result.violations.filter(
          (v) => v.impact === 'serious' || v.impact === 'critical',
        );
        if (serious.length > 0) failures.push(`${label}: ${serious.map((v) => v.id).join(',')}`);
        const box: { sw: number; cw: number; small: string[]; cut: number; named: number } =
          await view.evaluate(`({
          sw: document.documentElement.scrollWidth,
          cw: document.documentElement.clientWidth,
          // Every target one can press: 44 px high at least. A hundredth of a pixel is let
          // go: a box is measured as the difference of two edges, and where they fall on a
          // fraction — a card that has just come in, a page scrolled to a line of 24.8 px — a
          // target of exactly 44 px was read as 43.99999999999994 (found on 19/11/2026).
          small: [...document.querySelectorAll('#jeu button, #game-live a')].filter((n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility === 'visible' && (document.querySelector('#turtle-sheet').open ? n.closest('#turtle-sheet') !== null : n.closest('#turtle-sheet') === null) && n.getBoundingClientRect().height < 43.99).map((n) => (n.textContent.trim() || n.getAttribute('aria-label')) + ' ' + n.getBoundingClientRect().height.toFixed(2)),
          // A title is never cut: nothing of the game hides what overflows it.
          cut: [...document.querySelectorAll('#game-live [data-programme], #turtle-sheet[open] [data-programme]')].filter((n) => n.scrollWidth > n.clientWidth + 1 && getComputedStyle(n).overflow !== 'visible').length,
          // Every button says what it is, in words.
          named: [...document.querySelectorAll('#jeu button')].filter((n) => n.getClientRects().length > 0 && getComputedStyle(n).visibility === 'visible' && (n.textContent.trim() || n.getAttribute('aria-label') || '') === '').length,
        })`);
        if (box.sw > box.cw)
          failures.push(`${label}: overflows (${String(box.sw)} > ${String(box.cw)})`);
        if (box.small.length > 0) failures.push(`${label}: under 44 px — ${box.small.join(', ')}`);
        if (box.cut > 0) failures.push(`${label}: ${String(box.cut)} title(s) cut`);
        if (box.named > 0) failures.push(`${label}: ${String(box.named)} button(s) without a name`);
      };
      const open = async (
        stored: string | null,
      ): Promise<{ context: BrowserContext; view: Page }> => {
        const context = await browser.newContext({ ...condition.options, bypassCSP: true });
        if (percent !== 100) await context.addInitScript(rootFontScript(percent));
        if (stored !== null) await context.addInitScript(seedTab(stored));
        const view = await context.newPage();
        await view.goto(`${origin}/`);
        // In a small window the block is more than a screen away: the script takes it over
        // when the reader gets near, not before.
        await view.locator('#jeu').scrollIntoViewIfNeeded();
        await until(view, "!document.querySelector('#game-live').hidden");
        await view.addScriptTag({ content: axe });
        return { context, view };
      };
      // A first visit: the question, the card, then the end of the round — while she passes
      // (where a passage is played at all), and once she has.
      const fresh = await open(null);
      await audit(fresh.view, 'the entrance');
      await reveal(fresh.view);
      await audit(fresh.view, 'the card of the first word');
      await fresh.view.getByRole('button', { name: 'Mot suivant' }).click();
      await audit(fresh.view, 'the question');
      await fresh.view.locator('#game-live .g-tile').first().click();
      await audit(fresh.view, 'the card of the place');
      await fresh.view.getByRole('button', { name: 'Mot suivant' }).click();
      await reveal(fresh.view);
      await fresh.view.getByRole('button', { name: 'Mot suivant' }).click();
      await fresh.view.waitForTimeout(600);
      await audit(fresh.view, 'the end of a round, while she passes');
      await fresh.view.waitForTimeout(evolutionLasts('01'));
      await audit(fresh.view, 'the end of a round, once she has passed');
      // The stage is brought into view under the site's header, however tall the text makes it.
      const covered = await fresh.view.evaluate<number>(`(() => {
        const header = document.querySelector('header.site').getBoundingClientRect().bottom;
        return Math.max(0, header - document.querySelector('#game-her').getBoundingClientRect().top);
      })()`);
      if (covered > 0.5)
        failures.push(`the stage: ${covered.toFixed(0)} px of it under the header`);
      await fresh.context.close();
      // A flamingo: the end of her round with « Choisir sa couleur », her sheet, « Revoir ».
      const later = await open(at.stored);
      await later.view.getByRole('button', { name: 'Mot suivant' }).click();
      await later.view.waitForTimeout(300);
      await later.view.keyboard.press('Escape');
      await audit(later.view, 'the end of the round that makes her a flamingo');
      await later.view.getByRole('button', { name: 'Choisir sa couleur' }).click();
      await later.view
        .locator('#turtle-sheet')
        .getByRole('button', { name: 'Jaune', exact: true })
        .click();
      await audit(later.view, 'her sheet');
      // A dialog never widens the page: what it holds is read in it. None of our words is cut
      // inside itself — a sentence of her path, a colour, a title, a button — and nothing in it
      // goes out sideways (found by an independent reading: one letter a line at 150 %).
      const broken = await later.view.evaluate<string[]>(`(() => {
        const sheet = document.querySelector('#turtle-sheet');
        const pen = document.createElement('canvas').getContext('2d');
        const out = [];
        const nodes = sheet.querySelectorAll('h3, h4, p, #turtle-sheet-path button, #turtle-sheet-tints button > span:last-child');
        for (const node of nodes) {
          if (node.getClientRects().length === 0 || node.closest('#turtle-sheet-found') !== null) continue;
          const style = getComputedStyle(node);
          pen.font = style.font;
          pen.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing;
          const words = node.textContent.trim().split(/\\s+/).filter(Boolean);
          const longest = Math.max(0, ...words.map((word) => pen.measureText(word).width));
          const room = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
          if (room + 1 < longest) out.push(node.textContent.trim().slice(0, 24) + ' (' + Math.round(room) + ' px for ' + Math.round(longest) + ')');
        }
        if (sheet.scrollWidth > sheet.clientWidth + 1) out.push('her sheet overflows sideways');
        return out;
      })()`);
      if (broken.length > 0) failures.push(`her sheet: ${broken.join(', ')}`);
      const again = later.view.locator('#turtle-sheet-path button');
      if ((await again.count()) > 0) {
        await again.first().click();
        await later.view.waitForTimeout(500);
        await audit(later.view, 'her sheet, while a passage is seen again');
      }
      await later.context.close();
      check(
        `the screens of the game pass the audit, fit, keep their targets and name their buttons: ${condition.label}`,
        failures.length === 0,
        failures.join(' | '),
      );
    }
  }

  // --- 11 bis. a system that forces its own colours (Chromium): she is still drawn, the page's
  // theme follows the system's, and the colour she has is still told from the others.
  async function runForcedColours(): Promise<void> {
    for (const scheme of ['light', 'dark'] as const) {
      const forced = await visitor(resting(data, passageRound.get('12') ?? 2, 3), {
        ...phone,
        forcedColors: 'active',
        colorScheme: scheme,
      });
      const picture = readPng(await forced.view.locator(HER).screenshot());
      // The colours of her picture, by how much of it each takes: the ground is the first; her
      // line is whatever stands out most from it among those that are more than a speck.
      const counts = new Map<string, number>();
      for (let pixel = 0; pixel < picture.width * picture.height; pixel += 1) {
        const at = pixel * picture.channels;
        const hex = `#${[0, 1, 2].map((c) => (picture.data[at + c] ?? 0).toString(16).padStart(2, '0')).join('')}`;
        counts.set(hex, (counts.get(hex) ?? 0) + 1);
      }
      const ranked = [...counts].sort((a, b) => b[1] - a[1]);
      const ground = ranked[0]?.[0] ?? '#000000';
      const stands = Math.max(
        ...ranked.filter(([, count]) => count >= 40).map(([hex]) => contrastRatio(hex, ground)),
      );
      await forced.view.getByRole('button', { name: 'Ta tortue', exact: true }).click();
      const borders = await forced.view
        .locator('#turtle-sheet-tints button')
        .evaluateAll((all) =>
          all.map((choice) => [
            choice.getAttribute('aria-pressed') ?? '',
            getComputedStyle(choice).borderTopWidth,
          ]),
        );
      const widths = (chosen: boolean): number[] =>
        borders
          .filter(([state]) => (state === 'true') === chosen)
          .map(([, width]) => parseFloat(width ?? '0'));
      const pressed = widths(true);
      const others = widths(false);
      check(
        `forced colours, ${scheme}: she is still drawn — her line stands out from the ground by 3:1 at least —, and the colour she has is told by its border`,
        stands >= LINE_MIN &&
          pressed.length === 1 &&
          others.length === 6 &&
          others.every((width) => width < (pressed[0] ?? 0)),
        `${stands.toFixed(2)}:1 on ${ground}; borders ${JSON.stringify(borders)}`,
      );
      await forced.context.close();
    }
  }

  // --- 12. Chromium only: the page does not move; her frames; no flash, on the page itself
  async function runMeasures(): Promise<void> {
    // The page does not move once painted, whoever arrives and wherever: a first visit, a
    // flamingo that comes back, at the top of the page or on the block itself.
    const flamingo = seedTab(resting(data, passageRound.get('12') ?? 2, 3));
    const shifts: string[] = [];
    for (const [label, path, also] of [
      ['a first visit', '/', ''],
      ['a first visit, on the block', '/#jeu', ''],
      ['a first visit, on the section of the field', '/#chercher', ''],
      ['a flamingo comes back', '/', flamingo],
      ['a flamingo comes back, on the block', '/#jeu', flamingo],
    ] as const) {
      const shift = await lateLayoutShift(browser, `${origin}${path}`, also);
      shifts.push(`${label} ${shift.toFixed(4)}`);
      check(`the page does not move once painted — ${label}`, shift < STILL, shift.toFixed(4));
    }
    console.log(`  ${name}: layout shift — ${shifts.join(' · ')}`);
    if (!LAB) {
      console.log(`  ${name}: her frames and her flashes are not measured here (--no-lab)`);
      return;
    }

    // Frames, the processor slowed four times, on the page of the game: a phone's screen, two
    // pixels for one. Each passage three times, the middle run kept: a machine that does
    // something else for a moment is not her.
    for (const passage of PASSAGES) {
      const round = passageRound.get(passage);
      if (round === undefined) continue;
      const at = ending(data, kit, round, { tint: passage === '23' || passage === '34' ? 3 : 0 });
      const lasts = evolutionLasts(passage);
      const runs: { p95: number; over20: number; over50: number; count: number }[] = [];
      for (let run = 0; run < 3; run += 1) {
        const slowed = await visitor(at.stored, {
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
        });
        const session = await slowed.context.newCDPSession(slowed.view);
        await session.send('Emulation.setCPUThrottlingRate', { rate: 4 });
        const all = await slowed.view.evaluate<number[]>(
          `(() => { window.__press('Mot suivant'); return window.__frames(${String(lasts)}); })()`,
        );
        // The first frame is the gesture itself — the panel of the round's end drawn —, not her.
        const deltas = all.slice(1).sort((a, b) => a - b);
        runs.push({
          count: deltas.length,
          p95: Math.round((deltas[Math.floor(deltas.length * 0.95)] ?? 0) * 10) / 10,
          over20:
            Math.round((1000 * deltas.filter((d) => d > 20).length) / Math.max(1, deltas.length)) /
            10,
          over50: deltas.filter((d) => d > 50).length,
        });
        await slowed.context.close();
      }
      const frames = runs.sort((a, b) => a.over50 - b.over50 || a.over20 - b.over20)[1];
      if (frames === undefined) continue;
      check(
        `${passage}, in the game: no frame over 50 ms and at most 5 % over 20 ms, processor slowed four times`,
        frames.over50 === 0 && frames.over20 <= 5,
        `p95 ${String(frames.p95)} ms, ${String(frames.over20)} % over 20 ms, ${String(frames.over50)} over 50 ms, ${String(frames.count)} frames`,
      );
      console.log(
        `  ${name}: ${passage} frames — p95 ${String(frames.p95)} ms, ${String(frames.over20)} % > 20 ms, ${String(frames.over50)} > 50 ms (${String(frames.count)} frames)`,
      );
    }

    // Flashes (WCAG 2.3.1), filmed on the page of the game, at its own speed, in both themes:
    // the stage and everything that changes with it — the row under it, the line said of her.
    // (Her sheet films each passage twelve times slower, so that no frame is missed:
    // scripts/mascot2-motion.ts. This film is of the page around her.)
    for (const theme of ['light', 'dark'] as const) {
      for (const passage of PASSAGES) {
        const round = passageRound.get(passage);
        if (round === undefined) continue;
        const at = ending(data, kit, round, { tint: passage === '23' || passage === '34' ? 3 : 0 });
        const studio = await visitor(at.stored, { ...phone, colorScheme: theme });
        // Where the end of the round will be: the block, from its title down.
        await studio.view.evaluate(
          "document.querySelector('#jeu').scrollIntoView({ block: 'start' })",
        );
        const block = await studio.view.locator('#jeu').boundingBox();
        if (block === null) throw new Error('the block has no box');
        const clip = {
          x: Math.floor(block.x),
          y: Math.max(0, Math.floor(block.y)),
          width: Math.ceil(block.width),
          height: Math.min(420, 844 - Math.max(0, Math.floor(block.y))),
        };
        const shots: Buffer[] = [];
        const times: number[] = [];
        await press(studio.view, 'Mot suivant');
        const started = Date.now();
        while (Date.now() - started < evolutionLasts(passage) + 500) {
          times.push(Date.now() - started);
          shots.push(await studio.view.screenshot({ clip }));
        }
        const film: Picture[] = shots.map((shot) => readPng(shot));
        const gaps = times.slice(1).map((t, index) => t - (times[index] ?? 0));
        const sorted = [...gaps].sort((a, b) => a - b);
        const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
        const flashes = flashesOf(film, times);
        check(
          `${passage}, ${theme}, filmed in the game: no flash — none of light, none of red, and no area that could make one changes back and forth`,
          withinFlashRule(flashes) &&
            flashes.flashes_per_second === 0 &&
            flashes.red_flashes_per_second === 0 &&
            flashes.area_px < FLASH_AREA_PX &&
            flashes.scene_pairs === 0,
          JSON.stringify(flashes),
        );
        check(
          `${passage}, ${theme}: the film kept up — a frame every 100 ms at least, at the median`,
          median <= 100 && film.length >= 20,
          `${String(film.length)} frames, median gap ${String(median)} ms`,
        );
        console.log(
          `  ${name}: ${passage} ${theme} — ${String(film.length)} frames (median gap ${String(median)} ms); ${String(flashes.flashes_per_second)} flashes/s, ${String(flashes.area_px)} px² back and forth, red ${String(flashes.red_flashes_per_second)}/s on ${String(flashes.red_area_px)} px²`,
        );
        await studio.context.close();
      }
    }
  }

  // --- 1 to 4. a first visit: without script, then with it — a round, its end, her passage
  async function runVisit(): Promise<void> {
    /** The entrance as the HTML holds it: what the script must draw again, at the same place. */
    let fromHtml: Entrance;
    // --- 1. without JavaScript
    {
      const context = await browser.newContext({ ...phone, javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(`${origin}/`);
      check(
        'without script, the game is on the page, and opens it: above the section of the field',
        (await page.locator('#jeu').count()) === 1 &&
          (await page.evaluate<boolean>(
            "document.querySelector('#jeu').getBoundingClientRect().bottom <= document.querySelector('#chercher').getBoundingClientRect().top",
          )),
      );
      const words = (
        await page.locator('#game-static .g-word [data-programme="word"]').allTextContents()
      ).map(text);
      check(
        'the first round is in the HTML: the first three words of the list',
        JSON.stringify(words) === JSON.stringify(first.map((w) => w.word)),
        words.join(','),
      );
      // The page opens on the entrance (D19.15, D19.16), not on a question: THREE WORDS TO
      // TOUCH — those of the first round —, what touching one does and where every card
      // leads; and, under a rule, the other door of the site: the way to the search and six
      // themes people hear about.
      const entrance = await page.evaluate<Entrance>(entranceIn('#game-static'));
      fromHtml = entrance;
      check(
        'the page opens on the entrance: the three words of the first round, each a link to its card, marked as a word of the programme and named for what the gesture does',
        entrance.lead.join(' ') === says('game.start.hook') &&
          entrance.lead.length === 2 &&
          JSON.stringify(entrance.words) ===
            JSON.stringify(
              first.map((w, index) => [
                w.word,
                says('game.start.cta'),
                'a',
                `#a${String(index + 1)}`,
                true,
              ]),
            ) &&
          entrance.how === says('game.start.source') &&
          JSON.stringify(entrance.order) ===
            JSON.stringify(['g-lead', 'g-pick', 'g-how', 'g-door']),
        JSON.stringify(entrance),
      );
      check(
        '…nothing is asked of a newcomer: no question, no tile — and the entrance says nothing of her',
        entrance.tiles === 0 && entrance.asks === 0 && entrance.ofHer === 0,
        JSON.stringify(entrance),
      );
      check(
        '…each of the three words is a row as tall as a thumb and more, one under the other',
        entrance.at.rowHeights.every((height) => height >= 44) &&
          entrance.at.rows.every((top, index, all) => index === 0 || top > (all[index - 1] ?? 0)),
        JSON.stringify(entrance.at),
      );
      check(
        '…and under them, the other door of the site: the way to the search, and six themes people hear about, each a link to our answer',
        entrance.findTitle === says('game.start.find') &&
          JSON.stringify(entrance.find) ===
            JSON.stringify([says('home.direct.cta_search'), '#chercher']) &&
          JSON.stringify(entrance.themes.map((theme) => theme[1])) ===
            JSON.stringify(DOOR_THEMES.map((slug) => `/r/${slug}/`)) &&
          entrance.themes.every(
            (theme) => theme[0] !== '' && (theme[2] ?? '').startsWith(`${theme[0]} : `),
          ),
        JSON.stringify(entrance.themes),
      );
      await page.goto(`${origin}/#b2`);
      check(
        'a question shows one word, and one question at a time',
        JSON.stringify(await visibleHeadings(page)) ===
          JSON.stringify(['Dans quelle partie est-il écrit ?']) &&
          text(await page.locator('[data-programme="word"]:visible').textContent()) ===
            first[1]?.word,
        (await visibleHeadings(page)).join(' | '),
      );
      const tiles = (await page.locator('.g-word-2 .g-tile:visible').allTextContents()).map(text);
      check(
        'the six tiles are the six official titles, whole',
        JSON.stringify(tiles) === JSON.stringify(partTitles),
        tiles.join(' | '),
      );
      await page.goto(`${origin}/`);
      const POSITION = /^#(?:[abc][1-3](?:-[0-6])?|fin|chercher)$/;
      const hrefs = await page
        .locator('#game-static a[href^="#"]')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
      check(
        'an anchor says a position, never a word or an answer',
        hrefs.length > 0 && hrefs.every((h) => POSITION.test(h)),
        hrefs.filter((h) => !POSITION.test(h)).join(','),
      );
      // She is there, once, as the turtle — and nothing that only a script can answer is.
      const without = await page.evaluate<{
        drawings: number;
        state: string | null;
        buttons: number;
        row: boolean;
        goal: string[];
        dialog: boolean;
      }>(`({
        drawings: document.querySelectorAll('#jeu svg.mascot').length,
        state: document.querySelector('${HER}')?.getAttribute('data-state') ?? null,
        buttons: [...document.querySelectorAll('#jeu button')].filter((b) => b.getClientRects().length > 0 && getComputedStyle(b).visibility === 'visible').length,
        row: document.querySelector('#game-her-with').getClientRects().length > 0,
        goal: [...document.querySelectorAll('#game-static .g-goal')].map((p) => getComputedStyle(p).visibility),
        dialog: document.querySelector('#turtle-sheet').open,
      })`);
      check(
        'without script she is there, once, as the turtle, and no button is offered',
        without.drawings === 1 &&
          without.state === '0' &&
          without.buttons === 0 &&
          !without.row &&
          !without.dialog,
        JSON.stringify(without),
      );
      check(
        'without script, the sentence that says she changes keeps its room and is not shown',
        without.goal.length === ROUND && without.goal.every((v) => v === 'hidden'),
        without.goal.join(','),
      );

      // Every tile of a word leads to its card, and the card never judges — wherever the word
      // stands in the round: second (`b`) or third (`c`).
      const word = first[1];
      const place = word === undefined ? null : locate(data, word.section);
      if (word === undefined || place === null) throw new Error('the second word has no place');
      const also = otherParts(data, word.id);
      let cards = 0;
      for (const at of ['b', 'c']) {
        for (let tile = 0; tile <= 6; tile += 1) {
          await page.goto(`${origin}/#${at}2-${String(tile)}`);
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
      }
      check(
        'every tile, and « Je ne sais pas », leads to the card of the place',
        cards === 14,
        String(cards),
      );
      await page.goto(`${origin}/#b2-${String(place.part.number)}`);
      const where = (await page.locator('.g-word-2 .g-where li').allTextContents()).map(text);
      check(
        'the card names the part, the chapter and the section by their official titles',
        JSON.stringify(where) ===
          JSON.stringify([place.part.title, place.chapter.title, place.section.title]),
        where.join(' | '),
      );
      const cta = page.locator('.g-word-2 .g-place a.cta');
      check(
        '« C’est écrit là » leads to the section in the official book',
        (await cta.getAttribute('href')) === sectionUrl(word.section) &&
          (await cta.getAttribute('rel')) === 'noopener noreferrer',
        (await cta.getAttribute('href')) ?? '',
      );
      // The card is under her, whole: never beside her.
      const beside = await page.evaluate<{ card: number; her: number }>(`({
        card: document.querySelector('.g-word-2 .g-place').getBoundingClientRect().top,
        her: document.querySelector('${HER}').getBoundingClientRect().bottom,
      })`);
      check(
        'the card of the place is under her, never beside her',
        beside.card >= beside.her,
        JSON.stringify(beside),
      );
      // The whole round, link by link, from EACH of the three words: the word touched is
      // given — its card says where, and not a word about a choice, since none was made —,
      // then the round goes round the two others, each with its question, to its end.
      const walked: string[] = [];
      for (let start = 1; start <= ROUND; start += 1) {
        await page.goto(`${origin}/`);
        await page
          .locator('#game-static .g-pick-word')
          .nth(start - 1)
          .click();
        const given = await visibleHeadings(page);
        const givenPlace = locate(data, first[start - 1]?.section ?? '');
        const seenWords = [
          text(await page.locator('[data-programme="word"]:visible').textContent()),
        ];
        const ok: boolean[] = [
          JSON.stringify(given) ===
            JSON.stringify([`C’est écrit dans la partie ${String(givenPlace?.part.number)}.`]),
          page.url().endsWith(`#a${String(start)}`),
          await page.locator('#game-static .g-enter').isHidden(),
          (await page.locator('#game-static .g-next:visible').count()) === 1,
        ];
        for (let step = 0; step < ROUND - 1; step += 1) {
          await page.locator('#game-static .g-next:visible').click();
          seenWords.push(text(await page.locator('[data-programme="word"]:visible').textContent()));
          ok.push(
            JSON.stringify(await visibleHeadings(page)) ===
              JSON.stringify(['Dans quelle partie est-il écrit ?']),
          );
          // A tile, then « Je ne sais pas »: both lead to a card with one way on.
          if (step === 0) await page.locator('#game-static .g-tile:visible').first().click();
          else await page.locator('#game-static .g-with a:visible').click();
          ok.push((await page.locator('#game-static .g-next:visible').count()) === 1);
        }
        await page.locator('#game-static .g-next:visible').click();
        ok.push(
          JSON.stringify(await visibleHeadings(page)) ===
            JSON.stringify(['Trois mots, trois endroits du livre.']),
          await page.locator('.g-end a[href="/sommaire/"]').isVisible(),
          page.url().endsWith('#fin'),
        );
        // The round goes round its words from the one that was touched.
        const expected = [0, 1, 2].map((k) => first[(start - 1 + k) % ROUND]?.word);
        if (ok.every(Boolean) && JSON.stringify(seenWords) === JSON.stringify(expected)) {
          walked.push(String(start));
        } else {
          walked.push(
            `${String(start)}✖(${seenWords.join('>')} ${ok.map((v) => (v ? '1' : '0')).join('')})`,
          );
        }
      }
      check(
        'the round is played to its end with links alone, from each of the three words: the word touched is given, the two others are asked, in the order of the round',
        JSON.stringify(walked) === JSON.stringify(['1', '2', '3']),
        walked.join(' '),
      );
      check(
        'without script she has not changed at the end of the round, and nothing says she has',
        (await page.locator(HER).getAttribute('data-state')) === '0' &&
          !(await page.evaluate<boolean>(
            "document.querySelector('#jeu').hasAttribute('data-stage')",
          )),
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
    const context = await browser.newContext(phone);
    const page = await context.newPage();
    const requests: { url: string; method: string; body: string }[] = [];
    const violations: string[] = [];
    page.on('request', (r) =>
      requests.push({ url: r.url(), method: r.method(), body: r.postData() ?? '' }),
    );
    page.on('console', (m) => {
      if (/Content Security Policy|Refused to/i.test(m.text()) && !/duplicate/i.test(m.text())) {
        violations.push(m.text());
      }
    });
    page.on('pageerror', (e) => violations.push(String(e)));
    await arrive(page);
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
      'the round of the HTML has given way to the script’s, on its entrance',
      (await page.locator('#game-static').isHidden()) && (await wordShown(page)) === ENTRANCE,
      await wordShown(page),
    );
    const arrived = await her(page);
    check(
      'she arrives as the turtle, at rest, live — and nothing of her moves',
      isLook(arrived, lookOf({ state: 0 })) && arrived?.live === true && (await moving(page)) === 0,
      JSON.stringify(arrived),
    );
    // The entrance, drawn again by the script: what the HTML held, in the same order and at
    // the same place — each word a button now, the other door the very copy of the page's.
    const drawn = await page.evaluate<Entrance>(entranceIn('#game-live'));
    const told = (e: Entrance): unknown[] => [
      e.lead,
      e.words.map((word) => [word[0], word[1], word[4]]),
      e.how,
      e.findTitle,
      e.find,
      e.themes,
      e.order,
    ];
    check(
      'the script draws the entrance the page arrived with: the same words, the same links, in the same order — and each of the three words is a button',
      JSON.stringify(told(drawn)) === JSON.stringify(told(fromHtml)) &&
        drawn.words.length === ROUND &&
        drawn.words.every((word) => word[2] === 'button' && word[3] === null) &&
        drawn.tiles === 0 &&
        drawn.asks === 0,
      JSON.stringify(drawn),
    );
    check(
      '…at the very place it stood in the HTML: the three words, what is said under them and the end of the other door have not moved',
      JSON.stringify(drawn.at) === JSON.stringify(fromHtml.at),
      `${JSON.stringify(fromHtml.at)} → ${JSON.stringify(drawn.at)}`,
    );
    check(
      '…and one element of the page bears the name of the other door: the one it arrived with',
      (await page.locator('[id="game-door"]').count()) === 1 &&
        (await page.locator('#game-static #game-door').count()) === 1,
    );
    check(
      'the entrance says nothing of her: what will make her change is said from the first card on',
      (await page.locator('#game-live .g-goal').count()) === 0 &&
        (await page.locator('#game-her-with').isHidden()),
    );
    check(
      'each of the three words is named for what touching it does, to who cannot see the row',
      (
        await page
          .locator('#game-live .g-pick-word')
          .evaluateAll((rows) => rows.map((row) => row.textContent.replace(/\s+/g, ' ').trim()))
      ).every((name, index) => name === `${first[index]?.word ?? ''}${says('game.start.cta')}`) &&
        (await page
          .getByRole('button', {
            name: new RegExp(`${first[0]?.word ?? ''}.*${says('game.start.cta')}`),
          })
          .count()) === 1,
    );
    check(
      'the entrance holds whole in the window of a phone: the way to the search and the themes are above the fold',
      drawn.at.door <= 844,
      String(drawn.at.door),
    );
    check(
      'she is a button, by her name, and says it opens something',
      (await page.getByRole('button', { name: 'Ta tortue', exact: true }).count()) === 1 &&
        (await page
          .getByRole('button', { name: 'Ta tortue', exact: true })
          .getAttribute('aria-haspopup')) === 'dialog',
    );

    // --- 3. a round: the first word given, then the right tile, then another one
    const seenBefore = requests.length;
    const playWord = async (index: number, how: 'here' | 'other' | 'unknown'): Promise<string> => {
      const word = first[index];
      const place = word === undefined ? null : locate(data, word.section);
      if (word === undefined || place === null) throw new Error(`no word at ${String(index)}`);
      const right = String(place.part.number);
      const taken = new Set([place.part.number, ...otherParts(data, word.id)]);
      const other = String(data.parts.map((p) => p.number).find((n) => !taken.has(n)) ?? 0);
      await page.evaluate('window.__seen.her.log.length = 0');
      if (how === 'unknown') await reveal(page);
      else
        await page
          .locator(`#game-live .g-tile[data-tile="${how === 'here' ? right : other}"]`)
          .click();
      return right;
    };
    /** What a word found writes on her, without its times: her move, then as she was. */
    const moves: string[] = [];
    const moved = async (): Promise<void> => {
      await page.waitForTimeout(PULSE_HOLD_MS + LATE_MS);
      moves.push(JSON.stringify((await logOf(page)).map((line) => line.slice(1))));
    };
    let right = await playWord(0, 'unknown');
    check(
      'the first of the three words, touched, gives its card: where it is written, and not a word about a choice — none was made',
      text(await page.locator('#game-live .g-place h3').textContent()) ===
        `C’est écrit dans la partie ${right}.` &&
        (await page.locator('#game-live .g-enter').count()) === 0,
      text(await page.locator('#game-live .g-place h3').textContent()),
    );
    check(
      'the focus goes to the sentence of the card',
      await page.evaluate<boolean>(
        "document.activeElement === document.querySelector('#game-live .g-place h3')",
      ),
    );
    // What the measure provides, in one sentence of OURS (D19.2) — where this build may show
    // sentences. Under its own label, after the place and its link, never dressed as the book.
    {
      const entry = data.words[0];
      const card = await page.evaluate<{
        blocks: number;
        badge: string;
        sentence: string;
        marked: boolean;
        order: string[];
        book: number;
        face: string;
        ui: string;
        voice: string;
      }>(`(() => {
        const card = document.querySelector('#game-live .g-place');
        const block = card.querySelector('.g-gist');
        const flat = (node) => (node ? node.textContent.replace(/\\s+/g, ' ').trim() : '');
        const kinds = [...card.children].map((child) =>
          child.matches('h3') ? 'heading'
          : child.matches('.g-where') ? 'where'
          : child.matches('.g-official') ? 'official'
          : child.matches('.g-gist') ? 'gist'
          : child.matches('.g-actions') ? 'next'
          : 'line');
        const sentence = block ? block.querySelector('[data-generated-by]') : null;
        return {
          blocks: card.querySelectorAll('.g-gist').length,
          badge: block ? flat(block.firstElementChild) : '',
          sentence: flat(sentence),
          marked: sentence !== null && sentence.getAttribute('data-generated-by') === 'ai',
          order: kinds,
          book: block ? block.querySelectorAll('[data-programme]').length : 0,
          face: sentence ? getComputedStyle(sentence).fontFamily : '',
          ui: getComputedStyle(card.querySelector('h3')).fontFamily,
          voice: flat(card),
        };
      })()`);
      if (entry?.gist === undefined) {
        check(
          'a build that may show no sentence shows none: the card names no AI',
          card.blocks === 0 && !/\bIA\b/.test(card.voice),
          card.voice,
        );
      } else {
        check(
          'the card says what the measure provides in one sentence of ours, under its label: an AI wrote it',
          card.blocks === 1 &&
            card.badge === says('game.gist.badge') &&
            card.sentence === shown(entry.gist) &&
            card.marked,
          `${card.badge} | ${card.sentence}`,
        );
        const at = (kind: string): number => card.order.indexOf(kind);
        check(
          '…after the place and its link, before the way on — never under « C’est écrit là », never dressed as the book',
          at('heading') === 0 &&
            at('where') < at('official') &&
            at('official') < at('gist') &&
            at('gist') < at('next') &&
            at('next') === card.order.length - 1 &&
            card.book === 0 &&
            card.face === card.ui,
          `${card.order.join(' > ')} | ${card.face}`,
        );
      }
    }
    const pulsing = await her(page);
    check(
      'a word found: she makes her small move, at once',
      pulsing?.pose === 'pulse' && pulsing.state === '0' && (await moving(page)) > 0,
      JSON.stringify(pulsing),
    );
    await moved();
    check(
      '…and is as she was 340 ms later',
      isLook(await her(page), lookOf({ state: 0 })),
      JSON.stringify(await her(page)),
    );
    const firstPlace = locate(data, first[0]?.section ?? '');
    const places = (await page.locator('#game-live .g-where li').allTextContents()).map(text);
    check(
      'the card names the place by its three official titles',
      JSON.stringify(places) ===
        JSON.stringify([
          firstPlace?.part.title,
          firstPlace?.chapter.title,
          firstPlace?.section.title,
        ]),
      places.join(' | '),
    );
    const href = (await page.locator('#game-live a.cta').getAttribute('href')) ?? '';
    check(
      '« C’est écrit là » leads to the measure in the official book',
      href.startsWith(sectionUrl(first[0]?.section ?? '-')) &&
        (await page.locator('#game-live a.cta').getAttribute('rel')) === 'noopener noreferrer',
      href,
    );
    const fragment = (await page.locator('#game-live a.cta').getAttribute('data-fragment')) ?? '';
    check(
      '…with the directive of its measure, and of the word where it was seen lit',
      fragment === first[0]?.fragment &&
        /^text=[^&]+(?:&text=[^&]+)?$/.test(fragment) &&
        (href.endsWith(`:~:${fragment}`) || !href.includes(':~:')),
      `${fragment} | ${href.split('#')[1] ?? ''}`,
    );
    check(
      'what will make her change is said beside her from the first card on',
      text(await page.locator('#game-live .g-goal').textContent()) === says('turtle.goal.start') &&
        (await page.locator('#game-live .g-goal').isVisible()),
      text(await page.locator('#game-live .g-goal').textContent()),
    );
    await page.getByRole('button', { name: 'Mot suivant' }).click();
    check(
      'the next word, and the focus on its question: the question starts at the second word',
      text(await page.locator('#game-live [data-programme="word"]').textContent()) ===
        first[1]?.word &&
        text(await page.locator('#game-live .g-ask').textContent()) ===
          'Dans quelle partie est-il écrit ?' &&
        (await page.locator('#game-live .g-tile').count()) === partTitles.length &&
        (await page.locator('#game-live .g-enter').count()) === 0 &&
        text(await page.locator('#game-live .g-goal').textContent()) ===
          says('turtle.goal.start') &&
        (await page.evaluate<boolean>(
          "document.activeElement === document.querySelector('#game-live .g-ask')",
        )),
    );
    right = await playWord(1, 'here');
    check(
      'the right tile: « Oui. », and where',
      text(await page.locator('#game-live .g-place h3').textContent()) ===
        `Oui. C’est écrit dans la partie ${right}.`,
      text(await page.locator('#game-live .g-place h3').textContent()),
    );
    await moved();
    await page.getByRole('button', { name: 'Mot suivant' }).click();
    right = await playWord(2, 'other');
    check(
      'another tile: where the word is written, and nothing about the choice',
      text(await page.locator('#game-live .g-place h3').textContent()) ===
        `C’est écrit dans la partie ${right}.`,
      text(await page.locator('#game-live .g-place h3').textContent()),
    );
    await moved();
    let voice: string = await page.evaluate(OWN_VOICE);
    check('the card never judges nor counts', !NEVER.test(voice), NEVER.exec(voice)?.[0]);
    check(
      'her move for a word found is the same whatever was chosen: none (the word given), the right tile, another',
      moves.length === 3 &&
        moves[0] !== '[]' &&
        moves[0] === moves[1] &&
        moves[1] === moves[2] &&
        (moves[0] ?? '').includes('"pulse"'),
      moves.join(' / '),
    );
    await page.waitForTimeout(ALONE_MS - PULSE_HOLD_MS - LATE_MS);
    check('nothing of her moves 2.1 s after a gesture', (await moving(page)) === 0);

    // --- 4. the end of a round: the stage, the finds, her first passage
    const one = ending(data, kit, 1);
    const frames01 = evolution(
      { state: 0, arcs: [0, 0, 0], tint: 0 },
      { state: one.end.state, arcs: one.end.arcs, tint: 0 },
    );
    await press(page, 'Mot suivant');
    check(
      'the end of the round says what was done, and takes the focus',
      text(await page.locator('#game-live .g-end h3').textContent()) ===
        'Trois mots, trois endroits du livre.' &&
        (await page.evaluate<boolean>(
          "document.activeElement === document.querySelector('#game-live .g-end h3')",
        )),
    );
    await page.waitForTimeout(700);
    const during = await staged(page);
    check(
      'at the end of a round she takes the stage: 240 px wide, 150 px high at most, never more than 70 % of the block',
      during.stage &&
        Math.abs(during.width - 240) <= 1 &&
        during.height <= 150.5 &&
        during.width <= 0.7 * during.block,
      JSON.stringify(during),
    );
    check(
      'while she passes: « Passer » is there, « Sa fiche » is not, and what is said of her waits — in its room',
      during.skip &&
        !during.sheet &&
        !during.lineSeen &&
        during.line !== '' &&
        during.status === '',
      JSON.stringify(during),
    );
    check('…and she is moving', (await moving(page)) > 0);
    await page.waitForTimeout(evolutionLasts('01') - 700 + LATE_MS + 100);
    const played = await logOf(page);
    check(
      'her passage is played beat by beat, as the choreography says, and never early',
      JSON.stringify(beats(played)) === JSON.stringify(frames01.map((f) => f.phase ?? '')) &&
        onTime(played, frames01),
      JSON.stringify(played.map((line) => [line[0], line[1]])),
    );
    const afterOne = await her(page);
    check(
      'she ends as the still look draws her: surfing, her first arc, the accent of a passage',
      isLook(afterOne, lookOf({ state: 1, arcs: one.end.arcs, passage: true })) &&
        one.end.state === 1,
      JSON.stringify(afterOne),
    );
    const ended = await staged(page);
    check(
      'what happened to her is said when it has been seen, with her goal — to the eye and to a screen reader',
      ended.lineSeen &&
        ended.line === one.said.map(shown).join(' ') &&
        ended.status === ended.line &&
        one.said.length === 2 &&
        one.said[0] === kit['turtle.passage.1'] &&
        one.said[1] === kit['turtle.goal.next_again'],
      JSON.stringify(ended),
    );
    check(
      '« Passer » has left, « Sa fiche » is in its place, and nothing under the stage has moved',
      !ended.skip && ended.sheet && ended.again === during.again && ended.again > 0,
      JSON.stringify({ during: during.again, ended: ended.again }),
    );
    check(
      'nothing of her moves once her passage has ended',
      (await moving(page)) === 0,
      String(await moving(page)),
    );
    // --- 4 bis. what the end of a round holds under her line (lot 6): « Tu te souviens ? », the
    // way on and what it leads to, the way to send the game, the way to keep her.
    {
      const sends =
        (await page.getByRole('button', { name: 'Envoyer le lien du jeu' }).count()) > 0;
      const under = await page.evaluate<EndPanel>(END_PANEL);
      check(
        'under her line, in this order: « Tu te souviens ? », the way on and the next words, the way to send the game, the way to keep her',
        JSON.stringify(under.order) ===
          JSON.stringify([
            'h3',
            'g-line',
            'g-recall',
            'g-actions',
            'g-ahead',
            ...(sends ? ['g-actions'] : []),
            'g-keep-ask',
          ]),
        under.order.join(' > '),
      );
      const recalled = recallFor(data, one.seen, one.words);
      check(
        '« Tu te souviens ? » at the first round: its first word, alone — a button, closed, and no card yet',
        under.title === says('game.recall.title') &&
          under.lead === says('game.recall.lead') &&
          recalled.old === null &&
          JSON.stringify(under.words) === JSON.stringify([wordOf(recalled.fresh)]) &&
          under.words[0] === data.words[0]?.word &&
          JSON.stringify(under.expanded) === JSON.stringify(['false']) &&
          under.cards === 0,
        JSON.stringify(under),
      );
      const next = data.words.slice(ROUND, 2 * ROUND).map((w) => w.word);
      check(
        'under « Trois autres mots »: the three words of the round to come, each marked as a word of the programme',
        under.ahead === `${says('game.round.ahead')} : ${next.join(', ')}.` &&
          JSON.stringify(under.aheadWords) === JSON.stringify(next),
        under.ahead,
      );
      check(
        'what is said there holds no number: what comes next, never what is left',
        !/\d/.test([under.title, under.lead, under.keep].join(' ')) &&
          !/\d/.test(says('game.round.ahead')),
        [under.title, under.lead, under.keep].join(' | '),
      );
      // The word pressed: its card opens right after it — and nothing else happens.
      const first = data.words[0];
      const firstPlace = first === undefined ? null : locate(data, first.section);
      if (first === undefined || firstPlace === null) throw new Error('no first word');
      const herBefore = (await logOf(page)).length;
      const heldBefore = JSON.stringify(await page.evaluate<Stores>(stores));
      const statusBefore = text(await page.locator('#game-status').textContent());
      await page.locator('#game-live .g-recall button').first().click();
      const again = await page.evaluate<Reopened>(reopenedIn('#game-live .g-recall'));
      check(
        'a word of « Tu te souviens ? » opens its card again, right after it: where it is written, neutrally, its three titles, the way to the book, its sentence under its label — and no way on',
        again.cards === 1 &&
          again.next &&
          again.said === `C’est écrit dans la partie ${String(firstPlace.part.number)}.` &&
          JSON.stringify(again.where) ===
            JSON.stringify([
              firstPlace.part.title,
              firstPlace.chapter.title,
              firstPlace.section.title,
            ]) &&
          again.href.startsWith(sectionUrl(first.section)) &&
          again.gist === (first.gist === undefined ? '' : shown(first.gist)) &&
          again.badge === (first.gist === undefined ? '' : says('game.gist.badge')) &&
          again.ways === 0 &&
          JSON.stringify(again.expanded) === JSON.stringify([first.word]),
        JSON.stringify(again),
      );
      check(
        '…the focus stays on the word, which says that it is open; the card is in view under it',
        again.focus && again.inView,
        JSON.stringify(again),
      );
      check(
        '…the sentence of the card is marked as an AI’s and never as the programme’s; its titles are the programme’s',
        again.titles === 3 && again.gistAsProgramme === 0,
        JSON.stringify(again),
      );
      // The card comes in, and nothing else moves: she is given no beat — and once the card
      // is in, nothing moves at all.
      await page.waitForTimeout(REVEAL_MS + LATE_MS);
      check(
        '…and a card read again is not a word found: nothing is written, nothing is said of her, she does not move',
        JSON.stringify(await page.evaluate<Stores>(stores)) === heldBefore &&
          text(await page.locator('#game-status').textContent()) === statusBefore &&
          (await logOf(page)).length === herBefore &&
          (await moving(page)) === 0,
        String(await moving(page)),
      );
      await page.locator('#game-live .g-recall button').first().click();
      const closed = await page.evaluate<Reopened>(reopenedIn('#game-live .g-recall'));
      check(
        'pressed again, the card closes; the focus has not left the word',
        closed.cards === 0 && closed.expanded.length === 0 && closed.focus,
        JSON.stringify(closed),
      );
    }
    check(
      'a round sent nothing',
      requests.length === seenBefore,
      requests
        .slice(seenBefore)
        .map((r) => r.url)
        .join(','),
    );
    const kept: number = await page.evaluate('localStorage.length');
    check('nothing is kept on the phone that was not asked for', kept === 0, String(kept));
    voice = await page.evaluate(OWN_VOICE);
    check(
      'the end of a round never judges, counts nor congratulates, and carries no emoji',
      !NEVER.test(voice) && !/\p{Extended_Pictographic}/u.test(voice) && !/mérit/i.test(voice),
      NEVER.exec(voice)?.[0] ?? voice,
    );
    await page.waitForTimeout(ALONE_AFTER_PASSAGE_MS - evolutionLasts('01') - LATE_MS - 100);
    check('nothing of her moves 5 s after the end of a round', (await moving(page)) === 0);
    await page.getByRole('button', { name: 'Trois autres mots' }).click();
    const back = await staged(page);
    check(
      'the next round: the next three words, she is back beside the word, the accent is gone',
      text(await page.locator('#game-live [data-programme="word"]').textContent()) ===
        data.words[3]?.word &&
        !back.stage &&
        Math.abs(back.width - 96) <= 1 &&
        isLook(await her(page), lookOf({ state: 1, arcs: one.end.arcs })) &&
        (await page.locator('#game-her-with').isHidden()) &&
        (await page.locator('#game-live .g-goal').count()) === 0,
      JSON.stringify(back),
    );

    // The hint is offered from the first words (D19.7): it comes from her — she looks at the
    // tiles, then three of them say « par ici ». None is ruled out.
    {
      const word = data.words[ROUND];
      const place = word === undefined ? null : locate(data, word.section);
      if (word === undefined || place === null) throw new Error('no word in the second round');
      await page.getByRole('button', { name: 'Un indice' }).click();
      const looking = await her(page);
      const before = await page.locator('#game-live .g-mark').count();
      await until(page, "document.querySelectorAll('#game-live .g-mark').length === 3", 2000);
      const marked = await page
        .locator('#game-live .g-tile:has(.g-mark)')
        .evaluateAll((tiles) => tiles.map((t) => (t as HTMLElement).dataset['tile'] ?? ''));
      check(
        'the hint: she looks at the tiles first, then three of them are marked — the right one among them, none ruled out',
        looking?.pose === 'look' &&
          before === 0 &&
          JSON.stringify(marked) === JSON.stringify(word.hint.map(String)) &&
          marked.includes(String(place.part.number)) &&
          (await page.locator('#game-live .g-tile').count()) === data.parts.length,
        `${String(looking?.pose)} ${String(before)} ${marked.join(',')}`,
      );
      check(
        'the hint is said in words, once',
        text(await page.locator('#game-status').textContent()).startsWith(
          'Elle regarde du côté des parties',
        ) && (await page.getByRole('button', { name: 'Un indice' }).count()) === 0,
        text(await page.locator('#game-status').textContent()),
      );
    }

    // The depth: with every part that has a word found, the chapter is asked — and she changes.
    const deepAfter = [1, 2, 3].find(
      (rounds) =>
        depthOf(
          data,
          data.words.slice(0, rounds * ROUND).map((w) => w.id),
        ) >= 2,
    );
    if (deepAfter === undefined) {
      check('the list reaches every part that has a word within three rounds', false);
    } else {
      for (let round = 1; round < deepAfter; round += 1) {
        await playRound(page);
        if (round + 1 < deepAfter)
          await page.getByRole('button', { name: 'Trois autres mots' }).click();
      }
      voice = await page.evaluate(OWN_VOICE);
      check(
        'a word found in every part that has one: the game says it now gives the part and asks the chapter',
        voice.includes(shown(says('game.depth.chapter'))) &&
          /donne la partie et demande le chapitre/.test(voice),
        voice,
      );
      // « Passer »: the form she takes, at once, and its sentence.
      await page.waitForTimeout(500);
      await page.getByRole('button', { name: says('turtle.skip') }).click();
      const two = ending(data, kit, deepAfter);
      const skipped = await her(page);
      const afterSkip = await staged(page);
      check(
        '« Passer »: she is what she became, at once — a flamingo —, and nothing moves',
        isLook(skipped, lookOf({ state: 2, arcs: two.end.arcs, passage: true })) &&
          two.end.state === 2 &&
          (await moving(page)) === 0,
        JSON.stringify(skipped),
      );
      check(
        '…her sentence is said, « Passer » has left, and the focus is on « Sa fiche », in its very place',
        afterSkip.lineSeen &&
          afterSkip.line === two.said.map(shown).join(' ') &&
          afterSkip.status === afterSkip.line &&
          !afterSkip.skip &&
          afterSkip.sheet &&
          (await page.evaluate<boolean>("document.activeElement?.id === 'game-sheet-link'")),
        JSON.stringify(afterSkip),
      );
      check(
        'once she is a flamingo with no colour, « Choisir sa couleur » is offered under the stage',
        afterSkip.tint,
      );
      const inDrawing = await page.evaluate<string>(
        `document.querySelector('${HER}').textContent.trim()`,
      );
      check('nothing is written in her drawing', inDrawing === '', inDrawing);
      await page.getByRole('button', { name: 'Trois autres mots' }).click();
      const word = data.words[deepAfter * ROUND];
      const place = word === undefined ? null : locate(data, word.section);
      if (word === undefined || place === null) throw new Error('no word after the depth opened');
      // One question a word (D19.4): the part is given — a sentence, then its official title —
      // and the chapters of that part are the tiles. Nothing is said of a choice: none was made.
      const chapters = (await page.locator('#game-live .g-tile').allTextContents()).map(text);
      const given = (await page.locator('#game-live .g-given li').allTextContents()).map(text);
      check(
        'at the second depth the part is given and the chapter is asked: the chapters of that part, by their official titles',
        text(await page.locator('#game-live .g-ask').textContent()) === 'Dans quel chapitre ?' &&
          text(await page.locator('#game-live .g-said').textContent()) ===
            `C’est écrit dans la partie ${String(place.part.number)}.` &&
          JSON.stringify(given) === JSON.stringify([place.part.title]) &&
          JSON.stringify(chapters) === JSON.stringify(place.part.chapters.map((c) => c.title)) &&
          (await page.locator('#game-live .g-given [data-programme="title"]').count()) === 1 &&
          (await her(page))?.pose === 'rest',
        `${given.join(' | ')} || ${chapters.join(' | ')}`,
      );
      check(
        '…and no hint is offered there: the part is no longer asked',
        (await page.getByRole('button', { name: 'Un indice' }).count()) === 0,
      );
      await page.locator(`#game-live .g-tile[data-tile="${place.chapter.id}"]`).click();
      check(
        'the right chapter: « Oui. », and its number — one question, then the card',
        text(await page.locator('#game-live .g-place h3').textContent()) ===
          `Oui. C’est écrit dans le chapitre ${String(place.chapter.number)}.`,
        text(await page.locator('#game-live .g-place h3').textContent()),
      );
    }

    // The colour of the game's gestures.
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
  }

  /** The sections of this gate, by the name `--only` knows them by. */
  const sections: [string, () => Promise<void>][] = [
    ['visit', runVisit],
    ['entrance', runEntrance],
    ['offline', runWithoutData],
    ['passages', runPassages],
    ['skipping', runSkipping],
    ['lines', runLines],
    ['memory', runMemory],
    ['sheet', runSheet],
    ['share', runShare],
    ['keyboard', runKeyboard],
    ['readings', runReadings],
    ['sizes', runSizes],
    ['silence', runSilence],
    ...(name === 'chromium'
      ? ([
          ['audit', runAudit],
          ['forced', runForcedColours],
          ['measures', runMeasures],
        ] as [string, () => Promise<void>][])
      : []),
  ];
  try {
    for (const [section, run] of sections) {
      if (ONLINE !== null && LOCAL_ONLY.has(section)) continue;
      if (ONLY === null || ONLY.includes(section)) await run();
    }
    check(
      'in every visit of this run — her passages, her sheet, her colours — nothing of ours threw, and nothing broke our own security policy',
      breaches.length === 0,
      [...new Set(breaches)].join(' | '),
    );
  } finally {
    await browser.close();
  }
  return out;
}

async function main(): Promise<void> {
  const name = existsSync(join(ROOT, 'data'))
    ? readdirSync(join(ROOT, 'data')).find((f) => f.startsWith('jeu-'))
    : undefined;
  if (name === undefined || !existsSync(join(ROOT, 'index.html'))) {
    console.error(`e2e-game: no game in ${ROOT}/ — run \`npm run build:ask\` first`);
    process.exit(1);
  }
  // A build made before lot F may still be on a disk: its game is the first generation's.
  if (!readFileSync(join(ROOT, 'index.html'), 'utf8').includes('data-mascot="2"')) {
    console.error(`e2e-game: ${ROOT}/ was built before lot F (first generation) — build it again`);
    process.exit(1);
  }
  const data = JSON.parse(readFileSync(join(ROOT, 'data', name), 'utf8')) as GameData;
  const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as Manifest;
  const state: ServerState = { failData: false, flags: null };
  if (ONLINE !== null) {
    if (!/^https:\/\/[a-z0-9.-]+$/.test(ONLINE)) {
      console.error('e2e-game: --origin takes the address of a host, in https');
      process.exit(1);
    }
    const online = ONLINE;
    await report((engine) => runEngine(engine, online, data, manifest, state));
    const left = [...LOCAL_ONLY].join(', ');
    console.log(`ONLINE on ${online}, with the game of ${ROOT}/ — left to the local run: ${left}`);
    return;
  }
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
  try {
    await report((engine) => runEngine(engine, origin, data, manifest, state));
  } finally {
    server.close();
  }
  if (ONLY !== null) {
    console.log(`PARTIAL RUN (--only ${ONLY.join(',')}): this is not the gate`);
    process.exitCode = process.exitCode === 1 ? 1 : 2;
  }
}

await main();
