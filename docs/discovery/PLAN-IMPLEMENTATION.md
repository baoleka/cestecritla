# Plan d'implémentation — « C'est écrit là » (cestecritla.fr)

> Produit par la session plan-mode lancée par `docs/discovery/prompt-final.md` (livrable n° 1 de la
> session de découverte des 7-10 septembre 2026). **Approuvé le 10 septembre 2026.**
> Horizon : 11 septembre 2026 → 3 mai 2027.
>
> **Statuts** : VÉRIFIÉ = mesuré, commande citée · PROBABLE = déduit ou mesuré une fois ·
> HYPOTHÈSE = non prouvé, méthode de levée indiquée.
>
> **Règle appliquée partout dans ce plan** (§18.12, 3ᵉ dry run) : *rejoue la commande, ne recopie pas
> le chiffre*. Tous les nombres ci-dessous ont été re-mesurés le 10/9/2026 ; ceux qui divergent du
> prompt sont signalés au §14.

---

## Contexte

La session de découverte est close. Ce qui existe n'est pas une esquisse : un corpus vérifié et figé
(`corpus_version d29c7422004ab27c`, 4 parties / 18 chapitres / 89 sections / 837 propositions),
**160 décisions** sur pièces, un design system mesuré, **99 tests verts**, 5 labos de plateforme, un
prototype déployé et audité. **Ce qui n'existe pas, c'est l'app** : ni `src/`, ni `wrangler.jsonc`
racine, ni `astro.config.ts`, ni pipeline de build, ni `.github/workflows/ci.yml`. `package.json` n'a
**aucune dépendance de production** et ne contient ni `astro`, ni `wrangler`, ni `@cloudflare/*`.

Ce plan ne rouvre aucune décision. Il fait quatre choses que le dossier n'avait pas faites :

1. Il **ordonne** les chantiers par dépendance réelle, et nomme ce qui bloque quoi.
2. Il **chiffre les cinq chantiers que le prompt ne dimensionnait pas** (§16) — pipeline de build,
   squelette d'app, schémas, déploiement, production des 25 cartes-concept.
3. Il **corrige l'arithmétique des heures**, qui tient globalement mais pas dans la fenêtre v1.
4. Il **date les sept gestes de l'utilisateur en P0** sans en dépendre pour le reste.

Résultat attendu : une v1 publique le **mardi 10 novembre 2026**, à 0 € d'exploitation, sans compte,
sans LLM à l'exécution, dont chaque texte de programme affiché est un verbatim pointé par son
identifiant `c{N}-s{MM}-…`.

---

## 1. Ce que ce plan applique sans le redemander

Les huit arbitrages utilisateur **D13.1-D13.8** sont pris et intégrés : aucune route serveur ni D1
(D13.1) · identifiant seul dans l'URL, `corpus_version` dans le chemin de l'image (D13.2) · seul le
1200×630 pré-généré (D13.3) · `/defi/<n>/`, 60 tirages figés (D13.4) · pseudonyme unique « Baoleka »
(D13.5) · dépôt `baoleka/cestecritla` (D13.6) · Node 24 (D13.7) · `CLAUDE.md` à jour (D13.8).

### Les sept défauts du §19.3, appliqués

| # | Défaut appliqué | Se rejoue à |
|---|---|---|
| 1 | **Wordmark** : capitales **droites**, **sans bloc 3D**, Rouge conservé sur « LÀ » (2 des 3 attributs cassés) | Tâche 2 s du test humain, 2-5 nov. — seuil ≥ 4/5 « pas la même équipe » ; sous le seuil, on casse le Rouge |
| 2 | **v1 sans mascotte** : jauge purement typographique, `mascot.alt` reste au kit, inutilisée | v1.1, si quelqu'un dessine les états ≤ 4 Ko (≈ 3 h, H-DES-8) |
| 3 | **Easter egg lait-fraise non embarqué** ; `easter.strawberry_milk` reste au kit, jamais rendue | Jamais avant que H-DES-9 soit levée à la source |
| 4 | **Modèle autorisé à la rédaction hors ligne** des 25 cartes-concept, 0 €, 0 neuron, sous le pipeline 5 passes de `04-glossaire.md` §3 + les 17 tests + la relecture D0.27 | Chaque carte est bloquée par sa passe 2 : un rejet `blocking` la renvoie en `draft` |
| 5 | **Une balise par session** : verrou `aec.s.sent`, compteurs accumulés en `sessionStorage`, garde `event.persisted` pour la bfcache, **`RATE = 1,0` en v1** | Garde-fou horaire : > 3 000 req/h sur `/api/e` ⇒ `events_rate` à 0,02 par un `build:fast` |
| 6 | **Porte v3 acceptée** : une seule mécanique passe ⇒ on ne développe que celle-là (≈ 50 h) ; aucune ne passe ⇒ les 100 h vont au socle | Test humain du 2-5 nov., mesure de **S sans consigne** pour F1 et F2 |
| 7 | **`/k/<n>`, `/carte#<bitmap>`, `/j/<date>` réservées** avec un 404 designé (une page statique par préfixe, aucune logique) | v1.1 pour `/j/` ; jamais pour `/carte#` tant que « La carte des 89 » reste écartée |

> ✅ **Fait le 10/9/2026** : les sept défauts sont consignés en **D14.1 à D14.7**, et les cinq
> arbitrages de l'utilisateur en **D14.8 à D14.12**. `decisions.md` compte **172 lignes, D0-D14**.

### Les cinq arbitrages de l'utilisateur du 10 septembre 2026 (D14.8-D14.12)

| # | Arbitrage | Ce qu'il change dans ce plan |
|---|---|---|
| **D14.8** | **v1 tenue au 10 novembre en crunch** (≈ 26 h/sem.), **test humain joué par des personas** | Le jalon du 2-5 nov. cesse d'être bloquant. Les agents rejouent sur l'**app réelle** la moitié que Playwright mesure — cela reste VÉRIFIÉ ; ce qu'ils *disent* reste HYPOTHÈSE (personas) |
| **D14.9** | **Dépôt supprimé et recréé à plat** | L'historique public est perdu, les 32 commits compris. La recréation prend l'arbre courant comme premier commit : rien du contenu n'est perdu. **Avant `/mentions-legales` et avant le premier build public** |
| **D14.10** | **Si l'exposition devient intenable, l'app est retirée** — l'identité n'est jamais publiée. ⛔ **Renverse D9.18** | **Fiche 9 du runbook à réécrire.** Les trois seuils restent des déclencheurs de décision ; ce qu'ils ouvrent est le retrait. Le corpus et le dépôt survivent, seul le site tombe |
| **D14.11** | **Les quatre portes de jugement restent, non levées, publiées sur `/exactitude`** | La v1 sort en assumant publiquement ce qui n'a pas été vérifié par des personnes. Les 50 lignes H-PER-* restent ouvertes. **Nouvelle section obligatoire sur `/exactitude`** |
| **D14.12** | **Aucun message 0 à LFI** | **R3 monte** : le premier contact reste J+14, après la mise en ligne. Le rebrand light devient la seule réponse préparée, donc **`design/tokens.neutral.json` passe de « à produire un jour » à prérequis de lancement** (H-PLA-23) |

### Les deux biais, écrits honnêtement

- **(a)** Les sept défauts ci-dessus sont des **replis documentés, pas des choix validés par
  l'utilisateur**. Chacun est cité depuis une pièce du dossier et rattaché au jalon où il se rejoue.
- **(b)** Les huit arbitrages D13.1-D13.8 sont arrivés **par message le 10/9/2026**, ils n'ont pas été
  déduits du dossier. Ils sont consignés dans `decisions.md` : une session qui ne les recevrait pas les
  y lirait.

---

## 2. Arithmétique des heures

**Périmètre.** 552 h (somme réelle du tableau §16) + **40 h d'entre-deux-tours** (19-29 avril 2027,
dans l'horizon du plan et porteuses de travail réel) + **17 h de P0** (absent de tous les tableaux du
dossier) = **609 h**, sur **33 semaines** (14/9/2026 → 2/5/2027), contre **660 h de plancher** à
20 h/semaine (D0.26). Les 20 h de clôture de session (10-11 sept.) **ne sont pas réintégrées** : elles
sont en train d'être dépensées, c'est la session qui produit ce plan.

**Deux blocs sont sous-dimensionnés, et le dossier le dit lui-même sans en tirer les heures :**

| Bloc | §16 | Recompté ici | Écart | Ce qui manquait |
|---|---|---|---|---|
| **Socle** (14-27 sept.) | 40 h | **65 h** | **+25 h** | Le pipeline de build est « le chemin critique » (H-PLA-18) et n'est sorti d'aucune ligne ; le squelette d'app est « entièrement absent et non priorisé » (§16 chantier 2) ; six des huit portes de CI sont **à écrire** |
| **Recherche, cartes, riposte** (19 oct.-1er nov.) | 40 h | **52 h** | **+12 h** | Le pipeline 5 passes des cartes-concept « n'est scripté nulle part » (§16 chantier 5) ; la relecture de 25 cartes vaut ≈ 8 h 20 d'utilisateur au modèle `04-glossaire.md` §7.2 |

