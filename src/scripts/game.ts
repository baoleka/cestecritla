/**
 * « Où est-ce écrit ? », once the script has the block (D16.10, D16.12; lot L2).
 *
 * The page arrives with the first round in its HTML, playable with links alone. This script
 * takes the block over when it comes near the screen: it fetches the published data of the game
 * (the words, where each is written, the titles of the tiles — no sentence of the book), and
 * from then on builds one screen at a time: a question, the card of the place, the end of a
 * round. If the data cannot be had, nothing changes: the round in the HTML goes on working.
 *
 * Every rule is in src/lib/game-engine.ts — what is asked, what a choice means, what the end of
 * a round changes. This file only draws, and listens.
 *
 * Nothing typed, chosen or found leaves the device: the one request is for a static file whose
 * address says nothing of the player. Everything put in the page is text, never markup.
 *
 * The focus goes to the sentence that answers a gesture — the next question, the card, the end
 * of the round — and never moves when the script arrives by itself.
 */
import { enhanceOfficialLinks } from './deep-links.ts';
import { el } from './engine.ts';
import { gameStore } from './game-store.ts';
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
import type { TabState } from '../lib/game-state.ts';
import { formatReopenTimeFr } from '../lib/silence.ts';
import {
  applyLook,
  evolution,
  withoutMotion,
  type TurtleFrame,
  type TurtleLook,
} from '../lib/turtle.ts';

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
    /** The lait-fraise line; empty while the editor has not confirmed it. */
    easter: string;
    depth: Record<string, string>;
    keep: {
      what: string;
      notKept: string;
      otherwise: string;
      seen: string;
      safari: string;
      cta: string;
      decline: string;
      done: string;
    };
    sheet: {
      name: string;
      raises: string;
      none: string;
      onPhone: string;
      tabOnly: string;
      released: string;
      erased: string;
    };
  };
}

/** What the page holds of the game while it is open; what of it is written is game-store's. */
interface Session extends Standing {
  seen: string[];
  play: Play;
  /** « Ne pas garder » was chosen in this tab. */
  declined: boolean;
}

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
  // A sheet left open would keep the page inert behind a block that is no longer shown.
  if (reading.silence) document.querySelector<HTMLDialogElement>('#turtle-sheet[open]')?.close();
  return reading.silence;
}
// A page left open across the start of a window: nobody touches it, so nothing asks. The
// calendar is looked at twice a minute — no network, the hour of our server ages by itself.
window.setInterval(frozen, 30_000);

