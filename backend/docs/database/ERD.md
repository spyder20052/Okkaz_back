# ERD — Diagramme Entité-Relation

> Généré via Mermaid. Dernière mise à jour : 16/04/2026

```mermaid
erDiagram
    users {
        UUID id PK
        string email UK
        string phone UK
        string password_hash
        string first_name
        string last_name
        enum role
        enum status
        enum kyc_status
        int reports_count
        bool is_email_verified
        timestamp deleted_at
    }

    kyc_documents {
        UUID id PK
        UUID user_id FK
        enum document_type
        string front_url
        string back_url
        enum status
        string rejection_reason
        UUID reviewed_by FK
    }

    categories {
        UUID id PK
        string name
        string slug UK
        UUID parent_id FK
        bool is_active
        int sort_order
    }

    listings {
        UUID id PK
        UUID user_id FK
        UUID category_id FK
        string title
        string slug UK
        decimal rental_price
        enum rental_period
        enum condition
        string contact_phone
        string contact_phone_wcc
        enum status
        bool is_featured
        int views_count
        int contacts_count
        timestamp deleted_at
    }

    listing_photos {
        UUID id PK
        UUID listing_id FK
        string url
        int sort_order
        bool is_cover
    }

    payments {
        UUID id PK
        UUID user_id FK
        enum type
        decimal amount
        enum method
        string provider_ref UK
        enum status
        json metadata
    }

    contact_accesses {
        UUID id PK
        UUID user_id FK
        UUID listing_id FK
        UUID payment_id FK UK
        string contact_phone_revealed
        timestamp expires_at
        bool is_active
    }

    subscriptions {
        UUID id PK
        UUID user_id FK
        UUID payment_id FK UK
        enum plan
        enum status
        timestamp starts_at
        timestamp ends_at
    }

    reports {
        UUID id PK
        UUID reporter_id FK
        UUID reported_user_id FK
        UUID listing_id FK
        enum reason
        enum status
    }

    reviews {
        UUID id PK
        UUID reviewer_id FK
        UUID listing_id FK
        int rating
        bool is_moderated
    }

    demand_listings {
        UUID id PK
        UUID user_id FK
        UUID category_id FK
        UUID payment_id FK UK
        enum type
        enum status
        timestamp expires_at
    }

    system_settings {
        UUID id PK
        string key UK
        string value
    }

    refresh_tokens {
        UUID id PK
        UUID user_id FK
        string token_hash UK
        timestamp expires_at
        timestamp revoked_at
    }

    users ||--o{ kyc_documents : "soumet"
    users ||--o{ listings : "publie"
    users ||--o{ contact_accesses : "accède"
    users ||--o{ payments : "paie"
    users ||--o{ subscriptions : "souscrit"
    users ||--o{ reports : "signale"
    users ||--o{ reviews : "évalue"
    users ||--o{ demand_listings : "cherche"
    users ||--o{ refresh_tokens : "session"

    categories ||--o{ listings : "contient"
    categories ||--o{ demand_listings : "concerne"
    categories ||--o{ categories : "parent"

    listings ||--o{ listing_photos : "a"
    listings ||--o{ contact_accesses : "révèle"
    listings ||--o{ reports : "est signalée"
    listings ||--o{ reviews : "est évaluée"

    payments ||--|| contact_accesses : "finance"
    payments ||--o| subscriptions : "active"
    payments ||--o| demand_listings : "publie"
```
