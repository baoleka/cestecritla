# T4 — Partage et canal dark social : spike réel (7 septembre 2026)

> Livrable du plan T4 (`PLAN-SESSION.md`). Statuts : **VÉRIFIÉ** (mesuré ou lu à la source le 7/9/2026, fichier ou URL cité) / **PROBABLE** / **HYPOTHÈSE**. Les captures et journaux sont dans `docs/discovery/captures/2026-09-07/spike-share/` (SHA-256 dans `SHA256SUMS.txt`, D0.37).
>
> Ce document applique D0.2 (0 €), D0.13 (domaine `.fr` plus tard, `*.baoleka.workers.dev` en attendant), D1.1 (schéma d'identifiants), D1.6 (projection runtime du corpus), D3.1-D3.8 (identité, typographie, règles d'illustration). Il ne rouvre aucune de ces décisions.

## 1. Le spike : ce qui a été construit

**Worker jetable `aec-spike-share`**, déployé sur le plan gratuit, sans aucun moyen de paiement, sans autre binding que les Static Assets.

- URL : **https://aec-spike-share.baoleka.workers.dev** (version `67e48bfd-b637-4333-acc3-67afbbe206f2`, déployée le 7/9/2026 vers 20:05 UTC ; version revue `a5deb170-9fff-44bc-8271-ea649c8a0da2` le 8/9/2026, §10) — VÉRIFIÉ.
- Pipeline : objets `{ type, props }` (pas de JSX) → **satori 0.32.0** (`satori/standalone` + `yoga.wasm`) → SVG (texte converti en tracés) → **@resvg/resvg-wasm 2.6.2** → PNG. Les deux modules wasm sont importés en `CompiledWasm` et instanciés une fois par isolat ; les six polices TTF et les données sont servies par Static Assets et chargées une fois par isolat (`/fonts/*.ttf`, `/data/slim.json`, `/data/stat-cards.json`) : **le bundle ne contient que du code et du wasm** — VÉRIFIÉ (`grep` du bundle : aucune police ni donnée incorporée).
- 5 cartes × 3 ratios (`?r=og` 1200×630 par défaut, `square` 1080×1080, `story` 1080×1920) : mesure `/og/m/<id>.png`, À savoir `/og/a/<id>.png`, riposte `/og/r/<id>.png`, progression `/og/p/<n>-<total>.png`, résultat `/og/res/<id,id,id>.png`.
- Pages de partage rendues par le Worker (Static Assets ne sait pas produire des balises OG par URL) : `/m/<id>`, `/a/<id>`, `/r/<id>`, `/p/<n>-<total>`, `/res/<ids>` — HTML minimal `lang="fr"`, fond Crème, verbatim, lien vers la section officielle, attribution CC, **une seule** `og:image` (URL absolue du PNG `?r=og`), `og:title` (titre de section), `og:description` (verbatim ≤ 200 caractères, coupé sur un mot), `og:type article`, `og:image:width/height`, `twitter:card summary_large_image`, `rel=canonical` vers la section officielle pour les pages verbatim.
- Validation : identifiants filtrés par `/^c\d{1,2}-s\d{2}-(k|m|a)\d{2}(\.s\d)?$/` (400 sinon), inconnus → 404, `n ≤ total`, ≤ 3 identifiants pour `/res/`. `Cache-Control: public, max-age=86400` sur les PNG (pas d'`immutable`), `max-age=3600` sur les pages, `no-store` sur les erreurs ; HEAD sur `/og/*` répond sans rendre (§10.2).
- Page d'accueil `/` (8 liens d'exemple) et page `/diag` (matrice in-app, `design/perf-budget.md` §5.6) en statique.

### Fichiers (`prototypes/spike-share/`)

| Fichier | Rôle |
|---|---|
| `package.json`, `tsconfig.json` (strict, sans `any`), `wrangler.jsonc` | Paquet indépendant (npm), `compatibility_date 2026-09-07`, assets `./public` avec binding `ASSETS`, `run_worker_first: ["/og/*", "/m/*", "/a/*", "/r/*", "/p/*", "/res/*", "/api/*"]`, observabilité activée, `minify` |
| `src/index.ts` | Routage, validation, pages de partage, réponses d'erreur |
| `src/render.ts` | Init wasm (satori + resvg) une fois par isolat, polices chargées une fois depuis `ASSETS`, rendu PNG, en-tête `Server-Timing` |
| `src/cards/frame.ts` | Cadre commun : coupe 53/47 (règle 1), aplat de la partie (règle 2, `part-color`), titre Public Sans 900 capitales (règle 3), **un seul bloc 3D** = wordmark en ombre pleine Violet 200 (règle 4) — le spike imprimait « AEC Discover », le wordmark livré est « C'EST ÉCRIT / LÀ » (D10.2), et les huit aperçus du §5 sont à rejouer après correction, bande de signature wordmark + attribution CC (règle 6), jamais de logo (D3.3) |
| `src/cards/measure.ts`, `stat.ts`, `riposte.ts`, `progress.ts`, `result.ts` | Une fonction par carte |
| `src/cards/verbatim.ts`, `src/text.ts` | Bloc verbatim Gowun Batang (D3.2), ajustement de taille par paliers, coupe à 320 caractères avec « … » + « Lire la suite » |
| `src/theme.ts`, `src/el.ts`, `src/data.ts`, `src/types.ts`, `src/pages.ts` | Tokens provisoires copiés de `design/tokens.json`, fabrique d'éléments, accès aux données, HTML |
| `scripts/build-data.ts` (`npx tsx prototypes/spike-share/scripts/build-data.ts` depuis la racine) | Projection D1.6 → `public/data/slim.json`, copie de `stat-cards.json`, copie des polices sans table GPOS (voir §2.4) |
| `scripts/strip-gpos.ts` | Retire GPOS/kern d'un TTF (directory réécrit, checksums recalculés) |
| `public/index.html`, `public/diag.html`, `public/fonts/*.ttf`, `public/data/*.json` | Statique |

Le paquet racine n'est pas touché. Rien n'est commité par le spike.

### Ce qu'il a fallu contourner (utile pour le plan d'implémentation)

