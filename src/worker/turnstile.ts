/**
 * Turnstile, server side (D7.6): the token the page obtained is checked with Cloudflare before
 * anything is read or spent. It protects the daily allowance, not a secret: a refused token
 * gets the "local" answer, like a spent budget — never a word of failure.
 *
 * Fails closed: no secret, no expected hostname, a slow or broken verification — all mean no.
 * The visitor's address is not sent along (`remoteip` is optional, and we keep it to ourselves).
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SITEVERIFY_TIMEOUT_MS = 4_000;
/** The action the page asks its token for: a token minted for another form is not ours. */
export const TURNSTILE_ACTION = 'ask';

export interface TurnstileConfig {
  secret: unknown;
  /** Comma-separated hostnames a token may have been issued on. */
  hostnames: unknown;
}

type Fetcher = (input: string, init: RequestInit) => Promise<Response>;

export async function verifyTurnstile(
  token: string,
  config: TurnstileConfig,
  fetcher: Fetcher = fetch,
): Promise<boolean> {
  const { secret, hostnames } = config;
  if (typeof secret !== 'string' || secret === '' || typeof hostnames !== 'string') return false;
  const expected = new Set(
    hostnames
      .split(',')
      .map((host) => host.trim())
      .filter((host) => host !== ''),
  );
  if (expected.size === 0 || token === '') return false;
  try {
    const response = await fetcher(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret, response: token }),
      signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
    });
    if (!response.ok) return false;
    const result: unknown = await response.json();
    if (typeof result !== 'object' || result === null) return false;
    const { success, hostname, action } = result as Record<string, unknown>;
    return (
      success === true &&
      typeof hostname === 'string' &&
      expected.has(hostname) &&
      action === TURNSTILE_ACTION
    );
  } catch {
    return false;
  }
}
