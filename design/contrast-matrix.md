# Matrice de contraste WCAG 2.2 — « C'est écrit là »

Générée par `npx tsx scripts/contrast.ts` le 2026-09-07. Ratio texte/fond ; seuils : **AAA ≥ 7**, **AA ≥ 4,5** (texte courant), **AA-large ≥ 3** (≥ 24 px ou ≥ 19 px gras, et éléments non textuels), **ÉCHEC < 3**.

Règle éliminatoire du plan (T3) : 100 % des paires *texte courant* utilisées dans les maquettes doivent être ≥ 4,5:1.

## Palette (toutes les valeurs lues à la source le 7/9/2026)

| Nom | HEX | Groupe | Source |
|---|---|---|---|
| Violet | `#4C0297` | core | charte « Couleurs 2027 » |
| Rouge | `#D1271C` | core | charte « Couleurs 2027 » |
| Crème | `#FFFCF4` | core | charte « Couleurs 2027 » |
| Charbon | `#212320` | core | charte « Couleurs 2027 » |
| Violet 100 | `#FDEDFF` | tint | LOGO-M27.svg (27 fills) |
| Violet 200 | `#E5CBFF` | tint | LOGO-M27.svg (57 fills) |
| Corail 200 | `#FFD2CF` | tint | LOGO-M27.svg (12 fills) |
| Vif violet | `#7B13D6` | vive | charte « Codes HEX (web) » |
| Vif rouge | `#F91616` | vive | charte « Codes HEX (web) » |
| Vif bleu | `#3885F4` | vive | charte « Codes HEX (web) » |
| Vif rose | `#ED5FB1` | vive | charte « Codes HEX (web) » |
| Vif jaune | `#F9C900` | vive | charte « Codes HEX (web) » |
| Vif vert | `#2E9959` | vive | charte « Codes HEX (web) » |
| Gris M27 | `#707070` | observed | melenchon2027.fr paragraphes (computed) |
| Jaune M27 | `#F5C800` | observed | melenchon2027.fr (computed) |
| Beige M27 | `#E6DFC9` | observed | melenchon2027.fr (computed) |

## Texte (lignes) × fond (colonnes)

| Texte ↓ / Fond → | Crème | Charbon | Violet | Rouge | Violet 100 | Violet 200 | Corail 200 |
|---|---|---|---|---|---|---|---|
| **Violet** `#4C0297` | 11.62 AAA | 1.33 ÉCHEC | — | 2.28 ÉCHEC | 10.63 AAA | 8.12 AAA | 8.72 AAA |
| **Rouge** `#D1271C` | 5.10 AA | 3.03 AA-large | 2.28 ÉCHEC | — | 4.66 AA | 3.56 AA-large | 3.83 AA-large |
| **Crème** `#FFFCF4` | — | 15.45 AAA | 11.62 AAA | 5.10 AA | 1.09 ÉCHEC | 1.43 ÉCHEC | 1.33 ÉCHEC |
| **Charbon** `#212320` | 15.45 AAA | — | 1.33 ÉCHEC | 3.03 AA-large | 14.13 AAA | 10.80 AAA | 11.59 AAA |
| **Violet 100** `#FDEDFF` | 1.09 ÉCHEC | 14.13 AAA | 10.63 AAA | 4.66 AA | — | 1.31 ÉCHEC | 1.22 ÉCHEC |
| **Violet 200** `#E5CBFF` | 1.43 ÉCHEC | 10.80 AAA | 8.12 AAA | 3.56 AA-large | 1.31 ÉCHEC | — | 1.07 ÉCHEC |
| **Corail 200** `#FFD2CF` | 1.33 ÉCHEC | 11.59 AAA | 8.72 AAA | 3.83 AA-large | 1.22 ÉCHEC | 1.07 ÉCHEC | — |
| **Vif violet** `#7B13D6` | 7.05 AAA | 2.19 ÉCHEC | 1.65 ÉCHEC | 1.38 ÉCHEC | 6.45 AA | 4.93 AA | 5.29 AA |
| **Vif rouge** `#F91616` | 3.97 AA-large | 3.89 AA-large | 2.92 ÉCHEC | 1.28 ÉCHEC | 3.63 AA-large | 2.78 ÉCHEC | 2.98 ÉCHEC |
| **Vif bleu** `#3885F4` | 3.51 AA-large | 4.40 AA-large | 3.31 AA-large | 1.45 ÉCHEC | 3.21 AA-large | 2.46 ÉCHEC | 2.64 ÉCHEC |
| **Vif rose** `#ED5FB1` | 2.98 ÉCHEC | 5.18 AA | 3.90 AA-large | 1.71 ÉCHEC | 2.73 ÉCHEC | 2.08 ÉCHEC | 2.24 ÉCHEC |
| **Vif jaune** `#F9C900` | 1.53 ÉCHEC | 10.09 AAA | 7.59 AAA | 3.33 AA-large | 1.40 ÉCHEC | 1.07 ÉCHEC | 1.15 ÉCHEC |
| **Vif vert** `#2E9959` | 3.52 AA-large | 4.39 AA-large | 3.30 AA-large | 1.45 ÉCHEC | 3.22 AA-large | 2.46 ÉCHEC | 2.64 ÉCHEC |
| **Gris M27** `#707070` | 4.83 AA | 3.20 AA-large | 2.41 ÉCHEC | 1.06 ÉCHEC | 4.42 AA-large | 3.38 AA-large | 3.62 AA-large |
| **Jaune M27** `#F5C800` | 1.56 ÉCHEC | 9.91 AAA | 7.46 AAA | 3.27 AA-large | 1.43 ÉCHEC | 1.09 ÉCHEC | 1.17 ÉCHEC |
| **Beige M27** `#E6DFC9` | 1.30 ÉCHEC | 11.89 AAA | 8.94 AAA | 3.92 AA-large | 1.19 ÉCHEC | 1.10 ÉCHEC | 1.03 ÉCHEC |

