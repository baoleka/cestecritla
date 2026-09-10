# T3 — Direction artistique (canvas J3, 9 septembre 2026)

> **État du document (J2 soir, 9 septembre 2026).** Les trois directions du canvas J3 (A éditorial-typographique, B ludique cartes + mascotte, C immersif « 4 mondes ») ont été maquettées en HTML/CSS statique à contenu réel (5 écrans communs + story 1080 × 1920, clair et sombre, 390 × 844 @2×), puis jugées par le panel de 6 juges du plan (§1 T3), passées au critique « ça sent le faux / propagande / frivole », et soumises aux 7 personas-agents de la session 1 (D11.1). Ce document consigne les trois directions (§1), la grille des juges (§2), les odeurs du critique (§3), les choix des personas (§4), le verdict d'anatomie (§5), le registre (§6), la mascotte (§7), la proposition D3.9-D3.12 (§8), ce qui change avant les prototypes cliquables J3 (§9), **le bilan du prototype intégré déployé le 9/9 — perf et corrections appliquées — et de la session 2 des personas (§9 bis, ajouté le 10/9)**, et tout ce qui reste HYPOTHÈSE (§10, mis à jour).
>
> **Statuts.** VÉRIFIÉ = mesuré sur pièces au navigateur (contrastes, polices, débordements, fidélité des verbatims) ; DÉCISION (proposée) = à confirmer par l'utilisateur et à reporter dans `decisions.md` ; **HYPOTHÈSE (personas)** = tout jugement porté par les juges-agents et les personas-agents (D11.1) : un persona-agent n'est pas une personne, ces résultats restent des hypothèses jusqu'au test humain d'avant lancement. Le titre de travail « AEC Discover » figure encore sur les maquettes en placeholder `{appName}` ; le nom retenu est « C'est écrit là » (D10.2).

## 0. Verdict en dix lignes

