# Labo « turnstile » — Turnstile invisible sur Worker gratuit (T7)

Prototype jetable de la session de découverte (`docs/discovery/PLAN-SESSION.md`, T7 : « Turnstile invisible (cookies documentés) », « CSP stricte compatible Turnstile »). Il sert de pièce pour D0.22 (traceurs strictement nécessaires) et T9 (politique de confidentialité), et donne le coût CPU du chemin de vérification.

Déployé le 9/9/2026 sur **https://lab.cestecritla.fr/** (Worker `aec-lab-turnstile`, custom domain, DNS et certificat créés par Cloudflare). Widget Turnstile **existant** (créé au dashboard par l'utilisateur, hostname `cestecritla.fr`, sitekey `0x4AAAAAAEt3fczgKFO-ViPf`) ; aucun widget créé par le labo.

## 1. Ce qui est construit

| Pièce | Fichier | Rôle |
|---|---|---|
| Page statique | `public/index.html`, `public/app.js`, `public/style.css` | Charge `https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad&render=explicit`, rend le widget en explicite (`action: lab-verify`, `appearance: interaction-only`, `language: fr`), remplit `window.__lab` (jeton, horodatages, erreurs, violations CSP) et poste le jeton à `/verify` par `fetch`, puis rejoue le même jeton (test « usage unique »). Aucun script inline. |
| CSP statique | `public/_headers` | `default-src 'none'; script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self'; style-src 'self'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'` + Referrer-Policy, nosniff, COOP, Permissions-Policy. Ne s'applique **qu'aux assets statiques** (doc : jamais aux réponses du Worker, même avec `run_worker_first`). |
| Worker | `src/index.ts` | `POST /verify` : lit `cf-turnstile-response` (formulaire ou JSON, corps ≤ 8 Ko, jeton ≤ 2 048 car.), appelle **siteverify** avec le secret (`TURNSTILE_SECRET`, posé par `wrangler secret put`), délai 10 s, échec fermé, puis exige `success`, `action === lab-verify` et `hostname ∈ {lab.cestecritla.fr}` ; renvoie `{ ok, reason, success, hostname, challenge_ts, action, cdata, "error-codes", ephemeral_id_present, remoteip_sent, siteverify_ms }`. `remoteip` **non envoyé** par défaut (`TURNSTILE_SEND_REMOTEIP=false`). Journal : résultat, codes d'erreur, latence — jamais de jeton, d'IP ni d'UA. |
| Variante nonce | `GET /nonce` | Même page servie par le Worker avec un nonce par requête sur chaque `<script>` et `script-src 'nonce-…' 'strict-dynamic'` (approche recommandée par la référence CSP de Turnstile). |
| Variante témoin | `GET /nocsp` | Même page **sans aucune CSP**, pour distinguer un blocage CSP d'un échec de défi. |
| Sonde | `scripts/probe.ts` | Playwright : Pixel 7 émulé (UA Chrome Android, tactile), `fr-FR`, Europe/Paris ; modes `headless-shell`, `chromium-headless`, `chromium-headed`, `chromium-headed-noautomation`, `firefox`, `webkit`. Enregistre chaque requête (hôte, type, statut, `Set-Cookie`), tous les cookies du contexte (tous domaines), `localStorage`/`sessionStorage`/`document.cookie`/IndexedDB **dans chaque frame, y compris l'iframe cross-origin du défi**, les violations CSP, la console, les captures ; recharge la page et compare le stockage. |
| Mesure CPU | `scripts/cpu.ts` | GraphQL `workersInvocationsAdaptive` (même méthode que `06-partage.md` §2.3), token OAuth wrangler lu à l'exécution dans `~/.config/.wrangler/config/default.toml`, jamais affiché. |

