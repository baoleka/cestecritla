# Plan — « C'est écrit là » après la réédition du programme (édition 2026)

> **Remplacé le 13 novembre 2026 par `PLAN-JEU.md`** (D16.1 à D16.21) pour tout ce qui restait à
> faire. La date du 15 décembre 2026 n'est plus une cible (D16.19). Ce fichier reste la pièce de
> ce qui a été construit du 12 au 13 novembre : lots A à F et leur journal, en fin de fichier.

> Produit en plan mode le 12 novembre 2026, à la suite du constat D15.1. **Approuvé le 12 novembre
> 2026.** Il **remplace les lots 2 à 13 de `PLAN-IMPLEMENTATION.md`** ; P0 et le lot 1 restent acquis.
> Horizon : 12 novembre → 15 décembre 2026, puis une nouvelle session de planification en janvier.
>
> **Statuts** : VÉRIFIÉ = mesuré ou lu à la source, pièce citée · PROBABLE = déduit, ou mesuré une
> seule fois par un outil non conservé · HYPOTHÈSE = non prouvé, méthode de levée indiquée.
>
> **Ce texte est le plan tel qu'approuvé, corrigé de quatre points constatés en l'exécutant** ; ils
> sont listés au dernier paragraphe (« Journal d'exécution »), pour qu'aucune correction ne passe
> pour une prévision.

## Contexte

Le 5 novembre 2026, melenchon2027.fr a remplacé *L'Avenir en commun, édition 2025* par une nouvelle
édition : **« L'Avenir en commun — Le programme de la Nouvelle France »** (6ᵉ édition, Éd. La Dispute,
en librairie le 6 novembre). Ce n'est pas une actualisation : la structure, le texte **et la licence**
changent. Le dépôt est figé depuis le 10 septembre (`16023da`) et la v1 du 10 novembre est passée.
But de ce plan : remettre le projet dans un état vrai, puis sortir une v1 sur l'édition 2026 le
**mardi 15 décembre 2026**, sans jamais reproduire le texte intégral.

### Constats du 12 novembre 2026

VÉRIFIÉ, sauf les comptes par nature et le recouvrement des deux éditions, qui sont PROBABLES
(mesurés une fois, pages non conservées : H-COR-12 et H-COR-13). Pièce :
`captures/2026-11-12/edition-2026/observation.json`.

| | Édition 2025 (dépôt) | Édition 2026 (source) |
|---|---|---|
| Structure | 4 parties, 18 chapitres, 89 sections | 6 parties, 23 chapitres numérotés par partie (3-3-4-7-3-3), 111 sections |
| Propositions | 837 extraites, « 831 » officielles | 107 clés + 881 mesures + 81 sous-mesures = **1 069**, et le site dit « 1 069 mesures » |
| « À savoir » | 48 | 0 |
| URL | `/programme2025/livre/chapitreN/sM/` | `/programme/livre/<partie>/chapitreK/#<ancre>` (sections dans la page du chapitre) |
| Licence | CC BY-NC-SA 4.0 | « © La France insoumise, tous droits réservés » |

- **Texte réécrit** (égalité exacte, puis Dice sur trigrammes) : sur 837 propositions 2025, 181
  identiques, 129 retouchées, 213 remaniées, 169 apparentées, 145 sans équivalent proche ; 362 des
  1 069 nouvelles sans antécédent ; 66/111 titres de section identiques ; chapitre Europe neuf.
- **L'édition 2025 n'est plus servie** : sections en 404, `/programme2025/livre/` → 301 vers le nouveau livre.
- **Clause ajoutée aux mentions légales** : reproduction du livre-programme interdite sans autorisation
  écrite ; « le partage de liens vers ces pages est autorisé (et encouragé) » ; courts extraits admis
  avec l'auteur et un lien vers la page d'origine. Le reste du site reste sous CC. Capture d'avant :
  `docs/discovery/captures/2026-09-07/melenchon2027.fr_mentions-legales.txt`.
- **Le corpus 2025 reste utilisable** : relevé le 7/9 sous CC BY-NC-SA 4.0, licence « irrévocable »
  que l'arrêt de diffusion ne résilie pas (VÉRIFIÉ sur le code légal, §2(a)(1) et §6(c) ; son
  application à ce cas reste une lecture, pas un avis de juriste).
- **Public aujourd'hui** : `cestecritla.fr` sert le spike `aec-spike-share` — texte 2025 présenté comme
  « Texte du programme », lien source mort, corpus 2025 servi en JSON, aucune mention légale,
  **journaux d'invocation activés**, `workers_dev: true`. `proto.` et `lab.` sont en ligne. L'app Astro
  (979 pages 2025) n'a jamais été déployée. Huit liens du spike ont été envoyés le 9/9.
- **Veille éteinte** : les deux workflows planifiés sont désactivés par GitHub pour inactivité
  (dernières exécutions le 9 novembre) ; avant cela le rappel du lundi échouait (labels `recrawl`,
  `veille`, `corpus` absents du dépôt recréé — PROBABLE) et `watch.yml` ne regardait que aec2027.fr, inchangé.
- **Portes** : sous Node 24.14.0 (nvm ; le défaut de la machine est v20), `tsc` 0 erreur, 150/150 tests.
- **Le site officiel ne bloque pas le défilement vers un texte** (aucun en-tête `Document-Policy`).

## Arbitrages du 12 novembre 2026 — à consigner en D15.x

| # | Décision | Statut |
|---|---|---|
| D15.1 | Constat : nouvelle édition, 1 069 mesures, licence « tous droits réservés » | OBSERVATION |
| D15.2 | **Régime « renvoi + courte citation »** : l'app trouve le passage et renvoie à la page officielle ; aucune reproduction intégrale ; corpus 2026 jamais commité ni servi | DÉCISION (utilisateur) |
| D15.3 | **Aucune demande d'autorisation à LFI** : D14.12 tient | DÉCISION (utilisateur) |
| D15.4 | **Page d'attente honnête** sur l'apex, spike retiré | DÉCISION (utilisateur) |
| D15.5 | **v1 le mardi 15 décembre 2026** : sommaire, recherche, riposte, 5 cartes-concept ré-ancrées | DÉCISION (utilisateur) |
| D15.6 | Corpus 2026 **privé** : pages et texte gardés en local sous `private/`, ignoré par git, jamais dans le dépôt ni dans `dist/`, supprimés à la fin du projet ; **manifeste public** d'empreintes ; portes anti-fuite | Défaut, réversible |
| D15.7 | **Politique de citation chiffrée** (ci-dessous), validée sur mesure réelle avant toute mise en ligne | Défaut, **point de contrôle utilisateur** |
| D15.8 | Identifiants 2026 `p{P}c{K}-s{MM}-…` (introduction = `p0`), disjoints des 1 145 ids 2025 ; anciennes adresses → **pages de pont** | Défaut |
| D15.9 | Corpus 2025 = **archive datée sous CC**, plus jamais présentée comme « le programme » ; **pas de comparatif public 2025 → 2026** : une liste de « mesures disparues » est le cadeau idéal d'une capture hostile (R7) | Défaut |
| D15.10 | Cartes statistiques et sidecar 77-808 **retirés du produit 2026** (plus d'« À savoir » dans l'édition) | Défaut |
| D15.11 | Comptage : **1 069 = chiffre officiel = extraction**, imposé par invariant (remplace la règle 831/837 de D1.2) | Défaut |
| D15.12 | Veille de la source **en local** ; workflows réactivés ; hôte d'aperçu `beta.cestecritla.fr` en `noindex` jusqu'au jour J | Défaut |

## Ce que la décision change dans le dossier

