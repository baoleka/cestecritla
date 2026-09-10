# Maquettes — direction C « immersif, 4 mondes »

> Produit le 9 septembre 2026 (T3, canvas J3). HTML/CSS statique, sans framework ni script, polices auto-hébergées (`fonts/`, sous-ensembles latin OFL de `design/fonts/`). Captures : `docs/discovery/captures/2026-09-09/maquettes/C/` (390 × 844 CSS px, ×2, modes clair et sombre ; story 360 × 640 CSS px, ×3 = 1080 × 1920). Décisions appliquées : D0.19, D0.25, D0.29, D0.32, D2.4, D3.1-D3.8, D5.4, D5.5, D5.10, D11.1.

## La direction en dix lignes

1. **Un livre, quatre mondes.** Chaque partie de *L'Avenir en commun* a sa couleur (`tokens.json` `part-color`) ; ici la partie 3, « L'harmonie des êtres humains avec la nature », est **Vif vert #2E9959**. La couleur ne sert qu'en **aplats** : blocs de titre, gros chiffres, numéros de mesure, tuile du monde.
2. **Dark-first.** Le chrome (barre, héros, pied de page, fil du chat) est **toujours Charbon** ; les zones de lecture sont **Crème** par défaut (« mode lecture clair ») et passent en Charbon / Charbon éclairci `#2C2E2B` sous `prefers-color-scheme: dark` (rôles `color-role.dark`).
3. **Scrollytelling éditorial** : chaque écran s'ouvre sur un héros sombre, puis descend dans une zone de lecture claire ; les objets verticaux (écran 0 par lien, story) respectent la **coupe 53/47** de la règle 1 : la matière en haut (le verbatim en Gowun Batang sur Violet 100), l'aplat en bas, le titre chevauche la frontière.
4. **Le verbatim est la matière** (règle 7) : jamais de photo, jamais d'illustration tierce, jamais de logo (D3.3). Le texte du programme reste intact, en Gowun Batang, filet Violet, étiquette « Texte du programme ».
5. **Un seul bloc 3D par écran** (règle 4) : le titre d'écran en Public Sans 900 capitales, chaque ligne dans son bloc Vif vert décalé de 8 px, incliné de 5°, une ombre pleine `6px 6px 0` (aucun flou). Le chat, sans titre-affiche, n'a **aucun** bloc 3D.
6. **Gros chiffres** en affiche : « 65 % » (mesure du jour), « 83 % » (À savoir), numéros 1-11 des mesures — Crème 900 ≥ 24 px sur bloc Vif vert, donc AA-large seulement, jamais du texte courant.
7. **Zéro emoji, zéro « ! »**, registre tu, chaînes exactes de `design/strings.json` pour les boutons, la mention IA (`chat.ai_mention.v1`), le refus, le mode dégradé, l'attribution et la ligne d'indépendance.
8. **Mention IA nommant Mistral** sous le titre du chat, avant la première interaction (art. 50) ; badge « IA · Mistral » sur chaque réponse générée ; badge « Réponse directement extraite du programme » en mode dégradé, précédé de l'avis de quota.
9. **StatCard sous gabarit loi 77-808** (D5.5) : institut, date, « Commanditaire non précisé dans le livre », média de rediffusion, marge d'erreur, lien vers l'encadré. Jamais sur une image (D5.4).
10. **Wordmark texte « AEC Discover »** (placeholder `{appName}`), incliné comme le titre (règle 6), en tête à gauche et dans la bande de signature de la story avec `attribution.card`.

## Les six écrans

