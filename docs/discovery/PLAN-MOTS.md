# Plan — Aucun mot ne bloque

Les mots et les idées du programme, expliqués partout où on les lit (cestecritla.fr). Plan arrêté le 19 novembre 2026, après huit réponses de l'éditeur, trois explorations du dépôt et deux relectures de conception (architecture ; chaîne des textes). Ses décisions : D20.1 à D20.15. **Approuvé par l'éditeur le 19 novembre 2026.**

**Le journal d'exécution, en fin de fichier, dit où en est le travail.** Le texte ci-dessous est le plan tel qu'il a été approuvé ; ce que l'exécution y change est écrit au journal, pas ici.

**À qui exécute.** Ce plan s'exécute en mode auto, sous le mandat D20.3. Lire `CLAUDE.md`, puis ce plan en entier. Le copier dans `docs/discovery/PLAN-MOTS.md` (chemins relatifs au dépôt : une porte refuse les chemins absolus) et y tenir un **journal d'exécution** en fin de fichier — c'est lui qui dit où en est le travail d'une fenêtre de contexte à l'autre. Aucune question en route, hors des sept cas d'arrêt listés plus bas. Les numéros de ligne cités sont ceux du commit `3ee0545`.

## Contexte

Ta demande : plus de termes définis, plus de concepts définis ; un exemple non infantilisant pour tout ce qui est jugé compliqué au niveau lycée ; qu'aucun terme ne bloque le visiteur qui explore le programme.

Ce que l'exploration a établi (VÉRIFIÉ le 19 novembre 2026) :

- **259 mots expliqués** (`data/2026/terms.json`, D16.62), choisis d'après ce que nos phrases emploient — jamais d'après un balayage du livre. Aucun exemple. Leurs explications emploient elles-mêmes des mots non expliqués (« taux directeurs », « niveau de vie médian », « procureur »).
- **Ils ne se voient que dans la feuille « Demander »**, quatre au plus par réponse. Ni les 111 fiches de section, ni les cartes du jeu (15 des 43 phrases emploient un mot déjà expliqué), ni nos 15 réponses et nos 5 cartes, ni la recherche. Aucune page ne les liste.
- **5 cartes-concept** seulement (`data/2026/glossary.json`).
- **L'index public ne couvre que 64 % du livre** : la prose (introduction, textes de partie, de chapitre, de section — 13 772 mots sur 38 223) n'y est pas.
- **Trois portes mordent** : les données téléchargées (124,5 Ko pour 130 Kio), le script de la feuille (16 171 octets pour 16 384), et « seules l'accueil et quatre pages de faits nomment une IA dans leur HTML » (D19.6).

## Ce que tu as tranché le 19 novembre 2026

| | Décision | Ta réponse |
|---|---|---|
| D20.1 | La session d'implémentation lit `private/` — le livre et nos 1 069 phrases — pour ce chantier. Elle seule, jamais un sous-agent. | « Oui, livre et phrases » |
| D20.2 | L'exemple d'un terme difficile est un **cas concret d'adulte** : situation de la vie adulte ou cas chiffré simple, au présent, impersonnel ; montants ronds donnés comme des exemples, jamais un barème de l'année ; ni « imagine », ni ton scolaire, ni parti, ni programme. | « Cas concret d'adulte », sur quatre exemples montrés |
| D20.3 | **Mandat complet pour ce chantier**, comme le 14 novembre : textes, push (fichiers dérivés du livre compris), aperçu et production sans question, sur les seules portes et relectures indépendantes. Aucune personne n'aura lu les textes, et le site continue de le dire. | « Jusqu'à la production » |
| D20.4 | Le jeu explique les mots de la phrase d'une carte **sous la carte, hors de son cadre, après « Mot suivant »** ; explications sans exemple, dans le fichier du jeu, dont le plafond passe de 12 à 14 Ko. Dernier lot de code ; abandonné, et dit, si une porte du jeu ou la lecture des personas ne tient pas. | « Oui, en dernier lot », puis « Sous la carte » (la mesure : 26 px de marge pour une ligne de 44) |
| D20.5 | Un dispositif propre au programme, qu'une mesure définit, a **une carte courte** : une ou deux phrases de nous, adossées à la mesure épinglée. Seulement si on rencontre son nom ailleurs que dans cette mesure. | « Une carte courte » |
| D20.6 | Peuples, religions, origines : **une phrase d'identification**, de dictionnaire, sourcée ; jamais d'exemple ; deux lectures hostiles, une de chaque bord ; chaque entrée nommée dans le bilan. | « Une phrase d'identification » |
| D20.7 | Un vérificateur d'un autre modèle relit chaque nouvelle carte contre **la page publique officielle** des mesures qu'elle cite : quelques dizaines de chargements espacés, rien d'enregistré. | « Oui, les pages citées » |

## Ce que ce plan amende en plus (approuver le plan vaut accord)

