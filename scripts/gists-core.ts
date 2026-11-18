/**
 * The sentences written ahead (PLAN-CHAT §3) — what is kept of them on the editor's machine,
 * and what of it may enter the base.
 *
 * One sentence in our own words per measure of the book: written by a model through the bench
 * route, labelled by other models, then READ BY THE EDITOR, one by one. Two files keep the
 * state, both under private/gists/ and both append-only:
 *
 *   runs.jsonl      one line per call of the bench route — which measure, which writer, which
 *                   way of asking, what the control made of it, the sentence when it let one
 *                   through, the labels of the judges, what it cost
 *   verdicts.jsonl  the editor's verdicts — « read », with the sentence kept, or « link-only »;
 *                   the last line for a measure wins
 *
 * Since the editor's mandate of 14/11/2026 (D16.57, D16.58) the session that works for him — an
AI — writes the sentences itself, against the text, and reads them itself. Its verdicts go in
the same file and say so (`by`): a verdict of the session is never passed off as the editor's,
and what the site says of the sentences is held to who read them (D16.59).

They hold sentences of ours, never the text of the book — and they stay private all the same:
 * a sentence about each of the 1,069 measures is a paraphrase of a whole book whose rights are
 * reserved, and none of it leaves this machine before the editor has read it.
 *
 * Every line is pinned to the fingerprint of its measure — the one the public manifest
 * publishes. A measure whose text moved since has no sentence and no verdict any more: it is
 * written, and read, again. A sub-measure is read under the measure it details, so the
 * fingerprint of that measure is pinned with its own. And a verdict holds only while the
 * sentence it keeps still passes the control: the control moves too (`stands`).
 *
 * Shared by the tool (scripts/gists-2026.ts) and by the deposit in the base
 * (scripts/seed-ask-2026.ts). No network here, no server, and nothing printed.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { PROPOSITION_ID } from '../src/lib/ask-contract.js';
import { validateAnswer } from '../src/lib/ask-validate.js';
import { MAX_GIST_CHARS, parseGistsResponse } from '../src/lib/chat-contract.js';
import { JUDGE_VERDICTS, type JudgeVerdict } from '../src/worker/prompt.js';
import type { Manifest } from './aec26-types.js';

export const GISTS_DIR = 'private/gists';
export const RUNS_PATH = `${GISTS_DIR}/runs.jsonl`;
export const VERDICTS_PATH = `${GISTS_DIR}/verdicts.jsonl`;
export const ASK_CONFIG_PATH = 'data/2026/ask.json';

/** The threshold of the control the site runs with (data/2026/ask.json): the bench's, not ours. */
export function readMinOverlap(path: string = ASK_CONFIG_PATH): number {
  const file = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
  const value = file['min_overlap'];
  if (typeof value !== 'number' || !(value >= 0 && value <= 1)) {
    throw new Error(`${path}: "min_overlap" is not a share between 0 and 1`);
  }
  return value;
}

// ---------------------------------------------------------------------------------------------
// The measures, as the public manifest names them
// ---------------------------------------------------------------------------------------------

export type MeasureKind = 'key_measure' | 'measure' | 'sub_measure';

export interface Measure {
  id: string;
  kind: MeasureKind;
  sectionId: string;
  /** The fingerprint the manifest publishes of its text. */
  sha256: string;
  /** For a sub-measure, the fingerprint of the measure it details; null otherwise. */
  leadSha256: string | null;
}

/** The measures of the book, in its order: every item of a section that is not prose. */
export function measuresOf(manifest: Manifest): Measure[] {
  const out: Measure[] = [];
  for (const section of manifest.sections) {
    const published = new Map(section.items.map((item) => [item.id, item.sha256]));
    for (const item of section.items) {
      const { kind } = item;
      if (kind !== 'key_measure' && kind !== 'measure' && kind !== 'sub_measure') continue;
      let leadSha256: string | null = null;
      if (kind === 'sub_measure') {
        const lead = item.parent === undefined ? undefined : published.get(item.parent);
        if (lead === undefined) throw new Error(`${item.id}: a sub-measure under no measure`);
        leadSha256 = lead;
      }
      out.push({ id: item.id, kind, sectionId: section.id, sha256: item.sha256, leadSha256 });
    }
  }
  return out;
}

/**
 * The order of the work, for writing and for reading alike: the key measures first — one per
 * section, what a visitor meets first — then the others, each group in the order of the book.
 */
