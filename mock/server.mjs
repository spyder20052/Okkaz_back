/**
 * OKKAZ — Serveur MOCK de l'API backend (/api/v1).
 *
 * Permet de développer le frontend SANS accès au vrai backend :
 *   node mock/server.mjs          → API mock sur http://localhost:3000
 *
 * - Aucune dépendance (Node ≥ 18, module natif node:http).
 * - Mêmes contrats que l'API réelle (voir docs/API_REFERENCE.md).
 * - Données en mémoire (réinitialisées à chaque redémarrage).
 * - Les paiements passent automatiquement en SUCCESS après ~6 s
 *   (simule le webhook KKiaPay) : le polling du front aboutit.
 * - Les uploads (KYC, photos) sont acceptés et renvoient des URLs factices.
 *
 * Comptes de démo (mêmes identifiants que le vrai seed) :
 *   admin@okkaz.bj        / Admin@OKKAZ2026   (ADMIN)
 *   seller.demo@okkaz.bj  / Seller@2026       (SELLER, KYC approuvé)
 *   buyer.demo@okkaz.bj   / Buyer@2026        (BUYER)
 */

import http from "node:http";
import crypto from "node:crypto";

const PORT = Number(process.env.MOCK_PORT ?? 3000);
const PREFIX = "/api/v1";
const WCC_PHONE = "+22900000000";

const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const daysAgo = (n) => new Date(Date.now() - n * 864e5).toISOString();

/* ────────────────────────── Données en mémoire ────────────────────────── */

const db = {
  users: [],
  categories: [],
  listings: [],
  photos: [],
  reviews: [],
  reports: [],
  contactReveals: [],
  payments: [],
  subscriptions: [],
  demands: [],
  kycDocuments: [],
  settings: [],
  sessions: new Map(), // accessToken -> userId
  refreshTokens: new Map(), // refreshToken -> userId
};

function addUser(data) {
  const user = {
    id: uuid(),
    email: data.email,
    phone: data.phone,
    password: data.password, // en clair : c'est un mock
    firstName: data.firstName,
    lastName: data.lastName,
    role: data.role ?? "BUYER",
    status: data.status ?? "ACTIVE",
    kycStatus: data.kycStatus ?? "NONE",
    isEmailVerified: true,
    profilePhotoUrl: null,
    city: data.city ?? null,
    address: null,
    reportsCount: 0,
    lastLoginAt: null,
    createdAt: data.createdAt ?? now(),
  };
  db.users.push(user);
  return user;
}

const admin = addUser({
  email: "admin@okkaz.bj", phone: "+22900000001", password: "Admin@OKKAZ2026",
  firstName: "Admin", lastName: "OKKAZ", role: "ADMIN", kycStatus: "APPROVED",
  createdAt: daysAgo(90),
});
const seller = addUser({
  email: "seller.demo@okkaz.bj", phone: "+22997000001", password: "Seller@2026",
  firstName: "Emma", lastName: "Todedji", role: "SELLER", kycStatus: "APPROVED",
  city: "Cotonou", createdAt: daysAgo(30),
});
const buyer = addUser({
  email: "buyer.demo@okkaz.bj", phone: "+22997000002", password: "Buyer@2026",
  firstName: "Jean", lastName: "Hounsou", role: "BUYER", city: "Porto-Novo",
  createdAt: daysAgo(20),
});

db.kycDocuments.push({
  id: uuid(), userId: seller.id, documentType: "ID_CARD",
  frontUrl: "/uploads/kyc/demo/cni-demo.png", backUrl: null,
  status: "APPROVED", rejectionReason: null, createdAt: daysAgo(29),
});

const CATEGORIES = [
  ["Automobiles", "automobiles"], ["Électroménager", "electromenager"],
  ["Électronique", "electronique"], ["Immobilier", "immobilier"],
  ["Outils de travail", "outils-de-travail"], ["Prestation de services", "prestation-de-services"],
  ["Vêtements & accessoires", "vetements-accessoires"], ["Divertissement", "divertissement"],
  ["Animaux", "animaux"],
];
CATEGORIES.forEach(([name, slug], i) => db.categories.push({
  id: uuid(), name, slug, description: `Catégorie ${name}`, iconUrl: null,
  parentId: null, isActive: true, sortOrder: (i + 1) * 10,
  createdAt: daysAgo(60), updatedAt: daysAgo(60), children: [],
}));
const cat = (slug) => db.categories.find((c) => c.slug === slug);

function addListing(data) {
  const listing = {
    id: uuid(), userId: seller.id, categoryId: cat(data.slug).id,
    title: data.title, slug: data.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-demo",
    description: data.description,
    rentalPrice: String(data.rentalPrice), rentalPeriod: data.rentalPeriod,
    purchasePrice: data.purchasePrice ? String(data.purchasePrice) : null,
    isLoa: false, loaDurationMonths: null, condition: data.condition,
    locationCity: data.city, locationAddress: null,
    contactPhone: seller.phone, status: data.status ?? "ACTIVE",
    isFeatured: data.isFeatured ?? false, isUrgent: false,
    viewsCount: data.views ?? 0, contactsCount: data.contacts ?? 0,
    rejectionReason: null, createdAt: data.createdAt ?? daysAgo(5), updatedAt: now(),
  };
  db.listings.push(listing);
  return listing;
}

