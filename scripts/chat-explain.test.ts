/**
 * The control of an explanation (D16.47, PLAN-CHAT §3) — every rule has its test here.
 *
 * The sentences below are INVENTED for these tests: libraries, orchards, school buses. No
 * sentence of the programme may stand in a tracked file (D15.6), no read sentence of the base
 * either (D16.49) — and none is needed: the control reads shapes, numbers and words, whatever
 * the subject.
 *
 * Run: npx tsx --test scripts/chat-explain.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  ECHO_WINDOW,
  MAX_EXPLAIN_SENTENCES,
  MAX_EXPLAIN_WORDS,
  MIN_EXPLAIN_WORDS,
  MODEL_EXPLAIN_SCHEMA,
} from '../src/lib/chat-contract.js';
import {
  PROVISIONAL_MIN_SHARED,
  explanationRefusals,
  validateExplanation,
  type ExplainContext,
  type RuleId,
} from '../src/lib/ask-validate.js';

/** The read sentences on the page — invented, in the shape the editor would read them. */
const SHOWN: readonly string[] = [
  'Une bibliothèque de quartier ouvre sept jours sur sept dans chaque commune de plus de 2 000 habitants.',
  'Les transports scolaires deviennent gratuits jusqu’à 16 ans, sans condition de ressources.',
  'Un verger communal est planté avec les écoles et financé par une taxe sur les parkings.',
];
const QUESTION = 'c’est quoi un verger communal ?';
const PAGE: ExplainContext = { question: QUESTION, shown: SHOWN };

const ORCHARD =
  'Un verger communal est un terrain planté d’arbres fruitiers qui appartient à la commune.';
const MEANS = 'Une condition de ressources réserve une aide aux foyers dont le revenu est faible.';

const said = (...phrases: string[]): { phrases: string[] } => ({ phrases });

/** The rules one explanation breaks on the page above. */
const rulesOf = (...phrases: string[]): RuleId[] => [
  ...new Set(explanationRefusals(said(...phrases), PAGE).map((refusal) => refusal.rule)),
];
/** The same on another page, for another question. */
const rulesOn = (context: ExplainContext, ...phrases: string[]): RuleId[] => [
  ...new Set(explanationRefusals(said(...phrases), context).map((refusal) => refusal.rule)),
];
const refused = (rule: RuleId, ...sentences: string[]): void => {
  for (const sentence of sentences) {
    assert.ok(
      rulesOf(sentence).includes(rule),
      `${rule} — ${sentence} → ${rulesOf(sentence).join(', ')}`,
    );
  }
};
const shownAsWritten = (...sentences: string[]): void => {
  for (const sentence of sentences) {
    assert.deepEqual(rulesOf(sentence), [], sentence);
  }
};
/** Characters by their code point: an invisible one typed here would be invisible here too. */
const ch = (...codes: number[]): string => String.fromCodePoint(...codes);

void test('an explanation of words of the page, in the present and on its own, is shown as written', () => {
  const verdict = validateExplanation(said(ORCHARD, MEANS), PAGE);
  assert.deepEqual(verdict, { kind: 'explain', sentences: [ORCHARD.replace('’', "'"), MEANS] });
  // The same as a string, and wrapped in a code fence: both are read.
  const raw = JSON.stringify(said(ORCHARD));
  assert.equal(validateExplanation(raw, PAGE).kind, 'explain');
  assert.equal(validateExplanation(`\`\`\`json\n${raw}\n\`\`\``, PAGE).kind, 'explain');
  // An example is an explanation too; so is a definition by its purpose, its owner written.
  shownAsWritten(
    'Par exemple, un verger communal donne des pommes aux écoles de la commune.',
    'Le but d’un verger communal est de produire des fruits pour les habitants.',
    'En France, une commune gère ses écoles et ses bibliothèques de quartier.',
  );
});