export function writeOrder(measures: readonly Measure[]): Measure[] {
  return [
    ...measures.filter((measure) => measure.kind === 'key_measure'),
    ...measures.filter((measure) => measure.kind !== 'key_measure'),
  ];
}

/** What a line was written against: the measure, and for a sub-measure the one above it. */
export interface Pin {
  measure_sha256: string;
  lead_sha256?: string;
}

export function pinOf(measure: Measure): Pin {
  return measure.leadSha256 === null
    ? { measure_sha256: measure.sha256 }
    : { measure_sha256: measure.sha256, lead_sha256: measure.leadSha256 };
}

/** True when a line still stands on the measure as the manifest publishes it today. */
export function pinned(line: Pin, measure: Measure): boolean {
  return (
    line.measure_sha256 === measure.sha256 &&
    (measure.leadSha256 === null || line.lead_sha256 === measure.leadSha256)
  );
}

// ---------------------------------------------------------------------------------------------
// The two files
// ---------------------------------------------------------------------------------------------

/** What one judge said of a sentence. */
export interface JudgeLabel {
  model: string;
  /** The label — or null: it gave none we know, or did not answer. */
  verdict: JudgeVerdict | null;
  /** False when the judge did not answer at all: its label is still to be asked for. */
  answered: boolean;
}

/** One call of the bench route, as it came back. */
export interface RunLine extends Pin {
  /** When it came back, ISO 8601, UTC. */
  at: string;
  id: string;
  /** A key of src/worker/models.ts. */
  writer: string;
  /** The way the sentence was asked for (src/worker/prompt.ts, `systemGist`). */
  variant: number;
  /** False when the model did not answer: the call is to be made again. */
  ran: boolean;
  /** True when the control let one sentence through. */
  passed: boolean;
  /** The rule that refused it; null when it passed, or when nothing ran. */
  rule: string | null;
  /** The sentence the control let through — the model's words, never the book's. */
  text: string | null;
  judges: JudgeLabel[];
  /** Neurons counted against the budget: what was billed, not what the cache served. */
  neurons: number;
  /** True when the gateway served the writer's answer from its cache. */
  cached: boolean;
  ms: number | null;
}

/** The writer of a sentence the editor wrote or corrected himself. */
export const EDITOR = 'editor';

/**
 * The session that works for the editor on his machine: an AI. Under his mandate of 14/11/2026
 * (D16.57, D16.58) it writes a sentence for each measure, with the text of the book before it,
 * and reads each one again. `writer` of a sentence it wrote; `by` of a verdict it gave.
 */
export const SESSION = 'session';

/** Who gave a verdict: the editor, or the session that works for him. */
export type Reader = typeof EDITOR | typeof SESSION;

/** One verdict — the editor's, or the session's when the line says so. */
export interface VerdictLine extends Pin {
  id: string;
  /** `read`: this sentence is faithful, and kept. `link-only`: no sentence, the link alone. */
  verdict: 'read' | 'link-only';
  /** Who wrote the sentence kept: a key of the models, `editor` or `session`. */
  writer: string | null;
  text: string | null;
  /** The day it was read, YYYY-MM-DD (UTC). */
  read_on: string;
  /** For a correction, the writer whose sentence was corrected. */
  from?: string;
  /**
   * Who read. Absent: the editor — every line the reading desk writes. `session`: the AI, and
   * nobody else. The site may say « read by the editor » of no sentence that carries it.
   */
  by?: typeof SESSION;
}

/** Who gave this verdict. */
export const readerOf = (line: VerdictLine): Reader => line.by ?? EDITOR;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const SHA256 = /^[0-9a-f]{64}$/;
export const DAY = /^\d{4}-\d{2}-\d{2}$/;
/**
 * A name of ours — a key of the models, `editor`, a rule of the control — and never a sentence.
 * Every field of a line but `text` is an identifier, a name or a number: the tools print them,
 * so a line where one of them could hold words is not a line of these files.
 */
const NAME = /^[a-z0-9][a-z0-9.-]{0,39}$/;
const isName = (value: unknown): value is string => typeof value === 'string' && NAME.test(value);
const isMeasureId = (value: unknown): value is string =>
  typeof value === 'string' && PROPOSITION_ID.test(value);

