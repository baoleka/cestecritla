// Generates prototypes/mockups/B/*.html from real data (corpus, glossary, stat cards, strings).
// Usage: node prototypes/mockups/B/tools/gen.mjs — the output is static HTML/CSS, no runtime build.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '../../../..');
const OUT = resolve(HERE, '..');
const corpus = JSON.parse(readFileSync(`${ROOT}/data/aec-2025.json`, 'utf8'));
const glossary = JSON.parse(readFileSync(`${ROOT}/data/glossary.json`, 'utf8'));
const statCards = JSON.parse(readFileSync(`${ROOT}/data/stat-cards.json`, 'utf8'));
const riposte = JSON.parse(readFileSync(`${ROOT}/data/riposte.json`, 'utf8'));
const S = JSON.parse(readFileSync(`${ROOT}/design/strings.json`, 'utf8'));

const APP = 'AEC Discover';
const REVIEWER = 'Baoleka';

// ---------- helpers ----------
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// App voice: italic book title (CSS), superscript ordinal, HTML-escaped. Never applied to verbatim.
const voice = (t) =>
  esc(t)
    .replace(/L'Avenir en commun/g, "<em class=\"book\">L'Avenir en commun</em>")
    .replace(/6e République/g, '6<sup>e</sup> République');
const fill = (key, vars = {}) => {
  let t = S[key];
  if (t === undefined) throw new Error(`missing string ${key}`);
  for (const [k, v] of Object.entries(vars)) t = t.split(`{${k}}`).join(v);
  return t;
};
const v = (key, vars) => voice(fill(key, vars));

const section = (id) => corpus.sections.find((s) => s.id === id);
const chapter = (id) => corpus.chapters.find((c) => c.id === id);
const part = (id) => corpus.parts.find((p) => p.id === id);
const item = (id) => {
  for (const s of corpus.sections) {
    const i = s.items.find((x) => x.id === id);
    if (i) return { ...i, section: s, chapter: chapter(s.chapterId), part: part(s.partId) };
  }
  throw new Error(`unknown item ${id}`);
};
const chapterShort = (c) => c.title.replace(/^Chapitre (\d+)\s*:\s*/, 'Chapitre $1 · ');
const partIndex = (p) => p.order; // 1..4
const partColor = (p) => `var(--part-${partIndex(p)})`;

const s1201 = section('c12-s01');
const c12 = chapter('c12');
const p3 = part('part3');
const k01 = item('c12-s01-k01');
const m11 = item('c12-s01-m11');
const rb = item('c14-s02-k01');
const smic = item('c8-s04-k01');
const stat = statCards.cards.find((c) => c.id === 'c12-s01-a01');
const regleVerte = glossary.entries.find((e) => e.slug === 'regle-verte');
const rip13 = riposte.entries.find((e) => e.id === 'rip-13');

// ---------- icons ----------
const I = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 11 12 4l8.5 7v9h-6v-6h-5v6h-6z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6"/><path d="m15 15 5.5 5.5"/></svg>',
  book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 5h6.5a2 2 0 0 1 2 2 2 2 0 0 1 2-2h6.5v13.5H14a2 2 0 0 0-2 2 2 2 0 0 0-2-2H3.5z"/><path d="M12 7v13.5"/></svg>',
  bubble: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 4.5h17v11.5H12l-5 4.5v-4.5H3.5z"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7"/></svg>',
  send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 15V4M7 9l5-5 5 5"/><path d="M4.5 14v6h15v-6"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
};

