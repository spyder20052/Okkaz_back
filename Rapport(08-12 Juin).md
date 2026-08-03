# Voici le cinquième point de situation structuré :

**Point de la semaine (8 - 12 juin) :**
- **Refonte de la logique contact / paiement** : Mise en œuvre dans le code de la nouvelle logique validée. Le client (locataire) ne paie plus pour consulter un numéro : la consultation est désormais gratuite et tracée. C'est l'annonceur qui, via son abonnement, fait afficher son numéro réel ; à défaut, c'est le numéro intermédiaire de la plateforme qui est présenté.
- **Base de données** : Migration appliquée. L'ancienne table d'accès payant est remplacée par une table de consultations (sans paiement) ; le type de paiement « accès contact » et les paramètres devenus inutiles ont été retirés.
- **Affichage du contact** : Le numéro affiché est calculé selon l'abonnement de l'annonceur (numéro réel si abonnement actif, sinon numéro intermédiaire).
- **Consultation du contact** : Nouveau point d'entrée permettant au locataire de consulter gratuitement les coordonnées d'une annonce, avec enregistrement de la consultation.
- **Avis** : La règle d'éligibilité a été adaptée — un avis est désormais possible après consultation du contact (et non plus après paiement), et seulement après un délai configurable, pour limiter les avis non sincères. Les administrateurs peuvent masquer un avis abusif sans le supprimer (modération réversible).
- **Rappel par email** : Mise en place d'un rappel automatique invitant l'utilisateur à laisser un avis, envoyé un délai configurable après la consultation s'il n'a pas encore évalué l'annonce.
- **Nettoyage** : Suppression de l'ancien parcours d'accès payant côté paiements, espace utilisateur et administration. Compilation du projet validée. Les délais (avis, rappel) sont configurables par l'administrateur sans redéploiement.

**Point de blocage :**
- **Intégration avec le Front** : Toujours en attente, le frontend devant être repris. L'intégration démarrera une fois le nouveau front prêt et validé.

**Actions pour la semaine prochaine (15 - 19 juin) :**
- **Tests automatisés** : Mise à jour des tests sur les flux modifiés (consultation, affichage conditionné à l'abonnement, avis).
- **Validation** : Vérification complète de la nouvelle logique de bout en bout.
- **Déploiement** : Mise à jour de l'environnement de préproduction avec la nouvelle logique.
- **Consolidation** : Suivi des éventuels ajustements avant l'intégration avec le Front.
