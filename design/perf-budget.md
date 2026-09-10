# Budget de performance et d'accessibilité (T3, figé avant les maquettes)

> **Statut : FIGÉ le 7 septembre 2026.** Ce budget s'applique à toutes les maquettes (canvas T3, anatomies T2, artboards T5), à tous les prototypes (micro-interactions T3, spike de partage T4, prototypes jouables J3-J4, prototype workers.dev T7) et aux versions v1/v2/v3 décrites dans le prompt final (§13). Toute modification passe par une ligne datée dans `docs/discovery/decisions.md`. Il ne rouvre aucune décision D0.x ni D3.x : il les rend mesurables.
>
> Chaque fait porte un statut : **VÉRIFIÉ** (lu à la source ou mesuré le 7/9/2026, URL en §8), **PROBABLE** (source secondaire ou non reproduit), **HYPOTHÈSE** (à lever, méthode indiquée). Les seuils du budget eux-mêmes sont des **décisions** (plan T3, §3.5 « 60 fps sur mobile moyen »), pas des faits : ils sont notés DÉCISION.

## 0. La carte du budget (à afficher à côté de chaque maquette)

| # | Règle | Valeur | Mesure de référence | Éliminatoire |
|---|---|---|---|---|
| P1 | LCP | **< 2,0 s** sur Android milieu de gamme, 4G réelle (médiane de 5 chargements à froid) ; **< 2,5 s** en labo Lighthouse « Slow 4G » + CPU ×4 | §5.1, §5.4 | oui |
| P2 | JavaScript initial | **< 100 Ko gzip** (tout JS exécuté avant l'interactivité de l'écran 0, framework compris) | §5.3 | oui |
| P3 | Chemin critique du LCP | ≤ 150 Ko compressés (HTML + CSS + polices du premier écran + éventuelle image LCP) — dérivé de P1 (§1.2) | §5.3 | non (alerte) |
| P4 | CLS | **< 0,1** (labo et réel), dont ≤ 0,02 imputable au chargement des polices | §5.1 | oui |
| P5 | INP | **< 200 ms** à CPU ×4 sur les 5 interactions clés (§1.5) | §5.1 | oui |
| P6 | Fluidité | **60 fps à CPU ×4** : 0 frame > 50 ms, ≤ 5 % de frames > 20 ms pendant toute animation dirigée | §5.2 | oui |
| P7 | Motion | aucune animation > 320 ms (`design/tokens.json` `motion.duration`) ; **`prefers-reduced-motion` honoré** : tout à 0 ms sauf opacité ≤ 120 ms | §5.2, §2 | oui |
| P8 | Polices | **auto-hébergées, sous-ensembles latin, woff2** : Public Sans variable + Gowun Batang 400/700, **≤ 75 Ko au total**, aucune requête vers `fonts.googleapis.com` / `fonts.gstatic.com` | §1.7 | oui |
| P9 | Rendu | **zéro WebGL / Three.js / canvas plein écran** (ban list `design/tokens.json`), zéro script tiers (D0.22) | revue de code | oui |
| A1 | WCAG 2.2 niveau AA | cibles ≥ 24 × 24 px CSS (2.5.8), alternative au geste de glissement (2.5.7) et au clavier (2.1.1), focus visible (2.4.7) et non masqué (2.4.11), contraste texte ≥ 4,5:1 (1.4.3) et non-texte ≥ 3:1 (1.4.11), reflow 320 px (1.4.10), zoom texte 200 % (1.4.4) | §2, §5.5 | oui |
| A2 | Taille de police système respectée | tailles en `rem`, aucun `user-scalable=no` ni `maximum-scale`, mise en page stable au zoom 200 % ; Chrome Android applique la taille système comme zoom de page (VÉRIFIÉ, §2.3) | §5.5 | oui |
| A3 | Dark mode système (D0.23) | `prefers-color-scheme` + `color-scheme: light dark`, tokens `color-role.dark`, contraste sur Charbon ≥ 4,5:1 | matrice de contraste | oui |
| S1 | Robustesse | **l'app est complète sans Web Share ni service worker** (§4) ; aucune bannière « installe l'app » bloquante | §5.6 | oui |

**Mesures du 10/9 (prototype `proto.cestecritla.fr`)** : §5.8 — P1, P4, P8 FAIL (architecture du prototype : rendu client, corpus sur le chemin critique, italique entière), P2, P5, P6, P7, P9, A2, A3, S1 PASS, A1 partiel (WCAG 2.5.3, `<h1>`), Lighthouse Accessibilité 100 × 4.

## 1. Budget de performance

### 1.1 Pourquoi ces seuils

- Les seuils Google « bon » sont **LCP ≤ 2,5 s, INP ≤ 200 ms, CLS ≤ 0,1**, mesurés au 75e percentile — VÉRIFIÉ [S1]. Le plan (T3) serre le LCP à **2 s en 4G réelle** parce que le cas majoritaire est une arrivée par lien WhatsApp sans contexte (D0.4) : l'utilisateur n'a rien demandé, il ne patiente pas. — DÉCISION.
- Le corpus entier fait ~62 Ko gzippés (PLAN §1, PROBABLE jusqu'à T1) : la lecture, la recherche et le glossaire peuvent être 100 % côté client. Le budget JS est donc une **contrainte de design**, pas une gêne : ce qui n'entre pas dans 100 Ko est chargé après le LCP ou à la demande.
- Awwwards T1 2026 : les gagnants sans WebGL sont des expériences typographiques ; critère « motion dirigé + 60 fps sur mobile moyen » (PLAN §3.5). Le « sexy » vient de la DA, pas des mégaoctets.

### 1.2 Chemin critique dérivé (calcul, pas mesure)

Le profil labo « Slow 4G » de Lighthouse est **150 ms de latence, 1,6 Mbit/s descendant / 750 kbit/s montant, CPU ×4**, décrit comme « le quart inférieur des connexions 4G et le quart supérieur des 3G » — VÉRIFIÉ [S2]. À 1,6 Mbit/s ≈ 200 Ko/s, après ~0,6 s de TTFB simulé (mesuré §5.1), il reste ~1,9 s pour peindre le LCP sous 2,5 s, soit **≈ 150 Ko compressés** en tenant compte de l'ouverture de connexion et du parsing. D'où P3. Au-delà, le LCP labo dépasse 2,5 s quel que soit le framework.

Conséquences de design (DÉCISION, dérivées) :
- **Le texte visible de l'écran 0 est dans le HTML initial** (pré-rendu au build) : l'élément LCP est un bloc de texte, jamais une image de héros ni un rendu client. Le choix du framework (T7) doit le permettre.
- Le JSON du corpus (62 Ko gz) n'est **jamais** sur le chemin critique : il est chargé après `load`, ou à la première frappe dans la recherche, avec `Cache-Control: public, max-age=31536000, immutable` sur un nom haché.
- Une seule image au-dessus de la ligne de flottaison au plus, en SVG ou WebP/AVIF ≤ 30 Ko, avec `width`/`height` et `fetchpriority="high"` si c'est l'élément LCP (cas des cartes de partage seulement).
- Aucun `@import` CSS, aucune police découverte via une feuille tierce (voir le témoin §5.1 : la chaîne HTML → CSS Google Fonts → woff2 coûte à elle seule ~0,9 s en Slow 4G).

### 1.3 JavaScript initial < 100 Ko gzip (P2)

- Périmètre : tout script (inline ou externe) chargé et exécuté avant que l'écran 0 soit interactif, framework et hydratation compris. Le JS différé (`type="module"` chargé après `load`, `import()` à l'interaction) ne compte pas, mais chaque chunk différé est plafonné à 50 Ko gzip.
- Mesure : somme des `transferSize` des requêtes `Script` dans le rapport Lighthouse (§5.1) **et** `gzip -9` du build (§5.3). Les deux doivent être < 100 Ko ; brotli sera plus petit en production mais le budget est exprimé en gzip pour être reproductible partout.
- Ce budget est le juge de paix du micro-prototype T7 (React + Vite + Tailwind v4 vs Astro) : un framework qui ne tient pas 100 Ko avec la recherche locale et le kit de partage est écarté, quel que soit son confort.

### 1.4 CLS < 0,1 (P4)

