# T1 — Corpus canonique et modèle de données

> **État du document (7 septembre 2026, J0, rédigé à 16:50 UTC).** Rapport de la piste T1 du plan (`PLAN-SESSION.md` §5 T1, attendus du §3.1). Quatre agents ont produit les fichiers (ingestion + invariants ; vérification adversariale indépendante ; dérivés « À savoir » / termes / tags ; re-crawl hors Worker ; deux agents annexes désintox et livrets 2022), un cinquième a rédigé ce rapport. Rien n'est commité : `data/`, `scripts/`, `.github/` sont encore non suivis par git.
>
> Statuts : **VÉRIFIÉ** = mesuré aujourd'hui par un script nommé, sortie ou fichier cité · **PROBABLE** = mesuré par un outil ad hoc non conservé, ou déduit · **HYPOTHÈSE** = cible non prouvée. Heures en UTC (les mtimes locaux du dépôt sont en UTC+2). Aucun commentaire sur le fond des mesures : le rapport porte sur les données et le code.

---

## 1. Résumé

1. **Le corpus 2025 est extrait, exhaustif et prouvé** : 4 parties, 18 chapitres, 89 sections, 837 propositions (87 mesures clés + 706 mesures + 44 sous-mesures), 48 encadrés « À savoir », 109 paragraphes, 0 doublon, 1 033 empreintes d'items vérifiées ; les 10 sections tirées au sort par le vérificateur indépendant sont identiques caractère par caractère au site. — VÉRIFIÉ (`scripts/ingest.ts` 16:30:57 UTC, `scripts/verify-corpus.ts` ≈ 16:32 UTC, verdict PASS)
2. **Version du corpus figée : `d29c7422004ab27c`** (16 premiers hexa du SHA-256 des 89 empreintes de section). Une première version `283b17ac5af46719` a été remplacée à 16:30 UTC après correction d'une incohérence de normalisation (caractère zéro-largeur, §11.1) ; aucun texte n'a changé entre les deux. — VÉRIFIÉ
3. **La règle de comptage 831/837 est écrite** dans `meta.counting_rule_fr` du jeu de données (§3.2) : l'app affiche « 831 mesures » (chiffre officiel, phrase `intro-p04`), 837 n'apparaît que sur la page méthodologie. — VÉRIFIÉ (texte) / DÉCISION proposée D1.2
4. **Reste ouvert** : la cible « gzip ≤ 80 Ko » n'est pas tenue par le fichier complet (142 345 octets gzip, à cause des ~1 100 empreintes et du HTML des paragraphes) mais le serait par une projection « runtime » (≈ 71 Ko, PROBABLE) ; la relecture humaine des 10 % de tags et le mapping FALC 2022 → 2025 ne sont pas faits ; la licence de réutilisation de la désintox est à vérifier.
5. **Le re-crawl hebdomadaire hors Worker existe** (`scripts/diff.ts` + `.github/workflows/recrawl.yml`, lundi 06:00 UTC, PR de diff en français, badge « corpus à jour au 2026-09-07 »), essai à blanc réussi ; il suppose que `data/` soit commité sur `main`. — VÉRIFIÉ (essai local) / HYPOTHÈSE (première exécution réelle sur GitHub)

---

## 2. Pipeline canonique

**Algorithme (le seul autorisé, `scripts/ingest.ts` en-tête)** : page d'accueil du livre → `nav.tdm` → 1 introduction + 4 pages de partie + 18 pages de chapitre → `nav.tdm` de chaque chapitre → ses sections. Jamais d'énumération de motifs d'URL (les `/chapitreN/sM/` ne sont pas hiérarchiques, plan §3.1), jamais le flux RSS comme source. — VÉRIFIÉ (code lu, `ingest.ts` l. 1-22)

**Politesse (`scripts/aec-common.ts`)** : User-Agent `cestecritla/0.1 (+https://github.com/baoleka/cestecritla)`, concurrence 4, une passe, `redirect: 'manual'` avec au plus un saut même site vérifié (h1 = titre de la nav, `nav.tdm a.actuelle` = URL de nav, `<link rel=canonical>` = URL atteinte), au plus 2 relances avec attente sur 429/5xx/erreur réseau seulement, `ng.melenchon2027.fr` refusé. — VÉRIFIÉ (code)

**Requêtes** :

