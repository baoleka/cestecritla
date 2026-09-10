# Spécification du mouvement — « C'est écrit là » (T3, prototypes J3)

> **Statut : PROPOSÉE le 9 septembre 2026**, mesurée sur les prototypes cliquables `prototypes/proto/` (Chromium 153 headless, Playwright, 390 × 844 @2×, CPU ×4). Elle applique P6 et P7 du budget (`design/perf-budget.md` §0, §1.6), les tokens `motion.*` de `design/tokens.json`, la règle 10 de `design/illustration-rules.md` et les décisions D3.5 (alternative au glissement), D3.9 (direction A : « le mouvement est dans la mise en page, pas dans une animation »), D5.9 (aucun swipe signifiant, « Passer » est un tap). Chaque chiffre porte son statut : **VÉRIFIÉ** (mesuré ici, script cité), **PROBABLE**, **HYPOTHÈSE** (à lever, méthode indiquée).
>
> Code : `prototypes/proto/shared/motion.css` + `shared/motion.js` (3,6 Ko + 1,6 Ko gzip, aucune dépendance, aucun stockage, aucune requête). Branchement par attributs `data-motion` seulement (§3). Sondes : `prototypes/proto/tools/fps-probe.mjs`, `tools/vt-probe.mjs` (§4). Captures : `docs/discovery/captures/2026-09-10/proto/{concept,section,defi,q}/motion-*.png` (+ `motion-report.json`, `motion-capture.mjs`).

## 0. En dix lignes

