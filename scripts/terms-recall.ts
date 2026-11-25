/**
 * The recall of the facts the explained words state (PLAN-MOTS, lot 13; 14-risques.md R70).
 *
 * An explanation or an example that states something that may change (a year, a share, a
 * length of time) is declared in eval/terms-sources.json, with the primary source it rests on
 * and the day that source was read: scripts/terms.test.ts requires it. Every
 * `recheck_every_days` days those sources must be read again. Nothing on the site can do it:
 * this script only says when.
 *
 *   npx tsx scripts/terms-recall.ts [--now 2027-02-17T06:00:00Z]
 *
 * Exit 0, and nothing printed: nothing is due. Exit 3: the title of the reminder on the first
 * line, then its text — the entries whose source was last read too long ago. The scheduled
 * workflow (.github/workflows/watch.yml) opens one issue per due day from it.
 *
 * What it is not: a guard. A rule that changed on 1 January takes no word off the site, and an
 * issue is read when it is read. GitHub also suspends the scheduled workflows of a repository
 * left sixty days without activity.
 */
import { readFileSync } from 'node:fs';

export const SOURCES_PATH = 'eval/terms-sources.json';

interface Source {
  url: string;
  consulted_on: string;
}

export interface SourcesFile {
  meta: { recheck_every_days: number };
  entries: Record<
    string,
    { example?: 'illustrative' | 'fact'; plain?: 'fact'; sources?: readonly Source[] }
  >;
}

export interface DueFact {
  id: string;
  /** The day its oldest source was read. */
  read_on: string;
  /** The day it was due to be read again. */
  due_on: string;
  urls: string[];
}

export interface Reminder {
  /** One per due day, and stable: the workflow looks for it before opening a second issue. */
  title: string;
  body: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** The facts whose oldest source was read `recheck_every_days` days or more before `now`. */
export function dueFacts(file: SourcesFile, now: Date): DueFact[] {
  const every = file.meta.recheck_every_days;
  const out: DueFact[] = [];
  for (const [id, declared] of Object.entries(file.entries)) {
    if (declared.example !== 'fact' && declared.plain !== 'fact') continue;
    const sources = declared.sources ?? [];
    const readOn = sources.map((source) => source.consulted_on).sort()[0];
    // A fact without a source is refused by scripts/terms.test.ts, not reminded here.
    if (readOn === undefined) continue;
    const due = new Date(Date.parse(`${readOn}T00:00:00Z`) + every * DAY_MS);
    if (now.getTime() < due.getTime()) continue;
    out.push({
      id,
      read_on: readOn,
      due_on: due.toISOString().slice(0, 10),
      urls: sources.map((source) => source.url),
    });
  }
  return out.sort((a, b) => a.due_on.localeCompare(b.due_on) || a.id.localeCompare(b.id));
}

/** The reminder to open at `now`, or null when nothing is due. */
export function reminderAt(file: SourcesFile, now: Date): Reminder | null {
  const due = dueFacts(file, now);
  // Keyed on the LATEST due day: each new due day gets its own reminder, listing everything
  // still unread — a fact of an earlier day left unread no longer hides the later ones (review
  // 13, G4).
  const latest = due.at(-1);
  if (latest === undefined) return null;
  const every = String(file.meta.recheck_every_days);
  const lines = due.map(
    (fact) => `- \`${fact.id}\` — lue le ${fact.read_on} : ${fact.urls.join(' ; ')}`,
  );
  return {
    title: `[mots-${latest.due_on}] Relire les sources de ${String(due.length)} fait(s) des mots expliqués`,
    body: [
      `Ces mots expliqués disent un fait qui peut changer — une année, une part, une durée. Leur source a été lue il y a ${every} jours ou plus (\`${SOURCES_PATH}\`) :`,
      '',
      ...lines,
      '',
      "À faire : relire chaque source. Si le fait tient, mettre à jour `consulted_on`. S'il a changé, réécrire l'explication ou l'exemple (`data/2026/terms.json`), le faire vérifier par un autre modèle, puis attester et sceller de nouveau : tant que le sceau n'est pas refait, `npm run deploy` refuse l'apex (D20.15).",
      '',
      "Ce rappel n'est pas une garde : un fait périmé reste en ligne tant que personne ne l'a corrigé (`14-risques.md`, R70).",
    ].join('\n'),
  };
}

if (process.argv[1] !== undefined && /terms-recall\.ts$/.test(process.argv[1])) {
  const at = process.argv.indexOf('--now');
  const now = at === -1 ? new Date() : new Date(process.argv[at + 1] ?? '');
  if (Number.isNaN(now.getTime())) {
    console.error('terms-recall: --now takes a date, such as 2027-02-17T06:00:00Z');
    process.exitCode = 2;
  } else {
    const reminder = reminderAt(JSON.parse(readFileSync(SOURCES_PATH, 'utf8')) as SourcesFile, now);
    if (reminder !== null) {
      console.log(`${reminder.title}\n\n${reminder.body}`);
      process.exitCode = 3;
    }
  }
}