- **D20.8 — Ce que « aucun mot » couvre** : ce que le site montre (nos textes, les titres officiels, les premiers mots) et les mots du livre lui-même, prose comprise. Pas ce que le site officiel ajoute hors du livre (encadrés, légendes) : `/exactitude` le dira.
- **D20.9 — Le lecteur de référence** : un élève qui entre en seconde générale, lit couramment, n'a pas fait de SES et ne suit pas la politique. Un adulte de trente ans est le plafond : il ne doit pas se sentir pris de haut.
- **D20.10 — D16.62 amendée** : (a) les mots sont désormais relevés dans le livre ; les explications restent des connaissances générales ; (b) une entrée porte un `example`, ou le code qui dit pourquoi elle n'en a pas ; (c) sous les mesures, la feuille explique **tous** les mots des phrases affichées — le plafond de quatre ne vaut plus que pour « Les mots de ta question » ; (d) un exemple peut porter un montant rond, inventé ; jamais un barème, un taux ou un seuil légal de l'année, jamais un nombre du livre ; (e) les explications paraissent hors de la feuille.
- **D20.11 — D19.6 étendue** : une explication n'est jamais écrite dans le HTML. Elle arrive par script, depuis `/data/` (non indexé), avec son étiquette dans le même fichier. Seule la page « Mots du programme » porte l'étiquette dans son HTML et rejoint les pages qui nomment une IA. Les explications suivent le mode du site (D19.5) : la build « off » ou « scrutin » n'en porte aucune.
- **D20.12 — Les budgets, dits par geste** : 130 Kio pour tout ce qu'une visite télécharge avant d'ouvrir une explication — **inchangé**. À part : les explications (52 Kio) et les exemples (44 Kio), demandés à la première explication ouverte ; un fichier par page lue (6 Kio). Le script de la feuille garde ses 16 Kio ; le module des mots, chargé à part, reçoit son plafond au lot 3 : sa mesure plus 20 %, consignée.
- **D20.13 — Aucune adresse demandée ne dépend d'un mot tapé ou touché** : seulement de la page lue, ou du fait qu'un geste a eu lieu. D16.53 tient à la lettre ; `privacy.chat.terms` reste vraie telle quelle.
- **D20.14 — Les cartes** : trois paliers (mot expliqué, carte courte, carte). Les nouvelles cartes ne citent aucune mesure en entier (zéro mot du livre de plus) ; `why` et l'objection deviennent facultatifs ; le nom d'une carte peut contenir un mot expliqué (la carte l'emporte). Elles entrent « accepted », sous ton nom, le jour où elles sont vérifiées : « accepted » veut dire publié sur ta parole, sans relecture (D16.79), et ta parole est ce mandat.
- **D20.15 — La porte d'ouverture, sous mandat** : la production ne prend qu'un fichier de mots **scellé** (passes de vérification datées sur son empreinte, `by: "session"`, jamais « editor ») et **ouvert** (`data/2026/words.json`), après le « oui » d'un relecteur indépendant sur l'aperçu, sans point bloquant ni sérieux — la porte du plan du chat.

## Où je m'écarte de ce que mes questions disaient

- **Pas de mot souligné dans une phrase.** Sept personas sur sept lisaient un pointillé comme un lien cassé (`13-tests-humains.md`, septembre). Les mots viennent en lignes à toucher, comme la feuille le fait déjà.
- **Sur une fiche, deux gestes** : ouvrir la ligne, puis le mot. Écrire les mots dans la page ferait bouger l'écran après son rendu, ou mettrait une étiquette d'IA dans du HTML indexé.
- **Ton mandat s'arrête quand même** dans sept cas, listés plus bas.

## L'expérience visée

**Un seul bloc, partout le même** — celui de la feuille, l'exemple en plus :

```
DES MOTS EXPLIQUÉS
Explications écrites et vérifiées par une IA
▸ T2A
▾ seuil de pauvreté
    Le seuil de pauvreté est le niveau de vie sous lequel une
    personne est comptée comme pauvre. […]
    Exemple — Si le niveau de vie médian est de 2 000 euros
    par mois, le seuil à 60 % est de 1 200 euros.
```

| Où | Ce que le lecteur voit |
|---|---|
| Feuille « Demander » | Sous les mesures : tous les mots des phrases affichées. En tête, « Les mots de ta question » : inchangé. |
| Fiche de section | Sous le lien officiel, une ligne repliée : « Des mots de cette section, expliqués » — ceux que le texte officiel de la section emploie. Et « Les idées de cette section » : des liens vers nos cartes. |
| Nos cartes, nos réponses | « Des mots de cette page, expliqués ». |
| Page « Mots du programme » (`/mot/`) | Les idées du programme (cartes), puis tous les mots de A à Z sous des lettres, avec un champ pour filtrer. |
| Recherche | Taper un mot expliqué, ou « c'est quoi… », ajoute une ligne qui mène à son explication. |
| Jeu | Sous la carte, après « Mot suivant », une ligne repliée. |

## Ce qui ne change pas

- La question tapée ne quitte jamais le téléphone ; aucune IA en direct ; l'étiquette « Explications écrites et vérifiées par une IA » ; `data-generated-by="ai"` sur tout texte d'IA.
- Une explication dit le sens d'un mot, jamais ce que prévoit le programme. Seules les cartes le disent, mesures épinglées.
- Le texte du livre n'entre pas dans le dépôt ; aucune citation nouvelle (`quotes.json` reste à 33 sur 40).
- Le premier écran, la carte du jeu dans son cadre, la tortue et sa planche, les dix-huit textes validés, le sceau des phrases du jeu, la base des phrases.
- Les Workers des phrases ne sont pas redéployés : ils embarquent nos cartes pour une variante fermée (D16.60) et ne s'en servent pas tant que `model` vaut `null` (`src/worker/index.ts:126`).
- Zéro euro, zéro tiers, zéro écriture sur le téléphone. Aucune chaîne ne dit qu'un mot est absent du programme.

## La chaîne des textes

**Ce que « aucun mot ne bloque » veut dire, en quatre propriétés vérifiables :**

1. chaque racine de l'index public est jugée (`plain`, `explain`, `watch`, `names`) — porte de CI ;
2. chaque occurrence d'une racine « à expliquer », dans ce que le site montre, est dans l'étendue d'une entrée ou d'une carte — porte de CI pour nos textes publics, **attestation locale** pour le livre entier et les 1 069 phrases ;
3. chaque entrée a un exemple, ou le code qui dit pourquoi non ;
4. aucune explication n'emploie un mot difficile sans entrée ; le graphe « A emploie B » est sans cycle, de profondeur deux au plus.

Ce que cela ne prouve pas (R67) : c'est le jugement d'une IA ; les lecteurs sont simulés ; aucune personne n'a lu.

**Inventaire — quatre filets.**
- *Racines* (public) : les 3 741 racines, en huit tranches, jugées par la session et, à part, par un lecteur d'un autre modèle lancé hors du dépôt sur la seule liste ; union des « à expliquer », arbitrage, taux d'accord au journal. `watch` = mot courant au sens technique possible (« prescription », « franchise », « tranche »).
- *Voisinages* (public) : paires de racines d'une même mesure dont l'une est rare (trois mesures au plus) — candidates d'expressions (« fonds vautours », « principe de faveur »).
- *Lecture* (privé, la session seule) : les 23 chapitres, l'introduction, la prose, puis les 1 069 phrases. Par motif, sans exception : sigles avec leur casse (ceux qui valent un mot-outil compris), lois et traités nommés, unités, locutions latines. Chaque occurrence `watch` non couverte est lue.
- *Lycée* : le panel ci-dessous — un outil de chasse, jamais une preuve.

**Tri à trois paliers.** A. Sens établi hors du programme → mot expliqué. B. Dispositif du programme qu'une mesure définit, et dont on rencontre le nom ailleurs → carte courte (D20.5). C. Doctrine qui traverse plusieurs sections → carte (`plain`, `why`). Jamais d'entrée : personnes vivantes, partis, surnoms politiques, insultes.

**Une entrée quand** : sigle (toujours) ; loi, traité, organisme, lieu, événement nommés ; notion de droit, de finances publiques, de protection sociale, de médecine, de technique ou de diplomatie que le collège n'enseigne pas ; mot courant au sens technique ; unité non scolaire, locution latine ; verbe à effet juridique précis (« abroger ») ; désaccord des deux juges.

**Les formes.** Le moteur n'ajoute qu'un pluriel : les formes verbales et dérivées que nos textes emploient entrent en `aliases` (« renationalisation » n'est pas trouvé aujourd'hui). Un composé que l'index coupe (« sous-traitance » → `traitance`) se juge sur sa forme entière. Un sigle à deux sens donne d'abord celui du livre.

**Un exemple quand** : B1 mécanisme à deux acteurs et un flux ; B2 calcul, taux, seuil, proportion ; B3 procédure à étapes ; B4 abstraction sans objet visible ; B5 contresens courant ; B6 l'explication seule a échoué au panel. **Sinon un code** (`noExample`) : `E` évident après l'explication (un organisme) ; `S` sensible ; `N` pas de cas neutre ; `D` deux sens.

**Charte de l'exemple — un cas de la chose définie, jamais une image d'elle.**
- Une à trois phrases, 240 caractères ; `plain` garde ses 200.
- Les règles du contrôle (`explanationRefusals`, `withoutText`) s'appliquent toutes, `contrast` compris ; seules `opener` et `negation` sont levées, et « on ». Donc : présent, impersonnel, pas de guillemets, pas de « bulletin de vote » (écrire « choisit une liste »).
- Portes nouvelles : pas d'analogie (« c'est comme », « un peu comme ») ; liste fermée de mots infantilisants (imagine, en gros, tout simplement, bonbons, gâteau, tirelire, maîtresse…) ; ni « ! », ni « ? », ni « … » ; euros dans l'exemple seulement, deux chiffres significatifs au plus ; aucune tournure de valeur légale (« est fixé à », « s'élève à », un montant à côté de SMIC, RSA, AAH, APL) ; aucun nombre de quatre chiffres ou plus qui soit une racine de l'index ; tout « % », année ou durée est déclaré `illustrative` ou `fact` avec sa source ; hors début de phrase, majuscules d'une liste fermée ; pas d'avant/après ni de gain causé par un changement.
- **Les quatre exemples que tu as choisis** (scrutin proportionnel, seuil de pauvreté, non-recours, retraite par répartition) entrent tels quels et passent ces portes : ils servent de référence.

**Neutralité.** Définir le mot, jamais l'usage qu'en fait le programme — la phrase tiendrait dans un manuel écrit par un adversaire. Mot de camp (« austérité ») : le noyau descriptif, puis qui l'emploie. Vocabulaire symétrique (charges / cotisations). Aucune cause, aucun jugement. Dans les 18 sections sensibles : on explique, sans exemple par défaut, deux lecteurs hostiles. Personne réelle : seulement l'éponyme du terme (taxe Zucman), sa fonction, rien d'autre ; une loi au nom d'une personne : sa date et son objet. Fait réel : daté, clos, institutionnel, sourcé.

**Par lot, toujours dans cet ordre** : écrire (la session) → portes → **contrôle d'écho** (la session, contre le livre : ni l'explication ni l'exemple ne redit une mesure, son argument, son nombre) → vérification des faits → reprises → seconde passe → lecture hostile → panel → journal chiffré → commit, push.

