/**
 * Extract, for a list of glossary terms, every passage of the corpora that mentions them.
 * Output: eval/passages/<slug>.json — the ONLY material a glossary writer may use (T2).
 *
 * Usage: npx tsx scripts/extract-passages.ts [--terms eval/terms-pilot.json] [--out eval/passages]
 * The terms file is an array of { slug, term, aliases: string[] } (aliases are case-insensitive
 * regular expressions, accents significant, matched on NFC text).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { join } from 'node:path';
import type { Dataset, Section, TextItem } from './aec-types.js';

interface TermSpec {
  readonly slug: string;
  readonly term: string;
  readonly aliases: readonly string[];
}

interface CorpusHit {
  readonly id: string;
  readonly kind: string;
  readonly text: string;
  readonly sectionId: string;
  readonly sectionTitle: string;
  readonly sectionUrl: string;
  readonly chapterTitle: string;
  readonly chapeauId: string | null;
  readonly chapeau: string | null;
  readonly parentMeasureId?: string;
}

interface Window {
  readonly excerpt: string;
  readonly offset: number;
}

interface SideHit {
  readonly kind: string;
  readonly title: string;
  readonly url: string;
  readonly date?: string;
  readonly windows: readonly Window[];
  readonly full_text?: string;
}

interface PassageFile {
  readonly meta: {
    readonly term: string;
    readonly slug: string;
    readonly aliases: readonly string[];
    readonly corpus_version: string;
    readonly generated_by: string;
    readonly rule_fr: string;
  };
  readonly corpus: readonly CorpusHit[];
  readonly introduction_and_parts: readonly { id: string; text: string }[];
  readonly livrets_2022: readonly SideHit[];
  readonly desintox: readonly SideHit[];
}

interface LivretsFile {
  readonly items: readonly {
    readonly kind: string;
    readonly slug: string;
    readonly url: string;
    readonly title: string;
    readonly date: string;
    readonly text: string;
  }[];
}

interface DesintoxFile {
  readonly posts: readonly {
    readonly slug: string;
    readonly url: string;
    readonly title: string;
    readonly date: string;
    readonly excerpt_text: string;
    readonly content_text: string;
  }[];
}

const { values } = parseArgs({
  options: {
    terms: { type: 'string', default: 'eval/terms-pilot.json' },
    out: { type: 'string', default: 'eval/passages' },
  },
  strict: true,
});

const termsPath = values.terms;
const outDir = values.out;

const dataset = JSON.parse(readFileSync('data/aec-2025.json', 'utf8')) as Dataset;
const livrets = JSON.parse(readFileSync('data/livrets-2022.json', 'utf8')) as LivretsFile;
const desintox = JSON.parse(readFileSync('data/desintox.json', 'utf8')) as DesintoxFile;
const terms = JSON.parse(readFileSync(termsPath, 'utf8')) as TermSpec[];

const chapterTitle = new Map(dataset.chapters.map((c) => [c.id, c.title]));

function matcher(aliases: readonly string[]): RegExp {
  return new RegExp(aliases.map((a) => `(?:${a})`).join('|'), 'iu');
}

function windows(text: string, re: RegExp, size = 600, max = 5): Window[] {
  const out: Window[] = [];
  const global = new RegExp(re.source, 'giu');
  let m: RegExpExecArray | null;
  let lastEnd = -1;
  while ((m = global.exec(text)) !== null && out.length < max) {
    const start = Math.max(0, m.index - size / 2);
    if (start < lastEnd) continue;
    const end = Math.min(text.length, m.index + m[0].length + size / 2);
    out.push({ excerpt: text.slice(start, end).trim(), offset: m.index });
    lastEnd = end;
  }
  return out;
}

function firstParagraph(section: Section): TextItem | undefined {
  const first = section.items[0];
  return first && first.kind === 'paragraph' ? first : undefined;
}

function scanSection(section: Section, re: RegExp): CorpusHit[] {
  const hits: CorpusHit[] = [];
  const chapeau = firstParagraph(section);
  const base = {
    sectionId: section.id,
    sectionTitle: section.title,
    sectionUrl: section.url,
    chapterTitle: chapterTitle.get(section.chapterId) ?? '',
    chapeauId: chapeau ? chapeau.id : null,
    chapeau: chapeau ? chapeau.text.slice(0, 500) : null,
  };
  const titleMatch = re.test(section.title);
  for (const item of section.items) {
    if (re.test(item.text) || (titleMatch && item.kind !== 'paragraph')) {
      hits.push({ id: item.id, kind: item.kind, text: item.text, ...base });
    }
    if (item.kind === 'measure' && item.subMeasures !== undefined) {
      for (const sub of item.subMeasures) {
        if (re.test(sub.text)) {
          hits.push({ id: sub.id, kind: sub.kind, text: sub.text, parentMeasureId: item.id, ...base });
        }
      }
    }
  }
  for (const ch of section.chiffres) {
    if (re.test(ch.text)) hits.push({ id: ch.id, kind: ch.kind, text: ch.text, ...base });
  }
  return hits;
}

mkdirSync(outDir, { recursive: true });

for (const spec of terms) {
  const re = matcher(spec.aliases);
  const corpus = dataset.sections.flatMap((s) => scanSection(s, re));
  const introParts = [
    ...dataset.introduction.paragraphs.map((p) => ({ id: p.id, text: p.text })),
    ...dataset.parts.flatMap((p) => p.paragraphs.map((q) => ({ id: q.id, text: q.text }))),
  ].filter((p) => re.test(p.text));
  const livretHits: SideHit[] = livrets.items
    .filter((it) => re.test(it.text) || re.test(it.title) || re.test(it.slug))
    .map((it) => {
      const slugMatch = re.test(it.slug.replace(/-/g, ' ')) || re.test(it.title);
      const hit: SideHit = {
        kind: `${it.kind} 2022`,
        title: it.title,
        url: it.url,
        date: it.date,
        windows: windows(it.text, re),
        ...(slugMatch ? { full_text: it.text.slice(0, 12000) } : {}),
      };
      return hit;
    })
    .sort((a, b) => (b.full_text ? 1 : 0) - (a.full_text ? 1 : 0))
    .slice(0, 8);
  const desintoxHits: SideHit[] = desintox.posts
    .filter((p) => re.test(p.title) || re.test(p.content_text))
    .map((p) => ({
      kind: 'désintox',
      title: p.title,
      url: p.url,
      date: p.date,
      windows: windows(p.content_text, re, 500, 3),
    }))
    .slice(0, 6);

  const file: PassageFile = {
    meta: {
      term: spec.term,
      slug: spec.slug,
      aliases: spec.aliases,
      corpus_version: dataset.meta.corpus_version,
      generated_by: 'scripts/extract-passages.ts',
      rule_fr:
        "Seuls les passages « corpus » et « introduction_and_parts » sont le programme 2025 et peuvent être cités mot pour mot. Les passages « livrets_2022 » sont un contexte pédagogique de l'édition 2022 (chiffres périmés) : ils peuvent éclairer une définition mais jamais être présentés comme le programme. Les passages « désintox » servent à la rubrique objection, avec lien.",
    },
    corpus,
    introduction_and_parts: introParts,
    livrets_2022: livretHits,
    desintox: desintoxHits,
  };
  const outPath = join(outDir, `${spec.slug}.json`);
  writeFileSync(outPath, JSON.stringify(file, null, 2));
  console.log(
    `${spec.slug}: corpus ${String(corpus.length)} (sections ${String(new Set(corpus.map((h) => h.sectionId)).size)}), intro/parts ${String(introParts.length)}, livrets ${String(livretHits.length)}, désintox ${String(desintoxHits.length)} → ${outPath}`,
  );
}
