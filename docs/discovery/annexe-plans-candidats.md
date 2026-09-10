

######## PLAN — Fidélité au texte, IA gratuite et architecture Cloudflare : garantir des réponses exactes, citées, jamais inventées, sur n'importe quel terme de L'Avenir en commun 2025, à 0 € d'exploitation, sur le plan gratuit, avec une latence perçue instantanée sur mobile — et faire de cette contrainte le moteur de l'expérience plutôt qu'un frein.
THÈSE : L'app sera irrésistible si elle répond en moins d'une seconde, sur un téléphone moyen en 4G, à n'importe quelle question sur le programme avec le TEXTE EXACT des mesures (jamais une paraphrase inventée), enveloppé dans une expérience typographique et ludique fidèle à la charte 2027, et si elle produit en un geste un artefact partageable sur WhatsApp. Cela est possible à 0 € parce que le corpus entier (837 propositions, 62 Ko gzippés, ~56 000 tokens) tient dans le navigateur : la recherche lexicale locale est la couche « toujours disponible », le LLM (Workers AI, seul fournisseur gratuit sans réutilisation des données) n'est qu'une surcouche facultative qui SÉLECTIONNE des identifiants de mesures et rédige deux phrases de liant, jamais le contenu. La session de découverte doit donc établir sur pièces : (1) le corpus canonique et son schéma d'identifiants stables, (2) le glossaire sourcé (aucune source officielle n'existe : c'est le premier risque de désinformation), (3) le mode de retrieval suffisant (lexical seul vs hybride) et le modèle Workers AI qui écrit le meilleur français au meilleur coût en neurons, prouvé par un harnais d'évaluation adversarial, (4) la direction de design choisie parmi trois maquettes comparées sur le même contenu réel, (5) la mécanique d'entrée et la gamification compatibles avec zéro compte et zéro donnée. Le livrable final est un prompt de plan-mode qui embarque ces décisions comme des faits, pas comme des options.
PRINCIPES :
- STATIQUE D'ABORD, IA EN DERNIER : tout ce qui peut être pré-généré au build (corpus JSON, index de recherche, glossaire, FAQ, cartes de partage, audio) est servi en Static Assets Workers (gratuit, illimité, hors quota) ; le Worker orchestre, il ne calcule pas (10 ms CPU) ; le LLM n'intervient qu'en dernier recours et de façon facultative.
- LE LLM SÉLECTIONNE, IL NE RÉDIGE PAS : aucune mesure affichée ne sort d'un modèle ; le modèle renvoie des identifiants de mesures existantes + deux phrases de liant ; l'app rend le texte depuis le JSON local hashé ; toute chaîne entre guillemets est validée par correspondance exacte avec le corpus, sinon supprimée. Objectif chiffré : 0 mesure inventée sur le jeu adversarial.
- LE MODE DÉGRADÉ EST LE MODE NORMAL : la recherche lexicale locale (MiniSearch/FlexSearch sur 62 Ko) est l'expérience de base, instantanée et hors-ligne ; l'épuisement des 10 000 neurons/jour ne doit produire aucun écran d'erreur, seulement une réponse « directement extraite du programme ».
- ZÉRO DONNÉE PERSONNELLE PAR CONSTRUCTION : pas de compte, pas de base d'utilisateurs, pas de log de conversation rattachable, état en localStorage et dans l'URL ; analytics agrégés sans identifiant (Cloudflare Web Analytics + Analytics Engine) ; aucune question politique envoyée à un tiers gratuit qui entraîne dessus (Gemini/Mistral free exclus ; Workers AI seul retenu).
- DÉCIDER SUR PIÈCES : chaque décision structurante (retrieval, modèle, direction de design, mécanique d'entrée) est prise sur un prototype, un benchmark chiffré ou une maquette comparée sur le même contenu réel — jamais sur opinion. Chaque fait du dossier porte une URL source et un statut VÉRIFIÉ / PROBABLE / HYPOTHÈSE.
- UN SEUL PIPELINE D'INGESTION, DÉTERMINISTE : 18 pages chapitre → nav.tdm → 89 sections → 837 propositions ; jamais de crawl par force brute d'URL (les slugs sN sont résolus globalement), jamais le flux RSS seul (82 doublons) ; invariants testés (18/89/837) et échec bruyant plutôt que corpus tronqué.
- CHARTE 2027, PAS CHARTE 2016-2022 : violet #4C0297, rouge #D1271C, crème #FFFCF4, charbon #212320, Public Sans + Gowun Batang (substituts autorisés par la charte), tortue ; interdiction explicite de Montserrat, du bleu #0098B6/#0e8a9c, de l'ocre et du Φ. Les 6 couleurs vives sont réservées aux aplats et grands titres (5 sur 6 échouent AA sur crème).
- BUDGET DE PERFORMANCE AVANT LES MAQUETTES : LCP < 2 s en 4G simulée, JS initial < 100 Ko gzip, polices woff2 auto-hébergées et sous-ensemblées, pas de WebGL, 60 fps sur mobile milieu de gamme, prefers-reduced-motion respecté, cibles ≥ 24 px (WCAG 2.2 AA).
- SÉPARER CONTENU ET CODE : le dossier data/ (corpus, glossaire, dérivés) est publié en CC BY-NC-SA 4.0 avec attribution « La France insoumise – L'Avenir en commun » ; le code sous licence libre séparée ; aucune monétisation ; mention d'indépendance discrète (pas un disclaimer de contenu) ; information IA conforme à l'art. 50 AI Act intégrée au design.
- LE MILITANT EST L'UTILISATEUR ET LE CANAL : chaque écran doit répondre à « je sors ma munition en 10 secondes » et « j'envoie ça à mon cousin » ; l'artefact de partage (OG 1200×630 + story 1080×1920) et l'aperçu de lien WhatsApp sont des fonctionnalités de premier rang, pas des finitions.
- RÉSILIENCE JURIDIQUE ET CALENDAIRE : zéro promotion payante (L52-1 dès le 1er octobre 2026), feature flag « silence électoral » (L49) câblé dès l'architecture, veille CNCCEP, capacité de modifier le wording du chat sans redéploiement (KV/variable).

## PISTES
### [P0/S] T0 — Cadrage et décisions bloquantes avec l'utilisateur
Q : Quelles décisions seul belo peut prendre, et qui conditionnent toutes les pistes suivantes ?
Sous-questions :
  - Groq Inc. (LPU) est-il acceptable en fallback sachant que Grok/xAI est proscrit et que l'homophonie est un risque de capture d'écran adverse ? (recommandation : l'écarter par prudence, Workers AI seul + OpenRouter en réserve)
  - Quel nom propre pour l'app (distinct de « L'AEC »/« Mélenchon 2027 » pour ne pas usurper l'officiel, cf. aec2027.fr en construction) ?
  - La mention d'indépendance discrète (« projet militant indépendant » en footer/À propos) entre-t-elle dans le refus des disclaimers ? (à distinguer du disclaimer de contenu refusé et de la mention IA obligatoire art. 50)
  - Peut-on nommer/animer la tortue ? Connaît-il un nom d'usage interne ?
  - Licence du dépôt (MIT/Apache pour le code, CC BY-NC-SA pour data/) et publication open source : oui/non ?
  - Positionnement vis-à-vis d'aec2027.fr : complémentaire (chat/quiz/partage, lien vers l'officiel) plutôt que lecteur concurrent ?
  - Un compte Cloudflare Free est-il disponible pour les tests en session (Workers AI, D1, DO, Vectorize, Turnstile, AI Gateway) ? Accepte-t-il de consommer ~8 000 neurons de quota en session de bench, ou de passer 1 jour en plan payant (5 $) pour le bench ?
  - Peut-il mobiliser 3-5 militants pour un test asynchrone des maquettes (5 secondes par écran d'accueil + 2 questions) ?
Méthodes :
  - AskUserQuestion en une seule salve structurée (une question par item, options préremplies avec recommandation)
  - Documenter la distinction Groq Inc. ≠ xAI/Grok dans la question (https://console.groq.com/docs/rate-limits)
  - Consigner les réponses en tête du dossier comme « Décisions D0.x » citées ensuite par toutes les pistes
Livrable : Section « Décisions de cadrage » du dossier (8 décisions datées) ; liste des non-objectifs
Décision : Toutes les questions ont une réponse explicite de l'utilisateur ; aucune piste suivante ne dépend d'une hypothèse non validée
Dépend de : 

### [P0/M] T1 — Corpus canonique et modèle de données (source de vérité)
Q : Comment produire, en session, le JSON structuré exhaustif et fidèle du livre 2025 avec des identifiants stables, et prouver qu'il est complet ?
Sous-questions :
  - L'algorithme canonique (18 pages chapitre → nav.tdm → 89 sections) reproduit-il exactement 18/4/1/89 et 87 mesures-clés + 706 mesures + 44 sous-mesures = 837 ?
  - Quel schéma d'identifiant stable : `c12-s1-m03` (position) + hash court SHA-256 du texte normalisé (détection de modification) ? Comment gérer une insertion de mesure en cours de campagne sans casser les liens partagés ?
  - Quelle règle de comptage afficher (831 officiel vs 837 extraites) : compter mesure-clé + mesure, exclure les sous-mesures ? Documenter la règle dans l'app.
  - Le flux RSS (21 pages) sert-il de recoupement de complétude après déduplication par URL canonique ?
  - Les 4 sections à sous-mesures et les 14 sections multi-paragraphes sont-elles correctement typées (TypeScript strict, pas de champ optionnel sauvage) ?
  - Faut-il ingérer les 20 posts « synthèse des contributions » (HTML Elementor) ? Option minimale : chiffres agrégés par chapitre uniquement.
  - Les livrets/plans 2022 (54 pages WP REST) sont-ils ingérés dans un fichier séparé marqué « 2022 », pour le glossaire uniquement ?
Méthodes :
  - Script TypeScript d'ingestion écrit et exécuté dans le scratchpad de la session (fetch + parseur DOM type linkedom/cheerio sur les sélecteurs validés : main.section, nav.tdm a.chapitre/a.actuelle, section.contenu p.wp-block-paragraph, div.mesure-cle, div.mesure, div.sous-mesure, section.chiffres div.chiffre)
  - URLs : https://melenchon2027.fr/programme2025/livre/introduction/, /chapitreN/ (N=1..18), pages de partie, https://melenchon2027.fr/feed/?post_type=lfi_programme_2025&paged=1..21 (recoupement), https://melenchon2027.fr/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,link,title (livrets/plans 2022)
  - Fixtures de test : https://melenchon2027.fr/programme2025/livre/chapitre12/s1/ (cas complet) et /chapitre1/s6/ (sous-mesures)
  - Test d'invariants automatisé (18 chapitres, 89 sections, 837 propositions, 48 encadrés) ; diff RSS-dédupliqué vs crawl canonique = 0
  - User-Agent identifiable, concurrence ≤ 4, un seul passage (107 requêtes)
  - Pattern multi-agent : un agent extrait, un second agent vérifie 10 sections tirées au hasard contre la page rendue (comparaison mot à mot)
Livrable : data/aec-2025.json (schéma TypeScript documenté : livre > parties > chapitres > sections > propositions{id, kind, text, hash} + chiffres{text, source, année}) + data/hashes.json + data/livrets-2022.json + rapport d'invariants + règle de comptage
Décision : Invariants 18/89/837/48 satisfaits ; 0 doublon ; 10 sections vérifiées mot à mot sans écart ; taille gzip ≤ 80 Ko ; schéma d'ID stable adopté
Dépend de : T0

### [P0/L] T2 — Glossaire sourcé et couche « en clair » (le cœur de la demande, sans source officielle)
Q : Comment créer un glossaire de 40-80 termes du jargon AEC dont chaque définition est traçable à un passage LFI vérifiable, relu humainement, et jamais généré à la volée ?
Sous-questions :
  - Quelle liste fermée de termes (extraction par fréquence + rareté en français courant : bifurcation écologique 28, constituante 34, planification écologique 13, pôle public 11, 6e République 9, règle verte 7, révolution citoyenne, écocide, flux tendus, protectionnisme solidaire, créolisation, garantie d'emploi, blocage des prix, etc.) ?
  - Pour chaque terme : existe-t-il un passage du livre 2025 qui le définit ? Sinon un livret/plan 2022 (/plans-2022/regle-verte/, /plans-2022/6e-republique/, /livrets-2022/planification-ecologique/, /livrets-2022/constituante/) ? Sinon marquer « définition rédactionnelle non sourcée » et l'afficher différemment.
  - Format à 3 niveaux : une phrase (registre FALC, inspiré de /laec-falc/), un paragraphe, la ou les citations exactes (IDs de mesures) + URL source + année.
  - Comment garantir que la définition n'ajoute aucune mesure : vérification adversariale automatique (chaque affirmation factuelle doit être appuyée par un ID de mesure ou une citation 2022) ?
  - Quelles alias/variantes (accents, pluriels, sigles : SMIC, RIC, ISF) pour le routage lexical ?
  - Faut-il aussi une FAQ pré-générée de 100-200 questions probables (objections classiques, questions d'indécis) routée sans LLM ?
Méthodes :
  - Script de fréquence sur data/aec-2025.json (n-grammes 1-3, filtrage par liste de mots courants) → liste candidate
  - WebFetch sur les livrets/plans 2022 via REST : https://melenchon2027.fr/wp-json/wp/v2/pages?slug=regle-verte, ?slug=6e-republique, ?slug=planification-ecologique, ?slug=constituante (champ content.rendered)
  - Workflow multi-agent en 3 rôles : Rédacteur (génère l'entrée à partir des seuls passages fournis), Vérificateur adversarial (cherche toute affirmation non couverte par les passages, rejette), Éditeur (registre, longueur mobile ≤ 280 caractères pour le niveau 1) ; relecture finale par l'utilisateur sur un échantillon de 15 termes
  - Sources de ton : https://melenchon2027.fr/laec-falc/ (FALC 2022) ; désintox.lafranceinsoumise.fr pour les objections
  - Test de couverture : 50 questions de terme réalistes → % routées vers une entrée existante
Livrable : data/glossary.json v0 (40-80 entrées, chaque entrée avec sources, niveau de confiance, licence CC BY-NC-SA) + data/faq.json v0 (100+ Q/R routables) + procédure de relecture
Décision : ≥ 90 % des entrées ont au moins une citation exacte du livre 2025 ou d'un document LFI 2022 ; 0 affirmation non couverte détectée par le vérificateur ; couverture ≥ 80 % des 50 questions de terme ; décision « glossaire figé, jamais généré à la volée » actée
Dépend de : T1

### [P0/M] T3 — Retrieval : lexical local vs hybride vectoriel vs chapitre en contexte
Q : Le corpus (56 000 tokens) étant minuscule, quelle stratégie de recherche donne le meilleur rappel sur des questions réelles en français, à coût nul et latence instantanée — et le vectoriel est-il même nécessaire ?
Sous-questions :
  - Unité de chunk : 1 proposition (837, ~21 mots) enrichie d'un préfixe non affiché (titre chapitre + titre section + chapeau) vs 1 section (89) vs hiérarchique parent/enfant ?
  - Variante A : MiniSearch/FlexSearch côté client avec normalisation FR (diacritiques, apostrophes « l'écocide », stemming léger, synonymes du glossaire) — rappel@5 ?
  - Variante B : bge-m3 (1024 dims) + Vectorize (limite 5 M dims stockées → ~4 880 vecteurs, 30 M dims interrogées/mois → ~975 requêtes/jour) — rappel@5 ? Le quota de requêtes Vectorize est-il le vrai goulot ?
  - Variante B' : « vector search du pauvre » : embeddings pré-calculés au build (≈1 200 vecteurs × 1024 en int8 ≈ 1,2 Mo), chargés en mémoire du Worker depuis un static asset, produit scalaire brut sur cache miss — tient-il sous 10 ms CPU ? (supprime Vectorize et son quota)
  - Variante C : routage lexical vers 1-2 chapitres puis chapitre entier (~3 000 tokens) en contexte LLM — meilleure fidélité mais coût neurons ×3.
  - D1 FTS5 (vérifié disponible) avec tokenizer unicode61 remove_diacritics 2 : utile en serveur, ou redondant avec le client ?
  - Le reranker bge-reranker-base (283 neurons/M) sur 8 candidats × 60 tokens ≈ 0,14 neuron : quasi gratuit — améliore-t-il la précision ?
Méthodes :
  - Jeu de 100 questions étiquetées (IDs attendus) produit par un panel multi-persona (militant pressé, jeune 22 ans, indécis méfiant, journaliste fact-checker) puis validé par un juge : 50 dorées, 20 sur le glossaire, 30 adversariales (mesures absentes : PMA, corrida, sortie de l'euro ; jargon adverse ; provocations)
  - Script de bench dans le scratchpad : rappel@1/@5, MRR, latence, pour A, B, B', C ; embeddings calculés une fois via l'API REST Workers AI (≈60 neurons pour tout le corpus)
  - context7 /cloudflare/cloudflare-docs : Vectorize limits, D1 FTS5, bge-m3 ; https://developers.cloudflare.com/vectorize/platform/pricing/
  - Mesure CPU de la variante B' avec `wrangler dev` + performance.now() (10 ms CPU free)
Livrable : Tableau comparatif (rappel, latence, coût, complexité) + décision de chunking + décision « lexical seul / lexical + B' / hybride Vectorize » + index de recherche pré-construit
Décision : Retenir la variante la plus simple atteignant rappel@5 ≥ 0,9 sur les questions dorées et ≥ 0,85 sur le glossaire ; si A seule y parvient, abandonner Vectorize ; si non, B' avant B
Dépend de : T1, T2

### [P0/L] T4 — Génération contrainte avec citations et harnais d'évaluation adversarial
Q : Quel modèle Workers AI produit un français militant impeccable, respecte le contrat « IDs de mesures + 2 phrases de liant + refus hors périmètre », au coût en neurons le plus bas — et comment le prouver publiquement ?
Sous-questions :
  - Contrat de sortie : {cited_ids: string[], liant_fr: string ≤ 2 phrases, hors_programme: boolean, glossary_term?: string} — via JSON mode (liste restreinte : llama-3.1-8b-instruct-fast, llama-3.3-70b, hermes-2-pro…) ou via validation post-hoc (permet Qwen3-30B-A3B, gpt-oss-20b, Mistral Small) ?
  - Candidats et coût par question (≈850 tokens in / 100 out avec présélection lexicale de 8 mesures) : Qwen3-30B-A3B-fp8 ≈ 7 neurons (~1 400 q/j), Llama 3.1 8B fast ≈ 7 (~1 400 q/j), gpt-oss-20b ≈ 18 (~550 q/j), Mistral Small 3.1 ≈ 32 (~310 q/j). Lequel écrit le meilleur français sans code-switching ?
  - Validation post-génération : chaque ID ∈ candidats ; toute citation entre guillemets ∈ corpus (match exact après normalisation) ; sinon fallback extractif silencieux. Taux de fallback par modèle ?
  - Refus : sur 30 questions adversariales, taux de refus correct ? Formulation du refus (« Cette question n'est pas traitée dans L'Avenir en commun ») + suggestion de mesures voisines.
  - Prompt injection et provocations (30 prompts hostiles) : le périmètre strict + garde lexical d'entrée suffisent-ils ? (Llama Guard à 44 003 neurons/M input = ~15 neurons/question : trop cher, exclu)
  - Streaming SSE (pas de JSON mode en streaming) : streamer le liant et afficher les cartes de mesures dès réception des IDs ?
  - Le harnais peut-il devenir un test de non-régression CI, exécuté avant chaque déploiement, avec résultats publiés (page « exactitude ») ?
Méthodes :
  - Script d'évaluation (scratchpad) appelant l'API REST Workers AI ou `wrangler dev --remote` : 100 questions × 4 modèles ≈ 6 000-8 000 neurons (étaler sur 2 jours ou activer 1 jour de plan payant, cf. T0)
  - Panel de juges (3 instances Claude, grille : français natif 0-5, fidélité 0-5, refus correct 0/1, longueur mobile) + agrégation par médiane ; critique adversariale d'un 4e agent cherchant la moindre mesure inventée
  - context7 : https://developers.cloudflare.com/workers-ai/features/json-mode/, https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/, https://developers.cloudflare.com/workers-ai/platform/pricing/
  - Référence méthodologique : https://algorithmwatch.org/en/study-microsofts-bing-chat/ (30 % de réponses fausses sur Copilot en contexte électoral)
Livrable : eval/questions.json (100 + 30 hostiles), eval/results.md (tableau modèles), prompt système v1, validateur post-hoc spécifié, décision modèle principal + modèle de secours, seuils CI
Décision : Modèle retenu = meilleur score français ≥ 4/5 ET 0 mesure inventée après validation ET refus correct ≥ 95 % ET ≤ 10 neurons/question ; sinon architecture « extractive pure » (aucun LLM en ligne) actée
Dépend de : T3

### [P0/M] T5 — Budget neurons, cache, quotas et protection anti-abus
Q : Comment tenir un pic viral et une attaque d'épuisement de quota avec 10 000 neurons/jour, sans jamais casser l'app ni sortir du 0 € ?
Sous-questions :
  - Un HIT du cache AI Gateway évite-t-il la consommation de neurons Workers AI ? (doc muette — test empirique obligatoire)
  - Cache applicatif D1 (100 000 écritures/jour, vs KV 1 000/jour) : clé = hash de la question normalisée (minuscules, sans accents/ponctuation, stopwords) + version corpus ; taux de hit attendu ?
  - Compteur global journalier de neurons en Durable Object SQLite (gratuit) : arrêt du LLM à 85 % du quota, bascule extractive, reset 00:00 UTC.
  - Rate limiting binding (10/60 s, par datacenter) + Turnstile invisible/managed (illimité, branding CF à placer discrètement) : configuration minimale sur /api/ask uniquement.
  - Dégradation gracieuse : niveaux 0 (cache) → 1 (LLM) → 2 (extractif + glossaire) ; micro-copy assumé (« Réponse directement extraite du programme ») ; jamais de message d'erreur.
  - Quota Vectorize (≈975 requêtes/jour) et Analytics Engine (100 000 points/jour) : limites secondaires à documenter.
  - Mode dev : mocks pour ne pas brûler le quota pendant l'implémentation.
Méthodes :
  - Test 10 min : 2 appels identiques via binding avec gateway {cacheTtl}, vérifier cf-aig-cache-status HIT, comparer la consommation dans le dashboard Workers AI avant/après (https://developers.cloudflare.com/ai-gateway/features/caching/)
  - Prototype minimal DO compteur (skill durable-objects) + rate limit binding (https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) + Turnstile (skill turnstile-spin, https://developers.cloudflare.com/turnstile/plans/)
  - Feuille de calcul de budget : questions/jour par niveau de cache (0 %, 50 %, 70 %) et par modèle, scénario pic (10 000 visiteurs en 1 h)
  - context7 : pricing KV/D1/DO free (https://developers.cloudflare.com/workers/platform/pricing/)
Livrable : Section « Budget & résilience » : table de coûts, politique de cache (D1 + AI Gateway), design de la défense en profondeur, matrice de dégradation, config wrangler esquissée
Décision : Démonstration chiffrée que l'app reste 100 % fonctionnelle à 0 neuron ; capacité ≥ 3 000 questions LLM/jour avec cache ; aucune facturation possible (pas de moyen de paiement ou plafond 0)
Dépend de : T4

### [P0/M] T6 — Architecture Cloudflare de référence et PWA hors-ligne
Q : Quelle architecture minimale sur le plan Free sert tout en statique, isole une seule route API, et fonctionne hors-ligne dans le métro ?
Sous-questions :
  - Worker unique avec Static Assets (run_worker_first: ['/api/*', '/og/*'], not_found_handling SPA) vs Pages : lequel est le plus simple et le mieux supporté en 2026 ? (recommandation : Workers Static Assets)
  - Framework front : Vite + React (cohérent avec la stack LFI Tailwind v4 + React) vs Astro (îlots, pré-rendu des 89 sections pour le SEO/OG) — quel compromis entre pré-rendu et SPA ?
  - PWA : service worker cachant app shell + data/aec-2025.json + glossaire + index ; stratégie de mise à jour par version de corpus ; _headers pour cache-control immutable.
  - Génération OG (satori + resvg-wasm) : dans le Worker à la volée (≈1 s à froid, cache Cloudflare) vs pré-générée au build pour les 837 mesures + 48 chiffres (static assets, 0 CPU) ?
  - Contrainte 10 ms CPU : quels calculs restent côté Worker (validation post-hoc, hash, D1) et lesquels partent au client/build ?
  - Pipeline d'ingestion : hors Worker (script + GitHub Actions hebdo, PR sur diff) — le cron Worker est exclu (50 sous-requêtes/requête, 10 ms CPU, 5 crons/compte) ; Workflows (1 step par page) en alternative ?
  - Structure du dépôt : apps/web, worker/, data/ (CC BY-NC-SA), scripts/ingest.ts, eval/, design/.
Méthodes :
  - context7 /cloudflare/cloudflare-docs : static assets config, SPA shell, run_worker_first, _headers, Workflows limits ; skills cloudflare, wrangler, workers-best-practices
  - Prototype « hello corpus » : Worker + assets + /api/ask mocké + SW offline, déployé sur *.workers.dev pour mesurer LCP mobile (skill web-perf)
  - Prototype OG : https://tom-sherman.com/blog/dynamic-og-image-cloudflare-workers (satori, PNG uniquement, pas de WebP)
  - Schéma d'architecture (artifact-diagramming) : client (index local) → /api/ask → Turnstile → rate limit → DO budget → D1 cache → Workers AI → validateur → D1 write
Livrable : Schéma d'architecture + wrangler.jsonc esquissé (bindings AI, D1, DO, RATE_LIMITER, ASSETS, ANALYTICS) + arborescence du dépôt + décision framework + stratégie PWA + décision OG (build vs runtime)
Décision : Prototype déployé : LCP < 2 s en 4G simulée sur mobile, recherche hors-ligne fonctionnelle, /api/ask sous 10 ms CPU, 0 € constaté dans le dashboard
Dépend de : T1, T5

### [P1/S] T7 — Fraîcheur du corpus et observabilité sans données personnelles
Q : Comment détecter une modification du programme pendant la campagne (aucun Last-Modified/ETag) et mesurer l'usage sans jamais enregistrer une opinion politique ?
Sous-questions :
  - Re-crawl hebdomadaire (107 requêtes) hors Worker, SHA-256 par section, diff → PR automatique + badge « à jour au JJ/MM/AAAA » dans l'app ; alerte si invariants cassés (redesign du site, cf. aec2027.fr en préparation).
  - Politique de versionnage du corpus (v2025.01 → v2026.xx) et invalidation du cache D1/SW par version.
  - Schéma d'événements Analytics Engine sans identifiant : {event, chapitre, mode: cache|llm|extractif, modèle, bucket latence, hit glossaire} ; jamais le texte de la question ni l'IP.
  - Peut-on journaliser les questions SANS résultat (pour combler les trous du glossaire) sans identifiant, avec purge 30 jours ? Décision légale (cf. T13).
  - Cloudflare Web Analytics (sans cookie) suffit-il pour le trafic ? Bandeau cookies évitable ?
  - Métrique nord instrumentée : taux de passage écran ludique → lecture d'une section.
Méthodes :
  - Script de diff dans le scratchpad (réutilise T1) + esquisse de workflow GitHub Actions (cron hebdo, gratuit sur dépôt public)
  - context7 : Analytics Engine limits/pricing (100 000 points/jour, 10 000 lectures/jour, free), Web Analytics
  - https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience (exemption de consentement)
Livrable : Spécification du pipeline de fraîcheur + schéma d'événements analytics + liste écrite de ce qui n'est JAMAIS enregistré
Décision : Diff reproductible sur un changement simulé ; schéma analytics validé par T13 ; aucun identifiant dans aucun événement
Dépend de : T1, T6

### [P1/S] T8 — Prior art, concurrence et positionnement en une phrase
Q : Face à laec.fr (2022), avenir-en-commun.net (simulateur IA), aec2027.fr (officiel en construction), Elyze et Wahl-O-Mat, quel terrain l'app occupe-t-elle que personne d'autre n'occupe ?
Sous-questions :
  - Parcours complet et points de douleur de laec.fr (/sommaire, /recherche, /visuels : 21 visuels faits main) et d'avenir-en-commun.net (/simulateur.html : 4 écrans de questions intimes, backend Render qui s'endort ~50 s).
  - Que révèlent le webmanifest, le theme-color #8B24D9, robots.txt (Crawl-delay 60) et le favicon d'aec2027.fr ? Annonces sur lafranceinsoumise.fr / actionpopulaire.fr / Discord ?
  - Mécaniques à reprendre de Wahl-O-Mat (≈30-38 items, skip, pondération ×2), Kieskompas (restitution 2D), NYT dialect quiz (résultat = image personnelle), Elyze (swipe anonymisé — et ses 3 anti-patterns : score opaque, contenu modifiable, collecte de données).
  - Le « matching » a-t-il un sens avec un seul programme ? Reformulations candidates : « 27 mesures approuvées sur 40 vues, voici les 5 qui te surprendront », carte des 4 parties colorée, carnet « Mon AEC ».
  - Phrase de positionnement : « melenchon2027.fr = le texte ; aec2027.fr = la lecture officielle ; notre app = l'endroit où un indécis comprend en 3 minutes et où un militant trouve sa munition sourcée en 10 secondes ».
Méthodes :
  - claude-in-chrome : parcours + captures de laec.fr, avenir-en-commun.net, aec2027.fr (webmanifest, favicon), wahl-o-mat.de, politiscales.net
  - WebFetch : https://laec.fr/sommaire, https://laec.fr/visuels, https://avenir-en-commun.net/simulateur.html, https://aec2027.fr/site.webmanifest, https://www.bpb.de/themen/wahl-o-mat/
  - Panel de 3 personas (militant, jeune, indécis) jugeant chaque prior art sur : temps avant le premier « ah ok », envie de partager, sentiment de manipulation
Livrable : Grille comparative (6 produits × 8 critères) + captures + phrase de positionnement validée par l'utilisateur + liste « ce qu'on ne fait pas »
Décision : Phrase de positionnement adoptée ; au moins 3 différenciateurs concrets non couverts par l'existant (ex. carte de partage par mesure, chat citation-first, hors-ligne)
Dépend de : T0

### [P0/M] T9 — Charte graphique vérifiée visuellement et design tokens
Q : Quelle est l'identité 2027 réelle (et non celle de 2016-2022 sur-référencée), et comment la traduire en tokens, typographies libres et règles d'illustration là où la charte est muette ?
Sous-questions :
  - Hiérarchie des deux palettes de https://lafranceinsoumise.fr/charte-graphique/ : 4 « Couleurs 2027 » (marque) vs 6 vives (accents) — confirmation par screenshot et par les affiches T27.
  - Polices : Public Sans (variable, OFL) + Gowun Batang (400/700 seulement) — rendu du français accentué et tenue en lecture longue ? Fallback : Public Sans en corps, Gowun Batang pour citations et « À savoir ».
  - Union Gothic / Stack Sans servies par melenchon2027.fr : quelle police est réellement rendue (getComputedStyle) ? Licences des fonderies → interdiction de rehéberger ?
  - Teintes de surface issues de LOGO-M27.svg (#FDEDFF, #E5CBFF, #FFD2CF) comme tokens secondaires.
  - Règles d'illustration déduites des 5 affiches T27 (isométrie, pixel-art tortue, échelle typo, rapport texte/image) : 5-8 règles écrites.
  - Contrastes : matrice AA calculée (5 des 6 vives échouent sur crème ; jaune uniquement sur charbon ; jamais violet sur charbon).
  - Tortue vectorielle légère à redessiner (LogoTortue.svg embarque un PNG 1920²).
Méthodes :
  - claude-in-chrome : screenshot de la charte, console getComputedStyle(document.body).fontFamily et document.fonts sur melenchon2027.fr, captures des affiches https://melenchon2027.fr/wp-content/uploads/2026/05/AFFICHES-T27_6erep-scaled.jpg et AFFICHES-T27_Eco-1.jpg
  - Inventaire du pack https://lafranceinsoumise.fr/wp-content/uploads/2026/05/Logos-LFI.zip
  - Échantillon typographique rendu (skill design) : paragraphe verbatim chapitre 12 s1 en Gowun Batang 400/700 16-18 px sur #FFFCF4 vs Public Sans
  - Calcul de contraste programmatique sur toutes les paires
Livrable : design/tokens.json (couleurs, teintes, typo, échelles, rayons, motion) + matrice de contraste + règles d'illustration + liste d'interdits (Montserrat, #0098B6, Φ) + tortue SVG légère
Décision : Palette primaire tranchée sur preuve visuelle ; pairing typo validé sur échantillon FR ; 100 % des paires texte utilisées ≥ 4,5:1
Dépend de : T0

### [P0/L] T10 — Trois directions de design comparées sur le même contenu réel
Q : Laquelle des directions A (éditorial-typographique), B (ludique-cartes-tortue), C (immersif-motion 4 mondes) — ou quel hybride — rend l'app subjuguante, partageable et fidèle à la charte, sans sacrifier la lisibilité ni la perf mobile ?
Sous-questions :
  - Mêmes 6 écrans par direction : accueil (30 premières secondes), section chapitre 12 s1 (texte verbatim), réponse du chat avec cartes de mesures citées + mention IA intégrée, écran de refus « pas dans le programme », carte de partage 1080×1080 (« 83 % des Français… Harris Interactive, juillet 2021 »), écran de progression/résultat.
  - Comment la mention IA (art. 50) et la mention d'indépendance sont-elles intégrées sans ressembler à un disclaimer ?
  - Comment le « verbatim officiel » est-il distingué visuellement du liant IA et des définitions « en clair » (3 registres typographiques) ?
  - Mobile 360 px d'abord ; état hors-ligne et état dégradé (extractif) maquettés, pas improvisés.
  - Scoring pondéré : fidélité charte ×3 (éliminatoire), envie de partager ×3, lisibilité 360 px ×2, contraste AA ×2 (éliminatoire), coût d'implémentation ×1, risque de frivolité ×2.
Méthodes :
  - Skill design : un canvas, 3 rangées d'artboards (A/B/C) × 6 écrans, contenu réel identique, tokens de T9
  - Panel de juges adversarial jouant 3 personas + 1 juge « directeur artistique LFI » + 1 juge accessibilité ; notes par médiane
  - Test utilisateur asynchrone : 3-5 militants, 5 s par accueil, questions « lequel tu envoies à ton cousin qui vote pas ? » et « lequel a l'air officiel ? »
  - Skill web-perf sur un prototype HTML de la direction retenue (budget LCP/CLS/INP)
Livrable : Canvas de maquettes (18 artboards) + grille de scores + verbatims du test + décision de direction (ou hybride précisé : ex. A pour la lecture, B pour l'entrée et le partage) + kit de composants prioritaires (MeasureCard, StatCard, GlossaryChip, RefusalState, ShareCard, ProgressMap)
Décision : Une direction gagne sur le score ET sur le test militant ; aucune violation éliminatoire ; prototype tenant le budget perf
Dépend de : T9, T8, T2

### [P0/M] T11 — Mécanique d'entrée et gamification sans compte
Q : Quelle expérience des 30 premières secondes convertit un indécis reçu via WhatsApp en lecteur d'une section, et quelle progression donne envie au militant de revenir — sans compte, sans serveur, sans donnée ?
Sous-questions :
  - Candidats d'entrée : swipe anonymisé façon Elyze sur ~30 mesures (skip + pondération ×2), « devine le pourcentage » sur les 48 « À savoir », « ce que ça change pour toi » en 3 taps (règles publiées), question libre au chat, mesure du jour.
  - Restitution sans suspense de « matching » : carte des 4 parties colorée, carnet « Mon AEC » de 10 mesures encodé dans l'URL, « 5 mesures qui vont te surprendre ».
  - Progression locale : la tortue avance sur 18 chapitres (localStorage), badges locaux, aucun leaderboard serveur ; défi par lien (état dans l'URL, façon Wordle).
  - Ton : jusqu'où la gamification reste sérieuse ? (précédent officiel : cahier de vacances LFI, test « quelle figure historique »)
  - Accessibilité : alternative clavier au swipe, cibles ≥ 24 px, prefers-reduced-motion.
  - Auditabilité : toute règle de sélection/score publiée (leçon Elyze).
Méthodes :
  - Prototype cliquable HTML (artifact) de 2 mécaniques d'entrée avec contenu réel (30 mesures réelles, 10 « À savoir » réels)
  - Panel de personas : temps avant le premier « ah ok », clarté, envie de partager, sentiment de manipulation ; critique adversariale « journaliste hostile »
  - Références : https://www.bpb.de/themen/wahl-o-mat/bundestagswahl-2025/, https://en.wikipedia.org/wiki/Kieskompas, https://knightlab.northwestern.edu/2014/01/20/behind-the-dialect-map-interactive-... (NYT dialect quiz), https://actu.orange.fr/politique/presidentielle-2027-lfi-et-renaissance-lancent-leur-cahier-de-vacances-politiques-magic-CNT000002rgjCD.html
  - Décision utilisateur finale via AskUserQuestion avec les prototypes en main
Livrable : Spécification des mécaniques retenues (entrée, restitution, progression, défi par lien) + règles publiées + encodage d'état URL/localStorage + backlog des mécaniques écartées
Décision : Mécanique d'entrée retenue sur prototype avec accord de l'utilisateur ; 0 donnée serveur ; règles auditables écrites
Dépend de : T10, T1

### [P1/S] T12 — Partage social et diffusion dark-social
Q : Quel artefact de partage et quel aperçu de lien font qu'un militant envoie l'app sur WhatsApp/Telegram et qu'un indécis clique ?
Sous-questions :
  - Une URL par mesure, par « À savoir », par entrée de glossaire, par résultat (état dans l'URL) ; URL courtes et lisibles.
  - OG 1200×630 + story 1080×1920 + carré 800×800/1080×1080 aux tokens de la charte, avec attribution CC BY-NC-SA et source/date des sondages (2020-2021).
  - Pré-générer au build (837 + 48 + glossaire ≈ 1 000 images × 3 formats, static assets, 0 CPU) vs à la volée (satori dans le Worker, cache) — laquelle respecte le mieux 10 ms CPU et le budget ?
  - Aperçu WhatsApp/Telegram : test réel des balises OG sur un lien déployé.
  - Bouton « copier pour WhatsApp » : texte formaté (mesure verbatim + lien) ; Web Share API mobile.
  - Plan de lancement 100 % organique (L52-1 dès le 1er octobre 2026) : Discord LFI, groupes Action Populaire, comptes militants ; pas de feed public comme canal principal (biais algorithmique défavorable).
Méthodes :
  - Prototype satori/resvg dans le scratchpad (PNG uniquement) sur 3 mesures et 1 « À savoir » ; mesure du temps et du poids
  - Test d'aperçu via lien *.workers.dev partagé sur WhatsApp/Telegram par l'utilisateur
  - Formats : https://infos.actionpopulaire.fr/fiches/realiser-des-visuels-pour-les-reseaux-sociaux/ (dimensions uniquement, pas les couleurs)
Livrable : Spécification des artefacts de partage (formats, gabarits, attribution) + décision build vs runtime + plan de lancement organique daté
Décision : Aperçu WhatsApp correct sur un lien réel ; génération ≤ 1 s ou pré-générée ; plan de lancement sans aucune dépense
Dépend de : T10, T6

### [P1/S] T13 — Conformité intégrée au design (licence, AI Act, RGPD, code électoral)
Q : Comment satisfaire chaque obligation par un choix d'architecture ou de design plutôt que par un disclaimer ?
Sous-questions :
  - CC BY-NC-SA 4.0 : attribution exacte, SA sur data/ et dérivés (glossaire, FALC, cartes), NC (pas de dons au développeur ? lien vers la collecte officielle acceptable ?), code séparé — lecture des sections 1 et 3.b du texte légal.
  - Art. 50 AI Act (en vigueur depuis le 2 août 2026) : formulation minimale et esthétique de l'information IA ; l'exception « contrôle éditorial » vaut-elle pour des réponses extractives pré-validées ?
  - RGPD art. 9 : décision finale sur la journalisation des questions sans résultat (T7) ; politique de confidentialité en 10 lignes ; Workers AI (aucune réutilisation) comme seul fournisseur.
  - L52-1 (1er octobre 2026) et L49 (veille de scrutin 0 h) : feature flag « silence électoral » en KV/variable, comportement exact (figer ? masquer les partages ? écran « la tortue dort ») ; date du décret de convocation.
  - Mentions légales : niveau d'identification (option b : prénom + contact + hébergeur) ; mention d'indépendance discrète ; INPI (marques LFI / AEC / tortue) — usage hors vie des affaires.
  - Loi 2018-1202 (référé manipulation de l'information) : argument juridique de l'architecture anti-hallucination ; capacité de modifier le wording sans redéploiement.
Méthodes :
  - WebFetch : https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.fr, https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations, https://www.cnil.fr/fr/chatbots-les-conseils-de-la-cnil-pour-respecter-les-droits-des-personnes, https://presidentielle2022.conseil-constitutionnel.fr/l-election/la-campagne-sur-internet.html, https://data.inpi.fr/recherche_avancee/marques, https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023883001
  - Capture horodatée des mentions légales https://melenchon2027.fr/mentions-legales/ (preuve de la licence au jour J)
  - 3 variantes de mention IA maquettées dans T10 ; décision sur le critère « visible sans être un mur »
Livrable : Checklist de conformité (obligation → réponse par le design/architecture → où dans l'app) + textes courts (attribution, mention IA, indépendance, confidentialité) + spécification du flag silence électoral + calendrier légal (1/10/2026, veilles de scrutin, veille CNCCEP déc. 2026)
Décision : Chaque obligation a une réponse implémentable sans disclaimer de contenu ; textes validés par l'utilisateur ; flag daté
Dépend de : T0, T7

### [P1/S] T14 — Mesure du succès et critères d'acceptation
Q : Comment savoir que l'app marche — sans tracker personne — et quels tests bloquent un déploiement ?
Sous-questions :
  - Métrique nord : taux de passage écran ludique/chat → lecture d'une section (littérature VAA : l'effet robuste est « donner envie d'aller lire », pas changer le vote).
  - Métriques secondaires agrégées : partages générés, hits glossaire, taux de refus, taux de fallback extractif, latence p95, neurons/jour.
  - Portes CI : invariants corpus ; harnais d'évaluation (0 mesure inventée, refus ≥ 95 %) ; budget perf (Lighthouse mobile) ; contraste ; taille bundle.
  - Page publique « exactitude » (résultats du harnais, version du corpus, date de mise à jour) comme argument de confiance.
Méthodes :
  - Définition des événements Analytics Engine (T7) et des requêtes SQL de lecture (10 000/jour)
  - Spécification des tests (Vitest + wrangler) et des seuils, à reprendre dans le prompt final
Livrable : Tableau de bord cible (6 métriques) + liste des portes CI avec seuils + spec de la page « exactitude »
Décision : Métrique nord et seuils CI validés par l'utilisateur
Dépend de : T4, T7

### [P2/S] T15 — Audio pré-généré (« écoute le chapitre ») — option à valider
Q : MeloTTS en français (18,63 neurons/min, ~3 100 neurons pour tout le programme, une seule fois) est-il assez bon pour offrir l'écoute des 89 sections en statique, à coût nul ?
Sous-questions :
  - Qualité FR de @cf/myshell-ai/melotts sur une section verbatim (liaisons, sigles, « 6e République », chiffres) ?
  - Servir 89 MP3 (~150-200 Mo) en static assets (25 MiB/fichier) — acceptable ? Lazy-loading.
  - Conflit avec la fidélité : audio = lecture verbatim uniquement, jamais de « débat IA » façon NotebookLM.
Méthodes :
  - Appel unique melotts lang 'fr' sur chapitre 12 s1 (≈3 min ≈ 56 neurons) ; écoute par l'utilisateur
  - https://developers.cloudflare.com/workers-ai/models/melotts/
Livrable : Échantillon audio + décision go/no-go + estimation de volume
Décision : Go si l'utilisateur juge l'échantillon « diffusable » ; sinon backlog
Dépend de : T1

## SÉQUENCE
1. Cadrage : décisions bloquantes et compte Cloudflare — Ouvrir la session par une salve unique AskUserQuestion (T0) : Groq/Grok, nom de l'app, mention d'indépendance, tortue, licence, positionnement vs aec2027.fr, compte Cloudflare et budget neurons de bench, militants testeurs. Charger les skills cloudflare/wrangler/durable-objects/design. Vérifier aec2027.fr (page d'attente au 7/9/2026) et archiver une capture horodatée des mentions légales de melenchon2027.fr.
   [solo (AskUserQuestion) + WebFetch] sortie : 8 décisions D0.x consignées ; accès Cloudflare confirmé ; non-objectifs listés
2. Corpus canonique : ingestion, invariants, identifiants — Exécuter le script d'ingestion (T1) dans le scratchpad : 18 pages chapitre → nav.tdm → 89 sections → JSON typé ; recoupement RSS dédupliqué ; test d'invariants 18/89/837/48 ; schéma d'ID position + hash ; règle de comptage 831/837 ; extraction séparée des 54 livrets/plans 2022 via REST.
   [workflow extraction + vérification adversariale (un agent extrait, un agent compare 10 sections mot à mot)] sortie : data/aec-2025.json validé (invariants, 0 doublon, 10 sections vérifiées), ≤ 80 Ko gzip, schéma d'ID adopté
3. Glossaire sourcé et FAQ pré-générée — Extraire les termes candidats par fréquence, sourcer chaque terme dans le livre 2025 puis les livrets/plans 2022, générer les entrées à 3 niveaux via le workflow Rédacteur → Vérificateur adversarial → Éditeur (T2) ; produire 100+ Q/R routables ; relecture d'un échantillon de 15 termes par l'utilisateur.
   [multi-agent 3 rôles + relecture utilisateur] sortie : glossary.json v0 (40-80 entrées, ≥ 90 % avec citation exacte), faq.json v0, 0 affirmation non couverte, décision « glossaire figé »
4. Jeu d'évaluation et bench de retrieval — Panel multi-persona génère 100 questions étiquetées (50 dorées, 20 glossaire, 30 adversariales) + 30 prompts hostiles ; bench des variantes A (lexical client), B' (vecteurs pré-calculés en mémoire Worker), B (Vectorize), C (chapitre en contexte) sur rappel@5/MRR/latence/coût (T3).
   [multi-modal sweep (4 variantes en parallèle) + juge de validation du jeu de questions] sortie : Variante et chunking retenus (la plus simple à rappel@5 ≥ 0,9) ; eval/questions.json figé
5. Bench des modèles Workers AI : français, fidélité, refus, coût — 100 questions × 4 modèles (Qwen3-30B-A3B-fp8, Llama 3.1 8B fast, gpt-oss-20b, Mistral Small 3.1) avec le contrat de sortie IDs + liant ; validateur post-hoc ; panel de 3 juges + critique adversariale « chasseur de mesure inventée » (T4). Budget ≈ 6-8 000 neurons (étaler ou 1 jour payant selon D0).
   [judge panel (3 juges, médiane) + adversarial verify] sortie : Modèle principal + secours retenus (français ≥ 4/5, 0 invention post-validation, refus ≥ 95 %, ≤ 10 neurons/question) ou décision « extractif pur »
6. Mesures empiriques Cloudflare (prototypes de 10 minutes chacun) — Tests unitaires de plateforme (T5/T6) : cache AI Gateway vs neurons ; D1 FTS5 avec unicode61 remove_diacritics ; DO compteur de budget ; rate limit binding ; Turnstile invisible ; CPU de la variante B' ; satori/resvg pour une carte OG ; MeloTTS FR sur une section (T15) ; prototype Worker + Static Assets + SW hors-ligne déployé sur workers.dev, mesuré avec web-perf.
   [multi-modal sweep de micro-prototypes via wrangler, résultats consolidés] sortie : Chaque hypothèse de plateforme marquée VÉRIFIÉ/INFIRMÉ avec chiffre ; prototype hors-ligne LCP < 2 s ; 0 € constaté
7. Budget, résilience et architecture de référence — Consolider la feuille de budget (questions/jour par niveau de cache et modèle, scénario pic), la matrice de dégradation, la défense en profondeur (Turnstile → rate limit → DO budget → D1 cache → LLM → validateur), le schéma d'architecture, l'arborescence du dépôt, le pipeline de fraîcheur hors Worker (GitHub Actions) et le schéma analytics sans identifiant (T5, T6, T7).
   [solo + revue par un agent « SRE adversarial » qui cherche le scénario de panne] sortie : Démonstration chiffrée : app 100 % fonctionnelle à 0 neuron, ≥ 3 000 questions LLM/jour avec cache ; wrangler.jsonc esquissé ; diagramme validé
8. Prior art, positionnement et charte vérifiée — Avec claude-in-chrome : parcours et captures de laec.fr, avenir-en-commun.net, aec2027.fr, Wahl-O-Mat ; grille comparative et phrase de positionnement (T8). Screenshot de la charte, polices réellement servies, affiches T27, contrastes calculés, tokens, règles d'illustration, tortue SVG légère (T9).
   [solo (navigateur) + panel de 3 personas pour la grille prior art] sortie : Phrase de positionnement validée ; design/tokens.json ; matrice AA ; liste d'interdits
9. Trois directions de design sur le même contenu réel — Canvas design : 3 directions × 6 écrans (accueil, section 12 s1, réponse chat citée + mention IA, refus, carte de partage « 83 % », progression) avec le contenu verbatim et les tokens ; 3 variantes de mention IA ; états hors-ligne/dégradé (T10, T13).
   [design canvas + judge panel (3 personas + DA LFI + accessibilité) + test utilisateur asynchrone (3-5 militants)] sortie : Direction (ou hybride) retenue sur score et test ; kit de composants prioritaires ; aucune violation éliminatoire
10. Mécanique d'entrée et gamification sans compte, sur prototype — Deux prototypes cliquables (ex. swipe 30 mesures avec skip/pondération vs « devine le pourcentage ») avec contenu réel ; restitution sans matching ; progression tortue locale ; défi par lien ; règles publiées ; décision de l'utilisateur (T11). Spécifier les artefacts de partage et tester l'aperçu WhatsApp d'un lien réel (T12).
   [prototypes + panel personas + critique « journaliste hostile » + AskUserQuestion] sortie : Mécaniques retenues et spécifiées ; aperçu WhatsApp validé ; plan de lancement organique daté
11. Conformité par le design et mesure du succès — Checklist obligation → réponse (CC BY-NC-SA, art. 50, RGPD art. 9, L52-1, L49, mentions légales, INPI) avec textes courts validés ; flag silence électoral ; métrique nord, événements analytics, portes CI, page « exactitude » (T13, T14).
   [solo + revue adversariale « juriste hostile » + validation utilisateur] sortie : Checklist complète sans disclaimer de contenu ; seuils CI et métrique nord validés
12. Synthèse : dossier, red team et prompt final de plan-mode — Assembler le dossier selon la structure fixée ; passer l'ensemble au crible d'un panel rouge (désinformation, panne virale, violation de charte, illégalité, ennui) ; corriger ; rédiger le prompt final de plan-mode qui embarque les décisions comme faits, les chiffres, les fichiers produits, les portes CI et les non-objectifs.
   [adversarial verify (panel rouge 5 angles) + solo pour la rédaction] sortie : Dossier livré (avec fichiers data/, eval/, design/) ; prompt final relu par l'utilisateur ; toutes les décisions structurantes prises sur pièces

## RISQUES
- Hallucination d'une mesure (risque existentiel : arme adverse, référé loi 2018-1202, perte de l'exception « contrôle éditorial » de l'art. 50). => Architecture « le LLM sélectionne des IDs, l'app affiche le JSON hashé » ; validateur post-hoc (IDs ∈ candidats, citations ∈ corpus) ; fallback extractif silencieux ; harnais adversarial en porte CI avec objectif 0 invention ; page publique « exactitude ».
- Pipeline naïf → corpus faux (RSS avec 82 doublons ; slugs sN résolus globalement → 225 pages « 200 OK » dupliquées). => Algorithme canonique nav.tdm uniquement ; invariants 18/89/837/48 ; recoupement RSS dédupliqué ; échec bruyant du pipeline plutôt que corpus tronqué.
- Viralité = panne : 10 000 neurons/jour partagés, ≈500-1 400 questions LLM/jour ; attaque d'épuisement de quota triviale. => Recherche lexicale locale toujours fonctionnelle ; D1 cache + AI Gateway cache ; DO compteur global à 85 % ; Turnstile + rate limit ; présélection lexicale pour réduire les tokens ; micro-copy assumé du mode extractif.
- Glossaire sans source officielle → définitions inventées. => Glossaire figé, versionné, chaque entrée avec citation exacte + URL + année ; vérificateur adversarial ; jamais de définition générée à la volée ; entrées non sourcées marquées visuellement.
- aec2027.fr (officiel) sort avant et rend l'app redondante. => Positionnement complémentaire (chat citation-first, quiz, partage, hors-ligne) ; lien vers l'officiel ; veille à chaque session ; nom propre distinct.
- Mauvaise charte (2016-2022 : Montserrat, bleu #0098B6, Φ) reprise par une recherche naïve ; palette vive illisible (5/6 échouent AA). => Tokens tranchés sur screenshot de la charte et affiches T27 ; liste d'interdits dans le prompt final ; matrice de contraste calculée avant les maquettes.
- Polices commerciales (Config, Union Gothic, Stack Sans) rehébergées → infraction distincte de la CC. => Public Sans + Gowun Batang (substituts autorisés par la charte), auto-hébergées en woff2 ; validation du rendu FR.
- Données politiques envoyées à un tiers gratuit qui entraîne dessus (Gemini/Mistral free) ; fuite type Action Populaire (mai 2026). => Workers AI seul (engagement contractuel de non-réutilisation) ; zéro compte, zéro base, zéro log rattachable ; analytics sans identifiant.
- Confusion Groq/Grok en capture d'écran adverse. => Décision utilisateur explicite en T0 ; recommandation : écarter Groq ; OpenRouter (10 $ une fois → 1 000 req/jour) comme réserve si nécessaire.
- Contrainte 10 ms CPU et 50 sous-requêtes : ingestion ou calculs lourds dans le Worker échouent silencieusement. => Ingestion hors Worker (script + GitHub Actions) ; calcul lourd au build ou dans le navigateur ; mesure CPU des variantes serveur (B') en session.
- Cache AI Gateway à match exact → taux de hit faible ; hypothèse « HIT évite les neurons » non vérifiée. => Normalisation agressive côté Worker ; D1 comme cache principal ; test empirique en session avant de compter dessus.
- Calendrier légal : L52-1 dès le 1er octobre 2026 (promotion payante interdite), L49 les veilles de scrutin, CNCCEP inédite sur l'IA. => Plan de lancement 100 % organique ; flag « silence électoral » ; wording du chat modifiable via KV sans redéploiement ; veille cnccep.fr décembre 2026.
- Perception d'officialité (charte fidèle + refus de disclaimer) → usurpation apparente, imputation des erreurs à LFI, question du compte de campagne. => Nom propre + wordmark distinct ; mention d'indépendance discrète (validée en T0) ; pas de validation formelle demandée à LFI ; coût documenté à 0 €.
- Sur-ingénierie visuelle (WebGL) incompatible avec mobile bas de gamme et 4G ; LogoTortue.svg embarque un PNG 1920². => Budget perf fixé avant les maquettes ; direction typographique/motion dirigé ; tortue SVG redessinée ; audit web-perf du prototype.
- Gamification perçue comme frivole ou manipulatrice (précédent Elyze). => Règles de sélection publiées ; pas de matching opaque ; test auprès de vrais militants ; ton calibré sur le cahier de vacances LFI.
- Redesign de melenchon2027.fr (probable avec aec2027.fr) casse le parseur. => Invariants + alerte ; corpus versionné et figé côté app (l'app ne dépend jamais du site en temps réel).

## DOSSIER
- 0. Résumé exécutif : positionnement en une phrase, 10 décisions prises sur pièces, non-objectifs
- 1. Décisions de cadrage (D0.x) et réponses de l'utilisateur
- 2. Registre des faits : tableau URL / statut (VÉRIFIÉ, PROBABLE, HYPOTHÈSE) / implication, incluant les vérifications de plateforme faites en session
- 3. Corpus : algorithme canonique, schéma TypeScript, identifiants, invariants, règle de comptage 831/837, fraîcheur (pipeline hors Worker, hash, versionnage) — fichiers data/aec-2025.json, data/hashes.json, data/livrets-2022.json
- 4. Glossaire et FAQ : méthode de sourcing, format 3 niveaux, workflow de vérification, couverture — fichiers data/glossary.json, data/faq.json
- 5. Retrieval : jeu d'évaluation, résultats des variantes A/B'/B/C, chunking retenu, index pré-construit
- 6. Génération contrainte : contrat de sortie, prompt système v1, validateur post-hoc, résultats du bench modèles (français, fidélité, refus, neurons), modèle principal et secours, portes CI — fichiers eval/
- 7. Budget et résilience : feuille de calcul neurons, cache D1 + AI Gateway (résultat du test), DO budget, Turnstile, rate limit, matrice de dégradation, scénario pic
- 8. Architecture Cloudflare de référence : diagramme, wrangler.jsonc esquissé, arborescence du dépôt, PWA hors-ligne, génération OG, résultats du prototype (LCP, CPU)
- 9. Prior art et positionnement : grille comparative, captures, différenciateurs
- 10. Charte et système de design : tokens, typographies, matrice de contraste, règles d'illustration, interdits, tortue SVG — fichier design/tokens.json
- 11. Directions de design : canvas (3 × 6 écrans), grille de scores, verbatims du test militant, décision, kit de composants
- 12. Mécaniques et gamification sans compte : entrée, restitution, progression, défi par lien, règles publiées, encodage d'état
- 13. Partage et diffusion : artefacts (formats, gabarits, attribution), aperçu WhatsApp validé, plan de lancement organique daté
- 14. Conformité par le design : checklist obligation → réponse → emplacement, textes courts, flag silence électoral, calendrier légal, licences (data/ CC BY-NC-SA, code)
- 15. Mesure du succès : métrique nord, événements analytics sans identifiant, tableau de bord, page « exactitude »
- 16. Risques et mitigations (mise à jour après le panel rouge)
- 17. Backlog d'idées non retenues et pourquoi
- 18. Prompt final de plan-mode (texte intégral)
- Annexes : jeux de questions, scripts d'ingestion/bench, captures, échantillon audio

## PROMPT FINAL
- Contexte figé : date, élection avril 2027, cibles (militants = utilisateurs et canal, 18-30, indécis), contrainte 0 € plan Free, fidélité absolue, charte 2027, mobile-first WhatsApp, zéro compte/zéro donnée, pas de Grok (et décision D0 sur Groq).
- Les FICHIERS déjà produits et à réutiliser tels quels : data/aec-2025.json (schéma, IDs, invariants), data/glossary.json, data/faq.json, eval/questions.json, design/tokens.json, canvas de maquettes, prompt système v1 — avec leurs chemins et leur licence.
- Les DÉCISIONS prises sur pièces, énoncées comme des faits non négociables : variante de retrieval et chunking ; modèle principal et de secours avec coût neurons mesuré ; direction de design retenue ; mécanique d'entrée ; framework front ; Workers Static Assets + Worker unique ; ingestion hors Worker ; OG build vs runtime ; PWA hors-ligne.
- Le CONTRAT D'EXACTITUDE : le LLM ne rédige jamais une mesure, il renvoie des IDs ; validateur post-hoc spécifié ; fallback extractif ; refus designé ; harnais d'évaluation comme porte CI avec seuils (0 invention, refus ≥ 95 %, rappel@5 ≥ 0,9).
- Les CHIFFRES de plateforme vérifiés à respecter : 10 ms CPU, 50 sous-requêtes, 6 connexions, 10 000 neurons/jour, KV 1 000 écritures/jour (donc D1 pour le cache), Vectorize 5 M dims, DO SQLite gratuit, Analytics Engine 100 000 points/jour, static assets gratuits et illimités, JSON mode sans streaming et liste restreinte, Llama Guard trop cher.
- La DÉFENSE EN PROFONDEUR et la matrice de dégradation (Turnstile → rate limit → DO budget 85 % → D1 cache → AI Gateway cache → LLM → validateur), avec micro-copy du mode extractif.
- Le MODÈLE DE DONNÉES et les URL : une URL par mesure/À savoir/terme/résultat ; état dans l'URL et localStorage ; versionnage du corpus ; invalidation SW.
- Les TOKENS et INTERDITS de design : palette 2027, teintes secondaires, Public Sans + Gowun Batang auto-hébergées, matrice AA, règles d'illustration, tortue SVG légère ; interdiction de Montserrat, #0098B6, Φ, WebGL ; budget perf (LCP < 2 s 4G, JS < 100 Ko gzip, WCAG 2.2 AA, reduced-motion).
- Les MÉCANIQUES spécifiées (entrée, restitution sans matching, progression tortue locale, défi par lien, mesure du jour) avec règles publiées et zéro serveur.
- Le PARTAGE : gabarits OG/story/carré, attribution CC BY-NC-SA + source/date des sondages, bouton copier WhatsApp, Web Share API.
- La CONFORMITÉ par le design : textes exacts (attribution, mention IA art. 50, indépendance, confidentialité 10 lignes, mentions légales niveau choisi), flag silence électoral daté, wording du chat en KV modifiable sans redéploiement, licence data/ vs code.
- L'OBSERVABILITÉ sans identifiant : schéma d'événements Analytics Engine, Cloudflare Web Analytics, ce qui n'est JAMAIS enregistré ; page « exactitude ».
- Les NON-OBJECTIFS explicites : pas de compte, pas de leaderboard serveur, pas de génération libre, pas de définition à la volée, pas de promotion payante, pas de monétisation, pas de dépendance à un site tiers en temps réel, pas de 3D.
- L'ARBORESCENCE cible du dépôt et la stack (TypeScript strict, composants fonctionnels, ESLint/Prettier, Vitest, wrangler, Tailwind v4 si retenu), conventions : projet en français, code et commentaires en anglais.
- Le SÉQUENÇAGE attendu du plan d'implémentation : jalon 0 statique hors-ligne (corpus + recherche + lecture + partage) déployable seul ; jalon 1 chat citation-first avec harnais ; jalon 2 mécaniques ludiques ; jalon 3 audio/OG runtime — chaque jalon livrable et utile seul, avec critères d'acceptation chiffrés.
- Une consigne au plan-mode : citer les sources du dossier, ne pas réintroduire d'options déjà tranchées, signaler tout écart aux chiffres de plateforme, et prévoir un mode dev avec mocks pour ne pas consommer le quota.

## IDÉES AUDACIEUSES
- « Réponse = cartes officielles » : le chat n'écrit jamais une mesure ; il pose 1 à 3 cartes de mesure tamponnées « Texte officiel, chapitre 12, section 1 » (rendues depuis le JSON local) et une ligne de liant IA typographiquement distincte ; appui long = copier pour WhatsApp.
- « Munition en 10 secondes » : champ unique pour le militant (« on me dit que ça coûte trop cher ») → 3 mesures verbatim + carte de partage prête ; fonctionne hors-ligne, sans LLM, grâce à l'index local + FAQ pré-générée.
- « Devine le pourcentage » : les 48 encadrés « À savoir » deviennent un jeu à curseur (tu devines, la vérité s'affiche avec institut et date), résultat en carte 1080×1080 partageable ; format le plus viral, 0 coût.
- « Mon AEC » : carnet de 10 mesures choisies par swipe (≈30 mesures, skip, pondération ×2), encodé dans l'URL sans serveur, restitué en carte des 4 parties colorée et en image OG ; règles de sélection publiées (anti-Elyze).
- « La tortue avance » : carte de progression des 18 chapitres en localStorage, la tortue pixel-art franchit les chapitres lus ; défi par lien façon Wordle (« 14/18, et toi ? ») sans compte ni leaderboard.
- « Pas dans le programme » comme moment de confiance : écran de refus designé (tortue qui hausse les épaules), mesures voisines proposées, lien vers désintox ; le refus est une fonctionnalité affichée, pas un échec.
- « En clair / En entier » : chaque terme du glossaire a 3 niveaux (une phrase, un paragraphe, la citation exacte), commutables d'un tap ; les niveaux 1-2 sont marqués « reformulation », le niveau 3 « texte officiel ».
- « Écoute le chapitre » : audio verbatim des 89 sections pré-généré une fois avec MeloTTS FR (~3 100 neurons au total), servi en statique, écoutable dans le métro hors-ligne (si l'échantillon convainc).
- « Mode hors-ligne total » : PWA installable embarquant tout le programme (62 Ko) + recherche + glossaire ; argument marketing « aucune donnée, aucun compte, marche sans réseau ».
- « Mesure du jour » : sélection déterministe par date (statique, identique pour tous), avec carte de partage automatique ; rendez-vous éditorial sans notification ni serveur.
- « Ce que ça change pour toi » en 3 taps (tranche d'âge, situation, territoire) → 5 mesures ; mapping publié et auditable, rien n'est envoyé au serveur ; antithèse du formulaire intime en 4 écrans d'avenir-en-commun.net.
- « Page exactitude » publique : résultats du harnais d'évaluation, version et date du corpus, hash de chaque section, méthode de comptage 831/837 — la transparence comme différenciateur face aux accusations de manipulation.
- « Programme vivant » : compteur des 24 000 contributions citoyennes et, par chapitre, le nombre de propositions nouvelles retenues (chiffres agrégés seulement), pour l'angle « co-construit » qui parle aux indécis.
- « Silence électoral » designé : les veilles de scrutin, la tortue dort, le partage se met en pause, la lecture reste possible — la contrainte L49 devient un moment de marque.
- « Duel de connaissances » par lien : 5 questions vrai/faux sur des mesures réelles, score encodé dans l'URL, l'ami joue la même série et compare ; 0 serveur.


######## PLAN — SÉDUCTION & EXPÉRIENCE — « wow en 10 secondes, un aha de compréhension en 3 minutes, un partage en 1 geste ». La session est conçue comme un studio de création qui tranche sur pièces (maquettes multi-artboards, micro-prototypes jouables sur téléphone, panels de juges à personas, tests auprès de 3-5 militants), jamais sur des opinions. Les autres dimensions (contenu, IA, architecture, légal, mesure) sont traitées comme des conditions de possibilité de l'expérience, pas comme des chantiers parallèles.
THÈSE : Ce qui rendra l'app irrésistible n'est pas de « lire le programme » (aec2027.fr, l'app officielle LFI encore en page d'attente au 7/9/2026, occupera ce terrain) mais la sensation de « je comprends enfin » : un concept opaque (règle verte, bifurcation écologique, 6e République) rendu limpide en 30 secondes, ancré sur le texte verbatim, livré avec le soin d'un produit premium (typographie de la charte 2027, motion dirigé à 60 fps, réponse instantanée) et immédiatement transmissible à un proche sur WhatsApp sous forme d'une carte belle et sourcée. L'utilisateur principal est le militant, le destinataire est l'indécis : chaque écran doit donc se comprendre sans contexte à l'arrivée par un lien, et chaque « aha » doit produire un artefact de partage. La session de découverte doit établir, preuves à l'appui : (1) quelle mécanique d'entrée déclenche le plus vite wow + premier aha chez 3 personas, (2) l'anatomie exacte de la « carte-concept » qui produit la compréhension, (3) la direction artistique qui respecte strictement la charte 2027 tout en paraissant premium et partageable, (4) un contrat IA structurellement incapable d'inventer une mesure à coût 0 €, (5) l'artefact et le canal de partage qui font qu'un militant transfère et qu'un indécis ouvre. Tout ce qui n'est pas décidé sur maquette + score + test militant reste une hypothèse étiquetée comme telle dans le dossier.
PRINCIPES :
- Verbatim d'abord, magie ensuite : chaque effet « wow » est ancré sur le texte exact de L'Avenir en commun 2025 ; le LLM ne rédige jamais une mesure, il sélectionne des identifiants que l'app affiche depuis le JSON local.
- Trois budgets de temps non négociables : wow < 10 s (premier écran), premier aha < 3 min (un concept compris), partage en 1 geste (Web Share API avec image + texte pré-rédigé).
- Deux atomes distincts : le CONCEPT est l'atome de l'expérience (compréhension), la MESURE est l'atome du partage (URL, carte image, ID stable). La section et le chapitre sont des conteneurs de progression.
- Décider sur pièces : aucune décision de design, de mécanique ou de stack IA sans (a) une maquette/prototype avec le VRAI contenu (chapitre 12 s1, règle verte), (b) une grille de score par panel de juges à personas, (c) un test auprès de 3-5 militants sur téléphone. Sinon c'est une hypothèse, étiquetée HYPOTHÈSE dans le dossier.
- Statique par défaut, IA en couche de profondeur : le corpus (62 Ko gzippé) est embarqué côté client, la recherche et le glossaire fonctionnent sans serveur ni quota ; le chat est une surcouche facultative avec un mode dégradé conçu comme une fonctionnalité, pas comme une erreur.
- Charte 2027 stricte sur ce qu'elle dit, liberté totale sur ce qu'elle ne dit pas : tokens racine Violet #4C0297, Rouge #D1271C, Crème #FFFCF4 (jamais blanc pur), Charbon #212320 ; Public Sans variable (titres) + Gowun Batang (corps) explicitement autorisées ; les 6 couleurs vives réservées aux aplats/grands titres ; interdiction nommée de Montserrat, du bleu #0098B6/#0e8a9c, de l'ocre et du symbole Φ (ancienne identité).
- Le militant est l'utilisateur, l'indécis est le destinataire : on conçoit pour le transfert (forward) sur WhatsApp/Telegram, pas pour le feed public (structurellement hostile). Chaque page doit se comprendre sans contexte, charger en < 2 s en 4G, et avoir un aperçu de lien impeccable.
- Zéro compte, zéro base d'utilisateurs, zéro bandeau cookies : état en localStorage + URL, analytics sans identifiant. C'est à la fois plus propre (pas de popup), plus sûr (fuite Action Populaire mai 2026, RGPD art. 9) et un argument de communication.
- Le refus est un moment de design : « L'AEC ne traite pas de ça » doit être aussi soigné qu'une réponse — ton, illustration, 3 mesures voisines, lien désintox. Idem pour le mode dégradé et l'état vide.
- Motion dirigé, jamais décoratif : View Transitions (91,8 % de support, iOS 18+), durées ≤ 300 ms, prefers-reduced-motion respecté, zéro WebGL/Three.js, 60 fps sur un Android milieu de gamme avec CPU throttling x4.
- Ton de voix : chaleureux, direct, précis, jamais infantilisant, jamais bureaucratique, jamais publicitaire. Les formules de l'introduction (« Cet autre monde est possible », « La France est à nous. Nous tous. ») donnent le registre ; le tutoiement/vouvoiement est testé, pas décidé en chambre.
- Conformité par le design : la mention IA (art. 50 AI Act, en vigueur depuis le 2/8/2026), l'attribution CC BY-NC-SA, les mentions légales et le mode silence électoral (L49) sont des éléments d'interface intégrés à la charte, pas des disclaimers — l'utilisateur refuse les disclaimers, pas la loi.
- Métrique nord unique : le taux de passage d'un moment ludique/chat vers la lecture d'une section du programme (l'effet robuste des VAA est « donner envie d'aller lire », pas changer un vote). Tout ce qui ne sert pas cette métrique est coupé.
- Chaque fait du dossier porte une URL source et une étiquette FAIT VÉRIFIÉ / PROBABLE / HYPOTHÈSE ; les chiffres de free tiers tiers (Cerebras, Mistral, Gemini) sont invérifiés tant qu'ils ne sont pas lus dans la console du fournisseur.

## PISTES
### [P0/S] T0 — Cadrage & arbitrages utilisateur (à poser en ouverture, en un seul lot)
Q : Quelles décisions n'appartiennent qu'à belo et doivent être prises avant toute maquette pour ne pas invalider le travail de la session ?
Sous-questions :
  - Groq (Groq Inc., puces LPU, aucun lien avec xAI) est-il acceptable en fallback, ou proscrit par prudence de communication (risque de capture d'écran « powered by Groq ») ?
  - La tortue peut-elle être nommée, animée, faire parler dans l'app ? A-t-elle un nom d'usage interne connu des militants ? Le lait-fraise est-il un easter egg acceptable ?
  - Quelle option d'identité : (a) fidélité totale + ligne « projet militant indépendant » en pied de page, (b) wordmark propre à l'app distinct du logo M27, (c) charte déclinée ? La mention d'indépendance éditoriale entre-t-elle dans le refus des disclaimers ?
  - Nom de l'app et domaine : belo a-t-il déjà une idée ? Budget domaine (~10 €/an acceptable ?) ; achat unique de 10 $ de crédits OpenRouter acceptable au titre de « coût d'exploitation ~0 € » ?
  - Licence du dépôt : open source (MIT/Apache pour le code, CC BY-NC-SA pour data/) ou privé ? Publication du dataset JSON de l'AEC 2025 en CC BY-NC-SA ?
  - Accès à 3-5 militants pour des tests sur téléphone pendant la session (groupe WhatsApp, Discord LFI) ? À défaut, accepte-t-on un panel de personas comme substitut étiqueté HYPOTHÈSE ?
  - Compte Cloudflare disponible pour les tests Workers AI / AI Gateway / Vectorize (free tier, sans carte) ? Accepte-t-on de consommer les 10 000 neurons/jour en tests ?
  - Cible de lancement : une v1 avant le 1er octobre 2026 (début de la période L52-1 : plus aucune promotion payante possible ensuite) est-elle visée ? Combien d'heures/semaine belo peut-il investir ?
  - Identité dans les mentions légales : nom complet, prénom + e-mail + hébergeur, ou association loi 1901 ?
  - Tutoiement ou vouvoiement par défaut (sera aussi testé sur militants, mais belo a-t-il une conviction) ?
Méthodes :
  - AskUserQuestion en un seul lot de 8-10 questions à choix, avec pour chacune la distinction Groq/Grok et les 3 options d'identité documentées (sources : console.groq.com/docs/rate-limits, lafranceinsoumise.fr/charte-graphique/ restriction d'usage verbatim).
  - Consigner les réponses dans la section 0 du dossier comme DÉCISIONS UTILISATEUR (verbatim), à répercuter dans le prompt final.
Livrable : Section 0 du dossier : tableau des arbitrages utilisateur, chacun avec la réponse verbatim et son impact sur les tracks (ex. « Groq proscrit → fallback = OpenRouter/Cerebras »).
Décision : Toutes les questions ont une réponse explicite ou un choix par défaut assumé et daté ; aucune track P0 ne démarre avec une inconnue qui appartient à belo.
Dépend de : 

### [P0/L] T1 — Arc émotionnel & mécanique d'entrée : les 30 premières secondes
Q : Quelle mécanique d'entrée produit, sur mobile, le « wow » en moins de 10 secondes puis un premier « aha » en moins de 3 minutes, pour les trois personas, sans ressentir de manipulation ni de frivolité ?
Sous-questions :
  - Quatre candidates à comparer : (A) « Tu valides ? » swipe sur 12 mesures anonymisées puis reveal « tout ça, c'est dans l'AEC » ; (B) « 3 idées pour toi » — choix d'une situation de vie (étudiant, locataire, aidant, retraité, précaire…) → 3 mesures verbatim qui changent SA vie ; (C) « Devine le % » — quiz slider sur les 48 encadrés À savoir avec reveal du chiffre sourcé ; (D) « Un concept en 20 secondes » — scrollytelling de la règle verte avec explorable manipulable.
  - Le reveal a-t-il un sens avec un seul programme ? Quelle reformulation du résultat évite l'effet Elyze (score opaque = accusation de manipulation) : « tu as validé 9 mesures sur 12 — voici celles qui vont te surprendre » vs carnet « ton AEC en 10 mesures » vs carte des 4 parties colorée ?
  - Quel est l'écran 0 exact (hero) : compteur « 831 mesures, dont 143 nouvelles » qui s'incrémente ? Une question directe (« C'est quoi la règle verte ? ») ? La tortue ? Un À savoir choc ?
  - Quelle est la timeline émotionnelle cible : curiosité (0-3 s) → surprise (10 s) → compréhension (1-3 min) → fierté/envie de transmettre (partage) → retour (mesure du jour / mode riposte) ?
  - Le cadrage « d'accord / pas d'accord » sur une mesure LFI est-il contre-productif ? Tester les alternatives « ça me parle / ça me surprend / je veux comprendre ».
  - Comment l'entrée se comporte-t-elle quand on ARRIVE PAR UN LIEN de partage sur une mesure ou un concept (cas majoritaire) plutôt que par la home ?
Méthodes :
  - Skill design : un canvas « Arc émotionnel », 4 lignes (A/B/C/D) × 5 artboards mobiles 390×844 (écran 0, 10 s, moment aha, résultat, carte partage), avec le VRAI contenu : mesures du chapitre 12 s1 (verbatim vérifié), À savoir « 83 % … Harris Interactive, juillet 2021 », règle verte.
  - Panel de juges (workflow multi-agents, 5 juges en parallèle) : Camille 34 ans militante pressée sur WhatsApp ; Yanis 22 ans indifférent, TikTok ; Martine 58 ans abstentionniste méfiante ; « Auditeur charte » (éliminatoire) ; « Adversaire politique chasseur de captures » (note le risque de screenshot ridicule/manipulateur). Grille : temps estimé au premier « ah ok » (0-5), clarté du résultat (0-5), envie de partager (0-5), sentiment de manipulation (0-5 inversé), risque frivole (0-5 inversé), fidélité charte (pass/fail).
  - Critique adversariale : un agent joue un journaliste de fact-checking et un militant RN et tente de retourner chaque écran en capture hostile ; on corrige ou on élimine.
  - Micro-prototype jouable (Artifact HTML/CSS/JS, mobile) des 2 mécaniques finalistes avec 12 vraies mesures et l'À savoir, pour le test militant (T14).
  - Chronométrage réel sur téléphone : time-to-first-aha mesuré sur 3-5 militants (T14).
Livrable : « Arc émotionnel v1 » : timeline 0 s → 10 s → 3 min → partage → retour, mécanique d'entrée retenue (et sa variante d'arrivée par lien), écran 0 spécifié, 2 prototypes jouables, matrice de scores des 4 candidates.
Décision : Mécanique retenue si : time-to-first-aha mesuré < 30 s sur ≥ 3/5 militants ; « je l'enverrais à quelqu'un » ≥ 3/5 ; score manipulation ≤ 1/5 chez Martine et l'adversaire ; fidélité charte PASS ; conduit vers la lecture d'une section (métrique nord) dans le prototype.
Dépend de : T0, T2, T3, T8

### [P0/L] T2 — La carte-concept : anatomie du « aha » et glossaire vivant (cœur de la demande)
Q : Quelle est l'anatomie exacte d'une carte-concept qui fait comprendre « règle verte » ou « bifurcation écologique » à un jeune de 22 ans en moins de 60 secondes, sans jamais inventer, et qui donne envie d'aller lire la section ?
Sous-questions :
  - Quelles couches et dans quel ordre : (1) une phrase en français courant, (2) un paragraphe « pourquoi ça compte pour toi », (3) la citation VERBATIM du programme avec URL de section et index de mesure, (4) « ce que ça change concrètement » (3 mesures liées), (5) objection fréquente → réponse sourcée (désintox.lafranceinsoumise.fr), (6) termes voisins, (7) source de la définition (livret/plan 2022 avec année affichée) ?
  - Faut-il une métaphore visuelle par concept (illustration dans le style isométrique du LOGO-M27, teintes #E5CBFF/#FDEDFF/#FFD2CF) ou un explorable manipulable pour les 3-5 concepts structurants (règle verte : curseur prélèvement/régénération ; 6e République : avant/après ; planification : frise) ?
  - Quels sont les 40-60 termes du lexique fermé (fréquences déjà connues : bifurcation écologique 28, constituante 34, smic 19, planification écologique 13, pôle public 11, 6e République 9, règle verte 7, révolution citoyenne 4, écocide 4, flux tendus 1, protectionnisme solidaire 1, créolisation 1) et lesquels n'ont AUCUNE source LFI (à marquer « définition rédigée par nous, relue par belo ») ?
  - Qui écrit : Claude génère, belo relit, JSON versionné et figé — vs génération à la volée (rejetée par défaut) ? Quel test de non-régression (chaque citation doit matcher exactement une entrée du corpus) ?
  - Quel niveau de langue : le registre FALC 2022 (/laec-falc/) est-il réutilisable comme référence de « une phrase simple » ?
  - Comment relier les concepts à la recherche : un terme tapé dans la barre doit-il ouvrir la carte-concept avant toute réponse IA (réponse instantanée, 0 neuron) ?
Méthodes :
  - Sweep multi-agents de sourcing (5 agents en parallèle, un par concept pilote : règle verte, bifurcation écologique, 6e République/constituante, planification écologique, écocide) : WebFetch sur https://melenchon2027.fr/plans-2022/regle-verte/, https://melenchon2027.fr/plans-2022/6e-republique/, https://melenchon2027.fr/livrets-2022/planification-ecologique/, https://melenchon2027.fr/laec-falc/, et via l'API REST https://melenchon2027.fr/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,link,title ; recherche des occurrences verbatim dans le livre 2025 (chapitre12/s1 pour la règle verte) ; désintox.lafranceinsoumise.fr pour l'objection fréquente.
  - Rédaction des 5 cartes exemplaires en JSON (schéma proposé : {term, slug, one_liner, why_it_matters, verbatim:[{text, section_url, measure_id}], related_measures, objection:{claim, answer, source}, related_terms, sources:[{url, year, kind}], review_status}).
  - Skill design : 3 variantes d'anatomie de carte-concept (dense / progressive-disclosure / explorable) sur « règle verte », rendues aux tokens de la charte, en 390 px de large.
  - Panel de juges : Yanis (22 ans) doit pouvoir réexpliquer le terme en une phrase après lecture — un juge « Yanis » lit la carte puis un second juge évalue son explication ; un juge « fact-checker » vérifie que chaque phrase est soit verbatim soit clairement marquée comme reformulation.
  - Extraction automatique des candidats (script en scratchpad, lecture seule du corpus) : termes à faible fréquence en français courant + majuscules/guillemets dans le texte (« règle verte », « garantie d'emploi »).
Livrable : Schéma JSON du glossaire + 5 cartes-concept complètes et sourcées (règle verte, bifurcation écologique, 6e République, planification écologique, écocide) + liste des 40-60 termes avec statut de source (livre 2025 / livret 2022 / plan 2022 / aucune) + anatomie de carte retenue (maquette) + règle éditoriale « verbatim vs reformulé » (typographie distincte).
Décision : Anatomie retenue si le juge Yanis réexplique correctement 5/5 concepts en < 60 s ; 100 % des citations matchent exactement le corpus ; chaque carte a ≥ 1 source LFI datée ou porte la mention « rédigé par nous » ; le fact-checker ne trouve aucune affirmation non sourcée ; ≥ 3/5 militants disent « j'aurais aimé avoir ça » (T14).
Dépend de : T8

### [P0/L] T3 — Direction artistique sur pièces : 3 axes → 1 (ou un hybride assumé)
Q : Laquelle des directions A « éditorial-typographique », B « ludique-cartes/tortue », C « immersif 4 mondes » (ou quel hybride) respecte strictement la charte 2027, passe le contraste AA, reste lisible à 360 px, paraît premium et donne envie d'être envoyée sur WhatsApp ?
Sous-questions :
  - Hiérarchie des palettes : la charte affiche « Couleurs 2027 » AVANT les 6 vives (vérifié) et LogoTortue.svg n'utilise que #4C0297/#FFFCF4/#D1271C → 4 = marque, 6 = accents ; à confirmer par capture d'écran, puis figer les tokens (racine + teintes #E5CBFF, #FDEDFF, #FFD2CF issues du LOGO-M27).
  - Gowun Batang tient-elle en corps de texte français (é è ê à ç ù œ « ») à 16-18 px sur Crème ? N'a que 400/700 : Gowun Batang partout, ou Public Sans en corps et Gowun Batang réservée aux citations verbatim (ce qui distinguerait typographiquement le verbatim du reformulé — un atout pour la fidélité) ?
  - Quelle échelle typographique et quels réglages de Public Sans (graisse 800-900, letter-spacing négatif, font-stretch) pour approcher Config Condensed sans la licencier ?
  - Quelles règles d'illustration/iconographie (la charte est muette) : rétro-ingénierie des 5 affiches T27 (Paix, Égalité des droits, Blocage des prix, 6e République, Planification écologique) et du LOGO-M27.svg (isométrique, 118 paths) → 5-8 règles explicites (angle, trait, arrondis, ombres, teintes).
  - Faut-il redessiner une tortue vectorielle légère (LogoTortue.svg embarque un PNG 1920² en base64 — piège de performance) et sous quelles formes (statique, marche, célèbre, dort) ?
  - Un « mode story » sur fond Charbon #212320 (où les 6 vives passent AA : Jaune 10,09:1, Rose 5,18:1, Bleu 4,40:1, Vert 4,39:1) est-il la bonne place pour la palette vive et l'univers « 4 parties » de l'axe C ?
  - Quelle police le site melenchon2027.fr sert-il réellement (Union gothic / Stack Sans trouvées en @font-face, commerciales) — et faut-il s'en écarter sciemment au profit des substituts autorisés par la charte ?
Méthodes :
  - claude-in-chrome : captures de https://lafranceinsoumise.fr/charte-graphique/, des 5 affiches (https://melenchon2027.fr/wp-content/uploads/2026/05/AFFICHES-T27_6erep-scaled.jpg, AFFICHES-T27_Eco-1.jpg…), du LOGO-M27.svg, de la couverture A5 ; getComputedStyle(document.body).fontFamily + document.fonts sur une page du livre ; inventaire du zip Logos-LFI.zip.
  - Skill design : UN canvas « Direction artistique », 3 lignes (A/B/C) × 4 artboards identiques (accueil 390×844, carte-concept « règle verte », section chapitre 12 s1 verbatim, carte partage 1080×1920), même contenu partout pour ne comparer que le design ; + 1 artboard « tokens & typo » par axe (échelle, contrastes calculés).
  - Échantillon typographique rendu (Artifact) : le chapeau de chapitre 12 s1 et la mesure « Inscrire dans la Constitution le principe de la « règle verte »… » en Gowun Batang 400/700 vs Public Sans, 16/18 px, sur #FFFCF4.
  - Calcul de contraste systématique (script scratchpad) sur toutes les paires token/fond utilisées dans les maquettes ; seuils AA 4,5:1 texte courant, 3:1 ≥ 24 px bold.
  - Panel de juges pondéré : fidélité charte ×3 (éliminatoire), envie de partager ×3, lisibilité 360 px ×2, contraste AA ×2 (éliminatoire), coût d'implémentation ×1, risque frivole ×2, « ressemble trop au site officiel / n'apporte rien » ×2. Critique adversariale « ça sent le faux » par un juge qui connaît l'ancienne charte (Montserrat/bleu/Φ).
  - Test militant (T14) : 3 écrans d'accueil montrés 5 s chacun : « lequel tu envoies à ton cousin qui vote pas ? » et « lequel a l'air officiel ? ».
Livrable : Design system v0 : fichier de tokens CSS (couleurs, teintes, typo, espacements, rayons, ombres, durées), échelle typographique, règles d'illustration (5-8), tortue vectorielle (brief ou SVG), moodboard, les 3 directions maquettées avec scores, direction retenue argumentée + ce qu'on emprunte aux deux autres.
Décision : Direction retenue = seule (ou meilleure) à passer les deux critères éliminatoires (charte, AA) ET score pondéré le plus haut ET choisie par ≥ 3/5 militants à la question « lequel tu envoies ». Tokens figés dans le dossier avec justification par URL (charte, SVG).
Dépend de : T0

### [P1/M] T4 — Motion, micro-interactions et sensation de fluidité (le « premium » sans WebGL)
Q : Quelle signature de mouvement fait sentir un produit haut de gamme et vivant, à 60 fps sur un Android milieu de gamme, en servant la lecture au lieu de la distraire ?
Sous-questions :
  - Quelles transitions entre concept → mesure → section → chapitre (View Transitions same-document, 91,8 % de support, iOS ≥ 18) et quel fallback sans transition ?
  - Comment « révéler » une citation verbatim (balayage de surlignage Violet, pas d'effet machine à écrire), un chiffre À savoir (compteur qui monte puis se fige), un résultat de swipe (physique de carte, seuil, retour élastique) ?
  - Quelles micro-interactions signature : la tortue qui avance sur la carte des chapitres, le tap sur un terme qui « ouvre » la carte-concept en place, le bouton partager qui produit la carte image avec un feedback de « génération » < 300 ms, haptique (navigator.vibrate sur Android) ?
  - Quelles durées/easings (ex. 160 ms micro, 240 ms navigation, 320 ms reveal ; cubic-bezier standard vs spring) et quelle règle prefers-reduced-motion (tout remplacé par des fondus ≤ 120 ms) ?
  - Skeletons et états vides : que voit-on pendant les 200 ms d'un chargement, et comment l'arrivée par lien WhatsApp évite tout flash de layout (CLS < 0,1) ?
  - Quelles références précises copier/écarter : Stripe (sobriété), Linear (vitesse perçue), Arc (personnalité), Duolingo (feedback ludique), une pièce Pudding (scrollytelling), Wahl-O-Mat (cartes politiques) ?
Méthodes :
  - claude-in-chrome : inventaire de motion sur stripe.com/fr, linear.app, arc.net, duolingo.com, une pièce pudding.cool, wahl-o-mat.de (captures + notes : ce qui bouge, durée, easing, ce que ça signifie).
  - Artifact : 3 micro-prototypes interactifs mobiles (reveal de citation, swipe de carte de mesure, transition concept → section) avec les tokens de T3, testables sur téléphone.
  - Skill web-perf (Chrome DevTools MCP) : trace de performance des prototypes avec CPU throttling ×4 et réseau 4G simulé ; mesure INP/CLS/LCP.
  - Rédaction d'une « motion spec » (tableau : élément, déclencheur, durée, easing, propriété animée, fallback reduced-motion, sens narratif).
Livrable : Motion spec + 3 micro-prototypes validés sur téléphone + budget de performance (LCP < 2,0 s en 4G, CLS < 0,1, INP < 200 ms, JS initial < 100 Ko gzip, polices woff2 auto-hébergées sous-ensemblées latin/latin-ext).
Décision : Chaque interaction ≤ 320 ms ; aucun frame > 16 ms dans la trace throttlée ×4 sur les 3 prototypes ; ≥ 4/5 militants qualifient le prototype de « fluide/pro » spontanément ; reduced-motion fonctionnel.
Dépend de : T3

### [P1/M] T5 — Ton de voix & microcopy : la voix qui séduit sans infantiliser
Q : Quelle voix rend l'app chaleureuse, directe et crédible à la fois pour un militant de 45 ans et un jeune de 22 ans, y compris dans le refus, la mention IA et les messages de partage ?
Sous-questions :
  - Tutoiement ou vouvoiement (test A/B sur militants ; hypothèse : tutoiement pour les mécaniques ludiques, registre neutre pour les cartes-concept) ?
  - Comment formuler le refus hors programme (« L'AEC ne parle pas de X. Voici les 3 mesures les plus proches. ») et le mode dégradé (« Réponse directement extraite du programme ») sans excuse ni jargon ?
  - Comment intégrer la mention IA obligatoire (art. 50) comme un élément de confiance (« Réponses composées à partir du texte officiel, vérifiées mot à mot ») plutôt qu'un avertissement ?
  - Quels titres/accroches pour l'écran 0 (« 831 mesures. On t'en montre 5 qui changent ta vie. » / « C'est quoi la règle verte ? En 20 secondes. ») et quels messages pré-rédigés pour le partage WhatsApp (3 tons : cousin, collègue, parent) ?
  - La tortue a-t-elle une voix (si T0 l'autorise) et quelle est sa personnalité en 5 adjectifs (tenace, sagace, calme, drôle, jamais moqueuse) ?
  - Comment typographier la frontière verbatim/reformulé pour que la voix de l'app ne se confonde jamais avec la voix du programme ?
Méthodes :
  - Collecte de registre : WebFetch sur https://melenchon2027.fr/programme2025/livre/introduction/ (formules vérifiées : « Cet autre monde est possible », « La France est à nous. Nous tous. »), https://melenchon2027.fr/laec-falc/ (registre simple officiel), quelques posts de comptes militants.
  - Rédaction d'un guide de voix (10 règles, 20 exemples do/don't) et d'un kit de 50 chaînes (accueil, navigation, chat, refus, dégradé, partage, erreurs, mentions).
  - Panel de juges : 2 variantes (tu/vous) × 10 écrans clés notées par Camille/Yanis/Martine sur « m'adresse à moi », « crédible », « pas gnangnan » ; critique adversariale « on dirait une pub » / « on dirait l'administration ».
  - Test militant (T14) : lecture à voix haute de 5 micro-textes, réaction spontanée notée.
Livrable : Guide de voix + kit microcopy (50 chaînes en français, clés i18n en anglais) + copy de l'écran de refus, du mode dégradé, de la mention IA, et 3 messages de partage pré-rédigés.
Décision : Variante retenue si ≥ 3/5 militants la préfèrent et qu'aucun juge ne détecte de « disclaimer feel » ni de ton publicitaire sur les 10 écrans clés ; la mention IA est jugée « visible sans être un mur ».
Dépend de : T0, T2

### [P0/M] T6 — Artefact de partage & canal dark social (WhatsApp/Telegram d'abord)
Q : Quel artefact (image, texte, URL), généré en 1 geste, fait qu'un militant le transfère à un proche indécis et que ce proche l'ouvre — et comment le produire à coût 0 € sur Workers ?
Sous-questions :
  - Quels formats et lesquels en premier : 1200×630 (OG lien, obligatoire), 1080×1920 (story, mode Charbon), 1080×1080 (post), 800×800 (universel militant) ?
  - Quelles cartes : mesure verbatim + chapitre ; concept (une phrase + verbatim) ; « Devine le % » (mon estimation vs le vrai chiffre + institut + date — indispensable pour l'honnêteté, sondages 2020-2021) ; résultat « mon AEC en 10 mesures » ; défi « 14/18 chapitres » ; « mesure du jour » ?
  - Partage en 1 geste : Web Share API avec fichiers (navigator.canShare({files}) — 92,8 % de support, iOS 12.2+) pour envoyer l'image + texte pré-rédigé + URL directement dans WhatsApp ; fallback copie de lien + téléchargement.
  - Schéma d'URL courte, lisible, stable et sans contexte : /m/ch12-s1-01, /c/regle-verte, /q/devine/… ; état de défi encodé dans l'URL (façon Wordle) sans serveur.
  - Aperçu de lien : que montrent exactement WhatsApp, Telegram, iMessage, Instagram DM, Discord pour nos balises OG/Twitter ; pièges (cache d'aperçu, taille max, ratio) ?
  - Pipeline satori + resvg-wasm (workers-og) : PNG uniquement (WebP plante), ~0,5-1,1 s à froid, ~50 ms en cache ; polices Public Sans/Gowun Batang embarquées dans le Worker ; cache immutable par ID+hash ; budget 10 ms CPU sur plan gratuit — la génération tient-elle, ou faut-il pré-générer les 837 + 60 cartes au build et les servir en static assets (gratuit, illimité) ?
  - Attribution CC BY-NC-SA et source (URL courte + « L'Avenir en commun 2025 — La France insoumise ») intégrées au design de chaque carte.
Méthodes :
  - Skill design : canvas « Kit de partage », 6 types de cartes × 2 ratios (1200×630, 1080×1920) aux tokens de T3, avec vrai contenu (mesure règle verte, À savoir 83 %).
  - context7 : docs Cloudflare Workers Static Assets, limites CPU du plan gratuit, et lecture de https://tom-sherman.com/blog/dynamic-og-image-cloudflare-workers ; décision build-time vs runtime.
  - WebFetch : règles d'aperçu OG de WhatsApp/Telegram (developers.facebook.com/docs/sharing/webmasters, core.telegram.org/api/links) ; test réel des aperçus avec un prototype déployé (wrangler dev + tunnel) envoyé dans le groupe de test.
  - Test militant (T14) : tâche « envoie cette mesure à quelqu'un » chronométrée ; observation du geste réel (share sheet ? capture d'écran ?).
Livrable : Kit de partage : spécification des 6 cartes × 2 ratios (maquettes), schéma d'URL, messages pré-rédigés, décision de pipeline (pré-génération au build vs Worker satori), checklist d'aperçu par messagerie, règle d'attribution.
Décision : Carte lisible en vignette WhatsApp (texte principal ≥ 40 px à 1200×630) ; aperçu correct sur WhatsApp + Telegram + iMessage ; partage en ≤ 2 taps ; ≥ 3/5 militants transfèrent réellement pendant le test ; coût de génération = 0 € à 100 000 partages/jour (static assets).
Dépend de : T3, T8

### [P0/L] T7 — Contrat IA « ne jamais inventer » & expérience du chat (réponse, refus, dégradé)
Q : Comment rendre le chat sur les concepts à la fois délicieux (instantané, précis, sourcé) et structurellement incapable d'inventer une mesure, à 0 € et robuste à un pic viral ?
Sous-questions :
  - Architecture : (A) index lexical MiniSearch/BM25 sur 62 Ko gzippés embarqués côté client (0 serveur) ; (B) Workers AI bge-m3 + Vectorize ; (C) routage lexical puis chapitre entier (~3 000 tokens) en contexte ; (D) « routeur seulement » : le LLM renvoie des IDs de mesures/concepts + 2 phrases de liant, l'app affiche le verbatim depuis le JSON. Hypothèse forte : A + D, B inutile.
  - Quel modèle Workers AI produit un français de qualité militante et respecte le contexte : @cf/meta/llama-3.1-8b-instruct-fast (JSON mode, ~535 q/jour), @cf/mistralai/mistral-small-3.1-24b-instruct (~127 q/jour, pas de JSON mode), @cf/google/gemma-3-12b-it, llama-4-scout, gpt-oss-120b ?
  - Un hit de cache AI Gateway évite-t-il la consommation de neurons ? Quelle normalisation de question (minuscules, sans accents, chips de questions suggérées) pour faire monter le taux de hit ?
  - Contrat de fiabilité : réponse = 1-3 extraits verbatim + ≤ 2 phrases de liant + lien section ; validation post-génération (toute chaîne entre guillemets doit matcher le corpus, sinon supprimée) ; refus par défaut hors périmètre ; garde-fous contre prompt injection et propos condamnables (Llama Guard ? liste de motifs ? périmètre strict).
  - UI de la réponse : bloc verbatim typographié Gowun Batang + chapitre + bouton partager ; UI du refus (« L'AEC ne traite pas de ça » + 3 mesures voisines + désintox) ; UI du mode dégradé (« Réponse directement extraite du programme ») — indistinguable en qualité perçue ?
  - Questions suggérées pré-générées (chips statiques par concept/section) pour capter 80 % des questions sans LLM ; FAQ pré-générée au build (200-400 paires) à partir des objections classiques et de la synthèse des contributions.
  - Comment prouver publiquement la fidélité : jeu adversarial de 50 questions publié dans le dépôt, résultats affichés ; règle de comptage 831 vs 837 documentée.
Méthodes :
  - Construction du jeu d'évaluation (scratchpad) : 30 questions réalistes (10 jargon, 10 indécis « ça coûte combien ? c'est communiste ? », 10 militant « comment on finance X ? ») + 20 adversariales (mesures inexistantes : corrida, sortie de l'euro, PMA ; jargon RN ; provocations ; injection).
  - Sweep multi-modal en parallèle (5 agents, un par modèle) sur le compte Cloudflare de belo : variantes A/C/D × modèles ; mesure neurons/question, latence p95, rappel@5 ; context7 pour les docs Workers AI (JSON mode, pricing, AI Gateway caching) et skill cloudflare.
  - Test empirique AI Gateway : 2 requêtes identiques avec cf-aig-cache-ttl, vérification cf-aig-cache-status: HIT et lecture de la consommation de neurons dans le dashboard avant/après.
  - Panel de juges (3 juges) sur chaque réponse : français natif 0-5, fidélité verbatim 0-5, refus correct 0/1, longueur mobile 0/1 ; juge « chasseur de captures » tente de produire une capture nuisible.
  - Skill design : 3 artboards (réponse, refus, dégradé) aux tokens de T3 ; comparaison par juges « laquelle a l'air d'une panne ? » (objectif : aucune).
  - Arbitrage Groq/Grok issu de T0 appliqué au choix du fallback (OpenRouter 10 $ une fois → 1 000 req/jour ; Cerebras ; ou aucun fallback tiers et mode extractif seul — le plus propre RGPD).
Livrable : Contrat de fiabilité (1 page) + architecture retenue (A+D probable) + modèle retenu avec chiffres (neurons, latence, scores FR) + jeu d'évaluation versionné avec résultats + UI réponse/refus/dégradé maquettées + stratégie de cache/normalisation + politique de fallback.
Décision : 0 mesure inventée sur les 20 adversariales (éliminatoire) ; score français ≥ 4/5 moyen ; p95 < 3 s ; mode dégradé jugé « non dégradé » par ≥ 4/5 juges et militants ; coût 0 € jusqu'à 100 000 visites/jour grâce au client-side + cache ; aucune donnée utilisateur envoyée à un tiers qui entraîne (Gemini free exclu).
Dépend de : T0, T2, T8

### [P0/M] T8 — Corpus, pipeline & schéma d'identifiants (fondation de tous les atomes)
Q : Comment obtenir un JSON strictement typé, dédupliqué et versionné des 18 chapitres / 89 sections / 837 propositions / 48 À savoir, avec des IDs stables qui servent d'URL, de citation et de clé de carte de partage ?
Sous-questions :
  - Algorithme canonique : GET 18 pages chapitre → parser nav.tdm → GET 89 sections (107 requêtes, User-Agent identifiable) ; interdiction du crawl par force brute (slug sN résolu globalement) et déduplication du flux RSS (171 items dont ~82 alias).
  - Schéma d'ID : chNN-sMM-kNN (mesure-clé) / mNN / mNN.sN (sous-mesure) + hash court SHA-256 du texte pour détecter les modifications ; mapping vers l'URL source ; cas limites (2 sections sans mesure-clé, 4 avec sous-mesures, 14 multi-paragraphes).
  - Types TypeScript : Book, Part, Chapter, Section, Proposal (kind: key|measure|sub), Fact (À savoir : text, institute, date), Concept (glossaire), Contribution stats ; JSON ≤ 70 Ko gzippé pour l'embarquement client.
  - Règle de comptage affichée : « 831 mesures » (officiel) vs 837 extraites (sous-mesures) — documenter et afficher le chiffre officiel avec note méthodo en page à propos.
  - Fraîcheur : Cron Trigger hebdomadaire + hash par section + assertions d'invariants (18/89/~837) + échec bruyant ; affichage « à jour au JJ/MM/AAAA » ; le serveur MCP /wp-json/mcp est-il ouvert en lecture (un GET/POST d'initialisation, abandon immédiat si 401/403) ?
  - Synthèse des 24 000 contributions (20 posts Elementor, cat. 84-88) : n'extraire que les chiffres agrégés par chapitre pour un badge « co-construit » ; effort vs valeur.
  - Licence : dataset publié en CC BY-NC-SA 4.0 avec attribution, séparé du code (data/ vs src/) ; capture horodatée des mentions légales.
Méthodes :
  - WebFetch sur https://melenchon2027.fr/programme2025/livre/chapitre12/ (nav.tdm), /chapitre12/s1/ (fixture canonique), /chapitre1/s6/ (sous-mesures), /introduction/ (chiffres officiels), https://melenchon2027.fr/mentions-legales/ ; context7 pour HTMLRewriter et Cron Triggers.
  - Script d'extraction exécuté en scratchpad (lecture seule du web, écriture uniquement dans le scratchpad) produisant le JSON de chapitre 12 complet + statistiques d'invariants ; comparaison avec les comptes des éclaireurs (89 sections, 837, 48).
  - Inventaire des 48 À savoir (texte, %, institut, date) → matière du quiz « Devine le % » (T9) et des cartes (T6).
  - Requête wp/v2/posts?_fields=content sur le post id 23110 pour mesurer le coût de parsing Elementor et décider (agrégats seulement).
Livrable : Modèle de données TypeScript + spécification du pipeline (algorithme, pièges, invariants, cron, hash) + JSON complet du chapitre 12 (fixture) + inventaire des 48 À savoir + décision sur la synthèse des contributions + note licence/attribution.
Décision : Le JSON de chapitre 12 reproduit exactement les 3 sections et leurs mesures vérifiées ; les invariants globaux sont reproduits (18/89/837/48) ; chaque atome a un ID, une URL source et un hash ; taille projetée ≤ 70 Ko gzippé.
Dépend de : 

### [P1/M] T9 — Gamification sans compte : progression, défis, rendez-vous (et ce qu'on refuse)
Q : Quelles mécaniques créent le retour et le partage sans aucune donnée serveur, sans compte, sans notification, et sans qu'un militant de 45 ans ait honte de les partager ?
Sous-questions :
  - « La tortue avance » : carte de progression des 18 chapitres (route/frise, tortue qui avance, localStorage) — est-ce motivant ou puéril selon l'exécution ?
  - « Devine le % » sur les 48 À savoir : slider → reveal du vrai chiffre + institut + date ; partage « J'ai dit 60 %, c'est 83 % » ; combien de questions par partie (5 ?), quel écran de fin ?
  - « Ton AEC en 10 mesures » : carnet construit par « ça me parle » ; export image + URL encodant l'état (Wordle-like) ; sans serveur.
  - « Mesure du jour » / « Concept du jour » : déterministe par date (même pour tout le monde), rendez-vous éditorial sans push ; cohérence avec le mode silence électoral (pas de nouveau contenu les veilles de scrutin).
  - Défi par lien : « 14/18 chapitres, et toi ? » ; duel « Devine le % » à deux par état dans l'URL ; option Durable Object (SQLite, plan gratuit) pour une room live — P2 ?
  - Badges purement locaux (ex. « Constituant·e » après le chapitre 1) et streak-free : quels badges, quel style (pixel art tortue des affiches ?) ; ce qu'on REFUSE : leaderboards, streaks serveur, notifications, comptes.
  - Accessibilité WCAG 2.2 : cibles ≥ 24 px, alternative clavier/boutons au swipe, focus visible, annonces ARIA sur reveal ; le swipe est-il un « plus » et jamais le seul chemin ?
Méthodes :
  - Skill design : canvas « Mécaniques », un artboard par mécanique (progression, Devine le %, carnet, mesure du jour, défi, badges) + écran de fin de chaque boucle avec CTA vers la lecture d'une section (métrique nord).
  - Panel de juges avec un persona supplémentaire « militant sceptique de 45 ans, cadre syndical » notant « j'aurais honte de partager ça » (0-5 inversé) et « ça m'a donné envie de lire le chapitre » (0-5).
  - Micro-prototype « Devine le % » (Artifact) avec 5 vraies stats À savoir pour le test militant.
  - Skill durable-objects (lecture des limites) pour évaluer le coût/valeur d'une room live de duel — décision P2 par défaut.
Livrable : Spécification de gamification : mécaniques retenues/coupées avec justification, modèle de progression localStorage + schéma d'état dans l'URL, règles d'accessibilité, liste explicite des refus (compte, leaderboard, streak, push).
Décision : Chaque mécanique retenue passe : honte-à-partager ≤ 1/5 chez le militant sceptique ET conduit vers la lecture d'une section dans le prototype ET fonctionne sans serveur ; « Devine le % » est validé si ≥ 3/5 militants le rejouent spontanément pendant le test.
Dépend de : T1, T8

### [P0/M] T10 — Architecture Cloudflare « statique d'abord » & budget de performance/coût
Q : Quelle architecture donne la sensation d'instantanéité, coûte 0 € même à 100 000 visites/jour, résiste à un pic viral et à l'épuisement de quota, et reste simple à maintenir seul jusqu'en avril 2027 ?
Sous-questions :
  - Framework : Astro (statique + îlots, View Transitions natives) vs SvelteKit vs React+Vite (Tailwind v4 + React est la stack du plugin LFI) — déployé en Workers Static Assets (requêtes gratuites et illimitées) avec run_worker_first: ["/api/*", "/og/*"] ; PWA offline avec le corpus embarqué.
  - Répartition : static assets (pages, glossaire, index de recherche, cartes pré-générées, JSON) / Worker API minimal (/api/ask) / cron d'ingestion / génération OG (build vs runtime) ; contrainte 10 ms CPU par requête sur plan gratuit (le Worker orchestre, il ne calcule pas).
  - Stockage : D1 (100 000 écritures/jour) pour le cache de réponses et compteurs ; KV en lecture seule (1 000 écritures/jour = piège) ; Vectorize seulement si T7 le prouve utile ; Durable Object SQLite pour quota journalier global et rooms P2.
  - Défense du quota : Turnstile invisible/managed (branding Cloudflare à placer discrètement) + binding rate-limit 60 s (per-colo) + quota journalier en DO + budget neurons vérifié avant appel + bascule extractive.
  - Budget de performance figé avant maquettes : LCP < 2,0 s 4G, CLS < 0,1, INP < 200 ms, JS initial < 100 Ko gzip, polices woff2 sous-ensemblées auto-hébergées, zéro appel à fonts.gstatic, images OG cachées immutables, tortue vectorielle ≤ 8 Ko.
  - Analytics sans donnée : Cloudflare Web Analytics (sans cookie) + Workers Analytics Engine pour compteurs agrégés d'événements (passage ludique → lecture) ; aucun identifiant.
  - Feature flags (mode silence électoral L49, wording du chat modifiable sans redéploiement) : variable d'env / KV lu au démarrage.
Méthodes :
  - context7 : Workers Static Assets (billing, run_worker_first), Workers AI pricing/JSON mode/data-usage, AI Gateway caching, D1/KV/DO free tiers, Cron Triggers, Turnstile plans, Analytics Engine ; skills cloudflare, workers-best-practices, wrangler, durable-objects.
  - Rédaction d'ADR (Architecture Decision Records) courts : framework, hébergement, stockage, IA, OG, flags, analytics, sécurité quotas — chacun avec l'URL doc et le chiffre de limite.
  - Modèle de coût sous forme de tableau : 1 000 / 10 000 / 100 000 visites/jour × (requêtes statiques, /api/ask, neurons, D1 writes) → 0 € démontré et point de rupture identifié.
  - Squelette wrangler.jsonc (texte dans le dossier, pas de fichier créé en session lecture seule) et structure de dépôt cible (src/, data/ CC BY-NC-SA, eval/, design/).
Livrable : Jeu d'ADR + squelette wrangler.jsonc + structure de dépôt + tableau de coût + budget de performance + plan de défense du quota + schéma de feature flags.
Décision : Toutes les requêtes hors /api/ask et /og sont statiques ; le tableau montre 0 € à 100 000 visites/jour ; l'app reste 100 % fonctionnelle (recherche, glossaire, partage) avec le Worker API coupé ; chaque ADR cite une limite chiffrée et sourcée.
Dépend de : T7, T6

### [P1/S] T11 — Positionnement, nom & wordmark face à aec2027.fr, laec.fr, avenir-en-commun.net
Q : Quelle phrase de positionnement et quel nom font qu'un militant comprend en une seconde pourquoi envoyer NOTRE lien plutôt que melenchon2027.fr, et que l'écosystème (Discord LFI, Action Populaire) relaie plutôt qu'ignore ?
Sous-questions :
  - Veille aec2027.fr (vérifié le 7/9/2026 : toujours « Merci de patienter, les tortues sagaces sont en train de travailler », illustration Hello Melro) — quel signal déclencherait un pivot (sortie avec chat ? avec quiz ?) et quelle est notre réponse par défaut (lier vers l'officiel, occuper comprendre/jouer/partager) ?
  - laec.fr (vérifié : édition 2022, « pour les convaincus », Django/Bootstrap, /visuels 21 images) et avenir-en-commun.net (simulateur 4 écrans, backend Render qui s'endort) : audit des parcours, captures, points de douleur, ce qu'on reprend, ce qu'on dépasse.
  - Nom : 20 candidats → 3 (critères : dit « comprendre », mémorisable à l'oral dans une soirée, domaine .fr disponible, pas de marque INPI LFI utilisée comme nom, compatible avec la tortue) ; wordmark propre en Public Sans 900.
  - Une phrase : « melenchon2027.fr = le texte officiel ; laec.fr = la référence 2022 ; [nom] = là où un indécis comprend en 3 minutes et où un militant trouve sa réponse sourcée en 10 secondes ».
  - Placement de la ligne d'indépendance (selon T0) : pied de page + page À propos + mentions légales, jamais en overlay.
Méthodes :
  - WebFetch/claude-in-chrome : https://aec2027.fr/ (+ /site.webmanifest, robots.txt), https://laec.fr/sommaire, https://laec.fr/visuels, https://avenir-en-commun.net/simulateur.html (parcours complet, captures) ; recherche d'annonces sur lafranceinsoumise.fr et linsoumission.fr.
  - Sprint de nommage multi-agents (3 agents génèrent 20 noms chacun avec justification) → panel de juges → 3 finalistes → AskUserQuestion à belo ; vérification disponibilité domaine (WebFetch sur un registrar) et absence de dépôt INPI homonyme (data.inpi.fr).
  - Rédaction du positionnement et test « une phrase » sur 3-5 militants (T14) : « à qui tu l'enverrais et pourquoi ? ».
Livrable : Audit comparatif (tableau + captures), phrase de positionnement, nom retenu + brief de wordmark, plan de veille aec2027.fr (quoi surveiller, quand, quelle réaction).
Décision : belo choisit le nom parmi 3 finalistes ; ≥ 3/5 militants reformulent spontanément le positionnement après avoir vu l'écran 0 ; l'audit identifie ≥ 5 fonctions que ni laec.fr ni avenir-en-commun.net n'offrent et que nous offrons.
Dépend de : T0

### [P0/S] T12 — Conformité par le design : AI Act art. 50, CC BY-NC-SA, LCEN, L49/L52-1, zéro donnée
Q : Comment satisfaire chaque obligation légale par un élément d'interface fidèle à la charte et « invisible sans être caché », sans jamais ressembler à un disclaimer ?
Sous-questions :
  - Mention IA (art. 50 §1 et §4 al. 2, en vigueur depuis le 2/8/2026) : placeholder de l'input, premier message, badge — 3 variantes maquettées ; l'architecture extractive (verbatim sous contrôle éditorial) permet-elle d'invoquer l'exception « contrôle éditorial » ?
  - Attribution CC BY-NC-SA 4.0 sur chaque carte de partage et en pied de page ; SA appliqué aux contenus dérivés (cartes-concept, FAQ) → publiés sous la même licence ; code séparé (MIT/Apache) ; NC → aucune pub/sponsor, position sur un lien vers la collecte officielle.
  - Mentions légales (LCEN) selon l'option d'identité choisie en T0 ; politique de confidentialité d'une page (« aucune donnée, aucun compte, aucun tracker, analytics sans cookie ») ; pas de bandeau cookies (Cloudflare Web Analytics, polices auto-hébergées).
  - Mode silence électoral (L49) : feature flag par date (veille de chaque tour 00h00 → clôture) : gel des nouveaux contenus/cartes/mesure du jour, chat maintenu ou coupé ? — décision à documenter avec la lecture du Conseil constitutionnel.
  - L52-1 : zéro promotion payante à partir du 1er octobre 2026 → plan de lancement 100 % organique (T13).
  - RGPD art. 9 : aucune question stockée avec identifiant ; si journalisation des questions pour améliorer le corpus, texte seul, sans IP, purge 30 jours, annoncée — ou renoncement (recommandé).
Méthodes :
  - WebFetch : https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.fr (Adapted Material, NonCommercial), https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations, https://presidentielle2022.conseil-constitutionnel.fr/l-election/la-campagne-sur-internet.html, https://www.cnil.fr/fr/chatbots-les-conseils-de-la-cnil-pour-respecter-les-droits-des-personnes, https://www.cnil.fr/fr/cookies-solutions-pour-les-outils-de-mesure-daudience.
  - Skill design : 3 artboards de placement de la mention IA + 1 artboard pied de page/attribution + 1 artboard « mode silence » ; juges : « visible sans être un mur » et « ne ressemble pas à un disclaimer ».
  - Checklist « obligation → élément d'UI → copy → source » (tableau) validée par un juge « juriste » et un juge « designer ».
Livrable : Checklist de conformité par le design (tableau obligation/UI/copy/source), copies des mentions, spec du flag silence électoral, politique de confidentialité d'une page, décision licence code/data.
Décision : Chaque obligation est mappée à un élément d'UI maquetté et jugé « non-disclaimer » par ≥ 4/5 juges ; belo valide que la ligne d'indépendance n'entre pas dans son refus ; aucune donnée personnelle collectée (vérifié par revue de l'architecture T10).
Dépend de : T0, T3

### [P1/S] T13 — Mesure du succès sans tracker & plan de lancement organique
Q : Comment savoir que l'app produit l'effet voulu (envie d'aller lire, partage) sans collecter la moindre donnée personnelle, et comment amorcer le réseau militant avant le 1er octobre 2026 ?
Sous-questions :
  - Métrique nord : taux de passage ludique/chat → lecture d'une section ; métriques secondaires : partages déclenchés (compteur agrégé), cartes-concept ouvertes, refus affichés (pour améliorer le corpus), taux de mode dégradé.
  - Instrumentation : Cloudflare Web Analytics (sans cookie) + Workers Analytics Engine (événements agrégés sans identifiant) ; liste blanche des événements ; ce qu'on n'enregistre JAMAIS (la réponse d'une personne à une question politique, le texte d'une question avec identifiant).
  - Plan de lancement 100 % organique : 100 premiers militants (Discord LFI, groupes Action Populaire, comptes militants), kit de diffusion (3 cartes + 3 messages), « mesure du jour » comme rendez-vous, intégration à l'écosystème (liens vers melenchon2027.fr, laec.fr, désintox, Action Populaire).
  - Boucle d'amélioration : revue hebdo des refus (agrégés par thème) → nouvelles cartes-concept / FAQ.
Méthodes :
  - context7 : Workers Analytics Engine (free tier, écriture depuis Worker, requêtes SQL) ; Cloudflare Web Analytics.
  - Rédaction du plan de lancement (calendrier jusqu'au 1/10/2026 puis jusqu'à avril 2027, mode silence inclus) et du kit de diffusion (assets de T6).
Livrable : Spec de mesure (événements, tableau de bord minimal, ce qui est interdit) + playbook de lancement organique + calendrier.
Décision : La métrique nord est calculable sans aucun identifiant ; le playbook ne contient aucune promotion payante ; belo valide le calendrier.
Dépend de : T6, T10, T12

### [P0/M] T14 — Test utilisateur militant (3-5 personnes, sur téléphone) — porte de validation transversale
Q : La direction, la mécanique d'entrée, la carte-concept et le kit de partage produisent-ils réellement wow, aha et transfert chez de vrais militants (et, si possible, un proche non militant) ?
Sous-questions :
  - Test 5 secondes sur les 3 écrans d'accueil : « qu'est-ce que c'est ? », « lequel tu envoies à ton cousin ? », « lequel a l'air officiel ? ».
  - Tâche aha : « explique-moi la règle verte » après lecture de la carte-concept, chronométrée ; reformulation correcte ?
  - Tâche partage : « envoie cette mesure à quelqu'un » — observation du geste (share sheet vs capture), temps, message modifié ou non.
  - Tâche riposte : « on te dit que l'AEC veut sortir de l'euro — réponds en 30 s avec l'app » (mode riposte + refus/mesures voisines).
  - Rejouabilité : « Devine le % » — rejoue-t-il spontanément ? Préférence tu/vous ; verbatims sur le ton ; réactions à la tortue.
  - Si un proche non militant est disponible : recevoir un lien WhatsApp, l'ouvrir, dire ce qu'il a compris en 1 minute.
Méthodes :
  - Protocole écrit (script de 20 min par personne, grille d'observation, consentement oral, aucune donnée nominative conservée) ; prototypes déployés temporairement (wrangler dev + tunnel ou Artifact) ; belo anime, Claude prépare la grille et synthétise.
  - Si aucun militant disponible : substitution par panel de personas (documenté HYPOTHÈSE) + demande de 3 testeurs sur le Discord LFI pour une session ultérieure.
  - Synthèse : tableau tâche × participant × réussite/temps/verbatim ; décisions confirmées / à itérer (une itération maximum sur T1/T3).
Livrable : Rapport de test : verbatims, temps mesurés, matrice de décisions, liste des corrections avant prompt final.
Décision : Les critères de T1, T2, T3, T6 sont atteints ou la boucle d'itération (une seule) est déclenchée ; toute décision non testée sur militants est étiquetée HYPOTHÈSE dans le dossier et le prompt final.
Dépend de : T1, T2, T3, T5, T6, T9

## SÉQUENCE
0. Ouverture : arbitrages utilisateur et règles du jeu — Poser en un seul lot les questions de T0 (Groq/Grok, tortue, identité/indépendance, nom, licence, militants disponibles, compte Cloudflare, cible de lancement avant le 1er octobre 2026, tu/vous). Rappeler les règles : décision sur pièces, étiquetage FAIT/PROBABLE/HYPOTHÈSE, zéro promotion payante, ban list identité 2016-2022. Créer le squelette du dossier dans le scratchpad/dépôt.
   [solo (AskUserQuestion en un lot) puis rédaction de la section 0] sortie : Toutes les questions T0 ont une réponse ou un défaut assumé ; section 0 du dossier écrite ; belo a validé le plan de session et son time-boxing (≈ 2-3 jours de session, P0 d'abord).
1. Fondation : corpus, atomes et matière première (T8) — Lancer en parallèle trois éclaireurs : (a) spécification du pipeline canonique + extraction du chapitre 12 en JSON typé (fixture) + vérification des invariants ; (b) extraction des termes candidats du glossaire avec fréquences et sourçage préliminaire (livrets/plans 2022 via REST) ; (c) inventaire des 48 À savoir (texte, %, institut, date) et des formules citables de l'introduction. Test poli du serveur MCP (abandon si 401/403).
   [multi-modal sweep (3 agents parallèles) + synthèse solo] sortie : JSON du chapitre 12 conforme au verbatim vérifié ; invariants 18/89/837/48 reproduits ; liste de 40-60 termes avec statut de source ; inventaire des 48 À savoir ; modèle de données TypeScript rédigé.
2. Immersion visuelle et tokens (T3 partie 1, T11 partie 1) — Avec claude-in-chrome : captures de la charte, des 5 affiches T27, du LOGO-M27 et LogoTortue, de melenchon2027.fr (polices calculées), de aec2027.fr, laec.fr et avenir-en-commun.net ; benchmark de motion sur Stripe/Linear/Arc/Duolingo/Pudding/Wahl-O-Mat. Rédiger les tokens v0 (4 couleurs 2027 + teintes du LOGO-M27 + 6 accents avec règles d'usage AA), l'échelle typo (Public Sans variable, Gowun Batang), l'échantillon typographique rendu, et le moodboard.
   [solo (navigateur) + 1 agent de calcul de contrastes + moodboard via skill design] sortie : Tokens v0 avec justification par URL ; hiérarchie des palettes tranchée sur capture ; verdict Gowun Batang en corps FR ; règles d'illustration (5-8) déduites des affiches ; audit des 3 sites existants avec captures.
3. Sprint carte-concept : l'anatomie du aha (T2) — Cinq agents sourcent et rédigent en parallèle les 5 cartes-concept pilotes (règle verte, bifurcation écologique, 6e République/constituante, planification écologique, écocide) selon le schéma JSON ; un juge « Yanis 22 ans » lit et réexplique, un juge « fact-checker » vérifie chaque phrase contre le corpus ; 3 variantes d'anatomie maquettées (dense / progressive / explorable) sur la règle verte.
   [multi-modal sweep (5 rédacteurs) → judge panel (Yanis + fact-checker) → design canvas (3 anatomies)] sortie : 5 cartes 100 % sourcées, 0 phrase non étiquetée, Yanis réexplique 5/5 ; anatomie retenue provisoirement ; règle typographique verbatim/reformulé fixée.
4. Le grand canvas : 3 directions × 4 écrans + 4 mécaniques d'entrée (T3 partie 2, T1) — Produire avec le skill design un canvas unique : 3 directions (A éditorial, B ludique-tortue, C immersif 4 mondes) × 4 artboards identiques (accueil, carte-concept règle verte, section chapitre 12 s1, story 1080×1920) avec le vrai contenu ; puis les 4 mécaniques d'entrée (Tu valides ? / 3 idées pour toi / Devine le % / Concept en 20 s) × 5 artboards (écran 0, 10 s, aha, résultat, carte). Faire tourner le panel de juges (Camille, Yanis, Martine, auditeur charte, auditeur accessibilité, adversaire chasseur de captures) avec la grille pondérée, puis la critique adversariale « ça sent le faux / propagande / frivole / n'apporte rien vs le site officiel ».
   [design canvas → judge panel (6 juges parallèles) → adversarial verify → synthèse solo avec belo dans la boucle] sortie : Matrice de scores complète ; 1 direction (ou hybride explicite) retenue provisoirement ; 2 mécaniques d'entrée finalistes ; liste des corrections issues de la critique adversariale ; belo a vu le canvas et exprimé ses préférences (consignées, mais non décisives seules).
5. Micro-prototypes jouables sur téléphone (T1, T4, T6, T9) — Construire en Artifacts : (1) les 2 mécaniques d'entrée finalistes avec 12 vraies mesures et 5 À savoir ; (2) 3 micro-interactions signature (reveal de citation, swipe de carte, transition concept → section) aux tokens retenus ; (3) un générateur de carte de partage simulé (6 types × 2 ratios) et le flux Web Share API avec image ; (4) « Devine le % ». Audit web-perf avec throttling ×4 et 4G simulée.
   [3 agents de prototypage en parallèle + skill web-perf + skill design pour le kit de partage] sortie : Prototypes ouvrables sur un téléphone par lien ; aucune frame > 16 ms sur les 3 micro-interactions ; aperçus OG testés sur WhatsApp et Telegram ; kit de partage maquetté (6 cartes × 2 ratios).
6. Labo IA : contrat « jamais inventer », modèle, cache, dégradé (T7) — Construire le jeu d'évaluation (30 réalistes + 20 adversariales) ; exécuter en parallèle les variantes A (client lexical), C (chapitre en contexte), D (routeur d'IDs) sur 5 modèles Workers AI depuis le compte de belo ; mesurer neurons, latence, rappel ; test empirique du cache AI Gateway vs neurons ; panel de juges FR/fidélité/refus ; maquettes des 3 écrans réponse/refus/dégradé et jugement « laquelle a l'air d'une panne ? ». Appliquer l'arbitrage Groq/Grok au fallback.
   [multi-modal sweep (5 modèles) → judge panel (3 juges) → adversarial verify (chasseur de captures) → design canvas (3 écrans)] sortie : 0 mesure inventée sur les adversariales pour l'architecture retenue ; modèle et architecture décidés avec chiffres ; taux de hit cache estimé avec normalisation ; mode dégradé jugé non dégradé ; contrat de fiabilité rédigé (1 page).
7. Test militant sur téléphone (T14) et itération unique — Faire passer le protocole (5 s, aha règle verte, partage, riposte, Devine le %, tu/vous, tortue) à 3-5 militants avec les prototypes ; synthèse en matrice ; si un critère P0 échoue, une seule itération ciblée sur l'écran fautif (retour au canvas), puis re-test léger ou étiquetage HYPOTHÈSE.
   [user test (belo anime, Claude prépare la grille et synthétise) → boucle d'itération limitée à une passe] sortie : Rapport de test avec verbatims et temps ; décisions T1/T2/T3/T5/T6/T9 confirmées ou étiquetées HYPOTHÈSE ; corrections listées.
8. Consolidation : architecture, conformité, positionnement, mesure (T10, T12, T11, T13) — Rédiger les ADR Cloudflare (framework, static assets, D1/KV/DO, IA, OG build vs runtime, flags, analytics, défense du quota) avec limites sourcées via context7 et skills ; tableau de coût 0 € ; checklist de conformité par le design avec les 3 variantes de mention IA jugées ; nom retenu (sprint de nommage + choix de belo) et phrase de positionnement ; spec de mesure et playbook de lancement organique (zéro payant dès le 1er octobre 2026, mode silence L49).
   [4 agents parallèles (architecte, juriste-designer, nommage, croissance) + judge panel léger sur les mentions IA + AskUserQuestion pour le nom] sortie : ADR complets ; 0 € démontré à 100 000 visites/jour ; app fonctionnelle sans Worker API ; checklist légale mappée à des écrans ; nom choisi ; playbook validé par belo.
9. Assemblage du dossier et écriture du prompt plan-mode, puis revue adversariale — Assembler le dossier selon la structure définie (faits étiquetés, URLs, captures, maquettes, scores, décisions, hypothèses restantes, backlog d'idées) ; écrire le prompt final ; le soumettre à un panel de 3 relecteurs : un « implémenteur en plan-mode » qui liste tout ce qui lui manquerait pour produire le plan, un « adversaire politique » qui cherche ce qui pourrait être retourné contre LFI, un « auditeur charte/accessibilité ». Corriger, figer, livrer à belo.
   [solo (assemblage) → judge panel (3 relecteurs) → adversarial verify → livraison] sortie : Dossier complet sans P0 ouvert ; prompt final validé par les 3 relecteurs (aucun manque bloquant) ; liste explicite des HYPOTHÈSES à lever en implémentation ; belo a relu et approuvé.

## RISQUES
- La session tranche sur des goûts (le canvas est joli, on y va) et non sur des pièces : direction et mécaniques choisies sans score ni test, et donc contestables et fragiles. => Règle de séquence : aucune décision structurante sans (maquette avec vrai contenu + grille de score de juges + test militant ou étiquette HYPOTHÈSE). Les critères éliminatoires (charte, AA) sont calculés, pas ressentis. Les préférences de belo sont consignées mais pondérées comme une voix parmi d'autres jusqu'au test.
- Contamination par l'ancienne identité LFI 2016-2022 (Montserrat, bleu #0098B6/#0e8a9c, ocre, Φ) massivement mieux référencée sur le web — l'app « sent le faux ». => Ban list nominative dans les principes, dans les prompts des juges (un juge « auditeur charte » connaît l'ancienne identité et l'élimine) et dans le prompt final ; tokens figés par capture d'écran de la charte et lecture des SVG officiels (#4C0297/#D1271C/#FFFCF4/#212320).
- Le « sexy » dérive vers WebGL/3D/effets gratuits, incompatible avec le mobile milieu de gamme des militants, le budget 0 € et la lisibilité d'un texte politique. => Budget de performance figé AVANT les maquettes (LCP < 2 s 4G, JS < 100 Ko, 60 fps throttlé ×4), interdiction de Three.js/WebGL, motion spec avec sens narratif obligatoire pour chaque animation, audit web-perf des prototypes.
- La mécanique d'entrée « d'accord / pas d'accord » sur des mesures LFI se retourne contre la cause (captures « 70 % des gens rejettent la mesure X ») ou reproduit l'effet Elyze (score opaque = manipulation). => Tester des cadrages non binaires (« ça me parle / ça me surprend / je veux comprendre ») ; aucun score agrégé public ; méthode de tout calcul publiée ; résultat = carnet personnel de mesures, pas un pourcentage d'adhésion ; juge « adversaire chasseur de captures » à chaque étape.
- Gamification perçue comme frivole ou infantilisante (tortue trop enfantine, badges), qui gêne le militant de 45 ans et discrédite auprès de l'indécis. => Persona « militant sceptique 45 ans » avec critère « honte à partager » éliminatoire ; test sur militants réels ; chaque mécanique doit conduire à la lecture d'une section (métrique nord) sinon elle est coupée ; registre pixel-art déjà validé par les affiches officielles comme borne de ton.
- Le chat invente une mesure ou une définition (glossaire sans source officielle) : désinformation attribuable à LFI, capture virale, voire référé « manipulation de l'information » à 3 mois du scrutin. => Architecture « routeur d'IDs » : le LLM ne rédige jamais une mesure ; verbatim affiché depuis le JSON local ; validation post-génération par correspondance exacte ; glossaire pré-rédigé, sourcé, relu par belo, figé ; jeu adversarial de 50 questions versionné avec objectif 0 invention ; refus par défaut hors périmètre.
- Quota Workers AI (10 000 neurons/jour partagés) épuisé par le premier partage viral ou par un attaquant : l'app paraît en panne devant une audience neuve. => Statique d'abord : corpus, recherche, glossaire, cartes fonctionnent sans serveur ; mode dégradé extractif conçu et jugé « non dégradé » ; Turnstile + rate-limit 60 s + quota journalier en DO + cache D1/AI Gateway avec normalisation ; questions suggérées pré-générées.
- aec2027.fr (officiel, en page d'attente) sort pendant ou juste après la session et rend une app de lecture redondante. => Positionnement explicite sur comprendre/jouer/partager plutôt que lire ; liens vers l'officiel ; plan de veille (webmanifest, robots.txt, annonces) avec réaction prédéfinie ; le dataset JSON CC BY-NC-SA et le glossaire restent utiles quoi qu'il arrive.
- Aucun militant disponible pour les tests : décisions non validées sur de vraies personnes. => Demander l'accès dès T0 ; recruter 3 testeurs via le Discord LFI / groupe WhatsApp de belo ; à défaut, panel de personas documenté comme HYPOTHÈSE et test prévu comme première étape du plan d'implémentation.
- Gowun Batang ne tient pas en corps de texte français (2 graisses, jeu latin d'origine coréenne) et l'axe éditorial s'effondre. => Échantillon rendu à l'étape 2 avant tout canvas ; plan B : Public Sans en corps, Gowun Batang réservée aux citations verbatim (ce qui devient une force : le verbatim a sa propre typographie).
- Tension entre fidélité totale à la charte et absence d'affiliation : l'app est prise pour officielle, LFI se voit imputer les erreurs, la charte interdit d'« engager le mouvement ». => Arbitrage T0 avec 3 options (recommandation : wordmark propre + ligne « projet militant indépendant » en pied de page/À propos, distincte d'un disclaimer de contenu) ; ne jamais utiliser le logo M27 comme marque de l'app.
- Obligations légales oubliées ou traitées comme un disclaimer tardif : mention IA (art. 50, déjà en vigueur), attribution CC BY-NC-SA, promotion payante après le 1er octobre 2026, gel L49, données d'opinion (art. 9 RGPD). => Track T12 « conformité par le design » avec checklist obligation → écran → copy, maquettée et jugée ; zéro promotion payante dans le playbook ; feature flag silence électoral spécifié ; zéro compte/zéro log identifiant dans les ADR.
- Dérive de périmètre de la session (trop de tracks, trop d'idées) : pas de prompt final à la fin. => Time-boxing par étape, P0 avant P1, P2 relégué au backlog d'idées ; l'étape 9 est obligatoire et ses relecteurs vérifient l'exhaustivité du prompt, pas la perfection du dossier.
- Pipeline de contenu faux (doublons RSS, slugs résolus globalement) ou périmé (pas de Last-Modified/ETag) qui fait citer des mesures inexistantes ou obsolètes. => Algorithme canonique nav.tdm → 89 sections ; invariants 18/89/837/48 en test de non-régression ; cron hebdo + SHA-256 par section + échec bruyant ; « à jour au JJ/MM/AAAA » affiché.
- WebFetch détruit le CSS et les visuels : la session travaille à l'aveugle sur l'identité et la motion. => Toute vérification visuelle passe par claude-in-chrome (captures, getComputedStyle, document.fonts) ; les affiches et SVG sont lus comme images ; les benchmarks de motion sont observés dans le navigateur, pas décrits de mémoire.

## DOSSIER
- 0. Décisions et arbitrages utilisateur (réponses verbatim de belo : Groq, tortue, identité, nom, licence, lancement, tu/vous) et leur impact
- 1. Thèse produit, positionnement en une phrase, nom et wordmark, audit comparatif (aec2027.fr, laec.fr, avenir-en-commun.net) avec captures et plan de veille
- 2. Personas (Camille, Yanis, Martine + militant sceptique) et arc émotionnel (0 s → 10 s → 3 min → partage → retour), mécanique d'entrée retenue avec matrice de scores et variante « arrivée par lien »
- 3. Corpus et modèle de données : types TypeScript, schéma d'IDs, pipeline canonique et ses pièges, invariants, cron/hash, fixture JSON chapitre 12, inventaire des 48 À savoir, règle de comptage 831/837, licence et attribution
- 4. Glossaire vivant : schéma JSON, 5 cartes-concept complètes et sourcées, liste des 40-60 termes avec statut de source, anatomie de carte retenue (maquette), règle verbatim/reformulé
- 5. Direction artistique : tokens CSS, échelle typographique et verdict Gowun Batang, règles d'illustration, tortue vectorielle, moodboard, les 3 directions maquettées avec scores et critique adversariale, direction retenue et emprunts
- 6. Motion et micro-interactions : motion spec, 3 micro-prototypes, budget de performance et résultats web-perf
- 7. Ton de voix et microcopy : guide de voix, kit de 50 chaînes, écrans de refus/dégradé/mention IA, 3 messages de partage
- 8. Kit de partage et canal : 6 cartes × 2 ratios, schéma d'URL et état encodé, checklist d'aperçu par messagerie, pipeline de génération (build vs Worker), attribution
- 9. Gamification sans compte : mécaniques retenues/coupées, modèle de progression localStorage, « Devine le % », mesure du jour, défis par lien, accessibilité WCAG 2.2, liste des refus
- 10. Chat et IA : contrat de fiabilité, architecture retenue, modèle et chiffres (neurons, latence, scores FR), jeu d'évaluation et résultats, cache/normalisation, fallback, UI réponse/refus/dégradé
- 11. Architecture Cloudflare : ADR, squelette wrangler.jsonc, structure de dépôt, tableau de coût, défense du quota, feature flags, analytics sans donnée
- 12. Conformité par le design : checklist obligation → écran → copy → source (AI Act art. 50, CC BY-NC-SA, LCEN, L49/L52-1, RGPD), politique de confidentialité d'une page, mode silence électoral
- 13. Mesure du succès et plan de lancement organique : métrique nord, événements agrégés, playbook, calendrier jusqu'en avril 2027
- 14. Rapport de test militant : protocole, verbatims, temps, matrice de décisions, itération effectuée
- 15. Backlog d'idées audacieuses : testées (résultat), à tester (P1/P2), écartées (pourquoi)
- 16. Registre des hypothèses restantes (étiquetées HYPOTHÈSE) à lever en implémentation
- 17. Annexes : sources (toutes les URLs avec étiquette FAIT/PROBABLE), captures, prompts des juges et grilles de score, jeux de questions, échantillons typographiques
- 18. Le PROMPT final pour la session Claude Code en plan-mode (texte intégral, autoportant)

## PROMPT FINAL
- Contexte figé et daté : 7/9/2026, présidentielle avril 2027, cibles (militants = utilisateurs et canal ; jeunes 18-30 ; indécis), livrable = plan d'implémentation, stack (Cloudflare Workers + Static Assets, TypeScript strict, composants fonctionnels, ESLint/Prettier, code et commentaires en anglais, UI en français).
- Contraintes dures énumérées : coût d'exploitation 0 € (plan gratuit, aucune carte), IA gratuite sans Grok/xAI (+ décision belo sur Groq), fidélité absolue au texte (le LLM ne rédige jamais une mesure), charte 2027 stricte, mobile-first, zéro compte/zéro donnée/zéro bandeau, zéro promotion payante dès le 1er octobre 2026, mode silence électoral L49.
- Toutes les DÉCISIONS prises en session avec leur justification en une ligne et le lien vers la section du dossier : direction artistique + tokens + typographie, mécanique d'entrée, anatomie de la carte-concept, kit de partage et schéma d'URL, mécaniques de gamification retenues/coupées, contrat IA + architecture + modèle + fallback, ADR Cloudflare, nom et positionnement, ton de voix (tu/vous), options d'identité et licence.
- Le modèle de données complet (types TypeScript), le schéma d'IDs, l'algorithme d'ingestion canonique (18 pages chapitre → nav.tdm → 89 sections), les pièges documentés (doublons RSS, slug global, pas de Last-Modified), les invariants (18/89/837/48), le cron + hash, et la fixture JSON du chapitre 12 comme référence de test.
- Les faits chiffrés vérifiés sur le corpus : 831 mesures officielles (143 ajoutées, 120 précisées), 837 extraites, 201 Ko brut / 62 Ko gz / ~56 000 tokens, 48 À savoir datés 2020-2021, licence CC BY-NC-SA 4.0 (URL des mentions légales), absence de glossaire officiel.
- Le tableau des limites Cloudflare gratuites vérifiées (100 000 req/jour Worker, static assets illimités, 10 ms CPU, 10 000 neurons/jour, KV 1 000 écritures/jour, D1 100 000 écritures/jour, DO SQLite gratuit, Vectorize 5 M dims, AI Gateway cache TTL 1 mois match exact, Turnstile illimité avec branding, rate-limit 10/60 s per-colo) avec URLs.
- La ban list explicite : Montserrat, bleu #0098B6/#0e8a9c, ocre, symbole Φ, Grok/xAI, Gemini free tier (données d'entraînement), KV comme cache d'écriture, WebGL/Three.js, bandeau cookies, comptes utilisateurs, leaderboards/streaks serveur, notifications push, lecteur linéaire dupliquant le site officiel, logo M27 comme marque de l'app.
- Le design system v0 : tokens CSS (4 couleurs 2027 + teintes #E5CBFF/#FDEDFF/#FFD2CF + 6 accents avec règles AA par fond), échelle typographique, réglages Public Sans, usage de Gowun Batang, règles d'illustration, tortue vectorielle, motion spec (durées, easings, reduced-motion), et liens vers les maquettes/prototypes.
- La spécification des écrans (liste exhaustive avec contenu réel) : écran 0, mécanique d'entrée, carte-concept, section, chapitre/progression, réponse/refus/dégradé du chat, kit de partage, Devine le %, mesure du jour, À propos/mentions/confidentialité, mode silence.
- Le kit microcopy (50 chaînes) et le guide de voix, y compris la mention IA conforme à l'art. 50, l'attribution CC BY-NC-SA, la ligne d'indépendance, les 3 messages de partage.
- Les portes de qualité exigées du plan : jeu adversarial de 50 questions avec 0 invention, tests d'invariants du corpus, vérification de contraste automatisée, seuils Lighthouse/web-perf (LCP < 2 s 4G, CLS < 0,1, INP < 200 ms, JS < 100 Ko), WCAG 2.2 AA (cibles 24 px, alternative clavier au swipe), test d'aperçu OG sur WhatsApp/Telegram, protocole de test militant à rejouer avant lancement.
- Les attentes sur la forme du plan d'implémentation : phasage (v1 « statique + glossaire + partage » avant le 1er octobre 2026 si belo l'a choisi ; v2 chat ; v3 gamification avancée), structure de dépôt (src/, data/ CC BY-NC-SA, eval/, design/), ADR à maintenir, stratégie de tests, plan de déploiement wrangler, feature flags, runbook du cron et du mode dégradé.
- La métrique nord (passage ludique → lecture d'une section) et la spec de mesure sans identifiant (Cloudflare Web Analytics + Analytics Engine), ainsi que le playbook de lancement organique.
- Le registre des HYPOTHÈSES restantes avec, pour chacune, comment la lever en implémentation (ex. « Gowun Batang en corps : à valider sur device réel », « taux de hit cache : à mesurer en prod »).
- Instructions de posture pour la session plan-mode : lire le dossier avant de planifier, ne pas rouvrir les décisions étiquetées DÉCISION sans raison technique documentée, poser une question à belo plutôt que supposer sur les points listés, citer les URLs des docs Cloudflare via context7, produire un plan actionnable étape par étape avec critères de done, et respecter le principe « le Worker orchestre, il ne calcule pas ».

## IDÉES AUDACIEUSES
- « Devine le % » : quiz slider sur les 48 encadrés À savoir (« 83 % des Français d'accord pour… ») avec reveal du vrai chiffre, institut et date affichés (honnêteté sur les sondages 2020-2021), carte de partage « J'ai dit 60 %, c'est 83 % » — le format viral le plus prouvé, 100 % verbatim, 0 IA.
- « Un concept en 20 secondes » : explorables manipulables façon Nicky Case pour 3-5 concepts structurants seulement — la règle verte comme curseur prélèvement/régénération qui bloque au seuil, la 6e République en avant/après, la planification comme frise — chacun terminé par la citation verbatim et le lien vers la section.
- « 3 idées pour toi » : choisir une situation de vie (étudiant, locataire, aidant, précaire, retraité, parent solo, ouvrier…) → 3 mesures verbatim qui changent SA vie, calculées par une table statique éditoriale (pas d'IA, méthode publiée), avec carte de partage personnalisée.
- « Mode riposte » pour militants : taper une objection (« ça coûte trop cher », « ils veulent sortir de l'euro ») → en 10 s, 3 cartes verbatim + lien source + lien désintox, copiables en un tap ; fonctionne hors ligne (corpus embarqué) ; l'app devient l'arme de poche en soirée de famille.
- « La tortue avance » : les 18 chapitres comme une route, la tortue progresse en localStorage, s'endort si on ne revient pas, célèbre à la fin de chaque partie ; défi par lien « 14/18 chapitres, et toi ? » sans serveur ; easter egg lait-fraise au 5e tap (si belo valide).
- « Ton AEC en 10 mesures » : carnet personnel construit par « ça me parle » (pas « d'accord/pas d'accord »), exporté en story 1080×1920 mode Charbon + URL encodant la sélection (façon Wordle) — zéro donnée, partage identitaire fort.
- « Le refus qui aide » : hors périmètre, l'app dit « L'AEC ne traite pas de ça » puis propose les 3 mesures les plus proches et la question voisine la plus posée — le refus devient un moment de découverte, et une preuve de fiabilité.
- « Mesure du jour / Concept du jour » : déterministe par date, identique pour tous, partageable, crée un rendez-vous sans notification ni compte ; gelé automatiquement en mode silence électoral.
- « Envoyer à un proche » : share sheet natif (Web Share API avec image) avec 3 messages pré-rédigés selon le destinataire (cousin, collègue, parent) — le militant choisit le ton, l'app fournit la carte, l'URL courte et l'attribution.
- « Lis-le en 3 minutes » : par chapitre, un scrollytelling composé uniquement de verbatim (chapeaux + mesures-clés + À savoir) avec barre de progression et compteur de mesures vues — aucun résumé rédigé, donc aucun risque d'invention, et un aha macro→micro façon Pudding.
- « Écouter la section » : lecture audio via SpeechSynthesis (voix françaises natives du téléphone, coût 0 €) pour le militant en trajet ; pas de TTS serveur, pas de podcast IA (fidélité et coût).
- « Questions qui apprennent » : chips de questions pré-générées par concept et par section (statiques), qui rendent le chat intelligent avant tout appel LLM et font monter le taux de hit du cache ; les refus agrégés alimentent chaque semaine de nouvelles chips.
- « Le verbatim a sa propre typographie » : tout texte du programme est composé en Gowun Batang sur fond Crème avec un filet Violet ; toute reformulation de l'app est en Public Sans — l'œil distingue instantanément la parole du programme de celle de l'app, ce qui est à la fois un parti pris esthétique et une garantie de fidélité.
- « Compteur 831 » en écran 0 : les mesures défilent en compteur jusqu'à 831 (« dont 143 nouvelles »), puis la question « laquelle change ta vie ? » — le wow des 3 premières secondes, sans image lourde.
- « Co-construit par 24 000 contributions » : badge par chapitre avec le nombre de contributions citoyennes (agrégats extraits de la synthèse), pour dire à l'indécis que le programme est vivant — un argument absent de tout autre produit.
- « Story mode Charbon » : le seul endroit où la palette vive de la charte s'exprime pleinement (toutes AA sur #212320), pour des cartes 1080×1920 qui tranchent visuellement dans une story sans trahir la charte.
- « Duel Devine le % » à deux par lien (état dans l'URL), avec option room live en Durable Object SQLite si les tests montrent l'appétit — P2, à ne construire que sur preuve.


######## PLAN — FUNNEL MILITANT → INDÉCIS, GAMIFICATION UTILE & VIRALITÉ (growth/product lead ayant vu fonctionner Elyze, Wordle, NYT Dialect Quiz, Duolingo, BeReal, et connaissant le terrain LFI : boucles WhatsApp/Telegram des groupes d'action, porte-à-porte, marchés, Discord, TikTok organique)
THÈSE : Ce qui rendra l'app irrésistible n'est pas « le programme » mais un OBJET DE PARTAGE à résultat personnel et effet de surprise, adossé au texte réel (837 propositions, 48 encadrés chiffrés) : le militant s'entraîne et s'arme (riposte en 10 secondes, maîtrise), puis envoie un lien qui, ouvert sur WhatsApp en 4G par un indécis sans aucun contexte, produit un « ah bon, c'est dans le programme ?! » en moins de 30 secondes et lui donne un geste immédiat (lire une section, se tester, renvoyer à quelqu'un, vérifier son inscription électorale). Avec un seul programme, le « match » façon Elyze est mort-né et expose à l'accusation de manipulation ; le ressort viral doit être la SURPRISE et la PERSONNALISATION (« ça change quoi pour moi »), jamais l'accord ni le « pas d'accord ». Le chat est la couche de profondeur, pas la porte d'entrée : il ne doit jamais rédiger une mesure, seulement la retrouver. La session de découverte doit donc établir SUR PIÈCES : (1) quel artefact rend réellement bien sur WhatsApp/Telegram/Stories et fait cliquer ; (2) quelles 4 à 6 mécaniques passent la grille « utile vs gadget » et le test des 30 secondes auprès de vrais militants et de non-politisés ; (3) quelle direction visuelle un indécis n'identifie pas comme de la propagande tout en restant strictement dans la charte 2027 ; (4) quelle stack IA garantit zéro mesure inventée à 0 € avec un mode dégradé désirable — le tout calé sur un calendrier vérifié (L52-1 dès le 1er octobre 2026, scrutins les 18 avril et 2 mai 2027) et sur la menace de aec2027.fr.
PRINCIPES :
- FUNNEL D'ABORD : chaque écran, chaque mécanique doit répondre à trois questions — qui l'envoie, à qui, et que fait le receveur dans les 30 premières secondes sans contexte ? Si la réponse est floue, on supprime.
- SURPRISE > ACCORD : avec un seul programme, ne jamais construire de « match » ni de geste principal « pas d'accord avec LFI ». Les ressorts autorisés sont « tu savais que c'était dedans ? », « devine le chiffre », « ça te concerne ? », « voilà TES 10 mesures ». Publier la méthode de tout calcul (leçon Elyze).
- LE TEXTE EST LA STAR : le verbatim du programme est toujours à ≤ 1 tap, les reformulations (« en une phrase », « comme si j'avais 12 ans ») sont visuellement isolées, sourcées, relues et publiées sous CC BY-NC-SA. Le LLM sélectionne, il ne rédige pas une mesure.
- ZÉRO COMPTE, ZÉRO BASE, ZÉRO TRACKER : état dans l'URL et le localStorage (façon Wordle), compteurs agrégés anonymes uniquement, aucune donnée reliant une personne à une opinion (RGPD art. 9, fuite Action Populaire mai 2026). C'est aussi une promesse marketing affichée.
- STATIQUE D'ABORD, IA EN SURCOUCHE : tout ce qui peut être pré-généré au build (cartes de partage, glossaire, niveaux de lecture, index de recherche) est servi en static assets gratuits et illimités ; le mode dégradé « réponse extraite du programme » est un mode normal et désirable, pas une panne.
- GAMIFICATION UTILE = sert la métrique nord (passage à la lecture d'une section ou partage à un non-militant), fonctionne sans serveur, ne réduit pas une mesure à un slogan, résiste au retournement par un opposant, coûte 0 € en exploitation. Tout le reste (XP, ligues, streaks serveur, badges creux, push) est un gadget.
- LE MILITANT EST LE HÉROS DE LA BOUCLE : chaque fonctionnalité doit lui faire gagner du temps sur le terrain (marché, porte-à-porte, boucle WhatsApp, soirée débat) ou lui donner un objet à envoyer. Il n'a pas besoin d'être convaincu, il a besoin de munitions et de fierté.
- DÉCIDER SUR PIÈCES : pas de choix de direction design, de mécanique ou de stack IA sans maquette avec contenu réel, prototype jetable testé sur téléphone réel dans un vrai groupe WhatsApp, benchmark chiffré, panel de juges avec personas et red team.
- LE CALENDRIER ÉLECTORAL EST UNE CONTRAINTE DE DESIGN : 1er octobre 2026 (fin de toute promotion payante, L52-1), 17-18 avril et 1-2 mai 2027 (gel L49 à concevoir comme un moment), surveillance de aec2027.fr à chaque étape, date limite d'inscription sur les listes début mars 2027 (à vérifier) comme CTA majeur pour les 18-30.
- MOBILE 4G BAS DE GAMME OU RIEN : LCP < 2 s, 60 fps, JS initial < 100 Ko gzip, og:image < 300 Ko, aperçu de lien parfait — c'est la condition physique de la diffusion militant → indécis, pas une optimisation.

## PISTES
### [P0/M] T1 — Corpus canonique, identifiants stables et données d'appoint (désintox, glossaire brut)
Q : Comment produire dès le début de session le dataset JSON versionné (18 chapitres / 89 sections / 837 propositions / 48 « À savoir » / 109 chapeaux) avec des IDs stables et des tags de situation de vie, qui alimentera toutes les maquettes, prototypes et benchmarks de la session ?
Sous-questions :
  - Quel schéma d'ID déterministe et versionné (ex. ch12-s1-m03 + hash court du texte) permet permaliens, citations par le chat et détection de modification amont ?
  - Quelle règle de comptage explicite affiche-t-on (831 officiel vs 837 extraits avec sous-mesures) et comment la documenter dans l'app ?
  - Quels tags « situation de vie » (étudiant, salarié, indépendant, retraité, sans emploi, locataire, propriétaire, parent, rural/urbain, jeune 18-25) et « thème terrain » (salaire, logement, santé, retraite, écologie, sécurité, immigration, institutions, international) attribuer à chaque proposition pour la mécanique « ça change quoi pour moi » — au build, par Claude, puis relus ?
  - Les 26 « idées reçues » de desintox.lafranceinsoumise.fr (API REST ouverte, vérifiée) sont-elles mappables une à une vers des mesures du livre pour le mode Riposte ?
  - Comment extraire les termes de jargon par fréquence et les passages sources dans les livrets/plans 2022 (wp/v2/pages) pour préparer T7 ?
  - Le hash SHA-256 par section et les invariants (18/89/837) sont-ils suffisants comme test de non-régression du cron hebdomadaire ?
Méthodes :
  - Écrire dans le projet un script TypeScript d'extraction suivant l'algorithme canonique validé : GET 18 pages chapitre → parser nav.tdm → GET 89 sections → sélecteurs p.wp-block-paragraph / div.mesure-cle / div.mesure / div.sous-mesure / section.chiffres div.chiffre (fixtures : https://melenchon2027.fr/programme2025/livre/chapitre12/s1/ et https://melenchon2027.fr/programme2025/livre/chapitre1/s6/), User-Agent identifiable, concurrence ≤ 4.
  - Workflow « adversarial verify » : un second agent recompte indépendamment via le flux RSS dédupliqué (https://melenchon2027.fr/feed/?post_type=lfi_programme_2025&paged=N) et compare texte à texte ; tout écart est expliqué avant de figer.
  - WebFetch https://desintox.lafranceinsoumise.fr/wp-json/wp/v2/posts?categories=<id idees-recues>&per_page=50&_fields=id,slug,link,title,content pour extraire les 26 objections et leurs réponses.
  - WebFetch https://melenchon2027.fr/wp-json/wp/v2/pages?per_page=100&_fields=id,slug,link,title pour lister les 41 livrets et 13 plans 2022, puis les 5 pages les plus utiles au glossaire (règle verte, 6e République, planification écologique, constituante, protectionnisme).
  - Tagging assisté : un agent propose les tags par proposition à partir du JSON, un juge vérifie 10 % au hasard, l'utilisateur tranche les cas ambigus.
  - Archiver une capture horodatée de https://melenchon2027.fr/mentions-legales/ (preuve de la licence CC BY-NC-SA 4.0 au moment de la réutilisation).
Livrable : data/aec-2025.json (+ schéma TypeScript strict), data/desintox.json (26 objections), data/terms-candidates.json (fréquences + passages sources), rapport d'invariants et de dédoublonnage, capture des mentions légales.
Décision : 18/89/837 exacts, 0 doublon, 100 % des propositions avec URL source et ID stable, JSON gzippé < 80 Ko, tags présents sur ≥ 95 % des propositions, désaccord inter-comptage = 0 ou expliqué.
Dépend de : 

### [P0/M] T2 — Funnel militant → indécis, personas terrain et métrique nord
Q : Quel est, seconde par seconde, le parcours du militant qui partage jusqu'à l'indécis qui accroche, et quelle métrique unique et anonyme dit si l'app remplit sa mission ?
Sous-questions :
  - Où vit concrètement le militant LFI en 2026 (boucles WhatsApp/Telegram de groupe d'action, Discord discord.gg/lfi, Action Populaire, comptes TikTok/Insta militants) et quels sont ses 5 moments de partage (après un meeting, pendant un débat TV, après une attaque médiatique, au marché, en famille) ?
  - Quels sont les « jobs to be done » de l'indécis 18-30 et de l'abstentionniste (« c'est quoi concrètement pour moi ? », « c'est finançable ? », « c'est des extrémistes ? », « ça change quoi que je vote ? ») et ses 10 objections les plus fréquentes ?
  - Quel est le « test des 30 secondes » formalisé : sur un lien reçu sans contexte, en 4G, que doit comprendre, ressentir et faire l'indécis avant de refermer ?
  - Quelle action finale vise-t-on pour l'indécis : lire une section, se tester, renvoyer à quelqu'un, vérifier son inscription sur les listes électorales (date limite début mars 2027, à vérifier sur service-public.fr) — sachant que la littérature VAA montre que l'effet robuste est « aller lire », pas « changer de vote » ?
  - Quel K-factor cible (partages générés par visite militante) et quel taux de rebond partage → lecture rendent le projet un succès ?
  - Faut-il un « mode militant » (toggle local, sans compte) qui débloque riposte, kit de partage et statistiques de maîtrise ?
  - Distribution : confirmer via la source primaire (probablement Global Witness) que les fils TikTok/IG/X des 18-24 français sont structurellement défavorables, et donc prioriser le dark social (WhatsApp/Telegram) — quelles conséquences produit (aperçu de lien, URL courte, page autoportante) ?
Méthodes :
  - Workflow « multi-modal sweep » : 3 agents en parallèle avec des lunettes différentes — (a) terrain militant : https://infos.actionpopulaire.fr/fiches/ (porte-à-porte, tractage, débat de rue, arpentage, visuels), materiel.actionpopulaire.fr, Discord LFI ; (b) jeunes 18-30 et information politique : études Arcom/CSA/Reuters Institute 2025-2026 et Cevipof sur l'abstention des jeunes (WebFetch sur URLs FR connues, WebSearch en repli) ; (c) indécis/abstentionnistes : enquêtes Ipsos-Cevipof 2022 et 2026 sur les motifs d'abstention.
  - Judge panel de 3 personas (militant pressé de 45 ans animateur de GA, jeune de 22 ans en alternance qui n'a jamais voté, abstentionniste méfiant de 34 ans) qui rejouent le funnel sur les prototypes de T3/T4 et notent temps-avant-« ah ok », clarté, envie d'envoyer, sentiment de propagande.
  - Entretiens flash de l'utilisateur avec 3 à 5 militants de son entourage (15 min chacun) : « montre-moi le dernier contenu politique que tu as envoyé sur WhatsApp et à qui », « quelle objection tu entends le plus au marché ? », « qu'est-ce qui te manque pour répondre vite ? ». Aucune donnée enregistrée, notes anonymisées.
  - Cartographie du funnel en diagramme (Artifacts) : Militant → Objet partagé → Indécis (30 s) → Accroche → Approfondissement → Action → Re-partage, avec pour chaque étape l'écran, l'artefact et le compteur anonyme associé.
Livrable : Carte du funnel (diagramme), 3 fiches persona avec top-10 objections et moments de partage, « test des 30 secondes » formalisé, métrique nord + 5 métriques secondaires agrégées anonymes, décision sur le mode militant.
Décision : Une seule métrique nord adoptée (recommandation : part des sessions arrivées via un lien partagé qui atteignent le verbatim d'une section) ; chaque mécanique candidate de T4 est mappée à une étape du funnel ou éliminée ; personas validés par l'utilisateur.
Dépend de : 

### [P0/M] T3 — Objets de partage et canaux : le moteur viral, prouvé sur téléphone réel
Q : Quel artefact (lien avec aperçu OG, image story, texte formaté, grille d'emojis façon Wordle) rend réellement bien sur WhatsApp, Telegram, Instagram Stories et TikTok, et lequel fait ouvrir le lien par quelqu'un qui n'a rien demandé ?
Sous-questions :
  - Les contraintes d'aperçu WhatsApp (og:image < 300 Ko, 1200x630, zone sûre centrale 80 %, fallback carré, une seule balise og:image, balises dans les 300 premiers Ko du HTML — sources tierces convergentes, à confirmer sur appareil) sont-elles tenues par des cartes générées avec satori + resvg-wasm dans la charte 2027 (Public Sans, Crème #FFFCF4, Violet #4C0297) ?
  - Faut-il pré-générer au build les ~900 cartes (837 propositions + 48 chiffres + 18 chapitres) en static assets gratuits, ou les générer à la volée en Worker avec cache immutable ? (Browser Rendering gratuit = 10 min/jour, donc exclu.)
  - Web Share API : le partage d'un PNG + texte via navigator.share ouvre la feuille système (vérifié : impossible de cibler WhatsApp ou Stories directement) — sur Android Chrome et iOS Safari, le texte accompagne-t-il bien le fichier vers WhatsApp, et l'image arrive-t-elle correctement dans Instagram Stories ?
  - Quel texte de partage préformaté (guillemets français, mesure verbatim, chapitre, lien court, aucun hashtag) maximise l'ouverture dans une boucle WhatsApp ?
  - La grille d'emojis sans spoiler (Wordle : fonctionnalité qui a déclenché la viralité en décembre 2021) est-elle transposable au « Devine-Chiffre » (48 statistiques sourcées) et à un « défi 5 mesures » sans révéler les réponses ?
  - Quel domaine/URL courte et mémorisable (à dicter au marché, à imprimer en QR sur un tract) et quelle structure d'URL (/m/ch12-s1-m03, /chiffre/2026-09-07, /defi/<état encodé>) ?
  - Un pack de stickers Telegram et des visuels 800x800 « universels » (format prescrit par le guide militant) sont-ils des multiplicateurs de distribution à coût nul ?
Méthodes :
  - Spike prototype jetable (workflow « build-to-learn ») : un Worker minimal + static assets + 5 cartes satori (mesure, chiffre « À savoir », résultat de quiz, riposte, progression tortue) en 1200x630, 1080x1080, 1080x1920 ; mesurer poids et latence à froid/à chaud (référence : https://tom-sherman.com/blog/dynamic-og-image-cloudflare-workers ; WebP interdit avec satori).
  - Test réel obligatoire : l'utilisateur envoie les liens du spike dans un groupe WhatsApp et un groupe Telegram depuis Android et iPhone, et pousse une image en Story Instagram via navigator.share ; captures d'écran de chaque aperçu ; consigner ce qui casse (recadrage, taille, texte absent).
  - Skill design : 3 variantes de carte par direction artistique (T6) sur le même contenu verbatim (mesure « règle verte » du chapitre 12 s1 + son chiffre 83 % Harris Interactive juillet 2021 avec la date visible).
  - Judge panel « lequel tu ouvres ? » avec les 3 personas de T2, puis test auprès des militants de T13 : « tu l'enverrais tel quel dans ta boucle ? ».
  - context7 (docs Cloudflare Static Assets, Workers limits) pour valider le stockage de ~900 PNG en static assets (20 000 fichiers / 25 MiB par fichier) et le routage run_worker_first pour /api/*.
Livrable : Spécification des 5 objets de partage (dimensions, gabarits, texte, URL, cache), captures réelles des aperçus sur 2 OS × 3 canaux, décision build-time vs runtime, gabarits satori validés, texte de partage par défaut, plan sticker pack Telegram.
Décision : Aperçu correct sur 100 % des tests WhatsApp/Telegram (2 OS), image < 300 Ko, texte compréhensible sans contexte par les 3 personas, ≥ 3 militants sur 5 « l'enverraient tel quel », génération ≤ 1 s à froid ou pré-générée.
Dépend de : T1, T6

### [P0/L] T4 — Mécaniques de gamification : inventaire, triage utile vs gadget, prototypes cliquables
Q : Parmi une vingtaine de mécaniques candidates, lesquelles (4 à 6) font que le militant maîtrise ET envoie, et que l'indécis accroche en 30 secondes, sans compte, sans serveur et sans réduire une mesure à un slogan ?
Sous-questions :
  - Comment reformuler le « reveal » sans match ni suspense de candidat : « tu savais que c'était dedans ? », « devine le pourcentage », « voici TES 10 mesures », carte des 4 parties colorée selon ce qui te parle (façon Kieskompas transposée) ?
  - Le swipe « d'accord / pas d'accord » sur une mesure LFI est-il contre-productif (donne un geste de rejet) ou nécessaire (crédibilité, sensation de contrôle façon Wahl-O-Mat avec skip et pondération ×2) ? Alternative : « ça me concerne / pas moi / je savais pas ».
  - Quelles mécaniques fonctionnent sans compte : état encodé dans l'URL (défi par lien façon Wordle), progression en localStorage (tortue qui avance sur 18 chapitres), rendez-vous éditorial déterministe par date (mesure/chiffre du jour), badges purement locaux ?
  - Quel est le bon nombre d'items par session (Wahl-O-Mat : ~38 thèses ; Elyze : illimité ; NYT : 25) pour un indécis en 4G ?
  - Accessibilité WCAG 2.2 : alternatives clavier/tap au swipe, cibles ≥ 24 px.
  - Quelles mécaniques sont infantilisantes pour un militant ou frivoles pour un indécis (précédent : cahier de vacances LFI 2025/2026, test « quelle figure historique » — validé culturellement en interne) ?
  - Comment un opposant (militant RN, fact-checker, journaliste) retournerait chaque mécanique en capture d'écran ?
Méthodes :
  - Brainstorm multi-agents (5 lentilles : growth, animateur de GA, jeune de 22 ans, enseignant de sciences politiques, designer d'interaction) produisant ≥ 20 fiches mécaniques normalisées : boucle, écran, artefact de partage, étape du funnel, données nécessaires, risque de retournement, coût.
  - Grille de triage « utile vs gadget » notée 0-2 sur 5 critères (sert la métrique nord ; sans compte/serveur ; verbatim à ≤ 1 tap ; résiste au retournement ; ≤ 2 jours de dev et 0 € d'exploitation) — seuil ≥ 7/10, aucun 0 sur les trois premiers.
  - Workflow « adversarial verify » : 3 red-teamers (militant RN, fact-checker AFP, juriste CNIL) attaquent le top 8 ; toute mécanique produisant une capture d'écran ridicule ou manipulatrice est corrigée ou éliminée.
  - Prototypes cliquables HTML (Artifacts) du top 6 avec contenu réel de T1, testables sur téléphone : Devine-Chiffre, Tu savais ?, Mon AEC en 10 mesures, Ça change quoi pour moi, Riposte, Tortue qui avance.
  - Test utilisateurs T13 : temps jusqu'au premier « ah ok », « j'ai appris un truc ? », « tu l'enverrais à qui ? », sentiment de manipulation 1-5.
Livrable : Matrice des 20 mécaniques scorées, 6 fiches détaillées, 6 prototypes cliquables, verdict argumenté sur le swipe, liste explicite des gadgets écartés et pourquoi.
Décision : Mécanique retenue si score ≥ 7/10, survit au red team, testée positivement (≥ 3/5 militants « je l'enverrais », ≥ 1 non-politisé « j'ai appris un truc »), et n'exige aucune donnée personnelle ; le MVP en garde 3 maximum.
Dépend de : T2

### [P1/M] T5 — Mode militant « Riposte » et terrain (porte-à-porte, marché, boucle, soirée débat)
Q : Quel outil fait gagner 10 secondes au militant face à une objection ou une question de terrain, et remplace le tract papier par un lien ou un QR code sans dupliquer Action Populaire ?
Sous-questions :
  - Quelles sont les 30 objections canoniques (26 idées reçues désintox vérifiées + top objections terrain : financement, extrémisme, immigration, nucléaire, euro, insécurité, « Mélenchon est trop vieux/clivant ») et pour chacune la mesure verbatim + le chiffre sourcé + la réponse désintox ?
  - Quel format de flashcard « on te dit X → tu réponds Y » (verbatim + source + carte à envoyer) et quel entraînement chronométré (10 s) pour la maîtrise ?
  - Le mode terrain doit-il être une PWA hors-ligne (marché sans réseau) avec gros boutons par thème → 3 mesures + 1 chiffre ?
  - Comment « laisser un lien » plutôt qu'un tract : QR code par thème imprimable, URL dictable, page autoportante ; sans jamais collecter de contact (c'est le rôle du formulaire Action Populaire, vérifié dans la fiche officielle).
  - Un mode « soirée débat TV » (« il a dit X — c'est vraiment dans le programme ? » → recherche verbatim → carte « ce qu'il y a vraiment dans le programme ») est-il utile ou gadget ?
  - Cohabitation avec l'outil interne « TokTok » (mentionné pour animateurs certifiés — nature à vérifier) et avec laec.fr (2022) : où l'app s'arrête-t-elle ?
Méthodes :
  - WebFetch des fiches officielles : https://infos.actionpopulaire.fr/fiches/organiser-un-porte-a-porte/, /distribuer-des-tracts/, /organiser-un-debat-de-rue/, /organiser-un-arpentage/, et https://infos.actionpopulaire.fr/fiches/realiser-des-visuels-pour-les-reseaux-sociaux/ pour les formats.
  - Extraction désintox via API REST (T1) et mapping objection → mesures par un agent, relu par l'utilisateur (militant).
  - Entretiens flash (T2) : 5 objections les plus entendues par chaque militant interrogé.
  - Skill design : 2 écrans (flashcard Riposte, mode marché hors-ligne) dans la direction retenue en T6 ; prototype cliquable avec chrono.
  - Test T13 : tâche « trouve la réponse à ces 10 objections », mesure du temps et du taux de réussite.
Livrable : data/riposte.json (30 objections → mesures verbatim + chiffres + sources), spec du mode Riposte et du mode terrain hors-ligne, gabarit QR/tract, décision sur le mode soirée débat.
Décision : En test, le militant trouve une réponse sourcée en < 10 s sur ≥ 8 objections sur 10 ; 100 % des ripostes citent un verbatim du livre ou de désintox avec URL ; zéro collecte de contact.
Dépend de : T1, T2

### [P0/L] T6 — Direction artistique : 3 axes tranchés sur maquettes à contenu réel
Q : Laquelle des trois directions (éditorial-typographique, ludique-cartes-tortue, immersif-motion par partie) un indécis ne perçoit-il pas comme de la propagande, tout en respectant strictement la charte 2027 et en donnant envie d'envoyer ?
Sous-questions :
  - Hiérarchie des deux palettes de la charte (4 couleurs 2027 = marque ; 6 vives = accents ?) à trancher visuellement ; interdiction explicite de Montserrat, #0098B6 et du Φ (ancienne identité).
  - Public Sans (titres) + Gowun Batang (corps, 2 graisses seulement) tiennent-ils en français accentué sur lecture longue ? Sinon Public Sans partout et Gowun Batang pour citations/« À savoir ».
  - Règles d'illustration déduites des 5 affiches T27 et du LOGO-M27.svg (isométrie, teintes #E5CBFF/#FDEDFF/#FFD2CF), tortue vectorielle légère (LogoTortue.svg embarque un PNG 1920²), pixel art autorisé ?
  - La tortue peut-elle être nommée/animée/faire parler le chat (« Question à la tortue ») sans engager le mouvement ? Décision politique de l'utilisateur.
  - Comment intégrer au design, sans disclaimer politique, la mention IA obligatoire (AI Act art. 50, en vigueur depuis le 2 août 2026), la mention d'indépendance et le branding Turnstile (mode invisible/managed) ?
  - Wordmark propre à l'app (nom à choisir) vs logo M27 : quelle option évite l'usurpation tout en restant dans la charte ?
  - Budget de performance imposé aux 3 axes : LCP < 2 s en 4G, JS < 100 Ko gzip, polices woff2 sous-ensemblées auto-hébergées, prefers-reduced-motion.
Méthodes :
  - Skill claude-in-chrome : screenshot de https://lafranceinsoumise.fr/charte-graphique/ (hiérarchie des palettes), lecture des polices réellement servies par melenchon2027.fr (document.fonts, getComputedStyle), analyse visuelle des affiches https://melenchon2027.fr/wp-content/uploads/2026/05/AFFICHES-T27_6erep-scaled.jpg et AFFICHES-T27_Eco-1.jpg, inventaire du zip https://lafranceinsoumise.fr/wp-content/uploads/2026/05/Logos-LFI.zip.
  - Skill design : UN canvas, 3 axes × 3 écrans identiques (accueil avec l'objet d'entrée retenu en T4, section chapitre 12 s1 en verbatim, carte de partage 1080x1080) + pour l'axe retenu 4 écrans supplémentaires (Devine-Chiffre, résultat « Mon AEC », Riposte, écran de refus du chat).
  - Scoring pondéré : fidélité charte ×3 (éliminatoire), envie d'envoyer sur WhatsApp ×3, lisibilité mobile 360 px ×2, contraste AA calculé ×2 (éliminatoire), coût d'implémentation ×1, risque de perception frivole ×2 ; judge panel de 3 personas puis test 5 secondes auprès des militants (« lequel tu envoies à ton cousin qui vote pas ? », « lequel a l'air officiel ? »).
  - Skill web-perf sur un prototype HTML de l'axe retenu pour valider le budget.
Livrable : Canvas de maquettes (3 axes), tokens de design (couleurs, teintes, typographie, espacements), règles d'illustration (5-8 règles), décision d'axe (ou hybride justifié), traitement de la mention IA et de l'indépendance, wordmark, budget perf.
Décision : Charte et contraste AA éliminatoires ; meilleur score pondéré ; ≥ 3/5 militants choisissent le même axe pour l'envoi ; aucun testeur ne perçoit une violation de charte (« a l'air officiel » sans être trompeur).
Dépend de : T1, T3

### [P0/M] T7 — Glossaire et couches de lecture (« en une phrase », « comme si j'avais 12 ans », « texte officiel »)
Q : Comment expliquer 30 à 60 termes de jargon (règle verte, bifurcation écologique, 6e République, constituante, pôle public, écocide, protectionnisme solidaire, créolisation…) et chaque section à trois niveaux, sans rien inventer, avec sources visibles, et sous quelle licence ?
Sous-questions :
  - Quels termes retenir (fréquences extraites en T1 : bifurcation écologique 28, constituante 34, smic 19, planification 13…) et lesquels ajouter parce que les indécis les demandent (« révolution citoyenne », « nouvelle France ») ?
  - Pour chaque terme : passage source dans le livre 2025, puis livrets/plans 2022 (/plans-2022/regle-verte/, /plans-2022/6e-republique/, /livrets-2022/planification-ecologique/), marqués « 2022 » ; FALC 2022 comme référence de ton pour le niveau « 12 ans ».
  - Génération par Claude au build (coût 0 € à l'exécution) puis relecture humaine par l'utilisateur, ou à la volée par LLM (risqué, coûteux) ?
  - Comment isoler visuellement la reformulation du verbatim (bloc, couleur, libellé « reformulation ») et l'attribuer en CC BY-NC-SA ?
  - Quelle couverture des questions réelles obtient-on avec glossaire + FAQ pré-générée (200-400 paires) avant de solliciter le LLM ?
  - Le curseur « niveau de détail » (3 positions) est-il une mécanique de découverte à part entière pour l'indécis ?
Méthodes :
  - Extraction des candidats depuis data/aec-2025.json ; WebFetch des pages 2022 via wp/v2/pages (REST propre) ; https://melenchon2027.fr/laec-falc/ pour le registre.
  - Pilote : générer avec Claude les 3 niveaux pour 5 sections types (ch12 s1, ch1 s6, une section sans « À savoir », une à plusieurs paragraphes, l'introduction) et 20 termes ; chaque phrase doit pointer une source (URL + citation).
  - Judge panel « fidélité » (3 juges : chaque affirmation remonte-t-elle à une source ? registre ? longueur mobile ?) + red team « qu'est-ce qu'un fact-checker contesterait ? ».
  - Test de compréhension avec un jeune de 18-25 si disponible (T13) : lire le niveau « 12 ans » puis reformuler oralement.
Livrable : data/glossary.json (30-60 entrées avec définition courte, passage verbatim, URL, année de source), 5 sections pilotes à 3 niveaux, guide de style de reformulation, décision figé-au-build vs à-la-volée, gabarit d'affichage.
Décision : 100 % des entrées sourcées ; 0 affirmation non traçable ; ≥ 80 % des 50 questions réelles de T8 couvertes par glossaire + FAQ sans LLM ; test de compréhension positif.
Dépend de : T1

### [P0/L] T8 — Stack IA gratuite et fidélité absolue : benchmark, anti-hallucination, mode dégradé désirable
Q : Quelle architecture répond aux questions sur n'importe quel terme ou concept avec zéro mesure inventée, en bon français, à 0 € même en pic viral, et reste désirable quand le quota est épuisé ?
Sous-questions :
  - Variante A (index lexical MiniSearch/BM25 embarqué côté client, 62 Ko gzip, 0 appel serveur) vs B (bge-m3 + Vectorize) vs C (routage lexical puis chapitre entier ~3 000 tokens en contexte) : rappel@5, latence p95, coût sur 30 questions réalistes.
  - Quel modèle Workers AI produit un français militant correct sans code-switching (benchmark de 25 questions sur llama-3.1-8b-instruct-fast, llama-3.2-3b, gemma-3-12b-it, mistral-small-3.1-24b, llama-4-scout, gpt-oss-120b) et à quel coût en neurons par question ?
  - Garde-fou en 3 couches : le LLM ne renvoie que des IDs de mesures (JSON mode limité à certains modèles) ; validation post-génération par correspondance exacte de chaîne ; suite de 100 questions adversariales (mesures inexistantes, PMA, nucléaire, euro, corrida, prompt injection, provocations racistes) — objectif 0 invention.
  - Un hit de cache AI Gateway évite-t-il la consommation de neurons ? Quelle normalisation de la question fait passer le taux de hit de 20 % à 80 % ? D1 (100 000 écritures/jour) comme cache applicatif, KV interdit en écriture dynamique (1 000/jour).
  - D1 supporte-t-il FTS5 avec unicode61 remove_diacritics pour le mode dégradé lexical serveur ?
  - Groq (Groq Inc.) est-il acceptable pour l'utilisateur malgré l'homophonie avec Grok (xAI) ? Gemini free et Mistral Experiment sont-ils exclus (données d'entraînement, RGPD art. 9) ?
  - Comment designer le refus (« cette question n'est pas traitée dans L'Avenir en commun ») et le mode dégradé (« réponse directement extraite du programme ») comme des moments UX assumés, avec la mention IA intégrée (AI Act art. 50) ?
  - Défense du budget : Turnstile invisible + rate-limit binding 60 s + quota journalier global en Durable Object + bascule automatique en extractif.
Méthodes :
  - context7 sur developers.cloudflare.com (Workers AI pricing/models/json-mode, AI Gateway caching, Vectorize, D1, Durable Objects, Rate limiting, Turnstile) et skills cloudflare / workers-best-practices / durable-objects.
  - Spike Worker jetable implémentant A, B, C sur data/aec-2025.json ; jeu de 30 questions réalistes (10 militant, 10 jeune, 10 indécis) + 100 adversariales versionnées dans le repo.
  - Benchmark FR : 25 questions × 6 modèles, notées par un judge panel de 3 juges Claude (français natif 0-5, fidélité verbatim 0-5, refus correct 0/1, longueur mobile) ; étaler sur 2 jours pour rester sous 10 000 neurons ou activer temporairement le plan payant (5 $) pour la session.
  - Test empirique cache AI Gateway : 2 requêtes identiques, header cf-aig-cache-status, compteur neurons avant/après dans le dashboard.
  - Test FTS5 via wrangler d1 execute en local puis distant.
  - AskUserQuestion : arbitrage Groq/Grok, autorisation d'un achat unique de 10 $ OpenRouter comme fallback, plan payant temporaire pour le benchmark.
Livrable : Rapport de benchmark chiffré (modèles, variantes, cache), architecture IA retenue avec schéma, contrat de fiabilité écrit (réponse = 1-3 verbatims + 2 phrases de liant + lien ; refus explicite hors périmètre), suite de tests adversariaux versionnée, spec du mode dégradé et de la défense du quota.
Décision : 0 mesure inventée sur 100 questions adversariales ; rappel@5 ≥ 0,9 sur les 30 questions ; p95 < 3 s ; coût 0 € démontré à 5 000 questions/jour grâce à statique + cache + extractif ; français noté ≥ 4/5 par le panel sur le modèle retenu.
Dépend de : T1, T7

### [P1/M] T9 — Architecture Cloudflare à 0 € tenant la viralité
Q : Quelle architecture statique-d'abord encaisse un pic de 10 000 visites par heure (un post militant qui marche) sans dépasser le plan gratuit, sans collecter de données et sans dépasser 10 ms CPU par requête ?
Sous-questions :
  - Static assets illimités pour l'app, les ~900 cartes de partage, le JSON du corpus, l'index de recherche ; un seul Worker API (/api/ask, /api/og si runtime) via run_worker_first.
  - D1 pour le cache Q/R et compteurs, KV en lecture seule pour données pré-chargées, Durable Object (SQLite) pour le quota global de neurons et, seulement s'il survit à T4, pour des duels temps réel.
  - Cron Trigger hebdomadaire : re-crawl canonique (107 requêtes), SHA-256 par section, assertions 18/89/837, échec bruyant, affichage « à jour au JJ/MM/AAAA ».
  - Feature flags pilotés par date pour le silence électoral (17-18 avril, 1-2 mai 2027) et pour changer rapidement le wording du chat (recommandations CNCCEP attendues fin 2026).
  - PWA hors-ligne pour le mode terrain (service worker, corpus en cache).
  - Workers Analytics Engine (100 000 points/jour, 10 000 lectures/jour, vérifié) pour les compteurs anonymes ; Cloudflare Web Analytics sans cookie pour éviter tout bandeau.
  - Bundle : framework léger (Preact/Solid ou React + Tailwind v4, stack de LFI), TypeScript strict, < 100 Ko gzip initial.
Méthodes :
  - context7 + skills cloudflare, wrangler, durable-objects, workers-best-practices pour vérifier chaque limite citée et la config wrangler.jsonc.
  - Schéma d'architecture (Artifacts) et tableau « quota gratuit vs charge au pic » par binding.
  - Calcul de charge sur 3 scénarios (jour calme 500 visites, post viral 10 000/h, attaque 100 000 requêtes /api/ask) avec la réponse de l'architecture à chacun.
Livrable : Schéma d'architecture, tableau quotas/charge, liste des bindings et de leur rôle, décision sur les Durable Objects, spec du cron et des feature flags, choix de framework.
Décision : Coût 0 € prouvé sur les 3 scénarios ; aucune donnée personnelle stockée ; l'app reste 100 % fonctionnelle (lecture, recherche, cartes, riposte) quand le quota IA est à zéro.
Dépend de : T3, T8

### [P0/S] T10 — Cadre légal, calendrier électoral et conformité intégrée au design
Q : Comment respecter L52-1 (dès le 1er octobre 2026), L49 (17-18 avril et 1-2 mai 2027), l'AI Act art. 50 (en vigueur), le RGPD art. 9, la CC BY-NC-SA 4.0 et la charte LFI, sans aucun disclaimer politique ?
Sous-questions :
  - Dates vérifiées : 1er tour 18 avril 2027, 2e tour 2 mai 2027 (Conseil des ministres du 1er juillet 2026) → période L52-1 à partir du 1er octobre 2026 : aucune promotion payante, jamais, sur aucune plateforme ; lancement organique uniquement.
  - Mode silence L49 : que gèle-t-on exactement (nouveaux contenus, cartes de partage, boutons de partage, chat) et que garde-t-on (lecture) ? Le maintien en ligne d'un site inchangé est-il une « diffusion » ?
  - Formulation et placement de la mention IA (art. 50) et de la mention d'indépendance éditoriale, distinctes du disclaimer de contenu refusé par l'utilisateur ; exception « contrôle éditorial » plaidable si réponses extractives relues.
  - Licence : dataset et reformulations en CC BY-NC-SA 4.0 avec attribution « La France insoumise – L'Avenir en commun », code sous licence libre séparée ; bouton de dons au développeur exclu ou limité à un lien vers la collecte officielle ; pas de code AGPL d'actionpopulaire.fr.
  - Mentions légales : identité de l'éditeur (options : nom complet / prénom + contact + hébergeur / association loi 1901) ; INPI (dépôts LFI / AEC / M27) ; ne pas solliciter d'accord formel de la campagne (compte de campagne).
  - Date limite d'inscription sur les listes électorales pour le 18 avril 2027 (hypothèse : en ligne le mercredi 3 mars, en mairie le vendredi 5 mars 2027 — à vérifier sur service-public.fr) comme CTA licite et utile.
  - Sondages « À savoir » de 2020-2021 : afficher institut et date systématiquement.
Méthodes :
  - WebFetch : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023883001 (L52-1), https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000032454526 (L49), https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.fr, https://digital-strategy.ec.europa.eu/en/policies/guidelines-ai-transparency-obligations, https://www.cnil.fr/fr/chatbots-les-conseils-de-la-cnil-pour-respecter-les-droits-des-personnes, https://presidentielle2022.conseil-constitutionnel.fr/l-election/la-campagne-sur-internet.html, service-public.fr (inscription listes).
  - Checklist de conformité : pour chaque obligation, l'écran ou le mécanisme technique qui y répond (feature flag, footer, page À propos, mentions légales, politique de confidentialité en 10 lignes).
  - AskUserQuestion pour les choix qui lui appartiennent : identité dans les mentions légales, dons, nom de l'app, mention d'indépendance, nommage de la tortue.
Livrable : Checklist de conformité avec mécanisme associé, textes courts prêts à intégrer (mention IA, indépendance, attribution, confidentialité), calendrier des dates critiques, décisions de licence.
Décision : Chaque obligation a un mécanisme concret dans le plan d'implémentation ; validé par l'utilisateur ; aucune promotion payante nulle part dans le plan de lancement.
Dépend de : 

### [P1/S] T11 — Mesurer le succès sans tracker personne
Q : Quels 5 compteurs strictement anonymes prouvent que le funnel militant → indécis fonctionne, et comment les lire sans jamais relier une personne à une réponse politique ?
Sous-questions :
  - Événements agrégés : arrivée via lien partagé (paramètre ?via=wa|tg|ig|qr sans identifiant), ouverture d'un verbatim de section, clic partage (par objet), complétion Devine-Chiffre, consultation Riposte, question chat + taux de refus + mode dégradé.
  - Analytics Engine (100 000 points/jour) vs simples compteurs D1 vs Cloudflare Web Analytics : quel mix reste sous quota en pic ?
  - Ce qu'on n'enregistre JAMAIS : le texte des questions rattaché à quoi que ce soit, les réponses aux mécaniques, IP, empreintes. Faut-il conserver des questions anonymisées pour améliorer le glossaire (purge courte, sans identifiant) ? Décision utilisateur.
  - Tableau de bord hebdomadaire pour l'utilisateur et proxy de K-factor (clics partage / sessions issues d'un partage).
Méthodes :
  - context7 sur Workers Analytics Engine et Web Analytics ; plan d'événements en tableau ; revue par le red-teamer « juriste CNIL » de T4.
  - AskUserQuestion sur la conservation anonyme des questions du chat.
Livrable : Plan de mesure (événements, dimensions, quotas), politique « ce qu'on n'enregistre jamais », maquette de tableau de bord.
Décision : Métrique nord mesurable ; zéro donnée personnelle ; validé par le red team CNIL.
Dépend de : T2

### [P1/M] T12 — Positionnement face à l'existant et plan de lancement 100 % organique
Q : Comment se positionner face à aec2027.fr (officiel, en page d'attente au 7/9/2026), laec.fr (2022, figé, vérifié) et avenir-en-commun.net (simulateur IA sur Render), et lancer par les militants, sans un euro de promotion, idéalement avec un soft launch avant le 1er octobre 2026 ?
Sous-questions :
  - Phrase de positionnement en une ligne (« melenchon2027.fr = le texte officiel ; aec2027.fr = la lecture officielle ; laec.fr = la référence 2022 ; notre app = l'endroit où un indécis comprend en 3 minutes et où un militant trouve sa munition en 10 secondes ») et liens sortants systématiques vers l'officiel.
  - Surveillance de aec2027.fr (page d'attente, robots.txt, webmanifest, theme-color #8B24D9) : que fait-on si l'officiel sort avec lecture + recherche ? Pivot vers 100 % partage/riposte/jeu.
  - Nom de l'app et domaine court (dictable au marché, imprimable en QR).
  - Canaux d'amorçage : 3 groupes d'action relais, Discord LFI, boucles Telegram, pack de stickers, comptes militants TikTok/Insta en organique, kit militant (5 messages prêts à coller avec lien + carte).
  - Calendrier : soft launch J-30 (3 GA), v1 publique avant fin octobre, v2 (chat + riposte complète) décembre, gel des fonctionnalités mars 2027, silence électoral avril-mai.
  - Faut-il prévenir LFI ? (Ne pas solliciter d'accord formel — compte de campagne — mais informer le Discord/le groupe numérique après lancement.)
Méthodes :
  - Audit parcours complet de https://laec.fr/sommaire, https://laec.fr/visuels, https://avenir-en-commun.net/simulateur.html (friction du formulaire en 4 écrans), https://aec2027.fr/ ; captures via claude-in-chrome.
  - Judge panel de personas sur 3 phrases de positionnement ; AskUserQuestion pour le nom et les relais.
  - Rédaction du kit militant et du plan J-30 → J+30 avec compteurs de T11.
Livrable : Phrase de positionnement validée, tableau de veille aec2027.fr avec scénario de pivot, nom et domaine, plan de lancement organique daté, kit militant (messages, cartes, stickers).
Décision : Validé par l'utilisateur ; ≥ 3 canaux d'amorçage avec relais nommés ; aucun poste payant ; plan de pivot écrit.
Dépend de : T2, T3

### [P0/M] T13 — Tests utilisateurs : une soirée avec 5 militants et 2-3 non-politisés
Q : Comment valider sur pièces, en une soirée et sans enregistrer aucune donnée, les objets de partage (T3), les mécaniques (T4), la direction artistique (T6) et le mode Riposte (T5) ?
Sous-questions :
  - Protocole en 4 tâches de 5 minutes : test 5 secondes sur les 3 accueils ; test 30 secondes sur un lien reçu dans WhatsApp ; tâche Riposte chronométrée ; « à qui tu l'envoies et pourquoi ? ».
  - Recrutement : 5 militants de l'entourage de l'utilisateur + 2-3 proches non politisés (idéalement 18-30) ; consentement oral, notes anonymisées, aucun enregistrement.
  - Grille de notation commune avec le judge panel pour comparer humains vs personas simulées.
  - Plan B si aucun testeur : judge panel élargi (7 personas) + sondage informel sur le Discord LFI.
Méthodes :
  - Protocole écrit et minuté (Artifacts), prototypes cliquables sur téléphone, liens réels envoyés dans un groupe WhatsApp de test créé pour l'occasion puis supprimé.
  - Synthèse en décisions confirmées / révisées / nouvelles.
Livrable : Protocole, résultats anonymisés, liste des décisions confirmées ou révisées.
Décision : ≥ 5 testeurs dont ≥ 2 non-politisés ; chaque décision structurante (axe, top-3 mécaniques, objet de partage) confirmée par ≥ 3 testeurs ou renvoyée en itération.
Dépend de : T3, T4, T6

## SÉQUENCE
0. Kick-off et arbitrages utilisateur (30 min) — Relire la thèse et les principes avec l'utilisateur, puis trancher en une salve AskUserQuestion les décisions qui lui appartiennent : Groq vs Grok (Groq Inc. ≠ xAI), achat unique de 10 $ OpenRouter et plan payant temporaire pour le benchmark, nom de l'app et domaine, mention d'indépendance discrète (acceptée ou non), nommage/animation de la tortue, identité dans les mentions légales, dons, licence du code, date visée de soft launch (avant le 1er octobre 2026 ?), liste des 5 militants et 2-3 non-politisés pour T13, conservation anonyme ou non des questions du chat.
   [solo + AskUserQuestion] sortie : Journal de décisions (dossier/decisions.md) initialisé avec 10 arbitrages datés ; créneau de la soirée de test fixé.
1. Corpus canonique (T1) — Écrire et exécuter le script d'extraction (nav.tdm → 89 sections → 837 propositions), les assertions d'invariants, le dédoublonnage croisé via RSS, l'extraction désintox (26 idées reçues) et les fréquences de termes ; tagger les propositions par situation de vie et thème terrain ; archiver la capture des mentions légales.
   [solo (code) + adversarial verify (recomptage indépendant par un second agent)] sortie : data/aec-2025.json avec 18/89/837 exacts, 0 doublon, IDs stables, tags ≥ 95 %, gz < 80 Ko ; data/desintox.json ; data/terms-candidates.json.
2. Funnel, personas, métrique nord (T2) et checklist légale (T10) en parallèle — Lancer le sweep multi-agents (terrain militant / jeunes 18-30 / indécis-abstention) pendant que l'agent principal établit la checklist légale et le calendrier (18 avril / 2 mai 2027, L52-1 au 1er octobre 2026, L49, AI Act art. 50, CC BY-NC-SA, inscription listes). Puis judge panel de 3 personas sur le funnel dessiné et entretiens flash de l'utilisateur avec 3 militants.
   [multi-modal sweep (3 agents) + judge panel (3 personas) + solo WebFetch légal] sortie : Carte du funnel, 3 personas avec top-10 objections, test des 30 secondes formalisé, métrique nord adoptée ; checklist légale avec mécanisme par obligation.
3. Mécaniques : inventaire, triage, red team (T4) — Brainstorm à 5 lentilles produisant ≥ 20 fiches mécaniques, scoring sur la grille utile vs gadget, attaque par 3 red-teamers (militant RN, fact-checker, juriste CNIL), sélection du top 6 et rédaction des fiches détaillées ; le verdict sur le swipe d'accord/pas d'accord est explicitement motivé.
   [brainstorm multi-agents → scoring → adversarial verify] sortie : Matrice scorée, top 6 avec fiches, liste des gadgets écartés, chaque mécanique mappée à une étape du funnel.
4. Spike objets de partage sur téléphone réel (T3) — Construire un Worker jetable + 5 cartes satori dans une charte provisoire (Public Sans, Crème, Violet), publier, envoyer les liens dans WhatsApp/Telegram depuis Android et iPhone, tester navigator.share vers Stories, mesurer poids/latence, capturer chaque aperçu ; décider build-time vs runtime et le texte de partage par défaut.
   [build-to-learn spike + test réel par l'utilisateur + judge panel « lequel tu ouvres ? »] sortie : Captures d'aperçus corrects sur 2 OS × 3 canaux, image < 300 Ko, spec des 5 objets, décision de génération.
5. Direction artistique sur canvas à contenu réel (T6) — Vérifier la charte et les polices réelles avec claude-in-chrome, analyser les affiches T27, puis produire avec le skill design un canvas de 3 axes × 3 écrans identiques (accueil avec l'objet d'entrée du top 6, section ch12 s1 verbatim, carte 1080x1080), scorer avec la grille pondérée, judge panel, puis compléter l'axe favori avec 4 écrans (Devine-Chiffre, Mon AEC, Riposte, refus du chat) et passer un test web-perf sur un prototype HTML.
   [design canvas (skill design) + claude-in-chrome + judge panel + web-perf] sortie : Canvas publié, tokens et règles d'illustration écrits, axe retenu à titre provisoire (à confirmer en étape 8), traitement de la mention IA et de l'indépendance maquetté.
6. Glossaire et couches de lecture pilotes (T7) — Générer les 3 niveaux pour 5 sections et 20 termes avec sources obligatoires, faire juger la fidélité par un panel, corriger, figer le guide de style et le format JSON ; décider figé-au-build.
   [génération solo + judge panel fidélité + red team fact-checker] sortie : glossary.json (≥ 20 entrées pilotes sourcées à 100 %), 5 sections à 3 niveaux, guide de style, gabarit d'affichage isolant reformulation et verbatim.
7. Benchmark IA et anti-hallucination (T8) — Spike des variantes A/B/C sur le corpus, benchmark FR de 6 modèles Workers AI sur 25 questions notées par 3 juges, test empirique cache AI Gateway / neurons, test FTS5 D1, suite de 100 questions adversariales, rédaction du contrat de fiabilité et du mode dégradé ; documenter via context7 chaque limite citée.
   [spike + multi-modal sweep (6 modèles en parallèle) + judge panel + adversarial verify] sortie : 0 mesure inventée sur 100 questions adversariales, rappel@5 ≥ 0,9, architecture IA choisie avec chiffres, contrat de fiabilité écrit, défense du quota spécifiée.
8. Soirée de tests utilisateurs (T13) — Dérouler le protocole en 4 tâches avec 5 militants et 2-3 non-politisés sur les prototypes cliquables (top 6), les 3 accueils, les liens réels du spike et le mode Riposte chronométré ; comparer aux notes du judge panel ; confirmer ou réviser l'axe, le top 3 du MVP et l'objet de partage principal.
   [user test (protocole écrit, notes anonymisées) + synthèse solo] sortie : Chaque décision structurante confirmée par ≥ 3 testeurs ou renvoyée en itération courte ; liste des décisions confirmées/révisées dans decisions.md.
9. Architecture 0 € et plan de mesure (T9, T11) — Avec context7 et les skills Cloudflare, figer le schéma statique-d'abord, le tableau quotas vs charge sur 3 scénarios, les bindings, le cron de re-crawl avec hash, les feature flags (silence électoral, wording du chat), la PWA hors-ligne, le plan d'événements anonymes et la politique « ce qu'on n'enregistre jamais ».
   [solo + context7 + skills (cloudflare, wrangler, durable-objects, workers-best-practices) + red team CNIL] sortie : Schéma d'architecture, tableau de quotas prouvant 0 € au pic, plan de mesure validé par le red team CNIL.
10. Mode Riposte / terrain et positionnement-lancement (T5, T12) — Finaliser data/riposte.json (30 objections → verbatims + chiffres), les specs Riposte et terrain hors-ligne, le gabarit QR/tract ; auditer laec.fr, avenir-en-commun.net, aec2027.fr ; valider la phrase de positionnement, le nom, le plan de lancement organique J-30 → J+30 et le kit militant ; écrire le scénario de pivot si aec2027.fr sort.
   [solo + claude-in-chrome (audits) + judge panel positionnement + AskUserQuestion] sortie : riposte.json complet, specs écrites, positionnement et plan de lancement validés par l'utilisateur, veille aec2027.fr planifiée.
11. Synthèse : dossier, journal de décisions, prompt final — Assembler le dossier de recherche selon la structure prévue, consolider decisions.md, rédiger le prompt de plan-mode avec tous les éléments requis, puis le soumettre à une critique adversariale par un agent « architecte senior » et un agent « militant sceptique » (« que manque-t-il pour produire le meilleur plan ? qu'est-ce qui serait mal compris ? ») ; itérer une fois ; validation finale par l'utilisateur.
   [solo + adversarial verify (2 critiques) + validation utilisateur] sortie : Dossier complet, canvas de maquettes lié, datasets versionnés, prompt final validé et prêt à être collé dans une session Claude Code en plan mode.

## RISQUES
- Le « match » ou un score non auditable fait accuser l'app de manipulation (précédent Elyze, aggravé pour un projet ouvertement pro-LFI) et tue la viralité par la honte de partager. => Interdire le match par principe ; ne proposer que des ressorts de surprise et de personnalisation ; publier la méthode de tout calcul et le code ; red team systématique de chaque mécanique (T4) ; verbatim à ≤ 1 tap partout.
- Gamification gadget : la session s'enthousiasme pour XP, streaks, ligues, badges, qui exigent un compte/serveur, n'apportent rien au funnel et infantilisent les militants. => Grille utile vs gadget avec seuil et critères éliminatoires ; MVP limité à 3 mécaniques ; test auprès de vrais militants avant toute inscription au plan ; liste explicite des gadgets écartés dans le dossier.
- L'objet de partage rend mal (image > 300 Ko, recadrage, texte perdu via Web Share, aperçu absent sur WhatsApp) et le funnel s'effondre au premier maillon sans que personne ne le voie. => Spike testé sur téléphones réels dans de vrais groupes WhatsApp/Telegram et en Story (étape 4) avant toute décision de design ; captures conservées ; budget og:image < 300 Ko et zone sûre centrale inscrits dans le prompt final.
- Hallucination d'une mesure par le chat, capturée en screenshot : arme contre LFI, référé « manipulation de l'information » possible dans les 3 mois précédant le scrutin, fin du projet. => Architecture extractive (le LLM sélectionne des IDs, l'app affiche le JSON local), validation post-génération par correspondance exacte, 100 questions adversariales avec objectif 0 invention comme critère d'acceptation, refus designé, contrôle éditorial humain des contenus pré-générés.
- Le succès viral épuise les 10 000 neurons/jour (ou une attaque le fait chaque matin) et les nouveaux visiteurs découvrent une app muette. => Statique d'abord : lecture, recherche, cartes, riposte, glossaire fonctionnent sans IA ; mode dégradé « réponse extraite du programme » assumé ; Turnstile + rate-limit + quota global en Durable Object ; cache D1 avec normalisation des questions ; fallback OpenRouter (achat unique 10 $) si l'utilisateur l'autorise.
- aec2027.fr (officiel) sort avec lecture, recherche et peut-être chat, rendant l'app redondante en plein lancement. => Positionnement complémentaire dès le départ (partage, riposte, jeu, personnalisation) ; liens sortants vers l'officiel ; veille à chaque étape et scénario de pivot écrit (T12) ; soft launch tôt pour installer l'audience militante.
- Confusion d'identité visuelle : la session ramène l'ancienne charte (Montserrat, bleu #0098B6, Φ) ou pose du texte dans les couleurs vives illisibles (jaune #f9c900 à 1,53:1). => Vérification visuelle de la charte et des affiches par navigateur réel (étape 5) ; liste d'interdits et tokens figés dans le prompt final ; contraste AA éliminatoire dans le scoring.
- Fidélité maximale à la charte + refus de disclaimer = l'app est prise pour un site officiel, ce qui engage le mouvement (interdit par la charte), fragilise la position « pas de dépense de campagne » et impute au parti les erreurs du bot. => Wordmark et nom propres à l'app, mention d'indépendance discrète (distincte du disclaimer de contenu refusé) validée par l'utilisateur à l'étape 0, ne jamais solliciter d'accord formel de la campagne, mentions légales complètes.
- Promotion payante (boost Insta, TikTok Ads, influenceur rémunéré) glissée dans le plan de lancement après le 1er octobre 2026 : infraction L52-1 (TikTok l'interdit de toute façon). => Plan de lancement 100 % organique par construction (militants, Discord, boucles, stickers, QR sur tracts) ; ligne « zéro promotion payante » dans le prompt final et dans le kit militant.
- Collecte involontaire de données sensibles (questions du chat loguées avec IP, réponses aux mécaniques, formulaire de contact) : RGPD art. 9 et toxicité politique post-fuite Action Populaire. => Zéro compte, état dans l'URL/localStorage, compteurs agrégés seulement, red team CNIL sur le plan de mesure, politique « ce qu'on n'enregistre jamais » affichée, aucune collecte de contacts (Action Populaire s'en charge).
- Sur-scope : 13 pistes, 20 mécaniques, 3 axes, chat, riposte, PWA — la session produit un catalogue et aucune décision, et le plan d'implémentation devient irréalisable avant avril 2027. => Critères de sortie chiffrés par étape, décisions consignées dans decisions.md, MVP = 3 boucles (un objet de partage, une mécanique d'entrée, la lecture augmentée avec verbatim) + Riposte en v2 + chat en v2/v3 ; le prompt final impose un découpage en 3 releases datées.
- Aucun militant ni non-politisé disponible pour la soirée de test ; les décisions reposent uniquement sur des personas simulées. => Recrutement décidé à l'étape 0 ; plan B : judge panel élargi à 7 personas + sondage informel sur le Discord LFI et dans une boucle Telegram ; décisions marquées « à confirmer en soft launch » avec compteurs anonymes.
- Contenus reformulés (« 12 ans », « en une phrase ») ou tags de situation de vie inexacts qui trahissent le texte ou attribuent une mesure à un public qu'elle ne concerne pas. => Sources obligatoires par phrase, relecture humaine de l'utilisateur, isolation visuelle reformulation/verbatim, licence CC BY-NC-SA sur les dérivés, échantillonnage de contrôle des tags (10 %) par un juge.
- Confusion Groq/Grok ou fournisseur gratuit avec clause d'entraînement (Gemini free, Mistral Experiment) retenu par inadvertance : angle d'attaque politique et RGPD. => Arbitrage explicite à l'étape 0 ; liste d'exclusions dans le prompt final ; Workers AI (engagement contractuel de non-réutilisation) par défaut ; aucune donnée utilisateur envoyée à un tiers sans décision documentée.

## DOSSIER
- 0. Résumé exécutif : thèse, funnel en une image, les 10 décisions prises sur pièces et leurs preuves
- 1. Journal de décisions (decisions.md) : arbitrages utilisateur, décisions de session, options écartées et pourquoi, points encore ouverts
- 2. Funnel militant → indécis : carte du parcours, 3 personas, moments de partage, test des 30 secondes, métrique nord et métriques secondaires
- 3. Corpus et données : algorithme d'ingestion canonique, pièges (RSS, slugs globaux), schéma JSON et IDs, invariants 18/89/837, tags, désintox, glossaire, licence CC BY-NC-SA et attribution
- 4. Objets de partage et canaux : spécifications des 5 objets, captures réelles WhatsApp/Telegram/Stories, contraintes vérifiées (og:image < 300 Ko, Web Share API), texte de partage, URL courtes, stickers, QR
- 5. Mécaniques : matrice des 20 mécaniques scorées, top 6 en fiches, gadgets écartés, verdict sur le swipe, résultats du red team
- 6. Direction artistique : lien vers le canvas, axe retenu et pourquoi, tokens (couleurs 2027, teintes secondaires, typographie Public Sans/Gowun Batang), règles d'illustration et tortue, interdits (Montserrat, #0098B6, Φ), traitement de la mention IA et de l'indépendance, budget de performance
- 7. Couches de lecture et glossaire : guide de style, exemples des 3 niveaux, format d'affichage, résultats du panel fidélité
- 8. Stack IA et fidélité : benchmark chiffré (modèles, variantes A/B/C, cache), architecture retenue, contrat de fiabilité, suite adversariale, mode dégradé, défense du quota, exclusions (Grok, Gemini free, Mistral Experiment)
- 9. Architecture Cloudflare 0 € : schéma, bindings, tableau quotas vs charge (3 scénarios), cron de fraîcheur, feature flags (silence électoral, wording), PWA, framework
- 10. Mode militant : Riposte (30 objections), terrain hors-ligne, QR/tract, soirée débat, frontière avec Action Populaire/TokTok/laec.fr
- 11. Cadre légal et calendrier : dates vérifiées (18 avril / 2 mai 2027, L52-1 dès le 1er octobre 2026, L49), AI Act art. 50, RGPD art. 9, CC BY-NC-SA, mentions légales, INPI, checklist obligation → mécanisme
- 12. Mesure sans tracking : plan d'événements anonymes, quotas Analytics Engine, politique « ce qu'on n'enregistre jamais »
- 13. Positionnement et lancement : one-liner, audit laec.fr / avenir-en-commun.net / aec2027.fr, veille et scénario de pivot, plan organique J-30 → J+30, kit militant
- 14. Résultats des tests utilisateurs : protocole, notes anonymisées, décisions confirmées/révisées
- 15. Roadmap : MVP (3 boucles) → v2 (Riposte, chat) → v3, dates, gel de mars 2027, silence électoral
- 16. Annexes : sources avec URLs et statut FAIT/PROBABLE/HYPOTHÈSE, fixtures HTML, jeux de questions (30 réalistes + 100 adversariales), captures
- 17. Le prompt final pour la session plan-mode (fichier séparé, prêt à coller)

## PROMPT FINAL
- Contexte verbatim de la demande de l'utilisateur, ses cibles (militants = usagers principaux et canal ; jeunes 18-30 ; indécis/abstentionnistes), ses contraintes (0 € d'exploitation, pas de Grok, fidélité absolue, charte 2027, pas de disclaimer politique) et le rôle du projet (perso, non officiel, licence CC BY-NC-SA sur les contenus).
- La thèse produit et le funnel en 6 étapes avec, pour chaque étape, l'écran, l'objet et le compteur anonyme ; la métrique nord adoptée et sa définition exacte.
- Les décisions prises sur pièces et leurs preuves : axe de direction artistique, top 3 mécaniques du MVP (+ top 6 pour v2), objet de partage principal, architecture IA retenue, framework, nom et domaine — chacune avec un lien vers la preuve (canvas, captures, benchmark).
- Les chemins et schémas des datasets produits : data/aec-2025.json (IDs, tags, hashes, invariants 18/89/837), data/glossary.json, data/riposte.json, data/desintox.json, jeux de questions (30 réalistes + 100 adversariales), et l'algorithme d'ingestion canonique avec ses pièges (RSS dupliqué, slugs résolus globalement, absence de Last-Modified/ETag).
- Les tokens de design et règles : couleurs 2027 (#4C0297, #D1271C, #FFFCF4, #212320), teintes secondaires (#E5CBFF, #FDEDFF, #FFD2CF), palette vive réservée aux aplats/grands titres, Public Sans + Gowun Batang auto-hébergées en woff2 sous-ensemblées, règles d'illustration et tortue vectorielle, interdits explicites (Montserrat, #0098B6, Φ, LogoTortue.svg tel quel), lien vers le canvas de maquettes.
- Les spécifications des objets de partage : formats 1200x630 / 1080x1080 / 1080x1920 / 800x800, og:image < 300 Ko et zone sûre centrale, une seule balise og:image, satori + resvg-wasm (PNG, pas de WebP), pré-génération en static assets, texte de partage par défaut, structure d'URL (/m/<id>, /chiffre/<date>, /defi/<état>), Web Share API avec fallback copier/télécharger, paramètre ?via= sans identifiant.
- Le contrat de fiabilité du chat : le LLM sélectionne des IDs et n'écrit jamais une mesure, réponse = 1-3 verbatims + 2 phrases de liant + lien, validation post-génération par correspondance exacte, refus explicite designé, mention IA intégrée (AI Act art. 50), mode dégradé « réponse extraite du programme », suite adversariale comme critère d'acceptation (0 invention).
- Les contraintes Cloudflare non négociables : plan gratuit uniquement, static assets illimités pour tout ce qui est pré-généré, un seul Worker API avec run_worker_first, 10 ms CPU par requête (le Worker orchestre, ne calcule pas), KV interdit en écriture dynamique (1 000/jour), D1 pour le cache, Durable Object SQLite pour le quota global, Turnstile invisible + rate-limit binding, AI Gateway avec normalisation des questions, Workers AI par défaut (pas de Gemini free / Mistral Experiment ; Groq selon arbitrage), cron hebdomadaire de re-crawl avec hash et échec bruyant, Analytics Engine sous 100 000 points/jour.
- Le calendrier et la conformité intégrée : 1er tour 18 avril 2027, 2e tour 2 mai 2027 ; zéro promotion payante à partir du 1er octobre 2026 ; feature flag de silence électoral (17-18 avril, 1-2 mai) ; feature flag de wording du chat modifiable sans redéploiement ; attribution CC BY-NC-SA et mention d'indépendance discrète ; mentions légales et politique de confidentialité courtes ; date limite d'inscription électorale comme CTA (à vérifier) ; affichage institut + date sur chaque « À savoir ».
- La politique de données : zéro compte, zéro base d'utilisateurs, état dans l'URL et le localStorage, compteurs agrégés anonymes uniquement, liste explicite de ce qui n'est jamais enregistré, aucun cookie hors sécurité Cloudflare (pas de bandeau), aucune police ou script tiers distant.
- Le budget de performance : LCP < 2 s en 4G simulée, CLS < 0,1, INP < 200 ms, JS initial < 100 Ko gzip, 60 fps sur mobile milieu de gamme, prefers-reduced-motion, WCAG 2.2 AA (cibles ≥ 24 px, alternatives clavier au swipe).
- Le découpage en releases datées : MVP (3 boucles : objet de partage + mécanique d'entrée + lecture augmentée verbatim/3 niveaux) pour un soft launch avant fin octobre 2026, v2 (Riposte, chat extractif, PWA hors-ligne) en décembre, v3 (mécaniques 4-6, stickers, soirée débat) en janvier-février, gel des fonctionnalités en mars 2027, mode silence en avril-mai.
- Les non-objectifs explicites : pas de lecture linéaire concurrente de aec2027.fr, pas de match ni de score de compatibilité, pas de comptes, pas de leaderboards ni de push, pas de collecte de contacts (Action Populaire), pas de 3D/WebGL, pas de monétisation ni de dons au développeur (clause NC), pas de code AGPL d'actionpopulaire.fr.
- La stack et les conventions : Cloudflare Workers + static assets (ou Pages), TypeScript strict, composants fonctionnels (framework retenu), Tailwind v4, ESLint/Prettier, code et commentaires en anglais, UI en français, tests (invariants du corpus, suite adversariale, snapshots des cartes de partage), CI de déploiement wrangler, environnement de dev avec IA mockée pour ne pas consommer le quota.
- Ce qu'on attend de la session plan-mode : un plan d'implémentation avec arborescence de fichiers, wrangler.jsonc et bindings, pipeline de données, modèle de composants, stratégie de test, budgets de perf, plan de déploiement/rollback, veille aec2027.fr, ordre des tâches par release, estimation d'effort ; et l'instruction de poser des questions avant de trancher toute ambiguïté résiduelle listée dans decisions.md.
- La liste des sources avec statut FAIT VÉRIFIÉ / PROBABLE / HYPOTHÈSE (URLs) pour que la session plan-mode ne re-vérifie que ce qui est marqué PROBABLE ou HYPOTHÈSE (aperçu WhatsApp, quotas tiers, date limite d'inscription, outil TokTok, édition papier Seuil 2025).

## IDÉES AUDACIEUSES
- LE DEVINE-CHIFFRE (quotidien, façon Wordle) : chaque jour, un des 48 encadrés « À savoir » devient une question — « Quel pourcentage de Français sont d'accord pour interdire de prélever plus que ce que la Terre reconstitue ? » — on glisse un curseur, on découvre 83 % (Harris Interactive, juillet 2021, date visible) et la mesure verbatim ; le partage est une grille d'emojis sans spoiler (⬜🟪🟪 « J'étais à 12 points ») + lien. Déterministe par date, zéro serveur, zéro donnée, rendez-vous éditorial sans compte.
- « TU SAVAIS QUE C'ÉTAIT DEDANS ? » : 10 mesures surprenantes en cartes, le geste n'est pas d'accord/pas d'accord mais « je savais / je savais pas / ça me concerne » ; le résultat est « 7 mesures sur 10 que tu ne connaissais pas » avec un compteur agrégé anonyme (« 68 % des gens ne savaient pas pour celle-ci ») — le ressort est la surprise, jamais le match.
- « ÇA CHANGE QUOI POUR MOI ? » en 3 taps : statut (étudiant, salarié, indépendant, retraité, sans emploi), logement (locataire/propriétaire/chez les parents), lieu (ville/campagne) → 8 mesures verbatim taguées au build, sans LLM, sans rien enregistrer, avec une carte story « Mes 8 mesures » ; l'antithèse du simulateur en 4 écrans de questions financières de avenir-en-commun.net.
- « MON AEC EN 10 MESURES » : l'utilisateur constitue son deck en lisant ou en jouant, l'état est encodé dans l'URL (comme un défi Wordle) et rendu en image 1080x1920 dans la charte ; le lien reçu ouvre le deck de l'expéditeur et propose « fais le tien » — objet identitaire et partageable sans compte.
- MODE RIPOSTE pour militants : flashcards « on te dit “c'est infinançable” → tu réponds » avec la mesure verbatim, le chiffre sourcé et la réponse désintox (26 idées reçues + objections terrain), entraînement chronométré 10 s, et un bouton « envoyer la riposte » qui produit une carte de partage ; c'est ce qui rend l'app utile au marché et dans une boucle WhatsApp en pleine polémique.
- MODE MARCHÉ HORS-LIGNE : PWA avec gros boutons par thème (salaire, logement, santé, retraite, écologie, sécurité) → 3 mesures + 1 chiffre en plein soleil sans réseau, et « laisser un lien » par QR code thématique imprimable sur les tracts commandés sur materiel.actionpopulaire.fr ; aucune collecte de contact, on renvoie vers le formulaire Action Populaire.
- LA TORTUE QUI AVANCE : la progression sur les 18 chapitres est une tortue qui progresse sur un parcours (localStorage), partageable en « J'ai lu 14/18 chapitres, et toi ? » avec état dans l'URL ; à 18/18, une carte easter egg avec le lait-fraise, code de reconnaissance entre militants.
- LE DÉFI PAR LIEN : un militant envoie 5 questions (Devine-Chiffre ou Tu savais ?) ; l'indécis joue et voit son score à côté de celui de l'expéditeur, sans compte ni serveur (état encodé) ; boucle de re-partage naturelle en famille et entre collègues.
- CURSEUR « NIVEAU DE DÉTAIL » à 3 positions sur chaque section : « en une phrase » → « comme si j'avais 12 ans » (registre FALC, sourcé, relu, isolé visuellement) → « texte officiel » verbatim ; le curseur lui-même est une mécanique de découverte et une promesse de fidélité (le verbatim est toujours à un geste).
- « QUESTION À LA TORTUE » : le chat n'écrit jamais une mesure, il en retrouve ; chaque réponse = 1 à 3 citations verbatim en ligne + 2 phrases de liant + lien de section + bouton « partager cette citation » ; le refus (« ce point n'est pas traité dans L'Avenir en commun — voici les 3 sujets les plus proches ») et le mode dégradé (« réponse directement extraite du programme ») sont des écrans designés, pas des erreurs.
- UNE CARTE PAR MESURE, 837 FOIS : chaque proposition a une URL courte, un aperçu OG 1200x630, une story 1080x1920 et un carré 800x800 pré-générés au build dans la charte ; c'est ce qui manque à laec.fr (21 visuels faits main) et l'atout n°1 du militant qui veut envoyer « juste ça » sur WhatsApp.
- MOMENT SOIRÉE DÉBAT : pendant un débat TV, un mode « il a dit X — c'est vraiment dans le programme ? » avec recherche verbatim instantanée côté client et carte « ce qu'il y a vraiment dans le programme » à envoyer dans la minute ; à tester comme utile vs gadget.
- PACK DE STICKERS TELEGRAM + VISUELS 800x800 : la tortue et 20 chiffres « À savoir » en stickers pour les boucles militantes, coût nul, diffusion dans les groupes existants ; le sticker porte l'URL courte.
- CTA « ES-TU INSCRIT ? » pour les 18-30 : bannière déterministe à J-60 de la date limite d'inscription (début mars 2027, à vérifier), lien vers service-public.fr, carte de partage « Je viens de vérifier mon inscription, fais-le en 2 minutes » — l'action la plus utile et la plus licite du funnel indécis.
- LE SILENCE ÉLECTORAL COMME MOMENT : du 17 avril 00h00 au 18 avril 20h (et 1er-2 mai), l'app masque partage et chat, garde la lecture, et affiche une tortue au repos avec « Aujourd'hui on ne partage plus » — conformité L49 transformée en signature de marque.
- PROMESSE AFFICHÉE EN ACCUEIL : « Aucun compte. Aucune donnée. Aucun tracker. Tout le texte est celui du programme. » — après la fuite Action Populaire de mai 2026, c'est un argument de partage à part entière pour le militant et un désamorçage de la méfiance de l'indécis.
