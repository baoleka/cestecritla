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
 *     of the game (data/2026/game-words.json), the mascot (design/mascot/v2/validation.json), and
 *     the privacy page (the fingerprint of its strings, kept here because the page has no data
 *     file).
 *
 * Going back to "holding" is never blocked by any of this: it is the withdrawal gesture of
 * runbook sheet 9 (D14.10) — build the holding site, deploy.
 *
 *   npx tsx scripts/launch.ts        lists what is still missing; exits 1 while something is
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { canonicalHash, listFingerprint } from '../src/lib/fingerprint.js';
import { WORD_LINKS_PATH, highlightedWords, wordsFingerprint } from '../src/lib/word-links.js';
import { LOCAL_CHECKS } from '../src/lib/game.js';
import { ROUND } from '../src/lib/game-engine.js';
import { citationPolicyValidated } from './build-mode.js';
import { modeFor } from '../src/lib/ask-mode.js';
import { MASCOT2_VALIDATION_PATH, mascot2Fingerprint } from './mascot2-kit.js';
import { isModelKey, keepsNothing } from '../src/worker/models.js';
import { isDay } from '../src/lib/days.js';

export { canonicalHash };

export const LAUNCH_PATH = 'data/launch.json';
export const STRINGS_PATH = 'design/strings.json';
export const MANIFEST_PATH = 'data/2026/manifest.json';
export const ASK_PATH = 'data/2026/ask.json';
export const WORDS_PATH = 'data/2026/game-words.json';
/** The charter's colours, and the set that replaces them if the charter is withdrawn (D14.12). */
export const TOKEN_SETS = ['design/tokens.json', 'design/tokens.neutral.json'] as const;

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
  /** Cloudflare dashboard: gateway logs off, no payment method (no Turnstile widget: D16.23). */
  dashboard_checked_on: string | null;
  /** The preview was used on real phones, in-app browsers included. */
  phones_tried_on: string | null;
  /** The seven personas played the preview (D14.8); what they say stays a hypothesis (D14.11). */
  personas_session_on: string | null;
  /** The four attackers of September went through every screen, and nothing blocking remains. */
  hostile_review_on: string | null;
}

export interface LaunchFile extends DatedGestures {
  apex: 'holding' | 'app';
  /** The privacy page was re-read as built: the fingerprint is that of its strings on that day. */
  privacy_page: { reviewed_on: string | null; sha256: string | null };
  /** The same for what the page adds where the field asks — read apart, dated apart. */
  privacy_chat?: {
    reviewed_on: string | null;
    /** Who re-read the section: the editor, or the session on his mandate (D16.63). */
    reviewed_by?: 'editor' | 'session';
    sha256: string | null;
  };
  /**
   * The same for the one line the second-generation mascot adds — the colour the player gave
   * her (D17.3). Read apart, dated apart, and asked only of a host that serves her.
   */
  privacy_mascot?: {
    reviewed_on: string | null;
    reviewed_by?: 'editor' | 'session' | null;
    sha256: string | null;
  };
  /**
   * The home page that opens on the game (D19.1): written on main before production serves it
   * (D19.12). `decided_on` and `decided_by` are the editor's word that production may take it;
   * `serving` names the commit production is built from until then (`homeBlockers`).
   */
  home?: {
    opens_on: 'game';
    decided_on: string | null;
    decided_by: 'editor' | null;
    serving: string | null;
  };
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

/**
 * Today, as decisions.md dates it: the day in Paris. Between midnight and 1 h (2 h in summer)
 * the day in UTC is still the day before, and the editor's word written on his day was refused
 * for an hour, with a reason that said it was missing (review 10, A13).
 */
export function parisDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** A row of the table of decisions.md, read by its columns. */
export interface DecisionRow {
  id: string;
  date: string;
  content: string;
  status: string;
}

/**
 * The rows of the table of decisions — an amendment row too (« D0.15b », review 10, A16) — each
 * read by its columns: a mark is looked for in its own column, never anywhere in the line.
 */
export function decisionRows(decisions: string): DecisionRow[] {
  return decisions
    .split('\n')
    .filter((row) => /^\| D\d+\.\d+[a-z]? \|/.test(row))
    .map((row) => {
      const cells = row.split(' | ');
      return {
        id: (cells[0] ?? '').replace(/^\| /, ''),
        date: cells[1] ?? '',
        content: cells[2] ?? '',
        status: cells.slice(3).join(' | '),
      };
    });
}

/** The mark that opens the status of a decision of the editor. */
export const EDITOR_MARK = '**DÉCISION (utilisateur)**';

/**
 * His row on `on`: his mark opens its status, and the row names each of `names` — the record
 * it fills, or the first characters of what it was given on. A date a session wrote without his
 * word finds no such row (review 10, A7).
 */
export function editorSaid(decisions: string, on: unknown, names: readonly string[]): boolean {
  return decisionRows(decisions).some(
    (row) =>
      row.date === on &&
      row.status.startsWith(EDITOR_MARK) &&
      names.every((name) => `${row.content} | ${row.status}`.includes(name)),
  );
}

/** decisions.md under a root — '' without it, which no gate reads as his word. */
function decisionsUnder(at: (path: string) => string): string {
  const path = at('docs/discovery/decisions.md');
  return existsSync(path) ? readFileSync(path, 'utf8') : '';
}
/** The mark of a decision the session took under the mandate of the explained words (D20.3). */
const MANDATE_MARK = '**DÉCISION (session, sur le mandat D20.3)**';

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
    'the Cloudflare dashboard is not checked: gateway logs off, no payment method',
  ],
  ['phones_tried_on', 'the preview has not been tried on real phones'],
  ['personas_session_on', 'the persona session has not been played (D14.8)'],
  ['hostile_review_on', 'the hostile review of the screens is not recorded'],
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
      `${String(inputs.pendingReviews.length)} of our own texts are not accepted for publication (D0.27, D16.79): ` +
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

