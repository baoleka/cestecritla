/**
 * The few lines that hide the game BEFORE the first paint when the clock of the device is in an
 * electoral silence window, or within five minutes of one (D16.16: closed when in doubt).
 *
 * Why a script in the page and not the module that plays the game: a module runs after the
 * page has been drawn once. For that one frame a word of the programme would be shown under
 * our name on a polling Sunday. These lines run in the <head>, synchronously; the module then
 * reads the hour of our own server (src/scripts/silence-now.ts) and has the last word — in
 * both directions: a phone whose clock is wrong opens again, or closes.
 *
 * Without JavaScript nothing here runs: that is what the "scrutin" build is for, deployed
 * before each window, whose HTML holds neither a word nor a tile.
 *
 * The windows are written in the script as numbers, computed at build time from the one
 * calendar (src/lib/silence.ts): no date is typed here.
 */
import { createHash } from 'node:crypto';
import { MAX_CLOCK_DRIFT_MS, silenceWindows } from './silence.js';

/** The attribute the guard sets on <html>, and the stylesheets read. */
export const SILENCE_ATTRIBUTE = 'data-silence';

export function silenceGuardScript(): string {
  const windows = silenceWindows().map((w) => [w.startUtc.getTime(), w.endUtc.getTime()]);
  return (
    `(function(){var w=${JSON.stringify(windows)},n=Date.now(),m=${String(MAX_CLOCK_DRIFT_MS)};` +
    `for(var i=0;i<w.length;i++){if(n>=w[i][0]-m&&n<w[i][1]+m){` +
    `document.documentElement.setAttribute("${SILENCE_ATTRIBUTE}","");break}}})();`
  );
}

/** What the page's security policy must allow for the guard to run: its hash, and only it. */
export const silenceGuardHash = (): `sha256-${string}` =>
  `sha256-${createHash('sha256').update(silenceGuardScript()).digest('base64')}`;
