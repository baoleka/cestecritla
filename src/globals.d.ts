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
 * True in a build that shows the second generation of the mascot (data/mascot.json, D17.14):
 * the preview host first, production on the editor's word. False everywhere else — and a page
 * built with false does not even import her.
 */
declare const __CEL_MASCOT2__: boolean;