// ---------- mascot symbols (illustration-rules.md §2 : ≤ 6 shapes, 24-unit grid, facing right) ----------
const TURTLE_DEFS = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <!-- A. Signet : carapace = rectangle arrondi + filet horizontal ; tête et pattes en trait. 5 formes. -->
  <symbol id="t-a" viewBox="0 0 24 14">
    <rect fill="var(--mascot-shell)" x="1.5" y="2.6" width="18.5" height="8.6" rx="1.6"/>
    <rect fill="currentColor" x="1.5" y="6.3" width="18.5" height="1.3"/>
    <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M19.4 9.6 22.2 7"/>
    <circle fill="none" stroke="currentColor" stroke-width="1.5" cx="22.3" cy="6.3" r="1.35"/>
    <path fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" d="M5.2 11.6v1.5M15.8 11.6v1.5"/>
  </symbol>
  <!-- A. silhouette 24 px : une seule forme pleine, sans œil. -->
  <symbol id="t-a-24" viewBox="0 0 24 14">
    <path fill="currentColor" d="M3 2.6h15.5a1.6 1.6 0 0 1 1.6 1.6v6.2a1.6 1.6 0 0 1-1.6 1.6H3a1.6 1.6 0 0 1-1.6-1.6V4.2A1.6 1.6 0 0 1 3 2.6ZM18.6 10.2 21.4 7.6a1.9 1.9 0 1 1 2 2.6l-2.2 1.5ZM3.8 11.5h3v2.4h-3ZM14.2 11.5h3v2.4h-3Z"/>
  </symbol>

  <!-- B. Monotrait : un trait continu (dôme, pattes en arceaux, tête en goutte) + 1 arc concentrique + 1 remplissage de progression + œil. 4 formes. -->
  <symbol id="t-b" viewBox="0 0 24 14">
    <path fill="var(--mascot-shell)" d="M8.8 9.5a3.2 2.7 0 0 1 6.4 0Z"/>
    <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"
      d="M3.5 9.5v2.2a1.6 1.6 0 0 0 3.2 0V9.5h8.6v2.2a1.6 1.6 0 0 0 3.2 0V9.5h2l1.3-2.7a1.55 1.55 0 1 1 1.6 2.2l-2.9.5a8.5 7.2 0 0 0-17 0Z"/>
    <path fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" d="M6.2 9.5a5.8 4.7 0 0 1 11.6 0"/>
    <circle fill="var(--mascot-eye)" cx="22.6" cy="7.3" r="0.5"/>
  </symbol>
  <symbol id="t-b-24" viewBox="0 0 24 14">
    <path fill="currentColor" d="M2.8 10.4a9.2 8 0 0 1 18.4 0l.9-2.4a1.9 1.9 0 1 1 1.8 2.6l-2.7 1.2v1.6h-4v-2.2H7.6v2.2h-4v-2.2Z"/>
  </symbol>

  <!-- C. Marcheuse : aplats sans contour ; dôme Violet 200 + bord Violet, tête et pattes pleines, œil. 5 formes. -->
  <symbol id="t-c" viewBox="0 0 24 14">
    <path fill="var(--mascot-shell)" d="M3.5 9.6a8.5 7.2 0 0 1 17 0Z"/>
    <rect fill="currentColor" x="2.4" y="8.8" width="19.2" height="2.4" rx="1.2"/>
    <path fill="currentColor" d="M19.3 10.9c.2-1.7.8-3.1 1.9-4.3a2.1 2.1 0 1 1 2.2 3c-.6.6-1.5 1-2.4 1.3Z"/>
    <path class="legs" fill="currentColor" d="M5.4 10.8h3.6v2.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8ZM15 10.8h3.6v2.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8Z"/>
    <circle fill="var(--mascot-body)" cx="22.55" cy="7.6" r="0.55"/>
  </symbol>
  <!-- C. état walk : patte avant avancée (même formes). -->
  <symbol id="t-c-walk" viewBox="0 0 24 14">
    <path fill="var(--mascot-shell)" d="M3.5 9.6a8.5 7.2 0 0 1 17 0Z"/>
    <rect fill="currentColor" x="2.4" y="8.8" width="19.2" height="2.4" rx="1.2"/>
    <path fill="currentColor" d="M19.3 10.9c.2-1.7.8-3.1 1.9-4.3a2.1 2.1 0 1 1 2.2 3c-.6.6-1.5 1-2.4 1.3Z"/>
    <path fill="currentColor" d="M4.6 10.8h3.6v2.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8ZM16.4 10.8H20v2.4a.8.8 0 0 1-.8.8h-2a.8.8 0 0 1-.8-.8Z"/>
    <circle fill="var(--mascot-body)" cx="22.55" cy="7.6" r="0.55"/>
  </symbol>
  <symbol id="t-c-24" viewBox="0 0 24 14">
    <path fill="currentColor" d="M2.4 9.8a9.6 8 0 0 1 19.2 0l.7-2.2a2 2 0 1 1 2 2.8l-2.6 1.1v1.2h-3.2V14H14v-2.6H9.4V14H5.2v-2.6H2.4Z"/>
  </symbol>
