/**
 * "No AI mention without AI" (D9.15, H-CNF-17g, blocking) — and no mention of any component
 * that is not deployed.
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

const strings = JSON.parse(readFileSync('design/strings.json', 'utf8')) as Record<string, unknown>;
const wrangler = readFileSync('wrangler.jsonc', 'utf8');

/** A runtime AI, or a component v1/v2 does not deploy. */
const MENTIONS_ABSENT_COMPONENT = /\bIA\b|intelligence artificielle|Mistral|assistant|Turnstile/i;

const EXEMPT = new Set(['about.no_ai', 'about.writing_method']);

/**
 * Kept in the kit, never rendered while the chat is extractive (D6.10, D13.1). Turnstile is
 * stage 1 of the defence in depth and is retired in v1/v2, so the /confidentialite lines that
 * describe it leave the page rather than gain an "AI-free variant" -- there is nothing to say.
 * They come back with the v3 "ids only" contract, unchanged. The build-output test below is
 * what actually enforces their absence.
 */
const RETIRED_WITH_TURNSTILE = new Set([
  'privacy.policy.06',
  'privacy.turnstile',
  'privacy.never.08',
]);

/** The deployed configuration, not the sketch in 09-architecture.md §2. */
const aiBindingDeployed = /"ai"\s*:/.test(wrangler.replace(/\/\/.*$/gm, ''));
const turnstileDeployed = /TURNSTILE_/.test(wrangler.replace(/\/\/.*$/gm, ''));

const htmlFiles = (dir: string): string[] => {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? htmlFiles(path) : path.endsWith('.html') ? [path] : [];
  });
};

void test('the deployed config carries no AI and no Turnstile (D6.10, D13.1)', () => {
  assert.equal(aiBindingDeployed, false, 'wrangler.jsonc must not declare the AI binding');
  assert.equal(turnstileDeployed, false, 'wrangler.jsonc must not declare Turnstile vars');
});

/**
 * The app's own voice, with the programme's words removed.
 *
 * This is not a convenience: the corpus itself legislates about AI. `c18-s05-m12` is "Créer la
 * mission nationale de maîtrise de l'intelligence artificielle", `c11-s01` limits generative AI
 * in culture, `c16-s02` names it among military technologies, and `c5-s03` speaks of "assistants
 * d'éducation". Scanned naively, this gate is red on four pages from the first build -- and the
 * answer is not to weaken it but to scope it to what the app ASSERTS, which is exactly the
 * distinction the whole product rests on. Verbatim blocks carry their own marker and their own
 * "Texte du programme" label; everything outside them is us talking.
 */
const appVoiceOnly = (html: string): string =>
  html.replace(/<figure class="verbatim"[\s\S]*?<\/figure>/g, ' ');

void test('no built page mentions an AI or Turnstile while neither is deployed', () => {
  const pages = htmlFiles('dist');
  if (pages.length === 0) {
    console.log('  (skipped: no dist/ — run `npm run build` first)');
    return;
  }
  const exemptText = [...EXEMPT]
    .map((k) => strings[k])
    .filter((v): v is string => typeof v === 'string');

  const offenders: string[] = [];
  for (const page of pages) {
    let body = appVoiceOnly(readFileSync(page, 'utf8'));
    for (const allowed of exemptText) body = body.split(allowed).join('');
    const hit = MENTIONS_ABSENT_COMPONENT.exec(body);
    if (hit !== null) {
      const at = Math.max(0, hit.index - 60);
      offenders.push(`${page}: …${body.slice(at, hit.index + 60).replace(/\s+/g, ' ')}…`);
    }
  }
  assert.deepEqual(offenders, [], `pages naming an absent component:\n${offenders.join('\n')}`);
});

void test('every string naming an absent component has a local fallback or is exempt', () => {
  const missing: string[] = [];
  for (const [key, value] of Object.entries(strings)) {
    if (key === '$meta' || typeof value !== 'string') continue;
    if (EXEMPT.has(key) || key.endsWith('.local')) continue;
    if (!MENTIONS_ABSENT_COMPONENT.test(value)) continue;
    // A v3-only surface (the chat itself) needs no fallback: it is simply not built.
    if (key.startsWith('chat.') || key.startsWith('about.ai_')) continue;
    if (RETIRED_WITH_TURNSTILE.has(key)) continue;
    if (typeof strings[`${key}.local`] !== 'string') missing.push(key);
  }
  assert.deepEqual(
    missing,
    [],
    `these ship no AI-free variant, so an offline or silenced screen would announce an AI:\n${missing.join('\n')}`,
  );
});

void test('the retired-with-Turnstile list is exact — no entry has gone stale', () => {
  for (const key of RETIRED_WITH_TURNSTILE) {
    const value = strings[key];
    assert.equal(typeof value, 'string', `${key} left the kit: drop it from the retired list`);
    assert.match(String(value), /Turnstile/i, `${key} no longer mentions Turnstile`);
  }
});

void test('the two exemptions still exist and still say what they are exempt for', () => {
  assert.match(String(strings['about.no_ai']), /Aucune IA/i);
  assert.match(String(strings['about.writing_method']), /outil d.IA|d'IA/i);
});
