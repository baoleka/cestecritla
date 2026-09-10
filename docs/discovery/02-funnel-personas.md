# 02 — Funnel et personas (T2)

> **Ce que fait ce document.** Il transforme les sept fiches de `eval/personas.json` en personas produit utilisables pour décider, et il déroule l'arc d'usage **0 s → 10 s → 3 min → partage** écran par écran, avec les chiffres réellement relevés. Il ne rouvre aucune décision : il rend lisible, pour chaque profil, ce qui doit être vrai à chaque pas pour que la métrique nord (D5.1) monte.
>
> **Sources.** `eval/personas.json` (fiches, `meta.grid_columns`) ; `13-tests-humains.md` §1 (session 1, 9/9, captures statiques des maquettes) et §3 (session 2, 9/9 au soir, prototype intégré déployé `proto.cestecritla.fr`, archive `captures/2026-09-10/session2/`) ; `07-mecaniques.md` §1 (métrique nord) et §5.2 (seuils) ; `design/strings.json` v0.3 ; `design/perf-budget.md` §5.8.
>
> **Statuts.** D11.1 : les deux sessions ont été jouées par des **personas-agents**, pas par des humains. Règle appliquée ligne à ligne : ce qui a été **mesuré par Playwright ou Lighthouse** (taps, positions en px CSS, millisecondes, débordements, contenu de `localStorage`, niveau de partage déclenché) est **VÉRIFIÉ** ; ce qu'un agent **déclare** (secondes « jusqu'à comprendre », préférences, votes, verbatims) est **HYPOTHÈSE (personas, D11.1)** et doit être confirmé par le test humain d'avant lancement (`13-tests-humains.md` §4, `testeurs.md`).
>
> **Décalage à garder en tête.** Les chiffres de la session 2 ont été relevés sur le prototype **avant** les 19 corrections de `13-tests-humains.md` §3.11. Plusieurs sont déjà passées dans `design/strings.json` v0.3 (`home.link.cta_primary` = « Lire la section » ; « munition » et « mode riposte » retirés du kit ; `silence.reason` ; `search.no_results` qui n'accuse plus la personne). Les chaînes citées ici sont celles de v0.3 ; les temps et les taps sont ceux d'avant correction.

---

## 0. Le funnel en une page

L'app n'a pas un entonnoir mais **deux entrées et une boucle** (D0.19) :

| # | Étape | Qui | Écran / objet | Événement Analytics (D5.1) |
|---|---|---|---|---|
| 1 | Le militant trouve la phrase exacte | M1-M4 (P0) | `/home/` direct, recherche locale, `riposte/` | `session_start` `entry = home` |
| 2 | Il l'envoie | M1-M4 | kit de partage (`share.button`, `share.button_copy`) | `share_open` |
| 3 | Un proche ouvre le lien sans contexte | N1-N3 et M1-M4 entre eux (P1) | `/link/?id=…`, `/defi/`, `/q/` | `session_start` `entry = deep` + `landing_kind` |
| 4 | Il atteint le texte du programme | tous | `SectionVerbatim` | `section_verbatim_view` (**numérateur de N**) |
| 5 | Il comprend | tous | carte-concept (`concept.label.plain` « En clair »), recherche | `play_to_read` si arrivé par un jeu (**S**) |
| 6 | Il renvoie, et devient l'étape 1 de quelqu'un d'autre | surtout M3, N1, N3 | lien nu du tirage, `q.share`, `measure.share` | `share_open` |

Le pas 3 est le **cas majoritaire** (D0.4) et le pas 4 est celui que la métrique nord compte. Les pas 1, 2 et 6 ne sont pas mesurés par N : ils le nourrissent.

---

## 1. Les sept personas

Vue d'ensemble (fiches `eval/personas.json` ; le « budget d'attention » est déclaré par la fiche, donc HYPOTHÈSE (personas)) :

| # | Persona | Âge | Rôle funnel | Appareil et entrée | Budget d'attention déclaré | Ce qui le fait fermer, en un mot |
|---|---|---|---|---|---|---|
| M1 | **Camille**, infirmière, groupe d'action du 20e | 34 | militant P0, émetteur | Galaxy A54 (Android 14), Chrome, WhatsApp / Instagram | 10 s pour trouver « une munition » (mot de la fiche) | pas de bouton « Envoyer » sous le pouce |
| M2 | **Karim**, professeur d'histoire-géo, militant depuis 2017 | 45 | militant P0, **juge éliminatoire** | iPhone 13 (iOS 18), Safari, WhatsApp / Telegram | 5 s pour juger « honteux à partager » | une mesure introuvable dans le livre |
| M3 | **Léa**, étudiante en droit, CM bénévole | 24 | militant P0, relais 18-30 | iPhone 15 (iOS 18), Instagram / TikTok / WhatsApp | moyenne, exige beau et rapide | un pavé sans bouton, un chiffre de 2021 |
| M4 | **Jean-Marc**, ancien cheminot, groupe rural | 62 | militant P0, accessibilité | Redmi Note 12 (Android 13), police système ≈ 130 % | patient, mais lit mal en dessous de 16 px | une page blanche sans réseau |
| N1 | **Yanis**, étudiant en BTS | 22 | indécis P1, arrivée par lien | Redmi Note 11 (Android 12), Chrome via WhatsApp | 30 s | le vocabulaire de campagne |
| N2 | **Martine**, aide-soignante, vote blanc 2022 | 58 | indécis P1, confiance | iPhone SE 2022 (iOS 17, 375 × 667 pt), Safari via WhatsApp | moyenne, méfiante | être classée, ou ses réponses qui partent seules |
| N3 | **Théo**, apprenti électricien, abstentionniste | 19 | abstentionniste P1, perf bas de gamme | Galaxy A14 (Android 13), navigateur intégré Instagram, 4G moyenne | très courte | du texte en premier, ou 2 s de chargement |

---

### M1 — Camille, la militante pressée (émettrice du funnel)

