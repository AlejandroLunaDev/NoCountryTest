import { Server as SocketServer } from 'socket.io';
import logger from '../../../utils/logger';
import prisma from '../../../config/prisma';
import { NotificationType } from '../types';
import { notificationService } from './notificationService';

/**
 * Clase que proporciona métodos para integrar el sistema de notificaciones
 * con otros módulos del sistema (mensajes, chats, usuarios, etc.)
 */
class NotificationIntegrationService {
  private io: SocketServer | null = null;

  /**
   * Establece la instancia de Socket.IO
   */
  setSocketServer(io: SocketServer) {
    this.io = io;
    logger.info(
      'Socket server configurado para el servicio de integración de notificaciones'
    );
  }

  /**
   * Registrar listeners para eventos del sistema de mensajes
   * Esta función debe ser llamada después de configurar los manejadores de mensajes
   */
  setupMessageListeners() {
    if (!this.io) {
      logger.warn(
        'Socket server no configurado para registrar listeners de mensajes'
      );
      return;
    }

    // Escuchar el evento 'message_received' emitido por el manejador de mensajes
    this.io.on('message_received', (message: any) => {
      // Generar notificación para el nuevo mensaje
      notificationService.notifyNewMessage(message);
    });

    logger.info('Listeners para eventos de mensajes configurados');
  }

  /**
   * Notificar que un usuario se ha unido a un chat
   */
  async notifyUserJoinedChat(
    chatId: string,
    joinedUserId: string,
    joinedUserName: string
  ) {
    try {
      // Obtener otros participantes del chat
      const chatParticipants = await prisma.chatMember.findMany({
        where: {
          chatId,
          userId: {
            not: joinedUserId // Excluir al usuario que se unió
          }
        },
        select: {
          userId: true
        }
      });

      // Crear notificaciones para todos los participantes
      const notificationPromises = chatParticipants.map(participant => {
        return notificationService.createNotification({
          type: NotificationType.USER_JOINED_CHAT,
          recipientId: participant.userId,
          senderId: joinedUserId,
          chatId,
          content: `${joinedUserName} se ha unido al chat`
        });
      });

      await Promise.all(notificationPromises);
    } catch (error) {
      logger.error('Error al notificar usuario unido al chat', { error });
    }
  }

  /**
   * Notificar que se ha creado un nuevo chat
   */
  async notifyChatCreated(
    chatId: string,
    chatName: string,
    creatorId: string,
    participantIds: string[]
  ) {
    try {
      // Crear notificaciones para todos los participantes excepto el creador
      const notificationPromises = participantIds
        .filter(userId => userId !== creatorId)
        .map(userId => {
          return notificationService.createNotification({
            type: NotificationType.CHAT_CREATED,
            recipientId: userId,
            senderId: creatorId,
            chatId,
            content: `Has sido añadido al chat "${chatName}"`
          });
        });

      await Promise.all(notificationPromises);
    } catch (error) {
      logger.error('Error al notificar chat creado', { error });
    }
  }
}

// Exportar una única instancia del servicio (patrón Singleton)
export const notificationIntegrationService =
  new NotificationIntegrationService();
