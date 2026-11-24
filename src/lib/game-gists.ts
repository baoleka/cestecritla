/**
 * The sentences of the game (D19.2, D19.5, D19.6) — as a build reads them, from a PUBLIC file.
 *
 * Since 18 November 2026 a card of « Où est-ce écrit ? » may show, under the place of its word,
 * the sentence written ahead for the measure that word is pinned to: what the seven personas
 * asked for (« le jeu dit où, jamais quoi »). These sentences are OUR words — written and checked
 * by an AI, read by no person one by one, and labelled as such wherever they show. The 1,069 of
 * them live in the private base and are served three at a time to who asks (PLAN-CHAT); 48 —
 * one per word of the game, and only those — are published with the game, in
 * data/2026/game-gists.json. Nothing here can read the text of the programme: it is not in the
 * repository.
 *
 * Two questions are answered here, and nowhere else:
 *
 *   - may THIS build show them? Only where the site asks questions (the mode of the host, D19.5:
 *     cutting « Demander » cuts them too, and a page of mode "off" names no AI), only while the
 *     editor's written decision keeps our sentences served during the campaign (D16.65, D16.78),
 *     and only if the file is fit — below. Otherwise the card is the card of before: the place
 *     and the link. A test build may pretend the editor's validation, as for the words
 *     (CEL_GAME_TEST=1): it goes to dist-ask/, which nothing ever deploys;
 *   - is the file fit? Every sentence is pinned to the measure of a word of the list as that
 *     word pins it (same identifier, same fingerprint: a measure that moved drops its sentence),
 *     taken from the deposit the site serves (`deposit_sha256` — the game shows the sentences
 *     « Demander » shows, byte for byte), one line a screen can hold, and the file as it stands
 *     is the one the editor agreed to publish (`validated`).
 *
 * They are in the file of the game and nowhere in the HTML (D19.6): the round without script
 * keeps the card of before, and no page a search engine reads carries a sentence of an AI.
 *
 * Learning note — why a predicate on data and not a flag in the code. « Is there a sentence on
 * this card? » has four honest answers that change without a line of code changing: the editor
 * cuts « Demander »; he takes back his decision about the campaign; a measure of the book moves;
 * he has not yet said yes to this file. Each is a fact in a JSON file with a date and a name.
 * Read here, they give one build per state of those facts — and the build of each state is
 * tested (scripts/game-gists.test.ts), which no `if (FEATURE)` buried in a component is.
 */
import { existsSync, readFileSync } from 'node:fs';
import { modeFor, type AskHost, type SiteMode } from './ask-mode.js';
import { MAX_GIST_CHARS, parseGistsResponse } from './chat-contract.js';
import { isDay } from './days.js';
import { canonicalHash } from './fingerprint.js';
import type { GameWordsFile } from './game.js';
import { wordsFingerprint } from './word-links.js';

export const GAME_GISTS_PATH = 'data/2026/game-gists.json';
const ASK_PATH = 'data/2026/ask.json';

/** One sentence, pinned to its measure as the word of the game pins it. */
export interface GameGist {
  /** The measure: the identifier of the pin of a word of the list. */
  id: string;
  /** The fingerprint of that measure as published — the pin's own. */
  sha256: string;
  /** For a sub-measure, the fingerprint of the measure it details, as the deposit holds it. */
  lead_sha256?: string;
  /** The sentence: ours, one line, as the base serves it. */
  text: string;
}

export interface GameGistsFile {
  meta: {
    title: string;
    corpus_version: string;
    /** The list these sentences were taken for (`wordsFingerprint`, src/lib/word-links.ts). */
    words_sha256: string;
    /** The deposit they were taken from (`gists.sha256` of data/2026/ask.json). */
    deposit_sha256: string;
    /**
     * Who wrote and read them: "session" — an AI (D16.57, D16.59). Typed as what a file can
     * hold, not as what it must: `gameGistsNotReady` is what refuses anything else.
     */
    written_by: string;
    /** `false`: no person read them one by one. The label of the card is held to this. */
    read_by_a_person: boolean;
    /**
     * The seal of the file (`gameGistsFingerprint`): its sentences as they stand AND what it
     * claims of them above — the book, the list, the deposit, who wrote them, who read them,
     * the cards left to their link.
     */
    sha256: string;
    /**
     * The editor's word that this very file may be published with the game (D19.2): a date, his
     * name for it, and the fingerprint it was given on. A session never writes it without him.
     */
    validated: { on: string | null; by: 'editor' | null; sha256: string | null };
    /**
     * Words whose card keeps its link alone ON PURPOSE (their sentence stays in the base): a
     * sentence can be faithful and still not belong under a game word. Absent when there is none.
     */
    link_only?: string[];
    note_fr: string;
  };
  gists: GameGist[];
}

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** What a file says of its own sentences: sealed with them. */
export type GameGistsClaims = Pick<
  GameGistsFile['meta'],
  | 'corpus_version'
  | 'words_sha256'
  | 'deposit_sha256'
  | 'written_by'
  | 'read_by_a_person'
  | 'link_only'
