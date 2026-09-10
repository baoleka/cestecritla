# Prototypes cliquables J3 — `proto.cestecritla.fr`

> Produit le 9 septembre 2026 (T3 partie 2, canvas J3), intégré et **déployé le 9 septembre 2026** (Worker `aec-proto`, assets seuls). **Socle commun** des modules cliquables : HTML + CSS + JavaScript en modules ES, sans framework ni bundler (la décision de framework se mesure en T7, D0.9). Direction A « éditorial-typographique » comme socle, hybride D3.9 ; 18 corrections de `05-direction-artistique.md` §9 appliquées ; anatomie dense corrigée D3.10 ; registre tu, écran 0 par lien à l'impersonnel D3.12 ; mascotte Marcheuse réservée à la jauge D3.11.
>
> Captures : `docs/discovery/captures/2026-09-10/proto/<module>/` (390 × 844 @2×, clair `.png` et sombre `.dark.png`, page entière `.full.png`, `report.json` avec paires de contraste, cibles, requêtes externes, `SHA256SUMS.txt`). Captures **du site en ligne** : `live-*.png` dans les mêmes dossiers, `live-report.json` (console, requêtes, polices, en-têtes), `live-sizes.json` (poids sur le fil), `SHA256SUMS-live.txt`.
>
> Statut : **prototype** (HYPOTHÈSE de forme, à juger par les personas-agents de la session 2, D11.1). Tout texte du programme est VÉRIFIÉ : tiré par identifiant du corpus `d29c7422004ab27c`, jamais recopié.

## 0. URLs en ligne (VÉRIFIÉ le 9/9/2026, `curl` 200 + Playwright 0 erreur console)

Hôte principal : **https://proto.cestecritla.fr/** (domaine personnalisé, zone `cestecritla.fr`, D10.2). Miroir pour les liens des testeurs : **https://aec-proto.baoleka.workers.dev/** (même contenu, même version). Les deux répondent `noindex`, CSP stricte, `Referrer-Policy: no-referrer`.

| Module | URL | Ce qu'on y voit |
|---|---|---|
| Index des modules | https://proto.cestecritla.fr/ | liste des écrans ci-dessous, démos, « À propos », « Effacer ma progression » |
| Accueil (écran 0 direct) | https://proto.cestecritla.fr/home/ | recherche locale (`#q=loyer`), riposte du jour, mesure du jour, « Ta lecture », chapitres ; `?silence=1`, `?date=2026-09-11` |
| Arrivée par lien (témoin T) | https://proto.cestecritla.fr/link/?id=c12-s01-k01 | verbatim héros de la règle verte, « Comprendre en clair » ; `?id=c9-s01-m04` sans carte-concept |
| Lecteur de section | https://proto.cestecritla.fr/section/?id=c12-s01 | chapeau, mesure clé, 11 mesures, « À savoir » ; `?id=c14-s02#c14-s02-m09` mesure ciblée + sidecar 77-808 |
| Carte-concept | https://proto.cestecritla.fr/concept/ | `?slug=regle-verte` par défaut ; `?slug=planification-ecologique` |
| F1 « Tu savais que c'était dedans ? » | https://proto.cestecritla.fr/defi/?n=254 | tirage du 11 septembre ; `#r=ddsdp` = arrivée par lien avec réponses ; `/defi/` = tirage du jour |
| F2 « Laquelle est ici ? » | https://proto.cestecritla.fr/q/?s=c12-s01 | trois mesures verbatim, « Passer » ; `&from=link` ; carte 1200 × 630 : https://proto.cestecritla.fr/q/card?s=c12-s01 |
| Mode riposte, grille | https://proto.cestecritla.fr/riposte/ | 14 boutons par thème |
| Flashcard | https://proto.cestecritla.fr/riposte/?id=rip-01 | recto « Ce qu'on entend souvent » ; `#texte` = verso ; `?id=rip-14` loyers |
| Entraînement | https://proto.cestecritla.fr/riposte/?flash=1 | dix secondes par objection, « Passer », aucun score |
| 404 | https://proto.cestecritla.fr/nope | page `404.html` (statut 404) |