Causes prévisibles et parades obligatoires :
- **Polices** : `font-display: swap` avec métriques de repli (`size-adjust`, `ascent-override`, `descent-override`, `line-gap-override`) calées sur `system-ui` pour Public Sans et sur `Georgia` / `Iowan Old Style` pour Gowun Batang ; les deux polices du premier écran en `<link rel="preload" as="font" crossorigin>`. Objectif ≤ 0,02 de CLS dû au swap, mesuré.
- **Images et mascotte** : `width`/`height` ou `aspect-ratio` sur tout média ; la mascotte a une boîte réservée même quand elle n'est pas encore chargée.
- **Contenu injecté** : réponse du chat (v2) et mode dégradé dans un conteneur à hauteur minimale ; le widget Turnstile (v2) a une hauteur réservée ; aucune bannière insérée en haut de page après le rendu (il n'y a de toute façon pas de bandeau cookies, D0.22).
- **Barres de navigation mobiles** : hauteur de l'écran 0 en `min-height: 100dvh` avec repli `100vh`, jamais de calcul JS de hauteur au chargement.

### 1.5 INP < 200 ms à CPU ×4 (P5)

Les cinq interactions clés mesurées sur chaque prototype : (1) taper une lettre dans la recherche, (2) ouvrir une carte-concept depuis la section, (3) « Partager » (ouverture de la feuille ou du fallback), (4) répondre à une question du quiz / avancer d'un écran, (5) ouvrir le menu. Règles : recherche lexicale dans un Web Worker si l'indexation dépasse 50 ms sur le thread principal ; aucune tâche longue (> 50 ms) après `load` ; les gestionnaires d'événements ne font que muter l'état, le rendu lourd est fractionné (`requestAnimationFrame`, `scheduler.yield()` si disponible, sinon `setTimeout(0)`).

### 1.6 60 fps à CPU ×4 et `prefers-reduced-motion` (P6, P7)

- Seules `transform` et `opacity` sont animées ; jamais `box-shadow`, `filter`, `width/height`, `top/left`. L'ombre pleine du bloc 3D (`shadow.block-3d`) est **statique** : l'entrée du bloc anime un `transform: translate()` du bloc, pas l'ombre.
- Durées : `fast` 120 ms, `base` 200 ms, `slow` 320 ms (tokens). Le swipe, s'il est retenu en T5, suit le doigt en `transform` avec `touch-action: pan-y` et se termine en ≤ 320 ms.
- `@media (prefers-reduced-motion: reduce)` : toute durée à 0 ms sauf les fondus d'opacité ≤ 120 ms ; aucune animation en boucle (la mascotte reste immobile) ; aucune View Transition (`view-transition-name` n'est déclaré que sous `@media (prefers-reduced-motion: no-preference)`) ; aucun défilement automatique. La requête média est supportée par Safari 10.1+ (iOS en miroir), Chrome Android, Firefox Android 64+, Samsung Internet, WebView Android — VÉRIFIÉ [S3].
- `will-change` uniquement sur l'élément en cours d'animation, retiré ensuite ; pas plus de 3 couches composées simultanées sur un écran.

### 1.7 Polices auto-hébergées (P8)

Tailles des sous-ensembles latin servis aujourd'hui par Google Fonts (woff2, `unicode-range` latin), mesurées le 7/9/2026 — VÉRIFIÉ (mesuré, `curl`, §8 [S4]) :

| Fichier | Octets | Rôle |
|---|---|---|
| Public Sans **variable** wght 100-900, droit, latin | **26 636** | voix de l'app, titres 900 |
| Public Sans variable wght 100-900, italique, latin | 28 356 | à **ne pas** embarquer en entier : seul l'italique 900 des titres inclinés (D3.1) est nécessaire → sous-ensemble statique ≤ 15 Ko à produire au build (HYPOTHÈSE de taille, à mesurer avec `pyftsubset`) |
| Gowun Batang 400 latin | 16 236 | verbatim |
| Gowun Batang 700 latin | 16 208 | verbatim, emphase (jamais d'italique, D3.2) |

Total visé : **26,6 + ~15 + 16,2 + 16,2 ≈ 74 Ko**, d'où le plafond de 75 Ko. Préchargées sur l'écran 0 : Public Sans droit seulement (Gowun Batang 400 est préchargée uniquement sur les écrans qui affichent un verbatim). Les deux familles sont sous SIL OFL (identity-decision §1) : l'auto-hébergement est licite. Toute maquette ou tout prototype qui charge une police depuis un domaine tiers échoue au budget (c'est aussi une fuite de données vers un tiers, contraire à D0.22).

## 2. Budget d'accessibilité (WCAG 2.2 AA)

### 2.1 Critères mesurables, avec la parade de design

