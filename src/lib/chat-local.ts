/**
 * What leaves the phone at each gesture of the chat (PLAN-CHAT §2, D16.53) — decided here,
 * purely, from what the page's own search found, so that the page and its tests cannot disagree
 * on it.
 *
 *   while typing            nothing
 *   « Demander »            identifiers: the measures the sheet is about to show
 *   « Expliquer avec l'IA » those identifiers, the words of OUR read sentences that the
 *                           question uses, the cards of ours it names, the follow-up chosen
 *
 * THE QUESTION ITSELF NEVER LEAVES. It is cleaned here for the page's own use — to be searched,
 * and shown in the thread — and no request is ever built from it.
 *
 * These functions build requests; they send none. What they return goes through the strict
 * readers of the contract unchanged (scripts/chat-local.test.ts holds the two together).
 */
import { MAX_QUESTION_CHARS } from './ask-contract.js';
import {
  MAX_CHAT_CARDS,
  MAX_CHAT_IDS,
  MAX_GIST_IDS,
  type ChatRequest,
  type FollowUp,
  type GistsRequest,
} from './chat-contract.js';
import { MAX_CHAT_WORDS, sentenceWords } from './chat-words.js';
import { sameWord, terms, tokenize } from './search-core.js';

/** A question is a question: two characters at least, one line, what the field accepts at most. */
export const MIN_QUESTION_CHARS = 2;

/** Joiners, soft hyphens, marks that turn a line round, and what Unicode says to ignore. */
const UNSEEN = /[\p{Cc}\p{Cf}\p{Default_Ignorable_Code_Point}]+/gu;
/** Every space there is — no-break, thin, line and paragraph separators included. */
const SPACES = /\s+/gu;

/**
 * A question as the page keeps it — to search with, and to show in the thread: composed, on one
 * line, without a character nobody sees. `null` when what is left is not a question — too
 * short, or longer than the field accepts. It goes nowhere: no request has a field for it
 * (src/lib/chat-contract.ts). What is not seen is taken out BEFORE the letters are composed,
 * so that cleaning twice changes nothing (security review of 14/11/2026).
 */
export function cleanQuestion(raw: string): string | null {
  const text = raw
    .replace(/\p{Cc}+/gu, ' ')
    .replace(UNSEEN, '')
    .normalize('NFC')
    .replace(SPACES, ' ')
    .trim();
  if (text.length < MIN_QUESTION_CHARS || text.length > MAX_QUESTION_CHARS) return null;
  return text;
}

/** How many measures the sheet shows for a question: three sentences at most (PLAN-CHAT §1). */
export const SHOWN_MEASURES = 3;

/**
 * A measure is shown only when the search scores it at least 0.4 times as high as the best
 * one — and a measure found only through a look-alike word is not shown next to one found by
 * a word of the question itself.
 *
 * Why: the third row was often there for one common word — « permis de conduire » brought a
 * land reform (« conduire ») — or for a word that only looks like it — « pension de
 * réversion » brought a power line (« tension »). A sentence about something else, under
 * « Ce que prévoit le programme », is the screenshot nobody wants (personas of 15/11/2026).
 * A typo is still forgiven: when nothing matches a word as written, the look-alikes are all
 * there is, and they are shown.
 *
 * PROBABLE, measured on 15/11/2026 on the 132 questions of the dossier that say which sections
 * are expected (public index, eval/ask-2026.json): 308 rows instead of 396, 69 % of them in an
 * expected section instead of 60 %, and as many questions with at least one there (121). At
 * 0.5 one is lost — the question on the end of life keeps the legalisation of cannabis and
 * loses the right measure — for one point more.
 */
export const MIN_SHARE_OF_BEST = 0.4;

/** A result of the page's search: a proposition and its score. */
export interface Ranked {
  id: string;
  score: number;
  /**
   * True when the measure was found only through words that LOOK like the question's — the
   * search forgives a typo, so « pension » also finds « tension » (`lookAlikeOnly`, src/lib/search-core.ts).
   */
  near?: boolean;
  /**
   * True when the measure was found only by words that say nothing of a subject — a verb of
   * the question, a quantity, a bare number (`fillerOnly`, src/lib/search-core.ts).
   */
  weak?: boolean;
}

