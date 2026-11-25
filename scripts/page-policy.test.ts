/**
 * The reader of a page's security policy (scripts/page-policy.ts): what our pages carry passes,
 * and each form a review found passing the gates that looked for words is refused (review 17,
 * Q5 and Q8; review 19, V06).
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import { beforePolicy, metaPolicy, policyProblems } from './page-policy.js';

const OURS =
  "default-src 'none';img-src 'self' data:;font-src 'self';connect-src 'self';manifest-src 'self';require-trusted-types-for 'script';trusted-types 'none'; script-src 'self' 'sha256-Zm9vYmFyYmF6cXV4MTIzNDU2Nzg5MGFiY2RlZmdoaWo='; style-src 'self' 'sha256-YmFy';";

void test('the policy our pages carry has no problem', () => {
  assert.deepEqual(policyProblems(OURS), []);
  // Keywords and schemes are read as a browser reads them, whatever their case.
  assert.deepEqual(policyProblems(OURS.replace("default-src 'none'", "DEFAULT-SRC 'NONE'")), []);
});

void test('a source our pages do not need is refused, however it is written', () => {
  const widened = (from: string, to: string): string[] => policyProblems(OURS.replace(from, to));
  for (const [from, to] of [
    ["connect-src 'self'", "connect-src 'self' https:"],
    ["connect-src 'self'", "connect-src 'self' http:"],
    ["connect-src 'self'", "connect-src 'self' wss://relay.example.net"],
    ["connect-src 'self'", "connect-src 'self' cdn.example.com"],
    ["connect-src 'self'", "connect-src 'self' HTTPS://evil.example"],
    ["connect-src 'self'", "connect-src 'self' 203.0.113.5"],
    ["connect-src 'self'", 'connect-src *'],
    ["img-src 'self' data:", "img-src 'self' data: https:"],
    ["img-src 'self' data:", "img-src 'self' data: blob:"],
    ["script-src 'self'", "script-src 'self' https:"],
    ["script-src 'self'", "script-src 'self' data:"],
    ["script-src 'self'", "script-src 'self' 'unsafe-inline'"],
    ["script-src 'self'", "script-src 'self' 'unsafe-eval'"],
    ["script-src 'self'", "script-src 'self' 'unsafe-hashes'"],
    ["script-src 'self'", "script-src 'self' 'strict-dynamic'"],
    ["style-src 'self'", "style-src 'self' 'unsafe-inline'"],
    ["font-src 'self'", "font-src 'self' fonts.gstatic.com"],
  ] as const) {
    assert.notDeepEqual(widened(from, to), [], `${to} passed`);
  }
});

void test('a keyword that is not alone is refused: `default-src`, Trusted Types', () => {
  for (const [from, to] of [
    ["default-src 'none'", "default-src 'none' https:"],
    ["trusted-types 'none'", "trusted-types 'none' default"],
    ["trusted-types 'none'", 'trusted-types default'],
    ["require-trusted-types-for 'script'", 'require-trusted-types-for'],
  ] as const) {
    assert.notDeepEqual(policyProblems(OURS.replace(from, to)), [], `${to} passed`);
  }
});

void test('a directive our pages do not carry, a missing one, one said twice: refused', () => {
  assert.match(policyProblems(`${OURS} report-uri https://collect.example/`).join(), /report-uri/);
  assert.match(policyProblems(`${OURS} frame-src https:`).join(), /frame-src/);
  assert.deepEqual(policyProblems(`${OURS} frame-src 'none'`), []);
  assert.match(policyProblems(OURS.replace("trusted-types 'none';", '')).join(), /missing/);
  assert.match(policyProblems(`connect-src *; ${OURS}`).join(), /twice|connect-src/);
  assert.deepEqual(policyProblems(''), [
    'default-src: missing',
    'script-src: missing',
    'style-src: missing',
    'require-trusted-types-for: missing',
    'trusted-types: missing',
  ]);
});

void test('the policy of a page is read where a browser obeys it: in its head, before anything that closes it', () => {
  const page = (lead: string): string =>
    `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">${lead}<meta http-equiv="content-security-policy" content="${OURS}"><title>x</title></head><body></body></html>`;
  assert.equal(metaPolicy(page('')), OURS);
  assert.equal(metaPolicy('<p>no policy</p>'), '');
  // What a page of ours puts before it: an icon, preloads, an inline script that compares.
  assert.deepEqual(
    beforePolicy(
      page(
        '<link rel="icon" href="/favicon.svg"><link rel="preload" href="/f.woff2" as="font"><script>if (a < b && c > d) {}</script>',
      ),
    ),
    [],
  );
  // An element of the body, or a word of text, closes the head: the policy after it is not obeyed.
  assert.deepEqual(beforePolicy(page('<img srcset="/a.png 1x">')), ['<img']);
  assert.deepEqual(beforePolicy(page('<div>')), ['<div']);
  assert.deepEqual(beforePolicy(page('Bonjour')), ['text: Bonjour']);
  assert.deepEqual(beforePolicy(page('</head><body>')), ['</head', '<body']);
  assert.deepEqual(beforePolicy('<p>no policy</p>'), ['no policy']);
});
