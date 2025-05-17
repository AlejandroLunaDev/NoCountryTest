import { Server as SocketServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../../../config/prisma';
import logger from '../../../utils/logger';
import { CreateNotificationDTO, NotificationType } from '../types';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

/**
 * Clase que maneja el servicio de notificaciones
 */
class NotificationService {
  private io: SocketServer | null = null;
  private dbConnected: boolean = true; // Asumimos conexión hasta que se demuestre lo contrario

  /**
   * Establece la instancia de Socket.IO para enviar notificaciones
   */
  setSocketServer(io: SocketServer) {
    this.io = io;
    logger.info('Socket server configurado para el servicio de notificaciones');
  }

  /**
   * Comprobar si podemos conectar con la base de datos
   * @returns {boolean} true si podemos conectar, false si hay problemas
   */
  private async checkDatabaseConnection(): Promise<boolean> {
    if (!this.dbConnected) {
      // Si ya sabemos que no hay conexión, intentamos reconectar cada 30 segundos
      const now = Date.now();
      if (
        !this._lastConnectionAttempt ||
        now - this._lastConnectionAttempt > 30000
      ) {
        this._lastConnectionAttempt = now;
        try {
          // Intento simple de conexión
          await prisma.$queryRaw`SELECT 1`;
          this.dbConnected = true;
          logger.info('Conexión a la base de datos restablecida');
        } catch (error) {
          this.dbConnected = false;
        }
      }
    }
    return this.dbConnected;
  }
  private _lastConnectionAttempt: number | null = null;

  /**
   * Gestionar errores de base de datos
   */
  private handleDatabaseError(error: any): void {
    // Si es un error de conectividad (P1001), marcamos la base de datos como desconectada
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P1001'
    ) {
      this.dbConnected = false;
      logger.warn(
        'Se ha perdido la conexión con la base de datos. Las notificaciones persistentes están desactivadas temporalmente.'
      );
    }
  }

  /**
   * Crea y envía una notificación
   */
  async createNotification(notificationData: CreateNotificationDTO) {
    // Verificar si tenemos conexión a DB antes de intentar la operación
    const dbAvailable = await this.checkDatabaseConnection();

    // Preparar objeto de notificación (para poder enviarlo por WS incluso sin DB)
    const notificationObj = {
      id: uuidv4(),
      type: notificationData.type,
      recipientId: notificationData.recipientId,
      senderId: notificationData.senderId,
      chatId: notificationData.chatId,
      messageId: notificationData.messageId,
      content: notificationData.content,
      read: false,
      createdAt: new Date()
    };

    try {
      // Solo intentar guardar en DB si tenemos conexión
      if (dbAvailable) {
        // Crear la notificación en la base de datos
        const notification = await prisma.notification.create({
          data: {
            id: notificationObj.id,
            type: notificationData.type,
            recipientId: notificationData.recipientId,
            senderId: notificationData.senderId,
            chatId: notificationData.chatId,
            messageId: notificationData.messageId,
            content: notificationData.content,
            read: false
          }
        });

        // Emitir la notificación al usuario destinatario a través de WebSockets
        this.emitNotification(notification);

        logger.info('Notificación creada y enviada', {
          notificationId: notification.id,
          recipientId: notification.recipientId,
          type: notification.type
        });

        return notification;
      } else {
        // Si no hay conexión, solo enviamos por WebSocket (sin persistencia)
        this.emitNotification(notificationObj);

        logger.info(
          'Notificación enviada solo por WebSocket (sin persistencia)',
          {
            recipientId: notificationObj.recipientId,
            type: notificationObj.type
          }
        );

        return notificationObj;
      }
    } catch (error) {
      this.handleDatabaseError(error);
      logger.error('Error al crear notificación', { error });

      // Siempre intentamos enviar la notificación por WebSocket, incluso si falla la DB
      this.emitNotification(notificationObj);

      return notificationObj; // Devolvemos el objeto aunque no se haya guardado en DB
    }
  }

  /**
   * Emite una notificación a través de WebSockets
   */
  private emitNotification(notification: any) {
    if (!this.io) {
      logger.warn('Socket server no configurado para enviar notificaciones');
      return;
    }

    // Emitir al canal individual del usuario destinatario
    this.io
      .to(`user:${notification.recipientId}`)
      .emit('notification', notification);
  }

  /**
   * Notifica sobre un nuevo mensaje en un chat
   */
  async notifyNewMessage(messageData: {
    id: string;
    content: string;
    senderId: string;
    chatId: string;
    sender: { name: string };
  }) {
    try {
      // Verificar si tenemos conexión a la DB
      const dbAvailable = await this.checkDatabaseConnection();

      if (dbAvailable) {
        // Obtener los participantes del chat que no son el remitente
        const chatParticipants = await prisma.chatParticipant.findMany({
          where: {
            chatId: messageData.chatId,
            userId: {
              not: messageData.senderId // Excluir al remitente
            }
          },
          select: {
            userId: true
          }
        });

        // Crear notificaciones para todos los participantes
        const notificationPromises = chatParticipants.map(participant => {
          const notificationData: CreateNotificationDTO = {
            type: NotificationType.NEW_MESSAGE,
            recipientId: participant.userId,
            senderId: messageData.senderId,
            chatId: messageData.chatId,
            messageId: messageData.id,
            content: `Nuevo mensaje de ${
              messageData.sender.name
            }: ${messageData.content.substring(0, 50)}${
              messageData.content.length > 50 ? '...' : ''
            }`
          };

          return this.createNotification(notificationData);
        });

        await Promise.all(notificationPromises);
      } else {
        // Modo de emergencia: si no hay DB, emitir directamente al chat
        if (this.io) {
          // Emitir un evento de "nuevo mensaje" a todos los miembros del chat
          this.io.to(messageData.chatId).emit('new_message_notification', {
            senderId: messageData.senderId,
            senderName: messageData.sender.name,
            content: messageData.content,
            chatId: messageData.chatId,
            messageId: messageData.id,
            timestamp: new Date()
          });
        }
      }
    } catch (error) {
      this.handleDatabaseError(error);
      logger.error('Error al notificar nuevo mensaje', { error });

      // Intentar modo de emergencia en caso de error
      if (this.io) {
        this.io.to(messageData.chatId).emit('new_message_notification', {
          senderId: messageData.senderId,
          senderName: messageData.sender.name,
          content: messageData.content,
          chatId: messageData.chatId,
          messageId: messageData.id,
          timestamp: new Date()
        });
      }
    }
  }

  /**
   * Marca una notificación como leída
   */
  async markAsRead(notificationId: string) {
    try {
      // Verificar si tenemos conexión a la DB
      const dbAvailable = await this.checkDatabaseConnection();

      if (dbAvailable) {
        const result = await prisma.notification.update({
          where: { id: notificationId },
          data: { read: true }
        });
        return result;
      }
      return { id: notificationId, read: true }; // Respuesta simulada si no hay DB
    } catch (error) {
      this.handleDatabaseError(error);
      logger.error('Error al marcar notificación como leída', { error });
      return { id: notificationId, read: true }; // Respuesta simulada
    }
  }

  /**
   * Obtiene las notificaciones no leídas de un usuario
   */
  async getUnreadNotifications(userId: string) {
    try {
      // Verificar si tenemos conexión a la DB
      const dbAvailable = await this.checkDatabaseConnection();

      if (dbAvailable) {
        return await prisma.notification.findMany({
          where: {
            recipientId: userId,
            read: false
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
      }
      // Si no hay conexión, retornar array vacío
      logger.debug(
        'Base de datos no disponible, retornando array vacío para notificaciones no leídas',
        { userId }
      );
      return [];
    } catch (error) {
      this.handleDatabaseError(error);
      logger.error('Error al obtener notificaciones no leídas', { error });
      return []; // Devolver un array vacío en caso de error
    }
  }
}

// Exportar una única instancia del servicio (patrón Singleton)
export const notificationService = new NotificationService();
