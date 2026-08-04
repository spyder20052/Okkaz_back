# INDEX — Fichiers SQL du projet OKKAZ

> Dernière mise à jour : 16/04/2026  
> **Règle absolue** : tout nouveau fichier `.sql` doit être immédiatement référencé ici.

## Ordre d'exécution (initialisation complète)

> Note : avec Prisma, les migrations sont gérées par `prisma migrate dev`.  
> Les fichiers SQL ci-dessous sont des exports de référence et d'audit.

| Ordre | Fichier | Rôle | Dépendances |
|---|---|---|---|
| 1 | `migrations/v001_init.sql` | Schéma initial (13 tables, enums, index) | Aucune |

## Migrations (ordre chronologique)

| Version | Fichier | Description | Date |
|---|---|---|---|
| v001 | `migrations/v001_init.sql` | Schéma initial complet — 12 tables métier + refresh_tokens | 16/04/2026 |

## Notes importantes

- Ne jamais exécuter une migration manuellement sans avoir sauvegardé la base.
- Les migrations Prisma sont gérées par `prisma migrate dev` (dev) et `prisma migrate deploy` (prod).
- Tout script SQL ad-hoc (correction ponctuelle) doit être versionné ici avant exécution.
- Les fichiers seeds ne sont pas des migrations : `prisma/seed.ts` (exécuté via `npm run seed`).