addListing({ title: "Toyota RAV4 2022 propre", slug: "automobiles", rentalPrice: 45000, rentalPeriod: "DAY", condition: "GOOD", city: "Cotonou", purchasePrice: 18500000, description: "SUV Toyota RAV4 en excellent état, entretien à jour, disponible pour location longue durée à Cotonou.", views: 124, contacts: 3, isFeatured: true, createdAt: daysAgo(10) });
addListing({ title: "iPhone 14 Pro 256Go", slug: "electronique", rentalPrice: 15000, rentalPeriod: "WEEK", condition: "GOOD", city: "Cotonou", description: "iPhone 14 Pro en très bon état avec accessoires, idéal pour usage pro ou création de contenu.", views: 87, contacts: 1, createdAt: daysAgo(7) });
addListing({ title: "Villa meublée 3 chambres Calavi", slug: "immobilier", rentalPrice: 350000, rentalPeriod: "MONTH", condition: "NEW", city: "Abomey-Calavi", description: "Villa moderne meublée avec jardin, idéale famille ou expatriés, quartier calme à Abomey-Calavi.", views: 210, contacts: 5, isFeatured: true, createdAt: daysAgo(12) });
addListing({ title: "Groupe électrogène 20kVA", slug: "outils-de-travail", rentalPrice: 60000, rentalPeriod: "WEEK", condition: "FAIR", city: "Porto-Novo", description: "Groupe électrogène fiable pour événements et chantiers, livraison possible sur Porto-Novo et environs.", views: 45, createdAt: daysAgo(3) });
addListing({ title: "Sono complète mariage 500 pers.", slug: "divertissement", rentalPrice: 90000, rentalPeriod: "DAY", condition: "GOOD", city: "Cotonou", description: "Pack sonorisation + éclairage pour événements jusqu'à 500 personnes, technicien inclus sur demande.", status: "PENDING", createdAt: daysAgo(1) });

db.settings.push(
  { key: "review_min_delay_hours", value: "24", description: "Délai minimal (heures) avant dépôt d'un avis" },
  { key: "review_reminder_delay_hours", value: "48", description: "Délai avant rappel d'avis par email" },
  { key: "max_reports_before_suspend", value: "5", description: "Signalements avant suspension auto" },
  { key: "seller_free_max_photos", value: "4", description: "Photos max pour un SELLER simple" },
  { key: "subscription_weekly_price", value: "3000", description: "Prix abonnement hebdomadaire (FCFA)" },
  { key: "subscription_monthly_price", value: "10000", description: "Prix abonnement mensuel (FCFA)" },
  { key: "demand_listing_price", value: "2500", description: "Prix d'une annonce Je recherche (FCFA)" },
  { key: "express_demand_min_price", value: "5000", description: "Prix minimum d'une demande Express (FCFA)" },
  { key: "express_demand_percent", value: "3", description: "Pourcentage de la valeur du bien (Express)" },
);

/* ────────────────────────── Helpers HTTP ────────────────────────── */

function send(res, status, body) {
  const payload = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  });
  res.end(payload);
}
const ok = (res, data, message = "Success") => send(res, 200, { success: true, message, data });
const created = (res, data, message = "Créé.") => send(res, 201, { success: true, message, data });
const noContent = (res) => send(res, 204, undefined);
const fail = (res, status, code, message, details) =>
  send(res, status, { success: false, error: { code, message, ...(details ? { details } : {}) } });

function paginate(res, items, query) {
  const page = Math.max(1, Number(query.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(query.get("limit") ?? 20)));
  const start = (page - 1) * limit;
  send(res, 200, {
    success: true,
    data: items.slice(start, start + limit),
    meta: { page, limit, total: items.length, totalPages: Math.max(1, Math.ceil(items.length / limit)) },
  });
}

function publicUser(u) {
  const { password, ...rest } = u;
  return rest;
}

function issueTokens(user) {
  const accessToken = `mock_at_${uuid()}`;
  const refreshToken = `mock_rt_${uuid()}`;
  db.sessions.set(accessToken, user.id);
  db.refreshTokens.set(refreshToken, user.id);
  return { accessToken, refreshToken };
}

function authUser(req) {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !db.sessions.has(token)) return null;
  return db.users.find((u) => u.id === db.sessions.get(token)) ?? null;
}

function requireAuth(req, res, roles) {
  const user = authUser(req);
  if (!user) { fail(res, 401, "UNAUTHORIZED", "Authentification requise."); return null; }
  if (roles && !roles.includes(user.role)) {
    fail(res, 403, "INSUFFICIENT_ROLE", "Rôle insuffisant pour cette action.");
    return null;
  }
  return user;
}

function listingView(l, { withOwner = true } = {}) {
  const photos = db.photos.filter((p) => p.listingId === l.id).sort((a, b) => a.sortOrder - b.sortOrder);
  const category = db.categories.find((c) => c.id === l.categoryId);
  const owner = db.users.find((u) => u.id === l.userId);
  const { contactPhone, ...rest } = l;
  return {
    ...rest,
    contactPhoneDisplayed: WCC_PHONE,
    photos,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    ...(withOwner && owner
      ? { owner: { id: owner.id, firstName: owner.firstName, lastName: owner.lastName, role: owner.role, profilePhotoUrl: owner.profilePhotoUrl, city: owner.city } }
      : {}),
  };
}

function hasActiveSubscription(userId) {
  return db.subscriptions.some((s) => s.userId === userId && s.status === "ACTIVE" && new Date(s.endsAt) > new Date());
}

/** Simule le webhook KKiaPay : confirme le paiement quelques secondes plus tard. */
function schedulePaymentSuccess(payment) {
  setTimeout(() => {
    if (payment.status !== "PENDING") return;
    payment.status = "SUCCESS";
    payment.updatedAt = now();
    if (payment.type === "SUBSCRIPTION") {
      const user = db.users.find((u) => u.id === payment.userId);
      const durationDays = payment.metadata.plan === "WEEKLY" ? 7 : 30;
      db.subscriptions.push({
        id: uuid(), userId: payment.userId, plan: payment.metadata.plan,
        amount: payment.amount, status: "ACTIVE", paymentId: payment.id,
        startsAt: now(), endsAt: new Date(Date.now() + durationDays * 864e5).toISOString(),
        autoRenew: true,
      });
      if (user && user.role === "SELLER") user.role = "SELLER_PRO";
      db.listings.filter((l) => l.userId === payment.userId).forEach((l) => { l.isFeatured = true; });
    } else {
      const demand = db.demands.find((d) => d.paymentId === payment.id);
      if (demand) demand.status = "ACTIVE";
    }
    console.log(`✓ [mock webhook] paiement ${payment.id} → SUCCESS`);
  }, 6000);
}

/* ────────────────────────── Routeur ────────────────────────── */

