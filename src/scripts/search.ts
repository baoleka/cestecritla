/**
 * The search, in the browser (see src/components/Search.astro for the contract).
 *
 * Everything shown is built with `createElement` and `textContent`: what a visitor types — or
 * what a link someone sent them carries after `#q=` — is never parsed as HTML.
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

const MAX_SECTIONS = 8;

const form = document.querySelector<HTMLFormElement>('#search');
const input = document.querySelector<HTMLInputElement>('#q');
const status = document.querySelector<HTMLElement>('#search-status');
const results = document.querySelector<HTMLElement>('#search-results');
const list = document.querySelector<HTMLOListElement>('#search-list');
const stringsNode = document.querySelector('#search-strings');

if (form && input && status && results && list && stringsNode) {
  const strings = JSON.parse(stringsNode.textContent) as Strings;
  let engine: Promise<{ index: MiniSearch<SearchDoc>; meta: Meta }> | undefined;

  /** Fetched once, on the first sign that someone is going to search. */
  const load = (): Promise<{ index: MiniSearch<SearchDoc>; meta: Meta }> => {
    engine ??= Promise.all([
      fetch(form.dataset.index ?? '').then((r) => {
        if (!r.ok) throw new Error('index');
        return r.json() as Promise<Parameters<typeof MiniSearch.loadJS>[0]>;
      }),
      fetch(form.dataset.meta ?? '').then((r) => {
        if (!r.ok) throw new Error('meta');
        return r.json() as Promise<Meta>;
      }),
    ]).then(([serialised, meta]) => ({
      index: MiniSearch.loadJS<SearchDoc>(serialised, INDEX_OPTIONS),
      meta,
    }));
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

      const heading = el('h3');
      const page = el('a', title);
      page.href = `/s/${group.sectionId}/`;
      page.dataset.programme = 'title';
      heading.append(page);
      item.append(heading, el('p', where, 'where'));

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

  let latest = 0;
  const run = async (question: string): Promise<void> => {
    const turn = (latest += 1);
    if (question === '') {
      list.replaceChildren();
      results.hidden = true;
      status.textContent = '';
      return;
    }
    status.textContent = strings.opening;
    try {
      const { index, meta } = await load();
      if (turn !== latest) return; // a newer search started while this one was loading
      const query = buildQuery(question, expand(question, meta.synonyms));
      const hits = index
        .search(query as Parameters<typeof index.search>[0], searchOptions())
        .map((r) => ({ id: String(r.id), score: r.score }));
      const groups = groupBySection(hits).slice(0, MAX_SECTIONS);
      render(meta, groups);
      results.hidden = groups.length === 0;
      status.textContent =
        groups.length === 0
          ? `${strings.none} ${strings.noneHint}`
          : groups.length === 1
            ? strings.one
            : strings.many.replace('{count}', String(groups.length));
    } catch {
      if (turn !== latest) return;
      results.hidden = true;
      status.textContent = strings.missing;
    }
  };

  /** The query lives after `#`: the one part of the address that is never sent to a server. */
  const fromHash = (): string => {
    const match = /^#q=(.*)$/.exec(location.hash);
    if (match === null) return '';
    try {
      return decodeURIComponent(match[1] ?? '').slice(0, 200);
    } catch {
      return '';
    }
  };

  form.hidden = false;
  input.addEventListener('focus', () => void load().catch(() => undefined), { once: true });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const question = input.value.trim().slice(0, 200);
    history.replaceState(
      null,
      '',
      question === '' ? location.pathname : `#q=${encodeURIComponent(question)}`,
    );
    void run(question);
  });
  window.addEventListener('hashchange', () => {
    const question = fromHash();
    input.value = question;
    void run(question);
  });

  const initial = fromHash();
  if (initial !== '') {
    input.value = initial;
    void run(initial);
  }
}
