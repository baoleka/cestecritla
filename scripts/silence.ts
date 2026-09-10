/**
 * Electoral silence (Code électoral art. L49, decision D0.24) and the "effective date" used by every
 * deterministic daily draw (daily measure, `/defi/` draw of the day, D5.8 rule 7).
 *
 * Legal rule (VÉRIFIÉ, Légifrance read on 2026-09-09):
 *   - L49: "A partir de la veille du scrutin à zéro heure, il est interdit de […] 2° Diffuser ou faire
 *     diffuser par tout moyen de communication au public par voie électronique tout message ayant le
 *     caractère de propagande électorale". No explicit end: the customary reading is the close of the
 *     last metropolitan polling station (20:00 Paris), the same bound loi 77-808 art. 11 spells out
 *     for polls.
 *   - Presidential election 2027 (service-public.gouv.fr, 2026-07-02, decree of convocation pending):
 *     Sunday 18 April and Sunday 2 May 2027; Saturday 17 April and 1 May in Guadeloupe, Martinique,
 *     Guyane, Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin and Polynésie française.
 *
 * Conservative rule chosen (11-conformite.md, D9.7): the freeze opens on the FRIDAY before each round
 * at 00:00 Europe/Paris and closes on the SUNDAY of the round at 20:00 Europe/Paris. Friday 00:00
 * Paris (Thursday 22:00 UTC in April) precedes Friday 00:00 in every overseas territory that votes on
 * Saturday (Polynésie française, UTC−10, is the last one at Friday 10:00 UTC), so a single window covers
 * the "veille" of the Saturday voters and of the Sunday voters.
 *
 * Time-zone handling relies on `Intl.DateTimeFormat` with `timeZone: 'Europe/Paris'` (Node ≥ 20 ships
 * full ICU), so the calendar is written in local Paris dates and the DST rule is never hard-coded.
 *
 * Runtime: this module has no dependency and no I/O; it runs in the Worker, in the browser and in tests.
 */

export type RoundId = 'round1' | 'round2';

export interface ElectionRound {
  readonly id: RoundId;
  /** Metropolitan polling day (Sunday), `YYYY-MM-DD` in Europe/Paris. */
  readonly electionDate: string;
  /** Polling day of the territories that vote on Saturday, `YYYY-MM-DD` (informative; the window already covers it). */
  readonly overseasSaturday: string;
}

export interface ElectionCalendar {
  readonly label: string;
  /** VÉRIFIÉ / PROBABLE flag carried into the accuracy page: the dates are final only with the decree. */
  readonly status: 'VÉRIFIÉ' | 'PROBABLE';
  readonly source: string;
  readonly rounds: readonly ElectionRound[];
  /** Freeze opens this many days before the metropolitan polling day, at 00:00 Paris (2 = Friday for a Sunday vote). */
  readonly freezeStartsDaysBefore: number;
  /** Freeze closes on polling day at this Paris hour (20 = close of the last metropolitan polling station). */
  readonly freezeEndsAtParisHour: number;
}

export interface SilenceWindow {
  readonly id: RoundId;
  readonly startUtc: Date;
  readonly endUtc: Date;
}

export type SilencePhase = 'before' | 'round1' | 'between' | 'round2' | 'after';

export type SilenceOverride = 'auto' | 'on' | 'off';

export interface EffectiveDate {
  /** True while chat, share, draws and daily measure are frozen (reading always stays open, D0.24). */
  readonly silence: boolean;
  /** Where `now` sits in the calendar; `round1` / `round2` mean "inside that freeze window". */
  readonly phase: SilencePhase;
  /** `YYYY-MM-DD` (UTC day) every seeded draw must use: today, or the last day before the freeze while frozen. */
  readonly day: string;
  /** When the current freeze ends (UTC), null outside a freeze. */
  readonly reopenUtc: Date | null;
  /** Start of the next freeze (UTC), null after the last round. */
  readonly nextFreezeUtc: Date | null;
  /** True when "tomorrow's" draw would be identical to today's (freeze ahead): hide "Celle de demain". */
  readonly tomorrowFrozen: boolean;
  /** Which override produced the answer (`auto` = calendar). */
  readonly override: SilenceOverride;
  /**
   * False when no trusted time source was supplied, or when the device clock drifts from it by more than
   * `maxClockDriftMs`. Added 2026-09-10 (red panel T12): with no LLM there is no server answer left to
   * arbitrate the hour, so the only source of time for the L49 freeze is the visitor's phone clock — and
   * the default behaviour of a calendar check is OPEN, not FROZEN. A wrong clock (or one moved on purpose:
   * `tomorrowFrozen` exists precisely because "tomorrow's draw" is a known curiosity) would serve draws and
   * shares inside the window. This flag fails CLOSED.
   */
  readonly clockTrusted: boolean;
  /** Signed drift `now - serverDate` in milliseconds, or null when no trusted time source was supplied. */
  readonly driftMs: number | null;
}

