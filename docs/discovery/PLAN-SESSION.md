# Plan de session de découverte — « C'est écrit là »

> ## ⚠️ ARCHIVE — ce plan a été EXÉCUTÉ du 7 au 10 septembre 2026
>
> **Ce n'est plus le point d'entrée du dépôt et il n'y a rien à y faire.** Les quatre journées ont eu lieu, le dossier de découverte est livré (`docs/discovery/00-resume-executif.md` §6 en donne la table), et les cases non cochées de la fin de ce document sont l'état du **7 septembre**, pas celui d'aujourd'hui. **Ne replanifie aucune de ses tâches T0-T12.**
>
> **Le point d'entrée est `docs/discovery/prompt-final.md`** — le prompt autoportant qui lance la session de **planification d'implémentation**, en plan mode. Puis `00-resume-executif.md`, `decisions.md` (158 décisions, D0-D13), `16-hypotheses.md`, et le dry run `17-dry-run-prompt.md` (verdict **OUI**, zéro question bloquante).
>
> Ce document reste au dépôt parce qu'il dit **comment le dossier a été fabriqué** : c'est une pièce de méthode, pas une liste de travaux.

> **Nom.** Ce plan a été approuvé le 7 septembre 2026 sous le titre de travail « AEC Discover ». L'app s'appelle **« C'est écrit là »** et vit sur **cestecritla.fr** depuis D10.2 (9/9/2026) ; le dépôt s'appelle **`baoleka/cestecritla`** depuis le 10/9/2026. Les occurrences du titre de travail plus bas sont conservées telles quelles : elles datent le document, elles ne nomment plus l'app.

> Ce document est le plan d'une **session de découverte** (4 journées : recherche, deep searches multi-agents, prototypes, maquettes, tests humains, décisions), pas un plan d'implémentation. Sa sortie est un **dossier de découverte versionné dans le dépôt** + un **prompt autoportant** qui lancera une session Claude Code en plan mode pour produire le plan d'implémentation.
>
> Il a été construit par une reconnaissance réelle (5 éclaireurs web), 3 plans concurrents, 3 juges et un critique de complétude. Chaque fait porte un statut : **VÉRIFIÉ** (lu à la source le 7/9/2026), **PROBABLE** (source secondaire ou non reproduit), **HYPOTHÈSE**.

---

## 1. Contexte

