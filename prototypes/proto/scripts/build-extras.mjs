/**
 * Build the small derived files the prototype needs on top of the slim runtime projection.
 *
 * Run from the repository root:  node prototypes/proto/scripts/build-extras.mjs
 *
 * Outputs (prototypes/proto/shared/data/):
 *   - extras.json         parts (id, slug, title, url, chapterIds) and the introduction paragraphs,
 *                         verbatim from data/aec-2025.json (slim.json does not carry them; the
 *                         glossary cites intro-p22 and the part titles label every screen)
 *   - concept-index.json  slug -> term, verbatim/related/support ids of the glossary cards that
 *                         exist, so the link-arrival screen can route "Comprendre en clair" to a
 *                         concept card without loading the whole glossary
 *
 * No text is rewritten. U+202F -> U+00A0 as in the spike build (D3.6).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const outDir = resolve(here, '..', 'shared', 'data');

const nbsp = (s) => s.replace(/ /g, ' ');

const corpus = JSON.parse(readFileSync(resolve(repoRoot, 'data', 'aec-2025.json'), 'utf8'));
const glossary = JSON.parse(readFileSync(resolve(repoRoot, 'data', 'glossary.json'), 'utf8'));

const extras = {
  meta: {
    corpus_version: corpus.meta.corpus_version,
    source: corpus.meta.source,
    license: corpus.meta.license,
  },
  parts: corpus.parts.map((p) => ({
    id: p.id,
    slug: p.slug,
    title: nbsp(p.title),
    url: p.url,
    order: p.order,
    chapterIds: p.chapterIds,
  })),
  introduction: {
    id: corpus.introduction.id,
    title: nbsp(corpus.introduction.title),
    url: corpus.introduction.url,
    paragraphs: corpus.introduction.paragraphs.map((p) => ({
      kind: 'paragraph',
      id: p.id,
      text: nbsp(p.text),
    })),
  },
};

const conceptIndex = {
  meta: { corpus_version: glossary.meta.corpus_version, count: glossary.entries.length },
  entries: glossary.entries.map((e) => ({
    slug: e.slug,
    term: e.term,
    aliases: e.aliases,
    review_status: e.review_status,
    verbatim_ids: e.verbatim_ids,
    related_measure_ids: e.related_measure_ids,
    support_ids: [
      ...new Set(
        e.sentence_support.flatMap((s) => s.support_ids).filter((id) => !id.startsWith('http')),
      ),
    ],
  })),
};

writeFileSync(resolve(outDir, 'extras.json'), JSON.stringify(extras));
writeFileSync(resolve(outDir, 'concept-index.json'), JSON.stringify(conceptIndex));
console.log(
  `extras.json: ${extras.parts.length} parts, ${extras.introduction.paragraphs.length} introduction paragraphs`,
);
console.log(`concept-index.json: ${conceptIndex.entries.length} concept cards`);
