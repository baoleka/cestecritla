/**
 * What the sheet shows for one turn of the thread — decided here, purely, so that every state
 * of PLAN-CHAT §1 is tested without a browser.
 *
 * The rule of the sheet: a question always gets its page, the surest block first, and nothing
 * in it ever says that something failed.
 *
 *   « En clair »                      what a person wrote and re-read: a card, an objection —
 *                                     recognised on the phone, shown at once
 *   « Ce que prévoit le programme »   a row per measure: the sentence the editor read, or its
 *                                     link alone — the link is there before the sentence
 *   the explanation                   only where a read sentence is on the screen, only if the
 *                                     Worker says the model may be asked, only once the
 *                                     visitor pressed « Expliquer avec l'IA » — and never when
 *                                     the question is an objection a person already answered
 *
 * An answer the page cannot use — none at all, one built for another state of the book, a
 * sentence for a measure it did not ask about — is dropped without a word: the rows keep their
 * links, and the turn is whole without the rest.
 *
 * A turn lives in the memory of the page and nowhere else — the question with it, which is
 * sent to no one (D16.53): nothing here reads or writes a storage.
 */
import {
  FOLLOW_UPS,
  type ChatResponse,
  type FollowUp,
  type GistsResponse,
} from './chat-contract.js';
import { asksForVote } from './chat-local.js';
import type { Recognised } from './notions.js';

/**
 * Where the AI stands on this page: offered under the read sentences and not asked yet; on —
 * the visitor pressed the button, and each turn is explained; or off — they stopped it. Never
 * stored, and gone with the page.
 */
export type AiChoice = 'offered' | 'on' | 'off';

/** One explanation of a turn: the first (`follow` null), or a follow-up. */
export interface Explanation {
  follow: FollowUp | null;
  sentences: string[];
}

/** Everything the page knows of one turn. */
export interface Turn {
  /** The question as it is shown: `cleanQuestion` of what was typed. It is sent nowhere. */
  question: string;
  /** What a person already wrote about it — decided on the phone, before anything is sent. */
  recognised: Recognised;
  /**
   * Electoral silence: the instant questions reopen (ISO 8601), `''` when the page cannot say
   * when, `null` outside a window.
   */
  silence: string | null;
  /** The measures the search found, best first; `null` while it searches. */
  rows: readonly string[] | null;
  /**
   * `/api/gists`: `undefined` not asked, `'pending'` asked, `null` no answer the page can use,
   * or the answer.
   */
  gists: GistsResponse | 'pending' | null | undefined;
  /** The explanations received, in the order they were asked. */
  explanations: readonly Explanation[];
  /** The explanation on its way: `null` the first one, a follow-up — or `undefined`, none. */
  awaited: FollowUp | null | undefined;
  /** What was asked and brought nothing: not asked again, and nothing says so. */
  silent: readonly (FollowUp | null)[];
}

/** What is true of the page while the thread lives. */
export interface PageState {
  /** The state of the book this page was built from. */
  corpus: string;
  ai: AiChoice;
  /** The allowance is spent: no explanation is asked any more on this page, and nothing says why. */
  closed: boolean;
  /** True when the page can name this measure and link to it. */
  knows: (id: string) => boolean;
}

/** A turn as it starts: the question, what the phone recognised in it, and the hour. */
export function newTurn(question: string, recognised: Recognised, silence: string | null): Turn {
  return {
    question,
    recognised,
    silence,
    rows: null,
    gists: undefined,
    explanations: [],
    awaited: undefined,
    silent: [],
  };
}

/** A measure of a turn: its read sentence, or — `null` — its link alone. */
export interface Row {
  id: string;
  gist: string | null;
}

export type Measures =
  /** The index is being opened, or searched. */
  | { kind: 'searching' }
  /** « Ici, on ne parle que du programme. » */
  | { kind: 'off_topic' }
  /** Electoral silence; `reopen` null when no hour can be announced. */
  | { kind: 'silence'; reopen: string | null }
  /** « Rien trouvé avec ces mots. » — never "the programme does not speak of it". */
  | { kind: 'none' }
  /** `reading`: the sentences are still awaited — the links are already there. */
  | { kind: 'rows'; rows: Row[]; reading: boolean };

/** The third block, when there is something of it to show. */
export interface AiView {
  /** The offer shows here, in place of the explanation: one notice, one button. */
  offer: boolean;
  explanations: readonly Explanation[];
  waiting: boolean;
  /** The follow-ups that may still be asked for this turn. */
  follow: readonly FollowUp[];
}

export interface TurnView {
  /** « En clair », or null when the question carries nothing a person wrote about. */
  plain: Recognised | null;
  measures: Measures;
  ai: AiView | null;
}

/** The answer of `/api/gists` when it is one the page can use for this state of the book. */
function usable(turn: Turn, page: PageState): Extract<GistsResponse, { kind: 'gists' }> | null {
  const { gists } = turn;
  if (gists === undefined || gists === null || gists === 'pending') return null;
  return gists.kind === 'gists' && gists.corpus === page.corpus ? gists : null;
}

/** True when the turn shows nothing but one sentence of ours: a freeze, a request for a vote. */
const closedTurn = (turn: Turn): boolean =>
  turn.silence !== null ||
  (turn.gists !== undefined &&
    turn.gists !== null &&
    turn.gists !== 'pending' &&
    turn.gists.kind === 'silence') ||
  asksForVote(turn.question);

