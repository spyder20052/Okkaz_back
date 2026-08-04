# OKKAZ — Guide de mise en production, point par point

Chaque section est autonome : la config à faire, où la faire, et comment vérifier qu'elle marche. Ordre recommandé = ordre du document. Les sections 1 à 5 se font **avant** le déploiement ; 6 à 10 **pendant** ; 11 à 13 **après**.

> Monorepo `integration/fullstack` : les chemins ci-dessous sont relatifs à la racine (`backend/`, `web/`). Ce guide complète la checklist `RESTANT_A_FAIRE.md` (même repo) : elle liste QUOI faire, ce guide détaille COMMENT.
> Rappel des environnements : le `.env` de dev reste sur votre machine. Les valeurs de prod vont dans le `.env` **du serveur** (jamais dans git).

---

## 1. Secrets de production (5 min)

Sur votre machine, générez chaque secret et notez-les dans un gestionnaire de mots de passe (pas dans un fichier du repo) :

```bash
openssl rand -hex 64        # → JWT_SECRET
openssl rand -hex 64        # → JWT_REFRESH_SECRET (différent du premier !)
openssl rand -base64 32     # → ENCRYPTION_KEY
openssl rand -hex 32        # → KKIAPAY_WEBHOOK_SECRET (secret partagé webhook)
```

⚠️ **ENCRYPTION_KEY est définitive.** Elle chiffre les numéros de téléphone en base : la changer après le lancement rend illisibles tous les numéros déjà enregistrés. Sauvegardez-la à deux endroits sûrs.

**Vérif :** le backend refuse de démarrer si `JWT_SECRET` < 32 caractères — s'il démarre, c'est bon.

## 2. Compte KKiaPay live (dépend de KKiaPay, à lancer tôt)

