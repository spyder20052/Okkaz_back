# OKKAZ — Guide d'intégration front (autonome, sans accès au backend)

Ce guide te permet de travailler sur l'intégration **sans avoir accès au repo backend**. Tout ce dont tu as besoin est dans ce repo, branche `integration/backend-api` :

| Document | Contenu |
|---|---|
| **`docs/GUIDE_INTEGRATION.md`** (ce fichier) | Démarrage, architecture front, comment tester chaque parcours |
| **`docs/API_REFERENCE.md`** | Contrat complet de l'API : toutes les routes, corps, réponses, codes d'erreur |
| **`INTEGRATION_BACKEND.md`** (racine) | Liste des 35 écarts front ↔ back : ce qui manque, ce qui a été neutralisé, les décisions produit en attente |
| **`mock/server.mjs`** | Serveur mock de l'API — tu développes sans backend |
| **`docs/openapi.yaml`** | Spec OpenAPI (partielle, à titre indicatif — `API_REFERENCE.md` fait foi) |

---

## 1. Démarrage en 3 commandes

```bash
# Terminal 1 — l'API mock (port 3000, aucune dépendance, Node ≥ 18)
node mock/server.mjs

# Terminal 2 — le front
cp web/.env.example web/.env.local     # laisser NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY VIDE en mode mock
cd web && npm install && npm run dev -- -p 3002
```

Ouvre `http://localhost:3002` → le site tourne sur des données servies par le mock.

**Comptes de connexion** (page `/connexion`) :
| Rôle | Email | Mot de passe |
|---|---|---|
| Admin | `admin@okkaz.bj` | `Admin@OKKAZ2026` |
| Vendeur (KYC déjà approuvé, 5 annonces) | `seller.demo@okkaz.bj` | `Seller@2026` |
| Acheteur | `buyer.demo@okkaz.bj` | `Buyer@2026` |

### Particularités du mock (vs vrai backend)
- **Paiements auto-confirmés après ~6 s** (simule le webhook KKiaPay) → le polling du front aboutit à SUCCESS, l'abonnement s'active, le vendeur devient Premium. Sur le vrai backend en local, le webhook ne joint pas localhost et le statut reste PENDING.
- **Widget KKiaPay simulé** si `NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY` est vide (voir `web/src/lib/kkiapay.ts`) : le flux continue directement vers le polling. Avec une vraie clé sandbox, le vrai widget s'ouvre.
- **Délai avant avis réduit à 10 s** (24 h sur le vrai backend).
- **Uploads acceptés** mais fichiers non stockés : URLs factices renvoyées, `/uploads/*` sert un petit PNG gris.
- **Données en mémoire** : tout est remis à zéro quand tu redémarres le mock.
- Pas de rate limiting (le vrai backend limite `/auth/*` à 10 req/15 min).

Quand tu basculeras sur le vrai backend (ou un staging), il suffira de changer `NEXT_PUBLIC_API_URL` dans `web/.env.local` — aucun changement de code.

---

## 2. Architecture de la couche API (déjà en place)

Tout passe par 4 fichiers dans `web/src/lib/` :

### `api.ts` — le client HTTP
```ts
import { api, mediaUrl, ApiError } from "@/lib/api";

// GET simple → { success, message, data }
const res = await api.get<{ categories: Category[] }>("/categories");
res.data.categories;

// GET paginé → { success, data: T[], meta: { page, limit, total, totalPages } }
const page = await api.getPaginated<Listing>("/listings", { q: "iphone", page: 1 });
page.data; page.meta.totalPages;

// POST / PATCH / DELETE / upload multipart
await api.post("/reviews", { listingId, rating: 5 });
await api.upload("/kyc/upload", formData);

// Erreurs → ApiError { status, code, message }
try { … } catch (e) {
  if (e instanceof ApiError && e.code === "KYC_NOT_APPROVED") { … }
}

// Images du backend (URLs relatives /uploads/...)
<img src={mediaUrl(photo.url)} />
```
Le Bearer token est attaché automatiquement ; sur un 401, le client tente **un refresh puis rejoue la requête** — tu n'as rien à gérer.

### `auth.tsx` — session & rôles
```ts
const { user, isLoading, login, register, logout } = useAuth();
// user: { id, email, phone, firstName, lastName, role, status, kycStatus, … } | null
```
La session vit dans `localStorage` (clé `okkaz_auth`) et se synchronise entre onglets. Les gardes d'accès de `/vendeur` et `/admin` sont dans `SellerShell.tsx` / `AdminShell.tsx`.

