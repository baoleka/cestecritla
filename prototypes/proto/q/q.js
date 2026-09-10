/**
 * F2 « Laquelle est ici ? » (07-mecaniques.md §8.3, §9.2, D5.7, D5.12): /q/?s=<section id>[&from=link]
 *
 * Three real measures, all verbatim by id: one is in this section, two are real measures of other
 * sections (the « vie quotidienne » decoy pool, quiz-triplets.json built by scripts/build-triplets.mjs,
 * same three options for everyone). The user taps the one that is here; nothing is scored, nothing
 * is red, nothing is blocked: a decoy answers « Celle-ci existe aussi, mais ailleurs : … » with
 * « Y aller », the one that is here is outlined with « C'est la mesure n de cette section », and the
 * SectionVerbatim follows in one tap (« Lire la section », the reader with a return link).
 *
 * State: none. The reveal is never encoded (the link is identical before and after); ?s is validated
 * (^c\d{1,2}-s\d{2}$ and present in the 89); ?from=link renders the link-arrival variant (D3.12:
 * impersonal lines, no navigation chrome). Nothing is written to localStorage. « Passer » reveals
 * without choosing (D5.9: a button, never a swipe). No stat card here: they live in the section only (D5.5).
 */
import {
  init,
  qs,
  getSection,
  getChapter,
  getCorpus,
  getItem,
  locate,
  routes,
  absolute,
  t,
  frTypo,
  el,
  button,
  setTitle,
  shareButton,
} from '../shared/ui.js';

const SECTION_ID = /^c\d{1,2}-s\d{2}$/;
const DEFAULT_SECTION = 'c12-s01';
const LETTERS = ['A', 'B', 'C'];

/**
 * v0.2 strings proposed for F2 (play.* of 05-direction-artistique.md §9), kept here so the deltas with
 * design/strings.json are visible; to be judged in T9 / T11. No « quiz », no « bravo », no « bonne réponse » (§7.3).
 */
const Q_STRINGS = Object.freeze({
  'q.title': 'Laquelle est ici ?',
  'q.section_label': 'Section · Chapitre {chapter}',
  'q.rule': 'Les trois sont dans le programme, mot pour mot. Une seule est dans cette section.',
  'q.options_label': 'Trois mesures du programme, mot pour mot',
  'q.here': 'C’est la mesure {n} de cette section.',
  'q.here_key': 'C’est la mesure clé de cette section.',
  'q.elsewhere': 'Celle-ci existe aussi, mais ailleurs : « {section} », chapitre {chapter}.',
  'q.go': 'Y aller',
  'q.revealed': 'Voici où est chacune.',
  'q.another': 'Une autre section ?',
  'q.next_section': 'Section suivante',
  'q.next_line': 'Chapitre {chapter} · {section}',
  'q.share': 'Envoyer cette question',
  'q.share_text': 'Trois mesures du programme, toutes vraies. Une seule est dans cette section :',
  'q.share_section_text': 'C’est écrit là, mot pour mot, dans L’Avenir en commun 2025 :',
  'q.link.hint': 'Ces trois passages viennent du livre officiel.',
  'q.back_label': 'Retour à la question',
  'q.unavailable': 'Pas de question pour cette section.',
  'q.read_programme': 'Lire le programme',
});

const fill = (raw, params) =>
  raw.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
/** Module strings first, then the shared kit. */
const tq = (key, params = {}) =>
  key in Q_STRINGS ? frTypo(fill(Q_STRINGS[key], params)) : t(key, params);

const content = document.getElementById('content');
const announce = document.getElementById('announce');
const linkArrival = qs('from') === 'link';

/* ---------- Routes of this module (production: /q/<section>, D5.10) ---------- */
const qRoute = (sectionId, { link = false } = {}) =>
  `${routes.root}q/?s=${encodeURIComponent(sectionId)}${link ? '&from=link' : ''}`;
/** Section reader with a return link to this question and the item targeted (#id). */
function readerRoute(sectionId, itemId) {
  const back = qRoute(getSectionIdParam(), { link: linkArrival });
  const q = new URLSearchParams({ id: sectionId, back, backLabel: tq('q.back_label') });
  return `${routes.root}section/?${q}${itemId ? `#${itemId}` : ''}`;
}
function getSectionIdParam() {
  const raw = qs('s');
  return raw == null || raw === '' ? DEFAULT_SECTION : raw;
}

