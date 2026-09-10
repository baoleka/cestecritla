# `/q/` — F2 « Laquelle est ici ? » (niveau 2, aucun état)

> Module du prototype cliquable J3 (`proto.cestecritla.fr/q/`), finaliste F2 de `docs/discovery/07-mecaniques.md` §8.3 et §9.2 (D5.6, D5.7, D5.12). Socle commun de `prototypes/proto/` (direction A, hybride D3.9, `shared/ui.js`). Produit le 9 septembre 2026.
>
> Captures : `docs/discovery/captures/2026-09-10/proto/q/` (390 × 844 @2×, clair et sombre, page entière `.full.png`, carte 1200 × 630, `report.json`, `SHA256SUMS.txt`), script `docs/discovery/captures/2026-09-10/proto/capture-q.mjs`.
>
> Statut : **prototype** (HYPOTHÈSE de forme, à juger par les personas-agents de la session 2, D11.1). Tout texte du programme est VÉRIFIÉ : résolu par identifiant dans `shared/data/slim.json`, jamais recopié.

## 1. Routes et état

| Route | Rôle |
|---|---|
| `/q/?s=<section>` | La question pour une section (`^c\d{1,2}-s\d{2}$` et présente dans les 89, sinon « Cette section n'existe pas. ») ; défaut `c12-s01`. Production : `/q/<section>` (D5.10) |
| `/q/?s=<section>&from=link` | Variante **arrivée par lien** (D3.12) : kicker « Extrait de L'Avenir en commun, édition 2025 », aucune navigation, « Ces trois passages viennent du livre officiel. », ligne d'indépendance et confidentialité à l'impersonnel sous le bouton. C'est l'URL envoyée par « Envoyer cette question » |
| `/q/card.html?s=<section>` | Aperçu HTML de la **carte de partage 1200 × 630** pré-générée au build en production (satori). Sur une section sensible : carte de section standard `/s/` |
| `/section/?id=<s>&back=/q/?s=<s>&backLabel=Retour à la question#<mesure>` | Le `SectionVerbatim` atteint par « Lire la section » ou « Y aller » (lecteur existant, mesure ciblée, lien de retour) |

**Aucun état** : la révélation n'est jamais encodée (le lien est identique avant et après le tap), rien n'est écrit en `localStorage` (vérifié dans `report.json`, `localStorageKeys: []` sur toutes les captures `/q/`), aucune requête réseau hors les fichiers statiques du prototype (`external: []`). Le seul paramètre en plus de `s` est `from=link`, un mode d'entrée, pas une trace de l'expéditeur.

## 2. L'écran

1. Titre « Laquelle est ici ? » (Public Sans 900 italique capitales, deux lignes décalées), étiquette « Section · Chapitre 12 », titre de section **sans troncature**.
2. La ligne « Les trois sont dans le programme, mot pour mot. Une seule est dans cette section. » **au-dessus** des options (§7.3, chasseur de captures).
3. Trois options **A / B / C**, chacune un `<button>` entier (≥ 97 px de haut, cible unique), en langage verbatim (Gowun Batang sur Violet 100, filet Violet, étiquette « Texte du programme »). Aucune localisation avant le tap. Ordre A/B/C tiré par la graine (sur `c12-s02`, la mesure « ici » est en C).
4. « Passer » (bouton texte) révèle **sans choisir** ; « Lire la section » (secondaire, bloc flèche) ouvre le lecteur sans révéler. Aucun chrono, aucun retour avant le tap.
5. **Révélation** (tap sur une option, « Passer », ou Entrée au clavier) : la mesure « ici » reçoit le contour Violet du lecteur et « C'est la mesure 3 de cette section. » (numéro calculé depuis le corpus, « mesure clé » pour une `key_measure`) ; chaque leurre reçoit « Celle-ci existe aussi, mais ailleurs : « Faire le service public de la petite enfance », chapitre 5. » et « Y aller » vers ce verbatim ciblé. Le retour de l'option touchée est annoncé (`role="status"`) et reçoit le focus. Les trois boutons sont désactivés ; aucun score, aucun « bravo », aucun rouge, aucun mot de jeu.
6. **Résultat** : « Lire la section » devient le bouton principal (Rouge, seul CTA primaire de l'écran, 1 tap vers le `SectionVerbatim` avec la mesure ciblée et « Retour à la question ») ; « Envoyer cette question » (groupe de partage D3.9 : Web Share → copie → `wa.me`, texte « Trois mesures du programme, toutes vraies. Une seule est dans cette section : » + `/q/?s=…&from=link`) ; « Une autre section ? » → « Section suivante » (la question de la section suivante dans l'ordre du livre, titre affiché ; « Lire le programme » après la dernière).
7. Sur une **section sensible** (liste §7.11 règle 11, D5.12) : la question est posée quand même, les leurres viennent du quotidien, mais « Envoyer » envoie le lien de section standard et `card.html` dessine la carte de section (jamais de carte `/q/`).
8. Jamais de carte « À savoir » sur `/q/` ni sur la carte : elles vivent dans le `SectionVerbatim` sous le gabarit 77-808 (D5.5 ; `c12-s01-a01` avec sidecar visible dans `q3b-section`).

Motion : apparition du retour en opacité + 4 px (200 ms, `--d-base`), appui `data-motion="press"` (120 ms) et fondu du contenu via `shared/motion.js` ; tout à 0 ms sous `prefers-reduced-motion` (vérifié : opacité 1 immédiate). Aucun swipe (D5.9). Clavier : Tab / Entrée sur chaque option et sur « Passer », focus visible 3 px.

## 3. Les triplets : `shared/data/quiz-triplets.json`

Généré par `node prototypes/proto/scripts/build-triplets.mjs` (racine du dépôt) à partir de `slim.json`, `data/section-tags.json` et `data/riposte.json` ; **seuls des identifiants** voyagent (`options: [idA, idB, idC]`, `here`), la page résout les textes par id. 89 triplets, graine `j3-2026-09-10`, version du corpus `d29c7422004ab27c`.

Règles appliquées (chacune est un test de build, un échec arrête le script) — §7.3, §7.11 règle 1, §8.3 :

- l'option « ici » est une `key_measure` ou une `measure` de la section, autoportante : pas d'item finissant par « : », « ; » ou « , », pas de tête de `measure_split` (item à sous-mesures), pas de démonstratif sans antécédent (« cette », « ces », « ce » + nom), pas d'item coupé sur un mot-outil (coquilles source `c1-s03-m01` « … notamment en », `c10-s03-k01` « … pour une », D1.8) ;
- les deux leurres sont des mesures réelles d'autres sections du pool **« vie quotidienne »** (46 sections, 217 mesures) : situation de vie ou thème salaires, logement, santé, école, transports, consommation, sport, culture, eau, alimentation ; jamais international / paix, immigration / asile, sécurité / police, défense, laïcité, LGBTQIA+, jamais `c15-s03`, jamais une section sensible ;
- chapitre différent de la section et entre les deux leurres ; même partie ou partie voisine ;
- Jaccard (ensembles de mots normalisés) < 0,4 entre deux options (maximum observé 0,133) ; aucune paire dans la même objection de `riposte.json` ;
- options ≤ 140 caractères quand la section le permet (4 sections n'ont qu'une mesure autoportante plus longue, dont `c5-s03-k01` à 346 caractères) ;
- tirage et ordre A/B/C par graine déterministe (FNV-1a de « version : section : graine », mulberry32), identiques pour tout le monde ;
- `c12-s01` et `c12-s02` sont **composés à la main** selon §9.0 (`c12-s01-m03` / `c5-s02-m06` / `c18-s01-m02` dans l'ordre de §9.2, `c12-s02-m08` / `c8-s02-m02` / `c16-s12-m02` en ordre tiré). Le tagueur mécanique marque `c18-s01` et `c16-s12` « international / paix » ; la revue humaine de §9.0 les a jugés quotidiens (lycée de la mer, Erasmus francophone) : pour ces deux triplets seul le filtre de thème est levé, les règles dures restent vérifiées.

**HYPOTHÈSE** : les 87 triplets tirés ne sont pas relus (« légende hostile possible ? », §8.3 : revue humaine au build de la v1, échec = graine suivante). `meta.review_fr` le dit dans le fichier.

## 4. Chaînes proposées (v0.2, à juger T9 / T11)

`Q_STRINGS` dans `q.js` (et `STRINGS` dans `card.js`) : `q.title`, `q.section_label`, `q.rule`, `q.here` / `q.here_key`, `q.elsewhere` (« Celle-ci existe aussi, mais ailleurs : « {section} », chapitre {chapter}. »), `q.go` (« Y aller »), `q.revealed` (« Voici où est chacune. », après « Passer »), `q.another`, `q.next_section`, `q.share`, `q.share_text`, `q.link.hint` (« Ces trois passages viennent du livre officiel. »), `q.back_label`, `q.card.*` (titre de carte, attribution en deux lignes §7.11 règle 3). Le kit v0 fournit « Passer », « Lire la section », « Texte du programme », « Copier le lien », la ligne d'indépendance, `privacy.no_account_impersonal`.

## 5. Vérifications (9/9/2026, Playwright Chromium, `report.json`)

- 22 rendus mobiles + 4 cartes : **0 requête externe, 0 erreur console**, `scrollWidth = 390`, **un seul `box-shadow`** par écran (wordmark), polices Public Sans droite + italique et Gowun Batang 400 chargées en local.
- Contraste (paires texte / fond mesurées) : clair Charbon / Crème 15,45, Violet / Crème 11,62, Violet / Violet 100 10,63, Charbon / Violet 100 14,13, Crème / Rouge 5,10, Rouge / Crème 5,10 (« LÀ ») ; sombre Crème / Charbon 15,45, Violet 200 / Charbon 10,80, Violet 200 / #2C2E2B 9,34, Crème / #2C2E2B 13,36, Charbon / Vif jaune 10,09, Charbon / Violet 200 10,80. Aucune vive en texte, aucun Violet sur Charbon.
- Cibles : options 97 à 122 px de haut, boutons ≥ 52 px, liens texte ≥ 24 px ; seule exception « en ligne » (WCAG 2.5.8) : le lien de licence dans la phrase d'attribution, comme sur les autres modules.
- Bas de l'option A à **446 px** (arrivée directe) et **470 px** (par lien) : le geste est dans les 600 premiers px (correction 7).
- Poids : `q.js` 12,3 Ko brut (4,5 Ko gzip), `q.css` 3,5 Ko, `quiz-triplets.json` 11 Ko (2,5 Ko gzip, chargé après le HTML).

## 6. Ce qui reste ouvert

- Le `SectionVerbatim` est atteint par navigation (lecteur `/section/` avec retour) plutôt que rendu sous la question : l'aha « les trois sont vraies, et je sais où est chacune » se joue sur `/q/`, la lecture sur `/s/` ; une variante « section dépliée sous la question » reste possible si le test 2 montre que le tap « Lire la section » est perdu.
- Les chapitres sous A/B/C sur la carte 1200 × 630 (§9.2 « A/B/C verbatim avec chapitre ») réduisent l'écart de curiosité quand le titre nomme un chapitre reconnaissable ; à trancher au canvas.
- « Passer » révèle sans choisir (rien n'est bloqué) ; si les testeurs y lisent « section suivante », le libellé change (D5.9, HYPOTHÈSE).
- La consigne du canvas (« 2 réelles de cette section, 1 d'ailleurs ») contredit §9.2 (1 ici, 2 ailleurs) ; le module suit §9.2 et §9.0.
- Le rendu client du premier écran (comme `link/`) : pré-rendu au build en T7 (P1 / P3).
