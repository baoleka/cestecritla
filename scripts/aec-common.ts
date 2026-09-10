/**
 * Shared helpers for the ingestion scripts: polite fetching, text normalization, hashing.
 *
 * Crawling policy (non-negotiable): identifiable User-Agent, concurrency <= 4, one pass,
 * at most 2 retries with backoff, canonical URLs only (no redirect following, no URL guessing).
 */
import { createHash } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';

export const USER_AGENT = 'cestecritla/0.1 (+https://github.com/baoleka/cestecritla)';
export const SITE_ORIGIN = 'https://melenchon2027.fr';
export const BOOK_URL = `${SITE_ORIGIN}/programme2025/livre/`;
export const FEED_URL_PREFIX = `${SITE_ORIGIN}/feed/?post_type=lfi_programme_2025&paged=`;
export const MAX_CONCURRENCY = 4;
export const MAX_RETRIES = 2;
/** Hosts that must never be requested, whatever a page links to. */
const FORBIDDEN_HOSTS = new Set(['ng.melenchon2027.fr']);

export const LICENSE = 'CC BY-NC-SA 4.0' as const;
export const ATTRIBUTION = "La France insoumise – L'Avenir en commun" as const;

/** SHA-256, lowercase hex. */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Normalize a plain text: NFC, zero-width characters removed, every run of Unicode whitespace
 * (including NBSP / narrow NBSP) collapsed to a single ASCII space, trimmed.
 * Entities must already be decoded (node-html-parser's `.text` does it).
 */
export function normalizeText(text: string): string {
  return text
    .normalize('NFC')
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalize an HTML fragment for hashing / storage: NFC, zero-width characters removed (same rule
 * as `normalizeText`, so `text` can always be derived from `html`), whitespace runs collapsed, trimmed.
 */
export function normalizeHtml(html: string): string {
  return html
    .normalize('NFC')
    .replace(/[\u200B\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Resolve a site-relative href against the site origin and enforce the trailing slash. */
export function canonicalUrl(href: string): string {
  const url = new URL(href, SITE_ORIGIN);
  if (url.origin !== SITE_ORIGIN) {
    throw new Error(`Refusing to canonicalize a URL outside ${SITE_ORIGIN}: ${href}`);
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url.origin + url.pathname + url.search;
}

export interface FetchStats {
  /** Every HTTP request actually sent, retries included. */
  requests: number;
  retries: number;
  bytes: number;
}

export const fetchStats: FetchStats = { requests: 0, retries: 0, bytes: 0 };

export class HttpError extends Error {
  constructor(
    readonly url: string,
    readonly status: number,
    readonly location: string | null,
  ) {
    super(`HTTP ${String(status)} for ${url}${location ? ` (Location: ${location})` : ''}`);
    this.name = 'HttpError';
  }
}

function isRetryable(error: unknown): boolean {
  if (error instanceof HttpError) return error.status === 429 || error.status >= 500;
  // Network-level failures (DNS, reset, timeout) are worth one more try.
  return !(error instanceof HttpError);
}

export interface FetchedDocument {
  body: string;
  /** URL that finally answered 200 (differs from the requested one only after a followed redirect). */
  finalUrl: string;
}

/** Only redirects staying on the site, inside the programme, are ever followed (one hop). */
function isAcceptableRedirect(from: string, location: string | null): string | null {
  if (location === null) return null;
  const target = new URL(location, from);
  if (target.origin !== SITE_ORIGIN || FORBIDDEN_HOSTS.has(target.host)) return null;
  if (!target.pathname.startsWith('/programme2025/')) return null;
  return target.href;
}

/**
 * GET a URL as text with polite retries. Redirects are refused by default (a 3xx is an error:
 * the crawler must know exactly which URL it is reading). `maxRedirects = 1` allows a single hop
 * to a same-site programme URL, which the site issues when a post's WordPress permalink differs
 * from the URL used in the book navigation; the caller must then verify the landed page.
 */
export async function fetchDocument(
  url: string,
  accept = 'text/html',
  maxRedirects = 0,
): Promise<FetchedDocument> {
  const host = new URL(url).host;
  if (FORBIDDEN_HOSTS.has(host)) throw new Error(`Forbidden host, never requested: ${host}`);

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    if (attempt > 0) {
      fetchStats.retries += 1;
      await sleep(1500 * 2 ** (attempt - 1));
    }
    try {
      fetchStats.requests += 1;
      const res = await fetch(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: accept },
        redirect: 'manual',
        signal: AbortSignal.timeout(30_000),
      });
      if (res.status === 301 || res.status === 302 || res.status === 307 || res.status === 308) {
        await res.body?.cancel();
        const target = isAcceptableRedirect(url, res.headers.get('location'));
        if (maxRedirects > 0 && target !== null) {
          return await fetchDocument(target, accept, maxRedirects - 1);
        }
        throw new HttpError(url, res.status, res.headers.get('location'));
      }
      if (res.status !== 200) {
        await res.body?.cancel();
        throw new HttpError(url, res.status, res.headers.get('location'));
      }
      const body = await res.text();
      fetchStats.bytes += Buffer.byteLength(body, 'utf8');
      return { body, finalUrl: url };
    } catch (error) {
      lastError = error;
      if (!isRetryable(error)) break;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

/** GET a URL as text, no redirect allowed. */
export async function fetchText(url: string, accept = 'text/html'): Promise<string> {
  return (await fetchDocument(url, accept, 0)).body;
}

/** Run `fn` over `items` with at most `limit` concurrent executions, preserving order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      const item = items[index] as T;
      results[index] = await fn(item, index);
    }
  };
  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/** Zero-pad a positive integer to two digits (`1` → `01`). */
export function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}