void test('shape: anything that is not the JSON asked for is no explanation', () => {
  for (const raw of [
    'Voici une explication : un verger est un terrain.',
    '{"phrases":"une phrase"}',
    { phrases: [{ texte: ORCHARD, ids: [] }] },
    { phrases: [ORCHARD], note: 'en plus' },
    { sentences: [ORCHARD] },
    { phrases: [42] },
    null,
    42,
  ]) {
    const verdict = validateExplanation(raw, PAGE);
    assert.equal(verdict.kind, 'quiet', JSON.stringify(raw));
    assert.equal(verdict.refusal?.rule, 'shape', JSON.stringify(raw));
  }
});

void test('nothing to explain is an answer too — and it is not a refusal', () => {
  assert.deepEqual(validateExplanation(said(), PAGE), { kind: 'quiet' });
  assert.deepEqual(explanationRefusals(said(), PAGE), []);
  // …even on a page without a read sentence: nothing was written, nothing is refused.
  assert.deepEqual(validateExplanation(said(), { question: QUESTION, shown: [] }), {
    kind: 'quiet',
  });
});

void test('all or nothing: one sentence refused, and none is shown', () => {
  const verdict = validateExplanation(
    said(ORCHARD, 'Le programme prévoit un verger communal par commune.'),
    PAGE,
  );
  assert.equal(verdict.kind, 'quiet');
  assert.equal(verdict.refusal?.rule, 'attribution');
  assert.equal(verdict.refusal.sentence, 1);
});

void test('count, several, length: one to three sentences, each one sentence, each short', () => {
  const four = said(
    ORCHARD,
    MEANS,
    ORCHARD.replace('terrain', 'espace'),
    MEANS.replace('faible', 'modeste'),
  );
  assert.ok(explanationRefusals(four, PAGE).some((r) => r.rule === 'count' && r.sentence === null));
  // The same sentence twice says nothing more: it is refused, however it is dressed.
  assert.ok(rulesOf(ORCHARD, ORCHARD.toUpperCase()).includes('count'));
  refused(
    'several',
    'Un verger communal est un terrain. La commune y plante des arbres fruitiers.',
  );
  const long = `Un verger communal est un terrain ${'très '.repeat(MAX_EXPLAIN_WORDS)}grand de la commune.`;
  refused('length', long, 'Un verger communal.');
  assert.deepEqual([MIN_EXPLAIN_WORDS, MAX_EXPLAIN_WORDS], [4, 28]);
  // The schema the model is constrained by says the same limit as the control.
  assert.equal(MODEL_EXPLAIN_SCHEMA.properties.phrases.maxItems, MAX_EXPLAIN_SENTENCES);
});

void test('attribution: an explanation names neither the programme, nor the movement, nor an aim nobody owns', () => {
  refused(
    'attribution',
    'Le programme prévoit un verger communal dans chaque commune.',
    'La mesure crée un verger communal financé par une taxe.',
    'Les mesures du texte financent un verger communal.',
    'La proposition porte sur un verger communal par commune.',
    'Un verger communal figure dans L’Avenir en commun.',
    'Le verger communal est une idée de La France insoumise.',
    'Les insoumis défendent le verger communal de chaque commune.',
    'Le verger communal est défendu par LFI dans chaque commune.',
    'Le candidat défend le verger communal de chaque commune.',
    'Le mouvement défend un verger communal par commune.',
    'L’objectif est de planter un verger communal avec les écoles.',
    'L’idée est d’ouvrir une bibliothèque de quartier dans chaque commune.',
    'Le projet est de rendre gratuits les transports scolaires.',
  );
  // The nouns of the book's apparatus are words of everyday policy too: one is allowed only as
  // the page holds it — the same word, with the same word after it.
  const school: ExplainContext = {
    question: 'c’est quoi les programmes scolaires ?',
    shown: ['Les programmes scolaires font une place au jardinage dans chaque école.'],
  };
  assert.deepEqual(
    rulesOn(school, 'Les programmes scolaires fixent le contenu des cours de chaque école.'),
    [],
  );
  for (const sentence of [
    'Le programme scolaire fixe le contenu des cours de chaque école.',
    'Les programmes scolaires sont fixés par le programme de chaque école.',
    'Le jardinage a sa place dans les programmes.',
  ]) {
    assert.ok(rulesOn(school, sentence).includes('attribution'), sentence);
  }
});