| Élément | Avant | Après |
|---|---|---|
| Fidélité au texte | verbatim intégral, sous CC | toujours verbatim, mais **court, attribué, lié** ; l'exactitude se prouve par **empreinte SHA-256** |
| Critère v1 n° 1 | 89 + 837 URL chez nous | 111 fiches de section + **lien profond officiel** vers les propositions |
| « Jamais sacrifié » : URL par mesure, aperçu de partage | page + carte par mesure | lien profond officiel ; aperçu sur nos pages (accueil, fiche, riposte, carte-concept), sans texte du programme dans l'image |
| R2 « corpus périmé » | probable, « ≈ 2 jours » | **réalisé** ; fiche 6 exécutée par ce plan ; nouveau risque « régime de licence de la source » |
| Don du dataset (playbook §9.6) | corpus CC offert à J+14 | impossible pour 2026 : messages à réécrire |
| Métrique nord N | lecture d'un verbatim chez nous | **clic vers la page officielle** |

## Architecture cible

```
melenchon2027.fr ──crawl local, 35 requêtes──► private/html/<horodatage>/ ──analyse hors ligne──► private/corpus/aec-2026.json
                                                (jamais commités)                                   │ publication locale
        ┌─────────────────────────┬──────────────────────────────┬────────────────────────────────┤
        ▼                         ▼                              ▼                                ▼
data/2026/manifest.json   data/2026/search-index.json   data/2026/quotes.json        data/2026/id-map-2025.json
structure, titres, ancres, index MiniSearch,            citations entières,          section 2025 → section(s) 2026
empreintes, repères        sans texte stocké            sous plafond                 (sans statut ni score)
        └──────────── commités, publics, vérifiables en CI sans le corpus ────────────┘
                                    │ astro build (ne lit jamais private/)
                                    ▼
          dist/ : sommaire, fiches de section, recherche, riposte, cartes-concept, ponts 2025
```

Pourquoi ce découpage :
- **Privé / public** : le dépôt est public ; y commiter le corpus 2026 serait le reproduire. La CI
  construit `dist/` sans `private/` : ce qui est servi est donc une fonction des seuls fichiers suivis.
- **Empreintes** : `sha256(texte normalisé)` par proposition prouve qu'une citation est exacte sans
  publier le texte. Effet de bord assumé : avec le corpus 2025 public, chacun peut recalculer les 181
  propositions restées mot pour mot.
- **Lien profond** : le `href` écrit dans la page est l'ancre officielle de la section ; un script y
  ajoute `:~:text=<repère>` quand le navigateur sait surligner. Écrit en dur, le lien combiné
  laisserait un navigateur ancien en haut de page. Si le repère ne correspond plus, l'ancre prend le relais.
- **Collecte et analyse séparées** : les pages sont enregistrées une fois ; analyse, vérification et
  repères se rejouent ensuite sans une requête de plus.
- **Ponts en pages statiques, pas en redirections** : une règle `_redirects` compare le chemin exact,
  or les liens déjà envoyés n'ont pas de barre finale ; elle masquerait aussi les vraies pages.
- **Pas de comparatif public** : la table 2025 → 2026 complète (classes, scores) reste privée.

## Politique de citation (D15.7) — défauts, calibrés sur le corpus 2025

Une proposition fait 20 mots en médiane : un incipit de 8 mots sur **toutes** les mesures publierait
≈ 36 % de leurs mots et 75 mesures entières. D'où des niveaux distincts, comptés par une porte :

| Niveau | Où | Règle | Part estimée des mots des propositions |
|---|---|---|---|
| Extrait visible | recherche, fiche de section | incipit ≤ 8 mots, **mesures clés seulement** (107) | ≈ 4 % |
| Citation entière | riposte, cartes-concept | 1 ou 2 par riposte, 2 au plus par carte ; sur chaque page, moins de mots cités que de mots à nous | ≈ 4 % |
| Repère de lien | dans les `href` uniquement, jamais affiché | plus court préfixe unique dans la page du chapitre, 4 à 8 mots, calculé sur le texte brut | ≈ 19 % |
| Index de recherche | fichier JSON chargé par la recherche | racines des mots par proposition, sans ordre, sans mots-outils, sans texte | ≈ 12 racines par proposition |
| Jamais | partout | chapeaux, introduction, listes complètes de mesures, texte du programme dans `<meta>`, JSON-LD ou image d'aperçu | 0 |

Chaque citation porte l'auteur (« La France insoumise, *L'Avenir en commun*, édition 2026 »), le titre
de la section et un lien vers la page d'origine. Tout texte du programme passe par un seul composant,
marqué `data-programme="title|incipit|quote"`, ce qui rend la règle mesurable sur `dist/`.

