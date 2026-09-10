# C'est écrit là

![corpus à jour au](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/baoleka/cestecritla/main/data/badge.json)

**« C'est écrit là »** (`cestecritla.fr`) est un projet militant **indépendant** pour faire découvrir *L'Avenir en commun, édition 2025* (programme de La France insoumise pour la présidentielle 2027) et retrouver la mesure exacte sur n'importe quel terme du programme. Application à venir sur Cloudflare (plan gratuit, 0 € d'exploitation, zéro compte, zéro donnée).

La recherche et les réponses sont **extractives** : aucun modèle de langage ne tourne à l'exécution en v1 ni en v2 (D6.10). Le texte affiché est un verbatim du corpus, pointé par son identifiant. Si la piste IA est rouverte en v3, sur trois preuves, le seul fournisseur autorisé reste Mistral via Workers AI (D0.3).

Ce dépôt contient pour l'instant la **session de découverte** (7-10 septembre 2026) : dossier de décisions, corpus canonique, design tokens, prototypes et le prompt qui lancera la session de planification.

## Réutiliser les données

`data/aec-2025.json` est, à notre connaissance, le premier jeu de données structuré et vérifié de l'édition 2025 : 4 parties, 18 chapitres, 89 sections, 837 propositions (87 mesures clés + 706 mesures + 44 sous-mesures), 48 encadrés « À savoir », identifiants stables (`c12-s01-k01`), empreintes SHA-256 par item et par section, version de corpus. Il est produit par `scripts/ingest.ts` (18 pages de chapitre → table des matières → sections, jamais de force brute) et vérifié mot à mot par `scripts/verify-corpus.ts`.

- Licence des textes et des dérivés : **CC BY-NC-SA 4.0**, attribution « **La France insoumise – L'Avenir en commun** », source https://melenchon2027.fr/programme2025/livre/ (voir `data/LICENSE`).
- Le livre annonce **831 mesures** ; le jeu de données compte 837 blocs publiés. La règle de comptage est dans `meta.counting_rule_fr`.
- Re-crawl hebdomadaire hors Worker (`.github/workflows/recrawl.yml`) : toute modification du texte source arrive par pull request de diff.

Voir `scripts/README.md` pour lancer l'ingestion, la vérification et le diff.

## Dossier de découverte

Point d'entrée : `docs/discovery/README.md`, qui indexe le dossier. Le livrable n° 1 est **`docs/discovery/prompt-final.md`** — le prompt autoportant qui lance la session de planification en plan mode ; viennent ensuite `00-resume-executif.md`, `decisions.md` (158 décisions, D0-D13), `16-hypotheses.md` et le dry run `17-dry-run-prompt.md`. `PLAN-SESSION.md` est l'archive du plan de la session de découverte, déjà exécuté.

## Licences

Code : MIT (`LICENSE`). Données et textes : CC BY-NC-SA 4.0 (`data/LICENSE`). Polices : SIL OFL 1.1 (`design/fonts/`). Les logos, affiches et illustrations de La France insoumise et de la campagne ne sont **pas** inclus dans ce dépôt.

Attribution : *La France insoumise – L'Avenir en commun*. Ce projet n'est pas édité par La France insoumise et n'engage pas le mouvement.
