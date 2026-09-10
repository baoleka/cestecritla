/**
 * Beacon contract for POST /api/e — the only server route in v1 and v2 (D13.1).
 *
 * Everything here is a CLOSED enumeration, validated server-side, so a hand-rolled client
 * cannot inject free text (D0.22, §10.3). Nothing counted names an opinion: we count reads
 * and navigation gestures, never an agreement, a game answer or a typed word.
 */

export const EVENTS = [
  'session_start',
  'section_verbatim_view',
  'measure_view',
  'search_run',
  'answer_served',
  'play_start',
  'play_to_read',
  'share_open',
] as const;

export const ENTRY = ['link', 'direct'] as const;
export const SRC = ['wa', 'tg', 'ig', 'qr', 'copy', 'none'] as const;
export const KIND = [
  'measure',
  'section',
  'concept',
  'word',
  'stat',
  'riposte',
  'quiz',
  'challenge',
  'home',
] as const;
export const DEVICE = ['mobile', 'desktop'] as const;
export const APP_VERSION = ['v1', 'v1.1', 'v2', 'v3'] as const;
export const DETAIL = [
  'landing',
  'browse',
  'search',
  'glossary',
  'play',
  'riposte',
  'answer',
  'which_here',
  'guess_inside',
  'search_word',
  'map_89',
  'measure',
  'section',
  'concept',
  'word',
  'quiz',
  'challenge',
  '-',
] as const;
/** `llm` is never emitted while D6.10 holds; the value survives so a reopening needs no migration. */
export const MODE = ['cache', 'extractive', 'llm', '-'] as const;
export const BUCKET = ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', '-'] as const;

export const CHAPTER = [
  'c01',
  'c02',
  'c03',
  'c04',
  'c05',
  'c06',
  'c07',
  'c08',
  'c09',
  'c10',
  'c11',
  'c12',
  'c13',
  'c14',
  'c15',
  'c16',
  'c17',
  'c18',
  'intro',
  'part1',
  'part2',
  'part3',
  'part4',
  '-',
] as const;

export type EventName = (typeof EVENTS)[number];
export type Entry = (typeof ENTRY)[number];
export type Src = (typeof SRC)[number];
export type Kind = (typeof KIND)[number];
export type Device = (typeof DEVICE)[number];
export type AppVersion = (typeof APP_VERSION)[number];
export type Detail = (typeof DETAIL)[number];
export type Mode = (typeof MODE)[number];
export type Bucket = (typeof BUCKET)[number];
export type Chapter = (typeof CHAPTER)[number];

export interface BeaconEvent {
  readonly name: EventName;
  readonly chapter: Chapter;
  readonly detail: Detail;
  readonly mode: Mode;
  readonly bucket: Bucket;
  /** 1 if this is the first occurrence of the event in the session, else 0. */
  readonly first: 0 | 1;
  /** Deduplicated occurrences in the session, capped at 50. */
  readonly count: number;
  /** Seconds since session start, rounded to 5, capped at 600. */
  readonly t: number;
  /** Milliseconds rounded to 50, capped at 8000; 0 outside answer_served / search_run. */
  readonly latency: number;
}

export interface Beacon {
  readonly v: 1;
  readonly session: {
    readonly entry: Entry;
    readonly src: Src;
    readonly kind: Kind;
    readonly device: Device;
    readonly corpus: string;
    readonly app: AppVersion;
  };
  readonly events: readonly BeaconEvent[];
}

/** One beacon per session, at most 512 bytes, sent once at `pagehide`. */
export const MAX_BEACON_BYTES = 512;
export const MAX_EVENTS = 8;

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const oneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] =>
  typeof v === 'string' && (list as readonly string[]).includes(v);

/** Integer in [0, max] and a multiple of `step`. Anything else is a forged beacon. */
const stepped = (v: unknown, step: number, max: number): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max && v % step === 0;

/**
 * Parse and validate. Returns null on anything unexpected — we never repair a beacon,
 * because a repaired count is a number nobody measured.
 */
export function parseBeacon(raw: unknown, buildCorpusVersion: string): Beacon | null {
  if (!isRecord(raw) || raw['v'] !== 1) return null;

  const s = raw['session'];
  if (!isRecord(s)) return null;
  if (!oneOf(ENTRY, s['entry'])) return null;
  if (!oneOf(SRC, s['src'])) return null;
  if (!oneOf(KIND, s['kind'])) return null;
  if (!oneOf(DEVICE, s['device'])) return null;
  if (!oneOf(APP_VERSION, s['app'])) return null;
  if (s['corpus'] !== buildCorpusVersion) return null;

  const evs = raw['events'];
  if (!Array.isArray(evs) || evs.length === 0 || evs.length > MAX_EVENTS) return null;

  const events: BeaconEvent[] = [];
  const seen = new Set<string>();
  for (const e of evs) {
    if (!isRecord(e)) return null;
    if (!oneOf(EVENTS, e['name'])) return null;
    // One point per event name, at most: the Worker writes one row per name present.
    if (seen.has(e['name'])) return null;
    seen.add(e['name']);

    const chapter = e['chapter'] ?? '-';
    const detail = e['detail'] ?? '-';
    const mode = e['mode'] ?? '-';
    const bucket = e['bucket'] ?? '-';
    if (!oneOf(CHAPTER, chapter)) return null;
    if (!oneOf(DETAIL, detail)) return null;
    if (!oneOf(MODE, mode)) return null;
    if (!oneOf(BUCKET, bucket)) return null;

    if (e['first'] !== 0 && e['first'] !== 1) return null;
    const count = e['count'];
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1 || count > 50)
      return null;
    if (!stepped(e['t'], 5, 600)) return null;
    const latency = e['latency'] ?? 0;
    if (!stepped(latency, 50, 8000)) return null;

    events.push({
      name: e['name'],
      chapter,
      detail,
      mode,
      bucket,
      first: e['first'],
      count,
      t: e['t'],
      latency,
    });
  }

  return {
    v: 1,
    session: {
      entry: s['entry'],
      src: s['src'],
      kind: s['kind'],
      device: s['device'],
      corpus: s['corpus'],
      app: s['app'],
    },
    events,
  };
}

/**
 * One Analytics Engine data point per event name, at most 8 per request.
 * `index1` is the event name and nothing else: it is Cloudflare's sampling key, so it must
 * never carry a value derived from the person (§10.2).
 */
export function toDataPoints(b: Beacon): AnalyticsEngineDataPoint[] {
  const { entry, src, kind, device, corpus, app } = b.session;
  return b.events.map((e) => ({
    indexes: [e.name],
    blobs: [entry, src, kind, device, corpus, app, e.chapter, e.detail, e.mode, e.bucket],
    doubles: [1, e.first, e.count, e.t, e.latency],
  }));
}
