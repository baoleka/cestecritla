// Emits the twelve static artboards of the two finalist mechanics (07-mecaniques.md §9).
// Every verbatim is pulled by id from data/aec-2025.json and data/stat-cards.json; UI strings come
// from design/strings.json where a key exists, otherwise from the §9 spec tables (listed in README.md).
// Output: plain HTML + styles.css, no script, no framework. Run: node gen.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const corpus = JSON.parse(fs.readFileSync(path.join(root, 'data/aec-2025.json'), 'utf8'));
const statCards = JSON.parse(fs.readFileSync(path.join(root, 'data/stat-cards.json'), 'utf8')).cards;
const S = JSON.parse(fs.readFileSync(path.join(root, 'design/strings.json'), 'utf8'));

const APP_NAME = 'AEC Discover'; // {appName} placeholder until the naming sprint (T10)
const HOST = 'aec-discover.baoleka.workers.dev'; // D0.13: *.baoleka.workers.dev until the .fr zone exists
const NBSP = ' ';

// ---------- corpus lookups ----------
const items = new Map();
for (const section of corpus.sections) {
  for (const it of section.items) items.set(it.id, { it, section });
  for (const c of section.chiffres) items.set(c.id, { it: c, section });
}
const sectionById = (id) => corpus.sections.find((s) => s.id === id);
const chapterById = (id) => corpus.chapters.find((c) => c.id === id);
const chapterNumber = (chapterId) => chapterById(chapterId).number;
const item = (id) => {
  const r = items.get(id);
  if (!r) throw new Error(`unknown id ${id}`);
  return r;
};
const measureIndex = (id) => {
  const { it, section } = item(id);
  return section.items.filter((x) => x.kind === 'measure').indexOf(it) + 1;
};

// ---------- text helpers ----------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Display-only French spacing (non-breaking space before double punctuation and inside « »); characters
// of the verbatim are otherwise untouched (D3.2, voice.md rule 3). U+202F is normalised to U+00A0 (D3.6).
const typo = (s) =>
  esc(s)
    .replace(/ /g, NBSP)
    .replace(/ ([?!:;%»])/g, `${NBSP}$1`)
    .replace(/« /g, `«${NBSP}`)
    .replace(/ · /g, `${NBSP}·${NBSP}`)
    .replace(/ › /g, `${NBSP}›${NBSP}`);
const fill = (tpl, vars) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

const whereText = (id) => {
  const { section } = item(id);
  return `Chapitre ${chapterNumber(section.chapterId)} › ${section.title}`;
};
const where = (id) => typo(whereText(id));
const sectionRoute = (id) => `/s/${item(id).section.id}`;

// ---------- components ----------
const urlbar = (pathPart, frag = '') =>
  `<div class="urlbar" aria-label="Adresse de la page (maquette)"><span class="lock">https</span><span><span class="host">${HOST}</span><span class="route"><span class="path">${esc(pathPart)}</span>${frag ? `<span class="frag">${esc(frag)}</span>` : ''}</span></span></div>`;

const header = (right = '') =>
  `<header class="app-header"><a class="wordmark" href="/">${esc(APP_NAME)}</a>${right ? `<span class="position">${right}</span>` : ''}</header>`;

const footer = ({ attribution = false } = {}) =>
  `<footer class="app-footer">${attribution ? `<p>${typo(S['attribution.full'])}</p>` : ''}<p>${typo(S['independence.line'])}</p></footer>`;

const display = (lines, { small = false, no3d = false } = {}) =>
  `<h1 class="display${small ? ' small' : ''}${no3d ? ' no3d' : ''}">${lines.map((l, i) => `<span${i ? ` class="l${i + 1}"` : ''}>${typo(l)}</span>`).join('')}</h1>`;

const verbatim = (id, { big = false, label = S['concept.label.verbatim'], extraClass = '' } = {}) => {
  const { it, section } = item(id);
  const long = it.text.length > 60;
  return `<blockquote class="verbatim${big ? ' big' : ''}${big && long ? ' long' : ''}${extraClass ? ' ' + extraClass : ''}" cite="${esc(section.canonicalUrl)}" data-id="${id}"><span class="label">${typo(label)}</span>${typo(it.text)}</blockquote>`;
};

