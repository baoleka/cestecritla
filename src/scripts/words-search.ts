/**
 * The line of the search that says what is typed is an explained word — or asks what one
 * means — and leads to its explanation on the page « Mots du programme », or to our card
 * (PLAN-MOTS, lot 6).
 *
 * A module of its own, imported by the search's script only where the build shows the line
 * (`__CEL_WORDS_SEARCH__`, src/components/Search.astro): the search itself is untouched, and a
 * build that does not show the line is the build of before, byte for byte.
 *
 * It draws when the search draws. A MutationObserver on the results is called once the search
 * has changed them, before the page is painted: the line and the results come in one frame, and
 * nothing moves twice. How the words are found is fetched at the first sign of a search, like
 * the index — one file, the same for everyone (D20.13). What is typed is read here, and sent
 * nowhere.
 */
import { CARD_PREFIX, type TermWording } from '../lib/terms.ts';
import { el, typographic } from './words-view.ts';
import type * as Words from './words.ts';

const form = document.querySelector<HTMLFormElement>('#search');
const input = document.querySelector<HTMLInputElement>('#q');
const row = document.querySelector<HTMLElement>('#search-word');
const results = document.querySelector<HTMLElement>('#search-results');
const list = document.querySelector<HTMLElement>('#search-list');
const stringsNode = document.querySelector('#search-strings');

if (form && input && row && results && list && stringsNode) {
  const strings = JSON.parse(stringsNode.textContent) as {
    wordRow?: string;
    cards?: { id: string; term: string }[];
  };
  const cards = strings.cards ?? [];
  let kit: typeof Words | null = null;
  let wordings: TermWording[] | null = null;
  let asked = false;
  const prepare = (): void => {
    if (asked) return;
    asked = true;
    void import('./words.ts').then(
      async (loaded) => {
        kit = loaded;
        wordings = await loaded.finder(form.dataset.words ?? '');
        if (wordings === null) asked = false;
      },
      () => {
        asked = false;
      },
    );
  };
  if (document.activeElement === input) prepare();
  input.addEventListener('focus', prepare);

  /** The words the search reads: what the field holds, as the search trims it. */
  const typed = (): string => input.value.trim().slice(0, 200);
  const draw = (): void => {
    const question = results.hidden && list.childElementCount === 0 ? '' : typed();
    const found =
      kit === null || wordings === null || question === ''
        ? []
        : kit.named(question, wordings, cards);
    const first = found[0]?.entry;
    const text =
      first === undefined ? '' : (strings.wordRow ?? '').replace('{term}', typographic(first.term));
    if (row.textContent === text && row.hidden === (first === undefined)) return;
    row.replaceChildren();
    row.hidden = first === undefined;
    if (first === undefined) return;
    const card = first.id.startsWith(CARD_PREFIX) ? first.id.slice(CARD_PREFIX.length) : null;
    const link = el('a', text);
    link.href = card === null ? `/mot/#mot-${first.id}` : `/mot/${card}/`;
    row.append(link);
  };
  new MutationObserver(draw).observe(results, {
    attributes: true,
    attributeFilter: ['hidden'],
    childList: true,
    subtree: true,
  });
}
