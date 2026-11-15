/**
 * What the sheet shows for a turn of the thread (src/lib/chat-view.ts) — every state of
 * PLAN-CHAT §1, without a browser. Invented sentences; identifiers shaped like those of the book.
 *
 * Run: npx tsx --test scripts/chat-view.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type { ChatResponse, GistsResponse } from '../src/lib/chat-contract.js';
import {
  explainable,
  newTurn,
  nextStep,
  settled,
  shownIds,
  viewOf,
  withExplanation,
  withGists,
  type PageState,
  type Turn,
} from '../src/lib/chat-view.js';

const CORPUS = '27ee6e713fe25e7e';
const A = 'p1c1-s01-k01';
const B = 'p1c1-s01-m01';
const C = 'p2c1-s01-m04';
const NOTHING = { objection: null, cards: [] };
const QUESTION = 'c’est quoi un verger communal ?';

const page = (over: Partial<PageState> = {}): PageState => ({
  corpus: CORPUS,
  ai: 'offered',
  closed: false,
  knows: (id) => [A, B, C].includes(id),
  ...over,
});
const gists = (ai: boolean, ...ids: string[]): GistsResponse => ({
  kind: 'gists',
  corpus: CORPUS,
  gists: ids.map((id) => ({ id, text: `Phrase relue de ${id}.` })),
  ai,
});
/** A turn whose search found three measures. */
const searched = (over: Partial<Turn> = {}): Turn => ({
  ...newTurn(QUESTION, NOTHING, null),
  rows: [A, B, C],
  ...over,
});

void test('a turn starts by searching, and asks nothing of anyone', () => {
  const turn = newTurn(QUESTION, NOTHING, null);
  assert.deepEqual(viewOf(turn, page(), true), {
    plain: null,
    measures: { kind: 'searching' },
    wording: { question: QUESTION, sentences: null },
    ai: null,
  });
  assert.equal(nextStep(turn, page()), null);
});

void test('the words of the question are read at once, those of the sentences once they are all there', () => {
  // Searching, then waiting for the sentences: the question alone can be read.
  const waiting = { question: QUESTION, sentences: null };
  assert.deepEqual(viewOf(newTurn(QUESTION, NOTHING, null), page(), true).wording, waiting);
  assert.deepEqual(viewOf(searched(), page(), true).wording, waiting);
  assert.deepEqual(viewOf({ ...searched(), gists: 'pending' }, page(), true).wording, waiting);
  // Answered: the question, and the sentences shown — not one the page did not ask about.
  const read = withGists(searched({ rows: [A, B] }), gists(false, A, C));
  assert.deepEqual(viewOf(read, page(), true).wording, {
    question: QUESTION,
    sentences: [`Phrase relue de ${A}.`],
  });
  // No answer the page can use, or nothing found: no sentence — and that is known.
  assert.deepEqual(viewOf(withGists(searched(), null), page(), true).wording, {
    question: QUESTION,
    sentences: [],
  });
  assert.deepEqual(viewOf(searched({ rows: [] }), page(), true).wording, {
    question: QUESTION,
    sentences: [],
  });
  // One sentence of ours and nothing else: a freeze, a request for a vote — no word explained.
  assert.equal(viewOf(newTurn(QUESTION, NOTHING, ''), page(), true).wording, null);
  assert.equal(viewOf(newTurn('pour qui voter ?', NOTHING, null), page(), true).wording, null);
  const frozen = withGists(searched(), { kind: 'silence', reopen: '2027-04-11T18:00:00Z' });
  assert.equal(viewOf(frozen, page(), true).wording, null);
});

void test('nothing found: one sentence, nothing sent — never « the programme does not speak of it »', () => {
  const turn = searched({ rows: [] });
  assert.deepEqual(viewOf(turn, page(), true).measures, { kind: 'none' });
  assert.equal(nextStep(turn, page()), null);
  // A measure the page cannot name is as good as not found.
  const unknown = searched({ rows: ['p9c9-s09-m09'] });
  assert.deepEqual(viewOf(unknown, page(), true).measures, { kind: 'none' });
  assert.equal(nextStep(unknown, page()), null);
});

