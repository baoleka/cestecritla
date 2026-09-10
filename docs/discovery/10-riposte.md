# T8 — Mode Riposte et terrain : spécification et jeu de données

> Rédigé le 7 septembre 2026 (J0/J1). Livrables : `data/riposte.json` (15 entrées), `scripts/riposte.test.ts` (porte de vérification, 8 tests le 7/9 — **13 depuis le 10/9/2026**, +4 au panel rouge T12, mesure `npx tsx --test scripts/riposte.test.ts`), ce document. Décisions respectées : D0.4 (militant P0, arrivée par lien), D0.12 (aucune mascotte enfantine), D0.16 (aucune collecte de contact), D0.18 (niveau 3 visé, test humain tranche), D0.19 (écran 0 selon l'entrée), D0.20 (« Devine le % » jamais en écran 0), D0.21 (v1 statique), D0.22 (zéro journal rattachable), D0.24 (silence électoral = gel partiel), D0.32 (critères « honteux à partager »), D1.2 (831 / 837), D1.5 (Désintox = source citée, jamais reproduite), D1.9 (cartes 2018-2024, `c13-s03-a02` exclue), D3.2 (le verbatim a sa propre typographie), D3.3 (aucun logo tiers), D10.1 (la différence est fonctionnelle).
>
> Statut des faits : **VÉRIFIÉ** = lu dans `data/aec-2025.json` (version `d29c7422004ab27c`) ou `data/desintox.json` (relevé du 7/9/2026) ; **HYPOTHÈSE** = à lever par le test humain du 11/9 (T11 session 2) ou par T9.

---

## 0. Ce que ce livrable tranche, et ce qu'il laisse ouvert

**Tranché sur pièces.**

> **Amendements du 10 septembre 2026 — panel rouge T12** (`13-tests-humains.md` §5 « Panel rouge (T12) »). Quatre constats, tous appliqués dans `data/riposte.json` v0.3.0 et dans `scripts/riposte.test.ts` (13 tests) :
> 1. **Deux liants affirmaient une absence sur le programme entier** — exactement ce que D6.4 interdit au chat, sur les objets les plus décontextualisés de l'app. `rip-10` : « il supprime **uniquement** les lignes aériennes… : **aucune mesure n'interdit l'avion** » ; `rip-12` : « Le programme **ne contient ni** sortie de l'Union **ni** sortie de l'euro. » Ce sont des quantificateurs universels sur 837 propositions, qu'aucun `measure_id` ne peut soutenir. Aggravant sur `rip-10` : son propre `reversal_note_fr` prévient que l'interdiction des jets privés est dans la réponse Désintox — la carte niait donc une interdiction que LFI défend ailleurs. **Les deux sont réécrits en positif** et un test rejette désormais tout motif de négation universelle dans un `liant_fr`.
> 2. **Une carte de partage imprimait une affirmation au-dessus d'une preuve qui ne la soutient pas.** `rip-04` posait « Le SMIC monte, les PME sont épaulées » sur `c6-s02-m05` (« Créer une caisse de péréquation interentreprises… »), qui ne dit rien du SMIC — alors que la mesure qui le dit était déjà dans l'entrée (`c8-s04-k01`, « Porter immédiatement le SMIC mensuel à 1600 euros net »). `verbatim_id` corrigé, et `share_card_fr` porte maintenant `title_kind` : un titre `claim` doit partager un mot plein avec le verbatim imprimé, un titre `topic` déclare qu'il n'affirme rien et dit pourquoi.
> 3. **Le mode verbal échappait à la règle 7 du guide de glossaire.** Les 15 liants étaient au présent non attribué (« Le SMIC monte », « La Constitution est écrite par une Assemblée constituante », « une garantie universelle couvre les impayés »). D2.2 annonçait pourtant que la règle d'étiquetage par phrase s'applique « aux liants FAQ et riposte ». Les liants concernés sont réécrits ; un test exige que **chaque phrase** d'un liant commence par « Le programme », « Le texte », « Selon le programme » ou un pronom anaphorique.
> 4. **`scripts/riposte.test.ts` ne confrontait aucune affirmation à ses passages.** Il vérifiait l'existence des ids, les chiffres, les longueurs, les slugs et les liens. Quatre tests ajoutés : négation universelle, attribution par phrase, cohérence titre/preuve, note de retournement réellement utilisable.
>
> **Reste ouvert et non fait ici** : le champ `sentence_support` (`kind` + `support_ids` par phrase, comme `data/glossary.json`) que D2.2 rend applicable aux liants de riposte. Il demande un choix éditorial par phrase — ≈ 30 mappings — et une relecture D0.27 : il est inscrit en O12 ci-dessous, pas improvisé.

- 15 objections avec, pour chacune, 2 à 4 identifiants de mesures réelles qui y répondent, une carte « À savoir » quand une carte de la même section répond, le lien Désintox quand l'idée reçue y est traitée, un liant de deux phrases étiqueté « reformulé », un titre de carte de partage et l'identifiant du verbatim à imprimer, une note « ce qu'il ne faut pas dire ». 11 entrées reprennent une idée reçue Désintox (≥ 8 demandé), 4 viennent du terrain seul (≤ 7 demandé). 15 thèmes distincts du vocabulaire fermé de `data/section-tags.json`, 23 sections du programme mobilisées (VÉRIFIÉ, `scripts/riposte.test.ts`).
- La règle **verbatim d'abord** : l'écran de réponse ouvre sur le texte exact des mesures ; le liant vient après, sous étiquette ; le lien Désintox ferme l'écran. Un tap mène à la section entière (métrique nord).
- Le fichier pèse 22 Ko (6,3 Ko gzip) et ne dépend d'aucun serveur : le mode riposte est un écran statique de la v1 (D0.21).

**Laissé ouvert (HYPOTHÈSE, §8).** La licence de réutilisation des textes Désintox (D1.5) ; le ton des objections et des liants, à relire par l'utilisateur et par un militant avant tout test ; le temps réel de riposte (< 10 s par 3 militants) ; l'ancienneté des sondages cités (10 cartes sur 13 datent de 2021).

---

## 1. Le problème que le mode résout

Le militant est en soirée de famille, sur un marché ou dans une boucle WhatsApp. Quelqu'un dit « avec vous, les impôts vont exploser ». Il a dix secondes avant que la conversation passe à autre chose. Ce qu'il lui faut, ce n'est ni un argumentaire ni un chiffre de tête (qu'on lui contestera), c'est **la phrase exacte du programme**, avec l'endroit où elle est écrite, et un objet à envoyer.

