# `data/2026/` — ce que ce dépôt publie de l'édition 2026

*L'Avenir en commun — Le programme de la Nouvelle France* (édition 2026) est
**© La France insoumise, tous droits réservés**. Ses mentions légales encouragent les liens vers
ses pages et admettent de courts extraits, avec l'auteur et un lien vers la page d'origine
([mentions légales](https://melenchon2027.fr/mentions-legales/), clause « Licence »).

**Le texte du programme n'est donc pas dans ce dépôt.** Il n'y a ici que de quoi le *retrouver* et
*prouver* qu'une citation est exacte.

| Fichier | Contenu | Écrit par |
|---|---|---|
| `manifest.json` | Structure du livre, titres officiels, ancres, une empreinte SHA-256 par élément, les premiers mots de chaque mesure clé (« incipit »), et un court repère par proposition : son lien le porte, et la page le montre à côté de ce lien dans un résultat de recherche — jamais sur une page servie (D16.32) | `scripts/publish-2026.ts` |
| `quotes.json` | Les propositions citées en entier par une riposte ou une carte-concept, avec leur lien | `scripts/publish-2026.ts` |
| `exposure-policy.json` | La politique de citation chiffrée : plafonds, longueur des repères, date de validation | à la main |
| `expected-invariants.json` | La forme attendue du livre (comptes) ; un écart arrête l'ingestion | `scripts/ingest-2026.ts --write-expected` |
| `id-map-2025.json` | Section de l'édition 2025 → section(s) de l'édition 2026, pour les anciennes adresses | `scripts/id-map.ts` |
| `watch.json` | Les six signaux de veille de la source | `scripts/watch-source.ts --write` |
| `search-index.json` | L'index de recherche : les racines des mots de chaque proposition, sans ordre, sans mots-outils, aucun champ stocké | `scripts/index-2026.ts` |
| `synonyms.json` | Les mots des gens à côté des mots du livre, pour la recherche ; et, sous `book_words`, quelques expressions que le livre écrit autrement, cherchées dans ses mots (D21.8). Rédigé par nous | à la main |
| `riposte.json`, `glossary.json` | Nos réponses aux objections et nos cartes-concept. Chaque appui est épinglé `{id, sha256}` ; `review` dit si le texte a été relu. Une réponse peut porter `studies` : des chiffres d'études publiques, chacun avec sa source, dont les extraits sont dans `eval/riposte-sources.json` (D21.1) — ce ne sont pas des textes du programme | à la main |
| `verification.json` | Ce que trois navigateurs ont trouvé en relisant les pages officielles et en suivant chaque lien | `scripts/verify-2026.ts --write` |
| `search-eval.json` | La qualité mesurée de la recherche sur le jeu de questions | `scripts/eval-2026.ts --write` |
| `game-words.json`, `word-links.json` | Les mots du jeu « Où est-ce écrit ? », et où trois navigateurs ont vu chacun surligné (voir « Les mots du jeu ») | la liste à la main, attestée par `scripts/words-2026.ts --attest` ; `scripts/verify-2026.ts --words --write` |
| `terms.json` | Les mots expliqués : 933 explications courtes — sigles, termes techniques, lois, traités, institutions, notions —, chacune avec un exemple inventé ou le code qui dit pourquoi elle n'en a pas. **Nos mots, pas des extraits** : écrits et vérifiés par une IA, relus par aucune personne une à une ; scellés (`meta.sealed`) et attestés sur le livre entier (`meta.attested`) — voir « Les mots expliqués » | par la session (PLAN-MOTS, D20.3) ; `scripts/lexicon-2026.ts --attest`, puis `--seal` |
| `ordinary.json` | Les mots courants que la feuille de « Demander » admet dans une question sans les trouver dans le livre : des mots neutres (`words`), et des gens et des noms (`people`), qui ne valent jamais à côté d'un sujet sensible (D16.68) | à la main |
| `sensitive.json` | La liste fermée des sujets sensibles, tirée de la lecture des racines de l'index, et les expressions qui font montrer des liens plutôt que nos phrases (D16.70, D16.73) | à la main |
| `words.json` | Où les mots expliqués paraissent hors de la feuille de « Demander » : les pages, la recherche, le jeu — un interrupteur par hôte (PLAN-MOTS, D20.11) | à la main |
| `term-places.json` | Pour chaque section, les identifiants des mots expliqués (`terms.json`) que son texte emploie — aucun mot du livre, ni où, ni combien de fois (PLAN-MOTS, lot 4) | `scripts/lexicon-2026.ts --places`, sur la machine qui tient le texte |
| `vocabulary.json` | Chaque racine de ce que le site montre — l'index du livre et nos propres textes —, jugée une fois : claire, à expliquer (et les entrées qui la tiennent), à surveiller, ou nom propre ; jugée par la session, une IA, et, pour l'index, par un autre modèle à part (PLAN-MOTS, lot 9) | `scripts/lexicon-2026.ts --vocabulary`, depuis les jugements gardés hors du dépôt |
| `game-gists.json` | Les phrases du jeu : une phrase **de nous** par mesure où un mot du jeu est épinglé (voir « Les phrases du jeu »). **Dans ce dépôt depuis le 19 novembre 2026, sur l'accord daté de l'éditeur : quarante-trois phrases ; cinq cartes gardent leur lien seul** | `npm run gists -- --game --link-only …` |

## Vérifier une citation

L'empreinte d'un élément est `sha256` de son texte normalisé : forme NFC, caractères U+200B et
U+FEFF retirés, toute suite d'espaces (insécables comprises) ramenée à une espace, sans espace au
début ni à la fin. Aucune coquille n'est corrigée. Quiconque lit une phrase sur le site officiel
peut donc recalculer son empreinte et la comparer à celle du manifeste.

```sh
printf '%s' "le texte de la proposition" | sha256sum
```

Une empreinte prouve une présence. Elle ne permet pas de reconstituer le texte.

## Ce que l'index de recherche laisse voir

L'index permet de répondre « quelles propositions parlent de ce sujet ? » sur le téléphone du
lecteur, sans serveur ni journal. Il contient pour cela le vocabulaire de chaque proposition, réduit
à ses racines (« salaires » devient « salaire »), en minuscules, sans accents, sans ordre. Il ne
contient aucune phrase et ne permet pas d'en reconstituer une.

## Combien de mots sortent

`manifest.json` porte sa propre mesure (`meta.exposure`) : part des mots des propositions visibles
comme incipit, portés par un repère de lien, ou cités en entier. La CI la recalcule à partir du
fichier et refuse tout dépassement des plafonds (`scripts/leak.test.ts`).

Où un repère se lit est un réglage de `exposure-policy.json` (`locator_display`, D16.32) :
`href`, dans le lien seulement ; `search`, aussi à côté du lien dans un résultat de recherche et
dans la sélection de « Demander ». Dans les deux cas ce sont les mêmes mots, déjà comptés : le
réglage ne change pas ce qui sort, il change où on le lit.

## Les mots du jeu

`game-words.json` liste les mots du jeu « Où est-ce écrit ? » : chacun est un mot du programme,
montré seul. C'est une catégorie d'extrait à part — un mot, jamais une phrase — que l'éditeur
valide avec sa part mesurée avant toute publication (D15.18, D16.15). Le fichier n'a de place
pour aucune phrase : un mot, l'identifiant de la mesure où il est écrit, l'empreinte de cette
mesure.

Un mot entre dans la liste s'il passe tous ces critères :

- c'est une chose concrète de la vie de tous les jours, qui se lit seule, sans la phrase autour ;
- ce n'est ni un sujet de débat, ni un groupe de personnes, ni un lieu chargé, ni l'objet d'une
  interdiction, ni un mot du corps ou de la religion, ni un nom propre, ni un mot à deux sens ;
- la mesure où il est épinglé ne commence pas par une interdiction, et un lien peut y arriver ;
- cette mesure l'écrit seul, pas seulement collé à un autre mot par un trait d'union : un livre
  qui n'écrirait que « tram-train » n'écrit pas « tram » ;
- sa racine n'est dans aucun titre que le jeu propose comme réponse ;
- il n'est écrit dans aucune section hors du périmètre du jeu, ni dans la prose ou un titre hors
  des sections où une mesure l'emploie ;
- partout où l'index donne sa racine, c'est bien lui qui est écrit, au singulier ou au pluriel,
  accents compris — jamais un autre mot de même racine ;
- une seule section le montre : deux mots de la liste ne partagent jamais un lieu ;
- il passe la question : qu'écrirait un opposant sous cette image ? **Un mot ne se lit jamais
  seul** : la carte du lieu l'affiche avec les titres officiels de sa partie, de son chapitre et
  de sa section. C'est cette carte que l'éditeur juge — `scripts/words-2026.ts --check` l'écrit
  pour chaque mot.

Tout sauf le premier, le deuxième et le dernier se prouve : `src/lib/game.ts` sur les fichiers
publics, à chaque build, et `scripts/words-2026.ts` sur le texte, en local, qui atteste la liste
et son vivier de sections par une même empreinte, et nomme les contrôles qu'elle a passés — une
attestation plus ancienne qu'un contrôle ne compte plus, et une section jugée après coup la fait
tomber. Les trois autres sont la lecture de l'éditeur, mot par mot ; pour l'y aider sans lire le
texte à sa place, `scripts/probe-2026.ts` dit si la mesure d'un mot en porte aussi un autre —
c'est ainsi qu'un sens se vérifie.

Le lien d'un mot arrive sur le début de sa mesure. Le mot lui-même n'y est surligné que là où
trois navigateurs l'ont vu surligné dans cette mesure, sur les pages enregistrées :
`word-links.json` (`scripts/verify-2026.ts --words --write`) le dit par identifiants — aucun mot
d'une page n'y entre —, et n'est cru que pour la liste et le livre sur lesquels il a été fait.

Le périmètre (D16.26) : toutes les sections du livre sont des tuiles du jeu, mais aucun mot n'est
tiré des sections sensibles — les héritières des quatorze sections sensibles de l'édition 2025
(règle 11 de `docs/discovery/07-mecaniques.md` §7.11) et les sections sans ancêtre en 2025 que
l'éditeur a écartées ; une section sans ancêtre ne prête un mot qu'une fois jugée par lui.

La liste est aussi longue que ces critères le permettent, pas plus (D16.31) : des chapitres
entiers n'ont aucun mot, et leurs sections restent des tuiles.

## Les phrases du jeu

Depuis le 18 novembre 2026 (D19.2), une carte du jeu peut montrer, sous le lieu où son mot est
écrit, **une phrase qui dit avec nos mots ce que prévoit la mesure**. Ces phrases sont dans
`game-gists.json`.

- **Ce qu'elles sont.** Des phrases écrites d'avance et vérifiées par une IA, qu'aucune
  personne n'a relues une à une — les mêmes, octet pour octet, que celles que « Demander » sert
  pour ces mesures. Le fichier le dit de lui-même (`meta.written_by`,
  `meta.read_by_a_person`), et le site les étiquette : « Phrase écrite et vérifiée par une
  IA ».
- **Ce qu'elles ne sont pas.** Des extraits : aucune ne recopie le livre, dont le texte n'est
  pas dans ce dépôt. Ni la parole du programme : chacune commence par « Le programme
  prévoit », et c'est pourtant notre résumé — une phrase pour une mesure, qui peut être
  incomplète ou imprécise. Chacune mène à la page officielle, qui seule fait foi.
- **Combien.** Au plus une par mot du jeu — quarante-huit au plus, sur 1 069 mesures ;
  **quarante-trois aujourd'hui**. Toutes les autres phrases restent dans une base privée et
  ne sont publiées dans aucun fichier — une porte locale le tient (`scripts/leak.test.ts`).
  Une carte peut garder son lien seul (`meta.link_only`) : l'éditeur en a décidé ainsi pour
  cinq, le 19 novembre 2026 — une phrase lue à contresens, et quatre fidèles à leur mesure
  mais sur des sujets lourds à côté d'une mascotte.
- **Comment le fichier est fait.** `npm run gists -- --game` l'écrit, en local, à partir du
  dépôt de phrases que `ask.json` nomme, et le scelle (`meta.sha256` : les phrases **et** ce
  que le fichier dit d'elles — qui les a écrites, le livre, la liste, le dépôt, les cartes
  laissées à leur lien). **On n'y écrit jamais une phrase à la main.** Une build n'échoue pas
  sur un fichier retouché, fait pour une autre liste de mots, une autre version du livre ou un
  autre dépôt de phrases : elle n'en montre **aucune** phrase, et garde chaque carte à son
  lien seul. Le déploiement dit alors pourquoi (`scripts/deploy.ts`), et refuse une build qui
  montre des phrases dont le fichier n'est pas, octet pour octet, celui du dépôt
  (`src/lib/game-gists.ts`, `scripts/build-mode.ts`, `scripts/game-gists.test.ts`).
- **Ce que le site en sert.** Le fichier du jeu (`/data/jeu-….json`) porte ces phrases avec
  les mots, et dit de lui-même qui les a écrites (`sentences.written_by` : « ai »,
  `sentences.read_by_a_person` : faux) : l'étiquette de la carte vit dans la page, pas dans le
  fichier, qui se lit, se garde et se copie sans elle.
- **Quand il est montré.** Seulement si l'éditeur l'a validé tel quel (`meta.validated`, un
  mot daté de lui), si le site répond aux questions (`ask.json` : « chat ») et si la décision
  de campagne le permet (D19.5). Sinon la carte montre le lieu et son lien, comme avant.
- **Ce que l'éditeur a jugé.** Les mots, un par un, sur une carte qui ne montrait que les
  titres officiels (voir « Les mots du jeu ») : la phrase n'en faisait pas partie. C'est
  pourquoi ce fichier a **sa propre validation**, distincte de celle des mots — et une carte
  peut garder son lien seul quand sa phrase, même fidèle, n'a pas sa place sous un mot du jeu.
- **Sous quels termes.** Comme le reste de ce dossier, ce fichier n'est ni sous la licence MIT
  du code ni sous Creative Commons : ce dépôt ne donne sur ces phrases aucune licence de
  réutilisation. Elles disent les mesures d'un livre dont tous les droits sont réservés.

Ce qui a été publié reste dans l'historique de ce dépôt : retirer une phrase du site se fait
par une build ; la retirer d'ici ne la rappelle pas.

## Les mots expliqués

Depuis le 19 novembre 2026 (chantier « Aucun mot ne bloque », `docs/discovery/PLAN-MOTS.md` ;
dossier : `docs/discovery/19-mots-expliques.md`), le site explique les mots du livre partout où
on le lit. Ces explications sont dans `terms.json`.

- **Ce qu'elles sont.** Des explications de connaissances générales, écrites d'avance et
  vérifiées par une IA, qu'aucune personne n'a relues une à une ; le fichier le dit de lui-même
  (`meta.written_by`, `meta.read_by_a_person`), et le site les étiquette : « Explications
  écrites et vérifiées par une IA ». Elles disent le sens d'un mot, jamais ce que prévoit le
  programme. Leurs exemples sont des cas inventés, aux montants ronds — jamais un barème de
  l'année, jamais un nombre du livre.
- **Ce qu'elles ne sont pas.** Des extraits. Les mots ont été relevés dans le livre, sur la
  machine qui le tient, par la session seule (D20.1) ; ce fichier n'en garde que les mots
  expliqués et leurs formes, jamais une phrase du livre — une porte locale refuse neuf mots du
  livre de suite (`scripts/leak.test.ts`). `term-places.json` ne dit, pour chaque section, que
  les identifiants des mots qu'elle emploie ; `vocabulary.json`, que les racines de l'index
  public et de nos textes. Les racines que seule la prose du livre emploie sont jugées hors du
  dépôt et ne sont publiées nulle part.
- **Ce qui les tient.** Quatre propriétés, dont trois sont des portes de la CI : chaque racine
  que le site montre est jugée ; chaque entrée a un exemple ou le code qui dit pourquoi non ;
  aucune explication ne s'appuie sur un mot à plus de deux pas, aucune ne tourne en rond. La
  quatrième — aucun mot jugé difficile hors d'une entrée ou d'une carte — est une porte pour
  nos propres textes ; pour le livre entier et nos 1 069 phrases, elle se vérifie sur la
  machine qui tient le livre (`npm run lexicon -- --attest`), et la CI refuse une attestation
  faite sur d'autres mots. C'est le jugement d'une IA, pas une preuve qu'aucun lecteur ne
  bute.
- **Les faits qu'elles datent.** Une année, une part, une durée : chacun est déclaré dans
  `eval/terms-sources.json` avec la page officielle qui le porte et le jour où elle a été lue,
  et relu tous les quatre-vingt-dix jours (`scripts/terms-recall.ts`, un rappel, pas une
  garde).
- **Le sceau.** `meta.sealed` porte l'empreinte des entrées : la production ne prend un
  fichier de mots que scellé tel qu'il est, et ouvert dans `words.json` (D20.15,
  `scripts/launch.ts`). Changer un mot fait tomber le sceau.
- **Sous quels termes.** Comme le reste de ce dossier, ce fichier n'est ni sous la licence MIT
  du code ni sous Creative Commons : ce dépôt ne donne sur ces textes aucune licence de
  réutilisation.

## Attribution

Toute citation affichée porte : « La France insoumise, *L'Avenir en commun*, édition 2026 », le
titre de la section et un lien vers la page d'origine.

Le code de ce dépôt est sous licence MIT. L'archive de l'édition 2025 (`data/aec-2025.json`) est
sous CC BY-NC-SA 4.0 : voir `data/LICENSE`. Ce dossier n'est ni l'un ni l'autre : les titres, les
incipits et les citations qu'il contient restent la propriété de leur auteur.