- **Situation.** Infirmière, groupe d'action du 20e, tient un stand au marché le samedi. Elle est l'utilisatrice principale **et** le canal : la boucle WhatsApp du groupe passe par elle.
- **Appareil et entrée.** Galaxy A54, Android 14, Chrome ; liens ouverts depuis WhatsApp en Chrome Custom Tab (412 × 800 px visibles sous la barre — VÉRIFIÉ, `session2/M1/`), mode sombre le soir.
- **Temps d'attention.** Dix secondes pour trouver une munition, sinon elle ferme (fiche — HYPOTHÈSE (personas)). En session 1 elle a jugé les trois accueils en 3, 4 et 7 s.
- **Ce qu'elle vient chercher.** Un objet propre à envoyer dans le groupe : une phrase du programme, sa source, et un bouton d'envoi. « Le cousin ne peut pas dire que c'est un tract » (session 1, direction A). Sur le prototype : « la munition est envoyable » en sept secondes.
- **Ce qui la fait fermer.**
  - Session 1 : « Ce qui me fait fermer : arriver et ne pas voir Envoyer ou Copier en moins de dix secondes. Sur les trois accueils par lien il n'y a aucun Envoyer visible, et sur la carte progressive il est plié aussi. » Et : « si dans le navigateur de WhatsApp le texte saute pendant que les polices chargent […] je ferme, ça fait pas sérieux. »
  - Session 2 : « un « Envoyer » qu'il faut aller chercher deux écrans plus bas sur le verso riposte, ou une carte de résultat (« 3 mesures qui m'ont surpris·e ») que je ne peux pas poster dans le groupe sans qu'on me la retourne. »
- **Le parcours qui marche pour elle (session 2).**

| Tâche | Temps | Taps → verbatim de section | Statut |
|---|---|---|---|
| Lien WhatsApp → verbatim de section | **7 s** (le plus rapide des sept) | **1** | s = HYPOTHÈSE (personas) / taps = VÉRIFIÉ |
| Réponse à « les impôts vont exploser » | 6 s | 2 | idem |
| Partage depuis une mesure | 4 s | 1 (feuille Android simulée, niveau 1) | idem |
| F1 joué en entier | 45 s | 0 (verbatim déjà à l'écran) | idem |

  Ce qui fait ces sept secondes, mesuré : verbatim de la mesure rendu à **352 ms**, CTA bas à **542 px** donc visible sous la barre WhatsApp, `scrollWidth` 412 (aucun débordement), 0 erreur console — VÉRIFIÉ (`session2/M1/log-A.json`). Puis un tap sur « Lire la section » et le lecteur s'ouvre sur la mesure clé encadrée avec `measure.share` juste dessous.
- **Sa correction n° 1.** « Lire la section » était un lien texte de 34 px de haut alors que c'est son geste principal. Corrigé dans `strings.json` v0.3 (`home.link.cta_primary` = « Lire la section ») et dans la correction 1 de §3.11 ; effet sur son temps : non remesuré — HYPOTHÈSE.
- **Vote de fin de session 2.** Niveau de gamification **1** ; MVP : riposte, recherche, « Tu savais que c'était dedans ? » (« pour les gens du dehors ») — HYPOTHÈSE (personas).

---

### M2 — Karim, le militant sceptique (juge éliminatoire)

- **Situation.** Professeur d'histoire-géographie, militant depuis 2017, connaît l'ancienne identité bleu/ocre. Il ne veut pas être ridicule en salle des profs : c'est lui qui porte le critère « honteux à partager » (D0.32).
- **Appareil et entrée.** iPhone 13, iOS 18, Safari ; liens ouverts depuis WhatsApp et Telegram (SFSafariViewController, 390 × 664 pt visibles, @2× — VÉRIFIÉ).
- **Temps d'attention.** Il prend le temps de lire, mais juge en cinq secondes si c'est honteux (fiche — HYPOTHÈSE (personas)). Il ne réexplique jamais sur une reformulation seule : en session 1, il lit « En clair » puis la mesure clé puis l'extrait d'introduction avant d'accepter (28 s sur l'anatomie dense).
- **Ce qu'il vient chercher.** L'exactitude, vérifiable. Sur le prototype il a comparé une vingtaine de passages au corpus, tous exacts jusqu'aux guillemets — VÉRIFIÉ par script (`c12-s01-k01` et les 11 mesures de `c12-s01` identiques au corpus). Son verdict : « Un tiré à part propre. Je l'envoie à mon cousin sans commentaire. »
- **Ce qui le fait fermer.**
  - Session 1 : « Ce qui me ferait fermer : une réponse de l'IA qui cite une mesure que je ne retrouve pas dans le livre. La mention « elle choisit les passages, elle ne les écrit pas » est la bonne promesse ; si elle est tenue, je reste. »
  - Session 2 : « une mesure affichée que je ne retrouve pas dans le livre — je n'en ai trouvé aucune […] ; une note interne qui fuite en production (le bandeau « D5.11 » sur la laïcité) ; un titre du programme coupé sur une image qui circule (le chapitre 18 sur la carte du défi). »
  - Constante : les étiquettes en capitales de 11 px, « je les lis avec les lunettes : 12-13 px minimum sur iPhone ».
- **Le parcours qui marche pour lui (session 2).**

| Tâche | Temps | Taps → verbatim de section | Statut |
|---|---|---|---|
| Lien WhatsApp → verbatim de section | 24 s (dont la vérification mot à mot) | **1** | s = HYPOTHÈSE (personas) / taps = VÉRIFIÉ |
| Riposte « les impôts vont exploser » | 6 s | 1 | idem |
| F2 « Laquelle est ici ? » | 20 s | 2 | idem |
| F1 joué en entier | **75 s** (35 s sans le détour par la section) | 1 | idem |
| Partage d'une mesure | 10 s | 1 (+ choix du contact) | idem |

  Mesuré : verbatim héros rendu **484 ms** après l'ouverture (TTFB 114 ms), section rendue **1 351 ms** après le tap ; « Lire la section » à y = 677 px, soit 13 pt sous le pli de la barre WhatsApp iOS — VÉRIFIÉ.
