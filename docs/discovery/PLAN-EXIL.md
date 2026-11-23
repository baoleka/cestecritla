# Plan — une seizième réponse : « exil fiscal »

## Contexte
Le 23 novembre 2026, l'éditeur demande une réponse à l'objection de l'exil fiscal, en réaction à la taxe Zucman. Il veut qu'elle s'appuie sur des études et qu'elle disqualifie l'argument (« c'est un site militant »).

Les quinze réponses actuelles (`data/2026/riposte.json`) ne disent que ce que le programme écrit, sous « Ce que dit le texte : ». Leurs chiffres sont vérifiés contre le livre. Des études forment donc une **voix nouvelle**, qui demande un champ, un bloc, une garde et des textes de plus.

L'exploration a aussi trouvé deux défauts de « Demander » sur ce sujet précis. Les questions qui contiennent « taxe Zucman » sont refusées à tort. « exil fiscal » trouve d'abord une mesure sur les migrations.

## Ses décisions du 23/11/2026 (à consigner D21.1 à D21.8, statut « DÉCISION (utilisateur) »)
1. **Les études vont dans un bloc à part**, « Ce que disent les études : », placé sous les mesures citées. « Ce que dit le texte » reste le programme seul.
2. **Le texte frappe l'argument, pas les gens.** Les mots durs visent l'argument, chiffres à l'appui. Aucun adversaire n'est nommé et aucune intention n'est prêtée. Une source nomme son auteur pour l'attribution, jamais pour le viser.
3. **La session lit trois mesures dans `private/`** : p2c2-s02-m02, m03 et m09. Elles ont été lues le 23/11, et leurs empreintes correspondent au manifeste. La page cite m03 en entier, ce qui en fait la 34ᵉ citation sur 40.
4. **La réponse va avec les quinze** : sa page `/r/exil-fiscal/`, la liste `/r/`, la puce « Exil fiscal » sous le champ de recherche (comme les quinze, un écran sous le jeu) et « Demander ». Le **premier écran ne bouge pas** : les six thèmes de `DOOR_THEMES` restent inchangés.
5. **L'objection** : « Avec la taxe Zucman, les riches vont tous partir ».
6. **Le bloc est complet** : trois chiffres, puis la phrase des auteurs du CAE.
7. **Le refus à tort de « taxe Zucman » est corrigé, de façon étroite.**
8. **« exil fiscal » trouve l'exit tax et l'évasion fiscale**, grâce à une règle étroite.

L'approbation de ce plan vaut aussi son accord pour deux gestes, qui seront consignés en D21.9 :
- **juger « trompe » et « doute » comme mots ordinaires** dans `data/2026/vocabulary.json`. Ce sont les deux seuls mots nouveaux, et ils viennent de la citation du CAE. Les entrées, le sceau et l'attestation des mots ne bougent pas ;
- **un chargement de la page officielle du chapitre** (melenchon2027.fr) par le vérificateur, comme en D20.7.

## Le texte proposé (à vérifier, puis à valider mot pour mot par l'éditeur)
- `rip-16`, slug `exil-fiscal`, thème « Exil fiscal ».
- **Objection** : « Avec la taxe Zucman, les riches vont tous partir ».
- **Ce que dit le texte** : « Le programme crée la taxe Zucman : un impôt minimum de 2 % sur le patrimoine des centimillionnaires. Contre l'évasion fiscale, il rétablit une exit tax renforcée. Il instaure aussi un impôt universel, sur les entreprises comme sur les revenus des particuliers. »
  - Appuis : m03 (cité en entier), m09, m02.
  - La mesure m09 ne dit pas « selon la nationalité » : la réponse ne le dit donc pas.
  - La réponse ne reprend jamais 9 mots du livre d'affilée : c'est pourquoi elle écrit « impôt minimum » et non « garantie d'impôt ».
