# Labo « d1-fts5 » — recherche lexicale D1 + FTS5 et cache Q/R haché (T7)

Micro-prototype jetable du plan de session (T7, `docs/discovery/PLAN-SESSION.md`) : la variante
« serveur » de la présélection lexicale — un Worker gratuit interroge une base D1 dans laquelle les
868 unités du corpus (837 propositions + 31 paragraphes d'introduction et de partie, mêmes unités que
la variante A) sont indexées par **FTS5 avec `tokenize = 'unicode61 remove_diacritics 2'`** — plus la
table `q_cache` du cache questions/réponses de D0.22 (empreinte de la question normalisée → ids,
jamais le texte brut). Comparé à la variante A (MiniSearch dans le navigateur,
`eval/retrieval-results.json`) sur les 50 questions dorées + 20 glossaire de `eval/questions.json`.

Ressources créées (toutes sur le plan gratuit, 0 €) : base D1 `aec-lab-fts`
(`c33d31bf-f390-42e7-96be-98377e7f9d89`, région WEUR), Worker `aec-lab-fts`
(https://aec-lab-fts.baoleka.workers.dev). **0 neuron** : aucun appel Workers AI dans ce labo
(ligne ajoutée à `docs/discovery/neurons-log.md`).

## Fichiers

| Fichier | Rôle |
|---|---|
| `sql/schema.sql` | tables `chapters`, `sections`, `propositions`, table virtuelle `propositions_fts` (FTS5), `q_cache` + index TTL, `propositions_fts_v` (fts5vocab) |
| `scripts/build-sql.ts` | génère `sql/load-propositions.sql`, `sql/load-fts.sql` (git-ignorés, ~400 Ko chacun) et `src/stopwords.generated.ts` à partir de `data/aec-2025.json` via `buildProjection()` de `eval/retrieval-core.ts` ; vérifie que la normalisation du Worker et celle de la variante A coïncident sur les 48 302 tokens du corpus |
| `src/query.ts` | pipeline côté requête (normalisation, stopwords, racinisation légère, expressions MATCH, clé de cache) — miroir sans dépendance de `eval/retrieval-core.ts` |
| `src/index.ts` | Worker : `GET /search?q=&mode=and-or|or&x=&p=`, `GET /cache?q=`, `GET /stats` |
| `scripts/bench.ts` | rejoue les 89 questions notées (50 dorées, 20 glossaire, 19 adversariales avec ids) contre le Worker déployé, calcule rappel@5/@10, hit@5/@10, MRR, rappel section@3, ids interdits — mêmes définitions que `eval/retrieval.ts` — plus latence, lignes D1 lues, durée D1 ; teste le cache |
| `scripts/cpu-graphql.ts` | CPU par invocation via GraphQL `workersInvocationsAdaptive` (méthode de `06-partage.md` §2.3), jeton OAuth wrangler lu à l'exécution, jamais affiché |
| `results/` | sorties brutes horodatées (`01-schema.txt` … `15-cpu-per-minute.txt`, `bench-results*.{json,md}`, `cpu-graphql*.json`) |

## Lancer

```sh
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"   # wrangler 4 exige Node ≥ 22
cd prototypes/labo-plateforme/d1-fts5 && npm install
npm run build-sql          # depuis n'importe où : le script se replace à la racine du dépôt
npx wrangler d1 create aec-lab-fts        # une fois ; reporter database_id dans wrangler.jsonc
npm run db:schema && npm run db:load && npm run db:load-fts   # --remote, rows_written affichés
npm run types && npm run typecheck && npm run deploy
npm run bench              # results/bench-results.{json,md}, results/bench-window.json
npm run cpu                # results/cpu-graphql.json (attendre 1-2 min : l'analytics est en retard)
ONLY=fts-or npm run bench && ONLY=fts-or npm run cpu     # une configuration seule, fenêtre CPU propre
```

## Schéma (`sql/schema.sql`)

```sql
CREATE TABLE chapters (id TEXT PRIMARY KEY, part_id TEXT NOT NULL, number INTEGER NOT NULL, title TEXT NOT NULL);
CREATE TABLE sections (id TEXT PRIMARY KEY, chapter_id TEXT NOT NULL REFERENCES chapters(id), number INTEGER NOT NULL, title TEXT NOT NULL);
CREATE TABLE propositions (
  id TEXT PRIMARY KEY,           -- "c12-s01-k01" ; intro-pNN / partN-pNN pour les 31 paragraphes
  section_id TEXT REFERENCES sections(id),   -- NULL pour les paragraphes d'introduction / de partie
  chapter_id TEXT REFERENCES chapters(id),
  kind TEXT NOT NULL,            -- key_measure 87 / measure 706 / sub_measure 44 / intro_paragraph 27 / part_paragraph 4
  text TEXT NOT NULL,            -- verbatim (paragraphe measure_split fusionné, D1.8)
  prefix TEXT NOT NULL           -- contexte non affiché : titre du chapitre + titre de la section + 1re phrase du chapeau (+ intertitre)
);
CREATE VIRTUAL TABLE propositions_fts USING fts5(
  text, prefix, id UNINDEXED, section_id UNINDEXED, chapter_id UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);
CREATE TABLE q_cache (
  qhash TEXT PRIMARY KEY,        -- sha256(corpus_version + termes racinisés triés) — jamais la question
  ids TEXT NOT NULL,             -- tableau JSON d'ids (la réponse = des ids, jamais de prose)
  corpus_version TEXT NOT NULL,  -- invalidation au re-crawl (D1.3)
  created_at INTEGER NOT NULL,   -- secondes Unix (le jour suffirait dans l'app)
  expires_at INTEGER NOT NULL    -- created_at + TTL (7 jours ici)
);
CREATE INDEX q_cache_expires ON q_cache (expires_at);
CREATE VIRTUAL TABLE propositions_fts_v USING fts5vocab('propositions_fts', 'row');   -- statistiques seulement
```

Choix à retenir (occasions d'apprentissage) :

- **Table FTS5 autonome plutôt que `content=`** : une table FTS « external content » ou « contentless »
  s'appuie sur le `rowid` de la table source ; `propositions` ayant une clé `TEXT`, son rowid implicite
  n'est pas garanti stable (VACUUM). La copie du texte coûte 340 Ko (voir tailles), acceptable.
- **`bm25(propositions_fts, 1.0, 0.6)`** reproduit les boosts de champs de la variante A (text 1 /
  prefix 0,6). FTS5 renvoie des scores négatifs (plus petit = meilleur) ; le Worker les inverse.
- **Requête côté Worker = mêmes termes que MiniSearch** (stopwords, élisions, « 10 000 » → « 10000 »,
  racinisation légère), puis préfixe `"racine"*` sur les termes ≥ 3 caractères — c'est le substitut de
  la racinisation, absente de `unicode61` (le texte indexé n'est pas racinisé). Chaque terme est
  entre guillemets doubles : un mot nu `or` / `not` serait lu comme opérateur FTS5.
- **La clé du cache** est le SHA-256 de `corpus_version + termes racinisés triés` : deux formulations
  d'une même question partagent la clé, et l'empreinte ne permet pas de retrouver la question
  (D0.22). Aucun compteur de hits mis à jour dans le chemin chaud (une écriture par hit entamerait le
  quota) ; purge par `DELETE … WHERE expires_at < ?` en cron, pas à chaque requête.

## Mesures (9 septembre 2026, 12:52-13:06 UTC, colo CDG)

### FTS5 sur D1 : VÉRIFIÉ

| Fait | Statut | Preuve |
|---|---|---|
| D1 accepte `CREATE VIRTUAL TABLE … USING fts5(… tokenize = 'unicode61 remove_diacritics 2')` | **VÉRIFIÉ** | `results/01-schema.txt` : 6 requêtes, 15 lignes écrites, `num_tables` 10 (5 tables + 5 tables fantômes `_data`, `_idx`, `_docsize`, `_config`, `_content`) |
| Le tokenizer replie casse et diacritiques : `MATCH 'école'` = `'ecole'` = `'ÉCOLE'` = 53 documents | **VÉRIFIÉ** | `results/04-smoke-tokenizer.json` |
| `bm25()` avec poids par colonne, requêtes préfixe `"regl"* "vert"*`, `OR`, `fts5vocab` | **VÉRIFIÉ** | `results/05-smoke-queries.json` (4 710 termes distincts, 51 246 occurrences ; « de » dans 825 unités sur 868) |
| `dbstat` (taille par table) | **INFIRMÉ** (`no such table: dbstat`, code 7500) | `results/08-dbstat.json` ; tailles mesurées par `length()` sur les tables fantômes à la place |
| Doc D1 : « FTS5 module for full-text search (including fts5vocab) » parmi les extensions supportées | VÉRIFIÉ (lu le 9/9/2026) | https://developers.cloudflare.com/d1/sql-api/sql-statements/ |

### Chargement : écritures et taille (plan gratuit : 100 000 écritures/jour, 5 Go)

| Étape | Requêtes | Lignes écrites (`rows_written`, facturées) | `changes` SQLite | Durée SQL | Taille après |
|---|---:|---:|---:|---:|---:|
| `schema.sql` (5 tables + FTS + index + vocab) | 6 (+1) | 15 (+2) | 4 | 5,3 ms | 69 632 o |
| `load-propositions.sql` : 18 chapitres + 89 sections + 868 unités | 26 | **1 950** (= 2 × 975 : la ligne + son `sqlite_autoindex` de clé TEXT) | 976 | 44 ms | 499 712 o |
| `load-fts.sql` : 868 unités dans FTS5 | 22 | **868** (1 par document, bien que SQLite compte 3 029 `changes` dans les tables fantômes) | 3 029 | 50 ms | **1 150 976 o** |
| Total chargement | 55 | **2 835** = 2,8 % du quota journalier | | ≈ 15 s de `wrangler` en tout | |

`wrangler d1 info` à 13:04 UTC : `database_size` 1 150 976, `rows_written_24h` **2 850** (2 835 + 15 des 5 insertions du cache), `rows_read_24h` 121 085 (dont ~30 000 pour mes propres `/stats`, `dbstat`, vocab) — VÉRIFIÉ, `results/07-d1-info.json`.

Taille de l'index (VÉRIFIÉ, `results/09-fts-shadow-sizes.json`) : `propositions_fts_data` (segments de l'index inversé) **226 011 o** en 60 blocs ; `propositions_fts_content` (copie du texte + préfixe + ids) 340 380 o ; `_docsize` 4 361 o ; `_idx` 284 o. Différence de taille de fichier avant/après FTS : **651 264 o** (avec l'overhead de pages). Base complète : **1,15 Mo** = 0,02 % des 5 Go. Le fichier `--file` est envoyé par wrangler via l'API d'import (« Uploading … .sql ») ; 397 Ko et 378 Ko passés sans découpe (`ROWS_PER_INSERT` = 40, chaque INSERT < 25 Ko, sous la limite de 100 Ko par instruction).

### Qualité de rappel : 50 dorées + 20 glossaire (+ 19 adversariales avec ids), 0 neuron

Mêmes unités, mêmes définitions de métriques et même `coveringUnitId` que `eval/retrieval.ts`. Colonnes « 70 » = dorées + glossaire ; « 89 » = + adversariales avec ids.

| Configuration | rappel@5 (50 dorées / 20 glossaire / **70**) | rappel@10 (70) | hit@5 (70) | hit@10 (70) | MRR (70) | rappel section@3 (70) | interdits top 5 (89) | rappel@5 (89) |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| A-sans-synonymes (MiniSearch, navigateur) | 0,764 / 0,767 / **0,765** | 0,812 | 0,929 | 0,957 | 0,806 | 0,891 | 5 | 0,712 |
| **fts-or** (D1 FTS5, 1 requête OR, préfixe ≥ 3) | 0,781 / 0,754 / **0,773** | 0,818 | 0,943 | 0,943 | 0,822 | 0,891 | 5 | 0,738 |
| fts-and-or (AND puis repli OR) | 0,781 / 0,754 / 0,773 | 0,818 | 0,943 | 0,943 | 0,822 | 0,891 | 5 | 0,738 |
| fts-and-or-p4 (préfixe ≥ 4, comme A) | 0,756 / 0,738 / 0,751 | 0,806 | 0,929 | 0,929 | 0,803 | 0,891 | 4 | 0,709 |
| A-synonymes-0.25 (MiniSearch + alias, **retenue en T6**) | 0,831 / 0,767 / **0,813** | 0,876 | 0,986 | 0,986 | 0,819 | 0,927 | 5 | 0,785 |
| fts-and-or+syn (FTS5 + alias glossaire/FAQ en 3e requête, poids 0,25) | 0,803 / 0,767 / **0,792** | 0,844 | 0,957 | 0,957 | 0,859 | 0,912 | 5 | 0,772 |

Lecture (VÉRIFIÉ, `results/bench-results.json`) :

- **À réglage égal, FTS5 fait jeu égal avec MiniSearch** : sans synonymes 0,773 contre 0,765 de rappel@5 sur 70 ; avec synonymes 0,792 contre 0,813 (par question : 6 mieux, 8 moins bien, 56 identiques). Les échecs sont les mêmes (q021 « euthanasie », q050 « tourisme spatial », q054 « État planificateur », q057 « bifurcation écologique » : vocabulaire absent du texte, pas un problème d'index).
- **L'étage AND n'apporte rien** : sur 70 questions, l'expression AND retourne ≥ 1 document 10 fois et 10 documents 1 fois ; les métriques de `fts-and-or` et `fts-or` sont identiques à la 3e décimale, pour une requête D1 de plus (1,97 contre 1 par question). → INFIRMÉ comme heuristique utile ; **une seule requête OR avec bm25** suffit.
- Préfixe ≥ 3 caractères > préfixe ≥ 4 (0,773 contre 0,751) : les racines courtes (« loi », « age », « eau ») comptent en français.
- Le poids 0,25 des alias se reproduit en FTS5 par une **troisième requête** fusionnée dans le Worker (FTS5 ne pondère pas les termes à l'intérieur d'un MATCH, seulement les colonnes) : + 4 points de rappel@10, mais lignes lues × 2 et CPU × 2,3 (ci-dessous).

### Coût par question : lignes D1 lues, latence, CPU

| Configuration | requêtes D1 / question | lignes lues / question p50 / p95 / max | durée D1 p50 / p95 (ms, `meta.duration` = `sql_duration_ms`) | latence HTTP depuis la machine p50 / p95 (ms, keep-alive) |
|---|---:|---|---|---|
| fts-or | 1 | **118 / 474 / 614** | 0,8 / 1,6 | **50,8 / 70,2** |
| fts-and-or | 1,97 | 119 / 475 / 615 | 1,2 / 1,8 | 73,2 / 94,3 |
| fts-and-or-p4 | 1,97 | 113 / 461 / 519 | 1,1 / 2,2 | 66,4 / 79,9 |
| fts-and-or+syn | 2,61 | 245 / 831 / 1 127 | 1,7 / 2,8 | 82,1 / 100,8 |

- **`rows_read` ≈ 2 × documents appariés** (OR sur 3 termes préfixés « ehpad / personne / age » = 105 documents → 210 lignes ; AND sans résultat = 1 ligne). À 5 M lignes/jour, le plan gratuit absorbe **≈ 10 000 questions/jour au p95 (474)**, ≈ 40 000 à la médiane — 30 fois plus que les ~300 questions/jour du budget Mistral (§3.2). VÉRIFIÉ.
- Latence : Node avec connexion réutilisée **p50 51 ms / p95 70 ms** (`fts-or`, 70 questions) ; `curl` à connexion neuve p50 127 ms dont ≈ 71 ms de poignée TCP+TLS (`results/10-…`, `results/11-…`) ; route `/` sans D1 : 42 ms hors poignée, contre 61 ms pour une recherche → **le saut Worker → D1 coûte ≈ 15-20 ms**, le SQL lui-même < 2 ms. Série de 100 recherches identiques (`results/13-series-100-ehpad-or.json`) : p50 52 ms, p95 66 ms, 210 lignes lues à chaque fois (pas de cache de résultat côté D1). VÉRIFIÉ depuis la machine de session (fibre, CDG).
- **CPU par invocation (GraphQL `workersInvocationsAdaptive`, VÉRIFIÉ, `results/cpu-graphql*.json`) :**

| Fenêtre | Requêtes (estimation échantillonnée) | CPU p50 | CPU p90 | CPU p99 | Wall p50 | Wall p99 |
|---|---:|---:|---:|---:|---:|---:|
| bench complet (4 configurations + cache, 12:59-13:00) | 408 (367 réelles) | 1,83 ms | 2,90 ms | 4,99 ms | 36 ms | 90 ms |
| `fts-or` seule (13:01:49-54, 90 requêtes) | 134 (90 réelles) | **1,66 ms** | 2,07 ms | **2,65 ms** | 21 ms | 43 ms |
| `fts-and-or+syn` seule (13:02:20-30, 90 requêtes) | 89 | **3,84 ms** | 4,93 ms | **7,68 ms** | 77 ms | 131 ms |
| série de 100 recherches identiques `mode=or` (13:05:00-06, minute entière) | 103 (100 réelles) | 1,40 ms | — | 3,50 ms | 22 ms | 33 ms |

  Une recherche FTS5 à une requête tient **6 fois sous la limite de 10 ms** du plan gratuit (D4.1 : satori en coûtait 14 à 75 fois plus). Trois requêtes D1 + fusion + sérialisation d'une réponse verbeuse (`hits`, `queries`) montent à 7,7 ms au p99 : dans l'app, renvoyer les ids seuls et limiter à deux requêtes. `sum.requests` de ce jeu de données est une **estimation** (échantillonnage adaptatif : 134 affichées pour 90 envoyées) ; les quantiles sont les valeurs à retenir. Aucune erreur (0 `errors`, un seul statut `success`, pas de tranche `exceededResources`) sur ≈ 720 invocations réelles du labo (`results/15-cpu-per-minute.txt`).

### Cache Q/R (`/cache`, VÉRIFIÉ, `results/bench-results.md`)

| Appel | Résultat | Lignes lues / écrites | Latence (ms, 5 questions) |
|---|---|---|---|
| 1er (clé absente) | `miss` : recherche (2 requêtes) + `INSERT OR REPLACE` | 0 lues sur `q_cache` / **3 écrites** (la ligne + autoindex de `qhash` + index `q_cache_expires`) | 113-134 |
| 2e (même question) | `hit` : un `SELECT` par `qhash` | **1 lue / 0 écrite** | 42-60 |

Coût à 500 questions/jour toutes différentes : 1 500 écritures/jour = 1,5 % du quota ; un hit coûte 1 ligne lue et évite les ~200 lignes de la recherche et la latence D1 de celle-ci. Ce que la table contient : une empreinte hexadécimale, des ids, une version de corpus, deux horodatages ; pas d'IP, pas de texte (D0.22). Les entrées hostiles (`" OR 1=1 --`, `NEAR(a b) *`, question de stopwords seuls) donnent 200 avec 0 ou quelques ids, jamais d'erreur SQL : les termes sont réduits à `[a-z0-9]+` et cités entre guillemets (`results/14-hostile-inputs.txt`).

## Verdict pour l'architecture (T7)

1. **FTS5 sur D1 gratuit : VÉRIFIÉ et viable** — index de 1,15 Mo chargé pour 2 835 écritures, requête OR bm25 en 1 requête, ≈ 1,7 ms de CPU, 50 ms de latence bout en bout, qualité égale à MiniSearch à réglage égal.
2. **Mais il ne remplace pas la variante A** : MiniSearch côté client donne la même qualité à 0,4 ms sans réseau, sans quota de lectures, hors ligne, et l'index A pèse 61 Ko gzip (`retrieval-results.json`). D1 FTS5 prend son sens **côté serveur uniquement**, quand le Worker doit présélectionner sans faire confiance au client (route `/api/ask` : le Worker recalcule les candidats avant Mistral) — auquel cas le même index sert, et la même normalisation, générée du même `retrieval-core.ts`.
3. **Cache Q/R en D1 : conforme à D0.22 et bon marché** (3 écritures par question nouvelle, 1 lecture par hit) ; TTL à porter par `expires_at` + purge cron ; clé incluant `corpus_version`.
4. Règles pour l'app : une seule requête OR (pas d'étage AND), préfixe ≥ 3, alias en 2e requête seulement si le budget CPU le permet (mesuré : + 2,2 ms), réponse = ids seuls.

## Supprimer les ressources

```sh
cd prototypes/labo-plateforme/d1-fts5
npx wrangler delete                      # supprime le Worker aec-lab-fts (confirmation demandée)
npx wrangler d1 delete aec-lab-fts       # supprime la base (confirmation demandée) ; ou `npm run delete` pour les deux
rm -rf node_modules .wrangler dist worker-configuration.d.ts sql/load-*.sql
```

Texte : La France insoumise – L'Avenir en commun, CC BY-NC-SA 4.0 (`data/LICENSE`).
