# Polices auto-hébergées — sous-ensembles latin (T3)

> Produit le **7 septembre 2026**. Décisions appliquées : D3.1 (charte LFI + emprunts M27), D3.2 (Public Sans = voix de l'app, Gowun Batang = verbatim du programme, jamais d'italique en Gowun Batang). Exigence PLAN T3 : **chaque fichier < 100 Ko**. Statut de chaque fait : VÉRIFIÉ (lu à la source le 7/9/2026, URL donnée) / PROBABLE / HYPOTHÈSE.

## 1. Résultat (tailles mesurées, `stat -c %s`)

| Fichier | Octets | Contenu | < 100 Ko |
|---|---:|---|---|
| `PublicSans-Variable-latin.woff2` | **29 180** | variable `wght` 100–900, droit, 430 glyphes, 335 codepoints | oui |
| `PublicSans-Italic-Variable-latin.woff2` | **31 116** | variable `wght` 100–900, italique, 430 glyphes, 335 codepoints | oui |
| `GowunBatang-Regular-latin.woff2` | **19 652** | 400, 553 glyphes, 355 codepoints | oui |
| `GowunBatang-Bold-latin.woff2` | **19 796** | 700, 553 glyphes, 355 codepoints | oui |
| **Total des 4 fichiers** | **99 744** | | |

SHA-256 des fichiers produits (VÉRIFIÉ, `sha256sum` le 7/9/2026) :

```
b4627ea445775deadef769d0c83465691c98b02a9aa41c8ee0b2729d13fc63d6  PublicSans-Variable-latin.woff2
082f0d637f9a55817cbc27112eec950968051ce58c5f85ddc3bc635c170b173b  PublicSans-Italic-Variable-latin.woff2
b383c6e58c10276e7d0f800568b105962dc590be34b6993ce53e71e5e3480a50  GowunBatang-Regular-latin.woff2
5937df3310489328a6e64fdde5340e73072345e7535f9bdf4cb9adee28184097  GowunBatang-Bold-latin.woff2
```

**Point de comparaison** : les sous-ensembles latin statiques servis par Google Fonts, mesurés le même jour au navigateur (T3 partie 1, `design/identity-decision.md` §1), pesaient **14 632 o** (Public Sans, une seule graisse) et **16 236 o** (Gowun Batang, une graisse) — VÉRIFIÉ. Nos fichiers sont plus lourds pour Public Sans parce qu'ils embarquent **toute l'axe de graisse 100–900** dans un seul fichier (Google sert un fichier par graisse : 400 + 700 + 900 + italique 900 = 4 requêtes ≈ 4 × 14,6 Ko ≈ 58 Ko — PROBABLE, extrapolé de la seule graisse mesurée), et légèrement plus légers pour Gowun Batang (hinting supprimé, tables verticales CJK supprimées).

Objectif D3.2 « < 20 Ko chacune » : atteint pour Gowun Batang (19 652 / 19 796 o) ; pour Public Sans, 29–31 Ko est le prix de la police variable (un seul fichier pour toutes les graisses, dont les 900 des titres). Si le budget perf T3 (JS initial < 100 Ko gzip, LCP < 2 s en 4G) le réclame, une instance statique 400 + une 900 seraient chacune ≈ 15 Ko — HYPOTHÈSE, non mesurée.

## 2. Sources officielles (téléchargées le 7/9/2026)

