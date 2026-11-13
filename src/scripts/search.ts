/**
 * The search, in the browser (see src/components/Search.astro for the contract).
 *
 * It answers while one types (D16.9): from two letters on, results follow the last key by
 * 120 ms. Two clocks, on purpose:
 *
 *   120 ms   the list. Short enough to feel immediate, long enough that a burst of keys costs
 *            one search and not five — and the search runs in the timer, never in the key
 *            handler, so a key is never kept waiting for it (INP).
 *   700 ms   the sentence that says how many were found, and the address. A screen reader
 *            reads a `role="status"` every time its text changes: at 120 ms it would talk over
 *            every letter. So the count is said once, when the typing has paused. The address
 *            waits for the same pause — Safari refuses more than a hundred `replaceState` in
 *            thirty seconds.
 *
 * Everything shown is built with `createElement` and `textContent`: what a visitor types — or
 * what a link someone sent them carries after `#q=` — is never parsed as HTML. And nothing typed
 * leaves the device: the index and the titles are two static files, fetched once.
 */
import MiniSearch from 'minisearch';
import {
  INDEX_OPTIONS,
  buildQuery,
  expand,
  groupBySection,
  searchOptions,
  type SearchDoc,
  type SynonymGroup,
} from '../lib/search-core.ts';
import { enhanceOfficialLinks } from './deep-links.ts';

/** /data/meta-<version>.json — built from the public manifest (src/pages/data/[name].json.ts). */
interface Meta {
  /** Section id → [title, where ("Partie 2 · chapitre 2"), official URL]. */
  sections: Record<string, [string, string, string]>;
  /** Proposition id → [label ("Mesure clé", "Mesure 7.2"), text directive or "", incipit or ""]. */
  items: Record<string, [string, string, string]>;
  synonyms: SynonymGroup[];
}

interface Strings {
  opening: string;
  one: string;
  many: string;
  none: string;
  noneHint: string;
  where: string;
  incipit: string;
  missing: string;
}

interface Engine {
  index: MiniSearch<SearchDoc>;
  meta: Meta;
}

const MAX_SECTIONS = 8;
const MAX_QUERY = 200;
/** Nothing is searched under two letters: one letter matches a tenth of the book. */
const MIN_LETTERS = 2;
const TYPING_DELAY_MS = 120;
const SETTLE_DELAY_MS = 700;

const form = document.querySelector<HTMLFormElement>('#search');
const input = document.querySelector<HTMLInputElement>('#q');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLElement>('#search-results');
const heading = document.querySelector<HTMLElement>('#search-results-title');
const list = document.querySelector<HTMLOListElement>('#search-list');
const stringsNode = document.querySelector('#search-strings');