1. **satori 0.33 (20/8/2026) ne tourne pas dans Workers** : depuis 0.33.0 satori façonne le texte avec `harfbuzzjs`, dont le chargeur Emscripten localise `hb.wasm` via `self.location.href` puis `fs` (« Cannot read properties of undefined (reading 'href') », puis « __dirname is not defined »). Un shim aliasé (`alias` wrangler + instanciation du wasm importé) a été tenté puis abandonné ; le spike **épingle satori 0.32.0** (façonnage opentype.js + `yoga.wasm`, chemin documenté pour Workers) — VÉRIFIÉ.
2. **Crénage** : satori ≤ 0.32 mesure le texte graphème par graphème (sans crénage) mais dessine les mots avec le crénage d'opentype.js : chaque paire crénée de Public Sans (« ’A », « Te », « AV ») laissait un trou visible après le mot (`captures/…/` non conservé, reproduit par sonde). Correctif : `build-data.ts` sert à satori des copies des polices **sans table GPOS** (Gowun Batang n'a pas de crénage utile, Public Sans en perd un peu) — VÉRIFIÉ sur le rendu. Les polices de `design/fonts/` (woff2 de l'app) ne sont pas concernées.
3. **wrangler 4.129 exige Node ≥ 22** ; la machine a Node 20 par défaut et Node 24.14 via nvm — VÉRIFIÉ.
4. **L'horloge est gelée pendant le calcul** dans un Worker (`Date.now()` n'avance que sur E/S) : `Server-Timing` renvoie `satori;dur=0, resvg;dur=0` en production ; la mesure vraie est celle des invocations (GraphQL) et du `curl` externe — VÉRIFIÉ.

## 2. Mesures

### 2.1 Taille du bundle (`npx wrangler deploy --dry-run --outdir dist`, gzip -9 sur chaque fichier)

| Fichier | Brut | gzip -9 |
|---|---:|---:|
| `index.js` (code + satori standalone + dépendances, minifié) | 470 777 o | 153 789 o |
| `yoga.wasm` | 71 736 o | 28 572 o |
| `index_bg.wasm` (resvg) | 2 478 606 o | 948 791 o |
| **Total** | **3 021 119 o (2,88 Mio)** | **1 141 446 o (1,09 Mio)** |

wrangler affiche « Total Upload: 2950.31 KiB / gzip: 1116.01 KiB » (gzip par défaut, non -9) ; temps de démarrage mesuré au déploiement : 45-51 ms — VÉRIFIÉ.

Par rapport à la limite supposée par le plan (« 3 Mo compressés ») : **36 %**, marge ×2,7. Mais la page de limites lue aujourd'hui ne mentionne plus de limite compressée : « Worker size (uncompressed) : 64 MiB » pour les deux plans, « There is no compressed size limit. Only the uncompressed bundle size counts. », démarrage 1 s, mémoire 128 Mo — VÉRIFIÉ (https://developers.cloudflare.com/workers/platform/limits/, lu le 7/9/2026). Sur ce critère, la taille n'est plus un sujet. Le sujet, c'est le CPU (§2.3).

### 2.2 Taille des PNG (limite du plan : 300 Ko par `og:image`)

| Carte | og 1200×630 | square 1080×1080 | story 1080×1920 |
|---|---:|---:|---:|
| Mesure `c12-s01-k01` (154 car.) | 63 935 o | 81 025 o | 105 999 o |
| Mesure longue `c5-s07-m01` (451 car., coupée à 320) | 74 541 o | 98 773 o | 131 582 o |
| À savoir `c8-s02-a01` | 67 926 o | 96 492 o | 122 422 o |
| Riposte `c6-s01-k01` | 43 377 o | 51 057 o | 65 856 o |
| Progression `14-89` | 44 868 o | 56 511 o | 68 427 o |
| Résultat 3 mesures | 60 500 o | 79 085 o | 100 803 o |

**Maximum 131 582 o (44 % de 300 Ko)** ; toutes les cartes passent, aucun besoin de réduire `fitTo` ni de passer en JPEG — VÉRIFIÉ (fichiers dans `captures/…/spike-share/`, valeurs locales identiques au déployé à quelques octets près quand la palette diffère).

### 2.3 Latence et CPU sur le Worker déployé (colo CDG, `curl` depuis la machine de session)

Premier appel après déploiement (`/og/m/c12-s01-k01.png?r=og`) : **0,984 s** (TTFB 0,962 s), phase d'initialisation (wasm + 6 polices + 2 JSON) 70 ms d'E/S — VÉRIFIÉ.

Trois appels « chauds » successifs, juste après :

| Ratio | 1 | 2 | 3 |
|---|---:|---:|---:|
| og | 0,974 s | 0,413 s | 0,326 s |
| square | 0,616 s | 0,377 s | 0,306 s |
| story | 1,090 s | 0,608 s | 1,213 s |

20 rendus story séquentiels : moyenne 0,593 s (0,385-1,114), 20/20 en 200. 10 rendus og en parallèle : 0,22-0,78 s, 10/10 en 200 — VÉRIFIÉ.

**Puis la limite du plan gratuit s'est appliquée.** Séries de 12 requêtes espacées d'une seconde (`latence-*-12-requetes.txt`) :

| Ratio | 200 | **503 `error code: 1102`** (Worker exceeded resource limits) | Temps moyen des 200 |
|---|---:|---:|---:|
| og | 8 | 4 (33 %) | ≈ 0,33 s |
| square | 6 | 6 (50 %) | ≈ 0,40 s |
| story | 3 | 9 (75 %) | ≈ 0,45 s |

Les 503 répondent en ≈ 0,115 s (interruption à 10 ms de CPU). Le lendemain matin la tolérance sera peut-être revenue, mais elle se consomme en quelques dizaines de rendus — VÉRIFIÉ (`error-1102.headers.txt`, `error-1102.body.txt`).

**CPU réel par invocation** (API GraphQL `workersInvocationsAdaptive`, fenêtres `fenetres-analytics.txt`) — VÉRIFIÉ :

