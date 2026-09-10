/**
 * Self-check for design/strings.json (the interface string kit, v0.2).
 *
 * Guarantees (design/voice.md §1, §4, §6; D0.1, D0.29, D0.32, D3.12, D10.2):
 *   - the file is a flat map of string values plus one "$meta" object; keys are well formed,
 *     unique in the raw text (JSON.parse would silently keep the last duplicate) and sorted;
 *   - every sentence has at most 15 words (a {placeholder} counts for one), except the keys
 *     listed in ALLOWLIST with a reason;
 *   - no emoji anywhere, no "AEC Discover" (the working title, replaced by D10.2), no leftover
 *     {appName} placeholder;
 *   - the AI notices (chat.ai_mention.*) are at most 140 characters and name Mistral;
 *   - French typography: no-break space before : ; ! ? » % and after «, no U+202F (absent from
 *     the self-hosted fonts, design/fonts/README.md), a single "…" character;
 *   - placeholders are declared in $meta.placeholders_fr, and every declaration is used;
 *   - the public pseudonym and the repository URL are written in clear, and no string carries a
 *     literal e-mail address or a personal path;
 *   - degraded / silence / offline / quota strings never use a breakdown word (voice rule 5).
 *
 * Run: npx tsx --test scripts/check-strings.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const MAX_WORDS_PER_SENTENCE = 15;
const MAX_AI_NOTICE_CHARS = 140;
const NBSP = '\u00a0';

/** The single public pseudonym of the author and of the reviewer (arbitration of 2026-09-10). */
const PSEUDONYM = 'Baoleka';
/** The public repository, renamed with the app (arbitration of 2026-09-10). */
const REPO_URL = 'https://github.com/baoleka/cestecritla';

/** Keys exempt from the 15-word rule, each with the reason. */
const ALLOWLIST: Readonly<Record<string, string>> = {
  'daily.method':
    'explication de la méthode de tirage, lue derrière un lien « Comment le tirage fonctionne »',
};

/** Keys allowed to be empty. */
const EMPTY_ALLOWED = new Set(['mascot.name']); // D3.11: the mascot has no name in v1.

/** Words that would make a normal mode sound like a breakdown (voice rule 5). */
const BREAKDOWN_WORDS = [
  'panne',
  'erreur',
  'indisponible',
  'désolé',
  'malheureusement',
  'temporairement',
  'réessa',
];
const BREAKDOWN_SCOPE =
  /^(degraded|silence|offline|quota|refusal|search|link|section|concept|play|q|riposte)\./;

const raw = readFileSync(new URL('../design/strings.json', import.meta.url), 'utf8');
const parsed = JSON.parse(raw) as Record<string, unknown>;

interface Meta {
  version: string;
  placeholders_fr: Record<string, string>;
}

const meta = parsed['$meta'] as Meta;
const strings = new Map<string, string>();
for (const [key, value] of Object.entries(parsed)) {
  if (key === '$meta') continue;
  assert.equal(typeof value, 'string', `${key}: value is not a string`);
  strings.set(key, value as string);
}

/** Top-level keys in file order, read from the raw text so that duplicates are visible. */
const rawKeys = (raw.match(/^ {2}"([^"]+)":/gm) ?? []).map((line) =>
  line.slice(3, line.indexOf('":')),
);

const sentencesOf = (text: string): string[] =>
  text
    .split(/[.!?…]+(?=[\s\u00a0]|$)/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);

/** Words of a sentence: whitespace-separated tokens that carry a letter, digit or placeholder. */
const wordsOf = (sentence: string): string[] =>
  sentence.split(/[\s\u00a0]+/).filter((token) => /[\p{L}\p{N}{}]/u.test(token));

