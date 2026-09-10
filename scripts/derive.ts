/**
 * Build-time derivations from data/aec-2025.json. Deterministic by construction: no network, no
 * LLM, no randomness, no clock (outputs carry the corpus version, not a timestamp), so running
 * the script twice on the same dataset yields byte-identical files.
 *
 *   1. data/stat-cards.json       one card per "À savoir" statistic (`div.chiffre`), with the
 *                                 percentages, polling institute and survey date parsed from the
 *                                 verbatim text, and the mentions required by the loi 77-808 on
 *                                 published polls that the source does not provide;
 *   2. data/terms-candidates.json glossary term candidates: 1/2/3-gram statistics over all
 *                                 propositions and paragraphs, scored by frequency × specificity,
 *                                 plus a seed list always reported with exact phrase counts;
 *   3. data/section-tags.json     life-situation and theme tags per section, produced by the
 *                                 keyword rules of scripts/tag-rules.ts.
 *
 * Texts are never rewritten: every `text`, `term` or example is a verbatim slice of the corpus
 * (CC BY-NC-SA 4.0, "La France insoumise – L'Avenir en commun").
 *
 * Usage: npx tsx scripts/derive.ts [--json]   (`--json` prints the run summary as JSON only)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Chapter, Chiffre, Dataset, Paragraph, Section } from './aec-types.js';
import {
  CHAPTER_FALLBACK_THEME,
  LIFE_SITUATION_RULES,
  MAX_TAGS_PER_VOCAB,
  METHOD_FR,
  RELATIVE_MIN_FRACTION,
  THEME_RULES,
  TITLE_WEIGHT,
  compileKeyword,
  compileRules,
  countRuleHits,
  normalizeForRules,
  type CompiledRule,
} from './tag-rules.js';

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_DIR = resolve(ROOT_DIR, 'data');
export const DATASET_PATH = resolve(DATA_DIR, 'aec-2025.json');
export const STAT_CARDS_PATH = resolve(DATA_DIR, 'stat-cards.json');
export const TERMS_PATH = resolve(DATA_DIR, 'terms-candidates.json');
export const SECTION_TAGS_PATH = resolve(DATA_DIR, 'section-tags.json');

const SOURCE_LICENSE_FR =
  "Textes extraits mot pour mot de « L'Avenir en commun, édition 2025 » (https://melenchon2027.fr/programme2025/livre/), " +
  "CC BY-NC-SA 4.0, attribution « La France insoumise – L'Avenir en commun ». Fichier dérivé diffusé sous la même licence.";

// ---------------------------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------------------------

/** Indexed access that turns the `undefined` of noUncheckedIndexedAccess into an error. */
function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`Index ${String(index)} out of range`);
  return item;
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function sortedHistogram(counts: Map<string, number>): Record<string, number> {
  const entries = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'),
  );
  return Object.fromEntries(entries);
}

