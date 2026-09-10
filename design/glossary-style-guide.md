# Guide de style du glossaire — « C'est écrit là » (v0, T2)

> Rédigé le 7 septembre 2026 après la première passe des 5 cartes pilotes, **mis à jour le 8 septembre 2026** après la passe éditeur, la seconde ronde des juges et l'assemblage de `data/glossary.json` v0.1.0 (corpus `d29c7422004ab27c`, 5 cartes `verified-ai`, test `scripts/glossary.test.ts` 14/14). S'applique à toute carte de glossaire, et par extension aux réponses FAQ et aux ripostes (mêmes étiquettes, mêmes tests). Décisions respectées : D0.1 (aucun disclaimer de contenu), D0.3 (rédaction assistée au build, jamais d'IA à l'exécution), D0.25 (tu), D0.27 (relecture utilisateur + 1-2 militants + 1 non-politisé), D0.32 (critères « honteux à partager »), D1.1 (identifiants), D1.5 (statut des corpus 2022 et de Désintox), D1.11 (licence CC BY-NC-SA), D3.2 (le verbatim a sa propre typographie), D3.6 (U+00A0), D3.7 (kit de chaînes et voix).
>
> Statut des faits : **MESURÉ** (sur les 5 cartes du 8/9/2026, par script), **DÉCISION** (règle adoptée), **HYPOTHÈSE** (à lever, méthode indiquée).

## 0. La règle qui commande toutes les autres

