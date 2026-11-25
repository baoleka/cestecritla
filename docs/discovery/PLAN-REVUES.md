# Plan — dix-neuf revues de code au niveau max : « que tout soit nickel »

## Contexte
Le 23 novembre 2026, au soir, juste après R73, l'éditeur demande : « Explore le repo. Planifie toutes les code review max nécessaires pour s'assurer que tout est nickel. » R73 était un défaut que ni les 704 tests ni la sonde de 257 contrôles n'avaient vu, et qu'une porte du dépôt tenait même : `site.test.ts` exigeait le nom fautif.

**La commande** (VÉRIFIÉ dans l'outil installé, v2.1.330) : `/code-review [niveau] [--fix] [--comment] [<pr#>|<branche>|<chemin>] [--max-findings <n>|all]`.
- Elle prend une seule cible, ici un chemin.
- Au niveau max, de nombreux relecteurs, puis une passe qui tente de réfuter chaque constat.

**Le critère « nécessaire »** : tout ce qui part en ligne, tout ce qui décide de ce qui part en ligne, ce qui touche au texte du livre ou à la base de production, et les portes qui tiennent les non-négociables.

Plan approuvé par l'éditeur le 23/11/2026, avec sa réponse sur l'isolation de `private/` : une worktree (D21.14).

## Les dix-neuf revues
Chaque revue : `/code-review max <cible> --max-findings all`, rapport seulement (ni `--fix`, ni `--comment`).

**Vague 1 — ce que reçoit le visiteur**
1. `src/worker` (le pilote)
2. `src/scripts`
3. `src/lib`
4. `src/components`
5. `src/pages`
6. `src/layouts`

**Vague 2 — ce qui décide de ce qui part en ligne**
7. `astro.config.ts`
8. `public`
9. `scripts/deploy.ts`
10. `scripts/launch.ts`
11. `scripts/build-mode.ts`
12. `scripts/build.ts`
13. `.github/workflows`

**Vague 3 — le texte du livre et la base de production**
14. `scripts/seed-ask-2026.ts`
15. `scripts/gists-2026.ts`

**Vague 4 — les portes des non-négociables**
16. `scripts/leak.test.ts`
17. `scripts/check-build.test.ts`
18. `scripts/chat-worker.test.ts`
19. `scripts/e2e-sheet.ts`

## Ce qui n'est pas revu, et pourquoi
- `prototypes/` : archivé, jamais servi.
- La chaîne 2025 : elle ne sert qu'une archive datée, et ne tourne plus.
- `eval/` et le banc : le banc a conclu (D16.33), aucun modèle ne répond (D16.60).
- Le reste de la chaîne 2026 : lancé par la session sur la machine de l'éditeur seulement. Ses sorties sont scellées ou tenues par des portes.
- Les autres tests : ils tournent à chaque changement.
- `src/styles` : tenu par les portes de contraste, d'accessibilité et le balayage du jeu. `mascot2.css` est scellé.
- `src/holding`, `design/`, `data/` : la page de retrait est construite par la CI ; les textes et données sont validés ou scellés par l'éditeur.

## Isolation de `private/` (D21.14)
- Les revues, les vérifications et les correctifs se font dans une worktree, `.claude/worktrees/revues` (branche `worktree-revues`, tirée de `39daa63`), où `private/` n'existe pas. Aucun relecteur ne peut l'ouvrir, même par erreur.
- La session n'y ouvre rien non plus pendant la campagne.
- La branche n'est jamais poussée.
- À la fin, dans le dépôt principal : `git merge --ff-only`, l'anti-fuite et toutes les portes, le déploiement sur l'accord de l'éditeur, le push.

## Ce qui est fait de chaque constat
1. **Le revérifier** : relire le code, le reproduire. Un constat « PLAUSIBLE » n'est corrigé qu'une fois reproduit.
2. **Le confronter aux décisions** : un comportement voulu est « conforme à Dxx », sans changement.
3. **Le classer** :
   - un défaut de code est corrigé, avec un test quand c'est testable, un commit par correctif, et les portes de `CLAUDE.md` ;
   - ce qui appartient à l'éditeur (textes, fichiers scellés, tortue, page Confidentialité, réponses validées) devient une question pour lui ;
   - un détail mineur est regroupé ou laissé, et dit.
4. **Une urgence** (un défaut confirmé de vie privée ou de sécurité en ligne) arrête la campagne et lui est dite aussitôt.

## Journal

### 23-24 novembre 2026 — revues 1 et 2 : `src/worker` et `src/scripts`
- **Revue 1, `src/worker`** (le pilote) : 47 min, 463 000 jetons de relecteurs. Lecture en profondeur du répertoire, et aussi des tests et scripts qui le touchent. 11 constats, aucun déclenchable par un visiteur aujourd'hui.
- **Revue 2, `src/scripts`** : 28 constats (13 importants, 1 hors du répertoire, 14 mineurs). La plupart sont reproduits sur les données du dépôt, ou dans les trois moteurs sur une build.
- **Registre des constats** (W = worker, S = scripts). Statut : à vérifier → confirmé / conforme à une décision / question pour l'éditeur → corrigé (commit).

| # | Où | Constat | Gravité |
|---|---|---|---|
| W1 | `src/worker/index.ts:104` | L'arrêt manuel (fiche 6 : `silence_override: on` puis `deploy`) ne touche pas le Worker des phrases, construit à part | important |
| W2 | `src/worker/index.ts:408` | L'interrupteur `ask` de la base n'arrête rien ; `--switch stopped` sans `--what` change 0 ligne et sort 0 (fiches 8, 11) | important |
| W3 | `src/worker/ask.ts:136` | `/api/bench` peut rendre une sortie mal formée qui tient une mesure par morceaux de 4 ou 5 mots (latent : plus de texte en base) | important |
| W4 | `scripts/worker-runtime.test.ts:100` | Les tests échoueront pendant les deux fenêtres de gel de 2027 (vraie horloge, vrai `flags.json`) | antérieur |
| W5 | `scripts/ask-worker.test.ts:820` | Les portes de source effacent tout après `//`, même dans `'https://…'` : un appel extérieur passerait | antérieur |
| W6 | `scripts/bench-explain.ts:194` | Le banc sous-compte ce qu'il dépense (réservations non comptées) | antérieur |
| W7 | `scripts/worker-runtime.test.ts:280` | Le contrôle du débit échoue au hasard à la minute ronde | antérieur |
| W8 | `src/worker/measures.ts:154` | `/api/chat` admet 5 identifiants et n'en lit que 3 | mineur |
| W9 | `src/worker/chat.ts:146` | `isDay` accepte « 2026-11-31 » (aussi `campaignDecided`) | mineur |
| W10 | `src/worker/budget-core.ts:97` | Le registre des neurones peut rendre au mauvais créneau horaire | mineur |
| W11 | `src/worker/measures.ts:12` | Des commentaires disent « lues par l'éditeur » ou qu'un modèle lit la question | mineur |
| S1 | `src/scripts/chat.ts:728` | Notre carte « En clair » sous une question qui met en cause, quand elle porte aussi une date (ou rien trouvé) — contre D16.72 | important |
| S2 | `src/scripts/chat.ts:369` | La définition d'un mot (écrite par une IA) reste ouverte sous une question qui met en cause : **question pour l'éditeur** (D16.72 couvre-t-il les mots ?) | important |
| S3 | `src/scripts/chat.ts:708` | Index en échec : la carte « En clair » reste, sans savoir si la question met en cause | important |
| S4 | `src/scripts/game2.ts:935` | Après « Garder » depuis sa fiche, « Ne pas garder » écrit le jeu sur le téléphone | important |
| S5 | `src/scripts/chat.ts:212` | La feuille ne relit `/flags.json` qu'une fois : après une mise en veille à cheval sur le gel, « en pause » jusqu'au rechargement | important |
| S6 | `src/scripts/game2.ts:961` | Stockage refusé : « Elle est gardée sur ce téléphone. » alors que rien n'est écrit | important |
| S7 | `src/scripts/game2.ts:1506` | Retour arrière (bfcache) : le jeu se reconstruit depuis le stockage et perd l'écran en cours | important |
| S8 | `src/scripts/engine.ts:80` | La recherche en tapant ne trouve rien pour « R.S.A. », « S.M.I.C. » (la feuille, si) | important |
| S9 | `src/scripts/words-search.ts:79` | La ligne « Ce que veut dire » ne suit pas le texte quand les sections ne changent pas | important |
| S10 | `src/scripts/words-search.ts:77` | Arrivée par `#q=` : jamais de ligne « Ce que veut dire » | important |
| S11 | `src/scripts/search.ts:202` | Premier chargement : la ligne d'état peut dire le compte d'une recherche dépassée | important |
| S12 | `src/scripts/search.ts:184` | Premier chargement : une recherche dépassée vole le focus au champ | important |
| S13 | `src/scripts/words-hub.ts:110` | « Mots du programme » : le filtre ne trouve pas les termes à espace insécable (« règle des 3 % ») | important |
| S14 | `src/lib/terms.ts:90` | Les mots expliqués ratent « 5e République », « sixième », « oeuvre » (rangs, ligatures) | antérieur |
| S15 | `src/scripts/game2.ts:1051` | Mouvement réduit : la phrase du passage est écrite dans la même tâche que le focus (lecteur d'écran) | mineur |
| S16 | `src/scripts/chat.ts:549` | Le focus sur un lien de mesure part quand les phrases arrivent | mineur |
| S17 | `src/scripts/chat.ts:442` | Textes des mots en échec : le mot demandé disparaît | mineur |
| S18 | `src/scripts/game2.ts:1585` | Un échec du fichier du jeu n'est jamais retenté | mineur |
| S19 | `src/scripts/game2.ts:1625` | `pageshow` au premier chargement contourne « près de l'écran » | mineur |
| S20 | `src/scripts/game2.ts:565` | Latent : un joueur dont tous les mots ont quitté la liste revoit l'entrée | mineur |
| S21 | `src/scripts/words-search.ts:54` | Latent : surfaces « pages » fermée et « search » ouverte → lien vers une ancre absente | mineur |
| S22 | `src/scripts/words-hub.ts:21` | « oeuvre » ne trouve pas « bois d'œuvre » dans le filtre | mineur |
| S23 | `src/scripts/chat.ts:167` | Firefox : un échec d'import du module des mots n'est jamais retenté | mineur |
| S24 | `src/scripts/game2.ts:1221` | PLAUSIBLE : deux touches de couleur en moins de 350 ms bloquent un passage | mineur |
| S25 | `src/scripts/chat.ts:765` | PLAUSIBLE : le rattrapage de R73 ne couvre pas le dessin ni `gists()`/`explain()` | mineur |
| S26 | `src/scripts/engine.ts:69` | `ready` posé avant `loadJS` : plus de « ouverture » après un index illisible | mineur |
| S27 | `src/scripts/words-hub.ts:35` | Le hub ne vérifie pas que ses textes sont des chaînes | mineur |
| S28 | `src/scripts/chat.ts:553` | Un commentaire de documentation décalé | mineur |

### 24 novembre 2026 — revues 5 et 7 : `src/pages` et `astro.config.ts` ; la limite d'usage
- **Revue 5, `src/pages`** : 18 constats (7 importants). La plupart touchent des textes validés par l'éditeur ou sa page Confidentialité : ce sont des questions pour lui.
- **Revue 7, `astro.config.ts`** : 23 constats (2 importants). Plusieurs portent sur `build-mode.ts`, `_headers` et `check-build.test.ts`, que d'autres revues couvrent aussi.
- **Dans la nuit du 23 au 24**, la limite d'usage hebdomadaire a coupé quatre revues avant leur passe de vérification : `src/lib`, `src/layouts`, `public`, `scripts/deploy.ts`. Elles sont relancées le 24 à 19 h 30, après la réinitialisation, là où elles s'étaient arrêtées.
- **Coût observé** : une revue max consomme de 300 000 à 500 000 jetons de relecteurs et dure de 40 minutes à plusieurs heures.

| # | Où | Constat | Gravité |
|---|---|---|---|
| P1 | `src/pages/a-propos/index.astro:35` | « Les mesures qu'ils citent et leurs chiffres sont vérifiés contre le livre » : faux pour les chiffres d'études de `/r/exil-fiscal/` — **texte : l'éditeur** | important |
| P2 | `src/pages/licence/index.astro:35` | « Le code de l'app est libre, sous licence MIT », mais le `LICENSE` ne nomme pas `src/` ni `public/` — **texte juridique : l'éditeur** | important |
| P3 | `src/pages/404.astro:6` | Dans la build de retrait (`holding`), la page 404 n'a pas « Site non officiel. » | important |
| P4 | `src/pages/exactitude/index.astro:91` | « Relu par trois navigateurs » quoi que dise `verification.json` ; `verify-2026.ts --write` accepte un seul moteur | important |
| P5 | `src/pages/exactitude/index.astro:114` | « Objectif manqué » resterait affiché une fois les 90 % atteints | important |
| P6 | `src/pages/exactitude/index.astro:73` | « Seize objections » tapé à la main ; rien ne le lie au fichier | important |
| P7 | `src/pages/methodologie/index.astro:47` | « Partout sur le site, des mots… » même surfaces fermées — latent ; **texte : l'éditeur** | important |
| P8 | `scripts/check-build.test.ts:171` | La porte « relu par » refuserait le premier texte vraiment relu | antérieur |
| P9 | `src/pages/s/[section].astro:159` | « Chaque numéro ouvre… sur la mesure » : 55 liens s'arrêtent au titre — **texte : l'éditeur** | mineur |
| P10 | `src/pages/methodologie/index.astro:31` | « Seules les empreintes sont publiées » : faux (34 mesures citées, incipits, repères) — **texte : l'éditeur** | mineur |
| P11 | `src/pages/s/[section].astro:145` | « 0 mesures » pour p3c1-s02 | mineur |
| P12 | `src/pages/confidentialite/index.astro:66` | La page ne nomme que melenchon2027.fr comme destination des liens ; `/r/exil-fiscal/` mène aussi au CAE et à l'Assemblée — **texte et relecture datée : l'éditeur** | mineur |
| P13 | `src/pages/sitemap.xml.ts:33` | Toutes les pages datées du 12/11 (`lastmod`) | mineur |
| P14 | `src/pages/404.astro:6` | La 404 se déclare canonique en `/404/` et `/404` répond 200 sans `noindex` | mineur |
| P15 | `src/pages/mot/index.astro:11` | = S21 | mineur |
| P16 | `src/pages/sommaire/index.astro:32` | `/sommaire/` embarque la feuille de style de la feuille (+0,7 Ko gzip) | mineur |
| P17 | `src/pages/r/[slug].astro:29` | `/r/rip-16/` « a changé d'adresse » alors qu'elle n'a jamais existé | mineur |
| P18 | `src/pages/data/[name].json.ts:13` | Commentaires périmés (« re-read », « fifteen ») | mineur |
| C1 | `astro.config.ts:93` | `target: 'es2022'` : aucun `-webkit-hyphens`, pas de césure sur Safari 15.4-16 (le défaut « L'immigrati/on ») | important |
| C2 | `astro.config.ts:32` | `__CEL_GAME_WRITES__` suit la validation de la liste : une build sans liste validée perd « Tout effacer » — **page Confidentialité : l'éditeur** | important |
| C3 | `public/_headers:40` | `immutable` s'applique aussi au 404 : Chromium garde un an un nom manquant (VÉRIFIÉ) | antérieur |
| C4 | `scripts/build-mode.ts:587` | La build « scrutin » et la fiche 9 sont refusées quand la liste du jeu n'est plus validée | antérieur |
| C5 | `scripts/build-mode.ts:119` | Les portes jugent la vraie build « scrutin » comme une build qui demande ; la CI ne la construit jamais | antérieur |
| C6 | `scripts/build-mode.ts:374` | Une build d'essai qui nomme un modèle passe la garde de production | antérieur |
| C7 | `scripts/build-mode.ts:391` | Une build de l'aperçu peut partir en production avec des surfaces de mots fermées là | antérieur |
| C8 | `src/components/Search.astro:169` | Après un déploiement, « Demander » ne s'ouvre plus dans un onglet d'avant (aucun rattrapage de l'import) | antérieur |
| C9 | `src/components/Search.astro:166` | `HTMLDialogElement` absent (Safari 14-15.3, Firefox 79-97) : `ReferenceError`, bouton mort | antérieur |
| C10 | `astro.config.ts:59` | `base-uri` et `form-action` absents de la politique de la page (seulement dans `_headers`) | mineur |
| C11 | `src/pages/index.astro:61` | Le garde du gel s'exécute avant la politique de sécurité (meta CSP rendue après) | mineur |
| C12 | `astro.config.ts:60` | Rien ne vérifie que `_headers` et la meta ne contraignent pas la même directive | mineur |
| C13 | `astro.config.ts:63` | Six empreintes de scripts inutiles dans chaque page (265 o gzip sur l'accueil) | mineur |
| C14 | `scripts/check-build.test.ts:141` | La porte des puits Trusted Types rate des formes courantes (`(0,eval)`, `srcdoc`…) | mineur |
| C15 | `astro.config.ts:62` | `npm run dev` sert Trusted Types : la barre d'outils et le rechargement CSS cassent (PLAUSIBLE) | mineur |
| C16 | `astro.config.ts:90` | = S21 | mineur |
| C17 | `src/holding/pages/index.astro:42` | Le texte de la page de retrait parle de l'édition 2025 — **texte : l'éditeur** | mineur |
| C18 | `astro.config.ts:1` | Aucun lint ni contrôle de types ne lit `astro.config.ts` | mineur |
| C19 | `src/layouts/Base.astro:56` | = P14 | mineur |
| C20 | `src/components/Search.astro:51` | = P16 | mineur |
| C21 | `public/_headers:43` | `/fonts/*` et `/og/*` gelés un an sous des noms fixes (le défaut de R73, latent) | mineur |
| C22 | `astro.config.ts:12` | Commentaire : source et statut des chiffres de LCP | mineur |
| C23 | `scripts/e2e.ts:599` | Le contrôle « script du jeu non chargé » ne voit plus `Game2` | mineur |

### 24 novembre 2026 — revue 6 : `src/layouts` ; le lot du Worker corrigé
- **Revue 6, `src/layouts`** (`Base.astro`) : 24 constats. La revue a été forcée de rendre la main avant ses vérificateurs : les verdicts sont ceux du coordinateur, CONFIRMÉ ou PLAUSIBLE, aucun réfuté.
- **Lot du Worker corrigé** (commits `63dcbd2`, `9a06de8`) : W1 à W7, W9 (côté Worker), W10 (commentaire seulement : le code reste, décision expliquée dans le commentaire), W11, W12. W8 et la moitié de W9 qui touche `src/lib/game-gists.ts` attendent la fin de la revue de `src/lib`.
- **W12**, oublié au premier registre : les commentaires du budget parlaient d'un compteur unique pour tout le site, alors que chaque Worker a le sien.

| # | Où | Constat | Gravité |
|---|---|---|---|
| L1 | `src/layouts/Base.astro:152` | = P3 (la 404 de la build de retrait, sans « Site non officiel. ») | important |
| L2 | `src/layouts/Base.astro:81` | Le rebrand neutre garde la charte : `theme-color`, favicon, image d'aperçu | important |
| L3 | `src/layouts/Base.astro:56` | = P14 (`/404/` canonique, `/404` indexable ; VÉRIFIÉ en ligne) | important |
| L4 | `src/layouts/Base.astro:181` | Build de retrait : plus aucune mention légale en ligne — **lecture juridique : l'éditeur** | important |
| L5 | `scripts/build-mode.ts:419` | Retrait : les pages de l'app (`/sommaire/`, `/mot/…`, pages institutionnelles) tombent en 404 au lieu de la page de retrait | antérieur |
| L6 | `src/holding/pages/index.astro:41` | = C17 (texte de la page de retrait faux) — **texte : l'éditeur** | antérieur |
| L7 | `src/styles/base.css:138` | Le libellé « Mesure clé, premiers mots » est dessiné en Gowun Batang gras (la police du programme), chargé tard | antérieur |
| L8 | `src/components/Search.astro:169` | = C8 (« Demander » mort après un déploiement) | antérieur |
| L9 | `src/pages/r/[slug].astro:56` | Titre des réponses : « « objection » — C'est écrit là » — **texte : l'éditeur** | antérieur |
| L10 | `src/pages/index.astro:57` | Build « scrutin » : la description de l'accueil ne dit plus « Site non officiel. » — **texte : l'éditeur** | antérieur |
| L11 | `src/pages/r/[slug].astro:57` | Les aperçus de quatre réponses portent 8 à 13 mots d'affilée du programme — **lecture de D15.7 : l'éditeur** ; porte à ajouter | antérieur |
| L12 | `src/pages/mot/[slug].astro:41` | Descriptions et aperçus : texte préparé avec une IA, sans l'étiquette — **l'éditeur** | antérieur |
| L13 | `src/styles/base.css:16` | Les métriques de repli des polices ne calibrent pas le repli : CLS 0,02 à 0,04 au chargement tardif (PROBABLE) | antérieur |
| L14 | `src/styles/base.css:241` | Le lien vers l'accueil (en-tête) fait 43 px, sous le plancher de 44 px | antérieur |
| L15 | `src/pages/sitemap.xml.ts:32` | = P13 | antérieur |
| L16 | `src/layouts/Base.astro:138` | = C11 (le garde du gel avant la politique de sécurité) | mineur |
| L17 | `src/layouts/Base.astro:165` | Accueil : « Chercher » montré et « Sommaire » caché même si la recherche ne démarre pas | mineur |
| L18 | `src/layouts/Base.astro:100` | = C21 (`/og/` gelé un an sous un nom fixe) | mineur |
| L19 | `src/layouts/Base.astro:127` | Pendant un gel, l'accueil précharge la Bold d'un jeu caché | mineur |
| L20 | `src/layouts/Base.astro:91` | Pas d'icône sur la page de retrait, ni d'icône de repli (`.ico`, `apple-touch-icon`) | mineur |
| L21 | `src/layouts/Base.astro:103` | Pas de `og:image:alt` : « Site non officiel » ne se dit pas aux lecteurs d'écran | mineur |
| L22 | `src/layouts/Base.astro:187` | Le pied de page ne marque jamais la page courante (`aria-current`) | mineur |
| L23 | `src/layouts/Base.astro:183` | « Pages du site » tapé hors du kit de textes | mineur |
| L24 | `src/layouts/Base.astro:34` | Commentaires périmés du gabarit | mineur |
- **Compléments de la revue 6** (vérificateurs arrivés après la synthèse) :
  - **L4 CONFIRMÉ** : la build de retrait ne publie plus le nom et l'adresse de l'hébergeur, que la lecture du projet (`11-conformite.md`, LCEN art. 1-1 II) tient pour la condition de l'anonymat de l'éditeur. **Question pour l'éditeur.**
  - **L10 RÉFUTÉ** : la description de l'accueil de la build « scrutin » est un texte validé (D19.19, `TEXTES-JEU-DABORD.md`), tenu par `game-page.test.ts`.
  - **L11 ramené à trois pages** au-delà de la ligne du projet (neuf mots d'affilée du livre, `leak-scan.ts`) : `/r/retraites/` (14 mots), `/r/laicite/` (10), `/r/immigration/` (9) ; les mêmes mots sont dans leur paragraphe visible. Ce sont des réponses acceptées (rip-02, rip-11, rip-05) : **reformulation par l'éditeur**, puis une porte sur `<meta>`, `<title>` et JSON-LD.
  - **Ajouts** : le retrait (`build:holding && deploy`) ne touche pas le Worker des phrases, qui répond encore derrière la page de retrait jusqu'à `deploy:chat -- --withdraw` : une ligne à ajouter au runbook. Les renvois à la « runbook sheet 9 » de `build-mode.ts`, `build.ts`, `launch.ts` et `wrangler.static.jsonc` visent la fiche 9 de `14-risques.md` §4, pas celle de `09-architecture.md`, qui parle aujourd'hui du jeu.
  - **Dernier passage du balayage (trois constats de plus, mesurés dans les trois moteurs)** ; la revue compte 26 constats :
    - **L25 (important)**, `src/layouts/Base.astro:153` : texte agrandi à 200 % sur un téléphone, l'en-tête collant dépasse la place que la page lui garde (`scroll-padding-block-start: 5rem`, soit 160 px, contre 214 px à 390 × 844). Les titres atteints par une ancre et les liens qui prennent le focus passent dessous (WCAG 2.4.11, bloquant selon `design/perf-budget.md`). Le jeu contourne déjà le défaut pour son seul bloc.
    - **L26 (antérieur)**, `src/styles/base.css:268` : à 320 px et 200 %, le nom du site et « Site non officiel. » se coupent au milieu des mots. À corriger avec L25, car l'en-tête qui passe à la ligne grandit.
    - **L27 (mineur)**, `src/layouts/Base.astro:142` : une page imprimée ne porte « Site non officiel. » que sur sa première feuille (aucune règle `@media print`).

### 24 novembre 2026, au soir — le lot de `src/scripts`
- **Écrits** :
  - la feuille : S3, S5, S17, S23, S25, S28 ;
  - la recherche : S8, S9, S10, S11, S12, S26 ;
  - le jeu : S4, S6, S7, S15, S18, S19, S20, S24.
  Types et lint verts ; builds et e2e en cours.
- **Attendent une autre revue** : S1 et S14 (`src/lib`), S13, S22, S27 (`WordsHub.astro`, revue des composants en cours), S21 (couplage des surfaces de mots).
- **Laissé pour plus tard** : S16 (le focus perdu à l'arrivée des phrases) demande une mise à jour de l'affichage par clé.
- **Question pour l'éditeur** : S2.

### 24 novembre 2026, au soir — revue 9 : `scripts/deploy.ts`
- **16 constats** : 15 confirmés, 1 plausible ; 12 importants. wrangler n'a jamais tourné pour de vrai (un `npx` de substitution). Sept candidats réfutés : des choix documentés et tenus par des tests, ou un déclencheur impossible.
- **Ces correctifs touchent aussi `build-mode.ts` et `launch.ts`**, qui ont leur propre revue (10 et 11) : ils se feront d'un bloc, après ces deux revues.

| # | Où | Constat | Gravité |
|---|---|---|---|
| D1 | `scripts/deploy.ts:75` | `npm run deploy --dry-run` (sans `--`) déploie la production pour de vrai ; `deploy:chat --withdraw` sans `--` déploie au lieu de retirer | important |
| D2 | `scripts/deploy.ts:176` | Une build ratée à mi-course (dist/ vidé par Astro) part en production : vide ou partielle | important |
| D3 | `scripts/deploy.ts:240` | Une build d'essai (`dist-ask/`, un modèle nommé) passe aujourd'hui toutes les gardes de la production | important |
| D4 | `scripts/deploy.ts:175` | `npm run deploy -- --bench` déploie la production au lieu d'être refusé | important |
| D5 | `scripts/deploy.ts:234` | Le retrait (D14.10) meurt sur une virgule de trop dans `launch.json` (lecture faite même pour la build de retrait) | important |
| D6 | `scripts/deploy.ts:234` | La fiche 9 (retirer un mot du jeu) est refusée à l'apex depuis le lancement | important |
| D7 | `scripts/deploy.ts:250` | `deploy` ne touche jamais le Worker des phrases : la fiche 6 (= W1) et **le retrait** le laissent répondre | important |
| D8 | `scripts/deploy.ts:226` | Un fichier des phrases du jeu commité mais jamais poussé passe la garde « dépôt public » | important |
| D9 | `scripts/deploy.ts:132` | Le contrôle du nom avant `wrangler delete` ignore `env.preview.name` : le retrait pourrait supprimer un autre Worker | important |
| D10 | `scripts/deploy.ts:243` | Des mots expliqués jamais scellés passent si `dist/` est resté d'une build d'essai | important |
| D11 | `scripts/deploy.ts:181` | Une build de l'aperçu peut partir en production (hôte du marqueur jamais lu) — latent | important |
| D12 | `scripts/deploy.ts:185` | PLAUSIBLE : un marqueur « scrutin » périmé laisse passer une page qui demande pendant un gel | important |
| D13 | `scripts/deploy.ts:107` | Un `--accord` répété arrive à wrangler comme argument positionnel | mineur |
| D14 | `scripts/deploy.ts:171` | `--outdir` accepté pour un vrai déploiement et n'importe quel dossier | mineur |
| D15 | `scripts/deploy.ts:273` | Sortie 1 sans message quand `npx` ne se lance pas | mineur |
| D16 | `scripts/build-mode.test.ts:702` | Aucun test ne joue le vrai chemin de déploiement ; un test fige l'expression fautive de D4 | mineur |

### 24 novembre 2026, au soir — revue 8 : `public/`
- **19 constats** : 3 importants, 11 antérieurs, 5 mineurs. Aucune urgence de vie privée ni de sécurité. Les vérificateurs ont fait tourner le vrai serveur de fichiers de Cloudflare (celui de miniflare) avec la configuration de la production, et deux requêtes ordinaires vers `cestecritla.fr`.
- **Mesuré de plus** : la 404 gardée un an (C3) est aussi gardée par WebKit, donc Safari et tous les navigateurs d'iPhone, et même au rechargement ; Firefox redemande. Un seul nouvel essai `fetch(url, { cache: 'reload' })` la remplace dans les trois moteurs. Elle a désormais un déclencheur daté : la build « scrutin » la veille de chaque fenêtre de 2027 (fiche 7), puis la build normale, qui rend les mêmes noms.
- **Réfuté** : « les étiquettes de retour arrière sont antérieures aux noms par empreinte » (`prod-avant-r73` est la build de R73 elle-même ; les trois plus anciennes ne lisent pas `book_words`).

| # | Où | Constat | Gravité |
|---|---|---|---|
| U1 | `public/_headers:59` | = C3, mesuré de plus (Chromium et WebKit ; le correctif mesuré : un nouvel essai `cache: 'reload'`) | important |
| U2 | `public/_headers:32` | = C8 : « Demander » mort après un déploiement ; seul un rattrapage de l'import couvre tous les chemins | important |
| U3 | `public/favicon.svg:1` | = L2 : la build neutre garde la charte dans l'icône, l'image d'aperçu et `theme-color` ; aucune porte | important |
| U4 | `public/flags.json:2` | = W1, compléments : un `deploy:chat` pendant un arrêt y fige « on » ; `?x=1` sur l'aperçu atteint le Worker des pages | antérieur |
| U5 | `src/lib/silence-guard.ts:24` | « on » n'atteint jamais le HTML : sans JavaScript, la première manche du jeu reste pendant un arrêt manuel | antérieur |
| U6 | `src/scripts/silence-now.ts:87` | L'interrupteur s'ouvre sur une faute de frappe (« On », virgule de trop) ; rien ne lit le fichier avant le déploiement | antérieur |
| U7 | `docs/discovery/09-architecture.md:606` | Fiches 1, 3 et 5 : des clés de `flags.json` que plus rien ne lit (`chat: off`, `silence: on`) — la veille CNCCEP mène à la fiche 5 | antérieur |
| U8 | `docs/discovery/09-architecture.md:613` | Fiches 6 et 7 : l'apex seul ; l'aperçu garde la build normale pendant les fenêtres de 2027 | antérieur |
| U9 | `scripts/deploy.ts:250` | = D7 (le retrait laisse le Worker des phrases répondre) | antérieur |
| U10 | `src/holding/pages/index.astro:42` | = C17 (texte de retrait) ; les renvois « runbook sheet 9 » | antérieur |
| U11 | `design/tokens.neutral.json:10` | La commande écrite du rebrand (`--tokens=neutral`) construit la charte sans un mot ; seule `build:neutral` marche, et aucun document ne la nomme | antérieur |
| U12 | `scripts/headers.test.ts:53` | La porte « un en-tête, une valeur » ne voit pas l'hôte de l'aperçu (`noindex, noindex` sur `/data/` de beta) et refuse le bon correctif | antérieur |
| U13 | `scripts/e2e-kit.ts:45` | Toutes les portes de navigateur échoueront pendant les deux fenêtres de 2027 (la classe de W4) | antérieur |
| U14 | `src/pages/404.astro:6` | = P14 / L3 | antérieur |
| U15 | `public/_headers:39` | = C21 : polices et image d'aperçu sous des noms fixes gelés un an ; deux commentaires faux | mineur |
| U16 | `public/_headers:78` | Commentaire : `/api/ask` n'existe plus (aussi `routes.test.ts:152`, `wrangler.chat.jsonc:11`) | mineur |
| U17 | `public/_headers:3` | Commentaire : `upgrade-insecure-requests` est dans l'en-tête sans être « ce qu'une meta ne peut pas dire » | mineur |
| U18 | `src/layouts/Base.astro:91` | = L20 | mineur |
| U19 | `src/layouts/Base.astro:100` | = L21 (`og:image:alt`, **texte : l'éditeur**) | mineur |
- **Vérifié aussi, rien à redire** : chaque caractère des pages, des fichiers de données et de l'image d'aperçu est dans les trois polices ; l'image fait bien 1 200 × 630 ; en production, l'en-tête `Date` est à l'heure et le HTML est celui de la build (une page de mentions identique octet pour octet, sans réécriture d'adresse).

### 24 novembre 2026, au soir — revue 4 : `src/components` ; les lots de `src/scripts` et des portes de pages commités
- **Commits** : `052e52b`, le lot de `src/scripts` (S3 à S28 écrits plus haut ; les trois contrôles de la suite du jeu qui lisaient la phrase avant `SAY_LATER_MS` attendent désormais, comme le reste de la suite) ; `f436d29`, P4, P5, P6, P8.
- **Revue 4, `src/components`** : 25 constats (7 importants, 2 hors du répertoire, 16 mineurs), reproduits dans les trois moteurs sur une copie de la build de production. **Réfutés** : l'historique du jeu sans JavaScript (accepté par la revue de sécurité du 19/11, M3) ; un regroupement de lettres de `WordsHub` qu'aucun mot actuel ne déclenche (la liste est scellée).

| # | Où | Constat | Gravité |
|---|---|---|---|
| K1 | `src/components/Search.astro:166` | = C9 : sans `<dialog>`, `ReferenceError` ; « Demander » reste grisé et mort, la ligne « Ce que veut dire » ne charge jamais | important |
| K2 | `src/components/Search.astro:169` | = C8 / U2 : un import de la feuille qui échoue laisse « Demander » mort, sans un mot (aussi l'import de `:189`) | important |
| K3 | `src/components/ChatSheet.astro:113` | Retour arrière (bfcache) : la question reste dans le champ avec ses résultats, une pression ramène la conversation — contre « Elle disparaît quand tu quittes la page. » | important |
| K4 | `src/components/WordsHub.astro:22` | = moitié composant de S13 / S22 : le pli des noms garde l'espace insécable et « œ » | important |
| K5 | `src/components/WordsHub.astro:81` | Un mot ouvert avant que le script tourne reste vide (aussi `Words.astro:27`) | important |
| K6 | `src/components/GameStorage.astro:64` | Un onglet fermé garde sa manche (restauration de Chromium et Firefox) après « Tout est effacé. » — **textes et D16.42 : l'éditeur** | important |
| K7 | `src/components/Game2.astro:490` | PLAUSIBLE : sans `<dialog>`, sa fiche fermée se dessine dans le bloc du jeu | important |
| K8 | `src/styles/game.css:606` | « Les prochains mots : … » sans guillemets ni police du livre (règles retirées par `2a5279a`) | antérieur |
| K9 | `src/scripts/game2.ts:1575` | Script présent, données en échec : la manche du HTML inscrit `/#a1`, `/#b2-4` dans l'historique — **avec K6 : l'éditeur** | antérieur |
| K10 | `src/components/Search.astro:168` | Deux pressions pendant le chargement : le focus va au champ, le clavier couvre la réponse | mineur |
| K11 | `src/components/Search.astro:99` | Branche sans `<dialog>` : l'étiquette invite encore à poser une question (latent, derrière K1) | mineur |
| K12 | `src/components/Search.astro:51` | = P16 / C20 : feuilles de style de composants non rendus | mineur |
| K13 | `src/components/Search.astro:137` | La ligne « Ce que veut dire » n'est jamais annoncée | mineur |
| K14 | `src/components/Search.astro:140` | Niveaux de titres de l'accueil (h2 dans h2) | mineur |
| K15 | `src/components/Search.astro:6` | Commentaire de contrat périmé (« hidden », « l'adresse garde la requête ») | mineur |
| K16 | `src/components/Chips.astro:3` | Commentaires : « quinze réponses… relues par une personne » | mineur |
| K17 | `src/components/WordsHub.astro:65` | La ligne « Aucun mot » entre dans l'arbre avec son texte : peut-être pas dite | mineur |
| K18 | `src/components/WordsHub.astro:76` | `/mot/` expose 30 repères, dont 25 lettres | mineur |
| K19 | `src/components/Game2.astro:450` | La manche du HTML n'ouvre pas la mesure surlignée (aucun `enhanceOfficialLinks` sur l'accueil) | mineur |
| K20 | `src/components/Game2.astro:493` | PLAUSIBLE : la phrase de sa figure, écrite dans la tâche qui ouvre la fiche (famille de S15) | mineur |
| K21 | `src/components/Game2.astro:397` | Prise du bloc ratée : « Ta tortue change… » sur la manche du HTML (compromis consigné par la session, pas par l'éditeur) | mineur |
| K22 | `src/components/Studies.astro:24` | « Même étude, p. 15 » : un lien qui ne nomme pas sa source (WCAG 2.4.4) | mineur |
| K23 | `src/components/Authorship.astro:35` | = V5-a : le jour d'un texte « reviewed » avec études, deux phrases collées | mineur |
| K24 | `src/components/Bridge.astro:34` | Latent : le chapitre que rend `bridgeTarget()` est ignoré | mineur |
| K25 | `src/components/Quote.astro:39` | Titres officiels sans espaces typographiques : « : » ou « » » en début de ligne | mineur |

### 24 novembre 2026, dans la nuit — revue 3 : `src/lib` ; les règles de « Demander » corrigées (non déployé)
- **Revue 3, `src/lib`** : 53 constats (30 importants, 4 hors du répertoire, 19 mineurs), tous reproduits sur le vrai pipeline de la feuille (`scripts/ask-page.ts`, `cleanQuestion`, les refus du téléphone), sauf sept restés PLAUSIBLES. Deux réfutés : le futur en -clure (R36, déjà connu) ; `Array.prototype.at` (hors du téléphone, cible es2022).
- **Le plus grave** : « Demander » montrait nos phrases d'IA là où ses règles demandent des liens — sous un responsable politique nommé derrière « la politique de », « le gouvernement » ou une ponctuation (dont **une régression de D21.7** : « La loi : Macron mis en examen » n'était plus refusé), sous un nom écrit en petites capitales ou avec « ø », sous « le 7 octobre » écrit autrement (la capture que D16.71 avait fermée), sous une consigne de vote assortie d'un « si on vote », à côté d'un peuple avec « exil fiscal » ou un pays.
- **Corrigé dans la copie de travail, testé, non déployé** (B = `src/lib`) :
  - noms et lois : B1, B2 (le nom d'une loi n'est plié dans sa loi que dans la même proposition, et plus derrière « la politique de », « le gouvernement », « le quinquennat », « les années », « le plan » ; `spelledClauses` dans `search-core.ts`) ;
  - lettres et signes : B4, B5, B35 (une lettre que la recherche ne lit pas est un signe : liens), B6 en partie (« ° » n'est plus un signe ; les parenthèses triples en sont un) ;
  - dates : B3 (« le 7 o c t o b r e », « le ７ octobre », « 7/10 », « octobr ») ;
  - vote : B7, B18 (la condition est retirée de la question au lieu de tout couvrir ; « parce qu'on vote » lu) ;
  - tours mis en cause : B8, B9, B10, B11 (= S1), B12 (aucun mot expliqué au-dessus des liens d'une question mise en cause : le tour porte `charged`, et les mots de la question attendent la fin de la recherche), B13, B17, B19 ;
  - refus trop larges : B14 (ponctuation non ASCII), B15 (« clowns », « charlatans », « guignols », « bouffons », « débile » ne refusent plus seuls, seulement à côté d'un nom), B16 (« quelle IA », « ChatGPT », « ce chat ») ;
  - recherche : B20 (mots de remplissage par racine), B21 (un nombre cherché tel qu'écrit : « 1 500 » ne trouve plus « 150 000 »), B22 (« 2027, 100 » ne devient plus 2027100) — **chiffres de `/exactitude` inchangés** ;
  - données : « noir », « noire », « noirs », « noires » retirés de `people` (`data/2026/ordinary.json`, écrit par la session) : un nom d'origine ne se porte jamais garant de lui-même (règle de `CLAUDE.md`), et une porte le tient désormais ;
  - divers : B23 (le jeu tourne de nouveau une fois tout trouvé), B24 (= S21), B36, B37, B38, B41, B42, B45 à B48 (dates lues à rebours, « 1er », `campaignDecided` = moitié de W9), B51, B53 ;
  - le contrôle avant dépôt (`ask-validate.ts`, aucun visiteur) : B25 à B30, B49, B50.
- **Laissés** : B39 (une liste validée sans `by` : l'écrire demanderait « editor », donc son mot), B40 (un fichier des phrases du jeu cassé ne peut pas atteindre un commit), B43 (la liste de gel jamais appliquée : à reprendre avec les portes), S14 (« 5e République », « sixième » : des alias dans `terms.json`, scellé).
- **Pour l'éditeur** : B6 (« ₪ », « † », « 1488 » : des cibles ?), B44 (l'heure de réouverture sans fuseau : un texte), B52 (les clés JSON françaises `texte`, `phrases` : une exception à écrire), et **le déploiement de ces règles**, qui changent ce que « Demander » montre.
- **Recensés ailleurs** : B31 = D10, B32 = S6, B33 = D8, B34 = D11.
- **Lot des composants, écrit dans la même nuit** :
  - `Search.astro` : K1 (sans `<dialog>`, la page devient celle d'un champ qui cherche ; plus de `ReferenceError`), K11 (son étiquette aussi, chaîne existante), K2 = C8 = U2 (un import de la feuille qui échoue fait de même, au lieu d'un bouton mort ; l'import de la note « scrutin » a son rattrapage), K10 (un seul import à la fois), K15 (commentaire de contrat) ;
  - K3 : quand la page est quittée avec une conversation, le champ oublie la question qui l'a ouverte, ses résultats et son compte (`cel:forget`) ;
  - « Mots du programme » : K4 = S13 = S22 (un même pli des deux côtés : espaces insécables, « œ » et « oe »), K5 (un mot ouvert avant le script est rempli, ici et sous les fiches), K18 (plus de 25 repères de lettres), S27 (seuls des textes sont gardés) ;
  - jeu : K7 (sa fiche fermée n'est plus dessinée sans `<dialog>`), K8 (les « prochains mots » retrouvent guillemets et police du livre, règles perdues en `2a5279a`), K20 (la phrase de sa figure dite après le focus, comme S15) ;
  - K22 (« Même étude » nomme sa source aux lecteurs d'écran, avec les mots du fichier), K23 (= V5-a : deux phrases terminées), K16 et deux autres commentaires (« quinze… relues par une personne »).
  - **Laissés** : K12 (= P16, 0,7 Ko), K13, K14, K17, K19, K21, K24, K25 (mineurs, ou un texte ou une mise en page à montrer). **Pour l'éditeur** : K6 et K9 (un onglet fermé, l'historique : ses textes de la page Confidentialité).

### 24 novembre 2026, 21 h 28 — les corrections des revues 1 à 8 en production (D21.16)
- **Ses deux réponses** : le plafond du script de la feuille relevé à 17 Ko (D21.15) ; « Aperçu puis production » (D21.16).
- **Commits** : `eb23dea` (règles de « Demander » et `src/lib`), `731e714` (composants), `79ea2bf` (ce journal et les décisions), fusionnés en avance rapide dans `main` avec `63dcbd2`, `9a06de8`, `052e52b`, `f436d29`.
- **Portes** : dans la copie de travail, la suite unitaire, les types, le lint, les contrastes, l'accessibilité (252 contrôles), les cinq suites de navigateur dans les trois moteurs et le balayage du jeu ; dans le dépôt principal, sur le même arbre, 716 tests dont l'anti-fuite complète, le lint, les contrastes, les types, les quatre builds.
- **Déployé** : aperçu, Worker `cestecritla-preview` version `bbc7072f` ; production, Worker `cestecritla` version `d2debbe5`, commit `79ea2bf`. Le Worker des phrases n'est pas touché.
- **Vérifié en ligne** : sur les trois hôtes, 1 312 fichiers sur 1 315 identiques à la build (au premier passage, le cache de bord servait encore quelques pages d'avant, pour cinq minutes au plus) ; une sonde de « Demander » écrite dans le scratchpad (sans `private/`), dans les trois moteurs, sur l'aperçu et sur `cestecritla.fr` : 33 « ok » chacun — dont « La loi : Macron mis en examen » refusée, aucune requête vers un autre hôte, `/api/gists` ne recevant que `corpus` et `ids`, aucun mot tapé dans aucune requête.
- **Au registre** : R74 (une retouche des règles rouvre une capture fermée — réalisé du 23/11 au 24/11).
- **Retour arrière** : l'étiquette locale `prod-avant-revues` (`7558828`).
- **Restent** : les revues 10 à 19 (dont 10 et 11 en cours), le lot des « rails », le lot des pages (écrit dans la copie de travail, pas encore testé), les questions pour l'éditeur.

### 24 novembre 2026, au soir — revue 11 : `scripts/build-mode.ts`
- **33 constats** (15 importants, 6 hors du fichier, 12 mineurs), reproduits sur des copies de l'arbre ; rien construit ni déployé dans la copie de travail, wrangler jamais lancé. Beaucoup recoupent D (revue 9), C, L et U ; **le neuf** (M = `build-mode.ts`) :

| # | Où | Constat | Gravité |
|---|---|---|---|
| M1 | `scripts/build-mode.ts:589` | Après le lancement, un blocage revenu fait dire à `npm run deploy` de construire la page de retrait : le message pousse à retirer tout le site | important |
| M2 | `scripts/build-mode.ts:612` | La règle des mots expliqués (D20.15) refuse la build « scrutin » et une build en mode « off », qui n'en montrent aucun | important |
| M3 | `scripts/build-mode.ts:299` | Déployer le Worker des phrases ne vérifie jamais le nom que la configuration donne (le retrait, si) : il pourrait remplacer le Worker des pages | important |
| M4 | `scripts/build-mode.ts:313` | La production n'est pas tenue au dossier légal du chat (`preview_legal_on`), l'aperçu si | important |
| M5 | `scripts/build-mode.ts:476` | Le retrait meurt sur un `exposure-policy.json` mal formé, que la build de retrait n'utilise pas (avec D5) | important |
| M6 | `scripts/build-mode.ts:426` | Deux des huit liens envoyés le 9/9/2026 (`/r/c6-s01-k01`, `/r/c8-s02-k01`) répondent 404 en production | important |
| M7 | `scripts/build-mode.ts:449` | Le rebrand neutre est défait par le déploiement suivant, sans que rien le refuse (avec U3, U11) | important |
| M8 | `scripts/deploy.ts:231` | Rien ne lie le `dist/` déployé à l'arbre commité : une retouche non commitée d'un texte validé part en production | antérieur |
| M9 | `scripts/deploy.ts:269` | PLAUSIBLE : une build lancée pendant un déploiement part sans qu'aucune porte l'ait vue | antérieur |
| M10 | `scripts/build-mode.ts:62` | `wrangler rollback` pendant une fenêtre de silence rendrait la build normale, sans porte (à écrire dans R41 et les fiches) | antérieur |
| M11 | `scripts/build-mode.ts:397` | Un `dist/` sans le jeu passe la garde alors qu'une build d'aujourd'hui le publierait | mineur |
| M12 | `scripts/build-mode.ts:400` | Des refus disent la mauvaise raison ou le mauvais remède | mineur |
| M13 | `scripts/build-mode.ts:9` | Commentaires d'avant le lancement (dont « runbook sheet 9 ») | mineur |
| M14 | `scripts/build-mode.ts:328` | Le commentaire de `refusedArguments` décrit mal wrangler 4.130 | mineur |
| M15 | `scripts/build-mode.ts:73` | `guardedEnv` passe tout l'environnement à wrangler, qui lit aussi les `.env` : `WRANGLER_CI_OVERRIDE_NAME` renomme la cible, un `.env` peut ouvrir la garde | mineur |
| M16 | `scripts/build-mode.ts:136` | La build de retrait part sur l'aperçu en fichiers statiques sans prévenir de R27 | mineur |
| M17 | `scripts/build-mode.ts:168` | `database_id: ""` accepté ; deux versions absentes se valent | mineur |
| M18 | `scripts/build-mode.ts:227` | Un BOM en tête de `wrangler.chat.jsonc` fait refuser le retrait avec un message faux | mineur |
| M19 | `scripts/build-mode.ts:482` | La politique de citation « validée » sur la forme d'une date, sans lien avec ce qui a été validé | mineur |
- **Recensés ailleurs** : D2, D3/C6, D4, D7, D8, D9, D11/C7, D12, D13, D14, C4/D6, C5, L5, U8.

### 24 novembre 2026, dans la nuit — premières questions à l'éditeur ; le gabarit et la page de retrait
- **Ses réponses** (D21.17 à D21.21) : la page de retrait dit « Ce site est retiré. » (texte proposé, retenu tel quel) ; la build de retrait garde `/mentions-legales/`, et la page y mène ; `/a-propos/` ajoute « les chiffres d'études, contre leurs propres documents » ; les débuts de trois réponses (`rip-02`, `rip-11`, `rip-05`) sont reformulés, et il en a validé les mots.
- **Fait en conséquence** :
  - page de retrait réécrite (`src/holding/pages/index.astro`), sa page des mentions (`src/holding/pages/mentions-legales/`), « Site non officiel. » sur chacune de ses trois pages ; la fiche 9 de `14-risques.md` §4 et `CLAUDE.md` disent les **deux** gestes du retrait (la build de retrait, puis l'arrêt des phrases, que la première ne touche pas) ;
  - les trois débuts dans `data/2026/riposte.json` ; une porte dans `scripts/leak.test.ts` refuse désormais neuf mots du livre de suite dans le titre et les aperçus de chaque page construite, même ceux que l'édition 2025 avait déjà écrits (là où tourne l'anti-fuite : le dépôt principal).
- **Gabarit** : L14 (cible de l'en-tête à 44 px), L25 et L26 (à 200 % de texte, la place gardée sous l'en-tête suit sa hauteur, et une ancre n'est plus cachée dessous : mesuré dans les trois moteurs à 390 et 320 px, contrôle ajouté à `scripts/e2e.ts` ; l'en-tête passe à la ligne au lieu de couper les mots), un script en ligne, absent de la page de retrait et des pages réservées (D14.7) ; P11 (« 0 mesures »), P17 (`/r/rip-16/` n'a jamais changé d'adresse), P18 et deux commentaires (« relus par une personne », « quinze »).
- **Laissé** : L27 (l'impression).
- **Deuxième, troisième et quatrième lots de questions** (D21.22 à D21.33), chacun pris sur l'option recommandée :
  - titres des réponses : « Ce qu'on entend souvent : « … » — C'est écrit là » (D21.22, L9) ;
  - « Préparé avec une IA. » en tête de la description et de l'aperçu des réponses et des cartes (D21.23, L12, P4) ;
  - l'image de partage dit « C'est écrit là — Site non officiel. » à qui ne la voit pas, et une porte le tient (D21.24, L21, U19) ;
  - `/methodologie` : « On en publie les empreintes et de courtes citations, chacune liée à sa page. » (D21.25, P10) ;
  - l'heure de réouverture dit « (heure de Paris) » (D21.26, B44) ;
  - « ₪ » et « † » sont des signes visés, et « 1488 » une expression codée, en liens (D21.27, B6) ;
  - la page Confidentialité dit que les liens mènent aussi aux documents d'études (D21.28, P12) et qu'un navigateur peut rouvrir un onglet fermé avec sa manche (D21.30, K6), et elle est **datée de ses réponses** (`privacy_page`, 24/11/2026) ;
  - la fiche de section dit « au plus près de la mesure » (D21.29, P9) ;
  - la licence MIT nomme `src/` et `public/` (D21.31, P2) ;
  - « Tout effacer » reste sur la page Confidentialité dans toute build de l'app (D21.32, C2) ;
  - l'exception des clés `texte` et `phrases` est écrite dans `CLAUDE.md` (D21.33, B52).
- **Ce que ces textes ont demandé aux portes** : trois phrases validées dépassent quinze mots ; elles sont à la liste d'exceptions de `scripts/check-strings.test.ts`, avec sa décision pour raison. « Préparé avec une IA. » est une mention de l'outil qui a écrit nos textes, pas d'une IA en direct (exemptée comme `concept.authorship.accepted`). « restaure » a quitté le vocabulaire jugé (`data/2026/vocabulary.json`), à la main, comme l'outil l'aurait fait : l'outil lit `private/`, absent de la copie de travail ; il sera rejoué dans le dépôt principal.

### 24 novembre 2026, 23 h 07 — ses réponses du soir en production (D21.34, D21.35)
- **L'anti-fuite complète, dans le dépôt principal**, a d'abord échoué sur le contrôle du nouveau balayage des titres et des aperçus : il plantait sa fenêtre dans une balise `<meta>`, que le lecteur efface avant de lire. Corrigé : le contrôle passe par la même extraction que les pages (`291c654`). **Son premier vrai passage a trouvé un aperçu** : la carte « conscription citoyenne » mettait dans le sien au moins dix mots de suite que le livre de 2026 écrit aussi (déjà dans l'édition 2025, que le balayage des corps de page soustrait). Sur sa réponse « Reformuler » (D21.34), sa deuxième phrase devient « Elle commence par une formation militaire, et l'objection de conscience y est un droit. » — vérifiée par l'anti-fuite avant de lui être proposée (`cbab91d`). « commence » est jugé clair à la main dans `data/2026/vocabulary.json` : les jugements de l'outil sont sous `private/lexicon/`, que la campagne ne touche pas (D21.14) ; l'outil, s'il tourne sans ce jugement, refusera et le nommera, sans rien écraser.
- **Portes, dans la copie de travail puis sur `main`** : toutes vertes (718 tests unitaires, la build « scrutin » et les tests qui la lisent, bout en bout du site, de « Demander », de la feuille, des mots et du jeu dans les trois moteurs, balayage des 48 cartes, accessibilité, lint, typage ; l'anti-fuite complète sur `main`). Deux retouches de « Demander » avant le commit : « ‡ » retiré (je l'avais ajouté sans qu'il le nomme), et un nombre suivi d'un montant (« le smic à 1488 euros ») reste un montant.
- **En ligne, sur sa réponse « Aperçu puis production » (D21.35)** : commit `cbab91d`. Aperçu à 23 h 04 (22 h 04 UTC), Worker `cestecritla-preview` version `13ba6cb1` ; production à 23 h 07 (22 h 07 UTC), Worker `cestecritla` version `76e263be`. Le Worker des phrases n'est pas touché. **Vérifié en ligne** : sur les trois hôtes, 1 311 fichiers sur 1 314 identiques à la build, les trois écarts connus ; aucun fichier `.mjs` ni chemin absolu dans ce qui part. Sonde de « Demander », avec les cas de ce soir (« ₪ », « † », « 1488 », le montant) : en production, un moteur à la fois, 45 « ok » ; sur l'aperçu, le premier passage complet a perdu deux phrases de WebKit au limiteur de débit (6 par minute, D7.5 : la page garde ses liens), rejoué seul : « ok ».
- **Retour arrière, sa décision** : l'étiquette locale `prod-avant-reponses` (`79ea2bf`, la build servie de 21 h 28 à 23 h 07), fiche 14 du runbook.
- **Télémétrie** (revues 12 et 13) : chaque build envoyait un événement à Astro, chaque commande de wrangler à Cloudflare ; sur cette machine, la télémétrie d'Astro est active depuis le premier build, le 9 septembre 2026. Ce soir, les builds et déploiements de la session sont partis avec `ASTRO_TELEMETRY_DISABLED=1` et `WRANGLER_SEND_METRICS=false` ; les scripts et la CI les porteront (lot des « rails »). Les envois passés ne se reprennent pas.

### 24 novembre 2026, dans la nuit — revue 10 : `scripts/launch.ts`
- **21 constats** (9 importants, 3 antérieurs, 9 mineurs) : 16 confirmés, 2 plausibles et 2 réfutés à la vérification, puis 3 d'un balayage final, relus contre le code. Rien construit ni testé dans la copie de travail, aucun `private/` ouvert.

| # | Où | Constat | Gravité |
|---|---|---|---|
| A1 | `scripts/launch.ts:630` | Le retrait meurt sur un fichier de données à moitié écrit (une réponse en brouillon, `privacy_page` à `null`, un mot du jeu sans épingle) : les gardes de l'app sont lues même pour la build de retrait (avec D5, M5) | important |
| A2 | `scripts/launch.ts:743` | La garde des mots expliqués prend pour une ouverture de la production une ligne du journal qui décide autre chose : « words.json » se lit dans « game-words.json », une ouverture de l'aperçu ou une fermeture comptent | important |
| A3 | `scripts/launch.ts:722` | Le mandat D20.3, consommé, vaut encore pour sceller et ouvrir les mots, et la décision de l'éditeur est refusée (`--seal` écrit toujours « session ») ; même règle pour les cartes (`editorial.test.ts`) | important |
| A4 | `scripts/launch.ts:189` | L'empreinte de la page Confidentialité ne couvre que les phrases `privacy.*` : boutons d'effacement, hébergeur, contact, adresses de Cloudflare, champs gardés sur le téléphone changent sans nouvelle relecture | important |
| A5 | `scripts/launch.ts:257` | L'aperçu ne vérifie pas la ligne sur la couleur de la tortue, contrairement au code, à `PLAN-TORTUE.md` et à D17.26 | important |
| A6 | `scripts/launch.ts:160` | Le Worker des phrases est retenu en production par des gardes des seules pages (tortue, liste du jeu, page Confidentialité), contre D19.12 ; déjà arrivé (R40) | important |
| A7 | `scripts/launch.ts:472` | La date de la planche de la tortue n'a pas d'auteur : une session peut la redater, contre D17.24 ; de même la liste du jeu (B39) | important |
| A8 | `scripts/launch.ts:338` | La production accepte un modèle nommé que l'aperçu refuse (« ne garde rien ») — avec M4 | important |
| A9 | `scripts/launch.ts:402` | Une liste de un ou deux mots passe la garde ; la build cache alors le jeu et la tortue (D16.11) | important |
| A10 | `scripts/mascot2-kit.ts:119` | Le mouvement de la tortue suit les durées du site (`motion`), hors de son empreinte | antérieur |
| A11 | `scripts/mascot2-kit.ts:96` | Ses teintes servies viennent de `tokens.json` (`mascot-role`) ; l'empreinte les lit dans `palette.json` | antérieur |
| A12 | `scripts/mascot2-kit.ts:111` | L'empreinte lit la chorégraphie du module chargé, pas du dossier donné | antérieur |
| A13 | `scripts/launch.ts:600` | Jour UTC contre jour de Paris : entre minuit et 1 h (2 h l'été), une décision datée du jour est refusée, avec une mauvaise raison | mineur |
| A14 | `scripts/launch.ts:598` | « Une vraie date » : `Date.parse` accepte le 31 novembre (`isDay` existe) | mineur |
| A15 | `scripts/launch.ts:746` | Rien n'exige que le « oui » du relecteur précède l'ouverture, contrairement à trois textes | mineur |
| A16 | `scripts/launch.ts:718` | Une ligne de décision à lettre (D0.15b) est invisible à la garde des mots, et à cinq tests | mineur |
| A17 | `scripts/launch.ts:623` | PLAUSIBLE : au déploiement, la garde de l'accueil ne lit pas la ligne de décision (seul un test la lit) | mineur |
| A18 | `scripts/launch.ts:317` | PLAUSIBLE : `preview_mode: null` bloque la production, alors que tous les lecteurs le lisent comme absent | mineur |
| A19 | `scripts/launch.ts:464` | Une erreur de lecture d'un fichier de couleurs est rapportée comme une planche non validée | mineur |
| A20 | `scripts/launch.ts:767` | `npx tsx scripts/launch` (sans « .ts ») ne fait rien et sort en succès | mineur |
| A21 | `scripts/launch.ts:164` | Commentaires périmés ou mal placés (dont « avant la décision elle-même », après le lancement) | mineur |
- **Réfutés** : « session » comme relecteur de lignes de la page Confidentialité (voulu : D16.81, D17.26) ; la liste des vérifications du sceau (un journal, pas une condition) ; une nouvelle relecture après un mot changé (D20.22 ne la demande pas).

### 24 novembre 2026, dans la nuit — revue 12 : `scripts/build.ts`
- **20 constats** (10 importants, 2 antérieurs, 8 mineurs), tous confirmés sauf un plausible ; rien construit dans la copie de travail. **Effets de la revue** : avant qu'on la trouve, des builds de copies d'essai ont envoyé la télémétrie d'Astro ; liées au `node_modules` du dépôt principal, elles réécrivaient ses caches de Vite et d'Astro.

| # | Où | Constat | Gravité |
|---|---|---|---|
| T1 | `scripts/build.ts:233` | Une build morte à mi-course laisse un `dist/` partiel sous l'ancien marqueur, et le déploiement l'accepte ; ses fichiers serveur `.mjs` portent le chemin absolu de la copie de travail (D0.15) ; un `\| head` suffit à la tuer (avec D2, D12, M12) | important |
| T2 | `scripts/build.ts:173` | `npm run build:neutral`, la seule réponse prête à une demande de retrait de la charte (D14.12), sert un site sans échelle de texte, espacements, cibles ni mouvement | important |
| T3 | `scripts/build.ts:207` | Chaque build prévient Astro (télémétrie), avec un identifiant que tout le monde peut recalculer depuis le dépôt public | important |
| T4 | `scripts/build.ts:118` | Une option tapée sans `--` (`npm run build --holding`) construit la production en silence (jumeau de D1) | important |
| T5 | `src/holding/pages/mentions-legales/index.astro:7` | Depuis `ee3b797` (D21.18), la build de retrait lit `data/launch.json` et meurt sur une virgule de trop — une régression de ce soir | important |
| T6 | `scripts/build.ts:203` | Rien ne sérialise les builds : deux builds en même temps mêlent leurs fichiers sous un seul marqueur (même racine que M9) | important |
| T7 | `scripts/build.ts:49` | Chaque build réécrit deux fichiers suivis (`tokens.css`, `mascot2-tokens.css`) : deux builds proches se passent leurs couleurs | important |
| T8 | `scripts/build.ts:116` | (= M7) Le choix neutre n'est écrit nulle part ; un arbre neutre fait échouer `mascot2.test.ts` | important |
| T9 | `scripts/build.ts:237` | (= M8) Le marqueur dit comment, jamais à partir de quoi : construire, revenir en arrière, déployer passe les gardes à empreinte | important |
| T10 | `docs/discovery/14-risques.md:415` | La fiche 6 (réédition du programme) fait mettre la page de retrait, qui dit désormais « Ce site est retiré. » — question pour l'éditeur | important |
| T11 | `design/tokens.neutral.json:10` | Les routes documentées vers la charte neutre échouent (copie du fichier, fiche 2 du runbook) | antérieur |
| T12 | `scripts/build.ts:220` | Astro garde par erreur les entrées `g`, `i`, `t` de `dist/` à son nettoyage | antérieur |
| T13 | `scripts/build.ts:124` | Arguments lus à l'exact, sans refus : `--host=preview` construit l'apex (racine de U11) | mineur |
| T14 | `scripts/build.ts:175` | Le contrôle « sortie produite » ne teste que l'existence ; une police retirée part quand même | mineur |
| T15 | `scripts/build.ts:80` | Les erreurs de `checkEdition` ne nomment pas le fichier ; un `synonyms.json` cassé tue la build après le nettoyage de `dist/` | mineur |
| T16 | `scripts/build.ts:200` | Une build sans jeu (liste non attestée) ne le dit nulle part | mineur |
| T17 | `scripts/build.ts:246` | La dernière ligne ne dit pas si la build est neutre ou pour l'aperçu | mineur |
| T18 | `scripts/build.ts:43` | Commentaires périmés | mineur |
| T19 | `scripts/build-mode.ts:685` | Le refus de la build de retrait parle encore de deux pages | mineur |
| T20 | `src/holding/pages/mentions-legales/index.astro:10` | PLAUSIBLE : la page des mentions de la build de retrait est indexable — question pour l'éditeur | mineur |

### 24-25 novembre 2026, dans la nuit — revue 13 : `.github/workflows`
- **16 constats** (8 importants, 3 antérieurs, 5 mineurs) : 13 confirmés, 3 plausibles ; un réfuté (le Worker des phrases typé avec des liaisons qu'il n'a pas : `worker-runtime.test.ts` le fait tourner sans elles). Le balayage final n'a jamais rendu son texte. **Rien de tout cela ne touche le site en ligne.** Recensés ailleurs : M2/C4, C5, D11/C7, M16, D4/D16.

| # | Où | Constat | Gravité |
|---|---|---|---|
| G1 | `.github/workflows/watch.yml:72` | Dès qu'un signal d'aec2027.fr bouge, la veille ouvre un ticket « Veille R6 » chaque jour | important |
| G2 | `.github/workflows/watch.yml:40` | Une sortie en erreur (site injoignable, script de rappel qui plante) laisse la tâche au vert : le rappel du gel ou des mots peut ne jamais s'ouvrir sans que personne le voie | important |
| G3 | `.github/workflows/watch.yml:28` | PLAUSIBLE : une sonde d'aec2027.fr bloquée (aucune limite de temps) fait couper la tâche avant les rappels du gel et des mots | important |
| G4 | `.github/workflows/watch.yml:126` | Le rappel des faits datés des mots s'arrête pour de bon dès qu'un fait d'une échéance passée reste non relu | important |
| G5 | `.github/workflows/recrawl.yml:74` | Le rappel hebdomadaire (ticket n° 1) fait relever à la main la moitié des signaux ; `watch-source.ts --live` existe depuis le 12 novembre | important |
| G6 | `.github/workflows/watch.yml:100` | PLAUSIBLE : la recherche des doublons de GitHub compare des mots dans n'importe quel ordre : un ancien titre peut avaler un rappel | important |
| G7 | `.github/workflows/ci.yml:78` | « Worker startup budget » ne peut jamais échouer : aucun seuil | important |
| G8 | `.github/workflows/ci.yml:200` | Le contrôle de la build d'essai qui demande ne tourne jamais dans la CI | important |
| G9 | `scripts/watch-aec2027.ts:94` | Une erreur HTTP (403, 429, 5xx) est rapportée comme un changement d'aec2027.fr | antérieur |
| G10 | `scripts/check-no-ai-mention.test.ts:399` | PLAUSIBLE : une partie de la section « Quand tu demandes » n'est jamais contrôlée sur la build servie | antérieur |
| G11 | `scripts/watch-aec2027.ts:115` | Le signal du manifeste manque un balisage courant (`href` d'abord, adresse relative) | antérieur |
| G12 | `.github/workflows/ci.yml:6` | « Rien ne sort au-delà de `npm ci` » est faux : télémétrie de wrangler et d'Astro, navigateurs | mineur |
| G13 | `.github/workflows/ci.yml:1` | « Chaque porte » : le balayage du jeu, `e2e:gists` et `e2e:mascot2` ne tournent jamais en CI, et un seul moteur | mineur |
| G14 | `.github/workflows/ci.yml:170` | Quatre commentaires contredisent le code (l'un dit qu'une question est envoyée) | mineur |
| G15 | `.github/workflows/watch.yml:3` | « Le re-crawl est hebdomadaire et marche » : aucun workflow ne crawle depuis `a2e6003` | mineur |
| G16 | `.github/workflows/recrawl.yml:26` | Du français dans le code : « lundi », `rappel`, `/tmp/rappel.md` | mineur |

### 25 novembre 2026, dans la nuit — revue 14 : `scripts/seed-ask-2026.ts`
- **22 constats** (14 importants, 1 antérieur, 7 mineurs) : 21 confirmés ou plausibles, un du balayage ; deux réfutés. Toutes les reproductions sur des données inventées, avec un `npx` de substitution qui ne faisait que noter ses arguments : aucun `private/`, rien vers Cloudflare. **Rien ne s'est produit** : l'outil ne tourne que sur la machine de l'éditeur, et seulement avec `--remote` et l'accord du jour.

| # | Où | Constat | Gravité |
|---|---|---|---|
| E1 | `scripts/seed-ask-2026.ts:806` | Une option de mode mal tapée (`--switch=stopped`, `--withdraw`, `--gist`) dépose tout le texte du livre dans la base de production — y compris depuis la commande d'arrêt documentée, qui porte l'accord du jour | important |
| E2 | `scripts/seed-ask-2026.ts:461` | Redéposer les phrases depuis une copie sans fichier des verdicts efface les 1 069 phrases, chaque contrôle dit « passé » | important |
| E3 | `scripts/seed-ask-2026.ts:759` | Deux modes sur une ligne, ou `--check` et `--dry-run`, font en silence autre chose : la fiche 8 tapée d'une ligne rouvre sans rien déposer | important |
| E4 | `scripts/seed-ask-2026.ts:767` | `--switch open` rouvre les phrases sans accord daté, alors que l'en-tête promet que rien ne part sans lui — question pour l'éditeur | important |
| E5 | `scripts/seed-ask-2026.ts:726` | Quand l'arrêt d'urgence échoue, l'erreur est cachée et la commande proposée lit la base locale | important |
| E6 | `scripts/seed-ask-2026.ts:834` | `--remote=<base>`, ou `--remote` en dernier, n'envoie rien et sort en succès sans le dire | important |
| E7 | `scripts/seed-ask-2026.ts:838` | Tapé sans « .ts », l'outil ne fait rien et sort en succès — la commande d'arrêt comprise | important |
| E8 | `scripts/seed-ask-2026.ts:745` | PLAUSIBLE : `--env preview` agit sur la base de production (une base pour tous les hôtes), et affiche « (preview) » | important |
| E9 | `scripts/seed-ask-2026.ts:554` | Réexporter les phrases du jeu sans répéter `--link-only` défait les cinq cartes de D19.20 et D19.21 et efface sa validation | important |
| E10 | `scripts/seed-ask-2026.ts:598` | Un identifiant répété dans `--link-only` efface sa validation du fichier du jeu | important |
| E11 | `scripts/seed-ask-2026.ts:221` | Le retrait du site laisse les 1 069 phrases chez Cloudflare, alors que la base est promise vidée au retrait (D16.6) | important |
| E12 | `scripts/seed-ask-2026.ts:596` | Le fichier du jeu dit toujours « écrites par une IA, lues par personne », quel que soit l'auteur | important |
| E13 | `scripts/seed-ask-2026.ts:602` | Sa validation du fichier du jeu survit à un changement de son titre ou de sa note | important |
| E14 | `scripts/seed-ask-2026.ts:175` | Un caractère NUL dans une proposition ferait afficher un morceau du livre dans le terminal | important |
| E15 | `docs/discovery/09-architecture.md:614` | La fiche 8 arrête une phrase fausse par l'interrupteur de la base, mais 43 phrases sont dans le fichier du jeu, qu'aucun interrupteur n'atteint | antérieur |
| E16 | `CLAUDE.md:47` | `--switch open\|stopped [--what ask\|gists]` : `--what` est obligatoire, `ask` a disparu | mineur |
| E17 | `scripts/seed-ask-2026.ts:669` | « NOT added to the repository » : le fichier du jeu est suivi depuis D19.22 | mineur |
| E18 | `scripts/seed-ask-2026.ts:507` | Un dépôt n'affiche jamais l'empreinte que `ask.json` doit noter | mineur |
| E19 | `scripts/seed-ask-2026.ts:5` | Des commentaires disent que l'éditeur a lu les phrases | mineur |
| E20 | `scripts/seed-ask-2026.ts:425` | Un commentaire de documentation posé sur le mauvais symbole | mineur |
| E21 | `scripts/seed-ask-2026.ts:324` | Des jours de lecture impossibles passent (`isDay`) | mineur |
| E22 | `scripts/seed-ask-2026.ts:532` | PLAUSIBLE : le compte des phrases qui écrivent le mot de leur carte se trompe pour -al/-aux | mineur |

### 25 novembre 2026, dans la nuit — le lot des « rails », premier temps : ce qui pouvait faire du tort
- **Télémétrie** (T3, G12) : `scripts/quiet-env.ts` donne à chaque commande que nos scripts lancent `ASTRO_TELEMETRY_DISABLED=1` et `WRANGLER_SEND_METRICS=false` (`build.ts`, `deploy.ts` par `guardedEnv`, `seed-ask-2026.ts`) ; `package.json` les écrit devant `astro dev`, `astro preview`, `astro check` et `wrangler types` ; la CI les pose pour tous ses travaux, et son en-tête dit enfin ce qui sort. Une porte, `scripts/telemetry.test.ts`, refuse un lancement d'astro ou de wrangler qui ne les porte pas.
- **Le retrait ne lit plus rien de l'app** (D5, A1, M5) : pour une build de retrait, `deploy.ts` ne calcule plus aucune garde de l'app (`withdrawalContext`) ; sa page des mentions lit la date de déclaration LCEN dans le texte de `launch.json` (T5, la régression de D21.18). **Prouvé en vrai** : `scripts/withdrawal.test.ts` lance `deploy.ts` sur une build de retrait dans un arbre où chaque fichier de l'app est cassé (wrangler remplacé par une doublure, `--dry-run` en plus) — l'ancien `deploy.ts` y meurt, le nouveau passe ; et `npm run build:holding` passe avec une virgule de trop dans `launch.json`.
- **Une build interrompue ne part plus** (D2, T1, D12) : la build retire le marqueur précédent avant de commencer et n'écrit le sien, `complete`, qu'à la fin ; `deploy.ts` refuse un `dist/` sans marqueur fini, et tout fichier serveur (`.mjs`, `chunks/`, `pages/`) ou chemin de la machine dans ce qui part (`distLeftovers`, D0.15). **Une build faite pour l'aperçu ne part plus en production** (D11, C7 : l'hôte du marqueur est lu).
- **Les options avalées par npm** (D1, T4, T13, U11) : `npm run deploy --dry-run` ne déploie plus pour de vrai (`npm_config_dry_run` est lu) ; `build.ts` lit ses arguments strictement (`parseArgs`) : une option inconnue, `--tokens=neutral`, un mot seul — ce que npm 11 laisse de `npm run build --host preview` — ou une option avalée l'arrêtent avant qu'il ne touche à rien. Constaté : npm 11 n'exporte plus les options inconnues, seulement un avertissement.
- **L'outil de la base** (E1 à E10, E13, E14, E16) : un mode par commande, lu strictement (`readCommand`) ; **le dépôt du texte du livre a son mode à lui, `--text`, et plus aucune commande, même mal tapée, n'y retombe** ; `--switch open` exige l'accord du jour, `stopped` jamais ; un redépôt des phrases qui en laisserait moins que le dépôt noté dans `ask.json` est refusé sans `--fewer` ; l'arrêt d'urgence qui échoue dit ce que wrangler a répondu ; « (preview) » ne s'affiche plus (une seule base pour tous les hôtes) ; l'outil tapé sans « .ts » agit ; un NUL est refusé par son identifiant, sans citer le livre ; l'export des phrases du jeu garde les cinq cartes de ses décisions quand `--link-only` n'est pas écrit, refuse un identifiant répété et un titre ou une note changés depuis sa validation. `CLAUDE.md` décrit les modes.
- **Laissé à un autre temps** : E11 (vider la base au retrait : une question pour l'éditeur), E12 (qui a écrit et lu les phrases du jeu, à tirer des verdicts), E15 (la fiche 8 et les phrases du jeu).

### 25 novembre 2026, dans la nuit — le lot des « rails », deuxième temps : les gardes (revues 10 et 11)
- **Le journal des décisions se lit par ses colonnes** (`decisionRows`) : une marque ne compte qu'en tête du statut de sa ligne ; une ligne à lettre (D0.15b) est une ligne (A16) ; le jour est celui de Paris, comme le journal le date (A13) ; un jour est un vrai jour (`isDay`, A14).
- **Les mots expliqués** : le mandat D20.3 vaut jusqu'au jour où il a été consommé (19/11/2026, D20.22), plus après — un sceau ou une ouverture est désormais à l'éditeur seul (A3). L'ouverture nomme sa décision (`decided_in` : D20.22 pour celle de la production), sur son jour, dans la colonne de son auteur, et cette ligne nomme `data/2026/words.json` — plus une ligne qui ne parle que de `game-words.json`, de l'aperçu ou d'une fermeture (A2).
- **Son « oui » de l'accueil, la planche de la tortue et la liste des mots du jeu** sont chacun tenus à sa ligne de ce jour-là, lue au déploiement (A17, A7, B39) : D19.24, D17.24 et D19.18 les tiennent tels qu'ils sont.
- **Le Worker des phrases n'est tenu que par les gardes du chat**, plus par celles des pages (A6 : une retouche de la tortue ou une ligne de la page Confidentialité retenait un correctif, comme celui de R40) ; **la production exige tout ce qu'exige l'aperçu** : le dossier légal du chat et, si un modèle est nommé, un modèle qui ne garde rien (A8, M4).
- **L'aperçu est tenu à la ligne de la page Confidentialité sur la couleur de la tortue** (A5). Une liste du jeu de moins d'une manche est refusée avec le seuil même de la build (A9) ; `preview_mode: null` se lit comme absent (A18) ; un fichier de la tortue illisible est nommé (A19) ; `launch.ts` sans extension agit (A20).
- **Après le lancement**, un refus ne dit plus de remettre la page d'attente : c'est le retrait, la décision de l'éditeur (M1). **La build « scrutin » n'est plus retenue par la garde des mots** (M2) ; celle de l'accueil la retient encore : avant son « oui », elle porterait le nouvel accueil (D19.12).
- **Sur les fichiers du dépôt, toutes les gardes sont vides** : la production, l'aperçu et le Worker des phrases restent déployables. Un vrai déploiement à blanc de l'apex passe, sans bannière de télémétrie.

### 25 novembre 2026, dans la nuit — le lot des « rails », troisième temps : les workflows (revue 13)
- **La veille d'aec2027.fr et les deux rappels sont deux tâches** : un hôte qui ne répond jamais ne peut plus emporter les rappels du gel et des mots (G3) ; chaque requête de la veille abandonne après 20 s ; **une sonde qui n'a pas pu faire son travail met sa tâche au rouge** au lieu de passer pour « rien à signaler » (G2).
- **Une page d'erreur d'aec2027.fr est « injoignable », jamais « le site a changé »** (G9) ; un seul ticket de veille ouvert à la fois, qui dit de reporter les nouvelles valeurs dans `REFERENCE` (G1) ; le manifeste se lit dans tout balisage (G11). **Les rappels « une fois par fenêtre » et « une fois par échéance » comparent le début du titre à la lettre** (G6) ; celui des mots porte la dernière échéance (G4).
- **Le rappel hebdomadaire mène à `npm run watch:source -- --live`** (G5) ; ses identifiants sont en anglais (G16). Le ticket n° 1, publié avec l'ancien texte, n'est pas touché : c'est un geste sur le dépôt public.
- **CI** : le budget de démarrage est jugé sur le profil (`scripts/startup-budget.ts`, 400 ms ; mesuré 25,8 ms) (G7) ; le contrôle de la build d'essai qui demande tourne (G8) ; le balayage des cartes du jeu, les figures de la tortue et le bureau de lecture y entrent (G13) ; quatre commentaires disent ce que fait le code (G14) ; la section « Quand tu demandes » se contrôle aussi sur la page servie (G10).

### 25 novembre 2026, vers 1 h — ses réponses (D21.36 à D21.39)
- **Le retrait efface aussi les phrases de la base** (D21.36, E11) : `seed-ask-2026.ts --withdraw-gists --remote cestecritla-ask --accord <jour UTC>`, troisième geste de la fiche 9 ; elles restent sous `private/gists/`. Prouvé dans le moteur du Worker : après l'effacement, toute route répond « local », et rouvrir l'interrupteur ne ramène rien sans un nouveau dépôt.
- **Une réédition a sa page** (D21.37, T10) : `npm run build:update`, son texte — « L'Avenir en commun a été réédité. Ce site se met à jour. » ; la fiche 6 la prescrit. Construite, non indexée, acceptée à blanc par le déploiement ; la page du retrait dit toujours « Ce site est retiré. ».
- **L'empreinte de la planche de la tortue couvre ce qui, du site, joue et se voit en elle** (D21.38, A10, A11) : les durées et courbes que sa feuille nomme, ses teintes telles que servies. Vérifié avant de la réécrire : les durées n'ont pas bougé depuis le 15 novembre, et les teintes servies, ajoutées treize minutes après la date de la planche, sont celles de la palette validée (un test tient l'égalité). Nouvelle empreinte `ce34effcbfab…`, sous ses dates du 15 novembre ; planche régénérée par son outil ; mesure de son mouvement refaite (`npm run e2e:mascot2:motion -- --write`).
- **La télémétrie d'Astro et de wrangler est coupée dans les réglages de sa machine** (D21.39) : fait, et lu dans les deux fichiers de configuration.
- **L'empreinte qui date la relecture de la page Confidentialité couvre tout ce que la page peut dire** (A4) : ses phrases `privacy.*`, toute autre phrase du kit que ses sources affichent (la confirmation de « Tout effacer », l'hébergeur, le contact…), et les octets de ses sources — le gabarit de la page, celui de « Tout effacer », la carte de ce que garde le téléphone (`privacyPageHash`). Ce que la page dit n'a pas changé : l'empreinte est réécrite sous la date de ses réponses du 24 novembre (D21.28, D21.30).

### 25 novembre 2026, dans la nuit — le lot des « rails », quatrième temps : le déploiement et les ponts de `/r/`
- **Le Worker des phrases n'est déployé ni retiré que sous son propre nom** : le nom que wrangler donnerait à l'environnement de l'aperçu est lu là où il le lit (D9), et un déploiement — à blanc compris — refuse une configuration qui nommerait le Worker des pages (M3).
- **Le fichier des phrases du jeu doit être celui de `origin/main`**, plus seulement commité (D8 : un commit d'une branche de copie de travail passait). Une option écrite deux fois (D13) et `--outdir` hors d'un essai à blanc (D14) sont refusés ; un `npx` qui ne démarre pas le dit (D15) ; **un retrait des pages rappelle les gestes qui restent** : le Worker des phrases répond tant qu'il n'est pas arrêté, retiré, et sa base vidée (D7, D21.36).
- **Les 87 mesures clés de 2025 ont leur pont sous `/r/`** (M6) : `/r/c6-s01-k01/` et `/r/c8-s02-k01/`, deux des huit liens envoyés le 9 septembre, répondaient 404 depuis la réédition. Une route sœur (`src/pages/r/[...old].astro`) sur le modèle de `/m/` : même page de pont, non indexée, sans rien citer ; nos réponses gardent leurs adresses. **C'est un changement de ce que sert le site : il attend l'aperçu puis la production, son accord du moment.**

### 25 novembre 2026, 1 h 40 — les ponts de `/r/` en production (D21.40) ; le ticket n° 1 fermé (D21.42)
- **En ligne, sur sa réponse « Aperçu puis production »** : commit `4711260`. Aperçu à 1 h 39 (0 h 39 UTC), Worker `cestecritla-preview` version `156e956c` ; production à 1 h 40 (0 h 40 UTC), Worker `cestecritla` version `bb1a67ba` ; le Worker des phrases n'est pas touché. **Premier déploiement sous les nouvelles gardes du lot des « rails »** : marqueur fini, aucun reste de build ni chemin de la machine, hôte du marqueur, fichier des phrases du jeu égal à `origin/main` — tout tenu, sans bannière de télémétrie.
- **Vérifié en ligne** : sur les trois hôtes, 1 398 fichiers sur 1 401 identiques à la build, les trois écarts connus (sur l'aperçu, le premier passage a vu quelques ponts encore en 404 : la propagation ; rejoué une minute plus tard, tout y est) ; `/r/c6-s01-k01/` et `/r/c8-s02-k01/`, les deux liens de septembre, répondent 200 ; sonde de « Demander », un moteur à la fois : 45 « ok » sur chaque hôte. Avant le déploiement, dans le dépôt principal : l'anti-fuite complète (9 sur 9, 1 397 fichiers construits) et toute la suite unitaire (731 passés, un sauté : la build sans jeu).
- **Retour arrière, sa décision** : l'étiquette locale `prod-avant-ponts` (`cbab91d`), fiche 14 du runbook.
- **Le ticket n° 1** (le rappel du 23 novembre, à l'ancien texte) est fermé avec une ligne qui mène à `npm run watch:source -- --live` (D21.42). **Les mentions légales des builds d'attente ne sont plus indexées** (D21.41) — rien de servi aujourd'hui : elles ne paraissent qu'au retrait ou à une réédition.

### 25 novembre 2026, dans la nuit — le lot des « rails », cinquième temps : ce qui part est ce qui est commité, une build à la fois
- **Une build sans le jeu ne part que si la fiche 9 le dit, ou en build « scrutin »** (C4, D6, A9, M11 ; commit `8c344bc`) : le jeu n'est pas facultatif (D16.11), et deux builds n'en montrent légitimement aucun — la build « scrutin », par la loi (D16.16), et celle de la fiche 9, qui retire un mot après une capture jusqu'à ce que l'éditeur revalide la liste. Elles étaient retenues par ce que seul le jeu publie (sa liste, la planche de la tortue) : le geste même de la fiche 9 était refusé depuis le lancement. La build « scrutin » ne l'est plus ; celle de la fiche 9 part quand l'opérateur dit que c'est ce geste-là, `npm run deploy -- --without-game` — une liste cassée par accident a la même allure, et enverrait la production sans la tortue. Un `dist/` sans le jeu, là où une build du jour le montrerait, est refusé (M11).
- **Ce qui part est ce qui est commité** (M8, T9 ; commit `0064efe`) : le marqueur dit de quoi `dist/` est construit — le commit, et si un fichier suivi en différait. Une build de l'app ne part que d'un arbre propre au moment de la build, du commit toujours extrait, sans rien de changé depuis : « build, retour en arrière, déploiement » passait toutes les gardes qui lisent les fichiers du jour, et envoyait des mots qu'aucune garde n'avait lus. Le retrait en est exempté (son propre geste modifie `data/launch.json` juste avant), un essai à blanc n'envoie rien.
- **Une build ou un déploiement à la fois** (T6, M9) : un verrou dans `build/.lock`, pris par la build de `dist/` et par le déploiement, rendu à leur sortie ; un verrou laissé par un processus disparu est repris. Deux builds dans `dist/` à la fois mêlaient leurs fichiers sous un seul marqueur ; une build lancée pendant un envoi en envoyait la moitié. `scripts/withdrawal.test.ts` lance le déploiement pour de vrai contre les deux : refusé, rien demandé à wrangler.

### 25 novembre 2026, dans la nuit — le lot des « rails », sixième temps : la build neutre (T2, T7, T8, T11, M7)
- **La build neutre construit un site entier** (T2 ; commit `870cd18`) : la seule réponse prête à une demande de retrait de la charte (D0.17, D14.12) était construite du seul `design/tokens.neutral.json`, sans échelle de texte, espacements, cibles ni mouvement, toutes les portes vertes. Ses couleurs se posent désormais par-dessus le reste de la charte (`neutralTokens`), et la seule propriété qui lui manquait, `--color-charbon`, lui est donnée.
- **Elle laisse l'arbre comme il était** (T7) : elle écrivait par-dessus les deux feuilles de couleurs suivies — un arbre neutre dont héritait toute build suivante, et que le déploiement, qui refuse maintenant un arbre modifié, aurait refusé. Ses feuilles vont dans `build/neutral/`, non suivi, importées par un alias que choisit `CEL_TOKENS` (`astro.config.ts`) ; celles de la charte ne sont réécrites que si leurs octets changent. **Le marqueur dit `tokens: neutral`, et le déploiement l'annonce** (« NEUTRAL COLOURS », T8, M7).
- **Une porte** : `scripts/tokens-coverage.test.ts` tient que chaque propriété que le site lit sans repli a une valeur dans les deux jeux. La note du fichier neutre et la fiche 2 du runbook disent comment la construire — `npm run build:neutral && npm run deploy` —, et que **chaque build suivante doit être neutre tant que le rebrand tient** : une build ordinaire remet la charte (T11, M7).
- **Vérifié** : build neutre, a11y sur la build neutre (252 contrôles, aucun échec) ; build de la charte, tests (729), contraste, lint, typage, a11y, e2e et figures de la tortue dans trois moteurs ; **la build de la charte reste identique à la production**, fichier pour fichier (1 398 sur 1 401, les trois écarts connus) : l'alias ne change rien de ce qui est servi.

### 25 novembre 2026, dans la nuit — revue 15 : `scripts/gists-2026.ts`
- **28 constats** (8 importants, 1 antérieur, 19 mineurs) : les 23 candidats des relecteurs tous retenus au vote (20 confirmés, 3 plausibles), 4 du balayage, un dédoublé. Tout sur des copies de HEAD et un livre inventé : aucun `private/`, aucun réseau, wrangler jamais lancé. **Presque tout est latent** : la base ne tient plus le texte depuis le 15 novembre, aucun modèle n'écrit plus, et le bureau de lecture est vide tant que les 1 069 verdicts tiennent. **Jouait aujourd'hui** : H1 (une liste `--link-only` écrite avec une espace défaisait encore quatre des cinq cartes de D19.20 et D19.21), H24, H17, H13 (déjà arrivé : deux lignes du registre des neurones hors de tout tableau).

| # | Où | Constat | Gravité |
|---|---|---|---|
| H1 | `scripts/gists-2026.ts:1692` | La ligne de commande accepte tout : un essai à blanc mal tapé écrit pour de vrai, une liste `--link-only` à espace ne garde que son premier mot (avec E1, E3, E6, E9) | important |
| H2 | `scripts/gists-2026.ts:1186` | Au bureau de lecture, une touche de verdict tenue enfoncée tranche aussi les mesures suivantes, chacune au nom de l'éditeur | important |
| H3 | `scripts/gists-2026.ts:1183` | Les raccourcis tranchent le bloc encadré, pas celui que l'éditeur a sous les yeux ou sous le focus | important |
| H4 | `scripts/gists-2026.ts:391` | `--write` compte zéro neurone pour un juge coupé ou sans coût : le budget est dépassé, le registre sous-compté (même famille que W6) | important |
| H5 | `scripts/gists-2026.ts:1388` | Après « Revenir », choisir « Fidèle » sur la phrase gardée avant est refusé, et la mesure disparaît | important |
| H6 | `scripts/gists-2026.ts:1621` | Le bureau et `--take` acceptent une phrase que le dépôt refuse ensuite ; la mesure ne revient plus, le dépôt entier échoue | important |
| H7 | `scripts/gists-2026.ts:1615` | `--take` remplace les verdicts de l'éditeur par ceux de la session, son « lien seul » compris | important |
| H8 | `scripts/gists-2026.ts:975` | Après une réédition, une mesure nouvelle ou reformulée n'apparaît sur aucune page du bureau | important |
| H9 | `scripts/gists-core.ts:323` | Une dernière ligne coupée d'un fichier de verdicts casse tout le fichier à l'écriture suivante | antérieur |
| H10 | `scripts/gists-2026.ts:595` | Un juge qui répond hors des trois étiquettes est pris pour muet : « l'allocation gratuite est épuisée », à tort | mineur |
| H11 | `scripts/gists-2026.ts:550` | Un appel facturé dont la réponse nomme un autre corpus compte zéro | mineur |
| H12 | `scripts/gists-2026.ts:1781` | Une session `--write` interrompue n'écrit pas sa ligne au registre des neurones | mineur |
| H13 | `scripts/gists-2026.ts:1785` | La ligne écrite au registre n'est pas une ligne de son tableau (déjà arrivé : lignes 178-179) | mineur |
| H14 | `scripts/gists-2026.ts:522` | `--write` croit un verdict sur son épingle seule, quand les autres modes le passent au contrôle du jour | mineur |
| H15 | `scripts/gists-2026.ts:168` | Les phrases gardées dans `runs.jsonl` ne passent jamais le contrôle du jour | mineur |
| H16 | `scripts/gists-2026.ts:1724` | `--status` juge les verdicts sur le texte de la machine, quelle que soit sa version | mineur |
| H17 | `scripts/gists-2026.ts:552` | Depuis le retrait du texte, `--write` dit « pas à la version du manifeste » au lieu de « le texte est retiré » | mineur |
| H18 | `scripts/gists-2026.ts:426` | Deux arrêts disent « l'allocation gratuite est épuisée » quand aucune allocation n'a été refusée | mineur |
| H19 | `scripts/gists-2026.ts:723` | Le tableau des juges compte un « lien seul » de la session comme un refus de l'éditeur | mineur |
| H20 | `scripts/gists-2026.ts:1404` | Une correction au bureau perd la trace de ce qu'elle corrige | mineur |
| H21 | `scripts/gists-2026.ts:1185` | La touche c remplace une correction en cours par la première phrase | mineur |
| H22 | `scripts/gists-2026.ts:848` | La raison donnée pour une lettre visible refusée est fausse | mineur |
| H23 | `scripts/gists-2026.ts:1172` | Sur un clavier AZERTY, les chiffres du bureau ne marchent qu'avec Maj | mineur |
| H24 | `scripts/gists-2026.ts:1899` | Tapé sans « .ts », l'outil ne fait rien et sort en succès (motif de E7, A20) | mineur |
| H25 | `scripts/gists-2026.ts:1670` | PLAUSIBLE : une redirection 307/308 renverrait la clé du banc ailleurs | mineur |
| H26 | `scripts/gists-2026.ts:1258` | Le bureau, la seule page qui montre le livre, ne refuse ni le correcteur en ligne ni la traduction du navigateur | mineur |
| H27 | `scripts/gists-2026.ts:4` | Des commentaires disent que l'éditeur a lu les phrases (avec E19, W11) | mineur |
| H28 | `scripts/gists-2026.ts:869` | Les étiquettes des juges sont des mots français dans le code — question pour l'éditeur, comme B52 | mineur |

- **Corrigé** (commit `b9f20e0`) :
  - **La ligne de commande se lit strictement** (H1, H24) : un mode, les options de ce mode, « --option valeur » et jamais « --option=valeur » ; chaque mode a son essai à blanc et l'autre est refusé (`--take` prend `--dry-run`, `--sql` et `--game` prennent `--check`) ; `--link-only` prend des identifiants séparés par des virgules, rien d'autre ; sans « .ts », l'outil agit.
  - **Le compte des neurones** (H4, H10, H11, H18) : le Worker dit, pour chaque juge, ce que son registre garde de lui — son coût, sa réservation quand l'appel a été coupé ou son coût inconnu (`kept`, `src/worker/index.ts`) ; l'outil le compte. Un appel qui a tourné sur un autre corpus est compté. Un juge qui répond une étiquette illisible a répondu. Les arrêts « pas de réponse » ne disent plus que l'allocation est épuisée.
  - **Le registre des neurones** (H12, H13) : la ligne ajoutée est une ligne de son tableau — huit cellules, l'heure, la virgule —, après la tête du tableau quand le fichier finit sur de la prose ; une session interrompue (Ctrl+C, une erreur) écrit ce qu'elle a compté. Les lignes de quatre cellules déjà écrites (le 13 et le 14 novembre) ont reçu leur tête de tableau : elles se lisent comme des lignes.
  - **Ce que l'outil croit** (H14, H15, H16, H17) : `--status` et `--write` passent verdicts et phrases au contrôle du jour, là où le livre est à la version du manifeste ; une phrase de `runs.jsonl` refusée aujourd'hui reste montrée au bureau, pour être corrigée, mais n'est plus comptée « écrite » et ne retient plus la consigne suivante ; depuis le retrait du texte, `--write` dit que la base ne tient plus le livre, et que l'y remettre est l'accord de l'éditeur. La clé du banc ne suit aucune redirection (H25).
  - **Le bureau de lecture** (H2, H3, H5, H20 à H23, H26) : une touche tenue enfoncée ne tranche qu'une fois ; les touches tranchent le bloc où est le focus, et ramènent d'abord à l'écran un bloc qui n'y est pas ; les chiffres se lisent par leur place sur le clavier (« & » sur un AZERTY), les lettres quel que soit le verrouillage ; « c » ne remplace jamais ce qui a été tapé ; après « Revenir », la phrase gardée avant reste offerte ; une correction garde la trace de ce qu'elle corrige, la session comprise ; la boîte n'appelle aucun correcteur en ligne, la page refuse la traduction du navigateur ; la raison d'un refus pour une lettre visible est juste.
  - **Ce que le dépôt refuserait est refusé avant** (H6) : la phrase d'une autre mesure, mot pour mot, ou des mots du livre à la suite — au bureau, avec sa raison, et à `--take`, tout ou rien.
  - **`--take` ne remplace jamais un verdict de l'éditeur** (H7) : il les laisse comme il les a rendus et les nomme. C'est la lecture prudente de D16.76 — le mandat consommé, ses accords redeviennent les siens — ; il peut en décider autrement. **Aucun verdict de lui n'existe aujourd'hui.**
  - **`--unwritten` montre toute mesure sans verdict qui tienne et sans rien à lire** (H8) : depuis que les rédacteurs se sont arrêtés (D16.58) et que le texte a quitté la base, personne d'autre ne peut être sollicité.
  - **Une ligne n'est jamais collée à une ligne coupée** (H9) : une dernière ligne entière sans retour est fermée, une ligne coupée est retirée (tous les lecteurs l'ignoraient déjà) ; `--take` écrit en une fois. **Le tableau des juges ne compte que la lecture de l'éditeur** (H19). **Les commentaires** ne disent plus que l'éditeur a lu les phrases, ni que le fichier du jeu n'est pas suivi (H27).
- **Laissé, avec sa raison** : H28 — les étiquettes `fidele`, `ajout`, `ecart` sont des valeurs que le modèle juge écrit, comme les clés `texte` et `phrases` de D21.33 : la question est pour l'éditeur, dans le prochain lot de questions ; leur chemin est fermé (aucun juge ne tourne). Le même format de ligne du registre et la même redirection suivie dans `bench-ask.ts` et `bench-explain.ts` sont hors du périmètre (le banc a conclu, D16.33).
- **Vérifié** : les tests de l'outil (43), du Worker et de son registre, la suite entière, le typage, le lint ; la porte de navigateur du bureau dans trois moteurs (37 contrôles chacun, dont sept nouveaux : la touche tenue, deux fois, le « & » d’un AZERTY, la lettre verrouillée, le focus, deux fois, la touche c) ; la build d'essai de la feuille et sa sonde.

### 25 novembre 2026, au matin — les constats mineurs des revues 9 à 14, corrigés
- **`build.ts`** (T12, T14 à T19 ; M12 à M14 ; commit `3ec5e3c`) : la build vide sa sortie elle-même — Astro gardait, par une erreur à lui, toute entrée de premier niveau nommée g, i ou t ; `public/fonts` ne tient que les polices publiées, et `dist/` exactement celles-là ; un fichier publié qui ne se lit pas est nommé avant qu'on touche à `dist/` ; la build dit si le jeu y est, et sa dernière ligne dit l'hôte, les couleurs et la sortie ; les commentaires et les refus disent le site lancé (trois pages d'attente, la fiche du retrait, la commande de build de l'hôte).
- **La garde de déploiement** (M10, M15 à M19 ; commit `bb47693`) : un fichier `.env*`, que wrangler lit de lui-même, ne peut plus ouvrir la garde ni renommer la cible, et `WRANGLER_CI_*` et `CLOUDFLARE_ENV` ne passent plus à wrangler ; une build d'attente envoyée à l'aperçu prévient de R27 ; un identifiant de base vide n'en est pas un ; un BOM n'est pas un caractère ; **la politique de citation ne tient qu'avec les plafonds que l'éditeur a validés (D15.18, avec l'affichage de D16.32 : les deux seuls changements du fichier), un vrai jour passé** ; jamais de `wrangler rollback` dans une fenêtre de silence (R41, fiches 7 et 13).
- **L'outil de la base** (E12, E15, E17 à E22 ; commit `2c932b9`) : le fichier du jeu ne dit « écrites par une IA, lues par personne » que tant que c'est vrai ; la fiche 8 dit comment arrêter une phrase du jeu ; un dépôt dit son empreinte ; un jour de lecture qui n'existe pas est refusé ; « locaux » compte pour « local ».
- **La build « scrutin » et les builds d'essai** (C5, C6, Q4, Q16, Q17 ; commit `5707de5`) : toutes les portes qui lisent `dist/` jugent la build « scrutin » pour ce qu'elle est, et la CI la construit, la passe par ces portes et en fait un déploiement à blanc ; une feuille qui offre l'explication d'un modèle est une build d'essai tant que le fichier n'en nomme aucun ; **une référence de couleur qui ne nomme rien arrête la build** — depuis `870cd18`, la build neutre publiait `{color.violet-200}` telle quelle, et perdait `--duration-fast` (le petit bond de la tortue) : le jeu neutre a son ombre, dans sa palette (`relief`). Rien de servi : la build neutre n'est pas en ligne.

### 25 novembre 2026, au matin — ses réponses (D21.43 à D21.45)
- **Le début de « exil fiscal » est reformulé, validé mot pour mot** (D21.43, N4 ; commit `13e1df6`) : « Le programme crée la taxe Zucman : un impôt plancher de 2 % du patrimoine pour chaque centimillionnaire. » ; sa plus longue suite commune avec les mesures citées : quatre mots. **Un changement de ce que sert le site** (la page `/r/exil-fiscal/`, l'accueil, le fichier de « En clair ») : il partira avec son accord de déploiement.
- **Les plafonds de poids restent en gzip -9, et c'est écrit** (D21.44, Q1) : `design/perf-budget.md` dit ce que Cloudflare envoie (brotli 4, zstd 3 : 2 à 8 % de plus) et les quatre fichiers qui dépasseraient mesurés ainsi.
- **L'exception de D21.33 couvre les étiquettes des juges** (D21.45, H28).

### 25 novembre 2026, au matin — la porte anti-fuite (revue 16), corrigée
- **Commit `7d64613`** : un signe seul compte pour le mot que la politique compte (N4) ; seuls les vraies balises et les commentaires sont retirés, chaque message de commit est lu seul (N1) ; **les fichiers des commits pas encore poussés et l'index sont lus tels que committés** (N2) ; le test des phrases lit aussi les messages, toutes les formulations gardées, une copie échappée, et chaque phrase doit pouvoir être trouvée (N3, N7, N8, N14, N15) ; les pages lues sont une build finie de l'app (N6) ; ce qui n'est pas lu est dit, ce qui ne se décode pas est un constat (N12, N18) ; les chemins privés viennent de leurs écrivains (N22, N23, N24) ; le `meta` du fichier du jeu est lu à toute profondeur, les commentaires disent ce que sont les fichiers (N16, N25). **Le contrôle de nos phrases garde son propre découpage**, mesuré sans les signes seuls : la porte du dépôt est la plus stricte des deux.
- **Restent** : N5 (les attributs des pages), N9 (le seuil de la moitié), N10 (JSON-LD), N11 (les mesures citées hors de leurs pages), N13 (`data/2026` en CI), N17 (les formulations d'avant une réédition), N19 à N21 (les échappements, l'ellipse, les validateurs).

### 25 novembre 2026, au matin — revue 16 : `scripts/leak.test.ts`
- **25 constats** (17 importants, 3 antérieurs, 5 mineurs), 2 candidats réfutés ; reproduits sur du texte inventé, le corpus libre de 2025 ou les 43 phrases publiques du jeu : aucun `private/` ouvert, les deux tests de contenu sautent dans la copie de travail. **Un cas réel, pour l'éditeur** : la description et l'og:description de `/r/exil-fiscal/` — le début de notre réponse `rip-16`, validé mot pour mot (D21.10) — reprennent **neuf mots de suite** de la mesure citée p2c2-s02-m03 (« … 2 % … » : le balayage des aperçus compte huit jetons, parce qu'il efface le « % » seul) ; **vérifié par la session, en comptant seulement** : 9 mots, la production sert la même page. C'est le cas des trois débuts reformulés de D21.21.

| # | Où | Constat | Gravité |
|---|---|---|---|
| N1 | `scripts/leak.test.ts:316` | Le texte entre un « < » isolé et le « > » suivant n'est jamais lu (une comparaison, une flèche) : 16 % du Markdown modifié depuis le gel échappe à la porte | important |
| N2 | `scripts/leak.test.ts:302` | Les tests lisent l'arbre de travail, un push publie des commits : un texte commité puis retiré passe sans être lu | important |
| N3 | `scripts/leak.test.ts:445` | Un message de commit qui cite une de nos phrases non publiées passe | important |
| N4 | `scripts/leak.test.ts:347` | Le balayage des aperçus laisse passer neuf mots dont un signe seul (« % ») : le cas réel de `/r/exil-fiscal/` | important |
| N5 | `scripts/leak.test.ts:62` | Le texte du livre dans un attribut d'une page (alt, title, aria-label, data-*) n'est lu par aucun balayage | important |
| N6 | `scripts/leak.test.ts:310` | Sans `dist/`, ou avec une autre build dedans, le balayage des pages passe sur zéro page | important |
| N7 | `scripts/leak.test.ts:390` | Seule la dernière formulation d'une phrase est cherchée : une formulation d'avant passe | important |
| N8 | `scripts/leak.test.ts:403` | Une phrase écrite autrement qu'en texte brut (échappée en HTML, en JSON, un mot en `<em>`) passe | important |
| N9 | `scripts/leak.test.ts:439` | Plus de la moitié des fenêtres exigée : 72 % d'une phrase copiée passe | important |
| N10 | `scripts/leak.test.ts:333` | Le JSON-LD et le texte des images ne sont pas tenus à la règle des aperçus | important |
| N11 | `scripts/leak.test.ts:314` | Une mesure citée entière peut paraître n'importe où sous `dist/` | important |
| N12 | `scripts/leak.test.ts:244` | Des fichiers sont comptés propres sans être lus (images, archives, plus de 8 Mio) | important |
| N13 | `scripts/leak.test.ts:170` | En CI, un fichier de `data/2026` peut tenir une phrase entière écrite sans espaces ordinaires | important |
| N14 | `scripts/leak.test.ts:415` | Un texte nouveau d'une mesure que le jeu publie n'est jamais cherché | important |
| N15 | `scripts/leak.test.ts:422` | Une phrase à moitié contenue dans une plus longue ne peut jamais être signalée | important |
| N16 | `scripts/leak.test.ts:233` | Le test du fichier du jeu ne lit `meta` qu'à un niveau | important |
| N17 | `scripts/leak.test.ts:268` | Après une réédition, l'ancienne formulation des mesures changées n'est plus protégée | important |
| N18 | `scripts/leak.test.ts:447` | Un fichier que la porte ne sait pas décoder (UTF-16, Latin-1, .docx) est déclaré propre | important |
| N19 | `scripts/leak-scan.ts:119` | Le texte du livre écrit avec des échappements courants (\\uXXXX, entités, « + ») échappe surtout | antérieur |
| N20 | `scripts/leak-scan.ts:90` | Les fenêtres qui enjambent une ellipse ne peuvent jamais correspondre | antérieur |
| N21 | `scripts/aec26-publish.ts:342` | Les validateurs du manifeste et des citations laissent de la place à du texte que la CI ne voit pas | antérieur |
| N22 | `scripts/leak.test.ts:254` | Un fichier privé déplacé change les tests de contenu en sauts, et le passage en succès | mineur |
| N23 | `scripts/leak.test.ts:389` | Une dernière ligne coupée du fichier des verdicts fait échouer le test sans dire pourquoi | mineur |
| N24 | `scripts/leak.test.ts:309` | Un lien vers un dossier non suivi fait échouer le test (EISDIR) | mineur |
| N25 | `scripts/leak.test.ts:147` | Des commentaires ne sont plus vrais (« relus par une personne », le fichier du jeu « pas encore là ») | mineur |

### 25 novembre 2026, au matin — revue 17 : `scripts/check-build.test.ts`
- **35 constats** (15 importants, 6 antérieurs dans d'autres fichiers, 14 mineurs) : 6 relecteurs, 20 vérificateurs, un balayage ; tout reproduit sur des copies de HEAD et des builds fabriquées, dans trois moteurs quand il le fallait. Les 23 tests passent sur les builds du jour, mais beaucoup tiennent par coïncidence. **Une régression de la session, trouvée pendant la revue** (Q17) : depuis `870cd18`, la build neutre publiait une référence non résolue (`{color.violet-200}`) qui fait perdre aux navigateurs `--duration-fast` — le petit bond de la tortue, les transitions du jeu ; **corrigée** (une référence qui ne nomme rien arrête la build ; le jeu neutre a son ombre, `relief`), rien de servi : la build neutre n'est pas en ligne.

| # | Où | Constat | Gravité |
|---|---|---|---|
| Q1 | `scripts/check-build.test.ts:239` | Les plafonds pèsent en gzip -9 ; Cloudflare envoie brotli 4 ou zstd 3, plus gros : tels qu'envoyés, quatre fichiers dépassent — **question pour l'éditeur** | important |
| Q2 | `scripts/check-build.test.ts:445` | Le plafond des mots expliqués pèse un reste de 776 o : le module est coupé en trois morceaux que le test ne pèse pas | important |
| Q3 | `scripts/check-build.test.ts:344` | La porte des « look-behind » ne lit pas la source d'expressions que la feuille reçoit en données (`clair-*.json`) | important |
| Q4 | `scripts/check-build.test.ts:585` | La feuille neutre que la build utilise n'est lue par aucun test (voir Q17) | important |
| Q5 | `scripts/check-build.test.ts:126` | La porte de la politique de sécurité laisse passer `https:`, un hôte sans schéma, `trusted-types 'none' default` | important |
| Q6 | `scripts/check-build.test.ts:99` | « Aucune requête ne sort » ne voit que 7 balises : 27 vecteurs passent (`//hôte`, srcset, url() en CSS…) | important |
| Q7 | `scripts/check-build.test.ts:93` | Aucune porte ne lit `_headers` pour une origine tierce (`Link`, rapports) | important |
| Q8 | `scripts/check-build.test.ts:121` | La présence de la règle est vérifiée, pas sa place : une balise qui ferme l'en-tête la rend inopérante | important |
| Q9 | `scripts/check-build.test.ts:404` | Quatre portes ne jugent que les builds d'essai, jamais `dist/` | important |
| Q10 | `scripts/check-build.test.ts:405` | Un morceau absent passe pour une build absente : renommer un fichier retire sa porte en silence | important |
| Q11 | `scripts/check-build.test.ts:357` | « Un site qui ne répond pas ne publie rien de la feuille » ne tourne sur aucune build (avec C5) | important |
| Q12 | `scripts/check-build.test.ts:200` | Le `rel` des liens que la recherche construit au chargement n'est vérifié par personne | important |
| Q13 | `scripts/check-build.test.ts:539` | Les polices figées sont lues par une expression sur la source, jamais dans `dist/` | important |
| Q14 | `scripts/check-build.test.ts:224` | La porte « jamais de px » ne connaît qu'une forme de requête média | important |
| Q15 | `scripts/check-build.test.ts:30` | La liste d'exclusion ne lit ni l'icône, ni `sitemap.xml`, `robots.txt`, `_headers`, `_redirects` | important |
| Q16 | `scripts/build-mode.ts:133` | (= C5) `builtAskMode` ignore la build « scrutin » | antérieur |
| Q17 | `scripts/build-tokens.ts:42` | La build neutre publie du CSS invalide : une référence non résolue (régression de `870cd18`) | antérieur |
| Q18 | `scripts/e2e.ts:161` | Les suites de navigateur ne comptent pas la plupart des refus de la politique (Firefox, Trusted Types) | antérieur |
| Q19 | `scripts/a11y.ts:163` | La porte d'accessibilité ne refuse ni `meta-viewport` ni un zoom bloqué ; aucune largeur au-delà de 390 px | antérieur |
| Q20 | `scripts/e2e-ask.ts:813` | « N'ouvre aucun tiers » a le même trou que Q5 | antérieur |
| Q21 | `src/components/Search.astro:208` | La recherche charge le moteur des mots expliqués avant toute frappe (3 254 o) | antérieur |
| Q22 | `scripts/check-build.test.ts:70` | Les interdits de zoom et de la charte n'attrapent qu'une graphie | mineur |
| Q23 | `scripts/check-build.test.ts:47` | L'interdit « Config » peut refuser une build correcte | mineur |
| Q24 | `scripts/check-build.test.ts:142` | Le balayage des puits HTML laisse passer `+=`, `setHTMLUnsafe`, `eval?.(`… (avec C14) | mineur |
| Q25 | `scripts/check-build.test.ts:180` | La porte « relu par » s'aveugle dans les deux états pour lesquels elle existe | mineur |
| Q26 | `scripts/check-build.test.ts:294` | La porte des noms de R73 ne lit que le premier niveau de `dist/data/` | mineur |
| Q27 | `scripts/check-build.test.ts:389` | La porte des formulaires laisse passer `formaction` et une règle `form-action` élargie | mineur |
| Q28 | `scripts/check-build.test.ts:591` | « Un deux-points par déclaration » laisse passer un « ; » perdu | mineur |
| Q29 | `scripts/check-build.test.ts:584` | Le contrôle de syntaxe du CSS saute sans `dist/` alors qu'il lit une source | mineur |
| Q30 | `scripts/check-build.test.ts:500` | Le test des réponses compte, il ne compare pas lesquelles | mineur |
| Q31 | `scripts/check-build.test.ts:117` | `dist-scrutin/` n'est lu que par une boucle | mineur |
| Q32 | `scripts/check-build.test.ts:162` | Des commentaires ne décrivent plus le code | mineur |
| Q33 | `scripts/check-build.test.ts:311` | Le fichier n'est pas au format de Prettier (une ligne de 101 colonnes) | mineur |
| Q34 | `scripts/check-build.test.ts:567` | La porte du chemin critique (P3) ne pèse que le HTML d'une page | mineur |
| Q35 | `scripts/check-build.test.ts:281` | La ligne affichée donne le total d'une famille contre le plafond d'un fichier | mineur |

### 25 novembre 2026, au matin — revue 18 : `scripts/chat-worker.test.ts`
- **32 constats** (7 importants, 2 antérieurs, 23 mineurs) : 6 relecteurs, 8 vérificateurs, un balayage ; chaque verdict repose sur un mutant ou une sonde exécutés sur des copies de HEAD (`git archive`), dans le moteur du Worker quand il le fallait. **Rien de servi n'en dépend aujourd'hui** : aucun modèle n'est nommé, `/api/chat` est fermée, la base ne tient plus le livre. **Ce que la porte devait tenir et ne tenait pas** : qu'une route fermée ne lit rien, qu'aucun fichier du Worker ne nomme une question, que `/api/gists` n'appelle aucun modèle, et que la décision de campagne soit la sienne. **Une question pour l'éditeur** (X20).

| # | Où | Constat | Gravité |
|---|---|---|---|
| X1 | `scripts/chat-worker.test.ts:634` | La garde de la décision de campagne accepte n'importe quelle ligne du jour qui contient « campagne » (la palette de la tortue, la campagne de revues) — classe de A2 | important |
| X2 | `scripts/chat-worker.test.ts:674` | « Une route fermée ne lit rien » n'est pas tenu : la place du retour anticipé n'est jamais vérifiée | important |
| X3 | `scripts/chat-worker.test.ts:686` | La porte de D16.53 ne voit pas une question lue par une chaîne (`body['question']`, un en-tête) ni dans un `${…}` | important |
| X4 | `scripts/chat-worker.test.ts:690` | Elle ne voit que le mot nu : `questionText`, `questions`, `userConsent` passent | important |
| X5 | `scripts/chat-worker.test.ts:699` | Elle lit 3 des 9 fichiers de bibliothèque compilés dans le Worker, aucun sous-dossier, ni le schéma de la base | important |
| X6 | `scripts/chat-worker.test.ts:575` | « Le câblage ne décide rien du mode » ne tient que pour le texte d'un appel | important |
| X7 | `scripts/chat-worker.test.ts:464` | Les étapes de refus ne vérifient ni la réservation, ni sa restitution, ni la fermeture : une requête forgée pourrait tenir l'allocation ou fermer les explications pour tous | important |
| X8 | `src/worker/chat.ts:105` | `siteFor` passe tel quel un seuil `min_shared` de 0 ou négatif, qui éteint une règle du contrôle | antérieur |
| X9 | `src/lib/chat-contract.ts:9` | Des commentaires disent que l'éditeur a lu les phrases, ou que le Worker lit une question (classe de W11, E19, K16) | antérieur |
| X10 | `scripts/chat-worker.test.ts:204` | « `/api/gists` n'appelle aucun modèle » est vérifié sur l'objet du test lui-même | mineur |
| X11 | `scripts/chat-worker.test.ts:653` | « Le chemin d'une question ne lit aucune mesure » n'est vérifié que sur `chat.ts` | mineur |
| X12 | `scripts/chat-worker.test.ts:677` | Le débit de `/api/chat` : la présence de l'appel, ni son effet ni sa place | mineur |
| X13 | `scripts/chat-worker.test.ts:662` | « Un seul lecteur des corps » n'a aucune assertion | mineur |
| X14 | `scripts/chat-worker.test.ts:574` | Deux contrôles de source lisent les commentaires | mineur |
| X15 | `scripts/chat-worker.test.ts:660` | « Pas de passerelle » ne lit que le corps de `runDirect` | mineur |
| X16 | `scripts/chat-worker.test.ts:738` | La porte du démarrage à froid est étroite, et lit un fichier qui n'est plus sur le chemin | mineur |
| X17 | `scripts/chat-worker.test.ts:685` | `names()` lit mal un fichier qui a un accent grave dans une expression régulière | mineur |
| X18 | `scripts/chat-worker.test.ts:287` | Le branchement de l'allocation dans les deux routes n'est lu par aucun test | mineur |
| X19 | `scripts/chat-worker.test.ts:480` | Sur EXHAUSTED, rien ne vérifie que rien n'a été réglé | mineur |
| X20 | `scripts/chat-worker.test.ts:580` | **Question pour l'éditeur** : sa décision de campagne (les phrases restent servies, D16.78) ouvrirait aussi, un modèle nommé, les explications en direct pendant la campagne | mineur |
| X21 | `scripts/chat-worker.test.ts:533` | Aucun test ne montre le seuil du fichier atteindre le contrôle | mineur |
| X22 | `scripts/chat-worker.test.ts:299` | Aucune relance (« plus simple », « un exemple ») ne passe par `answerChat` | mineur |
| X23 | `scripts/chat-worker.test.ts:627` | `campaign: null` fait planter le test au lieu d'être jugé | mineur |
| X24 | `scripts/chat-worker.test.ts:637` | (= A16) Le motif des lignes de décision saute les lignes à lettre | mineur |
| X25 | `scripts/chat-worker.test.ts:304` | `indexOf(first) < indexOf(second)` est vrai quand la première phrase manque | mineur |
| X26 | `scripts/chat-worker.test.ts:409` | Rien ne lie le plafond de phrases de la consigne à la constante | mineur |
| X27 | `scripts/chat-worker.test.ts:412` | Les contrôles de la consigne sont sensibles à la casse, et sautent les textes des relances | mineur |
| X28 | `scripts/chat-worker.test.ts:423` | PLAUSIBLE : la liste des modèles qui coûtent est écrite à la main | mineur |
| X29 | `scripts/chat-worker.test.ts:309` | « Les mots arrivent tels que notre phrase les écrit » ne peut pas échouer avec ce jeu d'essai | mineur |
| X30 | `scripts/chat-worker.test.ts:256` | La base du jeu d'essai n'a pas la forme de celle de la production | mineur |
| X31 | `src/worker/chat.ts:316` | `explainedOutput`, seul filtre entre la sortie brute d'un modèle et la route du banc, n'est testé par aucun script | mineur |
| X32 | `scripts/chat-worker.test.ts:64` | PLAUSIBLE : le test dit que « l'éditeur a lu » les phrases (classe de W11) | mineur |

### 25 novembre 2026, au matin — ses réponses D21.46 à D21.48 ; les deux débuts en production
- **Le début de « énergie » reformulé, validé mot pour mot** (D21.46 ; commit `a4ab6bf`) : rip-13 partageait lui aussi neuf mots de suite avec une mesure, en comptant le « % » ; trouvé par la porte anti-fuite une fois qu'elle compte un signe seul, et **vérifié sur le livre entier par elle avant de le lui proposer**. Le contrôle des commits non poussés ne signale plus que ce qu'un push ajoute à `origin/main`.
- **Sa décision de campagne ne vaut que pour les phrases** (D21.48, X20 ; commit `2e3a9bb`) : un modèle qui expliquerait demanderait, dès le 1er janvier 2027, sa propre décision (`campaign.explain`, `src/worker/chat.ts`) ; rien ne change aujourd'hui, aucun modèle n'est nommé.
- **« Aperçu puis production »** pour les deux débuts (D21.47). Avant : toutes les portes de `CLAUDE.md` vertes dans la copie de travail (743 tests ; la feuille 106/100/100, le jeu 302/286/286), puis, dans le dépôt principal, l'anti-fuite complète sur la build de l'app de ce commit (9 sur 9). **L'aperçu**, 3 h 43 (2 h 43 UTC) : Worker `cestecritla-preview`, version `96196bb6` ; quatre fichiers envoyés, ceux qu'on attendait (l'accueil, `/r/exil-fiscal/`, `/r/energie/`, le fichier de « En clair ») ; en ligne, 1 398 fichiers sur 1 401 identiques à la build, les trois écarts connus ; sonde de « Demander » : 45 « ok » dans trois moteurs — un cas rejoué après une minute : le limiteur de débit (six demandes par minute) avait répondu « local » au passage de Firefox, lancé juste après celui de Chromium, et la feuille a montré des liens, sans un mot de panne. **La production**, 3 h 47 (2 h 47 UTC) : Worker `cestecritla`, version `692abac4` ; les mêmes quatre fichiers ; sur `cestecritla.fr` et `www`, 1 398 fichiers sur 1 401 identiques à la build ; sonde : 45 « ok » sur l'apex, 15 sur `www`. **Retour arrière, sa décision** : l'étiquette locale `prod-avant-debuts` (`4711260`), fiche 14 du runbook. **Pas redéployé** : le Worker des phrases (`cestecritla-chat`, `-preview`) ; D21.48 n'y vaudra qu'à son prochain déploiement — aucun modèle n'est nommé.

### 25 novembre 2026, au matin — la porte du Worker des phrases (revue 18), corrigée
- **Commit `d5b9922`. La porte tient ce qu'elle dit tenir** : sa décision de campagne lue comme toutes ses décisions — sa marque en tête du statut, une ligne qui nomme le fichier et le champ, les lignes à lettre comprises, `campaign: null` jugé au lieu de faire planter le test (X1, X23, X24 ; `editorSaid`) ; **une route fermée ne lit rien** — la configuration, le retour fermé, le compteur et le corps, dans cet ordre, un seul lecteur de corps et aucun autre (X2, X12, X13) ; **le Worker tel que wrangler l'empaquette, lu par l'analyseur de TypeScript** : aucun nom ne contient « question » ni « consent », aucune chaîne n'est ce mot, ni dans le schéma de la base — ce qui couvre les noms composés, les chaînes, les gabarits, les sous-dossiers et tout fichier importé (X3, X4, X5, X17) ; aucun bord de mot sur une propriété Unicode, quelle qu'en soit l'écriture (X16) ; le câblage lu comme du code, la configuration lue en un seul endroit (X6, X14) ; `/api/gists` n'appelle aucun modèle et aucune route ne lit une mesure (X10, X11) ; les étapes de refus ne réservent, ne rendent ni ne ferment rien, EXHAUSTED ne règle rien, le branchement de l'allocation est épinglé (X7, X18, X19) ; la consigne dit le plafond que tient la constante, et aucune de ses variantes ne parle d'une question (X25, X26, X27) ; les commentaires et le titre ne disent plus que l'éditeur a lu les phrases (X9, X32). **Dans le code** : un seuil du contrôle lu dans `data/2026/ask.json` est un entier de 1 à 20, ou rien — 0 ou moins éteignait la règle du sujet sans un mot (X8). Rien de servi ne change.
- **Restent** : X15, X21, X22, X28 à X31 (des tests de plus sur des chemins fermés).
