import morgan from 'morgan';
import { Request, Response } from 'express';
import { config } from '../config/env';
import logger from '../utils/logger';

// Opciones según el entorno
const options = {
  // En desarrollo, formato colorido con detalles
  development: {
    format: ':method :url :status :response-time ms - :res[content-length]',
    options: { stream: logger.stream }
  },
  // En producción, formato mínimo orientado a rendimiento
  production: {
    format: ':remote-addr :method :url :status :response-time ms',
    options: {
      stream: logger.stream,
      skip: (req: Request, res: Response) => res.statusCode < 400 // Solo log errores en producción
    }
  }
};

// Elegir la configuración según el entorno
const morganMiddleware = morgan(
  options[config.nodeEnv === 'development' ? 'development' : 'production']
    .format,
  options[config.nodeEnv === 'development' ? 'development' : 'production']
    .options
);

export default morganMiddleware;
