/**
 * C'est écrit là — shared runtime for the clickable prototypes (J3).
 *
 * Plain ES module, no framework, no bundler (the framework decision is measured in T7).
 * Rules applied here:
 *   - every piece of programme text comes from the corpus by id (slim.json + extras.json), never retyped;
 *   - app strings come from design/strings.json (copied to data/strings.json) with the v0.2 overrides
 *     listed in STRINGS_V02 (D3.12: impersonal link-arrival screen; correction 7: title <= 6 words);
 *   - no network call except the static files of this prototype; no analytics; state lives in the
 *     URL (hash / query) and, for reading progression only, in localStorage (no PII, no timestamp);
 *   - share = navigator.share -> clipboard copy -> wa.me link (S1: the app is complete without Web Share);
 *   - effectiveDate() / silence() are the L49 stubs (D0.24): production reads the KV flag.
 */

const SHARED = new URL('./', import.meta.url);
const ROOT = new URL('../', import.meta.url);

export const APP = Object.freeze({
  name: 'C’est écrit là',
  domain: 'cestecritla.fr',
  wordmark: ['C’EST ÉCRIT', 'LÀ'],
  corpusSource: 'https://melenchon2027.fr/programme2025/livre/',
  licenseUrl: 'https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr',
});

const withRoot = (rel) => ROOT.pathname + rel;

/** Routes of the prototype (the production table is D5.10; here every module is a folder with an index.html). */
export const routes = Object.freeze({
  root: withRoot(''),
  home: withRoot('home/'),
  riposte: withRoot('riposte/'),
  section: (sectionId, itemId) =>
    withRoot(`section/?id=${encodeURIComponent(sectionId)}`) + (itemId ? `#${itemId}` : ''),
  link: (itemId) => withRoot(`link/?id=${encodeURIComponent(itemId)}`),
  concept: (slug) => withRoot(`concept/?slug=${encodeURIComponent(slug)}`),
  search: (q) => withRoot('home/') + (q ? `#q=${encodeURIComponent(q)}` : '#q'),
});

/** Absolute URL of a route, for share sheets and wa.me links. */
export const absolute = (path) => new URL(path, location.href).href;

/* ------------------------------------------------------------------ */
/* Strings                                                              */
/* ------------------------------------------------------------------ */

/**
 * v0.2 proposals on top of design/strings.json v0 (to be judged in T9 / T11, D3.7).
 * Kept here, in one place, so the deltas with the kit are visible.
 */
