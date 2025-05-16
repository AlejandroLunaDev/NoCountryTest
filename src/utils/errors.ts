export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Indica que es un error esperado/controlado

    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFoundError = (resource: string) =>
  new AppError(`${resource} no encontrado`, 404);

export const badRequestError = (message: string) => new AppError(message, 400);

export const unauthorizedError = () => new AppError('No autorizado', 401);

export const forbiddenError = () => new AppError('Acceso prohibido', 403);

export const serverError = () =>
  new AppError('Error interno del servidor', 500);