>;

/**
 * The seal of a file: its sentences, each as the file holds it and in the file's order, AND
 * what the file claims of them. The editor's validation is given on this one value — so a
 * claim cannot be edited under it: a file whose `deposit_sha256` was retyped after a new
 * deposit is no longer the file he agreed to (found by the security review of 19/11/2026: the
 * first seal covered the rows alone).
 */
export function gameGistsFingerprint(claims: GameGistsClaims, gists: readonly GameGist[]): string {
  return canonicalHash([
    claims.corpus_version,
    claims.words_sha256,
    claims.deposit_sha256,
    claims.written_by,
    claims.read_by_a_person,
    [...(claims.link_only ?? [])].sort(),
    gists.map((gist) => [gist.id, gist.sha256, gist.lead_sha256 ?? null, gist.text]),
  ]);
}

/** The file, or null where there is none (a checkout made before the editor's go). */
export function readGameGists(path: string = GAME_GISTS_PATH): GameGistsFile | null {
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as GameGistsFile;
}

/**
 * True when a card could not show this sentence: longer than a read sentence may be, or not one
 * line. The reader of the sheet is asked, not a copy of its rules (src/lib/chat-contract.ts):
 * what « Demander » would refuse to show, the game does not show either.
 */
const unfit = (id: string, text: unknown): boolean => {
  if (typeof text !== 'string' || text.trim() === '' || text.length > MAX_GIST_CHARS) return true;
  const answer = { kind: 'gists', corpus: '0'.repeat(16), gists: [{ id, text }], ai: false };
  return parseGistsResponse(answer) === null;
};

export interface GameGistsContext {
  /** The corpus version of the manifest. */
  corpus: string;
  /** The words of the game, with their pins. */
  words: GameWordsFile['words'];
  /** The deposit the site serves: `gists.sha256` of data/2026/ask.json. */
  deposit: string | null;
  /** A test build: the editor's validation is pretended, nothing else is. */
  test?: boolean;
}

/**
 * Why the file may not be shown, in words — empty when it is fit. Identifiers and rules only:
 * never a sentence.
 */
export function gameGistsNotReady(file: GameGistsFile, context: GameGistsContext): string[] {
  const out: string[] = [];
  const { meta, gists } = file;
  if (meta.corpus_version !== context.corpus) {
    out.push('the sentences were taken on another state of the book: meta.corpus_version');
  }
  if (meta.words_sha256 !== wordsFingerprint(context.words)) {
    out.push('the list of words changed since the sentences were taken: meta.words_sha256');
  }
  if (context.deposit === null || meta.deposit_sha256 !== context.deposit) {
    out.push('the sentences are not those of the deposit the site serves: meta.deposit_sha256');
  }
  if (meta.written_by !== 'session' || meta.read_by_a_person) {
    out.push('the file does not say who wrote the sentences, and that no person read them');
  }
  const pins = new Map(context.words.map((word) => [word.pin.id, word.pin.sha256]));
  const seen = new Set<string>();
  for (const gist of gists) {
    const pin = pins.get(gist.id);
    if (pin === undefined) out.push(`${gist.id}: a sentence on no measure of the game`);
    else if (pin !== gist.sha256) out.push(`${gist.id}: its measure moved since the sentence`);
    if (seen.has(gist.id)) out.push(`${gist.id}: two sentences for one measure`);
    seen.add(gist.id);
    if (unfit(gist.id, gist.text)) out.push(`${gist.id}: not one line a card can hold`);
  }
  if (meta.sha256 !== gameGistsFingerprint(meta, gists)) {
    out.push(
      'the sentences, or what the file says of them, changed after it was sealed: meta.sha256',
    );
  }
  if (context.test !== true) {
    const { on, by, sha256 } = meta.validated;
    if (!isDate(on) || by !== 'editor') {
      out.push('the editor has not agreed to publish this file: meta.validated');
    } else if (sha256 !== meta.sha256) {
      out.push('the file changed after the editor agreed to publish it: meta.validated.sha256');
    }
  }
  return out;
}

