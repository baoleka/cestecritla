import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import { askSite } from './src/lib/ask-config.ts';
import { gameSite } from './src/lib/game-data.ts';
import { wordsSite } from './src/lib/words-config.ts';

// Static output, no adapter (D7.2): every page is HTML at build time and is served by
// Static Assets. The Worker (src/worker/index.ts) only handles /api/*.
//
// Measured in prototypes/labo-plateforme/framework (9/9/2026, Lighthouse CPU x4, Slow 4G):
// Astro static with inlined CSS = LCP 935 ms, 1 517 o of initial JS, critical path 54 894 o,
// against React 19 + Vite CSR at 2 059 ms / 64 726 o / 118 231 o. Inlining the stylesheet is
// worth -525 ms of LCP on its own (perf-budget.md §1.2).
//
// Two source trees, one configuration (D15.4). `npm run build:holding` sets CEL_BUILD=holding and
// Astro then reads its pages from src/holding/ — two pages that import the same layout, tokens
// and fonts as the app. Switching `srcDir` rather than filtering routes means the holding build
// CANNOT emit a page of the app by accident: those files are simply outside its tree. Everything
// else below (CSP hashes, inlined stylesheet, trailing slashes) applies to both, so the page that
// stands in for the app is held to the same gates as the app.
const holding = process.env.CEL_BUILD === 'holding';

// Is the game in this build? Decided here, once, and handed to the pages as a constant the
// bundler can see (`__CEL_GAME__`): a page that must not show the game then does not even
// import it. Learning note — Astro attaches the styles of every component a page IMPORTS,
// rendered or not: with a plain `{on && <Game />}` the home page carried the game's whole
// stylesheet, and its script sat in dist/, while no word was allowed on the page. A condition
// the bundler can fold removes the import itself.
const site = holding ? { on: false, writes: false } : gameSite();
const game = site.on;
// The privacy page names what the game writes and offers to erase it — in every build of the
// app, the game shown or not: in the "scrutin" build (D16.16), and in one whose list of words is
// no longer validated, where phones may still keep a turtle (D21.32).
const gameWrites = !holding;
/** The neutral set of colours (`npm run build:neutral`): the takedown's answer, D14.12. */
const neutralTokens = process.env.CEL_TOKENS === 'neutral';
/** The build deployed before each electoral silence window: neither question nor game. */
const scrutin = process.env.CEL_SCRUTIN === '1';
// Does the field of this build open the sheet of « Demander »? A constant the bundler can see,
// like the game's: in mode "off" the page does not even import the sheet, and neither its
// script nor its stylesheet nor a word of it reaches dist/ (PLAN-CHAT §4).
const chat = !holding && askSite().mode === 'chat';
// Where the explained words show outside the sheet (PLAN-MOTS, D20.11): constants the bundler
// can see, like the game's — a page of a build that shows none does not import the folded line,
// and neither its script nor its stylesheet reaches dist/.
const words = holding ? { pages: false, search: false, game: false } : wordsSite();

export default defineConfig({
  output: 'static',
  srcDir: holding ? './src/holding' : './src',
  site: 'https://cestecritla.fr',
  compressHTML: true,
  trailingSlash: 'always',
  build: {
    inlineStylesheets: 'always',
    format: 'directory',
  },

  // Astro computes SHA-256 hashes for every inline style and script and emits them in a
  // <meta http-equiv="content-security-policy">. This is what lets us inline the stylesheet
  // (the -525 ms above) WITHOUT 'unsafe-inline' (H-PLA-15, security §14).
  //
  // Header-only directives (frame-ancestors, base-uri, form-action) live in public/_headers
  // instead: a <meta> CSP cannot express frame-ancestors. The two policies are enforced
  // independently, so they must not both constrain the same directive.
  experimental: {
    csp: {
      algorithm: 'SHA-256',
      directives: [
        "default-src 'none'",
        "img-src 'self' data:",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        // No script of ours hands a string to the HTML parser or to a script loader: every node
        // is built with `textContent` (src/scripts/engine.ts, `el`). So the browser is told to
        // refuse it outright, and no policy can be created to let one through (D16.80, the
        // editor's choice after the security review; Chrome 83, Safari 26, Firefox 148 —
        // older browsers ignore the two directives). In the meta policy, not in
        // public/_headers: it must hold wherever the page is served, the local tests included.
        "require-trusted-types-for 'script'",
        "trusted-types 'none'",
      ],
    },
  },

  vite: {
    // The sheets of colours the pages import: the charter's, tracked, or the neutral set a
    // neutral build writes outside the tree (D0.17, D14.12; review 12, T7).
    resolve: {
      alias: {
        '@cel/tokens.css': fileURLToPath(
          new URL(
            neutralTokens ? './build/neutral/tokens.css' : './src/styles/tokens.css',
            import.meta.url,
          ),
        ),
        '@cel/mascot2-tokens.css': fileURLToPath(
          new URL(
            neutralTokens
              ? './build/neutral/mascot2-tokens.css'
              : './src/styles/mascot2-tokens.css',
            import.meta.url,
          ),
        ),
      },
    },
    define: {
      __CEL_GAME__: JSON.stringify(game),
      __CEL_GAME_WRITES__: JSON.stringify(gameWrites),
      __CEL_CHAT__: JSON.stringify(chat),
      __CEL_SCRUTIN__: JSON.stringify(scrutin),
      __CEL_WORDS_PAGES__: JSON.stringify(words.pages),
      __CEL_WORDS_SEARCH__: JSON.stringify(words.search),
    },
    json: { stringify: true },
    build: { target: 'es2022', modulePreload: { polyfill: false }, sourcemap: false },
  },
});
