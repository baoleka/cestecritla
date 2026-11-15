/**
 * Which mascot a host serves — one rule, read from data/mascot.json by everything that needs
 * it: the build of the pages (src/lib/mascot-config.ts), the launch gate (scripts/launch.ts) and
 * the deploy guard (scripts/build-mode.ts). Pure, and imported by all three.
 *
 * Two generations live side by side while the second is being made (D17.14;
 * docs/discovery/PLAN-TORTUE.md §11): 1 is the turtle validated on 13 November 2026, the one
 * that is online; 2 is the one that surfs, becomes a flamingo and flies. Two hosts (D15.12):
 * production — the apex and `www` — and the preview host, where the second generation is tried
 * before anyone else sees it.
 *
 * The rule runs one way only, like the one for questions (src/lib/ask-mode.ts). When production
 * serves the second generation, the preview does too: it is where production is tried. The
 * preview being ahead never moves production.
 *
 * Total on purpose: whatever the file holds — nothing, a broken text, a word instead of a
 * number — the answer is 1. Withdrawing the site must never wait on this file being well formed.
 */

export type MascotGeneration = 1 | 2;

/** Where a build is served. */
export type MascotHost = 'apex' | 'preview';

/** The generation the file gives a host. Anything unreadable is 1: nothing new by accident. */
export function generationFor(file: unknown, host: MascotHost): MascotGeneration {
  if (typeof file !== 'object' || file === null) return 1;
  const { generation, preview_generation: preview } = file as Record<string, unknown>;
  if (generation === 2) return 2;
  return host === 'preview' && preview === 2 ? 2 : 1;
}
