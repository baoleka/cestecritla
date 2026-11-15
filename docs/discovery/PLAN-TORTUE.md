# Plan — ta tortue évolue : refonte de la gamification de « Où est-ce écrit ? »

> **Approuvé par l'éditeur le 15 novembre 2026** (D17.1 à D17.15, `decisions.md`). Ce fichier est
> le plan tel qu'il l'a approuvé, écrit pour lui (« tu ») ; son **journal d'exécution**, en fin de
> fichier, dit où en est le travail. Rien de ce plan n'est en ligne tant que le journal ne dit pas
> que la production a été basculée.

## Contexte

**Ta demande (15 novembre 2026).** Une incitation claire à faire évoluer sa tortue, une tortue plus
interactive et plus présente : elle surfe (état 1), devient un flamant à la couleur d'une partie
(état 2), vole au-dessus de l'eau (état 3), puis un état ultime (état 4) ; une animation à chaque
changement d'état. Rien ne se code ni ne se déploie avant ton accord sur ce plan.

**Ce que la lecture a établi** (VÉRIFIÉ dans le dépôt, sauf mention) :

- Le jeu : 48 mots, 16 manches. Seuils actuels, calculés sur la liste : état 1 après la manche 1,
  état 2 après la 2, état 3 après la 7, état 4 après la 16 (`src/lib/game-engine.ts`, `turtleOf`).
