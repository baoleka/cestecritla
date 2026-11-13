/**
 * The two secrets of the Worker. They are set in the editor's terminal with
 * `wrangler secret put`, never written in a file — so `wrangler types` cannot know them, and
 * they are declared here, merged into the `Env` it generates. Optional on purpose: a Worker
 * deployed without one must find `undefined` and fail closed (no rate allowed, no bench), not
 * crash. (There were three: the third checked a Turnstile token, and there is no Turnstile
 * since D16.23.)
 */
interface Env {
  /** Salt of the rate-limit key: the key then says nothing of the address it came from. */
  RATE_SALT?: string;
  /** Opens /api/bench. Set on the preview Worker only; without it the route answers 404. */
  BENCH_KEY?: string;
}
