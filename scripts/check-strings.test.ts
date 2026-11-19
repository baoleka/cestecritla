/**
 * Self-check for design/strings.json (the interface string kit).
 *
 * Guarantees (design/voice.md §1, §4, §6; D0.1, D0.32, D3.12, D10.2, D16):
 *   - the file is a flat map of string values plus one "$meta" object; keys are well formed,
 *     unique in the raw text (JSON.parse would silently keep the last duplicate) and sorted;
 *   - every sentence has at most 15 words (a {placeholder} counts for one), except the keys
 *     listed in ALLOWLIST with a reason;
 *   - no emoji at all (the one exception, the lait-fraise key, was withdrawn: D16.37); no
 *     "AEC Discover" (the working title, replaced by D10.2), no leftover {appName} placeholder;
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
 * The three places where the page says an AI is at work (art. 50 of the AI Act): under the field
 * before the first use, on a written answer, on a selection. Nothing else may sit in the family.
 */
const AI_NOTICE_KEYS: readonly string[] = ['chat.ai_hint', 'chat.ai_mention'];
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
  /^(degraded|silence|offline|quota|refusal|search|link|section|concept|play|q|riposte|chat|game|turtle)\./;

/**
 * A word at its start: `\b` is useless before an accented letter (JavaScript's word boundary
 * only knows ASCII), so "écartée" would pass a `\bécart` unnoticed.
 */
const startsWord = (stem: string): RegExp => new RegExp(`(?<![\\p{L}\\p{N}])${stem}`, 'iu');

/**
 * What a game says and this one must not (D16.10, D16.12): no reward, no rank, no verdict on the
 * reader — the reveal names a place, never an error — and no promise about the model.
 */
const GAME_SCOPE = /^(game|turtle|chat)\./;
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
    // No exception any more: the one key that carried two emoji, the lait-fraise line, was
    // withdrawn by the editor after the persona session (D16.37).
    const pictographs = value.match(/\p{Extended_Pictographic}/gu) ?? [];
    assert.deepEqual(pictographs, [], `${key}: emoji`);
  }
  assert.equal(
    [...strings.keys()].some((key) => key.startsWith('easter.')),
    false,
    'the easter family is withdrawn (D16.37)',
  );
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
const LIANT_KEYS: readonly string[] = [];

/** Liant keys a decision has withdrawn: their presence is a regression, not a leftover. */
const WITHDRAWN_LIANT_KEYS: Readonly<Record<string, string>> = {
  'chat.liant.partiel': 'D6.11 — affirme une exhaustivité fausse sur 9 écrans sur 40',
  'chat.liant.hors_sujet': 'D6.4 — servie à 5 questions qui portaient sur le programme',
  'chat.liant.confirme': 'D16.5 — une réponse ne commence jamais par « oui »',
  'chat.liant.corrige': 'D16.5 — une réponse ne corrige pas la personne qui demande',
  'chat.liant.precise': 'D16.5 — une nuance est un jugement porté sur la question',
  'chat.liant.absent': 'D16.4 — remplacée par refusal.not_found.*, que la recherche affiche déjà',
  'chat.liant.voici':
    'D16.47 — le modèle ne dit plus ce que prévoient les mesures : les phrases relues le disent',
  'chat.liant.where': 'D16.47 — la sélection par le modèle est retirée avec la réponse écrite',
};

/**
 * Strings that name a runtime AI. None of them may be rendered while the mode of
 * data/2026/ask.json is `off` (D16.4, D9.15, H-CNF-17g). Two keys are exempt on purpose:
 *   - about.no_ai says the opposite (it is the string of the "search only" mode);
 *   - about.writing_method names the AI used to WRITE the cards offline, which stays true —
 *     and so do concept.authorship.accepted and accuracy.review.accepted, which say it where
 *     it is owed since no page claims a human re-reading any more (D16.79).
 * Every other key of this list needs a rendered fallback, listed here next to it — `null` when
 * the surface it belongs to is simply not built in that mode.
 */