**Point de contrôle, avant le premier push du manifeste** (l'historique public ne se rétracte pas) : les
parts réelles sont soumises à l’utilisateur. Trois curseurs : plancher des repères ; repères seulement pour les
mesures clés et citées, les autres liens visant la section (≈ 2 % au lieu de ≈ 19 %) ; index par
section plutôt que par proposition. Une commande (`--anchor-only`) replie tout sur les ancres.

## Mode d'exécution

- **Ce plan est la feuille de route.** Le **lot A** s'exécute à son approbation, puis arrêt pour
  validation. Chaque lot suivant s'ouvre par son propre passage en plan mode (règle de travail de
  l'éditeur : plan mode pour toute nouvelle section du site).
- Node 24 (`nvm use 24`) ; les trois portes vertes avant chaque commit ; commits conventionnels ;
  push sur `origin main` après chaque lot validé ; points d'apprentissage signalés dans le code.
- **Rien d'irréversible sans l'accord de l'utilisateur au moment de le faire** : bascule de l'apex,
  suppression d'un Worker, crawl de la source, premier push du manifeste, description du dépôt GitHub.
- L'app se construit sur l'hôte d'aperçu ; **l'apex reste sur la page d'attente jusqu'au jour J**.

## Les lots

### Lot A — Vérité, page d'attente, veille (jeu. 12 → sam. 14 nov.)

| # | Tâche | Fichiers | Fait quand |
|---|---|---|---|
| A1 | **Mode de build « attente »** — conservé ensuite : c'est aussi le geste de retrait de D14.10 | `scripts/build.ts` (`--holding` : saute la projection ; écrit `dist/_redirects` et `build/last-build.json`), `astro.config.ts` (`srcDir` → `src/holding/`), `src/holding/pages/{index,404}.astro` sur `src/layouts/Base.astro`, `scripts/build-mode.ts`, **`wrangler.holding.jsonc`** (fichiers statiques seuls, aucun script), **`scripts/deploy.ts`** (seul appelant de wrangler : l'apex refuse toute autre build) | sous `wrangler dev` : `/` 200 sans texte de programme ni mention CC ; `/m/…`, `/a/…`, `/r/…`, `/p/…`, `/res/…`, `/s/…` → 302 vers `/` (jamais 301) ; `/og/*.png`, `/diag`, `/data/slim.json` → 404 ; accessibilité verte |
| A2 | **Hôte d'aperçu** `beta.cestecritla.fr`, `noindex` | `wrangler.jsonc` et `wrangler.holding.jsonc` (`env.preview` : routes propres — elles sont héritées sinon ; `vars` et `analytics_engine_datasets` répétés — ils ne le sont pas), `public/_headers` | `npm run deploy:preview` répond en HTTPS ; build + déploiement chronométrés |
| A3 | **Bascule de l'apex** vers le Worker `cestecritla` | — | lancée par l'utilisateur, dans son terminal (`npm run build:holding && npm run deploy`) : wrangler y demande confirmation avant de reprendre les deux domaines, et les reprend **sans rien demander** hors terminal interactif. Puis `curl` de la matrice A1 sur `cestecritla.fr` et `www` ; retour arrière = corriger et redéployer |
| A4 | **Retrait des surfaces périmées**, 24 à 48 h après | Cloudflare : `aec-spike-share` (redirigé vers l'apex ou supprimé), `aec-proto`, `aec-lab-*` et la base D1 du labo FTS | plus aucun hôte ne sert de texte 2025 ni ne journalise |
| A5 | **Deux défauts trouvés en chemin** | `public/_headers` (les `Cache-Control` se cumulent sur `/_astro/*`, `/fonts/*`, `/og/*`), `src/layouts/Base.astro:38-44` (Gowun Batang préchargée partout) | en-tête à valeur unique vérifié sur le fil ; préchargement devenu une option |
| A6 | **Pièces datées** : statuts HTTP, clause de licence, dates du flux, comptes, empreintes | `docs/discovery/captures/2026-11-12/edition-2026/observation.json`, `…/mentions-legales.txt` ; pages du livre brutes sous `private/captures/`, seules leurs empreintes sont suivies | observation relue, SHA-256 présents |
| A7 | **Décisions et risques** | `docs/discovery/decisions.md` (D15.1 à D15.13), `14-risques.md` (R2 réalisé, R11 amendé, **R20** « régime de licence de la source », fiche 6 exécutée, **fiche 9 réécrite** selon D14.10), `16-hypotheses.md` (H-COR-1 levée, H-COR-12 à H-COR-15 ouvertes), `PLAN-IMPLEMENTATION.md` (bandeau « lots 2 à 13 remplacés »), `PLAN-EDITION-2026.md` (copie de ce plan) | `grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|' docs/discovery/decisions.md` = 187 |
| A8 | **Veille rallumée** | `gh workflow enable` sur les deux workflows ; `.github/workflows/recrawl.yml` et `watch.yml` (`gh label create … --force` avant d'ouvrir une issue ; le rappel lit encore le corpus 2025 à la ligne 47) | le rappel lancé à la main ouvre une issue |
| A9 | **Vérité du dépôt** | `CLAUDE.md`, `README.md`, `data/badge.json`, `data/LICENSE`, description GitHub, `.gitignore` (`private/`), `.prettierignore`, mémoire du projet | plus aucune phrase ne présente 2025 comme l'édition en vigueur |

Ordre : A1, A2, validation du texte par l’utilisateur, A3, puis A5 à A9, et A4 un à deux jours après la bascule.

Texte de la page d'attente, tel que construit (la dernière ligne, « Projet militant indépendant. », a
été ajoutée à l'exécution : c'est la ligne d'indépendance que le dossier ne coupe jamais) :

> **C'est écrit là** — Site non officiel.
> *L'Avenir en commun* a été réédité le 5 novembre 2026.
> Ce site s'appuyait sur l'édition 2025. Il se met à jour.
> Les anciens liens arrivent ici pour l'instant.
> [Lire le programme sur melenchon2027.fr]
> Projet militant indépendant.

### Lot B — Socle 2026 : corpus privé, manifeste public (lun. 16 → dim. 22 nov.)

| # | Tâche | Fichiers | Fait quand |
|---|---|---|---|
| B0 | **Schéma du manifeste gelé** + manifeste synthétique, pour que C et D démarrent ; **sonde 0** : l’utilisateur ouvre un lien profond écrit à la main dans Chrome, Safari et Firefox, bureau et téléphone | `scripts/aec26-types.ts`, test de grammaire des ids contre les 1 145 ids 2025 | schéma commité le 16 ; sonde notée |
| B1 | **Archive 2025 gelée** : somme de contrôle, puis déplacement pur — à sauter si le temps manque | `data/2025/` (+ `SHA256SUMS`), ≈ 35 lignes de chemins dans 17 fichiers, `scripts/archive-2025.test.ts` | les octets n'ont pas changé ; tests 2025 verts |
| B2 | **Collecte, puis analyse hors ligne** : sections en ligne, sous-mesures imbriquées, sections sans mesure clé, anomalie `section.chapitre` caractérisée et épinglée | `scripts/crawl-2026.ts` (35 requêtes, plafond 40, journal des requêtes), `scripts/ingest-2026.ts --from <horodatage>`, `scripts/html-utils.ts` (extrait de `scripts/ingest.ts:127-196`), `scripts/ingest-2026.test.ts` (balisage 2026 rendu en mémoire autour du texte 2025 : 837 empreintes identiques) | 6 / 23 / 111 / 107 / 881 / 81 ; **1 069 = chiffre officiel** ; chaque nœud revendiqué par un item ; sommaire des pages de partie = titres des chapitres ; deux analyses donnent le même fichier |
| B3 | **Repères de lien** : texte brut du DOM (la normalisation efface les espaces insécables), unicité prouvée sur toute la page, repli sur l'ancre | `scripts/locator.ts` | 1 069 repères uniques ou repliés ; encodage testé (tiret, virgule, apostrophe) |
| B4 | **Publication** et curseurs | `scripts/publish-2026.ts` → `data/2026/manifest.json`, `quotes.json`, `NOTICE.md` ; `data/2026/exposure-policy.json` (modifié à la main) ; `data/2026/expected-invariants.json` | refuse d'écrire si la clause de licence a changé ; **rapport d'exposition soumis à l'utilisateur avant tout push** |
| B5 | **Vérification par un vrai navigateur** : même extraction refaite dans le DOM de Chromium sur les pages en cache | `scripts/verify-2026.ts` (Playwright, pages servies en local, tout autre hôte coupé) | toutes les empreintes identiques ; chaque repère atterrit |
| B6 | **Portes anti-fuite** | `scripts/leak-structure.test.ts` (CI, sans corpus), `scripts/leak-content.test.ts` (local : lignes ajoutées depuis `16023da`, `dist/`, messages de commit) | vertes ; témoin positif détecté |
| B7 | **Table de correspondance** : les 1 033 items 2025, classes exact / typo / proche / retouché / faible / aucun ; projection publique réduite aux sections | `scripts/id-map.ts`, `scripts/atoms.ts` (extrait de `scripts/diff.ts:144-245`) → `private/id-map/`, `data/2026/id-map-2025.json` | histogrammes retrouvés (181 exacts ; flux 64 / 18 / 5 / 2) |
| B8 | **Re-crawl et veille de la source**, sans extrait dans la PR | `scripts/recrawl-2026.ts`, `scripts/watch-source.ts`, `data/2026/watch.json` (sommaire, clause de licence, flux, compte officiel, robots, `Document-Policy`) | `npm run recrawl -- --dry-run` : aucun changement ; `watch-source` sort 0 |

Lien de la sonde 0, utilisable dès maintenant (il doit ouvrir le chapitre 1 sur la mesure clé de la
règle verte, surlignée) :
`https://melenchon2027.fr/programme/livre/pour-une-bifurcation-ecologique-et-sociale/chapitre1/#la-bifurcation-ecologique-pour-une-societe-de-l-harmonie:~:text=Inscrire%20dans%20la%20Constitution`

### Lot C — Sommaire, fiches de section, ponts (lun. 16 → dim. 29 nov. ; données réelles le 23)

| # | Tâche | Fichiers | Fait quand |
|---|---|---|---|
| C1 | **Source unique d'édition** | `src/lib/edition.ts` (manifeste, URL du livre, version, niveau de lien `sentence / section / chapter / book` qui généralise le booléen de `src/lib/corpus.ts:52`), `src/lib/archive-2025.ts` (ids et titres pour les ponts) ; `scripts/build-projection.ts` sort des entrées de l'app | plus aucun littéral « 2025 », « 837 » ou `d29c…` dans `src/` |
| C2 | **Chaînes** lues dans le kit par un `t()` typé | `design/strings.json` v0.6 (≈ 20 clés liées à 2025 ou à la CC) | plus de texte d'interface en dur dans les nouvelles pages |
| C3 | **Accueil et sommaire** : 6 parties, 23 chapitres, 111 sections | `src/pages/index.astro` | utilisable sans JavaScript |
| C4 | **Fiche de section** `/s/<id>/` : titres, comptes, incipit de la mesure clé, « C'est écrit là » vers l'ancre officielle | `src/pages/s/[section].astro`, `src/components/Quote.astro` (remplace `SectionVerbatim.astro`, garde la classe `verbatim` que deux portes filtrent) | 111 fiches ; `<meta description>` écrite par nous ; JSON-LD `WebPage` + `isBasedOn`, sans licence ni texte |
| C5 | **Ponts statiques** pour les adresses 2025 : page 200, `noindex`, « cette adresse renvoyait à l'édition 2025 », lien vers la fiche 2026, sans dire si la mesure a survécu | `src/pages/m/[id].astro`, `a/[id].astro`, `s/[section].astro`, `r/…` ; `_redirects` ne garde que `/p/*` et `/res/*` | chaque ancienne adresse a sa page ; `/m/c12-s01-k01` sans barre finale y arrive en un saut |
| C6 | **Porte de citation** sur `dist/` | `scripts/check-build.test.ts`, `scripts/check-no-ai-mention.test.ts` (ignore `[data-programme]` : une section 2026 a « intelligence artificielle » dans son titre) | mots cités comptés ; plafonds tenus |
| C7 | **Balise** : chapitres 2026, événement `outbound_official`, nature `bridge` | `src/worker/events.ts:59-84`, `wrangler.jsonc` (`CORPUS_VERSION`, deux environnements) | égalité avec le manifeste testée |
| C8 | **Aperçus** : balises `og:`, images sans texte du programme | `src/layouts/Base.astro`, `public/og/` | `og:site_name` = « C'est écrit là » |
| C9 | Tests de routes et d'accessibilité | `scripts/routes.test.ts` (statuts `bridge` et `legacy`, « tout lien officiel figure au manifeste »), `scripts/a11y.ts`, `src/pages/carte/index.astro:8` | portes vertes, 0 violation axe grave |

### Lot D — Recherche (lun. 23 nov. → dim. 6 déc.)

| # | Tâche | Fichiers | Fait quand |
|---|---|---|---|
| D1 | **Cœur de recherche partagé** par le build, le navigateur et l'évaluation | `src/lib/search-core.ts`, extrait de `eval/retrieval-core.ts` (normalisation, racinisation, synonymes, configuration `A-synonymes-0.25`) ; synonymes de mots composés | empreinte de sonde identique des deux côtés |
| D2 | **Index** MiniSearch sérialisé, aucun champ stocké, servi en JSON | `scripts/build-search.ts` → `data/2026/search-index.json` | ≈ 70 Ko gzip ; aucune tâche > 50 ms à CPU ×4 |
| D3 | **Îlot de recherche** (premier JavaScript de l'app) | `src/components/Search.astro` | CSP sans violation ; `form role="search"`, résultats en liste, région `role="status"` ; requête dans `#q=`, jamais envoyée ; sans JS, le sommaire |
| D4 | **Liens profonds** : ancre par défaut, surlignage ajouté par script | `src/components/Search.astro`, `src/lib/edition.ts` | repli vérifié quand le repère ne correspond pas |
| D5 | **Évaluation** : porte de CI au niveau section ; rappel par proposition mesuré en local et publié avec son effectif | `eval/`, `scripts/eval-questions.test.ts` | hit@5 sections ≥ 0,95, rappel@3 sections ≥ 0,90 |
| D6 | **Essais de bout en bout** sur trois moteurs, sans requête vers le site officiel | `scripts/e2e.ts` (Playwright, page synthétique au balisage officiel) | liens profonds, échappement de la saisie, saut des ponts : verts |

### Lot E — Riposte et cartes-concept ré-ancrées (lun. 30 nov. → mer. 9 déc.)

Ampleur estimée par section (PROBABLE) : 7 ripostes sur 15 reposent sur des sections stables, 6 sur des
sections à moitié remaniées, 2 sont à refaire (`rip-06` police, `rip-12` Europe) ; 11 citent une carte
statistique, à retirer. 18 des 53 appuis des cartes-concept sont de la prose, qui ne se cite plus.

| # | Tâche | Fichiers | Fait quand |
|---|---|---|---|
| E1 | **Outil de ré-ancrage** : remplace un id quand le texte est identique, signale le reste avec ses candidats | `scripts/reanchor-2026.ts`, `scripts/editorial-checks.ts` (règles des chiffres et des fragments, sorties des tests 2025) → `private/reanchor/` | une liste de relecture par entrée |
| E2 | **Riposte** : chaque liant re-prouvé sur le texte 2026, 1 ou 2 citations, cartes statistiques retirées | `data/2026/riposte.json` (chaque appui épinglé `{id, sha256}`), `src/pages/r/[slug].astro` | ≤ 15 entrées publiées, 0 chiffre non couvert |
| E3 | **5 cartes-concept** : chaque phrase re-prouvée | `data/2026/glossary.json`, `src/pages/mot/[slug].astro` | 0 affirmation non couverte ; couverture calculée |
| E4 | **Relecture D0.27** par l’utilisateur | — | ce qui n'est pas relu n'est pas publié |

### Lot F — Pages institutionnelles, gestes P0, personas, correctifs (lun. 7 → lun. 14 déc.)

| # | Tâche | Fichiers | Fait quand |
|---|---|---|---|
| F1 | `/exactitude`, `/methodologie`, `/licence`, `/confidentialite`, `/a-propos`, `/mentions-legales` | `src/pages/*/index.astro` | `/exactitude` publie version, comptes, méthode, **parts de citation mesurées**, les quatre portes non levées (D14.11) ; `/licence` distingue 2025 (CC) et 2026 (droits réservés) |
| F2 | Gestes P0 restants ; **garde de déploiement** : pas d'app complète sur l'apex sans la pièce P0.5 | `docs/discovery/captures/`, `decisions.md`, `scripts/build.ts` | P0.2, P0.3, P0.4, P0.5, P0.8 consignés |
| F3 | **Essais sur téléphones** sur l'hôte d'aperçu : WhatsApp, Telegram, Instagram, Android et iPhone | — | grille remplie pour accueil, fiche, riposte, carte ; une mesure de performance sur un vrai Android |
| F4 | **Session personas** sur l'app réelle (D14.8), non bloquante | `docs/discovery/13-tests-humains.md` | mesures Playwright archivées ; réserves publiées |
| F5 | Liste d'avant lancement du plan initial | — | `security-review`, `workers_dev: false`, Bot Fight Mode OFF, règle de limitation, build neutre aux portes |

### J — mardi 15 décembre 2026

Seconde bascule de l'apex, cette fois vers l'app. Un seul geste public : un message avec **une
riposte**. Critères : 111 fiches et tous les ponts répondent ; liens officiels au manifeste ; recherche
aux seuils ou chiffre publié ; ripostes et cartes relues ; LCP < 2,5 s, CLS < 0,1, accessibilité ≥ 95 ;
zéro tiers, zéro cookie ; **portes anti-fuite et de citation vertes**.

## Calendrier et gestes de l'utilisateur

| Butoir | Ce qui revient à l'utilisateur |
|---|---|
| ven. 13 nov. | valider le texte de la page d'attente ; lancer la bascule de l'apex |
| cette semaine si possible, ven. 4 déc. au plus tard | **P0.5** (déclaration LCEN) : l'apex est public sans mentions légales depuis le 9/9 |
| lun. 16 nov. | sonde 0 (15 min) ; autoriser le crawl local ; **Analytics Engine** (D15.13) |
| vers ven. 20 nov. | **trancher la politique de citation** sur les parts mesurées, avant le push du manifeste |
| dim. 22 nov. | P0.2 (charte) |
| ven. 4 déc. | P0.3, P0.4 |
| 5 → 8 déc. | relecture des ripostes et des 5 cartes (≈ 2 h 30) ; P0.8 |
| 9 → 11 déc. | essais sur deux téléphones, navigateurs intégrés compris |
| lun. 14 déc. | feu vert |
| janvier 2027 | nouvelle session en plan mode : mesure J → J+30 (bilan décalé à fin janvier à cause des fêtes), `/verifier`, « poser une question », gel du 1er mars |

**Si un lot glisse**, on coupe dans cet ordre : `/verifier`, balise de mesure, image d'aperçu par page,
nombre de cartes puis de ripostes (on publie ce qui est relu), surlignage (repli sur l'ancre), ponts par
identifiant (repli sur une mention générique). **On ne coupe jamais** : l'absence de reproduction
intégrale, l'attribution et le lien de chaque citation, « Site non officiel », `/exactitude`,
`/confidentialite`, `/licence`, les anciens liens qui répondent, les portes.

## Hors périmètre de la v1

- Page et carte image par mesure (remplacées par le lien profond officiel).
- Lecture intégrale de l'édition 2025 dans l'app ; comparatif public 2025 → 2026.
- Cartes statistiques, FAQ et « poser une question », 20 cartes-concept de plus, jeux, PWA.
- `/verifier` : avec des empreintes, il confirme une présence mais n'affirme jamais une absence.

## Réutilisé

- `scripts/aec-common.ts`, inchangé : `sha256` (l. 23), `normalizeText` (l. 32, la jointure par
  empreinte en dépend), `fetchDocument` (l. 109), `mapWithConcurrency` (l. 159), politique de crawl.
- `scripts/ingest.ts` : formule de `computeCorpusVersion` (l. 98) ; aides d'analyse HTML (l. 127-196).
- `scripts/diff.ts` : `diffAtoms` (l. 205-245), ids et empreintes seulement. `scripts/build-projection.ts` :
  `danglingTexts` (l. 246-264), rejoué sur le corpus privé.
- `scripts/watch-aec2027.ts` : forme des signaux et codes de sortie 0 / 3 / 1.
- `scripts/build.ts` : orchestrateur à étapes déclarées, drapeaux `--fast` et `--neutral`.
- `src/layouts/Base.astro`, `src/components/Reserved.astro`, `src/styles/`, `design/tokens*.json`.
- `eval/retrieval-core.ts` : normalisation, synonymes, configuration de recherche déjà mesurée.
- Les fichiers 2025 (`ingest.ts`, `verify-corpus.ts`, `recrawl.ts`, tests des données) restent tels
  quels : ils sont la preuve d'une archive gelée.

## Vérification de bout en bout

```
nvm use 24
npx tsc --noEmit && npx tsx --test scripts/*.test.ts && npx tsx scripts/contrast.ts   # les trois portes
npm run build:holding && npm run deploy:preview    # lot A : matrice des anciens chemins au curl
gh workflow list --all ; gh label list             # lot A : workflows actifs, labels présents
npx tsx scripts/ingest-2026.ts --from private/html/<horodatage> --out private/corpus/aec-2026.json
npx tsx scripts/verify-2026.ts --from private/html/<horodatage>     # empreintes identiques, repères qui atterrissent
npx tsx scripts/publish-2026.ts --report           # parts de mots publiées, par niveau, sans rien écrire
git ls-files -- private | wc -l                    # 0
npm run build && npm run a11y && npx tsx scripts/e2e.ts
```

Puis à la main : `curl -sI` sur l'apex, `www` et trois anciennes adresses ; cinq recherches sur un
téléphone ; un lien profond dans Chrome Android et Safari iOS ; un aperçu par type de page.

## Risques

| Risque | Parade |
|---|---|
| La courte citation s'apprécie au cas par cas | politique chiffrée, comptée et publiée ; rien n'est poussé avant la validation de l’utilisateur ; repli `--anchor-only` ; retrait prévu par D14.10 |
| Fuite du texte par l'outillage (sortie d'erreur, corps de PR, capture, image) | `dist/` construit sans `private/` ; portes anti-fuite ; rapports privés ; extraits coupés par défaut |
| L'analyseur et le navigateur divergent, ou l'anomalie cache du contenu | chaque nœud revendiqué ; recoupement par les pages de partie ; vérification dans un vrai DOM |
| La source bouge encore (10/9, 5/11, flux modifié le 7/11) | re-crawl hebdomadaire local, repères re-vérifiés, appuis épinglés par empreinte, repli sur l'ancre |
| Le surlignage échoue dans un navigateur intégré | ancre par défaut ; sonde 0 ; essais sur téléphones |
| `private/` n'existe que sur une machine | copie chiffrée hors dépôt après chaque collecte, si l’utilisateur le veut ; le manifeste permet de vérifier une restauration |
| Bascule de l'apex involontaire | jamais hors du terminal de l’utilisateur ; `--dry-run` en CI ; garde de mode sur `deploy` |
| 4,5 semaines, goulot = relectures et gestes P0 | ordre de coupe écrit ; butoirs datés ; table de correspondance lancée dès le deuxième jour du lot B pour dimensionner la relecture |

## Journal d'exécution

### Lot A, au 12 novembre 2026

Fait et vérifié :

- **A1, A2, A5** — commit `2642ca5`. La page d'attente est en ligne sur `beta.cestecritla.fr`
  (`noindex`) : `/` 200, anciens préfixes en 302 vers `/`, `/og`, `/diag`, `/data/slim.json` et
  `/mentions-legales` en 404, `Cache-Control` à valeur unique. Build 2,3 s, déploiement 16,1 s.
  171 tests à ce commit (173 en fin de lot) ; accessibilité : 12 contrôles sur 2 pages × 6 conditions, 0 échec.
- **A6** — `captures/2026-11-12/edition-2026/` : `observation.json`, `mentions-legales.txt`,
  `robots.txt` ; quatre pages brutes sous `private/captures/`, leurs empreintes au manifeste des tiers.
- **A7** — `decisions.md` (187 décisions, D0-D15), `14-risques.md`, `16-hypotheses.md`.
- **A8** — labels `recrawl`, `veille` et `corpus` créés ; les deux workflows planifiés réactivés ;
  le rappel hebdomadaire réécrit pour l'édition 2026 et rendu insensible à un label manquant.
  **Prouvé après le push** : lancé à la main, le rappel a ouvert l'issue n° 1 avec le nouveau texte ;
  elle est fermée, relevé du jour en commentaire, pour que celle du lundi s'ouvre.
- **A9** — `CLAUDE.md`, `README.md`, `LICENSE`, `data/LICENSE`, `data/badge.json`, `.gitignore` ;
  porte `private/` dans `scripts/check-repo.test.ts` ; description du dépôt GitHub remplacée, avec
  l'accord de l'utilisateur.
- **Poussé le 12/11/2026**, avec l'accord de l'utilisateur, qui a validé le texte de la page
  d'attente : trois commits (`2642ca5`, `01544b3`, `5671c99`). CI verte sur les deux builds, dont
  les nouvelles étapes (build d'attente, tests rejoués dessus, déploiements à blanc, accessibilité).

Non fait, et pourquoi :

- **Montée de version des actions GitHub** (`checkout` et `setup-node` sont en v4, la v7 est
  sortie) : trois versions majeures d'un coup ne se vérifient qu'en poussant ; à faire sur une
  branche, où la CI le prouve.
- **`data/2025/`** : le déplacement de l'archive est la tâche B1.

- **A3 — bascule de l'apex, faite par l'utilisateur le 12/11/2026 à 17:25 UTC.** Dans son terminal,
  wrangler a listé les deux domaines comme attachés à `aec-spike-share` et demandé confirmation
  avant de les reprendre ; le garde-fou avait vérifié que `dist/` était la build d'attente.
  Vérifié à 17:28 UTC sur `cestecritla.fr` et `www` : `/` 200, anciens préfixes en 302 vers `/`,
  `/og`, `/diag`, `/data/slim.json`, `/data/stat-cards.json` et `/mentions-legales` en 404 ; la page
  est identique, à l'octet près, à celle de l'hôte d'aperçu et de la build locale ; plus aucune
  trace de « Texte du programme », de la mention CC ni de `programme2025`. Pièce :
  `captures/2026-11-12/edition-2026/apex-takeover.json`.

- **A4 — surfaces de septembre retirées le 12/11/2026**, avec l'accord de l'utilisateur pour
  chacun des quatre groupes : `aec-spike-share`, `aec-proto`, `aec-lab-turnstile`, `aec-lab-aig`,
  `aec-lab-budget`, `aec-lab-fts` et sa base D1, `aec-lab-fw-astro`, `aec-lab-fw-react`. Vérifié :
  `proto.cestecritla.fr` et `lab.cestecritla.fr` n'ont plus d'enregistrement DNS ; il ne reste sur
  le compte que `cestecritla` et `cestecritla-preview`. Le code de chacun reste dans `prototypes/`.
  Pièce : `captures/2026-11-12/edition-2026/surfaces-retired.json`. Non touchés, à vérifier au
  tableau de bord : le widget Turnstile du labo et sa passerelle AI Gateway.

**Le lot A est clos.** En attente d'un geste de l'utilisateur, sans bloquer le lot B :
- **P0.5** — déclaration LCEN : l'apex est public sans mentions légales depuis le 9/9.
- **D15.13** — Analytics Engine, avant tout déploiement de l'app.

### Quatre écarts entre le plan approuvé et ce qui a été fait

1. **La page d'attente est un Worker sans script.** Le plan la déployait par le Worker de l'app. Le
   premier déploiement jamais tenté a échoué sur « You need to enable Analytics Engine » (D15.13) :
   la page qui remplace l'app ne doit dépendre de rien dont l'app dépend. D'où
   `wrangler.holding.jsonc` et `scripts/deploy.ts`, qui choisit la configuration d'après la build.
2. **Treize décisions, pas douze** : D15.13 consigne ce constat. Le journal en compte 187.
3. **Les comptes par nature et le recouvrement sont PROBABLES**, pas VÉRIFIÉS : ils ont été mesurés
   une fois, par un outil non conservé (définition du registre des hypothèses). Le lot B les re-mesure.
4. **Les pages brutes du livre ne sont pas encore conservées.** Les garder demande la collecte de
   35 requêtes, qui attend l'accord prévu au lot B ; le lot A n'a relevé que le sommaire, les mentions
   légales, la page « Découvrir » et le flux.

### Un effet de bord de la bascule, relevé en la vérifiant

Le spike envoyait `X-Robots-Tag: noindex` sur toutes ses réponses : l'apex n'avait donc jamais été
indexable. La page d'attente, elle, ne portait aucune consigne — la bascule a ouvert l'indexation
sans que personne l'ait décidé, alors que le playbook ne l'ouvre qu'à J-3, pages légales en place
(`12-positionnement-lancement.md` §9.4.3). Corrigé le jour même : la page d'attente porte
`<meta name="robots" content="noindex">`, un test le garantit, et l'hôte d'aperçu sert la version
corrigée. **L'apex a été redéployé le soir même, avec l'accord de l'utilisateur** : la balise est en
ligne sur `cestecritla.fr` et `www`. 174 tests.

### Lot B, au 12 novembre 2026

L'utilisateur a demandé d'enchaîner les lots jusqu'au site complet (« continue jusqu'à ce que le
site soit complet »), ce qui vaut accord pour la collecte de 35 requêtes. Deux garde-fous restent :
**rien de ce qui dérive du texte 2026 n'est poussé ni déployé avant que l'utilisateur ait vu les
parts mesurées** (D15.7), et la bascule de l'apex reste son geste. Le travail se fait sur la
branche locale `edition-2026`, sans amont : un `git push` par habitude ne publie rien.

Fait et vérifié :

- **B2, collecte** — `scripts/crawl-2026.ts`, une passe le 12/11/2026 à 19:31 UTC : 35 requêtes,
  0 reprise, 35 réponses 200, 6,4 Mo sous `private/html/20261112T193102Z/` (hors dépôt).
- **B2, analyse** — `scripts/aec26-source.ts` (analyseurs purs), `aec26-core.ts` (identifiants,
  empreintes, recoupements), `ingest-2026.ts` (hors ligne). **VÉRIFIÉ** : 6 parties, 23 chapitres,
  111 sections ; 107 mesures clés + 881 mesures + 81 sous-mesures = **1 069 = chiffre officiel** ;
  119 paragraphes de section, 6 de partie, 4 de chapitre ; introduction : 8 intertitres et
  13 paragraphes. Les trois énoncés de la structure concordent (sommaire, pages de partie, pages de
  chapitre). Ces comptes remplacent les mesures PROBABLES du lot A.
- **Trois faits de balisage que le relevé du lot A n'avait pas vus** :
  1. les sous-mesures ne sont pas imbriquées dans leur mesure : elles sont dans un `<li>` sans
     classe, frère du `li.mesure` qui les précède (18 fois, 81 sous-mesures) ;
  2. le chapitre Europe (`p6c1`) porte une introduction propre de 4 paragraphes
     (`main > section.chapitre`) et ses 4 sections n'ont pas de mesure clé ;
  3. le texte contient 15 traits d'union conditionnels (U+00AD), 4 accents non composés (hors NFC)
     et un caractère de contrôle U+0085 dans un paragraphe : conservés tels quels, listés dans
     `meta.anomalies` du corpus privé.
- **B3, repères de lien** — `scripts/locator.ts`. Un repère est le plus court préfixe de 4 à 8
  mots, unique dans toute la page du chapitre, jamais plus de la moitié de la proposition.
  **Trouvé en vérifiant, et corrigé** : un repère qui s'arrête juste avant une espace fine
  insécable (U+202F, celle de « prix : ») s'arrête, pour Unicode, au milieu d'un mot ; Chromium,
  Firefox et WebKit refusent alors tous les trois la correspondance (6 liens sur 1 014). Le calcul
  utilise désormais le découpage en mots d'Unicode (`Intl.Segmenter`).
- **B4, publication** — `scripts/aec26-publish.ts`, `publish-2026.ts`, `data/2026/exposure-policy.json`,
  `data/2026/NOTICE.md`. Le manifeste ne porte, par élément, qu'un identifiant, une nature, une
  empreinte, un nombre de mots, et pour les propositions un incipit (mesures clés) et un repère.
  Refus : clause de licence changée, plafond dépassé, citation épinglée périmée, prose citée.
- **B5, vrai navigateur** — `scripts/verify-2026.ts`, pages servies depuis le disque, scripts
  coupés, toute autre requête annulée. **VÉRIFIÉ sur trois moteurs** (Chromium 153, Firefox 155,
  WebKit 26.6) : les 1 219 éléments ré-extraits dans le DOM ont la même empreinte que l'analyseur
  Node, et **les 1 014 liens profonds atterrissent** sur la bonne proposition. Témoins : un repère
  qui ne correspond à rien ne fait pas défiler la page ; l'ancre seule amène le titre de section.
  À savoir : scripts coupés, WebKit ne défile vers le texte qu'une demi-seconde après `load`.
- **B6, portes anti-fuite** — `scripts/leak-scan.ts`, `leak.test.ts`. Structure (en CI, sans
  corpus) : aucun champ où loger une phrase, parts recalculées depuis le fichier, plafonds tenus.
  Contenu (en local) : aucune fenêtre de neuf mots consécutifs de l'édition 2026 dans ce qui a
  changé depuis le gel `16023da`, ni dans `dist/`, ni dans les messages de commit ; 21 300 fenêtres,
  951 éléments sur 1 219 couverts. **Limite dite** : l'édition 2026 reprend mot pour mot des phrases
  de l'édition 2025 et des livrets 2022 déjà présents dans `data/` ; la porte ne peut pas les
  distinguer de leurs jumelles et ne les compte pas.
- **B7, correspondance** — `scripts/id-map.ts`. **VÉRIFIÉ** (outil conservé) : sur 837 propositions
  de 2025, 181 identiques, 115 à la ponctuation près, 198 proches, 170 remaniées, 173 sans
  équivalent ; 87 sections de 2025 sur 89 ont au moins une section héritière (76 une seule, 8 deux,
  3 trois ou plus), 69 gardent leur titre. La table complète reste sous `private/` ; le fichier
  public ne donne que section → section(s).
- **B8, veille** — `scripts/watch-source.ts` (six signaux, hors ligne par défaut, `--live` = cinq
  requêtes) et `scripts/recrawl-2026.ts` (compare par ancre officielle, liste les appuis épinglés
  cassés, n'écrit rien). Rejoués hors ligne : aucun changement.
- **Garde de déploiement** — `scripts/deploy.ts` refuse de déployer l'app où que ce soit, hôte
  d'aperçu compris, tant que `validated_on` est vide dans la politique de citation.
- Portes : `tsc` 0 erreur, **218 tests**, contraste 0 échec, ESLint propre.

Parts mesurées sous la politique par défaut (repères de 4 à 8 mots pour toutes les propositions,
incipit de 4 à 8 mots pour les mesures clés, jamais plus de la moitié d'un élément) :

| Niveau | Éléments | Mots | Part des 24 451 mots des propositions |
|---|---|---|---|
| Incipits visibles (mesures clés) | 101 | 724 | 2,96 % |
| Repères de lien (dans les `href`) | 1 014 | 4 122 | 16,86 % |
| Citations entières | 0 | 0 | 0 % (lot E) |
| **Couvert, chaque élément compté une fois** | | **4 439** | **18,15 %** |
| Propositions à deux mots près d'être entières | 0 | | |

Curseurs, mesurés : repères seulement pour les mesures clés et les citées → 2,96 % ; plancher de
3 mots → 15,09 % ; de 5 mots → 21,14 % ; aucun repère (`--anchor-only`) → 2,96 %.
55 propositions n'ont pas de repère (51 trop courtes, 4 sans préfixe unique) : leur lien s'arrête
à l'ancre de la section. S'y ajoutent les 140 titres officiels affichés (1 054 mots).

Non fait, et pourquoi :

- **B1** (déplacer l'archive 2025 sous `data/2025/`) : écarté. La porte anti-fuite compare au gel
  `16023da` ; déplacer 17 fichiers ferait passer leur contenu pour du texte nouveau, sans rien
  apporter au produit.
- **Sonde 0** (ouvrir un lien profond sur de vrais téléphones) : geste de l'utilisateur. Les trois
  moteurs de bureau sont couverts par B5.
- **Veille en direct** (`watch-source.ts --live`) : non lancée, la collecte date du jour.

### Lots C et D, au 12 novembre 2026

Fait et vérifié :

- **C1** — `src/lib/edition.ts` lit le manifeste public et rien d'autre ; `src/lib/archive-2025.ts`
  ne garde de l'édition 2025 que ses identifiants, pour les ponts. `src/lib/corpus.ts` et
  `SectionVerbatim.astro` sont supprimés : l'app n'affiche plus le texte 2025.
- **C2** — kit de chaînes **v0.6.0** (462 chaînes) lu par un `t()` typé (`src/lib/strings.ts`) :
  une clé absente est une erreur de compilation. Les chaînes d'attribution ne nomment plus de
  licence CC ; familles nouvelles `bridge.*`, `pointer.*`, `quote.*`, `method.*`.
- **C3** — accueil : recherche, puis sommaire entier (6 parties, 23 chapitres, 111 sections),
  utilisable sans JavaScript.
- **C4** — 111 fiches `/s/<id>/` : titres officiels, contenu de la section en nombres, incipit de la
  mesure clé (attribué, lié), un lien par proposition. Le `href` écrit est l'ancre de section ; le
  repère voyage dans `data-fragment` et n'est ajouté que si `document.fragmentDirective` existe.
- **C5** — **974 ponts** statiques (`/s/`, `/m/`, `/a/` avec un identifiant 2025), `noindex`, une
  seule formulation pour tous. `/p/` et `/res/`, sans équivalent, sont les deux seuls préfixes
  redirigés (302).
- **C6** — `scripts/site.test.ts` sur `dist/` : liens internes, liens officiels tous au manifeste,
  seuls mots du programme = titres, incipits du manifeste, citations listées ; aucune page ne cite
  plus qu'elle ne dit ; rien du texte dans une description, un aperçu ou le JSON-LD.
  `scripts/app-voice.ts` donne aux portes une seule définition de « notre voix ».
- **C7** — **coupé** (D15.14) : pas de balise de mesure en v1. L'app est déployée avec
  `wrangler.static.jsonc` (l'ancienne configuration de la page d'attente, renommée).
- **C8** — balises `og:` sur toutes les pages, une seule image d'aperçu, sans texte du programme
  (`scripts/og-image.ts` → `public/og/cestecritla-v1.png`).
- **C9** — table des routes à jour ; accessibilité **23 pages × 6 conditions, 0 échec**.
- **D1** — `src/lib/search-core.ts`, extrait du banc de septembre, tenu à sa sortie par un test.
  Ajout : les traits d'union conditionnels sont retirés avant le découpage.
- **D2** — `scripts/index-2026.ts` → `data/2026/search-index.json` : 1 069 propositions, 3 741
  racines, **12,6 racines par proposition**, aucun champ stocké ; 64 Ko gzip. Avec les titres et
  les repères : 90 Ko gzip, chargés à la première recherche, en cache un an.
- **D3, D4** — îlot de recherche : requête après `#`, jamais envoyée ; résultats groupés par
  section, construits par `textContent` ; chaque numéro de mesure est un lien profond.
- **D5** — `eval/questions-2026.json` (87 questions, 13 écartées et listées) et
  `data/2026/synonyms.json` (75 groupes, rédigés par nous). **VÉRIFIÉ** : bonne section première
  pour 81,6 % des questions, dans les trois premières pour 96,6 %, dans les cinq premières pour
  **98,9 %** (cible 95 %) ; rappel@3 **87,7 %** (cible 90 %, non atteinte, publiée telle quelle).
- **D6** — `scripts/e2e.ts`, trois moteurs : sans JS, recherche, saisie hostile, liens profonds,
  ponts, CSP. Avec `--real`, les pages officielles stockées répondent : **un clic sur une mesure
  atterrit sur cette mesure** dans Chromium, Firefox et WebKit.

Trouvé en chemin :

- La porte anti-fuite a signalé, au premier build, un incipit de huit mots suivi de « La France
  insoumise » : neuf mots à la suite, sur une mesure dont le neuvième est « la ». Le scanner sait
  désormais qu'une citation s'arrête aux points de suspension et à la fin d'un bloc.
- Scripts coupés, WebKit ne défile vers un fragment de texte qu'une demi-seconde après `load` :
  une vérification qui lit la position tout de suite déclare cassé un lien qui marche.

### Lots E et F, au 12 novembre 2026

- **E1** — `scripts/reanchor-2026.ts` : 62 des 100 appuis de septembre sont identiques ou proches
  dans l'édition 2026 (détail sous `private/reanchor/`).
- **E2, E3** — `data/2026/riposte.json` (15 réponses) et `glossary.json` (5 cartes), **réécrits sur
  le texte 2026** (D15.16) ; pages `/r/<slug>/` et `/mot/<slug>/` ; les anciens liens `/r/rip-NN`
  répondent. 33 citations entières, 646 mots (2,64 %). `scripts/editorial.test.ts` : appuis au
  manifeste sous leur empreinte ; en local, **chaque chiffre que nous écrivons figure dans un
  appui**. La porte anti-fuite a refusé une de nos phrases, qui reprenait une mesure presque mot
  pour mot hors de son bloc de citation : reformulée.
- **E4 — non fait, et c'est voulu** : la relecture D0.27 est un geste de l'utilisateur. Les vingt
  entrées sont `pending` ; chaque page l'affiche ; la garde de lancement refuse l'apex tant qu'il
  en reste une.
- **F1** — `/exactitude` (aucun chiffre tapé : `src/lib/facts.ts` les lit dans les fichiers de
  mesure ; les quatre portes de jugement de D14.11 y figurent comme non levées), `/methodologie`,
  `/licence` (2025 sous CC, archivée ; 2026 tous droits réservés, citée brièvement),
  `/confidentialite` (v1 : rien n'est mesuré), `/a-propos`, `/mentions-legales`.
- **F2** — le lancement est un fichier (`data/launch.json`, D15.15) et une règle testée
  (`scripts/launch.ts`). `/mentions-legales` n'écrit que l'hébergeur détient l'identité de
  l'éditeur que si la déclaration LCEN est datée.
- **F5, en partie** — relecture de sécurité du code client : aucun `innerHTML`, JSON embarqué
  échappé (`safeJson`), requêtes de même origine seulement, CSP par empreintes sans
  `unsafe-inline`, vérifiée par `e2e.ts`.

Non fait dans cette session, et pourquoi :

- **F3** (essais sur de vrais téléphones, navigateurs intégrés de WhatsApp, Telegram, Instagram) :
  geste de l'utilisateur, sur l'hôte d'aperçu — qui n'est pas déployé tant que la politique de
  citation n'est pas validée.
- **F4** (session personas sur l'app réelle) : non bloquante, non lancée.
- **Mesure de performance sur un vrai Android** : même raison que F3. Poids mesurés en local,
  gzip : accueil 7,9 Ko, fiche de section 4,8 Ko, 8,8 Ko de JavaScript en tout, 68,6 Ko de polices ;
  1 133 pages, 20 Mo.
- **Liens Désintox** : retirés de la v1 faute d'avoir été revérifiés (D15.16).

### État au 12 novembre 2026 au soir, et ce qui attend l'utilisateur

Tout le travail des lots B à F est **commité en local sur la branche `edition-2026`, non poussé,
non déployé**. `origin/main` et les deux hôtes publics sont inchangés depuis la clôture du lot A.

Dans l'ordre :

1. **Valider la politique de citation** sur les parts mesurées (D15.7), puis dater `validated_on`
   dans `data/2026/exposure-policy.json`. Curseurs : repères seulement pour les mesures clés et
   citées (20,1 % → 5,2 %), plancher des repères, index par section, `--anchor-only`.
2. **Pousser** (`git switch main && git merge --ff-only edition-2026 && git push`) puis
   **déployer l'aperçu** (`npm run build && npm run deploy:preview`).
3. **Relire les 20 textes** (D0.27) sur `beta.cestecritla.fr`, passer chacun à `reviewed`.
4. **P0.5** (déclaration LCEN) et **P0.8** (boîte `contact@`), puis dater les deux champs de
   `data/launch.json`.
5. **Sonde 0 et essais sur téléphones** (F3).
6. **Jour J** : `"apex": "app"` dans `data/launch.json`, `npm run build && npm run deploy` dans un
   terminal.

### Validation, push et aperçu, le 12 novembre 2026 au soir

- **D15.18** — l'utilisateur valide la politique de citation sur les parts mesurées (repères de
  lien pour toutes les propositions : 20,12 %) et demande de pousser, puis de déployer l'aperçu.
  Les étapes 1 et 2 de la liste ci-dessus sont faites.
- **Avant le push** : toutes les portes rejouées sur l'arbre validé (248 tests, dont la porte
  anti-fuite de contenu sur 128 fichiers changés depuis le gel et 1 144 fichiers construits ;
  accessibilité 23 pages × 6 conditions ; essais de bout en bout sur trois moteurs) ;
  `publish-2026.ts --check` et `index-2026.ts --check` : les fichiers publiés sont exactement ceux
  que produisent le corpus privé et la politique ; aucun fichier suivi sous `private/` ; aucun
  chemin absolu ni adresse dans les lignes ajoutées ni dans les messages de commit.
- **Poussé** : onze commits, `22035d0..1837890` sur `origin/main`.
- **CI verte sur `1837890`**, les deux jobs : portes (types, lint, build, tests, contraste,
  déploiements à blanc, build d'attente) et accessibilité (23 pages × 6 conditions, essais de bout
  en bout, relecture du site synthétique par un vrai navigateur).
- **Aperçu déployé** : `beta.cestecritla.fr` sert l'app (Worker `cestecritla-preview`, fichiers
  statiques, 1 142 fichiers, 22 s). **VÉRIFIÉ** au `curl` : 200 pour l'accueil, une fiche, une
  réponse, une carte, les pages institutionnelles, le plan du site et les deux fichiers de la
  recherche ; 307 puis 200 pour un pont demandé sans barre finale ; 302 vers `/` pour `/p/` et
  `/res/` ; 404 pour `/api/e` ; `X-Robots-Tag: noindex` sur tout ; `Cache-Control` à valeur unique
  (300 s pour le HTML, un an pour `/data/`, `/og/` et `/fonts/`) ; une fiche de section identique à
  l'octet près à la build locale. **VÉRIFIÉ** dans un vrai navigateur, sur l'hôte déployé : la
  recherche « smic » rend 8 sections, la première est « Augmenter les salaires » ; les liens
  reçoivent leur repère ; aucune violation de CSP ; aucune requête hors du domaine.
- **L'apex n'a pas bougé** : page d'attente sur `cestecritla.fr` et `www`, anciens chemins en 302.

Reste à l'utilisateur, dans l'ordre : relire les 20 textes sur l'aperçu (D0.27) ; P0.5 et P0.8, à
dater dans `data/launch.json` ; sonde 0 et essais sur téléphones ; puis le jour J.

### Le 13 novembre 2026 : ce plan est remplacé

L'utilisateur a redéfini le produit (D16.1 à D16.21) : demander, chercher, jouer. Ce qui restait
ici — relecture des 20 textes, P0.5, P0.8, sonde 0, essais sur téléphones, jour J — est repris
dans `PLAN-JEU.md` §9.1, sans date. La session personas F4 devient O5.