| Critère WCAG 2.2 | Exigence | Comment on la tient |
|---|---|---|
| 2.5.8 Taille de la cible (AA) | « au moins 24 × 24 pixels CSS », sauf exceptions (espacement, équivalent, en ligne, contrôle de l'agent utilisateur, essentiel) — VÉRIFIÉ [S5] | `tap-target.min` 24 px, `comfortable` 44 px pour toute action principale (tokens) ; les puces de progression et chips de thème respectent l'exception « espacement » (cercle de 24 px sans intersection) |
| 2.5.7 Mouvements de glissement (AA) | « toute fonctionnalité qui utilise un mouvement de glissement peut être réalisée avec un pointeur simple sans glissement » — VÉRIFIÉ [S6] | tout swipe (cartes, quiz, stories) a deux boutons visibles « Précédent / Suivant » ou « Passer », et répond aux flèches du clavier |
| 2.1.1 Clavier (A) | tout au clavier | ordre de tabulation = ordre visuel ; `Escape` ferme les feuilles ; pas de piège de focus |
| 2.4.7 Focus visible (AA) + 2.4.11 Focus non masqué (minimum, AA) | anneau visible, jamais entièrement recouvert par un élément collant | `outline: 3px solid var(--focus)` + `outline-offset: 2px` ; `focus` = Violet #4C0297 sur Crème (11,62:1) et Vif jaune #F9C900 sur Charbon (10,09:1), ≥ 3:1 exigés par 1.4.11 — VÉRIFIÉ (`design/contrast-matrix.md`) ; barres collantes avec `scroll-padding` |
| 1.4.3 Contraste du texte (AA) | ≥ 4,5:1 (≥ 3:1 en grand texte) | matrice calculée, éliminatoire depuis T3 ; les vives ne sont jamais du texte courant sur Crème (D3.4) |
| 1.4.11 Contraste non textuel (AA) | ≥ 3:1 pour bordures de champs, icônes, anneau de focus, jauges | vérifié par le même script pour les paires « composant » |
| 1.4.4 Redimensionnement du texte (AA) / 1.4.10 Reflow (AA) | lisible à 200 % ; aucun défilement horizontal à 320 px CSS | tailles en `rem`, grilles fluides, `overflow-wrap: anywhere` sur les URLs et sigles ; test à 320 px et à 400 % de zoom |
| 1.4.12 Espacement du texte (AA) | tient avec interligne 1,5 / espacement 0,12 em | aucune hauteur fixe sur les blocs de texte, les cartes s'étirent |
| 1.4.13 Contenu au survol/focus | fermable, survolable, persistant | les infobulles de glossaire sont des panneaux cliquables, pas des `title` |
| 2.2.2 Mettre en pause, arrêter, masquer | tout mouvement > 5 s est pausable | la mascotte n'a pas d'animation en boucle ; les compteurs animés s'arrêtent seuls ≤ 1 s |
| 1.1.1 Contenu non textuel | alternatives | chaque carte de partage a un `alt` = texte de la mesure + attribution ; la mascotte est décorative (`alt=""`) sauf quand elle porte un message |
| 1.3.1 / 4.1.2 | structure et noms accessibles | un seul `<h1>`, `<main>`, `<nav>`, boutons avec nom (le témoin §5.1 a échoué sur `landmark-one-main` et `document-title` : ces deux règles axe sont bloquantes) |
| 3.1.1 Langue | `lang="fr"` | et `lang="fr"` sur les cartes OG/SVG |
| 2.5.3 Étiquette dans le nom | le nom accessible contient le texte visible | « Envoyer à un proche » a pour `aria-label` le même texte |

### 2.2 Registre et contenu

Registre « tu » (D0.25) ; mention IA (art. 50, D0.29) et attribution CC lues par les lecteurs d'écran dans l'ordre du DOM, pas seulement visuelles ; « Devine le % » (D0.20) : le curseur a un `<input type="range">` natif avec valeur annoncée, jamais un slider maison seul.

### 2.3 Taille de police système (A2)

- **Chrome Android** : depuis M113 (annonce blink-dev du 2/8/2023), « le zoom par défaut d'une page tient compte de façon transparente du réglage de taille de police de l'OS » ; ~40 % des utilisateurs Android ont un réglage non standard et voient donc un zoom ≠ 100 % — VÉRIFIÉ [S7]. Conséquence : `window.innerWidth` varie ; les points de rupture (`breakpoint`) doivent être exprimés en `em`/`rem`, pas en `px`, et testés à 130 % et 150 %.
- **Safari iOS** : le réglage « aA » de Safari zoome la page ; le **Dynamic Type** système n'est appliqué au contenu web que via les valeurs `font: -apple-system-body` (et sœurs), qui « représentent un style entier, taille et graisse comprises » — VÉRIFIÉ [S8]. Combiner `-apple-system-body` puis `font-family: 'Public Sans'` pour hériter de la taille dynamique est un pattern documenté par des tiers — PROBABLE [S9], à tester sur l'iPhone en T4 ; si l'héritage est instable, on documente la limite (Safari « aA » reste opérant).
- Interdits : `user-scalable=no`, `maximum-scale` < 5, `-webkit-text-size-adjust: none`, tailles en `px` sur le texte courant.

### 2.4 Dark mode système (A3, D0.23)

`prefers-color-scheme` : Safari iOS 13+, Chrome Android, Firefox Android, Samsung Internet 14.2+, WebView Android — VÉRIFIÉ [S3]. Implémentation : `<meta name="color-scheme" content="light dark">`, deux `<meta name="theme-color" media="(prefers-color-scheme: …)">`, variables CSS depuis `color-role.light`/`dark` (tokens), aucune bascule JS au chargement (pas de flash) ; en sombre, l'accent violet devient Violet 200 #E5CBFF (10,80:1 sur Charbon) et l'action devient Vif jaune (10,09:1) — D3.4. Les cartes de partage (PNG) restent en thème clair Crème : elles sont vues dans des messageries, pas dans l'app.

### 2.5 Technologies d'assistance

Passage VoiceOver (iPhone) et TalkBack (Android) sur le parcours « arrivée par lien → verbatim → partage » lors du test humain 2 (T11, J4) — HYPOTHÈSE jusqu'à exécution ; en labo, axe (`@axe-core/playwright`) sans violation `serious`/`critical` et catégorie Accessibilité Lighthouse ≥ 95 (DÉCISION de seuil).

## 3. Matrice appareils / navigateurs (arrivée par lien)

Versions courantes au 7/9/2026 (mdn/browser-compat-data, VÉRIFIÉ [S10]) : Safari iOS **26.6** (WebKit 624, 27 en bêta), Chrome Android **152** (25/8/2026), WebView Android **152**, Samsung Internet **30.0** (Blink 143), Firefox Android **155** (1/9/2026).

Légende : ✅ supporté · ❌ absent · ◐ partiel/conditionnel · ? à mesurer sur 2 téléphones réels en T4 (D0.33). Chaque cellule porte son statut.

### 3.1 Navigateurs

| Capacité | Safari iOS | Chrome Android | Samsung Internet | Firefox Android |
|---|---|---|---|---|
| `navigator.share` (texte + URL) | ✅ 12.2+ — VÉRIFIÉ [S11] | ✅ 61+ — VÉRIFIÉ [S12] | ✅ 8.2+ — VÉRIFIÉ [S11] | ✅ 79+ — VÉRIFIÉ [S12] |
| `navigator.share({ files })` (PNG) | ✅ Safari 14+ — VÉRIFIÉ [S12] | ✅ 76+ (`canShare` 75+) — VÉRIFIÉ [S12] | ✅ 11.0+ — VÉRIFIÉ [S12] | ❌ (`files` non supporté, miroir de Firefox desktop) — VÉRIFIÉ [S12] |
| `localStorage` persistant | ✅ mais **plafond ITP : suppression de tout le stockage script (localStorage, IndexedDB, SW) après 7 jours d'utilisation de Safari sans interaction avec le site** ; les web apps sur l'écran d'accueil ont leur propre compteur — VÉRIFIÉ [S13] | ✅ — VÉRIFIÉ [S14] ; éviction seulement sous pression de stockage — PROBABLE | ✅ — VÉRIFIÉ [S14] | ✅ — VÉRIFIÉ [S14] |
| Service worker | ✅ 11.3+ — VÉRIFIÉ [S15] | ✅ 40+ — VÉRIFIÉ [S15] | ✅ — VÉRIFIÉ [S15] | ✅ 44+ — VÉRIFIÉ [S15] |
| Installation PWA | ◐ « Sur l'écran d'accueil » via la feuille de partage, pas d'événement `beforeinstallprompt` — VÉRIFIÉ [S16] [S17] | ✅ `beforeinstallprompt` 44+ — VÉRIFIÉ [S16] ; WebAPK — PROBABLE | ✅ `beforeinstallprompt` 5.0+ — VÉRIFIÉ [S16] | ◐ pas de `beforeinstallprompt` — VÉRIFIÉ [S16] ; « Ajouter à l'écran d'accueil » depuis le menu — PROBABLE [S18] |
| View Transitions (même document) | ✅ 18+ — VÉRIFIÉ [S19] | ✅ 111+ — VÉRIFIÉ [S19] | ✅ 23+ — VÉRIFIÉ [S19] | ✅ 155+ (depuis le 1/9/2026) — VÉRIFIÉ [S19] |
| Détection | UA `… Version/26.6 Mobile/15E148 Safari/604.1` — PROBABLE ; pas de `navigator.userAgentData` — VÉRIFIÉ [S12] | UA réduit `(Linux; Android 10; K)` — PROBABLE ; `navigator.userAgentData` 90+ — VÉRIFIÉ [S12] | jeton `SamsungBrowser/30.0` — VÉRIFIÉ [S20] | jeton `Firefox/155.0` — PROBABLE ; pas de `userAgentData` — VÉRIFIÉ [S12] |
| Navigateur par défaut modifiable | ✅ depuis iOS 14 — PROBABLE | ✅ | ✅ | ✅ |

### 3.2 Les quatre conteneurs d'in-app (ce que les apps utilisent réellement)

| Capacité | SFSafariViewController (iOS) | WKWebView (iOS) | Chrome Custom Tabs (Android) | WebView Android |
|---|---|---|---|---|
| Nature | « interface web autonome dans l'app » ; supporte « Reader, AutoFill, avertissement de site frauduleux et blocage de contenu » ; l'app « ne peut pas accéder aux données AutoFill, à l'historique ni aux données de site » — VÉRIFIÉ [S21] | vue web contrôlée par l'app (injection JS possible) — VÉRIFIÉ [S21] [S22] | onglet « propulsé directement par le navigateur préféré de l'utilisateur », « jar de cookies et modèle de permissions partagés » — VÉRIFIÉ [S23] | vue web embarquée ; « ne supporte pas toutes les fonctionnalités de la plateforme web, ne partage pas l'état avec le navigateur » — VÉRIFIÉ [S23] |
| `navigator.share` | ✅ (moteur Safari) — PROBABLE | ✅ dans BCD (miroir Safari 12.2+) — VÉRIFIÉ [S12] ; l'app hôte peut le neutraliser — ? | ✅ = Chrome — VÉRIFIÉ [S23] | **❌ non supporté** (`webview_android: false`, crbug 40540400) — VÉRIFIÉ [S12] |
| `share({ files })` | ✅ — PROBABLE | ◐ BCD : miroir Safari 14+ — ? | ✅ = Chrome | ❌ — VÉRIFIÉ [S12] |
| `localStorage` persistant | ◐ **isolé par app depuis iOS 11**, persistant entre ouvertures dans la même app — PROBABLE [S24] ; plafond ITP 7 jours présumé — ? | ◐ magasin par app ; persistance à la discrétion de l'app hôte — ? | ✅ = profil Chrome — VÉRIFIÉ [S23] | ◐ magasin par app — ? |
| Service worker | ✅ présumé (moteur Safari) — ? | **❌ sauf domaines « app-bound » déclarés par l'app hôte** : réponse Apple (Frameworks Engineer, fév. 2025) : « il n'y a pas de moyen supporté d'activer explicitement les service workers dans WKWebView iOS avec les API actuelles » — VÉRIFIÉ [S25] ; BCD `webview_ios: false` — VÉRIFIÉ [S15] | ✅ = Chrome | ✅ dans BCD (miroir Chrome 40+) — VÉRIFIÉ [S15] ; désactivable par l'app — ? |
| Installation PWA | ❌ (pas d'« écran d'accueil » dans la feuille d'actions) — PROBABLE | ❌ | ◐ = Chrome (`beforeinstallprompt` possible) — PROBABLE | ❌ |
| View Transitions | ✅ = Safari 18+ — PROBABLE | ✅ miroir Safari 18+ — VÉRIFIÉ [S19] (BCD) | ✅ = Chrome | ✅ miroir Chrome 111+ — VÉRIFIÉ [S19] (BCD) |
| Détection UA | **indétectable** : UA identique à Safari — PROBABLE (aucune source Apple ne fournit de jeton) | UA **sans** `Version/x` ni `Safari/`, se termine par `Mobile/15E148` + jeton de l'app — PROBABLE [S26] [S27] | UA = Chrome (indétectable, et c'est sans importance) | jeton **`wv`** dans les parenthèses + `Version/4.0` ; UA réduit `(Linux; Android 10; K; wv)` ; le jeton `wv` « reste » pour la détection ; Client Hints depuis WebView 116 — VÉRIFIÉ [S28] ; `navigator.userAgentData` WebView 119+ — VÉRIFIÉ [S12] |

### 3.3 Les apps qui comptent, ramenées aux conteneurs

| App | iOS | Android | Jeton(s) UA | Ce qu'on en déduit pour le partage |
|---|---|---|---|---|
| **WhatsApp** | Les liens de conversation s'ouvrent dans le **navigateur par défaut** (analyse Krause, août 2022 — VÉRIFIÉ, source datée [S22]) ; l'in-app browser lancé en bêta iOS 25.14 (mai 2025) ne concerne que les liens de sites **professionnels** en HTTPS, avec « ouvrir dans le navigateur par défaut » — PROBABLE [S29] | même périmètre (liens pro seulement) — PROBABLE [S29] ; les liens de chat ouvrent le navigateur par défaut | `WhatsApp` (in-app pro seulement) — PROBABLE [S27] | **Le cas majoritaire (D0.4) atterrit dans Safari ou Chrome, avec toutes leurs capacités.** À confirmer le 9/9 sur les deux téléphones (§5.6). |
| **Instagram** | WKWebView maison, injection JS, option « ouvrir dans le navigateur » — VÉRIFIÉ, daté 2022 [S22] | WebView Android (`wv`) — PROBABLE [S26] | `Instagram <version>` ; exemple iOS : `… Mobile/15E148 Instagram 320.0.0.24.107` — PROBABLE [S30] | iOS : pas de SW, Web Share présumé ; Android : **pas de Web Share** → fallback §4 obligatoire |
| **Messenger** | WKWebView maison, injection JS — VÉRIFIÉ, daté 2022 [S22] | WebView Android — PROBABLE | `FBAN/MessengerForiOS` (iOS), `Orca-Android`, `FB_IAB` (Android) ; certaines builds iOS 26 sans jeton — PROBABLE [S27] [S30] | idem Instagram |
| **TikTok** | WebView maison, **sans option « ouvrir dans le navigateur »** en 2022 — VÉRIFIÉ, daté [S22] ; état 2026 — HYPOTHÈSE | WebView maison — PROBABLE | `BytedanceWebview`, `musical_ly`, `TikTok`, `Trill`, `aweme` — PROBABLE [S27] [S30] | pire cas : ni Web Share ni SW ni sortie facile → le fallback « copier le lien » et le PNG affichable en `<img>` doivent suffire |
| **Telegram** | SFSafariViewController — VÉRIFIÉ, daté 2022 [S22] ; nouveau « navigateur intégré » à onglets annoncé le 31/7/2024 sans précision de moteur — VÉRIFIÉ [S31] → conteneur actuel **HYPOTHÈSE** | navigateur intégré maison (WebView) par défaut, réglage « navigateur intégré » désactivable → navigateur externe — PROBABLE [S32] | `Telegram` (Android seulement) — PROBABLE [S27] | à mesurer ; l'URL `https://t.me/share/url?url=…&text=…` (« les deux valeurs encodées ») fonctionne partout — VÉRIFIÉ [S33] |

### 3.4 Stratégie de détection (règle d'implémentation)

1. **Détection de fonctionnalités d'abord** : `'share' in navigator`, `navigator.canShare?.({ files: [pngFile] })`, `'serviceWorker' in navigator`, `'startViewTransition' in document`, `matchMedia('(prefers-reduced-motion: reduce)')`. C'est ce qui décide de l'UI, jamais l'UA.
2. **L'UA sert uniquement** à afficher une aide contextuelle « Ouvre dans Safari / Chrome pour installer ou enregistrer l'image » : regex `/(Instagram|FBAN|FBAV|FB_IAB|Orca-Android|BytedanceWebview|musical_ly|TikTok|Telegram|WhatsApp)/i`, plus `; wv)` (WebView Android) et, sur iOS, absence de `Safari/` dans un UA `iPhone`. SFSafariViewController est traité comme Safari (indétectable, capacités équivalentes).
3. `navigator.userAgentData` (Chrome Android 90+, WebView 119+) en complément quand présent ; jamais requis.
4. Aucune détection ne bloque quoi que ce soit : au pire, un bouton change de libellé.

## 4. Règle « l'app est complète sans Web Share ni service worker » (S1, PLAN T4)

Cette règle est **éliminatoire** pour toute maquette et tout prototype : chaque écran doit pouvoir être joué de bout en bout (lire, comprendre, partager, riposter) dans le pire conteneur du §3 (WebView Android sans `navigator.share`, WKWebView sans SW, stockage effacé).

Partage en trois niveaux, tous maquettés :
1. **Niveau A** — `navigator.share({ files: [png], text, url })` si `canShare({ files })` : un geste, l'image et le lien partent ensemble (Safari iOS 14+, Chrome Android 76+, Samsung 11+).
2. **Niveau B** — `navigator.share({ text, url })` sans fichier (Firefox Android, et repli si A échoue avec `AbortError`/`TypeError`) ; l'aperçu OG de l'URL porte l'image (og:image < 300 Ko, T4).
3. **Niveau C** — sans Web Share : bouton « Copier le lien » (`navigator.clipboard.writeText` avec repli `<input readonly>` + sélection), image PNG affichée en `<img>` avec l'instruction « appui long pour enregistrer » (l'attribut `download` est peu fiable en in-app — PROBABLE), et liens directs `https://wa.me/?text=…` (PROBABLE [S34]) et `https://t.me/share/url?url=…&text=…` (VÉRIFIÉ [S33]), qui sont de simples liens et fonctionnent partout. Ces boutons existent **toujours**, même quand A est disponible (le militant qui veut coller le lien dans une boucle ne veut pas la feuille système).