const routes = [];
const route = (method, pattern, handler) => routes.push({ method, pattern, handler });
// pattern: segments, ":x" = paramètre. Ex: "listings/:id/photos"
function matchRoute(method, path) {
  const segments = path.split("/").filter(Boolean);
  outer: for (const r of routes) {
    if (r.method !== method) continue;
    const parts = r.pattern.split("/").filter(Boolean);
    if (parts.length !== segments.length) continue;
    const params = {};
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].startsWith(":")) params[parts[i].slice(1)] = decodeURIComponent(segments[i]);
      else if (parts[i] !== segments[i]) continue outer;
    }
    return { handler: r.handler, params };
  }
  return null;
}

/* ── Santé ── */
route("GET", "health", (ctx) => ok(ctx.res, { status: "ok", env: "mock", ts: now() }));

/* ── Auth ── */
route("POST", "auth/register", (ctx) => {
  const b = ctx.body ?? {};
  for (const field of ["firstName", "lastName", "email", "phone", "password"]) {
    if (!b[field]) return fail(ctx.res, 422, "VALIDATION_ERROR", "Corps invalide.", [{ path: `body.${field}`, message: "Requis" }]);
  }
  if (db.users.some((u) => u.email === String(b.email).toLowerCase() || u.phone === b.phone)) {
    return fail(ctx.res, 409, "USER_ALREADY_EXISTS", "Un compte existe déjà avec cet email ou ce téléphone.");
  }
  const user = addUser({
    email: String(b.email).toLowerCase(), phone: b.phone, password: b.password,
    firstName: b.firstName, lastName: b.lastName,
    role: b.role === "SELLER" ? "SELLER" : "BUYER",
    status: b.role === "SELLER" ? "PENDING_KYC" : "ACTIVE",
  });
  created(ctx.res, { user: publicUser(user), tokens: issueTokens(user) }, "Inscription réussie. Vérifiez votre email.");
});

route("POST", "auth/login", (ctx) => {
  const b = ctx.body ?? {};
  const user = db.users.find((u) =>
    (b.email && u.email === String(b.email).toLowerCase()) || (b.phone && u.phone === b.phone));
  if (!user || user.password !== b.password) {
    return fail(ctx.res, 401, "INVALID_CREDENTIALS", "Identifiants incorrects.");
  }
  if (user.status === "BLOCKED") return fail(ctx.res, 403, "ACCOUNT_BLOCKED", "Compte bloqué.");
  user.lastLoginAt = now();
  ok(ctx.res, { user: publicUser(user), tokens: issueTokens(user) }, "Connexion réussie.");
});

route("POST", "auth/refresh-token", (ctx) => {
  const token = ctx.body?.refreshToken;
  if (!token || !db.refreshTokens.has(token)) {
    return fail(ctx.res, 401, "REFRESH_TOKEN_INVALID", "Refresh token invalide.");
  }
  const userId = db.refreshTokens.get(token);
  db.refreshTokens.delete(token);
  const user = db.users.find((u) => u.id === userId);
  ok(ctx.res, issueTokens(user), "Token rafraîchi.");
});

route("POST", "auth/logout", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res); if (!user) return;
  if (ctx.body?.refreshToken) db.refreshTokens.delete(ctx.body.refreshToken);
  ok(ctx.res, null, "Déconnexion réussie.");
});

route("POST", "auth/forgot-password", (ctx) => ok(ctx.res, null, "Si le compte existe, un email a été envoyé."));
route("POST", "auth/reset-password/:token", (ctx) => ok(ctx.res, null, "Mot de passe réinitialisé."));
route("GET", "auth/verify-email/:token", (ctx) => ok(ctx.res, null, "Email vérifié."));

/* ── Users ── */
route("GET", "users/me", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res); if (!user) return;
  ok(ctx.res, { user: publicUser(user) });
});
route("PATCH", "users/me", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res); if (!user) return;
  for (const field of ["firstName", "lastName", "city", "address", "profilePhotoUrl"]) {
    if (ctx.body?.[field] !== undefined) user[field] = ctx.body[field];
  }
  ok(ctx.res, { user: publicUser(user) }, "Profil mis à jour.");
});
route("PATCH", "users/me/password", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res); if (!user) return;
  if (ctx.body?.currentPassword !== user.password) {
    return fail(ctx.res, 401, "INVALID_CREDENTIALS", "Mot de passe actuel incorrect.");
  }
  user.password = ctx.body.newPassword;
  ok(ctx.res, null, "Mot de passe modifié. Reconnectez-vous.");
});
route("GET", "users/me/listings", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  const items = db.listings
    .filter((l) => l.userId === user.id && l.status !== "DELETED")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((l) => listingView(l, { withOwner: false }));
  paginate(ctx.res, items, ctx.query);
});
route("GET", "users/me/contact-reveals", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["BUYER", "SELLER", "SELLER_PRO"]); if (!user) return;
  const items = db.contactReveals
    .filter((r) => r.userId === user.id)
    .map((r) => ({ ...r, listing: listingView(db.listings.find((l) => l.id === r.listingId)) }));
  paginate(ctx.res, items, ctx.query);
});
route("GET", "users/me/payments", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res); if (!user) return;
  paginate(ctx.res, db.payments.filter((p) => p.userId === user.id), ctx.query);
});
route("GET", "users/:id/public", (ctx) => {
  const user = db.users.find((u) => u.id === ctx.params.id);
  if (!user) return fail(ctx.res, 404, "USER_NOT_FOUND", "Utilisateur introuvable.");
  const reviews = db.reviews.filter((r) => db.listings.some((l) => l.id === r.listingId && l.userId === user.id) && !r.isModerated);
  ok(ctx.res, {
    profile: {
      id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role,
      profilePhotoUrl: user.profilePhotoUrl, city: user.city, createdAt: user.createdAt,
      ratingAverage: reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0,
      ratingCount: reviews.length,
      activeListings: db.listings.filter((l) => l.userId === user.id && l.status === "ACTIVE").slice(0, 20).map((l) => listingView(l, { withOwner: false })),
    },
  });
});

