/**
 * Which words — the one thing a question may tell the model (D16.53).
 *
 * The model of the chat explains words of the read sentences on the screen, and nothing else
 * (PLAN-CHAT §3). So of everything a visitor types, one thing only is of use to it: WHICH of
 * those words. The rest — the turn of the sentence, an instruction, a name — is what an
 * explanation can be led by: a security review proved it on 14/11/2026, with a question that
 * told the model what to say and a control that let it through.
 *
 * The question therefore stays on the phone. The page works out the words of our own sentences
 * that it uses (`askedWords`, src/lib/chat-local.ts — a file the Worker never imports), and
 * sends those: at most three, as the index writes them.
 * The Worker takes none of it on trust: each word it receives must be a word of the sentences it
 * loads itself for the measures named, and what it hands the model is that word AS OUR SENTENCE
 * WRITES IT. Whatever a client sends, nothing but our own words can reach the model.
 *
 * Pure, and shared: the page, the Worker, the bench and the tests cut a sentence into words
 * with the one function below, so that a word the page names is a word the Worker finds. Nothing
 * here takes what a visitor typed: this file is on the Worker's side of the line.
 */
import { terms } from './search-core.js';

/** How many words an explanation may be asked about: the contract's number, said once there. */
export { MAX_CHAT_WORDS } from './chat-contract.js';

/** A word of one of our sentences: as the index sees it, and as the sentence writes it. */
export interface ShownWord {
  term: string;
  surface: string;
}

/**
 * A word as a sentence writes it: letters and digits French is written with, standing whole —
 * not the elided article before an apostrophe (« l'école » is « école »), and not a piece of a
 * longer word. Spelled out rather than `\p{L}`: src/lib/ask-validate.ts says what the Unicode
 * properties cost a Worker that has just woken.
 */
const LETTERS = '0-9A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u017F';
const WORD = new RegExp(`(?<![${LETTERS}])[${LETTERS}]+(?![${LETTERS}'\\u2019])`, 'gu');

/**
 * The words of our sentences that can be explained: each once, in the order written, with the
 * form the sentence gives it. A number alone is no word, and what the index drops — an
 * article, a word of two letters that says nothing — is none either.
 */
export function sentenceWords(texts: readonly string[]): ShownWord[] {
  const out: ShownWord[] = [];
  for (const text of texts) {
    for (const surface of text.match(WORD) ?? []) {
      const [term, ...more] = terms(surface);
      if (term === undefined || more.length > 0 || !/[a-z]/.test(term)) continue;
      if (!out.some((held) => held.term === term)) out.push({ term, surface });
    }
  }
  return out;
}

/**
 * The Worker's side: each word it was sent, as our sentences write it — or null as soon as one
 * of them is not a word of those sentences. A request that names anything else is no request:
 * the model is not called.
 */
export function wordsShown(
  requested: readonly string[],
  shown: readonly string[],
): string[] | null {
  const words = sentenceWords(shown);
  const out: string[] = [];
  for (const term of requested) {
    const found = words.find((word) => word.term === term);
    if (found === undefined) return null;
    out.push(found.surface);
  }
  return out;
}