1. Trois mouvements, pas un de plus en v1 : le **reveal de citation** (le bloc verbatim se met en place quand on l'atteint), la **transition concept → section** (fondu 200 ms), le **retour de tap sur « Passer »** et les boutons de carte (120 ms). Tout le reste est statique : titres, chrome, jauge (déjà `transition: width` 320 ms dans `base.css`), Marcheuse (état statique, D3.11).
2. **`transform` et `opacity` seulement**, jamais `box-shadow`, `filter`, `width`, `height`, `top`, `left` (§1). Aucune durée au-dessus de **320 ms** ; les trois durées viennent des tokens (`fast` 120, `base` 200, `slow` 320) plus un token proposé `reveal` = 240 ms.
3. **`prefers-reduced-motion`** : toutes les durées à 0 ms (`tokens.css`), aucun `transform`, aucune View Transition ; seule survit une baisse d'opacité instantanée sur le bouton pressé. Sans script, tout est visible et immobile (états cachés gardés derrière `html.m-motion`).
4. **Mesuré à CPU ×4** : reveal 60 fps (p95 16,7 ms, 0 frame > 20 ms), fondu d'arrivée 60 fps (p95 16,8 ms), tap 60 fps (1 frame de 33 ms = le rendu de la carte suivante) — VÉRIFIÉ, §4.4.
5. **Le reveal ne touche pas au LCP** : un bloc déjà visible à l'insertion s'affiche d'un coup ; animé, il retardait le LCP de la carte-concept de **+250 ms** (VÉRIFIÉ, §3.1). Le reveal ne joue que pour un bloc atteint en défilant.
6. **La View Transition cross-document bloque la saisie pendant toute sa durée dans Chromium** : un tap réel pendant le fondu atteint `<html>`, jamais le bouton visé, même avec `::view-transition { pointer-events: none }` (VÉRIFIÉ, §3.2). À 200 ms c'est 200 ms de taps morts après l'arrivée ; le fondu d'arrivée par opacité, lui, ne bloque rien (VÉRIFIÉ).
7. Conséquence : dans le prototype (pages rendues par script) la transition concept → section est un **fondu d'arrivée du contenu, 200 ms**, jamais un cross-fade qui capturerait l'écran « Chargement… ». La View Transition reste câblée derrière `data-motion="crossfade"` et jouera d'elle-même quand T7 pré-rendra les pages : **à remesurer sur Android réel avant de la garder** (§5, HYPOTHÈSE).
8. « Passer » est un **bouton** (≥ 44 px sur `/defi/`, ≥ 24 px en lien texte sur `/q/`), au clavier comme au doigt ; le retour de tap est `scale(0.96)` pendant ≥ 120 ms puis retour, jamais une couleur seule.
9. Rien n'est stocké ni envoyé par `motion.js` ; aucun `style=""` inline (CSP `style-src 'self'` de `_headers`) : des classes seulement.
10. Ce qui reste HYPOTHÈSE : les mêmes chiffres sur un Android milieu de gamme réel (§5.4 du budget), Safari 18 (transition cross-document, `blocking="render"`), et l'effet perçu du reveal sur les personas (session 2).

## 1. Règles

| # | Règle | Source | Vérification |
|---|---|---|---|
| M1 | Seules `transform` et `opacity` sont animées. Jamais `box-shadow` (l'ombre pleine du bloc 3D est statique), `filter`, `width`/`height`, `top`/`left`, `background-color`. Exception héritée : `.progress .fill { transition: width 320 ms }`, `.progress .walker { left 320 ms }` et `.explo .bar { width 200 ms }` de `base.css` — à convertir en `transform: scaleX()` en T7 (**point ouvert**, §5) | P6, budget §1.6 | `grep -n "transition" shared/*.css` : aucune autre propriété |
| M2 | Aucune durée > 320 ms ; durées = tokens `--d-fast` 120 ms, `--d-base` 200 ms, `--d-slow` 320 ms, `--d-reveal` 240 ms (proposé) | P7, `tokens.json` `motion.duration` | `motion.css` n'écrit aucune durée en dur hors `--d-reveal` |
| M3 | Easings = tokens : `standard` `cubic-bezier(0.2, 0, 0, 1)` (état → état), `enter` `cubic-bezier(0, 0, 0.2, 1)` (ce qui arrive), `exit` `cubic-bezier(0.4, 0, 1, 1)` (ce qui s'enfonce ou part) | `tokens.json` `motion.easing` | idem |
| M4 | `prefers-reduced-motion: reduce` : `tokens.css` met les trois durées à 0 ms ; `motion.css` met `--d-reveal` à 0, `--reveal-y` à 0, `--press-scale` à 1 ; `motion.js` n'ajoute pas `html.m-motion` (aucun état caché), saute toute View Transition (`pageswap` et `pagereveal`). Reste : opacité 0,8 instantanée sur le bouton pressé (le budget autorise l'opacité ≤ 120 ms) | P7, budget §1.6 | §4, `rm-test` : opacité 1, `transform: none`, `transitionDuration: 0s` partout ; `pagereveal` sans transition |
| M5 | Une seule animation d'entrée par écran, jamais de boucle, jamais de défilement automatique ; ≤ 3 couches composées en même temps (ici : 1 pour le reveal, 1 pour le fondu, 1 pour le tap) | budget §1.6, règle 10 | revue de code |
| M6 | Pas de `will-change` : les transitions sont ponctuelles, Chromium promeut la couche pendant l'animation et la relâche seul | budget §1.6 | `grep will-change` = 0 |
| M7 | Un mouvement n'est jamais le seul signal : le reveal n'informe de rien (le texte est là sans lui), le fondu ne masque aucun chargement, le tap a son `:focus-visible` et son changement d'écran | WCAG 2.2, D3.5 | lecture des trois prototypes en `reduce` |
| M8 | Aucun geste : pas de swipe, pas de « glisser pour passer » ; **« Passer » est un bouton** ; l'explorable a ses boutons moins / autant / plus (2.5.7) | D5.9, D3.5, 07-mécaniques §12 | `/defi/`, `/q/` : aucun écouteur `touchmove` |
| M9 | Aucun style inline, aucun script inline (CSP `default-src 'none'; script-src 'self'; style-src 'self'`) : `motion.js` ne pose que des classes et des attributs `data-*` ; le script est chargé avec `blocking="render"` pour que son écouteur `pagereveal` existe avant le premier rendu (sinon la transition cross-document joue dans un écran vide — course observée en cache chaud, §3.2) | `_headers` | revue de code (`grep style= shared/motion.js` = 0) ; `motion-smoke` × 4 sans course |
| M10 | Le mouvement ne retarde jamais le premier texte : un bloc `data-motion="reveal"` déjà dans le viewport à l'insertion est affiché sans transition (`m-instant`) ; le fondu d'arrivée ne concerne que le contenu injecté après le premier rendu et seulement quand une transition était attendue | P1, P4 | §3.1 : LCP identique avec et sans mouvement |

## 2. Table des mouvements

Durées ≤ 320 ms ; coût CPU mesuré à CPU ×4 avec `tools/fps-probe.mjs` (§4) — VÉRIFIÉ sauf mention.

| Élément | Déclencheur | Durée | Easing (token) | Sens narratif | Repli `reduced-motion` | Coût CPU ×4 (mesuré) |
|---|---|---|---|---|---|---|
| **Bloc verbatim** (`blockquote.verbatim` héros et « Mesures liées » de `/concept/`) — `data-motion="reveal"` | Entrée dans le viewport **par défilement** (IntersectionObserver, seuil 15 % du bloc), **une seule fois** ; un bloc déjà visible à l'insertion est affiché d'un coup | 240 ms (`--d-reveal`, token proposé `motion.duration.reveal`) | `enter` — le texte arrive | « Le texte du livre se pose sur la page quand tu l'atteins » : le verbatim est l'objet héros (D3.2, règle 1) ; il ne clignote pas, il **se met en place** (12 px vers le haut + opacité 0 → 1). Aucune autre chose ne bouge autour | Aucun : bloc visible, immobile (`--d-reveal: 0`, `--reveal-y: 0`, pas de classe `m-motion`) | 50 frames, p50 16,7 ms, **p95 16,7 ms, max 16,8 ms, 0 % > 20 ms, 0 % > 50 ms** (3 runs, `scrollTo`) ; à l'entrée de page : LCP 256-288 ms avec, 256-268 ms sans (identique) |
| **Contenu de `/section/`** (`#content[data-motion="content"]`) à l'arrivée depuis un lien `data-motion="crossfade"` de `/concept/` (« Lire la section » du verbatim héros et bouton du bas) | `pagereveal` de la page d'arrivée avec une View Transition attendue mais un contenu encore rendu par script : la transition est sautée, le contenu passe de 0 à 1 quand il est injecté | 200 ms (`--d-base`) | `standard` — état → état | « Tu changes de page, pas de livre » : l'explication (carte) laisse la place à la preuve (le texte de la section) sans à-coup, la page arrive **sans jamais retenir le doigt** | Aucun : arrivée instantanée, contenu visible dès l'injection ; aucune transition cross-document (`skipTransition()` dans `pageswap`) | Fondu : 17-18 frames, **p95 16,8 ms, max 16,8 ms, 0 % > 20 ms** ; avant lui, **1 frame de 66-117 ms** = la tâche de rendu de la section (11 mesures + 2 cartes) par `section.js`, pas le mouvement (**point ouvert** P5, §5) ; saisie : tap réel à +67-81 ms → `MAIN.page` (atteint la page) |
| *Variante T7* : **cross-fade cross-document** old → new (`::view-transition-old/new(root)`) quand la page d'arrivée est pré-rendue (`data-ready` dans le HTML) | Clic sur un lien `data-motion="crossfade"` (flag posé au `click`, lu dans `pageswap`) ; toute autre navigation (retour, chips, « Suivant ») reste instantanée | 200 ms (`--d-base`) | `standard` | Continuité visuelle entre la carte et la section (l'ancienne image fond dans la nouvelle) | Aucun (transition sautée des deux côtés ; `animation: none` sur les pseudo-éléments en ceinture et bretelles) | `ready` 14 ms, `finished` 275-292 ms (200 ms + la frame de rendu de 83-133 ms tombée pendant l'animation) ; **hit-testing = `<html>` pendant toute la durée** (0 → 224-265 ms, puis `P`) ; tap réel à +72-94 ms → `HTML` : **la saisie est bloquée 200 ms** (VÉRIFIÉ Chromium 153, §3.2) ; frames de l'animation elle-même à ×5 lent : p95 6,7 ms, 0 % > 20 ms |
| **« Passer »** et boutons de carte (`/defi/` : « Je savais », « Je découvre », « Passer » ; `/q/` : options A/B/C, « Passer ») — `data-motion="press"` | `pointerdown` (bouton principal) ou `keydown` Espace / Entrée sur l'élément ; relâche au `pointerup` / `pointercancel` / `keyup` / `focusout`, **jamais avant 120 ms** après l'appui (un tap bref montre l'appui entier) | 120 ms à l'enfoncement + 120 ms au retour (`--d-fast`) | `exit` à l'enfoncement (ça s'enfonce), `enter` au retour | « Le bouton accuse réception sous le doigt » : le seul geste du jeu est le tap (D5.9) ; le retour dit « c'est pris » avant même que la carte suivante s'affiche, ce qui évite le double tap | `--press-scale: 1` (aucun `transform`) ; opacité 0,8 le temps de l'appui, instantanée | 90 frames, **p95 16,8 ms, max 33-50 ms (la frame qui rend la carte suivante), 1,1-2,2 % > 20 ms, 0 % > 50 ms** (`/defi/`, 6 runs) ; `/q/` : max 33-50 ms (la frame qui rend la révélation des options), 0 % > 50 ms ; timeline : `scale` 1 → 0,96 en 4 frames (~120 ms), retour à `none` après la relâche |
| *Existant* : jauge de lecture (`.progress .fill`, `.walker`), barres de l'explorable, toast, `opacity` des boutons au survol | inchangés (`base.css`) | 320 / 200 / 200 / 120 ms | `standard` | — | `transition: none` (déjà) | non remesurés ici (largeur animée : **à convertir**, M1) |

Chaque ligne « repli » s'applique aussi **sans JavaScript** : `motion.css` ne cache un état initial que sous `html.m-motion`, posé par `motion.js`.

## 3. Les trois prototypes

Branchement (« hooks ») : un attribut `data-motion` sur l'élément, `shared/motion.css` après `base.css`, `shared/motion.js` en `<script type="module" blocking="render">` avant le script du module. Aucun module n'appelle `motion.js` : il s'initialise seul, observe le DOM (`MutationObserver`, une poignée de mutations par page) et pose des classes (`m-in`, `m-instant`, `m-pressed`, `m-arriving`, `m-crossfading`) et l'attribut `data-ready`.

| Hook | Où | Fichiers touchés (hooks seulement) |
|---|---|---|
| `data-motion="reveal"` | verbatim héros et verbatims compacts de « Mesures liées » | `concept/concept.js` (3 lignes) |
| `data-motion="crossfade"` | lien « Lire la section » du héros et bouton « Lire la section entière » | `concept/concept.js` (2 lignes, `attrs`) |
| `data-motion="content"` | `#content` de `/concept/`, `/section/`, `/q/` | `concept/index.html`, `section/index.html`, `q/index.html` (posé par l'auteur de `/q/`) |
| `data-motion="press"` | « Passer », « Je savais », « Je découvre » (`/defi/`), options A/B/C et « Passer » (`/q/`, posés par l'auteur de `/q/`) | `defi/defi.js` (4 lignes), `q/q.js` |
| `motion.css` + `motion.js blocking="render"` | `<head>` des quatre modules | `concept/`, `section/`, `defi/`, `q/` `index.html` |

### 3.1 Reveal de citation (`/concept/?slug=regle-verte`)

- **Comportement** : `motion.js` observe chaque `[data-motion="reveal"]`. À l'insertion, si une partie du bloc est déjà dans le viewport (le héros : haut à 464 px sur 844), il reçoit `m-in` + `m-instant` (aucune transition, deux frames) ; sinon il attend l'IntersectionObserver (seuil 0,15) et reçoit `m-in` : `opacity 0 → 1`, `translateY(12px) → 0`, 240 ms, `ease-enter`. Une fois révélé, plus jamais observé (`WeakSet`).
- **Pourquoi la règle « déjà visible = pas de reveal »** (M10) : avant elle, le LCP de la carte (le `<p>` du verbatim héros, 44 982 px² — VÉRIFIÉ `PerformanceObserver`) passait de **264-292 ms à 520-548 ms** à CPU ×4 : Chromium ne compte l'élément qu'à la fin du fondu d'opacité. Après : **256-288 ms avec, 256-268 ms sans** (3 runs chacun, `lcp-test`). Le reveal joue donc là où il ne coûte rien : les deux « Mesures liées » (haut à 1 721 et 1 941 px), et le héros lui-même sur un petit écran ou avec une grande taille de police système (A2, zoom 200 %), où il passe sous la ligne de flottaison.
- **Mesure** (`fps-probe.mjs … '' '.verbatim.compact[data-motion="reveal"]'`) : 50 frames sur 800 ms, p95 16,7 ms, max 16,8 ms, 0 % > 20 ms (3 runs) ; timeline observée : opacité 0 → 0,38 → 0,61 → 0,82 → 0,94 → 0,99 → 1 et `translateY` 12 → 7,3 → 4,6 → 2,1 → 0,7 → 0,06 → 0 sur 6 frames.
- **Captures** : `concept/motion-reveal-mid.png` (+ `.dark`) à ~73 % d'opacité et 3,2 px de course (animations ralenties ×10 par CDP), `motion-reveal-done.png`.
- **Reduced motion** : `html` sans `m-motion`, les trois blocs `m-in` immédiats, `opacity 1`, `transform none`, `transitionDuration 0s` (VÉRIFIÉ `rm-test`).

### 3.2 Transition concept → section

Deux mécanismes dans `motion.css` / `motion.js`, un seul joue à la fois :

**A. View Transition cross-document** (`@view-transition { navigation: auto }` dans `motion.css`, présent sur les deux pages ; `::view-transition-old(root)`, `::view-transition-new(root)` à `var(--d-base)` `var(--ease-standard)` ; `::view-transition { pointer-events: none }`). Côté départ, `pageswap` saute la transition sauf si le clic venait d'un lien `data-motion="crossfade"` (flag de 2 s) et hors reduced-motion. Côté arrivée, `pagereveal` la saute si un `[data-motion="content"]` n'a pas encore `data-ready` (page rendue par script : le premier cadre serait « Chargement… »), ou sous reduced-motion. Sans l'API (Firefox, Safari < 18.2) : navigation instantanée, rien à faire.

**B. Fondu d'arrivée** (prototype) : quand A est sautée pour contenu manquant, `html.m-arriving` est posé ; le conteneur reste à `opacity: 0` (sans transition) jusqu'à ce que le module l'ait rempli (`MutationObserver` → `data-ready`), puis passe à 1 en 200 ms `ease-standard`. La classe tombe 250 ms plus tard. Sans transition attendue (arrivée directe, lien non marqué, navigateur sans l'API) : aucun fondu, le contenu apparaît comme aujourd'hui.

**Mesures** (`tools/vt-probe.mjs`, CPU ×4, trois modes, 2 séries de 3 runs — VÉRIFIÉ) :

| Mode | Transition à `pagereveal` | `finished` | `elementFromPoint` au centre (x 195, y 130) pendant l'animation | Tap réel (Playwright `touchscreen.tap`) | Frames de l'animation |
|---|---|---|---|---|---|
| `proto` (la page servie : contenu par script) | présente, **sautée** en 11-13 ms ; `m-arriving` ; contenu prêt à 169-210 ms | 11-13 ms | `MAIN#main` dès 57-63 ms, `P` dès 199-229 ms — **jamais `HTML`** après le premier cadre | +67-81 ms → **`MAIN.page`** (la page reçoit le tap) | fondu : p95 16,8 ms, max 16,8 ms, 0 % > 20 ms ; **1 frame de 66-117 ms avant** = rendu de la section par `section.js` |
| `prerender` (ce que donne T7 : `data-ready` dès le parsing, injecté par la sonde) | présente, **jouée** ; `ready` 13-15 ms | **275-292 ms** (200 ms + la frame de rendu tombée dedans) | **`HTML` de 10 à 224-265 ms**, puis `P` | +72-94 ms → **`HTML.m-motion`** : le tap n'atteint pas la page | p95 33 ms, max 83-133 ms (frame de rendu) ; à ×5 lent, sans rendu concurrent : p95 6,7 ms, 0 % > 20 ms |
| `slow` (`prerender` + `Animation.setPlaybackRate(0.2)`) | jouée | 1 241-1 257 ms | **`HTML` pendant 1 245 ms** | → `HTML` | — |

Lecture : **pendant une View Transition cross-document, Chromium 153 renvoie `<html>` au hit-testing pour toute la durée de l'animation, avec `pointer-events: none` calculé sur `::view-transition` (vérifié `getComputedStyle`), et aussi avec `pointer-events: none !important` sur tout l'arbre de pseudo-éléments** (`::view-transition-group(*)`, `-image-pair(*)`, `-old(*)`, `-new(*)`, essai séparé). Un tap dans la fenêtre est livré à `html` : perdu pour l'utilisateur. Le critère « ne bloque jamais la saisie » est donc **tenu par B** (fondu d'arrivée) et **pas par A** dans ce navigateur. Statut sur Chrome Android et Safari 18 : HYPOTHÈSE (même moteur pour Chrome Android : PROBABLE que ce soit identique).

**Décision proposée** (D3.13, §5) : v1 = **B** ; **A** reste câblée et ne s'active qu'avec des pages pré-rendues (T7). T7 rejoue `vt-probe.mjs` sur l'Android réel : si un tap réel pendant le fondu n'atteint toujours pas sa cible, on retire `data-motion="crossfade"` des deux liens (deux attributs) et B devient la seule transition ; si la saisie passe (moteur corrigé, `pointer-events` honoré), A remplace B au même 200 ms.

**Aussi observé** : (1) sans `blocking="render"`, `pagereveal` a pu tomber avant l'exécution de `motion.js` en cache chaud (module différé) → transition jouée dans l'écran « Chargement… », ni sautée ni fondue ; corrigé par l'attribut (M9), 4 runs sans course ensuite. (2) Servir `motion.css` par interception Playwright (`route.fulfill`) désactive l'opt-in (`ViewTransition opt-in disabled`) : la feuille doit être là au premier rendu ; les sondes ralentissent donc par CDP, pas par réécriture CSS.

**Captures** : `section/motion-arrive-mid.png` (+ `.dark`) à ~77 % d'opacité, `motion-arrive-done.png` (arrivée sur `#c12-s01-k01`, mesure clé encadrée).

### 3.3 « Passer » : le tap remplace le swipe (`/defi/`, `/q/?id=c12-s01`)

- **Comportement** : `pointerdown` sur `[data-motion="press"]` → `m-pressed` (`scale(0.96)`, 120 ms, `ease-exit`) ; relâche → retrait de la classe au plus tôt 120 ms après l'appui (`scale` → 1, 120 ms, `ease-enter`). Clavier : `keydown` Espace / Entrée (sans répétition) → même appui, `keyup` → relâche ; `focusout` relâche toujours (un lien activé à Entrée navigue). Délégué sur `document`, écouteur `pointerdown` passif : aucun effet sur le défilement ni sur le `click`. Boutons désactivés ignorés.
- **Pourquoi `scale` et pas une couleur** : la charte n'a qu'un accent d'action (Rouge / Vif jaune) et le bouton principal est déjà plein ; l'enfoncement est lisible sur le bouton plein comme sur le lien texte « Passer », sans nouvelle couleur ni ombre (règle 8). 4 % sur un bouton de 340 × 56 px = 14 px de course ; sur le lien « Passer » de 82 × 44 px = 3 px : perceptible sous le doigt, discret à l'écran (`--press-scale`, à ajuster en T11 si les personas ne le voient pas — HYPOTHÈSE).
- **Mesure** (`fps-probe.mjs … '.pass-row [data-motion="press"]'`, appui de 90 ms) : `/defi/` 89-91 frames, p95 16,8 ms, max 33-50 ms (la frame qui rend la carte suivante), 1,1-2,2 % > 20 ms, 0 % > 50 ms (6 runs) ; `/q/` max 33-50 ms, 0 % > 50 ms. Timeline (`press-test`) : `matrix(1)` → 0,995 → 0,978 → 0,962 → 0,96 en 4 frames, `m-pressed` retiré à la relâche, `transform: none` ensuite ; en `reduce` : `opacity 0.8` le temps de l'appui, `transform: none`, durée 0 s.
- **Captures** : `defi/motion-press-held.png`, `q/motion-press-held.png` (+ `.dark`) : « Passer » maintenu à `scale(0.96)` (animation ralentie ×10 par CDP).
- **Cibles** : `/defi/` « Passer » 82 × 44 px, « Je savais » / « Je découvre » 56 px de haut ; `/q/` « Passer » 50 × 34 px (≥ 24 px, 2.5.8) — VÉRIFIÉ `boundingBox`.

## 4. Mesurer 60 fps à CPU ×4 (P6)

### 4.1 Outillage

- Node 24 via nvm (`export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"`), Playwright 1.63 + Chromium 153 (`~/.cache/ms-playwright/chromium-1243`). Les sondes résolvent Playwright par `PLAYWRIGHT=<chemin>/node_modules/playwright/index.mjs` (ou le `node_modules` habituel).
- Servir le prototype comme en production : `cd prototypes/proto && python3 -m http.server 8766 --bind 127.0.0.1` (jamais un serveur de dev avec HMR ; le port 8765 est celui des captures du socle).
- Viewport 390 × 844 @2×, tactile, `Emulation.setCPUThrottlingRate({ rate: 4 })` avant la navigation, `document.fonts.ready` avant la mesure.
- Seuils P6 : **0 frame > 50 ms, ≤ 5 % de frames > 20 ms** pendant toute animation dirigée. Chromium headless n'a pas de GPU : un résultat conforme est **nécessaire, pas suffisant** → confirmation par enregistrement d'écran sur l'Android des testeurs (budget §5.4).

### 4.2 `tools/fps-probe.mjs` (copie de `perf-budget.md` §5.2, complétée)

```sh
export PLAYWRIGHT=/chemin/vers/node_modules/playwright/index.mjs
B=http://127.0.0.1:8766
# Entrée de page : la sonde est armée avant tout script et démarre au premier reveal (ou à load)
node prototypes/proto/tools/fps-probe.mjs "$B/concept/?slug=regle-verte" 4 800
# Reveal au défilement : le bloc est amené au centre une fois l'échantillonnage lancé
node prototypes/proto/tools/fps-probe.mjs "$B/concept/?slug=regle-verte" 4 800 '' '.verbatim.compact[data-motion="reveal"]'
# Tap « Passer » : pointer down 90 ms, pointer up
node prototypes/proto/tools/fps-probe.mjs "$B/defi/" 4 1500 '.pass-row [data-motion="press"]'
node prototypes/proto/tools/fps-probe.mjs "$B/q/?id=c12-s01" 4 1500 '.q-controls [data-motion="press"]'
```

Sortie, une ligne JSON : `{ url, cpuRate, startedBy, frames, fpsAvg, p50, p95, max, pctOver20, pctOver50 }` et, en mode entrée, `revealAt` + `fromReveal` (les frames à partir du reveal, celles d'avant appartenant au rendu de la page). Différences avec le script du budget : sonde armée par `addInitScript` en mode entrée (sinon `networkidle` arrive après l'animation), appui réaliste de 90 ms au lieu de `page.click`, `p50` et `fpsAvg` ajoutés. Trois runs, on lit la médiane ; les lignes sont archivées dans `docs/discovery/perf/<date>/` (ici `2026-09-09/motion-fps.jsonl`, 12 lignes, et `motion-vt-probe.json`).

### 4.3 `tools/vt-probe.mjs` (la transition bloque-t-elle la saisie ?)

```sh
node prototypes/proto/tools/vt-probe.mjs http://127.0.0.1:8766 4
```

Trois navigations `/concept/` → `/section/` par le bouton `data-motion="crossfade"` : `proto` (page servie), `prerender` (`data-ready` injecté dès le parsing = T7), `slow` (idem, animations ×5 plus lentes par `Animation.setPlaybackRate`). Pour chacune, depuis `pagereveal` : transition présente / sautée, `ready`, `finished`, `elementFromPoint` toutes les 30 ms pendant 600 ms (avec `pointer-events` calculé sur `::view-transition`), cible du tap réel envoyé par Playwright, frames rAF sur 600 ms, `renderFrame` (la frame qui injecte le contenu, hors mouvement) et `framesAnimated`. Critère : **le tap réel et `elementFromPoint` doivent nommer un élément de la page (jamais `HTML`) pendant l'animation**. Résultats du 9/9 en §3.2.

### 4.4 Résultats du 9 septembre 2026 (médianes, CPU ×4, Chromium 153 headless) — VÉRIFIÉ

| Mouvement | Frames | p95 | max | > 20 ms | > 50 ms | P6 |
|---|---|---|---|---|---|---|
| Reveal (défilement, 2 blocs ensemble) | 50 / 800 ms | 16,7 ms | 16,8 ms | 0 % | 0 % | tenu |
| Entrée `/concept/` (rendu + reveal du héros → instantané) | 48 / 800 ms | 16,7 ms | 33-50 ms (rendu) | 2,1-4,2 % | 0 % | tenu |
| Fondu d'arrivée `/section/` (après la frame de rendu) | 17-18 / 300 ms | 16,8 ms | 16,8 ms | 0 % | 0 % | tenu ; **la frame de rendu de 66-117 ms est à traiter à part (P5)** |
| Cross-fade cross-document (T7), animation seule (×5 lent) | 65 / 600 ms | 6,7 ms | 16,7 ms | 0 % | 0 % | tenu, **mais saisie bloquée** |
| Tap « Passer » `/defi/` | 89-91 / 1,5 s | 16,8 ms | 33-50 ms | 1,1-2,2 % | 0 % | tenu |
| Tap « Passer » `/q/` | 89-90 / 1,5 s | 16,8 ms | 33-50 ms | 2,2 % | 0 % | tenu |

### 4.5 Captures et vérifications complémentaires

- `docs/discovery/captures/2026-09-10/proto/motion-capture.mjs` : ralentit toutes les animations ×10 (CDP) pour photographier un cadre au milieu de chaque mouvement, clair et sombre ; `motion-report.json` garde l'état calculé au moment de la capture (`opacity`, `transform`, classe) ; sommes SHA-256 ajoutées à `SHA256SUMS.txt`.
- 0 erreur console, 0 requête hors `127.0.0.1:8766` sur les captures (`motion-report.json`, champs `errors` et `external`) ; `pagereveal` sans transition et `transitionDuration: 0s` en `reduce`.
- À faire sur appareil (budget §5.4, HYPOTHÈSE) : enregistrement d'écran 60 fps du reveal (défilement jusqu'à « Mesures liées »), du tap « Passer » et de l'arrivée sur la section ; `vt-probe` via `adb` (port 9222) une fois les pages pré-rendues.

## 5. Décisions proposées, hypothèses, points ouverts

| ID | Proposition | Statut | Preuve |
|---|---|---|---|
| **D3.13** | **Spécification du mouvement v1** : trois mouvements (reveal 240 ms `enter`, fondu d'arrivée 200 ms `standard`, tap 120 ms `exit`/`enter`), `transform`/`opacity` seulement, tokens, reduced-motion = 0 ms sans transform, aucun swipe ; **la transition concept → section v1 est le fondu d'arrivée (B)** ; la View Transition cross-document (A) reste câblée et se décide en T7 sur mesure Android réelle (critère : un tap réel pendant le fondu atteint sa cible) | PROPOSÉE / HYPOTHÈSE (Android, Safari, personas) | §2-§4 |
| **D3.14** | **Tokens v0.2** : `motion.duration.reveal = 240ms`, `motion.reveal.distance = 12px`, `motion.press.scale = 0.96` ; `motion.duration.$description` complétée : « reduced-motion : tout à 0 ms et aucun `transform` ; seule une opacité instantanée ou ≤ 120 ms subsiste » | PROPOSÉE | `motion.css` `:root` |
| **D3.15** | **Règle LCP** : un élément animé à l'entrée ne peut pas être candidat LCP ; un bloc `reveal` visible à l'insertion s'affiche sans transition | PROPOSÉE (sur pièces) | §3.1 : +250 ms de LCP sinon |

Points ouverts :

1. `section.js` rend la section en une tâche de 66-117 ms à CPU ×4 (11 mesures, 2 cartes) : sous le seuil INP de 200 ms mais visible comme unique frame longue de toutes les mesures ; à fractionner (`requestAnimationFrame` / `scheduler.yield()`, budget §1.5) ou à supprimer par le pré-rendu T7.
2. `base.css` anime encore `width` (jauge, explorable) et `left` (Marcheuse) : à convertir en `transform` (M1) — mécanique, sans changement visuel.
3. `/riposte/?flash=1` a un « Passer » et un `#content` : l'auteur du module a noté les hooks `data-motion="press"` / `data-motion="content"` à poser (README §5) ; non touché ici pour ne pas croiser ses éditions.
4. `blocking="render"` sur un module : Chromium 105+ ; Safari et Firefox ignorent l'attribut sans dommage (sans View Transition cross-document, la course n'existe pas) — PROBABLE, à vérifier sur iPhone (§5.4 du budget).
5. Valeur de `--press-scale` (0,96) sur le lien texte « Passer » : à juger par les personas ; alternative 0,94.
6. Le reveal de « Mesures liées » révèle les deux blocs ensemble quand ils entrent en même temps (défilement rapide) : accepté (une seule animation d'entrée par écran au sens visuel) ; un décalage de 40 ms entre les deux serait possible sans coût, non retenu (HYPOTHÈSE : « trop » selon la direction A).

## 6. Sources

- `design/perf-budget.md` §0 (P5, P6, P7), §1.5, §1.6, §5.2 (script `fps-probe`), §5.4 — figé le 7/9/2026.
- `design/tokens.json` `motion.duration` (120 / 200 / 320 ms), `motion.easing` (standard, enter, exit).
- `design/illustration-rules.md` règle 10 et §2.9 (Marcheuse : ≤ 320 ms, statique en reduced-motion).
- `docs/discovery/07-mecaniques.md` §9.1-§9.2 (écrans F1/F2 : « aucune animation autre qu'un glissement dirigé (paliers fixes si `prefers-reduced-motion`) »), §12 (verdict swipe) ; `decisions.md` D3.5, D3.9, D5.9.
- MDN, View Transition API : `@view-transition { navigation: auto }`, `pageswap` / `pagereveal`, `ViewTransition.skipTransition()`, `::view-transition` (`position: fixed; inset: 0`) — lus via context7 le 9/9/2026 ; le comportement du hit-testing pendant la transition n'y est pas documenté, d'où la mesure §3.2.
- Mesures : `prototypes/proto/tools/fps-probe.mjs`, `tools/vt-probe.mjs`, `docs/discovery/captures/2026-09-10/proto/motion-capture.mjs` + `motion-report.json` (9/9/2026, Chromium 153.0.8010.12 headless, Playwright 1.63).
