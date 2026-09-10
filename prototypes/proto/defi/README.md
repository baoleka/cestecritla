# `/defi/` — F1 « Tu savais que c'était dedans ? » (niveau 3)

> Prototype cliquable J3 du finaliste F1, construit le 9 septembre 2026 **exactement selon `docs/discovery/07-mecaniques.md` §9.1** (fiche §8.4, red team §7.6, règles transverses §7.11, D5.7-D5.9). Socle commun `../shared/` (direction A hybride D3.9, registre tu D3.12, aucun réseau hors fichiers statiques, aucun `localStorage` dans ce module). Statut : **HYPOTHÈSE de forme** à juger par les personas-agents de la session 2 (D11.1). Tout texte du programme est VÉRIFIÉ : tiré par identifiant du corpus `d29c7422004ab27c`, jamais recopié.
>
> Captures : `docs/discovery/captures/2026-09-10/proto/defi/` (390 × 844 @2×, clair `.png` et sombre `.dark.png`, page entière `.full.png`, `carte-1080x1920.png`, `report.json`, `SHA256SUMS.txt`) produites par `docs/discovery/captures/2026-09-10/proto/capture-defi.mjs`.

## 1. Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Coquille : wordmark (seul bloc 3D de l'écran), conteneur `#app`, pied avec ligne d'indépendance (D0.14), ligne « pas de compte » et attribution CC ; `og:title` « 5 mesures du programme. Tu savais que c'était dans le programme ? » (texte seul : l'aperçu OG par tirage se pré-génère au build, T7) |
| `defi.js` | Mécanique : résolution de l'index, état dans le fragment, écrans 0 → 4, variante « lien avec `#r=` », chaînes `play.*` (proposition v0.2) |
| `card.js` | Carte 1080 × 1920 dessinée dans un canvas client (coupe 53/47, titre en blocs à lignes décalées avec l'unique ombre pleine, mosaïque, bande de signature avec attribution en deux lignes) |
| `defi.css` | Scène de carte (glissement dirigé ≤ 200 ms, transform + opacité, rien sous `prefers-reduced-motion`), deux boutons de réponse de poids égal, indicateur de position, mosaïque, aperçu de la carte |
| `defis.json` | **Table publiée** des tirages : 3 jours (253, 254, 255 = 10, 11, 12 septembre 2026) × 5 identifiants ; `default` = 254 ; critères et statut dans `meta` |
| `../scripts/check-defis.mjs` | Test de build de la table (§7.11 règles 1, 2, 5, 11) : ids présents, ≤ 130 caractères, aucun deux-points, aucun `measure_split`, aucune section sensible, aucun id de `riposte.json`, ≤ 1 forme interdictive, 4 parties, 5 chapitres distincts, date = jour de l'année |

## 2. Routes et état (§9.1 « Encodage d'état »)

- **`/defi/?n=<index>`** : `n` validé par `^\d{1,4}$` **et** présent dans `defis.json` ; sinon **tirage du jour** = entrée du jour (`effectiveDate()`, jour de l'année) si elle est publiée, sinon `meta.default` (254). Un `n` inconnu est réécrit vers l'index réellement joué (`history.replaceState`) pour que le lien de partage soit rejouable. Le chemin est `?n=` et non `/defi/254` parce que le prototype est un Worker « assets seuls » (`html_handling: auto-trailing-slash`) ; la route de production `/defi/<n>` est dans la table D5.10.
- **`#r=<5 caractères dans {s, d, p}>`** : les réponses **de l'expéditeur**, présentes seulement sur le lien « Comparer nos découvertes ». Tout autre contenu (longueur ≠ 5, autre lettre) est ignoré. Elles restent masquées jusqu'au résultat.
- **`#p=<0 à 5 caractères dans {s, d, p}>`** : les réponses **du joueur** au fil des cartes (proposition du prototype, absente de §9.1). Nécessaire parce que l'état ne vit que dans l'URL : reprise à la carte 3 après « Lire la section » (`section/?back=/defi/?n=254#p=sd&backLabel=Reprendre le tirage (3/5)`), rechargement du résultat. **Jamais dans un lien de partage** : « Et toi ? » envoie `/defi/?n=254` nu, « Comparer » envoie `#r=<p>`.
- Rien d'autre n'est accepté (pas de date, pas de nom, pas de jeton) ; `?date=` et `?silence=1` sont les stubs de démonstration communs au prototype (D0.24) et ne font pas partie d'un lien de défi.
- **Aucun `localStorage`** (le geste « Garder sur ce téléphone » n'est pas testé le 11/9, §9.1).
- **Arrivée directe vs par lien** : convention du prototype, `?n=` absent = tuile de l'accueil (pas de ligne de contexte), `?n=` présent = lien reçu (ligne de contexte à l'impersonnel, D3.12). HYPOTHÈSE : en production l'aperçu OG et l'entrée par tuile peuvent porter un marqueur plus sûr.

## 3. Les écrans (captures `defi/`)

| Écran | Capture | Contenu | Vérifié (`report.json`) |
|---|---|---|---|
| **0 — Écran 0** | `ecran0.png` (par lien), `ecran0-direct.png` (direct, `?date=2026-09-11`) | Ligne de contexte impersonnelle « Quelqu'un partage 5 mesures de L'Avenir en commun 2025, le programme. » (par lien seulement), kicker « Tirage du 11 septembre », titre « Tu savais que c'était dedans ? », « 1 / 5 », carte `c9-s01-m04` en Gowun Batang avec « Chapitre 9 › Créer un état d'urgence sociale » et « Lire la section », **deux boutons de poids égal** « Je savais » / « Je découvre » (56 px) + « Passer » (bouton texte 44 px, D5.9 : aucun glissement), « 5 mesures · 1 min · rien à saisir », pied « projet militant indépendant » | bas des boutons à **488 px** (lien) / 435 px (direct) ; ligne d'indépendance visible sans défiler (673 px) |
| **1 — 10 s** | `10s.png` | Carte 2/5 `c7-s04-m05`, « 2 / 5 » (position, jamais un score), glissement dirigé de 200 ms (paliers fixes sous `prefers-reduced-motion`) ; URL `#p=s` | idem |
| **2 — Aha** | `aha.png` (mesure ciblée), `aha-savoir.png` (À savoir), `aha-haut.png`, `aha.full.png` | Depuis la carte 3, « Lire la section » ouvre `section/?id=c14-s02#c14-s02-m09` : chapeau, mesure clé, 18 mesures, `c14-s02-a01` sous gabarit 77-808 avec la ligne du sidecar (Harris Interactive pour La France insoumise, 9-12 juillet 2021, 1 241 personnes), « Vérifier à la source », jauge + Marcheuse, bouton **« Reprendre le tirage (3/5) »** qui revient à `/defi/?n=254#p=sd` | 0 erreur, 0 requête externe |
| **3 — Résultat** | `resultat.png`, `resultat.full.png`, `resultat-zero.png` | Titre **« 3 mesures qui m'ont surpris·e »** (celles marquées « Je découvre ») avec verbatims, chapitre › section et « Lire la section » ; mini-mosaïque des 18 chapitres, ceux des découvertes allumés (l'information est dans l'`aria-label`) ; **« Et toi ? »** (feuille de partage, lien nu) + « Voir la carte » ; **« Comparer nos découvertes »** (« Ce lien contient tes 5 réponses. », `#r=`) ; « Encore ? » (tirage publié suivant) ; « Lire le programme » ; annexe « Le tirage du 11 septembre » (les 5 verbatims, sans marque de statut). Sans découverte : « Tu connaissais les 5. En voici 5 autres ? ». **Aucun compte « je savais », aucun « sur 5 »** (`hasDenominator: false` sur les 20 rendus) | 1 seul bloc 3D, paires AA seulement |
| **4 — Carte** | `carte.png`, `carte-1080x1920.png` | Canvas 1080 × 1920 : « TIRAGE DU 11 SEPTEMBRE », les 3 verbatims (Gowun Batang sur Violet 100, chapitre › section), titre « 3 MESURES / QUI M'ONT / SURPRIS·E » en blocs Violet chevauchant la frontière 53/47 avec l'unique ombre pleine, mosaïque, « ET TOI ? » + « Lire le programme » + URL `/defi/?n=254` sans réponses, bande de signature (wordmark + attribution en deux lignes). Texte WhatsApp de repli sans emoji : « Tirage du 11 septembre : 3 mesures du programme qui m'ont surpris·e. À toi : <lien> ». Boutons : « Envoyer l'image » (Web Share avec fichier, si disponible), « Enregistrer l'image », « Envoyer sur WhatsApp » / « Copier le lien ». Sans découverte : variante « chapitres sans les textes » (écart de curiosité) | palette claire fixe |
| **Variante lien avec `#r=`** | `lien.png`, `lien-resultat.full.png` | Écran 0 : « Quelqu'un a joué ce défi. Ses découvertes s'affichent après les 5 réponses, jamais avant. » ; résultat : bloc **« Vous avez découvert 2 mesures en commun »** (verbatims), jamais de score ni de gagnant ; « Et toi ? » régénère `/defi/?n=254` sans `#r=` | bas des boutons à 506 px |
| Silence électoral | `silence.png` | `?silence=1` : les deux feuilles de partage affichent « Le partage reprend à dimanche 20 h », « Voir la carte » disparaît, lecture et jeu maintenus | — |

## 4. Table des tirages (`defis.json`)

Composée à la main selon les règles de build (§7.11, §8.4, §9.0), vérifiée par `node prototypes/proto/scripts/check-defis.mjs` (3 tirages, 0 violation le 9/9/2026). Statut **HYPOTHÈSE** : en production, permutation semée par version du corpus + `effectiveDate()`, relue D0.27 par tranche de 30 jours.

| Index | Date | Identifiants | Parties |
|---|---|---|---|
| 253 | 10 septembre | `c5-s02-m06`, `c1-s04-m12`, `c15-s04-m07`, `c16-s12-m02`, `c8-s02-m02` | 2, 1, 3, 4, 2 |
| **254** | **11 septembre** | `c9-s01-m04`, `c7-s04-m05`, `c14-s02-m09`, `c18-s04-k01`, `c3-s02-m03` (**§9.0**) | 2, 2, 3, 4, 1 |
| 255 | 12 septembre | `c7-s04-m09`, `c18-s01-m02`, `c15-s01-m06`, `c11-s02-m06`, `c1-s04-m01` | 2, 4, 3, 2, 1 |

Écart consigné : §8.4 cite `c10-s01-m09` (ménopause) dans « le reste du pool », mais `c10-s01` figure dans la liste des sections sensibles de §7.11 (règle 11) ; l'id est donc exclu ici et le test de build le refuserait. `c12-s02-m08` (deux-points) et `c12-s01-k01` (162 caractères) sont exclus par le filtre mécanique.

## 5. Chaînes proposées (`play.*`, v0.2, à juger T9 / T11)

Dans `defi.js` (`STRINGS`), en plus du kit : `play.title` (= `home.hook.did_you_know`), `play.knew` « Je savais », `play.discover` « Je découvre », `play.skip` « Passer », `play.meta` « {count} mesures · 1 min · rien à saisir », `play.link.context` / `play.link.context_played` (impersonnel, D3.12), `play.resume` « Reprendre le tirage ({n}/{total}) », `play.result.title_many` « {count} mesures qui m'ont surpris·e », `play.result.none` « Tu connaissais les {count}. », `play.result.common_*`, `play.result.share_lead` « Ce lien envoie le tirage du {date}, sans tes réponses. », `play.result.compare_lead` « Ce lien contient tes {count} réponses. », `play.share.text*`, `play.card.attribution_1/2`. Reformulation de secours si ≥ 2 confusions « opinion » sur 3 (§9.1) : « Je le savais » / « Je l'apprends » (à basculer dans `STRINGS`).

## 6. Ce qui reste ouvert

1. La consigne de construction résumait le résultat par « X découvertes sur 5 » ; §9.1 et D5.8 (règle 4) interdisent le dénominateur sur tout artefact personnel : le prototype affiche « 3 mesures qui m'ont surpris·e » et la liste des 5 en annexe, **jamais « sur 5 »**. À confirmer avec l'utilisateur.
2. `#p=` (réponses du joueur dans le fragment) est une extension du prototype ; l'alternative (état en mémoire seulement) casserait la reprise depuis le lecteur de section.
3. Paliers « Encore ? » 12 puis 36 sans partage : non prototypés ; « Encore ? » ouvre l'entrée publiée suivante de la table (255), qui reste partageable parce qu'elle est un tirage relu.
4. Aperçu OG par tirage (1200 × 630, « 5 mesures du programme… » avec les chapitres) : à pré-générer au build (T7) ; ici une seule balise `og:title` textuelle.
5. Web Share avec fichier (« Envoyer l'image ») n'est vérifiable que sur téléphone ; sur Chromium de bureau le prototype retombe sur « Enregistrer l'image » + WhatsApp / copie.
6. `section/section.js` : la regex de `?back=` accepte désormais `&` dans le fragment (`#r=…&p=…`), seule modification du socle.
