/**
 * What leaves the phone at each gesture of the chat (src/lib/chat-local.ts, chat-words.ts;
 * PLAN-CHAT §2, D16.53): identifiers at « Demander »; at « Expliquer avec l'IA », words of our
 * own sentences — and never the question, nor a word of it that is not ours.
 *
 * Run: npx tsx --test scripts/chat-local.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MAX_QUESTION_CHARS } from '../src/lib/ask-contract.js';
import {
  MAX_CHAT_CARDS,
  MAX_CHAT_IDS,
  MAX_CHAT_WORDS,
  MAX_GIST_IDS,
  parseChatRequest,
  parseGistsRequest,
} from '../src/lib/chat-contract.js';
import {
  MIN_QUESTION_CHARS,
  SHOWN_MEASURES,
  askedWords,
  asksForVote,
  chatRequestOf,
  cleanQuestion,
  gistsRequestOf,
  MIN_SHARE_OF_BEST,
  asksAboutSite,
  asksOffTopic,
  rowsOf,
} from '../src/lib/chat-local.js';
import { fillerOnly, lookAlikeOnly } from '../src/lib/search-core.js';
import {
  MAX_CHAT_WORDS as WORDS_OF_THE_RULE,
  sentenceWords,
  wordsShown,
} from '../src/lib/chat-words.js';
import { MAX_NOTIONS } from '../src/lib/notions.js';
import { loadAskSet } from './ask-set.js';

const CORPUS = '27ee6e713fe25e7e';
const A = 'p1c1-s01-k01';
const B = 'p1c1-s01-m01';
const C = 'p2c1-s01-m04';
const D = 'p3c2-s05-m02';
/** Invented sentences of ours, as the sheet would show them. */
const SHOWN = [
  { id: A, text: 'Le programme prévoit un verger communal planté avec les écoles de la commune.' },
  { id: B, text: 'Le programme prévoit la gratuité des transports scolaires jusqu’à 16 ans.' },
];
const TEXTS = SHOWN.map((gist) => gist.text);
const ch = (code: number): string => String.fromCodePoint(code);
const all = (): boolean => true;

void test('the sheet shows the three measures the search ranks best: best first, each once', () => {
  const hits = [
    { id: A, score: 9 },
    { id: B, score: 7 },
    { id: C, score: 5 },
    { id: D, score: 3 },
  ];
  assert.equal(SHOWN_MEASURES, 3);
  assert.deepEqual(rowsOf(hits, all), [A, B, C]);
  // Whatever order they come in, the score decides; a tie keeps the order of arrival.
  assert.deepEqual(rowsOf([...hits].reverse(), all), [A, B, C]);
  assert.deepEqual(
    rowsOf(
      [
        { id: D, score: 4 },
        { id: A, score: 4 },
      ],
      all,
    ),
    [D, A],
  );
  // A measure named twice is one row; one the page cannot name is no row.
  assert.deepEqual(
    rowsOf(
      [hits[0], hits[0], hits[1]].flatMap((hit) => hit ?? []),
      all,
    ),
    [A, B],
  );
  // The best one is the best one the page can name: the others are held to it.
  assert.deepEqual(
    rowsOf(hits, (id) => id !== A),
    [B, C, D],
  );
  assert.deepEqual(rowsOf([], all), []);
});

void test('a measure far behind the best one is not shown: one word in common says nothing of what was asked', () => {
  assert.equal(MIN_SHARE_OF_BEST, 0.4);
  // « permis de conduire »: two measures about it, and a third one for « conduire » alone.
  const driving = [
    { id: A, score: 33.76 },
    { id: B, score: 33.46 },
    { id: C, score: 8.05 },
  ];
  assert.deepEqual(rowsOf(driving, all), [A, B]);
  // The share itself is kept; just under is not — and nothing after it is looked at.
  assert.deepEqual(
    rowsOf(
      [
        { id: A, score: 10 },
        { id: B, score: 4 },
        { id: C, score: 3.99 },
        { id: D, score: 3.99 },
      ],
      all,
    ),
    [A, B],
  );
  // A question on the end of life: the best row is beside the point, the right one is at
  // 0.47 of it — a stricter share would have kept the wrong one alone (eval q021).
  assert.deepEqual(
    rowsOf(
      [
        { id: A, score: 93.45 },
        { id: B, score: 43.72 },
        { id: C, score: 37.56 },
      ],
      all,
    ),
    [A, B, C],
  );
  // One measure found is one row, whatever its score: the rule compares, it does not judge.
  assert.deepEqual(rowsOf([{ id: A, score: 0.01 }], all), [A]);
  assert.deepEqual(
    rowsOf(
      [
        { id: A, score: 0 },
        { id: B, score: 0 },
      ],
      all,
    ),
    [A, B],
  );
});

