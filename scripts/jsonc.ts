/**
 * A minimal JSONC reader for wrangler.jsonc: line and block comments, trailing commas.
 *
 * Written as two small passes that both respect string literals, because the obvious regex
 * (`/\/\/.*$/gm`) eats the second half of any "https://…" value — and a gate that misreads the
 * deployed configuration is worse than no gate.
 */

/** Walks `text`, calling `outside` for each character that is not inside a string literal. */
function mapOutsideStrings(
  text: string,
  outside: (index: number) => { emit: string; next: number },
): string {
  let out = '';
  let i = 0;
  let inString = false;
  while (i < text.length) {
    const c = text.charAt(i);
    if (inString) {
      out += c;
      if (c === '\\') {
        out += text.charAt(i + 1);
        i += 2;
        continue;
      }
      if (c === '"') inString = false;
      i += 1;
      continue;
    }
    if (c === '"') {
      inString = true;
      out += c;
      i += 1;
      continue;
    }
    const step = outside(i);
    out += step.emit;
    i = step.next;
  }
  return out;
}

export function stripJsoncComments(text: string): string {
  return mapOutsideStrings(text, (i) => {
    const two = text.slice(i, i + 2);
    if (two === '//') {
      const end = text.indexOf('\n', i);
      return { emit: '', next: end === -1 ? text.length : end };
    }
    if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      return { emit: '', next: end === -1 ? text.length : end + 2 };
    }
    return { emit: text.charAt(i), next: i + 1 };
  });
}

function stripTrailingCommas(text: string): string {
  return mapOutsideStrings(text, (i) => {
    if (text.charAt(i) === ',') {
      const rest = /^\s*([}\]])/.exec(text.slice(i + 1));
      if (rest !== null) return { emit: '', next: i + 1 };
    }
    return { emit: text.charAt(i), next: i + 1 };
  });
}

export function parseJsonc(text: string): unknown {
  return JSON.parse(stripTrailingCommas(stripJsoncComments(text)));
}
