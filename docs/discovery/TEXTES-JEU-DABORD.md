# Les textes du chantier « Le jeu d'abord » — validés par l'éditeur le 19 novembre 2026

> **VALIDÉS LE 19 NOVEMBRE 2026 (D19.19).** À la question « Les dix-huit textes nouveaux du
> chantier : tu les valides ? », posée avec ce document et le point de « vérifiée », l'éditeur a
> répondu : **« Je valide les dix-huit »**. L'étiquette de la phrase d'une carte reste donc
> « Phrase écrite et vérifiée par une IA ». Aucun n'est servi : la production attend son
> « oui » daté. Changer un mot de l'un d'eux redemande sa validation.
>
> **Ce qui suit est le document tel qu'il l'a validé.** Tous étaient des propositions de la
> session. Le plan (`PLAN-JEU-DABORD.md`, lot 7) demande un seul document
> de toutes les phrases nouvelles depuis la build en ligne (kit `design/strings.json`,
> v0.13.0 → v0.14.0). Le voici : **dix-huit textes**, dont trois en remplacent un autre là où
> ils valent. Chacun tient les règles du kit — quinze mots au plus par phrase, aucun mot de
> récompense, de rang ni de verdict, « tortue » dans les seules clés `turtle.*`, les espaces
> insécables de la typographie française.
>
> **Ce que le lot 8 a changé à cette liste** (`13-tests-humains.md` §9) : quatre textes
> s'ajoutent — l'entrée du jeu, née de D19.15 (« Le premier écran doit donner envie, sinon on
> remplace pas. ») et reprise sur D19.16 (« …bien plus envie que le premier écran actuellement
> en ligne. C'est non négociable. ») ; cinq sont retirés avant d'avoir été montrés — les trois phrases qui disaient ses
> signes, « Les mêmes mots pour tout le monde. », et le compte des cartes sans phrase ; cinq
> sont corrigés après la relecture hostile ; la ligne du rappel a changé après la session des
> personas.
>
> **Ce qui n'a pas bougé** : les huit phrases inscrites dans sa planche (`game.title`,
> `game.kicker`, `game.question.part`, `game.dont_know`, `game.round.done`,
> `game.round.again`, `independence.unofficial`, `nav.toc`), toutes les lignes de la page
> Confidentialité, et les phrases de la carte « Garder ta tortue », au mot près.
>
> **Validation** : donnée le 19 novembre 2026, consignée ici et dans `decisions.md` (D19.19).

## 1. L'entrée du jeu (D19.15, D19.16)

Ce qu'un nouveau venu trouve à la place de la question et des six tuiles : **trois mots à
toucher**, ceux de la première manche. Toucher un mot ouvre sa carte ; la manche continue avec
les deux autres, chacun avec sa question. Mesuré face à l'accueil en ligne
(`13-tests-humains.md` §9.8).

| Où on le lit | Clé | Le texte | Pourquoi |
|---|---|---|---|
| Au-dessus des trois mots | `game.start.hook` | **Trois mots du programme. Que prévoit-il ?** | Dit ce que sont ces mots, et pose la question à laquelle le geste répond. Deux phrases, chacune sur sa ligne |
| Sous les trois mots | `game.start.source` | **Touche un mot pour voir sa mesure. Chaque carte mène à la page officielle.** | Ce que fait le geste ; et ce que les lecteurs citent comme ce qui les rassure : on peut vérifier soi-même |
| Dans le nom de chaque mot, pour un lecteur d'écran | `game.start.cta` | **Voir la mesure** | « wagon — Voir la mesure » : ce que fait le geste, dit à qui ne voit pas la flèche. N'est pas affiché |
| Sous un filet | `game.start.find` | **Tu cherches autre chose ?** | La seconde porte dite pour ce qu'elle est. Dessous, deux textes qui existent déjà : « Chercher dans le programme » (`home.direct.cta_search`), en bouton, et six thèmes |

Les six thèmes — Logement, Transports, Salaires, Retraites, Impôts, Énergie, chacun un lien
vers notre réponse — sont ceux qui ne reposent sur aucune section dont le jeu ne tire pas de
mot (D16.26) : ni « Immigration », ni « Police et sécurité », ni « Laïcité » à côté de la
mascotte. « Chercher dans le programme » est un bouton, pas un champ : rien ne se tape à côté
d'elle (D19.9).

## 2. Dans le jeu

| Où on le lit | Clé | Le texte | Pourquoi |
|---|---|---|---|
| Sur la carte, au-dessus de la phrase de la mesure | `game.gist.badge` | **Phrase écrite et vérifiée par une IA** | D19.2 : la phrase dit elle-même ce qu'elle est, avant d'être lue. Le singulier de l'étiquette de « Demander » (« Phrases écrites et vérifiées par une IA », D16.59). Le relecteur hostile contestait « vérifiée » — une phrase « vérifiée », celle de « wagon », est lue à l'envers par six lecteurs sur sept ; **tranché par l'éditeur : l'étiquette reste** (D19.19), et la carte « wagon » n'a pas de phrase pour l'instant (D19.20) |
| Fin de la deuxième manche | `game.depth.chapter` | **Maintenant, le jeu donne la partie et demande le chapitre.** | D19.4 : une seule question par mot. Remplace « Maintenant, le jeu demande aussi le chapitre. » |
| Fin de manche, titre du rappel | `game.recall.title` | **Tu te souviens ?** | Le nom que le plan lui donne |
| Fin de manche, sous ce titre | `game.recall.lead` | **Touche un mot : sa carte se rouvre.** | Dit ce que le geste fait ; le titre porte seul l'invitation à se souvenir. Avant la session des personas : « Essaie de tête, puis touche un mot. » — lu comme une révision de cours par trois sur sept, et deux ne savaient pas ce que toucher ferait |
| Fin de manche, sous « Trois autres mots » | `game.round.ahead` | **Les prochains mots** | Suivi des trois mots de la manche d'après : « Les prochains mots : fontaines, ponts, gare. » Ce qui vient, jamais ce qui reste — et plus rien une fois tous les mots trouvés |
| Fin de manche, tant que rien n'est gardé | `turtle.keep.open` | **Retrouver ta tortue plus tard** | D19.11 : le bouton discret qui ouvre la carte « Garder ta tortue ». Au-dessus de lui, une phrase déjà validée : « Rien n'est gardé une fois cette page fermée. » |
| Sa fiche, sous « Ce qu'elle a trouvé » | `turtle.found.lead` | **Touche un mot : sa carte se rouvre.** | Chaque mot trouvé est un bouton |