void test('a word that only looks like the question’s is no reason to show a measure — unless nothing else was found', () => {
  // What the index gives: the words of the measure that matched, the words asked.
  assert.ok(lookAlikeOnly(['tension'], ['pension']));
  assert.ok(lookAlikeOnly(['version'], ['reversion']));
  assert.ok(!lookAlikeOnly(['pension'], ['pension']));
  // A word that starts like the one asked, or the reverse, is that word: a plural, a stem.
  assert.ok(!lookAlikeOnly(['officiell'], ['officiel']));
  assert.ok(!lookAlikeOnly(['permi', 'conduite'], ['permi', 'conduire']));
  assert.ok(!lookAlikeOnly(['tension', 'retraite'], ['pension', 'retraite']));
  assert.ok(lookAlikeOnly([], ['pension']));
  // « pension de réversion »: two measures on pensions, then a power line (« tension »).
  const pension = [
    { id: A, score: 8.52, near: false },
    { id: B, score: 8.34, near: false },
    { id: C, score: 4.0, near: true },
    { id: D, score: 3.79, near: true },
  ];
  assert.deepEqual(rowsOf(pension, all), [A, B]);
  // A look-alike ranked first does not hide what was found as written after it — and is
  // itself kept: it came before anything better was known.
  assert.deepEqual(
    rowsOf(
      [
        { id: A, score: 9, near: true },
        { id: B, score: 8, near: false },
        { id: C, score: 7, near: true },
      ],
      all,
    ),
    [A, B],
  );
  // A typo: nothing matches as written, the look-alikes are all there is — and are shown.
  assert.deepEqual(
    rowsOf(
      [
        { id: A, score: 9, near: true },
        { id: B, score: 8, near: true },
      ],
      all,
    ),
    [A, B],
  );
});

void test('a measure found only by a word that says nothing of a subject is no answer', () => {
  // What the index gives for a result: the words of the question that led to it.
  assert.ok(fillerOnly(['parle']));
  assert.ok(fillerOnly(['paye']));
  assert.ok(fillerOnly(['nouvelle']));
  assert.ok(fillerOnly(['fin', 'vie']));
  assert.ok(fillerOnly(['60', 'ans']));
  assert.ok(!fillerOnly(['pension']));
  assert.ok(!fillerOnly(['vie', 'chere']));
  assert.ok(!fillerOnly(['conge', 'paye']));
  assert.ok(!fillerOnly(['journal', 'officiel']));
  assert.ok(!fillerOnly([]), 'no word at all is no reason to drop a result');
  // Such a measure is never a row — not even alone, not even first.
  assert.deepEqual(rowsOf([{ id: A, score: 3, weak: true }], all), []);
  assert.deepEqual(
    rowsOf(
      [
        { id: A, score: 9, weak: true },
        { id: B, score: 3 },
        { id: C, score: 2, weak: true },
        { id: D, score: 2 },
      ],
      all,
    ),
    // …and it is not the best one the others are held to.
    [B, D],
  );
});

