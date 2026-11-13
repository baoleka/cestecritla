/**
 * The launch, as data and a rule rather than as a habit (D15.15, D16.18).
 *
 * "The apex serves the holding page until launch" used to be a constant in the deploy script:
 * launching meant editing code on the one day when everything else also wants attention. The
 * decision is a file the editor fills in — data/launch.json — and the conditions it has to meet
 * are written here, tested, and listed by name when one is missing.
 *
 * There is no launch date any more (D16.19): the plan is an order of work, and the app replaces
 * the holding page the day nothing below is missing and the editor says so. So that this is the
 * ONLY thing left to do that day, every remaining gesture is a named blocker:
 *
 *   - gestures that leave no artefact (a declaration sent, a dashboard checked, phones tried) are
 *     dated in data/launch.json;
 *   - facts about a file live IN that file, with a fingerprint, so that editing the file after it
 *     was validated un-validates it: the answer mode and its bench (data/2026/ask.json), the words
 *     of the game (data/2026/game-words.json), the turtle (design/mascot/validation.json), and the
 *     privacy page (the fingerprint of its strings, kept here because the page has no data file).
 *
 * Going back to "holding" is never blocked by any of this: it is the withdrawal gesture of
 * runbook sheet 9 (D14.10) — build the holding site, deploy.
 *
 *   npx tsx scripts/launch.ts        lists what is still missing; exits 1 while something is
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { citationPolicyValidated } from './build-mode.js';

export const LAUNCH_PATH = 'data/launch.json';
export const STRINGS_PATH = 'design/strings.json';
export const MANIFEST_PATH = 'data/2026/manifest.json';
export const ASK_PATH = 'data/2026/ask.json';
export const WORDS_PATH = 'data/2026/game-words.json';
export const TURTLE_SVG_PATH = 'design/mascot/tortue.svg';
export const TURTLE_VALIDATION_PATH = 'design/mascot/validation.json';

/** Gestures of the editor that leave no file behind: each is a date, or null while it is due. */
export interface DatedGestures {
  /** The LCEN declaration was sent to the host and its acknowledgement archived (P0.5). */
  lcen_declared_on: string | null;
  /** A test message to the contact address was received (P0.8). */
  contact_mailbox_ready_on: string | null;
  /** The two texts the LFI charter makes its use conditional on were read and archived (P0.2). */
  charter_texts_read_on: string | null;
  /** The three legal readings of P0.3, among them the CNIL guide on political communication. */
  legal_readings_done_on: string | null;
  /** How the data controller is named on the site (P0.4, GDPR art. 13). */
  controller_decided_on: string | null;
  /** Cloudflare dashboard: gateway logs off, Turnstile widget for both hosts, no payment method. */
  dashboard_checked_on: string | null;
  /** The preview was used on real phones, in-app browsers included. */
  phones_tried_on: string | null;
  /** The seven personas played the preview (D14.8); what they say stays a hypothesis (D14.11). */
  personas_session_on: string | null;
  /** The four attackers of September went through every screen, and nothing blocking remains. */
  hostile_review_on: string | null;
  /** The editor confirmed the "lait-fraise" line once shown where the reference comes from (D16.20). */
  easter_confirmed_on: string | null;
}

export interface LaunchFile extends DatedGestures {
  apex: 'holding' | 'app';
  /** The privacy page was re-read as built: the fingerprint is that of its strings on that day. */
  privacy_page: { reviewed_on: string | null; sha256: string | null };
  note_fr: string;
}

export interface LaunchInputs {
  launch: LaunchFile;
  policyValidated: boolean;
  /** Editorial entries whose review is still pending, as `riposte:rip-01`, `mot:ecocide`. */
  pendingReviews: readonly string[];
  /** Fingerprint of the privacy strings as they stand today. */
  privacyHash: string;
  /** What the self-validating files still lack (`artefactBlockers`): empty when all are in place. */
  artefacts: readonly string[];
}

const isDate = (value: unknown): value is string =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);

