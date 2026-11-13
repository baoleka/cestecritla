# `data/2026/` — ce que ce dépôt publie de l'édition 2026

*L'Avenir en commun — Le programme de la Nouvelle France* (édition 2026) est
**© La France insoumise, tous droits réservés**. Ses mentions légales encouragent les liens vers
ses pages et admettent de courts extraits, avec l'auteur et un lien vers la page d'origine
([mentions légales](https://melenchon2027.fr/mentions-legales/), clause « Licence »).

**Le texte du programme n'est donc pas dans ce dépôt.** Il n'y a ici que de quoi le *retrouver* et
*prouver* qu'une citation est exacte.

| Fichier | Contenu | Écrit par |
|---|---|---|
| `manifest.json` | Structure du livre, titres officiels, ancres, une empreinte SHA-256 par élément, les premiers mots de chaque mesure clé (« incipit »), et un court repère par proposition, utilisé seulement dans les liens | `scripts/publish-2026.ts` |
| `quotes.json` | Les propositions citées en entier par une riposte ou une carte-concept, avec leur lien | `scripts/publish-2026.ts` |
| `exposure-policy.json` | La politique de citation chiffrée : plafonds, longueur des repères, date de validation | à la main |
| `expected-invariants.json` | La forme attendue du livre (comptes) ; un écart arrête l'ingestion | `scripts/ingest-2026.ts --write-expected` |
| `id-map-2025.json` | Section de l'édition 2025 → section(s) de l'édition 2026, pour les anciennes adresses | `scripts/id-map.ts` |
| `watch.json` | Les six signaux de veille de la source | `scripts/watch-source.ts --write` |
| `search-index.json` | L'index de recherche : les racines des mots de chaque proposition, sans ordre, sans mots-outils, aucun champ stocké | `scripts/index-2026.ts` |
| `synonyms.json` | Les mots des gens à côté des mots du livre, pour la recherche. Rédigé par nous | à la main |
| `riposte.json`, `glossary.json` | Nos réponses aux objections et nos cartes-concept. Chaque appui est épinglé `{id, sha256}` ; `review` dit si le texte a été relu | à la main |
| `verification.json` | Ce que trois navigateurs ont trouvé en relisant les pages officielles et en suivant chaque lien | `scripts/verify-2026.ts --write` |
| `search-eval.json` | La qualité mesurée de la recherche sur le jeu de questions | `scripts/eval-2026.ts --write` |

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

## Attribution

Toute citation affichée porte : « La France insoumise, *L'Avenir en commun*, édition 2026 », le
titre de la section et un lien vers la page d'origine.

Le code de ce dépôt est sous licence MIT. L'archive de l'édition 2025 (`data/aec-2025.json`) est
sous CC BY-NC-SA 4.0 : voir `data/LICENSE`. Ce dossier n'est ni l'un ni l'autre : les titres, les
incipits et les citations qu'il contient restent la propriété de leur auteur.
