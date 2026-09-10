# Voix et ton — « C'est écrit là » (v0, T3)

> Rédigé le 7 septembre 2026, en-tête remis à jour le 10/9/2026. S'applique à `design/strings.json` (**363 chaînes en v0.5.0** — 172 à la rédaction de ce guide, mesure : comptage récursif du fichier —, clés anglaises `snake_case`, textes français) et à tout texte d'interface, de carte de partage ou de **liant**. ⚠️ **Deux mots de cet en-tête ont changé de sens depuis D6.10 et D3.11 : il n'y a plus de « liant IA »** (le chat est extractif, le liant est calculé par règles, D6.11) **et plus de « tortue »** (la mascotte est la « Marcheuse », sans nom, réservée à la jauge de progression, D3.11 ; le §19.3 point 2 du prompt final pose « v1 sans mascotte, jauge purement typographique » comme défaut à appliquer, et le mot « tortue » est en ban list). Décisions respectées : D0.1 (pas de disclaimer de contenu), D0.12 (mascotte originale, jamais infantilisante), D0.14 (ligne d'indépendance discrète), D0.22 (promesse de confidentialité), D0.24 (silence électoral = gel partiel), D0.25 (tu par défaut), D0.29 (la mention IA nomme Mistral), D0.32 (critères « honteux à partager »), D3.2 (le verbatim a sa propre typographie).
>
> Statut des faits : **VÉRIFIÉ** (lu à la source le 7/9/2026, URL donnée), **PROBABLE**, **HYPOTHÈSE**.

## 0. La voix en une phrase

On parle comme quelqu'un de calme qui a le livre sous la main : on cite, on explique, on montre. Trois voix cohabitent et ne se mélangent jamais :

| Voix | Qui parle | Typographie (D3.2) | Exemple |
|---|---|---|---|
| Le programme | *L'Avenir en commun*, mot pour mot | Gowun Batang, fond #FDEDFF, filet Violet, étiquette « Texte du programme » | « Inscrire dans la Constitution le principe de la « règle verte », selon laquelle on ne prélève pas davantage à la nature… » |
| L'app (« on ») | Nous, qui avons rédigé et relu | Public Sans | « En clair », « Pourquoi ça compte », « Rédigé par nous, relu par … » |
| Le liant IA (v2) | Mistral, ≤ 2 phrases, jamais une mesure | Public Sans + badge « IA · Mistral » | « Deux mesures du chapitre 12 répondent à ta question. » |

Le lecteur, lui, est toujours « tu ».

## 1. Dix règles de ton

