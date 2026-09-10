/**
 * Écran 0 direct (D0.19, militant): local search over titles + measures (substring on normalised
 * text, <= 10 results, no network at keystroke), riposte entry, measure of the day (deterministic
 * by date), reading progression from localStorage, table of chapters.
 * State: #q=<query> in the hash; ?date=YYYY-MM-DD for the day (demo).
 */
import {
  init,
  getCorpus,
  getSection,
  getChapter,
  getPart,
  search,
  formatVerbatim,
  markedText,
  dailyMeasure,
  effectiveDate,
  isoDay,
  formatDateFr,
  silence,
  progress,
  shareButton,
  routes,
  t,
  el,
  button,
  hashParam,
  partIds,
  absolute,
} from '../shared/ui.js';

const SHARED = new URL('../shared/', import.meta.url);
const form = document.getElementById('search');
const input = document.getElementById('q');
const resultsBox = document.getElementById('results');

/* ---------------- Search ---------------- */

function resultNode(r) {
  const li = el('li');
  if (r.kind === 'concept') {
    li.append(el('span', { class: 'kind', text: t('concept.label.plain') }));
    li.append(
      el(
        'p',
        { class: 'txt ui' },
        el('a', { href: routes.concept(r.slug), text: t('chat.glossary_link', { term: r.term }) }),
      ),
    );
    return li;
  }
  if (r.kind === 'section' || r.kind === 'chapter') {
    const section = getSection(r.sectionId);
    const chapter = getChapter(section.chapterId);
    li.append(
      el('span', {
        class: 'kind',
        text:
          r.kind === 'chapter'
            ? `Chapitre ${chapter.number}`
            : `Chapitre ${chapter.number} · ${chapter.name}`,
      }),
    );
    li.append(
      el(
        'p',
        { class: 'txt ui' },
        el('a', {
          href: routes.section(section.id),
          text: r.kind === 'chapter' ? chapter.name : section.title,
        }),
      ),
    );
    return li;
  }
  const section = getSection(r.sectionId);
  const chapter = getChapter(section.chapterId);
  li.append(
    el('span', {
      class: 'kind',
      text: r.kind === 'key_measure' ? t('measure.key_label') : t('measure.label'),
    }),
  );
  li.append(el('p', { class: 'txt', lang: 'fr' }, markedText(r.text, r.match)));
  const where = el('p', { class: 'where' });
  where.append(
    `Chapitre ${chapter.number} · ${section.title} · `,
    el('a', { href: routes.section(section.id, r.id), text: t('link.read_section') }),
  );
  li.append(where);
  return li;
}

function renderResults(q) {
  const query = q.trim();
  if (query.length < 2) {
    resultsBox.replaceChildren();
    return;
  }
  const found = search(query, { limit: 10 });
  if (!found.length) {
    resultsBox.replaceChildren(el('p', { class: 'results-note', text: t('search.no_results') }));
    return;
  }
  resultsBox.replaceChildren(
    el('p', { class: 'results-note', text: t('search.results_count', { count: found.length }) }),
    el('ul', { class: 'results' }, found.map(resultNode)),
  );
}

let timer = null;
function onInput() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    const q = input.value;
    history.replaceState(
      null,
      '',
      q.trim() ? `#q=${encodeURIComponent(q.trim())}` : location.pathname + location.search,
    );
    renderResults(q);
  }, 80);
}

/* ---------------- Riposte entry ---------------- */

async function renderRiposte(date) {
  const box = document.getElementById('riposte-card');
  const riposte = await fetch(new URL('data/riposte.json', SHARED)).then((r) => r.json());
  // rip-11 is withdrawn pending rewrite (D5.11); the entry rotates by day, same for everyone.
  const pool = riposte.entries.filter(
    (e) => e.id !== 'rip-11' && e.measure_ids.some((id) => getCorpus().items.has(id)),
  );
  const dayIndex = Math.floor(date.getTime() / 86400000) % pool.length;
  const entry = pool[dayIndex];
  const card = el('div', { class: 'card' });
  card.append(el('span', { class: 'label', text: t('riposte.objection_label') }));
  card.append(el('p', { class: 'objection', text: entry.objection_fr }));
  card.append(el('span', { class: 'label', text: t('riposte.answer_label') }));
  const first = entry.measure_ids.find((id) => getCorpus().items.has(id));
  card.append(formatVerbatim(first, { variant: 'compact', label: false }));
  if (entry.desintox_url)
    card.append(
      el(
        'p',
        { class: 'small' },
        el('a', { href: entry.desintox_url, rel: 'noopener', text: t('riposte.desintox_link') }),
      ),
    );
  box.replaceChildren(
    card,
    button({
      label: t('home.direct.cta_riposte'),
      href: routes.riposte,
      primary: false,
      arrow: true,
    }),
  );
}