export const STRINGS_V02 = Object.freeze({
  // D3.12: the link-arrival screen is impersonal; the tu appears once inside.
  'home.link.sent_by_hint': 'Ce passage vient du livre officiel.',
  // Correction 7: display title <= 6 words on the link-arrival screen (home.link.title has 8).
  'home.link.title_short': 'Mot pour mot.',
  'home.link.reading_time': 'Trois minutes, sans compte ni pub.',
  // Correction 7 + D3.9 (from C): privacy line on the link-arrival screen, impersonal form.
  'privacy.no_account_impersonal':
    'Pas de compte, pas de cookie de suivi, aucune trace des questions posées.',
  // 07-mecaniques.md §8.6: the local-search promise shown next to the field.
  'search.local_promise': 'Ce que tu tapes reste sur ton téléphone.',
  // Correction 18: neutral progression mark for the v1 (the turtle is not named).
  'progress.section_done': 'Section lue.',
  'progress.section_position': 'Section {n} sur {total} · Chapitre {chapter}',
  'progress.sections_opened': '{count} sections ouvertes sur {total}',
  'progress.chapters_read': '{read} chapitres sur {total} parcourus',
  'progress.chapter_read_one': '1 chapitre sur {total} parcouru',
  // Section reader.
  'section.measures_count': '{count} mesures',
  'section.measure_count_one': '1 mesure',
  'section.previous': 'Section précédente',
  'section.next_in_book': 'La suivante dans le livre',
  'section.unknown': 'Cette section n’existe pas.',
  'section.unknown_lead': 'Le programme, lui, est entier : cherche un mot ou reviens à l’accueil.',
  'section.share_this': 'Envoyer',
  // Concept card (D3.10, correction 17).
  'concept.explorable_title': 'Un concept en 20 secondes',
  'concept.explorable_hint':
    'Le curseur n’a pas d’unité : il montre le principe, pas des chiffres.',
  'concept.explorable_nature': 'Ce que la nature refait sur une période donnée',
  'concept.explorable_take': 'Ce qu’on prend',
  'concept.explorable_limit': 'La limite',
  'concept.explorable_less': 'moins',
  'concept.explorable_same': 'autant',
  'concept.explorable_more': 'plus',
  'concept.explorable_under': 'Sous la limite.',
  'concept.explorable_under_lead':
    'On prend moins que ce que la nature refait sur une période donnée. La règle verte est respectée.',
  'concept.explorable_at': 'À la limite.',
  'concept.explorable_at_lead':
    'On prend tout juste ce que la nature refait sur une période donnée. « Pas davantage » : la règle verte tient encore.',
  'concept.explorable_over': 'Au-delà de la limite.',
  'concept.explorable_over_lead':
    'On prend plus que ce que la nature refait sur une période donnée. C’est ce que la règle verte interdit.',
  'concept.explorable_slider_label': 'Ce qu’on prend, par rapport à ce que la nature refait',
  'concept.label.context_2022': 'Contexte 2022',
  'concept.see_principle': 'Voir le principe',
  'concept.unknown': 'Cette carte n’existe pas encore.',
  // Link-arrival screen.
  'link.unknown': 'Ce passage n’existe pas.',
  'link.unknown_lead':
    'Le lien est peut-être incomplet. Le programme, lui, est entier : cherche un mot.',
  'link.read_section': 'Lire la section',
  // Home.
  'home.direct.search_label': 'Chercher',
  'daily.method':
    'Chaque jour, une mesure clé est tirée parmi les {count} du livre : empreinte FNV-1a de « version du corpus : date UTC », modulo {count}. Même tirage pour tout le monde, aucune donnée envoyée.',
  'daily.date': 'Mesure du {date}',
  'riposte.entry_lead': 'Une objection, la mesure exacte.',
  // Riposte module (T8, D5.11 labels; 10-riposte.md §5; 07-mecaniques.md §7.4).
  'riposte.heard_label': 'Ce qu’on entend souvent',
  'riposte.train': 'S’entraîner',
  'riposte.train_hint':
    'Dix secondes par objection, sans score ni classement. Rien n’est enregistré.',
  'riposte.train_kicker': 'Entraînement · dix secondes par objection',
  'riposte.position': '{n} sur {total}',
  'riposte.liant_label': 'En clair (reformulé)',
  'riposte.desintox_label': 'Désintox',
  'riposte.desintox_lead':
    'La France insoumise y répond en détail sur desintox.lafranceinsoumise.fr.',
  'riposte.desintox_offline': 'Ce lien demande le réseau.',
  'riposte.reversal_label': 'Ce qu’il vaut mieux ne pas dire',
  'riposte.themes': 'Thèmes',
  'riposte.back_themes': 'Retour aux thèmes',
  'riposte.back_label': 'Retour à la riposte',
  'riposte.done_title': 'Série terminée.',
  'riposte.done_lead':
    'Les mêmes objections reviennent demain, dans un autre ordre. Aucun score, rien d’enregistré.',
  'riposte.restart': 'Recommencer',
  'riposte.unknown': 'Cette riposte n’existe pas.',
  'riposte.unknown_lead': 'Le lien est peut-être incomplet. Les objections, elles, sont toutes là.',
  'riposte.rewrite_notice':
    'Objection à reformuler avant la session 2 (D5.11) : retirée de la grille, visible par identifiant seulement.',
  'riposte.attribution': 'Texte : L’Avenir en commun (La France insoumise), CC BY-NC-SA 4.0',
  'share.measure_text': 'C’est écrit là, mot pour mot, dans L’Avenir en commun 2025 :',
  'share.concept_text': 'La « {term} », expliquée en clair et mot pour mot :',
});

