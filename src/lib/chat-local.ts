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
import { fillerOnly, processTerm, sameWord, terms, tokenize } from './search-core.js';

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
  /** The words of the question, as the index cuts them, that found this measure. */
  by?: readonly string[];
  /** True when a word that means the same as one of the question's found it too (a synonym). */
  viaSynonym?: boolean;
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
 * Who a question may name — the candidate and the movement of the book, other politicians and
 * parties — as the index folds them: small letters, no accents; « Mélanchon », « Méluche » and
 * « mélenchonistes » too. A name is
 * here only if it is hardly anything else: « borne », « renaissance », « les écologistes »
 * are also words of the book (« une borne de recharge »), and a rule that took them for a
 * person refused questions about the programme (second review of 15/11/2026).
 */
const PERSON_OWN = '(?:(?:jean luc )?mel[ae]n(?:ch|c|sh)i?on[a-z]*|meluche|jlm)';
const PARTY_OWN =
  '(?:la france insoumise|france insoumise|lfi|les insoumis|les insoumises|insoumis|insoumise|insoumises)';
const PERSON_OTHER =
  '(?:macron|marine le pen|le pen|lepen|bardella|zemmour|retailleau|attal|darmanin|hollande|sarkozy|glucksmann|ruffin|roussel|tondelier|faure|bompard|panot|autain|ciotti|wauquiez|bayrou|barnier|lecornu|trump|poutine|netanyahou|netanyahu)';
const PARTY_OTHER =
  '(?:le rassemblement national|rassemblement national|rn|le parti socialiste|parti socialiste|ps|lr|eelv|pcf|nfp|nupes|modem)';
const PERSON = `(?:${PERSON_OWN}|${PERSON_OTHER})`;
const NAMED = `(?:${PERSON}|${PARTY_OWN}|${PARTY_OTHER})`;

/**
 * Asking whom to vote for, or who will win: the one kind of question the sheet answers by
 * itself with « Ici, on ne parle que du programme. » — no measure shown, nothing sent, whatever
 * the search would have found for the word « vote ». Narrow on purpose: « le droit de vote à
 * 16 ans », « pourquoi faire voter les étrangers ? », « le vote LFI sur la loi immigration »
 * and « interdire les sondages avant l'élection » are questions about the programme.
 */
const VOTE_ADVICE: readonly RegExp[] = [
  // « pour qui voter », « pour qui je dois voter », « tu votes pour qui »
  /\b(?:pour|contre) qui (?:[a-z]+ ){0,3}vot(?:er|e|es|ons|ez)\b/,
  /\bvot(?:er|e|es|ons|ez) (?:pour|contre) qui\b/,
  // « je dois voter… », « dois-je voter… », « faut-il voter… »
  /\b(?:je|on|tu) (?:dois|doit|devrais|devrait) voter\b/,
  /\b(?:dois|doit|devrais|devrait) (?:je|on) voter\b/,
  /\bfaut il voter\b/,
  /\bpourquoi voter (?:pour |contre )?(?:lui|elle|eux|ca|a gauche|a droite)\b/,
  // the verb with a name — « je vote Mélenchon ? », « pourquoi voter LFI ? » —, not the noun
  new RegExp(
    `(?:^|\\b(?:je|tu|on|nous|vous|faut|pourquoi|dois|doit|vais|va|allez|allons|irai|ira) (?:[a-z]+ ){0,2})vot(?:er|e|es|ons|ez|erai|erais) (?:pour |contre )?(?:le |la |les |l )?${NAMED}\\b`,
  ),
  // a forecast, a poll, a ranking of candidates
  /\bqui va (?:gagner|remporter|perdre)\b/,
  new RegExp(
    `\\b${NAMED} (?:va|peut|pourrait|vont|peuvent) (?:t )?(?:il |elle |ils |elles )?(?:gagner|perdre|l emporter|etre elue?s?)\\b`,
  ),
  /\bpronostics?\b/,
  /\b(?:dans|selon|d apres) (?:les|le|un) sondages?\b/,
  /\bsondages? (?:presidentielle|presidentiel|legislatives|electoral|electoraux|2027)\b/,
  /\b(?:consignes?|intentions?) de vote\b/,
  /\b(?:meilleure?|pire) (?:candidate?|presidente?)\b/,
];