- **Ce qui le retient.** L'ordre du gabarit StatCard : « le sondage 83 % de juillet 2021 est daté, sourcé, commanditaire nommé, marge d'erreur : à cette place, après les mesures, je l'accepte. » Et « Ce qu'il vaut mieux ne pas dire » sur le verso des réponses aux objections : « le bloc que j'attendais depuis 2017 ».
- **Sa phrase de synthèse.** « Pour la première fois, je peux tendre mon téléphone à un collègue sans avoir à m'excuser du design. » — HYPOTHÈSE (personas).
- **Vote.** Niveau **2** ; MVP : riposte, « Laquelle est ici ? », recherche.

---

### M3 — Léa, la jeune militante (relais 18-30)

- **Situation.** Étudiante en droit, community manager bénévole du groupe. Elle poste en story ; son public est non politisé.
- **Appareil et entrée.** iPhone 15, iOS 18 ; liens ouverts depuis Instagram et WhatsApp (navigateur intégré, zone visible ≈ 393 × 670 @2× — VÉRIFIÉ).
- **Temps d'attention.** Moyenne, mais un jugement esthétique en 2-3 s : en session 1 elle a tranché la direction B en **2 s** (« ça claque »). Elle lit le verbatim seulement si le titre a accroché.
- **Ce qu'elle vient chercher.** Un objet postable tel quel. Sur le prototype : « la carte 1080 × 1920 violet-lavande : ça, c'est une story » ; et le wordmark « C'EST ÉCRIT LÀ avec le LÀ rouge et l'ombre lavande ».
- **Ce qui la fait fermer.**
  - Session 1 : « j'ouvre depuis Instagram, le navigateur intégré me bouffe le haut et le bas de l'écran, et je tombe sur un pavé sans bouton, la carte dense ou l'accueil A. Si en trois secondes je vois pas un titre qui claque plus un bouton, je swipe. Et un chiffre « juillet 2021 » en gros en 2026, ça fait vieux, je le partage pas. »
  - Session 2 : « taper le gros bouton rouge de l'écran d'arrivée et tomber sur trois écrans de carte-concept avant le premier bouton, ou me retrouver perdue en bas d'une section de 18 mesures avec le bouton « Reprendre le tirage » à 2 700 px au-dessus. »
- **Le parcours qui marche pour elle (session 2).**

| Tâche | Temps | Taps → verbatim de section | Statut |
|---|---|---|---|
| Lien WhatsApp → verbatim de section | 24 s | **2** (chemin naturel : CTA rouge → carte-concept → « Lire la section ») | s = HYPOTHÈSE (personas) / taps = VÉRIFIÉ |
| F1 joué en entier | 70 s | 1 | idem |
| F2 « Laquelle est ici ? » | 35 s | 2 | idem |
| Riposte | **5 s** (le plus rapide des quatre militants) | 1 | idem |
| Partage | 8 s | 2 (`wa.me` puis choix du contact) | idem |

  Mesuré chez elle : chargement **813 ms**, CTA rouge de 508 à 560 px donc visible dans les 670 px du navigateur intégré, mais « Lire la section » à **677 px = 7 px sous le pli** — d'où les 2 taps ; le chemin voulu en coûte 1 — VÉRIFIÉ (`session2/M3/01-03`).
- **Ce qu'elle demande pour la story.** Kicker et attribution dans les 250 px sûrs en haut et en bas (zones recouvertes par Instagram), aucun titre de chapitre tronqué (règle 6), et le PNG partagé par `navigator.share({files})` plutôt que téléchargé — corrections 6 de §3.11.
- **Vote.** Niveau **3** ; MVP : « Tu savais que c'était dedans ? », « Laquelle est ici ? », riposte. (Le niveau 2 l'emporte au vote global, D5.13.)

---

### M4 — Jean-Marc, le militant retraité (accessibilité et hors-ligne)

- **Situation.** Ancien cheminot, anime un groupe d'action rural, distribue des tracts, répond au café. Son cas d'usage P0 est **le marché, sans réseau**.
- **Appareil et entrée.** Redmi Note 12, Android 13, Chrome ouvert depuis WhatsApp ; **police système ≈ 130 %** (393 × 818 px CSS, DPR 2 — VÉRIFIÉ).
- **Temps d'attention.** Patient, lit tout, vérifie les sources. En session 1, il atteint la réexplication en 50 s sur l'anatomie dense, 60 s sur la progressive, **85 s sur l'explorable** — seul dépassement du seuil de 60 s des sept personas.
- **Ce qu'il vient chercher.** Le texte exact sous la main, lisible sans lunettes, et des cibles qu'il ne rate pas. Sur le prototype, avec sa police : verbatim à **27,3 px**, corps 18,2 px, étiquettes 15,6 px — VÉRIFIÉ.
- **Ce qui le fait fermer.**
  - Session 1 : « arriver au marché sans réseau et tomber sur une page blanche. Je veux le texte même sans 4G, comme un tract. […] Et le jour où on me demande de créer un compte ou d'accepter une bannière, c'est fini. »
  - Session 2 : « Page blanche. Là oui, c'est une panne, la vraie, celle qui me fait ranger le téléphone et sortir le tract papier. » Puis : « la page qui se casse avec ma police, parce qu'ici elle se casse un peu » et « les petites cibles soulignées […] qu'il faudrait passer en boutons de 44 pixels ».
- **Le parcours qui marche pour lui (session 2).**

| Tâche | Temps | Taps → verbatim de section | Statut |
|---|---|---|---|
| Lien WhatsApp → verbatim de section | 35 s | **1** (+ 1 défilement) | s = HYPOTHÈSE (personas) / taps = VÉRIFIÉ |
| Riposte | 7 s | 1 | idem |
| F2 | 45 s | 2 | idem |
| F1 joué en entier | **120 s** (il lit chaque carte en entier) | 1 | idem |
| Partage d'une mesure | 20 s | 1 | idem |

  Mesuré : chargement **315 ms** (le plus rapide des sept), 0 erreur console ; hors ligne après un premier chargement, la navigation entre thèmes de réponses tient sans aucune requête ; **au rechargement hors ligne : `net::ERR_INTERNET_DISCONNECTED`, écran blanc** (aucun service worker dans le prototype) — VÉRIFIÉ (`session2/M4/09e`). Défilement latéral mesuré à 130 % de police : `scrollWidth` 404 px (459 px à 150 %) sur `/q/`, `/section/`, `/concept/` — VÉRIFIÉ.
