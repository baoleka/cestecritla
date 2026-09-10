/**
 * Build the runtime data served by the spike's Static Assets (D1.6 projection).
 *
 * Run from the repository root:  npx tsx prototypes/spike-share/scripts/build-data.ts
 *
 * Outputs (prototypes/spike-share/public/data/):
 *   - slim.json        the D1.6 runtime projection of data/aec-2025.json
 *                      (meta, chapters, sections with items -- paragraphs, measures, sub-measures --
 *                      without hash/html, chiffres), minified
 *   - stat-cards.json  verbatim copy of data/stat-cards.json
 *   - ../fonts/*.ttf   copied to public/fonts/ without their GPOS table (see strip-gpos.ts)
 *
 * Prints raw and gzip sizes: this is the D1.6 measurement (target <= 80 KB gzip).
 * No text is rewritten. The only transformation is structural (dropping hash/html)
 * plus the D3.6 whitespace rule: U+202F (absent from the subset fonts) -> U+00A0.
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { SlimCorpus, SlimItem } from '../src/types.ts';
import { stripGpos } from './strip-gpos.ts';

interface SourceSubMeasure {
  kind: 'sub_measure';
  id: string;
  text: string;
}

interface SourceItem {
  kind: 'paragraph' | 'key_measure' | 'measure';
  id: string;
  text: string;
  subMeasures?: SourceSubMeasure[];
}

interface SourceChiffre {
  kind: 'chiffre';
  id: string;
  text: string;
}

interface SourceSection {
  id: string;
  chapterId: string;
  partId: string;
  title: string;
  url: string;
  items: SourceItem[];
  chiffres: SourceChiffre[];
}

interface SourceChapter {
  id: string;
  number: number;
  title: string;
  partId: string;
}

interface SourceCorpus {
  meta: { corpus_version: string; official_count: number };
  chapters: SourceChapter[];
  sections: SourceSection[];
}

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const outDir = resolve(here, '..', 'public', 'data');
const fontsIn = resolve(here, '..', 'fonts');
const fontsOut = resolve(here, '..', 'public', 'fonts');

/** D3.6: narrow no-break space is absent from the subset fonts; normalise to NBSP. */
const normaliseSpaces = (text: string): string => text.replace(/ /g, ' ');

const source = JSON.parse(readFileSync(resolve(repoRoot, 'data', 'aec-2025.json'), 'utf8')) as SourceCorpus;

const slim: SlimCorpus = {
  meta: { corpus_version: source.meta.corpus_version, official_count: source.meta.official_count },
  chapters: source.chapters.map((c) => ({ id: c.id, number: c.number, title: c.title, partId: c.partId })),
  sections: source.sections.map((s) => ({
    id: s.id,
    chapterId: s.chapterId,
    title: s.title,
    url: s.url,
    // Paragraphs (chapeaux) are kept as plain text: the app displays them; only hash/html are dropped.
    items: s.items.map((i) => {
      const item: SlimItem = { kind: i.kind, id: i.id, text: normaliseSpaces(i.text) };
      if (i.subMeasures && i.subMeasures.length > 0) {
        item.subMeasures = i.subMeasures.map((sm) => ({ kind: sm.kind, id: sm.id, text: normaliseSpaces(sm.text) }));
      }
      return item;
    }),
    chiffres: s.chiffres.map((a) => ({ id: a.id, text: normaliseSpaces(a.text) })),
  })),
};

mkdirSync(outDir, { recursive: true });

const slimJson = JSON.stringify(slim);
writeFileSync(resolve(outDir, 'slim.json'), slimJson);

const statCardsRaw = readFileSync(resolve(repoRoot, 'data', 'stat-cards.json'), 'utf8');
writeFileSync(resolve(outDir, 'stat-cards.json'), statCardsRaw);

const report = (label: string, content: string): void => {
  const raw = Buffer.byteLength(content, 'utf8');
  const gz = gzipSync(content, { level: 9 }).byteLength;
  console.log(`${label}: raw ${raw} B (${(raw / 1024).toFixed(1)} KB), gzip -9 ${gz} B (${(gz / 1024).toFixed(1)} KB)`);
};

const propositionCount = slim.sections.reduce(
  (n, s) =>
    n +
    s.items.filter((i) => i.kind !== 'paragraph').length +
    s.items.reduce((m, i) => m + (i.subMeasures?.length ?? 0), 0),
  0,
);
const paragraphCount = slim.sections.reduce((n, s) => n + s.items.filter((i) => i.kind === 'paragraph').length, 0);
console.log(
  `slim.json: ${slim.chapters.length} chapters, ${slim.sections.length} sections, ${propositionCount} propositions, ${paragraphCount} paragraphs, ${slim.sections.reduce((n, s) => n + s.chiffres.length, 0)} chiffres, corpus ${slim.meta.corpus_version}`,
);
report('slim.json (D1.6 projection)', slimJson);
report('stat-cards.json (copy)', statCardsRaw);

mkdirSync(fontsOut, { recursive: true });
for (const file of readdirSync(fontsIn).filter((f) => f.endsWith('.ttf'))) {
  const original = new Uint8Array(readFileSync(resolve(fontsIn, file)));
  const stripped = stripGpos(original);
  writeFileSync(resolve(fontsOut, file), stripped);
  console.log(`font ${file}: ${original.byteLength} B -> ${stripped.byteLength} B (GPOS/kern dropped for satori)`);
}
