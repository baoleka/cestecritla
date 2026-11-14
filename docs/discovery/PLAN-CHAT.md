# Plan — « Demander » : le chatbot (copie du plan approuvé le 14 novembre 2026)

> **Copie, dans le dépôt, du plan approuvé par l'éditeur le 14 novembre 2026** — décisions
> D16.45 à D16.51 de `decisions.md`. Elle porte le journal d'exécution, en fin de fichier : c'est
> elle qui fait foi sur l'avancement. Le plan précédent, exécuté jusqu'au lancement, est
> `PLAN-JEU.md`. **Tant que les portes du §5 ne sont pas passées, la production reste en
> « recherche seule » (D16.33)** : rien de ce plan n'est servi à un visiteur.


> **Ta demande du 14 novembre 2026, le site en ligne** : « un chatbot intégré auquel on peut poser
> n'importe quelle question sur le programme (gratuit mais le plus performant possible) —
> notamment qu'il puisse nous expliquer des termes ou concepts techniques, des domaines avec
> lesquels on est [moins] familier. […] qu'il aille seamlessly avec l'UX et l'UI, l'UX doit
> rester super. »
>
> **Tes réponses du même jour** — à consigner D16.45 à D16.50 :
> 1. **La question part, avec un accord au premier usage** — D16.22 est levée *pour ce geste*.
> 2. **L'IA explique ; le programme parle par du vérifié** — tout « le programme prévoit… » est
>    une phrase écrite d'avance et vérifiée, avec son lien.
> 3. **Une feuille qui monte**, la conversation dedans, le champ en bas.
> 4. **Les 1 069 mesures** (« Je veux que le chatbot puisse répondre à des questions sur les
>    1069 mesures ») — **et tu lis chaque phrase, au fil de l'écriture** : 45 à 60 minutes par
>    jour pendant une semaine. Le chatbot ouvre quand elles sont toutes lues.
> 5. **L'accord nomme le pseudonyme et l'adresse de contact** ; ton identité reste non publiée.
>
> Ce plan remplace le précédent dans ce fichier (exécuté jusqu'au lancement ; sa copie et son
> journal restent `docs/discovery/PLAN-JEU.md`). Il a été attaqué par une relecture
> d'architecture et une relecture hostile ; ce qu'elles ont changé est au §9.

## Contexte

Le site est en production en « recherche seule » : il dit **où** une mesure est écrite, pas
**ce qu'elle prévoit** — ce que les sept personas réclament le plus, et ton premier souhait.

Ce que l'exploration du 14 a établi (documentation lue ce jour, VÉRIFIÉ sauf mention) :

- **Aucun modèle gratuit ne tourne dans un téléphone** (celui de Chrome : ordinateur seulement ;
  les petits modèles plantent ou mettent des minutes). Un modèle qui lit la question est hébergé
  — chez Cloudflare, seule offre que tes règles permettent.
- **Gratuit, donc plafonné** : 10 000 neurons par 24 heures pour tous les visiteurs — de l'ordre
  de 250 (Mistral) à 780 (Gemma) explications par jour (calculé, à mesurer). Au-delà : la
  feuille continue sans l'IA, sans mot de panne. **Les phrases relues, elles, ne coûtent rien** :
  elles répondent à tout le monde, sans limite.
- **Rien n'est gardé si c'est réglé ainsi** : Cloudflare écrit ne conserver ni entrée ni sortie
  et ne pas entraîner dessus, sauf journal ou cache de passerelle — le chat n'en aura aucun.
- **Presque tout « Demander » existe** (`src/lib/ask-*.ts`, `src/worker/`), pour une question et
  une réponse ; la requête ne peut pas porter de phrase, et une dizaine de portes le tiennent.
- **En septembre, expliquer les notions était le point faible du modèle** ; le compteur de quota
  du Worker ne suit pas la fenêtre réelle (`neurons-log.md`).

## 1. Ce que voit le visiteur

La recherche en tapant ne change pas. Le mode ouvert, le champ de l'accueil gagne **un bouton,
« Demander »**. Le toucher fait monter **une feuille** (`<dialog>`, comme la fiche de la tortue) :
« Site non officiel. » en tête, le fil, le champ de réponse en bas, « Fermer ». Ce qui était
tapé devient la première question.

**Une réponse en trois temps — le plus sûr d'abord, et rien à accepter avant d'avoir reçu :**

| Quand | Bloc | D'où | Étiquette |
|---|---|---|---|
| tout de suite, sans réseau | **« En clair »**, si une notion ou une objection est reconnue | nos 5 cartes et 15 réponses, relues à la main | « Relu par un humain » |
| ≈ 0,5 s, sans accord | **« Ce que prévoit le programme »** : trois phrases au plus, chacune avec « C'est écrit là → » | les phrases que tu as lues, en base ; **aucun modèle, aucune phrase envoyée** | « Écrites d'avance, relues par l'éditeur » |
| ≈ 2 à 4 s, **après l'accord** | **L'explication** : une à trois phrases courtes sur les mots de ces phrases | le modèle, qui lit la question et ces phrases-là — jamais le livre | « IA · {modèle} », dans le texte même |

