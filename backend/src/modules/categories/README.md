# Module Categories

Ce module définit l'arborescence des annonces. C'est une taxonomie hiérarchique : une catégorie peut posséder un parent, et les annonces s'attachent à ces entités pour faciliter le tri UI / UX.

## Architecture & Gestion

1. **Catégorie Parent** : Vehicules, Immobilier, etc.
2. **Catégorie Enfant** : Berlines, Terrains, etc.

Le service gère nativement la réclusion de la suppression, ainsi si une catégorie contient des entités (enfants ou annonces directes), la `Prisma Constraint (Restrict)` ou le check backend empéchera l'éviction sans un `Re-assign` formel pré-requis (voir le module d'admin pour forcer la suppression ou le module categories pour les cruds normaux).

Le module expose principalement des Endpoints `GET` à la consommation publique (l'arborescence utilisée dans le Front-end pour les dropdown).
