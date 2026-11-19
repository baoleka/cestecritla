/**
 * The lexicon of the book (PLAN-MOTS): where each explained word is written. Pure — tested on an
 * invented book (scripts/lexicon.test.ts), run on the real one by scripts/lexicon-2026.ts, on the
 * machine that holds the text, and nowhere else.
 *
 * What it gives is identifiers only: for each section, the words of data/2026/terms.json that
 * its text uses — its title, its measures and their points, the paragraphs between them. No
 * word of the book leaves it (D15.2): the published map says which explained word a section
 * uses, never where, never how often, never next to what.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { PrivateItem } from './aec26-types.js';
import { terms } from '../src/lib/search-core.js';
import { explainedTerms } from '../src/lib/words-data.js';
import { CARD_PREFIX, spansIn, type TermWording } from '../src/lib/terms.js';

/** The texts of a unit of the book, in order: its title, then each item and its points. */
/**
 * The book's text, as the engine of the words can read it: without the soft hyphens the official
 * pages leave in some words (« médico-­psychologiques »). The search drops them too
 * (src/lib/search-core.ts, `normalize`); the engine keeps every character in place, so they are
 * taken out before it reads.
 */
export const readable = (text: string): string => text.replace(/\u00ad/g, '');

export function unitTexts(title: string, items: readonly PrivateItem[]): string[] {
  const out = [readable(title)];
  const walk = (list: readonly PrivateItem[]): void => {
    for (const item of list) {
      out.push(readable(item.text));
      walk(item.subMeasures ?? []);
    }
  };
  walk(items);
  return out;
}

/**
 * The explained words a set of texts uses: their identifiers, each once, sorted. `cards` are
 * read with them and never returned: a word inside the term of a card is the card's (D20.14).
 */
export function wordsOf(
  texts: readonly string[],
  wordings: readonly TermWording[],
  cards: readonly TermWording[] = [],
): string[] {
  const ids = new Set<string>();
  for (const text of texts) {
    for (const span of spansIn(text, [...cards, ...wordings])) ids.add(span.entry.id);
  }
  return [...ids].filter((id) => !id.startsWith(CARD_PREFIX)).sort();
}

/**
 * For each section of the book, the explained words its text uses — sections that use none are
 * left out. Keys in the order of the book.
 */
export function placesOf(
  corpus: { sections: readonly { id: string; title: string; items: readonly PrivateItem[] }[] },
  wordings: readonly TermWording[],
  cards: readonly TermWording[] = [],
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const section of corpus.sections) {
    const ids = wordsOf(unitTexts(section.title, section.items), wordings, cards);
    if (ids.length > 0) out[section.id] = ids;
  }
  return out;
}

/** What the map says, in numbers only: what a tool may print. */
export function placesSummary(places: Readonly<Record<string, readonly string[]>>): string {
  const counts = Object.values(places).map((ids) => ids.length);
  const words = new Set(Object.values(places).flat());
  const most = counts.length === 0 ? 0 : Math.max(...counts);
  return `${String(counts.length)} sections use explained words — ${String(words.size)} words placed, ${String(most)} in a section at most`;
}

// ---------------------------------------------------------------------------------------------
// The judged vocabulary (data/2026/vocabulary.json; PLAN-MOTS, D20.8): every stem of what the
// site shows — the index of the book, and our own texts —, judged once. What makes « no word
// blocks » a property a gate can hold: a finite vocabulary is read whole, where a list of words
// to catch never closes (the lesson of data/2026/sensitive.json).
// ---------------------------------------------------------------------------------------------

/** Every stem of the index and of our texts, judged (PLAN-MOTS, lot 9): the file the gates read. */
export const VOCABULARY_PATH = 'data/2026/vocabulary.json';

/**
 * Each stem in one class:
 *   plain    a word a reader entering seconde knows;
 *   explain  a word that needs explaining — the entries whose wordings hold it;
 *   watch    a common word that may stand in a technical sense — the entries that cover that
 *            sense where the book uses it (its occurrences are read one by one, locally);
 *   names    a proper name — the entry that explains it, or what it is (a person, a brand, a
 *            place, a body) when nothing needs explaining.
 * A stem of digits alone is a number: judged by nobody.
 */
export interface Vocabulary {
  meta: {
    /** The stems of the index this file judged — its count and fingerprint. */
    index: { terms: number; sha256: string };
    judged_on: string;
    judged_by: string;
    second_judge: string;
    note_fr: string;
  };
  plain: string[];
  explain: Record<string, string[]>;
  watch: Record<string, string[]>;
  names: Record<string, string>;
}

