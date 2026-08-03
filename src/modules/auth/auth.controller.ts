/**
 * @module modules/auth/auth.controller
 * @description Contrôleurs HTTP pour le module Auth (§4.1).
 */

import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

/**
 * `POST /auth/register` — Inscription d'un nouvel utilisateur.
 *
 * @param req - Body validé par `registerSchema`.
 * @param res - 201 Created avec `{ user, tokens }`.
 */
export async function register(req: Request, res: Response): Promise<Response> {
  const result = await authService.register(req.body);
  return sendCreated(res, result, 'Inscription réussie. Vérifiez votre email.');
}

/**
 * `POST /auth/login` — Connexion par email/téléphone + mot de passe.
 *
 * @param req - Body validé par `loginSchema`.
 * @param res - 200 OK avec `{ user, tokens }`.
 */
export async function login(req: Request, res: Response): Promise<Response> {
  const result = await authService.login(req.body);
  return sendSuccess(res, result, 'Connexion réussie.');
}

/**
 * `POST /auth/oauth/google` — Connexion / inscription via Google.
 *
 * @param req - Body : `{ idToken }` (ID token Google Identity Services).
 * @param res - 200 OK avec `{ user, tokens }`.
 */
export async function googleAuth(req: Request, res: Response): Promise<Response> {
  const result = await authService.loginWithGoogle(req.body.idToken);
  return sendSuccess(res, result, 'Connexion Google réussie.');
}

/**
 * `POST /auth/refresh` — Renouvellement des tokens (rotation sécurisée).
 *
 * @param req - Body : `{ refreshToken }`.
 * @param res - 200 OK avec `{ accessToken, refreshToken }`.
 */
export async function refresh(req: Request, res: Response): Promise<Response> {
  const tokens = await authService.refresh(req.body.refreshToken);
  return sendSuccess(res, tokens, 'Jetons renouvelés.');
}

/**
 * `POST /auth/logout` — Déconnexion (révocation du refresh token).
 *
 * @param req - Body : `{ refreshToken }`.
 * @param res - 200 OK.
 * @throws {AppError} 400 si le refresh token est manquant.
 */
export async function logout(req: Request, res: Response): Promise<Response> {
  const token = req.body?.refreshToken;
  if (!token) throw AppError.badRequest('MISSING_REFRESH_TOKEN', 'Refresh token requis.');
  await authService.logout(token);
  return sendSuccess(res, null, 'Déconnexion effectuée.');
}

/**
 * `GET /auth/verify-email/:token` — Vérification de l'email via jeton.
 *
 * @param req - Param `:token`.
 * @param res - 200 OK.
 */
export async function verifyEmail(req: Request, res: Response): Promise<Response> {
  await authService.verifyEmail(req.params.token!);
  return sendSuccess(res, null, 'Email vérifié avec succès.');
}

/**
 * `POST /auth/forgot-password` — Demande de réinitialisation de mot de passe.
 *
 * @param req - Body : `{ email }`.
 * @param res - 200 OK (toujours, pour ne pas révéler l'existence du compte).
 */
export async function forgotPassword(req: Request, res: Response): Promise<Response> {
  await authService.forgotPassword(req.body.email);
  return sendSuccess(res, null, 'Si un compte existe pour cet email, un message a été envoyé.');
}

/**
 * `POST /auth/reset-password/:token` — Réinitialisation du mot de passe.
 *
 * @param req - Param `:token` + body `{ newPassword }`.
 * @param res - 200 OK.
 */
export async function resetPassword(req: Request, res: Response): Promise<Response> {
  await authService.resetPassword(req.params.token!, req.body.newPassword);
  return sendSuccess(res, null, 'Mot de passe réinitialisé.');
}
