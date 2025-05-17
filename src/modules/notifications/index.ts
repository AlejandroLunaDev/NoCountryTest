import { Server as SocketServer } from 'socket.io';
import { setupNotificationSocketHandlers } from './services/notificationSocketHandler';
import { notificationService } from './services/notificationService';
import { notificationIntegrationService } from './services/notificationIntegrationService';

/**
 * Inicializa el módulo de notificaciones
 */
export const initializeNotificationModule = (io: SocketServer) => {
  // Configurar los manejadores de WebSocket para notificaciones
  setupNotificationSocketHandlers(io);

  // Configurar el servicio de integración
  notificationIntegrationService.setSocketServer(io);

  // Configurar listeners para eventos de otros módulos
  notificationIntegrationService.setupMessageListeners();

  return {
    notificationService,
    notificationIntegrationService
  };
};

// Reexportar los servicios y tipos para facilitar su uso desde otros módulos
export * from './types';
export { notificationService } from './services/notificationService';
export { notificationIntegrationService } from './services/notificationIntegrationService';
