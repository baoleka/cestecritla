/**
 * The 77-808 sidecar (H-COR-9, D9.3).
 *
 * The rule is short: no statistic is served inside a riposte without an entry here. And the
 * entry's job is not to fill the gap — it is to NAME it. data/stat-cards.json carries only what
 * the book prints: institute 47/48, date 47/48, sponsor 3/48, first-publication medium 0/48.
 * A screen that stayed silent about those gaps would let a reader believe the legal mention is
 * complete, which is the failure this file exists to prevent.
 *
 * The mentions themselves are a choice of PRUDENCE, not an obligation: constat C2 of
 * 11-conformite.md concludes that no article imposes mentions on a re-diffusion. Writing that
 * down avoids inventing an obligation nobody can meet, the first-publication medium being
 * unknown for 48 cards out of 48.
 *
 * Run: npx tsx --test scripts/stat-cards-legal.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

interface LegalEntry {
  pollster: string | null;
  sponsor: string | null;
  dates: string | null;
  sample: string | null;
  first_publication_media: string | null;
  report_url: string | null;
  status: string;
  source_fr: string;
  missing_in_book: string[];
}

const sidecar = JSON.parse(readFileSync('data/stat-cards-legal.json', 'utf8')) as {
  meta: { used_by_riposte: string[] };
  cards: Record<string, LegalEntry>;
};
const riposte = JSON.parse(readFileSync('data/riposte.json', 'utf8')) as {
  entries: { id: string; stat_card_id: string | null }[];
};
const statCards = JSON.parse(readFileSync('data/stat-cards.json', 'utf8')) as {
  cards: {
    id: string;
    legal_77_808: { organisme: string | null; dates: string | null; missing: string[] };
  }[];
};
const byId = new Map(statCards.cards.map((c) => [c.id, c]));

void test('every statistic used by a riposte has a sidecar entry (H-COR-9)', () => {
  const used = riposte.entries
    .filter((e) => e.stat_card_id !== null)
    .map((e) => e.stat_card_id as string);
  const missing = [...new Set(used)].filter((id) => sidecar.cards[id] === undefined);
  assert.deepEqual(
    missing,
    [],
    `statistics served in a riposte with no sidecar:\n${missing.join('\n')}`,
  );
});

void test('the sidecar covers no card that no riposte uses', () => {
  const used = new Set(
    riposte.entries.filter((e) => e.stat_card_id !== null).map((e) => e.stat_card_id as string),
  );
  const extra = Object.keys(sidecar.cards).filter((id) => !used.has(id));
  assert.deepEqual(extra, [], `sidecar entries for unused cards: ${extra.join(', ')}`);
});

void test('every sidecar id exists in the corpus of statistics', () => {
  const unknown = Object.keys(sidecar.cards).filter((id) => !byId.has(id));
  assert.deepEqual(unknown, [], `unknown statistic ids: ${unknown.join(', ')}`);
});

void test('nothing is invented: a filled field is backed by a stated status', () => {
  for (const [id, e] of Object.entries(sidecar.cards)) {
    assert.ok(['VÉRIFIÉ', 'PROBABLE', 'HYPOTHÈSE'].includes(e.status), `${id}: bad status`);
    assert.ok(e.source_fr.length > 40, `${id}: no stated source for its status`);
    // A sponsor or a sample size the book does not print may only appear under PROBABLE or
    // VÉRIFIÉ, never silently.
    if (e.sponsor !== null || e.sample !== null) {
      assert.notEqual(e.status, 'HYPOTHÈSE', `${id}: fills a field the book omits, unsourced`);
    }
    // VÉRIFIÉ demands the report itself, and no report has been opened yet (H-COR-8).
    if (e.status === 'VÉRIFIÉ') {
      assert.ok(e.report_url !== null, `${id}: VÉRIFIÉ without an archived report URL`);
    }
  }
});

void test('the sidecar never contradicts what the book prints', () => {
  for (const [id, e] of Object.entries(sidecar.cards)) {
    const book = byId.get(id);
    assert.ok(book !== undefined);
    if (e.pollster !== null && book.legal_77_808.organisme !== null) {
      assert.equal(e.pollster, book.legal_77_808.organisme, `${id}: pollster contradicts the book`);
    }
    assert.deepEqual(e.missing_in_book, book.legal_77_808.missing, `${id}: stale missing[] list`);
  }
});

void test('the first-publication medium is unknown everywhere, and says so', () => {
  // 0/48 in the book. If one ever gets filled, it must come with a report URL.
  for (const [id, e] of Object.entries(sidecar.cards)) {
    if (e.first_publication_media !== null) {
      assert.ok(e.report_url !== null, `${id}: a medium without an archived report`);
    }
  }
});
