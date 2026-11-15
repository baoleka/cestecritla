# C'est écrit là

![édition 2025](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/baoleka/cestecritla/main/data/badge.json)

**« C'est écrit là »** (`cestecritla.fr`) est un projet militant **indépendant** pour retrouver où une mesure est écrite dans *L'Avenir en commun* (programme de La France insoumise pour la présidentielle 2027) et renvoyer à la page officielle. Cloudflare, plan gratuit, 0 € d'exploitation, zéro compte, zéro donnée. Ce projet n'est pas édité par La France insoumise et n'engage pas le mouvement.

## Où en est le projet (15 novembre 2026)

**Le programme a été réédité le 5 novembre 2026.** La nouvelle édition — « L'Avenir en commun — Le programme de la Nouvelle France », 6 parties, 23 chapitres, 111 sections, 1 069 mesures — remplace l'édition 2025 sur laquelle ce dépôt a été construit. Son texte est réécrit, et il **n'est plus sous licence Creative Commons** : « © La France insoumise, tous droits réservés », le partage de liens étant « autorisé (et encouragé) » et les courts extraits admis avec l'auteur et un lien vers la page d'origine.

Le projet change donc de régime : **renvoi + courte citation**. L'app trouve le passage et renvoie à la page officielle ; elle ne reproduit pas le texte. L'app de l'édition 2026 est construite : sommaire, recherche sur l'appareil, 111 fiches de section, ponts pour les adresses de l'édition 2025, réponses aux objections, cartes-concept, page « Exactitude ». Le plan et son journal sont dans `docs/discovery/PLAN-EDITION-2026.md`, les décisions sont D15.1 à D15.18 dans `docs/discovery/decisions.md`.

**Depuis le 13 novembre 2026, le projet prend une autre forme** (D16.1 à D16.34, plan `docs/discovery/PLAN-JEU.md`) : la page devient d'abord l'endroit où l'on **demande** ce que le programme prévoit sur un sujet, et où l'on **cherche** un thème pendant la frappe ; un **jeu** (« Où est-ce écrit ? ») suit, sur la même page. **Le site est en production sur `cestecritla.fr` depuis le 14 novembre 2026** — chercher en tapant, 111 fiches de section, le jeu — **et « Demander » y est ouvert depuis le 15** (plan `docs/discovery/PLAN-CHAT.md`, D16.45 à D16.76).

La recherche est **locale et extractive**, et **rien de ce qui est tapé ne quitte l'appareil** (D16.53) : ni en cherchant, ni en demandant. **Aucun modèle ne répond en direct** (D16.60). Pour les mesures que la recherche de la page a trouvées, « Demander » obtient — en n'envoyant que l'état du livre et trois identifiants de mesures au plus — **une phrase écrite d'avance par mesure**. Ces 1 069 phrases sont nos mots, pas des extraits : **écrites et vérifiées par une IA**, contrôlées contre le texte (ni recopie, ni chiffre ajouté, ni négation), épinglées à l'empreinte de leur mesure, **et aucune personne ne les a relues une à une — le site le dit** : l'étiquette « Phrases écrites et vérifiées par une IA » avec elles dans la feuille, « Personne ne les a relues une à une » sur ses pages « À propos », « Exactitude » et « Méthodologie ». Elles ne s'affichent que si chaque mot de sens de la question est connu de la recherche, si rien n'y nomme ni n'accuse quelqu'un, et si un sujet sensible y est demandé seul ; sinon la page montre des liens vers les mesures (D16.67 à D16.75). Aucun service d'IA extérieur, aucun tiers chargé. À défaut d'une décision écrite de l'éditeur, les phrases cessent d'être servies le 1er janvier 2027 (D16.65).

## Ce que le dépôt contient, et sous quelle licence

**L'édition 2026 : aucun texte.** Ce dépôt ne contient pas le texte de l'édition 2026 et ne le contiendra pas. Il publie, sous `data/2026/`, un manifeste — structure, titres officiels, ancres, empreintes SHA-256, et les premiers mots qui servent de repères aux liens — qui permet de retrouver un passage et de vérifier qu'une citation est exacte sans republier le texte. `data/2026/NOTICE.md` dit ce que chaque fichier contient et combien de mots en sortent ; la politique de citation est chiffrée dans `data/2026/exposure-policy.json`.

**L'édition 2025 : une archive datée.** `data/aec-2025.json` est un relevé structuré et vérifié de l'édition 2025, fait le 7 septembre 2026, quand le site source plaçait tous ses textes sous CC BY-NC-SA 4.0 : 4 parties, 18 chapitres, 89 sections, 837 propositions, 48 encadrés « À savoir », empreintes SHA-256 par item et par section. **Ce n'est plus le programme en vigueur**, et la source ne sert plus ces pages.

- Licence de ce relevé et de ses dérivés : **CC BY-NC-SA 4.0**, attribution « **La France insoumise – L'Avenir en commun** » (voir `data/LICENSE`).
- Le livre de 2025 annonçait **831 mesures** ; le relevé compte 837 blocs publiés. La règle de comptage est dans `meta.counting_rule_fr`.
- `scripts/ingest.ts`, `scripts/verify-corpus.ts` et `scripts/recrawl.ts` visent cette édition : ils ne peuvent plus être rejoués contre la source et restent comme preuve de la méthode. Voir `scripts/README.md`.

## Dossier

Point d'entrée : `docs/discovery/README.md`. À lire d'abord : `PLAN-CHAT.md` (le plan du chatbot, approuvé le 14 novembre 2026 et exécuté jusqu'à l'ouverture en production du 15 ; son journal dit ce que douze relectures indépendantes ont trouvé et changé), `PLAN-JEU.md` (le précédent, approuvé le 13 novembre et exécuté jusqu'au lancement), `PLAN-EDITION-2026.md` (le plan précédent et son journal), `decisions.md` (268 décisions, D0-D16), `14-risques.md` et `16-hypotheses.md`. Le dossier de découverte des 7-10 septembre 2026 (`00-resume-executif.md`, `prompt-final.md`, `PLAN-IMPLEMENTATION.md`) décrit le produit d'avant la réédition ; il reste la référence pour tout ce que D15 ne touche pas.

## Licences

Code : MIT (`LICENSE`). Relevé de l'édition 2025 et ses dérivés : CC BY-NC-SA 4.0 (`data/LICENSE`). Polices : SIL OFL 1.1 (`design/fonts/`). `data/2026/` n'est ni l'un ni l'autre : voir `data/2026/NOTICE.md`. Le texte de l'édition 2026, les logos, affiches et illustrations de La France insoumise et de la campagne ne sont **pas** inclus dans ce dépôt.
