// Rate-limit key: HMAC-SHA256(secret, `${utcDay}:${ip}`), truncated to 16 bytes.
// - keyed, so the key cannot be reversed to an IP without the secret;
// - the UTC day is part of the message, so the key rotates daily and cannot be
//   correlated across days;
// - the key only ever reaches the rate limiting binding (in-colo counter, not logged).

import { utcDayKey } from "./budget-core.ts";

const encoder = new TextEncoder();

// Module-level cache of the imported key, keyed by secret: immutable per isolate,
// no request-scoped state.
let cachedKey: { secret: string; key: CryptoKey } | undefined;

async function hmacKey(secret: string): Promise<CryptoKey> {
  if (cachedKey !== undefined && cachedKey.secret === secret) {
    return cachedKey.key;
  }
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  cachedKey = { secret, key };
  return key;
}

function toHex(bytes: Uint8Array): string {
  let out = "";
  for (const b of bytes) {
    out += b.toString(16).padStart(2, "0");
  }
  return out;
}

export async function clientKey(ip: string, secret: string, nowMs: number): Promise<string> {
  const key = await hmacKey(secret);
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(`${utcDayKey(nowMs)}:${ip}`));
  return toHex(new Uint8Array(mac, 0, 16));
}
