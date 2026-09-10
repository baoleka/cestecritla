/**
 * F2 share card preview, 1200 x 630 (07-mecaniques.md §9.2 screen 4): /q/card.html?s=<section id>
 *
 * Production pre-generates this image at build for the sections outside the sensitive list; here the
 * same composition is rendered in HTML so the canvas can judge it. Content by id only (the three
 * options of quiz-triplets.json, the section and chapter titles), never the answer, never a stat card.
 * On a sensitive section the standard section card is drawn instead (D5.12).
 */
import {
  init,
  qs,
  getSection,
  getChapter,
  getItem,
  locate,
  t,
  frTypo,
  el,
  APP,
} from '../shared/ui.js';

const SECTION_ID = /^c\d{1,2}-s\d{2}$/;
const LETTERS = ['A', 'B', 'C'];
const og = document.getElementById('og');

const STRINGS = Object.freeze({
  'q.card.title': 'Laquelle est dans « {section} » ?',
  'q.card.rule': 'Les trois sont dans le programme, mot pour mot',
  'q.card.chapter': 'Chapitre {chapter}',
  'q.card.text_line': 'Texte : L’Avenir en commun (La France insoumise), CC BY-NC-SA 4.0',
  'q.card.card_line': 'Carte : {appName}, projet militant indépendant',
  'q.card.route': '{domain}/q/{section}',
  'q.card.section_route': '{domain}/s/{section}',
  'q.card.section_lead': 'Mot pour mot, dans le livre officiel.',
});
const fill = (raw, params) =>
  raw.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
const s = (key, params = {}) =>
  frTypo(fill(STRINGS[key], { appName: APP.name, domain: APP.domain, ...params }));

async function loadTriplets() {
  const r = await fetch(new URL('../shared/data/quiz-triplets.json', import.meta.url));
  if (!r.ok) throw new Error(`quiz-triplets.json: HTTP ${r.status}`);
  return r.json();
}

const wordmark = () =>
  el('span', { class: 'wordmark', 'aria-label': APP.name }, [
    'C’est écrit ',
    el('span', { class: 'la', text: 'là' }),
  ]);

function foot(route) {
  return el('div', { class: 'foot' }, [
    el('div', {}, [
      el('p', { text: s('q.card.text_line') }),
      el('p', { text: s('q.card.card_line') }),
    ]),
    el('p', { class: 'url', text: route }),
  ]);
}

function renderQuestion(section, triplet) {
  const options = triplet.options.map((id) => getItem(id));
  og.replaceChildren(
    el('div', { class: 'head' }, [
      wordmark(),
      el('p', { class: 'kicker', text: t('home.link.kicker') }),
    ]),
    el('h1', { class: 'title' }, [s('q.card.title', { section: section.title })]),
    el('p', { class: 'rule', text: s('q.card.rule') }),
    el(
      'ol',
      { class: 'opts' },
      options.map((item, index) => {
        const { chapter } = locate(item);
        return el('li', { class: 'opt' }, [
          el('span', { class: 'letter', text: LETTERS[index] }),
          el('span', {}, [
            el('span', { class: 'label', text: t('concept.label.verbatim') }),
            el('span', { class: `txt${item.text.length > 90 ? ' long' : ''}`, text: item.text }),
            el('span', { class: 'ch', text: s('q.card.chapter', { chapter: chapter.number }) }),
          ]),
        ]);
      }),
    ),
    foot(s('q.card.route', { section: section.id })),
  );
}

/** Standard section card (the /s/ card of D5.10): chapter, title, the head measure verbatim. */
function renderSectionCard(section) {
  const chapter = getChapter(section.chapterId);
  const head =
    section.items.find((i) => i.kind === 'key_measure') ??
    section.items.find((i) => i.kind === 'measure') ??
    null;
  og.classList.add('section');
  og.replaceChildren(
    el('div', { class: 'head' }, [
      wordmark(),
      el('p', { class: 'kicker', text: t('home.link.kicker') }),
    ]),
    el('p', { class: 'chapter', text: `Chapitre ${chapter.number} · ${chapter.name}` }),
    el('h1', { class: 'title', text: section.title }),
    el('p', { class: 'lead', text: s('q.card.section_lead') }),
    head
      ? el('blockquote', { class: 'verbatim' }, [
          el('span', { class: 'label', text: t('concept.label.verbatim') }),
          el('p', { text: head.text }),
        ])
      : null,
    foot(s('q.card.section_route', { section: section.id })),
  );
}

try {
  const [, triplets] = await Promise.all([init(), loadTriplets()]);
  const id = qs('s') || 'c12-s01';
  const section = SECTION_ID.test(id) ? getSection(id) : null;
  if (!section) og.replaceChildren(el('p', { class: 'small', text: t('section.unknown') }));
  else if (triplets.meta.sensitive_sections.includes(section.id) || !triplets.triplets[section.id])
    renderSectionCard(section);
  else renderQuestion(section, triplets.triplets[section.id]);
  document.title = `${section ? section.title : t('section.unknown')} — ${APP.name}`;
} catch (err) {
  og.replaceChildren(el('p', { class: 'small', text: t('error.generic') }));
  console.error(err);
}
