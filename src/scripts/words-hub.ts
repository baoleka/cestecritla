/**
 * The page « Mots du programme » (src/components/WordsHub.astro; PLAN-MOTS, lot 5): every
 * explained word, from A to Z, each a line that opens on what it means.
 *
 * In the HTML: the names of the words, and the label that says who wrote what they mean — this
 * page is one of those that speak of the AI that wrote them (D20.11). What they mean comes by
 * script, the first time a word is opened: the two files the sheet of « Demander » fetches too,
 * whichever the word (D20.13), then put in place under every line.
 *
 * The field filters the list on the phone: nothing is sent, nothing is kept, and nothing says a
 * word is missing from the programme — only that none of these explained words matches, and
 * where the whole programme is searched.
 */
import { foldName } from '../lib/words-fold.ts';
import { fillItem, type WordText } from './words-view.ts';

const hub = document.querySelector<HTMLElement>('#mots-az');
const field = document.querySelector<HTMLInputElement>('#mots-filtre');
const none = document.querySelector<HTMLElement>('#mots-aucun');

/** What is typed, in the spelling the page gave each word (src/lib/words-fold.ts). */
const folded = (text: string): string => foldName(text).replace(/ +/g, ' ').trim();

if (hub !== null) {
  const meanings = hub.dataset.meanings ?? '';
  const examples = hub.dataset.examples ?? '';
  const exampleLabel = hub.dataset.example ?? '';
  let texts: Promise<ReadonlyMap<string, WordText> | null> | null = null;

  const fetched = async (url: string): Promise<Record<string, string> | null> => {
    try {
      const response = await fetch(url, { credentials: 'omit' });
      if (!response.ok) return null;
      const file = (await response.json()) as { written_by?: unknown; texts?: unknown };
      if (file.written_by !== 'ai' || typeof file.texts !== 'object' || file.texts === null) {
        return null;
      }
      // A text that is not a string is no text: it is left out (review of 23/11/2026, S27).
      return Object.fromEntries(
        Object.entries(file.texts as Record<string, unknown>).filter(
          (entry): entry is [string, string] => typeof entry[1] === 'string',
        ),
      );
    } catch {
      return null;
    }
  };

  /** What every word means, and their examples: the two files together, once. */
  const load = (): Promise<ReadonlyMap<string, WordText> | null> => {
    texts ??= Promise.all([fetched(meanings), fetched(examples)]).then(([plain, ex]) => {
      if (plain === null || ex === null) {
        texts = null;
        return null;
      }
      return new Map(
        Object.entries(plain).map(([id, text]) => [id, { plain: text, example: ex[id] ?? null }]),
      );
    });
    return texts;
  };

  const fill = (): void => {
    void load().then((loaded) => {
      if (loaded === null) return;
      for (const item of hub.querySelectorAll<HTMLDetailsElement>(
        'details.c-term[data-term]:not([data-filled])',
      )) {
        const text = loaded.get(item.dataset.term ?? '');
        if (text !== undefined) fillItem(item, text, exampleLabel);
      }
    });
  };

  for (const item of hub.querySelectorAll<HTMLDetailsElement>('details.c-term')) {
    item.addEventListener('toggle', () => {
      if (item.open) fill();
    });
  }
  // A word opened before this script ran — the page is long, and its lines answer at once —
  // heard no toggle: it is filled now (review of 24/11/2026, K5).
  if (hub.querySelector('details.c-term[open]') !== null) fill();

  // A link to « #mot-… » opens that word, and brings it into view — on arrival, and when the
  // address changes on this very page (a link from the same page does not load it again). The
  // focus goes to its line too: a keyboard, or a screen reader, starts from the word asked for,
  // not from the top of the page (review of the preview host, lot 16).
  const openFromAddress = (): void => {
    const target = /^#mot-[a-z0-9-]+$/.test(location.hash)
      ? document.getElementById(location.hash.slice(1))
      : null;
    if (target instanceof HTMLDetailsElement) {
      target.open = true;
      target.scrollIntoView({ block: 'center' });
      // On arrival the browser runs its own focusing steps for the fragment once the page has
      // loaded, and falls back to the page itself, the target being no control: the line takes
      // the focus after that (Chromium and WebKit do it later than Firefox).
      const focusLine = (): void => {
        requestAnimationFrame(() =>
          target.querySelector('summary')?.focus({ preventScroll: true }),
        );
      };
      if (document.readyState === 'complete') focusLine();
      else window.addEventListener('load', focusLine, { once: true });
    }
  };
  openFromAddress();
  window.addEventListener('hashchange', openFromAddress);

  // The filter: each word stays if what is typed is in it; a letter without a word goes.
  if (field !== null && none !== null) {
    field.addEventListener('input', () => {
      const typed = folded(field.value);
      let shown = 0;
      for (const group of hub.querySelectorAll<HTMLElement>('[data-letter]')) {
        let inGroup = 0;
        for (const row of group.querySelectorAll<HTMLElement>('li[data-name]')) {
          const keep = typed === '' || (row.dataset.name ?? '').includes(typed);
          row.hidden = !keep;
          if (keep) inGroup += 1;
        }
        group.hidden = inGroup === 0;
        shown += inGroup;
      }
      none.hidden = shown > 0;
    });
  }
}