/**
 * The editor's written decision that our sentences stay served during the campaign (D16.65,
 * D16.78) — the decision clause of `campaignAllows` (src/worker/chat.ts), without its clock.
 *
 * The Worker serves freely until 1 January 2027 and asks for this decision from that hour on. A
 * file cannot stop itself on a date, so the game asks for the decision at ALL times: stricter
 * before the campaign, the same during it. scripts/game-gists.test.ts holds the two rules to
 * the same answer on the first hour of the campaign.
 */
export function campaignDecided(ask: unknown): boolean {
  if (typeof ask !== 'object' || ask === null) return false;
  const decision: unknown = (ask as Record<string, unknown>)['campaign'];
  if (typeof decision !== 'object' || decision === null) return false;
  const { serve, decided_on: on, decided_by: by } = decision as Record<string, unknown>;
  // A day that exists, as the Worker reads it (src/worker/chat.ts, `isDay`): « 2026-02-30 »
  // passed here while the Worker refused it (review of 24/11/2026).
  return serve === true && by === 'editor' && isDay(on);
}

export interface GameGistsDecision {
  /** What this host does with a question (src/lib/ask-mode.ts). */
  mode: SiteMode;
  /** data/2026/ask.json, as read. */
  ask: unknown;
  /** The file of the sentences, or null. */
  file: GameGistsFile | null;
  context: GameGistsContext;
}

/**
 * The sentences a build may put on its cards, by measure — or null when it may put none.
 * Pure: the mode, the two files and the list are passed in.
 */
export function gameGistsOf(decision: GameGistsDecision): ReadonlyMap<string, string> | null {
  const { file } = decision;
  if (file === null || gameGistsSilence(decision).length > 0) return null;
  return new Map(file.gists.map((gist) => [gist.id, gist.text]));
}

/**
 * Why a build puts no sentence on its cards — nothing when it puts them. The same rule as
 * `gameGistsOf`, in words: a build does not FAIL on a file it will not show, it keeps every
 * card at its link alone — so whoever deploys is told why (scripts/deploy.ts), and a file
 * retouched by hand cannot go unnoticed as « the sentences are simply not there ».
 */
export function gameGistsSilence(decision: GameGistsDecision): string[] {
  const { mode, ask, file, context } = decision;
  if (mode !== 'chat') return ['this host does not answer questions (mode « off »)'];
  if (file === null) return [`${GAME_GISTS_PATH} is not on this machine`];
  return [
    ...(campaignDecided(ask) ? [] : ['the decision on the campaign is not the editor’s, dated']),
    ...gameGistsNotReady(file, context),
  ];
}

/** The deposit data/2026/ask.json says the site serves, or null. */
export const depositOf = (ask: unknown): string | null => {
  if (typeof ask !== 'object' || ask === null) return null;
  const gists: unknown = (ask as Record<string, unknown>)['gists'];
  if (typeof gists !== 'object' || gists === null) return null;
  const { sha256 } = gists as Record<string, unknown>;
  return typeof sha256 === 'string' ? sha256 : null;
};

export interface GameGistsBuild {
  /** The host the build is made for; a build made without the flag is production's. */
  host?: AskHost;
  /** The mode, when the caller already knows it (a test build, the build in dist/). */
  mode?: SiteMode;
  test?: boolean;
}

/**
 * The same, for the build under way: read from the committed files. `scripts/deploy.ts` and the
 * gates pass the mode of the build they look at, so that what they compute is what it holds.
 */
export function gameGists(
  words: GameWordsFile['words'],
  corpus: string,
  build: GameGistsBuild = {},
): ReadonlyMap<string, string> | null {
  return gameGistsOf(decisionFor(words, corpus, build));
}

/** Why the build under way puts no sentence on its cards (`gameGistsSilence`), or nothing. */
export function gameGistsWhyNot(
  words: GameWordsFile['words'],
  corpus: string,
  build: GameGistsBuild = {},
): string[] {
  return gameGistsSilence(decisionFor(words, corpus, build));
}

function decisionFor(
  words: GameWordsFile['words'],
  corpus: string,
  build: GameGistsBuild,
): GameGistsDecision {
  const ask: unknown = JSON.parse(readFileSync(ASK_PATH, 'utf8'));
  const test = build.test ?? process.env['CEL_GAME_TEST'] === '1';
  const host = build.host ?? (process.env['CEL_HOST'] === 'preview' ? 'preview' : 'apex');
  return {
    mode: build.mode ?? modeFor(ask, host),
    ask,
    file: readGameGists(),
    context: { corpus, words, deposit: depositOf(ask), test },
  };
}