- **Ce qu'il valide.** « Aucun gris clair nulle part, que du Charbon et du Violet sur Crème, j'ai tout lu sans forcer » ; « rien qui bouge tout seul sauf la barre d'entraînement que j'ai demandée » ; « pas de compte, pas de bannière, et une ligne qui le dit ».
- **Vote.** Niveau **2** ; MVP : riposte, recherche, « Laquelle est ici ? ».

---

### N1 — Yanis, 22 ans, non politisé (le destinataire type)

- **Situation.** Étudiant en BTS avec un job à temps partiel, reçoit le lien d'un cousin sur WhatsApp. Il n'a rien demandé.
- **Appareil et entrée.** Redmi Note 11, Android 12, Chrome Custom Tab ouvert depuis WhatsApp (393 × 793 @2×, referer `android-app://com.whatsapp` — VÉRIFIÉ).
- **Temps d'attention.** 30 s ; le jargon fait décrocher immédiatement (fiche — HYPOTHÈSE (personas)).
- **Ce qu'il vient chercher.** De quoi répondre à son cousin, et savoir si ça le concerne (logement, études, transports). Sur le prototype, la recherche « loyer » lui rend 6 passages avec le mot surligné : « ça c'est exactement mon usage ». Et : « la boîte rose « TEXTE DU PROGRAMME » — c'est le vrai texte, pas le résumé d'un mec, donc je peux répondre à mon cousin « c'est écrit là, regarde » ».
- **Ce qui le fait fermer.**
  - Session 1 : « arriver sur un pavé en police de vieux livre avec des codes bizarres partout (« c12-s01-k01 », « intro-p22 »), des étiquettes en petites capitales que je lis pas sur mon tel, et pas de bouton visible. […] Si le premier écran me dit pas « c'est quoi » et « je fais quoi », je reviens sur WhatsApp. »
  - Session 2 : « l'accueil : « TA MUNITION, EN DIX SECONDES. » en 40 px et « RIPOSTE » dans le menu — je comprends que c'est une appli de militants pour clasher, pas pour quelqu'un qui veut juste savoir si ses APL bougent ; je ferme. » Puis : « les mots « section », « tirage », « surpris·e » qui me font douter que c'est pour moi ».
- **Le parcours qui marche pour lui (session 2).**

| Tâche | Temps | Taps → verbatim de section | Statut |
|---|---|---|---|
| Lien WhatsApp → verbatim de section | 28 s | **2** (CTA rouge → carte-concept → « Lire la section ») | s = HYPOTHÈSE (personas) / taps = VÉRIFIÉ |
| F1 joué en entier | 75 s | 0 | idem |
| F2 | 45 s | 0 | idem |
| Partage d'une mesure | 30 s | 1 | idem |

  Mesuré : chargement **1,2 s** en filaire (12 requêtes) ; verbatim de la mesure déjà à l'écran 0 (0 tap) ; CTA de 52 px finissant à 560 px, visible sans défiler. Son aha vient de la carte-concept : « le gros bouton rouge « Comprendre en clair » m'a sauvé : là c'est écrit en trois phrases normales et j'ai capté » — VÉRIFIÉ (positions) / HYPOTHÈSE (compréhension).
