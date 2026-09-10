import { useEffect, useRef, useState } from 'react';
import { KIND_LABEL, loadSearcher } from '../../shared/search/lazy.ts';
import type { Searcher } from '../../shared/search/search-core.ts';
import type { SearchHit } from '../../shared/types.ts';

type State = 'idle' | 'loading' | 'ready' | 'error';

const label = 'text-label leading-label font-bold uppercase tracking-[0.1em]';

/**
 * Search box: MiniSearch and the corpus are loaded on first focus (dynamic import + fetch),
 * the query is re-run as soon as the index is ready. Same behaviour as the Astro island.
 */
export function SearchBox() {
  const [query, setQuery] = useState('');
  const [state, setState] = useState<State>('idle');
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const searcher = useRef<Searcher | null>(null);

  const warm = (): void => {
    if (searcher.current !== null || state === 'loading') return;
    setState('loading');
    loadSearcher().then(
      (s) => {
        searcher.current = s;
        setState('ready');
      },
      () => {
        setState('error');
      },
    );
  };

  useEffect(() => {
    if (state !== 'ready' || searcher.current === null) return;
    setHits(query.trim().length === 0 ? null : searcher.current.search(query));
  }, [state, query]);

  const status = ((): string => {
    if (state === 'error') return 'La recherche n’a pas pu se charger. Réessaie plus tard.';
    if (query.trim().length === 0) return '';
    if (state !== 'ready' || hits === null) return 'Chargement de la recherche…';
    if (hits.length === 0) return 'Rien avec ces mots. Essaie un synonyme ou un sujet plus large.';
    return `${String(hits.length)} passages trouvés`;
  })();

  return (
    <section aria-labelledby="search-title" className="search mt-6">
      <label id="search-title" htmlFor="q" className={`${label} block text-brand`}>
        Chercher dans le programme
      </label>
      <input
        id="q"
        type="search"
        autoComplete="off"
        placeholder="Un mot, une objection, un sujet…"
        value={query}
        onFocus={warm}
        onChange={(e) => {
          setQuery(e.target.value);
          warm();
        }}
        className="mt-2 box-border w-full rounded-field border-2 border-brand bg-bg px-3 py-2 font-ui text-body leading-body text-text min-h-11"
      />
      <p className="m-0 mt-2 text-small leading-small">
        Essaie : règle verte, SMIC, 6e République, planification écologique.
      </p>
      <div aria-live="polite" className="mt-3">
        {status.length > 0 ? <p className="status m-0 text-small leading-small">{status}</p> : null}
        {hits !== null && hits.length > 0 ? (
          <ol className="mt-2 list-none p-0" data-results>
            {hits.map((h) => (
              <li key={h.id} className="hit mt-2 rounded-card bg-bg-elevated p-3">
                <span className={`${label} block text-brand`}>
                  {KIND_LABEL[h.kind] ?? h.kind} · {h.sectionTitle}
                </span>
                <p className="m-0 mt-1 font-verbatim text-verbatim leading-verbatim">{h.text}</p>
                <a
                  href={h.url}
                  className="mt-1 inline-block text-small leading-small text-brand underline"
                  rel="noopener"
                >
                  {h.chapterTitle}
                </a>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  );
}