let strings = null;
let stringsPromise = null;

const fetchJson = (rel) =>
  fetch(new URL(rel, SHARED)).then((r) => {
    if (!r.ok) throw new Error(`${rel}: HTTP ${r.status}`);
    return r.json();
  });

/** Load the string kit once (design/strings.json + STRINGS_V02). */
export function loadStrings() {
  stringsPromise ??= fetchJson('data/strings.json').then((kit) => {
    strings = { ...kit, ...STRINGS_V02 };
    return strings;
  });
  return stringsPromise;
}

/** French typography at render time (voice.md §6): apostrophe ’, U+00A0 before « ? ! : ; » and inside « ». */
export function frTypo(text) {
  return String(text)
    .replace(/'/g, '’')
    .replace(/ ([?!:;»])/g, ' $1')
    .replace(/« /g, '« ')
    .replace(/(\d) %/g, '$1 %');
}

/** Translate a key with ICU-like {placeholders}; unknown key -> the key itself (visible defect, on purpose). */
export function t(key, params = {}) {
  const raw = strings?.[key] ?? key;
  const filled = raw.replace(/\{(\w+)\}/g, (m, k) =>
    k in params ? String(params[k]) : k === 'appName' ? APP.name : m,
  );
  return frTypo(filled);
}

/* ------------------------------------------------------------------ */
/* Corpus                                                               */
/* ------------------------------------------------------------------ */

let corpus = null;
let corpusPromise = null;

const KIND_LABEL_KEY = {
  key_measure: 'measure.key_label',
  measure: 'measure.label',
  sub_measure: 'measure.label',
  paragraph: null,
  chiffre: 'statcard.label',
};

function buildIndex(slim, extras, concepts) {
  const parts = new Map(extras.parts.map((p) => [p.id, { ...p, chapters: [] }]));
  const chapters = new Map();
  const sections = new Map();
  const items = new Map();
  const order = [];

  for (const c of slim.chapters) {
    const name = c.title.replace(/^Chapitre\s+\d+\s*:\s*/u, '');
    const chapter = { ...c, name, sectionIds: [] };
    chapters.set(c.id, chapter);
    parts.get(c.partId)?.chapters.push(c.id);
  }
  slim.sections.forEach((s, index) => {
    const chapter = chapters.get(s.chapterId);
    const section = {
      ...s,
      partId: chapter.partId,
      index,
      chapterIndex: chapter.sectionIds.length,
      measureIds: [],
    };
    chapter.sectionIds.push(s.id);
    sections.set(s.id, section);
    order.push(s.id);
    for (const it of s.items) {
      const item = { ...it, sectionId: s.id };
      items.set(it.id, item);
      if (it.kind !== 'paragraph') section.measureIds.push(it.id);
      for (const sm of it.subMeasures ?? [])
        items.set(sm.id, { ...sm, sectionId: s.id, parentId: it.id });
    }
    for (const a of s.chiffres)
      items.set(a.id, { kind: 'chiffre', id: a.id, text: a.text, sectionId: s.id });
  });
  for (const p of extras.introduction.paragraphs)
    items.set(p.id, { ...p, sectionId: null, intro: true });

  const keyMeasureIds = order.flatMap((id) =>
    sections
      .get(id)
      .items.filter((i) => i.kind === 'key_measure')
      .map((i) => i.id),
  );

  return {
    meta: slim.meta,
    introduction: {
      id: extras.introduction.id,
      title: extras.introduction.title,
      url: extras.introduction.url,
    },
    parts,
    chapters,
    sections,
    items,
    order,
    keyMeasureIds,
    concepts: concepts.entries,
  };
}

/** Load slim.json + extras.json + concept-index.json once and build the in-memory index by id. */
export function loadCorpus() {
  corpusPromise ??= Promise.all([
    fetchJson('data/slim.json'),
    fetchJson('data/extras.json'),
    fetchJson('data/concept-index.json'),
  ]).then(([slim, extras, concepts]) => {
    corpus = buildIndex(slim, extras, concepts);
    return corpus;
  });
  return corpusPromise;
}

/** Load strings and corpus together. */
export const init = () => Promise.all([loadStrings(), loadCorpus()]).then(() => corpus);

function ensureCorpus() {
  if (!corpus) throw new Error('loadCorpus() must be awaited first');
  return corpus;
}

export const getSection = (id) => ensureCorpus().sections.get(id);
export const getItem = (id) => ensureCorpus().items.get(id);
export const getChapter = (id) => ensureCorpus().chapters.get(id);
export const getPart = (id) => ensureCorpus().parts.get(id);
export const getCorpus = () => ensureCorpus();

/** Section id -> its position among the 89, its chapter and part; item id -> the same plus the item. */
export function locate(idOrItem) {
  const c = ensureCorpus();
  // Raw slim items (from section.items) carry no sectionId: always resolve through the index.
  const item =
    typeof idOrItem === 'string' ? c.items.get(idOrItem) : (c.items.get(idOrItem?.id) ?? idOrItem);
  if (!item) return null;
  if (item.intro) return { item, section: null, chapter: null, part: null, intro: c.introduction };
  const section = c.sections.get(item.sectionId);
  const chapter = c.chapters.get(section.chapterId);
  const part = c.parts.get(chapter.partId);
  return { item, section, chapter, part, intro: null };
}

/** « Chapitre 12 · Planification écologique · La bifurcation écologique pour une société de l’harmonie » */
export function locationLine(idOrItem) {
  const loc = locate(idOrItem);
  if (!loc) return '';
  if (loc.intro) return loc.intro.title;
  return `Chapitre ${loc.chapter.number} · ${loc.chapter.name} · ${loc.section.title}`;
}

export const kindLabel = (item) => (KIND_LABEL_KEY[item.kind] ? t(KIND_LABEL_KEY[item.kind]) : '');

/** Concept cards (glossary) that cite this item, if any. */
export function conceptsFor(itemId) {
  return ensureCorpus().concepts.filter(
    (e) =>
      e.verbatim_ids.includes(itemId) ||
      e.related_measure_ids.includes(itemId) ||
      e.support_ids.includes(itemId),
  );
}

/* ------------------------------------------------------------------ */
/* Normalisation and search                                             */
/* ------------------------------------------------------------------ */

/** Per-character normalisation that keeps string length (so matches map back to the original text). */
export function normalizeChar(ch) {
  if (ch === '’' || ch === '‘') return "'";
  if (ch === ' ' || ch === ' ') return ' ';
  const base = ch.normalize('NFD');
  return (base.charAt(0) || ch).toLowerCase();
}
export const normalize = (s) => Array.from(String(s), normalizeChar).join('');

let searchIndex = null;

function buildSearchIndex(c) {
  const entries = [];
  for (const sectionId of c.order) {
    const s = c.sections.get(sectionId);
    entries.push({
      kind: 'section',
      id: s.id,
      text: s.title,
      norm: normalize(s.title),
      sectionId: s.id,
    });
  }
  for (const ch of c.chapters.values())
    entries.push({
      kind: 'chapter',
      id: ch.id,
      text: ch.name,
      norm: normalize(ch.name),
      sectionId: ch.sectionIds[0],
    });
  for (const sectionId of c.order) {
    const s = c.sections.get(sectionId);
    for (const it of s.items) {
      if (it.kind === 'paragraph') continue;
      entries.push({
        kind: it.kind,
        id: it.id,
        text: it.text,
        norm: normalize(it.text),
        sectionId: s.id,
      });
      for (const sm of it.subMeasures ?? [])
        entries.push({
          kind: 'sub_measure',
          id: sm.id,
          text: sm.text,
          norm: normalize(sm.text),
          sectionId: s.id,
        });
    }
  }
  return entries;
}

const KIND_RANK = {
  concept: 0,
  section: 1,
  chapter: 2,
  key_measure: 3,
  measure: 4,
  sub_measure: 5,
};

/**
 * Tiny lexical match (substring on normalised text) over titles + measures; <= limit results.
 * Returns [{ kind, id, text, sectionId, match: [start, end] | null, slug?, term? }].
 */
export function search(query, { limit = 10 } = {}) {
  const c = ensureCorpus();
  const q = normalize(query).trim().replace(/\s+/g, ' ');
  if (q.length < 2) return [];
  searchIndex ??= buildSearchIndex(c);
  const results = [];
  for (const e of c.concepts) {
    if (
      e.aliases.some((a) => normalize(a) === q) ||
      (q.length >= 4 && normalize(e.term).includes(q))
    ) {
      results.push({
        kind: 'concept',
        id: e.slug,
        slug: e.slug,
        term: e.term,
        text: e.term,
        sectionId: null,
        match: null,
      });
    }
  }
  for (const e of searchIndex) {
    const at = e.norm.indexOf(q);
    if (at === -1) continue;
    results.push({ ...e, match: [at, at + q.length] });
  }
  results.sort((a, b) => KIND_RANK[a.kind] - KIND_RANK[b.kind]);
  return results.slice(0, limit);
}

/* ------------------------------------------------------------------ */
/* DOM helpers                                                          */
/* ------------------------------------------------------------------ */

/** el('p', { class: 'x', text: '…' }, [children]) */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'text') node.textContent = v;
    else if (k === 'html')
      node.innerHTML = v; // only for trusted static markup (icons)
    else if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child == null || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

