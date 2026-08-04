# Module Listings (Annonces)

Le module de listing (ou "Annonces") concentre la plus grosse valeur ajoutée du projet. Il obéit à deux logiques tarifaires : des vendeurs standards (`SELLER`) et des vendeurs certifiés professionnels (`SELLER_PRO`).

## Cycles de vies des Annonces

- **Création (DRAFT -> PENDING)** : Quand le vendeur publie, l'annonce atterrit généralement en état `PENDING` le temps que la modération valide (ou qu'un job modère, selon la règle du `require_approval`).
- **Diffusion (ACTIVE)** : L'annonce est requêtable via `/listings` avec de la recherche plein texte (TypeScript, Postgres et Prisma filtrages JSON/Text).
- **Modification / Historique** : Les modifications repassent souvent à `PENDING` si c'est formellement critique.
- **Fin du cycle (SOLD ou EXPIRED)** : Lorsqu'on notifie l'annonceur ou lorsque les timers agissent. La limite typique est gérée en configuration (Settings db).
- **Cas spécifiques** : Les adresses de contact ne sont *jamais* exposées. Elles sont cryptées par `crypto.ts` et on déclenche une révélation du contact en payant le droit (cf: module payments). Ceci assure un modèle économique autour des WCC "WhatApp Content Contact".

## Fonctionnalités d'Acheminement (B2C & C2C)

La liste permet de spécifier des types, des sous catégories et intègre la composante geo via des queries basées sur les régions.
