/**
 * Copy the self-hosted font subsets into public/ and enforce the P8 budget.
 *
 * The italic is deliberately NOT shipped. The audit measured 99 744 o delivered against a
 * 75 KB budget, and the single cause was PublicSans-Italic-Variable-latin.woff2 (31 116 o),
 * the whole variable italic where a 900-axis subset was intended. Applying the §19.3 default
 * on the wordmark — straight capitals, no 3D block — removes its only user, and D3.2 already
 * forbids italic in the verbatim. 68 628 o remain, under budget, with no subsetting at all.
 *
 * If an italic is ever reintroduced, this script fails until it is subset to the 900 axis.
 */
import { copyFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

/** P8: fonts delivered per page, all faces together. */
export const FONT_BUDGET_BYTES = 75 * 1024;

export const SHIPPED = [
  'PublicSans-Variable-latin.woff2',
  'GowunBatang-Regular-latin.woff2',
  'GowunBatang-Bold-latin.woff2',
] as const;

const root = process.cwd();
const from = resolve(root, 'design/fonts');
const to = resolve(root, 'public/fonts');

mkdirSync(to, { recursive: true });

let total = 0;
for (const name of SHIPPED) {
  const src = resolve(from, name);
  const size = statSync(src).size;
  total += size;
  copyFileSync(src, resolve(to, name));
  console.log(`  ${name}: ${String(size)} B`);
}

const available = readdirSync(from).filter((f) => f.endsWith('.woff2'));
const skipped = available.filter((f) => !(SHIPPED as readonly string[]).includes(f));
if (skipped.length > 0) console.log(`  not shipped: ${skipped.join(', ')}`);

if (total > FONT_BUDGET_BYTES) {
  console.error(
    `FAIL: fonts ${String(total)} B exceed the P8 budget of ${String(FONT_BUDGET_BYTES)} B`,
  );
  process.exit(1);
}
console.log(`fonts: ${String(total)} B of ${String(FONT_BUDGET_BYTES)} B (P8)`);
