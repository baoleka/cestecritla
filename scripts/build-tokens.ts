/**
 * Generate src/styles/tokens.css from design/tokens.json (the source of truth, D3.1/D3.4).
 *
 * Nothing here invents a value: it resolves `{color.x}` references, converts the units the
 * budget requires, and emits custom properties. Two conversions are deliberate:
 *
 *   px -> rem for every font size (A2, perf-budget §2.3). Tokens ship sizes in px because that
 *   is how they were measured; a rendered px size ignores the reader's system font setting.
 *
 *   px -> em for every breakpoint. tokens.json ships 390/430/768/1024 in px while
 *   perf-budget.md §2.3 requires the opposite, and the reason is measured: Chrome on Android
 *   M113+ applies the system font size as a page zoom, so a `@media (min-width: 390px)`
 *   reproduces defect M4 (the nav bar overflowing at 130 % system font) for roughly 40 % of
 *   users. Breakpoints in em follow the zoom; breakpoints in px do not.
 *
 * Run from the repository root:  npx tsx scripts/build-tokens.ts
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
const isObj = (v: Json | undefined): v is { [k: string]: Json } =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Read a child object, or an empty one. Narrowing in a single expression keeps tsc happy. */
const obj = (parent: { [k: string]: Json }, key: string): { [k: string]: Json } => {
  const child = parent[key];
  return isObj(child) ? child : {};
};

/** Root font size assumed by the rem/em conversions. */
const ROOT_PX = 16;

export function pxToRem(value: string, unit: 'rem' | 'em' = 'rem'): string {
  const m = /^(-?\d*\.?\d+)px$/.exec(value.trim());
  if (m === null) return value;
  const n = Number(m[1]) / ROOT_PX;
  return `${String(Number(n.toFixed(4)))}${unit}`;
}

/** Resolve `{a.b.c}` references against the token tree, following chains. */
export function resolveRefs(value: string, tree: { [k: string]: Json }): string {
  return value.replace(/\{([^}]+)\}/g, (_all, path: string) => {
    let node: Json = tree;
    for (const key of path.split('.')) {
      if (!isObj(node)) return _all;
      const next: Json | undefined = node[key];
      if (next === undefined) return _all;
      node = next;
    }
    if (isObj(node) && typeof node['$value'] === 'string') return resolveRefs(node['$value'], tree);
    return typeof node === 'string' ? resolveRefs(node, tree) : _all;
  });
}

/** DTCG reserves `$`-prefixed keys for metadata: none of them is ever a value. */
const isMeta = (key: string): boolean => key.startsWith('$');

const decl = (name: string, value: string): string => `  --${name}: ${value};`;