/* ── KYC ── */
route("POST", "kyc/upload", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  const doc = {
    id: uuid(), userId: user.id,
    documentType: ctx.form?.documentType ?? "ID_CARD",
    frontUrl: `/uploads/kyc/${user.id}/mock-front.png`,
    backUrl: ctx.form?.hasBackFile ? `/uploads/kyc/${user.id}/mock-back.png` : null,
    status: "PENDING", rejectionReason: null, createdAt: now(),
  };
  db.kycDocuments.push(doc);
  user.kycStatus = "PENDING";
  created(ctx.res, { document: doc }, "Document KYC soumis pour validation.");
});
route("GET", "kyc/status", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  const latest = db.kycDocuments.filter((d) => d.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
  ok(ctx.res, { kycStatus: user.kycStatus, latestDocument: latest });
});
route("GET", "kyc/admin/list", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const status = ctx.query.get("status");
  const items = db.kycDocuments
    .filter((d) => !status || d.status === status)
    .map((d) => ({ ...d, user: publicUser(db.users.find((u) => u.id === d.userId)) }));
  paginate(ctx.res, items, ctx.query);
});
route("PATCH", "kyc/admin/:id/approve", (ctx) => {
  const adminUser = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!adminUser) return;
  const doc = db.kycDocuments.find((d) => d.id === ctx.params.id);
  if (!doc) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Document introuvable.");
  doc.status = "APPROVED";
  const target = db.users.find((u) => u.id === doc.userId);
  if (target) { target.kycStatus = "APPROVED"; target.status = "ACTIVE"; }
  ok(ctx.res, { document: doc }, "KYC approuvé.");
});
route("PATCH", "kyc/admin/:id/reject", (ctx) => {
  const adminUser = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!adminUser) return;
  const doc = db.kycDocuments.find((d) => d.id === ctx.params.id);
  if (!doc) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Document introuvable.");
  doc.status = "REJECTED";
  doc.rejectionReason = ctx.body?.rejectionReason ?? "Non conforme";
  const target = db.users.find((u) => u.id === doc.userId);
  if (target) target.kycStatus = "REJECTED";
  ok(ctx.res, { document: doc }, "KYC rejeté.");
});

/* ── Catégories ── */
route("GET", "categories", (ctx) => ok(ctx.res, { categories: db.categories.filter((c) => c.isActive && !c.parentId) }));
route("GET", "categories/:slug", (ctx) => {
  const category = db.categories.find((c) => c.slug === ctx.params.slug);
  if (!category) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Catégorie introuvable.");
  ok(ctx.res, { category });
});
route("POST", "categories", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const category = {
    id: uuid(), name: ctx.body?.name, slug: ctx.body?.slug,
    description: ctx.body?.description ?? null, iconUrl: null, parentId: ctx.body?.parentId ?? null,
    isActive: true, sortOrder: ctx.body?.sortOrder ?? 100, createdAt: now(), updatedAt: now(), children: [],
  };
  db.categories.push(category);
  created(ctx.res, { category }, "Catégorie créée.");
});
route("PATCH", "categories/:id", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const category = db.categories.find((c) => c.id === ctx.params.id);
  if (!category) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Catégorie introuvable.");
  Object.assign(category, ctx.body ?? {}, { updatedAt: now() });
  ok(ctx.res, { category }, "Catégorie mise à jour.");
});
route("DELETE", "categories/:id", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const category = db.categories.find((c) => c.id === ctx.params.id);
  if (category) category.isActive = false;
  noContent(ctx.res);
});

