# Module Users

Le gestionnaire bas niveau de l'identité et du compte de l'utilisateur standard (CRUD basique, Profil public, Profil Privé, Sécurité password).

## Philosophie

Il est fondamental de dissocier les informations d'authentification (`auth.controller` avec JWT, Hashings etc) et de profil pur (`users.controller`).
Quand l'application demande les "Bases de données / infos d'un profile public" d'un vendeur, on passe ici.
Quand l'utilisateur gère ses favoris (annonces favorites), c'est dans ce module.

## Endpoints Principaux

- **Lectures Profil** : GET `/me` ou GET `/:id` pour lire le profil réduit.
- **Ecritures Profil** : PATCH `/me` pour modifier le Prénom, Nom de Famille, Préférences UI/Email.
- **Changement de Mot de passe** : Requiert l'ancien mot de passe, modifie en Hash le nouveau et invalide les sessions optionnellement.
- **Liste de Souhaits (Favoris / Wishlist)** : Permet aux acheteurs d'enregistrer des Postits / Annonces de leur choix pour consulter plus tard. (POST / DELETE).

## Confidentialité

Toute exposition du compte complet `PrivateUser` ne s'effectue QUE si le JWT correspond au `req.user.id`. Les autres fetcheront la version `PublicUser` (Sans mot de passe hashé, et sans emails/phones critiques, sauf si payé sur une annonce liée !).
