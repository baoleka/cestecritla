/**
 * The control of a written answer (D16.5) — one pure function, the same in the Worker and in
 * the bench, so that what the bench measured is what production runs.
 *
 * What it is for. In September the model chose well and wrote badly: one invented measure in
 * sixty answers, three false negations in a hundred and thirty (08-ia.md). So nothing the model
 * writes is trusted. Each sentence must point at measures it was given, say no number they do
 * not hold, deny nothing, copy nothing, judge nothing — or the whole answer is dropped and the
 * page shows three measures and no sentence. Refusing is never an error: it is the "selection
 * only" mode, and the reader loses a paraphrase, not the place where it is written.
 *
 * What it cannot see, said plainly: a sentence that is plausible, anchored, affirmative — and
 * wrong. Only reading the answers against the measures finds those; that is the bench's job
 * (three judges and a hunter), and the editor's forty answers.
 *
 * Every refusal names its rule and quotes only the model's own words or an identifier: never a
 * word of the candidates. The Worker logs none of it; the bench counts it.
 */
import {
  COPY_WINDOW,
  MAX_IDS_PER_SENTENCE,
  MAX_SELECTED,
  MAX_SENTENCES,
  MAX_WORDS_PER_SENTENCE,
  parseModelAnswer,
  parseModelSelection,
  type AskSentence,
  type Candidate,
  type ModelSentence,
} from './ask-contract.js';
import { sameWord, terms, tokenize } from './search-core.js';

export type RuleId =
  /** Not the JSON it was asked for. */
  | 'shape'
  /** More than three sentences. */
  | 'count'
  /** Several sentences passed off as one, or a line break. */
  | 'several'
  /** More than thirty-five words. */
  | 'length'
  /** No measure, too many, one that was not offered, or one that is not an identifier. */
  | 'anchor'
  /** A number, in digits or in letters, that no cited measure holds as written. */
  | 'number'
  /** Denies or bounds what the programme holds. */
  | 'negation'
  /** Opens on a verdict, or passes one: oui, non, en réalité… */
  | 'verdict'
  /** Six words in a row of a measure it was given — or most of a sentence in runs of four. */
  | 'copy'
  /** Quotation marks: a sentence of ours quotes nothing. */
  | 'quote'
  /** An opinion, an exhortation, a hedge. */
  | 'opinion'
  /** First or second person: the programme is the subject, not us and not the reader. */
  | 'person'
  /** Voting advice, or the word outside a measure about voting. */
  | 'vote'
  /** Another party or a politician no cited measure names. */
  | 'party'
  /** Speaks of itself, of its instructions, of being an AI. */
  | 'self'
  /** An address: a link is ours to make, from an identifier. */
  | 'address'
  /** Markup, code, characters that are not seen, letters that are not those of French. */
  | 'markup'
  /** Shares too few of its words with the measures it cites. */
  | 'overlap';

export interface Refusal {
  rule: RuleId;
  /** Index of the sentence, or null when the whole answer is at fault. */
  sentence: number | null;
  /** The model's own words or an identifier — never the text of a measure. */
  detail: string;
}

/**
 * What the page will show. `select` carries the reason the writing was refused, for the bench;
 * the Worker sends the identifiers and drops the reason. No reason when selecting was the task.
 */
export type Verdict =
  | { kind: 'answer'; sentences: AskSentence[] }
  | { kind: 'select'; ids: string[]; refusal?: Refusal }
  | { kind: 'none' };

export interface ValidateOptions {
  /** Share of a sentence's own words that its cited measures must hold too, from 0 to 1. */
  minOverlap: number;
  /** Share of a sentence allowed in runs of four words of what was shown; provisional default. */
  maxCopiedShare?: number;
  /**
   * Only the rules that need no text of a measure: the shape, the identifiers, and what a
   * sentence must never say. This is how the recorded outputs of the bench are replayed where
   * the text of the 2026 edition is not — in CI. The rules about numbers, copying, names and
   * shared words are then skipped, not passed: the full control runs where the text is.
   */
  withoutText?: boolean;
}

/**
 * HYPOTHÈSE until the bench replay fixes it (PLAN-JEU §2.3: "seuil fixé en rejouant le banc,
 * jamais à l'écriture"). data/2026/ask.json carries the value the bench retained; this default
 * only exists so that the function can be called before a bench has run.
 */
export const PROVISIONAL_MIN_OVERLAP = 0.5;

