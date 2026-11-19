# Les textes du chantier « Le jeu d'abord » — à valider par l'éditeur

> **État au 19 novembre 2026 : tous sont des propositions de la session, aucun n'est servi.**
> Le plan (`PLAN-JEU-DABORD.md`, lot 7) demande un seul document de toutes les phrases nouvelles
> depuis la build en ligne (kit `design/strings.json`, v0.13.0 → v0.14.0). Le voici : dix-neuf
> textes, dont trois en remplacent un autre là où ils valent. Chacun tient les règles du kit —
> quinze mots au plus par phrase, aucun mot de récompense, de rang ni de verdict, « tortue »
> dans les seules clés `turtle.*`, les espaces insécables de la typographie française.
>
> **Ce qui n'a pas bougé** : les huit phrases inscrites dans sa planche (`game.title`,
> `game.kicker`, `game.question.part`, `game.dont_know`, `game.round.done`,
> `game.round.again`, `independence.unofficial`, `nav.toc`), toutes les lignes de la page
> Confidentialité, et les phrases de la carte « Garder ta tortue », au mot près.
>
> **Validation** : à demander à l'éditeur en un dialogue de questions, après les relectures du
> lot 8 — elles peuvent encore faire changer un mot. Sa réponse sera consignée ici et dans
> `decisions.md`.

## 1. Dans le jeu

| Où on le lit | Clé | Le texte | Pourquoi |
|---|---|---|---|
| Sur la carte, au-dessus de la phrase de la mesure | `game.gist.badge` | **Phrase écrite et vérifiée par une IA** | D19.2 : la phrase dit elle-même ce qu'elle est, avant d'être lue. Le singulier de l'étiquette de « Demander » (« Phrases écrites et vérifiées par une IA », D16.59) |
| Fin de la deuxième manche | `game.depth.chapter` | **Maintenant, le jeu donne la partie et demande le chapitre.** | D19.4 : une seule question par mot. Remplace « Maintenant, le jeu demande aussi le chapitre. » |
| Fin de manche, titre du rappel | `game.recall.title` | **Tu te souviens ?** | Le nom que le plan lui donne |
| Fin de manche, sous ce titre | `game.recall.lead` | **Essaie de tête, puis touche un mot.** | Se souvenir avant de relire : c'est ce qui fait retenir. Une ligne à 390 px |
| Fin de manche, sous « Trois autres mots » | `game.round.ahead` | **Les prochains mots** | Suivi des trois mots de la manche d'après : « Les prochains mots : « fontaines », « ponts », « gare ». » Ce qui vient, jamais ce qui reste |
| Fin de manche, sous « Envoyer le lien du jeu » | `game.share.same` | **Les mêmes mots pour tout le monde.** | Vrai : la liste se lit dans le même ordre pour tous. De quoi en parler, sans score |
| Fin de manche, tant que rien n'est gardé | `turtle.keep.open` | **Retrouver ta tortue plus tard** | D19.11 : le bouton discret qui ouvre la carte « Garder ta tortue ». Au-dessus de lui, une phrase déjà validée : « Rien n'est gardé une fois cette page fermée. » |
| Fin de la manche 5, sous le titre | `turtle.sign.ajar` | **Ses ailes s'entrouvrent.** | Son signe, déjà dessiné, dit quand il paraît. Une attitude, jamais une quantité |
| Fin de la manche 10 | `turtle.sign.up` | **Elle lève les yeux.** | idem |
| Fin de la manche 13 | `turtle.sign.star` | **Une étoile paraît au-dessus d'elle.** | idem |
| Sa fiche, sous « Ce qu'elle a trouvé » | `turtle.found.lead` | **Touche un mot : sa carte se rouvre.** | Chaque mot trouvé est un bouton |

## 2. Sur les pages de faits

Ces phrases ne paraissent **que dans une build dont le jeu montre des phrases** (D19.5) : si le
site ne répond plus aux questions, ou tant que le fichier des phrases du jeu n'est pas validé,
aucune n'est rendue, et les pages disent ce qu'elles disent aujourd'hui.

| Où on le lit | Clé | Le texte |
|---|---|---|
| À propos (« Qui écrit quoi ») ; Exactitude (« La réponse à une question ») | `about.gists_game` | **Le jeu montre aussi de ces phrases, sur ses cartes. Chacune dit la mesure où le mot est écrit.** |
| Méthode (« Quand tu demandes ») | `about.gists_game_method` | **Les phrases du jeu arrivent avec lui, dans un fichier. Jouer n'envoie rien.** |
| Exactitude (« Les mots du jeu ») | `accuracy.game.sentences` | **Sur les cartes, 47 phrases disent une mesure avec nos mots. Ce sont celles de « Demander ». Chacune est épinglée à l'empreinte de sa mesure.** — le nombre est lu dans le jeu de la build |
| Exactitude, même endroit, s'il y en a | `accuracy.game.link_only` | **Cartes sans phrase, avec leur lien seul : 1.** — le nombre est lu de même |
| Exactitude (« Nos propres textes ») | `accuracy.review.sentences_game` | **Les phrases de « Demander » et du jeu sont à part. Une IA les a écrites et vérifiées elle-même. Personne ne les a relues une à une.** — remplace « Les phrases de « Demander » sont à part. … » |
| Licence et sources | `legal.license.sentences_game` | **Quand tu demandes, et dans le jeu, des phrases disent une mesure avec nos mots. Ce ne sont pas des extraits du livre : son texte reste sur le site officiel.** — remplace « Quand tu demandes, des phrases disent chaque mesure avec nos mots. … » |
| Licence et sources, à la suite | `legal.license.game_file` | **Celles du jeu sont aussi dans un fichier public, avec le code.** |

## 3. La description de l'accueil

Ce que lisent un moteur de recherche et l'aperçu d'un lien. Là où le jeu ouvre l'accueil ; les
autres pages et la build « scrutin » gardent la phrase d'aujourd'hui (« Retrouver une mesure de
L'Avenir en commun, et la lire à sa source. »).

| Clé | Le texte |
|---|---|
| `home.description` | **Un jeu : où est-ce écrit dans L'Avenir en commun ? On peut aussi chercher une mesure et la lire à sa source.** |

## 4. Ce que ces textes ne disent pas, exprès

- Aucun ne dit combien de mots restent, ni où en est le joueur (D19.3).
- Aucun ne dit qu'une personne a lu les phrases : aucune ne l'a fait (D16.59).
- Aucun ne félicite, ne note, ne classe.
- La phrase d'une carte n'est jamais placée sous « C'est écrit là » : ce lien se lirait d'elle
  (D16.64, D19.10).
