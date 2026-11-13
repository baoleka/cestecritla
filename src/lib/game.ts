/**
 * « Où est-ce écrit ? » — the proof of every word of the game, from public files only
 * (D16.10, D16.15, lot J0). Pure: it is handed the word list, the manifest, the search index
 * and the map of the 2025 edition, and reads nothing by itself.
 *
 * A word of the game is a word of the programme shown under our name, alone, in large type:
 * the one extract of the site that has no sentence around it to explain it. So the build
 * refuses to show a word it cannot account for. For each word it proves, or stops:
 *
 *   - the word is one word, and its stem is a term of the index — it is written in a measure;
 *   - the measure it is pinned to is the one whose hash was pinned: the text has not moved;
 *   - that measure holds the stem, and the link to it can land on the sentence;
 *   - the stem is in none of the titles the game offers as an answer — a title that held it
 *     would give the answer away, or point at the wrong tile;
 *   - no section where the stem is written is one of those no word is taken from (rule 11 of
 *     07-mecaniques §7.11, as D16.26 left it: sections on bodies, borders, police and wars lend
 *     no word to a game — nor do the sections new in 2026 the editor has not let in. Their
 *     titles are tiles like any other: the table of contents the game shows is whole).
 *
 * What it computes, so that no number is ever typed: where else the word is written, in how
 * many sections, and the three tiles the hint points at.
 *
 * What it cannot see — the word as written, its other meanings, the prose around the measures —
 * is checked where the text is, by scripts/words-2026.ts, which attests the list by its hash.
 */
import { sectionOf, terms } from './search-core.js';

export interface GameWord {
  /** Position in the reading order of the game: the fixed first round is slots 0, 1 and 2. */
  slot: number;
  id: string;
  /** The word as the book writes it, in lower case. */
  word: string;
  /** The measure the word is shown in, and the hash of its text when it was chosen. */
  pin: { id: string; sha256: string };
}

export interface GameWordsFile {
  meta: {
    corpus_version: string;
    pool: {
      /** Rule 11, in the identifiers it was written in (2025). */
      sensitive_2025: string[];
      /** Sections with no ancestor in 2025: "play", "exclude", or null while not judged. */
      judged: Record<string, 'play' | 'exclude' | null>;
    };
    pool_reviewed_on: string | null;
    validated: { on: string | null; list_sha256: string | null };
    attested: {
      list_sha256: string | null;
      corpus_version: string | null;
      on: string | null;
      /** The local checks the list went through, by name (`LOCAL_CHECKS`). */
      checks?: string[] | null;
    };
    note_fr: string;
  };
  words: GameWord[];
}

/**
 * What scripts/words-2026.ts checks where the text is, by name. An attestation lists the checks
 * it went through: when one is added here, every earlier attestation stops counting — a list
 * attested before a rule existed was not held to it.
 */
export const LOCAL_CHECKS: readonly string[] = ['written', 'affirm', 'prose', 'same'];

/** The parts of the public files the proof reads. */
export interface GameSources {
  manifest: {
    meta: { corpus_version: string };
    parts: { id: string; order: number; title: string }[];
    chapters: { id: string; partId: string; number: number; title: string }[];
    sections: {
      id: string;
      chapterId: string;
      partId: string;
      title: string;
      items: { id: string; kind: string; sha256: string; locator?: string | null }[];
    }[];
  };
  /** The serialised MiniSearch index of data/2026/search-index.json (`index`). */
  index: {
    documentIds: Record<string, string>;
    fieldIds: Record<string, number>;
    index: [string, Record<string, Record<string, number>>][];
  };
  /** 2025 section → 2026 sections (data/2026/id-map-2025.json). */
  idMap: { sections: Record<string, string[]> };
}

export interface ProvenWord extends GameWord {
  stem: string;
  sectionId: string;
  chapterId: string;
  partId: string;
  /** 1 to 6. */
  part: number;
  /** Every section where a measure holds the stem, in the order of the book. */
  sections: string[];
  /** The other parts where it is written, by number. */
  otherParts: number[];
  /** Three tiles the hint points at, the right one among them. */
  hint: number[];
}