## Paires autorisées pour du texte courant (≥ 4,5:1)

- Crème sur Charbon : 15.45 (AAA)
- Charbon sur Crème : 15.45 (AAA)
- Charbon sur Violet 100 : 14.13 (AAA)
- Violet 100 sur Charbon : 14.13 (AAA)
- Beige M27 sur Charbon : 11.89 (AAA)
- Violet sur Crème : 11.62 (AAA)
- Crème sur Violet : 11.62 (AAA)
- Charbon sur Corail 200 : 11.59 (AAA)
- Corail 200 sur Charbon : 11.59 (AAA)
- Charbon sur Violet 200 : 10.80 (AAA)
- Violet 200 sur Charbon : 10.80 (AAA)
- Violet sur Violet 100 : 10.63 (AAA)
- Violet 100 sur Violet : 10.63 (AAA)
- Vif jaune sur Charbon : 10.09 (AAA)
- Jaune M27 sur Charbon : 9.91 (AAA)
- Beige M27 sur Violet : 8.94 (AAA)
- Violet sur Corail 200 : 8.72 (AAA)
- Corail 200 sur Violet : 8.72 (AAA)
- Violet sur Violet 200 : 8.12 (AAA)
- Violet 200 sur Violet : 8.12 (AAA)
- Vif jaune sur Violet : 7.59 (AAA)
- Jaune M27 sur Violet : 7.46 (AAA)
- Vif violet sur Crème : 7.05 (AAA)
- Vif violet sur Violet 100 : 6.45 (AA)
- Vif violet sur Corail 200 : 5.29 (AA)
- Vif rose sur Charbon : 5.18 (AA)
- Rouge sur Crème : 5.10 (AA)
- Crème sur Rouge : 5.10 (AA)
- Vif violet sur Violet 200 : 4.93 (AA)
- Gris M27 sur Crème : 4.83 (AA)
- Rouge sur Violet 100 : 4.66 (AA)
- Violet 100 sur Rouge : 4.66 (AA)

## Paires interdites pour du texte courant (< 4,5:1), tolérées seulement en aplat, grand titre ≥ 3:1 ou décor