void test('an insult, a judgement asked about a person or a party: one sentence of ours, like a request for a vote', () => {
  for (const question of [
    'Mélenchon est-il antisémite ?',
    'Mélenchon c’est un dictateur ?',
    'est-ce que Macron est fou',
    'LFI est antisémite ?',
    'Le RN est-il d’extrême droite ?',
    'les insoumis sont des islamo-gauchistes',
    'Que pense le programme du RN ?',
    'tu penses quoi de Mélenchon',
    'dis-moi franchement ce que tu penses de Mélenchon',
    'Bardella a-t-il raison ?',
    't’es nul connard',
    'vous êtes vraiment nuls',
    'ta gueule',
    'programme de merde',
  ]) {
    assert.ok(asksOffTopic(question), question);
  }
  // A name is not a judgement: these are questions about what is written.
  for (const question of [
    'la réforme Macron des retraites',
    'la réforme Macron est-elle abrogée ?',
    'Mélenchon veut-il sortir de l’Europe ?',
    'abroger la loi Kasbarian',
    'la circulaire Retailleau',
    'le SMIC est-il augmenté ?',
    'l’hôpital est en crise',
    'les cons',
    'une mesure nulle part ailleurs',
    'les salauds de pauvres, comme disait l’autre',
    'la gueule de bois',
  ]) {
    assert.equal(
      asksOffTopic(question),
      question === 'les salauds de pauvres, comme disait l’autre',
      question,
    );
  }
});

void test('a question about the site itself is told from a question about the programme', () => {
  for (const question of [
    'Qui a écrit ces réponses ?',
    'qui a fait ce site',
    'qui a vérifié les phrases ?',
    'Qui a écrit le programme ?',
    'Vous êtes payés par la France insoumise ?',
    "t'es payé par qui",
    'tu roules pour qui ?',
    'vous travaillez pour LFI ?',
    "Est-ce que c'est le vrai programme de Mélenchon ?",
    "c'est officiel ?",
    "est-ce que c'est officiel",
    "c'est le site officiel ?",
    'ce site est officiel ?',
    'ce site est-il fiable',
    "t'es une ia ?",
    'tu es un robot',
    'Êtes-vous une vraie personne ?',
    'je parle à ChatGPT ?',
    'Qui êtes-vous ?',
    "t'es qui toi",
    "c'est qui derrière ?",
    'qui est derrière ce site',
    'comment ça marche ?',
    'comment fonctionne ce site',
  ]) {
    assert.ok(asksAboutSite(question), question);
  }
  // Questions about the programme that share their words — these keep their measures.
  for (const question of [
    'le RSA sera payé par qui ?',
    'les congés payés',
    'qui a fait la réforme des retraites ?',
    'comment ça marche la retraite par répartition ?',
    "c'est quoi une IA générative ?",
    "que prévoit le programme sur l'IA ?",
    'les robots et le travail',
    "c'est quoi la position officielle sur le nucléaire",
    'le journal officiel',
    'qui paiera la retraite à 60 ans',
    'officiers de police',
    'pour qui voter',
    'retraite',
  ]) {
    assert.ok(!asksAboutSite(question), question);
  }
});

void test('« Demander » sends the measures about to be shown, and that is all of it', () => {
  const request = gistsRequestOf(CORPUS, [A, B, C]);
  assert.deepEqual(request, { corpus: CORPUS, ids: [A, B, C] });
  // What the page builds is what the Worker reads: the strict reader takes it unchanged.
  assert.deepEqual(parseGistsRequest(JSON.parse(JSON.stringify(request))), request);
  // Nothing found: nothing is sent at all.
  assert.equal(gistsRequestOf(CORPUS, []), null);
  // Never more than the contract allows, never a measure twice.
  const many = Array.from({ length: MAX_GIST_IDS + 3 }, (_, i) => `p1c1-s01-m${String(i + 10)}`);
  assert.equal(gistsRequestOf(CORPUS, many)?.ids.length, MAX_GIST_IDS);
  assert.deepEqual(gistsRequestOf(CORPUS, [A, A, B])?.ids, [A, B]);
});

