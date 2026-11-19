/**
 * « Des mots expliqués » — the words the sheet explains under its sentences (D16.60, D16.62):
 * how a term is found in a text (src/lib/terms.ts), and what the file of explanations may hold
 * (data/2026/terms.json).
 *
 * The explanations are general knowledge, written and checked by an AI, shown under a label
 * that says so. What this file holds about them:
 *   - none speaks of the programme, of a party, of a vote, or of itself: each passes the rules
 *     of the control of an explanation that need no sentence of the page
 *     (src/lib/ask-validate.ts) — but the ones written for a sentence nobody re-reads: its
 *     opening word, a negation, a contrast, « on »;
 *   - each is short, typed as the kit types French, and carries no amount in euros;
 *   - a wording belongs to one entry, and none is one of our cards — those a person wrote.
 *
 * Run: npx tsx --test scripts/terms.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { explanationRefusals } from '../src/lib/ask-validate.js';
import { normalize, terms as searchTerms } from '../src/lib/search-core.js';
import { MAX_EXPLAIN_SENTENCES } from '../src/lib/chat-contract.js';
import { notionsIn } from '../src/lib/notions.js';
import {
  MAX_TERMS,
  NO_EXAMPLE_CODES,
  asksMeaning,
  cardWordings,
  explainedFor,
  folded,
  parseTerms,
  readAsWritten,
  readingOf,
  spansIn,
  termsIn,
  withoutCards,
  type TermEntry,
} from '../src/lib/terms.js';
import { SAMPLE_IDS, SHEET_CASES, plainSentence, wordySentence } from './terms-fixtures.js';

const NBSP = String.fromCodePoint(0xa0);

/** Invented entries: the rules are tested on words that are in no file. */
const T2A: TermEntry = { id: 't2a', term: 'T2A', aliases: ['t2a'], plain: 'Un sigle.' };
const CAP: TermEntry = { id: 'cap', term: 'CAP', plain: 'Un diplôme.' };
const MORATOIRE: TermEntry = { id: 'moratoire', term: 'moratoire', plain: 'Une pause.' };
const LICENCE: TermEntry = { id: 'licence', term: "licence d'office", plain: 'Un droit.' };
const CONFLITS: TermEntry = {
  id: 'conflits',
  term: "conflits d'intérêts",
  plain: 'Une situation.',
};
const SMIC: TermEntry = { id: 'smic', term: 'SMIC', aliases: ['smic'], plain: 'Un salaire.' };
const ALL = [T2A, CAP, MORATOIRE, LICENCE, CONFLITS, SMIC];
const ids = (found: readonly TermEntry[]): string[] => found.map((entry) => entry.id);

void test('an acronym is read as written: to the letter and to the case', () => {
  assert.ok(readAsWritten('T2A') && readAsWritten('CAP') && readAsWritten('49.3'));
  assert.ok(readAsWritten('BRAV-M') && readAsWritten('Nutri-Score') && readAsWritten('OATi'));
  assert.ok(!readAsWritten('moratoire') && !readAsWritten('Unesco') && !readAsWritten('Éna'));
  assert.deepEqual(ids(termsIn(['Sortir de la T2A à l’hôpital.'], ALL)), ['t2a']);
  // « cap » is a heading one keeps; « CAP » is a diploma.
  assert.deepEqual(ids(termsIn(['Garder le cap.'], ALL)), []);
  assert.deepEqual(ids(termsIn(['Un CAP en deux ans.'], ALL)), ['cap']);
  // A whole word: « CAPES » is another one, and so is « RECAP ».
  assert.deepEqual(ids(termsIn(['Le CAPES, le RECAP, le CAP2.'], ALL)), []);
  // Next to punctuation, a bracket, an apostrophe, a hyphen: still the word.
  for (const text of ['(CAP)', 'le CAP, puis', 'l’CAP', 'post-CAP', '« CAP »', 'CAP.']) {
    assert.deepEqual(ids(termsIn([text], ALL)), ['cap'], text);
  }
});

void test('an acronym a visitor types in small letters is found by the wording the file gives for it', () => {
  assert.deepEqual(ids(termsIn(['c quoi le smic'], ALL)), ['smic']);
  assert.deepEqual(ids(termsIn(['le Smic et le SMIC'], ALL)), ['smic']);
  assert.deepEqual(ids(termsIn(['la t2a ?'], ALL)), ['t2a']);
  // No such wording for « CAP »: the file did not give one, because « cap » is a word.
  assert.deepEqual(ids(termsIn(['c quoi le cap'], ALL)), []);
});