/* ── Listings ── */
route("GET", "listings", (ctx) => {
  const q = ctx.query;
  let items = db.listings.filter((l) => l.status === "ACTIVE");
  if (q.get("categoryId")) items = items.filter((l) => l.categoryId === q.get("categoryId"));
  if (q.get("city")) items = items.filter((l) => l.locationCity.toLowerCase().includes(q.get("city").toLowerCase()));
  if (q.get("isLoa") === "true") items = items.filter((l) => l.isLoa);
  if (q.get("minPrice")) items = items.filter((l) => Number(l.rentalPrice) >= Number(q.get("minPrice")));
  if (q.get("maxPrice")) items = items.filter((l) => Number(l.rentalPrice) <= Number(q.get("maxPrice")));
  const text = q.get("q")?.toLowerCase();
  if (text) items = items.filter((l) => l.title.toLowerCase().includes(text) || l.description.toLowerCase().includes(text));
  const sort = q.get("sort") ?? "recent";
  items.sort((a, b) => {
    if (sort === "price_asc") return Number(a.rentalPrice) - Number(b.rentalPrice);
    if (sort === "price_desc") return Number(b.rentalPrice) - Number(a.rentalPrice);
    if (sort === "featured") return Number(b.isFeatured) - Number(a.isFeatured) || b.createdAt.localeCompare(a.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });
  paginate(ctx.res, items.map((l) => listingView(l)), ctx.query);
});
route("GET", "listings/featured", (ctx) =>
  ok(ctx.res, { items: db.listings.filter((l) => l.status === "ACTIVE" && l.isFeatured).slice(0, 20).map((l) => listingView(l)) }));
route("GET", "listings/:id", (ctx) => {
  const listing = db.listings.find((l) => l.id === ctx.params.id && l.status !== "DELETED");
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  listing.viewsCount += 1;
  ok(ctx.res, { listing: listingView(listing) });
});
route("POST", "listings/:id/contact", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["BUYER", "SELLER", "SELLER_PRO"]); if (!user) return;
  const listing = db.listings.find((l) => l.id === ctx.params.id);
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  const isPro = hasActiveSubscription(listing.userId);
  if (!db.contactReveals.some((r) => r.userId === user.id && r.listingId === listing.id)) {
    db.contactReveals.push({ id: uuid(), userId: user.id, listingId: listing.id, createdAt: now() });
    listing.contactsCount += 1;
  }
  ok(ctx.res, {
    contactPhone: isPro ? listing.contactPhone : WCC_PHONE,
    isOwnerNumber: isPro,
    watermark: `OKKAZ-USER-${user.id.slice(0, 8)}-${Date.now()}`,
  });
});
route("POST", "listings", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  if (user.kycStatus !== "APPROVED") {
    return fail(ctx.res, 403, "KYC_NOT_APPROVED", "Votre identité doit être vérifiée avant de publier.");
  }
  const b = ctx.body ?? {};
  for (const field of ["title", "description", "categoryId", "rentalPrice", "rentalPeriod", "condition", "locationCity", "contactPhone"]) {
    if (b[field] === undefined || b[field] === "") {
      return fail(ctx.res, 422, "VALIDATION_ERROR", "Corps invalide.", [{ path: `body.${field}`, message: "Requis" }]);
    }
  }
  if (b.isLoa && user.role !== "SELLER_PRO") return fail(ctx.res, 403, "LOA_PRO_ONLY", "La LOA est réservée aux vendeurs Premium.");
  const listing = {
    id: uuid(), userId: user.id, categoryId: b.categoryId, title: b.title,
    slug: b.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + uuid().slice(0, 8),
    description: b.description, rentalPrice: String(b.rentalPrice), rentalPeriod: b.rentalPeriod,
    purchasePrice: b.purchasePrice ? String(b.purchasePrice) : null,
    isLoa: !!b.isLoa, loaDurationMonths: b.loaDurationMonths ?? null,
    condition: b.condition, locationCity: b.locationCity, locationAddress: b.locationAddress ?? null,
    contactPhone: b.contactPhone, status: "PENDING", isFeatured: false, isUrgent: false,
    viewsCount: 0, contactsCount: 0, rejectionReason: null, createdAt: now(), updatedAt: now(),
  };
  db.listings.push(listing);
  created(ctx.res, { listing: listingView(listing) }, "Annonce soumise pour validation.");
});
route("PATCH", "listings/:id", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO", "ADMIN"]); if (!user) return;
  const listing = db.listings.find((l) => l.id === ctx.params.id);
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  if (listing.userId !== user.id && user.role !== "ADMIN") return fail(ctx.res, 403, "NOT_OWNER", "Cette annonce ne vous appartient pas.");
  for (const field of ["title", "description", "categoryId", "rentalPeriod", "condition", "locationCity", "locationAddress", "contactPhone", "isLoa", "loaDurationMonths"]) {
    if (ctx.body?.[field] !== undefined) listing[field] = ctx.body[field];
  }
  if (ctx.body?.rentalPrice !== undefined) listing.rentalPrice = String(ctx.body.rentalPrice);
  if (ctx.body?.purchasePrice !== undefined) listing.purchasePrice = ctx.body.purchasePrice ? String(ctx.body.purchasePrice) : null;
  if (user.role !== "ADMIN") listing.status = "PENDING";
  listing.updatedAt = now();
  ok(ctx.res, { listing: listingView(listing) }, "Annonce mise à jour (re-validation requise).");
});
route("DELETE", "listings/:id", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO", "ADMIN"]); if (!user) return;
  const listing = db.listings.find((l) => l.id === ctx.params.id);
  if (listing) listing.status = "DELETED";
  noContent(ctx.res);
});
route("POST", "listings/:id/photos", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  const listing = db.listings.find((l) => l.id === ctx.params.id);
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  const existing = db.photos.filter((p) => p.listingId === listing.id).length;
  const count = Math.max(1, ctx.form?.fileCount ?? 1);
  if (user.role === "SELLER" && existing + count > 4) {
    return fail(ctx.res, 403, "PHOTO_LIMIT_EXCEEDED", "4 photos maximum en compte gratuit.");
  }
  const photos = [];
  for (let i = 0; i < count; i++) {
    const photo = {
      id: uuid(), listingId: listing.id,
      url: `/uploads/listings/${listing.id}/mock-${existing + i + 1}.jpg`,
      sortOrder: existing + i, isCover: existing + i === Number(ctx.form?.coverIndex ?? 0),
    };
    db.photos.push(photo);
    photos.push(photo);
  }
  created(ctx.res, { photos }, "Photos ajoutées.");
});
route("DELETE", "listings/:id/photos/:photoId", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO", "ADMIN"]); if (!user) return;
  db.photos = db.photos.filter((p) => p.id !== ctx.params.photoId);
  noContent(ctx.res);
});
route("PATCH", "listings/:id/pause", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  const listing = db.listings.find((l) => l.id === ctx.params.id);
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  listing.status = "PAUSED";
  ok(ctx.res, { listing: listingView(listing) }, "Annonce mise en pause.");
});
route("PATCH", "listings/:id/resume", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  const listing = db.listings.find((l) => l.id === ctx.params.id);
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  listing.status = "ACTIVE";
  ok(ctx.res, { listing: listingView(listing) }, "Annonce réactivée.");
});

/* ── Reviews ── */
route("POST", "reviews", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["BUYER", "SELLER", "SELLER_PRO"]); if (!user) return;
  const { listingId, rating, comment } = ctx.body ?? {};
  const listing = db.listings.find((l) => l.id === listingId);
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  if (listing.userId === user.id) return fail(ctx.res, 403, "CANNOT_REVIEW_SELF", "Impossible d'évaluer votre propre annonce.");
  const reveal = db.contactReveals.find((r) => r.userId === user.id && r.listingId === listingId);
  if (!reveal) return fail(ctx.res, 403, "NO_CONTACT_REVEAL", "Consultez d'abord le contact de l'annonce.");
  // NB mock : le délai de 24 h est réduit à 10 secondes pour faciliter les tests.
  if (Date.now() - new Date(reveal.createdAt).getTime() < 10_000) {
    return fail(ctx.res, 403, "REVIEW_TOO_EARLY", "Merci d'attendre avant de laisser un avis (mock : 10 s).");
  }
  if (db.reviews.some((r) => r.reviewerId === user.id && r.listingId === listingId)) {
    return fail(ctx.res, 409, "DUPLICATE_ENTRY", "Vous avez déjà laissé un avis sur cette annonce.");
  }
  const review = {
    id: uuid(), reviewerId: user.id, listingId, rating: Number(rating),
    comment: comment ?? null, isModerated: false, createdAt: now(),
    reviewer: { id: user.id, firstName: user.firstName, lastName: user.lastName, profilePhotoUrl: user.profilePhotoUrl },
  };
  db.reviews.push(review);
  created(ctx.res, { review }, "Avis publié.");
});
route("GET", "reviews/listing/:id", (ctx) => {
  const reviews = db.reviews.filter((r) => r.listingId === ctx.params.id && !r.isModerated);
  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  ok(ctx.res, { reviews, stats: { average, count: reviews.length } });
});
route("PATCH", "reviews/:id/moderate", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const review = db.reviews.find((r) => r.id === ctx.params.id);
  if (!review) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Avis introuvable.");
  review.isModerated = !!ctx.body?.isModerated;
  ok(ctx.res, { review }, "Avis modéré.");
});
route("DELETE", "reviews/:id", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  db.reviews = db.reviews.filter((r) => r.id !== ctx.params.id);
  noContent(ctx.res);
});

