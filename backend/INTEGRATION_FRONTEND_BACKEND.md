# Intégration Frontend ↔ Backend OKKAZ — Rapport complet

**Date : 17 juillet 2026**
**Backend :** `okkaz_backend` (Express 4 / Prisma 5 / PostgreSQL 16, API REST `/api/v1`)
**Frontend :** repo `ToriaEmma/Okkaz`, dossier `web/` (Next.js 16, App Router, React 19)

Ce document récapitule : (1) l'intégration réalisée, (2) comment lancer l'ensemble, (3) **tous les écarts constatés entre le front livré et l'API**, avec pour chacun une recommandation (côté front ou côté back). La section 3 est celle à transmettre au dev front.

---

## 1. Ce qui a été fait

Le frontend livré était **100 % statique** : aucune requête réseau, aucune authentification, toutes les données en dur (`src/lib/data.ts`) ou en `localStorage`. L'intégration suivante a été réalisée :

### Couche technique créée (nouveaux fichiers)
| Fichier | Rôle |
|---|---|
| `web/src/lib/api.ts` | Client HTTP central : préfixe `/api/v1`, Bearer token automatique, **refresh token automatique sur 401** (rejeu de la requête), normalisation des erreurs (`ApiError {status, code, message}`), helper `mediaUrl()` pour les images `/uploads/...` |
| `web/src/lib/types.ts` | Types TypeScript alignés sur les modèles Prisma (Listing, Category, ApiUser, Payment, Report, etc.) + helpers d'affichage (`formatPrice`, labels FR des enums) |
| `web/src/lib/auth.tsx` | `AuthProvider` (React Context) + `useAuth()` / `useRequireRole()`. Session persistée en localStorage (clé `okkaz_auth`), synchro inter-onglets |
| `web/src/lib/kkiapay.ts` | Chargement du SDK KKiaPay (`cdn.kkiapay.me/k.js`), ouverture du widget avec `providerRef`, polling `GET /payments/:id/status` |
| `web/.env.local` | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY`, `NEXT_PUBLIC_KKIAPAY_SANDBOX` |

### Pages branchées (page → endpoints)
**Public**
- `/connexion` — login (email **ou** téléphone + mot de passe) et inscription avec attribution automatique du rôle SELLER → `POST /auth/login`, `POST /auth/register`. Tous les comptes peuvent consulter et contacter ; le KYC est requis uniquement pour publier.
- `/annonces` — `GET /listings` (recherche débouncée `q`, chips catégories depuis `GET /categories`, filtre LOA, tri, pagination) ; le param `?category=<slug>` de la home est interprété.
- `/annonces/[id]` — `GET /listings/:id`, galerie photos réelles, contact vendeur (`POST /listings/:id/contact` pour tout compte connecté → numéro + lien WhatsApp), avis, signalement et annonces similaires.
- Landing — la section annonces charge `GET /listings/featured` (fallback : récentes) ; les CTA « propriétaire » qui pointaient par erreur vers `/admin` pointent vers `/vendeur` ; Navbar sensible à l'auth (MON ESPACE / DÉCONNEXION).

**Espace vendeur** (garde d'accès : SELLER/SELLER_PRO/ADMIN, sinon redirect /connexion)
- `/vendeur` — profil réel (`GET /users/me`), stats et annonces réelles (`GET /users/me/listings`) avec statuts (PENDING/ACTIVE/REJECTED + motif), pause/reprise/suppression branchées, paramètres (`PATCH /users/me`), changement de mot de passe, **section KYC complète** (statut `GET /kyc/status` + upload recto/verso `POST /kyc/upload`), encart abonnement (`GET /subscriptions/me`).
- `/vendeur/publier` — wizard branché : catégories réelles, champs ajoutés (période de location, prix d'achat, téléphone de contact), création `POST /listings` + upload photos `POST /listings/:id/photos`, édition via `?modifier=id` (`GET` + `PATCH`), gestion des erreurs métier (KYC non approuvé, limite 4 photos, LOA réservée Pro).
- `/vendeur/recherches/nouvelle` — `POST /demands/initiate` puis redirection paiement (⚠️ voir écart n°1).

**Paiement** (`/paiement`)
- `?type=abonnement` — plans réels (`GET /subscriptions/plans` : 3 000 F/semaine, 10 000 F/mois), souscription `POST /subscriptions/subscribe` → **widget KKiaPay sandbox** → polling du statut.
- `?type=recherche` — paiement d'une demande créée (widget + polling).
- `boost` / `direct_number` / réservation — panneau « service non disponible » (pas de backend, voir écarts).

**Espace admin** (garde d'accès : ADMIN uniquement)
- `/admin` — vraies stats (`GET /admin/dashboard/stats`), graphique revenus réels, derniers paiements, réglages et catégories éditables.
- `/admin/annonces` — file de modération réelle (`GET /admin/listings?status=PENDING`), **Valider** / **Refuser avec motif** branchés.
- `/admin/kyc` — file KYC réelle, approbation/rejet avec motif, **« Voir pièce » ouvre le document uploadé**.
- `/admin/utilisateurs` — recherche + filtres serveur, suspendre/bloquer (motif requis)/réactiver, panneau détail complet.
- `/admin/paiements` — liste réelle avec filtres + **export CSV**.
- `/admin/abonnements` — plans réels, édition des tarifs (via settings), liste dérivée des paiements (voir écart n°14).
- `/admin/reglages` — tous les `SystemSettings` éditables (prix, délais, seuils).
- `/admin/categories` — CRUD complet des catégories.
- `/admin/moderation` — signalements réels (`GET /reports/admin/list`), examiner/clore avec note admin.
- `/admin/statistiques` — dashboard complet (revenus, croissance utilisateurs, top catégories/annonces).
- `/admin/profil` — édition profil + changement de mot de passe réels.
- `/admin/journal`, `/litiges`, `/proprietaires`, `/contrats` — **bandeau « démo statique »** (aucun backend, voir écarts).

### Corrections backend effectuées à cette occasion
- 🔒 **Sécurité** : `GET /admin/users/:id` (et les retours de suspend/block/role) renvoyaient `passwordHash`, `emailVerificationToken` et `resetPasswordToken` au client. Champs désormais filtrés (`src/modules/admin/admin.service.ts`).
- `FRONTEND_URL` (CORS) mis à jour vers `http://localhost:3002` dans `.env`.