void test('typed all in capitals, a word says nothing of being an acronym', () => {
  // « QUEL CAP POUR LA FRANCE ? » asks about a heading, not about the diploma (second review).
  assert.deepEqual(ids(termsIn(['QUEL CAP POUR LA FRANCE ?'], ALL)), []);
  assert.deepEqual(ids(termsIn(['C’EST QUOI LE CAP ?'], ALL)), []);
  assert.deepEqual(explainedFor('C’EST QUOI LE CAP ?', [], ALL), []);
  // What the file lets be found in any case is still found…
  assert.deepEqual(ids(termsIn(['C’EST QUOI LE SMIC ?'], ALL)), ['smic']);
  assert.deepEqual(ids(termsIn(['ET LA T2A À L’HÔPITAL'], ALL)), ['t2a']);
  // …a word alone is read as written: that is how one asks about an acronym…
  assert.deepEqual(ids(termsIn(['CAP'], ALL)), ['cap']);
  assert.deepEqual(ids(termsIn(['CAP ?'], ALL)), ['cap']);
  // …and a sentence that holds one acronym among small letters is not typed in capitals.
  assert.deepEqual(ids(termsIn(['Un CAP en deux ans.'], ALL)), ['cap']);
});

void test('a term in plain letters is found whatever the case, the accents, the apostrophe and the plural', () => {
  for (const text of [
    'Un moratoire sur les fermetures.',
    'MORATOIRE',
    'des moratoires',
    'un Moratoire,',
  ]) {
    assert.deepEqual(ids(termsIn([text], ALL)), ['moratoire'], text);
  }
  for (const text of [
    'la licence d’office',
    "la licence d'office",
    'des licences d’office',
    'LICENCE D’OFFICE',
    'la licence  d’office',
  ]) {
    assert.deepEqual(ids(termsIn([text], ALL)), ['licence'], text);
  }
  assert.deepEqual(ids(termsIn(['un conflit d’intérêt'], ALL)), ['conflits']);
  assert.deepEqual(ids(termsIn(['des conflits d’interets'], ALL)), ['conflits']);
  // Every word of it, in a row, as whole words.
  assert.deepEqual(ids(termsIn(['une licence, puis un office'], ALL)), []);
  assert.deepEqual(ids(termsIn(['un moratoirement'], ALL)), []);
  assert.deepEqual(ids(termsIn(['le prémoratoire'], ALL)), []);
});

void test('terms come in the order they first appear, each once, and no more than the sheet holds', () => {
  const texts = ['Un moratoire, puis la T2A.', 'Le SMIC, la T2A, un moratoire, un CAP.'];
  assert.deepEqual(ids(termsIn(texts, ALL)), ['moratoire', 't2a', 'smic', 'cap']);
  assert.deepEqual(ids(termsIn(texts, ALL, 2)), ['moratoire', 't2a']);
  assert.deepEqual(ids(termsIn(texts, ALL, 0)), []);
  assert.deepEqual(termsIn([], ALL), []);
  assert.deepEqual(termsIn([''], ALL), []);
  assert.equal(MAX_TERMS, 4);
  // A character outside the basic plane before a term does not move anything.
  assert.deepEqual(ids(termsIn(['😀 le SMIC puis un moratoire'], ALL)), ['smic', 'moratoire']);
});

void test('a question that asks what a word means is told from one that merely holds it', () => {
  for (const question of [
    'c’est quoi la T2A ?',
    "c'est quoi le smic",
    'c quoi un moratoire',
    'cest quoi la t2a',
    'Qu’est-ce que la T2A ?',
    'qu est ce que le smic',
    'ça veut dire quoi ONDAM',
    'que signifie T2A',
    'définition du moratoire',
    'tu peux expliquer la T2A ?',
    'une explication sur le smic',
    'je comprends pas la t2a',
    'kesako le smic',
    'késako un moratoire',
    'c koi le smic',
    'c koi la t2a a l hopital',
    "c'est koi le smic",
    'ckoi la t2a',
    'C QUOI LE SMIC',
  ]) {
    assert.ok(asksMeaning(question), question);
  }
  for (const question of [
    'et la t2a à l’hôpital ?',
    'que prévoit le programme pour le smic',
    'un moratoire sur les fermetures de lits',
    'le smic sera augmenté de combien',
    'le smic à quoi sert il aujourd hui',
    'avec quoi financer le smic plus haut',
    'augmenter le smic',
    'T2A',
  ]) {
    assert.ok(!asksMeaning(question), question);
  }
});

void test('on top, open: only what was asked for — a meaning, or the word alone', () => {
  const sentences = [
    'Le programme prévoit un moratoire.',
    'Le programme prévoit de sortir de la T2A.',
  ];
  const shown = (question: string, texts: readonly string[] = sentences): [string, boolean][] =>
    explainedFor(question, texts, ALL).map(({ entry, top }) => [entry.id, top]);
  // The question asks what a word means: that word first, then the other words of the sentences.
  assert.deepEqual(shown('c’est quoi la t2a ?'), [
    ['t2a', true],
    ['moratoire', false],
  ]);
  // The word alone — with its article, with a mark — is the same question.
  for (const question of ['T2A', 'la t2a ?', 'La T2A', 'L’T2A', 'smic', 'le SMIC ?', 'du smic']) {
    assert.equal(shown(question, [])[0]?.[1], true, question);
  }
  assert.deepEqual(shown('licence d’office', []), [['licence', true]]);
  // A question that merely holds a term gets its measures first: the term waits under them —
  // first among the words of the sentences, since the question holds it too.
  assert.deepEqual(shown('et la t2a à l’hôpital ?'), [
    ['t2a', false],
    ['moratoire', false],
  ]);
  assert.deepEqual(
    shown('augmenter le smic', ['Le programme prévoit de porter le SMIC plus haut.']),
    [['smic', false]],
  );
  // A question that names nothing: the terms of the sentences, in their order.
  assert.deepEqual(shown('et l’hôpital ?'), [
    ['moratoire', false],
    ['t2a', false],
  ]);
});