**L'accord** n'apparaît qu'à la place de l'explication, la première fois : ce qui part (la
question telle qu'écrite), qui la lit ({modèle}, chez Cloudflare), que rien n'est enregistré,
de ne rien écrire sur soi, « 15 ans ou plus », le responsable (« l'éditeur de cestecritla.fr
(Baoleka) », contact). Deux boutons de même poids : « J'accepte que cette IA lise ma
question » · « Non, sans IA ». Une fois par visite de page ; ensuite « Ne plus envoyer à l'IA »
reste à portée, avec « Effacer la conversation ».

**Relances** : « Plus simple », « Un exemple » — des boutons, qui refont l'explication depuis
les phrases relues, jamais depuis la précédente. Les notions voisines. Le champ pour la suite.

**Les autres états, tous des modes normaux** : quota épuisé ou modèle muet → les deux premiers
blocs seuls, et la question ne part même pas ; mesure sans phrase (aucune n'a passé le contrôle
ou ta lecture) → son lien seul ; rien trouvé → « Rien trouvé avec ces mots. » — jamais « le
programme n'en parle pas » ; hors sujet, vote → « Ici, on ne parle que du programme. » ; gel
L49 → les questions reprennent après ; sans JavaScript → pas de bouton.

## 2. Ce qui part, ce qui reste

| | Chercher | « Demander » (bloc 2) | L'explication, après l'accord |
|---|---|---|---|
| Part du téléphone | rien | des identifiants de mesures — comme D16.22 | **la question** (300 caractères, une ligne), ces identifiants, la relance choisie, la version de l'accord |
| Où | — | notre Worker, la base privée | notre Worker, puis le modèle ; ni passerelle, ni cache, ni journal |
| Gardé | rien | rien | rien chez nous ; chez Cloudflare, ce que leur engagement écrit — dit en ces termes |
| Sur le téléphone | rien | rien | rien : le fil vit dans la mémoire de la page, effacé quand on la quitte |

Aucun texte libre n'est renvoyé au modèle d'un tour à l'autre : ni l'historique, ni ses propres
phrases. Le Worker refuse toute question sans version d'accord.

## 3. Trois voix qui ne se mélangent pas

1. **Le livre** : titres officiels et liens, comme aujourd'hui.
2. **Les phrases relues** — une par mesure, **1 069** : écrites d'avance par un modèle,
   étiquetées par deux autres (un tri, pas une preuve), **lues par toi une à une** sur la page
   locale. Seules celles que tu valides entrent en base, chacune épinglée à l'empreinte de sa
   mesure et datée. Une mesure dont aucune phrase ne passe garde **son lien seul** : c'est un
   verdict, pas un trou. Elles forment une catégorie de `data/2026/exposure-policy.json`, que tu
   valides en connaissance de cause : **c'est une paraphrase du livre entier**.
3. **L'IA du moment** : elle explique des mots présents dans les phrases affichées. Le contrôle
   refuse toute phrase qui attribue (« le programme », « la mesure », le mouvement, une
   personne), tout nombre absent des phrases affichées, toute négation, tout avis, toute consigne
   de vote, tout écho de la question. **Une phrase refusée, et l'explication entière ne
   s'affiche pas** : les deux premiers blocs suffisent.

## 4. Architecture

**Deux requêtes, deux classes de vie privée.**

- `POST /api/gists` `{corpus, ids ≤ 8}` → `{gists:[{id,text}], ai}`. Aucun modèle, 0 neuron.
  `ai` est faux si le mode, le gel, le quota ou l'interrupteur le disent : alors la question ne
  part pas du tout.
- `POST /api/chat` `{corpus, ids ≤ 5, question, follow?, consent}` → `{explain, sentences}` ou
  `{quiet}`. Seule requête du site qui porte une phrase ; `/api/ask` et son contrat disparaissent
  de la production (ils restent pour le banc).

**Dans le Worker** : gardes existantes (`src/worker/guards.ts` : origine, taille, gel, débit) ;
`loadGists` à côté de `loadMeasures` (`src/worker/measures.ts`) ; une invite `SYSTEM_EXPLAIN`
(`src/worker/prompt.ts`) qui ne reçoit **que nos phrases relues, nos cartes et la question** ;
appel direct au modèle, **sans la passerelle** ; **le contrôle côté serveur seulement**
(`src/lib/ask-validate.ts` : `sentenceRefusals` scindée, `explanationRefusals` et
`validateExplanation` ajoutées, règles neuves `attribution`, `echo`, ancrage) ; pas de juge à
l'exécution. Modèles admis à lire une question : ceux à « zéro rétention » écrite (Mistral
Small 3.1, Gemma 4 26B, Llama 3.3 70B) — un drapeau dans `src/worker/models.ts`.

**Le compteur** (`src/worker/budget-core.ts`, `budget.ts`) : 24 tranches horaires glissantes au
lieu d'un jour UTC ; un refus « quota épuisé » du modèle est lu comme tel, libère sa réserve et
ferme l'IA trente minutes.

**La base** (`src/worker/sql/schema.sql`) : une table `gists(id, text, measure_sha256, read_on)`
et son interrupteur propre ; `scripts/seed-ask-2026.ts --gists` (accord requis, refuse une
empreinte périmée, une phrase que le contrôle refuse, une fuite) ; un outil suivi,
`scripts/gists-2026.ts`, remplace les scripts locaux de l'essai : écriture par lots, reprise,
budget, étiquettes des juges, tes verdicts, page de relecture.

**Le téléphone** : `src/components/ChatSheet.astro`, `src/scripts/chat.ts` (chargé au premier
geste, jamais avec la page), `src/styles/chat.css`, `src/lib/chat-contract.ts`, `chat-view.ts`,
`chat-local.ts`, `notions.ts`. Réutilisés tels quels : `loadEngine`, `measureLink`,
`firstWords`, `el` (`src/scripts/engine.ts`), `reviewedFor`, `silenceReading`,
`enhanceOfficialLinks`. Une constante de build `__CEL_CHAT__` : **mode fermé, la page reste
identique à l'octet près**.

**Le mode reste une donnée** (`data/2026/ask.json`) : « chat » ou « off », **par hôte**, pour
ouvrir l'aperçu sans la production. L'échelle « réponse écrite / sélection » est retirée : le
banc l'a fermée, et ta décision 2 la contredit.

**Le déploiement** : l'apex reste des fichiers statiques ; le chat est **un second Worker sur
`/api/*`**, retirable d'une commande. À répéter d'abord sur l'aperçu (PROBABLE d'après la
documentation) ; sinon, un seul Worker, après la répétition du retour au statique (R27).

## 5. Les portes avant d'ouvrir

