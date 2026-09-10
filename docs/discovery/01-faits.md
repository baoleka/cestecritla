# 01 — Registre des faits (URL · statut · implication)

> Complète et **corrige** le §3 de `PLAN-SESSION.md`. Seules les lignes qui ajoutent ou requalifient un fait figurent ici ; le plan reste la référence pour le reste. Statuts : VÉRIFIÉ (lu à la source à la date indiquée, preuve citée) / PROBABLE / HYPOTHÈSE. Les faits de plateforme (T7) s'ajouteront ici.

## Requalifications du 7 septembre 2026

| Fait (plan) | Nouveau statut | Preuve | Implication |
|---|---|---|---|
| « aec2027.fr : domaine officiel LFI » (VÉRIFIÉ dans le plan) | **PROBABLE (écosystème insoumis) / HYPOTHÈSE (officiel)** | RDAP nic.fr : déposé le 7/5/2026 chez LWS (mutualisé), titulaire anonymisé, expiration 7/5/2027 ; HTML 7 231 o sans JS, inchangé depuis le 1/9 ; `og:url` et `og:image` → 404 sur lafranceinsoumise.fr ; JSON-LD avec dates d'élection fausses (23/4-7/5/2027) et « 9 chapitres » ; aucun lien depuis melenchon2027.fr ni lafranceinsoumise.fr ; aucune annonce trouvée (`captures/2026-09-07/prior-art/aec2027-*`) | Veille maintenue (signaux : manifest, lien officiel, `Last-Modified`), mais la « redondance avec l'app officielle » n'est plus un fait établi ; scénario de pivot dans `12-positionnement-lancement.md` |
| « Sur Charbon, les vives passent (Jaune 10:1) » | **VÉRIFIÉ, corrigé** : seules 2 vives passent AA en texte courant sur Charbon (jaune 10,09, rose 5,18) ; bleu 4,40 et vert 4,39 = AA-large ; vif violet 2,19 = échec | `design/contrast-matrix.md` (105 paires, `scripts/contrast.ts`) | Dark mode : vives en titres/aplats seulement ; accent violet = Violet 200 #E5CBFF |
| « Tortue en pixel art sur les affiches » | **INFIRMÉ** : aucune tortue pixel art sur les 5 affiches T27 ; la tortue officielle est une illustration isométrique 3D lavande (PNG) | `captures/2026-09-07/identite/assets-tiers/affiches-contact-sheet.png (non versionné : illustrations tierces)`, `assets-tiers/tortues-contact-sheet.png` (non versionné) | Le registre « pixel art » n'est pas une licence officielle ; mascotte originale 2D (D0.12, D3.8) |
| « Modèles Mistral de Workers AI : Small 3.1 24B, 7B v0.1/v0.2 » | **VÉRIFIÉ, réduit** : `@cf/mistral/mistral-7b-instruct-v0.2` = « No route for that URI » ; v0.1 déprécié ; seuls Small 3.1 24B et 7B v0.2 **LoRA** répondent | `docs/discovery/outillage.md` #7, `neurons-log.md` | Bench T6 sur 2 modèles (D0.34) |
| « 48 À savoir = sondages 2020-2021 (Harris, YouGov) » | **VÉRIFIÉ, corrigé** : période 2018-01 → 2024-10 ; Harris Interactive 37, Ifop 9, YouGov 1, inconnu 1 (votation nucléaire) ; 6 statistiques supplémentaires publiées en paragraphes | `data/stat-cards.json` | L'attaque « sondages vieux de 6 ans » ne vise qu'une partie des cartes ; afficher institut + date sur chacune (D1.9) |
| « Corpus ≈ 62 Ko gzippés » | **VÉRIFIÉ, précisé** : fichier complet 142 345 o gzip (empreintes + html) ; projection runtime ≈ 71 Ko (PROBABLE) | `03-corpus.md` §6 | D1.6 |
| « Comptage 89 / 837 / 48 » (PROBABLE dans le plan) | **VÉRIFIÉ** : 4 / 18 / 89 / 87 + 706 + 44 = 837 / 48 / 109, déterministe sur 4 crawls, 10 sections vérifiées mot à mot | `03-corpus.md` §3, `data/expected-invariants.json` | Les chiffres entrent dans les maquettes |
| « Aucun modèle d'embedding français sur Workers AI » | **VÉRIFIÉ, reformulé** : `bge-m3` et `embeddinggemma-300m` sont multilingues mais non français → exclus à l'exécution par D0.3 | page models Workers AI (7/9) | Inchangé : lexical local + embeddings pré-calculés au build (T6) |
| « Prior art : laec.fr, avenir-en-commun.net » | **VÉRIFIÉ, complété** : + **cachangequoi.fr** (simulateur 100 % client, charte 2027, manifest, `navigator.share`, zéro cookie, sources par mesure), + landing `programme-lfi.julien-9b2.workers.dev` (Public Sans + Gowun Batang + couleurs 2027), + squat SEO lafaqdelavenirencommun.com ; laec.fr expire le **16/9/2026** ; avenir-en-commun.net envoie 20 champs personnels à un backend Render qui s'endort | `12-positionnement-lancement.md` §2 | D10.1 : la DA ne différencie pas |
| « Le corpus est figé depuis janvier 2025 » | **PROBABLE, nuancé** : le lecteur officiel annonce une actualisation à partir des ~24 000 contributions citoyennes (date inconnue) ; `c10-s01` modifié le 23/3/2026 | audit T10 (`/synthese-des-contributions/`) ; `data/aec-2025.json` | Re-crawl hebdo et versionnage indispensables (D1.3, D1.4) |
| Nav du livre : 3 liens `/chapitre1/s3-5/` redirigent (301) vers d'autres permaliens | **VÉRIFIÉ (nouveau)** | `meta.redirected_section_ids` = c1-s03, c1-s04, c1-s05 | Le crawler suit un saut même site et vérifie la page atteinte ; `canonicalUrl` stocké |
| AI Act art. 50 applicable depuis le 2/8/2026 | **VÉRIFIÉ** (artificialintelligenceact.eu lu le 7/9) ; effet d'un « Digital Omnibus » éventuel = HYPOTHÈSE | `design/voice.md` | Mention IA nommant Mistral (D0.29), 3 variantes à juger en T9 |
| Loi 77-808 art. 1, 2, 11 | **VÉRIFIÉ** (Legifrance lu le 7/9) | `design/voice.md`, `data/stat-cards.json` `meta.legal_77_808_fr` | Gabarit StatCard ; champs manquants listés par carte |

