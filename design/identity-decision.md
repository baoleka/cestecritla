# Identité 2027 vérifiée et décision « quelle charte » (T3, partie 1)

> Toutes les lignes marquées VÉRIFIÉ ont été lues le **7 septembre 2026** dans un navigateur réel (Chromium headless via Playwright : `getComputedStyle`, `document.fonts`, captures PNG) ou dans les fichiers sources téléchargés. Captures : `docs/discovery/captures/2026-09-07/identite/` (les fichiers tiers — logos, affiches, illustrations — sont dans `assets-tiers/`, **non versionnés**, analyse seulement).

## 1. Les trois identités observées

| Poste | Charte LFI (lafranceinsoumise.fr/charte-graphique) | Site de campagne melenchon2027.fr | aec2027.fr (page d'attente officielle) |
|---|---|---|---|
| Couleurs principales | « Couleurs 2027 » affichées en clair : **Violet #4C0297, Rouge #D1271C, Crème #FFFCF4, Charbon #212320** — VÉRIFIÉ (`charte-lfi.desktop.png`) | Exactement les mêmes : fond `body` **#FFFCF4**, Charbon 429 occurrences, Violet 140, Rouge 10 dans les styles calculés — VÉRIFIÉ (`melenchon2027-home.mobile.audit.json`) | `theme-color #8B24D9`, hors charte — VÉRIFIÉ |
| Palette secondaire | 6 vives (#7b13d6, #f91616, #3885f4, #ed5fb1, #f9c900, #2e9959) **dans deux accordéons repliés** « Codes HEX (web) » / « Codes CMJN (impression) » — VÉRIFIÉ (`charte-lfi.palettes.png`) | **Aucune des 6 vives** dans les styles calculés ; en revanche jaune #F5C800/#FFD301 (4), gris #707070 (paragraphes, 42), beige #E6DFC9 — VÉRIFIÉ | — |
| Teintes de surface | non documentées | LOGO-M27.svg : **#E5CBFF (57 fills), #FDEDFF (27), #FFD2CF (12)** + Violet (12) + Rouge (4) — VÉRIFIÉ ; le titre du livre porte une ombre pleine lavande | — |
| Titres | Config Variable Condensed Black / Black ; **alternative gratuite explicitement autorisée : Public Sans Black** — VÉRIFIÉ | **Union Gothic** (`@font-face` servie depuis /wp-content/uploads/2026/04/, commerciale) en capitales, italique incliné, blocs 3D — VÉRIFIÉ (`document.fonts`) | Montserrat — VÉRIFIÉ (ban list) |
| Corps | Config Variable ; **alternative gratuite : Gowun Batang Regular / Bold** — VÉRIFIÉ | **Stack Sans** 300/400/700 (commerciale) — VÉRIFIÉ | Montserrat |
| Logos | Logos-LFI.zip = 4 PNG (violet, blanc, vertical, vertical blanc), Φ + « LA FRANCE INSOUMISE » ; restriction « ne jamais engager le mouvement » — VÉRIFIÉ | LOGO-M27.svg (wordmark MELENCHON 2027.fr isométrique), LogoTortue.svg (3 fills exacts #4C0297/#FFFCF4/#D1271C + PNG 1920² embarqué, 2 Mo) — VÉRIFIÉ | Illustration Hello Melro |
| Mascotte | absente de la charte | **Tortue isométrique 3D lavande** (TORTUE-QUI-POUSSE.png 100², TORTUE-CHARIOT.png 1920², tortue sur la jauge de soutiens), carapace violet foncé quadrillée, ventre crème, yeux points — VÉRIFIÉ (`assets-tiers/tortues-contact-sheet.png` (non versionné)) | tortues « sagaces », style illustré |
| Motifs | aucun | **Bloc 3D extrudé** (texte blanc dans des parallélépipèdes filaires), titres inclinés, wordmark « MELENCHON » blanc + « 2027 » rouge, signature manuscrite JLM — VÉRIFIÉ (affiches) | — |
| Affiches T27 | — | 5 affiches : **photo documentaire en haut (JLM au milieu de gens), aplat d'une couleur en bas**, slogan 2 lignes + « ! », logo LFI blanc. Couleurs dominantes mesurées : bleu ≈ #286EA6 (Paix), violet-indigo ≈ #392E71 (Égalité), rouge ≈ #BC352F (Blocage), bleu nuit ≈ #324780 (6e Rép.), vert ≈ #2A6349 (Planif. éco) — PROBABLE (quantification JPEG) ; ce sont des variantes imprimées assombries des 6 vives | — |
| Licence polices | Public Sans et Gowun Batang : SIL OFL, auto-hébergeables ; sous-ensembles latin mesurés **14,6 Ko / 16,2 Ko** — VÉRIFIÉ | Union Gothic / Stack Sans : commerciales, **jamais rehébergées** | Montserrat OFL mais ban list |

**Pixel art** : l'annexe de reconnaissance mentionnait une tortue en pixel art sur les affiches ; **non observé** sur les 5 affiches téléchargées (la seule tortue « pixelisée » est le PNG 100×100 de la jauge, agrandi). → HYPOTHÈSE retirée.

## 2. Ce que les captures tranchent d'elles-mêmes

1. **Les couleurs ne sont pas un choix** : la charte LFI et le site M27 utilisent les **mêmes 4 couleurs 2027**, et la tortue officielle n'en utilise pas d'autres. Tokens racine = Violet / Rouge / Crème / Charbon, quelle que soit la charte suivie.
2. **Les 6 vives sont secondaires** : repliées dans la charte, absentes du site de campagne, présentes seulement en aplats assombris sur les affiches. Rôle : aplats, grands titres, code couleur des 4 parties. Jamais du texte courant sur Crème (5/6 échouent AA, voir `contrast-matrix.md`).
3. **Le choix réel porte sur la typographie et les motifs** : (a) Public Sans + Gowun Batang (charte, libres) contre (b) Union Gothic + Stack Sans (campagne, non rehébergeables). (b) est exclu par la licence : il n'existe pas de voie gratuite et légale. Reste à décider si l'app **emprunte les motifs** de la campagne (bloc 3D, teintes lavande/corail, esprit tortue) en les réinterprétant avec les polices libres.
4. **Échantillon typographique FR rendu** (`design/typo/echantillon-fr-390.png`, chapeau réel du ch. 12 s1 sur Crème, 390 px) — VÉRIFIÉ :
   - Gowun Batang 17 px / 1,55 : lisible, ton « livre », graisse fine qui grise légèrement sur Crème ; 18 px / 1,6 nettement plus confortable ;
   - Public Sans 16 px / 1,55 : robuste, neutre, très lisible ;
   - **Hybride** : voix de l'app en Public Sans, **verbatim du programme en Gowun Batang 17-18 px** avec filet Violet et fond #FDEDFF : le verbatim se distingue immédiatement du liant, ce qui sert le contrat « texte officiel vs texte de l'app » ;
   - Gowun Batang n'a **pas d'italique** (synthétisé par le navigateur) : règle « jamais d'italique en Gowun Batang ».
5. **Contraste** (`design/contrast-matrix.md`, 105 paires) : Charbon/Crème 15,45 ; Violet/Crème 11,62 ; Rouge/Crème 5,10 (AA juste) ; Crème/Violet 11,62 ; Crème/Rouge 5,10 ; sur Charbon (dark), le violet de marque est illisible (1,33) → **Violet 200 #E5CBFF** (10,80) devient l'accent sombre ; seules 2 vives passent AA sur Charbon (jaune 10,09, rose 5,18), bleu et vert seulement AA-large.

## 3. Options soumises à l'utilisateur (D0.10 : « je tranche en T3 sur captures »)

| Option | Ce qu'on suit | Ce qu'on emprunte | Risque |
|---|---|---|---|
| **A. Charte LFI stricte** | Couleurs 2027, Public Sans (titres), Gowun Batang (corps), logo LFI selon la charte | rien | Rendu « institutionnel », moins « campagne 2027 » ; le corps 100 % Gowun Batang fatigue sur mobile |
| **B. Charte LFI + emprunts M27 (recommandé)** | Couleurs 2027, Public Sans (voix de l'app, titres en capitales 900), Gowun Batang réservée au verbatim | teintes #FDEDFF / #E5CBFF / #FFD2CF comme surfaces ; **motif bloc 3D** réinterprété en CSS (ombre pleine lavande, aucun WebGL) ; titres inclinés ponctuels ; esprit tortue (mascotte originale 2D, non isométrique) | Aucun risque de licence ; risque de « pastiche » si le bloc 3D est partout → règle : un seul bloc 3D par écran |
| **C. Identité de campagne M27** | Union Gothic / Stack Sans | tout | **Exclu** : polices non rehébergeables, contrefaçon typographique |

## 4. Décision (utilisateur, 7 septembre 2026, sur captures)

| ID | Décision | Preuve |
|---|---|---|
| D3.1 | **Option B : charte LFI + emprunts M27.** On suit : Couleurs 2027 (Violet #4C0297, Rouge #D1271C, Crème #FFFCF4, Charbon #212320), Public Sans (voix de l'app, titres en capitales graisse 900), Gowun Batang (verbatim). On emprunte : teintes #FDEDFF / #E5CBFF / #FFD2CF (LOGO-M27.svg) comme surfaces, motif **bloc 3D extrudé réinterprété en CSS** (ombre pleine lavande, un seul bloc par écran, aucun WebGL), titres inclinés ponctuels, esprit tortue (mascotte originale 2D, jamais isométrique lavande). On exclut : Union Gothic, Stack Sans, Montserrat, #8B24D9, LogoTortue.svg, LOGO-M27.svg. | Réponse utilisateur + captures §1 |
| D3.2 | **Typographie hybride C** : Public Sans 16 px / 1,55 pour la voix de l'app ; **Gowun Batang 17-18 px / 1,55-1,6 réservée au verbatim du programme** (filet Violet 4 px, fond #FDEDFF, étiquette « Texte du programme »). Jamais d'italique en Gowun Batang (pas de fonte italique). Sous-ensembles latin auto-hébergés (< 20 Ko chacun). | `design/typo/echantillon-fr-390.png` |
| D3.3 | **Aucun logo LFI ni M27 dans l'app** (ni pied de page, ni cartes) : wordmark propre + attribution CC en texte « La France insoumise – L'Avenir en commun ». | Réponse utilisateur ; charte « ne jamais engager le mouvement » |
| D3.4 | Hiérarchie des palettes : 4 Couleurs 2027 = tokens racine ; 3 teintes = surfaces ; 6 vives = aplats, grands titres ≥ 24 px et code couleur des 4 parties, **jamais en texte courant sur Crème** ; en dark mode (Charbon) l'accent violet devient Violet 200 #E5CBFF. | `design/contrast-matrix.md` (calculé) |

---

## 5. Conditions d'usage de la charte, et les trois écarts assumés (ajouté le 10 septembre 2026 — panel rouge T12)

### 5.1 La condition d'usage n'a jamais été lue en entier

Relu ce jour sur `docs/discovery/captures/2026-09-07/identite/charte-lfi.desktop.part0.png` (**VÉRIFIÉ**), la page de la charte porte **deux phrases distinctes**, et le dossier n'en avait retenu qu'une :

> « **Toute utilisation doit se faire par les insoumis·es dans le respect des _principes de la France insoumise_, et de la _Charte des groupes d'action_.** »
>
> « En aucun cas **ces logos** ne peuvent être utilisés pour engager une partie ou l'ensemble du mouvement en dehors du respect du programme l'Avenir en commun et des orientations stratégiques définies collectivement par les insoumis·es. »

La première conditionne **toute utilisation** de la charte — couleurs et polices comprises — au respect de **deux textes nommés**, qui sont des liens hypertexte sur la page. La seconde, et elle seule, porte sur les **logos**.

`docs/discovery/annexe-reconnaissance-brute.md` citait ces deux phrases sous l'étiquette « citée verbatim » en s'arrêtant sur « …des principes de la France insoumise… » : **la mention de la Charte des groupes d'action disparaissait**, et les deux phrases étaient fusionnées. Conséquence, dans tout le dossier — D0.11, D3.3, le §1 de ce fichier (ligne « Logos »), `design/illustration-rules.md` règle 7 — une **condition d'usage générale** a été traitée comme une **restriction sur les logos**. La citation complète est rétablie dans l'annexe.

**Ni « les principes de la France insoumise » ni « la Charte des groupes d'action » n'existent nulle part dans le dossier** : ni capture, ni URL, ni ligne dans `01-faits.md`, `11-conformite.md` ou ce fichier ; et les deux URL ne sont pas non plus dans `charte-lfi.desktop.audit.json`, qui n'a capturé que trois liens (LOGO-LFI-VIOLET.png, Logos-LFI.zip, un PDF leftalliance). Le projet affirme « **respect total de la charte graphique** » (D0.1, `CLAUDE.md`) **sans avoir lu la clause qui définit ce respect**. C'est la première question de l'auditeur·rice, et la réponse est aujourd'hui « on ne sait pas ».

**À faire avant tout build (H-LAN-15, priorité 1) :**

1. Ouvrir les deux liens sur `https://lafranceinsoumise.fr/charte-graphique/`, **télécharger et archiver les deux textes** dans `docs/discovery/captures/<date>/identite/` (HTML + txt + PNG + SHA-256, protocole D0.37).
2. Remplir le tableau ci-dessous, **clause par clause**, pour tout ce qui touche un outil numérique : nom et dénomination, prise de parole au nom du mouvement, usage du mot « insoumis », statut et obligations des groupes d'action, obligations déclaratives, usage des couleurs et des polices.
3. Chaque clause devient soit une **ligne VÉRIFIÉE de feu vert**, soit une **entrée de la BAN LIST** de `prompt-final.md` §9.
4. **Si l'un des deux textes interdit ce que fait l'app, ce n'est pas une note de bas de page : c'est une réouverture de D3.1, à trancher avant tout build.**

| Clause | Texte source | Ce qu'elle impose à un outil numérique | Verdict | Statut |
|---|---|---|---|---|
| *(à remplir après lecture)* | principes de la France insoumise | — | — | **HYPOTHÈSE — texte non lu** |
| *(à remplir après lecture)* | Charte des groupes d'action | — | — | **HYPOTHÈSE — texte non lu** |

### 5.2 « Respect total de la charte » est faux sur trois points, et il vaut mieux que ce soit nous qui l'écrivions

Les trois écarts ci-dessous sont **documentés et assumés ailleurs dans le dossier**, mais ne sont jamais présentés comme des écarts. Le mot « **total** » invite précisément l'auditeur·rice à les chercher, et il en trouve trois en trois minutes.

| # | Écart | Ce que dit la charte (VÉRIFIÉ sur `charte-lfi.desktop.part0.png`) | Ce que fait l'app | Raison, en une ligne |
|---|---|---|---|---|
| (a) | **Rôle des deux polices inversé** | Titres : Config Variable Condensed Black / Black, **alternative gratuite Public Sans Black** ; sous-titres : Config Variable Bold, **alt. Public Sans Bold** ; **corps de texte** : Config Variable Semi Bold / Regular / Light, **alt. Gowun Batang Regular / Bold** | D3.2 : **Public Sans en corps**, **Gowun Batang réservée au verbatim** | Lisibilité mobile : Gowun Batang 17-18 px grise sur Crème en corps long (`design/typo/echantillon-fr-390.png`), et réserver le serif au verbatim sert le contrat « texte officiel vs texte de l'app » |
| (b) | **Trois teintes de surface hors charte** | #FDEDFF / #E5CBFF / #FFD2CF **n'y figurent pas** : elles sont relevées dans les fills de `LOGO-M27.svg` | Surfaces `violet-100`, `violet-200`, `corail-200` | La charte ne documente aucune surface ; sans elles, la session aurait inventé ses propres teintes |
| (c) | **Le motif bloc 3D vient des affiches**, pas de la charte | La charte ne porte aucun motif | Bloc 3D réinterprété en CSS, un par écran | Emprunt assumé de D3.1 option B, sans WebGL et sans reprise d'un fichier tiers |

**Trois gestes de rédaction** : (1) remplacer « respect total de la charte graphique » par « **charte 2027 suivie sur les couleurs et les polices libres qu'elle désigne ; trois écarts assumés, listés** » dans `CLAUDE.md` et dans l'impact de D0.1 ; (2) garder ce tableau ici ; (3) en reprendre les trois lignes, en trois phrases, sur `/a-propos` sous `about.intro` — c'est la page qu'ouvre quelqu'un qui se demande « qui a fait ça et de quel droit ».

### 5.3 Ce que le dépôt public republie, et qui contredit le §0 de ce fichier

Le §0 promet que « les fichiers tiers — logos, affiches, illustrations — sont dans `assets-tiers/`, **non versionnés** ». Le `.gitignore` de ce dossier est bien en place. Mais **sept captures pleine page sont suivies par git et présentes dans HEAD** : `charte-lfi.desktop.png` (1440 × 2716), `charte-lfi.desktop.part0.png`, `.part1.png`, `charte-lfi.palettes.png`, `melenchon2027-home.desktop.png`, `melenchon2027-home.mobile.png`, `melenchon2027-home.mobile.top.png`. Ouvertes et vérifiées : `charte-lfi.desktop.part0.png` contient le **logo LFI complet** (Φ + « LA FRANCE INSOUMISE ») et une **photo de tract tenu en main** ; `melenchon2027-home.mobile.top.png` contient le **wordmark LOGO-M27**, la **tortue officielle lavande** sur la jauge de soutiens, le formulaire de parrainage et une **photographie de foule avec des personnes identifiables**.

Ce sont, image pour image, les objets nommés dans la BAN LIST (« logo LFI », « LOGO-M27.svg », « LogoTortue.svg », « toute photo de personne ») et dans D3.3. Le dépôt est public (D0.28), `LICENSE` le déclare MIT, et `legal.license.code` y envoie le public depuis l'app. La revue « juriste hostile » (`11-conformite.md` §19) et R11 de `14-risques.md` ont cherché les prises faciles dans `git log`, `LICENSE` et `desintox.json` — et sont passées à côté de celle-ci.

**Correctif (H-LAN-14, priorité 1)** — un `git rm` ne suffit pas, les fichiers restent dans l'historique d'un dépôt public : (1) déplacer les sept PNG hors du dépôt (même emplacement local que `assets-tiers/`) **et purger l'historique** dans la même opération que H-CNF-17c ; (2) la preuve n'est pas perdue — les `.audit.json` déjà versionnés portent les faits mesurés (couleurs calculées, `document.fonts`, styles calculés), et un `captures-tiers.manifest.json` versionné portant le **SHA-256 de chaque PNG** rend la capture re-vérifiable sans la republier ; (3) si une image reste nécessaire, la remplacer par des bandes de nuanciers recadrées — aucun logo, aucun wordmark, aucune illustration, aucune personne ; (4) règle générale : `docs/discovery/captures/**/*.png` d'un site tiers = **non versionné par défaut**, avec un test de CI qui échoue si un PNG tiers réapparaît dans l'index. **Compte total à trier : 316 PNG suivis** sous `docs/discovery/captures/`.