void test('the file is a flat kit with a $meta block, keys well formed, unique and sorted', () => {
  assert.ok(typeof meta.version === 'string' && /^\d+\.\d+\.\d+$/.test(meta.version));
  assert.equal(rawKeys[0], '$meta');
  const keys = rawKeys.slice(1);
  assert.equal(keys.length, strings.size, 'duplicate key in the raw file');
  for (const key of keys) {
    assert.match(key, /^[a-z0-9_]+(\.[a-z0-9_]+)+$/, `${key}: malformed key`);
  }
  const sorted = [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(keys, sorted, 'keys are not sorted');
  assert.ok(strings.size >= 172, 'the kit lost strings since v0.1');
});

void test('every value is non-empty (except the declared exceptions) and carries no emoji', () => {
  for (const [key, value] of strings) {
    if (!EMPTY_ALLOWED.has(key)) assert.ok(value.trim().length > 0, `${key}: empty`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(value), `${key}: emoji`);
    assert.equal(value, value.trim(), `${key}: leading or trailing space`);
  }
});

void test('the working title and the {appName} placeholder are gone (D10.2)', () => {
  assert.ok(!raw.includes('AEC Discover'), '"AEC Discover" is still in the file');
  for (const [key, value] of strings) {
    assert.ok(!value.includes('{appName}'), `${key}: {appName} left over`);
  }
  assert.equal(strings.get('app.name'), "C'est écrit là");
});

void test('every sentence has at most 15 words, unless the key is allowlisted with a reason', () => {
  for (const [key, value] of strings) {
    const sentences = sentencesOf(value);
    const longest = Math.max(0, ...sentences.map((s) => wordsOf(s).length));
    if (key in ALLOWLIST) {
      assert.ok(longest > MAX_WORDS_PER_SENTENCE, `${key}: allowlisted but within the limit`);
      continue;
    }
    assert.ok(
      longest <= MAX_WORDS_PER_SENTENCE,
      `${key}: a sentence has ${String(longest)} words: ${value}`,
    );
  }
});

void test('the AI notices are at most 140 characters and name Mistral (D0.29, art. 50)', () => {
  const notices = [...strings].filter(([key]) => key.startsWith('chat.ai_mention.'));
  assert.ok(notices.length >= 3, 'three variants are expected for the T9 judgement');
  for (const [key, value] of notices) {
    assert.ok(value.length <= MAX_AI_NOTICE_CHARS, `${key}: ${String(value.length)} characters`);
    assert.ok(value.includes('Mistral'), `${key}: does not name Mistral`);
    assert.ok(value.includes('Cloudflare'), `${key}: does not say where the model is hosted`);
    assert.ok(!/\b(tu|toi|ta|tes)\b/i.test(value), `${key}: the notice must be impersonal (D3.12)`);
  }
  assert.ok(/Mistral/.test(strings.get('chat.ai_badge') ?? ''), 'chat.ai_badge names Mistral');
});

void test('French typography: no-break spaces around double punctuation, no U+202F', () => {
  for (const [key, value] of strings) {
    assert.ok(!value.includes('\u202f'), `${key}: U+202F (absent from the fonts)`);
    assert.ok(!/ [:;!?»%]/.test(value), `${key}: breaking space before punctuation`);
    assert.ok(!/« /.test(value), `${key}: breaking space after «`);
    assert.ok(!/\.\.\./.test(value), `${key}: three dots instead of …`);
    for (const match of value.matchAll(/[:;!?»%]/g)) {
      const before = value[match.index - 1];
      if (before === undefined) continue;
      assert.ok(
        before === NBSP || !/\s/.test(before),
        `${key}: the space before "${match[0]}" is not U+00A0`,
      );
    }
  }
});

void test('every placeholder used is declared, and every placeholder declared is used', () => {
  const declared = new Set(Object.keys(meta.placeholders_fr));
  const used = new Set<string>();
  for (const [key, value] of strings) {
    for (const match of value.matchAll(/\{([^}]*)\}/g)) {
      const name = match[1] ?? '';
      assert.match(name, /^[a-zA-Z]+$/, `${key}: malformed placeholder {${name}}`);
      assert.ok(declared.has(name), `${key}: undeclared placeholder {${name}}`);
      used.add(name);
    }
  }
  // The reverse direction: a declaration left behind after the value was written in clear is how
  // {organisation} and {sponsor} kept describing an editor and a sponsor the app never had (v0.5).
  for (const name of declared) {
    assert.ok(used.has(name), `$meta.placeholders_fr declares {${name}}, which no string uses`);
  }
});

void test('degraded, silence, offline and refusal strings never sound like a breakdown (voice rule 5)', () => {
  for (const [key, value] of strings) {
    if (!BREAKDOWN_SCOPE.test(key)) continue;
    const lower = value.toLowerCase();
    for (const word of BREAKDOWN_WORDS) {
      assert.ok(!lower.includes(word), `${key}: "${word}" in a normal mode`);
    }
  }
});

