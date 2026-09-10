/**
 * Build the F2 « Laquelle est ici ? » triplets for the 89 sections (07-mecaniques.md §7.3, §7.11, §8.3, §9.0).
 *
 * Run from the repository root:  node prototypes/proto/scripts/build-triplets.mjs
 *
 * Output: prototypes/proto/shared/data/quiz-triplets.json
 *   { meta, triplets: { [sectionId]: { options: [idA, idB, idC], here: id, hand_composed } } }
 *
 * Only ids travel: the page resolves every text from the corpus by id (nothing is retyped here).
 *
 * Rules applied (every one is a build test; a failure aborts):
 *   - the option that is « ici » is a key_measure or measure of the section itself;
 *   - the two decoys are real measures of other sections, from the « vie quotidienne » pool
 *     (sections tagged with a life situation or an everyday theme, never international / peace,
 *     immigration / asylum, security / police, defence, secularism, LGBTQIA+, never c15-s03,
 *     never a sensitive section of §7.11 rule 11), from a different chapter than the section and
 *     than each other, in the same part or a neighbouring part;
 *   - every option is self-contained (§7.11 rule 1): no item ending with « : » « ; » or « , »,
 *     no head of a measure_split (items with sub-measures), no demonstrative without antecedent,
 *     no item cut on a function word (source truncations, D1.8: readable in their section only);
 *   - Jaccard similarity (word sets, normalised) < 0.4 between any two options;
 *   - no two options in the same riposte entry (same objection);
 *   - options <= MAX_LENGTH characters when the section allows it (readability of a triplet);
 *   - draw and A/B/C order by a deterministic seed per section (FNV-1a of corpus:section:seed);
 *   - hand-composed triplets of §9.0 for c12-s01 (order of §9.2 kept: the « ici » one in A) and c12-s02;
 *     their decoys were reviewed by a human, so only the mechanical theme filter is waived for them.
 *
 * The question is asked on every section, sensitive ones included (D5.12); the sensitive list only
 * removes sections from the decoy pool and from the pre-generated /q/ share card.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..', '..', '..');
const dataDir = resolve(here, '..', 'shared', 'data');

const SEED = 'j3-2026-09-10';
const MAX_LENGTH = 140;
const JACCARD_MAX = 0.4;

/** §7.11 rule 11 (D5.8): never in a game pool, never a decoy, never on a game share card. */
export const SENSITIVE_SECTIONS = [
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
];

/** §7.3: everyday themes that qualify a section for the decoy pool. */
const EVERYDAY_THEMES = [
  'salaires',
  'logement',
  'santé',
  'école / éducation',
  'transports',
  'consommation / déchets',
  'sport',
  'culture',
  'eau',
  'alimentation / agriculture',
];
/** §7.3: themes that exclude a section from the decoy pool whatever its other tags. */
const EXCLUDED_THEMES = [
  'international / paix',
  'immigration / asile',
  'sécurité / police',
  'défense / armée',
  'laïcité',
  'LGBTQIA+',
];

/** §9.0: hand-composed triplets of the prototype (sets checked by the same rules below). */
const OVERRIDES = {
  'c12-s01': { here: 'c12-s01-m03', decoys: ['c5-s02-m06', 'c18-s01-m02'], order: 'as-is' },
  'c12-s02': { here: 'c12-s02-m08', decoys: ['c8-s02-m02', 'c16-s12-m02'], order: 'seeded' },
};

const slim = JSON.parse(readFileSync(resolve(dataDir, 'slim.json'), 'utf8'));
const tags = JSON.parse(readFileSync(resolve(repoRoot, 'data', 'section-tags.json'), 'utf8'));
const riposte = JSON.parse(readFileSync(resolve(repoRoot, 'data', 'riposte.json'), 'utf8'));

if (tags.meta.corpus_version !== slim.meta.corpus_version)
  throw new Error('section-tags.json and slim.json come from different corpus versions');

/* ---------- Index ---------- */
const chapters = new Map(slim.chapters.map((c) => [c.id, c]));
const partOrder = (partId) => Number(partId.replace('part', ''));
const sections = new Map();
const items = new Map();
for (const s of slim.sections) {
  const chapter = chapters.get(s.chapterId);
  sections.set(s.id, { ...s, part: partOrder(chapter.partId) });
  for (const it of s.items) items.set(it.id, { ...it, sectionId: s.id, chapterId: s.chapterId });
}
const tagsById = new Map(tags.sections.map((s) => [s.id, s]));
const ripostesByItem = new Map();
for (const e of riposte.entries)
  for (const id of e.measure_ids) ripostesByItem.set(id, [...(ripostesByItem.get(id) ?? []), e.id]);

