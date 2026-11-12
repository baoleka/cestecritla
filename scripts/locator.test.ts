/**
 * Link locators: cut from the raw text, unique in the whole page or absent.
 * Run: npx tsx --test scripts/locator.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeLocator,
  countOccurrences,
  cssCollapse,
  decodeLocator,
  deepLink,
  encodeDirectiveText,
  fold,
  pageText,
  wordBoundaries,
  wordCount,
  type Locator,
  type LocatorPolicy,
} from './locator.js';

const NNBSP = String.fromCodePoint(0x202f);
const NBSP = String.fromCodePoint(0xa0);
const SHY = String.fromCodePoint(0xad);
const POLICY: LocatorPolicy = { minWords: 4, maxWords: 8, maxItemShare: 0.5 };

const page = (...blocks: string[]): string =>
  `<html><head><title>Titre de page</title><script>var s = "Créer un pôle public";</script></head>` +
  `<body><nav><a href="/">Accueil</a></nav><main>${blocks.join('\n')}</main></body></html>`;
const li = (text: string): string => `<li class="mesure">${text}</li>`;

function locate(raw: string, html: string, policy = POLICY, inline: string[] = []): Locator {
  return computeLocator(raw, inline, pageText(html), policy);
}

function started(found: Locator): Extract<Locator, { kind: 'start' }> {
  if (found.kind !== 'start') assert.fail(`no locator: ${found.reason}`);
  return found;
}

void test('the shortest prefix that is unique in the page, never shorter than the floor', () => {
  const a = 'Créer un pôle public du médicament pour garantir les approvisionnements du pays';
  const b = 'Créer un pôle public bancaire pour financer les petites et moyennes entreprises';
  const html = page(li(a), li(b));
  // The first four words are shared: the locator grows until it tells the two apart.
  assert.equal(started(locate(a, html)).text, 'Créer un pôle public du');
  assert.equal(started(locate(b, html)).text, 'Créer un pôle public bancaire');
  const alone = 'Rétablir les postes supprimés dans les services publics de proximité';
  assert.equal(started(locate(alone, page(li(alone)))).text, 'Rétablir les postes supprimés');
});

void test('script text is not page text, but menus and tables of contents are', () => {
  const a = 'Créer un pôle public du médicament pour garantir les approvisionnements du pays';
  // The <script> of the fixture holds the same four words: it must not count.
  assert.equal(started(locate(a, page(li(a)))).words, 4);
  // A table of contents repeating the sentence makes every prefix ambiguous.
  const repeated = page(`<aside><a href="#x">${a}</a></aside>`, li(a));
  assert.deepEqual(locate(a, repeated), { kind: 'anchor_only', reason: 'not_unique' });
});

void test('uniqueness is judged coarsely: case, accents, spaces and apostrophes do not count', () => {
  const a = `Garantir l’accès aux soins dans tous les territoires de la République`;
  const variants = [
    'GARANTIR L’ACCÈS AUX SOINS : un titre en capitales',
    `Garantir l'acces aux soins, sans accent ni apostrophe courbe`,
    `Garantir${NBSP}l’accès${NNBSP}aux soins avec des espaces insécables`,
    `Garan${SHY}tir l’accès aux soins avec une césure invisible`,
  ];
  for (const other of variants) {
    const found = started(locate(a, page(li(a), `<p>${other}</p>`)));
    assert.ok(
      found.words > 4,
      `"${fold(other).slice(0, 30)}…" should have forced a longer locator`,
    );
  }
});

void test('a locator ends on a word boundary, as Unicode defines one', () => {
  // "prix⍽:" — the narrow no-break space is glued to "prix" (UAX #29, ExtendNumLet). A locator
  // ending on "prix" would end inside a word and no browser would match it.
  const raw = `Bloquer tous les prix${NNBSP}: alimentation, énergie et carburants de première nécessité`;
  const found = started(locate(raw, page(li(raw))));
  assert.equal(found.text, `Bloquer tous les prix${NNBSP}:`);
  assert.equal(found.words, 5);
  assert.equal(found.locator, 'text=Bloquer%20tous%20les%20prix%E2%80%AF%3A');
  assert.equal(
    wordBoundaries(`prix${NNBSP}: alimentation`).has(4),
    false,
    'no boundary after "prix"',
  );
  assert.equal(wordBoundaries(`prix${NNBSP}: alimentation`).has(6), true, 'one after the colon');
  assert.equal(
    wordBoundaries('prix : alimentation').has(4),
    true,
    'an ordinary space is a boundary',
  );
  assert.equal(wordBoundaries(`prix${NBSP}: alimentation`).has(4), true, 'so is a no-break space');

  // The shape that failed in three browsers: «⍽100⍽% …». Four words would end on "100".
  const percent = `Instaurer le «${NNBSP}100${NNBSP}% santé${NNBSP}» pour rembourser tous les soins prescrits`;
  assert.equal(
    started(locate(percent, page(li(percent)))).text,
    `Instaurer le «${NNBSP}100${NNBSP}%`,
  );

  // A comma is dropped: the word before it ends on a boundary.
  const comma =
    'Sous-traiter moins, embaucher mieux & durablement dans les hôpitaux publics du pays';
  const encoded = started(
    locate(comma, page(li(comma.replace('&', '&amp;'))), { ...POLICY, minWords: 2 }),
  );
  assert.equal(encoded.text, 'Sous-traiter moins');
  // `-`, `,` and `&` are directive syntax: none may survive unencoded.
  assert.equal(encoded.locator, 'text=Sous%2Dtraiter%20moins');
  assert.equal(decodeLocator(encoded.locator), encoded.text);
  const longer = started(
    locate(comma, page(li(comma.replace('&', '&amp;'))), { ...POLICY, minWords: 5 }),
  );
  // Five words: the fifth is the ampersand itself — kept, encoded, and a boundary follows it.
  assert.equal(longer.locator, 'text=Sous%2Dtraiter%20moins%2C%20embaucher%20mieux%20%26');
});

void test('collapsible whitespace collapses, typographic spaces do not', () => {
  assert.equal(
    cssCollapse('  Deux   espaces\n et\tune tabulation '),
    'Deux espaces et une tabulation',
  );
  assert.equal(cssCollapse(`avant${NNBSP}: après`), `avant${NNBSP}: après`);
  const raw = 'Augmenter  le SMIC à un niveau qui permette de vivre dignement de son travail';
  assert.equal(started(locate(raw, page(li(raw)))).text, 'Augmenter le SMIC à');
});

void test('no locator rather than a risky one', () => {
  const short = 'Abroger la réforme des retraites';
  assert.deepEqual(locate(short, page(li(short))), { kind: 'anchor_only', reason: 'too_short' });
  // Seven words: half of it is three, under the floor of four.
  const seven = 'Créer un service public de la dépendance';
  assert.deepEqual(locate(seven, page(li(seven))), { kind: 'anchor_only', reason: 'too_short' });
  // Eight words: exactly half may be carried.
  const eight = 'Créer un service public de la petite enfance';
  assert.equal(started(locate(eight, page(li(eight)))).words, 4);
  const marked = 'Porter le SMIC à un niveau décent dès le 1er janvier de la première année';
  assert.deepEqual(locate(marked, page(li(marked)), POLICY, ['sup']), {
    kind: 'anchor_only',
    reason: 'inline_markup',
  });
  // Unique only beyond the cap.
  const long =
    'un deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize dix-sept';
  const twin = long.replace('neuf', 'NEUF autrement');
  assert.deepEqual(locate(long, page(li(long), li(twin))), {
    kind: 'anchor_only',
    reason: 'not_unique',
  });
});

void test('directive syntax: what is refused when read back', () => {
  assert.equal(
    decodeLocator('text=Inscrire%20dans%20la%20Constitution'),
    'Inscrire dans la Constitution',
  );
  assert.equal(decodeLocator('text=un,deux'), null, 'a raw comma is a range');
  assert.equal(decodeLocator('text=prefixe-,texte'), null, 'a raw hyphen is a prefix marker');
  assert.equal(decodeLocator('text=a&text=b'), null, 'a raw ampersand starts another directive');
  assert.equal(decodeLocator('texte=a'), null);
  assert.equal(decodeLocator('text=%E0%A4%A'), null, 'malformed percent-encoding');
  assert.equal(
    encodeDirectiveText(`l’État-nation, c'est (nous) !`),
    "l%E2%80%99%C3%89tat%2Dnation%2C%20c'est%20(nous)%20!",
  );
});

void test('helpers', () => {
  assert.equal(countOccurrences('abcabcabc', 'abc'), 3);
  assert.equal(countOccurrences('aaaa', 'aa'), 3, 'overlapping matches count');
  assert.equal(countOccurrences('abc', ''), 0);
  assert.equal(wordCount(`un deux${NNBSP}: trois`), 4);
  // Coarse on purpose: ligatures opened, accents dropped, every dash read as a hyphen.
  assert.equal(fold('Œuvre d’ÉTÉ — cœur'), "oeuvre d'ete - coeur");
  assert.equal(
    deepLink('https://example.org/chapitre1/#ancre', 'text=Un%20deux'),
    'https://example.org/chapitre1/#ancre:~:text=Un%20deux',
  );
  assert.equal(
    deepLink('https://example.org/chapitre1/#ancre', null),
    'https://example.org/chapitre1/#ancre',
  );
  assert.equal(
    deepLink('https://example.org/chapitre1/#ancre', undefined),
    'https://example.org/chapitre1/#ancre',
  );
});
