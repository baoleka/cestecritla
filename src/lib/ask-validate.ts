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
 *
 * Since D16.47 the file holds a second control, further down: that of an EXPLANATION — what the
 * model of the chat says of words, when it was shown no text of the book at all. The two share
 * one definition of what a sentence of ours never says (a negation, a verdict, an opinion, a
 * vote…) and of what it may say only as a text it rests on says it (a number, a name); each then
 * has rules of its own. An answer is checked against the measures it cites; an explanation,
 * against the read sentences on the page and the question — and it may attribute nothing to
 * anyone.
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
import {
  MAX_EXPLAIN_CHARS,
  MAX_EXPLAIN_SENTENCES,
  MAX_EXPLAIN_WORDS,
  MIN_EXPLAIN_WORDS,
  parseModelExplanation,
} from './chat-contract.js';
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
  | 'overlap'
  // --- the rules of an explanation only (D16.47)
  /** Names the programme, the movement, or an aim nobody owns: an explanation attributes nothing. */
  | 'attribution'
  /** Opens on a word that points outside the sentence: « Il », « Cette », « Ainsi ». */
  | 'opener'
  /** The future, the conditional: an explanation says what a word means, not what will happen. */
  | 'tense'
  /** A contrast or a concession: « mais », « même si » — where a nuance of the model's comes in. */
  | 'contrast'
  /** A proper noun or an acronym nobody showed it — or a first word that is neither ours nor an article. */
  | 'name'
  /** Shares no word with the sentences on the page: it explains something else. */
  | 'topic';

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
/**
 * Apostrophes, and what looks like one: « ＇ » (full-width), « ′ » (prime), « ՚ », « ꞌ », « ʼ »
 * — left as they were, « n＇entretient » was a word no rule read (review of 24/11/2026).
 */
const APOSTROPHES = /[’`´\uFF07\u2032\u055A\uA78C\u02BC\u02B9]/g;

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
   dixieme onzieme douzieme treizieme quatorzieme quinzieme seizieme vingtieme trentieme
   quarantieme cinquantieme soixantieme centieme millieme millionieme milliardieme`,
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
     mille million millions milliard milliards billion billions trillion trillions moitie tiers
     quart quarts demi demie`,
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

/**
 * The letters French is written with, and the digits — spelled out, not `\p{L}\p{N}`. A pattern
 * built on the Unicode properties costs the engine about half a millisecond the first time it
 * runs, and the control has more than a hundred: in a Worker that has just woken, the first
 * explanation spent some fifty milliseconds of a limit of ten compiling them (measured in a
 * local workerd by the security review of 14/11/2026, and again after this change:
 * docs/discovery/09-architecture.md §8.3). The class is Latin as far as U+017F: « é », « œ »,
 * « ÿ », and the letters of a neighbour's name. What it leaves out — another alphabet, a letter
 * in another form — is refused before any of these rules reads a sentence (`FOREIGN_LETTER`,
 * `otherForm`); and seeing an edge where there is none only ever makes a rule refuse more.
 */
const LETTERS = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u017F';
const WORD = `0-9${LETTERS}`;
/** Not after a letter or a digit; not before one. */
const EDGE_BEFORE = `(?<![${WORD}])`;
const EDGE_AFTER = `(?![${WORD}])`;

/** A word or an expression standing on its own: `\b` is useless next to an accented letter. */
const alone = (source: string, flags = 'iu'): RegExp =>
  new RegExp(`${EDGE_BEFORE}(?:${source})${EDGE_AFTER}`, flags);

// ---------------------------------------------------------------------------------------------
// The rules that read one sentence on its own
// ---------------------------------------------------------------------------------------------

/** Denying or bounding: « ne … pas », « aucune mesure », « seulement », « nulle part ». */
const NEGATION: readonly RegExp[] = [
  alone('ne'),
  new RegExp(`${EDGE_BEFORE}n'`, 'iu'),
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
const VERDICT_OPENING = new RegExp(
  `^(?:oui|non|effectivement|en effet|exactement|absolument|tout à fait|bien sûr|certes|vrai|faux|justement|pas du tout|au contraire|c'est (?:vrai|faux|exact|inexact|juste|le cas))${EDGE_AFTER}`,
  'iu',
);
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
  new RegExp(`${EDGE_BEFORE}[jmt]'`, 'iu'),
];