void test('the links are there before the sentences: rows first, then what the editor read', () => {
  const turn = searched();
  assert.equal(nextStep(turn, page()), 'gists');
  assert.deepEqual(viewOf(turn, page(), true).measures, {
    kind: 'rows',
    rows: [A, B, C].map((id) => ({ id, gist: null })),
    reading: true,
  });
  // Asked: still reading, and not asked twice.
  const pending = { ...turn, gists: 'pending' as const };
  assert.equal(nextStep(pending, page()), null);
  assert.equal(viewOf(pending, page(), true).measures.kind, 'rows');
  // Answered: a measure without a read sentence keeps its link alone — a verdict, not a gap.
  const read = withGists(pending, gists(false, A, C));
  assert.deepEqual(viewOf(read, page(), true).measures, {
    kind: 'rows',
    rows: [
      { id: A, gist: `Phrase relue de ${A}.` },
      { id: B, gist: null },
      { id: C, gist: `Phrase relue de ${C}.` },
    ],
    reading: false,
  });
});

void test('an answer the page cannot use is dropped without a word: the rows keep their links', () => {
  const other: GistsResponse = {
    kind: 'gists',
    corpus: 'ffffffffffffffff',
    gists: [{ id: A, text: 'Phrase d’un autre livre.' }],
    ai: true,
  };
  const stray: GistsResponse = gists(true, 'p3c1-s07-m01');
  for (const response of [null, { kind: 'local' } as const, other, stray]) {
    const turn = withGists(searched(), response);
    const view = viewOf(turn, page({ ai: 'on' }), true);
    assert.deepEqual(view.measures, {
      kind: 'rows',
      rows: [A, B, C].map((id) => ({ id, gist: null })),
      reading: false,
    });
    // No read sentence on the screen: nothing to explain, so the question does not leave.
    assert.equal(view.ai, null);
    assert.deepEqual(shownIds(turn, page()), []);
    assert.equal(nextStep(turn, page({ ai: 'on' })), null);
  }
});

void test('the AI is offered in place of the explanation — once, on the last turn, and only when the model may answer', () => {
  const turn = withGists(searched(), gists(true, A, B));
  assert.ok(explainable(turn, page()));
  assert.deepEqual(viewOf(turn, page(), true).ai, {
    offer: true,
    explanations: [],
    waiting: false,
    follow: [],
  });
  // Not asked for: nothing is sent, however long the page waits.
  assert.equal(nextStep(turn, page()), null);
  // An earlier turn does not ask again.
  assert.equal(viewOf(turn, page(), false).ai, null);
  // The Worker says the model does not answer now: nothing to offer, nothing to send.
  const closed = withGists(searched(), gists(false, A, B));
  assert.equal(viewOf(closed, page(), true).ai, null);
  assert.equal(nextStep(closed, page({ ai: 'on' })), null);
});

void test('refused: the first two blocks, and the question never leaves', () => {
  const turn = withGists(searched(), gists(true, A, B));
  const stopped = page({ ai: 'off' });
  assert.equal(viewOf(turn, stopped, true).ai, null);
  assert.equal(nextStep(turn, stopped), null);
  assert.equal(viewOf(turn, stopped, true).measures.kind, 'rows');
});

void test('the AI is on: an explanation is asked once, for the measures whose sentence is on the screen', () => {
  const on = page({ ai: 'on' });
  const turn = withGists(searched(), gists(true, A, C));
  assert.equal(nextStep(turn, on), 'explain');
  assert.deepEqual(shownIds(turn, on), [A, C]);
  const waiting = { ...turn, awaited: null };
  assert.equal(nextStep(waiting, on), null);
  assert.deepEqual(viewOf(waiting, on, true).ai, {
    offer: false,
    explanations: [],
    waiting: true,
    follow: [],
  });
  const answered = withExplanation(
    waiting,
    null,
    { kind: 'explain', corpus: CORPUS, sentences: ['Un verger est un terrain planté.'] },
    on,
  );
  assert.equal(answered.closed, false);
  assert.equal(nextStep(answered.turn, on), null);
  assert.deepEqual(viewOf(answered.turn, on, true).ai, {
    offer: false,
    explanations: [{ follow: null, sentences: ['Un verger est un terrain planté.'] }],
    waiting: false,
    follow: ['simpler', 'example'],
  });
});

