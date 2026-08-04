# Module Administration

Le module d'administration centralise les fonctionnalités strictement réservées aux utilisateurs possédant le rôle `ADMIN`. Ce module suit le format classique **Controller -> Service -> Validator**.

## Objectifs et Fonctionnalités

- **Gestion des Utilisateurs :** Recherche, filtrage, vue détaillée, blocage/déblocage de comptes, et assignation ou révocation du rôle.
- **Modération Globale :** Audit de l'intégralité des annonces de la plateforme (avec filtres avancés), validation ou rejet des annonces (`PENDING` vers `ACTIVE` ou `REJECTED`), et suppression forcée (`deleteListing`).
- **Surveillance Financière :** Visualisation des paiements, incluant les méthodes de paiement (CinetPay, KKiPay, Stripe) et les différents types (Souscriptions, Mises en avant, Déblocage de contacts).
- **Configuration Dynamique :** Lecture et mise à jour structurée des paramètres globaux injectés directement dans le fonctionnement de la plateforme (limites de photos, durée de validité, etc.).
- **Dashboard & Statistiques :** Émission de métriques (utilisateurs, annonces, paiements), revenus globaux ventilés, croissance de la base utilisateurs, top annonces par popularité (vues, contacts), et catégories les plus performantes.

## Routage

Les routes sont exposées avec le préfixe `/admin`, et le middleware d'autorisation exige le rôle `ADMIN`.

| Méthode | Route                       | Description                                       |
|---------|-----------------------------|---------------------------------------------------|
| GET     | `/users`                    | Lister et filtrer les utilisateurs                |
| GET     | `/users/:userId`            | Détails d'un utilisateur spécifique               |
| PATCH   | `/users/:userId/status`     | Mettre à jour le statut (ex: BLOCKED)             |
| PATCH   | `/users/:userId/role`       | Modifier le rôle (ex: USER, ADMIN)                |
| GET     | `/listings`                 | Lister toutes les annonces avec filtres avancés   |
| POST    | `/listings/:listingId/validate` | Valider une annonce PENDING                   |
| POST    | `/listings/:listingId/reject`   | Rejeter une annonce PENDING                   |
| DELETE  | `/listings/:listingId`      | Supprimer une annonce globalement                 |
| GET     | `/payments`                 | Lister tout l'historique des paiements            |
| GET     | `/settings`                 | Lister la configuration système complète          |
| PATCH   | `/settings/:key`            | Ajuster un paramètre système                      |
| GET     | `/stats/dashboard`          | Métriques clés (chiffrage global)                 |
| GET     | `/stats/revenue`            | Historique de revenus ventilé                     |
| GET     | `/stats/users-growth`       | Évolution temporelle des inscriptions             |
| GET     | `/stats/top-listings`       | Annonces les plus vues / sauvegardées             |
| GET     | `/stats/top-categories`     | Catégories les plus actives (quantité/revenu)     |