/* ---------- Self-contained filter (§7.11 rule 1) ---------- */
const DEMONSTRATIVE = /(?:^|[\s«(])(?:cette|ces|cet)\s/iu;
const CE_NOUN = /(?:^|[\s«(])ce\s(?!qu[ei’']|que\b|qui\b|dont\b)/iu;
/** Source items cut before their continuation paragraph (c1-s03-m01 « … notamment en », c10-s03-k01 « … pour une »). */
const DANGLING_END =
  /(?:^|\s)(?:en|et|de|des|du|à|par|pour|sur|dans|notamment|ou|les|la|le|un|une|au|aux|avec|sans|entre|vers|selon|dont|que|qui)\s*$/iu;
function selfContained(item) {
  if (item.kind !== 'key_measure' && item.kind !== 'measure') return false;
  if (item.subMeasures?.length) return false;
  const text = item.text.trim();
  if (/[:;,]$/u.test(text) || DANGLING_END.test(text)) return false;
  if (DEMONSTRATIVE.test(text) || CE_NOUN.test(text)) return false;
  return true;
}

/* ---------- Similarity ---------- */
const words = (text) =>
  new Set(
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/u)
      .filter((w) => w.length > 2),
  );
function jaccard(a, b) {
  const A = words(a);
  const B = words(b);
  let inter = 0;
  for (const w of A) if (B.has(w)) inter += 1;
  const union = A.size + B.size - inter;
  return union === 0 ? 0 : inter / union;
}

/* ---------- Deterministic draw ---------- */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rngFor = (sectionId) => mulberry32(fnv1a(`${slim.meta.corpus_version}:${sectionId}:${SEED}`));
function shuffle(list, rng) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/* ---------- Pools ---------- */
const sensitive = new Set(SENSITIVE_SECTIONS);
for (const id of sensitive)
  if (!sections.has(id)) throw new Error(`unknown sensitive section ${id}`);

function everyday(sectionId) {
  if (sensitive.has(sectionId) || sectionId === 'c15-s03') return false;
  const tg = tagsById.get(sectionId);
  if (!tg) return false;
  if (tg.themes.some((t) => EXCLUDED_THEMES.includes(t))) return false;
  return tg.life_situations.length > 0 || tg.themes.some((t) => EVERYDAY_THEMES.includes(t));
}
const everydaySections = [...sections.keys()].filter(everyday);
const decoyPool = everydaySections.flatMap((sid) =>
  sections
    .get(sid)
    .items.filter((it) => selfContained(it) && it.text.length <= MAX_LENGTH)
    .map((it) => items.get(it.id)),
);

function compatible(a, b) {
  if (a.sectionId === b.sectionId || a.chapterId === b.chapterId) return false;
  if (jaccard(a.text, b.text) >= JACCARD_MAX) return false;
  const ra = ripostesByItem.get(a.id) ?? [];
  const rb = ripostesByItem.get(b.id) ?? [];
  return !ra.some((r) => rb.includes(r));
}

/* ---------- Build ---------- */
function pickHere(section, rng) {
  const eligible = section.items.filter(selfContained);
  if (!eligible.length) throw new Error(`${section.id}: no self-contained measure`);
  const short = eligible.filter((it) => it.text.length <= MAX_LENGTH);
  const pool = short.length ? short : [eligible.sort((a, b) => a.text.length - b.text.length)[0]];
  return items.get(pool[Math.floor(rng() * pool.length)].id);
}

function pickDecoys(section, hereItem, rng) {
  const candidates = shuffle(
    decoyPool.filter(
      (it) =>
        Math.abs(sections.get(it.sectionId).part - section.part) <= 1 &&
        it.chapterId !== section.chapterId &&
        compatible(it, hereItem),
    ),
    rng,
  );
  for (let i = 0; i < candidates.length; i += 1)
    for (let j = i + 1; j < candidates.length; j += 1)
      if (compatible(candidates[i], candidates[j])) return [candidates[i], candidates[j]];
  throw new Error(`${section.id}: no compatible decoy pair`);
}

function check(section, hereItem, decoys, { reviewed = false } = {}) {
  const all = [hereItem, ...decoys];
  if (hereItem.sectionId !== section.id) throw new Error(`${section.id}: « ici » is elsewhere`);
  for (const it of all)
    if (!selfContained(it)) throw new Error(`${section.id}: ${it.id} not self-contained`);
  for (const d of decoys) {
    // Hand-composed sets were reviewed by a human (§9.0): the mechanical theme filter is superseded
    // for them (the tagger marks c18-s01 and c16-s12 « international / paix »), the hard rules are not.
    if (sensitive.has(d.sectionId))
      throw new Error(`${section.id}: decoy ${d.id} is a sensitive section`);
    if (!reviewed && !everyday(d.sectionId))
      throw new Error(`${section.id}: decoy ${d.id} outside the everyday pool`);
    if (d.chapterId === section.chapterId)
      throw new Error(`${section.id}: decoy ${d.id} same chapter`);
    if (Math.abs(sections.get(d.sectionId).part - section.part) > 1)
      throw new Error(`${section.id}: decoy ${d.id} not in a neighbouring part`);
  }
  for (let i = 0; i < all.length; i += 1)
    for (let j = i + 1; j < all.length; j += 1)
      if (!compatible(all[i], all[j]))
        throw new Error(`${section.id}: ${all[i].id} / ${all[j].id} incompatible`);
}

const triplets = {};
let maxJaccard = 0;
for (const sectionId of sections.keys()) {
  const section = sections.get(sectionId);
  const rng = rngFor(sectionId);
  const override = OVERRIDES[sectionId];
  const hereItem = override ? items.get(override.here) : pickHere(section, rng);
  const decoys = override
    ? override.decoys.map((id) => items.get(id))
    : pickDecoys(section, hereItem, rng);
  check(section, hereItem, decoys, { reviewed: Boolean(override) });
  const set = [hereItem, ...decoys];
  for (let i = 0; i < set.length; i += 1)
    for (let j = i + 1; j < set.length; j += 1)
      maxJaccard = Math.max(maxJaccard, jaccard(set[i].text, set[j].text));
  const ordered = override?.order === 'as-is' ? set : shuffle(set, rng);
  triplets[sectionId] = {
    options: ordered.map((it) => it.id),
    here: hereItem.id,
    hand_composed: Boolean(override),
  };
}

const out = {
  meta: {
    corpus_version: slim.meta.corpus_version,
    seed: SEED,
    generator: 'prototypes/proto/scripts/build-triplets.mjs',
    count: Object.keys(triplets).length,
    max_length: MAX_LENGTH,
    jaccard_max: JACCARD_MAX,
    max_jaccard_observed: Number(maxJaccard.toFixed(3)),
    everyday_pool: { sections: everydaySections.length, measures: decoyPool.length },
    sensitive_sections: SENSITIVE_SECTIONS,
    hand_composed: Object.keys(OVERRIDES),
    review_fr:
      'HYPOTHÈSE : 87 triplets tirés par graine et non relus (la revue humaine des 89 triplets « légende hostile possible ? » est un test de build de la v1, §8.3) ; c12-s01 et c12-s02 composés à la main (§9.0).',
    rules_fr: [
      'Option « ici » : mesure clé ou mesure de la section, autoportante (§7.11 règle 1).',
      'Deux leurres : mesures réelles d’autres sections du pool « vie quotidienne » (situation de vie ou thème salaires, logement, santé, école, transports, consommation, sport, culture, eau, alimentation), jamais international / paix, immigration / asile, sécurité / police, défense, laïcité, LGBTQIA+, jamais c15-s03 ni une section sensible.',
      'Chapitre différent de la section et entre les deux leurres ; même partie ou partie voisine.',
      'Jaccard < 0,4 entre deux options ; aucune paire dans la même objection de riposte.',
      'Options ≤ 140 caractères quand la section le permet.',
      'Tirage et ordre A/B/C par graine déterministe (FNV-1a de « version du corpus : section : graine »), identiques pour tout le monde.',
    ],
  },
  triplets,
};
writeFileSync(resolve(dataDir, 'quiz-triplets.json'), JSON.stringify(out));
console.log(
  `quiz-triplets.json: ${out.meta.count} triplets, everyday pool ${everydaySections.length} sections / ${decoyPool.length} measures, max Jaccard ${out.meta.max_jaccard_observed}`,
);
