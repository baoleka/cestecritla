/**
 * Parser tests on raw HTML fixtures saved from the live site (no network).
 * Run: npx tsx --test scripts/ingest.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { normalizeText, sha256 } from './aec-common.js';
import {
  compareInvariants,
  computeCounts,
  detectSourceAnomalies,
  findDuplicatePropositions,
  parseSectionPage,
  sectionFingerprint,
} from './ingest.js';
import type {
  Chapter,
  ExpectedInvariants,
  Introduction,
  Measure,
  Paragraph,
  Part,
  Section,
} from './aec-types.js';

const FIXTURES = resolve(dirname(fileURLToPath(import.meta.url)), 'fixtures');
const fixture = (name: string): string => readFileSync(resolve(FIXTURES, name), 'utf8');

/** Indexed access that fails the test instead of yielding `undefined`. */
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`missing item at index ${String(index)}`);
  return item;
}

void test('chapitre12/s1: complete section with key measure, 11 measures and one chiffre', () => {
  const parsed = parseSectionPage(fixture('chapitre12-s1.html'), 'c12-s01');

  assert.equal(parsed.title, 'La bifurcation écologique pour une société de l’harmonie');
  assert.equal(parsed.partSlug, 'l-harmonie-des-etres-humains-avec-la-nature');
  assert.match(parsed.hash, /^[0-9a-f]{64}$/);
  assert.deepEqual(parsed.warnings, []);
  assert.equal(parsed.canonicalUrl, 'https://melenchon2027.fr/programme2025/livre/chapitre12/s1/');
  assert.equal(parsed.currentHref, 'https://melenchon2027.fr/programme2025/livre/chapitre12/s1/');

  const kinds = parsed.items.map((i) => i.kind);
  assert.deepEqual(kinds, ['paragraph', 'key_measure', ...Array<'measure'>(11).fill('measure')]);

  const paragraph = at(parsed.items, 0);
  if (paragraph.kind !== 'paragraph') throw new Error('first item must be the argument paragraph');
  assert.equal(paragraph.id, 'c12-s01-p01');
  assert.match(paragraph.html, /^<em>L’urgence écologique/);
  assert.match(paragraph.text, /^L’urgence écologique et climatique/);
  assert.equal(paragraph.hash, sha256(paragraph.text));

  const key = at(parsed.items, 1);
  assert.equal(key.kind, 'key_measure');
  assert.equal(key.id, 'c12-s01-k01');
  assert.match(key.text, /^Inscrire dans la Constitution le principe de la « règle verte »/);

  const measures = parsed.items.filter((i): i is Measure => i.kind === 'measure');
  assert.equal(measures.length, 11);
  assert.equal(at(measures, 0).id, 'c12-s01-m01');
  assert.equal(at(measures, 10).id, 'c12-s01-m11');
  assert.ok(measures.every((m) => m.subMeasures === undefined));
  // Doubled space in the source ("mettre en œuvre  une") is collapsed.
  assert.ok(measures.some((m) => m.text.includes('mettre en œuvre une comptabilité carbone')));

  assert.equal(parsed.chiffres.length, 1);
  const chiffre = at(parsed.chiffres, 0);
  assert.equal(chiffre.id, 'c12-s01-a01');
  assert.ok(chiffre.text.includes('83 %'));
  assert.ok(chiffre.text.includes('Harris Interactive, juillet 2021'));
});

