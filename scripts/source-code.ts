/**
 * Source code without its comments — what a gate on the code of the site reads. Strings, template
 * literals and regular expressions are kept whole: a comment marker inside them is not a comment.
 *
 * The rule this replaces, `source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')`, deleted everything
 * from « // » to the end of the line, inside « 'https://…' » too: the gate that looks for an
 * address the Worker would call could not see one written in a string (review of 23/11/2026, W5).
 *
 * A reader of the language, not a parser: a « / » opens a regular expression where an operand is
 * expected (after an operator, an opening bracket, a comma, a keyword or at the start), and
 * divides elsewhere. The sources of this repository hold no case where that rule is wrong;
 * scripts/source-code.test.ts holds the cases that matter to the gates.
 */

/** Words after which a « / » starts a regular expression, not a division. */
const BEFORE_OPERAND = new Set(['return', 'typeof', 'case', 'in', 'of', 'delete', 'void', 'yield']);

export function codeOf(source: string): string {
  let out = '';
  let i = 0;
  /** The last character of code kept, outside comments and literals, and the word it ends. */
  let last = '';
  let word = '';
  const at = (k: number): string => source.charAt(k);
  const keep = (from: number, to: number): void => {
    out += source.slice(from, to);
  };
  while (i < source.length) {
    const c = at(i);
    const next = at(i + 1);
    if (c === '/' && next === '/') {
      // A line comment: up to the end of the line, which stays.
      while (i < source.length && at(i) !== '\n') i += 1;
      continue;
    }
    if (c === '/' && next === '*') {
      // A block comment: its line breaks stay, so that lines keep their numbers.
      const end = source.indexOf('*/', i + 2);
      const stop = end === -1 ? source.length : end + 2;
      out += source.slice(i, stop).replace(/[^\n]/g, '');
      i = stop;
      continue;
    }
    if (c === "'" || c === '"') {
      const start = i;
      i += 1;
      while (i < source.length && at(i) !== c && at(i) !== '\n') i += at(i) === '\\' ? 2 : 1;
      i += 1;
      keep(start, i);
      last = c;
      word = '';
      continue;
    }
    if (c === '`') {
      // A template: its text, and the code of its ${…} kept as it is, braces counted.
      const start = i;
      i += 1;
      let depth = 0;
      while (i < source.length) {
        const t = at(i);
        if (t === '\\') {
          i += 2;
          continue;
        }
        if (depth === 0 && t === '`') break;
        if (t === '$' && at(i + 1) === '{') {
          depth += 1;
          i += 2;
          continue;
        }
        if (depth > 0 && t === '{') depth += 1;
        if (depth > 0 && t === '}') depth -= 1;
        i += 1;
      }
      i += 1;
      keep(start, i);
      last = '`';
      word = '';
      continue;
    }
    if (c === '/') {
      const operand = last === '' || '(,=:[!&|?{};+-*%<>~^'.includes(last) || BEFORE_OPERAND.has(word);
      if (operand) {
        // A regular expression: up to its closing « / », outside a class, then its flags.
        const start = i;
        i += 1;
        let inClass = false;
        while (i < source.length && at(i) !== '\n') {
          const r = at(i);
          if (r === '\\') {
            i += 2;
            continue;
          }
          if (r === '[') inClass = true;
          else if (r === ']') inClass = false;
          else if (r === '/' && !inClass) break;
          i += 1;
        }
        i += 1;
        while (/[a-z]/i.test(at(i))) i += 1;
        keep(start, i);
        last = '/';
        word = '';
        continue;
      }
    }
    out += c;
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    if (/[\w$]/.test(c)) {
      word = /[\w$]/.test(last) ? word + c : c;
    } else {
      word = '';
    }
    last = c;
    i += 1;
  }
  return out;
}
