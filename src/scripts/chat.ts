/**
 * The sheet of « Demander » (PLAN-CHAT §1 and §2, D16.45 to D16.53) — fetched at the first
 * press of the button, never with the page.
 *
 * What happens when a question is asked, in order:
 *   1. it is cleaned, shown in the thread, and what a person already wrote about it — a card,
 *      an objection — is recognised on the phone and shown at once;
 *   2. electoral silence is decided here before anything is sent, and closed when in doubt;
 *   3. the page searches, as it does while one types, and shows the three measures it ranks
 *      best: their links first;
 *   4. the identifiers of those measures go to /api/gists — nothing typed — and the sentences
 *      the editor read come back, one per measure that has one;
 *   5. only then, only if the Worker says a model may be asked, only once the visitor pressed
 *      « Expliquer avec l'IA »: /api/chat is sent the measures whose sentence is on the screen
 *      and the words of those sentences that the question uses — NEVER THE QUESTION (D16.53) —
 *      and an explanation of those words comes back, or nothing, and nothing says so.
 *
 * What is decided is decided by pure modules (src/lib/chat-local.ts, chat-view.ts); this file
 * sends, waits and draws. The thread lives in the memory of the page: nothing is written to a
 * storage or to the address, and it is emptied when the page is left.
 *
 * Everything shown is built with `createElement` and `textContent`: a sentence of the model,
 * a sentence of the base, a question — all are text, never markup.
 */
import { parseChatResponse, parseGistsResponse, type FollowUp } from '../lib/chat-contract.ts';
import type { ChatPlain } from '../lib/chat-data.ts';
import { chatRequestOf, cleanQuestion, gistsRequestOf, rowsOf } from '../lib/chat-local.ts';
import {
  newTurn,
  nextStep,
  settled,
  shownIds,
  viewOf,
  withExplanation,
  withGists,
  type PageState,
  type Turn,
} from '../lib/chat-view.ts';
import { recognise } from '../lib/notions.ts';
import { formatReopenTimeFr } from '../lib/silence.ts';
import { enhanceOfficialLinks } from './deep-links.ts';
import {
  displayOf,
  el,
  findRanked,
  firstWords,
  loadEngine,
  measureLink,
  type Engine,
} from './engine.ts';
import { silenceReading } from './silence-now.ts';

interface Config {
  corpus: string;
  /** Where the texts of « En clair » are: our cards, our answers — a static file. */
  plain: string;
  objections: { slug: string; objection: string }[];
  cards: { id: string; term: string }[];
  strings: {
    question: string;
    searching: string;
    plainTitle: string;
    reviewed: string;
    reviewedLink: string;
    card: string;
    gistsTitle: string;
    gistsBadge: string;
    where: string;
    incipit: string;
    firstWords: string;
    noneTitle: string;
    noneLead: string;
    offTopic: string;
    silence: string;
    paused: string;
    aiTitle: string;
    aiMark: string;
    aiNote: string;
    aiWaiting: string;
    method: string;
    simpler: string;
    example: string;
  };
}

/** How long the page waits for the read sentences, and for an explanation. */
const GISTS_TIMEOUT_MS = 4_000;
const EXPLAIN_TIMEOUT_MS = 8_000;

/** Opens the sheet. Set below once the sheet is found: without it, pressing does nothing. */
let opening: (() => void) | null = null;
/** What the button of the field calls, at each press (src/components/Search.astro). */
export function open(): void {
  opening?.();
}

const form = document.querySelector<HTMLFormElement>('#search');
const field = document.querySelector<HTMLInputElement>('#q');
const sheet = document.querySelector<HTMLDialogElement>('#chat-sheet');
const thread = sheet?.querySelector<HTMLElement>('#chat-thread') ?? null;
const scroller = sheet?.querySelector<HTMLElement>('#chat-scroll') ?? null;
const composer = sheet?.querySelector<HTMLFormElement>('#chat-form') ?? null;
const input = sheet?.querySelector<HTMLInputElement>('#chat-q') ?? null;
const offerCard = sheet?.querySelector<HTMLTemplateElement>('#chat-offer') ?? null;
const clear = sheet?.querySelector<HTMLButtonElement>('#chat-clear') ?? null;
const stop = sheet?.querySelector<HTMLButtonElement>('#chat-ai-stop') ?? null;
const start = sheet?.querySelector<HTMLButtonElement>('#chat-ai-start') ?? null;
const configNode = document.querySelector('#chat-config');