| Porte | Seuil |
|---|---|
| Les 1 069 mesures | chacune a sa phrase **lue par toi**, épinglée et datée, ou le verdict « lien seul » ; catégorie d'exposition validée |
| Explication qui attribue, nie, conseille, nomme, ou répète une consigne glissée | 0 sur le jeu d'essai (170 items + notions, relances, attaques) |
| Explication infidèle aux phrases affichées (juges, puis tes 40 fils) | 0 dans ta lecture |
| Bloc relu à l'écran / explication, p95 depuis le Worker | < 1 s / < 4 s ; calcul du Worker p99 < 8 ms |
| Rien avant le geste ; pas de question avant l'accord ; rien d'écrit sur le téléphone ; aucun tiers | tenu par e2e |
| Quatre vrais téléphones, dont le navigateur d'Instagram | la feuille et le clavier tiennent |
| Personas (tâche 1 et la ligne d'accord), relecture hostile, revue de sécurité | zéro bloquante |
| Dossier légal : analyse du geste (art. 9, 13, 50), registre, courte analyse d'impact, captures (journal coupé, aucun moyen de paiement) | fait pour de vrai, avant que l'aperçu réponde |

Le modèle : **le banc choisit, Mistral à égalité** (D16.3) ; un suppléant est mesuré d'avance.

## 6. Les lots — chacun laisse le dépôt vert et la production intacte jusqu'à C12

| Lot | Contenu | Fait quand |
|---|---|---|
| **C0** | D16.45 à D16.50 ; `CLAUDE.md` réécrit ; `11-conformite.md` (le geste, le responsable) ; risques | plus aucune phrase du dossier ne dit le contraire |
| **C1** | Compteur glissant et coupe-circuit | l'écriture des phrases et le chat le partagent |
| **C2** | Table `gists`, `loadGists`, `seed --gists`, `scripts/gists-2026.ts`, page de relecture ; fin de l'essai (43 mesures) : **accord des juges avec ta lecture** | mesuré |
| **C3** | **Les 1 069 phrases, par lots quotidiens** — mesures clés d'abord, puis le livre dans l'ordre : écriture (≈ 150 par jour, tout le quota du jour), juges, **ta lecture du lot de la veille** ; dépôt en base avec ton accord, interrupteur fermé | 1 069 verdicts : « relue » ou « lien seul » |
| **C4** | Contrat du chat, contrôle étendu, notions — purs | chaque règle a son test |
| **C5** | Routes `/api/gists` et `/api/chat` ; mode « explain » du banc | e2e à 0 neuron |
| **C6** | La feuille, l'accord, les états, les chaînes (hors confidentialité) ; `e2e-ask.ts` réécrit | états du §1 ; clavier, lecteur d'écran, 320 px, mouvement réduit |
| **C7** | Retrait de `/api/ask` et de l'échelle | portes réécrites |
| **C8** | Banc des explications (après C3 : il prend le quota de un à deux jours) ; seuils fixés en le rejouant ; **tes 40 fils** ; modèle confirmé | portes du §5 |
| **C9** | Toutes les chaînes `privacy.*` et les pages qui expliquent, en un lot — tu redates `privacy_page` | pages générées et testées |
| **C10** | Répétition du déploiement (second Worker, ou retour au statique) | un oui ou un non écrit |
| **C11** | Chat sur l'aperçu seul ; téléphones ; personas ; relecture hostile ; revue de sécurité | zéro bloquante |
| **C12** | Production — **ton accord au moment de le faire** ; les deux interrupteurs répétés | vérifié sur les trois hôtes |

C4 à C7 se construisent pendant la semaine de C3 : le code n'attend pas les phrases, et les
phrases n'attendent pas le code. Budget, calculé sur l'essai : ≈ 40 000 neurons pour écrire et
étiqueter les 1 069 phrases, 8 à 10 000 pour le banc — **six à sept jours de quota gratuit**,
que rien n'accélère sans payer.

## 7. Ce qui te revient

- **Lire, chaque jour pendant une semaine** : le lot de la veille sur la page locale (45 à 60
  minutes ; 6 à 9 heures en tout) — pour chaque phrase : fidèle, ou non. Puis 40 fils sur
  l'aperçu, et `/confidentialite` réécrite. **C'est le chemin critique : le chatbot ouvre au
  rythme de ta lecture.**
- **Faire pour de vrai** ce qui n'est que daté : les trois lectures juridiques, le tableau de
  bord (journal de la passerelle, aucun moyen de paiement) — le chatbot s'appuie dessus.
- **Tes accords au moment de le faire** : chaque dépôt de phrases en base ; Worker de chat en
  production ; modèle retenu ; retirer de Cloudflare le texte du livre une fois les phrases
  écrites (la production n'en a plus besoin).
- **À trancher avant le 1er janvier 2027** : l'IA en direct reste-t-elle ouverte pendant la
  campagne (L163-2), ou seulement les phrases relues.
- **Risques que tu acceptes en approuvant** : un accord sous pseudonyme peut être dit
  insuffisamment informé ; **une phrase en nos mots pour chacune des 1 069 mesures est une
  paraphrase du livre entier**, que sa notice interdit d'« adapter » — c'est la plus forte
  exposition du projet depuis la réédition ; ta sortie reste le retrait du site (D14.10).

## 8. Vérification de bout en bout

```sh
source ~/.nvm/nvm.sh && nvm use 24
npx tsc --noEmit && npx tsx --test scripts/*.test.ts && npx tsx scripts/contrast.ts
npm run build && npm run typecheck && npm run lint && npm run a11y && npm run e2e
npm run build:ask && npm run e2e:ask && npm run e2e:game && npm run build:scrutin:test
npx tsx scripts/bench-ask.ts --replay     # 0 neuron : le contrôle sur toutes les sorties
npx tsx scripts/launch.ts
```

Portes à réécrire (toutes sous `scripts/`) : `ask-worker.test.ts` (« question » admise dans
`src/worker/chat.ts` et `prompt.ts` seulement ; aucun appel du chat ne passe par la passerelle),
`e2e-ask.ts` (rien avant le geste ; au geste `corpus, ids` seulement ; aucun `/api/chat` avant
l'accord, ni quand `ai` est faux ; le bloc relu paraît quand le modèle se tait ; aucune phrase
d'IA sans son étiquette ; stockage inchangé après trois tours ; fil vide au retour arrière),
`check-no-ai-mention.test.ts`, `check-strings.test.ts`, `check-build.test.ts` (script du chat
≤ 12 Ko, jamais préchargé), `build-mode.ts`, `launch.ts` ; neuves : `chat-contract.test.ts`,
`gists-2026.test.ts`, `chat-view.test.ts`, `notions.test.ts`.

À la main, sur l'aperçu : dix questions et les quinze objections ; un mot technique ; une
insulte, « pour qui voter », une consigne glissée ; refuser l'accord puis l'accepter ; « Plus
simple » trois fois ; couper le réseau ; vider le quota ; fermer et rouvrir la feuille ; revenir
en arrière ; le navigateur d'Instagram ; un lecteur d'écran.

## 9. Ce que les deux relectures ont changé

| Dans le brouillon | Retenu |
|---|---|
| La question partait pour tout, accord demandé d'abord | deux requêtes ; **les phrases relues sans accord**, l'accord pour l'IA seule |
| Phrases « vérifiées » sans règle | **toutes lues par toi**, épinglées, datées — ou « lien seul » |
| Historique du fil renvoyé au modèle | aucun texte libre ne revient ; relances fermées |
| Contrôle côté téléphone, juge à chaque réponse | contrôle côté serveur seul ; juges au banc |
| Cache de trente jours de la passerelle | aucune passerelle sur le chemin du chat |
| Compteur remis à zéro à minuit UTC | tranches glissantes ; coupe-circuit sur le refus du modèle |
| Un Worker sur l'apex | l'apex reste statique, un second Worker sur `/api/*` — à répéter |
| Accord en une ligne | responsable nommé, « 15 ans ou plus », retrait, version exigée par le Worker |
| L'IA « explique » sans borne | les mots des phrases affichées seulement ; tout ou rien |

---

## Journal d'exécution

### 14 novembre 2026 — le plan

- **Comment il s'est fait.** Demande de l'éditeur, le site en ligne depuis le matin. Trois
  explorations (le code de « Demander », ce que le dossier impose, ce que les techniques
  gratuites permettent le jour même), puis cinq questions, puis deux relectures du brouillon —
  une d'architecture, une hostile. Un premier plan, limité aux 107 mesures clés, a été refusé :
  « Je veux que le chatbot puisse répondre à des questions sur les 1069 mesures ». Celui-ci
  l'a remplacé, et il a été approuvé.
- **Ce qui est déjà là** : la route du banc sait faire relire une phrase par des juges
  (`08-ia.md` §10.11) ; l'essai des phrases écrites d'avance attend le quota gratuit (D16.38) ;
  la page locale de relecture existe.
- **Lot C0** (ce commit) : les décisions, les contraintes de `CLAUDE.md`, l'analyse du geste
  dans `11-conformite.md`, les risques R34 à R39, les hypothèses.

### 14 novembre 2026 — lot C4 : le contrat, le contrôle, les notions

- **Fait** : `src/lib/chat-contract.ts` (les deux requêtes et leurs réponses, la question
  nettoyée, la version de l'accord, ce que le modèle rend), le contrôle d'une explication dans
  `src/lib/ask-validate.ts` (les règles d'une phrase y sont désormais partagées avec la réponse
  écrite ; les 26 tests d'origine passent sans retouche), `src/lib/notions.ts` (cartes et
  objections reconnues dans une question). Trois fichiers de tests neufs, 36 tests :
  `chat-contract.test.ts`, `chat-explain.test.ts`, `notions.test.ts`. **Rien n'est branché** :
  une porte tient que seul le contrôle lit le contrat tant que les lots C5 et C6 ne sont pas
  faits.
- **Ce qui s'écarte du plan, et pourquoi.** Un champ que le contrat ne nomme pas rend la
  requête illisible — **refusée, pas ignorée** (le brouillon disait « ignoré ») : une page qui
  enverrait plus qu'elle ne dit doit échouer bruyamment. Le contrôle a reçu les règles que la
  relecture hostile suggérait — chaque phrase tient seule (`opener`), au présent (`tense`),
  sans concession (`contrast`), sans nom que la page n'écrit pas (`name`) — et trois listes
  fermées de plus après un essai sur vingt-cinq phrases inventées : les dates sans nombre, les
  positions rapportées et les camps, le vocabulaire de la campagne. La version de l'accord est
  **calculée** sur le texte lu, pas tapée.
- **Ce que le contrôle ne voit pas** est écrit dans le fichier et dans `08-ia.md` §10.13, avec
  trois phrases inventées qui passent. H-IA-23 ouverte.
- **À poser à l'éditeur au lot C5** : l'IA sur les dix-huit sections sensibles ; l'IA quand une
  objection est reconnue. Par défaut : non aux deux.

### 14 novembre 2026 — lot C1 : le compteur glissant et le coupe-circuit

- **Fait**, par un agent dans sa propre copie de travail, relu puis repris sur `main` : le
  compteur de neurons ne connaît plus de jour UTC. Vingt-cinq tranches d'une heure (un neuron
  pèse de 24 à 25 heures, jamais moins), une réserve rendue quand la plateforme refuse l'appel,
  et un coupe-circuit de trente minutes sur le refus « quota épuisé » — le seul autre 429
  documenté, un modèle hors capacité, reste un appel cassé. `src/worker/budget-core.ts`,
  `budget.ts`, `ask.ts`, `index.ts` ; `scripts/budget.test.ts` (13 tests : l'arithmétique,
  l'objet tel qu'il est écrit sur le SQLite de Node, le Worker devant un modèle qui répond 429).
  L'objet a aussi tourné dans le moteur local, par-dessus le stockage de l'ancienne version :
  son ancienne table et son alarme de minuit disparaissent au réveil.
- **Ajouté à la relecture** : si le refus arrivait en exception plutôt qu'en réponse, ses mots
  sont lus aussi (`saysExhausted`) — sans cela le Worker rappellerait la plateforme à chaque
  question, ce contre quoi le lot est écrit.
- **Le dossier corrigé** là où il disait « remise à zéro à minuit UTC » : `01-faits.md`,
  `outillage.md`, `08-ia.md` (§10.7, §10.10 et deux renvois), `09-architecture.md` (ADR-6),
  `14-risques.md` (R24, R31), `16-hypotheses.md` (H-PLA-14), `neurons-log.md`. Les documents de
  septembre qui racontent leur propre jour restent tels quels. `quota.title` et `{resetTime}`
  du kit de chaînes annoncent une heure de retour qui n'existe pas : à régler avec les chaînes
  du lot C6.
- **En ligne sur l'aperçu depuis le 14 novembre, 13 h 47 UTC** (version `fa41604e`, pages
  inchangées : 1 152 fichiers sur 1 155 identiques à `dist/`, les trois écarts connus). Le
  registre est reparti vide et compte juste : 21,89 neurons après deux juges, rien pour ce qui
  revient du cache (`neurons-log.md`). **Le quota gratuit répond de nouveau** depuis cette
  heure-là au plus tard. Le script local qui attend le quota sonde la plateforme directement,
  pas `/api/bench` : le coupe-circuit ne le gêne pas.
- **Reste PROBABLE** : la forme du refus à travers le lien et la passerelle (lue dans le moteur
  local seulement). **Reste vrai** : chaque Worker a son propre registre pour un seul quota de
  compte — seul le coupe-circuit voit ce qui est dépensé ailleurs (à reprendre au lot C10).

### 14 novembre 2026 — lot C6 : la feuille, côté page

- **Fait, dans la build d'essai seulement** (`npm run build:ask`, `dist-ask/` ; Worker simulé,
  0 neuron). Le site n'a plus que deux modes, « chat » ou « off » (`src/lib/ask-config.ts`) :
  l'écran de la réponse écrite et de la sélection est retiré de la page avec son script. Le
  bouton « Demander » ouvre `src/components/ChatSheet.astro` ; son script
  (`src/scripts/chat.ts`, 5,3 Ko compressé) n'est chargé qu'au premier appui ; ce qui se décide
  l'est par les modules purs du lot précédent. Les textes d'« En clair » sont un fichier
  statique (`/data/clair-<empreinte>.json`), chargé avec la feuille.
- **En mode « off » — la production — rien de la feuille n'est livré** : ni script, ni feuille
  de style, ni un mot (`__CEL_CHAT__`, tenu par `scripts/check-build.test.ts`). L'ancien script
  de « Demander », qui partait dans `dist/` sans jamais être chargé, n'y est plus.
- **L'accord** est rendu depuis le kit dans l'ordre de `CONSENT_LINES`
  (`src/lib/chat-data.ts`) : un titre, sept lignes, deux boutons de même poids. Sa version est
  calculée sur ces mots-là, et le test de bout en bout la recalcule depuis l'écran.
- **Le test de bout en bout est réécrit** (`scripts/e2e-ask.ts`, trois moteurs : 111 contrôles
  dans Chromium, 104 dans Firefox et WebKit) : rien avant le geste ; au geste `corpus` et `ids`
  seulement, les trois mesures que la recherche classe en tête ; aucune requête ne porte la
  question avant l'accord, ni après un refus ; après l'accord, la question telle qu'affichée,
  les mesures dont la phrase est à l'écran, la version de l'accord — et rien d'autre, relances
  comprises ; chaque autre état sans un mot de panne ; rien d'écrit sur le téléphone ; le fil
  vidé au retour arrière.
- **Ce que les captures ont montré et que les contrôles ne voyaient pas** : à la deuxième
  question la feuille entière défilait et son en-tête sortait de l'écran (un texte masqué,
  positionné par rapport à la feuille au lieu du fil). Corrigé, et tenu depuis par un contrôle.
  Le pied de la feuille a été resserré, le champ mis au gabarit du site, les césures coupées.
