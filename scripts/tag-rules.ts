/**
 * Closed vocabularies and keyword rules used by scripts/derive.ts to tag every section of
 * "L'Avenir en commun 2025" with life situations and field themes. Everything here is data:
 * the rules are applied deterministically (no LLM), so a human can read, review and edit them.
 *
 * Keyword mini-DSL (see `compileKeyword`):
 *   - a keyword is one or more words separated by spaces, matched on whole words, case- and
 *     apostrophe-insensitive, accents preserved ("école" does not match "ecole");
 *   - `*` at the end (or inside) of a word matches any continuation made of letters, digits or
 *     hyphens: "retrait*" matches "retraite", "retraités", "retraite-chapeau";
 *   - hyphens are literal and count as word characters ("mer" does not match "outre-mer"),
 *     apostrophes are boundaries ("école" matches "l'école").
 *
 * Scoring: every match counts 1 hit, a match in the section title counts `TITLE_WEIGHT` hits.
 * A tag is assigned when its weighted hits reach `min` (default `DEFAULT_MIN_HITS`) and at least
 * `RELATIVE_MIN_FRACTION` of the best tag of the same vocabulary in that section; at most
 * `MAX_TAGS_PER_VOCAB` tags of each vocabulary are kept (highest hits first).
 */

export interface TagRule {
  /** French label, part of the closed vocabulary shown to users. */
  tag: string;
  /** Keyword patterns (mini-DSL above), written with the `kw` template tag. */
  keywords: readonly string[];
  /** Minimum weighted hits to assign the tag; overrides `DEFAULT_MIN_HITS` for noisy keywords. */
  min?: number;
}

