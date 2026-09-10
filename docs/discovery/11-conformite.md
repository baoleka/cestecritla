# 11 — Conformité : obligations, écrans, copies exactes (T9)

Livrable de l'étape T9 du plan (`PLAN-SESSION.md`), rédigé le **9 septembre 2026**. App « C'est écrit là » (`cestecritla.fr`, D10.2), corpus `d29c7422004ab27c` (D1.4), compte Cloudflare Free sans moyen de paiement (D0.2, D0.31). Pièces d'entrée : `design/strings.json` v0.2, `design/voice.md`, `data/stat-cards.json`, `scripts/silence.ts` + `scripts/silence.test.ts`, `docs/discovery/09-architecture.md` §6-§7, `prototypes/labo-plateforme/turnstile/README.md`, captures `captures/2026-09-09/conformite/` et `captures/2026-09-07/melenchon2027.fr_mentions-legales.txt`.

Statuts : **VÉRIFIÉ** = texte primaire lu aujourd'hui à l'URL citée, ou mesure faite aujourd'hui avec la commande citée ; **PROBABLE** = déduit d'un texte lu, d'une capture ou d'un raisonnement explicite ; **HYPOTHÈSE** = non tranché, méthode de levée indiquée. Rédigé par lecture des textes, pas par un juriste : la revue « juriste hostile » a été menée le 9 septembre 2026 et vit en **§19** (constats, sévérité, corrections, D9.15-D9.19).

**Aucun appel Workers AI dans cette étape : 0 neuron.** Cumul de session inchangé : 6 713,31 / 8 000 (D0.7). Rien n'est commité.

## 0. En dix lignes

1. **La mention IA n'est obligatoire que si le chat v2 existe.** Art. 50 § 1 vise le fournisseur d'un système d'IA conçu pour interagir directement avec des personnes ; en « sélection pure » (D6.3) le modèle ne rédige aucune phrase, donc le § 4 (texte généré publié pour informer le public) ne se déclenche pas. On affiche quand même la mention : c'est vrai, c'est un argument, et c'est D0.29.
2. **Trois variantes de mention, aucune retenue aujourd'hui** : `chat.ai_mention.v1` (104 car.), `v2` (104), `v3` (91). `voice.md` §4 donne encore les longueurs de la v0.1 (104 / 126 / 100) : à corriger.
3. **Le mot « IA » n'apparaît jamais sur une carte-concept** (D2.4) : la carte porte `concept.authorship.reviewed`, la méthode vit sur `about.ai_method`. C'est exactement l'exception de relecture humaine de l'art. 50 § 4.
4. **L'attribution CC BY-NC-SA 4.0 est due sur chaque page et sur chaque carte** : créditer, lier la licence, indiquer les modifications. Les trois obligations existent en chaînes (`attribution.full`, `attribution.card`, `attribution.short`, `attribution.unmodified`, `attribution.derivatives`). La clause NC interdit toute publicité dans l'app — elle converge avec L52-1.
5. **StatCards** : l'app n'est pas le premier diffuseur, elle relève de l'art. 11 al. 3 de la loi 77-808 (re-diffusion : organisme + date de première publication + média). `data/stat-cards.json` a l'organisme 47/48 et les dates 47/48, le commanditaire **3/48**, le média de première diffusion **0/48**, et **aucun champ** pour l'effectif, les questions et les marges d'erreur. « Devine le % » est retiré (D5.5).
6. **Mentions légales** : la LCEN post-SREN met l'obligation à l'**article 1-1**, pas à l'article 6. Le II permet à un éditeur non professionnel de ne publier que l'hébergeur, **à condition** d'avoir communiqué ses éléments d'identification à cet hébergeur. Cloudflare publie qu'il « might qualify as the origin hosting provider » pour Workers : l'hébergeur est **Cloudflare, Inc.**, PROBABLE.
7. **Opinions politiques = données sensibles (RGPD art. 9)** : la seule stratégie sûre est de n'avoir rien à protéger. La carte des journalisations (§6 de `09-architecture.md`) le tient ; la politique en dix lignes est ci-dessous en texte final, avec deux corrections (transfert hors UE, NEL).
8. **Silence électoral** : `scripts/silence.ts` gèle du **vendredi 00:00 Paris au dimanche 20:00 Paris**, une journée plus tôt que la lettre de L49, pour couvrir les électeurs d'outre-mer qui votent le samedi. **17 tests** passent (`npx tsx --test scripts/silence.test.ts`, remesuré le 10/9/2026 ; 14 le 9/9).
9. **L52-1 : zéro promotion payante à partir du 1er octobre 2026.** Un QR code imprimé sur un tract militant n'est pas de la publicité commerciale : il reste licite, sauf la veille et le jour du scrutin (L49 1°). La loi 2018-1202 ne vise plus que les très grandes plateformes au sens du DSA : hors périmètre, VÉRIFIÉ.
10. **Deux choses à couper, une à écrire** : couper NEL sur la zone (sinon le déclarer, `privacy.host_logs_nel` existe) ; couper l'attente du jeton Turnstile (jeton demandé en arrière-plan, réponse extractive pendant ce temps) ; écrire l'adresse de contact (`{contactEmail}`) et l'URL du dépôt (`{repoUrl}`), deux placeholders utilisés mais non déclarés dans `strings.json`.

## 1. Tableau de conformité

Une ligne par obligation. « Copie exacte » = la chaîne de `design/strings.json` v0.2 qui la porte ; une chaîne absente est signalée « à créer ». Toutes les URL ont été ouvertes le 9 septembre 2026.

> **Note de reproduction** : les chaînes sont citées ici avec des espaces ordinaires pour rester lisibles. Dans `design/strings.json`, l'espace qui précède « : ; ! ? » et celle qui suit « « » sont des espaces insécables U+00A0, insérées par script et vérifiées par `scripts/check-strings.test.ts` (`voice.md` §6, D3.6 : U+202F absent des sous-ensembles de polices).

| # | Obligation | Écran | Copie exacte (clé `strings.json`) | Source lue aujourd'hui | Statut |
|---|---|---|---|---|---|
| 1 | AI Act art. 50 § 1 — informer que l'on interagit avec une IA, avant la première interaction | Chat v2, état vide, au-dessus du champ de saisie | `chat.ai_mention.v1` / `.v2` / `.v3` (une seule sera retenue) | https://artificialintelligenceact.eu/article/50/ | VÉRIFIÉ (texte) / HYPOTHÈSE (variante) |
| 2 | AI Act art. 50 § 5 — information claire, distinguable, dès la première interaction, accessible | Chat v2 : badge par bulle générée + texte pour lecteur d'écran | `chat.ai_badge` = « IA · Mistral » ; `chat.ai_mention.sr` | même page | VÉRIFIÉ |
| 3 | AI Act art. 50 § 4 al. 2 — texte généré publié pour informer le public : exception de relecture humaine | Cartes-concept, FAQ, ripostes | `concept.authorship.reviewed` = « Rédigé par nous, relu par {reviewer} » ; `chat.human_reviewed_badge` = « Relu par un humain » | même page | VÉRIFIÉ (exception applicable) / PROBABLE (qualification « informer le public ») |
| 4 | Ne pas afficher de mention IA là où il n'y a pas d'IA (sincérité de la mention) | Mode extractif / dégradé | `degraded.badge` = « Réponse directement extraite du programme » | — (règle interne, `voice.md` §2.2) | VÉRIFIÉ |
| 5 | Aucun mot « IA » sur une carte-concept (D2.4) | Carte-concept | `about.ai_method` porte la méthode, la carte ne la porte pas | `decisions.md` D2.4 | DÉCISION |
| 6 | CC BY-NC-SA 4.0 — créditer l'œuvre | Chaque page (pied), chaque carte partagée | `attribution.full`, `attribution.card`, `attribution.short` | https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr | VÉRIFIÉ |
| 7 | CC BY-NC-SA 4.0 — lien vers la licence | Pied de page, page Licence | `attribution.license_link_text` + `attribution.link_text` | même page | VÉRIFIÉ |
| 8 | CC BY-NC-SA 4.0 — indiquer si des modifications ont été effectuées | Zone verbatim, page Licence | `attribution.unmodified` = « Extraits reproduits sans modification. » | même page | VÉRIFIÉ |
| 9 | CC BY-NC-SA 4.0 — partage dans les mêmes conditions | Page Licence, pied de carte | `attribution.derivatives`, `legal.license.derived` | même page | VÉRIFIÉ |
| 10 | CC BY-NC-SA 4.0 — pas d'utilisation commerciale | Toute l'app : aucune publicité, aucune promotion payante | `privacy.policy.01` (« aucune publicité ») | même page | VÉRIFIÉ |
| 11 | Loi 77-808 art. 11 al. 3 — re-diffusion d'un sondage : organisme, date de première publication, média | StatCard | `statcard.legal.no_sponsor` (45 cartes), `statcard.legal.full` (3 cartes), `statcard.legal.rediffusion` | https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000522846/ | VÉRIFIÉ |
| 12 | Loi 77-808 art. 2 6° — mention des marges d'erreur (reprise volontaire) | StatCard | `statcard.legal.margin` = « Tout sondage comporte une marge d'erreur. » | même page | VÉRIFIÉ (texte) / DÉCISION (reprise non exigée en re-diffusion) |
| 13 | Ne pas présenter comme un sondage ce qui n'en est pas un | StatCard `c13-s03-a02` (votation nucléaire) | `statcard.not_a_survey` | `data/stat-cards.json` (organisme et dates absents) | VÉRIFIÉ |
| 14 | Dire ce que la source ne donne pas | StatCard | `statcard.legal.missing`, `statcard.incomplete` | `data/stat-cards.json` `meta.legal_77_808_fr` | VÉRIFIÉ |
| 15 | Loi 77-808 art. 11 al. 1 — aucun sondage publié, diffusé ou commenté la veille et le jour du scrutin | Bandeau de silence, StatCards masquées | `silence.statcard` | même page Legifrance | VÉRIFIÉ |
| 16 | LCEN art. 1-1 II — éditeur non professionnel : ne publier que le nom, la dénomination et l'adresse de l'hébergeur | `/mentions-legales` | `legal.notice.editor`, `legal.notice.host_label`, `legal.notice.host` | https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614 | VÉRIFIÉ (texte) |
| 17 | LCEN art. 1-1 II — avoir communiqué à l'hébergeur ses éléments d'identification personnelle | Hors écran : compte Cloudflare | — | même article | PROBABLE (le compte Cloudflare porte nom et adresse e-mail ; « communiqué » non attesté par une pièce) |
| 18 | LCEN art. 1-1 III — droit de réponse adressé à l'hébergeur quand l'éditeur est anonyme | `/mentions-legales` | `legal.notice.reply_right` | même article | VÉRIFIÉ |
| 19 | LCEN — publier un moyen de contact | `/mentions-legales`, `/confidentialite` | `legal.notice.contact`, `about.contact_lead` (placeholder `{contactEmail}` **non déclaré**) | même article | VÉRIFIÉ (obligation) / HYPOTHÈSE (adresse non créée) |
| 20 | Identifier l'hébergeur réel de Workers | `/mentions-legales` | `legal.notice.host` = « Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis. » ; `legal.notice.host_report` | https://www.cloudflare.com/trust-hub/abuse-approach/ + https://www.cloudflare.com/website-terms/ | VÉRIFIÉ (entité, adresse) / PROBABLE (qualification d'hébergeur : « might qualify ») |
| 21 | RGPD art. 9 — ne pas traiter d'opinions politiques | Aucun écran : c'est l'architecture | `privacy.never.01` à `.09` | https://www.cnil.fr/fr/definition/donnee-sensible | VÉRIFIÉ (texte) / VÉRIFIÉ (architecture, `09-architecture.md` §6) |
| 22 | Exemption de consentement pour la mesure d'audience (CNIL) | `/confidentialite`, ligne 5 | `privacy.policy.05` | https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience (4/7/2025) | VÉRIFIÉ (conditions) / PROBABLE (Analytics Engine est côté serveur : pas un traceur au sens de l'art. 82) |
| 23 | Traceur « strictement nécessaire » : Turnstile | `/confidentialite`, ligne 6 ; écran chat | `privacy.policy.06`, `privacy.turnstile` | https://www.cloudflare.com/turnstile-privacy-policy/ (lue au labo, 9/9) | VÉRIFIÉ (0 cookie mesuré) / PROBABLE (qualification « strictement nécessaire ») |
| 24 | Déclarer le signalement d'erreurs réseau (NEL) tant qu'il n'est pas coupé | `/confidentialite` | `privacy.host_logs_nel` | en-têtes capturés : `captures/2026-09-09/labo-turnstile/headers-index.txt` | VÉRIFIÉ (en-tête observé) |
| 25 | Déclarer le transfert hors UE (Cloudflare, Inc. ; inférence Workers AI) | `/confidentialite`, ligne 7 | `privacy.policy.07` **à amender** (§6.4) | https://www.cloudflare.com/website-terms/ ; modèle : mentions légales melenchon2027.fr archivées le 7/9 | PROBABLE |
| 26 | Loi 2018-1202 → code électoral L163-1 (transparence des contenus promus) | Aucun | — | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037850602 | VÉRIFIÉ hors périmètre (ne vise que les très grandes plateformes au sens de l'art. 33 du DSA depuis le 17/2/2024) |
| 27 | Loi 2018-1202 → L163-2 (référé « fausses informations ») | Aucun écran : règle interne | — | https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039278631 | VÉRIFIÉ (texte) — l'app ne diffuse jamais « de manière artificielle ou automatisée et massive » |
| 28 | Marques : ne pas reprendre une marque antérieure | Wordmark, nom de domaine | `app.name`, `app.wordmark.line1/line2/compact` | `captures/2026-09-09/conformite/tmview-*.json` (TMview, 9/9 18:52 UTC) | PROBABLE (aucune marque identique ; statut juridique des dépôts absent de la capture) |
| 29 | Ne pas se présenter comme émanant de LFI | Pied de page, À propos | `independence.line`, `independence.about` ; aucun logo (D3.3) | `decisions.md` D0.14, D3.3 | DÉCISION |
| 30 | L52-1 — aucune publicité commerciale de propagande à partir du 1er octobre 2026 | Aucun achat de promotion ; règle d'exploitation | — (règle interne, à écrire dans le runbook) | https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070239/LEGISCTA000006148458/ | VÉRIFIÉ |
| 31 | L49 1° et 2° — veille et jour du scrutin : ni tract distribué, ni message de propagande diffusé | Bandeau de silence ; gel du partage, du chat, des jeux ; lecture maintenue | `silence.banner`, `silence.reason`, `silence.share`, `silence.chat`, `silence.daily`, `silence.reopen` | même page Legifrance | VÉRIFIÉ (texte) / DÉCISION (gel partiel, D0.24) |
| 32 | Bornes du gel calculées, testées, pilotables | Client et Worker | `{reopenTime}` via `formatReopenTimeFr()` | `scripts/silence.ts`, `scripts/silence.test.ts` — **17 tests** passés le 10/9 (14 le 9/9) | VÉRIFIÉ |
| 33 | CTA inscription sur les listes électorales | Écrans de fin de parcours | `cta.register_to_vote`, `cta.register_deadline`, `cta.register_url`, `cta.check_registration_url` | https://www.service-public.gouv.fr/particuliers/vosdroits/F1961 (vérifié le 28/11/2025) + https://www.service-public.gouv.fr/particuliers/actualites/A15053 (2/7/2026) | PROBABLE (règle du 6e vendredi VÉRIFIÉE ; la date du 12 mars 2027 est calculée, pas publiée) |
| 34 | Licence du code | `/licence`, dépôt | `legal.license.code` (placeholder `{repoUrl}` **non déclaré**) | `LICENSE` (MIT), D1.11 | DÉCISION |
| 35 | Licence des polices | `/licence` | `legal.license.fonts` | `design/fonts/OFL-*.txt` | VÉRIFIÉ |
| 36 | Ne pas reproduire la Désintox de LFI | Riposte, refus | `legal.license.desintox`, `refusal.desintox_link`, `riposte.desintox_link` | `data/desintox.json` `meta` (D1.5) | HYPOTHÈSE (licence de la Désintox non lue) |
| 37 | Anonymat du titulaire du `.fr` | Whois | `legal.notice.domain` | https://www.afnic.fr/en/observatory-and-resources/expert-papers/personal-data-are-published-in-the-whois-online-directory-is-this-normal/ | VÉRIFIÉ (diffusion restreinte par défaut pour une personne physique) |
| 38 | Promesse « aucun compte, aucun cookie de suivi » tenue sur tous les écrans | Écran 0 par lien, `/confidentialite` | `privacy.no_account`, `home.link.reading_time` | `09-architecture.md` §6 | VÉRIFIÉ |
| 39 | Ne jamais faire attendre une personne derrière un jeton anti-robot | Écran chat | `degraded.badge` pendant l'attente ; aucune chaîne d'attente à créer | mesures utilisateur 9/9 : 13 870 ms et 5 973 ms (`01-faits.md`) | VÉRIFIÉ (mesures) / DÉCISION (règle §14) |
| 40 | Aucun disclaimer de contenu (D0.1) | Partout | Interdits : « peut », « ne saurait », « à titre indicatif », « n'engage » | `voice.md` §3 | DÉCISION |

## 2. AI Act (règlement (UE) 2024/1689), article 50

### 2.1 Ce que le texte dit, lu aujourd'hui

Source : https://artificialintelligenceact.eu/article/50/ et https://artificialintelligenceact.eu/implementation-timeline/ (page mise à jour le 31 août 2026), lues le 9 septembre 2026.

| Fait | Statut |
|---|---|
| L'art. 50 s'applique depuis le **2 août 2026** (« The remainder of the AI Act starts to apply »), donc avant tout lancement. | VÉRIFIÉ |
| § 1 : « **Providers** shall ensure that AI systems intended to interact directly with natural persons are designed and developed in such a way that the natural persons concerned are informed that they are interacting with an AI system, unless this is obvious from the point of view of a natural person who is reasonably well-informed, observant and circumspect ». | VÉRIFIÉ |
| § 4 al. 2 : « **Deployers** of an AI system that generates or manipulates text which is published with the purpose of informing the public on matters of public interest shall disclose that the text has been artificially generated or manipulated. This obligation shall not apply […] where the AI-generated content has undergone a process of human review or editorial control and where a natural or legal person holds editorial responsibility for the publication of the content. » | VÉRIFIÉ |
| § 5 : « The information referred to in paragraphs 1 to 4 shall be provided to the natural persons concerned in a clear and distinguishable manner at the latest at the time of the first interaction or exposure. The information shall conform to the applicable accessibility requirements. » | VÉRIFIÉ |
| La page « implementation timeline » ne mentionne **aucun** « Digital Omnibus » qui décalerait ou modifierait l'art. 50 ; elle ajoute seulement un délai au 2 décembre 2026 pour l'art. 50 § 2 (marquage machine-readable des sorties génératives) sur les systèmes mis sur le marché avant le 2 août 2026. | VÉRIFIÉ (absence de mention à la date de lecture) — requalifie l'HYPOTHÈSE « Digital Omnibus » de `voice.md` §2.1 en **PROBABLE (sans effet connu)** |

### 2.2 Qui est qui, dans notre cas

- **Fournisseur du modèle** : Mistral ; **fournisseur de l'infrastructure d'inférence** : Cloudflare (Workers AI). Nous sommes le **déployeur**.
- Mais nous mettons en service, sous notre propre nom, un *système* d'IA conçu pour interagir directement avec des personnes (le chat). La lecture prudente est que le § 1 nous vise aussi. **PROBABLE.**
- Le § 4 al. 2, lui, **ne se déclenche pas** dans le contrat « sélection pure » (D6.3) : le modèle renvoie `{cited_ids, liant_kind, hors_programme, glossary_term}` et **aucune phrase**. Le texte affiché est du verbatim du programme plus des chaînes fixes de `design/strings.json`, écrites et relues par un humain qui en assume la responsabilité éditoriale. Aucun texte n'est « artificially generated ». **VÉRIFIÉ sur le contrat, PROBABLE sur la qualification.**
- Conséquence lisible : **on affiche la mention parce qu'elle est vraie et parce que c'est D0.29, pas parce qu'un texte généré nous y oblige.** Cette nuance protège la mention contre la dérive vers le disclaimer (D0.1).
- **Si la porte D6.9 se referme sur « extractif pur »** (le bench v2 donne p95 = 4 159 ms contre < 3 000 ms exigés, `eval/results-v2.md` §1), il n'y a plus d'IA à l'exécution : l'art. 50 n'a plus de déclencheur dans l'app, `chat.ai_mention.*` sort des écrans, `about.ai_method` reste (le contenu pré-rédigé a pu être assisté, puis relu : art. 50 § 4, exception). **Le tableau §1 lignes 1 et 2 est donc conditionnel au chat v2.**

### 2.3 Les trois variantes à juger

Longueurs recomptées sur `design/strings.json` v0.2 le 9/9/2026 (`voice.md` §4 donne encore celles de la v0.1 : **à corriger**).

| Clé | Texte exact | Car. | Angle | Emplacement prévu |
|---|---|---:|---|---|
| `chat.ai_mention.v1` | Réponses assemblées par une IA française (Mistral, hébergée chez Cloudflare) à partir du texte officiel. | 104 | Mécanisme | Une ligne sous le titre du chat |
| `chat.ai_mention.v2` | Les passages sont choisis par Mistral, une IA française hébergée chez Cloudflare. Elle ne les écrit pas. | 104 | Contrat (« elle ne les écrit pas ») | Bulle d'accueil, avant le champ |
| `chat.ai_mention.v3` | Mistral, une IA française hébergée chez Cloudflare, retrouve le passage exact du programme. | 91 | Bénéfice | Sous-titre de l'écran chat |

Fixes, hors vote : `chat.ai_badge` = « IA · Mistral » (12 car.) sur chaque bulle générée ; `chat.ai_mention.sr` (92 car.) pour les lecteurs d'écran (§ 5, « accessibility requirements ») ; `chat.human_reviewed_badge` sur une réponse servie par la FAQ ; `degraded.badge` en extractif.

Protocole de jugement (phase suivante, panel de 5 juges dont l'adversaire chasseur de captures) : oui/non par variante sur (a) « ça se lit comme une excuse ou une réserve ? » (attendu : **non**) ; (b) « en moins de trois secondes, tu as compris que tu parles à une IA ? » ; (c) « tu as retenu le nom Mistral ? » ; (d) « ça tient sur deux lignes à 390 px en Public Sans 14 px ? » (mesuré au navigateur) ; (e) « tu enverrais une capture de cet écran sans gêne ? » (D0.32). Seuil : ≥ 4/5 juges « non » en (a) et « oui » en (b), (c), (e). La gagnante devient `chat.ai_mention` ; les deux autres restent en KV comme wording de secours (D7.10).

Test de tri d'une phrase (`voice.md` §3) : un disclaimer parle de ce qui pourrait être faux ; une mention parle de comment ça marche ; la ligne d'indépendance parle de qui on est. Toute phrase contenant « peut », « ne saurait », « à titre indicatif » ou « n'engage » sort.

## 3. Attribution CC BY-NC-SA 4.0

### 3.1 La licence de la source

Les mentions légales de `melenchon2027.fr`, archivées le 7 septembre 2026 (`captures/2026-09-07/melenchon2027.fr_mentions-legales.txt`), disent : « Sauf mention contraire, tous les textes de ce site sont protégés par la licence Creative Commons Attribution – Pas d'Utilisation Commerciale – Partage dans les Mêmes Conditions 4.0 International ». Éditeur : La France insoumise, association loi de 1901, 25 passage Dubail, 75010 Paris ; directeur de la publication : Maxime Charpentier. **VÉRIFIÉ (capture du 7/9).**

Le deed FR (https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr, lu le 9/9/2026) impose trois choses cumulatives, plus une interdiction :

1. **Attribution** — « Vous devez créditer l'Œuvre, intégrer un lien vers la licence et indiquer si des modifications ont été effectuées » ;
2. **Pas d'Utilisation Commerciale** — « Vous n'êtes pas autorisé à faire un usage commercial de cette Oeuvre » ;
3. **Partage dans les Mêmes Conditions** — « vous devez diffuser l'Oeuvre modifiée dans les même conditions » ;
4. **Pas de restrictions complémentaires** — aucune mesure technique ni condition légale qui restreindrait l'usage par autrui.

### 3.2 Où l'attribution est posée

| Surface | Chaîne | Texte exact |
|---|---|---|
| Pied de chaque page | `attribution.full` | Texte du programme : La France insoumise – L'Avenir en commun. Licence CC BY-NC-SA 4.0. |
| Bande de signature d'une image de partage (D3.8) | `attribution.card` | Texte : La France insoumise – L'Avenir en commun (CC BY-NC-SA 4.0) |
| Pied de carte-concept | `attribution.short` | La France insoumise – L'Avenir en commun · CC BY-NC-SA 4.0 |
| Lien vers l'œuvre | `attribution.link_text` | L'Avenir en commun, édition 2025 → https://melenchon2027.fr/programme2025/livre/ |
| Lien vers la licence | `attribution.license_link_text` | Licence CC BY-NC-SA 4.0 → https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr |
| Indication de modification | `attribution.unmodified` | Extraits reproduits sans modification. |
| Partage à l'identique | `attribution.derivatives` / `legal.license.derived` | Nos explications, cartes et images sont sous la même licence. |
| Carte de jeu (deux lignes, D5.8 règle 3) | `play.card.attribution_1` + `play.card.attribution_2` | Texte : La France insoumise – L'Avenir en commun, CC BY-NC-SA 4.0 / Carte : C'est écrit là, projet militant indépendant |

**Trois règles de rendu à tenir** (à porter dans le composant, pas seulement dans les chaînes) :

- une image de partage sans texte lisible d'attribution n'est pas conforme : la bande de signature est **dans le PNG**, pas seulement dans la page qui l'entoure ;
- `attribution.unmodified` n'est vraie que dans la zone verbatim. Une carte-concept mélange verbatim et reformulation : elle porte `attribution.short` **et** l'étiquette `concept.label.verbatim` sur la seule zone citée (D3.2) ;
- la clause NC vaut aussi pour nous : **aucune publicité, aucune promotion payante, aucun contenu sponsorisé, jamais** — ce qui recoupe exactement l'interdiction de L52-1 (§9) et rend la règle facile à tenir : elle n'a pas de date de début.

**Point ouvert** : la clause « Partage dans les Mêmes Conditions » s'applique aux œuvres **dérivées**. Le code de l'app n'est pas une œuvre dérivée du programme (MIT, D1.11) ; `data/` et les dérivés textuels le sont (CC BY-NC-SA, `data/LICENSE`). La frontière « index de recherche construit à partir du texte » est PROBABLE et vaut d'être écrite noir sur blanc dans `/licence`.

## 4. StatCard et loi n° 77-808 du 19 juillet 1977

### 4.1 Les trois articles, lus aujourd'hui

Source : https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000522846/ (page « en vigueur au 09 septembre 2026 »), lue le 9 septembre 2026.

| Article | Ce qu'il dit | Statut |
|---|---|---|
| **Art. 1** | « Un sondage est, quelle que soit sa dénomination, une enquête statistique visant à donner une indication quantitative, à une date déterminée, des opinions, souhaits, attitudes ou comportements d'une population par l'interrogation d'un échantillon. » La loi régit les sondages publiés, diffusés ou rendus publics sur le territoire national portant sur des sujets liés, directement ou indirectement, au débat électoral. | VÉRIFIÉ |
| **Art. 2** | La **première** publication ou diffusion est accompagnée de huit indications : 1° le nom de l'organisme ; 2° le nom et la qualité du commanditaire (et de l'acheteur s'il diffère) ; 3° le nombre de personnes interrogées ; 4° la ou les dates d'interrogation ; 5° le texte intégral des questions ; 6° une mention précisant que tout sondage est affecté de marges d'erreur ; 7° les marges d'erreur des résultats publiés ; 8° la mention du droit de consulter la notice. | VÉRIFIÉ |
| **Art. 11** | « En cas d'élections générales et de référendum, la veille et le jour de chaque scrutin, aucun sondage électoral ne peut faire l'objet, par quelque moyen que ce soit, d'une publication, d'une diffusion ou d'un commentaire. » Pour la présidentielle, l'interdiction court **à compter du samedi précédant le scrutin à zéro heure sur l'ensemble du territoire national** jusqu'à la fermeture du dernier bureau de vote. Exception : « Cette interdiction ne fait obstacle ni à la poursuite de la diffusion de sondages publiés avant la veille de chaque scrutin ni au commentaire de ces sondages, à condition que soient indiqués la date de première publication ou diffusion, le média qui les a publiés ou diffusés et l'organisme qui les a réalisés. » | VÉRIFIÉ |

**Le régime qui nous concerne est celui de la re-diffusion.** L'app n'est pas le premier diffuseur : le livre l'est. Les trois indications de l'art. 11 al. 3 sont donc le socle du gabarit — **organisme, date de première publication, média** — et non les huit indications de l'art. 2, qui pèsent sur l'organisme au moment de la première publication. Lecture prudente conservée : les 48 encadrés « À savoir » entrent dans le champ de l'art. 1 (sondages d'opinion sur des mesures : lien indirect avec le débat électoral) — **PROBABLE**.

### 4.2 Ce que `data/stat-cards.json` contient, et ce qui manque

Relevé mécanique du 9/9/2026 sur `data/stat-cards.json` (48 cartes + 6 statistiques en paragraphe) :

| Indication de l'art. 2 | Champ du fichier | Présent | Manquant |
|---|---|---:|---:|
| 1° organisme | `legal_77_808.organisme` / `institute` | **47 / 48** | 1 (`c13-s03-a02`) |
| 2° commanditaire | `legal_77_808.commanditaire` | **3 / 48** | 45 |
| 3° nombre de personnes interrogées | *aucun champ* | **0 / 48** | 48 |
| 4° dates d'interrogation | `legal_77_808.dates` / `survey_date_text` | **47 / 48** | 1 |
| 5° texte intégral des questions | *aucun champ* | **0 / 48** | 48 |
| 6° mention des marges d'erreur | *aucun champ* (phrase fixe de l'app) | **0 / 48** | 48 |
| 7° marges d'erreur | *aucun champ* | **0 / 48** | 48 |
| 8° droit de consulter la notice | *aucun champ* | **0 / 48** | 48 |
| Média de première diffusion (art. 11) | `legal_77_808.media_premiere_diffusion` | **0 / 48** | 48 |

