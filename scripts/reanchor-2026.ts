/**
 * Re-anchoring the editorial content of September on the 2026 edition (lot E1).
 *
 *   npx tsx scripts/reanchor-2026.ts     prints, for each answer and each concept card written
 *                                        against the 2025 edition, where its supports went;
 *                                        writes the detail to private/reanchor/
 *
 * The fifteen answers to objections (data/riposte.json) and the five concept cards
 * (data/glossary.json) each rest on measures of the 2025 edition, cited by identifier. The book
 * was rewritten: 181 of its 837 propositions survive word for word. This lists, per entry, what
 * became of every support — identical, retouched, reworked, gone — so that a human can re-prove
 * each sentence against the new text instead of trusting that it still holds.
 *
 * It decides nothing and rewrites nothing: data/2026/riposte.json and glossary.json are written
 * by hand, entry by entry, and scripts/editorial.test.ts then holds them to the text.
 *
 * Identifiers and classes only on screen; the detail (with scores) stays under private/.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { ID_MAP_PRIVATE_PATH, type ItemMatch } from './id-map.js';

interface Riposte2025 {
  id: string;
  slug: string;
  measure_ids: string[];
  stat_card_id: string | null;
}
interface Card2025 {
  slug: string;
  verbatim_ids: string[];
  related_measure_ids: string[];
}

function main(): void {
  const map = JSON.parse(readFileSync(ID_MAP_PRIVATE_PATH, 'utf8')) as { items: ItemMatch[] };
  const byFrom = new Map(map.items.map((m) => [m.from, m]));
  const riposte = JSON.parse(readFileSync('data/riposte.json', 'utf8')) as {
    entries: Riposte2025[];
  };
  const glossary = JSON.parse(readFileSync('data/glossary.json', 'utf8')) as {
    entries: Card2025[];
  };

  const follow = (ids: readonly string[]): ItemMatch[] =>
    ids.map(
      (id) =>
        byFrom.get(id) ?? {
          from: id,
          to: null,
          toSection: null,
          toChapter: null,
          score: 0,
          class: 'none',
        },
    );
  const line = (matches: readonly ItemMatch[]): string =>
    matches.map((m) => `${m.from}→${m.to ?? '∅'} (${m.class})`).join(', ');

  const report: Record<string, ItemMatch[]> = {};
  let stable = 0;
  let total = 0;
  for (const entry of riposte.entries) {
    const matches = follow(entry.measure_ids);
    report[`riposte:${entry.id}`] = matches;
    total += matches.length;
    stable += matches.filter((m) => ['exact', 'typo', 'close'].includes(m.class)).length;
    console.log(
      `${entry.id} ${entry.slug}: ${line(matches)}${entry.stat_card_id === null ? '' : ' · statistic card withdrawn (D15.10)'}`,
    );
  }
  for (const card of glossary.entries) {
    const matches = follow([...new Set([...card.verbatim_ids, ...card.related_measure_ids])]);
    report[`mot:${card.slug}`] = matches;
    total += matches.length;
    stable += matches.filter((m) => ['exact', 'typo', 'close'].includes(m.class)).length;
    console.log(`mot ${card.slug}: ${line(matches)}`);
  }
  console.log(
    `${String(stable)} of ${String(total)} supports are identical or close in the 2026 edition`,
  );
  mkdirSync('private/reanchor', { recursive: true });
  writeFileSync('private/reanchor/supports.json', `${JSON.stringify(report, null, 2)}\n`);
}

if (process.argv[1] !== undefined && /reanchor-2026\.ts$/.test(process.argv[1])) main();