/** True when the question asks for voting advice or a forecast: it is answered on the phone. */
export function asksForVote(question: string): boolean {
  const folded = tokenize(question).join(' ');
  return VOTE_ADVICE.some((pattern) => pattern.test(folded));
}

/**
 * An insult, or a person or a party put on trial — « Mélenchon est-il… ? », « LFI antisémite »,
 * « Bardella ou Mélenchon ? », « que penser de… ». None is a question about what is written in
 * the book, and the search would answer each with whatever measure shares a word: « antisémite »
 * brought a measure against antisemitism, an insult brought a measure on debt (hostile review
 * and personas of 15/11/2026). They get the one sentence a request for a vote gets.
 *
 * WHAT THIS IS, AND IS NOT. Three reviews in a row broke three versions of these rules, each
 * tuned on the questions of the review before: a list of words is beaten by the next wording,
 * and widening it refuses questions about the programme (« que fait LFI contre les actes
 * antisémites ? »). So the rules here are few and sure — they refuse only what they recognise
 * for certain — and they are NOT what keeps a sentence of ours from standing under a name.
 * That is `measuresFor`, below: a question that names someone gets links, never sentences.
 *
 * What is refused, when a name is there:
 *   - what is thrown at it, where it stands NEXT to the name (« Mélenchon antisémite »,
 *     « LFI, des fachos », « le dictateur Macron ») — not where it is the subject of a
 *     measure, further in the sentence;
 *   - what is asked of a person and is nobody's programme: money, health, the courts;
 *   - the name as the subject of « être » at the head of the question, unless what follows is
 *     a position (« pour », « contre », « prêt à »), a leaning (« écologiste ») or an election;
 *   - an opinion asked about it; two persons set side by side and nothing else.
 */
const INSULT: readonly RegExp[] = [
  /\b(?:connard|connards|connasse|connasses|couillon|couillons|abruti|abrutie|abrutis|debile|debiles|cretin|cretine|cretins|imbecile|imbeciles|bouffon|bouffons|batard|batards|encule|encules|fdp|ntm|pute|putes|salope|salopes|salaud|salauds|ducon|trouduc|clown|clowns|guignol|guignols|charlatan|charlatans|tocard|tocards|gauchiasse|gauchiasses)\b/,
  /\b(?:ta gueule|va te faire|va chier|nique|a chier)\b/,
  // « merde » alone is no insult to anyone: « c'est la merde pour payer mon loyer » is a question
  /\b(?:site|appli|application|programme|truc|reponses?|ia|bot|chatbot|parti|candidat) (?:de merde|de fous?|pourri|pourrie|pourris|a la con|est nul|est bidon)\b/,
  /\b(?:putain|merde) de (?:site|truc|appli|programme|bot|ia)\b/,
  // « bande de… » — never « la bande de Gaza »
  /\b(?:bande|tas|ramassis) de (?:gauchistes?|gauchos?|clowns?|cons?|guignols?|nuls?|voleurs?|menteurs?|fachos?|rigolos?|tocards?|incapables?|bouffons?|escrocs?|charlatans?)\b/,
  /\b(?:sale|sales|gros|grosse) (?:gauchistes?|gauchos?|fachos?|cons?|connes?|menteurs?)\b/,
  /(?:^|\b)(?:vous etes|etes|tu es|es) (?:des |un |une |qu un |qu une )?(?:escrocs?|menteurs?|menteuse|voleurs?|fachos?|gauchistes?|vendus?|nazes?|merde)\b/,
  /(?:^|\b)(?:tu es|es|vous etes|etes)(?: [a-z]+)? (?:nul|nuls|nulle|nulles|con|cons|conne|bete|betes|idiot|idiote|idiots|stupide|stupides)\b/,
];
/** What is thrown at a person or a party — the epithet, not the subject (« antisémitisme »). */
const EPITHET =
  '(?:antisemites?|racistes?|islamophobes?|islamo ?gauchistes?|islamistes?|dictateurs?|fachos?|fascistes?|nazis?|neo ?nazis?|extremistes?|populistes?|complotistes?|menteurs?|menteuse|voleurs?|corrompus?|corrompue|traitres?|poutinistes?|pro ?russes?|pro ?iran|pro ?hamas|chavistes?|communistes?|staliniens?|gourou|secte|sectaires?|terroristes?|wokistes?|woke|gauchistes?|fou|folle|dingue|cingle|violente?s?|sexistes?|misogynes?|homophobes?|transphobes?|pedophiles?|violeurs?|escrocs?|voyous?|delinquants?|dealers?|fraudeurs?|hypocrites?|demagogues?|demago|manipulateurs?|incompetente?s?|ridicules?|haineux|haineuse|dangereux|dangereuse|autoritaires?|coleriques?|communautaristes?|antisionistes?|complices?|anti ?france|ultra ?gauche|staline|hitler|mussolini|robespierre|lenine|khmers? rouges?|rouge brun|corruption|mensonges?|delire|delirant)';
