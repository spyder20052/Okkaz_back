# Variables d'environnement — OKKAZ Backend

> Copier `.env.example` en `.env`. Ne jamais versionner `.env`.

---

## App

| Variable | Obligatoire | Défaut | Description |
|---|---|---|---|
| `NODE_ENV` | Non | `development` | `development` / `staging` / `production` / `test` |
| `PORT` | Non | `3000` | Port d'écoute HTTP |
| `FRONTEND_URL` | Non | `http://localhost:5173` | URL du frontend (CORS allowlist) |
| `API_PREFIX` | Non | `/api/v1` | Préfixe de toutes les routes |

## Base de données

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | **Oui** | URL PostgreSQL. Format : `postgresql://user:pass@host:port/db?schema=public` |

## JWT

| Variable | Obligatoire | Défaut | Description |
|---|---|---|---|
| `JWT_SECRET` | **Oui** | — | Secret access token (≥ 32 chars). Générer : `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | **Oui** | — | Secret refresh token (≥ 32 chars) |
| `JWT_ACCESS_EXPIRES_IN` | Non | `15m` | Durée de vie access token |
| `JWT_REFRESH_EXPIRES_IN` | Non | `30d` | Durée de vie refresh token |

## Chiffrement

| Variable | Obligatoire | Description |
|---|---|---|
| `ENCRYPTION_KEY` | **Oui** | Clé AES-256 en base64 (32 octets). Générer : `openssl rand -base64 32` |

## Stockage fichiers

| Variable | Obligatoire | Description |
|---|---|---|
| `STORAGE_DRIVER` | Non | `local` / `s3` / `cloudinary` |
| `AWS_S3_BUCKET` | Si `s3` | Nom du bucket S3 |
| `AWS_S3_REGION` | Si `s3` | ex. `eu-west-3` |
| `AWS_ACCESS_KEY_ID` | Si `s3` | |
| `AWS_SECRET_ACCESS_KEY` | Si `s3` | |
| `CLOUDINARY_URL` | Si `cloudinary` | URL complète Cloudinary |

## Paiement KKiapay

| Variable | Obligatoire | Description |
|---|---|---|
| `KKIAPAY_PUBLIC_KEY` | Prod | Clé publique KKiapay |
| `KKIAPAY_PRIVATE_KEY` | Prod | Clé privée |
| `KKIAPAY_SECRET_KEY` | Prod | Clé secrète |
| `KKIAPAY_WEBHOOK_SECRET` | **Oui** | Secret pour vérification HMAC du webhook |
| `KKIAPAY_SANDBOX` | Non | `true` — passer à `false` en production |

## SMTP

| Variable | Obligatoire | Description |
|---|---|---|
| `SMTP_HOST` | Non | Hôte SMTP. Optionnel : sans config, les emails sont loggés |
| `SMTP_PORT` | Non | Port SMTP (ex. `587`, `465`, `2525`) |
| `SMTP_USER` | Non | Identifiant SMTP |
| `SMTP_PASS` | Non | Mot de passe SMTP |
| `SMTP_FROM_EMAIL` | Non | `no-reply@okkaz.bj` |
| `SMTP_FROM_NAME` | Non | `OKKAZ` |

## Business

| Variable | Obligatoire | Description |
|---|---|---|
| `WCC_PHONE_NUMBER` | **Oui** | Numéro Western Cash & Carry (affiché sur les annonces publiques) |

## Rate limiting

| Variable | Défaut | Description |
|---|---|---|
| `RATE_LIMIT_WINDOW_MS` | `900000` | Fenêtre (ms) — 15 minutes |
| `RATE_LIMIT_MAX` | `100` | Max requêtes globales par IP |
| `AUTH_RATE_LIMIT_MAX` | `5` | Max tentatives auth par IP |

## Logs

| Variable | Défaut | Description |
|---|---|---|
| `LOG_LEVEL` | `info` | `fatal` / `error` / `warn` / `info` / `debug` / `trace` |