/** In the order the editor can act on them. The wording of the first two is tested by name. */
const DATED: readonly (readonly [keyof DatedGestures, string])[] = [
  ['lcen_declared_on', 'the LCEN declaration to the host is not recorded (P0.5)'],
  ['contact_mailbox_ready_on', 'the contact address has not been tested (P0.8)'],
  [
    'charter_texts_read_on',
    'the two texts the LFI charter refers to are not read and archived (P0.2)',
  ],
  ['legal_readings_done_on', 'the three legal readings are not recorded (P0.3)'],
  ['controller_decided_on', 'how the data controller is named is not decided (P0.4)'],
  [
    'dashboard_checked_on',
    'the Cloudflare dashboard is not checked: gateway logs off, Turnstile widget, no payment method',
  ],
  ['phones_tried_on', 'the preview has not been tried on real phones'],
  ['personas_session_on', 'the persona session has not been played (D14.8)'],
  ['hostile_review_on', 'the hostile review of the screens is not recorded'],
  ['easter_confirmed_on', 'the lait-fraise line is not confirmed by the editor (D16.20)'],
];

/** Why the app may not replace the holding page yet — empty when it may. */
export function launchBlockers(inputs: LaunchInputs): string[] {
  const out: string[] = [];
  if (inputs.launch.apex !== 'app') {
    out.push(
      `the launch has not been decided: ${LAUNCH_PATH} says the apex serves the holding page (D15.15)`,
    );
  }
  if (!inputs.policyValidated) {
    out.push('the citation policy has not been validated (D15.7): data/2026/exposure-policy.json');
  }
  for (const [field, reason] of DATED) {
    if (!isDate(inputs.launch[field])) out.push(`${reason}: ${field}`);
  }
  if (inputs.pendingReviews.length > 0) {
    out.push(
      `${String(inputs.pendingReviews.length)} of our own texts have not been re-read (D0.27): ` +
        `${inputs.pendingReviews.slice(0, 6).join(', ')}${inputs.pendingReviews.length > 6 ? ', …' : ''}`,
    );
  }
  const privacy = inputs.launch.privacy_page;
  if (!isDate(privacy.reviewed_on)) {
    out.push('the privacy page has not been re-read as built: privacy_page.reviewed_on');
  } else if (privacy.sha256 !== inputs.privacyHash) {
    out.push('the privacy page changed after it was re-read: privacy_page.sha256 is not today’s');
  }
  out.push(...inputs.artefacts);
  return out;
}

/** SHA-256 of a value written the same way whatever the order of its keys. */
export function canonicalHash(value: unknown): string {
  const write = (v: unknown): string => {
    if (Array.isArray(v)) return `[${v.map(write).join(',')}]`;
    if (typeof v === 'object' && v !== null) {
      const entries = Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${write(x)}`).join(',')}}`;
    }
    // `undefined` has no JSON form: it is written as null, like a missing array slot.
    return v === undefined ? 'null' : JSON.stringify(v);
  };
  return createHash('sha256').update(write(value)).digest('hex');
}

/** Fingerprint of everything the privacy page can say: the `privacy.*` strings of the kit. */
export function privacyStringsHash(strings: Record<string, unknown>): string {
  const own = Object.fromEntries(
    Object.entries(strings).filter(([key]) => key.startsWith('privacy.')),
  );
  return canonicalHash(own);
}

type Json = Record<string, unknown>;

/** Reads a JSON object, or says why it could not: these readers never throw (the withdrawal). */
function readObject(path: string): Json | null {
  if (!existsSync(path)) return null;
  try {
    const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Json)
      : null;
  } catch {
    return null;
  }
}

const field = (object: unknown, key: string): unknown =>
  typeof object === 'object' && object !== null ? (object as Json)[key] : undefined;

/**
 * What the files that carry their own validation still lack. Each line names the file and the
 * lot of the plan that produces it, so that the gate reads as a to-do list long before launch.
 */
