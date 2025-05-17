import { Server as SocketServer, Socket } from 'socket.io';
import logger from '../../../utils/logger';
import { notificationService } from './notificationService';

/**
 * Configura los manejadores de eventos de WebSocket para notificaciones
 */
export const setupNotificationSocketHandlers = (io: SocketServer) => {
  // Establecer la instancia de Socket.IO en el servicio de notificaciones
  notificationService.setSocketServer(io);

  // Manejar conexiones de socket para notificaciones
  io.on('connection', (socket: Socket) => {
    logger.debug('Cliente conectado al sistema de notificaciones', {
      socketId: socket.id
    });

    // Escuchar evento para suscribirse a notificaciones de usuario
    socket.on('subscribe_user_notifications', (userId: string) => {
      // Unirse a un canal específico para el usuario
      socket.join(`user:${userId}`);
      logger.debug('Usuario suscrito a notificaciones', {
        socketId: socket.id,
        userId
      });
    });

    // Escuchar evento para marcar notificación como leída
    socket.on(
      'mark_notification_read',
      async (data: { notificationId: string; userId: string }) => {
        try {
          const { notificationId, userId } = data;
          await notificationService.markAsRead(notificationId);

          // Emitir evento de actualización al usuario
          io.to(`user:${userId}`).emit('notification_updated', {
            id: notificationId,
            read: true
          });

          logger.debug('Notificación marcada como leída', {
            notificationId,
            userId
          });
        } catch (error) {
          logger.error('Error al marcar notificación como leída', { error });
          socket.emit('notification_error', {
            message: 'Error al marcar notificación como leída'
          });
        }
      }
    );

    // Escuchar evento para obtener notificaciones no leídas
    socket.on('get_unread_notifications', async (userId: string) => {
      try {
        const notifications = await notificationService.getUnreadNotifications(
          userId
        );
        socket.emit('unread_notifications', notifications);

        logger.debug('Notificaciones no leídas enviadas', {
          userId,
          count: notifications.length
        });
      } catch (error) {
        logger.error('Error al obtener notificaciones no leídas', { error });
        socket.emit('notification_error', {
          message: 'Error al obtener notificaciones no leídas'
        });
      }
    });
  });
};