/**
 * A string of the privacy page that only a site that asks ever shows: the section « Quand tu
 * demandes » (`privacy.chat.*`) and the variants of a line for that mode (`privacy.*.ask`).
 * The kit names them so that they can be told apart without a list (design/strings.json).
 */
export const isChatPrivacyKey = (key: string): boolean =>
  key.startsWith('privacy.chat.') || /^privacy\..+\.ask$/.test(key);

/**
 * A string of the privacy page that only a site serving the second-generation mascot shows:
 * what the phone keeps of the colour given to her (`privacy.*.tint`, D17.3). Named so that it
 * can be told apart without a list, like the chat's.
 */
export const isMascotPrivacyKey = (key: string): boolean => /^privacy\..+\.tint$/.test(key);

const hashOf = (strings: Record<string, unknown>, keep: (key: string) => boolean): string =>
  canonicalHash(Object.fromEntries(Object.entries(strings).filter(([key]) => keep(key))));

/**
 * Fingerprint of what the privacy page of a site that asks nothing can show — the page
 * production serves in « search only ». What the chat adds is read apart
 * (`privacyChatStringsHash`): a word changed in that section must not keep production from
 * being redeployed, least of all for a correction.
 */
export function privacyStringsHash(strings: Record<string, unknown>): string {
  return hashOf(
    strings,
    (key) => key.startsWith('privacy.') && !isChatPrivacyKey(key) && !isMascotPrivacyKey(key),
  );
}

/** The sources whose words and structure make what the privacy page says, beside the kit. */
export const PRIVACY_PAGE_SOURCES = [
  'src/pages/confidentialite/index.astro',
  'src/components/GameStorage.astro',
  'src/lib/storage-map.ts',
] as const;

/**
 * Fingerprint of everything the privacy page of a site can say — what its dated reading
 * (`privacy_page`) covers (review 10, A4): its `privacy.*` strings (`privacyStringsHash`), every
 * other string of the kit its sources print (the confirmation of « Tout effacer », the host, the
 * contact…), and the bytes of those sources — the addresses written in them, the sections they
 * render, the fields the phone keeps. The chat's section and her colour keep their own readings.
 */
export function privacyPageHash(root = '.'): string {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const strings = readObject(at(STRINGS_PATH)) ?? {};
  const sources = PRIVACY_PAGE_SOURCES.map((path) =>
    existsSync(at(path)) ? readFileSync(at(path), 'utf8') : '',
  );
  const printed = [
    ...new Set(
      sources.flatMap((text) =>
        [...text.matchAll(/'([a-z][a-z0-9_]*(?:\.[a-z0-9_]+)+)'/g)].map((match) => match[1] ?? ''),
      ),
    ),
  ]
    .filter((key) => key in strings && !isChatPrivacyKey(key) && !isMascotPrivacyKey(key))
    .sort();
  return canonicalHash({
    strings: privacyStringsHash(strings),
    printed: Object.fromEntries(printed.map((key) => [key, strings[key]])),
    sources: Object.fromEntries(
      PRIVACY_PAGE_SOURCES.map((path, index) => [
        path,
        createHash('sha256')
          .update(sources[index] ?? '')
          .digest('hex'),
      ]),
    ),
  });
}

/** Fingerprint of what the privacy page adds where the field asks. */
export function privacyChatStringsHash(strings: Record<string, unknown>): string {
  return hashOf(strings, isChatPrivacyKey);
}

/**
 * Fingerprint of what the privacy page adds where the second-generation mascot is served. Read
 * apart for the same reason as the chat's: a line that production does not show yet must not
 * keep production from being redeployed (docs/discovery/PLAN-TORTUE.md §11.1).
 */