/* ── Reports ── */
route("POST", "reports", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["BUYER", "SELLER", "SELLER_PRO"]); if (!user) return;
  const report = {
    id: uuid(), reporterId: user.id, reportedUserId: ctx.body?.reportedUserId ?? null,
    listingId: ctx.body?.listingId ?? null, reason: ctx.body?.reason ?? "OTHER",
    description: ctx.body?.description ?? null, status: "OPEN", adminNote: null, createdAt: now(),
  };
  db.reports.push(report);
  created(ctx.res, { report }, "Signalement enregistré.");
});
route("GET", "reports/admin/list", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const status = ctx.query.get("status");
  const items = db.reports.filter((r) => !status || r.status === status).map((r) => ({
    ...r,
    reporter: publicUser(db.users.find((u) => u.id === r.reporterId) ?? buyer),
    reportedUser: r.reportedUserId ? publicUser(db.users.find((u) => u.id === r.reportedUserId) ?? seller) : null,
    listing: r.listingId ? listingView(db.listings.find((l) => l.id === r.listingId), { withOwner: false }) : null,
  }));
  paginate(ctx.res, items, ctx.query);
});
route("GET", "reports/admin/:id", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const report = db.reports.find((r) => r.id === ctx.params.id);
  if (!report) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Signalement introuvable.");
  ok(ctx.res, { report });
});
route("PATCH", "reports/admin/:id/review", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const report = db.reports.find((r) => r.id === ctx.params.id);
  if (!report) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Signalement introuvable.");
  report.status = ctx.body?.status ?? "REVIEWED";
  report.adminNote = ctx.body?.adminNote ?? report.adminNote;
  ok(ctx.res, { report }, "Signalement traité.");
});

/* ── Subscriptions ── */
route("GET", "subscriptions/plans", (ctx) => ok(ctx.res, {
  plans: [
    { plan: "WEEKLY", price: 3000, currency: "XOF", durationDays: 7 },
    { plan: "MONTHLY", price: 10000, currency: "XOF", durationDays: 30 },
  ],
}));
route("POST", "subscriptions/subscribe", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  if (hasActiveSubscription(user.id)) {
    return fail(ctx.res, 409, "SUBSCRIPTION_ALREADY_ACTIVE", "Un abonnement est déjà actif.");
  }
  const plan = ctx.body?.plan === "WEEKLY" ? "WEEKLY" : "MONTHLY";
  const payment = {
    id: uuid(), userId: user.id, type: "SUBSCRIPTION",
    amount: String(plan === "WEEKLY" ? 3000 : 10000), currency: "XOF",
    method: ctx.body?.method ?? "MOBILE_MONEY", provider: null,
    providerRef: `sub_${uuid()}`, status: "PENDING", metadata: { plan },
    createdAt: now(), updatedAt: now(),
  };
  db.payments.push(payment);
  schedulePaymentSuccess(payment);
  created(ctx.res, {
    payment: { id: payment.id, amount: payment.amount, currency: payment.currency, status: payment.status, providerRef: payment.providerRef },
    plan,
  }, "Paiement initié.");
});
route("GET", "subscriptions/me", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  const subscription = db.subscriptions.filter((s) => s.userId === user.id).sort((a, b) => b.startsAt.localeCompare(a.startsAt))[0] ?? null;
  ok(ctx.res, { subscription });
});
route("POST", "subscriptions/cancel", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  const subscription = db.subscriptions.find((s) => s.userId === user.id && s.status === "ACTIVE");
  if (!subscription) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Aucun abonnement actif.");
  subscription.autoRenew = false;
  ok(ctx.res, { subscription }, "Renouvellement désactivé.");
});