export const PARIS_TZ = 'Europe/Paris';

/** Presidential election 2027 — dates announced on 2026-07-02, to be frozen on the decree of convocation. */
export const PRESIDENTIAL_2027: ElectionCalendar = {
  label: 'Élection présidentielle 2027',
  status: 'PROBABLE',
  source: 'https://www.service-public.gouv.fr/particuliers/actualites/A15053 (lu le 2026-09-09)',
  rounds: [
    { id: 'round1', electionDate: '2027-04-18', overseasSaturday: '2027-04-17' },
    { id: 'round2', electionDate: '2027-05-02', overseasSaturday: '2027-05-01' },
  ],
  freezeStartsDaysBefore: 2,
  freezeEndsAtParisHour: 20,
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Tolerated gap between the device clock and the `Date` header of the last network response (the one served
 * by Static Assets for `flags.json`, so this costs 0 Worker requests). Beyond it the clock is not trusted.
 */
export const MAX_CLOCK_DRIFT_MS = 5 * 60 * 1000;

/**
 * String prefixes that must not be rendered while `silence` is true (D0.24, D9.19).
 * `cta.` was added on 2026-09-10 (red panel T12): the militant calls to action were in none of the four
 * freeze lists of the dossier, and a "Le site officiel de la campagne" button served on polling Sunday is a
 * message of electoral propaganda within the meaning of L49 2° — harder to defend than the reading that
 * stays open, which is a text the reader comes looking for. Reading is never frozen.
 */
export const FROZEN_KEY_PREFIXES: readonly string[] = [
  'chat.',
  'share.',
  'play.',
  'q.',
  'daily.',
  'statcard.',
  'cta.',
];

/** True when a string kit key must be withheld from the render because the L49 freeze is on. */
export function isFrozenKey(key: string, effective: Pick<EffectiveDate, 'silence'>): boolean {
  if (!effective.silence) return false;
  return FROZEN_KEY_PREFIXES.some((prefix) => key.startsWith(prefix));
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: PARIS_TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

/** Offset of Europe/Paris from UTC, in milliseconds, at the given instant. */
export function parisOffsetMs(instant: Date): number {
  const parts = partsFormatter.formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) throw new Error(`Intl part ${type} missing`);
    return Number(part.value);
  };
  const asUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour'),
    read('minute'),
    read('second'),
  );
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock Paris time (`YYYY-MM-DD`, hour, minute) to the UTC instant. Two passes handle the
 * DST offset change; the wall-clock times used by the calendar (00:00 and 20:00) never fall in a gap.
 */
export function parisToUtc(localDate: string, hour = 0, minute = 0): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(localDate);
  if (!match) throw new Error(`Invalid local date: ${localDate}`);
  const [, y, m, d] = match;
  const wall = Date.UTC(Number(y), Number(m) - 1, Number(d), hour, minute, 0);
  let guess = new Date(wall - parisOffsetMs(new Date(wall)));
  guess = new Date(wall - parisOffsetMs(guess));
  return guess;
}

/** Adds whole days to a `YYYY-MM-DD` string (calendar arithmetic, no time zone involved). */
export function addDays(isoDate: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) throw new Error(`Invalid date: ${isoDate}`);
  const [, y, m, d] = match;
  return isoDay(new Date(Date.UTC(Number(y), Number(m) - 1, Number(d) + days)));
}

/** UTC day of an instant, `YYYY-MM-DD`. */
export function isoDay(instant: Date): string {
  return instant.toISOString().slice(0, 10);
}

/** The freeze windows of a calendar, in chronological order, as UTC instants. */
export function silenceWindows(calendar: ElectionCalendar = PRESIDENTIAL_2027): SilenceWindow[] {
  return calendar.rounds.map((round) => ({
    id: round.id,
    startUtc: parisToUtc(addDays(round.electionDate, -calendar.freezeStartsDaysBefore), 0, 0),
    endUtc: parisToUtc(round.electionDate, calendar.freezeEndsAtParisHour, 0),
  }));
}

function windowAt(instant: Date, windows: readonly SilenceWindow[]): SilenceWindow | null {
  const t = instant.getTime();
  return windows.find((w) => t >= w.startUtc.getTime() && t < w.endUtc.getTime()) ?? null;
}

function calendarPhase(instant: Date, windows: readonly SilenceWindow[]): SilencePhase {
  const t = instant.getTime();
  const active = windowAt(instant, windows);
  if (active) return active.id;
  const first = windows[0];
  const last = windows[windows.length - 1];
  if (!first || !last) return 'before';
  if (t < first.startUtc.getTime()) return 'before';
  if (t >= last.endUtc.getTime()) return 'after';
  return 'between';
}