const navButton = (label, href, { solid = false, block = true } = {}) =>
  `<a class="btn btn-nav${solid ? ' btn-solid' : ''}${block ? ' btn-block' : ''}" href="${esc(href)}"><span class="lbl">${typo(label)}</span><span class="arrow" aria-hidden="true">→</span></a>`;

const page = ({ title, url, frag = '', body, note = '' }) => `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>${esc(title)}</title>
<link rel="stylesheet" href="styles.css">
</head>
<body>
<div class="screen">
${urlbar(url, frag)}
${body}
</div>
${note}
</body>
</html>
`;

// ---------- StatCard, 77-808 template (D5.5, D5.8 rule 8): only inside a SectionVerbatim ----------
const SIDECAR = {
  // Prototype sidecar lines (07-mecaniques.md §9.0 table; §7.4 fact-check, URL to archive in captures/)
  'c14-s02-a01': { dates: '9-12 juillet 2021', sponsor: 'La France insoumise', sample: `1${NBSP}241 personnes interrogées.` },
  'c12-s01-a01': { dates: '9-12 juillet 2021', sponsor: 'La France insoumise', sample: `1${NBSP}241 personnes interrogées.` },
};
const statCard = (id) => {
  const card = statCards.find((c) => c.id === id);
  if (!card) throw new Error(`unknown stat card ${id}`);
  const chapter = `chapitre ${chapterNumber(card.chapter_id)}`;
  const side = SIDECAR[id];
  const legal = side
    ? fill(S['statcard.legal.full'], { organisation: card.legal_77_808.organisme, dates: side.dates, sponsor: side.sponsor, chapter })
    : fill(S['statcard.legal.no_sponsor'], { organisation: card.legal_77_808.organisme, dates: card.legal_77_808.dates, chapter });
  const section = sectionById(card.section_id);
  return `<aside class="statcard" aria-label="${typo(S['statcard.label'])}" data-id="${id}">
  <span class="label">${typo(S['statcard.label'])}</span>
  <p class="figure">${typo(card.text)}</p>
  <p class="legal">${typo(legal)}${side ? ' ' + typo(side.sample) : ''}</p>
  <p class="legal">${typo(S['statcard.legal.margin'])}</p>
  <a href="${esc(section.canonicalUrl)}">${typo(S['statcard.legal.source_link'])}</a>
</aside>`;
};

// ---------- SectionVerbatim (shared component of F1 aha and F2 direct arrival) ----------
const sectionVerbatim = (sectionId, { hit = null, hitTag = '' } = {}) => {
  const section = sectionById(sectionId);
  const paragraphs = section.items.filter((x) => x.kind === 'paragraph');
  const keys = section.items.filter((x) => x.kind === 'key_measure');
  const measures = section.items.filter((x) => x.kind === 'measure');
  const li = measures
    .map((m) => {
      const isHit = m.id === hit;
      return `<li${isHit ? ' class="hit"' : ''} data-id="${m.id}">${isHit ? `<span class="tag">${typo(hitTag)}</span>` : ''}<p>${typo(m.text)}</p></li>`;
    })
    .join('\n');
  return `<section class="section-body" aria-label="Verbatim de la section">
  <div class="verbatim section" cite="${esc(section.canonicalUrl)}">
    <span class="label">${typo(S['concept.label.verbatim'])}</span>
    ${paragraphs.map((p) => `<p class="chapeau" data-id="${p.id}">${typo(p.text)}</p>`).join('\n')}
    ${keys.map((k) => `<div class="key" data-id="${k.id}"><span class="label">${typo(S['measure.key_label'])}</span><p>${typo(k.text)}</p></div>`).join('\n')}
    <ol class="measures">
${li}
    </ol>
  </div>
  ${section.chiffres.map((c) => statCard(c.id)).join('\n')}
  <div class="source">
    <span class="label">Vérifier à la source</span>
    <a href="${esc(section.canonicalUrl)}">${typo(S['common.open_official'])}</a>
    <p class="url">${esc(section.canonicalUrl)}</p>
  </div>
</section>`;
};