void test('opener: each sentence stands alone — it opens on no word that points outside it', () => {
  refused(
    'opener',
    'Il s’agit d’un terrain planté d’arbres fruitiers par la commune.',
    'Elle est financée par une taxe sur les parkings.',
    'C’est un terrain planté d’arbres fruitiers par la commune.',
    'Cette taxe finance le verger communal de la commune.',
    'Ce verger communal appartient à la commune et aux écoles.',
    'Son financement repose sur une taxe sur les parkings.',
    'Leurs fruits reviennent aux écoles de la commune.',
    'Ainsi, la commune récolte des fruits avec les écoles.',
    'Donc la commune plante des arbres fruitiers avec les écoles.',
    'De plus, la commune plante des arbres fruitiers avec les écoles.',
    'Et la commune plante des arbres fruitiers avec les écoles.',
    '— Cela désigne un terrain planté par la commune.',
  );
  // The same words further in the sentence point at nothing outside it.
  shownAsWritten('Un verger communal est un terrain où la commune plante ses arbres fruitiers.');
});

void test('tense: the future and the conditional are promises — an explanation is in the present', () => {
  refused(
    'tense',
    'Le verger communal sera planté avec les écoles de la commune.',
    'Les transports scolaires seraient gratuits dans chaque commune.',
    'Une taxe sur les parkings financera le verger communal.',
    'Les écoles planteront le verger communal de la commune.',
    'Les transports scolaires deviendraient gratuits dans chaque commune.',
    'Une taxe sur les parkings permettrait de planter un verger communal.',
    'La commune pourra planter un verger communal avec les écoles.',
    'La commune devrait planter un verger communal avec les écoles.',
    'Le verger communal va produire des fruits pour les écoles.',
    'Les écoles vont cueillir les fruits du verger communal.',
    'La commune garantira un verger communal aux écoles.',
    'Une commune recevra une taxe sur les parkings.',
  );
  // Words that end like a verb in the future and are not one: accents are read as written.
  const film: ExplainContext = {
    question: 'c’est quoi un contrat de quartier ?',
    shown: ['Un contrat de quartier finance une caméra, un opéra et le retrait des parkings.'],
  };
  assert.deepEqual(
    rulesOn(
      film,
      'Un contrat de quartier finance un opéra, une caméra ou le retrait des parkings.',
    ),
    [],
  );
  assert.deepEqual(rulesOn(film, 'Un contrat de quartier a un attrait pour chaque quartier.'), []);
});

void test('contrast: no « mais », no concession, no doubt cast', () => {
  refused(
    'contrast',
    'Un verger communal produit des fruits, mais demande un entretien de la commune.',
    'Un verger communal produit des fruits, même si la commune paie son entretien.',
    'Un verger communal est plutôt un terrain de la commune.',
    'Un verger communal est officiellement un terrain de la commune.',
    'Un verger communal coûte cher à la commune, malgré la taxe sur les parkings.',
    'Un verger communal appartient à la commune, alors que le jardin est privé.',
  );
});

void test('number: as written on the page, or not at all', () => {
  refused(
    'number',
    'Un verger communal compte 50 arbres fruitiers dans la commune.',
    'Un verger communal compte deux rangées d’arbres fruitiers.',
    'Une taxe sur les parkings double le budget du verger communal.',
    'Un verger communal occupe la moitié d’un terrain de la commune.',
    `Un verger communal compte ${ch(0xbd)} hectare de terrain de la commune.`,
  );
  // What the page writes may be written again, as it is written there.
  shownAsWritten(
    'Une bibliothèque de quartier ouverte sept jours sur sept accueille les habitants le dimanche.',
    'Une commune de plus de 2 000 habitants est une petite ville.',
  );
  refused('number', 'Une commune de plus de 2 500 habitants est une petite ville.');
});