| # | Règle | Bon | Mauvais |
|---|---|---|---|
| 1 | **Tu, toujours.** Une seule personne à la fois, jamais de mélange tu/vous, jamais de « vous » de politesse (D0.25 ; variante vous testée en session humaine 1). | « Reprendre ta lecture » | « Reprenez votre lecture » · « Reprends votre lecture » |
| 2 | **Phrases courtes.** ≤ 15 mots, une idée par phrase, pas de double négation, pas de subordonnée en cascade. | « Rien avec ces mots. Essaie un synonyme ou un sujet plus large. » | « Nous n'avons malheureusement pas trouvé de résultat correspondant à votre recherche, n'hésitez pas à reformuler. » |
| 3 | **Le programme parle en son nom.** Dans la zone « Texte du programme », le verbatim est intact : pas de paraphrase, pas de coupe silencieuse, pas de gras ajouté. La reformulation vit dans « En clair », toujours étiquetée. | Étiquette « Texte du programme » + citation exacte, puis « En clair : … » | « Le programme veut en gros interdire de prélever trop de ressources. » (dans la zone verbatim) |
| 4 | **On dit ce qu'on fait, pas ce qu'on ne garantit pas.** Aucun disclaimer de contenu (D0.1). Une phrase décrit un mécanisme, jamais une réserve. | « Réponses assemblées par une IA française (Mistral, hébergée chez Cloudflare) à partir du texte officiel. » | « Les réponses générées par l'IA peuvent contenir des erreurs et ne sauraient engager… » |
| 5 | **Le mode dégradé est un mode normal.** Mots interdits : panne, erreur, indisponible, désolé, malheureusement, temporairement, réessayer (sauf `error.generic`, réservé aux vrais bugs). | « Réponse directement extraite du programme » | « Service IA temporairement indisponible, veuillez réessayer plus tard. » |
| 6 | **Sobre, jamais potache** (D0.32). Zéro emoji, zéro mème, zéro blague sur qui que ce soit, zéro point d'exclamation d'enthousiasme. Un sourire sec par écran, maximum. | « Lait-fraise. La tortue apprécie. » | « OMG la tortue kiffe le lait-fraise !!! » |
| 7 | **Surprise plutôt qu'accord** (principe 7 du plan). Jamais « d'accord / pas d'accord », jamais de note, score ou classement de personnes. | « Tu savais que c'était dedans ? » | « Es-tu d'accord avec cette mesure ? Note-la sur 5. » |
| 8 | **Concret et sourcé.** Chaque chiffre existe dans `data/aec-2025.json`, avec institut et date. Jamais « les experts », « on sait que », « une écrasante majorité ». | « 83 % des Français sont d’accord … (Harris Interactive, juillet 2021) » | « Une écrasante majorité des Français soutient cette mesure. » |
| 9 | **Le militant est le héros.** Verbes d'action à la deuxième personne (cherche, envoie, réponds). L'app dit « on », jamais « l'application vous permet de ». | « Ta munition, en dix secondes. » | « Cette application vous permet de découvrir les propositions du programme. » |
| 10 | **Nommer les choses.** Mistral, Cloudflare, La France insoumise, Harris Interactive, *L'Avenir en commun, édition 2025*. Pas de « partenaire technologique », pas d'« un institut », pas de « propulsé par ». | « IA · Mistral » | « Propulsé par une intelligence artificielle de pointe » |

