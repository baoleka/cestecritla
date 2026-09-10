# Labo « do-budget » — compteur global de neurons (Durable Object) + rate limiting binding

Micro-prototype T7 (`PLAN-SESSION.md` §3.2 et T7). Worker **`aec-lab-budget`** déployé le 9/9/2026 sur
https://aec-lab-budget.baoleka.workers.dev (plan gratuit, aucune ressource payante). Aucun appel Workers AI :
`/ask` simule le coût d'une question Mistral (32 neurons) sans toucher au modèle (0 neuron consommé, ligne dans `neurons-log.md`).

## Ce qui est construit

| Brique | Fichier | Rôle |
|---|---|---|
| Logique pure du budget | `src/budget-core.ts` | Clé de jour UTC, plafond dur 8 500 (85 % de 10 000), `reserve` / `release` / `rollover`, aucune API Workers → testable avec `node:test` |
| Durable Object `NeuronBudget` | `src/neuron-budget.ts` | Stockage SQLite (`new_sqlite_classes`, seul backend disponible sur Free), **une seule instance** `getByName("global")`, méthodes RPC `reserve(cost)` / `release(cost)` / `status()` (+ `reset()` et `alarmAt()` réservés au labo), alarme à 00:00 UTC |
| Clé de rate limit | `src/client-key.ts` | HMAC-SHA256(secret, `jourUTC:ip`) tronqué à 16 octets : clé non inversible sans le secret, **rotation quotidienne** (le jour fait partie du message), jamais journalisée |
| Worker | `src/index.ts` | `/ask` = rate limiter → DO (cost 32) ; `/status` ; routes `/lab/*` pour mesurer le DO seul (`/lab/ask?cost=`, `/lab/release?cost=`, `POST /lab/reset`, `/lab/alarm`, `/lab/rl?n=&key=`) |
| Mesure CPU | `scripts/cpu-graphql.ts` | Requête GraphQL `workersInvocationsAdaptive` + `durableObjectsInvocationsAdaptiveGroups`, token OAuth de wrangler lu à l'exécution dans `~/.config/.wrangler/config/default.toml` (jamais affiché) |
| Tests | `test/budget-core.test.ts` | 11 tests `node:test` sur la clé de jour, le plafond, la remise à zéro sans attendre minuit |

