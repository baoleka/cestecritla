/**
 * The game of the build under way — what a page of this build publishes: the words, the tiles,
 * and the sentences this build may show (D19.2, D19.5, D19.6).
 *
 * Apart from src/lib/game-data.ts on purpose. That file is read by the scripts too (the deploy
 * guard, the gates), which look at a build from OUTSIDE it and must say themselves which build
 * they mean. Here the mode is the one this very build was asked for — a test build and the
 * "scrutin" build included (src/lib/ask-config.ts) — so a page and the file it names always
 * agree.
 */
import { askSite } from './ask-config.ts';
import { buildGame, gameSources, gameWords, wordLinks, type BuiltGame } from './game-data.ts';
import { gameGists } from './game-gists.ts';

export function builtGame(): BuiltGame {
  const file = gameWords();
  const sources = gameSources();
  const gists = gameGists(file.words, sources.manifest.meta.corpus_version, {
    mode: askSite().mode,
  });
  return buildGame(file, sources, wordLinks(), gists);
}