| Fenêtre | Statut | Requêtes | CPU p50 | CPU p90 | CPU p99 | Wall p50 |
|---|---|---:|---:|---:|---:|---:|
| 32 premiers rendus (mélange) | success | 32 | 317 ms | 616 ms | 759 ms | 349 ms |
| og | success | 7 | 137 ms | 233 ms | 233 ms | 143 ms |
| og | exceededResources | 4 | 10 ms (tués) | — | — | 13 ms |
| square | success | 6 | 194 ms | 667 ms | 667 ms | 201 ms |
| square | exceededResources | 6 | 10 ms | — | — | 12 ms |
| story | success | 3 | 283 ms | 374 ms | 374 ms | 292 ms |
| story | exceededResources | 17 | 10 ms | — | — | 16 ms |

Limite du plan gratuit : **10 ms de CPU par invocation** (« Each isolate has some built-in flexibility to allow for cases where your Worker infrequently runs over the configured limit. If your Worker starts hitting the limit consistently, its execution will be terminated ») — VÉRIFIÉ (même page de limites). Un rendu satori + resvg coûte **14 à 75 fois** la limite. Plan payant : 30 s par défaut (5 $/mois, exclu par D0.2 et D0.31).

Pour référence, en local (`wrangler dev`, machine de session, horloge non gelée) : `Server-Timing` og à froid = satori 165 ms + resvg 434 ms ; ensuite og 0,22-0,37 s, story 0,35-0,60 s par requête — VÉRIFIÉ (indicatif : CPU différent).

### 2.4 Polices et données dans les assets

| Asset | Taille servie |
|---|---:|
| 6 TTF sans GPOS (Public Sans 400/700/900/900i, Gowun Batang 400/700) | 232 212 o (29 584 à 56 112 o chacune) ; originaux `fonts/` 271 936 o |
| `data/slim.json` | 249 153 o brut, 69 442 o sur le fil (gzip Static Assets) |
| `data/stat-cards.json` | 58 402 o brut, 6 797 o gzip -9 |

Un isolat froid fait 8 sous-requêtes (6 polices + 2 JSON) ; l'analytics montre ≈ 3 sous-requêtes par requête en moyenne sur 32 rendus, signe que les isolats du plan gratuit sont recyclés souvent — PROBABLE (déduit, non instrumenté par isolat).

## 3. D1.6 — taille de la projection runtime du corpus : VÉRIFIÉ

`scripts/build-data.ts` produit `slim.json` = `meta { corpus_version, official_count }` + 18 chapitres (`id, number, title, partId`) + 89 sections (`id, chapterId, title, url, items` sans `hash` ni `html`, `chiffres { id, text }`), minifié, U+202F → U+00A0 (D3.6 ; le corpus n'en contient aucun aujourd'hui).

| Variante | Brut | gzip -9 | Contenu |
|---|---:|---:|---|
| **Avec les 109 chapeaux (`paragraph`, texte seul)** | **249 153 o** | **69 166 o (67,5 Ko)** | 837 propositions + 109 paragraphes + 48 chiffres |
| Sans les chapeaux | 197 361 o | 52 418 o (51,2 Ko) | 837 propositions + 48 chiffres |

D1.6 estimait « ≈ 71 Ko gzip », cible « ≤ 80 Ko » : **tenu, 67,5 Ko** (référence complète `data/aec-2025.json` : 142 345 o gzip). Le script vit dans le spike ; à déplacer dans `scripts/` en T7 (action ouverte « script de projection runtime » → faite ici, à ranger).

## 4. ADR (brouillon) — Cartes OG : build-time ou runtime ?

