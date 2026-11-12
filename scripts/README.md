# Scripts du corpus — ingestion, vérification, diff

> **Deux éditions, deux chaînes.** Ce fichier décrit d'abord la chaîne de l'**édition 2026**, la
> seule en service. La suite (« Installation », « Ingestion »…) décrit les outils de l'édition
> 2025 : ils ne peuvent plus être rejoués contre la source et restent comme preuve de la méthode.

## Édition 2026 — la chaîne en vigueur

Le livre-programme de 2026 est « tous droits réservés » (D15.1) : son texte **n'entre jamais dans
ce dépôt**. Il vit sous `private/`, ignoré par git, sur la seule machine de l'éditeur. Le dépôt
publie de quoi retrouver un passage et prouver une citation : `data/2026/` (voir son `NOTICE.md`).

| Étape | Commande | Lit | Écrit |
|---|---|---|---|
| Collecte (35 requêtes, **avec accord**, une fois par jour au plus) | `npx tsx scripts/crawl-2026.ts` | la source | `private/html/<horodatage>/` |
| Analyse hors ligne, recoupements, 1 069 = chiffre officiel | `npm run ingest:2026` | les pages stockées | `private/corpus/aec-2026.json` |
| Manifeste, citations, rapport d'exposition | `npm run publish:2026` (`-- --report`, `--check`, `--anchor-only`) | corpus privé, politique, textes éditoriaux | `data/2026/manifest.json`, `quotes.json` |
| Index de recherche (racines, aucun champ stocké) | `npm run index:2026` | corpus privé | `data/2026/search-index.json` |
| Second avis par trois navigateurs | `npm run verify:2026 -- --engines chromium,firefox,webkit --write` | pages stockées, manifeste | `data/2026/verification.json` |
| Correspondance 2025 → 2026 | `npx tsx scripts/id-map.ts` | les deux corpus | `private/id-map/`, `data/2026/id-map-2025.json` |
| Mesure de la recherche | `npm run eval:2026` | index, questions, synonymes | — |
| Veille | `npm run watch:source` (hors ligne ; `-- --live` = 5 requêtes) · `npm run recrawl:2026 -- --dry-run` | dernière collecte | — |

Règles tenues par des tests : aucune sortie d'outil n'imprime de texte du programme (identifiants
et nombres seulement) ; le site se construit sans `private/` (`scripts/check-repo.test.ts`) ; les
fichiers publiés n'ont aucun champ où loger une phrase et restent sous les plafonds de
`data/2026/exposure-policy.json` (`scripts/leak.test.ts`). La politique de crawl est celle
ci-dessous, inchangée.

Sur le site construit : `npm run build`, puis `npm test`, `npm run a11y`, `npm run e2e`
(`-- --real` pour répondre avec les pages officielles stockées).

---

Outils Node 24 / TypeScript strict (`npx tsx`) qui produisent et surveillent le jeu de données
`data/aec-2025.json`, extraction mot pour mot de _L'Avenir en commun, édition 2025_
(https://melenchon2027.fr/programme2025/livre/, textes sous CC BY-NC-SA 4.0, attribution
« La France insoumise – L'Avenir en commun »). Aucun texte n'est réécrit ni résumé.

Règle de crawl, non négociable : User-Agent `cestecritla/0.1 (+https://github.com/baoleka/cestecritla)`,
au plus 4 requêtes en parallèle, une seule passe, au plus 2 relances avec attente, URL canoniques
uniquement, jamais `ng.melenchon2027.fr`. Un crawl complet fait ~108 requêtes : on ne le lance pas
pour rien.

## Installation

```sh
npm ci
npx tsc --noEmit                          # typecheck
npx tsx --test scripts/ingest.test.ts     # tests des parseurs sur fixtures, hors ligne
```

## Ingestion (`ingest.ts`)

```sh
npx tsx scripts/ingest.ts                 # crawl complet → data/aec-2025.json, data/hashes.json, data/badge.json
npx tsx scripts/ingest.ts --rss           # + recoupement avec le flux RSS du site
npx tsx scripts/ingest.ts --out <chemin>  # écrit ailleurs (corpus candidat, voir « Diff »)
npx tsx scripts/ingest.ts --write-expected  # (re)mesure data/expected-invariants.json — seulement après relecture
```

L'ingestion échoue (code 1, rien n'est écrit) dès qu'un invariant est violé : structure du site
(1 introduction, 4 parties, 18 chapitres, chaque section avec paragraphe et mesure), compteurs de
`data/expected-invariants.json`, cohérence des URL canoniques. C'est voulu : mieux vaut un job rouge
qu'un corpus tronqué publié en silence.

Avec `--out /tmp/x/aec-2025.json`, les fichiers compagnons sont écrits à côté :
`/tmp/x/aec-2025.hashes.json` et `/tmp/x/aec-2025.badge.json`. Le fichier
`data/expected-invariants.json` reste toujours celui du dépôt.

`data/badge.json` suit le schéma « endpoint » de shields.io (`label` « corpus à jour au »,
`message` = date UTC du crawl) ; il n'est mis à jour qu'avec un corpus accepté, la date affichée
est donc celle du dernier changement de corpus publié.

