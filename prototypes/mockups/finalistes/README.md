# Maquettes des deux finalistes — F1 « Tu savais que c'était dedans ? » et F2 « Laquelle est ici ? »

> Artboards statiques (HTML + CSS, aucun script, aucun framework, aucun build à l'affichage) produits le **9 septembre 2026** d'après `docs/discovery/07-mecaniques.md` §9 (D5.7). Mobile 390 px, thème Crème et thème Charbon par `prefers-color-scheme` (D0.23), rôles de `design/tokens.json` v0, paires de `design/contrast-matrix.md`, règles 1 à 8 de `design/illustration-rules.md`, chaînes de `design/strings.json` (D3.7), registre tu (D0.25). Captures : `docs/discovery/captures/2026-09-09/maquettes/finalistes/` (PNG clair + `.dark.png`, cartes de partage à taille réelle, `report.json`, `SHA256SUMS.txt`).
>
> Statut : **maquette** (HYPOTHÈSE de forme, à juger par les personas-agents de la session 2, D11.1). Les textes cités sont VÉRIFIÉS (tirés par identifiant du corpus `d29c7422004ab27c`, voir `manifest.json`).

## 1. Fichiers

| Fichier | Rôle |
|---|---|
| `styles.css` | Feuille unique, tokens neutres (rôles `--bg`, `--text`, `--brand`, `--action`, `--verbatim-*`, `--shadow-3d`…) ; bascule sombre ; composants verbatim, carte de jeu, options A/B/C, StatCard 77-808, mosaïque, cartes de partage |
| `gen.mjs` | Injecteur de textes : lit `data/aec-2025.json`, `data/stat-cards.json`, `design/strings.json` et écrit les 12 HTML + `manifest.json`. Les HTML produits sont autonomes ; `node gen.mjs` ne sert qu'à garantir que chaque verbatim vient du corpus par son id (aucune recopie manuelle) |
| `f1-01…f1-06.html`, `f2-01…f2-06.html` | Les 12 écrans (tableau §2 et §3) |
| `fonts/` | Sous-ensembles latin auto-hébergés (D3.6) + licences OFL ; aucune requête externe (vérifié : `report.json` → `externalRequests: []`) |
| `capture.mjs` | Script Playwright (Chromium, 390 × 844, DPR 2, `document.fonts.ready`, page entière) : clair + sombre, cartes de partage à taille réelle, audit de contraste texte, débordement horizontal, polices chargées |
| `manifest.json` | Ids et textes utilisés, réponses encodées, version du corpus |

Chaque écran porte en haut une **barre d'adresse maquettée** (fond `--chrome-bg`, hors app) qui documente l'état encodé dans l'URL ; le pied « Projet militant indépendant… » (`independence.line`, D0.14) est sur tous les écrans, l'attribution CC (`attribution.full`) sur les verbatims de section, l'attribution en deux lignes (`attribution.card` + « Carte : {appName}, projet militant indépendant », §7.11 règle 3) sur les images. Wordmark provisoire « AEC Discover » (`{appName}`), jamais de logo LFI ni M27 (D3.3), aucune mascotte (règle 2.4 : jamais sur l'écran 0 par lien, jamais près d'un verbatim), aucun emoji, un seul bloc 3D par écran (règle 4 : le titre d'écran en ombre pleine `6px 6px 0 Violet 200`, ou le titre de la carte sur la feuille de partage).

## 2. F1 — « Tu savais que c'était dedans ? » (niveau 3)

**Encodage d'état** (§9.1) : chemin `/defi/<n>` = index entier de `defis.json` (`^\d{1,4}$`, ici 254 = 11 septembre 2026, inconnu → tirage du jour) ; fragment `#r=` = exactement 5 caractères dans `{s, d, p}` (savais, découvre, passé), sinon ignoré ; rien d'autre (pas de `?`, pas de date, pas de nom) ; aucun `localStorage` dans le prototype. Le fragment n'apparaît que sur le lien « Comparer nos découvertes » ; « Et toi ? » régénère `/defi/254` sans fragment.

Tirage prototype (§9.0, composé à la main selon les règles de build) : `c9-s01-m04`, `c7-s04-m05`, `c14-s02-m09`, `c18-s04-k01`, `c3-s02-m03` (4 parties, ≤ 89 caractères, 0 interdictive, 0 section sensible, 0 id de `riposte.json`). Réponses jouées sur les artboards : **`sdddp`** (le testeur connaissait les APL, découvre les trois suivantes, passe la cinquième) ; lien reçu sur l'écran 6 : **`#r=ddsdp`**.

