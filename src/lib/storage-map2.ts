/**
 * Everything the site writes on a phone once the mascot is of the second generation (D17.3,
 * D17.14; docs/discovery/PLAN-TORTUE.md §9) — the map of src/lib/storage-map.ts, read through
 * and never changed, with ONE field more in each storage: the colour the player gave her.
 * IN PREPARATION: the privacy page reads the first map until a host serves her, and nothing
 * that is served imports this module.
 *
 * Like the first, it is not a description kept next to the code: it is built from the very
 * lists of fields her memory is written with (src/lib/game-state2.ts). A field added there
 * without a sentence here does not compile.
 */
import { KEPT_FIELDS2, STORAGE_KEY, TAB_FIELDS2 } from './game-state2.js';
import type { MascotGeneration } from './mascot-mode.js';
import { STORAGE_MAP, type StorageEntry } from './storage-map.js';

type Field2 = (typeof TAB_FIELDS2)[number];

/** A line of the second map: the first map's, or the one she adds. */
export interface StorageEntry2 extends Omit<StorageEntry, 'fields'> {
  fields: { name: Field2; label: string }[];
}

/** The sentence of the kit that says what the one new field holds. */
export const TINT_LABEL = 'privacy.game.field.tint';

const LABELS = new Map<string, string>(
  STORAGE_MAP.flatMap((entry) => entry.fields.map((f) => [f.name, f.label] as const)),
);
const fields = (names: readonly Field2[]): StorageEntry2['fields'] =>
  names.map((name) => ({ name, label: name === 'tint' ? TINT_LABEL : (LABELS.get(name) ?? '') }));

const STORAGE_MAP_2: readonly StorageEntry2[] = STORAGE_MAP.map((entry) => ({
  storage: entry.storage,
  key: STORAGE_KEY,
  lead: entry.lead,
  fields: fields(entry.storage === 'localStorage' ? KEPT_FIELDS2 : TAB_FIELDS2),
}));

/** Everything the site writes on a phone, for the generation of the mascot a host serves. */
export const storageMap = (generation: MascotGeneration): readonly StorageEntry2[] =>
  generation === 2 ? STORAGE_MAP_2 : STORAGE_MAP;

/** Every key of the kit a map uses: the privacy page prints them, a test checks they exist. */
export const storageStrings = (generation: MascotGeneration): readonly string[] => [
  ...new Set(
    storageMap(generation).flatMap((entry) => [entry.lead, ...entry.fields.map((f) => f.label)]),
  ),
];