/**
 * Six words in a row is the rule (D16.5). It is walked round by changing one word in five: the
 * text is then on the page, and no run is six long. So a sentence is also refused when more than
 * this share of its words stands in runs of COPY_SHARE_WINDOW words of what the model was shown.
 *
 * PROBABLE, measured once on the answers of September (eval/generation-raw.jsonl, 2025 archive,
 * 0 neuron): of the 101 written sentences with no six words in a row, none had more than 0.38 of
 * its words in such runs (p95 0.25). Runs of three were tried and dropped: a short sentence that
 * names the thing and its figure — both must be said as written — reaches 0.75 honestly. The
 * bench draws the same distribution for the 2026 edition before this value is retained.
 *
 * What it does not see: one word changed in every four. Reading does — the judges, the editor.
 */
export const COPY_SHARE_WINDOW = 4;
export const PROVISIONAL_MAX_COPIED_SHARE = 0.5;

// ---------------------------------------------------------------------------------------------
// Reading text
// ---------------------------------------------------------------------------------------------

const cp = (...codes: number[]): string => codes.map((c) => String.fromCodePoint(c)).join('');
/** No-break, narrow no-break and thin spaces, written as code points so that they show here. */
const ODD_SPACES = new RegExp(`[${cp(0xa0, 0x202f, 0x2009)}]`, 'g');
const APOSTROPHES = /[’‘`´]/g;

/** One spelling of spaces and apostrophes; nothing else is touched. */
function plain(text: string): string {
  return text
    .normalize('NFC')
    .replace(APOSTROPHES, "'")
    .replace(ODD_SPACES, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Words as a reader counts them: whatever stands between two spaces and holds a letter or digit. */
function wordsOf(text: string): string[] {
  return plain(text)
    .split(' ')
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
}

/**
 * Words folded for the copy check — the definition of scripts/leak-scan.ts (`leakTokens`), so
 * that "six words in a row" means here what "nine words in a row" means for the repository:
 * accents, case, apostrophes, hyphens and punctuation do not make two words different.
 * scripts/ask-validate.test.ts holds the two to the same output.
 */
export function copyTokens(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/\p{M}+/gu, '')
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[="<>[\]{}|\\/#~`]+/g, ' ')
    .replace(/[^\p{L}\p{N}\s]+/gu, '')
    .split(/\s+/u)
    .filter((token) => token !== '');
}

function windows(tokens: readonly string[], size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + size <= tokens.length; i += 1) out.push(tokens.slice(i, i + size).join(' '));
  return out;
}

/** Share of these words that stand in a run of COPY_SHARE_WINDOW words found in `runs`. */
function shareIn(tokens: readonly string[], runs: ReadonlySet<string>): number {
  if (tokens.length === 0) return 0;
  const covered = new Set<number>();
  for (let i = 0; i + COPY_SHARE_WINDOW <= tokens.length; i += 1) {
    if (!runs.has(tokens.slice(i, i + COPY_SHARE_WINDOW).join(' '))) continue;
    for (let k = i; k < i + COPY_SHARE_WINDOW; k += 1) covered.add(k);
  }
  return covered.size / tokens.length;
}

/**
 * Share of a sentence that stands in runs of four words of these texts, from 0 to 1. Exported
 * for the bench, which draws the distribution before the provisional threshold is retained.
 */
export function copiedShare(sentence: string, texts: readonly string[]): number {
  const runs = new Set(texts.flatMap((text) => windows(copyTokens(text), COPY_SHARE_WINDOW)));
  return shareIn(copyTokens(plain(sentence)), runs);
}

/** Numbers as written, digit groups joined and the decimal comma read as a point: "1 600" → "1600". */
function numbersOf(text: string): string[] {
  const found = plain(text).match(/\d+(?:[ .]\d{3})*(?:[,.]\d+)?/g) ?? [];
  return found.map((n) => n.replace(/[ .](?=\d{3}(?!\d))/g, '').replace(',', '.'));
}

/** Figures `\d` does not read: superscripts, fractions, full-width, other scripts, Roman signs. */
const ODD_FIGURE = /(?![0-9])\p{N}/u;
/** « m² », « km² », « m³ »: a unit, not a quantity — the one place such a figure is left alone. */
const UNIT_EXPONENT = new RegExp(`(?<=m)[${cp(0xb2, 0xb3)}]`, 'g');