void test('chapitre1/s6: sub-measures are nested under the preceding measure', () => {
  const parsed = parseSectionPage(fixture('chapitre1-s6.html'), 'c1-s06');

  assert.equal(parsed.title, 'La Révolution citoyenne dans les médias');
  assert.equal(parsed.partSlug, 'faire-la-revolution-citoyenne');
  const measures = parsed.items.filter((i): i is Measure => i.kind === 'measure');
  const withSubs = measures.filter((m) => (m.subMeasures?.length ?? 0) > 0);
  assert.ok(withSubs.length >= 1);

  const first = at(withSubs, 0);
  const subs = first.subMeasures ?? [];
  assert.equal(first.id, 'c1-s06-m01');
  assert.equal(subs.length, 3);
  assert.equal(at(subs, 0).id, 'c1-s06-m01.s1');
  assert.equal(at(subs, 2).id, 'c1-s06-m01.s3');
  // Entity "&rsquo;" in the source is decoded to the typographic apostrophe.
  assert.ok(at(subs, 1).text.includes('ainsi qu’entre filières'));
  // Sub-measures never appear as top-level items.
  assert.ok(parsed.items.every((i) => i.kind !== ('sub_measure' as string)));
  assert.equal(parsed.items.filter((i) => i.kind === 'key_measure').length, 1);
  assert.equal(parsed.chiffres.length, 1);
});

void test('parsing is deterministic and the fingerprint ignores markup whitespace', () => {
  const html = fixture('chapitre12-s1.html');
  const a = parseSectionPage(html, 'c12-s01');
  const b = parseSectionPage(html.replace(/\n/g, '\r\n  '), 'c12-s01');
  assert.equal(a.hash, b.hash);
  assert.equal(sectionFingerprint(a), sectionFingerprint(b));
});

void test('normalizeText collapses every kind of whitespace and strips zero-width characters', () => {
  assert.equal(normalizeText('  a\u00A0 \u202F b\n\t c\u200B '), 'a b c');
  assert.equal(normalizeText('e\u0301'), '\u00E9');
});

void test('counts and duplicates are computed from the parsed sections', () => {
  const s1 = parseSectionPage(fixture('chapitre12-s1.html'), 'c12-s01');
  const s6 = parseSectionPage(fixture('chapitre1-s6.html'), 'c1-s06');
  const toSection = (
    parsed: typeof s1,
    id: string,
    chapterId: string,
    partId: string,
  ): Section => ({
    id,
    chapterId,
    partId,
    number: 1,
    slug: 's1',
    title: parsed.title,
    url: `https://melenchon2027.fr/programme2025/livre/${chapterId}/${id}/`,
    canonicalUrl: `https://melenchon2027.fr/programme2025/livre/${chapterId}/${id}/`,
    hash: parsed.hash,
    items: parsed.items,
    chiffres: parsed.chiffres,
  });
  const sections = [
    toSection(s1, 'c12-s01', 'c12', 'part3'),
    toSection(s6, 'c1-s06', 'c1', 'part1'),
  ];
  const chapters: Chapter[] = [];
  const parts: Part[] = [];
  const introduction: Introduction = {
    id: 'intro',
    slug: 'introduction',
    title: 'Introduction',
    url: '',
    paragraphs: [],
  };
  const counts = computeCounts({ parts, chapters, sections, introduction });
  // Expected figures come straight from the raw fixtures, so the parser is checked against the HTML.
  const rawCount = (name: string, re: RegExp): number => (fixture(name).match(re) ?? []).length;
  const rawMeasures = ['chapitre12-s1.html', 'chapitre1-s6.html'].reduce(
    (n, f) => n + rawCount(f, /<div class="mesure">/g),
    0,
  );
  assert.equal(counts.mesure_cle, 2);
  assert.equal(counts.mesure, rawMeasures);
  assert.equal(counts.mesure, 11 + 11);
  assert.equal(counts.sous_mesure, rawCount('chapitre1-s6.html', /<div class="sous-mesure">/g));
  assert.equal(counts.propositions, counts.mesure_cle + counts.mesure + counts.sous_mesure);
  assert.equal(counts.chiffres, 2);
  assert.equal(counts.paragraphs, 2);
  assert.equal(counts.sections_with_sous_mesure, 1);
  assert.deepEqual(findDuplicatePropositions(sections), []);
});