- **Le tirage est le même pour tout le monde** (`draw` : l'ordre de la liste). « Le plus de mots
  trouvés par partie » donne donc à chacun la même couleur : six parties à égalité à la manche 2,
  puis la partie 4 (19 mots sur 48) dès la manche 5.
- Ce que les personas ont dit (session du 14 novembre, HYPOTHÈSE — des agents, sur images fixes) :
  « dans son coin, j'avais pas remarqué qu'elle changeait », « minuscule sur la page », « je pensais
  qu'elle allait faire un truc… Bof », « toute seule j'aurais jamais touché la tortue » ; la seule
  phrase qui félicitait a été mal reçue par les sept ; un persona fermait la page pour « une tortue
  qui gigote toute seule ».
- **Les couleurs officielles des six parties** n'étaient pas dans le crawl local. Lues le
  15 novembre avec ton accord (9 requêtes vers le site officiel, des feuilles de style, rien
  d'écrit) : une famille par partie — 1 bleu ciel, 2 orange, 3 vert, 4 jaune, 5 rouge, 6 violet.
  Aucune n'est rose.
- **Ni flamant, ni surf, ni vague, ni oiseau dans l'imagerie de la campagne** : 0 occurrence dans
  les 33 pages du crawl local, rien dans les documents du dépôt, rien dans trois recherches web
  (PROBABLE : les réseaux sociaux ne sont pas couverts). La tortue officielle pousse une jauge,
  livre du matériel, tient un lait fraise.
- Poids mesurés le 15 novembre (gzip, arrondis : deux outils donnent quelques octets d'écart) :
  dessin ≈ 0,5 Ko et sa feuille ≈ 1,7 Ko (plafond 6 Ko pour les deux) ; script du jeu ≈ 6,3 Ko
  (plafond 10 Ko) ; page d'accueil ≈ 12,2 Ko (aucun plafond).

**Le résultat visé.** Une tortue qu'on voit, qu'on a envie de faire changer, et qui change quatre
fois de façon mémorable — sans score, sans nombre, sans rien de plus qui quitte le téléphone, et
sans jamais rendre la production indéployable pendant le chantier.

## 1. Tes décisions du 15 novembre (à consigner : D17.1 à D17.15)

| # | Décision | Ce qu'elle amende ou confirme |
|---|---|---|
| D17.1 | **Seuils inchangés** : surf après la manche 1, flamant après la 2, envol après la 7, état ultime après la 16 | confirme D16.12 |
| D17.2 | **Elle s'appelle toujours « ta tortue »**, quelle que soit sa forme ; une phrase dit le passage | amende D16.11 (« une tortue ») : ta tortue devient un flamant ; D16.20 tient |
| D17.3 | **Le joueur choisit la couleur du flamant**, parmi six ; modifiable dans sa fiche | amende `illustration-rules.md` §2.3 (« pas codée par partie ») ; D16.12 et D16.14 tiennent (aucun choix de jeu gardé) ; un champ de plus |
| D17.4 | Les couleurs officielles sont lues ; **la palette se tranche sur la planche** | accord de requête donné et consommé |
| D17.5 | **Le but s'annonce en mots et en signes**, aucun nombre | confirme le non négociable et la règle 4 de §7.11 |
| D17.6 | **Ce qui récompense, c'est ce qui lui arrive** : l'animation, une phrase qui la décrit, un geste nouveau | D16.37 tient ; **amende D16.43** : le point au sommet de la carapace laisse la place à un détail d'accent par scène |
| D17.7 | **Jamais seule** ; davantage de gestes obtiennent une réponse | confirme D16.13 |
| D17.8 | **Une évolution : 4,5 s au plus**, sans éclair, passable, jouée quand on vient de la gagner, **à revoir dans sa fiche** | amende D16.13 (1 600 ms), `motion-spec.md`, `perf-budget.md` P7 |
| D17.9 | **Plus présente dans le bloc du jeu, et nulle part ailleurs** : à côté du mot, sur une scène en fin de manche, plus grande dans sa fiche | la règle de lieu de D16.11 tient ; amende « 72 px » |
| D17.10 | **Le partage ne change pas** : l'adresse nue | confirme D16.17 |
| D17.11 | **Pas de nouveaux mots** pour cette refonte | — |
| D17.12 | **Décor admis, jamais une jauge** ; le flamant est un oiseau de profil ; la planche de surf est le seul objet ; la couleur de partie ne touche que le flamant ; « ni mauve, ni prune, ni rose » tient | amende `illustration-rules.md` §2.2 (points 3, 8, 9 ; « aucun accessoire ») et §2.3 |
| D17.15 | **L'état 4 est « la tortue dans le ciel »** : des étoiles dessinent sa première forme au-dessus du flamant en vol (§6) | prolonge D17.2 : elle reste « ta tortue » jusqu'au bout |

S'y ajoutent deux propositions du plan, que ton accord sur ce plan validerait : **D17.13** les
nouveaux plafonds (§8) et **D17.14** l'aperçu d'abord, par un interrupteur par hôte (§11).

## 2. Mes réponses aux dix points

1. **La tortue.** Tranché : D17.1, D17.2. Elle est tortue aux états 0 et 1 (deux manches),
   flamant ensuite ; elle reste « ta tortue » dans tous les textes, et sa fiche garde ses formes
   de tortue (« Son parcours »). À l'état 4, elle revient : une tortue d'étoiles dans le ciel (D17.15).
   Ni le surf ni le flamant ne reprennent un personnage de la campagne (PROBABLE, voir Contexte) ;
   la question « même personnage ? » sera reposée sur les nouveaux dessins, images officielles à
   côté. Reste interdit : toute boisson, toute paille, tout rose lait-fraise.
2. **« La partie dont on est le meilleur ».** Tranché : D17.3. Ce que chaque définition aurait
   coûté — *mots trouvés* : rien à garder, mais la même couleur pour tous ; *bons premiers choix* :
   six compteurs à garder, D16.12 et D16.14 amendées, « Tes choix ne sont pas gardés » fausse, et
   une couleur *mesurée* visible à l'écran ; *choisie* : un seul petit nombre, déclaré par la
   personne. Vie privée : §9.
3. **« Une incitation claire ».** Tranché : D17.5. Comment : §7. Avec des compteurs, le but
   aurait été plus lisible, au prix du non négociable, d'une capture « 12 sur 48 », et d'une
   créature le long d'une barre — le rôle exact de la tortue officielle.
4. **« Récompensante ».** Tranché : D17.6. Aucune phrase ne parle du joueur ; chaque passage a sa
   phrase qui la décrit, son animation, et ouvre un geste nouveau (§4).
5. **Une animation par évolution.** Tranché : D17.8. Les quatre sont décrites au §5. Ce que je
   prends de l'idée : un moment à part. Ce que je ne prends pas : silhouette blanche qui clignote,
   fond qui change, son, formule de félicitation. Notre procédé : **le trait qui s'écrit** — la
   forme se défait et se refait comme une ligne, le vocabulaire des arcs de sa carapace et d'un
   site qui s'appelle « C'est écrit là ».
6. **Surf, vol, « plus présente ».** Tranché : D17.7, D17.9, D17.12. Nouveaux plafonds : §8.
7. **Où elle apparaît.** Tranché : D17.9. *Oui* : à côté du mot pendant qu'on joue (à l'écran dès
   que le mot l'est), sur la scène de fin de manche, dans sa fiche. *Jamais* : l'en-tête du site,
   le champ, les résultats de recherche, la feuille de « Demander », une fiche de section (dont
   les dix-huit sensibles), le sommaire, nos réponses et nos mots expliqués, les pages légales,
   la page 404, la page d'attente, la build « scrutin », l'aperçu de lien, le favicon, ce qui se
   partage.
8. **Les couleurs des parties.** Lues (Contexte). Mesuré contre nos couleurs : en thème clair
   les teintes claires officielles portent notre trait violet à 4,8:1 au moins ; en thème sombre
   les teintes foncées portent notre trait crème à 5,2:1 au moins — la même bascule que la
   carapace. Un écart : le lilas de la partie 6 tombe dans la zone « lavande » que notre porte
   refuse ; notre Violet 200 le remplace. **Reprendre ce code rapproche le site de la campagne** :
   ce serait un quatrième emprunt à écrire dans `identity-decision.md` §5.2. Je dessine deux
   palettes sur la planche — *les six familles officielles, dans des valeurs mesurées* (ma
   recommandation : la couleur dit vrai, c'est celle que le lecteur retrouve sur la page
   officielle) et *les vives de la charte* — et tu tranches là. Le jeu de couleurs neutre reçoit
   six teintes à lui. `part-color` (2025, quatre parties) est remplacé.
9. **Partage, silence, état déjà gardé.** Partage : inchangé (D17.10), et un contrôle tient que
   la couleur n'est dans aucune adresse ni aucune requête. Silence : tout ce qui est neuf vit dans
   `#jeu`, que le gel masque déjà ; une évolution en cours s'arrête au gel ; la build « scrutin »
   ne contient rien du jeu. État déjà gardé : la clé `cestecritla.jeu.v1` **n'est pas renommée**,
   le champ neuf est optionnel, un état écrit par la version actuelle se relit tel quel, et « elle
   ne recule jamais » reste une propriété testée (§9). Conséquence à connaître : qui a gardé une
   tortue à l'état 2 ou plus retrouvera un flamant pâle, sans animation (un état qui revient du
   téléphone ne joue rien) ; sa fiche lui propose de revoir les passages et de choisir sa couleur.
10. **Le contenu.** Tranché : D17.11. Ce que 48 mots laissent : neuf manches entre l'envol et
    l'état ultime. Deux signes d'approche (§7) et la phrase « À la prochaine manche, elle change. »
    tiennent ce plateau. Après l'état 4, le jeu continue en boucle jusqu'à la section, comme
    aujourd'hui, sans rien de plus à gagner : c'est dit au §10 comme une suite possible.

## 3. Les critères d'évolution, état par état

Inchangés (D17.1) : elle évolue par ce qu'on a **trouvé** — un mot compte dès que son emplacement
est montré, quel que soit le choix —, en fin de manche, et ne recule jamais. Les manches sont
celles de la liste actuelle ; un test les recalcule depuis la liste et les imprime.

| État | Forme | Critère | Arrive | Le jeu ouvre en même temps |
|---|---|---|---|---|
| 0 | tortue | — | au départ | |
| 1 | tortue qui surfe | le premier mot trouvé | fin de la manche 1 | |
| 2 | flamant, pâle puis à la couleur choisie | un mot trouvé dans chacune des six parties | fin de la manche 2 | la question va jusqu'au chapitre |
| 3 | flamant en vol au-dessus de l'eau | un mot trouvé dans chacun des 17 chapitres où la liste a un mot | fin de la manche 7 | la question va jusqu'à la section |
| 4 | flamant en vol sous une tortue d'étoiles (§6) | les 48 mots trouvés | fin de la manche 16 | |

Ses **trois arcs** la suivent : sur la carapace de la tortue, puis sur l'aile du flamant — mêmes
traits continus, mêmes six pas, même champ gardé. Le flamant naît **pâle** (un flamant n'a pas sa
couleur à la naissance) ; c'est le joueur qui la lui donne.

## 4. Chaque état : ce qu'elle fait, ce qu'on peut lui faire

Règle commune (D17.7) : elle garde la pose, et **cinq gestes** obtiennent une réponse — la toucher
(une figure, puis sa fiche s'ouvre), demander un indice (elle regarde les tuiles, puis les tuiles
se marquent : l'indice vient d'elle), **chaque mot trouvé** (un petit mouvement, le même quel que
soit le choix — un contrôle le tient), la fin de manche (les trois trouvailles viennent à elle,
son arc grandit), « Revoir » dans sa fiche. Un geste dure 900 ms au plus, comme aujourd'hui.
**En mouvement réduit, pour tous les états : rien ne démarre** ; la pose est fixe, sa fiche
s'ouvre, l'indice marque les tuiles, et aucune phrase n'annonce un mouvement qui n'a pas lieu.

| État | Dessin | La toucher (figure) | Mot trouvé | Formes visibles |
|---|---|---|---|---|
| 0 | la tortue d'aujourd'hui, inchangée | elle lève la tête | elle hoche la tête | 11 |
| 1 | la même tortue, penchée, sur une planche, sur une vague au trait | elle prend un virage, l'écume saute | elle rebondit sur la vague | ≈ 16 |
| 2 | flamant debout de profil, sur une patte, cou en S ; l'ancienne carapace est son aile, avec ses arcs ; un rond dans l'eau | elle change de patte et étire le cou | elle plonge la tête | ≈ 14 |
| 3 | le même, ailes ouvertes, cou et pattes tendus ; une ligne d'eau, son reflet à plat | deux battements d'ailes | un battement | ≈ 16 |
| 4 | le flamant en vol, sous un pan de ciel où neuf étoiles et un trait dessinent une tortue, ses trois arcs dans la carapace | le trait de la constellation se récrit | une étoile bat, une fois | ≈ 28 |

Poids : un seul dessin SVG pour tous les états, écrit à la main, géométrie et classes seulement.
Mesuré sur un brouillon synthétique (les formes actuelles recopiées avec d'autres chiffres) :
72 formes ≈ 2,7 Ko gzip, une feuille de style cinq fois plus longue ≈ 2,4 Ko hors commentaires.
Les plafonds du §8 partent de là ; ils sont **mesurés pour de bon au lot A1, avant d'être écrits
dans les portes**.

Ce qui s'écrit sur le dessin, et rien d'autre : `data-state`, `data-pose`, `data-passage`,
`data-live` (existants), `data-tint` (sa couleur), `data-sign` (signe d'approche), `data-phase`
(temps d'une évolution), et les deux attributs de chaque arc. Aucun HTML inséré, aucun style en
ligne.

**Comment c'est construit, et pourquoi** (les compromis) :

1. *Un seul dessin pour tous les états, dans la page* — plutôt qu'un fichier par forme chargé à la
   demande : la règle de sécurité interdit d'insérer du HTML par script, et une image externe ne
   prend ni le thème, ni la couleur, ni la pose. Coût : ≈ 2,5 Ko dans l'accueil pour tous.
2. *Des attributs et une feuille de style, aucune bibliothèque d'animation* : le script écrit des
   `data-*`, la feuille fait le reste. Zéro dépendance, le mouvement réduit tenu par une seule
   règle, des portes qui lisent la feuille. Coût : pas de fondu de formes — on compose avec des
   traits qui s'écrivent, des transformations et des fondus d'opacité.
3. *La chorégraphie est une donnée* (`src/lib/mascot2.ts` : une liste de temps par passage, comme
   les images de `src/lib/turtle.ts` aujourd'hui) : sa durée, son ordre et l'absence d'éclair se
   testent sans navigateur, et la planche la rejoue à l'identique.
4. *Elle change de place par la feuille de style* (un attribut sur le bloc : à côté du mot, ou sur
   la scène), jamais en déplaçant ni en doublant le dessin : un seul dessin dans le jeu, un seul
   état à tenir. Sa fiche garde sa copie, comme aujourd'hui.
5. *La même clé de stockage, un champ optionnel* — plutôt qu'une clé neuve et une migration : une
   migration écrirait sur le téléphone sans geste, et la lecture champ par champ existe déjà.
6. *Deux générations côte à côte, un interrupteur par hôte* (§11) — plutôt qu'une branche longue : la
   production reste déployable, le retour arrière est une ligne. Et *des fichiers neufs plutôt que
   des coutures dans les fichiers actuels* : la version en ligne reste identique par construction,
   sans dépendre de ce que l'outil de build sait retirer. Coût : le script du jeu et ses portes en
   double jusqu'au ménage.

## 5. Les quatre évolutions, temps par temps

Règles communes (D17.8) :

- **Jouée une fois, quand on vient de la gagner** : seulement à la fin de la manche qui franchit le
  seuil, dans la page où le geste a eu lieu. Jamais au chargement, jamais quand l'état revient du
  téléphone, d'un autre onglet ou du cache « précédent » : la forme est alors posée d'un coup.
- **Sur la scène** : à la fin d'une manche elle quitte le coin du mot et prend une scène large en
  haut du panneau (240 px, 150 px de haut au plus). Rien de modal : les boutons du dessous restent
  vivants, **un appui pendant l'évolution atteint sa cible** (et la passe).
- **La passer** : le bouton « Passer » sur la scène, un appui sur la scène, Échap, ou tout bouton
  du jeu. La forme finale est posée aussitôt.
- **Sans éclair** : aucune surface ne s'allume et ne s'éteint ; chaque changement de lumière est une
  seule rampe d'au moins 350 ms ; les petits éléments d'accent paraissent à 350 ms d'écart au
  moins. Cible : 0 éclair ; porte : jamais plus de 3 par seconde, mesuré image par image (§12).
- **Mouvement réduit** : la nouvelle forme s'affiche d'un coup, avec sa phrase.
- **Lecteur d'écran** : l'évolution *est* sa phrase, dite par la ligne de statut du jeu.
- Chaque évolution commence par le même temps : **les trois trouvailles de la manche viennent à
  elle** — c'est ce qui dit pourquoi elle change.

**0 → 1 — « La vague arrive »** · 2 400 ms · phrase : « Elle prend la vague. »

| ms | Ce qu'on voit |
|---|---|
| 0 – 400 | trois points viennent à elle ; elle lève la tête ; le premier arc paraît sur sa carapace |
| 400 – 1 000 | un trait s'écrit depuis la gauche, sous elle, et gonfle en vague |
| 1 000 – 1 500 | une planche glisse sous ses pattes ; elle fait un petit saut et s'y pose |
| 1 500 – 2 000 | la vague monte et la porte ; elle se penche vers l'avant |
| 2 000 – 2 400 | la crête s'enroule ; deux gouttes d'écume, l'une après l'autre, dans la couleur d'accent ; elle se cale |

**1 → 2 — « La vague la redessine »** · 4 200 ms · phrase : « Ta tortue est devenue un flamant. »

| ms | Ce qu'on voit |
|---|---|
| 0 – 400 | les trois points ; elle se ramasse sur sa planche |
| 400 – 1 200 | la vague grandit et se referme sur elle, à plat : on ne la voit plus (c'est là que la forme change, sans rien qui clignote) |
| 1 200 – 1 500 | un temps de calme ; une bosse court sur la vague |
| 1 500 – 2 300 | un trait sort de l'eau et monte : le cou s'écrit, se courbe en S ; la tête paraît au bout |
| 2 300 – 3 000 | la vague retombe en un rond dans l'eau ; le corps se découvre — sa carapace est devenue son aile, ses arcs dessus ; les pattes s'allongent et la soulèvent |
| 3 000 – 3 600 | elle replie une patte ; si une couleur est déjà choisie, elle gagne le corps depuis l'aile |
| 3 600 – 4 200 | elle se cale ; le rond dans l'eau prend la couleur d'accent |

Puis, sous la scène : « Choisir sa couleur » (ouvre sa fiche à « Sa couleur »).

**2 → 3 — « L'envol »** · 3 600 ms · phrase : « Elle s'envole. »

| ms | Ce qu'on voit |
|---|---|
| 0 – 400 | les trois points ; les deux pattes à l'eau, elle s'abaisse, le cou vers l'avant |
| 400 – 1 500 | elle court sur l'eau, comme le font les flamants : trois pas, un rond à chaque pas |
| 1 500 – 2 100 | les ailes s'ouvrent ; un premier battement |
| 2 100 – 2 900 | elle décolle ; les pattes passent à l'arrière, le cou se tend ; la ligne d'eau descend ; son reflet paraît |
| 2 900 – 3 600 | deux battements plus lents, puis elle plane ; le dernier rond prend la couleur d'accent |

**3 → 4 — « La tortue dans le ciel »** · 4 400 ms · phrase : « Il y a une tortue dans le ciel. »

| ms | Ce qu'on voit |
|---|---|
| 0 – 400 | les trois points viennent à elle ; elle plane |
| 400 – 1 100 | un pan de ciel paraît derrière elle, en une seule rampe ; l'eau s'assombrit du même pas |
| 1 100 – 3 300 | neuf étoiles s'allument une à une, sans jamais s'éteindre : elles suivent une carapace, une tête, des pattes |
| 3 300 – 3 900 | un trait s'écrit d'étoile en étoile ; ses trois arcs se dessinent dans la carapace du ciel |
| 3 900 – 4 400 | elle passe sous sa constellation, d'un battement d'ailes ; la dernière étoile prend la couleur d'accent |

**Un saut de plusieurs états** (une liste qui change entre deux visites) : pas d'animation, un fondu
simple vers la forme finale.

**Revoir** (sa fiche, « Son parcours ») : les formes qu'elle a eues, en petit, dans l'ordre ; à
chaque passage déjà franchi, « Revoir » le rejoue sur la grande image de la fiche, passable de la
même façon. Rien n'y montre une forme à venir. En mouvement réduit, « Revoir » n'est pas proposé.

## 6. L'état 4 : la tortue dans le ciel (ton choix, D17.15)

- **Ce que c'est.** Le soir tombe sur l'eau. Au-dessus du flamant en vol, neuf étoiles et un trait
  dessinent une tortue — sa première forme, ses trois arcs dans la carapace. Elle est restée
  « ta tortue » jusqu'au bout.
- **Son arrivée** : §5, 4 400 ms. Aucune étoile ne s'éteint, le ciel paraît en une seule rampe.
- **Ensuite.** La toucher : le trait de la constellation se récrit (900 ms au plus). Un mot
  trouvé : une étoile bat, une fois. L'indice : elle regarde les tuiles, comme aux autres états.
- **Sa phrase** : « Il y a une tortue dans le ciel. »
- **Le dessin.** La constellation réemploie le tracé même de la tortue, au trait : c'est elle, pas
  une autre. Elle ne porte aucune couleur de partie : l'état 4 ne dépend pas de la palette.
- **Ce qui se règle sur la planche** : le pan de ciel en thème sombre (la page y est déjà nuit) et
  dans le jeu de couleurs neutre ; le nombre d'étoiles si le plafond de formes l'exige.
- **Écartés** : « la volée » (cinq autres flamants en V, un par couleur de partie — une nuée peut se
  lire « le mouvement ») et « l'éventail » (six plumes de six couleurs — peut se lire
  « arc-en-ciel »).

## 7. Le but, sans nombre (D17.5)

- **Dès le départ**, une ligne près d'elle, à l'état 0 seulement : « Elle change quand tu trouves des
  mots. »
- **À chaque fin de manche, une seule phrase sur elle**, sous le titre :
  - manche à passage : la phrase du passage (§5), suivie de « À la prochaine manche, elle change
    encore. » quand c'est vrai (c'est le cas à la fin de la manche 1) ;
  - autre manche : ce qui la fera changer — état 1 : « Elle changera encore quand tu auras trouvé un
    mot dans chaque partie. » ; état 2 : « Elle s'envolera quand tu auras trouvé un mot dans chaque
    chapitre du jeu. » ; état 3 : « Elle changera une dernière fois quand tu auras trouvé tous les
    mots. » ; état 4 : « Elle a tout trouvé. » ;
  - **« À la prochaine manche, elle change. »** remplace cette phrase quand c'est vrai (manches 6
    et 15). Le tirage étant fixe, le jeu le sait de façon exacte : une fonction pure rejoue la
    manche suivante.
- **Des signes sur elle à l'approche**, liés aux pas de ses arcs, jamais une quantité (une hauteur
  qui monterait avec les mots serait une jauge) : à l'état 2, les ailes s'entrouvrent (manche 5) ;
  à l'état 3, elle regarde vers le haut (manche 10), puis une première étoile paraît (manche 13).
- **Le lien de cause** : à chaque fin de manche, les trois trouvailles viennent à elle et son arc
  grandit.
- **Dans sa fiche** : « Son parcours », et la même phrase de but. Jamais la silhouette de la suite.

Tous ces textes sont des propositions : **je te les soumets en un lot de questions avant de les
écrire** (15 mots au plus par phrase, aucun mot que les portes refusent, « tortue » dans les seules
clés `turtle.*`).

## 8. Nouveaux plafonds (D17.13)

| | Mesuré le 15/11 | Plafond actuel | Plafond proposé |
|---|---|---|---|
| Dessin SVG, gzip | ≈ 0,5 Ko | 6 Ko avec sa feuille | 3 Ko |
| Feuille de style du dessin, gzip | ≈ 1,7 Ko | (le même) | 6 Ko |
| Les deux | ≈ 2,2 Ko | 6 Ko (6 144 o) | **9 Ko** (9 216 o) |
| Formes visibles par état | 11 | 12 | 18 (états 0 à 3), 30 (état 4) ; 72 dans le fichier |
| Script du jeu, gzip | ≈ 6,3 Ko | 10 Ko (10 240 o) | **inchangé** |
| Page d'accueil, HTML gzip | ≈ 12,2 Ko | aucun | **20 Ko** (porte neuve ; le chemin critique reste loin des 150 Ko de P3) |
| Un geste | 240 ms | 900 ms | inchangé |
| Une évolution | 840 ms | 1 600 ms | **4 500 ms** ; porte dure : moins de 5 000 |
| Un temps d'une évolution | 320 ms | 320 ms | 900 ms ; 320 ms partout ailleurs |
| Propriétés animées | `transform`, `opacity` | les mêmes | + `stroke-dashoffset`, pendant une évolution seulement (le trait qui s'écrit) |
| Boucles | aucune | aucune | aucune : `infinite` refusé par une porte |
| Éclairs | — | — | 0 visé ; 3 par seconde au plus, mesuré |
| Rien ne bouge après un geste | 2,1 s | 2,1 s | 2,1 s ; 5,0 s après la fin d'une manche à passage |
| Fluidité, processeur ralenti ×4 | p95 16,7 ms | 0 image > 50 ms, 5 % au plus > 20 ms | inchangé, mesuré pour chaque évolution |
| Page immobile une fois peinte | 0,0014 | 0,02 | inchangé |
| Tailles | 72 px (jeu), 168 px (fiche) | — | 96 px à côté du mot (80 px à 320 px de large), 240 px sur la scène et dans la fiche, jamais plus de 70 % de la largeur |

Si un brouillon dépasse un plafond au lot A1, **je reviens vers toi avant de le relever**. Une
piste gardée en réserve pour le poids de l'accueil : charger la feuille des évolutions avec le
script du jeu plutôt que dans la page (à vérifier contre la règle de sécurité des pages).

## 9. Vie privée (art. 9) : ce qui s'écrit, ce que le site en dit

- **Un champ de plus, et un seul** : `tint`, un nombre de 0 à 7 (0 : rien de choisi ; 1 à 6 : une
  partie ; 7 : « Sans couleur », choisi exprès). Dans l'onglet dès qu'on choisit ; sur le téléphone
  seulement après « Garder ta tortue ». Jamais envoyé, jamais dans une adresse, jamais partagé.
  « Tout effacer » l'efface avec le reste.
- **Rien d'un choix de jeu** : ni tuile, ni réponse, ni compteur, ni heure. « Tes choix ne sont pas
  gardés » reste vraie ; un test refuse tout autre champ.
- **Ce qu'elle montre à qui voit l'écran ou une capture** : que le jeu a été joué au moins jusqu'à
  l'état 2 (déjà vrai de la tortue aujourd'hui : R25), et une couleur que la personne a *choisie* —
  lisible comme « une partie d'un programme politique » par qui connaît le code. Ce qui le
  tempère : le choix est facultatif (elle reste pâle sinon), se change et se retire dans sa fiche ;
  la carte « Garder » dit déjà « Qui ouvre le site dans ce navigateur la verra. » ; « Site non
  officiel. » reste dans le cadre de la fiche.
- **Textes touchés** : la page Confidentialité gagne une ligne (« la couleur que tu lui as
  choisie ») ; la carte « Garder » et sa fiche nomment la couleur, sous des clés neuves (les
  phrases de la version en ligne ne sont pas retouchées). La ligne de Confidentialité a sa propre
  empreinte (§11.1) : **je te la montre au lot D, avant que l'aperçu la serve**, et tu la dates —
  ou tu me dis de la dater comme relue par la session seule.
- **Qualification** : inchangée et toujours PROBABLE (exemption de l'article 82 pour ce que le
  joueur demande de garder) ; `11-conformite.md` §6.2 quater et `14-risques.md` (R23, R25, et un
  risque neuf : une couleur de partie visible à l'écran) sont mis à jour.
- **Deux onglets** : la progression se fond comme aujourd'hui (le plus de chaque) ; pour la couleur,
  le dernier geste gagne.

## 10. Mes autres idées, triées

**Dans les règles actuelles (comprises dans ce plan)** : sa réaction à chaque mot trouvé ; les
trois trouvailles qui viennent à elle ; « À la prochaine manche, elle change. » ; les signes
d'approche ; « Son parcours » et « Revoir » ; une figure par état ; l'indice qui vient visiblement
d'elle ; un lien « Sa fiche » sous elle en fin de manche (les personas ne devinaient pas qu'elle se
touche) ; le flamant qui naît pâle.

**Dans les règles, hors de ce plan (à ta demande)** : raccourcir la carte « Garder » (« un pavé pour
une tortue ») ; un lien de texte vers le jeu depuis le sommaire, sans elle.

**Demandent que tu amendes une règle (je ne les fais pas)** :

| Idée | Règle touchée |
|---|---|
| Compteurs, barre, « 4 sur 6 » | non négociable « ni score ni niveau » ; règle 4 de §7.11 |
| Vague et ailes qui bougent seules | D16.13, D17.7 |
| Une phrase qui félicite | D16.37 |
| Choisir la partie à explorer (la couleur « méritée » aurait alors un sens) | « le tirage est celui du jeu » ; dit ce qui intéresse la personne |
| Une image d'elle à envoyer | D16.17, D17.10 |
| « Ta tortue t'attend » en haut de l'accueil | D16.1 ; lire le téléphone dès l'arrivée |
| Lui donner un nom | D16.20 ; un texte libre gardé sur le téléphone |
| La silhouette de la forme suivante | « ne montre jamais ce qui reste » |
| Un second tour comme critère de l'état 4 | D17.1 ; un champ de plus |
| Plus de mots | ta validation carte par carte, et les liens revérifiés dans trois navigateurs |

**Écartées** : le son, la vibration, les confettis, un rappel quotidien, une série.

## 11. Les lots

### 11.1 Le principe (D17.14) : deux générations côte à côte, un interrupteur par hôte

Vérifié dans le code de build et de déploiement par une lecture indépendante (15 novembre) :

- **La version actuelle est gelée jusqu'au ménage.** `Game.astro`, `Turtle.astro`,
  `src/scripts/game.ts`, `src/lib/turtle.ts`, `src/lib/game-state.ts`, `src/styles/turtle.css`,
  `design/mascot/tortue.svg`, ses portes et les cinq phrases de sa planche ne sont pas touchés :
  l'empreinte du dessin validé tient, donc **la production reste déployable à tout moment**.
- **La nouvelle vit dans des fichiers neufs**, qui réutilisent les fonctions pures de l'actuelle
  sans les modifier : `Game2.astro`, `Mascot2.astro`, `src/scripts/game2.ts`, `src/lib/mascot2.ts`,
  `src/lib/game-state2.ts`, `src/styles/mascot2.css`, `design/mascot/v2/`. La page d'accueil choisit
  l'une ou l'autre par une constante que l'outil de build replie (`__CEL_MASCOT2__`, sur le modèle
  de `__CEL_GAME__`) : une build « génération 1 » ne porte pas un octet de la 2.
- **L'interrupteur** : `data/mascot.json` (`generation`, `preview_generation`), sur le modèle de
  `mode` / `preview_mode` de `data/2026/ask.json` — l'aperçu peut être en avance, jamais l'inverse ;
  tout ce qui est illisible vaut 1. Les builds d'essai ignorent ce fichier (`--mascot 2` écrit
  `dist-mascot2/`) : basculer la production, ou revenir en arrière, n'est qu'une ligne de données.
- **Trois pièges trouvés, et leur parade** :
  - *les couleurs* : tout rôle de couleur ajouté part aujourd'hui dans la feuille de **toutes** les
    pages. Les rôles neufs (`mascot-*`) et les durées neuves sont donc émis dans une feuille à
    part, importée par la seule génération 2 ;
  - *la page Confidentialité* : une phrase `privacy.*` de plus rougit les portes et bloque les
    quatre déploiements. La ligne de la couleur reçoit donc **sa propre empreinte**
    (`privacy_mascot`, sur le modèle de `privacy_chat`) : elle ne bloque un hôte que le jour où
    cet hôte sert la génération 2 ;
  - *le déploiement* : rien n'empêche aujourd'hui une build faite pour l'aperçu de partir sur la
    production (jusqu'ici sans effet, les deux hôtes étant dans le même mode). Le garde du
    déploiement refusera un `dist/` d'une génération plus neuve que celle de sa cible.
- **La validation du dessin neuf** est un second enregistrement (`design/mascot/v2/validation.json`,
  sa propre planche, sa propre empreinte). La porte de lancement lit celui de la génération que
  l'interrupteur donne à la production : passer à 2 sans planche datée, sans « même personnage ? »
  reposée, ou sans ton mot daté (`decided_by: "editor"`), bloque — et rougit les portes dès le
  commit.
- **Retour arrière** après la bascule : `generation: 1` dans `data/mascot.json`, puis
  `npm run build && npm run deploy`. L'état de chacun est gardé ; un téléphone qui enregistre sous
  l'ancienne version y perd seulement la couleur choisie. (Comme toute build de l'app, il ne se
  déploie ni pendant une fenêtre de silence électoral ni la veille.)

Chaque lot : portes vertes (`npx tsc --noEmit`, `npx tsx --test scripts/*.test.ts`,
`npx tsx scripts/contrast.ts`, `npm run build`, `typecheck`, `lint`, `a11y`, `e2e`,
`build:ask && e2e:ask && e2e:game`, `build:gists && e2e:sheet`, `build:scrutin:test`, et dès
qu'elle existe la build d'essai de la génération 2 avec ses portes), lancées après `git add` ;
porte anti-fuite avant tout push ; commits conventionnels ; push sur `origin main` après chaque
lot validé ; journal tenu dans le plan versionné. **Jusqu'au lot D, chaque lot se termine sur une
preuve : le `dist/` de la production est identique, octet pour octet, à celui du commit
précédent** — et si un octet diffère, je te dis lequel et pourquoi avant de pousser.

### 11.2 Le découpage

| Lot | Ce qui est fait | Ce que tu vois ou décides | Production |
|---|---|---|---|
| **0 — Consigner** | D17.1 à D17.15 dans `decisions.md` ; ce plan versionné (`docs/discovery/PLAN-TORTUE.md`, avec son journal) ; règles amendées écrites (`illustration-rules.md` §2.12, `motion-spec.md`, `perf-budget.md`, `11-conformite.md`, `14-risques.md`, `16-hypotheses.md`, `CLAUDE.md`) ; les couleurs officielles consignées avec leur source et leur date | rien | intacte |
| **A1 — La planche, images fixes** | le dessin neuf : cinq états (l'état 4 : la tortue dans le ciel), signes d'approche, figures ; deux palettes ; clair, sombre et neutre ; silhouettes en noir ; à 80, 96 et 240 px ; poids mesurés ; contraintes en oui / non ; ses propres portes (formes, couleurs) ; les couleurs neuves dans leur feuille à part. Fichiers neufs seulement | **la planche, sous tes yeux** (fichier local, et je te l'envoie) ; puis un lot de questions : le dessin, la palette. On recommence jusqu'à ton oui | intacte, identique |
| **1 — L'interrupteur, inerte** (pendant que tu regardes la planche) | `data/mascot.json` à 1 / 1, sa règle, la constante de build, `--mascot`, le garde du déploiement, la porte de lancement par génération, la build de l'aperçu jouée par les portes | rien | intacte, identique |
| **A2 — La planche, en mouvement** | sur la même planche : les quatre évolutions à vitesse réelle, les figures, « Passer », la case « Mouvement réduit » ; durées et éclairs mesurés. Puis « même personnage ? » reposée à des lecteurs neufs, images officielles à côté | **le mouvement, sous tes yeux** ; un lot de questions : les évolutions, puis les textes | intacte, identique |
| **B — Règles et mémoire** | fonctions pures et leurs tests : formes et temps des évolutions, « la prochaine manche la fait changer », le champ `tint` (lecture tolérante, fusion, états écrits par la version actuelle relus tels quels), la carte des écritures par génération, la ligne de Confidentialité sous sa propre empreinte | rien | intacte, identique |
| **C — Le bloc du jeu** | sur la build d'essai `dist-mascot2/` seulement : elle à côté du mot, la scène de fin de manche, les quatre évolutions branchées, « Passer », sa fiche (« Son parcours », « Revoir », « Sa couleur »), les phrases de but. Les portes de bout en bout jouées sur les deux générations ; une porte refuse toute trace de la 2 dans une build de la 1 | rien (je te montre des captures) | intacte, identique |
| **D — L'aperçu** | une ligne de données : `preview_generation: 2` ; `npm run build:preview && npm run deploy:preview -- --bench` ; vérifié en ligne dans trois navigateurs ; relectures indépendantes (chasseur de captures, accessibilité, vie privée, jeu, « même personnage ? », les sept personas rejoués) ; corrections ; `/exactitude` dit ce qui n'est pas vérifié ; rapport | **la ligne de la page Confidentialité** : tu la dates, ou tu me dis de la dater comme relue par la session seule (comme en D16.81) ; puis le rapport, captures comprises — tu n'as rien à essayer toi-même | intacte |
| **E — La production** | sur ton accord : `generation: 2`, daté et signé de toi ; `npm run build && npm run deploy` ; vérification en ligne sur les deux hôtes | **ton « oui » pour la production**, rapport en main | basculée |
| **F — Le ménage** | plus tard, sur ton mot : retirer la génération 1, ses portes et l'interrupteur | rien | inchangée pour le visiteur |

## 12. Ce que je vérifie moi-même, et ce qui reste non vérifié

**Je vérifie** :

- *Les règles* : les seuils recalculés depuis la liste (manches 1, 2, 7, 16) ; « ne recule jamais »
  sur des états tirés au hasard ; les chaînes exactes que la version actuelle écrit, relues sans
  perte ; aucun champ hors de la carte des écritures ; la couleur dans aucune requête ni adresse.
- *Le dessin* : balises et attributs permis, aucune couleur dans le fichier, formes par état, zones
  lavande, prune et rose refusées sur tous les rôles et toutes les teintes, contrastes de chaque
  paire (trait sur teinte, arc sur teinte, œil, accent) dans les deux jeux de couleurs et les deux
  thèmes.
- *Le mouvement, dans Chromium, Firefox et WebKit* : chaque évolution jouée une fois quand elle est
  gagnée, jamais au rechargement, depuis un autre onglet ou le cache ; passée par le bouton, la
  scène, Échap ou un bouton du jeu ; un appui pendant l'évolution atteint sa cible ; en mouvement
  réduit, la forme finale d'un coup et aucune animation en cours ; rien ne bouge 5 s après ; sa
  réaction identique quel que soit le choix ; un gel qui commence arrête tout.
- *Les éclairs* : chaque évolution filmée image par image, dans les deux thèmes ; nombre d'éclairs
  par seconde selon la définition de WCAG 2.3.1.
- *Les tailles de téléphone, simulées* : 320 × 568, 360 × 740, 390 × 844, 430 × 932, paysage ; elle
  est à l'écran quand la première tuile l'est ; aucun mot coupé, aucun débordement.
- *L'accessibilité* : l'audit automatique sous les neuf conditions du site, sur six écrans
  (question, carte, fin de manche, fin de manche à passage, sa fiche, « Revoir ») ; le parcours au
  clavier ; les noms lus ; les cibles de 44 px ; le mode de couleurs forcées.
- *La performance, en labo* : fluidité à processeur ralenti ×4 pour chaque évolution, premier
  affichage, stabilité, réponse aux gestes, tous les poids contre leurs plafonds.
- *En ligne* : l'aperçu puis la production — fichiers identiques à la build, le parcours des deux
  premières manches dans trois navigateurs, les en-têtes, la règle de sécurité inchangée.

**Reste non vérifié (HYPOTHÈSE), et je le dirai tel quel** : de vrais téléphones (Safari sur
iPhone, un Android modeste), le navigateur d'Instagram, un vrai lecteur d'écran, une vraie
personne photosensible (la mesure est un calcul), de vraies personnes daltoniennes ; que de vraies
gens la trouvent prenante et reviennent (le site ne mesure aucune audience) ; « même personnage ? »
et le ressenti des personas (des agents, qui ne voient pas le mouvement) ; l'imagerie de la campagne
sur les réseaux sociaux ; et le retour d'une tortue déjà gardée, qui ne peut pas s'essayer sur
l'aperçu (autre adresse, autre stockage) : il est tenu par des tests, pas par un essai en ligne.

**Les risques du chantier, et ce qui les tient** :

- *Le dessin est jugé « enfantin » ou « moche »* (critère éliminatoire de toujours) : c'est pour cela
  que la planche vient en premier, en images fixes, avant tout mouvement et tout code du jeu.
- *Un plafond de poids ne tient pas* : je reviens vers toi avant de le relever.
- *Le flamant, sa couleur ou l'eau font penser à la campagne* : « même personnage ? » reposée ;
  les deux palettes sur la planche ; le jeu de couleurs neutre reste prêt.
- *Une animation saccade sur un petit téléphone* : mesurée à processeur ralenti seulement ; chaque
  évolution se passe d'un geste, et le mouvement réduit donne la forme d'un coup.
- *Qui avait gardé sa tortue trouve un flamant sans l'avoir vu naître* : sa fiche propose de revoir
  les passages ; aucun état ne recule.

## 13. Fichiers critiques, et ce qui est réutilisé

- **Réutilisé sans y toucher** (importé par la génération 2) : `turtleOf`, `endOfRound`, `draw`,
  `found`, `choose`, `advance`, `judge` (`src/lib/game-engine.ts`) ; `arcSteps`, `arcAttributes`,
  `withoutMotion` (`src/lib/turtle.ts`) ; `merge`, `parseKept`, `parseTab`, `STORAGE_KEY`
  (`src/lib/game-state.ts`) ; `el` (`src/scripts/engine.ts`) ; le gel
  (`src/scripts/silence-now.ts`) ; les liens officiels (`src/scripts/deep-links.ts`) ; les neuf
  conditions (`scripts/a11y-conditions.ts`) ; `serve`, `lateLayoutShift` (`scripts/e2e-kit.ts`) ;
  `prototypes/proto/tools/fps-probe.mjs`.
- **Repris comme modèle** : `mode` / `preview_mode` (`src/lib/ask-mode.ts`,
  `src/lib/ask-config.ts`) pour l'interrupteur ; `privacy_chat` (`scripts/launch.ts`) pour
  l'empreinte à part ; `scripts/mascot-sheet.ts` et `design/mascot/validation.json` pour la planche
  et sa validation datée.
- **Neufs** : `data/mascot.json`, `src/lib/mascot-mode.ts`, `src/lib/mascot-config.ts` ;
  `design/mascot/v2/` (dessin, planche, validation) ; `src/components/Game2.astro`,
  `src/components/Mascot2.astro`, `src/scripts/game2.ts`, `src/scripts/game-store2.ts`,
  `src/lib/mascot2.ts`, `src/lib/game-state2.ts`, `src/styles/mascot2.css`, la feuille générée
  des couleurs neuves ; `scripts/mascot2-sheet.ts`, `scripts/mascot2.test.ts`,
  `scripts/game-state2.test.ts`, la mesure des éclairs.
- **Étendus** (sans changer ce que la génération 1 produit) : `astro.config.ts`,
  `src/pages/index.astro`, `src/globals.d.ts`, `scripts/build.ts`, `scripts/build-mode.ts`,
  `scripts/deploy.ts`, `scripts/launch.ts`, `scripts/build-tokens.ts`, `src/lib/storage-map.ts`,
  `src/components/GameStorage.astro`, `design/tokens.json`, `design/tokens.neutral.json`,
  `design/strings.json` (clés neuves seulement), `scripts/e2e-game.ts` (`--mascot 2`),
  `scripts/game-page.test.ts`, `scripts/check-build.test.ts`, `scripts/e2e.ts`,
  `scripts/contrast.ts`, `scripts/tokens-neutral.test.ts`, `scripts/launch.test.ts`,
  `scripts/build-mode.test.ts`, `scripts/perf-probe.ts`, `.github/workflows/ci.yml`,
  `package.json`, `.gitignore`.

## 14. Ce que je te demanderai encore, et quand

| Quand | Quoi |
|---|---|
| Lot A1 | la planche en images fixes : le dessin, la palette |
| Lot A2 | la planche en mouvement : les évolutions ; puis les textes |
| Lot D | la ligne de la page Confidentialité, à dater ; le rapport de l'aperçu |
| Lot E | ton accord pour la production |

---

## Journal d'exécution

### Lot 0, au 15 novembre 2026 (soir) — consigner

- **Les quinze décisions sont au journal** : D17.1 à D17.15 dans `decisions.md` (288 décisions,
  D0-D17), avec la réponse de l'éditeur pour chacune des treize qu'il a prises, et ce que chacune
  amende ou confirme.
- **Les règles amendées sont écrites là où elles vivent**, chacune marquée « en préparation, pas en
  ligne » : `design/illustration-rules.md` §2.12 (le dessin, règle par règle ; les couleurs
  officielles des six parties avec leurs contrastes mesurés), `design/motion-spec.md` (une
  évolution de 4 500 ms, sans éclair, passable), `design/perf-budget.md` (P7 amendée pour ses
  évolutions ; poids proposés), `11-conformite.md` §6.2 quater (le champ `tint`),
  `14-risques.md` (R46 : la couleur choisie à l'écran ; R47 : le flamant ou les couleurs pris pour
  la campagne ; R48 : une évolution qui saccade ou éblouit), `16-hypotheses.md` (H-MEC-14 à
  H-MEC-17), `CLAUDE.md` (le chantier en tête de l'état du projet ; ce que la refonte ne peut pas
  faire sans une nouvelle décision).
- **Ce que la préparation du plan a établi, et qui n'était écrit nulle part** : le tirage du jeu
  est le même pour tout le monde (c'est ce qui a écarté « le plus de mots trouvés par partie ») ;
  les couleurs officielles des parties n'étaient pas dans le crawl local (9 requêtes le 15/11,
  avec l'accord de l'éditeur, rien d'écrit) ; ni flamant ni surf dans l'imagerie de la campagne
  (PROBABLE) ; une lecture indépendante du code de build a trouvé trois pièges de déploiement
  (§11.1), dont un qui existait déjà : rien n'empêche une build de l'aperçu de partir sur la
  production.
- Aucun fichier de l'app n'est touché : la production et l'aperçu servent ce qu'ils servaient.

### Lot A1, au 15 novembre 2026 (soir) — la planche, en images fixes

- **Le dessin existe** : `design/mascot/v2/mascot.svg`, un seul fichier écrit à la main pour les
  cinq états, géométrie et noms de classe seulement — 48 formes. `src/styles/mascot2.css` en
  fait les états, les poses, les signes et l'accent de passage ; `src/lib/mascot2.ts` dit ce
  qu'un script a le droit d'écrire sur elle (état, pose, couleur, signe, passage, ses arcs) et
  rien d'autre. **L'état 0 est la tortue en ligne, au chiffre près** : ses dix formes sont
  reprises telles quelles (une porte le tient) ; seul le point d'accent de sa carapace n'y est
  plus (D17.6).
- **Ce que le dessin a tranché, à valider sur la planche** :
  - *l'aile du flamant porte ses trois arcs* — les mêmes traits continus, les mêmes six pas ; les
    arcs existent donc deux fois dans le fichier (carapace, aile) et se lisent toujours dans le
    même champ ;
  - *la constellation est faite d'étoiles et de traits fins*, pas du contour de la tortue : en
    contour plein dans un disque sombre elle se lisait comme un logo — or un persona avait déjà
    dit « la tortue de la campagne, passée en logo ». **Écart à la lettre de D17.15** (« ses
    trois arcs dans la carapace ») : la carapace du ciel a une seule ligne intérieure, ses trois
    arcs restent sur son aile ;
  - *le ciel du soir prend la couleur de sa carapace, les étoiles celle de son trait* : aucun rôle
    de couleur neuf pour l'état 4, et le flamant peut passer devant le ciel sans y disparaître ;
  - *la vague est un aplat et une ligne* — la ligne suit son dos, sa volute et sa face, jamais son
    pied : elle n'est posée sur rien ;
  - *le flamant debout naît pâle* (corps de la couleur de la page, cerné), et son cou est une
    ligne tracée deux fois, pour pouvoir s'écrire au lot A2.
- **Les couleurs — ce que la mesure dit, avant ton choix** (`design/mascot/v2/palette.json`,
  « chosen » : null) :
  - *les six familles du site officiel, dans des valeurs mesurées* : les douze teintes passent —
    notre trait posé dessus fait de 4,76:1 à 11,62:1, aucune dans une zone refusée. La teinte
    claire de la partie 5 (le corail officiel, `#F9A89E`) passe **de peu** à côté de la zone
    « rose » (chroma 0,098 pour un seuil à 0,10, teinte 27° pour une zone qui s'arrête à 15°) :
    à l'œil c'est un rose saumon. C'est à toi de dire si « ni rose » le laisse passer ;
  - *les six vives de la charte* : **elles ne peuvent pas se porter**. En clair, le trait violet
    disparaît sur le vif violet (1,65:1) et sur le vif rouge (2,92:1) ; en sombre, le trait crème
    disparaît sur le vif jaune (1,53:1) et sur le vif rose (2,98:1) ; et le vif rose est dans la
    zone refusée. La planche les montre telles quelles, avec leurs mesures ;
  - *un jeu neutre* de six teintes, pour le cas où la charte serait retirée : il passe, et
    n'emprunte ni à la charte ni au site officiel.
- **Écart au plan** : les teintes ne sont pas encore des rôles des deux jeux de tokens — elles
  vivent dans `palette.json` tant que la palette n'est pas choisie. Aucun fichier existant n'est
  donc touché par ce lot (un script de plus dans `package.json` mis à part) ; la séparation des
  couleurs dans une feuille à part vient avec le lot B, et l'empreinte du dessin est écrite pour
  ne pas bouger ce jour-là.
- **Mesuré — VÉRIFIÉ** : le dessin 1 538 o gzip (plafond 3 072), sa feuille 2 695 o sans le
  mouvement (plafond 6 144), les deux 4 233 o (plafond 9 216 ; 6 144 pour la tortue en ligne) ;
  formes visibles par état : 10, 14, 14, 15 et 26 (plafonds 18 et 30). **Les plafonds de D17.13
  tiennent** ; le mouvement du lot A2 dispose de 3,4 Ko dans la feuille.
- **Vu par trois navigateurs** (`npm run e2e:mascot2` : Chromium, Firefox, WebKit ; 47 contrôles
  chacun, 0 échec) : dans chaque état, chaque pose, chaque signe et à un passage, ce qui se voit
  est ce que la planche compte, forme pour forme, et rien ne sort de son cadre. La planche
  dessine les 143 figures qu'elle annonce. **Ce que ce contrôle a trouvé** : à l'état 3, la
  première étoile comptait comme une forme de l'état lui-même ; elle est un signe, comptée à
  part.
- **La planche** : `design/mascot/v2/planche.html` (56 Ko, générée par
  `scripts/mascot2-sheet.ts`, jamais retouchée à la main ; elle tient le dessin une seule fois
  et le recopie dans chaque figure) — les deux écrans du jeu en maquette, les cinq états à 240,
  96 et 80 px, clair et sombre, les deux palettes avec leurs mesures, les arcs, les signes, les
  poses, l'accent, les silhouettes en noir, le jeu neutre, les poids, neuf contraintes en
  oui / non. `scripts/mascot2.test.ts` : quinze portes (ce que le fichier peut contenir, ce que
  la feuille peut faire, ce que les couleurs doivent mesurer, la planche égale au dessin du jour,
  une validation liée à une empreinte, et **rien de ce qui est servi ne l'importe**).
- **La production n'a pas bougé** : après `npm run build`, les 1 156 fichiers de `dist/` sont
  identiques, octet pour octet, à ceux d'avant ce lot. 617 tests passent.
- **À l'éditeur** : regarder la planche, dire si le dessin tient (« ni enfantine, ni moche »),
  choisir la palette. Rien n'est daté.

### Lot 1, au 15 novembre 2026 (soir) — l'interrupteur, inerte

- **`data/mascot.json`** dit quelle mascotte chaque hôte sert : « generation » pour la production,
  « preview_generation » pour l'aperçu — tous deux à 1, « decided_by » à null. La règle
  (`src/lib/mascot-mode.ts`) va dans un seul sens, comme celle des questions : l'aperçu peut être
  en avance, la production jamais ; tout ce qui est illisible vaut 1, et rien ne lève d'erreur
  (le retrait du site ne doit jamais attendre que ce fichier soit bien formé).
- **La build lit le fichier pour son hôte** (`src/lib/mascot-config.ts`, constante
  `__CEL_MASCOT2__` dans `astro.config.ts`) ; **une build d'essai ne le lit pas** :
  `npm run build:mascot2` écrit `dist-mascot2/` avec la génération 2 quoi que dise le fichier.
  Basculer la production, ou revenir en arrière, sera donc une ligne de données qui laisse toutes
  les builds d'essai — et toutes les portes qui en lisent une — exactement comme elles étaient.
- **Le piège qui existait déjà est fermé.** Rien n'empêchait `npm run build:preview` suivi de
  `npm run deploy` : le marqueur de build nomme un hôte, et aucune règle ne le lisait (sans effet
  jusqu'ici, les deux hôtes étant dans le même mode). Le garde lit maintenant le dossier lui-même
  (`readDist`, `distProblems`) : une build qui montre la génération 2 — son bloc de jeu le dit
  sur l'accueil, sa page Confidentialité par le champ qu'elle seule écrit — ne part que vers un
  hôte à qui le fichier la donne. **Essayé pour de bon** : une build marquée à la main est
  refusée sur les deux hôtes, en simulation comme en vrai (« dist/ shows the second generation
  of the mascot, and data/mascot.json gives this host the first »). Dans l'autre sens rien n'est
  refusé : une build plus ancienne montre moins que ce que son hôte peut montrer.
- **La porte de lancement lit la validation de la génération que l'hôte reçoit**
  (`mascotBlockers`, `scripts/launch.ts`). À 1 : la planche de la tortue, comme avant, mot pour
  mot. À 2 en production : la planche de la génération 2 datée sur le dessin tel qu'il est, la
  question « même personnage ? » posée sur ce dessin, et le mot daté de l'éditeur
  (« decided_by » : « editor ») — une session ne peut pas l'écrire à sa place, et un test le
  tient sur le fichier suivi. L'aperçu, lui, est l'endroit où un dessin se regarde : rien de
  cette validation ne lui est demandé (la ligne de la page Confidentialité viendra avec le champ
  qu'elle décrit, au lot B).
- **Écart au plan de la lecture indépendante** : `src/lib/ask-config.ts` n'est pas touché. La
  configuration de la mascotte lit elle-même la variable d'hôte : deux lignes de plus, un fichier
  en ligne de moins à modifier.
- **Les portes d'intégration construisent aussi la build de l'aperçu**, la jugent par les mêmes
  tests et la passent par le script de déploiement, à blanc — ce que rien ne faisait.
- **Preuves** : `npm run build` donne les mêmes 1 156 fichiers, octet pour octet, qu'avant le
  chantier ; `npm run build:preview` aussi (les deux hôtes sont au même point) ; `dist-ask/` est
  inchangé, et `dist-mascot2/` lui est identique tant qu'aucune page ne connaît la génération 2.
  622 tests ; le site 44 contrôles et le jeu 117, sous Chromium ; les déploiements à blanc de la
  production et de l'aperçu passent.

### 15 novembre 2026 (soir) — l'éditeur a regardé la planche en images fixes (D17.16, D17.17)

- Trois questions posées en dialogue, trois réponses : **« Il tient, on passe au mouvement »**
  (le dessin) ; **« Les six familles officielles »** (la palette — l'option disait que le corail
  de la partie 5 passe la porte « ni rose » de peu et se lit comme un rose saumon) ;
  **« Étoiles et traits, comme dessiné »** (la constellation, qui s'écarte de la lettre de
  D17.15).
- `design/mascot/v2/palette.json` : « chosen » : « official ». La planche ne montre plus que la
  palette retenue, avec ses mesures, et dit en une phrase pourquoi les vives de la charte ont été
  écartées.
- Le quatrième emprunt à la campagne est écrit dans `design/identity-decision.md` §5.2 (d),
  marqué « pas en ligne » : `/a-propos` ne le dira que le jour où la génération 2 est servie.
- **Rien n'est daté** (`design/mascot/v2/validation.json` reste à null) : la validation se pose
  sur la planche en mouvement, parce que le mouvement retouche la feuille de style et ferait
  tomber une date posée aujourd'hui.
- Les lots 0, A1 et 1 sont poussés sur `origin main` : le dessin est validé par l'éditeur.

### Lot A2, au 15 novembre 2026 — la planche, en mouvement (telle que montrée à l'éditeur ; la suite est à l'entrée d'après)

- **Ce qui existe.** Les quatre évolutions, une figure par état (on la touche), un petit mouvement
  par état (un mot trouvé) et la fin de manche sans passage (les trois trouvailles viennent à
  elle, son arc grandit) se jouent sur la planche `design/mascot/v2/planche.html`, à vitesse
  réelle, sur un bouton et jamais avant : 22 scènes jouables, 146 figures fixes. « Passer » pose
  la forme finale ; une case joue le mouvement réduit ; une autre ralentit tout quatre fois, pour
  regarder de près. Sous chaque évolution, son storyboard : l'état posé à la fin de chaque temps.
  Les images fixes du lot A1 suivent.
- **Comment c'est fait.** *La chorégraphie est une donnée* (`src/lib/mascot2.ts` : `FINDS`,
  `EVOLUTIONS`, `evolution`, `trick`, `pulse`, `withoutMotion`) : une évolution est une suite de
  temps nommés ; à chaque temps le script écrit sur le dessin son état, sa pose et le nom du
  temps (`data-phase`) — des attributs, rien d'autre. *La feuille ne fait que retenir*
  (`src/styles/mascot2.css`) : chaque temps y dit ce qu'il retient de l'état qu'elle est en train
  de prendre ; sans aucun temps — mouvement réduit, « Passer », état qui revient du téléphone —
  l'état seul la dessine, entière. Un seul bloc `prefers-reduced-motion: no-preference` porte
  tout le mouvement, sous `data-live` ; sans `data-live`, toute transition en cours est coupée :
  c'est ce qui fait que « Passer » arrête tout d'un coup (trouvé par la mesure : une transition
  dont la valeur d'arrivée ne change pas continuait sa course). Aucune durée n'est tapée : toutes
  sont des multiples des durées du site.
- **Le dessin a changé en deux endroits**, ce qui aurait fait tomber une validation : la planche de
  surf est passée dans le groupe de la tortue (une seule rotation fait le virage) ; **une forme
  de plus, l'eau qui la recouvre**, plate, de la couleur de sa carapace, couchée à ses pieds le
  reste du temps. 49 formes (plafond 72), 1 615 octets gzip (plafond 3 072) ; la feuille,
  mouvement compris : 5 667 octets gzip (plafond 6 144 — il en reste peu ; sans ses
  commentaires, que la build retire, 2 627) ; les deux : 7 282 (plafond 9 216). Les cinq états
  montrent les mêmes formes qu'au lot A1 (10, 14, 14, 15, 26).
- **Écarts au §5 du plan, que la planche montre tels qu'ils sont.** (a) *1 → 2* : ce n'est pas la
  vague qui grandit, c'est l'eau qui monte, puis retombe ; le flamant attend derrière elle, bas
  dans l'eau, et c'est l'eau en retombant qui le découvre : rien ne se fond dans rien. Son cou ne
  s'écrit que pour sa partie hors de l'eau. « Une bosse court sur la vague » et « la couleur gagne
  le corps depuis l'aile » ne sont pas faits. (b) *2 → 3* : elle recule d'un pas avant de courir ;
  l'eau ne « descend » pas, elle paraît. (c) *3 → 4* : l'eau ne s'assombrit pas ; les étoiles
  s'allument à 240 ms d'écart, trois par temps. (d) *Figures* : le flamant debout bat des ailes
  (il ne change pas de patte) ; le virage de la tortue ne fait pas sauter d'écume (l'accent reste
  réservé au passage, D17.6) ; à un mot trouvé la tortue qui surfe hoche la tête (elle ne
  rebondit pas). (e) *Durées* : 2 980, 3 640, 3 520 et 4 420 ms, pour 2 400, 4 200, 3 600 et
  4 400 annoncées — toutes sous 4 500, aucun temps au-delà de 900 ms (le plus long : la course,
  900).
- **« Sans éclair », précisé par la mesure.** Le plan disait : « aucune surface ne s'allume et ne
  s'éteint ». Dans 1 → 2 l'eau monte puis retombe : une surface paraît, puis disparaît — deux
  rampes de 640 ms, à 1,3 s l'une de l'autre. C'est ce que le plan décrivait pour cette évolution,
  et ce n'est pas la lettre de sa propre règle : **dit à l'éditeur, à lui de dire si cela lui
  va.** Mesuré, chaque évolution filmée image par image dans les deux thèmes, chaque pixel
  suivi : **0 éclair par seconde** au sens de WCAG 2.3.1 dans les quatre évolutions ; la plus
  grande surface qui change de lumière deux fois dans la même seconde fait 8 529 px² (1 → 2, en
  clair : la vague qui s'aplatit puis l'eau qui la couvre), pour un seuil à 21 824 ; rouge
  saturé : 5 px² au plus (les trois trouvailles, qui paraissent puis rejoignent la tortue) ; la
  lumière moyenne de la scène ne fait jamais l'aller-retour. Les grandes surfaces — la vague,
  l'eau, le ciel — paraissent ou s'en vont en une rampe de 640 ms ; un test le tient, ainsi que
  l'écart de 360 ms entre la première goutte d'écume et les deux autres.
- **Mesuré dans trois navigateurs, sur la planche elle-même** (`npm run e2e:mascot2:motion`,
  Chromium 153, Firefox 155, WebKit 26.6 : 132, 109 et 109 contrôles, tous bons ;
  `design/mascot/v2/motion.json`, liée à l'empreinte du dessin) : rien ne bouge ni ne s'écrit
  pendant 2,1 s après le chargement ; le dernier mouvement de chaque évolution finit à 2 964,
  3 066, 3 472 et 4 342 ms au pire ; une figure à 809 ms, le mouvement d'un mot trouvé à 330, une
  fin de manche à 528 ; chaque évolution finit sur l'image exacte de la forme fixe ; rien ne sort
  du cadre de plus de 1,5 px pendant le mouvement ; « Passer » au milieu arrête tout d'un coup et
  donne la même image ; en mouvement réduit — la case de la planche, ou le réglage du système —
  rien ne bouge, même si un script écrivait chaque temps à la main. **Fluidité**, processeur
  ralenti 4 fois, écran de téléphone, sa scène seule sur la page : 95 % des images en 16,7 ms,
  aucune au-delà de 20 ms, pour les quatre évolutions. *Ce que cette mesure a appris* : avec la
  planche entière (près de deux cents dessins sur la page) 3 à 5 % des images de l'envol
  dépassaient 20 ms — c'était la page, pas elle ; et lui donner une couche à elle
  (`will-change`) empirait tout sur cette page et ne changeait rien avec sa scène seule : la
  règle M6 de `design/motion-spec.md` (pas de `will-change`) tient. **PROBABLE** : un Chromium
  sans carte graphique n'est pas un téléphone ; la mesure se refera dans la page du jeu (lot C).
- **L'empreinte du dessin compte maintenant les temps de ses évolutions** (`mascot2Fingerprint`) :
  ce qui se joue fait partie de ce qui se valide. La mesure du mouvement est liée à la même
  empreinte, et un test la dit périmée dès qu'on retouche le dessin, sa feuille, ses couleurs ou
  ses temps.
- **« Même personnage ? », posée le 15 novembre à cinq lecteurs neufs** (des agents de trois
  modèles, deux avec un profil ; deux images seulement, les tortues officielles à côté de nos
  cinq états, puis deux évolutions image par image ; aucune source nommée ; aucun n'a ouvert
  autre chose) — **HYPOTHÈSE** : quatre « non », un « ne sait pas », aucun « oui » ; « faits par
  les mêmes gens ? » : cinq « ne sait pas », à cause du violet. **Ce qu'ils ont dit d'autre, et
  qui revient à l'éditeur** : (1) un personnage qui change de forme par paliers rappelle à trois
  d'entre eux une évolution de jeu — Pokémon, Tamagotchi nommés —, et deux précisent que l'effet
  n'en est pas repris (« pas de silhouette blanche ni de clignotement », « un effet de rideau
  courant, pas un emprunt précis ») : c'est l'idée demandée, pas la signature ; (2) la vague
  enroulée rappelle à deux d'entre eux la Grande Vague d'Hokusai, et la tortue qui surfe, à un,
  le personnage de Crush dans *Nemo* ; (3) « un parti, une campagne ? » : un « oui », deux « ne
  sait pas », deux « non » — le « oui » nomme la tortue violette et le trio violet, rouge, crème,
  « les flamants, seuls, ne m'y auraient pas fait penser » : c'est l'emprunt assumé de la charte
  et la tortue de D16.11, pas ce que la refonte ajoute ; (4) **deux trouvent le flamant en vol
  moins lisible** — « son corps en forme de citron, avec l'aile en éventail collée dessus »,
  « une masse confuse », l'aile lue comme une coquille ; (5) **aucun n'a vu d'emblée une tortue
  dans la constellation**, deux y voient un schéma de réseau ; (6) « enfantin, moche ? » : cinq
  « ni l'un ni l'autre ». Consigné dans `design/mascot/v2/validation.json`
  (`same_character_*`, lié à l'empreinte ; `validated_on` reste à null).
- **Portes** : 629 tests (628 passent, 1 sauté depuis toujours), contraste 0 échec, lint, types,
  `e2e:mascot2` 47 contrôles dans chacun des trois moteurs. **`npm run build` donne les mêmes
  1 156 fichiers, octet pour octet, qu'avant le chantier** : rien de ceci n'est servi, et aucune
  page ne connaît encore la génération 2.
- **Montré à l'éditeur** : la planche (le fichier), et deux vidéos des quatre évolutions à vitesse
  réelle, sur fond clair et sur fond sombre (enregistrées dans Chromium, 25 images par seconde :
  moins fluides que la page). **Non vérifié, et dit tel quel** : de vrais téléphones ; une
  personne photosensible (la mesure est un calcul) ; que de vraies gens lisent dans ces
  mouvements ce que j'y lis — les lecteurs neufs n'ont vu que des images fixes.
- **À l'éditeur** : dire si chaque évolution tient ; ce qu'il veut faire des deux remarques sur le
  dessin (le flamant en vol, la constellation) ; puis les textes. La planche ne se date qu'après.

### 15 novembre 2026 — l'éditeur a regardé le mouvement (D17.18 à D17.22) ; les lectures à l'aveugle

- **Ses réponses, en quatre dialogues de questions.** (1) Les quatre évolutions : « Elle tient »
  trois fois, et pour 1 → 2 « Elle tient, l'eau comprise » — la règle « sans éclair » s'écrit
  désormais *aucune surface ne paraît et ne disparaît dans la même seconde* (D17.18). (2) Les
  remarques des lecteurs : « Redessine le vol, montre-moi », « Rends-la plus lisible, montre-moi »,
  « Le geste du mot plus marqué ». (3) L'ancien et le nouveau côte à côte : « Le nouveau » (deux
  ailes en lame), « La nouvelle, plus grande » (D17.20), « Oui, comme ça » pour le petit bond
  (D17.21). (4) Les lectures à l'aveugle sous les yeux : « La variante » pour le vol (D17.19, sa
  forme finale) et, pour « même personnage ? », « Rien au dessin, tout par écrit » (D17.22).
- **Un défaut trouvé dans l'envol qu'il avait vu.** Pendant « ses ailes s'ouvrent », l'aile proche
  restait seulement entrouverte : le signe « ailes entrouvertes » l'emportait, à égalité de
  poids, sur le temps de l'évolution. La règle de ce temps nomme maintenant son état. Dit à
  l'éditeur avec la vidéo corrigée.
- **Ce qui a changé dans le dessin.** L'aile du vol est une forme à elle (`m-open`, `m-quill`),
  dans le même groupe que l'aile repliée : longue, aux bords en plumes, ses trois arcs le long ;
  la seconde aile est la même forme, plus en avant — un V. En vol elle est un peu plus petite et
  plus haut au-dessus de l'eau. La constellation est plus grande d'un tiers, traits plus épais,
  au-dessus de son cou ; sous elle le flamant vole plus bas. 53 formes (plafond 72), 1 803 octets
  gzip ; la feuille 5 943 octets (plafond 6 144 : **il en reste 201**, à savoir avant le lot C) ;
  les deux 7 746 (plafond 9 216). Formes visibles par état : 10, 14, 14, 15, 26, inchangées.
- **Mesuré de nouveau sur ce dessin** (`design/mascot/v2/motion.json`) : Chromium 132 contrôles,
  Firefox 109, WebKit 109, tous bons ; dernier mouvement à 2 965, 3 071, 3 464 et 4 342 ms au
  pire ; une figure 810 ms, un mot trouvé 328 ms, une fin de manche 528 ms ; zéro éclair par
  seconde, 8 548 px² au plus changent de lumière deux fois dans la même seconde (seuil 21 824),
  rouge saturé 5 px² ; aucune image au-delà de 20 ms, processeur ralenti 4 fois ; rien ne sort
  du cadre de plus de 0,5 px. **La mesure de ce qui sort du cadre suit maintenant le vrai contour
  des formes** : la boîte qu'un navigateur donne pour une forme tournée est la boîte de sa boîte,
  et annonçait 4 px de sortie là où l'aile en sortait de moins d'un.
- **Les « lecteurs neufs » ne l'étaient pas (R49).** Un sous-agent lancé depuis le dépôt reçoit
  d'office `CLAUDE.md` : il sait ce qu'est la tortue et ce qu'on espère de sa réponse. Deux
  lecteurs du second tour l'ont signalé d'eux-mêmes. Les deux tours du 15 novembre (quatre
  « non », un « ne sait pas », deux fois) ne comptent donc pas — ni, pour la même raison, le
  « trois non sur trois » du 13 novembre sur la tortue en ligne, ni les sept « non » des personas.
  **Une lecture à l'aveugle se lance hors du dépôt** (`claude -p` depuis un dossier qui ne
  contient que l'image, outil de lecture seul) : essayé, le lecteur dit n'avoir reçu que des
  préférences générales de travail. C'est écrit dans `CLAUDE.md`.
- **« Même personnage ? », à l'aveugle** (cinq lecteurs par question, deux Haiku, deux Sonnet, un
  Opus ; tortues officielles à côté ; aucune source nommée ; chacun dit n'avoir rien reçu du
  projet) — **HYPOTHÈSE** : le dessin retenu, **deux « oui », trois « ne sait pas », aucun
  « non »** (une version intermédiaire : un, un, trois) ; **la tortue en ligne, deux « oui »,
  trois « ne sait pas », aucun « non »**. La raison donnée : « deux tortues violettes ». « Faits
  par les mêmes gens ? » : quinze « ne sait pas ». « Un parti, une campagne ? » : aucun « oui ».
  R23 passe de « possible » à « probable ». `/exactitude` range déjà la question parmi les non
  vérifiées : rien de faux n'est publié. **L'éditeur, informé, ne change rien au dessin** (D17.22).
- **Le vol, à l'aveugle** (trois lecteurs par carte). Montré seul, chaque dessin essayé est lu
  comme un oiseau en vol au-dessus de l'eau (quinze sur quinze). Dans la suite des cinq formes,
  c'est celle sur laquelle on hésite le plus, et ce pour quoi on la prend décide : l'éventail du
  lot A1, un coquillage ou un poisson ; les ailes en lame, **un bateau à voile** (trois sur
  trois, et trois autres lecteurs parlent d'une voile) ; les ailes en V aux bords en plumes, un
  poisson volant, un avion, un insecte — des choses qui volent. C'est ce qui a fait proposer la
  variante, et l'éditeur l'a prise.
- **La constellation, à l'aveugle.** Seule, personne n'y voit une tortue, grande ou petite ; avec
  la tortue du début à côté, un lecteur sur trois. Essayée avec ses trois arcs en courbes, comme
  sur sa carapace : les six lecteurs parlent d'un arc-en-ciel — écartée. La version de
  D17.20 tient ; c'est la phrase du passage qui la fera lire.
- **Preuves** : 629 tests (628 passent, 1 sauté depuis toujours), contraste, lint, types ;
  `e2e:mascot2` 47 contrôles dans chaque moteur ; **`npm run build` donne les mêmes 1 156
  fichiers, octet pour octet, qu'avant le chantier.**
- **Non vérifié, dit tel quel** : de vrais téléphones ; une personne photosensible ; de vraies
  gens. Les lecteurs à l'aveugle sont des modèles, trois à cinq par question, sur des images
  fixes.
- **Reste à lui demander** : ses textes ; puis s'il date la planche.

### 15 novembre 2026 — ses textes (D17.23), et la planche datée (D17.24) : le lot A2 est clos

- **Les textes**, le document sous les yeux, en un dialogue de quatre questions : « Oui, telles
  quelles » pour les sept phrases du but et pour les quatre phrases des passages ; « Le nom de la
  couleur » pour les six choix (« Bleu ciel », « Orange », « Vert », « Jaune », « Rouge »,
  « Violet » — le plus neutre : rien à l'écran ne dit quelle partie on préfère) ; « Oui, tels
  quels » pour les petits mots et pour ce qui est gardé. Ils sont consignés mot pour mot à
  D17.23, d'où le lot C les prendra, sous des clés neuves. **Non demandé à part** : ce que dit un
  lecteur d'écran quand on la touche — à lui remontrer avec le jeu. **À lui remontrer au lot D** :
  la ligne de la page Confidentialité, pour qu'il la date.
- **La planche est datée du 15 novembre sur son mot** (« Oui, date-la ») :
  `design/mascot/v2/validation.json`, liée à l'empreinte du dessin retenu, de sa feuille, de ses
  couleurs et de ses temps. La planche dit maintenant « Sa phrase », plus « la phrase proposée ».
  **Cela ne bascule rien** : `data/mascot.json` est à 1 pour les deux hôtes. Pour la production
  il faudra encore son mot daté (lot E) ; la porte de lancement y lira la planche datée et la
  question « même personnage ? » posée sur ce dessin — posée, à l'aveugle, avec la réponse qu'on
  sait (D17.22).
- **Ce que le lot C devra savoir** : la feuille du dessin est à 201 octets de son plafond ; la
  moindre retouche du dessin, de sa feuille ou de ses temps fait tomber la date de la planche et
  périme la mesure du mouvement — les tests le disent, et l'éditeur doit alors revoir ce qui a
  changé.
- **Suite** : lot B — les règles pures et la mémoire (le champ de la couleur, la carte des
  écritures par génération, la ligne de Confidentialité sous sa propre empreinte, les teintes en
  rôles dans une feuille à part). Il ne touche ni au dessin ni à ce qui est servi.

### Lot B, au 15 novembre 2026 — les règles et la mémoire (rien n'est servi ; aucune décision demandée)

- **Sa couleur, dans ce que le jeu retient** (`src/lib/game-state2.ts`, qui lit le module en
  ligne sans en changer une ligne) : un seul champ de plus, `tint`, sous la même clé et dans les
  deux mêmes stockages. Trois propriétés tenues par des tests : ce que la génération 1 a écrit se
  relit tel quel ; **tant qu'aucune couleur n'est choisie, ce qui s'écrit est, octet pour octet,
  ce que la génération 1 écrit** (le champ n'existe que le jour où il y a une couleur à garder) ;
  après un retour arrière, la génération 1 relit ce que la 2 a écrit et n'y perd que la couleur.
  Une couleur abîmée vaut « aucune », jamais une erreur. Rien ne recule : la progression se fond
  comme avant (le plus de chaque), sur quatre cents couples d'états tirés d'une graine fixe.
- **« Le dernier geste gagne », sans jamais garder une heure.** Deux façons de joindre deux
  mémoires, nommées pour ce qu'elles sont : `fromPhone` (une page qui s'ouvre, une manche qui
  finit : la couleur du téléphone l'emporte, car tout geste de couleur, dans n'importe quel
  onglet, y a été écrit) et `ontoPhone` (« Garder ta tortue », une couleur qu'on vient de
  choisir : celle de cet onglet l'emporte). « Sans couleur » est un choix et gagne comme un autre.
- **Le but, en mots** (`src/lib/game-goal.ts`) : « la prochaine manche la fait changer » se
  calcule en rejouant le tirage — le même pour tous — et ne lit aucun choix. Sur la liste suivie,
  un test rejoue le jeu entier : **elle change à la fin des manches 1, 2, 7 et 16, et la phrase
  « À la prochaine manche, elle change » est dite exactement avant celles-là**, jamais ailleurs.
  Le module rend le nom d'une phrase, pas la phrase : les mots sont ceux de D17.23.
- **Les textes de D17.23 sont dans le kit** (`design/strings.json`, v0.13.0), sous des clés
  neuves : 27 chaînes, passées par toutes les portes du kit. **Une ne l'est pas** : « Ce
  téléphone garde les mots déjà vus, où en est le jeu, ta tortue, sa couleur. » compte seize
  mots, et la règle du kit en veut quinze au plus — le document envoyé à l'éditeur disait
  « quinze au plus » à tort. **À lui redemander avant le lot C**, avec une version qui tient.
- **La carte des écritures par génération** (`src/lib/storage-map2.ts`) : la carte en ligne,
  inchangée, et la même avec le champ de la couleur ; la page Confidentialité lira l'une ou
  l'autre selon ce que son hôte sert (lot C).
- **La ligne de Confidentialité a sa propre empreinte** (`privacy_mascot` dans
  `data/launch.json`, `scripts/launch.ts`) : « la couleur que tu lui as choisie » ne compte plus
  dans l'empreinte de la page que la production sert — qui n'a pas bougé — et se relit à part.
  **Elle est demandée à tout hôte qui sert la génération 2, l'aperçu compris** : c'est la seule
  chose demandée à l'aperçu, parce qu'elle parle de ce qui s'écrit sur le téléphone d'un
  visiteur. Sans date, sans nom de relecteur ou sur une ligne changée depuis, la porte refuse.
- **Ses six teintes sont des rôles des deux jeux de couleurs**, dans un bloc à part
  (`mascot-role`) et **une feuille à part**, générée (`src/styles/mascot2-tokens.css`) : la
  feuille de toutes les pages, `tokens.css`, n'a pas changé d'un octet. Un test tient que ces
  rôles sont la palette choisie par l'éditeur, et que la feuille suivie est celle que le script
  donne. L'empreinte du dessin n'a pas bougé : la planche reste datée.
- **Rien de servi ne connaît la génération 2** : la porte qui le tient nomme maintenant ses six
  modules, et vérifie aussi le sens inverse — ils ne lisent de la génération 1 que cinq modules,
  sans les modifier. (`storage-map.ts`, en ligne, n'est donc pas touché : la carte neuve vit à
  côté.)
- **Laissé tel quel** : le bloc `part-color` des tokens (2025, quatre parties), que plus rien ne
  lit — son retrait attend le ménage (lot F).
- **Preuves** : 640 tests (639 passent, 1 sauté depuis toujours), contraste, lint, types.
  **Trois builds identiques, octet pour octet, à leurs références d'avant le chantier** : la
  production (1 156 fichiers), l'aperçu (1 156), la build d'essai `dist-ask/` (1 156).
- **Suite** : lot C — le bloc du jeu, sur la build d'essai `dist-mascot2/` seulement.
- **Redemandé le jour même (D17.25)** : dans sa fiche, la phrase en ligne reste telle quelle et
  « Sa couleur aussi. » s'y ajoute ; ce que dit un lecteur d'écran quand on la touche est gardé
  tel que proposé. Les quatre chaînes sont dans le kit ; plus rien n'attend l'éditeur avant le
  lot C.

### Lot C, au 15 novembre 2026 — le bloc du jeu, sur la build d'essai seulement (rien n'est servi ; aucune décision demandée)

- **Ce qui existe.** Le jeu de la génération 2, entier, dans `dist-mascot2/` (`npm run
  build:mascot2`, jamais déployée) : `src/components/Game2.astro` et `Mascot2.astro`,
  `src/styles/game2.css`, `src/scripts/game2.ts` et `game-store2.ts`. Les règles du jeu sont
  celles d'avant, lues dans les mêmes modules ; ce qui change, c'est elle. **Les fichiers de la
  tortue en ligne ne sont pas touchés** : la page d'accueil choisit un bloc ou l'autre par une
  constante que l'outil de build replie (`__CEL_MASCOT2__`), et la page Confidentialité sa carte
  des écritures de la même façon. Deux fichiers de la génération 1 gagnent une ligne chacun pour
  cela — `src/pages/index.astro`, `src/pages/confidentialite/index.astro` — et
  `GameStorage.astro` accepte une carte en paramètre ; ce qu'ils produisent pour la production
  n'a pas changé d'un octet (voir « Preuves »).
- **Où elle est.** Un seul dessin dans le bloc, que la feuille de style déplace (un attribut sur
  le bloc, `data-stage`) : à côté du mot pendant qu'on joue — 96 px, 80 px dans une fenêtre de
  320 px, jamais plus d'un quart de la fenêtre —, et sur une scène en haut du panneau quand une
  manche finit — 240 px, 150 px de haut, jamais plus de 70 % du bloc. Le mot et sa ligne
  d'attribution courent à côté d'elle ; la question et la carte de l'endroit passent dessous,
  entières. La scène est ramenée à l'écran si la page était descendue plus bas. Sa fiche a ses
  copies à elle, comme avant.
- **Ce qu'elle fait.** Cinq gestes obtiennent une réponse, aucun autre : un mot trouvé (son
  petit bond, le même quel que soit le choix), un indice demandé (elle regarde les tuiles, puis
  trois d'entre elles se marquent), la fin d'une manche (les trois trouvailles viennent à elle),
  la toucher (sa fiche s'ouvre et elle y fait sa figure, en grand), « Revoir ». **Un passage se
  joue une fois, à la fin de la manche qui le gagne, dans la page où le geste a été fait** — et
  jamais au chargement, ni quand son état revient de l'onglet, du téléphone, d'un autre onglet
  ou du cache du navigateur : elle est alors dessinée d'un coup. Sa phrase paraît quand le
  passage a été vu, à la place qu'elle avait déjà — rien ne bouge sous la scène —, et la ligne
  de statut la dit au même moment. On passe un passage par « Passer », un appui sur la scène,
  Échap, ou n'importe quel bouton du jeu — dont l'appui atteint sa cible. En mouvement réduit,
  rien ne démarre : ce qu'elle est devenue s'affiche d'un coup, avec sa phrase.
- **Son but, en mots.** Avant le premier mot trouvé, à côté d'elle : « Elle change quand tu
  trouves des mots. » À la fin de chaque manche, une ligne sous le titre : la phrase du passage,
  puis son but — ou « À la prochaine manche, elle change. » quand c'est vrai. La porte rejoue
  les seize manches et une dix-septième : chaque ligne est celle que les règles donnent, aucune
  ne porte un nombre. Ses signes d'approche paraissent aux manches que ses arcs disent : ailes
  entrouvertes aux manches 5 et 6, regard levé de 10 à 12, première étoile de 13 à 15.
- **Sa fiche.** Sa figure ; ce qui la fera changer ; « Son parcours » — les formes qu'elle a
  eues, en petit, dans l'ordre, chacune avec la phrase de son passage et « Revoir », jamais une
  forme à venir ; « Sa couleur », dès qu'elle est un flamant : six couleurs par leur nom, puis
  « Sans couleur ». Ce qui est trouvé, ce qui est gardé, « Tout effacer » : comme avant.
- **Sa couleur.** Écrite dans l'onglet dès qu'on la choisit — un champ de plus, le dernier — et
  sur le téléphone seulement s'il garde déjà, ou après « Garder ta tortue ». Jamais dans une
  requête ni dans une adresse : la porte le tient. Dans deux onglets, le dernier geste gagne, et
  l'autre onglet suit sans un mouvement. **Tant qu'aucune couleur n'est choisie, ce qui s'écrit
  est, octet pour octet, ce que la génération 1 écrit** — vérifié dans un vrai navigateur, sur
  la chaîne que la fonction en ligne rend du même jeu.
- **Sept choix faits sans te les demander, parce qu'ils découlent de tes décisions — à te dire.**
  (a) *Chaque couleur se montre sur un petit flamant*, pas sur une pastille : D17.12 veut une
  couleur de partie sur le flamant et nulle part ailleurs, et une porte tient qu'aucun autre
  élément du bloc ne porte une des six teintes. (b) *Sa figure se joue dans sa fiche*, en grand,
  à l'ouverture : la fiche s'ouvre au toucher, sans attendre la fin d'une figure ; dans le bloc
  elle ne bouge pas. (c) *« Passer » se tient à la place de « Sa fiche »* le temps d'un
  passage : rien ne saute sous la scène, ni pendant ni après. (d) *« Choisir sa couleur » reste
  proposé à chaque fin de manche tant qu'elle est un flamant sans couleur* — pas seulement
  « juste après » : qui avait gardé une tortue de la génération 1 retrouve un flamant pâle sans
  avoir vu le passage. « Sans couleur » est un choix : il fait disparaître le bouton. (e) *« Sa
  couleur aussi. » ne se dit que lorsqu'elle en a une* : avant, le téléphone n'en garde pas.
  (f) *Après « Revoir », la grande image garde la forme de ce passage* jusqu'au geste suivant ;
  la toucher la remet telle qu'elle est aujourd'hui, et elle fait sa figure. (g) *Un passage
  s'arrête sur sa forme finale, avec sa phrase, si l'onglet est quitté ou si le mouvement réduit
  est demandé en cours de route* : au retour, ses minuteries l'auraient rejouée d'un bloc.
- **La page ne bouge pas quand le script prend le bloc.** La phrase du début n'est pas dans la
  manche sans script — sans script elle ne change pas, la page ne doit pas le dire —, mais sa
  place y est : la phrase y est écrite et retenue (`data-wait`), montrée dès le premier
  affichage là où le navigateur dit qu'un script peut tourner (`@media (scripting: enabled)`),
  et dite par le script à cette même place. Mesuré sous Chromium, scripts retenus 400 ms :
  0,0000 en haut de la page et 0,0003 sur le bloc, pour une première visite comme pour un flamant qui revient (porte : 0,02 ; la génération 1 mesure 0,0021 quand on arrive sur le bloc).
  **Ce qui reste imparfait, écrit tel quel** : si le fichier du jeu ne peut pas être chargé, la
  manche sans script continue, script présent — et la phrase « Elle change quand tu trouves des
  mots. » reste affichée alors qu'elle ne changera pas. Un navigateur sans feuille de style la
  lit aussi.
- **Ce qu'une porte a trouvé, et qui est corrigé.** En mouvement réduit, l'indice lui faisait
  tourner la tête d'un coup — une pose changée, sans mouvement, mais changée : « rien ne
  démarre » veut qu'elle ne bouge pas du tout. Trouvé par la porte de bout en bout à son
  premier passage.
- **Les portes.** `scripts/game2-page.test.ts` lit les builds : **une build de la génération 1
  ne porte pas un octet de la 2** — ni son nom, ni une classe de son dessin, ni un attribut que
  son script écrit, ni une de ses phrases, ni son script — sur `dist/`, `dist-ask/`,
  `dist-gists/` et `dist-scrutin/` ; et le même détecteur doit tout retrouver dans
  `dist-mascot2/`, sans quoi il ne prouverait rien. Dans la build de la 2 : elle est dans le
  bloc, une fois, dessinée depuis le fichier que tu as validé, forme pour forme, et sur aucune
  autre page ; la page Confidentialité liste le champ de la couleur ; les poids tiennent.
  `scripts/e2e-game2.ts` (`npm run e2e:game2`) joue le jeu dans trois moteurs : 232 vérifications sous Chromium, 197 sous Firefox, 197 sous WebKit, toutes bonnes.
  Pour savoir qu'elle sait échouer, trois défauts ont été introduits exprès dans le script — un
  bond qui dépendrait du choix, une phrase dite avant la fin du passage, la couleur écrite dans
  l'adresse : trois échecs, ceux-là. La porte de la génération 1, `scripts/e2e-game.ts`, n'est
  pas touchée et continue de tenir le jeu en ligne sur sa build. Les règles générales des
  builds (politique de sécurité, aucun HTML inséré, aucun champ nommé, liens sortants) lisent
  aussi `dist-mascot2/`. La CI joue la porte de la 2 sous Chromium, sans ses mesures de
  machine (`--no-lab`).
- **Mesures (15 novembre 2026, Chromium ; PROBABLE — un labo, pas un téléphone).** Script du
  jeu : 8 790 octets gzip (plafond 10 240). Page d'accueil : 17 006 octets gzip (plafond
  20 480, porte neuve ; 12 180 pour la génération 1). Données du jeu : inchangées. Fluidité,
  processeur ralenti 4 fois, 390 × 844 à deux pixels pour un, **sur la page du jeu elle-même** :
  pour chacun des quatre passages, 95 % des images en 16,8 ms au plus, 0 % au-delà de 20 ms, aucune au-delà de 50 ms (la passe du milieu de trois). Éclairs, filmés sur la page du jeu à vitesse réelle, la scène et ce qui change
  autour d'elle, dans les deux thèmes : 0 éclair par seconde, de lumière comme de rouge ; au plus 8 645 px² changent de lumière deux fois dans la même seconde (seuil : 21 824) — une image toutes les 33 ms à la médiane ; la mesure fine, douze fois ralentie, reste celle de sa planche. Labo de la carte du budget
  (`scripts/perf-probe.ts --root dist-mascot2`) : premier affichage 380 ms (budget 2 500), décalage 0,0002 (0,1), réponse à un geste 16 à 40 ms (200).
- **Accessibilité.** Audit automatique sous les neuf conditions du site, sur sept écrans — la
  question, la carte, la fin d'une manche pendant le passage puis après, la fin de la manche
  qui en fait un flamant, sa fiche, sa fiche pendant un « Revoir » : aucune violation grave, rien
  ne déborde, toutes les cibles font 44 px, chaque bouton a un nom. Au clavier : depuis la
  phrase de la fin de manche, « Choisir sa couleur », « Sa fiche », puis elle ; Entrée ouvre sa
  fiche ; Tab la parcourt dans l'ordre où elle se lit et n'en sort pas ; une couleur se donne à
  la barre d'espace ; Échap rend le focus. Couleurs forcées par le système (émulées, Chromium) :
  elle reste dessinée, son trait à 3:1 au moins du fond, et la couleur choisie se dit par sa
  bordure.
- **Preuves.** 647 tests (646 passent, 1 sauté depuis toujours), contraste, lint, types. Les portes de bout en bout de la génération 1, rejouées dans les trois moteurs sur leurs builds : les pages 44 / 41 / 41, « Demander » 109 / 102 / 102, **le jeu en ligne 117 / 108 / 108**, la feuille 102 / 96 / 96, l'audit d'accessibilité ; et celles de son dessin : 47 dans chacun des trois, son mouvement 132 / 109 / 109 — les nombres d'avant. **`npm run build` donne un `dist/` identique, octet pour octet, à
  celui d'avant le chantier** (1 156 fichiers) ; de même la build de l'aperçu, `dist-ask/`,
  et — comparées à celles du commit précédent, construites à part — `dist-gists/` et
  `dist-scrutin/`.
  L'empreinte de son dessin n'a pas bougé : la planche reste datée, la mesure de son mouvement
  reste valable (`scripts/mascot2.test.ts`). La lecture des images et la mesure des éclairs,
  dont deux portes ont maintenant besoin, sont passées telles quelles dans
  `scripts/picture-kit.ts` ; la porte du mouvement, rejouée dans les trois moteurs, rend les
  mêmes résultats.
- **Non vérifié (HYPOTHÈSE), dit tel quel** : de vrais téléphones, le navigateur d'Instagram,
  un vrai lecteur d'écran, une vraie personne photosensible ; la fluidité et les éclairs hors de
  Chromium ; le retour depuis le cache du navigateur, simulé par son événement ; les couleurs
  forcées, émulées dans un seul moteur ; que de vraies gens la remarquent enfin et aient envie
  de la faire changer.
- **Suite** : lot D — l'aperçu. Avant qu'il la serve : la ligne de la page Confidentialité, à
  te montrer pour que tu la dates (ou que tu me dises de la dater comme relue par la session
  seule) ; puis `preview_generation: 2`, la build de l'aperçu, son déploiement, sa vérification
  en ligne, les relectures indépendantes et les personas.

### 15 novembre 2026 — le jeu montré à l'éditeur ; quatre réponses avant l'aperçu (D17.26 à D17.29)

- **Montré** : une planche de douze captures du jeu de la génération 2, écran par écran (à côté
  du mot, la scène, « Passer », sa phrase, sa fiche, sa couleur, l'envol, le ciel, le thème
  sombre, 320 px), et une vidéo de 71 secondes du jeu tel qu'on y joue — deux manches et leurs
  passages, le choix de couleur, « Revoir », puis l'envol et la tortue dans le ciel. La CI est
  verte sur le commit du lot C (`04aec53`), la nouvelle porte du jeu comprise.
- **D17.26 — la ligne de la page Confidentialité est datée.** « la couleur que tu lui as
  choisie », lue par lui dans la question même : « Je viens de la lire : date-la ».
  `data/launch.json` porte la date du 15 novembre, « editor » et l'empreinte de la ligne. C'est
  ce que la porte demandait à tout hôte qui sert la génération 2, l'aperçu compris.
- **D17.27 — une sixième question sur la page Exactitude**, là où la génération 2 est servie :
  « Les animations du personnage du jeu gênent-elles quelqu'un, sur un vrai téléphone ? ». Dans
  le kit (`accuracy.unverified.06`), rendue derrière la constante de build ; la porte des builds
  la compte parmi ses phrases : une build de la génération 1 ne la porte pas.
- **D17.28 — touchée, sa fiche s'ouvre tout de suite et sa figure se joue dedans**, en grand :
  ce qui était construit. Le §4 du plan disait « une figure, puis sa fiche s'ouvre ».
- **D17.29 — « Choisir sa couleur » revient à chaque fin de manche tant qu'aucun choix n'est
  fait** ; « Sans couleur » est un choix. D17.23 disait « juste après qu'elle est devenue un
  flamant ».
- Les cinq autres choix du lot C — la couleur montrée sur un petit flamant, « Passer » à la
  place de « Sa fiche » le temps d'un passage, « Sa couleur aussi. » seulement quand elle en a
  une, la forme gardée après « Revoir », le passage arrêté si l'onglet est quitté — lui ont été
  dits ; ils découlent de D17.12, D17.8 et D17.25 et ne lui ont pas été posés en questions.

### 15 novembre 2026 (nuit) — trois relectures indépendantes du jeu ; ce qu'elles ont trouvé, corrigé, et quatre réponses de l'éditeur (D17.30 à D17.33)

- **Les relectures.** Sur la build d'essai du lot C, trois agents lancés depuis le dépôt (ils
  connaissent le projet : ce ne sont pas des lecteurs neufs, R49), en lecture seule, jamais dans
  `private/` : un « chasseur de captures » hostile, une relecture d'accessibilité, une relecture
  du code et de la vie privée. La troisième s'est arrêtée en route sur une limite d'usage du
  modèle ; elle a été relancée sur le code corrigé — ses conclusions sont à l'entrée suivante.
- **Ce qu'elles ont trouvé, et qui est corrigé** — dans les fichiers de la génération 2
  seulement ; la tortue en ligne n'est pas touchée :
  1. *Le mot du programme était coupé à côté d'elle*, après un geste : 8 mots coupés à 390 px,
     20 à 320 (« biblio-thèques », « carbu-rant ») ; la porte ne mesurait que l'écran d'arrivée.
     Le mot est maintenant une boîte de sa propre largeur, qui passe sous elle quand la place
     à côté manque.
  2. *« Site non officiel. » sortait du cadre de sa fiche* dès qu'elle avait un parcours et des
     couleurs. Il est tenu au bord bas de la fiche, où qu'on la fasse défiler.
  3. *Une touche tenue sur « Revoir » la faisait clignoter* : au-dessus du seuil de WCAG 2.3.1
     sur un écran d'ordinateur à 125–200 % de texte. Tenue sur « Garder ta tortue », elle
     gardait et oubliait tour à tour. Une touche tenue n'appuie plus qu'une fois dans tout le
     bloc, et « Revoir »/« Passer » ne changent sa forme qu'une fois par 350 ms au plus.
  4. *Le focus tombait sur la page* quand sa fiche se fermait après que le bouton qui l'avait
     ouverte eut disparu (une couleur choisie ; « Tout effacer »). Il revient sur elle.
  5. *Un passage coupé par un bouton qui dessine l'écran suivant* : sa phrase était effacée une
     à deux millisecondes après avoir été écrite, et qui utilise un lecteur d'écran n'apprenait
     jamais qu'elle était devenue un flamant. Elle est dite sur l'écran suivant, ou avant « Elle
     est gardée sur ce téléphone. ».
  6. *Sa fiche était illisible à 150–200 % de texte* : une lettre par ligne. La phrase de son
     parcours passe sous sa forme quand la place manque, et les couleurs se rangent sur une
     colonne.
  7. *La question prenait le focus sans son mot.* Elle est maintenant nommée avec lui — et au
     chapitre, avec la partie qui vient d'être dite. Le jeu en ligne a le même défaut ; il n'est
     pas touché.
  8. *Mineurs* :
     - « Sa couleur aussi. » était dit pour « Sans couleur » ;
     - « Son parcours » était un titre sur une liste vide, à l'état 0 ;
     - « Un indice » laissait le focus sur la page ;
     - un focus déjà dans la manche du HTML était perdu quand le script la reprenait ;
     - « Revoir » poussait le bouton pressé hors de la vue, dans une fenêtre basse ;
     - à 200 % de texte, la scène était cachée sous l'en-tête ;
     - en mouvement réduit, son grand dessin était un bouton qui ne faisait rien : c'est un
       dessin, et le focus commence au titre de la fiche ;
     - un appui destiné à « Passer » ouvrait sa fiche ;
     - la ligne de fin de manche restait périmée quand un autre onglet jouait ;
     - nos phrases étaient coupées en fin de ligne (« de-venue », « JavaS-cript »).
  9. *Trouvés par les nouveaux contrôles eux-mêmes* :
     - sur une page laissée en haut, « Passer » restait sous le bord de l'écran à la fin d'une
       manche (WebKit) : la scène et sa rangée sont maintenant ramenées ensemble ;
     - presser « Passer » envoyait le focus sur le titre plus bas, et la page défilait sous le
       doigt : il va sur « Sa fiche », à sa place exacte ;
     - avec le titre de sa fiche rendu focalisable, deux moteurs sur trois y mettaient le focus
       à l'ouverture : où il commence est maintenant dit par le script.
- **La preuve que les contrôles savent échouer.** La section neuve de la porte (`--only readings`)
  rejouée contre la build d'avant les corrections : 14 vérifications sur 15 y échouent ; toutes
  passent après, dans les trois moteurs. Deux d'entre elles avaient d'abord passé par chance —
  la parité du nombre d'appuis, une fiche ouverte par le mauvais bouton — et ont été resserrées.
- **Ses textes, quatre questions.** Une planche des quatre phrases, en place, a été montrée à
  l'éditeur avant ses réponses :
  - **D17.30** : « Tes réponses ne sont pas gardées. Rien n'est envoyé. » et « Tes réponses dans
    le jeu. » remplacent « Tes choix… » là où la génération 2 est servie ; la page
    Confidentialité est redatée à son nom avec ces lignes ;
  - **D17.31** : « Une couleur par partie du livre. » est retirée ;
  - **D17.32** : les phrases de sa figure restent affichées (le dossier les disait « jamais
    affichées », à tort) ;
  - **D17.33** : les noms des couleurs tiennent.
- **Laissé tel quel, dit tel quel.**
  - La lecture politique du chasseur de captures — sa fiche à l'état 4 sous « Ta tortue » ; la
    seconde où la scène n'est que de l'eau (D17.18). Faible, HYPOTHÈSE d'un lecteur informé.
  - « Elle a tout trouvé. » au-dessus de « Trois autres mots » : le jeu continue, c'est décidé.
  - **En ligne aujourd'hui, dans la génération 1, des défauts de même famille.** « Site non
    officiel. » sort du cadre de sa fiche à 320–360 px et aux états 3 et 4. Une touche tenue sur
    « Garder ta tortue » garde et oublie tour à tour. La question prend le focus sans son mot.
    Ses fichiers sont gelés jusqu'au lot E, et le passage à la génération 2 les corrige : c'est
    à l'éditeur de dire s'il en veut une correction avant.
- **Preuves.** 647 tests (646 passent, 1 sauté depuis toujours), contraste, lint, types. La porte du jeu de la génération 2, dans les trois moteurs : 247 vérifications sous Chromium, 212 sous Firefox, 212 sous WebKit, toutes bonnes ; mesures inchangées — aucun éclair dans les deux thèmes, aucune image au-delà de 50 ms processeur ralenti quatre fois. **`npm run build` reste identique, octet pour octet** (1 156 fichiers), de même `dist-ask/`, `dist-gists/` et `dist-scrutin/`. Script du jeu 9 336 octets gzip (plafond 10 240), page d'accueil 17 134 (plafond 20 480). La porte peut maintenant jouer une autre build (`--root dist`) et un hôte en ligne (`--origin https://…`) : c'est ce que le lot D fera de l'aperçu.

### 15 novembre 2026 (nuit) — la relecture du code et de la vie privée ; l'aperçu passe à la génération 2 (lot D)

- **La relecture du code et de la vie privée**, relancée sur le code corrigé : **ni bloquant, ni
  sérieux.** Elle a trouvé cinq défauts mineurs, tous reproduits par l'exécution, et tous corrigés :
  1. *La règle des 350 ms se contournait* en alternant « Revoir » et un appui sur sa grande copie.
     À 150 % de texte sur un écran d'ordinateur, dix appuis par seconde donnaient cinq éclairs par
     seconde. Tout changement de ses dessins sous un appui passe maintenant par cette règle. Des
     couleurs choisies plus vite qu'elle sont bien gardées, et elle porte la dernière quand le délai
     est écoulé.
  2. *« Envoyer le lien du jeu » pendant un passage*, là où l'adresse est copiée : « Lien copié. »
     effaçait la phrase du passage. Les deux sont maintenant dites ensemble.
  3. *Sa fiche disait que le téléphone gardait sa couleur* alors que seul l'onglet la tenait. Elle
     lit maintenant ce que tient le téléphone.
  4. *Un indice demandé pendant qu'un autre onglet écrivait* pouvait perdre ses marques. Les tuiles
     sont marquées par une minuterie à elles.
  5. *La ligne de fin de manche était réécrite* quand un autre onglet trouvait un mot sans la faire
     changer. Elle ne l'est plus que si sa forme a changé.

  Vérifié sans rien trouver, d'après elle :
  - rien ne part que le fichier du jeu et l'heure ;
  - le partage ne porte que l'adresse nue, et l'ancre est retirée de l'adresse ;
  - seuls les champs déclarés s'écrivent, et la couleur n'est jamais sur le téléphone avant
    « Garder » ;
  - un stockage forgé ou énorme se lit champ par champ, sans exception ni balisage ;
  - rien ne passe par un point que Trusted Types refuse ;
  - un passage n'est jamais joué au chargement, depuis un autre onglet ni depuis le cache ;
  - une touche tenue n'appuie qu'une fois, dans les trois moteurs.

  Les cinq nouveaux contrôles échouent sur la build d'avant et passent après. La section des
  relectures compte maintenant 20 contrôles.
- **L'aperçu passe à la génération 2.** C'est la décision de l'éditeur : l'option de D17.26 le
  disait, et il l'a choisie avec elle.
  - `data/mascot.json` passe à `preview_generation: 2` ; `generation` reste à 1 et
    `decided_by` vide : la production n'a pas bougé.
  - Un test supposait qu'une build montre toujours la génération 1. Il compare maintenant la build
    à ce que le fichier donne à son hôte.
  - **Avant le déploiement, sur la build exacte qui part** (`npm run build:preview`) : 652 tests (651 passent, 1 sauté depuis toujours) ; la porte du jeu dans les trois moteurs — 252 vérifications sous Chromium, 217 sous Firefox, 217 sous WebKit, toutes bonnes, après qu'un contrôle eut été corrigé : deux appuis plus rapprochés que la règle des 350 ms n'y passaient que par chance de minutage, et WebKit l'a montré ; la porte du site (44 / 41 / 41) et l'audit d'accessibilité (225 contrôles, 25 pages × 9 conditions, aucun échec), joués sur la build d'avant les cinq corrections du code, qui ne touchent que le script du jeu ; un essai à blanc du déploiement ; la porte de lancement ne refuse rien. **La build de la production reste identique, octet pour octet** (1 156 fichiers).
- **Déployé le 15 novembre à 22 h 43 (21 h 43 UTC)** — `npm run build:preview && npm run deploy:preview -- --bench`, commit `29c1616`, version `5e3a4951` — **et vérifié en ligne** :
  - 1 153 fichiers sur 1 156 identiques à la build, avec les trois écarts connus : `404.html`
    redirigé, `_headers` et `_redirects` non servis comme fichiers ;
  - `noindex` sur l'aperçu, et l'accueil sert la génération 2 ;
  - **la production sert toujours la génération 1**, sur `cestecritla.fr` et `www` ;
  - la porte du jeu, jouée contre l'aperçu en ligne dans les trois moteurs : 203 vérifications
    sous Chromium, Firefox et WebKit, toutes bonnes. Les sections qui demandent un serveur que la
    porte commande (le gel, les données qui manquent) ou une machine au repos (la fluidité, les
    éclairs, l'audit) restent jouées en local, sur les mêmes fichiers.
- **Trouvé en route, sans rapport avec la refonte.** Firefox, piloté par l'outil d'automatisation,
  ne voit jamais se charger un deuxième onglet d'un même contexte sur nos pages en ligne. La
  production fait de même. Ces pages sont servies avec `Cross-Origin-Opener-Policy: same-origin`,
  qui donne à chaque onglet un processus à part, et le pilote de Firefox perd l'onglet. Pour la
  passe en ligne, ce Firefox-là est lancé en ignorant cet en-tête ; rien de ce que fait le jeu
  n'en dépend. Qu'un vrai Firefox ouvre bien nos pages en plusieurs onglets reste une HYPOTHÈSE :
  personne ne l'a essayé à la main.

### 15 novembre 2026 (nuit) — les sept personas, à l'aveugle, sur l'aperçu

- **Jouée sur l'aperçu tel qu'il est servi**, avec treize images prises en ligne. Les sept
  personas de `eval/personas.json` ont été lancés hors du dépôt : ils ne connaissaient que leur
  fiche, les images et les questions. Le détail, les copies et la planche sont dans
  `13-tests-humains.md` §8 et `captures/2026-11-15/session4/`. **HYPOTHÈSE (personas).**
- **Ce qui tient :**
  - les sept la voient changer, dans le bon ordre (BDEAC), et la reconnaissent pour le même
    personnage ;
  - aucun ne se sent noté, jugé ni félicité ;
  - aucun ne trouve le site officiel ;
  - personne ne la trouve moche ;
  - six sur sept comprennent juste ce que garde le téléphone, couleur comprise ;
  - le critère éliminatoire, l'avis du militant sceptique (D0.32), ne se déclenche pas.
- **Ce qui pèse, dit tel quel :**
  - **cinq sur sept la disent enfantine**, dont trois « un peu ». Le dessin seul, à l'aveugle au
    lot A2, ne l'était pas : c'est l'idée d'une tortue qui devient flamant qui est jugée ;
  - une militante pressée (M1) ferme la page au flamant et ne l'enverrait jamais, par peur de la
    capture ;
  - l'envie de la faire changer reste un « peut-être » pour six sur sept ;
  - un passage est trop long pour quatre, tous le passeraient dès la deuxième fois ;
  - une couleur se lit politique pour un persona (R46), et « Rouge » se choisit parce qu'il sort
    rose.
- **Ce que la session propose à l'éditeur :**
  - « Elle change quand tu trouves des mots. » ne nomme pas la tortue, quatre sur sept l'ont
    relevé ;
  - « Passer » ne dit pas ce qu'il passe ;
  - la carte « Garder » est un pavé : c'était déjà une idée hors de ce plan, à sa demande.
- **Suite :** le rapport à l'éditeur, captures comprises, et ses questions — la phrase du début,
  puis la production (lot E).

### 15 novembre 2026 (nuit) — le rapport, trois réponses de l'éditeur, et la production (lot E, D17.34 à D17.36)

- **Le rapport.** La planche des treize images montrées aux personas lui a été envoyée.
  L'état de l'aperçu et la session lui ont été donnés dans la question même, chiffres compris :
  ce qui tient, et ce qui pèse — cinq personas sur sept la disent enfantine, une militante pressée
  fermerait la page au flamant, l'envie de la faire changer reste un « peut-être » pour six.
- **Ses réponses :**
  - **D17.34** : « Ta tortue change quand tu trouves des mots. » ;
  - **D17.35** : « Passer l'animation » ;
  - **D17.36 : « Oui, bascule »**, écrit dans `data/mascot.json` sur ce mot daté
    (`generation: 2`, `decided_on: 2026-11-15`, `decided_by: editor`).
- **Avant le déploiement, sur la build exacte de la production** (`npm run build`, génération 2) :
  la porte de lancement ne refuse rien ; 652 tests ; la porte du jeu dans les trois moteurs (252, 217 et 217 vérifications) ; la porte du site (44, 41 et 41) ; l'audit d'accessibilité (225 contrôles, aucun échec) ; aucun éclair, aucune image au-delà de 50 ms processeur ralenti quatre fois.
- **Déployé le 15 novembre à 23 h 27 (22 h 27 UTC)** — `npm run deploy`, commit `085a1bd`,
  version `2644c40b` — **et vérifié en ligne** :
  - sur `cestecritla.fr` et `www`, 1 153 fichiers sur 1 156 sont identiques à la build, avec les
    trois écarts connus ;
  - pas de `noindex`, et l'accueil sert la génération 2 ;
  - la porte du jeu, jouée contre la production en ligne dans les trois moteurs : 203
    vérifications sous Chromium, Firefox et WebKit, toutes bonnes ;
  - l'aperçu a été redéployé à 23 h 37 (22 h 37 UTC) avec les deux nouveaux textes : version
    `f366887a`, 1 153 fichiers sur 1 156 identiques ;
  - le Worker des phrases (`cestecritla-chat`) n'a pas été touché.
- **Retour arrière** : `generation` à 1 dans `data/mascot.json`, puis `npm run build && npm run
  deploy`. L'état de chacun est gardé ; un téléphone y perd seulement la couleur choisie. La
  génération 1, ses fichiers et ses portes restent dans le dépôt jusqu'au ménage (lot F), sur
  son mot.
