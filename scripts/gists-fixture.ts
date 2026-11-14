/**
 * An INVENTED book for the sentences written ahead: two sections, six measures — a library,
 * school buses, a lending service and its bookmobiles, fruit trees, orchards — with a sentence
 * of ours about each, and lines of the two files as the tool keeps them.
 *
 * Why it exists. The text of the 2026 edition never enters this repository (D15.6): no test of
 * the tool, of the editor's desk or of the deposit may hold a sentence of it — and none needs
 * one to test a path. The measures are those of scripts/ask-worker.test.ts.
 *
 * Shared by scripts/gists-2026.test.ts and scripts/e2e-gists.ts.
 */
import type { ModelKey } from '../src/worker/models.js';
import { sha256 } from './aec-common.js';
import type { Manifest, PrivateCorpus, PrivateItem } from './aec26-types.js';
import {
  measuresOf,
  pinOf,
  type Measure,
  type MeasureKind,
  type RunLine,
  type VerdictLine,
} from './gists-core.js';

export const CORPUS = 'c0ffee0000c0ffee';

export interface Invented {
  id: string;
  kind: MeasureKind;
  text: string;
  parent?: string;
}

export const LIBRARY = 'p1c1-s01-k01';
export const BUSES = 'p1c1-s01-m01';
export const LENDING = 'p1c1-s01-m02';
export const BOOKMOBILES = 'p1c1-s01-m02.s1';
export const TREES = 'p1c1-s02-k01';
export const ORCHARDS = 'p1c1-s02-m01';

export const BOOK: readonly Invented[] = [
  {
    id: LIBRARY,
    kind: 'key_measure',
    text: 'Ouvrir une bibliothèque de quartier sept jours sur sept dans chaque commune',
  },
  {
    id: BUSES,
    kind: 'measure',
    text: 'Rendre gratuits les transports scolaires jusqu’à 16 ans dès la rentrée 2028',
  },
  { id: LENDING, kind: 'measure', text: 'Créer un service public du prêt de livres :' },
  {
    id: BOOKMOBILES,
    kind: 'sub_measure',
    text: 'des bibliobus pour les villages',
    parent: LENDING,
  },
  {
    id: TREES,
    kind: 'key_measure',
    text: 'Planter 300 arbres fruitiers par an le long des chemins communaux',
  },
  {
    id: ORCHARDS,
    kind: 'measure',
    text: 'Confier les vergers communaux aux écoles et aux associations de quartier',
  },
];

export const TITLES: Readonly<Record<string, string>> = {
  'p1c1-s01': 'Des livres & des bus partout',
  'p1c1-s02': 'Des vergers pour tous',
};

/** A sentence of ours about each invented measure: each passes the control at 0.5. */
export const SAID: Readonly<Record<string, string>> = {
  [LIBRARY]:
    'Le programme prévoit une bibliothèque de quartier ouverte chaque jour dans toute commune.',
  [BUSES]: "Le programme prévoit des transports scolaires gratuits jusqu'à 16 ans.",
  [LENDING]: 'Le programme prévoit un service public pour prêter des livres.',
  [BOOKMOBILES]: 'Le programme prévoit des bibliobus dans les villages pour le prêt de livres.',
  [TREES]:
    'Le programme prévoit de planter chaque année 300 arbres fruitiers près des chemins des communes.',
  [ORCHARDS]:
    'Le programme prévoit que les écoles et les associations de quartier gèrent les vergers des communes.',
};

/** A sentence the control refuses for every measure: it shares none of their words. */
export const ASTRAY = 'Le programme prévoit un grand plan pour demain.';

export function said(id: string): string {
  const sentence = SAID[id];
  if (sentence === undefined) throw new Error(`${id}: no sentence in the invented book`);
  return sentence;
}

const sectionOf = (id: string): string => id.slice(0, 8);

/** The public manifest of an invented book: its measures, their fingerprints, a paragraph each. */
export function manifestOf(book: readonly Invented[] = BOOK): Manifest {
  const sections = Object.keys(TITLES).map((id, index) => ({
    id,
    chapterId: 'p1c1',
    partId: 'p1',
    position: index + 1,
    anchor: id,
    title: TITLES[id] ?? '',
    url: `https://example.invalid/livre/#${id}`,
    items: [
      { id: `${id}-p01`, kind: 'paragraph', sha256: sha256(`prose ${id}`), words: 2 },
      ...book
        .filter((measure) => sectionOf(measure.id) === id)
        .map((measure) => ({
          id: measure.id,
          kind: measure.kind,
          sha256: sha256(measure.text),
          words: measure.text.split(' ').length,
          ...(measure.parent === undefined ? {} : { parent: measure.parent }),
        })),
    ],
  }));
  return { meta: { corpus_version: CORPUS }, sections } as unknown as Manifest;
}

/** The private corpus of an invented book, as the ingestion would have written it. */
export function corpusOf(book: readonly Invented[] = BOOK): PrivateCorpus {
  const item = (measure: Invented): PrivateItem => ({
    id: measure.id,
    kind: measure.kind,
    text: measure.text,
    hash: sha256(measure.text),
    raw: measure.text,
    words: measure.text.split(' ').length,
    inline: [],
  });
  const sections = Object.keys(TITLES).map((id) => ({
    id,
    title: TITLES[id] ?? '',
    items: [
      { ...item({ id: `${id}-p01`, kind: 'measure', text: `prose ${id}` }), kind: 'paragraph' },
      ...book
        .filter((measure) => sectionOf(measure.id) === id && measure.parent === undefined)
        .map((measure) => ({
          ...item(measure),
          subMeasures: book.filter((sub) => sub.parent === measure.id).map(item),
        })),
    ],
  }));
  return { meta: { corpus_version: CORPUS }, sections } as unknown as PrivateCorpus;
}

export const MANIFEST = manifestOf();
export const PRIVATE = corpusOf();
export const MEASURES = measuresOf(MANIFEST);

export function measure(id: string): Measure {
  const found = MEASURES.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`${id}: not a measure of the invented book`);
  return found;
}

/** A line of runs.jsonl: Gemma, the third way, a sentence both judges call faithful. */
export function run(id: string, overrides: Partial<RunLine> = {}): RunLine {
  return {
    at: '2026-11-15T08:00:00.000Z',
    id,
    ...pinOf(measure(id)),
    writer: 'gemma-4-26b',
    variant: 2,
    ran: true,
    passed: true,
    rule: null,
    text: said(id),
    judges: [
      { model: 'mistral-small-3.1', verdict: 'fidele', answered: true },
      { model: 'llama-3.3-70b', verdict: 'fidele', answered: true },
    ],
    neurons: 7.5,
    cached: false,
    ms: 1200,
    ...overrides,
  };
}

/** A call the control refused: no sentence, no judge. */
export const refusedRun = (
  id: string,
  variant: number,
  writer: ModelKey = 'gemma-4-26b',
): RunLine => run(id, { writer, variant, passed: false, rule: 'overlap', text: null, judges: [] });

/** A line of verdicts.jsonl: the sentence Gemma wrote, read and kept. */
export function verdict(id: string, overrides: Partial<VerdictLine> = {}): VerdictLine {
  return {
    id,
    verdict: 'read',
    writer: 'gemma-4-26b',
    text: said(id),
    read_on: '2026-11-16',
    ...pinOf(measure(id)),
    ...overrides,
  };
}

export const linkOnly = (id: string): VerdictLine =>
  verdict(id, { verdict: 'link-only', writer: null, text: null });
