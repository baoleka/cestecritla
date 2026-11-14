# 18 — Le dossier légal du chat

> **À quoi sert ce fichier.** `PLAN-CHAT.md` §5 demande que le dossier légal du chat soit « fait
> pour de vrai, avant que l'aperçu réponde » : l'aperçu est public, y répondre c'est déjà
> traiter. Ce fichier est ce dossier — le geste tel qu'il est depuis D16.53, l'entrée de
> registre, une courte analyse d'impact, la lecture de quatre textes, ce qui reste à faire.
> **Ce n'est pas un avis juridique** : une lecture par la session et par un agent, que
> l'éditeur relit et date dans `data/2026/ask.json` (`preview_legal_on`). Chaque fait porte
> son statut ; les citations de l'annexe ont été vérifiées par script contre les textes
> enregistrés le 14 novembre 2026 (180 chaînes, 0 manquante).
>
> Il ne remplace pas `11-conformite.md` §6.2 sexies (écrit **avant** D16.53, quand la question
> partait après un accord) ni `09-architecture.md` §6 (la carte des données).

## 1. Le geste, depuis D16.53

| Geste du visiteur | Ce qui part | Vers qui | Ce qui est gardé |
|---|---|---|---|
| Chercher | rien | — | rien |
| « Demander » | les numéros des mesures trouvées, la version du livre | notre Worker, la base privée | rien |
| « Expliquer avec l'IA » | ces numéros, au plus trois mots **pris dans nos propres phrases relues**, les identifiants de nos cartes reconnues, la relance choisie | notre Worker, puis le modèle chez Cloudflare — qui reçoit nos phrases, nos cartes et ces mots | rien chez nous ; chez Cloudflare, ce que son engagement écrit |

**La question tapée ne part jamais** (D16.53, qui rétablit D16.22 sans exception). Le Worker
refuse tout mot qui n'est pas un mot des phrases qu'il charge lui-même.

> **État au 14 novembre 2026, au soir** : le code porte ce geste, fermé partout
> (`src/lib/chat-contract.ts`, `src/lib/chat-words.ts`, `src/worker/chat.ts`) ; des portes le
> tiennent, jusque dans trois navigateurs (journal de `PLAN-CHAT.md`).

## 2. Registre des activités de traitement (RGPD, art. 30)

| Rubrique | Contenu |
|---|---|
| Responsable | L'éditeur de cestecritla.fr, sous le pseudonyme Baoleka ; contact : l'adresse de contact du site. Son identité est détenue par l'hébergeur (LCEN, art. 1-1, II) et n'est pas publiée (D0.15) |
| Finalité | Montrer, à qui le demande, les phrases relues des mesures trouvées ; et, à qui appuie sur le bouton, une explication des mots de ces phrases. Rien d'autre : ni statistique, ni profil |
| Personnes concernées | Les visiteurs du site |
| Données | L'adresse IP, vue par l'hébergeur comme pour toute page ; les numéros de mesures et les mots de nos phrases qu'une demande porte — ils disent un intérêt pour un sujet, comme une page consultée le dit ; un code tiré de l'adresse IP, une minute (limiteur). **Aucun texte libre** |
| Destinataires | Cloudflare, Inc. (hébergeur et sous-traitant : Workers, Workers AI, D1). Aucun autre |
| Transferts hors de l'Union | Possibles : le modèle tourne « au plus près », sans région garantie. Garantie : le cadre UE–États-Unis sous lequel Cloudflare se dit certifié ; à défaut, les clauses contractuelles types de son contrat (`16-hypotheses.md` H-CNF-24) |
| Durées | Le temps de la requête, chez nous ; « zéro rétention » écrite chez Cloudflare pour le modèle retenu ; code du limiteur : 60 secondes ; journaux d'hébergeur : selon la politique de Cloudflare ; compteur de consommation : 25 heures, un nombre par heure |
| Sécurité | §3, « mesures » |

Faut-il un registre ? L'exemption des petites structures (art. 30 § 5) tombe pour un
traitement non occasionnel ou portant sur des données de l'article 9. Depuis D16.53 aucun
texte libre n'est traité : que des numéros de mesures et des mots de nos phrases soient des
données « révélant » une opinion n'est tranché par aucun texte lu (annexe, lecture 4). Le
registre est tenu : il coûte une table. PROBABLE.

## 3. Analyse d'impact, courte (RGPD, art. 35)

**Faut-il en faire une ?** Un critère sur deux tient encore — un usage nouveau d'une
technologie face au public ; le second, des données sensibles saisies, est tombé avec D16.53.
En deçà de deux critères une analyse n'est en général pas requise (lignes directrices
européennes, **de mémoire, non relues**) : celle-ci est faite quand même, parce qu'elle tient
en une page et que c'est elle qui a fait changer la conception.

| Risque | Vraisemblance | Gravité | Ce qui le réduit |
|---|---|---|---|
| Ce que quelqu'un tape est lu par un tiers | **écarté par construction** | — | rien de tapé ne part (D16.53) ; les champs n'ont pas de nom, aucun formulaire ne s'envoie seul (R40) ; tests de bout en bout |
| Ce qui part (numéros, mots de nos phrases) est rattaché à une personne | faible | limitée | aucun compte, aucun cookie, aucun identifiant ; aucun journal ; rien en base ; le limiteur ne garde qu'un code d'une minute |
| Une explication trompe sous le nom du site (attribue, conseille, invente) | possible | importante pour le débat public, nulle pour les données | le modèle ne reçoit que nos phrases et des mots de nos phrases : une consigne n'a pas par où entrer ; contrôle côté serveur, tout ou rien ; mention IA dans le texte ; banc et lecture avant ouverture (R36) |
| L'hébergeur garde plus qu'il n'écrit, ou change ses engagements | faible | limitée (aucun texte libre) | modèles à « zéro rétention » écrite seulement ; veille (R39) ; interrupteur sans déploiement ; retrait du Worker du chat en une commande, répété le 14/11 |
| Le quota gratuit est vidé par un script | possible | nulle pour les personnes | compteur, coupe-circuit, limiteur par route et par foyer ; la page continue sans l'IA |

## 4. Ce que disent les quatre textes lus le 14 novembre 2026

