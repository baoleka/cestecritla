# Audit de performance du prototype déployé — 9 septembre 2026 (archive « 2026-09-10 »)

Cible : **https://proto.cestecritla.fr/** (Worker Static Assets `aec-proto`, même build que https://aec-proto.baoleka.workers.dev/, ETag `80ae226a…` identique sur les deux hôtes). Référence : `design/perf-budget.md` §0 (carte du budget, règles éliminatoires §6). Outillage : Lighthouse **13.4.1** (CLI, `npx lighthouse@13`), Chromium **153** de Playwright (`CHROME_PATH=~/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome`), Node 24.14.0, `--throttling-method=devtools` (throttling appliqué), CPU ×4, Slow 4G (150 ms RTT, 1,6 Mbit/s), émulation mobile « moto g power (2022) ». Le MCP `chrome-devtools` du skill `web-perf` n'est pas configuré dans la session (H-TOOL-1 : repli CLI §5.1). **3 runs par page, médianes.** Toutes les mesures ci-dessous : VÉRIFIÉ (fichiers de ce dossier).

## 1. Lighthouse (médianes de 3 runs, Slow 4G + CPU ×4)

| Page | Perf | A11y | FCP | **LCP** | TBT | **CLS** | mpFID | SI | Élément LCP | JS (fil, br) | JS (gzip -9) | Total fil | Requêtes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/link/?id=c12-s01-k01` | 0,83 | **1,00** | 1 575 ms | **3 060 ms** | 0 ms | **0,216** | 22 ms | 2 160 | `#hero > blockquote.verbatim > p` (rendu par script) | 14,3 Ko | 12,0 Ko | 197 Ko | 13 |
| `/concept/` (règle verte) | 0,74 | **1,00** | 1 582 ms | **4 635 ms** | 6 ms | **0,180** | 56 ms | 3 055 | `#content > blockquote.verbatim > p` (rendu par script) | 22,0 Ko | 18,6 Ko | 255 Ko | 18 |
| `/defi/?n=1` (→ `?n=254`) | 0,87 | **1,00** | 1 581 ms | 1 581 ms* | 0 ms | **0,246** | 22 ms | 2 269 | `footer.footer > p` (chrome du HTML initial) | 29,8 Ko | 25,1 Ko | 218 Ko | 18 |
| `/riposte/?id=rip-01` | 0,96 | **1,00** | 1 607 ms | 1 607 ms* | 0 ms | **0,110** | 21 ms | 1 938 | `footer.footer > p` (chrome du HTML initial) | 24,7 Ko | 21,2 Ko | 229 Ko | 19 |

\* Sur `/defi/` et `/riposte/`, l'élément LCP retenu par Chromium est un paragraphe du pied de page présent dans le HTML initial : le contenu utile (carte du défi, flashcard) n'arrive qu'après `slim.json` (fin de réponse à **3 225 ms** et **3 400 ms**). Le « LCP » de 1,6 s ne décrit donc pas l'arrivée du contenu ; la règle §6.14 (« élément LCP rendu côté client ; corpus JSON sur le chemin critique ») s'applique aux quatre pages.

**Chaîne de dépendances (Slow 4G, chaque saut ≈ 0,6-0,7 s)** : HTML (TTFB 0,6 s simulé) → `tokens.css` + `base.css` (+ `motion.css`, `<module>.css`, `motion.js`, `<module>.js`, polices préchargées) → `shared/ui.js` (import statique découvert après le module de page) → `strings.json` + `slim.json` (70 Ko) + `extras.json` + `concept-index.json` → [concept : `glossary.json` (39 Ko) → `stat-cards.json` + `stat-cards-legal.json`] → rendu. Quatre sauts sur `/link/`, six sur `/concept/`. `elementRenderDelay` : 2 996 ms (`/link/`), 4 556 ms (`/concept/`).

**CLS** : les décalages viennent de l'injection du contenu, pas des polices. `/link/` : `h1#title` (0,214) poussé par le verbatim héros inséré au-dessus (147 px) ; `/concept/`, `/defi/`, `/riposte/` : `footer.footer` (0,180 / 0,245 / 0,110) poussé par le contenu qui remplace « Chargement… ». Part imputable aux polices : **≤ 0,002** par page (`span.la` du wordmark et `span.book` du pied de page, Public Sans droite et italique) — sous les 0,02 du budget.

