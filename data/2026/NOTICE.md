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

## Vérifier une citation

L'empreinte d'un élément est `sha256` de son texte normalisé : forme NFC, caractères U+200B et
U+FEFF retirés, toute suite d'espaces (insécables comprises) ramenée à une espace, sans espace au
début ni à la fin. Aucune coquille n'est corrigée. Quiconque lit une phrase sur le site officiel
peut donc recalculer son empreinte et la comparer à celle du manifeste.

```sh
printf '%s' "le texte de la proposition" | sha256sum
```

Une empreinte prouve une présence. Elle ne permet pas de reconstituer le texte.

## Combien de mots sortent

`manifest.json` porte sa propre mesure (`meta.exposure`) : part des mots des propositions visibles
comme incipit, portés par un repère de lien, ou cités en entier. La CI la recalcule à partir du
fichier et refuse tout dépassement des plafonds (`scripts/leak.test.ts`).

## Attribution

Toute citation affichée porte : « La France insoumise, *L'Avenir en commun*, édition 2026 », le
titre de la section et un lien vers la page d'origine.

Le code de ce dépôt est sous licence MIT. L'archive de l'édition 2025 (`data/aec-2025.json`) est
sous CC BY-NC-SA 4.0 : voir `data/LICENSE`. Ce dossier n'est ni l'un ni l'autre : les titres, les
incipits et les citations qu'il contient restent la propriété de leur auteur.
