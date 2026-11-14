# Registre de consommation Workers AI (session de découverte)

Budget session : ≤ 8 000 neurons (D0.7). Reset quotidien à 00:00 UTC. Tout appel LLM de la session passe par ce registre ; le reste en mocks.

Source du chiffre « Neurons » : le champ `result.usage.neurons` renvoyé par l'API `ai/run` (VÉRIFIÉ le 7/9/2026 : 13 in + 4 out sur Mistral Small 3.1 = 0,6163 neurons = 13 × 31 876 / 10⁶ + 4 × 50 488 / 10⁶, exact). À recouper avec le dashboard une fois par jour.

| Date/heure (UTC) | Étape | Modèle | Appels | Tokens in/out | Neurons (`usage.neurons`) | Cumul jour | Note |
|---|---|---|---|---|---|---|---|
| 2026-09-07 15:10 | T0 smoke test | `@cf/mistral/mistral-7b-instruct-v0.2` | 1 | — | 0 | 0 | **Échec** : `code 7000 No route for that URI` (modèle « Beta » dans la doc, absent du catalogue API et non routable sur ce compte) |
| 2026-09-07 15:10 | T0 smoke test | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 1 | 13 / 4 | 0,6163 | 0,62 | Appel REST direct (hors AI Gateway), prompt neutre « bonjour », 0,61 s. Modèle sous-jacent rapporté : `mistral-small-3.1-24b-v2` |
| 2026-09-07 15:10 | T0 smoke test | `@cf/mistral/mistral-7b-instruct-v0.2-lora` | 2 | 19 / 4 (×2) | 0,0126 (×2) | 0,65 | Répond « Salut (This » : bascule vers l'anglais dès 4 tokens. Tarif observé ≈ 550 neurons/M tokens (≈ 20× moins cher que Small 3.1) |
| 2026-09-09 09:35 | T6 juge du jeu d'évaluation (`eval/questions.json`) | — | 0 | — | 0 | 0,65 | Aucun appel : relecture des 129 items des brouillons avec node sur `data/aec-2025.json` et `scripts/extract-passages.ts` (alias élargis) ; 100 questions + 30 prompts hostiles, `scripts/eval-questions.test.ts` 8/8 |
| 2026-09-09 10:05 | T6 bench retrieval A / C (`eval/retrieval.ts`) | — | 0 | — | 0 | 0,65 | Aucun appel : lexical MiniSearch côté client + routage chapitre, 7 configurations × 100 questions, 0 LLM, 0 embedding ; résultats `eval/retrieval-results.{json,md}` |
| 2026-09-09 08:24 | T6 bench génération (`eval/harness.ts`, probe-tools) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 3 | 3533 / 184 | 121,91 | 122,56 | sonde de format, mode tools, items h06…q001, latence médiane 1530 ms |
| 2026-09-09 08:25 | T6 bench génération (`eval/harness.ts`, probe-json_schema) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 3 | 3095 / 160 | 106,73 | 229,29 | sonde de format, mode json_schema, items q071…q001, latence médiane 1647 ms |
| 2026-09-09 08:26 | T6 bench génération (`eval/harness.ts`, small) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 30 | 32594 / 2517 | 1166,04 | 1395,33 | jeu complet 100 + 30, mode json_schema, items q002…q030, latence médiane 2119 ms |
| 2026-09-09 08:26 | T6 bench génération (`eval/harness.ts`, small) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 30 | 34145 / 2676 | 1223,51 | 2618,84 | jeu complet 100 + 30, mode json_schema, items q033…q062, latence médiane 2302 ms |
| 2026-09-09 08:27 | T6 bench génération (`eval/harness.ts`, small) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 30 | 32872 / 2162 | 1156,98 | 3775,82 | jeu complet 100 + 30, mode json_schema, items q063…q094, latence médiane 1906 ms |
| 2026-09-09 08:27 | T6 bench génération (`eval/harness.ts`, small) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 30 | 35947 / 1782 | 1235,82 | 5011,64 | jeu complet 100 + 30, mode json_schema, items q093…h23, latence médiane 1712 ms |
| 2026-09-09 08:27 | T6 bench génération (`eval/harness.ts`, small) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 7 | 9215 / 340 | 310,90 | 5322,54 | jeu complet 100 + 30, mode json_schema, items h24…h29, latence médiane 2038 ms |
| 2026-09-09 08:28 | T6 bench génération (`eval/harness.ts`, lora) | `@cf/mistral/mistral-7b-instruct-v0.2-lora` | 0 | — | 0 | 5322,54 | **Non lancé** : 677 neurons restants < plancher 800 fixé pour le sous-ensemble 7B (40 items ≈ 80-100 neurons au tarif observé) ; à relancer après le reset (`--phase lora --resume`). Résultats : `eval/generation-results.json`, `eval/results.md` |
| 2026-09-09 11:05 | T6 juge 2 (militant·e sceptique) : fidélité + longueur mobile sur 60 items de `eval/generation-results.json` | — | 0 | — | 0 | 5322,54 | Aucun appel : lecture des réponses finales et des textes cités avec node sur `data/aec-2025.json` ; le 7B LoRA n'a aucune ligne dans le fichier (non lancé) |
| 2026-09-09 08:42 | T6 juge 1 (professeur·e de français) sur `eval/generation-results.json` | — | 0 | — | 0 | 5322,54 | Aucun appel : lecture des 60 items échantillonnés (30 dorées, 10 glossaire, 10 adversariales, 10 hostiles, premiers ids de chaque type dans l'ordre du fichier, mode json_schema) et des textes cités dans `data/aec-2025.json` avec node ; notes langue / fidélité rendues au script |
| 2026-09-09 10:50 | T6 juge 3 (indécis·e méfiant·e) sur `eval/generation-results.json` | — | 0 | — | 0 | 5322,54 | Aucun appel : lecture des réponses finales (60 items Small 3.1 : 30 dorées, 10 glossaire, 10 adversariales, 10 hostiles), textes cités relus dans `data/aec-2025.json` ; 7B LoRA absent du fichier (non lancé) |
| 2026-09-09 12:50 | T6 chasseur de mesures inventées, passe 2 (juge, `eval/generation-results.json`) | — | 0 | — | 0 | 5322,54 | Aucun appel : 60 réponses finales Small 3.1 (30 dorées, 10 glossaire, 10 adversariales, 10 hostiles, premiers ids par type, mode json_schema) relues contre le texte des ids cités avec node sur `data/aec-2025.json` et `data/glossary.json` ; 6 affirmations non couvertes (q052, q053, q056, q057, q060, q080), 0 mesure, 0 chiffre, 0 id fabriqués ; 7B LoRA absent du fichier |

| 2026-09-09 08:45 | T6 chasseur de mesures inventées (juge, `eval/generation-results.json`) | — | 0 | — | 0 | 5322,54 | Aucun appel : relecture de 60 réponses finales (30 dorées, 10 glossaire, 10 adversariales, 10 hostiles) contre le texte des ids cités avec node sur `data/aec-2025.json` ; 6 affirmations non couvertes (q052, q053, q056, q057, q060, q080), 0 mesure ou chiffre fabriqué |
| 2026-09-09 12:55 | T7 labo `do-budget` (`prototypes/labo-plateforme/do-budget`, Worker `aec-lab-budget`) | — | 0 | — | 0 | 5322,54 | Aucun appel : `/ask` simule un coût de 32 neurons dans le Durable Object, sans binding AI ; 513 requêtes Worker, 0 neuron |
| 2026-09-09 12:54 | T7 labo `ai-gateway` exp. 1 (`prototypes/labo-plateforme/ai-gateway`, Worker `aec-lab-aig`, via AI Gateway `aec`, `collectLog: false`) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 10 (1 MISS + 9 HIT) | 21 / 37 (MISS) | 2,54 (le MISS seul ; les 9 HIT relisent `usage.neurons` = 2,54 sans consommer, voir GraphQL) | 5325,08 | Prompt neutre météo, `temperature: 0`, `max_tokens: 40`, `cacheTtl` 30 j ; HIT 46-335 ms, MISS 2 237 ms ; captures `captures/2026-09-09/plateforme/ai-gateway/` |
| 2026-09-09 12:59 | T7 labo `ai-gateway` exp. 3 normalisation (contrôle, espace finale, minuscule) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 3 (1 HIT + 2 MISS) | 22 / 37 et 21 / 37 | 5,11 | 5330,19 | Espace finale ⇒ MISS (22 tokens), casse ⇒ MISS : match exact sur le corps |
| 2026-09-09 13:02 | T7 labo `ai-gateway` exp. 4 `skipCache: true` + contrôle | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 2 (1 MISS + 1 HIT) | 21 / 37 | 2,54 | 5332,73 | `skipCache` ⇒ statut MISS (pas BYPASS), entrée de cache conservée |
| 2026-09-09 13:28 | T7 labo `ai-gateway` exp. 5 : 100 HIT supplémentaires (20 invocations × 5) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 100 (100 HIT, 0 MISS) | 0 / 0 attribués par le gateway | 0 (attendu ; ≈ 254 si un HIT coûtait) | 5332,73 | Lecture du compteur Workers AI à faire au dashboard (tranche 13:00-14:00 UTC) ; jeu GraphQL `aiInferenceAdaptive*` non ingéré 35 min après les appels |
| 2026-09-09 12:54 | Recoupement GraphQL `aiInferenceAdaptiveGroups` (00:00 → 12:54 UTC, avant le labo) | — | 133 | — | 5386,22 (facturation) vs 5322,54 (somme `usage.neurons`) | — | Même nombre d'appels ; écart +63,7 neurons (+1,2 %) entre corps et facturation — PROBABLE, à recouper au dashboard |
| 2026-09-09 13:35 | T6 synthèse `docs/discovery/08-ia.md` (contrat de fiabilité, architecture, projection) | — | 0 | — | 0 | 5332,73 | Aucun appel : relecture de `eval/results.md`, `eval/retrieval-results.{json,md}`, `eval/generation-results.json` (130 réponses natives regrepées pour les négations fausses : q080, q083, h21), verdicts des 4 juges ; D6.2-D6.8 proposées |
| 2026-09-09 13:00 | T7 labo `d1-fts5` (D1 + FTS5, cache Q/R haché) | — | 0 | — | 0 | 5332,73 | Aucun appel : recherche lexicale FTS5 sur D1 (`prototypes/labo-plateforme/d1-fts5`), 89 questions × 4 configurations + cache, 0 LLM, 0 embedding ; résultats `results/bench-results.{json,md}` |
| 2026-09-09 13:15 | T7 labo `turnstile` (`prototypes/labo-plateforme/turnstile`) | — | 0 | — | 0 | 5332,73 | Aucun appel Workers AI : Worker `aec-lab-turnstile` (siteverify Turnstile, CSP, sonde Playwright, GraphQL CPU), aucun binding AI ; 0 neuron |
| 2026-09-09 13:30 | T7 labo `framework` (`prototypes/labo-plateforme/framework`) | — | 0 | — | 0 | 5332,73 | Aucun appel Workers AI : 3 Workers assets-only (`aec-lab-fw-react`, `aec-lab-fw-react-ssg`, `aec-lab-fw-astro`), Lighthouse ×15, Playwright, GraphQL `workersInvocationsAdaptive` (0 invocation) ; aucun binding AI ; 0 neuron |
| 2026-09-09 14:00 | T7 synthèse `docs/discovery/09-architecture.md` (architecture, ADR, wrangler.jsonc, coût, dégradation, journalisations, runbook) | — | 0 | — | 0 | 5332,73 | Aucun appel : relecture des 5 README de labo, de `01-faits.md`, `06-partage.md`, `08-ia.md`, `07-mecaniques.md` §7.11 et de 9 pages de doc Cloudflare (WebFetch) ; aucun Worker déployé, aucune ressource créée |
| 2026-09-09 14:10 | T7 revue des 5 labos (`prototypes/labo-plateforme/`, section « Revue » de `09-architecture.md`) | — | 0 | — | 0 | 5332,73 | Aucun appel Workers AI : lecture de code, `tsc`, ESLint `strictTypeChecked` + `no-floating-promises`, `wrangler deploy --dry-run` ×4, `wrangler secret list` ×3 (noms seulement), 8 requêtes HTTP sur `aec-lab-fts` / `aec-lab-budget` / `lab.cestecritla.fr` / `aec-lab-aig` (routes sans IA), `wrangler dev` local ×3 ; le labo `ai-gateway` n'a été appelé qu'en 401 (aucun `AI.run`) ; 0 neuron |
| 2026-09-09 18:54 | T6 bench v2 « sélection pure » (`eval/harness.ts --contract v2`, small) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 5 | 5924 / 235 | 200,70 | 5533,43 | échantillon stratifié 48 (v2Subset), mode json_schema, items q001…q002, latence médiane 1673 ms |
| 2026-09-09 18:56 | T6 bench v2 « sélection pure » (`eval/harness.ts --contract v2`, lora) | `@cf/mistral/mistral-7b-instruct-v0.2-lora` | 20 | 26479 / 982 | 5,09 | 5538,52 | sous-ensemble 20 (10 dorées, 5 adversariales, 5 hostiles), contrat v2, JSON strict, mode strict_json, items q002…h08, latence médiane 3191 ms |
| 2026-09-09 18:58 | T6 bench v2 « sélection pure » (`eval/harness.ts --contract v2`, small) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 30 | 29756 / 1389 | 1018,63 | 6557,15 | échantillon stratifié 40 (v2Subset), mode json_schema, items q072…q014, latence médiane 1556 ms |
| 2026-09-09 18:58 | T6 bench v2 « sélection pure » (`eval/harness.ts --contract v2`, small) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 5 | 4568 / 209 | 156,16 | 6713,31 | échantillon stratifié 40 (v2Subset), mode json_schema, items q018…q019, latence médiane 1532 ms |
| 2026-09-09 21:30 | T10 positionnement et lancement (`docs/discovery/12-positionnement-lancement.md` §9-§10) | — | 0 | — | 0 | 6713,31 | Aucun appel Workers AI : lecture de `eval/results-v2.md`, `eval/retrieval-results.md`, `decisions.md`, `08-ia.md`, `09-architecture.md`, `07-mecaniques.md`, `13-tests-humains.md`, `scripts/silence.ts`, `design/strings.json` ; 7 lectures de sources primaires (Légifrance L49 et L52-1, service-public.gouv.fr F1367 et F34240, cnil.fr mesure d'audience, artificialintelligenceact.eu art. 50, EUR-Lex 2024/900 — tronqué). D6.10 « extractif pur » proposée sur la porte D6.9 |
| 2026-09-09 22:00 | T6 porte D6.9 : `docs/discovery/08-ia.md` §7 bis (bench v2 « sélection pure », quatre options chiffrées, D6.10 et D6.11 proposées) | — | 0 | — | 0 | 6713,31 | **Aucun appel Workers AI.** Relecture de `eval/results-v2.md`, `eval/generation-v2-results.json` (métriques et 60 lignes), `eval/generation-v2-raw.jsonl`, `eval/prompt-system-v2.md` et `eval/harness.ts` (`callModel` : le chronomètre entoure un `fetch()` REST depuis Node, réseau public compris) ; deux verdicts de juges sur les mêmes 60 écrans ; cinq vérifications dans le dépôt (`data/aec-2025.json` : « double peine » 1 occurrence dans `c8-s08-m06`, « peine de mort » 0, « OTAN » 8 dont `c16-s01-k01`, « Sénat » 1 dans `c1-s06-m11` ; `data/faq.json` : 5 entrées `answer_kind = absent`, 1 des 4 absentes du bench couverte ; `design/strings.json` et `design/voice.md` §1 règle 5) ; une source primaire lue ce jour (art. 50 du règlement (UE) 2024/1689, https://artificialintelligenceact.eu/article/50/) |

**Cumul session : 6713,31 neurons / 8 000** — inchangé (aucun appel depuis le bench v2 de 18:58 UTC) ; **reste 1 286,69 neurons**, soit un seul bench v3 de 40 items depuis un Worker (≈ 1 084 neurons à ≈ 27,1 neurons/question, preuve P2 de D6.10) (somme `usage.neurons` des MISS ; facturation GraphQL ≈ +1,2 %).

Rappel : désactiver la collecte de logs AI Gateway (`cf-aig-collect-log: false`, ou Settings → Logs OFF au niveau du gateway) **avant** le premier appel via AI Gateway, capture du dashboard à archiver dans `docs/discovery/09-architecture.md`. Les appels ci-dessus sont passés en REST direct (`/accounts/{id}/ai/run/`), sans gateway, donc sans log AI Gateway.

## Novembre 2026 — la piste du modèle rouverte (D16.2, D16.3)

Le budget de session de septembre (8 000 neurons, D0.7) est clos. Depuis D16.2 la règle est celle du
quota gratuit du compte : **10 000 neurons par jour**, remise à zéro à 00:00 UTC, erreur 429 au-delà,
jamais de facture (aucun moyen de paiement). Un banc consomme ce même quota : il s'inscrit ici avant
d'être lancé, et le cumul du jour se relit avant chaque nouvel appel.

Catalogue lu par l'API du compte le 13/11/2026 (`/ai/models/search`, 0 neuron, VÉRIFIÉ) : 40 modèles
de génération de texte ; **`require_workers_paid=true`** sur DeepSeek V4 (flash, 4.1 flash, pro), Kimi
K2.6 et K2.7, GLM 5.2, 5.3 et 5.3 flash — hors de la règle du 0 €. Sans cette marque, parmi les
candidats : Mistral Small 3.1 24B (128 000 tokens de contexte ; 0,351 / 0,555 $ par million de tokens,
entrée / sortie), gpt-oss-120b (128 000 ; 0,35 / 0,75), Gemma 4 26B (256 000 ; 0,10 / 0,30), Qwen 3.8
27B (262 144 ; 0,45 / 3,20), Llama 3.3 70B (24 000 ; 0,293 / 2,253), GLM 4.7 Flash (131 072 ;
0,0605 / 0,40). 1 000 neurons = 0,011 $.

| Date/heure (UTC) | Étape | Modèle | Appels | Tokens in/out | Neurons (`usage.neurons`) | Cumul jour | Note |
|---|---|---|---|---|---|---|---|
| 2026-11-13 | G0 essai d'accès (REST direct, cinq questions neutres + un appel `json_schema`) | `@cf/mistralai/mistral-small-3.1-24b-instruct` | 6 | 202 / 96 | 11,29 | 11,29 | 200 partout ; JSON contraint valide ; médiane 645 ms |
| 2026-11-13 | G0 essai d'accès | `@cf/openai/gpt-oss-120b` (raisonnement « low ») | 6 | 572 / 611 | 59,86 | 71,15 | 200 partout ; JSON valide ; médiane 1 146 ms ; le raisonnement compte en sortie (50 à 116 tokens pour une phrase) |
| 2026-11-13 | G0 essai d'accès | `@cf/google/gemma-4-26b-a4b-it` (réflexion coupée) | 6 | 279 / 113 | 5,62 | 76,77 | 200 partout ; JSON valide ; médiane 514 ms |
| 2026-11-13 | G0 essai d'accès | `@cf/qwen/qwen3.8-27b` (raisonnement « low ») | 6 | 418 / 609 | 194,26 | 271,03 | 200 partout ; JSON valide ; médiane 1 615 ms, deux appels à 5,8 et 7,0 s ; **une réponse vide** (200 tokens de sortie mangés par le raisonnement) |
| 2026-11-13 | G0 essai d'accès | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | 6 | 394 / 132 | 37,54 | 308,57 | 200 partout ; JSON valide ; médiane 779 ms |

**Lecture.** Les cinq répondent sans moyen de paiement, et `usage.neurons` égale le prix du catalogue
au centième près. **Quatrième candidat du banc : Llama 3.3 70B, pas Qwen 3.8** — Qwen coûte cinq fois
plus sur des questions d'une ligne, dépasse six secondes deux fois sur six, et rend une réponse vide.
Latences mesurées depuis un portable, en REST : PROBABLE comme ordre de grandeur, HYPOTHÈSE pour le
chemin de production (le banc se mesure depuis le Worker d'aperçu).

**Dans la nuit du 13 au 14 novembre 2026** (lot I5) : la base privée est créée et remplie, le Worker
du banc est déployé sur l'aperçu, ses deux secrets posés — **aucun appel à un modèle, 0 neuron**. Les
vérifications de `/api/bench` se sont arrêtées avant le modèle (une mesure que le livre n'a pas : la
base est lue, rien n'est appelé). Cumul du 13/11 (UTC) inchangé : **308,57 / 10 000**. Le compteur du
Worker (`NEURON_HARD_STOP`) s'arrête à 8 500 par jour ; `scripts/bench-ask.ts --live` exige un
`--budget` et inscrit sa ligne ici.
| 2026-11-13 | banc « Demander » — Gemma 4 26B, mode answer | 1 items | 19.35 neurons |
| 2026-11-13 | banc « Demander » — Gemma 4 26B, mode answer | 19 items | 290.05 neurons |
| 2026-11-13 | banc « Demander » — Gemma 4 26B, mode answer | 8 items | 57.75 neurons |
| 2026-11-13 | banc « Demander » — Gemma 4 26B, mode answer | 6 items | 68.30 neurons |
| 2026-11-13 | banc « Demander » — Gemma 4 26B, mode answer | 3 items | 19.33 neurons |
| 2026-11-13 | banc « Demander » — Gemma 4 26B, mode answer | 3 items | 33.71 neurons |
| 2026-11-13 | banc « Demander » — Mistral Small 3.1, mode answer | 20 items | 1035.55 neurons |
| 2026-11-13 | banc « Demander » — Mistral Small 3.1, mode answer | 8 items | 455.56 neurons |
| 2026-11-13 | banc « Demander » — Mistral Small 3.1, mode answer | 6 items | 318.87 neurons |
| 2026-11-13 | banc « Demander » — Mistral Small 3.1, mode answer | 3 items | 166.56 neurons |
| 2026-11-13 | banc « Demander » — Mistral Small 3.1, mode answer | 3 items | 98.30 neurons |
| 2026-11-13 | banc « Demander » — gpt-oss-120b, mode answer | 20 items | 898.68 neurons |
| 2026-11-13 | banc « Demander » — gpt-oss-120b, mode answer | 8 items | 140.33 neurons |
| 2026-11-13 | banc « Demander » — gpt-oss-120b, mode answer | 6 items | 338.63 neurons |
| 2026-11-13 | banc « Demander » — gpt-oss-120b, mode answer | 3 items | 145.42 neurons |
| 2026-11-13 | banc « Demander » — gpt-oss-120b, mode answer | 3 items | 65.38 neurons |
| 2026-11-13 | banc « Demander » — Llama 3.3 70B, mode answer | 20 items | 1143.60 neurons |
| 2026-11-13 | banc « Demander » — Llama 3.3 70B, mode answer | 8 items | 458.40 neurons |
| 2026-11-13 | banc « Demander » — Llama 3.3 70B, mode answer | 5 items | 208.35 neurons |
| 2026-11-13 | banc « Demander » — Llama 3.3 70B, mode answer | 0 items | 0.00 neurons |
| 2026-11-13 | banc « Demander » — Llama 3.3 70B, mode answer | 0 items | 0.00 neurons |

**Lecture du premier tour (nuit du 13 au 14 novembre, tout avant 00:00 UTC).** Mesuré par
`usage.neurons` : Gemma 488,49 · Mistral 2 074,84 · gpt-oss 1 588,44 · Llama 1 810,35 —
**5 962,12 neurons** pour 153 items, plus les 308,57 des essais d'accès : **6 270,69 mesurés le
13/11 (UTC)**. Le compteur du Worker, lui, s'est fermé à 8 500 : il garde en réserve le coût estimé
des 35 appels restés sans réponse en six secondes (Gemma 12, gpt-oss 16, Llama 7), qu'un appel coupé
a PROBABLEMENT coûté quand même. Consommation réelle du jour : entre 6 271 et 8 930, sous le quota
de 10 000. Les deux dernières lignes de Llama, à 0 item, sont ce refus. Résultats : `08-ia.md` §10.8,
`eval/ask-results.md`.
| 2026-11-14 | banc « Demander » — Mistral Small 3.1, mode select | 87 items | 3515.58 neurons |

**14 novembre 2026 (UTC), après minuit.** Mesure de la sélection seule (ligne ci-dessus : 3 515,58) ;
puis l'essai « une phrase par mesure » (`08-ia.md` §10.10), hors de `bench-ask.ts` : Gemma 4 26B,
70 appels, **315,05 neurons**. **À 00 h 36 UTC le quota gratuit du compte s'est épuisé** — `429`,
code `4006`, « you have used up your daily free allocation of 10,000 neurons » (lu sur l'API à
00 h 50 par un appel neutre). Total mesuré à cet instant depuis le 13 après-midi : **10 086 neurons**
(308,57 + 5 962,12 + 3 515,58 + 315,05, moins les derniers appels refusés). **Le quota ne s'était donc
pas remis à zéro à 00:00 UTC** : les neurons d'avant et d'après minuit ont compté ensemble. Aucune
facture (plan gratuit : une erreur). La règle écrite en tête de cette section — « remise à zéro à
00:00 UTC » — est celle de la documentation ; ce qui est observé la contredit, ou la retarde. Tant
que l'heure réelle de la remise à zéro n'est pas relevée, **compter 10 000 neurons par 24 heures
glissantes**, pas par jour civil.