Routage Static Assets (`html_handling: auto-trailing-slash`) : `/section` → 307 `/section/` ; `/q/card.html` → 307 `/q/card` (les `.html` sont servis **sans extension** : lier `q/card?s=…`) ; `/index.html` → `/`. `README.md`, `wrangler.jsonc`, `.assetsignore`, `_headers`, `scripts/`, `tools/` ne sont pas servis (404 vérifié).

## 1. Arborescence

| Chemin | Rôle |
|---|---|
| `wrangler.jsonc` | Worker **assets seuls** `aec-proto` (aucun code, aucun binding, plan gratuit) ; domaine `proto.cestecritla.fr` + `workers.dev` ; `html_handling: auto-trailing-slash` (`/section` → `/section/`), `not_found_handling: 404-page` ; journaux d'invocation désactivés (D0.22) |
| `.assetsignore` | Exclut `wrangler.jsonc`, les `README.md`, `scripts/`, `tools/`, `.wrangler` de l'upload (`_headers` est lu comme configuration, jamais servi) |
| `_headers` | `nosniff`, `Referrer-Policy: no-referrer`, `noindex`, CSP `default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; connect-src 'self'` (aucun style ni script inline, aucun tiers) ; polices immuables 1 an |
| `index.html` + `root.js` | Liste des modules, démos, « À propos » avec `privacy.local_state` et le bouton « Effacer ma progression » |
| `404.html` | Page introuvable (`error.404.*`) |
| `shared/tokens.css` | `design/tokens.json` v0 en propriétés CSS, rôles clair sur `:root`, rôles sombre sous `prefers-color-scheme` ; corrections v0.2 : étiquette 12 px minimum, tailles en `rem`, ombre 3D sombre = Violet 200 |
| `shared/base.css` | Reset, `@font-face` des 4 sous-ensembles (D3.6), gamme typographique, titre d'écran 900 italique capitales à lignes décalées, bloc verbatim Gowun Batang « Texte du programme », liste de mesures numérotées, boutons (bloc flèche = navigation seulement), cartes à filet, StatCard 77-808 (numéral ≤ 24 px), volet source, jauge plate + Marcheuse, toast, groupe de partage, explorable, utilitaire `.block-3d` (un par écran) |
| `shared/fonts/` | Public Sans variable droite + italique, Gowun Batang 400 + 700, latin sous-ensemblé (99,7 Ko au total, OFL) |
| `shared/data/` | `slim.json` (projection D1.6 du spike T4, copie), `stat-cards.json`, `glossary.json`, `riposte.json`, `strings.json` (copies de `data/` et `design/`) ; **dérivés par script** `scripts/build-extras.mjs` : `extras.json` (4 parties + 27 paragraphes d'introduction, verbatim, absents de la projection) et `concept-index.json` (slug → ids des 5 cartes) ; `stat-cards-legal.json` = sidecar 77-808 du prototype (§9.0, PROBABLE) |
| `shared/ui.js` | Module partagé (API §2) |
| `shared/motion.css` + `shared/motion.js` | Les trois micro-interactions de `design/motion-spec.md`, branchées par attributs `data-motion` seulement : `reveal` (bloc verbatim qui se met en place à l'arrivée dans le viewport, 240 ms), `crossfade` (lien concept → section en View Transition cross-document, 200 ms) + `content` (conteneur rendu par script : fondu d'arrivée 200 ms tant que la page n'est pas pré-rendue), `press` (« Passer » et boutons de carte : `scale(0.96)` 120 ms sous le doigt). `transform`/`opacity` seulement, ≤ 320 ms, tout à 0 ms et sans transform sous `prefers-reduced-motion` |
| `tools/` | Sondes Playwright (non déployées) : `fps-probe.mjs` (frames à CPU ×4, P6, `perf-budget.md` §5.2), `vt-probe.mjs` (la transition concept → section bloque-t-elle la saisie ?) ; usage dans `design/motion-spec.md` §4 |
| `home/` | Écran 0 direct (militant, D0.19) |
| `link/` | Écran 0 par lien (`?id=<mesure ou section>`, D3.9 hybride, D3.12) |
| `section/` | Lecteur `SectionVerbatim` (`?id=<section>#<mesure>`) |
| `concept/` | Carte-concept dense corrigée (`?slug=regle-verte`) |
| `defi/` | **F1 « Tu savais que c'était dedans ? »** (`?n=254`, `#r=` cinq caractères) : table `defis.json` (3 jours), carte 1080 × 1920 en canvas, test de build `scripts/check-defis.mjs` ; voir `defi/README.md` |
| `q/` | **F2 « Laquelle est ici ? »** (`?s=<section>`, `&from=link`) : triplets `shared/data/quiz-triplets.json` (`scripts/build-triplets.mjs`), carte 1200 × 630 en HTML (`card.html`, servie `/q/card`) ; voir `q/README.md` |
| `riposte/` | Mode riposte T8 : grille marché, flashcard (`?id=rip-NN`, `#texte` = verso), entraînement (`?flash=1`), entrée QR (`?theme=<slug>`) ; `riposte.css` propre au module, corrections D5.11 appliquées en JS (`riposte.js`), `shared/data/riposte.json` intact |

Régénérer les dérivés : `node prototypes/proto/scripts/build-extras.mjs` (racine du dépôt). Régénérer `slim.json` : `cd prototypes/spike-share && npx tsx scripts/build-data.ts`, puis copier `public/data/slim.json` ici.

### Lancer en local

Node 24 via nvm ; wrangler est installé dans `prototypes/spike-share` (aucun `package.json` ici, rien à installer) :

```sh
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"
cd prototypes/proto
npx --prefix ../spike-share wrangler dev --port 8790 --persist-to /tmp/aec-proto-state
# puis http://127.0.0.1:8790/
```

`wrangler dev` sert le dossier avec les vrais en-têtes de `_headers` (CSP comprise) et le vrai routage (`/section` → `/section/`, `/q/card`). **`--persist-to` hors du dossier est nécessaire** : `assets.directory` est `./`, et sans ce flag wrangler écrit son état dans `./.wrangler/state`, se voit lui-même changer et recharge en boucle (VÉRIFIÉ le 9/9 : 373 rechargements en deux minutes, requêtes qui n'aboutissent pas ; 1 seul rechargement avec le flag). Alternative sans en-têtes ni CSP : `python3 -m http.server 8765` depuis ce dossier (les chemins d'assets sont relatifs, les routes sont calculées depuis `import.meta.url`) — dans ce cas `q/card.html` garde son extension.

### Déployer

```sh
cd prototypes/proto && rm -rf .wrangler
npx --prefix ../spike-share wrangler deploy          # --dry-run pour vérifier la liste
```

Compte OAuth `wrangler login` (aucun jeton dans le dépôt). Le déploiement du 9/9/2026 : 45 fichiers (les `README.md`, `scripts/`, `tools/`, `wrangler.jsonc` sont exclus par `.assetsignore` ; `_headers` devient la configuration d'en-têtes), 0 binding, 0,32 Ko de Worker, domaine personnalisé actif immédiatement (TLS en place, 200 à la première requête). Brotli côté Cloudflare : `slim.json` 249 Ko → 69 Ko, `ui.js` 33 Ko → 11 Ko ; polices servies telles quelles (`immutable`, 1 an). Redéployer ne renvoie que les fichiers modifiés (hash).

## 2. API de `shared/ui.js`

| Export | Rôle |
|---|---|
| `init()` / `loadStrings()` / `loadCorpus()` | Chargent une fois `strings.json` (+ `STRINGS_V02`), `slim.json` + `extras.json` + `concept-index.json`, et construisent l'index en mémoire (`sections`, `chapters`, `parts`, `items` par id, `order` des 89 sections, `keyMeasureIds`) |
| `getSection(id)`, `getItem(id)`, `getChapter(id)`, `getPart(id)`, `locate(idOuItem)`, `locationLine(id)`, `conceptsFor(id)` | Accès synchrone après `init()` ; `locate` accepte les items bruts de `section.items` |
| `t(key, params)`, `frTypo(s)` | Chaînes du kit avec `{placeholders}` ; typographie française au rendu (apostrophe ’, U+00A0 avant `? ! : ;`, dans « ») |
| `formatVerbatim(id, { variant: 'hero' \| 'key' \| 'compact', label, kind, readLink, highlight, anchor })` | `<blockquote class="verbatim">` en Gowun Batang : étiquette « Texte du programme » (ou « Mesure clé »), texte, sous-mesures, ligne « Chapitre 12 · … · … », lien « Lire la section » vers `/section/?id=…#<id>` |
| `formatChapeau(item)`, `statCard(card, { sidecar, collapsed, sectionUrl, label })`, `loadStatCards()` | Chapeau ; carte « À savoir » sous gabarit 77-808 (`statcard.legal.full` avec le sidecar, sinon `statcard.legal.no_sponsor`, marge d'erreur, lien vers l'encadré) |
| `shareButton({ title, text, url, label, primary })`, `share()`, `waLink()` | Trois niveaux : `navigator.share` → copie presse-papiers + toast → lien `wa.me` ; libellés « Envoyer sur WhatsApp » / « Copier le lien » (D3.9) ; remplacé par `silence.share` sous silence électoral |
| `toast(message)` | `role="status"`, opacité 200 ms, 2,4 s |
| `progress.{list, has, mark, last, clear, chaptersRead}` | `localStorage['cel.progress.v1'] = { sections: [ids] }`, rien d'autre (pas d'horodatage, pas d'identifiant) |
| `effectiveDate()`, `silence()`, `isoDay()`, `formatDateFr()` | Stubs L49 (D0.24) : jour UTC, démo `?date=YYYY-MM-DD` ; `?silence=1` gèle partage et mesure du jour, la lecture reste ouverte |
| `dailyMeasure(date)` | Mesure clé du jour : FNV-1a(`version:date`) mod 87, formule affichée sur l'accueil |
| `search(q, { limit })`, `normalize()`, `findRange()`, `markedText()` | Correspondance lexicale par sous-chaîne sur texte normalisé (titres de sections et chapitres, mesures clés, mesures, sous-mesures, alias des 5 cartes), ≤ 10 résultats, aucune requête réseau |
| `button()`, `el()`, `marcheuse({ walk })`, `revealHash()`, `setTitle()`, `qs()`, `hashParam()`, `routes`, `absolute()`, `APP` | Utilitaires DOM et routes du prototype |

`STRINGS_V02` (dans `ui.js`) liste les chaînes proposées en plus du kit v0 : `home.link.sent_by_hint` à l'impersonnel (« Ce passage vient du livre officiel. »), `home.link.title_short` (« Mot pour mot. », ≤ 6 mots), `privacy.no_account_impersonal`, `search.local_promise` (§8.6), `progress.section_done` neutre (« Section lue. »), chaînes du lecteur de section et de l'explorable (« sur une période donnée », « prend »). À juger en T9 / T11 avant d'entrer dans `design/strings.json`.

## 3. Les écrans

| Module | Composition | CTA primaire | État |
|---|---|---|---|
| `link/?id=c12-s01-k01` | Wordmark (seul bloc 3D), kicker « Extrait de L'Avenir en commun, édition 2025 », **verbatim héros** (Gowun 21 px, ligne chapitre › section), « Ce passage vient du livre officiel. », titre « Mot pour mot. », **CTA dans les 600 premiers px** (bas du bouton à 560 px avec la mesure clé de 150 caractères, 424 px avec `c9-s01-m04`), ligne d'indépendance (bas à 613 px) et `privacy.no_account` à l'impersonnel, puis « Lire la section » et « Explorer le programme » | « Comprendre en clair » → `/concept/` quand une carte cite la mesure, sinon « Lire la section » | `?id` seulement |
| `home/` | « Ta munition, en dix secondes. », champ de recherche (résultats en direct, mot surligné, `#q=`), promesse locale, riposte du jour (`rip-11` exclue, D5.11) avec « On te dit : » / « Tu réponds avec le texte : », mesure du jour + « Celle d'hier » + formule du tirage, « Ta lecture » (`localStorage`), table des 18 chapitres par partie | « Chercher dans le programme » | `#q=`, `?date=`, `?silence=1` |
| `section/?id=c12-s01` | Partie (carré Vif vert décoratif), chapitre, titre d'écran **sans troncature**, « Voir sur melenchon2027.fr », chapeau, mesure clé (« Envoyer cette mesure »), N mesures numérotées avec « Envoyer » chacune et sous-mesures imbriquées, cible `#id` surlignée, « À savoir » 77-808 (sidecar pour `c12-s01-a01` et `c14-s02-a01`), « Vérifier à la source » avec URL, jauge plate + Marcheuse, « Section lue. » quand la fin des mesures est atteinte, « Suivant » dans l'ordre du livre, « Section précédente » ; `?back=/defi/254&backLabel=…` pour les modules de jeu | « Envoyer cette mesure » | `?id`, `#<item>`, `localStorage` (sections lues) |
| `concept/?slug=regle-verte` | Titre, badge « Rédigé par nous, relu par un humain », **En clair** sans tap avec un appel discret par source (12.1, 14.2, intro), verbatim héros, source, Pourquoi ça compte + pastille « Contexte 2022 », objection entre guillemets après « On te dit : », « À savoir » replié, mesures liées, termes voisins existants seulement, **explorable replié** (`input type="range"` + moins / autant / plus, barres « Ce que la nature refait sur une période donnée » / « Ce qu'on prend », verdict `aria-live`) | « Envoyer cette carte » | `?slug` seulement |
| `defi/?n=254` | Ligne de contexte impersonnelle (par lien), « Tirage du 11 septembre », titre « Tu savais que c'était dedans ? », « 1 / 5 », carte verbatim avec « Chapitre 9 › … » et « Lire la section », deux boutons égaux « Je savais » / « Je découvre » + « Passer » (aucun glissement, D5.9), « 5 mesures · 1 min · rien à saisir » ; résultat « 3 mesures qui m'ont surpris·e », mosaïque des chapitres, « Et toi ? » (lien nu), « Comparer nos découvertes » (`#r=`), « Encore ? », annexe des 5 ; carte canvas 1080 × 1920 ; variante `#r=` avec bloc « en commun » ; jamais de « sur 5 » ni de compte « je savais » | « Je savais » / « Je découvre » (poids égal), puis « Et toi ? » | `?n`, `#r=` (reçu), `#p=` (joueur, jamais partagé) ; aucun `localStorage` |
| `riposte/` | **Grille marché** : titre « Mode riposte », « Gros boutons, par thème, sans réseau. », 14 boutons (2 colonnes, ≥ 56 px, texte 18 px, Charbon sur Crème sans surface teintée) = carré de partie + mot de thème + objection raccourcie ≤ 6 mots entre guillemets ; un tap ouvre le **verso** (`?id=rip-NN#texte`) ; « S'entraîner » → `?flash=1`. **Recto** (`?id=rip-NN`, arrivée par lien ou QR) : thème, étiquette « Ce qu'on entend souvent », l'objection en 18 px gras entre guillemets (jamais plus grosse que la réponse, correction 10), « Retourner la carte ». **Verso** : rappel de l'objection en petit, « Tu réponds avec le texte : », les mesures de `measure_ids` en Gowun Batang avec « Mesure clé / Mesure », ligne chapitre · section, « Lire la section » (→ `/section/?id=…&back=…#<id>`, bouton « Retour à la riposte » dans le lecteur), « Le chiffre » sous gabarit 77-808 (jamais `c13-s03-a02`, aucune pour `rip-08` et `rip-12`), « En clair (reformulé) », panneau Désintox (titre + URL seulement, « Ce lien demande le réseau. » hors ligne, note `partial` pour `rip-08`), « Envoyer cette riposte » (texte = un verbatim + attribution, jamais le liant ni l'objection ; URL = `?id=rip-NN#texte`), « Ce qu'il vaut mieux ne pas dire » replié, « Objection suivante », « Retour aux thèmes ». **Entraînement** (`?flash=1[&id=…]`) : ordre déterministe par jour (FNV-1a `version:date:riposte`, Fisher-Yates), « Entraînement · dix secondes par objection · n sur 14 » (position, pas score), barre de 4 px par pas discrets (100 ms, 1 s en reduced-motion, aucune transition CSS), « Dix secondes. Retourne la carte. » à l'échéance, « Passer » (bouton, aucun swipe, D5.9), verso avec « Objection suivante » en primaire, fin « Série terminée. ». `rip-11` : retirée de la grille et de l'entraînement, atteignable par id avec bandeau « à reformuler » (D5.11). `?silence=1` : entraînement et partage gelés, lecture ouverte. Rien en `localStorage` ; aucune requête après le premier chargement (navigation `pushState`, vérifié hors ligne) | « Envoyer cette riposte » (verso) / « Retourner la carte » (recto) / « Objection suivante » (entraînement) | `?id`, `#texte`, `?flash`, `?done`, `?theme`, `?date`, `?silence` |

## 4. Vérifications d'intégration en ligne (9/9/2026, Playwright Chromium 390 × 844 @2×, `live-report.json`)

- **13 écrans × clair/sombre** sur `proto.cestecritla.fr` et 30 × 2 sur `aec-proto.baoleka.workers.dev` : **0 erreur console, 0 avertissement, 0 requête échouée, 0 requête externe** (la seule ligne console de `/nope` est le statut 404 attendu). CSP `default-src 'none'` active en production : aucune violation.
- **Parcours croisés** en ligne : F1 réponse → « Lire la section » → « Reprendre le tirage (3/5) » → résultat → carte canvas 1080 × 1920 ; F2 réponse → révélation → lecteur avec « Retour à la question » et mesure ciblée `.is-target` ; grille riposte → verso `?id=rip-01#texte` → « Lire la section » → « Retour à la riposte » ; entraînement « Passer » ; explorable règle verte (verdict `aria-live`) ; « Copier le lien » → toast « Lien copié. » ; recherche `loyer` → 6 résultats, `#q=loyer` ; « Effacer ma progression » → « Progression effacée. ». Tous les liens de l'index répondent 200.
- **Polices** : chargées depuis `/shared/fonts/` (Public Sans droite + italique partout ; Gowun Batang 400 sur les écrans à verbatim ; Gowun 700 sur le lecteur de section seulement).
- **Mode sombre** : `prefers-color-scheme: dark` rend Charbon `rgb(33,35,32)` en fond sur chaque écran ; un seul `box-shadow` (le wordmark) par écran, `scrollWidth = 390` partout (1200 pour la carte).
- **Poids sur le fil** (brotli, `live-sizes.json`) : index 8 requêtes / 86 Ko ; `/link/` 12 / 184 Ko ; `/section/` 17 / 219 Ko ; `/concept/` 17 / 237 Ko (glossaire 37 Ko) ; `/defi/` 17 / 201 Ko ; `/q/` 16 / 197 Ko ; `/riposte/` 18 / 211 Ko. `slim.json` (69 Ko) et les polices (49 à 80 Ko) font l'essentiel : le budget P1/P3 passe par le pré-rendu et la projection par section (T7).
- **Correctifs d'intégration** : hooks `data-motion="content"` / `"press"` posés sur `/riposte/` (le module n'embarquait pas `shared/motion.css` + `motion.js`, contrairement aux autres) ; lien de l'index vers `q/card?s=…` (extension retirée par le routage) ; ajout de `/riposte/?id=rip-01` à l'index. Aucune autre correction nécessaire : chemins relatifs `../shared/` corrects dans les 7 modules, `import.meta.url` pour les routes.

## 4 bis. Vérifications locales (9/9/2026, Playwright Chromium, `report.json`)

- **0 requête externe** sur les 20 rendus ; 0 erreur console ; `scrollWidth = 390` partout.
- **Contraste** : paires texte/fond calculées sur chaque nœud texte : clair 8 paires (5,10 à 15,45), sombre 8 paires (9,34 à 15,45) ; aucun Violet sur Charbon, aucune vive en texte.
- **Un seul élément à `box-shadow` par écran** (le wordmark).
- **Cibles** : boutons ≥ 52 px, liens hors texte ≥ 24 px ; les appels de source et les liens en ligne dans une phrase relèvent de l'exception « en ligne » de WCAG 2.5.8.
- **Polices** : Public Sans droite + italique, Gowun Batang 400 chargées depuis `shared/fonts/` ; Gowun 700 non utilisée par le socle.
- **Interactions** (`docs/discovery/captures/2026-09-10/proto/interact.mjs`, à lancer avec Playwright contre `http://127.0.0.1:8765`, comme `capture.mjs`) : explorable (boutons et curseur), partage sans Web Share (lien `wa.me` + « Copier le lien » → toast « Lien copié. »), recherche (`#q=`, carte-concept en tête pour « règle verte »), progression (marque à la fin des mesures, reprise sur l'accueil, effacement), ids inconnus, `?silence=1`.
- **Riposte** (`captures/2026-09-10/proto/riposte/`, `riposte-check.mjs` du scratchpad) : 14 tuiles ≥ 93 px, texte 18 px, ≤ 6 mots ; verso en un tap depuis la grille ; `rip-08` / `rip-12` sans carte ; ordres `rip-06/10/13` corrigés ; `rip-11` absente de la grille, bandeau par id ; barre 0 → 50 % → 100 % en dix secondes, `transition-duration: 0s`, message à l'échéance ; « Passer » et « Objection suivante » ; ordre du 11/9 ≠ 12/9 ; `?theme=logement` → `?id=rip-14#texte` ; `?silence=1` gèle entraînement et partage ; **0 requête** pendant une navigation hors ligne (grille → verso → grille → entraînement → verso) ; clavier : Tab → « Retourner la carte » → Entrée = verso, focus sur le contenu ; 0 erreur console, 0 requête externe, 1 seul bloc 3D, paires de contraste identiques au socle.
- **Poids** (gzip) : `ui.js` 10,4 Ko, `base.css` 5,0 Ko, `tokens.css` 2,0 Ko, page `link` 0,9 Ko + `link.js` 1,1 Ko ; `slim.json` 69,4 Ko + `extras.json` 9,4 Ko chargés après le HTML ; polices 99,7 Ko brutes au total (P8 demande ≤ 75 Ko : à re-sous-ensembler en T7, HYPOTHÈSE).

## 5. Ce qui reste ouvert

- Le texte de l'écran 0 par lien est rendu côté client (le HTML initial porte le chrome et le titre) : le budget P1/P3 exige un pré-rendu au build (T7).
- Pseudonyme du relecteur (D0.15) : le badge dit « relu par un humain » en attendant.
- `stat-cards-legal.json` : mentions PROBABLE, à archiver avec le rapport Harris (T9).
- La ligne « pas de compte » du kit dit « tes questions » : la variante impersonnelle de l'écran 0 par lien est une proposition v0.2.
- Finalistes : `/defi/` (F1) et `/q/` (F2) livrés et en ligne (voir `defi/README.md`, `q/README.md`) ; `/m/` (carte de mesure standard, témoin T) n'est pas prototypé (mention sans lien sur l'index).
- `/riposte/` : ce que D5.11 exige encore **dans les données** (le prototype ne fait que le mapping en JS, `data/riposte.json` est intact) : `rip-11` à reformuler ou retirer (validation D0.27) ; champs `theme_slug` et `theme_label` (liste fermée, jamais le mot de l'accusation) ; champ `objection_short_fr` ≤ 6 mots pour la grille ; `stat_card_id: null` pour `rip-08` et `rip-12` ; ordre des `measure_ids` de `rip-06` (`m06, c4-s03-m02, m07, k01`), `rip-10` (`m02` d'abord), `rip-13` (`m02` d'abord) ; sidecar `stat-cards-legal.json` pour les 11 cartes restantes (institut, commanditaire, dates de terrain, échantillon) — §7.4 veut qu'une carte n'apparaisse dans une riposte **qu'avec** le sidecar ; ici elle s'affiche sous la ligne 77-808 « Commanditaire non précisé dans le livre » (HYPOTHÈSE, à trancher T9) ; `rip-13` « à retravailler » (05-DA §9) ; nom affiché « Réplique » vs « Mode riposte » (07 §7.4, J6) à tester en session 2.
- `/defi/?n=1` : l'index de F1 est le jour de l'année (253-255 publiés) ; un `?n` inconnu (1, 9999) retombe sur le tirage du jour sous son vrai index, sans erreur. La numérotation de production est à décider en T7 (§9.1).
- `wrangler dev` avec `assets.directory = ./` exige `--persist-to` hors du dossier (voir §1) ; la v1 servira un dossier de build dédié (`dist/`), ce qui rend le flag inutile.
- Le `Content-Type` des pages est `text/html` sans `charset` en production (Static Assets) : le `<meta charset="utf-8">` de chaque page suffit, à confirmer pour la v1.

## 6. Ce qui est propre au prototype (ne pas reproduire tel quel en v1)

- **Rendu côté client** de tout le contenu (le HTML ne porte que le chrome et « Chargement… ») : la v1 pré-rend chaque écran au build (T7, budget P1/P3) et le `data-motion="content"` disparaît avec.
- **`slim.json` entier** (69 Ko brotli) chargé par chaque écran : la v1 découpe par section / par carte.
- **Chaînes `STRINGS_V02`** dans `shared/ui.js` : propositions à trancher en T9 / T11 avant d'entrer dans `design/strings.json`.
- **Corrections D5.11 de la riposte faites en JS** (`riposte.js` : thèmes, objections courtes, ordres, cartes retirées, `rip-11`) : à porter dans `data/riposte.json`.
- **Tables composées à la main** : `defi/defis.json` (3 jours), `shared/data/quiz-triplets.json` (2 triplets relus + 87 tirés par graine non relus), `shared/data/stat-cards-legal.json` (2 sidecars) : en v1, générées au build puis relues (D0.27).
- **Stubs L49** (`?silence=1`, `?date=`) : en v1, drapeau KV lu au build / à la requête.
- **Carte de partage F2** dessinée en HTML (`/q/card`) et **carte F1** en canvas côté client : en v1, images pré-générées au build (satori) et servies en statique pour l'OG.
- **En-têtes** : `_headers` du prototype (CSP sans `img-src blob:`, `noindex`, cache des données 1 h) ; la v1 a sa propre politique (indexation, cache immuable par hash de build).
- Aucun compte, aucun réseau hors les fichiers statiques, aucun journal d'invocation (`observability` désactivée) : ceci, en revanche, est à garder.