void test('no war vocabulary on the strings of the kit (05-DA §9 bis n° 19, 13-tests §3.11 n° 14)', () => {
  for (const [key, value] of strings) {
    assert.ok(!/munition|riposte|clash/i.test(value), `${key}: campaign vocabulary "${value}"`);
  }
});

// -------------------------------------------------------------------------------------------
// Gates added by the panel rouge (T12), docs/discovery/13-tests-humains.md §T12.

/**
 * The postures the deterministic table R0-R6 can produce (08-ia.md §7 bis.6, D6.11), and the
 * `chat.liant.*` key each one renders. `voici` is the default of R5; `confirme` and `corrige` stay
 * out of the v1 build until the P1 gate is green, but their string must exist and be reviewed.
 */
const LIANT_KEY_BY_POSTURE: Readonly<Record<string, string>> = {
  confirme: 'chat.liant.confirme',
  precise: 'chat.liant.precise',
  voici: 'chat.liant.voici',
  corrige: 'chat.liant.corrige',
  absent: 'chat.liant.absent',
  hors_sujet: 'refusal.off_topic',
};

/** Liant keys a decision has withdrawn: their presence is a regression, not a leftover. */
const WITHDRAWN_LIANT_KEYS: Readonly<Record<string, string>> = {
  'chat.liant.partiel': 'D6.11 — affirme une exhaustivité fausse sur 9 écrans sur 40',
  'chat.liant.hors_sujet': 'D6.4 — servie à 5 questions qui portaient sur le programme',
};

/**
 * Strings that name a runtime AI. None of them may be rendered while `AI_MODE === 'off'`
 * (D9.15, H-CNF-17g). Two keys are exempt on purpose:
 *   - about.no_ai says the opposite (it is the string of the extractive mode);
 *   - about.writing_method names the AI used to WRITE the cards offline, which stays true.
 * Every other key of this list needs a rendered fallback, listed here next to it.
 */
const RUNTIME_AI_KEYS: Readonly<Record<string, string | null>> = {
  'about.ai_line': 'about.no_ai',
  'about.ai_method': 'about.no_ai',
  'chat.ai_badge': null,
  'chat.ai_mention': null,
  'chat.ai_mention.sr': null,
  'chat.ai_mention.v1': null,
  'chat.ai_mention.v2': null,
  'chat.ai_mention.v3': null,
  'offline.chat': 'offline.chat.local',
  'privacy.policy.02': 'privacy.policy.02.local',
  'quota.title': 'quota.title.local',
  'silence.chat': 'silence.chat.local',
};
const AI_EXEMPT = new Set(['about.no_ai', 'about.writing_method']);
const AI_PATTERN = /\bIA\b|intelligence artificielle|Mistral|assistant/i;

void test('every posture of the R0-R6 table has its string, and no withdrawn liant came back', () => {
  for (const [posture, key] of Object.entries(LIANT_KEY_BY_POSTURE)) {
    assert.ok(strings.has(key), `posture "${posture}": ${key} is missing from the kit`);
  }
  for (const [key, why] of Object.entries(WITHDRAWN_LIANT_KEYS)) {
    assert.ok(!strings.has(key), `${key} is back in the kit (${why})`);
  }
  const liantKeys = [...strings.keys()].filter((key) => key.startsWith('chat.liant.'));
  const declared = new Set(Object.values(LIANT_KEY_BY_POSTURE));
  for (const key of liantKeys) {
    assert.ok(declared.has(key), `${key}: liant string with no posture in the R0-R6 table`);
  }
});

void test('no string names a runtime AI outside the declared list, and each has its fallback', () => {
  for (const [key, value] of strings) {
    if (AI_EXEMPT.has(key)) continue;
    if (!AI_PATTERN.test(value)) continue;
    assert.ok(
      key in RUNTIME_AI_KEYS,
      `${key}: mentions an AI but is not in RUNTIME_AI_KEYS (the build gate would miss it)`,
    );
  }
  for (const [key, fallback] of Object.entries(RUNTIME_AI_KEYS)) {
    assert.ok(strings.has(key), `${key}: declared as an AI string but absent from the kit`);
    if (fallback === null) continue;
    assert.ok(strings.has(fallback), `${key}: no fallback string ${fallback} for AI_MODE = off`);
    if (AI_EXEMPT.has(fallback)) continue; // about.no_ai says there is none: that is its job.
    assert.ok(!AI_PATTERN.test(strings.get(fallback) ?? ''), `${fallback}: still names an AI`);
  }
});