- **Trois choix à relire sur l'aperçu** : les trois mesures les mieux classées plutôt qu'une
  par section (mesuré : 239 lignes sur 396 dans une section attendue, contre 159 sur 394) ;
  l'accord placé sous les phrases relues, donc sous la ligne de flottaison d'un téléphone ;
  chaque relance proposée une seule fois par question.
- **Reste pour ouvrir quoi que ce soit** : les routes (C5), le retrait de l'échelle côté Worker
  et du déploiement (C7), `/confidentialite` entière (C9). Le kit passe en 0.8.0 ; les pages
  « À propos », « Méthode », « Exactitude » et « Confidentialité » disent déjà ce que fait le
  mode « chat », pour qu'aucune build d'essai ne dise faux.

### 14 novembre 2026 — le contrôle : « programme » et « mesure », toujours refusés

- **Un trou trouvé en relisant l'invite des phrases écrites d'avance** : elles commencent par
  « Le programme prévoit… ». La règle du lot C4 laissait à l'explication les noms de l'appareil
  du livre « tels que la page les écrit » — donc « le programme prévoit », mot pour mot, dès
  qu'une phrase relue était à l'écran : exactement ce que D16.47 interdit. Les deux mots sont
  maintenant refusés dans une explication quoi que montre la page ; l'exception ne vaut plus
  que pour « proposition », « texte », « projet », « parti », « mouvement », « candidat »,
  « militant ». Un test le tient, sur une page qui écrit les deux mots.

