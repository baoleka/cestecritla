/**
 * The 2026 chain, from stored pages to the private corpus, on a synthetic site (no network, no
 * text of the 2026 edition — see aec26-fixture.ts).
 * Run: npx tsx --test scripts/aec26.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SITE_ORIGIN } from './aec-common.js';
import type { Dataset } from './aec-types.js';
import { buildCorpus, compareInvariants, flatItems, measureInvariants } from './aec26-core.js';
import { syntheticSite, withPage, type SyntheticSite } from './aec26-fixture.js';
import { ParseError26, parseOfficialCount, parseToc, robotsDisallows } from './aec26-source.js';
import { ID26, isId26, sectionIdOf, type PrivateCorpus } from './aec26-types.js';

const dataset = JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
const site = syntheticSite(dataset);

function ingest(from: SyntheticSite): PrivateCorpus {
  const landing = from.pages.get('landing');
  if (landing === undefined) throw new Error('no landing');
  return buildCorpus({
    toc: parseToc(landing),
    pages: from.pages,
    log: from.log,
    siteOrigin: SITE_ORIGIN,
  });
}

const corpus = ingest(site);
const all = [
  ...flatItems(corpus.introduction.items),
  ...corpus.parts.flatMap((p) => flatItems(p.items)),
  ...corpus.chapters.flatMap((c) => flatItems(c.items)),
  ...corpus.sections.flatMap((s) => flatItems(s.items)),
];

void test('every item the fixture laid out is found, with the hash of the 2025 corpus', () => {
  const found = new Map(all.map((i) => [i.id, i]));
  assert.equal(found.size, site.expected.length);
  for (const expected of site.expected) {
    const item = found.get(expected.id);
    assert.ok(item, `missing ${expected.id}`);
    assert.equal(item.kind, expected.kind, expected.id);
    // Ids and hashes only in the message: a failing test must not print the sentence either.
    assert.equal(item.hash, expected.hash, `${expected.id}: hash differs`);
    assert.equal(item.text === expected.text, true, `${expected.id}: text differs`);
  }
});

void test('the counts are the ones of the source, and the official count is enforced', () => {
  const c = corpus.meta.counts;
  assert.equal(c.parts, site.counts.parts);
  assert.equal(c.chapters, site.counts.chapters);
  assert.equal(c.sections, site.counts.sections);
  assert.equal(c.propositions, dataset.meta.counts.propositions);
  assert.equal(c.key_measures, dataset.meta.counts.mesure_cle);
  assert.equal(c.measures, dataset.meta.counts.mesure);
  assert.equal(c.sub_measures, dataset.meta.counts.sous_mesure);
  assert.equal(c.section_paragraphs, dataset.meta.counts.paragraphs);
  assert.equal(c.chapter_paragraphs, 2);
  assert.equal(corpus.meta.official_count, c.propositions);

  assert.throws(
    () => ingest(syntheticSite(dataset, { officialCount: c.propositions - 6 })),
    /the site announces 831 measures, the extraction finds 837/,
  );
});

void test('identifiers follow the 2026 grammar and never meet a 2025 identifier', () => {
  for (const item of all) assert.ok(isId26(item.id), item.id);
  for (const s of corpus.sections) {
    assert.match(s.id, ID26.section);
    for (const item of flatItems(s.items)) assert.equal(sectionIdOf(item.id), s.id);
  }
  assert.equal(sectionIdOf('p4c7-s03-m12.s2'), 'p4c7-s03');
  assert.equal(sectionIdOf('p4c7'), null);

  const ids2025 = [
    dataset.introduction.id,
    ...dataset.introduction.paragraphs.map((p) => p.id),
    ...dataset.parts.flatMap((p) => [
      p.id,
      ...p.paragraphs.map((x) => x.id),
      ...p.epigraphs.map((x) => x.id),
    ]),
    ...dataset.chapters.map((c) => c.id),
    ...dataset.sections.flatMap((s) => [
      s.id,
      ...s.chiffres.map((x) => x.id),
      ...s.items.flatMap((i) => [
        i.id,
        ...(i.kind === 'measure' ? (i.subMeasures ?? []).map((x) => x.id) : []),
      ]),
    ]),
  ];
  assert.ok(ids2025.length > 1100, `only ${String(ids2025.length)} ids in the 2025 corpus`);
  const ids2026 = new Set(['p0', ...corpus.parts.map((p) => p.id), ...all.map((i) => i.id)]);
  for (const id of ids2025) {
    assert.equal(isId26(id), false, `${id} would pass for a 2026 id`);
    assert.equal(ids2026.has(id), false, `${id} exists in both editions`);
  }
});

void test('sub-measures are attached to the measure above their class-less wrapper', () => {
  const withSubs = corpus.sections.flatMap((s) =>
    s.items.filter((i) => (i.subMeasures?.length ?? 0) > 0),
  );
  assert.ok(withSubs.length > 0);
  assert.equal(corpus.meta.counts.measures_with_sub_measures, withSubs.length);
  for (const measure of withSubs) {
    assert.equal(measure.kind, 'measure');
    (measure.subMeasures ?? []).forEach((sub, index) => {
      assert.equal(sub.id, `${measure.id}.s${String(index + 1)}`);
      assert.equal(sub.kind, 'sub_measure');
    });
  }
});

void test('the raw text keeps the typography that the normalised text flattens', () => {
  const narrow = String.fromCodePoint(0x202f);
  const typeset = all.filter((i) => i.raw.includes(narrow));
  assert.ok(typeset.length > 50, 'the fixture should carry narrow no-break spaces');
  for (const item of typeset) assert.equal(item.text.includes(narrow), false, item.id);
});

void test('two ingestions of the same pages give the same corpus, byte for byte', () => {
  assert.equal(JSON.stringify(ingest(site)), JSON.stringify(corpus));
  assert.match(corpus.meta.corpus_version, /^[0-9a-f]{16}$/);
});

void test('the three statements of the structure must agree', () => {
  // The part page lists one section fewer than the chapter page carries.
  const firstSectionLink = /<a href="[^"]+#[^"]+">[^<]+<\/a>\n/;
  assert.throws(
    () => ingest(withPage(site, 'p1', (html) => html.replace(firstSectionLink, ''))),
    /p1c1: the part page lists \d+ section\(s\), the chapter page has \d+/,
  );
  // A chapter title that differs from the landing page.
  assert.throws(
    () => ingest(withPage(site, 'p2c1', (html) => html.replace(/(<h1 id="chapitre1">)/, '$1Le '))),
    /p2c1: title differs from the landing page/,
  );
  // A canonical URL that is not the URL fetched.
  assert.throws(
    () =>
      ingest(
        withPage(site, 'p1c2', (html) => html.replace('/chapitre2/">', '/chapitre2/?utm=x">')),
      ),
    /p1c2: canonical/,
  );
});

/** Breaks one chapter page and returns the error the parser raises. */
function parseFailure(name: string, rewrite: (html: string) => string): Error {
  try {
    ingest(withPage(site, 'p1c1', rewrite));
  } catch (error) {
    assert.ok(error instanceof ParseError26, `${name}: expected a ParseError26`);
    return error;
  }
  throw new Error(`${name}: the broken page was accepted`);
}

