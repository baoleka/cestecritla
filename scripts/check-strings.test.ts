/**
 * Self-check for design/strings.json (the interface string kit).
 *
 * Guarantees (design/voice.md §1, §4, §6; D0.1, D0.32, D3.12, D10.2, D16):
 *   - the file is a flat map of string values plus one "$meta" object; keys are well formed,
 *     unique in the raw text (JSON.parse would silently keep the last duplicate) and sorted;
 *   - every sentence has at most 15 words (a {placeholder} counts for one), except the keys
 *     listed in ALLOWLIST with a reason;
 *   - no emoji, except the two of the one lait-fraise key (D16.20); no "AEC Discover" (the
 *     working title, replaced by D10.2), no leftover {appName} placeholder;
 *   - the AI notices are at most 140 characters, impersonal, and name the model by {model} —
 *     the bench chooses it (D16.3) — and its host;
 *   - French typography: no-break space before : ; ! ? » % and after «, no U+202F (absent from
 *     the self-hosted fonts, design/fonts/README.md), a single "…" character;
 *   - placeholders are declared in $meta.placeholders_fr, and every declaration is used;
 *   - the public pseudonym and the repository URL are written in clear, and no string carries a
 *     literal e-mail address or a personal path;
 *   - degraded / silence / offline / quota strings never use a breakdown word (voice rule 5),
 *     and neither do the question, the game and the turtle;
 *   - no string says the programme does NOT hold something (non-negotiable since D16);
 *   - the game has no word of reward, rank or verdict, and the turtle is named only in her own
 *     family (D16.10 to D16.12, D16.20).
 *
 * Run: npx tsx --test scripts/check-strings.test.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const MAX_WORDS_PER_SENTENCE = 15;
const MAX_AI_NOTICE_CHARS = 140;
const NBSP = String.fromCodePoint(0xa0);

/**
 * The one key that may carry emoji, and the only two it may carry (D16.20): the strawberry and
 * the glass of milk of the lait-fraise line. Written as code points so that no editor, shell or
 * tool decides which characters they are on the way here.
 */
const EASTER_KEY = 'easter.strawberry_milk';
const EASTER_EMOJI: readonly string[] = [0x1f353, 0x1f95b].map((code) =>
  String.fromCodePoint(code),
);

/**
 * The three places where the page says an AI is at work (art. 50 of the AI Act): under the field
 * before the first use, on a written answer, on a selection. Nothing else may sit in the family.
 */
const AI_NOTICE_KEYS: readonly string[] = [
  'chat.ai_hint',
  'chat.ai_mention',
  'chat.ai_mention.select',
];
/** Room for the longest name the bench could print: "Mistral Small 3.1" has 17 characters. */
const LONGEST_MODEL_NAME = 'x'.repeat(24);

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
const EMPTY_ALLOWED = new Set(['mascot.name']); // D16.20: the turtle has no name — "ta tortue".

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
  /^(degraded|silence|offline|quota|refusal|search|link|section|concept|play|q|riposte|chat|game|turtle|easter)\./;

/**
 * A word at its start: `\b` is useless before an accented letter (JavaScript's word boundary
 * only knows ASCII), so "écartée" would pass a `\bécart` unnoticed.
 */
