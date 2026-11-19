# Plan — Le jeu d'abord

Refonte de l'accueil et du jeu « Où est-ce écrit ? » (cestecritla.fr). Plan arrêté le 18 novembre 2026, après six réponses de l'éditeur et trois relectures indépendantes (architecture, expérience de jeu, risques). **Approuvé par l'éditeur le 18 novembre 2026** ; ses décisions sont D19.1 à D19.13 dans `decisions.md`.

**Le journal d'exécution, en fin de fichier, dit où en est le travail.** Le texte ci-dessous est le plan tel qu'il a été approuvé ; ce que l'exécution y change est écrit au journal, pas ici.

## Contexte

Tu veux un site centré sur le jeu, où chercher et demander deviennent une fonction de plus, et un jeu beau, attachant, qui fait retenir le programme et récompense même quand le choix n'est pas le bon.

Ce que l'exploration a établi (site joué dans un navigateur, code, portes de test, 313 décisions) :

- **Le jeu est caché** : deuxième écran, sous le champ et quinze puces (D16.1).
- **Il ne punit jamais, mais récompense très peu** : même carte, même bond, même évolution quel que soit le choix ; rien de neuf aux fins de manche 3 à 6 et 8 à 15.
- **Il dit où, jamais quoi** : les sept personas demandaient la phrase de la mesure et choisissaient la partie « au pif » (`13-tests-humains.md` §7–§8, HYPOTHÈSE).
- **Il s'alourdit en avançant** : 3 questions par manche, puis 6, puis 9 ; une persona fermait la page au chapitre.

## Ce que tu as tranché le 18 novembre 2026

| | Décision | Ce qu'elle amende |
|---|---|---|
| D19.1 | Le jeu ouvre l'accueil ; le champ, « Demander » et les puces restent sur la page, dessous ; lien « Chercher » dans l'en-tête. | D16.1 |
| D19.2 | Chaque carte montre la phrase écrite d'avance de la mesure où le mot est épinglé. Les 48 phrases sont publiées dans le fichier du jeu (site et dépôt public), étiquetées. | D16.10 ; « jamais publiées en fichier », pour ces 48 seulement |
| D19.3 | Aucun refus rouvert : ni nombre, ni score, ni série, ni bravo, rien qui montre ce qui reste. | rien |
| D19.4 | Une seule question par mot : le jeu donne ce qui est au-dessus et demande le plus précis. | D16.12 ; la phrase « …demande aussi le chapitre » (D16.28) |
| D19.5 | Les 48 phrases suivent le mode du site (coupées si « Demander » l'est) et D16.78 vaut pour elles pendant la campagne. | D16.65, D16.78 étendues au jeu |
| D19.6 | Les phrases ne sont que dans le fichier du jeu : la manche sans script garde la carte d'aujourd'hui, aucune phrase d'IA dans le HTML de l'accueil. | précise D19.2 |

## Ce que ce plan amende en plus (approuver le plan vaut accord)

- **D16.13** : « Un indice » est offert dès le premier mot. Il désigne trois tuiles et n'en écarte aucune.
- **D17.13** : le plafond du script du jeu passe de 10 à 14 Ko gzip, en un seul fichier. Accueil (20 Ko) et données (12 Ko) inchangés.
- **D17.9, précisé** : elle reste dans le bloc du jeu ; le champ et « Demander » sont dans une section à part, séparée du jeu par la hauteur d'un écran de téléphone.
- **Carte** : « Mot suivant » prend le même poids que « C'est écrit là » (aujourd'hui plus discret).
- **« Garder ta tortue »** : la carte s'ouvre par un bouton discret ; ses phrases, leur ordre et ses deux boutons égaux ne changent pas.

## Où je m'écarte de ce que mes questions disaient

