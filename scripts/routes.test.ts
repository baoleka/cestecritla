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
import {
  HOLDING_PAGES,
  appRedirects,
  holdingRedirects,
  htmlPages,
  readBuildMode,
} from './build-mode.js';

type Status =
  /** Built now: the prefix must produce pages in dist/. */
  | 'built'
  /** Built, and every page under it answers for an address of the 2025 edition (D15.8). */
  | 'bridge'
  /** Declared, lands in a later lot: must NOT be built yet, and must not collide. */
  | 'planned'
  /** Held so nothing else claims it: one static page, no logic (D14.7). */
  | 'reserved'
  /** Temporarily redirected to the home page by dist/_redirects (D15.8). */
  | 'redirected'
  /** Served by the Worker, never by Static Assets. Not deployed in v1 (D15.14). */
  | 'worker';

interface Route {
  readonly prefix: string;
  readonly status: Status;
  readonly object: string;
  /** A concrete path that must exist in dist/ when status is built, bridge or reserved. */
  readonly sample?: string;
}

export const ROUTES: readonly Route[] = [
  { prefix: '/', status: 'built', object: 'accueil : recherche et sommaire', sample: 'index.html' },
  {
    prefix: '/s/',
    status: 'built',
    object: 'fiche de section (2026) ; pont pour une section de 2025',
    sample: 's/p1c1-s01/index.html',
  },
  {
    prefix: '/m/',
    status: 'bridge',
    object: 'pont : mesure de l’édition 2025',
    sample: 'm/c12-s01-k01/index.html',
  },
  {
    prefix: '/a/',
    status: 'bridge',
    object: 'pont : chiffre « À savoir » de l’édition 2025',
    sample: 'a/c13-s02-a01/index.html',
  },
  { prefix: '/data/', status: 'built', object: 'index et titres de la recherche, versionnés' },
  { prefix: '/c/', status: 'planned', object: 'carte-concept (remplacée par /mot/)' },
  {
    prefix: '/r/',
    status: 'built',
    object: 'réponse à une objection',
    sample: 'r/retraites/index.html',
  },
  {
    prefix: '/mot/',
    status: 'built',
    object: 'mot du programme (carte-concept)',
    sample: 'mot/regle-verte/index.html',
  },
  { prefix: '/q/', status: 'planned', object: '« Laquelle est ici ? »' },
  { prefix: '/defi/', status: 'planned', object: '« Tu savais que c’était dedans ? »' },
  { prefix: '/verifier', status: 'planned', object: 'vérifier une citation' },
  { prefix: '/exactitude', status: 'built', object: 'page exactitude', sample: 'exactitude/index.html' },
  { prefix: '/methodologie', status: 'built', object: 'page méthodologie', sample: 'methodologie/index.html' },
  { prefix: '/confidentialite', status: 'built', object: 'page confidentialité', sample: 'confidentialite/index.html' },
  { prefix: '/a-propos', status: 'built', object: 'page à propos', sample: 'a-propos/index.html' },
  { prefix: '/mentions-legales', status: 'built', object: 'mentions légales', sample: 'mentions-legales/index.html' },
  { prefix: '/licence', status: 'built', object: 'page licence', sample: 'licence/index.html' },
  {
    prefix: '/og/',
    status: 'built',
    object: 'image d’aperçu, une seule, sans texte du programme',
    sample: 'og/cestecritla-v1.png',
  },
  { prefix: '/p/', status: 'redirected', object: 'carte de progression du prototype de septembre' },
  { prefix: '/res/', status: 'redirected', object: '« Mes 3 mesures » du prototype de septembre' },
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
  { prefix: '/api/', status: 'worker', object: 'balise d’événements (v1.1, D15.14)' },
];

const built = existsSync('dist');
/**
 * A holding dist/ (D15.4) is judged as what it is: two pages and a redirect file. Read against
 * the table above it would look like an app with every route missing.
 */