**Conséquence, en une ligne : la marge globale passe de 51 h (7,7 %) à 14 h (2,1 %) — et la totalité du
dépassement tombe dans la fenêtre v1 de 8 semaines.**

| | Total | Marge sur 660 h | Fenêtre v1 (8 sem.) | h/semaine en v1 |
|---|---|---|---|---|
| Tel qu'écrit au §16 | 609 h | 51 h (7,7 %) | 172 h | 21,5 |
| **Recompté ici** | **646 h** | **14 h (2,1 %)** | **209 h** | **26,1** |

✅ **Tranché (D14.8) : option A, le 10 novembre est tenu en crunch.** Les deux issues restent écrites
parce que le point de bascule du 27 septembre garde son sens.

| | Charge | Date v1 | Ce que ça coûte |
|---|---|---|---|
| **Option A — tenir le 10 novembre** *(retenue, D14.8)* | ≈ 26 h/sem. sur 8 semaines | **mar. 10 nov. 2026** | D0.26 dit « > 20 h », donc c'est faisable ; les 25 semaines suivantes retombent à **16,8 h/semaine** (420 h). L'effort est borné et il tombe **avant** le pic |
| Option B — tenir 20 h/semaine | 20 h/sem. sur 10,5 semaines | mar. 24 nov. 2026 | Le coût n'est pas la date : le test humain glisse au 16-19 nov. et **la fenêtre de mesure de N à J+30 déborde sur les fêtes**, où les militants ne sont pas joignables. Les jalons 2027 ne bougent pas (ils sont légaux) : la marge se reprend sur les 100 h d'exploitation de mars |

**Point de bascule, écrit d'avance** : si le socle n'est pas vert le **dimanche 27 septembre**, passer
en option B **immédiatement**, sans compresser « Lecture et partage ». C'est là que vivent les ≈ 970
cartes et les aperçus de partage, et la preuve D4.4 est déjà invalide (les 8 aperçus ont été servis par
le spike sous la marque morte « AEC Discover »).

---

## 3. Le chemin critique — qui bloque quoi

```
P0 hygiène du dépôt ─┬──> porte de CI « dépôt »  (ROUGE si écrite avant, voir 3 ci-dessous)
                     ├──> /mentions-legales
                     └──> premier build public

Node 24 local ──────────> les trois portes rejouées ──────────> tout le reste

squelette d'app ────────> PIPELINE DE BUILD ───┬──> projection slim.json
(wrangler.jsonc,         (chemin critique,      │    · 5 measure_split FUSIONNÉS
 astro.config.ts,         H-PLA-18)             │    · scope_id posé
 src/, _headers,                                │    · /r/<id> → /r/<theme> tranché
 flags.json)                                    │    · champs *_note_fr strippés
                                                ├──> index MiniSearch sérialisé ──> recherche, v2
                                                ├──> ≈ 970 cartes OG ────────────> partage, /diag
                                                ├──> pages de partage ───────────> aperçus WhatsApp
                                                ├──> pools de jeu (version+graine) ──> v3
                                                └──> exactitude.html
```

**Quatre blocages à énoncer, parce qu'ils coûtent un rebuild complet s'ils arrivent tard :**

