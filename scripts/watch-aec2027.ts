/**
 * Daily watch on aec2027.fr (risk R6, runbook sheet 10).
 *
 * aec2027.fr is a placeholder page announcing a programme site. If it ships, it is either the
 * official tool this project deliberately is not, or a direct competitor — and the dossier's
 * answer is a set of triggers, not a reflex. Until now the watch "rested on memory": the script
 * was named in three documents as if it existed and never did.
 *
 * One HEAD per day from the cron that already runs the re-crawl, plus one GET to look at the
 * body. Reference values are archived IN the script, measured 7-9 September 2026, so a change
 * is a diff and not a recollection.
 *
 * Two rules of composure, from D12.6, that this script must not be allowed to break:
 *   - no pivot on a rumour, a screenshot or a message — only on an observed, archived signal;
 *   - no pivot during an L49 freeze (16-18 April, 30 April-2 May 2027): note it, and wait.
 * So this reports. It never decides.
 *
 * Run: npx tsx scripts/watch-aec2027.ts [--json]
 * Exit: 0 unchanged · 3 a signal changed · 1 unreachable
 */
import { USER_AGENT } from './aec-common.js';

const URL_WATCHED = 'https://aec2027.fr/';

/** Measured 7-9 September 2026 (12-positionnement-lancement.md §2.2 and §6). */
export const REFERENCE = {
  lastModified: 'Tue, 01 Sep 2026 15:03:34 GMT',
  etag: '"1c3f-65a6d38f87fa5"',
  bytes: 7231,
  hasScripts: false,
  hasManifest: false,
  hasSitemap: false,
} as const;

export interface Signal {
  readonly name: string;
  readonly reference: string;
  readonly observed: string;
  readonly changed: boolean;
}

/**
 * Entity-tag comparison, RFC 9110 §8.8.3: `W/` marks a WEAK validator and is not part of the
 * tag. The server sends a strong ETag to curl and a weak one to fetch, because Node negotiates
 * gzip and the compressed variant gets its own weak tag. Comparing the raw strings reports a
 * change every single day, on a page that has not moved since 1 September.
 */
const entityTag = (value: string | null): string => (value ?? '(absent)').replace(/^W\//, '');

/**
 * Executable script only. The page carries four <script type="application/ld+json"> blocks of
 * schema.org data and has done since the reference measurement — that is markup, not code, and
 * the dossier's "aucun script" is about code. Counting them fires the alarm on day one.
 */
const hasExecutableScript = (body: string): boolean =>
  [...body.matchAll(/<script\b([^>]*)>/gi)].some((m) => {
    const attrs = m[1] ?? '';
    const type = /\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs)?.[1]?.toLowerCase();
    if (type !== undefined && type !== 'text/javascript' && type !== 'module') return false;
    return true;
  });

export function compare(
  headers: Headers,
  body: string,
  sitemapFound: boolean,
  manifestResolves: boolean,
): Signal[] {
  const scripts = hasExecutableScript(body);
  // The signal is a REAL manifest, not a link to one: the page links
  // https://www.aec2027.fr/site.webmanifest and that URL has always answered 404.
  const manifest = manifestResolves;

  const observed: [string, string, string][] = [
    ['Last-Modified', REFERENCE.lastModified, headers.get('last-modified') ?? '(absent)'],
    ['ETag', entityTag(REFERENCE.etag), entityTag(headers.get('etag'))],
    ['bytes', String(REFERENCE.bytes), String(Buffer.byteLength(body, 'utf8'))],
    ['scripts', String(REFERENCE.hasScripts), String(scripts)],
    ['manifest', String(REFERENCE.hasManifest), String(manifest)],
    ['sitemap.xml', String(REFERENCE.hasSitemap), String(sitemapFound)],
  ];
  return observed.map(([name, reference, value]) => ({
    name,
    reference,
    observed: value,
    changed: value !== reference,
  }));
}

const isMain = process.argv[1]?.endsWith('watch-aec2027.ts') ?? false;
if (isMain) {
  const asJson = process.argv.includes('--json');
  try {
    const head = await fetch(URL_WATCHED, {
      method: 'HEAD',
      headers: { 'user-agent': USER_AGENT },
      redirect: 'follow',
    });
    const page = await fetch(URL_WATCHED, {
      headers: { 'user-agent': USER_AGENT },
      redirect: 'follow',
    });
    const body = await page.text();
    const resolves = async (url: string): Promise<boolean> =>
      fetch(url, {
        method: 'HEAD',
        headers: { 'user-agent': USER_AGENT },
        redirect: 'follow',
      }).then(
        (r) => r.ok,
        () => false,
      );
    const sitemap = await resolves(`${URL_WATCHED}sitemap.xml`);
    // Follow the declared manifest URL, whatever host it points at.
    const declared = /<link\b[^>]*rel=["']?manifest["']?[^>]*href=["']([^"']+)["']/i.exec(
      body,
    )?.[1];
    const manifestResolves = declared === undefined ? false : await resolves(declared);

    const signals = compare(head.headers, body, sitemap, manifestResolves);
    const changed = signals.filter((s) => s.changed);

    if (asJson) {
      console.log(
        JSON.stringify({ url: URL_WATCHED, checkedAt: new Date().toISOString(), signals }, null, 2),
      );
    } else {
      for (const s of signals) {
        console.log(
          `${s.changed ? '⚠' : ' '} ${s.name.padEnd(14)} ref ${s.reference.padEnd(34)} now ${s.observed}`,
        );
      }
      console.log(`\n${String(changed.length)} of ${String(signals.length)} signals changed`);
      if (changed.length > 0) {
        console.log(
          'Observed signal, not a decision: archive a capture, then read runbook sheet 10 ' +
            '(triggers A-H). Never during an L49 freeze.',
        );
      }
    }
    process.exitCode = changed.length > 0 ? 3 : 0;
  } catch (error) {
    // Unreachable is itself worth knowing, but it is not a signal: a network failure here must
    // never be read as "the site changed".
    console.error(`unreachable: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
