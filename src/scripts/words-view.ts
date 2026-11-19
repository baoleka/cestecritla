/**
 * How an explained word is drawn (PLAN-MOTS, D20.10): a line to press, its explanation under
 * it, and — for a word judged hard — an example. In the sheet of « Demander » today; on the
 * pages of the site once they explain words too.
 *
 * Text only, never markup: the pages refuse any string of HTML (Trusted Types, D16.80), and a
 * word is set with `textContent`, like everything else a script shows.
 *
 * Learning note — why this file has its own `el`. The one of src/scripts/engine.ts lives next to
 * the search engine, and importing it would carry the engine into every page that only explains
 * words. Five lines written twice cost less than nine kilobytes downloaded for nothing.
 */

/** What a word means, and its example when it has one: texts an AI wrote ahead. */
export interface WordText {
  plain: string;
  example: string | null;
}

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
 * Puts the explanation of a word under its line, once: what it means, then its example after
 * the word « Exemple » — which is ours, the example is not. Done in place, on the line already
 * drawn: a line drawn again would lose the focus of whoever just pressed it.
 */
export function fillItem(item: HTMLDetailsElement, text: WordText, exampleLabel: string): void {
  if (item.dataset.filled !== undefined) return;
  item.append(written(text.plain));
  if (text.example !== null) {
    const example = written(text.example);
    example.className = 'c-example';
    example.prepend(el('span', `${exampleLabel} — `, 'c-example-label'));
    item.append(example);
  }
  item.dataset.filled = '';
}

/**
 * One explained word: the line to press — the word itself —, its explanation under it when it
 * is already there (`text` null: it comes later, by `fillItem`). It opens as it is told, and
 * says each time its reader opens or closes it.
 */
export function wordItem(
  id: string,
  term: string,
  text: WordText | null,
  open: boolean,
  toggled: (open: boolean) => void,
  exampleLabel: string,
): HTMLDetailsElement {
  const item = el('details', undefined, 'c-term');
  item.dataset.term = id;
  item.open = open;
  item.append(el('summary', typographic(term)));
  if (text !== null) fillItem(item, text, exampleLabel);
  item.addEventListener('toggle', () => {
    toggled(item.open);
  });
  return item;
}
