import winston from 'winston';
import path from 'path';
import { config } from '../config/env';

// Configurar formatos
const formats = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.colorize(),
  winston.format.printf(info => {
    const metadata = info.metadata as Record<string, unknown>;
    return `${info.timestamp} ${info.level}: ${info.message} ${
      Object.keys(metadata).length ? JSON.stringify(metadata) : ''
    }`;
  })
);

// Crear transports
const transports: winston.transport[] = [
  // Consola - todos los logs en development, solo warn y error en production
  new winston.transports.Console({
    level: config.nodeEnv === 'development' ? 'debug' : 'warn'
  })
];

// En producción, añadir archivos de logs
if (config.nodeEnv === 'production') {
  transports.push(
    // Errores en un archivo separado
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Todos los logs
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

// Crear logger
const logger = winston.createLogger({
  level: config.nodeEnv === 'development' ? 'debug' : 'info',
  format: formats,
  defaultMeta: { service: 'no-country-api' },
  transports
});

// Exportar funciones de log
export default {
  debug: (message: string, meta = {}) => logger.debug(message, meta),
  info: (message: string, meta = {}) => logger.info(message, meta),
  warn: (message: string, meta = {}) => logger.warn(message, meta),
  error: (message: string, meta = {}) => logger.error(message, meta),
  // Para usar con Express
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    }
  }
};