/* ── Demands ── */
route("POST", "demands/initiate", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["BUYER", "SELLER", "SELLER_PRO"]); if (!user) return;
  const b = ctx.body ?? {};
  const type = b.type === "EXPRESS" ? "EXPRESS" : "STANDARD";
  const amount = type === "STANDARD" ? 2500 : Math.max(5000, Math.round((Number(b.propertyValue) || 0) * 0.03));
  const payment = {
    id: uuid(), userId: user.id, type: type === "STANDARD" ? "DEMAND_LISTING" : "EXPRESS_DEMAND",
    amount: String(amount), currency: "XOF", method: b.method ?? "MOBILE_MONEY", provider: null,
    providerRef: `dmd_${uuid()}`, status: "PENDING", metadata: {}, createdAt: now(), updatedAt: now(),
  };
  const demand = {
    id: uuid(), userId: user.id, categoryId: b.categoryId, title: b.title, description: b.description,
    maxBudget: b.maxBudget ? String(b.maxBudget) : null, city: b.city, type,
    isUrgent: type === "EXPRESS", paymentId: payment.id, status: "CLOSED", // devient ACTIVE au "webhook"
    expiresAt: new Date(Date.now() + 30 * 864e5).toISOString(), createdAt: now(),
  };
  db.payments.push(payment);
  db.demands.push(demand);
  schedulePaymentSuccess(payment);
  created(ctx.res, {
    demand,
    payment: { id: payment.id, amount: payment.amount, currency: payment.currency, providerRef: payment.providerRef },
  }, "Demande initiée — paiement en attente.");
});
route("GET", "demands", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER_PRO"]); if (!user) return;
  paginate(ctx.res, db.demands.filter((d) => d.status === "ACTIVE"), ctx.query);
});
route("GET", "demands/standard", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO"]); if (!user) return;
  paginate(ctx.res, db.demands.filter((d) => d.status === "ACTIVE" && d.type === "STANDARD"), ctx.query);
});
route("GET", "demands/me", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["BUYER", "SELLER", "SELLER_PRO"]); if (!user) return;
  paginate(ctx.res, db.demands.filter((d) => d.userId === user.id), ctx.query);
});
route("PATCH", "demands/:id/close", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["BUYER", "SELLER", "SELLER_PRO", "ADMIN"]); if (!user) return;
  const demand = db.demands.find((d) => d.id === ctx.params.id);
  if (!demand) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Demande introuvable.");
  if (user.role !== "ADMIN" && demand.userId !== user.id) {
    return fail(ctx.res, 403, "FORBIDDEN", "Vous ne pouvez fermer que vos propres demandes.");
  }
  demand.status = "CLOSED";
  ok(ctx.res, { demand }, "Demande clôturée.");
});
route("GET", "demands/:id", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["SELLER", "SELLER_PRO", "ADMIN"]); if (!user) return;
  const demand = db.demands.find((d) => d.id === ctx.params.id);
  if (!demand) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Demande introuvable.");
  if (demand.type === "EXPRESS" && user.role === "SELLER") {
    return fail(ctx.res, 403, "EXPRESS_PRO_ONLY", "Demande Express réservée aux vendeurs Premium.");
  }
  ok(ctx.res, { demand });
});

/* ── Payments ── */
route("GET", "payments/:id/status", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res); if (!user) return;
  const payment = db.payments.find((p) => p.id === ctx.params.id && p.userId === user.id);
  if (!payment) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Paiement introuvable.");
  const { metadata, ...view } = payment;
  ok(ctx.res, { payment: view });
});

/* ── Admin ── */
route("GET", "admin/dashboard/stats", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  ok(ctx.res, {
    totalUsers: db.users.length,
    totalListings: db.listings.filter((l) => l.status !== "DELETED").length,
    totalActiveListings: db.listings.filter((l) => l.status === "ACTIVE").length,
    totalTransactions: db.payments.filter((p) => p.status === "SUCCESS").length,
    totalRevenue: db.payments.filter((p) => p.status === "SUCCESS").reduce((s, p) => s + Number(p.amount), 0),
    pendingKycCount: db.kycDocuments.filter((d) => d.status === "PENDING").length,
    pendingListingsCount: db.listings.filter((l) => l.status === "PENDING").length,
    openReportsCount: db.reports.filter((r) => r.status === "OPEN").length,
  });
});
route("GET", "admin/dashboard/revenue", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const rows = Array.from({ length: 12 }, (_, i) => ({
    date: new Date(Date.now() - (11 - i) * 30 * 864e5).toISOString().slice(0, 10),
    amount: [12000, 18000, 9500, 22000, 31000, 15000, 27000, 19500, 24000, 35000, 28000, 41000][i],
  }));
  ok(ctx.res, { rows });
});
route("GET", "admin/dashboard/users-growth", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const rows = Array.from({ length: 12 }, (_, i) => ({
    date: new Date(Date.now() - (11 - i) * 30 * 864e5).toISOString().slice(0, 10),
    count: [3, 5, 4, 8, 12, 9, 15, 11, 18, 22, 19, 28][i],
  }));
  ok(ctx.res, { rows });
});
route("GET", "admin/dashboard/top-listings", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  ok(ctx.res, { items: [...db.listings].sort((a, b) => b.viewsCount - a.viewsCount).slice(0, 10).map((l) => listingView(l)) });
});
route("GET", "admin/dashboard/top-categories", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const counts = new Map();
  db.listings.forEach((l) => counts.set(l.categoryId, (counts.get(l.categoryId) ?? 0) + 1));
  const items = [...counts.entries()]
    .map(([categoryId, count]) => ({ category: db.categories.find((c) => c.id === categoryId), count }))
    .sort((a, b) => b.count - a.count);
  ok(ctx.res, { items });
});
route("GET", "admin/users", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const q = ctx.query;
  let items = [...db.users];
  if (q.get("role")) items = items.filter((u) => u.role === q.get("role"));
  if (q.get("status")) items = items.filter((u) => u.status === q.get("status"));
  if (q.get("kycStatus")) items = items.filter((u) => u.kycStatus === q.get("kycStatus"));
  const text = q.get("q")?.toLowerCase();
  if (text) items = items.filter((u) => [u.email, u.phone, u.firstName, u.lastName].some((v) => v?.toLowerCase().includes(text)));
  paginate(ctx.res, items.map(publicUser), ctx.query);
});
route("GET", "admin/users/:id", (ctx) => {
  const adminUser = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!adminUser) return;
  const target = db.users.find((u) => u.id === ctx.params.id);
  if (!target) return fail(ctx.res, 404, "USER_NOT_FOUND", "Utilisateur introuvable.");
  ok(ctx.res, {
    user: {
      ...publicUser(target),
      kycDocuments: db.kycDocuments.filter((d) => d.userId === target.id),
      listings: db.listings.filter((l) => l.userId === target.id).slice(0, 10),
      payments: db.payments.filter((p) => p.userId === target.id).slice(0, 10),
      subscriptions: db.subscriptions.filter((s) => s.userId === target.id),
    },
  });
});
const setStatus = (status) => (ctx) => {
  const adminUser = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!adminUser) return;
  const target = db.users.find((u) => u.id === ctx.params.id);
  if (!target) return fail(ctx.res, 404, "USER_NOT_FOUND", "Utilisateur introuvable.");
  target.status = status;
  ok(ctx.res, { user: publicUser(target) }, "Statut mis à jour.");
};
route("PATCH", "admin/users/:id/suspend", setStatus("SUSPENDED"));
route("PATCH", "admin/users/:id/block", setStatus("BLOCKED"));
route("PATCH", "admin/users/:id/activate", setStatus("ACTIVE"));
route("PATCH", "admin/users/:id/role", (ctx) => {
  const adminUser = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!adminUser) return;
  const target = db.users.find((u) => u.id === ctx.params.id);
  if (!target) return fail(ctx.res, 404, "USER_NOT_FOUND", "Utilisateur introuvable.");
  target.role = ctx.body?.role ?? target.role;
  ok(ctx.res, { user: publicUser(target) }, "Rôle mis à jour.");
});
route("GET", "admin/listings", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const q = ctx.query;
  let items = db.listings.filter((l) => l.status !== "DELETED");
  if (q.get("status")) items = db.listings.filter((l) => l.status === q.get("status"));
  if (q.get("userId")) items = items.filter((l) => l.userId === q.get("userId"));
  if (q.get("categoryId")) items = items.filter((l) => l.categoryId === q.get("categoryId"));
  paginate(ctx.res, items.map((l) => listingView(l)), ctx.query);
});
route("PATCH", "admin/listings/:id/validate", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const listing = db.listings.find((l) => l.id === ctx.params.id);
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  listing.status = "ACTIVE";
  ok(ctx.res, { listing: listingView(listing) }, "Annonce validée.");
});
route("PATCH", "admin/listings/:id/reject", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const listing = db.listings.find((l) => l.id === ctx.params.id);
  if (!listing) return fail(ctx.res, 404, "RECORD_NOT_FOUND", "Annonce introuvable.");
  listing.status = "REJECTED";
  listing.rejectionReason = ctx.body?.rejectionReason ?? "Non conforme";
  ok(ctx.res, { listing: listingView(listing) }, "Annonce refusée.");
});
route("DELETE", "admin/listings/:id", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  db.listings = db.listings.filter((l) => l.id !== ctx.params.id);
  noContent(ctx.res);
});
route("GET", "admin/payments", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  const q = ctx.query;
  let items = [...db.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  if (q.get("type")) items = items.filter((p) => p.type === q.get("type"));
  if (q.get("status")) items = items.filter((p) => p.status === q.get("status"));
  if (q.get("method")) items = items.filter((p) => p.method === q.get("method"));
  paginate(ctx.res, items.map(({ metadata, ...p }) => ({
    ...p,
    user: publicUser(db.users.find((u) => u.id === p.userId) ?? buyer),
  })), ctx.query);
});
route("GET", "admin/settings", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  ok(ctx.res, { settings: db.settings });
});
route("PATCH", "admin/settings/:key", (ctx) => {
  const user = requireAuth(ctx.req, ctx.res, ["ADMIN"]); if (!user) return;
  let setting = db.settings.find((s) => s.key === ctx.params.key);
  if (!setting) { setting = { key: ctx.params.key, value: "", description: null }; db.settings.push(setting); }
  setting.value = String(ctx.body?.value ?? "");
  ok(ctx.res, { setting }, "Réglage mis à jour.");
});

