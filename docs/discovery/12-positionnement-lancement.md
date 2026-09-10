# T10 — Positionnement, nom, mesure, lancement

> **État du document (complété le 9 septembre 2026, T10 / J4).** La partie **Audit** (§1 à §7) a été relevée le 7 septembre ; le **Nommage** (§8) a été tenu le 9 septembre au matin ; le **Plan de lancement** (§9) et les **Événements** (§10) ont été écrits le 9 septembre au soir, sans aucun appel Workers AI. L'app s'appelle **C'est écrit là** et vit sur **cestecritla.fr** (D10.2) : le titre de travail « AEC Discover » ne subsiste que dans les pièces datées — maquettes, spike de partage, captures et User-Agent du 7 septembre — conservées telles quelles parce qu'elles sont des faits. **Le dépôt a été renommé `baoleka/cestecritla` le 10/9/2026** (arbitrage utilisateur, à consigner en D13.6) ; l'agent de crawl est `cestecritla/0.1 (+https://github.com/baoleka/cestecritla)`.
>
> Méthode : Chromium headless 153 via Playwright (D0.36), viewport **390 × 844 @2x**, User-Agent Android identifiable (`cestecritla/0.1`), `networkidle` + 1,5 s, cookies refusés quand un bouton « Refuser » existe. Chaque page produit un PNG pleine page et un `*.audit.json` (polices chargées, couleurs calculées, échantillons) ; les pages clés produisent aussi un `*.deep.json` (balises OG, manifest, scripts, formulaires, cookies, `localStorage`, hôtes tiers, inventaire des liens). Captures : `docs/discovery/captures/2026-09-07/prior-art/` (index en annexe). Horodatage des relevés : **16:00 – 16:25 UTC**.
>
> Statuts : **VÉRIFIÉ** = lu au navigateur ou en console aujourd'hui, URL donnée · **PROBABLE** = source secondaire ou non reproduit · **HYPOTHÈSE** = cible de conception non prouvée. Aucun commentaire sur le fond des mesures : l'audit porte sur les produits.

---

## 0. Ce que l'audit change

1. **Personne n'a « une URL + une image par mesure » sur l'édition 2025.** Le lecteur officiel n'a aucune ancre par mesure (12 `div.mesure` sans `id` sur ch. 12 s1) et une seule image OG générique ; laec.fr l'a fait pour l'édition 2022 (683 mesures numérotées, lien court `/s35m286/`), mais avec une image par **section** (86) et 21 visuels faits main. — VÉRIFIÉ
2. **L'officialité d'aec2027.fr n'est pas prouvée.** Domaine déposé le 7 mai 2026 chez LWS (hébergeur mutualisé) avec titulaire anonymisé, page d'attente sans aucun JS, `site.webmanifest` et favicons référencés en 404, `og:url`/`og:image` pointant vers des 404 sur lafranceinsoumise.fr, JSON-LD avec des dates d'élection fausses (23 avril / 7 mai 2027), aucun lien depuis melenchon2027.fr ni lafranceinsoumise.fr, aucune annonce trouvée. Le plan (§3.1) le tenait pour « domaine officiel LFI, VÉRIFIÉ » : à **requalifier PROBABLE (écosystème insoumis) / HYPOTHÈSE (officiel)**. — VÉRIFIÉ (indices), voir §2.2
3. **Le seul concurrent « IA » du terrain (avenir-en-commun.net) prouve par la négative le contrat de fiabilité** : 20 champs personnels (sexe, âge, revenus, ville, loyer…) envoyés sans information à un backend Render, réponse rédigée librement par le modèle, **aucune réponse en 240 s** et backend bloqué pour tous pendant ~10 min après une seule requête. — VÉRIFIÉ
4. **Le terrain est plus peuplé que prévu** : cachangequoi.fr (simulateur citoyen 100 % client, très bien fait, charte 2027), une landing `programme-lfi.julien-9b2.workers.dev` déjà en Public Sans + Gowun Batang + couleurs 2027, un squat SEO sur lafaqdelavenirencommun.com. **La direction artistique ne suffira pas à différencier : la différence doit être fonctionnelle.** — VÉRIFIÉ
5. **Une actualisation du programme est annoncée** (« seront exploitées pour actualiser le programme », synthèse des 24 000 contributions) : le corpus 2025 va bouger, probablement en même temps que la sortie d'aec2027.fr. — VÉRIFIÉ, https://melenchon2027.fr/synthese-des-contributions/

---

## 1. Périmètre audité

| Produit | URLs auditées | Fichiers (préfixe) | Rôle dans la grille |
|---|---|---|---|
| melenchon2027.fr, lecteur officiel (baseline) | `/programme2025/livre/chapitre12/s1/`, `/programme2025/livre/` (via programme.lafranceinsoumise.fr) | `m2027-ch12-s1.*`, `programme-lfi-home.*` | Produit 1 |
| aec2027.fr (annoncé) | `/`, `/robots.txt`, `/favicon.ico`, `www.aec2027.fr/site.webmanifest`, RDAP | `aec2027-home.*`, `aec2027-rdap.json`, `aec2027-favicon.ico` (+ captures J0) | Produit 2 |
| laec.fr (édition 2022) | `/`, `/sommaire`, `/recherche` (+ `?q=SMIC`), `/section/35/…`, `/s35m286/`, `/visuels`, `/page/mentions-legales` | `laec-*.*` | Produit 3 |
| avenir-en-commun.net | `/`, `/programme`, `/harmonie-humains-nature`, `/simulateur` (parcours complet), backend Render (`/`, `/openapi.json`, `POST /api/analyse-budget`) | `aecnet-*.*` | Produit 4 |
| Apps quiz type Elyze (catégorie) | non auditées au navigateur (apps mobiles de 2022, indisponibles pour un audit navigateur) ; sources de l'annexe de reconnaissance | — | Produit 5 (PROBABLE) |
| *C'est écrit là* (cible, `cestecritla.fr`) | décisions D0.x / D3.x, plan T1-T9 | — | Produit 6 (HYPOTHÈSE) |
| **Découverts pendant l'audit** : cachangequoi.fr, programme-lfi.julien-9b2.workers.dev, lafaqdelavenirencommun.com | `/` de chacun | `cachangequoi-home.*`, `workersdev-home.*`, `lafaq-home.*` | Hors grille demandée ; cachangequoi.fr ajouté en ligne 7 |

---

## 2. Audit produit par produit

### 2.1 melenchon2027.fr — le lecteur officiel (baseline)

Page auditée : https://melenchon2027.fr/programme2025/livre/chapitre12/s1/ (capture `m2027-ch12-s1.mobile.png`).

