# 17 — Dry run de `prompt-final.md`

> **Ce que c'est.** Une session Claude Code neuve, en plan mode, ouverte à la racine du dépôt, à qui on a donné `docs/discovery/prompt-final.md` et rien d'autre. Elle suit le prompt à la lettre : elle lit ce qu'il dit de lire, vérifie que chaque pointeur et chaque ancre résolvent, puis pousse le squelette du plan d'implémentation assez loin pour découvrir ce qui manque.
>
> **Rejeu n° 2** : 10 septembre 2026, après les arbitrages de l'utilisateur (D13.1 à D13.8). **Périmètre** : `prompt-final.md` dans son état du jour, **601 lignes, 19 sections**. Ce fichier **remplace** le rapport du premier rejeu, dont le résumé est conservé au §9.
>
> **Statuts** : VÉRIFIÉ = mesuré ou lu à la source, commande citée · PROBABLE = déduit ou mesuré une seule fois · HYPOTHÈSE = non prouvé.

---

## 0. Disposition — **tout est corrigé le 10 septembre 2026, en fin de journée**

> **Lis d'abord ceci.** Ce rapport décrit le dépôt **tel qu'il était au moment du rejeu**. Les trois pointeurs cassés et les treize contradictions qu'il liste **ont tous été traités depuis, dans les fichiers eux-mêmes**. Ce qui suit n'est plus un registre de défauts : c'est la trace de ce qui a été réparé et de la façon de le re-mesurer. **Ne replanifie aucune de ces corrections.**

**Les trois pointeurs, corrigés :**

