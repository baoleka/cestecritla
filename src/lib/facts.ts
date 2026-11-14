/**
 * The numbers /exactitude publishes — every one read from a file a tool wrote, none typed.
 *
 * A page that reports measurements is only worth reading if the measurements cannot drift from
 * the page: the search quality is the record written by scripts/eval-2026.ts, which CI holds to
 * a fresh evaluation; the browser verification is the record written by
 * scripts/verify-2026.ts; the quotation shares are the manifest's own account of itself, which
 * CI recomputes (scripts/leak.test.ts).
 */
import { readFileSync } from 'node:fs';
import type { SearchEvalFile } from '../../scripts/eval-2026.ts';
import type { VerificationFile } from '../../scripts/verify-2026.ts';
import { cards, ripostes } from './editorial.ts';
import { manifest, quotes } from './edition.ts';
import { isLocatorDisplay, type LocatorDisplay } from './first-words.ts';
import { gameSite, gameWords } from './game-data.ts';

/** A published JSON file. The caller names the shape it expects: the cast is visible there. */
function read(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Where the words a link carries may also be read: the citation policy says it (D16.32). A
 * value this build does not know is read as the prudent one — inside the links only.
 */
export function locatorDisplay(): LocatorDisplay {
  const policy = read('data/2026/exposure-policy.json');
  const value =
    typeof policy === 'object' && policy !== null && 'locator_display' in policy
      ? policy.locator_display
      : undefined;
  return isLocatorDisplay(value) ? value : 'href';
}

/** `0.1686` → `16,86`: a French percentage, without its sign. */
export const percent = (share: number, digits = 2): string =>
  (share * 100).toFixed(digits).replace('.', ',');

export interface SearchFacts {
  questions: number;
  inFirstFive: number;
  first: number;
  /** Share of the expected sections found among the first three, as a French percentage. */
  recall3: string;
}

/** Written by scripts/eval-2026.ts --write; scripts/search-2026.test.ts holds it to a fresh run. */
export function searchFacts(): SearchFacts {
  const file = read('data/2026/search-eval.json') as SearchEvalFile;
  if (file.corpus_version !== manifest().meta.corpus_version) {
    throw new Error(
      'data/2026/search-eval.json describes another corpus: run eval-2026.ts --write',
    );
  }
  return {
    questions: file.questions,
    inFirstFive: file.in_first_five,
    first: file.first,
    recall3: percent(file.recall_at_3, 1),
  };
}

export function verification(): VerificationFile {
  const file = read('data/2026/verification.json') as VerificationFile;
  if (file.corpus_version !== manifest().meta.corpus_version) {
    throw new Error(
      'data/2026/verification.json describes another corpus: run verify-2026.ts --write',
    );
  }
  return file;
}

export interface QuoteFacts {
  incipit: string;
  locator: string;
  whole: number;
  wholeShare: string;
  total: string;
  anchorOnly: number;
}

export function quoteFacts(): QuoteFacts {
  const e = manifest().meta.exposure;
  return {
    incipit: percent(e.incipit_words / e.proposition_words),
    locator: percent(e.locator_words / e.proposition_words),
    whole: quotes().quotes.length,
    wholeShare: percent(e.quote_words / e.proposition_words),
    total: percent(e.covered_words / e.proposition_words),
    anchorOnly: e.locators_anchor_only,
  };
}

/** How many of our own texts are still waiting to be re-read (D0.27). */
export function pendingReviewCount(): number {
  return [...ripostes(), ...cards()].filter((entry) => entry.review.status !== 'reviewed').length;
}

export interface LaunchFacts {
  /** The LCEN declaration to the host is archived (P0.5): only then may the notice say so. */
  lcenDeclared: boolean;
}

export function launchFacts(): LaunchFacts {
  const launch = read('data/launch.json') as { lcen_declared_on: string | null };
  return { lcenDeclared: launch.lcen_declared_on !== null };
}

export interface GameFacts {
  /** Words the game shows, one at a time. */
  words: number;
  /** Their share of the words of the propositions, as a percentage — computed, never typed. */
  share: string;
}

/**
 * What the game publishes of the book (D16.15): its words, counted, and their share of the
 * words of the propositions. Null in a build of a site that does not play.
 */
export function gameFacts(): GameFacts | null {
  // Only where the game is shown: the scrutin build must not describe a game it does not have.
  if (!gameSite().on) return null;
  const words = gameWords().words.length;
  const total = manifest().meta.exposure.proposition_words;
  return { words, share: `${percent(words / total, 3)}\u00a0%` };
}
