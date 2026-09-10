# 15 — Backlog écarté : ce qui a été envisagé et non retenu

> **À quoi sert ce document.** La session de découverte a produit plus d'idées qu'elle n'en a gardées. Chaque idée écartée l'a été pour une raison, presque toujours chiffrée, et presque jamais définitive. Ce fichier est la mémoire de ces refus : il évite de rouvrir en février 2027 un débat tranché en septembre 2026, et il dit à quelle condition précise chaque refus tombe.
>
> **Comment lire.** Une section par thème, une ligne par idée. Les trois colonnes utiles sont toujours les mêmes : ce qui a été envisagé, **pourquoi c'est écarté avec la preuve chiffrée**, et **ce qui le ferait revenir** — un événement, une mesure, un test, jamais « si on a le temps ». Le statut suit la convention du dossier : **VÉRIFIÉ** (mesuré ou lu à la source), **PROBABLE** (source secondaire ou non reproduit), **HYPOTHÈSE** ; **HYPOTHÈSE (personas)** signale ce qui n'a été jugé que par des agents-personas et jamais par une personne (D11.1).
>
> **Ce que ce document n'est pas.** Il ne contient ni les corrections à faire (`13-tests-humains.md` §3.11), ni les points ouverts par étape (`decisions.md` « Reste à trancher »), ni les risques (`14-risques.md`). Une ligne écartée ici ne peut pas être réintroduite sans que sa condition de retour soit remplie **et** consignée dans `decisions.md`.
>
> Dernier point avant les tableaux : le backlog **reporté** (P2, P3, v1.1, v2, v3) est au §9, séparé du backlog **abandonné**. Confondre les deux est la première façon de perdre du travail déjà payé.

---

## 1. Mécaniques et gamification

Source : `07-mecaniques.md` §4 (refus explicites), §6.2 (matrice 18 fiches), §11 (gadgets écartés), §12 (swipe), §13.2 (D5.15) ; `13-tests-humains.md` §3 (session 2, 7 personas).

### 1.1 Refusés par principe, avant toute notation

Ces six idées ne sont pas arrivées jusqu'à une fiche : elles tombent sous un refus explicite du §4, lui-même dérivé de D0.18, D0.22 et D0.32. Leur condition de retour n'est pas une mesure, c'est un changement de décision fondatrice — autant dire qu'elles ne reviennent pas.

| Idée | Pourquoi écartée — preuve | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| Swipe « d'accord / pas d'accord » sur des propositions (geste Elyze) | Fait de l'évaluation le geste principal, produit mécaniquement un score d'adhésion (mort-né avec un seul programme), fabrique la capture « pas d'accord avec LFI » sans montage ; agrégé, c'est un sondage sauvage (loi 77-808) et une donnée d'opinion (RGPD art. 9). Elyze : 2 M de téléchargements, discréditée en 3 semaines | VÉRIFIÉ (§12, plan §3.5) | Rien. Refus maintenu (D5.4, D5.9). Le **swipe de navigation** reste toléré s'il n'est jamais seul ni signifiant (alternative sans glissement obligatoire, WCAG 2.2 §2.5.7) |
| Duel en temps réel (« qui répond le plus vite ») | État serveur par joueur + chronomètre compétitif ; Durable Object = état serveur, admis en P2 sur preuve seulement | VÉRIFIÉ (D0.18) | Voir §9 (P2) : le duel n'est pas mort, la **forme temps réel** l'est |
| Streak, série de jours, flamme | Rétention quotidienne = compte + serveur ; l'usage visé est ponctuel, en situation d'argumentation. Médiane observée sur les apps à streak : 70 % d'abandon à 100 jours | VÉRIFIÉ (§4, plan §3.5) | Rien |
| Badges, niveaux, points, « chapitre complété à 100 % » | Score de personne (D0.32) ; un dénominateur transforme la lecture en devoir. « La carte des 89 » en est la forme sans nombre | VÉRIFIÉ (§4) | Rien sous cette forme |
| Classement de boucle WhatsApp, « top de la famille » | Classement de personnes (D0.32) + état serveur | VÉRIFIÉ (§4) | Rien |
| Questionnaire de profil (âge, code postal, revenu) pour « tes 3 mesures » | RGPD art. 9 ; c'est l'erreur d'Elyze et d'avenir-en-commun.net. Remplacé par la table statique publiée de « Pour ta tante » | VÉRIFIÉ (§4) | Rien : la personnalisation passe par un choix explicite dans une table relue, jamais par une donnée saisie |
| Mascotte qui commente les réponses, confettis, « bravo » | D0.32 points 1 et 3 ; la tortue est sobre, muette, et n'entre jamais dans un jeu (D0.12, D3.11) | VÉRIFIÉ (§4) | Rien |
| « Invite 3 amis pour débloquer la suite » | Partage forcé = « honte à partager » ; le partage reste un geste volontaire, un tap | VÉRIFIÉ (§4) | Rien |
| Cadeaux, tirages au sort, récompenses matérielles | Code électoral L106 (dons pour influencer le vote) ; rien à gagner que le texte | PROBABLE (à confirmer T9, O11) | Rien |
| Chronomètre punitif, pénalités, vies, « game over » | Infantilise et transforme l'erreur en humiliation capturable | VÉRIFIÉ (§4) | Rien |
| Propositions reformulées ou modifiables dans un jeu | Fidélité absolue : le jeu manipule des ids, l'app affiche le verbatim. C'est le second grief contre Elyze | VÉRIFIÉ (§4) | Rien |

### 1.2 Éliminées ou reléguées par la grille et la red team

Dix-huit fiches notées sur 5 critères (A fait lire · B sans compte ni serveur · C verbatim ≤ 1 tap · D résiste au retournement · E ≤ 2 j et 0 €), médiane de 3 juges, seuil 7/10, tout 0 éliminatoire.

| Idée | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **« Devine le %, la date d'abord »** | 7/10, la note la plus basse des 18, **et** drapeau « honte » D0.32 point 4 posé par 2 juges sur 3 : **33 des 47 cartes éligibles datent de 2021** (2018 : 2, 2019 : 3, 2020 : 5, 2021 : 33, 2022 : 1, 2024 : 3). Un pool à 70 % de 2021 met en avant des sondages périmés *par construction*, quelle que soit la mise en forme ; la capture « ils ressortent des sondages de cinq ans » ne dépend pas de l'écran. Éliminée avant red team ; amende D0.20 | VÉRIFIÉ (années des cartes, `data/stat-cards.json`) | Rien en l'état : réduite aux cartes 2022-2024, le pool tombe à **4 cartes**, trop peu pour une série. Le geste curseur survit dans « Devine le chiffre » (§9), où la réponse est dans le texte et où ni la loi 77-808 ni une date de sondage n'entrent en jeu. Les 48 cartes restent des `StatCard` de lecture sous gabarit 77-808, jamais sur une image (D5.5) |
| Duel « Devine le %, à deux » | Fusionné dans « Devine le % », éliminé avec elle | VÉRIFIÉ (§11) | Voir la ligne précédente |
| **« Le relais » sous sa forme « ids libres »** | Une URL qui laisse composer une suite d'ids choisis par l'expéditeur permet de fabriquer un artefact hostile *sous notre marque*, et relie expéditeur et destinataire. Bloquante non levable sans changer de forme | VÉRIFIÉ (§7.8) | La **forme fermée** (choix parmi trois propositions statiques, marche ≤ 10 encodée en fragment, sans provenance ni compteur de personnes) est vivante en P2 (§9) |
| **« La carte des 89 » comme mécanique de v1** | 10/10 à la grille, mais **0 voix sur 20** en session 2 et mosaïque **incomprise par 3 personas sur 7**. La progression reste « Section lue. » + jauge plate | HYPOTHÈSE (personas) — D5.14, D5.15 | v2 sur preuve : mosaïque comprise par ≥ 2 non-politisés sur 3 dans un test humain réel. Le composant de navigation, lui, reste au socle (§9) |
| « La mosaïque des 831 » comme geste ludique | 9/10, mais c'est un composant de navigation réutilisé par trois fiches, pas un geste ; point faible non traité : « 831 affichées, 837 cases » (D1.2) | VÉRIFIÉ (§11) | Reste au socle T2/T4 ; passe en red team avec lui en T12 (O8) |
| « Mot pour mot » comme mécanique | 9/10 mais A = 1 (ne fait pas lire par lui-même) ; c'est une brique de confiance de 0,5 j | VÉRIFIÉ (§11) | Livré comme volet « Vérifier à la source » du socle, pas comme mécanique |
| « Réplique 10 s » comme mécanique d'entrée T5 | 9/10, mais ce n'est pas une entrée : c'est l'écran 0 du militant | VÉRIFIÉ (§11) | Livrable T8 avec ses 4 corrections (D5.11) ; en session 2, **4/4 militants en 5-7 s et 1-2 taps** |
| « Un concept en 20 secondes » comme mécanique | 8/10, E = 1 (2 j pour trois pilotes, budget perf CPU ×4 à prouver) ; c'est une **anatomie de carte-concept**, pas une entrée | VÉRIFIÉ (§10.4) | Fusionnée dans T2 : l'explorable est replié en bas de la carte-concept pour 2-3 concepts (D3.10) |
| « 3 mots, vérifie » | 8/10, A = 1 ; des mots choisis pour gêner (« dette », « désobéir ») s'affichent sous notre marque même avec une liste blanche | VÉRIFIÉ (§11) | Ne revient qu'avec la liste blanche de partage de « Tape un mot » écrite et relue |

