/**
 * @module authController
 * @description Contrôleurs pour les endpoints d'authentification.
 *   Délègue la logique métier au service auth.
 *
 * @dependencies authService, apiResponse
 * @author Spynel KOUTON
 */

import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';

/**
 * POST /api/v1/auth/register
 * Inscrit un nouvel utilisateur.
 */
export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.register(req.body);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/login
 * Connecte un utilisateur.
 */
export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/refresh
 * Rafraîchit les tokens.
 */
export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refresh(refreshToken);
    sendSuccess(res, tokens);
  } catch (err) {
    next(err);
  }
}
