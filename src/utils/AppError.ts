/**
 * @module utils/AppError
 * @description Erreur applicative structurée. Chaque erreur expose :
 *   - `statusCode` (HTTP)
 *   - `code` (machine-readable, ex: LISTING_NOT_FOUND)
 *   - `message` (humain)
 *   - `details` (facultatif)
 *
 *   Conforme au format de réponse d'erreur défini au §7.2 du cahier des
 *   charges et au §4 (erreurs structurées) d'AGENT.md.
 *
 * @author KOUTON Spynel
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

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

  static badRequest(
    code: string,
    message: string,
    details?: unknown,
  ): AppError {
    return new AppError(400, code, message, details);
  }

  static unauthorized(
    code = "UNAUTHORIZED",
    message = "Authentification requise.",
  ): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(code = "FORBIDDEN", message = "Accès refusé."): AppError {
    return new AppError(403, code, message);
  }

  static notFound(code: string, message: string): AppError {
    return new AppError(404, code, message);
  }

  static conflict(code: string, message: string): AppError {
    return new AppError(409, code, message);
  }

  static unprocessable(
    code: string,
    message: string,
    details?: unknown,
  ): AppError {
    return new AppError(422, code, message, details);
  }

  static internal(
    code = "INTERNAL_ERROR",
    message = "Erreur serveur interne.",
  ): AppError {
    return new AppError(500, code, message);
  }
}