- Gris M27 sur Violet 100 : 4.42 (AA-large)
- Vif bleu sur Charbon : 4.40 (AA-large)
- Vif vert sur Charbon : 4.39 (AA-large)
- Vif rouge sur Crème : 3.97 (AA-large)
- Beige M27 sur Rouge : 3.92 (AA-large)
- Vif rose sur Violet : 3.90 (AA-large)
- Vif rouge sur Charbon : 3.89 (AA-large)
- Rouge sur Corail 200 : 3.83 (AA-large)
- Corail 200 sur Rouge : 3.83 (AA-large)
- Vif rouge sur Violet 100 : 3.63 (AA-large)
- Gris M27 sur Corail 200 : 3.62 (AA-large)
- Rouge sur Violet 200 : 3.56 (AA-large)
- Violet 200 sur Rouge : 3.56 (AA-large)
- Vif vert sur Crème : 3.52 (AA-large)
- Vif bleu sur Crème : 3.51 (AA-large)
- Gris M27 sur Violet 200 : 3.38 (AA-large)
- Vif jaune sur Rouge : 3.33 (AA-large)
- Vif bleu sur Violet : 3.31 (AA-large)
- Vif vert sur Violet : 3.30 (AA-large)
- Jaune M27 sur Rouge : 3.27 (AA-large)
- Vif vert sur Violet 100 : 3.22 (AA-large)
- Vif bleu sur Violet 100 : 3.21 (AA-large)
- Gris M27 sur Charbon : 3.20 (AA-large)
- Rouge sur Charbon : 3.03 (AA-large)
- Charbon sur Rouge : 3.03 (AA-large)
- Vif rouge sur Corail 200 : 2.98 (ÉCHEC)
- Vif rose sur Crème : 2.98 (ÉCHEC)
- Vif rouge sur Violet : 2.92 (ÉCHEC)
- Vif rouge sur Violet 200 : 2.78 (ÉCHEC)
- Vif rose sur Violet 100 : 2.73 (ÉCHEC)
- Vif bleu sur Corail 200 : 2.64 (ÉCHEC)
- Vif vert sur Corail 200 : 2.64 (ÉCHEC)
- Vif bleu sur Violet 200 : 2.46 (ÉCHEC)
- Vif vert sur Violet 200 : 2.46 (ÉCHEC)
- Gris M27 sur Violet : 2.41 (ÉCHEC)
- Violet sur Rouge : 2.28 (ÉCHEC)
- Rouge sur Violet : 2.28 (ÉCHEC)
- Vif rose sur Corail 200 : 2.24 (ÉCHEC)
- Vif violet sur Charbon : 2.19 (ÉCHEC)
- Vif rose sur Violet 200 : 2.08 (ÉCHEC)
- Vif rose sur Rouge : 1.71 (ÉCHEC)
- Vif violet sur Violet : 1.65 (ÉCHEC)
- Jaune M27 sur Crème : 1.56 (ÉCHEC)
- Vif jaune sur Crème : 1.53 (ÉCHEC)
- Vif bleu sur Rouge : 1.45 (ÉCHEC)
- Vif vert sur Rouge : 1.45 (ÉCHEC)
- Crème sur Violet 200 : 1.43 (ÉCHEC)
- Violet 200 sur Crème : 1.43 (ÉCHEC)
- Jaune M27 sur Violet 100 : 1.43 (ÉCHEC)
- Vif jaune sur Violet 100 : 1.40 (ÉCHEC)
- Vif violet sur Rouge : 1.38 (ÉCHEC)
- Violet sur Charbon : 1.33 (ÉCHEC)
- Crème sur Corail 200 : 1.33 (ÉCHEC)
- Charbon sur Violet : 1.33 (ÉCHEC)
- Corail 200 sur Crème : 1.33 (ÉCHEC)
- Violet 100 sur Violet 200 : 1.31 (ÉCHEC)
- Violet 200 sur Violet 100 : 1.31 (ÉCHEC)
- Beige M27 sur Crème : 1.30 (ÉCHEC)
- Vif rouge sur Rouge : 1.28 (ÉCHEC)
- Violet 100 sur Corail 200 : 1.22 (ÉCHEC)
- Corail 200 sur Violet 100 : 1.22 (ÉCHEC)
- Beige M27 sur Violet 100 : 1.19 (ÉCHEC)
- Jaune M27 sur Corail 200 : 1.17 (ÉCHEC)
- Vif jaune sur Corail 200 : 1.15 (ÉCHEC)
- Beige M27 sur Violet 200 : 1.10 (ÉCHEC)
- Crème sur Violet 100 : 1.09 (ÉCHEC)
- Violet 100 sur Crème : 1.09 (ÉCHEC)
- Jaune M27 sur Violet 200 : 1.09 (ÉCHEC)
- Violet 200 sur Corail 200 : 1.07 (ÉCHEC)
- Corail 200 sur Violet 200 : 1.07 (ÉCHEC)
- Vif jaune sur Violet 200 : 1.07 (ÉCHEC)
- Gris M27 sur Rouge : 1.06 (ÉCHEC)
- Beige M27 sur Corail 200 : 1.03 (ÉCHEC)

## Lecture