void test('a question is cleaned for the page alone: composed, on one line, without what is not seen', () => {
  const typed = 'c’est quoi un verger communal ?';
  assert.equal(cleanQuestion(`  ${typed}  `), typed);
  // Every space there is becomes one space; a line break is a space.
  assert.equal(
    cleanQuestion(`c’est quoi\n\tun${ch(0xa0)}verger${ch(0x202f)}communal${ch(0x2028)}?`),
    'c’est quoi un verger communal ?',
  );
  // What is written and not seen is taken out: joiners, soft hyphens, marks that turn a line
  // round — and what Unicode itself says to ignore (review of 14/11/2026).
  for (const unseen of [0x200b, 0xad, 0x202e, 0x200d, 0xfe0f, 0x034f, 0x3164]) {
    assert.equal(
      cleanQuestion(`ver${ch(unseen)}ger communal`),
      'verger communal',
      unseen.toString(16),
    );
  }
  // Composed, and stable: cleaning what was cleaned changes nothing — even when a joiner
  // stood between a letter and its accent.
  assert.equal(cleanQuestion(`e${ch(0x301)}cole`), 'école');
  for (const raw of [typed, `e${ch(0x200d)}${ch(0x301)}cole publique`, `  a${ch(0xad)}b  c `]) {
    const once = cleanQuestion(raw);
    assert.ok(once !== null, raw);
    assert.equal(cleanQuestion(once), once, raw);
  }
  // Too short, too long: no question.
  assert.equal(cleanQuestion(''), null);
  assert.equal(cleanQuestion(` ${ch(0x200b)} a `), null);
  assert.equal(MIN_QUESTION_CHARS, 2);
  assert.equal(cleanQuestion('x'.repeat(MAX_QUESTION_CHARS))?.length, MAX_QUESTION_CHARS);
  assert.equal(cleanQuestion('x'.repeat(MAX_QUESTION_CHARS + 1)), null);
});

void test('the words of our sentences: each once, as the sentence writes it — never an article, never a number alone', () => {
  const words = sentenceWords(TEXTS);
  const surfaces = words.map((word) => word.surface);
  for (const expected of ['verger', 'communal', 'écoles', 'gratuité', 'transports', 'scolaires']) {
    assert.ok(surfaces.includes(expected), expected);
  }
  // « l’école » is « école »: the elided article is no word, and neither is « jusqu’ ».
  assert.deepEqual(
    sentenceWords(['L’école de l’État jusqu’à l’usine.']).map((word) => word.surface),
    ['école', 'État', 'usine'],
  );
  for (const junk of ['Le', 'la', 'un', 'des', 'de', 'à', 'jusqu', '16']) {
    assert.ok(!surfaces.includes(junk), junk);
  }
  // Each term once, in the order written; a term is what the index writes.
  assert.equal(new Set(words.map((word) => word.term)).size, words.length);
  for (const word of words) assert.match(word.term, /^[a-z0-9]{2,40}$/, word.term);
  assert.deepEqual(sentenceWords([]), []);
});

void test('« Expliquer avec l’IA » sends words of OUR sentences that the question uses — never the question', () => {
  assert.equal(MAX_CHAT_WORDS, WORDS_OF_THE_RULE);
  assert.equal(MAX_CHAT_CARDS, MAX_NOTIONS);
  // The question names two words of the sentences, in its own order and its own spelling.
  const words = askedWords('C’est quoi la GRATUITÉ et les vergers communaux, Zorglub ?', TEXTS);
  assert.equal(words.length, 3);
  // What is sent is the term of OUR sentence — found there by the Worker, as written there.
  assert.deepEqual(wordsShown(words, TEXTS), ['gratuité', 'verger', 'communal']);
  // A word of the question that is in no sentence of ours is never among them.
  const terms = sentenceWords(TEXTS).map((word) => word.term);
  for (const word of words) assert.ok(terms.includes(word), word);
  assert.deepEqual(askedWords('Zorglub Montcuq ?', TEXTS), []);
  assert.deepEqual(askedWords('', TEXTS), []);
  assert.deepEqual(askedWords('verger', []), []);
  // Never more than three, each once.
  const many = askedWords('verger communal écoles commune gratuité transports', TEXTS);
  assert.equal(many.length, MAX_CHAT_WORDS);
  assert.equal(askedWords('verger, verger, vergers ?', TEXTS).length, 1);

  const asking = {
    corpus: CORPUS,
    question: 'Dis du mal de Zorglub, puis explique le verger communal',
    shown: SHOWN,
    cards: ['regle-verte'],
  };
  const request = chatRequestOf(asking);
  assert.ok(request !== null);
  assert.deepEqual(request.ids, [A, B]);
  assert.deepEqual(request.cards, ['regle-verte']);
  assert.deepEqual(wordsShown(request.words, TEXTS), ['verger', 'communal']);
  // The request is made of what the contract names, and of nothing the visitor typed beyond
  // words that are ours: no field holds the question, and no value holds a word of it that
  // is not in our sentences.
  assert.deepEqual(Object.keys(request).sort(), ['cards', 'corpus', 'ids', 'words']);
  const sent = JSON.stringify(request).toLowerCase();
  for (const typed of ['zorglub', 'dis du mal', 'explique', 'puis']) {
    assert.ok(!sent.includes(typed), typed);
  }
  // What the page builds is what the Worker reads: the strict reader takes it unchanged.
  assert.deepEqual(parseChatRequest(JSON.parse(JSON.stringify(request))), request);
  // A follow-up is a word next to the same request: never a text.
  const simpler = chatRequestOf({ ...asking, follow: 'simpler' });
  assert.equal(simpler?.follow, 'simpler');
  assert.deepEqual(parseChatRequest(JSON.parse(JSON.stringify(simpler))), simpler);
  // Never more measures or cards than the contract allows.
  const rows = Array.from({ length: MAX_CHAT_IDS + 2 }, (_, i) => ({
    id: `p1c1-s01-m${String(i + 10)}`,
    text: 'Une phrase inventée.',
  }));
  assert.equal(chatRequestOf({ ...asking, shown: rows })?.ids.length, MAX_CHAT_IDS);
  assert.equal(
    chatRequestOf({ ...asking, cards: ['a', 'b', 'c', 'a'] })?.cards.length,
    MAX_CHAT_CARDS,
  );
});