**Contexte.** Chaque objet partageable a besoin d'une image d'aperçu (`og:image` 1200×630, une seule balise, < 300 Ko) et, pour l'usage militant, d'un carré et d'une story. Objets déterministes : 837 propositions + 48 chiffres + 87 mesures clés en mode riposte ≈ 970 cartes × 3 ratios ≈ 2 900 fichiers (chiffre du plan). ⚠️ **Ce cadrage est celui d'avant D13.3 (10/9/2026)** : l'option retenue ne pré-génère que le 1200×630, soit **≈ 970 fichiers et ≈ 60 Mo** — voir l'option D ci-dessous. Objets combinatoires : progression (`n/89`, 90 valeurs), résultat « mes 3 mesures » (837³ combinaisons), défis par lien (état dans l'URL, D0.18).

**Chiffres du spike (VÉRIFIÉ, §2).** Bundle 2,88 Mio brut / 1,09 Mio gzip (36 % de l'ancienne limite, aucune limite compressée aujourd'hui). PNG 43-132 Ko. Rendu chaud 0,3-0,6 s de bout en bout, **137-283 ms de CPU médian par carte, contre 10 ms autorisés sur le plan gratuit** ; après quelques dizaines de rendus, 33 à 75 % des requêtes sont tuées (503, code 1102). Le plan est « 0 € » (D0.2, D0.31) : pas de passage au plan payant.

**Options.**

| Option | Aperçu WhatsApp/Telegram | Coût CPU Worker | Risque | Verdict |
|---|---|---|---|---|
| A. Runtime satori+resvg dans le Worker (ce spike) | Correct quand ça répond | 14-75× la limite | Échecs aléatoires dès quelques rendus ; un crawler qui reçoit un 503 met en cache « pas d'image » | **Rejetée sur preuve** pour le plan gratuit |
| B. Runtime + Cache API / cache HTTP | Idem, hit après le premier rendu par colo | Idem au premier rendu, par colo, par version | Le premier rendu reste tué ; le cache est par datacentre ; non testé sur workers.dev | Insuffisant seul |
| C. **Build-time** : PNG générés en CI (satori/resvg en Node, même code de carte) et déposés dans Static Assets, `immutable` | Toujours servi, 0 ms CPU | 0 | Volume : ≈ 970 × (64 + 81 + 106 Ko) ≈ 240 Mo d'assets, 2 900 fichiers (limite 20 000 fichiers, 25 Mio par fichier, VÉRIFIÉ) ; régénération à chaque changement de corpus (D1.4) ou de charte | **Recommandée** pour toutes les cartes déterministes ; si le volume gêne, ne pré-générer que `og` (≈ 60 Mo) |
| D. Rendu **dans le navigateur** (Canvas 2D ou satori côté client + `navigator.share({ files })`, niveaux A/B/C du budget perf §4) | Ne produit pas l'`og:image` (les crawlers ne font pas tourner de JS) | 0 (CPU du téléphone) | Doublon de code de carte ; qualité de police à vérifier | **Complément** pour carré/story et pour les cartes combinatoires |
| E. Aperçu générique pour les combinatoires (une image statique par type + `og:title`/`og:description` dynamiques par le Worker, ≈ 1 ms CPU) | Aperçu correct mais non personnalisé | ≈ 0 | Moins « wow » pour le défi/résultat | Repli acceptable, à juger en T5 |

**Conclusion — ✅ tranchée par l'utilisateur le 10 septembre 2026 (D13.3, avec D13.2 pour les URL).** ~~Recommandation à trancher~~ : **C + D + E**, dans cette répartition exacte.

- **C, et seulement pour le 1200×630** : l'aperçu `og` est **pré-généré au build** pour les mesures et les ripostes (et les 90 valeurs de progression). Motif, non négociable : **les robots d'aperçu n'exécutent pas de JavaScript** — c'est le seul format qu'un crawler doit trouver déjà rendu. Volume : **≈ 970 fichiers, ≈ 60 Mo**. ⛔ Les **chiffres sortent** de la liste (D5.4, D5.5 : aucune carte statistique sur une image) ; les `/a/<id>` restent des **pages**, avec une image générique.
- **D, pour les deux autres ratios** : le **carré 1080×1080 et la story 1080×1920 sont dessinés dans le navigateur** (Canvas 2D) au moment du partage, **jamais sur le Worker**, avec le **même code de carte que le build** (`src/cards/*`, `src/text.ts`) — c'est ce partage de code qui neutralise le risque « deux implémentations ». Écart évité : ≈ 2 900 fichiers et ≈ 240 Mo, et autant de durée de build à chaque re-crawl. **H-PAR-6 cesse d'être une hypothèse ouverte** et devient une **exigence de test** : qualité équivalente sur un Android moyen, avec le repli « appui long pour enregistrer » (niveau C).
- **E, pour les combinatoires** : résultat et défi = page légère à titre et description personnalisés, **image générique**.
- **Et l'URL, tranchée avec (D13.2)** : le lien public porte **l'identifiant seul** (`/m/c12-s01-k01`, permanent) et l'image **la version du corpus dans son chemin** (`/og/<corpus_version>/m/c12-s01-k01.png`, `Cache-Control: immutable`). C'est ce qui permet de **régénérer toutes les images après un re-crawl sans casser un seul lien déjà envoyé** — y compris un QR imprimé.

Le Worker ne rend jamais d'image à la demande sur le plan gratuit.

**Ce que la décision ne couvre pas encore :** le rendu client (option D) doit **prouver** qu'il produit un PNG de qualité équivalente sur un Android moyen (T7, budget perf) — c'est désormais un critère de done, pas une option. L'`og:image` d'un aperçu WhatsApp est mise en cache par les plateformes, donc toute régénération doit changer l'URL : **c'est exactement ce que fait `/og/<corpus_version>/…` en `immutable`** (D13.2), sans toucher au lien public.

## 5. À envoyer demain (J2, 9/9) : les 8 liens et la grille d'observation

Depuis **Android et iPhone**, dans un vrai groupe **WhatsApp**, un groupe ou canal **Telegram**, et une **story Instagram** (lien collé ou sticker lien). Premier envoi le 9/9 sur `workers.dev` : aperçus OK déclarés par l'utilisateur (D4.3). **Depuis le 9/9 09:10 UTC, le domaine final `cestecritla.fr` est actif** (zone Cloudflare Free, custom domain du Worker, certificat émis en 30 s) : les liens ci-dessous sont ceux à renvoyer pour le test définitif (D10.2).

| # | Lien | Carte |
|---|---|---|
| 1 | https://cestecritla.fr/m/c12-s01-k01 | Mesure — règle verte (partie 3, vert) |
| 2 | https://cestecritla.fr/m/c1-s01-k01 | Mesure — Constituante, 6e République (partie 1, violet) |
| 3 | https://cestecritla.fr/a/c8-s02-a01 | À savoir — semaine de 4 jours (Ifop, 2024) |
| 4 | https://cestecritla.fr/a/c1-s02-a01 | À savoir — proportionnelle (Harris Interactive, mai 2021) |
| 5 | https://cestecritla.fr/r/c6-s01-k01 | Riposte — taxe sur les transactions financières |
| 6 | https://cestecritla.fr/r/c8-s02-k01 | Riposte — 35 heures |
| 7 | https://cestecritla.fr/p/14-89 | Progression — « J'ai lu 14 sections sur 89 » |
| 8 | https://cestecritla.fr/res/c1-s01-k01,c12-s01-k01,c6-s01-k01 | Résultat — « Mes 3 mesures » |

**Attention (conséquence du §2.3)** : l'aperçu peut ne pas apparaître non pas à cause du format mais parce que le rendu a été tué (503). Avant d'envoyer un lien, ouvrir une fois `…/og/<kind>/<id>.png?r=og` dans le navigateur : si l'image s'affiche, le crawler a de bonnes chances de l'obtenir dans la minute (cache 24 h côté plateforme). Si une plateforme n'affiche rien, réessayer avec un autre identifiant ; noter le cas dans la grille, c'est une donnée en soi.

**Grille d'observation** (une ligne par lien × app × OS ; captures d'écran dans `captures/2026-09-09/partage/`) :

| Colonne | Valeurs |
|---|---|
| App / OS | WhatsApp, Telegram, Instagram story (+ Messenger, TikTok si disponibles) × Android, iPhone |
| Aperçu apparu ? | oui / non / après délai (s) |
| Image | entière / rognée (préciser le bord : haut, bas, côtés) / carré recadré / absente |
| Titre affiché | oui (= titre de section ?) / tronqué / absent |
| Description affichée | oui / tronquée à N car. / absente |
| Domaine affiché | `aec-spike-share.baoleka.workers.dev` / absent |
| Ouverture du lien | navigateur par défaut (Safari / Chrome / Samsung) / navigateur intégré de l'app / choix proposé |
| « Ouvrir dans le navigateur » proposé ? | oui / non |
| Zone sûre | le wordmark et l'attribution restent-ils visibles dans l'aperçu ? |
| Remarque libre | qualité du texte, couleur, temps de chargement ressenti |