function readPin(value: Record<string, unknown>): Pin | null {
  const { measure_sha256: own, lead_sha256: lead } = value;
  if (typeof own !== 'string' || !SHA256.test(own)) return null;
  if (lead === undefined) return { measure_sha256: own };
  if (typeof lead !== 'string' || !SHA256.test(lead)) return null;
  return { measure_sha256: own, lead_sha256: lead };
}

function readJudge(value: unknown): JudgeLabel | null {
  if (!isRecord(value)) return null;
  const { model, verdict, answered } = value;
  if (!isName(model) || typeof answered !== 'boolean') return null;
  const label = JUDGE_VERDICTS.find((known) => known === verdict) ?? null;
  if (verdict !== null && label === null) return null;
  return { model, verdict: label, answered };
}

/** A line of runs.jsonl — or null when it is not one. */
export function parseRunLine(value: unknown): RunLine | null {
  if (!isRecord(value)) return null;
  const pin = readPin(value);
  const { at, id, writer, variant, ran, passed, rule, text, judges, neurons, cached, ms } = value;
  if (pin === null || typeof at !== 'string' || !isMeasureId(id)) return null;
  if (!isName(writer) || typeof variant !== 'number') return null;
  if (typeof ran !== 'boolean' || typeof passed !== 'boolean' || typeof cached !== 'boolean') {
    return null;
  }
  if (rule !== null && !isName(rule)) return null;
  if (text !== null && typeof text !== 'string') return null;
  if (typeof neurons !== 'number' || (ms !== null && typeof ms !== 'number')) return null;
  if (!Array.isArray(judges) || (passed && (text === null || text === ''))) return null;
  const labels: JudgeLabel[] = [];
  for (const judge of judges) {
    const label = readJudge(judge);
    if (label === null) return null;
    labels.push(label);
  }
  return {
    at,
    id,
    ...pin,
    writer,
    variant,
    ran,
    passed,
    rule,
    text,
    judges: labels,
    neurons,
    cached,
    ms,
  };
}

/** A line of verdicts.jsonl — or null when it is not one. */
export function parseVerdictLine(value: unknown): VerdictLine | null {
  if (!isRecord(value)) return null;
  const pin = readPin(value);
  const { id, verdict, read_on: readOn, from, by } = value;
  const writer = value['writer'] ?? null;
  const text = value['text'] ?? null;
  if (pin === null || !isMeasureId(id)) return null;
  if (typeof readOn !== 'string' || !DAY.test(readOn)) return null;
  if (from !== undefined && !isName(from)) return null;
  // One reader is named, and no other: a line that names anyone else is not a line of this file.
  if (by !== undefined && by !== SESSION) return null;
  const origin: { from?: string; by?: typeof SESSION } = {
    ...(from === undefined ? {} : { from }),
    ...(by === undefined ? {} : { by: SESSION }),
  };
  if (verdict === 'link-only') {
    if (writer !== null || text !== null) return null;
    return { id, verdict, writer: null, text: null, read_on: readOn, ...pin, ...origin };
  }
  if (verdict !== 'read' || !isName(writer)) return null;
  if (typeof text !== 'string' || text.trim() === '') return null;
  return { id, verdict, writer, text, read_on: readOn, ...pin, ...origin };
}

/**
 * The lines of one of the two files, in the order they were written. A line that does not read
 * stops everything — a verdict dropped in silence would be a sentence nobody knows was read —
 * except a last line cut short: a write still under way is not a line yet.
 */
export function readLines<T>(path: string, parse: (value: unknown) => T | null): T[] {
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf8');
  const lines = raw.split('\n');
  const out: T[] = [];
  lines.forEach((line, index) => {
    if (line.trim() === '') return;
    let value: unknown;
    try {
      value = JSON.parse(line);
    } catch {
      if (index === lines.length - 1) return;
      throw new Error(`${path}: line ${String(index + 1)} is not JSON`);
    }
    const parsed = parse(value);
    if (parsed === null) {
      throw new Error(`${path}: line ${String(index + 1)} is not a line of this file`);
    }
    out.push(parsed);
  });
  return out;
}

export const readRuns = (path: string = RUNS_PATH): RunLine[] => readLines(path, parseRunLine);
export const readVerdicts = (path: string = VERDICTS_PATH): VerdictLine[] =>
  readLines(path, parseVerdictLine);