### Vérifications effectuées
- `npx tsc --noEmit` et ESLint : OK côté front ; `tsc` OK côté back.
- `next build` : OK (28 pages).
- Tous les flux testés en direct contre l'API (curl) : inscription/login/refresh, création + validation d'annonce, upload photos, upload + approbation KYC, reveal contact, avis (y compris erreurs métier), souscription (payment PENDING + providerRef), demande (2 500 F), endpoints admin (avec écritures testées puis annulées).
- Les 28 pages répondent en 200 ; CORS validé entre :3002 et :3000.

---

## 2. Lancer l'ensemble en local

```bash
# 1. Backend (repo 5core-team/okkaz_backend, branche dev)
cd okkaz_backend
cp .env.example .env          # remplir JWT_SECRET, JWT_REFRESH_SECRET (openssl rand -hex 64),
                              # ENCRYPTION_KEY (openssl rand -base64 32) et les clés KKiaPay sandbox
docker compose up -d          # démarre PostgreSQL 16 (port 5432)
npm install
npx prisma migrate deploy     # applique le schéma
npm run seed                  # catégories + settings + compte admin
npm run seed:demo             # comptes vendeur/acheteur + 4 annonces actives (relançable)
npm run dev                   # API sur http://localhost:3000 (Swagger: /api/v1/docs)

# 2. Frontend (port 3002 — le 3000 est pris par l'API)
cd <repo-front>/web
cp .env.example .env.local    # renseigner la clé publique KKiaPay
npm install
npm run dev -- -p 3002        # ou: npx next build && npx next start -p 3002
```