### 14 novembre 2026 — lot C2 : la base des phrases et le bureau de lecture

- **Fait**, par un agent dans sa propre copie, relu puis repris sur `main` : la table
  `gists(id, text, measure_sha256, read_on)` et ses quatre clés de `meta`, dont un interrupteur
  à part (`gists`) ; `loadGists(db, ids, corpus)` — rien n'est rendu si les phrases ne sont pas
  ouvertes pour cet état-là du livre, tenu deux fois, par la requête et par l'état lu avec elle ;
  le dépôt (`seed-ask-2026.ts --gists`, interrupteur écrit « arrêté » à chaque fois, accord du
  jour exigé pour envoyer) ; et l'outil suivi `scripts/gists-2026.ts` (`npm run gists`) :
  `--status`, `--write --budget`, `--serve` — le bureau de lecture —, `--sql`. 25 tests sur un
  livre inventé, et `npm run e2e:gists` (le bureau dans trois moteurs).
- **Le bureau de lecture** est une page servie à 127.0.0.1 seulement, derrière un jeton tiré à
  chaque lancement, qui refuse tout autre hôte : le seul endroit où le texte du livre s'affiche
  à côté de nos phrases. Trois choix par mesure — « Fidèle », « Corriger », « Aucune : lien
  seul » —, au clavier comme à la souris, chaque choix enregistré aussitôt. **La session ne
  l'ouvre pas** : la lecture est celle de l'éditeur.
