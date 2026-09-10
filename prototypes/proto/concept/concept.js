/**
 * Carte-concept, anatomy « dense corrigée » (D3.10, D2.4): En clair first without a tap, the
 * verbatim in Gowun Batang, Pourquoi ça compte, the objection in quotes after « On te dit : »,
 * « À savoir » folded after the objection, related measures, existing neighbour terms only,
 * the explorable folded at the bottom with a range input and moins / autant / plus buttons.
 * State: ?slug=<glossary slug> (default regle-verte). Nothing stored.
 */
import {
  init,
  qs,
  getCorpus,
  getItem,
  locate,
  formatVerbatim,
  loadStatCards,
  statCard,
  shareButton,
  routes,
  t,
  el,
  button,
  setTitle,
  frTypo,
  absolute,
} from '../shared/ui.js';

const content = document.getElementById('content');
const SHARED = new URL('../shared/', import.meta.url);

/** Explorables exist for a few concepts only (D3.10: 2-3 concepts). Copy of the principle, no numbers. */
const EXPLORABLES = {
  'regle-verte': { limit: 66, initial: 40, plainSentenceIndex: 1 },
};

let glossary = null;

function refLabel(id) {
  const loc = locate(id);
  if (!loc) return null;
  if (loc.intro) return { text: 'intro', href: loc.intro.url, title: loc.intro.title };
  return {
    text: `${loc.chapter.number}.${loc.section.chapterIndex + 1}`,
    href: routes.section(loc.section.id, id),
    title: `Chapitre ${loc.chapter.number}, section ${loc.section.chapterIndex + 1}`,
  };
}

/**
 * Renders a field sentence by sentence from sentence_support (which reproduces the field
 * character for character). One discreet call per source, not per sentence (correction 12);
 * the « contexte-2022 » sentence gets the « Contexte 2022 » badge instead.
 */
function fieldWithRefs(entry, field, tag = 'p', cls = '') {
  const node = el(tag, { class: cls });
  const parts = entry.sentence_support.filter((s) => s.field === field);
  if (!parts.length) {
    node.textContent = frTypo(field.split('.').reduce((o, k) => o?.[k], entry) ?? '');
    return node;
  }
  // One discreet call per source run (a source = a section, labelled 12.1, 14.2, intro), placed
  // right after the last sentence of the run, before the space.
  const first = (s) => s.support_ids.find((id) => !id.startsWith('http')) ?? null;
  const labelOf = (id) => (id ? (refLabel(id)?.text ?? null) : null);
  let runRef = null;
  parts.forEach((s, i) => {
    const next = parts[i + 1] ?? null;
    if (s.kind === 'contexte-2022') {
      node.append(frTypo(s.sentence));
      const url = s.support_ids.find((id) => id.startsWith('http'));
      node.append(
        el('a', {
          class: 'badge ctx',
          href: url,
          rel: 'noopener',
          text: t('concept.label.context_2022'),
        }),
      );
      runRef = null;
    } else {
      const id = first(s);
      runRef ??= id;
      node.append(frTypo(s.sentence));
      const nextLabel = next && next.kind !== 'contexte-2022' ? labelOf(first(next)) : null;
      if (runRef && labelOf(runRef) !== nextLabel) {
        const ref = refLabel(runRef);
        if (ref)
          node.append(
            el('a', {
              class: 'ref',
              href: ref.href,
              title: `Appui : ${ref.title}`,
              'aria-label': `Appui : ${ref.title}`,
              text: ref.text,
            }),
          );
        runRef = null;
      }
    }
    if (next) node.append(' ');
  });
  return node;
}

