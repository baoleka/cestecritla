// Tries to read the AI Gateway « aec » configuration through the REST API with the wrangler token.
// Expected on this account: the token lacks the ai-gateway scope → documented fallback = dashboard capture.
import { ACCOUNT_ID, readWranglerToken } from './cf-graphql.ts';

const res = await fetch(
  `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai-gateway/gateways/aec`,
  {
    headers: { Authorization: `Bearer ${readWranglerToken()}` },
  },
);
console.log(`HTTP ${String(res.status)}`);
console.log(await res.text());