/**
 * Sections no word of the game is ever taken from: the heirs of rule 11, and what the editor
 * has not let in. Since D16.26 this is all it means. Their titles are tiles like every other —
 * a list of tiles is the table of contents of the book, and a title left out of it would be a
 * chapter the game hides — but a word shown alone is never one of theirs, even validated by
 * mistake: the proof below refuses it.
 */
export function wordlessSections(file: GameWordsFile, sources: GameSources): Set<string> {
  const out = new Set<string>();
  for (const old of file.meta.pool.sensitive_2025) {
    for (const heir of sources.idMap.sections[old] ?? []) out.add(heir);
  }
  for (const [id, judgement] of Object.entries(file.meta.pool.judged)) {
    if (judgement !== 'play') out.add(id);
  }
  return out;
}

/** Sections of the 2026 edition no section of 2025 leads to: the ones only the editor can judge. */
export function sectionsWithoutAncestor(sources: GameSources): string[] {
  const reached = new Set(Object.values(sources.idMap.sections).flat());
  return sources.manifest.sections.map((s) => s.id).filter((id) => !reached.has(id));
}

/** Stem → identifiers of the propositions whose own text holds it (never their context). */
export function postings(index: GameSources['index']): Map<string, string[]> {
  const field = String(index.fieldIds['text']);
  const out = new Map<string, string[]>();
  for (const [term, fields] of index.index) {
    const docs = fields[field];
    if (docs === undefined) continue;
    out.set(
      term,
      Object.keys(docs).flatMap((short) => {
        const id = index.documentIds[short];
        return id === undefined ? [] : [id];
      }),
    );
  }
  return out;
}

/** A small, stable number from a string: the same build always points the hint the same way. */
function seed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Three parts among the six, the right one among them, in the order of the book. */
export function hintParts(wordId: string, corpus: string, right: number, parts: number): number[] {
  const others = Array.from({ length: parts }, (_, i) => i + 1).filter((n) => n !== right);
  const start = seed(`${corpus}:${wordId}`);
  const first = others[start % others.length] ?? others[0] ?? right;
  const rest = others.filter((n) => n !== first);
  const second = rest[(start >>> 8) % rest.length] ?? rest[0] ?? right;
  return [...new Set([right, first, second])].sort((a, b) => a - b);
}

