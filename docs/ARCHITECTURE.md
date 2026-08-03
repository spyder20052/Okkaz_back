# Architecture Technique — OKKAZ Backend

> Dernière mise à jour : 16 Avril 2026

## Vue d'ensemble

OKKAZ est une API REST construite sur **Node.js 20 + Express 4 + PostgreSQL 16 + Prisma 5**.  
Le principe directeur est **API First** : le contrat OpenAPI est la source de vérité, le code en est l'implémentation.

## Stack technique

| Composant | Technologie | Justification |
|---|---|---|
| Runtime | Node.js 20 LTS | Stabilité, performances I/O, LTS garanti |
| Framework | Express 4 | Léger, modulaire, grande communauté |
| ORM | Prisma 5 | Typage fort, migrations versionnées, DX excellente |
| Base de données | PostgreSQL 16 | Robustesse, support JSON, intégrité référentielle |
| Validation | Zod | Typage bout-en-bout, messages d'erreur précis |
| Auth | JWT (HS256) + Refresh Token en DB | Stateless + révocation possible |
| Chiffrement | AES-256-GCM | Numéros de contact au repos |
| Uploads | Multer → abstraction Storage | Portable : local / S3 / Cloudinary |
| Paiement | KKiapay | Opérateur Mobile Money Bénin |
| Logs | Pino | Structuré JSON, rapide, OWASP-compliant |

## Architecture modulaire

```
┌─────────────────────────────────────────────────┐
│                   Client HTTP                    │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│            Middlewares transveraux               │
│   helmet · cors · rate-limit · morgan · body     │
└───────────────────────┬─────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────┐
│                   Routers                        │
│  /auth  /users  /kyc  /categories  /listings    │
│  /payments  /subscriptions  /reports  /reviews  │
│  /demands  /admin                                │
└───────────────────────┬─────────────────────────┘
                        │
       ┌────────────────┼────────────────┐
       ▼                ▼                ▼
  Controller        Validator        Middleware
  (HTTP layer)      (Zod)            (auth/authz)
       │
       ▼
    Service
  (Business Logic)
       │
       ▼
  Repository / Prisma (Data Layer)
       │
       ▼
   PostgreSQL 16
```

## Flux paiement (contact access)

```
Client ──POST /payments/initiate-contact-access──▶ API
          creates Payment(PENDING)
          returns providerRef

Client ──[SDK KKiapay]──▶ KKiapay
          Paiement mobile money

KKiapay ──POST /payments/webhook (HMAC)──▶ API
           verify signature
           update Payment(SUCCESS)
           create ContactAccess (chiffré)
           increment listing.contactsCount

Client ──GET /payments/contact-access/:listingId──▶ API
           vérifie ContactAccess actif
           déchiffre contactPhone
           ajoute watermark
           retourne numéro + watermark
```

## Sécurité

- **JWT** : Access token 15min (HS256) + Refresh token 30j (hash SHA-256 en DB, rotation à chaque usage)
- **Chiffrement** : `contact_phone` stocké AES-256-GCM ; jamais retourné en clair sur les routes publiques
- **Autorisation** : `authenticate()` → `authorize(...roles)` → `isOwner(resource)`
- **Rate limiting** : global 100 req/15min ; auth 5 req/15min
- **Validation** : Zod sur tout paramètre entrant (body, query, params)
- **Webhook** : HMAC-SHA256 sur rawBody avant tout traitement

## Règles métier clés

| Règle | Implémentation |
|---|---|
| SELLER → KYC oblig. avant annonce | `assertUserKycApproved()` dans `listings.service` |
| Limite 4 photos SELLER simple | `seller_free_max_photos` dans `system_settings` |
| Contact 2500 FCFA | `contact_access_price` dans `system_settings` |
| Auto-suspension à 5 signalements | Transaction dans `reports.service` |
| SELLER_PRO → isFeatured sur toutes ses annonces | Webhook `activateSubscription()` |
| Vue compteur non bloquant | `fire-and-forget` dans `getDetail()` |