export function privacyMascotStringsHash(strings: Record<string, unknown>): string {
  return hashOf(strings, isMascotPrivacyKey);
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
 * Who re-read something the launch waits for: the editor — or the session, on his mandate
 * (D16.57, D16.63). The record says which: no date stands for a reading nobody can name.
 */
const isReviewer = (value: unknown): boolean => value === 'editor' || value === 'session';

/**
 * What is missing for the section the chat adds to the privacy page: re-read as it stands —
 * a date, and the fingerprint of today — by someone the file names.
 */
function chatPrivacyBlockers(at: (path: string) => string): string[] {
  const read = field(readObject(at(LAUNCH_PATH)), 'privacy_chat');
  if (
    !isDate(field(read, 'reviewed_on')) ||
    field(read, 'sha256') !== privacyChatStringsHash(readObject(at(STRINGS_PATH)) ?? {})
  ) {
    return [
      `${LAUNCH_PATH}: the section « Quand tu demandes » of the privacy page is not re-read as it stands: privacy_chat (lot C9)`,
    ];
  }
  return isReviewer(field(read, 'reviewed_by'))
    ? []
    : [
        `${LAUNCH_PATH}: the section « Quand tu demandes » of the privacy page is dated, and nothing says who re-read it — the editor, or the session: privacy_chat.reviewed_by (D16.63)`,
      ];
}

/**
 * What is missing for the line the second-generation mascot adds to the privacy page: re-read
 * as it stands — a date and today's fingerprint — by someone the file names. Asked of every
 * host that serves her, the preview first: it is the one validation a preview needs, because
 * the line is about what is written on a visitor's phone.
 */
/**
 * What holds back the preview host's pages, whatever they do with a question: the line of the
 * privacy page about the colour given to her, shown wherever the game writes — the preview host
 * first (review 10, A5; D17.26).
 */
export function previewPageBlockers(root = '.'): string[] {
  return mascotPrivacyBlockers((path) => (root === '.' ? path : `${root}/${path}`));
}

function mascotPrivacyBlockers(at: (path: string) => string): string[] {
  const read = field(readObject(at(LAUNCH_PATH)), 'privacy_mascot');
  if (
    !isDate(field(read, 'reviewed_on')) ||
    field(read, 'sha256') !== privacyMascotStringsHash(readObject(at(STRINGS_PATH)) ?? {})
  ) {
    return [
      `${LAUNCH_PATH}: the line of the privacy page about the colour given to the mascot is not re-read as it stands: privacy_mascot (D17.3)`,
    ];
  }
  return isReviewer(field(read, 'reviewed_by'))
    ? []
    : [
        `${LAUNCH_PATH}: the line of the privacy page about the colour given to the mascot is dated, and nothing says who re-read it — the editor, or the session on his word: privacy_mascot.reviewed_by`,
      ];
}

/**
 * True when the file names a model that would explain: anything but null. Since D16.60 it
 * names none — « Demander » opens on the sentences written ahead, and no AI answers a visitor.
 */
const namesModel = (ask: Record<string, unknown> | null): boolean =>
  ask !== null && ask['model'] !== null && ask['model'] !== undefined;

/** Who read the deposited sentences, as scripts/gists-core.ts (`readBy`) says it. */
const isReader = (value: unknown): boolean =>
  value === 'editor' || value === 'session' || value === 'both';

/** How many measures the book has, as the manifest lists them: every item that is not prose. */
function measureCount(path: string): number {
  const sections = field(readObject(path), 'sections');
  if (!Array.isArray(sections)) return -1;
  let count = 0;
  for (const section of sections as unknown[]) {
    const items = field(section, 'items');
    if (!Array.isArray(items)) continue;
    count += (items as unknown[]).filter((item) => field(item, 'kind') !== 'paragraph').length;
  }
  return count;
}

/**
 * What the answering of a question still lacks for production (data/2026/ask.json): the gates of
 * PLAN-CHAT §5 that a file can carry — and, for the mode "chat", every one the preview host
 * asks for too. The Worker of the chat is held to these and to nothing of the pages
 * (`chatLaunchBlockers`; review 10, A6).
 */
function askBlockers(root: string, corpus: unknown): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const out: string[] = [];
  // How a question is answered: the sheet of the chat, or search only (D16.4, D16.51).
  const ask = readObject(at(ASK_PATH));
  if (ask === null) {
    out.push(`how a question is answered is not decided: ${ASK_PATH} is missing (lot I6)`);
  } else if (ask.mode !== 'chat' && ask.mode !== 'off') {
    out.push(`${ASK_PATH}: mode must be "chat" or "off"`);
  } else if (
    // Left out or null, the preview host does what production does (src/lib/ask-mode.ts): every
    // reader reads the two alike, and so does this gate (review 10, A18).
    ask.preview_mode !== undefined &&
    ask.preview_mode !== null &&
    ask.preview_mode !== 'chat' &&
    ask.preview_mode !== 'off'
  ) {
    out.push(`${ASK_PATH}: preview_mode must be "chat" or "off"`);
  } else if (ask.mode === 'off') {
    // "Search only" is the last rung of the ladder, and a decision like the others: a file
    // that says "off" because no bench has run yet decides nothing, and must not pass for it.
    if (!isDate(ask.decided_on)) {
      out.push(
        `${ASK_PATH}: "search only" is the editor's decision, not a default: decided_on (lot I5)`,
      );
    }
  } else {
    // The gates of PLAN-CHAT §5 that a file can carry — each dated, or measured.
    //
    // Those of a model that explains hold only where one is named. Since D16.60 none is: the
    // sheet opens on the sentences written ahead, `/api/chat` stays closed, and there is
    // neither a bench of explanations to rest on, nor threads of a model to read, nor a model
    // to confirm — nor a text of the book for a model to be handed.
    if (namesModel(ask)) {
      if (typeof field(ask.bench, 'sha256') !== 'string' || !isDate(field(ask.bench, 'run_on'))) {
        out.push(
          `${ASK_PATH}: the mode "chat" rests on no recorded bench of explanations (lot C8)`,
        );
      }
      if (field(ask.database, 'corpus_version') !== corpus) {
        out.push(
          `${ASK_PATH}: the private database is not at the corpus version of the manifest (lot I3)`,
        );
      }
      if (!isDate(ask.threads_read_on)) {
        out.push(
          `${ASK_PATH}: the editor has not read the forty threads: threads_read_on (lot C8)`,
        );
      }
      if (!isDate(ask.model_confirmed_on)) {
        out.push(
          `${ASK_PATH}: the editor has not confirmed the model the bench chose: model_confirmed_on`,
        );
      }
    }
    // Every measure has its verdict — a sentence read, or its link alone — and the set that
    // was deposited is the set that was read (scripts/seed-ask-2026.ts).
    const gists = ask.gists;
    if (
      field(gists, 'corpus_version') !== corpus ||
      typeof field(gists, 'sha256') !== 'string' ||
      !isDate(field(gists, 'deposited_on'))
    ) {
      out.push(`${ASK_PATH}: the read sentences are not deposited for this book: gists (lot C3)`);
    }
    if (field(gists, 'verdicts') !== measureCount(at(MANIFEST_PATH))) {
      out.push(
        `${ASK_PATH}: not every measure has its verdict — a sentence read, or its link alone: gists.verdicts (lot C3)`,
      );
    }
    // Who read them is written with the deposit: what the site says of the sentences is held
    // to it (D16.59, scripts/check-strings.test.ts).
    if (!isReader(field(gists, 'read_by'))) {
      out.push(
        `${ASK_PATH}: the deposit does not say who read the sentences — the editor, the session, or both: gists.read_by (D16.59)`,
      );
    }
    // The page the agreement sends its reader to: what the chat adds to it was re-read as it
    // stands (the rest of the page is the launch's own gate, `privacy_page`).
    out.push(...chatPrivacyBlockers(at));
    // The chat reaches the apex as a second Worker in front of the files: that deployment, and
    // its withdrawal, were tried on the preview host first (wrangler.chat.jsonc).
    if (!isDate(ask.deployment_rehearsed_on)) {
      out.push(
        `${ASK_PATH}: the deployment of the chat has not been rehearsed on the preview host: deployment_rehearsed_on (lot C10)`,
      );
    }
    // Production asks for every gate the preview host asks for (review 10, A8; review 11, M4):
    // a model that keeps nothing of a call, where one is named, and the legal file of the chat.
    if (namesModel(ask) && (!isModelKey(ask.model) || !keepsNothing(ask.model))) {
      out.push(
        `${ASK_PATH}: no model is named whose host writes that it keeps nothing of a call: model`,
      );
    }
    out.push(...legalFileBlockers(ask));
  }

  return out;
}

