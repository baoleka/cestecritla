# Fichiers de termes de la FAQ v0

Entrées de `scripts/extract-passages.ts` qui ont servi à choisir les identifiants de `data/faq.json`
(corpus `d29c7422004ab27c`). Les fichiers de passages produits ne sont pas commités : ils se
régénèrent à l'identique.

```sh
npx tsx scripts/extract-passages.ts --terms eval/faq-terms/1-sujets.json --out /tmp/faq-passages
npx tsx scripts/extract-passages.ts --terms eval/faq-terms/2-verifications.json --out /tmp/faq-passages
npx tsx scripts/extract-passages.ts --terms eval/faq-terms/3-sections-entieres.json --out /tmp/faq-passages
npx tsx scripts/extract-passages.ts --terms eval/faq-terms/4-relecture-negatives.json --out /tmp/faq-passages
npx tsx --test scripts/faq.test.ts
```

| Fichier | Passe | Rôle |
|---|---|---|
| `1-sujets.json` | 1 (7/9) | 70 sujets larges, un par question candidate |
| `2-verifications.json` | 2 (7/9) | 38 vérifications ciblées pour trancher les absences (euro, revenu universel, peine de mort, voile…) |
| `3-sections-entieres.json` | 3 (7/9) | 14 sections extraites par leur titre pour lister toutes leurs mesures |
| `4-relecture-negatives.json` | 4 (8/9) | relecture : les 11 réponses négatives ou partielles re-vérifiées avec des alias élargis, plus le mot « gratuit » dans tout le livre |

Règle : les identifiants d'une entrée viennent uniquement des passages « corpus » retournés ; les
passages « livrets_2022 » et « désintox » ne sont jamais des réponses.
