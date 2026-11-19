# Les mots expliqués — ce qui est en place, comment on l'a vérifié, ce qui ne l'est pas

> Le dossier du chantier « Aucun mot ne bloque » (D20.1 à D20.19), écrit au lot 15 de
> `PLAN-MOTS.md`. Le plan dit le pourquoi ; son journal, lot par lot, le détail. Ce document dit
> ce qui est en place, comment le garder juste, et ce que personne n'a vérifié. Chaque fait
> porte son statut : **VÉRIFIÉ** (constaté, avec sa preuve), **MESURÉ** (compté par un outil),
> **HYPOTHÈSE** (des lecteurs simulés, pas des gens).
>
> **En production depuis le 20 novembre 2026, 0 h 16** (D20.22). **Tout ce qui suit a été fait par une IA** — la session, sous le mandat D20.3 de l'éditeur
> (« Jusqu'à la production ») — et vérifié par d'autres modèles. **Aucune personne n'a relu
> les explications une à une**, et le site le dit.

## 1. Ce qui change pour un visiteur

| | Avant (15 novembre 2026) | Après |
|---|---|---|
| Mots expliqués | 259 sigles et termes, choisis d'après nos phrases | **933**, relevés dans le livre lui-même, prose comprise |
| Exemples | aucun | **103**, des cas concrets d'adulte, inventés (D20.2) ; les autres disent pourquoi ils n'en ont pas |
| Cartes | 5 | **15**, dont 7 cartes courtes (D20.5, D20.14) |
| Où on les lit | dans la feuille « Demander », quatre au plus | la feuille (tous les mots des phrases affichées) ; chaque fiche de section ; nos cartes et nos réponses ; la page « Mots du programme », de A à Z, avec un filtre ; une ligne dans la recherche ; sous la carte du jeu |

Ce qui ne change pas : la question tapée ne quitte jamais le téléphone ; aucune IA ne répond en
direct ; une explication dit le sens d'un mot, jamais ce que prévoit le programme — seules nos
cartes le disent, mesures épinglées ; aucune explication n'est écrite dans le HTML, elles
arrivent par script avec leur étiquette, « Explications écrites et vérifiées par une IA »
(D20.11) ; aucune adresse demandée ne dépend d'un mot tapé ou touché (D20.13).

## 2. « Aucun mot ne bloque », en quatre propriétés (D20.8)

1. **Chaque racine que le site montre est jugée** : claire, à expliquer, à surveiller, ou nom
   (`data/2026/vocabulary.json`). **MESURÉ** : 4 992 racines — 3 988 claires, 635 à
   expliquer, 243 à surveiller, 126 noms. Porte de la CI.
2. **Chaque occurrence d'une racine à expliquer est dans l'étendue d'un mot expliqué ou d'une
   carte.** Porte de la CI pour nos textes ; **attestée en local** pour le livre entier (1 360
   unités, prose comprise) et nos 1 069 phrases (`npm run lexicon -- --attest`, `meta.attested`
   dans `data/2026/terms.json`) — la CI refuse une attestation faite sur d'autres mots.
   **MESURÉ** : 387 racines difficiles non tenues avant les domaines 4 à 8 de l'écriture, 0
   après les cartes.
3. **Chaque entrée a un exemple, ou le code qui dit pourquoi non** (`E` évident après
   l'explication, `S` sensible, `D` deux sens). Porte de la CI.
4. **Aucune explication ne s'appuie sur un mot à plus de deux pas, aucune ne tourne en rond.**
   Porte de la CI. **MESURÉ** avant le lot 13 : 33 cercles et 64 explications trop profondes,
   autour de la protection sociale ; après : aucun.

**Ce que cela ne prouve pas** (R67) : c'est le jugement d'une IA, sur ce qu'un élève qui entre
en seconde (D20.9) sait lire seul ; les lecteurs qui l'ont mis à l'épreuve sont simulés.

## 3. Comment les mots ont été relevés (lot 9)

Quatre filets. **Les racines** : les 4 087 racines publiques, jugées par la session et, à part,
par un autre modèle sur la seule liste — **accord 86,4 %** sur « à expliquer » ; l'union des
deux, arbitrée. **Les motifs** : sigles avec leur casse, lois, traités et organismes nommés,
unités, latin, expressions. **La lecture** : la session a lu le livre entier, chapitre par
chapitre, et noté ce qu'un élève de seconde ne lirait pas seul. **Le panel** : un outil de
chasse, jamais une preuve. Le tri : 1 714 candidats, 1 620 gardés par une règle écrite avant.
Les racines que seule la prose du livre emploie sont jugées hors du dépôt et ne sont publiées
nulle part.

## 4. La charte

- **Une explication** : 200 caractères au plus, des phrases courtes, des connaissances
  générales ; ni « programme », ni « mesure », ni avis, ni futur ; un mot de camp dit son noyau,
  puis qui l'emploie ; un sigle dit ce que ses lettres veulent dire.
- **Un exemple** (D20.2) : un cas concret d'adulte, au présent, impersonnel, inventé ; des
  montants ronds, jamais un barème, un taux ou un seuil légal de l'année, jamais un nombre du
  livre ; ni image (« c'est comme »), ni mot d'enfant, ni « imagine » ; aucun effet d'une
  réforme. Toute part, année ou durée est déclarée — illustration ou fait, avec sa source.
- **Un sujet sensible** (D20.6) : peuples, religions, origines — une phrase d'identification,
  de dictionnaire, sans exemple, lue par deux lecteurs hostiles, un de chaque bord.

## 5. Ce que chaque lot a vérifié

| Lot | Entrées écrites | Vérification des faits, premier passage | Levées par écrit | Panel (réponses justes) | Lectures hostiles |
|---|---|---|---|---|---|
| 10 — fiscalité, finances publiques | 75 | 50 « ok » sur 68 (sans le web), puis 68 sur 75 | 2 | 60 sur 60 | 6 et 8 relevées |
| 11.1 — travail, protection sociale | 98 | 77 sur 96 (80 %) | 2 | 30 sur 30 | 9 et 8 |
| 11.2 — santé | 59 | 52 sur 59 (88 %) | 1 | 30 sur 30 | 6 et 4 |
| 11.3 — écologie, énergie, agriculture, mer | 197 | 114 sur 149 (77 %) | 6 | 30 sur 30 aux cinq derniers tours | quatre tours |
| 11.4 — institutions, territoires | 79 | 65 sur 79 (82 %) | 3 | 30 sur 30 | trois tours |
| 11.5 — économie, entreprise, commerce | 53 | 52 sur 58 (90 %) | 3 | 30 sur 30 | deux tours |
| 11.6 à 11.8 — international, école et culture, justice et droits | 161 | 55 sur 72, 33 sur 40, 35 sur 52 | 6 | 30 sur 30 | deux à trois tours |
| 12 — les cartes | 10 | 9 sur 10 contre les pages officielles (D20.7), puis 10 sur 10 | 0 | — | — |
| 13 — troisième vérification (datées, sensibles, 15 % au hasard) | 269 relues | 237 sur 269 (88 %) ; puis un « faux » et un « daté » trouvés et corrigés | 8 (3 %) | 79 sur 80, puis 40 sur 40, deux fois | deux tours, puis les sensibles |
| 13 bis — exemples | 42 exemples | 41 sur 42, puis tout « ok » | 0 | 50 sur 50 | 3 et 5 relevées, aucune des deux bords |

Après les reprises de chaque lot : **aucun faux, aucun daté, aucun orienté, aucun exemple
fautif** ; les levées par écrit restent sous les 5 % que le plan permet, chacune nommée au
journal avec sa raison. Le vérificateur est un modèle autre que celui qui écrit, lancé hors du
dépôt, qui ne lit que les sources primaires (Légifrance, service-public, vie-publique, Insee,
EUR-Lex, ONU, et les sites officiels des organismes nommés) et n'écrit dans ses recherches que
le terme vérifié.

## 6. Ce qui garde le fichier juste

- **Le sceau** (D20.15) : `meta.sealed` porte l'empreinte des entrées ; la production ne prend
  un fichier de mots que scellé tel qu'il est, et ouvert dans `data/2026/words.json`
  (`scripts/launch.ts`, `wordsBlockers`). Changer un mot fait tomber le sceau.
- **Les faits datés** : 84 explications, et cinq exemples qui s'appuient sur une règle réelle,
  disent un fait qui peut changer ; chacun est déclaré dans `eval/terms-sources.json` avec la
  page officielle qui le porte, et relu tous les quatre-vingt-dix jours. Les parts que donnent
  d'autres exemples y sont déclarées pour ce qu'elles sont : des illustrations (`scripts/terms-recall.ts` ouvre un ticket ; ce n'est pas
  une garde). Le premier rappel tombe le 17 février 2027.
- **Changer un mot, dans l'ordre** : réécrire ; les portes (`npx tsx --test scripts/terms.test.ts
  scripts/lexicon.test.ts`) ; le faire vérifier par un autre modèle ; `npm run lexicon --
  --places`, `--vocabulary` (juger les racines nouvelles), puis, sur la machine qui tient le
  livre, `--attest` et `--seal` ; une ligne de décision qui porte les douze premiers caractères
  du sceau.

## 7. Ce qui n'est pas vérifié

- **Personne n'a lu les explications une à une** (R65). Le site le dit ; aucune chaîne ne
  peut dire le contraire tant que le fichier dit `read_by_a_person: false`.
- **Les lecteurs du panel et des lectures à l'aveugle sont des modèles** (HYPOTHÈSE). Ils ne
  disent pas ce qu'un vrai lycéen comprend, ni ce qu'un vrai adulte trouve condescendant (R64).
  La page « Exactitude » pose la question à de vraies personnes (`accuracy.unverified.07`).
- **L'étiquette d'IA refroidit** (R62) : à l'aveugle, six personas sur sept disent avoir
  moins confiance dans des explications « vérifiées par une IA » (« une IA qui se vérifie
  elle-même »). L'étiquette reste : elle dit vrai, et elle a la forme de celle des phrases,
  validée par l'éditeur.
- **Un exemple peut se lire comme un fait, ou comme l'effet d'une mesure** (R63) : la charte
  l'interdit, le vérificateur le cherche ; ce n'est pas une garantie.
- **Les faits changent** (R70) : la loi, les traités, les institutions ; le rappel à
  quatre-vingt-dix jours ne retire rien du site.
- **Ce que le site officiel montre hors du livre** (encadrés, légendes) n'est pas couvert
  (D20.8).
- **De vrais téléphones, un vrai lecteur d'écran** : les poids sont mesurés dans un labo, les
  parcours dans trois moteurs ; rien sur un appareil réel.

## 8. Les entrées sensibles, nommées (D20.6)

Trente-deux entrées n'ont pas d'exemple parce que leur sujet est sensible ; chacune a été lue
par deux lecteurs hostiles, un de chaque bord : AME, IVG, PMA, GPA, clause de conscience,
créolisation, LGBTI, fraude fiscale, soins palliatifs, mourir dans la dignité, santé sexuelle,
personnes menstruées, Nouvelle-Calédonie, chanoine de Latran, communautarisme, génocide,
peuples autochtones, territoires palestiniens occupés, État de Palestine, réfugiés
palestiniens, suprémacisme, fascisant, Roms, tirailleurs sénégalais, islamophobie,
antisémitisme, intersexe, masculiniste, féminicide, racisé, identité de genre, orientation
sexuelle. Le journal dit, pour chacune qu'un bord a relevée, si elle a été reprise ou gardée, et
pourquoi.

## 9. Les cartes

Cinq cartes d'avant (règle verte, bifurcation écologique, 6e République, planification
écologique, écocide) ; trois cartes nouvelles (pôle public, intérêt général humain, Sécurité
sociale intégrale) ; sept cartes courtes (garantie d'autonomie, conscription citoyenne,
éco-région, principe de non-régression, Front du refus, taxe kilométrique aux frontières,
commission de contrôle salarié sur l'égalité). Les nouvelles ne citent aucune mesure en
entier ; chacune est épinglée à ses propositions par empreinte, et a été vérifiée par un autre
modèle contre les pages officielles qu'elle cite (D20.7).