/** The legal file of the chat (18-dossier-chat.md): done for real, and by whom it is dated. */
function legalFileBlockers(ask: Json | null): string[] {
  if (!isDate(ask?.preview_legal_on)) {
    return [
      `${ASK_PATH}: the legal file of the chat is not done for real — the reading of the gesture, the register, the short impact assessment, what is known of the dashboard: preview_legal_on`,
    ];
  }
  if (!isReviewer(ask.preview_legal_by)) {
    return [
      `${ASK_PATH}: the legal file of the chat is dated, and nothing says by whom — the editor, or the session: preview_legal_by (D16.63)`,
    ];
  }
  return [];
}

/**
 * What holds the Worker of the chat back from the apex: the gates of the chat, and none of the
 * pages' — a retouch of the mascot, the game's list or a line of the privacy page awaiting its
 * date changes nothing the Worker serves, and must not keep a fix of it from going out (D19.12;
 * review 10, A6: it happened to the fix of R40).
 */
export function chatLaunchBlockers(root = '.'): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  return askBlockers(root, field(field(readObject(at(MANIFEST_PATH)), 'meta'), 'corpus_version'));
}

/**
 * What the files that carry their own validation still lack. Each line names the file and the
 * lot of the plan that produces it, so that the gate reads as a to-do list long before launch.
 */
export function artefactBlockers(root = '.'): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const corpus = field(field(readObject(at(MANIFEST_PATH)), 'meta'), 'corpus_version');
  return [...askBlockers(root, corpus), ...gameArtefactBlockers(root)];
}

/**
 * The part of the artefacts that only a build showing the game needs: its list of words and
 * her sheet. A build that shows no game — the scrutin build (D16.16), or the build of sheet 9
 * that takes a word out — ships nothing they hold (review 11, C4; review 9, D6).
 */
