/**
 * The evaluation set of the model's answer (eval/ask-2026.json, lot I2) — its shape, and the
 * rules it must hold. Shared by its test and by the bench (scripts/bench-ask.ts).
 *
 * The set holds our questions, identifiers and patterns. Never a word of the programme.
 */
import { readFileSync } from 'node:fs';
import { MAX_QUESTION_CHARS, PROPOSITION_ID, type AskKind } from '../src/lib/ask-contract.js';
import { normalize, sectionOf } from '../src/lib/search-core.js';
import type { Manifest } from './aec26-types.js';

export const ASK_SET_PATH = 'eval/ask-2026.json';

export type AskGroup = 'question' | 'objection' | 'variant' | 'hostile' | 'attack' | 'absent';

/** The pages a visitor can end on. `silence` and `local` are states of the site, not answers. */
export type PageKind = Exclude<AskKind, 'silence' | 'local'>;
export const PAGE_KINDS: readonly PageKind[] = [
  'answer',
  'select',
  'reviewed',
  'none',
  'off_topic',
];

export interface AskSetItem {
  id: string;
  group: AskGroup;
  question: string;
  /** The pages that are right for this item, as the visitor sees them after the control. */
  expect: PageKind[];
  /** A written or selected page must cite at least one measure of one of these sections. */
  sections?: string[];
  /** Which of the fifteen re-read answers `reviewed` means. */
  slug?: string;
  /** Measures that must never be cited for this item: homonyms. */
  forbidden?: string[];
  /** Patterns no shown sentence may hold — matched without case or accents. */
  never?: string[];
  /** Patterns that find nothing in the 2026 text, or only `forbidden` (group "absent"). */
  probes?: string[];
  category?: string;
  note_fr?: string;
}

export interface AskSet {
  meta: {
    title_fr: string;
    version: string;
    corpus_version: string;
    built_on: string;
    derived_from: string[];
    counts: Record<AskGroup | 'total', number>;
    expect_fr: string;
    patterns_fr: string;
    absent_fr: string;
    gates_fr: string;
    note_fr: string;
  };
  items: AskSetItem[];
}

export function loadAskSet(path: string = ASK_SET_PATH): AskSet {
  return JSON.parse(readFileSync(path, 'utf8')) as AskSet;
}

const ID_BY_GROUP: Readonly<Record<AskGroup, RegExp>> = {
  question: /^q\d{3}$/,
  objection: /^o\d{2}$/,
  variant: /^v\d{2}$/,
  hostile: /^h\d{2}$/,
  attack: /^x\d{2}$/,
  absent: /^a\d{2}$/,
};

