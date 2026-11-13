/**
 * What the page shows for an answer of the Worker (src/lib/ask-view.ts) — every case of
 * PLAN-JEU §1.4, without a browser.
 *
 * Run: npx tsx --test scripts/ask-view.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { AskResponse } from '../src/lib/ask-contract.js';
import { viewOf, type ViewContext } from '../src/lib/ask-view.js';

const CORPUS = '27ee6e713fe25e7e';
const KNOWN = new Set(['p1c1-s01-k01', 'p1c1-s01-m01', 'p1c1-s02-m03', 'p2c1-s01-m02']);
const context = (overrides: Partial<ViewContext> = {}): ViewContext => ({
  corpus: CORPUS,
  knows: (id) => KNOWN.has(id),
  hasAnswer: (slug) => slug === 'retraites',
  localIds: ['p1c1-s02-m03', 'p9c9-s09-m09', 'p1c1-s01-k01', 'p2c1-s01-m02', 'p1c1-s01-m01'],
  ...overrides,
});
/** What the page found by itself: its own three best measures, minus any it cannot name. */
const OWN = { kind: 'select', ids: ['p1c1-s02-m03', 'p1c1-s01-k01', 'p2c1-s01-m02'], local: true };

void test('an answer the page can use is shown as it came', () => {
  const sentences = [{ text: 'Une phrase.', ids: ['p1c1-s01-k01'] }];
  assert.deepEqual(viewOf({ kind: 'answer', corpus: CORPUS, sentences }, context()), {
    kind: 'answer',
    sentences,
  });
  assert.deepEqual(viewOf({ kind: 'select', corpus: CORPUS, ids: ['p1c1-s01-m01'] }, context()), {
    kind: 'select',
    ids: ['p1c1-s01-m01'],
    local: false,
  });
  assert.deepEqual(viewOf({ kind: 'reviewed', slug: 'retraites' }, context()), {
    kind: 'reviewed',
    slug: 'retraites',
  });
  const plain: AskResponse[] = [{ kind: 'none' }, { kind: 'off_topic' }];
  for (const response of plain) assert.deepEqual(viewOf(response, context()), response);
  const silence: AskResponse = { kind: 'silence', reopen: '2027-04-18T18:00:00.000Z' };
  assert.deepEqual(viewOf(silence, context()), silence);
});

void test('an answer the page cannot use becomes what the page found by itself', () => {
  const sentences = [{ text: 'Une phrase.', ids: ['p1c1-s01-k01'] }];
  const unusable: (AskResponse | null)[] = [
    null,
    { kind: 'local' },
    { kind: 'answer', corpus: 'aaaaaaaaaaaaaaaa', sentences },
    { kind: 'answer', corpus: CORPUS, sentences: [{ text: 'x', ids: ['p9c9-s09-m09'] }] },
    { kind: 'select', corpus: 'aaaaaaaaaaaaaaaa', ids: ['p1c1-s01-k01'] },
    { kind: 'select', corpus: CORPUS, ids: ['p1c1-s01-k01', 'p9c9-s09-m09'] },
    { kind: 'reviewed', slug: 'une-reponse-qui-n-existe-pas' },
  ];
  for (const response of unusable) {
    assert.deepEqual(viewOf(response, context()), OWN, JSON.stringify(response));
  }
});

void test('…and when the page found nothing either, it says so of the words, and stops there', () => {
  assert.deepEqual(viewOf(null, context({ localIds: [] })), { kind: 'none' });
  assert.deepEqual(viewOf({ kind: 'local' }, context({ localIds: ['p9c9-s09-m09'] })), {
    kind: 'none',
  });
});
