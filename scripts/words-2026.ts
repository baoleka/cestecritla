/**
 * The words of the game, checked where the text is (lot J2, D16.15) — a local tool: it reads
 * private/, and prints identifiers, numbers and yes/no. Never a word it was not given.
 *
 *   npx tsx scripts/words-2026.ts --propose wagon cantine mairie
 *       for each word typed: is it written, as typed, in a measure the game may use? Prints an
 *       entry ready for data/2026/game-words.json, or why not.
 *   npx tsx scripts/words-2026.ts --check
 *       the committed list: every word against the text, and the share of the book it shows.
 *   npx tsx scripts/words-2026.ts --attest
 *       the same, and — if nothing is wrong — writes the attestation the launch gate asks for,
 *       bound to the hash of the list and to the state of the book.
 *   npx tsx scripts/words-2026.ts --validated <today>
 *       THE EDITOR'S GESTURE (D15.18, D16.15): the list as it stands, checked once more, is
 *       dated as validated, with its hash. From then on the build shows the game; change one
 *       word and the validation falls.
 *
 * What the build cannot see and this does (src/lib/game.ts does the rest, on public files):
 *   written   the word stands in the pinned measure exactly as the list writes it;
 *   affirm    that measure does not open on a prohibition — a word shown alone must not be the
 *             thing a measure forbids;
 *   prose     the word's stem is in no paragraph and no title outside the sections where a
 *             measure holds it. The index only knows the measures: without this check the game
 *             would say « c'est écrit dans la partie 3 » of a word any reader finds, with
 *             Ctrl-F, in the introduction of part 5.
 *   same      every OTHER measure the index gives for the stem holds the word itself — in its
 *             singular or its plural, accents and all. The index folds accents and endings:
 *             « marchés » and « marche » share a stem, and the game says « Oui, là aussi » of
 *             every section the stem is in. Said of another word, it would be false.
 *   alone     the pinned measure writes the word free-standing, not only glued to another by
 *             a hyphen. « tram » is not a word of a book that writes « tram-train », nor
 *             « abri » of one that writes « sans-abri »: shown alone, each would be a word the
 *             book does not write. (A measure where the word is only glued still counts as a
 *             place where it is written: a reader who searches the page finds it there.)
 *
 * What neither can decide — is it a concrete, everyday thing; has it one meaning; what would an
 * opponent write under it — is the editor's reading of the list, word by word (D16.15).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  LOCAL_CHECKS,
  wordlessSections,
  postings,
  proveWords,
  type GameSources,
  type GameWord,
  type GameWordsFile,
} from '../src/lib/game.js';
import { sectionOf, terms } from '../src/lib/search-core.js';
import { flatItems } from './aec26-core.js';
import type { PrivateCorpus } from './aec26-types.js';
import { PRIVATE_CORPUS_PATH } from './ingest-2026.js';
import { listFingerprint } from '../src/lib/fingerprint.js';
import { everything } from './probe-2026.js';

export const WORDS_PATH = 'data/2026/game-words.json';

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));

export function publicSources(): GameSources {
  return {
    manifest: json('data/2026/manifest.json') as GameSources['manifest'],
    index: (json('data/2026/search-index.json') as { index: GameSources['index'] }).index,
    idMap: json('data/2026/id-map-2025.json') as GameSources['idMap'],
  };
}

/** Verbs a measure opens with when it forbids, ends or punishes something. */
const PROHIBITION =
  /^(?:interdire|supprimer|abroger|abolir|bannir|prohiber|proscrire|refuser|cesser|stopper|arrêter|fermer|démanteler|éradiquer|sanctionner|punir|pénaliser|réprimer|mettre fin|en finir|sortir de|lutter contre|combattre)(?![\p{L}])/iu;

