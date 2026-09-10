# Labo T7 « ai-gateway » — cache AI Gateway, neurons, logs OFF

Worker jetable `aec-lab-aig` (plan Free, binding Workers AI seul) qui appelle
`@cf/mistralai/mistral-small-3.1-24b-instruct` **à travers l'AI Gateway « aec »** (créé au
dashboard par l'utilisateur : authentifié, logs OFF, cache ON) et rapporte, pour chaque appel,
l'en-tête `cf-aig-cache-status`, le champ `usage.neurons` du corps et la latence.

Question du plan (PLAN-SESSION.md §3.2 et T7) : _un HIT du cache AI Gateway consomme-t-il des
neurons Workers AI ?_ La doc est muette. Réponse mesurée le 9 septembre 2026 : **non** (§3).

## 1. Ce que fait le labo

- `GET /q?text=…&n=K&key=…` : K appels **séquentiels** avec une entrée strictement identique
  (`messages` = une phrase neutre sur la météo, `temperature: 0`, `max_tokens: 40`) via
  `env.AI.run(model, input, { returnRawResponse: true, gateway: { id: 'aec', cacheTtl: 2592000, collectLog: false, skipCache } })`.
  Réponse JSON : par appel `cacheStatus`, `neurons`, `tokensIn/Out`, `latencyMs`, tous les
  en-têtes `cf-aig-*` ; `raw=1` renvoie le corps complet ; `skip=1` met `skipCache: true`.
- Le point d'entrée est protégé par un secret `LAB_KEY` (comparaison `crypto.subtle.timingSafeEqual`)
  pour qu'un scanner ne brûle pas le quota.
- `scripts/` (Node 24 + `tsx`, jeton OAuth wrangler lu à l'exécution dans
  `~/.config/.wrangler/config/default.toml`, jamais affiché) :
  - `neurons.ts` : consommation Workers AI par minute et par modèle (GraphQL
    `aiInferenceAdaptiveGroups`, `sum.totalNeurons`, `totalInputTokens`, `totalOutputTokens`) ;
  - `neurons-raw.ts` : lignes brutes par requête (`aiInferenceAdaptive`, avec `sampleInterval`) ;
  - `gateway-analytics.ts` : côté gateway (GraphQL `aiGatewayRequestsAdaptiveGroups`,
    dimension `cached`, `sum.cachedRequests`, tokens) ;
  - `worker-cpu.ts` : CPU par invocation du Worker (GraphQL `workersInvocationsAdaptive`, méthode de
    `docs/discovery/06-partage.md` §2) ;
  - `introspect.ts`, `introspect-fields.ts` : introspection du schéma GraphQL (c'est ainsi que le
    jeu de données a été trouvé : aucune page de doc ne le nomme) ;
  - `gateway-cache.ts` : jeu `aiGatewayCacheAdaptiveGroups` (vide sur ce compte, voir §3.6) ;
  - `gateway-settings.ts` : tentative de lecture REST de la configuration du gateway (403 attendu).

## 2. Lancer

```sh
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"   # wrangler 4 exige Node ≥ 22
cd prototypes/labo-plateforme/ai-gateway
npm install
npm run types && npm run typecheck        # worker-configuration.d.ts est généré (Env = { AI, LAB_KEY })
npm run deploy                            # https://aec-lab-aig.baoleka.workers.dev
npx wrangler secret put LAB_KEY < /chemin/vers/une-cle-aleatoire.txt
curl -s "https://aec-lab-aig.baoleka.workers.dev/q?n=1&raw=1&key=$KEY"   # 1 MISS, corps complet
curl -s "https://aec-lab-aig.baoleka.workers.dev/q?n=9&key=$KEY"         # 9 HIT attendus
npm run neurons -- 2026-09-09T12:50:00Z                                   # AVANT / APRÈS
npm run gateway-analytics -- 2026-09-09T12:50:00Z
```

Le gateway « aec » doit exister **avant** le premier appel, avec « Logs » désactivé (sinon le
prompt et la réponse sont journalisés par défaut, 100 000 logs sur Free).

## 3. Mesures du 9 septembre 2026 (VÉRIFIÉ, captures dans `docs/discovery/captures/2026-09-09/plateforme/ai-gateway/`)

