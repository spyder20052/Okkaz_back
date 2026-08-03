# Journal des Décisions Architecturales (ADR)

---

## ADR-001 · Choix de l'ORM

**Date :** 15/04/2026  
**Statut :** Accepté

**Contexte :** Besoin de manipuler PostgreSQL de façon typée et sécurisée, avec gestion des migrations.

**Options :**
- Prisma — Typage bout-en-bout, migrations intégrées, DX première classe
- Knex — Plus bas niveau, plus flexible, moins de magie
- SQL brut — Contrôle total, verbeux, risqué

**Décision :** **Prisma 5**

**Conséquences :** Schéma centralisé dans `prisma/schema.prisma`. Migrations générées par `prisma migrate dev`. Le `prisma generate` produit les types TypeScript.

---

## ADR-002 · Validation des entrées — Zod

**Date :** 15/04/2026  
**Statut :** Accepté

**Contexte :** Express n'impose aucune validation native. Risque d'injection et de bugs silencieux.

**Décision :** **Zod** pour toutes les entrées (body, query, params). Les schémas sont co-localisés avec les routes (`*.validator.ts`). Le middleware `validateRequest()` parse et transforme les données en amont du contrôleur.

---

## ADR-003 · Stratégie JWT + Refresh Token

**Date :** 15/04/2026  
**Statut :** Accepté

**Contexte :** L'API doit être stateless mais permettre la révocation (logout, reset password, suspension compte).

**Décision :**
- Access token **HS256, 15 min**, payload `{ sub, role, iat, exp }`
- Refresh token **opaque** (bytes aléatoires), stocké en DB sous forme de **hash SHA-256**
- Rotation au refresh : l'ancien token est révoqué, un nouveau émis
- Logout et reset password révoquent tous les refresh tokens actifs du compte

---

## ADR-004 · Chiffrement des contacts (AES-256-GCM)

**Date :** 15/04/2026  
**Statut :** Accepté

**Contexte :** La colonne `contact_phone` est la donnée la plus sensible de la plateforme (c'est ce qu'on vend). Elle ne doit jamais apparaître en clair dans les logs, les sauvegardes ou les réponses API non autorisées.

**Décision :** AES-256-GCM. Format stocké : `base64(iv[12] | authTag[16] | ciphertext)`. La clé est une variable d'environnement de 32 octets. Seul le service `payments/contact-access` peut déchiffrer, après validation d'un `ContactAccess` actif.

---

## ADR-005 · Architecture modulaire (feature-first)

**Date :** 15/04/2026  
**Statut :** Accepté

**Contexte :** Un découpage par type de fichier (`controllers/`, `services/`, `routes/`) devient difficile à naviguer au-delà de 5 entités.

**Décision :** **Feature-first** : `src/modules/{feature}/{feature}.controller.ts|service.ts|routes.ts|validator.ts`. Chaque module est auto-contenu et peut être extrait ou remplacé indépendamment.

---

## ADR-006 · Stockage des fichiers — Abstraction driver

**Date :** 15/04/2026  
**Statut :** Accepté

**Contexte :** En développement, le stockage local suffit. En production, S3 ou Cloudinary est requis.

**Décision :** Interface `StorageDriver` dans `services/storage.service.ts`. Le driver est sélectionné par `STORAGE_DRIVER` en `.env`. La substitution ne nécessite aucun changement dans les modules métier.

---

## ADR-007 · Règle de suspension automatique

**Date :** 16/04/2026  
**Statut :** Accepté

**Contexte :** Le CDC (§6.2) exige la suspension automatique d'un compte à 5 signalements reçus.

**Décision :** Implémenté **côté service TypeScript** (transaction Prisma) plutôt qu'en trigger SQL pour garantir la testabilité, la portabilité et la traçabilité dans les logs. Le seuil est configurable via `system_settings.max_reports_before_suspend`.

---

## ADR-008 · Paramètres business en base (system_settings)

**Date :** 16/04/2026  
**Statut :** Accepté

**Contexte :** Les tarifs (2500 FCFA, 3000 FCFA…) et les règles métier (nb pics photos, durée accès) doivent être modifiables sans redéploiement.

**Décision :** Table `system_settings` (clé/valeur). Lecture via `settings.service.ts` avec cache TTL 60s. Modification par l'admin via `PATCH /admin/settings`.