function start(
  block: HTMLElement,
  live: HTMLElement,
  fixed: HTMLElement,
  status: HTMLElement,
  config: Config,
  data: GameData,
): void {
  const s = config.strings;
  const turtle = block.querySelector('svg.turtle');
  const store = gameStore(data);
  /** The game as this tab and this phone remember it — an empty one for a first visit. */
  const remembered = (memory: TabState): Session => ({
    seen: [...memory.seen],
    depth: memory.depth,
    state: memory.turtle,
    arcs: memory.arcs,
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
  let timers: number[] = [];
  /** She is holding a pose — head raised, or looking at the tiles — until the next gesture. */
  let posed = false;

  /** The session as the tab writes it: the round under way, never what was chosen in it. */
  const memory = (): TabState => ({
    corpus: data.corpus,
    seen: session.seen,
    depth: session.depth,
    turtle: session.state,
    arcs: session.arcs,
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

  /** Gives her a look now, or frame by frame; a new gesture always replaces the one before. */
  function turtleFrames(frames: readonly TurtleFrame[]): void {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
    if (turtle === null) return;
    for (const frame of lessMotion() ? withoutMotion(frames) : frames) {
      if (frame.at === 0) applyLook(turtle, frame);
      else timers.push(window.setTimeout(applyLook, frame.at, turtle, frame));
    }
  }
  const look = (over: Partial<TurtleLook> = {}): TurtleLook => ({
    state: session.state,
    arcs: session.arcs,
    pose: 'rest',
    passage: false,
    ...over,
  });
  /**
   * Her look as the game has it now, at once and without a movement — for what was not done
   * here (another tab found or erased something). The frames still waiting are dropped first:
   * a tab in the background is given its timers late, and an old frame arriving after a newer
   * look would take her back (found on 13/11/2026 by the two-tab check, under Chromium).
   */
  function settle(): void {
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
    if (turtle === null) return;
    turtle.removeAttribute('data-live');
    applyLook(turtle, look());
    window.requestAnimationFrame(() => {
      turtle.setAttribute('data-live', '');
    });
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
    // A pose is kept until the next gesture: this is it.
    if (posed) {
      posed = false;
      turtleFrames([{ ...look(), at: 0 }]);
    }
    session.play = next;
    const found = foundNow(next);
    if (found !== null && !session.seen.includes(found)) session.seen.push(found);
    render(true);
    store.save(memory());
  }

  function renderAsk(wordId: string, word: string, focus: boolean): void {
    if (session.play.screen.kind !== 'ask') return;
    const { ask, said } = session.play.screen;
    const panel = el('div', undefined, 'g-word');
    const shown = el('p', word, 'g-the-word');
    shown.dataset.programme = 'word';
    panel.append(el('p', s.kicker, 'g-kicker'), shown);
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
    // The hint: she looks at three tiles, and each says so in words. No tile is ruled out.
    const hinted = hintFor(data, wordId, session.depth, ask);
    if (hinted.length > 0) {
      const hint = button(s.hint, 'g-quiet', () => {
        for (const press of tiles.querySelectorAll<HTMLElement>('.g-tile')) {
          if (hinted.includes(press.dataset.tile ?? ''))
            press.append(el('span', s.hintMark, 'g-mark'));
        }
        hint.remove();
        status.textContent = fill(s.hintSaid, { parts: list(hinted) });
        // She looks down at the tiles, and keeps looking until a tile is chosen. Less motion
        // asked: the tiles are marked and the sentence is said all the same; she does not move.
        if (!lessMotion()) {
          posed = true;
          turtleFrames([{ ...look({ pose: 'look' }), at: 0 }]);
        }
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
    const panel = el('div', undefined, 'g-word');
    const shown = el('p', word, 'g-the-word');
    shown.dataset.programme = 'word';
    panel.append(el('p', s.kicker, 'g-kicker'), shown);

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
    there.rel = 'noopener';
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

  /** The end of a round: the only moment the depth of the game and the turtle change. */
  function renderEnd(focus: boolean): void {
    const before: Standing = { depth: session.depth, state: session.state, arcs: session.arcs };
    const end = endOfRound(data, before, session.seen);
    session.depth = end.depth;
    session.state = end.state;
    session.arcs = end.arcs;
    const last = session.play.words.at(-1) ?? null;

    const panel = el('div', undefined, 'g-end');
    const heading = el('h3', s.done);
    panel.append(heading);
    const deeper = end.opened === null ? undefined : s.depth[String(end.opened)];
    if (deeper !== undefined) panel.append(el('p', deeper));
    // Lait-fraise (D16.20): one line of text among the sentences of the end of a round, when
    // she passes to her second, third or fourth state — three times at most in a whole game.
    // Words and two emojis: never a drawing, and never against hers.
    if (s.easter !== '' && end.passage && end.state >= 2) {
      panel.append(el('p', s.easter, 'g-easter'));
    }
    const again = button(s.again, '', () => {
      turtleFrames([{ ...look(), at: 0 }]);
      act(begin(draw(data, session.seen, last)));
    });
    // « Garder ta tortue »: asked here, in the page, until answered — two gestures of the same
    // weight, and every consequence said before either. Nothing is on the phone before « Garder ».
    if (!store.kept() && !session.declined) {
      const card = el('div', undefined, 'g-keep');
      for (const line of [s.keep.what, s.keep.notKept, s.keep.otherwise, s.keep.seen]) {
        card.append(el('p', line));
      }
      if (onIos()) card.append(el('p', s.keep.safari));
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
    // « Envoyer le jeu » (D16.17): the bare address of the site, and nothing else — no text, no
    // word, no answer, nothing of the turtle. Where the phone has no share sheet the address
    // is copied; where it can do neither, the button is not there.
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
    show(panel, heading, focus);
    turtleFrames(evolution(before, end));
  }

  function render(focus: boolean): void {
    const wordId = current(session.play);
    const entry = wordId === null ? null : entryOf(data, wordId);
    if (wordId === null || entry === null) renderEnd(focus);
    else if (session.play.screen.kind === 'ask') renderAsk(wordId, entry.word, focus);
    else renderPlace(wordId, entry.word, focus);
  }

  // --- her sheet (D16.13). Touching her raises her head and opens it; inside she is large and
  // can be touched again. Whoever asked for less motion gets the sheet and no movement — and no
  // sentence about a movement that does not happen.
  const sheet = block.querySelector<HTMLDialogElement>('#turtle-sheet');
  const sheetHer = sheet?.querySelector<HTMLElement>('#turtle-sheet-her') ?? null;
  const sheetSaid = sheet?.querySelector<HTMLElement>('#turtle-sheet-said') ?? null;
  const sheetFound = sheet?.querySelector<HTMLElement>('#turtle-sheet-found') ?? null;
  const sheetKept = sheet?.querySelector<HTMLElement>('#turtle-sheet-kept') ?? null;
  const sheetKeep = sheet?.querySelector<HTMLButtonElement>('#turtle-sheet-keep') ?? null;
  const sheetRelease = sheet?.querySelector<HTMLButtonElement>('#turtle-sheet-release') ?? null;
  const sheetErase = sheet?.querySelector<HTMLButtonElement>('#turtle-sheet-erase') ?? null;

  /** Where a section stands in the book, among the tiles: the order her finds are listed in. */
  const position = new Map<string, number>();
  for (const part of data.parts) {
    for (const chapter of part.chapters) {
      for (const section of chapter.sections) position.set(section.id, position.size);
    }
  }

  function fillSheet(raised: boolean): void {
    if (turtle === null || sheetHer === null || sheetSaid === null) return;
    // Her, large: the same drawing, with the same look.
    const large = turtle.cloneNode(true) as Element;
    large.removeAttribute('data-live');
    applyLook(large, look({ pose: raised ? 'up' : 'rest' }));
    const touch = button('', 'g-press', () => {
      if (lessMotion()) return;
      const up = large.getAttribute('data-pose') !== 'up';
      applyLook(large, look({ pose: up ? 'up' : 'rest' }));
      sheetSaid.textContent = up ? s.sheet.raises : '';
    });
    touch.setAttribute('aria-label', s.sheet.name);
    touch.append(large);
    sheetHer.replaceChildren(touch);
    window.requestAnimationFrame(() => {
      large.setAttribute('data-live', '');
    });
    sheetSaid.textContent = raised ? s.sheet.raises : '';

    // What she has found — the words, and from the third depth where each is written, in the
    // order of the book. Never a total: nothing here says what is left.
    const entries = session.seen.flatMap((id) => {
      const entry = entryOf(data, id);
      return entry === null ? [] : [entry];
    });
    if (entries.length === 0) {
      sheetFound?.replaceChildren(el('p', s.sheet.none));
    } else {
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
          there.rel = 'noopener';
          if (entry.fragment !== '') there.dataset.fragment = entry.fragment;
          there.append(titled('span', place.section.title));
          item.append(' — ', there);
        }
        items.append(item);
      }
      enhanceOfficialLinks(items);
      sheetFound?.replaceChildren(items);
    }
    // What is kept — and, while nothing is on the phone, what « Garder ta tortue » would write
    // there and who would see it: the same sentences as the card, before the same gesture.
    const lines = store.kept()
      ? [s.sheet.onPhone]
      : [
          s.sheet.tabOnly,
          s.keep.what,
          s.keep.notKept,
          s.keep.seen,
          ...(onIos() ? [s.keep.safari] : []),
        ];
    sheetKept?.replaceChildren(...lines.map((line) => el('p', line)));
    if (sheetKeep !== null) sheetKeep.hidden = store.kept() || session.seen.length === 0;
    // What was asked of the phone can be taken back as simply as it was asked.
    if (sheetRelease !== null) sheetRelease.hidden = !store.kept();
  }

  if (turtle !== null && sheet !== null) {
    const press = button('', 'g-press', () => {
      if (frozen()) return;
      const raised = !lessMotion();
      if (raised) {
        posed = true;
        turtleFrames([{ ...look({ pose: 'up' }), at: 0 }]);
      }
      fillSheet(raised);
      sheet.showModal();
    });
    press.setAttribute('aria-label', s.sheet.name);
    press.setAttribute('aria-haspopup', 'dialog');
    turtle.replaceWith(press);
    press.append(turtle);
    // Closing her sheet is a gesture too: she goes back to rest.
    sheet.addEventListener('close', () => {
      if (!posed) return;
      posed = false;
      turtleFrames([{ ...look(), at: 0 }]);
    });
    sheetKeep?.addEventListener('click', () => {
      if (frozen()) return;
      store.keep(memory());
      fillSheet(false);
      if (sheetSaid !== null) sheetSaid.textContent = s.keep.done;
      // The button that had the focus is gone: the one that undoes it takes its place.
      sheetRelease?.focus();
    });
    // « Ne plus garder sur ce téléphone »: the phone forgets, the game goes on in this tab.
    sheetRelease?.addEventListener('click', () => {
      store.release();
      fillSheet(false);
      if (sheetSaid !== null) sheetSaid.textContent = s.sheet.released;
      // The button that had the focus is gone: the one that takes its place receives it.
      (sheetKeep?.hidden === false ? sheetKeep : sheetErase)?.focus();
    });
    // « Tout effacer »: the tab and the phone, and the game starts again from nothing.
    sheetErase?.addEventListener('click', () => {
      store.erase();
      session = remembered(store.load());
      posed = false;
      render(false);
      settle();
      fillSheet(false);
      if (sheetSaid !== null) sheetSaid.textContent = s.sheet.erased;
    });
  }

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
  if (turtle !== null) applyLook(turtle, look());
  render(false);
  // Nothing is written here: arriving — by a link, in a new tab — is not a gesture of the game.
  // The tab is written at the first gesture that follows (`act`).

  // The page comes back from the browser's own cache (« précédent ») with what it remembered
  // when it was left: what the tab and the phone hold now is read again — « Tout effacer »
  // may have been pressed on another page in between.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    session = remembered(store.load());
    posed = false;
    sheet?.close();
    render(false);
    settle();
  });
  // Another tab of this phone kept something, stopped keeping, or erased everything: this one
  // follows, without a movement — nothing was done here.
  store.watch(memory, {
    kept: (merged) => {
      session = { ...remembered(merged), play: session.play };
      settle();
      if (sheet?.open === true) fillSheet(false);
    },
    // The game of this tab is untouched; only what her sheet says of the phone has changed.
    released: () => {
      if (sheet?.open === true) fillSheet(false);
    },
    erased: () => {
      session = remembered(store.load());
      render(false);
      settle();
      if (sheet?.open === true) fillSheet(false);
    },
  });
  // From now on what she does is a movement: the look she arrived with was not.
  window.requestAnimationFrame(() => turtle?.setAttribute('data-live', ''));
}

const block = document.querySelector<HTMLElement>('#jeu');
const live = document.querySelector<HTMLElement>('#game-live');
const fixed = document.querySelector<HTMLElement>('#game-static');
const status = document.querySelector<HTMLElement>('#game-status');
const raw = document.querySelector('#game-config')?.textContent;

if (block !== null && live !== null && fixed !== null && status !== null && raw != null) {
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
        if (data !== null && data.words.length > 0) {
          start(block, live, fixed, status, config, data);
        }
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