## 3. Sur les pages de faits

Ces phrases ne paraissent **que dans une build dont le jeu montre des phrases** (D19.5) : si le
site ne répond plus aux questions, ou tant que le fichier des phrases du jeu n'est pas validé,
aucune n'est rendue, et les pages disent ce qu'elles disent aujourd'hui.

| Où on le lit | Clé | Le texte |
|---|---|---|
| À propos (« Qui écrit quoi ») ; Exactitude (« La réponse à une question ») | `about.gists_game` | **Le jeu montre aussi de ces phrases, sur ses cartes. Chacune dit une mesure où le mot est écrit.** — « une », pas « la » : un mot peut être écrit dans plusieurs mesures |
| Méthode (« Quand tu demandes ») | `about.gists_game_method` | **Les phrases du jeu arrivent avec lui, dans un fichier. Jouer n'envoie rien.** |
| Exactitude (« Les mots du jeu ») | `accuracy.game.sentences` | **Sur les cartes, 43 phrases disent une mesure avec nos mots. Une IA les a écrites : ce sont celles de « Demander ». L'empreinte prouve que la mesure n'a pas changé depuis, pas que la phrase est juste.** — le nombre est lu dans le jeu de la build. Corrigée au lot 8 : elle ne disait ni qui a écrit ces phrases, ni ce qu'une empreinte ne prouve pas |
| Exactitude (« Nos propres textes ») | `accuracy.review.sentences_game` | **Les phrases de « Demander » et du jeu sont à part. Une IA les a écrites et vérifiées elle-même. Personne ne les a relues une à une.** — remplace « Les phrases de « Demander » sont à part. … » |
| Licence et sources | `legal.license.sentences_game` | **Quand tu demandes, et dans le jeu, des phrases disent une mesure avec nos mots. Ce ne sont pas des extraits du livre : son texte reste sur le site officiel.** — remplace « Quand tu demandes, des phrases disent chaque mesure avec nos mots. … » |
| Licence et sources, à la suite | `legal.license.game_file` | **Celles du jeu sont aussi dans un fichier public. Aucune licence de réutilisation n'est donnée sur elles.** — corrigée au lot 8 : « avec le code » se lisait « sous la licence du code » |

## 4. La description de l'accueil

Ce que lisent un moteur de recherche et l'aperçu d'un lien. Là où le jeu ouvre l'accueil ; les
autres pages et la build « scrutin » gardent la phrase d'aujourd'hui (« Retrouver une mesure de
L'Avenir en commun, et la lire à sa source. »).

| Clé | Le texte |
|---|---|
| `home.description` | **Site non officiel. Un jeu sur L'Avenir en commun : un mot, sa mesure, et où elle est écrite. On peut aussi chercher dans le programme.** — corrigée au lot 8 : l'aperçu d'un lien ne montre pas l'en-tête du site ; la description dit donc d'abord ce qu'il n'est pas |

## 5. Retirés au lot 8, avant d'avoir été montrés

| Clé | Le texte | Pourquoi |
|---|---|---|
| `turtle.sign.ajar`, `turtle.sign.up`, `turtle.sign.star` | « Ses ailes s'entrouvrent. », « Elle lève les yeux. », « Une étoile paraît au-dessus d'elle. » | « mièvre », « obscur », « pas limpide » pour trois personas ; « phrases d'album pour enfants » pour le relecteur hostile (R55). Ses signes restent dessinés ; plus rien ne les nomme |
| `game.share.same` | « Les mêmes mots pour tout le monde. » | Lue « comme Wordle » par trois personas, alors que rien ne change chaque jour |
| `accuracy.game.link_only` | « Cartes sans phrase, avec leur lien seul : 1. » | Un nombre de ce qui manque, sans dire pourquoi, sur la page des faits |

## 6. Ce que ces textes ne disent pas, exprès

- Aucun ne dit combien de mots restent, ni où en est le joueur (D19.3).
- Aucun ne dit qu'une personne a lu les phrases : aucune ne l'a fait (D16.59).
- Aucun ne félicite, ne note, ne classe.
- « C'est écrit là » n'est jamais placé sous la phrase d'une carte : ce lien se lirait d'elle
  (D16.64, D19.10). Il vient avant, attaché au lieu.
- L'entrée ne dit rien de la tortue : « Ta tortue change quand tu trouves des mots. » vient
  avec la première carte.
- Aucun ne dit « le mot du jour », ni rien qui promette que les mots changent : ils ne
  changent pas.
