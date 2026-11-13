/**
 * The control of a written answer (D16.5) and the contract of `/api/ask` — every rule of
 * PLAN-JEU §2.3 has its test here.
 *
 * The measures below are INVENTED for these tests: libraries, fruit trees, school buses. No
 * sentence of the programme may stand in a tracked file (D15.6), and none is needed — the control
 * reads shapes, numbers and words, whatever the subject.
 *
 * Run: npx tsx --test scripts/ask-validate.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  COPY_WINDOW,
  MAX_IDS_PER_SENTENCE,
  MAX_QUESTION_CHARS,
  MAX_SELECTED,
  MAX_SENTENCES,
  MODEL_ANSWER_SCHEMA,
  MODEL_SELECT_SCHEMA,
  PROPOSITION_ID,
  parseAskRequest,
  parseAskResponse,
  parseModelAnswer,
  type Candidate,
  type ModelAnswer,
} from '../src/lib/ask-contract.js';
import {
  COPY_SHARE_WINDOW,
  PROVISIONAL_MAX_COPIED_SHARE,
  carriesCopy,
  copiedShare,
  copyTokens,
  overlap,
  refusals,
  validateAnswer,
  validateSelection,
  type RuleId,
} from '../src/lib/ask-validate.js';
import { leakTokens } from './leak-scan.js';

const LIBRARY = 'p1c1-s01-k01';
const TREES = 'p1c1-s01-m01';
const BUSES = 'p1c1-s02-m03';
const GARDENS = 'p2c1-s01-m02';
const AGENTS = 'p2c1-s01-m04';

/** In the order a search would rank them: a selection falls back on that order. */
const CANDIDATES: readonly Candidate[] = [
  {
    id: LIBRARY,
    text: 'Ouvrir une bibliothèque de quartier sept jours sur sept dans chaque commune de plus de 2 000 habitants',
  },
  {
    id: TREES,
    text: 'Planter 300 arbres fruitiers par an le long des chemins communaux, avec les écoles',
  },
  {
    id: BUSES,
    text: 'Rendre gratuits les transports scolaires jusqu’à 16 ans dès la rentrée 2028',
  },
  {
    id: GARDENS,
    text: 'Abroger la réforme Macron des jardins partagés et rétablir le vote des habitants sur leur budget',
  },
  {
    id: AGENTS,
    text: 'Former les agents municipaux aux usages de l’intelligence artificielle dans les services publics',
  },
];

const OPTIONS = { minOverlap: 0.5 };

const answer = (...phrases: [string, ...string[]][]): ModelAnswer => ({
  phrases: phrases.map(([texte, ...ids]) => ({ texte, ids })),
  hors_programme: false,
});

const LIBRARY_SENTENCE =
  'Le programme prévoit une bibliothèque de quartier dans toute commune dépassant 2 000 habitants.';
const BUSES_SENTENCE = 'Les transports scolaires deviendraient gratuits jusqu’à 16 ans.';

/** The rules one sentence breaks when it cites the given measures. */
const rulesOf = (texte: string, ...ids: string[]): RuleId[] => [
  ...new Set(refusals(answer([texte, ...ids]), CANDIDATES, OPTIONS).map((r) => r.rule)),
];
/** The same among other measures — invented too. */
const rulesAmong = (
  candidates: readonly Candidate[],
  texte: string,
  ...ids: string[]
): RuleId[] => [
  ...new Set(refusals(answer([texte, ...ids]), candidates, OPTIONS).map((r) => r.rule)),
];
/** Characters by their code point: an invisible one typed here would be invisible here too. */
const ch = (...codes: number[]): string => String.fromCodePoint(...codes);

void test('an anchored, affirmative answer in our own words is shown as written', () => {
  const verdict = validateAnswer(
    answer([LIBRARY_SENTENCE, LIBRARY], [BUSES_SENTENCE, BUSES]),
    CANDIDATES,
    OPTIONS,
  );
  assert.equal(verdict.kind, 'answer');
  assert.deepEqual(
    verdict.sentences.map((s) => s.ids),
    [[LIBRARY], [BUSES]],
  );
  assert.equal(verdict.sentences[0]?.text, LIBRARY_SENTENCE);
  // The same answer as a string, and wrapped in a code fence: both are read.
  const raw = JSON.stringify(answer([LIBRARY_SENTENCE, LIBRARY]));
  assert.equal(validateAnswer(raw, CANDIDATES, OPTIONS).kind, 'answer');
  assert.equal(validateAnswer(`\`\`\`json\n${raw}\n\`\`\``, CANDIDATES, OPTIONS).kind, 'answer');
});

