/**
 * The "scrutin" build says until when (D16.41).
 *
 * That build has no game to hide and, until 14 November 2026, no hour to give: six personas out
 * of seven read « en pause » and asked « jusqu'à quand ? ». The sentence is finished here, in
 * the browser, because the hour depends on the day the page is read: the end of the window we
 * are in, or of the one that opens within a day (the build goes online on the eve). Once that
 * window is over the page announces nothing — the next one is two weeks away.
 *
 * The sentence says « après », not « à »: on this build the game comes back when the editor
 * redeploys the ordinary one, not at the stroke of the hour.
 *
 * Same caution as the game's own notice (src/scripts/game.ts): an hour is announced only on a
 * clock that can be believed — a clock our server contradicts has no hour to give. Without
 * script, nothing is added: the page says what is paused and why, as before.
 */
import { announcedReopen, formatReopenTimeFr } from '../lib/silence.ts';
import { silenceReading } from './silence-now.ts';

const note = document.querySelector<HTMLElement>('#scrutin-reopen');
if (note !== null) {
  const template = note.dataset.reopen ?? '';
  const silence = silenceReading();
  const say = (): void => {
    const reading = silence.now();
    const believed =
      reading.override === 'auto' && (reading.clockTrusted || reading.driftMs === null);
    const reopen = believed ? announcedReopen(new Date()) : null;
    note.textContent =
      reopen === null ? '' : template.replace('{reopenTime}', formatReopenTimeFr(reopen));
  };
  const ask = (): void => {
    void silence.refresh().then(say, say);
  };
  say();
  ask();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') ask();
  });
}