| Famille | Source | Version | Fichiers pris | SHA-256 des sources | Statut |
|---|---|---|---|---|---|
| Public Sans | https://github.com/uswds/public-sans/releases/tag/v2.001 — asset `public-sans-v2.001.zip` (4 686 651 o), release « latest » de l'API GitHub, publiée le 11/5/2022 | **v2.001** (name ID 5 : « Version 2.001 ») | `fonts/variable/PublicSans[wght].ttf` (103 316 o), `fonts/variable/PublicSans-Italic[wght].ttf` (107 940 o), `OFL.txt` | zip : `88cacdf7cd03b31af8f1f83e1f51e0eb5a6052565a6c014c90c385f1ff2d13a5` | VÉRIFIÉ |
| Gowun Batang | https://github.com/yangheeryu/Gowun-Batang — commit **`4e73f5a9a004927220354f4b68a4c720da538147`** (10/6/2021, « Batang ready to go! », dernier commit du dépôt) ; fichiers lus via `raw.githubusercontent.com/yangheeryu/Gowun-Batang/4e73f5a…/fonts/ttf/` | **v2.000** (name ID 5 : « Version 2.000 ») | `GowunBatang-Regular.ttf` (8 433 296 o), `GowunBatang-Bold.ttf` (8 178 712 o), `OFL.txt` | Regular `466c593e7147412e748af4856d5ad14709b5a860bdf62b9c2546f2c5874e9849`, Bold `dbfcaa646e5831e7478524924f02906f550285a5050699b4e38c9950b3ec4b94` | VÉRIFIÉ |
| Gowun Batang (miroir) | https://github.com/google/fonts/tree/main/ofl/gowunbatang (dernier commit sur ce dossier : `c1eda9233c33ad7775b27efd794f931095cf6133`, 3/3/2026) | identique | mêmes TTF, **SHA-256 identiques** aux fichiers du dépôt amont | idem | VÉRIFIÉ |

Les sources brutes (TTF de 8 Mo, zip) ne sont **pas versionnées** ; elles sont dans le scratchpad de session et reproductibles par les URL ci-dessus.

## 3. Licences

- Les deux familles sont sous **SIL Open Font License 1.1** : `OFL-PublicSans.txt` et `OFL-GowunBatang.txt` sont les copies verbatim des `OFL.txt` des sources (VÉRIFIÉ). Public Sans est en outre un dérivé de Libre Franklin (OFL) avec des modifications de la GSA placées sous CC0 ; le `LICENSE.md` de la release précise que l'ensemble s'utilise selon l'OFL (VÉRIFIÉ, https://github.com/uswds/public-sans/blob/develop/LICENSE.md).
- Un sous-ensemble est une « Modified Version » au sens de l'OFL §1. **Aucun des deux `OFL.txt` ne déclare de Reserved Font Name** (seule la définition générique du terme y figure) : conserver les noms de famille « Public Sans » et « Gowun Batang » dans les fichiers et le CSS est donc autorisé — VÉRIFIÉ (grep sur les deux fichiers).
- Les name IDs 0 (copyright), 13 et 14 (texte et URL de licence) sont **conservés dans les woff2** (`--name-IDs=0,1,2,3,4,5,6,13,14`) pour que la mention de licence voyage avec le fichier.
- Obligation OFL §2 : la copie de licence doit accompagner toute redistribution ; d'où les deux `OFL-*.txt` à côté des woff2 dans le dépôt et dans les assets publiés.

## 4. Périmètre du sous-ensemble

Plages Unicode demandées : `U+0000-00FF` (Basic Latin + Latin-1 : accents français, `«` `»` U+00AB/00BB, `°` `½` `§`, espace insécable U+00A0), `U+0100-017F` (Latin Extended-A : `Œ`/`œ` U+0152/0153, `Ÿ` U+0178), `U+2000-206F` (ponctuation générale : `’` U+2019, `“ ”` U+201C/201D, `…` U+2026, `–` U+2013, `—` U+2014, espace fine insécable U+202F), `U+20AC` (€), `U+2122` (™).

Ce que contiennent réellement les fichiers (VÉRIFIÉ par fontTools sur les woff2 produits) :

