/**
 * SectionVerbatim: the reader of one section (?id=<section id>), real content by id.
 * Chapeau, key measure, numbered measures (sub-measures nested), « À savoir » cards under the
 * loi 77-808 template, source panel, flat progression gauge (the section is marked read in
 * localStorage when the end of the measures is reached), next / previous in book order.
 * Optional ?back=<path>&backLabel=<text> renders a « resume » button for the game modules.
 */
import {
  init,
  qs,
  getSection,
  getChapter,
  getPart,
  getCorpus,
  formatVerbatim,
  formatChapeau,
  loadStatCards,
  statCard,
  shareButton,
  share,
  silence,
  progress,
  routes,
  t,
  el,
  button,
  setTitle,
  marcheuse,
  revealHash,
  absolute,
} from '../shared/ui.js';

const content = document.getElementById('content');

/** Split a title into display lines (~16 characters), never truncating (correction 6). */
function splitLines(text, max = 16) {
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

function displayTitle(text, tag = 'h1') {
  return el(
    tag,
    { class: 'display' },
    splitLines(text).map((l) => el('span', { class: 'l', text: l })),
  );
}

function safeBack() {
  const back = qs('back');
  // The hash may carry several params (/defi/: #r=…&p=…).
  if (!back || !/^\/[A-Za-z0-9\-_/]*(\?[A-Za-z0-9=&%\-_.]*)?(#[A-Za-z0-9=&\-_]*)?$/.test(back))
    return null;
  return { href: back, label: qs('backLabel') || t('common.back') };
}

function renderUnknown() {
  content.replaceChildren(
    el('h1', { class: 'title', text: t('section.unknown') }),
    el('p', { class: 'lead', text: t('section.unknown_lead') }),
    button({ label: t('home.direct.cta_search'), href: routes.search(''), arrow: true }),
  );
  setTitle(t('section.unknown'));
}

function measureShareText(item) {
  return `${t('share.measure_text')} « ${item.text} »`;
}

function measureActions(item, sectionId) {
  if (silence().active) return null;
  const row = el('div', { class: 'actions' });
  row.append(
    el('button', {
      type: 'button',
      text: t('section.share_this'),
      'aria-label': `${t('measure.share')} (${item.id})`,
      onclick: () =>
        share({
          title: t('app.name'),
          text: measureShareText(item),
          url: absolute(routes.link(item.id)),
        }),
    }),
  );
  return row;
}

function progressBlock(section, chapter) {
  const total = chapter.sectionIds.length;
  const block = el('div', { class: 'progress', 'aria-label': t('progress.title') });
  block.append(
    el('span', {
      class: 'count',
      text: t('progress.section_position', {
        n: section.chapterIndex + 1,
        total,
        chapter: chapter.number,
      }),
    }),
  );
  const track = el('div', { class: 'track', role: 'img' });
  const fill = el('span', { class: 'fill' });
  const walker = el('span', { class: 'walker' }, marcheuse());
  track.append(fill, walker);
  block.append(track);
  const done = el('p', { class: 'done', 'aria-live': 'polite' });
  block.append(done);
  const update = (justMarked = false) => {
    const read = chapter.sectionIds.filter((id) => progress.has(id)).length;
    const pct = Math.round((read / total) * 100);
    track.style.setProperty('--w', `${pct}%`);
    track.setAttribute('aria-label', t('progress.sections_opened', { count: read, total }));
    if (progress.has(section.id)) done.textContent = t('progress.section_done');
    if (justMarked) walker.replaceChildren(marcheuse({ walk: true }));
  };
  update();
  return { block, update };
}

async function render(section) {
  const corpus = getCorpus();
  const chapter = getChapter(section.chapterId);
  const part = getPart(chapter.partId);
  const stat = await loadStatCards();
  const back = safeBack();
  setTitle(section.title);

  const nodes = [];
  if (back)
    nodes.push(el('p', {}, el('a', { class: 'textlink', href: back.href, text: back.label })));
  nodes.push(
    el('p', {
      class: 'part',
      dataset: { part: part.id },
      text: `Partie ${part.order} · ${part.title}`,
    }),
  );
  nodes.push(el('span', { class: 'label', text: `Chapitre ${chapter.number} · ${chapter.name}` }));
  nodes.push(displayTitle(section.title));
  nodes.push(
    el(
      'p',
      { class: 'small' },
      el('a', { href: section.url, rel: 'noopener', text: t('common.open_official') }),
    ),
  );
  nodes.push(el('hr'));

  // Texte du programme: chapeau(x), key measure.
  nodes.push(el('span', { class: 'label', text: t('concept.label.verbatim') }));
  const paragraphs = section.items.filter((i) => i.kind === 'paragraph');
  const key = section.items.find((i) => i.kind === 'key_measure');
  const measures = section.items.filter((i) => i.kind === 'measure');
  for (const p of paragraphs) nodes.push(formatChapeau(p));
  if (key) {
    nodes.push(el('hr', { class: 'soft' }));
    nodes.push(formatVerbatim(key, { variant: 'key', kind: true, readLink: false, anchor: true }));
    nodes.push(
      shareButton({
        title: t('app.name'),
        text: measureShareText(key),
        url: absolute(routes.link(key.id)),
        label: t('measure.share'),
      }),
    );
  }

  // Measures.
  if (measures.length) {
    nodes.push(
      el('h2', {
        class: 'h',
        text:
          measures.length === 1
            ? t('section.measure_count_one')
            : t('section.measures_count', { count: measures.length }),
      }),
    );
    const list = el('ol', { class: 'measures' });
    for (const m of measures) {
      const li = el('li', { id: m.id, dataset: { id: m.id } });
      li.append(el('p', { text: m.text, lang: 'fr' }));
      if (m.subMeasures?.length)
        li.append(
          el(
            'ol',
            {},
            m.subMeasures.map((sm) => el('li', { id: sm.id, text: sm.text, lang: 'fr' })),
          ),
        );
      const actions = measureActions(m, section.id);
      if (actions) li.append(actions);
      list.append(li);
    }
    nodes.push(list);
  }
  const end = el('div', { id: 'end', class: 'sentinel', 'aria-hidden': 'true' }); // 1 px tall: a zero-area target never intersects in Chromium
  nodes.push(end);

  // « À savoir » (only inside the SectionVerbatim, never on an image).
  for (const chiffre of section.chiffres) {
    const card = stat.byId.get(chiffre.id);
    if (card)
      nodes.push(
        statCard(card, { sidecar: stat.sidecar[card.id] ?? null, sectionUrl: section.url }),
      );
  }

  // Source panel.
  nodes.push(
    el('div', { class: 'source' }, [
      el('span', { class: 'label', text: 'Vérifier à la source' }),
      el('a', { href: section.url, rel: 'noopener', text: t('common.open_official') }),
      el('p', { class: 'url', text: section.url }),
    ]),
  );

  // Progression (flat gauge, Marcheuse on the gauge only, D3.11) and navigation.
  const { block, update } = progressBlock(section, chapter);
  nodes.push(block);
  const nextId = corpus.order[section.index + 1] ?? null;
  const prevId = corpus.order[section.index - 1] ?? null;
  if (nextId) {
    const next = getSection(nextId);
    const nextChapter = getChapter(next.chapterId);
    const sameChapter = next.chapterId === section.chapterId;
    block.append(
      el('p', {
        class: 'next',
        text: sameChapter
          ? `Section ${next.chapterIndex + 1} · ${next.title}`
          : `Chapitre ${nextChapter.number} · ${next.title}`,
      }),
    );
    nodes.push(
      button({
        label: t('common.next'),
        href: routes.section(next.id),
        primary: false,
        arrow: true,
      }),
    );
  }
  if (prevId)
    nodes.push(
      el(
        'p',
        {},
        el('a', { class: 'textlink', href: routes.section(prevId), text: t('section.previous') }),
      ),
    );
  if (back) nodes.push(button({ label: back.label, href: back.href, arrow: true, primary: false }));

  content.replaceChildren(...nodes);
  revealHash();

  // Reaching the end of the measures marks the section as read (no timestamp, no identifier).
  // IntersectionObserver covers continuous scrolling; a jump past the sentinel (hash link, scroll to
  // the end) never notifies, so a passive scroll check (one rAF per burst) completes it.
  let marked = false;
  const mark = () => {
    if (marked) return;
    marked = true;
    io?.disconnect();
    removeEventListener('scroll', onScroll);
    update(progress.mark(section.id));
  };
  const passed = () => end.getBoundingClientRect().top < innerHeight;
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (passed()) mark();
    });
  };
  const io =
    'IntersectionObserver' in window
      ? new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && mark())
      : null;
  io?.observe(end);
  addEventListener('scroll', onScroll, { passive: true });
  if (passed()) mark();
}

try {
  await init();
  const section = getSection(qs('id') ?? '');
  if (section) await render(section);
  else renderUnknown();
} catch (err) {
  content.replaceChildren(el('p', { class: 'notice warn', text: t('error.generic') }));
  console.error(err);
}
