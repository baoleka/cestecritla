/**
 * The interface strings, read from the kit (design/strings.json) and nowhere else.
 *
 * Learning note — why a typed `t()` and not strings in the pages. The kit is held by a test
 * (scripts/check-strings.test.ts): sentence length, typography, no word of failure, no campaign
 * vocabulary. A sentence typed straight into a page escapes all of it. `StringKey` is derived
 * from the JSON file itself, so a key that does not exist is a compile error, not a blank on
 * the page.
 */
import kit from '../../design/strings.json';

type Kit = typeof kit;
export type StringKey = Exclude<keyof Kit, '$meta'>;

const NBSP = String.fromCodePoint(0xa0);

/**
 * The contact address of the app, assembled at build time: the repository gate refuses a
 * literal address in a tracked file (D12.3), and a scraper reading the source finds none.
 */
const CONTACT_EMAIL = ['contact', 'cestecritla.fr'].join('@');

export function t(key: StringKey, params: Readonly<Record<string, string | number>> = {}): string {
  const template: string = kit[key];
  const values: Record<string, string | number> = { contactEmail: CONTACT_EMAIL, ...params };
  return (
    template
      .replace(/\{([a-zA-Z]+)\}/g, (_match, name: string) => {
        const value = values[name];
        if (value === undefined) throw new Error(`strings: "${key}" needs {${name}}`);
        return String(value);
      })
      // The kit is typed with straight apostrophes; the page shows typographic ones.
      .replace(/'/g, '’')
  );
}

/** `1069` → `1 069`, with a no-break space (the narrow one is absent from the fonts). */
export function fr(n: number): string {
  return n.toLocaleString('fr-FR').replace(/\s/g, NBSP);
}

/** ISO date → `12 novembre 2026`. */
export function frDate(iso: string): string {
  return new Date(iso)
    .toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    })
    .replace(/\s/g, NBSP);
}

/**
 * French typography for words of the programme shown on a page: no-break space before
 * `: ; ! ? » %` and after `«`. The corpus is normalised with plain spaces (that is what its
 * hashes are computed on); the source prints narrow no-break spaces there. This restores the
 * intent with the glyph the fonts have — spacing only, never a letter.
 */
export function typeset(text: string): string {
  return text.replace(/ ([:;!?»%])/g, `${NBSP}$1`).replace(/« /g, `«${NBSP}`);
}

/**
 * JSON for a `<script type="application/…json">` block.
 *
 * Learning note — `JSON.stringify` is not enough inside HTML. The HTML parser ends a script
 * element at the first `</script` it meets, whatever the JSON says: a title containing that
 * string would close the block and let the rest be parsed as markup. Escaping `<` as its
 * Unicode escape keeps the JSON identical for any JSON parser and inert for the HTML one.
 */
export function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/</g, String.raw`\u003c`);
}