### 3.1 Expérience 1 — 1 MISS puis 9 HIT sur la même entrée (12:54:18 → 12:54:36 UTC)

| Appel                           | `cf-aig-cache-status` | `usage.neurons` (corps) | tokens in / out | latence Worker → réponse |
| ------------------------------- | --------------------- | ----------------------: | --------------: | -----------------------: |
| 1 (`exp1-call01-raw.json`)      | **MISS**              |                  2,5375 |         21 / 37 |                 2 237 ms |
| 2                               | HIT                   |                  2,5375 |         21 / 37 |                   335 ms |
| 3 → 10 (`exp1-calls02-10.json`) | HIT ×8                |           2,5375 chacun |         21 / 37 |               46 à 64 ms |

- Le corps d'un HIT est la **relecture intégrale** de la réponse mise en cache, `usage.neurons`
  compris : ce champ vaut 2,5375 sur les 9 HIT. **`usage.neurons` n'est donc pas un signal de
  consommation sur un HIT** ; seule la source de facturation (GraphQL / dashboard) tranche.
- Formule tarifaire vérifiée à nouveau : 21 × 31 876 / 10⁶ + 37 × 50 488 / 10⁶ = 2,5375 (exact).
- Le modèle sous-jacent rapporté est `@cf/mistralai/mistral-small-3.1-24b-v2` ; le corps brut est
  au format OpenAI `chat.completion` (`choices[0].message.content`) **plus** un champ `response`
  et `usage.neurons` (voir `exp1-call01-raw.json`).
- En-têtes renvoyés par le gateway sur chaque appel (HIT comme MISS) : `cf-aig-cache-status`,
  `cf-aig-event-id`, `cf-aig-request-id`, `cf-aig-trace-id`, `cf-aig-step`, **`cf-aig-log-id`**.
  La présence d'un `cf-aig-log-id` **ne prouve pas** qu'un log a été stocké (identifiant émis
  quelle que soit la configuration) : la preuve « Logs vide » est au dashboard (§5).

### 3.2 Neurons Workers AI AVANT / APRÈS (GraphQL `aiInferenceAdaptiveGroups`)

Consommation du jour (00:00 UTC → 12:54:19 UTC), **avant** le premier appel du labo :
**133 requêtes, 5 386,2192 neurons** (`neurons-before.txt` ; toutes `requestSource = rest api`,
bench T6 de 08:24-08:27 UTC ; lignes à `sampleInterval = 1`, donc exactes à cet instant).

Appels du labo ayant atteint le modèle (MISS) : 4 (exp. 1 : 1 ; exp. 3 : 2 ; exp. 4 : 1), soit
2,5375 + 2,5693 + 2,5375 + 2,5375 = **10,18 neurons attendus** si les 11 HIT ne coûtent rien,
contre ≈ 38,1 neurons (15 × 2,54) s'ils coûtaient comme un MISS.

**Après** : à 13:31 UTC (37 min après l'expérience 1, 3 min après l'expérience 5), le jeu de
données Workers AI n'avait **encore ingéré aucune ligne** pour les minutes 12:54-13:29
(`neurons-after.txt` : `neurons.ts` et `neurons-raw.ts` à 0 ligne), alors que le jeu de données
du gateway (§3.3) montrait chaque requête en moins d'une minute. Le recoupement des neurons se
fait donc **au dashboard** (§5, point 3) ou en relançant `npm run neurons -- 2026-09-09T12:50:00Z`
plus tard dans la journée.

Deux limites de la méthode GraphQL, découvertes en séance — VÉRIFIÉ :

1. **Le jeu de données est échantillonné** (« Adaptive ») et peut renvoyer des totaux
   **transitoirement faux** : à 12:50 UTC les 133 appels T6 étaient présents un par un
   (`sampleInterval = 1`, 5 386,22 neurons) ; à 13:15 UTC la même requête groupée renvoyait
   **160 requêtes / 6 213,81 neurons** (lignes par minute arrondies à la dizaine, +20 %) ; à
   13:18 UTC elle renvoyait de nouveau 133 / 5 386,22, et les 75 lignes brutes
   (`aiInferenceAdaptive`, `sampleInterval` 1, 2 et 4) pondérées par leur `sampleInterval`
   redonnent **exactement 133 requêtes / 5 386,2196 neurons**. Méthode robuste : lire deux fois,
   et pondérer les lignes brutes par `sampleInterval` (`neurons-raw.ts`) plutôt que faire
   confiance à une seule lecture groupée. Le compteur du dashboard reste la référence de
   facturation.
