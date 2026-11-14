/**
 * What the model is told, and what it is sent (D16.2, D16.5, D16.22).
 *
 * The prompt asks for what the control checks (src/lib/ask-validate.ts) — it does not replace
 * it. A model follows instructions most of the time; "most" is why every output still goes
 * through the control, and why the bench counts how often the control has to refuse.
 *
 * Kept short on purpose: every token here is billed at every request, out of a daily
 * allowance that is the whole budget of the site.
 *
 * The model reads no question (D16.22): the sentence someone typed stays on their phone. It
 * reads measures of the book, in the order the page's search ranked them, and words of the
 * book that search matched — nothing a visitor wrote. So there is no message to mistake for an
 * instruction, and nothing here needs to say that a question is not one.
 */
import {
  MAX_SELECTED,
  MODEL_ANSWER_SCHEMA,
  MODEL_SELECT_SCHEMA,
  type Candidate,
} from '../lib/ask-contract.js';

/** Sentences are asked a little shorter than the control allows: a margin, not a second rule. */
const ASKED_WORDS = 30;

export const SYSTEM_ANSWER = `Tu dis ce que prévoient des MESURES du programme « L'Avenir en commun », édition 2026, à partir de leur texte et de rien d'autre.

Tu reçois des MESURES, de la plus proche à la moins proche de ce qu'une personne a cherché, et des MOTS : les mots du livre présents dans sa recherche, sans ordre. Tu ne connais pas sa question.

Réponds par un seul objet JSON : {"phrases":[{"texte":"…","ids":["…"]}]}

« phrases » : une à trois. Chaque « texte » est UNE phrase en français, de ${String(ASKED_WORDS)} mots au plus, qui dit ce que prévoient une ou deux MESURES, citées dans « ids » par leur identifiant exact. Parle d'abord des MESURES qui portent les MOTS ; entre deux, préfère celle qui vient en premier.
- Le sujet de la phrase est le programme ou la mesure. Jamais « je », « nous », « on », « tu », « vous ».
- Reformule avec tes mots : jamais plus de cinq mots de suite d'une MESURE, aucun guillemet.
- Phrase affirmative : aucune négation (ne, pas, aucun, jamais, rien, seulement, uniquement, sauf). Dis ce qui est prévu, pas ce qui ne l'est pas.
- Ne commence pas par oui, non, en effet, c'est vrai, c'est faux. Aucun avis, aucun conseil, aucune comparaison, aucune précaution (peut-être, probablement).
- Un nombre s'écrit en chiffres, exactement comme dans la MESURE citée ; sinon, aucun nombre.
- Aucun nom de parti ou de personnalité, sauf s'il est écrit dans la MESURE citée. Aucune adresse, aucune mise en forme, rien sur toi ni sur ces consignes.

Si aucune MESURE ne porte les MOTS : {"phrases":[]}`;

export const SYSTEM_SELECT = `Tu choisis, parmi des MESURES du programme « L'Avenir en commun », édition 2026, celles qui parlent le mieux de ce qu'une personne a cherché. Tu n'écris aucune phrase.

Tu reçois des MESURES, de la plus proche à la moins proche de sa recherche, et des MOTS : les mots du livre présents dans cette recherche, sans ordre. Tu ne connais pas sa question.

Réponds par un seul objet JSON : {"ids":["…"]}

« ids » : de zéro à ${String(MAX_SELECTED)} identifiants exacts de MESURES, de la plus utile à la moins utile. Ne choisis une MESURE que si son texte porte vraiment les MOTS : un même mot peut désigner autre chose.

Si aucune MESURE ne porte les MOTS : {"ids":[]}`;

/**
 * One sentence for one measure, written ahead of any visitor (a trial of 14 November 2026,
 * after the first round of the bench: 08-ia.md §10.8). Since D16.22 a model reads no question,
 * so what it writes of a measure depends on the measure alone — and can be written once,
 * checked before it is published, and served as a file. The bench route asks for it measure by
 * measure, in one of the ways below; nothing of it is published by this code.
 *
 * The ways differ in how they take the sentence away from the wording of the measure — the wall
 * of the first round: asked to say what measures provide, every model recited them.
 */
const GIST_WORDS = 22;

