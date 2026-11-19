/**
 * How an explained word is drawn (PLAN-MOTS, D20.10): a line to press, its explanation under
 * it. In the sheet of « Demander » today; on the pages of the site once they explain words too.
 *
 * Text only, never markup: the pages refuse any string of HTML (Trusted Types, D16.80), and a
 * word is set with `textContent`, like everything else a script shows.
 *
 * Learning note — why this file has its own `el`. The one of src/scripts/engine.ts lives next to
 * the search engine, and importing it would carry the engine into every page that only explains
 * words. Five lines written twice cost less than nine kilobytes downloaded for nothing.
 */

/** An element holding text — never markup. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className !== undefined) node.className = className;
  return node;
}

/** Our texts are typed with straight apostrophes; the page shows typographic ones. */
export const typographic = (text: string): string => text.replace(/'/g, '’');

/**
 * A text an AI wrote ahead, with the mark a machine can read on it (AI Act, art. 50 § 2). What
 * a person reads is the label of the block that holds it.
 */
export function written(text: string): HTMLParagraphElement {
  const node = el('p', typographic(text));
  node.dataset.generatedBy = 'ai';
  return node;
}

/**
 * One explained word: the line to press — the word itself —, its explanation under it. It
 * opens as it is told, and says each time its reader opens or closes it.
 */
export function wordItem(
  term: string,
  plain: string,
  open: boolean,
  toggled: (open: boolean) => void,
): HTMLDetailsElement {
  const item = el('details', undefined, 'c-term');
  item.open = open;
  item.append(el('summary', typographic(term)), written(plain));
  item.addEventListener('toggle', () => {
    toggled(item.open);
  });
  return item;
}
