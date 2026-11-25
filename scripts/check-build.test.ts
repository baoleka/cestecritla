/**
 * Ban list and weight gates on the BUILT output (§9 BAN LIST, P2/P3/P8/P9, A2, D12.3).
 *
 * The ban list was checked once, by hand, on the mockups (05-direction-artistique.md §1.1) and
 * never versioned as a gate: nothing failed if a Google Fonts request, a third-party script,
 * Montserrat or #0098B6 reappeared in a build. These read dist/, because what matters is what
 * ships.
 *
 * Run: npx tsx --test scripts/check-build.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { buildSync, transformSync } from 'esbuild';
import { canonicalHash } from '../src/lib/fingerprint.js';
import { SHIPPED } from './build-fonts.js';
import { beforePolicy, metaPolicy, policyProblems } from './page-policy.js';
import {
  cssUrls,
  decodeEntities,
  fetchedBy,
  resolvedFrom,
  stylesOf,
  tagsOf,
  tokensOf,
} from './page-tags.js';

const walk = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
};

const files = walk('dist');
/** Every text file a build ships: what a gate on its words must read (review 17, Q15). */
const TEXT_FILE =
  /\.(?:html|css|js|mjs|json|txt|xml|svg|webmanifest|map|md)$|(?:^|\/)_(?:headers|redirects)$/;
const textFiles = files.filter((f) => TEXT_FILE.test(f));
const skip = files.length === 0;
const NO_BUILD = 'no dist/ — run `npm run build` first';
const read = (f: string): string => readFileSync(f, 'utf8');

/**
 * The builds the gates read when they are there: what ships, and the three test builds — the
 * scrutin build included, which goes out before each window of 2027 (review 17, Q31).
 */
const ROOTS = ['dist', 'dist-ask', 'dist-gists', 'dist-scrutin'] as const;
/** A build is there when its home page is: a folder left empty or half-written is no build. */
const built = (root: string): boolean => existsSync(join(root, 'index.html'));
const pagesOf = (root: string): string[] => walk(root).filter((f) => f.endsWith('.html'));
/** A build answers questions when its home page carries the configuration of the sheet. */
const asks = (root: string): boolean =>
  built(root) && read(join(root, 'index.html')).includes('id="chat-config"');

/** In a media query, any length but a relative one (A2): `px`, and the other absolute units. */
const ABSOLUTE = /(?<![\w.-])\d*\.?\d+(?:px|pt|pc|cm|mm|in|q)\b/i;

/**
 * What every page of every build asks of a browser and holds in its tags — read once, tag by
 * tag, as a browser reads them (scripts/page-tags.ts). Patterns over the text let through a
 * value in single quotes, `//host`, srcset, CSS `url()`, a « > » inside a value, `name =` and
 * `formaction`, and saw only one spelling of a media query (review 17, Q6, Q12, Q14, Q22, Q27).
 */
