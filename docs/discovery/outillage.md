# T0 — Smoke test de l'outillage (7 septembre 2026, 15:05-15:15 UTC)

Statut : ✅ OK · ⚠️ OK avec réserve · ❌ KO (fallback indiqué). Chaque ligne est VÉRIFIÉE en console sauf mention.

| # | Vérification | Statut | Preuve / détail |
|---|---|---|---|
| 1 | `claude-in-chrome` opérationnel | ❌ → fallback ✅ | Aucun outil `mcp__claude-in-chrome__*` exposé dans la session (extension non connectée). **Fallback installé et testé : Playwright + Chromium headless 153** dans le scratchpad (`shot.mjs` : capture 390×844 @2x + `getComputedStyle` + `document.fonts`). Utilisé pour les 3 captures PNG de J0. WebFetch reste proscrit pour le visuel. |
| 2 | Skill `design` rend Public Sans / Gowun Batang | ⚠️ PROBABLE | Le canvas est un Artifact ; la CSP des Artifacts autorise `fonts.googleapis.com` + `fonts.gstatic.com`. Les deux familles sont servies par Google Fonts (v21 / v12). **Sous-ensembles latin mesurés : Public Sans 400 = 14 632 o, Gowun Batang 400 = 16 236 o** (objectif < 100 Ko tenu). Rendu réel à confirmer sur le premier artboard T3 (échantillon typographique FR). Fallback : export PNG depuis un Artifact HTML via Playwright. |
| 3 | `curl` sur melenchon2027.fr | ✅ | `/programme2025/livre/` 200 en 0,19 s (122 Ko), `/mentions-legales/` 200, robots.txt : seul `/wp-admin/` interdit, sitemap déclaré. Serveur derrière Cloudflare, `fastcgi-cache: HIT`, pas d'ETag/Last-Modified (confirme §3.1). |
| 4 | `wrangler login` | ✅ | `npx wrangler@4.86.0 whoami` : OAuth token, compte **baoleka** (`f8b71fde…5317`), sous-domaine `baoleka.workers.dev`, scopes ai/d1/workers/kv/pages/queues/browser… **Pas de scope billing/subscriptions/ai-gateway** (API 10000 Authentication error sur ces trois). 5 Workers existants sur le compte, **0 zone** (aucun domaine rattaché). |
| 5 | Absence de moyen de paiement | ⚠️ À CONFIRMER PAR L'UTILISATEUR | Non vérifiable par l'API avec ce token (`/user/billing/profile` refusé). `user.has_pro_zones=false`, aucune zone payante. → Question posée en salve T0 ; capture du dashboard Billing → Payment info à archiver. |
| 6 | Quota neurons consommable | ✅ | Doc pricing : **10 000 neurons/jour gratuits, reset 00:00 UTC**. Appel réel `ai/run` sur Mistral Small 3.1 : 200 OK, `usage.neurons = 0,6163` pour 13 in / 4 out (formule 31 876 / 50 488 par M tokens **exacte**). Registre : `neurons-log.md`. |
| 7 | Catalogue Mistral sur Workers AI (jour J) | ⚠️ ÉCART AVEC LE PLAN | API `ai/models/search?search=mistral` → **2 modèles** : `@cf/mistralai/mistral-small-3.1-24b-instruct` (128k ctx, function calling, 0,351 $/0,555 $ par M) et `@cf/mistral/mistral-7b-instruct-v0.2-lora` (15k ctx). **`@cf/mistral/mistral-7b-instruct-v0.2` : « No route for that URI » (code 7000)** bien que « Beta » sur la page models ; v0.1 marqué « Deprecated ». Le LoRA v0.2 répond (« Salut (This » → bascule anglais) à **0,0126 neuron** pour 23 tokens (≈ 20× moins cher que Small 3.1). Embeddings : `bge-m3` et `embeddinggemma-300m` sont multilingues mais **non français** → exclus à l'exécution par D0.3 (le plan disait « aucun modèle d'embedding français » : reformulé, conclusion inchangée). |
| 8 | `cf-aig-collect-log` désactivable | ✅ (doc) | Doc AI Gateway : logs **activés par défaut**, contiennent « user prompt, model response… » ; en-tête `cf-aig-collect-log: false` par requête, ou Settings → Logs OFF au niveau du gateway. Preuve par capture prévue T7 (**avant** le premier appel via gateway). Les appels J0 sont passés en REST direct sans gateway. |
| 9 | Skills chargés | ✅ | `cloudflare`, `wrangler`, `durable-objects`, `workers-best-practices`, `turnstile-spin`, `web-perf`, `security-review`, `design` présents dans la liste des skills. `context7` et `github` MCP actifs. |
| 10 | Dépôt, squelettes, captures horodatées | ✅ | Dépôt `git@github.com:baoleka/cestecritla.git` (2 commits) ; `decisions.md`, `prompt-final.md`, `neurons-log.md` existants ; captures dans `docs/discovery/captures/2026-09-07/` (HTML + en-têtes + PNG + texte extrait, SHA-256 des HTML dans ce fichier ci-dessous). |
| 11 | Node / outils | ✅ | Node 20.20.1, npm 10.8.2, wrangler 4.86.0 (npx), curl 8.5, jq 1.7, Python 3.12, gh 2.45 ; pas de pnpm ; pas de Chrome système (Playwright fournit Chromium). |

## Captures horodatées (2026-09-07 15:08 UTC)

| Fichier | SHA-256 (16 premiers hex) | Contenu vérifié |
|---|---|---|
| `melenchon2027.fr_mentions-legales.html` | `cc2da66ecaed9df5` | Éditeur **La France insoumise, association loi 1901, 25 passage Dubail 75010 Paris** ; directeur de publication **Maxime Charpentier** ; hébergeur Scaleway ; licence **CC BY-NC-SA 4.0 International** sur « tous les textes de ce site » sauf mention contraire ; Cloudflare en frontal (DPF/clauses). Texte extrait dans `.txt`. |
| `melenchon2027.fr_programme2025_livre.html` | (fixture) | Page d'entrée du livre 2025, bandeau cookies Complianz, polices **Stack Sans** (corps, h1) + **Union gothic** chargées (VÉRIFIÉ par `document.fonts`), fond crème, violet, rouge. |
| `aec2027.fr.html` | `97e93e23abb3822a` | Page d'attente « les tortues sagaces sont en train de travailler », illustration Hello Melro, **Montserrat** (VÉRIFIÉ `getComputedStyle`), `theme-color #8B24D9`, og:url → `lafranceinsoumise.fr/avenir-en-commun-programme-2027`, og:image sur lafranceinsoumise.fr ; twitter:description parle de **« 9 chapitres »** (≠ 18 chapitres du livre 2025 : à surveiller, structure éditoriale différente probable). robots.txt : `Crawl-delay : 60`. |

## Écarts par rapport au plan, à répercuter

1. **T6** : le bench Mistral se fait sur **2 modèles** (Small 3.1 24B, 7B v0.2 LoRA), pas 3. Le tarif ×20 du LoRA rend une architecture « 7B LoRA pour le routage, Small 3.1 pour le liant » envisageable, à condition que le 7B tienne le français (indice négatif dès le smoke test).
2. **Visuel** : remplacer `claude-in-chrome` par Playwright headless partout où le plan le cite (T3, T4, T10, T12).
3. **Compte** : aucune zone Cloudflare → un `.fr` devra être acheté et rattaché (question T0), sinon tout se passe sur `*.workers.dev`.
4. **Veille aec2027.fr** : la mention « 9 chapitres » suggère une réorganisation éditoriale côté officiel ; comparer à chaque étape.
