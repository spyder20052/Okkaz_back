# Module Authentication

Le module d'authentification gère tout le cycle de vie de la session utilisateur. Il repose sur JSON Web Tokens (JWT), le hachage par Bcrypt et garantit le principe du moindre privilège, le tout en séparant logiquement `AuthTokens` (Access Token + Refresh Token).

## Architecture & Sécurité

- Les mots de passe sont hashés avec `bcrypt` (12 rounds) de manière non bloquante.
- Le rafraîchissement respecte un mécanisme de **rotation sûre** : lorsqu'un *Refresh Token* est échangé, le précédent est instantanément révoqué et marqué invalide dans Prisma (table `RefreshToken` avec `revokedAt`).
- Les endpoints sensibles (`/login`, `/register`, `/forgot-password`) font appel à un middleware **Strict Rate Limiting (`authLimiter`)** interdisant les attaques de force brute.
- Vérification d'adresse mail par UUID asynchrone (Notification courriel).

## Flux

1.  **Inscription** : Creation d'un `User` inactif (`PENDING_KYC` pour les vendeurs, ou initialement `ACTIVE` pour les acheteurs). L'Email d'activation est poussé dans la file d'attente (Service Mailier).
2.  **Connexion** : `SignAccessToken()` qui sera valide pour `15m` et `GenerateRefreshToken()` émettant un nouvel enregistrement valide pour `30d`.
3.  **Renouvellement** : `/refresh-token` -> vérification en bdd -> invalidation ancienne version -> signature nouvelle version.

## Routage

| Méthode | Route               | Description                                |
|---------|---------------------|--------------------------------------------|
| POST    | `/register`         | Inscription d'un nouvel utilisateur        |
| POST    | `/login`            | Authentification et création de session    |
| POST    | `/refresh-token`    | Renouvellement des JWT (Access & Refresh)  |
| POST    | `/logout`           | Invalidation claire en DB du Refresh Token |
| GET     | `/verify-email/:tk` | Confirmation du mail via un jeton UUID     |
| POST    | `/forgot-password`  | Demande de réinitialisation                |
| POST    | `/reset-password/:tk`| Prise en compte du nouveau hachage Bcrypt |
