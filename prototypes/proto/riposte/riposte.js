/**
 * Mode riposte (T8, 10-riposte.md §5; corrections D5.11 / 07-mecaniques.md §7.4 applied in JS,
 * data/riposte.json left untouched).
 *
 * Screens (state in the URL only, nothing in localStorage):
 *   /riposte/                     market grid: one big button per theme -> the verbatim in one tap
 *   /riposte/?id=rip-NN           flashcard recto: « Ce qu'on entend souvent » + the objection
 *   /riposte/?id=rip-NN#texte     flashcard verso: verbatim measures (Gowun Batang, chapter › section,
 *                                 « Lire la section »), « Le chiffre » (77-808 line), « En clair
 *                                 (reformulé) », Désintox link, share, « ce qu'il vaut mieux ne pas dire »
 *   /riposte/?theme=<slug>        QR entry: the theme's riposte, verso
 *   /riposte/?flash=1[&id=…]      training: ten seconds per card (discreet bar), no score, « Passer »,
 *                                 « Objection suivante »; order deterministic by day (same for everyone)
 *   ?date=YYYY-MM-DD, ?silence=1  demo stubs of ui.js (D0.24: the timed flashcard and share freeze)
 *
 * Everything is fetched once at load (strings, corpus projection, riposte.json, stat cards); navigation
 * inside the module is client-side (pushState), so the mode works offline once loaded (§5.2).
 */
import {
  init,
  loadStatCards,
  statCard,
  getCorpus,
  getItem,
  getSection,
  locate,
  formatVerbatim,
  shareButton,
  silence,
  effectiveDate,
  isoDay,
  routes,
  t,
  frTypo,
  el,
  button,
  setTitle,
  qs,
  absolute,
} from '../shared/ui.js';

const SHARED = new URL('../shared/', import.meta.url);
const HERE = new URL('./', import.meta.url).pathname;
const content = document.getElementById('content');

/* ------------------------------------------------------------------ */
/* D5.11 mapping (the JSON stays as delivered by T8; the deltas live here) */
/* ------------------------------------------------------------------ */

/** Theme vocabulary (data/section-tags.json) -> neutral slug from a closed list + button word (§7.4). */
const THEMES = {
  'impôts / fiscalité': { slug: 'impots', label: 'Impôts' },
  retraites: { slug: 'retraites', label: 'Retraites' },
  'finance / banques / dette': { slug: 'dette', label: 'Dette' },
  salaires: { slug: 'salaires', label: 'Salaires' },
  'immigration / asile': { slug: 'immigration', label: 'Immigration' },
  'sécurité / police': { slug: 'police', label: 'Police' },
  'territoires / collectivités locales': { slug: 'campagnes', label: 'Campagnes' },
  'démocratie / institutions': { slug: 'institutions', label: 'Institutions' },
  'alimentation / agriculture': { slug: 'agriculture', label: 'Agriculture' },
  transports: { slug: 'transports', label: 'Transports' },
  laïcité: { slug: 'laicite', label: 'Laïcité' },
  Europe: { slug: 'europe', label: 'Europe' },
  énergie: { slug: 'energie', label: 'Énergie' },
  logement: { slug: 'logement', label: 'Logement' },
  'entreprise / industrie': { slug: 'industrie', label: 'Industrie' },
};

/** Objection shortened to <= 6 words for the market button (the full sentence stays inside the card). */
const SHORT = {
  'rip-01': 'Les impôts vont exploser',
  'rip-02': 'La retraite à 60 ans, infinançable',
  'rip-03': 'Ils vont ruiner le pays',
  'rip-04': 'Le SMIC tue les petites entreprises',
  'rip-05': "L'immigration sans limite",
  'rip-06': 'Anti-flics, laxistes sur la sécurité',
  'rip-07': 'Rien pour les campagnes',
  'rip-08': '6e République, président à vie',
  'rip-09': 'Contre les agriculteurs',
  'rip-10': "On ne pourra plus prendre l'avion",
  'rip-11': 'Laïcité',
  'rip-12': "Sortir de l'UE et de l'euro",
  'rip-13': 'Sans nucléaire, des coupures de courant',
  'rip-14': 'Encadrer les loyers, personne ne louera',
  'rip-15': "Tout nationaliser, c'est le communisme",
};