if (form && input && status && results && heading && list && stringsNode) {
  const strings = JSON.parse(stringsNode.textContent) as Strings;
  let engine: Promise<Engine> | undefined;
  let loaded = false;

  /** Fetched once, on the first sign that someone is going to search. */
  const load = (): Promise<Engine> => {
    engine ??= Promise.all([
      fetch(form.dataset.index ?? '').then((r) => {
        if (!r.ok) throw new Error('index');
        return r.json() as Promise<Parameters<typeof MiniSearch.loadJS>[0]>;
      }),
      fetch(form.dataset.meta ?? '').then((r) => {
        if (!r.ok) throw new Error('meta');
        return r.json() as Promise<Meta>;
      }),
    ]).then(([serialised, meta]) => {
      loaded = true;
      return { index: MiniSearch.loadJS<SearchDoc>(serialised, INDEX_OPTIONS), meta };
    });
    // A failed download must not be remembered as the answer: the next attempt starts again.
    engine.catch(() => {
      engine = undefined;
    });
    return engine;
  };

  const el = <K extends keyof HTMLElementTagNameMap>(
    tag: K,
    text?: string,
    className?: string,
  ): HTMLElementTagNameMap[K] => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className !== undefined) node.className = className;
    return node;
  };

  const render = (meta: Meta, groups: ReturnType<typeof groupBySection>): void => {
    list.replaceChildren();
    for (const group of groups) {
      const section = meta.sections[group.sectionId];
      if (section === undefined) continue;
      const [title, where, url] = section;
      const item = el('li', undefined, 'result');

      const name = el('h3');
      const page = el('a', title);
      page.href = `/s/${group.sectionId}/`;
      page.dataset.programme = 'title';
      name.append(page);
      item.append(name, el('p', where, 'where'));

      const hits = el('p', `${strings.where} : `, 'hits');
      group.items.forEach((id, position) => {
        const entry = meta.items[id];
        if (entry === undefined) return;
        const [label, fragment, incipit] = entry;
        if (incipit !== '') {
          const first = el('p', `« ${incipit}… »`, 'incipit');
          first.dataset.programme = 'incipit';
          first.title = strings.incipit;
          item.append(first);
        }
        const link = el('a', label.toLowerCase());
        link.href = url;
        link.rel = 'noopener';
        if (fragment !== '') link.dataset.fragment = fragment;
        if (position > 0) hits.append(', ');
        hits.append(link);
      });
      item.append(hits);
      list.append(item);
    }
    enhanceOfficialLinks(list);
  };

  const clean = (value: string): string => value.trim().slice(0, MAX_QUERY);
  const longEnough = (question: string): boolean =>
    question.replace(/\s+/g, '').length >= MIN_LETTERS;

  /** What the list currently shows, so that a key which changes nothing redraws nothing. */
  let shown = '';
  const empty = (): void => {
    list.replaceChildren();
    results.hidden = true;
    shown = '';
  };

  /**
   * Searches and shows the list. Resolves with the sentence the status line should say, or
   * `null` when a newer search started while this one was loading: its result is not wanted.
   */
  let latest = 0;
  const run = async (question: string): Promise<string | null> => {
    const turn = (latest += 1);
    if (!longEnough(question)) {
      empty();
      return '';
    }
    if (!loaded) status.textContent = strings.opening;
    try {
      const { index, meta } = await load();
      if (turn !== latest) return null;
      const query = buildQuery(question, expand(question, meta.synonyms));
      const hits = index
        .search(query as Parameters<typeof index.search>[0], searchOptions())
        .map((r) => ({ id: String(r.id), score: r.score }));
      const groups = groupBySection(hits).slice(0, MAX_SECTIONS);
      const signature = groups.map((g) => `${g.sectionId}:${g.items.join('+')}`).join('|');
      if (signature !== shown || results.hidden !== (groups.length === 0)) {
        render(meta, groups);
        results.hidden = groups.length === 0;
        shown = signature;
      }
      return groups.length === 0
        ? `${strings.none} ${strings.noneHint}`
        : groups.length === 1
          ? strings.one
          : strings.many.replace('{count}', String(groups.length));
    } catch {
      if (turn !== latest) return null;
      empty();
      return strings.missing;
    }
  };

  /** The query lives after `#`: the one part of the address that is never sent to a server. */
  const fromHash = (): string => {
    const match = /^#q=(.*)$/.exec(location.hash);
    if (match === null) return '';
    try {
      return clean(decodeURIComponent(match[1] ?? ''));
    } catch {
      return '';
    }
  };
  const toHash = (question: string): void => {
    const address =
      question === ''
        ? `${location.pathname}${location.search}`
        : `#q=${encodeURIComponent(question)}`;
    try {
      history.replaceState(null, '', address);
    } catch {
      // A browser that rations replaceState keeps the previous address: the search still works.
    }
  };

  let typing: number | undefined;
  let settling: number | undefined;
  const cancelTimers = (): void => {
    window.clearTimeout(typing);
    window.clearTimeout(settling);
  };

  /** A search whose answer is wanted now: Enter, a link carrying `#q=`, back and forward. */
  const searchNow = async (question: string): Promise<void> => {
    cancelTimers();
    const sentence = await run(question);
    if (sentence === null) return;
    status.textContent = sentence;
  };

  form.hidden = false;
  input.addEventListener('focus', () => void load().catch(() => undefined), { once: true });

  input.addEventListener('input', () => {
    cancelTimers();
    const question = clean(input.value);
    typing = window.setTimeout(
      () => {
        void run(question).then((sentence) => {
          if (sentence === null) return;
          // The count of a moment ago is no longer true: it goes now, the new one comes at rest.
          if (status.textContent !== sentence) status.textContent = '';
          settling = window.setTimeout(() => {
            status.textContent = sentence;
            toHash(longEnough(question) ? question : '');
          }, SETTLE_DELAY_MS - TYPING_DELAY_MS);
        });
      },
      longEnough(question) ? TYPING_DELAY_MS : 0,
    );
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = clean(input.value);
    toHash(longEnough(question) ? question : '');
    void searchNow(question).then(() => {
      // Enter means "I have finished typing": the results take the focus, which also folds the
      // keyboard of a phone away from them. With nothing found the field keeps it.
      if (!results.hidden) heading.focus();
    });
  });

  window.addEventListener('hashchange', () => {
    const question = fromHash();
    if (question === clean(input.value)) return;
    input.value = question;
    void searchNow(question);
  });

  const initial = fromHash();
  if (initial !== '') {
    input.value = initial;
    void searchNow(initial);
  }
}
