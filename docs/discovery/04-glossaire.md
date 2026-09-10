# T2 — Glossaire, cartes-concept et FAQ v0 : rapport du 8 septembre 2026

> Livrables : `data/glossary.json` v0.1.0 (5 cartes pilotes, corpus `d29c7422004ab27c`), `data/faq.json` (50 questions), `design/glossary-style-guide.md` (v0, mis à jour le 8/9), `scripts/glossary.test.ts` (**17 tests** au 10/9/2026 ; 14 à l'écriture), `scripts/faq.test.ts` (**10 tests** au 10/9/2026 ; 6 à l'écriture), `eval/terms-pilot.json`, `eval/passages/<slug>.json` (5 fichiers), `eval/faq-terms/` (4 fichiers de termes + README), ce document. Décisions respectées : D0.1 (aucun disclaimer), D0.3 (rédaction assistée au build, jamais d'IA à l'exécution), D0.21 (v1 statique), D0.22 (zéro journal rattachable), D0.25 (tu), D0.27 (relecture utilisateur + 1-2 militants + 1 non-politisé), D0.32 (critères « honteux à partager »), D1.1 (identifiants), D1.4 (corpus figé), D1.5 (statut des corpus 2022 et de Désintox), D1.10 (187 candidats), D1.11 (CC BY-NC-SA), D3.2 (le verbatim a sa propre typographie), D3.6 (U+00A0), D3.7 (kit de chaînes).
>
> Statut des faits : **MESURÉ** (lu dans les fichiers cités ou produit par `npx tsx --test`, 8/9/2026), **DÉCISION** (prise sur pièces), **PROPOSÉE** (D2.x, à confirmer par l'utilisateur), **HYPOTHÈSE** (à lever, méthode indiquée). Rien n'est commité : `data/glossary.json`, `data/faq.json` et `eval/` attendent la relecture de l'utilisateur.

---

## 0. Ce que ce livrable tranche, et ce qu'il laisse ouvert

**Tranché sur pièces (MESURÉ).**
- Cinq cartes existent, chaque phrase de leur voix est étiquetée (`verbatim`, `reformule`, `contexte-2022`) et rattachée à des identifiants du corpus 2025 : **60 phrases** étiquetées (55 `reformule`, 3 `contexte-2022`, 2 `verbatim`), 0 phrase sans appui, 0 chiffre hors passage cité, 0 phrase de plus de 15 mots. *(61 à l'écriture du 8/9 : la v0.2.0 du 10/9 a retiré la phrase Désintox chiffrée de `bifurcation-ecologique`, d'où 56 → 55 `reformule`. Mesure : `node -e "console.log(require('./data/glossary.json').meta.counts.sentences_by_kind)"`.)* Le test `scripts/glossary.test.ts` passe **17/17** (relancé le 10/9 ; 14/14 le 8/9).
- Le protocole rédacteur → vérificateur adversarial → éditeur → deux juges → assemblage sans IA → test a tourné en vrai sur les 5 cartes : vérificateur 5/5 PASS (0 rejet bloquant en version finale, 32 mineurs), juges 10/10 PASS, fidélité 5/5 sur les 5 cartes, clarté 4/5 partout.
- La FAQ v0 route 50 questions vers 44 sections et 119 mesures sans aucun LLM ; 11 réponses sont honnêtement négatives ou partielles (≥ 8 demandé). Test 6/6.
- Le glossaire est **figé au build** (D2.1 ci-dessous) : aucune carte n'est générée à la volée, l'app sert un JSON relu.

**Laissé ouvert.**
- ~~Aucune relecture humaine n'a encore eu lieu : les 5 cartes sont `verified-ai`, `review.human` est vide~~ → **corrigé le 10/9/2026 (panel rouge T12).** Cette ligne était écrite avant D2.9. Les **5 cartes sont `reviewed-human`** et `review.human` est **rempli** : relecteur = l'auteur, **9/9/2026, sans demande de modification** (D2.9) ; le badge affiché est donc « **Rédigé par nous, relu par Baoleka** » (**D13.5, 10/9/2026** : pseudonyme public unique, `{reviewer}` supprimé du kit de chaînes en v0.5). `data/glossary.json` portait **trois affirmations contradictoires** (`by_review_status['reviewed-human'] = 0`, `counts.reviewed_human = 5`, et 5 entrées en `review_status: reviewed-human`) : **les compteurs suivent désormais les entrées**, parce que `review.human` est réellement rempli. Corriger dans l'autre sens aurait affiché « relecture en cours » sur cinq cartes réellement relues ; le laisser tel quel faisait mentir le dépôt public. ⚠️ **Ce que « relu » ne dit PAS** : les relectures **militante et non-politisée** de D0.27 restent **jouées par des personas-agents** et donc **HYPOTHÈSE (personas), D11.1**, jusqu'au test humain du 2-5 novembre — c'est écrit dans `meta.review_status_values['reviewed-human']`. **Reste ouvert** : le libellé du badge, `{reviewer}` et `{author}` désignant aujourd'hui la même personne (`prompt-final.md` §19.2). La charge de relecture (§7) est une HYPOTHÈSE dérivée des tailles, personne n'a été chronométré.
- La sortie prévue par le plan (« ≥ 30 entrées 100 % sourcées ») n'est pas atteinte : 5 entrées aujourd'hui, 25 termes suivants listés et vérifiés (§9, D2.6), pas rédigés. Les « 3 anatomies maquettées » du plan T2 ne font pas partie des livrables du jour : elles passent au canvas J3 (T3).
- 20 liens `related_terms` pendants, non rendus ; 5 à 11 mots de jargon non glosés par carte selon Yanis ; pastille « Contexte 2022 » à juger en T9.

---

## 1. Ce qui a été construit aujourd'hui

| Fichier | Contenu | Statut |
|---|---|---|
| `data/glossary.json` v0.1.0 | 5 entrées, `meta` (schéma en français, valeurs d'étiquettes et de statuts, `counts`, 20 `dangling_related_terms`, licence), `review` complet par carte (pipeline, versions, vérificateur avec rejets, deux juges, `human` vide) | MESURÉ, 151 Ko, non commité |
| `design/glossary-style-guide.md` | Anatomie de la carte (9 zones → clés `design/strings.json`), 12 règles FALC + tu + typographie, budgets par champ, les 3 étiquettes et leur rendu, protocole avec résultats réels, charge de relecture, 25 termes suivants, points à trancher | DÉCISION (règles) / HYPOTHÈSE (minutes) |
| `scripts/glossary.test.ts` | **17 tests** `node:test` (14 à l'écriture, +3 au panel rouge T12 du 10/9 ; mesure : `npx tsx --test scripts/glossary.test.ts`) : ids existants, étiquetage complet et champ reproduit à l'identique, ≤ 15 mots (16-18 tolérés avec compteur), budgets, chiffres présents dans un appui, verbatim = sous-chaîne exacte, fragments « … » = sous-chaîne exacte, contexte-2022 datée et dernière, sources, mots interdits / « vous » / emoji, alias, liens pendants déclarés, lisibilité recalculée | MESURÉ 14/14 ; `tsc --noEmit`, ESLint, Prettier propres |
| `data/faq.json` + `scripts/faq.test.ts` | 50 questions routées, 6 tests | MESURÉ 6/6 |
| `eval/terms-pilot.json`, `eval/passages/*.json` | Les 5 fichiers de passages, seule matière autorisée au rédacteur ; deux régénérés le 8/9 (`6e-republique`, `ecocide`) | MESURÉ |
| `eval/faq-terms/` | 4 fichiers de termes + README pour régénérer les passages FAQ à l'identique | MESURÉ |
| Scratchpad : `assemble/assemble.ts`, `assemble/cards-final.json` | Script d'assemblage sans IA (typographie U+00A0, alias de routage, lisibilité, `review`) ; **hors dépôt**, à ranger dans `scripts/assemble-glossary.ts` avec `eval/cards/` (§10) | HYPOTHÈSE d'emplacement |

Les trois tests du dépôt (glossaire 14, FAQ 6, riposte 8) sont verts : 28/28.

---

## 2. Les 5 cartes en un coup d'œil

Texte réel de `data/glossary.json` (zone « En clair » = `one_liner`, puis l'objection et sa réponse). Chaque phrase ci-dessous est étiquetée `reformule` dans le fichier, sauf mention ; les appuis sont dans `sentence_support`. Le relecteur peut juger le registre sans ouvrir le JSON.

### 2.1 `regle-verte` — règle verte

> **En clair.** La règle verte fixe une limite à ce qu'on prend à la nature. On ne prend pas à la nature plus que ce qu'elle peut reconstituer. Le programme veut écrire cette règle dans la Constitution.
>
> **Objection fréquente.** « La règle verte, c'est juste un slogan. Ça ne change rien de concret. » — Le programme veut l'écrire dans la Constitution. Elle servirait à réévaluer les grands projets inutiles et écocidaires. Une « règle bleue » l'appliquerait aussi à l'eau.

Texte du programme : `c12-s01-k01`, `intro-p22`. Mesures liées : `c12-s01-m11`, `c14-s02-k01`. Dernière phrase de « Pourquoi ça compte » en `contexte-2022` (livret Planification écologique 2022).

### 2.2 `bifurcation-ecologique` — bifurcation écologique

> **En clair.** La bifurcation écologique, c'est changer de direction face à l'urgence climatique. Le programme veut changer notre façon de produire, d'échanger et de consommer. L'État doit planifier ce changement. Il faut de grands chantiers et des investissements massifs.
>
> **Objection fréquente.** « La bifurcation écologique va détruire des emplois, dans l'industrie comme dans l'agriculture. » — Selon le programme, les grands chantiers écologiques peuvent créer plusieurs centaines de milliers d'emplois. Si une entreprise fermait, ses salariés seraient prioritaires pour la reprendre dans un but écologique. Sur son site Désintox, La France insoumise vise 300 000 emplois dans une agriculture écologique.

Texte du programme : `c13-s01-k01`, `c13-s01-m03`, `c9-s02-m03`, `c5-s04-m06`. 8 mesures liées. Lien Désintox sur l'objection (`vous-etes-contre-les-agriculteurs`). Aucune phrase 2022.

### 2.3 `6e-republique` — 6e République et Assemblée constituante

> **En clair.** La 6e République, c'est une nouvelle Constitution pour remplacer celle de la 5e République. Un référendum lancerait le processus, puis une Assemblée constituante écrirait le texte. Les Français voteraient ensuite ce texte par référendum.
>
> **Objection fréquente.** « Ce seront encore les mêmes politiciens qui écriront la Constitution. » — Aucun parlementaire des anciennes assemblées ne pourra siéger dans la Constituante. Ses délégués ne pourront pas être candidats aux élections qui suivront la nouvelle Constitution. Un référendum décidera aussi de sa composition : mode de scrutin, parité, tirage au sort.

Texte du programme : `c1-s01-k01`, `c1-s01-m01`, `c1-s01-m03`, `c1-s02-k01`. Mesures liées : `c1-s01-m02`, `c1-s02-m02`, `c1-s02-m03`, `c17-s02-m05`. Aucune phrase 2022.

### 2.4 `planification-ecologique` — planification écologique

> **En clair.** La planification écologique est un outil collectif pour guider l'économie, à la place des actionnaires. Le programme en fait sa méthode pour gouverner par les besoins. L'idée : décider ensemble, sur le temps long, au lieu de laisser faire le marché.
>
> **Objection fréquente.** « La planification, c'est l'État qui décide tout, tout seul, d'en haut ? » — Le programme demande une planification « écologique et démocratique ». Elle doit s'appuyer sur la commune, « échelon vital de la démocratie ». Des assemblées citoyennes régionales débattraient des projets d'aménagement et d'investissement.

Texte du programme : `c12-s01-p01`, `c12-s01-m01`, `c12-s01-m03`, `intro-p22`. 7 mesures liées. Dernière phrase de « Pourquoi ça compte » en `contexte-2022` (plan de campagne 2022). « En clair » est à 40 mots, la limite exacte du budget.

### 2.5 `ecocide` — écocide

> **En clair.** L'écocide est un crime que le programme veut reconnaître. Selon le programme, les grands pollueurs doivent répondre de leurs actes.
>
> **Objection fréquente.** « Reconnaître un crime d'écocide, c'est symbolique. Ça ne changera rien. » — Le programme soutient la création d'un tribunal international de justice climatique et environnementale. Il soutient aussi les négociations d'un traité contraignant les multinationales à respecter l'environnement. Les entreprises criminelles et les pollueurs de masse doivent répondre de leurs actes.

Texte du programme : `c16-s06-k01`, `c16-s06-p01`. Mesures liées : `c16-s06-m01`, `c16-s06-m04`, `c7-s07-m06` (ce dernier à retirer, §10). Seule carte avec deux phrases `verbatim` dans « Pourquoi ça compte » (sous-chaînes exactes de `c16-s06-p01`). Dernière phrase en `contexte-2022` : c'est la seule définition (« crime contre la nature (écocide) », livret 2022), et elle arrive en dernier.

---

## 3. Le pipeline tel qu'il a tourné

### 3.1 Les passes

| Passe | Ce qu'elle fait | Entrée | Sortie | Règle d'arrêt |
|---|---|---|---|---|
| 1. Rédacteur | Écrit la carte à partir du seul `eval/passages/<slug>.json` (corpus 2025 citable ; livrets 2022 = contexte ; désintox = objection). Régénère le fichier s'il manque un alias d'extraction, et le dit. | Fichier de passages, guide de style | Carte JSON + `notes_for_reviewer` | Toutes les phrases étiquetées, tous les ids pris dans le fichier |
| 2. Vérificateur adversarial | Relit contre le même fichier : existence des ids, chiffres mot pour mot, entailment phrase par phrase, homonymes, ton. Ne réécrit pas. | Carte + fichier | `{ pass, rejections[{field, sentence, reason, severity}], notes }` | Un rejet `blocking` → retour au rédacteur (carte `draft`) |
| 3. Éditeur FALC | Scinde, clarifie les référents, harmonise les modes. N'ajoute ni ne retire aucun fait, ne touche ni aux ids ni à l'objection. Recompte par script. | Carte vérifiée + rejets mineurs | Carte éditée, `sentence_support` resynchronisé | Test vert sur copie |
| 4. Deux juges, après l'éditeur | « Yanis, 22 ans » : lit la carte seule sur WhatsApp, la ré-explique en moins de 60 s, note la clarté /5 et le jargon (il ne note pas la fidélité : son champ `fidelity_0_5` vaut 0 = non évalué). « Fact » : cherche la phrase la plus attaquable, note fidélité /5 et clarté /5, verdict PASS/FAIL. | Carte éditée (+ fichier pour fact) | `{ clarity_0_5, fidelity_0_5, can_reexplain_under_60s, verdict, readability, unlabeled_claims, comments_fr }` | Un FAIL = correction avant `reviewed-human` |
| 5. Assemblage (script, sans IA) | Remappe `aliases` → `aliases_from_card`, calcule les alias de routage (6 à 21 par carte), pose U+00A0 (37 occurrences, 0 U+202F), mesure la lisibilité, range vérificateur et juges dans `review`, recompte `meta.counts`. | 5 cartes + vérificateurs + juges | `data/glossary.json` | Aucun texte de carte modifié hors typographie |
| 6. Test | Porte de CI, **17 tests** (mesuré le 10/9/2026 ; 14 à l'écriture de cette passe) | `data/glossary.json` | Rapport TAP | Rouge = pas de merge |

Deux rondes de juges ont eu lieu : le 7/9 sur des cartes non éditées (dont un FAIL), le 8/9 sur les cartes livrées. Seule la ronde du 8/9 est rangée dans `review.judges`.

### 3.2 Résultats réels par carte (MESURÉ)

« Passages 2025 » = items de `corpus` + `introduction_and_parts` dans le fichier de passages ; entre parenthèses, ceux qui contiennent le terme lui-même (les autres viennent d'un titre de section ou d'un alias d'extraction). « Rondes vérificateur » = nombre de passes du vérificateur jusqu'au PASS.

| Terme | Passages 2025 (dont littéraux) | Livrets / plans 2022 · Désintox | Versions rédacteur | Rondes vérificateur | Rejets finaux (bloquants / mineurs) | Passe éditeur acceptée ? | Yanis clarté /5, ré-explique < 60 s | Fact fidélité /5 (clarté) | Verdict |
|---|---|---|---|---|---|---|---|---|---|
| `regle-verte` | 6 (6) | 8 · 0 | 1 | 1 | 0 / 6 | oui (passe 7/9 puis retouches a à i le 8/9, 0 fait changé) | 4, oui | 5 (4) | PASS / PASS |
| `bifurcation-ecologique` | 47 (17) | 8 · 1 | 1 | 1 | 0 / 8 | oui (8 retouches, 0 fait changé) | 4, oui | 5 (4) | PASS / PASS |
| `6e-republique` | 17 (14) | 8 · 0 | 3 | 2 | 0 / 6 | non : retouches intégrées à la v3, pas de passe séparée | 4, oui | 5 (4) | PASS / PASS |
| `planification-ecologique` | 29 (15) | 8 · 2 | 1 | 1 | 0 / 7 | oui (E1 à E9, 0 idée ajoutée ni retirée) | 4, oui | 5 (3,5) | PASS / PASS |
| `ecocide` | 4 (1) | 5 · 0 | 2 | 2 | 0 / 5 | oui (2 retouches, 0 fait changé) | 4, oui | 5 (4) | PASS / PASS |

Bilan : 5/5 vérificateur PASS, 0 bloquant en version finale, 32 mineurs ; 10/10 juges PASS ; fidélité 5/5 partout ; clarté 4/5 partout (3,5 pour fact sur `planification-ecologique`) ; ré-explication en moins de 60 s : 5/5 ; 0 `unlabeled_claims` chez fact. Yanis a compté 3 phrases « écrites comme des vérités » sur `bifurcation-ecologique` (« L'État doit planifier ce changement. », « Il faut de grands chantiers et des investissements massifs. », « ses salariés seraient prioritaires… ») : elles sont étiquetées et appuyées dans le fichier, mais un lecteur sans le JSON ne le voit pas. C'est un argument pour le lien par phrase vers l'appui (§10).

### 3.3 La phrase la plus attaquable de chaque carte, selon le juge fact

| Carte | Phrase | Pourquoi elle est attaquable | Reformulation proposée par le juge (même appui) |
|---|---|---|---|
| `regle-verte` | « En 2022, le livret ajoutait une limite sur les pollutions et les déchets. » | « ajoutait » à l'imparfait après sept phrases sur 2025 se lit « 2025 a abandonné cette limite » ; le fichier de passages ne permet ni de l'affirmer ni de l'exclure ; « le livret » n'est pas nommé | « En 2022, le livret Planification écologique définissait aussi une limite sur les pollutions et les déchets. » (14 mots) |
| `bifurcation-ecologique` | « Si ton entreprise se reconvertit, un contrat de bifurcation écologique peut te protéger. » | `c13-s01-m03` protège « les salariés » ; « ton entreprise » se lit aussi « l'entreprise que tu possèdes » | « Si l'entreprise où tu travailles se reconvertit, un contrat de bifurcation écologique peut te protéger. » (15 mots) |
| `6e-republique` | « Les Français voteraient ensuite ce texte par référendum. » | « voter un texte » = l'adopter ; `c1-s01-m03` prévoit un vote négatif ; « les Français » vient de `c1-s01-p01`, pas de l'appui cité | « Les Français diraient ensuite oui ou non à ce texte par référendum. » (12 mots) |
| `planification-ecologique` | « Réduire le temps de travail en fait partie : moins de trajets pour aller travailler. » | `c8-s02-p02` dit « un enjeu de planification écologique » ; un enjeu devient une partie | « Réduire le temps de travail est un enjeu de planification : moins de trajets pour aller travailler. » (16 mots, toléré) |
| `ecocide` | « L'écocide est un crime que le programme veut reconnaître. » | Copule à l'indicatif : pose comme acquis le statut que `c16-s06-k01` (« Reconnaître un crime d’écocide », verbatim) propose de créer | « Le programme veut reconnaître un crime d'écocide. » (7 mots) |

Aucune de ces cinq phrases n'invente un fait : le juge a maintenu 5/5 à chaque fois. Ce sont des formulations à durcir avant `reviewed-human`.

---

## 4. Ce qui a échoué, et pourquoi

1. **Le fichier de passages est le goulot.** Deux cartes sur cinq ont dû le régénérer : `6e-republique` (alias « monarchie présidentielle » ajouté à `eval/terms-pilot.json`) et `ecocide` (3 alias d'extraction : « tribunal international de justice climatique », « traité contraignant les multinationales », « justice pénale environnementale »). Une troisième, `bifurcation-ecologique`, cite `c12-s01-p01`, présent seulement comme champ `chapeau` du fichier et non comme item. Cause : `extract-passages.ts` ne sort pas les chapeaux comme items et ne rattache pas les items à un paragraphe terminé par « : » (cas `c1-s02-p03` → `m02`, `m03`).
2. **`6e-republique` v1 rejetée** : le rédacteur citait `c1-s02-m02` et `c1-s02-m03`, absents de son fichier. Le vérificateur a fait son travail ; c'est la preuve que la règle « ids pris dans le fichier, rien d'autre » est testable et tenue.
3. **`6e-republique` v2, FAIL du juge fact le 7/9** : la deuxième phrase de la réponse à l'objection élargissait le texte. La v3 du 8/9 reprend la forme proposée par le juge. Leçon : la phrase fautive était la 12e de la carte, là où l'attention baisse.
4. **`ecocide` v1, deux rejets bloquants** : 4 ids de mesures liées absents du fichier, et une définition (« crime contre l'environnement ») sans aucun appui 2025. La définition a été retirée. Conséquence visible : la seule définition du mot (« crime contre la nature ») est un livret 2022, donc en dernière phrase sous pastille « Contexte 2022 », et Yanis demande qu'elle passe en tête. **La fidélité a coûté un point de clarté**, et le rapport l'assume : on dit moins, on n'invente pas.
5. **Les juges du 7/9 jugeaient des cartes non éditées.** La ronde a été refaite le 8/9 après l'éditeur. Règle désormais : toute retouche d'éditeur relance les juges.
6. **Typographie annoncée, non livrée.** Trois notes de rédacteur ou d'éditeur annonçaient des espaces insécables posées à la main ; les cartes reçues étaient en espaces ordinaires (vérifié caractère par caractère par le vérificateur et les deux juges). La règle est devenue mécanique : le rédacteur écrit en espaces ordinaires, l'assemblage pose U+00A0.
7. **Collision d'agents parallèles** : le scratchpad partagé a écrasé deux fichiers de travail (signalé par un vérificateur et un rédacteur). Chaque agent écrit désormais dans un sous-dossier à son nom.
8. **Les 32 rejets mineurs se répètent** : présent ou futur non attribué pour une proposition (règle 7 : « applique », « devra », « sont prioritaires », « est un crime »), « puis » qui ajoute une chronologie (règle 8, deux cartes), qualificatif omis (« en dialogue avec les communes », « dictature », « coordonnant »), référent flou (« ces changements », « cette Constitution », « sa composition »), alias d'extraction trop larges (« bifurcation » nu fait entrer les 15 mesures de `c11-s01`, arts et culture ; « État planificateur » vient de `c15-s01`, pandémies), liens pendants. Ces catégories deviennent des lignes du guide (§2.1) et, pour les chiffres et fragments cités, des tests (6 et 8).
9. **Non atteint** : « ≥ 30 entrées » (5 aujourd'hui) ; « 3 anatomies maquettées » (reportées au canvas J3) ; ~~relecture humaine (0 carte `reviewed-human`)~~ → **5 cartes `reviewed-human` depuis D2.9, compteurs alignés le 10/9/2026 (panel rouge T12)** ; ce qui reste non atteint est la **relecture militante et non-politisée de D0.27**, jouée par des personas et donc HYPOTHÈSE (personas) jusqu'au test humain (D11.1) ; alias `aliases_from_card` à relire avant tout affichage.

---

## 5. La minceur honnête de certains termes

Le programme 2025 ne définit pas ses mots : il les emploie. Une carte ne peut dire que ce que les passages disent, et pour certains termes c'est peu.

- **`ecocide` : un seul passage contient le mot**, `c16-s06-k01` (« Reconnaître un crime d’écocide », mesure clé, verbatim). Les trois autres items du fichier viennent des alias d'extraction (tribunal international, traité contraignant, justice pénale environnementale). Aucun passage 2025 ne définit l'écocide ; la définition existe dans un livret 2022, servie sous étiquette `contexte-2022`. La carte tient en 20 mots d'« En clair », le minimum des cinq.
- **`regle-verte` : 6 passages**, tous littéraux, dont la mesure clé `c12-s01-k01` qui est la seule vraie définition du programme. La carte dépend d'un item.
- **`6e-republique` et `planification-ecologique`** ont de la matière (17 et 29 passages) mais le programme y parle en dispositifs (Constituante, référendum, Conseil, agence, lois cadres) : Yanis et fact signalent 8 à 15 mots de jargon par carte, dont « Constitution » lui-même, jamais défini par le texte.
- **`bifurcation-ecologique`** : 47 passages dont 30 entrés par titre de section, pas par le mot. La carte a dû choisir 4 verbatims et 8 mesures liées ; deux chiffres d'emplois coexistent (« millions d’emplois de qualité », `c13-s01-p01` ; « plusieurs centaines de milliers d’emplois », `c9-s03-p01`), deux plans distincts que Yanis lit comme une contradiction.
- **À venir, même profil** (guide §6.2, vérifié par `extract-passages.ts`) : `garantie-d-emploi` (1 passage, `c8-s01-k01`), `impot-universel` (1 passage en `c6-s05`), `protectionnisme-solidaire` (aucun passage de section, seulement `intro-p25`). Ces cartes seront courtes par construction : `verbatim_ids` réduit à l'item, « En clair » à deux phrases, mesures liées cherchées par alias avant rédaction.

Règle retenue (DÉCISION, guide §0) : quand une phrase n'a pas d'appui, la carte dit moins. La minceur se voit à l'écran (moins de zones remplies), elle ne se comble jamais par une phrase de notre cru.

---

## 6. FAQ v0 en chiffres (MESURÉ, `data/faq.json`, `scripts/faq.test.ts` 6/6)

| Grandeur | Valeur |
|---|---|
| Questions | 50, routées sans IA vers le corpus `d29c7422004ab27c` |
| Voix | militant 16 · indécis 18 · jeune 16 |
| Parties couvertes | partie 1 : 9 · partie 2 : 21 · partie 3 : 11 · partie 4 : 9 · aucune : 5 (une entrée compte pour chaque partie où elle cite un identifiant) |
| `answer_kind` | sections 19 · measures 20 · partial 6 · absent 5 |
| Réponses honnêtement négatives ou partielles | 11 (≥ 8 demandé) |
| Sections et mesures citées | 44 sections, 119 mesures distinctes (123 citations), toutes trouvées dans les fichiers de passages, aucune inventée |
| Liant | ≈ 22 mots par entrée (13 à 43), une à deux phrases `reformulé`, pas encore de `sentence_support` |
| Alias de routage | ≈ 5 par entrée, `normalized` + alias normalisés ; « prix », « euro », « tenue » volontairement absents (ambigus) |

Exemples : `faq-15` « La retraite à 60 ans, c'est dedans ? » → `c8-s08` ; `c8-s08-k01`, `c8-s02-m01` · `faq-25` « Le programme dit quoi sur le racisme et le contrôle au faciès ? » → `c10-s02` ; 4 mesures · `faq-38` « Est-ce que le programme parle de la corrida ? » (partial) → `c14-s05` ; `c14-s05-m06`.

Sujets « absent » (liant = `refusal.title` + `refusal.lead` de `design/strings.json`, zéro identifiant) : voile ou abaya, sortie de l'euro, revenu universel, harcèlement scolaire, cryptomonnaies. Sujets « partial » (une seule section) : PMA, semaine de quatre jours, uniforme à l'école, transports gratuits, corrida, réseaux sociaux. Sujets absents confirmés mais sans entrée faute de place : peine de mort (0 passage), vote électronique (0), Sénat (1 mention incidente, `c1-s06-m11`).

Ce que la seconde passe du 8/9 a corrigé : les 119 identifiants relus avec le texte de leur mesure ; les 11 réponses négatives ou partielles re-vérifiées par une extraction élargie (`eval/faq-terms/4-relecture-negatives.json`) ; `faq-17` (question écrite « quatre jours » pour n'affirmer aucun chiffre hors passage ; liant « en parle seulement ici », la formule n'existant que dans la carte statistique `c8-s02-a01`) ; `faq-35` (l'ancien liant « ne parle pas de gratuité des transports » était contredit par `c5-s03-k01`, transport scolaire gratuit ; liant ramené à « parle des tarifs des transports seulement ici ») ; « Frexit » et « sortir de l'UE » déplacés vers l'entrée Europe (le lecteur voit ce que le livre dit, sans affirmation de sortie) ; doublon « regle verte » retiré ; clé `support_note` (schéma demandé, sans suffixe `_fr`, à harmoniser avec `reversal_note_fr` de `riposte.json`).

Critère du plan « couverture ≥ 80 % de 50 questions de terme », lu comme la part des questions qui obtiennent une réponse routée : 45/50 (90 %), les 5 restantes étant des refus assumés. Le test vérifie l'existence des identifiants, pas qu'une mesure répond à la question : cette fidélité sémantique a été relue à la main le 8/9 et reste à relire selon D0.27.

---

## 7. Protocole de relecture humaine et charge (D0.27)

### 7.1 Ce qu'une carte pèse (MESURÉ sur les 5 cartes)

| Grandeur | Moyenne | Étendue |
|---|---|---|
| Mots de la voix de l'app (4 champs) | 148 | 127-164 |
| Phrases étiquetées à contrôler contre un appui | 12,2 | 10-14 |
| Passages 2025 cités (ids distincts) | 11,2 | 5-17 |
| Mots de ces passages | 523 | 117-740 |
| Mots de `notes_for_reviewer` | 855 | 607-1 029 (doublés depuis le 7/9 : chaque passe garde les notes de la précédente) |
| Rejets mineurs du vérificateur | 6,4 | 5-8 |
| Mots des commentaires des deux juges | 592 | 558-656 |

### 7.2 Modèle de temps (HYPOTHÈSE : dérivé des tailles, aucun relecteur chronométré)

| Relecteur | Ce qu'il fait | Carte | Item FAQ | Riposte |
|---|---|---|---|---|
| Militant (fidélité), 1 ou 2 personnes | Lit la carte, ouvre les appuis, coche chaque phrase étiquetée, lit la liste « à trancher », écrit ses réserves | 17 min (20 avec les notes complètes) | 5 min | 5 min |
| Non-politisé (lisibilité), 1 personne | Lit la carte seule sur son téléphone, la ré-explique à voix haute, entoure le jargon, répond à 4 questions | 5 min | 2 min | 3 min |
| Utilisateur (rédaction en chef) | Lit rejets et juges, tranche les points ouverts, édite, resynchronise `sentence_support`, relance le test, passe le statut | 20 min | 6 min | 6 min |

Total pour 30 termes / 50 FAQ / 15 ripostes : militant(s) ≈ 14 h (≈ 7 h chacun à deux), non-politisé ≈ 5 h, utilisateur ≈ 16 h 30. C'est environ une semaine de l'utilisateur (D0.26) et deux demi-journées par militant : **la relecture ne tient pas dans les 4 jours de session**. La session livre 5 cartes relues en conditions réelles, chronomètre compris ; le reste s'étale sur les semaines suivantes.

### 7.3 Organisation (PROPOSÉE, D2.7)

- Blocs de 45 minutes : 2-3 cartes pour un militant, 9 pour le non-politisé, 2 pour l'utilisateur ; jamais plus de deux blocs par jour et par personne.
- Le militant relit **sans** les commentaires des juges (pour ne pas être guidé) mais **avec** la liste courte « à trancher » (guide §4.3) ; les notes complètes restent dans le fichier. Le non-politisé ne voit que la carte rendue à 390 px.
- `review.human` porte deux colonnes séparées, `fidelity_ok` et `clarity_ok` ; une carte passe `reviewed-human` quand les deux sont vraies, `published` sur validation de l'utilisateur.
- Les 5 premières cartes servent d'étalonnage : temps réel noté par relecteur, puis remplacement des minutes de §7.2 par les valeurs mesurées avant de planifier les 25 suivantes.

---

## 8. Test humain 1 (9/9 au soir) : critère et protocole

**Critère de sortie (plan T2, DÉCISION)** : au moins un testeur non-politisé ré-explique les 5 cartes, 5 sur 5, en moins de 60 secondes chacune, après lecture de la carte seule sur son téléphone. Les juges « Yanis » du 8/9 ont ré-expliqué 5/5 en moins de 60 s, avec une clarté de 4/5 partout : le test humain dit si un vrai lecteur fait aussi bien, et sur quoi il bute.

Protocole (5 min par carte, §7.2) : carte rendue à 390 px, sans les notes ni les juges ; lecture seule ; ré-explication à voix haute enregistrée (chronomètre) ; jargon entouré ; quatre questions : compris ? ré-explicable ? partageable sans gêne (D0.32) ? quelque chose gêne ? Le registre « tu » et sa variante « vous » sont comparés sur une carte (D0.25).

Ce que Yanis prédit que le testeur dira (à confronter) : « écocidaires » et « le livret » sur `regle-verte` ; « contrat de bifurcation écologique » et le double chiffre d'emplois sur `bifurcation-ecologique` ; « Constitution », « 49.3 », « RIC » sur `6e-republique` ; l'organigramme (Conseil, agence, lois cadres) sur `planification-ecologique` ; la définition qui n'arrive qu'en dernier sur `ecocide`. Chaque prédiction confirmée devient une glose de 3-4 mots ou un lien vers une carte de la vague de 25.

---

## 9. Décisions proposées (D2.x, à confirmer par l'utilisateur, puis à reporter dans `decisions.md`)

| ID | Décision proposée | Preuve | Impact |
|---|---|---|---|
| D2.1 | **Glossaire figé au build.** Les cartes sont rédigées, vérifiées, éditées, jugées et assemblées avant le build ; l'app sert `data/glossary.json` tel quel ; aucune carte, aucune phrase n'est produite à l'exécution (D0.3, D0.21). Toute modification passe par le pipeline et le test. | 5 cartes `verified-ai`, 14/14 | La v1 ne dépend d'aucun quota ; le chat v2 ne sélectionne que des ids |
| D2.2 | **Règle d'étiquetage.** Chaque phrase de `one_liner`, `why_it_matters`, `objection.answer` porte une étiquette et ses appuis : `verbatim` (sous-chaîne exacte d'un item 2025), `reformule` (paraphrase couverte par ≥ 1 id 2025, ou une URL Désintox dans la réponse à l'objection seulement), `contexte-2022` (une phrase au plus, datée, en dernière position de `why_it_matters`, appuyée sur une URL 2022, jamais un id 2025). `objection.text` n'est pas étiquetée et ne contient aucun chiffre. Aucun chiffre hors passage cité ; « 2022 » seulement dans une phrase `contexte-2022`. | Guide §3, tests 3, 6, 7, 8, 9 | S'applique aussi aux liants FAQ et riposte (à outiller : `sentence_support` absent de `faq.json`) |
| D2.3 | **Schéma de carte.** `slug`, `term`, `aliases` (routage, calculés), `aliases_from_card`, `one_liner`, `why_it_matters`, `verbatim_ids`, `related_measure_ids`, `objection {text, answer, desintox_url, support_ids}`, `related_terms`, `sources`, `sentence_support`, `review_status` (`draft` / `verified-ai` / `reviewed-human` / `published`), `readability`, `review`, `notes_for_reviewer`. Budgets : « En clair » 2-4 phrases ≤ 40 mots ; « Pourquoi ça compte » 4-8 phrases ≤ 80 mots ; réponse 2-3 phrases ≤ 45 mots ; phrases ≤ 15 mots (16-18 tolérées avec compteur). | `meta.schema_fr`, guide §1-2 | Les 25 cartes suivantes et l'assemblage suivent ce schéma sans changement |
| D2.4 | **Affichage « Rédigé par nous, relu par … ».** Badge d'auteur une fois par carte, en tête de « En clair » : « Rédigé par nous, relu par {reviewer} » dès `reviewed-human` (pseudonyme, D0.15), « Rédigé par nous, relecture en cours » en `verified-ai` ; jamais le mot « IA » sur la carte (la page À propos décrit la méthode, art. 50 AI Act). Le verbatim a sa typographie (Gowun Batang, étiquette « Texte du programme », D3.2) ; la phrase 2022 a sa pastille « Contexte 2022 » ; le reformulé est en Public Sans sous le badge, avec un lien discret par phrase vers son premier appui. | `meta.license_fr`, guide §3, `concept.authorship.*` dans `strings.json` | Chaîne `concept.label.context_2022` à ajouter et à juger en T9 |
| D2.5 | **FAQ routable sans LLM.** 50 entrées, routage exact sur `normalized` + alias normalisés, `answer_kind` ∈ {sections, measures, partial, absent} ; une entrée `absent` ne cite aucun identifiant et affiche `refusal.title` + `refusal.lead` ; une entrée `partial` cite une seule section et le dit dans son liant. La longue traîne va à la recherche locale tolérante (D10.1), jamais à un modèle. | `data/faq.json`, `faq.test.ts` 6/6 | Aucun appel IA sur `/mot/<terme>` en v1 |
| D2.6 | **Les 25 prochains termes** (guide §6, sections et mesures clés vérifiées par `extract-passages.ts`) : `services-publics`, `interet-general`, `dette-publique`, `garantie-d-autonomie`, `biens-communs`, `securite-sociale`, `souverainete`, `energies-renouvelables`, `regle-bleue`, `police-de-proximite`, `seuil-de-pauvrete`, `retraite-a-60-ans`, `smic`, `pole-public`, `nucleaire`, `garantie-d-emploi`, `impot-universel`, `protectionnisme-solidaire`, `revolution-citoyenne`, `gratuite`, `referendum-d-initiative-citoyenne`, `monarchie-presidentielle`, `desobeissance-europeenne`, `relocalisation`, `securite-sociale-professionnelle`. Mots génériques exclus (eau, santé, école… : des thèmes servis par `section-tags.json`). Réserve : `altermondialiste`, `isf`, `creolisation`, `etat-d-urgence`, `nationalisation`, `tva`, `otan`. | Guide §6.1-6.4, top 60 de `terms-candidates.json` (D1.10) | 8 des 20 liens pendants résorbés ; atteint 30 entrées, la sortie prévue du plan |
| D2.7 | **Protocole de relecture humaine** : blocs de 45 min, militant sans les juges mais avec la liste « à trancher », non-politisé sur la carte rendue seule, deux colonnes `fidelity_ok` / `clarity_ok`, étalonnage des minutes sur les 5 premières cartes. | §7.3 | Calendrier de relecture après la session |
| D2.8 | **Liens pendants** : un slug de `related_terms` absent du fichier est déclaré dans `meta.dangling_related_terms` et jamais rendu ; avant `published`, il est soit rédigé (vague de 25), soit converti en alias d'une carte existante, soit retiré. | Test 13, 20 pendants | 12 restent après la vague de 25 (guide §6.4) |

---

## 10. Points ouverts, avec la méthode pour les lever

| Point | Méthode | Quand |
|---|---|---|
| Script d'assemblage en scratchpad (`assemble.ts`, `cards-final.json`) | Ranger dans `scripts/assemble-glossary.ts`, entrées sous `eval/cards/<slug>/{card,verifier,judges}.json` ; produire en plus une liste courte « à trancher » par carte (rejets + phrases attaquables + variantes des notes) | Avant la vague de 25 |
| `extract-passages.ts` | Sortir les chapeaux comme items (`c12-s01-p01`), ajouter `headerId` aux items qui suivent un paragraphe terminé par « : » (`c1-s02-p03`), séparer les alias d'extraction de `eval/terms-pilot.json` | Avant la vague de 25 |
| `6e-republique` | Harmoniser le mode verbal (« En clair » au conditionnel, « Pourquoi ça compte » au futur) ou attribuer (« Selon le programme ») ; « voteraient ce texte » → « diraient oui ou non » ; référents « sa composition », « cette Constitution » ; « monarchie présidentielle » alias **ou** terme voisin ; slug `referendum-initiative-citoyenne` → `referendum-d-initiative-citoyenne` | Relecture utilisateur |
| `ecocide` | « L'écocide est un crime que… » → « Le programme veut reconnaître un crime d'écocide. » ; « grands pollueurs » → « pollueurs de masse » ; retirer `c7-s07-m06` (justice nationale) des mesures liées et de `sources` ; supprimer le doublon « tribunal international » ; décider si la pastille 2022 suffit pour la définition | Relecture utilisateur, puis test humain 1 |
| `regle-verte` | Phrase 2022 → « définissait aussi… », livret nommé ; « écocidaires » glosé ou lié à `ecocide` ; lien `6e-republique` sans appui 2025 à retirer ou étiqueter | Relecture utilisateur |
| `planification-ecologique` | « en fait partie » → « est un enjeu de » ; « Le programme demande » → « propose » ; retirer « État planificateur » de `aliases_from_card` ; expliciter le critère de rattachement de `c12-s02-k01` ; trois deux-points | Relecture utilisateur |
| `bifurcation-ecologique` | « ton entreprise » → « l'entreprise où tu travailles » ; « avec les communes » ; dire que « millions » et « centaines de milliers » sont deux plans, ou n'en garder qu'un ; alias nu « bifurcation » = routage seulement | Relecture utilisateur |
| Minutes par item (§7.2) | Chronomètre sur les 3 premières cartes relues ; `notes_for_reviewer` à 855 mots → liste courte générée | Première session de relecture |
| Périmètre de l'éditeur sur `objection.answer` (interdit aujourd'hui : « demande », « ton entreprise », « grands pollueurs » sont restés) | Décision utilisateur : autoriser avec la contrainte « aucun fait », ou garder le relecteur seul arbitre | Avant la vague de 25 |
| Pastille « Contexte 2022 » (`concept.label.context_2022`) : libellé, couleur, ou suppression des phrases 2022 (Yanis la trouve déroutante sur `regle-verte` et `ecocide`, utile sur `planification-ecologique`) | Juges du kit de chaînes T9, puis session humaine 2 | T9, 11/9 |
| Lien par phrase vers l'appui : utile au militant, bruit pour l'indécis ? | Prototype de carte, session humaine 1 | 9/9 |
| `aliases_from_card` affichés (« Aussi appelé… ») ou non | Décision utilisateur ; si affichés, retirer « État planificateur », « bifurcation », « monarchie présidentielle » | Avant maquette |
| Apostrophe droite → typographique dans la voix de l'app | Échantillon typographique T3 | Canvas J3 |
| Licence Désintox (D1.5) : paraphrase + lien seulement jusqu'à décision | Revue T9 | T9 |
| FAQ : entrées `absent` sans voisinage machine-lisible (`refusal.lead` finit par « Voici ce qui s'en approche : », voisins nommés seulement en texte libre) | Champ optionnel `neighbour_section_ids` ou recherche locale seule | v1 |
| FAQ : `faq-17` n'est lisible que si l'app affiche les cartes statistiques de la section sous gabarit 77-808 (D1.9, D5.5) | Gabarit légal T9 | T9 |
| FAQ : « sortir de l'UE » et « Frexit » → sections Europe plutôt que refus ; `faq-14` garde « 1600 euros » dans la question (verbatim `c8-s04-k01`) | À valider en relecture | Relecture |
| FAQ v1 : source de questions réelles = les 24 000 contributions citoyennes ; candidats sans entrée : peine de mort, vote électronique, Sénat | Après relecture v0 | v1 |
| `eval/` et `data/faq.json` non suivis par git ; `data/glossary.json` modifié non commité | Commit par l'utilisateur après relecture (conventional commit `feat(data): glossaire v0.1.0 et FAQ v0`) | Après relecture |

---

## 11. Écart avec la sortie prévue par le plan T2

| Sortie prévue | État au 8/9 |
|---|---|
| ≥ 30 entrées 100 % sourcées | 5 entrées, 100 % sourcées (**60/60** phrases étiquetées au 10/9, 61/61 au 8/9 avant la v0.2.0) ; 25 suivantes sélectionnées et vérifiées, non rédigées |
| 0 affirmation non couverte | Tenu par le test (ids, chiffres, verbatim, fragments) et par le juge fact (0 `unlabeled_claims`) ; Yanis en signale 3 sur `bifurcation-ecologique`, couvertes dans le fichier mais invisibles à l'écran sans lien par phrase |
| Couverture ≥ 80 % de 50 questions de terme | 45/50 routées (90 %), 5 refus assumés ; fidélité sémantique relue à la main, pas testée |
| Décision « glossaire figé au build » | Proposée D2.1, appliquée de fait |
| 3 anatomies maquettées sur la règle verte | Non livrées ; rendu type en texte dans le guide §1 ; maquettes au canvas J3 |
| Charge de relecture estimée et planifiée | Estimée (HYPOTHÈSE, §7), organisation proposée (D2.7), non planifiée en dates |
