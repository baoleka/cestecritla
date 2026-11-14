/**
 * The first words of a measure a page may show (src/lib/first-words.ts, D16.32): the rule on
 * invented directives, then what it gives on the public files — never a word that is not
 * already in them.
 *
 * Run: npx tsx --test scripts/first-words.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { directiveWords, firstWordsOf, isLocatorDisplay, quoted } from '../src/lib/first-words.js';
import { encodeDirectiveText } from '../src/lib/word-links.js';
import type { ExposurePolicy, Manifest } from './aec26-types.js';

const json = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'));
const directive = (text: string): string => `text=${encodeDirectiveText(text)}`;

void test('the words of a directive are read back as they were written', () => {
  assert.equal(
    directiveWords(directive('Ouvrir des bibliothèques de quartier')),
    'Ouvrir des bibliothèques de quartier',
  );
  // A hyphen is escaped in a directive (it is its syntax): it comes back a hyphen.
  assert.equal(directiveWords(directive('Créer un tram-train entre')), 'Créer un tram-train entre');
  assert.equal(directiveWords(directive('Porter à 100 %')), 'Porter à 100 %');
});

void test('a mark left dangling by the cut is not shown', () => {
  assert.equal(directiveWords(directive('Créer un label «')), 'Créer un label');
  assert.equal(directiveWords(directive('Trois priorités :')), 'Trois priorités');
  assert.equal(directiveWords(directive('Dans chaque commune,')), 'Dans chaque commune');
  // …but a mark that closes belongs to the last word.
  assert.equal(directiveWords(directive('Le plan « climat »')), 'Le plan « climat »');
});

void test('anything but a directive of one part gives no words', () => {
  assert.equal(directiveWords(''), '');
  assert.equal(directiveWords('section-anchor'), '');
  assert.equal(directiveWords('text='), '');
  // A range, or two directives: what would be shown is not what the link lands on.
  assert.equal(directiveWords('text=Ouvrir,quartier'), '');
  assert.equal(directiveWords('text=Ouvrir&text=quartier'), '');
  // A broken escape is not guessed.
  assert.equal(directiveWords('text=Ouvrir%E0%A4%A'), '');
});

void test('a key measure shows its incipit; another measure, what the policy allows', () => {
  const key: [string, string, string] = [
    'Mesure clé',
    directive('Ouvrir des bibliothèques'),
    'Ouvrir des bibliothèques de quartier partout',
  ];
  const other: [string, string, string] = ['Mesure 3', directive('Prêter des vélos aux'), ''];
  const bare: [string, string, string] = ['Mesure 4', '', ''];
  assert.equal(firstWordsOf(key, 'href'), 'Ouvrir des bibliothèques de quartier partout');
  assert.equal(firstWordsOf(key, 'search'), 'Ouvrir des bibliothèques de quartier partout');
  assert.equal(firstWordsOf(other, 'href'), '', 'kept in the link');
  assert.equal(firstWordsOf(other, 'search'), 'Prêter des vélos aux');
  assert.equal(firstWordsOf(bare, 'search'), '');
  assert.equal(firstWordsOf(undefined, 'search'), '');
  // Inside the guillemets, the space that does not break: a mark never ends a line alone.
  const nbsp = String.fromCodePoint(0xa0);
  assert.equal(quoted('Prêter des vélos aux'), `«${nbsp}Prêter des vélos aux…${nbsp}»`);
});

void test('the policy says where locators are read, in a value the build knows', () => {
  const policy = json('data/2026/exposure-policy.json') as ExposurePolicy;
  assert.ok(isLocatorDisplay(policy.locator_display), policy.locator_display);
  assert.equal(isLocatorDisplay('pages'), false, 'no value lets a page of ours line them up');
  assert.equal(isLocatorDisplay(undefined), false);
});

void test('on the public manifest, what a result may show is what a link already carries', () => {
  const manifest = json('data/2026/manifest.json') as Manifest;
  const policy = json('data/2026/exposure-policy.json') as ExposurePolicy;
  let shown = 0;
  let words = 0;
  for (const section of manifest.sections) {
    for (const item of section.items) {
      if (typeof item.locator !== 'string') continue;
      const text = directiveWords(item.locator);
      assert.notEqual(text, '', `${item.id}: a locator the page could not read`);
      // Never more than the link carries: a prefix of it, and within the ceiling of the policy.
      const carried = decodeURIComponent(item.locator.slice('text='.length));
      assert.ok(carried.startsWith(text), `${item.id}: not a prefix of its locator`);
      const count = text.split(/\s+/u).length;
      assert.ok(
        count >= 1 && count <= policy.locator_max_words,
        `${item.id}: ${String(count)} words`,
      );
      shown += 1;
      words += count;
    }
  }
  // Counted on the files, never typed: every locator can be shown, and nothing beyond them.
  assert.equal(
    shown,
    manifest.sections.flatMap((s) => s.items).filter((i) => typeof i.locator === 'string').length,
  );
  assert.ok(
    words <= manifest.meta.exposure.locator_words,
    `${String(words)} words shown of ${String(manifest.meta.exposure.locator_words)} carried`,
  );
});
