# Labo « framework » — React 19 + Vite 6 + Tailwind v4 contre Astro 5 (T7)

> Micro-prototype mesuré du 9 septembre 2026 (PLAN T7, D0.9, D3.5) : la même page « hello-corpus » construite deux fois (plus une variante React pré-rendue en bonus), déployée en Static Assets Workers (plan gratuit), mesurée avec les mêmes outils. Statut de chaque fait : **VÉRIFIÉ** (mesuré aujourd'hui, commande et fichier cités) / **PROBABLE** / **HYPOTHÈSE**. Chiffres consolidés dans `measurements.json` ; rapports Lighthouse complets dans `docs/discovery/perf/2026-09-09/labo-framework-*.json`.

## 1. Ce qui a été construit

La page = la section **c12-s01** (« La bifurcation écologique pour une société de l'harmonie », chapitre 12) rendue depuis la projection runtime D1.6 : chapeau, mesure clé, 12 mesures, un « À savoir », lien vers la source, attribution CC BY-NC-SA ; en tête, une **boîte de recherche** (MiniSearch sur les 89 sections, ≈ 1 000 unités) dont le module et le corpus sont chargés **paresseusement** (`import()` dynamique + `fetch('/data/slim.json')`) au premier focus.

| | Variante 1 `react` | Variante 1b `react-ssg` (bonus) | Variante 2 `astro` |
|---|---|---|---|
| Pile | React 19.2.8, Vite 6.4.3, `@vitejs/plugin-react` 5.2.0, Tailwind 4.3.3 (`@tailwindcss/vite`) — « pile du plugin LFI » | Idem + `react-dom/server` au build (`scripts/prerender.ts`) et `hydrateRoot` côté client (même bundle) | Astro 5.18.2 statique, sans adaptateur, un seul `<script>` vanilla (pas d'île framework) |
| Rendu de l'écran 0 | Côté client (`#root` vide dans le HTML) | Pré-rendu au build, hydraté | HTML au build |
| Déploiement | https://aec-lab-fw-react.baoleka.workers.dev | https://aec-lab-fw-react-ssg.baoleka.workers.dev | https://aec-lab-fw-astro.baoleka.workers.dev |
| Worker | `wrangler.jsonc` sans `main` : **assets-only** (`assets.directory`, `not_found_handling: none`, `observability.enabled: false`) | `wrangler.ssg.jsonc` | idem |

Entrées **byte-identiques** pour les deux piles (`shared/build-shared.ts`) :

- `shared/generated/slim.json` — projection D1.6 recalculée depuis `data/aec-2025.json` avec la logique de `prototypes/spike-share/scripts/build-data.ts` ; **`cmp` avec le `slim.json` du spike : identique** (249 153 o brut, 69 166 o gzip -9, corpus `d29c7422004ab27c`) — VÉRIFIÉ.
- `shared/generated/section.json` — meta + chapitre + section c12-s01 (4 181 o), importé au build par les deux apps.
- `shared/generated/tokens.css` — `design/tokens.json` → propriétés CSS (palette, rôles clair/sombre, typo, espaces, rayons, ombre 3D, mouvement, `prefers-reduced-motion`), bloc `@font-face` de `design/fonts/README.md` §6, et **faces de repli à métriques calées** (`size-adjust`, `ascent-override`, `descent-override`, calculées avec fontTools : Public Sans 0,4533 em / Roboto 0,4394 / Noto Sans 0,4687 ; Gowun Batang 0,4393 / Noto Serif 0,4786) pour P4.
- `design/fonts/*.woff2` + licences OFL copiés dans `public/fonts/` des deux apps ; `PublicSans-Variable` et `GowunBatang-Regular` en `<link rel="preload">`.
- `shared/search/search-core.ts` (MiniSearch 7.2.0, normalisation / stop words / racinisation du banc T6 `eval/retrieval-core.ts`, config A) et `shared/search/lazy.ts` (chargeur mémoïsé + `performance.mark`).

Côté React, Tailwind v4 est alimenté par les tokens via `@theme inline` (palette par défaut supprimée, seules les couleurs de la charte existent) ; côté Astro, une feuille CSS écrite à la main avec les mêmes tokens. Le DOM produit est le même (mêmes classes `search`, `status`, `[data-results]`, `li.hit`, `.verbatim`, `.label`).

**Comportement identique, prouvé** — VÉRIFIÉ (`measure/search-timing.ts`, `measure/boxes.ts` du 9/9) :
- boîtes de mise en page (`getBoundingClientRect`) identiques au centième de pixel sur header, section de recherche, `#q`, article, h1, h2, ol, li, aside, footer (une différence de 3 px CSS de marge sur le label de chapitre a été corrigée avant les mesures) ;
- capture d'écran de la recherche « règle verte » : **129 pixels différents sur 1 038 240 (0,012 %)**, bornés au curseur/ligne de texte (`docs/discovery/captures/2026-09-09/labo-framework/{react,astro}-search.png`) ;
- **une seule liste de résultats distincte** sur 9 exécutions × 3 variantes pour « règle verte » (8 passages, mêmes ids, même ordre) ; statut « 8 passages trouvés » dans les trois ;
- `document.fonts` : Public Sans 100-900 et Gowun Batang 400 en statut `loaded` dans les trois ; la face de repli `Public Sans Fallback Roboto` est effectivement utilisée pendant le swap sur les variantes pré-rendues.

## 2. Lancer

```sh
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"   # Node ≥ 22 pour wrangler 4 ; Node 24 exécute les .ts sans transpileur
cd prototypes/labo-plateforme/framework
npm install && (cd react && npm install) && (cd astro && npm install)
npm run build:shared        # tokens.css, slim.json, section.json, polices et données dans {react,astro}/public
npm run build               # react: tsc + vite build + CSS inline + prérendu (dist/, dist-ssg/) ; astro: astro check + astro build
npm run deploy              # 3 Workers assets-only sur workers.dev (react, react-ssg, astro)
npm run measure:sizes       # measure/out/sizes.json (brut, gzip -9, octets sur le fil depuis workers.dev)
npm run measure:lighthouse  # [TAG=nom] [SUMMARIZE_ONLY=1] node measure/lighthouse.ts [runs] [variante…]
npm run measure:search      # node measure/search-timing.ts [runs] [variante…] (Playwright + CDP)
node measure/invocations.ts # GraphQL workersInvocationsAdaptive sur les Workers du labo (token wrangler lu à l'exécution)
npm run report              # measurements.json (verdicts contre design/perf-budget.md)
```

Dév local : `npm --prefix react run dev` (Vite, http://localhost:5173) et `npm --prefix astro run dev` (http://localhost:4321). Les mesures se font **sur les déploiements**, jamais sur un serveur de dev.

Pièges rencontrés — VÉRIFIÉ :
- `tsx` + `page.evaluate()` de Playwright : « ReferenceError: __name is not defined » (esbuild injecte un helper dans les fonctions sérialisées). Les scripts de mesure sont donc lancés avec **`node` directement** (type stripping natif de Node 24), sans dépendance.
- `@vitejs/plugin-react` 6.x exige Vite 8 : épingler **5.2.0** pour Vite 6. `@tailwindcss/vite` 4.3.3 accepte Vite 5-8.
- Assets-only Worker : `npx wrangler deploy` affiche « Total Upload: 0.31 KiB », « No bindings found » ; le premier `GET /` peut répondre 404 pendant ~10 s après le déploiement (propagation), puis 200.
- Lighthouse 13 : l'audit `largest-contentful-paint-element` n'existe plus, l'élément LCP se lit dans `lcp-breakdown-insight` (`details.items[].type === 'node'`).

## 3. Mesures

Environnement (VÉRIFIÉ, `measurements.json` → `environment`) : Lighthouse **13.4.1** (CLI), Chromium **153** de Playwright (`~/.cache/ms-playwright/chromium-1243`), `--headless=new`, émulation mobile par défaut (moto g power 2022), **throttling `devtools` appliqué** : CPU ×4, RTT 150 ms, 1 638 kbit/s (latence requête 562,5 ms, 1 474,56 kbit/s descendant, 675 montant) — les valeurs de `design/perf-budget.md` §5.1. 3 exécutions par variante, **médiane par métrique**. Machine de session (Linux, `benchmarkIndex` 990-1 035), cible workers.dev (colo CDG, TTFB 40-80 ms). Node 24.14.0, wrangler 4.130.0.

### 3.1 Poids (`measure/sizes.ts`, gzip -9 local et octets sur le fil servis par Static Assets, brotli)

Passe B (déployée, CSS inline) :

| | `react` | `react-ssg` | `astro` | Budget |
|---|---:|---:|---:|---|
| **JS initial, gzip -9** (scripts référencés par le HTML, framework compris) | **64 726 o** (`index-*.js`, 204 594 o brut) | 64 726 o | **1 517 o** (`SearchBox…js`, 3 133 o brut) | P2 < 100 000 o |
| JS initial sur le fil (brotli Cloudflare) | 65 156 o | 65 199 o | 1 498 o | |
| JS paresseux (MiniSearch + recherche, `search-core-*.js`) | 7 245 o gzip | 7 245 o | 7 245 o (même chunk, même hash `CUPmbxsA`) | ≤ 50 000 o par chunk |
| HTML brut / gzip -9 / fil | 14 785 / 4 238 / 4 243 o | 22 042 / 6 662 / 6 758 o | 13 253 / 4 523 / 4 564 o | |
| CSS inline dans le HTML (brut) | 13 867 o (Tailwind) | 13 867 o | 7 126 o | |
| Polices préchargées (2 woff2, non recompressibles) | 48 832 o | 48 832 o | 48 832 o | P8 ≤ 75 000 o pour les 4 |
| **Chemin critique sur le fil** (HTML + CSS + polices préchargées + JS initial) | **118 231 o** | 120 789 o | **54 894 o** | P3 ≤ 150 000 o |
| Corpus `slim.json` (chargé à la première recherche) | 68 646 o fil | idem | 68 700 o fil | hors chemin critique |

Passe A (feuille CSS externe, valeurs par défaut des deux outils) : `react` JS 64 682 o gzip, CSS 3 773 o gzip, HTML 525 o gzip, chemin critique 118 323 o ; `astro` JS 1 517 o, CSS 1 903 o, HTML 2 645 o, chemin critique 54 879 o (`docs/discovery/perf/2026-09-09/labo-framework-sizes-external-css.json`).

Remarque : sur le JS, le brotli de Cloudflare (niveau dynamique) est **plus gros** que gzip -9 (65 156 contre 64 726 o) ; le budget P2 s'exprime en gzip -9 local, c'est la mesure reproductible — VÉRIFIÉ.

### 3.2 Lighthouse (3 exécutions, médiane ; rapports complets archivés)

**Passe A — CSS externe** (configuration par défaut de Vite et d'Astro `inlineStylesheets: 'auto'`) — `labo-framework-{react,astro}-external-css.{1,2,3}.json` :

| Variante | Perf | FCP | **LCP** | TBT | CLS | Speed Index | Requêtes | Transfert total | Élément LCP | Délai de rendu LCP | Boot JS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|---:|
| `react` | 0,97 | 2 078 ms | **2 078 ms** (2 091 / 2 078 / 2 078) | 0 ms | 0,000 | 1 921 | 5 | 123 942 o | `article > p` (chapeau) | 2 006 ms | 102 ms |
| `astro` | 1,00 | 1 459 ms | **1 459 ms** (1 473 / 1 450 / 1 459) | 0 ms | 0,002 | 1 470 | 5 | 58 785 o | `article > p.verbatim` (chapeau) | 1 364 ms | 20 ms |

**Passe B — CSS inline** (une requête bloquante de moins, `react/scripts/inline-css.ts` et Astro `inlineStylesheets: 'always'` ; configuration **déployée**) — `labo-framework-{react,react-ssg,astro}-inline-css.{1,2,3}.json` :

| Variante | Perf | FCP | **LCP** | TBT | CLS | Speed Index | Requêtes | Transfert total | Délai de rendu LCP | Travail thread principal | Boot JS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `react` | 0,97 | 2 059 ms | **2 059 ms** (2 031 / 2 059 / 2 059) | 0 ms | 0,000 | 1 742 | 4 | 123 172 o | 1 950 ms | 301 ms | 92 ms |
| `react-ssg` | 1,00 | 929 ms | **929 ms** (968 / 892 / 929) | 0 ms | 0,002 | 989 | 4 | 125 725 o | 837 ms | 431 ms | 90 ms |
| `astro` | 1,00 | 935 ms | **935 ms** (965 / 921 / 935) | 0 ms | 0,002 | 986 | 4 | 58 060 o | 830 ms | 322 ms | 21 ms |

Lecture (VÉRIFIÉ sur les rapports) :
- Sur ce profil, le plancher est **deux allers-retours** (≈ 1,2 s : HTML, puis ressources bloquantes) tant que la feuille CSS est externe ; l'inliner ramène Astro et React pré-rendu à **un aller-retour + rendu ≈ 0,93 s**. Pour React en rendu client, l'inline ne change rien (-19 ms) : le LCP attend le téléchargement de 65 Ko de JS et son exécution à CPU ×4 (`elementRenderDelay` ≈ 1,95 s).
- TBT = 0 partout, y compris pour React CSR : le travail JS se fait **avant** le FCP, hors fenêtre TBT (artefact connu). Le vrai coût se lit dans `bootup-time` : **≈ 90-100 ms** de JS à CPU ×4 pour React contre **≈ 20 ms** pour Astro, et 431 ms de thread principal pour l'hydratation contre 322 ms sans (react-ssg vs astro).
- CLS : 0,000 (React CSR : rien n'est peint avant le rendu final) et 0,002 (pages pré-rendues : swap des polices avec faces de repli calées) — bien sous les 0,02 imputables aux polices (P4).
- L'élément LCP est un bloc de texte (le chapeau en Gowun Batang) dans les trois cas, jamais une image — conforme à `perf-budget.md` §1.2.

### 3.3 Temps jusqu'au premier résultat de recherche (`measure/search-timing.ts`, Playwright + CDP, cache froid, 3 exécutions)

Viewport 412 × 823 @1,75, CPU ×4, réseau devtools Slow 4G (mêmes valeurs que Lighthouse). Requête « règle verte » tapée à 60 ms/caractère juste après le focus ; horodatage `performance.now()` dans la page (écouteurs en phase de capture, `MutationObserver` sur `li.hit`).

| Variante | **Focus → 1er résultat** (médiane ; runs) | 1re frappe → 1er résultat | Chargement paresseux (import + fetch) | dont fetch `slim.json` (68,7 Ko fil) | Construction de l'index (≈ 1 000 unités) | Recherche « chaude » (input → DOM) |
|---|---:|---:|---:|---:|---:|---:|
| `react` | **1 242 ms** (1 263 / 1 239 / 1 242) | 1 203 ms | 1 217 ms | 1 018 ms | 197 ms | 17,3 ms |
| `react-ssg` | **1 272 ms** (1 251 / 1 272 / 1 278) | 1 231 ms | 1 246 ms | 1 023 ms | 219 ms | 18,1 ms |
| `astro` | **1 254 ms** (1 237 / 1 260 / 1 254) | 1 237 ms | 1 241 ms | 1 017 ms | 224 ms | 7,5 ms |

Lecture : **aucune différence de pile** sur le premier résultat (≈ 1,25 s, écart < 3 %) : le coût est le fetch du corpus (≈ 1,0 s = latence 562 ms + 69 Ko à 1,47 Mbit/s) puis l'indexation (≈ 200 ms à CPU ×4 sur le thread principal, au-dessus de la règle « aucune tâche > 50 ms » de `perf-budget.md` §1.5 : Web Worker ou index précalculé, voir §5). La recherche chaude est instantanée dans les deux piles (React 17 ms via `setState`, DOM direct 7,5 ms) — VÉRIFIÉ.

### 3.4 Static Assets et quota Workers (`measure/invocations.ts`)

GraphQL `workersInvocationsAdaptive` (même méthode que `06-partage.md` §2) sur les trois Workers du labo, fenêtre 05:32 → 13:32 UTC couvrant toutes les mesures (`labo-framework-invocations.json`) (≈ 30 chargements Lighthouse + 27 sessions Playwright + curl) : **aucune ligne** ; la même requête sur `aec-spike-share` (Worker avec script) renvoie 524 requêtes sur 30 h. Les requêtes servies par Static Assets d'un Worker sans `main` **n'apparaissent pas comme invocations** (ni CPU, ni compteur de requêtes) — VÉRIFIÉ, cohérent avec « Static Assets gratuits et illimités » (PLAN §3.2). Le jeu de données étant échantillonné (« adaptive »), le zéro est PROBABLE au sens strict, VÉRIFIÉ au sens « rien de comptabilisé ».

## 4. Verdict contre `design/perf-budget.md`

| Règle | `react` (CSR, pile LFI) | `react-ssg` | `astro` |
|---|---|---|---|
| P1 LCP labo < 2 500 ms | **tenu, 2 059 ms — marge 441 ms** | tenu, 929 ms — marge 1 571 ms | **tenu, 935 ms — marge 1 565 ms** |
| P2 JS initial < 100 Ko gzip | **tenu, 64,7 Ko — il reste 35 Ko** pour tout le code applicatif | idem | **tenu, 1,5 Ko — il reste 98,5 Ko** |
| P3 chemin critique ≤ 150 Ko | tenu, 118 Ko (alerte : 79 %) | tenu, 121 Ko | tenu, 55 Ko (37 %) |
| P4 CLS < 0,1 (polices ≤ 0,02) | tenu, 0,000 | tenu, 0,002 | tenu, 0,002 |
| Chunk paresseux ≤ 50 Ko | tenu, 7,2 Ko | idem | idem |

Tout passe **sur une page d'une section**. Ce qui sépare les piles, c'est la **marge** : la page React consomme **65 % du budget JS et 82 % du budget LCP avant la première ligne de code de l'app** (routeur, kit de partage, glossaire, jeux, chat, flags KV). Le budget dit (§1.3) « un framework qui ne tient pas 100 Ko avec la recherche locale et le kit de partage est écarté » : avec React il reste 35 Ko pour tout cela — HYPOTHÈSE défavorable, non mesurée (le kit de partage et le glossaire ne sont pas prototypés ici). Astro laisse 98,5 Ko et 1,5 s.

## 5. Recommandation (D3.5, D0.9)

**Astro 5 statique, îles minimales** — DÉCISION proposée, sur pièces :

1. **Astro 5 en `output: 'static'`, sans adaptateur**, servi comme Worker assets-only (le Worker `main` n'arrive qu'avec `/api/*` en `run_worker_first`). Feuille CSS inlinée (`inlineStylesheets: 'always'`) : -525 ms de LCP mesurés. Le texte de l'écran 0 est dans le HTML (règle §1.2 du budget), l'élément LCP est un bloc de texte.
2. **Îles en vanilla TypeScript d'abord** (recherche, partage, flags) ; une île **Preact ou React via `@astrojs/react`** seulement pour un composant qui le justifie (jeu, chat), chargée `client:visible`/`client:idle`, et comptée dans le budget par chunk (≤ 50 Ko). React 19 seul coûte 64,7 Ko gzip : à ne charger que si un écran l'exige, jamais sur l'écran 0.
3. **Tailwind v4 reste possible avec Astro** (`@tailwindcss/vite`, même plugin que la variante React) : le choix de framework n'impose pas le choix de CSS. Sur cette page, le CSS Tailwind pèse 13,9 Ko brut inline contre 7,1 Ko écrit à la main ; les deux sont négligeables sur le fil (≈ 1,9-3,8 Ko).
4. Si l'équipe tient à React (compétence du plugin LFI) : **le pré-rendu est obligatoire** (`react-ssg` : LCP 929 ms, égal à Astro) et il ne reste que 35 Ko de JS ; c'est tenable pour une page, pas pour l'app entière — PROBABLE. Le pré-rendu maison (`scripts/prerender.ts`, 40 lignes) est fragile (pas de routage, pas de données par page) : à ce stade, c'est réinventer Astro.
5. Recherche : quelle que soit la pile, mettre le corpus **hors chemin critique** (fait), précharger `slim.json` en `<link rel="prefetch">` après `load` pour effacer la seconde d'attente au premier focus, et **indexer dans un Web Worker** ou charger un index MiniSearch sérialisé au build (`MiniSearch.loadJSON`) : 200 ms d'indexation à CPU ×4 sur le thread principal dépassent la règle « aucune tâche > 50 ms » de P5 — HYPOTHÈSE à mesurer en T7 (INP).

Ce que le labo **ne prouve pas** (HYPOTHÈSES restantes) : le comportement sur un Android réel en 4G (protocole §5.4 du budget, J3 soir) ; INP sur les 5 interactions clés ; le poids réel du kit de partage et du glossaire dans chaque pile ; l'accessibilité (catégorie non lancée ici, `--only-categories=performance`).

## 6. Fichiers

```
prototypes/labo-plateforme/framework/
├── README.md, measurements.json, package.json, tsconfig.json, .gitignore
├── shared/
│   ├── build-shared.ts            projection D1.6, tokens.css, section.json, polices → public/
│   ├── types.ts                   SlimCorpus, PageData, SearchHit
│   ├── search/search-core.ts      MiniSearch + normalisation T6 (chunk paresseux)
│   ├── search/lazy.ts             import() + fetch mémoïsés, performance.mark
│   └── generated/                 (ignoré par git) tokens.css, slim.json, section.json
├── react/                         Vite 6 + React 19 + Tailwind v4 ; wrangler.jsonc (CSR) ; wrangler.ssg.jsonc (pré-rendu)
│   ├── index.html, vite.config.ts, tsconfig.json, package.json, public/_headers
│   ├── src/{main.tsx, App.tsx, SearchBox.tsx, entry-server.tsx, styles.css}
│   └── scripts/{inline-css.ts, prerender.ts}
├── astro/                         Astro 5 statique ; wrangler.jsonc
│   ├── astro.config.ts, tsconfig.json, package.json, public/_headers
│   └── src/{pages/index.astro, components/SearchBox.astro, styles/global.css}
└── measure/
    ├── common.ts                  variantes, throttling, wireSize(), median()
    ├── sizes.ts, lighthouse.ts, search-timing.ts, boxes.ts, invocations.ts, report.ts
    └── out/                       (ignoré par git) rapports bruts, captures, logs
```

Archives : `docs/discovery/perf/2026-09-09/labo-framework-*` (15 rapports Lighthouse, 2 résumés, tailles, chronométrage de la recherche, `measurements.json`) ; captures `docs/discovery/captures/2026-09-09/labo-framework/`.

`public/_headers` (les deux apps) : `Cache-Control: public, max-age=31536000, immutable` sur les chunks hachés et les polices, 1 h sur `/data/*`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, CSP `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'` (CSS inline) — vérifiés sur les réponses de workers.dev (`curl -D -`). Aucune requête tierce, aucun cookie, aucun log d'invocation (`observability.enabled: false`, et de toute façon aucune invocation).

## 7. Supprimer les ressources

Trois Workers assets-only, aucune autre ressource (pas de KV, D1, DO, R2, AI, ni domaine personnalisé). Coût : 0 € (VÉRIFIÉ : aucune invocation comptabilisée, Static Assets hors quota).

```sh
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"
cd prototypes/labo-plateforme/framework/react && npx wrangler delete --name aec-lab-fw-react && npx wrangler delete -c wrangler.ssg.jsonc --name aec-lab-fw-react-ssg
cd ../astro && npx wrangler delete --name aec-lab-fw-astro
```

Localement : `rm -rf node_modules react/node_modules astro/node_modules react/dist react/dist-ssg astro/dist shared/generated measure/out` (≈ 1 Go de `node_modules`).

Texte du programme : La France insoumise – L'Avenir en commun, CC BY-NC-SA 4.0 (`data/LICENSE`). Polices : SIL OFL 1.1 (`design/fonts/OFL-*.txt`, copiées dans `public/fonts/`).