/**
 * The measures a question is answered with: the three the search ranks best, whatever their
 * section — best first, each once, and only those the page can name and link.
 *
 * PROBABLE, measured on 14/11/2026 on the 132 questions of the dossier that say which sections
 * are expected (0 neuron, public index, eval/ask-2026.json): 239 of 396 rows land in an expected
 * section, against 159 of 394 when the sheet takes one measure from each of the three best
 * sections — for two questions fewer with at least one row there (121 against 123). A reader
 * who asks what the programme provides for rents wants the measures on rents, not a tour.
 */
export function rowsOf(hits: readonly Ranked[], knows: (id: string) => boolean): string[] {
  const ranked = hits
    .map((hit, at) => ({ ...hit, at }))
    .sort((a, b) => b.score - a.score || a.at - b.at);
  const rows: string[] = [];
  let best: number | null = null;
  let asWritten = false;
  for (const hit of ranked) {
    if (rows.length === SHOWN_MEASURES) break;
    if (!knows(hit.id) || rows.includes(hit.id)) continue;
    // Found by « parle » or « payés » alone: a result of the search, not an answer.
    if (hit.weak === true) continue;
    best ??= hit.score;
    // Far behind the best one, a measure is there for one word in common: it says nothing of
    // what was asked — and neither does anything ranked after it.
    if (hit.score < best * MIN_SHARE_OF_BEST) break;
    // A look-alike is shown only while no measure was found by a word as it was asked.
    if (hit.near === true && asWritten) continue;
    if (hit.near !== true) asWritten = true;
    rows.push(hit.id);
  }
  return rows;
}

/** What « Demander » sends: the measures about to be shown. Null when there is none: nothing is sent. */
export function gistsRequestOf(corpus: string, rows: readonly string[]): GistsRequest | null {
  const ids = [...new Set(rows)].slice(0, MAX_GIST_IDS);
  return ids.length === 0 ? null : { corpus, ids };
}

/**
 * The words of our sentences that a question uses — what the page sends in place of the
 * question: in the order the question names them, each once, `MAX_CHAT_WORDS` at most. Empty
 * when it uses none: the model then explains the hardest words by itself.
 */
export function askedWords(question: string, shown: readonly string[]): string[] {
  const words = sentenceWords(shown);
  const out: string[] = [];
  for (const asked of terms(question)) {
    if (out.length === MAX_CHAT_WORDS) break;
    const found = words.find((word) => sameWord(asked, word.term));
    if (found !== undefined && !out.includes(found.term)) out.push(found.term);
  }
  return out;
}

export interface Asking {
  corpus: string;
  /** What was typed. It is read here, to find which of our words it uses — and sent nowhere. */
  question: string;
  /** The read sentences on the screen, in the order shown. */
  shown: readonly { id: string; text: string }[];
  /** The cards of ours the question names, as the page recognised them. */
  cards: readonly string[];
  follow?: FollowUp | undefined;
}

/**
 * What « Expliquer avec l'IA » sends — or null, and then nothing leaves: no read sentence on
 * the screen to explain a word of. The question is not in it: only the words of our own
 * sentences that it uses.
 */
export function chatRequestOf(asking: Asking): ChatRequest | null {
  const shown = asking.shown.slice(0, MAX_CHAT_IDS);
  const ids = [...new Set(shown.map((gist) => gist.id))];
  if (ids.length === 0) return null;
  const request: ChatRequest = {
    corpus: asking.corpus,
    ids,
    words: askedWords(
      asking.question,
      shown.map((gist) => gist.text),
    ),
    cards: [...new Set(asking.cards)].slice(0, MAX_CHAT_CARDS),
  };
  return asking.follow === undefined ? request : { ...request, follow: asking.follow };
}

/**
 * Asking whom to vote for, or who will win: the one kind of question the sheet answers by
 * itself with « Ici, on ne parle que du programme. » — no measure shown, nothing sent, whatever
 * the search would have found for the word « vote ». Narrow on purpose: « le droit de vote à
 * 16 ans » is a question about the programme.
 */