## Vérification (`verify-corpus.ts`, `ingest.test.ts`)

```sh
npx tsx scripts/verify-corpus.ts                      # vérificateur indépendant (porte de CI)
npx tsx scripts/verify-corpus.ts --json rapport.json  # + rapport machine
```

`verify-corpus.ts` relit `data/aec-2025.json` sans rien importer de l'ingestion : invariants
recalculés depuis le JSON, empreintes, énumération indépendante des chapitres et comparaison mot
pour mot d'un échantillon de sections avec le site (≈ 29 requêtes). Il s'exécute sur le corpus du
dépôt : pour vérifier un corpus candidat, se placer sur la branche de la PR.

## Diff (`diff.ts`)

Le site n'envoie ni `Last-Modified` ni `ETag` : la fraîcheur est décidée sur les empreintes
SHA-256 (une par section, une par élément de texte) enregistrées par l'ingestion.

```sh
npx tsx scripts/ingest.ts --out data/aec-2025.next.json   # corpus candidat (ignoré par git)
npx tsx scripts/diff.ts                                    # compare avec data/aec-2025.json + data/hashes.json
npx tsx scripts/diff.ts /tmp/x/aec-2025.json --out rapport.md
```

Le rapport (Markdown, français, sur stdout et dans `--out`) liste les sections ajoutées,
supprimées et modifiées avec le détail par élément (ajouté, supprimé, modifié, renuméroté — les
identifiants étant positionnels, une insertion décale les suivants), les changements de structure,
les compteurs avant/après et la `corpus_version` avant/après. Chaque extrait est le texte source,
tronqué à 100 caractères. Dernière ligne : `AUCUN CHANGEMENT` ou `N SECTION(S) MODIFIÉE(S)`
(introduction et parties comptent comme des sections).

Codes de sortie : `0` aucun changement, `3` changements détectés, `1` erreur (fichier absent,
`data/aec-2025.json` et `data/hashes.json` incohérents, corpus candidat corrompu).

## Le job hebdomadaire (`.github/workflows/recrawl.yml`)

Tous les lundis à 06:00 UTC (ou à la demande, onglet _Actions_ → _Run workflow_), GitHub Actions :

1. installe Node 24 et les dépendances, typecheck, tests des parseurs ;
2. lance l'ingestion vers un dossier temporaire, invariants imposés ;
3. lance le diff avec le corpus commité, publie le rapport dans le résumé du run et en artefact
   `rapport-diff` ;
4. code `0` : ne fait rien ; code `3` : copie le corpus candidat dans `data/` et ouvre une pull
   request `recrawl/<date>` intitulée « Corpus : N section(s) modifiée(s) au <date> », corps = le
   rapport. Jamais de push direct sur `main`.

Aucun secret : `GITHUB_TOKEN` suffit (`contents: write`, `pull-requests: write`). Limite connue de
GitHub : une PR ouverte avec `GITHUB_TOKEN` ne déclenche pas les autres workflows du dépôt, la
vérification se fait donc à la main (ci-dessous).

## Quand la PR arrive

1. **Relire le diff** dans le corps de la PR (ou l'artefact `rapport-diff` s'il est tronqué) :
   chaque élément modifié montre l'extrait avant / après ; vérifier sur le site que le changement
   est réel en ouvrant l'URL de la section.
2. **Vérifier les invariants** : le tableau « Compteurs » doit s'expliquer par le diff (une mesure
   ajoutée = `mesure` + 1 = `propositions` + 1) ; sur la branche de la PR, lancer
   `npx tsx scripts/verify-corpus.ts` et `npx tsx --test scripts/ingest.test.ts`.
3. **Merger** (squash). `data/badge.json` porte la date du crawl ; la `corpus_version` change et
   doit être reprise sur la page méthodologie / exactitude de l'app.

## Si les invariants cassent

Le job est rouge, aucune PR n'est ouverte, `data/` n'est pas touché : le corpus publié reste le
dernier corpus vérifié. Ensuite, à la main :

1. Lire le journal du job : `INGESTION FAILED: …` nomme l'invariant violé (par exemple
   `counts.sections: expected 89, measured 90`, ou `c7-s03: h1 … differs from chapter nav title`).
2. Reproduire localement (`npx tsx scripts/ingest.ts --out /tmp/x/aec-2025.json`) et regarder le
   site : nouvelle section, section retirée, nouveau balisage, panne temporaire ?
3. Panne ou bug du site : ne rien faire, relancer le workflow plus tard.
4. Changement réel de structure : adapter les parseurs si besoin (fixtures dans `scripts/fixtures/`,
   tests dans `ingest.test.ts`), puis `npx tsx scripts/ingest.ts --write-expected` **après**
   relecture des nouveaux compteurs, et ouvrir une PR classique avec le nouveau corpus,
   `expected-invariants.json` et le rapport de `diff.ts`.

Ne jamais assouplir un invariant pour faire passer le job : c'est lui qui garantit que l'app ne
sert pas un programme incomplet.
