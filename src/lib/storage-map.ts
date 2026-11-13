/**
 * Everything the site writes on a phone — one map, read by the privacy page and by the tests
 * that hold it (D16.14; PLAN-JEU §5).
 *
 * The map is not a description kept next to the code: it is built from the very lists of
 * fields the game's memory is written with (src/lib/game-state.ts). A field added there
 * without a sentence here does not compile; a sentence here for a field that is not written
 * cannot exist. The end-to-end gate then reads the real storages of a browser after a game and
 * checks that nothing is there that the map does not name.
 *
 * Why no consent banner (11-conformite §6): article 82 of the French data-protection act
 * exempts what is strictly necessary to a service the visitor asks for. The tab's memory is the
 * game itself; the phone's is written only after « Garder ta tortue » — a request, in so many
 * words. One purpose, one explicit key. The qualification is PROBABLE, not a ruling.
 */
import { KEPT_FIELDS, STORAGE_KEY, TAB_FIELDS } from './game-state.js';

type Field = (typeof TAB_FIELDS)[number];

/** The sentence of the kit that says, in the reader's words, what a field holds. */
const FIELD_LABELS: Record<Field, string> = {
  corpus: 'privacy.game.field.corpus',
  seen: 'privacy.game.field.seen',
  depth: 'privacy.game.field.depth',
  turtle: 'privacy.game.field.turtle',
  arcs: 'privacy.game.field.arcs',
  round: 'privacy.game.field.round',
  declined: 'privacy.game.field.declined',
};

export interface StorageEntry {
  /** The browser API, by its name: what a reader finds in the developer tools. */
  storage: 'sessionStorage' | 'localStorage';
  key: string;
  /** Kit key of the sentence that says when this is written, and until when. */
  lead: string;
  fields: { name: Field; label: string }[];
}

export const STORAGE_MAP: readonly StorageEntry[] = [
  {
    storage: 'sessionStorage',
    key: STORAGE_KEY,
    lead: 'privacy.game.tab',
    fields: TAB_FIELDS.map((name) => ({ name, label: FIELD_LABELS[name] })),
  },
  {
    storage: 'localStorage',
    key: STORAGE_KEY,
    lead: 'privacy.game.kept',
    fields: KEPT_FIELDS.map((name) => ({ name, label: FIELD_LABELS[name] })),
  },
];

/** Every key of the kit the map uses: the privacy page prints them, a test checks they exist. */
export const STORAGE_STRINGS: readonly string[] = [
  ...new Set(STORAGE_MAP.flatMap((entry) => [entry.lead, ...entry.fields.map((f) => f.label)])),
];