function writeJson(path: string, value: unknown): void {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

interface CommonMeta {
  corpus_version: string;
  source_crawled_at: string;
  license_fr: string;
  generator: string;
}

function commonMeta(dataset: Dataset): CommonMeta {
  return {
    corpus_version: dataset.meta.corpus_version,
    source_crawled_at: dataset.meta.crawled_at,
    license_fr: SOURCE_LICENSE_FR,
    generator: 'scripts/derive.ts',
  };
}

/** Sections in reading order (parts → chapters → sections), with their chapter. */
function sectionsInReadingOrder(dataset: Dataset): { section: Section; chapter: Chapter }[] {
  const chapters = new Map(dataset.chapters.map((c) => [c.id, c]));
  const sections = new Map(dataset.sections.map((s) => [s.id, s]));
  const ordered: { section: Section; chapter: Chapter }[] = [];
  for (const part of [...dataset.parts].sort((a, b) => a.order - b.order)) {
    for (const chapterId of part.chapterIds) {
      const chapter = chapters.get(chapterId);
      if (chapter === undefined) throw new Error(`Unknown chapter ${chapterId}`);
      for (const sectionId of chapter.sectionIds) {
        const section = sections.get(sectionId);
        if (section === undefined) throw new Error(`Unknown section ${sectionId}`);
        ordered.push({ section, chapter });
      }
    }
  }
  if (ordered.length !== dataset.sections.length) {
    throw new Error('Reading order does not cover every section');
  }
  return ordered;
}

// ---------------------------------------------------------------------------------------------
// 1. Stat cards ("À savoir")
// ---------------------------------------------------------------------------------------------

export type ParseConfidence = 'high' | 'medium' | 'low';

/**
 * Mentions the loi n° 77-808 du 19 juillet 1977 (art. 2, as amended in 2016) requires alongside
 * any published poll. The "À savoir" boxes only ever give the organism and a month/year, so the
 * sponsor and the first medium of publication are recorded as missing unless the text names them.
 */
export interface Legal77808 {
  organisme: string | null;
  dates: string | null;
  commanditaire: string | null;
  media_premiere_diffusion: string | null;
  /** Keys above that the source text does not provide. */
  missing: string[];
}

export interface StatCard {
  /** Id of the `div.chiffre` (or of the paragraph, for `paragraph_statistics`). */
  id: string;
  section_id: string;
  chapter_id: string;
  chapter_title: string;
  section_title: string;
  /** Verbatim text of the statistic. */
  text: string;
  /** Every "NN %" value found in the text, in order of appearance. */
  percentages: number[];
  /** First percentage of the text (the headline figure), if any. */
  headline_percentage: number | null;
  /** Trailing parenthetical of the text, verbatim (e.g. "Harris Interactive, juillet 2021"). */
  citation_text: string | null;
  /** Canonical institute name (e.g. "Harris Interactive", "Ifop", "YouGov"). */
  institute: string | null;
  /** Institute as written in the source (e.g. "Yougov"). */
  institute_raw: string | null;
  /** e.g. "juillet 2021" or "2024" (verbatim). */
  survey_date_text: string | null;
  /** YYYY-MM when the month is given, else null (see `survey_year`). */
  survey_date_iso: string | null;
  survey_year: number | null;
  parse_confidence: ParseConfidence;
  legal_77_808: Legal77808;
}

const MONTHS_FR: readonly string[] = [
  'janvier',
  'février',
  'mars',
  'avril',
  'mai',
  'juin',
  'juillet',
  'août',
  'septembre',
  'octobre',
  'novembre',
  'décembre',
];

/** Institutes known to publish French opinion polls; matched case-insensitively on the raw name. */
const KNOWN_INSTITUTES: readonly { canonical: string; pattern: RegExp }[] = [
  { canonical: 'Harris Interactive', pattern: /^harris(?:\s+interactive)?$/iu },
  { canonical: 'Ifop', pattern: /^ifop$/iu },
  { canonical: 'YouGov', pattern: /^yougov$/iu },
  { canonical: 'Ipsos', pattern: /^ipsos$/iu },
  { canonical: 'Elabe', pattern: /^elabe$/iu },
  { canonical: 'Odoxa', pattern: /^odoxa$/iu },
  { canonical: 'OpinionWay', pattern: /^opinion\s?way$/iu },
  { canonical: 'BVA', pattern: /^bva$/iu },
  { canonical: 'CSA', pattern: /^csa$/iu },
  { canonical: 'Cluster17', pattern: /^cluster\s?17$/iu },
  { canonical: 'Viavoice', pattern: /^viavoice$/iu },
  { canonical: 'Kantar', pattern: /^kantar(?:\s+public)?$/iu },
];

const PERCENT_RE = /(\d+(?:[.,]\d+)?)\s*%/gu;
const TRAILING_PARENTHETICAL_RE = /\(([^()]*)\)\s*$/u;
const DATE_AT_END_RE = new RegExp(
  `(?:^|[\\s,])(?:(${MONTHS_FR.join('|')})\\s+)?((?:19|20)\\d{2})\\s*$`,
  'iu',
);
const SPONSOR_RE = /^(.+?)\s+pour\s+(.+)$/iu;
/** A plausible institute name: short, letters only (rejects "93,13 % des votants…"). */
const PLAUSIBLE_INSTITUTE_RE = /^[\p{L}][\p{L}\s.&'-]{1,40}$/u;

export interface ParsedCitation {
  citation_text: string | null;
  institute: string | null;
  institute_raw: string | null;
  commanditaire: string | null;
  survey_date_text: string | null;
  survey_date_iso: string | null;
  survey_year: number | null;
}

export function parseCitation(text: string): ParsedCitation {
  const empty: ParsedCitation = {
    citation_text: null,
    institute: null,
    institute_raw: null,
    commanditaire: null,
    survey_date_text: null,
    survey_date_iso: null,
    survey_year: null,
  };
  const parenthetical = TRAILING_PARENTHETICAL_RE.exec(text);
  if (parenthetical === null) return empty;
  const citation = at(parenthetical, 1).trim();
  if (citation.length === 0) return empty;

  let organism = citation;
  let dateText: string | null = null;
  let iso: string | null = null;
  let year: number | null = null;
  const date = DATE_AT_END_RE.exec(citation);
  if (date !== null) {
    dateText = date[0].replace(/^[\s,]+/u, '').trim();
    const monthName = date[1];
    year = Number(at(date, 2));
    if (monthName !== undefined) {
      const month = MONTHS_FR.indexOf(monthName.toLowerCase()) + 1;
      iso = `${String(year)}-${String(month).padStart(2, '0')}`;
    }
    organism = citation
      .slice(0, date.index)
      .replace(/[\s,]+$/u, '')
      .trim();
  }

  let instituteRaw: string | null = organism.length > 0 ? organism : null;
  let commanditaire: string | null = null;
  if (instituteRaw !== null) {
    const sponsor = SPONSOR_RE.exec(instituteRaw);
    if (sponsor !== null) {
      instituteRaw = at(sponsor, 1).trim();
      commanditaire = at(sponsor, 2).trim();
    }
  }
  let institute: string | null = null;
  if (instituteRaw !== null) {
    const raw = instituteRaw;
    const known = KNOWN_INSTITUTES.find((k) => k.pattern.test(raw));
    if (known !== undefined) institute = known.canonical;
    else if (PLAUSIBLE_INSTITUTE_RE.test(raw) && raw.split(/\s+/).length <= 4) institute = raw;
    // Otherwise not an institute (e.g. "93,13 % des votants y étaient favorables"): raw only.
  }
  return {
    citation_text: citation,
    institute,
    institute_raw: instituteRaw,
    commanditaire,
    survey_date_text: dateText,
    survey_date_iso: iso,
    survey_year: year,
  };
}

export function parsePercentages(text: string): number[] {
  const values: number[] = [];
  for (const match of text.matchAll(PERCENT_RE)) {
    values.push(Number(at(match, 1).replace(',', '.')));
  }
  return values;
}

function isKnownInstitute(institute: string | null): boolean {
  return institute !== null && KNOWN_INSTITUTES.some((k) => k.canonical === institute);
}

export function buildStatCard(
  item: Pick<Chiffre, 'id' | 'text'>,
  section: Section,
  chapter: Chapter,
): StatCard {
  const percentages = parsePercentages(item.text);
  const citation = parseCitation(item.text);
  let confidence: ParseConfidence = 'low';
  if (percentages.length > 0 && citation.institute !== null && citation.survey_year !== null) {
    confidence =
      isKnownInstitute(citation.institute) && citation.survey_date_iso !== null ? 'high' : 'medium';
  }
  const legal: Legal77808 = {
    organisme: citation.institute,
    dates: citation.survey_date_text,
    commanditaire: citation.commanditaire,
    media_premiere_diffusion: null,
    missing: [],
  };
  for (const key of ['organisme', 'dates', 'commanditaire', 'media_premiere_diffusion'] as const) {
    if (legal[key] === null) legal.missing.push(key);
  }
  return {
    id: item.id,
    section_id: section.id,
    chapter_id: chapter.id,
    chapter_title: chapter.title,
    section_title: section.title,
    text: item.text,
    percentages,
    headline_percentage: percentages[0] ?? null,
    citation_text: citation.citation_text,
    institute: citation.institute,
    institute_raw: citation.institute_raw,
    survey_date_text: citation.survey_date_text,
    survey_date_iso: citation.survey_date_iso,
    survey_year: citation.survey_year,
    parse_confidence: confidence,
    legal_77_808: legal,
  };
}

export interface DateRange {
  earliest_iso: string | null;
  latest_iso: string | null;
  earliest_text: string | null;
  latest_text: string | null;
  /** Cards whose citation gives a year without a month. */
  year_only: number;
}

function dateRange(cards: readonly StatCard[]): DateRange {
  const dated = cards.filter((c) => c.survey_year !== null);
  const key = (c: StatCard): number => {
    const month = c.survey_date_iso === null ? 0 : Number(c.survey_date_iso.slice(5));
    return (c.survey_year ?? 0) * 100 + month;
  };
  const sorted = [...dated].sort((a, b) => key(a) - key(b) || a.id.localeCompare(b.id));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const isoOf = (c: StatCard | undefined): string | null =>
    c === undefined ? null : (c.survey_date_iso ?? String(c.survey_year));
  return {
    earliest_iso: isoOf(first),
    latest_iso: isoOf(last),
    earliest_text: first?.survey_date_text ?? null,
    latest_text: last?.survey_date_text ?? null,
    year_only: dated.filter((c) => c.survey_date_iso === null).length,
  };
}

export interface StatCardsFile {
  meta: CommonMeta & {
    count: number;
    with_institute_and_date: number;
    institutes: Record<string, number>;
    date_range: DateRange;
    confidence: Record<ParseConfidence, number>;
    without_percentage: string[];
    legal_77_808_fr: string;
    paragraph_statistics_fr: string;
  };
  cards: StatCard[];
  /**
   * Statistics the source publishes as a plain paragraph inside `section.contenu` instead of the
   * "À savoir" box (`statistic_as_paragraph` in `meta.source_anomalies`), parsed the same way.
   */
  paragraph_statistics: StatCard[];
}

export function buildStatCards(dataset: Dataset): StatCardsFile {
  const ordered = sectionsInReadingOrder(dataset);
  const cards: StatCard[] = [];
  const paragraphStatistics: StatCard[] = [];
  const statisticParagraphIds = new Set(
    dataset.meta.source_anomalies
      .filter((a) => a.kind === 'statistic_as_paragraph')
      .map((a) => a.id),
  );
  for (const { section, chapter } of ordered) {
    for (const chiffre of section.chiffres) cards.push(buildStatCard(chiffre, section, chapter));
    for (const item of section.items) {
      if (item.kind === 'paragraph' && statisticParagraphIds.has(item.id)) {
        paragraphStatistics.push(buildStatCard(item, section, chapter));
      }
    }
  }
  const institutes = new Map<string, number>();
  const confidence: Record<ParseConfidence, number> = { high: 0, medium: 0, low: 0 };
  for (const card of cards) {
    const name = card.institute ?? 'inconnu';
    institutes.set(name, (institutes.get(name) ?? 0) + 1);
    confidence[card.parse_confidence] += 1;
  }
  return {
    meta: {
      ...commonMeta(dataset),
      count: cards.length,
      with_institute_and_date: cards.filter(
        (c) => c.institute !== null && c.survey_date_text !== null,
      ).length,
      institutes: sortedHistogram(institutes),
      date_range: dateRange(cards),
      confidence,
      without_percentage: cards.filter((c) => c.percentages.length === 0).map((c) => c.id),
      legal_77_808_fr:
        'La loi n° 77-808 du 19 juillet 1977 (art. 2, modifié en 2016) impose, pour toute publication ' +
        "d'un sondage, d'indiquer l'organisme qui l'a réalisé, le commanditaire, les dates d'interrogation " +
        "et le média de première diffusion (ainsi que la taille de l'échantillon, le texte des questions et " +
        "les marges d'erreur, jamais fournis ici). Les encadrés « À savoir » ne citent que l'organisme et un " +
        'mois/année : les mentions manquantes sont listées dans legal_77_808.missing pour chaque carte.',
      paragraph_statistics_fr:
        'Statistiques publiées par le site comme simple paragraphe (hors encadré « À savoir »), signalées ' +
        'dans meta.source_anomalies du corpus (statistic_as_paragraph) ; analysées de la même façon, ' +
        'listées à part pour ne pas modifier le décompte des encadrés.',
    },
    cards,
    paragraph_statistics: paragraphStatistics,
  };
}

// ---------------------------------------------------------------------------------------------
// 2. Glossary term candidates
// ---------------------------------------------------------------------------------------------

/** Terms always reported (when present) with exact phrase counts, whatever their score. */
export const SEED_TERMS: readonly string[] = [
  'règle verte',
  'bifurcation écologique',
  'planification écologique',
  '6e République',
  'assemblée constituante',
  'constituante',
  'écocide',
  'pôle public',
  'SMIC',
  'révolution citoyenne',
  'flux tendus',
  'protectionnisme solidaire',
  'créolisation',
  "garantie d'emploi",
  'sécurité sociale intégrale',
  "État d'urgence",
  "référendum d'initiative citoyenne",
  'RIC',
  'monarchie présidentielle',
  'planification',
  'nationalisation',
  'socialisation',
  'services publics',
  'retraite à 60 ans',
  'blocage des prix',
  'ISF',
  'TVA',
  'impôt universel',
  "allocation d'autonomie",
  'bouclier',
  'harmonie',
  'Outre-mer',
  'francophonie',
  'altermondialiste',
  'OTAN',
  'Union européenne',
  'désobéissance',
  'souveraineté alimentaire',
  'agroécologie',
  '100 % renouvelables',
  'nucléaire',
  'ferroviaire',
  'eau',
  'biens communs',
];

/** Word list literal: whitespace-separated words (a word never contains whitespace). */
function words(text: string): string[] {
  return text.split(/\s+/u).filter((w) => w.length > 0);
}

/**
 * French stopwords: n-grams starting or ending with one of these are never candidates, and they
 * are ignored when computing specificity. Accents kept, elided forms already stripped by the
 * tokenizer ("l'eau" → "eau").
 */
export const STOPWORDS: ReadonlySet<string> = new Set([
  // articles, determiners
  ...words(`
    le la les l un une des du de d au aux ce cet cette ces mon ma mes ton ta tes son sa ses notre
    nos votre vos leur leurs tout tous toute toutes chaque aucun aucune certains certaines
    plusieurs quelques quelque tel telle tels telles même mêmes autre autres
  `),
  // pronouns
  ...words(`
    je tu il elle on nous vous ils elles me te se s moi toi lui eux y en qui que qu quoi dont où
    lequel laquelle lesquels lesquelles auquel auxquels auxquelles duquel desquels desquelles
    celui celle ceux celles cela ça ceci chacun chacune personne rien soi
  `),
  // prepositions, conjunctions, adverbs
  ...words(`
    à dans sur sous pour par avec sans entre vers chez contre depuis pendant avant après dès hors
    selon sauf via et ou ni mais donc or car si ne n pas plus moins très trop peu beaucoup tant
    autant aussi ainsi alors encore déjà toujours jamais ici là bien non oui oui comme quand
    lorsque lorsqu puisque puisqu jusque jusqu afin notamment plutôt soit surtout seulement
    parfois souvent désormais aujourd'hui demain hier etc cf c j m t est-à-dire partout ailleurs
    également enfin puis ensuite donc pourtant cependant néanmoins toutefois ci y dessus dessous
    mieux pire
  `),
  // auxiliaries and modal forms
  ...words(`
    être est sont était étaient été sera seront soit soient avoir a ont avait avaient aura auront
    ayant faut faudra doit doivent devra devront devons peut peuvent pourra pourront pouvons veut
    veulent voulons fait faire font fais faisons
  `),
]);

/**
 * Generic words that disqualify any n-gram containing them: the verbs that open measures
 * ("créer", "garantir"…), quantity and time fillers, and proper names of politicians, which are
 * not programme vocabulary.
 */
export const GENERIC_ANYWHERE: ReadonlySet<string> = new Set([
  // measure verbs (infinitives) and their common forms
  ...words(`
    mettre créer garantir interdire renforcer instaurer rendre augmenter lutter développer assurer
    abroger supprimer rétablir permettre donner soutenir organiser protéger construire refuser
    favoriser réduire établir revaloriser intégrer limiter sortir engager imposer financer
    planifier prendre proposer reconnaître adopter appliquer améliorer porter lancer encadrer
    respecter empêcher mener conditionner généraliser élargir étendre obliger accompagner exiger
    baisser relancer réorienter renforcer défendre promouvoir inscrire introduire ouvrir fermer
    former revenir reprendre remettre redonner réserver agir aller voir passer mise fin finir
    place cadre compris œuvre charge partir sein face compte lien matière cas ensemble niveau fois
    nombre part cours base moyens moyen objectif objectifs mesure mesures condition conditions
    effet afin notamment exemple possible nécessaire obligatoire obligatoires permanent permanente
    réel réelle réels réelles
  `),
  // quantities, time
  ...words(`
    an ans année années mois jour jours millions milliards million milliard euros euro deux trois
    quatre cinq six dix cent mille premier première premiers premières deuxième second seconde
    dernier dernière derniers dernières nouveau nouvelle nouveaux nouvelles grand grande grands
    grandes petit petite petits petites seul seule seuls seules plein pleine
  `),
  // verbs that title sections or open measures
  ...words(`
    travailler éradiquer refonder reconstruire abolir rompre garantissant immédiatement revenir
    réaliser réunir sauver lever consommer investir affirmer collectiviser réindustrialiser
    relocaliser désobéir utiliser unir assumer qualifier humaniser élever balayer produire
    définanciariser grâce êtres chapitre partie faut-il mieux autrement ensemble collectivement
    réellement véritablement pleinement partout abord davantage permettant changer passé
    changement changements cours issue
  `),
  // politicians named in the argument prose (not programme vocabulary)
  ...words(`
    macron emmanuel hollande françois sarkozy nicolas pen
  `),
]);

/**
 * Words too generic to be a glossary entry on their own, but allowed inside multiword terms
 * ("public" is dropped, "pôle public" is kept).
 */
export const GENERIC_UNIGRAM: ReadonlySet<string> = new Set([
  ...words(`
    public publique publics publiques social sociale sociaux sociales national nationale nationaux
    nationales français française françaises france politique politiques écologique écologiques
    économique économiques humain humaine humains humaines général générale générales généraux
    international internationale internationaux internationales européen européenne européens
    européennes local locale locaux locales droit droits plan plans loi lois service services
    accès état états pays monde vie temps personnes femmes hommes enfants jeunes citoyens citoyen
    citoyenne citoyennes peuple peuples système principe principes secteur secteurs situation
    situations programme programmes activité activités action actions projet projets gouvernement
    société population populations pratiques pratique professionnels professionnel professionnelle
    professionnelles personnels personnel établissements établissement centres centre réseau
    réseaux produits produit règles règle normes norme usage usages gestion fonction fonctions
    organisation création développement formation formations protection lutte contrôle contrôles
    sécurité égalité liberté libertés urgence intérêt intérêts ordre domaine domaines âge crise
    crises risque risques effectifs accueil places travaux avenir progrès victimes victime partage
    évaluation réforme réformes changement changements construction production financement aide
    aides besoin besoins moyens territoire territoires commun commune communs communes privé
    privée privés privées libre libres majorité minorité ensemble travail emploi emplois
    entreprise entreprises institutions institution question questions point points sens dimension
    modèle modèles proposition propositions statut statuts existence exemple exemples conséquence
    conséquences résultat résultats rôle histoire nom noms mode modes type types forme formes taux
    prix coût coûts valeur valeurs volonté capacité capacités qualité moitié tiers quart total
    totalité zone zones lieu lieux espace espaces milieu milieux pouvoir nature biens riches riche
    contrat contrats accord accords autorité autorités réserve réserves classe classes sociétés
    garantie garanties révolution participation investissement investissements métier métiers
    indépendance ligne lignes quartier quartiers air marché marchés fonds prévention réalité
    logique durée origine distribution commission prise vivre élu élus vote votes élection
    élections traité traités bassin bassins supérieur supérieure supérieurs supérieures scolaire
    scolaires maritime maritimes sanitaire sanitaires climatique climatiques énergétique
    énergétiques financier financière financiers financières fiscal fiscale fiscaux fiscales
    agricole agricoles culturel culturelle culturels culturelles artistique artistiques sportif
    sportive sportifs sportives mondial mondiale mondiaux mondiales populaire populaires
    commercial commerciale commerciaux commerciales africain africaine africains africaines
    militaire militaires humanité commun communs partenaires partenaire membre membres ressources
    ressource capacité obligation obligations possibilité possibilités réponse réponses problème
    problèmes raison raisons manière façon processus démarche démarches dispositif dispositifs
    outil outils instrument instruments moment période périodes quantité majeure majeur principal
    principale principaux principales central centrale centraux centrales véritable véritables
    ensemble unique uniques propre propres proximité revenu revenus intervention interventions
    force forces argent civil civile civils civiles nation nations verte vert verts vertes
    collective collectif collectifs collectives durable durables essentiel essentielle essentiels
    essentielles environnemental environnementale environnementaux environnementales procédure
    procédures augmentation augmentations démocratique démocratiques scientifique scientifiques
    alimentaire alimentaires judiciaire judiciaires office zéro ère global globale globaux
    globales permanent permanente permanents permanentes individuel individuelle individuels
    individuelles humanitaire humanitaires territorial territoriale territoriaux territoriales
    régional régionale régionaux régionales mondialisation moyenne moyennes nombreux nombreuses
    meilleur meilleure meilleurs meilleures nécessité nécessités urgent urgente urgents urgentes
    rapport rapports entrée entrées critère critères mission missions mouvement mouvements enjeu
    enjeux contribution contributions accompagnement agence agences union sortie sorties retour
    retours passage suite suites fonctionnement application mise respect maintien renforcement
    réduction suppression interdiction obligation abrogation instauration généralisation
    amélioration création ouverture fermeture
  `),
]);

/** Generic phrases that survive the word filters but are not programme vocabulary. */
export const BLOCKED_PHRASES: ReadonlySet<string> = new Set([
  'mettre en place',
  'dans le cadre',
  'humains et financiers',
  'personnes en situation',
  'prise en charge',
]);

const NUMERIC_RE = /^\d+(?:[.,]\d+)?$/u;
const ELISION_RE = /^(?:l|d|qu|s|n|j|m|t|c|jusqu|lorsqu|puisqu)'(.+)$/u;
/** A word: letters/digits with inner apostrophes or hyphens ("aujourd'hui", "outre-mer"). */
const WORD_RE = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;
/** Punctuation between two words that closes a phrase (n-grams never span it). */
const PHRASE_BREAK_RE = /[.;:!?()«»"[\]{}…,/]/u;

export interface Token {
  /** Normalized form: NFC, lowercase, ASCII apostrophe, elision removed. */
  norm: string;
  /** Offsets in the original text (after the elision, so the surface form starts on the word). */
  start: number;
  end: number;
  /** True when a phrase break precedes this token. */
  phraseStart: boolean;
}

export function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  let previousEnd = 0;
  for (const match of text.matchAll(WORD_RE)) {
    let raw = match[0];
    let start = match.index;
    while (raw.length > 0 && /['’-]$/u.test(raw)) raw = raw.slice(0, -1);
    if (raw.length === 0) continue;
    let norm = raw.toLowerCase().replace(/’/gu, "'");
    const elision = ELISION_RE.exec(norm);
    if (elision !== null) {
      const rest = at(elision, 1);
      start += norm.length - rest.length;
      norm = rest;
    }
    const between = text.slice(previousEnd, match.index);
    tokens.push({
      norm,
      start,
      end: start + norm.length,
      phraseStart: tokens.length === 0 || PHRASE_BREAK_RE.test(between),
    });
    previousEnd = match.index + match[0].length;
  }
  return tokens;
}

/** Canonical key of a phrase, so that seeds and n-grams can be matched ("État d'urgence" → "état urgence"). */
export function phraseKey(phrase: string): string {
  return tokenize(phrase.normalize('NFC'))
    .map((t) => t.norm)
    .join(' ');
}

export function isCandidateNgram(norms: readonly string[]): boolean {
  if (norms.length === 0) return false;
  const first = at(norms, 0);
  const last = at(norms, norms.length - 1);
  if (STOPWORDS.has(first) || STOPWORDS.has(last)) return false;
  if (NUMERIC_RE.test(first) || NUMERIC_RE.test(last)) return false;
  if (norms.some((t) => GENERIC_ANYWHERE.has(t))) return false;
  if (norms.some((t) => t.length < 2)) return false;
  if (BLOCKED_PHRASES.has(norms.join(' '))) return false;
  if (norms.length === 1) return first.length >= 3 && !GENERIC_UNIGRAM.has(first);
  return true;
}

export interface TermCandidate {
  /** Most frequent surface form in the corpus (verbatim), or the seed as given. */
  term: string;
  /** Canonical key (lowercase, NFC, elisions removed), see `phraseKey`. */
  normalized: string;
  /** Exact number of occurrences in the whole corpus (propositions, paragraphs, titles). */
  count: number;
  /** Occurrences inside key measures, measures and sub-measures only. */
  count_in_propositions: number;
  /** Ids of the containers (sections, chapters, "intro", "part1"…) where the term occurs, reading order. */
  sections: string[];
  /** Up to 3 proposition ids (other item ids only when the term never occurs in a proposition). */
  examples: string[];
  /** Number of words (seeds may exceed 3). */
  ngram: 1 | 2 | 3 | 4;
  seed: boolean;
  score: number;
}

type CorpusDocKind = 'proposition' | 'paragraph' | 'title';

interface CorpusDoc {
  /** Container id: section id, chapter id, "intro" or part id. */
  containerId: string;
  /** Item id (for titles: the id of the section, chapter or part itself). */
  id: string;
  kind: CorpusDocKind;
  text: string;
}

/**
 * The programme text in reading order: introduction paragraphs, then for each part its title and
 * paragraphs, each chapter title, each section title, the section's paragraphs, key measures,
 * measures and sub-measures. The "À savoir" boxes and the statistics published as paragraphs
 * (`statistic_as_paragraph` anomalies) are left out: their wording is poll boilerplate
 * ("N % des Français sont favorables à…", institute, month), not programme vocabulary.
 */
function corpusDocs(dataset: Dataset): CorpusDoc[] {
  const docs: CorpusDoc[] = [];
  const statisticParagraphIds = new Set(
    dataset.meta.source_anomalies
      .filter((a) => a.kind === 'statistic_as_paragraph')
      .map((a) => a.id),
  );
  const pushParagraphs = (containerId: string, paragraphs: readonly Paragraph[]): void => {
    for (const p of paragraphs) {
      if (statisticParagraphIds.has(p.id)) continue;
      docs.push({ containerId, id: p.id, kind: 'paragraph', text: p.text });
    }
  };
  pushParagraphs('intro', dataset.introduction.paragraphs);
  const chapters = new Map(dataset.chapters.map((c) => [c.id, c]));
  const sections = new Map(dataset.sections.map((s) => [s.id, s]));
  for (const part of [...dataset.parts].sort((a, b) => a.order - b.order)) {
    docs.push({ containerId: part.id, id: part.id, kind: 'title', text: part.title });
    pushParagraphs(part.id, part.paragraphs);
    for (const chapterId of part.chapterIds) {
      const chapter = chapters.get(chapterId);
      if (chapter === undefined) throw new Error(`Unknown chapter ${chapterId}`);
      docs.push({ containerId: chapter.id, id: chapter.id, kind: 'title', text: chapter.title });
      for (const sectionId of chapter.sectionIds) {
        const section = sections.get(sectionId);
        if (section === undefined) throw new Error(`Unknown section ${sectionId}`);
        docs.push({ containerId: section.id, id: section.id, kind: 'title', text: section.title });
        for (const item of section.items) {
          if (statisticParagraphIds.has(item.id)) continue;
          docs.push({
            containerId: section.id,
            id: item.id,
            kind: item.kind === 'paragraph' ? 'paragraph' : 'proposition',
            text: item.text,
          });
          if (item.kind === 'measure' && item.subMeasures !== undefined) {
            for (const sub of item.subMeasures) {
              docs.push({
                containerId: section.id,
                id: sub.id,
                kind: 'proposition',
                text: sub.text,
              });
            }
          }
        }
      }
    }
  }
  return docs;
}

interface Aggregate {
  count: number;
  countInPropositions: number;
  n: number;
  containers: Set<string>;
  propositionIds: string[];
  otherIds: string[];
  surfaces: Map<string, number>;
}

const LENGTH_BONUS: Readonly<Record<number, number>> = { 1: 1, 2: 1.6, 3: 2 };
const MIN_COUNT_UNIGRAM = 3;
const MIN_COUNT_MULTIWORD = 2;
const TOP_N = 150;

function lengthBonus(n: number): number {
  return LENGTH_BONUS[Math.min(n, 3)] ?? 2;
}

/** Mean inverse document frequency of the non-stopword words of a term (ln(1 + N/df)). */
function specificity(
  norms: readonly string[],
  documentFrequency: ReadonlyMap<string, number>,
  documents: number,
): number {
  const content = norms.filter((t) => !STOPWORDS.has(t));
  if (content.length === 0) return 0;
  const total = content.reduce((sum, t) => {
    const df = documentFrequency.get(t) ?? 1;
    return sum + Math.log(1 + documents / df);
  }, 0);
  return total / content.length;
}

function pickSurface(surfaces: ReadonlyMap<string, number>): string {
  const entries = [...surfaces.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].length - b[0].length || a[0].localeCompare(b[0], 'fr'),
  );
  return at(entries, 0)[0];
}

function examplesOf(propositionIds: readonly string[], otherIds: readonly string[]): string[] {
  const source = propositionIds.length > 0 ? propositionIds : otherIds;
  return source.slice(0, 3);
}

export interface TermsFile {
  meta: CommonMeta & {
    method_fr: string;
    documents: number;
    items_scanned: number;
    candidates_total: number;
    kept: number;
    top_n: number;
    min_count: { unigram: number; multiword: number };
    length_bonus: Record<number, number>;
    seeds_present: string[];
    seeds_absent: string[];
    /** Seeds whose exact phrase count differs from the n-gram count of the same key. */
    seed_count_mismatches: { term: string; phrase_count: number; ngram_count: number }[];
  };
  candidates: TermCandidate[];
}

export function buildTerms(dataset: Dataset): TermsFile {
  const docs = corpusDocs(dataset);
  const containerIds = new Set(docs.map((d) => d.containerId));
  const documents = containerIds.size;

  // Document frequency of every word, per container.
  const wordsPerContainer = new Map<string, Set<string>>();
  const tokenized = docs.map((doc) => ({ doc, tokens: tokenize(doc.text) }));
  for (const { doc, tokens } of tokenized) {
    let words = wordsPerContainer.get(doc.containerId);
    if (words === undefined) {
      words = new Set<string>();
      wordsPerContainer.set(doc.containerId, words);
    }
    for (const t of tokens) words.add(t.norm);
  }
  const documentFrequency = new Map<string, number>();
  for (const words of wordsPerContainer.values()) {
    for (const w of words) documentFrequency.set(w, (documentFrequency.get(w) ?? 0) + 1);
  }

  // N-gram aggregation.
  const aggregates = new Map<string, Aggregate>();
  for (const { doc, tokens } of tokenized) {
    for (let n = 1; n <= 3; n += 1) {
      for (let i = 0; i + n <= tokens.length; i += 1) {
        const slice = tokens.slice(i, i + n);
        if (slice.slice(1).some((t) => t.phraseStart)) continue;
        const norms = slice.map((t) => t.norm);
        if (!isCandidateNgram(norms)) continue;
        const key = norms.join(' ');
        const surface = doc.text.slice(at(slice, 0).start, at(slice, n - 1).end);
        let agg = aggregates.get(key);
        if (agg === undefined) {
          agg = {
            count: 0,
            countInPropositions: 0,
            n,
            containers: new Set<string>(),
            propositionIds: [],
            otherIds: [],
            surfaces: new Map<string, number>(),
          };
          aggregates.set(key, agg);
        }
        agg.count += 1;
        if (doc.kind === 'proposition') agg.countInPropositions += 1;
        agg.containers.add(doc.containerId);
        const ids = doc.kind === 'proposition' ? agg.propositionIds : agg.otherIds;
        if (!ids.includes(doc.id)) ids.push(doc.id);
        agg.surfaces.set(surface, (agg.surfaces.get(surface) ?? 0) + 1);
      }
    }
  }

  const scoreOf = (norms: readonly string[], count: number): number =>
    round(count * specificity(norms, documentFrequency, documents) * lengthBonus(norms.length), 2);

  const candidates: TermCandidate[] = [];
  for (const [key, agg] of aggregates) {
    const minCount = agg.n === 1 ? MIN_COUNT_UNIGRAM : MIN_COUNT_MULTIWORD;
    if (agg.count < minCount) continue;
    candidates.push({
      term: pickSurface(agg.surfaces),
      normalized: key,
      count: agg.count,
      count_in_propositions: agg.countInPropositions,
      sections: [...agg.containers],
      examples: examplesOf(agg.propositionIds, agg.otherIds),
      ngram: agg.n as 1 | 2 | 3,
      seed: false,
      score: scoreOf(key.split(' '), agg.count),
    });
  }
  const candidatesTotal = candidates.length;

  // Seeds: exact phrase counts, replacing the n-gram entry of the same key when there is one.
  const normalizedDocs = tokenized.map(({ doc }) => ({
    doc,
    text: normalizeForRules(doc.text),
  }));
  const seedsPresent: string[] = [];
  const seedsAbsent: string[] = [];
  const mismatches: TermsFile['meta']['seed_count_mismatches'] = [];
  const seedEntries: TermCandidate[] = [];
  const seedKeys = new Set<string>();
  for (const seed of SEED_TERMS) {
    const pattern = compileKeyword(seed);
    const key = phraseKey(seed);
    let count = 0;
    let countInPropositions = 0;
    const containers = new Set<string>();
    const propositionIds: string[] = [];
    const otherIds: string[] = [];
    for (const { doc, text } of normalizedDocs) {
      pattern.lastIndex = 0;
      const matches = text.match(pattern);
      if (matches === null) continue;
      count += matches.length;
      if (doc.kind === 'proposition') countInPropositions += matches.length;
      containers.add(doc.containerId);
      (doc.kind === 'proposition' ? propositionIds : otherIds).push(doc.id);
    }
    if (count === 0) {
      seedsAbsent.push(seed);
      continue;
    }
    seedsPresent.push(seed);
    seedKeys.add(key);
    const ngramCount = aggregates.get(key)?.count;
    if (ngramCount !== undefined && ngramCount !== count) {
      mismatches.push({ term: seed, phrase_count: count, ngram_count: ngramCount });
    }
    const words = key.split(' ');
    seedEntries.push({
      term: seed,
      normalized: key,
      count,
      count_in_propositions: countInPropositions,
      sections: [...containers],
      examples: examplesOf(propositionIds, otherIds),
      ngram: Math.min(words.length, 4) as 1 | 2 | 3 | 4,
      seed: true,
      score: scoreOf(words, count),
    });
  }

  const byScore = (a: TermCandidate, b: TermCandidate): number =>
    b.score - a.score || b.count - a.count || a.normalized.localeCompare(b.normalized, 'fr');
  const nonSeed = candidates.filter((c) => !seedKeys.has(c.normalized)).sort(byScore);
  const kept = [...nonSeed.slice(0, TOP_N), ...seedEntries].sort(byScore);

  return {
    meta: {
      ...commonMeta(dataset),
      method_fr:
        'Candidats de glossaire extraits sans IA : fréquences des 1-, 2- et 3-grammes (minuscules, NFC, ' +
        'accents conservés, élisions retirées, mots composés conservés, n-grammes limités à une même proposition ' +
        "ou membre de phrase) sur l'ensemble des mesures clés, mesures, sous-mesures et paragraphes (sections, " +
        'introduction, parties), plus les titres (parties, chapitres, sections) ; les encadrés « À savoir » et les ' +
        'statistiques publiées en paragraphe sont exclus ; ' +
        'count_in_propositions isole les occurrences dans les mesures. Filtres : liste de mots vides français aux ' +
        "extrémités, verbes d'action et mots " +
        'génériques exclus, unigrammes génériques exclus. Score = fréquence × spécificité (moyenne des ln(1 + N/df) ' +
        'des mots, N = nombre de contenants, df = nombre de contenants où le mot apparaît) × bonus de longueur ' +
        `(1 mot : 1, 2 mots : 1,6, 3 mots : 2). Les ${String(TOP_N)} meilleurs candidats sont conservés, plus ` +
        "tous les termes d'amorçage présents dans le corpus (comptés par correspondance exacte de l'expression, " +
        'insensible à la casse). Aucune lemmatisation : singulier et pluriel sont comptés séparément.',
      documents,
      items_scanned: docs.length,
      candidates_total: candidatesTotal,
      kept: kept.length,
      top_n: TOP_N,
      min_count: { unigram: MIN_COUNT_UNIGRAM, multiword: MIN_COUNT_MULTIWORD },
      length_bonus: { ...LENGTH_BONUS },
      seeds_present: seedsPresent,
      seeds_absent: seedsAbsent,
      seed_count_mismatches: mismatches,
    },
    candidates: kept,
  };
}

// ---------------------------------------------------------------------------------------------
// 3. Section tags
// ---------------------------------------------------------------------------------------------

export interface SectionTags {
  id: string;
  title: string;
  life_situations: string[];
  themes: string[];
  /** Weighted hits of every tag that matched at least once (assigned or not). */
  hits: Record<string, number>;
}

export interface SectionTagsFile {
  meta: CommonMeta & {
    method_fr: string;
    rules_file: string;
    title_weight: number;
    sections: number;
    /** Sections whose theme came from the best-hit or chapter fallback (no rule reached its threshold). */
    sections_with_theme_fallback: { id: string; theme: string; reason: 'best_hit' | 'chapter' }[];
    sections_without_life_situation: string[];
    /** Every 10th section in reading order, for human review: "id — title — tags". */
    review_sample: string[];
  };
  vocab: { life_situations: string[]; themes: string[] };
  sections: SectionTags[];
}

function sectionText(section: Section): { title: string; body: string } {
  const parts: string[] = [];
  for (const item of section.items) {
    parts.push(item.text);
    if (item.kind === 'measure' && item.subMeasures !== undefined) {
      for (const sub of item.subMeasures) parts.push(sub.text);
    }
  }
  return { title: normalizeForRules(section.title), body: normalizeForRules(parts.join('\n')) };
}

function weightedHits(rule: CompiledRule, title: string, body: string): number {
  return countRuleHits(rule, title) * TITLE_WEIGHT + countRuleHits(rule, body);
}

/**
 * Tags of one vocabulary for a section: weighted hits >= the rule's `min` and >= RELATIVE_MIN_FRACTION
 * of the best rule of that vocabulary, at most MAX_TAGS_PER_VOCAB (highest hits kept), returned in
 * vocabulary order. Records every non-zero hit count into `hits`.
 */
function assignTags(
  rules: readonly CompiledRule[],
  title: string,
  body: string,
  hits: Record<string, number>,
): string[] {
  const scored = rules.map((rule, order) => ({
    rule,
    order,
    hits: weightedHits(rule, title, body),
  }));
  const best = Math.max(0, ...scored.map((s) => s.hits));
  for (const { rule, hits: h } of scored) if (h > 0) hits[rule.tag] = h;
  return scored
    .filter(({ rule, hits: h }) => h >= rule.min && h >= best * RELATIVE_MIN_FRACTION)
    .sort((a, b) => b.hits - a.hits || a.order - b.order)
    .slice(0, MAX_TAGS_PER_VOCAB)
    .sort((a, b) => a.order - b.order)
    .map(({ rule }) => rule.tag);
}

export function tagSection(
  section: Section,
  chapter: Chapter,
  lifeRules: readonly CompiledRule[],
  themeRules: readonly CompiledRule[],
): { tags: SectionTags; fallback: { theme: string; reason: 'best_hit' | 'chapter' } | null } {
  const { title, body } = sectionText(section);
  const hits: Record<string, number> = {};
  const lifeSituations = assignTags(lifeRules, title, body, hits);
  const themes = assignTags(themeRules, title, body, hits);
  let fallback: { theme: string; reason: 'best_hit' | 'chapter' } | null = null;
  if (themes.length === 0) {
    const best = themeRules
      .map((rule) => ({ tag: rule.tag, hits: hits[rule.tag] ?? 0 }))
      .filter((r) => r.hits > 0)
      .sort((a, b) => b.hits - a.hits)[0];
    if (best !== undefined) {
      fallback = { theme: best.tag, reason: 'best_hit' };
    } else {
      const theme = CHAPTER_FALLBACK_THEME[chapter.id];
      if (theme === undefined) throw new Error(`No fallback theme for chapter ${chapter.id}`);
      fallback = { theme, reason: 'chapter' };
    }
    themes.push(fallback.theme);
  }
  return {
    tags: { id: section.id, title: section.title, life_situations: lifeSituations, themes, hits },
    fallback,
  };
}

function formatReviewLine(tags: SectionTags): string {
  const situations = tags.life_situations.length > 0 ? tags.life_situations.join(', ') : '(aucune)';
  return `${tags.id} — ${tags.title} — situations : ${situations} | thèmes : ${tags.themes.join(', ')}`;
}

export function buildSectionTags(dataset: Dataset): SectionTagsFile {
  const lifeRules = compileRules(LIFE_SITUATION_RULES);
  const themeRules = compileRules(THEME_RULES);
  const overlap = lifeRules.filter((l) => themeRules.some((t) => t.tag === l.tag));
  if (overlap.length > 0) {
    throw new Error(`Tags shared by both vocabularies: ${overlap.map((r) => r.tag).join(', ')}`);
  }
  for (const chapter of dataset.chapters) {
    const theme = CHAPTER_FALLBACK_THEME[chapter.id];
    if (theme === undefined || !themeRules.some((r) => r.tag === theme)) {
      throw new Error(`CHAPTER_FALLBACK_THEME[${chapter.id}] is not a theme of the vocabulary`);
    }
  }

  const sections: SectionTags[] = [];
  const fallbacks: SectionTagsFile['meta']['sections_with_theme_fallback'] = [];
  for (const { section, chapter } of sectionsInReadingOrder(dataset)) {
    const { tags, fallback } = tagSection(section, chapter, lifeRules, themeRules);
    sections.push(tags);
    if (fallback !== null) fallbacks.push({ id: section.id, ...fallback });
  }
  const reviewSample = sections.filter((_, index) => index % 10 === 0).map(formatReviewLine);

  return {
    meta: {
      ...commonMeta(dataset),
      method_fr: METHOD_FR,
      rules_file: 'scripts/tag-rules.ts',
      title_weight: TITLE_WEIGHT,
      sections: sections.length,
      sections_with_theme_fallback: fallbacks,
      sections_without_life_situation: sections
        .filter((s) => s.life_situations.length === 0)
        .map((s) => s.id),
      review_sample: reviewSample,
    },
    vocab: {
      life_situations: lifeRules.map((r) => r.tag),
      themes: themeRules.map((r) => r.tag),
    },
    sections,
  };
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

export interface RunSummary {
  corpus_version: string;
  files: string[];
  stat_cards: StatCardsFile['meta'] & {
    low_confidence: string[];
    paragraph_statistics: number;
  };
  terms: TermsFile['meta'] & { top_30: { term: string; count: number; score: number }[] };
  tags: SectionTagsFile['meta'] & {
    vocab: SectionTagsFile['vocab'];
    life_situation_usage: Record<string, number>;
    theme_usage: Record<string, number>;
  };
}

export function run(): RunSummary {
  const dataset = JSON.parse(readFileSync(DATASET_PATH, 'utf8')) as Dataset;

  const statCards = buildStatCards(dataset);
  writeJson(STAT_CARDS_PATH, statCards);

  const terms = buildTerms(dataset);
  writeJson(TERMS_PATH, terms);

  const tags = buildSectionTags(dataset);
  writeJson(SECTION_TAGS_PATH, tags);

  const usage = (pick: (s: SectionTags) => readonly string[]): Record<string, number> => {
    const counts = new Map<string, number>();
    for (const s of tags.sections)
      for (const tag of pick(s)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    return sortedHistogram(counts);
  };

  return {
    corpus_version: dataset.meta.corpus_version,
    files: [STAT_CARDS_PATH, TERMS_PATH, SECTION_TAGS_PATH],
    stat_cards: {
      ...statCards.meta,
      low_confidence: statCards.cards.filter((c) => c.parse_confidence === 'low').map((c) => c.id),
      paragraph_statistics: statCards.paragraph_statistics.length,
    },
    terms: {
      ...terms.meta,
      top_30: terms.candidates
        .slice(0, 30)
        .map((c) => ({ term: c.term, count: c.count, score: c.score })),
    },
    tags: {
      ...tags.meta,
      vocab: tags.vocab,
      life_situation_usage: usage((s) => s.life_situations),
      theme_usage: usage((s) => s.themes),
    },
  };
}

function printSummary(summary: RunSummary): void {
  const sc = summary.stat_cards;
  console.log('=== stat-cards ===');
  console.log(
    `cards ${String(sc.count)} | institute+date ${String(sc.with_institute_and_date)} | ` +
      `confidence ${JSON.stringify(sc.confidence)} | without % ${JSON.stringify(sc.without_percentage)}`,
  );
  console.log(`institutes ${JSON.stringify(sc.institutes)}`);
  console.log(
    `date range ${String(sc.date_range.earliest_text)} → ${String(sc.date_range.latest_text)}`,
  );
  console.log(`low confidence ${JSON.stringify(sc.low_confidence)}`);
  console.log(`paragraph statistics (outside "À savoir") ${String(sc.paragraph_statistics)}`);

  const t = summary.terms;
  console.log('\n=== terms-candidates ===');
  console.log(
    `documents ${String(t.documents)} | items ${String(t.items_scanned)} | candidates ` +
      `${String(t.candidates_total)} | kept ${String(t.kept)} | seeds present ${String(t.seeds_present.length)}`,
  );
  console.log(`seeds absent ${JSON.stringify(t.seeds_absent)}`);
  console.log(`seed count mismatches ${JSON.stringify(t.seed_count_mismatches)}`);
  console.log('top 30:');
  for (const c of t.top_30)
    console.log(`   ${c.term} (${String(c.count)}, score ${String(c.score)})`);

  const g = summary.tags;
  console.log('\n=== section-tags ===');
  console.log(
    `sections ${String(g.sections)} | life situations ${String(g.vocab.life_situations.length)} | ` +
      `themes ${String(g.vocab.themes.length)} | theme fallbacks ${JSON.stringify(g.sections_with_theme_fallback)}`,
  );
  console.log(`without life situation ${JSON.stringify(g.sections_without_life_situation)}`);
  console.log(`life situation usage ${JSON.stringify(g.life_situation_usage)}`);
  console.log(`theme usage ${JSON.stringify(g.theme_usage)}`);
  console.log('review sample:');
  for (const line of g.review_sample) console.log(`   ${line}`);
  console.log(`\nwrote ${summary.files.join(', ')}`);
}

const isMain =
  process.argv[1] !== undefined && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
  const summary = run();
  if (process.argv.includes('--json')) console.log(JSON.stringify(summary, null, 2));
  else printSummary(summary);
}
