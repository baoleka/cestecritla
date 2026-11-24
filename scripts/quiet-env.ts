/**
 * What every tool this repository starts is told, so that it reports nothing about us.
 *
 * Astro and wrangler both send usage events by default (review 12, T3; review 13, G12). Astro's
 * carry an identifier anyone can recompute from the public repository — the hash of its first
 * commit — and leave from the machine that builds: the link between that machine and this
 * project, which D0.15 keeps cut. wrangler's go to Cloudflare on every command. Each command a
 * script of ours starts gets this environment; package.json and the CI say the same for the
 * commands they start themselves (scripts/telemetry.test.ts holds all three).
 */
export const NO_TELEMETRY = {
  ASTRO_TELEMETRY_DISABLED: '1',
  // wrangler refuses « 0 » here: the word it reads is « false ».
  WRANGLER_SEND_METRICS: 'false',
} as const;

/** The environment of a command we start: the caller's own, with the usage reports off. */
export function quietEnv(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return { ...env, ...NO_TELEMETRY };
}
