/**
 * The models the bench may compare (D16.3): hosted by Cloudflare, usable on the free plan with
 * no payment method — verified on the account's own catalogue on 13/11/2026
 * (docs/discovery/neurons-log.md). No outside AI service, ever: a question about a political
 * programme does not leave Cloudflare.
 *
 * Kimi, GLM 5 and DeepSeek V4 are absent on purpose: the catalogue marks them as requiring a
 * paid plan, which the 0 € rule excludes. Qwen 3.8 answered, five times dearer and slower.
 *
 * The bench chooses among these; at a tie, Mistral (the first decision of the project, D0.3).
 * data/2026/ask.json then names the one that answers, by its key here.
 *
 * Prices are dollars per million tokens in the catalogue, turned into neurons at the public
 * rate of $0.011 per thousand: what the daily allowance of 10 000 neurons is counted in.
 *
 * `keeps` says what the host writes it keeps of a call (PLAN-CHAT §4, read on 14/11/2026 in
 * the documentation of Workers AI): "nothing" for the models whose page states that neither
 * the input nor the output is stored or used for training. Only those may read a question
 * (`keepsNothing`); the others stay candidates of the bench, which sends no visitor's words.
 */
import type { ModelSpec } from './prompt.js';

const neurons = (dollarsPerMillion: number): number =>
  Math.round((dollarsPerMillion / 0.011) * 1000);

export const MODELS = {
  'mistral-small-3.1': {
    id: '@cf/mistralai/mistral-small-3.1-24b-instruct',
    name: 'Mistral Small 3.1',
    neuronsIn: neurons(0.351),
    neuronsOut: neurons(0.555),
    options: {},
    keeps: 'nothing',
  },
  'gpt-oss-120b': {
    id: '@cf/openai/gpt-oss-120b',
    name: 'gpt-oss-120b',
    neuronsIn: neurons(0.35),
    neuronsOut: neurons(0.75),
    // A reasoning model: asked to think as little as it can, or it pays for thoughts nobody reads.
    options: { reasoning: { effort: 'low' } },
    keeps: 'unstated',
  },
  'gemma-4-26b': {
    id: '@cf/google/gemma-4-26b-a4b-it',
    name: 'Gemma 4 26B',
    neuronsIn: neurons(0.1),
    neuronsOut: neurons(0.3),
    options: { chat_template_kwargs: { enable_thinking: false } },
    keeps: 'nothing',
  },
  'llama-3.3-70b': {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    name: 'Llama 3.3 70B',
    neuronsIn: neurons(0.293),
    neuronsOut: neurons(2.253),
    options: {},
    keeps: 'nothing',
  },
} as const satisfies Record<string, ModelSpec>;

export type ModelKey = keyof typeof MODELS;

export const isModelKey = (value: unknown): value is ModelKey =>
  typeof value === 'string' && value in MODELS;

/** True for a model that may read a visitor's question: its host writes that it keeps nothing. */
export const keepsNothing = (key: ModelKey): boolean => MODELS[key].keeps === 'nothing';