const VOTE_ADVICE: readonly RegExp[] = [
  alone('votez|votons'),
  // whatever the tense: « votera pour », « voteraient contre » (review of 24/11/2026)
  alone('vot(?:e|er|es|ent|era|eras|erons|erez|eront|erait|eraient|ait|aient) (?:pour|contre)'),
  alone('(?:faut|allez|aller|doit|devez) voter'),
  alone('bulletin de vote'),
];
/** Any form of the word: allowed only in a sentence about a measure that uses it. */
const VOTE_WORD = alone('vot(?:e|es|er|ez|ons|ent|ant|ée?s?|ai[st]?|aient|erai[st]?|era|erons|erez|eront|erions|eriez|eraient|ions|iez|âmes|âtes|èrent|ants?|antes?|ation|ations)');

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
  new RegExp(`${EDGE_BEFORE}en tant qu'`, 'iu'),
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
  // Any ending of two letters or more — « programme.info », « europa.int », « exemple.be »:
  // refusing a word glued to a full stop is the safe side here (review of 24/11/2026).
  new RegExp(`[a-z0-9-]+\\.[a-z]{2,}${EDGE_AFTER}`, 'iu'),
  /@/,
];

/**
 * Guillemets and quotes of every kind, as code points: « » " “ ” „ ‟ ‹ › ＂ 〝 〞 ″ ‶, the
 * single opening quote ‘ — and a straight one that opens a word after a space: « une ‘borne de
 * recharge’ » quoted the book unseen (review of 24/11/2026).
 */
const QUOTES = new RegExp(
  `[${cp(0xab, 0xbb, 0x22, 0x201c, 0x201d, 0x201e, 0x201f, 0x2039, 0x203a, 0xff02, 0x301d, 0x301e, 0x2033, 0x2036, 0x2018)}]|(?:^| )'`,
);
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
/**
 * A Latin letter French does not write, and NFKC leaves as it is — « ạ », « ẹ », « ɑ », a small
 * capital « ᴘ »: « nẹ … pạs » was a negation no rule read (review of 24/11/2026). What `LETTERS`
 * leaves out is refused, as its comment says.
 */
const OUTSIDE_LETTERS = new RegExp(`(?![${WORD}])\\p{L}`, 'u');
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

/** How long a sentence may be, in words as a reader counts them. */
interface Length {
  min: number;
  max: number;
}

/** What a sentence breaks by itself, and what the rules that read a text need to know of it. */
interface Own {
  /** The sentence in one spelling of spaces and apostrophes. */
  text: string;
  out: Refusal[];
  /** True when it denies or bounds in so many words: the softer words are then not looked at. */
  negation: boolean;
  /** True when it gives voting advice: the word alone is then not looked at. */
  advice: boolean;
}

/**
 * The rules that read one sentence on its own, whatever it was shown: its shape, and what it
 * must never say. The same for a written answer and for an explanation — one definition of
 * what a negation, a verdict or an opinion is.
 */
