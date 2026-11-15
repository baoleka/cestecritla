/**
 * « Où est-ce écrit ? » with the mascot of the second generation, once the script has the block
 * (D17.1 to D17.25; lot C of docs/discovery/PLAN-TORTUE.md).
 *
 * The game is the game of src/scripts/game.ts, which is not touched: the page arrives with the
 * first round in its HTML, playable with links alone; this script takes the block over when it
 * comes near the screen, fetches the published data of the game, and from then on builds one
 * screen at a time. Every rule is in src/lib/game-engine.ts. This file only draws, and listens.
 *
 * What it adds is her (src/lib/mascot2.ts says what she does, src/lib/game-goal.ts what is said
 * of her, src/scripts/game-store2.ts what is kept):
 *
 *   - ONE drawing in the block. The stylesheet moves her — beside the word while one plays, on
 *     a stage when a round ends (`data-stage` on the block); a script never moves or doubles
 *     her. Her sheet has its own copies, as before;
 *   - she never moves alone (D17.7). Five gestures get an answer: a word found (a small move,
 *     the same whatever was chosen), a hint asked (she looks at the tiles, then the tiles are
 *     marked), the end of a round (the three finds come to her), touching her (her figure, in
 *     her sheet), and « Revoir »;
 *   - a passage is played once, when it has just been earned — the end of a round, in the page
 *     where the gesture was made. A state that comes back from the tab, from the phone, from
 *     another tab or from the browser's own cache is drawn at once, and nothing is played;
 *   - a passage can be skipped: « Passer », a touch on the stage, Escape, or any button of the
 *     game — whose press reaches its target all the same. Nothing is modal;
 *   - with less motion asked, nothing starts: what she became is shown at once, with the
 *     sentence that says it, and no sentence announces a movement that does not happen.
 *
 * Nothing typed, chosen or found leaves the device: the one request is for a static file whose
 * address says nothing of the player. Everything put in the page is text or an attribute, never
 * markup: her copies are clones of the drawing the page arrived with.
 */
import { enhanceOfficialLinks } from './deep-links.ts';
import { el } from './engine.ts';
import { gameStore2 } from './game-store2.ts';
import { silenceReading } from './silence-now.ts';
import {
  ROUND,
  advance,
  begin,
  choose,
  current,
  draw,
  endOfRound,
  entryOf,
  foundNow,
  hintFor,
  isLongWord,
  judge,
  otherParts,
  placeOf,
  resume,
  tilesFor,
  type Ask,
  type GameData,
  type Play,
  type Standing,
  type Verdict,
} from '../lib/game-engine.ts';
import {
  GOAL_OF_STATE,
  lineAtRoundEnd,
  lineAtStart,
  nextRoundChangesHer,
  type GoalKey,
} from '../lib/game-goal.ts';
import type { TabState2 } from '../lib/game-state2.ts';
import {
  STATE_ARCS,
  applyMascotFrame,
  evolution,
  lookOf,
  pulse,
  trick,
  withoutMotion,
  type MascotFrame,
  type MascotLook,
  type MascotTint,
  type TurtleState,
} from '../lib/mascot2.ts';
import { formatReopenTimeFr } from '../lib/silence.ts';

interface Sentences {
  yes: string;
  also: string;
  neutral: string;
}
interface Config {
  data: string;
  strings: {
    kicker: string;
    ask: Record<Ask, string>;
    reveal: Record<Ask, Sentences>;
    dontKnow: string;
    hint: string;
    hintMark: string;
    hintSaid: string;
    also: string;
    alsoOne: string;
    count: string;
    cta: string;
    next: string;
    done: string;
    again: string;
    share: string;
    copied: string;
    depth: Record<string, string>;
    keep: {
      what: string;
      tint: string;
      notKept: string;
      otherwise: string;
      seen: string;
      safari: string;
      erase: string;
      cta: string;
      decline: string;
      done: string;
    };
    sheet: {
      name: string;
      none: string;
      onPhone: string;
      onPhoneTint: string;
      tabOnly: string;
      released: string;
      erased: string;
      replay: string;
      skip: string;
    };
    goal: Record<GoalKey, string>;
    /** By the state a passage leads to, by her state, by the colour: the keys of a JSON file. */
    passage: Record<string, string>;
    figure: Record<string, string>;
    tints: Record<string, string>;
  };
}

/** What the page holds of the game while it is open; what of it is written is the store's. */
interface Session extends Standing {
  seen: string[];
  play: Play;
  /** « Ne pas garder » was chosen in this tab. */
  declined: boolean;
  /** The colour the player gave her flamingo: 0 until one is chosen. */
  tint: MascotTint;
}

/** The parts of the block the script needs: without one of them, the round of the HTML stays. */
interface Block {
  block: HTMLElement;
  live: HTMLElement;
  fixed: HTMLElement;
  status: HTMLElement;
  drawing: Element;
  herBox: HTMLElement;
  herWith: HTMLElement;
  skip: HTMLButtonElement;
  sheetLink: HTMLButtonElement;
  tintLink: HTMLButtonElement;
  sheet: HTMLDialogElement;
  sheetHer: HTMLElement;
  sheetSaid: HTMLElement;
  sheetGoal: HTMLElement;
  sheetPath: HTMLElement;
  sheetTint: HTMLElement;
  sheetTints: HTMLElement;
  sheetFound: HTMLElement;
  sheetKept: HTMLElement;
  sheetKeep: HTMLButtonElement;
  sheetRelease: HTMLButtonElement;
  sheetErase: HTMLButtonElement;
}

