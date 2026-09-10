# Dossier de découverte — « C'est écrit là » (cestecritla.fr)

> **État : plan d'implémentation approuvé** (10 septembre 2026). La session de planification a eu lieu ; son livrable est **`PLAN-IMPLEMENTATION.md`**. Rien n'est encore implémenté : le dépôt porte le corpus, les données dérivées, le design system, les évaluations, les prototypes et les décisions — pas l'app.
>
> **Statuts, partout** : **VÉRIFIÉ** = mesuré ou lu à la source, commande / fichier / capture cités · **PROBABLE** = déduit, ou mesuré une seule fois · **HYPOTHÈSE** = non prouvé, méthode de levée indiquée · **HYPOTHÈSE (personas)** = jugé par des personas-agents et non par des personnes (D11.1) · **DÉCLARÉ** = rapporté par l'utilisateur sans pièce collectée.

## Par où entrer

| Ordre | Fichier | Pourquoi |
|---|---|---|
| 0 | **`PLAN-IMPLEMENTATION.md`** | **Le plan approuvé**, du 11 septembre 2026 au 3 mai 2027 : P0 puis les lots 1 à 13, chacun avec son livrable, son critère de done chiffré, la mesure qui le prouve et ses heures. Il applique les sept défauts du §19.3 du prompt, date les sept gestes du §19.4 en P0, et corrige six chiffres du dossier (§14) |
| 1 | `prompt-final.md` | **Livrable n° 1**, 19 sections, autoportant. À coller tel quel dans une session Claude Code neuve **en plan mode**, ouverte à la racine du dépôt. Son **§19 ne bloque plus** : chaque point porte soit le renvoi vers la réponse déjà écrite dans le dossier, soit **la décision par défaut à appliquer**. Seuls les **sept gestes du §19.4** — identité, politique, argent, exposition juridique — restent à valider par l'utilisateur, **avant l'exécution, jamais avant la planification** |
| 2 | `00-resume-executif.md` | Le dossier en une lecture : ce qui est décidé, ce qui est mesuré, ce qui reste ouvert, la table des livrables |
| 3 | `decisions.md` | **174 décisions, D0-D14** (`grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|' docs/discovery/decisions.md`). Source unique. **D13.1 à D13.8** et **D14.8 à D14.12** = les arbitrages de l'utilisateur du 10/9/2026 ; **D14.1 à D14.7** = les sept défauts du §19.3, appliqués et réversibles |
| 4 | `16-hypotheses.md` | Registre des HYPOTHÈSES avec, pour chacune, la méthode de levée, le coût et ce qui casse si elle est fausse. §10.1 = les levées à faire avant la v1 |
| 5 | `17-dry-run-prompt.md` | **Dry run de `prompt-final.md`**, **trois passes** par une session neuve suivant le prompt à la lettre. Rejeu n° 1 : « non ». **Rejeu n° 2, après D13.1-D13.8 : « OUI, zéro question bloquante »**, avec le squelette de plan P0-P10. **§12 = dry run n° 3, plus récent et plus sévère : il prime sur le §7** et ouvre 5 contradictions dont deux touchent un critère de done. §0 = ce qui a été corrigé, §11 = la passe de clôture et les commandes de re-mesure |

## Les rapports de tâche, T1 à T12

| Fichier | Contenu |
|---|---|
| `01-faits.md` | Registre des faits ajoutés ou requalifiés depuis le plan de session |
| `02-funnel-personas.md` | Sept personas, arc 0 s → 10 s → 3 min → partage — **HYPOTHÈSE (personas)** |
| `03-corpus.md` | T1 : corpus canonique, invariants mesurés, vérification adversariale, dérivés, re-crawl |
| `04-glossaire.md` | T2 : cartes-concept, pipeline en 5 passes, FAQ routable sans LLM |
| `05-direction-artistique.md` | T3 : trois directions maquettées, panel de juges, ban list |
| `06-partage.md` | T4 : cartes OG, spike satori/resvg, protocole des aperçus, schéma `slim.json` |
| `07-mecaniques.md` | T5 : métrique nord, 31 idées → red team → MVP, table des routes, sections sensibles (**§7.11 point 11** = la règle canonique de build) |
| `08-ia.md` | T6 : contrat de fiabilité, retrieval, benchs v1 et v2, table R0-R6 (**§7 bis.6** = les seuils calculables), contrat v3 |
| `09-architecture.md` | T7 : 13 ADR, `wrangler.jsonc`, coût, dégradation, carte des journalisations, runbook |
| `10-riposte.md` | T8 : 15 objections, verbatim d'abord, mode marché, carte de partage |
| `11-conformite.md` | T9 : 40 obligations mappées à des écrans, copies exactes, revue « juriste hostile » |
| `12-positionnement-lancement.md` | T10 : audit de 6 produits, nommage, positionnement, calendrier J-30 → J+30, événements |
| `13-tests-humains.md` | T11 : sessions par personas-agents, 19 corrections bloquantes (**§3.11**), protocole du test humain bloquant (**§3.12**), **§5 = panel rouge T12** — **HYPOTHÈSE (personas)** |
| `14-risques.md` | Risques R0-R12, runbook, veille (D12.1-D12.8) |
| `15-backlog-ecarte.md` | Ce qui est écarté, avec la raison. **À ne pas re-proposer** |

## Les pièces

- `PLAN-SESSION.md` — le plan de la session de découverte, approuvé le 7 septembre 2026. **Archive** : il a été exécuté, ce n'est plus le point d'entrée.
- `neurons-log.md` — registre Workers AI, ligne par appel.
- `outillage.md` — smoke test T0 de l'outillage, écarts par rapport au plan.
- `testeurs.md` — recrutement, dates et grille des sessions de test humain.
- `domaine.md` — achat du `.fr`, zone Cloudflare, Email Routing.
- `captures/<date>/` — captures horodatées des sources officielles (HTML, en-têtes, PNG, SHA-256).
- `perf/<date>/` — 30+ rapports Lighthouse et sondes de perf.
- `annexe-*.md` — matière brute du workflow de reconnaissance (5 éclaireurs, 3 plans candidats, 3 juges, critique de complétude). À consulter pour les URLs et les chiffres sourcés.
- `../../design/` — `identity-decision.md`, `tokens.json`, `strings.json`, `contrast-matrix.md`, `voice.md`, `glossary-style-guide.md`, `illustration-rules.md`, `motion-spec.md`, `perf-budget.md`, `fonts/`, `typo/`.

## Lancer la session de planification

Dans le dépôt, ouvrir Claude Code **en plan mode** à la racine et coller le contenu de `docs/discovery/prompt-final.md`. Il dit lui-même ce qu'il attend : un plan d'implémentation étape par étape, avec un livrable, un critère de done chiffré, la mesure qui le prouve et une estimation d'heures par étape. **Il dit aussi de ne pas s'arrêter pour poser une question** : sur tout ce qui n'est pas l'un des sept gestes du §19.4, la réponse ou le défaut à appliquer est écrit.

**Les trois portes à rejouer avant de planifier** — si un chiffre a bougé, c'est le dépôt qui a raison, pas la documentation :

```
npx tsc --noEmit                    # 0 erreur
npx tsx --test scripts/*.test.ts    # 99/99
npx tsx scripts/contrast.ts         # 105 paires, 28 paires de rôles, 0 échec
```