Le fichier `web/.env.local` doit contenir :
```
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v1
NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY=<clé publique sandbox>
NEXT_PUBLIC_KKIAPAY_SANDBOX=true
```
Côté backend, `FRONTEND_URL` accepte **plusieurs origines séparées par des virgules** (ex. `http://localhost:3002,http://localhost:5173`) — ajoutez l'origine de votre serveur Next si vous utilisez un autre port.

**Comptes de test** (créés par `npm run seed` + `npm run seed:demo`) :
| Compte | Rôle | Identifiants |
|---|---|---|
| Admin | ADMIN | `admin@okkaz.bj` / `Admin@OKKAZ2026` |
| Vendeur (KYC approuvé, 4 annonces actives) | SELLER | `seller.demo@okkaz.bj` / `Seller@2026` |
| Membre standard | SELLER sans KYC | `member.demo@okkaz.bj` / `Member@2026` |

Pour tester les parcours au fur et à mesure : se connecter en acheteur pour consulter contacts/avis, en vendeur pour publier (les annonces partent en PENDING), puis en admin (`/admin/annonces`) pour les valider. Swagger complet sur `http://localhost:3000/api/v1/docs`.

⚠️ Rate limit : 10 requêtes / 15 min / IP sur `/auth/*` (login, register, forgot-password).

---

## 3. ÉCARTS — à communiquer au dev front (et décisions produit)

### A. Divergences produit MAJEURES (à trancher ensemble)

