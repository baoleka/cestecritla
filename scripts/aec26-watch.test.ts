/**
 * Watching the source and following it when it moves: the diff between two states of the book,
 * the six signals of the watch, and the 2025 → 2026 section map. All on the synthetic site.
 * Run: npx tsx --test scripts/aec26-watch.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SITE_ORIGIN, sha256 } from './aec-common.js';
import type { Dataset } from './aec-types.js';
import { buildCorpus, diffCorpora, isEmptyDiff } from './aec26-core.js';
import { SYNTHETIC_CLAUSE, syntheticSite, withPage, type SyntheticSite } from './aec26-fixture.js';
import { parseToc } from './aec26-source.js';
import type { PrivateCorpus } from './aec26-types.js';
import {
  classOf,
  dice,
  foldForMatch,
  matchItems,
  sectionFlow,
  trigrams,
  type Candidate,
} from './id-map.js';
import { compare, measure, type Observation } from './watch-source.js';

const dataset = JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
const site = syntheticSite(dataset);

function ingest(from: SyntheticSite): PrivateCorpus {
  return buildCorpus({
    toc: parseToc(from.pages.get('landing') ?? ''),
    pages: from.pages,
    log: from.log,
    siteOrigin: SITE_ORIGIN,
  });
}
const corpus = ingest(site);

void test('diff: the same pages give no difference', () => {
  assert.equal(isEmptyDiff(diffCorpora(corpus, ingest(site))), true);
});

void test('diff: one reworded measure is one sentence gone, one new, one identifier moved', () => {
  const edited = ingest(
    withPage(site, 'p1c1', (html) =>
      html.replace(/(<li class="mesure">)([^<]{20})/, '$1Désormais, $2'),
    ),
  );
  const diff = diffCorpora(corpus, edited);
  assert.equal(diff.itemsAdded, 1);
  assert.equal(diff.itemsRemoved, 1);
  assert.equal(diff.idsMoved.length, 1);
  assert.match(diff.idsMoved[0] ?? '', /^p1c1-s\d{2}-m\d{2}$/);
  assert.equal(diff.sectionsChanged.length, 1);
  assert.deepEqual(
    [diff.sectionsAdded, diff.sectionsRemoved, diff.frontMatterChanged],
    [[], [], []],
  );
});

void test('diff: an inserted measure shifts identifiers without inventing changed sentences', () => {
  // The site announces one measure more as well — otherwise the ingestion stops, as it should.
  const announced = syntheticSite(dataset, {
    officialCount: dataset.meta.counts.propositions + 1,
  });
  const inserted = ingest(
    withPage(announced, 'p1c1', (html) =>
      html.replace(
        '<li class="mesure">',
        '<li class="mesure">Une mesure ajoutée en tête de liste par la source</li>\n<li class="mesure">',
      ),
    ),
  );
  const diff = diffCorpora(corpus, inserted);
  assert.equal(diff.itemsAdded, 1, 'one new sentence');
  assert.equal(diff.itemsRemoved, 0, 'none gone');
  // Every measure after the insertion now answers to another id: that is what breaks a pin.
  assert.ok(diff.idsMoved.length >= 2, `${String(diff.idsMoved.length)} ids moved`);
  assert.equal(diff.sectionsChanged.length, 1);
});

void test('watch: six signals, and each of them can ring', () => {
  const base: Observation = {
    robots: 'User-agent: *\nDisallow: /wp-admin/\n',
    landing: site.pages.get('landing') ?? '',
    legal: site.pages.get('legal') ?? '',
    discover: site.pages.get('discover') ?? '',
    feed: '<rss><channel><lastBuildDate>Sat, 07 Nov 2026 13:51:26 +0000</lastBuildDate></channel></rss>',
    documentPolicy: null,
  };
  const signals = measure(base);
  assert.equal(signals.official_count, String(dataset.meta.counts.propositions));
  assert.equal(signals.license_clause, sha256(SYNTHETIC_CLAUSE));
  assert.equal(signals.feed, 'Sat, 07 Nov 2026 13:51:26 +0000');
  assert.equal(signals.robots, 'allows the book');
  assert.equal(signals.document_policy, '(absent)');
  assert.deepEqual(compare(signals, measure(base)), []);

  const rings = (change: Partial<Observation>): string =>
    compare(signals, measure({ ...base, ...change }))
      .map((c) => c.split(':')[0])
      .join(',');
  assert.equal(rings({ robots: 'User-agent: *\nDisallow: /programme/\n' }), 'robots');
  assert.equal(rings({ documentPolicy: 'force-load-at-top' }), 'document_policy');
  assert.equal(rings({ feed: base.feed.replace('07 Nov', '14 Nov') }), 'feed');
  assert.equal(
    rings({ discover: base.discover.replace(/\d+ mesures/, '900 mesures') }),
    'official_count',
  );
  assert.equal(
    rings({
      legal:
        syntheticSite(dataset, { licenseClause: 'Tout est interdit.' }).pages.get('legal') ?? '',
    }),
    'license_clause',
  );
  assert.equal(
    rings({ landing: base.landing.replace('Chapitre 1 : ', 'Chapitre 1 : Nouveau titre — ') }),
    'toc',
  );
});

void test('id map: the classes, on sentences whose distance is known', () => {
  const candidate = (id: string, text: string, sectionId = 'p1c1-s01'): Candidate => ({
    id,
    sectionId,
    chapterId: sectionId.split('-')[0] ?? null,
    text,
    hash: sha256(text),
  });
  const targets = [
    candidate('t1', 'Créer un pôle public du médicament pour garantir les approvisionnements'),
    candidate(
      't2',
      'Rétablir les postes supprimés dans les services publics de proximité',
      'p1c1-s02',
    ),
  ];
  const [exact, typo, reworked, none] = matchItems(
    [
      candidate('a', 'Créer un pôle public du médicament pour garantir les approvisionnements'),
      candidate('b', 'Créer un pôle public du médicament, pour garantir les approvisionnements.'),
      candidate('c', 'Rétablir tous les postes supprimés depuis dix ans dans nos services publics'),
      candidate('d', 'Sortir des traités de libre-échange'),
    ],
    targets,
  );
  assert.deepEqual([exact?.class, exact?.to], ['exact', 't1']);
  assert.deepEqual(
    [typo?.class, typo?.to],
    ['typo', 't1'],
    'punctuation alone does not make another sentence',
  );
  assert.equal(reworked?.to, 't2');
  assert.ok(reworked.class === 'close' || reworked.class === 'reworked', reworked.class);
  assert.deepEqual([none?.class, none?.to], ['none', null]);

  assert.equal(classOf(1, true), 'exact');
  assert.equal(classOf(0.96, false), 'typo');
  assert.equal(classOf(0.8, false), 'close');
  assert.equal(classOf(0.6, false), 'reworked');
  assert.equal(classOf(0.49, false), 'none');
  assert.equal(foldForMatch('L’État, c’est NOUS !'), 'l etat c est nous');
  assert.equal(dice(trigrams('abc'), trigrams('abc')), 1);
  assert.equal(dice(trigrams('abc'), trigrams('xyz')), 0);
});

void test('id map: a section inherits where its propositions went, the main heir first', () => {
  const match = (
    toSection: string | null,
    score: number,
  ): Parameters<typeof sectionFlow>[0][number] => ({
    from: 'x',
    to: toSection === null ? null : `${toSection}-m01`,
    toSection,
    toChapter: toSection === null ? null : (toSection.split('-')[0] ?? null),
    score,
    class: toSection === null ? 'none' : 'close',
  });
  assert.deepEqual(
    sectionFlow([
      match('p2c1-s03', 1),
      match('p2c1-s03', 0.9),
      match('p4c2-s01', 0.8),
      match('p5c1-s02', 0.1),
      match(null, 0.2),
    ]),
    { heirs: ['p2c1-s03', 'p4c2-s01'], chapter: 'p2c1' },
    'a section that received a crumb is not an heir',
  );
  assert.deepEqual(sectionFlow([match(null, 0.3)]), { heirs: [], chapter: null });
});