2. **Latence d'ingestion > 20 min** pour Workers AI (contre < 1 min pour les analytics AI
   Gateway et ≈ 1 min pour `workersInvocationsAdaptive`).

Nota : le registre `neurons-log.md` totalisait 5 322,54 neurons pour les 133 appels T6 ;
l'écart de +63,7 neurons (+1,2 %) lu à 12:50 sur des lignes non échantillonnées reste
inexpliqué — PROBABLE (arrondi côté facturation), à recouper au dashboard.

### 3.3 Côté gateway (GraphQL `aiGatewayRequestsAdaptiveGroups`, lu à 13:04 UTC, `gateway-analytics-1254.txt`)

| Minute UTC     | `cached` | Requêtes | `cachedRequests` | tokens in / out attribués | durée p50 (gateway) |
| -------------- | -------- | -------: | ---------------: | ------------------------: | ------------------: |
| 12:54 (exp. 1) | 0        |        1 |                0 |                   21 / 37 |            1 346 ms |
| 12:54 (exp. 1) | 1        |        9 |                9 |                 **0 / 0** |               11 ms |
| 12:59 (exp. 3) | 1        |        1 |                1 |                     0 / 0 |               45 ms |
| 12:59 (exp. 3) | 0        |        2 |                0 |                   43 / 74 |              917 ms |
| 13:02 (exp. 4) | 1        |        1 |                1 |                     0 / 0 |               41 ms |
| 13:02 (exp. 4) | 0        |        1 |                0 |                   21 / 37 |            1 006 ms |
| **Total**      |          |   **15** |           **11** |                  85 / 148 |                     |

