# C'est écrit là (cestecritla.fr)

App Cloudflare pour faire découvrir *L'Avenir en commun 2025* (programme LFI / Mélenchon 2027) et poser une question sur n'importe quel terme du programme.

## État du projet
- Phase actuelle : **implémentation en cours** (depuis le 10 septembre 2026). Le plan est `docs/discovery/PLAN-IMPLEMENTATION.md` ; v1 publique visée le **mardi 10 novembre 2026, en crunch** (≈ 26 h/semaine, D14.8).
- **Trois arbitrages qui changent le dossier (D14.8-D14.12)** : le test humain d'avant lancement est **joué par des personas**, et les quatre portes de jugement sont **conservées non levées et publiées sur `/exactitude`** (D14.11) · si l'exposition devient intenable, **l'app est retirée** — l'identité n'est jamais publiée, ce qui **renverse D9.18** (D14.10) · **aucun message 0 à LFI** : R3 monte, et `design/tokens.neutral.json` devient un **prérequis de lancement** (D14.12).
- Point d'entrée : `docs/discovery/00-resume-executif.md`, puis `docs/discovery/decisions.md` (**174 décisions, D0-D14** — mesure : `grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|' docs/discovery/decisions.md`) et `docs/discovery/16-hypotheses.md`.
- Le livrable n° 1 est `docs/discovery/prompt-final.md` : il lance la session de planification en plan mode. Son **§19 ne bloque plus** — chaque point y porte sa réponse ou son défaut à appliquer ; seuls les sept gestes du §19.4 (identité, politique, argent, exposition juridique) restent à valider par l'utilisateur, avant l'exécution et jamais avant la planification. Le dry run est dans `docs/discovery/17-dry-run-prompt.md` (trois passes : **non**, puis **OUI** au rejeu n° 2, puis **OUI** au §12 — c'est le §12 qui prime).
- Déployé : `cestecritla.fr` (spike de partage), `proto.cestecritla.fr` (prototypes cliquables), `lab.cestecritla.fr` (labo Turnstile).

## Contraintes non négociables
- **Aucun LLM à l'exécution en v1 et en v2** (D6.10) : le chat est extractif, les réponses sont des verbatims sélectionnés par une recherche locale. Si la piste IA rouvre (contrat v3, trois preuves nommées), ce sera **Mistral via Workers AI uniquement**. Pas de Grok, pas de Gemini, pas de tier gratuit externe avec opt-in entraînement.
- **Coût d'exploitation 0 €** : plan Cloudflare gratuit, aucun moyen de paiement. Seul coût accepté : le domaine `.fr`. Statique d'abord, mode dégradé designé. Le Worker orchestre, il ne calcule pas (10 ms de CPU).
- **Fidélité absolue au texte** : tout texte de programme affiché est un verbatim pointé par son identifiant `c{N}-s{MM}-…`. Aucune coquille corrigée. Texte source sous CC BY-NC-SA 4.0 (attribution « La France insoumise – L'Avenir en commun »).
- **Zéro compte, zéro base d'utilisateurs, zéro log rattachable** (opinions politiques = données sensibles, RGPD art. 9). Aucun `console.*` sur du contenu client.
- **Charte 2027 suivie sur les couleurs et sur les polices libres qu'elle désigne** (Violet #4C0297, Rouge #D1271C, Crème #FFFCF4, Charbon #212320 ; Public Sans + Gowun Batang), avec **trois écarts assumés et listés** dans `design/identity-decision.md` §5.2 : aucun logo LFI ni M27, mascotte originale, motif de bloc réinterprété en CSS. Ban list dans `design/tokens.json` (`meta.ban_list`).
- Zéro promotion payante du 1er octobre 2026 au 2 mai 2027 (L52-1) ; gel partiel « silence électoral » (L49) codé et testé dans `scripts/silence.ts`.
- **Identité de l'éditeur non publiée** (D0.15) : commits sous `Baoleka <49430596+baoleka@users.noreply.github.com>`, aucun chemin absolu ni adresse personnelle dans les fichiers suivis.

## Conventions
- TypeScript strict sans `any`, composants fonctionnels, ESLint/Prettier, **Node 24**.
- Projet en français, **code, commentaires et clés JSON en anglais**.
- Conventional commits ; push sur `origin main` (SSH) après chaque section validée.
- Statut sur chaque fait : VÉRIFIÉ / PROBABLE / HYPOTHÈSE, avec sa preuve.
- Portes avant tout commit : `npx tsc --noEmit`, `npx tsx --test scripts/*.test.ts`, `npx tsx scripts/contrast.ts`.