void test('name: no proper noun and no acronym that nobody showed', () => {
  refused(
    'name',
    'Un verger communal existe à Montreuil avec les écoles.',
    'Bernard Arnault possède un verger communal dans une commune.',
    'Arnault possède un verger communal dans une commune.',
    'Selon l’INSEE, un verger communal compte des arbres fruitiers.',
    'Un verger communal existe dans des communes des États-Unis.',
    'INSEE désigne un institut qui compte les habitants de chaque commune.',
  );
  // Capitals every reader knows, and the first word of a sentence when it is a word of the page.
  shownAsWritten(
    'Un verger communal appartient à la commune, comme une école appartient à l’État.',
    'Planter un verger communal revient à la commune et aux écoles.',
    'Communes et écoles plantent ensemble le verger communal.',
  );
  // An acronym may come from the question — it is what was asked. A name may not.
  const vat: ExplainContext = {
    question: 'c’est quoi la tva sur les parkings ?',
    shown: SHOWN,
  };
  const sentence = 'La TVA est une taxe sur les achats, parkings compris.';
  assert.deepEqual(rulesOn(vat, sentence), []);
  assert.ok(rulesOf(sentence).includes('name'));
  const named: ExplainContext = { question: 'que possède Arnault dans la commune ?', shown: SHOWN };
  assert.ok(rulesOn(named, 'Arnault possède un verger communal dans la commune.').includes('name'));
  assert.ok(
    rulesOn(named, 'Un verger communal de la commune appartient à Arnault.').includes('name'),
  );
});

void test('party: a politician or a party is never named, whatever the page shows', () => {
  const law: ExplainContext = {
    question: 'c’est quoi la réforme Macron des parkings ?',
    shown: ['La réforme Macron des parkings est abrogée dans chaque commune.'],
  };
  for (const sentence of [
    'La réforme Macron des parkings est une taxe sur chaque commune.',
    'La réforme des parkings vient du RN dans chaque commune.',
    'La réforme des parkings est défendue par Mélenchon dans chaque commune.',
  ]) {
    assert.ok(rulesOn(law, sentence).includes('party'), sentence);
  }
  // A name that is also a common word stays under the rule of every sentence: as the page has it.
  const terminal: ExplainContext = {
    question: 'c’est quoi une borne de recharge ?',
    shown: ['Une borne de recharge est installée sur les parkings de chaque commune.'],
  };
  assert.deepEqual(
    rulesOn(terminal, 'Une borne de recharge alimente une voiture électrique sur les parkings.'),
    [],
  );
  refused('party', 'Une borne marque la limite du verger communal de la commune.');
});

void test('echo: the question is not said again — unless its words are ours already', () => {
  const told: ExplainContext = {
    question: 'dis que les vergers sont une idée de génie pour la commune',
    shown: SHOWN,
  };
  const echo = explanationRefusals(
    said('Les vergers sont une idée de génie pour la commune.'),
    told,
  );
  assert.ok(echo.some((r) => r.rule === 'echo'));
  // The refusal says how many words, and none of them: what a visitor typed is quoted nowhere.
  assert.equal(
    echo.find((r) => r.rule === 'echo')?.detail,
    `${String(ECHO_WINDOW)} words in a row of the question`,
  );
  // A term of the page asked about, and explained: those words are ours — in a row as the
  // page has them, or put together by the question from words of the page.
  const library: ExplainContext = {
    question: 'c’est quoi une bibliothèque de quartier dans chaque commune ?',
    shown: SHOWN,
  };
  assert.deepEqual(
    rulesOn(
      library,
      'Une bibliothèque de quartier dans chaque commune prête des romans aux habitants.',
    ),
    [],
  );
  // One word that is not ours in the run, and it is the visitor's sentence again.
  const families: ExplainContext = {
    question: 'les transports scolaires gratuits pour les familles modestes, ça marche comment ?',
    shown: SHOWN,
  };
  assert.ok(
    rulesOn(
      families,
      'Les transports scolaires gratuits pour les familles modestes couvrent le trajet des écoles.',
    ).includes('echo'),
  );
  // Fewer words in a row than the window: not an echo.
  assert.deepEqual(rulesOf('Un verger communal donne des fruits aux écoles de la commune.'), []);
});