| | Public Sans (droit et italique) | Gowun Batang (400 et 700) |
|---|---|---|
| U+0000–00FF | 193 codepoints (tout l'imprimable) | 192 |
| U+0100–017F | 124 / 128 (manquent seulement Ĳ ĳ ŉ ſ, inutiles en français) | 127 / 128 (manque ſ) |
| U+2000–206F | 16 (‐ ‑ absents ; présents : ‘ ’ ‚ “ ” „ † ‡ • … ‰ ‹ › ⁄ – —) | 34 |
| € U+20AC, ™ U+2122 | oui | oui |
| Chaîne de contrôle « L’Avenir en commun — édition 2025 : « règle verte », 83 % (Harris Interactive, juillet 2021) » + àâäéèêëîïôöùûüÿçœæ (et capitales) + … € ™ “ ” – | 0 caractère manquant | 0 caractère manquant |
| Fonctions OpenType conservées (`--layout-features='*'`) | kern, liga, calt, ccmp, locl, frac, tnum/pnum/onum/lnum, sups/subs, ss01… | kern, liga, case, ccmp, locl, frac, tnum/pnum… |
| Hinting | supprimé (`fpgm`/`prep`/`cvt` absents ; `gasp` conservé) | supprimé |
| Axe | `wght` 100→900 intact (`fvar`, `gvar`, `HVAR`, `avar`, `STAT`) | statique |

**Lacune connue (VÉRIFIÉ) : aucune des quatre polices source ne contient U+202F (espace fine insécable)**, ni U+2009 (espace fine) pour Public Sans. Le sous-ensemble ne peut pas ajouter un glyphe absent. Conséquence : un `U+202F` dans le texte sera rendu par la police système de repli (une espace, largeur légèrement différente, pas de glyphe visible). Recommandation pour le pipeline T1 : normaliser au build `U+202F` → `U+00A0` dans le corpus et les chaînes de l'app (typographie française acceptable : insécable simple devant `:` `;` `!` `?` `»`). À trancher en T2/T9 (guide de style).

## 5. Commandes exactes (reproductibles)

Environnement isolé, sans toucher au Python système :

```bash
python3 -m venv fonts-venv
./fonts-venv/bin/pip install fonttools brotli     # fonttools 4.64.0, brotli 1.2.0 (VÉRIFIÉ)
```

Sous-ensembles (`UNI` = plages du §4 ; `--no-hinting` supprime les tables de hinting ; `--layout-features='*'` garde toutes les fonctions OpenType, dont `kern` et `liga` ; `--name-IDs` conserve copyright et licence dans le fichier) :

```bash
UNI="U+0000-00FF,U+0100-017F,U+2000-206F,U+20AC,U+2122"
PS=./fonts-venv/bin/pyftsubset

$PS "fonts-src/public-sans/fonts/variable/PublicSans[wght].ttf" \
  --unicodes="$UNI" --flavor=woff2 --layout-features='*' --no-hinting \
  --name-IDs=0,1,2,3,4,5,6,13,14 \
  --output-file=design/fonts/PublicSans-Variable-latin.woff2

$PS "fonts-src/public-sans/fonts/variable/PublicSans-Italic[wght].ttf" \
  --unicodes="$UNI" --flavor=woff2 --layout-features='*' --no-hinting \
  --name-IDs=0,1,2,3,4,5,6,13,14 \
  --output-file=design/fonts/PublicSans-Italic-Variable-latin.woff2

$PS fonts-src/gowun-batang/GowunBatang-Regular.ttf \
  --unicodes="$UNI" --flavor=woff2 --layout-features='*' --no-hinting \
  --drop-tables+=vhea,vmtx --name-IDs=0,1,2,3,4,5,6,13,14 \
  --output-file=design/fonts/GowunBatang-Regular-latin.woff2

$PS fonts-src/gowun-batang/GowunBatang-Bold.ttf \
  --unicodes="$UNI" --flavor=woff2 --layout-features='*' --no-hinting \
  --drop-tables+=vhea,vmtx --name-IDs=0,1,2,3,4,5,6,13,14 \
  --output-file=design/fonts/GowunBatang-Bold-latin.woff2
```

Notes de mesure (VÉRIFIÉ) :
- `--drop-tables+=vhea,vmtx` (métriques verticales, utiles seulement pour l'écriture verticale CJK) fait passer Gowun Batang Regular de 20 148 o à 19 652 o ; sans effet sur Public Sans qui n'a pas ces tables.
- Retirer `fwid`/`aalt` de `--layout-features` ne change pas un octet (20 148 o dans les deux cas pour Gowun Batang Regular, 29 180 o pour Public Sans) : la fermeture GSUB sur nos plages n'entraîne aucun glyphe supplémentaire, `'*'` est donc gratuit.

## 6. Bloc `@font-face` (à copier tel quel ; chemins relatifs au CSS)

```css
@font-face {
  font-family: "Public Sans";
  src: url("PublicSans-Variable-latin.woff2") format("woff2");
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0100-017F, U+2000-206F, U+20AC, U+2122;
}
@font-face {
  font-family: "Public Sans";
  src: url("PublicSans-Italic-Variable-latin.woff2") format("woff2");
  font-weight: 100 900;
  font-style: italic;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0100-017F, U+2000-206F, U+20AC, U+2122;
}
@font-face {
  font-family: "Gowun Batang";
  src: url("GowunBatang-Regular-latin.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0100-017F, U+2000-206F, U+20AC, U+2122;
}
@font-face {
  font-family: "Gowun Batang";
  src: url("GowunBatang-Bold-latin.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0100-017F, U+2000-206F, U+20AC, U+2122;
}
```

Règles d'usage associées (D3.2, `design/tokens.json` → `ban_list`) : pas de `font-style: italic` sur Gowun Batang (aucune fonte italique, le navigateur synthétiserait) ; le fichier italique Public Sans n'est chargé que si un élément italique apparaît (le navigateur ne télécharge une face qu'à l'usage) ; `font-display: swap` + `<link rel="preload" as="font" type="font/woff2" crossorigin>` sur `PublicSans-Variable-latin.woff2` seulement (la face du LCP) — HYPOTHÈSE à confirmer avec `web-perf` en T7.

## 7. Vérification au navigateur (VÉRIFIÉ, 7/9/2026)

- Page : `design/fonts/check.html` (le bloc `@font-face` ci-dessus, chemins locaux, chaîne de contrôle en Public Sans 400 / 700 / 900 italique et Gowun Batang 400 / 700, sur Crème #FFFCF4).
- Rendu : `design/fonts/check.png` (Chromium headless via Playwright 1.63.0, viewport 390 px, DPR 2, page entière). Rapport brut : `design/fonts/check.report.json`.
- Preuves que les fichiers **locaux** sont ceux qui sont utilisés :
  1. `fc-list` : aucune Public Sans ni Gowun Batang installée sur la machine (rien ne peut masquer un échec de chargement).
  2. Réseau : 4 réponses `200` pour `file:///…/design/fonts/{PublicSans-Variable,PublicSans-Italic-Variable,GowunBatang-Regular,GowunBatang-Bold}-latin.woff2`, aucune requête distante.
  3. `document.fonts` : 4 `FontFace` en statut **`loaded`** — Public Sans `100 900` normal, Public Sans `100 900` italic, Gowun Batang `400`, Gowun Batang `700` — avec `unicodeRange` = `U+0-FF, U+100-17F, U+2000-206F, U+20AC, U+2122` et `display: swap`.
  4. `document.fonts.check()` = `true` pour la chaîne de contrôle dans les 4 combinaisons.
  5. Largeur mesurée (`canvas.measureText`, chaîne de contrôle) : Public Sans 400 → 663 px contre 639,14 px pour `sans-serif` ; Gowun Batang 400 → 688 px contre 631,66 px pour `serif` ; 900 → 731 px ; 900 italique → 698 px ; Gowun 700 → 720 px. Les largeurs diffèrent du repli et entre graisses : les glyphes rendus sont bien ceux des woff2, et l'axe variable répond.

## 8. Fichiers de ce dossier

```
design/fonts/
├── PublicSans-Variable-latin.woff2          29 180 o
├── PublicSans-Italic-Variable-latin.woff2   31 116 o
├── GowunBatang-Regular-latin.woff2          19 652 o
├── GowunBatang-Bold-latin.woff2             19 796 o
├── OFL-PublicSans.txt                       copie verbatim (release v2.001)
├── OFL-GowunBatang.txt                      copie verbatim (commit 4e73f5a)
├── check.html                               page de contrôle (bloc @font-face + chaîne FR)
├── check.png                                rendu Chromium 390 px, DPR 2
├── check.report.json                        document.fonts, requêtes réseau, largeurs mesurées
└── README.md                                ce fichier
```