const VOTE_ADVICE: readonly RegExp[] = [
  // « pour qui voter », « pour qui je dois voter », « tu votes pour qui »
  /\b(?:pour|contre) qui (?:[a-z]+ ){0,3}vot(?:er|e|es|ons|ez)\b/,
  /\bvot(?:er|e|es|ons|ez) (?:pour|contre) qui\b/,
  // « je dois voter… », « dois-je voter… », « faut-il voter… »
  /\b(?:je|on|tu) (?:dois|doit|devrais|devrait|vais|va) voter\b/,
  /\b(?:dois|doit|devrais|devrait) (?:je|on) voter\b/,
  /\bfaut il voter\b/,
  // a forecast, a poll
  /\bqui va (?:gagner|remporter|perdre)\b/,
  /\bpronostics?\b/,
  /\b(?:consignes?|intentions?) de vote\b/,
];

/** True when the question asks for voting advice or a forecast: it is answered on the phone. */
export function asksForVote(question: string): boolean {
  const folded = tokenize(question).join(' ');
  return VOTE_ADVICE.some((pattern) => pattern.test(folded));
}

/**
 * An insult, or a judgement asked about a person or a party — « Mélenchon est-il… ? », « LFI,
 * c'est… ? », « que penser de… ». Neither is a question about what is written in the book, and
 * the search would answer both with whatever measure shares a word: « antisémite » brought a
 * measure against antisemitism, an insult brought a measure on debt (hostile review and
 * personas of 15/11/2026). They get the one sentence a request for a vote gets.
 *
 * Narrow on purpose. A name alone refuses nothing: « la réforme Macron des retraites » and
 * « Mélenchon veut-il sortir de l'Europe ? » are questions about the programme. What is
 * refused is the name as the subject of « être », or as the object of an opinion.
 */
const NAMED =
  '(?:melenchon|jlm|macron|le pen|lepen|bardella|zemmour|retailleau|attal|darmanin|hollande|sarkozy|glucksmann|ruffin|roussel|tondelier|faure|bompard|panot|autain|ciotti|wauquiez|bayrou|barnier|lecornu|borne|trump|poutine|netanyahou|netanyahu|lfi|la france insoumise|les insoumis|insoumis|insoumise|insoumises|rn|le rassemblement national|rassemblement national|ps|parti socialiste|lr|les republicains|renaissance|eelv|les ecologistes|pcf|reconquete|nfp|nupes)';
const NOT_A_QUESTION: readonly RegExp[] = [
  // an insult, wherever it stands
  /\b(?:connard|connards|connasse|connasses|couillon|couillons|abruti|abrutie|abrutis|debile|debiles|cretin|cretine|cretins|imbecile|imbeciles|bouffon|bouffons|batard|batards|encule|encules|fdp|ntm|pute|putes|salope|salopes|salaud|salauds|merde|ducon|trouduc)\b/,
  /\b(?:ta gueule|va te faire|nique)\b/,
  /(?:^|\b)(?:tu es|es|vous etes|etes)(?: [a-z]+)? (?:nul|nuls|nulle|nulles|con|cons|conne|bete|betes|idiot|idiote|idiots|stupide|stupides)\b/,
  // a person or a party as the subject of « être » — at the head of the question
  new RegExp(
    `^(?:est ce que |et |mais |alors |donc )?(?:le |la |les |l )?${NAMED}(?: [a-z]+){0,2} (?:est|sont|serait|seraient|etait|etaient)\\b`,
  ),
  new RegExp(
    `^(?:est ce que |et |mais |alors |donc )?(?:le |la |les |l )?${NAMED} (?:ment|mentent|a (?:t )?(?:il|elle) raison)\\b`,
  ),
  // an opinion asked about one
  new RegExp(
    `\\b(?:penser|penses|pensez|pense|pensent|dire|dis|dites) (?:[a-z]+ ){0,2}(?:de|du|des|sur) (?:le |la |les |l )?${NAMED}\\b`,
  ),
];

/** True when the question is an insult, or asks for a judgement on a person or a party. */
export function asksOffTopic(question: string): boolean {
  const folded = tokenize(question).join(' ');
  return NOT_A_QUESTION.some((pattern) => pattern.test(folded));
}