| Exécution | Requêtes | Statut |
|---|---|---|
| Crawl final producteur du jeu de données (16:30:57 UTC) | 116 = 1 accueil + 1 introduction + 4 parties + 18 chapitres + 89 sections + 3 sauts de redirection ; 0 relance ; 14,5 Mo reçus ; 1,9-2,5 s | VÉRIFIÉ (compteur `requests_made` de la sortie du run ; arithmétique recoupée par le vérificateur) |
| Idem avec `--rss` | 137 = 116 + 21 pages de flux, ≈ 10 s, code 0 | VÉRIFIÉ (run de l'agent ingestion) |
| Vérification adversariale, 2 exécutions | 29 pages chacune (accueil + 18 chapitres + 10 sections), chacune une fois, 0 relance | VÉRIFIÉ (`scratchpad/verify-report.json`) |
| Essai à blanc du re-crawl (`--out`) | 116, 0 relance | VÉRIFIÉ (rapport CI) |
| Désintox (REST) | 3, séquentielles, pause 300 ms | VÉRIFIÉ (`data/desintox.json.meta`) |
| Livrets / plans / FALC 2022 | 2 (une page REST de 84 pages + une page HTML) | VÉRIFIÉ (`data/livrets-2022.json.meta`) |
| Total session, tous agents | ≈ 500 (agent ingestion : exploration, 2 crawls avortés, 3 crawls complets, 3 passes de flux) + 58 + 116 + 5 ≈ **680** | PROBABLE (le « ≈ 500 » est une estimation de l'agent) |

**Fichiers** : `scripts/aec-types.ts` (types stricts, `meta` en snake_case, entités en camelCase), `scripts/aec-common.ts` (fetch poli, pool, normalisation, sha256), `scripts/ingest.ts` (parseurs purs exportés `parseLandingPage`, `parseChapterPage`, `parseSectionPage`, `parseIntroductionPage`, `parsePartPage`), `scripts/rss-crosscheck.ts`, `scripts/ingest.test.ts` (7 tests hors ligne), fixtures `scripts/fixtures/chapitre12-s1.html` et `chapitre1-s6.html` (HTML réel, comparé au site avant gel).

**Commandes** : `npx tsx scripts/ingest.ts [--rss] [--write-expected] [--out <chemin>]` · `npx tsx scripts/rss-crosscheck.ts` · `npx tsx --test scripts/ingest.test.ts` · `npx tsx scripts/verify-corpus.ts [--json <rapport>] [--cache-dir <dir>]` · `npx tsx scripts/diff.ts [<candidat>] [--out <md>]` · `npx tsx scripts/derive.ts [--json]`. Aujourd'hui, hors ligne : `npx tsc --noEmit` OK, `ingest.test.ts` 7/7, `derive.test.ts` 9/9. — VÉRIFIÉ (relancés à 16:47 UTC pour ce rapport)

**Échec bruyant** : l'ingestion sort en code 1 sans rien écrire si la structure du site (1 intro, 4 parties, 18 chapitres, chaque section avec ≥ 1 paragraphe et ≥ 1 proposition) ou un compteur de `data/expected-invariants.json` dévie. — VÉRIFIÉ (`scripts/README.md`, code)

---

## 3. Invariants mesurés et règle de comptage

### 3.1 Tableau attendu vs mesuré

Attendu = reconnaissance (plan §3.1, statut PROBABLE à l'époque). Mesuré = `scripts/ingest.ts` (16:30:57 UTC), recalculé indépendamment depuis le JSON seul par `scripts/verify-corpus.ts` (aucune importation de l'ingestion).

| Invariant | Attendu | Mesuré | Statut |
|---|---|---|---|
| Introduction / parties / chapitres | 1 / 4 / 18 | 1 / 4 / 18 | VÉRIFIÉ |
| Sections | 89 | 89 (c1=6 c2=2 c3=2 c4=3 c5=7 c6=5 c7=9 c8=8 c9=3 c10=5 c11=2 c12=3 c13=5 c14=6 c15=4 c16=12 c17=2 c18=5) | VÉRIFIÉ |
| Mesures clés `div.mesure-cle` | 87 | 87 | VÉRIFIÉ |
| Mesures `div.mesure` | 706 | 706 | VÉRIFIÉ |
| Sous-mesures `div.sous-mesure` | 44 | 44 (4 sections) | VÉRIFIÉ |
| Propositions (somme) | 837 | 837 | VÉRIFIÉ |
| Encadrés « À savoir » `div.chiffre` | 48 | 48 (+ 6 statistiques publiées en simple paragraphe, §11.3) | VÉRIFIÉ |
| Paragraphes | 109 | 109 (dont 15 anomalies de source, §11.3) | VÉRIFIÉ |
| Sections sans mesure clé | 2 | 2 : `c17-s01`, `c17-s02` (chapitre 17, Europe) | VÉRIFIÉ |
| Sections sans « À savoir » | 52 | 52 | VÉRIFIÉ |
| Sections multi-paragraphes | 14 | 14 | VÉRIFIÉ |
| Paragraphes d'introduction / de parties / épigraphes | — | 27 / 4 / 8 | VÉRIFIÉ |
| Doublons de propositions (même section, sections différentes) | 0 | 0 / 0 ; 0 titre de section en double | VÉRIFIÉ |
| Identifiants uniques | — | 1 033 items + 89 sections + 18 chapitres + 4 parties + intro, 0 doublon ; 89 URL uniques | VÉRIFIÉ |
| Références internes | — | toutes résolues (chaque chapitre dans exactement une partie, chaque section dans exactement un chapitre) | VÉRIFIÉ |
| 10 sections mot à mot | 10/10 | 10/10 (§5) | VÉRIFIÉ |
| Gzip du JSON | ≤ 80 Ko (plan : 62 Ko) | 142 345 octets (§6) | VÉRIFIÉ, **cible non tenue** |
| Doublons RSS | ≈ 82 | 87 URL alias + 13 doublons de pagination (202 items, 189 guids) | VÉRIFIÉ |

`data/expected-invariants.json` (écrit une fois avec `--write-expected`, après contrôle des deux fixtures contre le HTML en ligne) gèle ces 17 compteurs, les sections par chapitre et l'allowlist RSS `c10-s01`. La `corpus_version` a été identique sur 4 crawls consécutifs (déterminisme). — VÉRIFIÉ (agent ingestion)

### 3.2 Règle de comptage 831 / 837 — texte retenu

Texte exact de `meta.counting_rule_fr` (`data/aec-2025.json`), à reprendre tel quel sur la page méthodologie / exactitude :

> Le programme annonce officiellement « 831 mesures » (phrase de l'introduction de l'édition 2025, conservée mot pour mot dans introduction.paragraphs, id intro-p04). Ce jeu de données ne compte pas des mesures mais des blocs HTML publiés : 87 mesures clés (div.mesure-cle) + 706 mesures (div.mesure) + 44 sous-mesures (div.sous-mesure, puces rattachées à la mesure qui les précède) = 837 propositions ; sans les sous-mesures, 793 blocs. Aucune de ces sommes ne reproduit 831 : la méthode de comptage des auteurs n'est pas publiée, l'écart n'est donc ni une erreur du site ni une erreur du jeu de données. Règle d'affichage : l'app affiche uniquement le chiffre officiel « 831 mesures » comme nombre de mesures du programme ; le nombre de propositions extraites (837) et ce mode de calcul n'apparaissent que sur la page méthodologie / exactitude, avec la version du corpus.

Preuves textuelles dans le corpus : `intro-p04` (« … ses 831 mesures pour tous les domaines de la politique d'une nation … ») et `intro-p06` (« … 143 mesures ont été ajoutées et 120 mesures précisées … »). — VÉRIFIÉ (lecture du JSON)

---

## 4. Schéma d'identifiants et de hachage

**Schéma adopté** (`meta.id_scheme`, `scripts/aec-types.ts`) : chapitre `c{N}` (1..18) ; section `c{N}-s{MM}` (MM = numéro du slug `sM`, sur 2 chiffres) ; dans une section, numérotation **par nature et dans l'ordre du document** : paragraphe `-p{PP}`, mesure clé `-k{KK}`, mesure `-m{MM}`, sous-mesure `-m{MM}.s{S}` (rattachée à la mesure qui la précède), encadré `-a{AA}` ; parties `part{1..4}` (`-p{PP}`, épigraphes `-e{EE}`) ; introduction `intro` (`intro-p{PP}`). — VÉRIFIÉ (1 033 ids conformes, vérificateur)

Exemples réels (`data/aec-2025.json`) :

| Id | Nature | Début du texte |
|---|---|---|
| `c12-s01` | section « La bifurcation écologique pour une société de l'harmonie », `chapterId` `c12`, `partId` `part3`, hash `b60dd20d…` | — |
| `c12-s01-p01` | paragraphe (avec champ `html`) | « L'urgence écologique et climatique suppose de rompre… » |
| `c12-s01-k01` | mesure clé | « Inscrire dans la Constitution le principe de la « règle verte »… » |
| `c12-s01-m01` | mesure | « Adopter des lois cadres instaurant une planification écologique… » |
| `c12-s01-a01` | encadré | « 83 % des Français sont d'accord pour interdire de prélever… » |
| `c1-s06-m01.s1` … `.s3` | 3 sous-mesures imbriquées sous `c1-s06-m01` | — |
| `part2-e01` | épigraphe (blockquote + cite) de la partie 2 | « Mais je suis de ceux qui pensent… » |
| `intro-p04` | paragraphe d'introduction portant le chiffre officiel | « S'il a pu y parvenir, c'est grâce à la méthode… 831 mesures… » |

**Hachage** : chaque item porte `hash` = SHA-256 de son texte normalisé (NFC, zéro-largeur U+200B/U+FEFF retirés, espaces Unicode réduits à un espace ASCII, trim, entités décodées) ; chaque section porte SHA-256 de `normalizeHtml(section.contenu.innerHTML) + '\n' + normalizeHtml(section.chiffres.innerHTML | '')` ; `corpus_version` = 16 premiers hexa du SHA-256 des 89 empreintes de section concaténées dans l'ordre de lecture (`computeCorpusVersion`, `ingest.ts` l. 98). `data/hashes.json` reprend `{corpus_version, generated_at, sections{id → {url, hash}}}` (89 entrées). — VÉRIFIÉ (1 033/1 033 empreintes d'items recalculées, 10/10 empreintes de section recalculées depuis le HTML en ligne, `corpus_version` recalculée = `d29c7422004ab27c`)

**Limite connue** : les ids sont **positionnels** ; une insertion sur le site décale les suivants. `diff.ts` classe donc les items en ajouté / supprimé / modifié / **renuméroté** (§9). Les URL de partage devront porter `corpus_version` + id, ou un id stable dérivé du hash (HYPOTHÈSE à trancher en T4/T9).

**Champs de section** : `id, chapterId, partId, number, slug, title, url` (URL de nav, normalisée avec barre finale), `canonicalUrl` (permalien WordPress réel ; diffère pour `c1-s03`, `c1-s04`, `c1-s05`, `meta.redirected_section_ids`), `hash, items[], chiffres[]`. — VÉRIFIÉ

---

## 5. Vérification adversariale et recoupement RSS

### 5.1 Vérificateur indépendant (`scripts/verify-corpus.ts`, 1 691 lignes)

Aucune importation de l'ingestion (types seuls). Six contrôles : mot à mot sur 10 sections tirées par PRNG semé (mulberry32, graine 20260907, Fisher-Yates partiel sur les ids triés) ; invariants structurels recalculés ; énumération indépendante (accueil + 18 navs de chapitre, égalité exacte des ensembles et de l'ordre d'URL) ; empreintes (items, sections, `hashes.json`, `corpus_version`) ; doublons ; gzip. Auto-test sur une copie corrompue (`’`→`'` dans `c6-s01-m01`, une sous-mesure déplacée dans `c1-s06`, un encadré retiré de `c13-s04`) : les trois défauts sont signalés précisément, 0 requête en ligne. — VÉRIFIÉ

| Section | URL | Résultat (2 exécutions) |
|---|---|---|
| `c16-s04` | …/chapitre16/s4/ | identique |
| `c6-s05` | …/chapitre6/s5/ | identique |
| `c4-s03` | …/chapitre4/s3/ | identique |
| `c11-s02` | …/chapitre11/s2/ | identique |
| `c13-s04` | …/chapitre13/s4/ | identique |
| `c18-s03` | …/chapitre18/s3/ | identique |
| `c16-s11` | …/chapitre16/s11/ | identique |
| `c6-s01` | …/chapitre6/s1/ | identique |
| `c5-s02` | …/chapitre5/s2/ | identique |
| `c18-s05` | …/chapitre18/s5/ | identique |

« Identique » = même nombre d'items, mêmes natures, même ordre, mêmes ids, mêmes textes, même `html` de paragraphe, même imbrication des sous-mesures, mêmes encadrés, même h1, même `<link rel=canonical>`, même `a.actuelle`, même slug de partie. Aucune des 3 sections redirigées n'est dans l'échantillon (à couvrir explicitement, §11.6).

**Verdicts** : exécution 1 (≈ 16:24 UTC, corpus `283b17ac5af46719`) : **FAIL**, un seul problème — `intro-p03` : le `html` commence par deux U+200B absents du `text` (normalisation asymétrique, non documentée). Exécution 2 (≈ 16:32 UTC, corpus `d29c7422004ab27c`, après correction de `normalizeHtml` et re-crawl) : **PASS**, 0 problème, 1 033 empreintes, gzip 142 345, 29 requêtes. — VÉRIFIÉ (`scratchpad/verify-report.json`, `verify.log`)

### 5.2 Recoupement RSS (`scripts/rss-crosscheck.ts`)

Flux `/feed/?post_type=lfi_programme_2025&paged=N`, 21 pages, 202 items, 189 guids distincts (13 doublons de pagination), 87 URL alias. Appariement aux sections canoniques par empreinte de contenu (titre + textes), pas par URL. Résultat : 88/89 sections retrouvées ; **`c10-s01`** (« Réaliser l'égalité entre les femmes et les hommes », post 15477, modifié 2026-03-23) absente du flux — lacune côté site, allowlistée dans `expected-invariants.json.rss_known_missing_section_ids` ; toute autre absence fait échouer le contrôle (code 1). 6 items (4 posts) sont des **alias périmés** de `c1-s03`, `c14-s02`, `c10-s05`, `c5-s06` : même titre, contenu plus ancien (coquilles « mettre un place », sous-mesures aplaties). Le flux ne doit jamais servir de source. — VÉRIFIÉ

---

## 6. Taille du corpus

Mesures de ce rapport (Node `zlib` niveau 9, 16:45 UTC) ; tokens estimés ≈ octets / 4 :

| Fichier | Brut | Gzip | Tokens ≈ | Statut |
|---|---|---|---|---|
| `data/aec-2025.json` (complet) | 540 662 o | **142 345 o** | ≈ 135 000 | VÉRIFIÉ |
| Projection « runtime » (sections + chapitres, sans `hash` ni `html`, minifié) | 262 997 o | **71 024 o** | ≈ 66 000 | PROBABLE (mesure ad hoc de l'agent ingestion sur `283b…`, script non conservé) |
| `data/hashes.json` | 16 131 o | 3 976 o | — | VÉRIFIÉ |
| `data/stat-cards.json` / `terms-candidates.json` / `section-tags.json` | 58 402 / 78 594 / 78 417 o | 6 797 / 8 862 / 9 366 o | — | VÉRIFIÉ |
| `data/desintox.json` | 127 320 o | 25 122 o | ≈ 32 000 | VÉRIFIÉ |
| `data/livrets-2022.json` | 1 955 907 o | 607 528 o | ≈ 490 000 | VÉRIFIÉ |
| `data/falc-2022.json` | 36 956 o | 11 106 o | ≈ 9 000 | VÉRIFIÉ |

Écart avec le plan (201 Ko / 62 Ko / 56 000 tokens) : le fichier complet porte ~1 100 empreintes SHA-256 incompressibles, le `html` des 109 paragraphes en double du `text`, les chaînes françaises `id_scheme` / `counting_rule_fr`, et il est indenté. Il est le **fichier de référence**, pas le fichier servi. Les 6 octets de différence avec la version `283b…` (540 668 o) sont les deux U+200B retirés de `intro-p03.html`. — VÉRIFIÉ (comparaison des deux jeux)

**Verdict « tient côté client »** : oui pour l'app (142 Ko gzip en un seul téléchargement statique, ou 71 Ko avec la projection) ; la cible « ≤ 80 Ko » du plan n'est atteignable **que** par un build runtime dérivé (HYPOTHÈSE jusqu'à l'existence du script de build, D1.6). Le corpus complet (≈ 135 000 tokens) ne rentre pas dans un prompt : le retrieval (T6) travaille par section (89) et par proposition (837), jamais sur le tout.

---

## 7. Corpus annexes

| Corpus | Contenu | Période | Statut d'usage | Preuve |
|---|---|---|---|---|
| **Désintox** `data/desintox.json` (`scripts/fetch-desintox.ts`) | 26 posts « Idées reçues » (catégorie 19, parent de 7 thèmes : Le mouvement, Économie, Immigration, Antiracisme, Sécurité, International, Écologie ; chaque post porte exactement un thème) ; 43 posts sur le site = 26 + 17 « Actualité » ; 13 catégories ; 6 821 mots, `content_text` sans balise ni entité | `date` 2025-05-23 → 2025-08-15 ; `modified` jusqu'au 2026-03-12 (toujours > `date` : la fraîcheur se lit sur `modified`) ; horodatages WordPress locaux sans fuseau | Matière du mode Riposte (T8). **Pas de licence CC** : `meta.license_note` = « source citée, avec lien vers l'article d'origine, pas de reproduction intégrale sans vérification » | VÉRIFIÉ (`meta`, X-WP-Total 26) |
| **Livrets et plans 2022** `data/livrets-2022.json` (`scripts/fetch-livrets-2022.ts`) | 41 livrets (169 640 mots) + 13 plans (90 514 mots), enfants REST des hubs `/livrets-2022/` (id 1790) et `/plans-2022/` (id 2006), 84 pages REST scannées ; texte structuré (titres `##`, listes, tableaux `|`) | Republication WordPress 2024-01-29 → 02-02 ; modifiés jusqu'au 2026-05-03 ; **contenu : campagne 2022** | **« Contexte 2022 »** (`meta.status_fr` : « chiffres et mesures périmés, ne jamais citer comme le programme 2025 ») ; source d'appoint pour le glossaire T2 | VÉRIFIÉ |
| **FALC 2022** `data/falc-2022.json` (même script) | Une seule page Elementor (id 22108, `/laec-falc/`), pas de sous-pages (vérifié par REST `parent=22108` et par absence de liens) ; 22 chapitres numérotés + 4 sections non numérotées = 26, 4 048 mots ; ancres non stables (ids Elementor à l'exécution) | Publiée 2026-05-13, modifiée 2026-05-20 ; la page dit elle-même, en FALC, qu'il s'agit du programme 2022 | **« Contexte 2022 »** ; registre de style FALC oui, contenu non ; mapping FALC 2022 → 2025 **non fait** (§11.8) | VÉRIFIÉ |

Clés : `outre-mer` et `plein-emploi` existent comme livret **et** plan (ids WP distincts) → clé = `id` ou `(kind, slug)`. Slug `francais·es-de-letranger` stocké décodé, URL encodée conservée. Médias (iframes YouTube, images) retirés dans 18 pages, légendes conservées. — VÉRIFIÉ

---

## 8. Dérivés (`scripts/derive.ts`, `scripts/tag-rules.ts`, `scripts/derive.test.ts`)

Déterministes (aucune horloge, aucun aléa, deux exécutions byte-identiques), sans IA ; `meta` de chaque fichier porte `corpus_version d29c7422004ab27c`, `source_crawled_at` et la licence. À régénérer après toute ré-ingestion. — VÉRIFIÉ

### 8.1 Cartes statistiques `data/stat-cards.json`

- **48 cartes** = 48 encadrés (attendu 48), + 6 `paragraph_statistics` (statistiques publiées en simple paragraphe, comptées à part). 0 encadré sans pourcentage ; 2 encadrés à deux pourcentages (`c4-s01-a01` 89 et 92 %, `c13-s03-a01` 74 % + objectif 100 %) → `headline_percentage` = première valeur. — VÉRIFIÉ
- **Instituts** : Harris Interactive 37, Ifop 9, YouGov 1 (« Yougov » canonisé, graphie source dans `institute_raw`), inconnu 1. **47/48** ont institut + date. — VÉRIFIÉ
- **Dates** : janvier 2018 → octobre 2024 (ISO 2018-01 → 2024-10) ; 3 cartes datées à l'année seule (`c4-s01-a01`, `c8-s02-a01`, `c8-s08-a02`, confiance `medium`) ; 44 `high`, 1 `low` : `c13-s03-a02` (votation 2018, 314 530 participants, 93,13 %), qui n'est pas un sondage. — VÉRIFIÉ
- **Loi 77-808 (art. 2)** — champs manquants par carte : `media_premiere_diffusion` 48/48, `commanditaire` 45/48 (3 cartes « Ifop pour l'Humanité » : `c6-s05-a04`, `c7-s01-a01`, `c9-s02-a01`), `organisme` 1, `dates` 1 ; aucune carte ne donne échantillon, libellé des questions ni marges d'erreur (`meta.legal_77_808_fr`). Conséquence pour D0.20 : le gabarit StatCard doit afficher ce qui existe (organisme, mois/année) **et** signaler ce qui manque, ou renvoyer à la source ; la plus ancienne a 8 ans (critère « chiffres périmés mis en avant », D0.32). — VÉRIFIÉ (données) / HYPOTHÈSE (gabarit, T9)

### 8.2 Termes candidats `data/terms-candidates.json`

187 candidats = top 150 par score + 37 amorces présentes ; 112 contenants, 1 082 items (mesures clés, mesures, sous-mesures, paragraphes, **plus titres** — écart assumé avec la spec ; encadrés exclus, leur vocabulaire de sondage polluait le top 30). Score = fréquence × moyenne ln(1 + N/df) × bonus de longueur (1 / 1,6 / 2) ; pas de lemmatisation. — VÉRIFIÉ

Top 30 (fréquence totale / dans les propositions) : eau (55/35) · santé (40/27) · Outre-mer (31/21) · éducation (27/25) · enseignement (25/21) · recherche (25/25) · justice (24/13) · République (27/7) · police (19/13) · services publics (20/12) · bifurcation écologique (18/10) · sport (13/6) · intérêt général (15/5) · dette (14/10) · situation de handicap (8/5) · planification écologique (15/7) · école (16/8) · planification (18/9) · service public (20/15) · salariés (19/13) · logement (14/7) · bifurcation (21/10) · enseignement supérieur (11/9) · économie (19/4) · culture (14/5) · logements (14/12) · ONU (14/13) · autonomie (16/8) · assemblée constituante (9/4) · Constitution (17/11). — VÉRIFIÉ

Amorces absentes du corpus 2025 (7) : « sécurité sociale intégrale » (le texte dit « 100 % Sécu », `c15-s02-k01`), « socialisation », « blocage des prix » (mesure clé : « Bloquer les prix », `c9-s01-k01`), « allocation d'autonomie » (2025 : « garantie d'autonomie »), « désobéissance », « agroécologie », « 100 % renouvelables ». 5 amorces n'apparaissent jamais dans une mesure (« monarchie présidentielle », « protectionnisme solidaire », « créolisation », « harmonie », « révolution citoyenne »). Bruit résiduel en queue (« bois », « associations », « guerre ») laissé à la relecture T2. — VÉRIFIÉ

### 8.3 Tags `data/section-tags.json`

- **Méthode** : règles lisibles (`scripts/tag-rules.ts`, mini-DSL `kw\`a | b* | phrase c\``, mots entiers, tirets gérés : « mer » ≠ « outre-mer ») sur titre (poids 3) + paragraphes + propositions ; seuil 2 points (3 pour les mots-clés ambigus) et ≥ 25 % du meilleur tag du même vocabulaire, max 6 par vocabulaire ; repli thème jamais déclenché. Sur-appariements corrigés en calibration (secte*→secteur, métro*→métropole, zoo*→zoonoses…). — VÉRIFIÉ
- **Vocabulaires fermés** : 32 situations de vie (élève, étudiant·e, jeune 18-30, salarié·e, indépendant·e, fonctionnaire, chômeur·se, retraité·e, aidant·e, handicap, malade, femme, LGBTQIA+, locataire, propriétaire, agriculteur·rice, Outre-mer, rural, quartiers populaires, personne étrangère, victime de discriminations, précarité, artiste, sportif·ve, chercheur·se, soignant·e, policier·ère, militaire, consommateur·rice, victime / justiciable…) et 44 thèmes terrain (pouvoir d'achat, salaires, retraites, logement, santé, école, recherche, espace, écologie, énergie, transports, sécurité, justice, immigration, Europe, international, défense, démocratie, territoires, fiscalité, travail, entreprise, finance, services publics, culture, sport, numérique, alimentation, eau, mer, animaux, laïcité, égalité F-H, LGBTQIA+, handicap, jeunesse, famille, grand âge, protection sociale, discriminations, libertés, médias, consommation, Outre-mer).
- **Résultat** : 89/89 sections avec ≥ 1 thème (moyenne 2,33, max 6) ; 0,90 situation par section, **34 sections sans situation de vie** (institutionnelles, financières, internationales, écologiques ; liste dans `meta.sections_without_life_situation`) ; 12 thèmes utilisés une seule fois. — VÉRIFIÉ
- **Échantillon 10 % à relire** (une section sur dix en ordre de lecture, 9 sections, `meta.review_sample`) : `c1-s01` (démocratie / institutions, aucune situation) · `c4-s01` (femme, LGBTQIA+ ; 5 thèmes) · `c6-s01` (fiscalité, finance) · `c7-s06` (justice) · `c8-s07` (salarié·e, malade ; travail) · `c11-s01` (salarié·e, artiste ; culture) · `c14-s01` (Outre-mer, victime ; écologie, entreprise) · `c16-s01` (Europe, international, défense) · `c16-s11` (international). **Relecture humaine non faite** (§11.7) — HYPOTHÈSE sur la qualité tant qu'elle n'est pas faite.

---

## 9. Re-crawl hebdomadaire hors Worker

| Élément | Comportement | Statut |
|---|---|---|
| `scripts/ingest.ts --out <chemin>` | écrit le candidat et ses compagnons `<stem>.hashes.json` / `<stem>.badge.json` à côté, jamais dans `data/` ; `expected-invariants.json` reste celui du dépôt ; flags inconnus refusés (`parseArgs` strict) | VÉRIFIÉ |
| `scripts/diff.ts <candidat> [--out <md>]` | compare au couple commité (`aec-2025.json` + `hashes.json`, erreur si incohérents ou si `corpus_version` ne se recalcule pas) ; diff de sections par id (hash, titre, url, canonicalUrl, chapitre, partie), diff d'items en 4 classes (ajouté / supprimé / modifié / renuméroté), prose d'introduction et de parties, structure, tableau des compteurs ; extraits verbatim de 100 graphèmes ; dernière ligne `AUCUN CHANGEMENT` ou `N SECTION(S) MODIFIÉE(S)` ; codes 0 / 3 / 1 | VÉRIFIÉ |
| Essai à blanc | crawl `--out /tmp/aec-next.json` (116 requêtes) → `diff.ts` code 0, « AUCUN CHANGEMENT » ; candidats synthétiques (1 mesure éditée, 1 insérée, 1 section retirée, 1 ajoutée, intro éditée, 1 titre changé) → code 3, « 5 SECTION(S) MODIFIÉE(S) », classes correctes ; `corpus_version` corrompue, JSON invalide, fichier absent, candidat = référence → code 1 (reproduit aujourd'hui : `DIFF FAILED: … le corpus candidat est le corpus de référence lui-même`) | VÉRIFIÉ |
| `.github/workflows/recrawl.yml` | cron `0 6 * * 1` + `workflow_dispatch` ; `contents: write`, `pull-requests: write` ; groupe de concurrence ; typecheck + tests de fixtures avant crawl ; ingestion vers `$RUNNER_TEMP` (échec = job rouge, `data/` intact) ; diff 0 → rien, 3 → copie des 3 fichiers et `peter-evans/create-pull-request@v7` sur `recrawl/<date>` (titre « Corpus : N section(s) modifiée(s) au <date> », corps = rapport tronqué à 60 Ko avec dernière ligne conservée, rapport complet en artefact `rapport-diff` et résumé de run) ; autres codes → échec bruyant ; YAML validé (PyYAML), étapes shell simulées | VÉRIFIÉ (local) / HYPOTHÈSE (première exécution GitHub) |
| Badge `data/badge.json` | schéma endpoint shields.io, `label` « corpus à jour au », `message` = jour UTC du crawl (`2026-09-07`), couleur `brightgreen` (neutre, pas la charte) ; mis à jour seulement avec un corpus accepté | VÉRIFIÉ |
| Vérification de la PR | une PR ouverte avec `GITHUB_TOKEN` ne déclenche pas les autres workflows : le relecteur lance `verify-corpus.ts` et `ingest.test.ts` sur la branche (`scripts/README.md`) | VÉRIFIÉ (limite GitHub documentée) |

Pré-requis non satisfait aujourd'hui : `data/`, `scripts/`, `.github/` doivent être commités sur `main` (§11.9).

---

## 10. Fichiers produits

| Chemin | Contenu | Licence |
|---|---|---|
| `data/aec-2025.json` | corpus canonique complet (meta, introduction, 4 parties, 18 chapitres, 89 sections), `corpus_version d29c7422004ab27c`, crawlé 2026-09-07T16:30:57Z | CC BY-NC-SA 4.0, attribution « La France insoumise – L'Avenir en commun » (`data/LICENSE`) |
| `data/hashes.json` | 89 empreintes de section + `corpus_version` | idem |
| `data/expected-invariants.json` | compteurs gelés, sections par chapitre, allowlist RSS | idem |
| `data/badge.json` | badge « corpus à jour au 2026-09-07 » | idem (non listé dans `data/LICENSE`, à ajouter) |
| `data/stat-cards.json` | 48 cartes + 6 statistiques de paragraphe, champs loi 77-808 | CC BY-NC-SA 4.0 (`meta.license_fr`) |
| `data/terms-candidates.json` | 187 candidats de glossaire | idem |
| `data/section-tags.json` | 2 vocabulaires, 89 sections taguées, échantillon de relecture | idem |
| `data/livrets-2022.json`, `data/falc-2022.json` | 41 livrets + 13 plans ; 26 sections FALC ; `edition: 2022`, `status_fr` « contexte 2022 » | CC BY-NC-SA 4.0 (`meta`) |
| `data/desintox.json` | 26 idées reçues + catégories | **droits LFI, non CC** (`meta.license_note`) — source citée seulement |
| `data/LICENSE` | notice CC BY-NC-SA du dossier (couvre explicitement `aec-2025.json`, `hashes.json`, `expected-invariants.json`) | — |
| `scripts/aec-types.ts`, `aec-common.ts`, `ingest.ts`, `rss-crosscheck.ts`, `ingest.test.ts`, `fixtures/*.html` | ingestion, types, recoupement, tests | code : `package.json` dit MIT, **aucun fichier LICENSE à la racine** ; fixtures = HTML source CC BY-NC-SA |
| `scripts/verify-corpus.ts` | vérificateur indépendant (porte de CI) | code |
| `scripts/diff.ts`, `.github/workflows/recrawl.yml`, `scripts/README.md`, `.gitignore` | re-crawl hebdomadaire, documentation d'exploitation | code |
| `scripts/derive.ts`, `tag-rules.ts`, `derive.test.ts` | dérivés | code |
| `scripts/fetch-desintox.ts`, `scripts/fetch-livrets-2022.ts` | annexes | code |

Hors périmètre T1 mais présents : `scripts/contrast.ts` (T3, lint corrigé après ce rapport), `design/`, `eval/`, `prototypes/`. Tout typecheck (`npx tsc --noEmit` OK aujourd'hui). — VÉRIFIÉ

---

## 11. Anomalies et points ouverts

| # | Anomalie / point ouvert | Statut | Méthode de levée |
|---|---|---|---|
| 11.1 | **Changement de `corpus_version` en session** (`283b17ac5af46719` → `d29c7422004ab27c`) : cause = `normalizeHtml` retire désormais U+200B/U+FEFF comme `normalizeText` (règle documentée dans `aec-types.ts`) ; seule l'empreinte de `c16-s03` a changé, 0 item de texte modifié, `intro-p03.html` a perdu 2 U+200B | VÉRIFIÉ (comparaison des deux jeux) ; cause PROBABLE (un zéro-largeur dans le HTML de `c16-s03`) | Considérer `d29c…` comme la v1 ; ne plus changer la normalisation sans re-crawl + re-vérification + régénération des dérivés |
| 11.2 | Redirections : liens de nav `/chapitre1/s3/`, `/s4/`, `/s5/` 301 vers les permaliens réels ; toutes les URL sans barre finale 301 vers la forme avec barre | VÉRIFIÉ | Réglé (un saut vérifié, `canonicalUrl` stocké) ; ajouter `c1-s03..s05` à l'échantillon forcé du vérificateur |
| 11.3 | 15 écarts de schéma source, enregistrés verbatim dans `meta.source_anomalies` : 5 `measure_split` (suite d'une mesure publiée en `<p>` : `c1-s03-p02`→m01, `c7-s08-p02`→m02, `c8-s07-p04`→m05, `c10-s03-p02`→**k01**, `c13-s05-p02`→m05), 6 `statistic_as_paragraph`, 2 `heading_paragraph` (`c1-s02-p02`, `-p03`), 2 `prose_after_measures` (`c17-s02-p02`, `-p03`) | VÉRIFIÉ (règles recalculées par le vérificateur, liste identique) | Règle d'affichage : ne jamais montrer un `measure_split` comme argument autonome ; le rattacher à `relatedId` dans le composant (T2/T7) ; signaler au site ? (D0.28) |
| 11.4 | Coquilles source conservées (« œuvre s universitaires » `c10-s03-m01`, « favorables à à » `c1-s04-p02`, virgule doublée dans tous les `<cite>` d'épigraphe) ; espaces NBSP / fines mélangés dans le source, réduits à un espace ASCII dans `text`, conservés dans `html` | VÉRIFIÉ | Fidélité absolue : pas de correction ; typographie française (espaces avant `:;!?`, guillemets) à recomposer côté rendu (T3) |
| 11.5 | Flux RSS : `c10-s01` absent, 4 posts alias périmés, 13 doublons de pagination | VÉRIFIÉ | Allowlist en place ; RSS = contrôle seulement |
| 11.6 | Échantillon du vérificateur fixe (graine 20260907), sans section redirigée ni section à sous-mesures | VÉRIFIÉ | Option `--seed` ou `--sections` + échantillon forcé (`c1-s03`, `c1-s06`, `c17-s01`) |
| 11.7 | Tags : 34 sections sans situation de vie ; qualité non relue | VÉRIFIÉ (compte) / HYPOTHÈSE (qualité) | Relecture des 9 sections de `meta.review_sample` par l'utilisateur (30 min), ajuster `tag-rules.ts`, relancer `derive.ts` |
| 11.8 | Mapping FALC 2022 → 2025 (passages inchangés) non réalisé ; ancres FALC non stables | — | Appariement par empreinte de phrase (n-grammes) entre `falc-2022.json` et `aec-2025.json`, script dérivé, T2 |
| 11.9 | Rien n'est commité ; le workflow suppose `data/` sur `main` ; pas de `LICENSE` racine (package.json : MIT) ; `data/LICENSE` ne cite pas `badge.json` ni les dérivés | VÉRIFIÉ (`git status`) | J1 : commits conventionnels (`feat(corpus)`, `feat(scripts)`, `ci`), `LICENSE` MIT racine, `data/LICENSE` étendu, puis dépôt public (D0.28) |
| 11.10 | Désintox : licence non CC, textes = auto-extraits WordPress (`excerpt_text` tronqués « […] ») ; horodatages sans fuseau | VÉRIFIÉ | T8 : décider « citation + lien » vs reformulation relue ; demander l'autorisation (D0.28, contact numérique LFI) |
| 11.11 | Sondages : aucun média de première diffusion, 45/48 sans commanditaire, échantillons et marges absents ; plus ancien : janvier 2018 | VÉRIFIÉ | T9 : gabarit StatCard avec mentions présentes + « données complètes chez l'institut » ; règle d'âge maximal à trancher avec D0.32 |
| 11.12 | Taille : 142 Ko gzip complet vs cible 80 Ko | VÉRIFIÉ | Script de build runtime (projection sections + chapitres, sans hash/html, minifié), mesure réelle à ajouter aux tests |
| 11.13 | Ids positionnels : une insertion renumérote la suite | VÉRIFIÉ (`diff.ts` le gère) | T4/T9 : URL de partage = `corpus_version` + id, ou id stable = 8 hexa du hash de l'item (à trancher) |
| 11.14 | `scripts/contrast.ts` (T3) cassait `npx eslint scripts` | RÉSOLU (7/9 18:40 UTC, 7 `restrict-template-expressions` corrigés, `npx eslint scripts` passe) | — |

---

## 12. Décisions proposées pour `decisions.md`

Format du journal : `| ID | Date | Décision | Statut | Preuve / source | Impact |`.

| ID | Décision | Statut | Preuve | Impact |
|---|---|---|---|---|
| D1.1 | **Schéma d'identifiants adopté** : `c{N}-s{MM}` pour les sections ; `-p{PP}` / `-k{KK}` / `-m{MM}` / `-m{MM}.s{S}` / `-a{AA}` par nature et dans l'ordre du document ; `part{1..4}-p/-e`, `intro-p{PP}` ; ids positionnels, `diff.ts` classe les renumérotations | DÉCISION (sur pièces) | `data/aec-2025.json` `meta.id_scheme`, `scripts/aec-types.ts`, 1 033 ids conformes (`verify-corpus.ts`) | Toute URL, carte, tag et réponse IA pointe un id ; l'id stable de partage reste à trancher (11.13) |
| D1.2 | **Règle de comptage 831 / 837** : l'app affiche uniquement « 831 mesures » (chiffre officiel, `intro-p04`) ; « 837 propositions extraites (87 + 706 + 44) » et la méthode n'apparaissent que sur la page méthodologie / exactitude avec la `corpus_version` ; texte de référence = `meta.counting_rule_fr` (§3.2) | DÉCISION (sur pièces) | `meta.counting_rule_fr`, `meta.official_count = 831`, `meta.official_count_paragraph_id = intro-p04` | Les chiffres 831 / 837 / 48 peuvent désormais entrer dans les maquettes (condition de sortie T1) |
| D1.3 | **Ingestion et re-crawl hors Worker** : `scripts/ingest.ts` (18 chapitres → `nav.tdm` → sections, UA identifiable, concurrence 4, une passe, 116 requêtes) + `scripts/diff.ts` + GitHub Actions hebdomadaire (lundi 06:00 UTC) ouvrant une PR de diff ; jamais de crawl depuis un Worker, jamais le RSS comme source, jamais de force brute d'URL | DÉCISION (sur pièces) | `scripts/README.md`, `.github/workflows/recrawl.yml`, essai à blanc « AUCUN CHANGEMENT » | Fraîcheur par empreintes SHA-256 (le site n'envoie ni `Last-Modified` ni `ETag`) ; badge « corpus à jour au » |
| D1.4 | **Corpus figé et versionné par hash** : v1 = `corpus_version d29c7422004ab27c` (crawl 2026-09-07T16:30:57Z), 89 empreintes de section dans `data/hashes.json`, 1 033 empreintes d'items ; toute normalisation ou changement de parseur = nouvelle version + re-vérification + régénération des dérivés ; la `corpus_version` figure sur la page méthodologie | DÉCISION (sur pièces) | `verify-corpus.ts` PASS (10/10 sections, `corpus_version` recalculée), `expected-invariants.json` | Les dérivés (`stat-cards`, `terms`, `tags`) portent la version et sont invalidés avec elle |
| D1.5 | **Statut des corpus 2022** : livrets, plans et FALC 2022 sont « contexte 2022 » (`meta.status_fr`) : sources d'appoint pour le glossaire et le registre FALC, **jamais cités comme le programme 2025**, jamais servis à l'IA comme passages du programme ; désintox = source citée avec lien, licence à vérifier avant toute reproduction | DÉCISION (sur pièces) / HYPOTHÈSE (licence désintox) | `data/livrets-2022.json.meta`, `data/falc-2022.json.meta`, `data/desintox.json.meta.license_note` | Fichiers séparés, marqués 2022 ; T2 et T8 s'y réfèrent par citation |
| D1.6 | **Deux fichiers, deux rôles** : `data/aec-2025.json` complet (empreintes, `html`, meta) = référence commitée et offerte (D0.28) ; l'app sert une projection runtime (sections + chapitres, sans hash ni html, minifiée, ≈ 71 Ko gzip) produite au build | DÉCISION (orientation) / HYPOTHÈSE (taille réelle, script à écrire) | §6 : 142 345 o gzip complet (VÉRIFIÉ), 71 024 o projeté (PROBABLE) | Cible « ≤ 80 Ko » du plan reportée sur la projection ; mesure ajoutée aux tests |
| D1.7 | **Vérification adversariale = porte de CI** : `scripts/verify-corpus.ts` (indépendant de l'ingestion, 29 requêtes, échec bruyant) doit passer sur toute PR de corpus ; échantillon à étendre aux sections redirigées et à sous-mesures | DÉCISION (sur pièces) | `scratchpad/verify-report.json` (PASS), auto-test sur copie corrompue | Relecteur humain de la PR hebdomadaire : lance le vérificateur + les tests (limite `GITHUB_TOKEN`) |
| D1.8 | **Anomalies de source affichées selon `meta.source_anomalies`** : un `measure_split` est rendu à la suite de sa mesure (`relatedId`), jamais comme argument ; les `statistic_as_paragraph` sont traitées comme des cartes statistiques ; aucune coquille corrigée | DÉCISION (sur pièces) | §11.3, 15 entrées recalculées par le vérificateur | Composant de rendu T2/T7 ; fidélité absolue maintenue |
| D1.9 | **Cartes statistiques** : 48 cartes + 6 de paragraphe, chacune avec organisme et mois/année quand présents et la liste `legal_77_808.missing` ; la carte `c13-s03-a02` (votation) n'est pas un sondage et sort du jeu « Devine le % » | DÉCISION (sur pièces) / HYPOTHÈSE (gabarit légal, T9) | `data/stat-cards.json` `meta.legal_77_808_fr` | Rattache D0.20 et D0.32 (âge des sondages : 2018 → 2024) |
| D1.10 | **Dérivés sans IA, déterministes, relus** : termes candidats et tags produits par règles (`derive.ts`, `tag-rules.ts`), relecture humaine des 9 sections `review_sample` et du top 60 des termes avant tout usage en T2 | DÉCISION (méthode) / HYPOTHÈSE (résultat de relecture) | `data/terms-candidates.json.meta.method_fr`, `data/section-tags.json.meta.method_fr` | Le glossaire T2 part de 187 candidats sourcés, dont 7 amorces absentes à reformuler d'après le texte 2025 |

Actions ouvertes à reporter dans `decisions.md` : commit + `LICENSE` racine + `data/LICENSE` étendu (11.9) ; relecture des tags (11.7) ; mapping FALC (11.8) ; script de projection runtime (11.12) ; échantillon forcé du vérificateur (11.6)  ; ~~eslint de `contrast.ts` (11.14)~~ fait.