/* ────────────────────────── Serveur ────────────────────────── */

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Max-Age": "86400",
    });
    return res.end();
  }

  const url = new URL(req.url, `http://localhost:${PORT}`);

  // Fichiers /uploads factices → petit PNG gris généré à la volée
  if (url.pathname.startsWith("/uploads/")) {
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAF0lEQVR4nGNgYGD4//8/AwMDEwMDAwMDABkGAwUf5Kk9AAAAAElFTkSuQmCC",
      "base64",
    );
    res.writeHead(200, { "Content-Type": "image/png", "Access-Control-Allow-Origin": "*" });
    return res.end(png);
  }

  if (!url.pathname.startsWith(PREFIX)) {
    return fail(res, 404, "ROUTE_NOT_FOUND", `Route inconnue (préfixe attendu : ${PREFIX}).`);
  }
  const path = url.pathname.slice(PREFIX.length);
  const match = matchRoute(req.method, path);
  if (!match) return fail(res, 404, "ROUTE_NOT_FOUND", `Route inconnue : ${req.method} ${url.pathname}`);

  // Lecture du corps (JSON ou multipart simplifié)
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks);
  let body = null;
  let form = null;
  const contentType = req.headers["content-type"] ?? "";
  if (contentType.includes("application/json") && raw.length) {
    try { body = JSON.parse(raw.toString("utf-8")); }
    catch { return fail(res, 400, "INVALID_JSON", "JSON malformé."); }
  } else if (contentType.includes("multipart/form-data")) {
    // Parsing minimal : on compte les fichiers et on lit les champs texte
    const text = raw.toString("latin1");
    form = {
      fileCount: (text.match(/filename="/g) ?? []).length,
      hasBackFile: text.includes('name="back_file"'),
      documentType: /name="documentType"\r\n\r\n([^\r]+)/.exec(text)?.[1],
      coverIndex: /name="coverIndex"\r\n\r\n([^\r]+)/.exec(text)?.[1],
    };
  }

  try {
    await match.handler({ req, res, params: match.params, query: url.searchParams, body, form });
  } catch (err) {
    console.error("✗ mock error:", err);
    fail(res, 500, "INTERNAL_ERROR", "Erreur interne du mock.");
  }
});

server.listen(PORT, () => {
  console.log(`
▶ OKKAZ API MOCK — http://localhost:${PORT}${PREFIX}
  Santé      : GET ${PREFIX}/health
  Comptes    : admin@okkaz.bj / Admin@OKKAZ2026
               seller.demo@okkaz.bj / Seller@2026 (KYC approuvé)
               buyer.demo@okkaz.bj / Buyer@2026
  Notes mock : paiements auto-confirmés après ~6 s · délai d'avis réduit à 10 s
               uploads acceptés (URLs factices) · données remises à zéro au redémarrage
`);
});
