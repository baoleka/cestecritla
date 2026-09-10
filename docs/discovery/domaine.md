# Domaine cestecritla.fr — mise en service (D10.2)

**Fait le 9 septembre 2026** : achat OVH 08:12 UTC (RDAP : registrar OVH, titulaire « Ano Nymous », expiration 9/9/2027), zone Cloudflare `596d44c8…` active 09:10 UTC (NS craig / gracie.ns.cloudflare.com), Worker `aec-spike-share` rattaché à `cestecritla.fr` et `www.cestecritla.fr`, certificat émis, HTTPS 200 sur `/`, `/m/…`, `/og/…`, `/diag`. Le reste de ce document est conservé comme procédure. Le token wrangler n'a pas le droit de créer une zone (`9109 Invalid access token`) : les trois étapes ci-dessous sont à faire à la main, une seule fois.

## 0. Acheter le domaine chez OVHcloud (10 min)

1. https://www.ovhcloud.com/fr/domains/ → chercher `cestecritla.fr` (libre en RDAP le 9/9).
2. Panier en « Domaine seul » ; refuser hébergement, e-mail, DNS Anycast, SSL payant (Cloudflare fournit DNS et certificat gratuitement).
3. Vérifier le prix de renouvellement (6-8 € HT) ; 1 an.
4. Compte OVH : identité réelle exigée par l'AFNIC (nom, adresse, e-mail, téléphone), **non publiée** au whois pour un particulier (D0.15).
5. Laisser la zone DNS OVH par défaut (remplacée par Cloudflare ensuite).
6. Paiement, puis validation par e-mail ; activation en quelques minutes à quelques heures.

## 1. Ajouter le site dans Cloudflare (2 min)

Dashboard Cloudflare → compte **baoleka** → « Add a domain » → `cestecritla.fr` → plan **Free** → « Quick scan for DNS records » (il n'y a rien à importer) → Continue. Cloudflare affiche **deux serveurs de noms** de la forme `xxx.ns.cloudflare.com`. Les noter.

## 2. Changer les serveurs de noms chez OVH (2 min, propagation 1 à 24 h)

Espace client OVH → Noms de domaine → `cestecritla.fr` → onglet **Serveurs DNS** → « Modifier les serveurs DNS » → remplacer les deux `dnsXX.ovh.net` par les deux serveurs Cloudflare → Appliquer. Ne rien créer dans la zone OVH.

Quand Cloudflare affiche le statut **Active** (courriel « cestecritla.fr is now active »), la zone est prête.

## 3. Ce que je fais ensuite (automatisable avec le token wrangler)

- Rattacher le spike au domaine : `routes: [{ pattern: "cestecritla.fr", custom_domain: true }]` dans `prototypes/spike-share/wrangler.jsonc`, redéploiement, certificat automatique.
- Vérifier l'`og:image` en HTTPS sur le domaine final, puis te redonner les 8 liens à renvoyer sur WhatsApp / Telegram / Instagram (grille `06-partage.md` §5) : l'aperçu sur le domaine final est le seul qui compte (D4.3 était sur workers.dev).
- Réglages de zone à documenter en T7 : **Bot Fight Mode DOIT rester OFF**, SSL « Full (strict) », « Always Use HTTPS », HSTS après validation.

  > ⛔ **Corrigé le 10 septembre 2026 — panel rouge T12.** Cette ligne disait « règle “skip” sur `/og/*` et les pages de partage si besoin » : **ce repli n'existe pas.** Bot Fight Mode (version gratuite) **ne tourne pas sur le Ruleset Engine** : il ne peut être ni contourné ni « skippé » par une règle WAF personnalisée ni par une Page Rule ; **seul Super Bot Fight Mode, payant et exclu par D0.2 / D0.31, accepte les règles Skip** (VÉRIFIÉ, https://developers.cloudflare.com/bots/get-started/bot-fight-mode/, lu le 9/9/2026). Le jour où 100 000 personnes reçoivent le lien, si Bot Fight Mode est ON, les crawlers d'aperçu peuvent être défiés, les aperçus WhatsApp / Telegram tombent, et **la boucle virale — seul canal de diffusion du produit (D0.4) — meurt**, sans autre correctif qu'un bouton ON/OFF au dashboard. L'état réel de la zone n'a jamais été lu (H-PAR-3, H-PLA-16). Ligne de runbook : « **aperçus cassés → premier réflexe : Security → Bots** ».
  >
  > **Audit de zone à élargir au-delà de Bot Fight Mode et NEL**, avant la v1 puis à chaque changement, **une capture datée par réglage** dans `docs/discovery/captures/` (liste obligatoire de `09-architecture.md` §10.2) : **Security Level** (un managed challenge sur `/m/<id>` un dimanche de scrutin est **indistinguable d'une panne** pour le visiteur), **Browser Integrity Check**, **Hotlink Protection**, **Always Online**, Bot Fight Mode.
- Adresse de contact `contact@cestecritla.fr` via **Email Routing** (gratuit, D0.15 : aucune identité publiée) — activation au dashboard (Email → Email Routing → Enable), puis destination = ton adresse.

## Coût

Domaine : ≈ 5-8 € HT par an chez OVH (renouvellement à vérifier avant avril 2027). Zone, DNS, certificat, Worker, Email Routing : 0 €.
