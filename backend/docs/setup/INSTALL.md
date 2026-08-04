# Guide d'installation — OKKAZ Backend

## 1. Prérequis

```bash
node --version   # >= 20.0.0
psql --version   # >= 16
```

## 2. Cloner et installer

```bash
git clone <repo-url>
cd okkaz_backend
npm install
```

## 3. Configurer l'environnement

```bash
cp .env.example .env
```

Remplir **au minimum** :
- `DATABASE_URL` — URL PostgreSQL locale
- `JWT_SECRET` et `JWT_REFRESH_SECRET` — `openssl rand -hex 64`
- `ENCRYPTION_KEY` — `openssl rand -base64 32`
- `WCC_PHONE_NUMBER` — numéro au format `+229XXXXXXXX`
- `KKIAPAY_WEBHOOK_SECRET` — n'importe quelle chaîne aléatoire en dev

Voir [`ENV.md`](ENV.md) pour la description complète.

## 4. Créer la base de données PostgreSQL

```bash
psql -U postgres
CREATE USER okkaz WITH PASSWORD 'okkaz';
CREATE DATABASE okkaz_dev OWNER okkaz;
\q
```

## 5. Appliquer les migrations et générer le client Prisma

```bash
npx prisma migrate dev --name init
```

## 6. Peupler les données initiales

```bash
npm run seed
```

Crée :
- 9 catégories racine
- 10 paramètres système
- Compte admin `admin@okkaz.bj / Admin@OKKAZ2026` **(à changer immédiatement)**

## 7. Démarrer le serveur

```bash
npm run dev
```

Vérifier : `curl http://localhost:3000/api/v1/health`

## 8. Vérification TypeScript

```bash
npm run typecheck
```

## Commandes utiles

```bash
npm run dev              # Hot-reload (tsx watch)
npm run build            # Compilation TypeScript → dist/
npm run start            # Serveur production (dist/)
npm test                 # Tests
npx prisma studio        # Interface DB visuelle
npm run seed             # Données initiales
```
