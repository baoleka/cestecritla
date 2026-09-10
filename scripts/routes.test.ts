/**
 * The route table, executable (D5.10 amended by D7.9 and D13.4, D14.7).
 *
 * The table lived in four markdown documents that did not agree, and a markdown table cannot
 * catch a collision. `07-mecaniques.md` §7.11 point 9 asks for "une route par objet, aucune
 * collision"; this is what enforces it, and it grows as routes land rather than being rewritten.
 *
 * Also checked here: the three reserved prefixes really answer. `/j/`, `/k/` and `/carte` are
 * held so nothing else can ever claim them (D14.7) — `/j/` is the morning measure kept for
 * v1.1, the other two belonged to "La carte des 89", which got zero votes.
 *
 * Run: npx tsx --test scripts/routes.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

type Status =
  /** Built now: the prefix must produce pages in dist/. */
  | 'built'
  /** Declared, lands in a later lot: must NOT be built yet, and must not collide. */
  | 'planned'
  /** Held so nothing else claims it: one static page, no logic (D14.7). */
  | 'reserved'
  /** Served by the Worker, never by Static Assets. */
  | 'worker';

interface Route {
  readonly prefix: string;
  readonly status: Status;
  readonly object: string;
  /** A concrete path that must exist in dist/ when status is built or reserved. */
  readonly sample?: string;
}

export const ROUTES: readonly Route[] = [
  { prefix: '/', status: 'built', object: 'accueil', sample: 'index.html' },
  { prefix: '/s/', status: 'built', object: 'section', sample: 's/c1-s02/index.html' },
  { prefix: '/m/', status: 'planned', object: 'mesure' },
  { prefix: '/c/', status: 'planned', object: 'carte-concept' },
  { prefix: '/a/', status: 'planned', object: 'carte statistique' },
  { prefix: '/r/', status: 'planned', object: 'riposte (par thème)' },
  { prefix: '/mot/', status: 'planned', object: 'terme du glossaire' },
  { prefix: '/q/', status: 'planned', object: '« Laquelle est ici ? »' },
  { prefix: '/defi/', status: 'planned', object: '« Tu savais que c’était dedans ? »' },
  { prefix: '/verifier', status: 'planned', object: 'vérifier une citation' },
  { prefix: '/exactitude', status: 'planned', object: 'page exactitude' },
  { prefix: '/methodologie', status: 'planned', object: 'page méthodologie' },
  { prefix: '/confidentialite', status: 'planned', object: 'page confidentialité' },
  { prefix: '/a-propos', status: 'planned', object: 'page à propos' },
  { prefix: '/mentions-legales', status: 'planned', object: 'mentions légales' },
  { prefix: '/licence', status: 'planned', object: 'page licence' },
  { prefix: '/og/', status: 'planned', object: 'aperçus versionnés par corpus_version' },
  { prefix: '/j/', status: 'reserved', object: 'mesure du matin (v1.1)', sample: 'j/index.html' },
  {
    prefix: '/k/',
    status: 'reserved',
    object: '« La carte des 89 » (écartée)',
    sample: 'k/index.html',
  },
  {
    prefix: '/carte',
    status: 'reserved',
    object: '« La carte des 89 » (écartée)',
    sample: 'carte/index.html',
  },
  { prefix: '/api/', status: 'worker', object: 'balise d’événements' },
];

const built = existsSync('dist');

void test('every prefix names one object, and no two prefixes collide', () => {
  const seen = new Map<string, string>();
  for (const route of ROUTES) {
    const clash = seen.get(route.prefix);
    assert.equal(
      clash,
      undefined,
      `${route.prefix} claimed by both "${clash ?? ''}" and "${route.object}"`,
    );
    seen.set(route.prefix, route.object);
  }
  // A prefix that swallows another is a collision too: /carte would eat /carte-des-89.
  const prefixes = ROUTES.map((r) => r.prefix).filter((p) => p !== '/');
  for (const a of prefixes) {
    for (const b of prefixes) {
      if (a === b) continue;
      assert.ok(
        !(b.startsWith(a) && a.endsWith('/')),
        `${b} is swallowed by the segment prefix ${a}`,
      );
    }
  }
});

void test('every built or reserved route actually answers', () => {
  if (!built) {
    console.log('  (skipped: no dist/ — run `npm run build` first)');
    return;
  }
  const missing = ROUTES.filter(
    (r) => (r.status === 'built' || r.status === 'reserved') && r.sample !== undefined,
  )
    .filter((r) => !existsSync(`dist/${r.sample ?? ''}`))
    .map((r) => `${r.prefix} -> dist/${r.sample ?? ''}`);
  assert.deepEqual(missing, [], `routes with no output:\n${missing.join('\n')}`);
});

void test('a planned route is not silently half-built', () => {
  if (!built) return;
  // A planned prefix producing pages means a lot landed without its row being updated here.
  const early = ROUTES.filter((r) => r.status === 'planned')
    .map((r) => r.prefix.replace(/^\//, '').replace(/\/$/, ''))
    .filter((p) => p !== '' && existsSync(`dist/${p}`));
  assert.deepEqual(early, [], `built but still marked planned: ${early.join(', ')}`);
});

void test('the Worker prefix is never served as a static asset', () => {
  if (!built) return;
  assert.ok(!existsSync('dist/api'), '/api/* belongs to the Worker (run_worker_first)');
});

void test('reserved pages and the 404 say nothing is broken (voice.md rule 5)', () => {
  if (!built) return;
  // "Le mode dégradé est un mode normal": these words are forbidden in the interface.
  const forbidden = /\b(panne|erreur|indisponible|désolé|malheureusement|temporairement)\b/i;
  const pages = [
    'dist/404.html',
    'dist/j/index.html',
    'dist/k/index.html',
    'dist/carte/index.html',
  ];
  const offenders = pages
    .filter((p) => existsSync(p))
    .filter((p) => forbidden.test(readFileSync(p, 'utf8')))
    .map((p) => p);
  assert.deepEqual(offenders, [], `pages using a word of failure:\n${offenders.join('\n')}`);
});

void test('a reserved page carries no logic — no script of its own (D14.7)', () => {
  if (!built) return;
  for (const page of ['dist/j/index.html', 'dist/k/index.html', 'dist/carte/index.html']) {
    if (!existsSync(page)) continue;
    const html = readFileSync(page, 'utf8');
    const executable = [...html.matchAll(/<script\b([^>]*)>/gi)].filter((m) => {
      const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(m[1] ?? '')?.[1]?.toLowerCase();
      return type === undefined || type === 'text/javascript' || type === 'module';
    });
    assert.equal(executable.length, 0, `${page} ships executable script`);
  }
});