export function gameArtefactBlockers(root = '.'): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const out: string[] = [];
  const corpus = field(field(readObject(at(MANIFEST_PATH)), 'meta'), 'corpus_version');

  // The words of the game: a new kind of extract, validated with its measured share (D16.15).
  const words = readObject(at(WORDS_PATH));
  if (words === null) {
    out.push(`the words of the game are not written: ${WORDS_PATH} is missing (lot J3)`);
  } else {
    const meta = words.meta;
    const list = listFingerprint(words.words, field(meta, 'pool'));
    // The game is not optional (D16.11): below a round of words the build hides it, and the
    // turtle with it (src/lib/game-data.ts) — the same threshold, not a second one (A9).
    if (!Array.isArray(words.words) || words.words.length < ROUND) {
      out.push(
        `${WORDS_PATH}: the list holds fewer than a round of words (${String(ROUND)}): the build would show no game, and no turtle (D16.11)`,
      );
    }
    if (!isDate(field(meta, 'pool_reviewed_on'))) {
      out.push(
        `${WORDS_PATH}: the sections the game draws from are not reviewed: meta.pool_reviewed_on`,
      );
    }
    if (!isDate(field(field(meta, 'validated'), 'on'))) {
      out.push(`${WORDS_PATH}: the list is not validated by the editor: meta.validated.on`);
    } else if (field(field(meta, 'validated'), 'list_sha256') !== list) {
      out.push(`${WORDS_PATH}: the list or its pool of sections changed after it was validated`);
    } else if (
      !editorSaid(decisionsUnder(at), field(field(meta, 'validated'), 'on'), [list.slice(0, 12)])
    ) {
      // His validation names the list it was given on (D19.18 names 8fc8898fd770…; B39, A7).
      out.push(
        `docs/discovery/decisions.md: no decision of the editor on ${String(field(field(meta, 'validated'), 'on'))} that names the list (${list.slice(0, 12)}…)`,
      );
    }
    const attested = field(meta, 'attested');
    const checks = field(attested, 'checks');
    if (field(attested, 'list_sha256') !== list || field(attested, 'corpus_version') !== corpus) {
      out.push(`${WORDS_PATH}: the local check has not attested this list on this corpus (lot J2)`);
    } else if (!LOCAL_CHECKS.every((check) => Array.isArray(checks) && checks.includes(check))) {
      out.push(`${WORDS_PATH}: attested before a check that exists today — attest again (lot J2)`);
    }
    // The word lit up in the official page: what three browsers did, on this very list (J4).
    if (Array.isArray(words.words) && words.words.length > 0) {
      const followed = highlightedWords(readObject(at(WORD_LINKS_PATH)), {
        corpus: typeof corpus === 'string' ? corpus : '',
        words: wordsFingerprint(words.words as Parameters<typeof wordsFingerprint>[0]),
      });
      if (followed.stale !== null) {
        out.push(
          `${WORD_LINKS_PATH}: ${followed.stale} — npx tsx scripts/verify-2026.ts --words --engines chromium,firefox,webkit --write (lot J4)`,
        );
      }
    }
  }

  // The mascot: validated on a sheet, bound to the drawing it was validated on.
  out.push(...mascotBlockers(root));
  return out;
}

/**
 * What the mascot still lacks before production may serve her (D16.11, D17.14) — empty when it
 * may.
 *
 * She is validated on a sheet (design/mascot/v2/validation.json), bound to the drawing it was
 * validated on: her drawing, her stylesheet, her colours and her choreography make one
 * fingerprint (scripts/mascot2-kit.ts), and « même personnage ? » was asked of that very
 * drawing. A retouch of any of them un-validates her: production is held until the editor has
 * seen what changed and dated it again. She writes one field more on a phone — the colour the
 * player gave her (D17.3) —, so the line of the privacy page that says so is re-read as it
 * stands (privacy_mascot).
 *
 * Until lot F of docs/discovery/PLAN-TORTUE.md, two generations lived side by side and
 * data/mascot.json said which one each host served: the record that applied was that
 * generation's, and serving the second in production took the editor's dated word (given on
 * 15 November 2026, D17.36). One generation is left, and one record.
 */
export function mascotBlockers(root = '.'): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const out: string[] = [...mascotPrivacyBlockers(at)];
  let drawing: string | null = null;
  let unread = '';
  try {
    drawing = mascot2Fingerprint(root);
  } catch (error) {
    // A file of hers that cannot be read is a drawing that cannot be fingerprinted: said as it
    // is — not as a sheet left unvalidated, which sent the operator to the wrong file (A19).
    unread = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error);
  }
  const record = readObject(at(MASCOT2_VALIDATION_PATH));
  if (unread !== '') {
    out.push(`the mascot cannot be fingerprinted — ${unread}`);
    return out;
  }
  if (record === null || drawing === null) {
    out.push(`the mascot is not drawn or not validated: ${MASCOT2_VALIDATION_PATH} (lot A2)`);
    return out;
  }
  if (!isDate(record.validated_on)) {
    out.push(`${MASCOT2_VALIDATION_PATH}: the sheet is not dated by the editor: validated_on`);
  } else if (record.drawing_sha256 !== drawing) {
    out.push(`${MASCOT2_VALIDATION_PATH}: the drawing changed after the sheet was validated`);
  } else if (
    !editorSaid(decisionsUnder(at), record.validated_on, [MASCOT2_VALIDATION_PATH, 'validated_on'])
  ) {
    // The date is his (D17.24: « une session ne l'écrit pas sans ton mot »).
    out.push(
      `docs/discovery/decisions.md: no decision of the editor on ${record.validated_on} that dates ${MASCOT2_VALIDATION_PATH} (validated_on)`,
    );
  }
  // The question is about a drawing too: asked of another one, it was not asked of her.
  if (!isDate(record.same_character_asked_on)) {
    out.push(
      `${MASCOT2_VALIDATION_PATH}: "same character?" has not been asked: same_character_asked_on`,
    );
  } else if (record.same_character_sha256 !== drawing) {
    out.push(`${MASCOT2_VALIDATION_PATH}: the drawing changed after "same character?" was asked`);
  }
  return out;
}

