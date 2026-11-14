/**
 * "No AI mention without AI" (D9.15, H-CNF-17g, blocking) — and no mention of any component
 * that is not deployed.
 *
 * Since D16 a model may be at work, and whether it is is DATA (data/2026/ask.json, D16.4):
 * "chat" (D16.45 to D16.51) or "off". This gate follows that file. While the mode is "off" —
 * the state of production since D16.33 — the site is deployed as static files, no model runs,
 * and everything below applies as it always did. When the mode opens, the gate inverts page by
 * page: the notice is REQUIRED where the model may explain — the home page — allowed on the
 * four pages that explain it, and forbidden everywhere else. That half is exercised today on
 * dist-ask/, the test build of the sheet (`npm run build:ask`), so that it is not discovered
 * broken on the day the mode opens.
 *
 * The dossier first wrote this gate on KEY NAMES: "a `chat.*` or `*.ai_*` string". Measured, that
 * pattern misses five of the strings it must catch — `offline.chat`, `silence.chat`,
 * `quota.title`, `privacy.policy.02` and `privacy.policy.06`. Which means an app with no AI
 * announced one to every visitor who was OFFLINE, and during both electoral silence windows:
 * the exact opposite of what art. 50 of the AI Act asks. So the gate is written on CONTENT.
 *
 * It is also written against the BUILD OUTPUT, not against the kit. What matters is not which
 * strings exist — the v3 variants are kept on purpose, ready to reinstate in three hours — but
 * which ones actually ship. design/strings.json holds 13 strings naming an AI while the `ai`
 * binding is absent from wrangler.jsonc; that is correct, as long as none of them reaches a page.
 *
 * Two exemptions, named rather than pattern-matched:
 *   about.no_ai           says there is no AI. A gate reading "no page mentions an AI" would
 *                         delete the sentence that tells the truth.
 *   about.writing_method  the OFFLINE writing tool, which stays true and must survive. D6.10
 *                         constrains execution, never fabrication (D9.15, D14.4).
 *
 * Run: npx tsx --test scripts/check-no-ai-mention.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { appVoiceOnly } from './app-voice.js';
import { MODELS, isModelKey } from '../src/worker/models.js';
import {
  CHAT_CONFIG,
  STATIC_CONFIG,
  WORKER_CONFIG,
  builtAskMode,
  wranglerConfig,
} from './build-mode.js';
import { isChatPrivacyKey } from './launch.js';

const strings = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, unknown>;
/** What the build in dist/ does with a question: the mode of the host it was made for. */
const askMode = builtAskMode();

/** A runtime AI, or a component that is not deployed while the mode is "off". */
const MENTIONS_ABSENT_COMPONENT =
  /\bIA\b|intelligence artificielle|Mistral|Llama|Gemma|gpt-oss|assistant|Turnstile/i;

const EXEMPT = new Set(['about.no_ai', 'about.writing_method']);

/** Whether a configuration binds a model — read in the file, not in the sketch of 09-architecture.md §2. */
const bindsAi = (config: string): boolean =>
  /"ai"\s*:/.test(readFileSync(config, 'utf8').replace(/\/\/.*$/gm, ''));

const htmlFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
};

void test('a model is bound only where a script runs, and the pages of production never go out with one (D16.4, lot C10)', () => {
  // Static files: no script, so no model can exist. That is what "off" deploys anywhere — and
  // what the apex gets in every mode: its chat is a Worker of its own.
  assert.equal(bindsAi(STATIC_CONFIG), false, `${STATIC_CONFIG}: the AI binding`);
  assert.equal(wranglerConfig('app', 'off', 'preview'), STATIC_CONFIG);
  for (const mode of ['off', 'chat', 'bench'] as const) {
    assert.equal(wranglerConfig('app', mode, 'apex'), STATIC_CONFIG, mode);
    // The holding page never runs anything, whatever the mode.
    assert.equal(wranglerConfig('holding', mode, 'apex'), STATIC_CONFIG, mode);
    assert.equal(wranglerConfig('holding', mode, 'preview'), STATIC_CONFIG, mode);
  }
  // A model exists in the two configurations that carry the script, and nowhere else.
  for (const config of [WORKER_CONFIG, CHAT_CONFIG]) {
    assert.equal(bindsAi(config), true, `${config}: the AI binding`);
  }
  // No configuration carries a bot check, in any mode: there is none (D16.23).
  for (const config of [STATIC_CONFIG, WORKER_CONFIG, CHAT_CONFIG]) {
    const code = readFileSync(config, 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, /turnstile/i, `${config}: Turnstile`);
  }
});