- **Ce qui s'écarte du plan, et pourquoi.** Un verdict ne tient que tant que sa mesure et le
  contrôle tiennent : si l'empreinte a bougé, ou si le contrôle d'aujourd'hui refuse la phrase
  gardée, la mesure sort du dépôt et revient sur le bureau — le reste se dépose quand même.
  Une sous-mesure est épinglée aussi à la mesure sous laquelle on la lit. Ce qui bloque un
  dépôt : un identifiant hors du manifeste, un doublon, la même phrase pour deux mesures, neuf
  mots de suite du livre, une phrase que la page ne saurait pas afficher.
- **Vérifié sur la machine de l'éditeur** (identifiants et nombres seulement) : `--check` de la
  base — 1 069 propositions, chaque ligne à l'empreinte du manifeste ; `--status` — 1 069
  mesures dont 107 clés, rien d'écrit encore dans le nouvel état ; `--sql --check` — un dépôt
  vide se construit et se relit. **Pas encore vérifié** : une écriture réelle par la route du
  banc (le quota), et le confort de lecture sur de vraies phrases.
- **L'essai du chapitre p4c1** (D16.38) se poursuit désormais par cet outil : les phrases déjà
  écrites dans la nuit reviennent du cache de la passerelle, sans neuron.

### 14 novembre 2026 — lot C5 : les deux routes, et le mode « explain » du banc

- **Fait, et fermé partout** : `/api/gists` et `/api/chat` existent dans le Worker
  (`src/worker/chat.ts` pour les chemins, `index.ts` pour le câblage), et répondent « local » et
  « rien » tant que `data/2026/ask.json` dit « off » — avant d'avoir regardé quoi que ce soit.
  13 tests sans réseau (`scripts/chat-worker.test.ts`), sur une base inventée dont le « texte du
  livre » porte un marqueur : il n'arrive jamais au modèle, ni dans une réponse.
- **`/api/gists`** : silence, mode, état du livre, base — puis les phrases relues des mesures
  nommées, et `ai` : le compteur dit s'il y a de la place **sans rien réserver**
  (`NeuronBudget.available`), et n'est même pas consulté quand il n'y a ni phrase ni modèle.
- **`/api/chat`** : rien ne part vers le modèle si le site ne demande pas, si l'accord n'est pas
  celui que ce Worker connaît (la même fonction que la page, du même kit :
  `src/lib/chat-consent.ts`), si la question porte une objection qu'une personne a déjà
  répondue ou demande pour qui voter, s'il n'y a aucune phrase relue à l'écran, si le compteur
  est fermé. Puis le modèle, **appelé directement** (`runDirect` : ni passerelle, ni cache), et
  le contrôle : tout, ou rien. Le chemin n'importe même pas le lecteur des mesures.
- **Ce que le modèle lit** (`explainRequest`) : nos phrases relues, la carte que la question
  nomme, et la question — en dernier, écrite comme une chaîne JSON, pour qu'elle ne puisse pas
  refermer son propre bloc. L'invite ne dit ni de quel livre ni de quel mouvement il s'agit.
- **Un modèle ne lit une question que si son hôte écrit ne rien garder** : drapeau `keeps` de
  `src/worker/models.ts` — Mistral Small 3.1, Gemma 4 26B, Llama 3.3 70B ; gpt-oss-120b reste
  un candidat du banc, pas du chat.
- **Le banc sait demander une explication** (`mode: "explain"` de `/api/bench`, aperçu seul,
  derrière sa clé) : mêmes consigne, appel et contrôle que `/api/chat`, avec des phrases que le
  banc fournit — les nôtres, depuis la machine de l'éditeur — pour mesurer avant tout dépôt.
  Il ne rend que les phrases que le schéma nomme, jamais la sortie brute.
- **Trois portes réécrites** pour dire la règle nouvelle au lieu de l'ancienne : une seule route
  lit une question ; le mot « question » ne nomme rien hors de `chat.ts`, de `prompt.ts` et du
  mode du banc ; chaque requête du chat passe une fois par son propre lecteur strict.
