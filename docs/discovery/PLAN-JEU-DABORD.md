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