Le gateway n'attribue **aucun token** aux 11 requêtes servies depuis le cache et les sert en
11-45 ms (p50) contre 0,9-1,3 s pour les 4 appels au modèle ; les 85 / 148 tokens des MISS
concordent exactement avec les corps (21 + 22 + 21 + 21 / 37 × 4). Ces lignes étaient visibles
**moins d'une minute** après les appels. Ce jeu de données est **lisible avec le jeton
wrangler** (contrairement à l'API REST de configuration du gateway, 403 : `gateway-settings.ts`).
Analytics ≠ logs : ces agrégats existent avec Logs OFF et ne contiennent aucun prompt.

### 3.4 Expérience 3 — normalisation (12:59:44 → 12:59:48 UTC)

| Variante (`exp3-*.json`) | Entrée                             | Statut   |     neurons | tokens in |
| ------------------------ | ---------------------------------- | -------- | ----------: | --------: |
| a-control                | phrase identique                   | **HIT**  | (relecture) |        21 |
| b-trailing-space         | même phrase + une espace finale    | **MISS** |      2,5693 |        22 |
| c-lowercase              | même phrase, initiale en minuscule | **MISS** |      2,5375 |        21 |

Le cache est un **match exact sur le corps de la requête** (SHA-256) : une espace finale ou une
majuscule différente = un nouvel appel au modèle. Conséquence pour l'app : **normaliser la question
avant l'appel** (trim, espaces multiples → une, casse, apostrophes ’ → ', accents composés → NFC,
ponctuation finale) **et** ne mettre dans le corps que ce qui est stable (jamais d'horodatage, de
nonce, d'identifiant de session, de `metadata` variable). Le contexte de mesures injecté doit être
déterministe pour une question normalisée donnée (même ids, même ordre), sinon aucun HIT.

### 3.5 Expérience 4 — `skipCache: true` (13:02:30 UTC)

| Appel                                                   | Statut                    |     neurons |  latence |
| ------------------------------------------------------- | ------------------------- | ----------: | -------: |
| `exp4-skipcache.json` (`skip=1`)                        | **MISS** (pas « BYPASS ») |      2,5375 | 1 444 ms |
| `exp4-control-after-skip.json` (même entrée, sans skip) | HIT                       | (relecture) |   258 ms |

Via le binding, `skipCache: true` force un appel au modèle et renvoie **MISS** ; la valeur
« BYPASS » n'a pas été observée (elle correspond, dans la doc, à l'en-tête `cf-aig-skip-cache` de
l'API REST / au cache désactivé au niveau du gateway : HYPOTHÈSE, non testée). L'entrée en cache
survit à un `skipCache` (HIT juste après).

### 3.5 bis Expérience 5 — 100 HIT supplémentaires (13:28:31 → 13:28:46 UTC)

Pour que la lecture du compteur Workers AI soit sans ambiguïté malgré le bruit de ±1,2 % (§3.2),
20 invocations `n=5` sur la même entrée : **100 HIT, 0 MISS** (`exp5-100-hits-summary.txt`),
latence par appel min 32 ms / p50 53 ms / max 928 ms. Côté gateway
(`gateway-analytics-1328.txt`) : 100 requêtes, `cachedRequests = 100`, **0 token**, p50 12 ms.
CPU Worker pour ces invocations à 5 sous-requêtes IA (`worker-cpu-exp5.txt`) : p50 6,0 ms,
p90 9,3 ms, p99 12,2 ms, 0 erreur. Si un HIT coûtait comme un MISS, le compteur du jour devrait
monter de ≈ 254 neurons (100 × 2,54) ; s'il est gratuit, de 0.

**Total du labo** : 119 requêtes gateway (115 HIT, 4 MISS), 10,18 neurons attendus si les HIT
sont gratuits, ≈ 302 sinon.

### 3.6 Verdicts

| Fait                                                                                                                                                                     | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | Preuve                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Un HIT AI Gateway ne consomme pas de neurons Workers AI**                                                                                                              | **VÉRIFIÉ côté gateway** : les 11 requêtes servies depuis le cache ont 0 token attribué et une durée p50 de 11 ms, physiquement incompatible avec une génération de 37 tokens par un modèle 24B (1,0-2,2 s mesurés sur les 4 MISS) : aucune inférence n'a eu lieu, donc rien à facturer (les neurons sont calculés à partir des tokens de l'inférence, formule vérifiée). **PROBABLE côté compteur Workers AI** tant que le jeu GraphQL n'a pas ingéré la fenêtre (retard > 20 min, §3.2) ou que le dashboard n'a pas été lu (§5 point 3) | `gateway-analytics-1254.txt`, `exp1-*.json`, `neurons-before.txt` |
| Le gateway attribue 0 token aux requêtes servies depuis le cache                                                                                                         | VÉRIFIÉ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `gateway-analytics-1254.txt`                                      |
| `usage.neurons` d'un HIT = valeur relue, pas une consommation                                                                                                            | VÉRIFIÉ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `exp1-calls02-10.json`                                            |
| Cache = match exact ; espace finale ou casse ⇒ MISS                                                                                                                      | VÉRIFIÉ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `exp3-*.json`                                                     |
| `skipCache: true` ⇒ MISS (modèle appelé), entrée conservée                                                                                                               | VÉRIFIÉ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `exp4-*.json`                                                     |
| Le binding accepte `gateway.collectLog: false` (typé `GatewayOptions`, `@cloudflare/workers-types` 5.20260908.1) et l'appel réussit                                      | VÉRIFIÉ (types + appel 200)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `worker-configuration.d.ts`, `src/index.ts`                       |
| `collectLog: false` empêche le stockage du log                                                                                                                           | HYPOTHÈSE jusqu'à la capture « Logs vide » du dashboard (§5) ; le contrôle principal reste « Logs OFF » au niveau du gateway                                                                                                                                                                                                                                                                                                                                                                                                              | —                                                                 |
| Latence d'un HIT : 46-64 ms (Worker → gateway → Worker) contre 1,4-2,2 s pour un MISS                                                                                    | VÉRIFIÉ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `exp1-*.json`                                                     |
| CPU Worker : 3,2 ms p50 pour une invocation à 1 appel IA (401 et MISS compris), 15,4 ms pour l'invocation à 9 appels (artefact du labo : 9 sous-requêtes + JSON indenté) | VÉRIFIÉ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `worker-cpu.txt`, GraphQL `workersInvocationsAdaptive`            |
| La configuration du gateway n'est pas lisible avec le jeton wrangler (REST 403) ; ses analytics le sont (GraphQL)                                                        | VÉRIFIÉ                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `gateway-settings.ts`, `gateway-analytics.ts`                     |