void test('topic: an explanation shares a word of its own with the page', () => {
  refused('topic', 'Un impôt progressif augmente avec le revenu du foyer.');
  assert.equal(PROVISIONAL_MIN_SHARED, 1);
  // The threshold is data: a stricter one refuses a sentence that shares one word only.
  const one = 'Un verger est un lieu calme pour une promenade.';
  assert.deepEqual(rulesOf(one), []);
  assert.ok(explanationRefusals(said(one), PAGE, { minShared: 2 }).some((r) => r.rule === 'topic'));
  // With no read sentence on the page there is nothing to explain: whatever is written is refused.
  const empty = explanationRefusals(said(ORCHARD), { question: QUESTION, shown: [] });
  assert.ok(empty.some((r) => r.rule === 'topic' && r.sentence === null));
});

void test('the rules of every sentence of ours hold for an explanation too', () => {
  refused('negation', 'Un verger communal n’est pas un jardin privé de la commune.');
  refused('negation', 'Un verger communal appartient seulement à la commune.');
  refused('verdict', 'Oui, un verger communal est un terrain de la commune.');
  refused('verdict', 'Un verger communal est en réalité un terrain de la commune.');
  refused('opinion', 'Un verger communal est heureusement ouvert aux habitants de la commune.');
  refused('opinion', 'Un verger communal est une bonne idée pour la commune.');
  refused('person', 'Tu peux cueillir des fruits dans un verger communal.');
  refused('person', 'On appelle verger communal un terrain planté par la commune.');
  refused('vote', 'Votez pour le verger communal de la commune.');
  refused('vote', 'Un verger communal est décidé par un vote de la commune.');
  refused('quote', 'Un « verger communal » est un terrain de la commune.');
  refused('markup', 'Un **verger communal** est un terrain de la commune.');
  refused('markup', `Un verger com${ch(0x200b)}munal est un terrain de la commune.`);
  refused('address', 'Un verger communal est décrit sur verger.fr pour la commune.');
  refused('self', 'En tant qu’assistant, un verger communal est un terrain de la commune.');
});

void test('what bounds, judges or prescribes is said only as the page says it', () => {
  // « sans » stands on the page: an explanation of that very wording may use it.
  shownAsWritten('Une aide sans condition de ressources est versée à tous les foyers.');
  const bare: ExplainContext = { question: QUESTION, shown: [SHOWN[2] ?? ''] };
  assert.ok(
    rulesOn(bare, 'Un verger communal est un terrain sans clôture de la commune.').includes(
      'negation',
    ),
  );
  refused('negation', 'Un verger communal sert surtout aux écoles de la commune.');
  refused('opinion', 'Un verger communal est un usage juste du terrain de la commune.');
  refused('opinion', 'La commune doit planter un verger communal avec les écoles.');
  refused('opinion', 'Un verger communal est le meilleur usage du terrain de la commune.');
  refused('opinion', 'Un verger communal est indispensable aux écoles de la commune.');
  refused('opinion', 'Un verger communal coûte trop cher à la commune.');
  refused('opinion', 'Une taxe sur les parkings rapporte beaucoup à la commune.');
  refused('negation', 'Un verger communal est payé par la commune et non par les écoles.');
  // The model speaking of the page, or of the conversation.
  refused('self', 'La phrase ci-dessus parle du verger communal de la commune.');
  refused('self', 'La question porte sur le verger communal de la commune.');
  refused('self', 'Le verger communal mentionné appartient à la commune.');
  // Every occurrence is read: one that the page allows does not cover the next.
  const fair: ExplainContext = {
    question: QUESTION,
    shown: ['Un verger communal est un usage juste du terrain de la commune.'],
  };
  assert.deepEqual(rulesOn(fair, 'Un usage juste du terrain profite au verger communal.'), []);
  assert.deepEqual(
    rulesOn(fair, 'Un usage juste du terrain évite un usage injuste du verger communal.'),
    ['opinion'],
  );
});