/** The rows of a turn: each measure the page can name, with its read sentence when it has one. */
function rowsOf(turn: Turn, page: PageState): Row[] {
  const sentences = new Map((usable(turn, page)?.gists ?? []).map((gist) => [gist.id, gist.text]));
  return (turn.rows ?? [])
    .filter((id) => page.knows(id))
    .map((id) => ({ id, gist: sentences.get(id) ?? null }));
}

/** The measures whose read sentence is on the screen: all an explanation may rest on. */
export function shownIds(turn: Turn, page: PageState): string[] {
  if (closedTurn(turn)) return [];
  return rowsOf(turn, page)
    .filter((row) => row.gist !== null)
    .map((row) => row.id);
}

/**
 * True when the model may be asked about this turn: a read sentence is on the screen, the
 * Worker says the model answers now, the page is not closed — and the question is not an
 * objection a person already answered: our own answer is on the screen, and it is enough.
 */
export function explainable(turn: Turn, page: PageState): boolean {
  if (page.closed || turn.recognised.objection !== null) return false;
  return usable(turn, page)?.ai === true && shownIds(turn, page).length > 0;
}

/**
 * What the page sends next for this turn without being asked again, if anything: the measures
 * once the search has found some; the request for an explanation once the AI is on.
 */
export function nextStep(turn: Turn, page: PageState): 'gists' | 'explain' | null {
  if (closedTurn(turn)) return null;
  if (turn.gists === undefined) {
    return (turn.rows ?? []).some((id) => page.knows(id)) ? 'gists' : null;
  }
  const first =
    turn.explanations.length === 0 && turn.awaited === undefined && !turn.silent.includes(null);
  return first && page.ai === 'on' && explainable(turn, page) ? 'explain' : null;
}

/**
 * True once a turn waits for nothing: the search is done, no answer is awaited, and nothing is
 * due to be sent. What a reader — or a screen reader — can take as the turn being whole.
 */
export function settled(turn: Turn, page: PageState): boolean {
  if (closedTurn(turn)) return true;
  return (
    turn.rows !== null &&
    turn.gists !== 'pending' &&
    turn.awaited === undefined &&
    nextStep(turn, page) === null
  );
}

/** The turn once `/api/gists` has answered — or has not: `null` is an answer too. */
export function withGists(turn: Turn, response: GistsResponse | null): Turn {
  return { ...turn, gists: response };
}

/**
 * The turn once `/api/chat` has answered, or has not. `closed` is true when the Worker says the
 * allowance is spent — or that questions are paused: the page then asks for no other.
 */
export function withExplanation(
  turn: Turn,
  follow: FollowUp | null,
  response: ChatResponse | null,
  page: PageState,
): { turn: Turn; closed: boolean } {
  const rested = { ...turn, awaited: undefined };
  if (response?.kind === 'explain' && response.corpus === page.corpus) {
    const explanation = { follow, sentences: response.sentences };
    return {
      turn: { ...rested, explanations: [...turn.explanations, explanation] },
      closed: false,
    };
  }
  const closed =
    response?.kind === 'silence' || (response?.kind === 'quiet' && response.why === 'spent');
  return { turn: { ...rested, silent: [...turn.silent, follow] }, closed };
}

/** What the sheet shows for a turn. `last` is true for the turn at the bottom of the thread. */
export function viewOf(turn: Turn, page: PageState, last: boolean): TurnView {
  if (asksForVote(turn.question)) {
    return { plain: null, measures: { kind: 'off_topic' }, ai: null };
  }
  if (turn.silence !== null) {
    const reopen = turn.silence === '' ? null : turn.silence;
    return { plain: null, measures: { kind: 'silence', reopen }, ai: null };
  }
  const { gists } = turn;
  if (gists !== undefined && gists !== null && gists !== 'pending' && gists.kind === 'silence') {
    return { plain: null, measures: { kind: 'silence', reopen: gists.reopen }, ai: null };
  }
  const { objection, cards } = turn.recognised;
  const plain = objection !== null || cards.length > 0 ? turn.recognised : null;

  const rows = rowsOf(turn, page);
  const measures: Measures =
    turn.rows === null
      ? { kind: 'searching' }
      : rows.length === 0
        ? { kind: 'none' }
        : { kind: 'rows', rows, reading: gists === undefined || gists === 'pending' };

  // What was explained stays in the thread, whatever has changed since. What may still be
  // asked — the offer, a follow-up — depends on the page as it is now.
  const open = explainable(turn, page);
  const first = turn.explanations.some((explanation) => explanation.follow === null);
  const waiting = turn.awaited !== undefined;
  const offer = open && last && page.ai === 'offered' && turn.explanations.length === 0 && !waiting;
  const follow =
    open && first && !waiting && page.ai === 'on'
      ? FOLLOW_UPS.filter(
          (kind) =>
            !turn.explanations.some((explanation) => explanation.follow === kind) &&
            !turn.silent.includes(kind),
        )
      : [];
  const ai: AiView | null =
    offer || waiting || turn.explanations.length > 0 || follow.length > 0
      ? { offer, explanations: turn.explanations, waiting, follow }
      : null;
  return { plain, measures, ai };
}