Rien n'est affirmé sur le programme qui ne soit couvert, mot à mot, par un passage de l'édition 2025. Chaque phrase de la voix de l'app porte une étiquette (`verbatim`, `reformule`, `contexte-2022`) et des identifiants d'appui ; `scripts/glossary.test.ts` refuse le fichier dès qu'une phrase n'en a pas, qu'un identifiant n'existe pas, qu'un chiffre ou un fragment entre guillemets n'apparaît pas dans un passage cité. Le rédacteur ne lit jamais `data/aec-2025.json` en entier : il travaille sur `eval/passages/<slug>.json`, produit par `scripts/extract-passages.ts`, et rien d'autre. Quand une phrase n'a pas d'appui, on dit moins : on n'invente pas (carte `ecocide`, R2 : la définition « crime contre l'environnement » a été retirée faute de passage 2025).

## 1. Anatomie d'une carte

Une carte = un terme du programme, servi à l'URL `/c/<slug>`. Ordre des zones à l'écran (390 px), du haut vers le bas, avec la clé de `design/strings.json` qui les nomme et le champ de `data/glossary.json` qui les remplit :

| Ordre | Zone à l'écran | Chaîne (`design/strings.json`) | Champ JSON | Typographie (D3.2) | Contenu |
|---|---|---|---|---|---|
| 1 | Titre | — | `term` | Public Sans 900, capitales, ≤ 6 mots | Le terme tel que le programme l'écrit (« règle verte », « 6e République et Assemblée constituante »). |
| 2 | Badge d'auteur | `concept.authorship.reviewed` / `concept.authorship.pending` | `review_status`, `review.human.reviewer` | Public Sans 14 px | « Rédigé par nous, relu par {reviewer} » dès `reviewed-human` ; « Rédigé par nous, relecture en cours » en `verified-ai`. Une seule fois par carte, en tête de la zone 3. |
| 3 | **En clair** | `concept.label.plain` | `one_liner` | Public Sans 16 px | 2 à 4 phrases, ≤ 40 mots. Définit le terme et dit ce que le programme en fait. Jamais de phrase `contexte-2022`. |
| 4 | **Texte du programme** | `concept.label.verbatim` + `concept.source` + `concept.read_section` | `verbatim_ids` | Gowun Batang 17-18 px, fond `violet-100`, filet `violet`, jamais d'italique | 1 à 4 items du corpus affichés mot pour mot (mesure clé, mesure, sous-mesure ou paragraphe, y compris `intro-p` et `part-p`), apostrophe typographique conservée. Ligne « Source : L'Avenir en commun 2025, {chapter}, {section} » et lien vers la section. |
| 5 | **Pourquoi ça compte** | `concept.label.why` | `why_it_matters` | Public Sans 16 px | 4 à 8 phrases, ≤ 80 mots, phrases ≤ 15 mots. Ce que ça change, pour qui, comment. Une phrase `contexte-2022` au plus, en dernière position, avec sa pastille (§3). |
| 6 | **Mesures liées** | `concept.label.related_measures` + `measure.label` / `measure.key_label` | `related_measure_ids` | Gowun Batang (texte), Public Sans (étiquettes) | 2 à 8 mesures 2025 qui citent le terme ou relèvent de sa section (rattachement par le chapeau admis, à dire dans les notes). Jamais un paragraphe (`-p`). Chaque mesure est partageable (`measure.share`). |
| 7 | **Objection fréquente** | `concept.label.objection` (+ `riposte.desintox_link` si `desintox_url`) | `objection.text`, `objection.answer`, `objection.desintox_url` | Public Sans ; l'objection en 700, la réponse en 400 | L'objection est la voix du sceptique (guillemets, ≤ 15 mots, non étiquetée). La réponse : 2 à 3 phrases étiquetées, ≤ 45 mots, jamais de jugement, jamais « faux ». Lien Désintox quand la réponse s'y appuie. |
| 8 | **Termes voisins** | `concept.label.related_terms` | `related_terms` | Puces Public Sans | 3 à 8 slugs. Seuls les slugs présents dans le fichier sont rendus ; un slug pendant (`meta.dangling_related_terms`) n'est pas affiché. |
| 9 | Partage + attribution | `concept.share`, `attribution.short` | — | Public Sans 12 px | « Envoyer cette carte » ; « La France insoumise – L'Avenir en commun · CC BY-NC-SA 4.0 ». |

Champs jamais affichés : `aliases` (routage lexical, calculés à l'assemblage à partir de `aliases_from_card`, du terme et du slug : minuscules, avec et sans accents, deux apostrophes, pluriels, sigles, aucun contenu factuel), `aliases_from_card` (alias livrés par le rédacteur sous la clé `aliases` de sa carte, remappés à l'assemblage ; à relire avant tout affichage : cf. « État planificateur », « bifurcation » seul, « monarchie présidentielle », §4.3), `sentence_support`, `sources`, `readability`, `review`, `notes_for_reviewer`. Ils servent au test, à la recherche et aux relecteurs.

Rendu type (carte `regle-verte`, texte réel du fichier au 8/9) :

> **RÈGLE VERTE**
> Rédigé par nous, relecture en cours
>
> **En clair** — La règle verte fixe une limite à ce qu'on prend à la nature. On ne prend pas à la nature plus que ce qu'elle peut reconstituer. Le programme veut écrire cette règle dans la Constitution.
>
> **Texte du programme** — *Inscrire dans la Constitution le principe de la « règle verte », selon laquelle on ne prélève pas davantage à la nature que ce qu'elle est en état de reconstituer…* (`c12-s01-k01`, mesure clé) · Source : L'Avenir en commun 2025, Chapitre 12 : Planification écologique, La bifurcation écologique pour une société de l'harmonie · Lire la section entière
>
> **Pourquoi ça compte** — La règle verte serait écrite dans la Constitution. L'État devrait respecter cette règle. Les grands projets inutiles et écocidaires seraient mis en pause. Ils seraient réévalués selon la règle verte. […] ⟨Contexte 2022⟩ En 2022, le livret ajoutait une limite sur les pollutions et les déchets.
>
> **Mesures liées** — `c12-s01-m11` (moratoire sur les grands projets) · `c14-s02-k01` (règle bleue)
>
> **Objection fréquente** — « La règle verte, c'est juste un slogan. Ça ne change rien de concret. » — Le programme veut l'écrire dans la Constitution. Elle servirait à réévaluer les grands projets inutiles et écocidaires. Une « règle bleue » l'appliquerait aussi à l'eau.
>
> **Termes voisins** — planification écologique · bifurcation écologique · écocide · 6e République
>
> Envoyer cette carte · La France insoumise – L'Avenir en commun · CC BY-NC-SA 4.0

## 2. Règles d'écriture

### 2.1 FALC, en douze points (DÉCISION, vérifiés par test quand c'est possible)

| # | Règle | Vérifié par | Exemple pris dans les cartes |
|---|---|---|---|
| 1 | **≤ 15 mots par phrase.** 16 à 18 tolérés avec avertissement, > 18 refusé. Compte les jetons contenant une lettre ou un chiffre (« 300 000 » = 2, « « » = 0). | `glossary.test.ts` (test 4) | « L'État doit planifier ce changement. » (5 mots) |
| 2 | **Une idée par phrase.** Pas de relative en cascade, pas d'incise entre virgules, pas de « puis » qui enchaîne deux faits. | Éditeur, juges | « Une agence dépendrait de ce Conseil. Elle préparerait un plan de relocalisation par filière stratégique. » (scindée à l'édition) |
| 3 | **Référent clair.** Un pronom renvoie au sujet de la phrase précédente, sinon on répète le nom. | Éditeur, juge fact | « Le programme veut écrire cette règle dans la Constitution. » (et non « l'inscrire », qui pouvait renvoyer à « la nature ») |
| 4 | **Pas de double négation.** « Ne … pas … plus que » est une comparaison, pas une double négation. | Juges (`readability.double_negations`) | — |
| 5 | **Pas de jargon dans la définition d'un jargon.** Un mot du programme (« écocidaires », « régime parlementaire ») n'est gardé que s'il a sa carte (lien) ou une glose de 3-4 mots. | Juges (`readability.jargon_unexplained`) | À corriger : « régime parlementaire stable » (carte `6e-republique`), « lois cadres » (carte `planification-ecologique`) |
| 6 | **Le sujet est « le programme ».** « Le programme veut / propose / prévoit / soutient » ; « Selon le programme, … ». Jamais « Mélenchon veut », jamais « LFI promet », jamais « nous » pour le programme (« nous » = l'app, D3.7). Exception : la désintox est attribuée à « La France insoumise, sur son site Désintox ». | Vérificateur | « Le programme soutient la création d'un tribunal international… » ; hors liste, à trancher : « Le programme demande… » (`planification-ecologique`) |
| 7 | **Le conditionnel pour ce qui n'existe pas encore.** Une proposition se lit « serait », « appliquerait » ; l'indicatif est réservé aux faits du texte et aux phrases précédées de « Selon le programme ». Une carte ne mélange pas les deux modes. **Étendue le 10/9/2026 (panel rouge T12) à `data/riposte.json`**, que D2.2 déclarait déjà couvert (« s'applique aux liants FAQ et riposte ») et qui y échappait entièrement : les 15 liants étaient au présent non attribué (« Le SMIC monte », « La Constitution est écrite par une Assemblée constituante », « une garantie universelle couvre les impayés »), sur le fichier le plus susceptible d'être capturé. | Vérificateur (rejets « présent non attribué », « futur non attribué **»), et désormais deux portes de CI : `scripts/glossary.test.ts` (« aucun futur de l'indicatif non attribué dans une phrase de nous ») et `scripts/riposte.test.ts` (« chaque phrase d'un liant commence par Le programme / Le texte / Selon le programme, ou par un pronom anaphorique ») | « Une « règle bleue » l'appliquerait aussi à l'eau. » ; `6e-republique` **harmonisée le 10/9** : « Pourquoi ça compte » passe au conditionnel, et la phrase sur le 49.3 porte enfin sa portée (« Dans le cadre de la Constituante, les « votes forcés » comme le 49.3 seraient abolis »), `c1-s02-p03` étant le `heading_paragraph` qui la conditionne. D2.9 avait classé le point en « amélioration optionnelle » après relecture utilisateur : **sur l'axe désinformation il ne l'est pas** — c'est la ligne la plus citable d'une carte partagée |
| 8 | **Ni ajout, ni intensité.** Une paraphrase omet, elle n'ajoute jamais un acteur, une cause, un ordre chronologique ou un adjectif. | Vérificateur (entailment) | Rejeté : « mis en pause, **puis** réévalués » (le texte ne dit pas « puis ») ; signalé : « les **grands** pollueurs » pour « pollueurs de masse » |
| 9 | **Chiffres : seulement s'ils sont dans un passage cité.** En chiffres tels que le texte les écrit (« 200 milliards d'euros », « 49.3 »), jamais arrondis, jamais recalculés. En lettres jusqu'à seize dans le liant (« deux ans »). « 2022 » n'est autorisé que dans une phrase `contexte-2022`. | `glossary.test.ts` (test 6) | « Le programme prévoit 200 milliards d'euros… » (`c13-s01-k01`) |
| 10 | **Tu, toujours** (D0.25). Le lecteur est « tu » ; l'app est « on » ; jamais « vous ». Les définitions sont le plus souvent impersonnelles ; le « tu » sert dès qu'une mesure touche le lecteur, en gardant le périmètre du texte. | Éditeur, `glossary.test.ts` (test 11, « vous ») | « Si ton entreprise se reconvertit, un contrat de bifurcation écologique peut te protéger. » (à resserrer : « l'entreprise où tu travailles », la mesure vise les salariés) |
| 11 | **Aucun disclaimer, aucune opinion, aucun emoji, aucun ton potache** (D0.1, D0.32). Pas de « attention », « en théorie », « bien sûr », « évidemment », « hélas ». L'objection ne reçoit jamais « c'est faux » : elle reçoit le texte. | `glossary.test.ts` (test 11), juges | — |
| 12 | **Une carte tient sans ses phrases optionnelles.** La phrase `contexte-2022`, la phrase « mesure clé du chapitre… », le lien vers un terme pendant : chacune peut être retirée sans casser la carte. Le rédacteur l'écrit dans `notes_for_reviewer`. | Éditeur | « la carte tient sans elle (why_it_matters passerait à 63 mots) » |

### 2.2 Budgets (DÉCISION, appliqués par le test 5)

| Champ | Phrases | Mots | Mesuré sur les 5 cartes (8/9) |
|---|---|---|---|
| `one_liner` | 2 à 4 | ≤ 40 | 20 à 40 (`planification-ecologique` est à la limite exacte) |
| `why_it_matters` | 4 à 8 | ≤ 80 | 55 à 79, 5 à 8 phrases |
| `objection.text` | 1 à 2 | ≤ 15 | 10 à 13 |
| `objection.answer` | 2 à 3 | ≤ 45 | 24 à 44 |
| `verbatim_ids` | 1 à 4 items | — | 2 à 4 |
| `related_measure_ids` | 2 à 8 | — | 2 à 8 |
| `related_terms` | 3 à 8 slugs | — | 6 à 8 (20 pendants au total) |

Voix de l'app par carte (4 champs) : 127 à 164 mots, moyenne 148 ; 12 à 16 phrases, moyenne 13,6 ; 10 à 14 phrases étiquetées (61 au total : 56 `reformule`, 3 `contexte-2022`, 2 `verbatim`).

### 2.3 Typographie de la voix de l'app (DÉCISION, posée par le script d'assemblage)

- Le rédacteur et l'éditeur écrivent en **espaces ordinaires** ; l'assemblage pose l'espace insécable U+00A0 à l'intérieur des guillemets « » et avant « : ; ! ? », et comme séparateur de milliers (« 300 000 »). U+202F n'est jamais écrit (absent des polices, D3.6). MESURÉ : 37 U+00A0 dans le fichier v0.1.0, 0 U+202F ; l'opération est idempotente et le test compare les textes après normalisation.
- Apostrophe droite « ' » dans la voix de l'app en v0 (`design/voice.md` §6) ; le verbatim garde l'apostrophe typographique « ’ » du corpus (2 phrases `verbatim` de la carte `ecocide`). Conversion au rendu possible, à décider avec l'échantillon typographique.
- Guillemets français « » uniquement pour citer un fragment exact du texte (« règle bleue », « échelon vital de la démocratie », « votes forcés ») ou l'objection entière. Un fragment entre guillemets doit être une sous-chaîne exacte du passage cité : **contrôlé par le test 8 depuis le 8/9** (lève l'HYPOTHÈSE du 7/9).
- « 6e République » avec « e » mis en exposant par CSS ; « programme » sans majuscule ; *L'Avenir en commun* en italique par CSS.
- Éviter « : ; ! ? » dans les définitions ; quand un deux-points reste (« L'idée : décider ensemble… »), une seule fois par carte. Écart connu : `planification-ecologique` en garde trois (justifiés dans ses notes E7), à trancher.
- Aucune majuscule d'emphase, aucun gras dans les champs : la hiérarchie est celle des zones.

### 2.4 Ce qui est interdit dans une carte

Mots et tournures (test 11, liste `FORBIDDEN`) : « expert », « on sait que », « écrasante majorité », « historique », « enfin », « vraiment », « bien sûr », « évidemment », « hélas », « attention », « en théorie », « vous », « c'est faux ». Hors test : toute comparaison avec un autre parti ou candidat, toute date d'entrée en vigueur non écrite dans le texte, toute estimation de coût non écrite dans le texte, tout chiffre d'un encadré « À savoir » (les StatCards ont leur gabarit légal, D0.20 et `design/voice.md` §5). Aucun lien sortant autre que melenchon2027.fr (section citée) et desintox.lafranceinsoumise.fr (objection), D0.16.

## 3. Les trois étiquettes, et comment l'app les montre

Chaque phrase de `one_liner`, `why_it_matters` et `objection.answer` a exactement une entrée dans `sentence_support` : `{ field, sentence, kind, support_ids }`. La concaténation des phrases reproduit le champ au caractère près (test 3). `objection.support_ids` est l'union des appuis des phrases de la réponse (test 3). Chaque appui de phrase et chaque id de `verbatim_ids` a sa ligne dans `sources` (test 10).

| Étiquette | Ce que c'est | Appuis admis | Où elle peut vivre | Affichage |
|---|---|---|---|---|
| `verbatim` | Sous-chaîne exacte d'un item 2025 (ponctuation comprise ; NBSP et apostrophes normalisées pour la comparaison, test 7) | 1 id du corpus 2025 | `why_it_matters`, `objection.answer` (rare ; le verbatim principal vit dans la zone 4). Exemple : « Ce qu’un pays rejette dans l’air sera aussi respiré par ses voisins. » (`ecocide`, `c16-s06-p01`) | Gowun Batang, fond `violet-100`, filet `violet` à gauche, étiquette « Texte du programme », apostrophe ’ conservée, jamais d'italique (D3.2). Tap → section source. |
| `reformule` | Paraphrase rédigée par nous, couverte mot à mot par ses appuis (entailment vérifié par le vérificateur ; chiffres et fragments cités vérifiés par les tests 6 et 8) | ≥ 1 id du corpus 2025 ; dans `objection.answer` seulement, une URL Désintox est admise en plus ou à la place (D1.5, test 9) | Partout | Public Sans, sous le badge d'auteur de la carte (« Rédigé par nous, relu par … » / « relecture en cours »). Chaque phrase porte un lien discret vers son premier appui (id → URL de section, ancre sur l'item), visible au tap ou au focus ; le lecteur peut toujours remonter au texte. |
| `contexte-2022` | Phrase historique, appuyée sur un livret ou un plan 2022 (`data/livrets-2022.json`), datée dans la phrase (« En 2022, le livret… », « Un plan de campagne 2022 citait… »), à l'imparfait | 1 URL de livret / plan / FALC 2022, jamais un id 2025 (test 9) | `why_it_matters` uniquement, une seule phrase, en dernière position (test 9) ; jamais dans `one_liner`, jamais dans une image de partage | Public Sans sur une ligne à part, précédée d'une pastille « Contexte 2022 » (chaîne à ajouter : `concept.label.context_2022`, HYPOTHÈSE à juger en T9), bordure `violet-200`, tap → page 2022 (pas le programme). Jamais Gowun Batang : ce n'est pas le programme. |

Conventions complémentaires (DÉCISION) :

- **`objection.text` n'est pas étiquetée.** C'est la voix du sceptique, rédigée par nous (ou le titre d'un billet Désintox quand il existe). Elle est entre guillemets à l'écran, jamais en Gowun Batang. Elle ne contient aucun chiffre. Les juges ne la comptent pas comme affirmation sur le programme.
- **« 2022 » dans une phrase `contexte-2022`** vient du `kind` et de l'URL du passage (« livret 2022 », `livrets-2022/`), pas de son texte (les pages sont datées 2024 dans le fichier) : c'est la date d'édition de la source, imposée par le format, jamais un chiffre du programme. Le test des chiffres (test 6) ne porte que sur les phrases `reformule`.
- **Désintox** : seulement dans `objection.answer`, **jamais un chiffre, quelle que soit l'attribution** — le lien seul, sous `refusal.desintox_link` ou `riposte.desintox_link` ; jamais de reproduction, la licence étant une HYPOTHÈSE (D1.5, H-CNF-5) et D9.10 réduisant la Désintox « au titre et au lien, jamais une phrase ».

  > **Corrigé le 10 septembre 2026 (panel rouge T12).** Cette règle donnait en exemple, et autorisait donc, la phrase de `bifurcation-ecologique` : « Sur son site Désintox, La France insoumise vise **300 000 emplois** dans une agriculture écologique. » Trois problèmes cumulés : (a) **D2.2 interdit « aucun chiffre hors passage cité »** — l'attribution ne rachète pas le chiffre, et ce chiffre n'est nulle part dans le corpus ni daté ; (b) la règle **8 de `design/voice.md`** exige que « chaque chiffre existe dans `data/aec-2025.json`, avec institut et date » ; (c) le `support_ids` de cette phrase contenait une **URL au milieu d'identifiants de mesures**, ce qui casse la promesse « chaque phrase pointe un id du corpus ». Un projet qui se présente comme « militant indépendant » énonçait là un objectif **au nom du mouvement**, sur une source périssable. La phrase a été retirée de `data/glossary.json` ; l'objection tient sur ses deux premières phrases (`c9-s03-p01`, `c13-s01-m04`). Deux tests le verrouillent dans `scripts/glossary.test.ts` : **aucun `support_ids` d'une phrase `reformule` ne contient autre chose qu'un identifiant valide du corpus** (les URL 2022 restent admises pour les seules phrases `contexte-2022`), et **aucun chiffre d'une phrase `reformule` n'est absent de ses passages d'appui**.
- **Le badge d'auteur ne dit jamais « IA ».** Les cartes sont rédigées au build et relues (art. 50 § 4, exception « relecture humaine », `design/voice.md` §2.2). La page À propos décrit la méthode ; le badge nomme le relecteur (pseudonyme, D0.15).
- **Partage** : l'image de partage d'une carte contient le titre, la première phrase de « En clair » et un verbatim ; jamais une phrase `contexte-2022`, jamais l'objection.

## 4. Le protocole de vérification, tel qu'il a tourné les 7 et 8 septembre

### 4.1 Les cinq passes et l'assemblage

| Passe | Rôle | Entrée | Sortie | Règle d'arrêt |
|---|---|---|---|---|
| 1. **Rédacteur** | Écrit la carte à partir du seul fichier `eval/passages/<slug>.json` (corpus 2025 citable ; livrets 2022 = contexte ; désintox = objection). Régénère le fichier de passages s'il manque un alias d'extraction (et le dit). | Fichier de passages, ce guide | Carte JSON + `notes_for_reviewer` (chaque choix de paraphrase, chaque omission, chaque lien indirect, chaque variante proposée) | Toutes les phrases étiquetées, tous les ids pris dans le fichier |
| 2. **Vérificateur** (adversarial) | Relit contre le même fichier : existence des ids, chiffres mot pour mot, entailment phrase par phrase, homonymes, ton. Ne réécrit pas. | Carte + fichier de passages | `{ pass, checked_ids_exist, numbers_all_supported, rejections[{field, sentence, reason, severity}], notes }` | `pass = false` dès qu'un rejet est `blocking` → retour au rédacteur (carte `draft`) |
| 3. **Éditeur** (FALC + mobile) | Scinde, clarifie les référents, harmonise les modes verbaux. **N'ajoute ni ne retire aucun fait**, ne touche ni aux ids ni à l'objection. Documente chaque retouche dans `notes_for_reviewer`, recompte par script. | Carte vérifiée + rejets mineurs | Carte éditée, `sentence_support` resynchronisé | Longueurs recomptées, test vert sur copie |
| 4. **Juges** (deux, indépendants, **après** l'éditeur) | « Yanis, 22 ans » : lit la carte seule sur WhatsApp, la ré-explique en < 60 s, note clarté /5 et jargon. « Fact » : cherche la phrase la plus attaquable, note fidélité /5, verdict PASS/FAIL. | Carte éditée + fichier de passages (fact seulement) | `{ clarity_0_5, fidelity_0_5, can_reexplain_under_60s, verdict, readability, unlabeled_claims, comments_fr }` | Un FAIL = correction avant `reviewed-human` |
| 5. **Assemblage** (script, sans IA) | Remappe `aliases` → `aliases_from_card`, calcule les alias de routage, pose la typographie (§2.3), mesure la lisibilité, range vérificateur et juges dans `review`, recompte `meta.counts` et `meta.dangling_related_terms`. | 5 cartes + vérificateurs + juges | `data/glossary.json` | Aucun texte de carte modifié hors typographie |
| 6. **Test** (`npx tsx --test scripts/glossary.test.ts`) | Porte de CI : ids, étiquetage complet, longueurs, budgets, chiffres, verbatim, fragments cités, contexte-2022, sources, mots interdits, alias, liens pendants, lisibilité. | `data/glossary.json` | **17 tests** (14 à l'écriture), avertissements en diagnostic | Rouge = pas de merge |

Puis la **relecture humaine** (D0.27, §5) fait passer la carte de `verified-ai` à `reviewed-human`, et la validation de l'utilisateur à `published`.

### 4.2 Résultats réels par carte (MESURÉ, 7-8/9/2026, tels que rangés dans `review`)

| Carte | Rédacteur | Vérificateur | Éditeur | Juge Yanis (clarté, < 60 s) | Juge fact (fidélité, clarté) | Phrase la plus attaquable (fact) | Statut v0 | Test |
|---|---|---|---|---|---|---|---|---|
| `regle-verte` | 1 version | PASS, 0 bloquant, 6 mineurs (présent « applique », « puis », deux idées, « le livret », lien `6e-republique`, apostrophes) | passe du 7/9 puis passe du 8/9 (retouches a à i), 0 fait changé | 4/5, oui, PASS | 5/5, 4, PASS | « En 2022, le livret ajoutait une limite sur les pollutions et les déchets. » (comparaison implicite avec 2025) | `verified-ai` | vert |
| `bifurcation-ecologique` | 1 version | PASS, 0 bloquant, 8 mineurs (glose « changer de direction », « en dialogue avec les communes » omis, référent « ces changements », présent « sont prioritaires », `c12-s01-p01` en chapeau seulement, insécables, 4 liens pendants, alias « bifurcation ») | 8 retouches, 0 fait changé, test 10/10 sur copie | 4/5, oui, PASS | 5/5, 4, PASS | « Si ton entreprise se reconvertit, un contrat de bifurcation écologique peut te protéger. » (« ton entreprise » ≠ salarié) | `verified-ai` | vert |
| `6e-republique` | **3 versions** : v1 rejetée (ids `c1-s02-m02/m03` absents du fichier), v2 FAIL fact le 7/9 (objection, phrase 2 élargie), v3 du 8/9 sur fichier régénéré (alias « monarchie présidentielle » ajouté à `eval/terms-pilot.json`) | PASS, 0 bloquant, 6 mineurs (« puis », « voteraient ce texte », futur non attribué, référent « cette Constitution », référent « sa composition », alias = terme voisin) | intégré à la v3 | 4/5, oui, PASS | 5/5, 4, PASS | « Les Français voteraient ensuite ce texte par référendum. » (« voter » = adopter ; le texte prévoit un vote négatif) | `verified-ai` | vert |
| `planification-ecologique` | 1 version | PASS, 0 bloquant, 7 mineurs (« dictature » omis, « du national au local », « en fait partie », phrase 2022, « demande », alias « État planificateur », `c12-s02-k01`) | E1 à E9, 0 idée ajoutée ni retirée | 4/5, oui, PASS | 5/5, **3,5**, PASS | « Réduire le temps de travail en fait partie : moins de trajets pour aller travailler. » (« enjeu » devenu « partie ») | `verified-ai` | vert |
| `ecocide` | **2 versions** : v1 rejetée (2 bloquants : 4 mesures liées absentes du fichier, définition sans appui 2025) + fichier de passages régénéré (3 alias d'extraction) ; v2 du 8/9 (R1 à R6) | PASS, 0 bloquant, 5 mineurs (« grands pollueurs » sans attribution, « est un crime », `c7-s07-m06`, doublon tribunal, slug pendant `justice-climatique`) | 2 retouches, 0 fait changé | 4/5, oui, PASS | 5/5, 4, PASS | « L'écocide est un crime que le programme veut reconnaître. » (copule à l'indicatif) | `verified-ai` | vert |

Bilan (MESURÉ) : vérificateur 5/5 PASS, 0 rejet bloquant, **32 mineurs** (5 à 8 par carte) ; juges 10/10 PASS ; fidélité 5/5 sur les 5 cartes ; clarté 4/5 partout (3,5 pour le juge fact sur `planification-ecologique`) ; ré-explication en moins de 60 s : 5/5. Trois cartes ont demandé plus d'une ronde en amont : 2 régénérations du fichier de passages (alias d'extraction manquants), 1 rejet pour ids absents, 1 rejet pour définition sans appui, 1 FAIL juge fact (7/9) corrigé le 8/9. Test : 14/14, 0 phrase au-delà de 15 mots, 61 phrases étiquetées, 20 slugs de `related_terms` pendants (déclarés dans `meta.dangling_related_terms`, non rendus).

Ce que ces deux journées ont appris (DÉCISION, sauf mention) :

1. **Le fichier de passages est le goulot.** Deux cartes sur cinq ont dû le régénérer, une troisième cite un chapeau (`c12-s01-p01`) présent seulement comme champ `chapeau`. Avant la vague suivante : `extract-passages.ts` sort les chapeaux comme items, rattache à un paragraphe terminé par « : » les items qui le suivent (`headerId`, cas `c1-s02-p03` → `m02`, `m03`), et lit ses alias d'extraction dans un fichier séparé de `eval/terms-pilot.json` (HYPOTHÈSE d'implémentation, T2).
2. **Les juges passent après l'éditeur.** La ronde du 7/9 jugeait des cartes non éditées ; celle du 8/9 juge les cartes livrées. Toute retouche d'éditeur relance les juges.
3. **L'éditeur ne touche pas à l'objection** : la règle a tenu, au prix de points laissés au relecteur (« demande », « ton entreprise », « grands pollueurs »). À trancher : autoriser l'éditeur sur `objection.answer` avec les mêmes contraintes (aucun fait), ou garder le relecteur comme seul arbitre.
4. **Les notes pour le relecteur ont doublé** (moyenne 855 mots, contre 558 le 7/9) parce que chaque passe conserve les notes de la précédente. C'est la trace voulue, mais le militant n'a pas à tout lire : l'assemblage doit produire une liste courte « à trancher » par carte (§4.3 en est la version manuelle), les notes complètes restant dans le fichier.
5. **Typographie : le rédacteur écrit en espaces ordinaires, l'assemblage pose U+00A0.** Les trois notes qui annonçaient des insécables posées « à la main » ont livré des espaces simples ; la règle est désormais mécanique (§2.3).
6. **Outillage** : le scratchpad partagé entre agents parallèles a écrasé deux fichiers de travail (signalé par un vérificateur et un rédacteur) ; chaque agent écrit dans un sous-dossier à son nom.

### 4.3 Ce qu'un relecteur humain trouve dans le fichier, et ce qu'il doit trancher en premier

Chaque entrée porte `review.verifier.rejections` (mineurs, avec la reformulation proposée), `review.judges.*.comments_fr` (la phrase la plus attaquable, le jargon), `readability.jargon_unexplained` (union des deux juges) et `notes_for_reviewer` (choix du rédacteur et de l'éditeur, variantes chiffrées en mots). Le relecteur ne repart pas de zéro : il tranche les points ouverts. Par ordre d'urgence, tels qu'ils restent au 8/9 :

1. `6e-republique` : harmoniser le mode verbal de « Pourquoi ça compte » (« devrait », « seraient abolis », « serait l'occasion », « passeraient ») avec « En clair » au conditionnel, ou attribuer (« Selon le programme ») ; « Les Français voteraient ensuite ce texte par référendum. » → « Les Français diraient ensuite oui ou non à ce texte par référendum. » (même appui `c1-s01-m03`, + `c1-s01-p01` pour « les Français ») ; « sa composition » → « la composition de la Constituante » ; « cette Constitution » → « la Constitution de la 6e République ». « monarchie présidentielle » : alias de recherche de cette carte ou terme voisin, pas les deux.
2. `ecocide` : « L'écocide est un crime que le programme veut reconnaître. » → « Le programme veut reconnaître un crime d'écocide. » (7 mots, `c16-s06-k01`) ; « les grands pollueurs » → « les pollueurs de masse » ; retirer `c7-s07-m06` (justice nationale) des mesures liées et de `sources` ; supprimer le doublon « tribunal international » entre « Pourquoi ça compte » et la réponse ; Yanis demande « crime contre la nature » en tête, ce que la fidélité interdit sans appui 2025 (la seule définition est un livret 2022) : décider si la pastille 2022 suffit.
3. `regle-verte` : phrase 2022 → « En 2022, le livret Planification écologique définissait aussi une limite sur les pollutions et les déchets. » (retire la comparaison implicite « ajoutait », nomme le livret ; 14 mots, même appui) ; « écocidaires » deux fois sans glose (lien vers `ecocide` ou « qui détruisent la nature ») ; guillemets autour de « grands projets inutiles et écocidaires » dans les deux zones à la fois, ou dans aucune ; lien `6e-republique` sans appui 2025 (retirer ou étiqueter contexte 2022).
4. `planification-ecologique` : « en fait partie » → « est aussi un enjeu de planification » (16-17 mots, tolérés) ; « Le programme demande » → « propose » ; « à la place des actionnaires » (« dictature » omis) à surveiller en session humaine ; retirer « État planificateur » de `aliases_from_card` (vient de c15-s01, pandémies ; reste en alias de routage invisible) ; expliciter le critère « rattachée par le chapeau » pour `c12-s02-k01` et `c12-s01-m02` ou appliquer la règle de `c12-s02-m08` ; trois deux-points dans la carte.
5. `bifurcation-ecologique` : « Si ton entreprise se reconvertit » → « Si l'entreprise où tu travailles se reconvertit » (15 mots, `c13-s01-m03` vise les salariés) ; « L'État doit planifier ce changement » → « … avec les communes » (8 mots, `c13-s01-p01`) ; Yanis lit une contradiction entre « millions d'emplois » (`c13-s01-p01`) et « plusieurs centaines de milliers » (`c9-s03-p01`) : deux plans distincts, à dire ou à ne garder qu'un ; alias nu « bifurcation » (collision c11-s01, arts) : routage seulement, jamais affiché ; glose « changer de direction » à assumer ou remplacer par « changer notre économie ».
6. Transverse : slug `referendum-initiative-citoyenne` (carte `6e-republique`) contre la convention `referendum-d-initiative-citoyenne` (§6) : renommer le lien quand la carte existe ; `biens-communs-planetaires` (carte `ecocide`) → `biens-communs` (§6) ; « le livret » / « un livret de campagne » : fixer une formule unique pour les phrases 2022 ; les juges Yanis signalent 5 à 11 mots de jargon par carte (« Constitution », « 49.3 », « lois cadres », « droits sociaux », « droit international », « multinationales ») : décider glose courte, lien, ou carte.

## 5. Charge de relecture humaine (D0.27)

### 5.1 Ce qu'une carte pèse (MESURÉ sur les 5 cartes du 8/9)

| Grandeur | Moyenne | Étendue |
|---|---|---|
| Mots de la voix de l'app (4 champs) | 148 | 127-164 |
| Phrases (4 champs, objection comprise) | 13,6 | 12-16 |
| Phrases étiquetées à contrôler contre un appui | 12,2 | 10-14 |
| Passages 2025 cités (ids distincts, appuis + verbatim + mesures liées) | 11,2 | 5-17 |
| Mots de ces passages (`eval/passages/<slug>.json`) | 523 | 117-740 |
| Mots de `notes_for_reviewer` | 855 | 607-1 029 |
| Rejets mineurs du vérificateur | 6,4 | 5-8 |
| Mots des notes du vérificateur | 466 | 322-574 |
| Mots des commentaires des deux juges | 592 | 558-656 |

Un item de FAQ (`data/faq.json`, 50 entrées) pèse 7 mots de question, 22 mots de liant (13-43, une à deux phrases `reformulé`, pas encore de `sentence_support`) et 3,6 sections ou mesures. Un item de riposte (`data/riposte.json`, 15 entrées) pèse 43 mots d'objection + liant et 4 mesures.

### 5.2 Modèle de temps par item (HYPOTHÈSE dérivée des tailles mesurées ; aucun relecteur humain n'a encore été chronométré)

Vitesses retenues : lecture attentive 200 mots/min ; comparaison phrase → passage 45 s par phrase (ouvrir l'id, relire, cocher) ; ré-explication orale 60 s ; arbitrage d'un point ouvert 1 min ; édition + resynchronisation de `sentence_support` 5 min par carte.

| Relecteur (D0.27) | Ce qu'il fait | Carte glossaire | Item FAQ | Riposte |
|---|---|---|---|---|
| **Militant** (fidélité) — 1 ou 2 personnes | Lit la carte (1 min), ouvre les 11 appuis et lit 523 mots (3 min), coche 12 phrases (9 min), lit la liste « à trancher » (2 min ; 5 min s'il lit les notes complètes), écrit ses réserves (2 min) | **17 min** (20 avec les notes complètes) | 5 min (liant 1-2 phrases, 3-4 sections à ouvrir) | 5 min (4 mesures, liant de 2 phrases) |
| **Non-politisé** (lisibilité) — 1 personne | Lit la carte seule sur son téléphone (1 min), la ré-explique à voix haute (1 min), entoure le jargon (1 min), répond à 4 questions : compris ? ré-explicable ? partageable ? gêne ? (2 min) | **5 min** | 2 min | 3 min |
| **Utilisateur** (rédaction en chef) | Lit les rejets (≈ 450 mots, 2,5 min) et les juges (592 mots, 3 min), survole les notes du vérificateur (2 min), tranche 6 points (6 min), édite et resynchronise (5 min), relance le test et passe le statut (2 min) | **20 min** | 6 min | 6 min |

### 5.3 Total pour 30 termes / 50 FAQ / 15 ripostes

| Relecteur | Glossaire (30) | FAQ (50) | Ripostes (15) | Total | Si 2 militants |
|---|---|---|---|---|---|
| Militant(s) | 8 h 30 | 4 h 10 | 1 h 15 | **≈ 14 h** | ≈ 7 h chacun |
| Non-politisé | 2 h 30 | 1 h 40 | 0 h 45 | **≈ 5 h** | — |
| Utilisateur | 10 h 00 | 5 h 00 | 1 h 30 | **≈ 16 h 30** | — |

Lecture : la relecture humaine des 95 items représente environ une semaine de l'utilisateur (D0.26 : > 20 h/semaine) et deux demi-journées par militant. Elle ne tient pas dans les 4 jours de session (D0.30) : la session livre 5 cartes relues en conditions réelles (chronométrage compris), le reste s'étale sur les semaines suivantes. La partie IA du protocole (rédacteur, vérificateur, éditeur, juges) a coûté, sur ces 5 cartes, 1 à 3 versions de rédacteur, 1 à 2 passes d'éditeur et 2 rondes de juges par carte (7/9 puis 8/9) : compter deux rondes par carte pour la vague de 25.

Organisation proposée (DÉCISION à confirmer en T2) :

- Blocs de **45 minutes** : 2-3 cartes pour un militant, 9 cartes pour le non-politisé, 2 cartes pour l'utilisateur. Jamais plus de deux blocs par jour et par personne (la vigilance chute : la phrase fautive de la v2 de `6e-republique` était la 12e de la carte).
- Le militant relit **sans** les commentaires des juges (pour ne pas être guidé) mais **avec** la liste « à trancher » (§4.3) ; les notes complètes restent disponibles ; le non-politisé ne voit que la carte rendue à 390 px.
- Fidélité et lisibilité sont deux colonnes séparées de `review.human` (`fidelity_ok`, `clarity_ok`) : une carte passe `reviewed-human` quand les deux sont vraies.
- Les 5 premières cartes servent d'étalonnage : on note le temps réel par relecteur et on remplace les minutes de §5.2 par les valeurs mesurées avant de planifier les 25 suivantes.

## 6. Les 25 prochains termes

Règle de sélection : base = top 60 de `data/terms-candidates.json` (187 candidats, D1.10), **mots génériques exclus** (eau, santé, éducation, école, justice, police, logement, sport, culture, médias, énergie, transports, paix, retraite… : ce sont des thèmes, servis par `data/section-tags.json`, pas des termes à définir) ; complété par les termes d'amorçage hors top 60 qui sont du jargon propre au programme (§6.2) et par les liens pendants des 5 cartes qui correspondent à un candidat (§6.3). Slug : ASCII minuscules, accents retirés, apostrophes et espaces → tiret (`referendum-d-initiative-citoyenne`). Les rangs et comptes viennent de `terms-candidates.json` ; les sections et mesures clés citées ci-dessous ont été **VÉRIFIÉES le 8/9 par `extract-passages.ts`** (fichiers en scratchpad, jamais en ouvrant `data/aec-2025.json`).

### 6.1 Depuis le top 60 (11 termes)

| # | Slug | Candidat (rang, occurrences, sections) | Pourquoi |
|---|---|---|---|
| 1 | `services-publics` | « services publics » (10, 20 occ., 12 sections) + « service public » (19, 20 occ., 15 sections) ; 60 passages, 23 sections, 6 mesures clés (`c5-s02-k01`, `c7-s01-k01`, `c7-s02-k01`, `c10-s04-k01`, `c11-s01-k01`, `c15-s02-k01`) | Colonne vertébrale du chapitre 7 et de l'introduction ; le programme leur donne un sens précis (reconquête, pôles) que le mot courant n'a pas. Carte la plus lourde de la vague : limiter les mesures liées à 8. |
| 2 | `interet-general` | « intérêt général » (13, 15 occ., 12 sections dont `intro-p22` et `part1-p01`) | Formule juridique employée dans 12 sections ; un lecteur de 22 ans ne sait pas ce qu'elle engage. |
| 3 | `dette-publique` | « dette » (14, 14 occ.) + « dette publique » (57) ; mesure clé `c6-s04-k01` « Refuser le chantage : annuler la dette publique », `intro-p24` | Objection n° 1 en riposte (« c'est pas financé ») ; le chapitre 6 section 4 y consacre sa mesure clé. |
| 4 | `garantie-d-autonomie` | « autonomie » (28, 16 occ., 8 sections) ; mesures clés `c7-s04-k01` et `c10-s03-k01`, `c5-s03` | Mesure phare pour la cible 18-30 ; « autonomie » seul est trop vague, la carte porte sur le dispositif. |
| 5 | `biens-communs` | « biens communs » (31, amorçage, 11 occ., 7 sections) ; mesures clés `c2-s01-k01` (liste par référendum) et `c16-s06-k01`, `part4-p01` | Notion structurante de la partie « ordonner le monde » ; résout le lien pendant `biens-communs-planetaires` (carte `ecocide`, à renommer). |
| 6 | `securite-sociale` | « sécurité sociale » (35, 13 occ., 7 sections) ; mesure clé `c15-s02-k01` (« 100 % Sécu ») | Le programme y attache des dispositifs précis (« 100 % Sécu », financement) : la carte dit lesquels, pas ce qu'est la Sécu. |
| 7 | `souverainete` | « souveraineté » (39, 17 occ., 14 sections) + « souveraineté alimentaire » (176, amorçage) ; 47 passages, 5 mesures clés | Mot transversal (populaire, alimentaire, industrielle, numérique) ; une carte évite qu'il soit lu au sens d'un autre camp. |
| 8 | `energies-renouvelables` | « énergies renouvelables » (53, 7 occ., 5 sections) + « renouvelables » (72, 10 occ.) ; mesure clé `c13-s03-k01` (100 % en 2050) | Lien pendant de `bifurcation-ecologique` ; couple naturel avec `nucleaire` (§6.2). |
| 9 | `regle-bleue` | « eau » (1, amorçage, 55 occ., 10 sections) + « assainissement » (38) + « eau potable » (142) ; mesures clés `c14-s02-k01` (règle bleue) et `c12-s02-k01` (bassins versants) | Lien pendant ×2 (`regle-bleue` dans `regle-verte`, `bassins-versants` dans `planification-ecologique`, absorbé en alias) ; « eau » seul est générique, la règle bleue est le terme du programme. |
| 10 | `police-de-proximite` | « police » (9, 19 occ.) → « police de proximité » (63, 5 occ.) ; 10 passages, tous en `c7-s08`, mesure clé `c7-s08-k01` | Le mot générique est en rang 9 ; le terme du programme est le 3-gramme, en rang 63 (juste hors top 60), mesure clé de sa section. |
| 11 | `seuil-de-pauvrete` | « pauvreté » (56, 11 occ.) → « seuil de pauvreté » (65, 5 occ., 4 sections : `c7-s04`, `c8-s04`, `c8-s08`, `c10-s03`) | Référence chiffrée de plusieurs minima du programme ; le lecteur doit savoir que ce n'est pas un chiffre du programme mais un seuil qu'il utilise. |

### 6.2 Termes d'amorçage hors top 60, jargon propre au programme (9 termes)

| # | Slug | Candidat (rang, occurrences) | Pourquoi |
|---|---|---|---|
| 12 | `retraite-a-60-ans` | « retraite » (62) → « retraite à 60 ans » (173, amorçage) ; `c8-s02`, mesure clé `c8-s08-k01` ; 2 billets Désintox | Mesure la plus citée en conversation ; la carte tranche « 60 ans » et « 40 annuités » avec le texte, pas de mémoire. |
| 13 | `smic` | « SMIC » (107, amorçage, 8 occ., 6 sections) + « SMIC revalorisé » (141) ; mesure clé `c8-s04-k01` (montant écrit dans le texte) ; 4 billets Désintox | Sigle que tout le monde croit connaître ; le chiffre exact du programme est un piège classique de riposte (règle 9). |
| 14 | `pole-public` | « pôle public » (124, amorçage, 6 occ., 7 sections : banque `c6-s02-k01`, transports `c13-s02-k01`, énergie, médicament…) | Dispositif propre au programme, jamais défini pour un non-politisé ; articule avec `services-publics`. |
| 15 | `nucleaire` | « nucléaire » (75, amorçage, 7 occ., `c13-s03`, `c14-s01`, `c16-s02`) ; aucune mesure clé ne contient le mot | Sujet d'objection permanent ; la carte cite la mesure exacte (sortie, votation `c13-s03-a02` hors « Devine le % », D1.9) sans commentaire. |
| 16 | `garantie-d-emploi` | « garantie d'emploi » (178, amorçage) ; 1 passage, mesure clé `c8-s01-k01` | Mesure clé au nom opaque ; répond à l'objection « le chômage » en riposte. Carte courte : un seul passage, dire moins. |
| 17 | `impot-universel` | « impôt universel » (182, amorçage) ; 1 passage en `c6-s05` (mesure, pas clé) | Expression que le lecteur ne peut pas deviner (elle ne veut pas dire « tout le monde paie ») ; complète le chapitre 6. |
| 18 | `protectionnisme-solidaire` | « protectionnisme solidaire » (181, amorçage) ; **aucun passage de section**, seulement `intro-p25` | Oxymore apparent pour un lecteur de 22 ans ; l'introduction le définit. Carte à un seul appui : `verbatim_ids` = `intro-p25`, mesures liées à chercher par alias (« protectionnisme », c17) avant de rédiger. |
| 19 | `revolution-citoyenne` | « révolution citoyenne » (99, amorçage, 6 occ.) ; `intro-p06`, `part1-p01` (titre de la partie 1), `c1-s06-k01`, `c3-s02` | Titre de la partie 1 ; sans carte, le mot « révolution » est lu au sens courant. |
| 20 | `gratuite` | « gratuité » (84, 11 occ., 11 sections) ; mesure clé `c5-s03-k01` (cantines, transport scolaire), `intro-p23` | Pas un mot d'amorçage mais un dispositif transversal (premiers m³ d'eau, cantines, transports…) très concret pour la cible 18-30. |

### 6.3 Liens pendants des 5 cartes qui correspondent à un candidat (5 termes)

| # | Slug | Candidat (rang, occurrences) | Pourquoi |
|---|---|---|---|
| 21 | `referendum-d-initiative-citoyenne` | « référendum d'initiative citoyenne » (170, amorçage) + « référendum » (82, 9 occ.) + « RIC » (187) ; mesure clé `c1-s04-k01`, `intro-p26` | Lien pendant de `6e-republique` (écrit `referendum-initiative-citoyenne` dans la carte : à aligner) ; absorbe `referendum-revocatoire` comme alias (même section c1-s04) — à confirmer à la rédaction. |
| 22 | `monarchie-presidentielle` | « monarchie présidentielle » (179, amorçage) ; 4 passages, tous en `c1-s02`, mesure clé `c1-s02-k01` | Lien pendant de `6e-republique` ; le chapeau c1-s02 y rattache le 49.3 ; alias de recherche de `6e-republique` en attendant (à retirer quand la carte existe, §4.3). |
| 23 | `desobeissance-europeenne` | « Union européenne » (151, amorçage, 5 occ.) ; « désobéi… » dans `c17-s01`, `c17-s02`, `c6-s04-k01`, `c15-s02`, `c16-s01` | N'est plus un lien pendant (retiré de `6e-republique` en v3) mais objection fréquente (« sortir de l'UE ? ») à laquelle seul le texte de c17 peut répondre ; `c17-s02-m05` (droit européen) est déjà cité par `6e-republique`. |
| 24 | `relocalisation` | hors liste (verbe filtré par `derive.ts`) ; 23 passages, mesures clés `c9-s02-k01` et `c13-s05-k01` | Lien pendant ×2 (`bifurcation-ecologique`, `planification-ecologique`) ; la carte `planification-ecologique` en parle déjà (« plan de relocalisation par filière stratégique »). |
| 25 | `securite-sociale-professionnelle` | « sécurité sociale professionnelle » (123, 5 occ.) ; mesure clé `c8-s06-k01` | 3-gramme du programme, distinct de `securite-sociale` (continuité des droits entre deux emplois) ; jargon sans carte = phrase incompréhensible. |

### 6.4 Réserve (non comptés) et liens pendants à résorber autrement

- Réserve, dans l'ordre : `altermondialiste` (172, titre du chapitre 16), `isf` (185), `creolisation` (183, intro), `etat-d-urgence` (169), `nationalisation` (186), `tva` (175), `otan` (171), `outre-mer` (3, amorçage : un thème plus qu'un terme, à servir par les tags), `avenir-en-commun` (47 : carte « méta », plutôt page À propos).
- Liens pendants restants après ces 25 (12 sur 20) : `grands-projets-inutiles`, `obsolescence-programmee`, `hierarchie-des-normes` (carte `regle-verte`), `contrat-de-bifurcation-ecologique`, `grands-chantiers-ecologiques` (carte `bifurcation-ecologique`), `conseil-planification-ecologique`, `reduction-du-temps-de-travail` (carte `planification-ecologique`), `droit-international`, `pollueur-payeur`, `justice-climatique` (carte `ecocide`), `tirage-au-sort`, `regime-parlementaire` (carte `6e-republique`). Règle proposée (HYPOTHÈSE, T2) : un lien pendant est soit rédigé dans les 30 termes, soit converti en alias d'une carte existante, soit retiré de `related_terms` ; le test continue de les compter, l'app ne les affiche pas.

## 7. Ce qui reste à trancher

| Point | Levée par |
|---|---|
| La pastille « Contexte 2022 » (`concept.label.context_2022`) : libellé, couleur, ou suppression pure des phrases 2022 (Yanis la trouve déroutante sur 2 des 3 cartes qui en ont une, `regle-verte` et `ecocide`, et utile sur `planification-ecologique` où elle porte les seuls exemples concrets) | T9 (juges du kit de chaînes) puis session humaine 2 |
| Le lien par phrase vers l'appui (tap / focus) : utile pour le militant, bruit pour l'indécis ? | Session humaine 1 (9/9), prototype de carte |
| `aliases_from_card` affichés ou non (« Aussi appelé… ») | Décision utilisateur ; si affichés, retirer « État planificateur », « bifurcation » seul et « monarchie présidentielle » |
| Apostrophe droite → typographique dans la voix de l'app | Échantillon typographique T3 partie 2 |
| Minutes par item (§5.2) | Chronomètre sur les 3 premières cartes relues, première session |
| Licence Désintox (reproduction) | T9 (D1.5) |
| Extension de `extract-passages.ts` (chapeaux en items, `headerId`, fichier d'alias d'extraction séparé) | T2, avant la vague de 25 termes |
| Périmètre de l'éditeur sur `objection.answer` (§4.2, leçon 3) | Décision utilisateur avant la vague de 25 |
| Le script d'assemblage (typographie, alias, lisibilité, `review`) vit en scratchpad ; à ranger dans `scripts/assemble-glossary.ts` avec les cartes + vérificateurs + juges en entrée sous `eval/cards/` | T2, avec la vague de 25 |
| Liste « à trancher » générée par carte (rejets + phrases les plus attaquables + variantes des notes) pour le militant | Même script |