/**
 * Per-entry corrections of §7.4 / D5.11: rip-06 / rip-10 / rip-13 open on a measure that answers
 * (the one confirming the premise stays, never first); rip-08 and rip-12 lose their off-topic stat
 * card; rip-11 is withdrawn from the grid pending rewrite (reachable by id, flagged).
 */
const OVERRIDES = {
  'rip-06': { measure_ids: ['c7-s08-m06', 'c4-s03-m02', 'c7-s08-m07', 'c7-s08-k01'] },
  'rip-08': { stat_card_id: null },
  'rip-10': { measure_ids: ['c13-s02-m02', 'c13-s02-m06', 'c13-s02-m05', 'c13-s02-m10'] },
  'rip-11': { rewrite: true },
  'rip-12': { stat_card_id: null },
  'rip-13': { measure_ids: ['c13-s03-m02', 'c13-s03-k01', 'c13-s03-m03', 'c13-s03-m04'] },
};

let entries = []; // all 15, mapped
let visible = []; // the market grid (rewrite entries excluded)
const byId = new Map();
const byTheme = new Map();
let excludedStatCards = new Set();
let stat = null;

function mapEntry(raw) {
  const theme = THEMES[raw.theme] ?? { slug: raw.theme, label: raw.theme };
  const o = OVERRIDES[raw.id] ?? {};
  const measureIds = (o.measure_ids ?? raw.measure_ids).filter((id) => getItem(id));
  const first = locate(measureIds[0]);
  return {
    ...raw,
    ...o,
    measure_ids: measureIds,
    stat_card_id: 'stat_card_id' in o ? o.stat_card_id : raw.stat_card_id,
    rewrite: Boolean(o.rewrite),
    theme,
    short: SHORT[raw.id] ?? raw.objection_fr,
    partId: first?.part?.id ?? null,
  };
}

/* ------------------------------------------------------------------ */
/* URLs (keep the demo params ?date / ?silence across in-module links)  */
/* ------------------------------------------------------------------ */

function href({ id = null, flash = false, done = false } = {}, hash = '') {
  const p = new URLSearchParams();
  if (id) p.set('id', id);
  if (flash) p.set('flash', '1');
  if (done) p.set('done', '1');
  for (const k of ['date', 'silence']) {
    const v = qs(k);
    if (v) p.set(k, v);
  }
  const q = p.toString();
  return `${HERE}${q ? `?${q}` : ''}${hash}`;
}

const VERSO = '#texte';

/** « Lire la section » of a verbatim goes to the reader with a « resume » button back here. */
function sectionHref(itemId, backTo) {
  const { section, item } = locate(itemId);
  const back = `&back=${encodeURIComponent(backTo)}&backLabel=${encodeURIComponent(t('riposte.back_label'))}`;
  return `${routes.section(section.id)}${back}#${item.id}`;
}

/* ------------------------------------------------------------------ */
/* Deterministic daily order for the training mode (same for everyone) */
/* ------------------------------------------------------------------ */