interface PageFindings {
  away: string[];
  open: string[];
  named: string[];
  submitting: string[];
  zoom: string[];
  media: string[];
}
let pageFindings: PageFindings | null = null;
function findings(): PageFindings {
  if (pageFindings !== null) return pageFindings;
  const found: PageFindings = {
    away: [],
    open: [],
    named: [],
    submitting: [],
    zoom: [],
    media: [],
  };
  const leaves = (page: string, value: string): boolean => {
    const url = resolvedFrom(page, value);
    return url !== null && url.origin !== 'https://page.invalid';
  };
  for (const root of ROOTS) {
    for (const file of pagesOf(root)) {
      const page = relative(root, file);
      const where = `${root}/${page}`;
      const html = read(file);
      const tags = tagsOf(html);
      const styles = stylesOf(html);
      for (const value of [...tags.flatMap(fetchedBy), ...styles.flatMap(cssUrls)]) {
        if (leaves(page, value)) found.away.push(`${where}: ${value}`);
      }
      for (const css of styles) {
        for (const rule of css.matchAll(/@(?:media|container|import)\b([^{;]*)/gi)) {
          if (ABSOLUTE.test(rule[1] ?? ''))
            found.media.push(`${where}: @…${(rule[1] ?? '').trim()}`);
        }
      }
      for (const script of html.matchAll(
        /<script(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/gi,
      )) {
        for (const query of (script[1] ?? '').matchAll(
          /matchMedia\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g,
        )) {
          if (ABSOLUTE.test(query[2] ?? ''))
            found.media.push(`${where}: matchMedia(${query[2] ?? ''})`);
        }
      }
      for (const tag of tags) {
        const href = tag.attrs.get('href');
        if ((tag.name === 'a' || tag.name === 'area') && href !== undefined && leaves(page, href)) {
          if (!tokensOf(tag.attrs.get('rel')).includes('noreferrer')) {
            found.open.push(`${where}: ${href}`);
          }
        }
        if (['input', 'textarea', 'select', 'button'].includes(tag.name) && tag.attrs.has('name')) {
          found.named.push(`${where}: <${tag.name} name="${tag.attrs.get('name') ?? ''}">`);
        }
        for (const attr of ['formaction', 'formtarget', 'formenctype']) {
          if (tag.attrs.has(attr)) found.submitting.push(`${where}: <${tag.name} ${attr}>`);
        }
        const formmethod = tag.attrs.get('formmethod');
        if (formmethod !== undefined && formmethod.toLowerCase() !== 'dialog') {
          found.submitting.push(`${where}: <${tag.name} formmethod="${formmethod}">`);
        }
        if (tag.name === 'form') {
          const method = tag.attrs.get('method');
          if (tag.attrs.has('action')) found.submitting.push(`${where}: <form action>`);
          if (method !== undefined && method.toLowerCase() !== 'dialog') {
            found.submitting.push(`${where}: <form method="${method}">`);
          }
        }
        const media = tag.attrs.get('media');
        if (media !== undefined && ABSOLUTE.test(media))
          found.media.push(`${where}: media="${media}"`);
        if (tag.name === 'meta' && tag.attrs.get('name')?.toLowerCase() === 'viewport') {
          const settings = new Map(
            (tag.attrs.get('content') ?? '').split(/[,;]/).map((part) => {
              const [key = '', value = ''] = part.split('=');
              return [key.trim().toLowerCase(), value.trim().toLowerCase()] as const;
            }),
          );
          const max = settings.get('maximum-scale');
          if (max !== undefined && !(Number(max) >= 5))
            found.zoom.push(`${where}: maximum-scale=${max}`);
          const scalable = settings.get('user-scalable');
          if (
            scalable !== undefined &&
            (scalable === 'no' || (scalable !== 'yes' && Math.abs(Number(scalable)) < 1))
          ) {
            found.zoom.push(`${where}: user-scalable=${scalable}`);
          }
        }
      }
    }
  }
  pageFindings = found;
  return found;
}

/** The rules of a `_headers` file: a path, then what it sets and what it detaches. */
interface HeaderRule {
  path: string;
  set: [string, string][];
  unset: string[];
}
function headerRules(text: string): HeaderRule[] {
  const rules: HeaderRule[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      rules.push({ path: line.trim(), set: [], unset: [] });
      continue;
    }
    const rule = rules.at(-1);
    if (rule === undefined) continue;
    const detached = /^\s*!\s*(\S+)/.exec(line);
    if (detached !== null) {
      rule.unset.push((detached[1] ?? '').toLowerCase());
      continue;
    }
    const at = line.indexOf(':');
    if (at > 0) rule.set.push([line.slice(0, at).trim().toLowerCase(), line.slice(at + 1).trim()]);
  }
  return rules;
}

interface Ban {
  readonly what: string;
  readonly pattern: RegExp;
  readonly why: string;
}

const BANS: readonly Ban[] = [
  { what: 'Montserrat', pattern: /\bMontserrat\b/i, why: 'typographie bannie (§9)' },
  { what: 'Roboto Slab', pattern: /Roboto\s*Slab/i, why: 'typographie bannie' },
  { what: 'Union Gothic', pattern: /Union\s*Gothic/i, why: 'typographie bannie' },
  { what: 'Stack Sans', pattern: /Stack\s*Sans/i, why: 'typographie bannie' },
  {
    what: 'Config',
    // After `font`, `font-family` or a token of fonts, inside the declaration — never across a
    // rule, where « chat-config » is a name of ours (review 17, Q22, Q23).
    pattern: /(?:^|[\s;{])(?:font|font-family|--font-family-[\w-]+)\s*:[^;}]*\bConfig\b/,
    why: 'police commerciale de la charte',
  },
  { what: '#0098B6', pattern: /#0098B6/i, why: 'couleur bannie' },
  { what: '#0e8a9c', pattern: /#0E8A9C/i, why: 'couleur bannie' },
  { what: '#C9462C', pattern: /#C9462C/i, why: 'ocre banni' },
  { what: '#8B24D9', pattern: /#8B24D9/i, why: 'couleur bannie' },
  {
    what: 'Google Fonts',
    pattern: /fonts\.(googleapis|gstatic)\.com/i,
    why: 'témoin mesuré : LCP 2 445 ms',
  },
  {
    what: 'WebGL / Three.js',
    pattern: /\bthree(?:\.min)?\.js\b|["'`](?:experimental-)?webgl2?["'`]/i,
    why: 'budget perf et a11y',
  },
  { what: 'symbole Φ', pattern: /[\u03A6\u03C6\u03D5\u0278]/u, why: 'symbole de la charte LFI' },
  {
    what: 'logos de la campagne',
    pattern: /LogoTortue\.svg|LOGO-M27\.svg/i,
    why: 'aucun logo LFI ni M27 (identity-decision §5.2)',
  },
  {
    what: 'cookie banner',
    pattern: /bandeau\s+cookies|cookie[- ]consent|tarteaucitron/i,
    why: 'aucun traceur à consentir',
  },
  {
    what: 'text-size-adjust:none',
    pattern: /(?:^|[^\w-])(?:-(?:webkit|moz|ms)-)?text-size-adjust\s*:\s*none/i,
    why: 'A2',
  },
];

void test('no banned font, colour, script or pattern reaches the build', (t) => {
  if (skip) {
    t.skip(NO_BUILD);
    return;
  }
  const offenders: string[] = [];
  // Every text file: the icon, the plan of the site, robots.txt and the rules of the host
  // included. Of a page, only its JSON-LD is set aside — the official titles and addresses —
  // and our own islands and descriptions are read (review 17, Q15).
  for (const file of textFiles) {
    const body = file.endsWith('.html')
      ? read(file).replace(/<script type="application\/ld\+json"[^>]*>[\s\S]*?<\/script>/g, ' ')
      : read(file);
    for (const ban of BANS) {
      if (ban.pattern.test(body)) offenders.push(`${file}: ${ban.what} — ${ban.why}`);
    }
  }
  assert.deepEqual(offenders, [], `ban list hits:\n${offenders.join('\n')}`);
});

void test('every entry of the charter’s ban list is held — by a pattern of this file, by the contrast gate, or said why not (review 17, Q22)', () => {
  const list = (JSON.parse(read('design/tokens.json')) as { meta: { ban_list: string[] } }).meta
    .ban_list;
  const HELD: Readonly<Record<string, string>> = {
    Montserrat: 'Montserrat',
    'Roboto Slab': 'Roboto Slab',
    'Union Gothic': 'Union Gothic',
    'Stack Sans': 'Stack Sans',
    'Config (commerciale)': 'Config',
    '#0098B6': '#0098B6',
    '#0e8a9c': '#0e8a9c',
    '#C9462C (ocre)': '#C9462C',
    '#8B24D9': '#8B24D9',
    'symbole Φ': 'symbole Φ',
    'LogoTortue.svg': 'logos de la campagne',
    'LOGO-M27.svg': 'logos de la campagne',
    'WebGL / Three.js': 'WebGL / Three.js',
    'logo LFI':
      'unheld: a drawing has no name a pattern would catch — the icon and the share image are held by their bytes (the frozen files, below)',
    'italique synthétique en Gowun Batang':
      'unheld: a browser draws it from a rule and a face; no italic face ships (the fonts, below)',
    'Violet #4C0297 sur Charbon (texte ou ombre 3D : 1,33:1)': 'contrast',
    'vives en texte courant sur Crème': 'contrast',
    'Vif rose en texte ou titre sur Crème (2,98:1)': 'contrast',
    'Vif violet sur Charbon (2,19:1)': 'contrast',
    'texte rendu sous 12 px':
      'unheld: a size is what the rules and the reader’s settings make of it — scripts/a11y.ts reads the pages at 200 % of text',
  };
  const fold = (entry: string): string => entry.replace(/[\u00a0\u202f]/g, ' ');
  const held = new Map(Object.entries(HELD).map(([entry, holder]) => [fold(entry), holder]));
  const patterns = new Set(BANS.map((ban) => ban.what));
  for (const entry of list) {
    const holder = held.get(fold(entry));
    assert.ok(holder !== undefined, `« ${entry} »: held by nothing, and nothing says why`);
    assert.ok(
      holder === 'contrast' || holder.startsWith('unheld: ') || patterns.has(holder),
      `« ${entry} »: « ${holder} » is no pattern of this file`,
    );
  }
});

void test('the zoom stays possible: no page caps it or forbids it, however it is written (A2)', () => {
  // As axe reads a viewport: a cap under 5, `user-scalable` set to no or to a number under 1.
  // The accessibility gate rates these « moderate » and lets them through: this is the only one.
  assert.deepEqual(findings().zoom, [], findings().zoom.slice(0, 5).join('\n'));
});

void test('no request leaves the origin (P9, D0.22: zero third party)', () => {
  // Every address a tag or a stylesheet makes the browser fetch, connect to or send to — on
  // every page of every build. A link's own href is the visitor's to follow; what is fetched is
  // what costs a request and tells another site who reads which page (review 17, Q6). Matters
  // most where the page's policy is not yet in force: in its head, before the policy, and for
  // the hints no policy governs (preconnect, dns-prefetch).
  const away = findings().away;
  assert.deepEqual(away, [], `third-party subresources:\n${away.slice(0, 10).join('\n')}`);
});

void test('the host adds nothing that reaches another origin: no hint, no report, no address (review 17, Q7)', () => {
  // public/_headers is attached by the host to every response: a `Link: <https://…>;
  // rel=preconnect` there is acted on by every engine before the page's own policy exists, and
  // a report endpoint learns which page of the programme a visitor reads (art. 9).
  for (const file of ['public/_headers', 'dist/_headers'].filter((f) => existsSync(f))) {
    for (const rule of headerRules(read(file))) {
      for (const [name, value] of rule.set) {
        assert.ok(
          !['link', 'report-to', 'reporting-endpoints', 'nel'].includes(name),
          `${file}, ${rule.path}: ${name}`,
        );
        assert.doesNotMatch(
          value,
          /\bhttps?:\/\/|(?:^|[\s<'"(])\/\/[\w.-]/i,
          `${file}, ${rule.path}: ${name}`,
        );
        if (name === 'content-security-policy') {
          assert.doesNotMatch(value, /\breport-(?:uri|to)\b/i, `${file}, ${rule.path}: a report`);
        }
      }
    }
  }
});

void test('a page opens no origin but ours — none, on any page, whether the site answers questions or not', () => {
  // The security policy of each page is the list of who may be asked for anything (P9, D7.6).
  // Checked on what ships (dist/, in the mode data/2026/ask.json says) and on the test build of
  // the ask screen when it is there (dist-ask/, built as if the mode were open).
  // Until D16.23 the home page of a site that answers questions opened one: Turnstile's. There
  // is no bot check any more, and so no exception: the policy of every page names nobody.
  // Read directive by directive, as a browser reads it (scripts/page-policy.ts): looking for
  // words in it let through `https:`, a host without its scheme, `default-src 'none' https:`
  // and `trusted-types 'none' default` — each acted on by the three engines (review 17, Q5).
  // And where a browser obeys it: in the head, before anything that would close it (Q8).
  for (const root of ROOTS) {
    for (const file of pagesOf(root)) {
      const html = read(file);
      const policy = metaPolicy(html);
      assert.notEqual(policy, '', `${file}: no Content-Security-Policy`);
      assert.deepEqual(policyProblems(policy), [], file);
      assert.deepEqual(beforePolicy(html), [], `${file}: the policy is not in force there`);
    }
  }
});

void test('no script we ship does what the policy of the pages forbids: a string handed to the parser or to a loader (D16.80)', () => {
  // `require-trusted-types-for 'script'` makes these calls throw in the browsers that know
  // it — and a page that throws there is a page that breaks only for them. So what ships is
  // read: the sinks the directive guards appear in none of our scripts, inline ones included.
  // Every spelling the three engines refuse: a compound assignment, a property named by a
  // string, an object key, the newer parsers, `execCommand`, any `eval` or `Function` — the CSP
  // refuses those everywhere, not only where Trusted Types are known — and the loaders in any
  // case (review 17, Q24). In every build, inline scripts included, in any case of the tag.
  const SINKS = new RegExp(
    [
      String.raw`(?:\.|\[\s*["'\`])(?:innerHTML|outerHTML|srcdoc)(?:["'\`]\s*\])?\s*(?:\+|\|\||&&|\?\?)?=(?!=)`,
      String.raw`\b(?:innerHTML|outerHTML|srcdoc)\s*:`,
      String.raw`\binsertAdjacentHTML\(`,
      String.raw`\bdocument\.write(?:ln)?\(`,
      String.raw`\bcreateContextualFragment\(`,
      String.raw`\bparseFromString\(`,
      String.raw`\b(?:set|parse)HTMLUnsafe\(`,
      String.raw`\bexecCommand\(\s*["'\`]insertHTML`,
      String.raw`(?<![\w$])eval\b`,
      String.raw`(?<![\w$])Function\s*\(`,
      String.raw`\bimportScripts\(`,
      String.raw`\bserviceWorker\.register\(`,
      String.raw`\bnew\s+(?:Shared)?Worker\(`,
      String.raw`\bset(?:Timeout|Interval)\(\s*["'\`]`,
    ].join('|'),
  );
  const LOADERS =
    /\bcreateElement(?:NS)?\(\s*(?:[^,)]*,\s*)?["'`]script["'`]|\bsetAttribute(?:NS)?\(\s*(?:[^,)]*,\s*)?["'`](?:on\w+|srcdoc)["'`]/i;
  for (const root of ROOTS) {
    for (const file of walk(root)) {
      if (file.endsWith('.js') || file.endsWith('.mjs')) {
        assert.doesNotMatch(read(file), SINKS, `${file}: a sink Trusted Types refuses`);
        assert.doesNotMatch(read(file), LOADERS, `${file}: a loader Trusted Types refuses`);
      } else if (file.endsWith('.html')) {
        const inline = [
          ...read(file).matchAll(
            /<script(?![^>]*type="application\/(?:ld\+)?json")[^>]*>([\s\S]*?)<\/script>/gi,
          ),
        ];
        for (const script of inline) {
          assert.doesNotMatch(script[1] ?? '', SINKS, `${file}: an inline script with a sink`);
          assert.doesNotMatch(script[1] ?? '', LOADERS, `${file}: an inline script with a loader`);
        }
      }
    }
  }
});

void test('no page says a person re-read our own texts unless their files say one did (D16.79)', () => {
  // Our answers and our cards each carry their state (data/2026/riposte.json,
  // glossary.json): « accepted » is published on the editor's word, without a line-by-line
  // re-reading. While one of them is not « reviewed », no page names a reader — the site said
  // « relu par Baoleka » until 15/11/2026, on dates written by default (14-risques.md, R44).
  // Page by page: the day the editor re-reads ONE text, its own page truthfully names him
  // (src/components/Authorship.astro), while every other page still names no reader. The rule
  // used to be global, and would have refused that first re-reading (review of 23/11/2026, P8).
  interface Stated {
    review: { status: string };
  }
  const answers = (
    JSON.parse(read('data/2026/riposte.json')) as { entries: (Stated & { slug: string })[] }
  ).entries.map((entry) => ({ page: `r/${entry.slug}/index.html`, status: entry.review.status }));
  const cardPages = (
    JSON.parse(read('data/2026/glossary.json')) as { entries: (Stated & { id: string })[] }
  ).entries.map((entry) => ({ page: `mot/${entry.id}/index.html`, status: entry.review.status }));
  const entries = [...answers, ...cardPages];
  assert.ok(entries.length > 0);
  // Read as a reader reads it — entities decoded, tags removed, every kind of space folded —
  // so that a name in a link, « relu et validé par », « lues par » or an `&#39;` is read too;
  // and on the one page that may say it, only its line is set aside, never the page (review
  // 17, Q25: the gate went blind in the very states it exists for).
  const everyone = entries.every((entry) => entry.status === 'reviewed');
  const statusOf = new Map(entries.map((entry) => [entry.page, entry.status]));
  const visible = (html: string): string =>
    decodeEntities(
      html.replace(/<(script|style|noscript)\b[\s\S]*?<\/\1\s*>/gi, ' ').replace(/<[^>]+>/g, ' '),
    )
      .replace(/'/g, '’')
      .replace(/[\s\u00a0\u202f]+/g, ' ');
  const kit = JSON.parse(read('design/strings.json')) as Record<string, string>;
  const RESERVED = ['concept.authorship.reviewed', 'accuracy.review.done'].map((key) =>
    visible(kit[key] ?? '').replace(/[.\s]+$/, ''),
  );
  const WHO =
    '(?:Baoleka|l’ ?[ée]diteur|une? (?:personne|humaine?|relect(?:eur|rice)|être humain)s?|des (?:personnes|humains|relecteurs))';
  const CLAIM = new RegExp(
    `(?<!\\p{L})(?:re)?lu(?:e|es|s)?(?:·e)?(?: [^\\s.!?;:]+){0,3}? par ${WHO}|${WHO} (?:les |l’ ?)?a (?:re)?lu|(?<!\\p{L})relu(?:e|es|s)? à la main|vérifiée?s? par (?:une? (?:personne|humain)|Baoleka|l’ ?éditeur)`,
    'iu',
  );
  for (const root of ROOTS) {
    for (const file of pagesOf(root)) {
      const page = relative(root, file);
      let html = read(file);
      const line = /<p class="ref authorship" data-review="([a-z]+)">[\s\S]*?<\/p>/.exec(html);
      const status = statusOf.get(page);
      if (status !== undefined) {
        // The line of a text says the state of its file, and is the only line set aside.
        assert.ok(line !== null, `${file}: no line says who wrote it`);
        assert.equal(line[1], status, `${file}: says ${line[1] ?? ''}, its file ${status}`);
        if (status === 'reviewed') html = html.replace(line[0], ' ');
      }
      let text = visible(html);
      if (everyone && page === 'exactitude/index.html')
        text = text.split(RESERVED[1] ?? '').join(' ');
      for (const reserved of RESERVED) {
        assert.ok(!text.includes(reserved), `${file}: a line kept for the day of a re-reading`);
      }
      const claim = CLAIM.exec(text);
      assert.equal(
        claim,
        null,
        `${file}: claims a re-reading by a person — « ${claim?.[0] ?? ''} »`,
      );
    }
  }
});

void test('a link that leaves the site does not say where the visitor comes from', () => {
  // The header of the pages sends our origin with a link to another site. The links that leave
  // — to the official site, and to the sources of the studies since D21.1 — carry `noreferrer`:
  // that site is not told that its visitor reads this one (security review of 15/11/2026).
  // `noreferrer` holds `noopener` with it. Read tag by tag, any quoting, `//host` and `<area>`
  // included (review 17, Q12); the links the search draws are held by scripts/e2e.ts.
  const open = findings().open;
  assert.deepEqual(open, [], open.slice(0, 5).join('\n'));
});

void test('`hidden` hides, whatever display a rule gives the element', (t) => {
  if (skip) {
    t.skip(NO_BUILD);
    return;
  }
  // Every button of the site is an inline-flex: without this rule the browser's own
  // `[hidden] { display: none }` loses to it, and what a script hid stays on screen.
  for (const file of textFiles.filter((f) => f.endsWith('.html'))) {
    assert.match(
      read(file),
      /\[hidden\]\{display:none!important\}/,
      `${file}: no rule makes the hidden attribute final`,
    );
  }
});

void test('media queries use em or rem, never px (A2)', () => {
  // Every context a query is written in — `@media`, `@container`, `@import`, a `media`
  // attribute, `matchMedia()` in a script — and every spelling of it, the range syntax
  // included, which the minifier ships as written (review 17, Q14). Chrome Android M113+
  // applies the system font size as a page zoom: a px breakpoint ignores it for ~40 % of users
  // and reproduces the measured M4 overflow.
  const offenders = [...findings().media];
  for (const file of files.filter((f) => /\.(?:js|mjs|css)$/.test(f))) {
    const code = read(file);
    for (const rule of code.matchAll(/@(?:media|container|import)\b([^{;]*)/gi)) {
      if (ABSOLUTE.test(rule[1] ?? '')) offenders.push(`${file}: @…${(rule[1] ?? '').trim()}`);
    }
    for (const query of code.matchAll(/matchMedia\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*)\1/g)) {
      if (ABSOLUTE.test(query[2] ?? '')) offenders.push(`${file}: matchMedia(${query[2] ?? ''})`);
    }
  }
  assert.deepEqual(offenders, [], `absolute breakpoints:\n${offenders.slice(0, 10).join('\n')}`);
});

void test('what a visit downloads stays small enough for a phone on a slow network — gesture by gesture (D20.12)', (t) => {
  if (skip) {
    t.skip(NO_BUILD);
    return;
  }
  const data = files.filter((f) => /dist\/data\/[^/]+\.json$/.test(f));
  if (data.length === 0) return; // holding build: no search
  const gz = (file: string): number => gzipSync(readFileSync(file), { level: 9 }).byteLength;
  const nameOf = (file: string): string => file.slice(file.lastIndexOf('/') + 1);
  const sum = (list: readonly string[]): number => list.reduce((n, f) => n + gz(f), 0);
  // What a visit fetches before it opens any explanation: the index and the titles (the first
  // search), the game, the texts of « En clair » and how the explained words are found (the
  // first question). Measured 12/11/2026: index 64 KB + titles and locators 33 KB, gzip. Each
  // is fetched once, then cached for a year under a name that says what it holds (the test
  // below). The ceiling has not moved
  // since; on 19/11/2026 the texts of the explained words left it for files of their own,
  // fetched the first time one is opened, each with a ceiling of its own (PLAN-MOTS, D20.12).
  const firstUse = data.filter((f) =>
    /^(?:(?:index|meta|jeu|clair)-[0-9a-f]{16}|mots-[0-9a-f]{16})\.json$/.test(nameOf(f)),
  );
  const meanings = data.filter((f) => /^mots-[0-9a-f]{16}-sens\.json$/.test(nameOf(f)));
  const examples = data.filter((f) => /^mots-[0-9a-f]{16}-exemples\.json$/.test(nameOf(f)));
  const pages = data.filter((f) => /^mots-[0-9a-f]{16}-[scr]-[a-z0-9-]+\.json$/.test(nameOf(f)));
  const known = new Set([...firstUse, ...meanings, ...examples, ...pages]);
  assert.deepEqual(
    data.filter((f) => !known.has(f)),
    [],
    'a file of data that no budget knows',
  );
  const budget = 130 * 1024;
  const total = sum(firstUse);
  assert.ok(
    total <= budget,
    `data before any explanation ${String(total)} B gzip > ${String(budget)} B`,
  );
  console.log(`  data before any explanation: ${String(total)} B gzip of ${String(budget)} B`);
  for (const [list, ceiling, what] of [
    [meanings, 52 * 1024, 'what the words mean'],
    [examples, 44 * 1024, 'the examples of the words'],
    [pages, 6 * 1024, 'the words of a page'],
  ] as const) {
    for (const file of list) {
      const weight = gz(file);
      assert.ok(
        weight <= ceiling,
        `${what}, ${nameOf(file)}: ${String(weight)} B gzip > ${String(ceiling)} B`,
      );
    }
    // The ceiling is a file's (D20.12: what one gesture fetches): the heaviest is printed.
    if (list.length > 0 && list !== pages) {
      const heaviest = Math.max(...list.map(gz));
      console.log(`  ${what}: ${String(heaviest)} B gzip of ${String(ceiling)} B`);
    }
  }
});

void test('every file of data is named by what it holds: a browser keeps it a year (R73)', () => {
  // public/_headers freezes /data/ for a year, `immutable`: a browser that fetched a file never
  // asks for it again. A file whose bytes change under the name it had is never seen by those
  // who came before — the titles of the search gained a field on 23/11/2026 under the name they
  // had since 12/11, the new script could not read the old file those browsers kept, and
  // « Demander » searched for ever. So every name carries the fingerprint of what its file
  // holds (src/lib/fingerprint.ts), and a name that says nothing of it is refused.
  if (skip) return;
  // Every file under /data/, at any depth and of any kind: the year of `immutable` reaches
  // them all (review 17, Q26). Only files of the top folder, in JSON, are ours to serve there.
  const everything = files.filter((f) => f.startsWith('dist/data/'));
  const data = everything.filter((f) => /^dist\/data\/[^/]+\.json$/.test(f));
  const nameOf = (file: string): string => file.slice(file.lastIndexOf('/') + 1);
  const held = (name: string): unknown => JSON.parse(read(join('dist', 'data', name)));
  const fingerprint = (value: unknown): string => canonicalHash(value).slice(0, 16);
  const wrong: string[] = [];
  for (const name of data.map(nameOf)) {
    // The search, the game, « En clair », the words of one page: each file, its own fingerprint.
    const own =
      /^(?:index|meta|jeu|clair)-([0-9a-f]{16})\.json$/.exec(name) ??
      /^mots-([0-9a-f]{16})-[scr]-[a-z0-9-]+\.json$/.exec(name);
    if (own !== null) {
      if (fingerprint(held(name)) !== own[1]) wrong.push(name);
      continue;
    }
    // The three files of the sheet's words go together, under one fingerprint (words-data.ts).
    const words = /^mots-([0-9a-f]{16})(?:-sens|-exemples)?\.json$/.exec(name)?.[1];
    if (words !== undefined) {
      const three = [
        `mots-${words}.json`,
        `mots-${words}-sens.json`,
        `mots-${words}-exemples.json`,
      ];
      const together = three.every((file) => existsSync(join('dist', 'data', file)))
        ? fingerprint({
            finder: held(three[0] ?? ''),
            meanings: held(three[1] ?? ''),
            examples: held(three[2] ?? ''),
          })
        : null;
      if (together !== words) wrong.push(name);
      continue;
    }
    wrong.push(`${name} (a name that says nothing of what the file holds)`);
  }
  wrong.push(
    ...everything
      .filter((f) => !data.includes(f))
      .map((f) => `${f} (not a file of data at the top of /data/)`),
  );
  assert.ok(!existsSync('dist/data') || data.some((f) => /\/meta-/.test(f)), 'no file of titles');
  assert.deepEqual(wrong, [], 'files of data whose name would not change with what they hold');
});

void test('initial JS stays under the P2 budget of 100 KB gzip', (t) => {
  if (skip) {
    t.skip(NO_BUILD);
    return;
  }
  const js = files.filter((f) => f.endsWith('.js'));
  const total = js.reduce((n, f) => n + gzipSync(readFileSync(f), { level: 9 }).byteLength, 0);
  const budget = 100 * 1024;
  assert.ok(total <= budget, `initial JS ${String(total)} B gzip > ${String(budget)} B`);
  console.log(`  JS gzip: ${String(total)} B of ${String(budget)} B (${String(js.length)} files)`);
});

void test('no script the phone loads holds a look-behind: Safari before 16.4 refuses the pattern, and the script with it', () => {
  // Found on 15/11/2026, before the sheet opened anywhere: three modules of the sheet wrote
  // `(?<!…)` to find the start of a word. A browser that does not know the syntax throws when
  // the pattern is built — at the load of the script — and « Demander » then does nothing,
  // without a word. The Worker may write them (src/lib/ask-validate.ts); a page may not.
  let read = 0;
  for (const root of ['dist', 'dist-ask', 'dist-gists', 'dist-scrutin']) {
    // …and in the JSON the sheet compiles its patterns from (`clair-*.json`: review 17, Q3).
    for (const file of walk(root).filter((f) => /\.(?:js|mjs|html|json)$/.test(f))) {
      read += 1;
      assert.doesNotMatch(readFileSync(file, 'utf8'), /\(\?<[=!]/, `${file} holds a look-behind`);
    }
  }
  if (read === 0) console.log('  (skipped: no build)');
});

void test('a site that answers no question ships nothing of the sheet: not a script, not a text, not a word', (t) => {
  // Judged on the build itself: dist/ when its home page carries no sheet, and the scrutin
  // build always — the one that goes out before each window of 2027, and that no gate read
  // (review 17, Q11). While the site answers none, the home page does not even import the
  // sheet (astro.config.ts, `__CEL_CHAT__`), nor anything of the explained words: they follow
  // the mode of the site (D20.11) — the module, its engine, its drawing, their pages.
  const roots = ROOTS.filter(
    (root) => built(root) && existsSync(join(root, 'sommaire', 'index.html')) && !asks(root),
  );
  if (roots.length === 0) {
    t.skip('every build here answers questions');
    return;
  }
  const SHEET_FILE =
    /\/_astro\/(?:chat|terms|words(?:-[a-z]+)?|Words(?:Hub)?\.astro_[\w-]*)\.[\w-]+\.js$|\/data\/(?:clair|mots)-/;
  for (const root of roots) {
    const shipped = walk(root);
    assert.deepEqual(
      shipped.filter((f) => SHEET_FILE.test(f)),
      [],
      `the script or the texts of the sheet are in ${root}/`,
    );
    for (const file of shipped.filter((f) => /\.(?:html|js)$/.test(f))) {
      assert.doesNotMatch(
        read(file),
        /api\/chat|api\/gists|chat-sheet|chat-config|chat-offer|c-offer|data-words|data-meanings|data-examples|data-term=/,
        `${file} carries a piece of the sheet`,
      );
    }
  }
});

void test('nothing typed can leave by a form: no field has a name, and no form is submitted natively', () => {
  // A named control is what a browser sends when it submits a form by itself — in the address,
  // for a form without a method. Both fields of the site are in the page before the script
  // that answers Enter: unnamed, they are never sent (security review of 14/11/2026). Checked on
  // every page that ships, and on the test build of the sheet.
  // Read tag by tag (review 17, Q27): a name written `name =` or after a quoted « > », and a
  // button's own `formaction`, `formmethod`, `formtarget`, which override the form's — all of it
  // passed. No form names where it goes; the dialogs close by `method="dialog"`, and nothing
  // else may say a method. Without the header, a form with no method still submits to its own
  // address on an early Enter: the fields have no name, and the header stops it (below).
  const { named, submitting } = findings();
  assert.deepEqual(named, [], named.slice(0, 5).join('\n'));
  assert.deepEqual(submitting, [], submitting.slice(0, 5).join('\n'));
  // …and the host refuses any native submission, whatever a page holds: every rule that sets
  // the policy says `form-action 'none'` first and alone, and no rule takes the policy away
  // without setting it again — a later rule that detaches it opened the forms on its paths.
  for (const file of ['public/_headers', 'dist/_headers'].filter((f) => existsSync(f))) {
    const rules = headerRules(read(file));
    const all = rules.find((rule) => rule.path === '/*');
    assert.ok(
      all?.set.some(([name]) => name === 'content-security-policy'),
      `${file}: /* sets no policy`,
    );
    for (const rule of rules) {
      const policies = rule.set.filter(([name]) => name === 'content-security-policy');
      if (rule.unset.includes('content-security-policy')) {
        assert.ok(policies.length > 0, `${file}, ${rule.path}: takes the policy away`);
      }
      for (const [, value] of policies) {
        const directives = value.split(';').map((part) => part.trim().toLowerCase());
        const actions = directives.filter((part) => part.startsWith('form-action'));
        assert.deepEqual(actions, ["form-action 'none'"], `${file}, ${rule.path}: ${value}`);
      }
    }
  }
});

void test('the script of the sheet is small, and fetched at the first press — never announced before', (t) => {
  // Judged on every build that answers questions — dist/ first, which has shipped the sheet
  // since 15/11 and which no gate read (review 17, Q9) — and when a build asks, its script is
  // there: a script renamed or folded into another took its gate away in silence (Q10).
  const roots = ROOTS.filter(asks);
  if (roots.length === 0) {
    t.skip('no build here answers questions — run `npm run build` first');
    return;
  }
  for (const root of roots) {
    const sheet = walk(`${root}/_astro`).filter((f) => /\/chat\.[^/]+\.js$/.test(f));
    assert.equal(
      sheet.length,
      1,
      `${root}: one script for the sheet — none means it was renamed or folded`,
    );
    const [script = ''] = sheet;
    const gz = gzipSync(readFileSync(script), { level: 9 }).byteLength;
    // PLAN-CHAT §8 said 12 KB at most, and on 14/11/2026 the script weighed a third of it. On
    // 15/11 it weighs 15.7 KB: what the phone decides by itself grew — which questions are
    // refused, which are about the site, which name someone and get links (D16.64 to D16.67),
    // which words are explained, when a sensitive subject is asked alone (D16.70), what a date
    // or letters typed apart are (D16.71), what hate in words of the book is (D16.72). None of it
    // can move to a server: the question never leaves the phone (D16.53), so the phone is where
    // it is read. The ceiling was raised to
    // 14 KB that night « once », and that word did not hold: the rule a sixth review asked for
    // weighs 1.6 KB, and it is the one that closes what five lists of words did not. So: 16 KB,
    // said plainly (D16.70) — the script is fetched at the first press, never with the page; the
    // lists of words are data, fetched with the texts of the sheet, and only the ways of reading
    // a question are code. It stays a ceiling: the titles, the faces and the small words of
    // people left the code for the data on 15/11 (D16.72, D16.73), which paid for the rules of
    // those passes; the next rule comes in the same way. On 19/11/2026 the reading of the
    // explained words left it for a module of its own (PLAN-MOTS, lot 1, test below): 15.2 KB.
    // On 24/11/2026 the rules the review of src/lib asked for (PLAN-REVUES) brought it to 16.8 KB;
    // asked whether to take lists out of the code or to raise the ceiling, the editor answered
    // « Relever à 17 Ko » (D21.15). The rule above still holds for the next one.
    const budget = 17 * 1024;
    assert.ok(
      gz <= budget,
      `${root}: the sheet's script: ${String(gz)} B gzip > ${String(budget)} B`,
    );
    console.log(`  ${root}: sheet script: ${String(gz)} B gzip of ${String(budget)} B`);
    // No page names it: neither as a script, nor as a preload. The search's script imports it
    // when the button is pressed, and that import is the only mention of it anywhere.
    const name = script.slice(script.lastIndexOf('/') + 1);
    for (const page of pagesOf(root)) {
      assert.ok(!read(page).includes(name), `${relative(root, page)} names ${name}`);
    }
    const importers = walk(`${root}/_astro`).filter((f) => f !== script && read(f).includes(name));
    assert.equal(importers.length, 1, importers.join(', '));
    assert.match(importers[0] ?? '', /Search\.astro/);
  }
});

void test('the explained words are a module of their own, asked for by the sheet’s script and named by no page', (t) => {
  // PLAN-MOTS, lot 1 (19/11/2026): how the terms are found and drawn left the sheet's script,
  // which asks for this module as soon as it runs. Lot 3 gave it the fetching of the files of
  // the words — how they are found, then their texts on demand — and its ceiling (D20.12): its
  // measure then, 2 234 B, plus a fifth. That measure was of the module as ONE file; Rollup has
  // since cut it in three (the engine of the words, their drawing, a wrapper of 776 B), and the
  // gate weighed the wrapper (review 17, Q2). So the module is weighed as lot 3 weighed it:
  // src/scripts/words.ts bundled alone, minified, gzip -9 — whatever the bundler of the site
  // makes of its pieces.
  const bundled = buildSync({
    entryPoints: ['src/scripts/words.ts'],
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    write: false,
    logLevel: 'silent',
  }).outputFiles[0]?.contents;
  assert.ok(bundled !== undefined, 'src/scripts/words.ts did not bundle');
  const gz = gzipSync(bundled, { level: 9 }).byteLength;
  const budget = 2_681;
  assert.ok(gz <= budget, `the explained words: ${String(gz)} B gzip > ${String(budget)} B`);
  console.log(`  explained words, as one module: ${String(gz)} B gzip of ${String(budget)} B`);
  const roots = ROOTS.filter(asks);
  if (roots.length === 0) {
    t.skip('no build here answers questions — run `npm run build` first');
    return;
  }
  for (const root of roots) {
    const found = walk(`${root}/_astro`).filter((f) => /\/words\.[^/]+\.js$/.test(f));
    assert.equal(
      found.length,
      1,
      `${root}: one module for the explained words — renamed, or folded?`,
    );
    const [script = ''] = found;
    const name = script.slice(script.lastIndexOf('/') + 1);
    for (const page of pagesOf(root)) {
      assert.ok(!read(page).includes(name), `${relative(root, page)} names ${name}`);
    }
    // The sheet's script asks for it — and, since lot 6, the line of the search
    // (src/scripts/words-search.ts), where the build says when what is typed is an explained
    // word. No other script, and no page.
    const importers = walk(`${root}/_astro`).filter((f) => f !== script && read(f).includes(name));
    assert.ok(
      importers.length >= 1 &&
        importers.every((f) => /\/(?:chat|words-search)\.[^/]*\.js$/.test(f)),
      importers.join(', '),
    );
    assert.ok(
      importers.some((f) => /\/chat\.[^/]+\.js$/.test(f)),
      `${root}: the sheet does not ask for it`,
    );
  }
});

void test('the sheet is told, for each of our published answers, the measures it rests on', (t) => {
  // A recognised objection shows these measures, not what its words find (src/lib/chat-local.ts,
  // `measuresFor`). Read in every build whose home page carries the sheet — what ships first.
  const roots = ROOTS.filter(asks);
  if (roots.length === 0) {
    t.skip('no build here answers questions — run `npm run build` first');
    return;
  }
  const manifest = JSON.parse(read('data/2026/manifest.json')) as {
    sections: { items: { id: string; kind: string }[] }[];
  };
  const measures = new Set(
    manifest.sections.flatMap((section) =>
      section.items.filter((item) => item.kind !== 'paragraph').map((item) => item.id),
    ),
  );
  // Every answer the editor accepted, and none other (src/lib/notions.ts, `knownOf`): compared
  // by name — a count let a pending answer stand for an accepted one (review 17, Q30).
  const accepted = (
    JSON.parse(read('data/2026/riposte.json')) as {
      entries: { slug: string; review: { status: string } }[];
    }
  ).entries
    .filter((entry) => entry.review.status !== 'pending')
    .map((entry) => entry.slug)
    .sort();
  for (const root of roots) {
    const island = /<script type="application\/json" id="chat-config">([^<]*)<\/script>/.exec(
      read(join(root, 'index.html')),
    )?.[1];
    assert.ok(island !== undefined, `${root}: the configuration of the sheet is not in the page`);
    const config = JSON.parse(island) as { objections: { slug: string; supports: string[] }[] };
    assert.deepEqual(config.objections.map((objection) => objection.slug).sort(), accepted, root);
    for (const { slug, supports } of config.objections) {
      assert.ok(supports.length >= 2, `${root}, ${slug}: ${String(supports.length)} measure(s)`);
      for (const id of supports) assert.ok(measures.has(id), `${slug}: ${id} is not a measure`);
    }
  }
});

void test('fonts delivered stay under the P8 budget of 75 KB', (t) => {
  if (skip) {
    t.skip(NO_BUILD);
    return;
  }
  const fonts = files.filter((f) => f.endsWith('.woff2') || f.endsWith('.woff'));
  const total = fonts.reduce((n, f) => n + statSync(f).size, 0);
  const budget = 75 * 1024;
  assert.ok(total <= budget, `fonts ${String(total)} B > ${String(budget)} B`);
  // …and they are exactly the fonts the build ships, no stray one (review 12, T14) — by its own
  // list, not by a pattern over its source (review 17, Q13).
  assert.deepEqual(fonts.map((f) => f.slice(f.lastIndexOf('/') + 1)).sort(), [...SHIPPED].sort());
  console.log(`  fonts: ${String(total)} B of ${String(budget)} B (${String(fonts.length)} files)`);
});

void test('what is frozen for a year under a fixed name keeps its bytes: the fonts and the share image (review of 24/11/2026, U15)', () => {
  // /fonts/* and /og/* are served `immutable` for a year (public/_headers) under names that do
  // not change with their bytes: a browser that holds one keeps it, reload included — R73 with
  // other files. A new subset or a new drawing is a new name, and this list moves with it.
  const FROZEN: Readonly<Record<string, string>> = {
    'design/fonts/PublicSans-Variable-latin.woff2':
      'b4627ea445775deadef769d0c83465691c98b02a9aa41c8ee0b2729d13fc63d6',
    'design/fonts/GowunBatang-Regular-latin.woff2':
      'b383c6e58c10276e7d0f800568b105962dc590be34b6993ce53e71e5e3480a50',
    'design/fonts/GowunBatang-Bold-latin.woff2':
      '5937df3310489328a6e64fdde5340e73072345e7535f9bdf4cb9adee28184097',
    'public/og/cestecritla-v1.png':
      '9599beeac4f89875bc5d67cb883307e9d0a854fd9d8185c9e20b6aad34ac7e26',
  };
  for (const [path, sha] of Object.entries(FROZEN)) {
    assert.equal(
      createHash('sha256').update(readFileSync(path)).digest('hex'),
      sha,
      `${path}: its bytes changed under a name served for a year — give it a new name`,
    );
  }
  // …and these are all the files served under those two prefixes: the faces the build ships,
  // by its own list (a face renamed `-v2` was pinned by nothing: review 17, Q13), and the
  // bytes that went into dist/ are these — when a build is there.
  assert.deepEqual(readdirSync('public/og').sort(), ['cestecritla-v1.png']);
  assert.deepEqual(
    SHIPPED.map((name) => `design/fonts/${name}`).sort(),
    Object.keys(FROZEN)
      .filter((path) => path.startsWith('design/fonts/'))
      .sort(),
  );
  if (!existsSync('dist/fonts')) return;
  assert.deepEqual(readdirSync('dist/fonts').sort(), [...SHIPPED].sort());
  assert.deepEqual(readdirSync('dist/og').sort(), ['cestecritla-v1.png']);
  for (const [path, sha] of Object.entries(FROZEN)) {
    const shipped = path.replace(/^design\//, 'dist/').replace(/^public\//, 'dist/');
    assert.equal(
      createHash('sha256').update(readFileSync(shipped)).digest('hex'),
      sha,
      `${shipped}: what dist/ serves under this name is not the file it is frozen as`,
    );
  }
});

void test('every page that has a share image says what it shows: « Site non officiel. » (D21.24)', (t) => {
  if (skip) {
    t.skip(NO_BUILD);
    return;
  }
  const missing = files
    .filter((f) => f.endsWith('.html'))
    .filter((f) => read(f).includes('property="og:image"'))
    .filter((f) => {
      const html = read(f);
      return !(
        /<meta property="og:image:alt" content="[^"]*Site non officiel\.[^"]*"/.test(html) &&
        /<meta name="twitter:image:alt" content="[^"]*Site non officiel\.[^"]*"/.test(html)
      );
    });
  assert.deepEqual(missing.slice(0, 5), [], `${String(missing.length)} page(s) without it`);
});

void test('every section page stays under the P3 critical-path budget', (t) => {
  if (!existsSync('dist/sommaire/index.html')) {
    t.skip('no build of the app in dist/');
    return;
  }
  // CSS is inlined, so the HTML carries the critical path on its own. Every section page, not
  // one by its name: a renumbering of the book would have turned the gate off (review 17, Q34).
  const pages = walk('dist/s').filter((f) => f.endsWith('index.html'));
  assert.ok(pages.length > 0, 'a build of the app without a section page');
  const weighed = pages.map(
    (page) => [page, gzipSync(readFileSync(page), { level: 9 }).byteLength] as const,
  );
  const [heaviest, gz] = weighed.reduce((a, b) => (b[1] > a[1] ? b : a));
  const budget = 150 * 1024;
  assert.ok(gz <= budget, `critical path ${String(gz)} B gzip > ${String(budget)} B (${heaviest})`);
  console.log(`  heaviest section page: ${String(gz)} B gzip of ${String(budget)} B`);
});

void test('no generated custom property carries token metadata', () => {
  // DTCG reserves the `$`-prefix for metadata. motion.duration.$description was being emitted
  // as `--duration-$description: <prose>;`, which is invalid CSS and produced two esbuild
  // syntax errors on every page of the build. Zero `$` is the whole rule.
  const css = readFileSync('src/styles/tokens.css', 'utf8');
  const leaked = [...css.matchAll(/^\s*--[^:]*\$[^:]*:/gm)].map((m) => m[0].trim());
  assert.deepEqual(leaked, [], `metadata leaked into CSS:\n${leaked.join('\n')}`);
});

void test('the sheets of tokens the builds use are CSS esbuild reads without a word', () => {
  // Read by esbuild itself, as the build minifies them: counting braces let a lost « ; » and a
  // reference left as written through, and the neutral sheet was read by nothing (review 17,
  // Q4, Q28). A source, not a build: no dist/ is needed (Q29).
  const sheets = [
    'src/styles/tokens.css',
    'src/styles/mascot2-tokens.css',
    'build/neutral/tokens.css',
    'build/neutral/mascot2-tokens.css',
  ].filter((sheet) => existsSync(sheet));
  assert.ok(sheets.includes('src/styles/tokens.css'), 'src/styles/tokens.css is not there');
  for (const sheet of sheets) {
    const css = read(sheet);
    const { warnings } = transformSync(css, {
      loader: 'css',
      minify: true,
      target: 'es2022',
      logLevel: 'silent',
    });
    assert.deepEqual(
      warnings.map((warning) => warning.text),
      [],
      `${sheet}: esbuild has something to say`,
    );
    assert.doesNotMatch(
      css,
      /\{[a-z][\w.-]*\}/,
      `${sheet}: a reference to a token left as written`,
    );
  }
});