Ce qui tranche la règle 1 (`illustration-rules.md`, garde-fou « coupe en paysage ») : si WhatsApp/Telegram recadrent l'`og` en carré ou coupent le bas, la bande de signature doit remonter ou la coupe passer gauche/droite — HYPOTHÈSE à lever avec ces captures.

## 6. Protocole `/diag` (matrice in-app, `perf-budget.md` §3 et §5.6)

Page : https://cestecritla.fr/diag — statique, sans dépendance, affiche `navigator.share`, `canShare({ files })`, compteur `localStorage` (persistance), `storage.persisted()`, service worker, View Transitions, `userAgentData.brands`, reduced-motion, dark mode, `standalone`, viewport × DPR, jeton in-app détecté, chaîne UA complète ; deux boutons testent le partage texte+lien puis le partage avec l'image PNG (carré) — VÉRIFIÉ (page en ligne, 200).

Protocole, par app (WhatsApp, Telegram, Instagram, Messenger, TikTok) et par OS :
1. Envoyer le lien `/diag` dans l'app, l'ouvrir depuis l'app, **capturer** (compteur = 1 attendu à la première ouverture).
2. Fermer complètement l'app hôte, rouvrir le lien depuis le même message, **capturer** : compteur = 2 → stockage persistant dans ce conteneur.
3. Appuyer sur « Tester Partager (texte + lien) » puis « Tester Partager avec image » : noter ce qui s'ouvre (feuille système, rien, erreur affichée sous les boutons).
4. Noter si l'app propose « Ouvrir dans le navigateur » et, dans ce cas, refaire 1-3 dans le navigateur.
5. Reporter chaque cellule « ? » du §3 de `perf-budget.md` en VÉRIFIÉ (téléphone, app, version, capture).

## 7. Schéma d'URL (brouillon)

