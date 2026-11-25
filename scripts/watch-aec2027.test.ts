/**
 * The daily watch on aec2027.fr (scripts/watch-aec2027.ts): what it reads of a page, without a
 * network. Its requests and their errors run in .github/workflows/watch.yml.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { declaredManifest } from './watch-aec2027.js';

const BASE = 'https://aec2027.fr/';

void test('the manifest a page declares is read in any markup, and resolved against the page (G11)', () => {
  const cases: [string, string | undefined][] = [
    [
      '<link rel="manifest" href="https://aec2027.fr/site.webmanifest">',
      'https://aec2027.fr/site.webmanifest',
    ],
    // href first, a relative address, no quotes, a rel of several words.
    ['<link href="/m.webmanifest" rel="manifest">', 'https://aec2027.fr/m.webmanifest'],
    ['<link rel=manifest href=/manifest.webmanifest>', 'https://aec2027.fr/manifest.webmanifest'],
    ["<link rel='icon manifest' href='app.json'>", 'https://aec2027.fr/app.json'],
    // None declared: a stylesheet is no manifest.
    ['<link rel="stylesheet" href="/s.css">', undefined],
    ['<p>rien</p>', undefined],
  ];
  for (const [body, expected] of cases) {
    assert.equal(declaredManifest(`<head>${body}</head>`, BASE), expected, body);
  }
});