/** Between a name and what is thrown at it: « est », « un », « des » — never a word of its own. */
const GLUE =
  '(?:est|sont|etait|serait|c|un|une|des|le|la|les|l|tres|trop|vraiment|si|aussi|plutot|encore|toujours|donc|qu|que|il|elle|ils|elles|bien|tous|toutes|comme|vrai|vraie|gros|sale|grand|pur|tellement|completement|totalement|devenu|devenue|parait|semble|a|ont|ete)';
const CHARGED: readonly RegExp[] = [
  new RegExp(`\\b${NAMED}(?: ${GLUE}){0,4} ${EPITHET}\\b`),
  new RegExp(`\\b${EPITHET} (?:de |d |du |des )?(?:la |le |les |l )?${NAMED}\\b`),
];
/** What is asked of a person and is nobody's programme: money, health, the courts, bad company. */
const PERSONAL: readonly RegExp[] = [
  new RegExp(
    `\\b(?:patrimoine|fortune|salaire|casier|sante|vie privee|proces|perquisitions?|comptes?|appartement|maison|argent) (?:judiciaire )?(?:de |d |du |des )(?:la |le |les |l )?${PERSON}\\b`,
  ),
  new RegExp(
    `\\b${PERSON}(?: ${GLUE}){0,3} (?:casier|perquisition[a-z]*|proces|mis en examen|mise en examen|garde a vue|condamne[a-z]*|comptes? en suisse|evade fiscal|evasion fiscale|fraude fiscale|demission[a-z]*|degage|dehors|mort|morte|malade|vieux|vieille|fatigue|fatiguee|riche|millionnaire)\\b`,
  ),
  new RegExp(`\\bperquisition[a-z]* (?:chez |de |d )?${NAMED}\\b`),
  new RegExp(`\\b${NAMED} (?:et )?(?:l )?affaires?\\b`),
  new RegExp(`\\b${PERSON} a (?:t il |t elle )?(?:\\d+ ans|quel age)\\b`),
  new RegExp(
    `\\b${PERSON} (?:va |doit |devrait )?(?:mourir|prendre sa retraite|demissionner|partir|se taire)\\b`,
  ),
  new RegExp(
    `\\b${NAMED} (?:[a-z]+ )?(?:soutient|soutiennent|a soutenu|ont soutenu|cautionne|cautionnent|finance par|financee? par|aime|adore|hait|deteste) (?:le |la |les |l |par )?(?:hamas|hezbollah|poutine|russie|iran|chavez|maduro|qatar|algerie|casseurs|emeutiers|emeutes|terroris[a-z]*|islamis[a-z]*|freres musulmans|dictat[a-z]*|juifs|musulmans|arabes|france)\\b`,
  ),
];
/** A name that labels a text of law — « la réforme Macron », « la loi immigration de Darmanin » — is the law's. */
const LABELS =
  '(?:(?:contre )?reformes?|lois?|circulaires?|ordonnances?|decrets?|taxes?|plans?|pactes?|gouvernements?|quinquennats?|annees|politiques?)';