Ce que le terrain offre aujourd'hui (audit `12-positionnement-lancement.md`, VÉRIFIÉ) : le lecteur officiel n'a ni recherche ni ancre par mesure ; Désintox répond aux idées reçues par des articles de 113 à 452 mots (VÉRIFIÉ, `word_count`), sans lien vers les mesures ; laec.fr (édition 2022) avait le lien court par mesure mais pas la riposte. Personne ne relie **objection → mesure verbatim → chiffre sourcé → article Désintox** en un écran.

Trois budgets de temps (plan §4.5) appliqués au mode : **riposte < 10 s** (objection lue → verbatim à l'écran), **partage en un geste**, **arrivée par lien sans contexte** (le cousin qui reçoit la carte comprend de quoi il s'agit sans avoir vu l'objection).

---

## 2. Contraintes appliquées à chaque mécanique

| Contrainte | Comment le mode la satisfait |
|---|---|
| Zéro compte, zéro état serveur, zéro journal rattachable | Tout est dans un JSON statique servi avec l'app ; l'état (dernière flashcard vue, thème favori) vit en localStorage ; aucun événement de riposte n'est émis en v1 (§7). |
| Verbatim en ≤ 1 tap | Le recto de la flashcard (objection) se retourne sur le verbatim ; en mode marché, le bouton de thème ouvre directement la première riposte du thème sur son verbatim. |
| Surprise > accord, jamais « d'accord / pas d'accord » | Aucun geste d'adhésion ; le seul geste est « retourner » puis « envoyer ». Pas de score, pas de streak, pas de classement (D0.32). |
| Résiste au retournement (capture hostile) | La carte de partage imprime le verbatim et l'attribution CC, jamais le liant ni l'objection seule ; la note `reversal_note_fr` liste ce qu'il ne faut **pas** dire ; le sondage n'apparaît qu'avec ses mentions loi 77-808. |
| Arrivée par lien WhatsApp sans contexte | Toute riposte a une URL (`/r/rip-05`) qui ouvre sur le verbatim, avec en tête « On entend parfois : “…” » puis « Le programme dit : … », puis le lien vers la section. |
| 0 € et ≤ 2 jours de dev | Un composant Flashcard, un écran Marché (grille de boutons), un gabarit de carte réutilisé du kit T4, un générateur de QR au build. Estimation §6. |
| Critères « honteux à partager » (D0.32) | Aucun emoji, aucun mème, aucun score de personne, aucune mascotte sur les cartes de riposte ; aucun chiffre périmé mis en avant : la carte statistique porte sa date, et `rip-04` n'en affiche aucune (montant de SMIC antérieur au texte). |
| Fidélité absolue | Les mesures ne sont jamais réécrites : `measure_ids` pointe vers `data/aec-2025.json` ; le liant ne contient aucun nombre en chiffres absent des passages cités (test automatique). |
| « Devine le % » jamais en écran 0 (D0.20) | Le mode riposte n'est pas « Devine le % » : le chiffre y est **affiché**, jamais deviné. Il est rattaché au même flag de silence électoral (§5.7). |

---

## 3. Modèle de données : `data/riposte.json`

Clés JSON en anglais, textes en français (suffixe `_fr`). Le bloc `meta` porte la version du corpus, la licence, la méthode et les règles ; `entries` porte les 15 objections.

| Champ | Type | Règle | Vérifié par |
|---|---|---|---|
| `id` | `rip-NN` | Séquentiel, unique | test 1 |
| `objection_fr` | texte | ≤ 15 mots, entre guillemets, telle qu'on l'entend | test 5 |
| `theme` | texte | Un des 44 thèmes de `data/section-tags.json` | test 7 |
| `source` | `desintox` \| `terrain` | Cohérent avec `desintox_url` | test 8 |
| `answer_kind` | `verbatim-first` | Seule valeur en v1 | test 1 |
| `measure_ids` | 2 à 4 ids | Existent dans le corpus (mesures clés, mesures, sous-mesures), jamais rédigés | test 2 |
| `stat_card_id` | id ou `null` | Existe dans `data/stat-cards.json`, jamais `c13-s03-a02` (D1.9), même chapitre qu'une mesure citée | test 3 |
| `desintox_url`, `desintox_title`, `desintox_post_id` | lien ou `null` | Pointent un post relevé dans `data/desintox.json` ; le texte Désintox n'est **jamais** copié (D1.5) | test 8 |
| `desintox_fit`, `desintox_note_fr` | optionnels | `partial` quand l'article traite une idée voisine (une seule entrée, `rip-08`) | test 8 |
| `liant_fr` | texte | ≤ 2 phrases ; aucun nombre en chiffres absent des mesures ou de la carte citées | tests 4, 6 |
| `liant_kind` | `reformulé` | Étiquette affichée : « En clair (reformulé) » | test 1 |
| `share_card_fr` | `{ title_fr, verbatim_id }` | Titre ≤ 8 mots, sans emoji ; `verbatim_id` ∈ `measure_ids` | test 6 |
| `flashcard_seconds` | `10` | Compte à rebours du recto | test 1 |
| `reversal_note_fr` | texte | Ce qu'il ne faut pas dire (chiffre de tête, mot de l'adversaire, mesure absente du texte) | test 1 |

