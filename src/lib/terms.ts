/**
 * « Des mots expliqués » — which acronyms and technical terms a text uses, among those we
 * wrote a short explanation for (data/2026/terms.json).
 *
 * Why it exists. Since D16.60 no AI answers a visitor: what a model was going to explain live
 * — the words of the sentences — is explained by texts written ahead instead. An AI wrote
 * them and another checked them, from general knowledge and never from the book; the sheet
 * says so above them (D16.59, D16.62), and none of them says what the programme provides.
 *
 * Pure, and run on the phone: nothing is sent to find a word, and nothing is kept. The texts
 * it reads are our own sentences on the screen and the question as typed — which, here too,
 * goes nowhere.
 *
 * Two ways of reading a term, because an acronym is not a word:
 *   - one word written with a capital after its first letter, or with a digit (« T2A »,
 *     « PFAS », « 49.3 »): found as written, to the letter and to the case — « CAP » is a
 *     diploma, « cap » is a heading one keeps. Where small letters can mean nothing else, the
 *     file says so (`anyCase`), and « smic », « Ehpad » are found too;
 *   - anything else (« moratoire », « licence d'office », « taxe Zucman »): found as a whole
 *     phrase, whatever the case and the accents, each word with or without a final « s » or
 *     « x ».
 *
 * A wording that stands inside a longer wording of another entry belongs to that entry: in
 * « un référendum d'initiative citoyenne », what is explained is that, not « référendum ».
 */

export interface TermEntry {
  id: string;
  /** The term as it is shown: « T2A », « licence d'office ». */
  term: string;
  /** Other wordings found like the term itself. */
  aliases?: readonly string[];
  /** An acronym also found in small letters, or with one capital: « smic », « Ehpad ». */
  anyCase?: true;
  /** One to three short sentences, in plain words. */
  plain: string;
}

/** How many terms one answer explains: more would bury the sentences they serve. */
export const MAX_TERMS = 4;

/** A letter or a digit as French writes them (see src/lib/notions.ts for why it is spelled out). */
const WORD = '0-9A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u017F';
const EDGE_BEFORE = `(?<![${WORD}])`;
const EDGE_AFTER = `(?![${WORD}])`;

const escaped = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * An acronym: one word, with a digit or a capital after its first letter — read to the letter.
 * A wording of several words is a phrase, whatever capitals it holds: « taxe Zucman » opens a
 * sentence as « Taxe Zucman », and is typed « taxe zucman ».
 */
export const readAsWritten = (wording: string): boolean =>
  !/\s/.test(wording.trim()) && (/\d/.test(wording) || /[A-ZÀ-ÖØ-Þ]/.test(wording.slice(1)));

/**
 * One spelling for a comparison that ignores case and accents — letter for letter, so that a
 * place found in the folded text is the same place in the text itself.
 */
function folded(text: string): string {
  let out = '';
  for (const char of text.normalize('NFC')) {
    // A character outside the basic plane is kept whole: two units in, two units out.
    const base = char.length > 1 ? char : (char.normalize('NFD')[0] ?? char);
    out += char === '’' || char === '‘' ? "'" : /\s/.test(char) ? ' ' : base.toLowerCase();
  }
  return out;
}

/** A phrase as a pattern: its words in a row, each with or without the mark of a plural. */
function phrasePattern(wording: string): string {
  const words = folded(wording)
    .split(/[ ]+/)
    .filter((word) => word !== '')
    .map((word) => {
      const stem = word.length > 3 ? word.replace(/[sx]$/, '') : word;
      return `${escaped(stem)}(?:s|x)?`;
    });
  return words.join('[ ]+');
}

/** How a wording is looked for: in the text as it is, or in its folded spelling. */
interface Reading {
  pattern: RegExp;
  /** True when the text is read as written: to the case and to the accent. */
  asWritten: boolean;
}

/**
 * One pattern per wording, built once: the sheet draws a turn several times, and each drawing
 * reads every wording of the file.
 */
const readings = new Map<string, Reading>();
function readingOf(wording: string, anyCase: boolean): Reading {
  const key = `${anyCase ? '~' : '='}${wording}`;
  let reading = readings.get(key);
  if (reading === undefined) {
    const acronym = readAsWritten(wording);
    const asWritten = acronym && !anyCase;
    const source = asWritten
      ? escaped(wording.normalize('NFC').trim())
      : acronym
        ? // Small letters or capitals, and nothing else: no plural is guessed for an acronym.
          escaped(folded(wording.trim()))
        : phrasePattern(wording);
    reading = { pattern: new RegExp(`${EDGE_BEFORE}${source}${EDGE_AFTER}`, 'gu'), asWritten };
    readings.set(key, reading);
  }
  return reading;
}

/** A place where a wording stands in a text. */
interface Span {
  at: number;
  end: number;
}

