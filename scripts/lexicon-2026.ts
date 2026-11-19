/**
 * The lexicon of the 2026 edition (PLAN-MOTS) — a local tool: the text of the book is private,
 * and this runs only on the machine that holds it, by the session that may read it (D20.1),
 * never by a sub-agent.
 *
 *   npm run lexicon -- --places    writes data/2026/term-places.json: for each section, the
 *                                  explained words its text uses — identifiers only
 *   npm run lexicon -- --check     says whether that file is the one the book and the words of
 *                                  data/2026/terms.json give today; exits 1 if not
 *
 * It prints identifiers and numbers. Never a word of the text: a tool that printed what it reads
 * would be the shortest way for the book to end up in a terminal log (D15.6).
 *
 * After any change to the wordings of data/2026/terms.json, run `--places` again: the gate of
 * the public file (scripts/lexicon.test.ts) holds it to the wordings it was computed with.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  TERM_PLACES_PATH as PLACES_PATH,
  explainedTerms,
  wordingsFingerprint,
} from '../src/lib/words-data.js';
import type { PrivateCorpus } from './aec26-types.js';
import { placesOf, placesSummary } from './lexicon-core.js';
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
  return {
    meta: {
      corpus_version: corpus.meta.corpus_version,
      wordings_sha256: wordingsFingerprint(entries),
      note_fr: NOTE_FR,
    },
    sections: placesOf(corpus, entries),
  };
}

const serialised = (file: PlacesFile): string => `${JSON.stringify(file, null, 2)}\n`;

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
  console.error('lexicon: --places or --check');
  return 2;
}

if (process.argv[1] !== undefined && /lexicon-2026\.ts$/.test(process.argv[1])) {
  process.exitCode = main();
}