Commande : `npx tsx --test scripts/riposte.test.ts` (**13 tests au 10/9/2026** ; 8 à l'écriture, PASS le 7/9/2026, +4 au panel rouge T12 ; un identifiant inventé ou un chiffre non sourcé fait échouer le test, vérifié par mutation). Le test lit le corpus figé et échoue si `meta.corpus_version` diverge : toute nouvelle version du corpus (D1.4) impose de rejouer le test et de relire les liants.

---

## 4. Les 15 entrées

### 4.1 Objection → mesures → carte statistique → Désintox

| Id | Objection (telle qu'entendue) | Thème | Mesures citées (verbatim) | Carte « À savoir » | Désintox |
|---|---|---|---|---|---|
| rip-01 | « Avec vous, les impôts vont exploser » | impôts / fiscalité | `c6-s05-k01`, `c6-s05-m05`, `c6-s05-m07`, `c6-s05-m02` | c6-s05-a01 (68 %, Harris Interactive, juillet 2021) | [Vous voulez augmenter les impôts](https://desintox.lafranceinsoumise.fr/vous-voulez-augmenter-les-impots/) |
| rip-02 | « La retraite à 60 ans, c'est infinançable » | retraites | `c8-s08-k01`, `c8-s08-m03`, `c8-s04-k01`, `c8-s08-m01` | c8-s08-a02 (71 %, Ifop, 2022) | [La retraite à 60 ans reste infinançable](https://desintox.lafranceinsoumise.fr/ok-mais-ca-reste-infinancable/) (et [ça coûte cher](https://desintox.lafranceinsoumise.fr/la-retraite-a-60-ans-ca-coute-cher/)) |
| rip-03 | « Ils vont ruiner le pays, c'est infinançable » | finance / banques / dette | `c6-s05-m08`, `c6-s05-m11`, `c6-s05-m14`, `c6-s04-m03` | c6-s05-a03 (79 %, Harris Interactive, mai 2021) | [Vous y connaissez rien en économie…](https://desintox.lafranceinsoumise.fr/vous-y-connaissez-rien-en-economie-avec-vous-cest-la-catastrophe-assuree/) |
| rip-04 | « Augmenter le SMIC, ça tue les petites entreprises » | salaires | `c8-s04-k01`, `c6-s02-m05`, `c6-s05-m01`, `c6-s04-m06` | — (voir note) | [Vous allez tuer les petites entreprises en augmentant le SMIC](https://desintox.lafranceinsoumise.fr/vous-allez-tuer-les-petites-entreprises-en-augmentant-le-smic/) |
| rip-05 | « Avec eux, c'est l'immigration sans limite » | immigration / asile | `c16-s07-m05`, `c16-s07-m08`, `c16-s07-m01`, `c16-s07-k01` | c16-s07-a01 (83 %, Harris Interactive, juillet 2021) | [Vous êtes immigrationnistes](https://desintox.lafranceinsoumise.fr/vous-etes-immigrationnistes/) |
| rip-06 | « Vous êtes anti-flics, laxistes sur la sécurité » | sécurité / police | `c7-s08-k01`, `c7-s08-m06`, `c4-s03-m02`, `c7-s08-m07` | c7-s08-a01 (60 %, Harris Interactive, juillet 2021) | [Vous êtes anti-flics](https://desintox.lafranceinsoumise.fr/vous-etes-anti-flics/) |
| rip-07 | « Vous n'avez rien pour les campagnes » | territoires / collectivités locales | `c7-s01-k01`, `c3-s02-m04`, `c13-s02-m02`, `c15-s02-m01` | c7-s01-a01 (93 %, Ifop pour L'Humanité, mai 2021) | [La France insoumise n'en a rien à faire de la ruralité](https://desintox.lafranceinsoumise.fr/la-france-insoumise-nen-a-rien-a-faire-de-la-ruralite/) |
| rip-08 | « La 6e République, c'est Mélenchon président à vie » | démocratie / institutions | `c1-s01-m01`, `c1-s01-m02`, `c1-s01-m03`, `c1-s04-k01` | c1-s02-a01 (68 %, Harris Interactive, mai 2021) | [La France insoumise n'est pas démocratique](https://desintox.lafranceinsoumise.fr/la-france-insoumise-nest-pas-democratique/) — **partiel** (l'article traite le mouvement, pas les institutions) |
| rip-09 | « Vous êtes contre les agriculteurs » | alimentation / agriculture | `c13-s05-m01`, `c13-s05-m08`, `c13-s05-m02`, `c13-s05-k01` | c13-s05-a01 (86 %, Harris Interactive, juillet 2021) | [Vous êtes contre les agriculteurs](https://desintox.lafranceinsoumise.fr/vous-etes-contre-les-agriculteurs/) |
| rip-10 | « Avec vous, on ne pourra plus prendre l'avion » | transports | `c13-s02-m06`, `c13-s02-m02`, `c13-s02-m05`, `c13-s02-m10` | c13-s02-a01 (76 %, Harris Interactive, juillet 2021) | [Avec vous on ne pourra plus prendre l'avion](https://desintox.lafranceinsoumise.fr/avec-vous-on-ne-pourra-plus-prendre-lavion/) |
| rip-11 | « Vous êtes la France islamiste » | laïcité | `c1-s05-k01`, `c1-s05-m03`, `c1-s05-m04`, `c1-s05-m01` | — (aucune carte dans la section) | [Vous êtes la France islamiste](https://desintox.lafranceinsoumise.fr/vous-etes-la-france-islamiste/) |
| rip-12 | « Ils veulent sortir de l'UE et de l'euro » | Europe | `c17-s02-m02`, `c17-s02-m05`, `c17-s01-m03`, `c17-s01-m01` | c17-s02-a01 (68 %, Ifop, février 2019) | terrain |
| rip-13 | « Sans nucléaire, on aura des coupures de courant » | énergie | `c13-s03-k01`, `c13-s03-m02`, `c13-s03-m03`, `c13-s03-m04` | c13-s03-a01 (74 %, Harris Interactive, juillet 2021) | terrain |
| rip-14 | « Encadrer les loyers, plus personne ne louera » | logement | `c7-s05-m04`, `c7-s05-m02`, `c7-s05-m03`, `c7-s05-m09` | c7-s05-a01 (75 %, Harris Interactive, juillet 2021) | terrain |
| rip-15 | « Ils veulent tout nationaliser, c'est le communisme » | entreprise / industrie | `c2-s02-k01`, `c2-s02-m04`, `c2-s01-k01`, `c9-s02-m12` | c9-s02-a01 (90 %, Ifop pour l'Humanité, septembre 2020) | terrain |

Notes de sélection (VÉRIFIÉ par recherche de mots-clés dans le corpus) :
- `rip-04` : la carte `c8-s04-a01` porte sur un SMIC « à 1400 euros net » (juillet 2021) alors que la mesure clé `c8-s04-k01` dit « 1600 euros net » : l'afficher côte à côte serait une capture hostile garantie (D0.32, chiffre périmé). La carte reste dans la section, elle n'entre pas dans la riposte.
- `rip-08` : la carte `c1-s02-a01` (proportionnelle) est dans le même chapitre que les mesures citées, pas dans la même section ; le test accepte le niveau chapitre. L'article Désintox rattaché traite la démocratie interne du mouvement : il est marqué `partial` et sert de contexte, la riposte tient sur le texte seul.
- `rip-10` : aucune mesure de l'édition 2025 n'interdit l'avion ni ne nomme les jets privés ; seule `c13-s02-m06` (lignes aériennes avec alternative en train de moins de quatre heures) existe. L'interdiction des jets privés citée par Désintox n'est **pas** dans le texte : la note de retournement l'interdit.
- `rip-12` : aucune mesure ne contient « euro » (monnaie) ni une sortie de l'Union ; le chapitre 17 parle de désobéissance, de coopérations et de référendum sur tout nouveau traité (`c1-s04-m06`). La riposte tient précisément sur cette absence.
- `rip-13` : `c13-s03-a02` (votation militante de 2018 sur le nucléaire) n'est pas un sondage (D1.9) et n'est jamais affichée comme chiffre de riposte ; la carte retenue est `c13-s03-a01`.
- `rip-11` : aucune carte « À savoir » dans `c1-s05` ; la riposte est le verbatim seul, ce qui est précisément la bonne réponse à une accusation de ce type (ne pas débattre, lire).

### 4.2 Carte de partage et liant

| Id | Titre de carte (≤ 8 mots) | Verbatim imprimé | En clair (reformulé, ≤ 2 phrases) |
|---|---|---|---|
| rip-01 | Qui paiera plus, qui paiera moins | `c6-s05-k01` | Le programme rend l'impôt sur le revenu et la CSG progressifs : plus on gagne, plus on contribue. La TVA sur les produits de première nécessité baisse. |
| rip-02 | Soixante ans, quarante annuités, financé | `c8-s08-k01` | Le texte prévoit le retour à 60 ans pour quarante annuités et nomme ses recettes : cotisation vieillesse relevée chaque année, dividendes et revenus financiers soumis à cotisation. La réponse Désintox détaille le financement par les salaires. |
| rip-03 | D'où vient l'argent : le texte | `c6-s05-m11` | Le programme dit où il prend l'argent : niches fiscales passées au crible, taxe permanente sur les superprofits, fraude et évasion fiscales traitées en priorité. La dette publique est traitée par un audit citoyen et un réaménagement négocié. |
| rip-04 | Le SMIC monte, les PME sont épaulées | `c6-s02-m05` | Le SMIC monte, et le programme organise la solidarité entre entreprises : caisse de péréquation financée par un barème progressif, impôt sur les sociétés égal entre PME et grands groupes, reprise des dettes de pandémie des TPE et PME. |
| rip-05 | Ce que dit le texte sur l'immigration | `c16-s07-m05` | Le programme organise des voies légales et un accueil digne, et agit sur les causes des départs : accords commerciaux inégaux, dérèglement climatique, coopération internationale. Le titre de séjour de référence devient la carte de dix ans. |
| rip-06 | Police : effectifs, formation, proximité | `c7-s08-m06` | Le programme rétablit une police de proximité, double la police technique et scientifique et renforce les effectifs contre les trafics et la délinquance financière. La formation des gardiens de la paix passe à deux ans. |
| rip-07 | Campagnes : la distance maximale aux services | `c7-s01-k01` | Le programme fixe une distance maximale entre tout lieu d'habitation et les services publics essentiels, départements ruraux nommés explicitement. Il rouvre des lignes du quotidien et des gares, finance les communes rurales et rapproche urgences et maternités. |
| rip-08 | Qui écrit la Constitution, et qui vote | `c1-s01-m02` | La Constitution est écrite par une Assemblée constituante élue pour cela, dont les membres ne peuvent pas être candidats ensuite, puis soumise à référendum. Le programme ajoute le référendum révocatoire : les citoyens peuvent démettre un élu. |
| rip-09 | Prix planchers, marges encadrées, retraites agricoles | `c13-s05-m01` | Le programme garantit des prix planchers, interdit les ventes à perte, encadre les marges de la grande distribution et reprend les dettes des convertis au bio. Il engage une réforme des retraites agricoles. |
| rip-10 | Avion : ce que le texte supprime vraiment | `c13-s02-m06` | Le texte supprime uniquement les lignes aériennes qu'un train remplace en moins de quatre heures, et développe le rail, les transports à la demande hors des villes et l'aide à la réparation des voitures. Aucune mesure du programme n'interdit l'avion. |
| rip-11 | Laïcité : quatre mesures, mot pour mot | `c1-s05-k01` | Le programme garantit la liberté de conscience et l'application stricte de la laïcité : aucun financement public des édifices et activités cultuels, combat de tous les communautarismes et de l'usage politique des religions, abrogation du concordat. |
| rip-12 | Europe : désobéir, pas sortir | `c17-s02-m02` | Le programme ne contient ni sortie de l'Union ni sortie de l'euro : il désobéit aux règles incompatibles avec ses engagements sociaux et écologiques, fait primer la Constitution et construit des coopérations avec les États volontaires. |
| rip-13 | Sortie du nucléaire : le plan du texte | `c13-s03-m03` | La sortie du nucléaire est écrite et planifiée, avec démantèlement, reconversion des sites et convention collective unique pour les salariés. Le texte prévoit les technologies qui gèrent les pics et les creux, sur le double mot d'ordre de sobriété et d'efficacité. |
| rip-14 | Loyers encadrés, propriétaires garantis | `c7-s05-m02` | Le programme encadre les loyers partout et les baisse dans les grandes villes, mais il protège aussi le bailleur : une garantie universelle couvre les impayés, pour le locataire comme pour le propriétaire. Il construit des logements publics chaque année pendant cinq ans. |
| rip-15 | Ce qui redevient public, liste exacte | `c2-s02-m04` | Le programme revient sur des privatisations nommées (aéroports, autoroutes, Française des Jeux) et crée des pôles publics dans des secteurs listés : médicaments, transports, banque, énergie, armement. La liste des biens communs à collectiviser est fixée par référendum. |

Le seul nombre en chiffres présent dans un liant est « 60 » (`rip-02`), présent mot pour mot dans `c8-s08-k01` ; tous les autres nombres sont en lettres ou absents, par construction (règle du liant, `meta.liant_rule_fr`).

Les notes `reversal_note_fr` (ce qu'il ne faut pas dire) sont dans le fichier ; elles suivent trois motifs : **pas de chiffre de tête** (les montants et pourcentages des articles Désintox ne sont pas dans le programme), **pas le mot de l'adversaire** (« frontières ouvertes », « la police est le problème », « personne ne paiera plus »), **pas de mesure absente du texte** (jets privés, date de fermeture des centrales, tableau de financement).

---

## 5. Écrans et gestes

Tous les textes d'interface existent déjà dans `design/strings.json` (`riposte.*`, 12 chaînes, plus `home.direct.cta_riposte`, `nav.riposte`, `silence.share`, `share.message.*` ; registre tu par défaut D0.25) ; les libellés ci-dessous les reprennent.

### 5.1 Flashcard chronométrée (10 s)

- **Recto** : « On te dit : » + l'objection en Public Sans 700, bas de casse, entre guillemets (ce n'est pas un titre : les capitales 900 ≤ 6 mots de D3.8 sont réservées aux titres ; ≤ 15 mots doivent tenir sur 390 px en trois lignes, à vérifier en T3 partie 2), le thème en étiquette, un compte à rebours de dix secondes en arc discret (jamais un chronomètre anxiogène : aucun son, aucune vibration, aucune pénalité). Bouton principal « Retourner la carte » disponible dès la première seconde ; le compte à rebours n'est qu'un repère d'entraînement.
- **Verso** (= l'écran de réponse `verbatim-first`, §5.3).
- **Enchaînement** : « Objection suivante » tire au sort dans le thème courant ou dans tout le jeu ; l'ordre est déterministe par jour (graine = date UTC) pour que deux militants qui s'entraînent ensemble voient la même série. Aucun score, aucun compteur de « bonnes réponses » : il n'y a pas de réponse à donner, seulement un texte à retrouver.
- **État** : `localStorage` seulement (dernier thème, cartes déjà vues aujourd'hui) ; effacement en un tap dans À propos. Rien ne quitte l'appareil.
- **Reduced motion** : le retournement devient un fondu (D3.5).

### 5.2 Mode marché hors-ligne (gros boutons par thème)

- Écran plein d'une **grille de 15 boutons**, un par thème présent dans le jeu (le vocabulaire en compte 44 ; seuls les thèmes qui ont au moins une riposte s'affichent). Cible ≥ 56 px de haut, texte ≥ 18 px, contraste AA sur Crème et sur Charbon (matrice D3.4), une main, plein soleil (variante à contraste renforcé : Charbon sur Crème sans surface teintée).
- Un tap sur un thème ouvre **directement** la première riposte du thème sur son verbatim (aucune liste intermédiaire) ; un balayage horizontal ou le bouton « Objection suivante » passe à la riposte suivante du même thème ; le bouton retour ramène à la grille.
- **Hors-ligne complet** : le JSON de riposte et la projection runtime du corpus (D1.6) sont dans le bundle initial ; le mode est utilisable après une première visite même sans service worker (l'app est complète sans SW, D3.5) et devient installable avec lui (T7). Le lien Désintox est le seul élément qui exige le réseau : il s'affiche grisé avec « nécessite le réseau » quand `navigator.onLine` est faux.
- **Partage en mode marché** : le bouton « Envoyer cette riposte » ouvre Web Share avec le texte (titre + verbatim + URL) ; repli : copie dans le presse-papiers (T4).

### 5.3 Écran de réponse `verbatim-first`

Ordre fixe, du haut vers le bas, sans accordéon :

1. Rappel de l'objection en petit (« On te dit : “…” »).
2. **Zone « Texte du programme »** (Gowun Batang, filet Violet, fond #FDEDFF, D3.2) : les mesures de `measure_ids` dans l'ordre du fichier, chacune avec son identifiant lisible (« ch. 6, s5, mesure clé ») et le lien « Lire la section » → **un tap, verbatim de la section entière** (métrique nord). La mesure clé, si elle est citée, est marquée comme telle (`measure.key_label`).
3. **« Le chiffre »** : la carte `stat_card_id` dans le gabarit loi 77-808 (organisme, dates, commanditaire ou « non précisé », média de première diffusion ou « non précisé », lien vers la section) ; absente si `null`, sans espace vide.
4. **« En clair (reformulé) »** : `liant_fr`, en Public Sans, jamais dans la zone verbatim (règle 3 du guide de voix).
5. « Lire la réponse complète sur Désintox » : lien externe, titre de l'article, ouvert dans le navigateur ; absent pour les entrées `terrain`.
6. « Envoyer cette riposte » (carte de partage, §5.4).
7. Repli discret : « Ce qu'il vaut mieux ne pas dire » (`reversal_note_fr`) derrière un lien texte, jamais sur la carte.

### 5.4 Carte de partage

- Réutilise le gabarit T4 par mesure (3 ratios, PNG pré-générés au build) avec deux différences : le **titre** est `share_card_fr.title_fr` et l'**identifiant imprimé** est `share_card_fr.verbatim_id` (une seule mesure par carte, jamais le liant, jamais l'objection : la carte doit se suffire si elle est reçue sans contexte et ne doit pas mettre la phrase adverse dans la bouche du programme).
- Bande d'attribution « La France insoumise – L'Avenir en commun, CC BY-NC-SA 4.0 » + URL courte de la mesure ; aucun logo (D3.3) ; aucun pourcentage sur la carte image (le chiffre reste dans l'app avec ses mentions ; une capture d'un « 60 % » sans ses mentions est exactement ce qu'on ne veut pas voir circuler).
- Texte du partage : titre, verbatim, lien `/r/rip-NN` ; trois variantes de message (cousin, collègue, parent) déjà rédigées dans `share.message.*`.

### 5.5 QR thématique pour les tracts

- Une URL stable par thème (`/r/t/logement`) et par riposte (`/r/rip-14`), sans paramètre de suivi : l'état est dans l'URL, jamais dans un identifiant de campagne. Un QR = une URL publique que n'importe qui peut scanner, imprimer ou réimprimer.
- Le générateur de QR tourne **au build** (SVG, un par thème et par riposte, sans bibliothèque à l'exécution) ; le militant les télécharge depuis une page « Imprimer » de l'app (fichier PNG ou SVG, mention CC sous le code).
- Usage prévu : coin de tract thématique (logement, retraites, impôts…) commandé sur materiel.actionpopulaire.fr ; le QR ouvre la grille du thème sur le verbatim. **Nous ne produisons pas de tracts**, nous fournissons un code à coller sur les leurs ; aucune intégration technique avec Action Populaire.
- Silence électoral : un QR imprimé avant le début du silence (bornes figées en T9 sur le décret de convocation, D0.24) continue de résoudre pendant le silence, vers la **lecture** (autorisée), avec le partage gelé (§5.7). Aucun QR ne doit être créé le week-end du scrutin avec un message d'appel au vote.

### 5.6 Frontière explicite avec Action Populaire

- L'app **ne demande jamais** un nom, un téléphone, une adresse mail, une commune ni un groupe d'action. Aucun formulaire, aucune case à cocher, aucun « recevoir les prochaines ripostes ». Aucune notification.
- Action Populaire est un **lien sortant** (D0.16) sur l'écran À propos et, au plus, sous la page « Imprimer » (« Commander des tracts sur materiel.actionpopulaire.fr ») ; jamais un bouton dans le parcours de riposte, jamais un pré-remplissage, jamais un partage de données dans un sens ou dans l'autre.
- Le code d'actionpopulaire.fr (AGPL) n'est ni copié ni importé (D1.11).
- Rôles : Action Populaire organise les militants ; le mode riposte leur donne un texte à citer. La phrase de la page À propos : « On ne sait pas qui tu es, et on n'a pas besoin de le savoir pour te donner la phrase exacte. »

### 5.7 Silence électoral et mode dégradé

- Le flag KV de silence (D0.24) gèle **le partage** (bouton et QR de partage inactifs, texte `silence.*`) et **la flashcard chronométrée** (elle relève de l'entraînement militant, pas de la lecture) ; **la lecture des ripostes reste ouverte** (verbatim, chiffre avec mentions, lien Désintox), comme la lecture du programme.
- Le mode riposte n'a pas de mode dégradé propre : il ne dépend d'aucun quota. Si le lien Désintox est hors ligne ou si le site distant ne répond pas, la ligne s'affiche grisée ; rien d'autre ne change.

---

## 6. Coût et effort (0 €, ≤ 2 jours)

| Brique | Effort | Dépendances |
|---|---|---|
| Chargement de `riposte.json` + résolution des ids dans la projection runtime | 0,25 j | D1.6 (projection) |
| Composant Flashcard (recto/verso, compte à rebours, tirage déterministe, localStorage) | 0,5 j | tokens D3.1, chaînes `riposte.*` |
| Écran Marché (grille de thèmes, navigation, hors-ligne) | 0,5 j | matrice de contraste D3.4 |
| Écran de réponse verbatim-first (réutilise le composant mesure et le gabarit StatCard T9) | 0,25 j | gabarit 77-808 (T9) |
| Carte de partage (variante titre + verbatim du kit T4) et routes `/r/…` | 0,25 j | kit T4 |
| QR au build + page « Imprimer » | 0,25 j | domaine `.fr` (D0.13) pour les QR définitifs |

Total ≈ 2 jours ; aucun coût d'exploitation (statique, aucune requête serveur). Le QR définitif attend le domaine : les QR de test pointent `*.workers.dev` et ne doivent pas être imprimés.

---

## 7. Journalisation

Aucun événement de riposte n'est émis en v1 : ni l'objection consultée, ni le thème, ni le partage. Le journal des mots inconnus (D0.22) ne concerne que la recherche. Si T9 conclut qu'un compteur agrégé par thème et par jour (sans identifiant, sans IP, purge 30 j) est acceptable, il sera ajouté en v2 avec une ligne dans la politique de confidentialité ; par défaut, non (HYPOTHÈSE, décision T9).

---

## 8. Ce que le test humain doit mesurer (T11, session 2, vendredi 11/9 midi)

Protocole pour **3 militants au moins** (codes M1-M3, Android et iPhone, D0.33), 6 minutes par personne, prototype cliquable avec le vrai `riposte.json`.

| # | Tâche | Mesure | Seuil de réussite |
|---|---|---|---|
| R1 | Depuis l'écran 0 « arrivée directe », on lit à voix haute une objection tirée au sort parmi 5 (impôts, retraite, immigration, nucléaire, loyers). Le militant doit afficher **le verbatim** qui répond. | Temps entre la fin de la lecture et l'affichage de la zone « Texte du programme » | **< 10 s** pour 3 militants sur 3, sur les 5 objections ; on note la voie utilisée (mode marché, flashcard, recherche) |
| R2 | Même chose en mode marché, écran verrouillé sur la grille, téléphone en mode avion | Temps ; erreurs de thème (tap sur le mauvais bouton) | < 10 s ; ≤ 1 erreur de thème par militant |
| R3 | « Envoie cette riposte à quelqu'un qui n'est pas militant » (vrai envoi WhatsApp) | Nombre de gestes ; aperçu reçu lisible sans contexte (le destinataire dit de quoi il s'agit) | ≤ 2 gestes ; le destinataire nomme le sujet en < 15 s |
| R4 | « Cette carte, tu aurais honte de l'envoyer ? » (D0.32), et « qu'est-ce qu'un adversaire ferait d'une capture d'écran ? » sur trois cartes (rip-06, rip-11, rip-13) | Verbatims ; retournements imaginés | Aucune honte déclarée ; aucun retournement qui ne soit déjà couvert par `reversal_note_fr` ; sinon la carte est réécrite avant J4 soir |
| R5 | Relecture du ton : les 15 objections « telles qu'entendues » et les 15 liants, lus par un militant et par un non-politisé | Mots jugés potaches, condescendants, jargonnants ; objections « qu'on n'entend pas comme ça » | Toute objection reformulée par ≥ 2 testeurs est réécrite ; tout liant jugé « ce n'est pas ce que dit le texte » est renvoyé au verbatim |
| R6 | Le chiffre : « ce sondage, il date de quand ? » sur rip-01 (juillet 2021) | Le testeur retrouve la date et l'organisme sans aide | 3/3 ; sinon le gabarit 77-808 est revu en T9 |

Grille de saisie : celle de `testeurs.md` (tâche × personne × temps × verbatim, sans identifiant). Sortie attendue : « riposte < 10 s par 3 militants » devient VÉRIFIÉ ou le mode retourne en conception (voies de secours : réduire à 10 objections, remonter le mode marché en écran 0 direct, D0.19).

Juges de la revue adversariale (plan T5) à faire passer sur les 15 cartes avant la session : militant RN (« que capture-t-il ? »), fact-checker (« quel chiffre du liant n'est pas dans le texte ? » — réponse attendue : aucun, par test), juriste CNIL (aucune donnée : rien à juger), chasseur de captures 2021 (sondages datés).

---

## 9. Points ouverts

| # | Point | Statut | Levée |
|---|---|---|---|
| O1 | **Licence des textes Désintox** (D1.5) : `data/desintox.json` porte la note « droits La France insoumise, pas de reproduction intégrale sans vérification ». Le mode n'affiche que le titre de l'article et le lien ; si même le titre pose problème, on affiche « Lire la réponse complète sur Désintox » sans titre. | HYPOTHÈSE | T9 (revue juriste hostile), question à poser à l'équipe Désintox avec le dataset offert (D0.28) |
| O2 | **Relecture du ton par l'utilisateur** : objections « telles qu'entendues », liants, notes de retournement, titres de cartes ; en particulier rip-08 (nom propre dans l'objection), rip-11 (accusation reprise mot pour mot au recto), rip-15 (« communisme »). Option : afficher au recto une version atténuée et garder la formule brute dans le fichier. | HYPOTHÈSE | Utilisateur avant le 9/9, puis R5 |
| O3 | **Ancienneté des sondages** : 10 cartes sur 13 datent de 2021, une de 2019, une de 2020, une de 2022 (cartes du programme lui-même, D1.9). Le gabarit 77-808 affiche la date en clair ; le juge « capture hostile 2021 » décide si certaines cartes doivent sortir de la riposte (candidates : rip-12, février 2019). | HYPOTHÈSE | T5 juge, T9 gabarit |
| O4 | **rip-08** : rattachement Désintox partiel ; si l'utilisateur préfère un rattachement strict, l'entrée passe en `terrain` (on reste à 10 grounded ≥ 8). | Décision utilisateur | J1 |
| O5 | **rip-04 sans chiffre** : accepter l'absence de carte, ou citer `c8-s04-a01` avec une mention explicite « montant de 2021 » ? Recommandation : absence (D0.32). | Décision utilisateur | J1 |
| O6 | **Objections en réserve** (non retenues pour tenir 15, candidates v2 avec Désintox existante) : « Augmenter les salaires, ça détruit l'économie » (787), « Vous proposez la société du chômage de masse » (790, `c8-s01-k01`, carte `c8-s01-a01`), « Vous soutenez les violences en manifestation » (2108, `c4-s03-m04/m06`), « Vous êtes contre les agriculteurs / pesticides » (déjà rip-09) ; sans Désintox : « Travailler moins, c'est la faillite » (`c8-s02-k01`, carte `c8-s02-a01`, Ifop 2024, la plus récente du corpus), « Sortir de l'OTAN, c'est désarmer la France » (`c16-s01-k01`, `c16-s02-m01`), « Ils vont confisquer les héritages » (`c6-s05-m06`), « Ils veulent légaliser la drogue » (`c15-s03`, carte à 57 % : risque de capture). Exclues à dessein : Poutine, Hamas, antisémitisme (2104, 1105, 1101) : aucune mesure verbatim n'y répond en un tap, la riposte y serait du commentaire. | Backlog | v2 |
| O7 | **Mesure de l'usage** : aucun événement en v1 (§7) ; compteur agrégé par thème à trancher en T9. | HYPOTHÈSE | T9 |
| O8 | **QR définitifs** : attendent le domaine `.fr` (D0.13) ; les QR de test ne sont pas imprimables. | Bloqué | T10 |
| O9 | **Sous-mesures** : aucune entrée n'en cite ; le test les accepte (`c8-s04-m02.s2` existe). Vérifier au rendu qu'une sous-mesure citée seule s'affiche avec sa mesure parente (D1.8). | À vérifier | T7 |
| O11 | **Longueur des titres de carte** : la consigne T8 autorise 8 mots ; la règle d'illustration D3.8 limite les titres en capitales 900 à 6 mots. Sept titres font 7 ou 8 mots (rip-04, 05, 07, 08, 10, 11, 13). Soit la carte de riposte compose le titre en Public Sans 700 bas de casse (hors règle D3.8), soit ces titres sont raccourcis en T3 partie 2. | Décision T3 | J3 canvas |
| O10 | **Actualisation annoncée du programme** (synthèse des contributions) : toute nouvelle version du corpus (D1.4) fait échouer le test sur `corpus_version` ; les 15 entrées sont à relire, les liants à re-vérifier. **Amendé le 10/9 (panel rouge T12)** : l'égalité de `corpus_version` est le seul garde-fou automatique, et un simple bump la remet au vert sans que personne n'ait relu un liant. Les quatre tests ajoutés (négation universelle, attribution par phrase, cohérence titre/preuve, chiffres) sont désormais le garde-fou qui survit à un re-crawl ; la relecture manuelle reste due, mais elle n'est plus la seule barrière. | Veille + CI | re-crawl hebdo |
| O11 | **Une objection par thème, et c'est définitif en l'état.** 15 entrées pour 15 thèmes : la deuxième objection sur les impôts, sur l'immigration, sur les retraites n'a pas de fiche et retombe sur une recherche qui manque une question sur cinq (rappel@5 0,813). Les huit objections en réserve d'O6 ont leurs ids trouvés, mais **aucune version du calendrier ne les accueille** : la v2 est « poser une question sans IA » + PWA, la v3 les deux mécaniques, et le gel du 1er mars 2027 interdit d'ajouter une entrée. Conséquence jamais écrite : l'outil de terrain atteint sa limite à la deuxième conversation sur le même sujet. **À trancher** : soit dater un bloc riposte dans le creux du 11 décembre → 3 janvier (≈ une demi-journée au rythme mesuré au §6), avec un critère de v2 « ≥ 3 objections sur chacun des 5 thèmes les plus demandés, dictées par les militants en réunion, pas choisies par nous » ; soit écrire la limite en toutes lettres au §0, pour qu'elle soit assumée et non subie. | Décision utilisateur | avant la v2 |
| O12 | **`sentence_support` sur les 15 liants** (D2.2 : « s'applique aux liants FAQ et riposte »). ≈ 30 phrases à étiqueter `verbatim` / `reformule` et à rattacher à leurs `support_ids`, puis test partagé avec `scripts/glossary.test.ts`. Ouvert par le panel rouge T12 ; demande une passe éditoriale, pas un script. | Développement + relecture D0.27 | avant le gel du 1er mars 2027 |

---

## 10. Sources

- `data/aec-2025.json` (version `d29c7422004ab27c`, crawl du 7/9/2026 16:30 UTC), `data/stat-cards.json`, `data/section-tags.json`, `data/desintox.json` (26 posts, catégorie « Idées reçues », relevé du 7/9/2026 15:53 UTC, https://desintox.lafranceinsoumise.fr/).
- `docs/discovery/PLAN-SESSION.md` §3.5, §4, T5, T8, T9, T11 ; `docs/discovery/decisions.md` (D0.4, D0.12, D0.16, D0.18-D0.24, D0.32, D1.2, D1.5, D1.9, D3.2-D3.4, D10.1) ; `docs/discovery/12-positionnement-lancement.md` §2-4 ; `docs/discovery/testeurs.md` ; `design/strings.json` (`riposte.*`, `share.*`, `silence.*`), `design/voice.md` (règle 3 : le programme parle en son nom).
- Loi n° 77-808 du 19 juillet 1977, art. 2 (mentions obligatoires des sondages) : `data/stat-cards.json` `meta.legal_77_808_fr`.