const holding = built && readBuildMode() === 'holding';

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
  if (holding) {
    // The whole point of the holding build: nothing of the app, so nothing of the programme.
    assert.deepEqual(htmlPages('dist'), [...HOLDING_PAGES], 'a holding build is its two pages');
    return;
  }
  const missing = ROUTES.filter(
    (r) => ['built', 'bridge', 'reserved'].includes(r.status) && r.sample !== undefined,
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
    // The holding page stands in for the whole app: it is the page most exposed to the
    // temptation of an apology.
    ...(holding ? ['dist/index.html'] : []),
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

void test('no page links to the address of the 2025 edition, which its publisher retired', () => {
  if (!built) return;
  // Observed 12/11/2026: /programme2025/livre/ redirects to the 2026 book and its sections
  // answer 404. "Va vérifier, c'est écrit là" is the promise; a dead link is what breaks it.
  const offenders = htmlPages('dist')
    .filter((page) => /programme2025/.test(readFileSync(`dist/${page}`, 'utf8')))
    .slice(0, 10);
  assert.deepEqual(
    offenders,
    [],
    `pages still pointing at the 2025 book:\n${offenders.join('\n')}`,
  );
});

void test('the holding build redirects every old prefix and says only what is true (D15.4)', () => {
  if (!holding) return;
  assert.equal(readFileSync('dist/_redirects', 'utf8'), holdingRedirects());

  const html = readFileSync('dist/index.html', 'utf8');
  // The spike it replaces printed 2025 text under these three: none may survive the takeover.
  for (const stale of [
    /Texte du programme/i,
    /CC BY-NC-SA/i,
    /programme2025/i,
    /creativecommons/i,
  ]) {
    assert.doesNotMatch(html, stale, `the holding page still carries ${String(stale)}`);
  }
  assert.match(html, /Site non officiel\./, 'the independence label is never cut');
  assert.match(html, /href="https:\/\/melenchon2027\.fr\/programme\/livre\/"/, 'official link');
  // It announces a fact with its date, and promises none of its own.
  assert.match(html, /réédité le 5 novembre 2026/);
});

void test('the holding page is not indexed (playbook: indexing opens at J-3)', () => {
  if (!holding) return;
  // The spike it replaced sent X-Robots-Tag: noindex everywhere. The first holding deploy made
  // the apex indexable for the first time, which nobody had decided. A meta tag rather than a
  // header rule: public/_headers is shared with the app, whose pages must be indexable at J-3.
  const html = readFileSync('dist/index.html', 'utf8');
  assert.match(html, /<meta name="robots" content="noindex">/);
});

void test('an app build redirects only what it has no page for (D15.8)', () => {
  if (!built || holding) return;
  // A _redirects rule matches a whole prefix and shadows any real page under it: the 2025
  // addresses under /m/, /a/, /s/ and /r/ get generated bridge pages, never a rule.
  assert.equal(readFileSync('dist/_redirects', 'utf8'), appRedirects());
  const redirected = ROUTES.filter((r) => r.status === 'redirected').map((r) => r.prefix);
  for (const prefix of redirected) {
    assert.ok(!existsSync(`dist${prefix}`), `${prefix} is redirected AND built`);
    assert.match(appRedirects(), new RegExp(`^${prefix}\\* / 302$`, 'm'));
  }
});

void test('every bridge answers, is kept out of indexes and prints nothing of either edition', () => {
  if (!built || holding) return;
  const bridges = htmlPages('dist').filter(
    (page) => /^(?:m|a)\//.test(page) || /^s\/c\d/.test(page),
  );
  // 837 propositions + 48 statistics + 89 sections of the 2025 edition.
  assert.equal(bridges.length, 974, `${String(bridges.length)} bridge pages`);
  for (const page of bridges) {
    const html = readFileSync(`dist/${page}`, 'utf8');
    assert.match(html, /<meta name="robots" content="noindex">/, `${page}: indexable`);
    assert.doesNotMatch(html, /class="verbatim"/, `${page}: a bridge quotes nothing`);
    assert.match(html, /Cette adresse renvoyait à l’édition 2025/, page);
  }
});