/* ---------------- Measure of the day ---------------- */

function renderDaily(date) {
  const box = document.getElementById('daily');
  const s = silence();
  if (s.active) {
    box.replaceChildren(el('p', { class: 'notice', text: t('silence.banner') }));
    return;
  }
  const { item, poolSize } = dailyMeasure(date);
  const yesterday = new Date(date.getTime() - 86400000);
  const nodes = [
    el('p', { class: 'label plain', text: t('daily.date', { date: formatDateFr(date) }) }),
    formatVerbatim(item, {}),
    shareButton({
      title: t('app.name'),
      text: `${t('daily.title')} : « ${item.text} »`,
      url: absolute(routes.link(item.id)),
      label: t('daily.share'),
      primary: false,
    }),
    el(
      'p',
      {},
      el('a', {
        class: 'textlink',
        href: `?date=${isoDay(yesterday)}#jour`,
        text: t('daily.previous'),
      }),
    ),
    el('details', { id: 'daily-method' }, [
      el('summary', { class: 'small', text: t('daily.method_link') }),
      el('p', { class: 'small', text: t('daily.method', { count: poolSize }) }),
    ]),
  ];
  box.replaceChildren(...nodes);
}

/* ---------------- Progression ---------------- */

function renderProgress() {
  const box = document.getElementById('progress');
  const corpus = getCorpus();
  const read = progress.chaptersRead();
  const total = corpus.chapters.size;
  const last = progress.last();
  if (!last || !getSection(last)) {
    box.replaceChildren(el('p', { text: t('progress.empty') }));
    return;
  }
  const section = getSection(last);
  const chapter = getChapter(section.chapterId);
  box.replaceChildren(
    el(
      'p',
      { class: 'progress' },
      el('span', {
        class: 'count',
        text:
          read.size === 1
            ? t('progress.chapter_read_one', { total })
            : t('progress.chapters_read', { read: read.size, total }),
      }),
    ),
    el(
      'p',
      {},
      el('a', {
        class: 'textlink',
        href: routes.section(section.id),
        text: t('home.direct.cta_continue'),
      }),
    ),
    el('p', {
      class: 'small',
      text: `Chapitre ${chapter.number} · ${chapter.name}, section ${section.chapterIndex + 1}`,
    }),
  );
}

/* ---------------- Chapters ---------------- */

function renderChapters() {
  const box = document.getElementById('chapters');
  const corpus = getCorpus();
  const nodes = [];
  for (const partId of partIds) {
    const part = getPart(partId);
    nodes.push(
      el('p', {
        class: 'part',
        dataset: { part: partId },
        text: `Partie ${part.order} · ${part.title}`,
      }),
    );
    nodes.push(
      el(
        'ul',
        { class: 'modules' },
        part.chapters.map((cid) => {
          const ch = corpus.chapters.get(cid);
          const opened = ch.sectionIds.filter((sid) => progress.has(sid)).length;
          const li = el('li');
          li.append(
            el('a', {
              href: routes.section(ch.sectionIds[0]),
              text: `Chapitre ${ch.number} · ${ch.name}`,
            }),
          );
          li.append(
            el('span', {
              class: 'small',
              text: opened
                ? ` · ${t('progress.sections_opened', { count: opened, total: ch.sectionIds.length })}`
                : ` · ${ch.sectionIds.length} sections`,
            }),
          );
          return li;
        }),
      ),
    );
  }
  box.replaceChildren(...nodes);
}

/* ---------------- Boot ---------------- */

try {
  await init();
  const date = effectiveDate();
  input.addEventListener('input', onInput);
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearTimeout(timer);
    renderResults(input.value);
    resultsBox.querySelector('a')?.focus();
  });
  const initial = hashParam('q');
  if (initial) {
    input.value = initial;
    renderResults(initial);
  }
  if (location.hash === '#q') input.focus();
  renderDaily(date);
  renderProgress();
  renderChapters();
  await renderRiposte(date);
} catch (err) {
  resultsBox.replaceChildren(el('p', { class: 'notice warn', text: t('error.generic') }));
  console.error(err);
}
