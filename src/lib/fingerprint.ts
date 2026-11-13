/**
 * One way to fingerprint a value, shared by the build and by the gates (D16.18: every fact
 * that was validated carries the fingerprint of what it was validated on).
 */
import { createHash } from 'node:crypto';

/** SHA-256 of a value written the same way whatever the order of its keys. */
export function canonicalHash(value: unknown): string {
  const write = (v: unknown): string => {
    if (Array.isArray(v)) return `[${v.map(write).join(',')}]`;
    if (typeof v === 'object' && v !== null) {
      const entries = Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
      return `{${entries.map(([k, x]) => `${JSON.stringify(k)}:${write(x)}`).join(',')}}`;
    }
    // `undefined` has no JSON form: it is written as null, like a missing array slot.
    return v === undefined ? 'null' : JSON.stringify(v);
  };
  return createHash('sha256').update(write(value)).digest('hex');
}

/**
 * The fingerprint of the list of words of the game, as the editor validates it and as the local
 * check attests it (data/2026/game-words.json): the words AND the pool of sections they are
 * played among. A section judged afterwards changes the tiles of the game and where it says a
 * word is also written — for words the editor has already read. It makes both dates fall.
 */
export function listFingerprint(words: unknown, pool: unknown): string {
  return canonicalHash({ words, pool });
}