/** The word, whole, as written — accents and case of the list included. */
const holds = (text: string, word: string): boolean =>
  new RegExp(
    `(?<![\\p{L}\\p{N}])${word.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`)}(?![\\p{L}\\p{N}])`,
    'u',
  ).test(text);

/** The hyphens a compound is glued with: the keyboard's, the typographic one, the non-breaking one. */
const HYPHENS = `\\-${String.fromCodePoint(0x2010)}${String.fromCodePoint(0x2011)}`;

/** The word, free-standing: with no letter, digit or hyphen on either side. */
const standsAlone = (text: string, word: string): boolean =>
  new RegExp(
    `(?<![\\p{L}\\p{N}${HYPHENS}])${word.replace(/[.*+?^${}()|[\]\\]/g, (c) => `\\${c}`)}(?![\\p{L}\\p{N}${HYPHENS}])`,
    'u',
  ).test(text);

/** The forms one word takes: itself, its singular or plural — never another word. */
export function formsOf(word: string): string[] {
  const forms = new Set([word]);
  if (word.endsWith('eaux')) forms.add(word.slice(0, -1));
  else if (word.endsWith('aux')) forms.add(`${word.slice(0, -3)}al`);
  else if (word.endsWith('eau')) forms.add(`${word}x`);
  else if (word.endsWith('al')) forms.add(`${word.slice(0, -2)}aux`);
  if (word.endsWith('s') || word.endsWith('x')) forms.add(word.slice(0, -1));
  else forms.add(`${word}s`);
  // The same forms at the head of a sentence.
  for (const form of [...forms]) forms.add(form.charAt(0).toUpperCase() + form.slice(1));
  return [...forms];
}

export interface LocalCheck {
  word: string;
  pin: string;
  /** The measure holds the word exactly as the list writes it. */
  written: boolean;
  /** The measure does not open on a prohibition. */
  affirm: boolean;
  /** The measure writes the word free-standing, not only glued to another by a hyphen. */
  alone: boolean;
  /** Paragraphs and titles holding the stem outside the sections where a measure does. */
  prose: string[];
  /** Measures the index gives for the stem where the word itself, in any of its forms, is not. */
  others: string[];
}

/** The checks only the text allows, for one word and its pin. */
export function localCheck(
  corpus: PrivateCorpus,
  sources: GameSources,
  word: GameWord,
): LocalCheck {
  const texts = new Map(
    corpus.sections.flatMap((s) => flatItems(s.items).map((item) => [item.id, item.text] as const)),
  );
  const pinText = texts.get(word.pin.id) ?? '';
  const stem = terms(word.word)[0] ?? '';
  const measured = new Set((postings(sources.index).get(stem) ?? []).map(sectionOf));
  const prose = everything(corpus)
    .filter((item) => item.kind === 'paragraph' || item.kind === 'heading' || item.kind === 'title')
    .filter((item) => terms(item.text).includes(stem))
    .map((item) => item.id)
    // Prose of a section where a measure holds the word says nothing the game does not.
    .filter((id) => !measured.has(sectionOf(id.replace(/^title:/, ''))));
  const forms = formsOf(word.word);
  const others = (postings(sources.index).get(stem) ?? []).filter((id) => {
    const text = texts.get(id) ?? '';
    return !forms.some((form) => holds(text, form));
  });
  return {
    word: word.word,
    pin: word.pin.id,
    written: pinText !== '' && holds(pinText, word.word),
    affirm: pinText !== '' && !PROHIBITION.test(pinText.trim()),
    alone: pinText !== '' && standsAlone(pinText, word.word),
    prose,
    others,
  };
}

export const problemsOf = (check: LocalCheck): string[] => [
  ...(check.written ? [] : [`« ${check.word} » is not written as such in ${check.pin}`]),
  ...(check.written && !check.alone
    ? [`« ${check.word} » is only written glued to another word in ${check.pin}`]
    : []),
  ...(check.affirm ? [] : [`${check.pin} opens on a prohibition`]),
  ...(check.prose.length === 0
    ? []
    : [
        `« ${check.word} » is also in the prose or a title outside its measures: ${check.prose.join(', ')}`,
      ]),
  ...(check.others.length === 0
    ? []
    : [
        `the stem of « ${check.word} » is in ${check.others.join(', ')}, where the word itself is not written`,
      ]),
];

function loadCorpus(): PrivateCorpus | null {
  if (!existsSync(PRIVATE_CORPUS_PATH)) return null;
  return json(PRIVATE_CORPUS_PATH) as PrivateCorpus;
}

function propose(words: readonly string[]): void {
  const corpus = loadCorpus();
  if (corpus === null) throw new Error(`${PRIVATE_CORPUS_PATH} is not on this machine`);
  const sources = publicSources();
  const file = json(WORDS_PATH) as GameWordsFile;
  const excluded = wordlessSections(file, sources);
  const where = postings(sources.index);
  const hashes = new Map(
    sources.manifest.sections.flatMap((s) => s.items.map((item) => [item.id, item] as const)),
  );
  let slot = file.words.length;
  // An identifier is never given twice, even after a word was withdrawn: what a phone remembers
  // of a game is a list of identifiers, and « w004 » must not come back as another word.
  let number = 1 + Math.max(-1, ...file.words.map((w) => Number(w.id.slice(1)) || 0));
  for (const word of words) {
    const stem = terms(word)[0] ?? '';
    const docs = where.get(stem) ?? [];
    const sections = [...new Set(docs.map(sectionOf))];
    if (docs.length === 0) {
      console.log(`${word}: its stem is in no measure`);
      continue;
    }
    const out = sections.filter((id) => excluded.has(id));
    if (out.length > 0) {
      console.log(`${word}: written in ${out.join(', ')}, which never holds a word of the game`);
      continue;
    }
    let chosen: GameWord | null = null;
    const reasons: string[] = [];
    for (const id of docs) {
      const item = hashes.get(id);
      if (item === undefined || typeof item.locator !== 'string') {
        reasons.push(`${id}: no link can land on it`);
        continue;
      }
      const candidate: GameWord = {
        slot,
        id: `w${String(number).padStart(3, '0')}`,
        word,
        pin: { id, sha256: item.sha256 },
      };
      const found = problemsOf(localCheck(corpus, sources, candidate));
      if (found.length === 0) {
        chosen = candidate;
        break;
      }
      reasons.push(...found);
    }
    if (chosen === null) {
      console.log(`${word}: ${[...new Set(reasons)].join(' ; ')}`);
      continue;
    }
    // The build's own proof, on the list as it would become.
    const { problems } = proveWords({ ...file, words: [...file.words, chosen] }, sources);
    const own = problems.filter((p) => p.startsWith(chosen.id));
    if (own.length > 0) {
      console.log(`${word}: ${own.join(' ; ')}`);
      continue;
    }
    console.log(
      `${word}: ok — ${String(sections.length)} section(s), ${String(docs.length)} measure(s) → ${JSON.stringify(chosen)}`,
    );
    slot += 1;
    number += 1;
  }
}

function check(attest: boolean): boolean {
  const corpus = loadCorpus();
  if (corpus === null) throw new Error(`${PRIVATE_CORPUS_PATH} is not on this machine`);
  const sources = publicSources();
  const file = json(WORDS_PATH) as GameWordsFile;
  const problems = [...proveWords(file, sources).problems];
  for (const word of file.words) problems.push(...problemsOf(localCheck(corpus, sources, word)));
  const total = flatItems(corpus.sections.flatMap((s) => s.items))
    .filter((item) => item.kind !== 'paragraph' && item.kind !== 'heading')
    .reduce((n, item) => n + item.words, 0);
  const share = file.words.length / total;
  console.log(
    `${String(file.words.length)} word(s) of ${String(total)} words of propositions: ` +
      `${(share * 100).toFixed(3)} % of the book shown by the game`,
  );
  for (const problem of problems) console.log(`  ✖ ${problem}`);
  // The card a player will see: the word, then the official titles of its place — which are
  // public (the manifest). A word is never read alone: the editor judges it with them.
  const { manifest } = sources;
  for (const word of [...file.words].sort((a, b) => a.slot - b.slot)) {
    const section = manifest.sections.find((s) => s.id === sectionOf(word.pin.id));
    const chapter = manifest.chapters.find((c) => c.id === section?.chapterId);
    const part = manifest.parts.find((p) => p.id === section?.partId);
    console.log(
      `  ${String(word.slot).padStart(2)} « ${word.word} » — ${part?.title ?? '?'} · ${chapter?.title ?? '?'} · ${section?.title ?? '?'}`,
    );
  }
  if (problems.length > 0) {
    process.exitCode = 1;
    return false;
  }
  console.log(
    'every word is written as listed and free-standing, in a measure that forbids nothing, and nowhere else; wherever its stem is, the word itself is',
  );
  if (!attest) return true;
  if (file.words.length === 0) {
    console.error('nothing to attest: the list holds no word');
    process.exitCode = 1;
    return false;
  }
  file.meta.attested = {
    list_sha256: listFingerprint(file.words, file.meta.pool),
    corpus_version: corpus.meta.corpus_version,
    on: new Date().toISOString().slice(0, 10),
    checks: [...LOCAL_CHECKS],
  };
  writeFileSync(WORDS_PATH, `${JSON.stringify(file, null, 2)}\n`);
  const fingerprint = (file.meta.attested.list_sha256 ?? '').slice(0, 12);
  console.log(`attested on corpus ${corpus.meta.corpus_version} (list and pool ${fingerprint}…)`);
  return true;
}

/** The editor dates the list: only today's date, only a list that passes and is attested. */
function validate(date: string | undefined): void {
  const today = new Date().toISOString().slice(0, 10);
  if (date !== today) {
    console.error(`type today's date to validate the list: --validated ${today}`);
    process.exitCode = 1;
    return;
  }
  if (!check(true)) return;
  const file = json(WORDS_PATH) as GameWordsFile;
  file.meta.validated = { on: today, list_sha256: listFingerprint(file.words, file.meta.pool) };
  writeFileSync(WORDS_PATH, `${JSON.stringify(file, null, 2)}\n`);
  console.log(`validated on ${today}: ${String(file.words.length)} word(s), ${WORDS_PATH}`);
}

if (process.argv[1] !== undefined && /words-2026\.ts$/.test(process.argv[1])) {
  const args = process.argv.slice(2);
  if (args[0] === '--propose') propose(args.slice(1));
  else if (args[0] === '--validated') validate(args[1]);
  else if (args.includes('--attest')) check(true);
  else check(false);
}
