# Voici le troisième point de situation structuré :

**Point de la semaine (25 - 29 mai) :**
- **Paiements** : Validation complète du parcours de paiement (via KkiaPay) en conditions de test. Le principe : un utilisateur paie pour accéder aux coordonnées d'un propriétaire, et l'accès ne se débloque qu'une fois le paiement confirmé. Tous les cas de figure ont été vérifiés : paiement réussi, paiement refusé, et protection contre un paiement compté plusieurs fois par erreur.
- **Confidentialité** : Vérification que le numéro réel du propriétaire n'est jamais visible publiquement. Il n'apparaît qu'après un paiement valide, et uniquement pour une durée limitée.
- **Connexion avec le service de paiement** : Mise en place et configuration du lien sécurisé entre la plateforme et KkiaPay, afin que la confirmation des paiements remonte automatiquement.
- **Préparation des tests** : Création de données et d'un outil de test dédiés, pour pouvoir rejouer facilement ces vérifications à l'avenir.
- **Mise en ligne (préproduction)** : Mise à jour de l'environnement de préproduction avec les améliorations de performance et de sécurité de la semaine précédente.

**Point de blocage :**
- **Intégration avec le Front** : Non réalisée cette semaine, en attente de votre retour sur le front. Dès réception de ce retour, l'accompagnement de l'équipe Front pourra démarrer sans délai.

**Actions pour la semaine prochaine (1 - 5 juin) :**
- **Accompagnement de l'équipe Front (Emmanuela)** : Démarrage de l'intégration et des premiers échanges avec la plateforme, dès réception du retour sur le front.
- **Paiements** : Finalisation d'un paiement de test complet via l'interface de paiement.
- **Consolidation** : Suivi des éventuels ajustements remontés lors de l'intégration avec le Front.
