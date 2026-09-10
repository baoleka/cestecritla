# 00 — Résumé exécutif — « C'est écrit là »

> **Ce document se lit seul.** Il tient en une lecture ce qu'une personne qui n'ouvre rien d'autre doit savoir : ce qu'est l'app, les dix décisions prises sur pièces, ce que la session a prouvé et ce qu'elle n'a pas prouvé, ce qu'on ne construira pas, les trois chiffres, l'état des livrables et par où commencer. Tout le reste est dans `decisions.md` (**158 décisions D0-D13** au 10/9/2026 : 150 après le report des D9 et des D12, **+8 avec les arbitrages de l'utilisateur D13.1-D13.8**) et dans les dix-sept rapports d'étape.
>
> **Statuts.** VÉRIFIÉ = mesuré ou lu à la source, fichier / capture / commande cités. PROBABLE = déduit ou mesuré une seule fois. HYPOTHÈSE = non prouvé, méthode de levée indiquée. **HYPOTHÈSE (personas)** = jugé par des personas-agents et non par des personnes (D11.1) : un persona-agent n'est pas un testeur, ces résultats sont à rejouer avec des humains avant lancement.
>
> Session de découverte du 7 au 10 septembre 2026. Corpus `d29c7422004ab27c`. Domaine `cestecritla.fr` actif, dépôt `baoleka/cestecritla`. Neurons consommés : 6 713,31 / 8 000 (`neurons-log.md`).
>
> **Arbitrages du 10 septembre 2026.** L'utilisateur a tranché les huit questions que le §19 du prompt laissait ouvertes sur l'architecture, le partage et le nommage (à consigner en **D13.1 à D13.8** dans `decisions.md`) : aucune route serveur ni base D1 en v1 comme en v2 · identifiant de partage permanent, version du corpus dans le chemin de l'aperçu · seul le 1200×630 pré-généré, carré et story dessinés dans le navigateur · `/defi/<n>/` et 60 tirages figés · **pseudonyme public unique « Baoleka »** · dépôt renommé **`baoleka/cestecritla`** · **Node 24** partout · `CLAUDE.md` à jour. `design/strings.json` est en **v0.5**, contrat d'interpolation clos.

---

## 1. L'app en cinq lignes

**melenchon2027.fr, c'est le texte officiel. *C'est écrit là*, c'est l'endroit où quelqu'un qui doute comprend une idée du programme en trois minutes, et où un militant retrouve la mesure exacte — son texte, son lien, son image — en dix secondes, hors ligne, sans compte, sans IA et sans rien laisser derrière.** (`12-positionnement-lancement.md` §9.8)

Le cas majoritaire est l'arrivée par lien WhatsApp sans contexte (D0.4) : l'écran change selon l'entrée (D0.19) — par lien, on comprend ; en direct, on riposte. Le militant est l'utilisateur principal **et** le canal de diffusion. Ce que la phrase ne dit jamais, volontairement : « officiel », « application », « quiz », « intelligence artificielle ». La différence avec le terrain est fonctionnelle, pas graphique : deux projets indépendants appliquent déjà la charte 2027 avec les mêmes polices libres (D10.1).

---

## 2. Les dix décisions prises « sur pièces »

Chacune est un fait mesuré, pas une préférence. La colonne « preuve » cite le fichier qui l'a mesurée.

