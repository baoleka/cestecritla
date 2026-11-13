/**
 * What the page shows for an answer of the Worker — decided here, purely, so that every case
 * of PLAN-JEU §1.4 is tested without a browser.
 *
 * The rule of the whole screen: a question always gets a page. An answer the page cannot use —
 * none at all, one built for another state of the book, one that names a measure this page
 * does not know — becomes what the page found by itself, and nothing says why.
 */
import { MAX_SELECTED, type AskResponse, type AskSentence } from './ask-contract.js';

export type AskView =
  /** Sentences written by the model, each with the measures it rests on. */
  | { kind: 'answer'; sentences: AskSentence[] }
  /** Three measures and no sentence. `local` when the page chose them itself. */
  | { kind: 'select'; ids: string[]; local: boolean }
  /** One of the fifteen answers a person wrote: recognised on the phone, never by the Worker. */
  | { kind: 'reviewed'; slug: string }
  /** Nothing found with these words — never "the programme does not speak of it". */
  | { kind: 'none' }
  | { kind: 'silence'; reopen: string };

export interface ViewContext {
  /** The state of the book this page was built from. */
  corpus: string;
  /** True when the page can name this measure and link to it. */
  knows: (id: string) => boolean;
  /** The measures the page's own search found for the question, best first. */
  localIds: readonly string[];
}

export function viewOf(response: AskResponse | null, context: ViewContext): AskView {
  const own = (): AskView => {
    const ids = context.localIds.filter((id) => context.knows(id)).slice(0, MAX_SELECTED);
    return ids.length === 0 ? { kind: 'none' } : { kind: 'select', ids, local: true };
  };
  if (response === null) return own();
  switch (response.kind) {
    case 'answer':
      if (response.corpus !== context.corpus) return own();
      if (!response.sentences.every((s) => s.ids.every((id) => context.knows(id)))) return own();
      return { kind: 'answer', sentences: response.sentences };
    case 'select':
      if (response.corpus !== context.corpus || !response.ids.every((id) => context.knows(id))) {
        return own();
      }
      return { kind: 'select', ids: response.ids, local: false };
    case 'local':
      return own();
    case 'silence':
      return response;
  }
}