**1. ~~« Je recherche » réservé à un rôle distinct~~ — ✅ RÉSOLU.**
`POST /listings/:id/contact` et `POST /demands/initiate` (+ `GET /demands/me`, `PATCH /demands/:id/close`) sont désormais ouverts aux rôles SELLER/SELLER_PRO : un vendeur peut agir comme consommateur, conformément au cahier des charges (« création de compte obligatoire pour toute action »). Cas particulier géré : le propriétaire qui consulte le contact de **sa propre annonce** reçoit son vrai numéro déchiffré, sans traçage de consultation (ne fausse pas les stats, n'ouvre pas le droit à un avis).

**2. L'option « Numéro direct +2 500 FCFA » par annonce n'existe pas.**
Dans le backend, la consultation du contact est **gratuite** : l'acheteur connecté clique « voir le contact », et reçoit le **vrai numéro du vendeur uniquement si celui-ci a un abonnement Premium actif** ; sinon le numéro de mise en relation de la plateforme (WCC). Le toggle payant du wizard de publication et le flux `?type=direct_number` de la page paiement ont été neutralisés. *Le front doit abandonner ce concept ou le back doit créer ce produit payant.*

**3. Le « Boost 5 000 FCFA » par annonce n'existe pas.**
Seul l'abonnement Premium (`isFeatured=true` sur **toutes** les annonces du vendeur) existe. Le bouton « Booster » du dashboard vendeur pointe désormais vers l'abonnement. *Si le boost par annonce est voulu, il faut un endpoint `POST /listings/:id/boost` + un type de paiement dédié côté back.*

**4. Aucune réservation / paiement de location.**
Le flux par défaut de `/paiement` (payer une location avec caution, dates, etc.) n'a **aucun** équivalent backend : pas de modèle Booking, pas de calendrier, pas de paiement de location. L'UI affiche « non disponible ». *Gros morceau produit à cadrer si nécessaire (cahier des charges le mentionne).*

**5. ~~Pas d'OAuth Google/Apple~~ — ✅ Google RÉSOLU (19 juil. 2026), Apple en attente.**
`POST /auth/oauth/google` est implémenté : le front envoie l'ID token Google Identity Services, le backend le vérifie (audience + signature via l'endpoint officiel Google), crée un compte SELLER actif au premier login (sans téléphone ni mot de passe — schéma migré) ou lie le compte Google à un compte existant portant le même email. Il reste à créer un **Client ID OAuth** sur console.cloud.google.com et à le renseigner dans `GOOGLE_CLIENT_ID` (backend) + `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (front) — sans quoi le bouton front passe en mode simulation et le serveur répond 503 `OAUTH_NOT_CONFIGURED`. **Sign in with Apple reste non implémenté** : il exige un compte Apple Developer payant (99 $/an, Services ID + clé privée) — décision à prendre avant tout développement.

### B. Fonctionnalités front sans aucun backend (UI présente, API absente)

| # | Fonctionnalité | État actuel | Recommandation |
|---|---|---|---|
| 6 | **Chat** (`/chat`) | Écho local mocké | Nécessite un backend messagerie (WebSocket) — non prévu dans l'API actuelle |
| 7 | **Notifications** (cloche vendeur) | Badge factice retiré | Endpoint notifications à créer si voulu |
| 8 | **Formulaire de contact** (`/contact`) | `mailto:` uniquement | Créer `POST /contact` (envoi SMTP existe déjà côté back) ou assumer le mailto |
| 9 | **Admin : journal d'audit** (`/admin/journal`) | Bandeau « démo statique » | Le back ne trace pas les actions admin — modèle AuditLog à créer |
| 10 | **Admin : litiges** (`/admin/litiges`) | Bandeau « démo statique » | Aucun modèle de médiation côté back |
| 11 | **Admin : contrats LOA** (`/admin/contrats`) | Bandeau « démo statique » | `isLoa` existe sur les annonces mais aucun suivi de contrats/mensualités |
| 12 | **Admin : gestion propriétaires** (`/admin/proprietaires`) | Bandeau « démo statique » | Approximable via `/admin/users?role=SELLER` si le front veut la brancher |
| 13 | **Admin : sessions actives, invitation d'équipe** | Retirés/bandeau | Pas d'endpoints ; la promotion passe par `PATCH /admin/users/:id/role` |
| 14 | **Admin : liste des abonnements** | Dérivée de `GET /admin/payments?type=SUBSCRIPTION` (note visible) | Créer `GET /admin/subscriptions` (avec statut ACTIVE/EXPIRED, dates) côté back |
| 15 | **Champs vendeur** : pseudo, bio, n° MoMo (MTN/MOOV), WhatsApp séparé | Retirés avec note | Champs à ajouter au modèle User si le produit les garde |
| 16 | **Upload de photo de profil** | Aperçu local seulement | `PATCH /users/me` n'accepte qu'une URL — créer `POST /users/me/photo` (multipart) côté back |
| 17 | **Photo jointe à une demande** « Je recherche » | Aperçu local, non transmise | `POST /demands/initiate` n'accepte pas de fichier |
| 18 | **Favoris** | Absent des deux côtés | Mentionné au cahier des charges — à créer back + front |

### C. Fonctionnalités backend SANS UI front (API prête, écran manquant)

| # | API disponible | Écran à créer côté front |
|---|---|---|
| 19 | `POST /auth/forgot-password` + `POST /auth/reset-password/:token` | Page « mot de passe oublié » + page de réinitialisation |
| 20 | `GET /auth/verify-email/:token` | Page de confirmation d'email (le lien du mail pointe actuellement vers l'API brute) |
| 21 | `GET /demands`, `GET /demands/standard`, `GET /demands/:id`, `PATCH /demands/:id/close` | **Liste des demandes « Je recherche » pour que les vendeurs y répondent** (les EXPRESS sont réservées aux SELLER_PRO) — c'est le cœur du produit demandes, aucune page ne l'affiche |
| 22 | `GET /users/:id/public` | Page profil public d'un vendeur (note moyenne, annonces actives) |
| 23 | `GET /users/me/contact-reveals` (ouvert à SELLER/SELLER_PRO/ADMIN), `GET /users/me/payments` | Historique des contacts consultés et des paiements |
| 24 | `PATCH /reviews/:id/moderate`, `DELETE /reviews/:id` | UI admin de modération des avis (note visible ajoutée sur /admin/moderation) |
| 25 | Filtres API non exposés : `city`, `minPrice`/`maxPrice` sur /listings ; `method`, `dateFrom/dateTo` sur /admin/payments ; `kycStatus` sur /admin/users | Ajouter les contrôles UI correspondants (facile) |

### D. Champs du design sans équivalent en base (supprimés de l'UI)

L'interface `Ad` mockée contenait beaucoup de champs marketing absents du modèle `Listing` :
`deposit` (caution), `reference`, `minimumDuration`, `availability`, `pickup`, `delivery`, `ownerType`, `ownerResponseTime`, `paymentTerms`, `warranty`, `cancellationPolicy`, `verifiedAt`, `highlights[]`, `included[]`, `requirements[]`, `security[]`, `usageRules[]`, `totalPrice` (remplacé par le vrai `purchasePrice`).
*Si certains sont importants (la **caution** notamment), il faut les ajouter au schéma Prisma + validators + formulaire de publication.*

Autres détails :
- Filtre « mode » de /annonces : seul le filtre LOA existe côté API (pas de « location seule »).
- Les avis sont rattachés à **l'annonce**, pas au vendeur, avec des règles strictes : contact consulté au préalable, délai de 24 h, 1 avis par annonce. Un avis « à chaud » est impossible — à intégrer dans l'UX.
- Les stats vendeur sont des cumuls totaux (pas de fenêtre « 30 derniers jours »).

### E. Points techniques / infra

| # | Point | Détail |
|---|---|---|
| 26 | **Webhook KKiaPay en local** | KKiaPay ne peut pas joindre `localhost` → après paiement sandbox, le statut reste `PENDING` en dev (l'écran l'explique). En prod/staging : exposer `POST /api/v1/payments/webhook` en HTTPS public et configurer l'URL + secret chez KKiaPay |
| 27 | **Stockage fichiers** | Seul le driver `local` est implémenté (URLs `/uploads/...`). Les drivers S3/Cloudinary lèvent une erreur → **bloquant pour la prod**, à implémenter côté back |
| 28 | **Ports** | API sur 3000 ; front sur 3002 (`next dev -p 3002`). CORS backend limité à `FRONTEND_URL` |
| 29 | **Images distantes** | `next.config.ts` autorise `localhost:3000/uploads/**` — à compléter avec le domaine de prod |
| 30 | **Rate limiting** | 200 req/15 min global, 10 req/15 min sur l'auth (valeurs codées en dur, les vars `RATE_LIMIT_*` du .env ne sont pas câblées) |
| 31 | **Refresh token** | Expire à 7 jours dans le code (le `.env` annonce 30 j — non câblé). Transmis en body JSON, pas en cookie |
| 32 | **Incohérence API mineure** | La liste `GET /listings` expose `contactPhoneWcc`, le détail expose `contactPhoneDisplayed` — à unifier côté back |
| 33 | ~~Mode édition d'annonce~~ ✅ RÉSOLU | Le propriétaire qui appelle `POST /listings/:id/contact` sur sa propre annonce reçoit désormais son vrai numéro déchiffré (18 juil. 2026) |
| 34 | **Catégories inactives** | `DELETE /categories/:id` est un soft-delete mais `GET /categories` ne renvoie que les actives → une catégorie désactivée devient invisible et irrécupérable depuis l'UI. Suggestion back : `GET /admin/categories?includeInactive=true` |
| 35 | **Guards front = client-side** | La protection de /admin et /vendeur est en JavaScript client (pas de middleware serveur). Suffisant car l'API vérifie les rôles, mais un middleware Next serait plus propre |

---

## 4. Récapitulatif des priorités proposées

**À trancher produit (bloquant pour la cohérence)** : n°2 (numéro direct), n°3 (boost), n°4 (réservation). Le n°1 est résolu : toutes les capacités de consultation sont ouvertes aux trois rôles existants.

**Côté front (rapide, API déjà prête)** : n°19-20 (mot de passe oublié / vérif email), n°21 (liste des demandes pour vendeurs — cœur du produit), n°22-23 (profil public, espace acheteur), n°24 (modération avis), n°25 (filtres).

**Côté back (avant prod)** : n°27 (stockage S3/Cloudinary), n°26 (webhook public), n°14 (GET /admin/subscriptions), n°16 (upload avatar), n°34 (catégories inactives), n°32 (nommage contactPhone).

**Chantiers plus gros à planifier** : chat (n°6), notifications (n°7), favoris (n°18), journal/litiges/contrats admin (n°9-11), OAuth (n°5).