> ⛔ **AMENDÉ le 10 septembre 2026 — panel rouge T12 : `rel=canonical` vers melenchon2027.fr est RETIRÉ partout.** Ce fichier le pose sur les pages verbatim (§0 ligne « Pages de partage », le tableau ci-dessous, §7 point 1 « `canonical` reste sur melenchon2027.fr », §9 « Open Graph ») pendant que `prompt-final.md` §11 prévoit six lignes plus bas « SEO : pré-rendu des pages terme **et mesure**, JSON-LD, `robots.txt` ouvert et `sitemap.xml` ». **Les deux ne peuvent pas coexister** : un canonical inter-domaines **demande explicitement la désindexation de nos pages** au profit du site officiel, et le canal SEO — compté parmi nos différenciateurs (`12-positionnement-lancement.md` §5) — tombe pour tout ce qui est mesure et section. Sur l'axe identité c'est pire qu'un problème de trafic : **le canonical est une déclaration lisible par machine que la page de l'app est la page officielle**, posée à l'endroit qu'aucun humain ne relit. Aucune ligne du dossier ne relevait la contradiction.
>
> **Une page qui cite sous licence CC n'est pas un doublon**, et la licence n'exige nulle part un canonical : elle exige une **attribution et un lien vers la source**, que nous avons déjà (`attribution.source_url`, `common.open_official`). **Créditer autrement, plus juste et plus lisible** : lien visible « Lire sur melenchon2027.fr » **+ JSON-LD `isBasedOn` / `citation`** vers l'URL de section officielle (`section.canonicalUrl` du corpus, qui porte déjà le permalien réel, y compris pour les trois sections redirigées).
>
> **Routes indexables, tranchées une fois pour toutes** (elles ne l'étaient nulle part) :
>
> | Indexables (`sitemap.xml`, publié seulement à J-3) | `noindex` |
> |---|---|
> | `/s/<section>`, `/m/<id>`, `/c/<slug>`, `/mot/<terme>`, `/a/<id>`, `/r/<theme>`, `/verifier`, pages institutionnelles | `/q/`, `/defi/`, `/p/`, `/res/`, `/diag`, `/api/*` |
>
> **Et une divergence à supprimer avant de générer les cartes** (H-PAR-10) : le tableau ci-dessous écrit `/r/<id>`, la table des routes de `prompt-final.md` §10 écrit `/r/<theme>`. Choisir **avant** la génération, sinon ≈ 970 à 2 900 fichiers portent une URL morte.

> ✅ **Schéma d'URL tranché le 10 septembre 2026 — D13.2 (identifiants) et D13.4 (`/defi/`). Le tableau ci-dessous est amendé en conséquence : ce n'est plus un brouillon sur ces trois points.**
>
> 1. **L'identifiant seul dans l'URL publique.** `https://cestecritla.fr/m/c12-s01-k01` est **permanent** : ni `corpus_version`, ni empreinte d'item dans le chemin. C'est ce lien qui part sur WhatsApp et qui s'imprime en QR.
> 2. **La version du corpus dans le chemin de l'image**, jamais dans celui de la page : **`/og/<corpus_version>/m/c12-s01-k01.png`**, servi en `Cache-Control: immutable`, la page publiant l'`og:image` de la **version courante**. Conséquence, et c'est le motif de la décision : **on régénère les ≈ 970 aperçus après un re-crawl sans casser un seul lien déjà envoyé** ; les plateformes qui gardent l'ancienne image en cache la renouvellent d'elles-mêmes puisque l'URL a changé. **H-COR-6 est levée.**
> 3. **`/defi/<n>/` est un chemin réel**, sur un **ensemble fini de 60 tirages figés** (D13.4) : chaque tirage a **sa page statique et son aperçu propre**, ce que `?n=` interdisait sur Static Assets (même HTML pour tous les index). Aucune notion de date, aucune cadence.

| Motif | Objet | Rendu | `og:image` |
|---|---|---|---|
| `/m/<id>` **(permanent, D13.2)** | mesure, mesure clé, sous-mesure (`c12-s01-k01`, `c1-s06-m01.s2`) | page verbatim ; ~~`canonical` → section officielle~~ **retiré**, remplacé par le lien visible « Lire sur melenchon2027.fr » + JSON-LD `isBasedOn` / `citation` | pré-générée au build (ADR C), servie depuis `/og/<corpus_version>/m/<id>.png` |
| `/c/<slug>` | concept du glossaire (`/c/regle-verte`) | page terme (T2), JSON-LD `DefinedTerm` | pré-générée |
| `/a/<id>` | À savoir (`c8-s02-a01`) | page chiffre + gabarit loi 77-808 | pré-générée |
| `/r/<id>` | riposte | page objection + verbatim | pré-générée |
| `/q/<AAAA-MM-JJ>` | mesure du jour (tirage déterministe) | redirection ou page | = celle de la mesure |
| `/p/<n>-<total>` | progression | page légère | 90 variantes pré-générées |
| `/res/<id,id,id>` | mes 3 mesures | page dynamique légère | générique (ADR E) ou client |
| `/defi/<n>/` **(D13.4 : 60 tirages figés, aucune date)** | tirage « Tu savais que c'était dedans ? » | **page statique par tirage** ; index hors des 60 ⇒ page « ce tirage n'existe pas », jamais de réécriture silencieuse ; les réponses restent dans le fragment `#r=`, jamais dans le chemin | **pré-générée par tirage** (c'est ce que `?n=` rendait impossible) |
| `/og/<corpus_version>/<kind>/<clé>.png` **(D13.2)** | images d'aperçu 1200×630 | statique (build), `Cache-Control: immutable` ; ~~`?r=`~~ inutile : la version est **dans le chemin**. Le carré 1080×1080 et la story 1080×1920 **n'existent pas comme fichiers** — ils sont dessinés dans le navigateur (D13.3) | — |

Réservé : `/api/*` — **en v1/v2, la seule route servie est `POST /api/e`, la balise (D13.1) ; le chat serveur appartient au contrat v3** —, `/diag`, `/exactitude`, `/a-propos`. Identifiants toujours validés par l'expression de D1.1 ; jamais de slug libre sur `/m/`.

## 8. Bot Fight Mode et domaine final

`workers.dev` n'a **aucun réglage de zone** (pas de Bot Fight Mode, pas de WAF, pas de règles de cache) : les aperçus obtenus demain ne préjugent pas du comportement sur le `.fr`. Sur la zone finale (D0.13), à vérifier avant tout envoi : Bot Fight Mode et Super Bot Fight Mode peuvent défier les robots d'aperçu (WhatsApp, Telegram, Facebook, X, Discord) ; la liste des « verified bots » de Cloudflare doit couvrir ces crawlers — HYPOTHÈSE, à tester sur le `.fr` avec les mêmes 8 liens (T10, après achat du domaine). Documenter les réglages retenus dans le runbook T7.

> ⛔ **Corrigé le 10 septembre 2026 — panel rouge T12 : « ou une règle WAF “skip” sur `/og/*` » est retiré, ce repli n'existe pas.** Bot Fight Mode (version gratuite) **ne tourne pas sur le Ruleset Engine** : ni règle WAF personnalisée, ni Page Rule ne peuvent le contourner ; **seul Super Bot Fight Mode (payant, exclu par D0.2 / D0.31) accepte les règles Skip** (VÉRIFIÉ, https://developers.cloudflare.com/bots/get-started/bot-fight-mode/, lu le 9/9/2026). La seule consigne tenable est donc **binaire : Bot Fight Mode DOIT rester OFF**, avec une capture datée de l'écran Security → Bots. Voir `docs/discovery/domaine.md` pour l'audit de zone élargi (Security Level, Browser Integrity Check, Hotlink Protection, Always Online).

## 9. Points ouverts

1. **Domaine final** : achat du `.fr` après T10 ; refaire les aperçus et `/diag` dessus (§8) ; changer `og:url`. ~~`canonical` reste sur melenchon2027.fr~~ → **retiré le 10/9/2026 (panel rouge T12)**, remplacé par le lien visible « Lire sur melenchon2027.fr » et le JSON-LD `isBasedOn` / `citation` (voir l'encadré du §7).
2. **Limite CPU du plan gratuit** (10 ms) : élimine tout rendu d'image à la demande, mais aussi tout traitement lourd côté Worker (à reporter dans T7 : l'extractif, le routage lexical, la validation doivent tenir en < 10 ms ; à mesurer par la même méthode GraphQL).
3. **Ajustement du texte dans satori** : pas d'auto-réduction ; le spike estime les lignes (largeur moyenne 0,52 em) puis descend par pas de 2 px et coupe à 320 caractères sur un mot, verbatim intact jusqu'à « … ». À remplacer par une mesure réelle (`onNodeDetected` ou double passe) au build, où le temps ne compte pas.
4. **Crénage** : polices sans GPOS pour satori 0.32 ; satori 0.33 (harfbuzz) le résoudrait mais exige un shim Workers (inutile en build-time Node, où 0.33 fonctionne).
5. **Option JPEG** : resvg ne sort que du PNG ; les tailles (< 132 Ko) ne le justifient pas. Si un jour une carte photo-like dépasse 300 Ko, encoder en JPEG au build (sharp) plutôt que réduire les dimensions.
6. **Poids des polices dans les assets** : 232 Ko pour six TTF chargés à chaque isolat froid ; sans objet en build-time. Pour l'app, D3.6 reste la référence (woff2 sous-ensemblées).
7. **Rendu côté client** (ADR D) — ✅ **tranché le 10/9/2026 (D13.3) : c'est la voie retenue pour le carré et la story**, en **Canvas 2D**, avec le code de carte partagé avec le build. Reste à **prototyper en T7 sur un Android moyen** : ce n'est plus un choix ouvert, c'est un critère de done (qualité du PNG, polices, repli « appui long »).
8. **Cache API sur workers.dev** : non testé (inutile vu l'ADR) ; à vérifier seulement si un rendu à la demande revenait sur la table avec un plan payant.
9. **Contraste sur l'aplat rose** (partie 2) : le spike met le texte en Charbon sur vif-rose et le grand chiffre en Violet (D3.4) ; à valider au canvas J3 avec la matrice.
10. **Quota requêtes** : 100 000 requêtes/jour sur le plan gratuit (VÉRIFIÉ, page de limites) — chaque aperçu WhatsApp = 2 requêtes (page + image) ; à intégrer au tableau de coût T7.

Playwright n'a pas été nécessaire pour ce livrable : les PNG ont été téléchargés directement (curl) et vérifiés visuellement ; deux captures ont été relues à l'œil (stat card `c8-s02-a01`, résultat 3 mesures) : texte non tronqué, couleurs conformes à `tokens.json`.

## 10. Revue (8 septembre 2026) — bonnes pratiques Workers, sécurité, limite CPU

> Revue sur `prototypes/spike-share/` (`wrangler.jsonc`, `src/**`, `public/_headers`) contre les *Workers best practices* (page lue le 8/9/2026, https://developers.cloudflare.com/workers/best-practices/workers-best-practices/), la page de limites (https://developers.cloudflare.com/workers/platform/limits/) et le schéma `wrangler` 4.129 (`node_modules/wrangler/config-schema.json`). Chaque point est testé en `curl` sur le Worker déployé. Correctifs redéployés : version **`a5deb170-9fff-44bc-8271-ea649c8a0da2`** (8/9/2026, démarrage 39 ms, bundle 2 951,04 Kio / gzip 1 116,34 Kio, `index.js` 471 524 o brut / 154 115 o gzip -9, wasm inchangés). Le PNG `/og/m/c12-s01-k01.png?r=og` re-téléchargé après déploiement est **octet pour octet identique** à `captures/…/mesure-c12-s01-k01-og.png` (`cmp`) — VÉRIFIÉ.

### 10.1 Verdict sur la limite CPU du plan gratuit (VÉRIFIÉ, tranche l'ADR §4)

- **Règle documentaire.** Tableau « Worker limits » : CPU time par invocation **Free : 10 ms**, Paid : 5 min. « CPU time measures how long the CPU spends executing your Worker code. Waiting on network requests (such as `fetch()` calls, KV reads, or database queries) does **not** count toward CPU time » : la limite porte sur le calcul, pas sur la durée murale. Tolérance : « Each isolate has some built-in flexibility to allow for cases where your Worker infrequently runs over the configured limit. If your Worker starts hitting the limit consistently, its execution will be terminated according to the limit configured. » `limits.cpu_ms` (schéma wrangler) ne relève la limite que sur le modèle Standard (« Limits are only supported for the Standard Usage Model »), c'est-à-dire le plan payant, exclu par D0.2/D0.31.
- **Mesure.** satori et resvg sont du calcul pur (aucune E/S une fois polices et wasm chargés) : la durée murale est du CPU (wall p50 349 ms ≈ CPU p50 317 ms sur les 32 premiers rendus). CPU médian par carte réussie : og **137 ms**, square **194 ms**, story **283 ms** ; p90 233-667 ms ; p99 759 ms — soit **14 à 28 fois** la limite en médiane, jusqu'à 76 fois. Les invocations tuées sont coupées à 10 ms (statut `exceededResources`, 503 code 1102). La correction HEAD ci-dessous supprime des rendus inutiles mais ne change rien au coût d'un GET.
- **Conclusion.** Le rendu d'image à la demande **dépasse la limite à chaque requête** ; seule la tolérance « infrequently » explique les premiers succès, et elle s'épuise en quelques dizaines de rendus (33-75 % de 503, §2.3). Un cache (option B) ne protège pas le premier rendu par colo et par version. **Le chemin runtime n'est pas viable sur le plan gratuit ; l'ADR doit dire build-time (option C) — D4.1 confirmée par la revue.** Corollaire pour T7 : tout traitement Worker (extractif, routage lexical, validation) se mesure par la même méthode et doit rester < 10 ms.

### 10.2 Constats → corrigés (déployés)

| # | Constat | Correctif |
|---|---|---|
| 1 | **HEAD sur `/og/*` rendait l'image** : `curl -I` renvoyait `content-length: 63935` après un rendu complet dont le corps est jeté (137-283 ms de CPU pour rien ; certains crawlers sondent en HEAD, ce qui consommait la tolérance CPU avant le GET) | `handleImage` répond aux HEAD par les en-têtes seuls après validation de l'id (404 conservé pour un id inconnu) : 0,24 s, aucun rendu — VÉRIFIÉ |
| 2 | Réponses d'erreur JSON (400/404/500 sur `/og/*`) **sans `Cache-Control`** | `cache-control: no-store` sur toutes les erreurs (JSON comme HTML) — VÉRIFIÉ sur `/og/m/bad.png`, `/og/m/c99-s01-k01.png`, `/og/p/90-89.png` |
| 3 | `env.ASSETS.fetch(request)` (routes non-carte) **hors du `try/catch`** : une exception aurait produit une erreur 1101 brute au lieu du 500 structuré + journal JSON | Repli assets déplacé dans la frontière d'erreur ; choix HTML/JSON calculé une fois (`wantsHtml`) |
| 4 | `render.ts` : **init wasm combinée** dans une seule promesse réinitialisée sur échec, alors que `initWasm()` de resvg-wasm ne peut être appelée qu'une fois (« Already initialized. The `initWasm()` function can be used only once. ») : un échec côté satori laissait l'isolat incapable de réessayer | Deux promesses mémorisées séparément (`satoriReady`, `resvgReady`), chacune réinitialisée sur son propre échec |
| 5 | Objets wasm-bindgen `Resvg` et `RenderedImage` **jamais libérés** (`free()`) : mémoire linéaire wasm partagée par toutes les requêtes de l'isolat (limite 128 Mo), libération laissée à `FinalizationRegistry` | `free()` explicite en `try/finally` après `asPng()` ; rendu identique (cmp) |
| 6 | `package.json` `engines.node >= 20` alors que wrangler 4 exige Node ≥ 22 (§1, contournement 3) | `>= 22` |

### 10.3 Constats → conformes (vérifiés, aucun changement)

- **Validation des identifiants** : expression D1.1 stricte (`/^c\d{1,2}-s\d{2}-(k|m|a)\d{2}(\.s\d)?$/`) appliquée avant tout accès aux données ; `/m/%3Cscript%3E`, `/m/'"><img …>` → 400 ; `/og/m/..%2f..%2fx.png` → 400 JSON ; id inconnu → 404 ; `/res/` limité à 3 ids ; `/p/` exige `total = 89` — VÉRIFIÉ.
- **Aucune traversée via le binding ASSETS** : `/fonts/../wrangler.jsonc` → 404, `/data/..%2f..%2fpackage.json` → 400, `/%2e%2e/wrangler.jsonc` → 400 (bord Cloudflare), `/_headers` → 404 (non servi). Le binding ne sert que le manifeste de `public/` ; `public/data/*.json` et `public/fonts/*.ttf` sont publics par conception (CC BY-NC-SA, OFL) — VÉRIFIÉ.
- **Échappement HTML** : `escapeHtml` (`& < > " '`) sur titre, description, kicker, verbatim (`bodyHtml` construit par l'appelant), toutes les URL en attribut, `og:image:alt`, messages d'erreur. Le seul texte utilisateur reflété est l'id fautif de `/res/` : `/res/c1-s01-k01,%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E` → `<h1>identifiant invalide : %3Cimg…</h1>` (le chemin reste percent-encodé et serait de toute façon échappé) ; JSON via `JSON.stringify` + `nosniff` — VÉRIFIÉ.
- **En-têtes** (VÉRIFIÉ) : pages Worker → `text/html; charset=utf-8`, `Content-Security-Policy: default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `X-Robots-Tag: noindex`, y compris sur les pages d'erreur ; PNG → `image/png`, `nosniff`, `Content-Length`, `Cache-Control: public, max-age=86400` ; JSON → `nosniff` ; statiques via `public/_headers` (`/*` nosniff + referrer + noindex ; `/` et `/diag` avec leur CSP, `/diag` autorisant `script-src 'self'` pour `diag.js`). `/diag.html` → 307 vers `/diag` (`html_handling`). Aucune page ne charge de script sauf `/diag` (fichier local).
- **Open Graph** : exactement une `og:image` (`grep -c` = 1), URL absolue en https (redirection 301 `http://` → `https://` en amont de tout traitement), `og:image:type/width/height/alt`, `og:url` absolue, `og:type article`, `og:locale fr_FR`, `twitter:card summary_large_image`, `rel=canonical` vers la section officielle ; `og:description` ≤ 200 caractères, coupée sur un mot — VÉRIFIÉ.
- **Méthodes** : `POST` → 405 JSON avec `Allow: GET, HEAD` — VÉRIFIÉ.
- **Bonnes pratiques Workers** : aucune promesse flottante (relecture ligne à ligne : `fetch`, `arrayBuffer`, `json`, `satori`, `loadCorpus`, `renderPng` sont tous attendus ou retournés ; pas d'ESLint dans le spike) ; état de module limité à des **caches immuables** (wasm, polices, corpus) réinitialisés sur échec, aucune donnée de requête ; pas de `passThroughOnException` ; `try/catch` explicite avec message utilisateur et `console.error` JSON structuré ; `Env` généré par `wrangler types` (jamais écrit à la main), `satisfies ExportedHandler<Env>`, `ctx` non destructuré (non utilisé) ; aucune charge non bornée (PNG ≤ 132 Ko, JSON 249 Ko, polices ≤ 56 Ko) ; 8 sous-requêtes à froid pour 50 autorisées ; aucun secret, `Math.random` absent.
- **Configuration** : `compatibility_date` de la veille ; `assets.run_worker_first` en tableau et `not_found_handling: "none"` valides selon le schéma ; `observability` activée volontairement pour le spike (l'app coupera `logs.invocation_logs`, D0.22) ; aucune ressource payante, un seul binding (`ASSETS`).

### 10.4 Constats → ouverts (laissés tels quels, motivés)

1. `nodejs_compat` non activé : recommandé par les bonnes pratiques, mais satori standalone n'en a pas besoin (déploiement et rendu vérifiés) et l'activer pourrait changer le bundling ; sans objet une fois le rendu passé au build (Node).
2. `style-src 'unsafe-inline'` : un nonce ou un hash serait plus strict ; la page ne contient aucun script et `default-src 'none'` ferme le reste — risque nul pour le spike.
3. `/m/<id>/` (slash final) répond 200 en doublon de `/m/<id>` (`og:url` normalisée sans slash) ; un 301 serait plus propre. Cosmétique.
4. `X-Robots-Tag: noindex` sur les pages de partage : à notre connaissance, les crawlers d'aperçu (WhatsApp, Telegram, facebookexternalhit) ne l'honorent pas — HYPOTHÈSE. Si un aperçu manque demain **sans** 503 côté image, retester le même lien sans cet en-tête avant de conclure sur le format.
5. Les 503 « 1102 » sont émis par la plateforme, sans nos en-têtes ni `Cache-Control` : un crawler peut mémoriser « pas d'image » — inhérent à l'option A rejetée, pas corrigeable côté code.
6. `Cache-Control` des statiques laissé par défaut (`public, max-age=0, must-revalidate`) : sans effet sur le spike (polices et données sont lues par le Worker via le binding, pas par le navigateur).
7. `Referrer-Policy` absent des réponses PNG et JSON : sans effet (ce ne sont pas des documents navigables).
8. `public/diag.js` compose du HTML avec des chaînes fournies par le navigateur lui-même (`userAgentData.brands`, erreur `localStorage`) : au pire une auto-injection par l'utilisateur sur son propre appareil, aucun vecteur distant ; l'UA complète passe par `textContent`.
9. Pas d'ESLint dans le spike : la règle `no-floating-promises` n'est pas automatisée (vérification manuelle ci-dessus) ; l'app aura la configuration ESLint/Prettier du dépôt.

Rien n'est commité par la revue.