- **Reste ouvert, pour C10 et C11** : le mode par hôte (ouvrir l'aperçu sans la production) ;
  le Worker pèse 137 Kio avec le kit et les deux fichiers éditoriaux (40 avant).

### 14 novembre 2026 — lot C7 : l'ancienne route retirée, deux modes seulement

- **`/api/ask` n'existe plus** dans le Worker, ni son chemin (`answerQuestion`), ni la lecture
  des modes « answer » et « select » dans le câblage : un fichier qui dirait l'un des deux par
  erreur n'ouvrirait rien. Restent, pour le banc seul, le contrat (`ask-contract.ts`), le
  contrôle d'une réponse écrite et les modes de `/api/bench`. Neuf tests du chemin retiré
  sortent ; ce qui restait vrai de la requête du banc — aucune phrase n'y entre — est tenu
  autrement, avec la liste des routes que le Worker sert.
- **Le déploiement et le lancement ne connaissent plus que « chat » ou « off »**
  (`scripts/build-mode.ts`, `scripts/launch.ts`). Un chat sur l'apex est **refusé par le script
  de déploiement**, même à blanc, tant que le lot C10 n'a pas écrit comment il s'y déploie.
  « chat » repose, côté fichiers, sur : un banc des explications enregistré, la base à l'état
  du manifeste, les phrases relues déposées pour ce livre avec **un verdict par mesure**
  (`gists` de `data/2026/ask.json`), quarante fils lus (`threads_read_on`), le modèle confirmé.
- **L'aperçu** sert les routes neuves depuis 14 h 37 UTC (version `4a2fd65e`) : fermées, elles
  répondent « local » et « rien » ; un champ que le contrat ne nomme pas vaut 400 ; une autre
  origine, 403. Vérifié en ligne, avec les pages (1 151 fichiers sur 1 154 identiques à
  `dist/`, les trois écarts connus) et les 81 contrôles dans trois navigateurs.
- **Redéployé après ce lot, à 14 h 47 UTC** (version `32f903ea`, la boucle d'écriture endormie) :
  `/api/ask` répond **404** aux deux verbes ; `/api/gists` « local », `/api/chat` « rien », un
  champ `history` 400, une autre origine 403, `GET` 405, `/api/bench` sans clé 404 ; `noindex`
  toujours servi ; 1 151 fichiers sur 1 154 identiques à `dist/`. VÉRIFIÉ (sondes du jour).
- **Reporté à C10 et C11, avec sa raison** : le mode par hôte (ouvrir l'aperçu sans la
  production). Tant qu'il n'existe pas, passer `ask.json` à « chat » ouvrirait la feuille dans
  la build de la production aussi — que le déploiement refuse, et que la porte de lancement
  bloque.
- **Conséquence du lot C6, à dire à l'éditeur** : les chaînes de `/confidentialite` ont changé,
  donc la porte de lancement refuse tout redéploiement de la production jusqu'à ce qu'il ait
  relu la page et redaté `privacy_page` — après le lot C9, qui la complète.

### 14 novembre 2026 — lot C9 : la page Confidentialité, complète

- **Une section « Quand tu demandes »** (`/confidentialite/#demander`, où mène le lien de
  l'accord), dite seulement quand le champ demande, en trois listes : *ce qui part* (les numéros
  des mesures au geste « Demander » ; la question après l'accord, à quoi elle sert, où le modèle
  tourne), *ce qui est gardé* (rien de la question chez nous, l'engagement écrit de Cloudflare,
  le fil en mémoire de page, le compteur de la minute, le compteur de ce que l'IA consomme en
  tout) et *ton accord* (il fonde seul l'envoi, il vaut pour la page ouverte, les deux gestes
  pour arrêter et pour vider, « 15 ans ou plus », rien de gardé qui désigne quelqu'un).
- **Trois corrections de fond, chacune relue à la source ce jour-là** (`11-conformite.md` §6.2
  sexies, tableau du lot C9) :
  1. **Le lieu du modèle.** Le premier jet disait « en Europe ou aux États-Unis ». La
     documentation dit que Workers AI calcule « au plus près » du visiteur et qu'aucune région
     ne se choisit (*Regional Services* : ✘). La page écrit donc « au plus près de toi, sans
     garantie de rester en Europe », et l'accord « chez Cloudflare, une société américaine ».
     Une porte de build refuse le retour de la promesse.
  2. **La garantie du transfert**, que la page ne nommait pas depuis septembre (article 13) :
     le cadre UE–États-Unis sous lequel Cloudflare se dit certifié, et à défaut les clauses
     types de son contrat, dont l'adresse publique est donnée. **Dans les deux modes** : c'est
     vrai de l'hébergement aussi. Le cadre est attaqué devant la Cour : H-CNF-24.
  3. **Deux gestes, pas un** : « Ne plus envoyer à l'IA » arrête l'envoi, « Effacer la
     conversation » vide le fil. Le dossier les confondait.
- **Deux retouches de cohérence** : quand le champ demande, « L'app ne mesure rien » devient
  « Pas de compteur de visites, pas de mesure d'audience » — un compteur existe, et la section
  le dit ; le responsable est écrit comme dans l'accord, pseudonyme compris (D16.50).
- **Dans l'accord de la feuille** : « C'est {modèle}, chez Cloudflare, une société
  américaine. » et « N'écris rien sur toi ni sur quelqu'un d'autre : santé, opinions, nom. »
  La version de l'accord change avec ses mots : une page d'avant ne peut plus rien envoyer.
- **Ce que la production servirait de neuf** (mode « off »), une fois relue : le paragraphe de
  la garantie sous « Hébergeur », et le pseudonyme dans la ligne du responsable. Rien d'autre.
- **À l'éditeur** : relire `/confidentialite` dans les deux modes, puis `privacy_page` est
  redatée avec l'empreinte du jour. Jusque-là la porte de lancement refuse la production — le
  retrait reste possible.
- **Vu en écrivant ce lot, à corriger à part** : le compteur de la minute est commun aux deux
  routes — six envois en tout. Une question vaut deux envois, chaque relance un de plus : la
  troisième question d'une minute perdrait ses phrases relues, sans un mot. Les deux routes
  doivent être comptées à part.

### 14 novembre 2026 — le compteur de la minute : chaque route à part

- **Le défaut.** Une question vaut deux envois — les phrases relues, puis l'explication — et
  chaque relance un de plus. Comptés ensemble à six par minute, ils faisaient perdre ses phrases
  relues à la troisième question d'une minute, sans un mot : la feuille aurait montré des liens
  seuls à qui lit vite.
- **Le correctif.** La clé du limiteur porte la route (`RateLane` : « gists », « chat »,
  « bench », `src/worker/guards.ts`) : six envois par minute **sur chacune**. Lire des phrases
  n'est plus ralenti par ce que le modèle répond, et le banc ne prend rien aux deux autres. La
  clé reste une empreinte qui ne dit rien de l'adresse, gardée une minute.
- **Ce que ça ne change pas** : la vitesse à laquelle un script peut lire les phrases relues —
  six envois de huit phrases par minute et par adresse, comme avant (R35). La page
  Confidentialité dit déjà « tes demandes sont comptées à la minute ».

### 14 novembre 2026 — lot C8, première moitié : l'outil du banc des explications

- **`scripts/bench-explain.ts`** existe, avec ses tests (`bench-explain.test.ts`, sept) : il fait
  de chaque question du jeu d'essai ce que la page en fait, prend les phrases relues sur la
  machine de l'éditeur, interroge le mode « explain » de `/api/bench`, garde ses lignes sous
  `private/bench/` et n'imprime aucune phrase. Protocole, portes, ordre des tours et coût
  attendu : `08-ia.md` §10.15, **écrit avant d'être joué**.
- **Pas un appel n'a été fait.** `--plan` (aucun réseau) dit pourquoi : sur 170 questions, 22 ne
  partiraient jamais (20 objections reconnues, 2 demandes de vote) et, avec les 18 phrases
  écrites à cette heure — aucune encore lue —, 4 seulement auraient quelque chose à expliquer.
  **Le banc attend les phrases** (lot C3), comme le plan le disait.
- **Reste du lot C8** : jouer le banc (deux jours de quota, calculé), fixer les seuils en le
  rejouant, les quarante fils lus par l'éditeur, le modèle confirmé.

### 14 novembre 2026 — l'aperçu après le lot C9 et le correctif du compteur

- **Redéployé à 15 h 17 UTC** (version `a42634b6`, la boucle d'écriture endormie) : `/api/ask`
  404, `/api/gists` « local », `/api/chat` « rien », un champ `history` 400, une autre origine
  403, `/api/bench` sans clé 404 ; `noindex` servi ; 1 151 fichiers sur 1 154 identiques à
  `dist/` ; les contrôles des trois navigateurs tiennent. VÉRIFIÉ (sondes du jour).
- **L'aperçu sert la page Confidentialité du lot C9**, dans sa forme « recherche seule » : le
  paragraphe de la garantie du transfert et le pseudonyme dans la ligne du responsable y sont
  lisibles — c'est la page que l'éditeur relit. La section « Quand tu demandes » n'existe que
  dans la build d'essai (`dist-ask/`) tant que le mode est « off ».
- **L'écriture des phrases** (lot C3) : deux séances de plus à 14 h 22 et 15 h 00 UTC — 18
  phrases écrites sur les 43 mesures du chapitre d'essai, 521 neurons en tout ce jour. Le quota
  revient par petites tranches (`neurons-log.md`).

### 14 novembre 2026 — lot C10, première moitié : le chat est un Worker à part, prêt à être répété

- **Le schéma retenu, écrit et construit à blanc** : la production reste des fichiers
  statiques (`wrangler.static.jsonc`, Worker `cestecritla`) ; le chat est **un second Worker**,
  `cestecritla-chat` (`wrangler.chat.jsonc`) — le même script, sans les fichiers, sur **deux
  adresses exactes par hôte** : `/api/gists` et `/api/chat`. Aucun joker : rien d'autre sous
  `/api/` ne l'atteint. Il a son compteur, son limiteur, la même base privée ; son journal est
  coupé ; la clé du banc n'y est jamais posée, donc `/api/bench` y répond 404.
- **Pourquoi ça doit marcher** — VÉRIFIÉ dans la documentation, pas encore sur ce compte :
  « Routes … take precedence if configured on the same hostname » (Cloudflare, *Custom
  Domains* et *Routes*, lu le 14/11/2026). Une route passe devant un domaine personnalisé du
  même hôte : les deux adresses vont au chat, tout le reste au site. Retirer ce Worker rend
  les deux adresses au site, qui y répond 404 comme pour toute page absente.
- **Ce que ça règle** : R27 ne concerne plus la production. L'apex n'aura jamais de classe
  Durable Object : son retrait (la page d'attente) reste un déploiement de fichiers, que rien
  ne peut refuser. R27 reste vrai de l'aperçu, qui garde le Worker du banc.
- **La règle de déploiement** (`scripts/build-mode.ts`, `chatDeployRefusal`, testée) :
  `npm run deploy:chat:preview -- --accord <jour>` et `npm run deploy:chat -- --accord <jour>`,
  et rien d'autre. Un essai à blanc n'envoie rien et passe toujours (la CI le joue dans les
  deux environnements). Un vrai déploiement exige **l'accord du jour sur la ligne de
  commande** ; devant l'apex il exige en plus que le site réponde aux questions (`ask.json`)
  et que plus rien ne bloque le lancement — dont la répétition elle-même
  (`deployment_rehearsed_on`, champ neuf de `data/2026/ask.json`, lu par `scripts/launch.ts`).
  La page qui demande, elle, part vers l'apex en fichiers : `wranglerConfig` ne donne plus
  jamais le Worker à l'apex.
- **Un seul quota, plusieurs compteurs — décidé et écrit** : l'allocation gratuite est celle
  du compte, et chaque Worker ne compte que ce qu'il dépense lui-même (le chat de la
  production, celui de l'aperçu, le banc). Ce qu'ils ont en commun est le refus de la
  plateforme : chacun le lit, ferme son modèle une demi-heure et répond sans lui. Aucune
  facture n'est possible (aucun moyen de paiement) ; le risque est qu'un banc affame les
  visiteurs. **Règle d'exploitation** : une fois le chat ouvert en production, tout banc et
  toute écriture de phrases se lancent avec un budget court, la nuit. À savoir aussi : le
  compte porte d'autres Workers que ceux de ce projet — les plafonds gratuits (requêtes,
  neurons) sont ceux du compte entier.
- **La répétition, à jouer sur l'aperçu avec l'accord de l'éditeur** (premier déploiement
  d'un Worker, puis sa suppression) :
  1. `npm run deploy:chat:preview -- --accord <jour>` : le Worker `cestecritla-chat-preview`
     prend `beta.cestecritla.fr/api/gists` et `/api/chat`.
  2. Les deux adresses répondent comme avant (« local », « rien » ; champ inconnu 400 ; autre
     origine 403) ; `/api/bench` répond toujours par l'ancien Worker ; les pages n'ont pas
     bougé (comparaison fichier par fichier).
  3. **Qui a répondu** se lit dans le décompte de la plateforme, par Worker et par minute
     (`workersInvocationsAdaptive`, lecture seule — la méthode est essayée : elle montre les
     sondes de 15 h 17 UTC sous `cestecritla-preview`) : les envois vers les deux adresses
     doivent apparaître sous le nouveau nom, ceux vers `/api/bench` sous l'ancien.
  4. Le retrait : `npm run deploy:chat:preview -- --withdraw --accord <jour>` supprime ce
     Worker — la commande tire son nom de la configuration, elle ne peut pas en nommer un
     autre —, puis vérifier que les deux adresses reviennent à l'ancien, et que rien d'autre
     n'a changé.
  5. Un oui ou un non écrit ici ; si oui, `deployment_rehearsed_on` est daté.
- **Reste pour l'ouverture de l'aperçu (lot C11)** : le mode par hôte — ouvrir l'aperçu sans
  la production —, le secret du limiteur à poser sur le nouveau Worker (sans lui il se ferme :
  « local », « rien »), et les portes du §5.