void test('a follow-up is asked once; what it brings is added, and what was explained stays', () => {
  const on = page({ ai: 'on' });
  const first = { follow: null, sentences: ['Un verger est un terrain planté.'] };
  let turn: Turn = { ...withGists(searched(), gists(true, A)), explanations: [first] };
  turn = { ...turn, awaited: 'simpler' };
  assert.deepEqual(viewOf(turn, on, true).ai?.follow, []);
  turn = withExplanation(
    turn,
    'simpler',
    { kind: 'explain', corpus: CORPUS, sentences: ['Un verger, ce sont des arbres à fruits.'] },
    on,
  ).turn;
  assert.deepEqual(viewOf(turn, on, true).ai?.follow, ['example']);
  assert.equal(viewOf(turn, on, true).ai?.explanations.length, 2);
  // A follow-up that brings nothing is not offered again, and nothing says it failed.
  turn = withExplanation({ ...turn, awaited: 'example' }, 'example', null, on).turn;
  const view = viewOf(turn, on, true);
  assert.deepEqual(view.ai?.follow, []);
  assert.equal(view.ai.explanations.length, 2);
  assert.equal(view.ai.waiting, false);
  // An earlier turn keeps its explanations, and its follow-ups while the page is open.
  assert.equal(viewOf(turn, on, false).ai?.explanations.length, 2);
});

void test('no explanation this time: the turn is whole without it, and it is not asked again', () => {
  const on = page({ ai: 'on' });
  const asked = { ...withGists(searched(), gists(true, A)), awaited: null };
  const nothing: (ChatResponse | null)[] = [
    null,
    { kind: 'quiet', why: 'none' },
    { kind: 'explain', corpus: 'ffffffffffffffff', sentences: ['Phrase d’un autre livre.'] },
  ];
  for (const response of nothing) {
    const { turn, closed } = withExplanation(asked, null, response, on);
    assert.equal(closed, false);
    assert.equal(viewOf(turn, on, true).ai, null);
    assert.equal(nextStep(turn, on), null);
    assert.equal(viewOf(turn, on, true).measures.kind, 'rows');
  }
});

void test('the allowance spent: the page stops sending questions, and says nothing of it', () => {
  const on = page({ ai: 'on' });
  const asked = { ...withGists(searched(), gists(true, A)), awaited: null };
  for (const response of [
    { kind: 'quiet', why: 'spent' } as const,
    { kind: 'silence', reopen: '2027-04-11T18:00:00Z' } as const,
  ]) {
    const { turn, closed } = withExplanation(asked, null, response, on);
    assert.equal(closed, true);
    const shut = page({ ai: 'on', closed });
    assert.equal(viewOf(turn, shut, true).ai, null);
    // The next question still gets its read sentences — and is not sent to the model.
    const next = withGists(searched(), gists(true, A, B));
    assert.equal(nextStep(next, shut), null);
    assert.equal(viewOf(next, shut, true).ai, null);
    assert.equal(viewOf(next, shut, true).measures.kind, 'rows');
  }
  // What was explained before stays in the thread; its follow-ups are gone.
  const explained: Turn = {
    ...withGists(searched(), gists(true, A)),
    explanations: [{ follow: null, sentences: ['Un verger est un terrain planté.'] }],
  };
  assert.deepEqual(viewOf(explained, page({ ai: 'on', closed: true }), false).ai, {
    offer: false,
    explanations: explained.explanations,
    waiting: false,
    follow: [],
  });
});

void test('an insult or a judgement asked about a person: one sentence of ours, nothing sent', () => {
  for (const question of ['Mélenchon est-il antisémite ?', 't’es nul connard']) {
    const turn: Turn = { ...searched(), question };
    assert.deepEqual(viewOf(turn, page({ ai: 'on' }), true), {
      plain: null,
      measures: { kind: 'off_topic' },
      wording: null,
      ai: null,
    });
    assert.equal(nextStep(turn, page({ ai: 'on' })), null, question);
    assert.ok(settled(turn, page()), question);
  }
});

void test('a question about the site: the site answers for itself — no measure, nothing sent', () => {
  const turn: Turn = { ...searched(), question: 'Qui a écrit ces réponses ?' };
  assert.deepEqual(viewOf(turn, page({ ai: 'on' }), true), {
    plain: null,
    measures: { kind: 'about' },
    wording: null,
    ai: null,
  });
  // The search found measures — any word in common does — and none of them is asked for.
  assert.equal(nextStep(turn, page({ ai: 'on' })), null);
  assert.ok(settled(turn, page()));
  assert.deepEqual(shownIds(turn, page()), []);
  // A card the question would have named is not shown either: this is not about the book.
  const card = { ...turn, recognised: { objection: null, cards: ['regle-verte'] } };
  assert.equal(viewOf(card, page(), true).plain, null);
  // During electoral silence the sheet says one thing, to every question.
  const frozen = { ...turn, silence: '2027-04-11T18:00:00Z' };
  assert.equal(viewOf(frozen, page(), true).measures.kind, 'silence');
});

