/**
 * @module utils/AppError
 * @description Erreur applicative structurée. Chaque erreur expose :
 *   - `statusCode` (HTTP)
 *   - `code` (machine-readable, ex: LISTING_NOT_FOUND)
 *   - `message` (humain)
 *   - `details` (facultatif)
 *
 * @author KOUTON Spynel
 */

/**
 * Classe d'erreur applicative utilisée dans tout le projet pour normaliser
 * les erreurs HTTP. Hérite de `Error` native et ajoute un `statusCode`, un
 * `code` machine-readable et un flag `isOperational` pour distinguer les
 * erreurs métier des crashs inattendus.
 *
 * @example
 * ```ts
 * throw AppError.notFound('USER_NOT_FOUND', 'Utilisateur introuvable.');
 * throw AppError.badRequest('INVALID_INPUT', 'Champ manquant.', { field: 'email' });
 * ```
 */
export class AppError extends Error {
  /** Code HTTP de la réponse (400, 401, 403, 404, 409, 422, 500…). */
  public readonly statusCode: number;
  /** Code machine-readable (ex : `LISTING_NOT_FOUND`), utilisé côté frontend pour le routing d'erreurs. */
  public readonly code: string;
  /** Détails supplémentaires facultatifs (champs invalides, contexte métier…). */
  public readonly details?: unknown;
  /** `true` si l'erreur est opérationnelle (prévue), `false` si c'est un bug. */
  public readonly isOperational: boolean;

  /**
   * Crée une nouvelle erreur applicative.
   *
   * @param statusCode - Code HTTP (ex : 400, 404, 500).
   * @param code       - Code machine-readable unique (ex : `USER_NOT_FOUND`).
   * @param message    - Message humain décrivant l'erreur.
   * @param details    - Données supplémentaires facultatives (objet, tableau de champs…).
   */
  constructor(
    statusCode: number,
    code: string,
    message: string,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Factory : erreur 400 Bad Request.
   * Utilisée quand le client envoie des données invalides ou manquantes.
   *
   * @param code    - Code machine-readable (ex : `MISSING_FIELD`).
   * @param message - Explication humaine de l'erreur.
   * @param details - Détails facultatifs (liste des champs invalides, etc.).
   * @returns Instance d'AppError avec statusCode 400.
   */
  static badRequest(
    code: string,
    message: string,
    details?: unknown,
  ): AppError {
    return new AppError(400, code, message, details);
  }

  /**
   * Factory : erreur 401 Unauthorized.
   * Utilisée quand le token JWT est absent, invalide ou expiré.
   *
   * @param code    - Code machine-readable (défaut : `UNAUTHORIZED`).
   * @param message - Message humain (défaut : `Authentification requise.`).
   * @returns Instance d'AppError avec statusCode 401.
   */
  static unauthorized(
    code = "UNAUTHORIZED",
    message = "Authentification requise.",
  ): AppError {
    return new AppError(401, code, message);
  }

  /**
   * Factory : erreur 403 Forbidden.
   * Utilisée quand l'utilisateur est authentifié mais n'a pas les droits
   * (rôle insuffisant, ressource d'un autre utilisateur…).
   *
   * @param code    - Code machine-readable (défaut : `FORBIDDEN`).
   * @param message - Message humain (défaut : `Accès refusé.`).
   * @returns Instance d'AppError avec statusCode 403.
   */
  static forbidden(code = "FORBIDDEN", message = "Accès refusé."): AppError {
    return new AppError(403, code, message);
  }

  /**
   * Factory : erreur 404 Not Found.
   * Utilisée quand la ressource demandée n'existe pas en base.
   *
   * @param code    - Code machine-readable (ex : `LISTING_NOT_FOUND`).
   * @param message - Message humain décrivant la ressource manquante.
   * @returns Instance d'AppError avec statusCode 404.
   */
  static notFound(code: string, message: string): AppError {
    return new AppError(404, code, message);
  }

  /**
   * Factory : erreur 409 Conflict.
   * Utilisée en cas de conflit d'unicité : email déjà pris, accès contact
   * déjà actif, duplicata, etc.
   *
   * @param code    - Code machine-readable (ex : `USER_ALREADY_EXISTS`).
   * @param message - Message humain décrivant le conflit.
   * @returns Instance d'AppError avec statusCode 409.
   */
  static conflict(code: string, message: string): AppError {
    return new AppError(409, code, message);
  }

  /**
   * Factory : erreur 422 Unprocessable Entity.
   * Utilisée quand la validation Zod échoue ou que les données sont
   * sémantiquement invalides.
   *
   * @param code    - Code machine-readable (ex : `VALIDATION_ERROR`).
   * @param message - Message humain résumant l'erreur.
   * @param details - Tableau des champs invalides `{ path, message }[]`.
   * @returns Instance d'AppError avec statusCode 422.
   */
  static unprocessable(
    code: string,
    message: string,
    details?: unknown,
  ): AppError {
    return new AppError(422, code, message, details);
  }

  /**
   * Factory : erreur 500 Internal Server Error.
   * Utilisée pour les erreurs côté serveur (configuration manquante,
   * driver de stockage non configuré…).
   *
   * @param code    - Code machine-readable (défaut : `INTERNAL_ERROR`).
   * @param message - Message humain (défaut : `Erreur serveur interne.`).
   * @returns Instance d'AppError avec statusCode 500.
   */
  static internal(
    code = "INTERNAL_ERROR",
    message = "Erreur serveur interne.",
  ): AppError {
    return new AppError(500, code, message);
  }
}
