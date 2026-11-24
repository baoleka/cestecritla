/**
 * The themes shown under the first gesture of the game, on the first screen of the site (D19.15)
 * — six of our answers to what people hear (data/2026/riposte.json; all of them are in the
 * section « Chercher », further down the page).
 *
 * Six that name a need of every day and name no one: housing, transport, pay, pensions, taxes,
 * energy. They stand on the same screen as the mascot, so the rule of the game's own words
 * holds for them (D16.26): none rests on a section no word of the game is taken from — today
 * that leaves out « Immigration », « Police et sécurité » and « Laïcité », the three a capture
 * could turn with a turtle beside them (D17.9, `14-risques.md` R22). The rule is computed, not
 * listed: `doorRefusals` reads the answers and the game's pool of sections, the build stops on
 * what it finds (src/components/Game2.astro) and scripts/game-page.test.ts holds it.
 */
export const DOOR_THEMES: readonly string[] = [
  'logement',
  'transports',
  'salaires',
  'retraites',
  'impots',
  'energie',
];

/** What this rule reads of an answer of ours (src/lib/editorial.ts, `Riposte`). */
export interface DoorAnswer {
  slug: string;
  supports: readonly { id: string }[];
  review: { status: string };
}

/**
 * Why a list of themes may not stand under the first gesture — nothing when it may. Pure.
 *
 *   - every theme is an answer of ours that is published: its page exists, the link lands;
 *   - none rests on a section no word of the game is taken from (`wordlessSections`,
 *     src/lib/game.ts), by any of the measures it leans on (`sectionOf`: a measure → its
 *     section, read from the manifest by the caller);
 *   - none is listed twice.
 */
export function doorRefusals(
  themes: readonly string[],
  answers: readonly DoorAnswer[],
  wordless: ReadonlySet<string>,
  sectionOf: (measure: string) => string | undefined,
): string[] {
  const out: string[] = [];
  if (new Set(themes).size !== themes.length) out.push('a theme is listed twice');
  for (const slug of themes) {
    const entry = answers.find((answer) => answer.slug === slug);
    if (entry === undefined) {
      out.push(`${slug}: no answer is filed under that name`);
      continue;
    }
    if (entry.review.status !== 'accepted' && entry.review.status !== 'reviewed') {
      out.push(`${slug}: its answer is not published`);
    }
    const unknown = entry.supports.filter((support) => sectionOf(support.id) === undefined);
    if (unknown.length > 0) {
      out.push(`${slug}: leans on ${unknown.map((s) => s.id).join(', ')}, which no section holds`);
    }
    const on = new Set(
      entry.supports.flatMap((support) => {
        const section = sectionOf(support.id);
        return section !== undefined && wordless.has(section) ? [section] : [];
      }),
    );
    if (on.size > 0) {
      out.push(
        `${slug}: rests on ${[...on].join(', ')}, where no word of the game is taken from (D16.26)`,
      );
    }
  }
  return out;
}
