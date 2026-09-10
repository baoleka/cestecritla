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
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

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

const isMain = process.argv[1]?.endsWith('build-tokens.ts') ?? false;
if (isMain) {
  const root = process.cwd();
  // `--neutral` executes the light rebrand of D0.17: same roles, same gate, no charte colour.
  // Since D14.12 removed the message 0 to LFI, this is the only prepared answer to a takedown
  // request, so it has to be one flag away rather than a document to implement under pressure.
  const neutral = process.argv.includes('--neutral');
  const source = neutral ? 'design/tokens.neutral.json' : 'design/tokens.json';
  const tokens = JSON.parse(readFileSync(resolve(root, source), 'utf8')) as {
    [k: string]: Json;
  };
  const css = buildTokensCss(tokens);
  mkdirSync(resolve(root, 'src/styles'), { recursive: true });
  writeFileSync(resolve(root, 'src/styles/tokens.css'), css);
  console.log(
    `tokens.css: ${String(css.split('\n').length)} lines, ${String(Buffer.byteLength(css))} B` +
      (neutral ? ' — NEUTRAL SET (rebrand light, D0.17)' : ''),
  );
}
