# Schéma de la base de données — OKKAZ

> Dernière mise à jour : 16/04/2026  
> Source de vérité : `prisma/schema.prisma`

---

## Tables

### `users`
Comptes utilisateurs (locataires, propriétaires, admins).

| Colonne | Type | Contrainte | Description |
|---|---|---|---|
| id | UUID | PK | Identifiant unique |
| email | VARCHAR(255) | UNIQUE NOT NULL | Email de connexion |
| phone | VARCHAR(20) | UNIQUE NOT NULL | Téléphone de connexion |
| password_hash | VARCHAR(255) | NOT NULL | Bcrypt (12 rounds) |
| first_name | VARCHAR(100) | NOT NULL | |
| last_name | VARCHAR(100) | NOT NULL | |
| role | ENUM | NOT NULL | SELLER / SELLER_PRO / ADMIN |
| status | ENUM | NOT NULL | ACTIVE / SUSPENDED / BLOCKED / PENDING_KYC |
| kyc_status | ENUM | NOT NULL | NONE / PENDING / APPROVED / REJECTED |
| profile_photo_url | VARCHAR(500) | NULL | |
| address | TEXT | NULL | |
| city | VARCHAR(100) | NULL | |
| reports_count | INT | DEFAULT 0 | Auto-suspension si ≥ seuil |
| is_email_verified | BOOLEAN | DEFAULT false | |
| email_verification_token | VARCHAR(255) | NULL | |
| reset_password_token | VARCHAR(255) | NULL | |
| reset_password_expires_at | TIMESTAMPTZ | NULL | |
| last_login_at | TIMESTAMPTZ | NULL | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | auto | |
| deleted_at | TIMESTAMPTZ | NULL | Soft delete |

**Index :** `status`, `role`, `kyc_status`

---

### `kyc_documents`
Documents d'identité soumis pour validation.

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK→users | |
| document_type | ENUM | ID_CARD / PASSPORT / DRIVER_LICENSE |
| front_url | VARCHAR(500) | URL recto (storage) |
| back_url | VARCHAR(500) NULL | URL verso |
| status | ENUM | PENDING / APPROVED / REJECTED |
| rejection_reason | TEXT NULL | |
| reviewed_by | UUID FK→users NULL | Admin validateur |
| reviewed_at | TIMESTAMPTZ NULL | |

---

### `categories`
Catégories hiérarchiques (2 niveaux max).

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| name | VARCHAR(100) | |
| slug | VARCHAR(100) UNIQUE | URL-friendly |
| description | TEXT NULL | |
| icon_url | VARCHAR(500) NULL | |
| parent_id | UUID FK→categories NULL | Hiérarchie parent/enfant |
| is_active | BOOLEAN DEFAULT true | |
| sort_order | INT DEFAULT 0 | Ordre d'affichage |

---

### `listings`
Table centrale des annonces.

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK→users | Propriétaire |
| category_id | UUID FK→categories | |
| title | VARCHAR(255) | |
| slug | VARCHAR(300) UNIQUE | |
| description | TEXT | |
| rental_price | DECIMAL(12,2) | |
| rental_period | ENUM | DAY / WEEK / MONTH |
| purchase_price | DECIMAL(12,2) NULL | LOA uniquement |
| is_loa | BOOLEAN DEFAULT false | Location avec option d'achat |
| loa_duration_months | INT NULL | |
| condition | ENUM | NEW / GOOD / FAIR |
| location_city | VARCHAR(100) | |
| location_address | TEXT NULL | |
| **contact_phone** | VARCHAR(500) | **Chiffré AES-256-GCM** |
| contact_phone_wcc | VARCHAR(20) | N° Western Cash & Carry (affiché public) |
| status | ENUM | PENDING / ACTIVE / REJECTED / PAUSED / DELETED |
| is_featured | BOOLEAN DEFAULT false | SELLER_PRO uniquement |
| is_urgent | BOOLEAN DEFAULT false | |
| views_count | INT DEFAULT 0 | |
| contacts_count | INT DEFAULT 0 | |
| rejection_reason | TEXT NULL | |
| validated_by | UUID FK→users NULL | |
| validated_at | TIMESTAMPTZ NULL | |
| expires_at | TIMESTAMPTZ NULL | |
| deleted_at | TIMESTAMPTZ NULL | Soft delete |

> ⚠️ `contact_phone` ne doit **jamais** être retourné via les routes publiques. Seul `GET /payments/contact-access/:listingId` peut le déchiffrer après validation d'un accès payé.

---

### `listing_photos`
Photos des annonces.

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| listing_id | UUID FK→listings CASCADE | |
| url | VARCHAR(500) | |
| sort_order | INT DEFAULT 0 | |
| is_cover | BOOLEAN DEFAULT false | Photo principale |

