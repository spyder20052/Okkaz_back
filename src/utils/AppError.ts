/**
 * @module AppError
 * @description Classe d'erreur applicative personnalisée.
 *   Permet de propager des erreurs avec un code métier et un status HTTP.
 *
 * @author Spynel KOUTON
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  /**
   * @param code - Code d'erreur applicatif (ex: VALIDATION_ERROR)
   * @param message - Message lisible
   * @param statusCode - Code HTTP associé
   */
  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
