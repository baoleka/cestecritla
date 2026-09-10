/**
 * Build check of the F1 table (defi/defis.json) against the corpus and the red-team rules
 * (07-mecaniques.md §7.11, §8.4, §9.0). Exits 1 on the first violated rule.
 * Run from the repository root: node prototypes/proto/scripts/check-defis.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(new URL('../', import.meta.url).pathname);
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const table = read(path.join(root, 'defi/defis.json'));
const slim = read(path.join(root, 'shared/data/slim.json'));
const riposte = read(path.join(root, 'shared/data/riposte.json'));

// §7.11 rule 11: sensitive sections, never in a game pool.
const SENSITIVE = new Set([
  'c1-s05',
  'c4-s01',
  'c4-s02',
  'c4-s03',
  'c7-s08',
  'c7-s09',
  'c10-s01',
  'c15-s03',
  'c16-s01',
  'c16-s03',
  'c16-s04',
  'c16-s07',
  'c17-s01',
  'c17-s02',
]);
const EXCLUDED_CHAPTERS = new Set(['c17']);
// §7.6: at most one prohibitive form per draw.
const PROHIBITIVE = /^(Interdire|Supprimer|Abolir)\b/u;
const MAX_LENGTH = 130;

const errors = [];
const fail = (msg) => errors.push(msg);

const chapters = new Map(slim.chapters.map((c) => [c.id, c]));
const items = new Map();
for (const s of slim.sections)
  for (const it of s.items) items.set(it.id, { ...it, sectionId: s.id, chapterId: s.chapterId });

const ripIds = new Set();
const walk = (o) => {
  if (Array.isArray(o)) o.forEach(walk);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) {
      if (k.endsWith('ids') && Array.isArray(v)) v.forEach((id) => ripIds.add(id));
      else walk(v);
    }
};
walk(riposte);

if (table.meta.corpus_version !== slim.meta.corpus_version)
  fail(`corpus version ${table.meta.corpus_version} ≠ slim ${slim.meta.corpus_version}`);
if (!(String(table.meta.default) in table.draws))
  fail(`default ${table.meta.default} not in table`);

const dayOfYear = (iso) => {
  const d = new Date(`${iso}T00:00:00Z`);
  return Math.round((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;
};

for (const [n, draw] of Object.entries(table.draws)) {
  if (!/^\d{1,4}$/.test(n)) fail(`${n}: index must match ^\\d{1,4}$`);
  if (dayOfYear(draw.date) !== Number(n) || !draw.date.startsWith(String(table.meta.year)))
    fail(`${n}: date ${draw.date} is not day ${n} of ${table.meta.year}`);
  if (draw.ids.length !== 5) fail(`${n}: ${draw.ids.length} ids, expected 5`);
  const parts = new Set();
  const chaps = new Set();
  let prohibitive = 0;
  for (const id of draw.ids) {
    const it = items.get(id);
    if (!it) {
      fail(`${n}: ${id} not in corpus`);
      continue;
    }
    if (!['measure', 'key_measure'].includes(it.kind)) fail(`${n}: ${id} is a ${it.kind}`);
    if (it.text.length > MAX_LENGTH)
      fail(`${n}: ${id} is ${it.text.length} chars (> ${MAX_LENGTH})`);
    if (/[:;]\s*$/.test(it.text) || it.text.includes(':')) fail(`${n}: ${id} has a colon`);
    if (it.subMeasures?.length) fail(`${n}: ${id} carries sub-measures (measure_split)`);
    if (SENSITIVE.has(it.sectionId)) fail(`${n}: ${id} is in sensitive section ${it.sectionId}`);
    if (EXCLUDED_CHAPTERS.has(it.chapterId))
      fail(`${n}: ${id} is in excluded chapter ${it.chapterId}`);
    if (ripIds.has(id)) fail(`${n}: ${id} is cited in riposte.json`);
    if (PROHIBITIVE.test(it.text)) prohibitive += 1;
    parts.add(chapters.get(it.chapterId).partId);
    chaps.add(it.chapterId);
  }
  if (prohibitive > 1) fail(`${n}: ${prohibitive} prohibitive forms (max 1)`);
  if (parts.size !== 4) fail(`${n}: ${parts.size} parts covered, expected 4`);
  if (chaps.size !== draw.ids.length) fail(`${n}: chapters repeat`);
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`defis.json: ${Object.keys(table.draws).length} draws checked, 0 violation`);
