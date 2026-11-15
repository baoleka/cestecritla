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
 *      written ahead come back, one per measure that has one;
 *   5. the acronyms and technical terms that the question or these sentences use are found
 *      on the phone, in a file fetched whole with the sheet, and shown with a short explanation
 *      written ahead — general knowledge, labelled as written by an AI; nothing is sent. A
 *      question that asks what a word means gets it first, open; the others come under the
 *      measures, closed;
 *   6. only then, only if the Worker says a model may be asked, only once the visitor pressed
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
import {
  chatRequestOf,
  cleanQuestion,
  gistsRequestOf,
  lexiconOf,
  measuresFor,
} from '../lib/chat-local.ts';
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
import { explainedFor, type Explained } from '../lib/terms.ts';
import { formatReopenTimeFr } from '../lib/silence.ts';
import { enhanceOfficialLinks } from './deep-links.ts';
import {
  displayOf,
  el,
  findRanked,
  firstWords,
  aliasesOf,
  loadEngine,
  measureLink,
  type Engine,
} from './engine.ts';
import { silenceReading } from './silence-now.ts';

interface Config {
  corpus: string;
  /** Where the texts of « En clair » are: our cards, our answers — a static file. */
  plain: string;
  /** Our fifteen answers: what each is recognised by, and the measures it rests on. */
  objections: { slug: string; objection: string; supports: string[] }[];
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
    askedTitle: string;
    termsTitle: string;
    termsBadge: string;
    gistsWhere: string;
    linksOnly: string;
    forExample: string;
    incipit: string;
    firstWords: string;
    noneTitle: string;
    noneLead: string;
    offTopic: string;
    aboutTitle: string;
    aboutLines: string[];
    aboutLink: string;
    privacyLink: string;
    silence: string;
    paused: string;
    aiTitle: string;
    aiMark: string;
    aiNote: string;
    aiWaiting: string;
    method: string;
    cleared: string;
    simpler: string;
    example: string;
  };
}

/** A no-break space, as French sets it inside its quotation marks. */
const NBSP = String.fromCodePoint(0xa0);

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
const status = sheet?.querySelector<HTMLElement>('#chat-status') ?? null;
const stop = sheet?.querySelector<HTMLButtonElement>('#chat-ai-stop') ?? null;
const start = sheet?.querySelector<HTMLButtonElement>('#chat-ai-start') ?? null;
const configNode = document.querySelector('#chat-config');