Lecture faite par un agent de la session sur les sources premières (cnil.fr ; l'Office des
publications de l'Union pour les règlements — EUR-Lex répondait sans contenu ; Légifrance
refusait la lecture automatique : **aucun texte de loi français n'a été lu à la source**). Les
références [C1]… renvoient à l'annexe.

### 4.1 Règlement (UE) 2024/900 — publicité à caractère politique (lève en partie H-CNF-11)

- La définition passe par l'une de trois portes : un message fourni « normalement contre
  rémunération », ou « au travers d'activités internes », ou « dans le cadre d'une campagne
  de publicité à caractère politique » — laquelle suppose un contrat (art. 3, points 2 et 7)
  [R1]. Les « activités internes » sont celles d'une « entité » ; les lignes directrices
  citent les personnes morales et les associations, pas une personne seule [R2].
- « Les opinions politiques exprimées à titre personnel ne sont pas considérées comme de la
  publicité à caractère politique » (art. 1 § 3) [R1] ; les lignes directrices donnent
  l'exemple d'un particulier sur son blog [R2]. Le bénévolat n'est pas un service [R2].
- **Ce qui joue contre nous**, et que rien ne tranche : le considérant 30 compte, parmi les
  indices qu'une opinion n'est pas « à titre personnel », qu'elle soit diffusée « à un nombre
  indéfini de personnes » ou vienne de quelqu'un « généralement actif » en campagne [R1].
- Même dedans, les obligations des éditeurs ne s'attachent qu'à un service rémunéré, et le
  chapitre III qu'au ciblage sur données personnelles : le site ne cible personne.
- **Lecture** : hors champ — ni rémunération, ni entité, ni contrat, ni ciblage. PROBABLE.

### 4.2 Règlement sur l'IA, article 50 — applicable depuis le 2 août 2026

- **§ 1** (qui fournit un système « destiné à interagir directement » avec des personnes) :
  les informer qu'elles interagissent avec une IA, au plus tard à la première interaction, de
  façon claire, distincte et accessible (§ 5) [A1]. Les lignes directrices : une notification
  unique et bien visible avant la première interaction suffit en général ; une mention
  purement technique (« ce système utilise un LLM ») ne suffit pas seule ; dans un produit qui
  mêle IA et contenu humain, **chaque sortie de l'IA** est signalée [A3]. → **Ce que la
  feuille fait** : l'offre dit, avant le bouton, qu'une IA explique et ce qu'elle reçoit ;
  chaque bloc écrit par l'IA porte sa mention dans le texte.
- **§ 2** (marquage lisible par une machine des textes générés) : incombe aux *fournisseurs* ;
  délai au 2 décembre 2026 pour les systèmes mis sur le marché avant le 2 août [A2]. Le code
  de bonnes pratiques, volontaire, tient un texte de moins de 200 jetons pour « très court »
  [A4] : une explication en fait 200 au plus. → Chaque bloc de l'IA porte un attribut
  `data-generated-by="ai"` dans la page (`src/scripts/chat.ts`).
- **§ 4, second alinéa** (texte généré, publié pour informer le public sur des questions
  d'intérêt public) : le dire — sauf si le texte a fait l'objet d'une relecture humaine **et**
  qu'une personne en assume la responsabilité éditoriale [A1]. Les lignes directrices : une
  réponse montrée à la seule personne qui l'a demandée est hors champ ; un texte servi à tous
  sur la politique est dedans ; l'exception demande une relecture qui vérifie les faits, et
  que « l'identité et les coordonnées » du responsable soient publiques [A3]. → **Les phrases
  écrites d'avance sont dans le champ.** Elles sont relues une à une par l'éditeur ; mais il
  signe d'un pseudonyme. **Le plus sûr est de le dire plutôt que de s'appuyer sur
  l'exception** — **décidé par l'éditeur le 14 novembre au soir (D16.56)** : l'étiquette des
  phrases relues nomme l'IA, « Phrases écrites par une IA, relues par l'éditeur », et une
  porte la tient (`scripts/check-strings.test.ts`).
- **Fournisseur ou déployeur ?** Est fournisseur qui « met en service sous son propre nom »,
  « à titre onéreux ou gratuit » ; l'exclusion de l'usage « purement personnel et non
  professionnel » ne couvre que les obligations des *déployeurs* (art. 2 § 10) [A1][A3].
  **Aucun texte lu ne donne le cas d'une personne seule qui met en ligne un outil bâti sur le
  modèle d'un tiers.** On se tient donc comme un fournisseur : §§ 1, 2 et 5 ci-dessus.
- **Annexe III, point 8 b** (systèmes « destinés à être utilisés pour influencer » un vote) :
  tout tient à la destination que le fournisseur donne au système [A1]. Le projet de lignes
  directrices met dedans un agent conversationnel fait pour convaincre, dehors celui qui donne
  une information neutre et renvoie aux sites officiels [A5 — un projet]. **Notre lecture, à
  écrire avant la mise en service (art. 6 § 4)** : l'IA du site explique des mots ; elle
  n'attribue rien, ne conseille pas, ne répond pas à « pour qui voter », et le contrôle le lui
  interdit. Les obligations du haut risque ne s'appliqueraient de toute façon qu'au 2 décembre
  2027 [A2], après le scrutin. Ce qui pèse en sens inverse : le site se dit lui-même « projet
  militant indépendant ». PROBABLE, non tranché.

### 4.3 CNIL — communication politique

Le guide d'octobre 2025 et ses fiches s'adressent aux élus, candidats et partis [C3] ; un
particulier n'y paraît que par l'exclusion du message « à titre personnel » [C1][C2]. Rien sur
les agents conversationnels, rien encore de propre à 2027 [C6]. Ce qu'ils rappellent des
données d'opinion — une exception de l'article 9 § 2, une information complète, la
suppression après le scrutin [C1][C3][C4] — vaut pour qui en collecte : depuis D16.53 le site
n'en saisit plus.

### 4.4 CNIL — agents conversationnels

La page de 2021 [B1] distingue deux régimes pour les données sensibles **tapées** : prévisibles
— il faut une exception de l'article 9 § 2, par exemple un consentement explicite ; non
prévues — pas de consentement, mais une mise en garde et une purge. **Aucun des deux ne se
déclenche quand rien de tapé ne quitte le téléphone.** Reste ce qu'elle dit de toute
information [B4] : le responsable, les finalités, les droits, les destinataires, le transfert
et sa garantie — la page Confidentialité les porte.

### 4.5 La destination du système, écrite (annexe III, point 8 b ; art. 6 § 4)

> Écrite le 14 novembre 2026 par la session, **à relire par l'éditeur** : c'est lui qui met le
> système en service sous son nom, et c'est sa déclaration. Elle vaut pour le système tel que
> le code le borne depuis D16.53 ; élargir ce que l'IA fait la rend caduque.

**Le système.** Un modèle de langage hébergé par Cloudflare, que la route `/api/chat` du site
appelle quand un visiteur appuie sur « Expliquer avec l'IA ».

**À quoi il est destiné.** Expliquer, en une à trois phrases courtes, des **mots** — un terme
technique, une notion d'un domaine peu familier — pris dans les phrases relues que la page
affiche, à la personne qui le demande et à elle seule.

**À quoi il n'est pas destiné, et ce qui l'en empêche.**

| Il ne doit pas | Ce qui le tient |
|---|---|
| dire ce que le programme prévoit, ni rien lui attribuer | il ne reçoit jamais le texte du livre ; le contrôle écarte les phrases qui nomment le programme, une mesure, le mouvement ou une personne (`src/lib/ask-validate.ts`) ; une phrase refusée, et l'explication entière ne s'affiche pas |
| convaincre, donner un avis, recommander un vote, un candidat ou un parti | la consigne qu'il reçoit ; le contrôle écarte avis, consignes de vote et négations ; « pour qui voter » est reconnu par la page, qui répond d'une phrase à nous sans rien demander (`src/lib/chat-local.ts`) |
| s'adapter à la personne | il ne reçoit rien d'elle : ni sa question, ni un fil, ni un identifiant — seulement nos phrases, nos cartes et au plus trois mots de ces phrases (D16.53) |
| parler pendant le silence électoral | le gel ferme les deux routes (`src/lib/silence.ts`, `src/worker/chat.ts`) |
| passer pour une personne, ou pour la voix du programme | la mention au bouton et dans chaque bloc : « Elle explique des mots, pas le programme. » (§4.2) |

**Ce que ces garde-fous valent.** Ce que le modèle reçoit est tenu par construction : le
contrat n'a pas de champ pour une phrase, et le Worker refuse tout mot qui n'est pas des
nôtres. Ce qu'il rend est tenu par un contrôle qui reste **une liste de mots et de formes** :
il peut laisser passer un nom écrit sans majuscule ou une définition calmement fausse
(`14-risques.md` R36). Le banc des explications et la lecture de l'éditeur sont les portes
qui l'éprouvent avant toute ouverture (`PLAN-CHAT.md` §5).

**Dans quelles conditions.** Un site non officiel, qui l'écrit dans le cadre de chaque écran
et renvoie à la page officielle de chaque mesure ; gratuit, sans compte ; un quota du jour
au-delà duquel la page continue sans l'IA. Ce que le site en dit au public : `/a-propos`
(`about.ai_line`, `about.ai_method`, `about.ai_limits`) et la mention de chaque bloc.

**Notre évaluation au regard du point 8 b.** Le projet de lignes directrices pose deux
conditions, toutes deux nécessaires [A5 — un projet] :

- *Des personnes directement exposées aux sorties* : oui — le visiteur lit l'explication.
- *Une destination qui est d'influencer un scrutin ou un vote* : non, selon nous. Le système
  est dirigé vers l'explication d'un vocabulaire, pas vers le choix de l'électeur ; qu'il
  puisse y contribuer en passant ne suffit pas (« directed towards electoral influence, not
  merely be incidentally capable of it » [A5]).
- **Ce qui pèse en sens inverse**, dit sans fard : le site ne traite que d'un programme, celui
  d'un candidat, et se dit lui-même « projet militant indépendant » ; le même projet compte
  les tiers engagés (« advocacy groups ») parmi ceux qui peuvent vouloir influencer ; et
  l'exemple qu'il met dehors est une information « politically neutral » [A5] — ce que le
  site n'est pas par son objet. Une autorité pourrait juger la destination à l'échelle du
  site, et non de la seule IA.
- **Conclusion** : hors du point 8 b. PROBABLE, non tranché — la lecture s'appuie sur un
  projet de lignes directrices, pas sur un texte arrêté (`16-hypotheses.md` H-CNF-25).

**Si la lecture contraire l'emportait.** Les obligations du haut risque ne s'appliquent aux
systèmes de l'annexe III qu'à compter du 2 décembre 2027 [A2], après le scrutin. L'article 6
§ 3 écarte du haut risque un système de l'annexe III qui ne présente pas de risque important,
et le § 4 demande alors d'écrire cette évaluation avant la mise en service [A1] : c'est ce
paragraphe. Le même § 4 renverrait à un enregistrement (art. 49 § 2) — **de mémoire, non relu
à la source le 14 novembre** : à lire avant d'ouvrir. La sortie reste celle de tout le
projet : l'interrupteur, puis le retrait du Worker du chat en une commande (répété le
14 novembre, D16.54).

**Quand la refaire.** Avant tout changement qui élargit ce que l'IA fait — lire une question,
répondre sur le fond, résumer une mesure à la volée, comparer, garder un fil. Et avant le
1er janvier 2027, avec la décision due sur l'IA en direct pendant la campagne
(`PLAN-CHAT.md` §7).

## 5. Ce qui reste, et à qui

| Quoi | À qui | État |
|---|---|---|
| Changer le code pour D16.53, puis relire ce dossier contre lui | la session | **fait le 14/11 au soir** |
| L'étiquette des phrases relues nomme-t-elle l'IA ? (§4.2, § 4) | l'éditeur | **oui, décidé le 14/11 au soir (D16.56)** |
| Écrire la destination du système (annexe III, 8 b) dans `a-propos` ou ici, avant la mise en service | la session, relu par l'éditeur | **écrite le 14/11 (§4.5)** ; à relire par lui |
| Lire à la source l'article 49 § 2 du règlement sur l'IA (enregistrement), dans sa version d'après le règlement (UE) 2026/1744 | la session ou l'éditeur | ouvert |
| Captures du tableau de bord Cloudflare : journal de la passerelle « aec » coupé ; aucun moyen de paiement ; observabilité des Workers coupée. L'accès de la session ne permet pas de les lire (essayé le 14/11 : refusé) | l'éditeur | à faire |
| La section « Quand tu demandes » de la page Confidentialité, récrite pour D16.53, relue | l'éditeur | **relue le 14/11 au soir (D16.55)** ; datée dans `data/launch.json` (`privacy_chat`) |
| Lire à la source : la loi Informatique et Libertés (art. 45 n'a plus d'objet ici), les lignes directrices européennes sur l'analyse d'impact, la liste officielle du cadre UE–États-Unis | la session ou l'éditeur | ouvert |
| Dater ce dossier : `preview_legal_on` | l'éditeur | après tout le reste |

## Annexe — les citations, telles que lues le 14 novembre 2026

Chaque chaîne ci-dessous a été retrouvée par script dans le texte enregistré de sa source.
Les textes européens sont cités dans la langue où ils ont été vérifiés.

**[A1] Règlement (UE) 2024/1689 (règlement sur l'IA), JO L du 12/7/2024 (anglais)** — <http://publications.europa.eu/resource/celex/32024R1689>

- « 1. Providers shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural persons concerned are informed that they are interacting with an AI system, unless this is obvious from the point of view of a natural person who is reasonably well-informed, observant and circumspect, taking into account the circumstances and the context of use. »
- « 2. Providers of AI systems, including general-purpose AI systems, generating synthetic audio, image, video or text content, shall ensure that the outputs of the AI system are marked in a machine-readable format and detectable as artificially generated or manipulated. Providers shall ensure their technical solutions are effective, interoperable, robust and reliable as far as this is technically feasible, taking into account the specificities and limitations of various types of content, the costs of implementation and the generally acknowledged state of the art, as may be reflected in relevant technical standards. This obligation shall not apply to the extent the AI systems perform an assistive function for standard editing or do not substantially alter the input data provided by the deployer or the semantics thereof, or where authorised by law to detect, prevent, investigate or prosecute criminal offences. »
- « Deployers of an AI system that generates or manipulates text which is published with the purpose of informing the public on matters of public interest shall disclose that the text has been artificially generated or manipulated. This obligation shall not apply where the use is authorised by law to detect, prevent, investigate or prosecute criminal offences or where the AI-generated content has undergone a process of human review or editorial control and where a natural or legal person holds editorial responsibility for the publication of the content. »
- « 4. Deployers of an AI system that generates or manipulates image, audio or video content constituting a deep fake, shall disclose that the content has been artificially generated or manipulated. »
- « 5. The information referred to in paragraphs 1 to 4 shall be provided to the natural persons concerned in a clear and distinguishable manner at the latest at the time of the first interaction or exposure. The information shall conform to the applicable accessibility requirements. »
- « It shall apply from 2 August 2026. »
- « ‘provider’ means a natural or legal person, public authority, agency or other body that develops an AI system or a general-purpose AI model or that has an AI system or a general-purpose AI model developed and places it on the market or puts the AI system into service under its own name or trademark, whether for payment or free of charge; »
- « ‘deployer’ means a natural or legal person, public authority, agency or other body using an AI system under its authority except where the AI system is used in the course of a personal non-professional activity; »
- « ‘putting into service’ means the supply of an AI system for first use directly to the deployer or for own use in the Union for its intended purpose; »
- « ‘making available on the market’ means the supply of an AI system or a general-purpose AI model for distribution or use on the Union market in the course of a commercial activity, whether in return for payment or free of charge; »
- « ‘downstream provider’ means a provider of an AI system, including a general-purpose AI system, which integrates an AI model, regardless of whether the AI model is provided by themselves and vertically integrated or provided by another entity based on contractual relations. »
- « ‘intended purpose’ means the use for which an AI system is intended by the provider, including the specific context and conditions of use, as specified in the information supplied by the provider in the instructions for use, promotional or sales materials and statements, as well as in the technical documentation; »
- « 10. This Regulation does not apply to obligations of deployers who are natural persons using AI systems in the course of a purely personal non-professional activity. »
- « AI systems intended to be used for influencing the outcome of an election or referendum or the voting behaviour of natural persons in the exercise of their vote in elections or referenda. This does not include AI systems to the output of which natural persons are not directly exposed, such as tools used to organise, optimise or structure political campaigns from an administrative or logistical point of view. »
- « 3. By derogation from paragraph 2, an AI system referred to in Annex III shall not be considered to be high-risk where it does not pose a significant risk of harm to the health, safety or fundamental rights of natural persons, including by not materially influencing the outcome of decision making. »
- « 4. A provider who considers that an AI system referred to in Annex III is not high-risk shall document its assessment before that system is placed on the market or put into service. »
- « the AI system is intended to perform a narrow procedural task; »
- « 12.7.2024 »
- « ‘deep fake’ means AI-generated or manipulated image, audio or video content »
- « at the latest at the time of the first interaction or exposure »

**[A1] Règlement (UE) 2024/1689 (règlement sur l'IA), JO L du 12/7/2024 (français)** — <http://publications.europa.eu/resource/celex/32024R1689>

- « Les déployeurs d’un système d’IA qui génère ou manipule des textes publiés dans le but d’informer le public sur des questions d’intérêt public indiquent que le texte a été généré ou manipulé par une IA. Cette obligation ne s’applique pas lorsque l’utilisation est autorisée par la loi à des fins de prévention ou de détection des infractions pénales, d’enquêtes ou de poursuites en la matière, ou lorsque le contenu généré par l’IA a fait l’objet d’un processus d’examen humain ou de contrôle éditorial et lorsqu’une personne physique ou morale assume la responsabilité éditoriale de la publication du contenu. »
- « systèmes d'IA destinés à être utilisés pour influencer le résultat d'une élection ou d'un référendum ou le comportement électoral de personnes physiques dans l'exercice de leur vote lors d'élections ou de référendums. Sont exclus les systèmes d'IA aux sorties desquels les personnes physiques ne sont pas directement exposées, tels que les outils utilisés pour organiser, optimiser ou structurer les campagnes politiques sous l'angle administratif ou logistique. »

**[A2] Règlement (UE) 2026/1744 du 8 juillet 2026 (« Digital Omnibus on AI »), JO L du 24/7/2026** — <http://publications.europa.eu/resource/celex/32026R1744>

- « ‘4. Providers of AI systems, including general-purpose AI systems, generating synthetic audio, image, video or text content, that have been placed on the market before 2 August 2026 shall take the necessary steps in order to comply with Article 50(2) by 2 December 2026.’ »
- « 2 December 2027 as regards AI systems classified as high-risk pursuant to Article 6(2) and Annex III; and »
- « in Article 50, paragraph 7 is replaced by the following: »
- « This Regulation shall enter into force on the third day following that of its publication in the Official Journal of the European Union. »
- « Chapter III, Sections 1, 2, and 3, with the exception of Article 6(5), shall apply from: »
- « 24.7.2026 »

**[A3] Commission, lignes directrices sur l'article 50, C(2026) 7702 final, 5/11/2026 — non contraignantes** — <https://ec.europa.eu/newsroom/dae/redirection/document/131215>

- « Another example of a provider is a company or another organisation (e.g. a public authority) that has developed an interactive AI system (e.g. chatbot) in-house and puts it into service in the Union for its own use and under its name or trademark. »
- « The ‘authority’ over an AI system should be understood as assuming responsibility over the decision to deploy the system and over the manner of the actual use of the system (including its outputs). »
- « Any activity through which natural persons gain an economic benefit on a regular basis or are otherwise involved in a professional, business, trade, occupational or freelance activity should be considered as a ‘professional’ activity. The specification of ‘purely personal’ is a qualifier of non-professional, meaning that the person should act in both a personal and a non-professional capacity to fall within the scope of the exception. »
- « The exclusion in Article 2(10) AI Act applies only as regards the obligations of deployers when using the system for purely personal, non-professional activities. The system as such remains within the scope of the AI Act as regards the obligations of providers placing the system on the market or putting it into service and of deployers using the system for professional use. »
- « Cases of products and services blending AI-generated responses with human-curated content fall within the scope of Article 50(1) AI Act and require disclosure for the specific outputs in the interaction that are AI-generated, unless those AI outputs have been properly reviewed and sent by humans as the main interlocutors with the natural persons. »
- « Technical or capability-based descriptions: statements solely referring to underlying technologies (e.g. “this system uses LLMs”) without explaining the function or implications of the system for the user and its artificial origin. »
- « A single, prominent notification before the first interaction of the AI system with a particular natural person is likely to suffice in most instances to meet the obligation in Article 50(1) AI Act. »
- « News summary generated by a chatbot that is only available to the user that prompted the chatbot. »
- « This means that the text should be accessible by an indeterminate, fairly large number of unrelated, potential readers simultaneously and/or successively, whether or not against payment (e.g. subscriptions) »
- « Human review refers to the deliberate examination of the substance of the content by one or more natural persons possessing relevant knowledge and professional judgement pertaining to the subject matter under scrutiny (e.g. academic peer review or professional validation chains). Fact-checking the accuracy of the content is a minimum requirement that should be part of that review. »
- « Any substantive AI intervention occurring after the human review or editorial control process has taken place will therefore cause the exception to become void. »
- « This entails that said person must hold the ultimate legal responsibility over the publication of the content, including the human review or editorial control (e.g. an individual, editorial board, or the publishing company). To ensure public accountability and trust, and in line with existing media professional standards, the identity and contact details of the legal person, the natural person or the function with editorial responsibility should be made publicly available on an easily findable location (if not yet otherwise available). »
- « - AI-generated summaries of text; paraphrasing or rewriting text that changes style, structure and meaning beyond mere grammatical and minor stylistic correction; »
- « Outputs generated in the form of a short sequence of numbers, symbols or letters (e.g. single words, image captions, alt-text, UI labels and icon-scale graphics, image captions and other data labels); »
- « They may rely on the marking solution implemented by an upstream model provider or a third party providing the solution (e.g. as an open standard or a specialised service) to the extent that the marking solution is compliant with Article 50(2) AI Act. Such reliance is without prejudice to the responsibility of the provider of the AI system to demonstrate compliance with Article 50(2) AI Act. »
- « Systems that are partly interactive and partly generative may benefit from this transitional period only with regard to the marking obligation under Article 50(2) AI Act, while compliance with the disclosure obligation for AI systems directly interacting with natural persons must be ensured as of 2 August 2026. »
- « These Guidelines are non-binding. Any authoritative interpretation of the AI Act may ultimately only be given by the Court of Justice of the European Union (‘CJEU’). »
- « In that regard, texts should be considered to address public interest matters if they cover topics on politics and democratic processes, »
- « Conversely, if texts that have been generated or manipulated before 2 August 2026 are published on or after that date, they need to be labelled. »
- « (e.g. including when the AI system is reasonably likely to interact with the general public) »
- « - individuals using an AI system in their personal capacity to generate deep fakes disseminated on social media; »
- « - individuals using an AI system in a personal capacity to generate text on various topics (e.g. students using AI to write their homework); »
- « regardless of whether the AI system is provided for free or for payment »
- « Where the system may interact with children, those notifications must be child-friendly, age-appropriate, easy-to- understand and easily accessible to all children »
- « C(2026) 7702 final »
- « (i) the AI generated or manipulated text must have undergone human review or editorial control and (ii) a legal or natural person must hold editorial responsibility for the publication. »
- « Operators (e.g. providers and deployers) may fulfil more than one role concurrently in relation to an AI system. »
- « Those persons may be professional deployers, other users (also using the system for purely personal activities) or other persons using the system on their behalf. »
- « Brussels, 5.11.2026 »
- « a general disclosure like “Services on this website use AI” is insufficient »
- « Interaction entails the capability of a bidirectional exchange of information or actions between natural persons and the AI system with a genuine conversational or responsive character. »
- « Natural persons should be able to provide input (e.g., written text or other forms of content, voice, or physical actions) to the AI system »
- « The interaction may be a one-time exchange (e.g. single prompt followed with a single reply) »
- « backend decision-support systems where the user only sees the AI output without possibility for direct interaction with the system; »
- « - AI-enabled search and retrieval of information without generating or modifying content, »
- « A single, prominent notification before the first interaction »

**[A3] Commission, page des lignes directrices sur l'article 50** — <https://digital-strategy.ec.europa.eu/en/library/guidelines-transparency-obligations-providers-and-deployers-ai-systems>

- « Publication 20 July 2026 »

**[A4] Code de bonnes pratiques sur la transparence des contenus générés par l'IA, 10/6/2026 — volontaire** — <https://ec.europa.eu/newsroom/dae/redirection/document/129555>

- « a) The identification of the natural or legal person with editorial responsibility (name, role and contact details); »
- « Where not already publicly available, Signatories commit to publish the contact details of the function, the natural persons or the legal persons with editorial responsibility to ensure accountability. »
- « For free-form text longer than 200 tokens, watermarking still needs to be applied »
- « Until then, “very short text” should be understood as text shorter than 200 tokens. »

**[A4] Commission, avis sur le code de bonnes pratiques, 8/7/2026** — <https://digital-strategy.ec.europa.eu/en/library/commission-opinion-assessment-code-practice-transparency-ai-generated-content>

- « On July 8, the Commission concluded that the Code of Practice on Transparency of AI-generated Content adequately covers the obligations provided for in Articles 50(2), (4) and (5) AI Act and facilitates their effective implementation. »
- « Adherence to the code does not constitute conclusive evidence of compliance with these obligations. »

**[A4] Commission, page du code de bonnes pratiques** — <https://digital-strategy.ec.europa.eu/en/policies/code-practice-ai-generated-content>

- « Even though adherence to the code is voluntary, the transparency requirements under article 50 of the AI Act are legal obligations. »

**[A5] Commission, PROJET de lignes directrices sur la classification à haut risque, 19/5/2026, partie Annexe III — projet** — <https://ec.europa.eu/newsroom/dae/redirection/document/128561>

- « For an AI system to be classified as high-risk under the use case listed in point 8(b) of Annex III AI Act, two conditions must be fulfilled: first, the intended purpose of the AI system must be to influence the outcome of an election or referendum, or to influence the voting behaviour of natural persons in the exercise of their vote in elections or referenda; second, natural persons must be directly exposed to the outputs of the AI system. »
- « the AI system would have to be specifically intended to have an effect on the electorate’s choice or turnout »
- « the system must be directed towards electoral influence, not merely be incidentally capable of it. »
- « An AI-enabled chatbot (or a virtual spokesperson/agent) developed for use by political actors to interact with natural persons in a conversational manner, simulating political dialogue with voters to persuade them to support a candidate or policy »
- « providing only neutral, factual, and informational content about elections (voting procedures (how, when, where), registration procedures; the institutional and legal framework; objective information on parties and candidates (e.g. references to their official websites); and general civic education on democratic processes) would also not fall under high-risk category »
- « The decisive factor is the intended purpose of the AI system as specified by the provider, not who the deployer will be. »
- « Third parties (e.g. advocacy groups): these persons or bodies may also have an interest in influencing the outcome of an election or referendum or the voting behaviour of natural persons, or may do so in the interest of political actors. »
- « The actual result of the AI system after its deployment is immaterial. »
- « designed to provide information to voters on behalf of election authorities, operating in a politically neutral way »
- « An AI system designed to recommend political parties or candidates based on an individual voter’s views »
- « […](2026) XXX draft »

**[A5] Commission, page du projet de lignes directrices sur le haut risque** — <https://digital-strategy.ec.europa.eu/en/library/draft-commission-guidelines-classification-high-risk-ai-systems>

- « Draft Commission guidelines on the classification of high-risk AI systems »

**[B1] CNIL, « Chatbots : les conseils de la CNIL pour respecter les droits des personnes », 19/2/2021** — <https://www.cnil.fr/fr/chatbots-les-conseils-de-la-cnil-pour-respecter-les-droits-des-personnes>

- « Pour cela, des données personnelles sont souvent traitées, par exemple pour conserver une trace de la conversation, même si le service est disponible sans créer de compte ou sans fournir d’informations directement identifiantes. »
- « Les données doivent être conservées pour la durée nécessaire pour atteindre la finalité du traitement, définie par le responsable de traitement. »
- « il faudra distinguer les cas où les données devraient être effacées dès la fin de la conversation (comme dans le cas d’un chatbot aidant à un acte d’achat) des cas où le responsable de traitement peut légitimement conserver ces données pour une durée plus longue »
- « une attention particulière doit être portée aux données sensibles (par exemple les informations liées à la santé, aux opinions politiques, à la prétendue appartenance syndicale ou religieuse), dont le traitement est en principe interdit par le RGPD (article 9 du RGPD). »
- « Il faut alors veiller à ce que le traitement de données rentre dans l’une des exceptions prévues à l’article 9.2 du RGPD. Cela peut être, par exemple et selon le cas, le consentement explicite de l’utilisateur ou le fait que le traitement soit nécessaire pour un motif d’intérêt public important. »
- « Les chatbots proposant souvent un mode d’écriture libre, ils peuvent être amenés à traiter des données sensibles directement fournies par l’utilisateur, sans que le responsable de traitement ou le sous-traitant ne l’ait anticipé. »
- « Dans ce cas, les organismes ne sont pas tenus de recueillir le consentement préalable des utilisateurs. Ils devront cependant mettre en place des mécanismes permettant de minimiser les risques pour les droits et libertés des personnes : »
- « en communiquant, avant toute utilisation du chatbot, une mise en garde invitant les personnes à s’abstenir de communiquer des données sensibles ; »
- « en mettant en place un système de purge, immédiat ou au moins régulier, car la conservation de ces données sensibles n’est pas pertinente. »
- « Par exemple, avec le chatbot d’un service d’assistances aux minorités sexuelles ou relatif à la santé, de telles données peuvent être collectées. »
- « Le traitement de données sensibles est l’un des neufs critères pouvant conduire à la réalisation d’une analyse d’impact relative à la protection des données (AIPD). »
- « soit le cookie n’est déposé qu’à l’activation du chatbot par l’utilisateur »
- « 19 février 2021 »
- « un mode d’écriture libre »
- « directement fournies par l’utilisateur »
- « les organismes ne sont pas tenus de recueillir le consentement préalable des utilisateurs »

**[B2] CNIL, « L'intelligence artificielle qui parle : les agents conversationnels », 25/3/2022** — <https://www.cnil.fr/fr/intelligence-artificielle/lintelligence-artificielle-qui-parle-les-agents-conversationnels>

- « Favoriser la transparence : informer l’usager qu’il interagit avec une machine et concevoir l’algorithme de manière à pouvoir expliquer les réponses de l’agent. »
- « Concevoir l’agent conversationnel de telle sorte qu’il limite la collecte de données personnelles. »
- « 25 mars 2022 »

**[B3] CNIL, questions-réponses sur l'utilisation d'un système d'IA générative, 18/7/2024** — <https://www.cnil.fr/fr/les-questions-reponses-de-la-cnil-sur-lutilisation-dun-systeme-dia-generative>

- « Enfin, s’il est envisagé d’utiliser un système sous forme d’API, il faut souligner que la maîtrise du système est alors quasi exclusivement dans les mains du fournisseur. Il convient donc d’être particulièrement vigilant sur les données soumises au système d’IA, en évitant autant que possible la saisie de données personnelles. Il faut également apporter une attention particulière aux conditions contractuelles et notamment aux questions de transferts de données en dehors de l’UE. »
- « s’interroger sur son rôle et celui du fournisseur vis-à-vis des traitements de données personnelles, le cas échéant en passant un contrat de sous-traitance ou un accord de responsabilité conjointe avec ce dernier, voire en encadrant le transfert de données en dehors de l’Union européenne comme précédemment évoqué ; »
- « 18 juillet 2024 »
- « en évitant autant que possible la saisie de données personnelles »

**[B4] CNIL, « Conformité RGPD : comment informer les personnes et assurer la transparence ? », 29/7/2019** — <https://www.cnil.fr/fr/conformite-rgpd-information-des-personnes-et-transparence>

- « Prioriser ne signifie pas transmettre une information incomplète aux personnes concernées : il s’agit de mettre en avant les informations essentielles et d'offrir un accès simple et immédiat aux autres informations. »
- « l’identité du responsable de traitement ; »
- « l’existence d’un transfert des données vers un pays hors Union européenne (ou vers une organisation internationale), les garanties associées à ce transfert et la faculté d’accéder aux documents autorisant ce transfert (exemple : les clauses contractuelles types de la Commission européenne) ; »
- « Destinataires ou catégories de destinataires des données (qui a besoin d’y accéder ou de les recevoir au vu des finalités définies, y compris les sous-traitants) ; »
- « Adapter l’information au public visé et prêter une attention particulière à l’égard des enfants et des personnes vulnérables. »
- « Quelles informations prioriser ? »
- « les droits des personnes. »
- « les finalités ; »
- « Dans tous les cas »
- « 29 juillet 2019 »

**[B5] CNIL, « Conformité RGPD : comment recueillir le consentement des personnes ? », 3/8/2018** — <https://www.cnil.fr/fr/les-bases-legales/consentement>

- « En France, l’âge retenu est de 15 ans : les enfants de 15 ans ou plus peuvent consentir eux-mêmes au traitement de leurs données fondé sur le consentement dans le cadre des services de la société d’information. En-dessous de 15 ans, la loi « Informatique et Libertés » impose le recueil du consentement conjoint de l’enfant et du titulaire de l’autorité parentale. »
- « prévoir une case de recueil du consentement spécifiquement dédiée au traitement des données sensibles »
- « 03 août 2018 »

**[B6] CNIL, recommandation 4 sur les mineurs (consentement d'un parent en dessous de 15 ans), 9/6/2021** — <https://www.cnil.fr/fr/recommandation-4-rechercher-le-consentement-dun-parent-pour-les-mineurs-de-moins-de-15-ans>

- « L’article 45 de la loi Informatique et Libertés prévoit que, dans le cadre des services en ligne et pour les traitements de données qui reposent sur le consentement non contractuel de l’utilisateur, le ou les titulaires de l’autorité parentale doivent donner leur accord conjointement avec celui de leur enfant si celui-ci a moins de 15 ans. »
- « 09 juin 2021 »

**[C1] CNIL, guide « Communication politique – Protéger les données des électeurs », octobre 2025** — <https://www.cnil.fr/sites/default/files/2025-11/guide_communication_politique.pdf>

- « les opinions politiques exprimées à titre personnel, par exemple, le message d’un particulier sur un réseau social. »
- « s’assurer qu’il peut justifier de l’une des exceptions prévues par le RGPD et la loi Informatique et Libertés ; »
- « le cas échéant, réaliser une analyse d’impact relative à la protection des données (AIPD), si besoin, soumise à consultation préalable de la CNIL. »
- « les données collectées pour les besoins de la campagne électorale doivent en principe être supprimées à l’issue du scrutin »
- « Le RPP précise que ces techniques ne peuvent pas être utilisées pour cibler les personnes dont l’âge est inférieur d’au moins un an à l’âge électoral (en France, 17 ans). »
- « Pour la publicité politique ciblée, les traitements mis en œuvre sont susceptibles d’être des usages innovants (techniques de ciblage ou de diffusion), de se produire à large échelle voire de concerner des personnes vulnérables (mineurs) ou d’impliquer le traitement de données sensibles (opinion politique). »
- « Le RGPD impose au responsable de traitement d’informer les personnes concernées sur le traitement de leurs données, en énumérant certaines mentions obligatoires (art. 13 et 14 RGPD). »
- « la collecte de données dans le cadre de la publicité politique doit être réduite à ce qui est strictement nécessaire au regard de la finalité poursuivie. »
- « Les acteurs politiques utilisent de nombreux outils de prospection politique. »
- « Octobre 2025 »

**[C3] CNIL, fiche n° 2 « Les fichiers de communication politique », 21/10/2025** — <https://www.cnil.fr/fr/les-fichiers-de-communication-politique>

- « La règlementation en matière de protection des données personnelles est applicable aux élus, candidats, personnalités politiques ou partis politiques s’ils souhaitent, à des fins de communication politique : »
- « La CNIL rappelle que le RGPD interdit le traitement de ces données, sauf si le responsable de traitement mobilise une des exceptions prévues par l’article 9.2, notamment si la personne concernée a donné son consentement explicite au traitement de ses données personnelles pour une ou des finalités spécifiques ou encore si le traitement est effectué par un organisme politique à condition que : »
- « Bonne pratique : La CNIL rappelle qu’il est possible pour un mineur, sous certaines conditions, d’adhérer à un parti politique. Elle recommande donc de faire preuve de vigilance concernant la collecte de données de mineurs et notamment de prévoir une information adaptée. »
- « Les données traitées peuvent être sensibles, car leur seule présence dans un fichier de communication politique est susceptible de faire apparaître une opinion politique. »

**[C4] CNIL, « Élections : sept réflexes pour une campagne responsable », 30/1/2026** — <https://www.cnil.fr/fr/elections-sept-reflexes-pour-une-campagne-responsable>

- « l’identité et les coordonnées du responsable de traitement ; »
- « la durée de conservation des données ; »
- « Après chaque élection, supprimez les fichiers de prospection exclusivement constitués à cette occasion. »
- « La CNIL recommande de recueillir le consentement (système dit « opt-in ») des intéressés à être prospectés à des fins politiques par automate d’appel avant toute campagne d’appel. »
- « la base légale sur laquelle repose le traitement réalisé, parmi celles listées à l’article 6 du RGPD ; »

**[C5] CNIL, « Élections municipales 2026 : le plan d'action de la CNIL », 30/1/2026** — <https://www.cnil.fr/fr/elections-municipales-2026-le-plan-daction-de-la-cnil>

- « De nouveaux usages en ligne se développent depuis plusieurs années, notamment au travers des réseaux sociaux et des outils d’intelligence artificielle. »

**[C6] CNIL, « Évènement air 2026 », 28/9/2026** — <https://www.cnil.fr/fr/air2026>

- « À la lumière des centaines de signalements reçus à chaque élection, et en prévision de l’élection présidentielle, cette table ronde abordera les enjeux éthiques, mais aussi juridiques, des usages des politiques en termes de communication et de ciblage politique à l’occasion des élections. »
- « De plus, avec le développement des intelligences artificielles, en particulier des IA génératives, les risques s’amplifient : ces outils permettent de générer en masse des contenus, à destination de réseaux sociaux, pour la rédaction d’articles, ou pour produire des fausses vidéos. »

**[C7] CNIL, délibération n° 2012-020 du 26 janvier 2012** — <https://www.cnil.fr/sites/cnil/files/2023-10/recommandation_mise_en_oeuvre_de_fichiers_par_des_partis_politiques_candidats_ou_elus.pdf>

- « la CNIL recommande de ne pas utiliser de telles données relatives aux mineurs, en particulier des mineurs de 13 ans, collectées via Internet, à des fins de communication politique. »

**[C8] CNIL, page d'index des fiches « communication politique »** — <https://www.cnil.fr/fr/elections/actualites>

- « la CNIL mettant en place un plan d’action spécifique à chaque élection »

**[R1] Règlement (UE) 2024/900 du 13 mars 2024, JO L du 20/3/2024 (anglais)** — <http://publications.europa.eu/resource/celex/32024R0900>

- « ‘political advertising’ means the preparation, placement, promotion, publication, delivery or dissemination, by any means, of a message, normally provided for remuneration or through in-house activities or as part of a political advertising campaign: »
- « by, for or on behalf of a political actor, unless it is of a purely private or a purely commercial nature; or »
- « which is liable and designed to influence the outcome of an election or referendum, voting behaviour or a legislative or regulatory process, at Union, national, regional or local level; »
- « 3. Political opinions that are expressed in a personal capacity shall not be considered to be political advertising. »
- « 2. Political opinions and other editorial content, regardless of the medium through which they are expressed, that are subject to editorial responsibility shall not be considered to be political advertising unless specific payment or other remuneration is provided for, or in connection with, their preparation, placement, promotion, publication, delivery or dissemination by third parties. »
- « ‘political advertising campaign’ means the preparation, placement, promotion, publication, delivery or dissemination of a series of linked political advertisements in the course of a contract for political advertising on the basis of common preparation, sponsorship or funding; »
- « is carried out by an entity acting on its own behalf (in-house activities). In-house activities, which should be considered as solely relevant for Chapter III of this Regulation, should be understood as activities carried out within an entity »
- « The identification of political opinions expressed in a personal capacity should normally result from individual self-determination, but contextual elements can be taken into account. Relevant factors could include whether the opinion is issued on behalf of another entity, whether the message intends to self-promote a candidacy or campaign in an election, referendum or legislative or regulatory process, whether it is expressed by an individual who is generally active in campaigning or taking action for change on political or social issues, and whether the message is disseminated to an indefinite number of persons. A political opinion should not be considered as being expressed in a personal capacity if specific remuneration from third parties, including benefits in kind, is provided for, or in connection with, expressing that opinion. »
- « The rules on transparency and related due diligence requirements laid down in this Regulation should only apply to political advertising services, that is, political advertising that is normally provided against remuneration, which may include benefits in kind. »
- « A clear and substantial link should exist between the message and its potential to influence the outcome of an election or referendum, voting behaviour or a legislative or regulatory process. »
- « ‘service’ means any self-employed economic activity, normally provided for remuneration, as referred to in Article 57 TFEU; »
- « ‘political advertising publisher’ means a provider of political advertising service that publishes, delivers or disseminates political advertising through any medium; »
- « ‘sponsor’ means the natural or legal person at whose request or on whose behalf a political advertisement is prepared, placed, promoted, published, delivered or disseminated; »
- « any natural or legal person representing or acting on behalf of any of the persons or organisations referred to in points (a) to (f), and promoting the political objectives of any of those persons or organisations; »
- « Sponsors, and providers of advertising services acting on behalf of sponsors, shall make such declarations truthfully and shall be responsible for their accuracy. »
- « 1. Political advertising publishers shall ensure that each political advertisement is made available together with the following information in a clear, salient and unambiguous way: »
- « 2. It shall apply from 10 October 2025. However, within the scope of application of this Regulation, Article 3 and Article 5(1) shall apply as from the date of its entry into force. »
- « 1. This Regulation shall enter into force on the twentieth day following that of its publication in the Official Journal of the European Union. »
- « 1. Targeting techniques or ad-delivery techniques that involve the processing of personal data in the context of online political advertising shall be permitted only when the following conditions are fulfilled: »
- « Such information shall be retained in a machine-readable format for a period of seven years »
- « 20.3.2024 »

**[R1] Règlement (UE) 2024/900 du 13 mars 2024, JO L du 20/3/2024 (français)** — <http://publications.europa.eu/resource/celex/32024R0900>

- « 3. Les opinions politiques exprimées à titre personnel ne sont pas considérées comme de la publicité à caractère politique. »
- « normalement contre rémunération ou au travers d'activités internes ou dans le cadre d'une campagne de publicité à caractère politique: »

**[R2] Commission, lignes directrices C/2025/5514 sur le règlement 2024/900, JO C du 10/10/2025 — non contraignantes** — <http://publications.europa.eu/resource/celex/52025XC05514>

- « Political views published by a private individual on their personal blog or on their social media accounts, in their personal capacity, do not constitute political advertising. »
- « Volunteering (e.g. in electoral campaigns) is not normally provided for remuneration, and should therefore not be regarded as a service. »
- « This will cover activities of legal persons and may also cover activities of associations without legal personality. »
- « In-house activities which do not involve using targeting or ad-delivery techniques would not trigger any obligations under Chapter III of the Regulation. »
- « Where the publication, dissemination or distribution of a political advertisement is not provided as a service, e.g. because it is done through in-house activities, obligations on publishers (see Section 3.3) do not apply. »
- « A message that may influence voting behaviour, without having been initially designed for that purpose, does not constitute political advertising under this part of the definition. »
- « The approach is functional. The identity of the sponsor or initiator of the message is therefore not decisive, although it could help to determine the political nature of the message. »
- « or where they are running positive or negative campaigns towards candidates or political parties running for elections without those candidates or parties necessarily being involved or aware »
- « These Guidelines represent the Commission’s interpretation of Regulation (EU) 2024/900 (in particular of its Chapter I and II) with a view to ensuring its consistent, effective and uniform application. Any authoritative interpretation of Regulation (EU) 2024/900 may ultimately only be given by the Court of Justice of the European Union (‘CJEU’). »
- « Regulation (EU) 2024/900 concerns the transmission of political advertising where a political advertising service is being provided or when targeting or ad-delivery techniques are being used. »
- « 10.10.2025 »
