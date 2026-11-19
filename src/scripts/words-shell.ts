/**
 * The folded lines of the explained words on a page (src/components/Words.astro; PLAN-MOTS,
 * lot 4). Nothing is fetched while a line is closed: opened, it asks for its file — one, at an
 * address that says which page is read and nothing else (D20.13) — and the words come under it.
 *
 * A few hundred bytes, loaded with the page: what draws the words (src/scripts/words-view.ts)
 * comes only when a line is opened. A link to « #mots » opens the line it points to.
 */
for (const shell of document.querySelectorAll<HTMLDetailsElement>('details.words[data-words]')) {
  shell.addEventListener('toggle', () => {
    if (!shell.open || shell.dataset.asked !== undefined) return;
    shell.dataset.asked = '';
    void import('./words-view.ts').then(
      (view) => view.fillShell(shell),
      () => {
        // The module did not come: the next opening asks again.
        delete shell.dataset.asked;
      },
    );
  });
}

const target = location.hash === '#mots' ? document.getElementById('mots') : null;
if (target instanceof HTMLDetailsElement) target.open = true;