/** What a name that needs no entry is (`names`). */
export const NAME_KINDS: readonly string[] = ['person', 'brand', 'place', 'body', 'other'];

/** The fingerprint of a list of stems: sorted, one per line. */
export function vocabularyFingerprint(stems: readonly string[]): string {
  return createHash('sha256')
    .update([...stems].sort().join('\n'))
    .digest('hex');
}

/** Every stem to judge in exactly one class — or digits alone — and no class holds a stem of nothing. */
export function partitionProblems(vocabulary: Vocabulary, stems: Iterable<string>): string[] {
  const out: string[] = [];
  const classOf = new Map<string, string[]>();
  const put = (stem: string, kind: string): void => {
    classOf.set(stem, [...(classOf.get(stem) ?? []), kind]);
  };
  for (const stem of vocabulary.plain) put(stem, 'plain');
  for (const stem of Object.keys(vocabulary.explain)) put(stem, 'explain');
  for (const stem of Object.keys(vocabulary.watch)) put(stem, 'watch');
  for (const stem of Object.keys(vocabulary.names)) put(stem, 'names');
  const universe = new Set(stems);
  for (const stem of universe) {
    const kinds = classOf.get(stem) ?? [];
    if (/^\d+$/.test(stem)) {
      if (kinds.length > 0) out.push(`${stem}: a number, judged ${kinds.join(' and ')}`);
    } else if (kinds.length !== 1) {
      out.push(`${stem}: ${kinds.length === 0 ? 'not judged' : `judged ${kinds.join(' and ')}`}`);
    }
  }
  for (const stem of classOf.keys()) {
    if (!universe.has(stem)) out.push(`${stem}: a stem of nothing the site shows`);
  }
  return out;
}

/**
 * Each stem judged hard is held by the entries it names — one of whose wordings yields that
 * stem — and every name points at an entry, or says what it is.
 */
export function coverageProblems(
  vocabulary: Vocabulary,
  entries: readonly TermWording[],
): string[] {
  const out: string[] = [];
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const stemsOf = (entry: TermWording): Set<string> =>
    new Set([entry.term, ...(entry.aliases ?? [])].flatMap((wording) => terms(wording)));
  for (const [stem, ids] of Object.entries(vocabulary.explain)) {
    if (ids.length === 0) out.push(`${stem}: hard, and no entry holds it`);
    for (const id of ids) {
      const entry = byId.get(id);
      if (entry === undefined) out.push(`${stem}: ${id} is no entry`);
      else if (!stemsOf(entry).has(stem)) out.push(`${stem}: no wording of ${id} yields it`);
    }
  }
  for (const [stem, ids] of Object.entries(vocabulary.watch)) {
    for (const id of ids) if (!byId.has(id)) out.push(`${stem}: ${id} is no entry`);
  }
  for (const [stem, what] of Object.entries(vocabulary.names)) {
    if (!byId.has(what) && !NAME_KINDS.includes(what)) {
      out.push(`${stem}: ${what} is neither an entry nor a kind of name`);
    }
  }
  return out;
}

/**
 * The hard stems a text uses outside any wording of an entry — counted, not placed: a stem the
 * text holds more often than the wordings found in it do is used, at least once, unexplained.
 * Counting spares mapping places back through the folding of the search (accents, elisions,
 * thousands): both sides are read by the same `terms`.
 */
export function uncoveredIn(
  text: string,
  hard: ReadonlySet<string>,
  wordings: readonly TermWording[],
): string[] {
  const count = (stems: readonly string[]): Map<string, number> => {
    const out = new Map<string, number>();
    for (const stem of stems) if (hard.has(stem)) out.set(stem, (out.get(stem) ?? 0) + 1);
    return out;
  };
  const nfc = text.normalize('NFC');
  const used = count(terms(nfc));
  const covered = count(
    spansIn(nfc, wordings).flatMap((span) => terms(nfc.slice(span.at, span.end))),
  );
  return [...used].filter(([stem, n]) => (covered.get(stem) ?? 0) < n).map(([stem]) => stem);
}

/**
 * What `npm run lexicon -- --attest` writes in data/2026/terms.json, as `meta.attested`
 * (PLAN-MOTS, lot 13). The closure the CI holds on our public texts, that every hard stem lies
 * within the span of an entry or a card, is checked here on the whole book, prose included, and
 * on our sentences. Only the machine that holds them can check it. The CI cannot read them, so
 * it holds the attestation to the state of the book, the wordings and the vocabulary it was made on.
 */
