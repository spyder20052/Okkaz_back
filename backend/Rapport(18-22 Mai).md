# Voici le deuxième point de situation structuré :

**Point de la semaine (18 - 22 mai) :**
- **Déploiement** : Mise en production sur l'environnement de Staging. Code poussé sur la branche `dev` et création de la Pull Request vers `staging` après validation complète (93 tests d'intégration réussis, linter validé).
- **Sécurité** : Audit et durcissement des contrôles d'accès (RBAC) sur les endpoints de signalement et d'avis (accès restreint aux rôles BUYER, SELLER, SELLER_PRO). Ajout d'une règle métier bloquant l'auto-évaluation.
- **Performance** : Optimisation des requêtes de chargement des annonces (Listings) pour la page d'accueil. Seule la photo de couverture est désormais récupérée, allégeant considérablement le volume de données.
- **Paiements** : Mise à jour de la vérification du webhook KkiaPay (utilisation de `x-kkiapay-secret`) et amélioration de l'extraction de la référence de transaction.

**Actions pour la semaine prochaine (25 - 29 mai) :**
- **Validation (Phase S2)** : Tests complets et validation approfondie des flux de paiements (KkiaPay) en conditions réelles.
- **Accompagnement (Phases S2/S3)** : Support technique à l'équipe Front (Emmanuela) pour le setup du projet et les premiers appels API.
- **Déploiement Staging** : Fusion de la Pull Request et mise à jour de l'environnement de Staging avec les dernières optimisations de performance et correctifs de sécurité.
