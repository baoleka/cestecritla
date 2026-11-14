/**
 * What a host does with a question — one rule, read from data/2026/ask.json by everything that
 * needs it: the build of the pages (src/lib/ask-config.ts), the Worker (src/worker/index.ts)
 * and the deploy guard (scripts/build-mode.ts). Pure, and imported by all three.
 *
 * Two hosts (D15.12): production — the apex and `www` — and the preview host, where the chat
 * is tried before anyone else sees it (PLAN-CHAT, lots C8 and C11). `mode` is production's.
 * `preview_mode` lets the preview host ask while production still answers nothing: without it,
 * trying the chat would mean a file that says "chat" — and a production that could no longer
 * be redeployed, not even for a correction, until every gate of the launch holds.
 *
 * The rule runs one way only. When production asks, the preview asks too: it is where
 * production is tried. The preview asking never opens production.
 */

/** Where a build is served. */
export type AskHost = 'apex' | 'preview';

/** What a host does with a question: the sheet of « Demander », or nothing. */
export type SiteMode = 'chat' | 'off';

/** The mode of the file for one host. Anything unreadable is "off": nothing opens by accident. */
export function modeFor(file: unknown, host: AskHost): SiteMode {
  if (typeof file !== 'object' || file === null) return 'off';
  const { mode, preview_mode: preview } = file as Record<string, unknown>;
  if (mode === 'chat') return 'chat';
  return host === 'preview' && preview === 'chat' ? 'chat' : 'off';
}