export function artefactBlockers(root = '.'): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const out: string[] = [];
  const corpus = field(field(readObject(at(MANIFEST_PATH)), 'meta'), 'corpus_version');

  // How a question is answered: written answer, selection only, or search only (D16.4).
  const ask = readObject(at(ASK_PATH));
  if (ask === null) {
    out.push(`how a question is answered is not decided: ${ASK_PATH} is missing (lot I6)`);
  } else if (ask.mode !== 'answer' && ask.mode !== 'select' && ask.mode !== 'off') {
    out.push(`${ASK_PATH}: mode must be "answer", "select" or "off"`);
  } else if (ask.mode !== 'off') {
    if (typeof field(ask.bench, 'sha256') !== 'string' || !isDate(field(ask.bench, 'run_on'))) {
      out.push(`${ASK_PATH}: the mode "${ask.mode}" rests on no recorded bench (lot I5)`);
    }
    if (field(ask.database, 'corpus_version') !== corpus) {
      out.push(
        `${ASK_PATH}: the private database is not at the corpus version of the manifest (lot I3)`,
      );
    }
    if (!isDate(ask.answers_read_on)) {
      out.push(`${ASK_PATH}: the editor has not read the sample of answers: answers_read_on`);
    }
    if (!isDate(ask.model_confirmed_on)) {
      out.push(
        `${ASK_PATH}: the editor has not confirmed the model the bench chose: model_confirmed_on`,
      );
    }
  }

  // The words of the game: a new kind of extract, validated with its measured share (D16.15).
  const words = readObject(at(WORDS_PATH));
  if (words === null) {
    out.push(`the words of the game are not written: ${WORDS_PATH} is missing (lot J3)`);
  } else {
    const list = canonicalHash(words.words);
    const meta = words.meta;
    if (!isDate(field(meta, 'pool_reviewed_on'))) {
      out.push(
        `${WORDS_PATH}: the sections the game draws from are not reviewed: meta.pool_reviewed_on`,
      );
    }
    if (!isDate(field(field(meta, 'validated'), 'on'))) {
      out.push(`${WORDS_PATH}: the list is not validated by the editor: meta.validated.on`);
    } else if (field(field(meta, 'validated'), 'list_sha256') !== list) {
      out.push(`${WORDS_PATH}: the list changed after it was validated`);
    }
    const attested = field(meta, 'attested');
    if (field(attested, 'list_sha256') !== list || field(attested, 'corpus_version') !== corpus) {
      out.push(`${WORDS_PATH}: the local check has not attested this list on this corpus (lot J2)`);
    }
  }

  // The turtle: validated on a sheet, and bound to the drawing it was validated on (D16.11).
  const turtle = readObject(at(TURTLE_VALIDATION_PATH));
  if (turtle === null || !existsSync(at(TURTLE_SVG_PATH))) {
    out.push(`the turtle is not drawn or not validated: ${TURTLE_VALIDATION_PATH} (lot K3)`);
  } else {
    const drawing = createHash('sha256')
      .update(readFileSync(at(TURTLE_SVG_PATH)))
      .digest('hex');
    if (!isDate(turtle.validated_on)) {
      out.push(`${TURTLE_VALIDATION_PATH}: the sheet is not dated by the editor: validated_on`);
    } else if (turtle.svg_sha256 !== drawing) {
      out.push(`${TURTLE_VALIDATION_PATH}: the drawing changed after the sheet was validated`);
    }
    if (!isDate(turtle.same_character_asked_on)) {
      out.push(
        `${TURTLE_VALIDATION_PATH}: "same character?" has not been asked: same_character_asked_on`,
      );
    }
  }
  return out;
}

interface Reviewed {
  entries: { id: string; review: { status: string } }[];
}

export function pendingReviews(): string[] {
  const out: string[] = [];
  for (const [path, prefix] of [
    ['data/2026/riposte.json', 'riposte'],
    ['data/2026/glossary.json', 'mot'],
  ] as const) {
    if (!existsSync(path)) continue;
    const file = JSON.parse(readFileSync(path, 'utf8')) as Reviewed;
    for (const entry of file.entries) {
      if (entry.review.status !== 'reviewed') out.push(`${prefix}:${entry.id}`);
    }
  }
  return out;
}

export function readLaunchInputs(): LaunchInputs {
  return {
    launch: JSON.parse(readFileSync(LAUNCH_PATH, 'utf8')) as LaunchFile,
    policyValidated: citationPolicyValidated(),
    pendingReviews: pendingReviews(),
    privacyHash: privacyStringsHash(readObject(STRINGS_PATH) ?? {}),
    artefacts: artefactBlockers(),
  };
}

function main(): void {
  const blockers = launchBlockers(readLaunchInputs());
  if (blockers.length === 0) {
    console.log(
      'launch: nothing is missing — `npm run build && npm run deploy` puts the app on the apex',
    );
    return;
  }
  const decision = blockers.filter((line) => line.startsWith('the launch has not been decided'));
  const rest = blockers.filter((line) => !line.startsWith('the launch has not been decided'));
  console.log(`launch: ${String(rest.length)} thing(s) missing before the decision itself`);
  for (const line of rest) console.log(`  - ${line}`);
  for (const line of decision) console.log(`  · ${line}`);
  process.exitCode = 1;
}

if (process.argv[1] !== undefined && /launch\.ts$/.test(process.argv[1])) main();
