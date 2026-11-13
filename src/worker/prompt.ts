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