### 1.3 Abandonnés après la session 2 (D5.15)

Sept objets ont été prototypés, joués par les 7 personas sur `proto.cestecritla.fr`, et retirés. Ce sont les abandons les plus coûteux du dossier : le code existe.

| Idée | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **Niveau 3 de gamification** (état personnel dans l'URL) | Vote des personas : niveau 1 × 1, **niveau 2 × 4**, niveau 3 × 2 (médiane 2, majorité 4/7). Le niveau 3 tient **techniquement** — état `#r=` observé chez le destinataire **6/6** — mais échoue à la tâche « envoie-le à quelqu'un qui n'est pas militant » : **4/7 refusent** (capture « même eux ne connaissent pas leur programme »), **2/7** le trouvent « mou » sans score, et le score est interdit par D0.32. Amende D0.18 | HYPOTHÈSE (personas) — D5.13 | Un **test humain réel** avec l'état dans l'URL et un destinataire réel (`13-tests-humains.md` §3.12 point 6), après correction du `#p=` |
| Lien « Comparer nos découvertes » (`#r=`) et « Envoyer avec mes réponses » | Même preuve que ci-dessus : techniquement propre (0 trace de l'expéditeur, bloc « en commun » après les réponses seulement), socialement refusé 4/7 | HYPOTHÈSE (personas) | Reporté en **v3 sur preuve humaine** (§9) |
| Carte canvas « avec mes réponses » | Dépend de `#r=` ; tombe avec lui | HYPOTHÈSE (personas) | v3, avec `#r=` |
| **État de partie `#p=` dans la barre d'adresse** | N2 a fait voyager ses réponses par la **flèche de partage native** du navigateur, sans l'avoir voulu. Amende la règle « état dans l'URL » de D5.8 pour l'état *en cours de partie* | VÉRIFIÉ (capture `session2/N2/t2-*`) | Rien : remplacé par `history.replaceState` sans hash après lecture, état en mémoire de page ou `sessionStorage`. Seul un lien que la personne **choisit d'envoyer** porte un état, et jamais ses réponses en v1 |
| **Mosaïque des 18 chapitres** (résultat F1 et image partagée) | **Incomprise 3/7** (les trois non-politisés), « notice de médicament » sur l'image (M4), **0 voix**. Remplacée par les lignes « chapitre › section » déjà présentes | HYPOTHÈSE (personas) | Rien : le remplacement est plus lisible et coûte moins cher |
| Tout score, gagnant, ou compte « en commun » | Demandés par 2 personas sur 7 (N1, N3) et refusés : D0.32 interdit toute note ou classement de personne. Le refus est maintenu **contre** la demande des testeurs | VÉRIFIÉ (D0.32) | Rien |
| Titre « n mesures qui m'ont surpris·e » | **Point médian relevé par 6/7** ; capture retournable pour une militante (M1) | HYPOTHÈSE (personas) | Rien sous cette forme : reformulé en « n mesures à faire découvrir » ou « que je découvre », à trancher avec `design/voice.md` |
| Réécriture silencieuse `?n=1` → `?n=254` | Déroute M1 et M4 (« et si c'est imprimé en QR sur un tract ? ») | HYPOTHÈSE (personas) — O6 | Rien : un index absent affiche « ce tirage n'existe pas », jamais une réécriture |
| Double bloc de partage sur le résultat F1 | Redondance relevée en session 2 ; un seul bloc retenu | HYPOTHÈSE (personas) | Rien |

---

## 2. Direction artistique, anatomie et mascotte

Source : `05-direction-artistique.md` §1 à §8 ; captures `docs/discovery/captures/2026-09-09/maquettes/` ; maquettes `prototypes/mockups/`.

### 2.1 Les deux directions non retenues

| Idée | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **Direction B — « ludique cartes + mascotte »** | Médiane des 6 juges : **22/30** contre 30/30 pour A. Le critique la fait tomber sur trois odeurs : une démonstration de chat fausse, un chrome de template (barre d'onglets, tuiles, anneau) et une tortue qui « reste un jouet à 96 px et une flaque à 24 px ». Contrôle de contraste propre malgré tout : 555 nœuds de texte, 0 sous 4,5:1 | HYPOTHÈSE (personas) pour les scores ; VÉRIFIÉ pour les ratios et la ban list | Trois de ses composants **sont déjà revenus** dans l'hybride D3.9 : l'écran 0 par lien qui tient en un seul écran, le CTA visible sans défiler, l'indication « 3 min ». Le reste ne revient pas |
| **Direction C — « immersif, 4 mondes »** | Médiane **15/30**, la plus basse ; **5 personas sur 7** lisent l'aplat vert comme « EELV » ou « flyer » ; **honte à partager relevée 5/7**. Le critique la fait tomber pour pastiche des affiches M27 sans logo (« engage le mouvement » visuellement, ce que la charte LFI interdit), sélecteur de niveaux façon jeu vidéo et chiffres géants | HYPOTHÈSE (personas) pour les scores ; VÉRIFIÉ pour la ban list | Deux emprunts **sont déjà revenus** (D3.9) : la ligne « pas de compte, pas de cookie » dès l'écran 0 par lien, et les libellés « Envoyer sur WhatsApp » / « Copier le lien ». La couleur par partie reste une **option limitée aux en-têtes de section**, à juger sur canvas, hors défaut |

### 2.2 Éléments explicitement non repris dans l'hybride A

| Élément | Pourquoi écarté | Statut | Ce qui le ferait revenir |
|---|---|---|---|
| Titres en blocs colorés par partie du livre | 5/7 personas y lisent un autre parti ou un flyer | HYPOTHÈSE (personas) | Un test humain sur la variante « en-têtes de section seulement » (proposition J5), jamais comme défaut |
| Tuiles « quatre mondes » | Chrome de template ; n'apporte rien que la table des matières ne fasse | HYPOTHÈSE (personas) | Rien |
| Anneau de progression à 18 encoches | Remplacé par la jauge plate + Marcheuse 24 px, acceptée sans remarque négative en session 2 | HYPOTHÈSE (personas) | Rien |
| Barre d'onglets (Accueil / Chercher / Chapitres / Riposte) | Chrome d'application ; N2 : « la tortue pour *Chapitres*, je ne comprends pas le rapport » | HYPOTHÈSE (personas) | Rien |
| Badges « MESURE CLÉ » | Bruit visuel ; l'étiquette textuelle suffit | HYPOTHÈSE (personas) | Rien |
| Chrome Charbon en mode clair (dark-first de C) | Contredit « Crème partout, Charbon pour lire » | VÉRIFIÉ (tokens) | Rien |

### 2.3 Anatomies de carte-concept non retenues

| Anatomie | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **Progressive** (« En clair » d'abord, verbatim replié derrière un « + ») | La **plus rapide au chrono** (médiane **12 s** contre 22 pour la dense) mais **1 juge sur 6** et **1 persona sur 7** seulement. Elle cache le texte du programme : « on cache le texte officiel ? ça fait suspect » (J4), « je ne le crois pas sans le texte » (M2, M4, N2), et J6 titre la capture « ils réécrivent le programme et cachent le texte officiel ». Inverse la hiérarchie des voix (`voice.md` règle 3) | HYPOTHÈSE (personas) — D3.10 | Elle **est déjà revenue par sa meilleure moitié** : son étape 1 (titre + badge + « En clair » sans code ni pointillé + un seul CTA) devient le premier écran de la dense corrigée. Le repli du verbatim, lui, ne revient pas |
| **Explorable** (curseur « ce qu'on prélève » / « ce que la nature refait ») | La **plus lente** : médiane 19 s, **85 s pour M4 (seul échec au-delà de 60 s, 6/7 seulement)** ; la poignée est trop petite pour M4 ; un curseur sur un sujet politique réveille le réflexe Elyze (N2) ; retournement prêt à l'emploi pour J6 : « même leur app admet que la règle verte n'a pas d'unité », et la barre rouge se recadre en « LFI veut prélever plus ». Elle donne pourtant la meilleure image mentale (M2 : « c'est le schéma que je fais au tableau ») | HYPOTHÈSE (personas) — D3.10 | **Revenue en position repliée** : « Voir le principe » en bas de carte, pour les seuls concepts qui s'y prêtent (règle verte, règle bleue), jamais en ouverture, avec alternative sans glissement. Sa promotion en ouverture demanderait un test humain montrant ≥ 5/7 sous 20 s |

### 2.4 Pistes de mascotte abandonnées

Protocole `design/illustration-rules.md` §4 : reconnaissance « tortue » à 512 px et à 24 px, seuils ≥ 0,8 et ≥ 0,6.

| Piste | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **Signet** (carapace = un livre) | Reconnue tortue **0/7 à 512 px** et **0/7 à 24 px** : « valise », « camion », « bus violet », « tracteur », « canapé avec une clé ». Deux personas posent le drapeau honte ; M2 met un zéro « clipart ». Les deux seuils sont ratés | HYPOTHÈSE (personas) | Rien. L'idée « la carapace est un livre » ne se lit pas sans légende, et une mascotte qui a besoin d'une légende n'en est pas une |
| **Monotrait** (arc au trait épais) | **5/7 à 512 px** (seuil 0,8 non tenu) et **3/7 à 24 px** (seuil 0,6 non tenu) : « casque », « galet », « escargot », « souris ». 1 juge sur 6. Belle en grand, perdue en petit — or la mascotte ne sert qu'en petit | HYPOTHÈSE (personas) | Une piste **hors mascotte** : M2 et M3 la voient comme **monogramme du wordmark**. Elle ne reviendrait donc pas comme personnage mais comme signe typographique, et seulement si le wordmark en a besoin — ce qui n'est pas le cas aujourd'hui (D10.2 : wordmark texte seul) |
| Un **nom** pour la mascotte | Les 4 militants qui répondent préfèrent **sans nom** : « un prénom ferait Duolingo », « tout prénom mignon me fait sortir » | HYPOTHÈSE (personas) — D3.11 | Rien en v1 : `mascot.name` reste vide |
| Mascotte présente ailleurs que sur la jauge | Conditions posées par les personas : jamais sur ce qui s'envoie (M1), jamais géante sur l'écran 0 (M3), jamais animée en boucle (M4), « utile ou absente » (N3). N2 (non-politisée) la trouve « enfantine » et préfère aucune mascotte | HYPOTHÈSE (personas) — D3.11 | Un test humain qui montre un gain sur un écran précis. « Aucune mascotte » (direction A pure) reste le **défaut de repli** |

### 2.5 Registre

| Idée | Pourquoi écartée — preuve | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| Registre « vous » comme défaut | Personas : **tu 4/7 (tous < 35 ans), vous 3/7 (tous > 45 ans)**, aucune ligne rouge de part et d'autre ; « le vous ferait prof » (N1) | HYPOTHÈSE (personas) — D3.12 | Le kit « vous » **est conservé** comme variante activable par flag KV, pour un test humain ciblé > 45 ans. L'écran 0 par lien et la mention IA restent à l'impersonnel dans les deux cas |

---

## 3. Partage et cartes d'aperçu

Source : `06-partage.md` §2 (mesures du spike), §4 (ADR), §9 (points ouverts) ; spike `prototypes/spike-share/` ; captures `captures/2026-09-07/spike-share/`.

L'ADR posait cinq options. Une seule est retenue (C, pré-génération au build, D4.1) ; deux sont des compléments vivants (D, E), deux sont mortes.

| Option | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **A — rendu satori + resvg dans le Worker, à la demande** | **137 à 283 ms de CPU médian par carte contre 10 ms autorisés** sur le plan gratuit, soit **14 à 75× la limite** ; après quelques dizaines de rendus, **33 à 75 % des requêtes sont tuées** (503, code 1102). Un crawler d'aperçu qui reçoit un 503 met en cache « pas d'image ». Le bundle passait pourtant (2,88 Mio brut / 1,09 Mio gzip) et les PNG aussi (43-132 Ko, limite 300 Ko) : **c'est le CPU seul qui tue l'option** | VÉRIFIÉ (GraphQL `workersInvocationsAdaptive`, spike déployé) — D4.1 | Un plan payant, exclu par D0.2 et D0.31 (aucun moyen de paiement). Autrement dit : rien. Le code de carte du spike n'est pas perdu — il **devient le script de build** de l'option C |
| **B — rendu à la demande + Cache API / cache HTTP** | Le **premier** rendu de chaque carte reste tué par la même limite, et le cache est **par datacentre et par version** : sur ≈ 970 cartes × N colos, « le premier rendu » n'est pas un cas rare, c'est le cas normal. Jamais testé sur `workers.dev` parce que l'ADR le rendait inutile | VÉRIFIÉ pour la limite CPU ; **non testé** pour le Cache API lui-même | Seulement si un rendu à la demande revenait sur la table, c'est-à-dire avec un plan payant. Le test du Cache API est alors le premier à faire |
| **D — rendu dans le navigateur** (Canvas 2D ou satori côté client + `navigator.share({ files })`) | **Ne produit pas l'`og:image`** : les crawlers d'aperçu n'exécutent pas de JavaScript. Donc inapte au besoin principal | VÉRIFIÉ | **Pas écartée** : retenue comme **complément** pour le carré et la story, et pour les objets combinatoires. Reste à prouver sur un Android moyen (§9) |
| **E — aperçu générique pour les objets combinatoires** (image statique par type + `og:title` / `og:description` dynamiques, ≈ 1 ms CPU) | Aperçu correct mais non personnalisé, « moins wow » | VÉRIFIÉ | **Pas écartée** : repli acceptable retenu pour `/defi/` et tout objet dont les combinaisons interdisent la pré-génération |
| Encodage **JPEG** des cartes | `resvg` ne sort que du PNG, et les tailles mesurées (43-132 Ko) ne justifient aucun changement face à la limite de 300 Ko | VÉRIFIÉ | Une carte qui dépasserait 300 Ko : encoder en JPEG au build (sharp) plutôt que réduire les dimensions |
| Passage à **satori 0.33** (crénage harfbuzz) | Résoudrait le crénage, mais exige un shim Workers — inutile puisque le rendu est passé en build-time Node, où 0.33 fonctionne | VÉRIFIÉ | Sans objet tant que le rendu reste au build |
| Pré-génération des **trois ratios** pour les 970 objets | ≈ 970 × (64 + 81 + 106 Ko) ≈ **240 Mo** d'assets et ≈ 2 900 fichiers (limites : 20 000 fichiers, 25 Mio par fichier — tenues, mais le volume est inconfortable) | VÉRIFIÉ | Si le volume gêne : ne pré-générer que l'`og` (≈ 60 Mo) et laisser carré et story au rendu client (option D) |

---

## 4. IA : modèles, contrats et retrieval

Source : `08-ia.md` §3 (retrieval), §4 (génération), §7 bis (bench v2 et décision) ; `eval/results.md`, `eval/results-v2.md`, `eval/retrieval-results.md` ; `neurons-log.md`.

Rappel du cadre : **le chat est livré en extractif pur, aucun LLM à l'exécution** (D6.10). Tout ce tableau décrit donc des options écartées *à l'intérieur* d'un périmètre lui-même mis en veille.

| Idée | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **Contrat v2 « sélection pure »** (le modèle rend `cited_ids`, `liant_kind`, `hors_programme`, `glossary_term`) | Bench de 40 items : coût **34,4 neurons/question** (seuil ≤ 35 tenu) et **0 invention après validateur** (tenu), mais **`liant_kind` exact 50 %**, **refus 87,5 %** (seuil 95 %) et **p95 4 159 ms** (seuil 3 000 ms). Sur 40 écrans relus par 2 juges : **1 écran éliminatoire** (q084) et **9 écrans** affirmant une exhaustivité que le corpus ne soutient pas. Payer 34,4 neurons pour un écran éliminatoire sur 40 est un mauvais marché | VÉRIFIÉ (`eval/results-v2.md`) — D6.9, D6.10 | Rien sous cette forme. Le champ que le modèle rate est **retiré du contrat**, pas amélioré : voir contrat v3 au §9 |
| **Le liant choisi par le modèle** | Posture correcte **52,5 %** quand le modèle la choisit. Un `liant_kind` invalide ne doit jamais déclencher une inférence | VÉRIFIÉ — D6.11 | Rien : la posture (confirme / précise / voici / corrige / absent / hors sujet) est **calculée par règles déterministes**, testables en CI à 0 neuron |
| **Mistral 7B v0.2 LoRA** comme sélecteur d'ids | Tarif observé **185 neurons/M tokens**, soit **≈ 138× moins cher** que Small 3.1 — et écarté quand même, sur la **forme** et sur l'**écran** : **40 % de JSON valide du premier coup**, des `cited_ids` rendus en indices (`[1,2,3,4,7]`), **2 ids fabriqués hors corpus sur 20**, clarté médiane **1/5** chez le juge « indécise méfiante », **7 écrans sur 20** affichant « Le plus proche : » suivi de rien, 3 annonçant une panne. n = 20, aucune question de glossaire | VÉRIFIÉ (bench 20 items) — D6.10 | Ses deux mérites réels (il gagne h08, la fausse citation, et rend `absent` là où Small dit « hors programme ») **cessent d'être des mérites de modèle sous le contrat v3** : ils deviennent deux règles de code, à 0 neuron. Un retour supposerait un bench ≥ 40 items incluant des questions de glossaire, et un taux de JSON valide ≥ 95 % |
| Modèles non-Mistral (Qwen3-30B, Llama 3.1 8B, gpt-oss-20b) prévus au plan | Exclus par D0.3 : toute IA à l'exécution est française | VÉRIFIÉ | Rien : c'est une contrainte non négociable du projet |
| `@cf/mistral/mistral-7b-instruct-v0.2` (non-LoRA) et v0.1 | v0.2 **non routable** sur le compte (code 7000) ; v0.1 déprécié | VÉRIFIÉ — D0.34 | Une remise en service côté Cloudflare, à vérifier au runbook « modèle déprécié » |
| **La Plateforme Mistral** (tier gratuit externe) | Opt-in entraînement sur le tier gratuit | VÉRIFIÉ — D0.3 | Rien : hors périmètre, quel que soit le prix |
| **Function calling** pour contraindre la sortie | Instable : **2 sondes sur 3** répondent en texte libre au lieu d'appeler l'outil | VÉRIFIÉ — D6.2 | Rien : remplacé par `response_format json_schema`, 130/130 JSON valides au bench v1 |
| **Variante C de retrieval** (chapitre entier après routage) | **rappel@5 0,220** contre 0,813 pour A ; rappel dans le contexte reçu **0,765** contre 0,937 pour « A top 10 ∪ 2 sections » ; et **2 288 tokens** de contexte contre ≈ 1 363. Plus cher et moins bon | VÉRIFIÉ (`eval/retrieval-results.md`) — D6.1 | Rien. Son seul acquis (routage du chapitre correct en top 1 : 0,871) est conservé comme signal, pas comme stratégie de contexte |
| **Variante B' — embeddings calculés au build** | Non nécessaires : les échecs de A sont des **paraphrases** (prison/carcéral, avion/lignes aériennes, héritage/succession) et des questions à 5 ids répartis sur plusieurs sections, que rappel@5 strict pénalise par construction ; hit@5 est déjà à **0,986**. Le levier mesuré est ailleurs : sans expansion de requête par les alias, rappel@5 tombe de 0,813 à **0,765** — **les alias valent +5 points, c'est le levier le moins cher** | VÉRIFIÉ — D6.1 | Un échec de retrieval **résiduel après enrichissement des alias FAQ**, mesuré sur les 10 pires questions de `eval/retrieval-results.md` |
| **Vectorize / AI Search (ex-AutoRAG)** | Même raison, plus une raison dure : l'**embedding de la question à l'exécution est exclu par D0.3** (aucun modèle d'embedding français sur Workers AI). Le plan les prévoyait « si tout échoue » ; rien n'a échoué de cette façon | VÉRIFIÉ — D6.1 | L'apparition d'un modèle d'embedding **français** sur Workers AI, **et** un échec de retrieval non résolu par les alias |
| **Seuil de score comme détecteur de « rien trouvé »** | Meilleur signal `top1Score < 57,2` : **F1 0,36**, précision 0,23 sur 100 questions. Inutilisable seul | VÉRIFIÉ — D6.1 | Rien seul : le refus honnête vient de la FAQ « absent » (D2.5, à élargir **des seuls sujets réellement absents** — corrigé le 10/9, panel rouge T12 : Sénat, double peine et transports gratuits sont traités par le texte) et du jugement `hors_programme` validé a posteriori |
| **Étage AND sur la recherche D1 FTS5** | **INFIRMÉ** : aucun gain de qualité, et **1,97 requête au lieu de 1** | VÉRIFIÉ (labo `d1-fts5`) — D7.7 | Rien : une seule requête OR bm25, préfixe ≥ 3 |
| Le **refus qui affirme une absence sur le programme entier** | 3 négations fausses sur 130 au bench v1 (q080 « n'évoque pas la politique pénale » face à `c7-s07` ; q083 ; h21 « n'évoque pas l'OTAN » face à `c16-s01-k01`) | VÉRIFIÉ — D6.4 | Rien : le titre « L'Avenir en commun ne traite pas de ça » est réservé aux sujets vérifiés de la FAQ « absent » |

---

## 5. Architecture et plateforme

Source : `09-architecture.md` §3 (ADR-1 à ADR-13), §8 (performance), §10.2 (points ouverts) ; labos `prototypes/labo-plateforme/`.

| Idée | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **Le rate limit binding comme défense** (le plan §3.2 le disait « par datacenter ») | **INFIRMÉ au labo** : 100 requêtes séquentielles et 40 en rafale sur connexions neuves donnent **0 × 429** pour une limite fixée à 20/min ; seule une **connexion persistante** est limitée (21 puis 429), et la convergence n'est pas observée en 20 s. La doc le dit elle-même : « permissive, eventually consistent, counters cached on the same machine » | VÉRIFIÉ (labo `do-budget`) — D7.5, ADR-7 | Rien comme défense. Le binding **est gardé** comme confort anti-rafale pour navigateurs (0,64 ms, `limit()` non compté en sous-requête). Le quota est dans le Durable Object ; l'anti-script est Turnstile + la règle de rate limiting de zone |
| **React 19 + Vite en rendu client** pour l'écran 0 | Labo `framework`, Lighthouse 13.4.1, CPU ×4 / Slow 4G, médiane de 3 : **JS initial 64 726 o contre 1 517 o** pour Astro (soit 65 % du budget de 100 Ko consommés d'emblée), **LCP 2 059 ms contre 935 ms**, chemin critique **118 231 o contre 54 894 o**. Comportement prouvé identique (0,012 % de pixels différents sur 9 exécutions) : c'est bien le coût de la pile, pas de la page | VÉRIFIÉ — D7.2, ADR-3 | **Partiellement revenu** : une île Preact/React via `@astrojs/react` reste autorisée pour un composant qui le justifie (le chat), chargée `client:visible` / `client:idle` et comptée par chunk. Le rendu client de l'écran 0 ne revient pas |
| **Cache API du Worker** | Non testé, parce que l'ADR sur les cartes OG a supprimé le seul usage qui le justifiait | **non testé** | À vérifier seulement si un rendu à la demande revenait sur la table (plan payant, exclu) |
| **KV comme cache dynamique** | **1 000 écritures par jour** sur le plan gratuit : c'est un piège, pas un cache | VÉRIFIÉ | Rien : KV reste en lecture seule (flags, assets chauds) ; le cache de questions est en D1 (100 000 écritures/jour) |
| **`GET /api/search`** (repli serveur pour un client sans JS) | Besoin non établi, et chaque appel coûterait **une requête Worker** sur les 100 000/jour partagées avec le chat | HYPOTHÈSE de besoin — §10.2 point 10 | Un cas d'usage documenté (par exemple un taux mesuré de visiteurs sans JS) |
| **Cloudflare Web Analytics** (script tiers sans cookie) | D0.22 : Analytics Engine seul, **aucun script tiers** ; D3.5 : zéro tiers | VÉRIFIÉ — ADR-11 | Rien |
| Envoi d'**un événement par geste** plutôt qu'une balise par session | À 240 000 sessions/jour, 100 % d'échantillonnage donnerait **240 000 requêtes > 100 000/jour** : le chat serait coupé par les événements | VÉRIFIÉ (calcul sur limites documentées) — ADR-11 | Rien : une seule balise par session au `pagehide`, échantillonnée à 10 % |
| **Pré-clearance Turnstile** | Poserait un cookie `cf_clearance`, ce qui casse la promesse « aucun cookie » | VÉRIFIÉ (labo `turnstile` : 9 passes, 4 moteurs, **0 `Set-Cookie`** sans pré-clearance) — D7.6, ADR-8 | Rien |
| Envoi de `remoteip` à `siteverify` | Transmettrait une IP là où rien ne l'exige | VÉRIFIÉ — ADR-8 | Rien |
| **Turnstile sur l'accueil ou les pages de partage** | Un tiers par construction (`api.js` 27 423 o gzip + iframe) ; il n'a de sens que là où un quota est consommé | VÉRIFIÉ — ADR-8 | Rien. En extractif pur (D6.10), il n'y a plus de quota à protéger : Turnstile reste **spécifié et dormant** |
| Refus de principe du **Durable Object global unique** (règle générale de la skill `durable-objects`) | Écarté ici sur pièces : le compteur du jour **est** l'atome de coordination, et le débit attendu (≤ 300 réservations/jour, pics de 40) est **10⁴ fois sous** la limite douce de 1 000 req/s par objet ; mesuré : 265 réservations acceptées, la 266ᵉ refusée, 40 parallèles ⇒ `used` exact | VÉRIFIÉ (labo `do-budget`) — D7.4, ADR-6 | Sans objet |
| **Logs de production** (`observability`, AI Gateway Logs) | Une question politique rattachable est une donnée sensible (RGPD art. 9). Les logs AI Gateway sont **activés par défaut avec le prompt et la réponse** : ils sont coupés avant le premier appel | VÉRIFIÉ — D7.8, ADR-10 | Rien |

---

## 6. Corpus et ingestion

Source : `03-corpus.md` §2 (pipeline), §5 (vérification et recoupement RSS), §7 (corpus annexes), §11 (anomalies).

| Idée | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **Le flux RSS comme source d'ingestion** | 21 pages, **202 items pour 189 guids distincts** (13 doublons de pagination) et **87 URL alias** ; **88 sections sur 89** retrouvées — `c10-s01` (« Réaliser l'égalité entre les femmes et les hommes ») est **absente du flux**, lacune côté site ; et **6 items (4 posts) sont des alias périmés** de `c1-s03`, `c14-s02`, `c10-s05`, `c5-s06` : même titre, contenu plus ancien, coquilles (« mettre un place »), sous-mesures aplaties | VÉRIFIÉ (`scripts/rss-crosscheck.ts`) — D1.3 | Rien comme **source**. Le flux **est conservé comme recoupement** : toute absence autre que `c10-s01` fait échouer le contrôle (code 1) |
| **Force brute d'URL** `/chapitreN/sM/` | Les URL ne sont **pas hiérarchiques** : le slug `sM` est résolu globalement, ce qui produit **225 pages « 200 OK » dupliquées** | VÉRIFIÉ | Rien : l'énumération passe par l'accueil → 18 chapitres → `nav.tdm` → 89 sections, 116 requêtes, une passe |
| **API REST WordPress** pour le programme 2025 | Le custom post type `lfi_programme_2025` **n'est pas exposé** en REST (404/401) | VÉRIFIÉ | Une exposition côté site, à revérifier au re-crawl hebdomadaire |
| **Crawl depuis un Worker** | 116 requêtes pour une passe contre **50 sous-requêtes par requête** sur le plan gratuit ; et les 10 ms de CPU interdisent de toute façon un parseur HTML à l'exécution | VÉRIFIÉ — D1.3, ADR-13 | Rien : ingestion, re-crawl et bench vivent dans GitHub Actions, jamais dans le Worker |
| **Correction des coquilles du texte source** | Fidélité absolue : les 15 anomalies sont **rendues telles quelles** selon `meta.source_anomalies`, jamais corrigées | VÉRIFIÉ — D1.8 | Rien. Une coquille se signale à l'équipe officielle, elle ne se corrige pas dans le corpus |
| **Contenu 2022 (livrets, plans, FALC) présenté comme le programme** | 41 livrets + 13 plans + 26 sections FALC portent des chiffres et des mesures **périmés** ; ils ne sont jamais cités comme l'édition 2025 ni servis comme passages du programme | VÉRIFIÉ — D1.5 | Rien. Ils restent sources d'appoint pour le glossaire, avec pastille « Contexte 2022 » et date |
| **Reproduction intégrale des articles Désintox** | **Pas de licence CC** sur `desintox.lafranceinsoumise.fr` : `meta.license_note` impose « source citée, avec lien vers l'article d'origine, pas de reproduction intégrale sans vérification » | VÉRIFIÉ — D1.5 | Une licence explicite, ou une autorisation écrite (à instruire en T9) |
| **`Last-Modified` / `ETag` comme signal de fraîcheur** | Absents ; `If-Modified-Since` renvoie 200 | VÉRIFIÉ | Rien : la fraîcheur se mesure par SHA-256 par section (89 empreintes) |

---

## 7. Conformité, identité juridique et marque

Source : `11-conformite.md` §5 (LCEN, plan B), §8 (marques), §12 (licences), §19 (revue juriste hostile).

| Idée | Pourquoi écartée — preuve chiffrée | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| **Créer une association loi 1901 dès maintenant, pendant la campagne** | Une association déclarée **publie sa dénomination et son siège** (LCEN art. 1-1 I) : c'est un **recul** par rapport à la situation actuelle (éditeur non professionnel, art. 6-III-2 ; whois `.fr` à diffusion restreinte vérifiée à l'AFNIC, titulaire « Ano Nymous »). La bascule coûte en plus une déclaration en préfecture, un compte bancaire et un changement de titulaire du domaine | VÉRIFIÉ pour les textes ; PROBABLE pour l'appréciation du régime | **Trois déclencheurs, un seul suffit** : plus de **50 000 visiteurs sur 7 jours glissants**, **ou** une première mise en demeure, **ou** un article de presse nationale nommant l'app. Les statuts restent **préparés en brouillon**, non déposés (§9) |
| **Déposer « C'est écrit là » à l'INPI** | Trois raisons cumulées : ≈ **190 € pour une classe**, donc une dépense là où le budget est 0 € (D0.2) ; un **titulaire nommé au registre public**, donc la fin de l'anonymat (D0.15) ; et une **apparence d'appropriation** d'un nom lié au mouvement. Recherche TMview du 9/9/2026 : **0 résultat** sur `cestecritla`, **aucune marque identique** à « c'est écrit là » ; le nom est protégé de fait par l'usage et par le domaine | VÉRIFIÉ pour les recherches ; PROBABLE pour le risque (les captures TMview ne portent pas le statut juridique) | Un **dépôt par un tiers** sur le même signe, **et** un anonymat devenu sans objet (association déjà déclarée). Dans ce cas seulement, vérifier d'abord le statut de « C'EST ECRIT » (P.R. et Associés SA, dépôt du 19/1/1990, classes 35/38/42) sur `data.inpi.fr` ou au BOPI |
| **Publier l'identité réelle de l'éditeur** | D0.15, verbatim utilisateur : « je ne veux pas publier mon identité réelle mais être légalement protégé ». L'option retenue est l'éditeur non professionnel : seules les coordonnées de l'hébergeur sont publiées, l'identité est conservée chez l'hébergeur | VÉRIFIÉ (texte) / HYPOTHÈSE (faisabilité avec Cloudflare comme hébergeur) | La perte du caractère non professionnel de l'édition — c'est-à-dire la ligne suivante |
| **Recettes, dons, cagnotte, sponsoring** (même pour payer les 8 €/an du domaine) | Toute recette fait cesser le caractère « non professionnel » de l'édition et impose la publication de l'identité complète (LCEN art. 1-1 I) | VÉRIFIÉ | Rien. Règle absolue : aucun revenu, jamais |
| **Bandeau cookies** | Aucun traceur non strictement nécessaire : 0 cookie mesuré (labo Turnstile, 9 passes), Analytics Engine sans identifiant, aucun script tiers. Un bandeau serait un faux signal | VÉRIFIÉ | L'ajout d'un traceur non nécessaire — ce qu'aucune décision ne prévoit |
| **Disclaimer de contenu politique** | D0.1 : refusé explicitement par l'utilisateur. À ne pas confondre avec la **mention IA** (art. 50, obligatoire *si une IA tourne*) ni avec la **ligne d'indépendance** (protectrice, retenue) | VÉRIFIÉ | Rien |
| **Mention IA affichée en permanence** | Règle de build « pas de mention IA sans IA » : en extractif pur (D6.10), aucune IA ne tourne à l'exécution, l'art. 50 est sans objet et la page À propos explique la méthode | VÉRIFIÉ — D9.15 | La réouverture du chat sous contrat v3 (§9) : la mention v1 est déjà rédigée et jugée (5/5 juges « ce n'est pas un disclaimer ») |
| **Réutilisation du code d'actionpopulaire.fr** | Licence AGPL, incompatible avec la publication du reste du dépôt sous MIT | VÉRIFIÉ — D1.11 | Rien |
| **Logos LFI ou M27 dans l'app** | Charte LFI : « ne jamais engager le mouvement » ; l'illustration officielle de la tortue est créditée Hello Melro et n'est **pas** couverte par la licence CC (qui ne porte que sur les textes) | VÉRIFIÉ — D3.3 | Rien. Wordmark propre + attribution CC en texte |

---

## 8. Nom et positionnement

Source : `12-positionnement-lancement.md` §8 (sprint de nommage : 60 candidats, 3 familles, grille à 5 critères, RDAP du 9/9/2026 07:37 UTC).

### 8.1 Les sept finalistes non retenus

Retenu : **« C'est écrit là »**, `cestecritla.fr`, seul 9/10 de la sélection (D10.2).

| # | Nom | Score | Pourquoi écarté — preuve | Statut | Ce qui le ferait revenir |
|---|---|---:|---|---|---|
| 2 | C'est dedans | 8/10 | Clarté 1/2 : le nom seul ne dit pas *dedans quoi*. Il a besoin d'une carte de mesure sous le wordmark — vrai pour tout aperçu OG, faux pour une affiche ou un QR nu | VÉRIFIÉ (RDAP : libre) | Un pivot vers une identité centrée sur la fonction *trouver* plutôt que *montrer* |
| 3 | Tiens, lis | 8/10 | Le groupe « nsl » se dicte mal (« tienlis » ?) : domaine 1/2 | VÉRIFIÉ (RDAP : libre) | Un usage dominé par le tract avec QR, où le nom ne se dicte jamais |
| 4 | C'est marqué | 7/10 | Sans accent, `cestmarque.fr` se lit « c'est marque » ; « y a marqué pigeon ? » est un retournement immédiat | VÉRIFIÉ | Rien |
| 5 | Par écrit | 7/10 | Registre administratif, fierté 1/2 ; « par écrit, jamais par les actes » est l'attaque standard offerte au titre | VÉRIFIÉ (`.com` pris depuis 2005) | Rien |
| 6 | Mot exact | 7/10 | Connotation technique (« mot clé exact », vocabulaire publicitaire) ; l'autocollant « INEXACT » sur le wordmark est trop facile | VÉRIFIÉ | Rien |
| 7 | Pied à pied | 7/10 | **Clarté 0/2** : nom de riposte pure, ne dit rien à un indécis qui arrive par lien | VÉRIFIÉ (`.com` pris) | Rien |
| 8 | Mot pour mot | 6/10 | **Domaine 0/2 — éliminatoire** : `motpourmot.fr` est pris (blog littéraire, OVH, expire le 6/4/2027) ; seule la forme à deux tirets est libre, et dictée sur un marché elle envoie chez le blog | VÉRIFIÉ (RDAP) | La libération de `motpourmot.fr` (à surveiller au 6/4/2027). Le nom **survit déjà comme formule** dans `design/strings.json` et dans la phrase de positionnement — mais jamais comme nom |

### 8.2 Les familles et les éliminatoires appliquées avant notation

| Famille ou motif d'élimination | Pourquoi — preuve | Statut | Ce qui le ferait revenir |
|---|---|---|---|
| Tout nom contenant « **mesure** » (« Trouve la mesure », « La Mesure », « Bonne mesure ») | « Démesure » est un titre prêt à l'emploi, et un préfixe de deux lettres retourne le wordmark | VÉRIFIÉ | Rien dans le **nom**. Le mot reste libre dans les phrases (« chaque mesure a son lien ») |
| Famille **tortue** entière (20 noms : Cistude, Testude, Trois pas, Écaille, Partir à point, Sans hâte, Tortuto…) | Perdent à l'oral ou au premier détournement (« cystite », « testicule », « trépas », « ça s'écaille », « partez », « l'urgence sociale peut attendre ») ; « Tortuto » tombe sous D0.32 (mascotte enfantine). Plafonne à 7/10 avec « Pied à pied » | VÉRIFIÉ | Rien : la tortue reste du domaine de l'illustration, elle parle au militant et pas à l'indécis |
| Famille **fidélité** (21 noms : Le Verbatim, Dans le texte, Ligne par ligne, Texte intégral…) | Plafonne à 7/10 : l'indécis n'y voit qu'une promesse abstraite ; et les expressions les plus fortes sont déjà occupées en `.fr` sans tiret ou par une marque | VÉRIFIÉ | Rien : le podium est entièrement dans la famille *geste de marché*, les seuls noms qui disent à la fois le produit et l'usage |
| Collisions écartées : « Dis voir », « Le Verbatim », « Pleine page », « Cite-moi » | Éditions Dis Voir (maison d'édition active, `disvoir.com`, VÉRIFIÉ) ; marque de supports de stockage ; éditeur bordelais (PROBABLE) ; Cité Moi / CITE MOI + `citemoi.com` déposé en avril 2026 (PROBABLE) | VÉRIFIÉ / PROBABLE | Rien |
| Noms frôlant l'officialité : « Lexique commun », « Le Texte », « Dans le programme » | Suggèrent une publication officielle, ce que D0.14 interdit (« projet militant indépendant ») | VÉRIFIÉ | Rien |
| Gabarits question : « Tu savais », « C'est écrit où », « Dis voir » | Terrain déjà occupé par cachangequoi.fr, et une phrase à trous offerte à l'adversaire | VÉRIFIÉ | Le gabarit **est conservé pour la mécanique** « Tu savais que c'était dedans ? », jamais pour le nom |
| Génériques : « Clé de lecture », « Preuve à l'appui », « Demande au texte » | Distinctivité 0 face aux noms civic-tech | VÉRIFIÉ | Rien |

### 8.3 Positionnement

| Idée | Pourquoi écartée — preuve | Statut | Ce qui la ferait revenir |
|---|---|---|---|
| Se différencier **graphiquement** de l'existant | Deux projets indépendants appliquent déjà la charte 2027 avec les mêmes polices libres : l'audit navigateur (6 produits × 8 critères, 53 captures) montre qu'il n'y a pas d'espace graphique à prendre | VÉRIFIÉ — D10.1 | Rien : la différence est **fonctionnelle** (URL courte + carte par mesure sur l'édition 2025, recherche locale tolérante hors-ligne, glossaire sourcé, zéro donnée) |
| Revendiquer une avance sur « arrivée par lien » et « zéro donnée » | L'audit établit une **parité**, pas une avance, avec cachangequoi.fr sur ces deux critères | VÉRIFIÉ — D10.1 | Une mesure d'audit ultérieure qui montrerait l'écart |

---

## 9. Backlog reporté (P2 / P3 / v1.1 / v2 / v3) — différé, pas abandonné

Ces lignes ne sont pas des refus. Chacune a un **déclencheur** : tant qu'il n'est pas atteint, la ligne dort ; quand il l'est, elle repasse en décision, pas directement en code.

### 9.1 Mécaniques et contenus

| Ligne | Rang | Déclencheur précis | Preuve / source |
|---|---|---|---|
| **Contrat v3 « ids seuls »** (le modèle ne rend que `{cited_ids ≤ 3, hors_programme}`, ≈ 27 neurons/question, ≈ 313 questions nouvelles/jour à 8 500) | Réouverture IA | **Trois preuves nommées, toutes obligatoires** (P1, P2, P3 sont ici des noms de preuves, pas des rangs de backlog) : **P1** — écrire la table de règles R0-R6 et la rejouer sur les 60 écrans du bench (**0 neuron**) : succès = 0 écran affirmant ce que le corpus ne soutient pas, à défaut ≤ 2 tous neutres ; **P2** — bench v3 sur les 40 mêmes items **exécuté depuis un Worker** (≈ 1 084 neurons, sur les **1 286,69** restants du plafond de session) : succès = ≤ 30 neurons/question, **p95 < 3 000 ms**, ids ⊂ candidats 100 %, 0 invention, correctes au sens large ≥ 90,6 % ; **P3** — relecture personas (0 neuron) : « aucun écran n'a l'air d'une panne » | D6.10, `08-ia.md` §7 bis.7 |
| **Duel par Durable Object** | P2 | Une preuve d'appétit **et** une forme sans état serveur par joueur ; aucune preuve tentée en T5. La forme « Comparer nos découvertes » (fragment) couvre le besoin sans serveur | D0.18, O10 |
| **« La chaîne de concepts »** (9/10, `/chaine/<n>`) | P2 conditionnée | Ses **dépendances** d'abord : ≥ 3 explorables validés (« Un concept en 20 secondes », 2 j) et « Le mot en contexte » (1,5 j) ; puis un niveau 3 confirmé | `07-mecaniques.md` §7.10, §8.5 |
| **« Le relais » en forme fermée** (`/relais/<longueur>#c=`) | P2 | Prolongement de F1 : depuis le résultat, « Passer le relais » ajoute une mesure choisie **parmi trois propositions statiques**, marche ≤ 10, sans provenance ni compteur de personnes. Conditionné au retour du niveau 3 | `07-mecaniques.md` §7.8, §8.4 |
| **« Pour ta tante »** (`/pour/<situation>/<angle>`, 8/10) | P2 | Relecture humaine des **tags** `data/section-tags.json` (9 sections `review_sample`) et du **top 60** de `data/terms-candidates.json` (D1.10), **puis** une red team : la fiche n'a jamais été red-teamée | `07-mecaniques.md` §10.2 |
| **« Le tract de poche »** (`/t/<ids>`, 8/10) | P2 / v1.1 | Deux conditions : des **packs préfaits** (des ids libres dans l'URL rouvrent le vecteur de « Le relais ») et un QR sur le domaine `.fr` — **cette seconde condition est levée depuis le 9/9/2026** (`cestecritla.fr`, D10.2) | `07-mecaniques.md` §11, D0.13 |
| **« La carte des 89 »** (`/carte#<bitmap>`) | v2 | Mosaïque comprise par ≥ 2 non-politisés sur 3 en test humain réel (0 voix et 3/7 d'incompréhension en session 2) | D5.14, D5.15 |
| **Niveau 3 de gamification** (`#r=` réhabilité) | v3 | Un test humain réel avec l'état dans l'URL et un destinataire réel, après correction du `#p=` | `13-tests-humains.md` §3.12 point 6 |
| **« La mesure du matin »** (`/j/<date>`, 9/10, 2 bloquantes levées) | v1.1 | Capacité disponible après le socle ; l'arrivée par lien est déjà couverte par la carte `/m/` | `07-mecaniques.md` §11 |
| **« Devine le chiffre »** (8/10, geste curseur) | v1.1 | **Red team obligatoire avant tout prototype** (D = 1 : curseur capturable sur une valeur absurde, écart partagé proche d'un score) et `chiffres.json` écrit | `07-mecaniques.md` §11 |
| **« Le programme en 12 chiffres »** (9/10) | Réserve | `chiffres.json` écrit ; red team T12 avec le socle ; « chiffres non financés » à tester | `07-mecaniques.md` §11, O8 |
| **« 3 mots, vérifie »** (8/10) | Réserve | La liste blanche de partage de « Tape un mot » écrite et relue | `07-mecaniques.md` §11 |
| **Sidecar `stat-cards-legal.json`** | T9, bloquant | Institut, commanditaire, dates de terrain et échantillon saisis à la main depuis les PDF des instituts ; URL du PDF Harris juillet 2021 archivée. **Sans lui, aucune carte statistique hors verbatim de section** | O2, D1.9 |
| **Raccourci swipe « Passer »** | v1.1 | ≥ 50 % des testeurs tentent un glissement horizontal pour passer. Session 2 : **1/7**, sans demande — donc non déclenché ; à réobserver en test humain | D5.9 |

### 9.2 Plateforme, partage et conformité

| Ligne | Rang | Déclencheur précis | Preuve / source |
|---|---|---|---|
| **PWA hors-ligne / service worker** | v2 | Critère 5 de la v2 : « l'app entière fonctionne hors ligne après une première visite, y compris la recherche et le refus », mesuré par Playwright en mode offline. **Non prototypé** à ce jour. Rappel : l'app est complète sans service worker (D3.5), et la PWA est le **deuxième sacrifice** de la coupe minimale | `09-architecture.md` §1.6, §10.2 point 9 |
| **Cartes carré et story rendues côté client** (option D de l'ADR OG) | T7 | Prouver un PNG de qualité équivalente sur un Android moyen ; sinon, pré-génération au build (volume ≈ 240 Mo) ou aucun ratio secondaire | `06-partage.md` §4, §9 point 7 |
| **`GET /api/search`** | Réserve | Un cas d'usage documenté (taux mesuré de visiteurs sans JS) : chaque appel coûte une requête Worker | `09-architecture.md` §10.2 point 10 |
| **Rebrand light** (`design/tokens.neutral.json` + maquette) | T3bis / T9 | Le déclencheur est un événement, pas une date : retrait ou désaveu par LFI (D0.17). Les livrables ne sont pas produits | `09-architecture.md` §10.2 point 8 |
| **Association loi 1901** (statuts en brouillon) | Plan B | > 50 000 visiteurs sur 7 jours glissants, **ou** une première mise en demeure, **ou** un article de presse nationale nommant l'app | `11-conformite.md` §5.5 |
| **Variante « vous »** (kit de chaînes complet) | Réserve KV | Un test humain ciblé > 45 ans qui montrerait un gain ; activable par flag sans redéploiement | D3.12 |
| **Mascotte Marcheuse hors jauge de lecture** | Jamais en v1 | Un test humain montrant un gain sur un écran précis ; « aucune mascotte » reste le défaut de repli | D3.11 |
| **Mapping FALC 2022 → 2025** | Ouvert | Travail non fait ; conditionne tout usage du registre FALC dans le glossaire | `03-corpus.md` §11.8 |
| **Élargissement de la FAQ « absent »** | Avant toute réouverture IA | **Corrigé le 10/9/2026 (panel rouge T12).** La liste d'origine (Sénat, peine de mort, double peine, crèches de Noël, transports gratuits) contenait **un sujet réellement traité** — les transports, déjà `partial` dans `faq-35` (ids `c13-s02-m02` / `c13-s02-m01`), le texte écrivant par ailleurs la gratuité réelle du transport scolaire (`c5-s03-k01`) — et **deux mots présents dans un autre sens** : `c1-s06-m11` (« adoptée à l'unanimité **au Sénat** en 2011 », une mesure sur la transparence des sondages) et `c8-s08-m06` (« la décote qui représente une **double peine** pour les **retraités** », qui n'est pas la double peine des étrangers : c'est le faux ami mesuré de q084). **Règle, corrigée une seconde fois le même jour** : un mot présent dans un autre sens **ne rend pas le sujet `partial`** — il devient un **faux ami déclaré (`excluded_ids`)** sur une entrée **`absent`**. Restent donc absents : peine de mort (**0 occurrence**, vérifié), Sénat et double peine (mot présent, sujet absent, faux amis déclarés), crèches de Noël (faux ami sur « crèche »), vote électronique, majorité numérique. Toute entrée `absent` porte désormais `neighbour_ids`, `excluded_ids` et `absence_probe` rejouée | `08-ia.md` §7 bis.6 règle R0 ; `data/faq.json` v0.2.0 |
| **Enrichissement des alias FAQ** | Avant tout nouveau bench | prison → carcéral/détenus, héritage/succession/transmettre, avion → lignes aériennes, tourisme spatial, fac → université, casse sensible (« BAC » police ≠ bac). Gain attendu +5 à +8 points sur les 10 pires questions (HYPOTHÈSE) | D6.1 |

---

## 10. Ce qui n'est écarté que par des personas

Rappel de D11.1 : un persona-agent n'est pas une personne. Les lignes ci-dessous sont les seules dont **le rejet lui-même** repose uniquement sur des opinions simulées — ce qu'ils ont *mesuré* (taps, positions, état dans l'URL, `localStorage`, fidélité au corpus) reste VÉRIFIÉ, ce qu'ils ont *dit* reste HYPOTHÈSE. Un test humain avant lancement peut les rouvrir, et lui seul.

| Ligne écartée | Ce qui la rouvrirait | Où le test est prévu |
|---|---|---|
| Le niveau 3 de gamification et l'état `#r=` | Un destinataire réel qui envoie et reçoit sans gêne | `13-tests-humains.md` §3.12 point 6 |
| « La carte des 89 » et la mosaïque | Une mosaïque comprise par ≥ 2 non-politisés sur 3 | §3.12 |
| L'anatomie progressive et l'anatomie explorable en ouverture | Un chrono humain qui inverserait le classement dense / progressive | §3.12 |
| Les directions B et C | Rien de prévu : le rejet du critique (odeurs) et la ban list sont VÉRIFIÉS, indépendamment des personas |  — |
| Les pistes de mascotte Signet et Monotrait | Les taux de reconnaissance sont des jugements de personas ; le protocole se rejoue en 8 min avec des humains | `design/illustration-rules.md` §4 |
| Le titre « n mesures qui m'ont surpris·e » | Un test humain qui ne relèverait pas le point médian | §3.12 |
| Le registre « vous » | Un test ciblé > 45 ans | D3.12 |

---

## 11. Sources

- `docs/discovery/07-mecaniques.md` §4, §6.2, §7, §10, §11, §12, §13.2, §14 — refus, matrice des 18 fiches, red team, gadgets écartés, D5.13-D5.15.
- `docs/discovery/05-direction-artistique.md` §1 à §8 — directions B et C, anatomies, mascotte ; captures `captures/2026-09-09/maquettes/` ; maquettes `prototypes/mockups/`.
- `docs/discovery/06-partage.md` §2, §4, §9 — mesures du spike, ADR OG (options A à E) ; `prototypes/spike-share/`.
- `docs/discovery/08-ia.md` §3, §4, §5, §7 bis — retrieval A/C, bench Small 3.1 et 7B LoRA, contrats v2 et v3 ; `eval/results.md`, `eval/results-v2.md`, `eval/retrieval-results.md`, `neurons-log.md`.
- `docs/discovery/09-architecture.md` §3 (ADR-1 à ADR-13), §8, §10.2 — rate limit, framework, caches, analytics ; labos `prototypes/labo-plateforme/`.
- `docs/discovery/03-corpus.md` §2, §5, §7, §11 — RSS, force brute, corpus annexes, anomalies ; `scripts/rss-crosscheck.ts`, `scripts/verify-corpus.ts`.
- `docs/discovery/11-conformite.md` §5, §8, §12, §19 — LCEN, plan B associatif, TMview, licences.
- `docs/discovery/12-positionnement-lancement.md` §8, §9.3 — sprint de nommage, critères de « fait » par version.
- `docs/discovery/13-tests-humains.md` §1, §3 — sessions 1 et 2 jouées par personas-agents (D11.1).
- `docs/discovery/decisions.md` — D0.18, D0.20, D0.32, D1.3, D1.5, D1.8, D3.9-D3.12, D4.1, D5.4-D5.15, D6.1-D6.11, D7.2, D7.5, D9.15, D10.1, D10.2, D11.1.