/** Keyword list literal: patterns separated by `|`, whitespace and line breaks ignored. */
export function kw(strings: TemplateStringsArray): readonly string[] {
  return strings
    .join('')
    .split('|')
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

export const DEFAULT_MIN_HITS = 2;
export const TITLE_WEIGHT = 3;
/**
 * A tag is also dropped when its hits are below this fraction of the best tag of the same vocabulary
 * in the section: it keeps incidental mentions ("écologique" in a tax section) from becoming tags.
 */
export const RELATIVE_MIN_FRACTION = 0.25;
/** Hard cap per vocabulary and section (highest hits win), for sections with many flat mentions. */
export const MAX_TAGS_PER_VOCAB = 6;

/** Life situations: who is directly concerned by the section. */
export const LIFE_SITUATION_RULES: readonly TagRule[] = [
  {
    tag: 'élève / lycéen·ne',
    keywords: kw`
      élève* | écolier* | collégien* | lycéen* | lycée* | collège* | baccalauréat | école* |
      scolaire* | cantine*`,
    min: 3,
  },
  {
    tag: 'étudiant·e',
    keywords: kw`
      étudiant* | université* | universitaire* | enseignement supérieur | parcoursup | crous |
      doctorant* | doctorat | thèse* | campus | licence | master`,
  },
  {
    tag: 'jeune (18-30 ans)',
    keywords: kw`
      jeune* | jeunesse | 18 ans | 25 ans | allocation d'autonomie | garantie d'autonomie |
      service citoyen | conscription | apprenti* | premier emploi`,
    min: 3,
  },
  {
    tag: 'enfant / adolescent·e',
    keywords: kw`
      enfant* | enfance | mineur* | adolescent* | crèche* | nourrisson* | bébé* |
      aide sociale à l'enfance | pédocriminalité | pédocriminel*`,
    min: 3,
  },
  {
    tag: 'parent',
    keywords: kw`
      parent* | famille* | familial* | crèche* | petite enfance | congé parental |
      congé maternité | congé paternité | garde d'enfant* | allocations familiales |
      monoparental* | mère* | père*`,
    min: 3,
  },
  {
    tag: 'salarié·e',
    keywords: kw`
      salarié* | salariat | travailleur* | travailleuse* | employé | employés | employée |
      employées | cdi | cdd | licenciement* | syndicat* | syndical* | temps de travail |
      contrat de travail | code du travail | smic | salaire* | heures supplémentaires |
      comité* social* | prud'hom* | intérim*`,
  },
  {
    tag: 'indépendant·e / artisan·e / commerçant·e',
    keywords: kw`
      indépendant* | auto-entrepreneur* | autoentrepreneur* | micro-entrepreneur* | artisan* |
      commerçant* | profession* libérale* | tpe | très petites entreprises | ubéris* | uberis* |
      plateformes numériques | petits commerces | petites entreprises`,
  },
  {
    tag: 'fonctionnaire / agent·e public·que',
    keywords: kw`
      fonctionnaire* | fonction publique | agent* public* | agents de l'état | agents publics |
      agents territoriaux | agents de la fonction publique | statut de la fonction publique |
      statut général | titularis* | contractuel*`,
    min: 3,
  },
  {
    tag: "chômeur·se / demandeur·se d'emploi",
    keywords: kw`
      chômeur* | chômage | demandeur* d'emploi | privé* d'emploi | france travail |
      pôle emploi | assurance-chômage | assurance chômage | sans emploi | garantie d'emploi |
      radiation* | indemnisation du chômage`,
  },
  {
    tag: 'retraité·e',
    keywords: kw`
      retraité* | retraite* | pension* | seniors | personnes âgées | âgées | ehpad |
      vieillesse | grand âge | vieillissement`,
  },
  {
    tag: "personne en perte d'autonomie / aidant·e",
    keywords: kw`
      perte d'autonomie | dépendance | aidant* | ehpad | maintien à domicile | aide à domicile |
      gérontolog* | grand âge`,
  },
  {
    tag: 'personne en situation de handicap',
    keywords: kw`
      handicap* | aah | mdph | accessibilité | autis* | invalidité | mobilité réduite | aesh |
      esat | langue des signes | sourd* | aveugle* | malvoyant* | prestation de compensation`,
  },
  {
    tag: 'malade / patient·e',
    keywords: kw`
      malade* | patient* | maladie* | hôpital* | hospitalier* | hospitalisation* | soins |
      soin | cancer* | affection* de longue durée | santé mentale | psychiatri* | médicament* |
      urgences | dépistage* | soins palliatifs | ordonnance* | addiction* | usagers de drogues |
      toxicoman* | réduction des risques`,
    min: 3,
  },
  {
    tag: 'femme',
    keywords: kw`
      femme* | féminin* | féminis* | sexiste* | sexisme | violences sexuelles |
      violences conjugales | égalité femmes-hommes | ivg | avortement | contraception | parité |
      féminicide* | maternité | menstruel* | endométriose | patriarca* | prostitution`,
    min: 3,
  },
  {
    tag: 'personne LGBTQIA+',
    keywords: kw`
      lgbt* | homophob* | transphob* | homosexu* | orientation sexuelle | identité de genre |
      transidentit* | transgenre* | personnes trans | intersex* | pma |
      thérapies de conversion | lesbophob* | biphob*`,
  },
  {
    tag: 'locataire / mal-logé·e',
    keywords: kw`
      locataire* | loyer* | location* | logement* socia* | hlm | bail | baux | bailleur* |
      expulsion* locative* | passoire* thermique* | mal-logé* | mal-logement | sans-abri | sdf |
      hébergement | sans domicile | squat* | marchands de sommeil | trêve hivernale`,
  },
  {
    tag: 'propriétaire',
    keywords: kw`
      propriétaire* | accession à la propriété | copropriété* | résidence principale |
      prêt* immobilier* | plus-value* immobilière* | rénovation énergétique | isolation |
      taxe foncière | résidences secondaires | logements vacants`,
    min: 3,
  },
  {
    tag: 'agriculteur·rice / pêcheur·se',
    keywords: kw`
      agriculteur* | agricultrice* | paysan* | paysanne* | exploitation* agricole* | agricole* |
      agriculture | éleveur* | élevage* | pêcheur* | pêche | viticulteur* | ferme | fermes |
      fermes-usines | msa | maraîch* | foncier agricole | installation des jeunes agriculteurs |
      aquaculture | aquaculteur*`,
    min: 3,
  },
  {
    tag: 'habitant·e des Outre-mer',
    keywords: kw`
      outre-mer | ultramarin* | guadeloupe | martinique | guyane | la réunion | mayotte |
      kanak* | kanaky | nouvelle-calédonie | polynésie | saint-pierre-et-miquelon |
      wallis-et-futuna | antilles | antillais* | caraïbe* | chlordécone | drom | océan indien`,
  },
  {
    tag: 'habitant·e des zones rurales',
    keywords: kw`
      rural* | ruralité | zones rurales | monde rural | village* | territoires ruraux |
      désert* médica* | petites villes | bourg | bourgs | campagnes rurales |
      zones de montagne | montagne`,
    min: 3,
  },
  {
    tag: 'habitant·e des villes / quartiers populaires',
    keywords: kw`
      urbain* | ville* | quartier* | quartiers populaires | métropoles | banlieue* |
      périurbain* | agglomération* | politique de la ville`,
    min: 3,
  },
  {
    tag: 'personne étrangère / immigrée',
    keywords: kw`
      étrangers | travailleurs étrangers | étudiants étrangers | immigré* | immigration |
      migrant* | migratoire* | migration* | réfugié* | demandeur* d'asile | asile |
      sans-papiers | régularis* | titre* de séjour | naturalisation* | ofpra | cnda | exilé* |
      visa* | binational* | droit du sol`,
    min: 3,
  },
  {
    tag: 'personne victime de racisme / discriminations',
    keywords: kw`
      racis* | discrimination* | antisémit* | islamophob* | xénophob* | contrôle* au faciès |
      récépissé | roms | gens du voyage | discriminé* | universalis*`,
  },
  {
    tag: 'personne en situation de pauvreté / précarité',
    keywords: kw`
      pauvre* | pauvreté | précaire* | précarité | minima sociaux | rsa | sans-abri | sdf |
      surendettement | frais bancaires | aide alimentaire | banque* alimentaire* | exclusion |
      grande pauvreté | garantie d'autonomie | seuil de pauvreté`,
    min: 3,
  },
  {
    tag: 'artiste / auteur·rice',
    keywords: kw`
      artiste* | autrice* | auteurs et autrices | artistes-auteurs | intermittent* |
      création artistique | spectacle* | droits d'auteur | musicien* | comédien* | compagnies |
      artistique*`,
  },
  {
    tag: 'sportif·ve',
    keywords: kw`
      sportif* | sportive* | sport | sports | athlète* | clubs | fédération* sportive* |
      jeux olympiques | olympique* | paralympique* | éducation physique | supporters`,
  },
  {
    tag: 'chercheur·se / enseignant·e',
    keywords: kw`
      enseignant* | professeur* | chercheur* | chercheuse* | enseignant-chercheur* | cnrs |
      laboratoire* | recherche publique | doctorant* | universitaire* | instituteur* |
      formateur*`,
    min: 3,
  },
  {
    tag: 'soignant·e / personnel de santé',
    keywords: kw`
      soignant* | infirmier* | infirmière* | aide-soignant* | médecin* |
      personnel* hospitalier* | personnels soignants | pharmacien* | sage-femme* |
      sages-femmes | professionnels de santé | internes | numerus clausus`,
  },
  {
    tag: 'policier·ère / gendarme',
    keywords: kw`
      policier* | policière* | gendarme* | gendarmerie | forces de l'ordre | igpn |
      commissariat* | police de proximité | agents de police | brigade*`,
    min: 3,
  },
  {
    tag: 'militaire / ancien·ne combattant·e',
    keywords: kw`
      militaire* | armée* | soldat* | vétéran* | anciens combattants | blessés de guerre |
      blessés psychiques | réserviste* | marine nationale | aviateur*`,
    min: 3,
  },
  {
    tag: 'consommateur·rice / usager·ère',
    keywords: kw`
      consommateur* | consommatrice* | consommer | usager* | usagère* | utilisateur* |
      utilisatrice* | internaute* | abonné* | client* | tarif* réglementé* | compteur* |
      facture* | garantie légale`,
    min: 3,
  },
  {
    tag: 'victime / justiciable',
    keywords: kw`
      victime* | justiciable* | plainte* | dépôt de plainte | aide juridictionnelle | détenu* |
      prisonnier* | prévenu* | condamné* | réparation des victimes`,
    min: 3,
  },
];

/** Field themes: what the section is about. Every section gets at least one theme. */
export const THEME_RULES: readonly TagRule[] = [
  {
    tag: "pouvoir d'achat",
    keywords: kw`
      pouvoir d'achat | prix | inflation | blocage des prix | bloquer les prix |
      bloquer le prix | hausse des prix | baisse des prix | vie chère | tarif* réglementé* |
      coût de la vie | facture* | frais bancaires | gratuité | gratuit* | cherté |
      bouclier tarifaire | bouclier qualité-prix | quotient familial | première nécessité`,
    min: 3,
  },
  {
    tag: 'salaires',
    keywords: kw`
      salaire* | smic | rémunération* | échelle des salaires | écart* de salaire* |
      revenus du travail | prime* | minimum salarial | grille* salariale* | point d'indice |
      égalité salariale | salarial*`,
  },
  {
    tag: 'retraites',
    keywords: kw`
      retraite* | retraité* | pension* | âge légal | 60 ans | trimestre* | minimum vieillesse |
      annuité* | pénibilité | agirc* | régime* de retraite`,
  },
  {
    tag: 'logement',
    keywords: kw`
      logement* | loyer* | locataire* | hlm | bailleur* | propriétaire* | immobilier* |
      immobilière* | sans-abri | hébergement | mal-logement | mal-logé* | passoire* thermique* |
      encadrement des loyers | habitat* | habitation* | expulsion* locative* | foncier |
      foncière* | squat* | rénovation* | isolation | bâtiment* | construction de logements`,
  },
  {
    tag: 'santé',
    keywords: kw`
      santé | hôpital* | hospitalier* | hospitalière* | médecin* | soins | soin | maladie* |
      malade* | médicament* | sécurité sociale | assurance maladie | pandémie* | épidémi* |
      psychiatri* | santé mentale | cancer* | vaccin* | remboursement* | désert* médica* |
      mutuelle* | urgences | addiction* | drogue* | cannabis | tabac | alcool | malbouffe |
      nutrition* | sanitaire* | soignant* | infirmier* | infirmière* | patient* | dépistage* |
      lits`,
  },
  {
    tag: 'école / éducation',
    keywords: kw`
      école* | éducation | éducatif* | éducative* | scolaire* | scolarité | élève* |
      enseignant* | professeur* | lycée* | lycéen* | collège* | collégien* | université* |
      universitaire* | enseignement | cantine* | illettrisme | alphabétisation |
      formation initiale | formation des enseignants | apprentissage | pédagogi* | parcoursup |
      étudiant* | crèche* | petite enfance | instruction | qualification* | baccalauréat |
      diplôme* | programmes scolaires | rectorat* | aesh | périscolaire`,
  },
  {
    tag: 'recherche / sciences',
    keywords: kw`
      recherche | scientifique* | chercheur* | chercheuse* | cnrs | laboratoire* | science* |
      innovation* | brevet* | doctorant* | doctorat | thèse* | crédit impôt recherche | cir |
      anr | sciences humaines | découverte*`,
    min: 3,
  },
  {
    tag: 'espace / spatial',
    keywords: kw`
      spatial* | spatiaux | satellite* | ariane* | cnes | orbite* | orbital* | lune | lunaire |
      astronaute* | spationaute* | esa | agence spatiale | kourou | espace extra-atmosphérique |
      conquête spatiale | station spatiale | lanceur* | débris spatiaux`,
  },
  {
    tag: 'écologie / climat',
    keywords: kw`
      écologi* | climat* | biodiversité | gaz à effet de serre | carbone | émission* |
      réchauffement | pollution* | pollu* | polluant* | environnement* | écosystème* |
      planification écologique | bifurcation écologique | règle verte | forêt* | forestier* |
      forestière* | déchet* | recyclage | plastique* | pesticide* | glyphosate | écocide |
      nature | espèces | artificialisation | sols | zones humides | arbre* | renaturation |
      protection de la nature | catastrophe* naturelle* | ges`,
  },
  {
    tag: 'énergie',
    keywords: kw`
      énergie* | énergétique* | électricité | électrique* | gaz naturel | gaz de schiste |
      tarif* du gaz | prix du gaz | électricité et du gaz | gaz et de l'électricité |
      fournisseurs de gaz | nucléaire* | renouvelable* | éolien* | solaire* | photovoltaïque* |
      fioul | pétrole | pétrolier* | fossile* | edf | hydroélectr* | hydrogène |
      rénovation thermique | isolation | réacteur* | epr | charbon | barrage* |
      centrale* nucléaire* | centrale* électrique* | centrales à charbon | sobriété |
      précarité énergétique | chauffage | pompes à chaleur | méthanisation |
      tarifs réglementés | asn | irsn`,
  },
  {
    tag: 'transports',
    keywords: kw`
      transport* | mobilité* | train* | ferroviaire* | sncf | rail | tgv | ter | fret |
      voiture* | automobile* | véhicule* | vélo* | cyclable* | cycliste* | autoroute* |
      routier* | routière* | aérien* | aérienne* | avion* | aéroport* | bus | tramway* | métro |
      métros | fluvial* | fluviaux | canal | canaux | portuaire* | covoiturage |
      permis de conduire | lignes ferroviaires | petites lignes | gare | gares | électrique* |
      trajet* | poids lourds | camion* | péage*`,
    min: 3,
  },
  {
    tag: 'sécurité / police',
    keywords: kw`
      police* | policier* | policière* | gendarmerie | gendarme* | sûreté | délinquance |
      criminalité | criminel* | forces de l'ordre | igpn | bac | brigade* |
      maintien de l'ordre | terroris* | armes | armement des policiers | violences policières |
      vidéosurveillance | renseignement | insécurité | commissariat* | police de proximité |
      police municipale | sécurité publique | attentat* | lbd | grenade* |
      contrôle* d'identité`,
  },
  {
    tag: 'justice',
    keywords: kw`
      justice | judiciaire* | tribunal* | tribunaux | magistrat* | juge* | prison* |
      pénitentiaire* | détenu* | détention | peine* | avocat* | procès | aide juridictionnelle |
      code pénal | pénal* | récidive | juridiction* | procureur* | parquet | cour de cassation |
      prud'hom* | greffier* | garde à vue | condamn* | infraction* | délit* | impunité |
      contentieux | jury | jurés`,
  },
  {
    tag: 'immigration / asile',
    keywords: kw`
      immigration | immigré* | migrant* | migratoire* | migration* | réfugié* | asile |
      sans-papiers | régularis* | frontex | frontière* | titre* de séjour | naturalisation* |
      ofpra | cnda | étrangers | travailleurs étrangers | étudiants étrangers | visa* | exilé* |
      expulsion* du territoire | quota* | droit du sol | centres de rétention |
      rétention administrative | dublin | ceseda`,
    min: 3,
  },
  {
    tag: 'Europe',
    keywords: kw`
      europe | européen* | européenne* | union européenne | ue | bruxelles | traité* européen* |
      traités | traité de lisbonne | euro | bce | banque centrale européenne |
      commission européenne | parlement européen | pacte de stabilité | désobéi* |
      désobéissance | marché unique | travail détaché | travailleurs détachés | schengen |
      politique agricole commune | plan a | plan b | frontex | cour de justice de l'union |
      directive* | règlement* européen* | euratom`,
    min: 3,
  },
  {
    tag: 'international / paix',
    keywords: kw`
      international* | paix | guerre* | onu | nations unies | otan | diplomati* | mondial* |
      altermondialis* | alter-mondialis* | francophon* | afrique | africain* | méditerran* |
      coopération* | pays du sud | colonial* | colonisation | décolonisation | amérique latine |
      chine | russie | états-unis | ukraine | palestin* | israël | sahel | désarmement |
      libre-échange | protectionnisme | ceta | tafta | mercosur | omc | fmi | banque mondiale |
      aide au développement | droit international | traité | traités | multilatéral* |
      non-alignement | non-aligné* | ingérence* | ambassade* | peuples |
      souveraineté des peuples | francophonie | accord* international* |
      accord* de libre-échange`,
  },
  {
    tag: 'défense / armée',
    keywords: kw`
      défense nationale | défense souveraine | politique de défense | ministère de la défense |
      budget de la défense | défense européenne | armée* | militaire* | soldat* | otan |
      dissuasion | armement* | industrie de défense | ventes d'armes | marché* d'armes |
      service militaire | conscription | anciens combattants | blessés de guerre |
      blessés psychiques | marine nationale | cyberdéfense | réserviste* | esprit de défense |
      opex | opérations extérieures | bases militaires | nucléaire militaire |
      arme* nucléaire* | désarmement`,
    min: 3,
  },
  {
    tag: 'démocratie / institutions',
    keywords: kw`
      démocrati* | république | constituante | constitution* | constitutionnel* | référendum* |
      ric | assemblée* | parlement* | parlementaire* | sénat | député* | élu* | élue* |
      élection* | électoral* | électorale* | scrutin* | proportionnelle | vote* | votation* |
      monarchie présidentielle | président* | présidentiel* | présidentielle* | 49.3 | 49-3 |
      institution* | oligarchie | lobby* | lobbies | conflits d'intérêts | corruption |
      tirage au sort | révocation | révocatoire | mandat électif | mandats électifs |
      cumul des mandats | souveraineté populaire | intervention populaire | pouvoir au peuple |
      conseil constitutionnel | haute autorité | pantouflage | processus constituant`,
  },
  {
    tag: 'territoires / collectivités locales',
    keywords: kw`
      commune | communes | communal* | communaux | collectivité* territoriale* |
      collectivités locales | collectivités | intercommunal* | métropoles | département* |
      région* | territoires | territorial* | décentralisation | maire* | mairie* | ruralité |
      rural* | aménagement du territoire | égalité des territoires | dotation* |
      services publics de proximité`,
    min: 3,
  },
  {
    tag: 'impôts / fiscalité',
    keywords: kw`
      impôt* | fiscal* | fiscalité | taxe* | taxation* | taxer | tva | isf | niche* fiscale* |
      évasion fiscale | fraude fiscale | paradis fiscaux | tranche* | prélèvement* |
      contribuable* | redevance* | csg | impôt universel | flat tax | exil fiscal |
      optimisation fiscale | héritage* | succession* | cotisation* | exonération* |
      crédit* d'impôt | cice | progressivité | progressif | progressive`,
  },
  {
    tag: 'travail',
    keywords: kw`
      travail | travailleur* | travailleuse* | emploi* | chômage | chômeur* | salarié* |
      syndica* | licenciement* | cdd | cdi | temps de travail | 32 heures | 35 heures |
      semaine de 4 jours | heures supplémentaires | code du travail | prud'hom* |
      inspection du travail | médecine du travail | burn-out | souffrance au travail |
      accident* du travail | conditions de travail | garantie d'emploi |
      sécurité sociale professionnelle | télétravail | ubéris* | uberis* | reconversion* |
      formation professionnelle | assurance-chômage | assurance chômage | congé* | embauche* |
      embaucher | intérim* | précarité | contrat* de travail | métier* | carrière* |
      comité* social* et économique* | cse | représentants du personnel | droit de grève |
      grève*`,
  },
  {
    tag: 'entreprise / industrie',
    keywords: kw`
      entreprise* | industrie* | industriel* | industrielle* | réindustrialis* | relocalis* |
      délocalis* | filière* | production | producteur* | productif* | productive* | pme | tpe |
      patronat | patron* | actionnaire* | coopérative* | scop | économie sociale | ess |
      nationalis* | pôle public | made in france | sous-traitance | commerce | artisanat |
      protectionnisme | usine* | aides publiques aux entreprises | aides aux entreprises |
      brevet* | concurrence | monopole* | oligopole* | multinationale* | grands groupes |
      grandes entreprises | conseil* d'administration | reprise* d'entreprise* |
      droit de préemption`,
  },
  {
    tag: 'finance / banques / dette',
    keywords: kw`
      banque* | bancaire* | finance | financier* | financière* | financiarisation |
      définanciaris* | spéculation | spéculatif* | spéculative* | spéculateur* | bourse |
      actionnaire* | dividende* | dette | créancier* | bce | crédit* | produits dérivés |
      trading | marchés financiers | paradis fiscaux | blanchiment | fonds de pension |
      fonds vautours | séparation bancaire | pôle public bancaire | livret* a | épargne | prêt |
      prêts | taux d'intérêt | déficit* | budget* | budgétaire* | monnaie | monétaire* |
      cryptomonnaie* | cryptoactif* | assurances | assureur* | compagnies d'assurance |
      capital | capitaux | investisseur* | faillite* | agences de notation | rachat* d'actions`,
    min: 3,
  },
  {
    tag: 'services publics',
    keywords: kw`
      service* public* | fonction publique | fonctionnaire* | agent* public* | la poste | edf |
      sncf | privatisation* | privatisé* | nationalisation* | renationalis* | pôle public |
      maison* france services | accès aux services | école publique | hôpital public |
      établissements publics | entreprises publiques | monopole public | régie* publique* |
      collectivis* | biens communs | bien commun | égalité des territoires | guichet* unique*`,
    min: 3,
  },
  {
    tag: 'culture',
    keywords: kw`
      culture | culturel* | culturelle* | art | arts | artiste* | artistique* |
      création artistique | spectacle* | cinéma* | musique* | musical* | musée* | patrimoine |
      patrimonial* | bibliothèque* | livre | livres | librairie* | théâtre* | danse |
      festival* | intermittent* | droits d'auteur | auteurs et autrices | autrice* |
      langues régionales | langue française | archives | éducation artistique |
      pratiques amateurs | conservatoire* | jeu vidéo | jeux vidéo | friches`,
  },
  {
    tag: 'sport',
    keywords: kw`
      sport | sports | sportif* | sportive* | olympique* | olympisme | paralympique* |
      athlète* | clubs | fédération* sportive* | éducation physique | eps | stade* | piscine* |
      dopage | compétition* | supporters | équipements sportifs | pratique sportive |
      activité physique`,
  },
  {
    tag: 'numérique',
    keywords: kw`
      numérique* | internet | informatique* | logiciel* | données | donnée | algorithme* |
      intelligence artificielle | ia | plateforme* | réseaux sociaux | gafam | google | amazon |
      facebook | apple | microsoft | meta | cyber* | fibre | télécom* | 5g |
      souveraineté numérique | open source | logiciels libres | logiciel libre |
      données personnelles | cnil | fracture numérique | dématérialisation | cloud | serveur* |
      hébergement de données | neutralité du net | code source | communs numériques |
      illectronisme | très haut débit | câbles sous-marins | datacenter* | centres de données |
      clé usb | chiffrement | reconnaissance faciale | électronique*`,
  },
  {
    tag: 'alimentation / agriculture',
    keywords: kw`
      alimentation | alimentaire* | agricultur* | agricole* | agriculteur* | agricultrice* |
      paysan* | paysanne* | agroécologi* | agro-écologi* | bio | biologique* | pesticide* |
      glyphosate | cantine* | malbouffe | nutrition* | nutritionnel* | élevage* | éleveur* |
      ferme* | fermes-usines | pêche | pêcheur* | aquaculture | souveraineté alimentaire |
      viande | sucre | sel | circuits courts | politique agricole commune | pac |
      foncier agricole | safer | semence* | ogm | engrais | terres agricoles | maraîch* |
      restauration collective | produits frais | nourriture | nourrir | manger | repas |
      gaspillage alimentaire | agroalimentaire | agro-alimentaire | label* | aop | aoc |
      famine* | faim`,
  },
  {
    tag: 'eau',
    keywords: kw`
      eau | eaux | hydrique* | hydraulique* | nappe* | rivière* | fleuve* | sécheresse* |
      irrigation | mégabassine* | méga-bassine* | bassine* | assainissement | potable |
      compteurs d'eau | inondation* | zones humides | aquifère* | cours d'eau |
      bassin* versant* | crues | agences de l'eau | ressource en eau | canalisations | fuites`,
  },
  {
    tag: 'mer / océans',
    keywords: kw`
      mer | mers | océan* | maritime* | littoral* | littoraux | marin | marine | marins |
      marines | pêche | pêcheur* | plateau continental | zee | zone économique exclusive |
      flotte | navire* | corail | coraux | coralien* | aires marines | mangrove* | côtes |
      côtier* | côtière* | portuaire* | ports | sargasses | chalutage | chalut* | grands fonds |
      fonds marins | haute mer | plaisance | sous-marin* | récifs`,
  },
  {
    tag: 'animaux',
    keywords: kw`
      animal | animaux | animale | animales | bien-être animal | maltraitance animale |
      élevage* intensif* | corrida | chasse | chasseur* | fourrure | abattoir* | abattage |
      expérimentation animale | espèces | faune | fermes-usines | animaux de compagnie |
      cirque* | braconnage | delphinarium* | zoo | zoos | condition animale | cause animale |
      sentience | sensibilité animale | trafic* d'animaux | spécisme | antispécis*`,
  },
  {
    tag: 'laïcité',
    keywords: kw`
      laïc* | laïque* | laïcité | religio* | religieux | religieuse* | culte* | cultuel* |
      concordat | alsace-moselle | loi de 1905 | 1905 | séparation des églises | blasphème |
      secte | sectes | sectaire* | église* | clergé | confession* | confessionnel* | athée* |
      agnostique* | croyant* | non-croyant*`,
  },
  {
    tag: 'égalité femmes-hommes',
    keywords: kw`
      femme* | égalité femmes-hommes | égalité entre les femmes et les hommes |
      égalité salariale | sexis* | féminis* | féminicide* | violences sexuelles |
      violences sexistes | violences conjugales | violences faites aux femmes | parité | ivg |
      avortement | contraception | harcèlement | patriarca* | congé parental | congé maternité |
      congé paternité | menstruel* | endométriose | prostitution | maternité | genre | sexuel* |
      sexuelle* | stéréotypes`,
    min: 3,
  },
  {
    tag: 'LGBTQIA+',
    keywords: kw`
      lgbt* | homophob* | transphob* | homosexu* | orientation sexuelle | identité de genre |
      transidentit* | transgenre* | personnes trans | intersex* | pma | mariage pour tous |
      thérapies de conversion | changement de sexe | lesbophob* | biphob* | mention de sexe |
      homoparental*`,
  },
  {
    tag: 'handicap',
    keywords: kw`
      handicap* | aah | mdph | accessibilité | accessibles aux personnes | autis* | invalidité |
      mobilité réduite | pmr | inclusion scolaire | aesh | esat | langue des signes | lsf |
      braille | sourd* | aveugle* | malvoyant* | malentendant* | trisomie |
      prestation de compensation | pch | école inclusive | compensation du handicap`,
  },
  {
    tag: 'jeunesse / enfance',
    keywords: kw`
      jeune* | jeunesse | étudiant* | enfant* | enfance | adolescent* | mineur* |
      allocation d'autonomie | garantie d'autonomie | service civique | service citoyen |
      18 ans | protection de l'enfance | aide sociale à l'enfance | autonomie des jeunes |
      lycéen* | apprenti* | premier emploi | crèche* | petite enfance | pédocriminalité |
      pédocriminel* | écrans | nourrisson* | bébé*`,
    min: 3,
  },
  {
    tag: 'famille / parentalité',
    keywords: kw`
      famille* | familial* | familiale* | parent* | parentalité | crèche* | petite enfance |
      garde d'enfant* | allocations familiales | congé parental | congé maternité |
      congé paternité | adoption | filiation | mariage | pacs | divorce |
      pension* alimentaire* | monoparental* | mère* | père* | natalité | maternité | conjoint |
      conjoints | couple*`,
    min: 3,
  },
  {
    tag: 'grand âge / autonomie',
    keywords: kw`
      perte d'autonomie | dépendance | ehpad | personnes âgées | âgées | grand âge |
      maintien à domicile | aide à domicile | aidant* | seniors | vieillissement | gérontolog* |
      retraité* | vieillesse | fin de vie | euthanasie | suicide assisté |
      mourir dans la dignité | soins palliatifs`,
    min: 3,
  },
  {
    tag: 'solidarité / protection sociale',
    keywords: kw`
      pauvreté | pauvre* | précarité | précaire* | minima sociaux | rsa | prestation* sociale* |
      allocation* | aides sociales | aide sociale | garantie d'autonomie | sécurité sociale |
      cmu | apl | protection sociale | solidarité | solidaire* | entraide | exclusion |
      sans-abri | sdf | aide alimentaire | surendettement | frais bancaires | gratuité |
      gratuit* | droits sociaux | minimum garanti | revenu minimum | hébergement d'urgence |
      économie sociale et solidaire | ess | coopératives | mutuelle* | mutualis* |
      cotisations sociales | redistribution | inégalités`,
    min: 3,
  },
  {
    tag: 'égalité / lutte contre les discriminations',
    keywords: kw`
      racis* | discrimination* | antisémit* | islamophob* | xénophob* | égalité des droits |
      contrôle* au faciès | récépissé | universalis* | roms | gens du voyage | esclavage |
      réparations | mémoire | colonial* | égalité réelle | discriminé* | testing | apartheid |
      ségrégation | stigmatis* | préjugé* | haine`,
    min: 3,
  },
  {
    tag: 'libertés / droits fondamentaux',
    keywords: kw`
      liberté* | libertés publiques | état d'urgence permanent | état d'urgence sanitaire |
      sortir de l'état d'urgence | régime d'exception | mesures d'exception | surveillance |
      vie privée | fichage | fichier* | censure | droit de manifester | manifestation* |
      manifestant* | droits fondamentaux | droits humains | droits de l'homme | euthanasie |
      fin de vie | suicide assisté | liberté d'expression | vidéosurveillance |
      reconnaissance faciale | données personnelles | émancipation | anonymat |
      lanceur* d'alerte | lanceuse* d'alerte | liberticide* | répression | garde à vue |
      nasse* | assignation* à résidence | perquisition* | drogues | cannabis |
      libre disposition de son corps | cimetière* | obsèques | funéraire*`,
    min: 3,
  },
  {
    tag: 'médias',
    keywords: kw`
      média* | medias | presse | journalis* | audiovisuel* | télévision* | télé | radio |
      radios | chaîne* de télévision | chaînes publiques | désinformation | fake news |
      concentration des médias | arcom | csa | liberté de la presse | pluralisme | publicité* |
      publicitaire* | réseaux sociaux | propriété des médias | conseil national des médias |
      déontologie des médias | rédactions | liberté d'informer | éditorial* | sondage* |
      instituts de sondage | affichage | panneaux publicitaires`,
    min: 3,
  },
  {
    tag: 'consommation / déchets',
    keywords: kw`
      consommation | consommer | consommateur* | consommatrice* | déchet* | zéro déchet |
      recyclage | recycl* | obsolescence programmée | obsolescence | réparabilité | réparable* |
      publicité* | plastique* | emballage* | surconsommation | gaspillage | réemploi |
      consigne | garantie légale | durée de vie | jetable* | suremballage | vrac |
      seconde main | compost* | tri | incinérateur* | incinération | décharge* | enfouissement`,
    min: 3,
  },
  {
    tag: 'Outre-mer',
    keywords: kw`
      outre-mer | ultramarin* | guadeloupe | martinique | guyane | la réunion | mayotte |
      kanak* | kanaky | nouvelle-calédonie | polynésie | saint-pierre-et-miquelon |
      wallis-et-futuna | antilles | antillais* | caraïbe* | océan indien | chlordécone |
      pacifique | drom | continuité territoriale | octroi de mer | sargasses | saint-martin |
      saint-barthélemy | terres australes`,
  },
];

/**
 * Safety net: theme assigned when no theme rule reaches its threshold and no rule has any hit at
 * all (should never happen; recorded in the output meta when it does), keyed by chapter id.
 */
export const CHAPTER_FALLBACK_THEME: Readonly<Record<string, string>> = {
  c1: 'démocratie / institutions',
  c2: 'services publics',
  c3: 'démocratie / institutions',
  c4: 'libertés / droits fondamentaux',
  c5: 'école / éducation',
  c6: 'finance / banques / dette',
  c7: 'solidarité / protection sociale',
  c8: 'travail',
  c9: 'entreprise / industrie',
  c10: 'égalité / lutte contre les discriminations',
  c11: 'culture',
  c12: 'écologie / climat',
  c13: 'écologie / climat',
  c14: 'écologie / climat',
  c15: 'santé',
  c16: 'international / paix',
  c17: 'Europe',
  c18: 'numérique',
};

/** Method description stored in data/section-tags.json (shown on the methodology page). */
export const METHOD_FR =
  'Étiquetage déterministe par règles (aucune IA) : pour chaque section, le titre, les paragraphes, ' +
  'les mesures clés, les mesures et les sous-mesures sont comparés à des listes de mots-clés par étiquette ' +
  '(scripts/tag-rules.ts). Chaque occurrence compte 1 point, une occurrence dans le titre compte ' +
  `${String(TITLE_WEIGHT)} points ; une étiquette est attribuée à partir de ${String(DEFAULT_MIN_HITS)} points ` +
  `(seuil relevé à 3 pour les mots-clés ambigus) et d'au moins ${String(RELATIVE_MIN_FRACTION * 100)} % du score de ` +
  `la meilleure étiquette du même vocabulaire dans la section (au plus ${String(MAX_TAGS_PER_VOCAB)} étiquettes par vocabulaire). ` +
  'Deux vocabulaires fermés : situations de vie (qui est concerné) ' +
  'et thèmes (de quoi parle la section). Chaque section reçoit au moins un thème : à défaut de seuil atteint, ' +
  'le thème le plus cité, sinon le thème par défaut du chapitre. Les textes ne sont ni modifiés ni résumés.';

function escapeRegExp(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Word boundary that treats hyphens as word characters ("mer" ≠ "outre-mer") but not apostrophes,
 * so that elided forms match ("l'école" contains the word "école").
 */
const BOUNDARY_BEFORE = '(?<![\\p{L}\\p{N}-])';
const BOUNDARY_AFTER = '(?![\\p{L}\\p{N}-])';
const CONTINUATION = '[\\p{L}\\p{N}-]*';

/** Compile one mini-DSL keyword into a global, Unicode-aware regular expression. */
export function compileKeyword(keyword: string): RegExp {
  const words = normalizeForRules(keyword)
    .split(/\s+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) throw new Error(`Empty keyword: "${keyword}"`);
  const body = words
    .map((word) => word.split('*').map(escapeRegExp).join(CONTINUATION))
    .join('\\s+');
  return new RegExp(`${BOUNDARY_BEFORE}${body}${BOUNDARY_AFTER}`, 'gu');
}

/** Normalization applied to rule keywords and to the tagged texts alike. */
export function normalizeForRules(text: string): string {
  return text.normalize('NFC').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim();
}

export interface CompiledRule {
  tag: string;
  min: number;
  patterns: readonly RegExp[];
}

export function compileRules(rules: readonly TagRule[]): CompiledRule[] {
  const seen = new Set<string>();
  return rules.map((rule) => {
    if (seen.has(rule.tag)) throw new Error(`Duplicate tag: "${rule.tag}"`);
    seen.add(rule.tag);
    return {
      tag: rule.tag,
      min: rule.min ?? DEFAULT_MIN_HITS,
      patterns: rule.keywords.map(compileKeyword),
    };
  });
}

/** Count the matches of every pattern of a rule in an already-normalized text. */
export function countRuleHits(rule: CompiledRule, normalizedText: string): number {
  let hits = 0;
  for (const pattern of rule.patterns) {
    pattern.lastIndex = 0;
    const matches = normalizedText.match(pattern);
    if (matches !== null) hits += matches.length;
  }
  return hits;
}