export interface Attestation {
  on: string;
  /** The session, under its mandate (D20.3), or the editor. */
  by: string;
  corpus_version: string;
  /** The wordings it read with: the words and the cards (`wordingsFingerprint`). */
  wordings_sha256: string;
  /** The stems the public vocabulary judges hard (`vocabularyFingerprint` of `explain`). */
  explain_sha256: string;
  /** What it read: the units of the book, and our sentences. */
  units: number;
  sentences: number;
  /** The hard stems it held to account: the public ones, and those only the book uses. */
  hard_stems: number;
  /** Occurrences of a hard stem outside every wording. Never written unless zero. */
  uncovered: number;
}

/** The occurrences of a hard stem outside every wording, one `where: stem` each. */
export function closureProblems(
  texts: readonly Placed[],
  hard: ReadonlySet<string>,
  wordings: readonly TermWording[],
): string[] {
  return texts.flatMap(({ where, text }) =>
    uncoveredIn(text, hard, wordings).map((stem) => `${where}: ${stem}`),
  );
}

/** Why an attestation does not vouch for the words as they stand — nothing, when it does. */
export function attestationProblems(
  attested: unknown,
  now: Pick<Attestation, 'corpus_version' | 'wordings_sha256' | 'explain_sha256'>,
): string[] {
  if (typeof attested !== 'object' || attested === null) {
    return ['no attestation: npm run lexicon -- --attest'];
  }
  const a = attested as Partial<Record<keyof Attestation, unknown>>;
  const out: string[] = [];
  if (typeof a.on !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(a.on)) out.push('attested on no day');
  if (a.by !== 'session' && a.by !== 'editor')
    out.push('attested by neither the session nor the editor');
  if (a.corpus_version !== now.corpus_version) out.push('attested on another state of the book');
  if (a.wordings_sha256 !== now.wordings_sha256) {
    out.push('a word or a card changed since the attestation: attest again');
  }
  if (a.explain_sha256 !== now.explain_sha256) {
    out.push('the hard stems changed since the attestation: attest again');
  }
  for (const key of ['units', 'sentences', 'hard_stems'] as const) {
    const n = a[key];
    if (typeof n !== 'number' || !Number.isInteger(n) || n <= 0) out.push(`attested ${key}: none`);
  }
  if (a.uncovered !== 0) out.push('the attestation leaves hard words unheld');
  return out;
}

// ---------------------------------------------------------------------------------------------
// The inventory (PLAN-MOTS, lot 9): what the book and our sentences use, counted on this
// machine. Pure: the texts come in; what is written under the private folder is the caller's.
// ---------------------------------------------------------------------------------------------

/** A text with where it stands: a unit of the book (its id) or one of our sentences. */
export interface Placed {
  where: string;
  text: string;
}

interface Unit {
  id: string;
  title: string;
  items: readonly PrivateItem[];
}

/** The book as the inventory reads it: every unit, prose included. */
export interface BookUnits {
  introduction: Unit;
  parts: readonly Unit[];
  chapters: readonly Unit[];
  sections: readonly Unit[];
}

/** The items of a unit and their points, each with its id. */
const placedItems = (items: readonly PrivateItem[]): Placed[] =>
  items.flatMap((item) => [
    { where: item.id, text: readable(item.text) },
    ...placedItems(item.subMeasures ?? []),
  ]);

/** Every text of the book — titles, measures, points, paragraphs — with the id of what holds it. */
export function bookTexts(book: BookUnits): Placed[] {
  return [book.introduction, ...book.parts, ...book.chapters, ...book.sections].flatMap((unit) => [
    { where: unit.id, text: readable(unit.title) },
    ...placedItems(unit.items),
  ]);
}

/** The words of a text as written: letters and digits, with the apostrophes and hyphens inside. */
const WORD = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;

/** For each stem, the forms that yield it, counted — how a judge reads a stem. */
export function formsOf(texts: Iterable<string>): Map<string, Map<string, number>> {
  const out = new Map<string, Map<string, number>>();
  for (const text of texts) {
    for (const [form] of text.normalize('NFC').matchAll(WORD)) {
      for (const stem of terms(form)) {
        const forms = out.get(stem) ?? new Map<string, number>();
        forms.set(form, (forms.get(form) ?? 0) + 1);
        out.set(stem, forms);
      }
    }
  }
  return out;
}

/** The number of times each stem stands in some texts. */
export function stemCounts(texts: Iterable<string>): Map<string, number> {
  const out = new Map<string, number>();
  for (const text of texts) for (const stem of terms(text)) out.set(stem, (out.get(stem) ?? 0) + 1);
  return out;
}