**Limite :** 4 photos max pour SELLER, illimité pour SELLER_PRO.

---

### `subscriptions`
Abonnements Premium propriétaires.

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK→users | |
| plan | ENUM | WEEKLY (3000 FCFA) / MONTHLY (10000 FCFA) |
| amount | DECIMAL(12,2) | |
| status | ENUM | ACTIVE / EXPIRED / CANCELLED |
| payment_id | UUID FK→payments UNIQUE | |
| starts_at | TIMESTAMPTZ | |
| ends_at | TIMESTAMPTZ | |
| auto_renew | BOOLEAN DEFAULT false | |

---

### `contact_accesses`
Accès payants aux coordonnées d'un annonceur.

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK→users | Acheteur |
| listing_id | UUID FK→listings | |
| payment_id | UUID FK→payments UNIQUE | |
| contact_phone_revealed | VARCHAR(500) | **Chiffré AES-256-GCM** (snapshot au moment de l'achat) |
| amount_paid | DECIMAL(12,2) | |
| expires_at | TIMESTAMPTZ | Durée configurable (défaut 48h) |
| is_active | BOOLEAN DEFAULT true | |

---

### `payments`
Paiements unifiés (accès contact, abonnement, demandes).

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK→users | |
| type | ENUM | CONTACT_ACCESS / SUBSCRIPTION / DEMAND_LISTING / EXPRESS_DEMAND |
| amount | DECIMAL(12,2) | |
| currency | VARCHAR(10) DEFAULT 'XOF' | |
| method | ENUM | MOBILE_MONEY / CARD |
| provider | VARCHAR(50) NULL | kkiapay, cinetpay… |
| provider_ref | VARCHAR(255) UNIQUE NULL | Référence transaction |
| status | ENUM | PENDING / SUCCESS / FAILED / REFUNDED |
| metadata | JSON NULL | Données contextuelles |

---

### `reports`
Signalements d'utilisateurs ou d'annonces.

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| reporter_id | UUID FK→users | |
| reported_user_id | UUID FK→users NULL | |
| listing_id | UUID FK→listings NULL | |
| reason | ENUM | FRAUD / WRONG_INFO / INAPPROPRIATE / NO_RESPONSE / OTHER |
| description | TEXT NULL | |
| status | ENUM | OPEN / REVIEWED / CLOSED |
| reviewed_by | UUID FK→users NULL | |
| admin_note | TEXT NULL | |

---

### `reviews`
Avis sur annonces (seulement après accès contact payé).

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| reviewer_id | UUID FK→users | |
| listing_id | UUID FK→listings | |
| rating | SMALLINT | 1 à 5 |
| comment | TEXT NULL | |
| is_moderated | BOOLEAN DEFAULT false | |

**Contrainte :** `UNIQUE(reviewer_id, listing_id)` — un seul avis par (utilisateur, annonce).

---

### `demand_listings`
Annonces « Je recherche ».

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK→users | |
| category_id | UUID FK→categories | |
| title | VARCHAR(255) | |
| description | TEXT | |
| max_budget | DECIMAL(12,2) NULL | |
| city | VARCHAR(100) | |
| type | ENUM | STANDARD (2500 FCFA) / EXPRESS (5000 FCFA + 3%) |
| is_urgent | BOOLEAN | |
| payment_id | UUID FK→payments UNIQUE | |
| status | ENUM | ACTIVE / CLOSED / EXPIRED |
| expires_at | TIMESTAMPTZ | |
| assigned_advisor_id | UUID FK→users NULL | Conseiller assigné |

---

### `system_settings`
Paramètres métier configurables sans redéploiement.

| Clé | Valeur par défaut | Description |
|---|---|---|
| contact_access_price | 2500 | Prix accès contact (FCFA) |
| contact_access_duration_hours | 48 | Durée accès contact |
| max_reports_before_suspend | 5 | Seuil auto-suspension |
| seller_free_max_photos | 4 | Photos max SELLER gratuit |
| subscription_weekly_price | 3000 | |
| subscription_monthly_price | 10000 | |
| demand_listing_price | 2500 | |
| express_demand_min_price | 5000 | |
| express_demand_percent | 3 | % valeur bien (Express) |

---

### `refresh_tokens`
Refresh tokens JWT (rotation, révocation).

| Colonne | Type | Description |
|---|---|---|
| id | UUID PK | |
| user_id | UUID FK→users CASCADE | |
| token_hash | VARCHAR(255) UNIQUE | SHA-256 du token opaque |
| expires_at | TIMESTAMPTZ | |
| revoked_at | TIMESTAMPTZ NULL | NULL = actif |
