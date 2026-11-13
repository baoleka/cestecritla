/**
 * What stands between a request and the path of a question: how much of it is read, and under
 * which key it is counted. Nothing here touches the platform, so that all of it runs in a test.
 */

/** A question, a token and a version: more than this is not a request of the page. */
export const MAX_BODY_BYTES = 6_144;

/**
 * The body of a request, read as JSON — or null: announced longer than a request of the page,
 * longer than that without saying so, not UTF-8, not JSON. The read stops at the limit: a body
 * of a hundred megabytes is refused on its first kilobytes, not after it was held in memory.
 */
export async function readBody(request: Request, maxBytes = MAX_BODY_BYTES): Promise<unknown> {
  const announced = request.headers.get('content-length');
  if (announced !== null && !(Number(announced) <= maxBytes)) return null;
  const stream: ReadableStream<Uint8Array> | null = request.body;
  if (stream === null) return null;
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, at);
    at += chunk.byteLength;
  }
  try {
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes),
    ) as unknown;
  } catch {
    return null;
  }
}

/**
 * Whom the rate limiter counts. An IPv4 address is one subscriber. An IPv6 subscriber holds a
 * whole /64 — eighteen billion billion addresses — and would ask each question from a new one:
 * it is the network that is counted, not the address. Anything that does not read as an address
 * is counted as itself.
 */
export function rateSubject(ip: string): string {
  const address = ip.trim().toLowerCase();
  if (!address.includes(':')) return address;
  // An IPv4 address written the IPv6 way is the IPv4 subscriber it is.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (mapped?.[1] !== undefined) return mapped[1];
  const halves = address.split('::');
  if (halves.length > 2) return address;
  // A dotted tail stands for the last two groups; their value is not kept anyway.
  const groupsOf = (half: string): string[] =>
    half === '' ? [] : half.replace(/(^|:)\d{1,3}(?:\.\d{1,3}){3}$/, '$10:0').split(':');
  const head = groupsOf(halves[0] ?? '');
  const tail = groupsOf(halves[1] ?? '');
  const gap = halves.length === 2 ? Math.max(0, 8 - head.length - tail.length) : 0;
  const groups = [...head, ...Array<string>(gap).fill('0'), ...tail];
  if (groups.length !== 8 || groups.some((group) => !/^[0-9a-f]{1,4}$/.test(group))) {
    return address;
  }
  const network = groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, ''));
  return `${network.join(':')}::/64`;
}

/**
 * A key for the rate limiter that says nothing of the address it was made from (D7.5): the
 * first half of an HMAC of the day and of the subscriber, under a secret only the Worker holds.
 * The limiter keeps it for the minute it counts in; nothing else ever sees it.
 */
export async function clientKey(ip: string, salt: string, day: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(salt),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${day}:${rateSubject(ip)}`));
  return [...new Uint8Array(mac, 0, 16)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