void test('a term the question merely holds, and that no sentence on the screen uses, is not explained', () => {
  const shown = (question: string, texts: readonly string[]): string[] =>
    explainedFor(question, texts, ALL).map(({ entry }) => entry.id);
  // « la réforme du CAP » may not be about the diploma this file explains: on the screen, a
  // term has the sense of the sentence next to it — and here no sentence uses it.
  assert.deepEqual(shown('la réforme du CAP et du SMIC', ['Le programme prévoit un moratoire.']), [
    'moratoire',
  ]);
  assert.deepEqual(shown('supprimer le CAP', []), []);
  assert.deepEqual(shown('bonjour', []), []);
  // Asked for by name, it is explained whatever the screen shows.
  assert.deepEqual(shown('c’est quoi le CAP ?', ['Le programme prévoit un moratoire.']), [
    'cap',
    'moratoire',
  ]);
  // Under the measures, every word the sentences use (D20.10): until 19 November 2026 four
  // was the ceiling of the whole sheet; it is now that of the words a question asks about.
  const many = ['Le SMIC, la T2A, un moratoire, un CAP, une licence d’office.'];
  assert.deepEqual(shown('c’est quoi un conflit d’intérêts ?', many), [
    'conflits',
    'smic',
    't2a',
    'moratoire',
    'cap',
    'licence',
  ]);
  // …and four at most above them, in the order the question names them.
  assert.deepEqual(
    explainedFor(
      'c’est quoi le SMIC, la T2A, un CAP, un moratoire et une licence d’office ?',
      [],
      ALL,
    ).map(({ entry, top }) => [entry.id, top]),
    [
      ['smic', true],
      ['t2a', true],
      ['cap', true],
      ['moratoire', true],
    ],
  );
  assert.equal(MAX_TERMS, 4);
});

void test('every place a term stands, in the order of the text — a wording inside a longer one is the longer one’s', () => {
  const REF: TermEntry = { id: 'referendum', term: 'référendum', plain: 'Un vote.' };
  const RIC: TermEntry = {
    id: 'ric',
    term: 'RIC',
    aliases: ['référendum d’initiative citoyenne'],
    plain: 'Un vote demandé.',
  };
  const text = 'Un référendum, puis un référendum d’initiative citoyenne, puis le RIC.';
  const found = spansIn(text, [REF, RIC]).map(({ entry, at, end }) => [
    entry.id,
    text.slice(at, end),
  ]);
  assert.deepEqual(found, [
    ['referendum', 'référendum'],
    ['ric', 'référendum d’initiative citoyenne'],
    ['ric', 'RIC'],
  ]);
  assert.deepEqual(spansIn('', [REF, RIC]), []);
  // A character outside the basic plane before a term does not move its place.
  const emoji = '😀 un moratoire';
  const [first] = spansIn(emoji, ALL);
  assert.equal(first === undefined ? '' : emoji.slice(first.at, first.end), 'moratoire');
});

void test('an entry may hold an example, or the reason it has none — never both', () => {
  const read = (extra: Record<string, unknown>): TermEntry[] =>
    parseTerms({ entries: [{ id: 'a', term: 'A', plain: 'Un texte.', ...extra }] });
  assert.deepEqual(read({ example: 'Un cas.' }), [
    { id: 'a', term: 'A', plain: 'Un texte.', example: 'Un cas.' },
  ]);
  for (const code of NO_EXAMPLE_CODES) {
    assert.deepEqual(read({ noExample: code }), [
      { id: 'a', term: 'A', plain: 'Un texte.', noExample: code },
    ]);
  }
  for (const bad of [
    { example: '' },
    { example: ' ' },
    { example: 3 },
    { noExample: 'X' },
    { noExample: '' },
    { example: 'Un cas.', noExample: 'E' },
  ]) {
    assert.throws(() => read(bad), /example|noExample/, JSON.stringify(bad));
  }
});

void test('a file that is not the expected one is refused, with what does not read', () => {
  const good = { entries: [{ id: 'a', term: 'A', plain: 'Un texte.' }] };
  assert.deepEqual(parseTerms(good), [{ id: 'a', term: 'A', plain: 'Un texte.' }]);
  assert.deepEqual(
    parseTerms({ entries: [{ id: 'a', term: 'A', aliases: ['b'], plain: 'Un texte.' }] }),
    [{ id: 'a', term: 'A', aliases: ['b'], plain: 'Un texte.' }],
  );
  for (const bad of [
    null,
    [],
    {},
    { entries: 'x' },
    { entries: [null] },
    { entries: [{ id: 'A b', term: 'A', plain: 'x' }] },
    { entries: [{ id: 'a', term: '', plain: 'x' }] },
    { entries: [{ id: 'a', term: 'A', plain: ' ' }] },
    { entries: [{ id: 'a', term: 'A', plain: 'x', aliases: 'b' }] },
    { entries: [{ id: 'a', term: 'A', plain: 'x', aliases: [''] }] },
    {
      entries: [
        { id: 'a', term: 'A', plain: 'x' },
        { id: 'a', term: 'B', plain: 'y' },
      ],
    },
  ]) {
    assert.throws(() => parseTerms(bad), /terms|no term|no text|alias|twice|slug/);
  }
});