Hors-ligne et persistance :
- Le service worker (v2, PLAN T7) n'est qu'une **accélération** : première visite entièrement fonctionnelle sans lui ; corpus, index, glossaire servis en statique avec `immutable` ; aucun écran « tu es hors-ligne » qui ne propose pas déjà la lecture locale.
- Toute progression locale (tortue, carnet) est **perdable sans dommage** : l'état des défis vit dans l'URL (D0.18, façon Wordle) ; localStorage n'est qu'un confort, et l'app annonce honnêtement « ta progression reste sur ce téléphone » (Safari peut l'effacer après 7 jours sans visite, §3.1).
- Aucune bannière d'installation : le bouton « Installer » n'apparaît que si `beforeinstallprompt` a été reçu ; sur Safari, une ligne dans « À propos » explique « Partager → Sur l'écran d'accueil » ; en in-app, rien.
- Le mode dégradé (0 neuron, D0.2) et le mode sans SW sont des **modes normaux, designés** (PLAN §4, principe 3) : aucun n'a l'air d'une panne.

## 5. Protocole de mesure J2-J3 (et J4 matin)

Toutes les sorties sont archivées dans `docs/discovery/perf/<date>/` (JSON Lighthouse, captures, `fps-*.json`), citées par chemin dans `05-direction-artistique.md`, `06-partage.md` et `09-architecture.md`.

### 5.1 Labo : Lighthouse CLI, throttling appliqué (devtools), CPU ×4 — VÉRIFIÉ (exécuté le 7/9/2026)

Outillage en place : Lighthouse **13.4.1** via `npx lighthouse@latest`, Chromium **153** de Playwright (`CHROME_PATH`), Node 20.20.1 (avertissement `EBADENGINE` de `@puppeteer/browsers`, sans effet). Émulation par défaut : « moto g power (2022) », UA `Chrome/153 Mobile`.

```sh
export CHROME_PATH=$HOME/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome
npx --yes lighthouse@latest "$URL" \
  --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=devtools \
  --throttling.cpuSlowdownMultiplier=4 --throttling.rttMs=150 --throttling.throughputKbps=1638.4 \
  --throttling.requestLatencyMs=562.5 --throttling.downloadThroughputKbps=1474.56 --throttling.uploadThroughputKbps=675 \
  --only-categories=performance,accessibility \
  --chrome-flags="--headless=new --no-sandbox" \
  --output=json --output-path="docs/discovery/perf/$(date +%F)/<nom>.$RUN.json"
```