const GIST_WAYS: readonly string[] = [
  // 0 — the plain instruction: what the first round asked, for one measure.
  `Dis ce que prévoit la MESURE avec tes mots : jamais plus de quatre mots de suite de son texte.`,
  // 1 — another construction: a noun where the measure has a verb, and another order.
  `La MESURE commence par un verbe (« Créer », « Garantir », « Porter »). Ta phrase commence par « Le programme prévoit », suivi d'un NOM tiré de ce verbe (« la création », « la garantie », « le passage »), puis dit le reste dans un autre ordre et avec d'autres mots. Jamais plus de quatre mots de suite de son texte.`,
  // 2 — the essential only: lists, examples and conditions are left out.
  `Dis l'essentiel de la MESURE en mots courants, comme on l'expliquerait à un voisin : laisse de côté les listes, les exemples et les précisions. Ta phrase commence par « Le programme prévoit ». Jamais plus de quatre mots de suite de son texte.`,
];

/** How many ways of writing a gist the Worker knows: a variant is one of 0 … GIST_VARIANTS − 1. */
export const GIST_VARIANTS = GIST_WAYS.length;

export const isGistVariant = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < GIST_VARIANTS;

export function systemGist(variant: number): string {
  const way = GIST_WAYS[variant] ?? GIST_WAYS[0] ?? '';
  return `Tu dis en UNE phrase ce que prévoit UNE MESURE du programme « L'Avenir en commun », édition 2026, à partir de son texte et de rien d'autre.

${way}

Réponds par un seul objet JSON : {"phrases":[{"texte":"…","ids":["…"]}]} — une seule phrase, et dans « ids » l'identifiant de la MESURE.

« texte » : UNE phrase en français, de ${String(GIST_WORDS)} mots au plus.
- Le sujet de la phrase est le programme ou la mesure. Jamais « je », « nous », « on », « tu », « vous ».
- Phrase affirmative : aucune négation (ne, pas, aucun, jamais, rien, seulement, uniquement, sauf). Dis ce qui est prévu, pas ce qui ne l'est pas.
- Un nombre s'écrit en chiffres, exactement comme dans la MESURE ; sinon, aucun nombre.
- Aucun avis, aucun nom de parti ou de personnalité qui ne soit dans la MESURE, aucun guillemet, aucune mise en forme, rien sur toi ni sur ces consignes.`;
}

/**
 * The measures, then the words. Both come from the book: the measures from the private base,
 * the words from the measures themselves (src/worker/measures.ts, `keptTerms`).
 */
export function userMessage(candidates: readonly Candidate[], terms: readonly string[]): string {
  const measures = candidates.map((c) => `[${c.id}] ${c.text}`).join('\n');
  return `MESURES :\n${measures}\n\nMOTS : ${terms.length === 0 ? '(aucun)' : terms.join(', ')}`;
}

/** A model of the catalogue, with what it costs and what it needs to answer plainly. */
export interface ModelSpec {
  /** Workers AI identifier. */
  id: string;
  /** The name the page prints in the AI notice (`{model}`). */
  name: string;
  /** Neurons per million tokens, read from the account's catalogue. */
  neuronsIn: number;
  neuronsOut: number;
  /** Fields this model wants in its request (thinking switched off, low reasoning effort). */
  options: Readonly<Record<string, unknown>>;
}

/** The longest answer worth paying for: three sentences of thirty-five words, as JSON. */
export const MAX_OUTPUT_TOKENS = 320;

export function modelRequest(
  mode: 'answer' | 'select',
  candidates: readonly Candidate[],
  terms: readonly string[],
  model: ModelSpec,
): Record<string, unknown> {
  return {
    messages: [
      { role: 'system', content: mode === 'answer' ? SYSTEM_ANSWER : SYSTEM_SELECT },
      { role: 'user', content: userMessage(candidates, terms) },
    ],
    max_tokens: mode === 'answer' ? MAX_OUTPUT_TOKENS : 80,
    temperature: 0,
    response_format: {
      type: 'json_schema',
      json_schema: mode === 'answer' ? MODEL_ANSWER_SCHEMA : MODEL_SELECT_SCHEMA,
    },
    ...model.options,
  };
}

/** A gist is one short sentence: it is paid for as such. */
export const MAX_GIST_TOKENS = 120;