</svg>`;

const turtle = (id, cls, alt) =>
  `<svg class="turtle ${cls}" role="img" aria-label="${esc(alt)}"><use href="#${id}"/></svg>`;
const turtleAlt = fill('turtle.alt', { appName: APP });

// ---------- ring (Kinnu orb) : 18 chapters, coloured by part, filled when read ----------
const ring18 = (readIds) => {
  const size = 148, cx = 74, r = 64, sw = 8;
  const C = 2 * Math.PI * r, slot = C / 18, dash = slot - 4;
  let out = `<svg class="ring" viewBox="0 0 ${size} ${size}" aria-hidden="true">`;
  corpus.chapters.forEach((ch, i) => {
    const p = part(ch.partId);
    const color = readIds.includes(ch.id) ? partColor(p) : 'var(--track)';
    out += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${color}" stroke-width="${sw}" stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" transform="rotate(${-90 + i * 20} ${cx} ${cx})"/>`;
  });
  return out + '</svg>';
};
const ringSections = (total, read, color) => {
  const size = 72, cx = 36, r = 30, sw = 6;
  const C = 2 * Math.PI * r, slot = C / total, dash = slot - 5;
  let out = `<svg class="ring" viewBox="0 0 ${size} ${size}" aria-hidden="true">`;
  for (let i = 0; i < total; i++) {
    out += `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${i < read ? color : 'var(--track)'}" stroke-width="${sw}" stroke-dasharray="${dash.toFixed(2)} ${(C - dash).toFixed(2)}" transform="rotate(${-90 + (i * 360) / total} ${cx} ${cx})"/>`;
  }
  return out + '</svg>';
};

// ---------- shared chrome ----------
const head = (title) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(title)} · ${APP} · direction B</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
${TURTLE_DEFS}`;
const foot = `</body>
</html>
`;

const topbar = ({ back = false } = {}) => `
<header class="topbar">
  ${back ? `<a class="back" href="home-direct.html">${I.back}<span>${esc(S['common.back'])}</span></a>` : ''}
  <a class="wordmark" href="home-direct.html" aria-label="${APP}">${APP}</a>
</header>`;

const tabbar = (active) => {
  const t = (key, icon, href, name) =>
    `<a class="tab" href="${href}"${active === name ? ' aria-current="page"' : ''}><span class="ico">${icon}</span><span>${esc(S[key])}</span></a>`;
  return `
<nav class="tabbar" aria-label="Navigation">
  ${t('nav.home', I.home, 'home-direct.html', 'home')}
  ${t('nav.search', I.search, 'chat.html', 'search')}
  ${t('nav.chapters', I.book, 'section.html', 'chapters')}
  ${t('nav.riposte', I.bubble, 'home-direct.html#riposte', 'riposte')}
</nav>`;
};

const footer = (cls = '') => `
<footer class="footer ${cls}">
  <p>${v('independence.line')}</p>
  <p>${v('attribution.short')}</p>
</footer>`;

const loc = (it) =>
  `<span class="loc" style="--part:${partColor(it.part)}"><span class="dot" aria-hidden="true"></span><span class="txt">${esc(chapterShort(it.chapter))} · ${esc(it.section.title)}</span></span>`;
const locChapter = (ch, p) =>
  `<span class="loc" style="--part:${partColor(p)}"><span class="dot" aria-hidden="true"></span><span class="txt">${esc(chapterShort(ch))}</span></span>`;

const kindChip = (it) =>
  it.kind === 'key_measure'
    ? `<span class="chip chip-solid">${esc(S['measure.key_label'])}</span>`
    : `<span class="chip">${esc(S['measure.label'])}</span>`;

const verbatimCard = (it, { bold = false, lg = false, extra = '' } = {}) => `
<article class="card card-elevated">
  <div class="card-head">${loc(it)}${kindChip(it)}</div>
  <span class="label">${esc(S['concept.label.verbatim'])}</span>
  <blockquote class="verbatim${bold ? ' bold' : ''}${lg ? ' lg' : ''}" lang="fr">${esc(it.text)}</blockquote>
  ${extra}