// -------------------------------------------------------------------------------------------
// The file itself.

interface TermsFile {
  meta: {
    version: string;
    written_on: string;
    written_by: string;
    checked_by: string;
    read_by_a_person: boolean;
    note_fr: string;
    /** 1: the file of 15 November; 2: the words taken from the book, with examples (D20.10). */
    charter?: number;
  };
  entries: unknown[];
}
const file = JSON.parse(readFileSync('data/2026/terms.json', 'utf8')) as TermsFile;
const entries = parseTerms(file);
const wordingsOf = (entry: TermEntry): string[] => [entry.term, ...(entry.aliases ?? [])];

/** The sentences of a text, cut as a reader hears them. */
const sentencesOf = (text: string): string[] =>
  text
    .split(/(?<=[.!?…])\s+/)
    .map((part) => part.trim())
    .filter((part) => part !== '');

void test('the file says who wrote and who checked: an AI, twice — and that no person read each text', () => {
  assert.match(file.meta.version, /^\d+\.\d+\.\d+$/);
  assert.match(file.meta.written_on, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(file.meta.written_by, 'session');
  assert.equal(file.meta.checked_by, 'independent-model');
  // The label of the sheet rests on this line: « Explications écrites et vérifiées par une IA ».
  assert.equal(file.meta.read_by_a_person, false);
  assert.ok(entries.length >= 150, `${String(entries.length)} entries`);
});

void test('every wording finds its entry, and no other one', () => {
  for (const entry of entries) {
    for (const wording of wordingsOf(entry)) {
      const found = ids(termsIn([wording], entries, entries.length));
      assert.deepEqual(found, [entry.id], `« ${wording} » finds ${found.join(', ')}`);
      // In a sentence too, with words around it.
      assert.deepEqual(
        ids(termsIn([`Voici ${wording}, puis autre chose.`], entries, entries.length)),
        [entry.id],
        wording,
      );
    }
    assert.equal(new Set(wordingsOf(entry)).size, wordingsOf(entry).length, `${entry.id}: twice`);
  }
});

/**
 * Texts the site shows, of every kind, that no entry was written for: the sentences of the game,
 * our cards and our answers, the explanations themselves. Public files only.
 */
function naturalTexts(): string[] {
  const out: string[] = entries.flatMap((entry) => [entry.plain, entry.example ?? '']);
  const walk = (value: unknown): void => {
    if (typeof value === 'string') {
      if (value.includes(' ')) out.push(value);
    } else if (Array.isArray(value)) value.forEach(walk);
    else if (typeof value === 'object' && value !== null) {
      for (const [key, inner] of Object.entries(value)) if (key !== 'meta') walk(inner);
    }
  };
  for (const path of [
    'data/2026/game-gists.json',
    'data/2026/glossary.json',
    'data/2026/riposte.json',
  ]) {
    walk(JSON.parse(readFileSync(path, 'utf8')) as unknown);
  }
  return out.filter((text) => text !== '');
}

void test('the needle never hides a match: wherever the pattern of a wording matches, its needle stands', () => {
  // The proof that reading a wording only where its needle stands changes no result
  // (src/lib/terms.ts, « the needle »): a pattern that matches a text where its needle is
  // absent would be a term the prefilter hides.
  const natural = naturalTexts();
  let matched = 0;
  for (const entry of entries) {
    for (const wording of wordingsOf(entry)) {
      const reading = readingOf(wording, entry.anyCase === true);
      const own = [wording, wording.toUpperCase(), wording.toLowerCase()].flatMap((form) => [
        form,
        `Voici ${form}, puis autre chose.`,
        `Des ${form}s et des ${form}x.`,
      ]);
      for (const text of [...own, ...natural]) {
        const hay = reading.asWritten ? text.normalize('NFC') : folded(text);
        if ([...hay.matchAll(reading.pattern())].length === 0) continue;
        matched += 1;
        assert.ok(hay.includes(reading.needle), `« ${wording} » in « ${text.slice(0, 80)} »`);
      }
    }
  }
  assert.ok(matched > 1000, `${String(matched)} matches read`);
});

void test('the words the end-to-end test of the sheet expects are those this file gives (scripts/terms-fixtures.ts)', () => {
  // scripts/e2e-sheet.ts §7 shows these sentences under these questions and expects these words.
  // Read here against the file as it stands: an entry that would change them fails in a second.
  for (const sheet of SHEET_CASES) {
    const sentences =
      sheet.sentences === 'none'
        ? []
        : SAMPLE_IDS.map(sheet.sentences === 'plain' ? plainSentence : wordySentence);
    const got = explainedFor(sheet.question, sentences, entries);
    assert.deepEqual(
      got.filter((found) => found.top).map((found) => found.entry.term),
      sheet.asked,
      `${sheet.question}: the words of the question`,
    );
    assert.deepEqual(
      got.filter((found) => !found.top).map((found) => found.entry.term),
      sheet.below,
      `${sheet.question}: the words of the sentences`,
    );
  }
});

void test('no explained word is one of our cards: a person wrote those, and they come first', () => {
  const cards = (
    JSON.parse(readFileSync('data/2026/glossary.json', 'utf8')) as {
      entries: { id: string; term: string }[];
    }
  ).entries.map(({ id, term }) => ({ id, term }));
  assert.ok(cards.length >= 5);
  for (const entry of entries) {
    for (const wording of wordingsOf(entry)) {
      assert.deepEqual(notionsIn(wording, cards), [], `« ${wording} » is a card`);
    }
  }
  // …and the other way round: a card's term may hold an explained word (D20.14) — the card
  // wins on its span. Read with the cards, a card's term finds the card, and nothing inside it.
  for (const card of cards) {
    const found = termsIn([card.term], [...cardWordings([card]), ...entries], 99).map(
      (entry) => entry.id,
    );
    assert.deepEqual(found, [`card:${card.id}`], `« ${card.term} »: ${found.join(', ')}`);
  }
  // …and in a text, the word inside a card's term is the card's, the word beside it its own.
  const inside = withoutCards(
    termsIn(
      ['Un moratoire écologique, puis un moratoire.'],
      [...cardWordings([{ id: 'x', term: 'moratoire écologique' }]), MORATOIRE],
      9,
    ),
  );
  assert.deepEqual(
    inside.map((entry) => entry.id),
    ['moratoire'],
  );
  assert.deepEqual(
    withoutCards(
      termsIn(
        ['Un moratoire écologique.'],
        [...cardWordings([{ id: 'x', term: 'moratoire écologique' }]), MORATOIRE],
        9,
      ),
    ),
    [],
  );
});

/**
 * The rules of the control that were written for a sentence nobody re-reads before it is shown
 * (a live answer), and that a text written ahead and checked may break: a second sentence that
 * opens on « Elle », a negation, a contrast. « on », which is how French defines a word, is read
 * as « il » (`withoutOn`): waiving the refusal it causes let the next person found through.
 */
const WAIVED = new Set(['opener', 'negation', 'contrast']);
/** « on » read as « il » by the control, so that nobody hides behind it. */
const withoutOn = (text: string): string =>
  text.replace(/(?<!\p{L})[Oo]n(?!\p{L})/gu, (on) => (on === 'On' ? 'Il' : 'il'));

void test('no explanation speaks of the programme, of a party, of a vote or of itself — each passes the control', () => {
  const problems: string[] = [];
  for (const entry of entries) {
    const phrases = sentencesOf(entry.plain);
    if (phrases.length > MAX_EXPLAIN_SENTENCES) {
      problems.push(`${entry.id}: ${String(phrases.length)} sentences`);
      continue;
    }
    const refused = explanationRefusals(
      JSON.stringify({ phrases: phrases.map(withoutOn) }),
      { shown: [] },
      { withoutText: true },
    ).filter((refusal) => !WAIVED.has(refusal.rule));
    for (const refusal of refused)
      problems.push(`${entry.id}: ${refusal.rule} (${refusal.detail})`);
  }
  assert.deepEqual(problems, []);
  // What the control lets through and this file must not hold either: the book, its movement,
  // its candidate, the site itself — an explanation is about a word, in general.
  const NEVER =
    /programme|avenir en commun|insoumis|\bLFI\b|m[ée]lenchon|nouvelle france|ce site|cette page|c[’']est écrit là/i;
  for (const entry of entries) {
    assert.doesNotMatch(entry.plain, NEVER, entry.id);
    assert.doesNotMatch(wordingsOf(entry).join(' | '), NEVER, entry.id);
  }
});

void test('an explanation is short, ends as a sentence, and carries no amount that goes stale', () => {
  for (const entry of entries) {
    const { id, plain } = entry;
    assert.ok(plain.length <= 200, `${id}: ${String(plain.length)} characters`);
    assert.match(plain, /^\p{Lu}/u, `${id}: does not open on a capital`);
    assert.match(plain, /\.$/, `${id}: does not end on a full stop`);
    assert.equal(plain, plain.trim().replace(/[ \t]{2,}/g, ' '), `${id}: stray spaces`);
    assert.doesNotMatch(plain, /\d[\d\s]*(?:€|euros?\b)|€/i, `${id}: an amount in euros`);
    assert.doesNotMatch(plain, /https?:|www\.|@/, `${id}: an address`);
    assert.doesNotMatch(plain, /[<>{}[\]*_`#|\\]/, `${id}: markup`);
  }
});

void test('French typography, as the kit: no-break spaces around double punctuation, straight apostrophes', () => {
  for (const entry of entries) {
    for (const [what, value] of [
      ['plain', entry.plain],
      ...(entry.example === undefined ? [] : [['example', entry.example] as const]),
      ...wordingsOf(entry).map((wording) => ['wording', wording] as const),
    ] as const) {
      const where = `${entry.id} (${what})`;
      assert.ok(
        !value.includes(String.fromCodePoint(0x202f)),
        `${where}: U+202F (absent from the fonts)`,
      );
      assert.ok(!/ [:;!?»%]/.test(value), `${where}: breaking space before punctuation`);
      assert.ok(!/« /.test(value), `${where}: breaking space after «`);
      assert.ok(!/\.\.\./.test(value), `${where}: three dots instead of …`);
      // Typed straight, shown typographic: the page converts (src/lib/editorial.ts, `prose`).
      assert.ok(!/[’‘]/.test(value), `${where}: a typographic apostrophe in the file`);
      for (const match of value.matchAll(/[:;!?»%]/g)) {
        const before = value[match.index - 1];
        if (before === undefined) continue;
        assert.ok(
          before === NBSP || !/\s/.test(before),
          `${where}: the space before "${match[0]}" is not U+00A0`,
        );
      }
    }
  }
});

void test('the identifiers are slugs in the order of the file, and the note says what the file is', () => {
  for (const entry of entries) assert.match(entry.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, entry.id);
  assert.match(file.meta.note_fr, /connaissances générales/);
  assert.match(file.meta.note_fr, /une IA/);
  assert.doesNotMatch(file.meta.note_fr, /relu(?:e|es|s)? par (?:l['’]éditeur|une personne)/);
});

// -------------------------------------------------------------------------------------------
// The examples (D20.2, D20.9; PLAN-MOTS, « Charte de l'exemple »): a case of the thing defined,
// never an image of it — an adult's case, which no reform, no party and no year changes.

/**
 * The rules of the control an example may break: a second sentence that opens on « Elle », a
 * negation that states a rule. Not « contrast », which an explanation may break: where two cases
 * meet, framing comes in.
 */
const EXAMPLE_WAIVED = new Set(['opener', 'negation']);
/** What a child's world, or a teacher talking down, sounds like. */
const CHILDISH =
  /(?<!\p{L})(?:imagine[rsz]?|supposons|suppose[sz]?|en gros|tout simplement|bonbons?|g[âa]teaux?|tirelires?|argent de poche|ma[iî]tre(?:sse)?s?|r[ée]cr[ée]s?|cartables?|papa|maman|copains?|copines?|gentil(?:le)?s?|m[ée]chante?s?|magiques?)(?!\p{L})/iu;
/** An image of the thing instead of a case of it. */
const ANALOGY = /c[’']est (?:un peu )?comme|comme (?:si|quand)(?!\p{L})|un peu comme|ressembl/iu;
/** A legal value of the year, said as one. */
const LEGAL_VALUE = /(?:est|sont) fix[ée]e?s? [àa]|s[’']él[èe]ve(?:nt)? [àa]|plafonn[ée]e?s? [àa]/i;
/** Allowances whose amount is set by law, each year: an example never gives one next to them. */
const LEGAL_AMOUNTS = /(?<!\p{L})(?:SMIC|RSA|AAH|APL|ASS|ASF)(?!\p{L})/u;
/** A change, and what it brings: an example shows how a thing works, never what a reform does. */
const EFFECT =
  /de plus par mois|de moins par mois|grâce à|désormais|à partir de maintenant|au lieu de/i;
/** What an example states that may be checked: a share, a year, a length of time. */
const DECLARED =
  /%|(?<!\d)(?:1[5-9]|20)\d\d(?!\d)|\d+\s*(?:ans?|mois|jours?|heures?|semaines?|trimestres?)(?!\p{L})/u;
/** Capitals an example may write away from the start of a sentence, besides the words of this file. */
const PROPER: ReadonlySet<string> = new Set([
  'France',
  'Français',
  'Française',
  'Françaises',
  'État',
  'États',
  'Europe',
  'République',
  'Parlement',
  'Sénat',
  'Assemblée',
  'Constitution',
  'Sécurité',
  'Assurance',
  'Union',
  'Conseil',
  'Cour',
  'Trésor',
  'Banque',
  'Nations',
]);
/**
 * Entries in a sensitive field that may hold an example all the same — each named, with why.
 * Empty: in a sensitive field there is no example by default (PLAN-MOTS, « Neutralité »).
 */
const SENSITIVE_EXAMPLES: ReadonlyMap<string, string> = new Map();

const withExample = entries.filter(
  (entry): entry is TermEntry & { example: string } => entry.example !== undefined,
);

/** The digits of every amount in euros a text gives — in millions and billions too, decimals kept. */
const amountsIn = (text: string): string[] =>
  [
    ...text.matchAll(
      new RegExp(
        `(\\d[\\d ${NBSP}]*(?:,\\d+)?)\\s*(?:(?:millions?|milliards?)\\s+d[’']\\s*)?(?:€|euros?(?!\\p{L}))`,
        'gu',
      ),
    ),
  ].map((found) => (found[1] ?? '').replace(/\D/g, ''));

/** What an example is read against: the stems of the book, the capitals of this file. */
interface ExampleReading {
  index: ReadonlySet<string>;
  capitalised: ReadonlySet<string>;
}

function exampleReading(): ExampleReading {
  const index = (
    JSON.parse(readFileSync('data/2026/search-index.json', 'utf8')) as {
      index: { index: [string, unknown][] };
    }
  ).index.index.map(([stem]) => stem);
  // The capitals the words of this file write: « SMIC », « Scop », « Conseil » (de sécurité).
  const capitalised = entries
    .flatMap(wordingsOf)
    .flatMap((wording) => wording.split(/[\s’']+/))
    .filter((token) => /^\p{Lu}/u.test(token));
  return { index: new Set(index), capitalised: new Set(capitalised) };
}

/** Every rule of the charter an example breaks, each said with what breaks it. */
function exampleProblems(example: string, reading: ExampleReading): string[] {
  const problems: string[] = [];
  const phrases = sentencesOf(example);
  if (example.length > 240) problems.push(`${String(example.length)} characters`);
  if (phrases.length === 0 || phrases.length > 3) {
    problems.push(`${String(phrases.length)} sentences`);
  }
  if (!/^\p{Lu}/u.test(example) || !/\.$/.test(example)) {
    problems.push('not a sentence that opens on a capital and ends on a full stop');
  }
  const refused = explanationRefusals(
    JSON.stringify({ phrases: phrases.map(withoutOn) }),
    { shown: [] },
    { withoutText: true },
  ).filter((refusal) => !EXAMPLE_WAIVED.has(refusal.rule));
  for (const refusal of refused) problems.push(`${refusal.rule} (${refusal.detail})`);
  for (const [what, pattern] of [
    ['a word of a child’s world', CHILDISH],
    ['an image instead of a case', ANALOGY],
    ['a legal value of the year', LEGAL_VALUE],
    ['a change and what it brings', EFFECT],
    [
      'the book, its movement or the site',
      /programme|avenir en commun|insoumis|\bLFI\b|m[ée]lenchon|nouvelle france|ce site|cette page|c[’']est écrit là/i,
    ],
    ['an exclamation, a question, a suspension', /[!?…]/],
    ['markup or an address', /[<>{}[\]*_`#|\\]|https?:|www\.|@/],
  ] as const) {
    if (pattern.test(example)) problems.push(what);
  }
  for (const digits of amountsIn(example)) {
    if (digits.replace(/0+$/, '').length > 2) {
      problems.push(`${digits} euros is no round amount (two significant digits at most)`);
    }
  }
  for (const sentence of phrases) {
    if (LEGAL_AMOUNTS.test(sentence) && amountsIn(sentence).length > 0) {
      problems.push('an amount next to an allowance the law sets each year');
    }
    // A capital away from the start of a sentence: an institution, a place — or a word of this
    // file. Never a person, never a brand.
    for (const word of sentence.split(/[\s’']+/).slice(1)) {
      const bare = word.replace(/[.,;:»«()]/g, '');
      if (!/^\p{Lu}/u.test(bare) || PROPER.has(bare) || reading.capitalised.has(bare)) continue;
      problems.push(`« ${bare} » — a capital no list knows`);
    }
  }
  // A number of the book is no illustration: four digits or more that the index holds.
  for (const number of normalize(example).match(/\d{4,}/g) ?? []) {
    if (reading.index.has(number)) problems.push(`${number} is a number of the book`);
  }
  return problems;
}

/** The four examples the editor chose, as he saw them (D20.2): the charter's reference. */
const REFERENCE_EXAMPLES: readonly string[] = [
  'Une liste obtient 20 % des voix. Elle reçoit environ 20 sièges sur 100.',
  'Si le niveau de vie médian est de 2 000 euros par mois, le seuil à 60 % est de 1 200 euros.',
  'Une personne a droit au RSA. Elle ne dépose pas de dossier, faute de savoir qu’elle y a droit.',
  'Les cotisations prélevées ce mois-ci sur les salaires paient les pensions versées ce mois-ci.',
];

void test('the charter of the example: the four the editor chose pass as they stand — and what it refuses, it refuses', () => {
  const reading = exampleReading();
  for (const example of REFERENCE_EXAMPLES) {
    assert.deepEqual(exampleProblems(example, reading), [], example);
  }
  for (const [example, why] of [
    ['Imagine une famille qui paie 1 000 euros.', /child/],
    ['C’est comme une cagnotte commune.', /an image/],
    ['Le SMIC est fixé à 1 800 euros par mois.', /a legal value/],
    ['Un salarié qui touche le SMIC reçoit 1 800 euros.', /an allowance the law sets/],
    ['Grâce à la réforme, un salarié reçoit 100 euros de plus par mois.', /a change/],
    ['Le programme prévoit cette aide pour chaque famille.', /the book/],
    ['Une famille paie 1 234 euros par an.', /no round amount/],
    ['Une commune emprunte 12,5 millions d’euros.', /no round amount/],
    ['Une famille, les Martin, paie 2 000 euros.', /a capital no list knows/],
    ['Une entreprise paie cette taxe !', /an exclamation/],
    ['Une entreprise paiera cette taxe.', /tense/],
  ] as const) {
    assert.match(String(exampleProblems(example, reading)), why, example);
  }
});

void test('an example is an adult’s case, written as an explanation is written — and checked like one', () => {
  const reading = exampleReading();
  const problems = withExample.flatMap(({ id, example }) =>
    exampleProblems(example, reading).map((problem) => `${id}: ${problem}`),
  );
  assert.deepEqual(problems, []);
});

interface SourcesFile {
  entries: Record<
    string,
    {
      example?: 'illustrative' | 'fact';
      plain?: 'fact';
      sources?: { url: string; consulted_on: string }[];
    }
  >;
}

/** A source is a page of a site, read on a given day: the page, so that it can be read again. */
const SOURCE_READ = (source: { url: string; consulted_on: string }): boolean =>
  /^https:\/\/[^/\s]+\/\S+/.test(source.url) && /^\d{4}-\d{2}-\d{2}$/.test(source.consulted_on);

void test('what an example states that can be checked is declared: an illustration, or a fact with its source', () => {
  const file = JSON.parse(readFileSync('eval/terms-sources.json', 'utf8')) as SourcesFile;
  for (const { id, example } of withExample) {
    if (!DECLARED.test(example)) continue;
    const declared = file.entries[id];
    assert.ok(
      declared?.example === 'illustrative' || declared?.example === 'fact',
      `${id}: a share, a year or a length of time, and eval/terms-sources.json does not say whether it is an illustration or a fact`,
    );
    if (declared.example === 'fact') {
      assert.ok(
        (declared.sources ?? []).length > 0 && (declared.sources ?? []).every(SOURCE_READ),
        `${id}: a fact, and no source with the day it was read`,
      );
    }
  }
  for (const id of Object.keys(file.entries)) {
    assert.ok(
      entries.some((entry) => entry.id === id),
      `eval/terms-sources.json: ${id} is no entry`,
    );
  }
});

void test('what an explanation states that may change is declared, with the page it rests on and the day it was read', () => {
  // A year, a share, a length of time: read again every ninety days (scripts/terms-recall.ts).
  const file = JSON.parse(readFileSync('eval/terms-sources.json', 'utf8')) as SourcesFile;
  for (const { id, plain } of entries) {
    const declared = file.entries[id];
    if (!DECLARED.test(plain)) {
      assert.notEqual(
        declared?.plain,
        'fact',
        `${id}: declared a fact, and its explanation states none`,
      );
      continue;
    }
    assert.ok(
      declared?.plain === 'fact' &&
        (declared.sources ?? []).length > 0 &&
        (declared.sources ?? []).every(SOURCE_READ),
      `${id}: its explanation states a year, a share or a length of time, and eval/terms-sources.json gives no page read on a given day`,
    );
  }
});

void test('in a sensitive field, no example — unless the entry is named, with why', () => {
  const sensitive = JSON.parse(readFileSync('data/2026/sensitive.json', 'utf8')) as {
    groups: Record<string, string[]>;
  };
  const touchy = Object.values(sensitive.groups).flat();
  const isTouchy = (stem: string): boolean =>
    touchy.some((word) =>
      word.endsWith('*') ? stem.startsWith(word.slice(0, -1)) : stem === word,
    );
  for (const { id, example, term, aliases } of withExample) {
    const stems = [term, ...(aliases ?? [])].flatMap((wording) => searchTerms(wording));
    if (!stems.some(isTouchy)) continue;
    assert.ok(
      SENSITIVE_EXAMPLES.has(id),
      `${id}: an example in a sensitive field — « ${example.slice(0, 50)}… »`,
    );
  }
});

void test('an amount in euros is never in an explanation, written in any way', () => {
  const EUROS =
    /\d[\d\s]*(?:(?:millions?|milliards?)\s+d['’]\s*)?(?:€|euros?\b)|€|(?:millions?|milliards?)\s+d['’]euros/i;
  for (const entry of entries) assert.doesNotMatch(entry.plain, EUROS, entry.id);
  // What the rule catches, and what it lets through.
  assert.match('Un budget de 10 millions d’euros.', EUROS);
  assert.match('Un million d’euros.', EUROS);
  assert.doesNotMatch('Le seuil retenu est 60 % du niveau de vie médian.', EUROS);
});

void test('the new charter: every entry has an example, or says why it has none', () => {
  if (file.meta.charter !== 2) return;
  const bare = entries.filter(
    (entry) => entry.example === undefined && entry.noExample === undefined,
  );
  assert.deepEqual(
    bare.map((entry) => entry.id),
    [],
    'entries with neither an example nor a reason to have none',
  );
});

void test('the new charter: an explanation leans on another word at most twice deep, and never in a circle', () => {
  if (file.meta.charter !== 2) return;
  const deps = new Map(
    entries.map((entry) => [
      entry.id,
      termsIn([entry.plain, entry.example ?? ''], entries, entries.length)
        .map((used) => used.id)
        .filter((id) => id !== entry.id),
    ]),
  );
  const depth = (id: string, path: readonly string[]): number => {
    let deepest = 0;
    for (const next of deps.get(id) ?? []) {
      assert.ok(!path.includes(next), `a circle: ${[...path, next].join(' > ')}`);
      deepest = Math.max(deepest, 1 + depth(next, [...path, next]));
    }
    return deepest;
  };
  for (const entry of entries) {
    const deep = depth(entry.id, [entry.id]);
    assert.ok(deep <= 2, `${entry.id}: its explanation leans ${String(deep)} words deep`);
  }
});