/**
 * The sentences that may name an AI on any page, in the two forms a page prints them: the kit
 * types straight apostrophes, the pages show typographic ones (src/lib/strings.ts).
 */
const exemptText = [...EXEMPT]
  .map((k) => strings[k])
  .filter((v): v is string => typeof v === 'string')
  .flatMap((v) => [v, v.replace(/'/g, '’')]);

/** Pages of a build whose own voice names an AI or Turnstile, each with the words around it. */
function mentions(root: string): Map<string, string> {
  const found = new Map<string, string>();
  for (const page of htmlFiles(root)) {
    let body = appVoiceOnly(readFileSync(page, 'utf8'));
    for (const allowed of exemptText) body = body.split(allowed).join('');
    const hit = MENTIONS_ABSENT_COMPONENT.exec(body);
    if (hit === null) continue;
    const at = Math.max(0, hit.index - 60);
    found.set(
      page.slice(root.length + 1),
      `…${body.slice(at, hit.index + 60).replace(/\s+/g, ' ')}…`,
    );
  }
  return found;
}

/**
 * Where a site that answers questions may speak of its AI: the page that asks, and the four
 * that say how it works, what it keeps, and who is behind it. A section page, a bridge, an
 * answer written by a person, the table of contents: none of them has anything to say about it.
 */
const PAGES_THAT_EXPLAIN = [
  'index.html',
  'exactitude/index.html',
  'methodologie/index.html',
  'confidentialite/index.html',
  'a-propos/index.html',
];

/** A name of our catalogue of models, as a page would print it. */
const ANY_MODEL = new RegExp(
  Object.values(MODELS)
    .map((spec) => spec.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
);

/**
 * Everything wrong with the notices of a build whose field asks WITHOUT a live AI (D16.60):
 * sentences written ahead answer, an AI wrote and checked them — the pages say exactly that,
 * and nothing of a model that would explain, of a button that would call it, of an editor who
 * would have read each sentence (D16.59).
 */
function sheetProblems(root: string): string[] {
  const problems: string[] = [];
  const read = (page: string): string => appVoiceOnly(readFileSync(join(root, page), 'utf8'));
  const home = read('index.html');
  // Art. 50 § 4: a text an AI generated, published to inform, says so — before the first use.
  if (!/Demander affiche des phrases écrites d’avance par une IA/.test(home)) {
    problems.push('index.html does not say, before the first use, that an AI wrote the sentences');
  }
  if (
    !/Phrases écrites et vérifiées par une IA/.test(readFileSync(join(root, 'index.html'), 'utf8'))
  ) {
    problems.push(
      'index.html does not carry the label of the sentences: written and checked by an AI',
    );
  }
  const raw = readFileSync(join(root, 'index.html'), 'utf8');
  if (/id="chat-offer"|id="chat-ai-stop"|id="chat-ai-start"/.test(raw)) {
    problems.push('index.html carries the offer of an AI that does not exist');
  }
  const privacy = read('confidentialite/index.html');
  if (!/<h2 id="demander"/.test(readFileSync(join(root, 'confidentialite/index.html'), 'utf8'))) {
    problems.push('confidentialite has no section about asking');
  }
  if (
    !/Un seul envoi, pas plus/.test(privacy) ||
    !/Demander envoie les numéros des mesures trouvées, pas ta phrase/.test(privacy) ||
    !/Ta question ne quitte jamais ton téléphone/.test(privacy)
  ) {
    problems.push('confidentialite does not say what « Demander » sends, and that it is all');
  }
  if (
    !/On n’enregistre rien de cet envoi/.test(privacy) ||
    !/rien n’est écrit sur ton téléphone/.test(privacy)
  ) {
    problems.push('confidentialite does not say what is kept of what is sent: nothing, anywhere');
  }
  if (!/Effacer la conversation/.test(privacy)) {
    problems.push('confidentialite does not say how to empty the thread');
  }
  for (const page of PAGES_THAT_EXPLAIN) {
    const body = read(page);
    // No model is called: none is named, none is offered, and none is said to explain.
    if (ANY_MODEL.test(body)) problems.push(`${page} names a model, and none is called`);
    if (/Expliquer avec l’IA|Ne plus demander à l’IA|explique sur demande|IA ·/.test(body)) {
      problems.push(`${page} speaks of an AI that would answer live`);
    }
    if (/sans garantie de rester en Europe|ce que l’IA consomme/.test(body)) {
      problems.push(`${page} describes the call of a model that is never made`);
    }
    // Who read: an AI. No page says a person read each sentence (D16.59).
    if (/relues? par l’éditeur|lues par l’éditeur|phrases relues/.test(body)) {
      problems.push(`${page} says a person read the sentences`);
    }
  }
  for (const page of ['a-propos/index.html', 'exactitude/index.html', 'methodologie/index.html']) {
    if (!/Une IA (les a écrites|a écrit chaque phrase)/.test(read(page))) {
      problems.push(`${page} does not say who wrote the sentences`);
    }
  }
  if (!/Personne ne les a relues une à une/.test(read('exactitude/index.html'))) {
    problems.push('exactitude does not say that nobody re-read the sentences one by one');
  }
  if (!/Aucune IA ne répond en direct/.test(read('methodologie/index.html'))) {
    problems.push('methodologie does not say that no AI answers live');
  }
  // « Aucune IA ne répond ici : l’app cherche… » is the sentence of a site that asks nothing.
  const denial = String(strings['about.no_ai']).replace(/'/g, '’');
  for (const page of PAGES_THAT_EXPLAIN) {
    if (read(page).includes(denial)) problems.push(`${page} still says the app only searches`);
  }
  return problems;
}

/**
 * Everything wrong with the AI notices of a build made for the given mode — `model` null: the
 * field asks, and no model answers (D16.60).
 */
function noticeProblems(root: string, mode: 'off' | 'chat', model: string | null): string[] {
  const named = mentions(root);
  if (mode === 'off') {
    return [...named].map(([page, around]) => `${page} names an absent component: ${around}`);
  }
  const problems: string[] = [];
  for (const [page, around] of named) {
    if (!PAGES_THAT_EXPLAIN.includes(page)) problems.push(`${page} has no reason to: ${around}`);
  }
  if (model === null) return [...problems, ...sheetProblems(root)];
  const read = (page: string): string => appVoiceOnly(readFileSync(join(root, page), 'utf8'));
  // Art. 50: at the latest at the first interaction — so before it, on the page that asks.
  const home = read('index.html');
  if (
    !/Demander donne des phrases brèves\. Une IA \(/.test(home) ||
    !/explique sur demande/.test(home)
  ) {
    problems.push(
      'index.html does not say, before the first use, what asking gives and that an AI explains only when asked',
    );
  }
  // The offer is in the page before it is made: what the AI is sent — never the question —
  // and the one button that asks for it (D16.53).
  if (
    !/Ta question ne lui est pas envoyée/.test(home) ||
    !/seulement les mots de ces phrases/.test(home) ||
    !/Expliquer avec l’IA/.test(home)
  ) {
    problems.push('index.html does not carry the offer: what the AI is sent, and its one button');
  }
  // …and nothing of the agreement that was asked for one day: there is nothing to agree to.
  if (/J’accepte que cette IA lise ma question|Non, sans IA|15 ans ou plus/.test(home)) {
    problems.push('index.html still asks for an agreement to send a question');
  }
  if (!home.includes(model)) problems.push('index.html does not name the model');
  if (!home.includes('Cloudflare')) problems.push('index.html does not say where the AI is hosted');
  // The page that says what is kept must say what leaves at each gesture, and where it goes.
  const privacy = read('confidentialite/index.html');
  // The offer of the sheet links to the section: it has to be there to land on.
  if (!/<h2 id="demander"/.test(readFileSync(join(root, 'confidentialite/index.html'), 'utf8'))) {
    problems.push('confidentialite has no section the offer of the sheet can link to');
  }
  if (!/Demander envoie les numéros des mesures trouvées, pas ta phrase/.test(privacy)) {
    problems.push('confidentialite does not say what « Demander » sends');
  }
  if (
    !/envoie aussi les mots de ces phrases que ta question emploie/.test(privacy) ||
    !/jamais ta question/.test(privacy) ||
    !/Ta question ne quitte jamais ton téléphone/.test(privacy)
  ) {
    problems.push('confidentialite does not say that the question never leaves, nor what does');
  }
  if (/Ta question ne part que si tu l’acceptes|C’est ton accord qui permet/.test(privacy)) {
    problems.push('confidentialite still says that the question leaves after an agreement');
  }
  if (!privacy.includes(model)) problems.push('confidentialite does not name the model');
  // Where the model runs is not ours to choose: the page promises no place it cannot hold.
  if (!/sans garantie de rester en Europe/.test(privacy)) {
    problems.push('confidentialite does not say that the model may run outside Europe');
  }
  if (/en Europe ou aux États-Unis/.test(privacy)) {
    problems.push('confidentialite promises a place for the model that nothing guarantees');
  }
  if (
    !/On n’enregistre rien de ces envois/.test(privacy) ||
    !/rien n’est écrit sur ton téléphone/.test(privacy)
  ) {
    problems.push('confidentialite does not say what is kept of what is sent: nothing, anywhere');
  }
  // « Nothing is kept », bare, would speak for the host too: each says what it keeps.
  if (!/Cloudflare écrit ne pas les conserver/.test(privacy)) {
    problems.push('confidentialite does not say what the host of the model writes it keeps');
  }
  if (!/L’IA n’explique que si tu appuies/.test(privacy)) {
    problems.push('confidentialite does not say whose choice the AI is');
  }
  if (!/Ne plus demander à l’IA/.test(privacy) || !/Effacer la conversation/.test(privacy)) {
    problems.push('confidentialite does not say how to stop, nor how to empty the thread');
  }
  // The call of the chat goes through no cache: nothing is kept « thirty days » any more.
  if (/trente jours/.test(privacy)) problems.push('confidentialite still speaks of a cache');
  if (/Turnstile/.test(privacy)) problems.push('confidentialite names a bot check there is not');
  // And no page may still say that no AI answers here: it would now be false.
  const denial = String(strings['about.no_ai']).replace(/'/g, '’');
  for (const page of PAGES_THAT_EXPLAIN) {
    if (read(page).includes(denial)) problems.push(`${page} still says no AI answers here`);
  }
  return problems;
}

/** The name the notices print for the model data/2026/ask.json names — null: it names none. */
function configuredModel(): string | null {
  const file = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as { model?: unknown };
  return isModelKey(file.model) ? MODELS[file.model].name : null;
}

void test('the built app speaks of an AI exactly where its mode says one is at work', () => {
  if (htmlFiles('dist').length === 0) {
    console.log('  (skipped: no dist/ — run `npm run build` first)');
    return;
  }
  if (!existsSync('dist/sommaire/index.html')) return; // a holding build: two pages, no AI
  assert.deepEqual(noticeProblems('dist', askMode, configuredModel()), []);
});

void test('the sheet, built for its tests, carries its notices and no page too many', () => {
  if (!existsSync('dist-ask/index.html')) {
    console.log('  (skipped: no dist-ask/ — run `npm run build:ask` first)');
    return;
  }
  // The test build pretends the mode is "chat" with the first candidate of the catalogue.
  assert.deepEqual(noticeProblems('dist-ask', 'chat', MODELS['mistral-small-3.1'].name), []);
  // The rule sees what it is for: the same pages judged as a site without AI are all refused.
  const asOff = noticeProblems('dist-ask', 'off', '');
  for (const page of PAGES_THAT_EXPLAIN) {
    assert.ok(
      asOff.some((problem) => problem.startsWith(page)),
      `${page} was not seen`,
    );
  }
  // …and judged as the sheet without a live AI, the model they name and the offer are seen.
  const asSheet = noticeProblems('dist-ask', 'chat', null);
  assert.ok(asSheet.some((problem) => /names a model, and none is called/.test(problem)));
  assert.ok(
    asSheet.some((problem) => /carries the offer of an AI that does not exist/.test(problem)),
  );
});

void test('the sheet as it opens — no live AI — says who wrote the sentences, and offers no model (D16.59, D16.60)', () => {
  if (!existsSync('dist-gists/index.html')) {
    console.log('  (skipped: no dist-gists/ — run `npm run build:gists` first)');
    return;
  }
  assert.deepEqual(noticeProblems('dist-gists', 'chat', null), []);
  // The same pages, judged as a site that asks nothing, are refused: they name an AI.
  assert.ok(noticeProblems('dist-gists', 'off', '').length > 0);
  // …and judged as the sheet with a model, they lack its notice, its offer and its name.
  const asAi = noticeProblems('dist-gists', 'chat', MODELS['mistral-small-3.1'].name);
  assert.ok(asAi.some((problem) => /does not name the model/.test(problem)));
  assert.ok(asAi.some((problem) => /does not carry the offer/.test(problem)));
});

void test('the privacy page shows what the chat adds exactly where the field asks — and all of it', () => {
  // Two readings by the editor, dated apart (scripts/launch.ts): the page of « search only »,
  // and what the chat adds. The split holds only if the first page shows none of the second.
  const added = Object.entries(strings).filter(
    (entry): entry is [string, string] =>
      isChatPrivacyKey(entry[0]) && typeof entry[1] === 'string',
  );
  assert.ok(added.length >= 10, 'the kit names what the chat adds to the page');
  // What a string prints, up to its first placeholder, with the apostrophes of the page.
  const printed = (value: string): string => (value.split('{')[0] ?? '').replace(/'/g, '’').trim();
  const page = (root: string): string | null => {
    const file = join(root, 'confidentialite/index.html');
    return existsSync(file) && existsSync(join(root, 'sommaire/index.html'))
      ? readFileSync(file, 'utf8').replace(/&nbsp;/g, '\u00a0')
      : null;
  };
  const quiet = askMode === 'off' ? page('dist') : null;
  // Two pages of a site that asks: with a model that explains (closed since D16.60, built for
  // its tests), and as the sheet opens — one sending, no model.
  const asking = page('dist-ask');
  const sheet = page('dist-gists');
  if (quiet === null && asking === null && sheet === null) {
    console.log('  (skipped: no build)');
    return;
  }
  for (const [key, value] of added) {
    const text = printed(value);
    assert.ok(text.length >= 8, `${key}: too short to be told apart`);
    if (quiet !== null)
      assert.ok(!quiet.includes(text), `${key} is on the page of a site that asks nothing`);
    const withModel = !SHEET_ONLY_PRIVACY.has(key);
    const withoutModel = !MODEL_ONLY_PRIVACY.has(key);
    if (asking !== null) {
      assert.equal(
        asking.includes(text),
        withModel,
        `${key} on the page of a site whose AI explains: expected ${String(withModel)}`,
      );
    }
    if (sheet !== null) {
      assert.equal(
        sheet.includes(text),
        withoutModel,
        `${key} on the page of the sheet without a live AI: expected ${String(withoutModel)}`,
      );
    }
  }
});

/** What the privacy page says only where a model explains — and only where none does. */
const MODEL_ONLY_PRIVACY = new Set([
  'privacy.chat.lead',
  'privacy.chat.words',
  'privacy.chat.model',
  'privacy.chat.where',
  'privacy.chat.kept',
  'privacy.chat.budget',
  'privacy.chat.choice',
  'privacy.chat.withdraw',
]);
const SHEET_ONLY_PRIVACY = new Set([
  'privacy.chat.lead.gists',
  'privacy.chat.kept.gists',
  'privacy.chat.clear',
]);

void test('every string naming an absent component has a local fallback or is exempt', () => {
  const missing: string[] = [];
  for (const [key, value] of Object.entries(strings)) {
    if (key === '$meta' || typeof value !== 'string') continue;
    if (EXEMPT.has(key) || key.endsWith('.local')) continue;
    if (!MENTIONS_ABSENT_COMPONENT.test(value)) continue;
    // A v3-only surface (the chat itself) needs no fallback: it is simply not built.
    if (key.startsWith('chat.') || key.startsWith('about.ai_')) continue;
    // …like what the pages say of the sentences where the sheet opens without a live AI.
    if (key.startsWith('about.gists_') || key === 'accuracy.review.sentences') continue;
    // …and so does the section of the privacy page that says what asking does.
    if (key.startsWith('privacy.chat.')) continue;
    if (typeof strings[`${key}.local`] !== 'string') missing.push(key);
  }
  assert.deepEqual(
    missing,
    [],
    `these ship no AI-free variant, so an offline or silenced screen would announce an AI:\n${missing.join('\n')}`,
  );
});

void test('no string of the kit names a bot check: there is none (D16.23)', () => {
  for (const [key, value] of Object.entries(strings)) {
    if (key === '$meta' || typeof value !== 'string') continue;
    assert.doesNotMatch(value, /Turnstile|anti-robot|captcha/i, key);
  }
});

void test('the two exemptions still exist and still say what they are exempt for', () => {
  assert.match(String(strings['about.no_ai']), /Aucune IA/i);
  assert.match(String(strings['about.writing_method']), /outil d.IA|d'IA/i);
});