- **Ce que disent les études** :
  - Phrase d'ouverture : « La menace d'un départ massif ne tient pas : l'exil existe, mais il est faible. »
  - « Chaque année, 0,2 % du 1 % le plus riche en revenus du capital quitte la France : deux fois moins que l'ensemble des Français (0,38 %). » Source : Conseil d'analyse économique, Focus n° 118, juillet 2025, p. 3.
  - « Si l'impôt de ce 1 % augmente de 4 milliards d'euros, les départs provoqués réduisent de 0,05 % la valeur ajoutée du pays. » Source : « Même étude », avec la page que le vérificateur aura fixée.
  - « De l'ordre de 50 à 60 % des ménages aisés qui quittent la France y reviennent après cinq à six ans. » Source : Camille Landais, devant la commission d'enquête de l'Assemblée nationale, 8 avril 2026.
  - Phrase de clôture : « Pour les auteurs de l'étude, le débat sur l'exil « se trompe donc sans doute de cible ». L'enjeu, d'après eux, ce sont d'abord les stratégies pour échapper à l'impôt. »
- **Ce qu'il vaut mieux ne pas dire** : « Ne pas dire « personne ne part » : l'exil existe, il est faible. Ne pas dire que ces études mesurent les centimillionnaires : leurs auteurs jugent difficile d'étendre leurs résultats aux très hauts patrimoines. Ne pas avancer de recette : le texte n'en chiffre pas. »
- Le vocabulaire a été contrôlé contre `vocabulary.json`, sur les vraies racines de `terms()`. Tout le texte est jugé, sauf « trompe » et « doute » (voir D21.9). Les mots difficiles sont tous expliqués : taxe Zucman, centimillionnaire, exit tax, évasion fiscale, impôt universel, ISF, valeur ajoutée, revenus du capital.

## Sources, vérifiées par la session le 23/11/2026 sur les documents d'origine
- **CAE, Focus n° 118** (juillet 2025 ; Bach, Bozio, Grimprel, Guillouzouic, Landais, Malgouyres), `https://cae-eco.fr/static/pdf/Focus_118_emigration_fiscale_250725_v2.pdf` :
  - p. 3 : « seulement 0,2 % du top 1 % français s'expatrie chaque année, soit deux fois moins que lorsqu'on considère l'ensemble de la population française (0,38 %) » ;
  - p. 16 : « Le débat public, en se focalisant sur l'exil fiscal, se trompe donc sans doute de cible » ;
  - p. 17 : « difficile d'extrapoler » aux très hauts patrimoines.