const ARROW_SVG =
  '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10h13M11 5l5 5-5 5"/></svg>';

/** Navigation button (arrow block, rule 8) or plain action button. */
export function button({
  label,
  href,
  onClick,
  primary = true,
  arrow = false,
  center = !arrow,
  attrs = {},
}) {
  const cls = `btn${primary ? '' : ' secondary'}${center ? ' center' : ''}`;
  const node = href
    ? el('a', { class: cls, href, ...attrs })
    : el('button', { class: cls, type: 'button', ...attrs });
  node.append(el('span', { class: 't', text: label }));
  if (arrow) node.append(el('span', { class: 'arrow', html: ARROW_SVG }));
  if (onClick) node.addEventListener('click', onClick);
  return node;
}

/** Text with <mark> around a [start, end] range (indices on the original text). */
export function markedText(text, range) {
  const frag = document.createDocumentFragment();
  if (!range) {
    frag.append(text);
    return frag;
  }
  const [a, b] = range;
  frag.append(text.slice(0, a), el('mark', { text: text.slice(a, b) }), text.slice(b));
  return frag;
}

/** Find the first occurrence of a query in text (normalised) as a [start, end] range, or null. */
export function findRange(text, query) {
  if (!query) return null;
  const at = normalize(text).indexOf(normalize(query));
  return at === -1 ? null : [at, at + query.length];
}