/* ---------- Data ---------- */
let triplets = null;
async function loadTriplets() {
  const r = await fetch(new URL('../shared/data/quiz-triplets.json', import.meta.url));
  if (!r.ok) throw new Error(`quiz-triplets.json: HTTP ${r.status}`);
  triplets = await r.json();
  return triplets;
}
const isSensitive = (sectionId) => triplets.meta.sensitive_sections.includes(sectionId);

/* ---------- Helpers ---------- */
function splitLines(text, max = 9) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
const displayTitle = (text) =>
  el(
    'h1',
    { class: 'display' },
    splitLines(text).map((l) => el('span', { class: 'l', text: l })),
  );

/** « C'est la mesure 3 de cette section. » : the position among the section's measures (one counting rule). */
function hereSentence(section, item) {
  if (item.kind === 'key_measure') return tq('q.here_key');
  const n =
    section.items.filter((i) => i.kind === 'measure').findIndex((i) => i.id === item.id) + 1;
  return tq('q.here', { n });
}

function renderUnknown(message = t('section.unknown')) {
  content.replaceChildren(
    el('h1', { class: 'title', text: message }),
    el('p', { class: 'lead', text: t('section.unknown_lead') }),
    button({ label: t('home.direct.cta_search'), href: routes.search(''), arrow: true }),
  );
  setTitle(message);
}

