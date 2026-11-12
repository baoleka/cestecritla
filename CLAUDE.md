# C'est écrit là (cestecritla.fr)

App Cloudflare pour retrouver où une mesure est écrite dans *L'Avenir en commun* (programme LFI / Mélenchon 2027) et renvoyer à la page officielle.

## État du projet
- **Le programme a été réédité le 5 novembre 2026** (D15.1) : « L'Avenir en commun — Le programme de la Nouvelle France », 6 parties, 23 chapitres numérotés par partie, 111 sections, **1 069 mesures**. Le texte est réécrit (181 des 837 propositions de 2025 sont restées mot pour mot) et le livre-programme **n'est plus sous Creative Commons** : « © La France insoumise, tous droits réservés », liens encouragés, courts extraits admis avec l'auteur et un lien vers la page d'origine.
- Phase actuelle : **migration vers l'édition 2026**. Le plan est `docs/discovery/PLAN-EDITION-2026.md` (lots A à F) ; il remplace les lots 2 à 13 de `PLAN-IMPLEMENTATION.md`. **v1 publique visée le mardi 15 décembre 2026** (D15.5) : sommaire, recherche, riposte, 5 cartes-concept ré-ancrées.
- **Régime « renvoi + courte citation »** (D15.2) : l'app trouve le passage et renvoie à la page officielle ; elle ne reproduit pas le texte. **Aucune demande d'autorisation à LFI** (D15.3 : D14.12 tient).
- Arbitrages antérieurs toujours en vigueur (D14.8-D14.12) : le test d'avant lancement est **joué par des personas**, et les quatre portes de jugement sont **conservées non levées et publiées sur `/exactitude`** (D14.11) · si l'exposition devient intenable, **l'app est retirée** — l'identité n'est jamais publiée (D14.10) · `design/tokens.neutral.json` est un **prérequis de lancement** (D14.12).
- Point d'entrée : `docs/discovery/PLAN-EDITION-2026.md`, puis `docs/discovery/decisions.md` (**187 décisions, D0-D15** — mesure : `grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|' docs/discovery/decisions.md`), `docs/discovery/14-risques.md` (R2 réalisé, R20) et `docs/discovery/16-hypotheses.md`. Le dossier de découverte (`00-resume-executif.md`, `prompt-final.md`) décrit le produit **d'avant la réédition** : il reste la référence pour tout ce que D15 ne touche pas.
- Déployé : `cestecritla.fr` et `www` servent la **page d'attente** depuis le 12 novembre 2026 (Worker `cestecritla`, fichiers statiques seuls) ; `beta.cestecritla.fr` est l'hôte d'aperçu (`noindex`), où l'app se construit jusqu'au jour J. Les huit Workers de septembre (spike, `proto.`, `lab.`, labos) et la base D1 du labo ont été **supprimés le 12 novembre 2026** ; leur code reste dans `prototypes/`. Rien de ce que le projet sert n'est indexable avant J-3.
- Gestes de l'utilisateur encore dus : P0.2 à P0.5 et P0.8 (`PLAN-IMPLEMENTATION.md` §4) ; activation d'Analytics Engine avant tout déploiement de l'app (D15.13) ; validation de la politique de citation sur mesure réelle avant le premier push du manifeste (D15.7).

## Contraintes non négociables
- **Aucun LLM à l'exécution en v1 et en v2** (D6.10) : la recherche est extractive, les réponses sont des renvois et de courtes citations sélectionnés par une recherche locale. Si la piste IA rouvre (contrat v3, trois preuves nommées), ce sera **Mistral via Workers AI uniquement**. Pas de Grok, pas de Gemini, pas de tier gratuit externe avec opt-in entraînement.
- **Coût d'exploitation 0 €** : plan Cloudflare gratuit, aucun moyen de paiement. Seul coût accepté : le domaine `.fr`. Statique d'abord, mode dégradé designé. Le Worker orchestre, il ne calcule pas (10 ms de CPU).
- **Fidélité au texte, sans le reproduire** (D15.2, D15.6, D15.7) : tout texte du programme affiché est un verbatim **court, attribué et lié à la page d'origine**, dont l'exactitude se prouve par empreinte SHA-256. Aucune coquille corrigée. **Le texte de l'édition 2026 n'entre jamais dans ce dépôt ni dans `dist/`** : il vit sous `private/`, ignoré par git, et le dépôt ne publie qu'un manifeste d'empreintes. Le corpus 2025 (`data/aec-2025.json`, CC BY-NC-SA 4.0, attribution « La France insoumise – L'Avenir en commun ») est une **archive datée**, jamais plus « le programme ». **Aucun comparatif public 2025 → 2026** (D15.9).
- **Zéro compte, zéro base d'utilisateurs, zéro log rattachable** (opinions politiques = données sensibles, RGPD art. 9). Aucun `console.*` sur du contenu client.
- **Charte 2027 suivie sur les couleurs et sur les polices libres qu'elle désigne** (Violet #4C0297, Rouge #D1271C, Crème #FFFCF4, Charbon #212320 ; Public Sans + Gowun Batang), avec **trois écarts assumés et listés** dans `design/identity-decision.md` §5.2 : aucun logo LFI ni M27, mascotte originale, motif de bloc réinterprété en CSS. Ban list dans `design/tokens.json` (`meta.ban_list`).
- Zéro promotion payante du 1er octobre 2026 au 2 mai 2027 (L52-1) ; gel partiel « silence électoral » (L49) codé et testé dans `scripts/silence.ts`.
- **Identité de l'éditeur non publiée** (D0.15) : commits sous `Baoleka <49430596+baoleka@users.noreply.github.com>`, aucun chemin absolu ni adresse personnelle dans les fichiers suivis.

## Conventions
- TypeScript strict sans `any`, composants fonctionnels, ESLint/Prettier, **Node 24** (`nvm use 24` : le `node` par défaut de la machine est v20).
- Projet en français, **code, commentaires et clés JSON en anglais**.
- Conventional commits ; push sur `origin main` (SSH) après chaque section validée.
- Statut sur chaque fait : VÉRIFIÉ / PROBABLE / HYPOTHÈSE, avec sa preuve.
- Portes avant tout commit : `npx tsc --noEmit`, `npx tsx --test scripts/*.test.ts`, `npx tsx scripts/contrast.ts`.
- **Jamais de `wrangler deploy` nu** : `npm run deploy` (l'apex, qui n'accepte que la build d'attente jusqu'au jour J) ou `npm run deploy:preview`. Hors terminal interactif, wrangler reprend un domaine déjà attaché sans poser la question : la bascule de l'apex est un geste de l'utilisateur.
- Un crawl de la source, la suppression d'un Worker et le premier push d'un manifeste demandent l'accord de l'utilisateur **au moment de le faire**.
