/**
 * Turns a link to an official section into a link to the SENTENCE, where the browser can.
 *
 * In the HTML, every link to the official site is `…/chapitreK/#section-anchor`, with the text
 * directive next to it in `data-fragment` ("text=…"). This appends `:~:text=…` to the href —
 * only after checking `document.fragmentDirective`, which browsers that implement text
 * fragments expose precisely so that pages can ask (Chromium, Safari 16.1+, Firefox 131+).
 *
 * Learning note — why not write the full link in the HTML. A browser that knows text fragments
 * strips `:~:…` from the fragment, scrolls to the words, and falls back on `#section-anchor` if
 * they are not found. A browser that does not know them looks for an element whose id is the
 * whole string "section-anchor:~:text=…", finds none, and leaves the reader at the top of a
 * long chapter. Progressive enhancement, in its plainest form: the safe link is the default.
 */
export function enhanceOfficialLinks(root: ParentNode): void {
  if (!('fragmentDirective' in document)) return;
  for (const link of root.querySelectorAll<HTMLAnchorElement>('a[data-fragment]')) {
    const fragment = link.dataset.fragment;
    if (fragment === undefined || fragment === '' || link.href.includes(':~:')) continue;
    link.href = `${link.href}:~:${fragment}`;
  }
}