function ownRefusals(raw: string, index: number, length: Length): Own {
  const out: Refusal[] = [];
  const refuse = (rule: RuleId, detail: string): void => {
    out.push({ rule, sentence: index, detail });
  };
  const text = plain(raw);

  // --- its shape
  if (text === '') refuse('shape', 'empty sentence');
  if (CONTROL.test(raw)) refuse('markup', 'control character');
  if (FORMAT.test(raw)) refuse('markup', 'character that is not seen');
  if (LOOSE_MARK.test(text)) refuse('markup', 'accent without its letter');
  if (FOREIGN_LETTER.test(text)) refuse('markup', 'letter of another alphabet');
  else if (otherForm(text)) refuse('markup', 'letter in another form');
  else if (OUTSIDE_LETTERS.test(text)) refuse('markup', 'letter French does not write');
  const markup = MARKUP.exec(text);
  if (markup !== null) refuse('markup', markup[0]);
  // A capital after the end of a sentence, with or without a space: « …par commune.Elle
  // ouvre… » is two sentences (review of 24/11/2026).
  if (/[.!?…]["»”]?\s*\p{Lu}/u.test(text)) refuse('several', 'more than one sentence');
  const words = wordsOf(text).length;
  if (words > length.max || (text !== '' && words < length.min)) {
    refuse('length', `${String(words)} words`);
  }

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
  const advice = firstMatch(text, VOTE_ADVICE);
  if (advice !== null) refuse('vote', advice);
  return { text, out, negation: negation !== null, advice: advice !== null };
}

/**
 * What a sentence may say only if a text it rests on says it — the measures it cites, for a
 * written answer; the sentences on the page, for an explanation: a vote, a name, a word that
 * bounds, a number. `held` are those texts.
 */
function heldRefusals(own: Own, index: number, held: readonly string[]): Refusal[] {
  const out: Refusal[] = [];
  const refuse = (rule: RuleId, detail: string): void => {
    out.push({ rule, sentence: index, detail });
  };
  const { text } = own;
  const heldPlain = held.map(plain);
  /** The very word found, not another one of the same list: « Macron » is not « Le Pen ». */
  const unlessHeld = (rule: RuleId, patterns: readonly RegExp[]): void => {
    for (const pattern of patterns) {
      // Every word the pattern finds, not the first only: once a cited measure held « Macron »,
      // « Bardella » next to it went unread (review of 24/11/2026).
      const every = new RegExp(pattern.source, `${pattern.flags.replace('g', '')}g`);
      for (const found of text.matchAll(every)) {
        const same = alone(literal(found[0]), pattern.flags);
        if (!heldPlain.some((other) => same.test(other))) refuse(rule, found[0]);
      }
    }
  };
  if (!own.advice && VOTE_WORD.test(text) && !heldPlain.some((other) => VOTE_WORD.test(other))) {
    refuse('vote', VOTE_WORD.exec(text)?.[0] ?? 'vote');
  }
  unlessHeld('party', PARTY_NAMES);
  unlessHeld('self', SELF_UNLESS_CITED);
  if (!own.negation) unlessHeld('negation', NEGATION_UNLESS_CITED);

  // --- its numbers: as written in a text it rests on, or not at all
  const heldNumbers = new Set(held.flatMap(numbersOf));
  for (const number of numbersOf(text)) {
    if (!heldNumbers.has(number)) refuse('number', number);
  }
  const heldWords = new Set(held.flatMap((other) => tokenize(other)));
  const heldMultipliers = new Set([...heldWords].flatMap((word) => multiplierOf(word) ?? []));
  for (const word of tokenize(text)) {
    if (NUMBER_WORDS.has(word) && !heldWords.has(word)) refuse('number', word);
    const multiplier = multiplierOf(word);
    if (multiplier !== null && !heldMultipliers.has(multiplier)) refuse('number', word);
  }
  return out;
}

/** Every rule one sentence of a written answer breaks, in the order of the plan. */
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

  // --- its shape, and what it must not say
  const own = ownRefusals(sentence.texte, index, { min: 0, max: MAX_WORDS_PER_SENTENCE });
  out.push(...own.out);
  const { text } = own;
  // Everything below reads the text of the measures: skipped where there is none to read.
  if (options.withoutText === true) return out;

  // --- what it may say only with a measure that says it
  out.push(...heldRefusals(own, index, cited));

  // --- copied: six words in a row of anything it was shown, or most of it in shorter runs
  const tokens = copyTokens(text);
  if (windows(tokens, COPY_WINDOW).some((w) => shown.six.has(w))) {
    refuse('copy', `${String(COPY_WINDOW)} words in a row`);
  } else {
    const share = shareIn(tokens, shown.runs);
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

// ---------------------------------------------------------------------------------------------
// The control of an explanation (D16.47, PLAN-CHAT §3)
// ---------------------------------------------------------------------------------------------
//
// The third voice of the chat. The first two say what the programme provides: the book by its
// titles and its links, the read sentences in our words, each one read by the editor. The model
// of the moment says what WORDS mean — and nothing else. It never saw the book: it was handed
// the read sentences on the page, our cards, and the question.
//
// So an explanation is refused as soon as one of its sentences
//
//   - names the programme, the movement, its people, or an aim nobody owns        attribution
//   - opens on a word that points outside itself: « Il », « Cette », « Ainsi »     opener
//   - speaks in the future or the conditional, or dates what it says              tense
//   - turns on a contrast or a concession: « mais », « même si »                  contrast
//   - names someone or something nobody showed it                                 name, party
//   - holds a number the sentences on the page do not hold                        number
//   - weighs, prescribes, or reports who thinks what                              opinion
//   - repeats the question                                                        echo
//   - shares no word with the sentences on the page                               topic
//
// and breaks any rule a sentence of ours ever had to keep: a negation, a verdict, an opinion,
// a person, a vote, markup. One sentence refused, and the whole explanation is not shown: the
// sheet already holds the two blocks that matter.
//
// What it cannot see, said plainly — as for a written answer: a definition that is affirmative,
// in the present, on the subject, and wrong. And a sentence whose grammatical subject is a
// word of the page while what it says is what the measure does, or who pays for it: « La
// gratuité des cantines repose sur l'impôt. », « Les riches paient cette taxe. » No list of
// words tells a definition from a claim: the lists below close the commonest doors — a time, a
// camp, a weight, a promise — and reading closes the rest: the judges of the bench, then the
// editor's forty threads (PLAN-CHAT §5).

/**
 * The names of the book and of the movement. An explanation never holds one: whatever follows
 * would be said in their name.
 */
const ATTRIBUTION: readonly RegExp[] = [
  alone('avenir en commun'),
  alone('nouvelle france'),
  alone('france insoumise'),
  alone('insoumis(?:e|es)?'),
  alone('union populaire'),
  alone('LFI|AEC|M27', 'u'),
  // The two words every attribution is made of. The read sentences on the page open on
  // « Le programme prévoit… »: so the page is no licence for them — an explanation that could
  // say « programme » because the page does would say what the programme provides.
  alone('programmes?'),
  alone('mesures?'),
  // An aim without an owner is read as the programme's: « L'objectif est de… ». (With its
  // owner written — « le but du quotient familial est de… » — it is a definition.)
  new RegExp(
    `${EDGE_BEFORE}(?:objectif|but|idée|ambition|intention|volonté|projet|enjeu|principe) ` +
      `(?:est|reste|consiste|était) (?:(?:de|à|que)${EDGE_AFTER}|d'|qu')`,
    'iu',
  ),
];
/**
 * The other nouns the book is spoken of with: « le texte », « ce projet », « la proposition »,
 * « le mouvement ». They are also words of everyday policy — « proposition de loi », « projet
 * de loi », « partis politiques ». One is allowed only where a sentence on the page holds it
 * with the same word after it.
 */
const ATTRIBUTION_NOUN = alone(
  'propositions?|textes?|projets?|partis?|mouvements?|candidate?s?|militante?s?',
  'giu',
);

/**
 * Politicians and parties an explanation of words never needs, whatever the page shows. The
 * names that are also common words — « borne », « renaissance » — stay under the rule of every
 * sentence: allowed when a sentence on the page holds the very word.
 */
const PARTY_NEVER: readonly RegExp[] = [
  alone(
    'rassemblement national|front national|les républicains|parti socialiste|parti communiste|' +
      'europe écologie|lutte ouvrière|nouveau front populaire',
  ),
  alone(
    'macron|le pen|bardella|zemmour|attal|retailleau|darmanin|glucksmann|roussel|tondelier|' +
      'hollande|sarkozy|ciotti|wauquiez|bayrou|lecornu|mélenchon',
  ),
  alone('RN|FN|LR|PS|PCF|EELV|NPA|UDI|NFP|LO|JLM|MLP', 'u'),
];

/**
 * A sentence that opens on one of these leans on something outside it — the sentence before, the
 * measure above, the question. Each sentence of an explanation stands alone: its subject is
 * written in it.
 */
const OPENER = new RegExp(
  '^(?:(?:ils?|elles?|ce|cet|cette|ces|cela|ceci|ça|celui|celle|ceux|celles|son|sa|ses|' +
    'leurs?|lui|eux|ainsi|donc|alors|aussi|ensuite|puis|enfin|bref|et|mais|or|car|' +
    'de plus|en outre|par ailleurs|autrement dit|par conséquent|en conséquence|pour cela|' +
    `de ce fait|du coup|d'ailleurs|c'est pourquoi)${EDGE_AFTER}|c')`,
  'iu',
);

/**
 * The future and the conditional, as closely as a list of endings reads them: the auxiliaries
 * and the modals by name, « va » and « vont », then the endings of the regular verbs. Accents
 * are read as written — « opéra » and « caméra » are not verbs. A few imperfects end the same
 * way (« retirait », « ouvrait »): an explanation is in the present, and loses nothing.
 */
const FUTURE: readonly RegExp[] = [
  alone('(?:ser|aur|fer|ir|dir|pourr|devr|voudr|saur|verr)(?:a|ont|ait|aient)'),
  alone('faudr(?:a|ait)'),
  alone('va|vont'),
  alone(`[${LETTERS}]{2,}(?:er|ir|dr|ttr|vr|rr|[iî]tr)(?:a|ont|ait|aient)`),
];

/** A contrast, a concession, a doubt cast: what a definition does not need. */
const CONTRAST: readonly RegExp[] = [
  alone('mais'),
  alone('cependant'),
  alone('toutefois'),
  alone('pourtant'),
  alone('néanmoins'),
  alone('en revanche'),
  alone('par contre'),
  alone('au contraire'),
  alone("à l'inverse"),
  alone('à la différence'),
  alone('alors que'),
  alone('tandis que'),
  alone('bien que'),
  alone('même si'),
  alone('quoique'),
  alone('malgré'),
  alone('au lieu'),
  alone('plutôt'),
  alone('en théorie'),
  alone('officiellement'),
  alone('soi-disant'),
  alone('prétendument'),
  alone('censée?s?'),
];

/** Pointing at the page, or at the conversation: the model speaking of what it was handed. */
const POINTING: readonly RegExp[] = [
  alone('ci-dessus'),
  alone('ci-dessous'),
  alone('précitée?s?'),
  alone('mentionnée?s?'),
  alone('évoquée?s?'),
];

/**
 * Words that bound, judge, prescribe, take sides or date — and that a sentence of ours may hold
 * for its own reasons (« sans condition de ressources », « un impôt plus juste », « le non-cumul
 * des mandats »). Each is allowed where a sentence on the page uses the very word, and nowhere
 * else: a definition has no need of them, and each is how a claim comes in.
 */
const UNLESS_SHOWN: readonly (readonly [RuleId, readonly string[]])[] = [
  ['negation', ['non', 'sans', 'surtout', 'principalement', 'essentiellement']],
  [
    'opinion',
    [
      // what ought to be
      'doit|doivent',
      // what it is worth
      'justes?|injustes?',
      'nécessaires?|indispensables?|essentiel(?:le)?s?',
      'utiles?|inutiles?|efficaces?|inefficaces?',
      'dangereux|dangereuses?',
      'ambitieux|ambitieuses?',
      'réalistes?|irréalistes?|utopiques?',
      'radical(?:e|es)?|radicaux|extrêmes?|excessi(?:f|fs|ve|ves)',
      'meilleur(?:e|es|s)?|pires?|mieux',
      'bénéfiques?|néfastes?|nuisibles?|souhaitables?',
      'absurdes?|scandaleu(?:x|se|ses)|catastrophiques?|désastreu(?:x|se|ses)',
      'formidables?|idéal(?:e|es)?|idéaux|parfait(?:e|es|s)?',
      // …said with more heat. A model needs nobody's help to write these; each was found
      // passing the control by the security review of 14/11/2026.
      'génie|génial(?:e|es)?|géniaux|excellent(?:e|es|s)?|remarquables?',
      'merveilleu(?:x|se|ses)|magnifiques?',
      'arnaques?|rackets?|escroqueries?|scandales?|hontes?|honteu(?:x|se|ses)',
      'mensong(?:e|es|er|ère|ères)|trompeu(?:r|rs|se|ses)',
      'stupides?|idiot(?:e|es|s)?|ridicules?|aberrant(?:e|es|s)?|délirant(?:e|es|s)?|folie',
      'étrangl(?:e|es|ent|er)|écras(?:e|es|ent|er)|matraqu(?:e|es|ent|er|ages?)',
      'chers?|chères?|coûteu(?:x|se|ses)',
      // how much, without a number
      'trop|beaucoup|énormément',
      // who thinks what: an explanation reports no position and names no camp
      "selon|d'après",
      'détracteurs?|partisans?|opposants?|adversaires?',
      'critiqu(?:e|es|ent|er|ée?s?)|dénonc(?:e|es|ent|er|ée?s?)',
      'accus(?:e|es|ent|er|ée?s?|ations?)|reproch(?:e|es|ent|er|ée?s?)',
      'contest(?:e|es|ent|er|ée?s?|ations?|ables?)|controvers(?:e|es|ée?s?)',
      'polémiques?|débats?',
      'refus(?:e|es|ent|er|ée?s?)?|rejet(?:s|te|tent|er|ée?s?)?|approuv(?:e|es|ent|er|ée?s?)',
      '(?:la|de|à|extrême) (?:gauche|droite)',
    ],
  ],
  [
    'vote',
    [
      // the campaign: an election, a poll, a promise
      'élections?|électeurs?|électrices?|électoral(?:e|es)?|électoraux',
      'scrutins?|présidentielles?|législatives|sondages?|promesses?',
    ],
  ],
  [
    'tense',
    [
      // a date without a number: what is so « today » is a fact of the day, not a meaning
      "actuel(?:le)?s?|actuellement|aujourd'hui|maintenant|désormais|déjà",
      'récemment|bientôt|prochainement|demain|hier|longtemps',
      "de nos jours|en ce moment|à l'avenir|l'an prochain|l'année prochaine",
    ],
  ],
  ['self', ['questions?', 'phrases?', 'explications?']],
];

/**
 * Capitals a French sentence writes without naming anyone in particular: the institutions
 * every reader knows, by their head noun. A closed list — anything else that is written with a
 * capital must stand in a sentence on the page.
 */
const COMMON_CAPITALS: ReadonlySet<string> = new Set(
  listed(
    `france francais francaise francaises etat etats europe europeen europeenne europeens
     europeennes union republique parlement senat assemblee constitution securite conseil cour
     code caisse banque tresor education commission`,
  ),
);

/**
 * What a sentence may open on without it being its subject: an article, a preposition, a
 * quantifier. Any other first word is the subject, and must be a word of the page — so that a
 * sentence cannot open on a name the visitor typed and say something of that person.
 */
const FIRST_WORDS: ReadonlySet<string> = new Set(
  listed(
    `le la les un une des du de a au aux en par pour dans sur sous avec sans chez chaque tout
     toute tous toutes certains certaines plusieurs quand lorsque comme entre vers avant apres
     pendant lors afin grace concretement generalement souvent parfois`,
  ),
);

/** What an explanation is read against: everything on the page that is ours — and nothing a visitor typed (D16.53). */
export interface ExplainContext {
  /** The read sentences on the screen, then the texts of the cards the page recognised. */
  shown: readonly string[];
}

export interface ExplainOptions {
  /** How many of its own words a sentence must share with the page; provisional default. */
  minShared?: number;
  /**
   * Only the rules that need no sentence of the page: how the recorded outputs of the bench are
   * replayed where the read sentences are not — they live in the private base and in no file.
   * The other rules are then skipped, not passed.
   */
  withoutText?: boolean;
}

/**
 * HYPOTHÈSE until the bench replay fixes it (PLAN-CHAT §6, lot C8). One word is little: it is
 * what a definition shares with the sentence it explains — the word itself — and what a text
 * about something else does not.
 */
export const PROVISIONAL_MIN_SHARED = 1;

/** What the page holds, as the sets a sentence of the model is compared with. */
interface Page {
  texts: readonly string[];
  /** Every word, folded as for the copy check. */
  words: ReadonlySet<string>;
  /** Runs of two words: a noun of the book's apparatus with the word after it. */
  pairs: ReadonlySet<string>;
  /** Its words as the index cuts them, for the subject. */
  terms: readonly string[];
}

function pageOf(shown: readonly string[]): Page {
  const tokens = shown.map((text) => copyTokens(text));
  return {
    texts: shown,
    words: new Set(tokens.flat()),
    pairs: new Set(tokens.flatMap((t) => windows(t, 2))),
    terms: [...new Set(shown.flatMap((text) => terms(text)))],
  };
}

/** A word with what clings to it taken off: an opening bracket, an elided article. */
const bare = (word: string): string =>
  word
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/^(?:[cdjlmnst]|qu|jusqu|lorsqu|puisqu)'/iu, '')
    .replace(/[^\p{L}\p{N}]+$/u, '');

/** Every rule one sentence of an explanation breaks. */
function explainRefusals(
  raw: string,
  index: number,
  page: Page,
  options: ExplainOptions,
): Refusal[] {
  // Counted in characters first, as the page will count it: one token of four hundred letters
  // is one word for the rule below — and two patterns take a time that grows with the square
  // of a sentence. What is too long for the screen is read by no other rule.
  if (raw.length > MAX_EXPLAIN_CHARS) {
    return [{ rule: 'length', sentence: index, detail: `${String(raw.length)} characters` }];
  }
  const own = ownRefusals(raw, index, { min: MIN_EXPLAIN_WORDS, max: MAX_EXPLAIN_WORDS });
  const out = own.out;
  const refuse = (rule: RuleId, detail: string): void => {
    out.push({ rule, sentence: index, detail });
  };
  const { text } = own;

  // --- who says it: nobody
  const attribution = firstMatch(text, ATTRIBUTION);
  if (attribution !== null) refuse('attribution', attribution);
  const never = firstMatch(text, PARTY_NEVER);
  if (never !== null) refuse('party', never);

  // --- it stands alone, in the present, without a turn
  const opener = OPENER.exec(text.replace(/^[^\p{L}\p{N}]+/u, ''));
  if (opener !== null) refuse('opener', opener[0]);
  const future = firstMatch(text, FUTURE);
  if (future !== null) refuse('tense', future);
  const contrast = firstMatch(text, CONTRAST);
  if (contrast !== null) refuse('contrast', contrast);
  const pointing = firstMatch(text, POINTING);
  if (pointing !== null) refuse('self', pointing);

  // Everything below reads the sentences of the page: skipped where there is none to read.
  if (options.withoutText === true) return out;

  // --- the nouns of the book's apparatus: only as the page holds them
  for (const found of text.matchAll(ATTRIBUTION_NOUN)) {
    const pair = copyTokens(text.slice(found.index)).slice(0, 2);
    if (pair.length < 2 || !page.pairs.has(pair.join(' '))) refuse('attribution', found[0]);
  }

  // --- what it may say only with a sentence of the page that says it
  const held = heldRefusals(own, index, page.texts);
  out.push(...held.filter((refusal) => !(refusal.rule === 'party' && never !== null)));
  // Every occurrence is looked at: one that the page allows does not cover the next.
  const pagePlain = page.texts.map(plain);
  for (const [rule, sources] of UNLESS_SHOWN) {
    for (const source of sources) {
      for (const found of text.matchAll(alone(source, 'giu'))) {
        const same = alone(literal(found[0]));
        if (!pagePlain.some((other) => same.test(other))) refuse(rule, found[0]);
      }
    }
  }

  // --- its names: any word written with a capital is a word of the page, or a common one
  text.split(' ').forEach((word, position) => {
    const core = bare(word);
    // A capital at its head, or after a hyphen: « pro-Ruffin », « anti-Poutine » hold a name
    // after a small prefix (review of 24/11/2026). Not after an elision: « l'État ».
    if (!/^\p{Lu}/u.test(core) && !/-\p{Lu}/u.test(core)) return;
    const acronym = /^[\p{Lu}\p{N}]{2,}$/u.test(core);
    // « États-Unis » is two words and one name: read whole, then part by part.
    const whole = copyTokens(core);
    const parts = core.split(/[^\p{L}\p{N}]+/u).flatMap((part) => copyTokens(part));
    if (position === 0 && !acronym && whole.every((token) => FIRST_WORDS.has(token))) return;
    const known = (token: string): boolean =>
      page.words.has(token) ||
      page.terms.some((term) => sameWord(token, term)) ||
      // An acronym is a name like another: it is on the page, or it is not written. (It used
      // to be allowed when the question held it — the question no longer reaches this file.)
      (!acronym && COMMON_CAPITALS.has(token));
    if (!whole.every(known) && !parts.every(known)) refuse('name', core);
  });

  // --- on the subject: a word of its own that the page holds too
  const shared = contentTerms(text).filter((term) =>
    page.terms.some((other) => sameWord(term, other)),
  ).length;
  if (shared < (options.minShared ?? PROVISIONAL_MIN_SHARED)) {
    refuse('topic', `${String(shared)} shared word(s)`);
  }
  return out;
}

/**
 * Every rule an explanation breaks. Empty when it may be shown as written — or when the model
 * wrote no sentence at all: there was no word to explain.
 */
export function explanationRefusals(
  raw: unknown,
  context: ExplainContext,
  options: ExplainOptions = {},
): Refusal[] {
  const explanation = parseModelExplanation(raw);
  if (explanation === null) {
    return [{ rule: 'shape', sentence: null, detail: 'not the expected JSON' }];
  }
  const out: Refusal[] = [];
  const { phrases } = explanation;
  if (phrases.length > MAX_EXPLAIN_SENTENCES) {
    out.push({ rule: 'count', sentence: null, detail: `${String(phrases.length)} sentences` });
  }
  const folded = phrases.map((sentence) => copyTokens(sentence).join(' '));
  if (new Set(folded).size < folded.length) {
    out.push({ rule: 'count', sentence: null, detail: 'the same sentence twice' });
  }
  // An explanation is about words of the page: with no sentence there, there is none to explain.
  if (options.withoutText !== true && phrases.length > 0 && context.shown.length === 0) {
    out.push({ rule: 'topic', sentence: null, detail: 'nothing on the page' });
  }
  const page = pageOf(context.shown);
  phrases.forEach((sentence, index) => {
    out.push(...explainRefusals(sentence, index, page, options));
  });
  return out;
}

/**
 * What the sheet will show. `quiet` carries the reason the explanation was refused, for the
 * bench; the Worker drops it — and no reason at all when the model had nothing to explain.
 */
export type ExplainVerdict =
  { kind: 'explain'; sentences: string[] } | { kind: 'quiet'; refusal?: Refusal };

/**
 * The control of an explanation: all of it, or none of it. One sentence refused and the sheet
 * shows no explanation — never the sentences that passed, which were written to go together.
 */
export function validateExplanation(
  raw: unknown,
  context: ExplainContext,
  options: ExplainOptions = {},
): ExplainVerdict {
  const [first] = explanationRefusals(raw, context, options);
  if (first !== undefined) return { kind: 'quiet', refusal: first };
  const sentences = (parseModelExplanation(raw)?.phrases ?? []).map(plain);
  return sentences.length === 0 ? { kind: 'quiet' } : { kind: 'explain', sentences };
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

/** The longest run of words two texts share, in words. */
function longestRun(a: readonly string[], b: readonly string[]): number {
  let best = 0;
  let previous = new Array<number>(b.length + 1).fill(0);
  for (const word of a) {
    const current = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      if (word !== b[j - 1]) continue;
      const run = (previous[j - 1] ?? 0) + 1;
      current[j] = run;
      if (run > best) best = run;
    }
    previous = current;
  }
  return best;
}

/**
 * How much of an output stands in what the model was shown — two numbers, for the bench: the
 * longest run of words in a row, and the largest share of one of its texts standing in runs of
 * four. Numbers may leave a Worker where the text they measure may not (src/worker/ask.ts,
 * `benchOutput`): they say whether a model that copies misses the rule by a word or recites
 * the measure — which is what one needs to know to write it a better instruction.
 */
export function copyMeasure(
  raw: unknown,
  candidates: readonly Candidate[],
): { longest: number; share: number } {
  const shown = candidates.map((candidate) => copyTokens(candidate.text));
  const texts = textsIn(raw);
  let longest = 0;
  let share = 0;
  for (const text of texts) {
    const tokens = copyTokens(text);
    for (const source of shown) longest = Math.max(longest, longestRun(tokens, source));
    share = Math.max(
      share,
      copiedShare(
        text,
        candidates.map((candidate) => candidate.text),
      ),
    );
  }
  return { longest, share: Math.round(share * 100) / 100 };
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
