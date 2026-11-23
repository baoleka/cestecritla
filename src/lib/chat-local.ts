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
import {
  fillerOnly,
  processTerm,
  sameWord,
  spelled,
  stem,
  terms,
  tokenize,
} from './search-core.js';

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
  /** The same, with the words the search added to the question — its synonyms. */
  via?: readonly string[];
  /**
   * The words of the measure that the question itself wrote — not those its synonyms found:
   * what the measure is about, as far as the words typed go.
   */
  on?: readonly string[];
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
 *
 * Every person the index of the book holds is here — « la loi Kasbarian », « la taxe Zucman »
 * (read on 15/11/2026, with the whole vocabulary: data/2026/sensitive.json): a name the book
 * writes is a word the search knows, and nothing else would see it. The law that carries the
 * name stays the law's (`LABEL`).
 */
const PERSON_OWN = '(?:(?:jean luc )?mel[ae]n(?:ch|c|sh)i?on[a-z]*|meluche|jlm)';
const PARTY_OWN =
  '(?:la france insoumise|france insoumise|lfi|les insoumis|les insoumises|insoumis|insoumise|insoumises)';
const PERSON_OTHER =
  '(?:macron(?:ie|istes?|iens?|iennes?)?|marine le pen|le pen|lepen|bardella|zemmour|retailleau|attal|darmanin|hollande|sarkozy|glucksmann|ruffin|roussel|tondelier|faure|bompard|panot|autain|ciotti|wauquiez|bayrou|barnier|lecornu|trump|poutine|netanyahou|netanyahu|bollore|kasbarian|el khomri|khomri|penicaud|fioraso|cazeneuve|zucman|carle)';
const PARTY_OTHER =
  '(?:le rassemblement national|rassemblement national|rn|fn|front national|le parti socialiste|parti socialiste|ps|lr|les republicains|eelv|pcf|parti communiste|nfp|(?:le )?nouveau front populaire|front populaire|nupes|modem|reconquete|lrem|ump|udi|npa|lutte ouvriere|les verts)';
const PERSON = `(?:${PERSON_OWN}|${PERSON_OTHER})`;
const NAMED = `(?:${PERSON}|${PARTY_OWN}|${PARTY_OTHER})`;

/**
 * The words of a question as the rules read them: as the index folds them, and with letters
 * typed apart put back together (`spelled`, src/lib/search-core.ts) — a name written « L.F.I. »
 * or « m e l e n c h o n » is a name.
 */
const wordsOf = spelled;
const fold = (question: string): string => wordsOf(question).join(' ');

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

/**
 * « Si je vote X, mes impôts baissent ? »: a condition, and a question about the programme. And
 * « on me traite de… parce que je vote X » says how one votes: it asks nobody whom to vote for.
 */
const IF_I_VOTE =
  /\b(?:si|parce que|car|puisque|comme|vu que|quand) (?:je|on|tu|nous|vous|les gens) (?:[a-z]+ )?vot(?:e|es|ons|ez|ent)\b/;