const RUNTIME_AI_KEYS: Readonly<Record<string, string | null>> = {
  'about.ai_limits': null,
  'about.ai_line': 'about.no_ai',
  'about.ai_method': 'about.no_ai',
  'about.gists_line': 'about.no_ai',
  'about.gists_method': 'about.no_ai',
  'about.gists_terms': null,
  'accuracy.review.sentences': null,
  // The same paragraph where the cards of the game show sentences too (D19.2, lot 7).
  'accuracy.review.sentences_game': null,
  'accuracy.review.terms': null,
  'chat.about.live': null,
  'chat.ai.start': null,
  'chat.ai.stop': null,
  'chat.ai.waiting': null,
  'chat.ai_badge': null,
  'chat.ai_hint': 'search.local_promise',
  'chat.ai_mention': null,
  'chat.gists.badge': null,
  'chat.human_reviewed_badge': null,
  'chat.hint': 'search.local_promise',
  'chat.offer.accept': null,
  'chat.offer.notice': null,
  'chat.offer.title': null,
  'chat.terms.badge': null,
  // The label of a sentence on a card of the game (D19.2): built only where the site asks.
  'game.gist.badge': null,
  'offline.chat': 'offline.chat.local',
  'privacy.chat.budget': null,
  'privacy.chat.choice': null,
  'privacy.chat.gists': null,
  'privacy.chat.kept': null,
  'privacy.chat.model': null,
  'privacy.chat.where': null,
  'privacy.chat.withdraw': null,
  'privacy.chat.words': null,
  'silence.chat': 'silence.chat.local',
};
const AI_EXEMPT = new Set([
  'about.no_ai',
  'about.writing_method',
  'concept.authorship.accepted',
  'accuracy.review.accepted',
]);
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

/**
 * Who wrote the sentences, and who checked them: an AI, both times (D16.59 — it replaces the
 * label of D16.56, « relues par l'éditeur », which stopped being true when the editor handed
 * the reading to the session, D16.57). AI Act, art. 50 § 4: a generated text published to
 * inform says that it is one. 48 characters hold on one line from 360 px (measured 14/11/2026).
 */