// ---------- mini-mosaic of the 18 chapters (never a count, never a denominator: §7.11 rule 4) ----------
const mosaic = (litChapters, { og = false } = {}) => {
  const parts = corpus.parts
    .map((p) => {
      const dots = p.chapterIds
        .map((cid) => {
          const n = chapterNumber(cid);
          const lit = litChapters.includes(cid);
          return og
            ? `<span class="${lit ? 'lit' : ''}"><span class="dot"></span></span>`
            : `<span class="ch${lit ? ' lit' : ''}" title="Chapitre ${n}"><span class="dot"></span><span class="n">${n}</span></span>`;
        })
        .join('');
      return `<span class="part ${p.id}">${dots}</span>`;
    })
    .join('');
  return og ? `<div class="og-mosaic">${parts}</div>` : `<div class="mosaic" role="img" aria-label="Les 18 chapitres ; ceux de tes découvertes sont allumés"><div class="parts">${parts}</div></div>`;
};

// =====================================================================================
// F1 — « Tu savais que c'était dedans ? »  /defi/254  (state: path index + fragment #r=)
// =====================================================================================
const F1 = {
  index: 254,
  dateLabel: '11 septembre',
  cards: ['c9-s01-m04', 'c7-s04-m05', 'c14-s02-m09', 'c18-s04-k01', 'c3-s02-m03'],
  player: 'sdddp', // the tester's answers on this board: savais, découvre, découvre, découvre, passé
  sender: 'ddsdp', // answers carried by the received link (#r=ddsdp)
};
const FACTS = '5 mesures · 1 min · rien à saisir';
const discovered = (answers) => F1.cards.filter((_, i) => answers[i] === 'd');

const playCard = (n, { facts = false } = {}) => {
  const id = F1.cards[n - 1];
  return `<section class="card-play" aria-label="Carte ${n} sur 5">
  ${verbatim(id, { big: true })}
  <p class="where">${where(id)}</p>
  <div class="choices">
    <button class="btn" type="button">Je savais</button>
    <button class="btn" type="button">Je découvre</button>
    <button class="btn btn-text" type="button">${typo(S['common.skip'])}</button>
  </div>
  ${facts ? `<p class="facts">${typo(FACTS)}</p>` : ''}
  <p class="quiet"><a href="${sectionRoute(id)}">Lire la section</a></p>
</section>`;
};

