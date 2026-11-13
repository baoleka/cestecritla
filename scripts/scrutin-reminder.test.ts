/**
 * The reminder of the scrutin build says when the gesture is due, once per window, and nothing
 * the rest of the year.
 *
 * Run: npx tsx --test scripts/scrutin-reminder.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { nearSilenceWindow } from './build-mode.js';
import { REMIND_DAYS, reminderAt } from './scrutin-reminder.js';

const at = (iso: string): Date => new Date(iso);

void test('nothing is said outside the days before a window', () => {
  assert.equal(reminderAt(at('2026-11-13T12:00:00Z')), null);
  // The first window opens on Thursday 15 April 2027 at 22:00 UTC.
  assert.equal(reminderAt(at('2027-04-10T21:59:59Z')), null);
  assert.notEqual(reminderAt(at('2027-04-10T22:00:00Z')), null);
  assert.notEqual(reminderAt(at('2027-04-18T17:59:59Z')), null);
  // Between the rounds the app is back, until the second reminder.
  assert.equal(reminderAt(at('2027-04-18T18:00:00Z')), null);
  assert.equal(reminderAt(at('2027-04-24T21:59:59Z')), null);
  assert.notEqual(reminderAt(at('2027-04-24T22:00:00Z')), null);
  assert.equal(reminderAt(at('2027-05-02T18:00:00Z')), null);
  assert.equal(REMIND_DAYS, 5);
});

void test('one title per window, and the hour after which only what closes is deployed', () => {
  const first = reminderAt(at('2027-04-12T05:30:00Z'));
  const later = reminderAt(at('2027-04-17T05:30:00Z'));
  const second = reminderAt(at('2027-04-27T05:30:00Z'));
  assert.ok(first !== null && later !== null && second !== null);
  // The workflow looks for the title before opening an issue: the same all along one window.
  assert.equal(first.title, later.title);
  assert.notEqual(first.title, second.title);
  assert.match(first.title, /^\[L49 2027-04-16\] /);
  assert.match(second.title, /^\[L49 2027-04-30\] /);
  // Hours are said as the editor reads them: in Paris.
  assert.match(first.body, /s'ouvre le vendredi 16 avril 2027 à 00:00/);
  assert.match(first.body, /se ferme le dimanche 18 avril 2027 à 20:00/);
  assert.match(first.body, /avant l'ouverture/);
  assert.match(first.body, /npm run build:scrutin && npm run deploy/);
  // The scrutin build is never refused; what the day before closes is every other build.
  assert.match(first.body, /refusée par `npm run deploy` dès le jeudi 15 avril 2027 à 00:00/);
  // …and that hour is the one from which the deploy rule refuses anything else.
  assert.equal(nearSilenceWindow(at('2027-04-14T21:59:59Z')), false);
  assert.equal(nearSilenceWindow(at('2027-04-14T22:00:00Z')), true);
});

void test('the scheduled workflow opens the reminder once, and the commands it names exist', () => {
  const workflow = readFileSync('.github/workflows/watch.yml', 'utf8');
  assert.match(workflow, /npx tsx scripts\/scrutin-reminder\.ts/);
  assert.match(workflow, /steps\.scrutin\.outputs\.code == '3'/);
  assert.match(workflow, /gh issue list[^\n]*--state all/, 'a closed reminder is not opened again');
  const scripts = (
    JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> }
  ).scripts;
  for (const name of ['build:scrutin', 'build', 'deploy']) assert.ok(name in scripts, name);
});