</article>`;

// =====================================================================
// 1. home-link.html — écran 0, arrivée par lien (D0.19). Aucune mascotte (règle §2.4).
// =====================================================================
const homeLink = head('Arrivée par lien') + `
<div class="app">
  <header class="topbar">
    <a class="wordmark" href="home-direct.html" aria-label="${APP}">${APP}</a>
    <span class="chip chip-outline">3 min</span>
  </header>
  <main class="screen screen-link">
    <div class="stack">
      <p class="small">${v('home.link.sent_by_hint')}</p>
      <span class="label">${v('home.link.kicker')}</span>
      ${verbatimCard(k01, { lg: true })}
    </div>
    <section class="aplat" style="margin-top:40px">
      <h1 class="display block-3d overlap"><span class="l">Voici ce que dit</span><span class="l">le programme,</span><span class="l">mot pour mot.</span></h1>
      <div class="stack" style="margin-top:20px">
        <p class="lead">${v('home.link.lead')}</p>
        <a class="btn btn-reversed btn-block" href="concept.html">${esc(S['home.link.cta_primary'])}</a>
        <p style="text-align:center"><a href="section.html">${esc(S['home.link.cta_secondary'])}</a></p>
      </div>
      ${footer()}
    </section>
  </main>
</div>
` + foot;

// =====================================================================
// 2. home-direct.html — écran 0, arrivée directe (militant)
// =====================================================================
const homeDirect = head('Accueil') + `
<div class="app">
  ${topbar()}
  <main class="screen stack">
    <h1 class="display block-3d" style="margin-top:8px"><span class="l">Ta munition,</span><span class="l">en dix secondes.</span></h1>
    <p class="lead">${v('home.direct.lead')}</p>

    <form class="stack-s" role="search" onsubmit="return false">
      <label class="search"><span class="sr-only" hidden>${esc(S['nav.search'])}</span>${I.search}<input type="search" placeholder="${esc(S['search.placeholder'])}" aria-label="${esc(S['home.direct.cta_search'])}"></label>
      <button class="btn btn-primary btn-block" type="submit">${esc(S['home.direct.cta_search'])}</button>
      <p class="small">${v('search.hint')}</p>
    </form>

    <a class="card card-elevated" id="riposte" href="#riposte" style="display:block;text-decoration:none;color:inherit">
      <div class="card-head"><span class="label">${esc(S['nav.riposte'])}</span><span class="chip">${riposte.entries.length} objections</span></div>
      <p class="h3">${v('riposte.lead')}</p>
      <p class="small" style="margin-top:8px"><strong>${esc(S['riposte.objection_label'])}</strong> ${esc(rip13.objection_fr)}</p>
      <div class="actions" style="margin-top:12px"><span class="btn btn-brand">${esc(S['home.direct.cta_riposte'])}</span></div>
    </a>

    <article class="card">
      <div class="card-head"><span class="label">${esc(S['daily.title'])}</span>${kindChip(smic)}</div>
      <blockquote class="verbatim" lang="fr">${esc(smic.text)}</blockquote>
      <p class="source" style="display:flex;align-items:center;justify-content:space-between;gap:8px">${loc(smic)}</p>
      <div class="actions" style="margin-top:12px"><a class="btn btn-secondary" href="story.html">${I.send}${esc(S['daily.share'])}</a></div>
    </article>

    <article class="card">
      <div class="card-head"><span class="label">${esc(S['progress.title'])}</span>${turtle('t-c-24', 'turtle-24', '')}</div>
      <div style="display:flex;gap:16px;align-items:center">
        <div class="orb">${ring18(['c1', 'c12'])}${turtle('t-c', 'turtle-96', turtleAlt)}</div>
        <div class="stack-s">
          <p class="counter">${v('progress.chapters_read', { read: '2', total: '18' })}</p>
          <p class="small">${locChapter(c12, p3)}</p>
          <p class="tiny">${esc(s1201.title)} · section 2 sur 3</p>
        </div>
      </div>
      <div class="chips tiny" style="margin-top:12px">
        ${corpus.parts.map((p) => `<span class="loc" style="--part:${partColor(p)}"><span class="dot" aria-hidden="true"></span><span class="txt" style="white-space:normal">${esc(p.title)}</span></span>`).join('')}
      </div>
      <a class="btn-nav outline" href="section.html" style="margin-top:14px"><span class="lbl">${esc(S['home.direct.cta_continue'])}</span><span class="arr">${I.arrow}</span></a>
    </article>

    ${footer()}
  </main>
  ${tabbar('home')}
