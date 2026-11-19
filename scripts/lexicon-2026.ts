/**
 * The lexicon of the 2026 edition (PLAN-MOTS) — a local tool: the text of the book is private,
 * and this runs only on the machine that holds it, by the session that may read it (D20.1),
 * never by a sub-agent.
 *
 *   npm run lexicon -- --places    writes data/2026/term-places.json: for each section, the
 *                                  explained words its text uses — identifiers only
 *   npm run lexicon -- --check     says whether that file is the one the book and the words of
 *                                  data/2026/terms.json give today; exits 1 if not
 *   npm run lexicon -- --stems     the inventory (lot 9): every stem the book, our sentences and
 *                                  our public texts use, where it stands, how often, its forms —
 *                                  written under private/lexicon/, the table the session judges
 *   npm run lexicon -- --patterns  the acronyms, named instruments, units, Latin and expressions
 *                                  of the book and our sentences, counted, under private/lexicon/
 *   npm run lexicon -- --vocabulary  data/2026/vocabulary.json: the class of every public stem,
 *                                  from the session's judgments, and the entries that hold the
 *                                  hard ones; refuses while a stem the site shows is not judged
 *   npm run lexicon -- --attest    the closure of the whole book and of our sentences: every
 *                                  hard stem they use is within a word or a card; written in
 *                                  data/2026/terms.json (meta.attested), refused otherwise
 *   npm run lexicon -- --seal      data/2026/terms.json sealed as it stands (meta.sealed, D20.15):
 *                                  for the new charter, only once attested; prints the twelve
 *                                  characters the decision of the day must carry
 *
 * It prints identifiers and numbers. Never a word of the text: a tool that printed what it reads
 * would be the shortest way for the book to end up in a terminal log (D15.6).
 *
 * After any change to the wordings of data/2026/terms.json, run `--places` again: the gate of
 * the public file (scripts/lexicon.test.ts) holds it to the wordings it was computed with.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { cardWordings, termsIn } from '../src/lib/terms.js';
import {
  TERM_PLACES_PATH as PLACES_PATH,
  TERMS_PATH,
  explainedTerms,
  wordingsFingerprint,
} from '../src/lib/words-data.js';
import type { PrivateCorpus } from './aec26-types.js';
import {
  ACRONYM,
  INSTRUMENT,
  LATIN,
  UNIT,
  attestationProblems,
  bookTexts,
  closureProblems,
  findAll,
  formsOf,
  pairsIn,
  placesOf,
  placesSummary,
  publicTexts,
  stemCounts,
  stemRows,
  VOCABULARY_PATH,
  vocabularyFingerprint,
  type Attestation,
  type Found,
  type Placed,
  type StemRow,
  type Vocabulary,
} from './lexicon-core.js';
import { terms } from '../src/lib/search-core.js';
import { canonicalHash } from '../src/lib/fingerprint.js';
import { PRIVATE_CORPUS } from './probe-2026.js';

const NOTE_FR =
  "Où chaque mot expliqué est écrit dans le livre : pour chaque section, les identifiants des mots de data/2026/terms.json que son texte emploie (son titre, ses mesures et leurs points, les paragraphes entre eux), triés. Les sections qui n'en emploient aucun n'y sont pas. Écrit par scripts/lexicon-2026.ts --places, sur la machine qui tient le texte du livre, par la session seule (D20.1) : aucun mot du livre, seulement des identifiants de sections et de mots. Il ne dit ni où dans la section, ni combien de fois. La fiche de chaque section montre ces mots, expliqués, sous une ligne qu'on ouvre (PLAN-MOTS, lot 4). À refaire après tout changement des formulations de terms.json : wordings_sha256 dit sur lesquelles il a été calculé.";

interface PlacesFile {
  meta: { corpus_version: string; wordings_sha256: string; note_fr: string };
  sections: Record<string, string[]>;
}

function compute(): PlacesFile {
  if (!existsSync(PRIVATE_CORPUS)) {
    throw new Error(`lexicon: ${PRIVATE_CORPUS} is not on this machine`);
  }
  const corpus = JSON.parse(readFileSync(PRIVATE_CORPUS, 'utf8')) as PrivateCorpus;
  const entries = explainedTerms();
  // Our cards are read with the words: a word inside the term of a card is the card's (D20.14).
  const cards = cardWordings(
    (
      JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as {
        entries: { id: string; term: string }[];
      }
    ).entries,
  );
  return {
    meta: {
      corpus_version: corpus.meta.corpus_version,
      wordings_sha256: wordingsFingerprint([...cards, ...entries]),
      note_fr: NOTE_FR,
    },
    sections: placesOf(corpus, entries, cards),
  };
}

const serialised = (file: PlacesFile): string => `${JSON.stringify(file, null, 2)}\n`;

// ---------------------------------------------------------------------------------------------
// The inventory (PLAN-MOTS, lot 9). What comes from the book is written under the private
// folder and never printed: the terminal shows numbers.
// ---------------------------------------------------------------------------------------------

/** Where the inventory is written: on this machine only, ignored by git. */
const INVENTORY = 'private/lexicon';
/** Our 1,069 sentences, as the session read them (D16.57): the last line of each measure. */
const SENTENCES = 'private/gists/verdicts.jsonl';

