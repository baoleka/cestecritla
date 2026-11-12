/**
 * The publisher on the synthetic site: what the manifest may carry, and how much.
 * Run: npx tsx --test scripts/aec26-publish.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SITE_ORIGIN, normalizeText, sha256 } from './aec-common.js';
import type { Dataset } from './aec-types.js';
import { buildCorpus, flatItems } from './aec26-core.js';
import { SYNTHETIC_CLAUSE, syntheticSite } from './aec26-fixture.js';
import {
  buildManifest,
  buildQuotes,
  ceilingViolations,
  incipitOf,
  licenseClause,
  manifestPropositions,
  measureExposure,
  validateManifest,
  validateQuotes,
  type PublishInput,
} from './aec26-publish.js';
import { parseToc } from './aec26-source.js';
import type { ExposurePolicy, Manifest, PrivateItem } from './aec26-types.js';
import { cssCollapse, decodeLocator, wordCount } from './locator.js';

const dataset = JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
const site = syntheticSite(dataset);
const corpus = buildCorpus({
  toc: parseToc(site.pages.get('landing') ?? ''),
  pages: site.pages,
  log: site.log,
  siteOrigin: SITE_ORIGIN,
});
const clause = licenseClause(site.pages.get('legal') ?? '');

const POLICY: ExposurePolicy = {
  locator_min_words: 4,
  locator_max_words: 8,
  locator_max_item_share: 0.5,
  locator_scope: 'all',
  incipit_min_words: 4,
  incipit_max_words: 8,
  incipit_max_item_share: 0.5,
  max_share: 0.3,
  max_fully_exposed: 0,
  max_quotes: 40,
  max_quote_share: 0.05,
  license_statement_sha256: clause.sha256,
  validated_on: null,
};

function input(override: Partial<PublishInput> = {}): PublishInput {
  return {
    corpus,
    pages: site.pages,
    policy: POLICY,
    quoted: new Set<string>(),
    license: { statement_url: `${SITE_ORIGIN}/mentions-legales/`, statement_sha256: clause.sha256 },
    ...override,
  };
}

const { manifest, anchorOnly, locatorLengths } = buildManifest(input());
const privateItems = new Map<string, PrivateItem>(
  corpus.sections.flatMap((s) => flatItems(s.items)).map((i) => [i.id, i]),
);

void test('the manifest passes its own gate and holds no field a sentence could hide in', () => {
  assert.deepEqual(validateManifest(manifest, POLICY), []);
  const forbidden = new Set(['text', 'raw', 'html', 'inline', 'hash', 'contentHash', 'page']);
  const walk = (value: unknown, path: string): void => {
    if (Array.isArray(value))
      value.forEach((v, i) => {
        walk(v, `${path}[${String(i)}]`);
      });
    else if (typeof value === 'object' && value !== null) {
      for (const [key, v] of Object.entries(value)) {
        assert.equal(forbidden.has(key), false, `${path}.${key} must not be published`);
        walk(v, `${path}.${key}`);
      }
    }
  };
  walk(manifest, 'manifest');
});

void test('every proposition is there once, with the hash of its text and nothing else of it', () => {
  const props = manifestPropositions(manifest);
  assert.equal(props.length, corpus.meta.counts.propositions);
  assert.equal(new Set(props.map((p) => p.id)).size, props.length);
  for (const item of props) {
    const source = privateItems.get(item.id);
    assert.ok(source, item.id);
    assert.equal(item.sha256, sha256(source.text), item.id);
    assert.equal(item.words, source.text.split(' ').length, item.id);
  }
  // Prose carries a hash and a length: no incipit, no locator, ever.
  for (const section of manifest.sections) {
    for (const item of section.items.filter((i) => i.kind === 'paragraph')) {
      assert.deepEqual(Object.keys(item).sort(), ['id', 'kind', 'sha256', 'words'], item.id);
    }
  }
  for (const item of [...manifest.introduction.items, ...manifest.parts.flatMap((p) => p.items)]) {
    assert.deepEqual(Object.keys(item).sort(), ['id', 'kind', 'sha256', 'words'], item.id);
  }
});

void test('incipits: key measures only, a real prefix, rationed twice', () => {
  let shown = 0;
  for (const item of manifestPropositions(manifest)) {
    if (item.incipit === undefined) continue;
    shown += 1;
    assert.equal(item.kind, 'key_measure', item.id);
    const source = privateItems.get(item.id);
    assert.ok(source?.text.startsWith(item.incipit), `${item.id}: incipit is not a prefix`);
    const n = wordCount(item.incipit);
    assert.ok(
      n >= 4 && n <= 8 && n <= Math.floor(item.words / 2),
      `${item.id}: ${String(n)} words`,
    );
    assert.doesNotMatch(item.incipit, /[\s,;:«(]$/u, `${item.id}: ends on punctuation`);
  }
  assert.ok(shown > 60, `only ${String(shown)} incipits`);

  assert.equal(incipitOf('un deux trois quatre cinq six sept', POLICY), null, '7 words: half is 3');
  assert.equal(
    incipitOf('un deux trois quatre cinq six sept huit', POLICY),
    'un deux trois quatre',
  );
  assert.equal(
    incipitOf(
      'un deux trois quatre cinq six sept huit : neuf dix onze douze treize quatorze quinze seize dix-sept dix-huit',
      POLICY,
    ),
    'un deux trois quatre cinq six sept huit',
  );
  assert.equal(
    incipitOf(
      'Bloquer les prix essentiels : alimentation énergie carburants loyers transports',
      POLICY,
    ),
    'Bloquer les prix essentiels',
    'ten words, five allowed, the fifth is a colon: it is dropped with its space',
  );
});

void test('locators: a prefix of the raw text, unique in the page, rationed', () => {
  let located = 0;
  for (const section of manifest.sections) {
    const html = site.pages.get(section.chapterId) ?? '';
    for (const item of section.items) {
      if (typeof item.locator !== 'string') continue;
      located += 1;
      const text = decodeLocator(item.locator);
      assert.ok(text !== null, item.id);
      const source = privateItems.get(item.id);
      assert.ok(source && cssCollapse(source.raw).startsWith(text), `${item.id}: not a prefix`);
      assert.equal(wordCount(text), item.locator_words, item.id);
      assert.ok(wordCount(text) <= Math.floor(item.words / 2), `${item.id}: more than half`);
      // Independent check, on the page as served: the exact characters occur once in its text.
      const plain = html
        .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '')
        .replace(/<[^>]+>/g, '');
      const decoded = plain.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      assert.equal(decoded.split(text).length - 1, 1, `${item.id}: locator is not unique`);
    }
  }
  const props = manifestPropositions(manifest);
  const none = props.filter((p) => p.locator === null).length;
  assert.equal(located + none, props.length, 'scope "all": every proposition was considered');
  assert.equal(
    none,
    Object.values(anchorOnly).reduce((a, b) => a + b, 0),
  );
  assert.equal(
    located,
    Object.values(locatorLengths).reduce((a, b) => a + b, 0),
  );
  assert.ok(located > 700, `only ${String(located)} locators`);
});

void test('exposure: recomputed from the manifest alone, each item counted once', () => {
  const e = manifest.meta.exposure;
  assert.deepEqual(measureExposure(manifest, new Set()), e);
  let total = 0;
  let covered = 0;
  for (const item of manifestPropositions(manifest)) {
    total += item.words;
    covered += Math.max(
      item.incipit === undefined ? 0 : wordCount(item.incipit),
      item.locator_words ?? 0,
    );
  }
  assert.equal(e.proposition_words, total);
  assert.equal(e.covered_words, covered);
  assert.equal(e.share, Math.round((covered / total) * 10_000) / 10_000);
  assert.equal(e.fully_exposed, 0, 'half of an item at most: none can be left with two words');
  assert.ok(e.covered_words <= e.incipit_words + e.locator_words);
  assert.deepEqual(ceilingViolations(e, 0, POLICY), []);
});

void test('the dials change the numbers the way the policy says', () => {
  const none = buildManifest(input({ policy: { ...POLICY, locator_scope: 'none' } })).manifest;
  assert.equal(none.meta.exposure.locator_words, 0);
  assert.equal(
    manifestPropositions(none).some((p) => p.locator !== undefined),
    false,
  );
  assert.equal(none.meta.exposure.covered_words, none.meta.exposure.incipit_words);

  const quotedId =
    manifestPropositions(manifest).find((p) => p.kind === 'measure' && p.words > 12)?.id ?? '';
  const narrow = buildManifest(
    input({ policy: { ...POLICY, locator_scope: 'key_and_quoted' }, quoted: new Set([quotedId]) }),
  ).manifest;
  for (const item of manifestPropositions(narrow)) {
    const inScope = item.kind === 'key_measure' || item.id === quotedId;
    assert.equal(item.locator !== undefined, inScope, item.id);
  }
  assert.ok(narrow.meta.exposure.locator_words < manifest.meta.exposure.locator_words / 5);
  assert.ok(none.meta.exposure.share < narrow.meta.exposure.share);
  assert.ok(narrow.meta.exposure.share < manifest.meta.exposure.share);
});

void test('ceilings are refused by name', () => {
  const e = manifest.meta.exposure;
  assert.match(
    ceilingViolations(e, 0, { ...POLICY, max_share: 0.01 })[0] ?? '',
    /covered share .* over the ceiling 1\.00 %/,
  );
  assert.match(ceilingViolations(e, 41, POLICY)[0] ?? '', /41 whole quotations \(ceiling 40\)/);
  const exposed = { ...e, fully_exposed: 3 };
  assert.match(
    ceilingViolations(exposed, 0, POLICY)[0] ?? '',
    /3 proposition\(s\) are left with two words or fewer/,
  );
  const quoted = { ...e, quote_words: Math.ceil(e.proposition_words * 0.06) };
  assert.match(
    ceilingViolations(quoted, 0, POLICY)[0] ?? '',
    /quoted share .* over the ceiling 5\.00 %/,
  );
});

void test('the gate sees what a hand could slip into the file', () => {
  const tamper = (edit: (m: Manifest) => void): string[] => {
    const copy = structuredClone(manifest);
    edit(copy);
    return validateManifest(copy, POLICY);
  };
  const firstSection = (m: Manifest): Manifest['sections'][number] => {
    const s = m.sections[0];
    if (s === undefined) throw new Error('no section');
    return s;
  };
  const measure = (m: Manifest): Manifest['sections'][number]['items'][number] => {
    const item = firstSection(m).items.find(
      (i) => i.kind === 'measure' && typeof i.locator === 'string',
    );
    if (item === undefined) throw new Error('no located measure');
    return item;
  };
  assert.match(
    tamper((m) => {
      Object.assign(measure(m), { text: 'une phrase entière' });
    }).join('\n'),
    /unexpected field "text"/,
  );
  assert.match(
    tamper((m) => {
      measure(m).incipit = 'Un incipit sur une mesure ordinaire';
    }).join('\n'),
    /incipit on a measure/,
  );
  assert.match(
    tamper((m) => {
      const item = measure(m);
      item.locator = `${item.locator ?? ''}%20un%20deux%20trois%20quatre%20cinq%20six%20sept%20huit%20neuf`;
    }).join('\n'),
    /locator of \d+ words breaks the policy/,
  );
  assert.match(
    tamper((m) => {
      measure(m).locator = 'text=un,deux';
    }).join('\n'),
    /locator is not a plain text= directive/,
  );
  assert.match(
    tamper((m) => {
      const section = firstSection(m);
      section.items = section.items.filter((i) => i.id !== measure(m).id);
    }).join('\n'),
    /propositions, official count/,
  );
  assert.match(
    tamper((m) => {
      firstSection(m).url = 'https://example.org/#x';
    }).join('\n'),
    /url does not end with its anchor|url outside the book/,
  );
});

void test('quotes: whole propositions only, pinned by hash, each with its link', () => {
  const props = manifestPropositions(manifest);
  const key = props.find((p) => p.kind === 'key_measure' && typeof p.locator === 'string');
  const plain = props.find((p) => p.kind === 'measure' && p.locator === null);
  assert.ok(key && plain);
  const quotes = buildQuotes(corpus, manifest, [
    { id: key.id, sha256: key.sha256, usedBy: 'riposte:rip-02' },
    { id: key.id, sha256: key.sha256, usedBy: 'mot:regle-verte' },
    { id: plain.id, sha256: plain.sha256, usedBy: 'riposte:rip-01' },
  ]);
  assert.equal(quotes.meta.count, 2);
  assert.deepEqual(validateQuotes(quotes, manifest), []);
  const first = quotes.quotes.find((q) => q.id === key.id);
  assert.ok(first);
  assert.deepEqual(first.used_by, ['mot:regle-verte', 'riposte:rip-02']);
  assert.equal(sha256(normalizeText(first.text)), key.sha256);
  assert.ok(first.url.includes(':~:text='), 'a quote links to the sentence when a locator exists');
  const second = quotes.quotes.find((q) => q.id === plain.id);
  assert.ok(second && !second.url.includes(':~:'), 'and to the section anchor otherwise');

  const paragraph = manifest.sections[0]?.items.find((i) => i.kind === 'paragraph');
  assert.ok(paragraph);
  assert.throws(
    () =>
      buildQuotes(corpus, manifest, [
        { id: paragraph.id, sha256: paragraph.sha256, usedBy: 'riposte:rip-03' },
      ]),
    /riposte:rip-03: .* is not a proposition/,
  );
  assert.throws(
    () =>
      buildQuotes(corpus, manifest, [
        { id: key.id, sha256: '0'.repeat(64), usedBy: 'riposte:rip-04' },
      ]),
    /riposte:rip-04: .* changed since it was pinned/,
  );

  // What CI can see without the corpus: a retouched quotation no longer hashes to its pin.
  const retouched = structuredClone(quotes);
  const target = retouched.quotes[0];
  assert.ok(target);
  target.text = target.text.replace(/\S+$/, 'autrement');
  assert.match(validateQuotes(retouched, manifest).join('\n'), /text does not hash to sha256/);
});

void test('the licence clause is read from the legal notice, and a change is a different hash', () => {
  assert.equal(clause.text, SYNTHETIC_CLAUSE);
  assert.equal(clause.sha256, sha256(SYNTHETIC_CLAUSE));
  const changed = syntheticSite(dataset, {
    licenseClause: `${SYNTHETIC_CLAUSE} Les liens sont interdits.`,
  });
  assert.notEqual(licenseClause(changed.pages.get('legal') ?? '').sha256, clause.sha256);
  assert.throws(
    () => licenseClause('<h2>Éditeur</h2><p>Rien.</p>'),
    /expected one "Licence" heading, found 0/,
  );
});