void test('unknown markup stops the parser, and the error never carries the text', () => {
  const secret = 'Phrase témoin qui ne doit jamais sortir dans un message';
  const cases: [string, (html: string) => string, RegExp][] = [
    [
      'unknown element in a section',
      (h) =>
        h.replace(
          '<div class="mesure-cle">',
          `<blockquote>${secret}</blockquote><div class="mesure-cle">`,
        ),
      /unknown element blockquote/,
    ],
    [
      'stray text between two elements',
      (h) => h.replace('<div class="mesure-cle">', `${secret}<div class="mesure-cle">`),
      /unexpected text node of \d+ characters/,
    ],
    [
      'a second key measure',
      (h) =>
        h.replace(
          '<div class="mesure-cle">',
          `<div class="mesure-cle"><h6>Mesure clé</h6><p>${secret}</p></div><div class="mesure-cle">`,
        ),
      /more than one key measure/,
    ],
    [
      'a list nested inside its measure',
      (h) =>
        h.replace(
          /(<li class="mesure">[^<]*)<\/li>/,
          `$1<ul class="wp-block-list"><li class="sous_mesure">${secret}</li></ul></li>`,
        ),
      /a measure with a list nested inside it/,
    ],
    [
      'a wrapper with nothing above it',
      (h) =>
        h.replace(
          '<ul class="wp-block-list">',
          `<ul class="wp-block-list"><li><ul class="wp-block-list"><li class="sous_mesure">${secret}</li></ul></li>`,
        ),
      /sub-measures with no measure above them/,
    ],
    [
      'a list item of an unknown class',
      (h) =>
        h.replace('<li class="mesure">', `<li class="encart">${secret}</li><li class="mesure">`),
      /expected li\.mesure, found li\.encart/,
    ],
    [
      'a key measure without its label',
      (h) => h.replace('<h6>Mesure clé</h6>', '<h6>À savoir</h6>'),
      /div\.mesure-cle is not "h6 Mesure clé \+ p"/,
    ],
    [
      'a section anchor that is not a slug',
      (h) =>
        h.replace(
          /<h3 class="section-title" id="[^"]+">/,
          '<h3 class="section-title" id="Titre avec espaces">',
        ),
      /section anchor is not a slug/,
    ],
    [
      'an unexpected child of main',
      (h) =>
        h.replace(
          '<div class="chapitre_sections">',
          `<div class="encart">${secret}</div><div class="chapitre_sections">`,
        ),
      /unexpected children of main: div\.encart/,
    ],
  ];
  for (const [name, rewrite, pattern] of cases) {
    const error = parseFailure(name, rewrite);
    assert.match(error.message, pattern, name);
    assert.equal(error.message.includes('témoin'), false, `${name}: the error prints the text`);
  }
});