- Sur Crème, 5 des 6 vives échouent AA en texte courant : les vives sont des couleurs d'aplat et de grands titres, jamais de corps de texte sur Crème.
- Sur Charbon (dark mode), 2 des 6 vives passent AA en texte courant et 3 passent seulement AA-large : le thème sombre est le territoire des vives pour les titres et les aplats, pas pour le corps de texte (corriger l'annexe de reconnaissance qui disait « les vives passent »).
- Violet sur Charbon = 1.33 : interdit. En dark mode, le violet de marque devient Violet 200 (10.80 AAA) ou Vif violet (2.19 ÉCHEC).
- Le gris de paragraphe de melenchon2027.fr (#707070) fait 4.83 sur Crème (AA, limite) : corps de texte en Charbon, le gris reste réservé aux métadonnées ≥ 16 px.
- Crème sur Rouge = 5.10 AA, Crème sur Violet = 11.62 AAA : boutons et bandeaux pleins autorisés dans les deux couleurs de marque.

## Porte de CI — paires de rôles de `design/tokens.json` (éliminatoire)

Chaque paire ci-dessous est **rendue** par l’interface : elle est lue dans `color-role` et mesurée à chaque exécution. Seuils : **4,5:1** pour du texte, **3:1** pour un filet, une bordure ou un anneau de focus. Un échec fait sortir `scripts/contrast.ts` avec un code non nul (porte de CI n° 5). C’est ce contrôle qui lève **H-DES-3** : `bg-elevated #2C2E2B` et `warn-bg #3A2A28` sont mesurés ici, plus jamais « proposés sans mesure ».

| Thème | Premier plan | Fond | Type | Ratio | Seuil | Verdict |
|---|---|---|---|---|---|---|
| light | `text` #212320 | `bg` #FFFCF4 | text | 15.45 | 4.5 | PASS |
| light | `text` #212320 | `bg-elevated` #FDEDFF | text | 14.13 | 4.5 | PASS |
| light | `text-muted` #212320 | `bg` #FFFCF4 | text | 15.45 | 4.5 | PASS |
| light | `text` #212320 | `verbatim-bg` #FDEDFF | text | 14.13 | 4.5 | PASS |
| light | `brand` #4C0297 | `bg` #FFFCF4 | text | 11.62 | 4.5 | PASS |
| light | `brand-on` #FFFCF4 | `brand` #4C0297 | text | 11.62 | 4.5 | PASS |
| light | `action` #D1271C | `bg` #FFFCF4 | text | 5.10 | 4.5 | PASS |
| light | `action-on` #FFFCF4 | `action` #D1271C | text | 5.10 | 4.5 | PASS |
| light | `warn-text` #212320 | `warn-bg` #FFD2CF | text | 11.59 | 4.5 | PASS |
| light | `wordmark` #4C0297 | `bg` #FFFCF4 | text | 11.62 | 4.5 | PASS |
| light | `wordmark-accent` #D1271C | `bg` #FFFCF4 | text | 5.10 | 4.5 | PASS |
| light | `verbatim-rule` #4C0297 | `verbatim-bg` #FDEDFF | non-text | 10.63 | 3.0 | PASS |
| light | `focus` #4C0297 | `bg` #FFFCF4 | non-text | 11.62 | 3.0 | PASS |
| light | `focus` #4C0297 | `bg-elevated` #FDEDFF | non-text | 10.63 | 3.0 | PASS |
| dark | `text` #FFFCF4 | `bg` #212320 | text | 15.45 | 4.5 | PASS |
| dark | `text` #FFFCF4 | `bg-elevated` #2C2E2B | text | 13.36 | 4.5 | PASS |
| dark | `text-muted` #FFFCF4 | `bg` #212320 | text | 15.45 | 4.5 | PASS |
| dark | `text` #FFFCF4 | `verbatim-bg` #2C2E2B | text | 13.36 | 4.5 | PASS |
| dark | `brand` #E5CBFF | `bg` #212320 | text | 10.80 | 4.5 | PASS |
| dark | `brand-on` #212320 | `brand` #E5CBFF | text | 10.80 | 4.5 | PASS |
| dark | `action` #F9C900 | `bg` #212320 | text | 10.09 | 4.5 | PASS |
| dark | `action-on` #212320 | `action` #F9C900 | text | 10.09 | 4.5 | PASS |
| dark | `warn-text` #FFFCF4 | `warn-bg` #3A2A28 | text | 13.29 | 4.5 | PASS |
| dark | `wordmark` #E5CBFF | `bg` #212320 | text | 10.80 | 4.5 | PASS |
| dark | `wordmark-accent` #F9C900 | `bg` #212320 | text | 10.09 | 4.5 | PASS |
| dark | `verbatim-rule` #E5CBFF | `verbatim-bg` #2C2E2B | non-text | 9.34 | 3.0 | PASS |
| dark | `focus` #F9C900 | `bg` #212320 | non-text | 10.09 | 3.0 | PASS |
| dark | `focus` #F9C900 | `bg-elevated` #2C2E2B | non-text | 8.73 | 3.0 | PASS |

- 28 paires de rôles mesurées, 0 en échec.
- Non couvert par cette porte, à écrire : le contraste de la **page rendue** (chaque nœud de texte contre son fond effectif, à sa taille et à sa graisse réelles), la ban list, le reflow 320 px, la police système à 130 % et 150 %, `prefers-reduced-motion` et `prefers-color-scheme`. Outils déjà écrits à promouvoir dans `scripts/` : `prototypes/mockups/finalistes/capture.mjs`, `prototypes/mockups/B/tools/contrast-check.mjs`, `docs/discovery/captures/2026-09-10/proto/integ-live.mjs`.