| Pointeur | Correction |
|---|---|
| `prompt-final.md` §10 pt 9 → `07-mecaniques.md` l. 215 | Renvoie désormais à **§7.11 point 11 (l. 312)**, la règle canonique de build, avec les **14 sections écrites en clair** (l'abréviation `c17-*` est remplacée par `c17-s01`, `c17-s02`) |
| `13-tests-humains.md` **§T12** (prompt §1 et §7, `decisions.md` l. 5) | Remplacé par **§5 « Panel rouge (T12) »** dans `prompt-final.md`, `decisions.md`, `07-mecaniques.md`, `09-architecture.md`, `10-riposte.md` et `testeurs.md`. Le §5 de `13-tests-humains.md` explique désormais l'alias et dit pourquoi les journaux de version horodatés (`data/faq.json`, `data/riposte.json`, `design/strings.json`, les quatre fichiers de test) **ne sont pas réécrits** |
| `check-strings.ts` listé parmi les outils de `scripts/` | Retiré de la liste des outils du §4, avec la mention explicite « **n'est plus un outil : renommé en test, ne le cherche pas** » |
| `scripts/watch-aec2027.ts` cité au présent par `14-risques.md` §4 fiche 10 | Marqué **« script inexistant, à produire »** dans la fiche, et **annoncé comme livrable** dans le nouveau tableau du §16 du prompt (« les quinze fichiers annoncés par le dossier et qui n'existent pas encore », liste close) |

**Les contradictions, tranchées dans le sens que la mesure soutient :**

| Sujet | Retenu | Fichiers alignés |
|---|---|---|
| `silence.test.ts` | **17** | `prompt-final.md` §2/§12, `11-conformite.md` (×4), `14-risques.md` (×2), `decisions.md` D9.7 |
| Ventilation de `scripts/` | **9 outils + 8 tests + 4 communs = 21** | `prompt-final.md` §4 |
| `glossary.json` | **60 phrases** (2 + 55 + 3) | `prompt-final.md` §4, `04-glossaire.md` (×3) |
| `glossary.test.ts` / `faq.test.ts` | **17** / **10** | `04-glossaire.md` (×3), `design/glossary-style-guide.md` |
| Dérive du kit du prototype | **42/162 (26 %)**, avec la mention qu'elle **augmente** tant que le fichier est maintenu à la main | `prompt-final.md` §4 |
| Porte de dépôt | **8** fichiers avec l'adresse tierce, **30** avec `/home/`, **6** avec `/home/<user>`, **4** avec le nom réel — tous nommés, et la porte s'écrit **après** P0, avec liste blanche `docs/discovery/**` | `prompt-final.md` §6 et §19.4 |
| Historique git | **28 commits, 467 occurrences**, avec la consigne « rejoue la commande, ne recopie pas le chiffre » | `prompt-final.md` §18.13 et §19.4, `11-conformite.md` A1, `16-hypotheses.md` H-CNF-17c, `decisions.md` D0.15b |
| `perf-budget.md` §5.8 | Titre passé à **« Mesures du 9/9 »**, avec la preuve (README de l'archive, `fetchTime` en `2026-09-09T14:3x`) | `design/perf-budget.md` |
| `14-risques.md` §4 | Titre **« Les huit fiches »** et décompte corrigé dans l'intro | `14-risques.md` |
| Volume du kit de cartes | **≈ 970 cartes, 4 à 10 minutes, ≈ 60 Mo** (D13.3) | `14-risques.md` §4, `01-faits.md`, `16-hypotheses.md` H-PLA-18, `prompt-final.md` §11 (« ≈ 970 pages ») |
| `decisions.md` s'arrête à D13.4 | **D13.5 à D13.8 écrites** (pseudonyme, dépôt, Node 24, `CLAUDE.md`) ; total mesuré **158 lignes, D0-D13** | `decisions.md`, `prompt-final.md` §3, §19.2, §19.5 |
| §19.4 pt 2 rouvrait les captures tierces | Remplacé par le **renvoi à H-LAN-14, priorité 1**, avec sa méthode et son chiffrage (≈ 1 h, 0 €, avant J-3) | `prompt-final.md` §19.4 |
| « 97 tests » dans la consigne de session | **99**, mesuré | hors dossier — corrigé dans la consigne, pas dans un fichier |

**Et la réserve de ce rapport — « le §19 ordonne encore : *Pose-les avant d'écrire une ligne de plan*, donc une session obéissante s'arrête » — est levée.** Le §19 s'ouvre désormais sur un cadre qui **retire explicitement cette consigne**, donne à chacun des sept arbitrages du §19.3 **sa décision par défaut avec la pièce qui la fonde**, et range les sept gestes du §19.4 en **bloc P0 daté, chiffré, à valider avant l'exécution et jamais avant la planification**. Le prompt écrit désormais, en toutes lettres et à trois endroits (§1, §18.3, §19) : **« Écris le plan, ne t'arrête pas. »**

**Portes rejouées après ces corrections, le 10/9/2026** : `npx tsc --noEmit` = 0 erreur · `npx tsx --test scripts/*.test.ts` = **99/99** · `npx tsx scripts/contrast.ts` = 105 paires, **28 paires de rôles, 0 échec**, code de sortie 0.

**Et une passe de clôture a suivi, le même jour** : elle a rejoué toutes les mesures contre l'arbre corrigé, résolu une deuxième fois chemins et ancres, et fermé **dix-sept résidus** — le même fait écrit dans deux fichiers et corrigé d'un seul côté, plus ce que le rejeu n'avait pas ouvert (le résumé exécutif annonçait encore le verdict « non » du rejeu n° 1 ; l'index du dossier était celui d'une session non commencée ; une commande de re-mesure du §19.5 rendait un `TypeError`) (`check-strings.ts` encore cité cinq fois ; D13.3 non propagée dans le corps de `14-risques.md` §4, dans `13-tests-humains.md` et dans H-PLA-18 ; `watch-aec2027.ts` encore au présent dans `12-positionnement-lancement.md` ; `riposte.test.ts` annoncé à 8 tests contre 13 mesurés). **Le détail, avec la commande de re-mesure de chaque chiffre, est au §11.**

---

## 1. Verdict

**Oui.** Le prompt s'exécute désormais sans question bloquante : le squelette du §7 a été écrit de bout en bout sans qu'aucune inconnue de structure oblige à s'arrêter.

Les cinq questions du §19.1 et les six valeurs du §19.2 sont tranchées et **reportées dans les fichiers** — vérifié : `decisions.md` porte D13.1 à D13.4, `design/strings.json` est en v0.5.0 avec 363 chaînes et un contrat d'interpolation clos. Les **quatorze points restants** (§19.3 et §19.4) ont tous été tranchés **depuis le dossier**, avec la pièce qui les tranche, au §6 ci-dessous : sept par une valeur par défaut que le dossier écrit lui-même, sept parce que ce sont des **gestes d'utilisateur datés** (lectures, purge, boîte mail, message 0) et non des inconnues de conception.

**Une réserve, la même qu'au premier rejeu — ⚠️ LEVÉE le 10/9/2026 en fin de journée, voir §0.** Le §19 ordonne littéralement « **Pose-les avant d'écrire une ligne de plan.** » Une session strictement obéissante s'arrête donc encore, non parce qu'il lui manque une réponse, mais parce qu'une phrase le lui interdit. Le correctif tient en une phrase à ajouter en tête du §19 : *« Ce qui suit se tranche par défaut, avec la pièce qui fonde le défaut ; on demande confirmation, on n'attend pas. »* C'est le seul changement du §8 qui commande les autres.

---

## 2. Ce qui a été exécuté, et avec quelle commande

| Contrôle | Commande | Résultat |
|---|---|---|
| Types | `npx tsc --noEmit` | code de sortie **0** |
| Tests | `npx tsx --test scripts/*.test.ts` | **99 tests, 99 passés, 0 échec**, 862 ms |
| Contraste | `npx tsx scripts/contrast.ts` | **105 paires** (32 ≥ 4,5:1, 73 < 4,5:1) ; **28 paires de rôles, 0 en échec** |
| Chemins | 152 chemins entre accents graves extraits du prompt, résolus depuis la racine, `docs/discovery/`, `design/`, `scripts/`, `data/`, `eval/` | tous résolvent, **sauf** ceux que le prompt annonce lui-même comme à produire |
| Ancres | 63 ancres `§`, `D*`, `H-*`, `O*`, `R*` testées contre les titres des fichiers cités | toutes résolvent **sauf deux** (§3) |
| Chiffres structurants | `data/faq.json` v0.2.0 (50 entrées : 20 `measures`, 19 `sections`, 6 `partial`, 4 `absent`, 1 `premise-false`) · `data/riposte.json` v0.3.0, 15 entrées · `data/glossary.json` v0.2.0, 5 entrées · `design/strings.json` v0.5.0, 363 chaînes · `eval/retrieval-results.md` l. 46 `A-synonymes-0.25` = 0,813 / 0,876 / 0,986 | conformes au prompt, **sauf** les écarts du §4 |

Contrôles ciblés : les 4 entrées `absent` de la FAQ portent bien `neighbour_ids`, `excluded_ids` et `absence_probe` ; `chat.liant.partiel` et `chat.liant.hors_sujet` sont bien **absentes** du kit (D6.11) ; `legal.notice.reply_delay` est bien **absente** (§19.2) ; aucune valeur de chaîne ne porte encore `{author}`, `{reviewer}`, `{repoUrl}`, `{organisation}` ou `{sponsor}` — ils ne survivent que dans `$meta`, comme historique. Le corpus ne contient que `c17-s01` et `c17-s02` : le raccourci `c17-*` du prompt est donc **exactement** équivalent à la liste explicite (VÉRIFIÉ sur `data/aec-2025.json`).

---

## 3. Pointeurs qui ne résolvent pas — deux *(constat du rejeu ; **les deux sont corrigés**, voir §0 et §11)*

1. **§10 point 9 → `07-mecaniques.md` l. 215.** Signalé au premier rejeu, **non corrigé**. La l. 215 est une ligne de tableau de red team (« Militant RN, Chasseur de captures ») ; elle ne porte la liste que dans sa portée étroite. La **règle canonique** est à la **l. 312** (§7.11 point 11) : « jamais dans un pool de jeu, jamais comme leurre, jamais sur une carte OG de jeu ; toujours lisibles ». Le §16 exige un « test de build sur la liste des sections sensibles » : c'est la l. 312 qu'il faut coder.
2. **`13-tests-humains.md` §T12**, cité deux fois par le prompt (§1 et §7) et une fois par `decisions.md` l. 5. Le fichier n'a pas de §T12 : le panel rouge est au **§5**, « Panel rouge (T12) — 10 septembre 2026 ». Trouvable, mais ce n'est pas une ancre.

**Rappel, sans conséquence** : `scripts/build-cards.ts`, `scripts/metrics.ts`, `wrangler.jsonc`, `astro.config.ts`, `src/`, `public/_headers`, `public/flags.json`, `.github/workflows/ci.yml`, `design/tokens.neutral.json`, `data/defis.json`, `data/quiz-triplets.json`, `data/surprises.json`, `data/stat-cards-legal.json`, `ops/flags.json` n'existent pas — le prompt le dit à chaque fois.

**Un pointeur mort à corriger** : le §4 liste `check-strings.ts` parmi les dix outils de `scripts/` alors que le même paragraphe explique qu'il a été renommé `check-strings.test.ts` au commit `5c6ee51`. `scripts/check-strings.ts` n'existe pas.

---

## 4. Contradictions mesurées *(constat du rejeu ; **les treize sont tranchées**, voir §0 ; les résidus de propagation sont fermés au §11)*

Onze écarts entre deux endroits du dossier, ou entre le dossier et l'arbre. Aucun ne bloque le plan ; tous font mentir une phrase publiée ou une porte de CI.

| # | Ce que dit un endroit | Ce que dit l'autre / la mesure |
|---|---|---|
| 1 | Prompt §2 pt 8 et §12 : « `scripts/silence.ts`, **14 tests** » | Prompt §4 et §6 : **17** ; mesuré : `npx tsx --test scripts/silence.test.ts` = **17** |
| 2 | Prompt §4 : `scripts/` = « **10 outils, 7 tests** » (total 21) | Mesuré : **9 outils + 8 tests + 4 fichiers communs = 21**. Le total est juste, la ventilation non, et elle survit au renommage de `check-strings` |
| 3 | Prompt §4 : `glossary.json` porte « **61 phrases** toutes étiquetées » | Mesuré : **60** (`sentences_by_kind` = 2 `verbatim` + 55 `reformule` + 3 `contexte-2022`) |
| 4 | Prompt §4 : dérive du kit du prototype = « **39 clés divergentes sur les 162 communes (24 %)** » | Mesuré aujourd'hui : **42 sur 162 (26 %)** — la v0.5 a réécrit des chaînes que le prototype n'a pas suivies. `{appName}` non résolu dans **3** chaînes : conforme |
| 5 | Prompt §6 porte « Dépôt » et §19.4 pt 2 : `<contact-tiers> est dans « **quatre** fichiers suivis » (puis en énumère cinq) | Mesuré : **8** fichiers suivis, dont **trois du dossier lui-même** (`11-conformite.md`, `13-tests-humains.md`, `prompt-final.md`). La porte e-mail échoue donc aussi sur la documentation, pas seulement sur les captures |
| 6 | Prompt §6 : « **20 fichiers suivis** contiennent `/home/`, **0** contiennent `/home/<user>` » | Mesuré : **30** et **6**. Les six sont `11-conformite.md`, `13-tests-humains.md`, `14-risques.md`, `16-hypotheses.md`, `17-dry-run-prompt.md` et **`prompt-final.md` l. 154** — c'est-à-dire la ligne qui écrit la porte |
| 7 | Prompt §18.13 et `11-conformite.md` §19.1 A1 : « les **26 commits** » | Mesuré : `git rev-list HEAD --count` = **28** ; `git log --all -p \| grep -ci '<nom-editeur>\|/home/<user>'` = **467** |
| 8 | `design/perf-budget.md` §5.8 : « **Mesures du 10/9** » | `docs/discovery/perf/2026-09-10/README.md` : « **9 septembre 2026** » et tous les `fetchTime` Lighthouse en `2026-09-09T14:3x`. Le prompt §13 a corrigé la date ; le titre du §5.8 ne l'est pas |
| 9 | `14-risques.md` §4 : titre « Les **cinq** fiches qui manquent au runbook » | Le tableau du même §4 en liste **huit** (6, 7, 8, 9, 11, 12, 10, 13), ce que dit le prompt §12 |
| 10 | `14-risques.md` §4, amendement transverse : « ≈ **2 900 cartes**, **15 à 25 minutes**, ≈ **240 Mo** » | D13.3 et prompt §7 : « ≈ **970 cartes**, ≈ **4 à 10 minutes**, ≈ **60 Mo** ». La correction n'a pas été propagée dans ce fichier |
| 11 | `04-glossaire.md` §3.1 passe 6 : « Porte de CI, **14 tests** » | Prompt §4/§6 et mesure : **17** |

**Un douzième écart, hors dossier** : la consigne de session annonce « 97 tests » là où le prompt §4/§6 et la mesure donnent **99**.

**Et une question posée deux fois, déjà tranchée une fois.** Le §19.4 pt 2 demande à l'utilisateur « Les sortir et purger, ou les garder ? » à propos des sept captures d'identité, alors que `16-hypotheses.md` §10.1 pose déjà **H-LAN-14 en priorité 1** avec la méthode complète : « Sortir du dépôt les 7 captures d'identité … et purger leur historique dans la même opération ; `captures-tiers.manifest.json` de SHA-256 à la place ». Le §19.4 rouvre ce que le §10.1 a fermé.

---

## 5. Ce que `decisions.md` n'avait pas encore reçu *(constat du rejeu — **écrit depuis** : `grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|'` = **158**, D13.1 à D13.8 présentes, voir §0 et §11)*

Au moment du rejeu, `decisions.md` comptait **154 lignes** : 150 pour D0-D12 (conforme au §19.5) et **D13.1 à D13.4**. Le prompt §16 et §19.2 renvoient à **D13.5, D13.6, D13.7 et D13.8** — pseudonyme public unique, nom du dépôt, Node 24, mise à jour de `CLAUDE.md` — qui **ne sont pas dans le fichier**. Les gestes correspondants sont faits dans l'arbre (`package.json` porte `"node": ">=24"`, `legal.license.code` porte l'URL du dépôt, `about.who` porte « Baoleka ») ; c'est la trace de décision qui manque. Première ligne du plan.

---

## 6. Questions bloquantes : aucune — et par quoi chacune est tranchée

**§19.3, arbitrages de produit et d'identité — sept, tous défaits par le dossier :**

1. **Wordmark** : casser l'**italique** et le **bloc 3D** (le Rouge sur « LÀ » reste, c'est la seule couleur d'action de la charte). Le dossier ne choisit pas les deux attributs, mais il fixe la règle (« casser au moins deux des trois ») **et** la mesure qui l'arbitre (tâche de 2 s, seuil ≥ 4/5 « pas la même »). Un défaut testé vaut mieux qu'une question.
2. **Mascotte** : **v1 sans mascotte**. §9 : le repli « est déjà accepté au §2.10 point 6 » et « les SVG n'existent pas encore » (H-DES-8) — rien n'est perdu, et la seule place prévue est celle que `design/illustration-rules.md` §2.3 documente comme le rôle de la tortue officielle.
3. **Easter egg lait-fraise** : **non embarqué en v1**. Origine jamais vérifiée (HYPOTHÈSE) et son unique intérêt — un emoji — est rejeté par la porte de chaînes.
4. **Rédaction des 25 cartes-concept** : **oui, un modèle hors ligne, à 0 €, sous le pipeline en 5 passes**. Ce n'est pas une supposition : `04-glossaire.md` §3.1 s'intitule « Le pipeline **tel qu'il a tourné** » pour les 5 cartes livrées, `about.writing_method` (kit v0.5, publiée) dit « Nos textes sont préparés avec un outil d'IA, puis vérifiés contre le livre et relus », D9.15 et le §18.13 posent la frontière rédaction / exécution. La contrainte §2.2 porte sur l'exécution.
5. **Balise d'événements** : **une par session**, verrou `aec.s.sent` + compteurs accumulés en `sessionStorage` (et non « en mémoire de page »), garde `event.persisted` pour la bfcache, **`RATE = 1,0` en v1**. §15 et ADR-11 recommandent le taux et décrivent le verrou ; le test existe déjà en toutes lettres (« 4 pages, combien de `POST /api/e` »).
6. **Porte de la v3** : **acceptée**, avec le défaut que le §16 écrit lui-même — « Par défaut, ne garder que F2 » et réaffecter ≈ 50 h. Le seul proxy mesuré donne S ≈ 0,43 pour F1.
7. **`/k/<n>`, `/carte#<bitmap>`, `/j/<date>`** : **réservées, 404 designé**. §17 écarte « La carte des 89 » de la v1 ; §10 écrit déjà « route réservée, 404 designé » pour `/j/`.

**§19.4, décisions juridiques — sept gestes d'utilisateur datés, pas des inconnues de conception :** purge par **suppression et recréation du dépôt à plat** (`11-conformite.md` §19.1 A1 : « la seule purge sûre ») · sortie des captures tierces selon **H-LAN-14 priorité 1** · lecture et archivage des deux textes de la charte **avant le premier build** (H-LAN-15) · RGPD art. 13(1)(a) tranché en une ligne **après** la lecture du guide CNIL · trois lectures à la source datées · sortie d'exposition = **publication de l'identité de personne physique**, la personne morale étant interdite par L52-8 entre le 1/10/2026 et le 2/5/2027 (D9.18 : il ne reste qu'une branche) · **message 0 à LFI à J-3**, son contenu étant déjà écrit (`12-positionnement-lancement.md` §9.6). Chacun entre au plan comme une tâche avec sa date et son critère archivé.

Les deux questions que le premier rejeu ajoutait restent pertinentes mais ne bloquent plus : le **jeu d'ajustement** de `OVERLAP_MIN` et `FIGURE_WINDOW` peut être disjoint du jeu de porte en réservant les **30 questions hostiles** de `eval/questions.json` à l'ajustement et les **100 + 60 écrans** à la porte (HYPOTHÈSE à confirmer, écrite comme telle dans le plan) ; le **recrutement des relecteurs** est chiffré par H-LAN-6 (« 0 €, ≈ 3 h ») avec son échéance (J-8, lun. 2 nov.) et son protocole (`testeurs.md`).

---

## 7. Le squelette de plan produit

Plancher 20 h/semaine (D0.26). Base 552 h (§16). **Bloc réintégré : les 40 h d'entre-deux-tours (19-29 avril)** ; les 20 h de clôture de session sont consommées par la session en cours. **P0 ajouté : 14 h**, absentes de tous les tableaux du dossier. **Total 606 h** pour ≈ 33 semaines du 14/9/2026 au 2/5/2027, soit **660 h de plancher : 54 h de marge (9 %)**.

```
P0  PRÉALABLES — 14 h (dont 8 h utilisateur) — avant la première ligne de code
 0.1 Consigner D13.5-D13.8 dans decisions.md. DONE : 158 lignes, 0 arbitrage du 10/9 non tracé. 1 h
 0.2 Dépôt supprimé et recréé à plat + 7 captures tierces sorties (H-LAN-14) + manifest SHA-256.
     DONE archivé : git log --all -p | grep -ci '<nom-editeur>|/home/<user>' = 0 (mesuré ce jour : 467). 5 h
 0.3 Lire et archiver : principes LFI, charte des groupes d'action, guide CNIL, LCEN 6-IV + décret
     2007-1527, UE 2024/900 art. 2/3.2/27. DONE : 5 captures horodatées + 1 ligne decisions.md chacune. 6 h
 0.4 contact@cestecritla.fr (Email Routing) + cadence de relève écrite. DONE : envoi test reçu, archivé. 1 h
 0.5 Audit de zone capturé réglage par réglage (Bot Fight Mode OFF, Security Level, BIC, Hotlink,
     Always Online, NEL). DONE : 6 captures datées dans captures/. 1 h

P1  SOCLE — 14 au 27 sept. — 40 h — jalon : cestecritla.fr sert une section réelle
 1.1 Pipeline de build orchestré (npm run build / build:fast), 9 étapes du §18.7 enchaînées, contrat
     d'E/S par étape. DONE : build à froid reproductible, durée chronométrée et écrite (H-PLA-18). 12 h
 1.2 Squelette : wrangler.jsonc (sans ai, DO, migrations, D1, KV, ratelimits, crons), astro.config.ts,
     src/, public/_headers, public/flags.json. DONE : wrangler check startup + types --check verts. 8 h
 1.3 Projection slim.json depuis build-data.ts, measure_split FUSIONNÉS, scope_id posé sous chaque
     heading_paragraph. DONE : 0 texte servi finissant sans ponctuation forte ; c1-s02-m02/m03 étiquetés. 8 h
 1.4 CI 0 neuron : 8 portes du §6, dont la porte de rôles, la porte « pas de mention IA sans IA »
     (sur le CONTENU rendu, 2 exemptions) et la porte dépôt corrigée. DONE : 99 tests + 8 portes vertes. 12 h

P2  LECTURE ET PARTAGE — 28 sept. au 18 oct. — 60 h — jalon : 89 sections et 837 propositions ont leur URL
 2.1 P1/P4/P8 corrigés d'abord : pré-rendu du verbatim, CSS inline, pyftsubset axe 900, hauteurs
     réservées. DONE : LCP < 2,5 s labo, CLS < 0,1, polices ≤ 75 Ko livrés par page. 20 h
 2.2 /s/ /m/ /c/ /a/, anatomies, 19 corrections de §3.11. DONE : axe 0 serious/critical, a11y ≥ 95. 16 h
 2.3 build-cards.ts incrémental → ≈ 970 PNG sous /og/<corpus_version>/, + module canvas client
     1080×1080 et 1080×1920. DONE : PNG < 300 Ko, 2 lignes de signature sur 100 % des cartes. 16 h
 2.4 8 liens rejoués sous la marque corrigée, /diag rempli sur 2 téléphones. DONE : grille complète. 8 h

P3  RECHERCHE, CONCEPTS, RIPOSTE — 19 oct. au 1er nov. — 40 h
 3.1 MiniSearch index sérialisé au build (hors thread principal), tolérance trait d'union/pluriel/féminin.
     DONE : hit@5 ≥ 0,95, rappel@10 ≥ 0,85, 0 tâche > 50 ms à CPU ×4. 14 h
 3.2 25 cartes-concept (pipeline 5 passes hors ligne) + 15 ripostes + mode marché + QR, champs internes
     strippés. DONE : 30 cartes à 0 affirmation non couverte ; 0 champ *_note_fr dans la projection. 26 h

P4  TEST HUMAIN BLOQUANT — 2 au 5 nov. — 12 h — ≥ 5 personnes, ≥ 2 non-politisées, Android ET iPhone
     DONE : 8 points de §3.12 tranchés ; 0 ligne rouge D0.32 ; aha < 60 s chez ≥ 3 ; S mesuré sans consigne
     sur F1 et F2 (c'est lui qui ouvre ou ferme les 100 h de v3).

P5  PAGES ET V1 — 6 au 9 nov. — 20 h — /mentions-legales (après P0.2 et P0.3 seulement),
     /confidentialite, /exactitude (table R0-R6 + seuils publiés), /methodologie, /licence (5 éléments
     CC §3(a)(1)). DONE : chaque ligne vraie au vu de 09-architecture §6. → v1 le mar. 10 nov.

P6  J → J+30 — 10 nov. au 10 déc. — 60 h — RATE = 1,0, recoupement zone, aucun taux publié sous
     200 sessions ni si l'écart dépasse 20 %. DONE : premier rapport N/S ; home.link.title figée.
P7  CREUX — 11 déc. au 3 janv. — 40 h — PWA + sw-kill.js livrés ENSEMBLE, /verifier, 8 objections d'O6.
     DONE : mise à jour effective en ≤ 2 chargements derrière un SW installé (test Playwright).
P8  V2 — 4 au 18 janv. — 40 h — écran « poser une question » sans IA, refus designé, /mot/. → 19 janv.
P9  V3 SOUS PORTE — 19 janv. au 22 févr. — 100 h SI S ≥ 0,5 mesuré en P4 ; sinon F2 seule (50 h) et
     50 h vers glossaire, ripostes et perf. 60 tirages /defi/<n>/ écrits en une passe avant le 1er mars.
P10 GEL 1er mars · vague inscription 1-12 mars (40 h) · exploitation 15 mars-15 avril (100 h) ·
     silences L49 (0 h) · entre-deux-tours 19-29 avril (40 h) · bascule « après » le 3 mai.

GLISSE EN PREMIER : la v3 entière, puis la PWA hors-ligne, puis l'écran « poser une question » — et si
  ce dernier tombe, le dire avec hit@5 0,986 et rappel@5 0,813, jamais avec « 80 % du travail ».
NE GLISSE JAMAIS : verbatim exact, URL par mesure, aperçu de partage, ligne d'indépendance et
  « Site non officiel », /confidentialite, /exactitude, /verifier, gel L49.
```

**Ce que le squelette fait apparaître et que le prompt ne dimensionne pas** : P0 n'a d'heures dans aucun tableau du dossier alors qu'il conditionne `/mentions-legales` (LCEN), le premier build (les deux textes de la charte, qui peuvent rouvrir D3.1) et la porte dépôt (qui, écrite aujourd'hui, échoue sur six fichiers du dossier et huit porteurs d'une adresse tierce). Et le pipeline de build — 12 h en P1.1 — reste le chemin critique : rien n'enchaîne les neuf étapes du §18.7.

---

## 8. Ce qu'il faudrait changer dans `prompt-final.md` — **les neuf points sont APPLIQUÉS (10 septembre 2026, fin de journée)**

> ⚠️ **Ne replanifie aucune des neuf lignes ci-dessous : elles sont faites.** Elles sont conservées telles quelles parce que ce sont les recommandations du rejeu, et que la trace de ce qui a été demandé vaut celle de ce qui a été corrigé. La colonne de vérification est au §0 ; la passe de clôture qui a fermé les résidus est au §11.

1. **Autoriser l'arbitrage par défaut en tête du §19** : « Ce qui suit se tranche par défaut, avec la pièce qui fonde le défaut ; on demande confirmation, on n'attend pas. » Sans elle, le prompt reste inexécutable seul, quelle que soit la qualité du reste.
2. **Faire pointer le §10 point 9 vers `07-mecaniques.md` l. 312**, pas l. 215 (déjà demandé au premier rejeu, non fait).
3. **Remplacer `§T12` par `13-tests-humains.md` §5** (deux occurrences, plus `decisions.md` l. 5).
4. **Corriger les six chiffres du §4** : 14 → 17 tests de silence (deux endroits) ; « 10 outils, 7 tests » → 9 et 8 ; 61 → 60 phrases de glossaire ; 39 → 42 clés divergentes ; « quatre fichiers » → 8 pour l'adresse tierce ; « 0 fichier `/home/<user>` » → 6, dont le prompt lui-même.
5. **Retirer `check-strings.ts` de la liste des outils** du §4.
6. **Consigner D13.5 à D13.8** dans `decisions.md`.
7. **Propager D13.3 dans `14-risques.md` §4** (≈ 970 cartes / 4-10 min / 60 Mo) et corriger le titre « cinq fiches » en « huit ».
8. **Corriger le titre de `design/perf-budget.md` §5.8** (« Mesures du 9/9 ») et celui de `04-glossaire.md` §3.1 passe 6 (17 tests).
9. **Retirer du §19.4 la question des captures tierces**, que `16-hypotheses.md` §10.1 H-LAN-14 a déjà tranchée avec sa méthode.

---

## 9. Ce que ce rejeu ne prouve pas

**HYPOTHÈSE** : qu'une autre session neuve produirait le même verdict. Une passe, un modèle, aucun contrôle. Ce qui est VÉRIFIÉ et rejouable, ce sont les contrôles du §2 et les mesures du §4, chacun avec sa commande.

**HYPOTHÈSE (personas)** : que l'ordre du squelette soit le bon. Il reprend D5.14, jugée par des agents et non par des personnes (D11.1).

**Et un biais propre à ce rejeu, à écrire** : la session qui joue le dry run n° 2 a reçu les arbitrages de l'utilisateur dans sa consigne. Elle n'a donc pas eu à les deviner. Ce que le rejeu établit, c'est que le prompt **plus** ces arbitrages s'exécute sans blocage — pas que le prompt seul y parviendrait pour quelqu'un qui n'aurait pas lu le §19.

---

## 10. Premier dry-run (9/9) — résumé conservé pour mémoire

Le premier rejeu (rapport remplacé par ce fichier ; il datait sa passe du 10 septembre 2026 au matin, avant les arbitrages) concluait **non**. Il comptait **dix questions bloquantes** : les cinq du §19.1 (routes serveur et D1, identifiant de partage, kit de cartes, forme d'URL de `/defi/`, cadence des tirages), la version de Node, le nom du dépôt, la porte de la v3, plus deux que le prompt ne posait pas — le jeu d'ajustement des constantes R0-R6 et le recrutement des relecteurs humains. Il trouvait **zéro pointeur cassé** sur 194 chemins et 63 ancres, un seul pointeur « exact mais incomplet » (l. 215 contre l. 312), et cinq contradictions dont la plus lourde : le §19 interdit d'écrire une ligne de plan avant d'avoir posé ses questions, ce qui rend le prompt structurellement inexécutable seul. Il mesurait aussi la dérive du kit de chaînes du prototype à 39 clés sur 162 là où le prompt écrivait « une chaîne ». Sept de ses dix questions ont été tranchées le 10 septembre par l'utilisateur (D13.1 à D13.8) ; les trois autres sont défaites au §6 ci-dessus. Sa recommandation n° 1 — autoriser l'arbitrage par défaut — reste la seule non appliquée, et reste la première du §8.

---

## 11. Passe de clôture — 10 septembre 2026, fin de journée

> **Ce qu'elle a fait.** Rejouer les mesures du §2 et du §4 contre l'arbre **après** les corrections du §0, résoudre une deuxième fois tous les chemins et toutes les ancres, et fermer les **résidus** — des pointeurs et des chiffres que les corrections du §0 avaient traités dans un fichier et pas dans son voisin. Aucun commit.

**Mesures rejouées, toutes conformes à ce que le prompt écrit aujourd'hui** (VÉRIFIÉ, commande citée) :

| Mesure | Commande | Résultat |
|---|---|---|
| Portes | `npx tsc --noEmit` · `npx tsx --test scripts/*.test.ts` · `npx tsx scripts/contrast.ts` | **0 erreur** · **99/99** · **105 paires, 28 paires de rôles, 0 échec** |
| Ventilation par fichier de test | `npx tsx --test scripts/<f>.test.ts` sur les 8 | glossaire **17**, FAQ **10**, riposte **13**, silence **17**, éval **8**, ingestion **7**, dérivés **9**, chaînes **18** — exactement les huit chiffres du §4 et du §6 point 4 |
| `scripts/` | `ls scripts/*.ts \| wc -l` ; `ls scripts/*.test.ts \| wc -l` | **21** ; **8** |
| Glossaire | `node -e "…counts.sentences_by_kind"` | **60** (2 + 55 + 3) |
| Kit de chaînes | comptage récursif de `design/strings.json` | **363** chaînes, **v0.5.0** ; placeholders utilisés = `chapter, contactEmail, count, date, dates, n, nextChapter, pollSponsor, pollster, read, reopenTime, resetTime, section, term, title, topic, total, url, version` — **plus aucun `{author}`, `{reviewer}`, `{repoUrl}`, `{organisation}` ni `{sponsor}`** |
| Dérive du kit du prototype | comparaison clé à clé | **42 / 162 (26 %)**, `{appName}` non résolu dans 3 chaînes |
| Décisions | `grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|' docs/discovery/decisions.md` | **158**, D0-D13, **D13.1 à D13.8 présentes** |
| Porte de dépôt | `git grep -l …` | **8** fichiers avec l'adresse tierce, **30** avec `/home/`, **6** avec `/home/<user>`, **4** avec le nom réel |
| Historique | `git rev-list HEAD --count` ; `git log --all -p \| grep -ciE '<nom-editeur>\|/home/<user>'` | **28** ; **467** |

**Pointeurs et ancres, résolus une deuxième fois** : **0 ancre `§N` cassée** dans `prompt-final.md`, `decisions.md`, `00-resume-executif.md`, `16-hypotheses.md` (les six alertes du résolveur automatique sont des faux positifs — un `§` du prompt lui-même cité après le nom d'un autre fichier). **0 fichier cité comme existant qui n'existe pas**, hors les quinze livrables de la liste close du §16. Les treize chemins `eval/*` du §4 résolvent tous.

**Les dix-sept résidus fermés par cette passe.** Les dix premiers sont le même fait écrit deux fois et corrigé d'un côté seulement au §0 ; les sept suivants viennent de l'élargissement de la passe aux fichiers que le rejeu n'avait pas ouverts (résumé exécutif, index du dossier, registre d'hypothèses, design system) :

| # | Résidu | Fichier et ligne | Correction |
|---|---|---|---|
| 1 | Pointeur mort `check-strings.ts` — le §4 du prompt déclare le fichier renommé, et le §8 du même prompt le citait encore | `prompt-final.md` l. 213 | → `check-strings.test.ts` |
| 2 | Idem dans la fiche D9.14 | `11-conformite.md` l. 567 | → `check-strings.test.ts` |
| 3 | Idem, quatre fois, dans les cellules « CORRIGÉ » du panel rouge | `13-tests-humains.md` l. 705, 739, 755, 756 | → `check-strings.test.ts` |
| 4 | D9.16 citait `check-strings.ts`, la version **v0.4** et **16/16** tests | `decisions.md` l. 145 | → `check-strings.test.ts`, « v0.4 puis v0.5 », **18/18 mesuré**, contrat d'interpolation clos écrit dans la décision |
| 5 | Idem, la fiche D9.16 du dossier conformité s'arrêtait à 9/9 | `11-conformite.md` l. 699 | → « remesuré **18/18** le 10/9/2026, kit en v0.5 » |
| 6 | **D13.3 non propagée dans le corps de la fiche R** : « ≈ 970 cartes × 3 ratios ≈ 2 900 fichiers, ≈ 240 Mo » et « rebuild des ≈ 2 900 cartes ». Seul l'**amendement transverse** du §4 (l. 344) avait été corrigé | `14-risques.md` l. 159 et l. 162 | → **≈ 970 fichiers, ≈ 60 Mo**, avec la mention de ce que la ligne portait |
| 7 | Idem dans la cellule « CORRIGÉ » du constat n° 4 du panel | `13-tests-humains.md` l. 720 | → **≈ 970 cartes, ≈ 4 à 10 min, ≈ 60 Mo** ajoutés à la cellule ; le constat garde ses chiffres d'origine, qui sont l'objet du constat |
| 8 | Idem dans la méthode de levée de H-PLA-18 | `16-hypotheses.md` l. 146 | → « **≈ 970 cartes OG** (D13.3) » |
| 9 | `scripts/watch-aec2027.ts` encore cité **au présent**, alors que le §16 du prompt annonce ce fichier corrigé dans ce document précis | `12-positionnement-lancement.md` l. 663 | → « ⚠️ **script inexistant, à produire** (VÉRIFIÉ, `ls scripts/`, 10/9/2026 ; livrable du socle, ≈ 1 h) » |
| 10 | `scripts/riposte.test.ts` annoncé à **8 tests**, dont une fois **dans une commande** qu'une session neuve rejoue et qui rend 13 | `10-riposte.md` l. 3 et l. 76 | → **13 tests au 10/9/2026** (8 à l'écriture, +4 au panel rouge T12) |

**Sept résidus de plus, trouvés en élargissant la passe au-delà des fichiers que le rejeu avait ouverts** :

| # | Résidu | Fichier | Correction |
|---|---|---|---|
| 11 | **Le §19.5 du prompt donnait une commande de re-mesure fausse** : `require('./data/glossary.json').counts.sentences_by_kind` rend `undefined` — le chemin réel est **`meta.counts`**. Une session neuve qui rejoue le chiffre du glossaire tombait sur un `TypeError` | `prompt-final.md` l. 72 et l. 646, `04-glossaire.md` l. 12 | → `meta.counts.sentences_by_kind`, vérifiée : `{ verbatim: 2, reformule: 55, 'contexte-2022': 3 }` |
| 12 | **Le résumé exécutif annonçait le verdict du dry run n° 1 (« non », dix questions bloquantes)** et disait « il reste la porte de la v3, les constantes R0-R6 et qui joue les relectures humaines » — c'est-à-dire l'inverse de ce que dit le rejeu n° 2. Une session qui lit le résumé **avant** le prompt, comme le §18.1 le lui demande, apprenait qu'elle allait être bloquée | `00-resume-executif.md` l. 112, 113, 132, 133 | → les deux rejeux, verdict **OUI**, et « **écris le plan, ne t'arrête pas** » |
| 13 | **`decisions.md` était encore annoncé à 150 décisions D0-D12** avec la mention « les huit arbitrages du 10/9 restent à y consigner » — faux depuis que D13.1-D13.8 y sont | `00-resume-executif.md` l. 3 et 99, `14-risques.md` l. 432, `16-hypotheses.md` l. 456, `CLAUDE.md` | → **158, D0-D13**, avec la commande de comptage |
| 14 | **`docs/discovery/README.md` était l'index d'une session qui n'a pas encore eu lieu** : point d'entrée `PLAN-SESSION.md`, `prompt-final.md` décrit comme « squelette rempli au fil de la session », et un bloc « Lancer la session » qui demandait d'exécuter le plan de découverte. Il n'indexait ni `04-` à `17-`, ni le dry run | `docs/discovery/README.md` (réécrit), `README.md` racine, `PLAN-SESSION.md` (bandeau **ARCHIVE — EXÉCUTÉ**) | → index à jour, ordre de lecture, les trois portes à rejouer |
| 15 | **D13.3 non propagée dans les fiches vivantes du registre d'hypothèses** : H-COR-1, H-PAR-5, H-PAR-10 et la priorité 1 de H-COR-10 chiffraient encore sur ≈ 2 900 cartes / ≈ 240 Mo / ≈ 4 500 fichiers ; le diagramme mermaid du build portait `OG PNG x2900` | `16-hypotheses.md` l. 30, 75, 80, 356 ; `09-architecture.md` l. 71 ; `06-partage.md` l. 133 ; `decisions.md` D4.1 | → **≈ 970 / ≈ 60 Mo / ≈ 2 600**, chaque ligne disant ce qu'elle portait |
| 16 | **`design/voice.md` s'appliquait à « 172 chaînes »**, parlait de « liant IA » (mort avec D6.10/D6.11) et de « tortue » (morte avec D3.11 et la ban list) ; **`design/illustration-rules.md`** appliquait D0.12 sans les deux défauts du §19.3 — une session pouvait planifier une mascotte et un easter egg que le prompt écarte de la v1 | `design/voice.md` l. 3, `design/illustration-rules.md` l. 5, `14-risques.md` l. 110 | → **363 chaînes v0.5.0**, « liant » sans IA, « Marcheuse » ; les défauts « v1 sans mascotte » et « easter egg non embarqué » écrits en tête du brief |
| 17 | **`04-glossaire.md` imprimait encore le badge « relu par {reviewer} »**, placeholder supprimé du kit par D13.5 | `04-glossaire.md` l. 18 | → « **Rédigé par nous, relu par Baoleka** » |

**Un dix-huitième, cosmétique** : le §4 du prompt abrégeait `eval/prompt-system-v2.md` en `` `v2.md` `` au milieu d'une énumération — écrit en entier (`prompt-final.md` l. 81).

**Et un écart d'environnement, mesuré, qui n'était écrit nulle part** : `package.json` déclare `"engines": { "node": ">=24" }` et la CI installe 24, mais **la machine qui a joué les portes tourne sous Node v20.20.1** (`node -v`). Les trois portes passent sous 20 ; rien n'a jamais été exécuté sous 24. Écrit au §19.2 du prompt comme **première tâche du socle** — installer Node 24, rejouer les trois portes, écrire les trois résultats — et non comme une question.

**Ce que cette passe n'a pas trouvé** : aucune question bloquante, aucun pointeur cassé, aucune contradiction mesurable restante entre deux fichiers du dossier. Les sept points du **§19.4** restent ouverts **par construction** — identité, politique, argent, exposition juridique —, ils sont datés et chiffrés en P0, et le §19 dit en toutes lettres que le plan s'écrit sans eux.

**Réserve, honnête et inchangée** : cette passe a rejoué les **mesures** et **résolu les chemins**. Elle n'a pas rejoué le squelette de plan de bout en bout, et le biais du §9 tient — la session qui a produit ce rapport avait les arbitrages D13.1-D13.8 dans sa consigne.

---

## 12. Troisième dry-run — 10 septembre 2026

> **Ce que c'est.** Une troisième session neuve, en plan mode, mêmes règles que le rejeu n° 2 : `docs/discovery/prompt-final.md` comme seule entrée, on lit ce qu'il dit de lire, on résout chaque pointeur, on rejoue chaque chiffre structurant, on pousse le squelette du plan de bout en bout. **Périmètre** : `prompt-final.md` dans son état du jour, **654 lignes** (`wc -l`), 19 sections.
>
> **Même barre qu'au rejeu n° 2 : on ne baisse rien pour atteindre « oui ».** Ce qui suit ne replanifie aucune correction déjà faite ; il ajoute **ce que les deux premiers rejeux n'avaient pas mesuré**.

### 12.1 Verdict

**OUI.** Le prompt s'exécute sans question bloquante : le squelette du §12.5 a été écrit du P0 au 3 mai 2027 sans qu'aucune inconnue de structure oblige à s'arrêter. Les huit arbitrages D13.1-D13.8 sont bien dans `decisions.md` (**158 lignes de décision, D0-D13**, mesuré), le contrat d'interpolation est clos, et le cadre en tête du §19 retire la consigne d'arrêt qui bloquait le rejeu n° 1.

**Mais le verdict s'accompagne de cinq contradictions mesurées et de trois pointeurs qui ne résolvent pas** — tous **nouveaux**, aucun dans les listes déjà fermées aux §0, §4 et §11. Deux d'entre eux touchent un **critère de done** que le plan recopie tel quel.

### 12.2 Portes rejouées — vertes (VÉRIFIÉ, commande citée)

| Contrôle | Commande | Résultat |
|---|---|---|
| Types | `npx tsc --noEmit` | code de sortie **0** |
| Tests | `npx tsx --test scripts/*.test.ts` | **99 tests, 99 passés, 0 échec**, 875 ms |
| Contraste | `npx tsx scripts/contrast.ts` | **105 paires** (32 ≥ 4,5:1, 73 < 4,5:1) ; **28 paires de rôles, 0 en échec** ; code de sortie **0** |
| Ventilation par fichier | `npx tsx --test scripts/<f>.test.ts` × 8 | glossaire **17**, FAQ **10**, riposte **13**, silence **17**, éval **8**, ingestion **7**, dérivés **9**, chaînes **18** — les huit chiffres du §4 et du §6 point 4, à l'unité |
| `scripts/` | `ls scripts/*.ts \| wc -l` ; `ls scripts/*.test.ts \| wc -l` | **21** ; **8** (9 outils + 8 tests + 4 communs, ventilation vérifiée nom par nom) |
| Décisions | `grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|' docs/discovery/decisions.md` | **158**, D13.1 à D13.8 présentes |
| Kit de chaînes | comptage récursif | **363** chaînes, **v0.5.0** ; 19 placeholders, **aucun** `{author}` / `{reviewer}` / `{repoUrl}` / `{organisation}` / `{sponsor}` |
| Glossaire | `node -e "…meta.counts.sentences_by_kind"` | **60** (2 + 55 + 3) ; 5 cartes, `reviewed_human` = 5 |
| FAQ / riposte | lecture des fichiers | `faq.json` **v0.2.0**, 50 entrées (19 `sections`, 20 `measures`, 6 `partial`, 4 `absent`, 1 `premise-false`), les 4 `absent` portent `neighbour_ids` + `excluded_ids` + `absence_probe` · `riposte.json` **v0.3.0**, 15 entrées, 15 `slug`, `rip-04.share_card_fr.verbatim_id` = `c8-s04-k01`, 0 titre `claim` sans mot plein partagé |
| Dérive du kit du prototype | comparaison clé à clé | **42 / 162 (26 %)**, `{appName}` non résolu dans **3** chaînes (`independence.about`, `turtle.alt`, `about.intro`) |
| Historique | `git rev-list HEAD --count` ; `git log --all -p \| grep -ciE '<nom-editeur>\|/home/<user>'` | **28** ; **467** |
| Désintox dans l'historique | `git merge-base --is-ancestor 16c7d82 HEAD` ; comptage | **ancêtre de HEAD** ; **26 `content_text`, 43 423 caractères** — exactement ce que le §4 annonce, et le dépôt public les redistribue toujours |
| Invariants | `data/expected-invariants.json` | 4 / 18 / 89 / 87 / 706 / 44 / 837 / 48 / 109 / 15 — conformes |
| Couverture des cartes-concept | calcul sur `data/glossary.json` | **15 sections sur 89** (`verbatim_ids ∪ related_measure_ids`) — le chiffre du §10 point 1, confirmé |
| `c17` | `data/aec-2025.json` | `c17-s01` et `c17-s02` seulement : le raccourci `c17-*` est exactement équivalent à la liste explicite |

**Environnement, inchangé et déjà écrit au §19.2 du prompt** : `node -v` = **v20.20.1** alors que `package.json` déclare `"engines": {"node": ">=24"}` et que la CI installe 24 ; `@types/node` est toujours épinglé en `^20.19.43`. Les trois portes passent sous 20 ; **rien n'a jamais été exécuté sous 24**. Ce n'est pas une question, c'est la première tâche du socle.

### 12.3 Pointeurs qui ne résolvent pas — trois, tous nouveaux

1. **`docs/discovery/domaine.md` l. 29** (§19.2, valeur de `{contactEmail}`). La ligne 29 est **vide** ; la ligne qui porte `contact@cestecritla.fr` et Email Routing est la **l. 33** (le fichier fait 37 lignes). Même classe de défaut que le `l. 215` du rejeu n° 1 : le fichier est le bon, la ligne ne l'est pas.
2. **`07-mecaniques.md` l. 354** (§10, encadré des trois fichiers de pools : « filtres d'exclusion en `07-mecaniques.md` §7.11 **et l. 354** »). La l. 354 est un **`>` de citation** dans l'amendement §8.4. Les filtres d'exclusion sont à la **l. 251** (tableau red team §7.3) et à la **l. 368** (fiche de la mécanique) ; **§7.11 est juste**, la moitié « l. 354 » ne l'est pas.
3. **La « liste close » du §16 n'est pas close.** Elle affirme : « Tout pointeur du dossier qui ne résout pas aujourd'hui est dans cette liste ; toute autre référence morte est un bug de rédaction, **à signaler** ». Deux livrables annoncés par le prompt lui-même n'y sont pas : **`sw-kill.js`** (§12, « livrer dès la première version », fiche 12 du runbook) et **`captures-tiers.manifest.json`** (§19.4 point 2, méthode H-LAN-14). Et le titre annonce **quinze** fichiers là où le tableau en énumère **quatorze** vivants — le quinzième, `ops/flags.json`, y est **barré et déclaré « sans objet » par D12.8**.

**Sans conséquence, vérifié** : les 197 chemins entre accents graves du prompt résolvent tous, hors ceux qu'il annonce comme à produire ; les **80 ancres `§`** testées contre les titres réels de `07-mecaniques`, `13-tests-humains`, `08-ia`, `16-hypotheses`, `09-architecture`, `06-partage`, `12-positionnement-lancement`, `perf-budget`, `05-direction-artistique`, `11-conformite`, `14-risques`, `02-funnel-personas`, `illustration-rules`, `10-riposte`, `voice`, `motion-spec`, `03-corpus`, `04-glossaire`, `00-resume-executif` et `identity-decision` résolvent **toutes** ; `07-mecaniques.md` **l. 312** porte bien les 14 sections sensibles en clair ; `eval/retrieval-results.md` **l. 46** porte bien `A-synonymes-0.25` (0,813 / 0,876 / 0,986 / 0,819) et **l. 42** `A-spec` ; `§T12` ne survit que dans les journaux de version JSON et les commentaires de test, exactement là où le §5 de `13-tests-humains.md` explique qu'on ne le réécrit pas.

### 12.4 Contradictions mesurées — cinq, toutes nouvelles

| # | Ce que le prompt écrit | Ce que la mesure donne | Commande |
|---|---|---|---|
| 1 | **§10 point 5** : badge de carte-concept « Rédigé par nous, relu par **`{reviewer}`** » — « **libellé à trancher (§19)** : `{reviewer}` et `{author}` désignent aujourd'hui la même personne » | **La question est fermée depuis D13.5.** Le §4, le §19.2 et le kit v0.5 disent tous « **Rédigé par nous, relu par Baoleka** » ; `design/strings.json` porte `concept.authorship.reviewed` avec cette valeur en clair, et `check-strings.test.ts` (18/18) échoue sur tout `{reviewer}` survivant. **Le §10 rouvre, dans la section qu'un implémenteur lit pour construire l'écran, une décision que trois autres sections déclarent prise** — et il l'écrit avec un placeholder que la porte de CI interdit | `node -e "…['concept.authorship.reviewed']"` |
| 2 | **§4** : « `gzip -9` en ligne de commande rend **145 441 o** aujourd'hui et **`zlib` niveau 9 144 620 o** » | `gzip -9` = **145 441** ✅ ; **`zlib` niveau 9 = 142 345**, c'est-à-dire **exactement le chiffre publié** par `03-corpus.md` §6 et par le §4 lui-même ; `zlib` niveau 6 (défaut) = 143 897. **Aucun réglage ne rend 144 620.** L'avertissement est juste — il faut nommer l'outil — mais il nomme le bon outil avec le mauvais nombre, dans un dossier dont le §18.12 dit « n'invente jamais un chiffre » | `gzip -9 -c data/aec-2025.json \| wc -c` ; `node -e "zlib.gzipSync(buf,{level:9}).length"` |
| 3 | **§16, jalon du 2-5 nov.** : critère de done = « les **8 points** de `13-tests-humains.md` §3.12 tranchés » | **§3.12 porte 12 points.** Les points **9 à 12** ont été ajoutés le 10/9 par le panel rouge T12 : réutilisation comptée (H-LAN-13), **tâche éliminatoire de 2 s sur le wordmark**, deux arrivées par lien **sans carte-concept**, comportement de substitution relevé avant démonstration. **C'est le critère de done du seul jalon bloquant du calendrier**, et il est sous-compté de quatre points dont deux éliminatoires | `sed -n '/3\.12/,/3\.13/p' docs/discovery/13-tests-humains.md \| grep -cE '^[0-9]+\. '` |
| 4 | **§17** : « `16-hypotheses.md` §10.1, **35 lignes** priorisées, toutes à 0 € » | **43 lignes** : 14 en priorité 1, 13 en priorité 2, 16 en priorité 3. « Toutes à 0 € » est **vrai** (aucune ligne ne porte un coût non nul) | comptage des lignes `\| <priorité> \|` entre §10.1 et §10.2 |
| 5 | **§4 point 5 et §6 point 7** : `<contact-tiers> est dans « **8 fichiers suivis** », énumérés — dont trois du dossier (`11-conformite.md`, `13-tests-humains.md`, `prompt-final.md`) | **9 fichiers**. Le neuvième est **`17-dry-run-prompt.md`** — ce rapport, écrit le 10/9 **après** la mesure. La liste blanche `docs/discovery/**` le couvre, donc **la porte de dépôt ne change pas** ; mais le prompt écrit lui-même « rejoue la commande, ne recopie pas le chiffre », et c'est ce chiffre-là qui a bougé le premier | `git grep -l '<contact-tiers>' \| wc -l` |

**Deux écarts hors dossier, à corriger dans la consigne de session et non dans un fichier** : elle annonce `prompt-final.md` à **587 lignes** (mesuré **654**) et les tests à **97** (mesuré **99** — déjà signalé au rejeu n° 2, §4). Et l'en-tête de ce rapport date le périmètre du rejeu n° 2 à **601 lignes** : c'était l'état d'avant les corrections du §0, appliquées le même jour ; le fichier en fait **654** aujourd'hui.

**Ce que cette passe n'a PAS trouvé** : aucune question bloquante, aucune inconnue d'architecture, aucun placeholder non résolu, aucune ancre cassée, aucun fichier cité comme existant qui n'existe pas hors de la liste du §16, et **aucune régression** sur les dix-sept résidus fermés au §11 — `check-strings.ts` n'est plus cité comme outil, D13.3 est propagée partout (les trois « ≈ 2 900 » restants de `14-risques.md` sont des mentions historiques explicites « cette ligne portait »), `watch-aec2027.ts` est marqué inexistant, `perf-budget.md` §5.8 dit « Mesures du 9/9 », `04-glossaire.md` passe 6 dit 17 tests, `10-riposte.md` dit 13 tests, `14-risques.md` §4 dit « Les huit fiches », `00-resume-executif.md` porte le verdict **OUI** du rejeu n° 2, `docs/discovery/README.md` est l'index de la session terminée, et `CLAUDE.md` est celui de D13.8.

### 12.5 Le squelette de plan produit

Plancher 20 h/semaine (D0.26). Base **552 h** (§16, somme du tableau revérifiée). **Bloc réintégré : les 40 h d'entre-deux-tours (19-29 avril)** ; les 20 h de clôture de session sont consommées. **P0 : 14 h**, absentes de tous les tableaux du dossier. **Total 606 h** pour **33 semaines** du 14/9/2026 au 2/5/2027, soit **660 h de plancher : 54 h de marge (8 %)**.

```
P0  PRÉALABLES — 14 h (dont ≈ 8 h utilisateur) — avant la première ligne de code
 0.1 Node 24 local, rejeu des 3 portes sous 24, @types/node aligné sur ^24.
     DONE : les 3 résultats écrits ; si un chiffre bouge, c'est le dépôt sous 24 qui fait foi. 1 h
 0.2 Dépôt supprimé et recréé à plat + 7 captures d'identité et 5 HTML sortis (H-LAN-14)
     + captures-tiers.manifest.json (SHA-256) + test de CI qui rejette tout PNG tiers.
     DONE archivé : git log --all -p | grep -ciE '<nom-editeur>|/home/<user>' = 0 (467 ce jour). 5 h
 0.3 Lire et archiver : principes LFI + charte des groupes d'action (H-LAN-15, peuvent ROUVRIR D3.1),
     guide CNIL communication politique nov. 2025, LCEN 6-IV + décret 2007-1527, UE 2024/900
     art. 2 / 3.2 / 27 (PDF du JO). DONE : 5 captures horodatées + 1 ligne decisions.md chacune. 6 h
 0.4 contact@cestecritla.fr (Email Routing) + cadence de relève écrite (quotidienne dès J-3). 1 h
 0.5 Audit de zone capturé réglage par réglage (Bot Fight Mode OFF, Security Level, BIC, Hotlink,
     Always Online, NEL) + dashboard Billing sans moyen de paiement. DONE : 7 captures datées. 1 h
 [Décisions d'utilisateur incluses : RGPD 13(1)(a), sortie d'exposition (D9.18 : une seule branche),
  message 0 à LFI à J-3. Une ligne de decisions.md chacune. Ne conditionnent QUE /mentions-legales,
  la purge et le premier build public.]

P1  SOCLE — 14 au 27 sept. — 40 h — jalon : cestecritla.fr sert une section réelle
 1.1 Pipeline de build orchestré (npm run build / build:fast), les 9 étapes du §18.7 enchaînées,
     contrat d'E/S par étape, build-data.ts promu de prototypes/spike-share vers scripts/.
     DONE : build à froid reproductible, durée chronométrée et écrite (H-PLA-18) ;
     build:fast ne régénère ni cartes OG ni pages de partage. 12 h
 1.2 Squelette : wrangler.jsonc (sans ai, durable_objects, migrations, d1_databases, kv_namespaces,
     ratelimits, triggers.crons, vars AI_*/TURNSTILE_*/BUDGET_*), astro.config.ts, src/,
     public/_headers, public/flags.json (schéma + défauts + no-cache).
     DONE : wrangler check startup et wrangler types --check verts ; 0 binding retiré présent. 8 h
 1.3 Projection slim.json : measure_split FUSIONNÉS (5) avec alias de redirection, scope_id posé sous
     chaque heading_paragraph (2), prose_after_measures en fin de section (2), statistic_as_paragraph
     en cartes (6). DONE : 0 texte servi finissant sans ponctuation forte, ni sur une conjonction, une
     préposition ou une parenthèse ouverte ; rendu testé sur c1-s02-m02 ET c1-s02-m03. 8 h
 1.4 CI 0 neuron : les 8 portes du §6 + scripts/watch-aec2027.ts (≈ 1 h).
     DONE : 99 tests + 8 portes vertes. Porte dépôt écrite APRÈS 0.2, motifs /home/[A-Za-z0-9._-]+/ et
     e-mail, liste blanche docs/discovery/**, mesurée contre l'arbre du jour (9 fichiers portent
     l'adresse tierce, 30 /home/, 6 /home/<user>, 4 le nom réel). Porte de taille du corpus NOMMANT
     l'outil : zlib niveau 9 = 142 345 o ; jamais gzip -9, qui rend 145 441. 12 h

P2  LECTURE ET PARTAGE — 28 sept. au 18 oct. — 60 h — jalon : 89 sections et 837 propositions ont leur URL
 2.1 P1/P4/P8 corrigés d'abord : pré-rendu du verbatim, CSS inline, pyftsubset axe 900, hauteurs
     réservées. DONE : LCP < 2,5 s labo, CLS < 0,1, polices ≤ 75 Ko/page (99 744 o aujourd'hui). 20 h
 2.2 /s/ /m/ /c/ /a/ /r/, anatomies, les 19 corrections de §3.11.
     Défauts §19.3 appliqués, réversibles au jalon nommé : wordmark en capitales DROITES sans bloc 3D,
     Rouge sur « LÀ » gardé (rejoué au test du 2-5 nov.) · v1 SANS mascotte, jauge purement
     typographique (rejoué en v1.1) · easter egg non embarqué · /k/, /carte#, /j/ réservées, 404
     designé. Badge de carte-concept = concept.authorship.reviewed, « Rédigé par nous, relu par
     Baoleka » — AUCUN placeholder (le §10 point 5 du prompt est périmé, voir §12.4 n° 1).
     Variante d'arrivée par lien SANS carte-concept spécifiée (74 sections sur 89 aujourd'hui) :
     geste = « Lire la section », pas de CTA concept, jamais de lien vers concept.unknown.
     DONE : axe 0 serious/critical, Lighthouse a11y ≥ 95 à CHAQUE PR, reflow 320 px, 130 % ET 150 %. 16 h
 2.3 build-cards.ts incrémental → ≈ 970 PNG sous /og/<corpus_version>/ en immutable, + module canvas
     client 1080×1080 et 1080×1920 partageant le code de carte du build.
     DONE : PNG < 300 Ko, 2 lignes de signature sur 100 % des cartes, og:site_name = « C'est écrit
     là », 0 carte statistique en image, 0 occurrence de « AEC Discover ». 16 h
 2.4 Les 8 liens rejoués sous la marque corrigée, /diag rempli sur 2 téléphones réels.
     DONE : grille complète — D4.3/D4.4 passent de DÉCLARÉ à VÉRIFIÉ, ou tombent. 8 h

P3  RECHERCHE, CONCEPTS, RIPOSTE — 19 oct. au 1er nov. — 40 h
 3.1 MiniSearch sérialisé au build (loadJSON) ou Web Worker, tolérance trait d'union/pluriel/féminin.
     DONE : hit@5 ≥ 0,95, rappel@10 ≥ 0,85, rappel@3 sections ≥ 0,90, 0 id interdit parmi les voisins
     affichés d'un refus (éliminatoire), 0 tâche > 50 ms à CPU ×4 (200-224 ms aujourd'hui). 14 h
 3.2 25 cartes-concept — défaut §19.3 n° 4 appliqué : modèle hors ligne, 0 €, pipeline en 5 passes de
     04-glossaire §3.1 À SCRIPTER (aucun de ces scripts n'existe) — + 15 ripostes + mode marché + QR
     + data/stat-cards-legal.json. DONE : 30 cartes à 0 affirmation non couverte, 17 tests verts,
     0 champ *_note_fr dans la projection, divergence /r/<id> → /r/<theme> supprimée AVANT la
     génération des cartes (H-PAR-10). 26 h
 + Porte R0-R6 (8e porte, BLOQUANTE pour la v1) : OVERLAP_MIN et FIGURE_WINDOW fixées par le rejeu P1,
   jamais choisies à l'écriture, publiées sur /exactitude. Tant qu'elle n'est pas verte : R0, R1, R2,
   R5, R6 seulement — « voici » par défaut, jamais « confirme », jamais « corrige ».

P4  TEST HUMAIN BLOQUANT — 2 au 5 nov. — 12 h — ≥ 5 personnes, ≥ 2 non-politisées, Android ET iPhone
     DONE : les 12 points de §3.12 tranchés (et NON 8 : le §16 du prompt sous-compte de quatre, voir
     §12.4 n° 3) ; 0 ligne rouge D0.32 ; aha < 60 s chez ≥ 3 ; tâche wordmark de 2 s ≥ 4/5 « pas la
     même » ; S mesuré SANS consigne sur F1 et F2 — c'est lui, et lui seul, qui ouvre ou ferme P9.

P5  PAGES ET V1 — 6 au 9 nov. — 20 h — /mentions-legales (après P0.2 ET P0.3 seulement),
     /confidentialite (les lignes 2 et 3 tombent, la 6 sort, la 7 déclare le transfert hors UE, + les
     4 lignes RGPD art. 13 sous les dix), /exactitude (table R0-R6 + seuils + gabarit « pourquoi l'IA
     a été retirée »), /methodologie, /licence (les 5 éléments CC §3(a)(1)), /verifier, /a-propos (les
     3 attaques du §18.14 + la distinction rédaction hors ligne / exécution).
     DONE : chaque ligne vraie au vu de 09-architecture §6. → v1 le mar. 10 nov.

P6  J → J+30 — 10 nov. au 10 déc. — 60 h — défaut §19.3 n° 5 appliqué : UNE balise par session, verrou
     aec.s.sent + compteurs en sessionStorage, garde event.persisted, RATE = 1,0.
     DONE : test Playwright « 4 pages → 1 seul POST /api/e » ; premier rapport N/S ; aucun taux publié
     sous 200 sessions ni si l'écart avec l'analytics de zone dépasse 20 % ; home.link.title figée.
P7  CREUX — 11 déc. au 3 janv. — 40 h — PWA + sw-kill.js livrés ENSEMBLE + fiche 12 du runbook,
     /verifier durci, les 8 objections d'O6. DONE : mise à jour effective en ≤ 2 chargements derrière
     un SW installé (Playwright).
P8  V2 — 4 au 18 janv. — 40 h — écran « poser une question » sans IA, refus designé (absent vs
     premise-false), /mot/. → 19 janv.
P9  V3 SOUS PORTE — 19 janv. au 22 févr. — 100 h SI S ≥ 0,5 sans consigne pour CHACUNE des deux
     mécaniques ; si une seule passe, elle seule (≈ 50 h) et 50 h au glossaire/ripostes/perf ; si
     aucune, 100 h au socle (défaut §19.3 n° 6). Les 60 tirages /defi/<n>/ écrits et relus en UNE
     passe avant le 1er mars.
P10 GEL 1er mars · vague inscription 1-12 mars (40 h, date calculée par registrationDeadline()) ·
     exploitation 15 mars-15 avril (100 h) · silences L49 (0 h) · entre-deux-tours 19-29 avril (40 h) ·
     bascule « après » le 3 mai.

GLISSE EN PREMIER : la v3 entière, puis la PWA hors-ligne, puis l'écran « poser une question » — et si
  ce dernier tombe, le dire avec hit@5 0,986 et rappel@5 0,813, jamais avec « 80 % du travail ».
NE GLISSE JAMAIS : verbatim exact, URL par mesure, aperçu de partage, ligne d'indépendance et
  « Site non officiel », /confidentialite, /exactitude, /verifier, gel L49.
```

**Ce que ce squelette fait apparaître, et que le rejeu n° 2 n'avait pas relevé** : le critère de done du **seul jalon bloquant** (P4) et le compte des hypothèses à lever avant lancement (43, pas 35) sont tous deux sous-comptés par le prompt. Un plan qui les recopie sort une v1 en ayant tranché 8 points sur 12 et levé 35 lignes sur 43 — **sans jamais le savoir**, puisque les deux chiffres sont écrits comme des faits mesurés.

### 12.6 Ce que ce rejeu ne prouve pas

**HYPOTHÈSE** : qu'une quatrième session neuve produirait le même verdict. Trois passes, un modèle, aucun contrôle croisé.

**HYPOTHÈSE (personas)** : que l'ordre du squelette soit le bon. Il reprend D5.14, jugée par des agents (D11.1).

**Et le même biais qu'au rejeu n° 2, écrit sans l'atténuer** : cette session a reçu les arbitrages D13.1-D13.8 **dans sa consigne**. Ce qu'elle établit, c'est que le prompt **plus** ces arbitrages s'exécute sans blocage — et que `decisions.md` les porte désormais, donc qu'une session qui ne les recevrait pas les y lirait. Ce qu'elle n'établit pas, c'est ce que ferait une session qui lirait le §10 point 5 avant le §19.2 : elle y trouverait un « libellé à trancher » et un placeholder mort, et rien dans cette section ne lui dirait que la question est fermée depuis D13.5.

**Aucun commit.** Les cinq contradictions et les trois pointeurs du §12.3 et du §12.4 sont **des constats, pas des corrections** : ils sont à appliquer dans les fichiers avant que ce prompt serve une quatrième fois.