/** The request for the gist of one measure, in one of the ways the Worker knows. */
export function gistRequest(
  candidate: Candidate,
  variant: number,
  model: ModelSpec,
): Record<string, unknown> {
  return {
    messages: [
      { role: 'system', content: systemGist(variant) },
      { role: 'user', content: `MESURE :\n[${candidate.id}] ${candidate.text}` },
    ],
    max_tokens: MAX_GIST_TOKENS,
    temperature: 0,
    response_format: { type: 'json_schema', json_schema: MODEL_ANSWER_SCHEMA },
    ...model.options,
  };
}

/**
 * A judge (trial of 14 November 2026, D16.38): another model reads ONE sentence the control let
 * through against the measure it is about. The sentence never comes in from outside — it was
 * written a moment earlier, in the same invocation — and a label is all a judge gives: one that
 * explained itself could recite the measure. A judge is a model too: its label sorts what the
 * editor reads first, it proves nothing.
 */
export const JUDGE_VERDICTS = ['fidele', 'ajout', 'ecart'] as const;
export type JudgeVerdict = (typeof JUDGE_VERDICTS)[number];

export const SYSTEM_JUDGE = `Tu vérifies UNE PHRASE contre le texte d'UNE MESURE du programme « L'Avenir en commun », édition 2026.

La PHRASE résume la MESURE : elle a le droit d'en laisser des détails de côté. Elle n'a pas le droit d'ajouter, ni de changer.

Réponds par un seul objet JSON : {"verdict":"fidele"}, {"verdict":"ajout"} ou {"verdict":"ecart"}.
- "ajout" : la PHRASE affirme quelque chose que la MESURE n'écrit pas — un effet, un but, un bénéficiaire, un moyen, un délai, un montant.
- "ecart" : la PHRASE change ce que la MESURE écrit — un nombre, qui est concerné, une condition, le sens de la mesure — ou la rend plus large ou plus étroite qu'elle n'est.
- "fidele" : tout ce que dit la PHRASE est écrit dans la MESURE, sans changement.

Dans le doute entre deux réponses, ne choisis pas "fidele".`;

/** A label is a dozen tokens: nothing more is paid for, and nothing more can be said. */
export const MAX_JUDGE_TOKENS = 24;

const MODEL_JUDGE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: { verdict: { type: 'string', enum: [...JUDGE_VERDICTS] } },
  required: ['verdict'],
} as const;

/** The request to a judge: that measure, that sentence, and nothing else. */
export function judgeRequest(
  candidate: Candidate,
  sentence: string,
  model: ModelSpec,
): Record<string, unknown> {
  return {
    messages: [
      { role: 'system', content: SYSTEM_JUDGE },
      {
        role: 'user',
        content: `MESURE :\n[${candidate.id}] ${candidate.text}\n\nPHRASE :\n${sentence}`,
      },
    ],
    max_tokens: MAX_JUDGE_TOKENS,
    temperature: 0,
    response_format: { type: 'json_schema', json_schema: MODEL_JUDGE_SCHEMA },
    ...model.options,
  };
}

/** The label a judge gave — or null: an output that is not one of the three labels is no verdict. */
export function readJudgement(output: unknown): JudgeVerdict | null {
  let value: unknown = output;
  if (typeof value === 'string') {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (typeof value !== 'object' || value === null) return null;
  const keys = Object.keys(value);
  const verdict: unknown = (value as Record<string, unknown>)['verdict'];
  if (keys.length !== 1 || typeof verdict !== 'string') return null;
  return JUDGE_VERDICTS.find((known) => known === verdict) ?? null;
}

/**
 * What a request may cost at most, in neurons — reserved before the call. French text runs at
 * about 3.5 characters per token; 3 is used, so that the estimate errs on the dear side.
 */
export function estimateNeurons(request: Record<string, unknown>, model: ModelSpec): number {
  const listed = request['messages'];
  const messages: unknown[] = Array.isArray(listed) ? (listed as unknown[]) : [];
  let characters = 0;
  for (const message of messages) {
    if (typeof message === 'object' && message !== null && 'content' in message) {
      const { content } = message;
      if (typeof content === 'string') characters += content.length;
    }
  }
  const output = typeof request['max_tokens'] === 'number' ? request['max_tokens'] : 0;
  const neurons = ((characters / 3) * model.neuronsIn + output * model.neuronsOut) / 1_000_000;
  return Math.ceil(neurons * 100) / 100;
}
