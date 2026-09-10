# Anatomies de la carte-concept « règle verte » (T2/T3, 9 septembre 2026)

Trois façons de présenter la même carte de glossaire, plus la paire tu/vous, en HTML/CSS statique (aucun framework, aucun build, aucun script à l'exécution), pour la session de test 1 (personas-agents, D11.1) et le canvas J3. Le style est **neutre** vis-à-vis des directions artistiques : uniquement `design/tokens.json` (D3.1-D3.4), Public Sans + Gowun Batang auto-hébergées (D3.6), fond Crème, mode sombre par `prefers-color-scheme` (D0.23). Aucun logo (D3.3), aucune illustration tierce, aucun emoji, registre tu (D0.25).

Statuts : **VÉRIFIÉ** (mesuré au navigateur le 9/9/2026, script de contrôle décrit en §6) / **DÉCISION** (règle appliquée) / **HYPOTHÈSE** (à trancher).

## 1. Fichiers

| Fichier | Rôle |
|---|---|
| `dense.html` | Anatomie **dense** : tout visible d'un coup, un seul écran défilant, hiérarchie typographique serrée (`zone-compact`). |
| `progressive.html` | Anatomie **progressive** : « En clair » d'abord, puis dévoilement par étapes. Les 3 états sont rendus comme 3 écrans empilés (étape 1 : tout replié ; étape 2 : « Texte du programme » déplié ; étape 3 : tout déplié). |
| `explorable.html` | Anatomie **explorable** (esprit Nicky Case) : la règle manipulée par un curseur « ce qu'on prélève » face à « ce que la nature refait en un an », rendue en 3 états statiques (moins / autant / plus), le verbatim sous le visuel ; puis la suite de l'écran, commune aux trois états. |
| `tu.html` / `vous.html` | Même haut de carte (indice d'arrivée par lien, badge d'auteur, « En clair », un bouton, bloc « Pose ta question » avec la mention IA v2) dans les deux registres. |
| `anatomies.css` | Feuille commune : `@font-face`, tokens en variables CSS (rôles clair et sombre), composants. |
| `fonts/` | Copie de `design/fonts/*.woff2` + licences OFL (les maquettes se chargent en `file://`, sans réseau). |
| `build.mjs` | Régénère les 5 HTML depuis `data/aec-2025.json`, `data/glossary.json`, `data/stat-cards.json` et `design/strings.json` (`node build.mjs` depuis ce dossier). Les HTML sont la livraison et fonctionnent sans lui ; il garantit que chaque texte du programme est injecté au caractère près. |

Captures : `docs/discovery/captures/2026-09-09/maquettes/anatomies/` (10 PNG, 390 × 844 CSS px, `deviceScaleFactor` 2, pleine page, clair et sombre ; `SHA256SUMS`, D0.37).

## 2. Contenu réel injecté (aucun texte inventé sur le programme)

| Zone | Source | Identifiants |
|---|---|---|
| Titre, badge, « En clair », « Pourquoi ça compte », objection, termes voisins | `data/glossary.json`, entrée `regle-verte` (`review_status` = `reviewed-human`, D2.9) | `one_liner`, `why_it_matters`, `objection`, `related_terms` |
| Texte du programme | `data/aec-2025.json` | `c12-s01-k01` (mesure clé, en entier) ; `intro-p22` (paragraphe d'introduction, **extrait** signalé par « […] » avant et après, aucune coupe silencieuse) |
| Mesures liées | `data/aec-2025.json` | `c12-s01-m11` (moratoire, ch. 12 s1), `c14-s02-k01` (règle bleue, ch. 14 s2) |
| Source, lien « Lire la section entière » | section `c12-s01` « La bifurcation écologique pour une société de l'harmonie », `https://melenchon2027.fr/programme2025/livre/chapitre12/s1/` | `chapter.title`, `section.title`, `section.url` |
| À savoir | `data/stat-cards.json` | `c12-s01-a01` (83 %, Harris Interactive, juillet 2021) sous gabarit 77-808 : `statcard.legal.no_sponsor` + `statcard.legal.margin` + `statcard.legal.source_link` ; la date est sur la même ligne que le chiffre (voice.md §5, D0.32) |
| Termes voisins rendus | `data/glossary.json` | 4 slugs présents (planification écologique, bifurcation écologique, écocide, 6e République et Assemblée constituante) ; les 4 slugs pendants (`regle-bleue`, `grands-projets-inutiles`, `obsolescence-programmee`, `hierarchie-des-normes`) ne sont pas rendus (D2.8) |
| Chaînes d'interface | `design/strings.json`, au mot près | `nav.search`, `concept.*`, `measure.*`, `statcard.*`, `common.read_more`, `chat.title`, `chat.intro`, `chat.placeholder`, `chat.send`, `chat.ai_mention.v1` (dense, progressive, explorable) et `.v2` (tu/vous), `home.link.sent_by_hint`, `attribution.short`, `independence.line` |
| Riposte | `data/riposte.json` | **Aucune des 15 entrées ne porte sur la règle verte** (aucun id `c12-s01`) : rien à injecter ; l'objection vient de la carte de glossaire, `desintox_url` = null, donc pas de lien Désintox |

Phrases de la voix de l'app écrites pour l'explorable (toutes ≤ 15 mots, étiquetables `reformule`, appui `c12-s01-k01` / `intro-p22` / `c12-s01-a01`) :

- « Le curseur n'a pas d'unité : il montre le principe, pas des chiffres. » (garde-fou : aucun chiffre inventé)
- « Sous la limite. On prélève moins que ce que la nature refait en un an. La règle verte est respectée. »
- « À la limite. On prélève tout juste ce que la nature refait en un an. « Pas davantage » : la règle verte tient encore. »
- « Au-delà de la limite. On prélève plus que ce que la nature refait en un an. C'est ce que la règle verte interdit. » (« interdire de prélever chaque année plus » est le mot de l'encadré `c12-s01-a01` ; « pas davantage » celui de `c12-s01-k01`)

Le « on » de ces phrases est celui du texte (« on ne prélève pas davantage ») ; le « tu » reste réservé au lecteur (« Bouge le curseur »).

## 3. Ce que chaque anatomie met à l'épreuve

| Anatomie | Pari | Ce que la session 1 doit mesurer |
|---|---|---|
| Dense | Le militant veut tout sous la main (munition en 10 s, D0.19) ; la hiérarchie typographique suffit à s'orienter | Temps jusqu'au « aha » sur la règle verte ; le verbatim est-il repéré comme « le texte officiel » sans lire l'étiquette ? capture « honteuse » ? (D0.32) |
| Progressive | L'indécis arrivé par lien lit « En clair » d'abord (3 min, D0.19) ; le reste se dévoile sur demande | Combien d'étapes avant le verbatim (métrique N, D5.1) ; le bouton « Lire la suite » est-il compris comme « voir le texte » ? |
| Explorable | Un concept manipulable vaut mieux qu'une définition (plan §3.5, Kinnu / Nicky Case) | Le principe « pas davantage » est-il compris en < 20 s ; le curseur sans unité est-il lu comme un principe, pas comme une donnée ? |

Constantes des trois : un seul bloc 3D par écran (le titre), un seul CTA primaire (« Envoyer cette carte » ; « Lire la suite » aux étapes 1-2 de la progressive), le verbatim en Gowun Batang sur Violet 100 à filet Violet, le badge d'auteur sans le mot « IA » (D2.4), la bande de pied attribution + ligne d'indépendance (D0.14, D1.11).

## 4. tu / vous (D0.25)

Chaînes marquées par le registre dans le haut de carte, et leur réécriture (mêmes faits, mêmes appuis) :

| Clé | tu (`strings.json`) | vous (réécrit ici) |
|---|---|---|
| `home.link.sent_by_hint` | Quelqu'un t'a envoyé ce passage. Le texte vient du livre officiel. | Quelqu'un vous a envoyé ce passage. Le texte vient du livre officiel. |
| `one_liner` (carte) | … une limite à ce qu'on prend à la nature … | … une limite à ce que l'on prend à la nature … (« l'on » = marque du registre soutenu ; deux autres phrases inchangées) |
| `chat.title` | Pose ta question | Posez votre question |
| `chat.intro` | … tu obtiens le passage exact du programme. | … vous obtenez le passage exact du programme. |
| `chat.placeholder` | Ta question sur un mot ou une mesure | Votre question sur un mot ou une mesure |
| `chat.ai_mention.v2` | Tu parles à Mistral, une IA française hébergée chez Cloudflare. Elle choisit les passages du programme, elle ne les écrit pas. | Vous parlez à Mistral, une IA française hébergée chez Cloudflare. Elle choisit les passages du programme, elle ne les écrit pas. |

Le bouton unique (« Envoyer cette carte ») et le badge d'auteur sont neutres. VÉRIFIÉ : `tu.html` contient 4 marques « tu/ta » et 0 « vous » ; `vous.html` 5 marques « vous/votre » et 0 « tu ». Les deux tiennent dans un seul écran de 844 px (hauteur de document = 844).

## 5. Choix de rendu (DÉCISION pour les maquettes, à confirmer en T9)

- **Verbatim intact** : caractères du corpus conservés (apostrophe « ’ », guillemets), aucun gras, aucun italique (`italicVerbatim` = 0 VÉRIFIÉ). Seule retouche, **d'espacement uniquement** : espace insécable posée à l'intérieur des « » et avant « : ; ! ? » au rendu (le corpus a des espaces simples), pour éviter les guillemets et deux-points orphelins en fin de ligne à 390 px. La comparaison de fidélité normalise les espaces (§6).
- **Extrait** d'un paragraphe long (`intro-p22`, 170 mots) : sous-chaîne exacte encadrée de « […] », étiquetée « Paragraphe intro-p22 · Source : L'Avenir en commun 2025, Introduction ».
- **Voix de l'app** : apostrophe typographique « ’ » posée au rendu (voice.md §6 laissait la conversion à décider : proposition), *L'Avenir en commun* en italique par CSS, `6e` en exposant par CSS.
- **Badge d'auteur** : « Rédigé par nous, relu par ⟨pseudonyme⟩ » — le pseudonyme du relecteur n'est pas choisi (D0.15, D2.9) ; le slot est rendu en pointillé pour rester visiblement un emplacement.
- **Wordmark** : « AEC Discover » en texte (Public Sans 900 italique, 24 px de haut, Violet), placeholder `{appName}` jusqu'au sprint de nommage T10.
- **Explorable** : deux barres plates (nature = Vif vert `part-color` de la partie 3, prélèvement = Violet / Violet 200 en sombre, dépassement = Rouge / Vif jaune en sombre, une seule couleur d'accent), une limite en pointillé, un curseur de 24 px ; aucun dégradé, aucune ombre floue. Les vives ne portent jamais de texte.
- **`text-rendering: geometricPrecision`** sur `body` : sans cette règle, Chromium/FreeType sous Linux arrondit les avances des sous-ensembles non hintés (D3.6) et laisse des trous « f r », « T T » à 14-16 px (VÉRIFIÉ sur la première passe de captures, corrigé). Sans effet sur téléphone attendu ; règle à garder dans l'app.
- Les liens `preload` de polices (perf-budget §1.4) sont **omis** dans les maquettes : en `file://` ils provoquent une erreur CORS ; à remettre dans l'app servie en HTTP.

## 6. Contrôles au navigateur (VÉRIFIÉ, Chromium headless via Playwright, 9/9/2026)

Script de session : `scratchpad/pw/verify-anat.mjs` (parcourt chaque nœud texte, calcule le contraste WCAG avec le fond effectif hérité, compte les `box-shadow` par `.screen`, mesure les cibles tactiles, compare chaque `.verbatim-text` / `.measure-text` / `.stat-text` au JSON après normalisation des espaces).

| Contrôle | Résultat sur les 5 pages × 2 thèmes |
|---|---|
| Polices chargées (`document.fonts`) | Public Sans variable droite + italique, Gowun Batang 400 + 700 ; aucune requête hors `file://` |
| Largeur de document | 390 px partout (aucun défilement horizontal) |
| Paires texte / fond en clair | Charbon/Crème 15,45 · Charbon/Violet 100 14,13 · Violet/Crème 11,62 · Crème/Violet 11,62 · Charbon/Corail 200 11,59 · Charbon/Violet 200 10,80 · Violet/Violet 100 10,63 · **Crème/Rouge 5,10** (CTA, 15 px gras) — minimum 5,10 ≥ 4,5 : **100 %** |
| Paires texte / fond en sombre | Crème/Charbon 15,45 · Crème/#2C2E2B 13,36 · Crème/#3A2A28 13,29 · Violet 200/Charbon 10,80 · Charbon/Violet 200 10,80 · Charbon/Vif jaune 10,09 · Violet 200/#2C2E2B 9,34 — minimum 9,34 : **100 %** (valide les surfaces v0 `bg-elevated` #2C2E2B et `warn-bg` #3A2A28 de `tokens.json`) |
| Bloc 3D par écran | 1 sur chaque écran à titre (dense 1 ; progressive 1,1,1 ; explorable 1,1,1 et 0 sur la « suite » sans titre ; tu/vous 1) — règle 4 |
| Ombres floues | 0 |
| Cibles tactiles < 24 px | 0 (la pastille « Contexte 2022 » a été portée à 24 px après une première mesure à 21,6 px) |
| Fidélité du verbatim | 4/4 (dense), 6/6 (progressive), 5/5 (explorable) textes identiques au corpus (exact ou extrait) ; encadré 83 % identique à `stat-cards.json` |
| « ! » dans la voix de l'app | 0 (règle 5 autorise 1 au plus) |
| Emoji | 0 |

Le pointillé de la limite et les barres sont des éléments non textuels : Vif vert sur Crème 3,52 et sur Charbon 4,39, Violet sur Crème 11,62, Violet 200 sur Charbon 10,80, Rouge sur Crème 5,10, Vif jaune sur Charbon 10,09 — tous ≥ 3:1 (WCAG 1.4.11).

## 7. Points ouverts et hypothèses

| Point | Statut | Levée |
|---|---|---|
| Quelle anatomie (ou quel mélange : progressive par défaut, dense pour l'arrivée directe ?) | HYPOTHÈSE | Session 1 (personas D11.1) : aha chronométré sur les 3 ; puis test humain avant lancement |
| Mention IA sur la carte : D2.4 dit « jamais le mot IA sur la carte ». Ici la mention vit dans le bloc « Pose ta question » sous la carte (composant chat, art. 50 §5 : avant la première interaction), jamais dans le badge d'auteur. En v1 100 % statique (D0.21) ce bloc n'existe pas : à retirer des maquettes v1 ou à remplacer par la recherche locale | À trancher | T9 (mentions) ; canvas J3 |
| Variante de mention IA retenue (v1 dans les 3 anatomies, v2 dans tu/vous parce qu'elle est la seule conjuguée) | HYPOTHÈSE | Jugement T9 (voice.md §4) |
| Chaînes manquantes dans `strings.json` : `concept.label.context_2022` (« Contexte 2022 »), étiquette « Paragraphe » pour un item `-p`, `concept.source` sans `{section}` pour `intro-p` | À ajouter | Kit v0.2 |
| Pseudonyme du relecteur | À choisir par l'utilisateur (D0.15) | Avant la mise en ligne |
| Apostrophe « ’ » dans la voix de l'app, espaces insécables posées au rendu dans le verbatim | Proposition | Décision typographique T3 partie 2 |
| Explorable : le curseur statique doit devenir un vrai `input type="range"` avec alternative clavier et boutons « moins / autant / plus » (WCAG 2.5.7, budget A1), état mémorisé nulle part | À prototyper | T7 |
| « interdit » dans le verdict 3 de l'explorable : mot de l'encadré (question de sondage), pas de la mesure clé (« ne prélève pas davantage ») | À faire relire (fidélité) | Relecture utilisateur / juge fact |
| Ombre 3D en sombre (`6px 6px 0 Violet` sur Charbon, 1,33) est presque invisible : token suivi tel quel | Observation | Canvas J3 (`shadow.block-3d-dark`) |
| `part-color` Vif vert pour la barre « nature » (code couleur de la partie 3, HYPOTHÈSE de `tokens.json`) | HYPOTHÈSE | Canvas J3 |
| Ordre des zones en dense (À savoir après les mesures liées, avant l'objection) | Proposition | Session 1 |

## 8. Reproduire

```sh
cd prototypes/mockups/anatomies && node build.mjs          # régénère les 5 HTML depuis data/ et design/
# captures : Playwright, chromium.launch(), viewport 390×844, deviceScaleFactor 2,
# colorScheme light|dark, goto file://…, await document.fonts.ready, screenshot fullPage
```

Licences : textes du programme CC BY-NC-SA 4.0, attribution « La France insoumise – L'Avenir en commun » ; polices SIL OFL (`fonts/OFL-*.txt`) ; le reste du dossier suit la licence du dépôt.