/**
 * Questions about the site itself — who wrote this, is it official, are you an AI, who pays —
 * as the index folds them: small letters, no accents, and no elided letter (« c'est officiel »
 * reads « est officiel », « t'es une ia » reads « es une ia »).
 *
 * Why they are recognised (personas of 15/11/2026). The search answers them with whatever
 * measure shares a word: « Vous êtes payés par la France insoumise ? » brought a sentence on
 * paid leave, under « Ce que prévoit le programme ». The site has an answer of its own to
 * these, and it is the one to give.
 *
 * Narrow on purpose: each pattern names the site, the reader's « tu » or « vous », or stands
 * alone as the whole question. « Comment ça marche, la retraite par répartition ? » and « le
 * RSA sera payé par qui ? » are questions about the programme, and stay so. A question about
 * the site that is missed gets what it got before — measures, or nothing found.
 */
const SITE =
  '(?:ce site|le site|cette appli|l appli|cette application|cette page|ce truc|ce projet)';
const YOU = '(?:tu es|es|es tu|vous etes|etes vous|etes)';
const ABOUT_SITE: readonly RegExp[] = [
  // who wrote, made, checked — this, these sentences, the programme itself
  new RegExp(
    `\\bqui (?:a|ont) (?:ecrit|fait|redige|cree|code|verifie|relu) (?:ca|tout ca|${SITE}|(?:ces|les) (?:phrases|reponses|textes|explications)|(?:ce|le) programme)\\b`,
  ),
  /\bqui (?:ecrit|redige|verifie) (?:ces|les) (?:phrases|reponses|textes|explications)\b/,
  // who are you, who is behind
  /\b(?:qui es tu|qui etes vous|tu es qui|vous etes qui)\b/,
  /^es qui\b/,
  new RegExp(`\\bqui (?:est|se cache) derriere (?:ca|tout ca|${SITE})\\b`),
  new RegExp(`^est qui derriere\\b`),
  // an AI, a robot, a person
  new RegExp(
    `(?:^|\\b)${YOU}(?: [a-z]+)? (?:une ia|un robot|un bot|un chatbot|une machine|un humain|humain|une vraie personne|chatgpt)\\b`,
  ),
  /\b(?:chatgpt|chat gpt)\b/,
  new RegExp(`\\b${SITE} est (?:[a-z]+ )?(?:une ia|un robot|un chatbot)\\b`),
  // official, the real programme
  /^(?:est ce que |est ce )?est (?:bien |vraiment )?officiel$/,
  new RegExp(`\\b${SITE} (?:est (?:il |elle )?)?(?:[a-z]+ )?officiel(?:le)?\\b`),
  /\b(?:site|appli|application|page|compte) officiel(?:le)?\b/,
  /\b(?:vrai|veritable) (?:programme|site)\b/,
  new RegExp(`\\b${SITE} est (?:il |elle )?(?:[a-z]+ )?(?:fiable|serieux|neutre|objectif)\\b`),
  // paid by, working for
  new RegExp(
    `(?:^|\\b)(?:${YOU}|${SITE} est)(?: [a-z]+)? (?:paye|payes|payee|payees|finance|finances|financee|financees|sponsorise|sponsorises) par\\b`,
  ),
  /\b(?:tu|vous) (?:roule[sz]?|bosse[sz]?|travaille[sz]?) pour (?:qui|lfi|melenchon|la france insoumise|les insoumis|un parti|le parti)\b/,
  // how it works — the whole question, or about the site by name
  /^comment (?:ca|tu|vous) (?:marche[sz]?|fonctionne[sz]?)$/,
  new RegExp(`\\bcomment (?:marche|fonctionne) ${SITE}\\b`),
  new RegExp(`\\bcomment ${SITE} (?:marche|fonctionne)\\b`),
];

/**
 * True when the question is about the site itself: it is answered on the phone, with what the
 * site says of itself — and with no measure next to it.
 */
export function asksAboutSite(question: string): boolean {
  const folded = tokenize(question).join(' ');
  return ABOUT_SITE.some((pattern) => pattern.test(folded));
}
