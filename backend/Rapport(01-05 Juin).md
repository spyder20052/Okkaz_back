# Voici le quatrième point de situation structuré :

**Point de la semaine (1 - 5 juin) :**
- **Nouvelle logique contact / paiement** : Le client (locataire) ne paie plus pour consulter un numéro : la consultation devient gratuite. C'est désormais l'annonceur qui, via son abonnement, fait afficher son propre numéro sur ses annonces ; à défaut d'abonnement, c'est le numéro intermédiaire de la plateforme qui est présenté. Le paiement côté client est conservé uniquement pour les annonces « Je recherche ».
- **Mise à jour de la documentation** : Révision complète du Cahier des Charges Technique Backend pour refléter cette nouvelle logique (modèle économique, flux principal, schéma de base de données, routes API, règles de sécurité et règles métier).
- **Cadrage de la refonte technique** : Définition d'un plan de reprise du code module par module (base de données, paiements, annonces, avis, utilisateurs) pour aligner l'application sur la logique validée.

**Point de blocage :**
- **Intégration avec le Front** : Non démarrée. Le frontend devant être repris, l'intégration est reportée et ne pourra démarrer qu'une fois le nouveau front prêt et validé.

**Actions pour la semaine prochaine (8 - 12 juin) :**
- **Refonte technique** : Mise en œuvre de la nouvelle logique contact / paiement dans le code (mise à jour de la base de données, suppression de l'ancien parcours d'accès payant, mise en place du suivi de consultation gratuit et de l'affichage conditionné à l'abonnement).
- **Avis** : Adaptation de la règle d'éligibilité aux avis (possibles après consultation du contact, sans paiement).
- **Consolidation** : Tests et validation des flux ajustés.