Config : `wrangler.jsonc` (assets `./public`, `run_worker_first: ["/verify", "/nonce", "/nonce/", "/nocsp", "/nocsp/"]`, `workers_dev: false`, `observability.logs.invocation_logs: false` — D0.22), `tsconfig.json` (Worker, strict, `Env` généré par `wrangler types --strict-vars=false`), `tsconfig.scripts.json` (scripts Node), `tsconfig.public.json` (`app.js` vérifié en JSDoc strict contre `scripts/types/turnstile-global.d.ts`).

## 2. Lancer

```sh
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"   # wrangler 4 exige Node ≥ 22
cd prototypes/labo-plateforme/turnstile
npm install
npm run types && npm run typecheck                          # Env généré ; strict, sans any
npx tsc --noEmit -p tsconfig.scripts.json && npx tsc --noEmit -p tsconfig.public.json
npm run deploy                                              # crée lab.cestecritla.fr (custom domain)
npx wrangler secret put TURNSTILE_SECRET < ~/.aec-turnstile-secret   # jamais affiché, jamais commité
curl -s -X POST https://lab.cestecritla.fr/verify -d 'cf-turnstile-response=XXXX.DUMMY.TOKEN.XXXX'  # attendu : invalid-input-response (secret valide)
npm run probe                                               # LAB_MODES=…, LAB_VARIANTS=/,/nonce,/nocsp ; sortie dans out/
npm run cpu -- 2026-09-09T13:08:00Z 2026-09-09T13:08:59Z    # quantiles CPU/wall de la fenêtre
```