Règles : `--throttling-method=devtools` (throttling **appliqué**, pas simulé : « interrompt réellement l'exécution CPU », VÉRIFIÉ [S2]) ; **5 runs**, on retient la **médiane** ; page servie comme en production (build + `python3 -m http.server` ou `wrangler dev`), jamais un serveur de dev avec HMR. Le skill `web-perf` (MCP `chrome-devtools`) est utilisé s'il est configuré pour la lecture des insights `LCPBreakdown` / `CLSCulprits` ; sinon les mêmes audits sont lus dans le JSON (`lcp-breakdown-insight`, `cumulative-layout-shift`, `network-requests`). Le MCP n'a pas été vérifié dans cette session — PROBABLE.

**Témoin mesuré aujourd'hui** (`design/typo/echantillon-fr.html`, servi en local, 1 run) — VÉRIFIÉ : perf 0,97, **LCP 2 445 ms**, FCP 1 579 ms, CLS 0,03, TBT 0 ; 6 requêtes dont la feuille Google Fonts (27 Ko, 777 ms) et 3 woff2 depuis `fonts.gstatic.com` ; Accessibilité 0,81 (échecs `document-title`, `landmark-one-main`). Lecture : un simple échantillon typographique avec polices tierces **rate déjà le seuil labo de 2,5 s** ; l'auto-hébergement et le préchargement (P8) ne sont pas optionnels.

### 5.2 Fluidité à CPU ×4 : sonde de frames (Playwright + CDP) — VÉRIFIÉ (exécutée le 7/9/2026)

Script `fps-probe.mjs` (à verser dans `scripts/perf/` à l'implémentation) : `Emulation.setCPUThrottlingRate({ rate: 4 })`, viewport 390 × 844 @2x tactile, échantillonnage `requestAnimationFrame` pendant 2 s pendant que l'animation se joue (déclenchée par le clic sur un sélecteur passé en argument ; sans argument, c'est l'animation d'entrée de la page qui est mesurée ; la version du scratchpad ajoute un stimulus `transform`/`opacité` de 320 ms pour le témoin). Sortie : `{ frames, fpsAvg, p50, p95, max, pctOver20, pctOver50 }`. Sur le témoin : 122 frames, p95 16,8 ms, 0 % > 20 ms, 0 % > 50 ms à ×4.

```js
// fps-probe.mjs — usage: node fps-probe.mjs <url> [cpuRate=4] [durationMs=2000] [selectorToClick]
import { chromium } from 'playwright';
const [,, url, rateArg = '4', durArg = '2000', selector] = process.argv;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const cdp = await page.context().newCDPSession(page);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(rateArg) });
await page.goto(url, { waitUntil: 'networkidle' });
const sampler = page.evaluate((duration) => new Promise((resolve) => {
  const deltas = []; let last = performance.now(); const start = last;
  const tick = (now) => { deltas.push(now - last); last = now; (now - start < duration) ? requestAnimationFrame(tick) : resolve(deltas); };
  requestAnimationFrame(tick);
}), Number(durArg));
if (selector) await page.click(selector).catch(() => {});
const deltas = await sampler; const sorted = [...deltas].sort((a, b) => a - b);
const pct = (t) => +(100 * deltas.filter((d) => d > t).length / deltas.length).toFixed(1);
console.log(JSON.stringify({ frames: deltas.length, p95: sorted[Math.floor(0.95 * sorted.length)], max: sorted.at(-1), pctOver20: pct(20), pctOver50: pct(50) }));
await browser.close();
```

Appliqué aux **3 micro-prototypes** de T3 (reveal de citation, transition concept → section, swipe) et à chaque mécanique T5 : seuil P6. Le Chromium headless n'a pas de GPU : un résultat conforme ici est nécessaire, pas suffisant → confirmation visuelle sur l'Android réel (enregistrement d'écran, §5.4).

### 5.3 Poids : JS initial et chemin critique

- Build de production, puis : `for f in dist/**/*.js; do printf '%s %s\n' "$(gzip -9c "$f" | wc -c)" "$f"; done | sort -n` ; les entrées chargées sur l'écran 0 sont additionnées → P2. Le même calcul sur HTML + CSS + polices préchargées + image LCP → P3.
- Contre-mesure Lighthouse : somme des `transferSize` par `resourceType` dans `network-requests` (le JSON §5.1). Les deux méthodes doivent concorder à ±10 %.
- À l'implémentation : ce calcul devient un test CI qui échoue au-dessus du budget (script Node de 15 lignes ; pas de dépendance nécessaire).

### 5.4 Terrain : Android milieu de gamme, 4G réelle (J3 soir / J4 matin, D0.33)

Appareil : l'Android des testeurs le plus proche d'un « moto g power (2022) » (référence d'émulation Lighthouse) ; noter modèle, Android, version de Chrome. Réseau : **Wi-Fi coupé, 4G/LTE forcé** (pas de 5G) dans les réglages, ≥ 3 barres, en ville ; consigner `navigator.connection.effectiveType` / `downlink` (Chrome Android 38+, VÉRIFIÉ [S12]). Cible : le prototype déployé sur `*.workers.dev` (T7), puis le domaine final (T4/T10).

Procédure Lighthouse sur appareil réel, telle que documentée par Lighthouse — VÉRIFIÉ [S35] :

```sh
adb kill-server && adb devices -l
adb forward tcp:9222 localabstract:chrome_devtools_remote
npx lighthouse@latest "$URL" --port=9222 --screenEmulation.disabled \
  --throttling.cpuSlowdownMultiplier=1 --throttling-method=provided \
  --only-categories=performance --output=json --output-path=docs/discovery/perf/$(date +%F)/real-android.$RUN.json
```

5 chargements à froid (« Effacer les données du site » entre deux), **médiane du LCP < 2 s** (P1), CLS < 0,1 ; INP mesuré sur les 5 interactions (§1.5) via la bibliothèque `web-vitals` (attribution) embarquée dans le build de dev uniquement — PROBABLE (outil), jamais en production (D0.22). Enregistrement d'écran 60 fps de chaque animation pour compter à l'œil les saccades (P6, preuve visuelle).

iPhone : pas de Mac dans la session (Web Inspector indisponible) → mesure par **enregistrement d'écran** du chargement depuis un lien WhatsApp (chronomètre image par image : ouverture du lien → premier texte → écran complet), 3 fois, en 4G ; c'est une approximation, étiquetée PROBABLE dans le dossier.

### 5.5 Accessibilité

Labo : catégorie Accessibilité Lighthouse (§5.1) ≥ 95 et `@axe-core/playwright` sans violation `serious`/`critical` (PROBABLE : disponibilité du paquet npm, à installer J2) ; capture à 320 px et à 200 % de zoom texte (Playwright `page.emulateMedia` + `deviceScaleFactor`, ou Chrome « zoom texte ») pour 1.4.10 / 1.4.4 ; capture avec `prefers-reduced-motion: reduce` et `prefers-color-scheme: dark` (`page.emulateMedia`) ; parcours clavier complet (Tab/Shift-Tab/Entrée/Échap/flèches) enregistré. Terrain : VoiceOver et TalkBack sur le parcours principal en T11 session 2 (§2.5).

### 5.6 Page `/diag` : remplir la matrice in-app sur 2 téléphones (T4, 9/9)

Une page statique du prototype, ouverte **depuis** WhatsApp, Instagram, Messenger, TikTok et Telegram sur l'Android et l'iPhone des testeurs, puis capturée d'écran (10 captures → `docs/discovery/06-partage.md`). Elle affiche, sans dépendance :

```html
<pre id="diag"></pre>
<script type="module">
  const png = new File([new Uint8Array([137,80,78,71])], 'card.png', { type: 'image/png' });
  const key = 'aec-diag-visits';
  let visits = 0; try { visits = Number(localStorage.getItem(key) || 0) + 1; localStorage.setItem(key, String(visits)); } catch {}
  const report = {
    userAgent: navigator.userAgent,
    userAgentData: navigator.userAgentData?.brands ?? null,
    share: 'share' in navigator,
    shareFiles: !!navigator.canShare?.({ files: [png] }),
    serviceWorker: 'serviceWorker' in navigator,
    viewTransitions: 'startViewTransition' in document,
    localStorageVisits: visits, // > 1 après fermeture/réouverture de l'app = persistant
    storagePersisted: await (navigator.storage?.persisted?.() ?? Promise.resolve(null)).catch(() => null),
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    darkMode: matchMedia('(prefers-color-scheme: dark)').matches,
    standalone: navigator.standalone ?? null,
    viewport: [innerWidth, innerHeight, devicePixelRatio],
  };
  document.getElementById('diag').textContent = JSON.stringify(report, null, 2);
</script>
```

Protocole : ouvrir le lien, capturer ; fermer complètement l'app hôte, rouvrir le lien, capturer (persistance) ; appuyer sur le bouton « Partager » de test (niveau A → B → C, §4) et noter ce qui s'ouvre ; noter si l'app propose « Ouvrir dans le navigateur ». Chaque cellule « ? » du §3 est alors remplacée par VÉRIFIÉ (téléphone, app, version, capture).

### 5.7 WebPageTest (optionnel)

Le plan Starter est gratuit avec 300 tests/mois — PROBABLE [S36] (page de tarifs inaccessible en fetch aujourd'hui : 404/403). À n'utiliser que si la création d'un compte gratuit ne coûte rien et n'ajoute aucun tiers à l'app : localisation Paris, profil « 4G », utile pour la cascade (waterfall) et la vidéo filmstrip, jamais comme source unique.

### 5.8 Mesures du 9/9 (prototype `proto.cestecritla.fr`) — VÉRIFIÉ

> **Date corrigée le 10/9/2026.** Ce titre disait « Mesures du 10/9 ». Les mesures ont été prises le **9 septembre 2026** : `docs/discovery/perf/2026-09-10/README.md` s'intitule « Audit de performance du prototype déployé — 9 septembre 2026 (archive « 2026-09-10 ») » et tous les `fetchTime` Lighthouse de ce dossier sont en `2026-09-09T14:3x`. Le nom du dossier d'archive (`2026-09-10`) est la date d'archivage, pas la date de mesure.

Cible : le prototype intégré déployé (Worker assets `aec-proto`, même build sur `aec-proto.baoleka.workers.dev`), direction A hybride (D3.9), 7 modules HTML + CSS + modules ES sans framework. Outillage : Lighthouse 13.4.1 CLI (le MCP `chrome-devtools` n'est pas configuré, H-TOOL-1 : repli §5.1), Chromium 153 Playwright, Node 24.14.0, `--throttling-method=devtools`, Slow 4G (150 ms, 1,6 Mbit/s) + CPU ×4, émulation « moto g power (2022) », **3 runs par page, médianes** (le protocole en demande 5 : mesure d'orientation, pas de recette). Archive : `docs/discovery/perf/2026-09-10/` (12 JSON Lighthouse, `proto-lighthouse.summary.json`, `proto-motion-fps.jsonl`, `proto-vt-probe.json`, `proto-interactions-cpu4.json`, `proto-sweep.json`, `README.md`). Ces mesures ne modifient pas le budget ; elles le confrontent au premier prototype servi comme en production.

**Lighthouse (médianes de 3, Slow 4G + CPU ×4)**

| Page | Perf | A11y | FCP | LCP | TBT | CLS | mpFID | SI | Élément LCP | JS fil (br) | JS gzip -9 | Total fil | Req. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `/link/?id=c12-s01-k01` | 0,83 | 1,00 | 1 575 ms | **3 060 ms** | 0 ms | **0,216** | 22 ms | 2 160 | `#hero > blockquote.verbatim > p` (rendu par script, render delay 2 996 ms) | 14,3 Ko | 12,0 Ko | 197 Ko | 13 |
| `/concept/` (règle verte) | 0,74 | 1,00 | 1 582 ms | **4 635 ms** | 6 ms | **0,180** | 56 ms | 3 055 | `#content > blockquote.verbatim > p` (rendu par script, render delay 4 556 ms) | 22,0 Ko | 18,6 Ko | 255 Ko | 18 |
| `/defi/?n=1` (→ `?n=254`) | 0,87 | 1,00 | 1 581 ms | 1 581 ms* | 0 ms | **0,246** | 22 ms | 2 269 | `footer.footer > p` (HTML initial) ; contenu utile après `slim.json`, fin à 3 225 ms | 29,8 Ko | 25,1 Ko | 218 Ko | 18 |
| `/riposte/?id=rip-01` | 0,96 | 1,00 | 1 607 ms | 1 607 ms* | 0 ms | **0,110** | 21 ms | 1 938 | `footer.footer > p` (HTML initial) ; contenu utile à 3 400 ms | 24,7 Ko | 21,2 Ko | 229 Ko | 19 |

\* LCP = pied de page : la règle §6.14 (élément LCP rendu côté client, corpus sur le chemin critique) s'applique aux quatre pages. Chaîne de dépendances : HTML → `tokens.css` + `base.css` (+ `motion.css`, `<module>.css`, `motion.js`, `<module>.js`, polices préchargées) → `shared/ui.js` → `strings.json` + `slim.json` (70 Ko) + `extras.json` → [concept : `glossary.json` 39 Ko → `stat-cards*.json`] → rendu : 4 sauts sur `/link/`, 6 sur `/concept/`, ≈ 0,6-0,7 s chacun en Slow 4G. CLS : contenu injecté qui pousse `h1#title` (`/link/`, 0,214) ou `footer.footer` (0,110-0,245) ; part des polices ≤ 0,002 par page.

**Polices** : 4 fichiers latin woff2 auto-hébergés, 99 744 o livrés (Public Sans droite 29 180, italique 31 116, Gowun Batang 400 19 652, 700 19 796) ; 82,2 Ko chargés par page (99,7 sur `/section/`) ; italique variable découverte par le CSS à 1,57 s, préchargée sur `/riposte/` seulement ; 0 requête `fonts.googleapis.com` / `fonts.gstatic.com`.

**Fluidité à CPU ×4** (`fps-probe.mjs`, `vt-probe.mjs`, 3 runs, site déployé)

| Mouvement | Frames | p95 | max (médiane / pire run) | > 20 ms | > 50 ms |
|---|---|---|---|---|---|
| Entrée `/concept/` (reveal du héros) | 33 | 16,8 ms | 50,0 / 50,0 ms (frame de rendu, pas l'animation) | 2,8 % | 0 |
| Reveal au défilement (2 « Mesures liées ») | 50 | 16,8 ms | 16,8 / 16,8 ms | 0 % | 0 |
| `/defi/` réponse « Je savais » (press + carte suivante) | 90 | 16,8 ms | 33,4 / 50,0 ms | 2,2 % | 0 |
| `/defi/` « Passer » | 90 | 16,8 ms | 33,4 / 50,0 ms | 2,2 % | 0 |
| Concept → section, arrivée | 18 (fondu) | 16,8 ms | 16,8 ms ; 1 frame de rendu de 83 ms avant (`section.js`, relève de P5) | 0 % | 0 |

View Transition cross-document : jamais engagée sur le déployé (0/9 + 0/8 navigations de contrôle, « ViewTransition opt-in disabled » à `pagereveal` alors que `pageswap` la démarre) ; reproduit en local de façon non déterministe, indépendant des en-têtes → course de Chromium 153 headless ; comme `motion.js` n'arme le fondu d'arrivée qu'avec `ev.viewTransition`, la transition concept → section est **instantanée** dans ce labo ; Chrome Android réel = HYPOTHÈSE (T7).

**Interactions clés à CPU ×4** (event timing, `proto-interactions-cpu4.json`) : recherche 32 ms (tap sur le champ ; frappe < 16 ms), « Copier le lien » < 16 ms, réponse `/defi/` 32 ms, option `/q/` 48 ms, « Retourner la carte » 64 ms ; navigation tap → première frame de `/concept/` 182 ms (162-216). **Motion** : durée calculée max 240 ms (`/concept/`), 120 ms ailleurs ; 0 élément > 320 ms ; en `prefers-reduced-motion: reduce` : 0 ms, `reveal` à opacité 1 sans transform. **Balayage de 22 URL** : 0 requête tierce, 0 requête échouée, 0 erreur console, 0 `<canvas>` dans le DOM, 1 ombre par page, `scrollWidth` 390 (1 200 sur `/q/card`, image OG), pas de `<h1>` sur `/riposte/?id=…` et `?flash=1`.

**Verdict sur la carte du budget (§0)**

| Règle | Seuil | Mesuré | Verdict |
|---|---|---|---|
| P1 LCP labo | < 2,5 s | 3,06 s (`/link/`), 4,63 s (`/concept/`) ; 1,58 / 1,61 s (`/defi/`, `/riposte/`) mais élément = pied de page, contenu ≈ 3,3 s | **FAIL** (éliminatoire) |
| P2 JS initial | < 100 Ko gzip | 12,0 / 18,6 / 25,1 / 21,2 Ko gzip -9 (14,3 / 22,0 / 29,8 / 24,7 Ko sur le fil) ; aucun chunk différé ; écart fil / gzip 16-19 % (en-têtes par requête), au-delà des ±10 % de §5.3 mais loin du seuil | PASS |
| P3 chemin critique | ≤ 150 Ko (alerte) | 88-91 Ko gzip (HTML + CSS + 3 polices) ; le corpus (70 Ko) est de fait sur le chemin du LCP → 181-232 Ko | PASS formel / **alerte §6.14** |
| P4 CLS | < 0,1 (polices ≤ 0,02) | 0,216 / 0,180 / 0,246 / 0,110 ; polices ≤ 0,002 | **FAIL** (éliminatoire) ; sous-règle polices PASS |
| P5 INP | < 200 ms à CPU ×4 | 0-64 ms sur les 5 interactions ; mpFID 21-56 ms | PASS |
| P6 fluidité | 0 frame > 50 ms, ≤ 5 % > 20 ms | 0 frame > 50 ms (4 runs / 12 à exactement 50,0 ms), 0-2,8 % > 20 ms | PASS (borderline, Chromium sans GPU : à confirmer §5.4) |
| P7 motion | ≤ 320 ms, reduced-motion | max 240 ms ; 0 ms en reduce | PASS |
| P8 polices | auto-hébergées, latin, woff2, ≤ 75 Ko | auto-hébergées, latin, woff2, 0 tiers ; **99,7 Ko** livrés, 82,2 Ko par page (italique variable entière 31,1 Ko au lieu d'un sous-ensemble 900 ≤ 15 Ko, H-PERF-3) | **FAIL** (éliminatoire) |
| P9 rendu | 0 WebGL / canvas plein écran / tiers | 0 `<canvas>` dans le DOM (canvas hors écran de `defi/card.js` pour le PNG), 0 script tiers, 0 requête externe sur 22 URL | PASS |
| A1 WCAG 2.2 AA | cibles, glissement, focus, contraste, reflow, zoom | Lighthouse 100 × 4 ; reflow 390 OK ; **2.5.3 non tenu** sur 6 `a.ref` de `/concept/` ; pas de `<h1>` sur 3 URL riposte ; session 2 : cibles de 26-34 px et débordement 404-464 px à 130-150 % de police (`13-tests-humains.md` §3.11) | **FAIL partiel** |
| A2 taille système | `rem`, pas de `user-scalable=no` | viewport `width=device-width, initial-scale=1`, aucun `font-size` en px | PASS (mais barre de navigation qui déborde à 130 %, session 2 M4) |
| A3 dark mode | `prefers-color-scheme`, contraste Charbon | fond rgb(33,35,32), ombre Violet 200, vérifié sur 13 pages (`live-report.json`) | PASS |
| S1 robustesse | complet sans Web Share ni SW | pas de SW ; `wa.me` + « Copier le lien » observés 7/7 en session 2 ; **rechargement hors ligne = page blanche** (M4), `error.generic` brut si `slim.json` échoue (N3) | PASS formel / alertes dégradé |
| Lighthouse Accessibilité ≥ 95 | | 100 / 100 / 100 / 100 | PASS |
| Perf Lighthouse ≥ 90 (alerte) | | 0,83 / 0,74 / 0,87 / 0,96 | alerte sur 3 pages |

**Lecture.** Les trois échecs éliminatoires (P1, P4, P8) tiennent à l'architecture du prototype (rendu côté client, corpus entier avant le premier texte utile, italique non sous-ensemblée), pas à la direction A : les maquettes A, B, C statiques chargeaient les mêmes 3 polices et 0 JS, et A est la direction la plus légère (12-25 Ko de JS, un bloc 3D par écran). **À faire en T7, par impact** : (1) pré-rendu du texte de l'écran 0 (verbatim + titre + CTA dans le HTML), corpus découpé par section / carte et chargé après `load` ; en attendant, `min-height` sur `#hero`, `[data-motion="content"]`, `#app` pour repasser CLS < 0,1 ; (2) `<link rel="modulepreload">` sur `shared/ui.js` et `preload as="fetch"` des JSON de la page (≈ 0,6 s gagnée par saut en Slow 4G) ; inline de `tokens.css` + `base.css` (7 Ko gzip, FCP 1,58 → ≈ 0,9 s) sous réserve d'un hash CSP `style-src` ; (3) sous-ensemble Public Sans italique 900 ≤ 15 Ko et préchargement de l'italique ; (4) `aria-label` des appuis contenant le texte visible, `<h1>` sur les flashcards ; (5) fondu d'arrivée armé sans `ev.viewTransition`, `vt-probe.mjs` rejoué sur Android réel.

## 6. Ce qui fait échouer le budget (éliminatoire)

Une maquette, un prototype ou une version qui présente **un seul** des points suivants est renvoyé en correction avant tout jugement de panel, test humain ou déploiement :

1. LCP labo (§5.1, médiane de 5) ≥ 2,5 s, ou LCP terrain (§5.4, médiane de 5) ≥ 2,0 s.
2. JS initial ≥ 100 Ko gzip, ou un chunk différé ≥ 50 Ko gzip.
3. CLS ≥ 0,1 en labo ou sur le terrain.
4. INP ≥ 200 ms à CPU ×4 sur l'une des 5 interactions clés.
5. Une frame > 50 ms, ou > 5 % de frames > 20 ms, pendant une animation dirigée à CPU ×4 ; une animation > 320 ms ; une propriété animée autre que `transform`/`opacity`.
6. Un mouvement quelconque (hors fondu ≤ 120 ms) avec `prefers-reduced-motion: reduce` actif ; une animation en boucle non pausable.
7. Une requête vers un domaine tiers (polices, script, image, analytics) ; un sous-ensemble de police non latin ; polices > 75 Ko au total.
8. WebGL, Three.js, canvas plein écran, ou toute entrée de la ban list de `design/tokens.json`.
9. Une paire texte courant < 4,5:1, une paire non textuelle (focus, bordure, icône) < 3:1, ou un focus invisible/masqué.
10. Une cible < 24 × 24 px CSS hors exceptions 2.5.8 ; une fonction accessible seulement par swipe, glissement ou survol ; un piège de focus.
11. Un défilement horizontal à 320 px CSS ou au zoom texte 200 % ; `user-scalable=no` ; `maximum-scale` < 5 ; texte courant en `px`.
12. Absence de thème sombre, ou thème sombre avec une paire texte < 4,5:1 sur Charbon (D0.23, D3.4).
13. Un parcours (lire, comprendre, partager, riposter) impossible sans `navigator.share`, sans service worker, ou après effacement du stockage ; une bannière d'installation ou de « meilleure expérience dans l'app ».
14. Un élément LCP rendu côté client (texte absent du HTML initial) ; le corpus JSON sur le chemin critique.
15. Lighthouse Accessibilité < 95 ou une violation axe `serious`/`critical` (labo).

Ce qui n'est **pas** éliminatoire mais consigné en alerte : chemin critique > 150 Ko (P3), score Performance Lighthouse < 90, TTFB > 800 ms sur le terrain (à imputer à la plateforme, T7), et toute cellule « ? » de la matrice §3 restée non mesurée après T4 (elle devient une HYPOTHÈSE nommée dans `16-hypotheses.md` et dans le prompt final).

## 7. Registre des hypothèses ouvertes par ce budget

| ID | Hypothèse | Levée par | Quand |
|---|---|---|---|
| H-PERF-1 | Un framework de la short-list T7 tient P2 (< 100 Ko gzip) avec recherche locale + kit de partage | micro-prototype mesuré §5.3 ; le prototype sans framework tient à 12-25 Ko gzip avec recherche locale et partage (§5.8) : marge de 75 Ko pour Astro (D7.2) | J3-J4 |
| H-PERF-2 | LCP terrain < 2 s en 4G réelle depuis un lien WhatsApp | §5.4 | J3 soir / J4 matin |
| H-PERF-3 | Le sous-ensemble italique 900 de Public Sans tient en ≤ 15 Ko | `pyftsubset` au build ; **toujours ouverte** : le prototype livre l'italique variable entière (31,1 Ko), P8 FAIL §5.8 | J2 → T7 |
| H-A11Y-1 | `font: -apple-system-body` + `font-family` custom hérite du Dynamic Type iOS sans casser la mise en page | iPhone, T4 | 9/9 |
| H-A11Y-2 | Parcours principal traversable en VoiceOver/TalkBack sans blocage | T11 session 2 | 11/9 |
| H-INAPP-1 | Liens WhatsApp de conversation → navigateur par défaut sur les deux OS (état 2026) | `/diag` §5.6 | 9/9 |
| H-INAPP-2 | Instagram/Messenger Android : `navigator.share` absent ; iOS : présent mais fichiers ? | `/diag` | 9/9 |
| H-INAPP-3 | TikTok 2026 : existence d'une sortie « ouvrir dans le navigateur » | manipulation | 9/9 |
| H-INAPP-4 | Telegram iOS 2026 : SFSafariViewController ou WKWebView maison | `/diag` (présence de `Safari/` dans l'UA, SW) | 9/9 |
| H-INAPP-5 | Persistance de `localStorage` entre deux ouvertures dans chaque in-app | `/diag` (compteur de visites) | 9/9 |
| H-TOOL-1 | MCP `chrome-devtools` (skill `web-perf`) configurable dans la session | tentative J2 ; repli CLI §5.1 déjà vérifié ; **non configuré le 9/9, repli CLI utilisé pour §5.8** | J2 |
| H-TOOL-2 | `@axe-core/playwright` installable et exécutable sur le Chromium Playwright | `npm i` J2 | J2 |

## 8. Sources (toutes lues le 7 septembre 2026)

- [S1] web.dev, « Web Vitals » : seuils LCP 2,5 s / INP 200 ms / CLS 0,1, 75e percentile — https://web.dev/articles/vitals
- [S2] Lighthouse, `docs/throttling.md` : 150 ms, 1,6 Mbit/s / 750 kbit/s, CPU ×4, « bottom 25 % of 4G », simulé vs devtools — https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/docs/throttling.md
- [S3] mdn/browser-compat-data `css/at-rules/media.json` : `prefers-reduced-motion` (Safari 10.1, Firefox Android 64), `prefers-color-scheme` (Safari iOS 13, Samsung 14.2) — https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/at-rules/media.json
- [S4] Google Fonts CSS API v2 (UA Chrome Android) : `https://fonts.googleapis.com/css2?family=Public+Sans:ital,wght@0,100..900;1,100..900` et `…family=Gowun+Batang:wght@400;700`, tailles des woff2 latin mesurées par `curl` (26 636 / 28 356 / 16 236 / 16 208 octets)
- [S5] W3C, Understanding SC 2.5.8 Target Size (Minimum) — https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- [S6] W3C, Understanding SC 2.5.7 Dragging Movements — https://www.w3.org/WAI/WCAG22/Understanding/dragging-movements.html
- [S7] blink-dev, « PSA: Browser text zoom on Android will now work like it does on desktop » (M113, 2/8/2023, ~40 % d'utilisateurs avec taille non standard) — https://groups.google.com/a/chromium.org/g/blink-dev/c/rTNCw0lHmZk
- [S8] WebKit, « Using the System Font in Web Content » (`-apple-system-body` et sœurs) — https://webkit.org/blog/3709/using-the-system-font-in-web-content/
- [S9] PROBABLE : gist « Support Apple's dynamic text sizing in web content » — https://gist.github.com/colingourlay/d95908ec5cd4854c7a5afa06f3989479
- [S10] mdn/browser-compat-data `browsers/*.json` : versions courantes Safari iOS 26.6, Chrome Android 152, WebView 152, Samsung 30.0, Firefox Android 155 — https://raw.githubusercontent.com/mdn/browser-compat-data/main/browsers/safari_ios.json (et chrome_android, webview_android, samsunginternet_android, firefox_android)
- [S11] caniuse, Web Share API (Safari iOS 12.2+, Samsung 8.2+, Chrome Android 152 ✅, Firefox Android 155 ✅, 92,77 % global) — https://caniuse.com/web-share
- [S12] mdn/browser-compat-data `api/Navigator.json` : `share` (Chrome Android 61, Firefox Android 79, Safari 12.1, `webview_android: false` crbug 40540400), `share.data_files_parameter` (Chrome Android 76, Safari 14, Samsung 11.0, Firefox false, WebView false), `canShare` (Chrome Android 75, Firefox Android 96), `userAgentData` (Chrome 90, WebView 119, Safari/Firefox false) ; `api/NetworkInformation.json` (Chrome Android 38) — https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Navigator.json
- [S13] WebKit, « Full Third-Party Cookie Blocking and More » (24/3/2020) : plafond de 7 jours sur tout le stockage script, exemption des web apps sur l'écran d'accueil — https://webkit.org/blog/10218/full-third-party-cookie-blocking-and-more/
- [S14] mdn/browser-compat-data `api/Window.json` : `localStorage` (Safari 4, miroir partout) — https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Window.json
- [S15] caniuse Service Workers (Safari iOS 11.3+, Firefox 44+, Chrome partiel 40-44 puis complet 45+ ; BCD : Chrome 40) — https://caniuse.com/serviceworkers ; mdn/browser-compat-data `api/ServiceWorker.json` (`webview_ios: false`) — https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/ServiceWorker.json
- [S16] mdn/browser-compat-data `api/BeforeInstallPromptEvent.json` (Chrome 44, Samsung 5.0, Firefox/Safari false) — https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/BeforeInstallPromptEvent.json
- [S17] MDN, « Installing and uninstalling web apps » (iOS : « Add to home screen », depuis 16.4 depuis tout navigateur compatible) — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Installing
- [S18] PROBABLE : Mozilla Hacks 2017, « Add Progressive Web Apps to your Home screen in Firefox for Android » (Firefox 58) — https://hacks.mozilla.org/2017/10/progressive-web-apps-firefox-android/
- [S19] caniuse View Transitions (Safari 18, Chrome 111, Samsung 23, Firefox 144 / Firefox Android 155) — https://caniuse.com/view-transitions ; mdn/browser-compat-data `api/Document.json` `startViewTransition` (miroirs WebView iOS/Android) — https://raw.githubusercontent.com/mdn/browser-compat-data/main/api/Document.json
- [S20] Samsung Developers, « User Agent String Format » (`SamsungBrowser/24.0`, plateforme unifiée `Android 10; K`) — https://developer.samsung.com/internet/user-agent-string-format.html
- [S21] Apple Developer Documentation, SFSafariViewController (JSON de la page) — https://developer.apple.com/documentation/safariservices/sfsafariviewcontroller
- [S22] Felix Krause, « Announcing InAppBrowser.com » (18/8/2022) : WhatsApp = navigateur par défaut, Telegram = SFSafariViewController, TikTok/Instagram/Facebook/Messenger = WKWebView avec injection — https://krausefx.com/blog/announcing-inappbrowsercom-see-what-javascript-commands-get-executed-in-an-in-app-browser
- [S23] Chrome for Developers, « Custom Tabs » (jar de cookies partagé ; limites des WebViews) — https://developer.chrome.com/docs/android/custom-tabs
- [S24] PROBABLE : Branch, « iOS 11 Safari View Controller » et Okta, « History of Mobile SSO » (isolation des données par app depuis iOS 11) — https://www.branch.io/resources/blog/ios-11-safari-view-controller-cookie-passthrough-and-the-future-of-mobile-web/ , https://developer.okta.com/blog/2022/01/13/mobile-sso
- [S25] Apple Developer Forums, thread 773539, réponse d'un Apple Frameworks Engineer (fév. 2025) sur les service workers dans WKWebView — https://developer.apple.com/forums/thread/773539
- [S26] PROBABLE : mobiForge, « Webviews and User-Agent strings » (2015 : WebView iOS sans `Version/`, WebView Android `Version/4.0`) — https://mobiforge.com/research-analysis/webviews-and-user-agent-strings
- [S27] PROBABLE : Corbado, « Passkeys in In-App Browsers » (22/6/2026, jetons UA par app) — https://www.corbado.com/blog/passkeys-in-app-browsers
- [S28] Android Developers Blog, « User-Agent Reduction on Android WebView » (déc. 2024 : UA réduit avec `wv`, Client Hints depuis WebView 116, `setUserAgentString` inchangé) — https://android-developers.googleblog.com/2024/12/user-agent-reduction-on-android-webview.html
- [S29] PROBABLE : WABetaInfo, semaine du 11-17/5/2025 (in-app browser iOS bêta 25.14.10.72, liens professionnels HTTPS seulement) — https://wabetainfo.com/whatsapp-news-of-the-week-feature-to-privately-summarize-messages-is-under-development/
- [S30] PROBABLE : GoToApp, « How to detect an in-app browser from the user agent » (exemples d'UA Instagram/Facebook iOS) — https://gotoapp.store/blog/detect-in-app-browser
- [S31] Telegram, « Telegram Browser, Mini App Store… » (31/7/2024) — https://telegram.org/blog/w3-browser-mini-app-store
- [S32] PROBABLE : recherche web du 7/9/2026 (réglage « navigateur intégré » de Telegram Android, moteur WebView) ; à mesurer
- [S33] Telegram Core, « Share button » (`https://t.me/share/url?url={url}&text={text}`, valeurs encodées) — https://core.telegram.org/widgets/share
- [S34] PROBABLE : FAQ WhatsApp « Click to chat » (`https://wa.me/?text=…`), page rendue en JS, non lisible en fetch aujourd'hui — https://faq.whatsapp.com/5913398998672934
- [S35] Lighthouse, `docs/readme.md` § « Testing on a mobile device » (`adb forward tcp:9222 localabstract:chrome_devtools_remote`, `--port=9222 --screenEmulation.disabled --throttling.cpuSlowdownMultiplier=1 --throttling-method=provided`) — https://raw.githubusercontent.com/GoogleChrome/lighthouse/main/docs/readme.md
- [S36] PROBABLE : TrustRadius, « WebPageTest Pricing 2026 » (Starter gratuit, 300 tests/mois) — https://www.trustradius.com/products/catchpoint-webpagetest/pricing
- Mesures locales du 7/9/2026 : Lighthouse 13.4.1 sur `design/typo/echantillon-fr.html` (JSON dans le scratchpad de session, à rejouer en J2 avec la commande §5.1) ; `fps-probe.mjs` (§5.2).