/** Adds one line at the end of a file, creating its directory the first time. */
export function appendLine(path: string, line: RunLine | VerdictLine): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify(line)}\n`);
}

/** The editor's verdict on each measure: the file only grows, and its last line wins. */
export function lastVerdicts(lines: readonly VerdictLine[]): Map<string, VerdictLine> {
  const out = new Map<string, VerdictLine>();
  for (const line of lines) out.set(line.id, line);
  return out;
}

// ---------------------------------------------------------------------------------------------
// The control of one sentence, and what may enter the base
// ---------------------------------------------------------------------------------------------

/** A measure as the Worker shows it to a model: a sub-measure under the measure it details. */
export const shownText = (text: string, lead: string): string =>
  lead === '' ? text : `${lead} ${text}`;

/**
 * Why the page would not show a sentence the Worker handed it — `chars`: longer than a read
 * sentence may be; `line`: on two lines, or holding a character nobody sees — or null when it
 * would. The page reads an answer strictly (src/lib/chat-contract.ts, `parseGistsResponse`):
 * ONE sentence it refuses makes it drop the whole answer, the other sentences with it, and say
 * nothing. So what the page would refuse must never enter the base — and the page's own reader
 * is asked, not a copy of its rules.
 */
export function unservable(id: string, text: string): 'chars' | 'line' | null {
  if (text.length > MAX_GIST_CHARS) return 'chars';
  const answer = { kind: 'gists', corpus: '0'.repeat(16), gists: [{ id, text }], ai: false };
  return parseGistsResponse(answer) === null ? 'line' : null;
}

export type GistControl =
  /** The sentence as the control returns it: one spelling of spaces and apostrophes. */
  { ok: true; text: string } | { ok: false; rule: string };

/**
 * The control, as it stands today, of one sentence about one measure: the control of a written
 * answer (src/lib/ask-validate.ts) with that measure as the only candidate — then the reader of
 * the page, which must take what the base will hand out. `shown` is the text of the measure as
 * a model reads it — this runs only where the book is. The rule that refuses is named, and
 * nothing else is said: a detail could quote the sentence.
 */
export function controlGist(
  id: string,
  sentence: string,
  shown: string,
  minOverlap: number,
): GistControl {
  const verdict = validateAnswer(
    { phrases: [{ texte: sentence, ids: [id] }] },
    [{ id, text: shown }],
    { minOverlap },
  );
  if (verdict.kind !== 'answer') {
    return {
      ok: false,
      rule: verdict.kind === 'select' ? (verdict.refusal?.rule ?? 'shape') : 'shape',
    };
  }
  const [only] = verdict.sentences;
  if (only === undefined || verdict.sentences.length !== 1) return { ok: false, rule: 'count' };
  const refused = unservable(id, only.text);
  return refused === null ? { ok: true, text: only.text } : { ok: false, rule: refused };
}

/**
 * The control of today, asked of a sentence that was kept another day: the rule that refuses
 * it now, or null. The control moves — a rule is added, a threshold is fixed by a bench — and a
 * sentence read under yesterday's control is not thereby fit for today's.
 */
export type Recheck = (measure: Measure, sentence: string) => string | null;

/** The recheck of the machine that holds the book: `texts` are the measures as a model reads them. */
export function recheckWith(texts: ReadonlyMap<string, string>, minOverlap: number): Recheck {
  return (measure, sentence) => {
    const shown = texts.get(measure.id);
    if (shown === undefined) return 'text';
    const control = controlGist(measure.id, sentence, shown, minOverlap);
    return control.ok ? null : control.rule;
  };
}

/**
 * True when a verdict still holds: it was given on the measure as it is published today, and —
 * where that can be checked — the sentence it keeps still passes the control. A verdict that
 * does not hold is no verdict: the measure is to be read again.
 */
export function stands(verdict: VerdictLine, measure: Measure, recheck?: Recheck): boolean {
  if (!pinned(verdict, measure)) return false;
  if (verdict.verdict === 'link-only' || verdict.text === null || recheck === undefined)
    return true;
  return recheck(measure, verdict.text) === null;
}

/** A row of the table `gists`, with the pin of a sub-measure's lead, which stays here. */
export interface GistRow extends Pin {
  id: string;
  text: string;
  read_on: string;
}

export interface Validated {
  /** The sentences the editor read and kept, in the order of the book. */
  rows: GistRow[];
  /** Measures whose verdict is « link only ». */
  linkOnly: number;
  /** Measures whose verdict was given on another state of their text: to be read again. */
  stale: string[];
  /** Measures whose kept sentence the control refuses today: to be read again, too. */
  refused: string[];
  /** Measures the editor has not ruled on. */
  waiting: number;
  /** Verdicts that name no measure of the book. */
  orphans: string[];
  /** Of the verdicts that hold — sentences kept and links alone — those the session gave. */
  bySession: number;
}

/**
 * Who read what the base would receive: the editor, the session that works for him, or both —
 * null when no verdict holds. data/2026/ask.json records it with the deposit (`gists.read_by`),
 * and the label of the sentences is held to it (scripts/check-strings.test.ts).
 */
export function readBy(set: Validated): Reader | 'both' | null {
  const held = set.rows.length + set.linkOnly;
  if (held === 0) return null;
  if (set.bySession === 0) return EDITOR;
  return set.bySession === held ? SESSION : 'both';
}

/**
 * What the verdicts allow into the base today — and what they leave out, counted. A verdict
 * that no longer holds leaves its measure out and keeps nothing else back: the sentences that
 * still stand can be deposited while the others are read again.
 */
export function validated(
  measures: readonly Measure[],
  verdicts: ReadonlyMap<string, VerdictLine>,
  recheck?: Recheck,
): Validated {
  const out: Validated = {
    rows: [],
    linkOnly: 0,
    stale: [],
    refused: [],
    waiting: 0,
    orphans: [],
    bySession: 0,
  };
  const known = new Set(measures.map((measure) => measure.id));
  out.orphans = [...verdicts.keys()].filter((id) => !known.has(id));
  for (const measure of measures) {
    const verdict = verdicts.get(measure.id);
    if (verdict === undefined) out.waiting += 1;
    else if (!pinned(verdict, measure)) out.stale.push(measure.id);
    else if (verdict.verdict === 'link-only' || verdict.text === null) {
      out.linkOnly += 1;
      if (readerOf(verdict) === SESSION) out.bySession += 1;
    } else if (!stands(verdict, measure, recheck)) out.refused.push(measure.id);
    else {
      if (readerOf(verdict) === SESSION) out.bySession += 1;
      // The pin of the verdict itself, not today's: the deposit checks it once more.
      const { measure_sha256, lead_sha256 } = verdict;
      out.rows.push({
        id: measure.id,
        text: verdict.text,
        read_on: verdict.read_on,
        measure_sha256,
        ...(lead_sha256 === undefined ? {} : { lead_sha256 }),
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// The sentences of the game (D19.2; docs/discovery/PLAN-JEU-DABORD.md, lot 4)
// ---------------------------------------------------------------------------------------------

/** One sentence of the game, as data/2026/game-gists.json holds it (src/lib/game-gists.ts). */
export interface GameGistRow {
  id: string;
  sha256: string;
  lead_sha256?: string;
  text: string;
}

export interface GameGistsDraft {
  /** In the order of the list: one sentence per word whose measure has one. */
  gists: GameGistRow[];
  /** Words whose measure has no sentence in the deposit (« link only »): their card keeps its link. */
  without: string[];
  /** Words whose measure is not the one the deposit's sentence was read against. */
  moved: string[];
}

/**
 * The sentences of the game: those of the deposit — as they are, not a character changed — for
 * the measures the words of the list are pinned to. Pure: rows in, rows out. A word whose
 * measure has no sentence gets none; a sentence read against another state of its measure is
 * left out and named, like everywhere else.
 */
export function gameGistsFrom(
  rows: readonly GistRow[],
  words: readonly { id: string; pin: { id: string; sha256: string } }[],
): GameGistsDraft {
  const byMeasure = new Map(rows.map((row) => [row.id, row]));
  const out: GameGistsDraft = { gists: [], without: [], moved: [] };
  const taken = new Set<string>();
  for (const word of words) {
    const row = byMeasure.get(word.pin.id);
    if (row === undefined) out.without.push(word.id);
    else if (row.measure_sha256 !== word.pin.sha256) out.moved.push(word.id);
    else if (!taken.has(row.id)) {
      taken.add(row.id);
      out.gists.push({
        id: row.id,
        sha256: row.measure_sha256,
        ...(row.lead_sha256 === undefined ? {} : { lead_sha256: row.lead_sha256 }),
        text: row.text,
      });
    }
  }
  return out;
}
