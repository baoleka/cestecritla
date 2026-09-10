import page from '../../shared/generated/section.json';
import type { PageData } from '../../shared/types.ts';
import { SearchBox } from './SearchBox.tsx';

const data = page as PageData;

const label = 'text-label leading-label font-bold uppercase tracking-[0.1em]';

export function App() {
  const { chapter, section, meta } = data;
  return (
    <>
      <header className="border-b-2 border-brand px-4 py-3">
        <a
          href="/"
          className="font-ui text-h2 leading-h2 font-black uppercase text-brand no-underline"
        >
          C’est écrit <span className="text-accent-rouge">là</span>
        </a>
      </header>
      <main className="mx-auto max-w-[43rem] px-4 pb-10">
        <SearchBox />
        <article className="mt-8">
          <p className={`${label} text-brand`}>{chapter.title}</p>
          <h1 className="mt-2 font-ui text-h1 leading-h1 font-black text-balance">
            {section.title}
          </h1>
          {section.items
            .filter((i) => i.kind === 'paragraph')
            .map((p) => (
              <p
                key={p.id}
                className="mt-4 border-l-4 border-verbatim-rule bg-verbatim-bg px-4 py-3 font-verbatim text-verbatim leading-verbatim"
              >
                {p.text}
              </p>
            ))}
          <h2 className={`${label} mt-8 text-brand`}>Mesures de cette section</h2>
          <ol className="mt-2 list-none p-0">
            {section.items
              .filter((i) => i.kind !== 'paragraph')
              .map((m) => (
                <li
                  key={m.id}
                  className={
                    m.kind === 'key_measure'
                      ? 'mt-3 rounded-card bg-bg-elevated p-4 shadow-[6px_6px_0_var(--shadow-3d)]'
                      : 'mt-3 border-t border-verbatim-rule/30 pt-3'
                  }
                >
                  {m.kind === 'key_measure' ? (
                    <span className={`${label} text-accent-rouge`}>Mesure clé</span>
                  ) : null}
                  <p className="m-0 font-verbatim text-verbatim leading-verbatim">{m.text}</p>
                  {m.subMeasures ? (
                    <ul className="mt-2 pl-5 font-verbatim text-verbatim leading-verbatim">
                      {m.subMeasures.map((sm) => (
                        <li key={sm.id}>{sm.text}</li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
          </ol>
          {section.chiffres.map((a) => (
            <aside key={a.id} className="mt-8 rounded-card border-2 border-brand p-4">
              <span className={`${label} text-brand`}>À savoir</span>
              <p className="m-0 mt-1 font-verbatim text-verbatim leading-verbatim">{a.text}</p>
            </aside>
          ))}
          <p className="mt-6 text-small leading-small">
            <a href={section.url} className="text-brand underline" rel="noopener">
              Lire cette section sur melenchon2027.fr
            </a>
          </p>
        </article>
      </main>
      <footer className="border-t border-verbatim-rule/30 px-4 py-6 text-small leading-small">
        <p className="m-0">
          Texte du programme : La France insoumise – L’Avenir en commun. Licence{' '}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr"
            className="text-brand underline"
            rel="license noopener"
          >
            CC BY-NC-SA 4.0
          </a>
          . Corpus {meta.corpus_version}.
        </p>
        <p className="m-0 mt-2">
          Labo T7 — variante React 19 + Vite 6 + Tailwind v4 ·{' '}
          <a href="https://aec-lab-fw-astro.baoleka.workers.dev/" className="text-brand underline">
            variante Astro 5
          </a>
        </p>
      </footer>
    </>
  );
}