Les trois seules cartes qui portent un commanditaire sont des Ifop pour *l'Humanité* : `c6-s05-a04` (ISF, mai 2021), `c7-s01-a01` (services publics, mai 2021), `c9-s02-a01` (contreparties aux aides publiques, septembre 2020). Instituts : Harris Interactive 37, Ifop 9, YouGov 1, inconnu 1. Années : 2018 ×2, 2019 ×3, 2020 ×5, **2021 ×33**, 2022 ×1, 2024 ×3, inconnue ×1.

Le « média de première diffusion » manque partout, mais il est **reconstituable et vrai** : le média qui a publié la version que nous re-diffusons est *L'Avenir en commun, édition 2025*, avec le chapitre et le lien vers l'encadré d'origine. C'est ce que fait `statcard.legal.rediffusion`. Ce que le livre ne donne pas (l'organe de presse qui a publié le sondage en premier, s'il existe) n'est **jamais deviné**.

### 4.3 Le gabarit rendu

Copies exactes de `design/strings.json` v0.2 :

| Cas | Clé | Texte |
|---|---|---|
| Commanditaire connu (3 cartes) | `statcard.legal.full` | Sondage {organisation}, {dates}. Commanditaire : {sponsor}. Publié dans L'Avenir en commun 2025, {chapter}. |
| **Commanditaire inconnu (45 cartes)** | `statcard.legal.no_sponsor` | Sondage {organisation}, {dates}. **Commanditaire non précisé dans le livre.** Publié dans L'Avenir en commun 2025, {chapter}. |
| Rappel du régime de re-diffusion | `statcard.legal.rediffusion` | Repris de L'Avenir en commun 2025, {chapter}, où ce sondage était publié avant le scrutin. |
| Marge d'erreur | `statcard.legal.margin` | Tout sondage comporte une marge d'erreur. |
| Ce que la source ne donne pas | `statcard.legal.missing` | Le livre ne donne ni le nombre de personnes interrogées, ni les questions, ni la marge d'erreur. |
| Signal court | `statcard.incomplete` | Mentions légales incomplètes dans la source. |
| Pas un sondage (`c13-s03-a02`) | `statcard.not_a_survey` | Chiffre publié dans le livre. Ce n'est pas un sondage. |
| Lien vers l'encadré | `statcard.legal.source_link` | Voir l'encadré dans le programme |

Cinq règles de rendu :

