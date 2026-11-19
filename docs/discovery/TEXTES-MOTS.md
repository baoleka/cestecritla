# Les textes du chantier « Aucun mot ne bloque »

> **Sous le mandat D20.3 (« Jusqu'à la production »).** Le plan (`PLAN-MOTS.md`, lot 15)
> demande un seul document de toutes les phrases d'interface nouvelles du chantier, depuis la
> build en ligne (kit `design/strings.json`, v0.14 → v0.15.0). Les voici : **douze chaînes
> nouvelles, trois récrites**. Toutes sont de la session, une IA ; aucune personne ne les a
> validées une à une, et aucune ne dit qu'une personne les a relues. Elles entrent sur la
> parole que ce mandat donne, comme les explications elles-mêmes.
>
> Chacune tient les règles du kit : quinze mots au plus par phrase, la typographie française
> (espaces insécables), aucun mot de récompense, de rang ni de verdict, et aucune ne dit qu'un
> mot ou un sujet manque au programme (`scripts/check-strings.test.ts`).
>
> **Ce qui n'a pas bougé** : l'étiquette des explications, `chat.terms.badge` (« Explications
> écrites et vérifiées par une IA »), que la porte épingle et qui a la forme de celle des
> phrases ; la ligne de la page Confidentialité qui dit que les mots expliqués sont trouvés sur
> le téléphone, `privacy.chat.terms` — la page est datée par l'éditeur ; les dix-huit textes
> du jeu qu'il a validés (D19.19), l'étiquette de la phrase d'une carte comprise.
>
> **Où elles paraissent** : seulement dans une build dont le champ demande (mode « chat ») et là
> où `data/2026/words.json` ouvre la surface — les pages, la recherche, le jeu. La production
> n'en montre aucune avant le lot 17.

## Les chaînes nouvelles

| Clé | Texte | Où | Lot |
|---|---|---|---|
| `words.example` | Exemple | Devant l'exemple d'un mot expliqué : la feuille, les fiches, la page des mots | 3 |
| `words.section.title` | Des mots de cette section, expliqués | La ligne repliée sous le texte d'une fiche de section | 4 |
| `words.page.title` | Des mots de cette page, expliqués | La même ligne, sous une de nos cartes ou de nos réponses | 4 |
| `words.section.ideas` | Les idées de cette section | Sur une fiche : nos cartes dont une mesure est dans la section | 4 |
| `words.hub.ideas` | Les idées du programme | La page « Mots du programme » : nos cartes | 5 |
| `words.hub.title` | Les mots, de A à Z | La même page : tous les mots expliqués, sous des lettres | 5 |
| `words.hub.lead` | Les sigles, les lois, les institutions et les notions du programme. Touche un mot : il s'ouvre sur ce qu'il veut dire. | La même page, sous son titre (écrite au lot 5 pour des sigles et des termes techniques, élargie au lot 15 : la page tient 933 mots) | 5, 15 |
| `words.hub.filter` | Filtrer les mots | Le champ qui filtre la page, sur le téléphone | 5 |
| `words.hub.none` | Aucun mot expliqué ne correspond. La recherche, elle, lit tout le programme. | Quand le filtre ne garde rien : jamais « ce mot n'est pas dans le programme » | 5 |
| `words.search.row` | Ce que veut dire « {term} » | Au-dessus des résultats de la recherche, quand ce qui est tapé est un mot expliqué | 6 |
| `words.game.title` | Des mots de cette phrase, expliqués | Sous la carte du jeu, hors de son cadre, après « Mot suivant » | 14 |
| `accuracy.unverified.07` | Les mots expliqués aident-ils un lycéen, sans le prendre de haut ? | La page « Exactitude », avec les questions que seules de vraies personnes peuvent trancher | 15 |

## Les chaînes récrites

| Clé | Avant | Après | Pourquoi |
|---|---|---|---|
| `about.gists_terms` | Avec les phrases, des mots sont expliqués : sigles, termes techniques. Une IA a écrit ces explications d'avance, puis une autre les a vérifiées. Elles viennent de connaissances générales, pas du livre. Elles disent le sens d'un mot, jamais ce que prévoit le programme. Personne ne les a relues une à une. | Partout sur le site, des mots du livre sont expliqués : sigles, termes techniques, lois, institutions. Une IA les a relevés en lisant le livre. Une IA a écrit ces explications d'avance, puis une autre les a vérifiées. Elles viennent de connaissances générales, pas du livre. Elles disent le sens d'un mot, jamais ce que prévoit le programme. Leurs exemples sont des cas inventés, aux montants ronds. Personne ne les a relues une à une. | Les mots ne viennent plus seulement des phrases, mais du livre (D20.10) ; ils ont des exemples. Les quatre phrases que la porte épingle restent mot pour mot. |
| `accuracy.review.terms` | Les explications de mots sont à part aussi. Une IA les a écrites, une autre les a vérifiées. | Les explications de mots sont à part aussi. Une IA les a écrites, une autre les a vérifiées. Leurs exemples sont inventés. | Les exemples (D20.2) ne se lisent pas comme des faits (R63). |
| `concept.index_lead` | Les mots qui reviennent dans le programme, expliqués en clair, avec le texte. | Les notions propres au programme, décrites en clair, avec leurs mesures. | Nos cartes nouvelles ne citent aucune mesure en entier (D20.14) : « avec le texte » ne valait plus pour elles. Et deux lecteurs à l'aveugle lisaient « expliquées » comme l'adoption du point de vue du parti : elles sont « décrites ». |

## Ce que les textes ne disent pas

- Qu'une personne a lu les explications : le fichier dit `read_by_a_person: false`, et
  `scripts/check-strings.test.ts` refuse toute chaîne qui dirait le contraire.
- Qu'un mot ou un sujet est absent du programme : la ligne d'un filtre vide renvoie à la
  recherche, qui lit tout.
- Ce que prévoit le programme : seules nos cartes, épinglées à leurs mesures, le disent.