/** One line of the table of stems a judge reads: where the stem stands, how often, its forms. */
export interface StemRow {
  stem: string;
  /** In the public index (and so in the public file of the vocabulary), or only in private texts. */
  public: boolean;
  /** Measures of the index that hold it. */
  measures: number;
  inBook: number;
  inSentences: number;
  inOurs: number;
  /** Its most frequent forms, as written. */
  forms: string[];
}

export function stemRows(input: {
  measures: ReadonlyMap<string, number>;
  book: ReadonlyMap<string, number>;
  sentences: ReadonlyMap<string, number>;
  ours: ReadonlyMap<string, number>;
  forms: ReadonlyMap<string, ReadonlyMap<string, number>>;
}): StemRow[] {
  const stems = new Set([
    ...input.measures.keys(),
    ...input.book.keys(),
    ...input.sentences.keys(),
    ...input.ours.keys(),
  ]);
  return [...stems]
    .filter((stem) => !/^\d+$/.test(stem))
    .sort((a, b) => a.localeCompare(b, 'fr'))
    .map((stem) => ({
      stem,
      public: input.measures.has(stem) || input.ours.has(stem),
      measures: input.measures.get(stem) ?? 0,
      inBook: input.book.get(stem) ?? 0,
      inSentences: input.sentences.get(stem) ?? 0,
      inOurs: input.ours.get(stem) ?? 0,
      forms: [...(input.forms.get(stem) ?? new Map<string, number>())]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
        .slice(0, 3)
        .map(([form]) => form),
    }));
}

/** What a pattern of the inventory finds: as written, how often, and where. */
export interface Found {
  text: string;
  count: number;
  where: string[];
}

/** Every match of a pattern in some texts, counted by what `key` makes of it. */
export function findAll(
  texts: readonly Placed[],
  pattern: RegExp,
  key: (match: RegExpMatchArray) => string = (match) => match[0],
): Found[] {
  const by = new Map<string, Found>();
  for (const { where, text } of texts) {
    for (const match of text.normalize('NFC').matchAll(pattern)) {
      const found = by.get(key(match)) ?? { text: key(match), count: 0, where: [] };
      found.count += 1;
      if (!found.where.includes(where)) found.where.push(where);
      by.set(found.text, found);
    }
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'fr'));
}

/** Two capitals or more in a word, digits and hyphens allowed: « CSG », « COP28 », « RN-1 ». */
export const ACRONYM =
  /(?<![\p{L}\p{N}])\p{Lu}[\p{Lu}\p{N}&]*\p{Lu}[\p{Lu}\p{N}&]*(?:-\p{Lu}[\p{Lu}\p{N}]*)*(?![\p{L}\p{N}])/gu;

/** What names an instrument, a body or a device — read with the five words that follow it. */
const HEADS = [
  'loi',
  'lois',
  'traité',
  'traités',
  'accord',
  'accords',
  'directive',
  'directives',
  'règlement',
  'code',
  'charte',
  'convention',
  'pacte',
  'protocole',
  'ordonnance',
  'décret',
  'article',
  'plan',
  'fonds',
  'agence',
  'autorité',
  'conseil',
  'cour',
  'haut',
  'institut',
  'office',
  'observatoire',
  'commission',
  'comité',
  'mécanisme',
  'bouclier',
  'régime',
  'statut',
  'label',
];
export const INSTRUMENT = new RegExp(
  `(?<![\\p{L}])(?:${HEADS.join('|')})(?:[\\s ]+[\\p{L}\\p{N}’'-]+){1,5}`,
  'giu',
);

/** A number and its unit, the unit kept: « 40 TWh », « 1,5 °C », « 300 000 hectares ». */
export const UNIT =
  /\d[\d\s ,.]*\s*(TWh|GWh|MWh|kWh|GW|MW|kW|Mt|Gt|kt|ppm|ppb|km²|km2|km|m²|m2|m³|m3|ha|hectares?|°C|‰|dB|µg|mg|Md€|M€|k€|teqCO2|CO2e|équivalent CO2|ETP|équivalents? temps plein)(?![\p{L}])/gu;

