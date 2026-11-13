/**
 * The electoral silence, as a page can know it (D0.24, D16.16).
 *
 * The calendar is in the code; the hour is the device's — and a device's clock can be wrong, by
 * accident or on purpose. So the page asks our own server one thing, `/flags.json`: a static
 * file, never cached, whose `Date` header is the hour of someone who does not lie to us, and
 * whose one field can close everything by hand (`silence_override`).
 *
 * Closed when in doubt, and the doubt is spelled out. The page holds two hours: the device's,
 * and the one our server gave, aged since on a clock the device cannot set (`performance.now`).
 * They part for two reasons the page cannot tell apart — a clock moved by hand, and a phone that
 * slept: the monotonic clock of a phone does not count its sleep, so ten minutes in a pocket
 * leave our hour ten minutes behind. Neither hour is then the true one; the true one is not
 * known to be outside what lies between them. So:
 *   - the page is closed when a silence window — five minutes wider at each end — touches the
 *     span between the two hours. A phone four minutes late does not show the game at 00:01 on
 *     the Friday; one whose clock says Monday while ours says Thursday shows nothing either;
 *   - with no window anywhere in that span, it is open, whatever the gap: a phone that slept
 *     in November is not a phone that lies. (The first version of this file closed on any gap
 *     of five minutes: every wake-up would have hidden the game until the network answered.)
 *   - an hour once read from our server is kept when a later request fails; and the page asks
 *     again whenever the tab is looked at, which is when a phone wakes.
 * Without any answer at all — offline, a network that refuses — the calendar decides alone.
 *
 * Shared by « Demander » and by the game: both must say the same thing at the same minute.
 */
import {
  MAX_CLOCK_DRIFT_MS,
  effectiveDate,
  silenceWindows,
  type EffectiveDate,
  type SilenceOverride,
} from '../lib/silence.ts';

/** A network that drags must not leave a frozen page open: the question is dropped after this. */
const FLAGS_TIMEOUT_MS = 4000;

export interface SilenceReading {
  /** What the calendar says now, with what the server last told us. No network. */
  now(): EffectiveDate;
  /** Asks the server again: at arrival, and whenever the tab is looked at again. */
  refresh(): Promise<void>;
}

export function silenceReading(): SilenceReading {
  /** The hour of our server at its last answer, and what the monotonic clock said then. */
  let serverAt: number | null = null;
  let readAt = 0;
  let override: SilenceOverride = 'auto';
  const windows = silenceWindows();
  /** A window, five minutes wider at each end, touches the span from `lo` to `hi`. */
  const touches = (lo: number, hi: number): boolean =>
    windows.some(
      (w) =>
        hi >= w.startUtc.getTime() - MAX_CLOCK_DRIFT_MS &&
        lo < w.endUtc.getTime() + MAX_CLOCK_DRIFT_MS,
    );
  return {
    now: () => {
      const now = new Date();
      const reference =
        serverAt === null ? null : new Date(serverAt + (performance.now() - readAt));
      const reading = effectiveDate(now, { override, serverDate: reference });
      // A switch thrown by hand is an answer, not a doubt.
      if (override !== 'auto') return reading;
      const ours = reference?.getTime() ?? now.getTime();
      const doubt = touches(Math.min(now.getTime(), ours), Math.max(now.getTime(), ours));
      // Closed: by the calendar on a clock we believe — then the hour it reopens is known —
      // or because a window is within reach of what the two clocks say, and then it is not.
      if (doubt) return reading.silence ? reading : { ...reading, silence: true, reopenUtc: null };
      // No window between the two hours: whichever is right, the page is open.
      return reading.silence ? { ...reading, silence: false, reopenUtc: null } : reading;
    },
    refresh: async () => {
      const controller = new AbortController();
      const timer = window.setTimeout(() => {
        controller.abort();
      }, FLAGS_TIMEOUT_MS);
      try {
        const response = await fetch('/flags.json', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const header = response.headers.get('date');
        const flags = (await response.json()) as { silence_override?: unknown };
        const value = flags.silence_override;
        override = value === 'on' || value === 'off' ? value : 'auto';
        const at = header === null ? Number.NaN : new Date(header).getTime();
        if (!Number.isNaN(at)) {
          serverAt = at;
          readAt = performance.now();
        }
      } catch {
        // No answer: what was known stays known. With nothing known, the calendar decides
        // alone, on this device's clock.
      } finally {
        window.clearTimeout(timer);
      }
    },
  };
}
