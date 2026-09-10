/**
 * F1 « Tu savais que c'était dedans ? » — 07-mecaniques.md §9.1 (D5.7, D5.8, D5.9).
 *
 * Route: /defi/?n=<day index> (index of defis.json; unknown or absent = the day's draw).
 * State, in the URL only (nothing in localStorage for this prototype, §9.1):
 *   #r=<5 chars in {s,d,p}>  the SENDER's answers, present only on the « Comparer nos découvertes »
 *                            link; anything but exactly 5 chars of {s,d,p} is ignored;
 *   #p=<0..5 chars in {s,d,p}> the PLAYER's own answers so far (resume after « Lire la section »,
 *                            reload of the result); never put in a share link.
 * « Et toi ? » always regenerates the bare link (/defi/?n=…), even when this page was opened
 * with #r= (§7.6, Juriste CNIL). No timer, no score, no count of « je savais », no « N/5 » (§7.11 rule 4).
 * Gesture: two equal buttons « Je savais » / « Je découvre » + « Passer »; no swipe (D5.9).
 */
import {
  init,
  qs,
  hashParam,
  getItem,
  getCorpus,
  locate,
  routes,
  absolute,
  t,
  frTypo,
  el,
  button,
  setTitle,
  shareButton,
  silence,
  effectiveDate,
  formatDateFr,
} from '../shared/ui.js';
import { drawCard, cardBlob } from './card.js';

const app = document.getElementById('app');
const HERE = new URL('./', import.meta.url).pathname; // « /defi/ »

/* ------------------------------------------------------------------ */
/* Strings (play.*, proposed for design/strings.json v0.2; D3.12: the   */
/* arrival lines are impersonal, the tu appears once the player is in)   */
/* ------------------------------------------------------------------ */

const STRINGS = Object.freeze({
  'play.title': 'Tu savais que c’était dedans ?',
  'play.kicker': 'Tirage du {date}',
  'play.knew': 'Je savais',
  'play.discover': 'Je découvre',
  'play.skip': 'Passer',
  'play.position': '{n} / {total}',
  'play.meta': '{count} mesures · 1 min · rien à saisir',
  'play.link.context':
    'Quelqu’un partage {count} mesures de L’Avenir en commun 2025, le programme.',
  'play.link.context_played':
    'Quelqu’un a joué ce défi. Ses découvertes s’affichent après les {count} réponses, jamais avant.',
  'play.resume': 'Reprendre le tirage ({n}/{total})',
  'play.back_to_result': 'Retour au résultat',
  'play.result.title_many': '{count} mesures qui m’ont surpris·e',
  'play.result.title_one': '1 mesure qui m’a surpris·e',
  'play.result.none': 'Tu connaissais les {count}.',
  'play.result.none_lead': 'En voici {count} autres ?',
  'play.result.none_lead_end': 'Le programme, lui, en compte bien d’autres.',
  'play.result.mosaic': 'Les chapitres de tes découvertes',
  'play.result.mosaic_none': 'Les chapitres du tirage',
  'play.result.mosaic_alt': 'Chapitres {list} sur les dix-huit du livre',
  'play.result.mosaic_alt_none': 'Aucun chapitre allumé sur les dix-huit du livre',
  'play.result.common_many': 'Vous avez découvert {count} mesures en commun',
  'play.result.common_one': 'Vous avez découvert 1 mesure en commun',
  'play.result.common_none': 'Aucune mesure découverte en commun.',
  'play.result.common_hint': 'Les réponses de l’autre personne étaient dans le lien reçu.',
  'play.result.share_title': 'Et toi ?',
  'play.result.share_lead': 'Ce lien envoie le tirage du {date}, sans tes réponses.',
  'play.result.see_card': 'Voir la carte',
  'play.result.compare': 'Comparer nos découvertes',
  'play.result.compare_lead': 'Ce lien contient tes {count} réponses.',
  'play.result.compare_button': 'Envoyer avec mes réponses',
  'play.result.again': 'Encore ?',
  'play.result.read_programme': 'Lire le programme',
  'play.result.draw_title': 'Le tirage du {date}',
  'play.card.title': 'Envoyer la carte',
  'play.card.kicker': 'Carte du tirage du {date}',
  'play.card.alt': 'Carte à envoyer : {title}, avec les mesures et le lien du défi.',
  'play.card.message_label': 'Message',
  'play.card.share_image': 'Envoyer l’image',
  'play.card.save': 'Enregistrer l’image',
  'play.card.more': '… et {count} autres dans le tirage',
  'play.card.cta_sub': 'Lire le programme',
  'play.card.attribution_1':
    'Texte : L’Avenir en commun (La France insoumise), CC\u00a0BY-NC-SA\u00a04.0',
  'play.card.attribution_2': 'Carte : C’est écrit là, projet militant indépendant',
  'play.share.text': 'Tirage du {date} : {count} mesures du programme qui m’ont surpris·e. À toi :',
  'play.share.text_one': 'Tirage du {date} : 1 mesure du programme qui m’a surpris·e. À toi :',
  'play.share.text_none':
    'Tirage du {date} : {count} mesures du programme. Tu savais que c’était dedans ? À toi :',
  'play.share.compare_text':
    'Tirage du {date} : mes {count} réponses sont dans ce lien. Compare tes découvertes aux miennes :',
  'play.error.table': 'La table des défis est introuvable.',
});