/** Our sentences: for each measure, the last text read. */
function ourSentences(): Placed[] {
  if (!existsSync(SENTENCES)) throw new Error(`lexicon: ${SENTENCES} is not on this machine`);
  const last = new Map<string, string>();
  for (const line of readFileSync(SENTENCES, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    const read = JSON.parse(line) as { id?: unknown; text?: unknown };
    if (typeof read.id === 'string' && typeof read.text === 'string') last.set(read.id, read.text);
  }
  return [...last].map(([where, text]) => ({ where, text }));
}

/** How many measures of the public index hold each stem. */
function measuresOf(): Map<string, number> {
  const file = JSON.parse(readFileSync('data/2026/search-index.json', 'utf8')) as {
    index: { index: [string, Record<string, Record<string, unknown>>][] };
  };
  return new Map(
    file.index.index.map(([stem, fields]) => [
      stem,
      new Set(Object.values(fields).flatMap((docs) => Object.keys(docs))).size,
    ]),
  );
}

/**
 * `--stems`: every stem the book, our sentences and our public texts use, with where it stands,
 * how often, and its forms — the table the session judges (private/lexicon/stems.tsv).
 */
function stems(): number {
  if (!existsSync(PRIVATE_CORPUS))
    throw new Error(`lexicon: ${PRIVATE_CORPUS} is not on this machine`);
  const book = bookTexts(JSON.parse(readFileSync(PRIVATE_CORPUS, 'utf8')) as PrivateCorpus);
  const sentences = ourSentences();
  const ours = publicTexts();
  const text = (placed: readonly Placed[]): string[] => placed.map((p) => p.text);
  // The forms of the book first: a stem the book does not use is read in our words.
  const forms = formsOf([...text(book), ...text(sentences), ...text(ours)]);
  const rows = stemRows({
    measures: measuresOf(),
    book: stemCounts(text(book)),
    sentences: stemCounts(text(sentences)),
    ours: stemCounts(text(ours)),
    forms,
  });
  mkdirSync(INVENTORY, { recursive: true });
  const header = 'stem\tpublic\tmeasures\tbook\tsentences\tours\tforms';
  const lines = rows.map((row) =>
    [
      row.stem,
      row.public ? 'yes' : 'no',
      row.measures,
      row.inBook,
      row.inSentences,
      row.inOurs,
      row.forms.join(' | '),
    ].join('\t'),
  );
  writeFileSync(`${INVENTORY}/stems.tsv`, `${[header, ...lines].join('\n')}\n`);
  // What the session reads to judge: the most frequent form of each stem, fifteen to a line —
  // public stems apart from the others, which are judged for the attestation alone.
  for (const [name, keep] of [
    ['forms-public.txt', (row: StemRow) => row.public],
    ['forms-private.txt', (row: StemRow) => !row.public],
  ] as const) {
    const forms = rows.filter(keep).map((row) => row.forms[0] ?? row.stem);
    const chunks: string[] = [];
    for (let at = 0; at < forms.length; at += 15) chunks.push(forms.slice(at, at + 15).join(' '));
    writeFileSync(`${INVENTORY}/${name}`, `${chunks.join('\n')}\n`);
  }
  const count = (keep: (row: StemRow) => boolean): string => String(rows.filter(keep).length);
  console.log(
    `lexicon: ${INVENTORY}/stems.tsv written — ${String(rows.length)} stems: ` +
      `${count((r) => r.public)} public (${count((r) => r.measures > 0)} in the index), ` +
      `${count((r) => !r.public)} only in the book or our sentences; ` +
      `${count((r) => r.inBook > 0)} in the book, ${count((r) => r.inSentences > 0)} in our sentences`,
  );
  return 0;
}

/**
 * `--patterns`: what the book and our sentences name that a list of stems does not show — the
 * acronyms with their case, the named instruments and bodies, the units, the Latin, and the
 * expressions where a rare word stands with another. Each counted, with where it stands, and
 * whether a word of data/2026/terms.json already covers it.
 */
function patterns(): number {
  if (!existsSync(PRIVATE_CORPUS))
    throw new Error(`lexicon: ${PRIVATE_CORPUS} is not on this machine`);
  const book = bookTexts(JSON.parse(readFileSync(PRIVATE_CORPUS, 'utf8')) as PrivateCorpus);
  const all = [...book, ...ourSentences()];
  const entries = explainedTerms();
  const measures = measuresOf();
  const inBook = stemCounts(book.map((placed) => placed.text));
  // Rare: in three measures of the index at most — or, for the prose the index does not hold,
  // three times in the book at most.
  const rare = (stem: string): boolean => (measures.get(stem) ?? inBook.get(stem) ?? 0) <= 3;
  const covered = (text: string): boolean => termsIn([text], entries, 1).length > 0;
  mkdirSync(INVENTORY, { recursive: true });
  const write = (name: string, found: readonly Found[]): string => {
    const lines = found.map((f) =>
      [f.text, f.count, covered(f.text) ? 'covered' : '', f.where.slice(0, 6).join(' ')].join('\t'),
    );
    writeFileSync(
      `${INVENTORY}/${name}`,
      `${['text\tcount\tcovered\twhere', ...lines].join('\n')}\n`,
    );
    return `${String(found.length)} ${name.replace('.tsv', '')} (${String(found.filter((f) => !covered(f.text)).length)} not covered)`;
  };
  const lower = (match: RegExpMatchArray): string => match[0].toLowerCase();
  console.log(
    `lexicon: ${INVENTORY}/ — ${[
      write('acronyms.tsv', findAll(all, ACRONYM)),
      write('instruments.tsv', findAll(all, INSTRUMENT, lower)),
      write(
        'units.tsv',
        findAll(all, UNIT, (match) => match[1] ?? match[0]),
      ),
      write('latin.tsv', findAll(all, LATIN, lower)),
      write('pairs.tsv', pairsIn(all, rare)),
    ].join(', ')}`,
  );
  return 0;
}

/** The judgments of the stems, under the private folder: `stem<TAB>class` per line (P, E, NE, W, N:kind). */
const JUDGED = /^judged.*\.tsv$/;

/** Every judgment of a stem the session has written, the later files winning. */
function judgments(): Map<string, string> {
  const out = new Map<string, string>();
  const files = existsSync(INVENTORY)
    ? readdirSync(INVENTORY)
        .filter((f) => JUDGED.test(f))
        .sort()
    : [];
  for (const file of files) {
    for (const line of readFileSync(`${INVENTORY}/${file}`, 'utf8').split('\n').slice(1)) {
      const [stem, verdict] = line.split('\t');
      if (stem !== undefined && stem !== '' && verdict !== undefined && verdict !== '') {
        out.set(stem, verdict);
      }
    }
  }
  return out;
}

const VOCABULARY_NOTE_FR =
  "Chaque racine de ce que le site montre — l'index du livre et nos propres textes —, jugée une fois pour un élève qui entre en seconde générale (D20.9) : claire (plain), à expliquer (explain : les entrées qui la tiennent), à surveiller (watch : un mot courant qui peut avoir un sens technique, et les entrées qui couvrent ce sens), ou nom propre (names : ce qu'il est quand rien n'est à expliquer). Jugé par la session, une IA, et à part, pour les racines de l'index, par un autre modèle sur la seule liste ; leur désaccord a été arbitré par la session. Aucune personne ne l'a relu. Les racines que seuls la prose du livre ou nos phrases emploient se jugent hors du dépôt, et ne sont jamais publiées. Écrit par scripts/lexicon-2026.ts --vocabulary ; scripts/lexicon.test.ts en tient la partition, et, pour la charte 2, la couverture et la fermeture.";

/**
 * `--vocabulary`: data/2026/vocabulary.json — the class of every public stem, from the session's
 * judgments, and the entries (and cards) that hold each hard stem, from data/2026/terms.json.
 * Refuses while a stem the site shows is not judged: those are listed under the private folder.
 */
function vocabulary(): number {
  const index = [...measuresOf().keys()];
  const universe = new Set([...index, ...publicTexts().flatMap(({ text }) => terms(text))]);
  const judged = judgments();
  const unjudged = [...universe].filter((stem) => !/^\d+$/.test(stem) && !judged.has(stem));
  if (unjudged.length > 0) {
    writeFileSync(`${INVENTORY}/unjudged.txt`, `${unjudged.sort().join('\n')}\n`);
    console.error(
      `lexicon: ${String(unjudged.length)} stem(s) the site shows are not judged — ${INVENTORY}/unjudged.txt`,
    );
    return 1;
  }
  const cards = cardWordings(
    (
      JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as {
        entries: { id: string; term: string }[];
      }
    ).entries,
  );
  const holders = new Map<string, string[]>();
  for (const entry of [...cards, ...explainedTerms()]) {
    for (const wording of [entry.term, ...(entry.aliases ?? [])]) {
      for (const stem of terms(wording)) {
        holders.set(stem, [...new Set([...(holders.get(stem) ?? []), entry.id])].sort());
      }
    }
  }
  const file: Vocabulary = {
    meta: {
      index: { terms: index.length, sha256: vocabularyFingerprint(index) },
      judged_on: new Date().toISOString().slice(0, 10),
      judged_by: 'session',
      second_judge: 'another model, on the index stems',
      note_fr: VOCABULARY_NOTE_FR,
    },
    plain: [],
    explain: {},
    watch: {},
    names: {},
  };
  for (const stem of [...universe].filter((s) => !/^\d+$/.test(s)).sort()) {
    const verdict = judged.get(stem) ?? 'P';
    if (verdict === 'E' || verdict === 'NE') file.explain[stem] = holders.get(stem) ?? [];
    else if (verdict === 'W') file.watch[stem] = holders.get(stem) ?? [];
    else if (verdict.startsWith('N:')) file.names[stem] = verdict.slice(2);
    else file.plain.push(stem);
  }
  writeFileSync(VOCABULARY_PATH, `${JSON.stringify(file, null, 1)}\n`);
  const held = Object.values(file.explain).filter((ids) => ids.length > 0).length;
  console.log(
    `lexicon: ${VOCABULARY_PATH} written — ${String(universe.size)} stems: ${String(file.plain.length)} plain, ` +
      `${String(Object.keys(file.explain).length)} to explain (${String(held)} held by an entry or a card), ` +
      `${String(Object.keys(file.watch).length)} to watch, ${String(Object.keys(file.names).length)} names`,
  );
  return 0;
}

/**
 * The session's judgments of the stems that only the prose of the book or our sentences use
 * (lot 9): one form and its class a line, the later files winning. They are never published.
 */
const PRIVATE_JUDGMENTS = `${INVENTORY}/judge`;

/** The hard stems that only the book or our sentences use, as the session judged their forms. */
function privateHardStems(publicStems: ReadonlySet<string>): Set<string> {
  const judged = new Map<string, string>();
  const files = existsSync(PRIVATE_JUDGMENTS)
    ? readdirSync(PRIVATE_JUDGMENTS)
        .filter((f) => f.startsWith('session-'))
        .sort()
    : [];
  for (const file of files) {
    for (const line of readFileSync(`${PRIVATE_JUDGMENTS}/${file}`, 'utf8').split('\n')) {
      const judgedLine = /^(.*\S)\s+(\S+)$/.exec(line.trim());
      if (judgedLine === null) continue;
      const stems = terms(judgedLine[1] ?? '');
      const stem = stems[0];
      if (stems.length === 1 && stem !== undefined && !publicStems.has(stem)) {
        judged.set(stem, judgedLine[2] ?? '');
      }
    }
  }
  return new Set(
    [...judged].filter(([, verdict]) => verdict === 'E' || verdict === 'NE').map(([stem]) => stem),
  );
}

/**
 * `--attest`: the closure of the whole book, prose included, and of our sentences (every hard
 * stem they use lies within the span of an entry or a card), written in data/2026/terms.json
 * as `meta.attested`. Refuses, and writes the occurrences under the private folder, while one
 * is not held.
 */
function attest(): number {
  if (!existsSync(PRIVATE_CORPUS))
    throw new Error(`lexicon: ${PRIVATE_CORPUS} is not on this machine`);
  const corpus = JSON.parse(readFileSync(PRIVATE_CORPUS, 'utf8')) as PrivateCorpus;
  const book = bookTexts(corpus);
  const sentences = ourSentences();
  const vocabulary = JSON.parse(readFileSync(VOCABULARY_PATH, 'utf8')) as Vocabulary;
  const explain = Object.keys(vocabulary.explain);
  const publicStems = new Set([
    ...vocabulary.plain,
    ...explain,
    ...Object.keys(vocabulary.watch),
    ...Object.keys(vocabulary.names),
  ]);
  const hard = new Set([...explain, ...privateHardStems(publicStems)]);
  const cards = cardWordings(
    (
      JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as {
        entries: { id: string; term: string }[];
      }
    ).entries,
  );
  const wordings = [...cards, ...explainedTerms()];
  const problems = closureProblems([...book, ...sentences, ...publicTexts()], hard, wordings);
  if (problems.length > 0) {
    writeFileSync(`${INVENTORY}/unattested.txt`, `${problems.join('\n')}\n`);
    console.error(
      `lexicon: ${String(problems.length)} occurrence(s) of a hard stem outside every wording — ${INVENTORY}/unattested.txt`,
    );
    return 1;
  }
  const file = JSON.parse(readFileSync(TERMS_PATH, 'utf8')) as { meta: Record<string, unknown> };
  const attested: Attestation = {
    on: new Date().toISOString().slice(0, 10),
    by: 'session',
    corpus_version: corpus.meta.corpus_version,
    wordings_sha256: wordingsFingerprint(wordings),
    explain_sha256: vocabularyFingerprint(explain),
    units: book.length,
    sentences: sentences.length,
    hard_stems: hard.size,
    uncovered: 0,
  };
  file.meta.attested = attested;
  writeFileSync(TERMS_PATH, `${JSON.stringify(file, null, 2)}\n`);
  console.log(
    `lexicon: ${TERMS_PATH} attested — ${String(book.length)} units of the book and ${String(sentences.length)} sentences read, ` +
      `${String(hard.size)} hard stems, every occurrence within a word or a card`,
  );
  return 0;
}

/**
 * `--seal`: data/2026/terms.json sealed as it stands (D20.15). The seal is the canonical
 * fingerprint of its entries, with today's date, by the session under its mandate (D20.3), and
 * the passes the file already lists. A file of the new charter is sealed only once it is attested
 * on these very words, cards and hard stems. The first twelve characters it prints must appear
 * in the decision of the day (scripts/launch.ts, `wordsBlockers`).
 */
function seal(): number {
  const file = JSON.parse(readFileSync(TERMS_PATH, 'utf8')) as {
    meta: Record<string, unknown>;
    entries: unknown;
  };
  if (file.meta.charter === 2) {
    const vocabulary = JSON.parse(readFileSync(VOCABULARY_PATH, 'utf8')) as Vocabulary;
    const manifest = JSON.parse(readFileSync('data/2026/manifest.json', 'utf8')) as {
      meta: { corpus_version: string };
    };
    const cards = cardWordings(
      (
        JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as {
          entries: { id: string; term: string }[];
        }
      ).entries,
    );
    const problems = attestationProblems(file.meta.attested, {
      corpus_version: manifest.meta.corpus_version,
      wordings_sha256: wordingsFingerprint([...cards, ...explainedTerms()]),
      explain_sha256: vocabularyFingerprint(Object.keys(vocabulary.explain)),
    });
    if (problems.length > 0) {
      console.error(`lexicon: not sealed — ${problems.join('; ')}`);
      return 1;
    }
  }
  const previous = file.meta.sealed as { passes?: unknown } | undefined;
  const sha256 = canonicalHash(file.entries);
  const on = new Date().toISOString().slice(0, 10);
  file.meta.sealed = { sha256, on, by: 'session', passes: previous?.passes ?? [] };
  writeFileSync(TERMS_PATH, `${JSON.stringify(file, null, 2)}\n`);
  console.log(
    `lexicon: ${TERMS_PATH} sealed ${sha256.slice(0, 12)}… on ${on} — the decision of the day names it (D20.15)`,
  );
  return 0;
}

function main(): number {
  const args = process.argv.slice(2);
  if (args.includes('--places')) {
    const file = compute();
    writeFileSync(PLACES_PATH, serialised(file));
    console.log(`lexicon: ${PLACES_PATH} written — ${placesSummary(file.sections)}`);
    return 0;
  }
  if (args.includes('--check')) {
    const file = compute();
    const current = existsSync(PLACES_PATH) ? readFileSync(PLACES_PATH, 'utf8') : '';
    const same = current === serialised(file);
    console.log(
      same
        ? `lexicon: ${PLACES_PATH} is current — ${placesSummary(file.sections)}`
        : `lexicon: ${PLACES_PATH} is NOT what the book and the words give today — npm run lexicon -- --places`,
    );
    return same ? 0 : 1;
  }
  if (args.includes('--stems')) return stems();
  if (args.includes('--patterns')) return patterns();
  if (args.includes('--vocabulary')) return vocabulary();
  if (args.includes('--attest')) return attest();
  if (args.includes('--seal')) return seal();
  console.error(
    'lexicon: --places, --check, --stems, --patterns, --vocabulary, --attest or --seal',
  );
  return 2;
}

if (process.argv[1] !== undefined && /lexicon-2026\.ts$/.test(process.argv[1])) {
  process.exitCode = main();
}
