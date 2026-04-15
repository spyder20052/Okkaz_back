# Architecture — OKKAZ Backend

Résumé de l'architecture technique :

- Langage : Node.js + TypeScript
- Framework HTTP : Express
- ORM : Prisma (connecté à PostgreSQL via Supabase)
- Auth : JWT (access + refresh)
- Storage / Files : Supabase Storage (prévu)
- Tests : Jest
- Linting : ESLint + TypeScript

Structure de dossier principale :

- `src/config` — configuration et clients (Prisma, Supabase)
- `src/routes` — définition des routes API
- `src/controllers` — adaptateurs HTTP → services
- `src/services` — logique métier
- `src/middleware` — middlewares Express réutilisables
- `src/utils` — utilitaires (logger, erreurs, réponses)