/**
 * Why the preview host may not ask yet — empty when it may, and when it does not ask at all.
 *
 * The preview host is public: `noindex`, but whoever has its address reads it, and answering a
 * question there is already processing one (11-conformite.md §6.2 sexies). So the host that
 * opens first has gates of its own — those of PLAN-CHAT §5 that come before anyone asks, as far
 * as a file can carry them. The others (every measure read, forty threads, the model confirmed)
 * are production's: they are measured on this very host.
 */
export function previewChatBlockers(
  root = '.',
  privacyHash?: string,
  options: { pages?: boolean } = {},
): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const ask = readObject(at(ASK_PATH));
  if (modeFor(ask, 'preview') !== 'chat') return [];
  const out: string[] = [];
  const corpus = field(field(readObject(at(MANIFEST_PATH)), 'meta'), 'corpus_version');
  // A model that explains has gates of its own; a sheet without one (D16.60) has none of them
  // to pass — and nothing of a visitor's question to hand to anyone.
  if (namesModel(ask)) {
    if (!isModelKey(ask?.model) || !keepsNothing(ask.model)) {
      out.push(
        `${ASK_PATH}: no model is named whose host writes that it keeps nothing of a call: model`,
      );
    }
    if (typeof field(ask?.bench, 'sha256') !== 'string' || !isDate(field(ask?.bench, 'run_on'))) {
      out.push(`${ASK_PATH}: no bench of the explanations is recorded: bench (lot C8)`);
    }
  }
  const gists = ask?.gists;
  if (
    field(gists, 'corpus_version') !== corpus ||
    typeof field(gists, 'sha256') !== 'string' ||
    !isDate(field(gists, 'deposited_on'))
  ) {
    out.push(`${ASK_PATH}: no read sentence is deposited for this book: gists (lot C3)`);
  }
  if (!isDate(ask?.deployment_rehearsed_on)) {
    out.push(
      `${ASK_PATH}: the deployment of the chat has not been rehearsed: deployment_rehearsed_on (lot C10)`,
    );
  }
  out.push(...legalFileBlockers(ask));
  // The page the agreement of the sheet sends its reader to: the gate of the PAGES that ask. The
  // Worker of the chat serves none of it (`pages: false`, review 10, A6).
  const launch = readObject(at(LAUNCH_PATH));
  const privacy = field(launch, 'privacy_page');
  const today = privacyHash ?? privacyPageHash(root);
  if (
    options.pages !== false &&
    (!isDate(field(privacy, 'reviewed_on')) || field(privacy, 'sha256') !== today)
  ) {
    out.push(
      `${LAUNCH_PATH}: the privacy page — where the agreement of the sheet sends its reader — is not re-read as it stands: privacy_page`,
    );
  }
  out.push(...chatPrivacyBlockers(at));
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
      // « accepted »: published on the editor's word, not re-read (D16.79) — the page says so.
      if (entry.review.status !== 'reviewed' && entry.review.status !== 'accepted') {
        out.push(`${prefix}:${entry.id}`);
      }
    }
  }
  return out;
}

/**
 * What stands between the code on main and production while the game-first redesign is being
 * written (D19.1, D19.12) — empty once the editor has said yes, and dated it.
 *
 * One code path, not two generations side by side: main runs ahead of what production serves,
 * and nothing but this rule keeps `npm run deploy` from putting an unfinished home page on the
 * apex. It is NOT a launch blocker (`launchBlockers`): those also hold back the Worker of the
 * chat (`chatDeployRefusal`), which must stay deployable, and they turn the apex back into a
 * holding page — this one refuses app builds on the apex and nothing else (`deployRefusal`).
 * The preview host, the holding page and a dry run are never concerned.
 *
 * Only the editor decides production: a record a session dated for him is refused like no
 * record at all (scripts/launch.test.ts holds that his decision is written in decisions.md).
 * Until then an urgent fix of production is built from the commit `serving` names — runbook
 * sheet 14, docs/discovery/09-architecture.md.
 *
 * Pure: the record is passed in, so the rule is tested without a file.
 */
/** The day the redesign was decided (D19.1): no yes to it can be older. */
const HOME_DECIDED_FROM = '2026-11-18';

/**
 * A day his yes can bear: a real date, not before the redesign existed, not after today (UTC).
 * A shape alone let « 0000-00-00 », a day of last month or a day to come stand for his word.
 */
const saidSince = (value: unknown, today: Date): value is string =>
  isDay(value) && value >= HOME_DECIDED_FROM && value <= parisDay(today);

