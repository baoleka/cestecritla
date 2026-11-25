/**
 * The recall of the facts the explained words state (PLAN-MOTS, lot 13): when a source was read
 * too long ago, one reminder per due day. An illustration is never recalled. Nothing here depends
 * on today's date, so the test never turns red on its own.
 *
 * Run: npx tsx --test scripts/terms-recall.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { SOURCES_PATH, dueFacts, reminderAt, type SourcesFile } from './terms-recall.js';

const FILE: SourcesFile = {
  meta: { recheck_every_days: 90 },
  entries: {
    'seuil-de-pauvrete': {
      example: 'fact',
      sources: [{ url: 'https://www.insee.fr/', consulted_on: '2026-11-19' }],
    },
    asn: {
      plain: 'fact',
      sources: [
        { url: 'https://www.legifrance.gouv.fr/', consulted_on: '2026-12-01' },
        { url: 'https://www.vie-publique.fr/', consulted_on: '2026-11-25' },
      ],
    },
    'scrutin-proportionnel': { example: 'illustrative' },
  },
};

void test('a fact is due ninety days after its oldest source was read, and not a day before', () => {
  assert.deepEqual(dueFacts(FILE, new Date('2027-02-16T23:59:59Z')), []);
  assert.equal(reminderAt(FILE, new Date('2027-02-16T23:59:59Z')), null);
  const due = dueFacts(FILE, new Date('2027-02-17T06:00:00Z'));
  assert.deepEqual(
    due.map((fact) => fact.id),
    ['seuil-de-pauvrete'],
  );
  // The oldest of two sources sets the day.
  assert.deepEqual(
    dueFacts(FILE, new Date('2027-02-23T06:00:00Z')).map((fact) => [fact.id, fact.due_on]),
    [
      ['seuil-de-pauvrete', '2027-02-17'],
      ['asn', '2027-02-23'],
    ],
  );
});

void test('one reminder per due day: its title names the latest day, its text every fact', () => {
  const reminder = reminderAt(FILE, new Date('2027-03-01T06:00:00Z'));
  assert.ok(reminder !== null);
  // The latest due day: a fact of an earlier day still unread does not hide this one (G4).
  assert.match(reminder.title, /^\[mots-2027-02-23\] /);
  const before = reminderAt(FILE, new Date('2027-02-18T06:00:00Z'));
  assert.ok(before !== null);
  assert.match(before.title, /^\[mots-2027-02-17\] /);
  assert.notEqual(before.title.split(']')[0], reminder.title.split(']')[0], 'a new day, a new key');
  assert.match(reminder.body, /`seuil-de-pauvrete` — lue le 2026-11-19/);
  assert.match(reminder.body, /`asn` — lue le 2026-11-25/);
  assert.doesNotMatch(reminder.body, /scrutin-proportionnel/);
  // Never a guard: the text says so.
  assert.match(reminder.body, /n'est pas une garde/);
});

void test('the file of the repository: every fact rests on sources read on a day that has come', () => {
  const file = JSON.parse(readFileSync(SOURCES_PATH, 'utf8')) as SourcesFile;
  assert.equal(file.meta.recheck_every_days, 90);
  const today = new Date().toISOString().slice(0, 10);
  for (const [id, declared] of Object.entries(file.entries)) {
    for (const source of declared.sources ?? []) {
      assert.ok(
        source.consulted_on <= today,
        `${id}: read on ${source.consulted_on}, a day to come`,
      );
    }
  }
});
