/**
 * Écran 0 par lien (D0.19, D3.9 hybrid, D3.12): the shared passage verbatim, an impersonal line,
 * one CTA visible without scrolling, the independence and privacy lines under it.
 * State: ?id=<item id | section id>. Nothing stored.
 */
import {
  init,
  qs,
  getItem,
  getSection,
  locate,
  formatVerbatim,
  conceptsFor,
  routes,
  t,
  el,
  button,
  setTitle,
} from '../shared/ui.js';

const hero = document.getElementById('hero');
const cta = document.getElementById('cta');
const more = document.getElementById('more');
const title = document.getElementById('title');
const hint = document.getElementById('hint');

function resolveItem(id) {
  if (!id) return null;
  const item = getItem(id);
  if (item && !item.intro) return item;
  const section = getSection(id);
  if (!section) return null;
  // A section id: its key measure, else its first measure, else its chapeau.
  return (
    section.items.find((i) => i.kind === 'key_measure') ??
    section.items.find((i) => i.kind !== 'paragraph') ??
    section.items[0] ??
    null
  );
}

function renderUnknown() {
  hero.replaceChildren(
    el('p', { class: 'lead', text: t('link.unknown') }),
    el('p', { text: t('link.unknown_lead') }),
  );
  hint.hidden = true;
  title.hidden = true;
  cta.replaceChildren(
    button({ label: t('home.direct.cta_search'), href: routes.search(''), arrow: true }),
  );
  more.replaceChildren(
    button({ label: t('home.link.cta_secondary'), href: routes.home, primary: false, arrow: true }),
  );
  setTitle(t('link.unknown'));
}

function render(item) {
  const { section } = locate(item);
  hero.replaceChildren(formatVerbatim(item, { variant: 'hero', readLink: false }));
  setTitle(section.title);

  const concept = conceptsFor(item.id)[0] ?? null;
  const primary = concept
    ? button({ label: t('home.link.cta_primary'), href: routes.concept(concept.slug), arrow: true })
    : button({
        label: t('link.read_section'),
        href: routes.section(section.id, item.id),
        arrow: true,
      });
  cta.replaceChildren(primary);
  // Independence and privacy lines sit right under the CTA (visible without scrolling); the rest follows.
  const rest = [];
  if (concept)
    rest.push(
      el(
        'p',
        {},
        el('a', {
          class: 'textlink',
          href: routes.section(section.id, item.id),
          text: t('link.read_section'),
        }),
      ),
    );
  rest.push(
    button({ label: t('home.link.cta_secondary'), href: routes.home, primary: false, arrow: true }),
  );
  more.replaceChildren(...rest);
}

try {
  await init();
  const item = resolveItem(qs('id'));
  if (item) render(item);
  else renderUnknown();
} catch (err) {
  hero.replaceChildren(el('p', { class: 'notice warn', text: t('error.generic') }));
  console.error(err);
}
