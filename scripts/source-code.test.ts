/**
 * The reader of source code that the gates on the code of the site use (scripts/source-code.ts):
 * comments go, literals stay whole. Run: npx tsx --test scripts/source-code.test.ts
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { codeOf } from './source-code.js';

void test('a comment goes; an address written in a string stays, where a gate can see it (W5)', () => {
  const source = [
    "// a comment: 'https://in.a.comment'",
    "await fetch('https://api.example.org/v1'); // and a comment after it",
    'const url = "http://plain.example.org";',
    '/* a block',
    '   over two lines */ const y = 1;',
  ].join('\n');
  const code = codeOf(source);
  assert.deepEqual(code.match(/https?:\/\/[a-z0-9.-]+/gi), [
    'https://api.example.org',
    'http://plain.example.org',
  ]);
  assert.doesNotMatch(code, /a comment|a block|in\.a\.comment/);
  // The lines keep their numbers.
  assert.equal(code.split('\n').length, source.split('\n').length);
  assert.match(code, /const y = 1;/);
});

void test('a regular expression with quotes or comment markers in it is read as one', () => {
  const source = [
    'const quoted = (s) => [...s.matchAll(/"((?:[^"\\\\]|\\\\.)*)(?:"|$)/g)];',
    'const slashes = /https?:\\/\\//; // a comment',
    'const half = a / b / c; // division, then a comment',
    "return /x*/.test('/* not a comment */');",
  ].join('\n');
  const code = codeOf(source);
  assert.match(code, /matchAll\(\/"/);
  assert.match(code, /const slashes = \/https\?:\\\/\\\/\/;/);
  assert.doesNotMatch(code, /\/\/ a comment|division, then a comment/);
  assert.match(code, /const half = a \/ b \/ c;/);
  assert.match(code, /'\/\* not a comment \*\/'/);
});

void test('a template keeps its text and the code of its placeholders', () => {
  const source = 'const t = `https://${host}/path ${a ? `{nested}` : "x"}`; // gone';
  const code = codeOf(source);
  assert.match(code, /`https:\/\/\$\{host\}\/path/);
  assert.doesNotMatch(code, /gone/);
});
