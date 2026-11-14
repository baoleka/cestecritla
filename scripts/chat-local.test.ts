/**
 * What leaves the phone at each gesture of the chat (src/lib/chat-local.ts; PLAN-CHAT §2):
 * identifiers at « Demander », the question after the agreement, and nothing either request
 * was not meant to carry.
 *
 * Run: npx tsx --test scripts/chat-local.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  MAX_CHAT_IDS,
  MAX_GIST_IDS,
  consentVersion,
  parseChatRequest,
  parseGistsRequest,
} from '../src/lib/chat-contract.js';
import {
  SHOWN_MEASURES,
  asksForVote,
  chatRequestOf,
  gistsRequestOf,
  rowsOf,
} from '../src/lib/chat-local.js';
import { loadAskSet } from './ask-set.js';

const CORPUS = '27ee6e713fe25e7e';
const A = 'p1c1-s01-k01';
const B = 'p1c1-s01-m01';
const C = 'p2c1-s01-m04';
const D = 'p3c2-s05-m02';
const CONSENT = consentVersion(['J’accepte que cette IA lise ma question']);
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
  assert.deepEqual(
    rowsOf(hits, (id) => id !== A),
    [B, C, D],
  );
  assert.deepEqual(rowsOf([], all), []);
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

void test('an explanation sends the question as shown, its measures and the agreement — after the agreement', () => {
  const asking = {
    corpus: CORPUS,
    question: '  c’est quoi\nun verger communal ? ',
    shown: [A, B],
    consent: CONSENT,
  };
  const request = chatRequestOf(asking);
  assert.deepEqual(request, {
    corpus: CORPUS,
    ids: [A, B],
    question: 'c’est quoi un verger communal ?',
    consent: CONSENT,
  });
  assert.deepEqual(parseChatRequest(JSON.parse(JSON.stringify(request))), request);
  // A follow-up is a word next to the same question: never a text.
  const simpler = chatRequestOf({ ...asking, follow: 'simpler' });
  assert.equal(simpler?.follow, 'simpler');
  assert.deepEqual(parseChatRequest(JSON.parse(JSON.stringify(simpler))), simpler);
  assert.deepEqual(Object.keys(request).sort(), ['consent', 'corpus', 'ids', 'question']);
  // Never more measures than the contract allows.
  const many = Array.from({ length: MAX_CHAT_IDS + 2 }, (_, i) => `p1c1-s01-m${String(i + 10)}`);
  assert.equal(chatRequestOf({ ...asking, shown: many })?.ids.length, MAX_CHAT_IDS);
});

void test('without the agreement, without a read sentence, without a question: nothing leaves', () => {
  const asking = {
    corpus: CORPUS,
    question: 'c’est quoi un verger communal ?',
    shown: [A],
    consent: CONSENT,
  };
  assert.ok(chatRequestOf(asking) !== null);
  assert.equal(chatRequestOf({ ...asking, consent: null }), null);
  assert.equal(chatRequestOf({ ...asking, shown: [] }), null);
  assert.equal(chatRequestOf({ ...asking, question: ' ' }), null);
  assert.equal(chatRequestOf({ ...asking, question: 'x' }), null);
  assert.equal(chatRequestOf({ ...asking, question: 'x'.repeat(301) }), null);
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
