/**
 * Lazy loader shared by both apps: MiniSearch + the search module come from a dynamic import
 * (separate chunk), the corpus from /data/slim.json (Static Asset). Both start in parallel on the
 * first focus of the search box and are memoised. `performance.mark()` names are read by
 * measure/search-timing.ts.
 */
import type { Searcher } from './search-core.ts';
import type { SlimCorpus } from '../types.ts';

let pending: Promise<Searcher> | undefined;

export function loadSearcher(): Promise<Searcher> {
  if (pending === undefined) {
    performance.mark('search:load-start');
    pending = Promise.all([
      import('./search-core.ts'),
      fetch('/data/slim.json').then((r) => {
        if (!r.ok) throw new Error(`slim.json ${String(r.status)}`);
        return r.json() as Promise<SlimCorpus>;
      }),
    ]).then(([mod, corpus]) => {
      performance.mark('search:fetched');
      const searcher = mod.createSearcher(corpus);
      performance.mark('search:ready');
      performance.measure('search:index-build', 'search:fetched', 'search:ready');
      return searcher;
    });
    pending.catch(() => {
      pending = undefined;
    });
  }
  return pending;
}

/** Label of a hit kind, as displayed in the results list (both apps). */
export const KIND_LABEL: Record<string, string> = {
  paragraph: 'Texte',
  key_measure: 'Mesure clé',
  measure: 'Mesure',
  sub_measure: 'Mesure',
  chiffre: 'À savoir',
};
