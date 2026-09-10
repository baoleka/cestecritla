# Maquettes — direction A « éditorial-typographique »

> Produites le 9 septembre 2026 (T3, canvas J3). HTML/CSS statiques, sans framework ni build, mobile 390 px, dark mode système. Contenu **réel** uniquement : `data/aec-2025.json` (corpus `d29c7422004ab27c`), `data/glossary.json` (carte `regle-verte`, `reviewed-human`), `data/stat-cards.json` (`c12-s01-a01`), `data/riposte.json` (`rip-04`), `design/strings.json` (chaînes exactes). Décisions appliquées : D0.19, D0.25, D0.29, D0.32, D2.4, D3.1-D3.8, D5.5, D11.1.
>
> Captures : `docs/discovery/captures/2026-09-09/maquettes/A/` (390 × 844 @2×, clair et sombre ; story 1080 × 1920 @3×).

## La direction en dix lignes

1. **Le verbatim est l'objet-héros.** Gowun Batang 22 px sur Violet 100, filet Violet 4 px, étiquette « Texte du programme » : c'est la « photo » des affiches (règle 1 et 7 des règles d'illustration), rien ne se pose dessus.
2. **La voix de l'app crie en capitales, puis se tait.** Public Sans 900, vraie italique, capitales, 34 px (40 px en écran 0), lignes décalées de 6 px en 6 px : le mouvement est dans la mise en page, pas dans une animation.
3. **Crème partout, Charbon pour lire, Violet pour structurer, Rouge pour agir.** Aucune autre couleur en texte ; la seule vive de l'écran est un carré de 10 px devant l'étiquette de partie (Vif vert, partie 3).
4. **Filets fins plutôt que cartes.** Les sections se séparent par un trait Violet 1 px ; les cartes (objection, À savoir) gardent le filet 1 px + coins 8 px du site, sans ombre.
5. **Un seul bloc 3D par écran : le wordmark** (ombre pleine `6px 6px 0 Violet 200`), petit, en haut à gauche ; les titres n'ont pas d'ombre.
6. **Chrome minimal.** Un en-tête (wordmark + un ou deux liens texte), pas de barre d'onglets, pas de mascotte, pas d'icône hors la flèche des boutons de navigation.
7. **Références The Pudding / NYT** : large blanc, un seul objet par bande, hiérarchie par la taille et non par la couleur, lecture verticale sans rupture.
8. **Dark mode** par `prefers-color-scheme` avec les rôles `color-role.dark` : Violet devient Violet 200, Rouge devient Vif jaune (bouton Charbon sur jaune), verbatim sur #2C2E2B.
9. **Story 1080 × 1920** : coupe 53/47 des affiches (verbatim en haut, aplat Violet en bas), titre en blocs Violet qui chevauche la frontière, bande de signature avec wordmark et attribution CC.
10. **Registre tu, typographie française** (espaces insécables des chaînes conservées, apostrophe ’ posée au rendu, « 6e » en exposant), aucun emoji, aucun « ! ».

## Les écrans

| Fichier | Écran | Contenu réel | CTA primaire |
|---|---|---|---|
| `home-link.html` | Écran 0, arrivée par lien WhatsApp (D0.19) | `c12-s01-k01` en héros, `home.link.*`, étiquette partie 3 | `home.link.cta_primary` « Comprendre en clair » (navigation, bloc flèche) |
| `home-direct.html` | Écran 0, arrivée directe (militant) | `home.direct.*`, champ `search.*`, riposte `rip-04` avec `c8-s04-k01`, mesure du jour `c6-s05-k01`, `progress.chapters_read` | `home.direct.cta_search` |
| `concept.html` | Carte-concept règle verte (D2.4) | badge `concept.authorship.reviewed`, `one_liner`, verbatim `c12-s01-k01`, `why_it_matters` avec pastille « Contexte 2022 », objection, `c12-s01-m11` + `c14-s02-k01`, termes voisins | `concept.share` « Envoyer cette carte » |
| `section.html` | Lecteur de section c12-s01 | chapeau `c12-s01-p01`, mesure clé, 11 mesures numérotées, StatCard `c12-s01-a01` au gabarit `statcard.legal.no_sponsor` + `statcard.legal.margin`, progression « Section 1 sur 3 » | `measure.share` « Envoyer cette mesure » |
| `chat.html` | Réponse, refus, mode dégradé | `chat.ai_mention.v1` (état vide, avant la première question), badge `chat.ai_badge`, liant de deux phrases, `refusal.*` avec `c13-s02-m07` et `c13-s02-m05`, `degraded.badge` + `degraded.lead` + `degraded.method_link` | `chat.send` |
| `story.html` | Carte de partage 1080 × 1920 (rendue à 360 × 640, DSF 3) | `c12-s01-k01`, `home.link.kicker`, `attribution.card`, titre `home.hook.did_you_know` | — |

Le lien discret « par phrase reformulée vers son premier appui » (D2.4) est rendu par un appel en exposant (`12.1`, `14.2`, `intro`) qui pointe vers l'identifiant du passage ; la phrase `contexte-2022` porte la pastille « Contexte 2022 » à la place.

## Paires de contraste utilisées (matrice `design/contrast-matrix.md`)

Texte courant (toutes ≥ 4,5:1) :

| Usage | Paire | Ratio |
|---|---|---|
| Corps, verbatim sur Crème | Charbon / Crème | 15,45 |
| Verbatim, chapeau sur Violet 100 | Charbon / Violet 100 | 14,13 |
| Titres, étiquettes, liens, filets | Violet / Crème | 11,62 |
| Étiquette « Texte du programme », localisation dans le verbatim | Violet / Violet 100 | 10,63 |
| Bouton primaire | Crème / Rouge | 5,10 (AA, texte 14 px gras capitales ≥ 19 px équivalent gras : AA-large 3:1 aussi satisfait) |
| Badge « IA · Mistral » | Crème / Violet | 11,62 |
| Mode dégradé | Charbon / Corail 200 | 11,59 |
| Sombre : corps | Crème / Charbon | 15,45 |
| Sombre : titres, liens, étiquettes | Violet 200 / Charbon | 10,80 |
| Sombre : verbatim sur `bg-elevated` #2C2E2B | Crème / #2C2E2B | 13,36 (calculé, hors matrice v0) |
| Sombre : étiquette dans le verbatim | Violet 200 / #2C2E2B | 9,34 (calculé) |
| Sombre : bouton primaire | Charbon / Vif jaune | 10,09 |
| Sombre : mode dégradé sur `warn-bg` #3A2A28 | Crème / #3A2A28 | 13,29 (calculé) |

Non-texte (≥ 3:1) : carré Vif vert de l'étiquette de partie sur Crème 3,52 et sur Charbon 4,39 ; filets Violet 200 sur Crème (1,43) sont **décoratifs** (séparateurs de liste) et ne portent aucune information ; en sombre le filet décoratif est `color-mix(#E5CBFF 40 %, #212320)`, dérivé, décoratif seulement.

Aucune vive en texte ; aucun Violet sur Charbon ; aucune ombre floue.

## Ce qui est laissé de côté, volontairement

- **Pas de mascotte** (variante « sans tortue » de D0.12 / O12) ; la progression est une barre plate et un compteur, la chaîne `progress.section_done` (qui nomme la tortue) n'est pas utilisée.
- **Pas d'aplat de couleur en écran 0** : la coupe 53/47 des affiches est gardée pour la story seulement ; sur l'écran 0 par lien, la « matière » (verbatim sur Violet 100) et l'aplat (Crème) se lisent comme deux bandes séparées par le titre.
- **Pas de barre de navigation**, pas d'icônes, pas d'illustration, pas de photo, pas de logo tiers (D3.3), pas de code couleur de partie au-delà d'un carré de 10 px.
- **Pas de mode « marché »** ni de chrono dans la riposte (hors écran 0, D5.11).
- **Pas d'animation** : seules les transitions d'opacité ≤ 120 ms sur les boutons, désactivées en `prefers-reduced-motion`.
- **Pas de « Devine le % »** (D5.5) : le chiffre 83 % est une StatCard de lecture, jamais sur une image.

## Notes techniques

- Polices : les quatre sous-ensembles woff2 de `design/fonts/` copiés dans `fonts/` avec leurs OFL ; chargement par `@font-face`, `font-display: swap`, aucune requête externe.
- `text-rendering: geometricPrecision` sur `body` : les sous-ensembles sont dépourvus de hinting et Chromium/FreeType arrondissait l'avance du « f » à 14 px (« of ficiel ») ; à vérifier sur Android et iOS réels (HYPOTHÈSE).
- Les fichiers HTML ont été produits par un script jetable du scratchpad de session (`genA/build.mjs`) qui injecte les chaînes exactes de `strings.json` et le texte du corpus ; les HTML livrés sont la source de vérité, éditables à la main.
- Capture : Playwright Chromium, 390 × 844, `deviceScaleFactor: 2`, `colorScheme` clair et sombre, `document.fonts.ready`, `fullPage: true` ; story 360 × 640 à `deviceScaleFactor: 3` (1080 × 1920 exactement).