Budget : 4 appels au modèle = 10,18 neurons (`usage.neurons` des MISS ; ≤ 400 autorisés) ;
119 requêtes gateway au total, 115 HIT.

Le jeu de données `aiGatewayCacheAdaptiveGroups` (`scripts/gateway-cache.ts`) est resté **vide**
sur toute la journée : il ne décrit pas ce cache de réponses (HYPOTHÈSE : cache de prompt côté
fournisseur) ; la dimension `cached` de `aiGatewayRequestsAdaptiveGroups` est la bonne source.

## 4. Ce que ça change pour l'app (T7 / prompt final §5 et §7)

1. Le cache AI Gateway est un **vrai étage gratuit** : un HIT coûte 0 neuron, 0 token, ≈ 50 ms.
   La matrice de dégradation « D1 cache → AI Gateway cache → Mistral » tient ; le cache D1
   (question normalisée hashée) reste utile pour compter et pour survivre à un changement de
   gateway, mais il n'est plus indispensable à l'économie de neurons.
2. **Normaliser avant d'appeler** (§3.4) et rendre le corps déterministe ; sinon le taux de HIT
   sera proche de 0 sur des questions tapées par des humains.
3. `cacheTtl: 2592000` (30 jours, maximum documenté) posé **dans le code** ; le corpus est
   versionné (D1.4) : changer la version du corpus ou le prompt système change le corps de la
   requête, donc la clé de cache : invalidation naturelle, aucune purge nécessaire.
4. Ne jamais lire `usage.neurons` d'une réponse HIT pour décrémenter le compteur global (DO à
   85 %) : ne compter que les MISS (`cf-aig-cache-status !== 'HIT'`).
5. Toujours `collectLog: false` dans le code **et** Logs OFF au dashboard (défense en profondeur) ;
   ne rien mettre dans `metadata` (cela irait dans les logs / analytics).

## 5. Preuve « Logs OFF » — à faire par l'utilisateur (le jeton n'a pas le scope AI Gateway)

Captures à déposer dans `docs/discovery/captures/2026-09-09/plateforme/` :

1. Dashboard Cloudflare → compte **baoleka** → **AI** → **AI Gateway** → gateway **aec** →
   onglet **Settings** : capture montrant le réglage **Logs** (« Collect logs ») **désactivé**
   (et **Cache** activé, TTL). Nom de fichier suggéré : `ai-gateway-aec-settings-logs-off.png`.
2. Même gateway → onglet **Logs** : capture montrant la liste **vide** alors que l'onglet
   **Analytics / Overview** affiche bien 119 requêtes le 9/9 entre 12:54 et 13:29 UTC
   (15 + 100), dont 115 « cached ». Fichier : `ai-gateway-aec-logs-empty.png`.
3. (Recoupement neurons, **c'est la lecture qui tranche**) **AI** → **Workers AI** → onglet
   **Usage** (ou « Overview »), modèle Mistral Small 3.1, le 9/9 : lire les neurons des tranches
   **12:00-13:00 UTC** (14:00-15:00 Paris) et **13:00-14:00 UTC**. Attendu si un HIT est gratuit :
   ≈ 7,6 puis ≈ 2,5 neurons (3 + 1 MISS) ; si un HIT coûtait comme un MISS : ≈ 33 puis ≈ 257.
   Total du jour attendu : ≈ 5 396 ± 65 (gratuit) contre ≈ 5 690 (payant). Fichier :
   `workers-ai-usage-2026-09-09.png`.

Les chemins de menu sont PROBABLES (libellés du dashboard non vérifiables depuis la session) ; les
chiffres à retrouver sont VÉRIFIÉS.

## 6. Supprimer les ressources

```sh
cd prototypes/labo-plateforme/ai-gateway
npx wrangler delete          # supprime le Worker aec-lab-aig et son secret LAB_KEY
```

Le gateway « aec » a été créé par l'utilisateur et sert à l'app : le conserver. Les entrées de
cache expirent d'elles-mêmes (TTL 30 jours) ; pour purger avant : dashboard → AI Gateway → aec →
Settings → Cache. Aucune autre ressource (ni KV, ni D1, ni DO) n'a été créée.

Fichiers générés et ignorés par git : `node_modules/`, `worker-configuration.d.ts`, `.wrangler/`,
`.dev.vars` (contient la valeur locale de `LAB_KEY`).