/** True when the question asks for voting advice or a forecast: it is answered on the phone. */
export function asksForVote(question: string): boolean {
  const folded = fold(question);
  return !IF_I_VOTE.test(folded) && VOTE_ADVICE.some((pattern) => pattern.test(folded));
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
  '(?:antisemites?|racistes?|islamophobes?|islamo ?gauchistes?|islamistes?|dictateurs?|fachos?|fascistes?|nazis?|neo ?nazis?|extremistes?|populistes?|complotistes?|menteurs?|menteuse|voleurs?|corrompus?|corrompue|traitres?|poutinistes?|pro ?russes?|pro ?iran|pro ?hamas|chavistes?|communistes?|staliniens?|gourou|secte|sectaires?|terroristes?|wokistes?|woke|gauchistes?|fou|folle|dingue|cingle|violente?s?|sexistes?|misogynes?|homophobes?|transphobes?|pedophiles?|violeurs?|escrocs?|voyous?|delinquants?|dealers?|fraudeurs?|hypocrites?|demagogues?|demago|manipulateurs?|incompetente?s?|ridicules?|haineux|haineuse|dangereux|dangereuse|autoritaires?|coleriques?|communautaristes?|antisionistes?|complices?|anti ?france|ultra ?gauche|staline|hitler|mussolini|robespierre|lenine|khmers? rouges?|rouge brun|delirant|laxistes?|vendus?|laches?|tricheurs?)';
/** A subject thrown as a charge — next to a name only: alone, « corruption » is a subject of the book. */
const CHARGE_NOUN = '(?:corruption|mensonges?|delire)';
/** Between a name and what is thrown at it: « est », « un », « des » — never a word of its own. */
const GLUE =
  '(?:est|sont|etait|serait|c|un|une|des|le|la|les|l|tres|trop|vraiment|si|aussi|plutot|encore|toujours|donc|qu|que|il|elle|ils|elles|bien|tous|toutes|comme|vrai|vraie|gros|sale|grand|pur|tellement|completement|totalement|devenu|devenue|parait|semble|a|ont|ete)';
const CHARGED: readonly RegExp[] = [
  new RegExp(`\\b${NAMED}(?: ${GLUE}){0,4} (?:${EPITHET}|${CHARGE_NOUN})\\b`),
  new RegExp(
    `\\b(?:${EPITHET}|${CHARGE_NOUN}) (?:de |d |du |des )?(?:la |le |les |l )?${NAMED}\\b`,
  ),
];
/** What is asked of a person and is nobody's programme: money, health, the courts, bad company. */
/**
 * What is said OF a person — « la fortune de X », « perquisition chez X », « X et l'affaire »,
 * « X a 75 ans », « X soutient… »: read as typed, whatever labels the name elsewhere in the
 * question (« les taxes et le salaire de Macron » is about the man: independent review of
 * D21.7, 23/11/2026).
 */
const PERSONAL_OF: readonly RegExp[] = [
  new RegExp(
    `\\b(?:patrimoine|fortune|salaire|casier|sante|vie privee|proces|perquisitions?|comptes?|appartement|maison|argent) (?:judiciaire )?(?:de |d |du |des )(?:la |le |les |l )?${PERSON}\\b`,
  ),
  new RegExp(`\\bperquisition[a-z]* (?:chez |de |d )?${NAMED}\\b`),
  new RegExp(`\\b${NAMED} (?:et )?(?:l )?affaires?\\b`),
  new RegExp(`\\b${PERSON} a (?:t il |t elle )?(?:\\d+ ans|quel age)\\b`),
  new RegExp(
    `\\b${NAMED} (?:[a-z]+ )?(?:soutient|soutiennent|a soutenu|ont soutenu|cautionne|cautionnent|finance par|financee? par|aime|adore|hait|deteste) (?:le |la |les |l |par )?(?:hamas|hezbollah|poutine|russie|iran|chavez|maduro|qatar|algerie|casseurs|emeutiers|emeutes|terroris[a-z]*|islamis[a-z]*|freres musulmans|dictat[a-z]*|juifs|musulmans|arabes|france)\\b`,
  ),
];
/**
 * What is said AFTER a name — « X doit partir », « X mort », « X évasion fiscale »: a law that
 * bears the name takes these words too, and they are then the law's (D21.7) — see `LAW_LABEL`.
 */
const PERSONAL_AFTER: readonly RegExp[] = [
  new RegExp(
    `\\b${PERSON}(?: ${GLUE}){0,3} (?:casier|perquisition[a-z]*|proces|mis en examen|mise en examen|garde a vue|condamne[a-z]*|comptes? en suisse|evade fiscal|evasion fiscale|fraude fiscale|demission[a-z]*|degage|dehors|mort|morte|malade|vieux|vieille|fatigue|fatiguee|riche|millionnaire)\\b`,
  ),
  new RegExp(
    `\\b${PERSON} (?:va |doit |devrait )?(?:mourir|prendre sa retraite|demissionner|partir|se taire)\\b`,
  ),
];
/** A name that labels a text of law — « la réforme Macron », « la loi immigration de Darmanin » — is the law's. */
const LABELS =
  '(?:(?:contre )?reformes?|lois?|circulaires?|ordonnances?|decrets?|taxes?|plans?|pactes?|gouvernements?|quinquennats?|annees|politiques?)';
const LABEL = new RegExp(
  `\\b(${LABELS})(?: [a-z0-9]+){0,3}? (?:de |d |du |des )?(?:la |le |les |l )?${PERSON_OTHER}\\b`,
  'g',
);
/**
 * A law that bears a name, the name right after its label — « la taxe Zucman », « la loi
 * Kasbarian », « la réforme Macron », « le décret de Darmanin »: what is said after it may be
 * the law's (D21.7). Narrower than `LABEL`: no word between label and name, and none of
 * « politique », « gouvernement », « quinquennat », « années », « plan » — a person's record is
 * the person's (« la politique de Macron malade »: independent review, 23/11/2026).
 */
const LAW_LABEL = new RegExp(
  `\\b((?:contre )?reformes?|lois?|circulaires?|ordonnances?|decrets?|taxes?|pactes?) (?:(?:de |d |du |des )(?:la |le |les |l )?)?${PERSON_OTHER}\\b`,
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
  const folded = fold(question);
  if (INSULT.some((pattern) => pattern.test(folded))) return true;
  if (!ANY_NAMED.test(folded)) return false;
  if ([...CHARGED, ...JUDGED, ...PERSONAL_OF].some((pattern) => pattern.test(folded))) return true;
  // What is said after a name — leaving, dying, a fortune hidden abroad — belongs to a person,
  // never to a law: « Taxe Zucman : partir ou payer ? » asks about the tax (D21.7, 23/11/2026).
  // A law's name, right after its label, is folded into the law first; the person named apart
  // stays a person (« la taxe Zucman, Zucman doit partir »).
  const asLaw = folded.replace(LAW_LABEL, '$1');
  if (PERSONAL_AFTER.some((pattern) => pattern.test(asLaw))) return true;
  const left = folded.replace(LABEL, '$1');
  // Two persons set side by side and nothing else — « X ou Y ? », « X aime Y ? ». With a
  // subject next to them (« Mélenchon et Trump : les droits de douane ») it is a search.
  const persons = new Set((left.match(EACH_PERSON) ?? []).map(personOf));
  if (persons.size < 2 || BOOK.test(left)) return false;
  const rest = left
    .replace(EACH_PERSON, ' ')
    .split(' ')
    .filter(
      (word) =>
        /^\d+$/.test(word) ||
        (word.length >= 3 && processTerm(word) !== null && !BETWEEN.has(word)),
    );
  return rest.length <= 1;
}

/**
 * True when the question names a politician or a party of the list — and not merely the law
 * that carries a name. Such a question is searched like any other, and shown as LINKS: see
 * `measuresFor`.
 */
export function namesSomeone(question: string): boolean {
  const folded = fold(question).replace(LABEL, '$1');
  return ANY_NAMED.test(folded) || BARE_NAME.test(folded);
}

/**
 * Names that are also words of the book, or one letter from one — « Marine », « Portes »,
 * « Borne », « François », « Manuel ». Taken for the person when no article stands before
 * them: « marine inéligible », « le racisme de marine », « borne et la retraite »; « la
 * marine nationale », « des portes », « une borne de recharge », « les manuels » stay words. Not « Trouvé »: « je trouve… » is in every
 * other question.
 */
const BARE_NAME =
  /(?:^|\b(?!(?:la|le|les|une|un|des|du|sa|ses|notre|nos|leur|leurs|cette|ces|aux|mes|tes|vos|quelles) )[a-z0-9]+ )(?:marine|portes|borne|francois|manuel|emmanuel)\b/;

/**
 * Words that point at a person without naming them: a title in the singular with what makes
 * it one person (« le candidat », « leur chef », « la présidente du groupe »), a nickname
 * (« papy », « le boss »). A charge needs no more to find its target, and it needs no epithet
 * either: « l'antisémitisme du candidat » is made of two words of the book (fifth review of
 * 15/11/2026). The plural and the indefinite stay subjects of the book: « les députés », « un
 * président », « des maires », « combien gagne un député ? », « plus de président ? ».
 *
 * A title of politics needs no article either: « candidat antisémitisme », « l'ancien
 * ministre », « député salaire » are how one types into a search box (sixth review). And one
 * sentence is his alone. « Mon patron », « ma cheffe » are the asker's own, and no politician.
 */
const SOMEONE: readonly RegExp[] = [
  /\b(?:le|la|l|leur|ce|cet|cette|son|sa|notre|votre|du|au) (?:(?:grand|grande|vieux|vieille|petit|petite|premier|premiere|cher|chere|fameux|soi disant) )?(?:chef|cheffe|patron|patronne|elue?|dirigeante?|fondateur|fondatrice|secretaire generale?|type|mec|gars|bonhomme|vieux|vieille|boss)\b/,
  /(?:^|\b(?!(?:un|une|chaque|tout|toute|aucun|aucune|quel|quelle|de|d|sans|comme|par|ni) )[a-z0-9]+ )(?:candidate?|presidente?|ministre|maire|deputee?|senateur|senatrice|eurodeputee?|leader|tribun|gourou|porte parole)\b/,
  /\b(?:papy|papi|pepe|mec|boss)\b/,
  /\brepublique (?:c )?est moi\b/,
];

/** True when the question points at one person by a title or a nickname. */
export function refersToSomeone(question: string): boolean {
  const folded = fold(question);
  return SOMEONE.some((pattern) => pattern.test(folded));
}

/**
 * Before an epithet, what makes it the subject of a measure and not a charge: « les actes
 * antisémites », « contre les groupes extrémistes violents ».
 */
const AS_SUBJECT = new RegExp(
  `\\b(?:actes?|agressions?|violences?|propos|haines?|discriminations?|crimes?|delits?|insultes?|injures?|attaques?|menaces?|theories?|groupes?|groupuscules?|discours|ideologies?|contenus?|regimes?|controles?|policiers?|elus?|dirigeants?|militants?|patrons?|entreprises?|employeurs?|pratiques?|comportements?|derives?|contre|lutte|lutter|combattre|face) (?:(?:les|le|la|l|des|aux|au|d|ces|toutes|tous) ){0,2}(?:${EPITHET}(?: et| ou)? ?){1,3}`,
  'g',
);
const ANY_EPITHET = new RegExp(`\\b${EPITHET}\\b`);

/**
 * True when the question throws an epithet at someone — named or not: « leur chef est
 * antisémite », « ce parti, des fachos », « ils sont racistes ». Not when the epithet is the
 * subject of a measure (« les actes antisémites »). Such a question gets links.
 */
export function putsOnTrial(question: string): boolean {
  return ANY_EPITHET.test(fold(question).replace(AS_SUBJECT, ' '));
}

/** A number, and how one is written with its unit: « 60 », « 32h », « 6eme », « 60ans », « 1700€ ». */
const NUMBER = /^\d+(?:h|e|er|ere|eme|ème|k|m|ans?|%|€)?$/;

/**
 * The words of a question that the search does not know: they found no measure at all, and
 * `known` — the synonyms of the search, the ordinary words a question is made of (« virer »,
 * « phrase », « Lyon » : data/2026/ordinary.json) — does not vouch for them. Whatever their
 * case: on a phone a name is typed « obono » as often as « Obono ».
 *
 * A name is such a word. So is a word of another subject, a typo beyond repair, an ordinary
 * word the list does not hold yet — and that is the point of an allow-list: what it misses
 * costs links where sentences could have been, never a sentence where none should be.
 */
export function strangersIn(
  question: string,
  hits: readonly Ranked[],
  known: (typed: string, term: string) => boolean = () => false,
): string[] {
  const found = new Set(hits.flatMap((hit) => hit.by ?? []));
  // As `spelled` reads it: a letter in another form of itself is the letter.
  const read = question.normalize('NFKC');
  // Letters typed apart make one word, which the search never saw: « M.L.P. », « l f i ».
  const apart = wordsOf(read).filter((word) => !tokenize(read).includes(word));
  return [...[...read.matchAll(/[\p{L}\p{N}]+/gu)].map((match) => match[0]), ...apart].filter(
    (typed) => {
      const term = processTerm(tokenize(typed)[0] ?? '');
      if (term === null || NUMBER.test(typed) || typed.length < 3) return false;
      return !found.has(term) && !fillerOnly([term]) && !known(typed, term);
    },
  );
}

/**
 * What the files of the sheet know of words — data, fetched with its texts
 * (src/lib/chat-data.ts): data/2026/ordinary.json, data/2026/sensitive.json, and the synonyms
 * of the search.
 */
export interface Lexicon {
  /** A neutral word — « virer », « demain », « Lyon »: it vouches for itself in any question. */
  neutral: (term: string) => boolean;
  /**
   * People and proper names that are no politician — « fille », « voisins », « Amazon »: they
   * vouch for themselves in an ordinary question, never next to a sensitive subject.
   */
  people: (term: string) => boolean;
  /** The other words the search reads this one as — its synonyms —, as the index cuts them. */
  alias: (typed: string) => readonly string[];
  /** A term of a sensitive subject: a charge, as soon as someone stands next to it. */
  sensitive: (term: string) => boolean;
  /**
   * A softer subject — a country one lends allegiances to, a fortune: a charge only when
   * somebody is pointed at (« celui qui… et la Russie », « le patrimoine du candidat »).
   */
  soft: (term: string) => boolean;
  /**
   * A sensitive subject the line under the links may give as the example to ask alone:
   * « antisémitisme », « fraude » — never a religion or an origin, never a judgment.
   */
  askable: (term: string) => boolean;
  /** A title, a role, a party word in the singular, with or without its article (`roles`). */
  role: RegExp;
  /** People the search drops as small words — « monsieur », « voisin » — and who are somebody. */
  somebody: (word: string) => boolean;
  /** « Cette personne », « ces gens-là »: somebody, pointed at with a finger (`pointed`). */
  pointed: RegExp;
  /** The asker's own people — « mon patron », « ma voisine »: nobody's target (`own`). */
  mine: RegExp;
  /** « Son parti », « ses amis », « votre candidat » — not « leur programme » (`ours`). */
  theirs: RegExp;
  /**
   * What asks the book, with its « ils », its « vous », its « tu » — « ils proposent quoi… »,
   * « est-ce qu'il y a… », « vous avez prévu quoi… » (`asking`): the way a question is put
   * here, and no way of pointing at anybody.
   */
  asks: RegExp;
  /**
   * A name that is a verb of every other question — « Trouvé » —, taken for the person where
   * nothing makes it the verb: « trouvé et la drogue », not « on trouve de la drogue »
   * (`verbal`: what stands before the verb).
   */
  nameOrVerb: RegExp;
  /** A face of every day: what the asker feels, the one kind of sign that is no target. */
  feeling: (sign: string) => boolean;
  /** People named by their religion, their origin, whom they love (`peoples`). */
  kin: (term: string) => boolean;
  /**
   * The subject to ask in place of a coded phrase or a slur the question, cut to its stems,
   * holds (`tropes`): « racisme », « antisémitisme »… — `''` when there is none to give,
   * `null` when the question holds no such phrase.
   */
  trope: (stems: string) => string | null;
  /** What one says of a people or a country to charge it: « contrôle », « envahit ». */
  said: (term: string) => boolean;
  /** The verb of a bare hateful statement: « les X volent ». */
  crime: (word: string) => boolean;
  /** What such a statement says of a people after « sont », beyond the epithets. */
  insult: (word: string) => boolean;
}

/** The lists, as the file of the sheet holds them (src/lib/word-lists.ts). */
export interface WordLists {
  /** data/2026/ordinary.json, `words` — as the index cuts them. */
  neutral: readonly string[];
  /** data/2026/ordinary.json, `people` — as the index cuts them. */
  people: readonly string[];
  /** data/2026/sensitive.json, `groups` — stems; « * » at the end: every word that starts so. */
  sensitive: readonly string[];
  /** data/2026/sensitive.json, `soft` — the same way. */
  soft: readonly string[];
  /** The stems of the groups data/2026/sensitive.json says may be given as an example. */
  askable: readonly string[];
  /** data/2026/sensitive.json, `pointing`: words as the index folds them. */
  roles: readonly string[];
  somebody: readonly string[];
  pointed: readonly string[];
  own: readonly string[];
  ours: readonly string[];
  verbal: readonly string[];
  /** The verbs that ask what the book says, as one alternation of a pattern. */
  asking: string;
  /** The faces of every day, one after the other. */
  feelings: string;
  /** data/2026/sensitive.json, `peoples` — stems, « * » as above. */
  peoples: readonly string[];
  /** data/2026/sensitive.json, `tropes` — each phrase cut to its stems, with its subject. */
  tropes: readonly (readonly [string, string])[];
  /** data/2026/sensitive.json, `predicates` — stems, « * » as above. */
  predicates: readonly string[];
  /** data/2026/sensitive.json, `crimes` and `insults` — words as the index folds them. */
  crimes: readonly string[];
  insults: readonly string[];
}

/** Before a title, what makes it anybody's: « un député », « plus de président ». */
const ANY_ONE =
  '(?:^|\\b(?!(?:un|une|chaque|tout|toute|aucun|aucune|quel|quelle|de|d|sans|comme|par|ni) )[a-z0-9]+ )';

/** The lexicon these lists make, with the synonyms of the search. */
export function lexiconOf(lists: WordLists, alias: (typed: string) => readonly string[]): Lexicon {
  const neutral = new Set(lists.neutral);
  const people = new Set(lists.people);
  const among = (entries: readonly string[]): ((term: string) => boolean) => {
    const whole = new Set(entries.filter((entry) => !entry.endsWith('*')));
    const starts = entries
      .filter((entry) => entry.endsWith('*'))
      .map((entry) => entry.slice(0, -1));
    return (term) => whole.has(term) || starts.some((start) => term.startsWith(start));
  };
  return {
    neutral: (term) => neutral.has(term),
    people: (term) => people.has(term),
    alias,
    sensitive: among(lists.sensitive),
    soft: among(lists.soft),
    askable: among(lists.askable),
    role: new RegExp(`${ANY_ONE}(?:${lists.roles.join('|')})\\b`),
    somebody: (word) => lists.somebody.includes(word),
    pointed: new RegExp(`\\b(?:ce|cet|cette|ces) (?:${lists.pointed.join('|')})\\b`),
    mine: new RegExp(`\\b(?:mon|ma|mes) (?:${lists.own.join('|')})\\b`, 'g'),
    theirs: new RegExp(
      `\\b(?:son|sa|ses|leurs?|votre|vos|ton|ta|tes) (?!(?:${lists.ours.join('|')})\\b)`,
    ),
    asks: new RegExp(
      `\\b(?:ils?|elles?|vous|tu) (?:(?:ne|n|y|en|nous|me|m) ){0,2}${lists.asking}\\b|\\b(?:${lists.asking}|(?:que|qu) (?:font|fait|faites|fais)) (?:t )?(?:ils?|elles?|vous|tu)\\b|\\b(?:il y a|y a t il|il faut|faut il|il faudra|il faudrait|il (?:vous|te) plait|en est il|est il (?:possible|prevu|vrai|question)|il est (?:possible|prevu|vrai|question)|existe t il|pouvez vous|peux tu)\\b`,
      'g',
    ),
    nameOrVerb: new RegExp(`(?:^|\\b(?!(?:${lists.verbal.join('|')}) )[a-z0-9]+ )trouve\\b`),
    feeling: (sign) => lists.feelings.includes(sign),
    kin: among(lists.peoples),
    trope: (stems) =>
      lists.tropes.find(([phrase]) => ` ${stems} `.includes(` ${phrase} `))?.[1] ?? null,
    said: among(lists.predicates),
    crime: (word) => lists.crimes.includes(word),
    insult: (word) => lists.insults.includes(word),
  };
}

/** Somebody pointed at without a name: « lui », « eux », « celui qui… », « ils » and « vous ». */
const POINTS = /\b(?:ils?|elles?|vous|tu|lui|eux|celui|celle|ceux|celles)\b/;
/** Whom one works for: no word of the book, and the asker's own (« mon chef me harcèle »). */
const OWN_BOSS = /^(?:patron|patronne|chef|cheffe|boss)$/;
/** True when the question, or what it found, holds what `is` says — a sensitive subject. */
function holds(question: string, shown: readonly Ranked[], is: (term: string) => boolean): boolean {
  return (
    wordsOf(question).some((word) => is(stem(word))) || shown.some((hit) => (hit.on ?? []).some(is))
  );
}

/**
 * How a question that holds a sensitive subject is answered: with the measures that hold the
 * subject (`rows`), or with links — and `beside` is the word, or the way of pointing at
 * somebody, that keeps the subject from being asked alone.
 */
export type Alone = { rows: string[] } | { beside: string };

/**
 * A sensitive subject asked ALONE, or not.
 *
 * Alone means three things.
 *   - Nothing points at anyone: no title, no party word, no « lui », « ils », « celui qui… »,
 *     no « son », « leur », « votre », nobody of the small words (« ce monsieur », « cette
 *     personne »).
 *   - Measures hold the subject — every sensitive word of the question, in one measure:
 *     « violences faites aux femmes » is one subject of the book; « les Roms et la
 *     délinquance » is two, and a sentence under them would marry them. THOSE measures are the
 *     ones shown: « harcèlement au travail » gets the measures on harassment, not the three
 *     best on work.
 *   - Every other word of sense is written in one of the measures shown — the measures that
 *     hold most of them come first. A target cannot give that: « les entreprises et
 *     l'antisémitisme », « sa femme et la fraude ».
 * The words that ask (« que prévoit le programme contre… »), the neutral words of the list
 * (« travail », « Lyon », « interdire ») and the asker's own people (« mon patron », « ma
 * fille ») stand outside the count; a sensitive word never does.
 *
 * Why so much is asked: the ways of pointing at someone are a list that never closes —
 * « candidat », « ce parti », « l'ancien ministre », « celui qui a dit… », « sa femme »,
 * « lui ». What is asked of each word is what a target cannot give.
 *
 * A softer subject — a country, a fortune (« Ukraine OTAN », « taxer les milliardaires »,
 * « comme en URSS ? ») — is a charge only when somebody is pointed at: nothing may point, and
 * nobody but the asker's own people may stand in the question; the measures are then the
 * ones the search ranks best. « Celui qui… et la Russie », « son parti et le Qatar », « sa
 * femme et sa fortune » get links; a slogan that names nobody does not.
 */
export function aloneIn(
  question: string,
  hits: readonly Ranked[],
  knows: (id: string) => boolean,
  lexicon: Lexicon,
): Alone {
  const folded = fold(question).replace(lexicon.mine, ' ');
  const title = (lexicon.role.exec(folded) ?? lexicon.nameOrVerb.exec(folded))?.[0];
  if (title !== undefined) return { beside: title.trim().split(' ').pop() ?? '' };
  // « Ils proposent quoi… », « vous avez prévu quoi… », « est-ce qu'il y a… » ask the book:
  // neither their pronoun points at anyone, nor their verb is a word of the subject.
  const asking = folded.replace(lexicon.asks, ' ');
  const pointed = (POINTS.exec(asking) ??
    lexicon.theirs.exec(folded) ??
    lexicon.pointed.exec(folded))?.[0];
  if (pointed !== undefined) return { beside: pointed.trim() };
  const words = asking.split(' ').filter((word) => word !== '');
  const somebody = words.find((word) => lexicon.somebody(word));
  if (somebody !== undefined) return { beside: somebody };
  const core = words.filter((word, at) => {
    const term = processTerm(word);
    if (term === null) return false;
    // A year is a word of the subject: « la fraude de 2012 », « les comptes de 2017 ».
    if (NUMBER.test(word)) return /^(?:19|20)\d\d$/.test(word);
    if (lexicon.sensitive(term) || lexicon.soft(term)) return true;
    if (fillerOnly([term]) || lexicon.neutral(term)) return false;
    return !(lexicon.people(term) && /^(?:mon|ma|mes)$/.test(words[at - 1] ?? ''));
  });
  const marked = (term: string): boolean => lexicon.sensitive(term) || lexicon.soft(term);
  const hard = core.filter((word) => lexicon.sensitive(stem(word)));
  // A measure holds a word that led to it as written — or, for the subject itself, through a
  // synonym that is the same kind of subject: « prison » is « détention » in the book, and
  // « Russie » is written « russe ». Not through any synonym: the words a group adds
  // (« publique », « droit ») are in every measure.
  const has = (hit: Ranked, word: string): boolean =>
    (hit.by ?? []).includes(stem(word)) ||
    (marked(stem(word)) &&
      lexicon.alias(word).some((alias) => marked(alias) && (hit.via ?? []).includes(alias)));
  if (hard.length === 0) {
    // A softer subject and no other: what the search ranks best — once nothing points at
    // anyone, and nobody but the asker's own people stands in the question.
    const somebodyElse = core.find(
      (word) => !lexicon.soft(stem(word)) && lexicon.people(stem(word)),
    );
    return somebodyElse === undefined ? { rows: rowsOf(hits, knows) } : { beside: somebodyElse };
  }
  // The measures of the subject: all of it in one measure.
  const about = hits.filter((hit) => hard.every((word) => has(hit, word)));
  if (about.length === 0) {
    // No measure holds it whole: the word the best one lacks.
    const lacking = hits
      .map((hit) => hard.filter((word) => !has(hit, word)))
      .sort((one, other) => one.length - other.length)[0];
    return { beside: lacking?.[0] ?? hard[0] ?? '' };
  }
  // Among them, the measures that hold most of the other words come first.
  const others = core.filter((word) => !hard.includes(word));
  const rows = rowsOf(
    about.map((hit) => ({
      ...hit,
      score: hit.score * (1 + others.filter((word) => has(hit, word)).length),
    })),
    knows,
  );
  const shown = about.filter((hit) => rows.includes(hit.id));
  const lacking = others.find((word) => !shown.some((hit) => has(hit, word)));
  return lacking === undefined ? { rows } : { beside: lacking };
}

const MONTH =
  /^(?:janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)$/;
/** What makes a date with a month: a figure, or a number in words. */
const COUNTED =
  /^(?:\d+(?:er|e)?|premier|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente)$/;

/**
 * True when the question holds a date — a number next to a month — that no measure shown
 * holds. The search drops what it does not find, and a day is a number like another: « le 7
 * octobre » found, by its month alone, the measure on 17 October 1961 — and a sentence on a
 * massacre of 1961 under the date of another is the worst screenshot there is (seventh review
 * of 15/11/2026). « Le 17 octobre 1961 » is the date of that measure, and keeps its sentence.
 */
function datesMissed(question: string, shown: readonly Ranked[]): boolean {
  const words = tokenize(question);
  const held = new Set(shown.flatMap((hit) => hit.by ?? []));
  // With a month in the question every number is part of a date, in figures or in words:
  // « le 7 du mois d'octobre », « le sept octobre ».
  const beside = words.some((word) => MONTH.test(word))
    ? words.filter((word) => COUNTED.test(word))
    : [];
  return beside.some((counted) => !held.has(stem(counted)));
}

/**
 * True when the question holds a sign that is no word — a flag, a religious sign, an animal —
 * or a letter of another writing: the search reads neither, and each is a target all the
 * same. « ✡ finance » is made of one word of the book; so is « 卐 finance », whose sign is,
 * for Unicode, a letter. A few faces of every day — what the asker feels — are let through;
 * anything else gets links.
 */
export function pointsWithASign(question: string, lexicon: Lexicon): boolean {
  const read = question.normalize('NFKC');
  return (
    [...read.matchAll(/\p{So}/gu)].some((sign) => !lexicon.feeling(sign[0])) ||
    [...read.matchAll(/\p{L}/gu)].some((letter) => !/\p{Script=Latin}/u.test(letter[0]))
  );
}

const EPITHET_WORD = new RegExp(`^${EPITHET}$`);
const GLUE_WORD = new RegExp(`^${GLUE}$`);
/** What may stand before the people of a bare statement: « tous les… », « la plupart des… ». */
const ALL_OF =
  /^(?:les|le|la|l|des|de|d|tous|toutes|tout|ces|plupart|majorite|beaucoup|trop|mais|et)$/;

/**
 * True when the question is a hateful statement and nothing else — refused like an insult,
 * once the files of the sheet say what is what. The statement is the WHOLE question:
 *   - a people at its head (« les… », « tous les… », « la plupart des… »);
 *   - then « sont (tous) des… » and, as its last word, what is thrown — an epithet, an insult
 *     —, with nothing but small words in between; or, as its last word, a verb of crime
 *     (« les X volent »);
 *   - no comma, no colon, no quotation mark, no question mark, no negation, nothing after.
 *
 * NARROW ON PURPOSE (ninth and tenth reviews of 15/11/2026). The first versions refused
 * whoever REPORTED such a sentence or answered it — « je me suis fait traiter de… », « mon
 * oncle dit que…, que répondre ? », « les X sont-ils des Y ? », « les X sont des Y, c'est
 * faux » — took an adjective for a charge (« les étrangers malades » is the name of a
 * residence permit), and what was done to a people for what is said of it (« les migrants
 * sont traités comme des animaux », eleventh review). A refusal is our own voice turning away
 * the person who asked. Anything
 * that is not the bare statement gets links; and a list never refuses: a coded phrase, a slur
 * get the measures of the subject one may ask in their place, as links (`measuresFor`).
 */
export function hateful(question: string, lexicon: Lexicon): boolean {
  if (/[?,:;«»"“”()]/.test(question)) return false;
  const words = fold(question)
    .replace(AS_SUBJECT, ' ')
    .split(' ')
    .filter((word) => word !== '');
  // Said to be false is not said: « les X ne sont pas des Y ».
  if (words.some((word) => /^(?:ne|n|pas|jamais|non|aucun|aucune|ni)$/.test(word))) return false;
  const at = words.findIndex((word) => lexicon.kin(stem(word)));
  if (at < 0 || !words.slice(0, at).every((word) => ALL_OF.test(word))) return false;
  const after = words.slice(at + 1);
  const last = after[after.length - 1] ?? '';
  const small = (word: string): boolean => GLUE_WORD.test(word) || processTerm(word) === null;
  if (lexicon.crime(last)) return after.slice(0, -1).every(small);
  // « Sont », not « seraient » — what is reported in the conditional is reported —, and not
  // « sont-ils » typed without its question mark.
  const said = after.findIndex((word) => /^(?:est|sont|etait|etaient)$/.test(word));
  return (
    said >= 0 &&
    !/^(?:ils?|elles?|on|ce)$/.test(after[said + 1] ?? '') &&
    (EPITHET_WORD.test(last) || lexicon.insult(last)) &&
    after.slice(0, said).every(small) &&
    // Nothing of its own between « sont » and what is thrown: « sont traités comme des
    // animaux », « étaient considérés comme inférieurs » are what was done to a people.
    after.slice(said + 1, -1).every(small)
  );
}

/**
 * True when a question recognised as one of our objections holds something more than the
 * objection and the words of every day: « La retraite à 60 ans c'est infinançable, comme
 * l'antisémitisme de X » is recognised — it holds the objection whole — and carries a charge
 * our sentences must not stand under. « Mon père dit que… » carries none.
 */
function ridesAlong(question: string, objection: string, lexicon: Lexicon): boolean {
  const own = terms(objection);
  return (
    pointsWithASign(question, lexicon) ||
    wordsOf(question).some((word) => {
      const term = processTerm(word);
      if (term === null || NUMBER.test(word)) return false;
      if (own.some((other) => sameWord(other, term))) return false;
      if (lexicon.sensitive(term) || lexicon.soft(term)) return true;
      return !(
        fillerOnly([term]) ||
        lexicon.neutral(term) ||
        lexicon.people(term) ||
        OWN_BOSS.test(term)
      );
    })
  );
}

/** What a turn shows of the measures: which ones, and with or without our sentences. */
export interface Found {
  rows: string[];
  /** False: the rows are shown as links, and nothing is asked of the base. */
  sentences: boolean;
  /**
   * When the rows are links: a word of the question that found them and that, asked alone,
   * gets sentences — an example to give. Null when the question holds none.
   */
  example: string | null;
  /** True when the question is our objection and nothing more: our written answer stands. */
  reviewed?: true;
  /** True when the question is refused, like an insult: nothing is shown but that sentence. */
  refused?: true;
  /**
   * True when the rows are links and the question names, points at or charges somebody, or
   * holds a sensitive subject: nothing of ours stands above it — neither an answer, nor the
   * card of a word it happens to hold.
   */
  charged?: true;
}

/**
 * The measures a turn shows, and how.
 *
 * A question recognised as one of our fifteen objections gets the measures our written answer
 * rests on (data/2026/riposte.json, `supports`) — the answer and its measures then say one
 * thing; with our sentences when it is the objection and nothing more (`ridesAlong`). The words of an objection find anything: « Ils veulent sortir de l'UE et de l'euro »
 * found, first, a measure on an agreement with Israel (second review of 15/11/2026).
 *
 * Any other question gets what the search ranks best — WITH OUR SENTENCES ONLY WHEN EVERY
 * WORD OF IT IS A WORD THE SEARCH KNOWS, nothing in it names or charges anyone, AND A
 * SENSITIVE SUBJECT, IF IT HOLDS ONE, IS ASKED ALONE. Otherwise the measures are shown as
 * links: nothing is asked of the base, no sentence of ours is shown.
 *
 * Why (six reviews in one night, 15/11/2026). A sentence that says « le programme prévoit… »
 * under « obono antisémite » reads as the site answering for a person: it is the screenshot
 * each review took, in other words each time. Lists of words to refuse were beaten by the
 * next wording, and refused questions about the book. A list of names was beaten by a name
 * that was not on it; a rule on capitals, by a phone's small letters; a list of titles, by a
 * title without its article and by « celui qui a dit… ». What cannot be beaten that way is
 * the reverse, twice:
 *   - a name nobody listed is, by construction, a word the book does not hold — so is
 *     « proprios », and the cost is known and measured (D16.68): links;
 *   - a charge needs a subject to throw, and the subjects one can throw are a CLOSED list —
 *     drawn from the whole vocabulary of the index, not guessed (data/2026/sensitive.json).
 *     Next to one of them, every other word has to have led to the very measures shown
 *     (`aloneIn`, D16.70): « candidat antisémitisme » and « ce parti et la fraude »
 *     hold a word that did not; « que prévoit le programme contre l'antisémitisme ? » and
 *     « violences faites aux femmes » do not.
 *
 * Seven things withhold the sentences, each for what the others cannot see:
 *   - a word the search does not know (`strangersIn`) — any name nobody listed;
 *   - a politician or a party of the list (`namesSomeone`) — names the book itself holds
 *     (« Macron »), parties, nicknames, a few names that are also words (« Marine »);
 *   - a title or a nickname that points at one person (`refersToSomeone`) — « la retraite du
 *     candidat » names nobody and points at somebody;
 *   - an epithet thrown at someone (`putsOnTrial`) — « leur chef est antisémite » is made of
 *     words of the book;
 *   - a sensitive subject that is not asked alone (`aloneIn`);
 *   - a sign that is no word — a flag, a religious sign (`pointsWithASign`);
 *   - a date that is not the date of a measure shown (`datesMissed`).
 *
 * Without the files of the sheet (`lexicon` null: they did not load) nothing says what is
 * sensitive: links.
 */
export function measuresFor(
  question: string,
  supports: readonly string[],
  hits: readonly Ranked[],
  knows: (id: string) => boolean,
  lexicon: Lexicon | null,
  objection: string | null = null,
  search: ((subject: string) => readonly Ranked[]) | null = null,
): Found {
  // A hateful statement and nothing else is refused before anything is looked for.
  if (lexicon !== null && hateful(question, lexicon)) {
    return { rows: [], sentences: false, example: null, refused: true };
  }
  // A coded phrase, a slur — said, or reported by whom it was thrown at: the measures of the
  // subject one may ask in its place, as links, and that subject as the example. A list never
  // refuses, and never brings a sentence.
  const words = wordsOf(question);
  const instead = lexicon?.trope(words.map(stem).join(' ')) ?? null;
  if (instead !== null && instead !== '' && search !== null) {
    const about = rowsOf(search(instead), knows);
    return { rows: about, sentences: false, example: instead, charged: true };
  }
  // Our written answer and the measures it rests on, when the question is the objection and
  // nothing more — a charge that rides along would stand above them, and above our own
  // voice. Anything more, no wording to compare with, no file loaded: a question like another.
  const chosen = [...new Set(supports)].filter(knows).slice(0, SHOWN_MEASURES);
  if (
    chosen.length > 0 &&
    lexicon !== null &&
    objection !== null &&
    !ridesAlong(question, objection, lexicon)
  ) {
    return { rows: chosen, sentences: true, example: null, reviewed: true };
  }
  const rows = rowsOf(hits, knows);
  const shown = hits.filter((hit) => rows.includes(hit.id));
  // A date that is the date of no measure found the measures of another day: nothing.
  if (datesMissed(question, shown)) return { rows: [], sentences: false, example: null };
  // A people or a country, and what one says of it to charge it: « X contrôle… », « les X
  // nous envahissent » are made of words of the book.
  const peoples = lexicon !== null && words.some((word) => lexicon.kin(stem(word)));
  const told =
    lexicon !== null &&
    (peoples || words.some((word) => lexicon.soft(stem(word)))) &&
    words.some((word) => lexicon.said(stem(word)) || lexicon.insult(word));
  const pointing =
    instead !== null ||
    told ||
    namesSomeone(question) ||
    refersToSomeone(question) ||
    putsOnTrial(question) ||
    (lexicon !== null && pointsWithASign(question, lexicon));
  const plainly =
    rows.length > 0 &&
    lexicon !== null &&
    !pointing &&
    strangersIn(
      question,
      hits,
      (typed, term) =>
        lexicon.neutral(term) ||
        lexicon.people(term) ||
        OWN_BOSS.test(term) ||
        lexicon.alias(typed).length > 0,
    ).length === 0;
  if (plainly) {
    const alone = holds(question, shown, (term) => lexicon.sensitive(term) || lexicon.soft(term))
      ? aloneIn(question, hits, knows, lexicon)
      : { rows };
    if (
      'rows' in alone &&
      !datesMissed(
        question,
        hits.filter((hit) => alone.rows.includes(hit.id)),
      )
    ) {
      return { rows: alone.rows, sentences: true, example: null };
    }
  }
  if (rows.length === 0) return { rows, sentences: false, example: null };
  // An example to ask alone: a word of the question that is nothing but a subject, written
  // in the book exactly as it was typed — a typo, a verb, a look-alike is not echoed back.
  // In a question that holds a sensitive subject, only a subject one may suggest: under
  // « les Roms et les vols » the line gives none (seventh review). No good example: none.
  const termOf = (typed: string): string => stem(tokenize(typed)[0] ?? '');
  const through = new Set(hits.flatMap((hit) => hit.via ?? []));
  const written = (term: string, among: readonly Ranked[]): boolean =>
    among.some((hit) => (hit.on ?? hit.by ?? []).includes(term));
  const marked = (term: string): boolean =>
    lexicon !== null && (lexicon.sensitive(term) || lexicon.soft(term));
  const all = [...question.matchAll(/[\p{L}\p{N}]+/gu)].map((match) => match[0]);
  const typed = all.filter((word) => word.length >= 3 && !NUMBER.test(word) && !putsOnTrial(word));
  // A sensitive subject, a people, or anything thrown at somebody: only a subject one may
  // suggest — « les migrants violent nos femmes » gave « femmes » (eighth review).
  const strict = putsOnTrial(question) || all.some((word) => marked(termOf(word)));
  const subject = (word: string): boolean => {
    const term = termOf(word);
    return (
      lexicon?.askable(term) === true &&
      (written(term, hits) ||
        lexicon.alias(word).some((alias) => marked(alias) && through.has(alias)))
    );
  };
  const plain = (word: string): boolean => {
    const term = processTerm(tokenize(word)[0] ?? '');
    return (
      term !== null &&
      !fillerOnly([term]) &&
      written(term, shown) &&
      lexicon?.neutral(term) !== true &&
      lexicon?.people(term) !== true &&
      !namesSomeone(word) &&
      !refersToSomeone(word) &&
      !refersToSomeone(`le ${word}`) &&
      lexicon?.role.test(fold(word)) !== true
    );
  };
  // Next to a people, no word of the question is a subject to suggest.
  const example =
    peoples || instead !== null ? null : (typed.find(strict ? subject : plain) ?? null);
  return pointing || strict
    ? { rows, sentences: false, example, charged: true }
    : { rows, sentences: false, example };
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
    `^${YOU} (?:de |des |un |une |d )?(?:lfi|la france insoumise|insoumis|insoumise|militants?|militantes?|neutres?|objectifs?|objective|partisans?|independants?|de gauche|serieux|fiables?|benevoles?)(?: [a-z]+){0,2}$`,
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
  /\b(?:te|vous) faire confiance\b/,
  /^(?:tu|vous) (?:bosses|bossez|travailles|travaillez|roules|roulez) pour\b/,
  /^(?:tu|vous) (?:caches|cachez) quoi$/,
  /\b(?:tu|vous) (?:ne )?(?:refuses|refusez) de repondre\b/,
  /\b(?:tu|vous) (?:ne )?(?:donnes|donnez|montres|montrez) que des liens\b/,
  /^(?:tu|vous) (?:marches|marchez|fonctionnes|fonctionnez) comment$/,
  /\b(?:tu|vous) (?:gardes?|gardez|enregistres?|enregistrez|conserves?|conservez) (?:ma|mes|nos|notre) (?:questions?|recherches?|messages?|donnees)\b/,
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
  const tokens = wordsOf(question);
  const folded = tokens.join(' ');
  if (ABOUT_SITE.some((pattern) => pattern.test(folded))) return true;
  return tokens.length <= SHORT_QUESTION && SHORT_ABOUT.some((pattern) => pattern.test(folded));
}
