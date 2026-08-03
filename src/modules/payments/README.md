# Module Payments

Le backend OKKAZ a unifiée ses fournisseurs de paiements (PSP : Payment Service Provider) afin d'assurer l'agnosticisme commercial de la logique. Qu'on paie avec *KKiapay*, ou *CinetPay* via du Mobile Money, le cycle de vi est strictement le même.

## Objectifs 

- Facturer l'accès au numéro d'une annonce (`CONTACT_ACCESS`).
- Facturer un boost, c-à-d. une mise en avant d'une annonce (`LISTING_FEATURE`).
- (Optionnellement) Paiements des abonnements Pro (délégués aussi au service subscriptions).

## Diagramme de Flux (Paiement & Webhook)

```mermaid
sequenceDiagram
    participant Frontend as Frontend (Web/Mobile)
    participant API as API OKKAZ
    participant PSP as KKiapay (PSP)
    participant DB as Base de données

    %% Phase d'initiation
    Frontend->>API: POST /initiate-contact-access (ou autres)
    API->>DB: Crée Payment (status: PENDING)
    API-->>Frontend: 201 Created (payment.id + providerRef)
    Frontend->>PSP: Appel SDK Kkiapay avec providerRef

    %% Phase webhook asynchrone
    PSP-->>API: POST /webhook (payload + x-kkiapay-signature)
    Note over API: Middleware webhookSignature vérifie le HMAC
    alt Signature Invalide
        API-->>PSP: 401 Unauthorized
    else Signature Valide
        API->>DB: Recherche Payment via providerRef
        alt Payment PENDING
            API->>DB: Update Payment (status: SUCCESS/FAILED)
            alt status == SUCCESS
                API->>DB: Crée ContactAccess / Active Souscription / Demande
            end
        end
        API-->>PSP: 200 OK (Idempotent)
    end
```

## Webhooks

C'est ici qu'intervient la vraie magie sécuritaire :
Les paiements ne sont jamais "acquis" localement, ils sont vérifiés au **retour du Provider (Webhook)**. Le `webhookSignature` middleware intercepte la signature HMAC brute et s'assure qu'elle math avec le `.env` `WEBHOOK_SECRET` / `KKIAPAY_WEBHOOK_SECRET`. Sans cette signature le Payload rawBody est renié. Ensuite, la fonction du service s'occupe de déclencher de façon idempotente la transaction prisma pour libérer l'actif (ajout de l'utilisateur à `ListingViews` des contacts débloqués, etc).