1. **A (éditorial-typographique) est retenue comme socle** : 6 juges sur 6 la classent première (totaux 30 / 30 / 30 / 28 / 28 / 25, médiane pondérée 30/30), aucun zéro, aucune ligne rouge D0.32 ; le critique la déclare seule survivante ; 4 personas sur 7 l'enverraient à leur cousin, 1 seule la dit « officielle », 1 seule en aurait honte (au sens « pas en story », pas au sens D0.32).
2. **B (ludique)** obtient 22/30 en médiane et un vote éliminatoire (adversaire) pour une **démonstration fausse** dans le chat (refus sur les mégabassines alors que `c14-s02-m15` existe) ; c'est aussi la direction qui « a l'air officielle » (4/7 personas), mais son écran 0 par lien est le seul des trois qui tient en un écran, et c'est lui que M3 et N1 enverraient à leur cousin.
3. **C (immersif)** fait 15/30, aucun zéro mais la dernière partout ; 5 personas sur 7 la choisissent comme « celle qui me ferait honte » (vert + jaune + noir lu « flyer », « EELV », « jeu vidéo ») ; le critique la classe « propagande / frivole ». Elle apporte pourtant trois choses à reprendre : la ligne « Pas de compte, pas de cookie de suivi… » dès l'écran 0, « En clair » visible sans tap, les libellés « Envoyer sur WhatsApp » / « Copier le lien ».
4. **Hybride explicite proposé (D3.9)** : langage, typographie, chrome et story de A ; composition de l'écran 0 par lien empruntée à B (verbatim + titre + un seul CTA dans les 600 premiers px CSS, ligne d'indépendance visible sans défiler) ; de C, la ligne confidentialité en écran 0, « En clair » sous le verbatim et les libellés de partage explicites.
5. **Anatomie (D3.10)** : **dense corrigée** — verbatim visible sans tap (5 juges sur 6 ; 3 personas sur 7, à égalité avec l'explorable, et les trois qui veulent « vérifier avant de croire » la mettent première ou deuxième), mais avec le haut de carte de la progressive (titre + En clair + un seul bouton dans le premier écran) et l'explorable replié en bas comme module optionnel pour 2-3 concepts. La progressive est la plus rapide au chrono (médiane 12 s contre 22 s dense, 19 s explorable) mais cache le texte du programme derrière un « + », ce que 3 personas (M2, M4, N2) et 4 juges lisent comme suspect.
6. **Mascotte (D3.11)** : **Marcheuse**, seule piste reconnue « tortue » par 7/7 à 512 px et 7/7 à 24 px ; Signet éliminée (0/7, « valise », « camion »), Monotrait recalée à 24 px (3/7). Sans nom (unanimité de ceux qui répondent), jamais sur l'écran 0 par lien ni sur une carte de partage, jamais animée en boucle. L'absence de mascotte reste légitime (N2 « aucune », N1 et N3 indifférents) : la v1 (direction A) sort sans tortue, la Marcheuse est la seule piste conservée pour la jauge de lecture.
7. **Registre (D3.12)** : **tu par défaut maintenu** (D0.25) — 4 personas sur 7, et tous les moins de 35 ans ; les trois de plus de 45 ans préfèrent le vous pour « l'écran tendu à un inconnu », sans rejet du tu. Correctif de voix : la phrase d'arrivée par lien et la mention IA à rendre impersonnelles là où c'est possible, le tu réservé aux actions.
8. **Ce que la session lève pour le canvas** : jamais de refus en typo display ; objection toujours entre guillemets avec « On te dit : » ; « 83 % » jamais en numéral géant, institut et date sur la même ligne ; identifiants `c12-s01-k01` et appels en exposant hors du texte courant ; apostrophes typographiques et rendu des ligatures partout ; étiquettes ≥ 12 px ; « Envoyer / Copier » visible en moins de 10 s sur l'accueil militant.
9. **Défauts de maquette découverts** (à corriger avant tout nouveau jugement) : chat B mégabassines ; « of ficiel » / « EXT RAIT » (crénage des sous-ensembles, B et C) ; planche mascotte coupée à droite à 390 px (5/7 personas) ; « relu par … » vide (C) ; « ÉDITION 2025 » orphelin (C) ; titres tronqués « La bifurcation… » (B).
10. **Tout ce qui précède est HYPOTHÈSE (personas)** au sens de D11.1, sauf les mesures sur pièces (§1.5) : la direction, l'anatomie, la mascotte et le registre sont à confirmer par un test humain avant lancement (`13-tests-humains.md` §4).

## 1. Les trois directions

### 1.1 Cadre commun

- **Mêmes écrans, même contenu** (plan T3) : écran 0 par lien (D0.19, indécis : `c12-s01-k01` en héros), écran 0 direct (militant : recherche, riposte, mesure du jour), carte-concept « règle verte » (D2.4, `data/glossary.json` `regle-verte`, `reviewed-human`), lecteur de section `c12-s01` (chapeau, mesure clé, 11 mesures, StatCard `c12-s01-a01` sous gabarit 77-808), chat (mention IA nommant Mistral, réponse, refus, mode dégradé), story 1080 × 1920. Chaînes de `design/strings.json` au caractère près ; verbatims injectés par script depuis `data/aec-2025.json` (corpus `d29c7422004ab27c`).
- **Mêmes contraintes** : tokens `design/tokens.json` (D3.1-D3.4), polices auto-hébergées `design/fonts/` (D3.6), dark mode par `prefers-color-scheme` (D0.23), un seul bloc 3D par écran (règle 4), aucun logo tiers (D3.3), aucun emoji, registre tu (D0.25), 100 % des paires de texte courant ≥ 4,5:1 (matrice `design/contrast-matrix.md`).
- **Captures** : `docs/discovery/captures/2026-09-09/maquettes/{A,B,C,anatomies,finalistes}/`, Playwright Chromium 390 × 844 `deviceScaleFactor` 2, clair et sombre, pleine page ; story 360 × 640 × 3.
- **Grille** (plan T3) : 7 critères notés 0-2, pondérés charte ×3 (éliminatoire), contraste AA ×2 (éliminatoire), envie d'envoyer sur WhatsApp ×3, lisibilité 360 px ×2, risque de perception frivole ×2, « n'apporte rien vs l'officiel » ×2, coût d'implémentation ×1 ; maximum 30 ; agrégation par médiane ; les quatre points de D0.32 (potache, scores de personnes, mascotte enfantine ou moche, chiffres périmés mis en avant) valent zéro éliminatoire.

### 1.2 Direction A — « éditorial-typographique »

README : `prototypes/mockups/A/README.md` (direction en dix lignes, tableau des écrans, paires de contraste, exclusions, notes techniques). Feuille commune `prototypes/mockups/A/styles.css`.

Le verbatim est l'objet-héros (Gowun Batang 22 px sur Violet 100, filet Violet, étiquette « Texte du programme ») ; la voix de l'app en Public Sans 900 vraie italique capitales 34/40 px à lignes décalées ; Crème partout, Charbon pour lire, Violet pour structurer, Rouge pour agir ; filets fins plutôt que cartes ; un seul bloc 3D par écran, porté par le wordmark ; aucune mascotte, aucune icône, aucune barre d'onglets ; story en coupe 53/47. Références The Pudding / NYT.

| Écran | Fichier | Capture (clair) | Capture (sombre) |
|---|---|---|---|
| Écran 0 par lien | `prototypes/mockups/A/home-link.html` | `captures/2026-09-09/maquettes/A/home-link.png` | `…/A/home-link-dark.png` |
| Écran 0 direct | `prototypes/mockups/A/home-direct.html` | `…/A/home-direct.png` | `…/A/home-direct-dark.png` |
| Carte-concept règle verte | `prototypes/mockups/A/concept.html` | `…/A/concept.png` | `…/A/concept-dark.png` |
| Section c12-s01 | `prototypes/mockups/A/section.html` | `…/A/section.png` | `…/A/section-dark.png` |
| Chat (réponse, refus, dégradé) | `prototypes/mockups/A/chat.html` | `…/A/chat.png` | `…/A/chat-dark.png` |
| Story 1080 × 1920 | `prototypes/mockups/A/story.html` | `…/A/story.png` | — (palette figée) |

### 1.3 Direction B — « ludique cartes + mascotte »

README : `prototypes/mockups/B/README.md`. Feuille `prototypes/mockups/B/styles.css`, générateur `prototypes/mockups/B/tools/gen.mjs`, contrôle de contraste `tools/contrast-check.mjs` (555 nœuds de texte, 0 sous 4,5:1).

Tout est carte (coins 14 px, filet 1 px, surfaces Violet 100) ; un bloc 3D par écran sur le titre, une ombre par ligne ; progression en anneau à 18 encoches (orbe Kinnu) avec la tortue au centre ; tortue originale en SVG inline (trois pistes Signet / Monotrait / Marcheuse, planche `mascotte.html`), utilisée en état `rest` et `walk` ; barre d'onglets Accueil / Chercher / Chapitres / Riposte ; écran 0 par lien en coupe 53/47 sans mascotte. Références Wahl-O-Mat, retenue de Duolingo, orbes de Kinnu.

| Écran | Fichier | Capture (clair) | Capture (sombre) |
|---|---|---|---|
| Écran 0 par lien | `prototypes/mockups/B/home-link.html` | `…/B/home-link.png` | `…/B/home-link.dark.png` |
| Écran 0 direct | `prototypes/mockups/B/home-direct.html` | `…/B/home-direct.png` | `…/B/home-direct.dark.png` |
| Carte-concept règle verte | `prototypes/mockups/B/concept.html` | `…/B/concept.png` | `…/B/concept.dark.png` |
| Section c12-s01 | `prototypes/mockups/B/section.html` | `…/B/section.png` | `…/B/section.dark.png` |
| Chat | `prototypes/mockups/B/chat.html` | `…/B/chat.png` | `…/B/chat.dark.png` |
| Story 1080 × 1920 | `prototypes/mockups/B/story.html` | `…/B/story.png` | — |
| Planche mascotte (supplément) | `prototypes/mockups/B/mascotte.html` | `…/B/mascotte.png` (1180 px), `…/B/mascotte-390.png` | `…/B/mascotte.dark.png`, `…/B/mascotte-390.dark.png` |

### 1.4 Direction C — « immersif, 4 mondes »

README : `prototypes/mockups/C/README.md`. Feuille `prototypes/mockups/C/styles.css`.

Une couleur vive par partie du livre (`part-color`, HYPOTHÈSE de `tokens.json`) ; ici la partie 3 en Vif vert #2E9959 en aplats seulement (blocs de titre inclinés, gros chiffres « 65 % » / « 83 % », numéros des 11 mesures, tuile du monde) ; dark-first : chrome et héros toujours Charbon, zones de lecture Crème puis Charbon en sombre ; coupe 53/47 sur l'écran 0 par lien et la story ; « Le livre en quatre mondes » sur l'accueil direct ; aucune mascotte. Références scrollytelling éditorial.

| Écran | Fichier | Capture (clair) | Capture (sombre) |
|---|---|---|---|
| Écran 0 par lien | `prototypes/mockups/C/home-link.html` | `…/C/home-link.png` | `…/C/home-link.dark.png` |
| Écran 0 direct | `prototypes/mockups/C/home-direct.html` | `…/C/home-direct.png` | `…/C/home-direct.dark.png` |
| Carte-concept règle verte | `prototypes/mockups/C/concept.html` | `…/C/concept.png` | `…/C/concept.dark.png` |
| Section c12-s01 | `prototypes/mockups/C/section.html` | `…/C/section.png` | `…/C/section.dark.png` |
| Chat | `prototypes/mockups/C/chat.html` | `…/C/chat.png` | `…/C/chat.dark.png` |
| Story 1080 × 1920 | `prototypes/mockups/C/story.html` | `…/C/story.png` | — |

### 1.5 Anatomies de la carte-concept et paire tu/vous (style neutre)

README : `prototypes/mockups/anatomies/README.md` (contenu injecté, choix de rendu, contrôles §6, points ouverts §7). Trois anatomies de la même carte « règle verte » en tokens seuls, hors directions : `dense.html` (tout visible), `progressive.html` (« En clair » d'abord, 3 étapes d'accordéon), `explorable.html` (curseur « ce qu'on prélève » face à « ce que la nature refait en un an », 3 états statiques) ; `tu.html` / `vous.html` (même haut de carte, 6 chaînes réécrites). Captures `…/anatomies/{dense,progressive,explorable,tu,vous}.{light,dark}.png`.

**Mesures sur pièces (VÉRIFIÉ, 9/9/2026)** communes aux trois directions et aux anatomies : aucune occurrence de la ban list (Montserrat, #0098B6, #0e8a9c, ocre, #8B24D9, Φ, LogoTortue, LOGO-M27, WebGL) ; polices identiques à `design/fonts/` (SHA-256), zéro requête externe, zéro `<img>`, zéro emoji, zéro ombre floue ; 0 paire de texte courant sous 4,5:1 en clair et en sombre à 390 px (A : minimum 5,10 Crème/Rouge ; B : 555 nœuds, minimum 5,10 ; C : 6 fichiers × 2 thèmes, minimum 5,10 texte courant et 3,52 grand texte ; anatomies : minimum 5,10 clair, 9,34 sombre) ; largeur de document 390 px partout ; un seul bloc 3D par écran ; verbatims identiques au corpus (B 25/25, anatomies 15/15). Les paires sombres hors matrice v0 (Crème/#2C2E2B 13,36, Violet 200/#2C2E2B 9,34, Crème/#3A2A28 13,29) sont calculées avec la même formule et valident les surfaces v0 de `tokens.json`.

Les douze artboards des deux mécaniques finalistes (F1 « Tu savais que c'était dedans ? », F2 « Laquelle est ici ? », D5.7) sont dans `prototypes/mockups/finalistes/` (README, `styles.css` à tokens neutres, captures `…/finalistes/`) ; ils ne sont pas jugés ici, ils héritent de la direction retenue en J3.

## 2. La grille des juges

Six juges-agents (plan T3) : J1 Camille (militante pressée, M1), J2 Yanis (22 ans, non politisé, N1), J3 Martine (58 ans, indécise méfiante, N2), J4 militant sceptique de 45 ans (critère « honte à partager », D0.32), J5 auditeur charte connaissant l'ancienne identité bleu/ocre, J6 adversaire chasseur de captures. Chaque juge a reçu les 6 captures de chaque direction (clair et sombre), les README, `tokens.json`, la matrice de contraste, les règles d'illustration et `strings.json`. **Tous les scores ci-dessous sont HYPOTHÈSE (personas)** ; seuls les faits qu'ils citent sur pièces (ratios, ban list, polices) sont VÉRIFIÉ.

### 2.1 Notes par juge et par direction

| Juge | Dir. | Charte ×3 | Contraste ×2 | Envie WhatsApp ×3 | Lisibilité 360 ×2 | Frivole ×2 | Apporte vs officiel ×2 | Coût ×1 | Total /30 | Élim. |
|---|---|---|---|---|---|---|---|---|---|---|
| J1 Camille (M1, militante pressée) | A | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **30** | non |
| J1 Camille (M1, militante pressée) | B | 2 | 2 | 1 | 1 | 1 | 2 | 1 | **22** | non |
| J1 Camille (M1, militante pressée) | C | 1 | 1 | 1 | 1 | 1 | 1 | 1 | **15** | non |
| J2 Yanis (N1, 22 ans, non politisé) | A | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **30** | non |
| J2 Yanis (N1, 22 ans, non politisé) | B | 2 | 2 | 1 | 1 | 1 | 1 | 1 | **20** | non |
| J2 Yanis (N1, 22 ans, non politisé) | C | 1 | 1 | 1 | 1 | 1 | 2 | 1 | **17** | non |
| J3 Martine (N2, 58 ans, indécise méfiante) | A | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **30** | non |
| J3 Martine (N2, 58 ans, indécise méfiante) | B | 2 | 2 | 1 | 1 | 1 | 1 | 1 | **20** | non |
| J3 Martine (N2, 58 ans, indécise méfiante) | C | 1 | 1 | 0 | 1 | 1 | 1 | 1 | **12** | non |
| J4 militant sceptique 45 ans (honte à partager, D0.32) | A | 2 | 2 | 2 | 1 | 2 | 2 | 2 | **28** | non |
| J4 militant sceptique 45 ans (honte à partager, D0.32) | B | 2 | 2 | 1 | 2 | 1 | 1 | 1 | **22** | non |
| J4 militant sceptique 45 ans (honte à partager, D0.32) | C | 1 | 1 | 1 | 1 | 1 | 1 | 1 | **15** | non |
| J5 auditeur charte (ancienne identité bleu/ocre) | A | 2 | 2 | 2 | 2 | 2 | 1 | 2 | **28** | non |
| J5 auditeur charte (ancienne identité bleu/ocre) | B | 1 | 2 | 1 | 1 | 1 | 2 | 1 | **19** | non |
| J5 auditeur charte (ancienne identité bleu/ocre) | C | 1 | 2 | 1 | 1 | 1 | 1 | 1 | **17** | non |
| J6 adversaire chasseur de captures | A | 2 | 2 | 1 | 2 | 2 | 1 | 2 | **25** | non |
| J6 adversaire chasseur de captures | B | 2 | 2 | 2 | 1 | 1 | 2 | 1 | **25** | **oui** |
| J6 adversaire chasseur de captures | C | 1 | 2 | 1 | 1 | 1 | 1 | 1 | **17** | non |

### 2.2 Agrégation par médiane

| Direction | Charte ×3 | Contraste ×2 | Envie WhatsApp ×3 | Lisibilité 360 ×2 | Frivole ×2 | Apporte vs officiel ×2 | Coût ×1 | Total pondéré /30 | Votes élim. | Éliminée |
|---|---|---|---|---|---|---|---|---|---|---|
| A | 2 | 2 | 2 | 2 | 2 | 2 | 2 | **30** | 0 | non |
| B | 2 | 2 | 1 | 1 | 1 | 1,5 → 2 | 1 | **22** | 1 | non |
| C | 1 | 1 | 1 | 1 | 1 | 1 | 1 | **15** | 0 | non |

Totaux individuels : A : 30 / 30 / 30 / 28 / 28 / 25 (moyenne 28,5, médiane des totaux 29) ; B : 22 / 20 / 20 / 22 / 19 / 25 (moyenne 21,3, médiane des totaux 21) ; C : 15 / 17 / 12 / 15 / 17 / 17 (moyenne 15,5, médiane des totaux 16). La médiane 1,5 de B sur « apporte vs officiel » (notes 2, 1, 1, 1, 2, 2) est arrondie à 2 par l'agrégateur ; arrondie à 1, B ferait 20/30, ce qui ne change pas le classement.

**Votes éliminatoires et règle appliquée.** Aucun juge n'a mis de zéro sur un critère éliminatoire (charte, contraste), et aucun n'a levé l'un des quatre drapeaux D0.32 sur A ; un seul vote éliminatoire a été émis, sur B :

**J6 adversaire chasseur de captures**, direction B : Écran chat : « Il y a un moratoire sur les mégabassines ? » → « L'Avenir en commun ne traite pas de ça. » sur bulle corail d'alerte, alors que le corpus contient c14-s02-m15 : « Instaurer un moratoire sur le déploiement des méga-bassines ». Sans recadrage, la capture fait dire à l'app que le programme ne parle pas de Sainte-Soline : l'app retournée contre le programme, sur un sujet à haut risque. C'est le choix d'exemple, pas le langage visuel (correction en une ligne), mais tel que capturé l'écran est disqualifiant, et il révèle un vrai risque produit : le chemin de refus ne doit jamais s'allumer quand une mesure existe (ajouter « mégabassines » au jeu d'évaluation T6).

Faute de règle écrite pour les directions, on applique par analogie celle de la red team des mécaniques (D5.3 : ≥ 2 « kill » = éliminée) : B n'est pas éliminée par l'agrégateur, mais le motif est retenu comme **cas de test T6** (« mégabassines » dans le jeu d'évaluation : le refus ne doit jamais s'allumer quand une mesure existe) et comme défaut de maquette à corriger avant tout nouveau jugement. Deux drapeaux D0.32 « frôlés » sont consignés sans zéro : le refus du chat de A en capitales display (J1, J6, critique) et les pavés « 65 % » / « 83 % » de C (J1, J4, J6, critique).

### 2.3 Meilleur et pire écran par juge

| Juge | Dir. | Meilleur écran | Pire écran |
|---|---|---|---|
| J1 Camille (M1, militante pressée) | A | home-direct : « J'ouvre, j'ai l'objection sur le SMIC, le texte exact en dessous, le chapitre, et un bouton rouge. Dix secondes, c'est fait. » La story arrive juste derrière : le crochet « Tu savais que c'était dedans ? », le verbatim, le lien aec-discover.fr/m/… imprimé sur l'image, la signature CC. Je l'enverrais telle quelle dans la boucle du groupe. | chat : « Trois questions empilées, ça défile sans fin, et le refus en capitales géantes “L'AVENIR EN COMMUN NE TRAITE PAS DE ÇA.” c'est le seul écran de A qu'un adversaire peut capturer et retourner contre moi. » Sur un stand je ne taperai jamais une question ; le chat est un écran pour Yanis, pas pour moi. |
| J1 Camille (M1, militante pressée) | B | home-link : « Tout tient sur un seul écran : le passage, le titre “Voici ce que dit le programme, mot pour mot”, la pastille 3 min, un bouton. » C'est le meilleur écran d'arrivée des trois directions pour quelqu'un qui reçoit le lien sans contexte. | story : « Le titre “La règle verte, dans la Constitution.” est une vraie munition, mais un tiers de la carte est du violet vide, et il n'y a pas de lien sur l'image. Si quelqu'un fait suivre la capture sans le lien, ça mène nulle part. » Le chat vient juste après : le placeholder coupé « Ta question sur un mo », ça fait pas fini. |
| J1 Camille (M1, militante pressée) | C | section : « “Envoyer sur WhatsApp” écrit en toutes lettres, plus “Copier le lien” : c'est le seul endroit des trois directions où le bouton dit ce que je fais vraiment. » Le chapeau et la mesure clé en Gowun avec le filet sont propres. | home-direct : « Quatre pavés violet, rose, vert, bleu avec des gros chiffres 1 2 3 4, on dirait Kahoot. Et le “65 %” vert collé à “La mesure du jour” : quelqu'un fait une capture et dit que c'est un sondage bidon. » La riposte, ce que je viens chercher, est sous la ligne de flottaison. |
| J2 Yanis (N1, 22 ans, non politisé) | A | story (TU SAVAIS QUE C'ÉTAIT DEDANS ?) : « ça, je l'envoie tel quel, c'est une question, pas un slogan, et le texte est là mot pour mot ». | section : « onze mesures en petit serif à la suite, je scrolle, je scrolle… et le gros 83 % de 2021 tout en bas, je me dis c'est vieux avant de lire la ligne Harris ». |
| J2 Yanis (N1, 22 ans, non politisé) | B | home-link : « la pastille 3 MIN en haut, c'est exactement ce que je veux savoir avant de cliquer ; le passage dans une carte, puis le bloc violet avec le titre et un seul bouton, c'est clean ». | chat : « le refus dans un gros pavé rose saumon avec des cartes dans des cartes, on dirait une erreur ; et MESURE CLÉ partout, je sais pas ce que ça veut dire ». |
| J2 Yanis (N1, 22 ans, non politisé) | C | home-link : « le passage, le titre vert, et juste en dessous En clair sans cliquer : je comprends la règle verte en trente secondes sur le même écran, c'est le seul des trois qui fait ça ». | section : « des boutons en capitales sur trois lignes (SUIVANT : L'ORGANISATION DE L'ÉTAT…), des numéros blancs sur vert pas nets, et 1 section sur 3 qui coupe avec le 3 tout seul ». |
| J3 Martine (N2, 58 ans, indécise méfiante) | A | concept (carte règle verte) : « chaque phrase a son petit numéro 12.1, 14.2, je vois qui a relu (Baoleka) et la ligne Source en bas ; je peux aller vérifier moi-même » | story 1080×1920 : « la moitié du bas est violette, c'est la couleur du parti, ça fait affiche ; je ferais suivre le lien, pas l'image » |
| J3 Martine (N2, 58 ans, indécise méfiante) | B | section (ch. 12 s1) : « l'encadré du sondage dit tout : Harris Interactive, juillet 2021, commanditaire non précisé dans le livre, marge d'erreur, et un lien Voir l'encadré dans le programme » | concept (carte règle verte) : « En clair sans aucun renvoi vers le texte : je dois croire sur parole » ; et sur le chat, « le refus dans un encadré rose saumon, j'ai cru à un message d'erreur » |
| J3 Martine (N2, 58 ans, indécise méfiante) | C | home-link (écran 0 par lien) : « Pas de compte, pas de cookie de suivi, aucune trace de tes questions » écrit noir sur blanc, et un pied de page avec Confidentialité, Exactitude, Code source : « c'est exactement ce que je veux lire avant de cliquer » | concept (carte règle verte) : « Rédigé par nous, relu par … » avec des points de suspension (« relu par qui ? ») et l'objection « La règle verte, c'est juste un slogan. » sans guillemets ni « On te dit » : « je ne sais plus qui parle, l'appli ou le contradicteur » |
| J4 militant sceptique 45 ans (honte à partager, D0.32) | A | story.png : verbatim en haut, aplat Violet en bas, « Tu savais que c'était dedans ? », chapitre et attribution CC lisibles ; la seule carte que j'enverrais telle quelle dans une boucle familiale. | home-link.png : trois étiquettes, un verbatim de 22 px, un chapeau puis un titre de 40 px sur 4 lignes (5 à 360 px, « MOT. » seul) avant le premier bouton ; l'indécis arrivé par WhatsApp doit défiler pour trouver « Comprendre en clair ». |
| J4 militant sceptique 45 ans (honte à partager, D0.32) | B | home-link.png : le seul écran 0 des trois qui tient en 844 px — verbatim, titre 3D à cheval sur l'aplat Violet, un bouton, signature ; efficace pour l'indécis, à condition de régler le crénage « of ficiel ». | home-direct.png : tortue dans un orbe, quatre pastilles de couleur (dont le rose à 2,98), barre d'onglets, icône de partage — l'écran « appli de lecture ludique » qu'un militant de 45 ans ne montre pas à son beau-frère. |
| J4 militant sceptique 45 ans (honte à partager, D0.32) | C | story.png : la plus « affiche » des trois (verbatim en haut, blocs de titre inclinés à cheval sur la coupe, bande de signature), percutante — mais verte, donc pas reconnaissable comme famille 2027 sans le wordmark. | home-direct.png : quatre tuiles vives dont le rose, deux CTA pleins concurrents, un « 65 % » géant sans contexte — l'écran que je redoute de voir capturé et retourné contre nous. |
| J5 auditeur charte (ancienne identité bleu/ocre) | A | story (coupe 53/47 des affiches, verbatim en matière, titre à cheval sur la frontière, bande de signature wordmark + CC : l'objet le plus « affiche T27 » sans en copier un pixel) | section (le chapeau en Gowun Batang est posé directement sur Crème, sans filet ni fond Violet 100 : D3.2 n'est pas appliquée au premier verbatim de la page ; et le seul bloc 3D est le wordmark, pas le titre d'écran) |
| J5 auditeur charte (ancienne identité bleu/ocre) | B | home-link (un seul écran de 844 px, coupe 53/47, carte du verbatim avec « Mesure clé » et « 3 min », titre 3D par lignes sur l'aplat Violet, CTA inversé Crème, signature : la composition d'affiche la plus juste des trois directions) | home-direct (deux boutons pleins rivaux contre la règle 8 « un seul CTA primaire par écran » ; jauge en anneau à 18 encoches alors que la règle 8 impose une jauge « plate et droite » ; piste #3B3E3A hors tokens en sombre ; barre d'onglets à icônes) |
| J5 auditeur charte (ancienne identité bleu/ocre) | C | section (héros Charbon avec le titre officiel en 4 blocs Vif vert inclinés, verbatim chapeau et mesure clé traités à la lettre de D3.2, numéros de mesure dans la couleur de la partie, StatCard 83 % sous gabarit 77-808) | home-direct (cinq vives sur un même écran contre « jamais deux vives sur le même objet » ; héros Charbon en mode clair alors que Crème est le « fond par défaut » des tokens ; deux CTA pleins ; crénage cassé sur les étiquettes capitales) |
| J6 adversaire chasseur de captures | A | home-link (arrivée par lien) : le verbatim en premier, « Quelqu'un t'a envoyé ce passage. Le texte vient du livre officiel. », zéro décor à recadrer, rien qui ne soit pas dans le livre. | chat : le refus « L'AVENIR EN COMMUN NE TRAITE PAS DE ÇA. » en capitales 900 de 34 px. Avec « trottinettes » c'est inoffensif ; avec « Et sur la dette ? » ou « Et sur l'antisémitisme ? » l'app fabrique toute seule une affiche hostile, prête à poster. |
| J6 adversaire chasseur de captures | B | story : « LA RÈGLE VERTE, DANS LA CONSTITUTION. » en blocs décalés sur aplat Violet, verbatim en haut, bande de signature avec attribution CC. Format affiche, rien à recadrer, rien qui ne soit pas dans le livre. | chat : « Il y a un moratoire sur les mégabassines ? » — « L'Avenir en commun ne traite pas de ça. » (faux : c14-s02-m15). Deuxième cible : la carte « Section lue. La tortue avance d'un pas. » avec l'anneau segmenté façon Duolingo — « au rythme de la tortue » est un mème gratuit. |
| J6 adversaire chasseur de captures | C | home-link : le verbatim occupe le haut, « Quelqu'un t'a envoyé ce passage », CTA jaune net ; c'est l'écran de C qui offre le moins de prise. | concept : « La règle verte, c'est juste un slogan. Ça ne change rien de concret. » en gras, sans guillemets, sans « On te dit : » — un recadrage à 11 px près et c'est l'app qui l'affirme ; juste au-dessus, « Rédigé par nous, relu par … » : « relu par personne », capture gratuite. |

### 2.4 Résumé de chaque juge

- **J1 Camille (M1, militante pressée)** — anatomie : dense ; mascotte : Marcheuse. Totaux pondérés sur 30 : A = 30, B = 22, C = 15. Aucune direction éliminée. « A, je l'enverrais telle quelle : l'objection, le texte exact et le bouton rouge tiennent dans mes dix secondes, et la story a le crochet et le lien sur l'image. B, c'est une belle appli, je l'utiliserais pour lire, mais ma munition est à un tap de plus et la story a un tiers vide sans lien. C, ça claque, mais les quatre pavés de couleur font Kahoot et je ne le mettrais pas dans la boucle du groupe. » À reprendre de B dans A : l'écran d'arrivée par lien qui tient sur un seul écran et le bouton « Envoyer » avec icône ; à reprendre de C : le libellé « Envoyer sur WhatsApp » et « Copier le lien ».
- **J2 Yanis (N1, 22 ans, non politisé)** — anatomie : progressive ; mascotte : Marcheuse. A = 30, B = 20, C = 17. A gagne nettement : « je comprends ce que c'est en cinq secondes et ça ressemble à un article, pas à un tract ». B : pastille 3 MIN et barre d'onglets agréables, mais carte de partage « titre officiel », refus rose « erreur », trous de crénage (« of ficiel », « EXT RAIT »), titres tronqués. C : meilleure idée d'écran 0 par lien (En clair visible sans cliquer, bouton ENVOYER SUR WHATSAPP) mais vert dominant « appli d'écologie », plusieurs vives, Crème sur Vif vert au seuil, capitales qui débordent. Recommandation : partir de A, lui emprunter l'En clair visible sur l'écran d'arrivée de C et la pastille 3 MIN de B.
- **J3 Martine (N2, 58 ans, indécise méfiante)** — anatomie : dense ; mascotte : Monotrait. A 30/30 : la seule qui répond aux trois questions (d'où vient le texte, qui a écrit l'explication, ce qu'on garde de moi) sans que j'aie à chercher ; seule réserve, la moitié violette de la story qui fait affiche. B 20/30 : même rigueur graphique mais tortue, barre d'onglets et jauge (« est-ce qu'on me prend pour une enfant ? »), carte-concept sans renvois par phrase, chat qui emboîte trois cartes. C 12/30 : affiche de meeting, titres blancs sur vert au plancher (3,52), quatre vives sur un écran, deux boutons pleins, « relu par … », objection sans guillemets ; mais c'est elle qui écrit « Pas de compte, pas de cookie de suivi, aucune trace de tes questions » dès l'écran 0, phrase à reprendre dans A.
- **J4 militant sceptique 45 ans (honte à partager, D0.32)** — anatomie : dense ; mascotte : Marcheuse. A 28/30, B 22/30, C 15/30 ; aucun zéro. A est la seule que j'enverrais sans y penser ; à corriger : le titre de 40 px qui casse en 5 lignes à 360 px et les guillemets orphelins. B tient charte et contraste mais perd sur l'envie de partager (crénage, story à moitié vide, tortue-pictogramme dans un orbe) et sur le risque « appli ludique » ; pastille Vif rose à 2,98 et bloc Violet invisible sur Charbon à régler. C est la plus percutante en image mais la moins « famille 2027 », la plus fragile en contraste, cassée à 360 px, deux CTA concurrents, « 65 % » géant. Verdict : direction A, en empruntant à B le seul écran 0 par lien qui tient en un écran.
- **J5 auditeur charte (ancienne identité bleu/ocre)** — anatomie : dense ; mascotte : Marcheuse. Aucune direction éliminée : zéro élément de l'ancienne identité, zéro logo, polices identiques à design/fonts, 0 paire de texte courant sous 4,5:1 sur 19 écrans clair/sombre à 390 et 360 px. A 28/30 > B 19/30 > C 17/30. A est la plus fidèle à D3.1-D3.4 et aux 8 règles, sa seule liberté est le bloc 3D sur le wordmark ; son risque est de « ressembler au site officiel ». B casse la règle 8 (boutons rivaux, jauge en anneau), remplace l'étiquette « Texte du programme » par une pastille, crénage cassé jusque sur la story. C : chrome Charbon en mode clair et home à cinq vives. Recommandation : A comme socle, écran 0 par lien de B, titre-en-blocs coloré par partie de C pour les seuls en-têtes de section ; corriger partout ligatures/crénage et apostrophes droites.
- **J6 adversaire chasseur de captures** — anatomie : dense ; mascotte : Marcheuse. A : la moins attaquable ; sa seule faiblesse est le refus en capitales d'affiche sur le chat, qui fabrique une capture hostile pour n'importe quelle question hors programme. B : la plus désirable à partager (story et écran 0 de niveau affiche) mais éliminatoire tel que capturé : le chat fait dire à l'IA « ne traite pas de ça » sur les mégabassines alors que c14-s02-m15 instaure un moratoire ; correction d'une ligne, mais aussi un cas de test pour T6. C : conforme aux tokens mais hors charte perçue (vert/jaune/noir, tuiles numérotées, « TA MUNITION » en jaune géant), objection sans guillemets, « relu par … », refus jets privés et message de quota. Points communs : « Ta munition, en dix secondes. » et « Mode riposte » = vocabulaire guerrier facile à moquer ; objections toujours avec guillemets + « On te dit : » ; forme dense du « 83 % » avec institut et date sur la même ligne ; ne jamais titrer un refus en display.

Anatomie préférée par les juges : **dense 5, progressive 1**. Piste de mascotte : **Marcheuse 5, Monotrait 1** (J3 : « si vous y tenez, la Monotrait, ça ressemble à un logo, pas à un jouet ; la Marcheuse ressemble trop à la leur ; aucune me conviendrait aussi »).

## 3. Les odeurs du critique (« ça sent le faux / propagande / frivole »)

Verdict du critique : **A survit, B et C tombent.** A n'a aucun élément stock, aucune mascotte, aucune icône ; ses odeurs sont textuelles et corrigibles en une heure ; c'est aussi la seule direction qui a fixé la typographie (apostrophes, crénage), « elle a l'air finie, donc vraie ». B tombe sur la démonstration fausse du chat, le chrome de template et une tortue qui « reste un jouet à 96 px et une flaque à 24 px ». C tombe pour pastiche des affiches M27 sans logo (« engage le mouvement » visuellement), sélecteur de niveaux façon jeu vidéo et chiffres géants.

### A — éditorial-typographique — survit selon le critique

- chat : le refus « L'AVENIR EN COMMUN NE TRAITE PAS DE ÇA. » est composé dans la typo display des slogans (capitales 900 italiques) — un refus qui crie comme une affiche, slogan-like ; le refus devrait parler à la taille du corps.
- concept : appels de source en exposant « 12.1 » répétés sept fois dans un paragraphe de huit phrases (plus « 13.4 », « intro », et trois fois dans l'objection) — tic pseudo-académique, rigueur de façade plus que preuve ; à grouper en un appel par source.
- concept : puce « règle bleue » dans Termes voisins alors qu'aucune carte n'existe (5 puces rendues pour 4 slugs existants) — lien mort, catalogue gonflé.
- home-direct : bande titrée « MODE RIPOSTE » immédiatement suivie d'un bouton « MODE RIPOSTE » — étiquette en doublon, sent la maquette générée.
- home-link (et tous les écrans) : pied de page à cinq liens en capitales À PROPOS · EXACTITUDE · CONFIDENTIALITÉ · MENTIONS LÉGALES · CODE SOURCE sous l'écran 0 de l'indécis — « EXACTITUDE » lu seul sonne comme une auto-certification, disclaimer-like.
- section : « 83 % » en numéral display Violet (~48 px) sur un sondage Harris de juillet 2021 — le chiffre périmé est l'objet le plus gros de la carte, l'institut et la date arrivent trois lignes plus bas (drapeau D0.32).
- story : URL technique « aec-discover.fr/m/c12-s01-k01 » imprimée sur l'image de partage — identifiant machine visible, sent le prototype ; wordmark « AEC DISCOVER » anglo-tech (réglé par D10.2, à remplacer).
- concept : badge « Rédigé par nous, relu par Baoleka » — pseudonyme inconnu du lecteur : tant que rien ne mène à « nous », le badge ressemble à une accréditation inventée.
- home-direct : « TA MUNITION, EN DIX SECONDES. » + « TU RÉPONDS AVEC LE TEXTE : » — vocabulaire militaire sur le même écran que la ligne « Projet militant indépendant » (chaînes communes aux trois directions).

### B — ludique cartes + mascotte — tombe selon le critique

- chat : démonstration FAUSSE — à « Il y a un moratoire sur les mégabassines ? » l'app répond « L'Avenir en commun ne traite pas de ça. » alors que la mesure c14-s02-m15 dit mot pour mot « Instaurer un moratoire sur le déploiement des méga-bassines » : la maquette montre l'app niant le programme, le pire « ça sent le faux » possible.
- chat : les mêmes trois verbatims sont recyclés sur les trois échanges (règle verte, moratoire ×2, règle bleue ×2) — l'IA semble répondre la même chose à tout, remplissage de maquette.
- home-direct : barre d'onglets à icônes génériques (maison, loupe, livre, bulle) + loupe dans le champ + icône « partager » sur deux boutons — chrome de template d'app, stock-like, contraire au « aucune icône hors flèche » des règles.
- home-direct : carte « Ta lecture » = anneau à 18 encoches façon Apple Watch + tortue 96 px + seconde tortue 24 px collée en sticker dans le coin + légende à quatre pastilles vives (violet, rose, vert, bleu) sur un seul objet — gamification générique et quatre vives sur une carte (règle 2).
- section : « Section lue. La tortue avance d'un pas. » avec la Marcheuse tête levée — carapace demi-disque, tête en coin percée d'un œil blanc : à 96 px un jouet Duplo, à 24 px une flaque ; sur mascotte.html, Signet lit « savonnette à antenne » et Monotrait « arc-en-ciel / casque audio » : aucune des trois pistes ne lit « tortue » sans légende (risque « mascotte enfantine » D0.32).
- section : orbe de chapitre « 12 » avec arc vert 1/3 — anneau de progression type appli fitness, générique.
- home-link, story, chat : crénage cassé « EXT RAIT », « T EXT E », « ÉDIT ION », « of ficiel » et 31 apostrophes droites (') dans la voix de l'app face aux ’ du verbatim — sent le non-fini.
- story : slogan « LA RÈGLE VERTE, DANS LA CONSTITUTION. » à l'affirmatif — se lit comme une promesse de campagne déjà tenue, pas comme une citation ; puis ~350 px d'aplat Violet vide avant la signature.
- home-direct, concept, chat : badges pleins « MESURE CLÉ » / « MESURE » / « 15 OBJECTIONS » en capitales sur chaque carte — étiquettes marketing empilées, stock.
- concept : « ✓ Rédigé par nous, relu par Baoleka » — la coche transforme le badge en label de certification sans autorité derrière.

### C — immersif, 4 mondes — tombe selon le critique

- home-direct : « LE LIVRE EN QUATRE MONDES » — quatre tuiles vives numérotées 1-4 (violet, rose, vert, bleu) = sélecteur de niveaux de jeu vidéo ; « mondes » est un mot de jeu, enfantin ; quatre vives sur un écran (règle 2).
- home-direct, concept, section, story : titres en blocs Vif vert inclinés à ombre lavande sur Charbon — pastiche direct des affiches M27 ; sans logo (D3.3), rien ne distingue l'app de la campagne : elle « engage le mouvement » visuellement, propagande.
- home-direct : « TA MUNITION, EN DIX SECONDES. » en blocs Vif jaune sur noir — ruban d'avertissement / agit-prop.
- home-direct : « 65 % » en gros bloc vert au-dessus de la mesure du jour — un grand pourcentage en écran 0 qui se lit comme un chiffre de sondage (esprit D0.20 / D5.5) ; section : « 83 % » en bloc vert sur un sondage de 2021 — chiffre périmé mis en avant (D0.32).
- concept : « Rédigé par nous, relu par … » — points de suspension littéraux : badge vide, sent le faux et l'inachevé.
- home-link : le CTA « COMPRENDRE EN CLAIR » est suivi sur le même écran du bloc « EN CLAIR » complet — le bouton ne mène nulle part de nouveau, promesse creuse ; quatre boutons empilés (2 CTA + 2 navigations).
- concept : « Objection fréquente » composée en gras Public Sans sur Violet 100 sans guillemets ni « On te dit » — l'objection se lit comme une affirmation de l'app.
- concept : 8 puces « Termes voisins » dont 4 sans carte (grands projets inutiles, obsolescence programmée, hiérarchie des normes, règle bleue) — liens morts, catalogue gonflé.
- chat : « Et les jets privés, vous les interdisez ? » — l'utilisateur vouvoie l'app comme si c'était le parti ; passage voisin « niches fiscales sur le kérosène… e-commerce » hors sujet, le moteur paraît cassé ; « l'IA revient à 2 h. » ambigu (2 h du matin ?).
- section : « Section lue. La tortue avance d'un pas. » sans aucune tortue à l'écran — mascotte fantôme, phrase creuse ; quatre boutons de partage sur un écran (Envoyer cette mesure, Copier le texte, Envoyer sur WhatsApp, Copier le lien) — pousse-au-partage ; « 1 section sur / 3 » veuf.
- home-direct, concept : « CARTE-CONCEPT », « CHAT » en étiquettes de navigation — jargon interne dans l'interface ; placeholder tronqué « Un mot, une objection, » ; 37 apostrophes droites et crénage « TEXT E », « CHAPIT RE », « CET T E », « of ficiel ».
- story : blocs verts sur noir, attribution coupée « CC BY-NC- / SA 4.0) » — affiche de parti plus que carte de citation.

**Transverses aux trois directions (chaînes et données, pas la maquette)** : « munition / riposte / tu réponds avec le texte » sur le même écran que « projet militant indépendant » ; le badge « relu par Baoleka » sans page qui dise qui est « nous » (D0.15, D2.4) ; `rip-13` (« sans nucléaire, coupures ») répondu par l'objectif 100 % renouvelables, une esquive à retravailler dans `riposte.json` (D5.11) ; le wordmark « AEC Discover » anglo-tech, déjà remplacé par D10.2.

## 4. Session 1 par personas-agents (D11.1) — choix par direction

La matrice complète (74 lignes, 7 personas × 9-11 tâches, temps et verbatims) est dans `13-tests-humains.md` §1. Ici, les choix de fin de session et les drapeaux de la tâche 1 (5 s sur chaque accueil par lien).

### 4.1 Drapeaux par écran (tâche 1, 5 s par accueil)

| Persona | Dir. | Temps (s) | Enverrait | A l'air officiel | Honte |
|---|---|---|---|---|---|
| M1 | A | 3 | oui | non | non |
| M1 | B | 4 | oui | oui | non |
| M1 | C | 7 | non | non | oui |
| M2 | A | 5 | oui | non | non |
| M2 | B | 5 | non | oui | non |
| M2 | C | 5 | non | oui | oui |
| M3 | A | 5 | non | non | oui |
| M3 | B | 2 | oui | oui | non |
| M3 | C | 4 | oui | non | non |
| M4 | A | 5 | oui | non | non |
| M4 | B | 5 | oui | oui | non |
| M4 | C | 5 | non | non | oui |
| N1 | A | 5 | non | oui | non |
| N1 | B | 3 | oui | non | non |
| N1 | C | 5 | non | oui | oui |
| N2 | A | 5 | oui | non | non |
| N2 | B | 5 | non | oui | non |
| N2 | C | 5 | non | non | oui |
| N3 | A | 3 | non | oui | non |
| N3 | B | 5 | non | non | oui |
| N3 | C | 4 | oui | non | non |
| **Total /7** | A | | 4 | 2 | 1 |
| **Total /7** | B | | 4 | 5 | 1 |
| **Total /7** | C | | 2 | 2 | 5 |

### 4.2 Choix de fin de session

| Persona | Envoie au cousin | A l'air officiel | Ferait honte | Anatomie retenue | Registre | Mascotte |
|---|---|---|---|---|---|---|
| M1 | A | B | C | dense | tu | Marcheuse |
| M2 | A | C | C | explorable | vous | Marcheuse |
| M3 | B | B | A | explorable | tu | Marcheuse |
| M4 | A | B | C | dense | vous | Marcheuse |
| N1 | B | C | C | progressive | tu | Marcheuse |
| N2 | A | B | C | dense | vous | aucune |
| N3 | C | A | B | explorable | tu | Marcheuse |
| **Total (7)** | A 4, B 2, C 1 | B 4, C 2, A 1 | C 5, A 1, B 1 | dense 3, explorable 3, progressive 1 | tu 4, vous 3 | Marcheuse 6, aucune 1 |

Par groupe :

| Question | Militants (M1-M4) | Non-politisés (N1-N3) | Total (7) |
|---|---|---|---|
| Envoie au cousin | A 3, B 1 | B 1, A 1, C 1 | A 4, B 2, C 1 |
| A l'air officiel | B 3, C 1 | C 1, B 1, A 1 | B 4, C 2, A 1 |
| Ferait honte | C 3, A 1 | C 2, B 1 | C 5, A 1, B 1 |
| Anatomie retenue | dense 2, explorable 2 | progressive 1, dense 1, explorable 1 | dense 3, explorable 3, progressive 1 |
| Registre | tu 2, vous 2 | tu 2, vous 1 | tu 4, vous 3 |
| Mascotte | Marcheuse 4 | Marcheuse 2, aucune 1 | Marcheuse 6, aucune 1 |

**Lecture.** A est la direction qu'on **envoie au cousin** (4/7 ; M1 « on dirait une page de journal », M2 « un tiré à part », M4 « ça fait journal sérieux », N2 « ça ressemble à un extrait, pas à un tract ») ; ceux qui ne l'envoient pas (M3, N1, N3) sont les trois personas Instagram / attention courte et donnent tous la même raison : **pas de bouton dans le premier écran** (CTA vers 820 px CSS, sous la barre du navigateur intégré), « ça fait article », « devoir d'école ». B est la direction qui **a l'air officielle** (4/7 : « on dirait le site de Mélenchon », « les affiches qu'on colle ») ; c'est le signal « on dirait le site officiel » que le protocole §4 q6 des règles d'illustration demande de corriger, et la raison pour laquelle N3 en aurait honte (« t'es chez Mélenchon toi maintenant ? »). C est la direction qui **fait honte** (5/7 : « flyer de soirée étudiante », « affiche de festival », « affiche de concert », « pub », « jeu vidéo ») ; ses deux partisans (M3 pour la story, N3 pour le bouton jaune visible sans scroller) l'aiment pour ce que B et A n'ont pas : un objet coloré et un bouton dans les 700 premiers px.

## 5. Anatomie : verdict

### 5.1 Juges

Préférence : **dense 5, progressive 1**.

- **J1 Camille (M1, militante pressée)** (dense) : « Dense : le texte du programme est juste sous “En clair”, les mesures liées avec “Envoyer cette mesure” sont visibles sans rien ouvrir, je scrolle une fois et j'ai tout. » Progressive cache le verbatim derrière « Lire la suite » : un tap de plus, et sur le stand je n'ai pas ce tap. Explorable, le curseur « moins / autant / plus » est joli pour expliquer la règle verte à un cousin, mais ça ne s'envoie pas en capture et ça ressemble à un jeu. Réserve sur la dense : les identifiants « c12-s01-k01 » en chip et les soulignés pointillés dans « En clair » font outil de développeur, à masquer en production.
- **J2 Yanis (N1, 22 ans, non politisé)** (progressive) : « Progressive : je lis trois lignes En clair, un bouton Lire la suite, et les autres rubriques sont là avec un plus, je déplie ce qui m'intéresse. Sur WhatsApp c'est ce que je veux : comprendre vite, cliquer si j'ai le temps. » Dense : tout est là mais je scrolle trois écrans avant les mesures liées, et les identifiants c12-s01-k01 au milieu du texte, ça me parle pas. Explorable : le curseur est sympa, je comprends le principe en le bougeant (sous la limite / au-delà), mais « le curseur n'a pas d'unité » me laisse un doute (« ça prouve quoi ? ») et un slider en premier élément dans le navigateur WhatsApp, j'ai peur que ça glisse la page. Je le garderais en deuxième temps dans Pourquoi ça compte, pas en ouverture. Le vous (variante testée) sonne comme une administration ; le tu passe.
- **J3 Martine (N2, 58 ans, indécise méfiante)** (dense) : Dense, sans hésiter : « je veux tout voir sur une seule page, avec les petits identifiants (c12-s01-k01, intro-p22), la phrase soulignée en pointillés qui renvoie au texte, et le sondage daté sous mes yeux ». Le progressif cache cinq rubriques derrière des « + » : « quand on me cache quelque chose, je me demande pourquoi », et il faut trois écrans pour arriver au sondage. L'explorable, c'est un curseur « sans unité » qui « montre le principe, pas des chiffres » : « un curseur qui ne mesure rien ne prouve rien, on dirait un jouet pour me faire dire oui ». Réserve sur la dense : le mot « pseudonyme » en pointillés à la place du relecteur doit devenir un vrai nom, sinon « rédigé par nous » ne me dit pas qui.
- **J4 militant sceptique 45 ans (honte à partager, D0.32)** (dense) : Dense, sans hésiter : le verbatim est visible sans un seul tap, avec sa mesure clé étiquetée et sa source, et « Pourquoi ça compte », l'objection et le 83 % daté suivent dans le même défilement — « je tends mon téléphone à mon beau-frère et tout y est ». La progressive cache le texte du programme derrière un « + » : « on cache le texte officiel ? ça fait suspect », et l'indécis doit deviner que « Lire la suite » veut dire « voir le texte ». L'explorable est joli mais c'est un curseur sans unité : « le premier qui me demande “c'est quoi les chiffres ?” et je n'ai rien à répondre » — gadget qui peut se retourner en capture. Réserve sur la dense : le slot « pseudonyme » en pointillé et le badge d'identifiant « c12-s01-k01 » dans le corps ne doivent pas rester à l'écran final.
- **J5 auditeur charte (ancienne identité bleu/ocre)** (dense) : Dense : le verbatim (mesure clé + extrait intro-p22 balisé « […] ») est visible dès l'arrivée, sous l'étiquette « Texte du programme », filet Violet et fond Violet 100 — c'est l'application littérale de « le verbatim est la photo » (règle 1/D3.2) et du « verbatim ≤ 1 tap ». Progressive replie le texte du programme derrière un accordéon « + » : à l'écran 0 on ne voit que la reformulation « En clair », ce qui inverse la hiérarchie des voix (le programme parle en son nom, voice.md règle 3). Explorable est charté (Vif vert + Violet en aplats, curseur plat) mais ajoute un second objet graphique qui rivalise avec le verbatim et coûte un état interactif par carte ; à réserver à 2-3 concepts, pas au gabarit. Dans les trois, un seul bloc 3D (titre), aucune vive en texte, badge d'auteur conforme à D2.4.
- **J6 adversaire chasseur de captures** (dense) : Dense est la seule anatomie qu'on ne peut pas retourner : le texte du programme est visible sans un tap, chaque phrase reformulée porte son appui (« c12-s01-k01 »), et le chiffre « 83 % » est collé sur la même ligne à « Harris Interactive · juillet 2021 » — impossible de recadrer le pourcentage sans sa date. Progressive replie « Texte du programme » derrière un « + » et n'affiche que « En clair » : capture « ils réécrivent le programme et cachent le texte officiel ». Explorable ajoute un jouet dont la légende dit « Le curseur n'a pas d'unité : il montre le principe, pas des chiffres » — je titre « même leur app admet que la règle verte n'a pas d'unité », et la barre rouge « Ce qu'on prélève » se recadre en « LFI veut prélever plus ». Réserve sur dense : l'objection « « La règle verte, c'est juste un slogan… » » reste en gras plus gros que la réponse ; garder les guillemets et « On te dit : » partout.

### 5.2 Personas : secondes jusqu'à pouvoir réexpliquer, et anatomie retenue

| Persona | Dense (s) | Progressive (s) | Explorable (s) | Retenue | Réexplication (mots) |
|---|---|---|---|---|---|
| M1 | 8 | 7 | 14 | dense | 76 |
| M2 | 28 | 34 | 19 | explorable | 65 |
| M3 | 22 | 10 | 18 | explorable | 81 |
| M4 | 50 | 60 | 85 (échec < 60 s) | dense | 70 |
| N1 | 22 | 12 | 35 | progressive | 66 |
| N2 | 35 | 40 | 50 | dense | 76 |
| N3 | 14 | 10 | 18 | explorable | 70 |
| **Médiane** | 22 | 12 | 19 | dense 3, explorable 3, progressive 1 | |
| **Moyenne** | 25,6 | 24,7 | 34,1 | | |
| **≤ 60 s** | 7/7 | 7/7 | 6/7 | | |

Médianes par groupe (dense / progressive / explorable) :

| Groupe | Dense | Progressive | Explorable |
|---|---|---|---|
| Militants (M1-M4) | 25 | 22 | 18,5 |
| Non-politisés (N1-N3) | 22 | 12 | 35 |

Les temps sont des estimations de personas-agents sur captures statiques (le curseur de l'explorable n'a pas été manipulé), à lire comme des ordres de grandeur relatifs, pas comme un chrono.

### 5.3 Qualité des sept réexplications

Les 7 réexplications (verbatim intégral dans `13-tests-humains.md` §1.4) tiennent toutes en 65-81 mots et contiennent les deux moitiés de la règle : **la limite** (« pas plus que ce que la nature refait / reconstitue ») et **la Constitution** (7/7). Cinq ajoutent les grands projets inutiles ou le moratoire (`c12-s01-m11`), trois la règle bleue (`c14-s02-k01`), deux la réparation des dégâts (`intro-p22`). Fidélité : 7/7 sans invention de mesure. Deux approximations récurrentes, à corriger dans les maquettes plutôt que chez les lecteurs :

- **« dans l'année » / « en un an »** (M1, M3, M4, N1, N2, N3) : le programme dit « sur une période donnée » (`intro-p22`) et rien de tel dans `c12-s01-k01` ; « en un an » vient de la question du sondage Harris (`c12-s01-a01`) reprise par l'étiquette de l'explorable. M2 (militant qui compare au texte) l'a repérée : « corrigez l'étiquette, sinon quelqu'un me la sortira ».
- **« interdit » / « dans le rouge »** (M3, N3) : mot de l'encadré sondage et du verdict 3 de l'explorable, pas de la mesure clé (« ne prélève pas davantage ») ; déjà signalé dans `anatomies/README.md` §7.

Deux réexplications sont formulées avec l'image des barres (M3 « si on prélève moins ou autant, ça passe ; si on dépasse, c'est interdit », N3 « si tu prends plus, t'es dans le rouge ») : l'explorable donne l'image mentale, la dense donne la preuve. N2 restitue en plus la source (« c'est dans leur livre, chapitre 12, j'ai lu la phrase »).

### 5.4 Verdict

- **Dense** gagne chez les juges (5/6) et chez les personas qui lisent tout d'un scroll ou veulent vérifier (M1, M4, N2 ; M2, qui compare au texte, la met deuxième derrière l'explorable) : « tout est là sans cliquer », « je tends mon téléphone et tout y est », « on cache le texte officiel ? ça fait suspect » pour la progressive. Ses défauts sont unanimes et corrigibles : le chip `c12-s01-k01` et les pointillés dans le texte courant (7/7 personas, 3 juges), le placeholder « pseudonyme », le « 83 % » de 2021 en gros chiffres (M2, M3, N1), la longueur (M3, N1, N3 : « un mur », « biblio de cours », « trois écrans sans respirer »).
- **Progressive** est la plus rapide au chrono (médiane 12 s ; N1, N3, M3 la préfèrent à la lecture) et son **étape 1 est le meilleur écran 0 de carte** (titre + En clair + un seul CTA, pas de code inline). Mais elle cache le verbatim derrière un « + » (M2, M4, N2 : « je ne le crois pas sans le texte »), ambiguïté « Lire la suite » / « + » (M4, N2), et « Envoyer » invisible à l'étape 1 (M1).
- **Explorable** donne la meilleure image (M2 « c'est le schéma que je fais au tableau », M3, N3) et est le seul écran « filmable en story », mais c'est le plus lent (médiane 19 s, 85 s pour M4, hors délai), la poignée est trop petite pour M4, l'ordre repousse « En clair » et la Constitution sous les barres (M3, N1, N2), un curseur sur un sujet politique réveille le réflexe Elyze (N2), et en capture « exercice de CM2 » (M1) ou « le curseur n'a pas d'unité » retourné en « même leur app admet que la règle verte n'a pas d'unité » (J6).

**Proposition (D3.10) : dense corrigée**, c'est-à-dire l'ordre de la dense avec, comme premier écran, l'étape 1 de la progressive (titre, badge d'auteur, En clair sans code ni pointillé, un seul bouton « Envoyer cette carte » ou « Lire la suite » selon l'entrée), le verbatim immédiatement dessous sans tap, l'objection avec guillemets et « On te dit : », « À savoir » après l'objection avec institut et date sur la ligne du chiffre, et l'explorable **replié en bas** (« Voir le principe ») pour les seuls concepts qui s'y prêtent (règle verte, règle bleue), jamais en ouverture. Le détail du composant est en §9.

## 6. Registre tu / vous

Personas : **tu 4, vous 3** ; juges : 1 réserve sur 6 (J3 Martine : « le tu me tutoie sans me connaître »).

| Persona | Choix | Verbatim |
|---|---|---|
| M1 | tu | Tu, sans hésiter. « Pose ta question » c'est le ton du groupe et du marché ; « Posez votre question » ça fait chatbot de banque ou site des impôts. Et « ce que l'on prend à la nature » au lieu de « ce qu'on prend », ça rallonge pour rien. La seule fois où le vous passerait mieux, c'est pour la tante de 62 ans du groupe familial, mais c'est moi qui envoie, et le message d'accompagnement je l'écris comme je veux. |
| M2 | vous | Entre militants on se tutoie, mais l'écran d'arrivée, c'est mon cousin ou une collègue de 58 ans qui l'ouvrent. « Quelqu'un t'a envoyé ce passage » leur dira que l'appli les connaît, ce qui est faux. « Posez votre question » ne perd rien, c'est le même écran, même longueur. Vous à l'arrivée par lien ; tu, si vous y tenez, dans les jeux pour militants. |
| M3 | tu | Tu, sans hésiter. « Quelqu'un t'a envoyé ce passage », c'est un pote qui parle ; « Quelqu'un vous a envoyé ce passage », c'est le service client. « Posez votre question » sur le violet, on dirait le site des impôts. Le vous ajoute même « ce que l'on prend », ça fait dissertation. Mais le tu doit rester sobre comme là, pas « hey toi ». |
| M4 | vous | Entre camarades on se tutoie, ça ne me dérange pas. Mais là c'est une machine qui me tutoie, et surtout c'est un écran que je vais tendre à un monsieur de 70 ans sur le marché. « Posez votre question », ça respecte les gens. Le vous ne coûte rien à personne ; le tu peut en braquer certains. Cela dit je ne suis pas la cible des jeunes : si eux préfèrent le tu, je m'en remettrai, ce n'est pas une ligne rouge. La phrase sur Mistral, « elle choisit les passages, elle ne les écrit pas », est claire dans les deux, c'est ça l'important. |
| N1 | tu | « Pose ta question », c'est un pote qui me parle. « Posez votre question », c'est la CAF ou un prof. Je garde le tu. Par contre « Tu parles à Mistral, une IA française hébergée chez Cloudflare » : Mistral, Cloudflare, je connais pas, mais au moins ça dit clairement que c'est une IA et qu'elle invente pas le texte, ça me va. |
| N2 | vous | « Quelqu'un vous a envoyé ce passage », je préfère. Ma collègue me tutoie, mais un site que je ne connais pas, non. Le « tu » ça fait copain qui veut me vendre quelque chose, comme les applis. Le « vous » me dit : on vous respecte, prenez votre temps. |
| N3 | tu | Tu, direct. « Posez votre question » c'est ma banque. « Pose ta question » c'est un pote qui a le bouquin. |

**Lecture.** La ligne de partage est l'âge, pas le militantisme : les quatre personas de moins de 35 ans (M1 34, M3 24, N1 22, N3 19) choisissent tu (« vous = chatbot de banque, site des impôts, CAF, service client, ma banque ») ; les trois de plus de 45 ans (M2 45, M4 62, N2 58) choisissent vous, pour un motif commun : l'écran est **tendu ou envoyé à un inconnu** (« un monsieur de 70 ans sur le marché », « mon cousin ou une collègue de 58 ans », « un site que je ne connais pas »). Aucun des trois ne fait du tu une ligne rouge (M4 : « si les jeunes préfèrent le tu, je m'en remettrai »). Deux phrases concentrent l'objection : « Quelqu'un t'a envoyé ce passage » (M2 : « leur dira que l'appli les connaît ») et la mention IA « Tu parles à Mistral… ». Quatre personas, dans les deux registres, citent « elle choisit les passages, elle ne les écrit pas » comme la bonne promesse (M1, M2, M4, N1) : indice fort pour la variante v2 au jugement T9.

**Proposition (D3.12)** : tu par défaut maintenu (D0.25, cibles P1 18-30), sobre (« pas hey toi », M3) ; **phrase d'arrivée par lien et mention IA réécrites à l'impersonnel** quand c'est possible (le tu ne porte que les actions : « Pose ta question », « Envoyer cette carte ») ; le kit vous reste dans `strings.json` comme variante KV pour un test humain ciblé sur les plus de 45 ans. HYPOTHÈSE (personas) jusqu'au test humain.

## 7. Mascotte : pistes et verdict

Protocole §4 de `design/illustration-rules.md` appliqué sur la planche B (`mascotte.png`, `mascotte-390.png`, crème et charbon) : reconnaissance « tortue » à 512 px et à 24 px, trois mots, « c'est la tortue de Mélenchon ? », nom ou anonymat.

| Persona | Piste | Reconnue tortue (réussite) | Temps (s) | Honte | Verbatim |
|---|---|---|---|---|---|
| M1 | Signet | non | 5 | oui | C'est quoi ? Une valise avec des pattes, un dossier. Je ne vois pas une tortue avant qu'on me le dise. À 24 px c'est un camion. Et sur mon téléphone la tête est coupée à droite, on ne voit qu'un rectangle lavande : ça fait amateur. Trois mots : valise, bizarre, dossier. Jamais. |
| M1 | Monotrait | oui | 2 | non | Ça, c'est une tortue, et ça fait logo, pas peluche. Le trait épais violet, propre, sérieux, ça ferait une bonne icône d'app. L'œil rond blanc dans la tête est un peu fixe. À 24 px, par contre, c'est un dôme avec une petite queue, on dirait un casque ou un bouclier ; il faut savoir. Trois mots : logo, propre, sérieux. C'est pas la tortue de Mélenchon, rien à voir, tant mieux. |
| M1 | Marcheuse | oui | 1 | non | Tortue tout de suite, et à 24 px aussi, c'est la seule que je reconnais dans la barre d'onglets sans réfléchir. Pas de sourire, pas de gros yeux, pas de joues : sobre, elle marche, c'est tout. Trois mots : simple, lisible, tenace. C'est la tortue de Mélenchon ? Ça y fait penser dans l'esprit, mais non : la sienne est debout, en 3D violette, celle-ci est à plat et de profil. Je la garderais, à condition qu'elle reste dans la jauge et jamais sur ce que j'envoie. |
| M2 | Signet | non | 5 | oui | À 512, c'est une valise avec une allumette, ou un pain de mie avec une clé. À 24, un camion vu de côté. Personne ne dira « tortue » sans la légende. Et sur mon téléphone, la tête est coupée à droite. Elle sort. |
| M2 | Monotrait | oui | 5 | non | À 512 : un arc-en-ciel avec un bec, un logo de mutuelle. À 96 ça devient une tortue, à 24 un dôme avec un bout : tortue, oui, ou un casque. Pas moche, pas enfantine, mais abstraite ; l'œil blanc et noir dans la tête en goutte fait dessin animé. Je la garderais comme monogramme dans le wordmark, pas comme personnage. |
| M2 | Marcheuse | oui | 5 | non | Une tortue, tout de suite, à 512 comme à 24. Pas de sourire, pas de joues, deux violets : sobre. Ça ressemble en esprit à celle de la campagne, mais de profil, à plat, sans quadrillage : on ne pourra pas dire que c'est la même. L'œil blanc rond au bout du museau lui donne un air de poisson à 96, à reculer vers le cou. Sans nom, et elle ne parle pas. |
| M3 | Signet | non | 4 | non | À 512 je vois une valise à roulettes ou une remorque avec une tête au bout d'un bâton ; il me faut la tête pour dire tortue. À 24 c'est un camion, franchement un petit bus violet. L'idée « la carapace c'est un livre », je la comprends quand on me l'explique, pas en la regardant. |
| M3 | Monotrait | non | 2 | non | Le plus graphique des trois, l'arc violet avec l'œil ferait un super monogramme pour le wordmark. Mais à 24 c'est un galet ou un casque, on perd la tortue. En sombre, en lavande sur noir, c'est encore plus beau qu'en clair. |
| M3 | Marcheuse | oui | 1 | non | Tortue direct, à 512 comme à 24, clair comme sombre. Ça fait picto propre, genre signalétique, pas clipart, pas mignon-forcé : pas de sourire, pas de joues, elle avance. Même famille que la tortue de la campagne mais pas la même : plate, de profil, pas de quadrillage. Je garde celle-là, petite, dans la barre et dans la jauge. |
| M4 | Signet | non | 5 | non | En grand, c'est une brique ou un canapé avec une poignée, je ne vois pas la tortue tout de suite. En petit dans la barre, c'est un camion. Et sur mon téléphone la grande est coupée à droite, on ne voit même pas la tête. Ce n'est pas celle de Mélenchon, mais ce n'est pas une tortue non plus. |
| M4 | Monotrait | oui | 5 | non | Ça, c'est une tortue, un dessin au trait, sobre, pas enfantin, un peu comme un logo de syndicat. En petit dans la barre c'est une bosse avec une tête, ça passe si on me le dit. Ce n'est pas la tortue de Mélenchon : la sienne est debout, en relief, mauve ; celle-là est à plat, de profil. |
| M4 | Marcheuse | oui | 5 | non | Tortue tout de suite, même en petit dans la barre : pour mes yeux c'est la plus lisible. Un peu jouet en grand, mais pas moche. Elle ressemble à l'esprit des affiches, pas à la tortue officielle. Je la garde à une seule condition : qu'elle ne se mette pas à marcher toute seule pendant que je lis, sinon je la vire. |
| N1 | 3 pistes | oui | 25 | non | Signet en grand : un bus violet avec une tête, ou un wagon. En petit dans la barre, c'est carrément l'icône « transports ». Monotrait en grand : un arc-en-ciel avec une tête, ok c'est une tortue après une seconde, ça fait logo, c'est stylé. En petit, c'est une tache, je dirais un escargot. Marcheuse : tortue direct, en grand comme en petit. Ça fait un peu appli pour apprendre les langues, mais c'est propre, pas bébé. C'est la tortue de Mélenchon ? Ça y ressemble en esprit, mais c'est pas la même. |
| N2 | 3 pistes | oui | 15 | oui | Le premier, avec le rectangle et le trait, on dirait un camion ou une valise avec une tête, pas une tortue. Le deuxième, l'arc-en-ciel avec des pattes… ah oui, une tortue, mais il faut chercher. Le troisième, c'est une tortue tout de suite. Mignonne. Un peu dessin pour enfants. |
| N2 | 3 pistes | oui | 15 | non | En tout petit dans la barre, le premier c'est un tracteur. Le deuxième et le troisième, une tortue, oui, la troisième la plus nette. Franchement, je garderais aucune : la petite maison et la bulle je comprends, la tortue pour « Chapitres » je ne comprends pas le rapport. |
| N3 | Signet | non | 5 | non | À 24 px c'est un camion, ou une valise. En grand c'est un canapé avec une clé au bout. C'est pas une tortue. |
| N3 | Monotrait | non | 5 | non | En petit c'est une souris. En grand c'est un arc-en-ciel, ou un logo de banque. Un peu chelou mais ça se retient. |
| N3 | Marcheuse | oui | 3 | non | Ça c'est une tortue direct, même en petit. En grand un peu jouet mais pas moche. Ça ressemble à celle de Mélenchon en plus simple, c'est pas la même. |

**Décompte.** Reconnue tortue à 512 px : Signet 0/7, Monotrait 5/7 (M2 hésite, N3 non), Marcheuse 7/7. À 24 px : Signet 0/7 (« camion », « bus », « tracteur », « valise »), Monotrait 3/7 (M2, M4 avec aide, N2 ; « casque », « galet », « escargot », « souris » pour les autres), Marcheuse 7/7. Seuils du protocole (≥ 4/5 à 512, ≥ 3/5 à 24, soit ≥ 0,8 et ≥ 0,6) : **seule la Marcheuse passe**. Test 2 (trois mots) : aucun « moche », « cheap » ni « clipart » de la part des militants sur la Marcheuse (« sobre, plate, tenace », « simple, lisible, tenace », « calme, sobre, tenace », « simple, tortue, un peu jouet ») ; **N2 (non-politisée) dit « enfantine »** et préfère aucune mascotte ; M2 met un zéro « clipart » sur la Signet. Test 3 : 7/7 répondent « famille 2027 en esprit, mais pas la même » (profil, plate, sans quadrillage). Nom : tous ceux qui répondent (M1, M2, M3, M4) préfèrent **sans nom** (« un prénom ferait Duolingo », « tout prénom mignon me fait sortir »). Juges : Marcheuse 5/6, Monotrait 1/6 (J3). Critique : « aucune des trois ne lit tortue sans légende ; à 96 px un jouet Duplo » — avis minoritaire, mais la tête (œil blanc « de poisson » pour M2, « fixe » pour M1) est à redessiner.

Conditions posées par les personas pour la garder : jauge de lecture et écran vide seulement (M1, M2, M3), jamais sur ce qui s'envoie (M1), jamais géante sur l'écran 0 (M3), jamais animée toute seule ni en boucle (M4, `prefers-reduced-motion`), utile ou absente (N3 : « si elle est juste décorative, autant aucune »), sans nom, muette. Défaut de planche relevé par 5 personas sur 7 : à 390 px les trois rendus 512 px sont coupés à droite (tête hors cadre), en clair comme en sombre.

**Proposition (D3.11)** : piste **Marcheuse** retenue comme unique piste, Signet et Monotrait abandonnées ; livrables `design/mascot/*.svg` (§2.9 des règles) à produire avec la tête corrigée ; **absente de la v1** (direction A, sans mascotte) sauf jauge de lecture et écran vide, sans nom (`mascot.name` vide), sans réplique ; l'option « aucune » reste le défaut si le test humain contredit les personas. HYPOTHÈSE (personas).

## 8. Proposition de décisions

| ID | Décision proposée | Statut | Preuve | Impact |
|---|---|---|---|---|
| **D3.9** | **Direction retenue : A « éditorial-typographique » comme socle, hybride explicite.** On garde de A : le langage (Crème, Charbon, Violet, Rouge ; Public Sans 900 italique capitales à lignes décalées ; Gowun Batang sur Violet 100 pour le verbatim ; filets plutôt que cartes ; un bloc 3D par écran ; aucune icône, aucune barre d'onglets, aucune mascotte en v1 ; story en coupe 53/47 avec crochet « Tu savais que c'était dedans ? »). **On prend de B** : la composition de l'écran 0 par lien qui tient en un écran (verbatim + titre ≤ 6 mots + un seul CTA dans les 600 premiers px CSS + ligne d'indépendance visible sans défiler ; l'aplat Violet du bas reste à trancher au canvas parce qu'il fait « site officiel » pour 4 personas sur 7) et l'indication de temps de lecture (« 3 min ») sous une forme non-pastille. **On prend de C** : la ligne `privacy.no_account` dès l'écran 0 par lien, « En clair » visible sous le verbatim sans tap, les libellés « Envoyer sur WhatsApp » et « Copier le lien ». **On ne prend pas** : titres en blocs colorés par partie (5/7 personas lisent le vert comme EELV / flyer ; option J5 « pour les seuls en-têtes de section » à juger sur le canvas J3, hors défaut), tuiles « quatre mondes », anneau de progression, barre d'onglets, badges « MESURE CLÉ », chrome Charbon en mode clair | DÉCISION (proposée à l'utilisateur) / HYPOTHÈSE (personas) | §2 (6/6 juges, médiane 30/30, 0 élimination), §3 (seule survivante), §4 (cousin 4/7, officiel 1/7, honte 1/7) ; captures `…/maquettes/A/` | Canvas J3 : prototypes cliquables F1/F2 et témoin `/m/c12-s01-k01` habillés en A ; `tokens.json` v0.2 ; coupe minimale du plan respectée (une direction, 5 écrans) |
| **D3.10** | **Anatomie de la carte-concept : dense corrigée** (ordre de la dense ; premier écran = titre + badge + En clair + un seul bouton, sans code ni pointillé ; verbatim sans tap ; objection entre guillemets avec « On te dit : » ; « À savoir » après l'objection, institut et date sur la ligne du chiffre, numéral ≤ 24 px ; explorable replié en bas pour 2-3 concepts, avec alternative sans glissement) ; progressive non retenue comme défaut | DÉCISION (proposée) / HYPOTHÈSE (personas) | §5 : juges dense 5/6 ; personas dense 3, explorable 3, progressive 1 ; médianes 22 / 12 / 19 s ; 7/7 réexplications réussies | Composant `ConceptCard` T3/T7 ; `strings.json` v0.2 (`concept.label.context_2022`, « Voir le principe », « On te dit : ») |
| **D3.11** | **Mascotte : piste Marcheuse**, sans nom, absente de la v1 hors jauge de lecture et écran vide ; Signet et Monotrait abandonnées ; tête à redessiner ; « aucune » reste le défaut de repli | DÉCISION (proposée) / HYPOTHÈSE (personas, D0.12 « réaction testée en session humaine 1 ») | §7 : 7/7 à 512 et 24 px ; juges 5/6 ; N2 « enfantine » / « aucune » | `design/mascot/*.svg` (§2.9), `mascot.name` = "" ; `progress.section_done` neutre pour la v1 |
| **D3.12** | **Registre : tu par défaut maintenu** (D0.25) ; phrase d'arrivée par lien et mention IA à l'impersonnel ; kit vous conservé comme variante KV pour test humain ciblé > 45 ans | DÉCISION (proposée) / HYPOTHÈSE (personas) | §6 : tu 4/7 (tous < 35 ans), vous 3/7 (tous > 45 ans, sans ligne rouge) | `voice.md` règle « le tu ne porte que les actions » ; `strings.json` `home.link.sent_by_hint`, `chat.ai_mention.*` |

L'utilisateur n'a pas encore consigné sa propre préférence sur le canvas (plan T3 : « une voix parmi d'autres ») ; elle est à ajouter à `decisions.md` avec D3.9.

## 9. Ce qui change avant les prototypes cliquables J3

Par ordre de priorité (défauts de maquette qui faussent le jugement d'abord, puis règles de composant, puis chaînes et tokens). Sources : juges §2, critique §3, personas `13-tests-humains.md` §1, points ouverts des README.

**Défauts de maquette (à corriger avant tout nouveau jugement)**

1. Chat : aucun exemple de refus sur une question à laquelle le corpus répond (B « mégabassines » vs `c14-s02-m15`) ; « mégabassines » ajouté au jeu d'évaluation T6 (`eval/questions.json`) comme cas « refus interdit ».
2. Rendu des ligatures et du crénage (« of ficiel », « EXT RAIT », « T EXT E », « CHAPIT RE ») : `text-rendering: geometricPrecision` de A généralisé, ou hinting restauré dans les sous-ensembles (D3.6) ; à vérifier sur Android et iOS réels (HYPOTHÈSE).
3. Apostrophes typographiques partout (31 droites en B, 37 en C) : conversion au rendu actée (voice.md §6).
4. Planche mascotte : rendu 512 px ramené à la largeur de l'écran (≈ 320 px à 390) ; tête et œil redessinés (§7).
5. Placeholders visibles : « relu par … » (C), « pseudonyme » en pointillés (anatomies), « Baoleka » (A, B) → pseudonyme à choisir (D0.15, D2.9) et page « À propos » atteignable en un tap depuis toute carte (N2, critique).
6. Titres tronqués « La bifurcation… » (B) : jamais de troncature d'un titre du corpus (M4 : « c'est ma source ») ; kicker « Édition 2025 » insécable (C, 3 personas).

**Règles de composant issues de la session**

7. **Écran 0 par lien** : CTA unique dans les 600 premiers px CSS (navigateurs intégrés Instagram / WhatsApp, M3, N1, N3) ; titre ≤ 6 mots (« Mot pour mot. » ou « Ce que dit le texte, mot pour mot. », à trancher : `home.link.title` fait 8 mots) ; ligne d'indépendance et `privacy.no_account` visibles sans défiler ; pied de page à cinq liens replié derrière « À propos » (critique) ; « En clair » sous le verbatim sans tap.
8. **Écran 0 direct** : « Envoyer » ou « Copier » visible en moins de 10 s (M1) ; un seul CTA primaire (règle 8 ; B et C en avaient deux) ; doublon « MODE RIPOSTE » supprimé.
9. **Refus et mode dégradé** : jamais en typographie display ; `refusal.title` à la taille du corps, sur surface neutre (le Corail 200 a été lu « message d'erreur » par J2 et J3).
10. **Objection** : toujours entre guillemets, précédée de « On te dit : » (ou « Ce qu'on entend souvent », D5.11), jamais plus grosse que la réponse.
11. **StatCard** : numéral ≤ 24 px, institut et date sur la même ligne, placée après l'objection, repliée par défaut sur la carte-concept ; jamais en écran 0 ni sur une image (D5.4, D5.5).
12. **Appuis de source** : un appel par source, pas par phrase ; identifiants `c12-s01-k01` jamais dans le texte courant (masqués derrière le lien du passage).
13. **Étiquettes** : `font.size.label` 11 → 12 px minimum (M2, M4, N1, N2 ; C l'a déjà fait), tailles en `rem` (A2 du budget).
14. **Story** : titre en question (« Tu savais que c'était dedans ? »), jamais un slogan affirmatif ; aucun identifiant machine ; wordmark « C'EST ÉCRIT / LÀ » et route lisible (D10.2, T4) ; bande de signature dans la zone sûre (règle 6).
15. **Dark mode** : ombre pleine Violet 200 dès que le fond est Charbon (`shadow.block-3d-dark` = Violet est invisible, 1,33) → `tokens.json` v0.2.
16. **Termes voisins** : ne rendre que les slugs existants (D2.8 ; A rendait « règle bleue », C quatre puces mortes).
17. **Explorable** : étiquette « en un an » remplacée par les mots du texte (« sur une période donnée ») ; « prélève » → « prend » dans la voix de l'app (N3, `one_liner` dit déjà « prend ») ; `input type="range"` avec boutons moins / autant / plus (WCAG 2.5.7) ; « En clair » au-dessus des barres.
18. **Progression** : `progress.section_done` neutre pour la v1 sans tortue (« Section lue. ») ; jauge plate (règle 8).

**Chaînes et données** : « Ta munition, en dix secondes. » / « Mode riposte » (vocabulaire guerrier, J6 et critique) → variante à tester en session 2 ; `chat.cited_from` (préposition), `progress.chapters_read` (singulier), `concept.label.context_2022`, `play.*` des finalistes → `strings.json` v0.2 ; `rip-13` à retravailler (D5.11) ; sidecar `stat-cards-legal.json`.

### 9 bis. Ce que le prototype intégré du 10/9 a prouvé ou changé

Prototype : `prototypes/proto/` (7 modules, HTML + CSS + modules ES, sans framework), déployé le 9/9 sur https://proto.cestecritla.fr/ (Worker assets `aec-proto`) ; audit d'intégration `captures/2026-09-10/proto/live-report.json` (30 URL, clair et sombre : 0 erreur console, 0 requête externe, 0 requête échouée) ; audit de performance `docs/discovery/perf/2026-09-10/` (Lighthouse 13.4.1, Slow 4G + CPU ×4, 3 runs, médianes) ; session 2 des personas `13-tests-humains.md` §3.

**Verdict perf sur la direction A hybride** (détail et table : `design/perf-budget.md` §5.8). Ce qui dépend de la direction artistique tient le budget : JS initial 12-25 Ko gzip (P2), un seul bloc 3D par écran, 0 requête tierce sur 22 URL (P9), INP 0-64 ms à CPU ×4 (P5), 0 frame > 50 ms sur les reveals et le retour de tap (P6, borderline : 4 runs sur 12 à exactement 50,0 ms, Chromium sans GPU), mouvement max 240 ms et 0 ms en `prefers-reduced-motion` (P7), dark mode Charbon / Violet 200 rendu (A3), Lighthouse Accessibilité 100 × 4, taille système respectée (A2), parcours complet sans Web Share ni service worker (S1). Ce qui échoue ne vient pas de la direction : **P1** (LCP labo 3,06 s sur `/link/`, 4,63 s sur `/concept/` ; sur `/defi/` et `/riposte/` le « LCP » de 1,6 s n'est que le pied de page, le contenu arrive vers 3,3 s) et **P4** (CLS 0,11-0,25) tiennent au rendu côté client avec le corpus entier sur le chemin du LCP (chaîne HTML → CSS/JS → `ui.js` → `slim.json`, 4 à 6 sauts), déjà annoncé comme propre au prototype ; **P8** (99,7 Ko de polices livrées, 82 Ko chargées par page) tient à l'italique variable entière (31 Ko) au lieu d'un sous-ensemble 900 ≤ 15 Ko (H-PERF-3), identique pour les trois directions. **A1** est partiel : WCAG 2.5.3 non tenu sur les 6 appuis de source `a.ref` de `/concept/` (« 12.1 » absent du nom accessible), pas de `<h1>` sur trois URL riposte. Découverte : la View Transition concept → section ne s'engage jamais sur le déployé dans ce labo (0/17, course de Chromium 153 headless) et le fondu de repli n'est pas armé sans elle → transition instantanée ; statut sur Chrome Android réel HYPOTHÈSE. Conséquence pour T7 : pré-rendu du texte de l'écran 0, corpus découpé par section et chargé après `load`, hauteur réservée des conteneurs injectés, `modulepreload` de `ui.js`, sous-ensemble italique, fondu d'arrivée armé indépendamment de `ev.viewTransition`.

**État des 18 corrections du §9 sur le prototype** (preuves : personas de la session 2, `live-report.json`, audit perf) :

| # | Correction | État | Preuve | Suite |
|---|---|---|---|---|
| 1 | Refus « mégabassines » interdit (chat) | non testable (chat absent) ; **la recherche locale répond « Rien avec ces mots » à « mégabassines » et « aide-soignante »** alors que « méga-bassines » et « aides-soignants » sont dans le texte | N2 | tolérance trait d'union / pluriel / féminin ; cas gardés dans `eval/questions.json` |
| 2 | Ligatures et crénage | appliquée : aucun « of ficiel » relevé ; apostrophes et guillemets français vérifiés mot à mot (M2) | M2, M4 | à revoir sur Android et iOS réels (HYPOTHÈSE) |
| 3 | Apostrophes typographiques | appliquée sauf une : « c'est le communisme » (objection de l'accueil, apostrophe droite) | M3 | passer `riposte.json` par la typo FR au build |
| 4 | Planche mascotte / tête | appliquée : Marcheuse 24 px sur la jauge seulement, « la petite tortue qui avance » | M2, M3 | — |
| 5 | Placeholders, pseudonyme, « À propos » | **non appliquée** : « Rédigé par nous, relu par un humain » (« relu par un humain, donc écrit par quoi ? », N2), « À propos » sans nom ni contact ni mentions, au bas de l'index technique | M2, N2, M4 | D0.15 bloquant avant tout humain ; « Version d29c… » hors de la carte-concept (M4) |
| 6 | Titres jamais tronqués, kicker insécable | appliquée à l'écran (M4 : « jamais coupé ») ; **régression sur la carte 1080 × 1920** (chapitre 18 « …de la révolution » sans « numérique ») et « ÉDITION 2025 » orphelin à 360 px | M2, M3, N2 ; N3 | `defi/card.js`, insécable dans le kicker |
| 7 | Écran 0 par lien : CTA dans les 600 px, titre ≤ 6 mots, indépendance et `privacy.no_account` sans défiler, « En clair » sans tap | appliquée : CTA bas à 542-606 px (785 à 130 %), « MOT POUR MOT. », lignes visibles chez 6/7 ; **mais** sur l'iPhone SE dans WhatsApp (559 pt) le CTA n'est qu'un liseré et les deux lignes sont sous le pli (N2) ; et le CTA mène à la carte-concept : 4/7 mettent 2 taps et 8 écrans pour la section, « Lire la section » (lien 34 px) est 7-23 px sous le pli des navigateurs intégrés | M1, M2, M3, N1, N2, N3 | **règle amendée** : le CTA primaire de l'écran 0 par lien mène à la section (ou la carte-concept se replie à « En clair » + verbatim + bouton dans les 700 px) ; « Lire la section » bouton ≥ 44 px ; repère à 559 pt, pas 600 px |
| 8 | Écran 0 direct : « Envoyer » < 10 s, un seul CTA, sans doublon | appliquée pour les militants (riposte en 1-2 taps, 5-7 s, 4/4) ; **mais** `/home/` est atteint par les non-politisés via « Explorer le programme » depuis l'écran 0 par lien | N1, N2, M1-M4 | « Explorer le programme » → table des matières ; voir 19 |
| 9 | Refus jamais en display, surface neutre | appliquée sur le prototype (7/7 : « une porte, pas un mur », 0 panne) ; **non appliquée sur la maquette chat** (refus en display : 4/7 « ton de panne » ; bandeau Corail du dégradé : 5/6 lu comme une erreur) | M1-M4, N1-N3 | reporter 9 et 11 sur le chat (T6/T9), dessiner « quota dépassé » et « l'assistant est indisponible » |
| 10 | Objection entre guillemets après « On te dit : » / « Ce qu'on entend souvent » | appliquée (M2, M3, N2) | — | — |
| 11 | StatCard ≤ 24 px, institut + date sur la ligne, après l'objection, repliée sur la carte-concept | appliquée sur la carte-concept et le lecteur (mentions lues 5/7, « ils disent qui a payé ») ; **ouverte sur le verso riposte** : 3/4 militants veulent le chiffre 2021 replié | M2, M3, M4, N1, N2 | replier par défaut hors lecteur quand la vague est antérieure à 2024 |
| 12 | Appuis de source hors du texte, un par source | appliquée (« appels 12.1 discrets », M2) ; **11 px** et 20 × 12 px de cible, `aria-label` sans le texte visible (WCAG 2.5.3, audit) | M2, M4, N2 ; perf README §1 | ≥ 12 px, cible ≥ 24 px, nom accessible contenant « 12.1 » |
| 13 | Étiquettes ≥ 12 px en `rem` | appliquée pour `font.size.label` (12 px, A2 PASS) ; **restent à 11 px** `.ref` et `.badge.ctx` ; mentions 13-14 px jugées petites | M2, M4, N2 | plancher 12 px partout |
| 14 | Story : titre en question, wordmark, route, bande de signature dans la zone sûre | appliquée (« ça claque », M3 ; « affiche du parti » pour N2) ; **kicker et attribution hors des 250 px sûrs Instagram, bande vide, bloc titre qui déborde, téléchargement au lieu d'un partage de fichier** | M3, M2, M4, N1, N3 | `card.js` : zones sûres, `navigator.share({files})`, repli appui long |
| 15 | Ombre 3D Violet 200 en sombre | appliquée (fond rgb(33,35,32), une ombre par page, « le sombre est nickel » M1, « aucun gris » M4) | live-report, M1-M4 | — |
| 16 | Termes voisins existants seulement | appliquée (M2) | — | — |
| 17 | Explorable : mots du texte, `range` + boutons, replié | appliquée (`input range` + moins / autant / plus, replié en bas, « il ne me gêne pas », M4) | M2, M4 | — |
| 18 | Progression neutre, jauge plate | appliquée (« Section lue. », `localStorage` = `{sections:[…]}` seul) | M2, M4 | — |
| 19 | Chaînes « Ta munition / Mode riposte » : variante à tester | **testée** : lu « appli de militants pour clasher » ou « propagande » par les 2 non-politisés qui l'ont vu (raison de fermer de N1), à réserver aux militants pour M3 et M4 (« Réplique », « La réponse du texte »), indifférent pour M1 et M2 | N1, N2, M3, M4 | garder sur l'écran 0 direct ; aucun écran atteignable depuis un lien ne porte ce vocabulaire ; « Explorer le programme » ne mène jamais à `/home/` (décision D3.x à proposer avec `voice.md`) |

**Ce que la session 2 ajoute aux règles de composant** (nouveaux points, à reporter dans `illustration-rules.md` et `base.css`) :

20. **Cibles** : tout lien d'action (« Lire la section », « Passer », « Y aller », « Envoyer » par mesure, liens du pied) devient un bouton ≥ 44 px ; 24 px est le plancher WCAG, pas la norme (M2, M4, N1, N2).
21. **Police système agrandie** : la barre wordmark / Accueil / Chercher passe à la ligne (débordement 404-464 px à 130-150 %, M4) ; césure avec trait d'union (`hyphens: auto` + `lang="fr"`), insécables « 10 %», deux-points, guillemets fermants.
22. **Reprise de position** : « Reprendre le tirage (n/5) » et « Retour à la question » collants ou répétés sous la mesure ciblée (−2 732 px sinon, M3, N1).
23. **Dégradé** : jamais une clé brute (`error.generic` vu par N3 quand `slim.json` échoue) ni une page blanche hors ligne (M4) ; texte français en dur dans le `catch`, page « Pas de réseau » avec le texte déjà lu.
24. **Silence électoral** : `silence.share` donne la raison (« jour du vote, c'est la loi », M3, N1).
25. **Deep link vers une mesure** : le bouton primaire du lecteur partage la mesure d'arrivée, pas la mesure clé de la section (N1 aurait envoyé le mauvais texte).
26. **F2** : l'option touchée est marquée (« ton choix », sans rouge), le retour en 16 px avec le titre du chapitre, les trois options entières dans le premier écran (559-700 px), la carte OG sans les numéros de chapitre des options.
27. **Texte de partage** : court, sans licence CC dans la bulle (attribution sur la page), sans point médian ; 3/7 le réécrivent toujours, 4/7 y ajoutent une ligne à eux.

## 10. Ce qui reste HYPOTHÈSE (personas), D11.1

Tout ce qui suit a été établi par des juges-agents et des personas-agents sur captures statiques, sans personne réelle et sans téléphone réel ; à lever par le test humain d'avant lancement (`13-tests-humains.md` §4), avec la même grille.

| Hypothèse | Ce que disent les personas | Levée |
|---|---|---|
| A est la direction qu'on envoie au cousin sans honte ; B « a l'air officielle » ; C fait honte | cousin A 4/7, officiel B 4/7, honte C 5/7 | Session humaine : 5 s sur les 3 accueils, mêmes 3 questions, ≥ 5 personnes dont 2 non-politisées |
| L'écran 0 par lien doit tenir en un écran avec un CTA dans les 600 premiers px | 3/7 (personas Instagram) ferment A faute de bouton visible | Session 2 (prototype ouvert depuis WhatsApp / Instagram) puis test humain |
| Dense corrigée > progressive > explorable pour la carte-concept | dense 3, explorable 3, progressive 1 ; médianes 22 / 12 / 19 s | Aha chronométré sur 3 humains minimum, réexplication < 60 s |
| Les temps d'aha (8-85 s) | estimations d'agents sur captures | Chrono réel, curseur manipulé |
| Marcheuse reconnue tortue à 24 px, sobre, pas « la même » | 7/7 et 7/7 ; N2 « enfantine » | Protocole §4 des règles d'illustration, ≥ 4/5 et ≥ 3/5 |
| Aucune mascotte reste acceptable | N2 « aucune », N1 et N3 indifférents | Même protocole, témoin sans mascotte (direction A) |
| Tu par défaut ne braque pas les plus de 45 ans | vous 3/7, aucun rejet du tu | Test humain avec ≥ 2 personnes > 45 ans, écran tendu |
| « Elle choisit les passages, elle ne les écrit pas » (mention v2) est la promesse retenue | citée par 4 personas | Jugement T9 (voice.md §4) puis test humain |
| Les refus en typo display et les « 65 % / 83 % » géants seraient retournés en capture | J1, J4, J6, critique | Red team T12 ; jamais testable sans risque : on applique la règle |
| `text-rendering: geometricPrecision` corrige « of ficiel » sur téléphone réel | vu sur Chromium Linux seulement | Capture sur Android et iOS réels (T4 matrice) |
| Le hors-ligne au marché est une attente forte des militants âgés | M4 | Test humain ; v1 « complète sans service worker » (D3.5) mais SW en amélioration progressive à chiffrer |
| Le `.dev` dans la barre d'adresse fait « site étranger ou bricolé » | N2 | Levée par D10.2 (cestecritla.fr) |

**Mise à jour après la session 2 (10/9, prototype intégré, `13-tests-humains.md` §3)** — toujours HYPOTHÈSE (personas), mais avec un prototype manipulé :

| Hypothèse du tableau | Ce qu'a montré la session 2 |
|---|---|
| A s'envoie au cousin sans honte, B « officielle », C honte | non rejouée (une seule direction prototypée) ; personne ne trouve le prototype « officiel » (M4 « journal sérieux »), « ça claque » (M3), « un tiré à part propre » (M2) |
| Écran 0 par lien en un écran, CTA dans les 600 px | CTA visible 6/7 (bas à 542-606 px) ; liseré à 559 pt (iPhone SE dans WhatsApp, N2) ; **le CTA vers la carte-concept coûte 2 taps et 8 écrans à 4/7** → règle 7 amendée (§9 bis) |
| Dense corrigée > progressive > explorable | la carte-concept dense corrigée est lue « En clair » d'abord par 7/7 ; « trois écrans, jolie mais longue » (M3), « un article » (N3) ; explorable replié accepté (M4) |
| Temps d'aha | règle verte réexpliquée juste par N1 en ≈ 28 s (« on prend pas plus à la nature que ce qu'elle refait »), partielle N3, non demandée N2 ; chrono réel toujours à faire |
| Marcheuse à 24 px | aucune remarque négative sur la jauge (M2, M3) ; jamais vue ailleurs (M1 : « pas de tortue sur ce que j'envoie », positif) |
| Tu par défaut | aucun rejet (M2, N1) ; N2 relève la rupture de l'impersonnel dès le second écran et deux chaînes de pied qui diffèrent (`/q/` vs section) |
| Refus en display et chiffres géants retournés en capture | confirmé sur la maquette chat (4/7 « ton de panne », 5/6 bandeau Corail = erreur) ; sur le prototype les refus au corps de texte font 0/7 « panne » |
| `geometricPrecision` corrige « of ficiel » | aucune ligature cassée relevée sur le prototype (M2 vérifie mot à mot) ; Android et iOS réels toujours à voir |
| Hors-ligne au marché | confirmé et mesuré : navigation hors ligne 0 panne (3/3), rechargement à froid = page blanche (M4, `ERR_INTERNET_DISCONNECTED`) → correction 23 |
| `.dev` dans la barre | levée : `proto.cestecritla.fr` (D10.2), aucune remarque |

## 11. Points ouverts

- Préférence de l'utilisateur sur le canvas (plan T3) non consignée ; à ajouter avec D3.9.
- Écran 0 par lien : aplat Violet de B (fait « site officiel » 4/7) ou bande Crème de A avec composition compacte ; seule la bande Crème a été prototypée, la session 2 la valide par défaut (« ça claque », personne ne la dit officielle) : l'aplat Violet n'est plus maquetté, HYPOTHÈSE close sauf demande.
- Titres de plus de 6 mots issus du kit ou du corpus (`home.link.title` 8 mots, titre de section 9 mots) : amender la règle 3 pour les titres du corpus, raccourcir ceux du kit.
- Pseudonyme du relecteur (D0.15) et page « À propos » : bloquants pour toute capture montrée à des humains.
- Bloc 3D porté par le wordmark (A) plutôt que par le titre d'écran (règle 4) : réinterprétation à trancher pour `illustration-rules.md`.
- Ombre 3D en sombre et `part-color` (Vif rose 2,98 sur Crème, Vif violet 2,19 sur Charbon) : `tokens.json` v0.2.
- Vocabulaire « munition / riposte » commun aux trois directions : testé en session 2 (§9 bis, ligne 19) — gardé sur l'écran 0 direct, banni de tout écran atteignable depuis un lien, « Explorer le programme » ne mène plus à `/home/` ; décision D3.x à proposer avec `voice.md`.
- Mention IA sur la carte-concept en v1 statique (D0.21) : le bloc « Pose ta question » n'existe pas en v1 ; recherche locale à la place.
- `playwright` absent du `package.json` du dépôt (scripts B) ; générateurs A et C dans le scratchpad de session, non versionnés.
