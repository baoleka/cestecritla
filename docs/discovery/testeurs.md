# Tests utilisateurs — personas-agents (D11.1) et protocole humain d'avant lancement

> Lancé à J0 (7 septembre 2026) comme recrutement de testeurs humains (D0.8, D0.30, D0.33). **Amendé le 9 septembre 2026 par D11.1** : jusqu'au développement complet, les deux sessions du plan sont jouées par des **personas-agents** définis dans `eval/personas.json` ; les invitations n'ont pas été envoyées. Le protocole humain ci-dessous est conservé tel quel et **à rejouer avec des humains avant lancement** : tout ce qui n'est validé que par personas reste étiqueté HYPOTHÈSE (personas) dans le dossier et dans `prompt-final.md`.

## Effectif : personas-agents (D11.1)

Les profils visés par le plan (3-5 militants, 2-3 non-politisés, Android et iPhone) sont couverts par sept fiches dans `eval/personas.json` (`meta.decision`, `meta.usage_fr`, `meta.grid_columns`) : M1 Camille (34, militante pressée, Galaxy A54), M2 Karim (45, militant sceptique, iPhone 13), M3 Léa (24, jeune militante, iPhone 15, Instagram), M4 Jean-Marc (62, militant retraité, Redmi Note 12, police agrandie), N1 Yanis (22, non politisé, Redmi Note 11), N2 Martine (58, indécise méfiante, iPhone SE 2022), N3 Théo (19, abstentionniste, Galaxy A14, navigateur Instagram). Chaque agent reçoit sa fiche, les captures réelles (PNG) et la grille ci-dessous ; il répond à la première personne et remplit la matrice tâche × persona × temps × verbatim.

Résultats : session 1 (9/9) dans `13-tests-humains.md` §1, analyse et décisions proposées dans `05-direction-artistique.md` ; session 2 (11/9) dans `13-tests-humains.md` §3. Limites de la méthode : `13-tests-humains.md` §2.

## Protocole humain — à rejouer avec des humains avant lancement

Aucune donnée personnelle conservée : pas d'enregistrement audio/vidéo, prénoms remplacés par un code (M1…M5 militants, N1…N3 non-politisés), verbatims notés à la main sans identifiant.

### Effectif visé

| Profil | Nombre | Rôle | Téléphone |
|---|---|---|---|
| Militants LFI (Camille pressée, sceptique 45 ans…) | 3-5 | Riposte 10 s, « lequel tu envoies ? », « honte à partager ? » | ≥ 1 Android + ≥ 1 iPhone |
| Non-politisés (Yanis 22 ans, Martine méfiante) | 2-3 | Arrivée par lien WhatsApp sans contexte, aha règle verte, réexplication d'un terme | ≥ 1 Android + ≥ 1 iPhone |

Format d'origine (D0.30) : session 1 de 30-45 min en soirée, session 2 de 20 min par personne (5-8 personnes). Pour le test d'avant lancement, les deux sessions peuvent être jouées en une fois sur l'app réelle (≈ 45 min par personne).

### Message d'invitation (WhatsApp, à adapter)

**Militant·es :**

> Salut ! Je bosse sur une appli perso pour faire découvrir l'Avenir en commun 2025 et donner des munitions sourcées en 10 secondes. J'ai besoin de toi 30-45 min avec ton téléphone (WhatsApp ouvert). Tu regardes des écrans, tu me dis ce que tu enverrais à ton cousin et ce qui te ferait honte. Rien n'est enregistré, pas de compte, pas de données. Ça te dit ?

**Non-politisé·es :**

