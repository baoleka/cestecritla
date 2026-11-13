/**
 * The reminder of the scrutin build (D16.16; runbook sheet 7).
 *
 * Before each electoral silence window the app must be replaced by its « scrutin » build — the
 * one whose HTML holds neither a question nor a word of the game. Nothing on the site can
 * deploy it: it is a gesture of the editor, in a terminal. This script only says when it is due.
 *
 *   npx tsx scripts/scrutin-reminder.ts [--now 2027-04-12T06:00:00Z]
 *
 * Exit 0, and nothing printed: no window within REMIND_DAYS days. Exit 3: one is near, or
 * open — the title of the reminder on the first line, then its text. The scheduled workflow
 * (.github/workflows/watch.yml) opens one issue per window from it.
 *
 * What it is not: a guard. GitHub suspends the scheduled workflows of a repository left sixty
 * days without activity, and an issue is read when it is read. The guards are the page itself
 * (src/lib/silence-guard.ts), the Worker, and scripts/deploy.ts, which from the day before a
 * window takes nothing but what closes.
 */
import { SILENCE_APPROACH_MS } from './build-mode.js';
import { silenceWindows, type SilenceWindow } from '../src/lib/silence.js';

/** How long before a window the reminder starts: time to read it, and a weekend to spare. */
export const REMIND_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface Reminder {
  /** One per window, and stable: the workflow looks for it before opening a second issue. */
  title: string;
  body: string;
}

const paris = (date: Date): string =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);

/** The reminder due at `now`, or null: no window opens within REMIND_DAYS days, none is open. */
export function reminderAt(
  now: Date,
  windows: readonly SilenceWindow[] = silenceWindows(),
): Reminder | null {
  const due = windows.find(
    (w) =>
      now.getTime() >= w.startUtc.getTime() - REMIND_DAYS * DAY_MS &&
      now.getTime() < w.endUtc.getTime(),
  );
  if (due === undefined) return null;
  const closes = new Date(due.startUtc.getTime() - SILENCE_APPROACH_MS);
  // The day the window opens, as the editor's calendar writes it: in Paris.
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(due.startUtc);
  return {
    title: `[L49 ${day}] Déployer la build « scrutin » avant la fenêtre de silence`,
    body: [
      `Une fenêtre de silence électoral (L49) s'ouvre le ${paris(due.startUtc)} et se ferme le ${paris(due.endUtc)}, heure de Paris.`,
      '',
      "À faire dans un terminal **avant l'ouverture** :",
      '',
      '    npm run build:scrutin && npm run deploy',
      '',
      `Cette build se déploie à toute heure. Toute autre build de l'app est refusée par \`npm run deploy\` dès le ${paris(closes)} et jusqu'à la fermeture : une correction de dernière minute ne remplace pas la build « scrutin ».`,
      '',
      'Après la fermeture :',
      '',
      '    npm run build && npm run deploy',
      '',
      'La build « scrutin » ne montre ni question ni jeu ; la recherche et la lecture restent (D16.16). Fiche 7 du runbook, `docs/discovery/09-architecture.md` §9.',
      '',
      "Ce rappel ne déploie rien et ne remplace pas le calendrier : GitHub suspend les tâches planifiées d'un dépôt resté soixante jours sans activité.",
    ].join('\n'),
  };
}

if (process.argv[1] !== undefined && /scrutin-reminder\.ts$/.test(process.argv[1])) {
  const at = process.argv.indexOf('--now');
  const now = at === -1 ? new Date() : new Date(process.argv[at + 1] ?? '');
  if (Number.isNaN(now.getTime())) throw new Error('--now takes a date');
  const reminder = reminderAt(now);
  if (reminder !== null) {
    console.log(`${reminder.title}\n\n${reminder.body}`);
    process.exitCode = 3;
  }
}