/* ---------- Screen ---------- */
function render(section, triplet) {
  const corpus = getCorpus();
  const chapter = getChapter(section.chapterId);
  const options = triplet.options.map((id) => getItem(id));
  const hereItem = getItem(triplet.here);
  setTitle(`${tq('q.title')} · ${section.title}`);

  // Link arrival (D3.12): kicker, no navigation chrome; the footer keeps the attribution only.
  if (linkArrival) {
    document.getElementById('nav').hidden = true;
    document.getElementById('top').classList.add('tight');
    document.getElementById('kicker').hidden = false;
    document.getElementById('independence').hidden = true;
    document.getElementById('privacy').hidden = true;
  }

  const nodes = [];
  nodes.push(displayTitle(tq('q.title')));
  nodes.push(
    el('p', { class: 'q-section' }, [
      el('span', { class: 'label', text: tq('q.section_label', { chapter: chapter.number }) }),
      el('strong', { class: 'ttl', text: section.title }),
    ]),
  );
  nodes.push(el('p', { class: 'q-rule', text: tq('q.rule') }));

  // The three options: one tap each, the whole block is the target.
  const list = el('ol', { class: 'opts', 'aria-label': tq('q.options_label') });
  const rows = options.map((item, index) => {
    const btn = el(
      'button',
      { type: 'button', class: 'opt', dataset: { id: item.id, motion: 'press' } },
      [
        el('span', { class: 'letter', text: LETTERS[index] }),
        el('span', { class: 'body' }, [
          el('span', { class: 'label', 'aria-hidden': 'true', text: t('concept.label.verbatim') }),
          el('span', { class: 'txt', lang: 'fr', text: item.text }),
        ]),
      ],
    );
    const fb = el('div', { class: 'fb', tabindex: '-1' });
    const li = el('li', { class: 'opt-item', dataset: { id: item.id } }, [btn, fb]);
    btn.addEventListener('click', () => reveal(item));
    list.append(li);
    return { item, btn, fb, li };
  });
  nodes.push(list);

  // Before the reveal: « Passer » (reveals without choosing) and « Lire la section » (the reader, one tap).
  const controls = el('div', { class: 'q-controls' }, [
    el('button', {
      type: 'button',
      class: 'textlink',
      dataset: { motion: 'press' },
      text: t('common.skip'),
      onclick: () => reveal(null),
    }),
  ]);
  if (linkArrival) nodes.push(el('p', { class: 'small', text: tq('q.link.hint') }));
  nodes.push(controls);
  const readBefore = button({
    label: t('link.read_section'),
    href: readerRoute(section.id),
    primary: false,
    arrow: true,
  });
  nodes.push(readBefore);
  // Link arrival: independence and privacy lines right after the buttons (impersonal, D3.12), not only in the footer.
  const lines = linkArrival
    ? el('div', { class: 'q-lines small' }, [
        el('p', { text: t('independence.line') }),
        el('p', { text: t('privacy.no_account_impersonal') }),
      ])
    : null;
  if (lines) nodes.push(lines);

  const result = el('div', { class: 'q-result', hidden: true });
  nodes.push(result);
  content.replaceChildren(...nodes);

  let revealed = false;
  /** Reveal where each option is; `tapped` is the option chosen (null for « Passer »). */
  function reveal(tapped) {
    if (revealed) return;
    revealed = true;
    let announced = tapped ? '' : tq('q.revealed');
    for (const row of rows) {
      row.btn.disabled = true;
      const loc = locate(row.item);
      if (row.item.id === hereItem.id) {
        row.li.classList.add('is-here');
        const sentence = hereSentence(section, row.item);
        row.fb.append(el('p', { class: 'here', text: sentence }));
        if (tapped?.id === row.item.id) announced = sentence;
      } else {
        const sentence = tq('q.elsewhere', {
          section: loc.section.title,
          chapter: loc.chapter.number,
        });
        row.fb.append(
          el('p', { text: sentence }),
          el('a', {
            class: 'textlink',
            href: readerRoute(loc.section.id, row.item.id),
            text: tq('q.go'),
          }),
        );
        if (tapped?.id === row.item.id)
          announced = `${sentence} ${hereSentence(section, hereItem)}`;
      }
      // Next frame so the opacity / transform transition runs (<= 200 ms, none under reduced motion).
      requestAnimationFrame(() => row.fb.classList.add('show'));
    }
    controls.remove();
    readBefore.remove();
    announce.textContent = announced;

    // Result: « Lire la section » is the primary button (one tap to the SectionVerbatim), then the
    // share group (the section's standard link on a sensitive section, D5.12), then « Une autre section ? ».
    const parts = [
      button({
        label: t('link.read_section'),
        href: readerRoute(section.id, hereItem.id),
        arrow: true,
      }),
    ];
    parts.push(
      isSensitive(section.id)
        ? shareButton({
            title: t('app.name'),
            text: tq('q.share_section_text'),
            url: absolute(routes.section(section.id)),
            label: t('section.share_this'),
            primary: false,
          })
        : shareButton({
            title: t('app.name'),
            text: tq('q.share_text'),
            url: absolute(qRoute(section.id, { link: true })),
            label: tq('q.share'),
            primary: false,
          }),
    );
    const nextId = corpus.order[section.index + 1] ?? null;
    parts.push(el('h2', { class: 'h another', text: tq('q.another') }));
    if (nextId) {
      const next = getSection(nextId);
      parts.push(
        el('p', {
          class: 'next',
          text: tq('q.next_line', {
            chapter: getChapter(next.chapterId).number,
            section: next.title,
          }),
        }),
      );
      parts.push(
        button({ label: tq('q.next_section'), href: qRoute(next.id), primary: false, arrow: true }),
      );
    } else {
      parts.push(
        button({ label: tq('q.read_programme'), href: routes.home, primary: false, arrow: true }),
      );
    }
    result.replaceChildren(...parts);
    result.hidden = false;
    if (lines) result.after(lines);

    // Focus follows the feedback of what was tapped (or the one that is here after « Passer »).
    const target = rows.find((r) => r.item.id === (tapped?.id ?? hereItem.id));
    target?.fb.focus({ preventScroll: false });
  }
}

try {
  await Promise.all([init(), loadTriplets()]);
  const id = getSectionIdParam();
  const section = SECTION_ID.test(id) ? getSection(id) : null;
  if (!section) renderUnknown();
  else if (!triplets.triplets[section.id]) renderUnknown(tq('q.unavailable'));
  else render(section, triplets.triplets[section.id]);
} catch (err) {
  content.replaceChildren(el('p', { class: 'notice warn', text: t('error.generic') }));
  console.error(err);
}