- *Vérification des faits* : un autre modèle que celui qui écrit, lancé hors du dépôt, qui ne reçoit que le lot et la charte. Sources primaires seulement (Légifrance, service-public, vie-publique, Conseil constitutionnel, INSEE, impots.gouv, ameli, EUR-Lex, ONU ; dictionnaire de l'Académie ou TLFi) ; jamais le site du programme ; le terme seul dans la requête, jamais le nom du projet. Verdicts : `ok`, `false`, `dated`, `imprecise`, `slanted`, `ambiguous`, `unverifiable`, `example`. **Seuil** : après reprises, zéro `false`, `dated`, `slanted`, `example` ; 5 % au plus d'`imprecise` ou `ambiguous` levés par écrit. Référence : 88 sur 257 le 15 novembre.
- *Panel* (R49 : `claude -p … --tools Read`, dossier vide au nom neutre, chemin exact) : cinq lecteurs par pièce — trois « plancher » (seconde générale, seconde professionnelle, terminale), deux « plafond » (adulte non politisé, lecteur hostile) —, modèles mêlés. Questions fixes : redis avec tes mots ; une question d'application écrite d'avance avec sa clé ; recopie chaque mot que tu ne saurais pas expliquer ; à qui ce texte s'adresse-t-il, te sens-tu pris de haut ; (hostile) prend-il parti ; as-tu reçu des informations sur un projet. **Bloqué** : deux planchers sur trois ratent l'application ou recopient le même mot. **Infantilisant** : deux sur cinq. **Orienté** : un plafond nomme un camp et cite les mots, confirmé par un lecteur neuf. Arrêt : un tour sans rien, ou trois tours.
- *Quand une porte ne passe pas* : deux réécritures, puis l'exemple tombe (code `N`) ; deux encore, puis l'entrée tombe et le bilan la nomme.

## Choix d'architecture

| Choix | Pourquoi | Ce qu'on paie |
|---|---|---|
| Quatre sortes de fichiers sous `/data/`, une empreinte : le repère (mots et autres écritures, ≈ 13 Ko à 900 entrées), les explications (≈ 47 Ko), les exemples (≈ 37 Ko), un fichier par page lue (médiane 1,6 Ko) | Trouver un mot ne demande que le repère ; une fiche ne paie que ses mots ; aucune adresse ne dépend d'un mot (D20.13) ; le premier usage reste à ≈ 122 Ko sous 130 Kio (MESURÉ en simulation, ± 15 %) | La première explication ouverte dans la feuille télécharge ≈ 84 Ko, une fois |
| Des tranches de textes par mot : **écarté** | Mesuré : une fiche en demanderait 55 à 77 Ko en dix requêtes, et dans la feuille l'adresse dépendrait du mot | — |
| Explications par script, étiquette dans le fichier | D19.6 ; aucun texte ne peut paraître sans son étiquette ; la porte « qui nomme une IA » tient | Sans script, pas d'explication (comme la recherche) |
| Une ligne repliée dans le HTML dès le premier rendu, remplie à l'ouverture | Rien ne bouge après le rendu ; zéro octet tant qu'on n'ouvre pas | Deux gestes sur une fiche |
| Deux modules différés : `words-view.ts` (rendu, chargement) et `words.ts` (recherche des mots) | Le script de la feuille redescend à ≈ 15,0 Ko (MESURÉ par découpe) ; une fiche n'embarque aucun motif | Deux fichiers de script de plus |
| Un interrupteur de données (`data/2026/words.json`) pour les surfaces neuves ; un sceau sur le fichier des mots | Les lots de code laissent `dist/` identique ; rien de non vérifié n'atteint la production | Une garde de plus dans `deployRefusal` ; une correction urgente pendant l'écriture part de l'étiquette `prod-avant-mots` |
| Le vocabulaire jugé en entier, sous une porte d'empreinte ; la preuve à l'occurrence | « Aucun mot ne bloque » devient une propriété qui casse quand le livre ou nos textes changent | ≈ 3 700 racines à juger deux fois |

## À regarder dans le code, pour apprendre

- `src/lib/terms.ts` : le préfiltre « aiguille » — tout motif contient un littéral ; un `includes` écarte 95 % des entrées avant de construire un seul `RegExp` (premier appel : 69 → 9,6 ms à 900 entrées, MESURÉ).
- `scripts/check-build.test.ts` : un budget dit **par geste** plutôt qu'en somme — ce qu'un test mesure doit être ce qu'un visiteur paie.
- `data/2026/vocabulary.json` et sa porte : un vocabulaire fini se lit en entier ; une liste de mots à attraper ne se ferme jamais (leçon de `sensitive.json`).
- `scripts/build-mode.ts` (`deployRefusal`) : une règle de déploiement en fonction pure, testée sans rien déployer.

## Lots

Chaque lot finit par ses portes (après `git add`), un commit conventionnel, un push sur `origin main`, puis la lecture de la CI. Node 24. Les lots 1 à 8 sont du code ; `dist-scrutin/` doit rester identique à l'octet de l'un à l'autre, et `dist/` ne change que là où c'est dit.

**Lot 0 — Consigner, épingler.**
- `docs/discovery/decisions.md` : D20.1 à D20.15 (tes réponses mot pour mot), note de mise à jour ; `docs/discovery/README.md`, `CLAUDE.md` : 352 décisions, l'état, le mandat et sa portée ; `docs/discovery/PLAN-MOTS.md`.
- `14-risques.md`, R63 à R71 : un exemple lu comme un fait ou comme l'effet d'une mesure ; un exemple jugé infantilisant ; trois fois plus de texte d'IA lu par personne ; des mots relevés dans le livre par qui écrit ensuite « de culture générale » ; « aucun mot » non prouvé ; le poids sur un téléphone ; l'étiquette d'IA plus visible ; les valeurs légales qui changent au 1er janvier ; des cartes qui disent ce que le programme prévoit.
- Étiquette locale `prod-avant-mots` sur le commit que sert la production (`data/launch.json`, `home.serving`), après avoir vérifié que sa build égale ce qui est en ligne ; fiche 14 du runbook (`09-architecture.md` §9).
- Empreintes de référence de `dist/` et `dist-scrutin/`, gardées en local. Mémoire : où est le plan, ce que couvre le mandat.

**Lot 1 — Les mots sortent du script de la feuille** (refactor pur).
- Nouveaux `src/scripts/words-view.ts` (son propre `el` — n'importe rien de `engine.ts` —, `written`, `wordItem`, `fillItem`) et `src/scripts/words.ts` (`sheetWords(entries)`, autour de `src/lib/terms.ts`).
- `src/scripts/chat.ts` : l'import de `terms.ts` (l.51) devient un import de type ; `import('./words.ts')` lancé à l'évaluation du script, attendu dans `ask()` (l.645) ; `words()` (l.240-259) et `explainedFor` (l.328-331) passent par le module.
- `scripts/check-build.test.ts` (:307-343 : 16 Kio inchangé pour `chat.*.js`, plafond et importeurs pour `words*.js` ; :257-275 : « off » ne porte ni `/_astro/words`, ni `/data/mots-`, ni `data-words`) ; `scripts/e2e.ts` (:575).
- Preuve : `scripts/e2e-sheet.ts` passe **sans être modifié**.

**Lot 2 — Le moteur** (`src/lib/terms.ts`).
- `TermWording` (`id`, `term`, `aliases?`, `anyCase?`) et signatures génériques ; `TermEntry` gagne `example?` et `noExample?` ; `parseTerms` les lit (il laisse tomber aujourd'hui tout champ inconnu).
- Préfiltre dans `readingOf` / `spansOf` ; `explainedFor` : `max` ne coupe que le bloc du haut ; `spansIn(text, entries)` exporté.
- `scripts/terms.test.ts` : oracle de force brute contre `termsIn` ; nouvelle attente en :198-221 ; nouveau `scripts/terms-fixtures.ts`, partagé avec `e2e-sheet`.

**Lot 3 — Les données par fichier, les textes à la demande** (rien de visible ne change).
- Nouveau `src/lib/words-data.ts` (`builtWords()`, `wordingsFingerprint()`, `termsFingerprint()` — par `canonicalHash` de `src/lib/fingerprint.ts` ; apostrophes par `prose` de `src/lib/editorial.ts` ; aucun commentaire n'y nomme le dossier privé : `check-repo.test.ts:222-230`). `src/lib/chat-data.ts` perd `terms` (l.28, l.63).
- `src/pages/data/[name].json.ts` : `mots-<fp>.json`, `mots-<fp>-sens.json`, `mots-<fp>-exemples.json` — traités avant le repli de la l.88, qui répond `meta()` à tout nom inconnu.
- `src/components/ChatSheet.astro` : les trois adresses et le libellé ; `words.ts` : repère attendu à la première question ; textes en vol unique au premier besoin (un mot ouvert, ou un bloc ouvert pour un mot que la question nomme) ; on remplit sur place, sans redessiner (un `<summary>` remplacé perd le focus).
- `design/strings.json` v0.15.0 : `words.example` (« Exemple »).
- `scripts/check-build.test.ts` (:221-231) redit par famille : {index, meta, jeu, clair, repère} ≤ 130 Kio ; `-sens` ≤ 52 Kio ; `-exemples` ≤ 44 Kio ; fichier de page ≤ 6 Kio ; tout fichier inconnu échoue. `design/perf-budget.md`.
- `scripts/e2e-sheet.ts` §7 (:382-386, :416-440, :428) : `clair` une fois, repère une fois ; première ouverture = exactement les deux fichiers constants ; la deuxième, rien. Nouveaux `scripts/words-data.test.ts`, `scripts/words-page.test.ts`.

**Lot 4 — Interrupteur, carte des lieux, lignes repliées.**
- `data/2026/words.json`, à la main, sur le modèle de `ask.json` : un état pour la production, un pour l'aperçu qui s'ouvre avant elle, par surface (`pages`, `search`, `game`), `decided_on`, `decided_by`, `reviewer_yes_on`. `src/lib/words-config.ts` (`wordsSite()` : éteint hors mode « chat », allumé dans les builds d'essai) ; `__CEL_WORDS_PAGES__`, `__CEL_WORDS_SEARCH__` (`astro.config.ts:78-84`, `src/globals.d.ts`).
- `scripts/lexicon-2026.ts` (`npm run lexicon` ; cœur pur `scripts/lexicon-core.ts`, test `scripts/lexicon.test.ts` sur un livre inventé) : `--places` écrit `data/2026/term-places.json` (`{ meta: { corpus_version, wordings_sha256, note_fr }, sections: { id: [identifiants triés] } }`), `--check` ; n'imprime que des identifiants et des nombres. **Première lecture de `private/` (D20.1)** : la carte des 259 mots actuels. `scripts/build.ts:64-71` : le fichier entre dans les entrées de l'édition.
- `src/components/Words.astro` (import conditionnel, précédent `ChatSheet`) : `<details class="words" id="mots" data-words="…">` avec son titre, **sans nom de mot ni identifiant** (l'identifiant `ia` suffirait à faire tomber la porte) ; `src/scripts/words-shell.ts` (≈ 0,3 Ko : un `toggle` importe `words-view.ts` ; ouvre la ligne sur `#mots`) ; `src/styles/words.css` ; `@media (scripting: none)` la cache.
- Fichiers par page : `mots-<fp>-s-<section>.json`, `-c-<carte>.json`, `-r-<slug>.json` = `{ written_by, read_by_a_person, labels: { badge, how, example }, terms: [[terme, explication, exemple?]] }`.
- Gabarits : `src/pages/s/[section].astro` (plus « Les idées de cette section », en HTML et derrière le même interrupteur : les cartes dont un appui est dans la section), `src/pages/mot/[slug].astro`, `src/pages/r/[slug].astro`.
- Nouveau `scripts/e2e-words.ts` (`npm run e2e:words`, sur `dist-gists/`, trois moteurs, avec `serve`, `until`, `lateLayoutShift` et `checker` de `scripts/e2e-kit.ts`) : ligne fermée et rien de demandé ; un seul fichier à l'ouverture ; étiquette et marques ; Trusted Types ; sans script ; axe à 390 et 320 px ; page immobile ; l'ensemble des adresses demandées. `package.json`, `.github/workflows/ci.yml`, `scripts/a11y.ts` (`/s/<id>/#mots`, bloc ouvert), `scripts/e2e.ts` (:197).
- `dist/` identique à celui du lot 3.

**Lot 5 — La page « Mots du programme ».** `src/components/WordsHub.astro`, `src/scripts/words-hub.ts` (filtre sur le DOM ; ouvre le mot de `#mot-<id>`), `src/pages/mot/index.astro` ; `scripts/check-no-ai-mention.test.ts` (:138-144 : `mot/index.html` rejoint la liste ; :350-355 : les builds d'essai forcent la surface, la page porte l'étiquette). Sans correspondance, le filtre ne dit jamais qu'un mot manque au programme (modèle : `concept.unknown.lead`).

**Lot 6 — La recherche.** `src/scripts/search.ts`, sous `if (__CEL_WORDS_SEARCH__)` : le repère demandé avec l'index, au premier signe de recherche — jamais d'après ce qui est tapé ; la ligne dessinée dans le même rendu que les résultats, vers `/mot/#mot-<id>` ou la carte ; `src/components/Search.astro`. Le script « off » reste identique à l'octet.

**Lot 7 — Les cartes.** `src/lib/editorial.ts:51-60` (`why?`, `objection?`), `src/pages/mot/[slug].astro:40-45`, `scripts/editorial.test.ts` (:52-74 ; :237-239 ne prend plus nos phrases par leur rang), `scripts/notions.test.ts:29` (`>= 5`), `scripts/terms.test.ts:303-319` et `words-data.ts` (la carte l'emporte sur son étendue). Nouveau test : une carte « accepted » après le 19 novembre 2026 trouve dans `decisions.md` une ligne de son jour qui porte le sceau de son lot et renvoie à D20.3. Aucun « pending » n'entre jamais dans le fichier : il bloquerait la production (`pendingReviews`).

**Lot 8 — Sceau, garde, portes.**
- `data/2026/terms.json` : `meta.charter`, `meta.sealed { sha256, on, by, passes }`. Le fichier d'aujourd'hui est scellé tel quel (charte 1, passes du 15 novembre) : `main` reste déployable jusqu'au premier mot changé.
- `scripts/launch.ts` : `wordsBlockers()` sur le modèle de `homeBlockers` — l'apex refuse un fichier dont l'empreinte n'est pas celle de son sceau, et un fichier de charte 2 que `words.json` n'ouvre pas ; `scripts/build-mode.ts` (`DeployContext`, `deployRefusal`), `scripts/deploy.ts` ; tests. Un sceau de charte 2 exige dans `decisions.md` une ligne de son jour qui porte ses douze premiers caractères.
- Portes de l'exemple dans `scripts/terms.test.ts` (dès qu'une entrée en porte un), deux défauts corrigés (l'interdit des euros laisse passer « 10 millions d'euros » ; la levée de « on » ne lit que le premier constat). Portes de complétude, pour un fichier de charte 2 seulement : exemple ou code partout ; fermeture ; graphe.
- `data/2026/vocabulary.json` et ses portes dans `scripts/lexicon.test.ts` : empreinte du vocabulaire (modèle : `chat-local.test.ts:1192-1201`), partition, fermeture par étendues (`spansIn`, jamais `sameWord`) sur explications, exemples, cartes, réponses, phrases du jeu et titres ; `design/strings.json` en rapport seulement.

**Lot 9 — Inventaire.** Les quatre filets. `npm run lexicon -- --stems | --pairs | --acronyms | --instruments | --units | --latin | --watch` : ce qui vient du livre s'écrit sous `private/lexicon/`, le terminal ne montre que des nombres. Notes de lecture par chapitre sous `private/lexicon/inventory/`. Sorties : `private/lexicon/candidates.jsonl` (formulation, sorte, sections, sens, palier) et `data/2026/vocabulary.json`.

**Lot 10 — Étalonnage.** Fiscalité et finances publiques : une soixantaine d'entrées (celles des 259 du domaine révisées), une quarantaine d'exemples, toute la chaîne. La charte et les portes se règlent ici ; le journal garde les taux. Dix entrées te sont montrées pour information, sans attendre de réponse. À partir de ce lot le sceau est rompu : la production est retenue.

**Lot 11 — Écriture, domaine par domaine** (50 à 70 entrées chacun) : travail et protection sociale ; santé ; écologie, énergie, agriculture, mer ; institutions ; économie et commerce ; école, recherche, culture, numérique ; Europe et international ; justice, police, libertés — en dernier. Les entrées « moratoire », « T2A » et « SMIC » restent : `e2e-sheet` les épingle. Après chaque lot : `npm run lexicon -- --places`.

**Lot 12 — Cartes courtes et cartes.** Brouillons sous `private/lexicon/cards/`. Une carte (une dizaine au plus) : notion propre au programme, dans un titre officiel ou trois sections au moins, deux appuis dont un la nomme, et un nom qui n'ouvre aucune carte à tort sur les 140 titres, les 15 objections et les questions de `eval/ask-2026.json`. Une carte courte : D20.5. Appuis `{id, sha256}` copiés du manifeste, jamais `quote: true`. Vérifications : contrôle des chiffres en local (`editorial.test.ts:226-255`), relecture de la session contre le livre, vérificateur d'un autre modèle contre la page officielle publique (D20.7 : sans en-tête qui nomme le projet, rien d'écrit dans le dépôt, des verdicts et jamais le texte). Puis entrée dans `glossary.json`.

**Lot 13 — Assemblage, attestation, sceau.** Fermeture sur tout le fichier ; `npm run lexicon -- --attest` (la même fermeture sur chaque unité du livre et chaque phrase ; écrit `meta.attested`) ; troisième vérificateur sur les entrées datées, les sensibles et 15 % au hasard ; poids mesuré ; `meta.note_fr` récrite (qui a relevé les mots et où ; exemples inventés ; ce qui n'est pas une personne — en gardant « connaissances générales » et « une IA », que `terms.test.ts` exige) ; `eval/terms-sources.json` et son rappel à 90 jours ; passage en charte 2, sceau, ligne de décision.

**Lot 14 — Le jeu** (D20.4). `src/lib/game-data.ts` (`buildGame`, par étalement conditionnel : les mots de chaque phrase et leurs explications, sans exemple) ; `src/scripts/game2.ts` : la ligne repliée sous la carte, hors de `.g-place`, construite par `el()` ; l'étiquette paraît avec les explications. `scripts/game-page.test.ts` (:525 : 12 → 14 Kio ; :447-485 : `terms.json` compte parmi les sources), `scripts/e2e-game.ts` (ordre de la carte et « une manche n'envoie rien » inchangés), `npm run sweep:game`, portes de la mascotte vertes sans rien réécrire. Lecture des personas et à l'aveugle (R62). Une porte ou cette lecture tombe : `git revert`, et le bilan le dit.

**Lot 15 — Pages de faits, dossier, relectures de l'ensemble.**
- Chaînes : `about.gists_terms` et `accuracy.review.terms` (en gardant les phrases que `check-strings.test.ts:497-524` épingle), `accuracy.unverified.07`, `concept.index_lead`, les titres des lignes, le filtre. `privacy.chat.terms` n'est pas touchée. Toutes dans `docs/discovery/TEXTES-MOTS.md`.
- `data/2026/NOTICE.md` (qui ne liste aujourd'hui ni `terms.json`, ni `ordinary.json`, ni `sensitive.json`), `README.md`, `11-conformite.md`, `18-dossier-chat.md`, `13-tests-humains.md` §10, nouveau `docs/discovery/19-mots-expliques.md` (grille, charte, protocoles, résultats, ce qui n'est pas vérifié).
- Relectures par des agents d'un autre modèle, sans `private/` : hostile (toutes les entrées sensibles, un échantillon tiré d'une graine prise au sceau, toutes les cartes) ; sécurité et vie privée (adresses demandées, Trusted Types, ce que l'hôte peut déduire) ; sept personas et lectures à l'aveugle. Un constat se vérifie dans le code avant d'être retenu. `personas_session_on` et `hostile_review_on` redatés dans `data/launch.json`.

**Lot 16 — Aperçu.** `words.json` : l'aperçu ouvert, `decided_by: "session"`, ligne de décision. `npm run build:preview && npm run deploy:preview -- --bench`. En ligne : fichiers identiques à la build, `e2e:words` et la sonde de la feuille dans trois moteurs. Puis les passes d'un relecteur indépendant, une après chaque lot de corrections, jusqu'à « oui, j'ouvrirais la production » (méthode : journal de `PLAN-CHAT.md`).

**Lot 17 — Production.** `words.json` : la production ouverte, `reviewer_yes_on` daté, ligne de décision. `npm run build && npm run deploy`. Vérification en ligne sur les deux hôtes. `home.serving`, journal, `CLAUDE.md`, mémoire : le mandat est consommé. **Le bilan t'est envoyé** : ce qui change pour un visiteur ; les comptes de l'inventaire et l'accord des juges ; la couverture avant et après ; les taux de vérification par lot ; les entrées sensibles, nommées ; le panel, marqué HYPOTHÈSE ; un échantillon et toutes les cartes ; ce qui n'est pas vérifié ; le sceau.

## Le mandat : ce qu'il couvre, où l'exécution s'arrête quand même

Il couvre, pour ce chantier seulement : lire `private/` (la session) ; écrire et publier explications, exemples, cartes et textes d'interface ; pousser, fichiers dérivés du livre compris ; déployer l'aperçu puis la production une fois D20.15 tenue ; redater « par la session » ce que ces changements font tomber ; trancher selon la recommandation de la session et consigner (« DÉCISION (session, sur le mandat D20.3) »).

L'exécution s'arrête et te demande quand :

1. une contrainte non négociable devrait plier ;
2. une porte ne passerait qu'abaissée — hors de celles que ce plan redit (D20.4, D20.10 c, D20.12) ;
3. il faudrait toucher la base des phrases ou un dépôt de phrases (dont « wagon »), un Worker des phrases, la zone, l'historique git, ou lancer un crawl de la source au-delà de D20.7 ;
4. il faudrait toucher le premier écran, la carte du jeu dans son cadre, la planche, les dix-huit textes validés, la liste des mots du jeu ou le fichier scellé de ses phrases ;
5. une phrase de la page Confidentialité devrait changer hors de sa section « Quand tu demandes » (`privacy_page` est datée par toi) ;
6. la relecture de sécurité exige de télécharger les textes en fond dès la première réponse (le premier usage passerait à ≈ 176 Kio) ;
7. une relecture conteste ce plan lui-même, et non son exécution.

Jamais, sous ce mandat : écrire « editor », « reviewed » ou « relu par » où que ce soit ; ouvrir `private/` depuis un sous-agent ; imprimer du texte du livre dans une sortie d'outil.

## Hors de ce plan

- La phrase de « wagon » et son redépôt : toujours à te proposer à part.
- Des explications dans le HTML, ou sans script ; des mots soulignés dans les phrases.
- Une IA qui explique en direct (D16.60 tient).
- La lecture des textes par une personne : le bureau de lecture reste à toi.
- Ce que le site officiel montre hors du livre.

## Vérification

```
# base, après git add
npx tsc --noEmit && npx tsx --test scripts/*.test.ts && npx tsx scripts/contrast.ts
# app
npm run build && npm run typecheck && npm run lint && npm run a11y && npm run e2e
# feuille, jeu, mots
npm run build:ask && npm run e2e:ask && npm run e2e:game
npm run build:gists && npm run e2e:sheet && npm run e2e:words
npm run build:scrutin:test
npx tsx --test scripts/check-no-ai-mention.test.ts scripts/check-build.test.ts scripts/game-page.test.ts
# lot 14 seulement
npm run sweep:game && npm run e2e:mascot2 && npm run e2e:mascot2:motion
# local, où private/ existe ; avant tout push
npm run lexicon -- --check && npx tsx --test scripts/leak.test.ts
```

À constater en plus :

- `dist-scrutin/` identique à l'octet après chacun des lots 1 à 8, et `dist/` du lot 3 au lot 9 ; une build « off » ne porte ni fichier `mots-`, ni ligne repliée, ni module des mots.
- Dans trois moteurs : chercher n'envoie rien ; « Demander » demande le repère une fois ; la première explication ouverte demande exactement deux fichiers constants ; une fiche ne demande rien avant l'ouverture de sa ligne, puis un seul fichier ; aucune adresse ne porte un mot.
- Les quatre propriétés de « aucun mot ne bloque » : vertes en CI, attestées en local.
- Poids mesurés, écrits dans `design/perf-budget.md` : premier usage sous 130 Kio ; script de la feuille sous 16 Kio.
- En ligne, après l'aperçu puis la production : fichiers identiques à la build ; les mêmes parcours dans trois moteurs.

## Fichiers critiques

- Existants : `src/lib/terms.ts`, `src/scripts/chat.ts`, `src/lib/chat-data.ts`, `src/pages/data/[name].json.ts`, `src/lib/editorial.ts`, `src/lib/ask-validate.ts`, `data/2026/terms.json`, `data/2026/glossary.json`, `scripts/terms.test.ts`, `scripts/check-build.test.ts`, `scripts/check-no-ai-mention.test.ts`, `scripts/e2e-sheet.ts`, `scripts/editorial.test.ts`, `scripts/launch.ts`, `scripts/build-mode.ts`.
- Nouveaux : `src/lib/words-data.ts`, `src/lib/words-config.ts`, `src/scripts/words.ts`, `src/scripts/words-view.ts`, `src/scripts/words-shell.ts`, `src/scripts/words-hub.ts`, `src/components/Words.astro`, `src/components/WordsHub.astro`, `src/styles/words.css`, `scripts/lexicon-2026.ts`, `scripts/lexicon-core.ts`, `scripts/e2e-words.ts`, `data/2026/words.json`, `data/2026/term-places.json`, `data/2026/vocabulary.json`, `eval/terms-sources.json`, `docs/discovery/PLAN-MOTS.md`, `docs/discovery/TEXTES-MOTS.md`, `docs/discovery/19-mots-expliques.md`.

## Journal d'exécution

### Avant le lot 0, le 19 novembre 2026 (13 h 09, 12 h 09 UTC) — le plan est approuvé, rien n'est commencé

- **Ce fichier est la copie du plan approuvé**, posée dans le dépôt par la session de planification, **non suivie par git** : le lot 0 la commite avec les décisions.
- **Rien d'autre n'est fait** : ni `decisions.md` (D20.1 à D20.15 restent à consigner, les réponses de l'éditeur mot pour mot — elles sont dans le tableau « Ce que tu as tranché »), ni `14-risques.md`, ni `CLAUDE.md`, ni l'étiquette `prod-avant-mots`, ni aucune ligne de code. `private/` n'a pas été ouvert.
- **L'éditeur a demandé que l'implémentation soit menée par une autre session** (un autre modèle, en mode auto) : elle reprend au lot 0.
- **Mesures prises pendant la planification, à refaire avant de s'y fier** (PROBABLE : faites en mémoire, sur le `dist/` du 19 novembre, 10 h 12) : données servies 124 530 octets gzip ; script de la feuille 16 171 ; 15 des 43 phrases du jeu et 8 des 140 titres officiels emploient un mot déjà expliqué (`termsIn`) ; chercher les mots dans trois phrases à 900 entrées : 52 à 69 ms au premier appel, 3 ms ensuite, sur cette machine.

Rien de servi n'a changé.

### Lot 0, au 19 novembre 2026 (après-midi) — consigner, épingler

- **L'exécution est menée par une autre session** que celle qui a planifié — un autre modèle, Opus 5.5, en mode auto, sur la demande de l'éditeur : « exécute docs/discovery/PLAN-MOTS.md à partir du lot 0 ». Le rédacteur des textes de ce chantier est donc ce modèle-là ; « un autre modèle que celui qui écrit », pour les vérifications, veut dire un autre qu'Opus 5.5.
- **Les quinze décisions sont au journal** : D20.1 à D20.15 dans `decisions.md` (**352 décisions, D0-D20**) — sept de la main de l'éditeur, avec ses réponses mot pour mot et les choix qu'il a écartés (D20.4 réunit ses deux réponses sur le jeu) ; huit amendements annoncés par le plan qu'il a approuvé. Une note de mise à jour en tête du fichier. `14-risques.md` : **R63 à R71**, et une note de tête. `CLAUDE.md` : le chantier en tête de l'état du projet, le mandat et ses sept cas d'arrêt, le point d'entrée, le compte. `docs/discovery/README.md` : l'état, le plan en cours, le compte.
- **La production est épinglée.** La build de `main` (`3ee0545`) est ce que servent `cestecritla.fr` et `www` : **1 153 fichiers sur 1 156 identiques sur chaque hôte**, les trois écarts connus (`404.html` redirigé, `_headers` et `_redirects` non servis comme fichiers) — VÉRIFIÉ en ligne le 19 novembre, 12 h 26 UTC. La build du commit que nomme `home.serving`, `d7e9814`, faite dans une copie de travail hors du dépôt, est identique fichier par fichier à celle de `main` (entre les deux : de la documentation, le `$meta` du kit, `home.serving`). **Étiquette locale `prod-avant-mots` sur `d7e9814`**, non poussée. Fiche 15 du runbook (`09-architecture.md` §9) : corriger la production pendant l'écriture, par les étapes de la fiche 14 à cette étiquette.
- **Empreintes de référence gardées en local** (`private/tmp/mots/baseline-*.txt`, une ligne par fichier : empreinte et chemin) : `dist/` (1 156 fichiers), `dist-scrutin/` (1 150), `dist-ask/` (1 156), `dist-gists/` (1 156). Une build prend 4 secondes.
- **Ce que l'exécution a établi, et qui n'était écrit nulle part** : le `$meta` de `design/strings.json` change sans changer un seul fichier servi — la build ne publie que les chaînes.

Rien de servi n'a changé.

### Lot 1, au 19 novembre 2026 (après-midi) — les mots sortent du script de la feuille

- **Deux modules neufs** : `src/scripts/words-view.ts` dessine un mot (son propre `el`, `written`, `wordItem` ; il n'importe rien de `engine.ts`, pour qu'une page qui n'explique que des mots n'emporte jamais le moteur de recherche) ; `src/scripts/words.ts` lit les mots d'un tour (`explain`, autour de `explainedFor`) et redonne `wordItem`. `src/scripts/chat.ts` n'importe plus `terms.ts` que pour un type : il demande `./words.ts` dès qu'il s'exécute, et l'attend dans `ask()` avec le moteur et les textes de la feuille. Sans ce module, aucun mot n'est expliqué, et rien ne le dit.
- **MESURÉ** (`dist-ask/`, gzip niveau 9) : le script de la feuille passe de 16 171 à **15 211 octets** (sous 16 384) ; le module des mots pèse **1 536 octets**, sous un plafond provisoire de 2 Kio que le lot 3 remplacera (D20.12 : sa mesure plus un cinquième).
- **Portes** : `scripts/check-build.test.ts` — un test neuf (le module des mots est un fichier à lui, que seul le script de la feuille nomme, et aucune page) ; en mode « off », ni `/_astro/words`, ni `/data/mots-`, ni `data-words` ; `scripts/e2e.ts` : en mode « off », le module des mots n'est jamais demandé. **`scripts/e2e-sheet.ts` passe sans avoir été touché** (102, 96 et 96 contrôles) : c'est la preuve que le découpage ne change rien à ce que la feuille montre. Toute la batterie : 656 tests (655 bons, un sauté), a11y, e2e, feuille, jeu (319, 283, 283) — aucun échec.
- **Ce qui a changé dans les builds** : `dist-scrutin/` est identique à l'octet ; `dist/`, `dist-ask/` et `dist-gists/` diffèrent de neuf lignes chacun, toutes attendues — le script de la feuille et celui de la recherche changent de nom (le second nomme le premier), le module des mots s'ajoute, et les deux pages qui nomment le script de la recherche (l'accueil, le sommaire) changent avec lui.

Rien de servi n'a changé : `main` n'est pas déployé.

### Lot 2, au 19 novembre 2026 (après-midi) — le moteur

- **`src/lib/terms.ts`** : `TermWording` (ce qui trouve un mot, rien de ce qu'il dit) et des signatures génériques, pour que le moteur lise un jour le seul fichier des formulations (lot 3) ; `TermEntry` gagne `example` et `noExample` (E, S, N, D), que `parseTerms` lit — il les laissait tomber — et refuse ensemble ; **le préfiltre « aiguille »** : chaque formulation porte un littéral que tout texte qu'elle trouve contient (le sigle, ou le plus long mot d'une expression), cherché par `includes` avant tout motif, et le motif n'est construit que la première fois que l'aiguille est là ; **`explainedFor` ne plafonne plus que les mots de la question** (quatre au plus) : sous les mesures, tous les mots des phrases (D20.10 c) ; `spansIn` dit chaque place où une entrée est écrite — la porte de fermeture du lot 8 en a besoin ; `folded` et `readingOf` sont exportés pour la preuve ci-dessous.
- **MESURÉ** (cette machine, Node 24, trois phrases et une question) : à 259 entrées, le premier calcul passe de 22 à 5-6 ms et chaque dessin de 0,9 à 0,3 ms ; à 900 entrées simulées, de 52 à 6 ms et de 3,2 à 1,1 ms. Le module des mots pèse 1 634 octets gzip (plafond provisoire 2 Kio) ; le script de la feuille, 15 213.
- **Portes** (`scripts/terms.test.ts`, 20 tests) : **l'aiguille ne cache jamais une correspondance** — partout où le motif d'une formulation trouve un texte, son aiguille y est, sur chaque formulation en quatre écritures et sur tous nos textes publics (plus de mille correspondances lues) ; `spansIn` ; `example` et `noExample` ; l'attente de « quatre au plus » devient « tous sous les mesures, quatre au plus en tête ». **`scripts/terms-fixtures.ts`** : les phrases simulées de `e2e-sheet.ts` §7 et les mots qu'il attend, partagés — `terms.test.ts` les lit contre le fichier tel qu'il est : une entrée qui changerait ces listes échoue en une seconde, avant tout navigateur. `e2e-sheet.ts` lit ses phrases et ses listes dans ce fichier.
- Toute la batterie : 660 tests (659 bons, un sauté), a11y, e2e, feuille (102, 96, 96), jeu (319, 283, 283) — aucun échec. `dist-scrutin/` identique à l'octet ; dans les trois autres builds, seuls changent le module des mots et ceux qui le nomment.
- **Écart au déroulé, sans effet** : le script de portes a été modifié pendant qu'il tournait ; bash relit un script par position et a buté sur une erreur de syntaxe après la dernière étape. Toutes les portes avaient tourné ; les comparaisons de builds ont été refaites à la main. Ne pas retoucher un script en cours.

Rien de servi n'a changé.

### Lot 3, au 19 novembre 2026 (après-midi) — les données par fichier, les textes à la demande

- **Trois fichiers, une empreinte** (`src/lib/words-data.ts`, servis par `src/pages/data/[name].json.ts`, seulement là où le champ demande) : `/data/mots-<fp>.json`, comment on trouve les mots (identifiants et formulations, rien de ce qu'ils disent) ; `/data/mots-<fp>-sens.json` et `-exemples.json`, ce qu'ils veulent dire et leurs exemples, par identifiant, chaque fichier disant qui les a écrits (`written_by: "ai"`, `read_by_a_person: false`, lu dans `terms.json`). **Le fichier de « En clair » ne porte plus les explications.** `explainedTerms` passe de `chat-data.ts` à `words-data.ts`, qui lit nos cartes sans passer par `editorial.ts` : les portes l'importent hors de la build.
- **La feuille** (`src/scripts/chat.ts`, `src/scripts/words.ts`, `words-view.ts`) : le repère est attendu à la première question, avec « En clair » ; **les textes ne viennent qu'à la première explication ouverte — les deux fichiers, les mêmes quel que soit le mot (D20.13)** — puis vont sous chaque ligne déjà dessinée, sur place, sans rien redessiner. Une question qui demande ce qu'un mot veut dire attend ses textes avant de montrer ce mot ouvert : une ligne ouverte qui attendrait son texte grandirait sous son lecteur. Le mot « Exemple » (`words.example`, kit v0.15.0) précède l'exemple ; l'exemple porte la marque `data-generated-by`.
- **Trouvé, et corrigé dans le produit** : un mot refermé par son lecteur revenait ouvert quand une question partait dans le même instant. L'événement `toggle` arrive en tâche différée, et Chromium traite les entrées clavier d'abord. La feuille relit désormais sur la page l'état de chaque mot avant de redessiner un tour (`remember`). Le défaut existait avant ce chantier ; le nouveau parcours de `e2e-sheet.ts` l'a montré.
- **MESURÉ** (gzip niveau 9) : avant toute explication, une visite télécharge **112 966 octets** (124 530 au lot 0 : 11,6 Ko de moins) ; ce que les mots veulent dire, 13 747 octets à 259 mots ; leurs exemples, 75 (aucun encore) ; le script de la feuille, 15 381 ; **le module des mots, 2 234 octets — son plafond définitif, 2 681 (sa mesure plus un cinquième, D20.12)**.
- **Portes** : le budget des données est redit par geste (`scripts/check-build.test.ts` : 130 Kio avant toute explication, 52 et 44 Kio pour les deux fichiers de textes, 6 Kio par page, et un fichier qu'aucun budget ne connaît échoue) ; `scripts/words-data.test.ts` (ce que tient chaque fichier, et ce qu'il ne tient pas) ; `scripts/words-page.test.ts` (les trois fichiers exactement là où le champ demande, aux adresses que la feuille reçoit, et nulle part ailleurs) ; `scripts/e2e-sheet.ts` §7 : le repère une fois ; la première explication ouverte demande exactement les deux fichiers de textes ; la deuxième, rien ; le texte affiché est celui du fichier. Batterie : 669 tests, a11y, e2e, feuille (103, 97, 97), jeu sans ses mesures de laboratoire (299, 283, 283) — aucun échec.
- **Ce qui a changé dans les builds (lot 3)** : `dist-scrutin/` identique à l'octet. `dist/` diffère sur 1 139 fichiers. **Presque tous ne diffèrent que par une empreinte** dans la règle de sécurité de chaque page (`style-src`) : Astro y inscrit les empreintes de tous les styles du site, et la feuille de style de « Demander » a gagné une règle (VÉRIFIÉ sur une page de pont, reconstruite à l'état du lot 2 : le reste est identique à l'octet). S'y ajoutent les fichiers de données et les scripts renommés. **À savoir pour la suite : toute retouche d'une feuille de style servie change le HTML de toutes les pages.**

Rien de servi n'a changé.

### Lot 4, au 19 novembre 2026 (après-midi) — l'interrupteur, la carte du livre, les lignes repliées

- **L'interrupteur** : `data/2026/words.json` (une ligne pour la production, une pour l'aperçu, par surface — `pages`, `search`, `game` —, `decided_on`, `decided_by`, `reviewer_yes_on`), tout à « off ». La règle est pure (`src/lib/words-switch.ts`, `wordsFor` : l'aperçu peut ouvrir avant la production, jamais l'inverse ; ce qui ne se lit pas est éteint) ; la build la lit (`src/lib/words-config.ts`, `wordsSite` : rien hors du mode « chat » ni dans la build « scrutin » ; tout dans les builds d'essai). Deux constantes que le bundler replie, `__CEL_WORDS_PAGES__` et `__CEL_WORDS_SEARCH__` (`astro.config.ts`) : là où elles sont fausses, une page n'importe même pas la ligne repliée — ni son script, ni sa feuille de style.
- **Première lecture de `private/` (D20.1)** : `scripts/lexicon-2026.ts` (`npm run lexicon -- --places | --check`, cœur pur dans `scripts/lexicon-core.ts`) lit le livre et écrit **`data/2026/term-places.json`** : pour chaque section, les identifiants des mots expliqués que son texte emploie (titre, mesures, points, paragraphes). **101 sections sur 111 en emploient au moins un ; 257 des 259 mots sont écrits dans une section ; 13 au plus dans une même section, 3 en médiane.** Aucun mot du livre : des identifiants de sections et de mots. Le fichier dit sur quelles formulations il a été calculé (`wordings_sha256`), et `scripts/lexicon.test.ts` refuse une carte calculée avant qu'une formulation change. La build le lit comme une entrée de l'édition (`scripts/build.ts`, même version du corpus que le manifeste).
- **Les lignes repliées** : `src/components/Words.astro` sur les fiches de section (sous le lien officiel, suivie, en HTML, de « Les idées de cette section » — nos cartes dont une mesure est dans la section), sur nos cartes et sur nos réponses. Dans le HTML : la ligne, son titre (« Des mots de cette section, expliqués », « Des mots de cette page, expliqués » — kit v0.15.0) et l'adresse d'un fichier ; **aucun mot, aucune étiquette d'IA**. `src/scripts/words-shell.ts` (quelques centaines d'octets) n'importe `words-view.ts` qu'à la première ouverture, qui demande **un** fichier, `mots-<fp>-<s|c|r>-<page>.json` : l'étiquette, le lien « Comment c'est fabriqué », puis les mots dans l'ordre du dictionnaire, chacun avec ce qu'il veut dire et son exemple. Sans script la ligne n'est pas montrée. Un lien vers `#mots` l'ouvre. 115 fichiers de pages dans les builds d’essai : 101 sections, 13 de nos 15 réponses, 1 de nos 5 cartes (les autres n’emploient aucun mot expliqué).
- **Portes** : `scripts/words-page.test.ts` (chaque fichier de page exactement là où la build montre les pages, son contenu, sa ligne dans le HTML, et aucune explication ni étiquette dans ce HTML) ; `scripts/lexicon.test.ts` ; **`scripts/e2e-words.ts`** (`npm run e2e:words`, et une étape de la CI) : ligne fermée et rien de demandé ; un seul fichier à l'ouverture ; l'étiquette, les mots fermés, la marque `data-generated-by` sur chaque texte ; un mot s'ouvre sur son explication ; `#mots` ; sans script, rien ; sous Chromium, la page immobile, l'audit d'accessibilité à 390 et 320 px avec la ligne et un mot ouverts, rien qui déborde, des lignes de 44 px — **28, 21 et 21 contrôles, aucun échec**. Batterie : 676 tests, a11y, e2e, feuille, jeu sans ses mesures de laboratoire — aucun échec (une erreur de lint dans `e2e-words.ts`, corrigée et rejouée).
- **MESURÉ** : `dist/` et `dist-scrutin/` **identiques à l'octet à ceux du lot 3** — l'interrupteur est éteint, rien de servi ne bouge. Une capture d'une fiche, ligne et mot ouverts, a été regardée avant la batterie (`private/tmp/mots/shots/`).
- **Écart au plan** : `scripts/a11y.ts` ne juge les pages ouvertes qu'à partir du lot 5 (deux chemins qui ouvrent la ligne et un mot dès que la build les montre) ; d'ici là l'audit de ces surfaces est celui de `e2e-words.ts`.

Rien de servi n'a changé.

### Lot 5, au 19 novembre 2026 (après-midi) — la page « Mots du programme »

- **`src/components/WordsHub.astro`**, sous nos cartes (« Les idées du programme ») sur `/mot/`, là où la build montre les pages : « Les mots, de A à Z » — l'étiquette d'IA et le lien « Comment c'est fabriqué » dans le HTML, un champ qui filtre (sans nom, sans correcteur), les mots sous leurs lettres, chacun une ligne qui s'ouvre. **Aucune explication dans le HTML** : `src/scripts/words-hub.ts` demande les deux fichiers de textes — ceux de la feuille, quel que soit le mot — à la première ouverture, et remplit sur place. Sans correspondance, une ligne dit qu'aucun mot expliqué ne correspond, jamais qu'un mot manque au programme, avec le lien de la recherche. `#mot-<id>` ouvre un mot et le met au centre de l'écran. Kit v0.15.0 : cinq chaînes (`words.hub.*`). La page rejoint celles qui nomment une IA (`scripts/check-no-ai-mention.test.ts`).
- **Trouvé en regardant** : une ancre changée sur la page déjà ouverte (`/mot/` puis `#mot-…`) ne relançait pas le script, et le mot ne s'ouvrait pas ; la page des mots et la ligne repliée écoutent désormais `hashchange`.
- **`scripts/a11y.ts`** juge deux chemins de plus, `/mot/#mot-smic` et `/s/p2c2-s01/#mots` : les pages simples tant que l'interrupteur est éteint, la ligne et le mot ouverts dès qu'une build les montre — dans les neuf conditions. **243 contrôles, aucun échec.**
- **Portes** (mode « app » : un changement de l'app qui ne touche ni « Demander » ni le jeu, `CLAUDE.md`) : 676 tests, types, lint, a11y, e2e, **e2e des mots : 34, 27 et 27 contrôles** (la page entière : toutes les entrées, l'étiquette, aucune explication avant l'ouverture, deux fichiers à la première, rien à la deuxième, le filtre, la ligne sans correspondance, l'arrivée par `#mot-…`). MESURÉ : la page pèse 11,6 Ko gzip à 259 mots. `dist/` et `dist-scrutin/` identiques au lot 4.

Rien de servi n'a changé.

### Lot 6, au 19 novembre 2026 (après-midi) — la recherche

- **`src/scripts/words-search.ts`** : quand ce qui est tapé est un mot expliqué — ou demande ce qu'il veut dire —, une ligne au-dessus des résultats, « Ce que veut dire « SMIC » » (`words.search.row`, kit v0.15.0), mène à son explication sur la page « Mots du programme » ; le terme d'une de nos cartes mène à la carte. Le repère des mots est demandé au premier signe de recherche, comme l'index : une adresse, la même pour tous (D20.13). La ligne est dessinée dans la même image que les résultats : un `MutationObserver` sur les résultats est appelé une fois que la recherche les a changés, avant que la page soit peinte.
- **Écart au plan, et pourquoi** : le plan mettait ce code dans `src/scripts/search.ts`, sous la constante `__CEL_WORDS_SEARCH__`. Mesuré : le code laissé hors des blocs repliés changeait le script de la recherche — et donc l'accueil et le sommaire — dans la build de production, où la ligne est éteinte. **Un module à part, importé par le script de la recherche dans un bloc que la constante replie**, laisse ce script identique à l'octet. Même raison pour deux détails : la règle de style de la ligne, prévue dans `base.css`, est retirée (elle changeait toutes les pages servies, par l'empreinte de style de leur règle de sécurité) ; l'élément de la ligne est écrit sur la ligne du statut de la recherche (sur une ligne à lui, il laissait une espace de plus dans le HTML compressé).
- **Portes** (mode « app ») : 676 tests, types, lint, a11y (243 contrôles), e2e, **e2e des mots : 39, 32 et 32 contrôles** — un mot tapé seul, « c'est quoi… », le terme d'une carte, un sujet sans ligne ; le repère demandé une fois, aucun mot tapé dans une adresse. `dist/` et `dist-scrutin/` identiques au lot 5 ; dans les builds d'essai, sept lignes d'écart (le module neuf et ce qui le nomme).

Rien de servi n'a changé.

### Lot 7, au 19 novembre 2026 (après-midi) — les cartes

- **Ce qu'une carte peut ne pas avoir (D20.14)** : `why` et l'objection deviennent facultatifs (`src/lib/editorial.ts`) ; une carte courte (`short: true`, D20.5) n'a ni l'un ni l'autre, et `src/pages/mot/[slug].astro` ne les écrit que s'ils sont là. `scripts/editorial.test.ts` : une carte courte s'appuie sur une mesure au moins, une carte sur deux ; le contrôle des chiffres lit nos propres phrases par leur nom, plus par leur rang. `scripts/notions.test.ts` : cinq cartes au moins.
- **La carte l'emporte sur son étendue (D20.14)** : nos cartes sont lues comme des mots (`cardWordings`, `CARD_PREFIX`, `src/lib/terms.ts`), pour que l'étendue la plus longue prenne la plus courte (`spansIn`), et ne sont jamais rendues comme un mot expliqué (`withoutCards`). Partout où l'on cherche des mots : la feuille (`explain`), la recherche (`named` : là, la carte est ce qu'on montre), les fichiers des pages (`wordsPages`), la carte du livre (`npm run lexicon` ; l'empreinte des formulations compte désormais nos cartes — `term-places.json` recalculé : mêmes sections, mêmes mots). Tests : le nom de chacune de nos cartes ne donne que la carte ; une carte inventée, « moratoire écologique », prend le mot qu'elle contient.
- **Une carte acceptée sous le mandat se dit** : à partir du 19 novembre 2026, une carte « accepted » trouve dans `decisions.md` une ligne de son jour qui la nomme et renvoie à D20.3. **Écart au plan** : la ligne nomme la carte plutôt que « le sceau de son lot » — une carte n'a pas de sceau, son nom se retrouve.
- **Trouvé par la batterie, corrigé — trois défauts** :
  1. **les cinq cartes servies changeaient d'une espace**, dans `dist/` comme dans `dist-scrutin/` : Astro garde l'espace qui précède une expression et retire celle qui la suit, et un bloc conditionnel en ajoutait une. Chaque bloc tient désormais sur une ligne qui finit par une espace ; l'ancien gabarit, reconstruit, redonne l'empreinte de référence, et les cinq pages sont de nouveau identiques à l'octet ;
  2. **la ligne de la recherche ne montrait plus une carte** (e2e des mots, trois moteurs) : `explain` retire désormais les cartes qu'il lit ; la recherche a sa fonction, `named` ;
  3. **sous Firefox, une page quittée pendant le chargement du module de la ligne laissait une promesse rejetée**, qu'e2e-ask a prise pour une erreur de la page : l'import est rattrapé — la ligne est un plus, son échec n'est l'erreur de personne. Dans `dist/`, la constante replie ce bloc.
- **MESURÉ** : `dist-scrutin/` identique au lot 6. `dist/` : cinq fichiers changent — les morceaux de script de la feuille (`chat`, `words`), celui de la recherche qui nomme la feuille, et les deux pages qui le chargent (accueil, sommaire) : le code de la règle, rien d'autre. **Sur 1 380 textes réels** (les 1 069 phrases, nos réponses, les 170 questions du jeu d'essai, les titres de section), **47 nomment une carte et aucun n'est expliqué autrement** : la feuille servie se comporte comme avant.
- **Portes** (mode « feuille », sans les mesures de laboratoire) : 676 tests, types, lint, a11y, e2e, **e2e-ask 109 / 102 / 102, feuille 103 / 97 / 97, jeu 299 / 283 / 283, mots 39 / 32 / 32** — aucun échec.

Rien de servi n'a changé.
