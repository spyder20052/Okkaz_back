/**
 * @module authService
 * @description Logique métier de l'authentification :
 *   inscription, connexion, refresh token, hashage des mots de passe.
 *
 * @dependencies prisma, bcryptjs, jsonwebtoken, env
 * @author Spynel KOUTON
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, env } from '../config';
import { AppError } from '../utils/AppError';
import { logger } from '../utils/logger';
import type { JwtPayload, UserRole } from '../types';

const SALT_ROUNDS = 12;

/**
 * Génère une paire access + refresh token.
 */
function generateTokens(userId: string, role: UserRole) {
  const payload: JwtPayload = { userId, role };

  const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRATION,
  });

  const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRATION,
  });

  return { accessToken, refreshToken };
}

/**
 * Inscrit un nouvel utilisateur.
 *
 * @param data - Données d'inscription validées
 * @returns Utilisateur créé + tokens
 * @throws {AppError} 409 si l'email existe déjà
 */
export async function register(data: {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError('EMAIL_ALREADY_EXISTS', 'Cet email est déjà utilisé.', 409);
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      passwordHash: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
    },
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });

  logger.auth(`Inscription réussie : ${user.email}`);

  const tokens = generateTokens(user.id, user.role as UserRole);
  return { user, ...tokens };
}

/**
 * Connecte un utilisateur existant.
 *
 * @param email - Email de l'utilisateur
 * @param password - Mot de passe en clair
 * @returns Utilisateur + tokens
 * @throws {AppError} 401 si les identifiants sont invalides
 */
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.', 401);
  }

  logger.auth(`Connexion réussie : ${user.email}`);

  const tokens = generateTokens(user.id, user.role as UserRole);
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    ...tokens,
  };
}

/**
 * Rafraîchit les tokens à partir d'un refresh token valide.
 *
 * @param refreshToken - Refresh token existant
 * @returns Nouvelle paire de tokens
 * @throws {AppError} 401 si le refresh token est invalide
 */
export async function refresh(refreshToken: string) {
  try {
    const decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as JwtPayload;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, role: true },
    });

    if (!user) {
      throw new AppError('USER_NOT_FOUND', 'Utilisateur introuvable.', 401);
    }

    return generateTokens(user.id, user.role as UserRole);
  } catch {
    throw new AppError('REFRESH_TOKEN_INVALID', 'Refresh token invalide ou expiré.', 401);
  }
}