export function buildTokensCss(tokens: { [k: string]: Json }): string {
  const out: string[] = [];
  const push = (s: string): void => void out.push(s);

  const colors = obj(tokens, 'color');
  const roles = obj(tokens, 'color-role');
  const light = obj(roles, 'light');
  const dark = obj(roles, 'dark');

  push('/* GENERATED from design/tokens.json by scripts/build-tokens.ts — do not edit. */');
  push('');
  push(':root {');
  push('  color-scheme: light dark;');

  // Raw palette.
  for (const [name, node] of Object.entries(colors)) {
    if (isMeta(name) || !isObj(node) || typeof node['$value'] !== 'string') continue;
    push(decl(`color-${name}`, node['$value']));
  }

  // Light is the complete palette, defined on bare :root so no colour has its only
  // definition inside a media query.
  push('');
  for (const [role, ref] of Object.entries(light)) {
    if (isMeta(role) || typeof ref !== 'string') continue;
    push(decl(role, resolveRefs(ref, tokens)));
  }

  // Typography, in rem.
  const font = obj(tokens, 'font');
  const sizes = obj(font, 'size');
  push('');
  for (const [name, node] of Object.entries(sizes)) {
    if (isMeta(name) || !isObj(node) || typeof node['$value'] !== 'string') continue;
    push(decl(`font-size-${name}`, pxToRem(node['$value'])));
    const lh = node['line-height'];
    if (typeof lh === 'string') push(decl(`line-height-${name}`, lh));
  }
  const families = obj(font, 'family');
  for (const [name, node] of Object.entries(families)) {
    if (isMeta(name) || !isObj(node) || typeof node['$value'] !== 'string') continue;
    push(decl(`font-family-${name}`, node['$value']));
  }
  const weights = obj(font, 'weight');
  for (const [name, node] of Object.entries(weights)) {
    if (isMeta(name)) continue;
    const v = isObj(node) ? node['$value'] : node;
    if (typeof v !== 'string' && typeof v !== 'number') continue;
    push(decl(`font-weight-${name}`, String(v)));
  }

  // Spacing, radius, tap targets: rem, so they follow the system font size too.
  for (const group of ['space', 'radius'] as const) {
    const node = obj(tokens, group);
    push('');
    for (const [name, raw] of Object.entries(node)) {
      if (isMeta(name)) continue;
      const v = isObj(raw) ? raw['$value'] : raw;
      if (typeof v !== 'string') continue;
      push(decl(`${group}-${name}`, pxToRem(resolveRefs(v, tokens))));
    }
  }
  const tap = obj(tokens, 'tap-target');
  push('');
  for (const [name, v] of Object.entries(tap)) {
    if (isMeta(name) || typeof v !== 'string') continue;
    push(decl(`tap-${name}`, pxToRem(v)));
  }

  const shadow = obj(tokens, 'shadow');
  push('');
  for (const [name, node] of Object.entries(shadow)) {
    if (isMeta(name)) continue;
    const v = isObj(node) ? node['$value'] : node;
    if (typeof v !== 'string') continue;
    push(decl(`shadow-${name}`, resolveRefs(v, tokens)));
  }

  const motion = obj(tokens, 'motion');
  const duration = obj(motion, 'duration');
  push('');
  for (const [name, v] of Object.entries(duration)) {
    if (isMeta(name) || typeof v !== 'string') continue;
    push(decl(`duration-${name}`, v));
  }
  // Easings are tokens too (motion-spec M3): a curve typed in a stylesheet is a curve nobody
  // will find when the token changes.
  for (const [name, v] of Object.entries(obj(motion, 'easing'))) {
    if (isMeta(name) || typeof v !== 'string') continue;
    push(decl(`easing-${name}`, v));
  }
  push('}');

  // Dark: redefine ONLY the roles, guarded so an explicit light choice always wins.
  const darkBlock: string[] = [];
  for (const [role, ref] of Object.entries(dark)) {
    if (isMeta(role) || typeof ref !== 'string') continue;
    darkBlock.push(decl(role, resolveRefs(ref, tokens)));
  }
  push('');
  push('@media (prefers-color-scheme: dark) {');
  push('  :root:not([data-theme="light"]) {');
  push(darkBlock.map((l) => `  ${l}`).join('\n'));
  push('  }');
  push('}');
  push('');
  push(':root[data-theme="dark"] {');
  push(darkBlock.join('\n'));
  push('}');

  // Breakpoints, in em (see the header note).
  const bp = obj(tokens, 'breakpoint');
  push('');
  push('/* Breakpoints in em, never px: Chrome Android M113+ applies the system font size as a');
  push('   page zoom, so a px breakpoint ignores it for ~40 % of users (perf-budget §2.3). */');
  for (const [name, v] of Object.entries(bp)) {
    if (isMeta(name) || typeof v !== 'string') continue;
    push(`/* --breakpoint-${name}: ${pxToRem(v, 'em')} (${v}) */`);
  }
  push('');
  return out.join('\n');
}

/**
 * The colours the player may give the second-generation mascot (D17.3, D17.16), as a stylesheet
 * of their own: `mascot-role` in the token file, six tints in light and in dark. It follows the
 * themes exactly as tokens.css does, and is imported by her alone — so that the stylesheet of
 * every page does not carry a byte of them while she is not served
 * (docs/discovery/PLAN-TORTUE.md §11.1). Empty for a token file that declares none.
 */
