# CHANGELOG

Tous les changements notables sont documentés ici.  
Format : [Semantic Versioning](https://semver.org/). Conventions de commit : `feat | fix | refactor | docs | chore | test`.

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
