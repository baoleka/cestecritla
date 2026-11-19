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
 *
 * It prints identifiers and numbers. Never a word of the text: a tool that printed what it reads
 * would be the shortest way for the book to end up in a terminal log (D15.6).
 *
 * After any change to the wordings of data/2026/terms.json, run `--places` again: the gate of
 * the public file (scripts/lexicon.test.ts) holds it to the wordings it was computed with.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { cardWordings, termsIn } from '../src/lib/terms.js';
import {
  TERM_PLACES_PATH as PLACES_PATH,
  explainedTerms,
  wordingsFingerprint,
} from '../src/lib/words-data.js';
import type { PrivateCorpus } from './aec26-types.js';
import {
  ACRONYM,
  INSTRUMENT,
  LATIN,
  UNIT,
  bookTexts,
  findAll,
  formsOf,
  pairsIn,
  placesOf,
  placesSummary,
  publicTexts,
  stemCounts,
  stemRows,
  type Found,
  type Placed,
  type StemRow,
} from './lexicon-core.js';
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
  console.error('lexicon: --places, --check, --stems or --patterns');
  return 2;
}

if (process.argv[1] !== undefined && /lexicon-2026\.ts$/.test(process.argv[1])) {
  process.exitCode = main();
}