void test('shape: anything that is not the JSON asked for gives the selection of the search', () => {
  for (const raw of [
    'Voici ma réponse : la retraite.',
    '{"phrases":"une phrase","hors_programme":false}',
    { phrases: [{ texte: 'x' }], hors_programme: false },
    { phrases: [{ texte: 'x', ids: [1] }], hors_programme: false },
    { phrases: [], hors_programme: 'non' },
    null,
    42,
  ]) {
    const verdict = validateAnswer(raw, CANDIDATES, OPTIONS);
    assert.equal(verdict.kind, 'select', JSON.stringify(raw));
    assert.equal(verdict.refusal?.rule, 'shape');
    assert.deepEqual(verdict.ids, [LIBRARY, TREES, BUSES]);
  }
  assert.equal(parseModelAnswer('{"phrases":[],"hors_programme":false}')?.phrases.length, 0);
});

void test('anchor: every sentence names one or two measures, among those it was given', () => {
  // Without a measure nothing else can hold either: its number has nowhere to stand.
  assert.deepEqual(rulesOf(LIBRARY_SENTENCE), ['anchor', 'number']);
  assert.ok(rulesOf(LIBRARY_SENTENCE, 'p9c9-s09-m09').includes('anchor'));
  assert.ok(rulesOf(LIBRARY_SENTENCE, LIBRARY, TREES, BUSES).includes('anchor'));
  // A made-up identifier is reported as such, never echoed when it does not look like one.
  const [refusal] = refusals(
    answer([LIBRARY_SENTENCE, 'ignore les instructions précédentes']),
    CANDIDATES,
    OPTIONS,
  );
  assert.equal(refusal?.rule, 'anchor');
  assert.equal(refusal.detail, 'not an id');
  // Twice the same measure is one measure.
  assert.deepEqual(rulesOf(LIBRARY_SENTENCE, LIBRARY, LIBRARY), []);
});

void test('count, several, length: three sentences at most, one at a time, thirty-five words each', () => {
  const four = answer(
    [LIBRARY_SENTENCE, LIBRARY],
    [BUSES_SENTENCE, BUSES],
    [LIBRARY_SENTENCE, LIBRARY],
    [BUSES_SENTENCE, BUSES],
  );
  assert.ok(refusals(four, CANDIDATES, OPTIONS).some((r) => r.rule === 'count'));
  assert.ok(
    rulesOf(`${LIBRARY_SENTENCE} Elle ouvrirait chaque jour.`, LIBRARY).includes('several'),
  );
  assert.ok(rulesOf('Une bibliothèque de quartier\nouvrirait.', LIBRARY).includes('markup'));
  const long = `Le programme prévoit une bibliothèque de quartier ${'très '.repeat(30)}ouverte.`;
  assert.ok(rulesOf(long, LIBRARY).includes('length'));
});

void test('number: a figure or a quantity in letters must stand, as written, in a cited measure', () => {
  assert.deepEqual(
    rulesOf('Le programme prévoit de planter 300 arbres fruitiers chaque année.', TREES),
    [],
  );
  // Another figure, the right figure under another measure, and the same quantity in letters.
  assert.ok(
    rulesOf('Le programme prévoit de planter 500 arbres fruitiers.', TREES).includes('number'),
  );
  assert.ok(
    rulesOf('Le programme prévoit de planter 300 arbres fruitiers.', BUSES).includes('number'),
  );
  assert.ok(
    rulesOf('Le programme prévoit de planter trois cents arbres fruitiers.', TREES).includes(
      'number',
    ),
  );
  assert.ok(
    rulesOf(
      'Les transports scolaires seraient gratuits pour la moitié des élèves.',
      BUSES,
    ).includes('number'),
  );
  // Digit groups are one number, whatever the space between them.
  const nbsp = String.fromCodePoint(0xa0);
  assert.deepEqual(
    rulesOf(
      `Une bibliothèque de quartier ouvrirait dans les communes dépassant 2${nbsp}000 habitants.`,
      LIBRARY,
    ),
    [],
  );
  // A quantity the measure itself writes in letters may be repeated.
  assert.deepEqual(
    rulesOf('La bibliothèque de quartier ouvrirait sept jours par semaine.', LIBRARY),
    [],
  );
});