| Écran | Fichier | Ce qu'il montre | État affiché dans la barre |
|---|---|---|---|
| 0 — Écran 0 | `f1-01-ecran0.html` | Arrivée directe (tuile militante) : titre-accroche `home.hook.did_you_know` (bloc 3D), « 5 mesures du programme, une par écran. », carte 1/5 = verbatim `c9-s01-m04` en Gowun Batang étiqueté « Texte du programme », « Chapitre 9 › Créer un état d'urgence sociale », boutons « Je savais » / « Je découvre » (cibles 48 px) et « Passer » (`common.skip`), ligne « 5 mesures · 1 min · rien à saisir », lien discret « Lire la section », position « 1 / 5 » en tête | `/defi/254` |
| 1 — 10 s | `f1-02-10s.html` | Carte 2/5 `c7-s04-m05` « Plafonner les frais bancaires », « Chapitre 7 › Éradiquer la pauvreté » ; indicateur typographique « 2 / 5 » (position, jamais score) en bloc 3D, aucune animation, aucun chrono | `/defi/254` |
| 2 — Aha | `f1-03-aha.html` | Depuis la carte 3, « Lire la section » : `SectionVerbatim` de `c14-s02` : « Chapitre 14 » (3D) + titre, chapeau `c14-s02-p01`, mesure clé `c14-s02-k01`, 17 mesures numérotées dont **`c14-s02-m09` surlignée « Carte 3 du tirage »**, StatCard `c14-s02-a01` sous gabarit 77-808 (chiffre et date dans le même corps, `statcard.legal.full` avec la ligne du sidecar « 9-12 juillet 2021, commanditaire La France insoumise, 1 241 personnes interrogées », `statcard.legal.margin`, `statcard.legal.source_link`), volet « Vérifier à la source » (`common.open_official` + URL), « Reprendre le tirage (3/5) » en haut (lien) et en bas (CTA), attribution CC | `/s/c14-s02` |
| 3 — Résultat | `f1-04-resultat.html` | Kicker « Tirage du 11 septembre », titre « 3 mesures qui m'ont surpris·e » (3D), les trois verbatims marqués « Je découvre » (`c7-s04-m05`, `c14-s02-m09`, `c18-s04-k01`) avec chapitre › section et « Lire la section », mini-mosaïque des 18 chapitres (4 parties, chapitres 7, 14, 18 allumés ; jamais de compte), « Et toi ? » (CTA primaire, lien sans réponses), « Comparer nos découvertes » + « Ce lien contient tes 5 réponses. », « Encore ? » + « Douze mesures de plus, sans partage. », « Lire le programme → ». Aucun compte « je savais », aucun « sur 5 » | `/defi/254` |
| 4 — Carte | `f1-05-carte.html` | Feuille `share.title` : aperçu de l'image 1080 × 1920 (matière 53 % = les 3 verbatims sur Violet 100 ; aplat 47 % Violet = titre en blocs chevauchant la frontière, kicker « Tirage du 11 septembre », mosaïque, « Et toi ? » + « Lire le programme », bande de signature wordmark + attribution deux lignes, URL `/defi/254`), aperçu OG 1200 × 630 (« 5 mesures du programme. Tu savais que c'était dans le programme ? », les 5 chapitres en puces **sans les textes**), texte de repli WhatsApp sans emoji, `share.button_whatsapp`, `share.button_copy`, `share.button_image`. Fichiers à taille réelle : `f1-05-carte.story.png`, `f1-05-carte.og.png` | `/defi/254` |
| Variante lien | `f1-06-lien.html` | Arrivée par `#r=` : lignes de contexte « Quelqu'un t'envoie 5 mesures de l'Avenir en commun 2025, le programme. » et « Quelqu'un a déjà joué. Ses découvertes s'affichent après tes réponses. », puis directement la carte 1/5 (mêmes boutons, ligne « 5 mesures · 1 min · rien à saisir »), pied d'indépendance. Sous un séparateur pointillé, **l'état suivant du même lien** : bloc « Vous avez découvert 2 mesures en commun » (`c7-s04-m05`, `c18-s04-k01` = intersection de `sdddp` et `ddsdp`), sans score ni gagnant | `/defi/254#r=ddsdp` (fragment souligné) |

## 3. F2 — « Laquelle est ici ? » (niveau 2)

**Encodage d'état** (§9.2) : **aucun**. Chemin `/q/<section-id>` validé par `^c\d{1,2}-s\d{2}$` et présent dans les 89 ; la révélation n'est jamais encodée (pas de `#a=`), le lien est identique avant et après le tap ; rien en `localStorage`. Triplet 1 (`c12-s01`) : A `c12-s01-m03` (bonne), B `c5-s02-m06`, C `c18-s01-m02` ; triplet 2 (`c12-s02`, atteint par « Une autre section ? ») : `c8-s02-m02`, `c12-s02-m08` (bonne), `c16-s12-m02` — non dessiné.