- **Communiqué du CAE du 25/07/2025**, sur la hausse de 4 Md€ pour le top 1 % : « -0,03% du chiffre d'affaire et de la masse salariale […] et de -0,05% de la valeur ajoutée ». Il précise aussi que le Focus « n'engage ni le Conseil […] ni […] le Premier ministre ». Le texte n'écrira donc jamais « le gouvernement le reconnaît ».
- **Assemblée nationale, compte rendu n° 11**, commission d'enquête sur l'imposition des plus hauts patrimoines, 8 avril 2026 (`…/dyn/opendata/CRCANR5L17S2026PO878968N011.html`). Camille Landais y dit : « Les taux de retour associés sont de l'ordre de 50 à 60 % après cinq à six ans, tant en France qu'en Scandinavie ». Il l'assortit d'une prudence : « faute de données ».
- **Écarté** : les « 54 centimes » (des données scandinaves, sur une marge plus large que l'optimisation) et Rexecode (le choix « frapper l'argument » exclut de contrer les chiffres d'en face).

## Ce qui change dans le code
**Le bloc des études** (nouveau, réutilisable)
- `src/lib/editorial.ts` : types `Study { text, source: { by, title, on, url, where? } }` et `Studies { lead, items, close }`. Le champ `Riposte.studies?` est optionnel.
- `src/components/Studies.astro` (nouveau) : titre h2, phrase d'ouverture, liste des chiffres, puis la source en lien `rel="noopener noreferrer"`. Le lien dit « Même étude » quand la source se répète. Les nœuds sont construits par Astro, sans HTML en chaîne.
- `src/pages/r/[slug].astro` : le bloc se place entre `<Supports>` et « Ce qu'il vaut mieux ne pas dire ».
- `src/components/Authorship.astro` : une ligne de plus quand l'entrée porte des études.
- Le style va dans `src/styles/base.css`, avec les jetons existants. Aucune couleur n'est ajoutée.
- `design/strings.json` (version et note) :
  - `riposte.studies_label` « Ce que disent les études : » ;
  - `riposte.studies_same` « Même étude » ;
  - `concept.authorship.studies` « Chiffres des études vérifiés contre leurs documents, liés sous chacun. » ;
  - `accuracy.studies` « Une réponse cite aussi des études. Leurs chiffres sont vérifiés contre les documents publiés, liés sous chacun. », sur `/exactitude` ;
  - `about.ai_reviewed` : « Quinze » devient « Seize ».
- `eval/riposte-sources.json` (nouveau) : pour chaque chiffre, l'extrait verbatim du document, sa page, `consulted_on` et le verdict du vérificateur.
- Gardes de `scripts/editorial.test.ts` :
  - les textes des études suivent les règles de voix (25 mots par phrase, espaces insécables, aucun « IA ») ;
  - **chaque chiffre et chaque nombre en lettres d'une étude figure dans son extrait** (test en CI) ;
  - les URL sont en https et les dates en ISO ;
  - les études ne passent jamais par le contrôle « contre le livre », qui reste réservé à `answer` et `avoid`.
- Mots expliqués :
  - `scripts/lexicon-core.ts` (`publicTexts`, sous `r:<slug>`) et `src/lib/words-data.ts` lisent l'ouverture, les chiffres et la clôture, pour que leurs mots soient expliqués sous la page ;
  - les sources ne sont pas lues : ce sont des citations d'auteur, pas notre prose.
- `design/voice.md` §0 gagne une quatrième voix, « Les études » : un chiffre public, dans nos mots, avec son auteur, sa date et son lien, jamais sous « Ce que dit le texte ».

**Le contenu**
- `data/2026/riposte.json` : entrée `rip-16` et `meta.note_fr` mis à jour.
- `npx tsx scripts/publish-2026.ts` (session seule, en local) récrit `data/2026/quotes.json` et `manifest.json` (`meta.exposure`).
- `eval/ask-2026.json` : `o16`, une variante `v17` et les comptes (16, 17, 172).
- `data/2026/vocabulary.json` : « trompe » et « doute » ajoutés aux jugements de la session sous `private/lexicon/`, confirmés par un second juge, puis `npm run lexicon -- --vocabulary`.

**Les comptes figés à « quinze »**
- `scripts/check-build.test.ts:436` et `scripts/e2e.ts:183` lisent désormais le nombre dans le fichier.
- Le message de `scripts/ask-set.ts` et l'expression de `scripts/ask-set.test.ts:53` ne comptent plus : les deux changent ensemble.
- Les commentaires qui disent « fifteen » sont mis à jour.

**Les deux corrections de « Demander »**
- **Zucman** : dans `src/lib/chat-local.ts` (`asksOffTopic`), seules les règles `PERSONAL` lisent la question avec les noms de loi repliés (`LABEL`), comme le fait déjà `namesSomeone`.
  - Elles cesseront de refuser « Taxe Zucman : partir ou payer ? », « La taxe Zucman, la mort de l'économie » et « Avec la taxe Zucman, évasion fiscale garantie ».
  - Elles refuseront toujours « Zucman doit partir », « la taxe Zucman, Zucman doit partir », « Macron doit partir » et « le patrimoine de Zucman ».
  - `CHARGED` et `JUDGED` ne changent pas.
  - Les cas sont écrits dans `scripts/chat-local.test.ts`, dans les deux sens.
- **exil fiscal** :
  - une liste fermée de `data/2026/synonyms.json`, avec une raison écrite, fait chercher l'expression « exil fiscal », « exilés fiscaux » comme « évasion fiscale » (« exit tax » en plus ne laissait que m03 : journal) ;
  - elle est appliquée par une seule fonction de `src/lib/search-core.ts`, que reprennent ses quatre appels : `src/scripts/engine.ts` (`findSections`, `findRanked`), `scripts/ask-page.ts` et `scripts/eval-2026.ts` ;
  - la liste est servie avec les synonymes (`src/pages/data/[name].json.ts`).
  - Résultats attendus, testés :
    - « exil fiscal » trouve m03, m09 et m13, avec leurs phrases, et aucune mesure de p6c3 ;
    - « exil », « les exilés » et « accueillir les exilés » trouvent toujours la mesure sur les migrations ;
    - « évasion fiscale », « taxe Zucman » et « exit tax » ne changent pas ;
    - les résultats de l'évaluation du dossier ne bougent pas.

**Ce qui ne change pas**
- Le premier écran et `DOOR_THEMES` : p2c2-s02 n'est pas une des 18 sections sans mot, donc `game-page.test.ts:195` tient.
- Les trois voix de la feuille : elle montre notre réponse (le programme) et « Lire notre réponse entière » vers `/r/exil-fiscal/`, où sont les études.
- Le Worker des phrases : il ne lit les objections que pour la voie du modèle, fermée. Il n'est pas redéployé.
- `terms.json`, son sceau et son attestation.
- Les budgets restent tenus : environ +150 o gzip sur l'accueil (marge d'environ 1,2 Ko) et sur les données (marge d'environ 2,4 Ko), mesurés par les portes.

## Ordre de travail
0. **Avant de commencer.**
   - Créer l'étiquette locale `prod-avant-exil` sur le commit servi.
   - Consigner D21.1 à D21.9 dans `docs/discovery/decisions.md`.
   - Créer `docs/discovery/PLAN-EXIL.md` : ce plan et son journal, sans aucun texte du livre.
   - Commit `docs(exil): …`.
1. **Les deux corrections de « Demander »**, avec leurs tests.
   - Un relecteur indépendant (Sonnet ou Haiku, sans accès à `private/`) les relit sur des questions hostiles, dans les deux sens. Son verdict va au journal.
   - Commits `fix(chat): …` et `fix(search): …`.
2. **Le bloc des études**, côté code et gardes, puis le contenu de `rip-16`.
   - L'entrée reste « pending » en local : un test refuse de la commiter tant qu'elle n'est pas acceptée.
3. **Vérifier.**
   - Un vérificateur d'un autre modèle relit chaque chiffre et chaque extrait sur le document d'origine, ainsi que la réponse contre la page officielle du chapitre (un chargement).
   - Deux lecteurs hostiles lisent le seul texte de la page, un de chaque bord, lancés hors du dépôt (`claude -p … --setting-sources local`). Statut : HYPOTHÈSE.
   - On corrige ce qu'ils trouvent.
4. **L'éditeur valide.**
   - On lui montre tous les textes nouveaux, mot pour mot, et une capture de `/r/exil-fiscal/` en build locale, à la largeur d'un téléphone.
   - Sur son mot daté : `review` passe à `accepted`, par Baoleka, et une ligne D21.x est écrite. Jamais « reviewed ».
5. **Portes, commit, push.**
   - Les portes passent sous Node 24, après `git add`.
   - Commit `feat(riposte): …`, puis push sur `origin main`.
6. **Aperçu, sur son accord du moment.**
   - `npm run build:preview && npm run deploy:preview -- --bench`.
   - Vérifications en ligne : la page, la puce, l'objection reconnue, les questions « taxe Zucman » acceptées, « exil fiscal » qui trouve m03, m09 et m13, et les fichiers identiques à la build.
7. **Production, sur son « oui » du moment.**
   - `npm run build && npm run deploy`.
   - Mêmes vérifications sur `cestecritla.fr` et `www`.
   - Mise à jour de l'état dans `CLAUDE.md`, ajout de R72 dans `14-risques.md` (une étude lue hors de son périmètre, un chiffre contesté) et d'une ligne dans `data/2026/NOTICE.md`.
   - Commit `docs(exil): …`, puis push.

## Vérification
- **Portes** :
  - `npx tsc --noEmit`, `npx tsx --test scripts/*.test.ts`, `npx tsx scripts/contrast.ts` ;
  - `npm run build`, `npm run typecheck`, `npm run lint`, `npm run a11y`, `npm run e2e` ;
  - `npm run build:ask && npm run e2e:ask && npm run e2e:game`, `npm run build:gists && npm run e2e:sheet`, `npm run build:scrutin:test` ;
  - `scripts/leak.test.ts`, en local, avant le push.
- **Tests visés** : `editorial`, `lexicon`, `ask-reviewed`, `ask-set`, `notions`, `chat-local`, `search-2026`, `check-build`, `site`, `words-page`, `game-page` (budget de l'accueil), `launch` (aucune entrée « pending »).
- **e2e de la feuille** : l'objection exacte, tapée, montre « En clair » et le lien vers `/r/exil-fiscal/`.

## Retour arrière
- C'est sa décision.
- Repartir de l'étiquette `prod-avant-exil`, avec `git worktree add --detach <dossier hors du dépôt> prod-avant-exil`, puis `npm run build && npm run deploy` depuis ce dossier.
- Ou retirer `rip-16`, puis reconstruire et redéployer. Les deux corrections de « Demander » sont indépendantes et peuvent rester.

## Journal

### 23 novembre 2026 — lot 0
- Plan approuvé par l'éditeur le 23/11/2026 ; ses réponses consignées en D21.1 à D21.9 (`decisions.md`).
- Étiquette locale `prod-avant-exil` posée sur `aa20877`, le commit dont la production est construite (`data/launch.json`, `home.serving`).
- La session a lu, seule, les trois mesures de D21.3 ; leurs empreintes sont celles du manifeste. Aucun texte du livre n'est écrit ici.

### 23 novembre 2026 — lots 1 à 4
- **Lot 1, les deux corrections de « Demander ».**
  - *Zucman (D21.7).* `asksOffTopic` (`src/lib/chat-local.ts`) sépare ce qui est dit **d'**une personne (`PERSONAL_OF` : « la fortune de X », « perquisition chez X »…), lu tel que tapé, de ce qui est dit **après** un nom (`PERSONAL_AFTER` : « X doit partir », « X mort »), lu avec le nom de loi replié dans la loi (`LAW_LABEL` : taxe, loi, réforme, décret, circulaire, ordonnance, pacte, le nom juste après). Une première version repliait avec `LABEL` pour toutes les règles de la vie privée : le relecteur indépendant (Sonnet) l'a jugée « pas bonne telle quelle » — « les taxes et le salaire de Macron », « la politique de Macron malade » auraient montré nos phrases. Corrigée comme il le proposait, ses onze cas refusés de nouveau, puis « ok ». Résidu accepté : « la réforme Macron mort », « la loi Macron doit mourir » se lisent comme la loi (la même forme que « La taxe Zucman, la mort de l'économie »).
  - *exil fiscal (D21.8).* `book_words` (`data/2026/synonyms.json`), `inBookWords` et `credited` (`src/lib/search-core.ts`), appliqués par `findSections`, `findRanked`, `scripts/ask-page.ts` et `scripts/eval-2026.ts`. Mesuré : « exil fiscal » trouvait p6c3-s02-m02 (politique migratoire) en premier ; il trouve m13, m03, m09, avec leurs phrases. « exit tax » en plus des mots cherchés ne laissait que m03 : la liste cherche « évasion fiscale » seul. « exil », « l'exil des réfugiés » : rien ne bouge ; l'évaluation du dossier (87 questions) ne régresse pas. Le relecteur : « ok » ; deux remarques mineures gardées (« exil et fiscal » est lu comme « exil fiscal » ; une question qui mêle les deux sens ne montre que l'impôt).
- **Lot 2, le bloc des études et `rip-16`.** Le bloc (`Studies.astro`), sa garde (`scripts/editorial.test.ts` : chaque chiffre dans l'extrait de son document, `eval/riposte-sources.json`), les mots du bloc lus par la porte du vocabulaire et expliqués sous la page, les comptes figés à quinze lus dans le fichier, « trompe » et « doute » jugés ordinaires (D21.9 ; le sceau des mots ne bouge pas), m03 citée en entier (34 citations sur 40, 2,76 % des mots cités, 20,22 % couverts — `scripts/publish-2026.ts`).
- **Lot 3, vérifier.**
  - Deux lecteurs hostiles, lancés hors du dépôt (`claude -p … --setting-sources local`, Sonnet et Haiku ; ni l'un ni l'autre n'a reçu d'information sur le projet hors des fichiers, l'adresse du compte restant jointe d'office au contexte — R49) : aucun chiffre faux ; trois formulations plus fortes que les études (l'ouverture « la menace ne tient pas », le chiffre des 4 milliards lisible comme la taxe Zucman, « ménages aisés ») — corrigées. HYPOTHÈSE (lecteurs simulés).
  - Le vérificateur (Sonnet), sur le Focus, le compte rendu et la page officielle du chapitre (un chargement, supprimé ensuite) : « ok après corrections » — « impôt minimum » n'est pas le mot du programme (« garantie d'impôt ») ; la mesure de l'ISF, citée en appui, absente du paragraphe ; « au bout de 15 à 20 ans » et « de 0 à 0,05 % » (le Focus : « entre 0 et le résultat indiqué ») ; « ménages aisés » n'est pas le mot de Landais, qui dit ses données françaises « très parcellaires » ; « d'abord » inventé dans la clôture ; la limite des auteurs porte sur « une réforme très différente ». Toutes appliquées ; puis « ok », deux fois, sur le texte final.
- **Lot 4, l'éditeur valide** le texte et les textes d'interface, mot pour mot, avec deux captures (D21.10) ; il donne son accord pour pousser et déployer l'aperçu (D21.11).

### 23 novembre 2026 — lots 5 et 6
- **Lot 5, portes et commits.**
  - **Portes**, mode « app », sur l'état final :
    - 702 tests ; types, lint, contraste ;
    - a11y : 252 contrôles, dont `/r/exil-fiscal/` sous ses neuf conditions ;
    - e2e : 46 / 43 / 43 ; e2e-ask : 109 / 102 / 102 ;
    - jeu : 322 / 286 / 286, mesures de laboratoire comprises ;
    - feuille : 104 / 98 / 98, avec un contrôle de plus — l'objection exacte, son « En clair » et le lien vers `/r/exil-fiscal/` ;
    - la porte anti-fuite (17 / 17) ; aucun échec.
  - **Commits** : quatre, signés (`5d229a9`, `dd6a997`, `44c2540`, `6a09927`). Les deux corrections tiennent seules : chacune a passé les types et les tests dans une copie de travail à part.
  - **Le push sur `origin main`** a buté sur la clé SSH, absente de l'agent de cette session : il attend que l'éditeur la charge.
- **Lot 6, l'aperçu.** `npm run build:preview && npm run deploy:preview -- --bench`, Worker `cestecritla-preview`, version `a85c7984`. Vérifié en ligne :
  - **1 312 fichiers sur 1 315 identiques à la build**, les trois écarts connus ;
  - dans les trois moteurs : la page et ses trois sources liées, la ligne du pied de page, la puce, l'objection reconnue avec son « En clair » ; « Taxe Zucman : partir ou payer ? » accepté, « Zucman doit partir » refusé ; « exil fiscal » qui montre les trois mesures de l'impôt avec leurs phrases ;
  - la sonde habituelle de la feuille : 257 « ok », aucun échec.

### 23 novembre 2026 — lot 7, la production
- **Le « oui » de l'éditeur** (D21.12) : « Oui, en production ».
- **Déployé.** `npm run build && npm run deploy` : commit `6a09927`, Worker `cestecritla` version `b16fae32`, à 11 h 46 (10 h 46 UTC). L'aperçu (version `a85c7984`) servait la même build depuis 11 h 35.
- **Vérifié en ligne.**
  - **Sur `cestecritla.fr` et `www` : 1 312 fichiers sur 1 315 identiques à la build**, les trois écarts connus (`404.html` redirigé, `_headers` et `_redirects` non servis comme fichiers).
  - Sur `cestecritla.fr`, dans les trois moteurs (Chromium seul sur `www`) : la page et ses trois sources liées, la ligne du pied de page, la puce, l'objection reconnue ; « Taxe Zucman : partir ou payer ? » accepté, « Zucman doit partir » refusé ; « exil fiscal » qui montre les trois mesures de l'impôt avec leurs phrases.
  - La sonde de la feuille : 257 « ok », aucun échec.
- **Écrit.** `data/launch.json` : `home.serving` nomme `6a09927`. L'état du projet est dans `CLAUDE.md`, R72 au registre, une ligne dans `data/2026/NOTICE.md`.
- **Ce qui reste.**
  - **Le push** des cinq commits sur `origin main` : la clé SSH de l'éditeur n'était pas chargée dans cette session.
  - **Le chiffre de 2013**, proposé et non retenu (D21.10) : « En 2013, la hausse de l'impôt sur les revenus du capital a fait partir moins de 350 foyers de plus par an, sur les 385 000 du 1 % le plus riche » (communiqué du CAE du 25/07/2025). C'est la meilleure réponse au point le plus fort du lecteur hostile ; à reproposer à part.
  - **Ce qu'aucune vérification ne couvre** : de vrais lecteurs, de vrais téléphones, la réaction d'un économiste hostile en chair et en os. HYPOTHÈSE.
