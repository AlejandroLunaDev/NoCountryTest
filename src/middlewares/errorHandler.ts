import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/errors';
import logger from '../utils/logger';

// Middleware para capturar errores asíncronos
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};

// Handler para errores operacionales
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Error personalizado de la aplicación
  if (err instanceof AppError) {
    // Log diferente según tipo de error
    if (err.statusCode >= 500) {
      logger.error(`[${err.statusCode}] ${err.message}`, {
        path: req.path,
        method: req.method,
        stack: err.stack
      });
    } else {
      logger.warn(`[${err.statusCode}] ${err.message}`, {
        path: req.path,
        method: req.method
      });
    }

    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: err.name,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  }

  // Error no controlado - siempre se loguea como error
  logger.error(`[500] ${err.message || 'Error interno del servidor'}`, {
    path: req.path,
    method: req.method,
    stack: err.stack
  });

  // Error de Prisma o errores no controlados
  return res.status(500).json({
    success: false,
    message: 'Algo salió mal',
    error: err.name,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};