/** Latin locutions, and a few words of Latin the French uses as they are. */
export const LATIN =
  /(?<![\p{L}])(?:a priori|a posteriori|ad hoc|de facto|de jure|erga omnes|ex ante|ex post|ex nihilo|in fine|in situ|in extremis|intra-muros|extra-muros|per capita|prorata|pro rata|quorum|statu quo|sine qua non|vice versa|mutatis mutandis|ipso facto|sui generis|numerus clausus|habeas corpus|modus operandi|manu militari|ad vitam|ad nauseam|stricto sensu|lato sensu|a fortiori|bis|ter|nota bene|alias|agenda|memorandum|moratorium|ultimatum|consortium|critérium|maximum|minimum|optimum|quantum|référendum|referendum)(?![\p{L}])/giu;

/** The small words that bind two words into one name: « principe de faveur », « fonds vautours ». */
const LINKS = new Set([
  'de',
  'du',
  'des',
  'à',
  'au',
  'aux',
  'en',
  'sur',
  'pour',
  'par',
  'sans',
  'sous',
]);

/**
 * Two words side by side, or two words and the small word that binds them, where one of the two
 * is rare — the shape of an expression a dictionary lists: « fonds vautours », « principe de
 * faveur », « prix plancher ». Counted as written, in lower case; a comma, a full stop or a
 * bracket between them breaks the pair.
 */
export function pairsIn(texts: readonly Placed[], rare: (stem: string) => boolean): Found[] {
  const pairs: Placed[] = [];
  for (const { where, text } of texts) {
    for (const run of text.normalize('NFC').split(/[.,;:!?()«»"“”[\]—–]+/u)) {
      const words = run
        .split(/\s+/u)
        .map((word) => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
        .filter((word) => word !== '');
      for (let at = 0; at + 1 < words.length; at += 1) {
        const first = words[at] ?? '';
        const next = words[at + 1] ?? '';
        const third = words[at + 2];
        const stemOf = (word: string): string | null => terms(word)[0] ?? null;
        const a = stemOf(first);
        if (a === null) continue;
        // « d'égalité » is a link and a word at once.
        const elided = /^[dl][’'](.+)$/u.exec(next);
        if (elided !== null) {
          const b = stemOf(elided[1] ?? '');
          if (b !== null && (rare(a) || rare(b))) pairs.push({ where, text: `${first} ${next}` });
          continue;
        }
        const b = stemOf(next);
        if (b !== null) {
          if (rare(a) || rare(b)) pairs.push({ where, text: `${first} ${next}` });
          continue;
        }
        if (LINKS.has(next.toLowerCase()) && third !== undefined) {
          const c = stemOf(third);
          if (c !== null && (rare(a) || rare(c))) {
            pairs.push({ where, text: `${first} ${next} ${third}` });
          }
        }
      }
    }
  }
  return findAll(pairs, /^.+$/gu, (match) => match[0].toLowerCase());
}

/**
 * What the site shows in our own words, and the official titles: the explanations and their
 * examples, our cards, our answers, the sentences of the game, the titles of the book — public
 * files all. Read against the judged vocabulary (scripts/lexicon.test.ts), each must explain
 * the hard words it uses; the inventory counts their stems (scripts/lexicon-2026.ts).
 */
export function publicTexts(): Placed[] {
  const read = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
  const out: Placed[] = [];
  for (const entry of explainedTerms()) {
    out.push({ where: `terms:${entry.id}`, text: entry.plain });
    if (entry.example !== undefined) {
      out.push({ where: `terms:${entry.id} (example)`, text: entry.example });
    }
  }
  const glossary = read('data/2026/glossary.json') as {
    entries: {
      id: string;
      term: string;
      plain: string;
      why?: string;
      objection?: { text: string; answer: string };
    }[];
  };
  for (const card of glossary.entries) {
    const texts = [card.plain, card.why, card.objection?.text, card.objection?.answer];
    for (const text of texts) if (text !== undefined) out.push({ where: `mot:${card.id}`, text });
  }
  const riposte = read('data/2026/riposte.json') as {
    entries: { slug: string; objection: string; answer: string; avoid: string }[];
  };
  for (const answer of riposte.entries) {
    for (const text of [answer.objection, answer.answer, answer.avoid]) {
      out.push({ where: `r:${answer.slug}`, text });
    }
  }
  const gists = read('data/2026/game-gists.json') as { gists: { id: string; text: string }[] };
  for (const gist of gists.gists) out.push({ where: `jeu:${gist.id}`, text: gist.text });
  const manifest = read('data/2026/manifest.json') as {
    parts: { id: string; title: string }[];
    chapters: { id: string; title: string }[];
    sections: { id: string; title: string }[];
  };
  for (const unit of [...manifest.parts, ...manifest.chapters, ...manifest.sections]) {
    out.push({ where: `titre:${unit.id}`, text: unit.title });
  }
  return out;
}