**Le besoin.** Construire sur Cloudflare l'application la plus séduisante possible pour faire découvrir *L'Avenir en commun, édition 2025* (programme LFI / Mélenchon 2027, https://melenchon2027.fr/programme2025/livre/) et permettre de poser une question sur n'importe quel terme ou concept du programme. L'utilisateur ne sait pas encore si l'expérience doit être gamifiée, quel design est le bon, quelle stack IA gratuite et française tient la charge. Il veut qu'une session dédiée lève **toutes** ces incertitudes, sur pièces, avant de planifier l'implémentation.

**L'ambition.** Que quiconque arrive sur l'app soit subjugué, comprenne le programme avec plaisir, et ait envie de voter LFI. Le militant est l'utilisateur principal **et** le canal de diffusion : l'app doit lui donner de quoi maîtriser le programme, et des objets légers, partageables, qui accrochent un indécis ou un jeune de 18-30 ans en 30 secondes, sur WhatsApp, sans contexte.

**Ce que la reconnaissance change dans la façon de voir le projet.**
- Le corpus entier tient dans 62 Ko gzippés (~56 000 tokens) : la recherche et la lecture peuvent être **100 % côté client, instantanées, hors-ligne, sans IA**. L'IA n'est qu'une surcouche de profondeur. C'est ce qui rend le 0 € tenable même en cas de viralité.
- Le texte est sous **CC BY-NC-SA 4.0** : réutilisation intégrale autorisée, attribution obligatoire, non-commercial, partage à l'identique des dérivés.
- **Aucun glossaire officiel n'existe** : la fonctionnalité demandée en toutes lettres repose sur du contenu à créer, sourcé et relu. C'est le premier risque de désinformation du projet.
- **LFI construit sa propre app de lecture (aec2027.fr, page d'attente).** L'app doit occuper un terrain complémentaire : comprendre, jouer, partager, riposter, pas relire.
- **Une hallucination = risque existentiel** (arme adverse, référé loi 2018-1202 à 3 mois du scrutin, perte de l'exception « contrôle éditorial » de l'AI Act). L'architecture doit rendre l'invention d'une mesure structurellement impossible.

---

## 2. Décisions déjà prises avec l'utilisateur (7 septembre 2026)

| # | Décision | Conséquence pour la session |
|---|---|---|
| D0.1 | Expérimentation perso, liberté créative totale, **pas de disclaimer politique**, **respect total de la charte graphique** | Distinguer disclaimer de contenu (refusé) / mention IA (obligatoire, art. 50 AI Act) / ligne d'indépendance (protectrice, à valider). Trancher **quelle** charte (LFI vs campagne M27), voir T3. |
| D0.2 | **Coût d'exploitation 0 €** (plan Cloudflare gratuit) | Statique d'abord ; aucun moyen de paiement ; tout dépassement de quota = mode dégradé, jamais facturation. |
| D0.3 | **Toute IA à l'exécution est française : Mistral, hébergé via Workers AI** (Cloudflare). Grok/xAI proscrit. Périmètre : l'IA dans l'app uniquement ; le contenu pré-généré au build (glossaire, FAQ) peut être rédigé avec Claude Code puis relu par l'utilisateur. | Bench limité aux modèles Mistral de Workers AI ; pas d'embeddings à l'exécution (aucun modèle d'embedding français sur Workers AI) → recherche lexicale locale par défaut ; La Plateforme Mistral exclue (opt-in entraînement sur le tier gratuit). |
| D0.4 | Cibles : **militants** (P0, usage principal + relais), **jeunes 18-30** et **indécis/abstentionnistes** (P1, via partage) | Chaque écran doit répondre à « je sors ma munition en 10 s » et « j'envoie ça à mon cousin ». Cas majoritaire : arrivée par lien WhatsApp. |
| D0.5 | Livrables : dossier + **maquettes visuelles (2-3 directions)** + prompt final | Skill `design` (canvas multi-artboards) ; tout ce qui sert au plan-mode doit aussi exister en fichiers dans le dépôt. |
| D0.6 | **4 journées complètes** de session | Séquence en §6 avec coupe minimale et ordre de sacrifice. |
| D0.7 | **Compte Cloudflare gratuit disponible, quota Workers AI consommable (~8 000 neurons)** pendant la session | Labo IA réel (bench Mistral en français, cache AI Gateway, DO, Turnstile, satori). |
| D0.8 | **Testeurs humains disponibles : 3-5 militants et 2-3 non-politisés**, avec téléphones | Deux mini-sessions de test (mi-parcours, fin) rendues **bloquantes** pour la direction artistique et la mécanique d'entrée. |
| D0.9 | Stack : Cloudflare, TypeScript strict, composants fonctionnels, ESLint/Prettier ; projet en français, code et commentaires en anglais | Framework choisi par micro-prototype (React+Vite/Tailwind v4 = stack du plugin LFI, vs Astro). |

---

## 3. Ce que la reconnaissance a établi

### 3.1 Contenu et pipeline

| Fait | Statut | Implication |
|---|---|---|
| Le livre est un custom post type WordPress `lfi_programme_2025`, **non exposé en REST** (404/401). Le flux RSS `/feed/?post_type=lfi_programme_2025&paged=N` (21 pages) renvoie le HTML complet, mais avec ~82 doublons sous URLs alias. Les URLs `/chapitreN/sM/` ne sont **pas hiérarchiques** (slug `sM` résolu globalement : 225 pages « 200 OK » dupliquées). | VÉRIFIÉ | Ingestion canonique **uniquement** : 18 pages chapitre → `nav.tdm` → sections. Jamais de force brute d'URL, jamais le RSS seul. |
| Comptage par le pipeline de l'éclaireur : 1 intro, 4 parties, 18 chapitres, **89 sections**, 87 `div.mesure-cle` + 706 `div.mesure` + 44 `div.sous-mesure` = **837 propositions**, **48 encadrés « À savoir »** (`div.chiffre`), 109 paragraphes. Officiel : « 831 mesures » (143 ajoutées, 120 précisées). JSON complet : 201 Ko brut, **62 Ko gzippé**, ~56 000 tokens. | PROBABLE (à reproduire en session avant tout usage dans maquettes/prompt) | Le corpus tient côté client. Règle de comptage 831/837 à documenter. |
| HTML sémantique propre : `main.section > h1.section + nav.ariane + nav.tdm + section.contenu (p.wp-block-paragraph em, div.mesure-cle, div.mesure, div.sous-mesure) + section.chiffres div.chiffre`. Les `div.mesure` sont du texte pur. | VÉRIFIÉ (ch. 12 s1, ch. 1 s6) | Parsing par sélecteurs, typage TypeScript strict. Fixtures : `/chapitre12/s1/` (complet), `/chapitre1/s6/` (sous-mesures). |
| Pas de `Last-Modified`/`ETag`, `If-Modified-Since` → 200. Tous les items datés janvier 2025. | VÉRIFIÉ | Fraîcheur par SHA-256 par section, re-crawl hebdo **hors Worker** (GitHub Actions). |
| **Aucun glossaire/lexique officiel.** Fréquences : bifurcation écologique 28, constituante ~34, SMIC 19, planification écologique 13, pôle public 11, 6e République 9, règle verte 7… | VÉRIFIÉ | Glossaire à créer, sourcé, relu, figé. Sources d'appoint LFI : 41 livrets + 13 plans 2022 (`wp/v2/pages`, accessibles en REST), FALC 2022 (`/laec-falc/` : 22 chapitres 2022, chiffres périmés → registre oui, contenu non). |
| Désintox : `desintox.lafranceinsoumise.fr/wp-json/wp/v2/` ouvert, catégorie « Idées reçues » id 19 = **26 posts**. | VÉRIFIÉ | Matière première du mode Riposte. |
| **aec2027.fr** : domaine officiel LFI, page d'attente « les tortues sagaces sont en train de travailler », illustration créditée Hello Melro, theme-color #8B24D9, Montserrat, robots.txt Crawl-delay 60. | VÉRIFIÉ | Risque de redondance ; positionnement complémentaire obligatoire ; veille à chaque étape. |
| Prior art : **laec.fr** (édition 2022, 86 mesures, une URL par mesure, 21 visuels faits main, Django) ; **avenir-en-commun.net** (refonte non officielle 2026, simulateur IA en 4 écrans, front Cloudflare Pages + backend Render qui s'endort). Aucun dataset JSON de l'AEC 2025 n'existe (56 dépôts GitHub LFI, rien sur le programme). | VÉRIFIÉ | Le dataset produit sera le premier du genre (option : l'offrir à l'équipe aec2027.fr). |

### 3.2 Plateforme Cloudflare, plan gratuit (chiffres à citer tels quels dans le prompt final)

| Brique | Limite vérifiée | Conséquence |
|---|---|---|
| Worker | 100 000 req/jour, **10 ms CPU**/requête, **50 sous-requêtes**/requête, **3 MB compressé** (l'éclaireur avait dit 64 MiB : faux), 5 Cron Triggers | Le Worker orchestre, il ne calcule pas. Ingestion (107 requêtes) et re-crawl **hors Worker**. satori+resvg+polices en runtime : à mesurer contre 3 MB (probablement → OG pré-générées au build). |
| Static Assets | **Gratuits et illimités**, hors quota ; 20 000 fichiers/version, 25 MiB/fichier ; `run_worker_first` | Tout ce qui est pré-généré (corpus, index, glossaire, cartes OG ≈ 2 900 fichiers) est servi gratuitement. Une seule route API. |
| Workers AI | **10 000 neurons/jour**, reset 00:00 UTC. Mistral Small 3.1 24B : 31 876 in / 50 488 out neurons par M tokens (≈ 32 neurons/question avec présélection lexicale de ~850 tokens → **~300 questions/jour**). Mistral 7B v0.1/v0.2 : tarif à lire. JSON mode **non supporté** par Mistral Small (liste restreinte) ; function calling oui ; 300 req/min. Cloudflare n'entraîne pas sur les données. | Cache et pré-génération obligatoires. Validation post-hoc plutôt que JSON mode. Pas d'embedding français sur Workers AI → lexical local. |
| KV | 100 000 lectures/jour mais **1 000 écritures/jour** | Lecture seule (assets chauds, flags). Jamais comme cache dynamique. |
| D1 | 5 M lectures, **100 000 écritures/jour**, 5 Go ; FTS5 à vérifier | Cache Q/R (question normalisée hashée, jamais le texte brut). |
| Durable Objects | Disponibles sur Free (SQLite), 100 000 req/jour | Compteur global journalier de neurons (arrêt à 85 %). |
| Rate limiting binding | Période 10 ou 60 s, **par datacenter** | Anti-rafale seulement ; quota journalier via DO. |
| Turnstile | Illimité, branding Cloudflare imposé, **utilise cookies/localStorage** | « Zéro cookie » à requalifier : traceurs strictement nécessaires, exemptés mais déclarés. |
| AI Gateway | Cache gratuit, match exact (SHA-256 du corps), TTL max 1 mois, pas de cache sémantique ; **logs activés par défaut avec prompt et réponse** (100 000 sur Free) ; effet d'un HIT sur les neurons : doc muette | `cf-aig-collect-log: false` **avant le premier appel**. Normalisation agressive des questions. Test empirique HIT vs neurons. |
| Vectorize / AI Search | Vectorize : 5 M dims stockées, 30 M interrogées/mois. AI Search (ex-AutoRAG) gratuit en beta, 20 000 req/mois | Non nécessaires a priori (corpus minuscule, pas d'embedding français). Options de secours. |
| Analytics | Cloudflare Web Analytics sans cookie (script tiers) ; Analytics Engine 100 000 points/jour | Mesure sans identifiant. |
| Bot Fight Mode | Peut bloquer les crawlers d'aperçu WhatsApp/Facebook | Tester les aperçus sur le **domaine final**, réglages bot documentés. |

### 3.3 Charte graphique et identité

| Fait | Statut | Implication |
|---|---|---|
| Charte LFI officielle (https://lafranceinsoumise.fr/charte-graphique/) : « Couleurs 2027 » **Violet #4C0297, Rouge #D1271C, Crème #FFFCF4, Charbon #212320** ; typographie Config (commerciale, Adam Ladd) avec **substituts gratuits explicitement autorisés : Public Sans (titres) + Gowun Batang (corps)** ; seconde palette « Web (HEX) » de 6 vives (#7b13d6, #f91616, #3885f4, #ed5fb1, #f9c900, #2e9959) dont la hiérarchie n'est pas dite ; logos réservés aux insoumis·es, interdiction d'« engager le mouvement » ; pack Logos-LFI.zip. | VÉRIFIÉ | Tokens racine = 4 couleurs 2027 (indice : LogoTortue.svg n'utilise que celles-ci). Hiérarchie des palettes à trancher **sur capture d'écran**. |
| Contrastes sur Crème : Charbon 15,4:1, Violet 11,6:1, Rouge #D1271C 5,1:1 (AA) ; **5 des 6 vives échouent AA** en texte courant (Jaune 1,5:1) ; sur Charbon, les vives passent (Jaune 10:1). Violet #4C0297 sur Charbon illisible. | VÉRIFIÉ (calculé) | Vives = aplats et grands titres ; « story mode Charbon » comme territoire des vives. Contraste calculé par script, éliminatoire avant maquettes. |
| Le site melenchon2027.fr sert en `@font-face` **Union Gothic** et **Stack Sans** (commerciales, `/wp-content/uploads/2026/04/`) ; aec2027.fr utilise Montserrat et #8B24D9 ; la charte LFI ne mentionne ni la campagne ni la tortue. | VÉRIFIÉ | **« Charte LFI » ≠ forcément « identité Mélenchon 2027 »** : à trancher en T3 avant tout token. Ne jamais rehéberger Union Gothic/Stack Sans. |
| Piège : l'ancienne identité 2016-2022 (bleu #0098B6/#0e8a9c, ocre #C9462C, Montserrat, Roboto Slab, Φ) est mieux référencée et encore véhiculée par le guide Action Populaire. | VÉRIFIÉ | Ban list nominative dans le prompt final. |
| Tortue = totem officiel 2027 (fable de La Fontaine, lait-fraise, pixel art sur affiches) ; **illustration protégée** (crédit Hello Melro), non couverte par la CC (textes seulement) ; LogoTortue.svg embarque un PNG 1920² ; LOGO-M27.svg donne des teintes #E5CBFF/#FDEDFF/#FFD2CF ; 5 affiches T27 en haute résolution. Pas de nom officiel de la tortue. | VÉRIFIÉ | Mascotte de l'app = **création originale** ou pas de mascotte (décision utilisateur). Règles d'illustration à déduire des affiches. Gowun Batang : 2 graisses, 11 172 Hangeul → sous-ensemble latin obligatoire. |
| Formats sociaux du guide militant : 1080×1080, 1080×1920, 800×800 « universel », 1200×630 OG. | VÉRIFIÉ | Gabarits du kit de partage. |

### 3.4 Cadre légal et calendrier

| Fait | Statut | Implication |
|---|---|---|
| Mentions légales melenchon2027.fr : textes sous **CC BY-NC-SA 4.0** ; éditeur LFI (association), directeur de publication Maxime Charpentier. CC 4.0 couvre les droits sui generis de base de données ; robots.txt n'interdit que /wp-admin/. | VÉRIFIÉ | Attribution « La France insoumise – L'Avenir en commun » + liens ; aucune monétisation ni don au développeur ; dérivés (glossaire, reformulations, cartes) en CC BY-NC-SA ; code séparé sous licence libre. Archiver une capture horodatée. |
| **AI Act art. 50 applicable depuis le 2/8/2026** : informer qu'on parle à une IA, clairement, dès la première interaction ; textes générés d'intérêt public à divulguer sauf contrôle éditorial humain. | VÉRIFIÉ | Mention IA intégrée au design (≠ disclaimer politique). Le contenu pré-validé plaide l'exception « contrôle éditorial ». |
| Présidentielle : **1er tour dimanche 18 avril, 2e tour dimanche 2 mai 2027** (Conseil des ministres du 1/7/2026) ; vote le samedi dans certains territoires. Inscription électorale : début mars 2027 (à vérifier). | PROBABLE (presse convergente ; figer sur le décret de convocation) | **L52-1 : zéro promotion payante à partir du 1er octobre 2026.** **L49 : gel de la propagande électronique la veille et le jour** (bornes conservatrices : vendredi 00:00 Paris → clôture) → feature flag « silence électoral » avec test unitaire de dates. |
| **Loi 77-808 (sondages)** : mentions obligatoires (organisme, dates, commanditaire, média de première diffusion), interdiction de publication la veille et le jour du scrutin (diffusion continue tolérée avec mentions). Les 48 « À savoir » sont des sondages **2020-2021** (Harris, YouGov). | VÉRIFIÉ | Gabarit légal des StatCards ; « Devine le % » rattaché au flag silence ; évaluer l'attaque « sondages vieux de 6 ans » avant d'en faire l'écran 0. |
| RGPD art. 9 : une question politique rattachable à une personne = donnée sensible (fiche CNIL chatbots). CNIL : mesure d'audience exemptée de consentement si sans recoupement ni tiers. Cloudflare : DPA + DPF ; localisation UE hors plan gratuit. | VÉRIFIÉ | **Zéro compte, zéro base d'utilisateurs, zéro log rattachable**, état en URL/localStorage, analytics agrégés. Pas de bandeau si aucun traceur non nécessaire. |
| Compte de campagne : une dépense de tiers n'est réintégrée que si engagée au profit direct du candidat **et avec son accord** ; bénévolat ponctuel = pas d'avantage en nature. | VÉRIFIÉ (CC 2022) | Ne pas solliciter d'accord formel de la campagne ; coût 0 € documenté. |
| Loi 2018-1202 : référé contre la diffusion automatisée et massive d'allégations inexactes dans les 3 mois précédant le scrutin. CNCCEP 2027 installée fin 2026, première présidentielle avec IA générative. | VÉRIFIÉ / PROBABLE | Anti-hallucination = obligation, pas préférence. Wording du chat modifiable via KV sans redéploiement. Veille cnccep.fr décembre 2026. |
| LCEN : mentions légales obligatoires ; anonymat via l'hébergeur réservé à l'éditeur non professionnel à portée limitée (fragile pour une app virale). INPI : dépôts LFI probables ; l'usage non commercial et informatif échappe à la contrefaçon ; le vrai risque est réputationnel. | VÉRIFIÉ / PROBABLE | Option d'identité à choisir ; nom et wordmark propres à l'app, jamais le logo M27 comme marque. |
| Fuite Action Populaire (mai 2026, ~120 000 e-mails, 20 000 téléphones). | PROBABLE (frenchbreaches.com) | Argument d'architecture zéro-donnée ; ne pas l'afficher dans l'app comme fait. |

### 3.5 Prior art et leçons

| Référence | Leçon retenue |
|---|---|
| **Elyze** (2022, 2 M téléchargements en 3 mois ; discréditée en 3 semaines : score opaque biaisé, propositions modifiables, collecte de données liées aux opinions ; Mélenchon a dénoncé « un coup tordu ») | Publier la méthode de tout calcul, contenu figé et hashé, zéro collecte. Avec un seul programme, le « match » est mort-né : ressorts = **surprise** et **personnalisation**, jamais « d'accord / pas d'accord ». |
| **Wahl-O-Mat** (26 M d'usages 2025, 38 thèses, skip, pondération ×2, thèses co-conçues avec des 18-26 ans) ; études VAA : effet robuste = **« donner envie d'aller lire »** (> 50 % font des recherches ensuite), ~1 % de changement de vote réel | ~30-38 items max, skip explicite. **Métrique nord = passage d'un moment ludique/chat vers la lecture d'une section.** |
| **NYT dialect quiz** (contenu n° 1 du NYT 2013) ; PolitiScales (viral FR, partagé par capture d'écran) | Résultat = **image personnelle**, curiosity gap, données crédibles derrière ; fournir l'artefact de partage plutôt que laisser screenshoter. |
| **laec.fr** (une URL par mesure, 21 visuels faits main sur 86) | Atome de partage = la mesure ; générer une carte pour chacune des 837 = avantage immédiat. |
| **Arc XP « Ask The News »**, HBR « Ask AI » ; AlgorithmWatch : **30 % de réponses fausses** de Copilot en contexte électoral ; Reuters : 4 % cliquent vers la source depuis un chatbot | RAG strictement borné, citation verbatim **en ligne** dans la réponse, **refus assumé et designé**. |
| **Kinnu** (Orbs + Knowledge Bank), Pudding (macro → micro), Nicky Case (explorables manipulables, domaine public) | Section AEC ≈ un Orb ; 2-3 concepts rendus manipulables suffisent au « wow » ; progression locale non anxiogène. |
| Duolingo (streaks, ligues, push exigent compte + serveur) ; médiane 70 % d'abandon à 100 jours | Pas de rétention quotidienne : **réutilisation ponctuelle en situation d'argumentation** ; défis par lien (état dans l'URL, façon Wordle). |
| Awwwards T1 2026 : les 6 gagnants sans WebGL sont des expériences typographiques ; critère = direction artistique + motion dirigé + 60 fps sur mobile moyen | Le « sexy » = typographie, motion dirigé, DA ; **zéro WebGL/Three.js**. |
| Cahier de vacances LFI 2025/2026 (test « quelle figure historique ») | La ludification est déjà validée culturellement en interne ; borne de ton. |
| satori + resvg-wasm sur Workers (PNG/JPEG seulement, ~1 s à froid, ~50 ms en cache) | Faisable ; taille du Worker (3 MB) à mesurer → probablement build-time. |
| Distribution : les 18-24 voient ~58 % de contenu politique de droite en plus sur TikTok/IG/X (source primaire non consultée) | PROBABLE. Miser sur le **dark social** (WhatsApp/Telegram) ; à confirmer avec de vrais militants. |

---

## 4. Principes directeurs de la session

1. **Décider sur pièces.** Aucune décision structurante (identité, direction artistique, mécanique d'entrée, niveau de gamification, architecture IA) sans : maquette ou prototype **avec le vrai contenu** (chapitre 12 s1, règle verte) + grille de score par panel de juges + **test humain**. Sinon, étiquette HYPOTHÈSE.
2. **Verbatim d'abord, magie ensuite.** Le LLM ne rédige jamais une mesure : il sélectionne des identifiants, l'app affiche le texte depuis le JSON local. Objectif chiffré : 0 mesure inventée sur le jeu adversarial.
3. **Statique d'abord, IA en surcouche.** Recherche, lecture, glossaire, cartes, riposte fonctionnent sans serveur ni quota. Le mode dégradé est un mode normal, designé, jamais un message d'erreur.
4. **Deux atomes.** Le **concept** est l'atome de la compréhension (carte-concept) ; la **mesure** est l'atome du partage (ID stable, URL, image). Section et chapitre sont des conteneurs de progression.
5. **Trois budgets de temps** : wow < 10 s, premier « aha » < 3 min, partage en 1 geste. Chaque écran a une variante « arrivée par lien sans contexte ».
6. **Le militant est le héros de la boucle** : chaque fonctionnalité lui fait gagner du temps sur le terrain ou lui donne un objet à envoyer.
7. **Surprise > accord.** Jamais de « match », de score d'adhésion agrégé public, ni de geste principal « pas d'accord avec LFI ». Méthode de tout calcul publiée.
8. **Zéro compte, zéro base, zéro log rattachable.** Promesse affichée. Carte des journalisations involontaires tenue à jour.
9. **Charte stricte sur ce qu'elle dit, liberté sur ce qu'elle ne dit pas**, après avoir tranché *quelle* charte. Ban list de l'ancienne identité.
10. **Le niveau 0 de gamification (lecture augmentée + partage, sans jeu) est un résultat légitime** de la session, pas un échec.
11. **Le prompt final est le livrable n° 1** : son squelette est créé à J0 et rempli à chaque étape. Le plan-mode ne lit ni canvas ni Artifact : tout ce qu'il doit lire vit en fichiers dans le dépôt.
12. Chaque fait porte une URL et un statut ; les chiffres de free tiers tiers ne sont jamais retenus sans lecture en console ; toute vérification visuelle passe par un navigateur réel (skill `claude-in-chrome`, fallback `curl` + lecture d'images), jamais par WebFetch qui aplatit HTML et CSS.

---

## 5. Pistes de recherche

Format : **question centrale** · sous-questions · méthode (outils, pattern de workflow, URLs) · livrable · critère de sortie. P0 sauf mention.

### T0 — Cadrage, outillage, squelettes (J0, ~2 h)
**Q : Quelles décisions seul l'utilisateur peut prendre, et l'outillage marche-t-il ?**
- Une seule salve `AskUserQuestion` (liste en §10) : identité LFI vs M27 et accès à un kit interne, mascotte originale vs aucune, nom/domaine (`*.workers.dev` vs `.fr`), ligne d'indépendance, tu/vous, mentions légales, CTA autorisés (inscription listes, collecte officielle, Action Populaire), niveau de gamification visé a priori, dark mode/desktop, journalisation anonyme des questions sans réponse, silence électoral (gel partiel vs fermeture), contingence retrait/désaveu (rebrand vs fermeture), offrir le dataset à aec2027.fr, heures/semaine jusqu'en mai 2027 et qui relit, chat en v1 ou v1 100 % statique.
- **Smoke test outillage** (10 × 2 min) : `claude-in-chrome` opérationnel ; le skill `design` rend-il Public Sans/Gowun Batang (sinon export PNG depuis un Artifact HTML) ; `curl` sur melenchon2027.fr ; `wrangler login` ; absence de moyen de paiement et quota neurons ; `cf-aig-collect-log` désactivable ; skills chargés (`cloudflare`, `wrangler`, `durable-objects`, `workers-best-practices`, `turnstile-spin`, `web-perf`, `security-review`, `design`).
- Créer le dépôt (`git init` dans `<repo>`), `docs/discovery/decisions.md`, `docs/discovery/prompt-final.md` (squelette §8), `docs/discovery/neurons-log.md`, captures horodatées des mentions légales et d'aec2027.fr.
- **Lancer le recrutement des testeurs dès J0** (délai de plusieurs jours) : créneaux mi-parcours (fin J2) et fin (J4).
- Livrable : `decisions.md` avec ≥ 15 décisions D0.x datées ; checklist outillage cochée.
- Sortie : aucune piste suivante ne dépend d'une hypothèse non validée par l'utilisateur.

### T1 — Corpus canonique et modèle de données
**Q : Comment produire, en session, le JSON exhaustif et fidèle du livre 2025, avec identifiants stables, et le prouver ?**
- Reproduire l'algorithme canonique (18 pages chapitre → `nav.tdm` → sections), User-Agent identifiable, concurrence ≤ 4, un seul passage ; assertions d'invariants (18 chapitres, 89 sections, ~837 propositions, 48 encadrés) avec **échec bruyant** ; recoupement RSS dédupliqué ; **vérification mot à mot de 10 sections tirées au hasard par un second agent** (adversarial verify).
- Schéma d'ID : `c12-s01-k01` / `-m03` / `-m03.s1` + SHA-256 du texte normalisé ; règle de comptage 831/837 écrite ; TypeScript strict (cas limites : 2 sections sans mesure-clé, 52 sans « À savoir », 14 multi-paragraphes, 4 avec sous-mesures).
- Inventaire des 48 « À savoir » (texte, %, institut, date) ; termes candidats par fréquence + rareté ; livrets/plans 2022 en fichier séparé marqué 2022 (`wp/v2/pages?per_page=100`) ; désintox 26 idées reçues (`categories=19`) ; tags « situation de vie / thème terrain » attribués au build, 10 % relus.
- Ingestion et re-crawl **hors Worker** : script TypeScript + GitHub Actions hebdo (dépôt public) → PR de diff + badge « à jour au ». Mapping FALC 2022 → 2025 pour repérer les passages inchangés.
- Pattern : multi-modal sweep (4 agents : ingestion+invariants, désintox, termes/livrets 2022, À savoir/tags) puis vérification adversariale.
- Livrable : `data/aec-2025.json`, `data/hashes.json`, `data/livrets-2022.json`, `data/desintox.json`, `data/terms-candidates.json`, `data/stat-cards.json`, `scripts/ingest.ts`, rapport d'invariants, `docs/discovery/03-corpus.md`.
- Sortie : invariants **mesurés** ; 0 doublon ; 10 sections identiques mot à mot ; gzip ≤ 80 Ko ; schéma d'ID adopté. Tant que ce n'est pas fait, aucun chiffre (831, 837, 48) n'entre dans une maquette.

### T2 — Cartes-concept, glossaire et couches de lecture (cœur de la demande)
**Q : Comment créer 40-60 cartes-concept dont chaque phrase est traçable à un passage LFI, relue, jamais générée à la volée, et qui produit un « aha » mesurable ?**
- Schéma JSON de la carte : `one_liner` (registre FALC, ≤ 15 mots/phrase), `why_it_matters`, `verbatim[]` (IDs de mesures), `related_measures`, `objection` (désintox), `related_terms`, `sources` datées, `review_status`, `readability_score`.
- 5 pilotes : règle verte, bifurcation écologique, 6e République/constituante, planification écologique, écocide.
- Workflow **Rédacteur (n'utilise que les passages fournis) → Vérificateur adversarial (rejette toute affirmation non couverte) → Éditeur (registre, longueur mobile)** ; juge « Yanis, 22 ans » doit réexpliquer le terme en < 60 s ; fact-checker refuse toute phrase non étiquetée verbatim/reformulé ; **≥ 1 non-politisé réexplique 5/5** lors du test humain.
- Règles de lisibilité codées en test (phrases ≤ 15 mots, une idée par phrase, pas de double négation, tout chiffre doit exister dans `aec-2025.json`) ; entrées sans source LFI affichées différemment (« rédigé par nous, relu par belo »).
- 3 anatomies maquettées (dense / progressive / explorable) sur la règle verte ; règle typographique **« le verbatim a sa propre typographie »** (Gowun Batang sur Crème, filet Violet) vs voix de l'app (Public Sans) vs liant IA.
- FAQ pré-générée (50 Q/R au départ, routables sans LLM) ; alias (accents, pluriels, sigles) pour le routage lexical.
- Charge de relecture de l'utilisateur estimée et planifiée (30 termes pilotes, FAQ 50, ripostes 15 au départ).
- Livrable : `data/glossary.json` v0, `data/faq.json` v0, guide de style, `docs/discovery/04-glossaire.md`.
- Sortie : ≥ 30 entrées 100 % sourcées ; 0 affirmation non couverte ; couverture ≥ 80 % de 50 questions de terme ; décision « glossaire figé au build ».

### T3 — Identité vérifiée, tokens et direction artistique (sur pièces)
**Q : Quelle est l'identité 2027 réelle, comment la traduire en tokens et polices libres, et quelle direction rend l'app premium sans trahir la charte ?**
- **Trancher d'abord « quelle charte »** : `claude-in-chrome` sur melenchon2027.fr et aec2027.fr (`getComputedStyle(body).fontFamily`, `document.fonts`, theme-color), capture de la charte LFI (hiérarchie des deux palettes), des 5 affiches T27, LOGO-M27.svg, LogoTortue.svg, inventaire de Logos-LFI.zip. Matrice « LFI vs M27 vs AEC » → décision utilisateur « on suit X, on emprunte Y » **avant tout token**.
- Tokens : 4 couleurs 2027 + teintes secondaires (#FDEDFF, #E5CBFF, #FFD2CF) + 6 vives avec règles d'usage ; **matrice de contraste calculée par script** (éliminatoire) ; dark mode système décidé ; Public Sans variable + Gowun Batang **sous-ensemblées latin (< 100 Ko chacune)** ; échantillon typographique FR rendu (paragraphe verbatim ch. 12 s1, 16-18 px sur #FFFCF4) → verdict Gowun Batang en corps ou réservée au verbatim.
- Règles d'illustration (5-8) déduites des affiches ; **mascotte originale** ou aucune (jamais dérivée de l'illustration Hello Melro / LogoTortue.svg) ; textes courts obligatoires rédigés **avant** le canvas (mention IA art. 50, attribution CC, gabarit sondages, ligne d'indépendance) car ils occupent des pixels.
- **Budget de performance figé avant les maquettes** : LCP < 2 s en 4G réelle, JS initial < 100 Ko gzip, CLS < 0,1, INP < 200 ms, 60 fps CPU ×4, `prefers-reduced-motion`, WCAG 2.2 AA (cibles ≥ 24 px, alternative clavier au swipe), taille de police système respectée ; matrice appareils/navigateurs incluant **in-app** (WhatsApp iOS/Android, Instagram, TikTok, Messenger, Telegram).
- **Grand canvas** (skill `design`) : 3 directions — A éditorial-typographique (Pudding), B ludique-cartes/mascotte (Wahl-O-Mat, Duolingo), C immersif « 4 mondes » (une couleur vive par partie, sur Crème/Charbon) — × 5 écrans identiques à contenu réel : accueil (variante arrivée par lien), carte-concept règle verte, section ch. 12 s1, réponse + refus du chat avec mention IA, story 1080×1920. Scoring pondéré : fidélité charte ×3 (éliminatoire), contraste AA ×2 (éliminatoire), envie d'envoyer sur WhatsApp ×3, lisibilité 360 px ×2, risque de perception frivole ×2, « n'apporte rien vs l'officiel » ×2, coût d'implémentation ×1. Panel de 6 juges (Camille militante pressée, Yanis 22 ans, Martine indécise méfiante, militant sceptique 45 ans avec critère éliminatoire « honte à partager », auditeur charte connaissant l'ancienne identité, adversaire chasseur de captures) + critique « ça sent le faux / propagande / frivole ». Agrégation par médiane. L'utilisateur voit le canvas et consigne ses préférences (une voix parmi d'autres jusqu'au test humain).
- Motion : benchmark Stripe/Linear/Arc/Duolingo/Pudding observé au navigateur ; motion spec (élément, déclencheur, durée ≤ 320 ms, easing, sens narratif, fallback) ; 3 micro-prototypes (reveal de citation, transition concept → section, swipe) tracés CPU ×4 avec `web-perf`. Ton de voix : guide 10 règles, kit ≥ 30 chaînes (accueil, refus, dégradé, mention IA, partage, silence), tu/vous testé.
- Livrable : `design/identity-decision.md` (captures), `design/tokens.json`, `design/contrast-matrix.md`, `design/illustration-rules.md`, `design/motion-spec.md`, `design/voice.md` + `design/strings.json`, canvas publié + exports PNG dans `design/canvas/`, `docs/discovery/05-direction-artistique.md`.
- Sortie : identité tranchée par capture ; 100 % des paires texte ≥ 4,5:1 ; une direction (ou hybride explicite) retenue par score **et confirmée au test humain de mi-parcours** ; aucune violation éliminatoire.

### T4 — Partage et canal dark social (spike réel, avant la direction artistique)
**Q : Quel artefact rend réellement bien sur WhatsApp/Telegram/Stories, fait cliquer, et comment le générer à 0 € ?**
- Spike à J2 matin : Worker jetable + satori/resvg (PNG) avec tokens provisoires ; 5 cartes (mesure, À savoir, résultat, riposte, progression) × 3 ratios (1200×630, 1080×1080, 1080×1920) ; **mesurer la taille du Worker (limite 3 MB) et le CPU** → décision build-time (≈ 2 900 fichiers statiques) vs runtime.
- L'utilisateur envoie les liens dans de **vrais groupes WhatsApp/Telegram** et une Story depuis Android et iPhone ; captures d'aperçu sur ≥ 3 messageries × 2 OS **sur le domaine final** (zone Cloudflare, réglages Bot Fight Mode documentés) ; og:image < 300 Ko, une seule balise `og:image`, zone sûre centrale.
- Matrice in-app mesurée sur 2 téléphones : `navigator.share` avec fichiers, localStorage persistant, service worker/PWA, View Transitions. Règle : **l'app est complète sans Web Share ni service worker.**
- Schéma d'URL courtes (`/m/c12-s01-m03`, `/c/regle-verte`, `/q/<date>`, `/defi/<état encodé>`) ; attribution CC + institut/date sur chaque carte ; 3 messages pré-rédigés (cousin, collègue, parent) ; positionnement, nom et wordmark décidés **avant** le kit (ils figurent sur chaque carte).
- SEO gratuit : 30 requêtes cibles (« c'est quoi la règle verte », « programme Mélenchon X »), pré-rendu des pages terme/mesure avec JSON-LD `DefinedTerm`, `rel=canonical` vers la section officielle pour le verbatim, décision « SEO oui/non, pour quelles pages ».
- Livrable : `docs/discovery/06-partage.md` (captures, matrice in-app, spec des 5 objets, ADR OG build vs runtime), `design/share-kit/`.
- Sortie : aperçus corrects prouvés ; taille du Worker mesurée ; décision de génération actée ; plan de lancement organique J-30 → J+30 (zéro payant) esquissé.

### T5 — Arc émotionnel, mécaniques d'entrée et niveau de gamification
**Q : Faut-il gamifier, à quel niveau, et quelle mécanique d'entrée déclenche le plus vite « wow » puis « aha » chez 3 personas sans jamais infantiliser ni se retourner contre la cause ?**
- Définir **avant** le brainstorm : métrique nord (part des sessions arrivées par lien qui atteignent un verbatim de section ; secondaire : passage ludique/chat → lecture), et l'**échelle à 4 niveaux** : 0 lecture augmentée + partage ; 1 progression et retours visuels ; 2 quiz ponctuels ; 3 défis sociaux par lien. Un prototype minimal par niveau, mêmes tests.
- Brainstorm à 5 lentilles → ≥ 20 fiches → **grille utile vs gadget** (sert la métrique nord ; sans compte/serveur ; verbatim ≤ 1 tap ; résiste au retournement ; ≤ 2 j de dev et 0 €), notée 0-2, seuil 7/10, zéros éliminatoires → **red team** (militant RN, fact-checker, juriste CNIL, chasseur de captures) → top 6, dont 2 finalistes entrent au canvas.
- 4 entrées candidates reformulées « surprise > accord » : « Tu savais que c'était dedans ? », « 3 idées pour toi » (situation de vie en 3 taps, table statique publiée), « Devine le % » (48 À savoir, curseur, grille d'emojis sans spoiler ; **sous réserve du contrôle loi sondages et du juge « capture hostile 2021 »**), « Un concept en 20 secondes » (explorable manipulable façon Nicky Case). Chacune × 5 artboards (écran 0, 10 s, aha, résultat, carte) + variante arrivée par lien.
- Refus explicites : compte, leaderboard, streak serveur, push, match, score d'adhésion agrégé public, « d'accord / pas d'accord ». Candidats sans serveur : progression tortue en localStorage, carnet « Mon AEC en 10 mesures » (état dans l'URL), mesure/concept du jour déterministe, défi par lien, duel par lien (DO en P2 sur preuve).
- Livrable : `docs/discovery/07-mecaniques.md` (matrice scorée, fiches top 6, gadgets écartés avec raison, verdict motivé sur le swipe), prototypes cliquables (Artifacts) des 2 finalistes avec 12 vraies mesures et 5 À savoir.
- Sortie : **niveau de gamification décidé (0-3) avec preuve de test humain** ; MVP ≤ 3 mécaniques ; méthode de tout calcul publiée.

### T6 — Contrat IA « ne jamais inventer », retrieval et bench Mistral
**Q : Quelle architecture garantit des réponses exactes, citées, jamais inventées, en français impeccable, avec Mistral sur Workers AI à ≤ 10 000 neurons/jour, et comment le prouver publiquement ?**
- **Jeu d'évaluation versionné** : 100 questions étiquetées (50 dorées avec IDs attendus, 20 glossaire, 30 adversariales : mesures absentes — PMA, corrida, sortie de l'euro —, jargon adverse, injection) + 30 prompts hostiles ; produit par un panel multi-persona (militant, jeune, indécis, fact-checker) et validé par un juge.
- **Retrieval** : A = lexical côté client (MiniSearch/FlexSearch, normalisation FR, synonymes du glossaire, unité = proposition enrichie d'un préfixe non affiché chapitre/section/chapeau vs section) ; C = chapitre entier (~3 000 tokens) en contexte après routage lexical ; B' = embeddings **pré-calculés au build** (autorisé : build-time) pour les « mesures liées » et la similarité, **sans aucun appel d'embedding à l'exécution** (aucun modèle d'embedding français sur Workers AI). Règle : **la variante la plus simple atteignant rappel@5 ≥ 0,9** gagne ; Vectorize/AI Search seulement si tout échoue. D1 FTS5 (`unicode61 remove_diacritics 2`) testé comme mode serveur dégradé.
- **Bench de génération, modèles Mistral de Workers AI uniquement** : `@cf/mistralai/mistral-small-3.1-24b-instruct` (≈ 32 neurons/question), `@cf/mistral/mistral-7b-instruct-v0.2` (tarif à lire), et tout autre modèle Mistral présent au catalogue le jour J (vérifier la page models). Contrat de sortie `{cited_ids, liant_fr ≤ 2 phrases, hors_programme, glossary_term?}` via function calling ou **validation post-hoc** (IDs ∈ candidats ; toute citation ∈ corpus par correspondance exacte ; sinon fallback extractif silencieux). Panel de 3 juges (français natif 0-5, fidélité 0-5, refus correct, longueur mobile) + chasseur de mesure inventée ; médiane. Budget ≤ 8 000 neurons, tenu dans `neurons-log.md` ; le reste en mocks.
- Seuils : **0 invention après validation, refus ≥ 95 %, français ≥ 4/5, ≤ 35 neurons/question, p95 < 3 s** ; sinon décision « extractif pur, aucun LLM en ligne » (résultat légitime). Écrans réponse / refus (« L'AEC ne traite pas de ça » + 3 mesures voisines + lien désintox) / dégradé (« Réponse directement extraite du programme ») maquettés et jugés « aucun n'a l'air d'une panne ».
- Harnais = **porte CI** avant chaque déploiement ; **page publique « exactitude »** (résultats, version et date du corpus, hash par section, règle 831/837) ; prompt système v1 ; mode dev mocké.
- Livrable : `eval/questions.json`, `eval/results.md`, `eval/harness.ts`, `docs/discovery/08-ia.md` (contrat de fiabilité en 1 page, architecture retenue, chiffres).
- Sortie : variante de retrieval et modèle retenus avec chiffres, ou décision « extractif pur » ; contrat de fiabilité écrit.

### T7 — Plateforme, budget neurons, résilience, sécurité
**Q : Comment tenir un pic viral et une attaque d'épuisement de quota sans jamais casser l'app ni sortir du 0 €, sans stocker une opinion politique ?**
- Micro-prototypes de 10 min chacun (multi-modal sweep via `wrangler`) : cache AI Gateway (`cf-aig-cache-status: HIT`) **vs consommation de neurons au dashboard** (marquer VÉRIFIÉ/INFIRMÉ, tableau de coût à deux colonnes) ; **`cf-aig-collect-log: false` prouvé par capture** ; DO compteur global à 85 % ; rate limit binding 60 s ; Turnstile invisible (cookies documentés) ; CPU de la variante B' ; D1 FTS5 ; taille du bundle satori.
- **Carte des journalisations involontaires** : pour chaque brique (Workers logs, AI Gateway logs et cache, Turnstile, clé de rate limit par IP hashée avec sel rotatif, Analytics Engine, Web Analytics vs Analytics Engine seul, D1 cache Q/R hashé) : donnée → lieu → TTL → comment on l'éteint. Politique de confidentialité en 10 lignes ; liste « ce qu'on n'enregistre jamais ».
- Matrice de dégradation : cache → LLM → extractif + glossaire ; défense en profondeur ordonnée : Turnstile → rate limit → DO budget → D1 cache → AI Gateway cache → Mistral → validateur. Tableau de coût à 500 q/jour, 10 000 visiteurs/h, 100 000 requêtes hostiles ; démonstration que l'app reste 100 % fonctionnelle à 0 neuron.
- Architecture de référence : Worker unique + Static Assets (`run_worker_first: ['/api/*']`), framework choisi par **micro-prototype mesuré** (React+Vite+Tailwind v4 vs Astro : JS initial, LCP) ; PWA hors-ligne (corpus + index + glossaire) avec versionnage du corpus et invalidation ; feature flags KV (silence électoral, wording du chat, kill switch chat) ; ingestion hors Worker ; wrangler.jsonc esquissé (AI, D1, DO, RATE_LIMITER, ASSETS, ANALYTICS, KV flags) ; ≥ 8 ADR courts avec limite chiffrée et URL (docs via `context7`, skills `cloudflare`/`workers-best-practices`/`durable-objects`).
- Sécurité : CSP stricte compatible Turnstile, secrets via `wrangler secret`, validation d'ID sur `/m/*` et `/og/*`, `_headers`, revue `security-review` avant lancement.
- Perf : mesurer LCP/INP/CLS du prototype **sur un vrai Android milieu de gamme en 4G réelle**, pas seulement en throttling.
- Runbook : 5 fiches incident (hallucination virale, demande de retrait/désaveu LFI → rebrand light maquetté avec tokens neutres et wordmark propre, modèle Mistral déprécié, facturation déclenchée, recommandation CNCCEP) avec détection → action < 10 min → communication ; veille datée (aec2027.fr, cnccep.fr décembre 2026, page models Workers AI).
- Livrable : `docs/discovery/09-architecture.md` (ADR, diagramme via `artifact-diagramming`, wrangler.jsonc, tableau de coût, carte des données, runbook), prototype déployé sur workers.dev.
- Sortie : chaque hypothèse de plateforme étiquetée VÉRIFIÉ/INFIRMÉ avec chiffre ; 0 € constaté au dashboard ; capture AI Gateway logging OFF.

### T8 — Mode Riposte et terrain (P1, mais l'usage n° 1 du militant)
**Q : Comment l'app fait-elle gagner 10 secondes au militant en soirée de famille, sur un marché, dans une boucle WhatsApp ?**
- `data/riposte.json` : 15 objections au départ (26 idées reçues désintox + terrain) → mesure verbatim + chiffre sourcé + réponse désintox + carte de partage ; flashcards chronométrées 10 s ; mode marché hors-ligne à gros boutons par thème ; QR thématique pour tracts (materiel.actionpopulaire.fr) ; **aucune collecte de contact** (frontière explicite avec Action Populaire).
- Livrable : `data/riposte.json`, spec dans `docs/discovery/10-riposte.md`.
- Sortie : riposte chronométrée < 10 s par 3 militants au test humain.

### T9 — Conformité par le design et calendrier
**Q : Comment satisfaire chaque obligation par un élément d'interface intégré à la charte, sans disclaimer politique ?**
- Checklist obligation → écran → copy → source : art. 50 AI Act (3 variantes maquettées, jugées « non-disclaimer » par ≥ 4/5 juges), attribution CC BY-NC-SA sur chaque carte et page, gabarit StatCard loi 77-808 (organisme, dates, commanditaire, média/source, lien), LCEN selon l'option d'identité choisie, RGPD art. 9, INPI (recherche `data.inpi.fr`), loi 2018-1202, calendrier : L52-1 (zéro promotion payante dès le 1/10/2026 dans le playbook), **flag silence électoral avec bornes UTC et test unitaire** (18 avril / 2 mai 2027, samedi outre-mer ; à figer sur le décret de convocation), appliqué au chat, au partage, à « Devine le % », à la mesure du jour ; CTA inscription électorale (date à vérifier sur service-public.fr) ; politique de confidentialité 10 lignes ; licences : `data/` en CC BY-NC-SA, code en licence libre, interdiction du code AGPL d'actionpopulaire.fr.
- Revue adversariale « juriste hostile » + validation utilisateur.
- Livrable : `docs/discovery/11-conformite.md`, textes dans `design/strings.json`.
- Sortie : aucune obligation sans mécanisme ; aucun disclaimer de contenu.

### T10 — Positionnement, nom, mesure, lancement (P1)
**Q : Quel terrain l'app occupe-t-elle que ni melenchon2027.fr, ni aec2027.fr, ni laec.fr n'occupent, et comment on le prouve ?**
- Audit au navigateur de laec.fr, avenir-en-commun.net, aec2027.fr (webmanifest, favicon, annonces Discord/AP) ; grille 6 produits × 8 critères par 3 personas ; phrase de positionnement (« melenchon2027.fr = le texte ; aec2027.fr = la lecture officielle ; nous = l'endroit où un indécis comprend en 3 minutes et où un militant trouve sa munition sourcée en 10 secondes ») ; scénario de pivot si aec2027.fr sort ; option « dataset + glossaire offerts » tranchée.
- Sprint de nommage (3 × 20 → 3 finalistes, disponibilité vérifiée en RDAP/whois) → choix utilisateur ; wordmark propre.
- Plan d'événements Analytics Engine sans identifiant (event, chapitre, mode cache/llm/extractif, bucket latence) ; métrique nord instrumentée ; playbook organique J-30 → J+30 (Discord LFI, groupes d'action, boucles, QR sur tracts) ; releases datées.
- Livrable : `docs/discovery/12-positionnement-lancement.md`.
- Sortie : positionnement et nom validés par l'utilisateur ; ≥ 3 différenciateurs concrets.

### T11 — Tests humains (transversal, bloquant)
**Q : Les décisions de séduction tiennent-elles devant de vraies personnes, dont des non-politisées, avec un lien reçu dans WhatsApp ?**
- **Session 1 (fin J2, ~45 min)** : 5 s sur chaque accueil des 3 directions (« lequel tu envoies à ton cousin ? », « lequel a l'air officiel ? »), aha règle verte chronométré sur les 3 anatomies, tu/vous, mascotte.
- **Session 2 (J4, ~20 min/personne × 5-8)** : prototypes des 2 mécaniques finalistes, partage réel observé (lien ouvert **depuis** WhatsApp/Instagram), riposte 10 s, « Devine le % », refus et mode dégradé (« ça a l'air d'une panne ? »), un proche non militant recevant le lien.
- Grille commune avec les juges ; matrice tâche × personne × temps × verbatim ; **une seule itération** ciblée ; tout ce qui n'est pas testé reste HYPOTHÈSE dans le dossier **et** dans le prompt.
- Livrable : `docs/discovery/13-tests-humains.md`.

### T12 — Assemblage, red team et prompt final
- Dossier assemblé (structure §7) ; registre des HYPOTHÈSES avec méthode de levée ; backlog d'idées écartées avec raison ; estimation d'effort par jalon confrontée aux heures déclarées.
- **Panel rouge à 5 angles** (désinformation, panne virale, violation de charte, illégalité, ennui) puis 3 relecteurs du prompt (implémenteur en plan-mode qui liste ce qui lui manquerait, adversaire politique, auditeur charte/accessibilité) → corrections → **dry-run de 10 min du prompt dans une session plan-mode** : aucune question bloquante ne doit surgir.
- Sortie : prompt final livré, relu par l'utilisateur.

---

## 6. Séquence sur 4 journées

Les étapes marquées **\*** forment la **coupe minimale** (si la session doit s'arrêter, elles garantissent un prompt exploitable).

| Jour | Bloc | Contenu | Orchestration |
|---|---|---|---|
| **J0** (2 h, la veille) | \* Cadrage | T0 : salve de questions, smoke test outillage, dépôt + squelettes (`decisions.md`, `prompt-final.md`, `neurons-log.md`), captures horodatées, **recrutement des testeurs lancé** | Solo + AskUserQuestion |
| **J1 matin** | \* Fondation | T1 en 4 agents parallèles (ingestion + invariants + 10 sections vérifiées ; désintox ; termes/livrets 2022/FALC ; À savoir + tags) | Workflow : multi-modal sweep → adversarial verify |
| **J1 après-midi** | \* Identité | T3 partie 1 : captures charte/site/affiches/aec2027, polices servies, **décision « quelle charte »**, tokens v0, matrice AA, échantillon typo FR, règles d'illustration, textes courts obligatoires, budget perf, matrice appareils ; audit T10 des 3 sites | Navigateur réel + agent de calcul de contrastes + skill `design` |
| **J2 matin** | \* Partage réel | T4 : spike Worker jetable + satori (taille du Worker mesurée), liens envoyés dans WhatsApp/Telegram/Story sur 2 OS, aperçus sur domaine final, matrice in-app, décision build/runtime ; nom et positionnement esquissés | Spike + test par l'utilisateur + panel « lequel tu ouvres ? » |
| **J2 après-midi** | \* Concepts et mécaniques | T2 : 5 cartes-concept (Rédacteur → Vérificateur → Éditeur, juges Yanis/fact-checker), 3 anatomies maquettées ‖ T5 : métrique nord + échelle 0-3, brainstorm 20 fiches → grille → red team → top 6, 2 finalistes ; T8 riposte.json (15) | 2 workflows en parallèle (sweep → judge panel → adversarial verify) |
| **J2 soir** | \* Test humain 1 | T11 session 1 : 3 accueils, anatomie de carte-concept, tu/vous, mascotte (30-45 min) | L'utilisateur anime, Claude prépare la grille et synthétise |
| **J3 matin** | \* Grand canvas | T3 partie 2 : 3 directions × 5 écrans à contenu réel + 2 mécaniques × 5 artboards → panel 6 juges → critique adversariale → direction retenue (coupe minimale : 2 directions × 3 écrans) | Skill `design` → judge panel → adversarial verify |
| **J3 après-midi** | \* Labo IA (en parallèle du design, indépendant) | T6 : jeu d'évaluation, bench retrieval A/C/B', bench Mistral (≤ 8 000 neurons, étalé si besoin), validateur post-hoc, écrans réponse/refus/dégradé ‖ T7 micro-prototypes plateforme (logs AI Gateway OFF **avant** le premier appel, cache vs neurons, DO, rate limit, Turnstile, CPU, FTS5) | 2 workflows (sweep 3 modèles/variantes → judge panel 3 juges → chasseur d'inventions) |
| **J3 soir / J4 matin** | Prototypes | Prototypes jouables (2 mécaniques finalistes avec vraies mesures, Devine le %, riposte, 3 micro-interactions) + audit `web-perf` CPU ×4 + mesure sur vrai Android 4G ; kit de partage 6 cartes × 2 ratios ; framework choisi par micro-prototype | 3 agents de prototypage + skill `web-perf` |
| **J4 midi** | \* Test humain 2 | T11 session 2 (5-8 personnes, liens ouverts depuis WhatsApp/Instagram) → une itération ciblée → décisions confirmées ou HYPOTHÈSE | Utilisateur + synthèse |
| **J4 après-midi** | \* Consolidation et prompt | 4 agents parallèles (architecte : ADR/wrangler/coût/carte des données/runbook ; juriste-designer : T9 ; croissance : T10 + voix ; nommage) → dossier → registre HYPOTHÈSES → prompt final → panel rouge 5 angles → 3 relecteurs → **dry-run plan-mode 10 min** → livraison | Sweep → completeness critic → adversarial verify |

**Ordre de sacrifice si retard** : audio pré-généré, duel en Durable Object, stickers Telegram, mode soirée débat, motion spec réduite à 3 règles, kit de chaînes réduit à 20, SEO. **Jamais sacrifiés** : T0, T1, T2 (5 cartes), T3 (identité + tokens + 2 directions), T4 (spike), seuils de T6, T11, prompt final.

**Règles transversales** : `decisions.md` tenu à chaque étape ; `neurons-log.md` tenu à chaque appel ; le prompt final est rempli au fil de l'eau ; statut VÉRIFIÉ/PROBABLE/HYPOTHÈSE sur chaque fait ; toute vérification visuelle au navigateur réel.

---

## 7. Livrables de la session (tous en fichiers dans le dépôt)

```
aec-discover/
├── docs/discovery/
│   ├── 00-resume-executif.md        positionnement, 10 décisions sur pièces, non-objectifs
│   ├── decisions.md                 ≥ 20 décisions datées, chacune avec sa preuve
│   ├── 01-faits.md                  registre URL / statut / implication (incl. vérifs plateforme)
│   ├── 02-funnel-personas.md        Camille, Yanis, Martine, militant sceptique ; arc 0 s → 10 s → 3 min → partage
│   ├── 03-corpus.md  04-glossaire.md  05-direction-artistique.md  06-partage.md
│   ├── 07-mecaniques.md  08-ia.md  09-architecture.md  10-riposte.md
│   ├── 11-conformite.md  12-positionnement-lancement.md  13-tests-humains.md
│   ├── 14-risques.md  15-backlog-ecarte.md  16-hypotheses.md  neurons-log.md
│   └── prompt-final.md              le prompt autoportant (§8)
├── data/       aec-2025.json  hashes.json  glossary.json  faq.json  riposte.json  desintox.json  stat-cards.json  livrets-2022.json  LICENSE (CC BY-NC-SA 4.0)
├── eval/       questions.json  results.md  harness.ts  prompt-system-v1.md
├── design/     identity-decision.md  tokens.json  contrast-matrix.md  illustration-rules.md  motion-spec.md  voice.md  strings.json  canvas/*.png  share-kit/
├── scripts/    ingest.ts  diff.ts  (GitHub Actions hebdo)
└── prototypes/ spike-share/  labo-ia/  hello-corpus/
```

---

## 8. Le prompt final de plan-mode (squelette à remplir au fil de la session)

Court, autoportant, il **pointe vers les fichiers** ci-dessus avec l'instruction « lis d'abord `docs/discovery/00-resume-executif.md`, `decisions.md`, `16-hypotheses.md`, puis les fichiers cités ». Il contient, dans cet ordre :

1. **Contexte figé** : date, présidentielle 18 avril / 2 mai 2027, cibles (militants = utilisateurs et canal ; 18-30 ; indécis), demande verbatim de l'utilisateur, stack et conventions (TypeScript strict, composants fonctionnels, ESLint/Prettier, code en anglais, UI en français).
2. **Contraintes dures** : 0 € (plan Free, aucun moyen de paiement) ; **IA à l'exécution = Mistral via Workers AI uniquement** (pas de Grok, pas de Gemini/Mistral free tiers externes, pas d'embedding non français à l'exécution) ; fidélité absolue (le LLM sélectionne des IDs, ne rédige jamais une mesure) ; identité et tokens tranchés ; mobile-first WhatsApp ; zéro compte/zéro donnée ; zéro promotion payante dès le 1/10/2026 ; silence électoral L49.
3. **Décisions prises sur pièces**, énoncées comme des faits, chacune avec justification en une ligne et lien vers la preuve : identité et direction artistique, anatomie de la carte-concept, niveau de gamification et mécaniques MVP (≤ 3), objet de partage principal et schéma d'URL, architecture IA (retrieval, modèle Mistral ou extractif pur, contrat de sortie, validateur), framework, Workers Static Assets + Worker unique, OG build vs runtime, ingestion hors Worker, PWA, nom et positionnement, tu/vous, option d'identité LCEN, licences.
4. **Fichiers produits à réutiliser tels quels** (chemins, schémas, licence) : corpus, glossaire, FAQ, riposte, jeu d'évaluation, tokens, chaînes, prompt système v1.
5. **Chiffres de plateforme vérifiés** avec URLs : 100 000 req/jour, 10 ms CPU, 50 sous-requêtes, 3 MB, 5 crons, static assets illimités (20 000 fichiers/25 MiB), 10 000 neurons/jour et neurons/question du modèle retenu, KV 1 000 écritures/jour (lecture seule), D1 100 000 écritures/jour, DO SQLite gratuit, AI Gateway (cache match exact TTL 1 mois, logs OFF prouvé, effet HIT sur neurons VÉRIFIÉ/INFIRMÉ), Turnstile (cookies), rate limit per-colo, Analytics Engine 100 000 points/jour.
6. **Contrat d'exactitude et portes CI** : validateur post-hoc, fallback extractif silencieux, refus designé, harnais (100 + 30) avec seuils (0 invention, refus ≥ 95 %, rappel@5 ≥ 0,9), page publique « exactitude », mode dev mocké, règle 831/837, invariants du corpus en test.
7. **Défense en profondeur et matrice de dégradation** : Turnstile → rate limit → DO budget 85 % → D1 cache → AI Gateway cache → Mistral → validateur ; micro-copy du mode extractif ; tableau de coût à deux colonnes.
8. **Carte des données** (brique → donnée → lieu → TTL → extinction), politique de confidentialité 10 lignes, liste « ce qu'on n'enregistre jamais », pas de `console.log` du texte des questions.
9. **Design system** : tokens, teintes, règles d'usage des vives, Public Sans + Gowun Batang sous-ensemblées auto-hébergées, matrice AA, règles d'illustration, mascotte originale, motion spec, **ban list** (Montserrat, #0098B6/#0e8a9c, ocre, Φ, Union Gothic/Stack Sans rehébergées, LogoTortue.svg tel quel, logo M27 comme marque, WebGL/Three.js, bandeau cookies, comptes, leaderboards, streaks serveur, push, match, KV en écriture dynamique, code AGPL).
10. **Spécification des écrans** avec contenu réel (écran 0 et variante arrivée par lien, mécanique d'entrée, carte-concept, section, chapitre/progression, réponse/refus/dégradé du chat avec mention IA, kit de partage, riposte, mesure du jour, À propos/mentions/confidentialité/exactitude, mode silence) et **kit microcopy** (≥ 30 chaînes, clés i18n en anglais).
11. **Partage** : formats et gabarits, og:image < 300 Ko, une seule `og:image`, schéma d'URL avec état encodé, Web Share avec fallback, attribution CC + gabarit sondages loi 77-808, réglages bot du domaine, matrice in-app, règle « complet sans Web Share ni service worker ».
12. **Conformité et calendrier** : textes exacts (mention IA art. 50, attribution, ligne d'indépendance, mentions légales), bornes UTC du flag silence avec test de dates, wording du chat et kill switch en KV, veille CNCCEP/aec2027/modèles, runbook 5 incidents + rebrand light.
13. **Budget perf et accessibilité** : LCP < 2 s 4G réelle, JS < 100 Ko gzip, CLS < 0,1, INP < 200 ms, 60 fps CPU ×4, reduced-motion, WCAG 2.2 AA (cibles 24 px, alternative au swipe), matrice appareils/in-app, dark mode et dynamic type décidés.
14. **Sécurité** : CSP stricte compatible Turnstile, secrets via `wrangler secret`, validation d'ID, `_headers`, revue `security-review` avant lancement.
15. **Observabilité et métrique nord** : événements Analytics Engine sans identifiant, Web Analytics ou non, page « exactitude ».
16. **Phasage attendu avec critères de done chiffrés et estimation d'effort ≤ heures déclarées** : v1 statique hors-ligne + glossaire + partage (+ riposte) ; v2 chat citation-first Mistral + PWA ; v3 mécaniques ludiques retenues ; gel mars 2027 ; silence avril-mai. Structure de dépôt, wrangler.jsonc, CI GitHub Actions, stratégie de tests (invariants, harnais, snapshots de cartes, dates du flag, contraste, taille du bundle et du Worker).
17. **Non-objectifs explicites** et **registre des HYPOTHÈSES** avec méthode de levée (la session plan-mode ne re-vérifie que PROBABLE et HYPOTHÈSE).
18. **Posture** : lire le dossier avant de planifier ; ne pas rouvrir une DÉCISION sans raison technique documentée ; poser une question à l'utilisateur sur les points listés plutôt que supposer ; citer les docs Cloudflare via `context7` ; signaler tout écart aux chiffres de plateforme ; « le Worker orchestre, il ne calcule pas » ; prévoir un mode dev mocké ; produire un plan étape par étape avec critères de done.

---

## 9. Vérification : la session est terminée quand

- [ ] `decisions.md` : ≥ 20 décisions datées avec preuve ; aucune décision structurante sans étiquette DÉCISION ou HYPOTHÈSE.
- [ ] Identité tranchée **par capture d'écran** (`design/identity-decision.md`), tokens + matrice AA calculée (100 % des paires texte ≥ 4,5:1), sous-ensembles de polices < 100 Ko, échantillon FR validé.
- [ ] `data/aec-2025.json` produit par le pipeline canonique : invariants **mesurés**, 10 sections vérifiées mot à mot, hash par section, gzip mesuré, règle 831/837 écrite, capture des mentions légales archivée ; ingestion hors Worker spécifiée.
- [ ] `glossary.json` ≥ 30 entrées 100 % sourcées, 0 affirmation non couverte, score de lisibilité, 5 cartes réexpliquées par ≥ 1 non-politisé.
- [ ] Kit de partage prouvé : aperçus corrects sur ≥ 3 messageries × 2 OS sur le domaine final, og:image < 300 Ko, matrice in-app remplie, taille du Worker satori mesurée, ADR OG build/runtime.
- [ ] `eval/questions.json` (100 + 30) et résultats : 0 invention après validation, refus ≥ 95 %, neurons/question par modèle Mistral, « cache HIT vs neurons » VÉRIFIÉ ou INFIRMÉ avec capture, ou décision « extractif pur ».
- [ ] Carte des données complète, capture prouvant AI Gateway logging OFF, cookies Turnstile/Web Analytics documentés, politique de confidentialité rédigée.
- [ ] Checklist légale mappée à des écrans : gabarit StatCard loi 1977, bornes UTC du flag L49 avec test, zéro promotion payante, mention IA jugée « non-disclaimer », attribution CC sur chaque carte, option LCEN choisie, INPI consulté, mascotte originale décidée.
- [ ] Niveau de gamification (0-3) décidé avec résultats de test ; MVP ≤ 3 mécaniques ; gadgets écartés listés ; méthode publiée.
- [ ] Tests humains : ≥ 5 personnes dont ≥ 2 non-politisées, deux sessions, liens ouverts depuis WhatsApp/Instagram, matrice tâche × personne × temps × verbatim ; le non-testé étiqueté HYPOTHÈSE dans le dossier **et** le prompt.
- [ ] ≥ 8 ADR, wrangler.jsonc esquissé, tableau de coût 3 scénarios × 2 colonnes, app fonctionnelle à 0 neuron démontrée, perf mesurée sur un vrai Android en 4G, runbook 5 fiches + kill switch + rebrand light, plan de veille daté.
- [ ] Prompt final : autoportant, pointe vers des fichiers existants, chiffres corrigés, ban list, registre HYPOTHÈSES, relu par 3 rôles, **dry-run plan-mode de 10 min sans question bloquante**.
- [ ] Estimation d'effort par jalon ≤ disponibilité hebdomadaire déclarée ; calendrier de relecture humaine planifié ; option « dataset offert à aec2027.fr » tranchée.

---

## 10. Questions à poser en ouverture de session (T0, une seule salve)

1. **Identité** : suivre la charte LFI (Public Sans/Gowun Batang, 4 couleurs 2027) ou l'identité de campagne M27 (Union Gothic/Stack Sans, non rehébergeables) ? Accès à un kit interne (Discord, groupe d'action) ? Es-tu insoumis·e au sens de la charte (usage des logos) ?
2. **Mascotte** : tortue **originale** (sans reprise des traits de l'illustration Hello Melro / du logo), ou aucune mascotte ? Lait-fraise en easter egg ?
3. **Nom et domaine** : titre de travail « aec-discover » ? `*.workers.dev` (0 €) ou `.fr` (~8 €/an, nécessaire pour QR/tracts et aperçus fiables ; titulaire visible au whois) ? Coûts uniques acceptables ?
4. **Indépendance** : une ligne discrète « projet militant indépendant » (footer/À propos), distincte d'un disclaimer de contenu, est-elle acceptable ? Wordmark propre ?
5. **Mentions légales** : identité complète, prénom + e-mail + hébergeur, ou association loi 1901 ? Adresse de contact (Cloudflare Email Routing) ?
6. **CTA autorisés** : inscription sur les listes (service-public), lien vers la collecte officielle, lien Action Populaire, aucun ?
7. **Gamification** : niveau visé a priori (0-3) ? Qu'est-ce qui serait « honteux à partager » ? En cas d'arbitrage, qui prime : militant (riposte) ou indécis (comprendre) ? Écran 0 par défaut ?
8. **Sondages** : assumes-tu le format « Devine le % » fondé sur des sondages 2020-2021 (mentions loi 1977, attaque « sondages vieux de 6 ans ») ?
9. **Données** : journaliser anonymement les questions sans réponse (purge 30 j) pour améliorer le glossaire, oui/non ? Analytics : Cloudflare Web Analytics (script tiers) ou Analytics Engine seul ?
10. **Chat en v1 ?** Ou v1 100 % statique (glossaire + recherche locale + partage) et chat en v2 ? Acceptes-tu « extractif pur » si aucun modèle Mistral ne passe les seuils ?
11. **Dark mode** système ? Desktop confortable ou strictement mobile ? Français seul ?
12. **Silence électoral** : gel partiel (chat, partage, Devine le %, mesure du jour) avec lecture maintenue, ou fermeture ?
13. **Contingence** : si LFI demande le retrait ou désavoue : rebrand (tokens neutres, wordmark) ou fermeture ? Offrir le dataset JSON + glossaire à l'équipe aec2027.fr / numérique LFI ? Dépôt public dès J1 ?
14. **Temps** : heures/semaine jusqu'en mai 2027, compétences (front, design), qui relit glossaire et ripostes ? Créneaux et téléphones (Android/iOS) des testeurs pour les deux sessions.
15. **tu / vous** ; voix de la mascotte ; « propulsé par Mistral AI » affiché ou non.