</div>
` + foot;

// =====================================================================
// 3. concept.html — carte-concept « règle verte » (D2.4)
// =====================================================================
const why = regleVerte.why_it_matters;
const ctx2022 = regleVerte.sentence_support.find((s) => s.kind === 'contexte-2022').sentence;
const whyMain = why.slice(0, why.indexOf(ctx2022)).trim();
const relatedTerms = regleVerte.related_terms
  .map((slug) => glossary.entries.find((e) => e.slug === slug))
  .filter(Boolean);

const concept = head('Carte « règle verte »') + `
<div class="app">
  ${topbar({ back: true })}
  <main class="screen stack">
    <div class="stack-s">
      <p>${locChapter(c12, p3)}</p>
      <h1 class="display block-3d"><span class="l">Règle</span><span class="l">verte</span></h1>
      <p><span class="author">${I.check}<span>${v('concept.authorship.reviewed', { reviewer: REVIEWER })}</span></span></p>
    </div>

    <article class="card">
      <span class="label">${esc(S['concept.label.plain'])}</span>
      <p class="lead">${voice(regleVerte.one_liner)}</p>
    </article>

    ${verbatimCard(k01, {
      lg: true,
      extra: `<p class="source">${v('concept.source', { chapter: c12.title, section: s1201.title })}</p>
  <div class="links"><a href="section.html">${esc(S['concept.read_section'])}</a><a href="section.html">Aussi dans l'introduction (paragraphe 22)</a></div>`,
    })}

    <article class="card">
      <span class="label">${esc(S['concept.label.why'])}</span>
      <p>${voice(whyMain)}</p>
      <p class="small" style="margin-top:12px;padding:10px 12px;border:1px solid var(--violet-200);border-radius:8px"><span class="chip chip-outline" style="margin-right:8px">Contexte 2022</span>${voice(ctx2022)}</p>
    </article>

    <section class="stack-s">
      <span class="label">${esc(S['concept.label.related_measures'])}</span>
      ${[m11, rb].map((it) => `
      <article class="card">
        <div class="card-head">${loc(it)}${kindChip(it)}</div>
        <blockquote class="verbatim" lang="fr">${esc(it.text)}</blockquote>
        <div class="links"><a href="story.html">${esc(S['measure.share'])}</a></div>
      </article>`).join('')}
    </section>

    <article class="card card-elevated">
      <span class="label">${esc(S['concept.label.objection'])}</span>
      <p class="h3" style="font-weight:700">«&nbsp;${voice(regleVerte.objection.text)}&nbsp;»</p>
      <p style="margin-top:10px">${voice(regleVerte.objection.answer)}</p>
    </article>

    <section class="stack-s">
      <span class="label">${esc(S['concept.label.related_terms'])}</span>
      <div class="chips">${relatedTerms.map((e) => `<a class="chip chip-text" href="#"><span>${voice(e.term)}</span></a>`).join('')}</div>
    </section>

    <div class="stack-s">
      <a class="btn btn-primary btn-block" href="story.html">${I.send}${esc(S['concept.share'])}</a>
    </div>
    ${footer()}
  </main>
  ${tabbar('chapters')}
