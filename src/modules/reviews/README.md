# Module Reviews (Avis & Notes)

La réputation de la plateforme passe par la réputation des vendeurs. Les utilisateurs (`BUYER` vérifiés) ont la permission de rédiger des avis.

## Modalités

- **Notes (Rating)** : Une échelle classique de 1 à 5 dictée strictement par le validator. L'ORL de base (Prisma int check).
- **Rôle Autorisé** : Seul un utilisateur défini (historique de contact avec le vendeur ou l'annonce) ou par permission large peut émettre un avis. Les admins modèrent ce contenu.
- Les agrégations sont retournées dans `users.service` ou les statistiques publiques des profiles vendeurs afin que tout acheteur vérifie la réputation (rating moyen recalculé et mis en cache Prisma).