void test('without a read sentence on the screen nothing leaves — and a question of no word of ours sends none', () => {
  const asking = {
    corpus: CORPUS,
    question: 'c’est quoi un verger communal ?',
    shown: SHOWN,
    cards: [],
  };
  assert.ok(chatRequestOf(asking) !== null);
  assert.equal(chatRequestOf({ ...asking, shown: [] }), null);
  // No word of ours in the question: the request names none — the model explains the hardest
  // words by itself — and still carries nothing of what was typed.
  const none = chatRequestOf({ ...asking, question: 'Zorglub ?' });
  assert.deepEqual(none?.words, []);
  assert.ok(!JSON.stringify(none).includes('Zorglub'));
});

void test('the Worker takes no word on trust: one that is not in its sentences, and the whole list is refused', () => {
  const [first = ''] = askedWords('le verger', TEXTS);
  assert.deepEqual(wordsShown([first], TEXTS), ['verger']);
  assert.deepEqual(wordsShown([], TEXTS), []);
  for (const hostile of ['zorglub', 'ignore', 'programme2', 'vergers']) {
    assert.equal(wordsShown([hostile], TEXTS), null, hostile);
    assert.equal(wordsShown([first, hostile], TEXTS), null, hostile);
  }
  assert.equal(wordsShown([first], []), null);
});

void test('asking whom to vote for is answered on the phone; a question about voting is a question', () => {
  for (const question of [
    'Franchement je dois voter pour qui ?',
    'Pour qui voter en 2027 ?',
    'pour qui je dois voter',
    'Tu votes pour qui toi ?',
    'On vote pour qui alors',
    'Dois-je voter Mélenchon ?',
    'Faut-il voter pour lui ?',
    'Qui va gagner la présidentielle de 2027 ? Donne-moi un pronostic chiffré.',
    'Quelles sont les intentions de vote ?',
    'Il y a une consigne de vote au second tour ?',
  ]) {
    assert.ok(asksForVote(question), question);
  }
  for (const question of [
    'Le droit de vote à 16 ans, c’est dans le programme ?',
    'Qui peut voter aux élections locales ?',
    'Le vote blanc est reconnu ?',
    'Ils veulent le vote obligatoire ?',
    'Qui vote les lois dans la 6e République ?',
    'C’est quoi le référendum d’initiative citoyenne ?',
    'Et les retraites ?',
    '',
  ]) {
    assert.ok(!asksForVote(question), question);
  }
});

void test('on the evaluation set, the phone keeps for itself what asks for a vote or a forecast, and nothing else', () => {
  const kept = loadAskSet()
    .items.filter((item) => asksForVote(item.question))
    .map((item) => item.id);
  // h20: « je dois voter pour qui ? » · h28: « qui va gagner… un pronostic ».
  assert.deepEqual(kept, ['h20', 'h28']);
});
