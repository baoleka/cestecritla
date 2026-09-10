/**
 * Build the inputs shared by both apps (React + Vite and Astro), so that the two pages are
 * rendered from byte-identical data, tokens and fonts.
 *
 * Run from the lab directory: npm run build:shared
 *
 * Outputs:
 *   shared/generated/tokens.css      CSS custom properties from design/tokens.json + @font-face block
 *                                    (design/fonts/README.md §6) + metric-matched fallback faces (CLS, P4)
 *   shared/generated/slim.json       the D1.6 runtime projection of data/aec-2025.json (same logic as
 *                                    prototypes/spike-share/scripts/build-data.ts; byte-identical output)
 *   shared/generated/section.json    meta + chapter + section c12-s01 (what the page renders at build time)
 *   {react,astro}/public/fonts/      the 4 latin woff2 subsets + OFL licences (design/fonts)
 *   {react,astro}/public/data/       slim.json (fetched lazily by the search box)
 *
 * No text is rewritten: the only transformation is structural (drop hash/html) plus D3.6
 * (U+202F -> U+00A0, absent from the subset fonts).
 */
import { copyFileSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import type { PageData, SlimCorpus, SlimItem } from './types.ts';

const here = dirname(fileURLToPath(import.meta.url));
const lab = resolve(here, '..');
const repoRoot = resolve(lab, '..', '..', '..');
const generated = resolve(here, 'generated');
const apps = ['react', 'astro'] as const;

const SECTION_ID = 'c12-s01';

// ---------------------------------------------------------------------------------------------
// 1. Corpus projection (D1.6) -- same logic as the spike's build-data.ts
// ---------------------------------------------------------------------------------------------

interface SourceSubMeasure {
  kind: 'sub_measure';
  id: string;
  text: string;
}
interface SourceItem {
  kind: 'paragraph' | 'key_measure' | 'measure';
  id: string;
  text: string;
  subMeasures?: SourceSubMeasure[];
}
interface SourceSection {
  id: string;
  chapterId: string;
  partId: string;
  title: string;
  url: string;
  items: SourceItem[];
  chiffres: { kind: 'chiffre'; id: string; text: string }[];
}
interface SourceCorpus {
  meta: { corpus_version: string; official_count: number };
  chapters: { id: string; number: number; title: string; partId: string }[];
  sections: SourceSection[];
}

/** D3.6: narrow no-break space is absent from the subset fonts; normalise to NBSP. */
const normaliseSpaces = (text: string): string => text.replace(/ /g, ' ');

const source = JSON.parse(
  readFileSync(resolve(repoRoot, 'data', 'aec-2025.json'), 'utf8'),
) as SourceCorpus;

const slim: SlimCorpus = {
  meta: { corpus_version: source.meta.corpus_version, official_count: source.meta.official_count },
  chapters: source.chapters.map((c) => ({
    id: c.id,
    number: c.number,
    title: c.title,
    partId: c.partId,
  })),
  sections: source.sections.map((s) => ({
    id: s.id,
    chapterId: s.chapterId,
    title: s.title,
    url: s.url,
    items: s.items.map((i) => {
      const item: SlimItem = { kind: i.kind, id: i.id, text: normaliseSpaces(i.text) };
      if (i.subMeasures && i.subMeasures.length > 0) {
        item.subMeasures = i.subMeasures.map((sm) => ({
          kind: sm.kind,
          id: sm.id,
          text: normaliseSpaces(sm.text),
        }));
      }
      return item;
    }),
    chiffres: s.chiffres.map((a) => ({ id: a.id, text: normaliseSpaces(a.text) })),
  })),
};

const section = slim.sections.find((s) => s.id === SECTION_ID);
if (section === undefined) throw new Error(`section ${SECTION_ID} not found`);
const chapter = slim.chapters.find((c) => c.id === section.chapterId);
if (chapter === undefined) throw new Error(`chapter ${section.chapterId} not found`);
const page: PageData = { meta: slim.meta, chapter, section };

mkdirSync(generated, { recursive: true });
const slimJson = JSON.stringify(slim);
writeFileSync(resolve(generated, 'slim.json'), slimJson);
writeFileSync(resolve(generated, 'section.json'), JSON.stringify(page));

// ---------------------------------------------------------------------------------------------
// 2. Tokens -> CSS custom properties
// ---------------------------------------------------------------------------------------------

interface TokenLeaf {
  $value: string;
  $type?: string;
  $description?: string;
  'line-height'?: string;
}
interface Tokens {
  color: Record<string, TokenLeaf>;
  'color-role': { light: Record<string, string>; dark: Record<string, string> };
  font: {
    family: Record<string, TokenLeaf>;
    size: Record<string, TokenLeaf>;
    weight: Record<string, number>;
  };
  space: Record<string, string>;
  radius: Record<string, string>;
  shadow: Record<string, TokenLeaf>;
  motion: { duration: Record<string, string>; easing: Record<string, string> };
  'tap-target': Record<string, string>;
  breakpoint: Record<string, string>;
}

const tokens = JSON.parse(
  readFileSync(resolve(repoRoot, 'design', 'tokens.json'), 'utf8'),
) as Tokens;

/** "{color.creme}" -> "var(--color-creme)"; literal values pass through. */
const ref = (value: string): string =>
  value.replace(/\{color\.([a-z0-9-]+)\}/g, (_m, name: string) => `var(--color-${name})`);

const lines: string[] = [];
lines.push('/* Generated from design/tokens.json by shared/build-shared.ts -- do not edit. */');
lines.push(':root {');
lines.push('  color-scheme: light dark;');
for (const [name, leaf] of Object.entries(tokens.color))
  lines.push(`  --color-${name}: ${leaf.$value};`);
for (const [role, value] of Object.entries(tokens['color-role'].light)) {
  if (role.startsWith('$')) continue;
  lines.push(`  --${role}: ${ref(value)};`);
}
for (const [name, leaf] of Object.entries(tokens.font.family))
  lines.push(`  --font-${name}: ${leaf.$value};`);
for (const [name, leaf] of Object.entries(tokens.font.size)) {
  lines.push(`  --size-${name}: ${leaf.$value};`);
  if (leaf['line-height'] !== undefined) lines.push(`  --lh-${name}: ${leaf['line-height']};`);
}
for (const [name, value] of Object.entries(tokens.font.weight))
  lines.push(`  --weight-${name}: ${String(value)};`);
for (const [name, value] of Object.entries(tokens.space))
  lines.push(`  --space-${name}: ${value};`);
for (const [name, value] of Object.entries(tokens.radius))
  lines.push(`  --radius-${name}: ${value};`);
for (const [name, leaf] of Object.entries(tokens.shadow))
  lines.push(`  --shadow-${name}: ${ref(leaf.$value)};`);
for (const [name, value] of Object.entries(tokens.motion.duration)) {
  if (name.startsWith('$')) continue;
  lines.push(`  --duration-${name}: ${value};`);
}
for (const [name, value] of Object.entries(tokens.motion.easing))
  lines.push(`  --easing-${name}: ${value};`);
for (const [name, value] of Object.entries(tokens['tap-target']))
  lines.push(`  --tap-${name}: ${value};`);
lines.push('}');
lines.push('@media (prefers-color-scheme: dark) {');
lines.push('  :root {');
for (const [role, value] of Object.entries(tokens['color-role'].dark)) {
  if (role.startsWith('$')) continue;
  lines.push(`    --${role}: ${ref(value)};`);
}
lines.push('  }');
lines.push('}');
lines.push('@media (prefers-reduced-motion: reduce) {');
lines.push('  :root { --duration-fast: 0ms; --duration-base: 0ms; --duration-slow: 0ms; }');
lines.push('}');

// @font-face block: design/fonts/README.md §6, paths relative to /fonts/ at the site root.
const unicodeRange = 'U+0000-00FF, U+0100-017F, U+2000-206F, U+20AC, U+2122';
const face = (family: string, file: string, weight: string, style: string): string =>
  `@font-face {
  font-family: "${family}";
  src: url("/fonts/${file}") format("woff2");
  font-weight: ${weight};
  font-style: ${style};
  font-display: swap;
  unicode-range: ${unicodeRange};
}`;
lines.push(face('Public Sans', 'PublicSans-Variable-latin.woff2', '100 900', 'normal'));
lines.push(face('Public Sans', 'PublicSans-Italic-Variable-latin.woff2', '100 900', 'italic'));
lines.push(face('Gowun Batang', 'GowunBatang-Regular-latin.woff2', '400', 'normal'));
lines.push(face('Gowun Batang', 'GowunBatang-Bold-latin.woff2', '700', 'normal'));

// Metric-matched fallback faces (perf-budget.md §1.4, P4). Ratios computed with fontTools on
// 2026-09-09 over a French sample string: average advance / em of the web font divided by the
// fallback's. Public Sans 0.4533 em; Gowun Batang 0.4393 em; Roboto 0.4394 (Android system-ui);
// Noto Sans 0.4687 and Noto Serif 0.4786 (Linux measurement machine). Ascent/descent come from the
// web fonts (Public Sans typo 0.95 / 0.225 ; Gowun Batang hhea 1.16 / 0.288, line-gap 0).
const fallback = (
  family: string,
  local: string,
  sizeAdjust: string,
  ascent: string,
  descent: string,
): string =>
  `@font-face {
  font-family: "${family}";
  src: local("${local}");
  size-adjust: ${sizeAdjust};
  ascent-override: ${ascent};
  descent-override: ${descent};
  line-gap-override: 0%;
}`;
lines.push(fallback('Public Sans Fallback Roboto', 'Roboto', '103.2%', '95%', '22.5%'));
lines.push(fallback('Public Sans Fallback Noto', 'Noto Sans', '96.7%', '95%', '22.5%'));
lines.push(fallback('Gowun Batang Fallback Noto', 'Noto Serif', '91.8%', '116%', '28.8%'));
lines.push(
  `:root {
  --font-ui-stack: "Public Sans", "Public Sans Fallback Roboto", "Public Sans Fallback Noto", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-verbatim-stack: "Gowun Batang", "Gowun Batang Fallback Noto", "Iowan Old Style", Georgia, serif;
}`,
);
writeFileSync(resolve(generated, 'tokens.css'), `${lines.join('\n')}\n`);

// ---------------------------------------------------------------------------------------------
// 3. Fonts and data into each app's public/ directory
// ---------------------------------------------------------------------------------------------

const fontsDir = resolve(repoRoot, 'design', 'fonts');
const fontFiles = readdirSync(fontsDir).filter((f) => f.endsWith('.woff2') || f.startsWith('OFL-'));
for (const app of apps) {
  const pub = resolve(lab, app, 'public');
  mkdirSync(resolve(pub, 'fonts'), { recursive: true });
  mkdirSync(resolve(pub, 'data'), { recursive: true });
  for (const f of fontFiles) copyFileSync(resolve(fontsDir, f), resolve(pub, 'fonts', f));
  writeFileSync(resolve(pub, 'data', 'slim.json'), slimJson);
}

// ---------------------------------------------------------------------------------------------
// 4. Report
// ---------------------------------------------------------------------------------------------

const gz = (s: string): number => gzipSync(s, { level: 9 }).byteLength;
console.log(
  `slim.json: ${String(slim.chapters.length)} chapters, ${String(slim.sections.length)} sections, raw ${String(Buffer.byteLength(slimJson))} B, gzip -9 ${String(gz(slimJson))} B, corpus ${slim.meta.corpus_version}`,
);
console.log(
  `section.json (${SECTION_ID}): ${String(section.items.length)} items, ${String(section.chiffres.length)} chiffres, raw ${String(Buffer.byteLength(JSON.stringify(page)))} B`,
);
console.log(
  `tokens.css: ${String(lines.join('\n').length)} B; fonts copied: ${fontFiles.join(', ')}`,
);