/** The colours she can be given, in the order they are offered: six, then « sans couleur ». */
const TINTS = [1, 2, 3, 4, 5, 6, 7] as const;
/** How long she looks at the tiles before they are marked: the time her head takes to turn. */
const LOOKS_FOR_MS = 240;

/** Safari on iPhone and iPad forgets what a site wrote after seven days without a visit. */
const onIos = (): boolean =>
  /iPad|iPhone|iPod/.test(window.navigator.userAgent) ||
  (window.navigator.userAgent.includes('Macintosh') && window.navigator.maxTouchPoints > 1);

const fill = (template: string, values: Readonly<Record<string, string | number>>): string =>
  template.replace(/\{([a-zA-Z]+)\}/g, (_match, name: string) => String(values[name] ?? ''));

/** `[1, 3, 5]` → « 1, 3 et 5 ». */
const list = (items: readonly (string | number)[]): string =>
  items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} et ${String(items.at(-1))}`;

const lessMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- electoral silence (D16.16): the game is not shown, and no gesture of it does anything.
// Decided before the first paint by the guard in the <head>, on the device's clock; then here,
// with the hour of our own server — at arrival, at every change of screen, and whenever the tab
// is looked at again. Closed when in doubt (src/lib/silence.ts).
const silence = silenceReading();
const notice = document.querySelector<HTMLElement>('#game-silence');
const reopening = document.querySelector<HTMLElement>('#game-reopen');
/** Once the game has the block: what stops everything of hers when a freeze starts. */
let halt: (() => void) | null = null;

/** Shows or hides the game for what the calendar says now; true while it is frozen. */
function frozen(): boolean {
  const reading = silence.now();
  document.documentElement.toggleAttribute('data-silence', reading.silence);
  if (reopening !== null) {
    // The reason and the hour are said only of a freeze the calendar decided, on a clock that
    // can be believed: a clock our server contradicts, or a switch thrown by hand, has no hour
    // to announce — and an hour read on a wrong clock would be a false one.
    const byCalendar =
      reading.silence &&
      reading.override === 'auto' &&
      (reading.clockTrusted || reading.driftMs === null);
    reopening.textContent =
      byCalendar && reading.reopenUtc !== null
        ? `${notice?.dataset.reason ?? ''} ${fill(notice?.dataset.reopen ?? '', {
            reopenTime: formatReopenTimeFr(reading.reopenUtc),
          })}`
        : '';
  }
  if (reading.silence) {
    // A sheet left open would keep the page inert behind a block that is no longer shown; and
    // a passage under way stops there — on what she became, which is what she is.
    document.querySelector<HTMLDialogElement>('#turtle-sheet[open]')?.close();
    halt?.();
  }
  return reading.silence;
}
// A page left open across the start of a window: nobody touches it, so nothing asks. The
// calendar is looked at twice a minute — no network, the hour of our server ages by itself.
window.setInterval(frozen, 30_000);

/** One drawing of her, and what is being played on it. */
interface Stage {
  /** A look at once, without a movement: whatever was moving stops, and nothing follows. */
  settle(look: MascotLook): void;
  /** Frames, from the first; `then` once the last has been given — at once with less motion. */
  play(frames: readonly MascotFrame[], then?: () => void): void;
  /** « Passer »: the last frame at once, and what was to follow it. */
  skip(): void;
  /** Nothing more is given to her, and nothing follows: the drawing is being left. */
  stop(): void;
}

function stageOf(drawing: Element): Stage {
  let timers: number[] = [];
  /** The last frame of what is being played, and what follows it. */
  let last: MascotFrame | null = null;
  let after: (() => void) | null = null;
  const stop = (): void => {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
    last = null;
    after = null;
  };
  const settle = (look: MascotLook): void => {
    stop();
    // Not live: every transition under way is cut (src/styles/mascot2.css). The drawing is
    // read once, so that this look is drawn before she is live again — none of it moves.
    drawing.removeAttribute('data-live');
    applyMascotFrame(drawing, { ...look, at: 0, phase: null });
    void drawing.getBoundingClientRect();
    drawing.setAttribute('data-live', '');
  };
  const ended = (): void => {
    const then = after;
    stop();
    then?.();
  };
  return {
    settle,
    stop,
    play: (frames, then) => {
      stop();
      const given = lessMotion() ? withoutMotion(frames) : frames;
      const final = given.at(-1);
      if (final === undefined) return;
      last = final;
      after = then ?? null;
      for (const frame of given) {
        if (frame.at === 0) applyMascotFrame(drawing, frame);
        else {
          timers.push(
            window.setTimeout(() => {
              applyMascotFrame(drawing, frame);
              if (frame === final) ended();
            }, frame.at),
          );
        }
      }
      if (final.at === 0) ended();
    },
    skip: () => {
      if (last === null) return;
      const final = last;
      const then = after;
      settle(final);
      then?.();
    },
  };
}

function start(parts: Block, config: Config, data: GameData): void {
  const { block, live, fixed, status, drawing, herBox, herWith, tintLink, sheet } = parts;
  const { sheetHer, sheetSaid, sheetGoal, sheetPath, sheetTints, sheetFound, sheetKept } = parts;
  const { sheetKeep, sheetRelease, sheetErase } = parts;
  const s = config.strings;
  const her = stageOf(drawing);
  const store = gameStore2(data);
  /** The game as this tab and this phone remember it — an empty one for a first visit. */
  const remembered = (memory: TabState2): Session => ({
    seen: [...memory.seen],
    depth: memory.depth,
    state: memory.turtle,
    arcs: memory.arcs,
    tint: memory.tint,
    // A round found again short of its words (the list changed since) is not a round any more:
    // the end of it would say « trois mots » of fewer.
    play:
      memory.round === null || memory.round.words.length < Math.min(ROUND, data.words.length)
        ? begin(draw(data, memory.seen, memory.seen.at(-1) ?? null))
        : resume(memory.round.words, memory.round.at, memory.round.shown, memory.depth),
    declined: memory.declined,
  });
  const arrived = store.load();
  let session = remembered(arrived);
  /** A passage is being played on the stage: the sentence that says it waits for its end. */
  let evolving = false;
  /** The script has drawn its first screen: the block is its own from then on. */
  let taken = false;

  /** The session as the tab writes it: the round under way, never what was chosen in it. */
  const memory = (): TabState2 => ({
    corpus: data.corpus,
    seen: session.seen,
    depth: session.depth,
    turtle: session.state,
    arcs: session.arcs,
    tint: session.tint,
    round:
      session.play.screen.kind === 'end'
        ? null
        : {
            words: session.play.words,
            at: session.play.at,
            shown: session.play.screen.kind === 'place',
          },
    declined: session.declined,
  });

  /** Her look as the game has it now: her state, her arcs and the sign they give, her colour. */
  const look = (over: Partial<MascotLook> = {}): MascotLook =>
    lookOf({ state: session.state, arcs: session.arcs, tint: session.tint, ...over });
  const still = (over: Partial<MascotLook> = {}): MascotFrame => ({
    ...look(over),
    at: 0,
    phase: null,
  });
  /** She is a flamingo that was given no colour yet — and not « sans couleur » either. */
  const pale = (): boolean => session.state >= 2 && session.tint === 0;
  /**
   * Her look as the game has it now, at once and without a movement — for what was not done
   * here (another tab found, kept or erased something; the page came back from the browser's
   * cache). A passage under way ends there, on its sentence.
   */
  function follow(): void {
    if (evolving) her.skip();
    her.settle(look());
    tintLink.hidden = !pale();
    if (sheet.open) fillSheet();
  }

  function button(text: string, className: string, onPress: () => void): HTMLButtonElement {
    const node = el('button', text, className);
    node.type = 'button';
    node.addEventListener('click', onPress);
    return node;
  }
  function titled<K extends 'li' | 'span'>(tag: K, title: string): HTMLElementTagNameMap[K] {
    const node = el(tag, title);
    node.dataset.programme = 'title';
    return node;
  }
  /** A copy of her for her sheet: the drawing of the page, with a look of its own, not live. */
  function copyOf(given: MascotLook): Element {
    const copy = drawing.cloneNode(true) as Element;
    copy.removeAttribute('data-live');
    applyMascotFrame(copy, { ...given, at: 0, phase: null });
    return copy;
  }

  /** What a choice meant, as the sentence the kit has for it — affirmative, whatever it was. */
  function sentence(wordId: string, ask: Ask, verdict: Verdict | null): string {
    const place = placeOf(data, wordId);
    const form = verdict === 'here' ? 'yes' : verdict === 'also' ? 'also' : 'neutral';
    const n = ask === 'part' ? place?.part.number : place?.chapter.number;
    return fill(s.reveal[ask][form], { n: n ?? '' });
  }

  function show(panel: HTMLElement, heading: HTMLElement, focus: boolean): void {
    heading.tabIndex = -1;
    live.replaceChildren(panel);
    status.textContent = '';
    if (focus) heading.focus();
  }

  function act(next: Play): void {
    // A freeze that starts while the page is open: the gesture does nothing, the block leaves.
    if (frozen()) return;
    if (next === session.play) return;
    session.play = next;
    const found = foundNow(next);
    if (found !== null && !session.seen.includes(found)) session.seen.push(found);
    const drawn = render(true);
    // The card of a place: a word is found, and she makes her small move — the same whatever
    // was chosen. A question: she is as the game has her (a pose is kept until the next
    // gesture: this is it). The end of a round is hers already.
    if (drawn === 'place') her.play(pulse(look()));
    else if (drawn === 'ask') her.play([still()]);
    store.save(memory());
  }

  /** The word of the programme, marked as one — and one step smaller when it is long. */
  function theWord(word: string): HTMLElement {
    const shown = el('p', word, 'g-the-word');
    shown.dataset.programme = 'word';
    if (isLongWord(word)) shown.dataset.long = '';
    return shown;
  }
  /**
   * The top of a screen where a word is shown — and, before a first word is found, her goal.
   * The page arrived with the room of that sentence (src/components/Game2.astro): the screen
   * the script takes the block with keeps that room even when she is past it, so that nothing
   * moves at that moment; the first gesture gives the room back.
   */
  function wordPanel(word: string): HTMLElement {
    const panel = el('div', undefined, 'g-word');
    const goal = lineAtStart(session.state);
    if (goal !== null || !taken) {
      const line = el('p', s.goal[goal ?? 'start'], 'g-goal');
      if (goal === null) line.setAttribute('data-wait', '');
      panel.append(line);
    }
    panel.append(el('p', s.kicker, 'g-kicker'), theWord(word));
    return panel;
  }

  function renderAsk(wordId: string, word: string, focus: boolean): void {
    if (session.play.screen.kind !== 'ask') return;
    const { ask, said } = session.play.screen;
    const panel = wordPanel(word);
    if (said !== null) panel.append(el('p', sentence(wordId, said.ask, said.verdict), 'g-said'));

    const heading = el('h3', s.ask[ask], 'g-ask');
    const gestures = el('p', undefined, 'g-with');
    gestures.append(
      button(s.dontKnow, 'g-quiet', () => {
        act(choose(data, session.play, session.depth, null));
      }),
    );
    const tiles = el('ul', undefined, 'g-tiles');
    for (const tile of tilesFor(data, wordId, ask)) {
      const item = el('li');
      const press = button('', 'g-tile', () => {
        act(choose(data, session.play, session.depth, tile.id));
      });
      press.dataset.tile = tile.id;
      press.append(titled('span', tile.title));
      item.append(press);
      tiles.append(item);
    }
    // The hint comes from her: she looks down at the tiles, then three of them say so in
    // words. No tile is ruled out. Less motion asked: the tiles are marked at once and the
    // sentence is said all the same; she does not move.
    const hinted = hintFor(data, wordId, session.depth, ask);
    if (hinted.length > 0) {
      const hint = button(s.hint, 'g-quiet', () => {
        hint.remove();
        status.textContent = fill(s.hintSaid, { parts: list(hinted) });
        const mark = (): void => {
          for (const press of tiles.querySelectorAll<HTMLElement>('.g-tile')) {
            if (hinted.includes(press.dataset.tile ?? ''))
              press.append(el('span', s.hintMark, 'g-mark'));
          }
        };
        // Less motion: her pose is fixed — not even a head that is found turned.
        if (lessMotion()) {
          mark();
          return;
        }
        const looking = still({ pose: 'look' });
        her.play([looking, { ...looking, at: LOOKS_FOR_MS }], mark);
      });
      gestures.append(hint);
    }
    const question = el('div', undefined, 'g-question');
    question.append(heading, gestures, tiles);
    panel.append(question);
    show(panel, heading, focus);
  }

  function renderPlace(wordId: string, word: string, focus: boolean): void {
    if (session.play.screen.kind !== 'place') return;
    const entry = entryOf(data, wordId);
    const place = placeOf(data, wordId);
    if (entry === null || place === null) return;
    const panel = wordPanel(word);

    const card = el('div', undefined, 'g-place');
    const heading = el(
      'h3',
      sentence(wordId, session.play.screen.ask, session.play.screen.verdict),
    );
    const where = el('ul', undefined, 'g-where');
    where.append(
      titled('li', place.part.title),
      titled('li', place.chapter.title),
      titled('li', place.section.title),
    );
    card.append(heading, where);
    const also = otherParts(data, wordId);
    if (also.length === 1) card.append(el('p', fill(s.alsoOne, { n: also[0] ?? '' })));
    if (also.length > 1) card.append(el('p', fill(s.also, { parts: list(also) })));
    // A count only when it says something: from three sections on.
    if (entry.places.length >= 3) {
      card.append(el('p', fill(s.count, { count: entry.places.length })));
    }
    const there = el('a', s.cta, 'cta');
    there.href = entry.url;
    there.rel = 'noopener noreferrer';
    if (entry.fragment !== '') there.dataset.fragment = entry.fragment;
    const actions = el('p', undefined, 'g-actions');
    actions.append(
      there,
      button(s.next, 'g-quiet', () => {
        act(advance(session.play));
      }),
    );
    card.append(actions);
    enhanceOfficialLinks(card);
    panel.append(card);
    show(panel, heading, focus);
  }

  /**
   * The end of a round: the only moment the depth of the game and she change. `earned`: the
   * gesture that ended the round was made here, now — the one case where anything is played.
   */
  function renderEnd(earned: boolean): void {
    const before: Standing = { depth: session.depth, state: session.state, arcs: session.arcs };
    const end = endOfRound(data, before, session.seen);
    session.depth = end.depth;
    session.state = end.state;
    session.arcs = end.arcs;
    const last = session.play.words.at(-1) ?? null;

    const panel = el('div', undefined, 'g-end');
    const heading = el('h3', s.done);
    // One line about her, two sentences at most: what has just happened to her, and her goal
    // — in words, never a number (D17.5). Nothing in it is about the player.
    const line = lineAtRoundEnd(end, nextRoundChangesHer(data, end, session.seen, last));
    const passed = line.passage === null ? '' : (s.passage[String(line.passage)] ?? '');
    const goal = line.goal === null ? '' : s.goal[line.goal];
    const about = el('p', undefined, 'g-line');
    if (passed !== '') about.append(el('span', passed, 'g-passage'));
    if (passed !== '' && goal !== '') about.append(' ');
    if (goal !== '') about.append(el('span', goal));
    panel.append(heading, about);
    const deeper = end.opened === null ? undefined : s.depth[String(end.opened)];
    if (deeper !== undefined) panel.append(el('p', deeper));
    const again = button(s.again, '', () => {
      act(begin(draw(data, session.seen, last)));
    });
    // « Garder ta tortue »: asked here, in the page, until answered — two gestures of the same
    // weight, and every consequence said before either. Nothing is on the phone before « Garder ».
    if (!store.kept() && !session.declined) {
      const card = el('div', undefined, 'g-keep');
      const lines = [`${s.keep.what} ${s.keep.tint}`, s.keep.notKept, s.keep.otherwise];
      for (const text of [...lines, s.keep.seen]) card.append(el('p', text));
      if (onIos()) card.append(el('p', s.keep.safari));
      // How to take it back, said before the gesture: none of the seven personas could say how
      // to erase from this card — the button lives in her sheet (session of 14/11/2026).
      card.append(el('p', s.keep.erase));
      const choice = el('p', undefined, 'g-actions');
      const answered = (said: string): void => {
        card.remove();
        status.textContent = said;
        again.focus();
      };
      choice.append(
        button(s.keep.cta, 'g-quiet', () => {
          if (frozen()) return;
          store.keep(memory());
          answered(s.keep.done);
        }),
        button(s.keep.decline, 'g-quiet', () => {
          session.declined = true;
          store.save(memory());
          answered('');
        }),
      );
      card.append(choice);
      panel.append(card);
    }
    const actions = el('p', undefined, 'g-actions');
    actions.append(again);
    // « Envoyer le lien du jeu » (D16.17, D17.10): the bare address of the site, and nothing
    // else — no text, no word, no answer, nothing of her, not her colour. Where the phone has
    // no share sheet the address is copied; where it can do neither, the button is not there.
    const address = `${window.location.origin}/`;
    const canShare = typeof window.navigator.share === 'function';
    // The clipboard exists only on a secure origin: absent, the property is simply not there.
    const canCopy = 'clipboard' in window.navigator;
    if (canShare || canCopy) {
      actions.append(
        button(s.share, 'g-quiet', () => {
          // Sharing is one of the three things a freeze silences: checked at the gesture.
          if (frozen()) return;
          const sent = canShare
            ? window.navigator.share({ url: address })
            : window.navigator.clipboard.writeText(address).then(() => {
                status.textContent = s.copied;
              });
          // Dismissed, or refused by the browser: nothing happened, nothing is said.
          sent.catch(() => undefined);
        }),
      );
    }
    panel.append(actions);
    show(panel, heading, earned);

    tintLink.hidden = !pale();
    if (!earned) {
      her.settle(look());
      return;
    }
    const frames = evolution(
      { state: before.state, arcs: before.arcs, tint: session.tint },
      { state: end.state, arcs: end.arcs, tint: session.tint },
    );
    // A passage that is played — one state to the next, with motion: what is said of it waits
    // for its end, in the room it already has, and « Passer » is there until then.
    evolving = end.passage && frames.length > 2 && !lessMotion();
    if (evolving) {
      about.setAttribute('data-wait', '');
      tintLink.setAttribute('data-wait', '');
      parts.sheetLink.setAttribute('data-wait', '');
      parts.skip.removeAttribute('data-wait');
    }
    her.play(frames, () => {
      if (evolving) {
        evolving = false;
        about.removeAttribute('data-wait');
        tintLink.removeAttribute('data-wait');
        parts.sheetLink.removeAttribute('data-wait');
        // « Passer » leaves: a focus left on it goes back to the sentence of this screen.
        const held = document.activeElement === parts.skip;
        parts.skip.setAttribute('data-wait', '');
        if (held) heading.focus();
      }
      // To who cannot see it, a passage is its sentence — said when it can be seen.
      if (passed !== '') status.textContent = goal === '' ? passed : `${passed} ${goal}`;
    });
    // She is at the top of the panel: brought into view if the page was scrolled past her.
    herBox.scrollIntoView({ block: 'nearest' });
  }

  /** Draws the screen the game is on, and says which: a question, a card, the end of a round. */
  function render(gesture: boolean): 'ask' | 'place' | 'end' {
    const wordId = current(session.play);
    const entry = wordId === null ? null : entryOf(data, wordId);
    const kind = wordId === null || entry === null ? 'end' : session.play.screen.kind;
    const drawn = kind === 'ask' || kind === 'place' ? kind : 'end';
    // Where she stands: on the stage at the end of a round, beside the word otherwise.
    block.toggleAttribute('data-stage', drawn === 'end');
    herWith.hidden = drawn !== 'end';
    if (wordId === null || entry === null) renderEnd(gesture);
    else if (drawn === 'ask') renderAsk(wordId, entry.word, gesture);
    else renderPlace(wordId, entry.word, gesture);
    return drawn;
  }

  // --- her sheet (D16.13, D17.3, D17.8). Touching her opens it and she does her figure in it,
  // large; « Sa fiche » opens it too. Whoever asked for less motion gets the sheet and no
  // movement — and no sentence about a movement that does not happen.

  /** The large copy of her in the sheet; and the « Revoir » whose passage is being played. */
  let large: Stage | null = null;
  let replaying: HTMLButtonElement | null = null;

  /** Where a section stands in the book, among the tiles: the order her finds are listed in. */
  const position = new Map<string, number>();
  for (const part of data.parts) {
    for (const chapter of part.chapters) {
      for (const section of chapter.sections) position.set(section.id, position.size);
    }
  }

  /** Her figure, on the large copy: from as she is now, whatever the copy was showing. */
  function figure(): void {
    if (large === null || lessMotion()) return;
    large.settle(look());
    sheetSaid.textContent = s.figure[String(session.state)] ?? '';
    large.play(trick(look()));
  }

  function fillHer(): void {
    large?.stop();
    replaying = null;
    const copy = copyOf(look());
    const stage = stageOf(copy);
    large = stage;
    const touch = button('', 'g-press', () => {
      // While a passage is seen again, a touch is « Passer ».
      if (replaying !== null) stage.skip();
      else figure();
    });
    touch.setAttribute('aria-label', s.sheet.name);
    touch.append(copy);
    sheetHer.replaceChildren(touch);
    sheetSaid.textContent = '';
  }

  /** What will make her change — or, at the end of a round, that the next one will. */
  function goalNow(): GoalKey {
    const last = session.play.words.at(-1) ?? null;
    return session.play.screen.kind === 'end' &&
      nextRoundChangesHer(data, session, session.seen, last)
      ? 'next'
      : GOAL_OF_STATE[session.state];
  }

  /** « Revoir »: a passage she has made, on the large copy — and « Passer », on the same button. */
  function replay(to: TurtleState, control: HTMLButtonElement): void {
    const stage = large;
    if (stage === null || to === 0) return;
    const mine = replaying === control;
    if (replaying !== null) stage.skip();
    if (mine) return;
    const from = (to - 1) as TurtleState;
    const before = { state: from, arcs: STATE_ARCS[from], tint: session.tint };
    stage.settle(lookOf(before));
    replaying = control;
    control.textContent = s.sheet.skip;
    sheetSaid.textContent = '';
    sheetHer.scrollIntoView({ block: 'nearest' });
    stage.play(evolution(before, { state: to, arcs: STATE_ARCS[to], tint: session.tint }), () => {
      replaying = null;
      control.textContent = s.sheet.replay;
      sheetSaid.textContent = s.passage[String(to)] ?? '';
    });
  }

  /**
   * « Son parcours »: the forms she has had, small, in the order she had them — never one to
   * come. Each passage has its sentence and, unless less motion was asked, « Revoir ».
   */
  function fillPath(): void {
    const items: HTMLElement[] = [];
    for (const state of [0, 1, 2, 3, 4] as const) {
      if (state > session.state) break;
      const item = el('li');
      item.append(copyOf(lookOf({ state, tint: session.tint })));
      const said = s.passage[String(state)];
      if (said === undefined) {
        // The turtle she started as: a drawing and no sentence — nothing there to be read.
        item.setAttribute('aria-hidden', 'true');
      } else {
        const about = el('p', said);
        about.id = `turtle-path-${String(state)}`;
        item.append(about);
        if (!lessMotion()) {
          const again = button(s.sheet.replay, 'g-quiet', () => {
            replay(state, again);
          });
          again.setAttribute('aria-describedby', about.id);
          item.append(again);
        }
      }
      items.push(item);
    }
    sheetPath.replaceChildren(...items);
  }

  /** « Sa couleur » (D17.3): hers to give once she is a flamingo, and to change or take back. */
  function give(tint: MascotTint): void {
    if (frozen()) return;
    session.tint = tint;
    store.tint(memory());
    her.settle(look());
    if (replaying !== null) large?.skip();
    large?.settle(look());
    for (const choice of sheetTints.querySelectorAll('button')) {
      choice.setAttribute('aria-pressed', String(choice.dataset.tint === String(tint)));
    }
    for (const copy of sheetPath.querySelectorAll('.mascot')) {
      copy.setAttribute('data-tint', String(tint));
    }
    tintLink.hidden = true;
    fillKept();
  }
  function fillTints(): void {
    parts.sheetTint.hidden = session.state < 2;
    if (session.state < 2) {
      sheetTints.replaceChildren();
      return;
    }
    // Each colour is shown on a small flamingo — the one place a colour of the book may be
    // (D17.12) — and named by its own name, never by a part (D17.23).
    sheetTints.replaceChildren(
      ...TINTS.map((tint) => {
        const choice = button('', 'g-quiet t-tint', () => {
          give(tint);
        });
        choice.dataset.tint = String(tint);
        choice.setAttribute('aria-pressed', String(session.tint === tint));
        const swatch = el('span', undefined, 't-swatch');
        swatch.append(copyOf(lookOf({ state: 2, tint })));
        choice.append(swatch, el('span', s.tints[String(tint)] ?? ''));
        const item = el('li');
        item.append(choice);
        return item;
      }),
    );
  }

  /**
   * What she has found — the words, and from the third depth where each is written, in the
   * order of the book. Never a total: nothing here says what is left.
   */
  function fillFound(): void {
    const entries = session.seen.flatMap((id) => {
      const entry = entryOf(data, id);
      return entry === null ? [] : [entry];
    });
    if (entries.length === 0) {
      sheetFound.replaceChildren(el('p', s.sheet.none));
      return;
    }
    const byPlace = session.depth >= 3;
    const items = el('ul', undefined, byPlace ? 't-found t-by-place' : 't-found');
    if (byPlace) {
      entries.sort((a, b) => (position.get(a.section) ?? 0) - (position.get(b.section) ?? 0));
    }
    for (const entry of entries) {
      const item = el('li');
      const word = el('span', entry.word);
      word.dataset.programme = 'word';
      item.append(word);
      const place = byPlace ? placeOf(data, entry.id) : null;
      if (place !== null) {
        const there = el('a');
        there.href = entry.url;
        there.rel = 'noopener noreferrer';
        if (entry.fragment !== '') there.dataset.fragment = entry.fragment;
        there.append(titled('span', place.section.title));
        item.append(' — ', there);
      }
      items.append(item);
    }
    enhanceOfficialLinks(items);
    sheetFound.replaceChildren(items);
  }

  /**
   * What is kept — and, while nothing is on the phone, what « Garder ta tortue » would write
   * there and who would see it: the same sentences as the card, before the same gesture. Her
   * colour is named where it is kept, and only once she has one.
   */
  function fillKept(): void {
    const kept = store.kept();
    const lines = kept
      ? [session.tint === 0 ? s.sheet.onPhone : `${s.sheet.onPhone} ${s.sheet.onPhoneTint}`]
      : [
          s.sheet.tabOnly,
          `${s.keep.what} ${s.keep.tint}`,
          s.keep.notKept,
          s.keep.seen,
          ...(onIos() ? [s.keep.safari] : []),
        ];
    sheetKept.replaceChildren(...lines.map((text) => el('p', text)));
    sheetKeep.hidden = kept || session.seen.length === 0;
    // What was asked of the phone can be taken back as simply as it was asked.
    sheetRelease.hidden = !kept;
  }

  function fillSheet(): void {
    fillHer();
    sheetGoal.textContent = s.goal[goalNow()];
    fillPath();
    fillTints();
    fillFound();
    fillKept();
  }

  /** `touched`: she does her figure; `toTint`: the sheet opens on the choice of her colour. */
  function openSheet(touched: boolean, toTint = false): void {
    if (frozen()) return;
    fillSheet();
    sheet.showModal();
    if (toTint) sheetTints.querySelector('button')?.focus();
    if (touched) figure();
  }

  const press = button('', 'g-press', () => {
    openSheet(true);
  });
  press.setAttribute('aria-label', s.sheet.name);
  press.setAttribute('aria-haspopup', 'dialog');
  drawing.replaceWith(press);
  press.append(drawing);
  parts.sheetLink.addEventListener('click', () => {
    openSheet(false);
  });
  tintLink.addEventListener('click', () => {
    openSheet(false, true);
  });
  // A passage is skipped by « Passer », by a touch on the stage, by Escape, or by any button or
  // link of the game — whose press then goes on to do what it does: nothing holds the finger.
  // Heard before the target hears it; « Passer » and the stage do nothing more than that.
  block.addEventListener(
    'click',
    (event) => {
      if (!evolving || !(event.target instanceof Element)) return;
      if (event.target.closest('button, a') === null) return;
      her.skip();
      if (event.target.closest('#game-her, #game-skip') !== null) event.stopPropagation();
    },
    true,
  );
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && evolving) her.skip();
  });
  // Whatever is being played ends at once, on what it leads to and with its sentence, when it
  // can no longer be watched or was no longer asked for: a freeze that starts, a tab that is
  // left (its timers would give her the rest in one burst on the way back), less motion asked
  // for meanwhile.
  const cutShort = (): void => {
    if (evolving) her.skip();
    if (replaying !== null) large?.skip();
  };
  halt = cutShort;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') cutShort();
  });
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', cutShort);
  // A sheet that closes takes her copies with it: nothing goes on playing where nobody looks.
  sheet.addEventListener('close', () => {
    large?.stop();
    large = null;
    replaying = null;
  });
  sheetKeep.addEventListener('click', () => {
    if (frozen()) return;
    store.keep(memory());
    fillKept();
    sheetSaid.textContent = s.keep.done;
    // The button that had the focus is gone: the one that undoes it takes its place.
    sheetRelease.focus();
  });
  // « Ne plus garder sur ce téléphone »: the phone forgets, the game goes on in this tab.
  sheetRelease.addEventListener('click', () => {
    store.release();
    fillKept();
    sheetSaid.textContent = s.sheet.released;
    // The button that had the focus is gone: the one that takes its place receives it.
    (sheetKeep.hidden ? sheetErase : sheetKeep).focus();
  });
  // « Tout effacer »: the tab and the phone, and the game starts again from nothing.
  sheetErase.addEventListener('click', () => {
    store.erase();
    session = remembered(store.load());
    render(false);
    follow();
    sheetSaid.textContent = s.sheet.erased;
  });

  // Someone already playing the round of the HTML goes on from where they are: the anchor says
  // which word and which tile, and the script draws the same screen. An anchor is a position,
  // never a past: it marks no word as found but the one whose card is on screen — and « #fin »,
  // which shows no word at all, is simply forgotten. (A link is something anyone can send:
  // followed, it must not write a game nobody played, nor move a turtle someone kept.)
  const anchor = /^#m([1-3])(?:-([0-6]))?$/.exec(window.location.hash);
  if (anchor !== null || window.location.hash === '#fin') {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  }
  if (anchor !== null && arrived.seen.length === 0) {
    const drawn = session.play.words;
    const wordId = drawn[Math.min(Number(anchor[1]) - 1, drawn.length - 1)];
    const tile = anchor[2];
    if (wordId !== undefined) {
      // The word of the anchor heads a whole round: its end must be able to say « trois mots ».
      const words = [wordId, ...drawn.filter((id) => id !== wordId)];
      if (tile === undefined) {
        session.play = { words, at: 0, screen: { kind: 'ask', ask: 'part', said: null } };
      } else {
        const verdict = tile === '0' ? null : judge(data, wordId, 'part', tile);
        session.play = { words, at: 0, screen: { kind: 'place', ask: 'part', verdict } };
        session.seen = [wordId];
      }
    }
  }

  fixed.hidden = true;
  live.hidden = false;
  render(false);
  taken = true;
  // The look she arrives with is drawn at once: from then on what she does is a movement.
  her.settle(look());
  // Nothing is written here: arriving — by a link, in a new tab — is not a gesture of the game.
  // The tab is written at the first gesture that follows (`act`).

  // The page comes back from the browser's own cache (« précédent ») with what it remembered
  // when it was left: what the tab and the phone hold now is read again — « Tout effacer »
  // may have been pressed on another page in between.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    if (evolving) her.skip();
    session = remembered(store.load());
    sheet.close();
    render(false);
    follow();
  });
  // Another tab of this phone kept something, gave her a colour, stopped keeping, or erased
  // everything: this one follows, without a movement — nothing was done here.
  store.watch(memory, {
    kept: (merged) => {
      session = { ...remembered(merged), play: session.play };
      follow();
    },
    // The game of this tab is untouched; only what her sheet says of the phone has changed.
    released: () => {
      if (sheet.open) fillKept();
    },
    erased: () => {
      if (evolving) her.skip();
      session = remembered(store.load());
      render(false);
      follow();
    },
  });
}

/** Everything of the block the script needs, or null: the round of the HTML then goes on. */
function blockParts(): Block | null {
  const found = {
    block: document.querySelector<HTMLElement>('#jeu'),
    live: document.querySelector<HTMLElement>('#game-live'),
    fixed: document.querySelector<HTMLElement>('#game-static'),
    status: document.querySelector<HTMLElement>('#game-status'),
    drawing: document.querySelector('#game-her svg.mascot'),
    herBox: document.querySelector<HTMLElement>('#game-her'),
    herWith: document.querySelector<HTMLElement>('#game-her-with'),
    skip: document.querySelector<HTMLButtonElement>('#game-skip'),
    sheetLink: document.querySelector<HTMLButtonElement>('#game-sheet-link'),
    tintLink: document.querySelector<HTMLButtonElement>('#game-tint-link'),
    sheet: document.querySelector<HTMLDialogElement>('#turtle-sheet'),
    sheetHer: document.querySelector<HTMLElement>('#turtle-sheet-her'),
    sheetSaid: document.querySelector<HTMLElement>('#turtle-sheet-said'),
    sheetGoal: document.querySelector<HTMLElement>('#turtle-sheet-goal'),
    sheetPath: document.querySelector<HTMLElement>('#turtle-sheet-path'),
    sheetTint: document.querySelector<HTMLElement>('#turtle-sheet-tint'),
    sheetTints: document.querySelector<HTMLElement>('#turtle-sheet-tints'),
    sheetFound: document.querySelector<HTMLElement>('#turtle-sheet-found'),
    sheetKept: document.querySelector<HTMLElement>('#turtle-sheet-kept'),
    sheetKeep: document.querySelector<HTMLButtonElement>('#turtle-sheet-keep'),
    sheetRelease: document.querySelector<HTMLButtonElement>('#turtle-sheet-release'),
    sheetErase: document.querySelector<HTMLButtonElement>('#turtle-sheet-erase'),
  };
  return Object.values(found).every((part) => part !== null) ? (found as Block) : null;
}

const parts = blockParts();
const raw = document.querySelector('#game-config')?.textContent;

if (parts !== null && raw != null) {
  const { block } = parts;
  const config = JSON.parse(raw) as Config;
  let asked = false;
  const open = (): void => {
    if (asked) return;
    asked = true;
    silence
      .refresh()
      .then(() => {
        // Frozen: nothing is fetched and nothing is drawn. The tab may be looked at again later.
        if (frozen()) {
          asked = false;
          return null;
        }
        return fetch(config.data).then((response) =>
          response.ok ? (response.json() as Promise<GameData>) : null,
        );
      })
      .then((data) => {
        if (data !== null && data.words.length > 0) start(parts, config, data);
      })
      // No data, no takeover: the round of the HTML goes on working by itself.
      .catch(() => undefined);
  };
  // The guard of the <head> has already hidden the game, on the device's clock alone: a block
  // that is not displayed never comes "near the screen", so the hour of our server is asked for
  // now — to say when everything comes back, or to open again for a clock that was wrong.
  if (document.documentElement.hasAttribute('data-silence')) {
    void silence.refresh().then(() => {
      if (!frozen()) open();
    });
  }
  // The tab is looked at again: the hour is asked again. A freeze that began meanwhile closes
  // the game; one that ended opens it.
  const lookedAtAgain = (): void => {
    // What is already known closes at once; the network is asked after, never waited for.
    frozen();
    void silence.refresh().then(() => {
      if (!frozen()) open();
    });
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') lookedAtAgain();
  });
  window.addEventListener('pageshow', lookedAtAgain);
  // Near the screen, or touched: not before — who only came to ask or to search fetches nothing.
  if ('IntersectionObserver' in window) {
    const watcher = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        watcher.disconnect();
        open();
      },
      { rootMargin: '100% 0px' },
    );
    watcher.observe(block);
  } else {
    open();
  }
  block.addEventListener('focusin', open, { once: true });
}
