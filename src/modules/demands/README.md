# Module Demands (Recherches)

L'idée phares du service : Un acheteur ne trouve pas l'objet de ses rêves ? Il crée une "Demande". Un vendeur voit cette demande. S'il possède l'objet, il peut postuler auprès de cet acheteur.

## Matching et Flow

- Le `DemandController` permet de publier une demande typée et contrainte par la validation ZOD (Budget, description, zone géographique).
- Le Status est géré (`ACTIVE`, `FULFILLED`, `EXPIRED`, `CLOSED`).
- Les vendeurs certifiés ou réguliers peuvent lister les demandes.

## Fonctionnement des contacts

L'initialisation d'un contact ("Je suis vendeur, j'ai ton objet") peut suivre une route de facturation si c'est un premium ou simplement un message via la messagerie interne (si présente) via UUID et slug.