function explorable(entry, config) {
  const box = el('details', { class: 'explo' });
  box.append(el('summary', { text: t('concept.explorable_title') }));
  box.append(el('p', { class: 'small', text: t('concept.explorable_hint') }));
  box.append(el('span', { class: 'label', text: t('concept.label.plain') }));
  const plain =
    entry.sentence_support.filter((s) => s.field === 'one_liner')[config.plainSentenceIndex]
      ?.sentence ?? entry.one_liner;
  box.append(el('p', { text: frTypo(plain) }));

  const bars = el('div', { class: 'bars', role: 'img' });
  bars.append(el('span', { class: 'limit-lbl', text: t('concept.explorable_limit') }));
  const natureTrack = el('div', { class: 'track' });
  const natureBar = el('div', { class: 'bar nature' });
  natureTrack.append(natureBar, el('div', { class: 'limit' }));
  bars.append(
    el('div', { class: 'brow' }, [
      el('span', { class: 'lbl', text: t('concept.explorable_nature') }),
      natureTrack,
    ]),
  );
  const takeTrack = el('div', { class: 'track' });
  const takeBar = el('div', { class: 'bar take' });
  const overBar = el('div', { class: 'bar over' });
  takeTrack.append(takeBar, overBar, el('div', { class: 'limit' }));
  bars.append(
    el('div', { class: 'brow' }, [
      el('span', { class: 'lbl', text: t('concept.explorable_take') }),
      takeTrack,
    ]),
  );
  box.append(bars);

  const rangeId = 'explo-range';
  box.append(
    el('label', { class: 'sr-only', for: rangeId, text: t('concept.explorable_slider_label') }),
  );
  const range = el('input', {
    type: 'range',
    id: rangeId,
    min: '0',
    max: '100',
    step: '1',
    value: String(config.initial),
  });
  box.append(range);
  const verdict = el('p', { class: 'verdict', 'aria-live': 'polite' });
  const status = el('span', { class: 'status' });
  const lead = document.createTextNode('');
  verdict.append(status, ' ', lead);

  const limit = config.limit;
  for (const node of [bars, natureTrack, takeTrack]) node.style.setProperty('--limit', `${limit}%`);
  natureBar.style.width = `${limit}%`;
  const apply = (v) => {
    const value = Math.max(0, Math.min(100, Number(v)));
    takeBar.style.width = `${Math.min(value, limit)}%`;
    overBar.style.width = `${Math.max(0, value - limit)}%`;
    let key = 'under';
    if (value > limit + 2) key = 'over';
    else if (value >= limit - 2) key = 'at';
    status.textContent = t(`concept.explorable_${key}`);
    lead.textContent = t(`concept.explorable_${key}_lead`);
    bars.setAttribute(
      'aria-label',
      `${t('concept.explorable_nature')} ; ${t('concept.explorable_take')}. ${status.textContent} ${lead.textContent}`,
    );
    if (String(range.value) !== String(value)) range.value = String(value);
  };
  range.addEventListener('input', () => apply(range.value));
  const controls = el('div', { class: 'btn-row' });
  for (const [k, v] of [
    ['less', Math.round(limit * 0.6)],
    ['same', limit],
    ['more', Math.min(100, limit + 24)],
  ]) {
    controls.append(
      button({ label: t(`concept.explorable_${k}`), primary: false, onClick: () => apply(v) }),
    );
  }
  box.append(controls, verdict);
  apply(config.initial);
  return box;
}

function renderUnknown() {
  content.replaceChildren(
    el('h1', { class: 'title', text: t('concept.unknown') }),
    button({ label: t('home.direct.cta_search'), href: routes.search(''), arrow: true }),
  );
  setTitle(t('concept.unknown'));
}

