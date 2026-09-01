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

## Visibilité du détail d'une annonce (`GET /listings/:id`)

La route est publique mais à **authentification facultative** (`optionalAuthenticate`) :
le token est lu s'il est présent, jamais exigé — aucun 401 n'est renvoyé.

| Statut de l'annonce | Anonyme / autre utilisateur | Propriétaire | ADMIN |
|---|---|---|---|
| `ACTIVE` | ✅ (compte une vue) | ✅ | ✅ |
| `PENDING` · `REJECTED` · `PAUSED` | ❌ 404 | ✅ | ✅ |
| supprimée (`deletedAt`) | ❌ 404 | ❌ 404 | ❌ 404 |

Deux règles en découlent :

- **Le compteur de vues n'est incrémenté que pour une consultation publique.** Les
  relectures du propriétaire et les passages en modération ne gonflent pas les
  statistiques de l'annonce.
- **`contactPhoneOwner`** (numéro réel déchiffré) n'est ajouté à la réponse que pour le
  propriétaire et les ADMIN. Le public ne reçoit que `contactPhoneDisplayed`, le numéro
  de mise en relation OKKAZ. Le numéro réel d'un annonceur abonné reste dévoilé aux
  locataires par `POST /listings/:id/contact` uniquement.

Un appelant non autorisé reçoit exactement le même 404 qu'un identifiant inconnu : rien
ne fuit sur l'existence des annonces non publiées.

## Photo de couverture

Les listes (`GET /listings`, `/listings/featured`, tableau de bord vendeur, file de
modération admin) ne chargent qu'une photo par annonce. Elle est sélectionnée par **tri**
(`isCover` décroissant, puis `sortOrder` croissant) et non par un filtre
`where: { isCover: true }` : une annonce dont aucune photo n'est marquée couverture
renverrait sinon un tableau vide et afficherait une image de remplacement.

En complément, supprimer la photo de couverture promeut automatiquement la photo restante
la plus ancienne (`deletePhoto`), pour qu'une annonce avec photos ne se retrouve jamais
sans vignette.

## Filtres de prix

`minPrice` et `maxPrice` sont refusés (422 `VALIDATION_ERROR`) s'ils sont négatifs, non
numériques, ou si la fourchette est inversée (`minPrice > maxPrice`) — ce dernier cas
renverrait silencieusement une liste vide. Le front ramène en plus toute saisie négative
à 0 en l'annonçant à l'utilisateur.