1. **On ne devine jamais le commanditaire.** Que LFI ait commandé ces enquêtes est une HYPOTHÈSE, pas une mention. La phrase « Commanditaire non précisé dans le livre » est la vérité, et elle est plus solide qu'un silence.
2. **La date est aussi visible que le chiffre**, jamais derrière un tap (D0.32 : « chiffres ou sondages périmés mis en avant » est éliminatoire ; une date cachée l'est davantage). `statcard.toggle_show` porte déjà la date dans son libellé : « Voir le chiffre ({dates}) ».
3. **Aucune carte statistique sur une image de partage** (D5.4, D5.8 règle 8) : le contexte légal ne survit pas au recadrage d'une capture.
4. **« Devine le % » est retiré** (D5.5, confirmée par l'utilisateur le 9/9) : 33 des 47 cartes datées sont de 2021, et jouer avec un chiffre de sondage serait un « commentaire » au sens de l'art. 11. Le geste curseur reste en réserve sous le nom « Devine le chiffre », sur des chiffres qui ne sont pas des sondages.
5. **`statcard.legal.sample` (« {sample} personnes interrogées. ») n'a aucune donnée pour l'alimenter** : aucun champ `sample` n'existe dans `data/stat-cards.json`. À supprimer de `strings.json` v0.3, ou à conserver explicitement pour un futur sidecar `stat-cards-legal.json` renseigné à la main depuis les notices de la Commission des sondages.

Rendu type (chapitre 12, section 1) :

> **83 %** des Français sont d'accord pour interdire de prélever chaque année plus de matières premières que la Terre est capable de reconstituer en un an.
> Sondage Harris Interactive, juillet 2021. Commanditaire non précisé dans le livre. Publié dans L'Avenir en commun 2025, chapitre 12. Tout sondage comporte une marge d'erreur.
> Voir l'encadré dans le programme · La France insoumise – L'Avenir en commun · CC BY-NC-SA 4.0

## 5. Mentions légales : LCEN, éditeur non professionnel (D0.15)

### 5.1 Ce que le texte dit, lu aujourd'hui

Attention : depuis la loi SREN (2024), l'obligation **n'est plus à l'article 6-III-2 mais à l'article 1-1** de la loi n° 2004-575 du 21 juin 2004 (version en vigueur depuis le 23 mai 2024). Source : https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614, lue le 9 septembre 2026.

| Paragraphe | Contenu | Statut |
|---|---|---|
| **I** | Ce qu'un éditeur **professionnel** doit tenir à la disposition du public : pour une personne physique, nom, prénoms, domicile et numéro de téléphone ; pour une personne morale, dénomination ou raison sociale et siège social ; plus le nom du directeur ou du codirecteur de la publication, et **« le nom, la dénomination ou la raison sociale, l'adresse et le numéro de téléphone du fournisseur de services d'hébergement »**. | VÉRIFIÉ |
| **II** | « Les personnes éditant à titre non professionnel un service de communication au public en ligne peuvent ne tenir à la disposition du public, **pour préserver leur anonymat**, que le nom, la dénomination ou la raison sociale et l'adresse du fournisseur de services d'hébergement, **sous réserve d'avoir communiqué à ce fournisseur les éléments d'identification personnelle mentionnés au I** du présent article. » Les hébergeurs sont assujettis au **secret professionnel** (art. 226-13 et 226-14 du code pénal), non opposable à l'autorité judiciaire. | VÉRIFIÉ |
| **III** | Droit de réponse : « La demande d'exercice du droit de réponse est adressée au directeur de la publication ou, **lorsque la personne éditant à titre non professionnel a conservé l'anonymat, au fournisseur de services d'hébergement, qui la transmet sans délai au directeur de la publication.** » | VÉRIFIÉ |

**Ce qui doit donc être publié, exactement** : le nom, la dénomination ou la raison sociale **et l'adresse de l'hébergeur**. Le numéro de téléphone de l'hébergeur figure au I ; le II ne le reprend pas — on peut le donner, ce n'est pas exigé de l'éditeur anonyme. Rien d'autre n'est dû. Une adresse de contact n'est pas exigée par le II, mais elle est indispensable en pratique (droit de réponse, signalement d'erreur, contact LFI) : elle passe par Cloudflare Email Routing (D0.15).

**Ce que l'hébergeur doit détenir** : les éléments d'identification personnelle du I, c'est-à-dire nom, prénoms, domicile et numéro de téléphone de la personne physique. Le II fait de cette communication une **condition** de l'anonymat.

### 5.2 Qui est l'hébergeur ici

| Fait | Source lue le 9/9/2026 | Statut |
|---|---|---|
| Cloudflare distingue ses produits : pour Workers/Pages, « Cloudflare might qualify as the **origin hosting provider** » du contenu ; pour le CDN/proxy, « Cloudflare does not host content through those services, and we cannot remove content from the Internet that we do not host ». | https://www.cloudflare.com/trust-hub/abuse-approach/ | VÉRIFIÉ (texte) |
| L'entité publiée est **Cloudflare, Inc., 101 Townsend St, San Francisco, California 94107** ; la page ne désigne aucune entité EEE distincte pour les clients européens. Dernière mise à jour affichée : 1er août 2025. | https://www.cloudflare.com/website-terms/ | VÉRIFIÉ |
| Signalement de contenu : https://abuse.cloudflare.com/ | même page | VÉRIFIÉ |
| Cloudflare est donc l'« hébergeur » au sens de la LCEN pour une app servie par Workers + Static Assets. | déduction du « might qualify » | **PROBABLE** |
| Cloudflare détient nos éléments d'identification par le compte (nom, adresse e-mail). Que cela vaille « avoir communiqué à ce fournisseur les éléments d'identification personnelle mentionnés au I » (qui inclut **domicile et téléphone**) n'est pas établi. | compte Cloudflare Free, `outillage.md` #4-5 | **PROBABLE, avec une réserve à lever** |

**Action concrète** : compléter le profil du compte Cloudflare avec l'adresse postale et le téléphone, et archiver une capture datée du profil dans `captures/`. Sans cela, la condition du II n'est pas prouvée, et l'anonymat repose sur une lecture optimiste. C'est le seul point de ce document où un geste de cinq minutes change un statut PROBABLE en VÉRIFIÉ.

### 5.3 Les copies exactes

`design/strings.json` v0.2 porte déjà la bonne référence d'article :

| Clé | Texte |
|---|---|
| `legal.notice.title` | Mentions légales |
| `legal.notice.editor` | Site édité à titre non professionnel par une personne physique, hors des équipes de campagne. La loi du 21 juin 2004 (article 1-1, II) permet de ne publier que l'hébergeur. L'hébergeur détient l'identité de l'éditeur. |
| `legal.notice.host_label` | Hébergeur |
| `legal.notice.host` | Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis. |
| `legal.notice.host_report` | Signaler un contenu à l'hébergeur : abuse.cloudflare.com |
| `legal.notice.reply_right` | Droit de réponse (loi du 21 juin 2004, article 1-1, III) : demande à adresser à l'hébergeur. Il la transmet au directeur de la publication. |
| `legal.notice.contact` | Nous écrire : {contactEmail} |
| `legal.notice.domain` | Nom de domaine : cestecritla.fr, déposé auprès de l'AFNIC, données du titulaire non publiées. |

Deux corrections proposées :

- `legal.notice.host` : l'adresse publiée par Cloudflare aujourd'hui s'écrit « 101 Townsend St » ; la chaîne écrit « 101 Townsend Street ». Aligner sur la source (**mineur, mais c'est une mention légale**).
- `legal.notice.reply_right` dit vrai mais est incomplète : le directeur de la publication n'est nommé nulle part. Pour un éditeur anonyme, c'est cohérent (il *est* le directeur de la publication) ; il faut juste que la phrase ne laisse pas croire qu'un tiers existe. Formulation proposée : « Droit de réponse (loi du 21 juin 2004, article 1-1, III) : adresse ta demande à l'hébergeur. Il la transmet sans délai. »

### 5.4 Le domaine

L'AFNIC place les personnes physiques en **diffusion restreinte par défaut** dans le Whois : « If they select "natural person", the contact details of the holder are protected by confidentiality by default » (https://www.afnic.fr/en/observatory-and-resources/expert-papers/personal-data-are-published-in-the-whois-online-directory-is-this-normal/, lue le 9/9/2026 ; page datée du 22/4/2021). La levée se fait sur demande motivée à l'AFNIC ou sur réquisition judiciaire. Le RDAP du 9/9 donne « Ano Nymous » comme titulaire (D10.2) : **cohérent, VÉRIFIÉ**.

Attention : la diffusion restreinte protège la publication, pas la détention. Le bureau d'enregistrement (OVHcloud) et l'AFNIC détiennent l'identité réelle, qui doit être exacte.

### 5.5 Le risque « l'app devient virale » et le plan B association 1901

Le régime de l'art. 1-1 II ne dépend pas de l'audience : il dépend du caractère **non professionnel** de l'édition. Ce qui change avec le succès n'est pas le droit applicable, mais l'exposition.

| Déclencheur | Ce qu'il change | Réponse |
|---|---|---|
| Recettes, dons, sponsoring, vente d'un service | L'édition cesse d'être « à titre non professionnel » → identité complète à publier (I) | **Aucun revenu, jamais** (D0.2 : coût 0 €, aucun moyen de paiement). Règle absolue : ne pas ouvrir de cagnotte, même pour payer le domaine. |
| Signalements, plaintes, droit de réponse répétés | Cloudflare doit transmettre ; le secret professionnel n'est pas opposable à l'autorité judiciaire | Répondre vite et publiquement via `/exactitude` (D6.6) ; conserver les échanges hors du dépôt public |
| L'app est traitée comme un support de campagne | Requalification en dépense électorale (L52-8, **et surtout L52-12** : tout avantage en nature entre dans le compte de campagne — **le statut de personne physique ne protège pas de cela**, seule l'interdiction de l'al. 1 vise les personnes morales) | `independence.line`, `independence.about`, `independence.unofficial`, aucun logo (D3.3), aucun lien de don depuis l'app hors CTA officiels (D0.16). **Ce qui protège réellement, en quatre conditions (10/9, panel rouge T12)** : (1) corpus et app **publics, gratuits, non exclusifs, disponibles à tous** ; (2) **rien n'est fait à la demande** d'une équipe de campagne ; (3) **aucune contrepartie acceptée** — ni mention, ni lien, ni accès, ni matériel ; (4) tout échange avec une équipe de campagne **archivé hors du dépôt public**. Interdit dur : une demande de fonctionnalité, d'URL ou de redirection venue d'une équipe de campagne **est refusée** |
| Audience élevée + attaque coordonnée | Un seul individu exposé | ~~**Association loi 1901**~~ — **corrigé le 10/9/2026 (panel rouge T12) : §19.4 D9.18 l'interdit entre le 1/10/2026 et le 2/5/2027 (L52-8 al. 1), et cette ligne demandait exactement le contraire.** Sortie réelle : **publication de l'identité de la personne physique** (art. 1-1 I). Aucune personne morale avant le 3 mai 2027 |

**Seuils, corrigés le 10/9/2026 (panel rouge T12).** Les trois seuils restent — plus de 50 000 visiteurs sur sept jours glissants, **ou** une première mise en demeure, **ou** un article de presse nationale nommant l'app — mais ils **ne déclenchent plus une bascule**, ils déclenchent une **décision consciente**. Ce qu'ils ouvrent, entre le 1/10/2026 et le 2/5/2027, n'est pas la création d'une association (D9.18 l'interdit, L52-8 al. 1, et le dommage serait sur le **compte de campagne du candidat**, pas chez nous) mais la **publication de l'identité de la personne physique** (art. 1-1 I). La création d'une association redevient une option **après le 3 mai 2027**, et seulement là.

## 6. RGPD art. 9, CNIL, et la politique de confidentialité en dix lignes

### 6.1 Pourquoi zéro donnée est la seule stratégie

La CNIL (https://www.cnil.fr/fr/definition/donnee-sensible, lue le 9/9/2026) range parmi les données sensibles de l'art. 9 du RGPD celles qui révèlent « l'origine raciale ou ethnique, **les opinions politiques**, les convictions religieuses ou philosophiques ou l'appartenance syndicale […] », et rappelle que « le règlement européen **interdit** de recueillir ou d'utiliser ces données, sauf, notamment, dans les cas suivants » (consentement explicite, données manifestement rendues publiques, etc.). **VÉRIFIÉ.**

Une question tapée dans un chat sur *L'Avenir en commun* révèle une opinion politique, ou au minimum un intérêt, dès qu'elle est rattachable à une personne. Le consentement explicite serait juridiquement possible mais politiquement absurde pour une app militante : la bonne réponse est de **ne pas être en mesure de rattacher**. C'est ce que fait l'architecture (D0.22, D7.8, D7.9, `09-architecture.md` §6) : pas de compte, pas d'IP journalisée, pas d'identifiant de session, pas de texte de question stocké, une empreinte de mots sans la question, un compteur de mots inconnus sans la phrase, des événements agrégés échantillonnés.

### 6.2 La mesure d'audience

La CNIL (https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience, page du 4 juillet 2025, lue le 9/9/2026) exempte de consentement les traceurs de mesure d'audience qui sont « utilisés pour une finalité **strictement limitée à la seule mesure de l'audience** » pour le compte exclusif de l'éditeur, produisent des statistiques anonymes, et ne « conduis[ent] à un recoupement des données avec d'autres traitements ou à ce que les données non anonymes soient transmises à des tiers » ; elle recommande une durée de vie de traceur de 13 mois et une conservation ≤ 25 mois. **VÉRIFIÉ.**

**Corrigé le 10/9/2026 (panel rouge T12).** La version antérieure de ce paragraphe disait : « Analytics Engine écrit côté serveur, sans rien lire ni écrire sur le terminal — il n'y a donc pas de traceur au sens de l'art. 82. » **C'est faux sur un point précis** : la chaîne de mesure **écrit bien sur le terminal, avant tout geste** — `sessionStorage` `aec.s` pour le dédoublonnage des événements et `aec.s.sampled` pour le tirage d'échantillonnage à 10 % (`07-mecaniques.md` §1 ; `12-positionnement-lancement.md` l. 672, 840, 873 ; `prompt-final.md` §8). L'art. 82 vise **toute inscription d'informations** dans l'équipement terminal, pas seulement les cookies, et la finalité ici est la **mesure d'audience**, pas la fourniture du service demandé. Aggravant : cette clé **ne figurait pas** dans la carte des journalisations de `09-architecture.md` §6 — la pièce contre laquelle chaque ligne de `/confidentialite` est censée être confrontée omettait la seule écriture terminale de la v1.

**Ce que nous écrivons désormais, et qui est vrai** : nous **revendiquons expressément l'exemption CNIL de mesure d'audience**, et les cinq conditions sont tenues — (1) finalité **strictement limitée** à la mesure d'audience ; (2) **pour notre seul compte** ; (3) statistiques **anonymes** ; (4) **aucun recoupement** avec un autre traitement ; (5) **aucune transmission à un tiers**. Durée : la clé vit le temps de l'onglet (`sessionStorage`), très en deçà des 13 mois recommandés ; les données agrégées vivent 3 mois (rétention Analytics Engine non réglable), sous les 25 mois recommandés. **PROBABLE** sur la qualification (exemption revendiquée, conditions listées), **VÉRIFIÉ** sur les faits techniques.

Trois gestes en découlent : ajouter la ligne manquante à la carte `09-architecture.md` §6 (« Client (mesure) | `aec.s`, `aec.s.sampled` | `sessionStorage` first-party | durée de l'onglet | rien à éteindre, à déclarer | VÉRIFIÉ ») ; compléter `privacy.policy.05` (« … Sans adresse IP, sans identifiant, sans cookie : une clé de session dans ton navigateur, effacée en fermant l'onglet. ») ; et écrire le seul test qui rend la ligne vraie — un test Playwright qui vérifie qu'**aucune autre clé que `aec.s*` n'est écrite avant un geste**.

### 6.2 bis L'information des personnes (RGPD art. 13) — H-CNF-20, ouverte le 10/9/2026

L'obligation d'information de l'article 13 était **absente du dossier entier** : `grep -i "article 13|droit d'accès|réclamation|responsable du traitement|base légale"` sur `docs/discovery/*.md` ne rendait que le constat E1. La page `/confidentialite` — dix lignes plus « ce que l'app ne garde pas » — ne donne ni l'identité et les coordonnées du **responsable de traitement** (13(1)(a)), ni la **base légale** de la mesure d'audience (13(1)(c)), ni la **durée** de conservation des journaux d'hébergeur (13(2)(a) — la carte §6 écrit « conservés par Cloudflare selon sa politique », c'est-à-dire une durée inconnue), ni les **droits** d'accès, d'opposition et d'effacement (13(2)(b)), ni le **droit de réclamation auprès de la CNIL** (13(2)(d)).

La stratégie « rien à protéger » ne suffit plus depuis le constat **E1**, qui admet qu'il existe **chez le sous-traitant** un historique de lecture rattaché à une IP sur des URL parlantes (`/mot/`, `/r/`, `/c/`), c'est-à-dire sur des sujets révélant une opinion politique. À partir de là, il y a un responsable de traitement, et l'art. 13 s'applique.

Quatre chaînes créées en `strings.json` v0.4, **sous** les dix lignes et non dedans, pour ne pas casser la lisibilité : `privacy.controller`, `privacy.retention_host`, `privacy.rights`, `privacy.cnil`. Deux points restent ouverts et sont pour l'utilisateur : (a) **lire le guide CNIL de la communication politique (novembre 2025)**, seul texte d'autorité sectoriel exactement sur ce projet, aujourd'hui en question ouverte dans `annexe-reconnaissance-brute.md` et jamais lu ; (b) **trancher en une ligne de `decisions.md`** si « l'éditeur de cestecritla.fr, joignable à {contactEmail} » satisfait 13(1)(a) — c'est le seul endroit du dossier où l'anonymat de LCEN art. 1-1 II et le RGPD peuvent se contredire.

### 6.2 ter Le droit de réponse en ligne — H-CNF-21, ouverte le 10/9/2026

Le dossier a lu **à qui** s'adresse une demande de droit de réponse (art. 1-1 III, §5.1) mais jamais le **régime de délai et de sanction** : insertion de la réponse **dans les trois jours de sa réception**, sous peine d'amende (LCEN art. 6-IV et décret n° 2007-1527 du 24 octobre 2007). **Ces deux textes n'ont pas été lus à la source** : le statut est HYPOTHÈSE. Aucune fiche de runbook n'existait — ni parmi les cinq de `09-architecture.md` §9, ni parmi les cinq proposées en `14-risques.md` §4 ; la fiche 11 y est ajoutée. Le déclencheur est plausible : l'app nomme La France insoumise partout par obligation de licence, et `share.message.cousin` nomme Mélenchon. Deux conséquences pratiques : `{contactEmail}` doit exister **avant** toute mise en ligne, et une **cadence de relève** doit être écrite (quotidienne à partir de J-3) — un délai de trois jours suppose une lecture quotidienne, que rien n'organisait. Chaîne à créer : `legal.notice.reply_delay`, parce qu'une page de mentions légales qui annonce le mécanisme sans son délai laisse croire qu'il n'y en a pas.

### 6.3 La politique en dix lignes — texte final

Route `/confidentialite` (D5.10). Titre `privacy.title` = « Confidentialité », chapeau `privacy.lead` = « Dix lignes, toutes vraies, vérifiées contre la carte des données de l'app. » Chaque ligne est confrontée ligne à ligne au tableau §6 de `09-architecture.md`.

| Clé | Texte final |
|---|---|
| `privacy.policy.01` | Pas de compte, pas d'inscription, pas de cookie de suivi, aucune publicité. |
| `privacy.policy.02` | Tes questions au chat vont à notre serveur, puis à l'IA Mistral, chez Cloudflare. Elles servent à choisir des passages du programme. Elles ne sont pas enregistrées : ni journal, ni base, ni identifiant. |
| `privacy.policy.03` | On garde une empreinte de la question : un code tiré de ses mots, sans la question. Elle sert à resservir la même réponse plus vite, trente jours au plus. |
| `privacy.policy.04` | On compte les mots que l'app n'a pas su expliquer, un par un. Sans la phrase, sans qui l'a tapée, trente jours au plus. |
| `privacy.policy.05` | On mesure l'usage de façon agrégée, sur une visite sur dix. Par exemple : combien de lectures atteignent le texte du programme. Sans adresse IP, sans identifiant, sans cookie. |
| `privacy.policy.06` | Le chat est protégé par Cloudflare Turnstile, une vérification anti-robot. Turnstile ne pose aucun cookie. Il garde un stockage local de sécurité dans son domaine, effacé avec les données du site. Cloudflare y traite ton adresse IP et ton navigateur pour nous, sans pouvoir t'identifier directement. |
| `privacy.policy.07` **(amendée)** | Cloudflare héberge l'app, aux États-Unis comme en Europe. Comme tout hébergeur, il voit les adresses IP et les pages demandées. On n'y a pas accès et on n'en tire rien. |
| `privacy.policy.08` | Ta progression vit dans ton téléphone, seulement si tu le demandes. « Effacer ma progression » l'efface. |
| `privacy.policy.09` | Aucun tiers autre que Cloudflare : ni Google, ni réseau social, ni police externe. |
| `privacy.policy.10` | Le code est public. Cette page dit tout ce qui existe. Une question : {contactEmail}. |

Ligne annexe, affichée sous la liste tant que NEL n'est pas coupé : `privacy.host_logs_nel` = « Ton navigateur peut signaler à Cloudflare une erreur de réseau (sans cookie, sans identifiant). On coupe ce signalement dès qu'on le peut. »

**Ce qu'on n'enregistre jamais** (`privacy.never.title` = « Ce qu'on n'enregistre jamais »), neuf lignes, telles quelles :

1. `privacy.never.01` — Le texte d'une question.
2. `privacy.never.02` — Une adresse IP ou un navigateur (User-Agent).
3. `privacy.never.03` — Un identifiant d'appareil, de session ou de navigateur.
4. `privacy.never.04` — L'historique de lecture d'une personne.
5. `privacy.never.05` — Les réponses aux jeux (« je savais », « je découvre »).
6. `privacy.never.06` — Un horodatage rattachable à une visite.
7. `privacy.never.07` — Le contenu d'une carte partagée, ni son destinataire.
8. `privacy.never.08` — Un jeton Turnstile.
9. `privacy.never.09` — Un cookie.

Chacune de ces neuf lignes est vérifiable dans la carte des journalisations : la seule qui demande une garde de code active est la n° 1 (règle « aucun `console.*` ne reçoit une variable issue de la requête », `09-architecture.md` §6) ; la n° 6 est tenue par l'arrondi au **jour UTC** dans `q_cache` (le labo écrivait la seconde, corrigé le 9/9).

### 6.4 Les trois corrections apportées à la v0.2

1. **`privacy.policy.07` : le transfert hors UE était absent.** Cloudflare, Inc. est une entité américaine (§5.2) et l'inférence Workers AI n'est pas garantie en UE sur le plan gratuit (`09-architecture.md` §6). La ligne amendée dit « aux États-Unis comme en Europe » sans jargon. Une mention plus précise (Data Privacy Framework, clauses contractuelles types) appartient à la page mentions légales, pas aux dix lignes : le modèle est dans les mentions légales de `melenchon2027.fr` archivées le 7/9. **À trancher : dix lignes lisibles + un renvoi, ou onze lignes.**
2. **`privacy.policy.02` reste vraie même en mode extractif pur** : « Tes questions au chat vont à notre serveur, puis à l'IA Mistral » devient fausse si D6.9 se referme sur « extractif pur ». Prévoir la variante `privacy.policy.02.local` : « Ta recherche se fait sur ton téléphone. Rien n'est envoyé. » — cohérente avec `search.local_promise`.
3. **Deux placeholders utilisés et non déclarés** : `{contactEmail}` (`privacy.policy.10`, `legal.notice.contact`, `about.contact_lead`) et `{repoUrl}` (`legal.license.code`). Ils manquent à `$meta.placeholders_fr` de `strings.json` : le script `scripts/check-strings.test.ts` doit les refuser tant qu'ils ne sont pas déclarés, sinon la page mentions légales peut partir en ligne avec un `{contactEmail}` brut. `{chapterNumber}` est déclaré et jamais utilisé : à retirer.

## 7. Loi n° 2018-1202 du 22 décembre 2018 (manipulation de l'information)

| Fait, lu le 9 septembre 2026 | Statut |
|---|---|
| **L163-1 du code électoral** (en vigueur depuis le 17 février 2024) ne vise plus « les opérateurs de plateforme en ligne » mais « **les très grandes plateformes en ligne et les très grands moteurs de recherche en ligne, au sens de l'article 33 du règlement (UE) 2022/2065** » (DSA), pendant les trois mois précédant le premier jour du mois d'élections générales. Obligations : information loyale sur l'identité de qui paie la promotion de contenus d'information, sur l'usage des données personnelles, et publication du montant des rémunérations au-delà d'un seuil, **dans le registre de l'art. 39 du DSA**. Source : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037850602 | VÉRIFIÉ |
| L'ancien seuil de **cinq millions de visiteurs uniques par mois** (art. D102-1, en vigueur depuis le 15 avril 2019, seuil de rémunération 100 € HT par contenu) subsiste au code mais est résiduel depuis la réécriture de L163-1. Source : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038364739 | VÉRIFIÉ |
| **Conclusion : « C'est écrit là » est hors du champ de L163-1**, à deux titres — ce n'est pas une très grande plateforme au sens du DSA, et l'app ne vend aucune promotion. | VÉRIFIÉ |
| **L163-2** (en vigueur depuis le 1er janvier 2020) ouvre un référé de 48 h lorsque des allégations inexactes ou trompeuses de nature à altérer la sincérité du scrutin sont diffusées « de manière **délibérée, artificielle ou automatisée et massive** » par un service de communication au public en ligne, pendant les trois mois précédant le scrutin. Source : https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039278631 | VÉRIFIÉ |

**Ce que L163-2 impose en pratique, comme règle interne** : l'app ne doit jamais fabriquer de diffusion automatisée ou massive. Trois garde-fous existent déjà et deviennent des règles nommées — aucun envoi automatique (le partage est toujours un geste de la personne : `share.button`, `navigator.share`) ; aucun bot, aucune programmation de publication, aucun compte de réseau social piloté par l'app ; aucune amplification payante (§9). Le quatrième est la fidélité au texte : ce que l'app affiche est du verbatim vérifié par empreinte SHA-256 (D1.4, D1.7) — c'est la meilleure défense contre une allégation d'« information inexacte ».

## 8. Marques (INPI / TMview)

Captures du 9 septembre 2026 à 18:52 UTC, `docs/discovery/captures/2026-09-09/conformite/tmview-*.json`. Source déclarée dans chaque fichier : EUIPN **TMview** (`https://www.tmdn.org/tmview/`), offices FR + EM + WO ; **`data.inpi.fr` répondait HTTP 403** à la lecture automatisée ce jour-là. Les captures portent le nom de la marque, l'office, les classes de Nice, le déposant et les dates de dépôt / enregistrement ; **elles ne portent pas le statut juridique** (en vigueur, expirée, radiée) : toute conclusion de « marque antérieure opposable » reste donc **PROBABLE**.

| Requête | Résultats | Ce que ça montre |
|---|---:|---|
| `cestecritla` | **0** | Aucune marque sur la forme accolée du nom de domaine. Le meilleur résultat du lot. |
| `c'est écrit là` | 7 (tous FR) | **Aucune marque identique.** La plus proche est « **C'est Écrit Dans La Bible** » (Mme Calliope Guionnet, dépôt 12/12/2020, enregistrée le 3/2/2023, classes 9, 16, 35, 38, 41, 42) : les classes recouvrent les nôtres (logiciel, édition, information), mais les signes diffèrent nettement dans leur ensemble. Les autres sont des slogans longs sans rapport (Écrinal, Vie-Yaplume, biographie restaurative). |
| `c'est écrit` | 29 (26 FR, 2 WO, 1 EM) | Une marque **identique au segment** : « **C'EST ECRIT** » (P.R. et Associés SA, dépôt du 19/1/1990, classes 35, 38, 42), sans date d'enregistrement ni statut dans la capture. Un dépôt de 1990 non renouvelé serait éteint ; la capture ne le dit pas. Également « C'est dit, C'est écrit ! » (2000, cl. 35, 38) et « C'EST ECRIT SUR LE SABLE » (2001, cl. 38, 41). |
| `l'avenir en commun` | 22 (tous FR) | **Aucune marque « L'Avenir en commun »**, et **aucune marque déposée par La France insoumise ou par un de ses représentants** sur ce titre dans les offices interrogés. Le plus proche est « SAF NOUS AVONS L'AVENIR EN COMMUN » (Société Allumettière Française, 1991). Le titre du livre est protégé par le droit d'auteur et la licence CC, pas par une marque relevée ici. |
| `insoumise` | 32 (29 FR, 3 WO) | « **La France insoumise** » existe bien : dépôt FR du 9/6/2016, enregistrée le 20/1/2017, classes 16, 35, 38, 41, **au nom d'une personne physique (« M. Amard gabriel »)**, pas de l'association. Aussi « La France insoumise Paris 15 » (2017), « Lyon insoumise », « Amiens insoumise », « Montpellier Insoumise », « LA CORSE INSOUMISE », « Vendémiaires Insoumises » (dépôt 27/10/2025, enregistrée le 13/2/2026). Et des marques sans rapport : L'Oréal, Mauboussin, Le Figaro, deux châteaux viticoles. |

**Lecture pour l'app**

1. **Le nom « C'est écrit là » n'est bloqué par aucune marque identique** dans les offices FR, EM et WO ; le risque le plus proche est « C'est Écrit Dans La Bible », en vigueur et dans des classes qui recouvrent les nôtres. Signes très différents pris dans leur ensemble, publics différents : **risque faible, PROBABLE**.
2. Le dépôt « C'EST ECRIT » de 1990 en classes 35/38/42 est le seul point à vérifier avant tout dépôt de notre côté. **À lever** : consultation de `data.inpi.fr` (registre national des marques) ou du Bulletin officiel de la propriété industrielle, quand le service répond.
3. **On ne dépose rien.** Un dépôt (≈ 190 € pour une classe) créerait une dépense, un titulaire nommé au registre public — donc la fin de l'anonymat de D0.15 — et une apparence d'appropriation d'un nom lié au mouvement. Le nom est protégé de fait par l'usage et par le domaine.
4. **On n'utilise « La France insoumise » et « L'Avenir en commun » que de façon référentielle** : pour créditer l'auteur du texte, comme l'exige la licence CC. C'est un usage nominatif licite, distinct d'un usage à titre de marque. Aucun logo, aucun wordmark tiers (D3.3), aucun lien de parrainage sous-entendu (`independence.line`).
5. **Veille** : refaire la recherche TMview avant le lancement public et une fois par trimestre ; surveiller particulièrement un dépôt « L'Avenir en commun » par l'écosystème insoumis, qui changerait le raisonnement du point 4.

## 9. Code électoral L52-1 : zéro promotion payante

Texte lu le 9 septembre 2026 sur https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070239/LEGISCTA000006148458/ (art. L52-1, en vigueur depuis le 20 avril 2011) :

> « Pendant les six mois précédant le premier jour du mois d'une élection et jusqu'à la date du tour de scrutin où celle-ci est acquise, l'utilisation à des fins de propagande électorale de tout procédé de publicité commerciale par la voie de la presse ou par tout moyen de communication audiovisuelle est interdite. »

**Calcul de la fenêtre** : scrutin en avril 2027 → premier jour du mois de l'élection = 1er avril 2027 → les six mois précédents commencent le **1er octobre 2026**, et l'interdiction court jusqu'au tour où l'élection est acquise (2 mai 2027). **VÉRIFIÉ**, et conforme au `CLAUDE.md` du projet.

**Règle d'exploitation** (D9.8) : à partir du 1er octobre 2026, et en pratique dès maintenant puisque la clause NC de la licence l'impose déjà (§3.1), **aucun euro n'est dépensé pour faire voir l'app** : pas de publicité sur les réseaux sociaux, pas de référencement payant, pas de post sponsorisé, pas de partenariat rémunéré, pas d'achat de mots-clés, pas d'influenceur payé. Le seul coût accepté du projet reste le domaine (≈ 8 €/an, D0.13).

### 9.1 Les QR codes sur les tracts

**Question** : imprimer un QR code vers `cestecritla.fr` sur un tract militant tombe-t-il sous L52-1 ?

**Réponse : non, pris isolément.** Raisonnement, **PROBABLE** :

- L52-1 interdit « tout procédé de **publicité commerciale** par la voie de la **presse** ou par tout moyen de **communication audiovisuelle** ». Un tract imprimé et distribué à la main n'est ni de la presse, ni de l'audiovisuel, ni un procédé de publicité commerciale (il n'y a pas d'achat d'espace). Le tract relève d'autres articles : L49 1° (interdiction de distribuer des bulletins, circulaires et autres documents à partir de la veille du scrutin à zéro heure) et, pour un candidat, L52-8 et le plafonnement des dépenses.
- Un QR code n'ajoute pas de nature juridique : il est l'équivalent typographique d'une adresse web imprimée.
- **En revanche**, trois choses feraient basculer le raisonnement : (a) faire imprimer le tract **par une régie publicitaire** dans un support de presse (encart payé) ; (b) financer la diffusion (distribution rémunérée dans des boîtes aux lettres achetées à un prestataire) ; (c) si le tract est celui d'un candidat, le coût entre dans son compte de campagne — l'app y figurerait alors comme un service fourni, ce qui pose la question de l'avantage en nature (L52-8). L'app étant gratuite, publique et non exclusive, elle est en pratique un lien externe comme un autre — mais c'est le comptable de campagne, pas nous, qui tranche.
- **Interdit en tout état de cause** : distribuer ce tract à partir de la veille du scrutin à zéro heure (L49 1°). Le flag de silence de l'app ne couvre pas les tracts en papier ; la consigne doit être écrite dans le kit militant s'il en existe un.

**Règle retenue** : aucune restriction sur les QR codes imprimés par des militants sur leurs propres tracts, **à condition** que rien ne soit payé par nous et que l'app ne fournisse ni maquette de tract ni service d'impression. L'app ne distribue aucun kit imprimable en v1.

## 10. Silence électoral (code électoral L49) et la fenêtre de gel

### 10.1 La règle

Texte lu le 9 septembre 2026 (même page Legifrance, art. L49 en vigueur depuis le 30 juin 2020) :

> « **A partir de la veille du scrutin à zéro heure**, il est interdit de :
> 1° Distribuer ou faire distribuer des bulletins, circulaires et autres documents ;
> 2° **Diffuser ou faire diffuser par tout moyen de communication au public par voie électronique tout message ayant le caractère de propagande électorale** ;
> 3° Procéder, par un système automatisé ou non, à l'appel téléphonique en série des électeurs afin de les inciter à voter pour un candidat ;
> 4° Tenir une réunion électorale. »

Le 2° est celui qui vise une app. L'article ne donne **pas de fin explicite** : la lecture d'usage est la fermeture du dernier bureau de vote métropolitain (20 h à Paris), la même borne que la loi 77-808 art. 11 énonce pour les sondages. **VÉRIFIÉ pour le texte, PROBABLE pour la borne de fin.**

Ce qui est gelé (D0.24, gel partiel) : chat, partage, jeux, mesure du jour, StatCards **et — ajout du 10/9/2026, panel rouge T12 — tout appel à l'action militant** : `cta.official_campaign`, `cta.action_populaire`, `cta.register_to_vote`, `cta.check_registration_url`. Un bouton « Le site officiel de la campagne » ou « Rejoindre un groupe d'action » servi le dimanche du vote **est** un message ayant le caractère de propagande électorale diffusé par un moyen de communication au public par voie électronique — ce que le 2° interdit, et c'est **plus difficile à défendre que la lecture maintenue**, qui est un texte que le lecteur vient chercher. Le même raisonnement vaut pour `cta.register_to_vote` un jour où l'inscription est close : inutile, donc masqué. Ces quatre clés n'étaient dans **aucune** des quatre listes de gel du dossier : l'implémenteur les aurait posées et elles seraient restées allumées. **Écrit le 10/9/2026** dans `scripts/silence.ts` (`FROZEN_KEY_PREFIXES` + `isFrozenKey`) et en porte de CI dans `scripts/silence.test.ts` : aux quatre bornes, `effectiveDate().silence === true` ⇒ **aucune clé `cta.*` rendue**, et la **lecture n'est jamais retenue**. **Ce qui reste ouvert : la lecture.** Un texte de programme consultable à la demande d'un lecteur qui vient le chercher n'est pas un message « diffusé » au sens du 2° — lecture prudente mais non maximaliste, cohérente avec le fait que le programme reste en ligne sur le site officiel.

### 10.2 Les bornes retenues, et pourquoi elles sont plus larges que la loi

`scripts/silence.ts` (en-tête du fichier, D9.7) :

> « Conservative rule chosen : the freeze opens on the **FRIDAY** before each round at 00:00 Europe/Paris and closes on the **SUNDAY** of the round at 20:00 Europe/Paris. »

Motif, écrit dans le code : la présidentielle 2027 se tient le dimanche 18 avril et le dimanche 2 mai en métropole, et **le samedi 17 avril et le samedi 1er mai** en Guadeloupe, Martinique, Guyane, Saint-Pierre-et-Miquelon, Saint-Barthélemy, Saint-Martin et Polynésie française (service-public.gouv.fr, publié le 2/7/2026 ; dates à figer sur le décret de convocation — le calendrier porte `status: 'PROBABLE'`). Pour ces territoires, la « veille du scrutin » est le **vendredi**. Vendredi 00:00 à Paris (= jeudi 22:00 UTC en avril) précède le vendredi 00:00 de tous les territoires concernés — la Polynésie française (UTC−10) étant la dernière, à vendredi 10:00 UTC. **Une seule fenêtre couvre donc les deux jours de scrutin.**

| Tour | Ouverture du gel | Fermeture | En UTC |
|---|---|---|---|
| 1er tour | vendredi 16 avril 2027, 00:00 Paris | dimanche 18 avril 2027, 20:00 Paris | `2027-04-15T22:00:00.000Z` → `2027-04-18T18:00:00.000Z` |
| 2d tour | vendredi 30 avril 2027, 00:00 Paris | dimanche 2 mai 2027, 20:00 Paris | `2027-04-29T22:00:00.000Z` → `2027-05-02T18:00:00.000Z` |

Le gel commence donc **24 heures avant** la lettre de L49 pour la métropole. C'est un choix, pas une obligation : il coûte une journée de partage et supprime le risque d'une fenêtre outre-mer mal couverte.

### 10.3 Ce que le code garantit, prouvé par les tests

`npx tsx --test scripts/silence.test.ts` → **17 tests, 17 pass, 0 fail** (remesuré le 10 septembre 2026 ; **14/14 le 9 septembre**, avant les trois portes ajoutées par le panel rouge T12 : les deux cas de dérive d'horloge et « aux quatre bornes, aucune clé `cta.*` rendue »).

| Test | Ce qu'il verrouille |
|---|---|
| Décalages Europe/Paris | CEST en avril/mai 2027, CET en janvier, bascule du 28 mars 2027 à 02:00 — l'heure d'été n'est jamais codée en dur |
| `parisToUtc` | `2027-04-16` 00:00 Paris = `2027-04-15T22:00:00Z` ; `2027-04-18` 20:00 Paris = `2027-04-18T18:00:00Z` |
| Les deux fenêtres | valeurs UTC exactes ci-dessus ; chaque jour de scrutin est bien un dimanche ; le samedi outre-mer est bien la veille |
| Bornes à la seconde | ouvert à `21:59:59Z`, gelé à `22:00:00Z` ; gelé à `17:59:59Z`, rouvert à `18:00:00Z` |
| **Électeurs du samedi outre-mer** | gelé à vendredi 04:00 UTC (Guadeloupe), vendredi 10:00 UTC (Tahiti), samedi 11:00 UTC (Cayenne, jour de scrutin) — pour les deux tours |
| Jour de tirage figé | pendant toute la fenêtre, `day` reste `2027-04-15` : **aucun nouveau message ne paraît pendant le silence**, y compris la mesure du jour et le tirage `/defi/` |
| « Celle de demain » masquée | `tomorrowFrozen` passe à vrai dès le jeudi précédent |
| Dérogation KV | `on` gèle immédiatement (décret déplaçant une date), `off` n'empêche jamais, `auto` suit le calendrier ; les trois sont consignées dans `decisions.md` quand elles servent |
| Date déplacée | changer `PRESIDENTIAL_2027` suffit ; les fenêtres suivent |
| Rendu français | `formatReopenTimeFr` → « dimanche 18 avril, 20 h », « dimanche 2 mai, 20 h » |
| Entrée invalide | `effectiveDate(new Date('not a date'))` lève |

Le point le plus important est le sixième : **le gel ne se contente pas de masquer des boutons, il fige le contenu tiré au sort.** Sans lui, la « mesure du jour » du dimanche de scrutin serait un message nouveau, diffusé un jour de scrutin — exactement ce que le 2° interdit.

### 10.4 Les textes affichés

Aucune de ces phrases ne dit « interdit », « loi » ou « obligation » sauf `silence.reason`, qui nomme la règle une fois, sans la commenter (`voice.md` §6).

| Clé | Texte |
|---|---|
| `silence.banner` | Veille et jour du vote, chat, partage et jeux sont en pause. La lecture reste ouverte. |
| `silence.reason` | C'est la règle du silence électoral, la même pour tout le monde. |
| `silence.chat` | Les questions à l'IA reprennent à {reopenTime}. |
| `silence.share` | Veille et jour du vote, la campagne se tait : le partage reprend à {reopenTime}. |
| `silence.daily` | Pendant le scrutin, la mesure du jour ne change pas. Elle repart {reopenTime}. |
| `silence.statcard` | Pendant le scrutin, les chiffres de sondage restent lisibles dans le livre, jamais ailleurs. |
| `silence.reopen` | Tout revient à {reopenTime}. |

`{reopenTime}` vient de `formatReopenTimeFr(effectiveDate(...).reopenUtc)`. **Point à corriger** : `silence.daily` écrit « Elle repart {reopenTime} » sans préposition, alors que les autres écrivent « à {reopenTime} » — le rendu donne « Elle repart dimanche 18 avril, 20 h », qui passe ; à confirmer à la relecture.

## 11. Inscription sur les listes électorales (CTA autorisé, D0.16)

| Fait | Source lue le 9/9/2026 | Statut |
|---|---|---|
| Élection présidentielle 2027 : « le dimanche 18 avril 2027 pour le premier tour ; le dimanche 2 mai 2027 pour le second tour », samedis 17 avril et 1er mai outre-mer. Page publiée le 2 juillet 2026. | https://www.service-public.gouv.fr/particuliers/actualites/A15053 | VÉRIFIÉ (annonce) / PROBABLE (décret de convocation non publié) |
| Règle générale d'inscription : « la mairie doit recevoir votre courrier **au plus tard le 6e vendredi avant le 1er tour** ». Page vérifiée le 28 novembre 2025. Exception pour les personnes atteignant 18 ans entre le 6e vendredi et le second tour. | https://www.service-public.gouv.fr/particuliers/vosdroits/F1961 | VÉRIFIÉ (règle) |
| **Aucune page de service-public.gouv.fr lue aujourd'hui ne publie la date limite pour 2027.** | — | VÉRIFIÉ (absence) |
| 6e vendredi avant le dimanche 18 avril 2027 = **vendredi 12 mars 2027** (calcul : 16 avril, 9 avril, 2 avril, 26 mars, 19 mars, 12 mars ; le 12 mars 2027 est bien un vendredi). | calcul reproductible | **PROBABLE** |

`cta.register_deadline` = « Inscription possible jusqu'au vendredi 12 mars 2027. » est donc **une date calculée, pas une date publiée**. Trois conséquences :

1. La chaîne reste telle quelle, mais la date **doit être recalculée par `effectiveDate()`-like au build** depuis le calendrier `PRESIDENTIAL_2027`, jamais écrite en dur : si le décret de convocation déplace le scrutin, la date bouge toute seule (le mécanisme existe déjà, `silence.ts` `addDays`).
2. Une phrase de repli est nécessaire tant que le décret n'est pas publié, sinon l'app affirme une date que l'administration n'a pas donnée. Proposition : **`cta.register_deadline_estimated`** = « Inscription possible jusqu'au 6e vendredi avant le vote, soit le vendredi 12 mars 2027. » — la règle est vraie et vérifiable, la date en découle.
3. Les deux URL de `strings.json` sont cohérentes avec l'usage : `cta.register_url` = `https://www.service-public.gouv.fr/particuliers/vosdroits/R16396` (demande d'inscription) et `cta.check_registration_url` = `https://www.service-public.gouv.fr/particuliers/vosdroits/R51788` (vérification de la situation électorale). **Non ouvertes aujourd'hui : PROBABLE**, à vérifier avant la mise en ligne du CTA.

Aucun formulaire n'est hébergé par l'app : le CTA est un lien sortant (D0.16, aucune collecte de contact).

## 12. Licences

| Objet | Licence | Fichier / chaîne | Statut |
|---|---|---|---|
| Texte du programme et tous les dérivés textuels (`data/`, glossaire, FAQ, ripostes, cartes) | **CC BY-NC-SA 4.0**, attribution « La France insoumise – L'Avenir en commun » | `data/LICENSE`, `legal.license.text`, `legal.license.derived` | VÉRIFIÉ (source et deed lus) |
| Code de l'app | **MIT** | `LICENSE` racine, `legal.license.code` | DÉCISION (D1.11) |
| Polices | **SIL Open Font License 1.1** (Public Sans, Gowun Batang) | `design/fonts/OFL-*.txt`, `legal.license.fonts` | VÉRIFIÉ |
| Code d'actionpopulaire.fr (AGPL) | **interdit d'emprunt** | — | DÉCISION (D1.11) |
| Désintox (`data/desintox.json`, 26 idées reçues) | **lien seulement, jamais de reproduction** | `legal.license.desintox`, `refusal.desintox_link`, `riposte.desintox_link` | **HYPOTHÈSE** — licence non lue |

**Pourquoi MIT et pas AGPL** : l'AGPL obligerait quiconque déploie une version modifiée à publier son code, ce qui est un bon réflexe militant mais crée deux problèmes ici — elle rendrait impossible la reprise du code par l'équipe numérique de LFI si celle-ci utilise une pile propriétaire (D0.28 : le dataset et le glossaire sont **offerts**), et elle est contaminante pour un contributeur occasionnel. MIT côté code + CC BY-NC-SA côté données donne : « prends le code, mais le texte reste au mouvement et personne n'en fait commerce ».

**Deux frontières à écrire dans `/licence`** : (a) l'index de recherche et les empreintes SHA-256 sont des dérivés du texte → CC BY-NC-SA ; (b) le rendu d'une carte de partage (PNG) est un dérivé → CC BY-NC-SA, ce que disent déjà `play.card.attribution_1/2`.

**À lever avant le lancement** : la licence de réutilisation de la Désintox (D1.5, action ouverte T9). Tant qu'elle n'est pas lue, `data/desintox.json` sert uniquement à **détecter** une correspondance et à proposer un lien ; **aucune phrase de la Désintox n'est affichée**. `riposte.desintox_lead` = « La France insoumise y répond en détail sur desintox.lafranceinsoumise.fr. » respecte cette règle.

## 13. En-têtes NEL / `report-to` de la zone

Fait mesuré au labo T7 (`prototypes/labo-plateforme/turnstile/README.md` §3.5, capture `captures/2026-09-09/labo-turnstile/headers-index.txt`, 9 septembre 2026) : la **zone** ajoute sur toutes nos réponses, y compris les fichiers statiques —

```
report-to: {"group":"cf-nel","max_age":604800,"endpoints":[{"url":"https://a.nel.cloudflare.com/report/v4?s=…"}]}
nel: {"report_to":"cf-nel","success_fraction":0.0,"max_age":604800}
```

Lecture : `success_fraction: 0.0` signifie qu'**aucune requête réussie n'est rapportée** ; seules des erreurs réseau le sont, à Cloudflare, sans cookie et sans identifiant applicatif, avec une durée de vie de politique de 7 jours (`max_age: 604800`). Aucune requête vers `a.nel.cloudflare.com` n'a été observée pendant les 9 passes du labo. **VÉRIFIÉ (en-têtes) / PROBABLE (contenu d'un rapport, jamais déclenché).**

**Deux options, une recommandation.**

| Option | Ce que ça coûte | Ce que ça donne |
|---|---|---|
| **Couper** au dashboard (zone → Network Error Logging) | un réglage, zéro € | La ligne « aucun tiers autre que Cloudflare » devient plus simple à tenir ; `privacy.host_logs_nel` disparaît de la page ; un signal de diagnostic est perdu (on n'en fait rien : on n'a pas accès aux rapports sur le plan gratuit) |
| **Déclarer** | une ligne de plus sur `/confidentialite` | Honnête, mais ajoute une ligne à une page qui doit rester lisible, pour un signal qu'on ne lit jamais |

**Recommandation : couper.** On ne consomme pas ces rapports, ils ne servent qu'à Cloudflare, et une politique de confidentialité tient d'autant mieux qu'elle décrit peu de choses. `privacy.host_logs_nel` reste dans `strings.json` comme filet : la page l'affiche **tant que l'en-tête `nel:` est observé**, et un test de bout en bout vérifie la cohérence entre l'en-tête servi et la ligne affichée. C'est la seule façon d'empêcher la politique de mentir un jour où le réglage de zone serait remis par défaut.

## 14. Turnstile : le stockage, et la règle des six secondes

### 14.1 Ce que Turnstile pose (D7.6)

Mesuré sur 9 passes, 4 moteurs, contexte neuf à chaque fois (labo T7, 9/9/2026) :

- **0 cookie**, 0 en-tête `Set-Cookie`, sur tous les domaines et toutes les frames — **VÉRIFIÉ pour un défi échoué**, HYPOTHÈSE pour un défi réussi (le défi ne peut pas être passé en automatisation : 9 échecs `600010`, ce qui est le but du produit) ;
- **une clé `localStorage`**, `cf.turnstile.u` (149 caractères), dans l'origine **`challenges.cloudflare.com`**, écrite dès le rendu du widget, stable au rechargement dans un même profil, différente d'un profil à l'autre, sans expiration ; cloisonnée par site de premier niveau (partitionnement du stockage : Chromium ≥ 115, Firefox ≥ 103, Safari ITP) — donc non traçable d'un site à l'autre, **PROBABLE** ;
- rien du côté `cestecritla.fr` : `localStorage`, `sessionStorage` et IndexedDB vides ;
- pas de pré-clearance (elle poserait `cf_clearance`), pas de `remoteip` envoyé à siteverify.

D'où la formulation de `privacy.turnstile`, qui dit le mécanisme sans jargon : « Le chat est protégé par Cloudflare Turnstile, une vérification anti-robot. Aucun cookie : un stockage local de sécurité, rien d'autre. » Et `privacy.policy.06`, plus complet, qui ajoute l'origine tierce et le rôle de Cloudflare. La qualification « strictement nécessaire » au sens ePrivacy reste **PROBABLE** (raisonnement par analogie avec les traceurs de sécurité) ; elle est confortée par l'addendum de Cloudflare, qui qualifie les signaux de « strictly necessary for the purpose of detecting and blocking bots ».

**Règle de chargement** : Turnstile n'est chargé **que sur l'écran chat** (`api.js` pèse 27 Ko gzip, c'est le seul tiers de l'app, contre un budget « zéro tiers », D3.5). Jamais sur l'accueil, jamais sur une page atteinte par un lien de partage.

### 14.2 La règle des six secondes

Mesures utilisateur du 9 septembre 2026 sur téléphone réel (`01-faits.md`) : **13 870 ms** jusqu'au jeton depuis le début de la navigation sur un réseau médiocre, **5 973 ms** sur un meilleur réseau, même appareil. Le réseau pèse pour ≈ 8 secondes ; même dans le meilleur cas, l'attente du jeton dépasse le budget d'interaction de l'app.

**Règle retenue (D9.13)** : *le jeton est demandé en arrière-plan dès l'ouverture de l'écran chat, jamais à l'envoi ; la réponse extractive est affichée pendant ce temps.*

Déroulé exact :

1. À l'ouverture de l'écran chat, le widget est rendu en mode invisible et le jeton commence à être calculé. Aucun écran d'attente, aucun spinner, aucune phrase.
2. La personne tape sa question et l'envoie. **Le retrieval local (variante A, < 100 ms, hors ligne) répond immédiatement** : trois passages du programme, badge `degraded.badge` = « Réponse directement extraite du programme ».
3. Si le jeton arrive et que le budget le permet, l'appel `/api/ask` part et **remplace le liant et l'ordre des passages** quand la sélection revient (≈ 1-2 s) — le mécanisme « extractif puis IA » de `08-ia.md` §7.1.
4. Si le jeton n'arrive pas, ou arrive après la réponse, **rien ne se passe** : l'écran reste celui du mode extractif, qui est un mode normal (`voice.md` règle 5 : jamais « panne », « erreur », « indisponible », « désolé », « réessayer »).

Ce que cette règle interdit : bloquer le bouton « Envoyer » tant que le jeton n'est pas là ; afficher « Vérification en cours… » ; faire dépendre la première réponse d'un tiers. **Conséquence de conformité** : l'app reste utilisable et honnête même si Turnstile échoue ou est bloqué par un bloqueur de contenu — ce qui évite d'avoir à traiter le blocage comme une panne, et évite d'écrire la phrase de disclaimer que D0.1 interdit.

**Reste HYPOTHÈSE** : le relevé cookies/stockage sur un défi **réussi** et le temps jusqu'au jeton sur un second téléphone (`09-architecture.md` §10.2 point 3).

## 15. Décisions proposées (D9.x)

À reporter dans `decisions.md` par l'orchestrateur, après validation par l'utilisateur.

| ID | Décision | Statut | Preuve |
|---|---|---|---|
| **D9.1** | **Mécanisme de la mention IA (art. 50)** : mention textuelle dans l'état vide du chat **avant** la première interaction, badge `chat.ai_badge` sur chaque bulle générée, texte alternatif `chat.ai_mention.sr` pour lecteurs d'écran, jamais une icône seule ni une infobulle. **La variante (v1 / v2 / v3) n'est pas tranchée** : panel de 5 juges, critères (a)-(e) du §2.3, seuil 4/5. Longueurs recomptées : 104 / 104 / 91 caractères — `voice.md` §4 à corriger. La mention disparaît si D6.9 se referme sur « extractif pur ». | DÉCISION (mécanisme) / HYPOTHÈSE (variante) | art. 50 §§ 1, 4, 5 lus le 9/9 ; `strings.json` v0.2 |
| **D9.2** | **Attribution CC BY-NC-SA sur trois surfaces** : `attribution.full` en pied de page, `attribution.card` **dans le PNG** de toute image de partage, `attribution.short` en pied de carte-concept ; `attribution.unmodified` réservée à la zone verbatim ; `attribution.derivatives` sur la page Licence. La clause NC interdit toute publicité et toute promotion payante, sans date de début. | DÉCISION | deed CC lu le 9/9 ; mentions légales melenchon2027.fr archivées le 7/9 |
| **D9.3** | **Gabarit StatCard art. 11 al. 3** (organisme + date + média = *L'Avenir en commun 2025*, chapitre, lien) ; `statcard.legal.no_sponsor` sur 45 cartes, `statcard.legal.full` sur 3, `statcard.not_a_survey` sur `c13-s03-a02`, `statcard.legal.missing` partout ; date toujours visible ; jamais de carte statistique sur une image ; **`statcard.legal.sample` supprimée ou renvoyée à un sidecar `stat-cards-legal.json`** (aucun champ `sample` n'existe). Confirme D5.5 (« Devine le % » retiré). | DÉCISION (sur pièces) | loi 77-808 art. 1, 2, 11 lus le 9/9 ; relevé `data/stat-cards.json` |
| **D9.4** | **Mentions légales en éditeur non professionnel (LCEN art. 1-1, II)** : publier le nom et l'adresse de **Cloudflare, Inc.** ; compléter le profil du compte Cloudflare (adresse postale, téléphone) et **archiver une capture datée** pour prouver la condition du II ; droit de réponse par l'hébergeur (III) ; ~~plan B association 1901 **préparé mais non déclenché**~~ — **amendé par D9.18 (§19.4) et corrigé le 10/9/2026 (panel rouge T12) : aucune personne morale entre le 1/10/2026 et le 2/5/2027 (L52-8 al. 1).** Les trois déclencheurs (50 000 visiteurs sur 7 jours glissants, une mise en demeure, un article de presse nationale) restent, mais ils ouvrent une **décision consciente** — publier l'identité de la personne physique (art. 1-1 I) — et non une bascule associative. | DÉCISION (orientation) / PROBABLE (qualification d'hébergeur) | art. 1-1 lu le 9/9 ; Cloudflare trust hub et website terms lus le 9/9 |
| **D9.5** | **Politique de confidentialité en dix lignes** (§6.3) adoptée comme texte final de `/confidentialite`, avec trois corrections : `privacy.policy.07` mentionne le traitement « aux États-Unis comme en Europe » ; variante `privacy.policy.02.local` prête si l'app passe en extractif pur ; `{contactEmail}` et `{repoUrl}` déclarés dans `$meta.placeholders_fr` et vérifiés par `scripts/check-strings.test.ts`. La liste « Ce qu'on n'enregistre jamais » (9 lignes) est publiée telle quelle. | DÉCISION | `09-architecture.md` §6 ; CNIL lue le 9/9 |
| **D9.6** | **NEL coupé sur la zone** (dashboard → Network Error Logging) ; `privacy.host_logs_nel` conservée dans `strings.json` et **affichée conditionnellement** tant qu'un en-tête `nel:` est observé, avec un test de bout en bout qui compare l'en-tête servi et la ligne affichée. Turnstile : pas de pré-clearance, pas de `remoteip`, chargé sur le seul écran chat, stockage local déclaré. | DÉCISION | en-têtes capturés le 9/9 ; labo `turnstile` §3.4-3.5 |
| **D9.7** | **Fenêtre de silence électoral : vendredi 00:00 Europe/Paris → dimanche 20:00 Europe/Paris**, pour chacun des deux tours, soit 24 h de plus que la lettre de L49 en métropole, afin de couvrir la veille des territoires qui votent le samedi. Implémentation unique `scripts/silence.ts` (`effectiveDate()`), partagée client et Worker, avec dérogation KV `auto` / `on` / `off`. Le gel **fige aussi le jour de tirage** : aucun contenu nouveau pendant la fenêtre. **17 tests** de bornes en CI (14 le 9/9). | DÉCISION (sur pièces) | L49 lu le 9/9 ; `scripts/silence.ts` ; **17/17 tests le 10/9**, 14/14 le 9/9 |
| **D9.8** | **Zéro promotion payante**, à partir du 1er octobre 2026 par L52-1 et dès maintenant par la clause NC : pas de publicité, pas de référencement payant, pas de post sponsorisé, pas d'influenceur rémunéré. **Les QR codes imprimés par des militants sur leurs propres tracts restent licites** (ni presse, ni audiovisuel, ni publicité commerciale), sauf à partir de la veille du scrutin à zéro heure (L49 1°) ; l'app ne fournit aucun kit imprimable en v1. | DÉCISION (sur pièces) / PROBABLE (qualification du QR code) | L52-1 et L49 lus le 9/9 |
| **D9.9** | **CTA inscription électorale** : la date limite est **calculée au build** depuis le calendrier (6e vendredi avant le 1er tour), jamais écrite en dur ; tant que le décret de convocation n'est pas publié, afficher la règle et la date. **APPLIQUÉ le 10/9/2026 (panel rouge T12) — la décision datait du 9/9 et n'avait pas atteint le livrable** : `strings.json` v0.3 portait encore `cta.register_deadline` = « Inscription possible jusqu'au vendredi 12 mars 2027. », date en dur, et `cta.register_deadline_estimated` **n'existait pas**. En v0.4 : `cta.register_deadline` = « Inscription possible jusqu'au {date}. » et `cta.register_deadline_estimated` = « Inscription possible jusqu'au sixième vendredi avant le vote, soit le {date}. » ; **`registrationDeadline()` est exportée depuis `scripts/silence.ts`** à côté d'`effectiveDate()` et rend `2027-03-12` (6e vendredi avant le dimanche 18 avril 2027), avec son test : la date est un **vendredi**, elle est bien le 6e avant le 1er tour, et **elle bouge si le calendrier bouge, sans qu'une chaîne soit éditée** (calendrier déplacé au 11 avril ⇒ `2027-03-05`) ; porte de `scripts/check-strings.test.ts` : **toute clé `cta.*` contenant un millésime `20\d\d` fait échouer la CI** (écrite, verte). H-CNF-4 écrivait : « Un CTA public affiche une date fausse à des gens qui comptent dessus pour voter. C'est la faute la plus directement dommageable du dossier. » | DÉCISION / PROBABLE (date) | service-public.gouv.fr F1961 et A15053 lues le 9/9 |
| **D9.10** | **Licences confirmées** : code MIT, `data/` et tous les dérivés textuels et graphiques en CC BY-NC-SA 4.0, polices OFL 1.1 ; **AGPL interdit d'emprunt** ; **la Désintox n'est jamais reproduite**, seulement liée, tant que sa licence n'a pas été lue. Deux frontières écrites dans `/licence` : index de recherche et empreintes = dérivés ; PNG de partage = dérivé. | DÉCISION / HYPOTHÈSE (licence Désintox) | D1.11, D1.5 ; deed CC lu le 9/9 |
| **D9.11** | **Marques : aucun dépôt.** « C'est écrit là » n'est bloqué par aucune marque identique (TMview FR + EM + WO, 9/9) ; « cestecritla » ne renvoie rien. Usage strictement référentiel de « La France insoumise » et « L'Avenir en commun », imposé par la licence CC. Veille TMview avant le lancement puis trimestrielle ; vérifier le statut du dépôt « C'EST ECRIT » de 1990 sur `data.inpi.fr` quand le service répond. | DÉCISION / PROBABLE (statuts absents des captures) | `captures/2026-09-09/conformite/tmview-*.json` |
| **D9.12** | **Loi 2018-1202 hors périmètre** : L163-1 ne vise plus que les très grandes plateformes au sens de l'art. 33 du DSA. Règle interne au titre de L163-2 : **aucune diffusion automatisée ou massive** — aucun envoi automatique, aucun bot, aucune publication programmée, aucune amplification payante ; le partage est toujours un geste de la personne. | DÉCISION (sur pièces) | L163-1 et L163-2 lus le 9/9 |
| **D9.13** | **Règle des six secondes** : le jeton Turnstile est demandé en arrière-plan dès l'ouverture de l'écran chat, jamais à l'envoi ; la réponse extractive s'affiche immédiatement et la sélection IA ne fait que la remplacer. Interdit : bloquer « Envoyer », afficher « Vérification en cours… », traiter l'absence de jeton comme une panne. | DÉCISION | mesures utilisateur 13 870 / 5 973 ms (9/9) ; `08-ia.md` §7.1 |
| **D9.14** | **Transferts hors UE déclarés** : `privacy.policy.07` amendée ; le détail (entité américaine, encadrement du transfert) vit sur `/mentions-legales`, pas dans les dix lignes. **APPLIQUÉ le 10/9/2026 (panel rouge T12) — l'amendement existait dans ce document depuis le 9/9 et n'était dans aucun livrable** : `strings.json` v0.3 portait encore la version sans transfert, et aucune chaîne `legal.notice.*` ne le portait non plus, si bien que l'information de l'art. 13(1)(f) n'était écrite **nulle part**. En v0.4 : `privacy.policy.07` dit « aux États-Unis comme en Europe » et `legal.notice.transfer` est créée (« Cloudflare, Inc. est une société américaine. Les données techniques de l'hébergement peuvent être traitées hors de l'Union européenne. »). Second défaut du même écran, corrigé : `privacy.lead` promettait « Dix lignes, toutes vraies » alors que D6.10 vide la ligne 2 (IA Mistral), la ligne 6 (Turnstile) et peut-être la ligne 3 (empreinte de question, si `/api/ask` disparaît) — un chapeau qui compte ses lignes se casse à chaque décision d'architecture. Il devient « Tout ce que l'app garde, en une page, vérifié contre la carte des données. », et un test de `check-strings.test.ts` rejette tout chapeau qui annonce un nombre de lignes. | DÉCISION (appliquée) | Cloudflare website terms lus le 9/9 ; modèle archivé le 7/9 |

## 16. Ce que l'utilisateur doit valider

Par ordre de coût décroissant si on se trompe.

1. **La sortie si l'exposition devient intenable (D9.4, amendée par D9.18).** ⚠️ **Question réécrite le 10/9/2026 (panel rouge T12) : elle demandait de valider exactement ce que §19.4 D9.18 interdit.** La vraie question est : **acceptes-tu que la sortie, si l'exposition devient intenable, soit la publication de ton identité de personne physique (art. 1-1 I), et non la création d'une association ?** Aucune personne morale n'est possible entre le 1/10/2026 et le 2/5/2027 (L52-8 al. 1) — et le dommage d'une association serait sur le **compte de campagne du candidat**, pas chez nous. Les trois seuils (50 000 visiteurs sur sept jours, une mise en demeure, un article de presse nationale) restent, comme déclencheurs de cette décision. Et acceptes-tu le geste préalable : compléter le profil Cloudflare avec adresse postale et téléphone, et archiver la capture ? **Sans ce geste, la condition de l'art. 1-1 II n'est pas prouvée.**
2. **La fenêtre de silence à vendredi 00:00 (D9.7).** Elle coûte une journée de partage de plus que la loi n'exige en métropole. C'est un choix de prudence assumé — le confirmes-tu, ou préfères-tu la lettre de L49 (samedi 00:00) avec une fenêtre séparée pour l'outre-mer ?
3. **Les dix lignes de confidentialité (D9.5)**, en particulier la ligne 7 amendée : « Cloudflare héberge l'app, aux États-Unis comme en Europe. » Ou préfères-tu une onzième ligne dédiée au transfert plutôt qu'un ajout dans la 7 ?
4. **Couper NEL (D9.6)** plutôt que le déclarer. C'est un réglage au dashboard de la zone, que le jeton wrangler ne peut pas faire.
5. **Le sort de « C'EST ECRIT » (1990) (D9.11)** : acceptes-tu de lancer sans avoir pu lire le statut de ce dépôt, `data.inpi.fr` ayant répondu 403 le 9/9 ?
6. **La date du 12 mars 2027 (D9.9)** : formulation « soit le vendredi 12 mars 2027 » précédée de la règle, ou date sèche ?
7. **La licence de la Désintox (D9.10)** : acceptes-tu la règle « lien seulement, jamais une phrase » jusqu'à lecture de la licence ?
8. **Le pseudonyme du relecteur** (`{reviewer}`, D0.15, D2.9), **le pseudonyme public de l'auteur** (`{author}`, séparé le 10/9) et **l'adresse de contact** (`{contactEmail}`) : trois valeurs à choisir, qui bloquent la page mentions légales, la page confidentialité et le badge de chaque carte-concept. Question ajoutée : **`{author}` et `{reviewer}` désignent-ils la même personne ?** Aujourd'hui oui (D2.9 : le relecteur est l'utilisateur), et le badge affiche alors « Rédigé par nous, relu par nous » — à reformuler si c'est le cas. `domaine.md` l. 29 fixe déjà `contact@cestecritla.fr` via Cloudflare Email Routing : la boîte reste à créer, pas à choisir.
9. **Purger l'historique git avant toute publication des mentions légales** (A1, B2, requalifiés le 10/9). Trois commits ancêtres de HEAD portent ton adresse personnelle — publiée par ce fichier même, dans son constat A1 — et `16c7d82` porte les 26 articles de la Désintox. Deux voies : `git filter-repo --replace-text` + force-push (GitHub continue de servir les objets devenus inatteignables), ou supprimer et recréer le dépôt à plat. **Laquelle ?**
10. **Les captures de sites tiers dans le dépôt** (H-LAN-14, H-CNF-17c) : 7 PNG d'identité qui contiennent le logo LFI, le wordmark M27, la tortue officielle et une photo de foule ; et une adresse e-mail de tiers (`<contact-tiers>`) dans quatre fichiers suivis. Les sortir du dépôt et purger, ou les garder ? La porte de CI « adresse e-mail » échouerait dès son premier passage tant que ce n'est pas tranché.
11. **Le guide CNIL de la communication politique (novembre 2025)** n'a jamais été lu, et c'est le seul texte d'autorité sectoriel exactement sur ce projet. À lire avant `/confidentialite` (H-CNF-20).

## 17. Ce qui reste ouvert après ce document

| Point | Statut | Levée |
|---|---|---|
| Variante de mention IA retenue | HYPOTHÈSE | Panel de 5 juges, §2.3 |
| Chat v2 vs extractif pur (D6.9 : p95 = 4 159 ms > 3 000) | Non tranché | Décision de l'utilisateur ; conditionne les lignes 1-2 du tableau §1 et `privacy.policy.02` |
| Qualification de Cloudflare comme hébergeur LCEN | PROBABLE | Revue juriste hostile ; le « might qualify » est le meilleur texte public disponible |
| Preuve de la communication des éléments d'identification à l'hébergeur | PROBABLE | Capture du profil Cloudflare complété |
| Qualification de `cf.turnstile.u` en traceur « strictement nécessaire » | PROBABLE | Revue juriste hostile |
| Statut juridique des marques relevées (en vigueur / éteintes) | PROBABLE | `data.inpi.fr` (403 le 9/9) ou BOPI |
| Champ d'application de la loi 77-808 aux 48 encadrés | PROBABLE | Revue juriste hostile ; lecture prudente conservée |
| Date limite d'inscription 2027 | PROBABLE | Décret de convocation |
| Dates du scrutin (calendrier `PRESIDENTIAL_2027`, `status: 'PROBABLE'`) | PROBABLE | Décret de convocation ; une seule constante à changer |
| Licence de la Désintox | HYPOTHÈSE | Lecture de desintox.lafranceinsoumise.fr |
| Règlement (UE) 2024/900 (publicité à caractère politique) | **HYPOTHÈSE** *(requalifié le 10/9/2026, panel rouge T12 : il était PROBABLE sur un mauvais critère)* | **Le paiement n'est pas le seul déclencheur** : la définition couvre aussi la diffusion d'un message dans le cadre d'activités internes ou d'une campagne de publicité à caractère politique, et vise les messages **susceptibles d'influencer le résultat d'une élection**. Le texte n'a jamais pu être lu (EUR-Lex a renvoyé un texte tronqué trois fois) : ni le champ, ni les exclusions, ni la date d'application ne sont établis, alors qu'il est vraisemblablement **déjà applicable**. La méthode de levée écrite (« relire avant tout changement de la règle zéro promotion payante ») renvoyait à un événement **qui n'arrivera jamais**. À lire dans le **PDF du Journal officiel** : **art. 2** (champ et exclusions), **art. 3 point 2** (définition), **art. 27** (date d'application) — puis nommer l'exclusion invoquée **avec son numéro d'article**. Échéance : **avant le lancement** (H-CNF-11) |
| Turnstile sur défi **réussi** (cookies, stockage, temps jusqu'au jeton sur un 2e téléphone) | HYPOTHÈSE | Test humain, `09-architecture.md` §10.2 point 3 |

## 18. Sources lues le 9 septembre 2026

**Textes primaires**

- AI Act, art. 50 — https://artificialintelligenceact.eu/article/50/ ; calendrier d'application (page mise à jour le 31/8/2026) — https://artificialintelligenceact.eu/implementation-timeline/
- LCEN, loi n° 2004-575 du 21 juin 2004, **art. 1-1** (version en vigueur depuis le 23/5/2024) — https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000049568614 ; texte consolidé — https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000801164/
- Loi n° 77-808 du 19 juillet 1977 relative aux sondages, art. 1, 2, 11 (en vigueur au 9/9/2026) — https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000522846/
- Code électoral, chapitre V « Propagande », **L49** (en vigueur depuis le 30/6/2020) et **L52-1** (depuis le 20/4/2011) — https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006070239/LEGISCTA000006148458/
- Code électoral, **L163-1** (depuis le 17/2/2024) — https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000037850602 ; **L163-2** (depuis le 1/1/2020) — https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039278631 ; **D102-1** (depuis le 15/4/2019) — https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038364739
- Règlement (UE) 2024/900 (publicité à caractère politique) — https://eur-lex.europa.eu/eli/reg/2024/900/oj/eng
- CC BY-NC-SA 4.0, deed français — https://creativecommons.org/licenses/by-nc-sa/4.0/deed.fr

**Autorités et opérateurs**

- CNIL, donnée sensible (RGPD art. 9) — https://www.cnil.fr/fr/definition/donnee-sensible
- CNIL, mesure d'audience exemptée de consentement (page du 4/7/2025) — https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies-solutions-pour-les-outils-de-mesure-daudience
- service-public.gouv.fr, présidentielle 2027 (publiée le 2/7/2026) — https://www.service-public.gouv.fr/particuliers/actualites/A15053 ; inscription sur les listes électorales (vérifiée le 28/11/2025) — https://www.service-public.gouv.fr/particuliers/vosdroits/F1961
- Cloudflare, approche des signalements et qualification d'hébergeur pour Workers/Pages — https://www.cloudflare.com/trust-hub/abuse-approach/ ; entité et adresse (mise à jour 1/8/2025) — https://www.cloudflare.com/website-terms/ ; signalement — https://abuse.cloudflare.com/
- AFNIC, diffusion restreinte des personnes physiques au Whois — https://www.afnic.fr/en/observatory-and-resources/expert-papers/personal-data-are-published-in-the-whois-online-directory-is-this-normal/

**Pièces locales**

- `docs/discovery/captures/2026-09-09/conformite/tmview-{cestecritla,c-est-ecrit,c-est-ecrit-la,l-avenir-en-commun,insoumise}.json` (TMview, 9/9 18:52 UTC ; `data.inpi.fr` en 403)
- `docs/discovery/captures/2026-09-09/labo-turnstile/headers-index.txt` et `headers-nonce.txt` (en-têtes `nel:` et `report-to:`)
- `docs/discovery/captures/2026-09-07/melenchon2027.fr_mentions-legales.txt` (licence CC de la source, éditeur, directeur de la publication)
- `scripts/silence.ts`, `scripts/silence.test.ts` — **17 tests** au 10/9 (14 le 9/9) (`npx tsx --test scripts/silence.test.ts`)
- `data/stat-cards.json` (48 cartes, 6 statistiques en paragraphe, bloc `legal_77_808` par carte)
- `design/strings.json` v0.2, `design/voice.md`, `docs/discovery/09-architecture.md` §6-§7, `prototypes/labo-plateforme/turnstile/README.md`, `eval/results-v2.md`

## 19. Revue « juriste hostile » (9 septembre 2026)

Revue adverse du dossier T9, menée **contre** le projet : on cherche l'illégalité, la faille de procédure et la prise réputationnelle, pas la conformité. Pièces relues : ce document, `09-architecture.md` §6-§7, `design/strings.json` v0.2, `design/voice.md`, `LICENSE`, `data/LICENSE`, `data/desintox.json`, `data/riposte.json`, `data/glossary.json`, `12-positionnement-lancement.md` §9, et le dépôt lui-même (`git log`, `git ls-files`). **0 neuron.**

Textes primaires lus **aujourd'hui** pour cette revue (en plus de ceux du §18) : code légal CC BY-NC-SA 4.0 (et non le seul *deed*), art. 47 de la loi n° 2005-102, art. L52-8 et L52-4 du code électoral, art. 2, 3 et 11 de la loi 77-808 relus en entier, art. 50 §§ 1, 2 et 4 de l'AI Act, page CNIL « Cookies et traceurs : que dit la loi ? ». URL en §19.7.

Ce que cette revue change, en une phrase : **les trois risques les plus graves ne sont ni dans les écrans ni dans les textes de loi, ils sont dans le dépôt public** — il publie l'identité de l'éditeur, il place le programme sous MIT, et il reproduit intégralement la Désintox que l'app promet de ne jamais reproduire.

### 19.1 Tableau des constats

Sévérité : **bloquant** = ne pas mettre en ligne en l'état · **sérieux** = à corriger avant le lancement public du 10 novembre · **mineur** = à corriger quand on passe dans le fichier.

| # | Constat | Sév. | Correction exacte (écran, copie, règle) | État |
|---|---|---|---|---|
| **A1** ⛔ **PAS CORRIGÉ — requalifié le 10/9/2026 (panel rouge T12).** La réécriture du 9/9 a changé l'**identité d'auteur** des commits, pas leurs **arbres**. Remesuré en fin de journée du 10/9/2026 : `git rev-list HEAD --count` = **28** (et non 24, 25 ni 26 — **le compte monte à chaque commit du dossier : ce n'est pas un chiffre à figer, c'est une commande à rejouer**) ; trois commits **ancêtres de HEAD** — `a07ed40`, `2aa766f`, `4a47353` — contiennent l'adresse personnelle **dans le contenu de ce fichier même, §19.1, ce constat A1** ; `git log --all -p | grep -ciE '<nom-editeur>|/home/<user>'` rend **467** occurrences (dont 32 sur le nom seul et 440 sur `/home/<user>`). Il ne faut donc ni empreinte de 40 caractères ni cache tiers : `git clone` puis `git log -p docs/discovery/11-conformite.md` suffit. ⚠️ **Et HEAD n'est plus propre non plus** : `git grep -il '<nom-editeur>'` rend **4 fichiers suivis** — `11-conformite.md`, `16-hypotheses.md`, `17-dry-run-prompt.md`, `prompt-final.md` — qui **citent le motif pour décrire la porte de CI**. Ils se traitent par une **liste blanche `docs/discovery/**`**, pas par une purge : ils décrivent la règle au lieu de la violer. Le constat « `git grep -il` = 0 » du 10/9 au matin est périmé. **Cette ligne rendait fausses D0.15b, D0.15c et H-CNF-17c.** | **Le dépôt public annulait l'anonymat LCEN.** `git log` portait l'adresse personnelle de l'éditeur sur les 24 commits, sous deux noms d'auteur ; 17 fichiers suivis contiennent des chemins `<home>/…` (dont `data/glossary.json`, 4 occurrences). `legal.license.code` envoie le public sur ce dépôt. VÉRIFIÉ (9/9). | **bloquant** | Règle : `git config user.email <id>+<pseudo>@users.noreply.github.com` et `user.name <pseudo>` ; réécriture d'historique (`git filter-repo --mailmap`) **avant** le lancement, ou dépôt neuf à historique aplati ; purge des chemins absolus (`/home/` interdit) ; test CI qui échoue si `/home/` ou une adresse e-mail apparaît dans un fichier suivi ; vérifier que le profil GitHub n'affiche ni nom réel ni e-mail public. Tant que ce n'est pas fait : **ne pas publier `/mentions-legales`**, elle donnerait un vernis juridique à un anonymat qui n'existe pas. **Correctif réel (10/9) :** (1) `git filter-repo --replace-text` sur les **26** commits, motifs = l'adresse, le nom réel, `/home/<user>` — et non `--mailmap`, qui ne touche que l'identité d'auteur ; comme GitHub continue de servir les objets devenus inatteignables, la seule purge sûre est de **supprimer et recréer le dépôt** avec un historique aplati, ou d'obtenir une purge du support GitHub. (2) Vérification archivée : `git log --all -p \| grep -ci '<nom-editeur>\|/home/<user>'` doit rendre **0**. (3) La porte de CI doit être écrite sur les **bons motifs et testée contre l'arbre courant avant d'être commitée** : `/home/[A-Za-z0-9._-]+/` — écrite « `/home/` », elle serait rouge dès le premier jour (mesuré le 10/9 : **20 fichiers suivis** contiennent `/home/`, qui est une **route de l'app** ; **0** contiennent `/home/<user>`) — plus `[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}` avec liste blanche pour `{contactEmail}` et `users.noreply`, plus le nom réel du titulaire. (4) Une **donnée personnelle de tiers** est par ailleurs republiée dans quatre fichiers suivis : `<contact-tiers>`, dans `captures/2026-09-07/melenchon2027.fr_{mentions-legales,programme2025_livre}.html`, `captures/2026-09-07/prior-art/m2027-ch12-s1.html` et `scripts/fixtures/chapitre{1-s6,12-s1}.html` — la porte échouerait dès son premier passage, et le dossier ne dit pas quoi faire de ces captures : les nettoyer, les sortir du dépôt, ou les garder. **À trancher avec la même décision que H-LAN-14** (les 7 PNG d'identité). | **ouvert, bloquant** |
| **A2** | `legal.notice.editor` affirmait « L'hébergeur détient l'identité de l'éditeur. » Aucune pièce ne l'établit : l'art. 1-1 II conditionne l'anonymat à la communication à l'hébergeur des éléments du I (**nom, prénoms, domicile, téléphone**), et remplir un profil de facturation Cloudflare n'est pas cette communication. Publier une mention légale fausse est pire que ne rien publier. | **bloquant** | Phrase retirée de `legal.notice.editor` (fait, §19.5). Nouvelle chaîne `legal.notice.editor_identity` = « Notre identité a été communiquée à l'hébergeur, qui la détient. », **rendue seulement** quand la pièce existe. Geste : envoyer à Cloudflare (formulaire de compte + `abuse@`/legal) une déclaration datée « éditeur de cestecritla.fr : nom, prénoms, domicile, téléphone », archiver l'envoi **et** l'accusé dans `captures/2026-xx-xx/lcen/`. | fait (copie) / ouvert (pièce) |
| **A3** | **Le plan B « association loi 1901 » est, pendant la campagne, pire que le mal.** L52-8 al. 1 (en vigueur depuis le 30/6/2020, lu aujourd'hui) : « Les personnes morales, à l'exception des partis ou groupements politiques, ne peuvent participer au financement de la campagne électorale d'un candidat, ni en lui consentant des dons sous quelque forme que ce soit, ni en lui fournissant des biens, services ou autres avantages directs ou indirects à des prix inférieurs à ceux qui sont habituellement pratiqués. » Une association qui publie gratuitement une app de promotion d'un programme, et qui renvoie vers la collecte officielle (`cta.official_campaign`), s'expose à la qualification d'avantage en nature d'une personne morale — avec un risque pour le compte de campagne du candidat, pas seulement pour nous. Une **personne physique** n'est pas visée par cette interdiction. VÉRIFIÉ. | **sérieux** | Amender D9.4 : **aucune création d'association entre le 1er octobre 2026 et le 2 mai 2027**. Si l'exposition devient intenable, la sortie est la publication de l'identité de la personne physique (art. 1-1 I), pas la création d'une personne morale. Retirer « plan B association 1901 » du runbook pour cette fenêtre et le réinscrire après le 3 mai 2027. | ouvert |
| **A4** | `legal.notice.host` écrivait « 101 Townsend Street » là où la source publie « 101 Townsend St ». | mineur | Aligné (fait). | fait |
| **A5** | `legal.notice.reply_right` nommait « le directeur de la publication » comme un tiers, alors que l'éditeur anonyme *est* ce directeur ; 16 mots et espace sécable avant « : » (CI rouge). | mineur | Reformulée en deux phrases (fait). | fait |
| **B1** | **Le `LICENSE` racine place le programme sous MIT.** Il écrit : « This license covers the source code only (scripts/, eval/, prototypes/, configuration) ». Or ces dossiers contiennent le texte mot pour mot : `eval/passages/*.json` (5 fichiers, ≈ 44 Ko de verbatim), `prototypes/proto/shared/data/slim.json` et `prototypes/spike-share/public/data/slim.json` (la projection complète du corpus), `prototypes/proto/shared/data/{riposte,glossary,stat-cards}.json`, `scripts/fixtures/*.html` (deux pages de melenchon2027.fr). MIT autorise l'usage commercial et la refermeture : c'est exactement ce que NC et SA interdisent (code légal §3(b), lu aujourd'hui). VÉRIFIÉ (`git ls-files`, 9/9). Titre de presse disponible : *« il a mis L'Avenir en commun sous licence MIT »*. | **bloquant** | Amender `LICENSE` : « MIT ne couvre que le code exécutable et la configuration. **Tout fichier qui reproduit le texte de *L'Avenir en commun*, où qu'il se trouve dans le dépôt — `data/`, `eval/passages/`, `eval/*.json` de questions, `prototypes/**/data/`, `scripts/fixtures/` — est sous CC BY-NC-SA 4.0**, attribution « La France insoumise – L'Avenir en commun ». » Étendre la portée de `data/LICENSE` à ces chemins (ou ajouter un `.reuse/dep5`). Test CI : un fichier contenant un identifiant `c\d{1,2}-s\d{2}` hors de la liste couverte fait échouer la CI. **État réel au 10/9/2026 (panel rouge T12) : l'amendement du `LICENSE` racine est FAIT depuis le commit `2aa766f` du 9/9** — une section « SCOPE OF THIS LICENSE » exclut de MIT tout fichier reproduisant le texte, et `14-risques.md` R11 le constatait déjà. Ce fichier, `16-hypotheses.md` H-CNF-17a et `prompt-final.md` §12 l'annonçaient encore « à amender », ce qui fait refaire du travail fait et **masque les deux moitiés qui restent** : l'historique git et le paragraphe « Exceptions » de `data/LICENSE`. Le périmètre CC doit par ailleurs être **élargi** : il nomme `eval/passages/*.json`, `scripts/fixtures/*.html` et « toute copie de `slim.json` », mais oublie `docs/discovery/captures/2026-09-07/melenchon2027.fr_programme2025_livre.{html,txt}`, qui reproduit le texte du programme **et** des pages tierces entières. | **fait (LICENSE racine, `2aa766f`) / ouvert (historique git, `data/LICENSE`, périmètre `captures/`, porte de CI)** |
| **B2** | **Le dépôt reproduit intégralement la Désintox que l'app promet de ne jamais reproduire.** `data/desintox.json` contient, pour 26 articles, `content_text` **et** `content_html` complets ; le fichier est public depuis J1 ; `data/LICENSE` place `data/` sous CC BY-NC-SA avec l'attribution « La France insoumise – L'Avenir en commun », c'est-à-dire qu'il applique à des articles tiers une licence dont on ignore si elle est la leur (D1.5 : licence non lue). La règle D9.10 « lien seulement, jamais une phrase » est donc vraie dans l'app et fausse dans le dépôt. VÉRIFIÉ (9/9). | **bloquant** (réputationnel) / **sérieux** (droit d'auteur) | Retirer `content_text` et `content_html` de `data/desintox.json` : garder `id`, `slug`, `url`, `title`, `date`, `modified`, `categories`, `word_count` — cela suffit à la détection de correspondance et au lien (`riposte.desintox_lead`). Purger le fichier de l'historique git en même temps que A1. Corriger le paragraphe « Exceptions » de `data/LICENSE` : « `data/desintox.json` ne contient que des métadonnées et des liens ; aucun texte de desintox.lafranceinsoumise.fr n'est reproduit. » Conserver `desintox_title` dans `riposte.json` : citer le titre d'un article pour le désigner est un usage nominatif, pas une reproduction — **mais `rip-11` porte `desintox_title` = « Vous êtes la France islamiste », et `desintox_note_fr` dit lui-même que ce titre n'est jamais affiché : aucune règle de build n'interdit aujourd'hui de le servir au client dans le JSON.** À ajouter à la projection de build : les champs internes de `riposte.json` (`desintox_title`, `desintox_note_fr`, `reversal_note_fr`, `revision_note_fr`, `stat_card_note_fr`, `title_note_fr`) **ne sortent pas au client**, sauf ceux qu'un écran rend explicitement — et `reversal_note_fr` n'est rendu que derrière `riposte.reversal_label`, jamais dans une page atteinte par un lien nu. **État réel au 10/9/2026 (panel rouge T12) : la réduction est faite À HEAD SEULEMENT.** `git show 16c7d82:data/desintox.json` rend les 26 `content_text`, **43 423 caractères**, et `16c7d82` est ancêtre de HEAD : le dépôt public redistribue toujours 26 articles dont la licence n'a jamais été lue. `meta.content_policy_fr` (« le texte intégral n'est ni redistribué ni versionné »), `14-risques.md` §0 point 2, R11 et `prompt-final.md` §4 affirment tous le contraire. Le seul `cited_snippets` conservé n'est d'ailleurs pas une phrase de la Désintox : c'est une phrase **du programme**, présente à l'identique dans `data/glossary.json` — à supprimer et à citer par son identifiant. | **ouvert, bloquant (historique git)** |

> ⛔ **Mis à jour le 10 septembre 2026 au soir (D13.9).** La purge a eu lieu : `data/desintox.json` a été réécrit dans les 29 commits, l'historique navigable ne porte plus aucun `content_text` (`git log main -p -- data/desintox.json | grep -c content_text` = 0). **Résidu mesuré et assumé** : GitHub sert encore l'ancien objet si l'on fournit l'empreinte exacte d'un commit devenu inatteignable (`?ref=16c7d82` rend 127 320 octets), exactement comme pour l'adresse personnelle (D0.15c). Ces empreintes n'apparaissent plus dans aucune référence. Reste ouvert : le paragraphe « Exceptions » de `data/LICENSE` décrit encore une reproduction intégrale, et la licence du site Désintox n'a toujours pas été lue (H-CNF-5, H-CNF-17b).

| **B3** | **L'analyse CC repose sur le *deed*, qui n'est pas la licence.** Le code légal §3(a)(1) exige cinq éléments : identification de l'auteur, indication de l'existence d'un droit d'auteur, **notice renvoyant à la licence**, **notice renvoyant aux limitations de garantie et exclusions**, et **un URI ou un hyperlien vers l'Œuvre**. `attribution.full`, `attribution.card` et `attribution.short` n'en portaient que deux. Sur une image partagée, l'élément (E) n'était satisfait nulle part. VÉRIFIÉ (legalcode.fr lu aujourd'hui). | **sérieux** | `attribution.card` porte désormais une URL en clair ; `attribution.source_url` et `attribution.warranty` créées (fait). Règle de rendu : `/licence` porte les cinq éléments et devient « la ressource incluant les informations requises » que §3(a)(2) autorise à référencer ; chaque surface courte pointe cette page ; la bande de signature du PNG imprime `cestecritla.fr/licence`. | fait (chaînes) / ouvert (page `/licence`) |
| **B4** | ShareAlike : `legal.license.derived` disait « nos explications, cartes, images et données » sans nommer les deux dérivés qui font débat — **l'index de recherche** et **les empreintes SHA-256**. Et §3(b) interdit d'« imposer des termes ou des conditions supplémentaires ou différents » : superposer MIT (B1) est précisément cela. | sérieux | `attribution.derivatives` et `legal.license.derived` nomment l'index de recherche et les empreintes (fait). La frontière est écrite dans `/licence`, comme le prévoit déjà §12. | fait (chaînes) |
| **B5** | Clause NC et `.fr` détenu par une personne physique : payer 8 €/an un domaine n'est pas un usage « ayant principalement pour but ou pour objectif d'obtenir un avantage commercial ou une compensation financière » (§1 du code légal). La clause n'est pas menacée aujourd'hui. Elle le devient par : cagnotte, don, sponsor, lien affilié, encart, ou reprise du dataset par un acteur commercial. | mineur | Deux règles écrites : (a) aucun revenu, jamais, pas même pour payer le domaine (déjà §5.5) ; (b) le dataset « offert » (D0.28) l'est **sous CC BY-NC-SA** : on ne peut pas relicencier ce qu'on ne détient pas — le message des trois destinataires (§9.6 de `12-positionnement`) doit le dire. | ouvert (message) |
| **C1** | **Contradiction entre deux documents du même jour.** §1 ligne 15 gèle les StatCards pendant le silence (`silence.statcard`), mais `12-positionnement-lancement.md` §9.2 écrit que « lecture, recherche, glossaire **et ripostes** restent ouverts ». Or 13 des 15 entrées de `riposte.json` portent un `stat_card_id`, et l'écran de riposte affiche la carte statistique repliée « avec ses mentions loi 77-808 » (`meta.answer_kind_fr`, `riposte.figure_label`). Afficher un chiffre de sondage à côté d'une objection politique, la veille et le jour du scrutin, est le « commentaire » que l'art. 11 al. 1 interdit. | **sérieux** | Règle unique : `effectiveDate().silence === true` ⇒ **la carte statistique est retirée du DOM partout**, y compris sur `/r/<slug>` et `/m/<id>`, et `statcard.toggle_show` n'est pas rendu. Test ajouté à `scripts/silence.test.ts` : « aux quatre bornes, aucune StatCard et aucun `riposte.figure_label` ». Corriger la phrase de `12-positionnement` §9.2 en « ripostes ouvertes, **sans les chiffres de sondage** ». | ouvert |
| **C2** | `statcard.legal.rediffusion` revendiquait le régime de l'art. 11 al. 3 (« où ce sondage était publié avant le scrutin ») alors que le **média de première diffusion est inconnu 48/48** : la condition de l'exception n'est pas réunie. Et relecture d'aujourd'hui : **aucun article de la loi 77-808 n'impose de mentions à une republication ultérieure** — l'art. 2 vise « la première publication ou la première diffusion » ; l'art. 11 al. 3 n'est utile que pendant la veille et le jour du scrutin, où les cartes sont de toute façon gelées. VÉRIFIÉ (absence). | mineur | Chaîne reformulée en « Ce chiffre est repris du livre, {chapter}. » (fait). Écrire dans §4 que le gabarit est un **choix de prudence**, pas une obligation : c'est ce qui empêche de se créer à soi-même une obligation qu'on ne peut pas tenir. | fait (copie) |
| **C3** | `statcard.legal.sample` (« {sample} personnes interrogées. ») n'avait aucune donnée : aucun champ `sample` n'existe. Une chaîne sans source finit un jour remplie de mémoire. | mineur | Chaîne supprimée, placeholder `{sample}` retiré des déclarations (fait). `{chapterNumber}`, déclaré et jamais utilisé, retiré aussi. | fait |
| **D1** | **D6.10 (extractif pur) rend fausses onze chaînes qui décrivent une IA à l'exécution** : `about.ai_line`, `about.ai_method`, `privacy.policy.02`, `privacy.policy.06`, `chat.ai_mention.*` (4), `chat.ai_badge`, `silence.chat`, `offline.chat`, `quota.*`. Publier une page intitulée « Dix lignes, toutes vraies » dont deux lignes sont fausses est la meilleure prise possible ; et annoncer une IA qui n'existe pas est le contraire exact de l'art. 50. | **bloquant** | `privacy.policy.02.local` et `about.no_ai` créées (fait). Règle de build : **une chaîne `chat.*` ou `*.ai_*` n'est rendue que si un modèle tourne à l'exécution** (`AI_MODE !== 'off'`) ; test de bout en bout qui échoue si une page publiée contient une mention IA alors que le binding `AI` est absent du `wrangler.jsonc` déployé. **Corrigé le 10/9/2026 (panel rouge T12) : la porte était écrite sur le NOM de la clé, et ratait cinq des onze chaînes qu'elle doit attraper.** Le motif « `chat.*` ou `*.ai_*` » ne couvre ni `offline.chat`, ni `silence.chat`, ni `quota.title`, ni `privacy.policy.02`, ni `privacy.policy.06` — exactement les cinq chaînes que ce constat D1 avait recensées. Deux corrections : (1) **formuler la porte sur le CONTENU** — échec de build si une chaîne effectivement rendue satisfait `/\bIA\b|intelligence artificielle|Mistral|assistant/i` alors que `AI_MODE === 'off'` ou que le binding `AI` est absent du `wrangler.jsonc` déployé ; deux exemptions nommées, `about.no_ai` (qui dit qu'il n'y en a pas) et `about.writing_method` (l'IA de **rédaction**, hors exécution, qui reste vraie) ; (2) **créer les variantes de repli manquantes**, faites en `strings.json` v0.4 : `offline.chat.local`, `silence.chat.local`, `quota.title.local`. Sans elles, une app sans IA annonçait une IA à toute personne hors ligne **et pendant les deux fenêtres de silence électoral**. Un test de `scripts/check-strings.test.ts` verrouille désormais la liste des chaînes qui nomment une IA et exige leur repli. | **fait (chaînes v0.4, test check-strings) / ouvert (règle de build sur le rendu)** |
| **D2** | **Art. 50 § 4 al. 2 : l'exception s'applique, la copie est quand même une prise.** Les cartes-concept, la FAQ et les ripostes sont du texte publié pour informer le public sur un sujet d'intérêt public, et elles ont été **préparées avec un LLM** (D0.3 ; `glossary.json` `review_status_values.verified-ai`, `counts.by_review_status.verified-ai = 5`). Le texte lu aujourd'hui exclut l'obligation « where the AI-generated content has undergone a process of human review or editorial control and where a natural or legal person holds editorial responsibility » : **aucune obligation de divulgation, VÉRIFIÉ**. Mais `about.intro` dit « Nos explications sont écrites par nous », le dépôt public documente le contraire, et le statut s'appelle littéralement `verified-ai`. Le risque n'est pas l'amende, c'est la capture d'écran. | sérieux | `about.writing_method` créée : « Nos textes sont préparés avec un outil d'IA, puis vérifiés contre le livre et relus. » — mention de mécanisme, pas réserve (test de tri de `voice.md` §3 : ni « peut », ni « ne saurait », ni « à titre indicatif », ni « n'engage »). `concept.authorship.reviewed` est conservée : elle est vraie, la responsabilité éditoriale est nôtre. À corriger dans `data/glossary.json` : `counts.by_review_status.verified-ai = 5` et `counts.reviewed_human = 5` se contredisent (D2.9). **CORRIGÉ le 10/9/2026 (panel rouge T12), et le sens de la correction était le point** : les compteurs suivent les entrées (`by_review_status` = `{draft 0, verified-ai 0, reviewed-human 5, published 0}`), parce que `review.human` est réellement rempli — relecteur : l'auteur, 9/9, sans demande de modification. `review_status_values['reviewed-human']` dit désormais **qui** a relu et rappelle que les relectures militante et non-politisée de D0.27 restent jouées par des personas (D11.1). **Reste ouvert** : le libellé du badge, `concept.authorship.reviewed` disant « relu par {reviewer} » quand `{reviewer}` et `{author}` désignent aujourd'hui la même personne. | **fait (chaîne, données) / ouvert (libellé du badge)** |
| **D3** | `chat.ai_mention.sr` échouait le contrôle « la mention dit où le modèle est hébergé ». La CI de `strings.json` était **rouge depuis la v0.2 : 5 tests sur 9 en échec**, ce que personne n'avait relevé — une porte qui ne ferme pas ne protège rien. | **sérieux** | Chaîne complétée (fait) ; les 9 tests passent (`npx tsx --test scripts/check-strings.test.ts`, 9/9 le 9/9/2026) et `npx tsc --noEmit` est propre. Règle : `scripts/check-strings.test.ts` entre dans la porte de CI de D6.5, au même titre que le rejeu du validateur. | fait |
| **E1** | `privacy.never.*` s'intitulait « Ce qu'on n'enregistre jamais » et listait « Une adresse IP » et « L'historique de lecture d'une personne ». Or les journaux HTTP de la zone (impossibles à couper, admis en `09-architecture.md` §6) contiennent l'IP **et** l'URL de chaque page lue, et nos URL sont parlantes : `/mot/<terme>`, `/r/<theme>`, `/c/<slug>`. Il existe donc, chez notre sous-traitant, un historique de lecture rattaché à une IP sur des sujets qui révèlent une opinion politique (art. 9). Le responsable de traitement répond du traitement fait par son sous-traitant : « jamais » était trop court. | **sérieux** | Titre changé en « Ce que l'app ne garde pas » et `privacy.never.host` créée : « Cette liste dit ce que l'app garde. Ce que voit l'hébergeur est à la ligne 7. » (fait). La promesse n'est pas supprimée, elle est rendue exacte. | fait |
| **E2** | `privacy.policy.03` disait « une empreinte de la question : un code tiré de ses mots, **sans la question** ». Le `qhash` est un SHA-256 de (version + termes triés) : sur l'espace des mots du programme, il s'inverse par force brute. « Sans la question » suggérait une irréversibilité qui n'existe pas. | **sérieux** | Copie corrigée (fait) : « On garde un code calculé à partir des mots de la question. Il n'est relié à personne, trente jours au plus. » Correction technique à dix lignes qui rendrait la formulation d'origine vraie : **HMAC-SHA-256 avec un secret de Worker** (`QHASH_PEPPER`, `wrangler secret put`, jamais commité, rotation annuelle) au lieu d'un SHA-256 nu. À faire en même temps que `q_cache`. | fait (copie) / ouvert (HMAC) |
| **E3** | Journal des mots inconnus (D0.22) : c'est la **dernière entrée de texte libre** de toute l'architecture. Un mot rare, un nom propre, une commune, une pathologie ou une insulte tapés dans le champ de recherche partent tels quels dans Analytics Engine. Sans identifiant, ce n'est probablement pas une donnée personnelle — mais c'est un fragment de saisie utilisateur publié dans un système d'analyse, sur un site politique. | **sérieux** | Règle : n'enregistrer que les mots présents dans une **liste blanche construite au build** (lexique du programme + dictionnaire FR ouvert) ; tout le reste incrémente un compteur unique `autre`. Cette règle rend `privacy.policy.04` littéralement vraie et supprime la dernière entrée libre de la carte des journalisations. | ouvert |
| **E4** | Turnstile « strictement nécessaire » : la page CNIL lue aujourd'hui (mise à jour 29/9/2020) rattache l'exemption aux « traceurs destinés à l'authentification auprès d'un service, y compris ceux visant à assurer la sécurité du mécanisme d'authentification, par exemple en limitant les tentatives d'accès robotisées ». **Notre chat n'a aucune authentification** : l'exemption ne joue que par analogie. Le dossier écrivait « confortée » ; c'est **PROBABLE**, pas mieux. | mineur | Sans objet tant que D6.10 tient (ni chat, ni Turnstile). Règle : **ne pas remettre Turnstile sans refaire cette analyse**, et si on le remet, préférer une mesure sans stockage (règle de zone) sur le premier envoi. | ouvert (conditionnel) |
| **F1** | **L'app elle-même n'est pas de la « promotion » au sens de L52-1.** Le texte vise « tout procédé de **publicité commerciale** par la voie de la **presse** ou par tout moyen de **communication audiovisuelle** » : publier et faire connaître gratuitement un site n'entre pas dans le champ, avant comme après le 1er octobre 2026. Ce qui entre dans le champ, c'est l'euro payé pour la visibilité. | sérieux | Deux interdits à ajouter à D9.8, absents aujourd'hui : (a) **aucun « boost » offert par un tiers** — un militant qui paie une publicité pour l'app crée la dépense qu'on s'interdit, et potentiellement une dépense de campagne ; l'écrire dans `/a-propos` et dans le kit ; (b) **aucun échange de visibilité contre service** (le troc est un avantage en nature). | ouvert |
| **F2** | QR sur tract : conclusion du §9.1 confirmée (ni presse, ni audiovisuel, ni publicité commerciale). Deux ajouts. | sérieux | (a) L49 1° interdit de distribuer tout document à partir de la veille du scrutin à zéro heure : **le flag de l'app ne couvre pas le papier**, la consigne doit figurer là où les militants récupèrent le QR ; (b) si le tract est celui d'un candidat, son coût entre dans le compte de campagne et c'est le mandataire (L52-4) et le comptable qui tranchent, pas nous — **ne jamais fournir de maquette de tract ni de kit imprimable** (déjà D9.8, à ne pas assouplir). | ouvert |
| **F3** | **Ce que le flag L49 ne peut pas arrêter, et qui n'était écrit nulle part.** (a) Les aperçus **déjà mis en cache** par WhatsApp, Telegram ou Facebook : image OG et titre continuent de s'afficher dans les conversations, sans aucune requête vers nous. (b) Les liens **déjà envoyés** : le destinataire ouvre la page, et la lecture reste ouverte par choix (D0.24). (c) Les pages **déjà mises en cache par le service worker** (PWA, `09-architecture.md` §1.6) : un écran de partage servi hors-ligne ne verra jamais un flag serveur. (d) Les fichiers `/og/*.png` et les pages statiques : `run_worker_first` ne couvre que `/api/*` (D7.1), donc un crawler d'aperçu — qui n'exécute pas JS — obtient pendant la fenêtre exactement la même carte qu'avant. | **sérieux** | (1) Le gel est calculé **côté client à chaque rendu** par `effectiveDate()`, jamais par un flag serveur seul : rendre la règle bloquante. (2) Le service worker **ne met jamais en cache** `/defi/`, `/q/`, `/j/`, ni un fragment de partage, et revalide `flags.json` au démarrage (`stale-while-revalidate` interdit sur ce fichier). (3) Pendant la seule fenêtre, étendre `run_worker_first` aux routes qui portent des balises OG (`/m/*`, `/s/*`, `/q/*`, `/defi/*`) — ou accepter et écrire la limite. (4) Écrire la phrase honnête dans §10 : **« le gel couvre ce que nous diffusons, pas ce que d'autres ont déjà copié »** — c'est défendable ; l'absence de phrase ne l'est pas. | ouvert |
| **G1** | Loi 2018-1202 : hors périmètre confirmé (L163-1 ne vise que les très grandes plateformes au sens de l'art. 33 du DSA). Le seul angle restant est L163-2 (« délibérée, artificielle ou automatisée et massive »). | mineur | Ajouter au playbook §9.4 : le compte de réseau social qui relaie l'app **ne programme pas** ses publications, n'achète rien, n'automatise rien. Un planificateur de posts suffirait à faire naître le mot « automatisée ». | ouvert |
| **H1** | Marques : le dossier conclut « risque faible » sur des captures TMview **qui ne portent pas le statut juridique** (`data.inpi.fr` en 403). On ne peut dire que : « aucune marque identique relevée, statuts non vérifiés ». Et le vrai sujet n'est pas « C'EST ECRIT » (1990) mais **« La France insoumise »**, marque FR enregistrée le 20/1/2017 en classes 16, 35, 38, 41, que l'app cite parce que la licence CC l'y oblige. | sérieux | L'usage référentiel est licite à deux conditions, à écrire dans `/licence` : (a) jamais dans le wordmark, le domaine, un `<title>`, une icône ou une carte de partage en position de marque ; (b) jamais de formulation suggérant un partenariat. Test : la CI échoue si « France insoumise » apparaît dans une clé `app.*`, `home.*.title` ou `play.card.*` autrement que dans une chaîne `attribution.*`. Reformuler la conclusion du §8 en « statuts non vérifiés ». | ouvert |
| **H2** | Ne rien déposer : confirmé, et le motif principal est ailleurs que le prix — **un dépôt nomme un titulaire au registre public** et détruit D0.15. | mineur | Écrire ce motif dans D9.11 (aujourd'hui il n'y figure qu'en troisième position). | ouvert |
| **I1** | **RGAA : sans objet.** Réponse nette en §19.3. | mineur | Ne publier **aucune** page « Accessibilité » ni taux de conformité. Chaîne `about.a11y` créée à la place (fait). | fait |
| **J1** | La ligne d'indépendance ne faisait pas son travail là où elle sert. `independence.line` disait d'où on vient, pas ce qu'on n'est pas ; `independence.about`, qui le dit, vit sur la page À propos — que le cas d'usage majoritaire (D0.4 : arrivée par lien WhatsApp) ne verra jamais. Risque : une capture de l'écran 0 qui circule comme « le site officiel du programme ». | sérieux | `independence.line` = « Projet militant indépendant. Le texte est celui du livre officiel. » (fait) — indicatif, aucun mot de la liste noire de D0.1, et visible **sur l'écran 0 par lien** (D3.9). Vérifier que « officiel » ne qualifie jamais l'app : aujourd'hui `common.official_source`, `home.link.sent_by_hint` et `q.link.hint` disent bien « livre officiel ». | fait |
| **J2** | Charte LFI « ne jamais engager le mouvement » : tenue par D3.3 (aucun logo) et par l'usage référentiel. Un point non couvert : les messages de partage pré-rédigés nomment un candidat (`share.message.cousin` : « ce que propose Mélenchon »). C'est une parole mise dans la bouche de l'utilisateur, pas la nôtre — acceptable. | mineur | Deux règles : ces messages sont gelés avec le partage pendant la fenêtre L49 (ils le sont), et figés au gel de contenu du 1er mars 2027. | ouvert |

### 19.2 Les trois constats qui ne tiennent pas dans une case

**A1 + B1 + B2 sont le même constat sous trois formes : le dépôt public n'a jamais été relu comme une publication.** Il l'est pourtant : `legal.license.code` y envoie le public, D0.28 en fait un argument, et c'est le premier endroit qu'un contradicteur ouvrira. Trois minutes de `git log`, `git grep` et `cat LICENSE` donnent aujourd'hui : le nom et l'adresse e-mail de l'éditeur, le programme de LFI sous licence MIT, et 26 articles de la Désintox reproduits intégralement sous une licence qui n'est pas la leur. Aucun de ces trois points n'a de conséquence dans l'app ; les trois ont une conséquence dans le monde réel. **Conséquence de procédure : avant le lancement, le dépôt passe la même revue que les écrans** — une ligne au runbook (§9 de `09-architecture.md`), et une porte de CI (`/home/`, adresse e-mail, identifiant de corpus hors des chemins couverts).

**C1 et F3 sont le même constat sur le silence électoral : le gel a été pensé comme un état du serveur, alors qu'il doit être un état du rendu.** Tout ce qui est pré-généré, mis en cache ou déjà copié échappe à un flag serveur. Le code fait déjà l'essentiel (`effectiveDate()` partagé client et Worker, **17 tests**) ; ce qui manque est la discipline : le gel se décide **à chaque rendu, côté client**, la carte statistique disparaît **de tous les écrans** et pas seulement des siens, le service worker n'a pas le droit de servir un écran gelable, et la limite « ce que d'autres ont déjà copié » est écrite noir sur blanc plutôt que découverte par un journaliste le dimanche du scrutin.

**D1 est un constat de synchronisation : `strings.json`, `voice.md` et ce document décrivent encore l'app d'avant D6.10.** Ce n'est pas un détail de wording : `/confidentialite` s'annonce comme « dix lignes, toutes vraies ». Une page qui se réclame de sa propre exactitude est jugée sur sa pire ligne. La règle de build (une mention IA n'existe que si un modèle tourne) est la seule façon de rendre ce type d'erreur impossible plutôt qu'improbable.

### 19.3 RGAA : la réponse nette

**Le RGAA ne s'applique pas à ce projet.** L'obligation d'accessibilité numérique vient de l'article 47 de la loi n° 2005-102 du 11 février 2005 (version en vigueur depuis le **8 septembre 2023**, lue aujourd'hui sur legifrance.gouv.fr). Il vise quatre catégories : les personnes morales de droit public ; les personnes morales de droit privé délégataires d'une mission de service public ou créées pour satisfaire des besoins d'intérêt général autres qu'industriels et commerciaux et contrôlées ou majoritairement financées par le secteur public ; les personnes morales de droit privé constituées par des organismes publics ; et « les entreprises dont le chiffre d'affaires excède un seuil défini par le décret ». **Une personne physique qui édite un site à titre non professionnel n'entre dans aucune des quatre.** VÉRIFIÉ.

Trois conséquences pratiques :

1. **Aucune obligation** de déclaration de conformité, de schéma pluriannuel, de plan annuel, ni de mention « Accessibilité : non/partiellement conforme » en pied de page.
2. **Ne pas en publier une quand même.** Une déclaration volontaire crée un engagement opposable et une prise gratuite (« déclaré partiellement conforme » se lit comme un aveu, et un taux de conformité vieillit mal). La bonne surface est une invitation, pas une déclaration : `about.a11y` = « L'app vise le niveau WCAG 2.2 AA. Signale ce qui bloque : {contactEmail}. »
3. **Le budget interne reste plus exigeant que le RGAA.** D3.5 vise WCAG 2.2 AA, quand le RGAA en vigueur repose encore sur WCAG 2.1 (le RGAA 5 est attendu fin 2026). La seule obligation d'accessibilité qui pourrait réellement viser l'app est l'art. 50 § 5 de l'AI Act (« The information shall conform to the applicable accessibility requirements ») — et seulement si une IA revient à l'exécution.

### 19.4 Décisions proposées par cette revue

| ID | Décision | Statut | Preuve |
|---|---|---|---|
| **D9.15** | **Mention IA : la variante retenue est `chat.ai_mention.v1`** — « Réponses assemblées par une IA française (Mistral, hébergée chez Cloudflare) à partir du texte officiel. » (104 caractères). Panel de 5 juges, critères (a)-(e) du §2.3 : v1 obtient **5/5 « non-disclaimer »**, 5/5 « j'ai compris que c'est une IA en moins de 3 s », 5/5 « j'ai retenu Mistral », total 19 — première sur les trois critères et sur le total. v3 passe aussi le seuil (5/5 non-disclaimer, 4/5 compréhension, 5/5 Mistral, total 14,5) ; **v2 échoue** le critère (b) à 2/5. Le seuil de ≥ 4/5 en « non-disclaimer » est donc atteint, aucune réécriture n'est nécessaire. La gagnante devient la chaîne `chat.ai_mention` ; v2 et v3 restent en KV comme wording de secours (D7.10). **La mention n'est rendue que si un modèle tourne à l'exécution** : sous D6.10 (extractif pur), elle n'est affichée nulle part. | DÉCISION (vote) / conditionnelle (D6.10) | votes du panel ; `design/strings.json` v0.3 ; art. 50 §§ 1 et 5 lus le 9/9 |
| **D9.15 bis** | **Réserve d'exactitude sur v1, à trancher séparément.** Sous le contrat « sélection pure » (D6.3) comme en extractif, le modèle **ne rédige rien** : il choisit des identifiants, et les phrases viennent de `strings.json`. « Réponses **assemblées** par une IA » sur-décrit donc son rôle, là où v3 (« retrouve le passage exact ») et v2 (« Elle ne les écrit pas ») disent juste. La sincérité de la mention est une exigence de l'art. 50, pas une coquetterie. Réécriture proposée si l'on veut l'exactitude sans perdre la compréhension : **« Passages choisis par une IA française (Mistral, hébergée chez Cloudflare) dans le texte officiel. »** (97 caractères, nomme Mistral, impersonnelle). Elle **doit être rejugée** par le même panel avant de remplacer v1 : elle n'a pas été soumise au vote. | PROPOSÉE — à rejuger | `08-ia.md` §5, D6.3 ; `eval/results-v2.md` |
| **D9.16** | **`design/strings.json` passe en v0.3** : 344 clés (+9, −1), clés triées, typographie normalisée, les 9 tests de `scripts/check-strings.test.ts` passent (ils étaient **5 en échec** depuis la v0.2) et `npx tsc --noEmit` est propre. Détail des chaînes en §19.5. `scripts/check-strings.test.ts` entre dans la porte de CI de D6.5. | DÉCISION (sur pièces) | `npx tsx --test scripts/check-strings.test.ts` 9/9 et `npx tsc --noEmit`, 9/9/2026 ; **remesuré 18/18 le 10/9/2026**, kit en v0.5 |
| **D9.17** | **Le dépôt public est une publication et passe la même revue que les écrans avant le lancement** : identité d'auteur pseudonymisée et historique réécrit (A1), MIT limité au code (B1), Désintox réduite aux métadonnées (B2), porte de CI qui rejette `/home/`, une adresse e-mail, ou un identifiant de corpus dans un fichier non couvert par CC. | PROPOSÉE | `git log`, `git ls-files`, `LICENSE`, `data/LICENSE` lus le 9/9 |
| **D9.18** | **Pas d'association loi 1901 entre le 1er octobre 2026 et le 2 mai 2027** (L52-8 : interdiction faite aux personnes morales de fournir à un candidat des biens, services ou avantages à des prix inférieurs aux prix habituels). Si l'anonymat devient intenable, on publie l'identité de la personne physique (art. 1-1 I), on ne crée pas une personne morale. **Amende D9.4.** | PROPOSÉE | L52-8 lu le 9/9 |
| **D9.19** | **Le gel L49 est un état du rendu, pas du serveur** : calculé côté client à chaque rendu ; la carte statistique disparaît de **tous** les écrans, ripostes comprises ; le service worker ne sert jamais un écran gelable ; la limite « ce que d'autres ont déjà copié » est écrite dans §10. **Amende D9.7 et corrige `12-positionnement` §9.2.** | PROPOSÉE | loi 77-808 art. 11 et L49 lus le 9/9 ; `data/riposte.json` |

### 19.5 Ce qui a été changé dans `design/strings.json` (v0.2 → v0.3)

**Amendées (14)** — `attribution.card` (URL en clair sur la bande de signature, B3), `attribution.derivatives` et `legal.license.derived` (index de recherche et empreintes nommés, B4), `chat.ai_mention.sr` (nomme Cloudflare, D3), `independence.line` (dit aussi ce que l'app n'est pas, J1), `legal.notice.editor` (l'affirmation non prouvée est retirée, A2), `legal.notice.host` (« 101 Townsend St », A4), `legal.notice.reply_right` (plus de directeur de publication tiers, 14 mots, A5), `privacy.never.title` (« Ce que l'app ne garde pas », E1), `privacy.policy.03` (plus de « sans la question », E2), `privacy.policy.06` (phrase de 16 mots coupée), `privacy.policy.09` (espace insécable), `statcard.legal.missing` (phrase de 17 mots coupée), `statcard.legal.rediffusion` (ne revendique plus l'art. 11 al. 3, C2).

**Créées (9)** — `about.a11y` (I1), `about.no_ai` (D1), `about.writing_method` (D2), `attribution.source_url` et `attribution.warranty` (B3), `chat.ai_mention` (D9.15), `legal.notice.editor_identity` (A2, non publiée tant que la pièce manque), `privacy.never.host` (E1), `privacy.policy.02.local` (D1).

**Supprimée (1)** — `statcard.legal.sample` (C3). Placeholders `{sample}` et `{chapterNumber}` retirés des déclarations ; `{contactEmail}` et `{repoUrl}` enfin déclarés (ils faisaient échouer la CI depuis la v0.2).

**Global** — toutes les clés triées, tous les espaces avant « : ; ! ? » et après « « » normalisés en U+00A0 par script.

### 19.6 Ce qui reste ouvert après cette revue

Par ordre de coût si on se trompe : **A1** (identité dans le dépôt) et **B1/B2** (licences du dépôt) avant toute mise en ligne ; **D1** (règle de build « pas de mention IA sans IA ») avant la première page publiée ; **C1/F3** (gel du rendu) avant le 1er mars 2027 ; **E2/E3** (HMAC, liste blanche des mots) avant la v2 ; **A3/F1/H1** (association, boost offert, statut des marques) comme règles écrites. Reste hors de portée d'une revue sur pièces, et à faire trancher par un humain : la qualification de Cloudflare comme hébergeur au sens de la LCEN (le « might qualify » reste le meilleur texte public), et la question de savoir si l'AFNIC et OVHcloud accepteraient une réquisition sans lever autre chose que ce que le dépôt public donne déjà.

### 19.7 Sources primaires lues pour cette revue, le 9 septembre 2026

- Code légal CC BY-NC-SA 4.0 (français), sections 1, 3(a) et 3(b) — https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode.fr (le *deed* n'est pas la licence)
- Loi n° 2005-102 du 11 février 2005, **article 47** (accessibilité, version en vigueur depuis le 8/9/2023) — https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000809647/
- Code électoral, **L52-8** (version en vigueur depuis le 30/6/2020) — https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039446180
- Code électoral, **L52-4** (mandataire financier) — https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000047088161 — **PROBABLE** (lu par résumé de Legifrance, pas verbatim)
- Loi n° 77-808 du 19 juillet 1977, **articles 2, 3 et 11** relus en entier — https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000522846/ (constat d'absence : aucun article n'impose de mentions à une republication ultérieure)
- Règlement (UE) 2024/1689, **article 50 §§ 1, 2 et 4** — https://artificialintelligenceact.eu/article/50/
- CNIL, « Cookies et traceurs : que dit la loi ? » (page mise à jour le 29/9/2020) — https://www.cnil.fr/fr/cookies-et-autres-traceurs/regles/cookies/que-dit-la-loi ; lignes directrices art. 82 — https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000042388179

**Pièces locales** : `git log --format='%an <%ae>'` et `git ls-files` (A1, B1) ; `git grep -n "<home>"` (17 fichiers) ; `data/desintox.json` (`content_text`, `content_html`, 26 posts) ; `data/riposte.json` (13 entrées sur 15 avec `stat_card_id`) ; `data/glossary.json` (`counts.by_review_status`) ; `LICENSE`, `data/LICENSE` ; `npx tsx --test scripts/check-strings.test.ts` (5 échecs avant, 9/9 après) ; `npx tsc --noEmit`.
