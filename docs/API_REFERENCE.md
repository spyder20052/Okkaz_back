# OKKAZ — Référence complète de l'API backend

> Document autonome : tout ce qu'il faut savoir pour intégrer le front **sans accès au code du backend**.
> Base URL en dev : `http://localhost:3000/api/v1` (configurable via `NEXT_PUBLIC_API_URL`).
> Une spec OpenAPI (partielle, datée) est jointe dans `docs/openapi.yaml` ; **ce document fait foi**.

---

## 1. Conventions générales

### Format des réponses
```jsonc
// Succès (200 / 201)
{ "success": true, "message": "…", "data": { /* objet */ } }

// Succès paginé (200) — ATTENTION : data est directement le tableau, pas d'objet wrapper
{ "success": true, "data": [ /* items */ ], "meta": { "page": 1, "limit": 20, "total": 42, "totalPages": 3 } }

// 204 No Content : body vide (DELETE réussis)

// Erreur (4xx / 5xx)
{ "success": false, "error": { "code": "CODE_MACHINE", "message": "Message FR", "details": [ /* optionnel */ ] } }
```

### Pagination
Query `page` (défaut 1) et `limit` (défaut 20, max 100) sur toutes les routes listées « paginé ».

### Authentification
- Header `Authorization: Bearer <accessToken>` (JWT, expire **15 min**).
- Refresh : `POST /auth/refresh-token` avec le `refreshToken` (UUID opaque, expire **7 jours**, rotation à chaque refresh : l'ancien est révoqué).
- Pas de cookies — les tokens transitent en JSON. (Le client `web/src/lib/api.ts` gère déjà tout ça.)

### Erreurs de validation
422 `VALIDATION_ERROR` avec `details: [{ "path": "body.champ", "message": "…" }]`.

### Codes d'erreur principaux
| Code | HTTP | Signification |
|---|---|---|
| `UNAUTHORIZED` / `TOKEN_INVALID` | 401 | Token absent/expiré/invalide |
| `INVALID_CREDENTIALS` | 401 | Login incorrect |
| `ACCOUNT_BLOCKED` | 403 | Compte bloqué |
| `INSUFFICIENT_ROLE` | 403 | Rôle insuffisant pour cette route |
| `NOT_OWNER` | 403 | Ressource d'un autre utilisateur |
| `KYC_NOT_APPROVED` | 403 | Publication refusée tant que l'identité n'est pas validée |
| `LOA_PRO_ONLY` | 403 | LOA réservée aux vendeurs Premium |
| `PHOTO_LIMIT_EXCEEDED` | 403 | Vendeur gratuit limité à 4 photos |
| `NO_CONTACT_REVEAL` | 403 | Avis impossible sans avoir consulté le contact |
| `REVIEW_TOO_EARLY` | 403 | Délai de 24 h après consultation non écoulé |
| `CANNOT_REVIEW_SELF` / `CANNOT_REPORT_SELF` | 403 | Auto-avis / auto-signalement |
| `EXPRESS_PRO_ONLY` | 403 | Demande EXPRESS visible Premium uniquement |
| `USER_ALREADY_EXISTS` | 409 | Email ou téléphone déjà pris |
| `SUBSCRIPTION_ALREADY_ACTIVE` | 409 | Abonnement déjà en cours |
| `DUPLICATE_ENTRY` | 409 | Contrainte d'unicité (ex. 2ᵉ avis sur la même annonce) |
| `VALIDATION_ERROR` | 422 | Corps de requête invalide |
| `ROUTE_NOT_FOUND` / `RECORD_NOT_FOUND` | 404 | — |
| `FILE_TOO_LARGE` | 400 | Fichier > 5 Mo |

### Rate limiting
200 req / 15 min / IP en global ; **10 req / 15 min / IP sur `/auth/*`** (login, register, forgot-password) — attention en dev, réutiliser les tokens.

### Rôles
`SELLER` (compte standard) · `SELLER_PRO` (compte Premium — attribué automatiquement après paiement d'un abonnement) · `ADMIN`. Tous peuvent consulter et contacter.

### Fichiers / images
Upload en `multipart/form-data`, images `jpeg/png/webp`, **5 Mo max**. Les URLs renvoyées sont relatives (`/uploads/...`) → préfixer par l'origine de l'API (helper `mediaUrl()` de `web/src/lib/api.ts`).

---

## 2. Auth — `/auth`

| Méthode & chemin | Auth | Corps | Réponse `data` |
|---|---|---|---|
| `POST /auth/register` | — | `{ firstName (2-100), lastName (2-100), email, phone (^\+?\d{8,15}$), password (8-128, ≥1 maj + 1 min + 1 chiffre) }` | `{ user (rôle SELLER), tokens: { accessToken, refreshToken } }` |
| `POST /auth/login` | — | `{ email? , phone?, password }` (email **ou** phone) | `{ user, tokens }` |
| `POST /auth/refresh-token` | — | `{ refreshToken }` | `{ accessToken, refreshToken }` |
| `POST /auth/logout` | Bearer | `{ refreshToken }` (requis) | `null` |
| `GET /auth/verify-email/:token` | — | — | `null` |
| `POST /auth/forgot-password` | — | `{ email }` | `null` (répond 200 même si l'email n'existe pas) |
| `POST /auth/reset-password/:token` | — | `{ newPassword }` | `null` (révoque toutes les sessions) |

Objet `user` : `{ id, email, phone, firstName, lastName, role, status, kycStatus, isEmailVerified }`.
`status` : `ACTIVE | SUSPENDED | BLOCKED | PENDING_KYC` — un SELLER démarre en `PENDING_KYC`.
`kycStatus` : `NONE | PENDING | APPROVED | REJECTED`.

## 3. Utilisateurs — `/users`

| Méthode & chemin | Auth (rôles) | Corps / Query | Réponse `data` |
|---|---|---|---|
| `GET /users/me` | Bearer | — | `{ user }` (+ `city`, `address`, `profilePhotoUrl`, `reportsCount`, `lastLoginAt`, `createdAt`) |
| `PATCH /users/me` | Bearer | `{ firstName?, lastName?, city? (≤100), address? (≤500), profilePhotoUrl? (URL) }` | `{ user }` — email/téléphone **non modifiables** |
| `PATCH /users/me/password` | Bearer | `{ currentPassword, newPassword }` | `null` — **déconnecte toutes les sessions** |
| `GET /users/me/listings` | SELLER, SELLER_PRO | paginé | annonces du vendeur, **tous statuts**, avec photo de couverture + catégorie |
| `GET /users/me/contact-reveals` | Connecté | paginé | historique des contacts consultés (+ annonce) |
| `GET /users/me/payments` | Bearer | paginé | paiements de l'utilisateur |
| `GET /users/:id/public` | — | — | `{ profile }` : `{ id, firstName, lastName, role, profilePhotoUrl, city, createdAt, ratingAverage, ratingCount, activeListings (≤20) }` |

## 4. KYC — `/kyc`

| Méthode & chemin | Auth | Corps | Réponse `data` |
|---|---|---|---|
| `POST /kyc/upload` | SELLER, SELLER_PRO | multipart : `front_file` (obligatoire), `back_file` (optionnel), champ texte `documentType: ID_CARD\|PASSPORT\|DRIVER_LICENSE` | `{ document }` — passe le compte en KYC `PENDING` |
| `GET /kyc/status` | SELLER, SELLER_PRO | — | `{ kycStatus, latestDocument }` (`latestDocument.rejectionReason` si rejeté) |
| `GET /kyc/admin/list` | ADMIN | `?status=&page=&limit=` (paginé) | documents + user |
| `PATCH /kyc/admin/:kyc_id/approve` | ADMIN | — | `{ document }` — l'utilisateur passe APPROVED + ACTIVE |
| `PATCH /kyc/admin/:kyc_id/reject` | ADMIN | `{ rejectionReason (5-500) }` | `{ document }` |

## 5. Catégories — `/categories`

| Méthode & chemin | Auth | Corps | Réponse `data` |
|---|---|---|---|
| `GET /categories` | — | — | `{ categories }` — racines **actives** uniquement, avec `children` |
| `GET /categories/:slug` | — | — | `{ category }` |
| `POST /categories` | ADMIN | `{ name (2-100), slug (^[a-z0-9-]+$), description?, iconUrl?, parentId?, sortOrder? }` | `{ category }` |
| `PATCH /categories/:id` | ADMIN | partiel + `{ isActive? }` | `{ category }` |
| `DELETE /categories/:id` | ADMIN | — | 204 (soft delete = désactivation ; ⚠️ ne réapparaît plus dans GET) |

Slugs seedés : `automobiles`, `electromenager`, `electronique`, `immobilier`, `outils-de-travail`, `prestation-de-services`, `vetements-accessoires`, `divertissement`, `animaux`.

## 6. Annonces — `/listings`

| Méthode & chemin | Auth | Corps / Query | Réponse `data` |
|---|---|---|---|
| `GET /listings` | — | `?q= (≤100) &categoryId= &city= &minPrice= &maxPrice= &isLoa= &sort=recent\|price_asc\|price_desc\|featured &page=&limit=` (paginé) | annonces ACTIVE (cover uniquement, jamais le téléphone) |
| `GET /listings/featured` | — | — | `{ items }` (≤20 annonces en vedette) |
| `GET /listings/:id` | — | — | `{ listing }` — incrémente le compteur de vues ; `contactPhoneDisplayed` = numéro **plateforme**, jamais le vrai |
| `POST /listings/:id/contact` | Connecté | — | `{ contactPhone, isOwnerNumber, watermark }` — vrai numéro si le vendeur est Premium, sinon numéro de mise en relation |
| `POST /listings` | SELLER, SELLER_PRO | voir ci-dessous | `{ listing }` — créée en statut **PENDING** (validation admin) ; 403 `KYC_NOT_APPROVED` sinon |
| `PATCH /listings/:id` | propriétaire (ou ADMIN) | partiel du corps de création | `{ listing }` — ⚠️ repasse en PENDING |
| `DELETE /listings/:id` | propriétaire (ou ADMIN) | — | 204 (soft delete) |
| `POST /listings/:id/photos` | propriétaire | multipart : `photos` (multiple, ≤20 fichiers ; **4 max au total** pour SELLER gratuit) + `coverIndex?` | `{ photos }` |
| `DELETE /listings/:id/photos/:photo_id` | propriétaire (ou ADMIN) | — | 204 |
| `PATCH /listings/:id/pause` | propriétaire | — | `{ listing }` (PAUSED) |
| `PATCH /listings/:id/resume` | propriétaire | — | `{ listing }` (ACTIVE) |

**Corps de création** :
```jsonc
{
  "title": "string (5-255)",
  "description": "string (10-5000)",
  "categoryId": "uuid",
  "rentalPrice": 45000,               // number > 0
  "rentalPeriod": "DAY" | "WEEK" | "MONTH",
  "condition": "NEW" | "GOOD" | "FAIR",
  "locationCity": "string (2-100)",
  "locationAddress": "string (≤500)", // optionnel
  "contactPhone": "+22997000001",     // ^\+?\d{8,15}$ — PAS d'espaces
  "purchasePrice": 18500000,          // optionnel, > 0
  "isLoa": false,                     // optionnel — true = 403 LOA_PRO_ONLY si non Premium
  "loaDurationMonths": 12             // optionnel, entier > 0
}
```

**Objet `listing`** (lecture) : `{ id, userId, categoryId, title, slug, description, rentalPrice, rentalPeriod, purchasePrice, isLoa, loaDurationMonths, condition, locationCity, locationAddress, contactPhoneDisplayed, status, isFeatured, isUrgent, viewsCount, contactsCount, rejectionReason, createdAt, photos: [{id, url, sortOrder, isCover}], category: {id, name, slug}, owner: {id, firstName, lastName, role, profilePhotoUrl, city} }`.
⚠️ `rentalPrice` / `purchasePrice` / `amount` sont des **Decimal sérialisés en string** (`"45000"`). `status` : `PENDING | ACTIVE | REJECTED | PAUSED | DELETED`.

## 7. Avis — `/reviews`

| Méthode & chemin | Auth | Corps | Réponse `data` |
|---|---|---|---|
| `POST /reviews` | Connecté | `{ listingId, rating (1-5), comment? (≤2000) }` | `{ review }` |
| `GET /reviews/listing/:listing_id` | — | — | `{ reviews, stats: { average, count } }` (avis modérés exclus) |
| `PATCH /reviews/:id/moderate` | ADMIN | `{ isModerated: bool }` | `{ review }` |
| `DELETE /reviews/:id` | ADMIN | — | 204 |

Règles : contact consulté au préalable (`NO_CONTACT_REVEAL`), délai 24 h (`REVIEW_TOO_EARLY`), pas d'auto-avis (`CANNOT_REVIEW_SELF`), 1 avis / (utilisateur, annonce) (409).

## 8. Signalements — `/reports`

| Méthode & chemin | Auth | Corps / Query | Réponse `data` |
|---|---|---|---|
| `POST /reports` | Connecté | `{ reportedUserId? \| listingId?, reason: FRAUD\|WRONG_INFO\|INAPPROPRIATE\|NO_RESPONSE\|OTHER, description? (≤2000) }` — au moins un des deux ids | `{ report }` |
| `GET /reports/admin/list` | ADMIN | `?status=OPEN\|REVIEWED\|CLOSED` (paginé) | reports + reporter/cible/annonce |
| `GET /reports/admin/:id` | ADMIN | — | `{ report }` |
| `PATCH /reports/admin/:id/review` | ADMIN | `{ status: "REVIEWED"\|"CLOSED", adminNote? }` | `{ report }` |

5 signalements sur un compte → suspension automatique.

## 9. Abonnements — `/subscriptions`

| Méthode & chemin | Auth | Corps | Réponse `data` |
|---|---|---|---|
| `GET /subscriptions/plans` | — | — | `{ plans: [{ plan: "WEEKLY"\|"MONTHLY", price, currency: "XOF", durationDays }] }` (3 000 / 10 000 FCFA) |
| `POST /subscriptions/subscribe` | SELLER, SELLER_PRO | `{ plan, method: "MOBILE_MONEY"\|"CARD" }` | `{ payment: { id, amount, currency, status: "PENDING", providerRef }, plan }` — 409 si déjà actif |
| `GET /subscriptions/me` | SELLER, SELLER_PRO | — | `{ subscription }` ou `null` |
| `POST /subscriptions/cancel` | SELLER, SELLER_PRO | — | `{ subscription }` (désactive le renouvellement) |

Après paiement confirmé (webhook) : l'utilisateur devient `SELLER_PRO`, toutes ses annonces passent `isFeatured: true`.

## 10. Demandes « Je recherche » — `/demands`

| Méthode & chemin | Auth | Corps | Réponse `data` |
|---|---|---|---|
| `POST /demands/initiate` | Connecté | `{ categoryId, title (5-255), description (10-5000), maxBudget?, city (2-100), type: "STANDARD"\|"EXPRESS", propertyValue? (pour EXPRESS), method: "MOBILE_MONEY"\|"CARD" }` | `{ demand, payment: { id, amount, currency, providerRef } }` — STANDARD 2 500 F, EXPRESS max(5 000, 3 % de propertyValue) |
| `GET /demands` | SELLER_PRO | paginé | demandes actives (STANDARD + EXPRESS) |
| `GET /demands/standard` | SELLER, SELLER_PRO | paginé | demandes STANDARD actives |
| `GET /demands/me` | Connecté | paginé | mes demandes |
| `GET /demands/:id` | SELLER, SELLER_PRO, ADMIN | — | `{ demand }` — EXPRESS : 403 `EXPRESS_PRO_ONLY` si non Premium |
| `PATCH /demands/:id/close` | Propriétaire, ADMIN | — | `{ demand }` |

La demande devient ACTIVE **après confirmation du paiement** (webhook).

## 11. Paiements — `/payments`

| Méthode & chemin | Auth | Réponse `data` |
|---|---|---|
| `GET /payments/:payment_id/status` | Bearer (owner) | `{ payment: { id, type, amount, currency, status, method, provider, createdAt, updatedAt } }` |
| `POST /payments/webhook` | header secret KKiaPay | (appelé par KKiaPay, pas par le front) |

`status` : `PENDING | SUCCESS | FAILED | REFUNDED`. `type` : `SUBSCRIPTION | DEMAND_LISTING | EXPRESS_DEMAND`.

**Flux KKiaPay côté front** (déjà implémenté dans `web/src/lib/kkiapay.ts`) :
1. `POST /subscriptions/subscribe` ou `/demands/initiate` → récupérer `payment.providerRef` + `payment.amount`.
2. Charger `https://cdn.kkiapay.me/k.js` puis `openKkiapayWidget({ amount, key: <clé publique>, sandbox: true, data: JSON.stringify({ providerRef }) })`.
3. Écouter `addKkiapayListener('success' | 'failed')`.
4. Poller `GET /payments/:id/status` (3 s × 10).
⚠️ En local, le webhook KKiaPay ne peut pas joindre l'API → le statut reste `PENDING` (l'UI l'explique). Le **serveur mock** (voir `docs/MOCK_SERVER.md`) simule lui la confirmation automatiquement.

## 12. Admin — `/admin` (toutes : rôle ADMIN)

**Dashboard**
- `GET /admin/dashboard/stats` → `{ totalUsers, totalListings, totalActiveListings, totalTransactions, totalRevenue, pendingKycCount, pendingListingsCount, openReportsCount }`
- `GET /admin/dashboard/revenue?period=day|week|month|year` → `{ rows: [{ date, amount }] }`
- `GET /admin/dashboard/users-growth?period=…` → `{ rows: [{ date, count }] }`
- `GET /admin/dashboard/top-listings` → `{ items }` · `GET /admin/dashboard/top-categories` → `{ items: [{ category, count }] }`

**Utilisateurs**
- `GET /admin/users?role=&status=&kycStatus=&q=` (paginé)
- `GET /admin/users/:id` → `{ user }` + kycDocuments, listings, payments, subscriptions
- `PATCH /admin/users/:id/suspend` `{ reason (3-500) }` · `…/block` `{ reason }` · `…/activate` · `…/role` `{ role }`

**Annonces**
- `GET /admin/listings?status=&userId=&categoryId=` (paginé)
- `PATCH /admin/listings/:id/validate` (→ ACTIVE) · `…/reject` `{ rejectionReason (3-500) }` (→ REJECTED) · `DELETE /admin/listings/:id`

**Paiements** — `GET /admin/payments?type=&status=&method=&userId=&dateFrom=&dateTo=` (paginé)

**Réglages** — `GET /admin/settings` → `{ settings: [{ key, value, description }] }` · `PATCH /admin/settings/:key` `{ value }`
Clés utiles : `subscription_weekly_price`, `subscription_monthly_price`, `demand_listing_price`, `express_demand_min_price`, `express_demand_percent`, `review_min_delay_hours`, `seller_free_max_photos`, `max_reports_before_suspend`.

## 13. Divers

- `GET /health` → `{ status: "ok", env, ts }` — pratique pour vérifier que l'API répond.
- `GET /docs` → Swagger UI (hors production).
- **Endpoints qui N'EXISTENT PAS** (ne pas chercher à les appeler — voir `INTEGRATION_BACKEND.md` pour la liste complète des écarts) : chat/messagerie, notifications, favoris, réservations/booking, boost par annonce, « numéro direct » payant, contact form, litiges, contrats LOA, journal d'audit, liste admin des abonnements, upload d'avatar.