/** Every place where one of the wordings of an entry stands in a text. */
function spansOf(entry: TermEntry, text: string, foldedText: string): Span[] {
  const spans: Span[] = [];
  for (const wording of [entry.term, ...(entry.aliases ?? [])]) {
    if (wording.trim() === '') continue;
    const { pattern, asWritten } = readingOf(wording, entry.anyCase === true);
    for (const found of (asWritten ? text : foldedText).matchAll(pattern)) {
      spans.push({ at: found.index, end: found.index + found[0].length });
    }
  }
  return spans;
}

/** True when `span` stands inside `other`, and `other` is longer. */
const within = (span: Span, other: Span): boolean =>
  other.at <= span.at && span.end <= other.end && other.end - other.at > span.end - span.at;

/**
 * The terms a set of texts uses, in the order they first appear — `max` at most, each once.
 * The texts are read in the order given: what the question names comes before what the
 * sentences use, when the question is handed in first.
 */
export function termsIn(
  texts: readonly string[],
  entries: readonly TermEntry[],
  max: number = MAX_TERMS,
): TermEntry[] {
  const found: { entry: TermEntry; at: number }[] = [];
  const seen = new Set<string>();
  let offset = 0;
  for (const raw of texts) {
    const text = raw.normalize('NFC');
    const lower = folded(text);
    const hits = entries
      .map((entry) => ({ entry, spans: spansOf(entry, text, lower) }))
      .filter((hit) => hit.spans.length > 0);
    for (const hit of hits) {
      if (seen.has(hit.entry.id)) continue;
      // What stands inside a longer wording of another entry is that entry's.
      const own = hit.spans.filter(
        (span) =>
          !hits.some(
            (other) => other !== hit && other.spans.some((longer) => within(span, longer)),
          ),
      );
      if (own.length === 0) continue;
      seen.add(hit.entry.id);
      found.push({ entry: hit.entry, at: offset + Math.min(...own.map((span) => span.at)) });
    }
    offset += text.length + 1;
  }
  return found
    .sort((a, b) => a.at - b.at)
    .slice(0, Math.max(0, max))
    .map(({ entry }) => entry);
}

/** A term the sheet explains, and whether the question itself names it. */
export interface Explained {
  entry: TermEntry;
  /** True when the visitor wrote the term. */
  asked: boolean;
}

/**
 * What the sheet explains under a turn: the terms the question names first, then those of the
 * sentences on the screen.
 */
export function explainedFor(
  question: string,
  sentences: readonly string[],
  entries: readonly TermEntry[],
  max: number = MAX_TERMS,
): Explained[] {
  const asked = new Set(termsIn([question], entries, max).map((entry) => entry.id));
  return termsIn([question, ...sentences], entries, max).map((entry) => ({
    entry,
    asked: asked.has(entry.id),
  }));
}

/** Ways of asking what a word means, read in a folded question: « c'est quoi », « définition ». */
const MEANING =
  /c ?'? ?est quoi|c quoi|kesako|quesaco|qu ?'? ?est[- ]ce qu|veut dire|signifi|definition|expli(?:que|cation)|compren(?:ds?|d) (?:pas|rien)/;

/**
 * True when a question asks what a word means, or is little more than the word itself — the
 * explanation of that word is then what was asked, and the sheet shows it first, open. Any
 * other question that happens to hold a term gets its measures first.
 */
export function asksMeaning(question: string): boolean {
  const plain = folded(question).trim();
  return MEANING.test(plain) || plain.split(/ +/).filter((word) => /\w/.test(word)).length <= 3;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** The entries of data/2026/terms.json, or an error that names what does not read. */
export function parseTerms(file: unknown): TermEntry[] {
  if (!isRecord(file) || !Array.isArray(file['entries'])) {
    throw new Error('terms: no list of entries');
  }
  const out: TermEntry[] = [];
  const ids = new Set<string>();
  for (const [index, value] of (file['entries'] as unknown[]).entries()) {
    const where = `terms: entry ${String(index + 1)}`;
    if (!isRecord(value)) throw new Error(`${where} is not an entry`);
    const { id, term, aliases, anyCase, plain } = value;
    if (typeof id !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || id.length > 60) {
      throw new Error(`${where}: its id is not a slug`);
    }
    if (ids.has(id)) throw new Error(`${where}: ${id} is there twice`);
    ids.add(id);
    if (typeof term !== 'string' || term.trim() === '') throw new Error(`${id}: no term`);
    if (typeof plain !== 'string' || plain.trim() === '') throw new Error(`${id}: no text`);
    if (anyCase !== undefined && anyCase !== true) {
      throw new Error(`${id}: anyCase is true, or is not written`);
    }
    const others: string[] = [];
    if (aliases !== undefined) {
      if (!Array.isArray(aliases)) throw new Error(`${id}: aliases is not a list`);
      for (const alias of aliases as unknown[]) {
        if (typeof alias !== 'string' || alias.trim() === '') {
          throw new Error(`${id}: an alias is empty`);
        }
        others.push(alias);
      }
    }
    out.push({
      id,
      term,
      ...(others.length === 0 ? {} : { aliases: others }),
      ...(anyCase === true ? { anyCase: true as const } : {}),
      plain,
    });
  }
  return out;
}