Règles typographiques (appliquées par script dans `strings.json`) : espace insécable avant « : ; ! ? » et à l'intérieur des guillemets « » ; points de suspension « … » (un seul caractère) ; « programme » sans majuscule ; titre du livre écrit *L'Avenir en commun* (l'italique est posée par CSS, pas dans la chaîne) ; « 6e République » avec « e » en exposant par CSS ; nombres en toutes lettres jusqu'à seize dans les phrases (« dix secondes »), en chiffres dans les données (« 83 % »).

## 2. La mention IA : pourquoi elle existe et comment on la pose

### 2.1 Le droit (art. 50 du règlement (UE) 2024/1689)

| Fait | Statut | Source |
|---|---|---|
| L'article 50 « comes into force 2 August 2026, according to Article 113 » : il s'applique donc depuis le 2 août 2026, avant le lancement de l'app. | **VÉRIFIÉ** (lu le 7/9/2026) | https://artificialintelligenceact.eu/article/50/ |
| Art. 50 § 1 : le fournisseur d'un système d'IA conçu pour interagir directement avec des personnes doit faire en sorte qu'elles soient informées qu'elles interagissent avec une IA, sauf si c'est évident pour une personne raisonnablement attentive. | **VÉRIFIÉ** | même page |
| Art. 50 § 4 : celui qui déploie une IA générant du texte publié pour informer le public sur des sujets d'intérêt public doit indiquer que le texte est généré, **sauf** si le contenu a fait l'objet d'une relecture humaine ou d'un contrôle éditorial et qu'une personne en assume la responsabilité éditoriale. | **VÉRIFIÉ** | même page |
| Art. 50 § 5 : l'information est donnée « in a clear and distinguishable manner at the latest at the time of the first interaction or exposure » et respecte les exigences d'accessibilité. | **VÉRIFIÉ** | même page |
| Le texte du site artificialintelligenceact.eu reproduit fidèlement le Journal officiel (EUR-Lex a répondu HTTP 202 vide à la lecture automatisée du 7/9/2026 : texte primaire non relu aujourd'hui). | PROBABLE | https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689 |
| Le site affiche une rubrique « Digital Omnibus » ; si ce paquet modifie la date ou la portée de l'art. 50, cela n'a pas été vérifié aujourd'hui. | HYPOTHÈSE (veille T9) | même site, rubrique « Digital Omnibus » |

### 2.2 Ce que ça impose dans l'app

| Surface | Texte généré ? | Obligation | Mécanisme retenu | Chaînes |
|---|---|---|---|---|
| Chat (v2) : liant ≤ 2 phrases + identifiants de mesures | Oui (le liant) ; le verbatim, non | § 1 + § 5 : informer avant la première interaction, de façon distincte | Mention visible dans l'état vide du chat, **avant** le premier message ; badge « IA · Mistral » sur chaque bulle générée ; texte réel (jamais une simple icône), lu par les lecteurs d'écran, contraste AA (`design/contrast-matrix.md`) | `chat.ai_mention.v1/v2/v3`, `chat.ai_badge` |
| Glossaire, FAQ, ripostes (rédigés au build, relus, D0.3 et D0.27) | Non à l'exécution ; assistance IA possible à la rédaction | § 4 : exception « relecture humaine / contrôle éditorial » | Étiquette d'auteur sur chaque carte ; nom du relecteur = pseudonyme (D0.15) | `concept.authorship.reviewed`, `chat.human_reviewed_badge` |
| Mode extractif / dégradé | Non | Aucune (pas d'IA) | Le badge dit le mécanisme réel | `degraded.badge` |
| Cartes de partage | Non | Aucune | Attribution CC seulement | `attribution.card` |

Pourquoi la mention nomme **Mistral et Cloudflare** (D0.29) : la contrainte « IA française » est un argument, pas une gêne ; dire chez qui la question part (Cloudflare Workers AI) relève de la transparence RGPD sans bandeau ; et une mention précise se distingue d'un disclaimer, qui est vague par construction. Le wording reste modifiable via KV sans redéploiement (plan §3.4, loi 2018-1202).

## 3. Disclaimer, mention, ligne d'indépendance : trois objets différents

| | Disclaimer de contenu | Mention IA | Ligne d'indépendance |
|---|---|---|---|
| Ce que c'est | Une réserve sur la valeur du contenu | Un fait sur le mécanisme | Un fait sur qui publie |
| Répond à | « Et si c'est faux ? » | « À qui je parle ? » | « Qui est derrière ? » |
| Obligation | Aucune ; **refusé** (D0.1) | **Obligatoire** (art. 50, § 1 et § 5) | **Protectrice** (D0.14 : LCEN, INPI, réputation, charte « ne jamais engager le mouvement ») |
| Où | Nulle part | État vide du chat + badge par bulle | Pied de page + page À propos |
| Ton | Conditionnel, négatif (« peut », « ne saurait ») | Indicatif, descriptif | Indicatif, affirmatif, une phrase |
| Exemple retenu | — | `chat.ai_mention.v1` | `independence.line` : « Projet militant indépendant, fait pour donner envie de lire le programme. » |
| Interdit | Tout | Icône seule, tooltip seul, mention après la première réponse | « Sans lien avec… », « n'engage pas… », « les opinions exprimées… » |

Test rapide pour trier une phrase : un disclaimer parle de ce qui pourrait être faux ; une mention parle de comment ça marche ; la ligne d'indépendance parle de qui on est. Une phrase qui contient « peut », « ne saurait », « à titre indicatif » ou « n'engage » est un disclaimer : elle sort.

## 4. Les trois variantes de mention IA pour le test des juges (T9)

Toutes ≤ 140 caractères (comptés espaces insécables comprises), toutes nomment Mistral et Cloudflare, toutes au tu ou impersonnelles, toutes à l'indicatif.

| ID | Texte | Caractères | Angle | Emplacement prévu | Risque à surveiller |
|---|---|---|---|---|---|
| `chat.ai_mention.v1` | Réponses assemblées par une IA française (Mistral, hébergée chez Cloudflare) à partir du texte officiel. | 104 | Mécanisme (« assemblées à partir du texte ») | Une ligne sous le titre du chat, Public Sans 14 px | Peut être lu comme un cartouche technique et sauté |
| `chat.ai_mention.v2` | Tu parles à Mistral, une IA française hébergée chez Cloudflare. Elle choisit les passages du programme, elle ne les écrit pas. | 126 | Relation (« tu parles à ») + contrat (« ne les écrit pas ») | Bulle d'accueil du chat, avant le champ de saisie | La seconde phrase peut être perçue comme une réserve ; à vérifier par les juges |
| `chat.ai_mention.v3` | Mistral, une IA française hébergée chez Cloudflare, retrouve pour toi le passage exact du programme. | 100 | Bénéfice (« retrouve pour toi le passage exact ») | Sous-titre de l'écran chat | Le mot « IA » arrive en 5e position : vérifier qu'il est vu en < 3 s |

Éléments fixes, non soumis au vote : badge `chat.ai_badge` « IA · Mistral » sur chaque bulle générée ; badge `chat.human_reviewed_badge` « Relu par un humain » sur une réponse servie depuis la FAQ sans LLM ; `degraded.badge` en mode extractif.

Protocole du test (T9, panel de 5 juges dont l'adversaire chasseur de captures) : chaque juge répond oui/non à cinq questions par variante : (a) « ça se lit comme une excuse ou une réserve ? » (attendu : non) ; (b) « en moins de 3 secondes, tu as compris que tu parles à une IA ? » ; (c) « tu as retenu le nom Mistral ? » ; (d) « ça tient sur deux lignes à 390 px en Public Sans 14 px ? » (mesuré au navigateur, Playwright) ; (e) « tu enverrais une capture de cet écran sans gêne ? » (D0.32). Seuil : ≥ 4/5 juges répondent « non » à (a) et « oui » à (b), (c), (e). La variante gagnante devient `chat.ai_mention` ; les deux autres restent en KV comme wording de secours.

## 5. Gabarit StatCard et loi 77-808

| Fait | Statut | Source |
|---|---|---|
| Art. 1 (version en vigueur depuis le 27/4/2016) : la loi régit les sondages « publiés, diffusés ou rendus publics sur le territoire national, portant sur des sujets liés, de manière directe ou indirecte, au débat électoral ». | **VÉRIFIÉ** (lu le 7/9/2026, page « en vigueur au 07 septembre 2026 ») | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000522846/ |
| Art. 2 : **la première publication ou diffusion** d'un sondage est accompagnée de 8 indications, établies sous la responsabilité de l'organisme : nom de l'organisme ; nom et qualité du commanditaire (et de l'acheteur s'il diffère) ; nombre de personnes interrogées ; dates des interrogations ; texte intégral des questions ; mention que tout sondage est affecté de marges d'erreur ; les marges d'erreur ; droit de consulter la notice (Commission des sondages). | **VÉRIFIÉ** | même page |
| Art. 11 : pour la présidentielle, interdiction de publier, diffuser ou commenter un sondage électoral **à compter du samedi précédant le scrutin à zéro heure** jusqu'à la fermeture du dernier bureau métropolitain. **La diffusion de sondages publiés avant reste possible** à condition d'indiquer la date de première publication, le média qui les a publiés et l'organisme. | **VÉRIFIÉ** | même page |
| L'encadré du chapitre 12, section 1, dit exactement : « 83 % des Français sont d’accord pour interdire de prélever chaque année plus de matières premières que la Terre est capable de reconstituer en un an (Harris Interactive, juillet 2021) ». Institut et mois seulement, pas de commanditaire, pas d'effectif. | **VÉRIFIÉ** (`div.chiffre` lu le 7/9/2026) | https://melenchon2027.fr/programme2025/livre/chapitre12/s1/ |
| Les 48 encadrés « À savoir » entrent dans le champ de l'art. 1 (sondages d'opinion sur des mesures : lien indirect avec le débat électoral). | PROBABLE (lecture prudente ; les 47 autres encadrés sont inventoriés en T1) | même page |

Conséquences pour le gabarit (`statcard.*`) :

1. **L'app n'est pas le premier diffuseur** : le livre l'est. Le régime qui nous concerne est celui de la re-diffusion (art. 11, 3e alinéa) : **organisme + date de première publication + média**. Le « média » est *L'Avenir en commun 2025*, avec le chapitre et un lien vers l'encadré d'origine (`statcard.legal.source_link`).
2. **Le commanditaire** (art. 2) est affiché quand il est connu (`statcard.legal.full`). Quand le livre ne le donne pas, on l'écrit : « Commanditaire non précisé dans le livre. » (`statcard.legal.no_sponsor`). On ne devine jamais le commanditaire : que LFI ait commandé ces enquêtes est une HYPOTHÈSE, pas une mention.
3. **La marge d'erreur** : la phrase « Tout sondage comporte une marge d'erreur. » (`statcard.legal.margin`) reprend le 6° de l'art. 2. Elle n'est pas exigée pour une re-diffusion, mais elle coûte une ligne et coupe court à l'attaque « chiffre présenté comme une vérité ».
4. **La date est aussi visible que le chiffre**, jamais derrière un tap (D0.32 : « sondages périmés mis en avant » est éliminatoire ; une date cachée l'est encore plus). Le gabarit dit « juillet 2021 » là où le livre dit « juillet 2021 » ; pas de « récent », pas de « aujourd'hui ».
5. **« Devine le % » gèle pendant le silence** (D0.20, D0.24) : jouer avec un chiffre, c'est un « commentaire » au sens de l'art. 11. Lecture prudente, coût nul.

Rendu type d'une StatCard (chapitre 12, section 1) :

> **83 %** des Français sont d’accord pour interdire de prélever chaque année plus de matières premières que la Terre est capable de reconstituer en un an.
> Sondage Harris Interactive, juillet 2021. Commanditaire non précisé dans le livre. Publié dans L'Avenir en commun 2025, chapitre 12. Tout sondage comporte une marge d'erreur.
> Voir l'encadré dans le programme · La France insoumise – L'Avenir en commun · CC BY-NC-SA 4.0

## 6. Conventions de `design/strings.json`

- **Clés** : anglais, snake_case, séparées par des points, du général au particulier (`share.message.cousin`). Les variantes d'un même écran partagent un préfixe (`home.link.*` = arrivée par lien, `home.direct.*` = arrivée directe, D0.19).
- **Placeholders** : `{name}` façon ICU, noms en anglais : `appName`, `count`, `topic`, `url`, `reviewer`, `chapter`, `section`, `term`, `organisation`, `dates`, `sponsor`, `value`, `delta`, `resetTime`, `reopenTime`, `read`, `total`, `nextChapter`, `date`. `{topic}` = titre court de la mesure ou du concept partagé ; `{url}` = URL courte (`/m/…`, `/c/…`).
- **Typographie** : l'espace insécable U+00A0 est insérée par script avant « : ; ! ? » et dans les guillemets. L'espace fine insécable (U+202F) serait plus juste avant « ; ! ? » ; on garde U+00A0 en v0 tant que la couverture du glyphe dans les sous-ensembles Public Sans / Gowun Batang n'est pas vérifiée (à faire en T3 partie 2). Apostrophe droite « ' » en v0 dans la voix de l'app (conversion en « ’ » possible au rendu, à décider avec l'échantillon typographique). Le corpus, lui, utilise l'apostrophe typographique « ’ » (VÉRIFIÉ sur `chapitre12/s1/`) : le verbatim la conserve telle quelle, règle 3.
- **Longueur** : chaque phrase ≤ 15 mots (vérifié par script sur les 172 chaînes, placeholders comptés pour un mot) ; les mentions IA ≤ 140 caractères (104, 126, 100).
- **Interdits vérifiés par script** : emoji, espace sécable avant une ponctuation double, clé mal formée, mention IA sans « Mistral ».
- **Le script** vit pour l'instant dans le scratchpad de session (`strings/gen.py`) ; à porter en `scripts/check-strings.test.ts` comme test CI quand le dépôt de code existera.
- **Attribution** : `attribution.full` pour les pages, `attribution.card` sur chaque image de partage, `attribution.short` en pied de carte-concept ; le lien `attribution.link_text` pointe vers https://melenchon2027.fr/programme2025/livre/ et `attribution.license_link_text` vers https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr. `attribution.derivatives` acquitte la clause « partage à l'identique ».
- **Silence électoral** : `silence.*` sont les seuls textes affichés par le flag KV (D0.24) ; `reopenTime` est calculé depuis les bornes UTC du flag (T9). Aucune de ces phrases ne dit « interdit », « loi » ou « obligation » : elles disent ce qui marche.
- **Confidentialité** : `privacy.promise` est la phrase de D0.22, au mot près ; les autres chaînes `privacy.*` décrivent ce qui est vrai en v1 et seront confrontées à la carte des journalisations (T7).

## 7. Ce qui reste HYPOTHÈSE dans ce kit

| Point | Levée par |
|---|---|
| Tu vs vous (D0.25) | Session humaine 1 (9/9 soir) : les mêmes écrans dans les deux registres |
| ~~`{appName}` et le wordmark~~ | **LEVÉ (D10.2, 9/9/2026)** : le nom est « C'est écrit là », le wordmark « C'EST ÉCRIT / LÀ » (compact « ÉCRIT LÀ »). Le placeholder `{appName}` n'existe plus dans le kit ; le nom est écrit en clair |
| ~~`{author}`, `{reviewer}`, `{repoUrl}`~~ | **LEVÉ (10/9/2026, à consigner en D13.5-D13.6)** : pseudonyme public unique **« Baoleka »** pour l'auteur comme pour le relecteur, dépôt `https://github.com/baoleka/cestecritla`. Les trois placeholders sont remplacés par leur valeur en v0.5 du kit |
| ~~`{organisation}`, `{sponsor}`~~ | **LEVÉ (10/9/2026)** : renommés `{pollster}` et `{pollSponsor}`. Ils portent les mentions légales d'un **sondage cité par le livre**, jamais l'organisation ou le commanditaire de l'app, qui n'en a aucun |
| `{contactEmail}` | Valeur tranchée : **contact@cestecritla.fr**, résolue au build. Reste un placeholder dans les fichiers suivis parce que la porte de dépôt (D12.3, H-CNF-17c) refuse une adresse littérale. **Boîte à créer** (Email Routing) |
| `home.hook.*`, `challenge.*` (niveau 3 de gamification, D0.18) | T5 (grille utile vs gadget) puis T11 session 2 ; supprimer les chaînes des mécaniques écartées |
| Valeur de `{resetTime}` (reset Workers AI à 00:00 UTC, soit 1 h ou 2 h à Paris selon la saison) | T7, calcul côté client depuis l'UTC |
| `privacy.turnstile` (formulation « sans publicité ni profilage ») | T7, après lecture des cookies posés par Turnstile ; T9 revue juriste hostile |
| Liens vers Désintox (`refusal.desintox_link`, `riposte.desintox_link`) : site LFI, non listé nommément dans les CTA de D0.16 | T9 : confirmer qu'un lien de lecture vers desintox.lafranceinsoumise.fr relève bien de la « source », pas d'un CTA |
| « Mélenchon » dans `share.message.cousin` (registre oral) vs « L'Avenir en commun » | Test humain 2 : lequel des trois messages est réellement envoyé |
| Champ d'application de la loi 77-808 aux 48 encadrés | T9 revue juriste hostile ; la lecture prudente est retenue en attendant |
| Effet du « Digital Omnibus » sur l'art. 50 | Veille T9 (artificialintelligenceact.eu, rubrique dédiée) |