**Réseau** : 0 requête tierce sur les 4 pages (et sur les 22 URL du balayage `proto-sweep.json`) ; tout en Brotli ; polices `immutable`, le reste `max-age=0, must-revalidate` (revalidation par ETag). Polices chargées par page : Public Sans droite (29,9 Ko) + Gowun Batang 400 (20,4 Ko) + **Public Sans italique variable (31,9 Ko, découverte tardivement par le CSS à ~1,57 s, non préchargée sauf sur `/riposte/`)** = **82,2 Ko sur le fil** ; `/section/` charge en plus Gowun 700 (99,7 Ko). Chemin critique P3 (HTML + CSS + 3 polices) : 88-91 Ko gzip, 93-98 Ko sur le fil.

**Accessibilité** : score 1,00 partout. Un audit non pondéré échoue sur `/concept/` : `label-content-name-mismatch` (WCAG 2.5.3, niveau A) sur 6 liens `a.ref` (`aria-label="Appui : Chapitre 12, section 1"` alors que le texte visible « 12.1 » n'est pas contenu dans le nom accessible). Balayage : `/riposte/?id=rip-01`, `?id=rip-14#texte`, `?flash=1` n'ont **pas de `<h1>`** (budget §2.1 : « un seul `<h1>` »).

## 2. Fluidité à CPU ×4 (`tools/fps-probe.mjs`, `tools/vt-probe.mjs`, site déployé, 3 runs)

| Mouvement | Frames | p95 | max (médiane / pire run) | > 20 ms | **> 50 ms** | P6 |
|---|---|---|---|---|---|---|
| Entrée `/concept/` (frames depuis le reveal du héros) | 33 | 16,8 ms | 50,0 / 50,0 ms | 2,8 % | **0** | tenu (1 frame à 50,0 ms = rendu de la carte, pas l'animation) |
| Reveal au défilement (2 « Mesures liées ») | 50 | 16,8 ms | 16,8 / 16,8 ms | 0 % | **0** | tenu |
| `/defi/` réponse « Je savais » (press + carte suivante) | 90 | 16,8 ms | 33,4 / 50,0 ms | 2,2 % | **0** | tenu (borderline : 50,0 ms sur 1 run / 3) |
| `/defi/` « Passer » | 90 | 16,8 ms | 33,4 / 50,0 ms | 2,2 % | **0** | tenu (idem) |
| Concept → section, arrivée (`vt-probe`, mode `proto`) | 18 (fondu) | 16,8 ms | 16,8 ms ; **1 frame de rendu de 83 ms** avant | 0 % | 0 (animation) / 2,9 % (fenêtre 600 ms) | tenu pour l'animation ; la frame de rendu de `section.js` (83 ms) relève de P5 (< 200 ms) |

**Observation nouvelle sur le déployé** : sur 3 séries × 3 modes de `vt-probe.mjs` et 8 navigations de contrôle (CPU ×4 et ×1), la **View Transition cross-document ne s'engage jamais** (`pagereveal` sans `viewTransition`, console : « Transition was aborted because of invalid state. ViewTransition opt-in disabled »), alors que `pageswap` côté `/concept/` la démarre bien (`vt=true`) et que la règle `@view-transition { navigation: auto }` est appliquée sur `/section/` à `pagereveal`. En local (serveur statique du scratchpad), le même sondage réussit 4/4 dans une série et 1/4 dans la suivante, indépendamment des en-têtes de production (CSP, `Referrer-Policy`, `X-Frame-Options`, `nosniff`, `Cache-Control` testés un à un), d'un retard artificiel du CSS, ou d'une règle `@view-transition` inlinée dans le `<head>`. Conclusion : **course non déterministe de Chromium 153 headless**, pas une propriété du déploiement ; statut sur Chrome Android réel : HYPOTHÈSE (T7, motion-spec §3.2). Conséquence de conception à consigner : quand l'API ne fournit pas de transition, `motion.js` n'arme pas non plus le fondu d'arrivée (`m-arriving`) — la navigation est instantanée (repli prévu par la spec), donc **la transition concept → section est instantanée sur le déployé** dans ce labo (`htmlClass = "m-motion"` sur 9/9 runs).

## 3. Interactions clés à CPU ×4 (`proto-interactions-cpu4.json`, event timing, taps CDP bruts, 3 runs)

| Interaction (§1.5) | Mesure | Médiane | P5 (< 200 ms) |
|---|---|---|---|
| (1) taper une lettre dans la recherche (`/home/`) | durée max d'entrée event timing | 32 ms (le tap sur le champ ; la frappe elle-même < 16 ms) | tenu |
| (2) ouvrir la carte-concept depuis l'écran 0 par lien | tap → première frame de `/concept/` (navigation, pas un INP) | 182 ms (162-216) | n/a (navigation) |
| (3) « Copier le lien » (`/concept/`) | durée max | < 16 ms (aucune entrée > 16 ms) | tenu |
| (4) répondre « Je savais » (`/defi/`) | durée max | 32 ms | tenu |
| (4) choisir une option (`/q/`) | durée max | 48 ms | tenu |
| (5) « Retourner la carte » (`/riposte/`) | durée max | 64 ms | tenu |

Proxy Lighthouse (max potential FID) : 22 / 56 / 22 / 21 ms ; TBT 0 / 6 / 0 / 0 ms.

## 4. Motion et reduced-motion (P7)

Durées calculées max par page : 120 ms (`/home/`, `/link/`, `/defi/`, `/riposte/`), 200 ms (`/q/`), 240 ms (`/concept/`, reveal) ; aucune animation CSS ; **aucun élément > 320 ms**. Avec `prefers-reduced-motion: reduce` sur `/concept/` : `html` sans `m-motion`, les 3 blocs `reveal` à `opacity 1`, `transform none`, `transition-duration 0s`, tokens `--d-fast/--d-base/--d-slow/--d-reveal` à 0 ms, durée max calculée sur tout le DOM : **0 ms**.

## 5. Verdict sur la carte du budget (§0)

| Règle | Seuil | Mesuré | Verdict |
|---|---|---|---|
| P1 LCP labo | < 2,5 s | 3,06 s (`/link/`), 4,63 s (`/concept/`) ; 1,58 s / 1,61 s (`/defi/`, `/riposte/`) mais élément = pied de page, contenu à ≈ 3,3 s | **FAIL** (éliminatoire) |
| P2 JS initial | < 100 Ko gzip | 12,0 / 18,6 / 25,1 / 21,2 Ko gzip -9 (14,3 / 22,0 / 29,8 / 24,7 Ko sur le fil) ; aucun chunk différé | PASS |
| P3 chemin critique | ≤ 150 Ko (alerte) | 88-91 Ko gzip (HTML + CSS + 3 polices) ; **mais** le corpus (70 Ko) est de fait sur le chemin du LCP → 181-232 Ko | PASS formel / alerte §6.14 |
| P4 CLS | < 0,1 (polices ≤ 0,02) | 0,216 / 0,180 / 0,246 / 0,110 (polices ≤ 0,002) | **FAIL** (éliminatoire) ; sous-règle polices PASS |
| P5 INP | < 200 ms à CPU ×4 | 0-64 ms sur les 5 interactions ; mpFID 21-56 ms | PASS |
| P6 fluidité | 0 frame > 50 ms, ≤ 5 % > 20 ms | 0 frame > 50 ms (4 runs / 12 à exactement 50,0 ms), 0-2,8 % > 20 ms | PASS (borderline) |
| P7 motion | ≤ 320 ms, reduced-motion honoré | max 240 ms ; 0 ms en reduce | PASS |
| P8 polices | auto-hébergées, latin, woff2, ≤ 75 Ko | auto-hébergées, latin, woff2, 0 requête Google Fonts ; **99,7 Ko** livrées (82,2 Ko chargées par page, italique variable entière 31,1 Ko au lieu d'un sous-ensemble 900 ≤ 15 Ko) | **FAIL** (éliminatoire, déjà consigné HYPOTHÈSE dans `prototypes/proto/README.md` §4 bis) |
| P9 rendu | 0 WebGL / canvas plein écran / script tiers | 0 `<canvas>` dans le DOM (canvas hors écran de `defi/card.js` pour le PNG seulement), 0 script tiers, 0 requête externe sur 22 URL | PASS |
| A1 WCAG 2.2 AA | cibles, glissement, focus, contraste, reflow, zoom | Lighthouse 100 ×4 ; reflow 390 OK ; **2.5.3 non tenu sur 6 `a.ref` de `/concept/`** ; pas de `<h1>` sur 3 URL riposte | **FAIL** partiel (2.5.3) |
| A2 taille système | `rem`, pas de `user-scalable=no` | viewport `width=device-width, initial-scale=1`, aucun `font-size` en px dans les CSS | PASS |
| A3 dark mode | `prefers-color-scheme`, contraste Charbon | vérifié dans `prototypes/proto/README.md` §4 (non remesuré ici) | PASS (report) |
| S1 robustesse | complet sans Web Share ni SW | pas de SW ; « Copier le lien » + `wa.me` présents (§3) | PASS |
| Lighthouse Accessibilité ≥ 95 | | 100 / 100 / 100 / 100 | PASS |
| Perf Lighthouse ≥ 90 (alerte) | | 0,83 / 0,74 / 0,87 / 0,96 | alerte sur 3 pages |

**Comparaison avec les attentes des trois directions (05-DA §1.5, §2.2)** : les maquettes A, B, C étaient statiques (HTML/CSS, 0 JS, 3 FontFace identiques, 0 requête externe) ; le socle A (« coût ×1 » = 2/2, le plus léger : ni SVG de mascotte, ni anneau, ni barre d'onglets) est bien celui qui tient P2 avec 12-25 Ko de JS et un seul bloc 3D par écran. Ce qui fait échouer P1/P4 n'est pas la direction mais l'architecture du prototype (rendu côté client + corpus entier), déjà annoncée comme « propre au prototype » (`prototypes/proto/README.md` §6) ; P8 échoue de la même façon pour les trois directions puisqu'elles chargent les mêmes 3 fichiers (82 Ko) — la sous-ensemblisation de l'italique est un travail T7 indépendant de la DA.

## 6. Ce qu'il faut faire (par impact)

1. **P1 + P4 + §6.14 (T7, pré-rendu)** : texte de l'écran 0 dans le HTML initial (verbatim + titre + CTA), corpus découpé par section / carte et chargé après `load` ; sur le prototype, correctif minimal en attendant : réserver la hauteur des conteneurs injectés (`#hero`, `[data-motion="content"]`, `#app` : `min-height` ≈ hauteur du premier écran) pour ramener le CLS < 0,1 sans pré-rendu (budget §1.4 « contenu injecté … conteneur à hauteur minimale »).
2. **Chaîne de requêtes** : importer `shared/ui.js` depuis le HTML (`<link rel="modulepreload">`) pour gagner un saut (≈ 0,6 s Slow 4G) ; précharger `strings.json` et le JSON de la page (`<link rel="preload" as="fetch" crossorigin>`) pour en gagner un second ; inline de `tokens.css` + `base.css` (7 Ko gzip) ferait tomber le FCP de 1,58 s à ≈ 0,9 s (nécessite un hash CSP `style-src` ou `'unsafe-inline'` à trancher).
3. **P8** : sous-ensemble statique Public Sans italique 900 (≤ 15 Ko, H-PERF-3) et préchargement de l'italique là où le wordmark/les titres l'utilisent (aujourd'hui découvert à 1,57 s) ; ne charger Gowun 700 que sur `/section/` (déjà le cas).
4. **2.5.3** : `aria-label` des appuis de source incluant le texte visible (« 12.1, chapitre 12, section 1 ») ou texte masqué visuellement ; `<h1>` sur les flashcards et l'entraînement.
5. **Transition concept → section** : armer le fondu d'arrivée (B) indépendamment de `ev.viewTransition` (par ex. un marqueur d'URL, état dans l'URL, D0.18) pour que la transition dessinée joue même quand Chromium abandonne la View Transition ; rejouer `vt-probe.mjs` sur l'Android réel en T7 (statut HYPOTHÈSE).

## 7. Fichiers

- `link-c12-s01-k01.{1,2,3}.json`, `concept.{1,2,3}.json`, `defi-n1.{1,2,3}.json`, `riposte-rip-01.{1,2,3}.json` — rapports Lighthouse bruts (perf + accessibilité).
- `proto-lighthouse.summary.json` — médianes et extraits par run (élément LCP, décalages, requêtes, polices, scripts).
- `proto-motion-fps.jsonl` — 12 lignes `fps-probe.mjs` (concept entrée / défilement, défi réponse / Passer).
- `proto-vt-probe.json` — 3 séries `vt-probe.mjs` (proto / prerender / slow) sur le déployé.
- `proto-interactions-cpu4.json` — event timing des 5 interactions, durées P7, reduced-motion.
- `proto-sweep.json` — balayage des 22 URL (requêtes, tiers, erreurs console, `scrollWidth`, ombres, `h1`, `main`, `canvas`, polices).
- `proto-verdict-data.json` — agrégats (médianes) utilisés dans les tableaux ci-dessus.