Réponse de `reserve` : `{ allowed, used, day, remaining, budget, hardStop, resetAt }`. Refus = `503` + `Retry-After` (secondes jusqu'à 00:00 UTC) ; rafale = `429` + `Retry-After: 60`. Tout en `Cache-Control: no-store`, `nosniff`, `noindex`.

### Remise à zéro : la clé de jour, pas l'horloge

Le compteur est une ligne SQLite `{ day: "YYYY-MM-DD", used }`. Chaque opération commence par `rollover(state, Date.now())` :
si `state.day` n'est pas le jour UTC courant, le compteur vaut zéro. Il n'y a donc **aucune dérive possible** entre une alarme
et l'horloge : l'alarme (`setAlarm(nextUtcMidnight)`, reprogrammée à chaque déclenchement) ne sert qu'à faire basculer la ligne
de façon proactive pour que `/status` affiche 0 juste après minuit même sans trafic. Si l'alarme ne se déclenchait pas, la
première réservation du jour ferait la bascule. Tests : `2026-09-09T23:59:59.999Z` → refusé à 8 500, `2026-09-10T00:00:00.000Z`
→ accepté et `used = 32` ; bornes de mois, d'année et 29 février.

## Lancer

```sh
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"   # wrangler 4 exige Node >= 22
cd prototypes/labo-plateforme/do-budget
npm install
cp .dev.vars.example .dev.vars        # secret local du HMAC (valeur quelconque en dev)
npm test                              # node:test, 11 tests, ~0,3 s
npm run types && npm run typecheck    # Env généré par wrangler types (jamais écrit à la main) ; tsconfig.test.json pour les tests
npm run dev                           # http://localhost:8787 (DO et rate limiter simulés localement, la limite 20/60 s est appliquée)
npm run deploy                        # https://aec-lab-budget.baoleka.workers.dev
npx wrangler secret put RL_SALT_SECRET < fichier   # une fois : secret du HMAC (généré avec openssl rand -hex 32, fichier supprimé ensuite)
node scripts/cpu-graphql.ts 2026-09-09T12:55:00Z 2026-09-09T13:05:00Z   # CPU par invocation
```

Configuration (`wrangler.jsonc`) : `durable_objects.bindings` + `migrations[0].new_sqlite_classes = ["NeuronBudget"]` ;
`ratelimits: [{ name: "RATE_LIMITER", namespace_id: "1001", simple: { limit: 20, period: 60 } }]` (champ de premier rang
dans wrangler ≥ 4.36 ; `[[unsafe.bindings]] type = "ratelimit"` est l'ancienne graphie du même binding) ;
`observability.logs.invocation_logs = false` (D0.22). Déploiement : 5,24 Kio / gzip 2,43 Kio, démarrage 5 ms, version `5b0c0cc5-8f0a-49d8-8136-22756b740a65`.

## Mesures (9 septembre 2026, 12:55–13:03 UTC, colo CDG, `curl` 8.5 et `python3 http.client` depuis la machine de session)

Fichiers bruts : `docs/discovery/captures/2026-09-09/labo-do-budget/`.

### 1. Plafond dur du Durable Object — VÉRIFIÉ

`POST /lab/reset` puis 280 `/lab/ask` (cost 32) séquentiels sur une connexion persistante (`do-hardstop-run.txt`) :

| Résultat | Valeur |
|---|---|
| Réservations acceptées | **265** (265 × 32 = 8 480 ≤ 8 500) |
| Première refusée | la **266ᵉ** (8 480 + 32 = 8 512 > 8 500), corps `{"allowed":false,"used":8480,"remaining":20,…}` — identique au test unitaire |
| Refus suivants | 15/15 en 503, `used` reste à 8 480 (un refus ne consomme rien) |
| Durée totale | 12,6 s pour 280 requêtes |
| `/ask` au plafond (chemin applicatif) | `503`, `Retry-After: 39473` = secondes exactes jusqu'à 00:00 UTC (`ask-503-hardstop.txt`) |
| `release(32)` puis `/ask` | 200 : le remboursement (appel IA échoué avant facturation) rend la place |

Le rappel de la doc pricing : sur Free, 100 000 requêtes DO/jour, 100 000 lignes écrites/jour, 5 M lignes lues/jour, 5 Go ;
une réservation = 1 ligne lue + 1 ligne écrite → ~300 questions/jour = 0,3 % du quota d'écriture.

### 2. Atomicité sous concurrence — VÉRIFIÉ

`POST /lab/reset` puis **40 `/lab/ask` en parallèle** (`do-40-parallel.txt`) : 40 × 200, `/status` → `used = 1280` = 40 × 32
exactement. Aucune mise à jour perdue : la porte d'entrée du DO sérialise les RPC et `reserve` lit-écrit sans `await` entre les deux.

### 3. Rate limiting binding — VÉRIFIÉ, avec une **surprise** qui change l'architecture

Limite configurée : 20 requêtes / 60 s par clé (IP hachée + sel du jour).

| Test | Résultat | Fichier |
|---|---|---|
| 100 `/ask` séquentiels, **une connexion TLS par requête** (`curl` en boucle) | **100 × 200 en 16 s, aucun 429** | `ask-100-sequential.txt` |
| 40 `/ask` en parallèle en < 1 s, une connexion par requête | **40 × 200, aucun 429** | `burst-40-parallel.txt` |
| 40 `/ask` séquentiels sur **une connexion persistante** (comportement d'un navigateur) | **21 × 200 puis 19 × 429**, premier 429 à la 22ᵉ requête, 1,66 s | `ask-40-keepalive.txt` |
| `/lab/rl?n=30&key=a` : 30 appels `limit()` dans le même isolat, clé fixe | `111111111111111111111000000000` : **21 acceptés, refus à partir du 22ᵉ** | `rl-inprocess.txt` |
| même clé, 5 requêtes suivantes sur des connexions neuves | `00000`, puis `11111` ×4 : les autres serveurs du colo ont **leur propre compteur** | idem |
| clé `b` : 25 appels (21 acceptés), puis 6 connexions neuves **20 s plus tard** | 6 × `111` : **aucune convergence** observée en 20 s | idem |

Lecture : la doc dit « permissive, eventually consistent, intentionally designed to not be used as an accurate accounting
system », « the underlying counters are cached on the same machine that your Worker runs in, and updated asynchronously
in the background », « a unique limit per Cloudflare location » (https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/, lue le 9/9/2026).
Mesuré : le compteur est **par serveur** dans le colo (CDG en compte beaucoup) ; une connexion persistante retombe sur le même
serveur et est bien limitée (avec un dépassement d'une unité : 21 pour 20), mais un script qui ouvre une connexion par requête
est réparti entre serveurs et **n'est jamais limité** (140 requêtes en 30 s pour une limite de 20/min). La synchronisation
« eventually » n'a pas été observée en 20 s. Conséquence pour T7 :

- le binding est un **anti-rafale pour clients de bonne foi** (navigateur, connexion réutilisée) et un frein à zéro coût
  (l'appel `limit()` n'est **pas** compté comme sous-requête : 39 requêtes → 20 sous-requêtes dans la fenêtre keep-alive, les
  19 × 429 n'ont rien coûté ; CPU p50 0,64 ms) ;
- il **ne protège pas le quota** contre un script hostile : c'est le rôle du DO (global, exact) et de Turnstile (avant le DO) ;
- l'app doit garder l'ordre Turnstile → rate limit → DO, sans jamais compter sur le rate limit pour l'arithmétique.

Sémantique documentée : le compteur est local au colo (« per Cloudflare location ») ; un même `namespace_id` partagé par
deux Workers partage les compteurs ; périodes autorisées 10 ou 60 s ; la doc déconseille l'IP comme clé (NAT, réseaux
partagés) — retenue ici faute d'identifiant (zéro compte, D0.22), hachée et salée pour qu'elle ne soit ni journalisable ni
corrélable d'un jour à l'autre.

### 4. Latence de `/ask` (aller-retour DO) depuis cette machine — VÉRIFIÉ

| Chemin | n | p50 | p95 | min / max | Source |
|---|---:|---:|---:|---|---|
| `/lab/ask` (DO seul), connexion persistante | 280 | **44 ms** | **55 ms** | 29 / 120 ms | `do-hardstop-run.txt` |
| dont RPC DO vu du Worker (`Server-Timing: do;dur=`) | 280 | 18 ms | 22 ms | 5 / 91 ms | idem |
| `/ask` (rate limiter + DO), connexion persistante | 21 | 41 ms | 77 ms | 24 / 206 ms | `ask-40-keepalive.txt` |
| `/ask`, une connexion TLS par requête (`curl`) | 100 | 137 ms | 177 ms | 114 / 201 ms | `ask-100-sequential.txt` |
| `/status` (lecture DO), connexion persistante | 30 | 33 ms | 41 ms | 30 / 103 ms | `status-30-keepalive.txt` |
| 40 `/lab/ask` en parallèle (file d'attente du DO) | 40 | 296 ms | 382 ms | — / 403 ms | `do-40-parallel.txt` |
| Premier `/ask` après déploiement (DO à froid) | 1 | 139 ms | — | RPC DO 33 ms | `ask1.headers.txt` |

Wall p50 côté Cloudflare (GraphQL) : 19 ms pour `/lab/ask`, 27 ms pour `/ask`. Le DO ajoute ~18 ms de RPC ; un pic viral
de 40 requêtes simultanées met la 40ᵉ à 0,4 s (un seul objet, sérialisé) — acceptable pour ≤ 300 questions IA/jour, à
surveiller si le compteur devait servir à autre chose que l'IA.

### 5. CPU par requête (GraphQL `workersInvocationsAdaptive`, échantillonné) — VÉRIFIÉ

| Fenêtre | Requêtes (estim.) | CPU p50 | CPU p90 | CPU p99 | Wall p50 |
|---|---:|---:|---:|---:|---:|
| Tout le labo 12:55–13:05 | 513 | **0,72 ms** | 1,49 ms | **2,44 ms** | 19 ms |
| `/ask` ×100 + rafale 40 (rate limiter + DO) | 112 | 1,22 ms | 1,95 ms | 2,86 ms | 27 ms |
| `/lab/ask` ×280 (DO seul) | 277 | 0,65 ms | 0,82 ms | 1,19 ms | 19 ms |
| `/ask` ×40 keep-alive (21 ok + 19 × 429) | 39 | 0,64 ms | 1,06 ms | 1,55 ms | 18 ms |

Soit **4 à 15 fois sous** la limite de 10 ms du plan gratuit, HMAC compris ; 0 erreur, 0 `exceededResources`
(`graphql-all.txt`, `graphql-windows.txt`). Le dataset est échantillonné (112 comptées pour 140 envoyées).

### 6. Durable Objects sur le plan gratuit — VÉRIFIÉ (doc lue le 9/9/2026)

| Fait | Source |
|---|---|
| « Workers Free plan: Only Durable Objects with SQLite storage backend are available » | https://developers.cloudflare.com/durable-objects/platform/pricing/ |
| Requêtes **100 000 / jour**, durée 13 000 Go-s / jour ; lignes lues 5 M / jour, **lignes écrites 100 000 / jour**, 5 Go ; « If you exceed any one of the free tier limits, further operations of that type will fail with an error » ; reset 00:00 UTC | idem |
| 100 classes DO par compte (Free), 5 Go de stockage par compte (Free), 10 Go par objet SQLite, 1 000 req/s (limite douce) par objet, alarme ≤ 15 min | https://developers.cloudflare.com/durable-objects/platform/limits/ |
| Déploiement de la migration `new_sqlite_classes` accepté sur ce compte Free, DO opérationnel, secret `RL_SALT_SECRET` posé sans afficher sa valeur | `wrangler deploy` 9/9/2026, `wrangler secret list` |

CPU par requête DO : la page limites dit « 30 seconds (default) » sans colonne Free — PROBABLE que la limite Worker de 10 ms
ne s'applique pas au DO ; sans objet ici (la réservation coûte < 1 ms). Analytics DO (`durableObjectsInvocationsAdaptiveGroups`,
`durableObjectsPeriodicGroups`) : datasets présents dans le schéma, **vides** pour ce Worker 15 min après le run (latence ou non
alimentés sur Free) — HYPOTHÈSE, à requêter le lendemain avec `scripts/cpu-graphql.ts`.

### 7. Alarme — PROBABLE (non observée)

`/lab/alarm` → `{"alarmAt":"2026-09-10T00:00:00.000Z"}` juste après le premier accès : l'alarme est bien posée à minuit UTC.
Son déclenchement n'a pas été attendu ; la bascule est de toute façon garantie par la clé de jour (§ « Remise à zéro »).
À vérifier demain matin : `/status` doit afficher `used = 0`, `day = 2026-09-10` et `/lab/alarm` la nuit suivante.

## Ce que ce labo tranche pour `09-architecture.md`

1. **DO SQLite gratuit = compteur global exact** : plafond à 8 500 respecté à l'unité, atomique sous 40 requêtes parallèles,
   18 ms de RPC, < 1 ms de CPU, 1 ligne écrite par question (0,3 % du quota journalier). VÉRIFIÉ.
2. **Le rate limiting binding ne tient pas une rafale scriptée** (compteur par serveur, convergence non observée) ; il ne
   protège qu'un client qui réutilise sa connexion. Le budget vit dans le DO, l'anti-script est Turnstile. VÉRIFIÉ.
3. **Remise à zéro par clé de jour UTC**, alarme en confort : aucune attente de minuit pour la tester (11 tests). VÉRIFIÉ.
4. Clé de rate limit = HMAC(secret, jour:IP) : rien de rattachable n'est journalisé, ni dans le Worker (`invocation_logs: false`),
   ni dans le binding (compteur mémoire par serveur). VÉRIFIÉ par construction.

## Supprimer les ressources

```sh
cd prototypes/labo-plateforme/do-budget
npx wrangler delete --name aec-lab-budget      # supprime le Worker, son secret, le namespace DO et ses données SQLite
```

Le rate limiting binding n'a aucune ressource propre (rien à supprimer) ; aucune zone, aucun domaine, aucun KV ni D1 créés.