if (
  form &&
  field &&
  sheet &&
  thread &&
  scroller &&
  composer &&
  input &&
  offerCard &&
  clear &&
  stop &&
  start &&
  configNode
) {
  const config = JSON.parse(configNode.textContent) as Config;
  const s = config.strings;
  const display = displayOf(form);
  const labels = { key: s.incipit, other: s.firstWords };

  // --- what the page holds: all of it in memory, none of it kept
  let turns: Turn[] = [];
  let nodes: HTMLElement[] = [];
  /** Raised when the thread is emptied: an answer to a question of before is not shown. */
  let epoch = 0;
  let found: Engine | null = null;
  let plain: ChatPlain | null = null;
  const page: PageState = {
    corpus: config.corpus,
    ai: 'offered',
    closed: false,
    knows: (id) => found !== null && id in found.meta.items,
  };

  const engine = (): Promise<Engine | null> =>
    loadEngine(form.dataset.index ?? '', form.dataset.meta ?? '').then(
      (loaded) => (found = loaded),
      () => null,
    );
  const texts = async (): Promise<void> => {
    if (plain !== null) return;
    try {
      const response = await fetch(config.plain, { credentials: 'omit' });
      if (response.ok) plain = (await response.json()) as ChatPlain;
    } catch {
      // Without them « En clair » keeps its links: the cards and the answers have their pages.
    }
  };

  // --- electoral silence: decided here before anything is sent (src/scripts/silence-now.ts)
  const silence = silenceReading();
  const flagsRead = silence.refresh();
  const frozen = (): string | null => {
    const reading = silence.now();
    if (!reading.silence) return null;
    // An hour is only announced on a clock our server does not contradict.
    const believed = reading.clockTrusted || reading.driftMs === null;
    return reading.reopenUtc === null || !believed || reading.override !== 'auto'
      ? ''
      : reading.reopenUtc.toISOString();
  };

  // --- drawing
  /**
   * A sentence of ours or of the model, set as the site sets its own: the base and the control
   * keep one spelling of apostrophes, the page shows typographic ones (src/lib/strings.ts).
   */
  const set = (text: string): string => text.replace(/'/g, '’');
  const block = (title: string, badge: string | null, className = ''): HTMLElement => {
    const node = el('section', undefined, `c-block ${className}`.trim());
    node.tabIndex = -1;
    node.append(el('h3', title));
    if (badge !== null) node.append(el('p', badge, 'c-badge ref'));
    return node;
  };

  const source = (id: string, withWords: boolean): HTMLElement | null => {
    if (found === null) return null;
    const section = found.meta.sections[id.replace(/-[kmp]\d{2}(?:\.s\d+)?$/, '')];
    const label = found.meta.items[id]?.[0];
    if (section === undefined || label === undefined) return null;
    const link = measureLink(found.meta, id, `${section[0]}, ${label.toLowerCase()}`);
    if (link === null) return null;
    link.dataset.programme = 'title';
    const line = el('p', `${s.where} :`, 'sources');
    line.append(link);
    // Under a link that stands alone, the first words its measure allows (D16.32). Not under a
    // read sentence: that sentence already says what the measure provides.
    const words = withWords ? firstWords(found.meta, id, display, labels) : null;
    if (words !== null) line.append(words);
    return line;
  };

  const draw = (index: number): HTMLElement => {
    const turn = turns[index];
    const node = el('article', undefined, 'c-turn');
    if (turn === undefined) return node;
    const last = index === turns.length - 1;
    const view = viewOf(turn, page, last);
    // The last turn is given the height of what scrolls, so that its question can stand at
    // the top and its answer build under it, in view — however short the turn is.
    if (last && index > 0) node.style.minBlockSize = `${String(scroller.clientHeight)}px`;
    // Busy until the turn waits for nothing: what a screen reader announces as it settles.
    node.setAttribute('aria-busy', String(!settled(turn, page)));
    const asked = el('p', undefined, 'c-question');
    asked.append(el('span', `${s.question} : `, 'sr-only'), turn.question);
    node.append(asked);

    if (view.plain !== null) {
      const part = block(s.plainTitle, s.reviewed, 'c-plain');
      const { objection, cards } = view.plain;
      if (objection !== null) {
        const entry = config.objections.find((o) => o.slug === objection);
        const answer = plain?.objections[objection]?.answer;
        if (answer !== undefined) part.append(el('p', answer));
        const link = el('a', answer === undefined ? (entry?.objection ?? '') : s.reviewedLink);
        link.href = `/r/${objection}/`;
        const line = el('p');
        line.append(link);
        part.append(line);
      }
      for (const id of cards) {
        const term = config.cards.find((c) => c.id === id)?.term ?? '';
        const text = plain?.cards[id]?.plain;
        if (text !== undefined) part.append(el('p', text));
        const link = el('a', s.card.replace('{term}', term));
        link.href = `/mot/${id}/`;
        const line = el('p');
        line.append(link);
        part.append(line);
      }
      node.append(part);
    }

    const { measures } = view;
    switch (measures.kind) {
      case 'searching':
        node.append(el('p', s.searching, 'ref'));
        break;
      case 'off_topic':
        node.append(el('p', s.offTopic));
        break;
      case 'silence':
        node.append(
          el(
            'p',
            measures.reopen === null
              ? s.paused
              : s.silence.replace('{reopenTime}', formatReopenTimeFr(new Date(measures.reopen))),
          ),
        );
        break;
      case 'none':
        node.append(el('p', s.noneTitle), el('p', s.noneLead, 'ref'));
        break;
      case 'rows': {
        const read = measures.rows.some((row) => row.gist !== null);
        const part = block(s.gistsTitle, read ? s.gistsBadge : null, 'c-gists');
        for (const row of measures.rows) {
          const item = el('div', undefined, 'c-row');
          if (row.gist !== null) item.append(el('p', set(row.gist)));
          const line = source(row.id, row.gist === null);
          if (line !== null) item.append(line);
          part.append(item);
        }
        node.append(part);
        break;
      }
    }

    if (view.ai !== null) {
      // While the AI is only offered, the block says what is offered; then, what it holds.
      const offered = view.ai.offer ? (offerCard.dataset.title ?? s.aiTitle) : s.aiTitle;
      const part = block(offered, null, 'c-ai');
      for (const explanation of view.ai.explanations) {
        // A mark a machine can read on what a model wrote (AI Act, art. 50 § 2), and the label
        // a person reads, in the text itself.
        const text = el('p');
        text.dataset.generatedBy = 'ai';
        text.append(
          el('span', `${s.aiMark} — `, 'c-ai-mark'),
          set(explanation.sentences.join(' ')),
        );
        part.append(text);
      }
      if (view.ai.explanations.length > 0) {
        const note = el('p', `${s.aiNote} `, 'ref');
        const method = el('a', s.method);
        method.href = '/exactitude/';
        note.append(method);
        part.append(note);
      }
      if (view.ai.waiting) part.append(el('p', s.aiWaiting, 'ref'));
      if (view.ai.offer) {
        // One notice, one button: pressing it is the whole gesture, and not pressing it is
        // the refusal. Nothing typed goes with it (D16.53) — the notice says so.
        const card = offerCard.content.cloneNode(true) as DocumentFragment;
        card.querySelector('[data-offer="accept"]')?.addEventListener('click', () => {
          page.ai = 'on';
          redraw();
          advance(index);
          focusBlock(index, '.c-ai');
        });
        part.classList.add('c-offer');
        part.append(card);
      }
      if (view.ai.follow.length > 0) {
        const actions = el('p', undefined, 'c-actions');
        for (const follow of view.ai.follow) {
          const button = el('button', follow === 'simpler' ? s.simpler : s.example, 'quiet');
          button.type = 'button';
          button.addEventListener('click', () => {
            void explain(index, follow).then(() => {
              focusBlock(index, '.c-ai');
            });
          });
          actions.append(button);
        }
        part.append(actions);
      }
      node.append(part);
    }
    enhanceOfficialLinks(node);
    return node;
  };

  /** Draws one turn again in its place: the others keep their scroll and their focus. */
  const update = (index: number): void => {
    const node = draw(index);
    const old = nodes[index];
    if (old === undefined) thread.append(node);
    else old.replaceWith(node);
    nodes[index] = node;
  };
  const redraw = (): void => {
    nodes = [];
    thread.replaceChildren();
    turns.forEach((_, index) => {
      update(index);
    });
    stop.hidden = page.ai !== 'on';
    start.hidden = page.ai !== 'off';
  };
  const focusBlock = (index: number, selector: string): void => {
    (nodes[index]?.querySelector<HTMLElement>(selector) ?? scroller).focus();
  };

  // --- sending: each function sends one request, and only what the pure modules built
  const post = async (path: string, body: unknown, timeout: number): Promise<unknown> => {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeout),
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
      });
      return response.ok ? ((await response.json()) as unknown) : null;
    } catch {
      return null;
    }
  };

  /**
   * The turn at this place as it is NOW. Read through a function on purpose: after an `await`
   * the thread may have been emptied, and the compiler would otherwise go on believing what it
   * saw written there before the wait.
   */
  const turnAt = (index: number): Turn | undefined => turns[index];

  /** Sends what this turn is due without being asked again, one step after the other. */
  const advance = (index: number): void => {
    const turn = turns[index];
    if (turn === undefined) return;
    const step = nextStep(turn, page);
    if (step === 'gists') void gists(index);
    else if (step === 'explain') void explain(index, null);
  };

  const gists = async (index: number): Promise<void> => {
    const turn = turns[index];
    const request = turn === undefined ? null : gistsRequestOf(config.corpus, turn.rows ?? []);
    if (turn === undefined || request === null) return;
    const asked = epoch;
    turns[index] = { ...turn, gists: 'pending' };
    const answer = parseGistsResponse(await post('/api/gists', request, GISTS_TIMEOUT_MS));
    const now = turnAt(index);
    if (asked !== epoch || now === undefined) return;
    turns[index] = withGists(now, answer);
    update(index);
    advance(index);
  };

  const explain = async (index: number, follow: FollowUp | null): Promise<void> => {
    const turn = turns[index];
    if (turn === undefined || turn.awaited !== undefined) return;
    // What leaves: the measures shown, the words of their sentences that the question uses,
    // the cards it names. The question itself is read here and goes nowhere (D16.53).
    const shown = shownIds(turn, page);
    const read = turn.gists;
    const sentences =
      read !== undefined && read !== null && read !== 'pending' && read.kind === 'gists'
        ? read.gists.filter((gist) => shown.includes(gist.id))
        : [];
    const request =
      page.ai === 'on'
        ? chatRequestOf({
            corpus: config.corpus,
            question: turn.question,
            shown: sentences,
            cards: turn.recognised.cards,
            follow: follow ?? undefined,
          })
        : null;
    if (request === null) return;
    const asked = epoch;
    turns[index] = { ...turn, awaited: follow };
    update(index);
    const answer = parseChatResponse(await post('/api/chat', request, EXPLAIN_TIMEOUT_MS));
    const now = turnAt(index);
    if (asked !== epoch || now === undefined) return;
    const result = withExplanation(now, follow, answer, page);
    turns[index] = result.turn;
    if (result.closed) page.closed = true;
    update(index);
  };

  const ask = async (raw: string): Promise<void> => {
    const question = cleanQuestion(raw);
    if (question === null) return;
    const asked = epoch;
    await flagsRead;
    if (asked !== epoch) return;
    const index = turns.length;
    turns.push(newTurn(question, recognise(question, config), frozen()));
    // The turn above is no longer the last one: its agreement, if it showed one, moves down.
    if (index > 0) update(index - 1);
    update(index);
    // The new question goes to the top of what scrolls: its answer builds under it. Only the
    // thread is moved — `scrollIntoView` would move the sheet and the page behind it too.
    scroller.scrollTop = nodes[index]?.offsetTop ?? 0;
    const [loaded] = await Promise.all([engine(), texts()]);
    const turn = turns[index];
    if (asked !== epoch || turn === undefined) return;
    const rows = loaded === null ? [] : rowsOf(findRanked(loaded, question), page.knows);
    turns[index] = { ...turn, rows };
    update(index);
    advance(index);
  };

  const empty = (): void => {
    epoch += 1;
    turns = [];
    redraw();
  };

  // --- the keyboard of a phone: the sheet stands on what is left of the screen above it.
  // Where the browser does not shrink the page for its keyboard, the bottom of a fixed box is
  // under the keys; the visible part of the screen says where the bottom really is.
  const viewport = window.visualViewport;
  const fit = (): void => {
    if (viewport === null) return;
    const hidden = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
    sheet.style.setProperty('--c-under', `${String(Math.round(hidden))}px`);
    sheet.style.setProperty('--c-visible', `${String(Math.round(viewport.height))}px`);
  };
  viewport?.addEventListener('resize', fit);
  viewport?.addEventListener('scroll', fit);

  // --- gestures
  opening = (): void => {
    if (!sheet.open) sheet.showModal();
    fit();
    stop.hidden = page.ai !== 'on';
    start.hidden = page.ai !== 'off';
    // What was typed in the field of the page becomes the first question — once.
    const typed = cleanQuestion(field.value);
    if (typed !== null && turns.at(-1)?.question !== typed) {
      void ask(typed);
      scroller.focus();
    } else {
      input.focus();
    }
  };
  composer.addEventListener('submit', (event) => {
    event.preventDefault();
    const typed = input.value;
    input.value = '';
    void ask(typed);
  });
  clear.addEventListener('click', () => {
    empty();
    input.focus();
  });
  stop.addEventListener('click', () => {
    page.ai = 'off';
    redraw();
    start.focus();
  });
  // Asking for it again is the gesture itself: the AI is on, and the last turn is explained.
  start.addEventListener('click', () => {
    page.ai = 'on';
    redraw();
    advance(turns.length - 1);
    focusBlock(turns.length - 1, '.c-ai');
  });
  // Leaving the page empties the thread: coming back with the back button finds none — and
  // the AI is only offered again. A browser may bring the page back as it left it, memory
  // included; what the privacy page says of a visit has to hold there too.
  window.addEventListener('pagehide', () => {
    page.ai = 'offered';
    empty();
    if (sheet.open) sheet.close();
  });
}
