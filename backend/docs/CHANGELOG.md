# CHANGELOG

Tous les changements notables sont documentés ici.  
Format : [Semantic Versioning](https://semver.org/). Conventions de commit : `feat | fix | refactor | docs | chore | test`.

---

## [0.1.1] — 2026-09-01

### Fixed
- **Photos d'annonces invisibles côté admin** (cas de test n°1 du recueil terrain) — trois causes cumulées :
  - `GET /admin/listings` ne chargeait pas la relation `photos` : la file de modération
    retombait sur l'image de remplacement du front. La relation est désormais incluse,
    couverture en premier (`isCover desc, sortOrder asc`).
  - Le front ne préfixait pas les URLs `/files/...` (driver de stockage `db`) par l'origine
    de l'API : le navigateur les demandait au front et recevait un 404. `mediaUrl()` traite
    maintenant `/uploads/` **et** `/files/`.
  - helmet posait `Cross-Origin-Resource-Policy: same-origin` sur les images servies par
    l'API : le front et l'API vivant sur deux origines distinctes, le navigateur refusait
    de les afficher (`ERR_BLOCKED_BY_RESPONSE`) malgré un HTTP 200. L'en-tête est relâché
    en `cross-origin` **uniquement** pour les photos publiques ; les pièces KYC
    (`/uploads/kyc/...`, `/files/:id` privés) restent en `same-origin`.
- **Annonce en attente illisible** (cas de test n°8) — `GET /listings/:id` exigeait le statut
  `ACTIVE`. Ni l'admin (avant validation) ni l'auteur ne pouvaient consulter le détail.
  La route passe en authentification facultative (`optionalAuthenticate`) : une annonce
  `ACTIVE` reste publique, tout autre statut n'est visible que par son propriétaire ou un
  ADMIN. Le compteur de vues n'est plus incrémenté par ces relectures, et le numéro réel du
  vendeur est renvoyé à ces deux profils via `contactPhoneOwner`.
- **Filtres de prix négatifs acceptés** (cas de test n°1) — bornes `minPrice`/`maxPrice`
  refusées avec un message explicite si elles sont négatives ou non numériques, et refus
  d'une fourchette inversée (`minPrice > maxPrice`). Côté front, une valeur négative est
  ramenée à 0 avec une notification, et l'erreur réelle de l'API remplace le message
  générique « serveur indisponible ».
- Supprimer la photo de couverture laissait l'annonce sans vignette : la photo restante la
  plus ancienne est promue couverture. Les listes tolèrent aussi l'absence de couverture
  (tri au lieu d'un filtre `where isCover`).
- Vignette du tableau de bord vendeur : la couverture choisie par l'annonceur, et non la
  première photo uploadée.
- `next.config.ts` : l'origine autorisée pour `next/image` est déduite de
  `NEXT_PUBLIC_API_URL` (port compris) au lieu d'un `localhost:3000` figé, et
  `dangerouslyAllowLocalIP` — nécessaire depuis Next 16 — est activé uniquement quand
  l'API est locale (jamais en production).
- `GET /admin/listings` n'expose plus le champ `contactPhone` (chiffré, inexploitable côté
  client).

### Changed
- Nouveau middleware `optionalAuthenticate` : identifie l'appelant s'il présente un token
  valide, sans jamais renvoyer 401. Réservé aux routes publiques dont la réponse s'enrichit
  pour certains profils.

### Added
- ADR-009 : politique `Cross-Origin-Resource-Policy` des fichiers servis par l'API.
- Tests : `listings.validator.spec.ts` (13 cas sur les bornes de prix), 6 cas unitaires de
  visibilité `getDetail`, 2 cas de promotion de couverture, 6 cas d'intégration sur une
  annonce `PENDING` et 5 sur les filtres de prix, 1 cas sur les photos de `/admin/listings`.

---

## [0.1.0] — 2026-04-16

### Added
- Scaffold complet du projet Node.js 20 / Express 4 / Prisma 5 / PostgreSQL 16
- Schéma Prisma : 12 tables métier + `refresh_tokens` (§3 du CDC)
  - `users`, `kyc_documents`, `categories`, `listings`, `listing_photos`
  - `subscriptions`, `contact_accesses`, `payments`, `reports`, `reviews`
  - `demand_listings`, `system_settings`, `refresh_tokens`
- Module **Auth** : register, login, refresh-token, logout, verify-email, forgot/reset-password
- Module **Users** : profil, maj, changement de mot de passe, profil public, listings/accès/paiements de l'utilisateur
- Module **KYC** : upload document, statut, validation/rejet admin
- Module **Categories** : liste, détail par slug, CRUD admin
- Module **Listings** : CRUD annonce, photos (upload/suppression), pause/reprise, recherche filtrée + paginée, featured
- Module **Payments** : initiation accès contact, webhook KKiapay HMAC, révélation contact chiffré + watermark
- Module **Subscriptions** : plans, souscription, mon abonnement, annulation auto-renouvellement
- Module **Reports** : signalement utilisateur/annonce, auto-suspension à N signalements, gestion admin
- Module **Reviews** : avis post-accès, liste par annonce, modération admin, suppression
- Module **Demands** : demande « Je recherche » standard ou Express, liste publique, clôture
- Module **Admin** : validation annonces, gestion utilisateurs, tableau de bord, paramètres système
- Services partagés : `email.service`, `storage.service` (driver abstrait), `settings.service` (cache TTL)
- Middlewares : `authenticate`, `authorize`, `validateRequest` (Zod), `errorHandler`, `rateLimit`, `upload` (Multer), `isOwner`, `webhookSignature`
- Utils : `AppError`, `apiResponse`, `pagination`, `jwt` (HS256 + refresh), `crypto` (AES-256-GCM), `slug`, `asyncHandler`
- Documentation : `ARCHITECTURE.md`, `DECISIONS.md` (8 ADR), `SCHEMA.md`, `ERD.md`, `ENV.md`, `INSTALL.md`, sql/`INDEX.md`
- Seed : catégories, paramètres système, compte admin initial