const LABEL = new RegExp(
  `\\b(${LABELS})(?: [a-z0-9]+){0,3}? (?:de |d |du |des )?(?:la |le |les |l )?${PERSON_OTHER}\\b`,
  'g',
);
const BOOK = /\b(?:programme|avenir en commun|aec|livre)\b/;
/** After « est », what makes the question one about a position, a leaning, or the vote's outcome. */
const POSITION =
  '(?:il |elle |ils |elles )?(?:(?:vraiment|toujours|encore|bien|aussi|plutot|reellement|plus|moins) )?(?:pour|contre|favorable|favorables|d accord|accord|oppose|opposee|opposes|opposees|pret|prete|prets|pretes|ce (?:que|qu)|dans le programme|elue?s?|presidente?|candidate?|ecologistes?|feministes?|laiques?|pacifistes?|souverainistes?|protectionnistes?|anticapitalistes?|antinucleaires?|europeens?|europeennes?|republicains?|republicaines?|universalistes?|internationalistes?|decroissants?|productivistes?)\\b';
const JUDGED: readonly RegExp[] = [
  // a person or a party as the subject of « être » — at the head of the question
  new RegExp(
    `^(?:est ce que |et |mais |alors |donc |pourquoi |il parait que |parait que )?(?:le |la |les |l )?${NAMED}(?: [a-z]+){0,2} (?:est|sont|serait|seraient|etait|etaient)\\b(?! ${POSITION})`,
  ),
  new RegExp(
    `\\b${NAMED} (?:[a-z]+ )?(?:ment|mentent|a (?:t )?(?:il|elle) raison|raconte (?:n )?importe quoi|delire)\\b`,
  ),
  // an opinion asked about one
  new RegExp(
    `\\b(?:penser|penses|pensez|pense|pensent|dire|dis|dites) (?:[a-z]+ ){0,2}(?:de|du|des|sur) (?:le |la |les |l )?${NAMED}\\b(?! dans le programme)`,
  ),
  new RegExp(`\\bavis (?:sur|de|du|des) (?:le |la |les |l )?${NAMED}\\b`),
];
const ANY_NAMED = new RegExp(`\\b${NAMED}\\b`);
const EACH_PERSON = new RegExp(`\\b${PERSON}\\b`, 'g');
/** One spelling per person: two spellings of a name are one person. */
const personOf = (name: string): string =>
  /^(?:jean luc |mel|jlm)/.test(name)
    ? 'jlm'
    : /pen$/.test(name)
      ? 'lepen'
      : name.replace('netanyahu', 'netanyahou');
/** Small words that say nothing of a subject between two names. */
const BETWEEN = new Set([
  'que',
  'qui',
  'quoi',
  'face',
  'avec',
  'contre',
  'entre',
  'comme',
  'plus',
  'moins',
  'mieux',
  'pire',
]);

/** True when the question is an insult, or puts a person or a party on trial. */
export function asksOffTopic(question: string): boolean {
  const folded = tokenize(question).join(' ');
  if (INSULT.some((pattern) => pattern.test(folded))) return true;
  if (!ANY_NAMED.test(folded)) return false;
  if ([...CHARGED, ...PERSONAL, ...JUDGED].some((pattern) => pattern.test(folded))) return true;
  // Two persons set side by side and nothing else — « X ou Y ? », « X aime Y ? ». With a
  // subject next to them (« Mélenchon et Trump : les droits de douane ») it is a search.
  const left = folded.replace(LABEL, '$1');
  const persons = new Set((left.match(EACH_PERSON) ?? []).map(personOf));
  if (persons.size < 2 || BOOK.test(left)) return false;
  const rest = left
    .replace(EACH_PERSON, ' ')
    .split(' ')
    .filter((word) => word.length >= 3 && processTerm(word) !== null && !BETWEEN.has(word));
  return rest.length <= 1;
}

/**
 * True when the question names a politician or a party — and not merely the law that carries
 * a name. Such a question is searched like any other, and shown as LINKS: see `measuresFor`.
 */
export function namesSomeone(question: string): boolean {
  return ANY_NAMED.test(tokenize(question).join(' ').replace(LABEL, '$1'));
}

const NUMBER = /^\d+$/;
const ONLY_EPITHET = new RegExp(`^${EPITHET}$`);
/** The words of a question as typed, each with what the index makes of it — null for a small word. */
function wordsOf(question: string): { typed: string; term: string | null }[] {
  return question
    .split(/[^\p{L}\p{N}]+/u)
    .filter((typed) => typed !== '')
    .map((typed) => ({ typed, term: processTerm(tokenize(typed)[0] ?? '') }));
}