/** Local string with {placeholders}, falling back to the shared kit. */
function tt(key, params = {}) {
  if (!(key in STRINGS)) return t(key, params);
  return frTypo(
    STRINGS[key].replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m)),
  );
}

/* ------------------------------------------------------------------ */
/* Table and state                                                      */
/* ------------------------------------------------------------------ */

const ANSWER = Object.freeze({ s: 'knew', d: 'discover', p: 'skip' });
const INDEX_RE = /^\d{1,4}$/;

async function loadTable() {
  const r = await fetch(new URL('./defis.json', import.meta.url));
  if (!r.ok) throw new Error(`defis.json: HTTP ${r.status}`);
  return r.json();
}

/** Day of the year (1-366) of a UTC date. */
const dayOfYear = (d) =>
  Math.round((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000) + 1;

/** Resolve ?n=: known index of the table, else the day's draw (today if published, else the table default). */
function resolveIndex(table) {
  const raw = qs('n');
  if (raw !== null && INDEX_RE.test(raw) && table.draws[raw]) return { n: raw, linkArrival: true };
  const today = String(dayOfYear(effectiveDate()));
  const n = table.draws[today] ? today : String(table.meta.default);
  return { n, linkArrival: raw !== null };
}

function parseAnswers(raw, total, { exact }) {
  if (!raw || !/^[sdp]+$/.test(raw)) return '';
  if (exact) return raw.length === total ? raw : '';
  return raw.slice(0, total);
}

const drawDate = (n, table) => new Date(`${table.draws[n].date}T00:00:00Z`);

/** URL builders: the bare link never carries answers; the compare link carries the player's five. */
const defiUrl = (n) => `${HERE}?n=${n}`;
const stateHash = (received, mine) => {
  const parts = [];
  if (received) parts.push(`r=${received}`);
  if (mine) parts.push(`p=${mine}`);
  return parts.length ? `#${parts.join('&')}` : '';
};

/* ------------------------------------------------------------------ */
/* Rendering helpers                                                    */
/* ------------------------------------------------------------------ */

const chapterLoc = (loc) => `Chapitre ${loc.chapter.number} › ${loc.section.title}`;

/** Section reader link that comes back here (section.js ?back=…&backLabel=…). */
function sectionLink(loc, backUrl, backLabel) {
  return (
    `${routes.section(loc.section.id)}&back=${encodeURIComponent(backUrl)}` +
    `&backLabel=${encodeURIComponent(backLabel)}#${loc.item.id}`
  );
}

/** Verbatim card (Gowun Batang, « Texte du programme », chapter › section, « Lire la section »). */
function verbatimCard(
  id,
  { variant = 'compact', back, backLabel, label = true, enter = false } = {},
) {
  const loc = locate(id);
  const item = loc.item;
  const node = el('blockquote', {
    class: `verbatim ${variant}${enter ? ' enter' : ''}`.trim(),
    dataset: { id: item.id },
    lang: 'fr',
  });
  if (label) node.append(el('span', { class: 'label', text: t('concept.label.verbatim') }));
  node.append(el('p', { text: item.text }));
  if (item.subMeasures?.length)
    node.append(
      el(
        'ol',
        { class: 'sub' },
        item.subMeasures.map((sm) => el('li', { text: sm.text })),
      ),
    );
  node.append(el('span', { class: 'loc', text: chapterLoc(loc) }));
  node.append(' ');
  node.append(
    el('a', {
      class: 'read',
      href: back ? sectionLink(loc, back, backLabel) : routes.section(loc.section.id, item.id),
      text: t('link.read_section'),
    }),
  );
  return node;
}

function displayTitle(lines, tag = 'h1') {
  return el(
    tag,
    { class: 'display' },
    lines.map((l) => el('span', { class: 'l', text: frTypo(l) })),
  );
}

/** 18-cell chapter mosaic, discovered chapters lit; the aria-label carries the information. */
function mosaic(litNumbers, { none = false } = {}) {
  const corpus = getCorpus();
  const chapters = [...corpus.chapters.values()].sort((a, b) => a.number - b.number);
  const list = [...litNumbers].sort((a, b) => a - b).join(', ');
  const wrap = el('div', { class: 'mosaic-wrap' });
  wrap.append(
    el('span', {
      class: 'label',
      text: tt(none ? 'play.result.mosaic_none' : 'play.result.mosaic'),
    }),
  );
  wrap.append(
    el(
      'div',
      {
        class: 'mosaic',
        role: 'img',
        'aria-label': litNumbers.size
          ? tt('play.result.mosaic_alt', { list })
          : tt('play.result.mosaic_alt_none'),
      },
      chapters.map((c) =>
        el('span', {
          class: `cell${litNumbers.has(c.number) ? ' lit' : ''}`,
          text: String(c.number),
          title: c.name,
          'aria-hidden': 'true',
        }),
      ),
    ),
  );
  return wrap;
}

/* ------------------------------------------------------------------ */
/* Screens                                                              */
/* ------------------------------------------------------------------ */

let table;
let n;
let ids;
let total;
let linkArrival;
let received;
let mine;
let date;

function writeHash() {
  history.replaceState(
    null,
    '',
    `${location.pathname}${location.search}${stateHash(received, mine)}`,
  );
}

function contextLine() {
  if (!linkArrival) return null;
  if (received)
    return el('p', {
      class: 'context played',
      text: tt('play.link.context_played', { count: total }),
    });
  return el('p', { class: 'context', text: tt('play.link.context', { count: total }) });
}

/** Screens 0 and 1: one card, position « i / total », two equal buttons + « Passer ». */
function renderPlay(index, { enter = false } = {}) {
  const id = ids[index];
  const nodes = [];
  const ctx = contextLine();
  if (ctx) nodes.push(ctx);
  nodes.push(
    el('p', { class: 'kicker draw-date', text: tt('play.kicker', { date: formatDateFr(date) }) }),
  );
  nodes.push(displayTitle(['Tu savais que', 'c’était dedans ?']));
  const pos = el('p', {
    class: 'pos',
    'aria-live': 'polite',
    text: tt('play.position', { n: index + 1, total }),
  });
  nodes.push(pos);
  const backUrl = defiUrl(n) + stateHash(received, mine);
  const stage = el('div', { class: 'stage' }, [
    verbatimCard(id, {
      variant: 'hero',
      enter,
      back: backUrl,
      backLabel: tt('play.resume', { n: index + 1, total }),
    }),
  ]);
  nodes.push(stage);

  const answers = el('div', { class: 'answers', id: 'cta' });
  // data-motion="press": 120 ms scale feedback under the finger (shared/motion.js), the tap replaces the swipe (D5.9).
  const press = { attrs: { 'data-motion': 'press' } };
  const knew = button({ label: tt('play.knew'), onClick: () => answer('s'), ...press });
  const discover = button({ label: tt('play.discover'), onClick: () => answer('d'), ...press });
  answers.append(knew, discover);
  nodes.push(answers);
  nodes.push(
    el(
      'div',
      { class: 'pass-row' },
      el('button', {
        class: 'textlink',
        type: 'button',
        dataset: { motion: 'press' },
        text: tt('play.skip'),
        onclick: () => answer('p'),
      }),
    ),
  );
  nodes.push(el('p', { class: 'meta', text: tt('play.meta', { count: total }) }));
  app.replaceChildren(...nodes);
  if (enter) knew.focus({ preventScroll: true });
}

function answer(letter) {
  if (!(letter in ANSWER) || mine.length >= total) return;
  mine += letter;
  writeHash();
  if (mine.length < total) renderPlay(mine.length, { enter: true });
  else renderResult();
}

function discoveredIds(answers) {
  return ids.filter((_, i) => answers[i] === 'd');
}

function resultTitleLines(count) {
  if (count === 1) return ['1 mesure', 'qui m’a', 'surpris·e'];
  return [`${count} mesures`, 'qui m’ont', 'surpris·e'];
}

function shareText(count) {
  const dateLabel = formatDateFr(date);
  if (count === 0) return tt('play.share.text_none', { date: dateLabel, count: total });
  if (count === 1) return tt('play.share.text_one', { date: dateLabel });
  return tt('play.share.text', { date: dateLabel, count });
}

function nextIndex() {
  const keys = Object.keys(table.draws).sort((a, b) => Number(a) - Number(b));
  return keys.find((k) => Number(k) > Number(n)) ?? keys.find((k) => k !== n) ?? null;
}

/** Screen 3: the discoveries, the mosaic, the common block (link with #r=), the two links, « Encore ? ». */
function renderResult() {
  window.scrollTo(0, 0);
  const found = discoveredIds(mine);
  const count = found.length;
  const dateLabel = formatDateFr(date);
  const resultUrl = defiUrl(n) + stateHash(received, mine);
  const nodes = [];
  nodes.push(el('p', { class: 'kicker draw-date', text: tt('play.kicker', { date: dateLabel }) }));

  if (count === 0) {
    nodes.push(el('h1', { class: 'title', text: tt('play.result.none', { count: total }) }));
    nodes.push(
      el('p', {
        class: 'lead',
        text: nextIndex()
          ? tt('play.result.none_lead', { count: total })
          : tt('play.result.none_lead_end'),
      }),
    );
  } else {
    nodes.push(displayTitle(resultTitleLines(count)));
    nodes.push(
      el(
        'ol',
        { class: 'found' },
        found.map((id) =>
          el('li', {}, verbatimCard(id, { back: resultUrl, backLabel: tt('play.back_to_result') })),
        ),
      ),
    );
  }

  const litChapters = new Set(found.map((id) => locate(id).chapter.number));
  nodes.push(mosaic(litChapters, { none: count === 0 }));

  if (received) {
    const common = ids.filter((_, i) => mine[i] === 'd' && received[i] === 'd');
    const block = el('section', { class: 'common', 'aria-labelledby': 'common-title' });
    const title =
      common.length === 0
        ? tt('play.result.common_none')
        : common.length === 1
          ? tt('play.result.common_one')
          : tt('play.result.common_many', { count: common.length });
    block.append(el('h2', { class: 'h', id: 'common-title', text: title }));
    if (common.length)
      block.append(
        el(
          'ol',
          { class: 'found' },
          common.map((id) =>
            el(
              'li',
              {},
              verbatimCard(id, {
                back: resultUrl,
                backLabel: tt('play.back_to_result'),
                label: false,
              }),
            ),
          ),
        ),
      );
    block.append(el('p', { class: 'small', text: tt('play.result.common_hint') }));
    nodes.push(block);
  }

  // « Et toi ? »: the bare link, never the answers (also when this page was opened with #r=).
  const bareUrl = absolute(defiUrl(n));
  const shareBlock = el('section', { class: 'share-block', 'aria-labelledby': 'share-title' });
  shareBlock.append(
    el('h2', { class: 'h', id: 'share-title', text: tt('play.result.share_title') }),
  );
  shareBlock.append(
    el('p', { class: 'lead-line', text: tt('play.result.share_lead', { date: dateLabel }) }),
  );
  shareBlock.append(
    shareButton({ title: tt('play.title'), text: shareText(count), url: bareUrl, primary: true }),
  );
  if (!silence().active)
    shareBlock.append(
      button({ label: tt('play.result.see_card'), primary: false, onClick: () => renderCard() }),
    );
  nodes.push(shareBlock);

  // « Comparer nos découvertes »: the same link + #r=<my five answers>, said explicitly.
  const compareBlock = el('section', { class: 'share-block', 'aria-labelledby': 'compare-title' });
  compareBlock.append(
    el('h2', { class: 'h', id: 'compare-title', text: tt('play.result.compare') }),
  );
  compareBlock.append(
    el('p', { class: 'lead-line', text: tt('play.result.compare_lead', { count: total }) }),
  );
  compareBlock.append(
    shareButton({
      title: tt('play.result.compare'),
      text: tt('play.share.compare_text', { date: dateLabel, count: total }),
      url: absolute(defiUrl(n) + `#r=${mine}`),
      label: silence().active ? null : tt('play.result.compare_button'),
      primary: false,
    }),
  );
  nodes.push(compareBlock);

  const next = nextIndex();
  if (next)
    nodes.push(
      button({ label: tt('play.result.again'), href: defiUrl(next), primary: false, arrow: true }),
    );
  nodes.push(
    button({
      label: tt('play.result.read_programme'),
      href: routes.home,
      primary: false,
      arrow: true,
    }),
  );

  // The five of the draw, the same for everyone, without any status mark.
  nodes.push(el('h2', { class: 'h', text: tt('play.result.draw_title', { date: dateLabel }) }));
  nodes.push(
    el(
      'ol',
      { class: 'draw-list' },
      ids.map((id) =>
        el(
          'li',
          {},
          verbatimCard(id, {
            variant: 'compact bare',
            label: false,
            back: resultUrl,
            backLabel: tt('play.back_to_result'),
          }),
        ),
      ),
    ),
  );
  app.replaceChildren(...nodes);
}

/** Screen 4: the 1080 × 1920 card drawn from the day's draw, save / share, WhatsApp fallback text. */
async function renderCard() {
  window.scrollTo(0, 0);
  const found = discoveredIds(mine);
  const count = found.length;
  const dateLabel = formatDateFr(date);
  const bareUrl = absolute(defiUrl(n));
  const text = shareText(count);
  const titleLines =
    count === 0 ? ['Tu savais', 'que c’était', 'dedans ?'] : resultTitleLines(count);
  const titleText = count === 0 ? tt('play.title') : titleLines.join(' ');

  const nodes = [];
  nodes.push(
    el(
      'p',
      {},
      el('button', {
        class: 'textlink',
        type: 'button',
        text: tt('play.back_to_result'),
        onclick: () => renderResult(),
      }),
    ),
  );
  nodes.push(
    el('p', { class: 'kicker draw-date', text: tt('play.card.kicker', { date: dateLabel }) }),
  );
  nodes.push(displayTitle(['Envoyer', 'la carte']));
  const canvas = el('canvas', {
    class: 'card-preview',
    role: 'img',
    'aria-label': tt('play.card.alt', { title: titleText }),
  });
  nodes.push(el('div', { class: 'card-frame' }, canvas));
  nodes.push(
    el('p', { class: 'message' }, [
      el('strong', { text: `${tt('play.card.message_label')} : ` }),
      `${text} ${bareUrl}`,
    ]),
  );
  const actions = el('div', { class: 'stack', id: 'card-actions' });
  nodes.push(actions);
  app.replaceChildren(...nodes);

  const verbatims = found.map((id) => {
    const loc = locate(id);
    return { text: loc.item.text, loc: chapterLoc(loc), chapter: loc.chapter.number };
  });
  const litChapters = new Set((count === 0 ? ids : found).map((id) => locate(id).chapter.number));
  const shown = bareUrl.replace(/^https?:\/\//, '');
  try {
    await drawCard(canvas, {
      dateLabel: tt('play.kicker', { date: dateLabel }),
      kicker: t('home.link.kicker'),
      titleLines,
      verbatims,
      chapterLines: ids.map((id) => chapterLoc(locate(id))),
      litChapters,
      moreLine: count > 3 ? tt('play.card.more', { count: count - 3 }) : null,
      cta: tt('play.result.share_title'),
      ctaSub: tt('play.card.cta_sub'),
      url: shown,
      attribution: [tt('play.card.attribution_1'), tt('play.card.attribution_2')],
    });
  } catch (err) {
    console.error(err);
    actions.append(el('p', { class: 'notice warn', text: t('error.generic') }));
    return;
  }

  const fileName = `cestecritla-defi-${n}.png`;
  const blob = await cardBlob(canvas);
  const file = new File([blob], fileName, { type: 'image/png' });
  const canShareFile =
    typeof navigator.share === 'function' && navigator.canShare?.({ files: [file] }) === true;
  if (canShareFile)
    actions.append(
      button({
        label: tt('play.card.share_image'),
        onClick: () =>
          navigator
            .share({ title: tt('play.title'), text: `${text} ${bareUrl}`, files: [file] })
            .catch(() => {}),
      }),
    );
  actions.append(
    button({
      label: t('share.button_image'),
      primary: !canShareFile,
      onClick: () => {
        const href = URL.createObjectURL(blob);
        const a = el('a', { href, download: fileName });
        document.body.append(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(href), 1000);
      },
    }),
  );
  actions.append(shareButton({ title: tt('play.title'), text, url: bareUrl, primary: false }));
}

/* ------------------------------------------------------------------ */
/* Boot                                                                 */
/* ------------------------------------------------------------------ */

try {
  [table] = await Promise.all([loadTable(), init()]);
  ({ n, linkArrival } = resolveIndex(table));
  ids = table.draws[n].ids.filter((id) => getItem(id));
  total = ids.length;
  date = drawDate(n, table);
  received = parseAnswers(hashParam('r'), total, { exact: true });
  mine = parseAnswers(hashParam('p'), total, { exact: false });
  // A link with an unknown index shows the day's draw under its real index (the share link must be replayable).
  if (linkArrival && qs('n') !== n)
    history.replaceState(null, '', `${defiUrl(n)}${stateHash(received, mine)}`);
  setTitle(tt('play.title'));
  const route = () => (mine.length < total ? renderPlay(mine.length) : renderResult());
  route();
  // A same-document hash navigation (compare link opened here, browser back) re-reads the state.
  window.addEventListener('hashchange', () => {
    received = parseAnswers(hashParam('r'), total, { exact: true });
    mine = parseAnswers(hashParam('p'), total, { exact: false });
    route();
  });
} catch (err) {
  app.replaceChildren(el('p', { class: 'notice warn', text: t('error.generic') }));
  console.error(err);
}
