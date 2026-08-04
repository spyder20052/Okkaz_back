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

## 5. Stockage des fichiers — dans Neon (choix acté, rien à configurer)

Les fichiers (photos d'annonces, pièces KYC) sont stockés **directement dans la base Neon** (`STORAGE_DRIVER=db`, table `stored_files`) et servis par l'API via `GET /files/:id` :
- **Photos d'annonces** : publiques, cache navigateur long (contenu immuable).
- **Pièces KYC** : privées — servies uniquement avec un token **admin** ou celui du **propriétaire** du document (contrôle d'accès réel, vérifié par tests).

Aucun compte externe à créer. Deux limites à connaître :
- **Quota Neon** : ~0,5 Go en gratuit — avec des photos ≤ 4 Mo, surveillez la jauge (Neon console → Storage) et passez au plan Launch (10 Go) quand nécessaire.
- **Vercel** limite les corps de requête/réponse à ~4,5 Mo : les uploads sont déjà plafonnés à 5 Mo par Multer, restez sous 4 Mo par photo en pratique.

(Le driver Cloudinary reste disponible dans le code — `STORAGE_DRIVER=cloudinary` + `CLOUDINARY_URL` — si le volume d'images explose un jour.)

## 6. Base de données — Neon (choix acté)

1. [console.neon.tech](https://console.neon.tech) → **Create project** : nom `okkaz`, région la plus proche (ex. `eu-central-1`), Postgres **16**.
2. Dans « Connection details », copiez **deux** URLs :
   - **Pooled connection** (host contenant `-pooler`) → `DATABASE_URL` — celle que l'app utilise (indispensable en serverless).
   - **Direct connection** (sans `-pooler`) → `DIRECT_DATABASE_URL` — celle que les migrations Prisma utilisent (déjà câblé dans `schema.prisma`).
   Les deux se terminent par `?sslmode=require`.
3. Appliquez le schéma et les données initiales **depuis votre machine** :
   ```bash
   cd backend
   DATABASE_URL="<pooled>" DIRECT_DATABASE_URL="<direct>" npx prisma migrate deploy
   DATABASE_URL="<pooled>" npm run seed
   ```
4. Activez les **sauvegardes** : Neon fait du point-in-time recovery automatique (7 jours en gratuit) — vérifiez la rétention dans Settings → Storage.

**Vérif** : `npx prisma migrate status` avec les URLs Neon → « Database schema is up to date! ».

## 7. Déploiement Vercel — deux projets sur le même repo

Le monorepo donne **deux projets Vercel** distincts (même repo GitHub `5core-team/okkaz_backend`, branche de prod) :

### 7a. Projet « okkaz-api » (backend)
1. Vercel → Add New Project → importez le repo → **Root Directory : `backend`**.
2. Le fichier `backend/vercel.json` est déjà en place : toutes les requêtes sont réécrites vers l'app Express (`backend/api/index.ts`) et le **cron des rappels d'avis** tourne chaque heure.
3. Variables d'environnement (Production) — le récapitulatif complet est en fin de guide : `DATABASE_URL` (pooled Neon), `DIRECT_DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `STORAGE_DRIVER=cloudinary`, `CLOUDINARY_URL`, clés KKiaPay live, SMTP, `GOOGLE_CLIENT_ID`, `WCC_PHONE_NUMBER`, `FRONTEND_URL`, `CRON_SECRET` (openssl rand -hex 32 — Vercel l'injecte automatiquement sur l'appel cron), `NODE_ENV=production`.
4. Domaine du projet : `api.okkaz.bj` (Settings → Domains ; suivez les instructions DNS de Vercel).

### 7b. Projet « okkaz-web » (frontend)
1. Add New Project → même repo → **Root Directory : `web`** (framework Next.js auto-détecté).
2. Variables (Production) : `NEXT_PUBLIC_API_URL=https://api.okkaz.bj/api/v1`, `NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY` (live), `NEXT_PUBLIC_KKIAPAY_SANDBOX=false`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.
3. Domaine : `okkaz.bj` (+ `www`).
4. `web/next.config.ts` accepte déjà les images Cloudinary et du domaine API.

### Particularités serverless à connaître
- Le **rate limiting** est en mémoire par instance : les quotas sont approximatifs sur Vercel (plusieurs instances) — acceptable au lancement ; passer sur un store Redis (Upstash) si besoin plus tard.
- Les **logs** : Vercel → projet → Logs (ou `vercel logs`).
- `trust proxy` est déjà activé en production (IP réelle du client vue par le rate limiter).

## 8. Premier déploiement (ordre exact)

1. §1 secrets générés, §2 KKiaPay live, §3 SMTP, §4 Google, §5 stockage (rien à faire), §6 Neon migrée + seedée.
2. Créez les deux projets Vercel (§7) avec toutes les variables **avant** le premier build.
3. Poussez la branche de prod → Vercel build les deux projets.
4. Branchez les domaines, puis reportez les URLs définitives : `FRONTEND_URL` (projet API), webhook KKiaPay (`https://api.okkaz.bj/api/v1/payments/webhook`), origins Google.

**Vérifs immédiates :**
```bash
curl https://api.okkaz.bj/api/v1/health        # → {"success":true,...}
curl -I https://api.okkaz.bj/api/v1/docs       # → 404 (Swagger désactivé en production : voulu)
```
Puis sur https://okkaz.bj : inscription, publication avec photo (Cloudinary), validation admin.

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
DATABASE_URL=<URL poolée Neon (-pooler), sslmode=require>
DIRECT_DATABASE_URL=<URL directe Neon, sslmode=require>
JWT_SECRET=<openssl rand -hex 64>
JWT_REFRESH_SECRET=<openssl rand -hex 64>
ENCRYPTION_KEY=<openssl rand -base64 32 — DÉFINITIVE>
GOOGLE_CLIENT_ID=<xxxx.apps.googleusercontent.com>
STORAGE_DRIVER=db
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
WCC_PHONE_NUMBER=<numéro de mise en relation réel (modifiable ensuite via system_settings)>
CRON_SECRET=<openssl rand -hex 32>

# Front (.env.production ou variables Vercel)
NEXT_PUBLIC_API_URL=https://api.okkaz.bj/api/v1
NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY=<clé publique live>
NEXT_PUBLIC_KKIAPAY_SANDBOX=false
NEXT_PUBLIC_GOOGLE_CLIENT_ID=<même Client ID>
```
