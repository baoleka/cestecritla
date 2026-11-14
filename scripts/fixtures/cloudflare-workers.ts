/**
 * `cloudflare:workers`, for Node — the one thing src/worker/budget.ts takes from it: the base
 * class of a Durable Object, which keeps what the runtime hands it and does nothing else.
 *
 * scripts/budget.test.ts resolves the module here, so that the object and the Worker run in a
 * test exactly as they are written.
 */
export class DurableObject<Env = unknown> {
  protected readonly ctx: unknown;
  protected readonly env: Env;

  constructor(ctx: unknown, env: Env) {
    this.ctx = ctx;
    this.env = env;
  }
}
