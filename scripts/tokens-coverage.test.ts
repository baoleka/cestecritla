/**
 * Every custom property the site reads without a fallback is given by both sets of colours: the
 * charter's and the neutral one, the prepared answer to a takedown (D0.17, D14.12). Built from
 * the neutral file alone, the neutral sheet shipped a site without its type scale, spacing, tap
 * targets or motion, and every gate stayed green (review 12, T2): this is the gate that sees it.
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { buildMascotTokensCss, buildTokensCss, neutralTokens } from './build-tokens.js';

type Tokens = Parameters<typeof buildTokensCss>[0];

const read = (path: string): Tokens => JSON.parse(readFileSync(path, 'utf8')) as Tokens;

/** The files of src/ that hold styles: stylesheets, and the components and pages with theirs. */
function styled(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return styled(path);
    return /\.(?:css|astro)$/.test(name) && !/(?:^|\/)(?:tokens|mascot2-tokens)\.css$/.test(path)
      ? [path]
      : [];
  });
}

const defined = (css: string): Set<string> =>
  new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((match) => match[1] ?? ''));

void test('every property read without a fallback is given by the charter and by the neutral set', () => {
  const files = styled('src');
  const sources = files.map((path) => readFileSync(path, 'utf8'));
  // What the site's own styles define for themselves (her beats, a room under the header…).
  const local = defined(sources.join('\n'));
  const read_ = new Map<string, string>();
  for (const [index, text] of sources.entries()) {
    for (const match of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/g)) {
      const name = match[1] ?? '';
      if (!local.has(name) && !read_.has(name)) read_.set(name, files[index] ?? '');
    }
  }
  assert.ok(
    read_.size > 20,
    `only ${String(read_.size)} properties read: the pattern no longer reads them`,
  );
  const main = read('design/tokens.json');
  const sets = {
    charter: main,
    neutral: neutralTokens(main, read('design/tokens.neutral.json')),
  };
  for (const [name, tokens] of Object.entries(sets)) {
    const given = defined(`${buildTokensCss(tokens)}\n${buildMascotTokensCss(tokens)}`);
    const missing = [...read_].filter(([property]) => !given.has(property));
    assert.deepEqual(
      missing.map(([property, file]) => `${property} (${file})`),
      [],
      `the ${name} set gives no value to what the site reads`,
    );
  }
});