const f1Screens = {
  'f1-01-ecran0': page({
    title: 'F1 · écran 0 · /defi/254',
    url: `/defi/${F1.index}`,
    body: `${header(`1${NBSP}/${NBSP}5`)}
<main>
  ${display(['Tu savais que', "c'était dedans ?"])}
  <p class="lead">5 mesures du programme, une par écran.</p>
  ${playCard(1, { facts: true })}
</main>
${footer()}`,
  }),

  'f1-02-10s': page({
    title: 'F1 · 10 s · carte 2/5',
    url: `/defi/${F1.index}`,
    body: `${header()}
<main>
  <p class="kicker">${typo(S['home.hook.did_you_know'])}</p>
  ${display([`2${NBSP}/${NBSP}5`])}
  ${playCard(2)}
</main>
${footer()}`,
  }),

  'f1-03-aha': page({
    title: 'F1 · aha · /s/c14-s02',
    url: '/s/c14-s02',
    body: `${header()}
<main>
  <a class="backlink" href="/defi/${F1.index}">←${NBSP}Reprendre le tirage (3/5)</a>
  ${display(['Chapitre 14'], { small: true })}
  <h1 class="h1">${typo(sectionById('c14-s02').title)}</h1>
  ${sectionVerbatim('c14-s02', { hit: 'c14-s02-m09', hitTag: 'Carte 3 du tirage' })}
  <div class="stack">
    <a class="btn btn-primary btn-block" href="/defi/${F1.index}">Reprendre le tirage (3/5)</a>
  </div>
</main>
${footer({ attribution: true })}`,
  }),

  'f1-04-resultat': page({
    title: 'F1 · résultat · /defi/254',
    url: `/defi/${F1.index}`,
    body: `${header()}
<main>
  <p class="kicker">Tirage du ${F1.dateLabel}</p>
  ${display(['3 mesures', "qui m'ont", 'surpris·e'])}
  ${discovered(F1.player)
    .map(
      (id) => `<section class="surprise" data-id="${id}">
    ${verbatim(id)}
    <p class="where"><span>${where(id)}</span><a href="${sectionRoute(id)}">Lire la section</a></p>
  </section>`,
    )
    .join('\n')}
  ${mosaic(discovered(F1.player).map((id) => item(id).section.chapterId))}
  <p class="legend small">Les chapitres de tes découvertes s'allument.</p>
  <div class="stack">
    <button class="btn btn-primary btn-block" type="button">Et toi${NBSP}?</button>
    <p class="hint">Le lien envoyé ne contient pas tes réponses.</p>
    <button class="btn btn-block" type="button">Comparer nos découvertes</button>
    <p class="hint">Ce lien contient tes 5 réponses.</p>
    <button class="btn btn-block" type="button">Encore${NBSP}?</button>
    <p class="hint">Douze mesures de plus, sans partage.</p>
    ${navButton('Lire le programme', '/', { solid: true })}
  </div>
</main>
${footer()}`,
  }),

  'f1-05-carte': page({
    title: 'F1 · carte · feuille de partage',
    url: `/defi/${F1.index}`,
    body: `${header()}
<main class="sheet">
  <p class="kicker">Et toi${NBSP}?</p>
  ${display(['Envoyer à', "quelqu'un"], { no3d: true })}
  <div class="preview">
    <div>
      <div class="og-wrap" style="width:270px;height:480px">
        ${storyCard(0.25)}
      </div>
      <p class="caption">Image 1080${NBSP}×${NBSP}1920, dessinée sur ton téléphone depuis le tirage du jour.</p>
    </div>
    <div>
      <div class="og-wrap" style="width:358px;height:188px">
        ${ogCardF1(358 / 1200)}
      </div>
      <p class="caption">Aperçu du lien (1200${NBSP}×${NBSP}630), sans les textes des mesures.</p>
    </div>
  </div>
  <p class="kicker">${typo(S['share.message.picker_label'])}</p>
  <div class="share-text">Tirage du ${F1.dateLabel}${NBSP}: 3 mesures du programme qui m'ont surpris·e. À toi${NBSP}: <span class="url">https://${HOST}/defi/${F1.index}</span></div>
  <div class="stack">
    <button class="btn btn-primary btn-block" type="button">${typo(S['share.button_whatsapp'])}</button>
    <button class="btn btn-block" type="button">${typo(S['share.button_copy'])}</button>
    <button class="btn btn-block" type="button">${typo(S['share.button_image'])}</button>
  </div>
  <p class="hint">Le lien envoyé ne contient pas tes réponses.</p>
</main>
${footer()}`,
  }),

  'f1-06-lien': page({
    title: 'F1 · arrivée par lien · /defi/254#r=ddsdp',
    url: `/defi/${F1.index}`,
    frag: `#r=${F1.sender}`,
    body: `${header(`1${NBSP}/${NBSP}5`)}
<main>
  <div class="context">
    <p>Quelqu'un t'envoie 5 mesures de <em>l'Avenir en commun 2025</em>, le programme.</p>
    <p>Quelqu'un a déjà joué. Ses découvertes s'affichent après tes réponses.</p>
  </div>
  ${display(['Tu savais que', "c'était dedans ?"])}
  ${playCard(1, { facts: true })}
</main>
${footer()}`,
    note: `<section class="screen" aria-label="État suivant du même lien" style="border-top:2px dashed var(--line);min-height:0">
<main>
  <p class="kicker">Même lien, après tes 5 réponses (bloc ajouté au résultat)</p>
  <section class="common">
    <h2 class="h2">Vous avez découvert 2 mesures en commun</h2>
    ${F1.cards
      .filter((_, i) => F1.player[i] === 'd' && F1.sender[i] === 'd')
      .map((id) => `<section class="surprise" data-id="${id}">${verbatim(id)}<p class="where"><span>${where(id)}</span><a href="${sectionRoute(id)}">Lire la section</a></p></section>`)
      .join('\n')}
    <p class="hint">Aucun score, aucun gagnant. «${NBSP}Et toi${NBSP}?${NBSP}» renvoie <strong>/defi/${F1.index}</strong> sans <strong>#r=</strong>.</p>
  </section>
</main>
</section>`,
  }),
};