export function homeBlockersOf(
  record: unknown,
  today: Date = new Date(),
  decisions: string | null = null,
): string[] {
  if (typeof record !== 'object' || record === null || Array.isArray(record)) {
    return [
      `${LAUNCH_PATH}: nothing says whether production may serve the home page of main: home (D19.12)`,
    ];
  }
  if (field(record, 'opens_on') !== 'game') {
    return [`${LAUNCH_PATH}: home.opens_on must say what the home page of main opens on: "game"`];
  }
  if (!saidSince(field(record, 'decided_on'), today) || field(record, 'decided_by') !== 'editor') {
    const serving = field(record, 'serving');
    const from = typeof serving === 'string' && serving !== '' ? serving : 'the production tag';
    return [
      `${LAUNCH_PATH}: the editor has not said yes to the game-first home in production: ` +
        `home.decided_on, home.decided_by (D19.12) — until then production is built from ${from}`,
    ];
  }
  // His word is written in decisions.md, on its day, in his own column (review 10, A17): read
  // at the deploy too, not by a test alone.
  const on = field(record, 'decided_on');
  if (
    decisions !== null &&
    !decisionRows(decisions).some(
      (row) =>
        row.date === on &&
        row.status.startsWith(EDITOR_MARK) &&
        row.content.includes('home.decided_on'),
    )
  ) {
    return [
      `docs/discovery/decisions.md: no decision of the editor on ${String(on)} that names home.decided_on`,
    ];
  }
  return [];
}

/** The same, read from the committed file. Never throws: an unreadable file blocks. */
export function homeBlockers(root = '.', today: Date = new Date()): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const decisions = existsSync(at('docs/discovery/decisions.md'))
    ? readFileSync(at('docs/discovery/decisions.md'), 'utf8')
    : '';
  return homeBlockersOf(field(readObject(at(LAUNCH_PATH)), 'home'), today, decisions);
}

export function readLaunchInputs(): LaunchInputs {
  return {
    launch: JSON.parse(readFileSync(LAUNCH_PATH, 'utf8')) as LaunchFile,
    policyValidated: citationPolicyValidated(),
    pendingReviews: pendingReviews(),
    privacyHash: privacyPageHash(),
    artefacts: artefactBlockers(),
  };
}

function main(): void {
  const blockers = launchBlockers(readLaunchInputs());
  // Apart from the launch: what keeps the code of main from production for now — the home page
  // (D19.12) and the explained words (D20.15).
  const home = [...homeBlockers(), ...wordsBlockers()];
  if (blockers.length === 0 && home.length > 0) {
    console.log('launch: nothing is missing — but production waits:');
    for (const line of home) console.log(`  · ${line}`);
    process.exitCode = 1;
    return;
  }
  if (blockers.length === 0) {
    console.log(
      'launch: nothing is missing — `npm run build && npm run deploy` puts the app on the apex',
    );
    return;
  }
  const decision = blockers.filter((line) => line.startsWith('the launch has not been decided'));
  const rest = blockers.filter((line) => !line.startsWith('the launch has not been decided'));
  console.log(
    `launch: ${String(rest.length)} thing(s) missing${decision.length > 0 ? ' before the decision itself' : ''}`,
  );
  for (const line of rest) console.log(`  - ${line}`);
  for (const line of decision) console.log(`  · ${line}`);
  for (const line of home) console.log(`  · ${line}`);
  process.exitCode = 1;
}

/** Where the explained words are, and where they are switched on (PLAN-MOTS). */
export const TERMS_PATH = 'data/2026/terms.json';
export const WORDS_SWITCH_PATH = 'data/2026/words.json';
const DECISIONS_PATH = 'docs/discovery/decisions.md';
/** The day « Aucun mot ne bloque » was decided (D20.1): no seal of its charter, nor opening, is older. */
const WORDS_DECIDED_FROM = '2026-11-19';
/**
 * The last day the session could seal or open the explained words under its mandate (D20.3): it
 * was consumed by the opening of production (D20.22, 19/11/2026). From the next day a seal and
 * an opening are the editor's, and his alone (review 10, A3; D20.22, D21.9).
 */
const WORDS_MANDATE_LAST_DAY = '2026-11-19';

/** A day a seal or an opening can bear: a real day, not before the work began, not after today. */
const wordsSaidSince = (value: unknown, today: Date): value is string =>
  isDay(value) && value >= WORDS_DECIDED_FROM && value <= parisDay(today);

/**
 * What keeps production from taking the explained words of main (PLAN-MOTS, D20.15) — empty when
 * it may.
 *
 *   - the file of the words is the very one its seal was put on: what was checked is what goes
 *     out, and a word changed since breaks the seal;
 *   - a seal of the new charter (2: words taken from the book, examples) is written in
 *     decisions.md on its day, with its first twelve characters — by the session under its
 *     mandate (« D20.3 ») or by the editor (« DÉCISION (utilisateur) »);
 *   - a file of the new charter, or a surface opened in production (data/2026/words.json), goes
 *     out only once opened: on a day, by the session under D20.3 or by the editor, after the yes
 *     of an independent reviewer on the preview host — the opening written in decisions.md on
 *     its day, naming the file it opens.
 *
 * Like `homeBlockers`, it holds back app builds on the apex and nothing else: the preview host —
 * where the words are shown first —, the holding page, a dry run are never concerned.
 *
 * Pure: the files are passed in, so the rule is tested without them.
 */