> Salut ! Je teste une appli qui explique un programme politique en 3 minutes (c'est pour un projet perso, pas pour te convaincre de quoi que ce soit). J'ai besoin de toi 20 min : je t'envoie un lien sur WhatsApp, tu l'ouvres, tu me dis ce que tu comprends et ce qui t'ennuie. Aucune donnée collectée, pas d'inscription. Partant·e ?

### Déroulé

**Session 1 (30-45 min, en groupe ou individuel)**
1. 5 s sur chaque accueil des 3 directions (A éditorial, B ludique, C immersif) : « lequel tu envoies à ton cousin ? », « lequel a l'air officiel ? », « lequel te ferait honte ? »
2. Aha « règle verte » chronométré sur les 3 anatomies de carte-concept (dense / progressive / explorable) ; réexpliquer le terme en < 60 s.
3. tu / vous : deux versions du même écran, préférence et raison.
4. Mascotte : tortue originale vs aucune, réaction spontanée (protocole §4 de `design/illustration-rules.md` : reconnaissance à 512 et 24 px, trois mots, « c'est la tortue de Mélenchon ? », nom ou anonymat).

**Session 2 (20 min par personne)**
1. Lien reçu **dans** WhatsApp ou Instagram, ouvert depuis l'app de messagerie (pas depuis un navigateur).
2. Prototype des 2 mécaniques finalistes : temps jusqu'au premier verbatim de section.
3. Riposte chronométrée (militants) : trouver la réponse à une objection en < 10 s.
4. StatCard : compréhension des mentions sondage (loi 77-808) — « Devine le % » est sorti des mécaniques (D5.5).
5. Refus du chat et mode dégradé : « ça a l'air d'une panne ? »
6. Partage réel : envoyer la carte à un proche non militant, observer l'aperçu.

**Session 3 — ajoutée le 10 septembre 2026 (panel rouge T12, `13-tests-humains.md` §5 « Panel rouge (T12) »). Six tâches que le protocole ne portait pas, et dont quatre sont éliminatoires.**

1. **« Non officiel », sans avoir défilé — ÉLIMINATOIRE.** Montrer l'écran 0 par lien pendant 5 s, sans défilement possible, puis demander : « **c'est officiel ou pas ? qui a fait ça ?** » **Seuil : ≥ 4/5, dont ≥ 2 non-politisés, répondent « pas officiel ». Sinon on ne lance pas.** Raison : dans les 344 chaînes de la v0.3, « officiel » apparaissait **six fois** et « non officiel » **jamais**, pendant que le concurrent direct affiche « Outil citoyen non officiel ».
2. **Même équipe ou pas ? — ÉLIMINATOIRE, 2 secondes.** Deux captures **côte à côte**, l'en-tête de `cestecritla.fr` et celui de `melenchon2027.fr`, une seule question : « **même équipe ou pas ?** » **Seuil : ≥ 4/5 « pas la même »**, sinon le wordmark repart au dessin. Raison : il reprend **trois attributs sur trois** de la grammaire du wordmark de campagne (capitales italiques inclinées, ombre pleine décalée, dernier mot en Rouge, en haut à gauche) — jamais posés côte à côte devant un testeur.
3. **La mascotte, sur son rôle et pas sur son dessin.** Montrer la **jauge de progression avec la mascotte**, et demander — **avant** de nommer melenchon2027.fr — « **ça te fait penser à quelque chose que tu as déjà vu sur un site de campagne ?** ». Le départage du §2.10 de `design/illustration-rules.md` n'a jugé que le **dessin** ; le **rôle** (une tortue qui pousse une barre de progression) est exactement celui de la tortue officielle.
4. **Deux arrivées par lien SANS carte-concept ni riposte**, tirées au sort, avec la même tâche de réexplication que la règle verte. Toute la promesse « comprendre en trois minutes » n'a été éprouvée que sur `link/?id=c12-s01-k01`, l'une des **15 sections sur 89** couvertes par les 5 cartes existantes : **l'expérience majoritaire n'a jamais été testée**.
5. **Le comportement de substitution — AVANT toute démonstration de l'app**, 10 min par personne. « **Montre-moi, là, maintenant, sur ton téléphone, ce que tu fais pour répondre à cette objection.** » Chronométrer, compter les taps, noter l'outil (lien de section officiel, capture d'écran, recherche dans la boucle WhatsApp, Désintox, de mémoire). C'est le seul étalon du gain réel de `/m/<id>` sur le `/s1/` officiel — jamais relevé nulle part dans le dossier.
6. **La réutilisation, par comptage et jamais par opinion (H-LAN-13).** Aux **mêmes personnes**, au **J+21 de la bêta** puis **14 jours après le lancement** : « **combien de fois tu l'as ouverte depuis ? pour quoi ? et combien de liens tu as envoyés que personne ne t'a demandé d'envoyer ?** » Réponses consignées **par écrit**. **Critère écrit AVANT la séance : ≥ 3/5 l'ont ouverte ≥ 2 fois sans qu'on le leur demande, et ≥ 2 ont envoyé un lien de leur propre initiative.** Ne jamais remplacer cette question par « est-ce que tu reviendrais ? » : un persona-agent ne se lasse pas, et une personne interrogée sur une intention dit oui.

### Grille de saisie (matrice tâche × personne × temps × verbatim)

Mêmes colonnes que `eval/personas.json` `meta.grid_columns`, pour comparer directement humains et personas.

| Tâche | Personne (code) | Appareil / app d'entrée | Temps (s) | Réussite | Enverrait / officiel / honte | Verbatim (sans identifiant) |
|---|---|---|---|---|---|---|
| | | | | | | |

Seuils (plan T3/T11, `illustration-rules.md` §4, **plus les quatre seuils éliminatoires de la session 3**) : ≥ 5 personnes dont ≥ 2 non-politisées ; aha < 60 s sur ≥ 3 personnes ; mascotte reconnue ≥ 4/5 à 512 px et ≥ 3/5 à 24 px ; « on dirait le site officiel » = signal à corriger ; toute ligne rouge D0.32 = zéro éliminatoire. Tout ce qui n'est pas testé avec des humains reste **HYPOTHÈSE (personas)** dans le dossier et dans `prompt-final.md`.
