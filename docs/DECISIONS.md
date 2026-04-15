# Decisions d'architecture

1. ORM: Prisma — choisi pour productivité et compatibilité avec Supabase/Postgres.
2. Auth: JWT access/refresh — simple et compatible mobile/web.
3. Stockage média: Supabase Storage (prévu pour MVP).
4. Base de données: Supabase PostgreSQL (hébergé) — accès via `DATABASE_URL` pour Prisma.
5. Pattern: Controllers → Services → Repositories (Prisma direct pour l'instant).

Les décisions peuvent être amendées dans les tickets/PRs.
