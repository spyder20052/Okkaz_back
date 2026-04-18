# Module KYC (Know Your Customer)

Ce module est critique. Le KYC s'applique principalement aux vendeurs. Un vendeur ne peut rien vendre ou publier sur la plateforme tant qu'il n'a pas formellement fourni ses informations légales et que les administrateurs ne les ont pas manuellement vérifiées. Ce processus permet de contrer efficacement les abus, les reventes illégales ou les arnaques.

## Flux de Connaissance

-   **`UserStatus.PENDING_KYC`** : Le profil vient d'être créé. L'API d'`initiation` soumet les documents PDF ou JPG à une vérification manuelle en passant le flag vers le statut "soumis".
-   L'`ADMIN` valide les pièces par le contrôleur *approve*.
-   Si le KYC est en erreur, le statut d'utilisateur retourne à `PENDING_KYC` avec une notification d'erreur. Si tout est valide, l'utilisateur passe au statut final `ACTIVE` et a un accès complet aux endpoints listings et ventes (notamment pour les statuts Pro).

## Intégrations

Le fichier passe prioritairement par `storage.service`. Les données récupérées sont formellement isolées et inaccessibles des endpoints non admin (données hautement confidentielles). Les CNI, Numéro IFU, Permis, etc. sont liés et requérables avec Prisma.
