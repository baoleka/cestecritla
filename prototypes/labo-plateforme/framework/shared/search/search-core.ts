/**
 * Client-side lexical search over the D1.6 slim corpus (MiniSearch), shared by both apps.
 *
 * Both apps load this module with a dynamic `import()` on first interaction with the search box,
 * so MiniSearch and the corpus are never on the critical path (perf-budget.md §1.2-1.3).
 * Normalisation, stop words and stemming are the ones of the T6 retrieval bench
 * (eval/retrieval-core.ts, configuration A) so that the lab measures the real search cost.
 */
import MiniSearch from 'minisearch';
import type { SearchHit, SlimCorpus } from '../types.ts';

const STOPWORDS = new Set(
  `le la les l un une des du de d et ou a au aux en dans pour par sur avec sans sous ce cet cette ces se sa son
   ses leur leurs mon ma mes ton ta tes notre nos votre vos il ils elle elles on nous vous je tu me te moi toi lui y
   qui que quoi qu quel quelle quels
   quelles dont ne pas plus non oui est sont etre ete avoir ai as ont fait faire fais font comme mais donc si
   car ni or ca cela ceci celui celle ceux celles tout tous toute toutes meme memes autre autres aussi encore
   bien tres peu deja jamais toujours entre vers chez ici s c m t j n jusqu lorsqu puisqu
   peut peux peuvent pouvoir pourra pourrai pourrais pourrait pourraient doit doivent devoir devrait faut
   faudra faudrait
   programme propose proposent proposer dit dis dire disent veut veulent vouloir prevoit prevoient prevu prevue
   va vont vais vas aller allait allaient compte comptent vraiment concretement exactement juste truc chose
   choses vrai vraie comment pourquoi combien quand seulement egalement notamment particulierement surtout
   plutot tellement beaucoup moins trop assez`
    .split(/\s+/)
    .filter((w) => w.length > 0),
);

/** Lowercase, NFD accent stripping, unified apostrophes, elisions, digit groups merged. */
export function normalize(text: string): string {
  let s = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'`´]/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/aujourd'hui/g, 'aujourdhui');
  s = s.replace(/\b(l|d|qu|j|n|s|c|m|t|jusqu|lorsqu|puisqu)'(?=[a-z0-9])/g, '');
  let previous = '';
  while (previous !== s) {
    previous = s;
    s = s.replace(/(\d)\s(\d{3})(?!\d)/g, '$1$2');
  }
  return s;
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0);
}

/** Light French stemming (plural, feminine, -aux, -ement). */
export function stem(term: string): string {
  let t = term;
  if (t.length >= 4 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  if (t.length >= 4 && t.endsWith('ee')) t = t.slice(0, -1);
  if (t.length >= 5 && t.endsWith('eaux')) t = t.slice(0, -1);
  else if (t.length >= 5 && t.endsWith('aux')) t = `${t.slice(0, -3)}al`;
  if (t.endsWith('ement') && t.length - 5 >= 4) t = t.slice(0, -5);
  else if (t.endsWith('ent') && !t.endsWith('ement') && t.length - 3 >= 5) t = t.slice(0, -3);
  return t;
}

export function processTerm(term: string): string | null {
  if (STOPWORDS.has(term)) return null;
  if (term.length < 2 && !/\d/.test(term)) return null;
  return stem(term);
}

interface Unit {
  id: string;
  kind: SearchHit['kind'];
  text: string;
  /** Section title, indexed with a lower boost (routing signal). */
  prefix: string;
  sectionId: string;
}

export interface Searcher {
  readonly unitCount: number;
  readonly search: (query: string, limit?: number) => SearchHit[];
}

/** Builds the index once (≈ 1 000 units); call it after the lazy fetch of /data/slim.json. */
export function createSearcher(corpus: SlimCorpus): Searcher {
  const chapterTitle = new Map(corpus.chapters.map((c) => [c.id, c.title]));
  const sectionById = new Map(corpus.sections.map((s) => [s.id, s]));
  const units: Unit[] = [];
  for (const s of corpus.sections) {
    for (const item of s.items) {
      units.push({
        id: item.id,
        kind: item.kind,
        text: item.text,
        prefix: s.title,
        sectionId: s.id,
      });
      for (const sm of item.subMeasures ?? []) {
        units.push({ id: sm.id, kind: sm.kind, text: sm.text, prefix: s.title, sectionId: s.id });
      }
    }
    for (const a of s.chiffres) {
      units.push({ id: a.id, kind: 'chiffre', text: a.text, prefix: s.title, sectionId: s.id });
    }
  }
  const index = new MiniSearch<Unit>({
    fields: ['text', 'prefix'],
    storeFields: ['kind', 'text', 'sectionId'],
    idField: 'id',
    tokenize,
    processTerm,
  });
  index.addAll(units);

  return {
    unitCount: units.length,
    search: (query, limit = 8) => {
      if (query.trim().length === 0) return [];
      const results = index.search(query, {
        fuzzy: (term) => (term.length >= 5 ? 0.2 : false),
        prefix: (term) => term.length >= 3,
        boost: { text: 1, prefix: 0.5 },
        bm25: { k: 1.2, b: 0.75, d: 0.5 },
      });
      return results.slice(0, limit).map((r) => {
        const sec = sectionById.get(String(r['sectionId']));
        return {
          id: String(r.id),
          kind: r['kind'] as SearchHit['kind'],
          text: String(r['text']),
          sectionId: String(r['sectionId']),
          sectionTitle: sec?.title ?? '',
          chapterTitle: sec === undefined ? '' : (chapterTitle.get(sec.chapterId) ?? ''),
          url: sec?.url ?? '',
          score: r.score,
        };
      });
    },
  };
}