function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = Math.imul(a ^ (a >>> 15), a | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates over the visible ids, seeded by FNV-1a(corpus version : UTC day : riposte). */
function flashOrder(date = effectiveDate()) {
  const rnd = mulberry32(fnv1a(`${getCorpus().meta.corpus_version}:${isoDay(date)}:riposte`));
  const ids = visible.map((e) => e.id);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

/* ------------------------------------------------------------------ */
/* Ten-second cue (discrete steps, no CSS transition; 10 steps under reduced motion) */
/* ------------------------------------------------------------------ */

let timer = null;
function stopTimer() {
  if (timer) clearInterval(timer);
  timer = null;
}

function startTimer(fill, message, seconds) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const total = seconds * 1000;
  const start = performance.now();
  const tick = () => {
    const p = Math.min(1, (performance.now() - start) / total);
    fill.style.transform = `scaleX(${p.toFixed(3)})`;
    if (p >= 1) {
      stopTimer();
      message.textContent = t('riposte.timer_done');
    }
  };
  timer = setInterval(tick, reduced ? 1000 : 100);
  tick();
}

/* ------------------------------------------------------------------ */
/* Pieces                                                               */
/* ------------------------------------------------------------------ */

const themeLine = (entry, tag = 'p') =>
  el(tag, {
    class: 'part',
    dataset: { part: entry.partId ?? 'part1' },
    text: entry.theme.label,
  });

const quoted = (text) => frTypo(text.startsWith('«') ? text : `« ${text} »`);

function rewriteNotice(entry) {
  return entry.rewrite
    ? el('p', { class: 'notice warn', text: t('riposte.rewrite_notice') })
    : null;
}

function backLink() {
  return el('p', {}, el('a', { class: 'textlink', href: href(), text: t('riposte.back_themes') }));
}

/* ---------------- Market grid ---------------- */

function renderGrid(notice = null) {
  const s = silence();
  const nodes = [
    notice,
    el('h1', { class: 'display' }, [
      el('span', { class: 'l', text: 'Mode' }),
      el('span', { class: 'l', text: 'riposte' }),
    ]),
    el('p', { class: 'lead', text: t('riposte.market_lead') }),
    el(
      'ul',
      { class: 'market', 'aria-label': t('riposte.themes') },
      visible.map((entry) =>
        el(
          'li',
          {},
          el('a', { class: 'tile', href: href({ id: entry.id }, VERSO) }, [
            themeLine(entry, 'span'),
            el('span', { class: 'obj', lang: 'fr', text: quoted(entry.short) }),
          ]),
        ),
      ),
    ),
  ];
  if (s.active) nodes.push(el('p', { class: 'notice', text: t('silence.banner') }));
  else
    nodes.push(
      button({
        label: t('riposte.train'),
        href: href({ flash: true }),
        primary: false,
        arrow: true,
      }),
      el('p', { class: 'hint', text: t('riposte.train_hint') }),
    );
  setTitle(t('riposte.title'));
  return nodes;
}

/* ---------------- Flashcard: recto ---------------- */

function renderRecto(entry, { flash, nextHref }) {
  const card = el('div', { class: 'recto' });
  card.append(themeLine(entry));
  card.append(el('span', { class: 'label', text: t('riposte.heard_label') }));
  card.append(el('p', { class: 'objection', lang: 'fr', text: quoted(entry.objection_fr) }));
  let fill = null;
  let message = null;
  if (flash) {
    fill = el('span', { class: 'fill' });
    card.append(el('div', { class: 'flashbar', 'aria-hidden': 'true' }, fill));
    message = el('p', { class: 'flashmsg small', 'aria-live': 'polite' });
    card.append(message);
  }
  card.append(
    button({
      label: t('riposte.flip'),
      href: href({ id: entry.id, flash }, VERSO),
      attrs: { 'data-action': 'flip', 'data-motion': 'press' },
    }),
  );
  if (flash)
    card.append(
      button({
        label: t('common.skip'),
        href: nextHref,
        primary: false,
        center: true,
        attrs: { 'data-motion': 'press' },
      }),
    );
  const nodes = [rewriteNotice(entry), card, backLink()];
  if (flash) startTimer(fill, message, entry.flashcard_seconds || 10);
  return nodes;
}

/* ---------------- Flashcard: verso (verbatim-first, §5.3) ---------------- */

function renderVerso(entry, { flash, nextHref }) {
  const self = href({ id: entry.id, flash }, VERSO);
  const wrap = el('div', { class: 'verso' });
  wrap.append(themeLine(entry));
  const heard = el('p', { class: 'heard', lang: 'fr' });
  heard.append(
    `${t('riposte.heard_label')}\u00a0: `,
    el('q', { text: frTypo(entry.objection_fr).replace(/^«\s*|\s*»$/g, '') }),
  );
  wrap.append(heard);

  // 1. Texte du programme: the measures in the (corrected) order, each with its section in one tap.
  wrap.append(el('span', { class: 'label', text: t('riposte.answer_label') }));
  entry.measure_ids.forEach((id, i) => {
    const block = formatVerbatim(id, { variant: i === 0 ? '' : 'compact', kind: true });
    const read = block.querySelector('a.read');
    if (read) read.setAttribute('href', sectionHref(id, self));
    wrap.append(block);
  });

  // 2. Le chiffre: only with the 77-808 line, never c13-s03-a02, never for rip-08 / rip-12 (D5.11).
  const card =
    entry.stat_card_id && !excludedStatCards.has(entry.stat_card_id)
      ? stat.byId.get(entry.stat_card_id)
      : null;
  if (card)
    wrap.append(
      statCard(card, {
        sidecar: stat.sidecar[card.id] ?? null,
        sectionUrl: getSection(card.section_id)?.url ?? null,
        label: t('riposte.figure_label'),
      }),
    );

  // 3. En clair (reformulé): the liant, in the app's voice, never inside the verbatim zone.
  wrap.append(
    el('div', { class: 'liant' }, [
      el('span', { class: 'label', text: t('riposte.liant_label') }),
      el('p', { lang: 'fr', text: frTypo(entry.liant_fr) }),
    ]),
  );

  // 4. Désintox: title + URL only, never the text (D1.5); greyed note when offline.
  if (entry.desintox_url) {
    const panel = el('div', { class: 'source desintox' }, [
      el('span', { class: 'label', text: t('riposte.desintox_label') }),
      el('p', { class: 'small', text: t('riposte.desintox_lead') }),
      el('a', { href: entry.desintox_url, rel: 'noopener', text: frTypo(entry.desintox_title) }),
      el('p', { class: 'url', text: entry.desintox_url }),
      el('p', { class: 'offline-note', text: t('riposte.desintox_offline') }),
    ]);
    if (entry.desintox_fit === 'partial' && entry.desintox_note_fr)
      panel.append(el('p', { class: 'note', text: frTypo(entry.desintox_note_fr) }));
    wrap.append(panel);
  }

  // 5. Share: the card text is one verbatim + attribution, never the liant nor the objection (§5.4).
  const printed = getItem(entry.share_card_fr.verbatim_id) ?? getItem(entry.measure_ids[0]);
  const share = shareButton({
    title: frTypo(entry.share_card_fr.title_fr),
    text: `${t('share.measure_text')} « ${printed.text} » — ${t('riposte.attribution')}`,
    url: absolute(href({ id: entry.id }, VERSO)),
    label: t('riposte.share'),
    primary: !flash,
  });

  // 6. What not to say: folded, never on the card.
  const reversal = el('details', { class: 'reversal' }, [
    el('summary', { text: t('riposte.reversal_label') }),
    el('p', { lang: 'fr', text: frTypo(entry.reversal_note_fr) }),
  ]);

  const next = button({ label: t('riposte.next'), href: nextHref, primary: flash, arrow: true });
  if (flash) wrap.append(next, share, reversal);
  else wrap.append(share, reversal, next);
  wrap.append(backLink());
  return [rewriteNotice(entry), wrap];
}

function renderCard(entry, { flash = false, verso = false, order = null } = {}) {
  const list = order ?? visible.map((e) => e.id);
  const at = list.indexOf(entry.id);
  const nextId = list[at + 1] ?? null;
  const nextHref = flash
    ? nextId
      ? href({ id: nextId, flash: true })
      : href({ flash: true, done: true })
    : href({ id: nextId ?? list[0] }, VERSO);
  const nodes = [];
  if (flash)
    nodes.push(
      el('p', {
        class: 'kicker',
        text: `${t('riposte.train_kicker')} · ${t('riposte.position', { n: at + 1, total: list.length })}`,
      }),
    );
  nodes.push(
    ...(verso ? renderVerso(entry, { flash, nextHref }) : renderRecto(entry, { flash, nextHref })),
  );
  setTitle(`${entry.theme.label} · ${t('riposte.title')}`);
  return nodes;
}

/* ---------------- Training end, unknown id ---------------- */

function renderDone() {
  setTitle(t('riposte.done_title'));
  return [
    el('p', { class: 'kicker', text: t('riposte.train_kicker') }),
    el('h1', { class: 'title', text: t('riposte.done_title') }),
    el('p', { class: 'lead', text: t('riposte.done_lead') }),
    button({
      label: t('riposte.restart'),
      href: href({ flash: true }),
      primary: false,
      arrow: true,
    }),
    backLink(),
  ];
}

function renderUnknown() {
  setTitle(t('riposte.unknown'));
  return [
    el('h1', { class: 'title', text: t('riposte.unknown') }),
    el('p', { class: 'lead', text: t('riposte.unknown_lead') }),
    button({ label: t('riposte.back_themes'), href: href(), arrow: true }),
  ];
}

/* ------------------------------------------------------------------ */
/* Router (URL = the whole state)                                       */
/* ------------------------------------------------------------------ */

function render({ focus = false } = {}) {
  stopTimer();
  const id = qs('id');
  const flash = qs('flash') === '1';
  const theme = qs('theme');
  const verso = location.hash === VERSO;
  let nodes;
  if (theme) {
    const entry = byTheme.get(theme);
    if (entry) {
      history.replaceState(null, '', href({ id: entry.id }, VERSO));
      render({ focus });
      return;
    }
    nodes = renderUnknown();
  } else if (flash) {
    if (silence().active)
      nodes = renderGrid(el('p', { class: 'notice', text: t('silence.banner') }));
    else if (qs('done') === '1') nodes = renderDone();
    else {
      const order = flashOrder();
      const current = id && order.includes(id) ? id : order[0];
      nodes = renderCard(byId.get(current), { flash: true, verso, order });
    }
  } else if (id) {
    const entry = byId.get(id);
    nodes = entry ? renderCard(entry, { verso }) : renderUnknown();
  } else nodes = renderGrid();
  content.replaceChildren(...nodes.filter(Boolean));
  if (focus) {
    scrollTo(0, 0);
    content.focus({ preventScroll: true });
  }
}

function navigate(url) {
  history.pushState(null, '', url);
  render({ focus: true });
}

/** In-module links render client-side (no request after the first load); other modules and external links navigate. */
document.addEventListener('click', (e) => {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
    return;
  const a = e.target.closest('a[href]');
  if (!a || a.target === '_blank') return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || url.pathname !== location.pathname) return;
  if (url.hash === '#main') return; // skip link
  e.preventDefault();
  navigate(url.pathname + url.search + url.hash);
});
addEventListener('popstate', () => render({ focus: true }));

const setOffline = () =>
  document.documentElement.classList.toggle('offline', navigator.onLine === false);
addEventListener('online', setOffline);
addEventListener('offline', setOffline);

/* ------------------------------------------------------------------ */
/* Boot: one load of everything, then no network                        */
/* ------------------------------------------------------------------ */

try {
  const [, riposte, cards] = await Promise.all([
    init(),
    fetch(new URL('data/riposte.json', SHARED)).then((r) => {
      if (!r.ok) throw new Error(`riposte.json: HTTP ${r.status}`);
      return r.json();
    }),
    loadStatCards(),
  ]);
  stat = cards;
  excludedStatCards = new Set(riposte.meta.excluded_stat_card_ids ?? []);
  entries = riposte.entries.map(mapEntry).filter((e) => e.measure_ids.length);
  visible = entries.filter((e) => !e.rewrite);
  for (const e of entries) byId.set(e.id, e);
  for (const e of visible) byTheme.set(e.theme.slug, e);
  setOffline();
  render();
} catch (err) {
  content.replaceChildren(el('p', { class: 'notice warn', text: t('error.generic') }));
  console.error(err);
}