// ---------- F1 share images (client-side canvas in production; here the same content as DOM) ----------
function storyCard(scale) {
  const ids = discovered(F1.player);
  return `<div class="og story" style="transform:scale(${scale})" aria-label="Image de partage 1080 × 1920">
  <div class="matter">
    <p class="og-label">${typo(S['concept.label.verbatim'])}</p>
    ${ids.map((id) => `<div><p class="og-verbatim">${typo(item(id).it.text)}</p><p class="og-where">${where(id)}</p></div>`).join('')}
  </div>
  <div class="flat">
    <div>
      <p class="og-title"><span>3 mesures</span><span class="l2">qui m'ont</span><span class="l3">surpris·e</span></p>
      <p class="og-kicker">Tirage du ${F1.dateLabel}</p>
      ${mosaic(ids.map((id) => item(id).section.chapterId), { og: true })}
      <div class="cta"><span class="og-btn red">Et toi${NBSP}?</span><span class="og-btn line">Lire le programme</span></div>
    </div>
    <div>
      <div class="signature"><span class="wm">${esc(APP_NAME)}</span><span class="attr">${typo(S['attribution.card'])}<br>Carte${NBSP}: ${esc(APP_NAME)}, projet militant indépendant</span></div>
      <p class="og-url">${HOST}/defi/${F1.index}</p>
    </div>
  </div>
</div>`;
}

function ogCardF1(scale) {
  return `<div class="og wide" style="transform:scale(${scale})" aria-label="Aperçu de lien 1200 × 630">
  <div class="matter">
    <div>
      <p class="og-label">Les 5 chapitres du tirage</p>
      <div class="chips">${F1.cards.map((id) => `<span class="chip">${where(id)}</span>`).join('')}</div>
    </div>
  </div>
  <div class="flat">
    <div>
      <p class="og-kicker">5 mesures du programme.</p>
      <p class="og-title"><span>Tu savais que</span><span class="l2">c'était dans</span><span class="l3">le programme${NBSP}?</span></p>
    </div>
    <div>
      <div class="signature"><span class="wm">${esc(APP_NAME)}</span><span class="attr">${typo(S['attribution.card'])}<br>Carte${NBSP}: ${esc(APP_NAME)}, projet militant indépendant</span></div>
      <p class="og-url" style="margin-top:12px">${HOST}/defi/${F1.index}</p>
    </div>
  </div>
</div>`;
}

// =====================================================================================
// F2 — « Laquelle est ici ? »  /q/c12-s01  (state: none; path = section id)
// =====================================================================================
const F2 = {
  section: 'c12-s01',
  options: ['c12-s01-m03', 'c5-s02-m06', 'c18-s01-m02'], // A, B, C (seeded order for this section)
  next: { section: 'c12-s02', options: ['c8-s02-m02', 'c12-s02-m08', 'c16-s12-m02'] },
};
const LETTERS = ['A', 'B', 'C'];
const RULE_LINE = 'Les trois sont dans le programme, mot pour mot. Une seule est dans cette section.';
const sectionLine = (sectionId) => {
  const s = sectionById(sectionId);
  return `Section${NBSP}: ${s.title} — Chapitre ${chapterNumber(s.chapterId)}`;
};

