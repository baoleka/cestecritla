#!/usr/bin/env node
/**
 * The « build » step of every wrangler configuration of this repository — and it builds
 * nothing. wrangler runs a configuration's build command before it bundles or sends anything
 * (a dry run included); this one lets the command go on only when scripts/deploy.ts started
 * it. A `wrangler deploy` typed by hand stops here, before the first byte leaves.
 *
 * Why a guard and not a rule alone (CLAUDE.md: « Jamais de `wrangler deploy` nu »):
 * scripts/deploy.ts is where the gates run — the launch blockers, the silence window of an
 * election (L49), the game's validated list, what the host may do with a question, the accord
 * of the day for the chat's Worker. A deploy that does not come from it has passed none of them.
 *
 * It is a tripwire, not a lock: whoever sets the variable by hand passes. It is there for the
 * command typed too fast, by a person or by an agent.
 *
 * Plain JavaScript, no import but Node's own, on purpose: it must run under whatever `node`
 * wrangler was started with, and fail closed when it cannot.
 */
import { readFileSync, readdirSync } from 'node:fs';

const VARIABLE = 'CEL_DEPLOY_FROM';
/** scripts/deploy.ts says so itself, once its gates have passed. */
const CALLER = 'scripts/deploy.ts';
/**
 * For the two wrangler commands that run this step and send nothing — `wrangler types` and
 * `wrangler check startup` (package.json, CI). Whoever writes it in front of a deploy has read
 * this file and chosen to go round it.
 */
const READS_ONLY = 'nothing-is-sent';

/**
 * wrangler loads `.env`, `.env.local` and `.env.<env>` from the directory it runs in, by
 * itself: a line that sets the variable there would open this guard to every bare
 * `wrangler deploy` (review 11, M15). Such a file stops it, whoever started it.
 */
const opened = readdirSync('.').filter((name) => {
  if (!/^\.env(?:\..+)?$/.test(name)) return false;
  try {
    return new RegExp(`^\\s*(?:export\\s+)?${VARIABLE}\\s*=`, 'm').test(readFileSync(name, 'utf8'));
  } catch {
    return false;
  }
});
if (opened.length > 0) {
  console.error(
    `\ndeploy refused: ${opened.join(', ')} sets ${VARIABLE}, which this guard would read as if ` +
      'scripts/deploy.ts had. Nothing was sent. Take the line out.\n',
  );
  process.exit(1);
}

const said = process.env[VARIABLE];
if (said === CALLER || said === READS_ONLY) process.exit(0);

console.error(
  [
    '',
    'deploy refused: wrangler was not started by scripts/deploy.ts.',
    'Nothing was sent. The gates of this site run in that script, and nowhere else:',
    '  npm run deploy                        the apex',
    '  npm run deploy:preview -- --bench     the preview host, with its Worker',
    '  npm run deploy:chat[:preview] -- --accord <day>   the Worker of the chat',
    'Add `-- --dry-run` to see what would go out.',
    '',
  ].join('\n'),
);
process.exit(1);