const listed = (words: string): string[] => words.split(/\s+/).filter((word) => word !== '');
/** Ranks and shares, « sixième », « deux cinquièmes »: with their plural. */
const ORDINALS = listed(
  `deuxieme second seconde troisieme quatrieme cinquieme sixieme septieme huitieme neuvieme
   dixieme onzieme douzieme vingtieme centieme millieme`,
);
/** « Une vingtaine » — a closed list: « semaine » and « domaine » end the same way. */
const ROUND_LOTS = listed(
  `huitaine dizaine douzaine quinzaine vingtaine trentaine quarantaine cinquantaine soixantaine
   centaine millier`,
);

/** Quantities written in letters. "un" and "une" are articles: they are left alone. */
const NUMBER_WORDS: ReadonlySet<string> = new Set([
  ...listed(
    `zero deux trois quatre cinq six sept huit neuf dix onze douze treize quatorze quinze seize
     vingt vingts trente quarante cinquante soixante septante huitante octante nonante cent cents
     mille million millions milliard milliards moitie tiers quart quarts demi demie`,
  ),
  ...[...ORDINALS, ...ROUND_LOTS].flatMap((word) => [word, `${word}s`]),
]);

/**
 * « Doubler », « triplé », « quadruplement »: a multiplier is a number whatever its ending. The
 * sentence may use one only if a measure it cites uses the same one. (« Doublon » is not one.)
 */
const MULTIPLIER = /^(doubl|tripl|quadrupl|quintupl|sextupl|decupl|centupl)(?!on|ure)/;
const multiplierOf = (word: string): string | null => MULTIPLIER.exec(word)?.[1] ?? null;

/** A text as a pattern that matches exactly it. */
const literal = (text: string): string =>
  text.replace(/[.*+?^${}()|[\]\\]/g, (character) => `\\${character}`);

/** A word or an expression standing on its own: `\b` is useless next to an accented letter. */
const alone = (source: string, flags = 'iu'): RegExp =>
  new RegExp(`(?<![\\p{L}\\p{N}])(?:${source})(?![\\p{L}\\p{N}])`, flags);

// ---------------------------------------------------------------------------------------------
// The rules that read one sentence on its own
// ---------------------------------------------------------------------------------------------

/** Denying or bounding: « ne … pas », « aucune mesure », « seulement », « nulle part ». */
const NEGATION: readonly RegExp[] = [
  alone('ne'),
  /(?<![\p{L}\p{N}])n'/iu,
  alone('pas'),
  alone('jamais'),
  alone('rien'),
  alone('guère'),
  alone('aucune?s?'),
  alone('nul(?:le)?s?'),
  alone('nullement'),
  alone('aucunement'),
  alone('ni'),
  alone('seulement'),
  alone('uniquement'),
  alone('exclusivement'),
  alone('se (?:limite|borne|contente)'),
  // An exception bounds as surely as « seulement » does.
  alone('sauf'),
  alone('hormis'),
  alone('excepté(?:e|s|es)?'),
  alone("à l'exception"),
  // An absence said without a negation: the page never says what the book does not hold.
  alone('muet(?:te)?s?'),
  alone('sous silence'),
  alone("l'impasse"),
  alone('omet(?:tent|tre)?|omis(?:e|es)?'),
];
/**
 * Words that bound or say an absence — and that a measure may hold for its own reasons (« le
 * manque de médecins », « les seuls revenus du capital »). Allowed when a cited measure uses
 * the very word.
 */
const NEGATION_UNLESS_CITED: readonly RegExp[] = [
  alone('seule?s?'),
  alone('absente?s?'),
  alone('absence'),
  alone('manque(?:nt)?'),
];