export function wordsBlockersOf(
  terms: unknown,
  words: unknown,
  decisions: string,
  today: Date = new Date(),
): string[] {
  const meta = field(terms, 'meta');
  const sealed = field(meta, 'sealed');
  const seal = field(sealed, 'sha256');
  const sealedOn = field(sealed, 'on');
  if (typeof seal !== 'string' || !isDate(sealedOn)) {
    return [`${TERMS_PATH}: the explained words carry no seal — meta.sealed (D20.15)`];
  }
  const out: string[] = [];
  if (canonicalHash(field(terms, 'entries')) !== seal) {
    out.push(
      `${TERMS_PATH}: the explained words changed since they were sealed — check them, then seal them again (D20.15)`,
    );
  }
  const charter = field(meta, 'charter');
  if (charter !== 1 && charter !== 2) out.push(`${TERMS_PATH}: meta.charter is 1 or 2`);
  const rows = decisionRows(decisions);
  /**
   * Who may seal or open, and on which days: the session under its mandate until the day it
   * was consumed, the editor always — each known by the mark that opens the status of its row,
   * never by a word found elsewhere in it (review 10, A2, A3).
   */
  const markOf = (who: unknown, on: string): string | null =>
    who === 'editor'
      ? EDITOR_MARK
      : who === 'session' && on <= WORDS_MANDATE_LAST_DAY
        ? MANDATE_MARK
        : null;
  if (charter === 2) {
    const by = field(sealed, 'by');
    const mark = markOf(by, sealedOn);
    if (mark === null) {
      out.push(
        by === 'session'
          ? `${TERMS_PATH}: the mandate D20.3 is consumed since D20.22 — a seal after ${WORDS_MANDATE_LAST_DAY} is the editor's: meta.sealed.by`
          : `${TERMS_PATH}: meta.sealed.by is the editor (or the session, under D20.3, until ${WORDS_MANDATE_LAST_DAY})`,
      );
    } else if (
      !wordsSaidSince(sealedOn, today) ||
      !rows.some(
        (row) =>
          row.date === sealedOn &&
          row.status.startsWith(mark) &&
          row.content.includes(seal.slice(0, 12)),
      )
    ) {
      out.push(
        `docs/discovery/decisions.md: no decision on ${sealedOn} that names the seal of the explained words (${seal.slice(0, 12)}…)`,
      );
    }
  }
  const production = field(words, 'production');
  const opened = ['pages', 'search', 'game'].some((surface) => field(production, surface) === 'on');
  if (charter === 2 || opened) {
    const on = field(words, 'decided_on');
    const by = field(words, 'decided_by');
    const mark = wordsSaidSince(on, today) ? markOf(by, on) : null;
    // The opening names its decision (`decided_in`): the row of that number, on that day, in its
    // author's column, naming this very file — not a row that only mentions the game's list,
    // opens the preview host or closes production (review 10, A2).
    const named = rows.find((row) => row.id === field(words, 'decided_in'));
    if (mark === null) {
      out.push(
        by === 'session' && isDay(on) && on > WORDS_MANDATE_LAST_DAY
          ? `${WORDS_SWITCH_PATH}: the mandate D20.3 is consumed since D20.22 — an opening after ${WORDS_MANDATE_LAST_DAY} is the editor's: decided_by`
          : `${WORDS_SWITCH_PATH}: production takes these explained words only once they are opened — decided_on, decided_by (D20.15)`,
      );
    } else if (
      named === undefined ||
      named.date !== on ||
      !named.status.startsWith(mark) ||
      !named.content.includes(WORDS_SWITCH_PATH)
    ) {
      out.push(
        `docs/discovery/decisions.md: no decision on ${String(on)} that opens ${WORDS_SWITCH_PATH} — decided_in names it`,
      );
    }
    const yes = field(words, 'reviewer_yes_on');
    if (!wordsSaidSince(yes, today)) {
      out.push(
        `${WORDS_SWITCH_PATH}: no independent reviewer has said yes on the preview host — reviewer_yes_on (D20.15)`,
      );
    } else if (typeof on === 'string' && typeof yes === 'string' && yes > on) {
      // The yes comes first: three texts say the opening followed it (review 10, A15).
      out.push(
        `${WORDS_SWITCH_PATH}: the reviewer said yes on ${yes}, after the opening of ${on} — reviewer_yes_on`,
      );
    }
  }
  return out;
}

/** The same, read from the committed files. Never throws: an unreadable file blocks. */
export function wordsBlockers(root = '.', today: Date = new Date()): string[] {
  const at = (path: string): string => (root === '.' ? path : `${root}/${path}`);
  const decisions = existsSync(at(DECISIONS_PATH)) ? readFileSync(at(DECISIONS_PATH), 'utf8') : '';
  return wordsBlockersOf(
    readObject(at(TERMS_PATH)),
    readObject(at(WORDS_SWITCH_PATH)),
    decisions,
    today,
  );
}

// Its own name, with or without its extension — not any script whose name ends in it (A20).
if (process.argv[1] !== undefined && /(?:^|\/)launch(?:\.ts|\.js)?$/.test(process.argv[1])) {
  main();
}
