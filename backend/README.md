# OKKAZ Backend

> Marketplace de location de biens au Bénin — API REST (Node.js 20 · Express 4 · PostgreSQL 16 · Prisma 5)

## Prérequis

| Outil | Version min |
|-------|-------------|
| Node.js | 20 LTS |
| npm | 10+ |
| PostgreSQL | 16 |

## Installation

```bash
npm install
cp .env.example .env
# Remplir les variables dans .env (voir docs/setup/ENV.md)
```

## Configuration (.env)

Voir [`docs/setup/ENV.md`](docs/setup/ENV.md) pour la description détaillée de chaque variable.

## Lancer le projet

```bash
# Appliquer les migrations et générer le client Prisma
npx prisma migrate dev

# Peupler les données initiales (catégories, settings, admin)
npm run seed

# Démarrer le serveur en mode développement (hot-reload)
npm run dev
```

Le serveur écoute sur `http://localhost:3000` (ou le PORT configuré).  
Health check : `GET /api/v1/health`

## Lancer les tests

```bash
npm test            # Tous les tests
npm run test:watch  # Mode watch
npm run test:coverage
```

## Structure du projet

```
src/
├── app.ts                    # Factory Express (middlewares + routes)
├── server.ts                 # Démarrage + arrêt propre
├── config/                   # env, prisma, logger
├── middlewares/              # authenticate, authorize, validate…
├── modules/                  # Un dossier par domaine métier
│   ├── auth/
│   ├── users/
│   ├── kyc/
│   ├── categories/
│   ├── listings/
│   ├── payments/
│   ├── subscriptions/
│   ├── reports/
│   ├── reviews/
│   ├── demands/
│   └── admin/
├── services/                 # email, storage, settings (partagés)
├── types/                    # Augmentations TypeScript
└── utils/                    # AppError, apiResponse, jwt, crypto…
prisma/
├── schema.prisma             # Schéma (12 tables + enums)
└── seed.ts                   # Données initiales
docs/                         # Documentation complète
```

## Documentation API

Spécification OpenAPI : [`docs/api/openapi.yaml`](docs/api/openapi.yaml)  
Swagger UI disponible à `/api/v1/docs` (quand le serveur tourne).

## Base de données

- ORM : Prisma 5  
- SGBD : PostgreSQL 16  
- Schéma : [`docs/database/SCHEMA.md`](docs/database/SCHEMA.md)  
- Décisions : [`docs/DECISIONS.md`](docs/DECISIONS.md)

## Contributeurs

KOUTON Spynel en Avril 2026
