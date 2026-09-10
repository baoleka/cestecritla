// Regenerates the five static mockups from the real data files.
// The HTML files are the deliverable and work without this script;
// run `node build.mjs` from this folder only to refresh them after a data change.
// Corpus texts (verbatim) are injected untouched; app-voice strings come from design/strings.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const read = (p) => JSON.parse(readFileSync(join(root, p), 'utf8'));

const corpus = read('data/aec-2025.json');
const glossary = read('data/glossary.json');
const statCards = read('data/stat-cards.json');
const S = read('design/strings.json');

const APP_NAME = 'AEC Discover'; // {appName} placeholder until naming sprint (T10)

// ---------- data ----------
const card = glossary.entries.find((e) => e.slug === 'regle-verte');
const section = corpus.sections.find((s) => s.id === 'c12-s01');
const chapter = corpus.chapters.find((c) => c.id === section.chapterId);
const stat = statCards.cards.find((c) => c.id === 'c12-s01-a01');
const glossarySlugs = new Set(glossary.entries.map((e) => e.slug));

const itemById = new Map();
for (const s of corpus.sections) for (const it of s.items) itemById.set(it.id, { ...it, section: s });
for (const p of corpus.introduction.paragraphs) itemById.set(p.id, { ...p, section: null });

const chapterOf = (it) => (it.section ? corpus.chapters.find((c) => c.id === it.section.chapterId) : null);

// ---------- helpers ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// French spacing at render time (whitespace only, never a character change): NBSP inside « » and before : ; ! ?
const nbsp = (s) =>
  s
    .replace(/« /g, '«\u00A0')
    .replace(/ »/g, '\u00A0»')
    .replace(/ ([:;!?])/g, '\u00A0$1');