| Écran | Fichier | Ce qu'il montre | État affiché |
|---|---|---|---|
| 0 — Écran 0 | `f2-01-ecran0.html` | Arrivée directe : **bas de la section `c12-s01`** — « Chapitre 12 » (3D) + titre, chapeau `c12-s01-p01`, mesure clé `c12-s01-k01`, 11 mesures, StatCard `c12-s01-a01` (83 %, Harris Interactive, juillet 2021, sidecar identique à `c14-s02-a01`), volet source, puis la question : « Laquelle est ici ? », « Section : … — Chapitre 12 », la ligne « Les trois sont dans le programme, mot pour mot. Une seule est dans cette section. » **au-dessus** des options, A/B/C en Gowun Batang étiquetées « Texte du programme », attribution CC | `/s/c12-s01` |
| 1 — 10 s | `f2-02-10s.html` | Arrivée par lien : la question seule en tête (titre 3D), section et chapitre, ligne des trois vérités, options A/B/C (boutons), « Lire la section → » déjà visible sous les options ; aucun chrono, aucun retour avant le tap | `/q/c12-s01` |
| 2 — Aha | `f2-03-aha.html` | **B touchée** : « Celle-ci existe aussi : elle est dans « Faire le service public de la petite enfance », chapitre 5. » + « Y aller → » (plein) ; A se surligne (filet 2 px) avec « C'est la mesure 3 de cette section. » ; C reçoit « Elle est dans « Protéger les mers et océans », chapitre 18. » + « Y aller → » ; « Lire la section → ». Aucun rouge, aucun mot de faute | `/q/c12-s01` (inchangé) |
| 3 — Résultat | `f2-04-resultat.html` | La question révélée (même état) avec les actions : « Lire la section → » (principal, plein), « Une autre section ? » → `/q/c12-s02` + « La suivante dans le livre : « L'organisation de l'État au service de la planification écologique ». », « Envoyer cette question ». Aucun compteur, aucun « bravo » | `/q/c12-s01` |
| 4 — Carte | `f2-05-carte.html` | Feuille de partage : aperçu OG 1200 × 630 pré-généré (« Laquelle est dans « La bifurcation écologique pour une société de l'harmonie » ? », ligne « Les trois sont dans le programme, mot pour mot » au-dessus, A/B/C verbatim avec leur chapitre, **sans la réponse**, bande de signature deux lignes), texte WhatsApp « Trois mesures du programme, toutes vraies. Une seule est dans cette section : » + `/q/c12-s01`, `share.button_whatsapp`, `share.button_copy`, ligne « Le lien est le même avant et après ta réponse ». Fichier à taille réelle : `f2-05-carte.og.png` | `/q/c12-s01` |
| Variante lien | `f2-06-lien.html` | Arrivée par lien, **A touchée** (l'autre branche de §9.2) : « C'est la mesure 3 de cette section. », B et C reçoivent leur étiquette de section avec « Y aller → » ; « Lire la section → » devient le bouton principal ; « Et la tienne ? » propose « Une autre section ? » ; aucune trace de l'expéditeur | `/q/c12-s01` |

## 4. Vérifications faites (9/9/2026, `report.json`)

- **Polices** : Public Sans variable (droite + italique) et Gowun Batang 400 chargées depuis `fonts/` ; 0 requête externe sur les 24 rendus ; Gowun Batang 700 non utilisée (pas de gras dans le verbatim, règle 3 de la voix).
- **Contraste** : audit de chaque nœud texte (couleur calculée sur le fond effectif) : 13 paires distinctes, toutes ≥ 5,10:1 (`#FFFCF4` sur `#D1271C` = 5,10 pour le CTA Rouge ; le reste entre 9,34 et 15,45). Sombre : `--bg-elevated #2C2E2B` donne 13,36 (Crème) et 9,34 (Violet 200) ; Violet 200 remplace Violet (1,33 interdit, D3.4).
- **Débordement** : `scrollWidth = 390` sur les 24 rendus ; les URL longues passent à la ligne entre hôte et chemin, jamais dans un mot.
- **Un seul bloc 3D par écran** : le titre d'écran ; sur les feuilles de partage, le titre de la carte (le titre de feuille est sans ombre).
- **Chiffres** : les seules cartes statistiques dessinées sont `c14-s02-a01` et `c12-s01-a01`, dans leur `SectionVerbatim`, sous gabarit 77-808, jamais sur une image (D5.5, D5.8). Les trois autres du contenu commun (`c9-s01-a01`, `c7-s04-a01`, `c8-s02-a01`) n'apparaissent que dans leurs sections, non dessinées ici.
- **Typographie d'affichage** : espace insécable posée au rendu avant `? ! : ; %` et à l'intérieur des « » (les caractères du verbatim ne sont pas modifiés autrement ; U+202F → U+00A0, D3.6).

## 5. Ce que les artboards ne montrent pas (par choix)

- Aucun swipe, aucune animation (D5.9, D3.5) ; les paliers « Encore ? » (12 puis 36) ne sont pas dessinés.
- Aucun geste « Garder sur ce téléphone », aucun `localStorage` (non testés le 11/9).
- Le flag silence électoral (D0.24) est à OFF : les feuilles de partage sont ouvertes.
- La page « section inconnue » de `/q/`, le témoin T `/m/c12-s01-k01` et les sections atteintes par « Y aller » (`c5-s02`, `c18-s01`, `c8-s02`) ne sont pas dessinés : mêmes composants que `f1-03-aha.html`.