| Fichier | Écran | Contenu réel |
|---|---|---|
| `home-link.html` | Écran 0, arrivée par lien WhatsApp (D0.19, indécis) | matière = `c12-s01-k01` mot pour mot ; titre `home.link.title` en blocs ; `home.link.sent_by_hint`, `home.link.lead` (« Trois minutes, sans compte ni pub ») ; CTA `home.link.cta_primary` / `cta_secondary` ; zone « En clair » = `one_liner` de la carte `regle-verte` ; `privacy.no_account` |
| `home-direct.html` | Écran 0, arrivée directe (militant) | titre `home.direct.title` en blocs Vif jaune ; champ `search.placeholder` + `search.hint` ; **les quatre mondes** (titres officiels des parties, plages de chapitres) ; riposte `rip-13` (objection réelle + `c13-s03-k01`) ; mesure du jour `c12-s01-m04` avec « 65 % » ; `home.direct.cta_continue` + jauge plate |
| `concept.html` | Carte-concept « règle verte » (D2.4) | badge `concept.authorship.reviewed` ; « En clair » ; « Texte du programme » `c12-s01-k01` (19 px) + `intro-p22` replié ; « Pourquoi ça compte » avec la dernière phrase sous pastille « Contexte 2022 » ; « Objection fréquente » (texte + réponse) ; « Mesures liées » `c12-s01-m11`, `c14-s02-k01` ; 8 termes voisins ; `concept.source` ; `concept.read_section`, `concept.share` ; `attribution.short` |
| `section.html` | Lecteur de section `c12-s01` | titre officiel en 4 blocs ; chapeau `c12-s01-p01` ; mesure clé en évidence + `measure.share` / `measure.copy_text` ; les 11 mesures numérotées ; « À savoir » 83 % (`c12-s01-a01`) sous gabarit `statcard.legal.no_sponsor` + `statcard.legal.margin` + `statcard.legal.source_link` ; `share.button_whatsapp` / `share.button_copy` ; `progress.section_done`, jauge « 1 section sur 3 », `common.next` vers `c12-s02` |
| `chat.html` | Réponse, refus, mode dégradé | `chat.title`, `chat.intro`, `chat.ai_mention.v1` ; réponse (liant ≤ 2 phrases, `c12-s01-k01` + `c12-s01-m11`, `chat.cited_from`, `chat.read_full_section`, `chat.glossary_link`) ; refus « jets privés » (`refusal.title`, `refusal.lead`, `refusal.suggestions_label` avec `c13-s02-m06` et `c9-s02-m07`, `refusal.rephrase`) ; `quota.title` / `quota.lead` puis réponse dégradée (`degraded.badge`, `degraded.lead`, `c14-s02-k01`, `degraded.method_link`) ; `chat.placeholder`, `chat.send` |
| `story.html` | Carte de partage 1080 × 1920 pour `c12-s01-k01` | matière 53 % (verbatim 23 px CSS = 69 px export), titre « Ce que dit le texte, mot pour mot. » à cheval, `home.link.kicker`, chapitre et section, bande de signature 12 % (wordmark + `attribution.card`). Palette figée : une image ne suit pas le thème du lecteur |

Les chaînes à placeholder sont remplies ainsi : `{reviewer}` → « … » (pseudonyme non choisi, D0.15 / D2.9), `{chapter}` → « Chapitre 12 : Planification écologique », `{section}` → titre officiel, `{organisation}` → « Harris Interactive », `{dates}` → « juillet 2021 », `{resetTime}` → « 2 h », `{term}` → « règle verte », `{read}`/`{total}` → 3 / 18.

## Paires de contraste utilisées (ratios de `design/contrast-matrix.md`, ou calculés avec la même formule)

Texte courant (≥ 4,5:1 exigé) :

| Usage | Texte | Fond | Ratio |
|---|---|---|---|
| Héros, chat, pied de page ; zone de lecture en sombre | Crème | Charbon | 15,45 AAA |
| Zone de lecture (clair) | Charbon | Crème | 15,45 AAA |
| Verbatim (clair) | Charbon | Violet 100 | 14,13 AAA |
| Cartes et verbatim (sombre) | Crème | `#2C2E2B` | 13,36 (calculé) |
| Refus / dégradé (sombre) | Crème | `#3A2A28` | 13,29 (calculé) |
| Étiquettes, liens, wordmark (clair) | Violet | Crème | 11,62 AAA |
| Étiquette du verbatim (clair) | Violet | Violet 100 | 10,63 AAA |
| Étiquettes, liens, wordmark (sur Charbon) | Violet 200 | Charbon | 10,80 AAA |
| Bulle utilisateur du chat | Charbon | Violet 200 | 10,80 AAA |
| CTA primaire sur Charbon, et en sombre | Charbon | Vif jaune | 10,09 AAA |
| Titre `home-direct` (blocs jaunes) | Charbon | Vif jaune | 10,09 AAA |
| Étiquette du verbatim (sombre) | Violet 200 | `#2C2E2B` | 9,34 (calculé) |
| Refus / dégradé (clair) | Charbon | Corail 200 | 11,59 AAA |
| CTA primaire en zone de lecture (clair) | Crème | Rouge | 5,10 AA |
| Tuile monde 1 | Crème | Vif violet | 7,05 AAA |
| Tuile monde 2 | Charbon | Vif rose | 5,18 AA |

Grands textes seulement (≥ 24 px, ou ≥ 19 px gras ; ≥ 3:1 exigé) :