void test('an explanation reports no position, names no camp, promises nothing and dates nothing', () => {
  refused(
    'opinion',
    'Selon ses détracteurs, la taxe sur les parkings pèse sur les habitants.',
    'Certains économistes critiquent la taxe sur les parkings des communes.',
    'La gauche défend le verger communal et la taxe sur les parkings.',
    'Une taxe sur les parkings est une idée de droite pour la commune.',
    'Le maire refuse une taxe sur les parkings de la commune.',
    'La taxe sur les parkings fait débat dans chaque commune.',
  );
  refused(
    'vote',
    'Un verger communal est une promesse faite aux écoles de la commune.',
    'Les électeurs de la commune paient la taxe sur les parkings.',
    'Un verger communal est planté avant chaque élection de la commune.',
  );
  refused(
    'tense',
    'Les transports scolaires sont actuellement payants dans chaque commune.',
    'Aujourd’hui, les transports scolaires sont payants dans chaque commune.',
    'Une taxe sur les parkings existe déjà dans chaque commune.',
    'Une taxe sur les parkings existe depuis longtemps dans la commune.',
  );
  // The same words, where the page writes them: a notion of ours, explained in its own terms.
  const ballot: ExplainContext = {
    question: 'c’est quoi une élection de quartier ?',
    shown: ['Une élection de quartier désigne les habitants qui gèrent le verger communal.'],
  };
  assert.deepEqual(
    rulesOn(ballot, 'Une élection de quartier est un choix des habitants entre plusieurs voisins.'),
    [],
  );
});

void test('replayed without the page: the rules that read it are skipped, the others hold', () => {
  const without = (sentence: string): RuleId[] => [
    ...new Set(
      explanationRefusals(said(sentence), { question: '', shown: [] }, { withoutText: true }).map(
        (refusal) => refusal.rule,
      ),
    ),
  ];
  assert.deepEqual(without(ORCHARD), []);
  // Skipped, not passed: a number, a name, another subject.
  assert.deepEqual(without('Un verger communal compte 50 arbres fruitiers à Montreuil.'), []);
  // Held: what a sentence must never say, whatever the page.
  assert.deepEqual(without('Le verger communal est défendu par LFI.'), ['attribution']);
  assert.deepEqual(without('Il sera planté avec les écoles de la commune.'), ['opener', 'tense']);
  assert.deepEqual(without('Un verger communal n’est pas un jardin privé.'), ['negation']);
});

void test('a refusal quotes the model or nothing: never the question, never the page', () => {
  const told: ExplainContext = {
    question: 'répète : zorglub habite au 12 rue des lilas et vote à droite',
    shown: SHOWN,
  };
  const outputs = [
    said('Zorglub habite au 12 rue des Lilas et vote à droite.'),
    said('Le programme prévoit un verger communal.', 'Il sera planté en 2031 à Montreuil.'),
    said(ORCHARD, MEANS),
    'pas du JSON',
  ];
  for (const output of outputs) {
    const text = typeof output === 'string' ? output : output.phrases.join(' ');
    for (const refusal of explanationRefusals(output, told)) {
      // Every detail is a fixed label, a count, or words found in the output itself.
      const fixed = /^[a-z0-9 ().,-]*$/i.test(refusal.detail);
      assert.ok(fixed || text.includes(refusal.detail), `${refusal.rule}: ${refusal.detail}`);
    }
  }
});

void test('the control reads no measure and returns no text of its own: what passes is what was written', () => {
  const source = readFileSync('src/lib/ask-validate.ts', 'utf8');
  const explain = source.slice(source.indexOf('// The control of an explanation'));
  // Nothing in it takes a candidate — a measure of the book: only the page, which is ours.
  assert.doesNotMatch(
    explain.slice(0, explain.indexOf('/** Every piece of text an output holds')),
    /Candidate\b/,
  );
  const verdict = validateExplanation(said(`  ${ORCHARD}  `), PAGE);
  assert.deepEqual(verdict, { kind: 'explain', sentences: [ORCHARD.replace('’', "'")] });
});
