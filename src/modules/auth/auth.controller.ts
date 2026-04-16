/**
 * @module modules/auth/auth.controller
 * @description Contrôleurs HTTP pour le module Auth (§4.1).
 */

import type { Request, Response } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated } from '../../utils/apiResponse';
import { AppError } from '../../utils/AppError';

export async function register(req: Request, res: Response): Promise<Response> {
  const result = await authService.register(req.body);
  return sendCreated(res, result, 'Inscription réussie. Vérifiez votre email.');
}

export async function login(req: Request, res: Response): Promise<Response> {
  const result = await authService.login(req.body);
  return sendSuccess(res, result, 'Connexion réussie.');
}

export async function refresh(req: Request, res: Response): Promise<Response> {
  const tokens = await authService.refresh(req.body.refreshToken);
  return sendSuccess(res, tokens, 'Jetons renouvelés.');
}

export async function logout(req: Request, res: Response): Promise<Response> {
  const token = req.body?.refreshToken;
  if (!token) throw AppError.badRequest('MISSING_REFRESH_TOKEN', 'Refresh token requis.');
  await authService.logout(token);
  return sendSuccess(res, null, 'Déconnexion effectuée.');
}

export async function verifyEmail(req: Request, res: Response): Promise<Response> {
  await authService.verifyEmail(req.params.token!);
  return sendSuccess(res, null, 'Email vérifié avec succès.');
}

export async function forgotPassword(req: Request, res: Response): Promise<Response> {
  await authService.forgotPassword(req.body.email);
  return sendSuccess(res, null, 'Si un compte existe pour cet email, un message a été envoyé.');
}

export async function resetPassword(req: Request, res: Response): Promise<Response> {
  await authService.resetPassword(req.params.token!, req.body.newPassword);
  return sendSuccess(res, null, 'Mot de passe réinitialisé.');
}