1. Sur [kkiapay.me](https://kkiapay.me) → espace développeur, faites **valider le compte marchand** (KYC entreprise — c'est le point qui prend du temps, lancez-le maintenant).
2. Une fois validé, récupérez les clés **live** (pas sandbox) : `KKIAPAY_PUBLIC_KEY`, `KKIAPAY_PRIVATE_KEY`, `KKIAPAY_SECRET_KEY`.
3. Dans le dashboard KKiaPay → Webhooks : URL = `https://api.votre-domaine.bj/api/v1/payments/webhook`, secret = le `KKIAPAY_WEBHOOK_SECRET` généré en §1 (KKiaPay l'envoie dans le header `x-kkiapay-secret`).
4. Côté serveur : `KKIAPAY_SANDBOX=false` et côté front `NEXT_PUBLIC_KKIAPAY_SANDBOX=false` + la clé publique live.

**Vérif :** après déploiement (§8), un abonnement à 3 000 F payé avec un vrai compte MoMo doit passer `PENDING → SUCCESS` en < 1 min et promouvoir le compte en SELLER_PRO. Suivre les logs : `docker logs -f okkaz-api | grep -i webhook`.

## 3. SMTP réel (15 min)

Recommandation : **Brevo** (ex-Sendinblue) — 300 emails/jour gratuits, pas de carte requise.

1. Créez un compte sur [brevo.com](https://www.brevo.com) → Settings → **SMTP & API** → onglet SMTP : notez hôte, port, login, clé SMTP.
2. Authentifiez votre domaine (Settings → Senders & Domains) : ajoutez les enregistrements **SPF/DKIM** proposés dans votre zone DNS — sans ça, vos emails partent en spam.
3. Dans le `.env` du serveur :
   ```
   SMTP_HOST=smtp-relay.brevo.com
   SMTP_PORT=587
   SMTP_USER=<login Brevo>
   SMTP_PASS=<clé SMTP Brevo>
   SMTP_FROM_EMAIL=no-reply@votre-domaine.bj
   ```

**Vérif :** `POST /api/v1/auth/forgot-password` avec votre email perso → l'email arrive en boîte de réception (pas en spam).

## 4. Google Client ID de production (10 min)

1. [console.cloud.google.com](https://console.cloud.google.com) → créez un projet « OKKAZ ».
2. **APIs & Services → OAuth consent screen** : type *External*, nom OKKAZ, logo, domaine. (Le mode « Testing » limite à 100 utilisateurs — passez en « In production » avant le lancement, la vérification Google peut prendre quelques jours si vous avez un logo/domaine personnalisés.)
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** : type *Web application*.
   - Authorized JavaScript origins : `https://votre-domaine.bj` (+ `http://localhost:3002` pour le dev).
   - Pas de redirect URI nécessaire (flux Google Identity Services par ID token).
4. Copiez le Client ID (`xxxx.apps.googleusercontent.com`) dans `GOOGLE_CLIENT_ID` (serveur backend) **et** `NEXT_PUBLIC_GOOGLE_CLIENT_ID` (build front).

**Vérif :** le bouton officiel Google s'affiche sur `/connexion` (au lieu du bouton de simulation) et la connexion crée un compte.

## 5. Stockage des fichiers — décision

Deux options :

**Option A — disque local (recommandée pour le lancement)** : `STORAGE_DRIVER=local`, rien à coder. Contraintes : un seul serveur, et le dossier `uploads/` doit être un **volume persistant** inclus dans les sauvegardes (§11). C'est le choix simple et suffisant pour un MVP mono-serveur.

**Option B — Cloudinary (choix retenu dans RESTANT_A_FAIRE.md)** : nécessaire si multi-serveurs ou PaaS à disque éphémère (Railway, Render…). ⚠️ **Le driver n'est pas implémenté** (`backend/src/services/storage.service.ts` lève une erreur) — il faut installer le SDK `cloudinary`, implémenter le driver (photos publiques + **URLs privées signées pour les pièces KYC**) et tester : ~1 journée de dev à faire AVANT le déploiement si cette option est retenue.

➡️ Si vous prenez un VPS (option A), aucun blocage. Si vous visez un PaaS, dites-le-moi et j'implémente le driver S3 d'abord.

## 6. Domaines & DNS (15 min + propagation)

1. Achetez le domaine (ex. `okkaz.bj` — registrar béninois pour le .bj, ou `okkaz-benin.com` chez Cloudflare/OVH).
2. Créez deux enregistrements A vers l'IP du serveur :
   - `okkaz.bj` (ou `www`) → front
   - `api.okkaz.bj` → backend
3. Reportez le domaine partout :

| Où | Variable | Valeur |
|---|---|---|
| `.env` serveur backend | `FRONTEND_URL` | `https://okkaz.bj` (CORS + liens emails) |
| `.env` serveur backend | `NODE_ENV` | `production` |
| Build front | `NEXT_PUBLIC_API_URL` | `https://api.okkaz.bj/api/v1` |
| `web/next.config.ts` | `images.remotePatterns` | ajouter `{ protocol: "https", hostname: "api.okkaz.bj", pathname: "/uploads/**" }` |
| Console Google (§4) | Authorized origins | `https://okkaz.bj` |
| Dashboard KKiaPay (§2) | Webhook URL | `https://api.okkaz.bj/api/v1/payments/webhook` |

## 7. Serveur (VPS recommandé, ~30 min)

Un VPS 2 vCPU / 4 Go (Hetzner ~7 €/mois, Contabo, OVH…) suffit largement.

```bash
# Sur le VPS (Ubuntu 24.04)
apt update && apt install -y docker.io docker-compose-v2 caddy
```

Structure conseillée : le `docker-compose.yml` du repo démarre déjà Postgres ; ajoutez un service API (image Node 20, `npm ci && npm run build && npm run start`) avec un volume pour `uploads/`. **Caddy** en front des deux domaines — le HTTPS est automatique :

```
# /etc/caddy/Caddyfile
api.okkaz.bj {
    reverse_proxy localhost:3000
}
okkaz.bj {
    reverse_proxy localhost:3002
}
```

Note : j'ai ajouté `app.set('trust proxy', 1)` au backend (commit du 19 juil.) — le rate limiting voit maintenant la vraie IP du client derrière Caddy/nginx. Rien à faire, juste ne pas l'enlever.

Le front Next : `npm ci && npm run build && npm run start -- -p 3002` (ou déployez-le sur **Vercel**, plus simple encore — dans ce cas seul `api.okkaz.bj` vit sur le VPS).

⚠️ Votre planning mentionne un **staging déjà dockerisé par Larioce (S-1)** — vérifiez avec lui ce qui existe déjà avant de repartir de zéro : il y a peut-être juste à mettre à jour le compose et les variables.

## 8. Premier déploiement (ordre exact)

```bash
# Sur le serveur, dans backend/ du monorepo
cp .env.example .env            # remplir avec TOUTES les valeurs des §1-6
docker compose up -d            # Postgres
npm ci
npx prisma migrate deploy       # applique les 4 migrations
npm run seed                    # catégories + settings + admin
npm run build && npm run start  # (ou via le service Docker / systemd / pm2)
```

**Vérifs immédiates :**
```bash
curl https://api.okkaz.bj/api/v1/health        # → {"success":true,...}
curl -I https://api.okkaz.bj/api/v1/docs       # → 404 (Swagger DÉSACTIVÉ en production : normal et voulu)
```

## 9. Sécuriser le compte admin (2 min, tout de suite après le seed)

Le seed crée `admin@okkaz.bj / Admin@OKKAZ2026` — **ce mot de passe est dans le code source public**. Connectez-vous sur `https://okkaz.bj/admin/profil` → « Changer le mot de passe » immédiatement.

## 10. Recette de bout en bout (30 min, avec la dev front)

Déroulez la checklist du `GUIDE_INTEGRATION.md` §3 sur la prod : inscription (email de vérification reçu ✉️), KYC upload → validation admin, publication → validation → visible, consultation contact, avis, **paiement réel KKiaPay** (3 000 F, remboursables en test), demande « Je recherche ». C'est l'étape S5 de votre planning.

## 11. Sauvegardes (20 min)

```bash
# /etc/cron.daily/okkaz-backup (chmod +x)
#!/bin/bash
DATE=$(date +%F)
docker exec okkaz-postgres pg_dump -U okkaz okkaz_dev | gzip > /var/backups/okkaz-db-$DATE.sql.gz
tar czf /var/backups/okkaz-uploads-$DATE.tar.gz /chemin/vers/uploads
find /var/backups -name "okkaz-*" -mtime +14 -delete
```
Idéalement, synchronisez `/var/backups` vers un stockage externe (Backblaze B2, S3, ou même un `rclone` vers un Drive). **Testez une restauration une fois** — une sauvegarde jamais restaurée n'est pas une sauvegarde.

## 12. Ce qui doit être livré côté front avant l'ouverture

1. **Pages `reset-password/[token]` et `verify-email/[token]`** — les emails de prod pointeront dessus (404 sinon).
2. **Liste des demandes pour les vendeurs** — sans elle, les acheteurs paient pour des demandes que personne ne voit.

(Déjà dans le backlog priorisé de la dev front — points 1-3 de son guide.)

## 13. Après le lancement (recommandé, non bloquant)

- Monitoring d'erreurs : Sentry (gratuit jusqu'à 5k events/mois) côté back et front.
- Uptime : un ping gratuit UptimeRobot sur `/api/v1/health`.
- Passer l'OAuth consent screen Google en « In production » (§4) avant de dépasser 100 utilisateurs Google.
- Rotation des logs Docker (`max-size` dans le compose).

---

## Récapitulatif des variables d'env de production

```bash
# Backend (.env sur le serveur)
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://okkaz.bj
DATABASE_URL=postgresql://okkaz:<MDP_FORT>@localhost:5432/okkaz_dev
JWT_SECRET=<openssl rand -hex 64>
JWT_REFRESH_SECRET=<openssl rand -hex 64>
ENCRYPTION_KEY=<openssl rand -base64 32 — DÉFINITIVE>
GOOGLE_CLIENT_ID=<xxxx.apps.googleusercontent.com>
STORAGE_DRIVER=local
KKIAPAY_PUBLIC_KEY=<clé live>
KKIAPAY_PRIVATE_KEY=<clé live>
KKIAPAY_SECRET_KEY=<clé live>
KKIAPAY_WEBHOOK_SECRET=<openssl rand -hex 32, aussi dans le dashboard KKiaPay>
KKIAPAY_SANDBOX=false
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<login Brevo>
SMTP_PASS=<clé SMTP Brevo>
SMTP_FROM_EMAIL=no-reply@okkaz.bj
WCC_PHONE_NUMBER=<numéro de mise en relation réel>

# Front (.env.production ou variables Vercel)
NEXT_PUBLIC_API_URL=https://api.okkaz.bj/api/v1
NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY=<clé publique live>
NEXT_PUBLIC_KKIAPAY_SANDBOX=false
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<même Client ID>
```