void test('« En clair »: what a person wrote comes first — and an objection never leaves the phone', () => {
  const card = { objection: null, cards: ['regle-verte'] };
  const withCard = withGists({ ...searched(), recognised: card }, gists(true, A));
  const view = viewOf(withCard, page({ ai: 'on' }), true);
  assert.deepEqual(view.plain, card);
  // A card does not close the model: its words are among those it may explain.
  assert.equal(nextStep(withCard, page({ ai: 'on' })), 'explain');

  const objection = { objection: 'retraites', cards: [] };
  const answered = withGists({ ...searched(), recognised: objection }, gists(true, A));
  assert.deepEqual(viewOf(answered, page(), true).plain, objection);
  // The read sentences are shown; no explanation is asked, the AI on or not.
  assert.equal(viewOf(answered, page(), true).measures.kind, 'rows');
  assert.equal(viewOf(answered, page(), true).ai, null);
  assert.equal(nextStep(answered, page({ ai: 'on' })), null);
  assert.ok(!explainable(answered, page({ ai: 'on' })));
});

void test('electoral silence: one sentence, nothing sent — said by the phone or by the Worker', () => {
  const frozen = { ...searched(), silence: '2027-04-11T18:00:00Z' };
  assert.deepEqual(viewOf(frozen, page({ ai: 'on' }), true), {
    plain: null,
    measures: { kind: 'silence', reopen: '2027-04-11T18:00:00Z' },
    wording: null,
    ai: null,
  });
  assert.equal(nextStep(frozen, page({ ai: 'on' })), null);
  // No hour the page can announce: the sentence says the pause, not the hour.
  assert.deepEqual(viewOf({ ...searched(), silence: '' }, page(), true).measures, {
    kind: 'silence',
    reopen: null,
  });
  // The Worker knows the hour better than a phone whose clock is wrong.
  const told = withGists(searched(), { kind: 'silence', reopen: '2027-04-11T18:00:00Z' });
  assert.deepEqual(viewOf(told, page({ ai: 'on' }), true).measures, {
    kind: 'silence',
    reopen: '2027-04-11T18:00:00Z',
  });
  assert.equal(nextStep(told, page({ ai: 'on' })), null);
  assert.deepEqual(shownIds(told, page()), []);
});

void test('whom to vote for: « Ici, on ne parle que du programme. » — no measure, nothing sent', () => {
  const turn: Turn = { ...searched(), question: 'Franchement je dois voter pour qui ?' };
  assert.deepEqual(viewOf(turn, page({ ai: 'on' }), true), {
    plain: null,
    measures: { kind: 'off_topic' },
    wording: null,
    ai: null,
  });
  assert.equal(nextStep(turn, page({ ai: 'on' })), null);
  const read = withGists(turn, gists(true, A));
  assert.equal(nextStep(read, page({ ai: 'on' })), null);
  assert.deepEqual(shownIds(read, page()), []);
});

void test('a turn is settled when it waits for nothing and owes nothing', () => {
  const on = page({ ai: 'on' });
  assert.equal(settled(newTurn(QUESTION, NOTHING, null), on), false);
  assert.equal(settled(searched(), on), false);
  assert.equal(settled({ ...searched(), gists: 'pending' }, on), false);
  const read = withGists(searched(), gists(true, A));
  // Agreed: the explanation is due, then awaited, then there — or not, and that is whole too.
  assert.equal(settled(read, on), false);
  assert.equal(settled({ ...read, awaited: null }, on), false);
  assert.equal(settled(withExplanation({ ...read, awaited: null }, null, null, on).turn, on), true);
  // Not asked for: the turn waits for nobody but the visitor.
  assert.equal(settled(read, page()), true);
  assert.equal(settled(searched({ rows: [] }), on), true);
  assert.equal(settled({ ...searched(), silence: '' }, on), true);
  assert.equal(settled(withGists(searched(), null), on), true);
});

void test('a turn lives in memory: nothing here reads or writes a storage, an address or a cookie', () => {
  for (const file of ['src/lib/chat-view.ts', 'src/lib/chat-local.ts', 'src/lib/notions.ts']) {
    const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(
      code,
      /localStorage|sessionStorage|indexedDB|document\.cookie|location\.|history\.|fetch\(/,
      file,
    );
  }
});