/** A verdict on the question: the reader concludes, the page does not. */
const VERDICT_OPENING =
  /^(?:oui|non|effectivement|en effet|exactement|absolument|tout à fait|bien sûr|certes|vrai|faux|justement|pas du tout|au contraire|c'est (?:vrai|faux|exact|inexact|juste|le cas))(?![\p{L}\p{N}])/iu;
const VERDICT_ANYWHERE: readonly RegExp[] = [
  alone("c'est (?:vrai|faux|exact|inexact)"),
  alone('est (?:vraie?|fausse|faux|exacte?|inexacte?)'),
  alone('en réalité'),
  alone('contrairement'),
  alone('à tort'),
  alone('à raison'),
];

const OPINION: readonly RegExp[] = [
  alone('à mon avis'),
  alone('selon moi'),
  alone('il faut'),
  alone('il faudrait'),
  alone('heureusement'),
  alone('malheureusement'),
  alone('hélas'),
  alone('tant mieux'),
  alone('dommage'),
  alone('(?:bonne|mauvaise|excellente) (?:idée|mesure|nouvelle)'),
  alone('évidemment'),
  alone('peut-être'),
  alone('probablement'),
  alone('sans doute'),
  alone('il semble'),
];

/** The programme is the subject. « Nous » would speak for the movement; « tu » advises. */
const PERSON: readonly RegExp[] = [
  alone('je|me|moi|mon|ma|mes|nous|notre|nos|on'),
  alone('tu|te|toi|ton|ta|tes|vous|votre|vos'),
  /(?<![\p{L}\p{N}])[jmt]'/iu,
];

const VOTE_ADVICE: readonly RegExp[] = [
  alone('votez|votons'),
  alone('vot(?:e|er|es|ent) (?:pour|contre)'),
  alone('(?:faut|allez|aller|doit|devez) voter'),
  alone('bulletin de vote'),
];
/** Any form of the word: allowed only in a sentence about a measure that uses it. */
const VOTE_WORD = alone('vot(?:e|es|er|ez|ons|ent|ant|ée?s?)');

/**
 * Other parties and politicians. A cited measure may name one (a law is often known by a
 * name): then the sentence may too. Acronyms are matched as written, in capitals.
 */
const PARTY_NAMES: readonly RegExp[] = [
  alone(
    'rassemblement national|front national|les républicains|renaissance|horizons|modem|' +
      'parti socialiste|parti communiste|europe écologie|les écologistes|reconquête|' +
      'lutte ouvrière|place publique|debout la france|nouveau front populaire',
  ),
  alone(
    'macron|le pen|bardella|zemmour|attal|retailleau|darmanin|faure|glucksmann|roussel|' +
      'tondelier|hollande|sarkozy|ciotti|wauquiez|bayrou|lecornu|mélenchon|philippe|borne',
  ),
  alone('RN|FN|LR|PS|PCF|EELV|NPA|UDI|NFP|LO', 'u'),
];

const SELF_ALWAYS: readonly RegExp[] = [
  /(?<![\p{L}\p{N}])en tant qu'/iu,
  alone('modèle de langage'),
  alone('chatbot'),
  alone('prompt'),
  alone('(?:mes|les|ces) (?:instructions|consignes)'),
  alone('cette réponse'),
];
/**
 * Words the model uses of itself or of what it was handed — « les candidats », « l'assistant »,
 * « une IA » — which are also words of the book. Allowed when a cited measure uses them.
 */
const SELF_UNLESS_CITED: readonly RegExp[] = [
  alone('intelligence artificielle'),
  alone('IA', 'u'),
  alone('assistante?s?'),
  alone('candidate?s?'),
];

const ADDRESS: readonly RegExp[] = [
  /https?:/i,
  /www\./i,
  /[a-z0-9-]+\.(?:fr|com|org|net|eu|io|gouv)(?![\p{L}\p{N}])/iu,
  /@/,
];

/** Guillemets and double quotes of every kind, as code points: « » " “ ” „ ‹ ›. */
const QUOTES = new RegExp(`[${cp(0xab, 0xbb, 0x22, 0x201c, 0x201d, 0x201e, 0x2039, 0x203a)}]`);
const MARKUP = /[<>{}[\]\\`*_#|~^]/;
const CONTROL = /\p{Cc}/u;
/**
 * What is written and not seen — joiners, soft hyphens, marks that turn a line round — and what
 * is seen and not read: an accent left without its letter once the text is composed, a letter
 * of another alphabet, a letter in another form (full-width, ligature, raised). Each makes of
 * « pas » or of « 300 » a word that no rule here recognises and that a reader reads all the same.
 */
const FORMAT = /\p{Cf}/u;
const LOOSE_MARK = /\p{M}/u;
const FOREIGN_LETTER = /(?!\p{Script=Latin})\p{L}/u;
function otherForm(text: string): boolean {
  for (const character of text) {
    if (/\p{L}/u.test(character) && character.normalize('NFKC') !== character) return true;
  }
  return false;
}

/** What a sentence is made of once the scaffolding every answer shares is set aside. */
const FRAME: ReadonlySet<string> = new Set(
  terms(
    'avenir commun mesure mesures texte livre section chapitre partie entend vise souhaite annonce',
  ),
);

function contentTerms(text: string): string[] {
  return [...new Set(terms(text))].filter((term) => !FRAME.has(term));
}

/**
 * Share of the sentence's own words that its measures hold too — 0 when it has none of its own.
 * Exported for the bench, which draws the distribution before a threshold is retained.
 */
export function overlap(sentence: string, texts: readonly string[]): number {
  const own = contentTerms(sentence);
  if (own.length === 0) return 0;
  const held = new Set(texts.flatMap((text) => terms(text)));
  const shared = own.filter((term) => [...held].some((other) => sameWord(term, other)));
  return shared.length / own.length;
}

// ---------------------------------------------------------------------------------------------
// The control
// ---------------------------------------------------------------------------------------------

const firstMatch = (text: string, patterns: readonly RegExp[]): string | null => {
  for (const pattern of patterns) {
    const found = pattern.exec(text);
    if (found !== null) return found[0];
  }
  return null;
};

/** What the model was shown, as the runs of words a sentence must not hold. */
interface Shown {
  /** Runs of COPY_WINDOW words: one is enough. */
  six: ReadonlySet<string>;
  /** Runs of COPY_SHARE_WINDOW words: most of a sentence in them is a copy in pieces. */
  runs: ReadonlySet<string>;
}

function shownOf(candidates: readonly Candidate[]): Shown {
  const tokens = candidates.map((candidate) => copyTokens(candidate.text));
  return {
    six: new Set(tokens.flatMap((t) => windows(t, COPY_WINDOW))),
    runs: new Set(tokens.flatMap((t) => windows(t, COPY_SHARE_WINDOW))),
  };
}

/** Every rule one sentence breaks, in the order of the plan. */
function sentenceRefusals(
  sentence: ModelSentence,
  index: number,
  candidates: ReadonlyMap<string, string>,
  shown: Shown,
  options: ValidateOptions,
): Refusal[] {
  const out: Refusal[] = [];
  const refuse = (rule: RuleId, detail: string): void => {
    out.push({ rule, sentence: index, detail });
  };
  const text = plain(sentence.texte);

  // --- its measures
  const ids = [...new Set(sentence.ids)];
  if (ids.length === 0) refuse('anchor', 'no measure');
  if (ids.length > MAX_IDS_PER_SENTENCE) refuse('anchor', `${String(ids.length)} measures`);
  const unknown = ids.filter((id) => !candidates.has(id));
  // An identifier that was not offered is quoted only if it looks like one: it could be anything.
  for (const id of unknown) refuse('anchor', /^[a-z0-9.-]{1,24}$/.test(id) ? id : 'not an id');
  const cited = ids.flatMap((id) => {
    const held = candidates.get(id);
    return held === undefined ? [] : [held];
  });

  // --- its shape
  if (text === '') refuse('shape', 'empty sentence');
  if (CONTROL.test(sentence.texte)) refuse('markup', 'control character');
  if (FORMAT.test(sentence.texte)) refuse('markup', 'character that is not seen');
  if (LOOSE_MARK.test(text)) refuse('markup', 'accent without its letter');
  if (FOREIGN_LETTER.test(text)) refuse('markup', 'letter of another alphabet');
  else if (otherForm(text)) refuse('markup', 'letter in another form');
  const markup = MARKUP.exec(text);
  if (markup !== null) refuse('markup', markup[0]);
  if (/[.!?…]["»”]?\s+\p{Lu}/u.test(text)) refuse('several', 'more than one sentence');
  const length = wordsOf(text).length;
  if (length > MAX_WORDS_PER_SENTENCE) refuse('length', `${String(length)} words`);

  // --- what it must not say
  const quote = QUOTES.exec(text);
  if (quote !== null) refuse('quote', quote[0]);
  const opening = VERDICT_OPENING.exec(text.replace(/^[^\p{L}\p{N}]+/u, ''));
  if (opening !== null) refuse('verdict', opening[0]);
  const verdict = firstMatch(text, VERDICT_ANYWHERE);
  if (verdict !== null) refuse('verdict', verdict);
  const negation = firstMatch(text, NEGATION);
  if (negation !== null) refuse('negation', negation);
  const opinion = firstMatch(text, OPINION);
  if (opinion !== null) refuse('opinion', opinion);
  const person = firstMatch(text, PERSON);
  if (person !== null) refuse('person', person);
  const address = firstMatch(text, ADDRESS);
  if (address !== null) refuse('address', address);
  const self = firstMatch(text, SELF_ALWAYS);
  if (self !== null) refuse('self', self);
  if (ODD_FIGURE.test(text.replace(UNIT_EXPONENT, ''))) {
    refuse('number', 'figure not in plain digits');
  }

  // --- what it may say only with a measure that says it
  const citedPlain = cited.map(plain);
  /** The very word found, not another one of the same list: « Macron » is not « Le Pen ». */
  const unlessCited = (rule: RuleId, patterns: readonly RegExp[]): void => {
    for (const pattern of patterns) {
      const found = pattern.exec(text);
      if (found === null) continue;
      const same = alone(literal(found[0]), pattern.flags);
      if (!citedPlain.some((held) => same.test(held))) refuse(rule, found[0]);
    }
  };
  const advice = firstMatch(text, VOTE_ADVICE);
  if (advice !== null) refuse('vote', advice);
  // Everything below reads the text of the measures: skipped where there is none to read.
  if (options.withoutText === true) return out;
  if (advice === null && VOTE_WORD.test(text) && !citedPlain.some((held) => VOTE_WORD.test(held))) {
    refuse('vote', VOTE_WORD.exec(text)?.[0] ?? 'vote');
  }
  unlessCited('party', PARTY_NAMES);
  unlessCited('self', SELF_UNLESS_CITED);
  if (negation === null) unlessCited('negation', NEGATION_UNLESS_CITED);

  // --- its numbers: as written in a measure it cites, or not at all
  const heldNumbers = new Set(cited.flatMap(numbersOf));
  for (const number of numbersOf(text)) {
    if (!heldNumbers.has(number)) refuse('number', number);
  }
  const heldWords = new Set(cited.flatMap((held) => tokenize(held)));
  const heldMultipliers = new Set([...heldWords].flatMap((word) => multiplierOf(word) ?? []));
  for (const word of tokenize(text)) {
    if (NUMBER_WORDS.has(word) && !heldWords.has(word)) refuse('number', word);
    const multiplier = multiplierOf(word);
    if (multiplier !== null && !heldMultipliers.has(multiplier)) refuse('number', word);
  }

  // --- copied: six words in a row of anything it was shown, or most of it in shorter runs
  const own = copyTokens(text);
  if (windows(own, COPY_WINDOW).some((w) => shown.six.has(w))) {
    refuse('copy', `${String(COPY_WINDOW)} words in a row`);
  } else {
    const share = shareIn(own, shown.runs);
    if (share > (options.maxCopiedShare ?? PROVISIONAL_MAX_COPIED_SHARE)) {
      refuse('copy', `${share.toFixed(2)} in runs of ${String(COPY_SHARE_WINDOW)}`);
    }
  }

  // --- anchored in words, not only in an identifier
  if (cited.length > 0) {
    const share = overlap(text, cited);
    if (share < options.minOverlap) refuse('overlap', share.toFixed(2));
  }
  return out;
}

/**
 * Every rule the model's output breaks. Empty when the answer may be shown as written — or
 * when it wrote no sentence at all: none of the measures holds the words it was given.
 */
export function refusals(
  raw: unknown,
  candidates: readonly Candidate[],
  options: ValidateOptions = { minOverlap: PROVISIONAL_MIN_OVERLAP },
): Refusal[] {
  const answer = parseModelAnswer(raw);
  if (answer === null) return [{ rule: 'shape', sentence: null, detail: 'not the expected JSON' }];
  const out: Refusal[] = [];
  if (answer.phrases.length > MAX_SENTENCES) {
    out.push({
      rule: 'count',
      sentence: null,
      detail: `${String(answer.phrases.length)} sentences`,
    });
  }
  const byId = new Map(candidates.map((c) => [c.id, c.text]));
  const shown = shownOf(candidates);
  answer.phrases.forEach((sentence, index) => {
    out.push(...sentenceRefusals(sentence, index, byId, shown, options));
  });
  // Six words in a row are six words in a row on the page, whichever sentences they stand in.
  if (options.withoutText !== true && !out.some((refusal) => refusal.rule === 'copy')) {
    const whole = answer.phrases.flatMap((sentence) => copyTokens(plain(sentence.texte)));
    if (windows(whole, COPY_WINDOW).some((w) => shown.six.has(w))) {
      const detail = `${String(COPY_WINDOW)} words in a row across sentences`;
      out.push({ rule: 'copy', sentence: null, detail });
    }
  }
  return out;
}

/** Every piece of text an output holds, whatever its shape; a JSON written as text is read. */
function textsIn(value: unknown, depth = 0): string[] {
  if (depth > 8) return [];
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (/^[[{]/.test(trimmed)) {
      try {
        return textsIn(JSON.parse(trimmed) as unknown, depth + 1);
      } catch {
        // Not JSON after all: read as the text it is.
      }
    }
    // Escapes left as written would hide an accented word from the comparison.
    return [
      value.replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) =>
        String.fromCodePoint(Number.parseInt(hex, 16)),
      ),
    ];
  }
  if (Array.isArray(value)) return value.flatMap((item) => textsIn(item, depth + 1));
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap((item) => textsIn(item, depth + 1));
  }
  return [];
}

/**
 * True when an output — read as text, whatever shape the model gave it — holds six words in a
 * row of a measure it was shown. For `/api/bench`: what the Worker returns of an output holds no
 * more of the book than a page would (src/worker/ask.ts, `benchOutput`).
 */
export function carriesCopy(raw: unknown, candidates: readonly Candidate[]): boolean {
  const { six } = shownOf(candidates);
  const tokens = textsIn(raw).flatMap((text) => copyTokens(text));
  return windows(tokens, COPY_WINDOW).some((w) => six.has(w));
}

/**
 * The control of a selection (mode "select"): the measures the model chose, among those it was
 * given, three at most. There is no sentence to refuse — only identifiers to check.
 */
export function validateSelection(raw: unknown, candidates: readonly Candidate[]): Verdict {
  const chosen = parseModelSelection(raw);
  const offered = new Set(candidates.map((c) => c.id));
  const fallback = candidates.slice(0, MAX_SELECTED).map((c) => c.id);
  if (chosen === null) {
    const refusal: Refusal = { rule: 'shape', sentence: null, detail: 'not the expected JSON' };
    return fallback.length === 0 ? { kind: 'none' } : { kind: 'select', ids: fallback, refusal };
  }
  const ids = [...new Set(chosen.ids)].filter((id) => offered.has(id)).slice(0, MAX_SELECTED);
  if (ids.length === 0) return { kind: 'none' };
  const invented = chosen.ids.filter((id) => !offered.has(id)).length;
  if (invented === 0) return { kind: 'select', ids };
  // Identifiers it was not given are dropped, and counted: the bench wants to know.
  const detail = `${String(invented)} id(s) not offered`;
  return { kind: 'select', ids, refusal: { rule: 'anchor', sentence: null, detail } };
}

/** The measures to show when the writing is refused: the model's own choice, then the search's. */
function selection(raw: unknown, candidates: readonly Candidate[]): string[] {
  const offered = new Set(candidates.map((c) => c.id));
  const chosen: string[] = [];
  for (const sentence of parseModelAnswer(raw)?.phrases ?? []) {
    for (const id of sentence.ids) {
      if (offered.has(id) && !chosen.includes(id)) chosen.push(id);
    }
  }
  for (const candidate of candidates) {
    if (chosen.length >= MAX_SELECTED) break;
    if (!chosen.includes(candidate.id)) chosen.push(candidate.id);
  }
  return chosen.slice(0, MAX_SELECTED);
}

/**
 * The control. `candidates` are the measures the model was given, in the order of the search:
 * that order is what a selection falls back on.
 */
export function validateAnswer(
  raw: unknown,
  candidates: readonly Candidate[],
  options: ValidateOptions = { minOverlap: PROVISIONAL_MIN_OVERLAP },
): Verdict {
  const found = refusals(raw, candidates, options);
  const answer = parseModelAnswer(raw);
  const first = found[0];
  if (first !== undefined || answer === null) {
    const ids = selection(raw, candidates);
    const refusal = first ?? { rule: 'shape', sentence: null, detail: 'not the expected JSON' };
    return ids.length === 0 ? { kind: 'none' } : { kind: 'select', ids, refusal };
  }
  if (answer.phrases.length === 0) return { kind: 'none' };
  return {
    kind: 'answer',
    sentences: answer.phrases.map((sentence) => ({
      text: plain(sentence.texte),
      ids: [...new Set(sentence.ids)],
    })),
  };
}