| # | Décision | Preuve mesurée | Réf. |
|---|---|---|---|
| 1 | **Identité = charte LFI + emprunts M27, direction A « éditoriale »** (Violet #4C0297, Rouge #D1271C, Crème #FFFCF4, Charbon #212320 ; aucun logo LFI ni M27) | Les 4 couleurs sont identiques sur la charte et sur melenchon2027.fr (`getComputedStyle`) ; 105 paires de contraste calculées, 100 % du texte courant ≥ 4,5:1, Violet sur Charbon = 1,33 interdit → accent sombre Violet 200 ; panel de 6 juges sur maquettes à contenu réel : A 30/30, B 22/30, C 15/30 | D3.1, D3.3, D3.4, D3.9 · `design/identity-decision.md`, `design/contrast-matrix.md`, `05-direction-artistique.md` |
| 2 | **Typographie hybride, polices auto-hébergées** : Public Sans pour la voix de l'app, Gowun Batang 17-18 px réservée au verbatim (filet Violet, étiquette « Texte du programme ») | Échantillon FR rendu à 390 px sur un chapeau réel ; 4 sous-ensembles latin woff2 = 99 744 o livrés, 82,2 Ko chargés par page, 0 requête Google Fonts (témoin Lighthouse : Google Fonts = LCP 2 445 ms) | D3.2, D3.6 · `design/typo/`, `design/fonts/README.md`, `design/perf-budget.md` §5.8 |
| 3 | **Corpus figé, vérifié et versionné par empreinte** : 4 parties / 18 chapitres / 89 sections / 837 propositions / 48 « À savoir » / 109 paragraphes, `corpus_version d29c7422004ab27c` | `verify-corpus.ts` (indépendant de l'ingestion) : PASS, 0 problème, 1 033 empreintes d'items, 10 sections tirées au sort identiques caractère par caractère au site ; invariants identiques sur 4 crawls | D1.1, D1.2, D1.4, D1.7 · `03-corpus.md`, `data/expected-invariants.json` |
| 4 | **Cartes OG pré-générées au build, jamais rendues à la demande** | Spike satori 0.32 + resvg-wasm déployé : **137-283 ms de CPU médian par carte contre 10 ms autorisés** sur le plan gratuit → 33-75 % de 503 « error 1102 » après quelques dizaines de rendus ; PNG produits 43-132 Ko | D4.1 · `06-partage.md` §2-4 |
| 5 | **Aperçus de partage prouvés sur le domaine final** `cestecritla.fr` (acheté le 9/9 à 08:12 UTC, zone Cloudflare Free active à 09:10 UTC, titulaire anonymisé par l'AFNIC) | 8 liens du spike renvoyés depuis Android et iPhone sur WhatsApp, Telegram et story Instagram, plus la page `/diag` : aperçus affichés (DÉCLARÉ par l'utilisateur ; détail de la grille non collecté) | D10.2, D4.4 · `06-partage.md` §5 |
| 6 | **Gamification niveau 2 ; MVP = « Laquelle est ici ? » + « Tu savais que c'était dedans ? » en lien nu + le socle** | Session 2 jouée sur le prototype déployé : vote niveau 1×1 / **2×4** / 3×2 ; MVP « Laquelle est ici ? » 5 voix, recherche locale 5, riposte 4, « Tu savais » 4, « La carte des 89 » **0** ; le niveau 3 tient techniquement (état `#r=` lu 6/6 chez le destinataire) mais 4/7 refusent de l'envoyer à un non-militant | D5.13, D5.14, D5.15 · `13-tests-humains.md` §3.9 — **HYPOTHÈSE (personas)** |
| 7 | **Chat livré en extractif pur : aucun LLM à l'exécution** | Bench v2 « sélection pure » (60 appels, 1 380,58 neurons) : neurons 34,4/question ✅, invention après validateur 0 % ✅, mais **refus corrects 87,5 %** ❌ (seuil 95 %), **p95 4 159 ms** ❌ (seuil 3 s), **`liant_kind` exact 50 %** ❌. Conséquence : 0 neuron, capacité illimitée. **Formulation exacte (corrigée le 10/9, panel rouge T12)** : *aucune phrase du programme n'est rédigée par l'app ; la phrase de liant est calculée par des règles publiées* — l'app émet quand même six phrases assertives qui ne sont pas dans le corpus, et leur justesse dépend de la table R0-R6 | D6.9, D6.10 · `eval/results-v2.md`, `08-ia.md` §7 bis |
| 8 | **Le liant est calculé par règles, jamais choisi par le modèle** ; la piste IA est rouverte en contrat v3 « ids seuls » sur trois preuves | Panel de juges : posture correcte **52,5 %** quand le modèle la choisit ; 3 négations fausses sur le programme entier sur 130 réponses (q080, q083, h21), toutes invisibles au validateur | D6.11, D6.4 · `08-ia.md` §7 bis |
| 9 | **Retrieval = variante A, MiniSearch côté client** ; contexte hybride « top 10 ∪ 2 sections » si une IA revient | 7 configurations × 100 questions, 0 neuron : rappel@5 0,80-0,81 (**seuil 0,9 non atteint**), rappel@10 0,87, hit@5 0,96-0,99, rappel@3 sections 0,92, MRR 0,82, index ≈ 60 Ko gzip, < 1 ms. Sans les synonymes du glossaire et de la FAQ, rappel@5 tombe à 0,77 : le levier est le fichier d'alias, pas le moteur | D6.1 · `eval/retrieval-results.md` |
| 10 | **Un Worker + Static Assets, Astro 5 statique, zéro log** ; le Worker orchestre, il ne calcule pas | Labo `framework` : JS initial **1,5 Ko** (Astro) contre 64,7 Ko (React + Vite), LCP labo 935 ms contre 2 059 ms, **0 invocation** facturée sur 3 Workers assets-only ; budget en Durable Object SQLite : plafond 8 500 respecté à l'unité sous 40 requêtes parallèles ; HIT de cache AI Gateway = 0 token et ≈ 50 ms (115 HIT) ; rate limit binding **INFIRMÉ** comme protection de quota (140 requêtes sans un 429) | D7.1-D7.8 · `09-architecture.md`, `prototypes/labo-plateforme/` |

*Onzième, non négociable et transverse* : **zéro compte, zéro base d'utilisateurs, zéro log rattachable** — les opinions politiques sont des données sensibles (RGPD art. 9), et la fuite Action Populaire de mai 2026 a montré ce que coûte une base militante. `observability.enabled: false`, AI Gateway Logs OFF, aucun `console.*` sur du contenu client, Analytics Engine sans identifiant, échantillonnage client à 10 %, jamais le texte d'une question (D0.22, D7.8, D7.9).

---

## 3. Ce que la session a prouvé — et ce qu'elle n'a pas prouvé

**Prouvé (VÉRIFIÉ).**

- **Le corpus est exhaustif et re-vérifiable par un tiers** : pipeline canonique hors Worker (116 requêtes, UA identifiable), vérificateur adversarial indépendant, empreinte par section, re-crawl hebdomadaire qui ouvre une PR de diff.
- **Le 0 € tient, et il tient sans IA** : la démonstration « app 100 % fonctionnelle à 0 neuron et 0 requête Worker » couvre l'écran 0, les 89 sections, la recherche, la FAQ, le glossaire, la riposte, les jeux, le partage et jusqu'à l'écran de refus (`09-architecture.md` §4.3).
- **Les contraintes de plateforme sont des faits, pas des estimations** : 10 ms de CPU par invocation interdisent tout rendu d'image à la demande ; les Static Assets sont gratuits et illimités ; un Worker pèse 64 Mio non compressé (le plan disait 3 Mo : périmé).
- **La fidélité est du code, pas du prompt** : validateur post-hoc, contrat JSON, routes sans IA, textes fixes ; 0 invention après validateur sur 130 items. Et le motif inverse est prouvé aussi : dès que le modèle **rédige**, il invente (1 mesure inventée en prose sur 60, 6 affirmations non couvertes).
- **Le partage marche** sur trois messageries, deux OS, sur le domaine final.
- **La direction artistique passe les éliminatoires** : contraste AA sur Crème et sur Charbon, aucun logo tiers, aucune ligne rouge D0.32.

**Non prouvé (HYPOTHÈSE, à lever avant lancement).**

- **Aucun humain n'a testé l'app.** Les sessions 1 et 2 ont été jouées par sept personas-agents (D11.1). Les mesures Playwright (positions en px, débordements, `localStorage`, temps de chargement) sont VÉRIFIÉES ; les préférences, les votes, les secondes « jusqu'à comprendre » et les huit points de `13-tests-humains.md` §3.12 ne le sont pas.
- **La performance terrain échoue en labo** sur deux règles éliminatoires : **P1 LCP** 3,06 s sur `/link/` et 4,63 s sur `/concept/` (seuil 2,5 s labo) et **P4 CLS** 0,110-0,246 (seuil 0,1), parce que le corpus entier est sur le chemin du LCP. Aucune mesure sur un vrai Android en 4G.
- **Le hors-ligne n'a jamais été prototypé** : rechargement sans réseau = page blanche sur le prototype ; le service worker reste une amélioration progressive non écrite.
- **Le CPU cumulé d'une invocation `/api/ask` complète** n'est pas mesuré (somme des labos ≈ 5-7 ms p50, p99 à risque).
- **Trois captures manquent** : dashboard « HIT = 0 neuron » côté compteur Workers AI, AI Gateway Logs OFF, Billing « aucun moyen de paiement ».
- **Turnstile** : 13 870 ms et 5 973 ms jusqu'au jeton sur un seul téléphone, réseau public compris ; défi réussi jamais observé (9/9 échecs en automatisation).
- **Le glossaire n'a que 5 cartes** sur les ≥ 30 visées ; les 25 termes suivants sont listés, pas rédigés.
- **Points juridiques ouverts** : qualification de Cloudflare comme hébergeur pour l'option LCEN art. 1-1 II (PROBABLE), licence de réutilisation des textes Désintox, gabarit légal complet des cartes statistiques (média de première diffusion manquant 48/48).
- **Le 7B LoRA** n'a jamais été benché en français sur un jeu complet (budget insuffisant au moment du bench).

---

## 4. Non-objectifs explicites

Ce qui ne sera pas construit, jamais « faute de temps » mais par décision, avec sa raison :

| On ne construira pas | Pourquoi | Réf. |
|---|---|---|
| **Compte, base d'utilisateurs, profil** | Opinions politiques = données sensibles (RGPD art. 9) ; une base militante en 2027 est un risque politique disproportionné | D0.22 |
| **Leaderboard, classement, score de personne** | Zéro éliminatoire de la grille « honteux à partager » | D0.32, D5.3 |
| **Streak serveur, série de jours, push** | Exigent un compte et un serveur ; refusés avant même notation | D0.18, `07-mecaniques.md` §11 |
| **« Match », « % d'accord avec le programme », score d'adhésion** | Mesure d'opinion déguisée ; le seul geste autorisé est « retourner » puis « envoyer » | D0.18, D5.4 |
| **Swipe d'opinion (« d'accord / pas d'accord »)** | Réduit une mesure à un slogan et fabrique une donnée d'opinion ; le swipe de navigation reste toléré, jamais seul ni signifiant | D5.9 |
| **WebGL, Three.js, canvas 3D** | Budget perf et accessibilité ; le bloc 3D de la campagne est réinterprété en CSS, un seul par écran | D3.5, D3.8 |
| **Chat LLM en v1 et en v2** | Le bench v2 tombe sur la latence (p95 4 159 ms) et sur la posture (`liant_kind` 50 %) ; le chat sort en extractif pur, la piste IA est rouverte en v3 sur trois preuves | D0.21, D6.10 |
| **Rétention quotidienne** | Bataille perdue d'avance contre Duolingo et TikTok ; l'usage visé est la **réutilisation ponctuelle en situation d'argumentation** | `07-mecaniques.md` §11, plan §3 |
| **Promotion payante, publicité, sponsoring** | L52-1 à partir du **1er octobre 2026** ; et la clause NC de CC BY-NC-SA converge avec la loi | D0.16, `11-conformite.md` |
| *À rappeler aussi* : bandeau cookies, script tiers, logo LFI ou M27, disclaimer de contenu, nom pour la mascotte, code AGPL, KV en écriture dynamique, mesure du texte des questions | | D0.1, D3.3, D3.11, D7.10 |

---

## 5. Les trois chiffres à connaître

1. **837 propositions extraites, 831 mesures affichées.** Le programme annonce officiellement « 831 mesures » (`intro-p04`). Le corpus compte des blocs HTML : 87 mesures clés + 706 mesures + 44 sous-mesures = 837. Aucune somme ne reproduit 831, la méthode des auteurs n'est pas publiée : l'app **n'affiche que le chiffre officiel**, et 837 n'apparaît que sur la page méthodologie / exactitude, avec la version du corpus (D1.2).
2. **0 € et 10 ms de CPU.** Plan Cloudflare gratuit, aucun moyen de paiement enregistré : un dépassement de quota est un mode dégradé, jamais une facture. Et 10 ms de CPU par invocation, c'est tout le budget de calcul du Worker — d'où la règle unique de l'architecture : **le Worker orchestre, il ne calcule pas**. Tout le reste est pré-généré au build (D0.2, D0.31, D4.1, D7.1).
3. **Aucune phrase du programme n'est rédigée par l'app ; la phrase de liant est calculée par des règles publiées.** *(Formulation corrigée le 10/9/2026, panel rouge T12 : « 0 invention par construction » était un excès de promesse, vrai du texte de programme et faux de l'écran — c'est précisément le genre de phrase qu'un fact-checker démonte en dix minutes.)* Aucun LLM ne tourne à l'exécution (D6.10) : tout texte de programme affiché est un verbatim du corpus pointé par un identifiant `c{N}-s{MM}-…`. Mais l'app émet **six phrases assertives** qui, elles, ne sont pas dans le corpus — « Oui, c'est écrit là : », « Ce n'est pas tout à fait ça. », « Le programme en parle, avec une nuance : », « Rien trouvé avec ces mots. », « L'Avenir en commun ne traite pas de ça. », « Voici ce que le programme dit là-dessus : » — et leur justesse dépend entièrement de la table R0-R6, dont les seuils et la porte de CI sont désormais écrits (`08-ia.md` §7 bis.6, `prompt-final.md` §6). **`/exactitude` publie la table et ses seuils** : c'est ce qui rend la promesse tenable. La promesse ne repose ni sur un prompt ni sur la bonne volonté d'un modèle.

---

## 6. État des livrables

| Fichier | Contenu | Statut |
|---|---|---|
| `docs/discovery/00-resume-executif.md` | Ce document | LIVRÉ |
| `docs/discovery/decisions.md` | **158 décisions datées D0-D13**, chacune avec sa preuve et son impact (mesure : `grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|' docs/discovery/decisions.md`) | LIVRÉ — **les huit arbitrages de l'utilisateur du 10/9 y sont consignés en D13.1 à D13.8** |
| `docs/discovery/01-faits.md` | Registre des faits ajoutés ou requalifiés (URL · statut · implication), y compris plateforme | LIVRÉ |
| `docs/discovery/03-corpus.md` | T1 : pipeline canonique, invariants mesurés, vérification adversariale, dérivés, re-crawl | LIVRÉ |
| `docs/discovery/04-glossaire.md` | T2 : 5 cartes pilotes, FAQ 50 entrées, protocole de relecture, 25 termes suivants | LIVRÉ (partiel : 5 cartes sur ≥ 30 visées) |
| `docs/discovery/05-direction-artistique.md` | T3 : 3 directions maquettées, panel de 6 juges, anatomies, mascotte, registre, bilan du prototype | LIVRÉ |
| `docs/discovery/06-partage.md` | T4 : spike satori, verdict CPU, projection runtime, matrice in-app, aperçus réels | LIVRÉ |
| `docs/discovery/07-mecaniques.md` | T5 : métrique nord, échelle 0-3, 31 idées → red team → MVP, table des routes | LIVRÉ |
| `docs/discovery/08-ia.md` | T6 : contrat de fiabilité, retrieval, bench v1 et v2, porte D6.9, contrat v3 | LIVRÉ |
| `docs/discovery/09-architecture.md` | T7 : 13 ADR, `wrangler.jsonc`, coût, dégradation, carte des journalisations, runbook, revue des labos | LIVRÉ |
| `docs/discovery/10-riposte.md` | T8 : 15 objections, verbatim d'abord, mode marché, carte de partage | LIVRÉ |
| `docs/discovery/11-conformite.md` | T9 : 40 obligations mappées à des écrans, copies exactes, revue « juriste hostile » | LIVRÉ |
| `docs/discovery/12-positionnement-lancement.md` | T10 : audit de 6 produits, nommage, phrase de positionnement, calendrier J-30 → J+30, événements | LIVRÉ |
| `docs/discovery/13-tests-humains.md` | T11 : sessions 1 et 2 par personas-agents, matrices, votes, 19 corrections bloquantes | LIVRÉ — **HYPOTHÈSE (personas)** |
| `docs/discovery/prompt-final.md` | **Livrable n° 1.** Prompt autoportant de plan-mode, **19 sections**, à coller tel quel dans une session Claude Code neuve en plan mode | **LIVRÉ**, révisé par le panel rouge T12 puis par les arbitrages du 10/9. Son **§19 ne bloque plus l'écriture du plan** : plus aucune question d'architecture ni de valeur d'interpolation (§19.1, §19.2, D13.1-D13.8), **sept décisions par défaut à appliquer** pour les arbitrages de produit (§19.3), et **sept gestes d'utilisateur** — identité, politique, argent, exposition juridique — datés et chiffrés en bloc P0, **à valider avant l'exécution et jamais avant la planification** (§19.4) |
| `docs/discovery/17-dry-run-prompt.md` | **Dry run du prompt**, deux rejeux. **Rejeu n° 1 (10/9 au matin, avant les arbitrages) : « non »**, dix questions bloquaient l'écriture du plan (résumé conservé en §10). **Rejeu n° 2 (10/9, après D13.1-D13.8) : « OUI, zéro question bloquante »** — squelette de plan écrit de bout en bout, P0 à P10, 606 h contre 660 h de plancher (§7). Les 2 pointeurs et 13 contradictions qu'il a levés sont **tous corrigés** (§0), et une **passe de clôture** a fermé 10 résidus de propagation et rejoué toutes les mesures (§11). 152 chemins et 63 ancres testés : **tous résolvent**, hors les 15 livrables de la liste close du prompt §16 | LIVRÉ |
| `docs/discovery/02-funnel-personas.md` | Arc 0 s → 10 s → 3 min → partage par persona, sept personas | LIVRÉ — **HYPOTHÈSE (personas)** |
| `docs/discovery/14-risques.md`, `15-backlog-ecarte.md`, `16-hypotheses.md` | Risques (D12.1-D12.8), backlog écarté, registre des HYPOTHÈSES avec méthode de levée | LIVRÉ |
| `docs/discovery/annexe-*.md`, `domaine.md`, `outillage.md`, `testeurs.md`, `perf/` | Reconnaissance brute, plans candidats, verdicts des juges, critique de complétude ; achat et zone du domaine ; outillage ; protocole de test ; 30+ rapports Lighthouse | LIVRÉ |
| `docs/discovery/neurons-log.md` | Registre Workers AI, ligne par appel : 6 713,31 / 8 000 | LIVRÉ |
| `docs/discovery/captures/` | Captures horodatées 2026-09-07, -09, -10 (HTML, en-têtes, PNG, SHA-256) | LIVRÉ |
| `data/aec-2025.json` + `hashes.json`, `expected-invariants.json`, `badge.json` | Corpus canonique complet (142 345 o gzip), empreintes, invariants figés | LIVRÉ |
| `data/glossary.json`, `faq.json`, `riposte.json` | 5 cartes-concept relues, 50 questions routées sans IA, 15 ripostes (6,3 Ko gzip) | LIVRÉ (glossaire partiel) |
| `data/stat-cards.json`, `terms-candidates.json`, `section-tags.json`, `desintox.json`, `livrets-2022.json`, `falc-2022.json`, `LICENSE` | 48 + 6 cartes statistiques, 187 termes, tags, sources d'appoint 2022, CC BY-NC-SA 4.0 | LIVRÉ (licence Désintox à vérifier) |
| `design/tokens.json` v0.2, `contrast-matrix.md`, `fonts/`, `typo/` | Tokens (couleurs, typo, mouvement), 105 paires calculées, 4 woff2 sous-ensemblés | LIVRÉ |
| `design/strings.json` **v0.5 (363 chaînes)**, `voice.md`, `glossary-style-guide.md` | Kit de chaînes au tu, écrans par lien à l'impersonnel, guide de voix. **Contrat d'interpolation clos** : le pseudonyme « Baoleka » et l'URL du dépôt sont écrits en clair, `{organisation}` / `{sponsor}` sont devenus `{pollster}` / `{pollSponsor}` (mentions légales d'un sondage cité par le livre, jamais celles de l'app), et `{contactEmail}` est le **seul** placeholder d'identité, résolu au build | LIVRÉ |
| `design/identity-decision.md`, `illustration-rules.md`, `motion-spec.md`, `perf-budget.md` | Identité tranchée sur captures, 8 règles d'illustration, 3 micro-interactions, budget perf/a11y + mesures du 10/9 | LIVRÉ |
| `eval/questions.json`, `harness.ts`, `retrieval.ts`, `results.md`, `results-v2.md`, `generation-*.json` | 100 questions + 30 hostiles, harnais plafonné, benchs retrieval et génération, verdicts | LIVRÉ |
| `scripts/` (**21 fichiers `.ts`** + fixtures) + `.github/workflows/recrawl.yml` | Ingestion, vérificateur, dérivés, diff, contraste, silence L49, chaînes. **99 tests, tous verts** : glossaire 17, FAQ 10, riposte 13, silence 17, jeu d'évaluation 8, ingestion 7, dérivés 9, chaînes 18. `check-strings` porte désormais le suffixe `.test.ts` : `npx tsx --test scripts/*.test.ts` les prend tous | LIVRÉ |
| `prototypes/spike-share/`, `mockups/{A,B,C,anatomies,finalistes}/`, `proto/`, `labo-plateforme/{ai-gateway,d1-fts5,do-budget,framework,turnstile}/` | Spike de partage, 3 directions maquettées, prototype intégré déployé, 5 labos de plateforme | LIVRÉ |

---

## 7. Par où commencer

0. **Le point d'entrée est `docs/discovery/prompt-final.md`.** C'est le livrable n° 1 : un prompt autoportant, à coller tel quel dans une session Claude Code neuve en plan mode, ouverte à la racine du dépôt `baoleka/cestecritla`. Lis son **§19** en premier — et lis-le pour ce qu'il est devenu le 10/9/2026 : **plus aucune question n'y bloque l'écriture du plan.** Chaque point porte soit le renvoi vers la réponse déjà écrite dans le dossier, soit **la décision par défaut à appliquer** avec sa raison en une ligne ; seuls les **sept gestes du §19.4** — identité, politique, argent, exposition juridique — restent à valider par l'utilisateur, **avant l'exécution et jamais avant la planification**, en bloc P0 daté et chiffré. **Lis ensuite `17-dry-run-prompt.md`** : une session neuve a suivi ce prompt à la lettre, deux fois. Le rejeu n° 1 (avant les arbitrages) répondait « non » ; le **rejeu n° 2, après D13.1-D13.8, répond « OUI »** et produit le squelette de plan complet. **Écris le plan, ne t'arrête pas.**
1. **Lis d'abord** ce résumé, puis `decisions.md` en entier, puis `09-architecture.md` §1-§5 et `13-tests-humains.md` §3.11. Ne rouvre pas une DÉCISION sans raison technique documentée. **Et ne t'arrête pas pour poser une question** : sur tout ce qui n'est pas l'un des sept gestes du §19.4, le dossier porte soit la réponse, soit le défaut à appliquer — applique-le, écris-le dans le plan en une ligne, avance.
2. **Pose le squelette** : Astro 5 statique + **un seul** Worker, `observability.enabled: false`, aucun binding AI en v1 ni v2. Depuis D13.1, il n'y a **ni route serveur, ni base D1, ni cache de questions** : `d1_databases`, `migrations/`, `q_cache` et `/api/ask` sortent du `wrangler.jsonc`. Le `wrangler.jsonc` est esquissé dans `09-architecture.md` §2, la ban list est dans `prompt-final.md` §9.
3. **Rends le build déterministe avant l'interface** : `scripts/ingest.ts` + `verify-corpus.ts` en porte de CI, projection `slim.json` (69 166 o gzip, à ranger dans `scripts/`), index MiniSearch, cartes OG pré-générées à partir de `prototypes/spike-share/src/cards/`. La version du corpus est la clé de tout : cache, PWA, page exactitude.
4. **Construis dans cet ordre** (D5.14) : le **socle** — lecteur de section, recherche locale tolérante, riposte, cartes-concept — puis **« Laquelle est ici ? »** (`/q/`, aucun état), puis **« Tu savais que c'était dedans ? »** en lien nu (**`/defi/<n>/`**, un segment de chemin et **60 tirages figés**, jamais les réponses dans l'URL — D13.4 amende D5.10 : sur Static Assets, `?n=` sert le même HTML pour tous les index et interdit un aperçu par tirage). La « carte des 89 » attend une preuve.
5. **Applique les 19 corrections bloquantes** de `13-tests-humains.md` §3.11 avant tout nouveau test : geste principal ≥ 44 px dans les 600 premiers px, jamais de page blanche hors ligne, jamais une clé brute à la place d'un message, aucun vocabulaire de campagne (« munition », « riposte ») sur un écran atteint par un lien, cibles ≥ 44 px, textes ≥ 12 px, police système à 150 % sans débordement.
6. **Traite la perf comme éliminatoire** : P1 et P4 échouent aujourd'hui. Pré-rends le texte de l'écran 0, sors le corpus du chemin du LCP (découpe par section, chargement après `load`), réserve la hauteur des conteneurs injectés, `modulepreload` de `ui.js`, sous-ensemble italique 900. Puis mesure sur un vrai Android en 4G.
7. **Le chat est extractif** : retrieval local, posture calculée par règles, phrases de `design/strings.json`, refus designé qui n'affirme jamais une absence sur le programme entier. Règle de build : **pas de mention IA sans IA** (D9.15).
8. **Avant la mise en ligne** : `/exactitude`, `/confidentialite`, « À propos » avec un rôle, un contact et des mentions légales, attribution CC sur chaque page et chaque carte, `scripts/silence.ts` câblé (gel vendredi 00:00 → dimanche 20:00 Paris), zéro promotion payante depuis le 1er octobre 2026. **Deux gestes d'utilisateur restent bloquants** : créer la boîte **contact@cestecritla.fr** (Email Routing) — sans elle, `{contactEmail}` ne se résout pas et cinq chaînes légales ne se rendent pas — et **purger l'historique git** (`prompt-final.md` §19.4 point 1 ; critère de done archivé, mesuré à **457** le 10/9, cible **0**).
9. **Avant le lancement** : rejoue le protocole de `testeurs.md` **avec des humains** sur les huit points de `13-tests-humains.md` §3.12. Tant que ce n'est pas fait, tout ce qui vient des personas reste étiqueté HYPOTHÈSE dans le dossier comme dans l'app.