const startsWord = (stem: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}])${stem}`, 'iu');

/**
 * What a game says and this one must not (D16.10, D16.12): no reward, no rank, no verdict on the
 * reader — the reveal names a place, never an error — and no promise about the model.
 */
const GAME_SCOPE = /^(game|turtle|chat|easter)\./;
const GAME_BANNED: readonly [string, RegExp][] = [
  ['bravo', startsWord('bravo')],
  ['félicitations', startsWord('félicit')],
  ['quiz', startsWord('quiz')],
  ['faux', startsWord('fau(?:x|sse)')],
  ['correct', startsWord('correct')],
  ['bonne réponse', startsWord('bonnes? réponses?')],
  ['mauvais', startsWord('mauvais')],
  ['raté', startsWord('rat(?:ée?s?|er)(?![\\p{L}])')],
  ['score', startsWord('score')],
  ['points', startsWord('points?(?![\\p{L}])')],
  ['niveau', startsWord('niveau')],
  ['classement', startsWord('class(?:ement|é)')],
  ['record', startsWord('record')],
  ['gagner', startsWord('gagn')],
  ['perdre', startsWord('perd')],
  ['écarté', startsWord('écart')],
  ['absent', startsWord('absen')],
  ['expert', startsWord('expert')],
];

/**
 * Ways of saying that the programme does NOT hold something. The index only knows the measures,
 * not the prose around them: any such sentence can be refuted with Ctrl-F on the official page,
 * under our name. So the interface says what it found and where, and nothing about the rest.
 */
const ABSENCE: readonly RegExp[] = [
  /n'en (?:parle|dit|traite) pas/i,
  /ne (?:parle|traite) pas d/i,
  /ne (?:dit|prévoit|propose|contient) (?:pas|rien)/i,
  /aucune (?:mesure|proposition|section) ne /i,
  /nulle part/i,
  /pas dans le (?:texte|programme|livre)/i,
  /absente?s? du (?:texte|programme|livre)/i,
];

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
    assert.equal(value, value.trim(), `${key}: leading or trailing space`);
    const pictographs = value.match(/\p{Extended_Pictographic}/gu) ?? [];
    if (key !== EASTER_KEY) {
      assert.deepEqual(pictographs, [], `${key}: emoji`);
      continue;
    }
    // The lait-fraise line: its two emoji or none at all, each once, and no third (D16.20).
    for (const emoji of pictographs) {
      assert.ok(EASTER_EMOJI.includes(emoji), `${key}: an emoji that is not one of its two`);
    }
    assert.equal(new Set(pictographs).size, pictographs.length, `${key}: an emoji twice`);
    assert.ok(
      pictographs.length === 0 || pictographs.length === EASTER_EMOJI.length,
      `${key}: the strawberry and the glass of milk go together`,
    );
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

void test('the AI notices name the model and its host, impersonally, in 140 characters (D16.3, art. 50)', () => {
  for (const key of AI_NOTICE_KEYS) {
    const value = strings.get(key);
    assert.ok(value !== undefined, `${key} is missing`);
    const printed = value.replace('{model}', LONGEST_MODEL_NAME);
    assert.ok(
      printed.length <= MAX_AI_NOTICE_CHARS,
      `${key}: ${String(printed.length)} characters`,
    );
    assert.ok(/\bIA\b/.test(value), `${key}: does not say an AI is at work`);
    // The name is data (data/2026/ask.json), never a word of the kit: the bench chooses it.
    assert.ok(value.includes('{model}'), `${key}: does not name the model`);
    assert.ok(value.includes('Cloudflare'), `${key}: does not say where the model is hosted`);
    assert.ok(
      !/\b(tu|toi|ta|tes|ton)\b/i.test(value),
      `${key}: the notice must be impersonal (D3.12)`,
    );
  }
  // A fourth wording in the family would ship without any of the checks above.
  const family = [...strings.keys()].filter(
    (key) => key === 'chat.ai_hint' || key.startsWith('chat.ai_mention'),
  );
  assert.deepEqual(family.sort(), [...AI_NOTICE_KEYS].sort());
  assert.ok((strings.get('chat.ai_badge') ?? '').includes('{model}'), 'chat.ai_badge names it');
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

void test('no string says the programme does not hold something (non-negotiable, D16)', () => {
  for (const [key, value] of strings) {
    for (const pattern of ABSENCE) {
      assert.ok(!pattern.test(value), `${key}: affirms an absence ("${value}")`);
    }
  }
  // The patterns catch what they are for.
  for (const sample of [
    "Le programme n'en parle pas.",
    'Aucune mesure ne répond à ça.',
    "Ce n'est pas dans le texte.",
    'Ce mot est absent du programme.',
    "L'Avenir en commun ne traite pas de ça.",
  ]) {
    assert.ok(
      ABSENCE.some((pattern) => pattern.test(sample)),
      `not caught: ${sample}`,
    );
  }
});

void test('the question, the game and the turtle reward, rank and judge nobody (D16.10, D16.12)', () => {
  for (const [key, value] of strings) {
    if (!GAME_SCOPE.test(key)) continue;
    for (const [word, pattern] of GAME_BANNED) {
      assert.ok(!pattern.test(value), `${key}: "${word}" in "${value}"`);
    }
  }
  // A banned word is no use if its accent or its plural hides it from the pattern.
  for (const sample of [
    'Bravo !',
    'Deux tuiles écartées.',
    "C'est faux.",
    'Niveau 2',
    'Raté.',
    'Trois points',
    'Tu as gagné.',
    'Un expert du programme',
  ]) {
    assert.ok(
      GAME_BANNED.some(([, pattern]) => pattern.test(sample)),
      `not caught: ${sample}`,
    );
  }
  // …and words that only look like one are left alone.
  for (const sample of ['Il faut un mot.', 'La pointe du crayon', 'Un rateau']) {
    assert.ok(
      GAME_BANNED.every(([, pattern]) => !pattern.test(sample)),
      `caught by mistake: ${sample}`,
    );
  }
});

// -------------------------------------------------------------------------------------------
// Gates added by the panel rouge (T12), docs/discovery/13-tests-humains.md §T12 — rewritten for
// D16: a model writes the answer, under gates, and the mode is data (data/2026/ask.json).

/**
 * The two openings an answer can have (D16.4), and nothing else in the family. `voici` opens a
 * written answer; `where` opens a selection — the model chose and wrote nothing, or no model
 * ran. Neither confirms, corrects nor qualifies: the reader concludes.
 */
const LIANT_KEYS: readonly string[] = ['chat.liant.voici', 'chat.liant.where'];

/** Liant keys a decision has withdrawn: their presence is a regression, not a leftover. */
const WITHDRAWN_LIANT_KEYS: Readonly<Record<string, string>> = {
  'chat.liant.partiel': 'D6.11 — affirme une exhaustivité fausse sur 9 écrans sur 40',
  'chat.liant.hors_sujet': 'D6.4 — servie à 5 questions qui portaient sur le programme',
  'chat.liant.confirme': 'D16.5 — une réponse ne commence jamais par « oui »',
  'chat.liant.corrige': 'D16.5 — une réponse ne corrige pas la personne qui demande',
  'chat.liant.precise': 'D16.5 — une nuance est un jugement porté sur la question',
  'chat.liant.absent': 'D16.4 — remplacée par refusal.not_found.*, que la recherche affiche déjà',
};

/**
 * Strings that name a runtime AI. None of them may be rendered while the mode of
 * data/2026/ask.json is `off` (D16.4, D9.15, H-CNF-17g). Two keys are exempt on purpose:
 *   - about.no_ai says the opposite (it is the string of the "search only" mode);
 *   - about.writing_method names the AI used to WRITE the cards offline, which stays true.
 * Every other key of this list needs a rendered fallback, listed here next to it — `null` when
 * the surface it belongs to is simply not built in that mode.
 */
const RUNTIME_AI_KEYS: Readonly<Record<string, string | null>> = {
  'about.ai_line': 'about.no_ai',
  'about.ai_method': 'about.no_ai',
  'chat.ai_badge': null,
  'chat.ai_hint': 'search.local_promise',
  'chat.ai_mention': null,
  'chat.ai_mention.select': null,
  'chat.waiting': null,
  'offline.chat': 'offline.chat.local',
  'privacy.policy.02': 'privacy.policy.02.local',
  'quota.title': 'quota.title.local',
  'silence.chat': 'silence.chat.local',
};
const AI_EXEMPT = new Set(['about.no_ai', 'about.writing_method']);
const AI_PATTERN = /\bIA\b|intelligence artificielle|Mistral|assistant|modèle|\{model\}/i;

void test('an answer opens in one of two ways, and no withdrawn liant came back (D16.4, D16.5)', () => {
  const liantKeys = [...strings.keys()].filter((key) => key.startsWith('chat.liant.'));
  assert.deepEqual(liantKeys.sort(), [...LIANT_KEYS].sort());
  for (const [key, why] of Object.entries(WITHDRAWN_LIANT_KEYS)) {
    assert.ok(!strings.has(key), `${key} is back in the kit (${why})`);
  }
  for (const key of LIANT_KEYS) {
    assert.ok(
      !/^(oui|non|si|c'est (vrai|faux))(?![\p{L}])/iu.test(strings.get(key) ?? ''),
      `${key}: an opening that takes a side`,
    );
  }
  // The two other outcomes of a question: nothing found with these words, and off the subject.
  for (const key of ['refusal.not_found.title', 'refusal.off_topic']) {
    assert.ok(strings.has(key), `${key} is missing from the kit`);
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
    assert.ok(strings.has(fallback), `${key}: no fallback string ${fallback} for the mode "off"`);
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

void test('the turtle is named only in her own family, has no name, and is not the official one (D16.11, D16.20)', () => {
  for (const [key, value] of strings) {
    assert.ok(!/marcheuse/i.test(value), `${key}: uses the working name of the September mascot`);
    assert.ok(!/sagace/i.test(value), `${key}: the epithet of the official turtle`);
    if (!/tortue/i.test(value)) continue;
    assert.ok(
      /^(turtle|privacy)\./.test(key),
      `${key}: names the turtle outside turtle.* and privacy.* ("${value}")`,
    );
    // A common noun, never a proper one: a capital only where a sentence starts.
    for (const match of value.matchAll(/Tortue/g)) {
      const before = value.slice(0, match.index).trimEnd();
      assert.ok(before === '' || /[.!?…]$/.test(before), `${key}: "Tortue" written as a name`);
    }
  }
  assert.equal(strings.get('mascot.name'), '', 'the turtle has no name');
  assert.equal(strings.get('turtle.button'), 'Ta tortue', 'the interface says "ta tortue"');
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
