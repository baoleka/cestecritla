/**
 * Where a host explains words outside the sheet (PLAN-MOTS, lot 4; D20.11, D20.15): the rule,
 * pure, read from data/2026/words.json by the build (src/lib/words-config.ts), by the deploy
 * guard and by the gates.
 *
 *   pages    the pages of the sections, our cards and our answers — a folded line, « Des mots
 *            de cette section, expliqués » — and the page that lists every word (`/mot/`);
 *   search   one line above the results when what is typed is an explained word;
 *   game     under a card of the game, the words of its sentence (D20.4).
 *
 * The rule runs one way only, like the mode of « Demander » (src/lib/ask-mode.ts): the preview
 * host may show a surface before production, never the reverse. Anything unreadable is off:
 * nothing opens by accident.
 */

/** What a host shows of the explained words, outside the sheet. */
export interface WordsSite {
  pages: boolean;
  search: boolean;
  game: boolean;
}

export const NO_WORDS: WordsSite = { pages: false, search: false, game: false };
export const SURFACES = ['pages', 'search', 'game'] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** One line of the file: each surface « on », or off. */
function surfacesOf(value: unknown): WordsSite {
  const read = isRecord(value) ? value : {};
  return {
    pages: read['pages'] === 'on',
    search: read['search'] === 'on',
    game: read['game'] === 'on',
  };
}

/**
 * The line under the search links to « Mots du programme » (/mot/#mot-…), which only the
 * `pages` surface builds: without it the link led to an anchor that is not there (review of
 * 24/11/2026, S21).
 */
const linked = (site: WordsSite): WordsSite => ({ ...site, search: site.pages && site.search });

/**
 * The surfaces of a host: production's are `production`; the preview host shows those, and those
 * its own line opens on top — never fewer.
 */
export function wordsFor(file: unknown, host: 'apex' | 'preview'): WordsSite {
  const read = isRecord(file) ? file : {};
  const production = surfacesOf(read['production']);
  if (host === 'apex') return linked(production);
  const preview = surfacesOf(read['preview']);
  return linked({
    pages: production.pages || preview.pages,
    search: production.search || preview.search,
    game: production.game || preview.game,
  });
}
