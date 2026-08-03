# OKKAZ — Reste à faire avant la mise en production

Ce document suit les tâches restantes après l'intégration du frontend Next.js et du backend Express/Prisma dans le monorepo.

## État actuel

- Branche d'intégration : `integration/fullstack`
- Frontend : `web/`
- Backend : `backend/`
- Base de données locale : PostgreSQL 16
- Tests backend : 46 tests unitaires réussis
- Frontend : typage, lint et build réussis
- Backend : typage, lint et build réussis

## Frontend — avancement

- [x] Connecter les pages principales à l'API réelle.
- [x] Ouvrir les parcours de consultation à tous les rôles connectés.
- [x] Afficher automatiquement le numéro vendeur ou le numéro OKKAZ.
- [x] Aligner les pages « Mes demandes » et « Décrire mon besoin » sur l'espace applicatif.
- [x] Retirer les anciens parcours de réservation et de paiement avant contact.
- [x] Masquer les footers sur les pages applicatives.
- [x] Ajouter un modèle `web/.env.production.example`.
- [x] Accepter les images du domaine API et de Cloudinary dans Next.js.
- [x] Interdire la simulation KKiaPay implicite en production.
- [x] Faire échouer un build de production sans `NEXT_PUBLIC_API_URL`.
- [ ] Renseigner les vraies variables frontend sur l'hébergeur.
- [ ] Tester le widget KKiaPay avec une vraie clé sandbox.
- [ ] Tester visuellement toutes les pages sur téléphone, tablette et ordinateur.
- [ ] Tester les parcours complets dans Safari, Chrome et Firefox.
- [ ] Ajouter une supervision des erreurs frontend en production.

## Priorité 1 — Comptes et secrets externes

- [ ] Créer ou sélectionner le compte Cloudinary de production.
- [ ] Fournir `CLOUDINARY_URL` au backend.
- [ ] Installer le SDK officiel Cloudinary après autorisation du téléchargement npm.
- [ ] Stocker les photos d'annonces dans Cloudinary.
- [ ] Protéger les pièces KYC avec des URLs privées temporaires, jamais des URLs publiques permanentes.
- [ ] Fournir les clés KKiaPay sandbox :
  - `KKIAPAY_PUBLIC_KEY`
  - `KKIAPAY_PRIVATE_KEY`
  - `KKIAPAY_SECRET_KEY`
  - `KKIAPAY_WEBHOOK_SECRET`
- [ ] Fournir `NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY` au frontend.
- [ ] Créer les identifiants Google OAuth si la connexion Google est conservée :
  - `GOOGLE_CLIENT_ID`
  - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`

## Priorité 2 — Infrastructure de production

- [ ] Choisir les hébergeurs du frontend, du backend et de PostgreSQL.
- [ ] Créer une base PostgreSQL 16 managée.
- [ ] Configurer `DATABASE_URL` avec SSL en production.
- [ ] Déployer le backend depuis `backend/Dockerfile`.
- [ ] Appliquer les migrations avec `npm run prisma:deploy`.
- [ ] Déployer le frontend depuis le dossier `web/`.
- [ ] Relier le domaine principal au frontend.
- [ ] Relier un sous-domaine, par exemple `api.domaine.tld`, au backend.
- [ ] Configurer `NEXT_PUBLIC_API_URL=https://api.domaine.tld/api/v1`.
- [ ] Configurer `FRONTEND_URL=https://domaine.tld` pour CORS.
- [ ] Configurer l'URL publique du webhook KKiaPay :
  `https://api.domaine.tld/api/v1/payments/webhook`.

## Priorité 3 — Sécurité

- [ ] Générer de nouveaux secrets de production :
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
  - `ENCRYPTION_KEY`
  - `HMAC_SECRET`
- [ ] Ne jamais réutiliser les secrets du fichier `.env` local.
- [ ] Auditer les dépendances npm et corriger les vulnérabilités signalées.
- [ ] Mettre à niveau Multer 1.x vers une version maintenue.
- [ ] Vérifier la dépendance transitive Axios ancienne apportée par KKiaPay.
- [ ] Vérifier que les documents KYC ne sont accessibles qu'aux administrateurs autorisés.
- [ ] Mettre en place sauvegardes, rétention et restauration PostgreSQL.
- [ ] Ajouter une supervision des erreurs et des logs de production.

## Priorité 4 — Tests fonctionnels finaux

- [ ] Tester l'inscription et la connexion d'un compte personnel.
- [ ] Tester l'inscription et le KYC d'un vendeur.
- [ ] Tester la publication, la validation et l'affichage d'une annonce.
- [ ] Vérifier qu'un vendeur non abonné affiche le numéro OKKAZ.
- [ ] Vérifier qu'un vendeur abonné affiche automatiquement son numéro personnel.
- [ ] Vérifier que BUYER, SELLER, SELLER_PRO et ADMIN peuvent consulter et contacter une annonce.
- [ ] Tester le bouton WhatsApp avec les deux types de numéros.
- [ ] Tester la création et le paiement d'une demande Standard.
- [ ] Tester la création et le paiement d'une demande Express.
- [ ] Tester le webhook KKiaPay en sandbox sur une URL HTTPS publique.
- [ ] Vérifier l'activation automatique de l'abonnement après paiement confirmé.
- [ ] Vérifier l'activation automatique de la demande après paiement confirmé.
- [ ] Tester les interfaces administrateur sur ordinateur et mobile.

## Règles produit à conserver

- Consulter une annonce est gratuit.
- Contacter pour une annonce est gratuit pour tout compte connecté.
- Sans abonnement vendeur, le numéro OKKAZ est affiché.
- Avec abonnement vendeur actif, le numéro personnel du vendeur est affiché automatiquement.
- Les discussions se font directement sur WhatsApp.
- Il n'existe pas de paiement de réservation ou de location sur le site.
- Les seuls paiements sont l'abonnement vendeur et la publication d'une demande de bien.
- Tous les rôles peuvent agir comme visiteurs intéressés, y compris les vendeurs et les administrateurs.

## Commandes de validation

```bash
npm run typecheck
npm run lint
npm run build
npm run test:backend -- --runInBand
```

## Git

Le développement fullstack doit continuer sur `integration/fullstack`. Ne pas pousser directement sur `main`. Ouvrir une pull request uniquement après validation des tâches nécessaires.