## Faits de plateforme mesurés (T0, T4)

| Fait | Statut | Preuve |
|---|---|---|
| **Taille d'un Worker : 64 Mio non compressé, Free et Paid, « aucune limite compressée »** (le plan disait 3 Mo compressé : périmé ; l'éclaireur avait raison) | VÉRIFIÉ (page limits lue le 7/9 et le 8/9) | https://developers.cloudflare.com/workers/platform/limits/ ; spike : 2,88 Mio brut / 1,09 Mio gzip |
| **CPU : 10 ms par invocation sur Free** ; satori + resvg = 137-283 ms CPU médian par carte → 33-75 % de 503 « error 1102 » après quelques dizaines de rendus | VÉRIFIÉ (GraphQL `workersInvocationsAdaptive`, `06-partage.md` §2) | Rendu d'image à la demande **rejeté** (D4.1) ; toute charge Worker (extractif, routage) à mesurer par la même méthode en T7 |
| Démarrage d'un Worker : limite 1 s ; spike mesuré 45-51 ms | VÉRIFIÉ | page limits, `06-partage.md` |
| 100 000 requêtes/jour (Free) ; un aperçu WhatsApp = 2 requêtes (page + image) | VÉRIFIÉ | page limits ; tableau de coût T7 |
| Static Assets : 20 000 fichiers, 25 Mio par fichier ; **≈ 970 cartes pré-générées ≈ 60 Mo** (seul le 1200×630 est pré-généré depuis **D13.3**, 10/9/2026 ; les ≈ 2 900 fichiers / ≈ 240 Mo des trois ratios sont l'option écartée) | VÉRIFIÉ (limites) / PROBABLE (volume) | `06-partage.md` §4 ; `decisions.md` D13.3 |
| satori 0.33+ (harfbuzz) ne tourne pas dans Workers ; 0.32 épinglé ; wrangler 4 exige Node ≥ 22 | VÉRIFIÉ (spike) | `prototypes/spike-share/README.md` |

| Fait | Statut | Preuve |
|---|---|---|
| Workers AI : 10 000 neurons/jour, reset 00:00 UTC ; `usage.neurons` renvoyé par l'API, formule 31 876 / 50 488 par M tokens exacte pour Mistral Small 3.1 | VÉRIFIÉ | `neurons-log.md`, pricing lu le 7/9 |
| 7B v0.2 LoRA ≈ 550 neurons/M tokens (≈ 20× moins cher), bascule vers l'anglais dès 4 tokens | VÉRIFIÉ (mesure) / HYPOTHÈSE (qualité) | `neurons-log.md` |
| AI Gateway : logs activés par défaut (prompt + réponse) ; `cf-aig-collect-log: false` ou Settings → Logs OFF | VÉRIFIÉ (doc) / à prouver par capture en T7 | `outillage.md` #8 |
| Compte Cloudflare : Free, 0 zone, aucun moyen de paiement (déclaré), token wrangler sans scope billing/ai-gateway | VÉRIFIÉ (API) / DÉCLARÉ (paiement) | `outillage.md` #4-5 |
| Turnstile sur téléphone réel (lab.cestecritla.fr) : **13 870 ms** jusqu'au jeton depuis le début de la navigation sur un réseau médiocre, **5 973 ms** sur un meilleur réseau (même téléphone ; appareil et mode affiché à préciser) | VÉRIFIÉ (2 mesures utilisateur, 9/9) | Réponse utilisateur | Le réseau pèse pour ≈ 8 s ; même à 6 s, le jeton doit être demandé en arrière-plan dès l'ouverture de l'écran chat, jamais à l'envoi ; le chat v2 reste utilisable sans Turnstile tant que le jeton n'est pas là ? Non : sans jeton, réponse extractive locale (D0.21), avec jeton, appel IA — à spécifier en T9/T12 ; second téléphone à mesurer |

