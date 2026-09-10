// Minimal Cloudflare GraphQL client for the lab measurements.
// The wrangler OAuth token is read from disk at runtime and never printed.
import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export const ACCOUNT_ID = 'f8b71fde291412da1f4e46c8ab005317';

export function readWranglerToken(): string {
  const toml = readFileSync(join(homedir(), '.config/.wrangler/config/default.toml'), 'utf8');
  const match = /^oauth_token\s*=\s*"([^"]+)"/m.exec(toml);
  if (!match || !match[1]) throw new Error('oauth_token not found in wrangler config');
  return match[1];
}

export interface GraphqlResult<T> {
  data: T | null;
  errors?: { message: string; path?: string[] }[];
}

export async function graphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<GraphqlResult<T>> {
  const res = await fetch('https://api.cloudflare.com/client/v4/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${readWranglerToken()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });
  return (await res.json()) as GraphqlResult<T>;
}