/** `l.euro`, `d'heure`, `qu.il`: forms the folded text no longer has. */
const ELISION = /(?:^|[^a-z])(?:l|d|qu|j|n|s|c|m|t|jusqu|lorsqu|puisqu)[.'’][a-z(]/;

const same = (a: readonly string[], b: readonly string[]): boolean =>
  a.length === b.length && a.every((value, i) => value === b[i]);

/** A `never` or `probes` pattern as it is applied: on text folded by `normalize`. */
export function foldedPattern(source: string): RegExp {
  return new RegExp(source, 'u');
}

/** True when a shown sentence holds something the item says it never may. */
export function breaksNever(item: AskSetItem, sentences: readonly string[]): string | null {
  for (const source of item.never ?? []) {
    const pattern = foldedPattern(source);
    if (sentences.some((sentence) => pattern.test(normalize(sentence)))) return source;
  }
  return null;
}

/**
 * Everything wrong with the set, read against the public manifest and the fifteen objections.
 * Empty when the set may be used.
 */
export function askSetProblems(
  set: AskSet,
  manifest: Manifest,
  objections: readonly { slug: string; objection: string }[],
): string[] {
  const problems: string[] = [];
  const say = (id: string, what: string): void => {
    problems.push(`${id}: ${what}`);
  };
  const sections = new Set(manifest.sections.map((s) => s.id));
  const propositions = new Set(
    manifest.sections.flatMap((s) =>
      s.items.filter((i) => i.kind !== 'paragraph').map((i) => i.id),
    ),
  );
  const slugs = new Set(objections.map((o) => o.slug));

  if (set.meta.corpus_version !== manifest.meta.corpus_version) {
    say(
      'meta',
      `built on corpus ${set.meta.corpus_version}, the manifest is ${manifest.meta.corpus_version}`,
    );
  }
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  for (const item of set.items) {
    counts[item.group] = (counts[item.group] ?? 0) + 1;
    if (seen.has(item.id)) say(item.id, 'identifier used twice');
    seen.add(item.id);
    if (!(item.group in ID_BY_GROUP)) {
      say(item.id, `unknown group ${item.group}`);
      continue;
    }
    if (!ID_BY_GROUP[item.group].test(item.id)) say(item.id, `not an identifier of ${item.group}`);
    const question = item.question.trim();
    if (question === '' || question !== item.question) say(item.id, 'empty or padded question');
    // The field refuses anything longer: an item the page cannot send tests nothing.
    if (question.length > MAX_QUESTION_CHARS) say(item.id, `${String(question.length)} characters`);

    if (item.expect.length === 0) say(item.id, 'no expected page');
    if (new Set(item.expect).size !== item.expect.length) say(item.id, 'an expected page twice');
    for (const kind of item.expect) {
      if (!PAGE_KINDS.includes(kind)) say(item.id, `unknown page ${kind}`);
    }
    const written = item.expect.includes('answer') || item.expect.includes('select');
    if (
      item.expect.includes('answer') !== item.expect.includes('select') &&
      item.group !== 'hostile'
    ) {
      // A refused writing gives a selection: whoever accepts one accepts the other.
      say(item.id, 'accepts a written page without a selection, or the reverse');
    }
    if (item.expect.includes('reviewed') !== (item.slug !== undefined)) {
      say(item.id, '"reviewed" and "slug" go together');
    }
    if (item.slug !== undefined && !slugs.has(item.slug))
      say(item.id, `unknown objection ${item.slug}`);
    if (written && item.group !== 'hostile' && item.group !== 'attack') {
      if ((item.sections ?? []).length === 0)
        say(item.id, 'a written page with no expected section');
    }
    for (const section of item.sections ?? []) {
      if (!sections.has(section)) say(item.id, `section ${section} is not in the manifest`);
    }
    for (const id of item.forbidden ?? []) {
      if (!PROPOSITION_ID.test(id) || !propositions.has(id)) {
        say(item.id, `forbidden ${id} is not a proposition of the manifest`);
      }
      if ((item.sections ?? []).includes(sectionOf(id))) {
        say(item.id, `forbidden ${id} belongs to a section the item expects`);
      }
    }
    for (const source of [...(item.never ?? []), ...(item.probes ?? [])]) {
      try {
        foldedPattern(source);
      } catch {
        say(item.id, `pattern does not compile: ${source}`);
      }
      // Patterns meet folded text: an accent or a capital in one would never match anything —
      // and neither would an elision, which the folding drops (« l'euro » is « euro » there).
      // A probe that can never match is how a subject gets called absent by mistake.
      if (source !== normalize(source)) say(item.id, `pattern is not folded: ${source}`);
      if (ELISION.test(source)) say(item.id, `pattern keeps an elision: ${source}`);
    }

    switch (item.group) {
      case 'question':
        if (!written) say(item.id, 'a question of the dossier expects a written page');
        break;
      case 'objection':
        if (!same(item.expect, ['reviewed']))
          say(item.id, 'an objection expects the re-read answer');
        break;
      case 'variant':
        if (!item.expect.includes('reviewed')) say(item.id, 'a variant accepts the re-read answer');
        break;
      case 'absent':
        if (!same(item.expect, ['none']))
          say(item.id, 'an absent subject expects "none" and nothing else');
        if ((item.probes ?? []).length === 0) say(item.id, 'an absent subject without a probe');
        break;
      case 'hostile':
      case 'attack':
        if (item.category === undefined) say(item.id, 'no category');
        if ((item.note_fr ?? '') === '') say(item.id, 'no note for the judges');
        break;
    }
  }
  for (const [group, expected] of Object.entries(set.meta.counts)) {
    const actual = group === 'total' ? set.items.length : (counts[group] ?? 0);
    if (actual !== expected)
      say('meta', `counts.${group} says ${String(expected)}, the file holds ${String(actual)}`);
  }

  // The fifteen objections, word for word and in order; every one of them also as a variant.
  const listed = set.items.filter((i) => i.group === 'objection');
  if (
    !same(
      listed.map((i) => `${i.slug ?? ''}|${i.question}`),
      objections.map((o) => `${o.slug}|${o.objection}`),
    )
  ) {
    say('objections', 'not the fifteen of data/2026/riposte.json, in its order');
  }
  const varied = new Set(set.items.filter((i) => i.group === 'variant').map((i) => i.slug));
  for (const slug of slugs) if (!varied.has(slug)) say('variants', `no variant of ${slug}`);
  return problems;
}
