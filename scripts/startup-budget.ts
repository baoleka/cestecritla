/**
 * The startup budget of the Worker, judged on the profile `wrangler check startup` writes
 * (review 13, G7). wrangler measures and never judges: its step was green whatever the startup
 * cost, while 09-architecture.md counted on it for Cloudflare's limit of one second.
 *
 *   npx tsx scripts/startup-budget.ts [worker-startup.cpuprofile]
 *
 * The budget is local and well under the limit: a shared runner is not Cloudflare's machine,
 * and what is measured here is the order of magnitude (about 30 ms on 24/11/2026). Exit 1 above
 * it, or when the profile cannot be read.
 */
import { readFileSync } from 'node:fs';

/** Active time allowed, in milliseconds. */
export const STARTUP_BUDGET_MS: number = 400;

interface Profile {
  nodes: { id: number; callFrame: { functionName: string } }[];
  samples: number[];
  timeDeltas: number[];
}

/** Milliseconds the profile spent outside `(idle)`. */
export function activeMs(profile: Profile): number {
  const names = new Map(profile.nodes.map((node) => [node.id, node.callFrame.functionName]));
  let micros = 0;
  profile.timeDeltas.forEach((delta, index) => {
    if (names.get(profile.samples[index] ?? -1) !== '(idle)') micros += delta;
  });
  return micros / 1000;
}

if (process.argv[1] !== undefined && /startup-budget(?:\.ts)?$/.test(process.argv[1])) {
  const path = process.argv[2] ?? 'worker-startup.cpuprofile';
  try {
    const ms = activeMs(JSON.parse(readFileSync(path, 'utf8')) as Profile);
    console.log(`startup: ${ms.toFixed(1)} ms active — budget ${String(STARTUP_BUDGET_MS)} ms`);
    if (ms > STARTUP_BUDGET_MS) {
      console.error(`startup over its budget: ${ms.toFixed(1)} ms`);
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(
      `startup: ${path} cannot be read (${error instanceof Error ? error.name : 'error'})`,
    );
    process.exitCode = 1;
  }
}