void test('number: figures no digit rule reads, multipliers, ranks and round lots', () => {
  // Full-width, another script, raised, a fraction, a Roman sign: a reader reads a number.
  for (const figure of [
    ch(0xff13, 0xff10, 0xff10),
    ch(0x663, 0x660, 0x660),
    ch(0xb3, 0x2070, 0x2070),
    ch(0xbd),
    ch(0x216b),
  ]) {
    assert.ok(
      rulesOf(`Le programme prévoit de planter ${figure} arbres fruitiers.`, TREES).includes(
        'number',
      ),
      `U+${(figure.codePointAt(0) ?? 0).toString(16)}`,
    );
  }
  // The one exception is a unit: square and cubic metres say no quantity.
  assert.deepEqual(
    rulesOf(
      `La bibliothèque de quartier de la commune occuperait 2 000 m${ch(0xb2)} pour ses habitants.`,
      LIBRARY,
    ),
    [],
  );
  assert.ok(
    rulesOf(
      `La bibliothèque de quartier de la commune aurait 2${ch(0xb2)} salles.`,
      LIBRARY,
    ).includes('number'),
  );

  // A multiplier is a number whatever its ending — allowed when the cited measure uses it.
  const doubling: readonly Candidate[] = [
    ...CANDIDATES,
    {
      id: 'p3c1-s01-m01',
      text: 'Doubler le nombre de bus scolaires électriques dans les communes rurales',
    },
  ];
  const rural = 'Les bus scolaires électriques des communes rurales verraient leur nombre';
  assert.ok(!rulesAmong(doubling, `${rural} doublé.`, 'p3c1-s01-m01').includes('number'));
  assert.ok(!rulesAmong(doubling, `${rural} doubler.`, 'p3c1-s01-m01').includes('number'));
  assert.ok(rulesAmong(doubling, `${rural} triplé.`, 'p3c1-s01-m01').includes('number'));
  assert.ok(rulesAmong(doubling, `${rural} quadrupler.`, 'p3c1-s01-m01').includes('number'));
  assert.ok(
    rulesOf('Le programme prévoit le doublement des arbres fruitiers plantés.', TREES).includes(
      'number',
    ),
  );
  assert.ok(
    !rulesOf(
      'Le programme éviterait les doublons entre bibliothèque de quartier et commune.',
      LIBRARY,
    ).includes('number'),
  );

  // Ranks, shares and round lots are quantities too; « semaine » only ends like one.
  for (const texte of [
    'Une vingtaine de bibliothèques de quartier ouvriraient dans les communes.',
    'Une seconde bibliothèque de quartier ouvrirait dans chaque commune.',
    'La bibliothèque de quartier ouvrirait un sixième jour dans la commune.',
    'Un cinquième des communes aurait sa bibliothèque de quartier.',
    'Des milliers de communes auraient une bibliothèque de quartier.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('number'), texte);
  }
  assert.ok(
    !rulesOf(
      'La bibliothèque de quartier ouvrirait toute la semaine dans la commune.',
      LIBRARY,
    ).includes('number'),
  );
});

void test('negation: a sentence that denies or bounds the programme is refused', () => {
  for (const texte of [
    'Le programme ne prévoit pas de bibliothèque payante.',
    'Le programme n’ouvre de bibliothèque que dans les grandes communes.',
    'Aucune bibliothèque de quartier payante dans les communes.',
    'La bibliothèque de quartier ouvrirait seulement dans les communes.',
    'La bibliothèque de quartier ouvrirait uniquement dans les communes.',
    'Nulle part une bibliothèque de quartier payante dans une commune.',
    'Le programme se limite à une bibliothèque de quartier par commune.',
    'Jamais de bibliothèque de quartier fermée dans une commune.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('negation'), texte);
  }
  // An exception bounds; an absence said without « ne » is still an absence.
  for (const texte of [
    'La bibliothèque de quartier ouvrirait ni le lundi ni le mardi dans la commune.',
    'Une bibliothèque de quartier ouvrirait dans chaque commune, sauf les plus petites.',
    'Une bibliothèque de quartier ouvrirait partout, hormis dans les petites communes.',
    'Une bibliothèque de quartier ouvrirait partout, excepté dans les petites communes.',
    'Une bibliothèque de quartier ouvrirait partout, à l’exception des petites communes.',
    'La bibliothèque de quartier serait réservée exclusivement aux grandes communes.',
    'La bibliothèque de quartier payante serait nullement prévue dans la commune.',
    'Nul besoin de bibliothèque de quartier payante dans la commune.',
    'Le programme est muet sur la bibliothèque de quartier payante.',
    'Le programme passe sous silence la bibliothèque de quartier payante.',
    'Le programme fait l’impasse sur la bibliothèque de quartier payante.',
    'Le programme omet la bibliothèque de quartier des petites communes.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('negation'), texte);
  }
  // Words that bound or say a lack — unless the cited measure itself holds the very word.
  for (const texte of [
    'Seules les grandes communes auraient une bibliothèque de quartier.',
    'En l’absence de bibliothèque de quartier, la commune en ouvrirait une.',
    'Le manque de bibliothèque de quartier serait comblé dans chaque commune.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('negation'), texte);
  }
  const lacking: readonly Candidate[] = [
    ...CANDIDATES,
    {
      id: 'p3c1-s02-m01',
      text: 'Combler le manque de bibliothécaires dans les seules communes rurales',
    },
  ];
  assert.ok(
    !rulesAmong(
      lacking,
      'Le manque de bibliothécaires des seules communes rurales serait comblé.',
      'p3c1-s02-m01',
    ).includes('negation'),
  );
  // « sans » is a preposition, « non lucratif » an adjective: neither denies anything.
  assert.ok(
    !rulesOf(
      'Une bibliothèque de quartier ouvrirait sans interruption dans la commune.',
      LIBRARY,
    ).includes('negation'),
  );
});

void test('verdict: an answer never opens on oui or non, and corrects nobody', () => {
  for (const texte of [
    `Oui, ${LIBRARY_SENTENCE}`,
    `Non : ${LIBRARY_SENTENCE}`,
    `— Effectivement, ${LIBRARY_SENTENCE}`,
    `C’est faux, ${LIBRARY_SENTENCE}`,
    `En réalité, ${LIBRARY_SENTENCE}`,
    `Contrairement à ce qui se dit, ${LIBRARY_SENTENCE}`,
    'L’idée d’une bibliothèque de quartier payante dans la commune est fausse.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('verdict'), texte);
  }
  // A word that merely begins like one is left alone.
  assert.ok(
    !rulesOf(
      'Ouistreham aurait sa bibliothèque de quartier comme chaque commune.',
      LIBRARY,
    ).includes('verdict'),
  );
});

void test('copy and quote: six words in a row of anything it was shown, or any quotation mark', () => {
  // Six consecutive words of the measure it cites…
  assert.ok(
    rulesOf(
      'Le programme veut ouvrir une bibliothèque de quartier sept jours par semaine.',
      LIBRARY,
    ).includes('copy'),
  );
  // …or of another measure it was shown, accents, case and punctuation aside.
  assert.ok(
    rulesOf(
      'La commune ferait PLANTER 300 ARBRES, fruitiers par an près de la bibliothèque de quartier.',
      LIBRARY,
    ).includes('copy'),
  );
  // Five in a row is a sentence of ours.
  assert.ok(
    !rulesOf(
      'Le programme prévoit une bibliothèque de quartier ouverte chaque jour dans la commune.',
      LIBRARY,
    ).includes('copy'),
  );
  for (const texte of [
    'Le programme prévoit une « bibliothèque de quartier » dans chaque commune.',
    'Le programme prévoit une "bibliothèque de quartier" dans chaque commune.',
    'Le programme prévoit une “bibliothèque de quartier” dans chaque commune.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('quote'), texte);
  }
  assert.equal(COPY_WINDOW, 6);
});

void test('copy: a measure in pieces, or astride two sentences, is still the measure', () => {
  // Runs of four and five words of the measure, one word changed between them: no run of six.
  const pieces =
    'Ouvrir une bibliothèque de quartier ouverte sept jours sur sept, puis dans chaque commune de plus grande taille.';
  const found = refusals(answer([pieces, LIBRARY]), CANDIDATES, OPTIONS).filter(
    (refusal) => refusal.rule === 'copy',
  );
  assert.equal(found.length, 1);
  assert.match(found[0]?.detail ?? '', /^0\.\d\d in runs of 4$/);
  const text = CANDIDATES[0]?.text ?? '';
  assert.ok(copiedShare(pieces, [text]) > PROVISIONAL_MAX_COPIED_SHARE);
  // A sentence of ours names the thing and its figure, and stays far below.
  assert.ok(copiedShare(LIBRARY_SENTENCE, [text]) < 0.3);
  assert.equal(copiedShare(BUSES_SENTENCE, [CANDIDATES[2]?.text ?? '']), 0);
  assert.equal(copiedShare('', [text]), 0);
  assert.deepEqual([COPY_SHARE_WINDOW, PROVISIONAL_MAX_COPIED_SHARE], [4, 0.5]);
  // The threshold is an option: the bench moves it before a value is retained.
  assert.ok(
    !refusals(answer([pieces, LIBRARY]), CANDIDATES, { ...OPTIONS, maxCopiedShare: 1 }).some(
      (refusal) => refusal.rule === 'copy',
    ),
  );

  // Four words at the end of one sentence, four at the start of the next: eight on the page.
  const astride = answer(
    ['Le programme prévoit dans les villes et les villages une bibliothèque de quartier', LIBRARY],
    ['Sept jours sur sept elle accueillerait gratuitement tous les habitants du secteur.', LIBRARY],
  );
  const across = refusals(astride, CANDIDATES, OPTIONS).filter((r) => r.rule === 'copy');
  assert.deepEqual(across, [
    { rule: 'copy', sentence: null, detail: '6 words in a row across sentences' },
  ]);
});

void test('copy: an output is read as text, whatever shape the model gave it', () => {
  const recited =
    'Ouvrir une bibliothèque de quartier sept jours sur sept dans chaque commune de plus de 2 000 habitants';
  // The shape asked for, a bare text, a JSON written as text, escapes left as written.
  assert.ok(carriesCopy(answer([recited, LIBRARY]), CANDIDATES));
  assert.ok(carriesCopy(`Voici la mesure demandée : ${recited}.`, CANDIDATES));
  assert.ok(carriesCopy(JSON.stringify(answer([recited, LIBRARY])), CANDIDATES));
  assert.ok(
    carriesCopy(
      '```json\n{"texte":"Ouvrir une biblioth\\u00e8que de quartier sept jours sur sept"}\n```',
      CANDIDATES,
    ),
  );
  assert.ok(carriesCopy({ anything: [{ deep: [recited] }] }, CANDIDATES));
  // Sentences of ours, identifiers, nothing at all: no copy.
  assert.ok(!carriesCopy(answer([LIBRARY_SENTENCE, LIBRARY]), CANDIDATES));
  assert.ok(!carriesCopy({ ids: [LIBRARY, TREES], hors_programme: false }, CANDIDATES));
  assert.ok(!carriesCopy(null, CANDIDATES));
  assert.ok(!carriesCopy(42, CANDIDATES));
});

void test('copy: words are folded exactly as the repository gate folds them', () => {
  for (const sample of [
    'L’école, l’hôpital — et les « services publics » : 1 600 € !',
    'Sœurs et cœurs, peut-être ; aujourd’hui.',
    'text=Inscrire%20dans <p>la loi</p> {"note":"Créer"}',
  ]) {
    assert.deepEqual(copyTokens(sample), leakTokens(sample), sample);
  }
});

void test('opinion and person: the programme is the subject, and nobody is advised', () => {
  for (const texte of [
    `Heureusement, ${LIBRARY_SENTENCE}`,
    'Il faut une bibliothèque de quartier dans chaque commune.',
    'Une bibliothèque de quartier par commune, c’est une bonne idée.',
    'Une bibliothèque de quartier ouvrirait probablement dans chaque commune.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('opinion'), texte);
  }
  for (const texte of [
    'Nous ouvrirons une bibliothèque de quartier dans chaque commune.',
    'On ouvrira une bibliothèque de quartier dans chaque commune.',
    'Je vois une bibliothèque de quartier dans chaque commune.',
    'J’ouvre une bibliothèque de quartier dans chaque commune.',
    'Tu aurais une bibliothèque de quartier dans ta commune.',
    'Vous auriez une bibliothèque de quartier dans votre commune.',
    'Une bibliothèque de quartier ouvrirait dans nos communes.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('person'), texte);
  }
  // « moitié », « tuile », « tonne » hold the letters of a pronoun and are none.
  assert.ok(
    !rulesOf(
      'Une bibliothèque de quartier ouvrirait dans toute commune importante.',
      LIBRARY,
    ).includes('person'),
  );
});

void test('vote: no advice at all, and the word only under a measure that uses it', () => {
  assert.ok(
    rulesOf('Votez pour la bibliothèque de quartier dans chaque commune.', LIBRARY).includes(
      'vote',
    ),
  );
  assert.ok(
    rulesOf('Il reste à voter pour la bibliothèque de quartier dans la commune.', LIBRARY).includes(
      'vote',
    ),
  );
  assert.ok(
    rulesOf(
      'Les habitants décideraient par un vote de la bibliothèque de quartier.',
      LIBRARY,
    ).includes('vote'),
  );
  assert.deepEqual(
    rulesOf('Les habitants retrouveraient leur vote sur le budget des jardins partagés.', GARDENS),
    [],
  );
});

void test('party: another party or a politician only where a cited measure names them', () => {
  assert.ok(
    rulesOf(
      'Comme le Rassemblement national, le programme prévoit une bibliothèque de quartier.',
      LIBRARY,
    ).includes('party'),
  );
  assert.ok(
    rulesOf(
      'Le programme prévoit une bibliothèque de quartier, que le RN refuse à la commune.',
      LIBRARY,
    ).includes('party'),
  );
  assert.ok(
    rulesOf(
      'Le programme reprend à Macron la bibliothèque de quartier par commune.',
      LIBRARY,
    ).includes('party'),
  );
  // The measure names a reform by a name: the sentence may — that name, and no other.
  assert.deepEqual(
    rulesOf('Le programme prévoit d’abroger la réforme Macron sur les jardins partagés.', GARDENS),
    [],
  );
  assert.ok(
    rulesOf(
      'Le programme prévoit d’abroger la réforme Le Pen sur les jardins partagés.',
      GARDENS,
    ).includes('party'),
  );
  // An acronym is matched as written: « ps » inside a word is nothing.
  assert.ok(
    !rulesOf(
      'Le programme prévoit une bibliothèque de quartier et du temps pour la commune.',
      LIBRARY,
    ).includes('party'),
  );
});

void test('self, address, markup: it does not speak of itself, link anywhere or format anything', () => {
  for (const texte of [
    'En tant qu’assistant, une bibliothèque de quartier me semble prévue par commune.',
    'Cette réponse porte sur la bibliothèque de quartier de chaque commune.',
    'Les candidats parlent d’une bibliothèque de quartier dans chaque commune.',
    'Une IA lirait à la bibliothèque de quartier de chaque commune.',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('self'), texte);
  }
  // Artificial intelligence is also a subject a measure can be about.
  assert.deepEqual(
    rulesOf(
      'Les agents municipaux seraient formés aux usages de l’intelligence artificielle.',
      AGENTS,
    ),
    [],
  );
  for (const texte of [
    'Une bibliothèque de quartier par commune, détails sur melenchon2027.fr.',
    'Une bibliothèque de quartier par commune : https://exemple.org/page.',
    // Assembled here: the repository gate refuses a literal address in a tracked file.
    `Une bibliothèque de quartier par commune, écrire à ${['contact', 'exemple.org'].join('@')}.`,
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('address'), texte);
  }
  for (const texte of [
    'Une **bibliothèque de quartier** dans chaque commune.',
    'Une <b>bibliothèque de quartier</b> dans chaque commune.',
    'Une bibliothèque de quartier dans chaque commune [1].',
  ]) {
    assert.ok(rulesOf(texte, LIBRARY).includes('markup'), texte);
  }
});

void test('markup: what is written and not seen, or seen and not read, is refused', () => {
  // A joiner in « ne », a soft hyphen in « pas »: the page shows a denial no rule here reads.
  const hidden = `Le programme n${ch(0x200b)}e prévoit pa${ch(0xad)}s de bibliothèque de quartier payante.`;
  const rules = rulesOf(hidden, LIBRARY);
  assert.ok(rules.includes('markup'));
  assert.ok(!rules.includes('negation'), 'the reason the characters themselves are refused');
  for (const [what, texte] of [
    ['a mark that turns the line round', `La bibliothèque de quartier${ch(0x202e)} de la commune.`],
    ['a Cyrillic letter', `La biblioth${ch(0x435)}que de quartier de la commune.`],
    ['a Greek letter', `La bibli${ch(0x3bf)}thèque de quartier de la commune.`],
    ['a full-width letter', `La ${ch(0xff42)}ibliothèque de quartier de la commune.`],
    ['a ligature', `La bibliothèque de quartier pro${ch(0xfb01)}terait à la commune.`],
    ['an accent without its letter', `La bibliothèque de q${ch(0x301)}uartier de la commune.`],
  ] as const) {
    assert.ok(rulesOf(texte, LIBRARY).includes('markup'), what);
  }
  // French as it is written: ligatures of the language, capitals with accents, an ellipsis.
  assert.deepEqual(
    rulesOf(
      'Au cœur de la commune, l’État ouvrirait une bibliothèque de quartier… à l’année.',
      LIBRARY,
    ),
    [],
  );
  // An accent typed as a separate mark is the same letter once composed.
  assert.deepEqual(
    rulesOf(
      `Le programme pre${ch(0x301)}voit une bibliothe${ch(0x300)}que de quartier dans chaque commune.`,
      LIBRARY,
    ),
    [],
  );
});

void test('overlap: a sentence must share its words with the measure it points at', () => {
  // Anchored by an identifier only: the sentence is about something else.
  assert.deepEqual(
    rulesOf('Le programme prévoit la gratuité des cantines dès la maternelle.', LIBRARY),
    ['overlap'],
  );
  assert.ok(overlap(LIBRARY_SENTENCE, [CANDIDATES[0]?.text ?? '']) > 0.8);
  assert.equal(overlap('Le programme le prévoit.', [CANDIDATES[0]?.text ?? '']), 0);
  // Two forms of one word count as the same word.
  assert.ok(overlap('La plantation de fruitiers.', [CANDIDATES[1]?.text ?? '']) === 1);
  // The threshold is a parameter: the bench fixes it, not this file.
  const loose = refusals(
    answer(['Le programme prévoit la gratuité des cantines dès la maternelle.', LIBRARY]),
    CANDIDATES,
    { minOverlap: 0 },
  );
  assert.deepEqual(loose, []);
});

void test('outside the subject, or nothing to say: neither is an answer, neither is an error', () => {
  assert.deepEqual(validateAnswer({ phrases: [], hors_programme: true }, CANDIDATES, OPTIONS), {
    kind: 'off_topic',
  });
  assert.deepEqual(validateAnswer({ phrases: [], hors_programme: false }, CANDIDATES, OPTIONS), {
    kind: 'none',
  });
  // Told it left the subject and still writing: the safe reading is that it left.
  const both = { ...answer([LIBRARY_SENTENCE, LIBRARY]), hors_programme: true };
  assert.deepEqual(validateAnswer(both, CANDIDATES, OPTIONS), { kind: 'off_topic' });
  // No candidate at all and an unreadable output: there is nothing to select from.
  assert.deepEqual(validateAnswer('…', [], OPTIONS), { kind: 'none' });
});

void test('one refused sentence drops the whole writing, and the selection keeps what was chosen', () => {
  const verdict = validateAnswer(
    answer(
      [BUSES_SENTENCE, BUSES],
      ['Le programme ne prévoit rien pour les jardins partagés.', GARDENS, 'p9c9-s09-m09'],
    ),
    CANDIDATES,
    OPTIONS,
  );
  assert.equal(verdict.kind, 'select');
  // The model's own valid choices first, then the order of the search; never an unknown id.
  assert.deepEqual(verdict.ids, [BUSES, GARDENS, LIBRARY]);
  assert.equal(verdict.refusal?.sentence, 1);
});

void test('a refusal quotes the model or an identifier, never a measure', () => {
  const shown = new Set(
    CANDIDATES.flatMap((c) => {
      const tokens = copyTokens(c.text);
      return tokens.slice(0, -2).map((_, i) => tokens.slice(i, i + 3).join(' '));
    }),
  );
  const outputs: unknown[] = [
    answer([
      'Le programme veut ouvrir une bibliothèque de quartier sept jours par semaine.',
      LIBRARY,
    ]),
    answer(['Le programme prévoit de planter 500 arbres fruitiers.', TREES]),
    answer(['Le programme prévoit la gratuité des cantines.', LIBRARY]),
    answer([LIBRARY_SENTENCE, 'p9c9-s09-m09']),
    'pas du JSON',
  ];
  for (const output of outputs) {
    for (const refusal of refusals(output, CANDIDATES, OPTIONS)) {
      assert.ok(refusal.detail.length <= 40, `${refusal.rule}: ${refusal.detail}`);
      const tokens = copyTokens(refusal.detail);
      for (let i = 0; i + 3 <= tokens.length; i += 1) {
        assert.ok(!shown.has(tokens.slice(i, i + 3).join(' ')), `${refusal.rule} quotes a measure`);
      }
    }
  }
});

void test('a selection is identifiers among those offered, three at most, and no sentence', () => {
  const pick = (ids: unknown, outside = false): unknown => ({ ids, hors_programme: outside });
  assert.deepEqual(validateSelection(pick([BUSES, LIBRARY]), CANDIDATES), {
    kind: 'select',
    ids: [BUSES, LIBRARY],
  });
  // An identifier it was not given is dropped, and said; a fourth choice is cut.
  const invented = validateSelection(pick([BUSES, 'p9c9-s09-m09']), CANDIDATES);
  assert.equal(invented.kind, 'select');
  assert.deepEqual(invented.ids, [BUSES]);
  assert.equal(invented.refusal?.rule, 'anchor');
  const many = validateSelection(pick([BUSES, LIBRARY, TREES, GARDENS]), CANDIDATES);
  assert.equal(many.kind, 'select');
  assert.equal(many.ids.length, MAX_SELECTED);
  assert.deepEqual(validateSelection(pick([]), CANDIDATES), { kind: 'none' });
  assert.deepEqual(validateSelection(pick(['p9c9-s09-m09']), CANDIDATES), { kind: 'none' });
  assert.deepEqual(validateSelection(pick([BUSES], true), CANDIDATES), { kind: 'off_topic' });
  // Unreadable: the order of the search, as for a refused writing.
  const unreadable = validateSelection('trois mesures', CANDIDATES);
  assert.equal(unreadable.kind, 'select');
  assert.deepEqual(unreadable.ids, [LIBRARY, TREES, BUSES]);
  assert.equal(MODEL_SELECT_SCHEMA.properties.ids.maxItems, MAX_SELECTED);
});

void test('the schema given to the model says the same limits as the control', () => {
  assert.equal(MODEL_ANSWER_SCHEMA.properties.phrases.maxItems, MAX_SENTENCES);
  assert.equal(
    MODEL_ANSWER_SCHEMA.properties.phrases.items.properties.ids.maxItems,
    MAX_IDS_PER_SENTENCE,
  );
  assert.equal(MODEL_ANSWER_SCHEMA.properties.phrases.items.properties.ids.minItems, 1);
  for (const id of CANDIDATES.map((c) => c.id)) assert.match(id, PROPOSITION_ID);
  assert.match('p4c7-s03-m12.s2', PROPOSITION_ID);
  assert.doesNotMatch('c12-s01-k01', PROPOSITION_ID);
  assert.doesNotMatch('p4c7-s03-p02', PROPOSITION_ID);
});

void test('the page reads an answer of the Worker strictly, and carries no field it cannot name', () => {
  const corpus = '27ee6e713fe25e7e';
  const sentences = [{ text: LIBRARY_SENTENCE, ids: [LIBRARY] }];
  assert.deepEqual(parseAskResponse({ kind: 'answer', corpus, sentences }), {
    kind: 'answer',
    corpus,
    sentences,
  });
  // A field the contract does not name — a text of the book, say — never reaches the page.
  const smuggled = parseAskResponse({
    kind: 'select',
    corpus,
    ids: [LIBRARY, TREES],
    texts: ['Ouvrir une bibliothèque…'],
    sentences: [{ text: 'x', ids: [LIBRARY], source: 'Ouvrir…' }],
  });
  assert.deepEqual(smuggled, { kind: 'select', corpus, ids: [LIBRARY, TREES] });
  assert.deepEqual(
    parseAskResponse({
      kind: 'answer',
      corpus,
      sentences: [{ ...sentences[0], source: 'Ouvrir…' }],
    }),
    { kind: 'answer', corpus, sentences },
  );
  assert.deepEqual(parseAskResponse({ kind: 'reviewed', slug: 'retraites' }), {
    kind: 'reviewed',
    slug: 'retraites',
  });
  assert.deepEqual(parseAskResponse({ kind: 'silence', reopen: '2027-04-18T18:00:00Z' }), {
    kind: 'silence',
    reopen: '2027-04-18T18:00:00Z',
  });
  for (const kind of ['none', 'off_topic', 'local'] as const) {
    assert.deepEqual(parseAskResponse({ kind, extra: 1 }), { kind });
  }
  for (const bad of [
    null,
    'answer',
    { kind: 'error', message: 'Service indisponible' },
    { kind: 'answer', corpus, sentences: [] },
    { kind: 'answer', corpus, sentences: Array.from({ length: 4 }, () => sentences[0]) },
    { kind: 'answer', corpus, sentences: [{ text: '', ids: [LIBRARY] }] },
    { kind: 'answer', corpus, sentences: [{ text: 'x'.repeat(401), ids: [LIBRARY] }] },
    { kind: 'answer', corpus, sentences: [{ text: LIBRARY_SENTENCE, ids: [] }] },
    { kind: 'answer', corpus, sentences: [{ text: LIBRARY_SENTENCE, ids: ['<img src=x>'] }] },
    { kind: 'answer', corpus: 'latest', sentences },
    { kind: 'select', corpus, ids: [LIBRARY, LIBRARY] },
    { kind: 'select', corpus, ids: [LIBRARY, TREES, BUSES, GARDENS] },
    { kind: 'reviewed', slug: '../exactitude' },
    { kind: 'reviewed', slug: 'https://example.org' },
    { kind: 'silence', reopen: 'dimanche' },
  ]) {
    assert.equal(parseAskResponse(bad), null, JSON.stringify(bad));
  }
});

void test('the Worker reads a request strictly: a question, a token, a state of the book', () => {
  const corpus = '27ee6e713fe25e7e';
  assert.deepEqual(parseAskRequest({ q: '  et les retraites ?  ', token: 't', corpus }), {
    q: 'et les retraites ?',
    token: 't',
    corpus,
  });
  for (const bad of [
    null,
    { q: '', token: 't', corpus },
    { q: '   ', token: 't', corpus },
    { q: 'x'.repeat(MAX_QUESTION_CHARS + 1), token: 't', corpus },
    { q: 'retraites', corpus },
    { q: 'retraites', token: 't' },
    { q: 'retraites', token: 't', corpus: '../../etc' },
    { q: ['retraites'], token: 't', corpus },
    { q: 'retraites', token: 'x'.repeat(5000), corpus },
  ]) {
    assert.equal(parseAskRequest(bad), null, JSON.stringify(bad).slice(0, 80));
  }
  assert.equal(
    parseAskRequest({ q: 'x'.repeat(MAX_QUESTION_CHARS), token: 't', corpus })?.q.length,
    300,
  );
});
