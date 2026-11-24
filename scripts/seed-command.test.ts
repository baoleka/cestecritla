/**
 * The command line of scripts/seed-ask-2026.ts, read strictly (review 14, E1, E3, E6, E7): no
 * slip of the keyboard falls back to the deposit of the book's text, which needs its own mode.
 * Nothing here reads private/ or reaches Cloudflare: the refusals come before anything is read.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { readCommand } from './seed-ask-2026.js';

const D = '2026-11-25';

void test('a slip of the keyboard is refused before anything is read — never the text deposit', () => {
  const refused: [readonly string[], RegExp][] = [
    // The emergency stop, mistyped: each of these used to upload the whole text of the book.
    [['--remote', 'db', '--switch=stopped', '--what', 'gists', '--accord', D], /not a flag/],
    [['--remote', 'db', '--withdraw', '--accord', D], /not a flag/],
    [['--remote', 'db', '--gist', '--accord', D], /not a flag/],
    [['--remote', 'db', '--accord', D], /name what to send/],
    [['--remote', 'db', '--switch', '--what', 'gists'], /--switch takes a value/],
    // Two modes on one line, or a check that is not honoured: never half of it, silently.
    [
      ['--remote', 'db', '--gists', '--accord', D, '--switch', 'open', '--what', 'gists'],
      /one mode per command/,
    ],
    [['--remote', 'db', '--switch', 'open', '--what', 'gists', '--check'], /--check goes with/],
    [['--remote', 'db', '--gists', '--dry-run'], /not a flag/],
    [['--gists', '--check', '--remote', 'db'], /--check sends nothing/],
    // `--remote=<db>`, a flag at the end without its value, a word alone, a flag twice.
    [['--gists', '--remote=db', '--accord', D], /not a flag/],
    [['--gists', '--accord', D, '--remote'], /--remote takes a value/],
    [['--text', 'preview'], /stands alone/],
    [['--text', '--remote', 'a', '--remote', 'b'], /written twice/],
    [['--withdraw-text', '--accord', D], /acts on the base: --remote/],
    [['--fewer'], /--fewer goes with --gists/],
  ];
  for (const [args, reason] of refused) {
    const read = readCommand(args);
    if (typeof read !== 'string')
      assert.fail(`${args.join(' ')} was read as mode ${String(read.mode)}`);
    assert.match(read, reason, args.join(' '));
  }
});

void test('the documented commands read as they are written', () => {
  const modes: [readonly string[], string | null][] = [
    [[], null],
    [['--text', '--check'], '--text'],
    [['--text', '--remote', 'db', '--accord', D], '--text'],
    [['--gists', '--check'], '--gists'],
    [['--gists', '--remote', 'db', '--accord', D, '--fewer'], '--gists'],
    // CLAUDE.md's stop, as written there: `--env preview` and `--accord` included.
    [
      [
        '--remote',
        'db',
        '--switch',
        'stopped',
        '--what',
        'gists',
        '--env',
        'preview',
        '--accord',
        D,
      ],
      '--switch',
    ],
    [['--remote', 'db', '--withdraw-text', '--accord', D], '--withdraw-text'],
  ];
  for (const [args, mode] of modes) {
    const read = readCommand(args);
    if (typeof read === 'string') assert.fail(`${args.join(' ')}: ${read}`);
    assert.equal(read.mode, mode, args.join(' '));
  }
});

void test('typed without its extension, the tool runs — and refuses what it cannot read', () => {
  const tsx = join(resolve('.'), 'node_modules', 'tsx', 'dist', 'cli.mjs');
  for (const entry of ['scripts/seed-ask-2026', 'scripts/seed-ask-2026.ts']) {
    const run = spawnSync(process.execPath, [tsx, entry, '--switch'], { encoding: 'utf8' });
    assert.equal(run.status, 2, `${entry}: it ran nothing`);
    assert.match(run.stderr, /--switch takes a value/, entry);
  }
});