/**
 * Verbatim block in Gowun Batang: « Texte du programme » label, the text (sub-measures nested),
 * the chapter › section line and « Lire la section » (D3.2, D2.4).
 */
export function formatVerbatim(
  idOrItem,
  {
    variant = '',
    label = true,
    readLink = true,
    highlight = null,
    kind = false,
    anchor = false,
    share = null,
  } = {},
) {
  const loc = locate(idOrItem);
  if (!loc) return el('p', { class: 'small', text: t('link.unknown') });
  const { item, section } = loc;
  const node = el('blockquote', {
    class: `verbatim ${variant}`.trim(),
    dataset: { id: item.id },
    id: anchor ? item.id : null,
    lang: 'fr',
  });
  if (label)
    node.append(
      el('span', {
        class: 'label',
        text: kind && kindLabel(item) ? kindLabel(item) : t('concept.label.verbatim'),
      }),
    );
  node.append(
    el('p', {}, markedText(item.text, highlight ? findRange(item.text, highlight) : null)),
  );
  if (item.subMeasures?.length)
    node.append(
      el(
        'ol',
        { class: 'sub' },
        item.subMeasures.map((sm) => el('li', { text: sm.text, dataset: { id: sm.id } })),
      ),
    );
  const locNode = el('span', { class: 'loc', text: locationLine(item) });
  node.append(locNode);
  if (readLink && section) {
    node.append(' ');
    node.append(
      el('a', {
        class: 'read',
        href: routes.section(section.id, item.id),
        text: t('link.read_section'),
      }),
    );
  }
  if (share) node.append(share);
  return node;
}