`.dev.vars` (ignoré par git) contient la clé secrète de test Cloudflare `1x0000000000000000000000000000000AA` (siteverify **réussit toujours**, avec `hostname: example.com` — donc la porte du Worker refuse quand même en `hostname-mismatch`, vérifié en `wrangler dev` le 9/9 ; la clé « échoue toujours » est `2x…AA`, https://developers.cloudflare.com/turnstile/troubleshooting/testing/) : elle ne sert qu'au typage et à `wrangler dev`. Firefox pour Playwright : `npx playwright install firefox` (110 Mo, dans `~/.cache/ms-playwright/firefox-1543`).

## 3. Mesures (9 septembre 2026, 12:57-13:15 UTC)

Statuts : VÉRIFIÉ = mesuré aujourd'hui, commande ou URL citée ; INFIRMÉ ; PROBABLE ; HYPOTHÈSE. Pièces : `docs/discovery/captures/2026-09-09/labo-turnstile/` (`playwright-runs.redacted.json` = les 9 passes, valeurs de stockage tronquées ; `headers-*.txt` ; `verify-dummy-token.json` ; `latences-curl-*.txt` ; `cpu-graphql.md` ; capture PNG).

### 3.1 Déploiement

| Fait | Valeur | Statut |
|---|---|---|
| Bundle Worker | 4,88 Kio brut / 1,95 Kio gzip ; démarrage 4-5 ms (`wrangler deploy`) | VÉRIFIÉ |
| Custom domain `lab.cestecritla.fr` | créé au premier `deploy` (DNS + certificat), HTTPS OK ≈ 50 s après | VÉRIFIÉ |
| Secret | `wrangler secret put TURNSTILE_SECRET < fichier` : wrangler applique `trimTrailingWhitespace` au stdin (lu dans `node_modules/wrangler/wrangler-dist/cli.js`), le saut de ligne final du fichier est sans effet ; `secret list` → `TURNSTILE_SECRET (secret_text)` | VÉRIFIÉ |
| Secret valide | jeton factice → `{"success":false,"error-codes":["invalid-input-response"]}` en **8 ms** de siteverify (pas `invalid-input-secret`) | VÉRIFIÉ (`verify-dummy-token.json`) |
| Garde-fous | sans jeton → 403 `missing-or-malformed-token` ; `GET /verify` → 405 ; réponses JSON `Cache-Control: no-store`, `nosniff`, `CSP default-src 'none'` | VÉRIFIÉ |
| Widget lisible par l'API ? | `wrangler turnstile widget get <sitekey>` → **`Authentication error [code: 10000]`** : le token OAuth wrangler n'a pas le scope Turnstile (comme billing/AI Gateway, `outillage.md` #4). Mode « invisible » du widget = **DÉCLARÉ** par l'utilisateur, non relu | VÉRIFIÉ (erreur) / DÉCLARÉ (mode) |
| Static Assets hors compteur Worker | fenêtre 12:57-13:20 : 86 invocations relevées pour ≈ 91 requêtes passées par le Worker (`/verify`, `/nonce`, `/nocsp`) et ≈ 27 `GET /` statiques en plus ; l'échantillonnage adaptatif rend le compte approché, mais les statiques (servis `cf-cache-status: HIT` sans invoquer le Worker) ne s'y ajoutent pas | PROBABLE (arithmétique sur données échantillonnées) |

### 3.2 CSP stricte compatible Turnstile

| Variante | En-tête | api.js chargé | iframe du défi chargée | Violations CSP (`securitypolicyviolation`) | Statut |
|---|---|---|---|---|---|
| `/` (allowlist, `_headers`) | `script-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; connect-src 'self'; style-src 'self'; default-src 'none'…` | oui (302 → `/turnstile/v0/g/330e41bb475c/api.js`, 200) | oui (`/cdn-cgi/challenge-platform/h/g/turnstile/f/…`, 200) | **0** sur 4 passes | VÉRIFIÉ |
| `/nonce` (nonce + `strict-dynamic`) | `script-src 'nonce-…' 'strict-dynamic'; frame-src https://challenges.cloudflare.com; …` | oui | oui | **0** sur 4 passes | VÉRIFIÉ |
| `/nocsp` (témoin) | aucune | oui | oui | — | VÉRIFIÉ |

Le minimum documenté (`script-src` + `frame-src` sur `https://challenges.cloudflare.com`) suffit : ni `connect-src challenges.cloudflare.com`, ni `style-src 'unsafe-inline'`, ni `img-src` tiers ne sont nécessaires dans la page hôte (les requêtes `fo`/`pat`/`ci`/`i` partent **de l'iframe**, régie par la CSP de Cloudflare, pas par la nôtre). Les scripts `blob:` observés sont créés dans l'iframe. `_headers` ne couvre pas les réponses du Worker : les routes API posent leurs en-têtes elles-mêmes — VÉRIFIÉ (doc lue le 9/9 : https://developers.cloudflare.com/workers/static-assets/headers/, « Custom headers defined in the `_headers` file are not applied to responses generated by your Worker code »). Le mode pré-clearance (non utilisé) exigerait `connect-src 'self'` (déjà présent) — doc https://developers.cloudflare.com/turnstile/reference/content-security-policy/ (mise à jour 5/5/2026).

### 3.3 Le défi passe-t-il en automatisation ? **Non : 9 passes, 9 échecs `600010`**

| Mode Playwright 1.63 | Variante | Moteur | Script chargé | Widget rendu | Verdict du défi | Cookies | Violations CSP |
|---|---|---|---|---:|---:|---:|---:|---:|
| `headless-shell` (headless « ancien ») | `/` | Chromium 153.0.8010.12 | 257 ms | 262 ms | **erreur 600010 à 2 478 ms** | 0 | 0 |
| `headless-shell` | `/nonce` | Chromium 153 | 268 ms | 274 ms | 600010 à 2 764 ms | 0 | 0 |
| `headless-shell` | `/nocsp` | Chromium 153 | 336 ms | 341 ms | 600010 à 2 942 ms | 0 | 0 |
| `chromium-headless` (nouveau headless) | `/` | Chromium 153 | 256 ms | 261 ms | 600010 à 2 453 ms | 0 | 0 |
| `chromium-headless` | `/nonce` | Chromium 153 | 178 ms | 183 ms | 600010 à 2 177 ms | 0 | 0 |
| `chromium-headed` (fenêtre réelle, `DISPLAY=:0`) | `/` | Chromium 153 | 1 328 ms | 1 335 ms | 600010 à 3 917 ms | 0 | 0 |
| `chromium-headed` | `/nonce` | Chromium 153 | 231 ms | 240 ms | 600010 à 2 831 ms | 0 | 0 |
| `chromium-headed-noautomation` (sans `--enable-automation`) | `/` | Chromium 153 | 348 ms | 356 ms | 600010 à 3 392 ms | 0 | 0 |
| `firefox` (headless, UA natif) | `/` | Firefox 155.0 | 657 ms | 668 ms | 600010 à 3 053 ms | 0 | 0 |

- `600***` = « Generic challenge failure », à réessayer (doc codes d'erreur, 5/5/2026). Pas de `110200` (« Domain not authorized ») : le widget enregistré sur `cestecritla.fr` **couvre le sous-domaine** `lab.` (« Adding a root domain authorizes that domain and all its subdomains », hostname-management) — VÉRIFIÉ.
- La CSP n'est pas en cause : même verdict, même chronologie sur `/nocsp` — VÉRIFIÉ.
- Le verdict tombe **2,2-3,9 s** après le début de navigation, sans interaction demandée (`before-interactive-callback` jamais appelé), le conteneur reste vide (`interaction-only`). La sonde est détectée quel que soit le moteur, headless ou non, avec ou sans le drapeau d'automatisation Chromium (Playwright pilote par CDP/Juggler). **Aucune tentative d'évasion supplémentaire** (ce n'est pas l'objet) — VÉRIFIÉ pour l'échec, HYPOTHÈSE pour la cause exacte (signal d'automatisation ; Cloudflare ne la publie pas).
- Conséquence : **le temps jusqu'au jeton n'a pas pu être mesuré** ; le rejeu du jeton (`timeout-or-duplicate` attendu) et `challenge_ts`/`hostname` sur succès **restent à lire sur un vrai téléphone** : la page affiche « Jeton obtenu en N ms » puis le JSON de `/verify` et du rejeu (voir §5). Un `siteverify` réussi coûte le même aller-retour que l'échec (~8 ms) — PROBABLE.
- WebKit non testé : build `webkit-2287` installé mais la version 1.63 demande une autre révision, non téléchargée (Firefox l'a été : 110 Mo).

### 3.4 Traceurs : « zéro cookie » **tenu**, un `localStorage` tiers à déclarer

Relevé sur les 9 passes (contexte neuf à chaque passe, tous domaines, tous frames) — VÉRIFIÉ pour un défi **échoué** en automatisation, HYPOTHÈSE pour un défi réussi (§5) :

| Lieu | Résultat |
|---|---|
| Cookies (tous domaines, `context.cookies()`) | **0** dans 9 passes sur 9 ; **0 en-tête `Set-Cookie`** sur les 21-23 réponses de chaque passe (page, assets, `api.js`, iframe, `fo`, `pat`, `ci`, `hagen…/i/`) |
| `document.cookie` (page et iframe) | vide |
| `lab.cestecritla.fr` : `localStorage`, `sessionStorage`, IndexedDB | vides |
| `https://challenges.cloudflare.com` (origine de l'iframe du défi) : `localStorage` | **1 clé : `cf.turnstile.u`**, valeur de 149 caractères (alphabet base64url + `.`), écrite dès le rendu du widget, y compris quand le défi échoue ; **identique après rechargement** dans le même profil (Chromium et Firefox : `turnstileUSameValue: true`), différente d'un profil à l'autre ; **pas d'expiration** (localStorage) |
| `https://challenges.cloudflare.com` : `sessionStorage`, IndexedDB | vides |

Lecture : Turnstile n'a posé **aucun cookie** (ni `cf_clearance`, ni `__cf_bm`, ni `cf_chl_*`), mais il tient **un identifiant persistant dans le stockage local de son origine** (cloisonné par site de premier niveau : Chromium ≥ 115 « storage partitioning », Firefox ≥ 103 « Total Cookie Protection », Safari ITP ; donc non traçable d'un site à l'autre — PROBABLE, comportement navigateur non mesuré ici). Cloudflare le dit à demi-mot : « Turnstile relies on cookies and local storage to maintain state and track visitor behavior » (guide WebView, https://developers.cloudflare.com/turnstile/get-started/mobile-implementation/, 5/5/2026), et son addendum vie privée qualifie les signaux de « strictly necessary for the purpose of detecting and blocking bots » (https://www.cloudflare.com/turnstile-privacy-policy/, 18/6/2025) — VÉRIFIÉ (textes lus). La page « Cloudflare Cookies » (https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/, 5/5/2026) ne cite aucun cookie propre à Turnstile ; `cf_clearance` n'apparaît qu'en mode pré-clearance (`SameSite=None; Secure; Partitioned`), que l'app n'activera pas — VÉRIFIÉ (doc).

**Pour D0.22 / T9** : la promesse devient « aucun cookie ; un stockage local de sécurité, posé par Cloudflare dans sa propre origine, strictement nécessaire à la détection des robots, effaçable avec les données du site » — à déclarer dans la politique de confidentialité (10 lignes) ; qualification « strictement nécessaire » au sens ePrivacy/CNIL = PROBABLE (raisonnement par analogie avec les traceurs de sécurité, à trancher en T9).

### 3.5 Tiers contactés par une visite (une passe, un chargement)

| Hôte | Requêtes | Détail | Statut |
|---|---|---|---|
| `lab.cestecritla.fr` | 3 | page, `style.css`, `app.js` | VÉRIFIÉ |
| `challenges.cloudflare.com` | 6-7 | `api.js` (302 `max-age=300` → `/turnstile/v0/g/<hash>/api.js`, **27 423 o gzip / 86 603 o brut**, `max-age=31536000`) ; document de l'iframe `/cdn-cgi/challenge-platform/h/g/turnstile/f/av0/rch/<widget>/<sitekey>/auto/fbE/new/normal` ; 2 `POST …/h/g/fo/…` (xhr) ; `GET …/h/g/pat/…` → **401** (sonde Private Access Token, normale hors Safari/iOS) ; `GET …/h/g/ci/…` (image) | VÉRIFIÉ |
| `hagen.challenges.cloudflare.com` | 1 | `GET …/h/g/i/…` → 204 (fetch) | VÉRIFIÉ |
| `blob:` (dans l'iframe) | 3-4 | scripts générés par le défi | VÉRIFIÉ |
| `a.nel.cloudflare.com` | 0 observée | la **zone** ajoute `report-to`/`nel` (`success_fraction: 0`, `max_age: 604800`) sur toutes nos réponses : le navigateur ne rapporte que des erreurs réseau, à Cloudflare, sans cookie. À désactiver au dashboard (zone → Speed/Network « Network Error Logging ») ou à déclarer | VÉRIFIÉ (en-têtes) / à trancher |
| Autres (Google, CDN, polices…) | **0** | | VÉRIFIÉ |

Poids tiers d'une visite : `api.js` 27 Ko gzip + iframe (non pesée) — à confronter au budget D3.5 (« zéro tiers », chemin critique ≤ 150 Ko) : **Turnstile est un tiers par construction**, à charger seulement sur l'écran qui en a besoin (chat), jamais sur l'accueil — PROBABLE (décision T7/T9).

### 3.6 CPU et latence du Worker (GraphQL `workersInvocationsAdaptive`, µs)

| Fenêtre | Requêtes (échantillonnées) | Erreurs | Sous-requêtes | CPU p50 | CPU p90 | CPU p99 | Wall p50 | Wall p99 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `POST /verify` ×25, jeton factice, 13:08 UTC | 19 | 0 | 19 | **1 367 µs** | 2 562 | 3 050 | 7 202 | 26 823 |
| `GET /nonce` ×25, 13:09 UTC | 22 | 0 | 22 | **769 µs** | 1 234 | 2 150 | 10 529 | 23 141 |
| Toute la fenêtre du labo 12:57-13:20 UTC (sondes + curl) | 86 | 0 | 84 | 947 | 2 144 | 3 050 | 10 027 | 26 823 |

Une vérification Turnstile coûte **≈ 1,4 ms de CPU p50, 3 ms p99 : 14 % de la limite de 10 ms** du plan gratuit, 1 sous-requête (siteverify), latence murale ≈ 7-10 ms côté Worker et ≈ 120 ms de bout en bout depuis la machine de session (25 `curl` : moyenne 0,120 s) — VÉRIFIÉ (`cpu-graphql.md`, `latences-curl-25-verify-25-nonce.txt`). Aucune erreur 1102 : ce chemin peut s'ajouter au routage et au cache sans menacer le budget CPU (D4.1 reste le seul dépassement connu).

### 3.7 Limites du plan gratuit Turnstile (doc lue le 9/9/2026)

| Fait | Valeur | Statut |
|---|---|---|
| Widgets | **20 par compte** sur Free (« Up to 20 widgets »), illimités en Enterprise | VÉRIFIÉ — https://developers.cloudflare.com/turnstile/plans/ ; **requalifie** le plan §3.2 « Illimité » : ce sont les **défis** qui sont illimités (« Unlimited challenges (traffic or verification requests) : Yes ») |
| Hostnames | 10 par widget (200 Enterprise) ; un domaine racine couvre ses sous-domaines | VÉRIFIÉ — hostname-management |
| Branding | « Offlabel (remove Cloudflare branding) : No » sur Free ; un widget invisible n'a pas d'empreinte visuelle (« Invisible widgets do not have a visual footprint ») — le branding ne se pose donc que si le widget devient visible/interactif | VÉRIFIÉ (doc) / PROBABLE (rendu réel non observé : défi jamais réussi) |
| Analytics | 7 jours de recul sur Free | VÉRIFIÉ |
| Ephemeral IDs | Enterprise seulement (`metadata.ephemeral_id`) ; `ephemeral_id_present: false` attendu sur ce compte | VÉRIFIÉ (doc) |
| Données collectées | « Turnstile processes only the data strictly necessary to provide this security function. Turnstile does not access, store, or transmit user communications, form entries, or other page inputs. » (FAQ, 14/8/2026) ; signaux : IP, empreinte TLS, User-Agent, sitekey et origine ; base légale « legitimate interests » de Cloudflare en tant que responsable (addendum) | VÉRIFIÉ (textes) |

## 4. Ce que le labo change pour l'app

1. **Intégration retenue** (skill `turnstile-spin`, schéma canonique) : navigateur → Worker → siteverify, jamais siteverify depuis le navigateur ; contrôle de `success`, `action`, `hostname` ; jeton à usage unique, `turnstile.reset(widgetId)` après chaque requête quand la page reste active ; secret par `wrangler secret put` ; `remoteip` optionnel (désactivé : rien à gagner côté vie privée, l'IP est déjà vue par Cloudflare, mais un identifiant de moins dans la requête).
2. **CSP** : l'allowlist minimale (`script-src` + `frame-src` `https://challenges.cloudflare.com`) suffit et reste compatible avec un site 100 % statique via `_headers` ; la variante nonce + `strict-dynamic` marche aussi mais impose de servir la page par le Worker (0,8 ms CPU, une requête Worker par vue) — à réserver aux pages déjà dynamiques.
3. **Confidentialité** (D0.22, T9) : « zéro cookie » est vrai ; ajouter la ligne « stockage local de sécurité Cloudflare (`cf.turnstile.u`) dans l'origine `challenges.cloudflare.com` » ; ne pas activer la pré-clearance (elle poserait `cf_clearance`) ; couper ou déclarer NEL sur la zone ; ne charger Turnstile que sur l'écran chat.
4. **Budget** : ~1,4 ms CPU et 1 sous-requête par vérification ; Turnstile ne consomme ni neuron ni quota Worker au-delà de la requête `/verify` elle-même.
5. **Test humain obligatoire** : le défi ne peut pas être validé par un robot (c'est le but) ; la mesure « temps jusqu'au jeton » et le relevé cookies/stockage sur défi **réussi** se font sur téléphone (§5).

## 5. À faire sur un vrai téléphone (utilisateur)

1. Ouvrir https://lab.cestecritla.fr/ (Android Chrome, puis iPhone Safari) : lire « Jeton obtenu en N ms » (temps depuis le début de navigation) ; noter si un widget est apparu (il ne devrait pas : invisible + `interaction-only`).
2. Toucher « Vérifier le jeton » : le JSON affiché doit donner `ok: true`, `hostname: "lab.cestecritla.fr"`, `action: "lab-verify"`, `challenge_ts` ; le rejeu (non affiché, dans `window.__lab.replayResult`) devrait donner `timeout-or-duplicate` — à lire sur ordinateur avec les outils de développement, ou à rendre visible si besoin (une ligne dans `app.js`).
3. Sur ordinateur (Chrome ou Firefox, profil neuf) : ouvrir la page, DevTools → Application/Stockage : vérifier « Cookies : aucun » et `challenges.cloudflare.com` → Local Storage → `cf.turnstile.u` ; capturer l'écran dans `captures/`.

## 6. Lignes proposées pour `01-faits.md` / `decisions.md` (à fusionner par l'orchestrateur)

- Faits : « Turnstile : 0 cookie posé (9 passes, 4 moteurs/modes), 1 clé `localStorage` persistante `cf.turnstile.u` dans l'origine `challenges.cloudflare.com`, cloisonnée ; Free = 20 widgets, 10 hostnames/widget, défis illimités (le plan disait « illimité ») ; sous-domaine couvert par le domaine racine ; CSP minimale `script-src`+`frame-src` suffisante, 0 violation ; `/verify` = 1,4 ms CPU p50 / 3 ms p99, 1 sous-requête ; défi impossible en automatisation (600010 en 2-4 s) ; token wrangler sans scope Turnstile. »
- Décision candidate (D7.x) : « Turnstile invisible, explicite, uniquement sur l'écran chat ; siteverify dans le Worker ; pas de pré-clearance ; `remoteip` non envoyé ; politique de confidentialité : "aucun cookie, un stockage local de sécurité Cloudflare" ; NEL de zone à couper ou déclarer. »

## 7. Supprimer les ressources

```sh
export PATH="$HOME/.nvm/versions/node/v24.14.0/bin:$PATH"
cd prototypes/labo-plateforme/turnstile
npx wrangler delete            # supprime le Worker aec-lab-turnstile (secret et assets compris)
rm -rf node_modules .wrangler dist out worker-configuration.d.ts
rm -rf ~/.cache/ms-playwright/firefox-1543   # facultatif : Firefox téléchargé pour la sonde (110 Mo)
```

Puis vérifier au dashboard que le custom domain `lab.cestecritla.fr` (Workers → aec-lab-turnstile → Settings → Domains & Routes, ou zone → DNS, enregistrement `lab`) a disparu, sinon le retirer à la main : la doc custom-domains (14/8/2026) ne dit pas ce qu'il advient du domaine à la suppression du Worker, et précise que le certificat associé « is not automatically deleted » (zone → SSL/TLS → Edge Certificates) — à contrôler.

Le widget Turnstile (créé par l'utilisateur au dashboard) et la zone `cestecritla.fr` ne sont pas touchés. Aucune ressource payante n'a été créée (Worker + Static Assets + secret sur le plan gratuit ; 0 neuron Workers AI).