void test('no cta.* string hard-codes a year: an administrative date is computed at build (D9.9)', () => {
  for (const [key, value] of strings) {
    if (!key.startsWith('cta.') || key.endsWith('_url')) continue;
    assert.ok(!/\b20\d\d\b/.test(value), `${key}: hard-coded year in "${value}"`);
  }
  assert.ok(
    (strings.get('cta.register_deadline') ?? '').includes('{date}'),
    'cta.register_deadline must carry {date}',
  );
  assert.ok(strings.has('cta.register_deadline_estimated'), 'the pre-decree variant is missing');
});

void test('no page lead announces a number of lines it cannot guarantee (D6.10 removes lines)', () => {
  for (const key of ['privacy.lead', 'accuracy.intro']) {
    const value = strings.get(key);
    if (value === undefined) continue;
    assert.ok(
      !/\b(deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)\s+lignes\b/i.test(value),
      `${key}: counts its lines ("${value}") — a decision that removes one makes it false`,
    );
  }
});

void test('the mascot has no name and is never the official turtle (D3.11, ban list)', () => {
  for (const [key, value] of strings) {
    assert.ok(!/tortue/i.test(value), `${key}: names the turtle ("${value}")`);
    assert.ok(!/marcheuse/i.test(value), `${key}: uses the internal working name of the mascot`);
  }
});

void test('the public pseudonym is written in clear and is the same one everywhere (D0.15, D2.4)', () => {
  // v0.5: the author and the reviewer are one person under one public pseudonym, so the two
  // placeholders {author} and {reviewer} are gone and the name is part of the string. The kit must
  // never grow a second pseudonym, and never carry a real name.
  const who = strings.get('about.who') ?? '';
  const badge = strings.get('concept.authorship.reviewed') ?? '';
  assert.ok(who.includes(PSEUDONYM), `about.who must name ${PSEUDONYM}: "${who}"`);
  assert.ok(
    badge.includes(PSEUDONYM),
    `concept.authorship.reviewed must name ${PSEUDONYM}: "${badge}"`,
  );
  for (const [key, value] of strings) {
    assert.ok(!/\{(author|reviewer)\}/.test(value), `${key}: {author}/{reviewer} left over (v0.5)`);
  }
});

void test('no string carries a real-world identity: no e-mail address, no personal path', () => {
  // The repository gate of D12.3 / H-CNF-17c, applied to the kit itself: the contact address is
  // {contactEmail}, resolved at build time, never a literal address in a tracked file.
  for (const [key, value] of strings) {
    assert.ok(!/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/.test(value), `${key}: literal e-mail`);
    assert.ok(!/\/home\/[A-Za-z0-9._-]+\//.test(value), `${key}: personal filesystem path`);
  }
});

void test('the repository URL is the renamed repository, written in clear', () => {
  assert.equal(
    strings.get('legal.license.code'),
    "Le code de l'app est libre, sous licence MIT, publié sur " + REPO_URL + '.',
  );
  for (const [key, value] of strings) {
    assert.ok(!value.includes('{repoUrl}'), `${key}: {repoUrl} left over (v0.5)`);
    assert.ok(!/aec-discover/.test(value), `${key}: the old repository name is still there`);
  }
});

void test('the editor line « Site non officiel. » exists and is never a content disclaimer (D0.1)', () => {
  const line = strings.get('independence.unofficial');
  assert.ok(line !== undefined, 'independence.unofficial is missing');
  assert.ok(wordsOf(line).length <= 4, `independence.unofficial is too long: "${line}"`);
  assert.ok(strings.has('attribution.card_maker'), 'attribution.card_maker is missing');
  assert.ok(
    /non officiel/i.test(strings.get('attribution.card_maker') ?? ''),
    'attribution.card_maker must say the card is not official',
  );
});