const WORD = /^\p{Ll}[\p{Ll}'’-]*\p{Ll}$/u;
const WORD_ID = /^w\d{3}$/;

/**
 * Proves every word, or says what is wrong — every problem, not the first: a list is fixed in
 * one pass. `proven` holds only the words with no problem.
 */
export function proveWords(
  file: GameWordsFile,
  sources: GameSources,
): { proven: ProvenWord[]; problems: string[] } {
  const problems: string[] = [];
  const { manifest } = sources;
  if (file.meta.corpus_version !== manifest.meta.corpus_version) {
    problems.push(
      `the list was written for corpus ${file.meta.corpus_version}, the manifest is ${manifest.meta.corpus_version}`,
    );
  }
  // The pool itself: every section without an ancestor must be named, so that none is in the
  // game by having been forgotten.
  for (const id of sectionsWithoutAncestor(sources)) {
    if (!(id in file.meta.pool.judged)) problems.push(`pool: ${id} is new in 2026 and not listed`);
  }
  const wordless = wordlessSections(file, sources);
  const where = postings(sources.index);
  const sectionById = new Map(manifest.sections.map((s) => [s.id, s]));
  const order = new Map(manifest.sections.map((s, i) => [s.id, i]));
  const partOrder = new Map(manifest.parts.map((p) => [p.id, p.order]));
  const items = new Map(
    manifest.sections.flatMap((s) => s.items.map((item) => [item.id, item] as const)),
  );
  const stemsOf = (title: string): Set<string> => new Set(terms(title));
  const partStems = new Set(manifest.parts.flatMap((p) => [...stemsOf(p.title)]));

  const proven: ProvenWord[] = [];
  const ids = new Set<string>();
  const slots = new Set<number>();
  const stems = new Set<string>();
  const shownIn = new Set<string>();
  for (const word of file.words) {
    const found: string[] = [];
    const say = (what: string): void => {
      found.push(`${word.id} « ${word.word} »: ${what}`);
    };
    if (!WORD_ID.test(word.id)) say('not an identifier (w000)');
    if (ids.has(word.id)) say('identifier used twice');
    ids.add(word.id);
    if (!Number.isInteger(word.slot) || word.slot < 0 || slots.has(word.slot))
      say('slot taken or invalid');
    slots.add(word.slot);
    if (!WORD.test(word.word)) say('not one word in lower case');

    const own = terms(word.word);
    const stem = own[0] ?? '';
    if (own.length !== 1) say('not a single word of its own (a stop word, or several words)');
    if (stems.has(stem)) say('another word of the list has the same stem');
    stems.add(stem);
    const docs = where.get(stem);
    if (docs === undefined) say('its stem is in no measure of the index');

    const pin = items.get(word.pin.id);
    const sectionId = sectionOf(word.pin.id);
    const section = sectionById.get(sectionId);
    if (pin === undefined || section === undefined || pin.kind === 'paragraph') {
      say(`${word.pin.id} is not a proposition of the manifest`);
    } else {
      if (pin.sha256 !== word.pin.sha256) say(`${word.pin.id} changed since it was pinned`);
      if (typeof pin.locator !== 'string')
        say(`a link to ${word.pin.id} cannot land on the sentence`);
    }
    if (docs !== undefined && !docs.includes(word.pin.id))
      say(`${word.pin.id} does not hold the stem`);

    // One word per section: the end of a round says « trois endroits », and it must be true.
    if (shownIn.has(sectionId)) say(`another word of the list is shown in ${sectionId}`);
    shownIn.add(sectionId);

    const sections = [...new Set((docs ?? []).map(sectionOf))].sort(
      (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
    );
    for (const id of sections) {
      if (wordless.has(id)) say(`also written in ${id}, which never holds a word of the game`);
      // A place the manifest does not know could be counted but never named.
      if (!sectionById.has(id)) say(`its stem is in ${id}, which is not a section of the manifest`);
    }
    // No title offered as an answer may hold the stem: the six parts, the chapters of the
    // right part, the sections of the right chapter.
    if (partStems.has(stem)) say('its stem is in the title of a part');
    if (section !== undefined) {
      for (const chapter of manifest.chapters.filter((c) => c.partId === section.partId)) {
        if (stemsOf(chapter.title).has(stem)) say(`its stem is in the title of ${chapter.id}`);
      }
      for (const sibling of manifest.sections.filter((s) => s.chapterId === section.chapterId)) {
        if (stemsOf(sibling.title).has(stem)) say(`its stem is in the title of ${sibling.id}`);
      }
    }
    problems.push(...found);
    if (found.length > 0 || section === undefined) continue;
    const part = partOrder.get(section.partId) ?? 0;
    const otherParts = [
      ...new Set(sections.map((id) => partOrder.get(sectionById.get(id)?.partId ?? '') ?? 0)),
    ]
      .filter((n) => n !== part && n > 0)
      .sort((a, b) => a - b);
    proven.push({
      ...word,
      stem,
      sectionId,
      chapterId: section.chapterId,
      partId: section.partId,
      part,
      sections,
      otherParts,
      hint: hintParts(word.id, manifest.meta.corpus_version, part, manifest.parts.length),
    });
  }
  // Slots are a reading order with no hole: the first round is the first three.
  const sorted = [...slots].sort((a, b) => a - b);
  if (sorted.some((slot, i) => slot !== i)) problems.push('slots are not 0, 1, 2… without a hole');
  return { proven: proven.sort((a, b) => a.slot - b.slot), problems };
}