// App voice: typographic apostrophe (voice.md §6: conversion at render, proposal) + French spacing
const fr = (s) => nbsp(esc(s).replace(/'/g, '\u2019')).replace(/L’Avenir en commun/g, '<i>L’Avenir en commun</i>');
// Programme text: escaped and spaced, characters untouched (D2.2, fidelity)
const vb = (s) => nbsp(esc(s));
const sup6e = (s) => s.replace(/6e[ \u00A0]/g, '6<sup>e</sup>&nbsp;');
const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
const kindLabel = (kind) => (kind === 'key_measure' ? S['measure.key_label'] : kind === 'measure' ? S['measure.label'] : 'Paragraphe');

const sourceLine = (it) => {
  const ch = chapterOf(it);
  // intro-p items have no section: "Source : L'Avenir en commun 2025, Introduction" (string gap, see README)
  if (!ch) return fr(fill(S['concept.source'], { chapter: 'Introduction', section: '' }).replace(/,\s*$/, ''));
  return fr(fill(S['concept.source'], { chapter: ch.title, section: it.section.title }));
};
const sectionUrl = (it) => (it.section ? it.section.url : corpus.introduction.url);

// ---------- components ----------
const topbar = () => `
<header class="topbar">
  <a class="wordmark" href="#" aria-label="${esc(APP_NAME)}">${esc(APP_NAME)}</a>
  <nav class="topbar-nav" aria-label="Navigation"><a href="#">${fr(S['nav.search'])}</a></nav>
</header>`;

const kicker = () => `<p class="kicker">${vb(chapter.title)}</p>`;
const title = () => `<h1 class="title-3d">${esc(card.term)}</h1>`;

const badge = () => {
  const reviewed = card.review_status === 'reviewed-human';
  const text = reviewed
    ? fr(S['concept.authorship.reviewed']).replace('{reviewer}', '<span class="slot">pseudonyme</span>')
    : fr(S['concept.authorship.pending']);
  return `<p class="badge-author">${text}</p>`;
};

// Plain-language definition, optionally with one sentence shown in its "focused" state (support link, D2.4)
const plain = ({ focusIndex = -1, text = card.one_liner, compact = false } = {}) => {
  const sentences = card.sentence_support.filter((s) => s.field === 'one_liner');
  let html;
  if (text !== card.one_liner || focusIndex < 0) html = fr(text);
  else
    html = sentences
      .map((s, i) =>
        i === focusIndex
          ? `<span class="sent-focus">${fr(s.sentence)}</span><span class="support-chip">${esc(s.support_ids[0])}</span>`
          : fr(s.sentence),
      )
      .join(' ');
  return `
<section class="${compact ? 'zone-compact' : 'zone'}" aria-labelledby="lbl-plain">
  <span class="label" id="lbl-plain">${fr(S['concept.label.plain'])}</span>
  <p class="body">${html}</p>
</section>`;
};

// Verbatim block: items rendered word for word (Gowun Batang). `excerpt` = exact substring shown with visible brackets.
const verbatim = ({ ids = card.verbatim_ids, excerpts = {}, compact = false, withLabel = true } = {}) => {
  const texts = ids
    .map((id) => {
      const it = itemById.get(id);
      const ex = excerpts[id];
      const t = ex ? `[…] ${it.text.slice(it.text.indexOf(ex), it.text.indexOf(ex) + ex.length)} […]` : it.text;
      if (ex && !it.text.includes(ex)) throw new Error(`excerpt not found in ${id}`);
      return `<p class="verbatim-text" lang="fr">${vb(t)}</p>`;
    })
    .join('\n');
  const first = itemById.get(ids[0]);
  const metas = ids
    .map((id) => {
      const it = itemById.get(id);
      return `<p class="verbatim-meta"><span class="kind">${fr(kindLabel(it.kind))}</span> <span class="item-id">${esc(id)}</span> · ${sourceLine(it)}</p>`;
    })
    .join('\n');
  return `
<section class="${compact ? 'zone-compact' : 'zone'} verbatim" aria-labelledby="lbl-verbatim">
  ${withLabel ? `<span class="label" id="lbl-verbatim">${fr(S['concept.label.verbatim'])}</span>` : ''}
  ${texts}
  ${metas}
  <a class="btn-nav" href="${esc(sectionUrl(first))}"><span class="lbl">${fr(S['concept.read_section'])}</span><span class="arr" aria-hidden="true">→</span></a>
</section>`;
};

const why = ({ compact = false, withLabel = true } = {}) => {
  const sentences = card.sentence_support.filter((s) => s.field === 'why_it_matters');
  const main = sentences.filter((s) => s.kind !== 'contexte-2022').map((s) => fr(s.sentence)).join(' ');
  const ctx = sentences.filter((s) => s.kind === 'contexte-2022');
  const ctxHtml = ctx
    .map(
      (s) =>
        `<span class="ctx-2022"><a class="pill-2022" href="${esc(s.support_ids[0])}">Contexte 2022</a>${fr(s.sentence)}</span>`,
    )
    .join('');
  return `
<section class="${compact ? 'zone-compact' : 'zone'}" aria-labelledby="lbl-why">
  ${withLabel ? `<span class="label" id="lbl-why">${fr(S['concept.label.why'])}</span>` : ''}
  <p class="body">${main}${ctxHtml}</p>
</section>`;
};

const measures = ({ compact = false, withLabel = true } = {}) => {
  const lis = card.related_measure_ids
    .map((id) => {
      const it = itemById.get(id);
      const ch = chapterOf(it);
      return `
    <li>
      <span class="kind-label">${fr(kindLabel(it.kind))}</span>
      <p class="measure-text" lang="fr">${vb(it.text)}</p>
      <p class="measure-meta"><span>${fr(fill(S['measure.location'], { chapter: ch.title, section: it.section.title }))}</span> <a href="#">${fr(S['measure.share'])}</a></p>
    </li>`;
    })
    .join('');
  return `
<section class="${compact ? 'zone-compact' : 'zone'}" aria-labelledby="lbl-measures">
  ${withLabel ? `<span class="label" id="lbl-measures">${fr(S['concept.label.related_measures'])}</span>` : ''}
  <ul class="measures">${lis}
  </ul>
</section>`;
};

const statcard = ({ compact = false, withLabel = true } = {}) => {
  const legal = stat.legal_77_808.commanditaire
    ? S['statcard.legal.full']
    : S['statcard.legal.no_sponsor'];
  const legalText = fr(fill(legal, { organisation: stat.institute, dates: stat.survey_date_text, chapter: stat.chapter_title, sponsor: stat.legal_77_808.commanditaire ?? '' }));
  // The number is lifted from the text; the sentence itself stays word for word.
  const rest = stat.text.replace(/^83[\s\u00A0]%[\s\u00A0]/, '');
  return `
<section class="${compact ? 'zone-compact' : 'zone'} statcard" aria-labelledby="lbl-stat">
  ${withLabel ? `<span class="label" id="lbl-stat">${fr(S['statcard.label'])}</span>` : ''}
  <div class="stat-head">
    <span class="stat-value">${stat.headline_percentage} %</span>
    <span class="stat-date">${esc(stat.institute)} · ${esc(stat.survey_date_text)}</span>
  </div>
  <p class="stat-text" lang="fr"><strong>83 %</strong> ${esc(rest)}</p>
  <p class="stat-legal">${legalText} ${fr(S['statcard.legal.margin'])}<br><a href="${esc(section.url)}">${fr(S['statcard.legal.source_link'])}</a></p>
</section>`;
};

const objection = ({ compact = false, withLabel = true } = {}) => `
<section class="${compact ? 'zone-compact' : 'zone'}" aria-labelledby="lbl-obj">
  ${withLabel ? `<span class="label" id="lbl-obj">${fr(S['concept.label.objection'])}</span>` : ''}
  <p class="objection-q">« ${fr(card.objection.text)} »</p>
  <p class="objection-a body">${fr(card.objection.answer)}</p>
</section>`;

const terms = ({ compact = false, withLabel = true } = {}) => {
  const links = card.related_terms
    .filter((slug) => glossarySlugs.has(slug))
    .map((slug) => {
      const e = glossary.entries.find((x) => x.slug === slug);
      return `<a href="#">${sup6e(esc(e.term))}</a>`;
    })
    .join('');
  return `
<section class="${compact ? 'zone-compact' : 'zone'}" aria-labelledby="lbl-terms">
  ${withLabel ? `<span class="label" id="lbl-terms">${fr(S['concept.label.related_terms'])}</span>` : ''}
  <div class="terms">${links}</div>
</section>`;
};

const share = ({ compact = false } = {}) => `
<div class="${compact ? 'zone-compact' : 'zone'}"><a class="btn-primary" href="#">${fr(S['concept.share'])}</a></div>`;

// Chat entry: the AI mention is shown before any first interaction (art. 50 §1 and §5, D0.29)
const chatEntry = ({ mentionKey = 'chat.ai_mention.v1', strings = S, compact = false } = {}) => `
<section class="${compact ? 'zone-compact' : 'zone'} chat-entry" aria-labelledby="lbl-chat">
  <h2 class="h3" id="lbl-chat">${fr(strings['chat.title'])}</h2>
  <p class="small">${fr(strings['chat.intro'])}</p>
  <div class="chat-input">
    <span class="field" aria-hidden="true">${fr(strings['chat.placeholder'])}</span>
    <a class="btn-secondary" href="#">${fr(strings['chat.send'])}</a>
  </div>
  <p class="ai-mention">${fr(strings[mentionKey])}</p>
</section>`;

const foot = () => `
<footer class="foot">
  <p>${fr(S['attribution.short'])}</p>
  <p>${fr(S['independence.line'])}</p>
</footer>`;

const sep = (title, note = '') => `
<div class="mock-sep" role="note">${esc(title)}${note ? `<span>${fr(note)}</span>` : ''}</div>`;

const page = (docTitle, body) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(docTitle)}</title>
<link rel="stylesheet" href="anatomies.css">
</head>
<body>
${body}
</body>
</html>
`;

// ---------- 1. Dense: everything visible at once, compact hierarchy ----------
const introExcerpt =
  'Découle de ce but la règle verte : ne jamais prendre à la nature davantage qu’elle ne peut reconstituer sur une période donnée. Mais ce n’est pas tout : il faudra aussi réparer les dégâts, régénérer là où c’est possible, la nature détruite.';

const dense = page(
  `${card.term} — anatomie dense`,
  `
<main class="screen">
  ${topbar()}
  ${kicker()}
  ${title()}
  <div>${badge()}</div>
  ${plain({ compact: true, focusIndex: 1 })}
  ${verbatim({ compact: true, excerpts: { 'intro-p22': introExcerpt } })}
  ${why({ compact: true })}
  ${measures({ compact: true })}
  ${statcard({ compact: true })}
  ${objection({ compact: true })}
  ${terms({ compact: true })}
  ${share({ compact: true })}
  ${chatEntry({ compact: true })}
  ${foot()}
</main>`,
);

// ---------- 2. Progressive: « En clair » first, then disclosure steps ----------
const rowsSpec = [
  { key: 'verbatim', label: S['concept.label.verbatim'], body: () => verbatim({ compact: true, withLabel: false, excerpts: { 'intro-p22': introExcerpt } }) },
  { key: 'why', label: S['concept.label.why'], body: () => why({ compact: true, withLabel: false }) },
  { key: 'measures', label: S['concept.label.related_measures'], body: () => measures({ compact: true, withLabel: false }) },
  { key: 'stat', label: S['statcard.label'], body: () => statcard({ compact: true, withLabel: false }) },
  { key: 'objection', label: S['concept.label.objection'], body: () => objection({ compact: true, withLabel: false }) },
  { key: 'terms', label: S['concept.label.related_terms'], body: () => terms({ compact: true, withLabel: false }) },
];

const rows = (openKeys) =>
  `<div class="rows">` +
  rowsSpec
    .map((r) => {
      const open = openKeys.includes(r.key);
      return `
  <div class="row">
    <button class="row-head" type="button" aria-expanded="${open}">${fr(r.label)}<span class="glyph" aria-hidden="true">${open ? '−' : '+'}</span></button>
    ${open ? `<div class="row-body">${r.body()}</div>` : ''}
  </div>`;
    })
    .join('') +
  `</div>`;

const progressiveFrame = (step) => {
  const openKeys = step === 1 ? [] : step === 2 ? ['verbatim'] : ['verbatim', 'why', 'measures', 'stat', 'objection', 'terms'];
  const cta =
    step === 3
      ? share()
      : `<div class="zone"><a class="btn-primary" href="#">${fr(S['common.read_more'])}</a></div>`;
  return `
<main class="screen">
  ${topbar()}
  ${kicker()}
  ${title()}
  <div>${badge()}</div>
  ${plain()}
  ${step === 1 ? cta : ''}
  <div class="zone">${rows(openKeys)}</div>
  ${step !== 1 ? cta : ''}
  ${step === 3 ? chatEntry() : ''}
  ${foot()}
</main>`;
};

const progressive = page(
  `${card.term} — anatomie progressive`,
  `
${sep('Maquette · étape 1 sur 3', 'Arrivée sur la carte : « En clair » seul, le reste replié.')}
${progressiveFrame(1)}
${sep('Maquette · étape 2 sur 3', 'Après « Lire la suite » : le texte du programme se déplie.')}
${progressiveFrame(2)}
${sep('Maquette · étape 3 sur 3', 'Tout est déplié : pourquoi ça compte, mesures, objection, termes voisins.')}
${progressiveFrame(3)}`,
);

// ---------- 3. Explorable: a manipulable rule, rendered as three static states ----------
const NATURE = 66; // % of the track = what nature rebuilds in a year (no unit: a principle, not data)
const states = [
  {
    id: 'moins',
    factor: 0.6,
    tick: 'moins',
    status: 'Sous la limite.',
    text: 'On prélève moins que ce que la nature refait en un an. La règle verte est respectée.',
  },
  {
    id: 'autant',
    factor: 1,
    tick: 'autant',
    status: 'À la limite.',
    text: 'On prélève tout juste ce que la nature refait en un an. « Pas davantage » : la règle verte tient encore.',
  },
  {
    id: 'plus',
    factor: 1.35,
    tick: 'plus',
    status: 'Au-delà de la limite.',
    text: 'On prélève plus que ce que la nature refait en un an. C’est ce que la règle verte interdit.',
  },
];

const explorableGraph = (st) => {
  const take = Math.min(NATURE * st.factor, NATURE);
  const over = Math.max(NATURE * st.factor - NATURE, 0);
  const thumb = NATURE * st.factor; // thumb position in % of the rail
  return `
<div class="explo">
  <span class="label">Bouge le curseur</span>
  <p class="explo-note">Le curseur n’a pas d’unité : il montre le principe, pas des chiffres.</p>
  <div class="explo-graph" role="img" aria-label="Deux barres : ce que la nature refait en un an, et ce qu’on prélève. ${esc(st.status)} ${esc(st.text)}">
    <span class="limit-lbl" style="left:${NATURE}%">La limite</span>
    <div class="explo-row">
      <span class="lbl">Ce que la nature refait en un an</span>
      <div class="bar-track"><div class="bar bar-nature" style="width:${NATURE}%"></div><div class="limit" style="left:${NATURE}%"></div></div>
    </div>
    <div class="explo-row">
      <span class="lbl">Ce qu’on prélève</span>
      <div class="bar-track">
        <div class="bar bar-take" style="width:${take}%"></div>
        ${over ? `<div class="bar bar-over" style="left:${NATURE}%;width:${over}%"></div>` : ''}
        <div class="limit" style="left:${NATURE}%"></div>
      </div>
    </div>
  </div>
  <div class="slider" aria-hidden="true">
    <div class="rail"></div>
    <div class="thumb" style="left:${thumb}%"></div>
    <div class="ticks"><span class="tick first">moins</span><span class="tick" style="left:${NATURE}%">autant</span><span class="tick last" style="left:100%">plus</span></div>
  </div>
  <p class="verdict${st.id === 'plus' ? ' over' : ''}"><span class="status">${esc(st.status)}</span> ${fr(st.text)}</p>
</div>`;
};

const explorableFrame = (st) => `
<main class="screen">
  ${topbar()}
  ${kicker()}
  ${title()}
  <div>${badge()}</div>
  ${explorableGraph(st)}
  ${verbatim({ ids: ['c12-s01-k01'] })}
</main>`;

const explorable = page(
  `${card.term} — anatomie explorable`,
  `
${sep('Maquette · état 1 sur 3 — moins', 'Curseur à gauche : on prélève moins que ce que la nature refait.')}
${explorableFrame(states[0])}
${sep('Maquette · état 2 sur 3 — autant', 'Curseur sur la limite : on prélève tout juste ce que la nature refait.')}
${explorableFrame(states[1])}
${sep('Maquette · état 3 sur 3 — plus', 'Curseur à droite : on prélève davantage. Le dépassement est marqué.')}
${explorableFrame(states[2])}
${sep('Maquette · suite de l’écran', 'Identique dans les trois états, sous le texte du programme.')}
<main class="screen">
  ${plain()}
  ${why()}
  ${measures()}
  ${statcard()}
  ${objection()}
  ${terms()}
  ${share()}
  ${chatEntry()}
  ${foot()}
</main>`,
);

// ---------- 4 & 5. Register: tu (default, D0.25) vs vous (rewritten, same facts) ----------
const VOUS = {
  ...S,
  'home.link.sent_by_hint': "Quelqu'un vous a envoyé ce passage. Le texte vient du livre officiel.",
  'chat.title': 'Posez votre question',
  'chat.intro': 'Un mot, une mesure, un thème : vous obtenez le passage exact du programme.',
  'chat.placeholder': 'Votre question sur un mot ou une mesure',
  'chat.send': S['chat.send'],
  'chat.ai_mention.v2':
    "Vous parlez à Mistral, une IA française hébergée chez Cloudflare. Elle choisit les passages du programme, elle ne les écrit pas.",
};
const ONE_LINER_VOUS =
  "La règle verte fixe une limite à ce que l'on prend à la nature. On ne prend pas à la nature plus que ce qu'elle peut reconstituer. Le programme veut écrire cette règle dans la Constitution.";

const registerFrame = (strings, oneLiner) => `
<main class="screen">
  ${topbar()}
  ${kicker()}
  <p class="hint">${fr(strings['home.link.sent_by_hint'])}</p>
  ${title()}
  <div>${badge()}</div>
  ${plain({ text: oneLiner })}
  ${share()}
  ${chatEntry({ mentionKey: 'chat.ai_mention.v2', strings })}
  ${foot()}
</main>`;

const tu = page(`${card.term} — registre tu`, registerFrame(S, card.one_liner));
const vous = page(`${card.term} — registre vous`, registerFrame(VOUS, ONE_LINER_VOUS));

// ---------- write ----------
const out = {
  'dense.html': dense,
  'progressive.html': progressive,
  'explorable.html': explorable,
  'tu.html': tu,
  'vous.html': vous,
};
for (const [name, html] of Object.entries(out)) {
  writeFileSync(join(here, name), html);
  console.log('wrote', name, html.length, 'bytes');
}