</div>
` + foot;

// =====================================================================
// 4. section.html — lecteur de section c12-s01
// =====================================================================
const chapeau = s1201.items.find((i) => i.kind === 'paragraph');
const measures = s1201.items.filter((i) => i.kind === 'measure');
const next = section('c12-s02');
const legal = fill('statcard.legal.no_sponsor', {
  organisation: stat.legal_77_808.organisme,
  dates: stat.legal_77_808.dates,
  chapter: c12.title,
});
const statText = stat.text;
const statHtml = statText.startsWith('83 %')
  ? `<span class="num">83 %</span>${esc(statText.slice(4))}`
  : esc(statText);

const sectionHtml = head('Chapitre 12, section 1') + `
<div class="app">
  ${topbar({ back: true })}
  <main class="screen stack">
    <div style="display:flex;gap:14px;align-items:center">
      <div class="orb-s">${ringSections(3, 1, partColor(p3))}<span class="num" aria-hidden="true">12</span></div>
      <div class="stack-s">
        <p class="tiny">${esc(p3.title)}</p>
        <p>${locChapter(c12, p3)}</p>
        <p class="counter">Section 1 sur 3</p>
      </div>
    </div>
    <h1 class="h1 block-3d"><span class="l">La bifurcation</span><span class="l">écologique pour</span><span class="l">une société</span><span class="l">de l’harmonie</span></h1>

    <article class="card card-elevated">
      <span class="label">${esc(S['concept.label.verbatim'])}</span>
      <blockquote class="verbatim" lang="fr">${esc(chapeau.text)}</blockquote>
    </article>

    <article class="card card-key">
      <div class="card-head">${loc(k01)}${kindChip(k01)}</div>
      <blockquote class="verbatim bold lg" lang="fr">${esc(k01.text)}</blockquote>
      <div class="actions" style="margin-top:14px">
        <a class="btn btn-primary" href="story.html">${I.send}${esc(S['measure.share'])}</a>
        <a class="btn btn-ghost" href="#">${I.copy}${esc(S['measure.copy_text'])}</a>
      </div>
    </article>

    <section class="stack-s">
      <div class="card-head" style="margin:0"><span class="label">Mesures</span><span class="counter">${measures.length}</span></div>
      ${measures.map((m, i) => `<article class="measure"><span class="n" aria-hidden="true">${i + 1}</span><p class="t" lang="fr">${esc(m.text)}</p></article>`).join('\n      ')}
    </section>

    <article class="card">
      <span class="label">${esc(S['statcard.label'])}</span>
      <blockquote class="verbatim" lang="fr">${statHtml}</blockquote>
      <p class="source">${voice(legal)} ${esc(S['statcard.legal.margin'])}</p>
      <div class="links"><a href="${stat && s1201.url}">${esc(S['statcard.legal.source_link'])}</a></div>
    </article>

    <article class="card card-elevated">
      <div style="display:flex;gap:14px;align-items:center">
        ${turtle('t-c-walk', 'turtle-96', turtleAlt)}
        <div class="stack-s" style="flex:1">
          <p class="h3">${v('progress.section_done')}</p>
          <p class="counter">1 section sur 3</p>
          <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="3" aria-valuenow="1"><i style="width:33.3%"></i></div>
        </div>
      </div>
    </article>

    <a class="btn-nav" href="#"><span class="lbl"><span>${esc(S['common.next'])}<small>${esc(next.title)}</small></span></span><span class="arr">${I.arrow}</span></a>

    ${footer()}
  </main>
  ${tabbar('chapters')}
</div>
` + foot;

// =====================================================================
// 5. chat.html — réponse + refus + mode dégradé (art. 50, D0.29)
// =====================================================================
const aiBadge = `<span class="chip chip-solid">${esc(S['chat.ai_badge'])}</span>`;
const cited = (it) => `<p class="cited">${v('chat.cited_from', { chapter: it.chapter.title, section: it.section.title })}</p>`;
const miniVerbatim = (it) => `
<div class="card card-elevated" style="padding:12px">
  <div class="card-head" style="margin-bottom:8px">${kindChip(it)}</div>
  <blockquote class="verbatim" lang="fr">${esc(it.text)}</blockquote>
  ${cited(it)}