/** Chapeau (paragraph item) in Gowun Batang without the box. */
export function formatChapeau(item) {
  return el('p', { class: 'chapeau', text: item.text, dataset: { id: item.id }, lang: 'fr' });
}

/* ------------------------------------------------------------------ */
/* StatCard (loi 77-808, D5.5, D5.8, correction 11)                     */
/* ------------------------------------------------------------------ */

let statCardsPromise = null;
/** stat-cards.json + the prototype sidecar (stat-cards-legal.json), indexed by id. */
export function loadStatCards() {
  statCardsPromise ??= Promise.all([
    fetchJson('data/stat-cards.json'),
    fetchJson('data/stat-cards-legal.json'),
  ]).then(([cards, legal]) => ({
    byId: new Map(cards.cards.map((c) => [c.id, c])),
    bySection: cards.cards.reduce(
      (m, c) => (m.set(c.section_id, [...(m.get(c.section_id) ?? []), c]), m),
      new Map(),
    ),
    sidecar: legal.cards,
  }));
  return statCardsPromise;
}

/** « À savoir » card: verbatim figure, then the 77-808 line (organisation, dates, sponsor or « non précisé »), margin, source link. */
export function statCard(
  card,
  { sidecar = null, collapsed = false, sectionUrl = null, label = null } = {},
) {
  const heading = label ?? t('statcard.label');
  const wrap = collapsed
    ? el('details', { class: 'statcard', dataset: { id: card.id } })
    : el('aside', {
        class: 'statcard',
        dataset: { id: card.id },
        'aria-label': heading,
      });
  if (collapsed) wrap.append(el('summary', { text: `${heading} : ${card.citation_text}` }));
  else wrap.append(el('span', { class: 'label', text: heading }));
  const m = card.text.match(/^(\d+(?:[,.]\d+)?\s?%)(.*)$/s);
  const figure = el('p', { class: 'figure', lang: 'fr' });
  if (m) figure.append(el('strong', { text: m[1] }), m[2]);
  else figure.append(card.text);
  wrap.append(figure);
  const chapter = `chapitre ${card.chapter_id.replace(/^c/, '')}`;
  const legal = sidecar
    ? `${t('statcard.legal.full', { organisation: sidecar.organisation, dates: sidecar.dates, sponsor: sidecar.sponsor, chapter })} ${sidecar.sample ? sidecar.sample + '.' : ''}`.trim()
    : t('statcard.legal.no_sponsor', {
        organisation: card.legal_77_808.organisme,
        dates: card.legal_77_808.dates,
        chapter,
      });
  wrap.append(el('p', { class: 'legal', text: legal }));
  wrap.append(el('p', { class: 'legal', text: t('statcard.legal.margin') }));
  if (sectionUrl)
    wrap.append(
      el(
        'p',
        { class: 'src' },
        el('a', { href: sectionUrl, rel: 'noopener', text: t('statcard.legal.source_link') }),
      ),
    );
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Share: navigator.share -> clipboard -> wa.me (S1)                    */
/* ------------------------------------------------------------------ */

export const waLink = (text, url) =>
  `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`.trim())}`;

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return false;
}

/** Level 1 -> 2 -> 3. Resolves with 'shared' | 'aborted' | 'copied' | 'whatsapp'. */
export async function share({ title, text, url }) {
  const data = { title, text, url };
  if (navigator.share && (!navigator.canShare || navigator.canShare(data))) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (err) {
      if (err?.name === 'AbortError') return 'aborted';
    }
  }
  try {
    if (await copyText(`${text} ${url}`.trim())) {
      toast(t('share.fallback_copy'));
      return 'copied';
    }
  } catch {
    /* clipboard denied: fall through */
  }
  location.href = waLink(text, url);
  return 'whatsapp';
}

/**
 * Share group: primary button (Web Share when available, otherwise « Envoyer sur WhatsApp »),
 * « Copier le lien » underneath. Under electoral silence (D0.24) the group is replaced by silence.share.
 */
export function shareButton({ title, text, url, label = null, primary = true }) {
  const wrap = el('div', { class: 'share' });
  const s = silence();
  if (s.active) {
    wrap.append(
      el('p', { class: 'notice', text: t('silence.share', { reopenTime: s.reopenTime }) }),
    );
    return wrap;
  }
  const canWebShare = typeof navigator.share === 'function';
  const main = canWebShare
    ? button({
        label: label ?? t('share.button'),
        primary,
        onClick: () => share({ title, text, url }),
      })
    : button({
        label: label ?? t('share.button_whatsapp'),
        primary,
        href: waLink(text, url),
        attrs: { rel: 'noopener' },
      });
  wrap.append(main);
  const alt = el('div', { class: 'alt' });
  alt.append(
    el('button', {
      type: 'button',
      text: t('share.button_copy'),
      onclick: async () => {
        try {
          if (await copyText(url)) toast(t('share.toast_copied'));
          else location.href = waLink(text, url);
        } catch {
          location.href = waLink(text, url);
        }
      },
    }),
  );
  if (canWebShare)
    alt.append(
      el('a', { href: waLink(text, url), rel: 'noopener', text: t('share.button_whatsapp') }),
    );
  wrap.append(alt);
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Toast                                                                */
/* ------------------------------------------------------------------ */

let toastTimer = null;
export function toast(message, { duration = 2400 } = {}) {
  let node = document.getElementById('toast');
  if (!node) {
    node = el('div', { id: 'toast', class: 'toast', role: 'status', 'aria-live': 'polite' });
    document.body.append(node);
  }
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), duration);
}

/* ------------------------------------------------------------------ */
/* Progression store (localStorage, sections opened, nothing else)      */
/* ------------------------------------------------------------------ */

const PROGRESS_KEY = 'cel.progress.v1';

function readStore() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return Array.isArray(data?.sections) ? data.sections.filter((s) => typeof s === 'string') : [];
  } catch {
    return [];
  }
}
function writeStore(sections) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ sections }));
    return true;
  } catch {
    return false;
  }
}

export const progress = Object.freeze({
  /** Section ids in the order they were read (no timestamp, no identifier). */
  list: () => readStore(),
  has: (id) => readStore().includes(id),
  /** Marks a section as read; returns true when it was not already. */
  mark(id) {
    const list = readStore();
    const already = list.includes(id);
    writeStore([...list.filter((s) => s !== id), id]);
    return !already;
  },
  last: () => readStore().at(-1) ?? null,
  clear: () => {
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      /* nothing stored */
    }
  },
  /** Distinct chapters among read sections (privacy.local_state: lives in the phone only). */
  chaptersRead() {
    const c = ensureCorpus();
    return new Set(
      readStore()
        .map((id) => c.sections.get(id)?.chapterId)
        .filter(Boolean),
    );
  },
});

/* ------------------------------------------------------------------ */
/* Dates: effectiveDate() and the electoral-silence stub (L49, D0.24)   */
/* ------------------------------------------------------------------ */

/**
 * The date every deterministic draw uses (daily measure, challenges). Production: UTC day, frozen
 * by the KV flag during electoral silence (never a frozen date in a share). Prototype: UTC today,
 * overridable with ?date=YYYY-MM-DD for demos.
 */
export function effectiveDate() {
  const override = new URLSearchParams(location.search).get('date');
  const d =
    override && /^\d{4}-\d{2}-\d{2}$/.test(override)
      ? new Date(`${override}T00:00:00Z`)
      : new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const isoDay = (date) => date.toISOString().slice(0, 10);

const MONTHS_FR = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];
export const formatDateFr = (date) =>
  `${date.getUTCDate() === 1 ? '1er' : date.getUTCDate()} ${MONTHS_FR[date.getUTCMonth()]}`;

/** Stub of the KV flag: { active, reopenTime }. Demo: ?silence=1 freezes chat, share, daily measure (reading stays open). */
export function silence() {
  const active = new URLSearchParams(location.search).get('silence') === '1';
  return { active, reopenTime: active ? 'dimanche 20 h' : null };
}

/* ------------------------------------------------------------------ */
/* Daily measure (deterministic by date, same for everyone)             */
/* ------------------------------------------------------------------ */

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/** Key measure of the day: FNV-1a(corpus_version:YYYY-MM-DD) mod the number of key measures, in book order. */
export function dailyMeasure(date = effectiveDate()) {
  const c = ensureCorpus();
  const pool = c.keyMeasureIds;
  const idx = fnv1a(`${c.meta.corpus_version}:${isoDay(date)}`) % pool.length;
  return { item: c.items.get(pool[idx]), date, index: idx, poolSize: pool.length };
}

/* ------------------------------------------------------------------ */
/* Mascot (D3.11: Marcheuse, gauge only, no name)                       */
/* ------------------------------------------------------------------ */

/** Flat turtle « Marcheuse » from prototypes/mockups/B/mascotte.html, inline SVG, 5 shapes, bichrome. */
export function marcheuse({ walk = false, className = '' } = {}) {
  const legs = walk
    ? 'M4.6 10.8h3.6v2.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8ZM16.4 10.8H20v2.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8Z'
    : 'M5.4 10.8h3.6v2.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8ZM15 10.8h3.6v2.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8Z';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 14');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  if (className) svg.setAttribute('class', className);
  svg.innerHTML =
    `<path fill="var(--mascot-shell)" d="M3.5 9.6a8.5 7.2 0 0 1 17 0Z"/>` +
    `<rect fill="currentColor" x="2.4" y="8.8" width="19.2" height="2.4" rx="1.2"/>` +
    `<path fill="currentColor" d="M19.3 10.9c.2-1.7.8-3.1 1.9-4.3a2.1 2.1 0 1 1 2.2 3c-.6.6-1.5 1-2.4 1.3Z"/>` +
    `<path fill="currentColor" d="${legs}"/>` +
    `<circle fill="var(--mascot-body)" cx="22.55" cy="7.6" r="0.55"/>`;
  return svg;
}

/* ------------------------------------------------------------------ */
/* Small page utilities                                                 */
/* ------------------------------------------------------------------ */

export const qs = (name) => new URLSearchParams(location.search).get(name);
export const hashParam = (name) => new URLSearchParams(location.hash.replace(/^#/, '')).get(name);

/** Set the document title « … — C'est écrit là ». */
export function setTitle(text) {
  document.title = text ? `${text} — ${APP.name}` : APP.name;
}

/** Scroll to the element named by the hash once it exists (content is rendered after load) and flag it. */
export function revealHash() {
  const id = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (!id) return null;
  const target = document.getElementById(id);
  if (!target) return null;
  target.classList.add('is-target');
  target.scrollIntoView({ block: 'start', behavior: 'auto' });
  return target;
}

/** Ids of the four parts in book order, for chapter mosaics. */
export const partIds = ['part1', 'part2', 'part3', 'part4'];