- **Ta tortue garde sa taille pendant qu'on joue.** Mes options disaient « en grand ». La doubler nourrit le « enfantine » (5 personas sur 7), et son bond a été validé à 96 px (D17.21). Elle reste grande sur la scène de fin de manche.
- **Pas de bandeau « carnet » sous le plateau.** Le carnet est sa fiche (« Ce qu'elle a trouvé »), dont chaque mot rouvre sa carte, plus le rappel de fin de manche. Un bandeau qui grossit se lirait comme une barre (D17.5).
- **Pas de ligne « Tu avais choisi… »** : elle ne paraîtrait que quand le choix n'est pas le bon, donc vaudrait un « faux ».
- **Pas d'ombre « bloc »** sur les tuiles : c'est le motif des affiches de la campagne, et R23 est déjà « probable ».

## L'expérience visée

**Accueil.** En-tête (nom, « Site non officiel. », lien « Chercher ») → la ligne « de qui est le programme, qui fait le site », petite → le jeu → section « Chercher dans le programme » (champ, « Demander au programme », résultats, puces) → pied. Pendant un silence électoral le jeu se cache et la recherche remonte seule.

**Écran de jeu.** Le mot en grand (serif, guillemets), la question, « Je ne sais pas » et « Un indice », puis les six parties en plateau de deux colonnes. Titres officiels entiers, « Partie N – » en gras. Une colonne sous 360 px ou en grand texte.

**Une question par mot.** Manches 1 et 2 : la partie. Ensuite le jeu donne la partie (son titre) et demande le chapitre ; plus tard il donne partie et chapitre et demande la section. 48 questions au lieu de 117. Seuils de profondeur et d'évolution inchangés.

**La carte**, identique quel que soit le choix :

```
Oui. C'est écrit dans la partie 4.            titre (phrases existantes)
Partie 4 – …  /  Chapitre 2 : …               petits, entiers
Reconstruire une école globale…               titre de section, serif
Aussi écrit dans la partie 5.
[ C'est écrit là ]                            lien officiel, mot surligné
┌ PHRASE ÉCRITE ET VÉRIFIÉE PAR UNE IA ──┐
│ la phrase de la mesure                  │   notre voix, cadre à part
└─────────────────────────────────────────┘
[ Mot suivant ]                               pleine largeur
```

Le lien officiel reste attaché au lieu, avant la phrase : sous une phrase d'IA, « C'est écrit là » se lirait de la phrase (D16.64).

**Fin de manche.** Scène et évolution inchangées → « Trois mots, trois endroits du livre. » → sa ligne → **« Tu te souviens ? »** → « Les prochains mots » → « Trois autres mots », partage, « Garder ».

**Le rappel.** Deux mots déjà vus (le premier de la manche, un plus ancien dont l'écart grandit). On y pense, on touche le mot, sa carte se rouvre. Aucune tuile, donc aucun leurre et aucun verdict. Facultatif, rien n'en est gardé. C'est lui qui fait retenir : se souvenir avant de relire.

**Ce qui meuble les fins de manche « vides ».** Le rappel, « Les prochains mots » (les trois suivants, dans une phrase), et trois phrases qui nomment ses signes déjà dessinés (manches 5, 10, 13).

**Sa fiche.** « Ce qu'elle a trouvé » : chaque mot rouvre sa carte. Le reste inchangé.

**Allure.** Mêmes couleurs et polices, plus d'échelle : mot à 3 rem, serif pour les mots du livre, sans pour les nôtres, phrase d'IA sur fond violet clair, tuiles qui s'enfoncent au toucher (`scale(0.96)`, 120 ms), carte qui entre en 240 ms. Rien ne bouge sans geste ; rien en mouvement réduit.

## Ce qui ne change pas

- Le dessin, la feuille, les couleurs et les temps de la mascotte (son empreinte et sa planche datée tiennent).
- Ce que le jeu écrit sur le téléphone : aucun champ nouveau, aucune requête pendant une manche, aucune chaîne `privacy.*` touchée (les trois empreintes datées tiennent).
- Les 48 mots, leur ordre, leur validation ; aucun mot des dix-huit sections sensibles.
- Le partage (l'adresse nue), le gel L49, « Site non officiel. » dans chaque cadre.
- Les huit chaînes inscrites dans la planche (`game.title`, `game.kicker`, `game.question.part`, `game.dont_know`, `game.round.done`, `game.round.again`, `independence.unofficial`, `nav.toc`).

## Choix d'architecture

| Choix | Pourquoi | Ce qu'on paie |
|---|---|---|
| Un seul chemin de code, pas deux générations côte à côte | La refonte de la tortue avait coûté environ 6 400 lignes ajoutées puis 9 800 retirées | Une correction urgente de la production se construit depuis une copie de travail à l'étiquette de production |
| Garde-fou sur l'apex seulement | `npm run deploy` refuse l'app tant que ton « oui » n'est pas daté ; l'aperçu, la page d'attente et le Worker des phrases restent libres | Une règle de plus dans `deployRefusal` |
| Phrases dans le fichier du jeu, sous un prédicat de données | Rien ne part du téléphone ; mode « off » = carte d'aujourd'hui, sans nommer d'IA | Retrait par build et déploiement ; les navigateurs gardent l'ancien fichier en cache |
| Un seul fichier de script, plafond relevé | Découper n'économise rien : tout devrait se charger à la prise en main, pour que « une manche n'envoie rien » reste vrai | Environ 3 Ko de plus au premier écran |

## À regarder dans le code, pour apprendre

- `src/styles/game.css` : une machine à états en CSS seul (`:target ~`), qui fait jouer la première manche sans script.
- `scripts/build-mode.ts` (`deployRefusal`) : une règle de déploiement écrite en fonction pure, donc testée sans rien déployer.
- `buildGame` : l'étalement conditionnel qui garde une empreinte de contenu stable quand une donnée facultative manque.
- `src/lib/game-recall.ts` (à écrire) : un calendrier de rappels espacés tiré de la seule liste des mots vus, sans rien garder des réponses.

## Lots

Chaque lot finit par ses portes, un commit conventionnel et un push sur `origin main`. Node 24 (`nvm use 24`).

**Lot 0 — Consigner, épingler la production.**
- `docs/discovery/decisions.md` : D19.1 à D19.6 et les amendements ci-dessus. Nouveau `docs/discovery/PLAN-JEU-DABORD.md` (ce plan, avec son journal). `CLAUDE.md` : état et compte des décisions.
- Vérifier que la build de `38b8ae6` égale ce qui est en ligne, puis l'étiqueter en local.
- Deux essais jetables : précharger `GowunBatang-Bold` sur l'accueil ; décalage de mise en page quand le script prend le jeu au premier écran.

**Lot 1 — Garde-fou de déploiement.**
- `data/launch.json` : `home: { opens_on, decided_on, decided_by, serving }`.
- `scripts/launch.ts` : `homeBlockers`, sur le modèle de `mascotPrivacyBlockers`, hors de `artefactBlockers`.
- `scripts/build-mode.ts` (`deployRefusal`, `DeployContext`) et `scripts/deploy.ts` : apex + build d'app + pas un essai à blanc → refus, avec son propre message.
- Tests : `scripts/build-mode.test.ts`, `scripts/launch.test.ts`.
- Fiche de runbook : la correction urgente de la production (copie de travail à l'étiquette, hors du dépôt, puis `npm run build && npm run deploy`).

**Lot 2 — Accueil : le jeu d'abord.**
- `src/pages/index.astro` : nouvel ordre, `<section id="chercher">` avec `Search`, un lien vers `/sommaire/` et `Chips`.
- `src/layouts/Base.astro` : lien « Chercher » sur l'accueil seulement (`nav.search` existe) ; sans script l'en-tête garde « Sommaire » ; préchargement de la serif.
- `src/styles/base.css`, `src/styles/game.css` : espacements, `scroll-padding`, hauteur minimale du bloc du jeu.
- `src/scripts/search.ts` : une arrivée par `/#q=…` va jusqu'aux résultats.
- Assertions d'ordre à retourner : `scripts/game-page.test.ts` (:244-246, :401-405), `scripts/e2e.ts` (:205-211, :252-257, :309-314), `scripts/e2e-game.ts` (:2996-2999), `scripts/site.test.ts`.
- Tests neufs : la ligne « de qui est le programme » tient au premier écran, au-dessus du jeu ; la mascotte n'est jamais entière à l'écran en même temps que le champ, de 320 × 568 à 430 × 932.

**Lot 3 — Une question par mot, indice dès le premier mot.**
- `src/lib/game-engine.ts` : `asksAt` ne rend que la question la plus profonde ; `begin`, `advance`, `resume`, `choose` suivent ; `hintFor` pour toute question de partie.
- `src/scripts/game2.ts` (`renderAsk`) : le lieu donné, en titres officiels, au-dessus de la question.
- Tests : `scripts/game-engine.test.ts`, parcours de `scripts/e2e-game.ts`.

**Lot 4 — Les 48 phrases.** Demande d'abord ton accord pour que la session lise `private/` (elle seule, ces 48 mesures).
- `scripts/gists-2026.ts --game` (constructeur pur dans `scripts/gists-core.ts`) : écrit `data/2026/game-gists.json`, n'imprime que des identifiants et des nombres. Refuse si l'empreinte du dépôt n'est pas celle de `ask.json` : le jeu montre les phrases servies, octet pour octet.
- Relecture des 48 par la session contre le texte : chiffres, négations, portée, phrase lue seule sous son mot.
- Nouveau `src/lib/game-gists.ts` : lecture, empreinte, prédicat (mode de l'hôte, règle de campagne).
- `src/lib/game-data.ts` (`buildGame`) : `gist` ajouté par étalement conditionnel, pour qu'une build sans phrase garde l'empreinte d'aujourd'hui. Appelants : `Game2.astro`, `src/pages/data/[name].json.ts`, `scripts/deploy.ts`.
- Portes : nouveau `scripts/game-gists.test.ts` (identifiants = épingles des mots, empreintes = manifeste, une ligne de 300 caractères au plus, aucune racine sensible) ; catégorie propre dans `scripts/leak.test.ts` ; `RUNTIME_AI_KEYS` dans `scripts/check-strings.test.ts` ; `scripts/check-no-ai-mention.test.ts` ; `OWN_VOICE` de `e2e-game.ts` sans `[data-generated-by]` ; `/data/*` en `noindex` (`public/_headers`, `scripts/headers.test.ts`).
- Le fichier reste hors du dépôt jusqu'à ton accord (lot 9).

**Lot 5 — Écran de jeu et carte.**
- `src/components/Game2.astro`, `src/scripts/game2.ts` (`wordPanel`, `renderAsk`, `renderPlace`), `src/styles/game.css`, `src/styles/game2.css`. Fichiers évolués sur place : leurs noms sont ceux que la build publie.
- La phrase se construit par `el()` et `textContent` (`src/scripts/engine.ts`), marquée `data-generated-by="ai"`, jamais `data-programme`.
- La manche sans script garde sa carte, dans le nouvel ordre, sans phrase.
- Retrait des trois règles mortes de la génération 1 (`game.css`).
- **Captures envoyées** (320, 360, 390, 412 px ; clair et sombre) pour que tu voies l'allure avant la suite.

**Lot 6 — Fin de manche, rappel, fiche.**
- Nouveau `src/lib/game-recall.ts` (fonction pure sur la liste des mots vus) et `scripts/game-recall.test.ts`.
- `game2.ts` (`renderEnd`, fiche) : rappel, « Les prochains mots », ouverture de « Garder », cartes rouvertes à la demande.
- Plafond du script dans `scripts/game-page.test.ts` (:367).

**Lot 7 — Textes, pages de faits, dossier.**
- Un document de toutes les chaînes nouvelles, à valider par toi : étiquette de la phrase, nouvelle annonce de profondeur, rappel, « Les prochains mots », ouverture de « Garder », trois signes, description de l'accueil.
- Pages qui diraient faux : Exactitude, Méthode, À propos, Licence (`about.gists_*`, `accuracy.review.sentences`, `legal.license.sentences`, ligne près de `accuracy.game.words`).
- `data/2026/NOTICE.md`, `LICENSE`, `README.md`, `11-conformite.md`, `18-dossier-chat.md`, `14-risques.md` (R50 à R60), `design/perf-budget.md`, `CLAUDE.md`.

**Lot 8 — Vérifications avant l'aperçu.**
- Toutes les portes, build en mode « chat » et en mode « off ».
- Balayage des 48 cartes à cinq tailles : « Mot suivant » visible à 390 × 844, aucune tuile de plus de cinq lignes.
- Relecture hostile des 48 cartes, 16 fins de manche et rappels ; relecture de sécurité.
- Session des sept personas, et lectures à l'aveugle lancées hors du dépôt (R49) : « qui a écrit cette phrase ? », « officiel ? », « enfantin ? », « le jeu t'a dit que tu avais tort ? », « tu continues ? ».
- Résultats dans `13-tests-humains.md` §9 ; `personas_session_on` et `hostile_review_on` redatés dans `data/launch.json`.

**Lot 9 — Aperçu.** Sur ton accord, au moment de le faire : pousser `data/2026/game-gists.json` (empreinte et nombres mesurés montrés), puis `npm run build:preview && npm run deploy:preview -- --bench`. Vérification en ligne dans trois moteurs. Le retrait des phrases y est répété une fois (mode « off », build, déploiement, puis réouverture) et daté.

**Lot 10 — Production.** Sur ton « oui » daté : `home.decided_on` et `decided_by: "editor"`, `npm run build && npm run deploy`, vérification en ligne sur les deux hôtes, journal, `CLAUDE.md`, mémoire.

## Ce qui te revient, au moment de le faire

1. L'accord pour que la session lise `private/` pour ces 48 mesures (lot 4).
2. Les textes nouveaux, dans un seul document (lot 7).
3. L'accord pour pousser le fichier des 48 phrases, puis pour déployer l'aperçu (lot 9).
4. Ton « oui » pour la production (lot 10).

## Hors de ce plan

- Plus de mots : la liste repasserait par ta validation carte par carte (D16.31, D17.11).
- De nouveaux gestes de la mascotte : ils feraient tomber la date de sa planche.
- Une variante avec un seul « bloc » sur le plateau : elle amende la règle 4 et demande une lecture à l'aveugle « même équipe ? ».

## Vérification

```
# base, après git add
npx tsc --noEmit && npx tsx --test scripts/*.test.ts && npx tsx scripts/contrast.ts
# app
npm run build && npm run typecheck && npm run lint && npm run a11y && npm run e2e
# jeu et feuille
npm run build:ask && npm run e2e:ask && npm run e2e:game
npm run build:gists && npm run e2e:sheet
npm run build:scrutin:test
# mascotte : doit rester verte sans rien réécrire
npx tsx --test scripts/mascot2.test.ts scripts/game-state2.test.ts scripts/game-page.test.ts
npm run e2e:mascot2 && npm run e2e:mascot2:motion
# avant tout push
npx tsx --test scripts/leak.test.ts
# mesures
npx tsx scripts/perf-probe.ts
```

À constater en plus :

- **Poids** (les « attendus » sont des estimations, à mesurer) : accueil ≤ 20 Ko gzip (16,9 aujourd'hui, 18 à 19 attendus), script du jeu ≤ 14 Ko (9,4 aujourd'hui, 12 à 13 attendus), données du jeu ≤ 12 Ko (6,9 aujourd'hui, environ 10 attendus), tout le JS ≤ 100 Ko.
- **Mode « off »** : aucune phrase, aucune mention d'IA liée au jeu, carte d'aujourd'hui.
- **Build « scrutin »** : ni mot, ni phrase, ni fichier du jeu.
- **Une manche** : aucune requête ; le stockage est la même chaîne quel que soit le choix.
- **En ligne après l'aperçu** : fichiers identiques à la build, porte du jeu dans trois moteurs sur `beta.cestecritla.fr`.

## Journal d'exécution

### Lot 0, au 18 novembre 2026 (soir) — consigner, épingler la production

- **Les treize décisions sont au journal** : D19.1 à D19.13 dans `decisions.md` (326 décisions,
  D0-D19). Six sont de la main de l'éditeur, avec sa réponse pour chacune ; cinq sont des
  amendements que le plan annonçait et qu'il a approuvés avec lui ; deux sont des défauts du plan.
  `CLAUDE.md` porte le chantier en tête de l'état du projet.
- **La production est épinglée** : la build du commit `38b8ae6` est fichier pour fichier ce que
  servent `cestecritla.fr` et `www` — 1 153 fichiers sur 1 156 identiques sur chaque hôte, les
  trois écarts connus (`404.html` redirigé, `_headers` et `_redirects` non servis comme
  fichiers). VÉRIFIÉ en ligne le 18 novembre 2026. Étiquette locale `prod-avant-jeu-dabord` :
  elle n'est pas poussée (le dépôt n'admet que `main`).
- **Les polices tiennent leur plafond** : 68 628 octets pour les trois fichiers, sous les 75 Ko
  de P8. Le gras de Gowun Batang — celui du mot du jeu — pèse 19 796 octets ; l'accueil ne le
  précharge pas aujourd'hui. Le précharger est décidé au lot 2, sur la mesure.
- **Les deux essais jetables du plan sont repliés dans le lot 2** : mesurer le décalage de mise en
  page quand le script prend le jeu demande que le jeu soit en haut de la page, ce qui est le lot
  2 lui-même. La porte existe déjà (`e2e-game.ts`, décalage tardif sous 0,02).
- **Ce que la préparation du plan a établi, et qui n'était écrit nulle part** :
  - une page qui nomme une IA alors que le mode est « off » échoue à la build
    (`scripts/check-no-ai-mention.test.ts`) : les phrases du jeu ne peuvent donc exister que
    sous le même prédicat que « Demander » (D19.5) ;
  - `scripts/leak.test.ts` refuse toute chaîne de plus de huit mots dans un fichier généré de
    `data/2026/` : le fichier des phrases demande une catégorie à lui, pas une exception ;
  - `/data/*` est servi « immuable » pour un an (`public/_headers`) : une phrase retirée reste
    dans le navigateur de qui l'a déjà chargée, sous l'ancien nom du fichier ;
  - la fin d'une manche n'est pas un état gardé : une page rechargée à cet endroit commence la
    manche suivante ;
  - tous les mouvements de la page sont comptés par les portes du jeu
    (`document.getAnimations()`), pas seulement ceux de la mascotte.
- Aucun fichier de l'app n'est touché : la production et l'aperçu servent ce qu'ils servaient.

### Lot 1, au 18 novembre 2026 (soir) — le garde-fou de déploiement

- **La porte existe** : `data/launch.json` porte `home` (`opens_on`, `decided_on`, `decided_by`,
  `serving`) ; `homeBlockers` (`scripts/launch.ts`) le lit, et `deployRefusal`
  (`scripts/build-mode.ts`) refuse toute build de l'app sur l'apex tant que l'éditeur n'a pas
  daté son « oui ». Elle n'est pas un blocage du lancement : ceux-là retiendraient aussi le
  Worker des phrases et rendraient l'apex à la page d'attente.
- **Ce qu'elle ne retient pas**, tenu par un test : la page d'attente (le retrait), l'aperçu, un
  essai à blanc (la CI empaquette l'apex à chaque push), le Worker des phrases.
- **Une session ne peut pas écrire le « oui » à sa place** : `decided_by: "session"` est refusé
  comme une date absente, et un test exige que la décision de l'éditeur soit dans
  `decisions.md`, à sa date, avant que le fichier puisse dire « editor ».
- **`npx tsx scripts/launch.ts` répond désormais** « nothing is missing — but production waits
  for the editor », avec la ligne de la porte, et sort en 1. La CI ne lance pas ce script.
- **La voie de secours est répétée** (fiche 14 du runbook, `09-architecture.md` §9) : une copie
  de travail à l'étiquette `prod-avant-jeu-dabord`, hors du dépôt, `node_modules` lié ; la build
  y sort 1 156 fichiers, identiques un à un à ceux de `main` ce jour-là (eux-mêmes vérifiés en
  ligne au lot 0) ; `scripts/launch.ts` y répond « nothing is missing » ; le déploiement à blanc
  passe. VÉRIFIÉ jusque-là ; le déploiement réel depuis cette copie est PROBABLE — c'est le même
  script, il n'a pas été joué.
- **Écart au plan** : le plan disait la porte « sur le modèle de `mascotPrivacyBlockers` ». Elle
  est écrite en deux fonctions, `homeBlockersOf` (pure, testée sans fichier) et `homeBlockers`
  (qui lit le fichier).
- Rien de servi n'a changé.

### Lot 2, au 18 novembre 2026 (nuit) — l'accueil : le jeu d'abord

- **L'ordre de la page est celui de D19.1** : l'en-tête, la ligne « de qui est le programme, qui
  fait le site » (première ligne de la page, à 14 px), le jeu, puis une section `#chercher`
  — son titre « Chercher », un lien vers le sommaire, le champ, « Demander au programme », les
  résultats, les quinze puces. Dans une build sans jeu (« scrutin ») et pendant un silence, la
  section vient seule sous la première ligne.
- **L'en-tête de l'accueil mène au champ** : « Chercher » y remplace « Sommaire » — un seul lien,
  deux ne tenaient pas à côté du nom à 320 px. Le script y met le curseur et laisse l'adresse
  nue ; sans script le cadre garde « Sommaire », puisqu'il n'y a alors pas de champ. Le sommaire
  reste à un geste : dans la section et dans le pied de page.
- **Un lien qui porte une question (`/#q=…`) arrive sur sa réponse** : le champ vient en haut de
  la fenêtre, les résultats prennent le focus.
- **D19.9 est tenu par la mise en page et par une porte** : le bloc du jeu est au moins aussi
  haut que la fenêtre sous son cadre (`min-block-size`, `svh` là où le navigateur le connaît) ;
  `e2e-game.ts` vérifie, de 320 × 568 à 430 × 932 et en paysage, pendant qu'on joue et à la fin
  d'une manche, qu'elle et le champ ne tiennent jamais entiers dans le même écran.
- **Le gras de Gowun Batang est préchargé sur l'accueil qui montre le jeu** : le mot est le
  premier texte du premier écran dans cette police.
- **Mesuré** (labo, PROBABLE tant qu'un vrai téléphone ne l'a pas dit) : LCP médian 380 ms pour
  2 500 ; décalage de mise en page 0,0007 pour 0,1 ; quand le script prend le jeu au premier
  écran, 0,0003 pour une première visite comme pour un flamant qui revient — la crainte du plan
  (« essai jetable ») ne se réalise pas. Accueil : 17 054 octets gzip pour 20 480.
- **Portes** : 632 tests ; `e2e` 46 / 43 / 43 ; `a11y` 225 contrôles ; `e2e:ask` 109 / 102 / 102 ;
  `e2e:sheet` 102 / 96 / 96 ; `e2e:game` 254 / 218 / 218 (Chromium, Firefox, WebKit) — tous
  verts. Assertions retournées : l'ordre des blocs (`game-page.test.ts`, `site.test.ts`), la
  ligne du premier écran et le témoin du décalage (`e2e.ts`), la position de la page derrière la
  feuille « Demander », qui se compare désormais à ce qu'elle était à l'ouverture
  (`e2e-ask.ts`).
- **Ce qui n'est pas encore fait de l'accueil** : l'écran du jeu lui-même (lot 5) ; les textes
  (la description de la page dit encore « Retrouver une mesure… », lot 7).
- Rien de servi n'a changé : la production attend derrière la porte du lot 1.

### Lot 3, au 18 novembre 2026 (nuit) — une question par mot, l'indice dès le premier mot

- **Le moteur ne pose plus qu'une question par mot** (D19.4, `src/lib/game-engine.ts`) :
  `askAt(depth)` rend la seule question d'une profondeur — la partie, puis le chapitre, puis la
  section — là où `asksAt` rendait la liste qui s'allongeait. `choose` mène toujours à la carte ;
  `begin`, `advance` et `resume` prennent la profondeur de la manche. Une manche de trois mots
  est trois questions à toute profondeur : un test le compte (c'était trois, six, puis neuf).
- **Ce qui est au-dessus de la question est donné** (`givenFor`) : la phrase « C'est écrit dans
  la partie N. » — la phrase neutre de la carte, puisque rien n'a été choisi — puis les titres
  officiels, entiers : la partie quand on demande le chapitre, la partie et le chapitre quand on
  demande la section. Le lecteur d'écran entend le mot, cette phrase, ces titres, puis la
  question.
- **« Un indice » est offert dès le premier mot** (D19.7) : `hintFor` ne regarde plus la
  profondeur, seulement que la partie soit demandée. Plus profond, la partie est donnée : il n'y
  a plus d'indice, et une porte le tient.
- **La phrase d'annonce change** : `game.depth.chapter` dit « Maintenant, le jeu donne la partie
  et demande le chapitre. » — proposée dans la question que l'éditeur a tranchée, **à valider par
  lui avec les autres textes (lot 7)**. Kit de chaînes en v0.14.0.
- **Ce qui ne change pas** : les seuils de profondeur et d'évolution, l'ordre des mots, ce qui
  s'écrit sur le téléphone (la forme de l'état est la même, octet pour octet), la manche sans
  script (elle est à la première profondeur), le poids du script (9 450 octets gzip).
- **Écart au plan** : aucun.
- **Portes** : 632 tests ; `e2e:game` 256 / 220 / 220 ; `e2e` 46 / 43 / 43 ; `e2e:ask` 109 / 102 /
  102 ; `e2e:sheet` 102 / 96 / 96 ; `a11y` 225 contrôles — tous verts. Le parcours du jeu joue
  désormais l'indice à la première profondeur (souris, clavier, mouvement réduit, deux onglets)
  et vérifie, à la deuxième, la partie donnée, ses chapitres en tuiles, l'absence d'indice.
- Rien de servi n'a changé.

### Lot 4, au 18 novembre 2026 (nuit) — les phrases du jeu : l'outil, le fichier en local, les portes

- **L'éditeur a donné son accord pour la lecture** (D19.14, « Oui, lis-les ») : la session, elle
  seule, lit dans `private/` les phrases du jeu et le texte de leurs mesures. Aucun sous-agent.
- **L'export existe** : `npm run gists -- --game [--check] [--link-only w037,…]`
  (`scripts/gists-2026.ts`, `prepareGameGists` dans `scripts/seed-ask-2026.ts`, constructeur pur
  `gameGistsFrom` dans `scripts/gists-core.ts`). Il prend les phrases **du dépôt**, sans en
  changer un caractère, pour les mesures où les mots du jeu sont épinglés. **Il refuse si ce que
  la machine tient n'est pas, empreinte pour empreinte, ce que `data/2026/ask.json` dit déposé**
  (`gists.sha256`) : le jeu montre les phrases que « Demander » sert. Chaque phrase repasse les
  portes d'un dépôt — épingle, contrôle du jour, aucune suite de mots du livre. Il n'imprime que
  des identifiants et des nombres.
- **Le fichier est écrit en local, et n'est pas dans le dépôt** : `data/2026/game-gists.json`,
  tenu hors de `git status` par `.git/info/exclude` jusqu'à l'accord du lot 9. La porte de
  contenu (`scripts/leak.test.ts`) le lit quand même, quoi que git en dise.
- **Mesuré** (VÉRIFIÉ sur cette machine) : 48 mots, 48 mesures qui ont chacune leur phrase dans
  le dépôt ; 8 330 caractères en tout, 272 pour la plus longue (300 permis), 3 486 octets gzip ;
  46 des 48 phrases écrivent le mot de leur carte, les deux autres disent la mesure avec un mot
  voisin (w025, w037) — le lien montre le mot dans le livre.
- **La session a relu les 48 phrases contre le texte de leur mesure**, manche par manche
  (`private/tmp/game-read.mts`) : chiffres, négations, portée, phrase lue seule sous son mot.
  **Aucune n'est infidèle** : les nombres des mesures y sont, aucune négation n'est retournée,
  la portée que seul le titre de la section donnait est dite dans la phrase. Deux emploient un
  verbe un peu plus net que leur mesure (w002, w014) : laissées telles que déposées — les changer
  serait un nouveau dépôt. C'est la lecture d'une IA : PROBABLE, pas une lecture humaine.
- **Une carte est proposée « à son lien seul »** : w037. Sa phrase est fidèle, mais ce qu'elle
  dit de l'école — sous un jeu que cinq personas sur sept disent enfantin — est la capture
  hostile la plus probable des 48. Le fichier de travail en tient donc 47 (empreinte
  `932a7125…deaf86`, 8 070 caractères, 3 369 octets gzip) et nomme w037 dans `link_only`.
  **C'est à l'éditeur de trancher, au moment du push** : 47 avec cette carte en lien seul, ou
  les 48 (empreinte `8801dffd…79db23`).
- **Le vocabulaire sensible de « Demander » ne refuse rien ici, il fait relire** : lu comme la
  feuille lit une question, il signale quatre phrases sur 48 — w037, et trois faux positifs sans
  personne à côté (w006, w015, w035). Ces listes jugent une question, pas une phrase : une
  exclusion automatique aurait retiré trois phrases sans risque. La porte
  (`scripts/game-gists.test.ts`) exige donc que toute phrase signalée soit nommée comme lue et
  gardée, ou laissée à son lien — et tombe dans les deux sens.
- **Quelle build montre les phrases** (`src/lib/game-gists.ts`, D19.5) : seulement là où le mode
  du site est « chat », tant que la décision de campagne de l'éditeur est écrite, et si le
  fichier est celui qu'il a accepté de publier (`meta.validated`). La règle de campagne est plus
  stricte que celle du Worker avant le 1er janvier — un fichier ne s'arrête pas seul à une date —
  et la même après : un test tient les deux ensemble. **Aujourd'hui `dist/` n'en montre aucune**
  et son fichier du jeu porte le même nom qu'en production (`jeu-642ccb46…`) ; les builds
  d'essai en montrent 47 (10 002 octets gzip pour 12 288).
- **`/data/*` est servi « noindex »** (`public/_headers`, D19.6).
- **Écarts au plan** : (1) le plan disait « aucune racine sensible » comme une porte qui refuse ;
  c'est une porte de relecture, pour la raison ci-dessus. (2) `buildGame` ne lit pas le mode
  lui-même : les pages passent par `src/lib/game-built.ts`, les scripts disent de quelle build
  ils parlent — `src/lib/game-data.ts` est lu par les deux et ne peut pas importer la
  configuration des pages. (3) `--link-only` n'était pas au plan.
- **Portes** : 641 tests (dont la porte de contenu, 313 fichiers changés et 1 152 construits
  lus) ; `e2e:game` 256 / 220 / 220 ; `e2e:ask` 109 / 102 / 102 ; `e2e:sheet` 102 / 96 / 96 ;
  `e2e` 46 / 43 / 43 — tous verts.
- Rien de servi n'a changé, et aucune phrase n'est dans le dépôt.

### Lot 5, au 18 novembre 2026 (nuit) — l'écran de jeu et la carte

- **Les six parties sont un plateau** : deux tuiles par rangée dès 360 px de large, trois sur un
  grand écran, une seule sous 360 px ou quand le texte du lecteur est grand. Chaque titre est
  entier ; son numéro — « Partie 4 – », « Chapitre 2 : » — est en gras, sur sa ligne dans le
  plateau (`titleLead`, `src/lib/game-engine.ts` : les deux moitiés font le titre, au caractère
  près). Aucune couleur de partie sur une tuile (D17.12). Les chapitres et les sections restent
  des listes.
- **Le mot est le sujet du premier écran** : sur sa propre ligne, sous elle et sous ce qui est
  dit de lui ; les mots de huit lettres ou moins — 28 des 48 — un cran plus grands
  (`data-short`). À 390 × 844 tout l'écran de jeu tient sans défiler, les six tuiles comprises.
- **« Un indice » ne déplace plus rien** : sur le plateau, « par ici » se dit à côté du numéro,
  et les trois tuiles qu'elle regarde prennent un fond léger ; aucune ne change de taille,
  aucune n'est écartée. Sa place est gardée dans la manche sans script, pour que rien ne bouge
  quand le script prend le bloc.
- **La carte a ses trois voix, dans cet ordre** : le lieu (partie et chapitre en petit, section
  dans la police du livre), « C'est écrit là » attaché à ce lieu, puis — dans une build qui peut
  la montrer — **la phrase de la mesure, dans un cadre à elle, son étiquette d'abord** (« Phrase
  écrite et vérifiée par une IA », `data-generated-by="ai"`, jamais `data-programme`, jamais la
  police du livre), et « Mot suivant » seul au pied de la carte, du même poids que le lien
  (D19.10). La même carte quel que soit le choix. Après le geste, la carte est amenée à l'écran
  jusqu'à « Mot suivant », le mot toujours au-dessus ; jamais à l'arrivée sur la page.
- **Ce qui bouge** : la tuile cède sous le doigt (`scale(0.96)`, 120 ms) ; la carte entre une
  fois, après le geste qui l'a demandée (240 ms). Rien en mouvement réduit. Une carte retrouvée
  à l'ouverture de la page n'entre pas : rien ne bouge qu'aucun geste n'a demandé.
- **La manche sans script garde sa carte** — le lieu, le lien, « Mot suivant » — dans le nouvel
  ordre et sans phrase (D19.6). L'étiquette de la phrase n'est dans la page que si la build
  montre des phrases : en mode « off », aucune page ne nomme d'IA pour le jeu.
- **Les trois règles mortes de la génération 1 sont parties** de `src/styles/game.css`, comme
  `CLAUDE.md` le prévoyait « au prochain déploiement qui change la page d'accueil ».
- **Mesuré** : accueil 17 392 octets gzip pour 20 480 ; script du jeu 9 714 pour 10 240 ; à
  390 × 844, « Mot suivant » est à l'écran sur la carte du premier mot ; à 320 × 640 la carte
  dépasse de 125 px et se lit en défilant (le mot reste en haut).
- **Écarts au plan** : le plan demandait un numéro décoratif devant chaque tuile ; la relecture
  d'expérience a montré qu'il répétait « Partie 4 » — c'est le numéro du titre lui-même qui est
  en gras. La ligne de fond des tuiles désignées par l'indice n'était pas au plan.
- **Portes** : 643 tests, plus les 4 du rappel écrits pour le lot 6 ; `e2e:game` 258 / 222 /
  222 ; `e2e` 46 / 43 / 43 ; `e2e:ask` 109 / 102 / 102 ; `e2e:sheet` 102 / 96 / 96 ; `a11y` 225
  contrôles — tous verts. Le parcours du jeu vérifie désormais la phrase de la carte : son
  étiquette, son marquage, sa place après le lieu et son lien, et qu'elle n'est jamais habillée
  comme le livre.
- Rien de servi n'a changé.

### Lot 6, au 19 novembre 2026 — la fin de manche, le rappel, sa fiche

- **« Tu te souviens ? »**, sous sa ligne : deux mots à rouvrir (un seul à la première manche) —
  le premier de la manche qui finit, et un mot d'une manche d'avant **dont l'écart grandit**
  (`recallFor`, `src/lib/game-recall.ts` : une manche d'écart à la deuxième manche, six à la
  seizième). La fonction lit l'ordre de la liste, jamais l'ordre des trouvailles : deux onglets
  fusionnés, un téléphone qui garde le jeu, un lien suivi vers un mot donnent les mêmes deux
  mots, à tout le monde. On y pense, on touche le mot : **sa carte s'ouvre dans la liste, juste
  sous lui** — où c'est écrit, dit sans verdict (« C'est écrit dans la partie 4. »), ses trois
  titres officiels, « C'est écrit là », puis la phrase de sa mesure sous son étiquette. Une carte
  à la fois ; touché de nouveau, le mot la referme. Aucune tuile, donc aucun leurre et aucun
  verdict ; rien n'est écrit, rien n'est envoyé, rien n'est dit d'elle et elle ne bouge pas. Le
  mot touché ne se déplace pas, et le focus reste sur lui (`aria-expanded`).
- **Sous « Trois autres mots », les trois mots de la manche suivante** (« Les prochains mots :
  … ») : ce qui vient, jamais ce qui reste. **Sous « Envoyer le lien du jeu »** : « Les mêmes
  mots pour tout le monde. »
- **« Garder ta tortue » ne coupe plus le chemin** (D19.11) : une ligne — « Rien n'est gardé une
  fois cette page fermée. » — et un bouton discret, « Retrouver ta tortue plus tard », qui ouvre
  la carte d'avant, au mot près : ses phrases, leur ordre, comment tout effacer, ses deux gestes
  du même poids. Ouvrir la carte n'écrit rien. Un passage qu'une de ces pressions abrège est dit
  une fois, après la première phrase de la carte ou avec « Elle est gardée sur ce téléphone. ».
- **Ses trois signes sont dits quand ils paraissent** (`signAtRoundEnd`, `src/lib/game-goal.ts`,
  lu des mêmes arcs que son dessin) : « Ses ailes s'entrouvrent. » à la manche 5, « Elle lève
  les yeux. » à la 10, « Une étoile paraît au-dessus d'elle. » à la 13 — trois fins de manche où
  rien d'autre ne lui arrivait. Une attitude, jamais une quantité ; jamais à une manche où elle
  change (sa ligne reste d'une phrase, deux au plus).
- **Sa fiche — « Ce qu'elle a trouvé »** : chaque mot est un bouton qui rouvre sa carte, sous
  lui, dans la fiche qui défile seule. La carte n'est construite qu'à la demande : quarante-huit
  mots font quarante-huit boutons, pas quarante-huit cartes.
- **Après le geste qui finit une manche, la page descend jusqu'à « Trois autres mots »** et aux
  mots qui viennent, là où cela tient à l'écran avec elle ; sinon c'est elle qui reste entière,
  en haut — c'est le moment où elle change. Jamais à l'arrivée sur la page.
- **Un gel qui commence pendant que la page est ouverte** : un mot touché n'ouvre aucune carte,
  le bloc du jeu part (comme tout autre geste du jeu).
- **Mesuré** : script du jeu 10 371 octets gzip pour 14 336 (plafond relevé de 10 à 14 Ko,
  D19.8, `scripts/game-page.test.ts`) ; accueil 17 682 octets pour 20 480 ; données du jeu
  6 850 (build normale, sans phrase) et 10 002 (builds d'essai, 47 phrases) pour 12 288. À la
  fin des manches 1, 2, 5, 10, 13 et 16, « Trois autres mots » est entier à l'écran à
  390 × 844, 390 × 664 et 360 × 640 ; à 320 × 640 il l'est aussi, sauf aux manches 5 et 13 où
  il dépasse de 21 px.
- **Écarts au plan** : (1) « Les prochains mots » est **sous** « Trois autres mots », en
  légende, et non au-dessus : au-dessus, le bouton passait sous le bas de l'écran à 390 × 664
  (jusqu'à 30 px), 360 × 640 (43 px) et 320 × 640 (86 px) — mesuré, puis déplacé. (2) La carte
  rouverte s'ouvre sous son mot et non sous la liste : dans sa fiche, sous quarante-huit mots,
  elle s'ouvrait hors de l'écran. (3) Le contrôle des cibles de 44 px du parcours laisse passer
  un centième de pixel : une cible d'exactement 44 px, mesurée entre deux bords tombés sur une
  fraction, se lisait 43,99999999999994.
- **Ce que le lot laisse** : ses neuf phrases sont des propositions de la session — à valider
  par l'éditeur avec les autres textes (lot 7), et rien n'est servi avant. Dans sa fiche, chaque
  mot trouvé est un arrêt de tabulation de plus (quarante-huit à la fin du jeu) : Échap ferme
  la fiche, les titres permettent de sauter la liste.
- **Portes** : 649 tests (648 passent, 1 sauté depuis toujours), types, lint, contraste ;
  `e2e:game` 293 / 257 / 257 (Chromium, Firefox, WebKit — 35 vérifications de plus qu'au lot 5 :
  l'ordre de la fin de manche, le rappel aux manches 1, 2, 5, 10 et 13, les mots qui viennent,
  ses signes dits comme son dessin les montre, la carte rouverte et ce qu'elle n'écrit pas, sa
  fiche, le clavier, le mouvement réduit, le gel) ; ses évolutions filmées sous Chromium : aucun
  éclair, 33 ms d'intervalle médian à processeur ralenti ; `e2e` 46 / 43 / 43 ; `e2e:ask`
  109 / 102 / 102 ; `e2e:sheet` 102 / 96 / 96 ; `a11y`, la build « scrutin » — tous verts. Les
  deux portes de sa planche (`e2e:mascot2`, `e2e:mascot2:motion`) ont passé après le lot 5 ; le
  lot 6 ne touche à rien de ce qu'elles lisent.
- **Les lots 5 et 6 sont dans un seul commit** : le travail du lot 6 avait commencé dans les
  mêmes fichiers avant que le lot 5 soit enregistré. Les portes du lot 5 avaient passé sur son
  état propre (journal ci-dessus) ; celles du lot 6 ont passé sur l'état enregistré.
- Rien de servi n'a changé.

### Lot 7, au 19 novembre 2026 — les textes, les pages de faits, le dossier

- **Les textes** : `docs/discovery/TEXTES-JEU-DABORD.md` — dix-neuf textes, tous proposés par la
  session : onze dans le jeu (l'étiquette de la phrase, l'annonce de profondeur, le rappel,
  « Les prochains mots », « Les mêmes mots pour tout le monde. », le bouton de « Garder », ses
  trois signes, sa fiche), sept sur les pages de faits, et la description de l'accueil.
  **Aucun n'est validé.** Écart au plan, qui plaçait ici le dialogue avec l'éditeur : il vient
  après les relectures du lot 8, qui peuvent encore faire changer un mot — on ne lui fait pas
  valider deux fois.
- **Les pages de faits disent ce que fait LEUR build**, et rien de plus. `gameFacts()`
  (`src/lib/facts.ts`) compte les phrases dans le jeu que la build publie ; À propos,
  Exactitude, Méthode et Licence ne parlent des phrases du jeu que là où il en montre. Exactitude
  donne leur nombre et celui des cartes à leur lien seul — lus, jamais tapés. Tenu sur quatre
  builds par `scripts/game-page.test.ts` : `dist/` 0 phrase (le fichier n'est pas validé),
  `dist-ask/` et `dist-gists/` 47 phrases et une carte à son lien seul, `dist-scrutin/` aucun
  jeu.
- **La description de l'accueil** dit le jeu là où il l'ouvre (`home.description`) ; les autres
  pages et la build « scrutin » gardent la phrase d'aujourd'hui.
- **Le dossier** : `14-risques.md`, R50 à R60, avec ce qui tient chacun tel que construit
  (R58 écarté avant d'exister ; R51 et R60 ne se ferment pas et sont acceptés par D19.2) ;
  `11-conformite.md` §6.2 octies et la note du 19 novembre au §7 (des phrases d'IA montrées
  sans qu'on les ait demandées) ; la note en tête de `18-dossier-chat.md` ;
  `data/2026/NOTICE.md` (« Les phrases du jeu ») ; `design/perf-budget.md` (D19.8, mesures) ;
  `design/illustration-rules.md` §2.13 ; `README.md` et `docs/discovery/README.md` ;
  `CLAUDE.md`.
- **Sous quels termes le fichier des phrases est publié** : le régime du dossier `data/2026/`,
  sans décision nouvelle — ni la licence MIT du code, ni Creative Commons, aucune licence de
  réutilisation. Écrit dans la notice ; à dire à l'éditeur avec le push (lot 9).
- **Ce que le lot n'a pas touché, exprès** : `LICENSE` — il décrit ce que le dépôt contient, et
  le fichier des phrases n'y est pas ; sa ligne viendra avec lui. La page Confidentialité : rien
  de plus ne part ni ne s'écrit, ses lignes et leurs trois empreintes datées tiennent.
- **Portes** : 653 tests (652 passent, 1 sauté depuis toujours) — quatre de plus : les pages de
  faits de chaque build ; types, lint, contraste ; `a11y` ; `e2e` 46 / 43 / 43 ; `e2e:ask`
  109 / 102 / 102 ; `e2e:sheet` 102 / 96 / 96 ; la build « scrutin ». Le jeu lui-même n'a pas
  bougé depuis le lot 6 (`e2e:game` 293 / 257 / 257).
- Rien de servi n'a changé.

### Lot 8, au 19 novembre 2026 — les vérifications, et le premier écran repris sur son mot

**Le mot de l'éditeur, en cours de lot** — à la lecture du compte rendu des sept personas (six
« bof » sur sept à « ça te donne envie d'essayer ? ») : **« Le premier écran doit donner envie,
sinon on remplace pas. »** Consigné D19.15 (328 décisions). Le lot s'est élargi d'autant : le
premier écran a été repris, relu, construit — et c'est lui qui en juge, sur pièces.

- **Le balayage** (`npm run sweep:game`, `scripts/sweep-game.ts` — Chromium, mouvement réduit,
  cinq tailles, les 48 cartes et les 16 fins de manche à chacune) : aucune tuile de plus de
  cinq lignes ; **à 390 × 844 et 412 × 915, « Mot suivant » entier à l'écran sur 48 cartes sur
  48** (26 px de marge sur la plus serrée) et « Trois autres mots » sur 16 fins de manche sur
  16 ; à 360 × 740, 35 cartes ; à 360 × 640, 7 ; à 320 × 568, 1. L'entrée tient entière à
  l'écran à partir de 360 × 740. Le script sort en échec si l'un des deux critères du plan
  tombe.
- **La session des sept personas, à l'aveugle** (`13-tests-humains.md` §9, HYPOTHÈSE) : aucun
  ne prend le site pour officiel ; les sept nomment une IA comme l'auteur de la phrase ; aucun
  ne lit « tort » ; aucun ne voit de score ni de reste ; **les sept citent de mémoire une
  mesure lue sur une carte**. Et : « un peu enfantin » pour les sept ; envie d'essayer, un
  « oui » ; pour cinq, « le site », c'est la recherche ; **la phrase de la première carte est
  lue à contresens par six sur sept**. Quatre lectures à l'aveugle sans fiche (§9.2) : une IA
  a écrit la phrase, cinq sur cinq ; « même équipe que la campagne ? » — non 4 et ne sait pas
  1 à côté des affiches, non 2 et ne sait pas 3 à côté de l'en-tête de son site ; « pour
  enfants ? » — non, cinq sur cinq.
- **Le premier écran (D19.15)** : onze maquettes, faites en réarrangeant la page d'une build
  dans le navigateur, lues à une image par les sept personas ; puis l'écran retenu construit et
  relu deux fois ; puis une variante de plus (§9.6 : dix-sept lectures). **Aucun écran ne
  passe trois « oui » sur sept, et quatre fiches ne disent « oui » à rien** : l'instrument ne
  mesure pas l'envie, il dit ce qui la retient. L'accueil en ligne : 1 « oui » ; le plateau de
  tuiles : 1 « oui », 1 « non » ; **l'entrée construite : 2 puis 1, et plus aucun « non »** ;
  arriver sur une carte ouverte : 0 — l'étiquette d'IA, d'emblée, refroidit six lecteurs sur
  sept (R62).
- **L'entrée, telle que construite.** Pour un nouveau venu — rien de trouvé, premier mot de la
  liste — **le premier mot est donné** : l'étiquette, le mot géant sous un trait de surligneur
  (la couleur de sa carapace, déjà tenue contre le texte dans chaque thème), « Ce mot est
  écrit dans le programme. Pour dire quoi ? », UN geste — « Voir la mesure », qui est celui de
  « Je ne sais pas » sous un autre nom : il ouvre la carte et ne juge rien —, « Chaque carte
  mène à la page officielle. », puis sous un filet « Ce qu'on entend souvent », six thèmes et
  « Chercher dans le programme ». La question commence au deuxième mot. La ligne « Ta tortue
  change quand tu trouves des mots. » vient avec la première carte.
  - Dans toute build, avec ou sans phrases ; **sans script, la même entrée** : le geste est un
    lien vers l'ancre de « Je ne sais pas » (`#m1-0`), et la machine en CSS seul fait le
    reste (`src/styles/game.css`).
  - **Rien ne bouge quand le script prend le bloc** : l'entrée du HTML et celle du script
    tiennent au même endroit, au pixel (tenu dans trois moteurs). Il a fallu pour cela que sa
    boîte à elle ait la même hauteur avant et après qu'elle devient un bouton — elle gagnait
    12 px, ce qui ne se voyait pas tant qu'une ligne de texte plus haute qu'elle la longeait.
    Le décalage mesuré de la page au premier écran passe de 0,0003 à 0,0000.
  - **Les six thèmes sont tenus par la règle des mots du jeu** (D16.26), calculée et non
    listée : aucun ne repose sur une section dont le jeu ne tire pas de mot
    (`doorRefusals`, `src/lib/game-door.ts`). Sur les quinze réponses, la règle en écarte
    trois — « Immigration », « Police et sécurité », « Laïcité » : celles qu'une capture
    retournerait avec une tortue à côté. La build s'arrête sur une liste qui la viole.
  - Le trait de surligneur ne prend aucune place au mot : le plus long de la liste tient
    toujours sur une ligne à 320 px.
  - Un focus déjà posé dans la manche du HTML suit dans celle du script : sur le geste, sur le
    même lien de l'autre porte, ou sur la question.
  - Le script du jeu ne porte aucune expression « look-behind » (Safari d'avant 16.4 refuse la
    syntaxe, et le script avec elle) : les deux phrases de l'accroche sont coupées à la build.
- **La relecture hostile** des 48 cartes, des 16 fins de manche et des textes : **« non, pas
  telles quelles »** (§9.7). Chaque constat vérifié par la session, contre la mesure pour les
  phrases. Vrai et laissé à l'éditeur : la phrase de la première carte (w000), à réécrire et
  redéposer ou à laisser à son lien ; le lien seul pour w005, w026 et w047, que la session
  recommande ; « vérifiée » dans l'étiquette. Corrigé : cinq phrases des pages de faits et de
  la description de l'accueil, la notice. Retiré avant d'avoir été montré : les trois phrases
  de ses signes, « Les mêmes mots pour tout le monde. », le compte des cartes sans phrase.
- **La revue de sécurité et de vie privée** : aucun constat bloquant, deux sérieux, neuf
  mineurs — tous traités (§9.7). Ce qui en reste dans le code : le sceau du fichier des
  phrases couvre aussi ce qu'il dit d'elles ; les deux tests qui tiennent le mot de l'éditeur
  exigent une ligne de `decisions.md` à sa date, avec le début de l'empreinte ;
  `npm run deploy` refuse une build qui montre des phrases dont le fichier n'est pas celui du
  dépôt, et dit sinon pourquoi les cartes n'en montrent pas ; une ancre de la manche du HTML
  remplace l'entrée d'historique qu'elle quitte dès que le script tourne ; le fichier du jeu
  dit lui-même qui a écrit ses phrases ; « Un indice » se tait pendant un silence électoral.
  **Et une porte nouvelle : tant que l'éditeur n'a pas accordé le fichier des phrases, aucun
  fichier suivi ne porte douze mots de suite de l'une d'elles** — les images et les copies des
  personas, qui en portent, sont sous `private/personas/` et n'entreront au dépôt qu'avec lui.
- **Ce que le lot n'a pas fait, et pourquoi.** Une ligne portant son mot sur chaque carte
  (pour qu'une carte recadrée se lise seule) : 26 px de marge à 390 × 844 n'y suffisent pas.
  « Mot suivant » reste pleine largeur à côté d'un « C'est écrit là » en pastille : c'est le
  dessin du plan approuvé.
- **Textes** : dix-sept propositions de la session, au lieu de dix-neuf
  (`TEXTES-JEU-DABORD.md`) — trois de plus pour l'entrée, cinq retirées, cinq corrigées.
- **Portes** : 654 tests (653 passent, 1 sauté depuis toujours) — la liste des thèmes de
  l'entrée, la porte des douze mots ; types, lint, contraste ; `a11y` 225 contrôles ; `e2e`
  46 / 43 / 43 ; `e2e:ask` 109 / 102 / 102 ; `e2e:sheet` 102 / 96 / 96 ; `e2e:mascot2`
  47 / 47 / 47 ; `e2e:game` 305 sous Chromium avec les mesures de laboratoire (286 sans),
  270 sous Firefox, 270 sous WebKit — Firefox a trouvé qu'à 360 px un mot touchait le flamant
  d'un pixel, la boîte de la mascotte ayant perdu 4 px de marge : rendus ; le balayage. **Non
  rejoués sur cet écran** : le mode « off » et la sonde de performance — ils le seront sur
  le premier écran qui restera.
- Rien de servi n'a changé. `personas_session_on` et `hostile_review_on` sont redatés du
  19 novembre dans `data/launch.json`, comme le plan le prévoyait.

**Son second mot, à la fin du lot** — quand la session annonçait cette entrée : **« Le premier
écran doit donner bien plus envie que le premier écran actuellement en ligne. C'est non
négociable. »** Consigné D19.16 (329 décisions). **L'entrée de ce lot ne tient pas cette
barre**, et la mesure qui le dit a dû être changée : à « ça te donne envie d'essayer ? »,
posée écran par écran, quatre lecteurs sur sept ne disent « oui » à rien, et deux versions ne
se séparent pas. Le **face-à-face** — les deux images côte à côte, « laquelle donne le plus
envie, et de combien ? », treize lecteurs (les sept personas et six lecteurs sans fiche),
l'ordre inversé pour la moitié — sépare, lui :

| Face à l'accueil en ligne | la préfèrent | préfèrent l'accueil en ligne |
|---|---|---|
| l'entrée de ce lot (un mot, « Voir la mesure ») | 6 | **7** |
| la même, sa seconde porte dite pour ce qu'elle est (« Tu cherches une mesure ? », un champ) | 8 | 5 |
| **trois mots à toucher** (« wagon », « cantine », « mairies »), puis « Tu cherches autre chose ? », un champ et six thèmes | **11** (dont 7 « nettement ») | 2 |
| la même avec « carburant », « cantine », « électricité » | **12** (dont 9 « nettement ») | 1 |
| la même, la seconde porte commençant par « Ce qu'on entend souvent » | 10 | 3 |

Deux camps, constants : ceux qui veulent comprendre tout de suite à quoi sert le site et
partir de leur sujet — un mot seul et une tortue leur font « une devinette dont je ne vois pas
l'intérêt » ; ceux qu'un mot concret accroche — un champ vide leur fait « un formulaire ».
**Trois mots du quotidien à toucher servent les deux** : « une vraie liste », « des choses de
ma vie », et « j'ai juste à appuyer ». Le premier écran est donc repris une seconde fois
(lot 8 bis, ci-dessous) ; HYPOTHÈSE (lecteurs simulés) dans tous les cas.

**Ce qui attend l'éditeur, dans cet ordre** — rien n'avance sans lui :

1. **Un premier écran qui tient sa barre (D19.16)** — à construire, à mesurer face à l'accueil
   en ligne, puis à lui montrer.
2. Les textes nouveaux, dont « vérifiée ».
3. Les cartes : la phrase de la première (réécrire et redéposer, ou lien seul) ; le lien seul
   pour w005, w026, w047, en plus de w037.
4. Le premier push du fichier des phrases, puis l'aperçu (lot 9) ; son « oui » daté pour la
   production (lot 10).

### Lot 8 bis, au 19 novembre 2026 — l'entrée aux trois mots, mesurée face à l'accueil en ligne

D19.16 demande que le premier écran donne **bien plus** envie que celui qui est en ligne. Le lot
8 avait construit une entrée à un seul mot ; le face-à-face a montré qu'elle perdait. Ce lot
la remplace.

- **La mesure** (`13-tests-humains.md` §9.8) : les deux images côte à côte, « laquelle donne
  le plus envie, et de combien ? », treize lecteurs — les sept personas et six lecteurs sans
  fiche —, l'accueil en ligne présenté en premier pour sept, en second pour six. Dix
  face-à-face, cent trente lectures. HYPOTHÈSE (lecteurs simulés).
- **Ce qu'elle a montré** : un mot seul, c'est « une devinette dont je ne vois pas l'intérêt »
  pour qui veut savoir à quoi sert le site (6 à 7, perdu) ; un champ vide, « un formulaire »
  pour qui n'a pas de question. **Trois mots du quotidien à toucher** parlent aux deux :
  11 à 2 et 12 à 1 en maquette ; **sur l'écran construit, 9, 9 et 10 lecteurs sur treize avec
  les mots actuels, 11 et 12 avec « carburant », « cantine », « électricité »**. « Oui,
  envie d'essayer » : 7 à 10 lecteurs sur treize, contre 1 à 3 pour l'accueil en ligne.
- **L'entrée, telle que construite.** « Trois mots du programme. Que prévoit-il ? », puis les
  trois mots de la première manche, chacun une rangée qu'on touche : sa carte s'ouvre — donnée,
  sans question, sans verdict (le geste de « Je ne sais pas » sous un autre nom). La manche
  continue avec les deux autres, chacun avec sa question, en tournant à partir du mot touché
  (`roundFrom`, `src/scripts/game2.ts`). Dessous : « Touche un mot pour voir sa mesure. Chaque
  carte mène à la page officielle. », un filet, « Tu cherches autre chose ? », « Chercher dans
  le programme » en bouton, et les six thèmes du lot 8.
- **Sans script, la même manche depuis n'importe lequel des trois mots.** Les ancres disent
  une position dans la manche, plus un rang dans la liste : `#a2` la carte du deuxième mot
  quand c'est lui qu'on a touché, `#b2` sa question quand il vient en deuxième, `#b2-4` la
  carte où mène sa quatrième tuile, `#c2` quand il vient en troisième, `#fin`. La suite d'une
  carte se sait donc sans script : après `a` la question `b` du mot suivant, après `b` la
  question `c`, après `c` la fin. Chaque question est deux fois dans la page (36 tuiles), ce
  qui porte l'accueil à 18,6 Ko gzip pour un plafond de 20 ; la feuille de style de la manche,
  elle, raccourcit : un seul mot étant montré à la fois, une règle n'a plus à le nommer.
- **Ce que la maquette avait et que l'écran construit n'a pas** : une boîte à l'allure de
  champ sous les trois mots. Rien ne se tape à côté de la mascotte (D19.9), et une boîte qui a
  l'air d'un champ sans en être un tromperait : c'est un bouton. Une à deux voix d'écart, dites
  au §9.8.
- **Les mots d'ouverture.** L'écran construit montre les trois premiers de la liste validée —
  « wagon », « cantine », « mairies ». « carburant », « cantine », « électricité » font
  mieux et écartent de l'entrée la carte dont la phrase est à réécrire (w000) ; les mettre en
  tête change l'ordre de la liste, donc l'empreinte sur laquelle l'éditeur l'a validée : **sa
  décision, et sa validation datée**. Rien n'a été réordonné dans le dépôt — la build d'essai
  qui a servi à la mesure a été faite sur une copie, puis la liste remise telle quelle. (Une
  première copie avait déplacé les mots dans le fichier sans changer leur rang : c'est `slot`
  qui ordonne le jeu. La capture montrait les mêmes mots ; vue à l'image, refaite — la lecture
  faite entre-temps compte pour ce qu'elle est, une troisième des mots actuels.)
- **Portes** : 654 tests (653 passent, 1 sauté depuis toujours) ; types, lint, contraste ;
  `a11y` 225 contrôles ; `e2e` 46 / 43 / 43 ; `e2e:ask` 109 / 102 / 102 ; `e2e:sheet`
  102 / 96 / 96 ; `e2e:mascot2` 47 / 47 / 47 ; **`e2e:game` 319 / 283 / 283** — la manche sans
  script jouée de bout en bout depuis chacun des trois mots, l'entrée du script au pixel de
  celle du HTML, n'importe lequel des trois mots touché d'abord, le clavier, le chemin vers la
  recherche (le champ prend le focus, la mascotte n'est plus entière à l'écran, rien dans
  l'adresse), le focus qui suit ; le balayage (les deux critères tiennent ; l'entrée entière à
  l'écran à 390 × 844 et 412 × 915, sa dernière ligne 2 px sous l'écran à 360 × 740).
  **« Demander » coupé** (mode « off », construit puis remis) : la build passe ; 652 tests
  sur 654 et un sauté — le seul qui tombe est la ligne qui épingle le mode enregistré ; `e2e`
  50 / 47 / 47 ; 48 cartes, aucune phrase, aucune ligne de provenance, et l'accueil ne nomme
  aucune IA. **Performance, dans le labo du budget** : LCP médian 388 ms pour 2 500 ; CLS
  0,0011 pour 0,1 ; interactions de 16 à 40 ms pour 200 (« un mot de l'entrée, sa carte » :
  32 ms). Poids : script du jeu 10 746 octets gzip pour 14 Ko, accueil 18 622 pour 20 Ko.
- Rien de servi n'a changé.

**Ce qui attend l'éditeur, dans cet ordre** :

1. **Cet écran tient-il sa barre ?** (D19.15, D19.16) — sur les images, face à l'accueil en
   ligne.
2. **Quels trois mots ouvrent le jeu** : les trois premiers de la liste, ou « carburant »,
   « cantine », « électricité » (sa validation datée de la liste dans ce nouvel ordre).
3. Les dix-huit textes, dont « vérifiée » ; les cartes (w000 à réécrire et redéposer ou à
   laisser à son lien ; lien seul recommandé pour w005, w026, w047, en plus de w037).
4. Le premier push du fichier des phrases, l'aperçu (lot 9), puis son « oui » daté pour la
   production (lot 10).

### Ses deux réponses du 19 novembre 2026 — l'écran tient la barre ; « carburant », « cantine », « électricité »

Les deux planches envoyées (l'accueil en ligne à côté du nouvel écran, avec deux jeux de mots ;
ce qui suit quand on touche un mot), deux questions posées, deux réponses de lui :

- **D19.17 — « Oui, il tient la barre »** : le premier écran aux trois mots donne, pour lui,
  bien plus envie que l'accueil en ligne. La condition de D19.15 et D19.16 est levée pour le
  premier écran ; **le « oui » de la production reste à part** (`data/launch.json`, `home` :
  toujours vide, `npm run deploy` refuse toujours l'app sur l'apex).
- **D19.18 — le jeu ouvre sur « carburant », « cantine », « électricité »**, et sa réponse
  vaut validation de la liste dans ce nouvel ordre, datée du 19 novembre.

Appliqué le jour même :

- **Les rangs** (`slot`, `data/2026/game-words.json`) : « carburant », « cantine »,
  « électricité », puis « wagon », « mairies », « îles », « braille », et tous les autres
  dans leur rang relatif d'avant. **« îles » devant « braille » est un choix de la session**,
  dit à l'éditeur : avec les trois nouveaux mots d'ouverture, la deuxième manche ne couvrait
  plus les six parties du livre, et le flamant serait venu une manche plus tard ; ainsi rien
  d'autre ne bouge — elle change aux manches 1, 2, 7 et 16, la question passe au chapitre et
  à la section aux mêmes manches, ses signes paraissent aux mêmes manches.
- **La liste** : vérifiée de nouveau sur le texte, attestée et datée (`scripts/words-2026.ts
  --validated`, empreinte `8fc8898fd770…`). Les liens des mots (`word-links.json`) tiennent :
  leur empreinte ne lit pas les rangs.
- **Les phrases du jeu**, en local : régénérées dans le nouvel ordre (47 phrases, w037 à son
  lien seul ; nouveau sceau). Toujours hors du dépôt.
- **Portes, sur le jeu qui ouvre sur les nouveaux mots** : 654 tests (653 passent, 1 sauté) ;
  `e2e:game` 319 / 283 / 283, avec les mesures de laboratoire ; `e2e` 46 / 43 / 43 ; `e2e:ask`
  109 / 102 / 102 ; `e2e:sheet` 102 / 96 / 96 ; `a11y` 225 contrôles ; `e2e:mascot2`
  47 / 47 / 47 ; le balayage.
- Rien de servi n'a changé.

**Puis trois réponses de plus, le même jour, à trois questions posées avec le document des
textes** :

- **D19.19 — « Je valide les dix-huit »** : les textes nouveaux sont validés tels qu'écrits,
  l'étiquette « Phrase écrite et vérifiée par une IA » comprise.
- **D19.20 — « wagon » : « Carte sans phrase pour l'instant »**. Rien ne change en
  production ; la réécriture de la phrase et son redépôt lui seront proposés à part.
- **D19.21 — « îles », « archipel », « collège », « assainissement » gardent leur lien seul.**

Appliqué : le fichier des phrases du jeu, en local, tient **quarante-trois phrases et cinq
cartes à leur lien seul** (`--link-only w000,w005,w026,w037,w047` ; quarante-deux écrivent le
mot de leur carte). Données du jeu d'une build d'essai : 9 749 octets gzip pour 12 Ko.
Rejoué avec ces quarante-trois phrases : 654 tests, `e2e:game` 299 / 283 / 283 sans les mesures
de laboratoire, le balayage. **Une porte de plus, locale** (`scripts/leak.test.ts`) : aucune de
nos 1 069 phrases autre que celles que le fichier du jeu publie n'est dans un fichier suivi ni
dans `dist/` (655 tests avec elle) — les cinq phrases écartées ne sortiront pas par une autre porte ; les images et
copies des personas, qui montrent celle de « wagon », restent sous `private/`.

**Ce qui attend encore l'éditeur** : le premier push du fichier des phrases et l'aperçu
(lot 9), puis son « oui » daté pour la production (lot 10) ; à part, la phrase de « wagon ».