| Usage | Texte | Fond | Ratio |
|---|---|---|---|
| Titres en blocs, gros chiffres, numéros de mesure, tuile monde 3 | Crème | Vif vert | 3,52 AA-large |
| Tuile monde 4 | Charbon | Vif bleu | 4,40 AA-large |

Non-texte : bloc Vif vert sur Charbon 4,39 et sur Crème 3,52 (≥ 3 ✓) ; ombre pleine Violet 200 sur Charbon 10,80 ; filets Violet 200 sur Charbon 10,80.

Vérification : `audit-C.mjs` (Playwright, scratchpad) a mesuré la couleur calculée de chaque élément textuel contre son fond opaque le plus proche, sur les 6 fichiers × 2 thèmes : **0 paire de texte courant < 4,5:1, 0 paire de grand texte < 3:1** ; minimum texte courant 5,10 (Crème sur Rouge), minimum grand texte 3,52 (Crème sur Vif vert). Aucune requête externe, aucun débordement horizontal à 390 px, aucune cible < 24 px, 3 FontFace chargées (Public Sans droite et italique, Gowun Batang 400).

## Choix et écarts à documenter

- **Ombre 3D sur Charbon = Violet 200**, pas `shadow.block-3d-dark` (Violet #4C0297) : sur Charbon, Violet est invisible (1,33). Le token `block-3d-dark` est inutilisable tel quel quand le bloc est posé sur Charbon ; proposition : `6px 6px 0 Violet 200` dès que le fond est Charbon (à trancher pour `tokens.json` v0.2).
- **Étiquettes à 12 px** (le token dit 11 px) : plus lisible à 390 px, sans effet sur le contraste.
- **Vif vert = 3,52 seulement** : la direction s'appuie sur la vive la plus faible du nuancier ; elle tient l'AA-large de justesse, ce qui interdit tout texte < 24 px (ou < 19 px gras) sur les blocs. Si le canvas demande du texte plus petit sur l'aplat, il faudra une variante assombrie (piste HYPOTHÈSE de la règle 2, hors tokens).
- **Titre `home-link`** : `home.link.title` fait 8 mots (la règle 3 dit ≤ 6) ; conservé tel quel parce que c'est la chaîne validée. Alternative courte testée sur la story : « Ce que dit le texte, mot pour mot. » (6 mots).
- **Deux vives sur `home-direct`** : le héros (Vif jaune) et la bande des quatre mondes (quatre vives, une par tuile) sont deux objets distincts ; la règle 2 « une couleur dominante par objet » est respectée à l'échelle de l'objet, pas de l'écran.
- **Chat sans bloc 3D** (règle 4), titre en Crème 900 simple.
- **Mode sombre** : les zones de lecture deviennent Charbon (la frontière héros/lecture disparaît, seul un filet Violet 200 la marque) ; les cartes et le verbatim passent sur `#2C2E2B`. Les propositions v0 `#2C2E2B` et `#3A2A28` de `tokens.json` sont validées par le calcul ci-dessus.

## Ce qui est volontairement laissé de côté

- Aucune mascotte (la tortue attend la piste retenue en session 1, D3.8) ; `progress.section_done` la nomme sans la montrer.
- Aucun logo LFI ou M27, aucune photo, aucune illustration tierce (D3.3, règle 7).
- Aucune carte statistique sur l'image de partage (D5.4) ; « Devine le % » absent (D5.5).
- Aucune interaction (pas de JS) : recherche, partage, dépliage du second verbatim et envoi du chat sont des liens morts ; le composer du chat est statique pour que la capture pleine page reste lisible.
- Aucune animation ; `prefers-reduced-motion` neutralise tout par précaution.
- Aucun bandeau silence électoral, aucune page À propos, aucune riposte complète (écran séparé, hors périmètre des 5 écrans communs).
- Aucune variante « vous » (D0.25, à tester).

## Regénérer les captures

Depuis le scratchpad de session : `node pw/shoot-C.mjs` (Chromium headless, `chromium.launch()`, viewport 390 × 844, `deviceScaleFactor` 2, `colorScheme` clair puis sombre, `document.fonts.ready`, `fullPage: true` ; story 360 × 640 à ×3). Les fichiers HTML ont été produits par un petit générateur (`mockC/gen.mjs`, scratchpad) qui lit `design/strings.json`, `data/glossary.json`, `data/aec-2025.json`, `data/stat-cards.json` et `data/riposte.json` pour garantir que chaque chaîne et chaque verbatim sont copiés au caractère près ; le résultat est du HTML statique modifiable à la main.
