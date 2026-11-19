/**
 * Constants the bundler replaces at build time (astro.config.ts, `vite.define`).
 */

/** True in a build that shows the game: the list of words is validated, or it is a test build. */
declare const __CEL_GAME__: boolean;

/** True when the site shows the game outside electoral silence: a phone may hold its memory. */
declare const __CEL_GAME_WRITES__: boolean;

/** True in the build deployed before each electoral silence window (D16.16). */
declare const __CEL_SCRUTIN__: boolean;

/** True in a build whose field opens the sheet of « Demander » (data/2026/ask.json: "chat"). */
declare const __CEL_CHAT__: boolean;

/**
 * True in a build that explains words on the pages of the sections, of our cards and of our
 * answers (data/2026/words.json, src/lib/words-config.ts; PLAN-MOTS, D20.11).
 */
declare const __CEL_WORDS_PAGES__: boolean;

/** True in a build whose search says when what is typed is an explained word (PLAN-MOTS, lot 6). */
declare const __CEL_WORDS_SEARCH__: boolean;
