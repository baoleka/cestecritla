/**
 * Gates on the BUILT app of the 2026 edition (lot C6): what it links to, and what it quotes.
 *
 * The regime is "pointer + short quotation" (D15.2). Read on dist/, because what counts is
 * what ships:
 *   - every internal link leads to a page that exists;
 *   - every link to the official site is an address the manifest knows — a section, a chapter,
 *     a part, the book — never a guessed URL;
 *   - the only words of the programme on a page are official titles, the rationed incipit of a
 *     key measure, or a quotation listed in data/2026/quotes.json, each with its author and a
 *     link to the page of origin;
 *   - a page never quotes more words than it says of its own;
 *   - nothing of the text reaches a description, a link preview or structured data.
 *
 * Run: npm run build && npx tsx --test scripts/site.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { appVoiceOnly, countWords, programmeBlocks, visibleText } from './app-voice.js';
import { manifestPropositions } from './aec26-publish.js';
import type { Manifest, QuotesFile } from './aec26-types.js';
import { htmlPages, readBuildMode } from './build-mode.js';

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const manifest = json('data/2026/manifest.json') as Manifest;
const quotes = json('data/2026/quotes.json') as QuotesFile;

const app = existsSync('dist') && readBuildMode() === 'app';
const skip = app ? false : 'no app build in dist/ (run `npm run build`)';
const pages = app ? htmlPages('dist') : [];
const read = (page: string): string => readFileSync(`dist/${page}`, 'utf8');

const NBSP = String.fromCodePoint(0xa0);
/** The typography the pages apply to words of the programme (src/lib/strings.ts, `typeset`). */
const typeset = (text: string): string =>
  text.replace(/ ([:;!?»%])/g, `${NBSP}$1`).replace(/« /g, `«${NBSP}`);
const plain = (text: string): string => text.replaceAll(NBSP, ' ').replace(/\s+/g, ' ').trim();

void test('every internal link leads somewhere', { skip }, () => {
  const exists = (path: string): boolean => {
    const clean = path.split('#')[0]?.split('?')[0] ?? '';
    if (clean === '' || clean === '/') return true;
    const local = `dist${clean}`;
    return clean.endsWith('/') ? existsSync(`${local}index.html`) : existsSync(local);
  };
  const broken = new Set<string>();
  for (const page of pages) {
    for (const m of read(page).matchAll(/\bhref="(\/[^"]*)"/g)) {
      const href = m[1] ?? '';
      if (!exists(href)) broken.add(`${href} (from ${page})`);
    }
  }
  assert.deepEqual([...broken].slice(0, 20), [], 'links to pages that do not exist');
});

void test('every link to the official site is an address of the manifest', { skip }, () => {
  const known = new Set<string>([
    manifest.meta.source,
    manifest.meta.license.statement_url,
    manifest.meta.official_count_source,
    manifest.introduction.url,
    ...manifest.parts.map((p) => p.url),
    ...manifest.chapters.map((c) => c.url),
    ...manifest.sections.map((s) => s.url),
  ]);
  const unknown = new Set<string>();
  for (const page of pages) {
    const html = read(page);
    for (const m of html.matchAll(/(?:href|cite)="(https:\/\/melenchon2027\.fr[^"]*)"/g)) {
      if (!known.has(m[1] ?? '')) unknown.add(`${m[1] ?? ''} (from ${page})`);
    }
    // A text directive is added by script, from data-fragment: never written into an href.
    assert.doesNotMatch(html, /href="[^"]*:~:/, `${page}: a text directive in a static href`);
  }
  assert.deepEqual([...unknown].slice(0, 20), [], 'official links the manifest does not know');
});

void test(
  'link locators on the page are the manifest’s, and travel in data-fragment only',
  { skip },
  () => {
    const locators = new Set(
      manifestPropositions(manifest)
        .map((p) => p.locator)
        .filter((l): l is string => typeof l === 'string'),
    );
    let seen = 0;
    for (const page of pages.filter((p) => /^s\/p\d/.test(p))) {
      for (const m of read(page).matchAll(/data-fragment="([^"]*)"/g)) {
        seen += 1;
        assert.ok(locators.has(m[1] ?? ''), `${page}: a locator the manifest does not hold`);
      }
    }
    assert.ok(seen >= locators.size, `${String(seen)} locators on the section pages`);
  },
);

void test(
  'the programme is only ever printed as an incipit or a listed quotation',
  { skip },
  () => {
    const incipits = new Map(
      manifestPropositions(manifest)
        .filter((p) => p.incipit !== undefined)
        .map((p) => [plain(`${typeset(p.incipit ?? '')}…`), p.id]),
    );
    const listed = new Map(quotes.quotes.map((q) => [plain(typeset(q.text)), q.id]));
    const used = new Set<string>();
    let incipitWords = 0;
    for (const page of pages) {
      const html = read(page);
      const blocks = programmeBlocks(html);
      // Every figure.verbatim must be a marked one: an unmarked block would escape the count.
      assert.equal(
        (html.match(/<figure class="verbatim"/g) ?? []).length,
        blocks.length,
        `${page}: a verbatim block without data-programme`,
      );
      let quotedWords = 0;
      for (const block of blocks) {
        const text = plain(block.quoted);
        quotedWords += countWords(text);
        if (block.kind === 'incipit') {
          assert.ok(incipits.has(text), `${page}: an incipit that is not the manifest’s`);
          // Counted the way the manifest counts: whitespace-separated, a lone « included.
          if (/^s\/p\d/.test(page)) incipitWords += text.split(' ').length;
        } else if (block.kind === 'quote') {
          const id = listed.get(text);
          assert.ok(id !== undefined, `${page}: a quotation absent from data/2026/quotes.json`);
          used.add(id);
        } else {
          assert.fail(`${page}: unknown kind of programme block "${block.kind}"`);
        }
        // What the source asks of a short extract: the author, and a link to the page of origin.
        assert.match(block.html, /La France insoumise, L’Avenir en commun, édition 2026/, page);
        assert.match(
          block.html,
          /href="https:\/\/melenchon2027\.fr\/programme\/livre\/[^"]+#[^"]+"/,
          page,
        );
      }
      if (quotedWords > 0) {
        const own = countWords(visibleText(appVoiceOnly(html)));
        assert.ok(
          quotedWords < own,
          `${page}: ${String(quotedWords)} words quoted, ${String(own)} of ours`,
        );
      }
    }
    // One incipit per key measure that has one, on its own section page: the ration, spent once.
    assert.equal(incipitWords, manifest.meta.exposure.incipit_words);
    const orphans = quotes.quotes.filter((q) => !used.has(q.id)).map((q) => q.id);
    assert.deepEqual(orphans, [], 'quotations listed but printed nowhere');
  },
);