void test('a misdecoded page is refused, a duplicated anchor too', () => {
  const replacement = String.fromCodePoint(0xfffd);
  assert.throws(
    () =>
      ingest(
        withPage(site, 'p1c1', (h) =>
          h.replace('<li class="mesure">', `<li class="mesure">${replacement}`),
        ),
      ),
    /replacement character U\+FFFD/,
  );
  assert.throws(
    () =>
      ingest(
        withPage(site, 'p1c1', (h) => {
          const first = /<h3 class="section-title" id="([^"]+)">/.exec(h)?.[1] ?? '';
          let seen = 0;
          return h.replace(/<h3 class="section-title" id="[^"]+">/g, (tag) => {
            seen += 1;
            return seen === 2 ? `<h3 class="section-title" id="${first}">` : tag;
          });
        }),
      ),
    /duplicate section anchor/,
  );
});

void test('expected invariants: a changed book is a named difference, not a silent update', () => {
  const measured = measureInvariants(corpus);
  assert.deepEqual(compareInvariants(measured, measured), []);
  const changed = structuredClone(measured);
  changed.counts.measures += 1;
  changed.sections_per_chapter.p1c1 = 99;
  assert.deepEqual(compareInvariants(measured, changed), [
    `counts.measures: expected ${String(changed.counts.measures)}, measured ${String(measured.counts.measures)}`,
    `sections_per_chapter.p1c1: expected 99, measured ${String(measured.sections_per_chapter.p1c1)}`,
  ]);
});

void test('small readers: robots.txt and the announced count', () => {
  assert.equal(
    robotsDisallows('User-agent: *\nDisallow: /wp-admin/\n', '/programme/livre/'),
    false,
  );
  assert.equal(
    robotsDisallows('User-agent: *\nDisallow: /programme/\n', '/programme/livre/'),
    true,
  );
  assert.equal(robotsDisallows('User-agent: GPTBot\nDisallow: /\n', '/programme/livre/'), false);
  assert.equal(
    robotsDisallows('User-agent: * # everyone\nDisallow: / # all\n', '/programme/livre/'),
    true,
  );
  const narrow = String.fromCodePoint(0x202f);
  assert.equal(parseOfficialCount(`<p>Il compte 1${narrow}069 mesures concrètes.</p>`), 1069);
  assert.equal(parseOfficialCount('<p>Il compte 831 mesures.</p>'), 831);
  assert.equal(parseOfficialCount('<p>Un programme complet.</p>'), null);
  assert.equal(parseOfficialCount('<script>var x = "12 mesures";</script><p>Rien.</p>'), null);
});
