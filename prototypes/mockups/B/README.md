# Direction B — « ludique cartes + mascotte » (maquettes T3, 9 septembre 2026)

Maquettes statiques (HTML + CSS, aucun framework, aucun build à l'exécution) de la direction B du canvas J3 (`PLAN-SESSION.md` T3, D0.5). Références de l'art direction : Wahl-O-Mat (une thèse = une carte, geste « passer » explicite), retenue de Duolingo (mascotte et progression, sans série ni ligue), orbes de Kinnu (une section = un orbe, progression locale non anxiogène). Rendu de référence : 390 × 844 px, `prefers-color-scheme` respecté, captures dans `docs/discovery/captures/2026-09-09/maquettes/B/`.

## La direction en dix lignes

1. **Tout est carte** : chaque objet (mesure, verbatim, chiffre, riposte, lecture) est une carte plate à coins 14 px sur Crème, surfaces Violet 100, filet 1 px Violet, jamais d'ombre floue (règle 8 d'`illustration-rules.md`).
2. **Un seul bloc 3D par écran** : le titre d'écran en Public Sans 900 capitales italique, chaque ligne décalée de 8 px, portée par une ombre pleine `6px 6px 0 Violet 200` (`shadow.block-3d`). Le chat, écran sans titre, n'en a aucun (règle 4).
3. **Le verbatim reste la matière** : Gowun Batang 17-18 px sur Violet 100, filet 4 px Violet, étiquette « Texte du programme » ; jamais d'italique, jamais tronqué (D3.2).
4. **La progression est un anneau** (orbe Kinnu) : 18 encoches, une par chapitre, colorées par partie quand le chapitre est parcouru, Violet 200 sinon ; la tortue vit au centre. Sur une section : anneau de 3 encoches autour du numéro de chapitre.
5. **La tortue originale** (D0.12) est dessinée en SVG à la main, ≤ 6 formes, grille 24 unités, tournée vers la droite, bichrome Violet / Violet 200 (bascule en sombre). Trois pistes rendues : A Signet, B Monotrait, C Marcheuse (`mascotte.html`). Les écrans d'app utilisent la piste C au repos et en état `walk`.
6. **La mascotte n'apparaît que là où le brief l'autorise** : carte « Ta lecture » (accueil militant), carte « Section lue » (fin de section), silhouette 24 px comme puce de progression. Jamais sur l'écran 0 par lien, jamais à côté d'un verbatim, jamais dans une bulle IA, un refus, un mode dégradé ni une StatCard (§2.4).
7. **Ludique, jamais potache** (D0.32) : zéro emoji, zéro score de personne, zéro « ! » (aucun n'était nécessaire), zéro mème ; la seule « récompense » est un pas de tortue et un compteur de lecture (« 1 section sur 3 »).
8. **Un seul CTA primaire par écran** en `action` (Rouge + Crème ; Vif jaune + Charbon en sombre) ; la navigation prend le bouton scindé étiquette + bloc flèche (« Suivant », « Reprendre ta lecture »).
9. **Écran 0 par lien composé en 53 / 47** (règle 1) : la matière (verbatim) en haut, l'aplat Violet en bas qui porte le titre à cheval sur la frontière, le CTA et la bande de signature (indépendance + attribution CC).
10. **Tout le contenu est réel et injecté par script** depuis `data/aec-2025.json` (version de corpus `d29c7422004ab27c`), `data/glossary.json`, `data/stat-cards.json`, `data/riposte.json` et `design/strings.json` (`tools/gen.mjs`) : 25 verbatims vérifiés identiques au corpus, chaînes du kit au caractère près (espaces insécables comprises).

## Les écrans

| Fichier | Écran | Choix propres à B |
|---|---|---|
| `home-link.html` | Écran 0, arrivée par lien WhatsApp (D0.19, indécis) | Carte du verbatim `c12-s01-k01` avec pastille de partie et « Mesure clé », puce « 3 min », aplat Violet portant le titre 3D, CTA inversé Crème « Comprendre en clair », lien « Explorer le programme », signature. Aucune mascotte, aucune barre d'onglets. Tient en un seul écran de 844 px. |
| `home-direct.html` | Écran 0, arrivée directe (militant) | Titre 3D « Ta munition, en dix secondes. », champ de recherche + CTA Rouge, carte Riposte (objection réelle `rip-13`, 15 objections), carte « La mesure du jour » (`c8-s04-k01`, verbatim), carte « Ta lecture » avec orbe à 18 encoches + tortue 96 px + légende des 4 parties + bouton scindé « Reprendre ta lecture », barre d'onglets Accueil / Chercher / Chapitres / Riposte. |
| `concept.html` | Carte-concept « règle verte » (D2.4) | Titre 3D, badge « Rédigé par nous, relu par Baoleka » (pseudonyme provisoire), En clair, Texte du programme (`c12-s01-k01`, source, « Lire la section entière », renvoi à `intro-p22`), Pourquoi ça compte avec la phrase 2022 isolée sous pastille « Contexte 2022 », Mesures liées (`c12-s01-m11`, `c14-s02-k01`), Objection fréquente, Termes voisins (seuls les 4 slugs existants sont rendus), CTA « Envoyer cette carte », attribution. |
| `section.html` | Lecteur de section `c12-s01` | Orbe de chapitre (anneau vert 1/3), titre 3D sur 4 lignes, chapeau verbatim, mesure clé mise en avant (Violet 100 + filet 2 px, Gowun Batang 700, CTA « Envoyer cette mesure » + « Copier le texte »), 11 mesures numérotées, carte « À savoir » avec la ligne loi 77-808 (`statcard.legal.no_sponsor` + `statcard.legal.margin` + lien vers l'encadré), carte « Section lue. La tortue avance d'un pas. » (état `walk`, jauge plate 1/3), bouton scindé « Suivant » vers `c12-s02`. |
| `chat.html` | Réponse + refus + mode dégradé | Mention IA `chat.ai_mention.v1` visible avant toute saisie (art. 50, D0.29), badge « IA · Mistral » sur chaque réponse, liant ≤ 2 phrases, verbatims cités avec « Extrait de … » ; refus sur Corail 200 (`refusal.title`, `refusal.lead`, « Passages voisins », `refusal.rephrase`) ; troisième échange en mode dégradé (`degraded.badge`, `degraded.lead`, `degraded.method_link`). Aucun bloc 3D. |
| `story.html` | Carte 1080 × 1920 de `c12-s01-k01` (360 × 640 css, ×3) | Coupe 53 / 47 : verbatim en haut, aplat Violet en bas, titre 3D « La règle verte, dans la Constitution. » à cheval sur la frontière, bande de signature (wordmark + `attribution.card`). Image en couleurs fixes (pas de mode sombre). |
| `mascotte.html` | Planche mascotte (écran supplémentaire) | Les 3 pistes à 512 px (contour + œil), 96, 48 et 24 px (silhouette pleine, sans œil) dans une fausse barre d'onglets, sur Crème **et** sur Charbon (schémas forcés). Capture à 1180 px (`mascotte.png`) et à 390 px (`mascotte-390.png`). |

Wordmark provisoire « AEC Discover » (`{appName}`, sprint de nommage T10), Public Sans 900 italique 24 px, jamais un logo tiers (D3.3).

## Paires de contraste utilisées (texte courant, `design/contrast-matrix.md`)

Contrôle automatique sur les 555 nœuds de texte visibles des 7 fichiers, clair et sombre (`tools/contrast-check.mjs`) : **0 paire sous 4,5:1**, minimum mesuré 5,10:1.

| Usage | Clair | Ratio | Sombre | Ratio |
|---|---|---|---|---|
| Corps de texte | Charbon sur Crème | 15,45 | Crème sur Charbon | 15,45 |
| Texte sur carte surélevée | Charbon sur Violet 100 | 14,13 | Crème sur #2C2E2B | 13,36 (calculé, hors matrice v0) |
| Titres, étiquettes, liens | Violet sur Crème | 11,62 | Violet 200 sur Charbon | 10,80 |
| Étiquette sur Violet 100 | Violet sur Violet 100 | 10,63 | Violet 200 sur #2C2E2B | 9,34 (calculé) |
| Badge plein, bouton marque, bulle | Crème sur Violet | 11,62 | Charbon sur Violet 200 | 10,80 |
| Puce, bulle utilisateur | Violet sur Violet 200 | 8,12 | Crème sur Violet | 11,62 |
| CTA primaire | Crème sur Rouge | 5,10 | Charbon sur Vif jaune | 10,09 |
| Refus, badge dégradé | Charbon sur Corail 200 | 11,59 | Crème sur #3A2A28 | 13,29 (calculé) |
| Aplat de l'écran 0 et de la story | Crème sur Violet | 11,62 | idem (aplat fixe) | 11,62 |
| CTA inversé sur l'aplat | Violet sur Crème | 11,62 | idem | 11,62 |

Éléments non textuels (seuil 3:1) : anneau et pastilles de partie 3 en Vif vert sur Crème 3,52, sur Charbon 4,39 ; partie 1 en Vif violet sur Crème 7,05 mais 2,19 sur Charbon, d'où la bascule de `--part-1` sur Violet 200 en sombre (HYPOTHÈSE). Ombre pleine Violet 200 : décor, hors seuil.

## Ce qui est volontairement laissé de côté

- **Aucun swipe, aucun « d'accord / pas d'accord », aucun score, rang, streak ou badge** (D0.18, D0.32, D5.4, D5.9) : la seule mécanique visible est la progression de lecture locale.
- **Aucune photo, aucune illustration tierce, aucun logo LFI ou M27**, aucune tortue officielle ni Hello Melro (D3.3, règle 7) : la matière est typographique ; la tortue est un SVG original du dépôt.
- **Pas de « Devine le % »** ni de chiffre en écran 0 (D0.20, D5.5) : le seul chiffre est la StatCard de la section, datée et sourcée.
- **Pas d'emoji, pas de point d'exclamation, pas de nom de mascotte** (clin d'œil lait-fraise hors maquettes : jamais en écran 0 ni sur une carte de partage, §2.8).
- **Pas d'état « milestone » animé** ni d'animation : les états `rest` et `walk` sont statiques (motion ≤ 320 ms à spécifier en T3 partie motion).
- **Pas de page À propos, Exactitude, Confidentialité** ni de mode marché ; pas de « Devine le chiffre » ni de « Laquelle est ici ? » (prototypes J3, D5.7).
- **Écran 0 par lien sans barre d'onglets** : l'indécis voit le passage, l'explication et un seul bouton.
- **Aucun JavaScript** : les formulaires sont inertes, les liens relient les écrans entre eux.

## Régénérer et capturer

```sh
node prototypes/mockups/B/tools/gen.mjs            # réécrit les 7 HTML depuis data/ et design/strings.json
node prototypes/mockups/B/tools/shoot.mjs [écran]  # captures clair + sombre (Playwright + Chromium)
node prototypes/mockups/B/tools/contrast-check.mjs # ratio de chaque nœud de texte
```

`shoot.mjs` et `contrast-check.mjs` importent le paquet `playwright` (non listé dans `package.json` du dépôt : `npm i -D playwright && npx playwright install chromium`, ou exécution depuis un dossier qui l'a). Les scripts de capture forcent les barres collantes (`.tabbar`, `.composer`) en position statique pour la capture pleine page ; dans un navigateur, elles restent collées en bas. Polices : copies des sous-ensembles latin de `design/fonts/` (OFL), chargées par `@font-face` local ; aucune requête externe.

## Statuts

- VÉRIFIÉ : verbatims identiques au corpus (25/25 par script), ratios de contraste (555 nœuds), 4 FontFace chargées (`document.fonts`), aucun débordement horizontal à 390 px.
- HYPOTHÈSE : piste de mascotte retenue (A/B/C, ou aucune) et son nom → personas-agents puis test humain (D11.1, §4 d'`illustration-rules.md`) ; code couleur des parties (`part-color`, dont Vif rose 2,98:1 sur Crème et Vif violet 2,19:1 sur Charbon en non-texte) ; variante de mention IA (v1 posée ici, jugement T9) ; pseudonyme du relecteur (D0.15) ; zone sûre de la bande de signature sur une story (spike T4).