void test('the label of the sentences says an AI wrote and checked them (D16.59)', () => {
  const label = strings.get('chat.gists.badge') ?? '';
  assert.match(
    label,
    /écrites et vérifiées par une IA$/,
    'an AI wrote them, and an AI checked them',
  );
  assert.ok(label.length <= 48, `${String(label.length)} characters: two lines on a phone`);
  // The notice of the page that asks, where no model answers: it says an AI wrote them too —
  // impersonally, like every notice (D3.12), and short enough to stand under the field.
  const hint = strings.get('chat.hint') ?? '';
  assert.match(hint, /écrites d['’]avance par une IA/);
  assert.match(hint, /reste sur ce téléphone/);
  assert.ok(!/\b(tu|toi|ta|tes|ton)\b/i.test(hint), 'the notice is impersonal');
  assert.ok(
    !hint.includes('{model}') && !/Cloudflare/.test(hint),
    'it names no model: none is called',
  );
  assert.ok(hint.length <= MAX_AI_NOTICE_CHARS, `${String(hint.length)} characters`);
});

/**
 * The sentence a card of the game shows is one of those very sentences (D19.2): its label says
 * the same thing, of ONE sentence — and nothing more than the file of the game records of
 * itself (data/2026/game-gists.json: written by the session, read by no person).
 */
void test('the label of the sentence of a card says an AI wrote and checked it (D19.2)', () => {
  const label = strings.get('game.gist.badge') ?? '';
  assert.equal(label, 'Phrase écrite et vérifiée par une IA');
  // The singular of the sheet's label, word for word: one voice for the same sentences.
  assert.equal(
    label.replace('Phrase écrite et vérifiée', 'Phrases écrites et vérifiées'),
    strings.get('chat.gists.badge'),
  );
  assert.ok(label.length <= 48, `${String(label.length)} characters: two lines on a phone`);
  assert.ok(!/relu|lue? par|humain|personne/i.test(label), 'it claims no reading by a person');
});

/**
 * The explained words follow the same rule (D16.62): general knowledge an AI wrote ahead and
 * another checked, never re-read one by one by a person — the label says so in the form of the
 * label of the sentences, and the page that says how it is made says where they come from.
 */
void test('the label of the explained words says an AI wrote and checked them, and its page says where they come from (D16.62)', () => {
  const label = strings.get('chat.terms.badge') ?? '';
  assert.equal(label, 'Explications écrites et vérifiées par une IA');
  assert.ok(label.length <= 48, `${String(label.length)} characters: two lines on a phone`);
  const terms = JSON.parse(readFileSync('data/2026/terms.json', 'utf8')) as {
    meta: { read_by_a_person?: unknown; checked_by?: unknown };
  };
  // What the label and the pages say rests on what the file records of itself.
  assert.equal(terms.meta.read_by_a_person, false);
  assert.equal(terms.meta.checked_by, 'independent-model');
  const method = strings.get('about.gists_terms') ?? '';
  assert.match(
    method,
    /Une IA a écrit ces explications d['’]avance, puis une autre les a vérifiées/,
  );
  assert.match(method, /connaissances générales, pas du livre/);
  assert.match(method, /jamais ce que prévoit le programme/);
  assert.match(method, /Personne ne les a relues une à une/);
  const accuracy = strings.get('accuracy.review.terms') ?? '';
  assert.match(accuracy, /Une IA les a écrites, une autre les a vérifiées/);
  assert.ok(!/relu(?:e|es|s)? par (?:l['’]éditeur|Baoleka|une personne)/.test(method + accuracy));
});

/**
 * What the site may say of who READ the sentences is held to who did (D16.59): the deposit
 * records it in data/2026/ask.json (`gists.read_by`, from the verdicts — scripts/gists-core.ts,
 * `readBy`). Unless that line says the editor read every one of them, no string of the kit may
 * say a person did.
 */
void test('no string says a person read the sentences unless the editor did (D16.59)', () => {
  const ask = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as {
    gists?: { read_by?: unknown };
  };
  const reader = ask.gists?.read_by ?? null;
  assert.ok(
    reader === null || reader === 'editor' || reader === 'session' || reader === 'both',
    'data/2026/ask.json: gists.read_by is "editor", "session", "both" or null',
  );
  if (reader === 'editor') return;
  const CLAIMS =
    /phrases? (?:re)?lues?\b|(?:re)?lues? par l['’]éditeur|(?:re)?lues? par (?:une personne|un humain|Baoleka)/i;
  for (const [key, value] of strings) {
    if (!/phrase/i.test(value)) continue;
    assert.ok(!CLAIMS.test(value), `${key}: says the sentences were read by a person — "${value}"`);
  }
});

/**
 * What the site may say of who RE-READ our own texts — the fifteen answers, the five cards — is
 * held to what their files record (D16.79), as it is for the sentences (D16.59). Each entry says
 * its state, and a string that names a reader is rendered only where every text concerned was
 * re-read by a person (src/components/Authorship.astro, src/pages/exactitude/). So the strings
 * that claim a re-reading are those two and no other — and what an « accepted » text shows
 * claims none: until 15/11/2026 the site said « relu par Baoleka » on dates written by default.
 */
void test('no string says a person re-read our own texts, but the two kept for the day one has (D16.79)', () => {
  const CLAIMS =
    /(?:re)?lu(?:e|es|s)? par (?:l['’]éditeur|Baoleka|une personne|un humain|nous)|relu(?:e|es|s)? à la main|relecture (?:faite|en cours)/i;
  const FOR_REVIEWED_ONLY = new Set(['concept.authorship.reviewed', 'accuracy.review.done']);
  for (const [key, value] of strings) {
    if (FOR_REVIEWED_ONLY.has(key)) continue;
    assert.ok(!CLAIMS.test(value), `${key}: claims a re-reading by a person — "${value}"`);
  }
  for (const key of FOR_REVIEWED_ONLY) assert.ok(strings.has(key), key);
  // What an accepted text shows says what it is: prepared with an AI, and no reader is named.
  for (const key of ['concept.authorship.accepted', 'accuracy.review.accepted']) {
    const value = strings.get(key) ?? '';
    assert.match(value, /avec une IA/, key);
    assert.ok(!value.includes(PSEUDONYM), `${key} names a reader`);
  }
  assert.match(strings.get('accuracy.review.accepted') ?? '', /Personne ne les a relus un à un/);
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

void test('the card « Garder » names the gesture that erases by the label of its button', () => {
  // Written in clear, like every value a decision fixed ($meta.placeholders_rule_fr) — so this
  // is what keeps the sentence and the button from drifting apart. None of the seven personas
  // could say how to erase from the card (13-tests-humains.md §7, session of 14/11/2026).
  const line = strings.get('turtle.keep.erase') ?? '';
  const label = strings.get('turtle.erase') ?? '';
  assert.notEqual(label, '');
  assert.ok(line.includes(`«${NBSP}${label}${NBSP}»`), `turtle.keep.erase must quote "${label}"`);
  assert.match(line, /touche ta tortue/, 'her sheet opens by touching her: the line says so');
});

void test('the share button names what it sends: a link (D16.17)', () => {
  // Under « Rien n'est envoyé », a button « Envoyer le jeu » read to four personas out of seven
  // as a contradiction. It only ever shares the bare address of the site.
  assert.match(strings.get('game.share') ?? '', /\blien\b/);
});

void test('the home page says whose programme this is and whose site, in the words of the kit', () => {
  // The first screen named neither to any of the seven personas (session of 14/11/2026).
  const what = strings.get('home.what') ?? '';
  assert.match(what, /La France insoumise/);
  assert.match(what, /L'Avenir en commun, édition 2026/);
  assert.match(what, /projet militant indépendant/);
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
