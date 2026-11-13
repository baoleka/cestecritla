/**
 * "No AI mention without AI" (D9.15, H-CNF-17g, blocking) — and no mention of any component
 * that is not deployed.
 *
 * Since D16 a model may answer questions, and whether it does is DATA (data/2026/ask.json,
 * D16.4): "answer", "select" or "off". This gate follows that file. While the mode is "off" —
 * the state before a bench has passed, and the last rung of the ladder afterwards — the site is
 * deployed as static files, no model runs, and everything below applies as it always did. When
 * the mode opens, the gate inverts page by page: the notice is REQUIRED where the model
 * answers — the home page — allowed on the four pages that explain it, and forbidden everywhere
 * else. That half is exercised today on dist-ask/, the test build of the ask screen
 * (`npm run build:ask`), so that it is not discovered broken on the day the mode opens.
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
import { STATIC_CONFIG, WORKER_CONFIG, readAskMode, wranglerConfig } from './build-mode.js';

const strings = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, unknown>;
/** What the site says it does with a question, and the configuration that mode deploys. */
const askMode = readAskMode();
const deployed = wranglerConfig('app', askMode);
const wrangler = readFileSync(deployed, 'utf8');

/** A runtime AI, or a component that is not deployed while the mode is "off". */
const MENTIONS_ABSENT_COMPONENT =
  /\bIA\b|intelligence artificielle|Mistral|Llama|Gemma|gpt-oss|assistant|Turnstile/i;

const EXEMPT = new Set(['about.no_ai', 'about.writing_method']);

/** The deployed configuration, not the sketch in 09-architecture.md §2. */
const aiBindingDeployed = /"ai"\s*:/.test(wrangler.replace(/\/\/.*$/gm, ''));

const htmlFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
};

void test('the configuration the mode deploys carries an AI exactly when the mode says so (D16.4)', () => {
  // "off" deploys static files: no script, so no model can exist.
  assert.equal(deployed, askMode === 'off' ? STATIC_CONFIG : WORKER_CONFIG);
  assert.equal(aiBindingDeployed, askMode !== 'off', `${deployed}: the AI binding`);
  // No configuration carries a bot check, in any mode: there is none (D16.23).
  for (const config of [STATIC_CONFIG, WORKER_CONFIG]) {
    const code = readFileSync(config, 'utf8').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(code, /turnstile/i, `${config}: Turnstile`);
  }
  // The holding page never runs anything, whatever the mode.
  assert.equal(wranglerConfig('holding', askMode), STATIC_CONFIG);
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

/** Everything wrong with the AI notices of a build made for the given mode. */
function noticeProblems(root: string, mode: 'off' | 'answer' | 'select', model: string): string[] {
  const named = mentions(root);
  if (mode === 'off') {
    return [...named].map(([page, around]) => `${page} names an absent component: ${around}`);
  }
  const problems: string[] = [];
  for (const [page, around] of named) {
    if (!PAGES_THAT_EXPLAIN.includes(page)) problems.push(`${page} has no reason to: ${around}`);
  }
  const read = (page: string): string => appVoiceOnly(readFileSync(join(root, page), 'utf8'));
  // Art. 50: at the latest at the first interaction — so before it, on the page that asks.
  const home = read('index.html');
  if (!/Demander envoie des mots du livre, jamais la phrase, à une IA \(/.test(home)) {
    problems.push('index.html does not say, before the first use, what is sent and to an AI');
  }
  if (!home.includes(model)) problems.push('index.html does not name the model');
  if (!home.includes('Cloudflare')) problems.push('index.html does not say where the AI is hosted');
  // The page that says what is kept must say where a question goes, and what guards the gesture.
  const privacy = read('confidentialite/index.html');
  if (!/Demander n’envoie pas ta phrase/.test(privacy)) {
    problems.push('confidentialite does not say that the sentence typed stays on the phone');
  }
  if (!/les mots du livre/.test(privacy) || !/trente jours/.test(privacy)) {
    problems.push('confidentialite does not say what leaves, or what is kept of it');
  }
  if (/Turnstile/.test(privacy)) problems.push('confidentialite names a bot check there is not');
  // And no page may still say that no AI answers here: it would now be false.
  const denial = String(strings['about.no_ai']).replace(/'/g, '’');
  for (const page of PAGES_THAT_EXPLAIN) {
    if (read(page).includes(denial)) problems.push(`${page} still says no AI answers here`);
  }
  return problems;
}

/** The name the notices print for the model data/2026/ask.json names. */
function configuredModel(): string {
  const file = JSON.parse(readFileSync('data/2026/ask.json', 'utf8')) as { model?: unknown };
  return isModelKey(file.model) ? MODELS[file.model].name : '';
}

void test('the built app speaks of an AI exactly where its mode says one is at work', () => {
  if (htmlFiles('dist').length === 0) {
    console.log('  (skipped: no dist/ — run `npm run build` first)');
    return;
  }
  if (!existsSync('dist/sommaire/index.html')) return; // a holding build: two pages, no AI
  assert.deepEqual(noticeProblems('dist', askMode, configuredModel()), []);
});

void test('the ask screen, built for its tests, carries its notices and no page too many', () => {
  if (!existsSync('dist-ask/index.html')) {
    console.log('  (skipped: no dist-ask/ — run `npm run build:ask` first)');
    return;
  }
  // The test build pretends the mode is "answer" with the first candidate of the catalogue.
  assert.deepEqual(noticeProblems('dist-ask', 'answer', MODELS['mistral-small-3.1'].name), []);
  // The rule sees what it is for: the same pages judged as a site without AI are all refused.
  const asOff = noticeProblems('dist-ask', 'off', '');
  for (const page of PAGES_THAT_EXPLAIN) {
    assert.ok(
      asOff.some((problem) => problem.startsWith(page)),
      `${page} was not seen`,
    );
  }
});

void test('every string naming an absent component has a local fallback or is exempt', () => {
  const missing: string[] = [];
  for (const [key, value] of Object.entries(strings)) {
    if (key === '$meta' || typeof value !== 'string') continue;
    if (EXEMPT.has(key) || key.endsWith('.local')) continue;
    if (!MENTIONS_ABSENT_COMPONENT.test(value)) continue;
    // A v3-only surface (the chat itself) needs no fallback: it is simply not built.
    if (key.startsWith('chat.') || key.startsWith('about.ai_')) continue;
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