void test('a marked element never nests one of its own tag', { skip }, () => {
  for (const page of pages) {
    for (const m of read(page).matchAll(
      /<([a-z][a-z0-9]*)\b[^>]*\bdata-programme="[^"]*"[^>]*>([\s\S]*?)<\/\1>/g,
    )) {
      if (m[1] === 'figure') continue;
      assert.ok(
        !new RegExp(`<${m[1] ?? ''}\\b`).test(m[2] ?? ''),
        `${page}: nested <${m[1] ?? ''}>`,
      );
    }
  }
});

void test(
  'no word of the text reaches a description, a preview or structured data',
  { skip },
  () => {
    const extracts = [
      ...manifestPropositions(manifest).flatMap((p) =>
        p.incipit === undefined ? [] : [p.incipit],
      ),
      ...quotes.quotes.map((q) => q.text),
    ].map(plain);
    for (const page of pages) {
      const html = read(page);
      const outside = [
        ...html.matchAll(/<meta\b[^>]*\bcontent="([^"]*)"[^>]*>/g),
        ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
        ...html.matchAll(/<title>([\s\S]*?)<\/title>/g),
      ]
        .map((m) => plain(m[1] ?? ''))
        .join(' \u0000 ');
      for (const extract of extracts) {
        assert.ok(!outside.includes(extract), `${page}: an extract outside its quotation block`);
      }
    }
  },
);

void test('the search data is the manifest, projected: nothing more', { skip }, () => {
  const name = readdirSync('dist/data').find((f) => f.startsWith('meta-'));
  assert.ok(name?.includes(manifest.meta.corpus_version), 'meta file is not versioned by corpus');
  const meta = json(`dist/data/${name ?? ''}`) as {
    sections: Record<string, [string, string, string]>;
    items: Record<string, [string, string, string]>;
  };
  const propositions = manifestPropositions(manifest);
  assert.equal(Object.keys(meta.items).length, propositions.length);
  assert.equal(Object.keys(meta.sections).length, manifest.sections.length);
  for (const item of propositions) {
    const entry = meta.items[item.id];
    assert.ok(entry, item.id);
    assert.equal(entry[1], item.locator ?? '', `${item.id}: locator`);
    assert.equal(entry[2], item.incipit ?? '', `${item.id}: incipit`);
    assert.ok(countWords(entry[0]) <= 3, `${item.id}: a label, not a sentence`);
  }
  for (const section of manifest.sections) {
    assert.deepEqual(meta.sections[section.id]?.[0], section.title);
    assert.deepEqual(meta.sections[section.id]?.[2], section.url);
  }
});

void test(
  'every section of the 2026 edition has its pointer page, in the table of contents',
  { skip },
  () => {
    const home = read('index.html');
    for (const section of manifest.sections) {
      assert.ok(existsSync(`dist/s/${section.id}/index.html`), section.id);
      assert.ok(
        home.includes(`href="/s/${section.id}/"`),
        `${section.id} is not in the table of contents`,
      );
      const html = read(`s/${section.id}/index.html`);
      assert.ok(
        html.includes(`href="${section.url}"`),
        `${section.id}: no link to the official page`,
      );
      assert.match(html, /Site non officiel\./, section.id);
    }
  },
);

void test(
  'the sitemap lists what may be indexed, and nothing that asks not to be',
  { skip },
  () => {
    const sitemap = readFileSync('dist/sitemap.xml', 'utf8');
    const listed = [...sitemap.matchAll(/<loc>https:\/\/cestecritla\.fr([^<]*)<\/loc>/g)].map(
      (m) => m[1] ?? '',
    );
    assert.ok(listed.length > manifest.sections.length, `${String(listed.length)} URLs`);
    assert.equal(new Set(listed).size, listed.length, 'a URL listed twice');
    for (const path of listed) {
      const file = `dist${path}index.html`;
      assert.ok(existsSync(file), `${path} is listed and does not exist`);
      assert.doesNotMatch(
        readFileSync(file, 'utf8'),
        /<meta name="robots" content="noindex">/,
        `${path} is listed and noindex`,
      );
    }
    for (const section of manifest.sections)
      assert.ok(listed.includes(`/s/${section.id}/`), section.id);
    assert.match(
      readFileSync('dist/robots.txt', 'utf8'),
      /^Sitemap: https:\/\/cestecritla\.fr\/sitemap\.xml$/m,
    );
  },
);