void test('source anomalies: paragraphs after a proposition are classified by fixed rules', () => {
  const p = (id: string, text: string, html = text): Paragraph => ({
    kind: 'paragraph',
    id,
    text,
    hash: sha256(text),
    html,
  });
  const section: Section = {
    id: 'cX-s01',
    chapterId: 'cX',
    partId: 'part1',
    number: 1,
    slug: 's1',
    title: 'Synthetic',
    url: 'https://melenchon2027.fr/programme2025/livre/chapitreX/s1/',
    canonicalUrl: 'https://melenchon2027.fr/programme2025/livre/chapitreX/s1/',
    hash: sha256('synthetic'),
    items: [
      p('cX-s01-p01', 'Argument.', '<em>Argument.</em>'),
      { kind: 'key_measure', id: 'cX-s01-k01', text: 'Mesure clé', hash: sha256('Mesure clé') },
      p('cX-s01-p02', 'Par la loi :', '<strong>Par la loi :</strong>'),
      {
        kind: 'measure',
        id: 'cX-s01-m01',
        text: 'Combattre les lobbys, notamment en',
        hash: sha256('Combattre les lobbys, notamment en'),
        subMeasures: [
          {
            kind: 'sub_measure',
            id: 'cX-s01-m01.s1',
            text: 'Sous-mesure',
            hash: sha256('Sous-mesure'),
          },
        ],
      },
      p('cX-s01-p03', 'imposant la transparence des agendas'),
      p('cX-s01-p04', '63 % des Français sont favorables (Ifop, 2021)'),
      p('cX-s01-p05', 'Notre logique est simple.'),
    ],
    chiffres: [],
  };
  assert.deepEqual(detectSourceAnomalies([section]), [
    { id: 'cX-s01-p02', kind: 'heading_paragraph', relatedId: null },
    { id: 'cX-s01-p03', kind: 'measure_split', relatedId: 'cX-s01-m01.s1' },
    { id: 'cX-s01-p04', kind: 'statistic_as_paragraph', relatedId: null },
    { id: 'cX-s01-p05', kind: 'prose_after_measures', relatedId: null },
  ]);
  // No anomaly on the regular fixtures.
  const regular = parseSectionPage(fixture('chapitre12-s1.html'), 'c12-s01');
  assert.deepEqual(
    detectSourceAnomalies([{ ...section, items: regular.items, chiffres: regular.chiffres }]),
    [],
  );
});

void test('invariant gate reports every differing count and chapter size', () => {
  const s1 = parseSectionPage(fixture('chapitre12-s1.html'), 'c12-s01');
  const introduction: Introduction = {
    id: 'intro',
    slug: 'introduction',
    title: 'Introduction',
    url: '',
    paragraphs: [],
  };
  const section: Section = {
    id: 'c12-s01',
    chapterId: 'c12',
    partId: 'part3',
    number: 1,
    slug: 's1',
    title: s1.title,
    url: 'https://melenchon2027.fr/programme2025/livre/chapitre12/s1/',
    canonicalUrl: 'https://melenchon2027.fr/programme2025/livre/chapitre12/s1/',
    hash: s1.hash,
    items: s1.items,
    chiffres: s1.chiffres,
  };
  const counts = computeCounts({ parts: [], chapters: [], sections: [section], introduction });
  const expected: ExpectedInvariants = {
    counts: { ...counts, mesure: counts.mesure + 1 },
    sections_per_chapter: { c12: 3 },
    rss_known_missing_section_ids: [],
  };
  const measured: ExpectedInvariants = {
    counts,
    sections_per_chapter: { c12: 1 },
    rss_known_missing_section_ids: [],
  };
  const issues = compareInvariants(expected, measured);
  assert.deepEqual(
    issues.map((i) => i.key),
    ['counts.mesure', 'sections_per_chapter.c12'],
  );
  assert.deepEqual(compareInvariants(measured, measured), []);
});
