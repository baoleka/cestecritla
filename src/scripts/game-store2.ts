/**
 * Where the game's memory goes (D16.14, D17.3; docs/discovery/PLAN-TORTUE.md §9) — the only
 * file of the game that touches a storage. It is the first generation's store
 * (src/scripts/game-store.ts, removed with lot F), rule for rule, with the one field the second
 * generation adds: her colour.
 *
 *   - the tab (sessionStorage): written from the first reveal on, gone when the tab closes;
 *   - the phone (localStorage): written only after « Garder ta tortue », then at every change;
 *     never before, and never again after « Ne plus garder sur ce téléphone » or « Tout
 *     effacer ».
 *
 * One key for both, the same as before (src/lib/game-state2.ts): nobody loses their turtle, and
 * what is written while she has no colour is, byte for byte, what the first generation writes.
 *
 * Progress is joined as ever — the most of each. Her colour is not progress: the last gesture
 * wins. A colour chosen in this tab, or « Garder », is a gesture of this tab (`ontoPhone`);
 * anything else — a page that opens, a round that ends, another tab that wrote — takes the
 * phone's colour when it has one (`fromPhone`), because every gesture that gave her a colour,
 * in any tab, wrote it there.
 *
 * A storage that refuses — private browsing, a full disk, a browser told to block the site —
 * is not an error: the game goes on in the page, and nothing is said about it.
 */
import type { GameData } from '../lib/game-engine.ts';
import {
  STORAGE_KEY,
  fromPhone,
  keptPart2,
  ontoPhone,
  parseKept2,
  parseTab2,
  serialiseKept2,
  serialiseTab2,
  type Kept2,
  type TabState2,
} from '../lib/game-state2.ts';
import type { MascotTint } from '../lib/mascot2.ts';

type Where = 'tab' | 'phone';

function area(where: Where): Storage | null {
  try {
    return where === 'tab' ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
}
function read(where: Where): string | null {
  try {
    return area(where)?.getItem(STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
}
function write(where: Where, value: string): void {
  try {
    area(where)?.setItem(STORAGE_KEY, value);
  } catch {
    // Refused: the game goes on without it.
  }
}
function remove(where: Where): void {
  try {
    area(where)?.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to remove from a storage that cannot be reached.
  }
}

export interface GameStore2 {
  /** What this tab and this phone remember, as one game. */
  load(): TabState2;
  /**
   * After a change of the game: the tab — and the phone if, and only if, it was asked to keep.
   * What is written of her colour is the phone's when it has one: an older colour of this tab
   * never takes the place of the last one chosen.
   */
  save(state: TabState2): void;
  /** A colour was just chosen here: the tab, and the phone if it keeps — this gesture wins. */
  tint(state: TabState2): void;
  /** The phone was asked to keep. */
  kept(): boolean;
  /** The colour the phone holds of her: 0 when it holds none, or keeps nothing. */
  phoneTint(): MascotTint;
  /** « Garder ta tortue ». */
  keep(state: TabState2): void;
  /** « Ne plus garder sur ce téléphone »: the phone forgets, the tab goes on until it closes. */
  release(): void;
  /** « Tout effacer »: the tab and the phone, at once. */
  erase(): void;
  /**
   * Another tab of this phone did something: `kept` with the two games as one when it kept or
   * gave her a colour, `released` when the phone no longer keeps, `erased` when there is
   * nothing left to remember — here either.
   */
  watch(
    current: () => TabState2,
    on: { kept: (state: TabState2) => void; released: () => void; erased: () => void },
  ): void;
}

export function gameStore2(data: GameData): GameStore2 {
  // The empty string is the instant between the two writes of « Tout effacer »: not a keeping.
  const kept = (): boolean => (read('phone') ?? '') !== '';
  const onPhone = (): Kept2 => parseKept2(read('phone'), data);
  /** The tab's game and the phone's, as one: nothing either found is lost. */
  const withPhone = (state: TabState2, phone: Kept2): TabState2 => ({
    ...state,
    ...fromPhone(state, phone),
  });
  return {
    load: () => withPhone(parseTab2(read('tab'), data), onPhone()),
    save: (state) => {
      // Nothing is written before a first word has been shown.
      if (state.seen.length === 0) return;
      if (!kept()) {
        write('tab', serialiseTab2(state));
        return;
      }
      const joined = withPhone(state, onPhone());
      write('tab', serialiseTab2({ ...state, tint: joined.tint }));
      write('phone', serialiseKept2(keptPart2(joined)));
    },
    tint: (state) => {
      if (state.seen.length === 0) return;
      write('tab', serialiseTab2(state));
      if (kept()) write('phone', serialiseKept2(ontoPhone(keptPart2(state), onPhone())));
    },
    kept,
    phoneTint: () => onPhone().tint,
    keep: (state) => {
      write('phone', serialiseKept2(ontoPhone(keptPart2(state), onPhone())));
    },
    // The key is removed and nothing else: the other tabs hear that the phone keeps nothing
    // any more, and each goes on with its own round.
    release: () => {
      remove('phone');
    },
    erase: () => {
      remove('tab');
      // Removing a key says « no longer kept »; it is the empty value written just before that
      // says « erase »: every other tab of this phone hears it and forgets its own round too —
      // even when nothing was kept, where a removal alone would tell nobody.
      write('phone', '');
      remove('phone');
    },
    watch: (current, on) => {
      window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY && event.key !== null) return;
        if (event.storageArea !== area('phone')) return;
        // The empty value is « Tout effacer » — and so is the whole storage emptied at once,
        // which is not a gesture of ours: someone cleared the site's data.
        if (event.newValue === '' || event.key === null) {
          remove('tab');
          on.erased();
        } else if (event.newValue === null) {
          on.released();
        } else {
          // What the other tab wrote is in the event itself. Reading the storage again here is
          // not the same thing: Chromium may still answer with the value from before.
          on.kept(withPhone(current(), parseKept2(event.newValue, data)));
        }
      });
    },
  };
}
