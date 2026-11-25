/**
 * The security policy of a page, read directive by directive (review 17, Q5 and Q8; review 19,
 * V06). Looking for words in its text let through what opens other origins — `https:`, a host
 * written without its scheme, `wss://…`, `default-src 'none' https:` — and a keyword that is
 * not alone (`trusted-types 'none' default`): each of them passed every gate, and each of them
 * is acted on by the three engines. So a policy is read the way a browser reads it, and every
 * directive may hold only what our pages need.
 *
 * Used by scripts/check-build.test.ts (every page of every build), scripts/e2e-ask.ts and
 * scripts/e2e-sheet.ts (the pages they open).
 */

interface Rule {
  /** The directive holds exactly these tokens, in this order. */
  only?: readonly string[];
  /** …or any of these, at least one. */
  sources?: readonly string[];
  /** …and the hashes of our own inline scripts or styles. */
  hashes?: boolean;
  /** Every page carries it. */
  required?: boolean;
}

/** What each directive may hold. Another directive, another source: refused. */
const RULES: Readonly<Record<string, Rule>> = {
  'default-src': { only: ["'none'"], required: true },
  'img-src': { sources: ["'self'", 'data:'] },
  'font-src': { sources: ["'self'"] },
  'connect-src': { sources: ["'self'"] },
  'manifest-src': { sources: ["'self'"] },
  'script-src': { sources: ["'self'"], hashes: true, required: true },
  'style-src': { sources: ["'self'"], hashes: true, required: true },
  // No script hands a string to the parser or a loader, and no policy can be made (D16.80).
  'require-trusted-types-for': { only: ["'script'"], required: true },
  'trusted-types': { only: ["'none'"], required: true },
  // What `default-src 'none'` already refuses may be said again — as a refusal, nothing else.
  'frame-src': { only: ["'none'"] },
  'child-src': { only: ["'none'"] },
  'worker-src': { only: ["'none'"] },
  'object-src': { only: ["'none'"] },
  'media-src': { only: ["'none'"] },
  'form-action': { only: ["'none'"] },
};

/** The hash of an inline script or style, as Astro writes it (`algorithm: 'SHA-256'`). */
const HASH = /^'sha(?:256|384|512)-[A-Za-z0-9+/]+={0,2}'$/;

/**
 * What is wrong with a policy, one line per problem; none for a policy our pages may carry.
 * Keywords and schemes are read without regard to case, as browsers read them; a hash is not.
 */
export function policyProblems(policy: string): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const part of policy.split(';')) {
    const [written, ...tokens] = part
      .trim()
      .split(/\s+/)
      .filter((token) => token !== '');
    if (written === undefined) continue;
    const name = written.toLowerCase();
    // A browser keeps the first and ignores the second: a second one is a mistake, or a mask.
    if (seen.has(name)) {
      problems.push(`${name}: said twice`);
      continue;
    }
    seen.add(name);
    const rule = RULES[name];
    if (rule === undefined) {
      problems.push(`${name}: a directive our pages do not carry`);
      continue;
    }
    const folded = tokens.map((token) => (HASH.test(token) ? token : token.toLowerCase()));
    if (rule.only !== undefined) {
      if (folded.join(' ') !== rule.only.join(' ')) {
        problems.push(`${name} ${tokens.join(' ')}: only ${rule.only.join(' ')}`);
      }
      continue;
    }
    if (folded.length === 0) problems.push(`${name}: no source`);
    for (const token of folded) {
      if (rule.sources?.includes(token) === true) continue;
      if (rule.hashes === true && HASH.test(token)) continue;
      problems.push(`${name}: ${token}`);
    }
  }
  for (const [name, rule] of Object.entries(RULES)) {
    if (rule.required === true && !seen.has(name)) problems.push(`${name}: missing`);
  }
  return problems;
}

/** The policy a page carries in its `<meta>`, as written; '' when it carries none. */
export function metaPolicy(html: string): string {
  return (
    /<meta\b[^>]*\bhttp-equiv="content-security-policy"[^>]*\bcontent="([^"]*)"/i.exec(html)?.[1] ??
    ''
  );
}

/** Elements the parser keeps in `<head>`: anything else before the policy closes it. */
const HEAD_ELEMENTS = new Set([
  'html',
  'head',
  'meta',
  'link',
  'title',
  'style',
  'script',
  'base',
  'noscript',
  'template',
]);

/**
 * What stands before the policy of a page and would take it out of `<head>`. A browser obeys a
 * policy in a `<meta>` only inside `<head>`; an element that belongs to the body, or a word of
 * text, closes the head where it stands, and the policy after it is ignored — every gate that
 * looks for its words still finds them (review 17, Q8). Empty when the policy is in force.
 */
export function beforePolicy(html: string): string[] {
  const at = html.search(/<meta\b[^>]*\bhttp-equiv="content-security-policy"/i);
  if (at === -1) return ['no policy'];
  const lead = html
    .slice(0, at)
    .replace(/^\s*<!doctype[^>]*>/i, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|title|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '<$1>');
  const found: string[] = [];
  for (const tag of lead.matchAll(/<(\/?)([A-Za-z][\w-]*)/g)) {
    const closing = tag[1] === '/';
    const name = (tag[2] ?? '').toLowerCase();
    if (!HEAD_ELEMENTS.has(name) || (closing && (name === 'head' || name === 'html'))) {
      found.push(tag[0]);
    }
  }
  const text = lead.replace(/<[^>]*>/g, '').trim();
  if (text !== '') found.push(`text: ${text.slice(0, 40)}`);
  return found;
}
