# Voici le sixième point de situation structuré :

**Point de la semaine (15 - 19 juin) :**
- **Reprise des tests automatisés** : Mise à jour complète de la suite de tests suite à la refonte de la logique contact / paiement. L'ancien parcours d'accès payant a été retiré des tests, et la nouvelle logique est désormais couverte.
- **Nouveaux cas de test** : Ajout de la vérification de l'affichage du numéro selon l'abonnement de l'annonceur (vrai numéro si abonné, sinon numéro de la plateforme), du délai avant dépôt d'un avis, de la modération des avis, et du rappel d'avis par email.
- **Validation de bout en bout** : Tous les scénarios passent — l'ensemble de la suite est au vert (147 tests : 101 d'intégration + 46 unitaires).
- **Outils de test** : Rafraîchissement des jeux de données et de l'outil de test de paiement pour refléter la nouvelle logique (annonceur abonné / non abonné, consultation gratuite du contact).
- **Paramétrage** : Les délais (avis et rappel) sont chargés en base et configurables par l'administrateur, sans redéploiement.

**Point de blocage :**
- **Intégration avec le Front** : Le frontend a été repris. Je reste toutefois en attente de la validation de la cliente pour savoir si l'intégration avec la développeuse front peut démarrer.

**Actions pour la semaine prochaine (22 - 26 juin) :**
- **Déploiement** : Mise à jour de l'environnement de préproduction après fusion des changements validés.
- **Consolidation** : Vérifications finales et suivi des éventuels ajustements.
- **Démarrage de l'intégration** : Lancement de l'intégration avec la développeuse front (mise à disposition de la documentation et des données de test), dès réception de la validation de la cliente.
