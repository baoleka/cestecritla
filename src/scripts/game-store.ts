/**
 * Where the game's memory goes (D16.14; PLAN-JEU §5) — the only file that touches a storage.
 *
 *   - the tab (sessionStorage): written from the first reveal on, gone when the tab closes;
 *   - the phone (localStorage): written only after « Garder ta tortue », then at every change;
 *     never before, and never again after « Ne plus garder sur ce téléphone » or « Tout
 *     effacer ».
 *
 * One key for both (src/lib/game-state.ts), and the strings are that module's: field by field,
 * with no place for a choice, an answer, a time or an identifier.
 *
 * A storage that refuses — private browsing, a full disk, a browser told to block the site —
 * is not an error: the game goes on in the page, and nothing is said about it.
 */
import type { GameData } from '../lib/game-engine.ts';
import {
  STORAGE_KEY,
  keptPart,
  merge,
  parseKept,
  parseTab,
  serialiseKept,
  serialiseTab,
  type TabState,
} from '../lib/game-state.ts';

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

export interface GameStore {
  /** What this tab and this phone remember, as one game. */
  load(): TabState;
  /** After a change: the tab — and the phone if, and only if, it was asked to keep. */
  save(state: TabState): void;
  /** The phone was asked to keep. */
  kept(): boolean;
  /** « Garder ta tortue ». */
  keep(state: TabState): void;
  /** « Ne plus garder sur ce téléphone »: the phone forgets, the tab goes on until it closes. */
  release(): void;
  /** « Tout effacer »: the tab and the phone, at once. */
  erase(): void;
  /**
   * Another tab of this phone did something: `onKept` with the two games as one when it kept,
   * `onReleased` when the phone no longer keeps, `onErased` when there is nothing left to
   * remember — here either.
   */
  watch(
    current: () => TabState,
    on: { kept: (state: TabState) => void; released: () => void; erased: () => void },
  ): void;
}

export function gameStore(data: GameData): GameStore {
  // The empty string is the instant between the two writes of « Tout effacer »: not a keeping.
  const kept = (): boolean => (read('phone') ?? '') !== '';
  /** The tab's game and the phone's, as one: nothing either found is lost. */
  const withPhone = (state: TabState): TabState => ({
    ...state,
    ...merge(state, parseKept(read('phone'), data)),
  });
  const keep = (state: TabState): void => {
    write('phone', serialiseKept(keptPart(withPhone(state))));
  };
  return {
    load: () => withPhone(parseTab(read('tab'), data)),
    save: (state) => {
      // Nothing is written before a first word has been shown.
      if (state.seen.length === 0) return;
      write('tab', serialiseTab(state));
      if (kept()) keep(state);
    },
    kept,
    keep,
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
          const state = current();
          on.kept({ ...state, ...merge(state, parseKept(event.newValue, data)) });
        }
      });
    },
  };
}