if (form && field && sheet && thread && scroller && composer && input && clear && configNode) {
  // The offer of an explanation, and the two buttons that go with it, are in the page only
  // where a model answers (src/components/ChatSheet.astro). Without them the sheet shows the
  // sentences written ahead and what a person wrote — and asks nothing of any AI (D16.60).
  const explains = offerCard !== null && stop !== null && start !== null;
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
  /**
   * The explained words a visitor opened or closed, by turn and by term: a turn is drawn again
   * when the thread moves on, and it must come back as it was left. In memory, like the rest.
   */
  let toggled = new Map<string, boolean>();
  /** What was last taken from the field of the page, so that it is asked once. */
  let taken: string | null = null;
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
  /**
   * A text an AI wrote ahead — a sentence of the base, an explanation of a word — with the
   * mark a machine can read on it (AI Act, art. 50 § 2). What a person reads is the label of
   * its block.
   */
  const written = (text: string): HTMLElement => {
    const node = el('p', set(text));
    node.dataset.generatedBy = 'ai';
    return node;
  };
  const block = (
    title: string,
    badge: string | null,
    className = '',
    how: string | null = null,
  ): HTMLElement => {
    const node = el('section', undefined, `c-block ${className}`.trim());
    node.tabIndex = -1;
    node.append(el('h3', title));
    if (badge !== null) {
      const label = el('p', badge, 'c-badge ref');
      // Who wrote and who checked is said in the label; how, one tap away (a persona asked:
      // « vérifiées par qui, contre quoi ? »).
      if (how !== null) {
        const link = el('a', how);
        link.href = '/methodologie/#demander';
        label.append(' — ', link);
      }
      node.append(label);
    }
    return node;
  };

  /**
   * A block of explained words: one line to press per word, its explanation under it. What the
   * visitor opened or closed stays so when the turn is drawn again.
   */
  const words = (
    title: string,
    list: readonly Explained[],
    index: number,
    className: string,
    open: boolean,
  ): HTMLElement => {
    const part = block(title, s.termsBadge, className);
    for (const { entry } of list) {
      const key = `${String(index)}:${entry.id}`;
      const item = el('details', undefined, 'c-term');
      item.open = toggled.get(key) ?? open;
      item.append(el('summary', set(entry.term)), written(entry.plain));
      item.addEventListener('toggle', () => {
        toggled.set(key, item.open);
      });
      part.append(item);
    }
    return part;
  };

  const source = (id: string, withWords: boolean): HTMLElement | null => {
    if (found === null) return null;
    const section = found.meta.sections[id.replace(/-[kmp]\d{2}(?:\.s\d+)?$/, '')];
    const label = found.meta.items[id]?.[0];
    if (section === undefined || label === undefined) return null;
    const link = measureLink(found.meta, id, `${section[0]}, ${label.toLowerCase()}`);
    if (link === null) return null;
    link.dataset.programme = 'title';
    // In the sheet the link is always said to be the MEASURE. « C'est écrit là » would be read
    // of the sentence above it, which is written nowhere but here — and, under a question that
    // charges someone, as confirming the charge (hostile review, then the fourth).
    const line = el('p', `${s.gistsWhere} :`, 'sources');
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
    // Each turn is named after its question: the same titles come back turn after turn, and who
    // moves from one to the other without seeing them is told whose answer this is.
    asked.id = `chat-turn-${String(index)}`;
    node.setAttribute('aria-labelledby', asked.id);
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

    // The explained words: the acronyms and technical terms of the question and of the
    // sentences on the screen. Found here, on the phone — nothing is sent to find a word.
    const explained =
      view.wording === null || plain === null
        ? []
        : explainedFor(view.wording.question, view.wording.sentences ?? [], plain.terms);
    // A question that asks what a word means gets that word first, open: it is what was asked.
    // It depends on the question alone, so it is there from the first paint and moves nothing.
    const named = explained.filter((e) => e.top);
    if (named.length > 0) {
      node.append(words(s.askedTitle, named, index, 'c-terms c-asked', true));
    }

    const { measures } = view;
    switch (measures.kind) {
      case 'searching':
        node.append(el('p', s.searching, 'ref'));
        break;
      case 'off_topic':
        node.append(el('p', s.offTopic));
        break;
      case 'about': {
        // What the site says of itself, in its own words — the same as on its pages.
        const part = block(s.aboutTitle, null, 'c-about');
        for (const line of s.aboutLines) part.append(el('p', line));
        const more = el('p');
        const about = el('a', s.aboutLink);
        about.href = '/a-propos/';
        const how = el('a', s.method);
        how.href = '/methodologie/#demander';
        // « Vous gardez mes données ? » is asked of the site too: the page that says so.
        const kept = el('a', s.privacyLink);
        kept.href = '/confidentialite/#demander';
        more.append(about, ' · ', how, ' · ', kept);
        part.append(more);
        node.append(part);
        break;
      }
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
        const part = block(s.gistsTitle, read ? s.gistsBadge : null, 'c-gists', s.method);
        // Links on purpose — the question names someone, or holds a word the search does not
        // know: one line says how to get sentences, and nothing about what the book holds.
        if (turn.linksOnly === true) {
          // …with, when the question holds one, a word of its own to ask alone.
          const example = turn.example ?? null;
          const how =
            example === null
              ? s.linksOnly
              : `${s.linksOnly} ${s.forExample} «${NBSP}${example}${NBSP}».`;
          part.append(el('p', how, 'ref c-how'));
        }
        for (const row of measures.rows) {
          const item = el('div', undefined, 'c-row');
          if (row.gist !== null) item.append(written(row.gist));
          const line = source(row.id, row.gist === null);
          if (line !== null) item.append(line);
          part.append(item);
        }
        node.append(part);
        break;
      }
    }

    // The other words — of the question, of the sentences — under the measures, closed, once
    // the sentences are all there: a block that grew would move what is being read.
    const shown = view.wording?.sentences ?? null;
    const others = shown === null ? [] : explained.filter((e) => !e.top);
    if (others.length > 0) node.append(words(s.termsTitle, others, index, 'c-terms', false));

    if (view.ai !== null && explains) {
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
    // A link of the sheet opens beside the conversation, never in its place: the thread lives
    // in the memory of this page, and a link followed in the same tab would end it. Said to
    // who cannot see a tab open, by a description every link shares (ChatSheet.astro).
    for (const link of node.querySelectorAll('a')) {
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.setAttribute('aria-describedby', 'chat-new-tab');
    }
    enhanceOfficialLinks(node);
    return node;
  };

  /** The two small buttons of the AI — « stop », « ask again » — follow what was chosen. */
  const showChoice = (): void => {
    if (!explains) return;
    stop.hidden = page.ai !== 'on';
    start.hidden = page.ai !== 'off';
  };

  /**
   * Brings what is drawn to its new drawing without taking it out of the thread. What did not
   * change stays where it is: a screen reader that follows the log is told once — a turn used
   * to be put in three times as it settled, and the turn before it once more —, a word left
   * open stays open, a focus stays where it was. Inside a block the same holds one level down:
   * a sentence that arrives under a title does not bring the title again.
   */
  const patch = (old: Element, fresh: Element): void => {
    for (const name of old.getAttributeNames()) {
      if (name !== 'style' && !fresh.hasAttribute(name)) old.removeAttribute(name);
    }
    for (const name of fresh.getAttributeNames()) {
      // A style is set through its properties: the policy of the page refuses the attribute.
      if (name === 'style') continue;
      const value = fresh.getAttribute(name) ?? '';
      if (old.getAttribute(name) !== value) old.setAttribute(name, value);
    }
    const before = [...old.childNodes];
    const after = [...fresh.childNodes];
    after.forEach((node, at) => {
      const current = before[at];
      if (current === undefined) old.append(node);
      else if (current.isEqualNode(node)) return;
      else if (
        current instanceof HTMLElement &&
        node instanceof HTMLElement &&
        node.classList.contains('c-block') &&
        current.tagName === node.tagName &&
        current.className === node.className
      )
        patch(current, node);
      else current.replaceWith(node);
    });
    for (const gone of before.slice(after.length)) gone.remove();
  };
  /** Draws one turn again in its place: the others keep their scroll and their focus. */
  const update = (index: number): void => {
    const node = draw(index);
    const old = nodes[index];
    if (old === undefined) {
      thread.append(node);
      nodes[index] = node;
      return;
    }
    patch(old, node);
    old.style.minBlockSize = node.style.minBlockSize;
  };
  const redraw = (): void => {
    nodes = [];
    thread.replaceChildren();
    turns.forEach((_, index) => {
      update(index);
    });
    showChoice();
  };
  const focusBlock = (index: number, selector: string): void => {
    (nodes[index]?.querySelector<HTMLElement>(selector) ?? scroller).focus();
  };

  // --- sending: each function sends one request, and only what the pure modules built
  /** A deadline for a request. `AbortSignal.timeout` came with Safari 16: older ones get the same by hand. */
  const deadline = (ms: number): AbortSignal => {
    if ('timeout' in AbortSignal) return AbortSignal.timeout(ms);
    const controller = new AbortController();
    setTimeout(() => {
      controller.abort();
    }, ms);
    return controller.signal;
  };
  const post = async (path: string, body: unknown, timeout: number): Promise<unknown> => {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: deadline(timeout),
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
    // A page without the offer asks nothing of an AI, whatever a server may answer (D16.60).
    if (!explains || turn === undefined || turn.awaited !== undefined) return;
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
    if (status !== null) status.textContent = '';
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
    // A recognised objection shows the measures its written answer rests on; any other
    // question, what the search ranks best — as links only when it names someone.
    const reviewed = config.objections.find((entry) => entry.slug === turn.recognised.objection);
    const supports = reviewed?.supports ?? [];
    // What the sheet knows of words came with its texts: the ordinary words a question is
    // made of, the sensitive subjects. Without them nothing says which is which: links.
    const found =
      loaded === null
        ? null
        : measuresFor(
            question,
            supports,
            findRanked(loaded, question),
            page.knows,
            plain === null ? null : lexiconOf(plain.words, (word) => aliasesOf(loaded, word)),
            reviewed?.objection ?? null,
          );
    const linksOnly = found !== null && !found.sentences && found.rows.length > 0;
    const searched: Turn = {
      ...turn,
      // Our written answer stands when the question is the objection and nothing more.
      recognised:
        found?.reviewed === true ? turn.recognised : { ...turn.recognised, objection: null },
      refused: found?.refused === true,
      rows: found?.rows ?? [],
      linksOnly,
      example: found?.example ?? null,
    };
    // Links only: the turn is whole as it is, and nothing is asked of the base.
    turns[index] = found !== null && !found.sentences ? withGists(searched, null) : searched;
    update(index);
    advance(index);
  };

  const empty = (): void => {
    epoch += 1;
    turns = [];
    toggled = new Map();
    taken = null;
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
    showChoice();
    // What was typed in the field of the page becomes a question — once: closing the sheet
    // and opening it again, the same words still in the field, asks nothing a second time.
    const typed = cleanQuestion(field.value);
    if (typed !== null && typed !== taken) {
      taken = typed;
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
    // On a touch screen the keyboard hides the answer for as long as the field holds the
    // focus: the focus goes to the conversation, as it does when the sheet opens on a question.
    // With a real keyboard the field keeps it: the next question is typed at once.
    if (cleanQuestion(typed) !== null && window.matchMedia('(pointer: coarse)').matches) {
      scroller.focus();
    }
  });
  clear.addEventListener('click', () => {
    empty();
    // Said to who cannot see the thread empty: the log has nothing left to announce.
    if (status !== null) status.textContent = s.cleared;
    input.focus();
  });
  if (explains) {
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
  }
  // Leaving the page empties the thread: coming back with the back button finds none — and
  // the AI is only offered again. A browser may bring the page back as it left it, memory
  // included; what the privacy page says of a visit has to hold there too.
  window.addEventListener('pagehide', () => {
    page.ai = 'offered';
    empty();
    if (sheet.open) sheet.close();
  });
}
