import type { Request, Response } from 'express';
import * as service from './admin.service';
import { sendSuccess, sendPaginated, sendNoContent } from '../../utils/apiResponse';

// --- Users ------------------------------------------------------------------

/**
 * `GET /admin/users` — Liste les utilisateurs (paginé, filtrable).
 */
export async function listUsers(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listUsers(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `GET /admin/users/:id` — Détail complet d'un utilisateur (admin).
 */
export async function getUser(req: Request, res: Response): Promise<Response> {
  const user = await service.getUser(req.params.id!);
  return sendSuccess(res, { user });
}

/**
 * `PATCH /admin/users/:id/suspend` — Suspend un compte.
 */
export async function suspend(req: Request, res: Response): Promise<Response> {
  const user = await service.setUserStatus(req.params.id!, 'SUSPENDED', req.body.reason);
  return sendSuccess(res, { user }, 'Compte suspendu.');
}

/**
 * `PATCH /admin/users/:id/block` — Bloque un compte.
 */
export async function block(req: Request, res: Response): Promise<Response> {
  const user = await service.setUserStatus(req.params.id!, 'BLOCKED', req.body.reason);
  return sendSuccess(res, { user }, 'Compte bloqué.');
}

/**
 * `PATCH /admin/users/:id/activate` — Réactive un compte.
 */
export async function activate(req: Request, res: Response): Promise<Response> {
  const user = await service.setUserStatus(req.params.id!, 'ACTIVE');
  return sendSuccess(res, { user }, 'Compte réactivé.');
}

/**
 * `PATCH /admin/users/:id/role` — Met à jour le rôle d'un utilisateur.
 */
export async function updateRole(req: Request, res: Response): Promise<Response> {
  const user = await service.setUserRole(req.params.id!, req.body.role);
  return sendSuccess(res, { user }, 'Rôle mis à jour.');
}

// --- Listings ---------------------------------------------------------------

/**
 * `GET /admin/listings` — Liste toutes les annonces (admin, filtrable).
 */
export async function listListings(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listAllListings(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

/**
 * `PATCH /admin/listings/:id/validate` — Valide une annonce.
 */
export async function validateListing(req: Request, res: Response): Promise<Response> {
  const listing = await service.validateListing(req.params.id!, req.user!.id);
  return sendSuccess(res, { listing }, 'Annonce validée.');
}

/**
 * `PATCH /admin/listings/:id/reject` — Rejette une annonce.
 */
export async function rejectListing(req: Request, res: Response): Promise<Response> {
  const listing = await service.rejectListing(req.params.id!, req.user!.id, req.body.rejectionReason);
  return sendSuccess(res, { listing }, 'Annonce rejetée.');
}

/**
 * `DELETE /admin/listings/:id` — Supprime définitivement une annonce.
 */
export async function deleteListing(req: Request, res: Response): Promise<Response> {
  await service.deleteListing(req.params.id!);
  return sendNoContent(res);
}

// --- Payments ---------------------------------------------------------------

/**
 * `GET /admin/payments` — Liste les paiements (admin, filtrable).
 */
export async function listPayments(req: Request, res: Response): Promise<Response> {
  const { items, meta } = await service.listPayments(req.query as Record<string, unknown>);
  return sendPaginated(res, items, meta);
}

// --- Settings ---------------------------------------------------------------

/**
 * `GET /admin/settings` — Liste les paramètres système.
 */
export async function listSettings(_req: Request, res: Response): Promise<Response> {
  const settings = await service.listSettings();
  return sendSuccess(res, { settings });
}

/**
 * `PUT /admin/settings/:key` — Met à jour un paramètre système.
 */
export async function updateSetting(req: Request, res: Response): Promise<Response> {
  const setting = await service.updateSetting(req.params.key!, req.body.value, req.user!.id);
  return sendSuccess(res, { setting }, 'Paramètre mis à jour.');
}

// --- Dashboard --------------------------------------------------------------

/**
 * `GET /admin/dashboard/stats` — Statistiques agrégées du dashboard.
 */
export async function dashboardStats(_req: Request, res: Response): Promise<Response> {
  const stats = await service.getDashboardStats();
  return sendSuccess(res, stats);
}

/**
 * `GET /admin/dashboard/revenue` — Revenus groupés par période.
 */
export async function dashboardRevenue(req: Request, res: Response): Promise<Response> {
  const q = req.query as Record<string, string>;
  const rows = await service.getRevenue({
    period: (q.period as 'day' | 'week' | 'month' | 'year') ?? 'day',
    from: q.from,
    to: q.to,
  });
  return sendSuccess(res, { rows });
}

/**
 * `GET /admin/dashboard/users-growth` — Croissance des inscriptions.
 */
export async function dashboardUsersGrowth(req: Request, res: Response): Promise<Response> {
  const q = req.query as Record<string, string>;
  const rows = await service.getUsersGrowth({
    period: (q.period as 'day' | 'week' | 'month' | 'year') ?? 'day',
    from: q.from,
    to: q.to,
  });
  return sendSuccess(res, { rows });
}

/**
 * `GET /admin/dashboard/top-listings` — Top 10 annonces.
 */
export async function dashboardTopListings(_req: Request, res: Response): Promise<Response> {
  const items = await service.getTopListings();
  return sendSuccess(res, { items });
}

/**
 * `GET /admin/dashboard/top-categories` — Top 10 catégories.
 */
export async function dashboardTopCategories(_req: Request, res: Response): Promise<Response> {
  const items = await service.getTopCategories();
  return sendSuccess(res, { items });
}