/** Effective draw day for an instant: today (UTC), or the UTC day just before the freeze while frozen. */
function effectiveDayAt(instant: Date, windows: readonly SilenceWindow[]): string {
  const active = windowAt(instant, windows);
  if (!active) return isoDay(instant);
  return isoDay(new Date(active.startUtc.getTime() - 1));
}

/**
 * Single source of truth for L49 (D0.24, D7.10): the client calls it with `new Date()`, the build-time
 * calendar, the `silence_override` read from `public/flags.json` (`auto | on | off`) and the `Date` header
 * of that same response as `serverDate`.
 *
 * `on` freezes immediately (operator decision, e.g. a decree moving a date); `off` never freezes and is the
 * only way to keep the app fully open inside a window — both are logged in `decisions.md` when used, and
 * both are OUR files, so an explicit operator decision still wins over the drift guard.
 *
 * Amended 2026-09-10 (red panel T12, D12.8): the override no longer lives in KV. With no `/api/ask`, the
 * Worker answers no visitor, so a KV flag changes no pixel; `flags.json` is served by Static Assets in
 * `Cache-Control: no-cache` and read at startup, BEFORE the first call to this function.
 */
export function effectiveDate(
  nowUtc: Date,
  options: {
    calendar?: ElectionCalendar;
    override?: SilenceOverride;
    /** `Date` header of the last network response (`flags.json`, served by Static Assets: 0 Worker request). */
    serverDate?: Date | null;
    maxClockDriftMs?: number;
  } = {},
): EffectiveDate {
  const calendar = options.calendar ?? PRESIDENTIAL_2027;
  const override = options.override ?? 'auto';
  if (Number.isNaN(nowUtc.getTime())) throw new Error('effectiveDate: invalid date');
  const serverDate = options.serverDate ?? null;
  if (serverDate !== null && Number.isNaN(serverDate.getTime())) {
    throw new Error('effectiveDate: invalid serverDate');
  }
  const maxDrift = options.maxClockDriftMs ?? MAX_CLOCK_DRIFT_MS;
  const driftMs = serverDate === null ? null : nowUtc.getTime() - serverDate.getTime();
  const clockTrusted = driftMs !== null && Math.abs(driftMs) <= maxDrift;

  const windows = silenceWindows(calendar);
  const phase = calendarPhase(nowUtc, windows);
  const active = windowAt(nowUtc, windows);
  const next = windows.find((w) => w.startUtc.getTime() > nowUtc.getTime()) ?? null;

  // Fail closed: an untrusted clock with a trusted reference is treated as the most restrictive state
  // (frozen, and the draw day pinned to the reference), never as "open because the phone says so".
  const untrusted = driftMs !== null && !clockTrusted;
  const referenceDay = serverDate === null ? null : effectiveDayAt(serverDate, windows);

  const silence =
    override === 'on' ? true : override === 'off' ? false : active !== null || untrusted;
  const day =
    override === 'off'
      ? isoDay(nowUtc)
      : untrusted && referenceDay !== null
        ? referenceDay
        : effectiveDayAt(nowUtc, windows);
  const tomorrow = new Date(nowUtc.getTime() + DAY_MS);
  const tomorrowFrozen =
    override === 'off'
      ? false
      : override === 'on' || untrusted
        ? true
        : effectiveDayAt(tomorrow, windows) === day;

  return {
    silence,
    phase,
    day,
    reopenUtc: override === 'off' ? null : (active?.endUtc ?? null),
    nextFreezeUtc: next?.startUtc ?? null,
    tomorrowFrozen,
    override,
    clockTrusted,
    driftMs,
  };
}

/**
 * Registration deadline for the first round: the sixth Friday before polling day (D9.9).
 * Computed at build time from the calendar, **never written by hand** — the decree of convocation can move
 * the election, and a CTA that sends people to register after the cut-off is the most directly damaging
 * mistake in the dossier (H-CNF-4). `scripts/check-strings.test.ts` fails on any `cta.*` string carrying a year.
 */
export function registrationDeadline(calendar: ElectionCalendar = PRESIDENTIAL_2027): string {
  const round1 = calendar.rounds[0];
  if (!round1) throw new Error('registrationDeadline: calendar has no round');
  let cursor = round1.electionDate;
  // Walk back to the last Friday strictly before polling day, then back five more weeks.
  do {
    cursor = addDays(cursor, -1);
  } while (new Date(`${cursor}T00:00:00Z`).getUTCDay() !== 5);
  return addDays(cursor, -35);
}

/** Paris wall-clock rendering of an instant for the `{reopenTime}` placeholder: "dimanche 18 avril, 20 h". */
export function formatReopenTimeFr(instant: Date): string {
  const formatter = new Intl.DateTimeFormat('fr-FR', {
    timeZone: PARIS_TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: 'numeric',
    hourCycle: 'h23',
  });
  const parts = formatter.formatToParts(instant);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? '';
  const day = get('day') === '1' ? '1er' : get('day');
  return `${get('weekday')} ${day} ${get('month')}, ${get('hour')} h`;
}