</div>`;

const chat = head('Pose ta question') + `
<div class="app">
  ${topbar()}
  <main class="screen stack">
    <div class="stack-s" style="margin-top:4px">
      <h1 class="h2">${esc(S['chat.title'])}</h1>
      <p>${v('chat.intro')}</p>
    </div>
    <div class="notice" role="note"><span class="ia" aria-hidden="true">IA</span><p>${v('chat.ai_mention.v1')}</p></div>

    <div class="thread">
      <p class="bubble-user">C'est quoi la règle verte&nbsp;?</p>
      <section class="bubble-ai" aria-label="Réponse">
        ${aiBadge}
        <p class="liant">Deux passages du chapitre 12 répondent à ta question.</p>
        <div class="stack-s">
          ${miniVerbatim(k01)}
          ${miniVerbatim(m11)}
        </div>
        <div class="links"><a href="section.html">${esc(S['chat.read_full_section'])}</a><a href="concept.html">${v('chat.glossary_link', { term: 'règle verte' })}</a></div>
      </section>

      <p class="bubble-user">Il y a un moratoire sur les mégabassines&nbsp;?</p>
      <section class="card card-warn" aria-label="Refus">
        ${aiBadge}
        <p class="h3" style="margin-top:10px">${v('refusal.title')}</p>
        <p style="margin-top:6px">${v('refusal.lead')}</p>
        <span class="label" style="margin-top:12px;color:inherit">${esc(S['refusal.suggestions_label'])}</span>
        <div class="stack-s" style="margin-top:8px">
          ${miniVerbatim(m11)}
          ${miniVerbatim(rb)}
        </div>
        <div class="links"><a href="#" style="color:inherit">${esc(S['refusal.rephrase'])}</a></div>
      </section>

      <p class="bubble-user">Et pour l'eau&nbsp;?</p>
      <section class="bubble-ai" aria-label="Réponse extraite">
        <span class="chip chip-warn chip-wrap"><span>${esc(S['degraded.badge'])}</span></span>
        <p class="liant">${v('degraded.lead')}</p>
        <div class="stack-s">${miniVerbatim(rb)}</div>
        <div class="links"><a href="#">${esc(S['degraded.method_link'])}</a></div>
      </section>
    </div>

    <form class="composer" onsubmit="return false">
      <label class="search">${I.search}<input type="text" placeholder="${esc(S['chat.placeholder'])}" aria-label="${esc(S['chat.placeholder'])}"></label>
      <button class="btn btn-primary" type="submit">${esc(S['chat.send'])}</button>
    </form>
    <p class="chips"><a class="chip chip-outline" href="#">${esc(S['chat.ask_another'])}</a></p>
    ${footer()}
  </main>
  ${tabbar('search')}
</div>
` + foot;

// =====================================================================
// 6. story.html — carte 1080×1920 pour c12-s01-k01 (360×640 css, dsf 3)
// =====================================================================
const story = head('Story c12-s01-k01') + `
<div class="story">
  <div class="matter">
    <span class="label">${v('home.link.kicker')}</span>
    <article class="card card-elevated" style="border:0;padding:14px 14px 14px 12px">
      <div class="card-head">${locChapter(c12, p3)}${kindChip(k01)}</div>
      <span class="label">${esc(S['concept.label.verbatim'])}</span>
      <blockquote class="verbatim" lang="fr">${esc(k01.text)}</blockquote>
    </article>
  </div>
  <div class="flat">
    <p class="display"><span class="l">La règle verte,</span><span class="l">dans la</span><span class="l">Constitution.</span></p>
    <p class="lead" style="margin-top:-18px">Mot pour mot. Puis en clair, en trois minutes.</p>
    <div class="signature">
      <span class="wordmark">${APP}</span>
      <span>${v('attribution.card')}</span>
    </div>
  </div>