export function buildMascotTokensCss(tokens: { [k: string]: Json }): string {
  const roles = obj(tokens, 'mascot-role');
  const block = (theme: 'light' | 'dark'): string[] =>
    Object.entries(obj(roles, theme)).flatMap(([role, value]) =>
      !isMeta(role) && typeof value === 'string' ? [decl(role, resolveRefs(value, tokens))] : [],
    );
  const [light, dark] = [block('light'), block('dark')];
  if (light.length === 0 && dark.length === 0) return '';
  return [
    '/* GENERATED from design/tokens.json (mascot-role) by scripts/build-tokens.ts — do not edit. */',
    ':root {',
    ...light,
    '}',
    '',
    '@media (prefers-color-scheme: dark) {',
    '  :root:not([data-theme="light"]) {',
    ...dark.map((line) => `  ${line}`),
    '  }',
    '}',
    '',
    ':root[data-theme="dark"] {',
    ...dark,
    '}',
    '',
  ].join('\n');
}

/** Where the two stylesheets of the charter go: tracked, rewritten only when they change. */
export const TOKENS_CSS_PATH = 'src/styles/tokens.css';
export const MASCOT_TOKENS_CSS_PATH = 'src/styles/mascot2-tokens.css';
/**
 * Where the neutral set goes (D0.17, D14.12): untracked, and read by a neutral build alone
 * (astro.config.ts, `CEL_TOKENS`). Written over the tracked sheets, it left the tree changed —
 * a neutral working tree, two builds passing each other their colours (review 12, T7, T8).
 */
export const NEUTRAL_TOKENS_CSS_PATH = 'build/neutral/tokens.css';
export const NEUTRAL_MASCOT_TOKENS_CSS_PATH = 'build/neutral/mascot2-tokens.css';

/**
 * The neutral set as the build uses it: the groups of colour the neutral file defines, over the
 * rest of the charter's tokens — its type scale, spacing, radii, motion and tap targets. Used
 * alone as the whole tree, the neutral file shipped a site without them (review 12, T2).
 */
export function neutralTokens(
  main: { [k: string]: Json },
  neutral: { [k: string]: Json },
): {
  [k: string]: Json;
} {
  const over: { [k: string]: Json } = { ...main };
  for (const group of ['color', 'color-role', 'mascot-role']) {
    const value = neutral[group];
    if (value !== undefined) over[group] = value;
  }
  return over;
}

/** Writes a file only when its bytes change: a build of the same charter touches nothing. */
function writeIfChanged(path: string, text: string): void {
  if (existsSync(path) && readFileSync(path, 'utf8') === text) return;
  writeFileSync(path, text);
}

const isMain = process.argv[1]?.endsWith('build-tokens.ts') ?? false;
if (isMain) {
  const root = process.cwd();
  // `--neutral` executes the light rebrand of D0.17: same roles, same gate, no charte colour.
  // Since D14.12 removed the message 0 to LFI, this is the only prepared answer to a takedown
  // request, so it has to be one flag away rather than a document to implement under pressure.
  const neutral = process.argv.includes('--neutral');
  const read = (path: string): { [k: string]: Json } =>
    JSON.parse(readFileSync(resolve(root, path), 'utf8')) as { [k: string]: Json };
  const tokens = neutral
    ? neutralTokens(read('design/tokens.json'), read('design/tokens.neutral.json'))
    : read('design/tokens.json');
  const css = buildTokensCss(tokens);
  const [sheet, mascotSheet] = neutral
    ? [NEUTRAL_TOKENS_CSS_PATH, NEUTRAL_MASCOT_TOKENS_CSS_PATH]
    : [TOKENS_CSS_PATH, MASCOT_TOKENS_CSS_PATH];
  mkdirSync(dirname(resolve(root, sheet)), { recursive: true });
  writeIfChanged(resolve(root, sheet), css);
  // Her tints, apart: the same themes, another file.
  writeIfChanged(resolve(root, mascotSheet), buildMascotTokensCss(tokens));
  console.log(
    `tokens.css: ${String(css.split('\n').length)} lines, ${String(Buffer.byteLength(css))} B` +
      (neutral ? ' — NEUTRAL SET (rebrand light, D0.17)' : ''),
  );
}