| Fait | Statut |
|---|---|
| Fond `#FFFCF4`, texte `#212320`, Violet `#4C0297` (titres), polices **Stack Sans** 300/400/700 + **Union gothic** servies en `@font-face` (commerciales, ban list) ; Elementor 4.2.4 + plugin `lfi-contribution-programme` (React) ; 77 requêtes vers melenchon2027.fr + kit FontAwesome tiers ; `networkidle` en 2,4 s en fibre. | VÉRIFIÉ (`m2027-ch12-s1.mobile.audit.json`, `.deep.json`) |
| **Bandeau cookies Complianz opt-in au premier écran** (« ACCEPTER / REFUSER / VOIR LES PRÉFÉRENCES »), Matomo `matomo.lafranceinsoumise.fr` ; cookie **`cf_clearance`** posé par Cloudflare (indice d'un challenge géré sur le domaine, à garder en tête pour les aperçus WhatsApp du T4). | VÉRIFIÉ |
| **Aucune ancre par mesure** : 12 `div.mesure` sans attribut `id` ; l'URL la plus fine est la section. `rel=canonical` par section. | VÉRIFIÉ (`m2027-ch12-s1.html`) |
| **Une seule image OG, identique sur les deux pages auditées** (livre et ch. 12 s1) : `CONSTRUCTION-PROG-1920.png` (1920 × 1080, 276 Ko), `og:description` = chapeau de la section. Aucun bouton de partage de page ; seuls liens « WhatsApp / Telegram » = chaînes de diffusion de JLM. | VÉRIFIÉ |
| **Aucun champ de recherche dans le lecteur.** La recherche WordPress `?s=règle verte` fonctionne (renvoie ch. 12 s1, ch. 13 s4, ch. 18 s3…) mais n'est pas exposée. | VÉRIFIÉ (curl) |
| Aucun glossaire/lexique (0 occurrence dans le HTML) ; explication = chapeau + encadré « À savoir » ; FALC **2022** dans le menu. | VÉRIFIÉ |
| Ni manifest, ni service worker ; aucun PDF de l'édition 2025 (le seul PDF lié est le programme NFP 2024). | VÉRIFIÉ |
| Arrivée par lien : fil d'Ariane (Table des matières › partie › chapitre) + liste des sections du chapitre, mais bandeau cookies, en-tête « Construction du programme » dupliqué, aperçu générique. | VÉRIFIÉ (capture) |
| `programme.lafranceinsoumise.fr` redirige vers `/programme2025/livre/`. La page annonce une **actualisation** du programme à partir des ~24 000 contributions (20 mai – 20 juin 2026). | VÉRIFIÉ, https://melenchon2027.fr/synthese-des-contributions/ |

Implication : le lecteur officiel est le **texte de référence**, pas un outil de terrain. Il ne propose ni atome de partage, ni recherche, ni explication de termes, ni hors-ligne. Tout ce que nous ferons de plus fin que la section est inédit côté officiel.

### 2.2 aec2027.fr — « annoncé », mais par qui ?

Page : https://aec2027.fr/ (captures `aec2027-home.mobile.png` + J0 `aec2027.fr.html`, SHA-256 `97e93e23abb3822a`).

| Fait | Statut |
|---|---|
| HTML de 7 231 octets, **inchangé depuis le 1er septembre 2026 15:03 GMT** (`Last-Modified`, ETag `"1c3f-65a6d38f87fa5"`) ; **aucun script**, aucune analytics, une image (`assets/tortues_sagaces_par_hello_melro.png`), Montserrat via Google Fonts, `theme-color #8B24D9`. | VÉRIFIÉ |
| `site.webmanifest`, `favicon-32x32.png`, `apple-touch-icon.png` référencés sur `www.aec2027.fr` → **404** ; `/favicon.ico` = icône 16 × 16 2 couleurs de 198 octets (icône par défaut) ; `/sitemap.xml` 404 ; `/assets/` 403. | VÉRIFIÉ |
| `og:url` et `twitter:url` → `lafranceinsoumise.fr/avenir-en-commun-programme-2027` : **404** ; `og:image` / `twitter:image` → **404**. | VÉRIFIÉ |
| JSON-LD : `PoliticalParty`, `WebPage` (« 9 chapitres », `numberOfPages: 9`, `datePublished 2026-01-15`, `dateModified 2026-05-01`), `Event` « Élection présidentielle 2027 » **du 23 avril au 7 mai 2027** (le calendrier retenu au plan est 18 avril / 2 mai). `meta date 2027-04-23`. | VÉRIFIÉ (contenu) ; contradiction avec §3.4 du plan |
| `robots.txt` : `Crawl-delay : 60`, `Disallow : /*calendar*`, `/*guestbook*` (gabarit d'hébergeur). En-têtes `x-anubis-*` vides (proxy anti-bot Anubis présent, inactif). | VÉRIFIÉ |
| **RDAP** : enregistré le **7 mai 2026** via **SAS Ligne Web Services (LWS)**, titulaire « Ano Nymous » (anonymisation Afnic), expiration **7 mai 2027**, DNS `ns2x.lwsdns.com`, IP 213.255.195.51 (mutualisé LWS). melenchon2027.fr est, lui, derrière Cloudflare avec hébergeur Scaleway (mentions légales). | VÉRIFIÉ (`aec2027-rdap.json`) |
| **Aucun lien vers aec2027.fr** depuis melenchon2027.fr (accueil, livre, construction du programme, synthèse), ni depuis l'accueil de lafranceinsoumise.fr. | VÉRIFIÉ (grep sur les HTML) |
| Recherches web « aec2027.fr », « aec2027 Avenir en commun application », « L'AEC application La France insoumise », « tortues sagaces », annonces Action Populaire / Discord : **aucune annonce** ; seul résultat = la page elle-même. La formule « tortue sagace » est de JLM lui-même (X, 3 février 2022). Le Discord et Action Populaire ne sont pas indexés : absence d'annonce ≠ preuve d'absence. | PROBABLE (recherche web, US-only) |
| Illustration : cinq tortues lavande tenant des pancartes « J L M 2027 », mégaphone, style cartoon ligne noire, crédit « Hello Melro ». Cohérente avec la tortue de campagne (lavande, ventre crème). **Analyse seulement, jamais de réutilisation.** | VÉRIFIÉ (capture) |

**Lecture.** Deux hypothèses restent compatibles avec les faits : (a) une réservation précoce par une équipe proche de la campagne (indices : titre « | La France Insoumise », illustration créditée dans le style de campagne, vocabulaire JLM) ; (b) une initiative militante ou opportuniste sans mandat (indices : hébergement mutualisé anonymisé à 1 an, SEO de gabarit avec cibles en 404, dates d'élection fausses, « 9 chapitres » ≠ 18 chapitres du livre, zéro lien officiel). **Aucun indice technique ne prouve un projet d'application en cours** (pas de bundle, pas de manifest, pas d'API). Conséquence : on garde la veille (§6) mais on cesse de raisonner comme si « l'app officielle de lecture » était acquise ; le positionnement doit tenir **avec ou sans** aec2027.fr.

À reporter dans `decisions.md` / `01-faits.md` (non fait ici, hors périmètre) : requalification du fait « aec2027.fr = domaine officiel LFI ».

### 2.3 laec.fr — l'édition 2022 par le Discord Insoumis

Pages : https://laec.fr/ , /sommaire , /recherche , /section/35/etablir-la-garantie-demploi , /s35m286/ , /visuels , /page/mentions-legales (captures `laec-*.mobile.png`).

| Fait | Statut |
|---|---|
| « Version en ligne – Réalisée par le Discord insoumis », « initiative indépendante », « Le contenu du site n'engage que l'équipe de LAEC.fr, mais pas l'Union Populaire dans son ensemble » ; mentions légales : « Site à l'initiative du Discord Insoumis ». **Ce n'est pas un site officiel** : c'est le précédent exact de notre ligne « projet militant indépendant » (D0.14). | VÉRIFIÉ |
| « Texte © Éditions du Seuil, 2021 » : l'édition 2022 était sous copyright éditeur, contrairement à l'édition 2025 (CC BY-NC-SA 4.0). | VÉRIFIÉ |
| Structure : **14 chapitres, 86 sections** (`/section/<n>/<slug>`, `/chapitre/<n>/…`, `/partie/<n>/…`), mesures numérotées jusqu'à **683** (`data-measure-seq`, s86 = 15 mesures) ; chaque mesure a un **lien court direct** `/s35m286/`, une modale, un bouton « Partager », la **page du livre papier** (« Page 79 »). | VÉRIFIÉ |
| Partage : Facebook + Twitter (`intent/tweet`) seulement, texte figé « Voici une des sections de l'#AvenirEnCommun pour laquelle je vais voter #Melenchon2022 » ; **pas de WhatsApp, pas de `navigator.share`**. `og:image` **par section** `static/visuels/s<n>.png` 1200 × 628 (s1 = 100 Ko, s35 = 73 Ko, s86 = 96 Ko ; s87 404) ; `og:url` vide, `twitter:site` = `@yourtwitterid` (gabarit non rempli). `/visuels` : **21 JPG faits main** (`s1m1.jpg` … `s4m21.jpg`). | VÉRIFIÉ (3 images échantillonnées → « 86 images » PROBABLE) |
| Recherche serveur plein texte (`/recherche/?q=`) : résultats par section avec extrait, 1,2 s ; **insensible aux accents** (« ecologie » = « écologie » = 38 sections) mais **multi-mots en OU** (« règle verte » → 43 sections sur 86 : imprécis) ; CTA « Vous approuvez ce programme ? Soutenir » au-dessus des résultats. | VÉRIFIÉ |
| Navigation : « Au hasard ! », section suivante/précédente, préface de la partie ; aucune progression mémorisée ; ni manifest ni service worker (404) ; aucun cookie, un seul tiers (kit FontAwesome). | VÉRIFIÉ |
| Stack : Django (relancé 2021, Symfony à l'origine), Bootstrap, nginx 1.14.2, en-têtes de sécurité (`X-Frame-Options DENY`, HSTS). Polices Roboto, Montserrat, Apotek Comp ; couleurs `#3F2682`, `#EF6464`, `#515151` (identité 2016-2022). | VÉRIFIÉ |
| RDAP : enregistré le 29 décembre 2016 (OVH), contact administratif « Actions Insoumises », **expiration le 16 septembre 2026** (renouvellement automatique inconnu). | VÉRIFIÉ (`rdap.nic.fr`) ; sort du domaine PROBABLE |

Implication : laec.fr a validé en 2022 le **modèle « une URL courte par mesure + image par section + page du livre »** et le **ton « fait par des militants, n'engage pas le mouvement »**. Il est périmé (édition, hashtags, identité) et s'arrête à Facebook/Twitter. Son équipe (Discord Insoumis) est un destinataire naturel du dataset (§7).

### 2.4 avenir-en-commun.net — la « proposition de refonte » et son simulateur IA

Pages : https://avenir-en-commun.net/ , /programme , /harmonie-humains-nature , /simulateur (captures `aecnet-*.mobile.png`, parcours `aecnet-simulateur.step1…4`, `.loading`, `.result`).

| Fait | Statut |
|---|---|
| Site statique Cloudflare Pages (`server: cloudflare`, `cf-cache-status: HIT`, `robots.txt` = « content signals » Cloudflare), domaine enregistré le **25 mai 2026** chez Cloudflare Registrar ; footer « © 2026 - Proposition de refonte ». Thème sombre `#121212`, **Montserrat**, wordmark « MÉLENCHON2027 » et **logo Φ** (`LFI_Logo.png`, ancienne identité) : deux éléments de la ban list. | VÉRIFIÉ |
| Contenu : accueil, `/programme` (4 piliers), **4 pages piliers** avec « orientations stratégiques » reformulées et citations (Marx, Gary), `/simulateur`. **Aucune URL de chapitre, de section ou de mesure**, aucune recherche, aucune balise OG, aucun manifest. Partage FB/X **vers l'accueil** même depuis une page pilier. Embed YouTube sur l'accueil → cookies `YSC`, `VISITOR_PRIVACY_METADATA` posés **sans consentement**. | VÉRIFIÉ (`aecnet-home.deep.json`) |
| **Simulateur « populaire »** : 4 étapes, **20 champs** (sexe, tranche d'âge, statut pro, temps de travail, revenu net individuel, foyer, revenu du conjoint, enfants, zone, ville/département, statut logement, loyer, chauffage, facture énergie, isolation, transport, km, carburant, abonnement, alimentation), validation `required` côté client, barre 1-4. **Aucune information sur les données, aucun consentement, aucune politique de confidentialité** sur la page. | VÉRIFIÉ (`aecnet-simulateur.html`) |
| Backend : `POST https://avenir-en-commun-melenchon2027.onrender.com/api/analyse-budget` (FastAPI/uvicorn sur Render, derrière Cloudflare, `/docs` et `/openapi.json` publics, `GET /` → `{"status":"ok","keys_loaded":9}`). Réponse attendue `{headline, bloc_travail, bloc_logement, bloc_transports, bloc_famille}` rendue par `marked.parse` (jsDelivr) : **le modèle rédige librement, aucune citation d'ID ni de source dans le contrat**, modèle et fournisseur non nommés. Message d'erreur codé en dur : « Vérifie que l'API Render est réveillée et réessaie ». | VÉRIFIÉ (`aecnet-backend-openapi.json`, source du simulateur) |
| **Comportement observé** avec un profil fictif (16:05 UTC) : `GET /` en 0,33 s (backend éveillé) ; **POST sans réponse en 120 s** dans le navigateur (spinner « Génération de votre bilan personnalisé… », page inchangée), **sans réponse en 240 s** en direct (16:07 – 16:11) ; **`/health` en timeout à 30 s juste après** (backend bloqué par la requête en cours, un seul worker) ; `/health` de nouveau OK moins de vingt minutes plus tard (relevé entre 16:15 et 16:30 UTC). Une seule requête utilisateur suffit à rendre le service indisponible pour tous. | VÉRIFIÉ (`aecnet-simulateur.flow.json`) |

Implication : le seul « chat/IA » du terrain cumule ce que le plan interdit — collecte de données sensibles (art. 9), texte généré librement, dépendance à un backend qui s'endort ou se bloque, aucune mention IA (art. 50).

> **Note datée du 10/9/2026 (panel rouge T12) — D6.10 : nous ne sommes plus sur ce terrain.** Ce paragraphe se terminait par « Notre contrat (sélection d'IDs, verbatim, zéro donnée, mode dégradé designé, **Mistral nommé**) n'est pas un raffinement, c'est l'inverse point par point. » Il n'y a plus de modèle, plus de sélection d'IDs par un modèle, plus de Mistral à nommer : le chat est **extractif pur**. Repris tel quel dans les messages de lancement (§9.4.2 prévoit d'en tirer « le fait technique » pour Mastodon et Bluesky), il annoncerait une IA que le produit n'a pas — ce que **D9.15 interdit** (« pas de mention IA sans IA »), et dont la porte prévue (`scripts/check-strings.test.ts`) ne couvre que `design/strings.json`, jamais les messages de lancement. La comparaison avec avenir-en-commun.net porte désormais sur **la collecte de données et la disponibilité**, pas sur un contrat d'IA : ce qui nous en sépare est qu'aucune donnée n'est collectée, qu'aucun texte n'est généré, et qu'il n'existe aucun backend capable de se bloquer. **« Aucune mention d'IA » est à ajouter à la liste de relecture de la ligne J-30 du calendrier §9.4.3**, le seul endroit où les six messages sont relus.

### 2.5 Découverts pendant l'audit

| Produit | Ce que c'est | Faits | Statut |
|---|---|---|---|
| **cachangequoi.fr** « Ça change quoi, pour vous ? » | Simulateur citoyen **indépendant, 100 % client** (« Rien de ce que vous saisissez ne quitte votre navigateur »), « Outil citoyen non officiel » | Couleurs 2027 (Crème `#FFFCF4`, Charbon, Violet `#4C0297`, `theme-color #330068`), Anton/Oswald/Inter ; **manifest `standalone`** (pas de SW) ; **`navigator.share` + `wa.me`** ; OG complet (1200 × 630, 140 Ko) ; Matomo auto-hébergé, **zéro cookie** ; mode nuit ; versions « express / détaillée » ; **source par mesure** (liens vers les chapitres officiels et un discours) ; section « ce que ce simulateur dit et ne dit pas » ; CTA inscription listes, parrainage, Action Populaire, don. Apache, « hébergé en France ». | VÉRIFIÉ (`cachangequoi-home.*`) |
| **programme-lfi.julien-9b2.workers.dev** | Landing d'une page sur Cloudflare Workers, « 9 ruptures » + « 831 mesures », reformulations « ce que ça change » | **Public Sans + Gowun Batang** (Google Fonts) sur Charbon avec Crème, Violet, Rouge, Jaune vif : **exactement les choix D3.1/D3.2**. Aucune URL interne, aucun partage, aucune méta OG. Contenu reformulé (pas de verbatim). | VÉRIFIÉ (`workersdev-home.*`) |
| **lafaqdelavenirencommun.com** | **Squat SEO** : WordPress « L'avenir en commun - Ensemble, construisons demain » rempli d'articles assurance/crédit/œnologie | Aucun rapport avec le programme ; le nom « la FAQ de l'Avenir en commun » est occupé par un site parasite. | VÉRIFIÉ (`lafaq-home.*`) |
| votons-2027.fr | Comparateur multi-candidats (page « Programme Mélenchon 2027 ») | Non audité (hors périmètre : multi-programmes). | PROBABLE (résultat de recherche) |

Implications : (1) **cachangequoi.fr est le meilleur produit du terrain sur « arrivée par lien » et « zéro donnée »** ; nous serons à parité, pas devant, sur ces deux points. (2) Deux projets indépendants appliquent déjà la charte 2027 avec les polices libres : **la DA ne différenciera pas**. (3) Pour le nommage (T10 J4) : « L'AEC » est pris (aec2027.fr), « la FAQ de l'AEC » est squatté, « Ça change quoi » est pris.

### 2.6 Apps de quiz type Elyze (catégorie, non auditée au navigateur)

Sources : annexe de reconnaissance (Elyze 2022 : 2 M de téléchargements, mécanique swipe sur propositions anonymisées ; discréditée en 3 semaines : biais de résultat, propositions modifiables, collecte âge/genre/code postal liés aux opinions, enquête CNIL). Apps mobiles de 2022 : aucune capture navigateur possible aujourd'hui. Tout ce qui les concerne dans la grille est **PROBABLE**. Enseignement inchangé (plan §3.5) : surprise > accord, méthode publiée, zéro collecte.

---


### 2.7 Le concurrent réel : ce que le militant fait aujourd'hui (à relever, ouvert le 10/9/2026)

> **Constat du panel rouge T12.** L'audit compare six **produits** et jamais un **comportement**. Le concurrent réel du militant à la porte n'est pas melenchon2027.fr : c'est ce qu'il fait aujourd'hui — coller le lien de section officiel, faire une capture d'écran, chercher dans l'historique de sa propre boucle WhatsApp, ouvrir Désintox, ou répondre de mémoire. **Aucun de ces gestes n'est décrit, chronométré ou évalué nulle part dans les dix-sept documents** (vérifié : aucune occurrence de « copier-coller », « capture d'écran de la mesure » ou « coût de substitution » hors des captures de personas).
>
> C'est pourtant le seul étalon qui compte. melenchon2027.fr fournit déjà une URL de section et un `og:description` égal au chapeau de section : le gain marginal de notre `/m/<id>` sur son `/s1/` est **la précision à la mesure et une image de carte** — et il doit payer l'installation d'une habitude nouvelle. Tant que ce delta n'est pas observé sur une personne réelle, la phrase de positionnement de §9.8 est une **hypothèse sur un besoin**, pas un constat sur un manque.
>
> **Protocole, 10 minutes par personne, coût marginal nul** (les 5-8 militants de la bêta fermée du J-21 sont déjà prévus) : « **montre-moi, là, maintenant, sur ton téléphone, ce que tu fais pour répondre à cette objection** » — chronométrer, compter les taps, noter l'outil utilisé, **avant toute démonstration de l'app**. Écrire ensuite le delta mesuré **en tête du tableau des différenciateurs du §5**. Si le delta est inférieur à quelques secondes, ce sont la carte image et l'aperçu de partage qui portent seuls la valeur, et le reste du positionnement doit être réécrit autour d'eux.

## 3. Grille : 6 produits × 8 critères × 3 personas

**Échelle** : 0 = absent ou inutilisable pour ce persona · 1 = partiel, détourné ou périmé · 2 = complet et immédiat. La note mesure le service rendu **tel que le persona le vit** (une recherche imprécise coûte plus à Yanis qu'à Camille ; une collecte de données coûte plus à Martine). Pour aec2027.fr, la note est celle de la page d'attente (0) ; l'attendu à la sortie est indiqué en HYPOTHÈSE. Pour *C'est écrit là*, la note est **la cible de conception** (HYPOTHÈSE, à prouver en T4/T6/T11), v2 = avec chat (D0.21).

Personas (plan T3/T11) : **Camille**, militante pressée (munition en 10 s, envoie dans une boucle) · **Yanis**, 22 ans (reçoit un lien, veut comprendre et renvoyer en 30 s) · **Martine**, indécise méfiante (veut la source, ne veut rien donner).

Abréviations : M27 = lecteur officiel · AEC27 = aec2027.fr · LAEC22 = laec.fr · AECNET = avenir-en-commun.net · QUIZ = apps type Elyze · CIBLE = *C'est écrit là* · CCQ = cachangequoi.fr (ligne 7, hors grille demandée).

### 3.1 Une URL par mesure

| Produit | Camille | Yanis | Martine | Justification | Statut |
|---|---|---|---|---|---|
| M27 | 1 | 1 | 1 | URL par section (`/chapitre12/s1/`), aucune ancre sur les 12 `div.mesure` : on envoie toujours la section entière | VÉRIFIÉ |
| AEC27 | 0 | 0 | 0 | Page d'attente, toutes routes 404 ; attendu à la sortie : ≥ 1 (lecture) | VÉRIFIÉ / HYPOTHÈSE |
| LAEC22 | 2 | 2 | 2 | Lien court par mesure `/s35m286/` + modale + page du livre ; mais édition 2022 (683 mesures) | VÉRIFIÉ |
| AECNET | 0 | 0 | 0 | 4 pages piliers, aucune URL de chapitre/section/mesure | VÉRIFIÉ |
| QUIZ | 0 | 0 | 0 | Propositions anonymisées sans permalien | PROBABLE |
| CIBLE | 2 | 2 | 2 | ID stable `c12-s01-m03` + URL courte `/m/…` sur l'édition 2025 (T1, T4) | HYPOTHÈSE |
| CCQ | 0 | 0 | 0 | Page unique ; les sources renvoient aux chapitres officiels | VÉRIFIÉ |

### 3.2 Partage image natif

| Produit | Camille | Yanis | Martine | Justification | Statut |
|---|---|---|---|---|---|
| M27 | 0 | 0 | 0 | Une seule `og:image` générique 1920 × 1080 (276 Ko), identique sur les 2 pages auditées ; aucun bouton de partage de page | VÉRIFIÉ |
| AEC27 | 0 | 0 | 0 | `og:image` → 404 sur lafranceinsoumise.fr | VÉRIFIÉ |
| LAEC22 | 1 | 1 | 1 | Image OG par **section** (`s1…s86.png` 1200 × 628, 3 échantillons) + 21 visuels faits main ; Facebook/Twitter seulement, texte « #Melenchon2022 » figé, ni WhatsApp ni Web Share | VÉRIFIÉ |
| AECNET | 0 | 0 | 0 | Aucune balise OG ; boutons FB/X vers l'accueil même depuis une page pilier | VÉRIFIÉ |
| QUIZ | 1 | 2 | 1 | Partage du **résultat** (capture, story), jamais de la proposition | PROBABLE |
| CIBLE | 2 | 2 | 2 | Carte par mesure × 3 ratios pré-générées au build + Web Share avec repli (T4) | HYPOTHÈSE |
| CCQ | 1 | 1 | 1 | Une image OG (1200 × 630, 140 Ko) + `navigator.share` / `wa.me` du résultat en texte | VÉRIFIÉ |

### 3.3 Recherche

| Produit | Camille | Yanis | Martine | Justification | Statut |
|---|---|---|---|---|---|
| M27 | 0 | 0 | 0 | Aucun champ dans le lecteur ; `?s=` WordPress fonctionne mais n'est pas exposé | VÉRIFIÉ |
| AEC27 | 0 | 0 | 0 | Rien | VÉRIFIÉ |
| LAEC22 | 2 | 1 | 1 | Plein texte serveur en 1,2 s, insensible aux accents, mais multi-mots en OU (« règle verte » → 43/86 sections) ; résultats = titres de sections 2022 + CTA « Soutenir » | VÉRIFIÉ |
| AECNET | 0 | 0 | 0 | Aucune recherche | VÉRIFIÉ |
| QUIZ | 0 | 0 | 0 | Aucune recherche | PROBABLE |
| CIBLE | 2 | 2 | 2 | Lexicale locale instantanée, normalisation FR, synonymes du glossaire. **Re-noté le 10/9/2026 (panel rouge T12) : la mesure a été faite le 9/9 et le seuil n'est pas atteint.** `rappel@5 = 0,813` (variante `A-synonymes-0.25`, `eval/retrieval-results.md`), `hit@5 = 0,986` — le seuil « ≥ 0,9 à mesurer » qui justifiait la note reste manqué, et le levier mesuré est le fichier d'alias, pas le moteur (sans synonymes, 0,77). La note reste à 2 parce que **aucun concurrent n'a de recherche locale**, pas parce que le seuil est tenu | **PROBABLE (mesuré)** |
| CCQ | 0 | 0 | 0 | Formulaire, pas de recherche | VÉRIFIÉ |

### 3.4 Glossaire / explication

| Produit | Camille | Yanis | Martine | Justification | Statut |
|---|---|---|---|---|---|
| M27 | 1 | 1 | 1 | Chapeau de section + « À savoir » ; aucun terme défini ; FALC 2022 dans le menu | VÉRIFIÉ |
| AEC27 | 0 | 0 | 0 | Rien | VÉRIFIÉ |
| LAEC22 | 1 | 1 | 1 | Préface de section + « À savoir » ; aucune définition | VÉRIFIÉ |
| AECNET | 1 | 1 | 0 | Piliers = résumés reformulés + citations ; aucune source par phrase (Martine : invérifiable) | VÉRIFIÉ |
| QUIZ | 0 | 0 | 0 | Propositions brutes anonymisées | PROBABLE |
| CIBLE | 2 | 2 | 2 | Cartes-concept dont chaque phrase est verbatim ou reformulé étiqueté, relues (T2, D0.27) | HYPOTHÈSE |
| CCQ | 1 | 1 | 2 | Infobulles, « ce que ce simulateur dit et ne dit pas », **source par mesure** (Martine : vérifiable) | VÉRIFIÉ |

### 3.5 Progression

| Produit | Camille | Yanis | Martine | Justification | Statut |
|---|---|---|---|---|---|
| M27 | 0 | 0 | 0 | Table des matières ; aucune trace de lecture | VÉRIFIÉ |
| AEC27 | 0 | 0 | 0 | Rien | VÉRIFIÉ |
| LAEC22 | 0 | 1 | 0 | « Au hasard ! », suivante/précédente ; rien de mémorisé | VÉRIFIÉ |
| AECNET | 0 | 0 | 0 | Barre 1-4 du formulaire seulement | VÉRIFIÉ |
| QUIZ | 1 | 2 | 1 | Swipe + compteur + résultat = cœur du produit ; score opaque (Martine) | PROBABLE |
| CIBLE | 1 | 1 | 1 | **Re-noté le 10/9/2026 (panel rouge T12) : la justification était périmée.** « Défis par lien (D0.18) » a été retiré par **D5.13** (niveau 2, aucun état personnel dans l'URL) et « La carte des 89 » écartée par **D5.14** faute d'une seule voix. Il reste une jauge plate et un `localStorage {sections:[…]}` : **1/1/1**, au niveau de laec.fr et sous les apps de quiz sur le persona jeune | **PROBABLE (mesuré)** |
| CCQ | 0 | 1 | 0 | Express / détaillée, résultat ; rien de mémorisé | VÉRIFIÉ |

### 3.6 IA et contrôle des sources

0 = pas d'IA **ou** IA non contrôlée ; 1 = IA avec sources affichées ; 2 = IA qui ne fait que sélectionner du verbatim, refus designé, mention IA.

| Produit | Camille | Yanis | Martine | Justification | Statut |
|---|---|---|---|---|---|
| M27 | 0 | 0 | 0 | Aucune IA | VÉRIFIÉ |
| AEC27 | 0 | 0 | 0 | Inconnu | VÉRIFIÉ |
| LAEC22 | 0 | 0 | 0 | Aucune IA | VÉRIFIÉ |
| AECNET | 0 | 0 | 0 | Le modèle rédige librement (`marked.parse`), aucune source dans le contrat, modèle non nommé, 20 champs personnels sans information, aucune réponse en 240 s | VÉRIFIÉ |
| QUIZ | 0 | 0 | 0 | Pas d'IA ; score opaque | PROBABLE |
| CIBLE | 0 | 0 | 0 | **Re-noté le 10/9/2026 (panel rouge T12) : la colonne v2 n'existe plus.** D6.10 a supprimé l'IA à l'exécution en v1 **et en v2** ; il n'y a plus de modèle, plus de sélection d'IDs par un modèle, plus de Mistral à nommer. La note tombe à 0 comme tout le monde. Ce qui reste, et qui n'est pas rien, se dit autrement : **aucune IA du tout — ce qui s'affiche est un extrait du programme désigné par son identifiant, jamais un texte généré** | **VÉRIFIÉ (D6.10)** |
| CCQ | 0 | 0 | 0 | Pas d'IA ; calcul client documenté | VÉRIFIÉ |

### 3.7 Hors-ligne / PWA

| Produit | Camille | Yanis | Martine | Justification | Statut |
|---|---|---|---|---|---|
| M27 | 0 | 0 | 0 | Ni manifest ni service worker ; aucun PDF de l'édition 2025 | VÉRIFIÉ |
| AEC27 | 0 | 0 | 0 | Manifest référencé → 404 | VÉRIFIÉ |
| LAEC22 | 0 | 0 | 0 | `/manifest.json`, `/sw.js` 404 ; renvoi au livre papier | VÉRIFIÉ |
| AECNET | 0 | 0 | 0 | Statique sans manifest/SW ; le simulateur dépend d'un backend | VÉRIFIÉ |
| QUIZ | 1 | 1 | 1 | App native : fonctionne installée, mais installation obligatoire | PROBABLE |
| CIBLE | 2 | 2 | 2 | PWA : corpus 62 Ko gz + index + glossaire ; app complète sans SW (T4/T7) | HYPOTHÈSE |
| CCQ | 1 | 1 | 1 | Manifest `standalone`, pas de service worker | VÉRIFIÉ |

### 3.8 Arrivée par lien sans contexte

| Produit | Camille | Yanis | Martine | Justification | Statut |
|---|---|---|---|---|---|
| M27 | 1 | 1 | 1 | Fil d'Ariane + sections du chapitre ; mais bandeau cookies au premier écran, aperçu générique, en-tête dupliqué | VÉRIFIÉ |
| AEC27 | 0 | 0 | 0 | « Merci de patienter » | VÉRIFIÉ |
| LAEC22 | 2 | 1 | 1 | Numéro, chapitre, partie visibles en un écran, zéro bandeau ; mais tout parle de 2022 (« c'est quelle élection ? ») | VÉRIFIÉ |
| AECNET | 1 | 1 | 0 | Pas d'aperçu OG ; « ← retour au programme » ; « Proposition de refonte » en pied de page seul indice de non-officialité, Φ + « MÉLENCHON2027 » (Martine : « c'est officiel ou pas ? ») | VÉRIFIÉ |
| QUIZ | 0 | 1 | 0 | Le lien mène au store : installation avant tout | PROBABLE |
| CIBLE | 2 | 2 | 2 | Variante « arrivée par lien » de chaque écran (D0.19), aperçu par mesure, aucun bandeau (aucun traceur non nécessaire, D0.22) | HYPOTHÈSE |
| CCQ | 2 | 1 | 2 | OG complet, badge « Outil citoyen non officiel », « rien ne quitte votre navigateur », mode nuit ; Yanis : le formulaire avant toute récompense | VÉRIFIÉ |

### 3.9 Synthèse (somme sur 8 critères, maximum 16)

| Produit | Camille | Yanis | Martine | Lecture |
|---|---|---|---|---|
| M27 lecteur officiel | 3 | 3 | 3 | Le texte, rien autour |
| AEC27 (aujourd'hui) | 0 | 0 | 0 | Inconnu ; attendu ≈ M27 amélioré (HYPOTHÈSE) |
| LAEC22 | 8 | 7 | 6 | Le meilleur outil militant existant, périmé |
| AECNET | 2 | 2 | 0 | Contre-exemple IA et données |
| QUIZ (Elyze) | 3 | 6 | 3 | Fort sur Yanis, mort sur la confiance |
| **CIBLE v1** | **11** | **11** | **10** | **Recalculé le 10/9/2026 (panel rouge T12)** après re-notation de §3.3 (justification corrigée), §3.5 (2 → 1 sur le persona jeune) et §3.6 (colonne v2 supprimée, v2 = 2 → 0). Les totaux « 13 / 15, 14 / 16, 13 / 15 » étaient arithmétiquement faux depuis D5.13 et D6.10, et `14-risques.md` §7 — qui avait pourtant relevé sept écarts entre documents — n'avait pas vu celui-là |
| CCQ (ajouté) | 5 | 5 | 6 | Meilleur du terrain sur confiance et arrivée par lien |

Les scores CIBLE ne valent rien tant que T4 (aperçus réels), T6 (seuils IA) et T11 (tests humains) ne les ont pas convertis en VÉRIFIÉ ; ils servent à voir **où** l'écart se joue : URL/mesure, image/mesure, recherche, glossaire, hors-ligne. Sur « progression », le terrain est vide sauf les quiz ; sur « arrivée par lien » et « zéro donnée », cachangequoi.fr fixe déjà la barre.

---


> **Ce que cette grille mesure, et ce qu'elle ne mesure pas (ajouté le 10/9/2026, panel rouge T12).** Les huit critères sont **la liste des fonctionnalités de la cible** : URL par mesure, image par mesure, recherche, glossaire, progression, IA, hors-ligne, arrivée par lien. Une grille où le produit non construit devance de plusieurs points le meilleur produit réel, sur des critères qu'il a lui-même choisis, **mesure une couverture, pas une préférence**. Deux critères manquent, et ce sont ceux où le terrain est le plus exigeant :
>
> | Critère manquant | Note honnête de la cible aujourd'hui | Qui fait mieux |
> |---|---|---|
> | **Dit ce que la mesure change concrètement pour moi** | **0 à 1** — la promesse « comprendre en trois minutes » n'a été éprouvée que sur `link/?id=c12-s01-k01` (la règle verte), c'est-à-dire sur l'une des 15 sections sur 89 couvertes par les 5 cartes-concept existantes. L'expérience majoritaire — une mesure **sans** carte — n'est ni spécifiée ni testée | cachangequoi.fr, concédé au §5 |
> | **Donne une raison d'ouvrir une deuxième fois** | **0** — aucun mécanisme de retour n'est construit, par décision (D0.18, D0.22), et la thèse d'usage qui justifie ce refus n'était pas posée comme falsifiable avant H-LAN-13 | les apps de quiz, sur le persona jeune |
>
> Les écrire est ce qui rend la grille utile : sans elles, elle est une feuille de route déguisée en audit.

## 4. Phrase de positionnement (brouillon)

> **Périmé le 9/9/2026 : la version arrêtée est en §9.8.** L'audit a requalifié l'officialité d'aec2027.fr (§2.2) et le bench v2 a retiré l'IA de l'exécution (D6.10, §9.1) : les deux moitiés de la phrase ci-dessous ont bougé. Ce paragraphe est conservé pour la trace du raisonnement.

Version de travail (plan T10), corrigée par l'audit :

> **melenchon2027.fr, c'est le texte. aec2027.fr, si elle sort, c'est la lecture officielle. Nous, c'est l'endroit où un indécis comprend une idée du programme en 3 minutes, et où un militant trouve sa munition sourcée — la mesure exacte, son image, son lien — en 10 secondes, hors-ligne, sans compte et sans rien donner.**

Variantes courtes à tester en T11 (une seule survivra, sur chaque carte de partage) :

- « Comprendre l'Avenir en commun en 3 minutes. Le citer en 10 secondes. »
- « Chaque mesure a son lien, son image, sa source. »
- « Le programme, mot pour mot, expliqué et prêt à envoyer. »

Ce que la phrase **ne dit pas** (volontairement) : « officiel », « IA », « quiz », « application ». Ce qu'elle doit rester compatible avec : la ligne « projet militant indépendant » (D0.14) et le précédent laec.fr (« n'engage que l'équipe »).

---

## 5. Différenciateurs concrets prouvés par l'audit

| # | Différenciateur | Preuve par l'audit (état du terrain) | Ce qui reste à prouver chez nous |
|---|---|---|---|
| 1 | **Une URL courte et une carte image par mesure, sur l'édition 2025** (~837 propositions) | Officiel : 0 ancre par mesure, 1 image OG identique sur les pages auditées. laec.fr : URL par mesure mais édition 2022, image par section seulement, 21 visuels à la main. avenir-en-commun.net et cachangequoi.fr : 1 image ou 0. | T1 (IDs stables), T4 (aperçus WhatsApp/Telegram réels, taille du Worker, build vs runtime) |
| 2 | **Recherche instantanée, locale, tolérante** (accents, pluriels, synonymes du glossaire), qui marche hors-ligne | Officiel : aucun champ. laec.fr : serveur, OU multi-mots (« règle verte » = 43/86 sections). Les autres : rien. | **Mesuré le 9/9** (`eval/retrieval-results.md`, jeu ayant servi au réglage, H-IA-6) : `hit@5 = 0,986`, `rappel@5 = 0,813` — **le moteur manque une question sur cinq au sens du rappel@5**, et le seuil « ≥ 0,9 » du plan n'est pas atteint. À dire tel quel, jamais « 80 % du travail » |
| 3 | **Glossaire sourcé phrase à phrase** (verbatim / reformulé étiqueté, relu) | Aucun produit ne définit un seul terme ; le seul « explicatif » (piliers d'avenir-en-commun.net) est reformulé sans source. | T2 : ≥ 30 entrées, 0 affirmation non couverte, 5/5 réexpliquées par un non-politisé |
| 4 | **Aucune IA du tout** : ce qui s'affiche est un extrait du programme désigné par son identifiant, jamais un texte généré ; **zéro donnée** *(réécrit le 10/9/2026, panel rouge T12 — la ligne vendait un contrat d'IA supprimé par D6.10 et nommait Mistral)* | L'unique IA du terrain rédige librement, ne cite rien, collecte 20 champs personnels sans information, ne répond pas en 240 s et se bloque pour tous. | D6.10 ; T7 (carte des journalisations) ; règle de build « pas de mention IA sans IA » (D9.15) |
| 5 | **Hors-ligne complet** (corpus 62 Ko gz + index + glossaire + cartes) | Aucun produit n'a de service worker ; cachangequoi.fr a un manifest sans SW ; l'officiel n'a même pas de PDF 2025. | T4 (matrice in-app), T7 (versionnage du corpus) |
| 6 | **Arrivée par lien sans contexte** : aperçu par mesure, zéro bandeau, contexte en un écran | Officiel : bandeau cookies + aperçu générique. avenir-en-commun.net : aucun aperçu. **cachangequoi.fr fait déjà bien** (OG + badge non officiel + zéro cookie) : parité à atteindre, pas avance. | T4 (aperçus sur le domaine final), T11 (lien ouvert depuis WhatsApp) |

Non-différenciateurs (à ne pas vendre) : la charte 2027 et les polices libres (deux projets indépendants les appliquent déjà), le « simulateur pour moi » (cachangequoi.fr l'a fait proprement), la lecture linéaire du livre (l'officiel, et peut-être aec2027.fr).

> **Ce qui reste réellement tenu, après D6.10 et la re-notation du 10/9 (panel rouge T12)** : l'URL et la carte image par mesure, le hors-ligne, le glossaire sourcé phrase à phrase (5 cartes sur 30 aujourd'hui), la riposte, et une recherche locale qui manque une question sur cinq. C'est court, c'est vrai, et **c'est ce qu'il faut écrire** plutôt qu'une ligne d'IA que le produit n'a plus.
>
> **Un mot manque, et c'est celui que le concurrent direct affiche en clair** : cachangequoi.fr écrit « **Outil citoyen non officiel** » et `author: "Site indépendant et citoyen, non officiel"` (VÉRIFIÉ, `captures/2026-09-07/prior-art/cachangequoi-home.deep.json`). Dans les 344 chaînes de `strings.json` v0.3, « officiel » apparaissait **six fois**, toujours pour renforcer l'officialité de la source (`home.link.sent_by_hint`, `q.link.hint`, `common.official_source`, `common.open_official`, `cta.official_campaign`, `chat.ai_mention`), et « non officiel » **jamais**. Le seul signal inverse était le mot « indépendant » — indépendant de quoi n'étant jamais dit, et « militant » se lisant « du mouvement » chez un non-politisé (c'est déjà la lecture de N1 : « appli de militants »). `strings.json` v0.4 crée `independence.unofficial` = « Site non officiel. » — **une mention d'éditeur, du même genre que la ligne d'hébergeur, pas un disclaimer de contenu (D0.1 tient)** — à accoler au wordmark sur tout écran atteint par un lien et dans la bande de signature de toute carte partagée (`attribution.card_maker`).

---

## 6. Scénario de pivot si aec2027.fr sort

**Signaux de veille** (à vérifier à chaque étape puis chaque semaine, script `curl -sI https://aec2027.fr/` + diff) : changement de `Last-Modified` (`Tue, 01 Sep 2026 15:03:34 GMT`) ou d'ETag (`"1c3f-65a6d38f87fa5"`) ; apparition de scripts, d'un `site.webmanifest` réel, d'un `sitemap.xml` ; lien depuis melenchon2027.fr ou lafranceinsoumise.fr ; changement de titulaire/hébergeur au RDAP ; nouvelle édition du livre sur melenchon2027.fr (invariants T1 en échec = alerte).

**Ce qu'on garde quoi qu'il arrive** (tout ce qui n'est pas « lire ») : cartes-concept et glossaire sourcés ; carte image + URL courte par mesure ; recherche locale hors-ligne ; riposte (T8) ; « arrivée par lien » ; chat citation-first (v2) avec page publique « exactitude » ; zéro donnée ; ligne d'indépendance et wordmark propre (D0.14, D0.17).

**Ce qu'on lâche ou reformule selon ce qu'aec2027.fr apporte** :

| Si aec2027.fr sort avec… | On lâche | On fait |
|---|---|---|
| une lecture par chapitre/section (le plus probable) | la lecture linéaire comme surface principale ; l'accueil « table des matières » | `rel=canonical` et « Lire dans le programme officiel » vers aec2027.fr au lieu de melenchon2027.fr ; notre écran section = verbatim + concept + carte, jamais un lecteur concurrent |
| des URLs et des images par mesure | la carte de partage comme différenciateur n° 1 | on lie leur URL comme source canonique ; nos cartes restent (autre objet : comprendre, riposter), on compare les aperçus réels en T4 |
| une nouvelle structure éditoriale (« 9 chapitres » ?) ou une édition actualisée | nos IDs figés sur la structure 2025 | table de correspondance ancienne → nouvelle structure dans `data/`, re-crawl (T1), badge « à jour au » ; les cartes-concept survivent (elles pointent des passages, pas des positions) |
| une recherche | rien | on garde : la nôtre est locale et hors-ligne ; on mesure les deux sur le jeu T6 |
| un glossaire officiel | notre glossaire « rédigé par nous » sur les termes couverts | on **remplace** nos définitions par les leurs (verbatim, attribution) et on offre les nôtres (§7) |
| un chatbot | le chat v2 s'il n'est pas **mesurablement** meilleur sur le harnais T6 (0 invention, refus, latence) | on publie la comparaison sur la page « exactitude » ; sinon on retire le chat et on garde l'extractif (résultat légitime, D0.21) |
| une demande de retrait ou un désaveu | la charte et le nom | rebrand light (D0.17), l'app reste en ligne |

**Ce qui ne change pas le plan** : aec2027.fr ne sort pas avant le gel de mars 2027, ou reste une page d'attente → on continue, en pointant vers melenchon2027.fr.

---

## 7. « Dataset + glossaire offerts » (D0.28) — note d'audit

L'audit **renforce** la décision : quatre projets indépendants (laec.fr, avenir-en-commun.net, cachangequoi.fr, la landing workers.dev) ont chacun **ré-extrait le programme à la main**, avec des structures incompatibles (683 mesures 2022 numérotées / 4 piliers / « 9 ruptures » / « 831 mesures ») et des reformulations non sourcées. Un `data/aec-2025.json` public (IDs stables, SHA-256 par section, règle de comptage 831/837, licence CC BY-NC-SA avec attribution « La France insoumise – L'Avenir en commun ») est le premier du genre et sert tout l'écosystème.

Destinataires, dans cet ordre : (1) l'équipe numérique de la campagne / LFI (canal à identifier : aucun contact public sur aec2027.fr, titulaire anonymisé) ; (2) le **Discord Insoumis**, qui édite laec.fr (contact `discord-insoumis.fr`, domaine à renouveler avant le 16 septembre 2026) ; (3) l'équipe de cachangequoi.fr (sources par mesure : notre dataset leur donne les IDs). Conditions : don sans contrepartie ni accord formel (compte de campagne, plan §3.4), jamais conditionné à une reprise ou à une mention ; le glossaire offert reste étiqueté « rédigé par nous, relu par… » (T2). Moment : après T1 (invariants mesurés) pour le dataset, après T2 (≥ 30 entrées) pour le glossaire ; annonce dans le dépôt public (`data/LICENSE`, README « réutiliser ces données »).

---

## 8. Nommage

> **État (9 septembre 2026, T10, VÉRIFIÉ sur pièces).** Sprint de nommage tenu : 60 candidats générés en trois familles, notés sur une grille à 5 critères (0-2 chacun, total sur 10), 8 finalistes vérifiés au RDAP (Afnic pour le `.fr`, Verisign pour le `.com`) et par recherche web, 3 noms recommandés, tous libres en `.fr`. Le domaine n'est pas encore acheté (D0.13 : achat après ce sprint, ~8 €/an, seule dépense du projet). La décision est à consigner dans `decisions.md` (D10.2) après la réponse à la question §8.5.

### 8.1 Méthode

**Trois familles** (60 candidats, chacun livré avec domaine, calembour hostile et proposition de wordmark ; liste complète dans le journal de session) :

1. *Le geste de marché* — la phrase que le militant dit en tendant le téléphone : « c'est écrit là », « c'est dedans », « tiens, lis », « va voir », « c'est marqué », « cite-moi »… (19 noms).
2. *La fidélité* — l'objet même du produit, le texte exact : « mot pour mot », « mot exact », « le verbatim », « par écrit », « ligne par ligne », « texte intégral »… (21 noms).
3. *La tortue* — la mascotte (D0.12) sans la dessiner : « ténacité », « carapace », « pied à pied », « cistude », « sans hâte », « persiste »… (20 noms).

**Grille de notation** (0-2 par critère) :

| Critère | 0 | 2 |
|---|---|---|
| Clarté pour un indécis qui arrive par lien WhatsApp, sans contexte (D0.4) | le nom ne dit rien du produit | le nom posé au-dessus d'une carte de mesure se comprend sans explication |
| Fierté du militant qui le dit à voix haute sur un marché | gêne, mot savant, à épeler | se dit comme on parle, deux à trois syllabes |
| Résistance au calembour hostile (ce qu'un adversaire en ferait en titre) | retournement immédiat et réutilisable à chaque actualité | rien de mieux que l'attaque standard sur le chiffrage, à laquelle l'app répond |
| Distinctivité face à aec2027.fr, laec.fr, cachangequoi.fr, melenchon2027.fr et aux noms civic-tech génériques (« Pol », « Politiko », « Présidoscope ») | expression rebattue, gabarit question déjà pris, collision de marque | aucun voisin, aucune collision trouvée |
| Qualité du domaine `.fr` | forme exacte prise, tirets obligatoires, > 14 caractères | forme exacte libre, ≤ 11 caractères, sans tiret, dictable |

**Éliminatoires appliquées avant notation** :

- tout nom contenant « mesure » (« Trouve la mesure », « La Mesure », « Chaque mesure », « Bonne mesure ») : le calembour « démesure » est prêt pour un titre, un préfixe de deux lettres retourne le wordmark ;
- les noms de tortue qui perdent à l'oral ou au premier détournement : « Cistude » (cystite), « Testude » (testicule), « Trois pas » (trépas), « Écaille » / « Éclaille » (« ça s'écaille », réutilisable à chaque défection), « Partir à point » (« partez »), « Sans hâte » (« l'urgence sociale peut attendre »), « Tortuto » (mascotte enfantine, D0.32) ;
- les collisions trouvées : « Dis voir » (Éditions Dis Voir, maison d'édition active, Paris 10e, `disvoir.com`, VÉRIFIÉ), « Le Verbatim » (marque de supports de stockage), « Pleine page » (éditeur bordelais, PROBABLE), « Cite-moi » (association Cité Moi et marque de vêtements CITE MOI, Toulouse, radiée en décembre 2025 ; `citemoi.com` déposé en avril 2026, PROBABLE) ;
- les noms qui frôlent l'officialité ou le titre du livre (« Lexique commun », « Le Texte », « Dans le programme ») et les trois mots génériques (« Clé de lecture », « Preuve à l'appui », « Demande au texte »).

**Vérifications** (9 septembre 2026, 07:37 UTC, VÉRIFIÉ) : `curl -s https://rdap.nic.fr/domain/<nom>.fr` (HTTP 404 = libre, 200 = déposé, avec registrar et type de titulaire) et `https://rdap.verisign.com/com/v1/domain/<nom>.com` (informatif : le `.com` ne sera pas acheté, D0.2). Recherche web « <nom> application / politique / marque » pour chaque finaliste : résultats **PROBABLE** (moteur anglophone, base INPI non consultée ; à faire cinq minutes avant l'achat, classes 9, 41, 42).

### 8.2 Les huit finalistes

| # | Nom | Domaine | Clarté | Fierté | Calembour | Distinct. | Domaine | **Total** | RDAP `.fr` | RDAP `.com` | Recherche web (PROBABLE) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **C'est écrit là** | `cestecritla.fr` | 2 | 2 | 2 | 2 | 1 | **9** | 404 — libre | 404 — libre | Rien : ni app, ni émission, ni marque ; expression courante. Voisins : `cestecrit.fr` et `cest-ecrit.fr` pris (200) ; `cest-ecrit-la.fr` et `ecritla.fr` libres. |
| 2 | **C'est dedans** | `cestdedans.fr` | 1 | 2 | 1 | 2 | 2 | **8** | 404 — libre | 404 — libre | Rien trouvé. Le calembour (« dedans… le mur », allusion carcérale) est de comptoir, pas de titre. |
| 3 | **Tiens, lis** | `tienslis.fr` | 1 | 2 | 2 | 2 | 1 | **8** | 404 — libre | 404 — libre | Rien trouvé (`tiens-lis.fr` libre aussi). Réserve : le groupe « nsl » se dicte mal (« tienlis » ?). |
| 4 | C'est marqué | `cestmarque.fr` | 1 | 2 | 1 | 2 | 1 | 7 | 404 — libre | 404 — libre | Rien trouvé. Sans accent, le domaine se lit « c'est marque » ; « y a marqué pigeon ? » est un retournement facile. |
| 5 | Par écrit | `parecrit.fr` | 1 | 1 | 1 | 2 | 2 | 7 | 404 — libre | 200 — pris (Gandi SAS, déposé en 2005, expire le 18/4/2027, site injoignable) | Rien en app ni média. « Par écrit, jamais par les actes » est l'attaque standard ; registre un peu administratif. |
| 6 | Mot exact | `motexact.fr` | 1 | 1 | 1 | 2 | 2 | 7 | 404 — libre | 404 — libre | Aucune app ni marque ; connotation technique (« mot clé exact », Google Ads). L'autocollant « INEXACT » sur le wordmark est trop facile. |
| 7 | Pied à pied | `piedapied.fr` | 0 | 2 | 2 | 2 | 1 | 7 | 404 — libre | 200 — pris (GoDaddy, déposé le 11/3/2024, expire le 11/3/2027, site actif) | Rien trouvé (résultats : course à pied, podologie). Nom de riposte pure : ne dit rien à l'indécis. |
| 8 | Mot pour mot | `mot-pour-mot.fr` | 2 | 2 | 1 | 1 | 0 | 6 | 404 — libre **avec deux tirets seulement** ; `motpourmot.fr` 200 — pris (OVH, titulaire personne privée « Le Papa de Jojo », blog littéraire « Mot pour Mot », déposé le 6/4/2024, expire le 6/4/2027) | 200 — pris (`motpourmot.com`, Spaceship, depuis 2011) ; `mot-pour-mot.com` en *redemption period* | Aucune émission ni marque identifiée. Dicté sur un marché, le nom envoie chez le blog littéraire : éliminatoire tant que `motpourmot.fr` est pris (à surveiller au 6/4/2027). |

Lecture des scores :

- Le podium est entièrement dans la famille *geste de marché* : ce sont les seuls noms qui disent à la fois le produit (un texte qu'on montre) et l'usage (on tend le téléphone). La famille *fidélité* plafonne à 7 parce que l'indécis n'y voit qu'une promesse abstraite ; la famille *tortue* plafonne à 7 (« Pied à pied ») parce qu'elle ne dit rien du programme et parce que quatre de ses noms sur cinq perdent au calembour.
- « C'est écrit là » est le seul 9 : il gagne sur les quatre critères de sens et ne cède qu'un point sur le domaine (onze caractères sans apostrophe ni accent, mais dictable tel qu'il se prononce).
- « Mot pour mot » reste dans la liste parce qu'il est déjà dans `design/strings.json` et dans une variante de positionnement (§4) : il y reste comme *formule*, pas comme nom, tant que la forme sans tiret appartient à un tiers.
- « Cite-moi » (7 avant recherche) sort de la liste sur la collision Cité Moi / CITE MOI ; « Dis voir » (7 avant recherche) sur les Éditions Dis Voir.

### 8.3 Trois noms recommandés (libres en `.fr` le 9/9/2026)

**1. C'est écrit là — le programme, mot pour mot, prêt à envoyer.**

- Pourquoi : le geste exact du marché (on tend le téléphone, « c'est écrit là »), la fonction *vérifier* et la promesse verbatim (voice §0) en trois mots ; le tu est implicite ; « là » désigne ce lien, cette carte, ce chapitre. Aucune officialité revendiquée, compatible avec « projet militant indépendant » (D0.14) et avec l'attribution « La France insoumise – L'Avenir en commun » (D3.3).
- Wordmark : `C'EST ÉCRIT` / `LÀ` sur deux lignes, Public Sans 900 capitales, Charbon ; `LÀ` en Violet #4C0297 sur Crème, Violet 200 #E5CBFF sur Charbon (D3.4). Compaction `ÉCRIT LÀ` pour le favicon, la bande de signature des cartes 1200 × 630 et les petites surfaces. Accents et apostrophe conservés dans le wordmark, jamais dans le domaine.
- Calembour hostile : « c'est écrit là… mais pas financé là » — l'app répond par le lien vers le chapitre de financement ; « écrit là, comme dans le Coran » est trop tordu pour un titre.
- Chaînes portant le nom : « *C'est écrit là* est un projet militant indépendant » (`independence.about`) exige le nom en italique par CSS, comme le titre du livre (voice §1), sinon les deux « est » se télescopent ; `about.intro` passe tel quel. Le placeholder de nom d'app a été retiré de `design/strings.json` en v0.2 : le nom y est écrit en clair (D10.2), et `turtle.alt` est devenu `mascot.alt`.

**2. C'est dedans — chaque mesure du programme, son lien, sa source.**

- Pourquoi : la réponse en deux mots à « c'est dans le programme, ça ? » ; deux syllabes criables ; domaine exact de dix caractères, le plus propre des huit. Fonction *trouver*.
- Wordmark : `C'EST DEDANS` sur une ligne (ou `C'EST` / `DEDANS` sur deux), `DEDANS` en Violet, `C'EST` en Charbon.
- Calembour hostile : l'allusion carcérale (« et lui bientôt aussi ») reste une blague de comptoir. Vraie limite : le nom seul ne dit pas *dedans quoi* ; il a besoin de la carte de mesure sous le wordmark, ce qui est le cas de tout aperçu OG et de toute page mesure, mais pas d'une affiche ni d'un QR nu.

**3. Tiens, lis — comprendre une idée du programme en trois minutes.**

- Pourquoi : le geste du tract avec QR (T8) ; impératif au tu, le militant est le héros (voice règle 9) ; aucun calembour réutilisable trouvé (« tiens, lys » est tordu). Fonction *comprendre*.
- Wordmark : `TIENS, LIS` sur une ligne, `LIS` en Violet, virgule et `TIENS` en Charbon.
- Réserve : le domaine se dicte moins bien que les deux autres (« tiens lis, attaché, sans virgule ») ; « *Tiens, lis* est un projet militant indépendant » demande la même italique que le n° 1.

### 8.4 Ce que les écartés enseignent

- Le mot « mesure » ne peut pas entrer dans le nom (« démesure ») ; il reste libre dans les phrases (« chaque mesure a son lien »).
- Les noms de tortue restent du domaine de l'illustration (D0.12) : ils parlent au militant, pas à l'indécis, et la fable prête son vocabulaire à l'adversaire (« trépas », « partez », « s'écaille », « repliés dans leur carapace »).
- Les gabarits question (« Tu savais », « C'est écrit où », « Dis voir ») sont le terrain de cachangequoi.fr et offrent une phrase à trous à l'adversaire ; on garde le gabarit pour la mécanique « Tu savais que c'était dedans ? » (D5.6), pas pour le nom.
- Les expressions figées les plus fortes (« Mot pour mot », « Dans le texte », « Le Verbatim ») sont déjà occupées en `.fr` sans tiret ou par une marque : la forme à tirets crée une confusion à chaque dictée.

### 8.5 Question à trancher (T10, avant l'achat du domaine)

**Tranchée le 9 septembre 2026 (D10.2) : « C'est écrit là », `cestecritla.fr`, acheté chez OVHcloud à 08:12 UTC, zone Cloudflare active à 09:10 UTC.** La question telle qu'elle était posée, conservée pour la trace : lequel des trois achètes-tu en `.fr` : **C'est écrit là** (`cestecritla.fr`), **C'est dedans** (`cestdedans.fr`) ou **Tiens, lis** (`tienslis.fr`) ? Le choix engage le wordmark (T3) et les trois chaînes de `design/strings.json` qui portent le nom (`independence.about`, `mascot.alt`, `about.intro`), l'attribution restant inchangée. À confirmer en même temps : (a) le nom étant une phrase, il est mis en italique par CSS partout où il apparaît ; (b) on n'achète que la forme exacte sans tiret en `.fr` (~8 €, D0.13), ni `.com` ni variantes (D0.2) ; (c) une recherche INPI de cinq minutes sur le nom retenu précède l'achat, puis les aperçus WhatsApp et QR sont testés sur le domaine final (T4). Les trois points ont été tenus le 9/9 ; les aperçus ont été revérifiés sur `cestecritla.fr` (D4.4).

## 9. Plan de lancement organique J-30 → J+30

> **État (9 septembre 2026, T10 / J4).** Le nom, le domaine et la zone sont acquis (D10.2, `docs/discovery/domaine.md`) : l'app s'appelle **C'est écrit là**, elle vit sur **cestecritla.fr**. Ce chapitre transforme les contraintes datées en calendrier, puis en playbook. Il ne dépense **aucun neuron** : tout ce qui concerne l'IA est lu dans `eval/results-v2.md` (bench du 9/9 au soir, 6 713,31 / 8 000 neurons de session).
>
> Statuts : **VÉRIFIÉ** = lu à la source primaire aujourd'hui, URL donnée · **PROBABLE** = source secondaire, ou fait dépendant d'un acte à venir · **HYPOTHÈSE** = estimation de conception, méthode de levée indiquée.

### 9.0 Les sept contraintes datées

Le chapitre de conformité (`docs/discovery/11-conformite.md`, T9, même journée) instruit chacune de ces obligations en détail, avec les copies exactes et les décisions D9.x. Le tableau ci-dessous n'en retient que ce qui **date** le calendrier ; les deux documents ont été relus l'un contre l'autre et ne divergent sur aucun chiffre.

| # | Contrainte | Borne exacte | Statut | Source lue le 9/9/2026 |
|---|---|---|---|---|
| 1 | **Disponibilité** > 20 h/semaine jusqu'en mai 2027 | 20 h/semaine retenues comme plancher de calcul | DÉCISION | D0.26 |
| 2 | **Zéro publicité commerciale à fin de propagande électorale** : « Pendant les six mois précédant le premier jour du mois d'une élection et jusqu'à la date du tour de scrutin où celle-ci est acquise, l'utilisation à des fins de propagande électorale de tout procédé de publicité commerciale par la voie de la presse ou par tout moyen de communication audiovisuelle est interdite. » | **jeudi 1er octobre 2026 → dimanche 2 mai 2027** (six mois avant le 1er avril 2027) | **VÉRIFIÉ** (art. L52-1 al. 1 du code électoral, version en vigueur depuis le 20 avril 2011) | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000023883001 |
| 3 | **Silence électoral** : « A partir de la veille du scrutin à zéro heure, il est interdit de : […] 2° Diffuser ou faire diffuser par tout moyen de communication au public par voie électronique tout message ayant le caractère de propagande électorale » | Gel prudent retenu (D0.24, `scripts/silence.ts`) : **ven. 16 avril 00:00 → dim. 18 avril 20:00** et **ven. 30 avril 00:00 → dim. 2 mai 20:00**, heure de Paris | **VÉRIFIÉ** (art. L49, version en vigueur depuis le 30 juin 2020) / **PROBABLE** (dates du scrutin) | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070239/LEGISCTA000006148458/ |
| 4 | **Dates du scrutin** : dim. 18 avril et dim. 2 mai 2027 (sam. 17 avril et sam. 1er mai en Guadeloupe, Martinique, Guyane, Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin, Polynésie française) | figées seulement par le décret de convocation, non publié à ce jour | **PROBABLE** | service-public.gouv.fr (repris dans `scripts/silence.ts`, `PRESIDENTIAL_2027.status = 'PROBABLE'`) |
| 5 | **Date limite d'inscription sur les listes électorales** : le **6e vendredi précédant le 1er tour** ; dérogations (18 ans sans recensement, déménagement, naturalisation, droits recouvrés) jusqu'au **10e jour** | **ven. 12 mars 2027** (calcul sur le 18 avril) ; dérogations jusqu'au **jeu. 8 avril 2027** | **VÉRIFIÉ** (règle) / **PROBABLE** (dates, dépendantes du n° 4) | https://www.service-public.gouv.fr/particuliers/vosdroits/F34240 (page à jour au 13/8/2026) |
| 6 | **Gel de contenu** : plus une ligne de texte nouvelle, plus une mesure de plus dans un pool de jeu, plus une riposte ajoutée | **lun. 1er mars 2027** (décision de ce document ; le plan disait « mars 2027 ») | DÉCISION | PLAN-SESSION §16 |
| 7 | **Mention IA** (art. 50 du règlement (UE) 2024/1689), applicable depuis le 2 août 2026 | sans objet tant que D6.10 tient (aucune IA à l'exécution) ; le mécanisme est spécifié et prêt (`11-conformite.md` §2, D9.1) : à rétablir en trois heures si le chat revient | **VÉRIFIÉ** | https://artificialintelligenceact.eu/article/50/ |

Ce qui **n'est pas** une contrainte : le règlement (UE) 2024/900 sur la publicité à caractère politique. Il vise la publicité rémunérée ; nous n'en achetons aucune (D0.2, aucun moyen de paiement sur le compte). Sa date d'application n'a **pas** été relue à la source aujourd'hui (EUR-Lex a renvoyé un texte tronqué trois fois) : **HYPOTHÈSE**, sans effet sur le plan.

### 9.1 D6.10 : le bench v2 tranche, et il simplifie le calendrier

La porte de décision D6.9 était mécanique : *« si ≤ 35 neurons/question **et** p95 < 3 s → chat v2 en sélection pure, sinon extractif pur (D0.21) »*. Le bench du 9/9 au soir (`eval/results-v2.md`, 40 items Small 3.1 + 20 items 7B LoRA, 1 380,58 neurons) donne :

| Seuil D6.9 / plan | Cible | `mistral-small-3.1-24b` | `mistral-7b-v0.2-lora` |
|---|---|---|---|
| neurons / question (moyenne) | ≤ 35 | **34,39** ✅ | **0,25** ✅ |
| **latence p95** | **< 3 000 ms** | **4 159 ms** ❌ | **5 173 ms** ❌ |
| refus corrects (après validateur) | ≥ 0,95 | 0,875 ❌ | 0,833 ❌ |
| `liant_kind` correct (métrique ajoutée en §7.2 de `08-ia.md`) | ≥ 0,90 | **0,50** ❌ | 0,53 natif / 0,40 après validateur ❌ |
| invention après validateur | 0 | 0 ✅ | 0 ✅ |

**D6.10 (proposée, à reporter dans `decisions.md`) : extractif pur.** La porte tombe sur la latence pour les deux modèles, et deux seuils supplémentaires échouent — ce n'est pas un ratage de justesse. Le motif est net : le contrat « sélection pure » a bien supprimé l'invention en prose (0 phrase du modèle), mais le modèle choisit mal la *famille* de liant une fois sur deux : sur les 23 questions de mesures, **10 reçoivent `partiel` ou `corrige`** là où `confirme` ou `precise` était attendu (q001, q002, q003, q005, q008, q010, q012, q018, h08, h21), ce qui aurait affiché « Le programme n'en parle qu'ici : » au-dessus de mesures franches. Un liant faux est pire qu'un liant absent.

**Ce que ça change, très concrètement :**

| Brique prévue par T7 | Sort |
|---|---|
| Binding `AI` + AI Gateway `aec` + `cacheTtl` 30 j (D7.3) | **retirés de la v2** ; le gateway reste créé, vide, pour un futur bench |
| Compteur `NeuronBudget` (Durable Object, D7.4) | **retiré** : plus rien à compter |
| Turnstile sur l'écran chat (D7.6) | **retiré** : plus d'écran chat, donc plus de POST coûteux à protéger ; les 13,9 s mesurées jusqu'au jeton sur téléphone (01-faits.md) cessent d'être un problème |
| Mention IA art. 50 (D0.29), badge « IA · Mistral » | **retirés de l'interface** ; les trois variantes restent dans `strings.json`, dans `voice.md` §4 et dans `11-conformite.md` §2.3, prêtes à réafficher |
| D1 FTS5 + `q_cache` (D7.7) | ~~**conservés** : c'est le moteur de la réponse extractive côté serveur~~ ⛔ **RETIRÉS le 10/9/2026 (D13.1)** : sans modèle en ligne, **le Worker n'a rien à présélectionner**, et la ligne du dessous dit déjà que le moteur est côté client. **Aucune route serveur, aucune base D1, aucun cache de questions en v1 ni en v2** ; `d1_databases`, `migrations/` et le cron sortent du `wrangler.jsonc`. Le labo `prototypes/labo-plateforme/d1-fts5` reste une **preuve** pour un éventuel contrat v3 |
| Retrieval A côté client (D6.1) | **conservé, promu** : c'est *le* moteur |
| `AI_MODE` (D6.7), harnais, porte de CI (D6.5) | **conservés** en `off` ; la porte CI garde ses seuils de retrieval, qui deviennent les seuls seuils de qualité de réponse |
| Page `/exactitude` (D6.6) | **conservée**, contenu amendé (§10.8) |

Le budget d'exploitation passe de « 0 € sous plafond de neurons » à **« 0 € sans aucun quota consommé par question »** : à 5 000 questions/jour comme à 500 000, l'app coûte le même prix. La ligne « IA française » sort de l'argumentaire de lancement (§9.8) — et l'audit du terrain (§2.4, §3.6) montre que c'est un gain : le seul produit « IA » du terrain est un repoussoir, pas une référence.

**Condition de réouverture** (écrite maintenant pour ne pas la réinventer) : on re-benche si, et seulement si, l'un des trois arrive — (a) un modèle Mistral nouveau apparaît sur Workers AI avec un p50 annoncé < 1 s ; (b) le p95 mesuré depuis un Worker (et non depuis Node à concurrence 3, limite n° 5 de `08-ia.md` §9) tombe sous 3 s sur 40 items ; (c) le `liant_kind` dépasse 0,90 avec un prompt réduit aux six familles et deux exemples. Budget du re-bench : ≥ 40 items, ≈ 1 200 neurons, plafond dans le harnais, ligne automatique au registre (D6.5).

### 9.2 Le calendrier, du 9 septembre 2026 au 2 mai 2027

Plancher de calcul : **20 h/semaine** (D0.26 dit « > 20 h » : toute heure au-delà est de la marge, jamais du planning).

| Période | Ce qu'on fait | Heures | Jalon daté | « Fait » quand… |
|---|---|---|---|---|
| jeu. 10 – ven. 11 sept. 2026 | T11-T12 : clôture de la session, `prompt-final.md`, report de D5.13-D5.15, D6.10, D7.x, D10.2 dans `decisions.md` | 20 | **ven. 11 sept.** | le prompt final est autoportant : quelqu'un qui n'a pas suivi la session peut construire la v1 avec |
| lun. 14 sept. – dim. 27 sept. | **Socle** : dépôt d'app, Astro 5 statique (D7.2), `wrangler.jsonc` de §2 de `09-architecture.md` moins l'IA, build du corpus (`slim.<hash>.json`, 69 166 o gzip mesurés en D4.2), table des routes D5.10, CI (porte 0 neuron D6.5), `_headers` CSP | 40 | **dim. 27 sept.** | `cestecritla.fr` sert une page de section réelle à partir du corpus `d29c7422004ab27c` ; CI verte ; Lighthouse Accessibilité ≥ 95 sur une section (D3.5) |
| lun. 28 sept. – dim. 18 oct. | **Lecture et partage** : `SectionVerbatim` (D3.2), `MeasureCard`, `/m/`, `/s/`, `/c/`, `/a/`, anomalies de source (D1.8), cartes OG pré-générées au build (D4.1), kit de partage, `/diag` ; corrections 1, 6, 10, 11, 12, 18, 19 de `13-tests-humains.md` §3.11 | 60 | **dim. 18 oct.** | les 89 sections et les 837 propositions ont chacune leur URL ; les 8 liens du protocole `06-partage.md` §5 renvoient un aperçu correct sur WhatsApp, Telegram et Instagram depuis Android et iPhone (re-test de D4.4 sur le build réel) |
| lun. 19 oct. – dim. 1er nov. | **Recherche, cartes-concept, riposte** : MiniSearch variante A (D6.1) avec la tolérance trait d'union / pluriel / féminin (correction 13), 30 cartes-concept relues (D0.27), 15 ripostes + mode marché + QR au build (`10-riposte.md` §6), corrections 3, 7, 8, 13, 14, 17 | 40 | **dim. 1er nov.** | recherche : rappel@5 ≥ 0,80 et hit@5 ≥ 0,95 rejoués par la CI ; 30 cartes-concept avec zéro affirmation non couverte ; « aide-soignante » trouve « aides-soignants » |
| **lun. 2 nov. – jeu. 5 nov.** | **Test humain d'avant lancement** (`testeurs.md`, §3.12 de `13-tests-humains.md`) : ≥ 5 personnes dont ≥ 2 non-politisées, Android et iPhone, sur l'app réelle | 12 | **jeu. 5 nov.** | les 8 points du §3.12 sont levés ou infirmés par écrit ; zéro ligne rouge D0.32 ; aha < 60 s chez ≥ 3 personnes |
| ven. 6 – lun. 9 nov. | Correctifs du test humain, mentions légales (D0.15), `/confidentialite`, `/exactitude`, `/methodologie` | 20 | **lun. 9 nov.** | les trois pages existent, relues, et chaque ligne de `/confidentialite` est vraie au vu de la carte des journalisations (§6 de `09-architecture.md`) |
| **mar. 10 nov. 2026** | **v1 publique — J** | — | **J** | critères §9.3 |
| mar. 10 nov. – jeu. 10 déc. | **Playbook, phase J → J+30** (§9.4 ; la phase J-30 → J-1 est absorbée par les lignes ci-dessus : écriture des messages, repérage des canaux, bêta fermée, test humain) + correctifs à chaud | 60 | **jeu. 10 déc. (J+30)** | premier rapport N/S publié (§10.4) ; ≥ 3 groupes d'action ont le lien ; le dataset est offert aux trois destinataires (§9.6) |
| ven. 11 déc. – dim. 3 janv. 2027 | Creux de fin d'année, à mi-régime : PWA hors-ligne (D3.5 : l'app reste complète sans SW), `/verifier`, dette du test humain | 40 | **dim. 3 janv.** | l'app lue une fois se relit sans réseau ; le corpus versionné sert de clé de cache (ADR-12) |
| lun. 4 janv. – lun. 18 janv. 2027 | **v2** : écran « poser une question » servi sans IA (FAQ exacte 50 entrées → carte glossaire → **retrieval A local, et rien après**), écran de refus D6.4, `/mot/`. ⛔ **~~→ D1 FTS5 côté serveur~~ retiré le 10/9/2026 (D13.1)** : cette ligne contredisait D6.10 — sans modèle en ligne, **le Worker n'a rien à présélectionner**. Aucune route serveur, aucune base D1, aucun cache de questions en v1 ni en v2 ; le labo `d1-fts5` reste une preuve pour un éventuel contrat v3 | 40 | **mar. 19 janv. 2027** | critères §9.3 |
| mar. 19 janv. – lun. 22 févr. | **v3** : « Laquelle est ici ? » (F2) puis « Tu savais que c'était dedans ? » en lien nu (F1) — **`/defi/<n>/`, 60 tirages figés, aucune date (D13.4, 10/9/2026)** —, niveau 1 de progression, `effectiveDate()` câblé sur le **gel L49 du partage** et non plus sur les tirages (D5.8 règle 7) | 100 | **mar. 23 févr. 2027** | critères §9.3 |
| **lun. 1er mars 2027** | **Gel de contenu** | — | **gel** | plus aucune entrée ajoutée à `glossary.json`, `riposte.json`, `defis.json`, `faq.json` ; seuls restent autorisés : correction de bug, correction d'erreur factuelle, re-crawl du corpus officiel |
| lun. 1er – ven. 12 mars | **Vague inscription** : bandeau déterministe (aucun ciblage) vers service-public.gouv.fr, carte de partage « vérifie ton inscription », relais dans les mêmes canaux qu'en §9.4. Date **calculée au build** depuis le calendrier, jamais écrite en dur, avec la phrase de repli tant que le décret de convocation n'est pas publié (`11-conformite.md` §11, D9.9) | 40 | **ven. 12 mars** (6e vendredi) | le bandeau s'éteint tout seul le 13 mars à 00:00 Paris, par date, sans intervention |
| lun. 15 mars – jeu. 15 avril | Exploitation : re-crawl hebdo (D1.3), correctifs, riposte à l'actualité **dans la limite du gel** (une riposte existante peut changer de rang, pas de texte) | 100 | — | le re-crawl du lundi ne casse aucun invariant ; sinon PR de diff relue à la main |
| **ven. 16 avril 00:00 → dim. 18 avril 20:00** | **Silence 1** : `effectiveDate().silence === true` — partage, tirages, mécaniques et bandeau gelés ; **lecture, recherche, glossaire et ripostes restent ouverts** (D0.24) | 0 | **gel L49** | le test unitaire `scripts/silence.test.ts` passe sur les quatre bornes ; le wording KV `silence.share` dit la raison (« jour du vote, c'est la loi », correction 15) |
| lun. 19 – jeu. 29 avril | Entre-deux-tours : réouverture automatique le 18 avril à 20:00 Paris ; aucun contenu nouveau (gel) | 40 | — | rien à faire à la main pour rouvrir |
| **ven. 30 avril 00:00 → dim. 2 mai 20:00** | **Silence 2**, identique | 0 | **gel L49** | idem |
| à partir du lun. 3 mai 2027 | Bascule « après » : `phase === 'after'`, bandeau inscription retiré par date, page d'archive datée, dernier rapport N/S, dépôt laissé public | — | **mar. 11 mai** | l'app reste lisible et exacte sans qu'on y touche |

**Total : ≈ 610 heures sur 34 semaines**, soit 18 h/semaine en moyenne — sous le plancher déclaré de 20 h, avec 2 h/semaine de marge structurelle pour l'imprévu. Les deux blocs les plus chargés (60 h chacun : lecture-partage sur trois semaines, playbook sur quatre) sont ceux où il faut *aussi* répondre à des gens : ce sont les premiers à glisser, et le calendrier est écrit pour qu'un glissement de deux semaines sur la v1 ne touche ni le gel ni le silence.

**Ce que le calendrier a changé par rapport au plan.** Le plan visait « v1 publique avant fin octobre 2026 ». La v1 sort **deux semaines plus tard** (10 novembre) pour trois raisons datées : les 19 corrections bloquantes de `13-tests-humains.md` §3.11 (issues de la session 2 du 9/9), le test humain d'avant lancement que D11.1 rend obligatoire avant toute mise en ligne publique, et les 25 cartes-concept qui restent à écrire et à faire relire (D0.27). Aucune de ces trois raisons n'existait quand le plan a été écrit.

### 9.3 Les trois versions et leur critère de « fait »

Un critère de « fait » est une phrase qu'on peut déclarer vraie ou fausse sans discuter. Chaque version en a un par surface, plus un critère de non-régression.

**v1 — mardi 10 novembre 2026. Lire, chercher, comprendre, envoyer, répondre.**

| # | Critère | Mesuré par |
|---|---|---|
| 1 | Les 89 sections et les 837 propositions ont chacune une URL courte qui résout, et les 48 cartes statistiques leur `/a/<id>` | test de build sur `data/aec-2025.json` |
| 2 | Toute page de mesure ou de section produit un aperçu correct sur WhatsApp, Telegram et Instagram, sur Android **et** iPhone | protocole `06-partage.md` §5 rejoué à la main, grille remplie |
| 3 | La recherche locale tient rappel@5 ≥ 0,80, hit@5 ≥ 0,95, rappel@3 sections ≥ 0,90 sur les 70 questions dorées et glossaire (mesuré le 9/9 : 0,813 · 0,986 · 0,927 ; index 59,7 Ko gzip, < 1 ms), et répond en < 50 ms sur un Android milieu de gamme | `eval/retrieval.ts` en CI + une mesure terrain |
| 4 | 30 cartes-concept publiées, chacune avec zéro affirmation non couverte par un verbatim et une étiquette d'auteur avec pseudonyme de relecteur | relecture croisée (D0.27), test `glossary.test.ts` |
| 5 | 15 ripostes publiées, chacune avec sa mesure verbatim ; `rip-11` retiré ou reformulé (D5.11) ; aucune carte statistique sur une image | `riposte.test.ts` |
| 6 | Aucune ligne rouge D0.32 relevée par ≥ 5 humains dont ≥ 2 non-politisés | test humain du 2-5 novembre |
| 7 | LCP < 2,5 s en Slow 4G CPU ×4, JS initial < 100 Ko gzip, CLS < 0,1, Lighthouse Accessibilité ≥ 95 | `design/perf-budget.md`, mesure en CI |
| 8 | Zéro requête vers un tiers, zéro cookie, zéro quota consommé par visite | `deep.json` d'audit rejoué sur notre propre domaine, comme sur les concurrents en §2 |

**v2 — mardi 19 janvier 2027. Poser une question en français, sans IA.**

| # | Critère | Mesuré par |
|---|---|---|
| 1 | Une question en langage naturel reçoit une réponse en < 300 ms au p95, **sans aucun appel réseau** quand le corpus est déjà en cache | mesure Playwright hors ligne |
| 2 | Sur les 70 questions dorées et glossaire, la réponse affichée contient au moins un id attendu **dans 98,6 % des cas dans son top 5** (hit@5 mesuré 0,986) et le rappel@10 reste ≥ 0,85 | `eval/retrieval.ts`, non-régression en CI |
| 3 | Les 11 sujets absents vérifiés et les 5 entrées FAQ « absent » déclenchent l'écran de refus D6.4, jamais une affirmation sur le programme entier | `faq.test.ts` |
| 4 | Aucun écran ne dit « panne », « erreur », « indisponible », « désolé » (voice §1 règle 5) | `scripts/check-strings.test.ts` |
| 5 | L'app entière fonctionne hors ligne après une première visite, y compris la recherche et le refus | Playwright en mode offline |
| 6 | Non-régression : les 8 critères de la v1 restent vrais | CI |

**v3 — mardi 23 février 2027. Deux mécaniques, niveau 2, aucun état personnel dans l'URL.**

| # | Critère | Mesuré par |
|---|---|---|
| 1 | « Laquelle est ici ? » (`/q/<section>`) ne porte aucun état, et sa carte OG n'existe pas sur les sections sensibles (D5.12) | test de build sur la liste des sections sensibles |
| 2 | « Tu savais que c'était dedans ? » (**`/defi/<n>/`**, chemin réel, 60 tirages figés — D13.4, 10/9/2026) ne porte que l'index du tirage : aucune réponse, aucun horodatage, aucun jeton, **aucune date** (D5.15) | test d'URL + revue |
| 3 | Un index non publié affiche « ce tirage n'existe pas », jamais une réécriture silencieuse (O6, correction 18) | test |
| 4 | ~~Tous les tirages passent par `effectiveDate()`~~ → *amendé le 10/9/2026 (D13.4)* : **les 60 tirages sont figés et n'ont pas de date** ; `effectiveDate()` ne commande plus que le **gel L49 du partage** (et « la mesure du jour », hors périmètre v1) | `silence.test.ts` sur les quatre bornes |
| 5 | Aucun score, aucun classement, aucun compte « en commun », aucun point médian retournable (D5.15) | revue de `strings.json` + `check-strings.test.ts` |
| 6 | S ≥ 0,5 par mécanique sur 14 jours glissants, ou la mécanique est rétrogradée d'un niveau (§2 de `07-mecaniques.md`) | §10.4 |
| 7 | Non-régression : les critères de v1 et v2 restent vrais | CI |

**Coupe minimale**, si les 20 h/semaine ne tiennent pas : on sacrifie dans cet ordre — v3 en entier (le niveau 0 « lecture augmentée + partage » est un résultat légitime, `07-mecaniques.md` §2) ; puis la PWA hors ligne (D3.5 : « l'app est complète sans service worker ») ; puis l'écran « poser une question » de la v2 — **et il faut le dire avec le chiffre mesuré, pas avec un chiffre inventé (corrigé le 10/9/2026, panel rouge T12)** : la recherche de la v1 place un identifiant attendu dans son top 5 dans **98,6 % des cas** (`hit@5`) et **manque une question sur cinq au sens du rappel@5** (`0,813`, `eval/retrieval-results.md`, jeu ayant servi au réglage, H-IA-6). « 80 % du travail » n'était mesuré nulle part, était écrit deux fois, et servait à justifier le sacrifice de **la demande verbatim de l'utilisateur** (`prompt-final.md` §1 : « permettre de poser une question sur n'importe quel terme ou concept du programme »). C'est le seul endroit du dossier où un ordre de sacrifice reposait sur un nombre sans source. La position de cet écran dans l'ordre de sacrifice est **à réexaminer avec ce chiffre-là sous les yeux**. On ne sacrifie jamais : le verbatim exact, l'URL par mesure, l'aperçu de partage, la ligne d'indépendance, `/confidentialite`, `/exactitude`, le gel L49.

### 9.4 Playbook organique — J = mardi 10 novembre 2026

**J-30 = dimanche 11 octobre 2026. J+30 = jeudi 10 décembre 2026.**

#### 9.4.1 La règle qui commande tout : on amorce par les militants, jamais par le public

D0.4 dit que les militants sont P0 (usage principal **et** relais) et que les jeunes et les indécis arrivent **par le partage**. Le playbook en tire une règle unique : **nous n'adressons jamais un non-militant.** Un militant envoie une mesure à sa cousine ; nous n'envoyons rien à sa cousine. Conséquence pratique : chaque canal reçoit de quoi *renvoyer*, jamais de quoi *recruter*.

Trois règles de forme, valables sur tous les canaux :

1. **On ne partage jamais la racine.** Un lien posté est toujours un lien profond — une mesure (`/m/…`), une riposte (`/r/…`), une carte-concept (`/c/…`). La racine est l'écran du militant (D0.19) ; postée à froid, elle produit une session `entry = direct` qui ne mesure rien et n'explique rien.
2. **Un suffixe de canal, jamais un suffixe de personne.** `?s=wa | tg | ig | qr | copy` dit *par quel tuyau* le lien est arrivé, rien d'autre. Aucun identifiant de campagne, aucun UTM, aucun jeton aléatoire (D5.4, D5.8 règle 3).
3. **Un post = un lien = une phrase.** Pas de fil, pas de capture d'écran de l'app, pas d'emoji (voice §1 règle 6). La capture d'écran d'une app est un objet mort ; le lien est vivant.

#### 9.4.2 Les canaux, ce qu'on y met, ce qu'on n'y met pas

| Canal | Qui y est | Ce qu'on y poste | Forme | Cadence | Ce qu'on n'y poste jamais |
|---|---|---|---|---|---|
| **Le groupe d'action** (réunion physique, puis sa boucle) | 8-20 militants, dont les 5 testeurs | Le lien d'une riposte utile à la porte-à-porte de la semaine, avec la phrase du militant, pas la nôtre | Oral en réunion + un message dans la boucle, `?s=wa` | 1 fois au lancement, puis quand une riposte sert vraiment | Une demande de partage ; un « faites tourner » |
| **Boucles WhatsApp / Telegram militantes** | groupes d'action voisins, boucles thématiques | Une mesure exacte sur le sujet du jour, avec son aperçu | Lien nu + une phrase, `?s=wa` / `?s=tg` | ≤ 1 par semaine et par boucle | Un message identique dans dix boucles le même jour (c'est ce qui fait lire « spam ») |
| **Discord Insoumis** | la communauté qui édite laec.fr | Une présentation dans le salon adéquat : ce que c'est, ce que ce n'est pas, le dépôt public, le dataset offert (§9.6) | Un message, un lien de dépôt, un lien profond d'exemple | 1 message au lancement + les réponses aux questions | Une annonce dans plusieurs salons ; un ton de communiqué |
| **QR sur tracts** (`/r/t/<theme>` et `/r/<id>`, générés au build, `10-riposte.md` §5.5) | les passants d'un stand, d'une boîte aux lettres | Le QR d'un thème (logement, retraites, salaires) sur le tract commandé par le groupe sur **materiel.actionpopulaire.fr** — *nous ne produisons pas de tracts*, nous fournissons un carré à imprimer | SVG/PNG téléchargé depuis la page « Imprimer », mention CC sous le carré, `?s=qr` | Une planche par thème, distribuée aux groupes | Un QR vers la racine ; un QR imprimé avant que le domaine ne soit définitif (il l'est depuis le 9/9) |
| **Mastodon** (instances francophones) | quelques centaines de comptes militants et civic-tech | Le fait technique, pas la mesure : « 837 propositions extraites, une URL par mesure, dataset CC BY-NC-SA, code MIT » | Un pouet, un lien de dépôt | 1 au lancement, 1 à chaque version | Une série de pouets ; une menace de fil |
| **Bluesky** | presse, chercheurs, veille politique | Le même fait technique, plus la page `/exactitude` | Un post, un lien | 1 au lancement, 1 par version | Toute réponse à un compte adverse |

Trois canaux sont **exclus par décision** : la publicité payante partout (§9.5) ; les commentaires sous les publications de comptes officiels (parasitage, et cela « engage le mouvement », ce que la charte interdit, D0.11) ; les groupes Facebook de sympathisants non militants, qui sont exactement le public qu'on ne doit pas adresser en direct.

#### 9.4.3 Le calendrier J-30 → J+30

| Jour | Date | Action | Critère de passage |
|---|---|---|---|
| **J-30** | dim. 11 oct. | Écrire les six messages (un par canal) et les trois messages du don (§9.6). Les faire relire par un militant et un non-politisé (D0.27) | six brouillons existent, aucun ne dépasse cinq lignes |
| **J-28** | mar. 13 oct. | Repérer les canaux : nom du salon Discord adéquat, boucles où l'on est déjà présent, adresse du contact numérique de la campagne | une liste écrite, avec pour chaque canal la personne qui poste (c'est toi, ou un militant qui accepte) |
| **J-21** | mar. 20 oct. | **Bêta fermée** : lien non listé (`beta.cestecritla.fr`, `noindex`) envoyé à 5-8 militants du groupe d'action | 5 personnes ont ouvert et répondu par écrit |
| **J-8** | lun. 2 nov. | **Test humain d'avant lancement** (§9.2), 5 personnes dont 2 non-politisées | les 8 points du §3.12 sont tranchés |
| **J-3** | sam. 7 nov. | Correctifs, `/confidentialite`, `/exactitude`, mentions légales ; indexation autorisée (`robots.txt` ouvert, `sitemap.xml` publié) | les trois pages sont en ligne et relues |
| **J** | **mar. 10 nov.** | **Mise en ligne.** Un seul geste : un message dans la boucle du groupe d'action, avec **une riposte**, pas l'app. Rien d'autre ce jour-là | le lien est cliqué par ≥ 5 personnes ; aucune erreur 5xx |
| **J+2** | jeu. 12 nov. | Réunion du groupe d'action (le 11 est férié) : cinq minutes, on montre le geste — chercher un mot, envoyer la mesure — et on distribue les QR thématiques | ≥ 3 militants ont envoyé un lien à quelqu'un depuis leur téléphone, devant nous |
| **J+3** | ven. 13 nov. | **Discord Insoumis** : le message de présentation + le dataset offert (§9.6, message 2) | le message est posté dans un seul salon ; les questions reçoivent une réponse le jour même |
| **J+4** | sam. 14 nov. | **Mastodon + Bluesky** : le fait technique, un lien de dépôt | 1 post par réseau, aucune relance |
| **J+7** | mar. 17 nov. | Premier relevé N/S (§10.4). On ne publie pas encore de taux : on regarde les volumes bruts et on vérifie que les événements arrivent | `session_start` et `section_verbatim_view` existent tous les deux dans le dataset |
| **J+10** | ven. 20 nov. | **Boucles voisines** : deux boucles militantes reçoivent une mesure sur le sujet de la semaine | ≤ 2 boucles ; message écrit par le militant, pas par nous |
| **J+14** | mar. 24 nov. | **Message 1 du don** : équipe numérique de la campagne (§9.6). Message 3 : cachangequoi.fr | envoyés, sans relance programmée |
| **J+21** | mar. 1er déc. | Revue des 19 corrections : lesquelles sont réapparues dans le vrai usage ? | liste écrite des régressions observées |
| **J+30** | **jeu. 10 déc.** | **Bilan** : premier rapport N/S publié (§10.4), recalibrage des seuils (D5.1 le prévoit explicitement à J+30), décision « on continue tel quel / on coupe une mécanique » | le rapport tient sur une page et donne un chiffre par tranche, avec son intervalle |

#### 9.4.4 Ce qui compte comme réussite à J+30

> **Corrigé le 10/9/2026 (panel rouge T12) : le critère n° 1 était arithmétiquement inatteignable avec la distribution planifiée, et il contredisait la règle de publication écrite trois pages plus loin.** §10.5 interdit de publier un taux sous **200 sessions échantillonnées** ; à `RATE = 0,1`, cela fait **≈ 2 000 arrivées par lien sur 7 jours**, soit ≈ 285 par jour tenus pendant tout le mois. Or §9.4.2 et §9.4.3 planifient : un groupe d'action de 8 à 20 militants, deux boucles voisines à J+10, un message Discord, un pouet Mastodon, un post Bluesky, **aucune promotion payante**, et la règle explicite « nous n'adressons jamais un non-militant ». **Aucune ligne du dossier n'estime le trafic attendu** (vérifié : le seul chiffre d'audience existant est un seuil de succès juridique, 50 000 visiteurs sur 7 jours, `11-conformite.md` §5.5). En cascade, §10.7 (« S < 0,5 sur 14 jours ⇒ la mécanique est rétrogradée, sans discussion ») et le critère 6 de la v3 reposent sur la même règle des 200 sessions : ils ne produiront jamais de verdict, ou en produiront un sur du bruit.
>
> **Trois corrections, toutes à 0 €.** (1) **Passer `RATE` à 1,0 pour la v1** (§10.5) : le plafond est de 100 000 points/jour et une session typique fait 3-4 points, soit 25 000 à 33 000 sessions/jour avant saturation — à ce volume, l'échantillonnage à 10 % ne protège rien, il **détruit la seule mesure du projet**. La règle de garde existe déjà et le taux est déjà inscrit dans `app_version` : le passage est réversible et traçable. (2) **Réécrire le critère 1 en comptes absolus**, avec un plancher écrit à l'avance. (3) **Déplacer la publication du taux N** à la première fenêtre de 7 jours qui atteint réellement 200 sessions ; à défaut, verdict par **observation humaine sur 5 personnes**.

Trois chiffres, et **aucun** n'est un nombre de visites :

1. **≥ 300 sessions arrivées par lien sur 30 jours, dont ≥ 180 atteignent un verbatim de section** *(comptes absolus, réécrit le 10/9 ; l'ancien libellé était « N sur la tranche `measure` ≥ 0,6 »)*. Le **taux** N ≥ 0,6 reste la cible, mais il n'est **publié** que sur une fenêtre de 7 jours atteignant 200 sessions échantillonnées. C'est la promesse du produit : le lien reçu fait lire le texte.
2. **Au moins trois groupes d'action distincts** ont envoyé au moins un lien — mesuré non par l'app (impossible, et c'est voulu) mais **en le demandant aux gens**. Le playbook a une part qui ne s'instrumente pas.
3. **Zéro capture retournable** : aucune capture d'écran de l'app utilisée contre le programme, aucune des quatre hontes D0.32 signalée par un militant.

Un quatrième chiffre est un **signal d'alerte**, pas un objectif : si `entry = direct` dépasse `entry = link`, c'est qu'on a communiqué au lieu de faire relayer, et le playbook a raté.

### 9.5 Zéro promotion payante : la règle écrite une fois pour toutes

L'article L52-1 al. 1 interdit, **du 1er octobre 2026 au 2 mai 2027**, « l'utilisation à des fins de propagande électorale de tout procédé de publicité commerciale par la voie de la presse ou par tout moyen de communication audiovisuelle » (VÉRIFIÉ, Légifrance, 9/9/2026). Deux points méritent d'être écrits noir sur blanc :

- **La règle ne nous coûte rien** : il n'y a aucun moyen de paiement sur le compte Cloudflare (D0.31) et aucune ligne budgétaire (D0.2). L'interdiction légale et la contrainte de coût disent la même chose. Le seul euro du projet est le domaine (~8 €/an, D0.13, dépensé le 9/9).
- **Elle vaut aussi par personne interposée.** Demander à un militant de « booster » un post, accepter qu'un groupe finance une promotion, ou publier un contenu sponsorisé par un tiers, c'est la même chose que de payer soi-même. Le playbook §9.4 le rend impossible par construction : aucun canal n'a de bouton payant, et l'ordre d'amorçage passe par des gens, pas par des plateformes.
- **Ce qui reste permis** : tout l'organique — poster, relayer, imprimer un QR sur un tract payé par ailleurs par un groupe d'action dans le cadre de sa propre comptabilité, parler en réunion. Le tract lui-même relève du compte de campagne du groupe qui le commande, pas du nôtre : nous fournissons un carré à imprimer, jamais un tract (`10-riposte.md` §5.5). T9 a instruit le cas précisément (`11-conformite.md` §9.1, D9.8) : un tract imprimé et distribué à la main n'est ni de la presse, ni de l'audiovisuel, ni un procédé de publicité commerciale — il reste licite, **sauf la veille et le jour du scrutin** (L49 1°, distribution de documents).
- **Statut de l'interprétation** : que « tout moyen de communication audiovisuelle » englobe la publicité payante sur les réseaux sociaux est l'usage constant de la CNCCFP et de la jurisprudence, mais ce n'est pas dans le texte lu aujourd'hui — **PROBABLE**. Cela n'a aucune conséquence : nous n'achetons rien, ni avant, ni après le 1er octobre.

### 9.6 « Dataset + glossaire offerts » (D0.28) : trois destinataires, trois messages

Rappel de la note d'audit (§7) : quatre projets indépendants ont ré-extrait le programme à la main, avec des structures incompatibles. `data/aec-2025.json` (1 033 ids stables, 89 empreintes SHA-256, règle de comptage 831/837, CC BY-NC-SA 4.0 avec attribution « La France insoumise – L'Avenir en commun ») est le premier corpus vérifiable de l'édition 2025.

**Conditions, identiques pour les trois** : don sans contrepartie, sans accord formel, jamais conditionné à une reprise ni à une mention (le compte de campagne l'interdirait autrement, plan §3.4) ; une seule relance, jamais deux ; le glossaire reste étiqueté « rédigé par nous, relu par … » ; aucun de ces messages ne demande quoi que ce soit.

*Note de registre* : le dossier est écrit au tu ; ces trois messages disent « vous » parce qu'ils s'adressent à une **équipe**, au pluriel — ce n'est pas le vouvoiement de politesse que D0.25 écarte dans l'interface.

> **Ajout du 10/9/2026 (panel rouge T12) — « Message 0 », à envoyer 72 h AVANT le lancement.** Le §9.6 confond deux gestes qui n'ont ni le même objet ni le même calendrier : le **don de corpus** (qui peut rester à J+14 — la justification « ne pas ressembler à une demande d'autorisation » est bonne) et la **notification d'usage de la charte** (qui doit **précéder** la mise en ligne). Le message 1 est aujourd'hui calé à **J+14, mardi 24 novembre**, la v1 sortant le **10 novembre** : la première fois que LFI voit l'app, elle est publique, indexée et déjà partagée, et le seul canal qui leur reste est public. C'est exactement le scénario qui fait passer **R3** de « courriel privé » à « article » — et `14-risques.md` R3 reconnaît par ailleurs qu'« aucune détection automatique n'est possible » et que « le seul dispositif est de rendre le contact facile », alors qu'aucun contact n'est ouvert avant le lancement. Aggravant : le canal lui-même est **PROBABLE** (« deux entrées plausibles… à confirmer par une question posée sur le Discord ») — au moment du lancement, on ne saurait même pas où écrire.
>
> **Message 0 — 72 h avant J. Il ne demande rien.** Ce que c'est ; ce que ce n'est pas (« site non officiel, une personne, aucun lien avec la campagne ») ; quelles couleurs et quelles polices sont utilisées et pourquoi (charte publique, alternatives gratuites explicitement proposées par la charte, **aucun logo**) ; l'adresse de contact ; et une phrase de sortie : « **si vous préférez que je change quelque chose, dites-le-moi, je le fais** ». Archiver l'envoi **et** la réponse ou l'absence de réponse dans `captures/<date>/` : c'est la pièce qui, le jour d'un désaveu, transforme un article en échange privé. Identifier le canal **avant** — le message 2 (Discord) est déjà prévu « cette semaine, avant le 16 septembre » : le faire servir à cela.

**Message 1 — équipe numérique de la campagne / LFI.** Canal à identifier : aucun contact public sur aec2027.fr (titulaire anonymisé, §2.2) ; deux entrées plausibles, le formulaire de contact de melenchon2027.fr et le canal numérique d'Action Populaire — **PROBABLE**, à confirmer par une question posée sur le Discord (message 2) avant d'envoyer.

> Objet : un corpus vérifiable de L'Avenir en commun 2025, libre de droits d'usage, à votre disposition
>
> Bonjour,
>
> J'ai extrait l'intégralité de L'Avenir en commun édition 2025 depuis melenchon2027.fr : 18 chapitres, 89 sections, 837 propositions, chacune avec un identifiant stable et une empreinte SHA-256 qui permet de vérifier qu'aucun mot n'a bougé. Le fichier est public, sous CC BY-NC-SA 4.0 avec l'attribution « La France insoumise – L'Avenir en commun », et un script hebdomadaire signale toute modification du site officiel.
>
> Je vous l'offre tel quel, sans rien demander en échange : ni mention, ni lien, ni accord. **Ce corpus est public et disponible à tous sous CC BY-NC-SA ; je ne demande ni ne reçois rien en retour.** Si cela vous est utile pour un lecteur, une recherche ou une application, prenez-le. Si vous voyez une erreur d'extraction, dites-le moi, je corrige.
>
> Dépôt : https://github.com/baoleka/cestecritla — le fichier est `data/aec-2025.json`, la méthode est dans `docs/discovery/03-corpus.md`.
>
> Je fais aussi un petit site indépendant qui s'appuie dessus, cestecritla.fr. Ce n'est pas l'objet de ce message et il n'engage évidemment que moi.

**Message 2 — Discord Insoumis (équipe de laec.fr).** *À envoyer en priorité* : le domaine laec.fr expire le **16 septembre 2026** au RDAP (§2.3) ; s'ils reprennent l'édition 2025, autant qu'ils l'aient avant, et s'ils laissent tomber, autant le savoir.

> Bonjour,
>
> laec.fr a été le meilleur outil militant de 2022 : une URL par mesure, une image par section, la page du livre papier. J'ai regardé comment il était fait avant de commencer le mien.
>
> J'ai extrait l'édition 2025 en entier : 18 chapitres, 89 sections, 837 propositions, un identifiant stable par proposition et une empreinte SHA-256 par section pour vérifier la fidélité. C'est en CC BY-NC-SA 4.0, attribution « La France insoumise – L'Avenir en commun », dans un dépôt public : https://github.com/baoleka/cestecritla (`data/aec-2025.json`).
>
> Si vous relancez laec.fr sur l'édition 2025, prenez-le, il vous fera gagner les deux semaines les plus ingrates. Aucune contrepartie attendue. J'ai aussi 30 fiches de vocabulaire (règle verte, bifurcation écologique, Constituante…) où chaque phrase est soit du verbatim, soit une reformulation étiquetée comme telle : elles sont à vous aussi, avec la mention de qui les a relues.
>
> Une question au passage, si quelqu'un sait : aec2027.fr est-il un projet de la campagne ? Je n'ai trouvé aucune annonce, et je préfère ne pas doublonner un travail officiel.

**Message 3 — équipe de cachangequoi.fr.**

> Bonjour,
>
> J'ai passé une journée à auditer les outils existants sur le programme 2025 avant de commencer le mien, et cachangequoi.fr est le seul qui fasse deux choses vraiment bien : le calcul reste dans le navigateur, et chaque résultat renvoie à sa source.
>
> Vos sources pointent vers les chapitres officiels, qui n'ont pas d'ancre par mesure. J'ai extrait le programme avec un identifiant stable par proposition (837) et une empreinte SHA-256 par section : cela vous permettrait de pointer la mesure exacte plutôt que le chapitre. C'est public et libre d'usage, CC BY-NC-SA 4.0, attribution « La France insoumise – L'Avenir en commun » : https://github.com/baoleka/cestecritla (`data/aec-2025.json`).
>
> Servez-vous si c'est utile, sans contrepartie. Et si vous voyez une erreur d'extraction, je corrige avec plaisir.

**Moment.** Message 2 : **cette semaine**, avant le 16 septembre. Messages 1 et 3 : **J+14 (mardi 24 novembre)** — après que la v1 existe, pour qu'on puisse voir ce que le corpus donne, et pas avant, pour que le don ne ressemble pas à une demande d'attention avant lancement.

### 9.7 Déclencheurs de pivot si aec2027.fr sort

Les signaux de veille sont listés en §6 (`Last-Modified` `Tue, 01 Sep 2026 15:03:34 GMT`, ETag `"1c3f-65a6d38f87fa5"`, apparition de scripts ou d'un `site.webmanifest` réel, lien depuis melenchon2027.fr ou lafranceinsoumise.fr, changement de titulaire au RDAP, nouvelle édition du livre). Ce qui manquait, et que T10 ajoute : **quand on regarde, qui décide, en combien de temps, et ce qui bouge**.

**Surveillance** : `scripts/watch-aec2027.ts` — ⚠️ **script inexistant, à produire** (VÉRIFIÉ, `ls scripts/`, 10/9/2026 ; annoncé comme livrable dans `prompt-final.md` §16, socle, ≈ 1 h) —, 0 € et 0 neuron, une requête `HEAD` par jour depuis le cron GitHub Actions qui fait déjà le re-crawl hebdo (D1.3) ; il ouvre une *issue* quand un des cinq signaux change. Le re-crawl du lundi surveille déjà l'autre moitié du risque : une actualisation du programme officiel casse un invariant et ouvre une PR de diff.

| Déclencheur (signal observé) | Délai de décision | On garde | On lâche ou on reformule | Effort |
|---|---|---|---|---|
| **A. aec2027.fr sert une lecture par chapitre/section** | 72 h | tout le §5 (URL et carte par mesure, recherche locale, glossaire sourcé, riposte, arrivée par lien, hors-ligne) | la lecture linéaire comme surface principale et l'accueil « table des matières » ; `rel=canonical` et « Lire dans le programme officiel » basculent vers aec2027.fr | 4 h |
| **B. aec2027.fr publie des URLs *et* des images par mesure** | 1 semaine (le temps de comparer les aperçus réels sur les deux domaines, protocole §5 de `06-partage.md`) | nos cartes, dont l'objet est autre : comprendre et répondre, pas illustrer | le différenciateur n° 1 du §5 sort de l'argumentaire ; leur URL devient la source canonique citée sous chaque mesure | 6 h |
| **C. structure éditoriale nouvelle (« 9 chapitres ») ou édition actualisée** | à la PR de diff du lundi | les cartes-concept (elles pointent des passages, pas des positions) | nos ids figés : table de correspondance `data/id-map-<version>.json`, badge « à jour au », re-crawl (D1.3, ADR-12 : la version invalide tous les caches sans purge) | 2 j |
| **D. glossaire officiel** | 1 semaine | notre glossaire sur les termes non couverts | on **remplace** nos définitions par les leurs, en verbatim et avec attribution, sur les termes couverts ; on leur offre les nôtres (§9.6) | 1 j |
| **E. recherche officielle** | aucune décision | la nôtre : locale, hors-ligne, tolérante | rien ; on mesure les deux sur le jeu T6 et on publie la comparaison sur `/exactitude` | 2 h |
| **F. chatbot officiel** | 2 semaines | rien à faire : D6.10 nous a déjà retirés de ce terrain | on ne réagit pas, et surtout on ne rouvre pas le chat pour suivre. Si leur chatbot rédige des mesures, `/exactitude` explique ce que nous faisons à la place, sans les nommer | 0 h |
| **G. demande de retrait ou désaveu public de LFI** | 24 h | l'app en ligne, le corpus, le dépôt | la charte 2027 et le wordmark : rebrand light (D0.17), tokens neutres, `LÀ` en gris, aucune couleur de campagne ; la ligne d'indépendance devient plus explicite | 1 j (maquette déjà prévue au runbook T7) |
| **H. aucun signal jusqu'au gel du 1er mars 2027** | — | tout | rien ; on continue en pointant vers melenchon2027.fr | 0 h |

**Deux règles de sang-froid.** (1) Aucun pivot n'est déclenché par une rumeur, une capture ou un message : seulement par un des cinq signaux, observé et archivé (`captures/<date>/`). (2) Aucun pivot ne se décide pendant un gel L49 : entre le 16 avril et le 2 mai 2027, on note et on attend.

### 9.8 La phrase de positionnement, et trois variantes pour l'écran lien

Le brouillon du §4 disait « aec2027.fr, si elle sort, c'est la lecture officielle » et vendait l'IA. L'audit a requalifié le premier point (§2.2 : officialité non prouvée) et le bench a supprimé le second (D6.10). Ce qui reste est plus court et plus vrai :

> **melenchon2027.fr, c'est le texte officiel. *C'est écrit là*, c'est l'endroit où quelqu'un qui doute comprend une idée du programme en trois minutes, et où un militant retrouve la mesure exacte — son texte, son lien, son image — en dix secondes, hors ligne, sans compte, sans IA et sans rien laisser derrière.**

Ce que la phrase ne dit toujours pas, volontairement : « officiel », « application », « quiz », « intelligence artificielle ». Ce avec quoi elle doit rester compatible : la ligne d'indépendance (D0.14, `independence.about`), l'attribution CC (D1.11), et le précédent laec.fr (« n'engage que l'équipe »).

**Trois variantes pour `home.link.title`**, l'écran que voit une personne qui ouvre un lien reçu — le cas majoritaire (D0.4). Contraintes de `strings.json` v0.2 : **impersonnel** (D3.12 : les écrans atteints par un lien ne tutoient pas), **≤ 6 mots**, aucune promesse invérifiable.

| ID | Texte | Ce qu'elle promet | Risque |
|---|---|---|---|
| **A** (témoin, en place) | « Mot pour mot. » | la fidélité | ne dit pas le sujet ; une personne qui ne connaît pas le programme peut ne pas comprendre de quoi il s'agit avant le kicker |
| **B** | « Le passage exact, rien autour. » | la sobriété : pas de bandeau, pas de pub, pas de formulaire | « rien autour » peut se lire comme « site vide » |
| **C** | « Trois minutes pour comprendre. » | le coût d'entrée, chiffré | promet une durée : si la section est longue, la promesse est fausse. À ne retenir que si l'on mesure d'abord la longueur des 109 chapeaux au build et qu'aucun ne dépasse trois minutes de lecture (HYPOTHÈSE, non mesurée) |

**Protocole de test, imposé par l'absence d'identifiant.** Un A/B test suppose de reconnaître un visiteur : impossible ici, et refusé (D0.22). Le seul protocole honnête est **séquentiel** : une variante par build, **deux semaines chacune** à trafic comparable, N mesuré sur la tranche `measure` (§10.4).

> **Corrigé le 10/9/2026 (panel rouge T12) : ce test ne démarre pas avant le rapport J+30.** Écrit « du 10 novembre au 22 décembre », il faisait changer `home.link.title` toutes les deux semaines **pendant la seule fenêtre de mesure du projet** : §9.4.3 mesure N à J+30 sur la fenêtre du 3 au 10 décembre, et §9.4.4 en fait le critère de réussite du lancement et la base du recalibrage des seuils. Le chiffre de tête du bilan aurait donc été produit par un **écran d'arrivée délibérément modifié pendant la mesure**. La condition « à trafic comparable » est de surcroît fausse par construction : toute la poussée de diffusion est concentrée entre J et J+14, la variante A reçoit le pic et B puis C la traîne. **Règle : `home.link.title` est figée sur la variante A (déjà écrite et relue) du 10 novembre au 10 décembre.** Le test séquentiel démarre après le rapport J+30, ou il est abandonné au profit du verdict des cinq testeurs humains — ce que ce paragraphe prévoit déjà. Même règle en §10.4 : **aucune modification de l'écran 0 pendant une fenêtre de mesure de N.** Les intervalles se recouvriront presque certainement (§10.5 : ±6,8 points à 200 sessions échantillonnées) : **le verdict humain prime**, et la question posée aux testeurs est « en une seconde, tu sais ce que cette page va te donner ? ». Si les trois sont à égalité, on garde A, qui est déjà écrite et déjà relue.

## 10. Événements et métrique nord

> **État (9 septembre 2026, T10 / J4).** Ce chapitre fixe le schéma d'événements que le Worker écrit dans Analytics Engine, le calcul de la métrique nord, l'échantillonnage, ce qui n'est jamais envoyé, la rétention, puis le contenu des deux pages publiques qui en dépendent (`/exactitude`, `/confidentialite`). Il applique et **amende** D5.1 (`07-mecaniques.md` §1.2) et D7.9 (ADR-11 de `09-architecture.md`).
>
> Limites de plateforme (VÉRIFIÉ, doc Cloudflare lue le 7/9/2026, reportée en §1.2 de `07-mecaniques.md`) : 20 blobs, 20 doubles, **1 index de 96 octets au plus**, 250 points par invocation, **100 000 points écrits par jour** et **10 000 requêtes de lecture par jour** sur le plan gratuit ; échantillonnage adaptatif côté Cloudflare, d'où `SUM(_sample_interval)` et **jamais** `COUNT()`. Rétention ≈ 3 mois, non réglable.

### 10.1 Les cinq principes, avant le schéma

1. **Dédupliqué par le client, compté par le serveur** (D5.1). Chaque type d'événement est émis au plus une fois par session — et par mécanique pour les événements de jeu. Le ratio de deux comptes vaut donc une part de sessions **sans qu'aucun identifiant de session n'existe côté serveur**.
2. **Une seule requête par session** (ADR-11). Le client accumule ses compteurs en mémoire de page, avec l'état de dédoublonnage dans `sessionStorage` (`aec.s`), jamais dans un cookie ni dans `localStorage` ; il envoie **un** `POST /api/e` par `navigator.sendBeacon` au `pagehide`. Le Worker écrit alors **un point par nom d'événement présent**, au plus huit.
3. **Aucun identifiant, jamais** : ni IP, ni `User-Agent`, ni id d'appareil, de session ou de navigateur, ni horodatage rattachable à un geste (le beacon part au `pagehide`, pas au moment de l'action).
4. **Liste blanche stricte côté serveur.** Le Worker valide chaque champ contre une énumération fermée et rejette silencieusement le reste (204 quand même). Un client bricolé ne peut pas injecter de texte libre dans le dataset.
5. **Les opinions ne sont pas des données comme les autres** (RGPD art. 9). Aucune dimension ne dit ce qu'une personne pense : on compte des *lectures* et des *gestes de navigation*, jamais un accord, une réponse de jeu, un mot tapé ou un thème choisi qui trahirait une préoccupation personnelle.

Ce dispositif est conçu pour tenir l'exemption de consentement de la CNIL sur la mesure d'audience — finalité strictement limitée à la mesure d'audience pour le seul éditeur, **statistiques anonymes uniquement**, aucun recoupement avec un autre traitement, aucune transmission à un tiers, aucun suivi de navigation entre sites (VÉRIFIÉ, https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience, page du 4 juillet 2025, lue le 9/9/2026). Nous allons plus loin que l'exemption sur trois points : aucun traceur n'est écrit sur le terminal pour la mesure (`sessionStorage` sert au dédoublonnage, pas à l'identification), l'échantillonnage est de 10 %, et les requêtes de lecture sont bornées à 30 jours (D0.22). T9 va plus loin encore dans la qualification (`11-conformite.md` §6.2) : Analytics Engine écrivant **côté serveur**, il n'y a pas de « traceur » au sens de l'art. 82 de la loi Informatique et Libertés, et la question du consentement ne se pose pas — PROBABLE sur la qualification, VÉRIFIÉ sur les faits techniques.

### 10.2 Le schéma d'événements

Huit noms d'événement, en anglais, `snake_case` (convention de code du projet). `index1` = le nom de l'événement, **et rien d'autre** : c'est la clé d'échantillonnage de Cloudflare, elle ne doit jamais porter une valeur dérivée de la personne.

| # | `index1` | Émis quand | Dédoublonnage | `double3` (compteur) |
|---|---|---|---|---|
| 1 | `session_start` | premier chargement sans marqueur, ou reprise après 30 min d'inactivité | 1 par session | toujours 1 |
| 2 | `section_verbatim_view` | le composant `SectionVerbatim` est visible à ≥ 50 % pendant ≥ 1 000 ms (`IntersectionObserver`) | 1 par section | nombre de sections distinctes atteintes, plafonné à 50 |
| 3 | `measure_view` | une `MeasureCard` seule est affichée (arrivée sur `/m/…`), sans que la section soit atteinte | 1 par session | nombre de mesures distinctes, ≤ 50 |
| 4 | `search_run` | une recherche aboutit (débounce écoulé, requête ≥ 2 caractères) | 1 par session | nombre de recherches, ≤ 50 |
| 5 | `answer_served` | une question en langage naturel reçoit une réponse (v2) | 1 par session | nombre de réponses servies, ≤ 50 |
| 6 | `play_start` | premier geste réel dans une mécanique (pas l'affichage de l'écran) | 1 par mécanique | 1 |
| 7 | `play_to_read` | un `section_verbatim_view` survient avec `detail = play` après un `play_start` de la même mécanique | 1 par mécanique | 1 |
| 8 | `share_open` | la feuille de partage s'ouvre, ou le lien est copié | 1 par session et par nature d'objet | nombre d'ouvertures, ≤ 50 |

`play_complete` de D5.1 est **fusionné** dans `play_to_read` : le seul « complete » qui nous intéresse est celui qui mène au texte, et un événement de moins, c'est un point de moins par session (§10.5). `riposte` et `chat` restent des valeurs de `mechanic`, pas des événements à part.

**Dimensions.** Deux familles, et c'est le point qui fait marcher tout le reste : les **dimensions de session** sont estampillées sur **chacun** des points d'une même session — le beacon les porte une fois, le Worker les recopie sur chaque point. C'est ce qui permet de calculer un ratio par tranche sans jamais joindre sur un identifiant de session.

| Colonne | Nom | Portée | Valeurs (énumération fermée) |
|---|---|---|---|
| `blob1` | **`entry`** | session | `link` (la première URL de la session n'est pas la racine) · `direct` (racine) |
| `blob2` | `src` | session | `wa` · `tg` · `ig` · `qr` · `copy` · `none` — posé par le suffixe `?s=` du kit de partage, jamais un jeton |
| `blob3` | **`kind`** | session | nature de la page d'arrivée : `measure` · `section` · `concept` · `word` · `stat` · `riposte` · `quiz` · `challenge` · `home` |
| `blob4` | `device_class` | session | `mobile` · `desktop` |
| `blob5` | `corpus_version` | session | empreinte courte du corpus (`d29c7422004ab27c`) |
| `blob6` | `app_version` | session | `v1` · `v1.1` · `v2` · `v3` — porte aussi le taux d'échantillonnage historique (§10.5) |
| `blob7` | **`chapter`** | événement | `c01`…`c18` · `intro` · `part1`…`part4` · `-` |
| `blob8` | `detail` | événement | selon l'événement : `from ∈ {landing, browse, search, glossary, play, riposte, answer}` · `mechanic ∈ {which_here, guess_inside, riposte, search_word, map_89}` · `object_kind ∈ {measure, section, concept, word, quiz, challenge}` · `-` |
| `blob9` | **`mode`** | événement | `cache` · `extractive` · `llm` · `-` (voir ci-dessous) |
| `blob10` | **`latency_bucket`** | événement | `b0`…`b6` · `-` (voir ci-dessous) |
| `double1` | `hits` | — | toujours 1 : c'est la ligne |
| `double2` | `first_in_session` | — | 1 si c'est la première occurrence de cet événement dans la session, sinon 0 |
| `double3` | `count` | — | occurrences dédupliquées dans la session, plafonné à 50 |
| `double4` | `t_bucket_s` | — | secondes depuis le début de session, **arrondies à 5 s**, plafonnées à 600 |
| `double5` | `latency_ms` | — | uniquement sur `answer_served` et `search_run` : millisecondes **arrondies à 50**, plafonnées à 8 000 ; 0 ailleurs |

**`mode`**, dimension de coût, mappée sur l'ordre des routes de D6.8 : `cache` = réponse pré-écrite servie sans calcul (FAQ exacte, carte glossaire figée, cache D1 ou cache de l'AI Gateway) · `extractive` = retrieval A local ou D1 FTS5 (0 neuron) · `llm` = sélection par Mistral. **`llm` n'est jamais émis tant que D6.10 tient** : la valeur reste dans l'énumération pour que le schéma survive à une réouverture (§9.1) sans migration de dataset.

**`latency_bucket`**, bornes calées sur le délai de repli de 6 s du contrat de fiabilité : `b0` < 100 ms · `b1` 100-299 · `b2` 300-799 · `b3` 800-1 499 · `b4` 1 500-2 999 · `b5` 3 000-5 999 · `b6` ≥ 6 000 (délai dépassé, repli servi).

**Trois renommages, assumés et documentés** (à reporter en D5.1) : `entry` passe de `{deep, home}` à **`{link, direct}`** — même définition, mot juste ; `landing_kind` devient **`kind`** et devient une dimension de session portée par tous les points ; `section_id` **disparaît** au profit de `chapter` (§10.3 dit pourquoi).

**Le contrat, en TypeScript** (`scripts/metrics.ts`, code et clés en anglais) :

```ts
export const EVENTS = [
  'session_start', 'section_verbatim_view', 'measure_view', 'search_run',
  'answer_served', 'play_start', 'play_to_read', 'share_open',
] as const;

export const ENUMS = {
  entry:  ['link', 'direct'],
  src:    ['wa', 'tg', 'ig', 'qr', 'copy', 'none'],
  kind:   ['measure', 'section', 'concept', 'word', 'stat', 'riposte', 'quiz', 'challenge', 'home'],
  device: ['mobile', 'desktop'],
  detail: ['landing', 'browse', 'search', 'glossary', 'play', 'riposte', 'answer',
           'which_here', 'guess_inside', 'search_word', 'map_89',
           'measure', 'section', 'concept', 'word', 'quiz', 'challenge', '-'],
  mode:   ['cache', 'extractive', 'llm', '-'],
  bucket: ['b0', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', '-'],
} as const;

/** One beacon per session, at most 512 bytes, sent once at `pagehide`. */
export interface Beacon {
  readonly v: 1;
  readonly session: {              // stamped on every point of this session
    entry: Entry; src: Src; kind: Kind; device: Device;
    corpus: string;                // 16 hex, must equal the build's corpus_version
    app: AppVersion;
  };
  readonly events: ReadonlyArray<{
    name: EventName;
    chapter?: Chapter;             // 'c01'…'c18' | 'intro' | 'part1'…'part4'
    detail?: Detail;
    mode?: Mode;
    bucket?: Bucket;
    first: 0 | 1;
    count: number;                 // 1…50
    t: number;                     // seconds since session start, step 5, ≤ 600
    latency?: number;              // ms, step 50, ≤ 8000
  }>;
}
```

Côté Worker : une passe de validation (chaque champ ∈ son énumération, `corpus` = celui du build, ≤ 8 événements, ≤ 512 octets), puis une boucle de `writeDataPoint` — soit au plus 8 points pour une requête. Rien n'est lu de la requête au-delà du corps : ni `cf-connecting-ip`, ni `User-Agent`, ni `Referer` ; `observability.enabled: false` (ADR-10) et aucun `console.*` sur ce chemin.

### 10.3 Ce que le schéma refuse de porter

| Refusé | Pourquoi |
|---|---|
| Le **texte** d'une question ou d'une recherche | opinion politique inférable (art. 9) ; le journal des mots inconnus (D0.22) est un **dataset séparé**, un blob par occurrence, sans phrase, sans contexte, sans dimension de session |
| Un **identifiant** de session, d'appareil, de navigateur, un cookie, une IP, un `User-Agent` | promesse D0.22 et principe n° 3 |
| L'**id de section** ou l'id de mesure | 89 valeurs × `src` × `latency_bucket` × `t_bucket_s` commencent à ressembler à une empreinte à faible trafic ; `chapter` (23 valeurs) suffit à toutes les décisions de produit |
| Le **slug d'une situation de vie**, d'un thème de riposte, d'une carte-concept | dire « quelqu'un a ouvert la riposte *immigration* » est une donnée d'opinion, quelle que soit l'anonymisation |
| Une **réponse de jeu** (« je savais » / « je découvre »), un score, un bitmap de progression | D5.4, D5.15 ; ce sont des opinions déguisées en métriques |
| Un **horodatage fin** rattachable à un geste | le beacon part au `pagehide` ; le seul temps transmis est `t_bucket_s`, arrondi à 5 s |
| Le contenu d'une **carte partagée** ou l'existence d'un destinataire | l'app ne sait pas qu'un partage a abouti, et ne doit pas le savoir |

**Risque résiduel, écrit parce qu'il est réel** : Analytics Engine horodate lui-même chaque point. Un croisement combinaison-rare × horodatage avec les journaux HTTP de la zone (que Cloudflare détient comme hébergeur et auxquels nous n'avons pas accès, §6 de `09-architecture.md`) resterait théoriquement possible. Trois atténuations, toutes déjà décidées : le décalage systématique entre le geste et l'envoi (`pagehide`), l'échantillonnage à 10 %, et la règle de publication du §10.5 (aucun taux publié sous 200 sessions échantillonnées dans la fenêtre). C'est une atténuation, pas une preuve d'impossibilité ; elle est à redire telle quelle en T9.

### 10.4 La métrique nord et son calcul

**N = part des sessions arrivées par lien qui atteignent un verbatim de section** (D5.1). Publiée en trois tranches, ventilées par `src` : `kind = section` (le verbatim est à l'écran 0, valeur triviale, **exclue du chiffre de tête**), `kind = measure` (un tap sépare l'arrivée du texte), `kind ∈ {quiz, challenge, concept, word, stat, riposte}` (après un parcours).

Seuils (HYPOTHÈSE, recalibrés à J+30 comme D5.1 le prévoit) : **N ≥ 0,6 sur `measure`**, **N ≥ 0,4 sur la tranche « après parcours »**, **S ≥ 0,5 par mécanique conservée**.

API : `POST https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql`, dataset `aec_events`. Le rapport hebdomadaire tient en **six requêtes de lecture** sur les 10 000 quotidiennes du plan gratuit.

```sql
-- N par tranche d'arrivée, 7 jours glissants. Deux agrégats sur la même table :
-- le dénominateur ne compte que les session_start, le numérateur les premières lectures.
-- SUM(_sample_interval), jamais COUNT() : Analytics Engine échantillonne à fort volume.
SELECT
  blob3                                                                       AS kind,
  blob2                                                                       AS src,
  SUM(IF(index1 = 'session_start',                            _sample_interval, 0)) AS sessions,
  SUM(IF(index1 = 'section_verbatim_view' AND double2 = 1,    _sample_interval, 0)) AS sessions_read
FROM aec_events
WHERE blob1 = 'link'
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY kind, src
ORDER BY sessions DESC
FORMAT JSON
```

`scripts/metrics.ts` fait la division, écarte toute ligne sous 200 sessions échantillonnées, et calcule l'intervalle de confiance (§10.5). Faire la division dans SQL est possible (`sessions_read / nullIf(sessions, 0)`), mais le sous-ensemble SQL exact d'Analytics Engine n'a **pas** été essayé aujourd'hui : la forme à deux colonnes ci-dessus n'utilise que `SUM`, `IF` et `GROUP BY` — **PROBABLE**, à confirmer au premier appel réel de l'API.

```sql
-- S par mécanique : play_to_read / play_start, même fenêtre.
SELECT
  blob8                                                       AS mechanic,
  SUM(IF(index1 = 'play_start',   _sample_interval, 0))       AS starts,
  SUM(IF(index1 = 'play_to_read', _sample_interval, 0))       AS to_read
FROM aec_events
WHERE index1 IN ('play_start', 'play_to_read')
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY mechanic
FORMAT JSON
```

```sql
-- Santé et coût : répartition des modes de réponse et des seaux de latence (v2).
SELECT
  blob9                          AS mode,
  blob10                         AS latency_bucket,
  SUM(_sample_interval)          AS points,
  SUM(double5 * _sample_interval) / nullIf(SUM(_sample_interval), 0) AS mean_latency_ms
FROM aec_events
WHERE index1 = 'answer_served'
  AND timestamp >= NOW() - INTERVAL '7' DAY
GROUP BY mode, latency_bucket
FORMAT JSON
```

Trois autres requêtes complètent le rapport : profondeur de lecture par `chapter` (`section_verbatim_view` groupé par `blob7`), part de partage (`share_open` / `session_start` par `kind`), et volume brut par jour (contrôle du plafond de 100 000 points, §10.5).

**Ce que N ne mesure pas** (D5.1 §1.3, inchangé) : des personnes ; la lecture elle-même ; les sessions sans JavaScript ou dont le beacon est bloqué (sous-estimation assumée) ; la différence entre un lien reçu et une URL profonde tapée ; l'effet sur le vote. Les robots d'aperçu de WhatsApp et Telegram n'exécutent pas le JS et ne comptent pas : c'est voulu. Pendant un gel L49, S chute mécaniquement — le rapport porte le drapeau `silence` sur ces jours et ils sont exclus des moyennes.

### 10.5 Échantillonnage à 10 %, et ce qu'il coûte en précision

**Tirage.** Une fois par session, au premier chargement : `const sampled = Math.random() < RATE`, `RATE = 0.1`, résultat rangé dans `sessionStorage` (`aec.s.sampled`). **Aucune graine persistante** (ADR-11) : rien ne relie deux sessions du même navigateur. Si `sampled` est faux, l'app n'accumule rien et n'envoie rien — pas de requête du tout.

**Le taux est une constante de build**, pas une valeur lue à l'exécution, et il est **enregistré dans `app_version`** (`blob6`) : c'est ce qui permet, six mois plus tard, de reconstituer le multiplicateur historique si le taux a changé.

> **Trois corrections du 10/9/2026 (panel rouge T12), qui se cumulaient exactement sur l'heure virale.**
> 1. **`RATE = 0,1` détruit la mesure sans rien protéger.** Le plafond est de 100 000 points/jour ; une session typique fait 3-4 points, soit 25 000 à 33 000 sessions/jour avant saturation. La diffusion planifiée (§9.4) n'approche pas ce volume, et la règle des 200 sessions exige alors ≈ 2 000 arrivées par lien en 7 jours pour publier un taux. **`RATE = 1,0` en v1**, réversible et traçable par `app_version`.
> 2. **« Un flag KV `events: on|off` peut couper la mesure entière sans redéploiement » est faux sur le seul quota qui compte.** Le flag est lu par le **Worker** : il peut empêcher l'écriture Analytics Engine (100 000 points/jour), **jamais la requête** (100 000 requêtes Worker/jour), qui est la ressource rare. Le seul « couper la mesure » qui économise le quota est **côté client** : `events: on|off` et `events_rate` dans **`flags.json`**, lus au démarrage, `off` ⇒ aucune requête émise.
> 3. **`EVENTS_SAMPLE_RATE` est déclaré dans les `vars` du Worker** (`09-architecture.md` §2) alors que ce paragraphe dit que le tirage est une constante de build **côté client** : la variable du Worker n'est lue par personne, et deux documents décrivent deux emplacements incompatibles pour la même valeur. **À supprimer des `vars`.**
>
> **Et la règle « une balise par session » n'est pas réalisable par le mécanisme décrit.** Le client accumule ses compteurs « en mémoire de page » et envoie au `pagehide` ; or le site est un **multi-pages statique** (Astro `output: 'static'`, URLs distinctes `/m/`, `/s/`, `/c/`, `/q/`, `/defi/`) : **chaque navigation interne est un `pagehide`, donc une balise**. Le dédoublonnage en `sessionStorage` empêche de recompter un événement, pas d'émettre une requête. À k pages vues par session, les requêtes valent **k × sessions échantillonnées**, et toute l'arithmétique de quota des trois tableaux (ici, `09-architecture.md` §4.2, `prompt-final.md` §7) est sous-estimée d'un facteur k. À k = 3 et 100 000 visiteurs/heure, l'échantillon à 10 % produit 30 000 requêtes/heure : les 100 000 requêtes/jour sont épuisées en **3 h 20**, et `/api/e` répond 429 pour le reste du dimanche de scrutin — **sans log pour le voir**. Effet secondaire non traité : `pagehide` se déclenche aussi à l'entrée en **bfcache** (`event.persisted === true`), donc des balises en double à chaque retour arrière. Trancher explicitement l'un des deux modèles, le réécrire dans les trois tableaux, ignorer `pagehide` quand `event.persisted === true`, et ajouter au harnais un test Playwright qui parcourt 4 pages et compte les `POST /api/e`.
>
> **Enfin, `/api/e` est en v1/v2 la seule route serveur : un canal d'écriture publique, sans Turnstile, sans compte, dont on publie ensuite les chiffres dans un dépôt public.** La liste blanche empêche d'injecter du texte libre ; elle n'empêche pas d'**injecter des comptes**. Quelques minutes de script suffisent à envoyer 100 000 balises forgées `entry=link, kind=measure, session_start` seul : N s'effondre, la mécanique correspondante est « rétrogradée d'un niveau » par la règle S ≥ 0,5, et le chiffre publié devient une pièce à charge (« même leurs propres chiffres disent que personne ne lit »). « Zéro log » (D7.8) interdit de distinguer après coup. Trois parades : **recouper systématiquement le dénominateur de N avec les vues de page de l'analytics de zone Cloudflare** (agrégé, sans identifiant, qu'un attaquant ne peut pas forger) et **ne publier aucun taux si l'écart dépasse 20 %** sur la même fenêtre ; **écrire sur `/exactitude` que le canal de mesure est non authentifié et que les taux sont des estimations** ; **réécrire le scénario C de `09-architecture.md` §4.2 sur `/api/e`** (il ne modélise que `/api/ask`, disparu) et ajouter la ligne au registre `14-risques.md`.

**Effet sur les chiffres** : un échantillonnage uniforme **ne biaise pas un ratio** — N et S se lisent directement. Seuls les **volumes absolus** doivent être multipliés par `1 / RATE`, et le rapport les affiche toujours comme des estimations, jamais comme des comptes.

**Effet sur la précision** — la vraie raison d'écrire une règle de publication :

| Sessions échantillonnées dans la fenêtre | Sessions réelles (à 10 %) | Intervalle à 95 % autour de N = 0,6 |
|---|---|---|
| 50 | ≈ 500 | ± 13,6 points |
| **200** | **≈ 2 000** | **± 6,8 points** |
| 370 | ≈ 3 700 | ± 5,0 points |
| 1 000 | ≈ 10 000 | ± 3,0 points |

**Règle de publication** : sous **200 sessions échantillonnées** dans la fenêtre, on publie le **compte brut**, jamais le taux. Autrement dit, à J+30 il faudra ≈ 2 000 arrivées par lien sur sept jours pour qu'un N ait un sens — et si on ne les a pas, la bonne conclusion est « on n'a pas encore de mesure », pas « N vaut 0,4 ».

**Effet sur les plafonds gratuits** :

| | Points/session | Sessions échantillonnées/jour | Sessions réelles/jour |
|---|---|---|---|
| Session typique (arrivée, lecture, partage) | 3-4 | 25 000 – 33 000 | **250 000 – 330 000** |
| Session la plus chargée (les 8 événements) | 8 | 12 500 | **125 000** |

Les requêtes Worker suivent le même compte : 12 500 à 33 000 beacons/jour, soit 12 à 33 % des 100 000 requêtes gratuites — le reste est libre pour les pages. **Règle de garde, corrigée le 10/9/2026 (panel rouge T12)** : l'ancienne se déclenchait après **deux jours consécutifs** au-dessus de 60 000 points, et le correctif arrivait « au build suivant » — or un pic de scrutin dure **une soirée**. Nouvelle règle, lisible sans logs : quantiles GraphQL `workersInvocationsAdaptive` par minute (méthode `06-partage.md` §2.3) ; **au-delà de 3 000 requêtes/heure sur `/api/e`, passer `events_rate` à 0,02 dans `flags.json`**, effet en un déploiement `build:fast`. On l'inscrit dans un nouveau `app_version`.

**Une balise refusée est une perte non corrigible.** `ratelimits` (10 / 60 s, clé `HMAC(jourUTC:ip)`) est, `/api/ask` retiré, **la seule route couverte par le binding** — c'est-à-dire la balise. Derrière un CGNAT d'opérateur mobile (le cas majoritaire un dimanche, l'arrivée par lien WhatsApp sur téléphone étant le scénario de référence, D0.4), des milliers de visiteurs partagent une adresse : au-delà de 10 balises par minute et par IP, tout est jeté. Analytics Engine ne corrige que l'**échantillonnage** (`SUM(_sample_interval)`), **pas une requête jamais arrivée** : N et S publiés le jour du pic seraient biaisés vers les petits réseaux et le desktop — et ce sont ces chiffres qui décident de conserver ou de rétrograder une mécanique. Le dossier avait noté que le binding n'est « pas une défense » (D7.5), jamais qu'il **détruit la mesure**. Conséquence : **retirer `ratelimits` de la liste « conserver » de `prompt-final.md` §16 pour la v1/v2** (il n'y a plus de rafale de navigateur à freiner) ; si l'on tient à un frein, le poser **côté client** (`events_rate`), pas sur une clé IP ; et **recouper tout taux mesuré un jour de pic avec l'analytics de zone avant publication**. Au-delà du plafond, les points sont perdus, **jamais facturés** (D0.2, D0.31).

### 10.6 Rétention

| Donnée | Où | Rétention réelle | Ce qu'on maîtrise |
|---|---|---|---|
| Points `aec_events` | Analytics Engine | **≈ 3 mois, non réglable** (doc Cloudflare) | on ne **requête** que les 30 derniers jours (D0.22) ; retirer le binding coupe l'écriture immédiatement |
| Journal des mots inconnus | Analytics Engine, **dataset séparé** | idem | même règle des 30 jours ; un blob par occurrence, sans phrase |
| Rapports N/S | fichier dans le dépôt public, une page par mois | permanent | ce sont des agrégats de trois chiffres : ils survivent à la purge, et c'est l'intérêt |
| `sessionStorage` (`aec.s`) | navigateur du visiteur | durée de vie de l'onglet | effacé à la fermeture ; jamais lu par le serveur |

La promesse publique reste celle de D0.22, et elle doit dire la vérité : « nous ne pouvons pas raccourcir la rétention de trois mois de l'outil de mesure ; nous ne lisons que les trente derniers jours, et il n'y a rien à rattacher à personne dans ce qui est gardé ».

### 10.7 Ce qu'on regarde, et à quelle fréquence

| Quand | Quoi | Qui décide quoi |
|---|---|---|
| J+7, puis chaque mardi | les six requêtes, volumes bruts | rien : on vérifie que la mesure fonctionne |
| **J+30 (jeu. 10 déc. 2026)** | premier rapport publié, recalibrage des seuils N et S (D5.1 le prévoit) | on garde les seuils ou on les remplace par les valeurs observées, en le disant |
| tous les 14 jours à partir de la v3 | S par mécanique | **S < 0,5 sur 14 jours ⇒ la mécanique est rétrogradée d'un niveau** (§2 de `07-mecaniques.md`), sans discussion. **Amendé le 10/9 (panel rouge T12)** : la règle ne s'applique que sur une fenêtre atteignant **200 sessions échantillonnées** ; à défaut, le verdict est rendu par **observation humaine sur 5 personnes**, jamais par un taux calculé sur du bruit. La v3 sort le 23 février 2027 et le gel de contenu tombe le 1er mars : **six jours de vie avant gel**, et une fenêtre de 14 jours qui déborde le gel |
| chaque mois | rapport publié dans le dépôt | transparence : le dépôt est public depuis J1 (D0.28) |
| pendant un gel L49 | rien | les jours de gel portent le drapeau `silence` et sortent des moyennes |

### 10.8 Contenu de la page `/exactitude` (D6.6)

Régénérée à chaque déploiement à partir de `data/hashes.json`, `data/aec-2025.json` et `eval/retrieval-results.json` — jamais écrite à la main, sinon elle ment au premier re-crawl.

1. **Version et date du corpus** : `corpus_version d29c7422004ab27c`, crawl du 7 septembre 2026 16:30 UTC, lien vers melenchon2027.fr et vers la licence CC BY-NC-SA 4.0 avec l'attribution « La France insoumise – L'Avenir en commun ».
2. **Les 89 empreintes SHA-256 de section**, dépliables, avec l'invitation à vérifier soi-même : la commande exacte tient en une ligne.
3. **La règle 831 / 837** (D1.2) : l'app dit « 831 mesures », le chiffre officiel de `intro-p04` ; le corpus contient 837 propositions extraites (87 clés + 706 + 44 sous-mesures) ; la méthode de comptage n'apparaît **que** sur cette page.
4. **Comment une réponse est fabriquée, en quatre étapes** (et non cinq — l'étape « sélection par Mistral » a disparu avec D6.10) : tes mots sont normalisés → l'index local (ou l'index FTS5 du serveur si la question part en ligne) propose des passages candidats → les passages sont classés par correspondance lexicale → le texte est affiché **tel quel**. Aucun modèle de langage n'intervient à aucune de ces étapes.
5. **Ce que l'app ne fait jamais** : écrire une mesure, résumer une mesure à la place du texte, ajouter un chiffre, corriger une coquille du texte source (D1.8), confirmer une citation qu'on lui apporte.
6. **Les derniers résultats du harnais**, avec leur date et la version du jeu : rappel@5, rappel@10, hit@5, rappel@3 sections, ids interdits dans le top 5, et le nombre de questions du jeu. Plus le lien vers `eval/` dans le dépôt public.
7. **Ce qui a été essayé et écarté**, daté : le bench Mistral du 9 septembre 2026 (130 items en v1, 60 en v2), les seuils tenus et les seuils manqués (p95 4 159 ms contre 3 000 visés, `liant_kind` correct une fois sur deux), et la conclusion — **aucune IA à l'exécution** (D6.10). C'est le seul endroit de l'app où l'on parle d'IA, et on en parle au passé.
8. **Le prochain re-crawl** : lundi 06:00 UTC (D1.3), avec la date du dernier et son résultat.
9. **Anomalies de source assumées** : les 15 entrées de `meta.source_anomalies` (D1.8), dont les 6 statistiques publiées en paragraphes, avec ce que l'app en fait.
10. **Les liens de vérification** : dépôt public, `data/aec-2025.json`, `scripts/verify-corpus.ts`, et la façon de signaler une erreur.

Si le chat revient un jour (§9.1), deux lignes se rajoutent au point 4 et une au point 5, et la mention IA de l'art. 50 réapparaît sur l'écran concerné : rien d'autre ne bouge.

### 10.9 Page `/confidentialite` : ce que T9 a écrit, et les lignes que D6.10 déplace

Le texte final existe : ce sont les dix lignes de `docs/discovery/11-conformite.md` §6.3 (D9.5 proposée), écrites au registre de `voice.md` et confrontées ligne à ligne à la carte des journalisations du §6 de `09-architecture.md`. T10 n'en réécrit rien ; il signale ce que **D6.10 (§9.1) rend faux ou sans objet**, et qui doit être tranché avant la mise en ligne du 9 novembre :

| Ligne | État après D6.10 | Ce qu'il faut faire |
|---|---|---|
| `privacy.policy.02` (« tes questions vont à notre serveur, puis à l'IA Mistral ») | **fausse** | livrer la variante que T9 avait prévue en §6.4 point 2, `privacy.policy.02.local` : « Ta recherche se fait sur ton téléphone. Rien n'est envoyé. » — cohérente avec `search.local_promise` |
| `privacy.policy.03` (empreinte de question gardée 30 jours) | **fausse — tranché le 10/9/2026 (D13.1)** : il n'y a ni route serveur, ni base D1, ni cache de questions ; **tout est calculé sur l'appareil** | **retirer la ligne.** Le chapeau ne compte plus ses lignes (`privacy.lead` v0.4), donc aucune autre chaîne n'est à corriger |
| `privacy.policy.06` (Turnstile) | **sans objet** | retirer : il n'y a plus d'écran chat à protéger. La chaîne reste dans `strings.json`, non affichée |
| `privacy.policy.05` (mesure d'usage, « sur une visite sur dix ») | **exacte** | rien : elle dit déjà le taux du §10.5. Y ajouter seulement « on ne lit que les trente derniers jours » |

Deux compléments que T10 apporte :

- **Un lien vers ce §10** depuis la page, pour que quelqu'un qui veut vérifier lise le schéma d'événements lui-même plutôt que sa paraphrase. C'est la logique de `/exactitude` : la page ne demande pas qu'on la croie.
- La liste **« ce qu'on n'enregistre jamais »** de `11-conformite.md` §6.3 (neuf lignes) recoupe le §10.3 ci-dessus ligne à ligne. Le §10.3 n'ajoute que **deux** interdits, tous deux propres au schéma d'événements : **l'identifiant de section ou de mesure** et **le slug d'un thème, d'une situation de vie ou d'une carte-concept**. Ils méritent d'entrer dans la liste publique, parce qu'ils sont exactement ce qu'un outil de mesure ordinaire aurait envoyé.

---

## Annexe A — Index des captures (`docs/discovery/captures/2026-09-07/prior-art/`)

| Fichier | Contenu | SHA-256 (16 hex) |
|---|---|---|
| `m2027-ch12-s1.mobile.png` / `.audit.json` / `.deep.json` / `.html` | Lecteur officiel ch. 12 s1 (pleine page, styles, OG, liens, cookies) | html `dc8c89a4b0bbbcce`, deep `47734def89b76e4d` |
| `programme-lfi-home.mobile.png` / `.audit.json` / `.deep.json` | programme.lafranceinsoumise.fr → livre 2025 | deep `ea76ddc5bad9f2d2` |
| `aec2027-home.mobile.png` / `.audit.json`, `aec2027-rdap.json`, `aec2027-favicon.ico` | Page d'attente, RDAP, favicon par défaut (HTML/en-têtes J0 dans le dossier parent) | rdap `b658e90848c5452b` |
| `laec-home`, `laec-sommaire`, `laec-recherche`, `laec-section-35`, `laec-visuels` `.mobile.png` / `.audit.json` ; `laec-section-35.deep.json` / `.html` ; `laec-s35m286.deep.json` ; `laec-recherche-smic.deep.json` | laec.fr : accueil, sommaire, recherche (vide et « SMIC »), section 35, lien court mesure 286, galerie | html `53fb1303507572ef`, deep `c8fb4939fad4e6af`, `a180f68ab21f5408`, `2bfd0aab23e70cd4` |
| `aecnet-home`, `aecnet-programme`, `aecnet-simulateur` `.mobile.png` / `.audit.json` ; `aecnet-home.deep.json`, `aecnet-programme.deep.json`, `aecnet-nature.deep.json` ; `aecnet-simulateur.html` ; `aecnet-simulateur.step1…4`, `.loading`, `.result` `.mobile.png` ; `aecnet-simulateur.flow.json` ; `aecnet-backend-openapi.json` ; `aecnet-rdap.json` | avenir-en-commun.net : pages, parcours complet du simulateur (profil fictif), trafic réseau, schéma OpenAPI du backend | html `219a310fb680d214`, flow `f4839a862ea06b51`, openapi `3de62784d8e6647c` |
| `cachangequoi-home`, `workersdev-home`, `lafaq-home` `.mobile.png` / `.audit.json` / `.deep.json` | Produits découverts pendant l'audit | deep `3c3fefae1fd4e754`, `835fe11c07d3fa94`, `d3d58102cddfdee1` |

Les PNG pleine page de plus de 800 Ko ont été ramenés à l'échelle 1× (390 px de large) ; les `audit.json` conservent les mesures exactes. Aucun asset tiers (illustrations, logos) n'est copié dans le dépôt.

## Annexe B — URLs consultées aujourd'hui

melenchon2027.fr : `/programme2025/livre/chapitre12/s1/`, `/programme2025/livre/`, `/synthese-des-contributions/`, `/construction-programme/`, `/?s=règle verte` · programme.lafranceinsoumise.fr · aec2027.fr : `/`, `/robots.txt`, `/favicon.ico`, `/sitemap.xml`, `/assets/`, `www.aec2027.fr/site.webmanifest`, `www.aec2027.fr/favicon-32x32.png`, `www.aec2027.fr/apple-touch-icon.png` · lafranceinsoumise.fr : `/`, `/avenir-en-commun-programme-2027` (404), `/assets/avenir-en-commun-og.jpg` (404), `/2026/05/20/la-france-insoumise-ouvre-son-programme-a-contributions-citoyennes/` · laec.fr : `/`, `/sommaire`, `/recherche`, `/recherche/?q=…`, `/section/35/etablir-la-garantie-demploi`, `/s35m286/`, `/s1/`, `/s12/`, `/s86/`, `/visuels`, `/static/visuels/s{1,35,86,87}.png`, `/page/mentions-legales`, `/manifest.json`, `/sw.js`, `/sitemap.xml` · avenir-en-commun.net : `/`, `/programme`, `/harmonie-humains-nature`, `/simulateur`, `/robots.txt`, `/sitemap.xml` · avenir-en-commun-melenchon2027.onrender.com : `/`, `/health`, `/docs`, `/openapi.json`, `POST /api/analyse-budget` (une requête, profil fictif) · cachangequoi.fr : `/`, `/site.webmanifest`, `/og-image.png` · programme-lfi.julien-9b2.workers.dev · www.lafaqdelavenirencommun.com · rdap.nic.fr (`aec2027.fr`, `laec.fr`), rdap.verisign.com (`avenir-en-commun.net`) · recherches web : « aec2027.fr », « aec2027 Avenir en commun application », « L'AEC application La France insoumise », « Hello Melro tortues insoumise », « tortues sagaces Avenir en commun », « 9 chapitres / neuf ruptures », « actionpopulaire.fr OR discord-insoumis.fr aec2027 », « cachangequoi.fr ».