/**
 * Words typed like a name — one capital, then small letters — that found no measure at all: a
 * person nobody listed (« Rima Hassan », « Méluche »). Not an acronym (« URSS »): those are
 * rarely a person, and the parties have their list. The first word of a sentence has its
 * capital anyway: it counts only in a question of a few words (« Obono antisémite »). `means`
 * says whether a word has a synonym in the files of the search: such a word found its measures
 * by another. A brand typed with its capital (« Uber ») is taken for a name too — the cost is
 * links where sentences could have been, never the reverse.
 */
export function strangersIn(
  question: string,
  hits: readonly Ranked[],
  means: (word: string) => boolean = () => false,
): string[] {
  const found = new Set(hits.flatMap((hit) => hit.by ?? []));
  const words = [...question.matchAll(/[\p{L}\p{N}]+/gu)].map((match) => ({
    typed: match[0],
    // At the head of the question, or of a sentence inside it.
    opens: /(?:^|[.?!:;…«»"(])\s*$/u.test(question.slice(0, match.index)),
  }));
  return words
    .filter(({ typed, opens }) => {
      const folded = tokenize(typed)[0] ?? '';
      const term = processTerm(folded);
      if (term === null || NUMBER.test(typed) || typed.length < 3 || found.has(term)) return false;
      if (ONLY_EPITHET.test(folded) || ANY_NAMED.test(folded) || means(typed)) return false;
      const first = typed.charAt(0);
      const named = first !== first.toLowerCase() && typed !== typed.toUpperCase();
      return named && (!opens || words.length <= 4);
    })
    .map(({ typed }) => typed);
}

/**
 * The words of the question that found the measures SHOWN, as typed — given only when other
 * words of the question found none of them: the reader is then told what the result is about
 * (« Trouvées avec « école » »), and that it is a search by words, not an answer about the
 * rest. Null when every word led there, or when a measure came by a synonym: nothing sure can
 * then be said. It speaks of the search — never of what the book holds or does not.
 */
export function foundWith(
  question: string,
  hits: readonly Ranked[],
  shown: readonly string[],
): string[] | null {
  const rows = hits.filter((hit) => shown.includes(hit.id));
  if (rows.length === 0 || rows.some((hit) => (hit.by ?? []).length === 0)) return null;
  const found = new Set(rows.flatMap((hit) => hit.by ?? []));
  const words = wordsOf(question).filter(
    (word): word is { typed: string; term: string } => word.term !== null,
  );
  const filler = (term: string): boolean => !NUMBER.test(term) && fillerOnly([term]);
  // As typed — « RIC » stays « RIC » —, each word once whatever its capitals.
  const led = words
    .filter(({ term }) => found.has(term) && !filler(term))
    .map(({ typed }) => typed)
    .filter(
      (typed, at, all) =>
        all.findIndex((other) => other.toLowerCase() === typed.toLowerCase()) === at,
    );
  const idle = words.some(
    ({ typed, term }) =>
      !found.has(term) && !NUMBER.test(typed) && typed.length >= 3 && !filler(term),
  );
  return idle && led.length > 0 ? led : null;
}

/** What a turn shows of the measures: which ones, with or without our sentences, and why. */
export interface Found {
  rows: string[];
  /** False: the rows are shown as links, and nothing is asked of the base. */
  sentences: boolean;
  /** True when the question names a politician or a party: the sheet says so, in one line. */
  named: boolean;
  /** The words that found the rows, when others found none of them — or null. */
  with: string[] | null;
}

/**
 * The measures a turn shows, and how.
 *
 * A question recognised as one of our fifteen objections gets the measures our written answer
 * rests on (data/2026/riposte.json, `supports`) — the answer and its measures then say one
 * thing. The words of an objection find anything: « Ils veulent sortir de l'UE et de l'euro »
 * found, first, a measure on an agreement with Israel (second review of 15/11/2026).
 *
 * Any other question gets what the search ranks best — and, WHEN IT NAMES SOMEONE, AS LINKS
 * ONLY: no sentence of ours is asked for, none is shown. A sentence that says « le programme
 * prévoit… » under « Rima Hassan antisémite ? » reads as the site answering for a person, and
 * it is the one screenshot three reviews took, each in other words, whatever the list of
 * words then refused (third review of 15/11/2026: « stop showing sentences there »). A link
 * to a measure, with the words that found it, is a search result — what it is. « Someone » is
 * a politician or a party of the list, or a word typed like a name that found nothing. The
 * cost is known: « que propose LFI pour l'école ? » gets links, and a line says how to get
 * sentences — ask for the subject alone.
 */
export function measuresFor(
  question: string,
  supports: readonly string[],
  hits: readonly Ranked[],
  knows: (id: string) => boolean,
  means: (word: string) => boolean = () => false,
): Found {
  const chosen = [...new Set(supports)].filter(knows).slice(0, SHOWN_MEASURES);
  if (chosen.length > 0) return { rows: chosen, sentences: true, named: false, with: null };
  const rows = rowsOf(hits, knows);
  const named = namesSomeone(question);
  const strangers = named ? [] : strangersIn(question, hits, means);
  return {
    rows,
    sentences: !named && strangers.length === 0,
    named: named && rows.length > 0,
    with: foundWith(question, hits, rows),
  };
}

/**
 * Questions about the site itself — who wrote this, is it official, are you an AI, who pays,
 * what do you keep — as the index folds them: small letters, no accents, and no elided letter
 * (« c'est officiel » reads « est officiel », « t'es une ia » reads « es une ia »).
 *
 * Why they are recognised (personas of 15/11/2026). The search answers them with whatever
 * measure shares a word: « Vous êtes payés par la France insoumise ? » brought a sentence on
 * paid leave, under « Ce que prévoit le programme ». The site has an answer of its own to
 * these, and it is the one to give.
 *
 * Narrow on purpose, and narrowed again after a third review: each pattern names the site
 * (« ce site est… », never « ce site industriel »), the reader's « tu » or « vous » with what
 * a site does, the sentences on the screen, or stands alone as the whole question. « Comment
 * ça marche, la retraite par répartition ? », « vous gardez les retraites à 62 ans ? », « un
 * humain derrière les guichets ? » and « où vont nos données de santé ? » are questions about
 * the programme, and stay so. A question about the site that is missed gets what it got
 * before — measures, or nothing found.
 */
const SITE =
  '(?:ce site|le site|cette appli|l appli|cette application|cette page|ce truc|ce projet)';
/** The site named by « ce » — when what follows is what a site does, or nothing. */
const THIS =
  '(?:(?:ce site(?: web| internet)?|cette appli|cette application|ce chatbot|ce bot|ce chat)(?:$| (?:est|existe|pue|marche|fonctionne|appartient|sert|ment|garde|enregistre|dit|raconte|vient|repond|aujourd hui|il|elle|c)\\b))';
const YOU = '(?:tu es|es|es tu|vous etes|etes vous|etes)';
const TEXTS = '(?:reponses|phrases|textes|explications)';
const WHO =
  '(?:une ia|l ia|un robot|un bot|un chatbot|une machine|un humain|une humaine|une personne|une vraie personne|quelqu un|chatgpt|un algorithme|claude|mistral|gemini|gpt|llama|copilot)';
const ABOUT_SITE: readonly RegExp[] = [
  new RegExp(`\\b${THIS}`),
  /^(?:c )?est quoi ce (?:truc|machin)$/,
  // who wrote, made, checked — this, these sentences, the programme itself
  new RegExp(
    `\\bqui (?:a|ont) (?:ecrit|fait|redige|cree|code|verifie|relu) (?:ca|tout ca|${SITE}|(?:ces|les) ${TEXTS}|(?:ce|le) programme|(?:l )?avenir en commun)\\b`,
  ),
  new RegExp(`\\b(?:a|ont) (?:ecrit|redige|relu|verifie) (?:ces|les) ${TEXTS}\\b`),
  new RegExp(`\\bqui (?:ecrit|redige|verifie|relit) (?:ces|les) ${TEXTS}\\b`),
  /^qui (?:a |ont )?(?:relu|verifie|ecrit|redige|repond|relit|cree|programme)(?: ici| ca| tout ca)?$/,
  new RegExp(
    `\\b(?:ces|les|vos|tes) ${TEXTS} (?:[a-z]+ ){0,3}(?:ecrites?|redigees?|relues?|verifiees?|generees?|fiables?|vraies?|justes?|fausses?|exactes?|correctes?|sures?)\\b`,
  ),
  new RegExp(
    `^(?:est ce (?:que |qu )?)?(?:(?:c )?est )?${WHO}(?: qui (?:repond|parle|ecrit|a ecrit))?$`,
  ),
  /\b(?:d )?ou (?:viennent|sortent) (?:ces|les|vos|tes) (?:reponses|phrases|textes|explications|infos|informations)\b/,
  /\b(?:d )?ou (?:tu|vous) (?:sors|sortez|tires|tirez|prends|prenez) (?:tes|vos|ces|ca)\b/,
  /^(?:vos|tes|les|quelles) sources$/,
  /^(?:c )?est source$/,
  /\bquelle ia\b/,
  // who are you, who is behind, whose is it
  /\b(?:qui es tu|qui etes vous|tu es qui|vous etes qui|on parle a qui|je parle a qui)\b/,
  /^es qui\b/,
  new RegExp(`\\bqui (?:est|se cache) derriere(?: ca| tout ca| ${SITE})?$`),
  /^est qui derriere\b/,
  /\b(?:comment tu (?:t )?appelles|comment vous (?:vous )?appelez|(?:quel est )?(?:ton|votre) (?:nom|parti|createur|but|role|modele))\b/,
  /^(?:tu|vous) (?:es|etes|as|avez) (?:de |d )?(?:quel|un|une) parti\b/,
  /\b(?:le site|l appli|ce truc|ca) appartient a qui\b/,
  /\bqui gere (?:ca|tout ca|ce truc|le site|l appli)\b/,
  /^(?:vous etes|etes vous) (?:une association|un parti|combien|nombreux|une entreprise|un media)$/,
  /\bqui est baoleka\b/,
  /^(?:c )?est un site (?:de|du|des|d) /,
  // an AI, a robot, a person
  new RegExp(
    `(?:^|\\b)${YOU}(?: [a-z]+)? (?:une ia|un robot|un bot|un chatbot|une machine|un humain|humain|une vraie personne|chatgpt)\\b`,
  ),
  /\b(?:chatgpt|chat gpt)\b/,
  new RegExp(`\\b${SITE} est (?:[a-z]+ )?(?:une ia|un robot|un chatbot)\\b`),
  // official, the real programme, reliable, free — as the whole question, or of the site by name
  /^(?:est ce que |est ce )?(?:c )?(?:est )?(?:bien |vraiment )?officiel$/,
  /^(?:est ce que |est ce )?(?:(?:c )?est )?(?:bien |vraiment )?(?:le |un )?(?:vrai |veritable )?(?:programme|site) officiel$/,
  /^(?:est ce que |est ce )?(?:c )?est (?:bien |vraiment )?le (?:vrai|veritable) (?:programme|site)(?: de [a-z ]+)?$/,
  /^(?:c )?est le programme de (?:qui|lfi|mel[ae]nchon|la france insoumise|jlm)$/,
  new RegExp(`\\b${SITE} (?:est (?:il |elle )?)?(?:[a-z]+ )?officiel(?:le)?\\b`),
  /\b(?:site|appli|application|page|compte) officiel(?:le)?\b/,
  new RegExp(
    `\\b${SITE} est (?:il |elle )?(?:[a-z]+ )?(?:fiable|serieux|neutre|objectif|partisan|independant|gratuit)\\b`,
  ),
  /^(?:est ce que |est ce )?(?:c )?est (?:fiable|gratuit|serieux|neutre|objectif|payant)$/,
  /\bpourquoi (?:je|on) (?:te|vous) (?:ferais?|ferait|croirais?|croirait)\b/,
  // paid by, working for, on whose side
  new RegExp(
    `(?:^|\\b)(?:${YOU}|${SITE} est)(?: [a-z]+)? (?:paye|payes|payee|payees|finance|finances|financee|financees|sponsorise|sponsorises) (?:par|combien)\\b`,
  ),
  /\bqui (?:vous|te) (?:paie|paye|finance|sponsorise)\b/,
  /\bqui finance (?:ca|tout ca|ce truc)\b/,
  /\bcombien (?:vous etes|etes vous|tu es|es tu) paye/,
  /\b(?:tu|vous) (?:roule[sz]?|bosse[sz]?|travaille[sz]?) pour (?:qui|lfi|mel[ae]nchon|la france insoumise|les insoumis|un parti|le parti)\b/,
  new RegExp(
    `^${YOU} (?:de |des |un |une |d )?(?:lfi|la france insoumise|insoumis|insoumise|militants?|militantes?|neutres?|objectifs?|objective|partisans?|independants?|de gauche|serieux|fiables?|benevoles?)$`,
  ),
  // what the site keeps — what is typed HERE, asked of the site: « vous gardez les APL ? » is
  // a question about the programme, and so is « où vont nos données de santé ? »
  /\b(?:vous|tu|on) (?:gardez|gardes|garde|enregistrez|enregistres|enregistre|stockez|stockes|stocke|collectez|collectes|collecte|conservez|conserves|conserve|vendez|vends|lisez|lis) (?:(?:mes|nos) (?:donnees|questions|recherches|messages|infos|informations)|ce que (?:je|j|on) (?:tape|ecris|ecrit|demande|cherche))(?! de)\b/,
  /\b(?:mes|nos) (?:questions|recherches|messages) (?:sont|seront|restent) (?:elles )?(?:[a-z]+ )?(?:enregistre[a-z]*|garde[a-z]*|stocke[a-z]*|conserve[a-z]*|lu[a-z]*|envoye[a-z]*|vendu[a-z]*)\b/,
  /\bou (?:vont|partent) mes (?:donnees|questions|recherches|messages)$/,
  /\b(?:les autres|d autres) (?:personnes|gens|visiteurs|utilisateurs) (?:[a-z]+ ){0,3}(?:demande|demandent|cherche|cherchent|tape|tapent|pose|posent)\b/,
  // how it works, what it is for, why it does not answer
  /^comment (?:ca|tu|vous) (?:marche[sz]?|fonctionne[sz]?)$/,
  new RegExp(`\\bcomment (?:marche|fonctionne) ${SITE}\\b`),
  new RegExp(`\\bcomment ${SITE} (?:marche|fonctionne)\\b`),
  /^(?:tu|vous|ca) (?:sers?|servez|sert) a quoi$/,
  /^(?:pourquoi )?(?:tu|vous) (?:ne )?(?:reponds|repondez|comprends|comprenez) (?:pas|jamais|rien)\b/,
  /^(?:tu|vous) (?:comprends|comprenez) (?:ce que|quand)\b/,
  /^(?:reponds|repondez)(?: moi| nous)?$/,
  /^(?:tu|vous) (?:mens|mentez|dis (?:n )?importe quoi|dites (?:n )?importe quoi|racontes? (?:des conneries|(?:n )?importe quoi)|racontez (?:des conneries|(?:n )?importe quoi))$/,
  /^(?:peux tu|tu peux|pouvez vous|vous pouvez) (?:m |nous )?aider$/,
  /^allo$/,
];
/**
 * Who answers, who wrote, who re-read — asked in a few words, and with nothing after it but
 * the sentences themselves: « un humain derrière les guichets ? » is a question about the book.
 */
const SHORT_QUESTION = 8;
const SHORT_ABOUT: readonly RegExp[] = [
  new RegExp(
    `^(?:est ce (?:que |qu ))?(?:(?:c )?est |il y a |y a )?${WHO} (?:qui )?(?:repond|ecrit|a ecrit|a relu|a verifie|relit|verifie)(?: (?:ces|les|a mes|a nos|aux|mes|nos) (?:reponses|phrases|textes|explications|questions))?(?: ici)?$`,
  ),
  new RegExp(
    `^(?:est ce (?:que |qu ))?(?:il y a |y a )?${WHO} derriere(?: ca| tout ca| (?:ce|le) site)?$`,
  ),
  new RegExp(`\\b(?:relu|verifie|ecrit|ecrites?|relues?|verifiees?) par ${WHO}$`),
];

/**
 * True when the question is about the site itself: it is answered on the phone, with what the
 * site says of itself — and with no measure next to it.
 */
export function asksAboutSite(question: string): boolean {
  const tokens = tokenize(question);
  const folded = tokens.join(' ');
  if (ABOUT_SITE.some((pattern) => pattern.test(folded))) return true;
  return tokens.length <= SHORT_QUESTION && SHORT_ABOUT.some((pattern) => pattern.test(folded));
}