const options = ({ revealed = false, tapped = null } = {}) =>
  `<ol class="options" aria-label="Trois mesures, une seule est dans cette section">${F2.options
    .map((id, i) => {
      const { it, section } = item(id);
      const correct = section.id === F2.section;
      const cls = ['option', revealed && correct ? 'correct' : '', revealed && tapped === id ? 'tapped' : ''].filter(Boolean).join(' ');
      let reveal = '';
      if (revealed) {
        if (correct) {
          reveal = `<div class="reveal"><strong>C'est la mesure ${measureIndex(id)} de cette section.</strong></div>`;
        } else {
          const lead = tapped === id ? `Celle-ci existe aussi${NBSP}: elle est dans` : 'Elle est dans';
          reveal = `<div class="reveal">${lead} «${NBSP}${esc(section.title)}${NBSP}», chapitre ${chapterNumber(section.chapterId)}.<br>${navButton('Y aller', `/s/${section.id}`, { solid: tapped === id, block: false })}</div>`;
        }
      }
      const inner = `<span class="letter" aria-hidden="true">${LETTERS[i]}</span>${verbatim(id)}${reveal}`;
      return revealed
        ? `<li class="${cls}" data-id="${id}">${inner}</li>`
        : `<li><button class="${cls}" type="button" data-id="${id}">${inner}</button></li>`;
    })
    .join('')}</ol>`;

const quizHead = ({ as = 'h1' } = {}) =>
  `${as === 'h1' ? display(['Laquelle', 'est ici ?']) : `<h2 class="h2">Laquelle est ici${NBSP}?</h2>`}
  <p class="small">${typo(sectionLine(F2.section))}</p>
  <p class="rule-line">${typo(RULE_LINE)}</p>`;

const f2Screens = {
  'f2-01-ecran0': page({
    title: 'F2 · écran 0 · bas de /s/c12-s01',
    url: `/s/${F2.section}`,
    body: `${header()}
<main>
  ${display(['Chapitre 12'], { small: true })}
  <h1 class="h1">${typo(sectionById(F2.section).title)}</h1>
  ${sectionVerbatim(F2.section)}
  <section class="quiz" aria-label="Laquelle est ici ?">
    ${quizHead({ as: 'h2' })}
    ${options()}
  </section>
</main>
${footer({ attribution: true })}`,
  }),

  'f2-02-10s': page({
    title: 'F2 · 10 s · /q/c12-s01',
    url: `/q/${F2.section}`,
    body: `${header()}
<main>
  <section class="quiz">
    ${quizHead()}
    ${options()}
    <div class="quiz-actions">${navButton('Lire la section', `/s/${F2.section}`)}</div>
  </section>
</main>
${footer()}`,
  }),

  'f2-03-aha': page({
    title: 'F2 · aha · B touchée · /q/c12-s01',
    url: `/q/${F2.section}`,
    body: `${header()}
<main>
  <section class="quiz">
    ${quizHead()}
    ${options({ revealed: true, tapped: 'c5-s02-m06' })}
    <div class="quiz-actions">${navButton('Lire la section', `/s/${F2.section}`)}</div>
  </section>
</main>
${footer()}`,
  }),

  'f2-04-resultat': page({
    title: 'F2 · résultat · /q/c12-s01',
    url: `/q/${F2.section}`,
    body: `${header()}
<main>
  <section class="quiz">
    ${quizHead()}
    ${options({ revealed: true, tapped: 'c5-s02-m06' })}
    <div class="stack">
      ${navButton('Lire la section', `/s/${F2.section}`, { solid: true })}
      <a class="btn btn-block" href="/q/${F2.next.section}">Une autre section${NBSP}?</a>
      <p class="hint">La suivante dans le livre${NBSP}: «${NBSP}${esc(sectionById(F2.next.section).title)}${NBSP}».</p>
      <button class="btn btn-block" type="button">Envoyer cette question</button>
    </div>
  </section>
</main>
${footer()}`,
  }),

  'f2-05-carte': page({
    title: 'F2 · carte · feuille de partage',
    url: `/q/${F2.section}`,
    body: `${header()}
