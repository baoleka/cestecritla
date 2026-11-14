/**
 * The agreement of the chat, as words (PLAN-CHAT §1, D16.46 and D16.50): which lines of the kit
 * it is made of, in which order, and the version those very words give.
 *
 * One definition, two readers that must agree to the letter. The page renders these lines into
 * the sheet and sends their version with a question (src/components/ChatSheet.astro); the
 * Worker computes the same version from the same kit and reads no question that carries
 * another (src/worker/index.ts). So a page that words the agreement otherwise — an old page in
 * a cache, a page someone else wrote — cannot have a question explained.
 *
 * Nothing here is a secret, and nothing of an agreement is kept anywhere: the version is a
 * label of a text, not a record of a person.
 */
import { consentVersion } from './chat-contract.ts';
import { t, type StringKey } from './strings.ts';

/**
 * The agreement, in the order it is read: what a model could do, what leaves, who reads it,
 * what is kept, what not to write, from what age, for how long, who answers for it — then the
 * two buttons. The sheet renders these keys in this order and no other text of its own.
 */
export const CONSENT_LINES: readonly StringKey[] = [
  'chat.consent.title',
  'chat.consent.what',
  'chat.consent.who',
  'chat.consent.kept',
  'chat.consent.self',
  'chat.consent.age',
  'chat.consent.scope',
  'chat.consent.controller',
];
export const CONSENT_BUTTONS: readonly StringKey[] = [
  'chat.consent.accept',
  'chat.consent.decline',
];

/** The agreement as rendered for this model: its lines, then its buttons. */
export function consentTexts(model: string): string[] {
  return [...CONSENT_LINES, ...CONSENT_BUTTONS].map((key) => t(key, { model }));
}

/** The version a chat request must carry to be read (D16.46). */
export const consentOf = (model: string): string => consentVersion(consentTexts(model));
