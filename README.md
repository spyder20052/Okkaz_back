# OKKAZ

Monorepo de la plateforme OKKAZ :

- `web/` : frontend Next.js 16
- `backend/` : API Express, Prisma et PostgreSQL, intégrée depuis la branche `dev` de `5core-team/okkaz_backend`

## Développement local

Prérequis : Node.js 20+, npm 10+ et Docker.

```bash
cp backend/.env.example backend/.env
cp web/.env.example web/.env.local

npm --prefix backend install
npm --prefix web install

docker compose -f backend/docker-compose.yml up -d
npm --prefix backend run prisma:deploy
npm --prefix backend run seed
```

Lancer ensuite les deux services dans deux terminaux :

```bash
npm run dev:backend
npm run dev:web -- -p 3002
```

- API : `http://localhost:3000/api/v1`
- Documentation API : `http://localhost:3000/api/v1/docs`
- Frontend : `http://localhost:3002`

## Vérification

```bash
npm run typecheck
npm run lint
npm run build
```

## Déploiement

Le frontend et l'API doivent être déployés comme deux services depuis le même dépôt :

- frontend : dossier racine `web`, commande `npm run build`
- backend : dossier racine `backend`, image `backend/Dockerfile`
- base de données : PostgreSQL 16 managé

Configurer `NEXT_PUBLIC_API_URL=https://api.<domaine>/api/v1` côté frontend et `FRONTEND_URL=https://<domaine>` côté backend. Les secrets réels doivent rester dans les variables de l'hébergeur et ne jamais être commités.

## Mettre à jour le backend amont

```bash
git subtree pull --prefix=backend git@github.com:5core-team/okkaz_backend.git dev --squash
```