<main class="sheet">
  <p class="kicker">Envoyer cette question</p>
  ${display(['Envoyer à', "quelqu'un"], { no3d: true })}
  <div class="preview">
    <div>
      <div class="og-wrap" style="width:358px;height:188px">
        ${ogCardF2(358 / 1200)}
      </div>
      <p class="caption">Aperçu du lien (1200${NBSP}×${NBSP}630), pré-généré, sans la réponse.</p>
    </div>
  </div>
  <p class="kicker">${typo(S['share.message.picker_label'])}</p>
  <div class="share-text">Trois mesures du programme, toutes vraies. Une seule est dans cette section${NBSP}: <span class="url">https://${HOST}/q/${F2.section}</span></div>
  <div class="stack">
    <button class="btn btn-primary btn-block" type="button">${typo(S['share.button_whatsapp'])}</button>
    <button class="btn btn-block" type="button">${typo(S['share.button_copy'])}</button>
  </div>
  <p class="hint">Le lien est le même avant et après ta réponse${NBSP}: il ne dit pas ce que tu as touché.</p>
</main>
${footer()}`,
  }),

  'f2-06-lien': page({
    title: 'F2 · arrivée par lien, révélée · /q/c12-s01',
    url: `/q/${F2.section}`,
    body: `${header()}
<main>
  <section class="quiz">
    ${quizHead()}
    ${options({ revealed: true, tapped: 'c12-s01-m03' })}
    <div class="stack">
      ${navButton('Lire la section', `/s/${F2.section}`, { solid: true })}
      <p class="hint" style="margin-top:6px"><strong>Et la tienne${NBSP}?</strong></p>
      <a class="btn btn-block" href="/q/${F2.next.section}">Une autre section${NBSP}?</a>
    </div>
  </section>
</main>
${footer()}`,
  }),
};

function ogCardF2(scale) {
  const s = sectionById(F2.section);
  return `<div class="og quiz-card" style="transform:scale(${scale})" aria-label="Aperçu de lien 1200 × 630">
  <div class="flat">
    <p class="og-title"><span>Laquelle est dans</span><span class="l2 plain">«${NBSP}${esc(s.title)}${NBSP}»${NBSP}?</span></p>
  </div>
  <div class="matter">
    <p class="rule-line">Les trois sont dans le programme, mot pour mot.</p>
    ${F2.options
      .map((id, i) => `<div class="opt"><span class="letter">${LETTERS[i]}</span><div><p class="og-verbatim">${typo(item(id).it.text)}</p><p class="og-where">Chapitre ${chapterNumber(item(id).section.chapterId)}</p></div></div>`)
      .join('')}
  </div>
  <div class="band"><div class="signature"><span class="wm">${esc(APP_NAME)}</span><span class="attr">${typo(S['attribution.card'])}<br>Carte${NBSP}: ${esc(APP_NAME)}, projet militant indépendant</span></div></div>
</div>`;
}

// ---------- write ----------
const all = { ...f1Screens, ...f2Screens };
for (const [name, html] of Object.entries(all)) {
  fs.writeFileSync(path.join(here, `${name}.html`), html);
}
const idsUsed = [...new Set([...F1.cards, ...F2.options, ...F2.next.options, 'c12-s01-k01', 'c14-s02-k01'])];
fs.writeFileSync(
  path.join(here, 'manifest.json'),
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      corpus_version: corpus.meta.corpus_version,
      screens: Object.keys(all),
      f1: { route: `/defi/${F1.index}`, fragment_on_compare_link: `#r=${F1.player}`, received_fragment: `#r=${F1.sender}`, cards: F1.cards, player: F1.player, sender: F1.sender },
      f2: { route: `/q/${F2.section}`, options: F2.options, next: F2.next },
      stat_cards_rendered: ['c14-s02-a01', 'c12-s01-a01'],
      ids: Object.fromEntries(idsUsed.map((id) => [id, item(id).it.text])),
    },
    null,
    2,
  ) + '\n',
);
console.log(`wrote ${Object.keys(all).length} screens`);