async function render(entry) {
  const corpus = getCorpus();
  const stat = await loadStatCards();
  setTitle(entry.term);
  const verbatimIds = entry.verbatim_ids.filter((id) => getItem(id));
  const heroItem =
    verbatimIds.map(getItem).find((i) => !i.intro) ?? verbatimIds.map(getItem)[0] ?? null;
  const heroLoc = heroItem ? locate(heroItem) : null;
  const nodes = [];

  if (heroLoc?.part)
    nodes.push(
      el('p', {
        class: 'part',
        dataset: { part: heroLoc.part.id },
        text: `Partie ${heroLoc.part.order} · ${heroLoc.part.title}`,
      }),
    );
  const words = entry.term.split(' ');
  nodes.push(
    el(
      'h1',
      { class: 'display' },
      (words.length > 3 ? [entry.term] : words).map((w) => el('span', { class: 'l', text: w })),
    ),
  );
  const reviewed = entry.review_status === 'reviewed-human';
  nodes.push(
    el(
      'p',
      {},
      el('span', {
        class: 'badge',
        text: reviewed
          ? t('concept.authorship.reviewed', { reviewer: 'un humain' })
          : t('concept.authorship.pending'),
      }),
    ),
  );

  nodes.push(el('h2', { class: 'h', text: t('concept.label.plain') }));
  nodes.push(fieldWithRefs(entry, 'one_liner', 'p', 'lead'));

  if (heroItem) {
    // Motion hooks (shared/motion.js): the verbatim rises into place once; « Lire la section » cross-fades.
    const hero = formatVerbatim(heroItem, { variant: 'hero' });
    hero.dataset.motion = 'reveal';
    hero.querySelector('.read')?.setAttribute('data-motion', 'crossfade');
    nodes.push(hero);
    if (heroLoc.section)
      nodes.push(
        el('p', {
          class: 'small',
          text: t('concept.source', {
            chapter: heroLoc.chapter.title,
            section: heroLoc.section.title,
          }),
        }),
      );
  }

  nodes.push(el('h2', { class: 'h', text: t('concept.label.why') }));
  nodes.push(fieldWithRefs(entry, 'why_it_matters'));

  if (entry.objection?.text) {
    nodes.push(el('h2', { class: 'h', text: t('concept.label.objection') }));
    const card = el('div', { class: 'card' });
    card.append(el('span', { class: 'label', text: t('riposte.objection_label') }));
    card.append(el('p', { class: 'objection', text: frTypo(`« ${entry.objection.text} »`) }));
    card.append(fieldWithRefs(entry, 'objection.answer'));
    if (entry.objection.desintox_url)
      card.append(
        el(
          'p',
          { class: 'small' },
          el('a', {
            href: entry.objection.desintox_url,
            rel: 'noopener',
            text: t('refusal.desintox_link'),
          }),
        ),
      );
    nodes.push(card);
  }

  // « À savoir »: after the objection, folded by default (correction 11).
  const cardSection = heroLoc?.section ?? null;
  const cards = cardSection ? (stat.bySection.get(cardSection.id) ?? []) : [];
  if (cards[0])
    nodes.push(
      statCard(cards[0], {
        sidecar: stat.sidecar[cards[0].id] ?? null,
        collapsed: true,
        sectionUrl: cardSection.url,
      }),
    );

  const related = entry.related_measure_ids.filter((id) => getItem(id));
  if (related.length) {
    nodes.push(el('h2', { class: 'h', text: t('concept.label.related_measures') }));
    for (const id of related) {
      const block = formatVerbatim(id, { variant: 'compact', label: false });
      block.dataset.motion = 'reveal'; // rises into place when scrolled to (shared/motion.js)
      nodes.push(block);
    }
  }

  const neighbours = entry.related_terms.filter(
    (slug) => glossary.entries.some((e) => e.slug === slug) && slug !== entry.slug,
  );
  if (neighbours.length) {
    nodes.push(el('h2', { class: 'h', text: t('concept.label.related_terms') }));
    nodes.push(
      el(
        'div',
        { class: 'chips' },
        neighbours.map((slug) =>
          el('a', {
            href: routes.concept(slug),
            text: glossary.entries.find((e) => e.slug === slug).term,
          }),
        ),
      ),
    );
  }

  if (EXPLORABLES[entry.slug]) nodes.push(explorable(entry, EXPLORABLES[entry.slug]));

  nodes.push(el('hr'));
  nodes.push(
    shareButton({
      title: t('app.name'),
      text: t('share.concept_text', { term: entry.term }),
      url: absolute(routes.concept(entry.slug)),
      label: t('concept.share'),
    }),
  );
  if (heroLoc?.section)
    nodes.push(
      button({
        label: t('concept.read_section'),
        href: routes.section(heroLoc.section.id, heroItem.id),
        primary: false,
        arrow: true,
        attrs: { 'data-motion': 'crossfade' },
      }),
    );
  nodes.push(
    el('p', {
      class: 'small',
      text: `${t('about.corpus_version', { date: '7 septembre 2026' })} Version ${corpus.meta.corpus_version}.`,
    }),
  );

  content.replaceChildren(...nodes);
}

try {
  await init();
  glossary = await fetch(new URL('data/glossary.json', SHARED)).then((r) => r.json());
  const slug = qs('slug') ?? 'regle-verte';
  const entry = glossary.entries.find((e) => e.slug === slug || e.aliases.includes(slug));
  if (entry) await render(entry);
  else renderUnknown();
} catch (err) {
  content.replaceChildren(el('p', { class: 'notice warn', text: t('error.generic') }));
  console.error(err);
}
