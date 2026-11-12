# Plan — « C'est écrit là » après la réédition du programme (édition 2026)

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

En attente d'un geste de l'utilisateur :

- **A4** — retrait des surfaces de septembre, un accord par suppression. Constaté le 12/11 après la
  bascule : `aec-spike-share` existe encore (détaché des deux domaines, `workers_dev: true` et
  journaux d'invocation dans sa configuration) ; `proto.cestecritla.fr` et `lab.cestecritla.fr`
  répondent 200 ; six autres Workers de septembre sont sur le compte (`aec-proto`,
  `aec-lab-turnstile`, `aec-lab-aig`, `aec-lab-budget`, `aec-lab-fts` et sa base D1,
  `aec-lab-fw-astro`, `aec-lab-fw-react`).
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
corrigée. **Le redéploiement de l'apex attend l'accord de l'utilisateur.** 174 tests.