</div>
` + foot;

// =====================================================================
// 7. mascotte.html — 3 pistes × 24 / 48 / 512 px × Crème / Charbon
// =====================================================================
const pistes = [
  { id: 'a', name: 'A. Signet', note: 'Carapace = rectangle arrondi traversé d’un filet horizontal (écho du filet du verbatim) ; tête et pattes en trait. Progression : bandes horizontales. 5 formes.' },
  { id: 'b', name: 'B. Monotrait', note: 'Un seul trait Violet continu (dôme, deux arceaux, tête en goutte) ; un arc concentrique ; la mascotte est la jauge (les arcs se remplissent). 4 formes.' },
  { id: 'c', name: 'C. Marcheuse', note: 'Aplats sans contour, dôme Violet 200 + bord Violet, quadrupède de profil en marche vers la droite ; au jalon, la tête se lève. 5 formes.' },
];
const panel = (p, scheme) => `
<div class="panel scheme-${scheme}">
  <p class="label" style="margin-bottom:12px">${scheme === 'light' ? 'Crème #FFFCF4' : 'Charbon #212320'}</p>
  <div class="big">${turtle(`t-${p.id}`, 'turtle-512', turtleAlt)}</div>
  <div class="strip">
    <div class="fake-tabs">
      <span class="tab"><span class="ico">${I.home}</span><span>${esc(S['nav.home'])}</span></span>
      <span class="tab" aria-current="page"><span class="ico">${turtle(`t-${p.id}-24`, 'turtle-24', '')}</span><span>${esc(S['nav.chapters'])}</span></span>
      <span class="tab"><span class="ico">${I.bubble}</span><span>${esc(S['nav.riposte'])}</span></span>
    </div>
    <div class="sizes">
      <span>${turtle(`t-${p.id}-24`, 'turtle-24', '')}<em>24</em></span>
      <span>${turtle(`t-${p.id}`, 'turtle-48', '')}<em>48</em></span>
      <span>${turtle(`t-${p.id}`, 'turtle-96', '')}<em>96</em></span>
    </div>
  </div>
</div>`;

const mascotte = head('Mascotte, trois pistes') + `
<style>
  body { padding: 16px; }
  .board { max-width: 1180px; margin: 0 auto; }
  .piste { margin-top: 28px; }
  .piste .h2 { margin-bottom: 4px; }
  .panels { display: grid; grid-template-columns: 1fr; gap: 16px; margin-top: 12px; }
  @media (min-width: 1100px) { .panels { grid-template-columns: 1fr 1fr; } }
  .panel { background: var(--bg); color: var(--text); border: 1px solid var(--line); border-radius: 14px; padding: 16px; overflow: hidden; }
  .panel .big { overflow-x: auto; padding-bottom: 8px; }
  .strip { display: grid; grid-template-columns: 1fr; gap: 12px; margin-top: 12px; }
  @media (min-width: 520px) { .strip { grid-template-columns: 1fr 1fr; } }
  .fake-tabs { display: grid; grid-template-columns: repeat(3, 1fr); border: 1px solid var(--line); border-radius: 10px; background: var(--bg); }
  .fake-tabs .tab { min-height: 56px; }
  .sizes { display: flex; align-items: flex-end; justify-content: space-around; gap: 12px; padding: 8px; border: 1px dashed var(--line); border-radius: 10px; }
  .sizes span { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .sizes em { font-style: normal; font-size: 0.6875rem; font-weight: 700; color: var(--brand); }
  .rules { font-size: 0.875rem; }
</style>
<div class="board stack">
  <header class="topbar" style="padding:0"><span class="wordmark">${APP}</span><span class="chip chip-outline">T3 · D0.12 · D3.8</span></header>
  <h1 class="display block-3d"><span class="l">La tortue,</span><span class="l">trois pistes</span></h1>
  <p class="rules">Tortue originale, 2D plate, ≤ 6 formes, grille de 24 unités, tournée vers la droite, bichrome au repos (trait Violet + carapace Violet 200 ; bascule en sombre). Jamais d’isométrie, de grille de carapace, de pancarte ni de sigle (<code>design/illustration-rules.md</code> §2). Le 24 px est une silhouette pleine sans œil ; le 512 px porte le contour et l’œil.</p>
  ${pistes.map((p) => `
  <section class="piste">
    <h2 class="h2">${p.name}</h2>
    <p class="small">${p.note}</p>
    <div class="panels">${panel(p, 'light')}${panel(p, 'dark')}</div>
  </section>`).join('')}
  ${footer()}
</div>
` + foot;

// ---------- write ----------
const files = {
  'home-link.html': homeLink,
  'home-direct.html': homeDirect,
  'concept.html': concept,
  'section.html': sectionHtml,
  'chat.html': chat,
  'story.html': story,
  'mascotte.html': mascotte,
};
for (const [name, html] of Object.entries(files)) {
  writeFileSync(`${OUT}/${name}`, html, 'utf8');
  console.log('wrote', name, html.length);
}
