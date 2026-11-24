/**
 * Days and instants written as text, read back: a shape is not a date. `Date.parse` rolls
 * « 2026-02-30 » over to 2 March and « 2026-11-31 » to 1 December, so a check on the shape
 * alone lets a day that does not exist through (review of 24/11/2026).
 */

/** A day « YYYY-MM-DD » that exists. */
export function isDay(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const ms = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(ms) && new Date(ms).toISOString().slice(0, 10) === value;
}

/** An instant « YYYY-MM-DDTHH:MM:SS(.mmm)Z » that exists: read back, the same instant. */
export function isInstant(value: unknown): value is string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)
  ) {
    return false;
  }
  const ms = Date.parse(value);
  if (Number.isNaN(ms)) return false;
  const back = new Date(ms).toISOString();
  return value.length === back.length ? back === value : back.replace('.000Z', 'Z') === value;
}