### `types.ts` — types & formatage
Types alignés sur le backend + helpers : `formatPrice("45000")` → `"45 000 FCFA"` (⚠️ les prix arrivent en **string**), `RENTAL_PERIOD_LABELS`, `CONDITION_LABELS`, `LISTING_STATUS_LABELS`.

### `kkiapay.ts` — paiements
`openKkiapay({ amount, providerRef, onSuccess, onFailed })` + `pollPaymentStatus(paymentId)`. Flux complet déjà câblé dans `/paiement`.

---

## 3. Tester chaque parcours (checklist)

**Parcours acheteur**
1. `/connexion` → login buyer → redirigé vers `/annonces`.
2. Recherche, filtres catégorie, tri, pagination (tout est serveur).
3. Détail d'une annonce → « Voir le contact » → numéro + lien WhatsApp (numéro de mise en relation OKKAZ si le vendeur n'est pas Premium).
4. Laisser un avis (mock : attendre 10 s après la consultation du contact, sinon message « trop tôt »). Un 2ᵉ avis sur la même annonce → erreur.
5. Signaler l'annonce (bouton en bas du détail).

**Parcours vendeur**
1. Login seller → `/vendeur` : stats et annonces réelles.
2. `/vendeur/publier` : wizard complet → l'annonce part en **PENDING** (bannière l'explique).
3. Se connecter en admin → `/admin/annonces` → Valider → l'annonce devient visible côté public.
4. Paramètres : profil, mot de passe, **section KYC** (crée un nouveau compte vendeur pour voir le flux complet : upload pièce → PENDING → approbation admin → publication débloquée).
5. Premium : `/paiement?type=abonnement` → choisir un plan → paiement (simulé) → après ~10 s le compte passe SELLER_PRO et les annonces en vedette.

**Parcours admin**
1. Login admin → `/admin` : stats, graphique, derniers paiements.
2. `/admin/annonces` (validation), `/admin/kyc` (approbation, « Voir pièce »), `/admin/utilisateurs` (suspendre/bloquer avec motif), `/admin/paiements` (filtres + export CSV), `/admin/reglages` (édition des prix), `/admin/categories` (CRUD), `/admin/moderation` (signalements), `/admin/statistiques`.
3. `/admin/journal`, `/litiges`, `/contrats`, `/proprietaires` : bandeau « démo statique » — **pas d'API pour ces pages** (voir écarts).

---

## 4. Ce qu'il reste à faire côté front (API déjà prête — détail dans INTEGRATION_BACKEND.md §4)

Par ordre de valeur :
1. **Liste des demandes « Je recherche » pour les vendeurs** — `GET /demands` (Premium) / `GET /demands/standard` : c'est le cœur du produit demandes, aucune page ne l'affiche aujourd'hui.
2. **Mot de passe oublié** — `POST /auth/forgot-password` + page `/reset-password/[token]`.
3. **Page de vérification d'email** — `/verify-email/[token]`.
4. **Espace acheteur** — historique contacts consultés (`GET /users/me/contact-reveals`) et paiements (`GET /users/me/payments`), mes demandes (`GET /demands/me`).
5. **Profil public vendeur** — `GET /users/:id/public` (note moyenne, annonces actives).
6. **Modération des avis côté admin** — `PATCH /reviews/:id/moderate`, `DELETE /reviews/:id`.
7. **Filtres additionnels** sur `/annonces` — `city`, `minPrice`/`maxPrice` (déjà supportés par l'API et le mock).

⚠️ **Points en attente de décision produit** (ne pas développer sans arbitrage — détail INTEGRATION_BACKEND.md §A) : demandes réservées au rôle BUYER (la page est sous /vendeur), option « numéro direct » payante, boost par annonce, réservation/booking, OAuth Google/Apple.

---

## 5. Conventions à respecter

- Toujours passer par `api.*` (jamais de `fetch` direct) et par `mediaUrl()` pour les images backend.
- Prix : **string** côté API → `formatPrice()`.
- Téléphones : format `+22997000001` **sans espaces** (regex backend `^\+?\d{8,15}$`).
- Réponses paginées : `data` est **directement le tableau** (contrairement aux réponses simples où `data` est un objet).
- Gérer les codes d'erreur métier (`ApiError.code`) avec des messages français — la table complète est dans `API_REFERENCE.md` §1.
- `useSearchParams()` doit être enveloppé dans `<Suspense>` (pattern déjà en place dans les pages).