1. **La fusion des 5 `measure_split` et la pose de `scope_id` se font dans la projection, AVANT la
   génération des ≈ 970 cartes** (H-COR-10, priorité 1). Cinq propositions ont aujourd'hui un texte
   canonique coupé en plein milieu — `c7-s08-m02` perd « hiérarchique du préfet », donc le contrôle de
   l'État sur la police municipale ; `c10-s03-k01`, **déjà citée par `faq-29`**, s'arrête sur
   « (1 216 euros pour une ». Chacune recevra une URL publique et une carte de partage.
2. **La divergence `/r/<id>` → `/r/<theme>` se tranche avant les cartes** (H-PAR-10), même raison.
3. **La porte de CI « dépôt » ne peut pas être écrite sur le motif brut.** À HEAD, `/home/<user>`
   apparaît dans **6 fichiers suivis** et `<nom-editeur>` dans **4** — tous des documents de
   conformité **qui citent le motif pour décrire la porte**. Une purge ne les enlèverait pas : elle
   effacerait la description de la porte. La réponse est la **liste blanche de chemins
   `docs/discovery/**`** dans la porte elle-même, avec les motifs justes :
   `/home/[A-Za-z0-9._-]+/` (jamais `/home/`, qui est une route de l'app),
   `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}` avec liste blanche `{contactEmail}` et
   `users.noreply`, et le nom réel.
4. **`cestecritla.fr` est déjà pris par le Worker `aec-spike-share`** (`prototypes/spike-share/wrangler.jsonc`,
   `routes` en custom domain sur `cestecritla.fr` **et** `www.cestecritla.fr`). Le déploiement de l'app
   doit **reprendre ou libérer ce custom domain** : ce n'est pas une découverte à faire le jour du
   premier `wrangler deploy`.

---

## 4. P0 — hygiène du dépôt et gestes de l'utilisateur (ven. 11 → dim. 13 sept. 2026)

**≈ 17 h dont ≈ 8 h d'utilisateur.** Ce bloc **ne conditionne que trois livrables** :
`/mentions-legales`, la purge du dépôt, le premier build public. **Aucun autre jalon n'en dépend** —
si P0 glisse, le socle démarre quand même le 14 septembre.

| # | Tâche | Critère de done chiffré | h |
|---|---|---|---|
| P0.0 | **Node 24 local** + rejeu des trois portes | `node -v` ≥ 24 (**la machine tourne aujourd'hui sous v20.20.1** alors que `package.json` déclare `>=24` et que la CI installe 24 : rien n'a jamais été exécuté sous 24) ; aligner `@types/node` de `^20.19.43` sur `^24` ; puis `npx tsc --noEmit` 0 erreur, `npx tsx --test scripts/*.test.ts` **99/99**, `npx tsx scripts/contrast.ts` code 0 / 105 paires / **28 paires de rôles, 0 échec**. **Si un chiffre bouge, le dépôt sous 24 fait foi** | 1 |
| P0.1 | **Hygiène du dépôt** — ✅ *méthode tranchée (D14.9) : dépôt recréé à plat* | **⚠️ La purge Désintox est DÉJÀ FAITE (D13.9) et vérifiée localement** : `16c7d82` ne résout plus, `git log --all -p -- data/desintox.json \| grep -c content_text` = **0**, un seul commit touche encore ce fichier. **Ne la replanifie pas.** Ce qui reste : (a) **re-mesurer** `git log --all -p \| grep -ciE '<nom-editeur>\|/home/<user>'` — le chiffre du prompt (467) est périmé, il vaut **250** au 10/9 — et décider, **avec l'utilisateur**, si le résidu justifie de recréer le dépôt à plat, sachant qu'une purge n'enlèverait pas les occurrences de HEAD, qui **décrivent la porte** ; (b) **sortir les 7 captures d'identité et les 5 fichiers HTML** porteurs de l'adresse tierce (H-LAN-14, priorité 1), poser `captures-tiers.manifest.json` de SHA-256 à la place, + test de CI qui rejette tout PNG tiers dans l'index ; (c) **le résidu GitHub de D13.9** (ancien objet servi par empreinte exacte) est **accepté et consigné**, non mesurable hors réseau | 5 |
| P0.2 | **Lire et archiver les deux textes de la charte LFI** (« principes de la France insoumise », « Charte des groupes d'action ») | 2 captures horodatées + 1 ligne de `decisions.md`. Ouvrir `design/identity-decision.md` §5 clause par clause : chaque clause devient un **feu vert VÉRIFIÉ** ou une **entrée de BAN LIST**. **Si une clause interdit ce que fait l'app, D3.1 se rouvre avant tout build** — c'est-à-dire toute l'identité visuelle (H-LAN-15) | 2 |
| P0.3 | **Trois lectures à la source** : guide CNIL communication politique (nov. 2025) ; LCEN art. 6-IV + décret n° 2007-1527 ; règlement (UE) 2024/900 **art. 2, art. 3 pt 2, art. 27 seulement**, dans le **PDF du JO** (EUR-Lex a renvoyé un texte tronqué 3 fois) | 3 captures + 1 ligne de `decisions.md` chacune. **`legal.notice.reply_delay` ne se crée qu'après** : écrire un délai qu'on n'a pas lu est ce que §18.12 interdit | 4 |
| P0.4 | **RGPD art. 13(1)(a)** : pseudonyme + adresse de contact identifient-ils le responsable ? — *décision utilisateur* | 1 ligne de `decisions.md`, **après** la lecture du guide CNIL. Seul point du dossier où l'anonymat LCEN art. 1-1 II et le RGPD peuvent se contredire (H-CNF-20). Ne change qu'**une ligne** de `/confidentialite` et `/mentions-legales`, tous deux au jalon du 6-9 nov. | 1 |
| P0.5 | **LCEN art. 1-1 II** : compléter le profil Cloudflare + envoyer la déclaration d'identification | Envoi **et** accusé archivés dans `captures/<date>/lcen/`. `legal.notice.editor_identity` n'est rendue **que** si la pièce existe (H-CNF-1) | 0,5 |
| P0.6 | ✅ **Tranché (D14.10) : l'app est retirée, l'identité n'est jamais publiée** — reste à réécrire la fiche 9 du runbook | **Fiche 9 du runbook** réécrite : déclencheurs (> 50 000 visiteurs sur 7 j, mise en demeure, article de presse nationale), geste (retrait du site), ce qui survit (corpus, dépôt, données). L'association reste interdite jusqu'au 2/5/2027 | 1 |
| P0.7 | ✅ **Tranché (D14.12) : le message 0 n'est pas envoyé** — reste à produire `design/tokens.neutral.json`, devenu prérequis de lancement | Aucun contact avant le lancement. Le texte de `12-positionnement-lancement.md` §9.6 est conservé comme pièce. **Conséquence à porter** : le rebrand light est la seule réponse préparée à un désaveu, donc `design/tokens.neutral.json` (tokens neutres + wordmark propre, ≈ 4 h) entre dans le périmètre v1 | 4 |
| P0.8 | **Exploitation** : créer `contact@cestecritla.fr` (Email Routing) + cadence de relève ; **audit de zone réglage par réglage** | Envoi test reçu et archivé ; relève **quotidienne à partir de J-3** (fiche 11 du runbook). **7 captures datées** : Bot Fight Mode **OFF** (VÉRIFIÉ : la version gratuite ne tourne pas sur le Ruleset Engine — ni Skip WAF ni Page Rule ne la contournent ; seul Super BFM, payant, l'accepte), Security Level, Browser Integrity Check, Hotlink Protection, Always Online, NEL, **dashboard Billing sans moyen de paiement** | 2,5 |

---

## 5. Lot 1 — Socle (lun. 14 sept. → dim. 27 sept.) — **65 h**

> **Jalon : dim. 27 sept.** — `cestecritla.fr` sert une page de section réelle depuis
> `d29c7422004ab27c` ; CI verte ; Lighthouse Accessibilité ≥ 95 sur une section.

| # | Tâche | Critère de done chiffré | h |
|---|---|---|---|
| 1.1 | **Squelette d'app** *(chantier §16 n° 2)* | `wrangler.jsonc`, `astro.config.ts`, `src/pages\|components\|islands\|styles/`, `src/worker/index.ts`, `public/_headers`, `public/flags.json`. **⚠️ Ne pas recopier D7.1** : sa liste de bindings (AI, D1, DO, RATE_LIMITER, KV FLAGS) est **périmée par D13.1 + D6.10 sans être barrée dans `decisions.md`**. Le fichier réel ne garde que : `name`, `main`, `compatibility_date`, `compatibility_flags`, `routes` (custom domains), `workers_dev: false`, `preview_urls: false`, `assets` avec `run_worker_first: ["/api/*"]`, `analytics_engine_datasets`, `observability.enabled: false`, `minify`, `upload_source_maps: false`, `keep_vars: false`. **Sept blocs sortent** : `ai`, `d1_databases`+`migrations_dir`, `durable_objects`+`migrations`, `ratelimits`, `kv_namespaces`, `triggers.crons`, et les `vars` `AI_*`/`TURNSTILE_*`/`BUDGET_*`/`Q_CACHE_TTL_DAYS`. Vérifié par `wrangler types --check` + `wrangler check startup` (< 1 s). **Consigner D14.1-D14.14** (§1) | 8 |
| 1.2 | **Pipeline de build** *(chantier §16 n° 1 — CHEMIN CRITIQUE)* | `npm run build` orchestrant les 9 étapes du §18.7 ; `npm run build:fast` (ni cartes OG ni pages de partage) ; contrat d'entrée/sortie écrit entre chaque étape ; nommage versionné `slim.<hash>.json`. **Build à froid reproductible, durée chronométrée et écrite** dans `09-architecture.md` §9 + fiche 2 du runbook — le runbook annonce « ≈ 1-2 min », jamais mesuré. ⚠️ **Poste le plus incertain du plan** : H-PLA-18 chiffre « ≈ 3 jours » sans dire à quel rythme — 12 h à 4 h/jour, 24 h à 8 h/jour. Retenu : **14 h**, à réviser au premier jour de travail | 14 |
| 1.3 | **Projection `slim.json`** — promue depuis `prototypes/spike-share/scripts/build-data.ts` *(chantier §16 n° 3)* | **Les 5 `measure_split` FUSIONNÉS** (id du fragment conservé en alias de redirection) ; **`scope_id` posé** entre un `heading_paragraph` et le suivant ; **champs internes de `riposte.json` strippés** (`desintox_title`, `desintox_note_fr`, `reversal_note_fr`, `revision_note_fr`, `stat_card_note_fr`, `title_note_fr`) — `rip-11` porte `desintox_title` = « Vous êtes la France islamiste » **et** la note expliquant qu'il n'est jamais affiché : les servir ensemble dans un JSON public est la capture la plus économique du dossier. **Test de build bloquant** : aucun texte servi comme « Texte du programme » ne se termine sans ponctuation forte, ni sur une conjonction, une préposition ou une parenthèse ouverte. Cible mesurée : `slim.json` **69 166 o gzip** (≤ 80 Ko) | 6 |
| 1.4 | **Table des routes** (D5.10, amendée par D7.9 et D13.4) | `/m/<id>` `/s/<section>` `/c/<slug>` `/mot/<terme>` `/a/<id>` `/r/<theme>` `/q/<section>` `/defi/<n>/` `/exactitude` `/methodologie` `/confidentialite` `/verifier` `/api/e` + **`/a-propos`, `/mentions-legales`, `/licence`, qui ne sont dans aucune décision** et sont pourtant exigées par D9.4/D9.14/D2.4. `/k/`, `/carte#`, `/j/` en **404 designé** (défaut §19.3 n° 7). **Aucune collision** (`07-mecaniques.md` §7.11 pt 9) | 5 |
| 1.5 | **Lecteur de section `/s/`** — la surface qui prouve le socle | `SectionVerbatim` (Gowun Batang 17-18 px, filet Violet, fond #FDEDFF, étiquette « Texte du programme », **jamais d'italique**), étiquette `scope_id` au-dessus du verbatim. **Test de rendu obligatoire sur `c1-s02-m02` et `c1-s02-m03`** : une mesure conditionnée à l'Assemblée constituante ne s'affiche jamais avec le même statut qu'une abrogation immédiate. **PAS de `rel=canonical`** (retiré : un canonical inter-domaines déclare, de façon lisible par machine, que la page de l'app est la page officielle) — à la place, lien visible « Lire sur melenchon2027.fr » (`common.open_official`) + JSON-LD `isBasedOn`/`citation` | 8 |
| 1.6 | **CI — les 8 portes, à 0 neuron** | `.github/workflows/ci.yml`, Node 24, `npm ci`. **Aujourd'hui `.github/workflows/` ne contient que `recrawl.yml` : aucune porte n'existe sur les PR.** Portes 1-4 réutilisent l'existant ; **6 sont à écrire** : (a) « pas de mention IA sans IA » **formulée sur le CONTENU** — échec si une chaîne rendue satisfait `/\bIA\b\|intelligence artificielle\|Mistral\|assistant/i` alors que `AI_MODE === 'off'` ou que le binding `AI` est absent, **exemptions nommées `about.no_ai` et `about.writing_method`** (le motif « clé `chat.*` ou `*.ai_*` » ratait 5 chaînes sur 11, dont `offline.chat` et `silence.chat` : une app sans IA en annonçait une **hors ligne** et pendant les deux fenêtres L49) ; (b) licence, périmètre **élargi à `captures/…_programme2025_livre.{html,txt}`** ; (c) dépôt, **avec la liste blanche `docs/discovery/**`** (§3 pt 3) ; (d) ban list ; (e) taille du bundle et du Worker ; (f) snapshots des cartes OG. **Porte de taille du corpus : nommer l'outil — `zlib` niveau 9 = 142 345 o**, jamais `gzip -9`, qui rend 145 441 | 10 |
| 1.7 | **Porte d'accessibilité** *(elle n'existait nulle part — ni ici, ni au §16)* | `@axe-core/playwright` **0 violation serious/critical** ; **Lighthouse a11y ≥ 95 à CHAQUE PR** (et pas seulement au jalon du socle) ; reflow **320 px** ; police système **130 % ET 150 %** (le débordement apparaît **dès 130 %**) ; `emulateMedia` reduced-motion + dark ; parcours clavier Tab/Maj-Tab/Entrée/Échap/flèches ; **contraste de la page rendue** (chaque nœud contre son fond effectif, à sa taille et sa graisse réelles). **Trois scripts qui font déjà ce travail dorment dans le dépôt et sont à PROMOUVOIR dans `scripts/`, pas à réécrire** : `prototypes/mockups/finalistes/capture.mjs`, `prototypes/mockups/B/tools/contrast-check.mjs`, `docs/discovery/captures/2026-09-10/proto/integ-live.mjs` | 5 |
| 1.8 | **`_headers` CSP + cache** | `default-src 'none'; script-src 'self'; style-src 'self' 'sha256-…'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'; upgrade-insecure-requests`. **`/sw.js` et `/flags.json` en `Cache-Control: no-cache`**, jamais `immutable`, jamais `stale-while-revalidate`. `immutable` sur `/_astro/*`, `/fonts/*`, `/data/*.<hash>.*`, `/og/*` ; `max-age=300` sur les HTML. Sur `/api/*` : `no-store`, `nosniff`, `X-Robots-Tag: noindex`, `Referrer-Policy: no-referrer`, pas de CORS, `Origin` vérifié. Repli documenté `style-src 'self' 'unsafe-inline'` si `experimental.csp` d'Astro ≥ 5.9 ne rend pas les hachages (H-PLA-15) | 3 |
| 1.9 | **P8 — sous-ensemblage des polices** *(échec éliminatoire mesuré)* | **99 744 o livrés aujourd'hui, 82,2 Ko/page (99,7 sur `/section/`), contre 75 Ko autorisés**. Cause unique : `PublicSans-Italic-Variable-latin.woff2` = **31 116 o**, l'italique **variable entière**, au lieu d'un sous-ensemble sur l'axe 900 ≤ 15 Ko. `pyftsubset`, puis **re-mesure des octets livrés par page**. Vérifier sur Android **et** iOS réels le défaut de crénage documenté après sous-ensemblage (« of ficiel », « EXT RAIT », « T EXT E ») | 2 |
| 1.10 | **`scripts/watch-aec2027.ts`** | 1 requête `HEAD`/jour depuis le cron qui fait déjà le re-crawl, *issue* GitHub si un des 5 signaux change. Références embarquées : `Last-Modified: Tue, 01 Sep 2026 15:03:34 GMT`, ETag `"1c3f-65a6d38f87fa5"` | 1 |
| 1.11 | **Déploiement** *(chantier §16 n° 4)* | **`wrangler deploy` manuel depuis la machine**, jamais GitHub Actions : un `CLOUDFLARE_API_TOKEN` dans un dépôt public est exclu. Séquence : `npm ci` → `npm run build` → `npx tsc --noEmit` → `npx tsx --test scripts/*.test.ts` → `wrangler check startup` → `wrangler deploy`. **Reprendre ou libérer le custom domain `cestecritla.fr` détenu par `aec-spike-share`** (§3 pt 4). Vérifier `workers_dev: false`, `observability.enabled: false` (le spike a les logs **activés**, l'app doit les couper — D0.22), et que seul le `.fr` répond | 3 |

**Ce qui bloque quoi** : 1.1 → 1.2 → 1.3 → (1.4, 1.5) **et tout le lot 2** · P0.1 → porte (c) de 1.6 ·
1.9, 1.10 indépendants, faisables en attente.

---

## 6. Lot 2 — Lecture et partage (lun. 28 sept. → dim. 18 oct.) — **60 h**

> **Jalon : dim. 18 oct.** — les 89 sections et les 837 propositions ont chacune leur URL ; les 8 liens
> du protocole `06-partage.md` §5 renvoient un aperçu correct sur WhatsApp, Telegram et Instagram
> depuis Android **et** iPhone.

| # | Tâche | Critère de done chiffré | h |
|---|---|---|---|
| 2.1 | **Écrans `/m/` `/s/` `/c/` `/a/`** + les 5 types d'anomalies de source | `measure_split` fusionnés (rendus) · `statistic_as_paragraph` (6) en cartes statistiques · `heading_paragraph` (2) en `scope_id` · `prose_after_measures` (2) **en fin de section, jamais en chapeau** · **aucune coquille corrigée** (D1.8). Sur `/m/`, le bouton primaire partage **cette** mesure, jamais la mesure clé de la section (correction 18). Carte-concept en anatomie « dense corrigée » : « En clair » en tête sans tap, **jamais le mot « IA »**, badge « **Rédigé par nous, relu par Baoleka** » — **aucun placeholder `{reviewer}`**, que `check-strings.test.ts` rejette | 14 |
| 2.2 | **Écran 0 par lien** — le cas majoritaire | Un seul CTA dans les **600 premiers px CSS**, ≥ 44 px · `independence.unofficial` « Site non officiel. » **accolée au wordmark**, pas au pied · ligne d'indépendance visible sans défiler et **au-dessus du CTA** · impersonnel (D3.12). **Variante sans carte-concept, jamais spécifiée jusqu'ici et pourtant majoritaire** — les 5 cartes actuelles ne couvrent que **15 sections sur 89** : geste principal = **« Lire la section »**, **pas de CTA « Comprendre en clair »**, **jamais de lien vers `concept.unknown`**. Test de build : un `/link/` de mesure non couverte ne rend pas le CTA concept | 8 |
| 2.3 | **`scripts/build-cards.ts`** — promu de `prototypes/spike-share/src/cards/*`, **incrémental** | Empreinte par carte = id + `corpus_version` + version de charte. **≈ 970 PNG 1200×630** (≈ 60 Mo) sous `/og/<corpus_version>/…` en `Cache-Control: immutable` (D13.2) ; **≈ 2 600 fichiers au total** sur les 20 000 — *ce sont deux nombres différents que D13.3 mélange dans sa colonne Impact*. **Les 48 chiffres ne reçoivent PAS de carte OG** (la ban list interdit toute carte statistique sur une image ; 33 des 47 cartes datées sont de 2021 = drapeau D0.32) ; les `/a/<id>` restent des **pages**, avec une image générique. PNG < 300 Ko (mesuré 43-132 Ko). **Corriger la marque morte** : `og:site_name` = « C'est écrit là », wordmark, `og:title` = `{titre} — C'est écrit là`, **0 occurrence de « AEC Discover »** | 12 |
| 2.4 | **Bande de signature — non optionnelle** | **Deux lignes sur TOUTE carte** : `attribution.card` puis `attribution.card_maker` (« Carte : C'est écrit là, projet militant indépendant. Site non officiel. »). Aujourd'hui le code produit une carte à titre officiel, texte officiel, couleurs officielles, attribution « La France insoumise » et **zéro mot d'indépendance** — et c'est ce spike qui sert `cestecritla.fr` depuis le 9/9. `lang="fr"` sur les SVG/OG (3.1.1) ; `alt` sur toute image (le **niveau C repose sur un PNG affiché en `<img>`**, c'est l'image la plus vue de l'app) | 4 |
| 2.5 | **Kit de partage, 3 niveaux** | A = `navigator.share({files})` · B = texte + URL · C = **copier le lien + PNG en `<img>` (appui long) + `wa.me`/`t.me`**. **L'app est complète sans Web Share ni service worker** (S1). Carré 1080×1080 et story 1080×1920 **dessinés dans le navigateur** (Canvas 2D), **même code de carte que le build**, **jamais sur le Worker** (D13.3) — H-PAR-6 devient une **exigence de test** : qualité équivalente sur un Android moyen. Zone sûre 250 px haut et bas en 1080×1920. Suffixe `?s=wa\|tg\|ig\|qr\|copy`, aucun UTM, aucun jeton | 10 |
| 2.6 | **`/diag` + rejeu du protocole des 8 aperçus** | La preuve D4.4 est **invalide** : les 8 aperçus ont été servis par le spike sous « AEC Discover ». Rejouer sur le build réel, **grille à 10 colonnes remplie** (dont « image entière / rognée, quel bord / carré recadré », qui tranche la coupe 53/47), `/diag` relevé — ce qui n'a **jamais** été fait (H-PAR-1). 3 messageries × 2 OS. **D4.3/D4.4 passent de DÉCLARÉ à VÉRIFIÉ, ou tombent** | 6 |
| 2.7 | **`data/stat-cards-legal.json`** (sidecar 77-808) | H-COR-9 : **aucune carte statistique dans une riposte sans son sidecar**. `stat-cards.json` ne porte que `legal_77_808` (institut 47/48, date 47/48, **commanditaire 3/48, média de première diffusion 0/48**) ; `statcard.legal.missing` dit ce que la source ne donne pas. C'est un **choix de prudence, pas une obligation** (constat C2 : aucun article n'impose de mentions à une republication) — l'écrire évite de se créer une obligation intenable. Un exemplaire de prototype existe : `prototypes/proto/shared/data/stat-cards-legal.json` | 2 |
| 2.8 | **Corrections 1, 6, 10, 11, 12, 18, 19** de `13-tests-humains.md` §3.11 | Cibles ≥ 44 px (aujourd'hui **16 à 34 px** : « Envoyer » 26, « Y aller » 30, « Passer » et « Lire la section » 34, liens du pied **16**) · barre de navigation qui tient à **130 % ET 150 %** (`scrollWidth` 404-464 px pour un viewport de 390) · textes ≥ 12 px · `hyphens: auto` + `lang` + insécables · `overflow-wrap: anywhere` · aucune hauteur fixe sur un bloc de texte (1.4.12) · focus `outline: 3px solid var(--focus)` + `outline-offset: 2px` + `scroll-padding` · un seul `<h1>`, un `<main>`, un `<nav>` | 4 |

**P1 et P4 se règlent ici, par construction** : le texte de l'écran 0 (verbatim + titre + CTA) est
**pré-rendu dans le HTML** ; le corpus est découpé par section et chargé après `load` ; `tokens.css` +
`base.css` sont inlinés (7 Ko gzip, FCP 1,58 s → ≈ 0,9 s) ; **hauteur réservée sur tout conteneur
injecté**. Aujourd'hui : LCP **3 060 ms** sur `/link/`, **4 635 ms** sur `/concept/` (4 à 6 sauts sur
le chemin du LCP) ; CLS **0,216 / 0,180 / 0,246 / 0,110**, dont ≤ 0,002 imputable aux polices. Le labo
`framework` donne la cible : **Astro inline-css, LCP 935 ms, JS initial 1 517 o**.

**Mesure terrain, à ne pas sauter** : LCP/INP/CLS sur un **vrai Android milieu de gamme en 4G réelle**
(Wi-Fi coupé, **5 chargements à froid, médiane**, `adb forward` + Lighthouse
`--throttling-method=provided`). C'est **la** mesure qui tranche P1 ; elle n'a jamais été faite.

**Piège à vérifier ici** : la **View Transition cross-document bloque la saisie 200 ms** (VÉRIFIÉ sur
Chromium 153, **même avec `pointer-events: none` sur tout l'arbre `::view-transition`**) — 200 ms de
taps morts à chaque arrivée concept → section, **invisible en labo**. Rejouer
`prototypes/proto/tools/vt-probe.mjs` sur un Android réel ; la règle de retrait tient en deux attributs.

---

## 7. Lot 3 — Recherche, cartes-concept, riposte (lun. 19 oct. → dim. 1er nov.) — **52 h**

> **Jalon : dim. 1er nov.** — rappel@5 ≥ 0,80 et hit@5 ≥ 0,95 rejoués par la CI ; les cartes-concept
> publiées à zéro affirmation non couverte ; « aide-soignante » trouve « aides-soignants ».

| # | Tâche | Critère de done chiffré | h |
|---|---|---|---|
| 3.1 | **Recherche locale MiniSearch, variante `A-synonymes-0.25`** | La configuration à figer est **`A-synonymes-0.25`** : `rappel@5 0,813`, `hit@5 0,986`, `rappel@10 0,876`, `MRR 0,819` (`eval/retrieval-results.md` l. 46) — **pas `A-spec`** (0,798 / 0,957 / 0,869 / 0,820, l. 42), que le prompt confondait. Index **59,7 Ko gzip**, 0,82 ms médian / 3,29 ms p95. **Synonymes = alias glossaire + FAQ en expansion de requête à poids 0,25** : sans eux, rappel@5 tombe à 0,77. **Le seuil rappel@5 ≥ 0,9 n'est pas atteint et ne le sera pas par un autre moteur** — le levier mesuré est le fichier d'alias. Unité = proposition + préfixe non affiché (chapitre / section / première phrase du chapeau) **+ `scope_id`**, `measure_split` fusionnés | 8 |
| 3.2 | **INP — index hors du thread principal** (H-PLA-7) | L'indexation coûte **200-224 ms à CPU ×4 sur le thread principal**, ce qui viole « aucune tâche > 50 ms ». Correction : **index sérialisé au build (`MiniSearch.loadJSON`)** ou Web Worker, plus prefetch de la projection après `load`. Re-mesure event timing à CPU ×4 : **0 tâche > 50 ms** | 4 |
| 3.3 | **Tolérance FR** (correction 13) | Trait d'union, pluriel, féminin — « aide-soignante » → « aides-soignants », « mégabassines » → « méga-bassines » — **avant** « Rien trouvé avec ces mots ». Message qui **n'accuse jamais la personne**. Même normalisation que `retrieval-core.ts` (48 302 tokens vérifiés identiques) | 4 |
| 3.4 | **Scripter le pipeline 5 passes** *(chantier §16 n° 5 — aucun de ces scripts n'existe ; seul `glossary.test.ts` est là)* | `scripts/glossary-pipeline/` : rédacteur → vérificateur adversarial → éditeur FALC → 2 juges → assemblage (sans IA). **Modèle hors ligne autorisé, 0 €, 0 neuron** (défaut §19.3 n° 4 ; les 5 cartes livrées ont été produites exactement ainsi, `about.writing_method` **publie** ce fait). Règle d'arrêt : un rejet `blocking` renvoie la carte en `draft`. Générer la **liste courte « à trancher » par carte** — les `notes_for_reviewer` font **855 mots en moyenne**, personne ne lira cela (méthode de levée de H-LAN-2) | 10 |
| 3.5 | **Produire les 25 cartes-concept** (liste D2.6, `04-glossaire.md` §9) | Zéro affirmation non couverte par un verbatim ; toute phrase étiquetée `verbatim`/`reformule`/`contexte-2022` ; `one_liner ≤ 40 mots`, `why_it_matters ≤ 80 mots`, phrases ≤ 15 mots ; **jamais le mot « IA »**. `glossary.test.ts` **17/17** | 8 |
| 3.6 | **Relecture D0.27** — ⚠️ **le poste que le dossier sait sous-dimensionné** | Modèle `04-glossaire.md` §7.2 pour 25 cartes : utilisateur ≈ **8 h 20**, militants ≈ **8 h**, non-politisé ≈ **2 h**. **H-LAN-2 conclut que « la relecture ne tient pas »**, et son statut est HYPOTHÈSE : *aucun relecteur n'a jamais été chronométré*. **Porte, qui est la méthode de levée prescrite : chronométrer les 3 premières cartes réellement relues**, remplacer les minutes du modèle par les valeurs mesurées, puis décider d'engager ou non les 22 suivantes. **La cible « 30 cartes » est un résultat, pas une décision** — D2.6 est explicitement « DÉCISION (liste) / **HYPOTHÈSE (résultat)** » | 8 |
| 3.7 | **Riposte `/r/<theme>`** — spécification complète dans `10-riposte.md` (§3 données, §5 écrans, §6 coût), **que le prompt ne citait nulle part** | Verbatim d'abord, liant étiqueté ensuite, lien Désintox pour fermer · « Envoyer cette réponse » sous la mesure clé · « Le chiffre » **replié** quand la vague est antérieure à 2024 · mode marché à gros boutons par thème · flashcards avec `<h1>` · **aucune carte statistique sur une image**. Les 15 `reversal_note_fr` (« Ce qu'il vaut mieux ne pas dire ») **derrière un geste explicite**, jamais sur un écran atteint par un lien nu ni sur une carte de partage. QR au build. `riposte.test.ts` **13/13**. **Divergence `/r/<id>` → `/r/<theme>` supprimée AVANT la génération des cartes** | 8 |
| 3.8 | **Corrections 3, 7, 8, 13, 14, 17** | Texte français en dur dans le `catch`, **jamais une clé brute affichée** · aucun vocabulaire de campagne (« munition », « riposte ») sur un écran atteint par un lien · infobulles de glossaire = **panneaux cliquables, jamais un `title`** · « Explorer le programme » → table des matières | 2 |

**Métrique de couverture à publier sur `/exactitude`, calculée et jamais estimée** (§10 pt 1) : part des
837 propositions dont la section porte au moins une carte-concept, et part des 89 sections couvertes.
Point de départ mesuré : **15 sections sur 89**, soit **74 sections sans carte**.

---

## 8. Lot 4 — Session personas sur l'app réelle (lun. 2 → jeu. 5 nov.) — **6 h · non bloquant**

> ⚠️ **Amendé par D14.8 et D14.11.** Le test humain est remplacé par une troisième session de
> personas-agents, et le jalon cesse d'être bloquant. **Ce que cela change, écrit sans l'atténuer :
> aucune personne réelle n'aura testé l'app avant sa mise en ligne publique.** Les sessions 1 et 2 ont
> été jouées par sept personas-agents (D11.1) qui connaissent le dossier et citent D0.32 et WCAG 2.5.8
> — ce qu'aucun testeur humain ne ferait. Ils convergent artificiellement, et **un rejet erroné ne se
> voit jamais : il n'y a pas d'écran pour le signaler**.

**Ce que la session apporte réellement, et c'est réel.** Tout ce que Playwright **mesure** sur l'app
livrée reste **VÉRIFIÉ** : temps de chargement, positions en px, cibles tactiles, débordements à 130 %
et 150 %, contenu de `localStorage` et `sessionStorage`, nombre de `POST /api/e` sur un parcours,
fidélité au corpus, comportement hors ligne. C'est la première fois que ces mesures sont prises sur
autre chose qu'un prototype — le prototype portait les trois échecs éliminatoires P1/P4/P8 et un kit
de chaînes divergent de 26 %.

**Ce qu'elle n'apporte pas, et qui est publié comme tel (D14.11).** Les quatre portes de jugement
restent **écrites, non levées**, et `/exactitude` porte une section nommée qui le dit :

**⚠️ Écart de comptage à corriger dans le calendrier** : le §16 et `12-positionnement-lancement.md`
§9.2 écrivent « les **8** points de §3.12 ». `13-tests-humains.md` §3.12 en porte **12** — les points 9
à 12 ont été ajoutés le 10/9 par le panel rouge T12, et **deux d'entre eux sont éliminatoires**.
**Le critère de done est sur 12, pas sur 8.** Commande :
`sed -n '/3\.12/,/3\.13/p' docs/discovery/13-tests-humains.md | grep -cE '^[0-9]+\. '`.

**Les trois seuils, conservés comme réserves écrites et non plus comme blocages :**

| Seuil | Mesure | Pourquoi |
|---|---|---|
| **≥ 4/5 dont ≥ 2 non-politisés répondent « pas officiel » sans avoir défilé** | Question ouverte « c'est officiel ou pas ? qui a fait ça ? » | Dans les 344 chaînes de la v0.3, « officiel » apparaissait **six fois** et « non officiel » **jamais**, pendant que le concurrent direct affiche « Outil citoyen non officiel » |
| **≥ 4/5 « pas la même équipe »** | Tâche de 2 s : les deux en-têtes côte à côte, « même équipe ou pas ? » | Le wordmark reprenait **trois attributs sur trois** de celui de la campagne (capitales italiques inclinées, ombre pleine décalée, dernier mot en Rouge, en haut à gauche). Sous le seuil, on casse le troisième (le Rouge) |
| **Zéro ligne rouge D0.32** | Grille « honteux à partager » | Ton potache, mèmes, emojis à outrance ; scores ou classements de personnes ; mascotte enfantine ou moche ; chiffres ou sondages périmés mis en avant |

Plus : **aha < 60 s chez ≥ 3 personnes** · réexplication en < 60 s par **≥ 2/3 non-politisés**.

**La mesure qui commandait 100 h de plan, et ce qu'on en fait.**
- **S sans consigne, pour F1 et F2** — seule cette mesure ouvrait le bloc v3 (D14.6). Elle ne sera pas
  faite par des humains : **la porte ne peut donc pas s'ouvrir, et le défaut s'applique — on ne garde
  que F2** (5 voix, aucun état, aucune table éditoriale), ≈ 50 h, et ≈ 50 h vont au glossaire, aux
  ripostes et à la perf. À confirmer au jalon du 19 janvier 2027. Le seul proxy mesuré donne
  **S ≈ 0,43** pour F1 (7/7 finissent les 5 cartes, **3/7 seulement ouvrent une section**) ; pour F2,
  « qui l'emprunte spontanément **n'a pas été compté** ».
- **H-LAN-13, par comptage et jamais par opinion** : « combien de fois tu l'as ouverte depuis ? et
  combien de liens tu as envoyés que personne ne t'a demandé d'envoyer ? », aux **mêmes personnes** au
  J+21 de la bêta puis 14 jours après le lancement. **Critère écrit AVANT la séance** : ≥ 3/5 l'ont
  ouverte ≥ 2 fois sans qu'on le leur demande, et ≥ 2 ont envoyé un lien de leur propre initiative.

**Deux tâches ajoutées au protocole** : (a) **deux arrivées par lien tirées au sort parmi les mesures
sans carte-concept ni riposte**, avec la même tâche de réexplication — toute la promesse « comprendre
en trois minutes » n'a été éprouvée que sur `link/?id=c12-s01-k01`, l'une des 15 sections couvertes ;
(b) le **comportement de substitution relevé AVANT toute démonstration** : « montre-moi, là,
maintenant, sur ton téléphone, ce que tu fais pour répondre à cette objection » — chrono, taps, outil.
C'est le seul étalon du gain réel de `/m/<id>` sur le lecteur officiel.

**Les 19 corrections bloquantes de §3.11 sont appliquées AVANT ce test** (lots 2 et 3), et **aucune
capture n'est montrée à un humain tant que la phrase testée n'est pas celle qui sera livrée** : le kit
du prototype a **42 clés divergentes sur 162** (26 %) et `{appName}` non résolu dans 3 chaînes, et la
dérive **augmente** tant que le fichier est maintenu à la main. D'où une tâche du lot 1.2 :
**régénérer `prototypes/proto/shared/data/strings.json` depuis `design/strings.json` au build**, plus
une porte de CI « toute clé présente dans les deux fichiers a la même valeur ».

---

## 9. Lot 5 — Correctifs et pages institutionnelles (ven. 6 → lun. 9 nov.) — **20 h**

| Page | Critère de done chiffré |
|---|---|
| `/mentions-legales` | **Ne pas publier avant P0.1 ET P0.5.** Hébergeur = Cloudflare, Inc., 101 Townsend Street, San Francisco (PROBABLE : Cloudflare écrit « might qualify »). `legal.notice.editor_identity` rendue **uniquement** si la pièce LCEN existe |
| `/confidentialite` | Chaque ligne vraie au vu de la carte des données (`09-architecture.md` §6). **Les lignes 2, 3 et 6 tombent** (chat vers Mistral, empreinte de question, Turnstile) ; la ligne 7 déclare le **transfert hors UE**. Le chapeau **ne compte plus ses lignes**. **Quatre lignes ajoutées SOUS les dix** (RGPD art. 13) : `privacy.controller`, `privacy.retention_host` (**durée réelle à lire chez Cloudflare**), `privacy.rights`, `privacy.cnil`. **On revendique expressément l'exemption CNIL de mesure d'audience** et on liste ses cinq conditions — « pas de traceur, donc pas de consentement » était **faux** : `sessionStorage` `aec.s` et `aec.s.sampled` écrivent sur le terminal **avant tout geste**, et l'art. 82 vise **toute inscription d'informations**. Test Playwright : **aucune autre clé que `aec.s*` n'est écrite avant un geste** |
| `/exactitude` | Version et date du corpus, 89 empreintes de section, règle **831 / 837**, méthode en 5 étapes, « ce que l'app ne fait jamais », derniers résultats du harnais, lien vers `eval/`, date du prochain re-crawl. **Trois ajouts** : (a) **la table R0-R6 et ses seuils** `OVERLAP_MIN` et `FIGURE_WINDOW`, avec le taux du dernier rejeu — « ce que l'app affirme, et selon quelle règle » ; (b) **expliquer les chiffres de l'IA abandonnée avant qu'un autre ne les explique** (refus corrects 87,5 % ❌, p95 4 159 ms ❌, `liant_kind` 50 % ❌, 3 négations fausses invisibles au validateur) — **le gabarit de cette section n'est pas écrit** ; (c) **le canal de mesure est non authentifié**, les taux sont des estimations |
| `/methodologie` | La règle 831/837 et la méthode, avec la `corpus_version`. **L'app affiche « 831 mesures »** partout ailleurs (chiffre officiel, `intro-p04`) |
| `/licence` | Les **cinq** éléments du code légal CC §3(a)(1), dont l'**URI vers l'Œuvre** (H-CNF-17m). **Le `LICENSE` racine est DÉJÀ amendé** (commit `2aa766f`, section « SCOPE OF THIS LICENSE ») — **ne le replanifie pas**. Ce qui reste : le paragraphe « Exceptions » de **`data/LICENSE`**, qui décrit encore une reproduction intégrale de la Désintox |
| `/a-propos` | Rôle, contact, méthode, **les trois écarts de charte assumés**. **Trois choses à écrire avant qu'on les écrive à notre place** : (a) l'**outil de rédaction hors ligne** distingué de l'**exécution** (« Aucune IA ne répond ici »), parce que les commits d'un dépôt public portent `Co-Authored-By: Claude` ; (b) ce que **le gel L49 ne peut pas arrêter** — aperçus déjà en cache chez WhatsApp, liens déjà envoyés, pages statiques ; (c) l'**hébergement** : `c18-s05-m02` « Construire un cloud véritablement public » et « Cloudflare, Inc., San Francisco » sont à un scroll l'un de l'autre. La réponse honnête existe (0 €, aucun moyen de paiement, aucune alternative gratuite équivalente, et le programme reste le programme) : **elle s'écrit avant, pas en improvisation** |

**Petit correctif de cohérence à faire ici** : `data/desintox.json` `meta.content_policy_fr` annonce
encore un champ `cited_snippets` qui **n'existe plus dans le fichier** — la doc interne est en avance
sur son contenu.

---

## 10. J — v1 publique, mardi 10 novembre 2026

Les **8 critères** de `12-positionnement-lancement.md` §9.3, chacun avec son instrument :

| # | Critère | Mesuré par |
|---|---|---|
| 1 | 89 sections + 837 propositions ont chacune une URL qui résout ; les 48 cartes statistiques leur `/a/<id>` | test de build sur `data/aec-2025.json` |
| 2 | Toute page de mesure ou de section produit un aperçu correct sur WhatsApp, Telegram, Instagram, Android **et** iPhone | protocole `06-partage.md` §5 rejoué **à la main sur le build réel**, grille remplie |
| 3 | Recherche : rappel@5 ≥ 0,80, hit@5 ≥ 0,95, rappel@3 sections ≥ 0,90 ; < 50 ms sur Android milieu de gamme | `eval/retrieval.ts` en CI + une mesure terrain |
| 4 | Cartes-concept publiées, **chacune à zéro affirmation non couverte** ; couverture **calculée** et publiée | relecture croisée D0.27 + `glossary.test.ts` |
| 5 | 15 ripostes, chacune avec sa mesure verbatim ; aucune carte statistique sur une image | `riposte.test.ts` |
| 6 | Aucune ligne rouge D0.32 relevée par ≥ 5 humains dont ≥ 2 non-politisés | test humain du 2-5 nov. |
| 7 | LCP < 2,5 s (Slow 4G, CPU ×4), JS initial < 100 Ko gzip, CLS < 0,1, Lighthouse a11y ≥ 95 | `design/perf-budget.md`, CI |
| 8 | Zéro requête vers un tiers, zéro cookie, zéro quota consommé par visite | `deep.json` d'audit rejoué sur notre domaine, comme sur les concurrents |

**Avant lancement** : skill `security-review` sur le dépôt complet (Worker, build, service worker,
`_headers`) · revue du dépôt **comme une publication** (D9.17) · `workers_dev: false` · seul le `.fr`
répond · **Bot Fight Mode OFF** (sinon les crawlers d'aperçu peuvent être défiés et la boucle virale —
seul canal de diffusion, D0.4 — meurt, sans autre correctif qu'un bouton au dashboard) · **règle de
rate limiting de zone créée** (1 seule sur Free, > 30 req/10 s par IP sur `/api/*`, H-PLA-11) ·
**Workers de labo supprimés** (`aec-lab-aig`, `aec-lab-budget`, `aec-lab-turnstile` + le custom domain
`lab.cestecritla.fr`, `aec-lab-fts` + sa base D1, `aec-lab-fw-*`) — H-PLA-25 · **harnais d'échappement
HTML/script** sur la recherche et toute route qui reflète une saisie (H-IA-12, **jamais écrit**).

---

## 11. Lots 6 à 13 — de J+1 au 3 mai 2027

| Lot | Période | Contenu | Critère de done chiffré | h |
|---|---|---|---|---|
| **6** | 10 nov. → 10 déc. | **Playbook organique J → J+30**, correctifs à chaud, **`scripts/metrics.ts` (n'existe pas)** | Premier rapport N/S ; ≥ 3 groupes d'action ont le lien ; dataset offert aux 3 destinataires **sous CC BY-NC-SA**. **Aucun taux publié sous 200 sessions échantillonnées** (à 200, l'IC 95 % autour de N = 0,6 vaut ±6,8 pts) ; `SUM(_sample_interval)`, **jamais `COUNT()`** ; requêtes bornées à 30 jours ; **aucun taux publié si l'écart avec l'analytics de zone dépasse 20 %**. **`home.link.title` figée sur la variante A du 10 nov. au 10 déc.** — aucune modification de l'écran 0 pendant une fenêtre de mesure de N. Test Playwright « **4 pages → 1 seul `POST /api/e`** » | 60 |
| **7** | 11 déc. → 3 janv. | **PWA hors-ligne** + **`sw-kill.js` livré EN MÊME TEMPS** + fiche 12 du runbook · **`/verifier`** · **les 8 objections en réserve d'O6** · dette du test humain | L'app lue une fois se relit sans réseau, **y compris la recherche et le refus**. **Test Playwright « déployer une version cassée derrière un SW installé » : mise à jour effective en ≤ 2 chargements, jamais de shell figé** — le SW est le seul composant capable de rendre une panne irréparable, et le seul livrable classé HYPOTHÈSE **jamais prototypé** (H-PLA-8), en service pendant le pic. ≥ 3 objections sur chacun des 5 thèmes les plus demandés, **dictées par les militants en réunion, pas choisies par nous** (O11) | 40 |
| **8** | 4 → 18 janv. 2027 | **v2** : écran « poser une question » **sans IA** (FAQ exacte → carte glossaire → retrieval A local, **et rien après**), écran de refus, `/mot/` | Les 6 critères §9.3. Réponse < 300 ms au p95 **sans aucun appel réseau**. **Refus** : `refusal.title` « L'Avenir en commun ne traite pas de ça. » **réservé** aux 4 entrées `absent` dont l'`absence_probe` a été rejouée sur la `corpus_version` courante ; `refusal.premise_false` pour la 5ᵉ ; partout ailleurs « Rien trouvé avec ces mots. » + 3 voisins **choisis à la main** (`neighbour_ids`) et faux amis filtrés au rendu (`excluded_ids`). **Jamais une affirmation libre d'absence sur le programme entier** — le bench v1 en a produit 3 sur 130, **toutes invisibles au validateur** | 40 |
| **9** | 19 janv. → 22 févr. | **v3, SOUS PORTE** — voir ci-dessous | Les 7 critères §9.3 | **0, 50 ou 100** |
| — | **1er mars 2027** | **Gel de contenu** | Plus une entrée ajoutée à `glossary.json`, `riposte.json`, `defis.json`, `faq.json` ; seuls le correctif de bug, la correction factuelle et le re-crawl restent | — |
| **10** | 1er → 12 mars | Vague inscription | Bandeau déterministe, **date calculée au build par `registrationDeadline()`** (6ᵉ vendredi avant le 1er tour → 2027-03-12), jamais écrite en dur ; **s'éteint seul le 13 mars à 00:00 Paris**, sans intervention. **Aucune clé `cta.*` ne contient un millésime** (D9.9, en porte) | 40 |
| **11** | 15 mars → 15 avril | Exploitation, re-crawl hebdo, correctifs dans la limite du gel | Le re-crawl du lundi ne casse aucun invariant ; sinon PR de diff relue à la main | 100 |
| — | 16-18 avril · 30 avril-2 mai | **Silences L49** | `silence.test.ts` passe **aux quatre bornes** + les **deux cas de dérive d'horloge** (+3 j, −3 j) | 0 |
| **12** | 19 → 29 avril | Entre-deux-tours ; réouverture automatique le 18 avril à 20:00 Paris | Rien à faire à la main pour rouvrir | 40 |
| **13** | à partir du 3 mai | Bascule « après », page d'archive datée, dernier rapport N/S | L'app reste lisible et exacte sans qu'on y touche | — |

### La porte v3, explicitement (défaut §19.3 n° 6)

C'est **le plus gros bloc du plan — 100 h sur 646, 15 %** — et **aucune des deux mécaniques ne satisfait
aujourd'hui le critère que le dossier s'est donné** (`07-mecaniques.md` §2 : « S ≥ 0,5 pour toute
mécanique conservée, sinon rétrogradée d'un niveau »). S'ajoute la fenêtre : v3 le 23 février, **gel le
1er mars** — six jours de vie avant gel, sept semaines avant le 1er tour, et un critère « S sur 14 jours
glissants » qui déborde le gel. **Le socle a reçu 11 voix de personas sur 20, les deux mécaniques 9 :
l'allocation d'heures est l'inverse de ce vote.**

| Mesure au test humain du 2-5 nov. | Ce qu'on développe | Où vont les heures restantes |
|---|---|---|
| **S ≥ 0,5 pour F1 et F2** | Les deux | — |
| **S ≥ 0,5 pour une seule** | Celle-là seulement (≈ 50 h). **Par défaut, F2** (« Laquelle est ici ? » : 5 voix, aucun état, aucune table éditoriale à maintenir) | ≈ 50 h → glossaire, ripostes, perf |
| **Aucune** | Rien | 100 h → socle. Le niveau 0 « lecture augmentée + partage » est un **résultat légitime** |

**Si le bloc part** : `/q/<section>` sans aucun état, carte OG **absente sur les 14 sections
sensibles** — `c1-s05`, `c4-s01`, `c4-s02`, `c4-s03`, `c7-s08`, `c7-s09`, `c10-s01`, `c15-s03`,
`c16-s01`, `c16-s03`, `c16-s04`, `c16-s07`, `c17-s01`, `c17-s02` (jamais dans un pool, jamais comme
leurre, **toujours lisibles**, jamais exclues de la lecture) · `/defi/<n>/` sur **60 tirages figés**,
chacun avec sa page statique et son aperçu propre, **aucune date dans le mécanisme**, un index hors des
60 affiche « ce tirage n'existe pas », **jamais une réécriture silencieuse** · `data/defis.json`,
`data/surprises.json`, `data/quiz-triplets.json` (89 triplets, Jaccard < 0,4, **revue humaine au build,
échec de build si un triplet non approuvé sort** — H-MEC-7) · progression niveau 1 en `localStorage`
limité à `{sections:[…]}`, **écrit seulement après un geste explicite**, **jamais sur l'écran 0 par
lien**.

**À dater dans le calendrier** : un **bloc unique « production + relecture D0.27 des 60 tirages »,
avant le 1er mars 2027** — après le gel, les 60 continuent de répondre et il n'y a rien à ajouter.

---

## 12. Ce qui glisse en premier, ce qui ne glisse jamais

**Ordre de sacrifice** (`12-positionnement-lancement.md` §9.3) :

1. **La v3 en entier** — le niveau 0 est un résultat légitime.
2. **La PWA hors-ligne** — D3.5 : l'app est complète sans service worker.
3. **La cible de 30 cartes-concept**, ramenée à ce qui est réellement relu. C'est le seul poste dont
   une hypothèse du dossier dit déjà qu'il ne tient pas (**H-LAN-2**), et son statut est explicite :
   D2.6 est « DÉCISION (liste) / **HYPOTHÈSE (résultat)** ». On garde la liste des 25 termes ; on
   publie le nombre **mesuré** et la couverture **calculée** sur `/exactitude`.
4. **L'écran « poser une question » de la v2** — et **avec le chiffre mesuré, jamais avec « la
   recherche fait déjà 80 % du travail »**, qui n'est mesuré nulle part, était écrit deux fois, et
   servait à sacrifier la demande verbatim de l'utilisateur. Les chiffres justes : **`hit@5 0,986`,
   `rappel@5 0,813`** — la recherche manque **une question sur cinq** au sens du rappel@5. **La
   position de cet écran dans l'ordre de sacrifice est à réexaminer avec ce chiffre-là sous les yeux.**

**On ne sacrifie jamais** : le verbatim exact · l'URL par mesure · l'aperçu de partage · la ligne
d'indépendance **et la mention « Site non officiel »** · `/confidentialite` · `/exactitude` ·
**`/verifier`** · le gel L49.

---

## 13. Vérification — comment on prouve que ça marche

**À chaque PR** — commande unique `npx tsx --test scripts/*.test.ts` (le glob prend
`check-strings.test.ts` depuis `5c6ee51` ; **ne pas réécrire la commande à deux arguments** que le
dossier prescrivait avant le renommage) :

1. `scripts/verify-corpus.ts` + invariants `data/expected-invariants.json` — 4/18/89/87/706/44/48/109/15.
2. `eval/retrieval.ts` — hit@5 ≥ 0,95 · rappel@10 ≥ 0,85 · rappel@3 sections ≥ 0,90 · **ids interdits
   top 5 ≤ 8 % sur l'ensemble** ET **0 id interdit parmi les voisins affichés d'un refus** (le second
   **éliminatoire** : 3/70 = 4,3 % passait sur l'ensemble tout en masquant **5/30 = 16,7 %** sur les
   seules questions adversariales — q071 Sénat, q078, q084 double peine, q087, q088).
3. Rejeu du validateur sur `eval/generation-raw.jsonl` (0 invention), à 0 neuron.
4. Les **99** tests : glossaire 17 · FAQ 10 · riposte 13 · silence 17 · éval 8 · ingestion 7 · dérivés
   9 · chaînes 18.
5. `scripts/contrast.ts` — **28 paires de rôles**, 4,5:1 texte / 3:1 filet-bordure-focus, **code de
   sortie non nul** en cas d'échec. *(Il n'était pas une porte avant le 10/9 : c'était un générateur
   sans seuil ni code de sortie, que le dossier qualifiait pourtant deux fois d'« éliminatoire ».)*
6. `scripts/a11y.ts` — axe 0 serious/critical, Lighthouse ≥ 95, reflow 320 px, 130 % **et** 150 %.
7. Portes nouvelles : mention IA (sur le contenu) · licence · dépôt (avec liste blanche) · ban list ·
   taille du bundle et du Worker · snapshots des cartes OG · taille du corpus **en nommant `zlib`
   niveau 9**.
8. **Posture R0-R6** — rejeu sur les **100 questions de `eval/questions.json` + les 60 écrans de
   `eval/generation-v2-raw.jsonl`**, à 0 neuron, critère « **0 écran affirmant ce que le corpus ne
   soutient pas** » (15/40 aujourd'hui ; à défaut ≤ 2, tous neutres). **Tant qu'elle n'est pas verte,
   la v1 ne livre que R0, R1, R2, R5 et R6** : `voici` par défaut, **jamais `confirme`, jamais
   `corrige`**. Les seuils `OVERLAP_MIN` et `FIGURE_WINDOW` sont **fixés par ce rejeu, jamais choisis à
   l'écriture**, et publiés sur `/exactitude`.
   *HYPOTHÈSE à écrire comme telle : disjoindre le jeu d'ajustement du jeu de porte en réservant les
   **30 questions hostiles** à l'ajustement et les **100 + 60** à la porte.*

**Tests Playwright nommés** : rendu des `measure_split` fusionnés et des sous-mesures citées seules ·
**rendu du `scope_id` sur `c1-s02-m02` et `c1-s02-m03`** · URL de `/defi/` (aucune réponse, aucun
horodatage, aucun jeton, **aucune date**) · liste des 14 sections sensibles · **hors ligne, l'app
entière** y compris recherche et refus · échappement sur toute saisie reflétée · **« 4 pages, combien
de `POST /api/e` »** · **« aucune clé autre que `aec.s*` écrite avant un geste »** · **« version cassée
derrière un service worker installé »**.

**Mesures terrain, qui ne se font pas en CI** : LCP/INP/CLS sur un vrai Android milieu de gamme en 4G
(`perf-budget.md` §5.4) · les 8 aperçus sur 3 messageries × 2 OS · `vt-probe.mjs` sur un Android réel ·
le défaut de crénage après sous-ensemblage sur Android et iOS · le chrono d'un déploiement d'urgence
(`build:fast` **et** build complet), **jamais mesuré** — le runbook annonce « ≈ 1-2 min » et « ≈ 5 min »
quand les ≈ 970 cartes à 0,22-0,60 s de rendu local donnent **≈ 4 à 10 minutes** plus ≈ 60 Mo d'upload.

---

## 14. Écarts relevés, à signaler plutôt qu'à absorber

**Chiffres de plateforme Cloudflare — VÉRIFIÉ le 10/9/2026 via `context7`, aucun écart avec le §5** :
100 000 req/jour et 10 ms de CPU par invocation sur Free · **50 sous-requêtes externes** par invocation
sur Free (plus 1 000 vers des services Cloudflare) · Static Assets **gratuits et illimités, hors
compteur d'invocations** · **20 000 fichiers par version du Worker**, 25 Mio par fichier · avec
`run_worker_first`, les requêtes correspondantes reçoivent **429 au-delà du quota gratuit** pendant que
le statique continue d'être servi — c'est exactement le mode dégradé du §7.

**Six écarts internes au dossier, mesurés en écrivant ce plan :**

| Écart | Ce que dit le dossier | Ce qui est vrai (mesuré le 10/9) |
|---|---|---|
| Nombre de décisions | 158 (chapeau de `decisions.md`, `00-resume-executif.md` §6) | **160** — D13.9 et D13.10 ont été ajoutés après le comptage. `grep -cE '^\| D[0-9]+\.[0-9]+[a-z]? \|' docs/discovery/decisions.md` |
| Points du test humain | §16 et §9.2 : « les **8** points de §3.12 » | **12** (9 à 12 ajoutés le 10/9, dont **deux éliminatoires**). C'est le critère de done du **seul jalon bloquant** du calendrier |
| Lignes de §10.1 | §17 : « 35 lignes priorisées » | **43** — 14 priorité 1, 13 priorité 2, 16 priorité 3. Un plan qui recopie 35 sort une v1 en ayant levé 35 lignes sur 43 sans le savoir |
| Purge Désintox | §4 : « `git show 16c7d82:data/desintox.json` rend les 26 `content_text` » ; §19.4 : 467 occurrences | **Faite (D13.9)** : `16c7d82` **ne résout plus**, `git log --all -p -- data/desintox.json \| grep -c content_text` = **0**. Le compteur global vaut **250**, pas 467, et l'essentiel est constitué de **citations du motif dans les docs de conformité** |
| Commits | 26 / 28 / 29 selon l'endroit | **32** (`git rev-list HEAD --count`). Le chiffre bouge à chaque commit du dossier : **à re-mesurer, jamais à recopier** |
| Taille du corpus gzip | §4 : « `zlib` niveau 9 rend 144 620 o » | **142 345 o** (le chiffre publié) ; `gzip -9` rend 145 441 ; zlib niveau 6 rend 143 897. **Aucun réglage ne rend 144 620.** La porte de taille doit **nommer l'outil** |

**Deux écarts d'heures, développés au §2** : socle 40 h → **65 h** ; recherche/cartes/riposte 40 h →
**52 h**.

**Deux points de statut à connaître avant de s'appuyer dessus** : **D6.5** (la porte de CI) et **D6.6**
(`/exactitude`) n'ont que le statut **PROPOSITION** dans `decisions.md`, alors que le résumé exécutif
les traite comme acquis. Et **D7.1, D7.3, D7.4, D7.7, D6.7, D6.8 décrivent l'architecture avec D1,
cache de gateway, budget DO et `/api/ask` — entièrement annulée par D13.1 + D6.10 sans que les lignes
soient barrées.** Risque réel de recopier les bindings de D7.1 dans le `wrangler.jsonc` : c'est pour
cela que la tâche 1.1 donne la liste exacte des blocs conservés.

---

## 15. Annexe — ce qui reste ouvert

**Les cinq points ouverts au 10/9 sont tranchés** (D14.8-D14.12) : rythme, méthode de purge, sortie
d'exposition, portes de jugement, message 0. Ce qui reste :

1. **P0.2 peut rouvrir D3.1.** Les deux textes de la charte sont désormais localisés —
   `https://lafranceinsoumise.fr/principes/` et
   `https://lafranceinsoumise.fr/groupes-action/charte-groupes-action-de-france-insoumise/`, tous deux
   en 200, ≈ 12 600 mots au total. Si l'un des deux interdit ce que fait l'app, c'est **toute
   l'identité visuelle** qui se rejoue. Le plan ne peut pas l'anticiper ; il place la lecture **avant**
   le premier build, ce qu'il fait.
2. **P0.4, RGPD art. 13(1)(a)**, se tranche **après** la lecture du guide CNIL (P0.3) et ne change
   qu'une ligne de `/confidentialite` et de `/mentions-legales`, tous deux au jalon du 6-9 novembre.
3. **Trois dettes créées par les arbitrages du 10/9**, toutes dans le périmètre v1 : la fiche 9 du
   runbook (D14.10), la section « ce qui n'a pas été vérifié par des personnes » sur `/exactitude`
   (D14.11), et `design/tokens.neutral.json` (D14.12), qui n'existe pas et devient un prérequis.