- **Sa réexplication (session 1, 66 mots, après l'anatomie progressive, < 60 s).** « En gros, la règle verte c'est : tu prends pas à la nature plus que ce qu'elle arrive à refaire. […] Et ils veulent écrire ça dans la Constitution, donc l'État serait obligé de la respecter, même pour les gros projets. » Fidèle, aucune mesure inventée — HYPOTHÈSE (personas).
- **Conséquence de funnel.** Deux corrections portent son nom : aucun vocabulaire de campagne sur un écran atteignable depuis un lien, et `home.link.cta_secondary` (« Explorer le programme ») qui ne doit **pas** mener à `/home/` (correction 14). `strings.json` v0.3 a retiré « munition » et « mode riposte » du kit.
- **Vote.** Niveau **2** (« garder les deux jeux sans score, virer la mosaïque ») ; MVP : « Tu savais que c'était dedans ? », recherche, cartes-concept.

---

### N2 — Martine, 58 ans, indécise méfiante (la confiance)

- **Situation.** Aide-soignante, a voté blanc en 2022, s'est fait avoir par Elyze. Elle cherche d'abord **qui parle** et **ce qu'on lui prend**.
- **Appareil et entrée.** iPhone SE 2022, iOS 17, écran 375 × 667 pt (**≈ 559 pt utiles** dans le navigateur intégré de WhatsApp — VÉRIFIÉ), texte iOS un cran au-dessus.
- **Temps d'attention.** Moyenne, mais consacrée à la vérification : en session 1, son premier geste est de descendre au pied de page pour trouver « À propos », « Mentions légales », « Code source ».
- **Ce qu'elle vient chercher.** Pouvoir vérifier par elle-même. Ce qui la convainc sur le prototype : « l'adresse du site officiel écrite en entier pour vérifier, le sondage avec sa date et qui l'a payé, « Celle-ci existe aussi, mais ailleurs » au lieu de « faux », et jamais une note sur moi. C'est la première fois qu'un truc politique sur mon téléphone me laisse vérifier au lieu de me classer. »
- **Ce qui la fait fermer.**
  - Session 1 : « Le jour où un curseur ou une question me renvoie un résultat sur moi — « vous êtes plutôt ceci » — je ferme et je supprime, comme avec Elyze. »
  - Session 2 : « mes réponses au défi qui voyagent sans mon accord — et là, elles sont déjà dans la barre d'adresse. Et le jour où on me dit « rien » sur mon propre métier alors que c'est écrit dedans : je repars en pensant qu'ils se moquent de nous. »
- **Le parcours qui marche pour elle (session 2).**

| Tâche | Temps | Taps → verbatim de section | Statut |
|---|---|---|---|
| Lien WhatsApp → verbatim de section | 35 s (dont ≈ 10 s de descente au pied de page) | **2** | s = HYPOTHÈSE (personas) / taps = VÉRIFIÉ |
| F2 « Laquelle est ici ? » | 80 s pour **deux** sections | 2 | idem |
| F1 joué en entier | 100 s | — | idem |
| Refus et écrans dégradés | 90 s | — | idem |
| Partage | 15 s | 1 | idem |

  Mesuré : chargement **1,4 s** ; sur ses 559 pt utiles, le CTA n'est qu'un liseré de 5 px (haut du bouton à 554 px) et les deux phrases qui la rassurent — `independence.line` et `privacy.no_account` — sont **sous le pli** (613-700 px) : la règle « CTA dans les 600 premiers px » ne tient pas à 559 pt — VÉRIFIÉ (`session2/N2/t1-*`).
- **Les deux trouvailles qui lui appartiennent.** (1) Ouvrir `/defi/?n=254#p=dsddp`, l'URL de sa propre barre d'adresse, affiche son résultat chez l'autre : la flèche de partage native contourne le bouton « sans tes réponses » — VÉRIFIÉ ; c'est l'origine de l'abandon de `#p=` (D5.15, correction 4). (2) La recherche répond « Rien avec ces mots » sur « aide-soignante » et « mégabassines » alors que le texte contient « aides-soignants » et « méga-bassines » — VÉRIFIÉ ; « ce n'est pas une panne, c'est pire ». `search.no_results` v0.3 annonce désormais la tolérance pluriel et trait d'union (correction 13).
- **Vote.** Niveau **2** (« jeux sans trace oui, liens porteurs de réponses non ») ; MVP : « Laquelle est ici ? », cartes-concept, recherche.

---

### N3 — Théo, 19 ans, abstentionniste (le premier écran et la perf)

- **Situation.** Apprenti électricien, aucune motivation a priori ; il réagit à une surprise, à un chiffre, à un défi entre potes.
- **Appareil et entrée.** Galaxy A14, Android 13, **navigateur intégré Instagram** (360 × 700 px utiles), 4G moyenne émulée (3 Mb/s, 120 ms) et **CPU ×4**, `navigator.share` retiré — VÉRIFIÉ.
- **Temps d'attention.** Très courte ; le premier écran doit être une image ou un chiffre (fiche). En session 1, seuls deux objets l'ont accroché en moins de 5 s : la pastille « 3 MIN » et les barres de l'explorable.
- **Ce qu'il vient chercher.** Rien, jusqu'à ce qu'un format le retienne. Ce qui a marché : « le défi, une mesure par écran, deux boutons, une minute, et la carte pour la story ». C'est la **seule** mécanique qu'il enverrait.
- **Ce qui le fait fermer.**
  - Session 1 : « Si le premier écran c'est du texte, je ferme. Dans Insta j'ai la barre du haut en plus, donc je vois encore moins. Et si ça charge plus de deux secondes en 4G, je suis déjà retourné sur TikTok. Mettez un chiffre ou un truc qui bouge en premier. »
  - Session 2 : « un pavé de texte en premier écran, la clé brute « error.generic » à la place d'un message quand les données ne chargent pas, ou plus de deux secondes de chargement : je ferme et je retourne sur TikTok. »
- **Le parcours qui marche pour lui (session 2).**

| Tâche | Temps | Taps → verbatim de section | Statut |
|---|---|---|---|
| F1 « Tu savais que c'était dedans ? » joué en entier | **20 s** (le plus rapide des sept) | 1 | s = HYPOTHÈSE (personas) / taps = VÉRIFIÉ |
| F2 | 20 s | 2 | idem |
| Lien → verbatim de section | 25 s | 2 (« deux taps et huit écrans de scroll ») | idem |
| Partage | 10 s | 1 pour copier, 3 via WhatsApp | idem |

  Mesuré sur son profil dégradé : **1,6 s jusqu'au contenu** (FCP 0,64 s, LCP 1,2 s, 184 Ko, 11 requêtes) ; le CTA de 52 px finit à 606 px, donc visible sous la barre Instagram ; le verbatim de la mesure était déjà là « à 2 s » ; boutons de 52 px lisibles, contrastes jaune/charbon et lavande/charbon corrects ; 0 requête tierce — VÉRIFIÉ (`session2/N3/session-log.json`). En 2G, « Chargement… » dure 5,2 s : « pas une panne, mais à 2 s je suis reparti ».
- **La panne qu'il a trouvée.** Avec `slim.json` bloqué, la page affiche la clé brute `error.generic` : cause identifiée dans le prototype (`Promise.all([loadStrings(), loadCorpus()])` rejette avant que les chaînes soient posées) — VÉRIFIÉ. `strings.json` v0.3 fournit `error.data.title` / `error.data.lead` et `offline.*` pour que ce cas ne soit jamais une clé nue (correction 3).
- **Vote.** Niveau **3** (« pour le lien « Et toi ? », pas pour la comparaison ») ; MVP : « Tu savais que c'était dedans ? », « Laquelle est ici ? » (deux voix seulement).

---

## 2. L'arc 0 s → 10 s → 3 min → partage

Le témoin de l'arc est le lien réel joué par les sept : `link/?id=c12-s01-k01` (règle verte). Sauf mention, les millisecondes, les positions et les taps sont **VÉRIFIÉS** (Playwright, `13-tests-humains.md` §3.3) et les secondes déclarées sont **HYPOTHÈSE (personas, D11.1)**.

### 2.1 Écran par écran

| Pas | Écran / objet | Ce qui doit être vrai | Mesure de la session 2 | Statut |
|---|---|---|---|---|
| **0 s** — l'aperçu | La ligne WhatsApp avant le tap | Un titre qui se comprend seul, une image d'aperçu, aucun mot de campagne | Aucun aperçu WhatsApp réel n'a été rendu de la session ; `og:title` de F1 répète « programme » (M1, N2) ; pas d'`og:image` sur `/defi/`, pas de balise og sur `/q/` | **HYPOTHÈSE** (aperçu) / VÉRIFIÉ (absence de balises). Cartes OG pré-générées au build (D4.1) ; réglages bot du domaine à vérifier |
| **0-2 s** — l'ouverture | `/link/?id=…` | Le texte du programme peint avant tout geste, sans saut de police | Verbatim de la mesure visible à **315 ms** (M4), 352 ms (M1), 484 ms (M2), 813 ms (M3), 1,2 s (N1), 1,4 s (N2), **1,6 s** (N3 en 4G moyenne + CPU ×4) ; **0 tap pour 7/7** | VÉRIFIÉ |
| | | Tenir le budget P1 (LCP < 2 s en 4G réelle) | Lighthouse Slow 4G + CPU ×4 sur `/link/` : **LCP 3 060 ms, CLS 0,216**, élément LCP rendu par script (render delay 2 996 ms) | VÉRIFIÉ — **écart ouvert** : le verbatim de l'écran 0 doit être dans le HTML initial (`perf-budget.md` §6.14, D7.2 Astro statique) |
| **2-10 s** — le premier geste | CTA de l'écran 0 ; grille des réponses aux objections | Un bouton dans le premier écran, y compris sous la barre d'un navigateur intégré | CTA visible dans le premier écran chez **6/7** (bas à 542-606 px ; 785 px à 130 % de police) ; sur l'iPhone SE dans WhatsApp (559 pt utiles) il n'est qu'un liseré de 5 px (N2) | VÉRIFIÉ |
| | | Le militant sort sa réponse en moins de dix secondes | **6 s / 1 tap** de médiane (M1 6/2, M2 6/1, M3 5/1, M4 7/1) : **4/4 sous les 10 s** du seuil §5.2 | taps VÉRIFIÉ / secondes HYPOTHÈSE (personas) |
| **10 s - 1 min** — le texte exact | `SectionVerbatim` | Atteindre le verbatim de section sans aide en ≤ 60 s, médiane ≤ 45 s (seuil §5.2) | **médiane 25 s / 2 taps** (7 / 24 / 24 / 35 / 28 / 35 / 25 s) : **tenu 7/7**, médiane très en dessous du seuil | taps VÉRIFIÉ / secondes HYPOTHÈSE (personas) |
| | | Règle « verbatim ≤ 1 tap » (D5.3) | Tenue pour la **mesure** (0 tap, 7/7) ; **pas tenue pour la section chez 4/7** : M3, N1, N2, N3 suivent le CTA « Comprendre en clair », traversent la carte-concept (2 943 px) et trouvent « Lire la section » 700 px plus bas | VÉRIFIÉ |
| **1-3 min** — comprendre | Carte-concept dense corrigée (D3.10) | « En clair » lisible sans tap, verbatim juste dessous, source en toutes lettres | Aha médian session 1 : **dense 22 s**, progressive 12 s, explorable 19 s ; réexplication réussie **7/7 en < 60 s** (65-81 mots, aucune mesure inventée), seul dépassement M4 sur l'explorable (85 s) | HYPOTHÈSE (personas) |
| | `q/?s=…` — « Laquelle est ici ? » | La règle énoncée avant les options ; l'erreur n'est jamais une faute | **35 s / 2 taps** de médiane ; « ah, elle est là » **7/7**, « perdu » **0/7** ; les trois textes crus vrais 7/7, fidélité vérifiée au corpus | taps et fidélité VÉRIFIÉ / ressenti HYPOTHÈSE (personas) |
| | `defi/?n=…` — « Tu savais que c'était dedans ? » | Un geste qui n'est jamais pris pour une opinion ; aucun score | **75 s · 1 tap** de médiane (20 à 120 s) ; **7/7** finissent les 5 cartes ; geste pris pour une opinion **0/7** ; 0 point D0.32 | taps VÉRIFIÉ / reste HYPOTHÈSE (personas) |
| **Partage** | `share.button`, `share.button_copy`, `measure.share`, `q.share`, `riposte.share` | Deux taps au plus, un texte prêt, jamais l'objection adverse, jamais un score | **médiane 10 s** ; `wa.me` déclenché **7/7** sur le bouton primaire, copie + toast **7/7**, « aucun trou » entre les trois niveaux ; le **niveau 1** (feuille native) n'a **jamais** été observé (tous les navigateurs de la session sont sans tête) | niveaux observés VÉRIFIÉ / niveau 1 **HYPOTHÈSE** |
| | Le lien reçu par le suivant | Le destinataire comprend seul, rien de l'expéditeur ne transite | Lien nu du tirage compris seul en **8 s** de médiane ; ligne de contexte à l'impersonnel comprise **7/7** ; **0 trace de l'expéditeur** (vérifié 7/7) | compréhension HYPOTHÈSE / absence de trace VÉRIFIÉ |
| | Le lien « avec mes réponses » (`#r=`) | Envoyable hors du cercle militant | **0/7** hors cercle militant ; 4/7 refusent explicitement, 2/7 le trouvent « mou » faute d'un score que D0.32 interdit | HYPOTHÈSE (personas) → D5.13 (niveau 2), D5.15 (reporté en v3) |

### 2.2 Les quatre seuils de l'arc, en une ligne chacun

1. **0 s.** L'aperçu ne doit pas être le maillon manquant : le seul pas de l'arc dont la session n'a **rien** mesuré (aucun vrai WhatsApp). Point 1 du §3.12 de `13-tests-humains.md`.
2. **10 s.** Deux promesses distinctes selon l'entrée (D0.19) : pour le militant, la réponse exacte en dix secondes (`home.direct.title`, tenue à 6 s / 1 tap) ; pour l'arrivée par lien, le texte du programme déjà peint (tenu à 315 ms - 1,6 s, 0 tap).
3. **3 min.** `home.link.reading_time` promet « Trois minutes, sans compte ni pub » : le trajet complet lien → section → « En clair » → réexplication tient dans cette promesse chez 7/7 (25 s + 22 s d'aha + lecture), mais la promesse n'a **jamais** été chronométrée bout en bout — HYPOTHÈSE.
4. **Partage.** La boucle se referme : le lien nu est accepté 7/7, le lien porteur de réponses 0/7. C'est ce seul écart qui fixe le niveau de gamification à 2 (D5.13).

### 2.3 Ce qui casse l'arc, par pas (relevé au moins deux fois)

| Pas | Casse observée | Vu par | Correction |
|---|---|---|---|
| 0-2 s | LCP à 3 060 ms en Slow 4G + CPU ×4, verbatim rendu par script | mesure Lighthouse ; N3 (« 2 s et je repars ») | pré-rendu du texte de l'écran 0 (D7.2, `perf-budget.md` §6.14) |
| 0-2 s | Clé brute `error.generic` quand les données ne chargent pas | N3 | correction 3 : texte français en dur dans le `catch` (`error.data.*`) |
| 2-10 s | Le geste principal sous le pli d'un navigateur intégré (677 px) | M1, M2, M3, M4, N1, N3 | correction 1 : CTA = « Lire la section », bouton ≥ 44 px dans les 600 px |
| 10 s - 1 min | Détour de 2 943 px par la carte-concept avant le premier bouton | M3, N1, N2, N3 | correction 1 (variante : carte-concept repliée à « En clair » + verbatim + un bouton) |
| 1-3 min | Perdu au fond d'une section de 18 mesures, reprise à −2 732 px | M3, N1 | correction 7 : reprise collante ou répétée sous la mesure ciblée |
| 1-3 min | Rien ne marque l'option touchée dans F2 | M1, N1, N2, N3 | correction 9 ; `q.chosen` « Ton choix » (strings v0.3) |
| Partage | Le bouton primaire partage la mesure clé, pas la mesure du lien | N1 | correction 18 |
| Partage | Titre de chapitre tronqué sur l'image 1080 × 1920 | M2, M3, N2 | correction 6 (règle 6 : jamais tronquer un titre du corpus) |
| Tout l'arc | Vocabulaire de campagne sur un chemin d'arrivée par lien | N1, N2, M3, M4 | correction 14 ; retiré de `strings.json` v0.3 |
| Tout l'arc | Cibles de 26-34 px (« Envoyer » par mesure, « Passer », « Y aller ») | M2, M4, N1, N2 | correction 10 : ≥ 44 px |
| Hors arc | Page blanche au rechargement hors ligne | M4 (P0), M1 | correction 2 ; `offline.*` (strings v0.3) |

---

## 3. La métrique nord (D5.1) et la contribution de chaque persona

### 3.1 Rappel de la définition

**N = part des sessions arrivées par lien profond (`entry = deep`) qui atteignent un `SectionVerbatim`.** Atteint = premier paragraphe visible à ≥ 50 % pendant ≥ 1 000 ms. **S (secondaire) = part des sessions ayant commencé un moment ludique (ou reçu une réponse du chat) qui lisent ensuite un verbatim de section**, par mécanique. Instrumentation : 6 événements Analytics Engine sans identifiant, dédupliqués côté client (`07-mecaniques.md` §1.2). Seuils, **HYPOTHÈSE** recalibrés à J+30 : **N ≥ 0,6** sur la tranche `landing_kind = measure`, **N ≥ 0,4** sur `challenge | quiz | concept | word | stat`, **S ≥ 0,5** pour toute mécanique conservée en v1 ; la tranche `landing_kind = section` (verbatim à l'écran 0) est exclue du chiffre de tête parce qu'elle est triviale.

N ne mesure **pas** des personnes (D5.1, §1.3) : un persona n'est pas un segment mesurable dans les données. La colonne « contribution » ci-dessous dit donc **quel événement chaque profil produit** et **par où sa session peut se perdre**, pas une part de trafic.

### 3.2 Contribution par persona

| Persona | Rôle dans N | Session typique | Événements produits | Ce qui casse sa contribution |
|---|---|---|---|---|
| **M1** Camille | **Fabrique le dénominateur.** Elle est l'émettrice : chaque lien qu'elle envoie crée une session `entry = deep` chez quelqu'un d'autre | `entry = home`, `from = riposte` ou `search` ; puis `share_open` `object_kind = measure` | `session_start`, `section_verbatim_view`, `share_open` | Un « Envoyer » hors du premier écran : pas de `share_open`, donc pas de lien, donc pas de session `deep` du tout |
| **M2** Karim | **Garde la porte.** Sa vérification mot à mot conditionne le fait qu'il partage : il ne relaie que ce qu'il a pu recouper | `entry = deep` (`landing_kind = measure`), verbatim de section en **1 tap** | idem + `share_open` `object_kind = measure` | Une mesure introuvable dans le livre, ou une note interne livrée : il cesse de relayer, et le dénominateur s'assèche à la source |
| **M3** Léa | **Ouvre la tranche `challenge`.** Story Instagram et lien nu du tirage : ses envois arrivent sur `/defi/` et `/q/`, la tranche au seuil 0,4 | `entry = deep`, `landing_kind = challenge` ou `quiz` ; elle a pris le détour par la section pendant F1 (`play_to_read`) | `session_start`, `play_start`, `play_complete`, **`play_to_read`**, `share_open` | Une carte story tronquée ou hors zone sûre : elle ne poste pas, la tranche `challenge` reste vide |
| **M4** Jean-Marc | **Ouvre la tranche `qr`.** QR sur tract, `src = qr` ; il atteint la section en 1 tap malgré 130 % de police | `entry = deep`, `landing_kind = measure`, `src = qr` | `session_start`, `section_verbatim_view` | Rechargement hors ligne = page blanche : la session est comptée au dénominateur (`session_start` est parti) et jamais au numérateur. C'est la perte la plus coûteuse pour N |
| **N1** Yanis | **Le numérateur type de la tranche `measure`.** Il atteint le verbatim de section en 2 taps, via la carte-concept | `entry = deep`, `landing_kind = measure`, `from = landing` puis `from = search` (« loyer ») | `session_start`, `section_verbatim_view` (×2 : concept puis section), `share_open` | L'écran d'accueil militant atteint par `home.link.cta_secondary` : il ferme avant le verbatim. Correction 14 |
| **N2** Martine | **Le numérateur de confiance.** Elle atteint le verbatim, mais seulement après avoir trouvé qui parle | `entry = deep`, `landing_kind = measure` ; descente au pied de page avant tout tap | idem | Deux ruptures avant le verbatim : la ligne d'indépendance sous le pli à 559 pt, et une recherche qui répond « rien » sur son métier |
| **N3** Théo | **Le plafond de S.** Il finit le jeu et n'ouvre pas de section : `play_start` sans `play_to_read` | `entry = deep`, `landing_kind = challenge` ; 4G moyenne, CPU ×4 | `session_start`, `play_start`, `play_complete`, `share_open` | Deux secondes de chargement, ou un pavé de texte : il ne produit même pas `play_start` |

### 3.3 Ce que la session 2 dit déjà des seuils

| Grandeur | Ce que la session donne | Lecture | Statut |
|---|---|---|---|
| Proxy de **N** sur `landing_kind = measure` | **7/7** atteignent le verbatim de section, médiane **25 s / 2 taps**, aucun abandon, aucune aide | Très au-dessus du seuil 0,6 — mais sept agents motivés par le protocole ne sont pas sept sessions réelles | **HYPOTHÈSE (personas, D11.1)** |
| Proxy de **S** sur F1 | **7/7** finissent les 5 cartes ; **3/7 seulement** ouvrent une section pendant le jeu (M2, M3, N1) → S ≈ **0,43** | **Sous le seuil 0,5** : sur ce seul indice, F1 serait à rétrograder d'un niveau (`07-mecaniques.md` §2). Le « Lire la section » est présent sur chaque carte (1 tap, VÉRIFIÉ) : c'est un problème d'incitation, pas d'accès | **HYPOTHÈSE (personas)** — à remesurer sur données réelles |
| Proxy de **S** sur F2 | Section à **1 tap** après la révélation pour 7/7 ; « Y aller » mène à la bonne mesure de la bonne section | Le chemin est court ; qui l'emprunte spontanément n'a pas été compté | **ouvert** |
| Riposte (hors N) | **4/4** militants sous les 10 s, médiane 6 s / 1 tap | Le pas 2 de l'arc tient ; il n'entre pas dans N (entrée `home`) mais il alimente `share_open` | taps VÉRIFIÉ / secondes HYPOTHÈSE (personas) |
| Partage | `wa.me` 7/7, copie 7/7, niveau 1 jamais observé | Le niveau 1 est le chemin nominal sur téléphone réel : c'est le premier point du test humain (§3.12) | **HYPOTHÈSE** |

---

## 4. Limites de ce document

- **Aucun humain n'a été observé.** Les sept personas sont joués par des agents (D11.1) qui connaissent le dossier : ils citent D0.32, WCAG 2.5.8 ou la règle 6 des règles d'illustration, ce qu'aucun testeur ne ferait. Leurs verbatims sont plausibles, pas observés.
- **Un seul modèle joue sept personnes** : la convergence sur les défauts objectifs (CTA sous le pli, cibles de 26-34 px, mosaïque incomprise) est un signal ; la convergence sur les **préférences** n'en est pas un.
- **Les secondes sont déclarées**, sauf les chargements, les navigations, les positions et les taps (Playwright, Lighthouse). « 6 s » de réponse à une objection est une lecture d'agent, pas un chrono de stand.
- **Les navigateurs intégrés sont émulés** (viewport, UA, referer, `navigator.share` retiré) : ni Chrome Custom Tab, ni SFSafariViewController, ni la WebView Instagram n'ont été ouverts. Les « 13 pt sous le pli » dépendent d'une hauteur de barre supposée.
- **Le premier maillon n'a pas été testé** : aucun aperçu WhatsApp, Telegram ou Instagram réel n'a été rendu de la session.
- **Le chat n'existe pas dans le prototype** : les pas de l'arc qui en dépendent (mention IA, refus, mode dégradé) ont été jugés sur la maquette du 9/9, avec des corrections connues et non appliquées. Le chat est de toute façon livré en extractif pur, sans LLM à l'exécution (D6.10).

---

## 5. Ce que le test humain d'avant lancement doit lever ici

Reprise, restreinte à ce document, du §3.12 de `13-tests-humains.md` :

| # | Hypothèse de ce document | Comment la lever |
|---|---|---|
| F-1 | Médiane lien → verbatim de section **25 s / 2 taps** | Chrono du tap **dans WhatsApp** au premier verbatim, 4G réelle, Android milieu de gamme (`perf-budget.md` §5.4), après la correction 1 (le passage attendu à 1 tap n'est pas remesuré) |
| F-2 | Réponse à une objection en **6 s / 1 tap** | Même chrono, debout, une main, sur un vrai stand |
| F-3 | **F1 en 75 s** et S ≈ 0,43 | Observer qui ouvre une section pendant le jeu, sans consigne de le faire |
| F-4 | Aperçu du lien et **niveau 1 de partage** | Envoi réel dans un groupe WhatsApp, une conversation Telegram et une story Instagram, depuis Android et iPhone |
| F-5 | « Trois minutes » de `home.link.reading_time` | Chronométrer le trajet complet lien → section → « En clair » → réexplication, sans relance |
| F-6 | Compréhension du vocabulaire chez un vrai non-politisé (« section », « tirage », « chapitre 12 ») | Réexplication de la règle verte en < 60 s par ≥ 2/3 non-politisés |
| F-7 | Le résultat d'un jeu n'est pas une capture retournable pour un militant (drapeau M1) | Le montrer à un militant réel devant son propre groupe WhatsApp |
| F-8 | La ligne d'indépendance est lue spontanément (« c'est officiel ? qui a fait ça ? ») | ≥ 2/3 des non-politisés répondent « indépendant / militant » sans chercher, avec un « À propos » complet (D0.15) |

Tant que ces huit points ne sont pas levés, **chaque chiffre issu des personas reste HYPOTHÈSE (personas, D11.1)** dans le dossier et dans `prompt-final.md`.
