import { Server as SocketServer } from 'socket.io';
import prisma from '../../../config/prisma';
import logger from '../../../utils/logger';

// Variable para almacenar la instancia de Socket.IO
let io: SocketServer | null = null;

// Tiempo después del cual se considera que un usuario ya no está escribiendo (ms)
const TYPING_TIMEOUT = 5000; // 5 segundos

// Función para configurar la instancia de Socket.IO
export const setupChatPresenceSocketIO = (socketIO: SocketServer) => {
  io = socketIO;

  // Configurar intervalo para limpiar estados de typing expirados
  setInterval(clearExpiredTypingStates, 10000); // cada 10 segundos
};

/**
 * Limpia estados de "escribiendo" que hayan expirado
 */
async function clearExpiredTypingStates() {
  try {
    const now = new Date();
    const typingTimeout = new Date(now.getTime() - TYPING_TIMEOUT);

    // Buscar usuarios que estén marcados como escribiendo pero cuyo lastTypingAt sea anterior al timeout
    const expiredTypingStates = await prisma.chatUserState.findMany({
      where: {
        isTyping: true,
        lastTypingAt: {
          lt: typingTimeout
        }
      },
      select: {
        id: true,
        userId: true,
        chatId: true
      }
    });

    // Actualizar estados y notificar
    for (const state of expiredTypingStates) {
      await prisma.chatUserState.update({
        where: { id: state.id },
        data: { isTyping: false }
      });

      // Notificar a los miembros del chat que el usuario dejó de escribir
      if (io) {
        io.to(state.chatId).emit('user_typing_stopped', {
          userId: state.userId,
          chatId: state.chatId
        });
      }
    }
  } catch (error) {
    logger.error('Error al limpiar estados de typing expirados', { error });
  }
}

/**
 * Servicio para gestionar estados de presencia y actividad en chats
 */
export const chatPresenceService = {
  /**
   * Actualiza el estado de presencia de un usuario en un chat
   */
  async updatePresence(userId: string, chatId: string, isOnline: boolean) {
    try {
      // Verificar si el usuario es miembro del chat
      const membership = await prisma.chatMember.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      });

      if (!membership) {
        throw new Error('El usuario no es miembro de este chat');
      }

      // Buscar o crear el estado del usuario en el chat
      let chatUserState = await prisma.chatUserState.upsert({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        },
        update: {
          isOnline,
          lastSeen: new Date()
        },
        create: {
          userId,
          chatId,
          isOnline,
          lastSeen: new Date()
        }
      });

      // Notificar a los otros miembros del chat
      if (io) {
        io.to(chatId).emit('user_presence_changed', {
          userId,
          chatId,
          isOnline,
          lastSeen: chatUserState.lastSeen
        });
      }

      return chatUserState;
    } catch (error) {
      logger.error('Error al actualizar estado de presencia', {
        error,
        userId,
        chatId
      });
      throw error;
    }
  },

  /**
   * Actualiza el estado de escritura de un usuario en un chat
   */
  async updateTypingStatus(userId: string, chatId: string, isTyping: boolean) {
    try {
      // Verificar si el usuario es miembro del chat
      const membership = await prisma.chatMember.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      });

      if (!membership) {
        throw new Error('El usuario no es miembro de este chat');
      }

      // Obtener el nombre del usuario para la notificación
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true }
      });

      // Actualizar estado de escritura
      const now = new Date();
      const chatUserState = await prisma.chatUserState.upsert({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        },
        update: {
          isTyping,
          lastTypingAt: isTyping ? now : undefined,
          isOnline: true, // Si está escribiendo, está online
          lastSeen: now
        },
        create: {
          userId,
          chatId,
          isTyping,
          lastTypingAt: isTyping ? now : undefined,
          isOnline: true,
          lastSeen: now
        }
      });

      // Notificar a los otros miembros del chat
      if (io) {
        const eventName = isTyping ? 'user_typing' : 'user_typing_stopped';
        io.to(chatId).emit(eventName, {
          userId,
          chatId,
          userName: user?.name || 'Usuario'
        });
      }

      return chatUserState;
    } catch (error) {
      logger.error('Error al actualizar estado de escritura', {
        error,
        userId,
        chatId
      });
      throw error;
    }
  },

  /**
   * Marca un mensaje como leído por un usuario
   */
  async markMessageAsRead(userId: string, messageId: string) {
    try {
      // Obtener información del mensaje
      const message = await prisma.message.findUnique({
        where: { id: messageId },
        select: {
          id: true,
          chatId: true,
          senderId: true
        }
      });

      if (!message) {
        throw new Error('Mensaje no encontrado');
      }

      // Verificar si el usuario es miembro del chat
      const membership = await prisma.chatMember.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId: message.chatId
          }
        }
      });

      if (!membership) {
        throw new Error('El usuario no es miembro de este chat');
      }

      // Actualizar el último mensaje leído y resetear contador de no leídos
      const chatUserState = await prisma.chatUserState.upsert({
        where: {
          userId_chatId: {
            userId,
            chatId: message.chatId
          }
        },
        update: {
          lastReadMessageId: messageId,
          unreadCount: 0,
          isOnline: true,
          lastSeen: new Date()
        },
        create: {
          userId,
          chatId: message.chatId,
          lastReadMessageId: messageId,
          unreadCount: 0,
          isOnline: true,
          lastSeen: new Date()
        }
      });

      // Notificar al remitente que su mensaje fue leído
      if (io && message.senderId !== userId) {
        io.to(`user:${message.senderId}`).emit('message_read', {
          messageId,
          chatId: message.chatId,
          readBy: userId,
          readAt: chatUserState.lastSeen
        });
      }

      return chatUserState;
    } catch (error) {
      logger.error('Error al marcar mensaje como leído', {
        error,
        userId,
        messageId
      });
      throw error;
    }
  },

  /**
   * Incrementa el contador de mensajes no leídos para todos los usuarios del chat excepto el remitente
   */
  async incrementUnreadCounter(messageData: {
    id: string;
    chatId: string;
    senderId: string;
  }) {
    try {
      // Obtener todos los miembros del chat excepto el remitente
      const chatMembers = await prisma.chatMember.findMany({
        where: {
          chatId: messageData.chatId,
          userId: {
            not: messageData.senderId
          }
        },
        select: {
          userId: true
        }
      });

      if (chatMembers.length === 0) {
        return true; // No hay otros miembros para notificar
      }

      // Ejecutar actualizaciones en paralelo para mejorar rendimiento
      const updatePromises = chatMembers.map(member =>
        prisma.chatUserState.upsert({
          where: {
            userId_chatId: {
              userId: member.userId,
              chatId: messageData.chatId
            }
          },
          update: {
            unreadCount: {
              increment: 1
            }
          },
          create: {
            userId: member.userId,
            chatId: messageData.chatId,
            unreadCount: 1
          }
        })
      );

      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      logger.error('Error al incrementar contador de no leídos', {
        error,
        messageId: messageData.id
      });
      return false;
    }
  },

  /**
   * Cambia el estado de silenciamiento de notificaciones para un chat
   */
  async toggleMuteStatus(userId: string, chatId: string, isMuted: boolean) {
    try {
      const chatUserState = await prisma.chatUserState.upsert({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        },
        update: {
          isMuted
        },
        create: {
          userId,
          chatId,
          isMuted
        }
      });

      return chatUserState;
    } catch (error) {
      logger.error('Error al cambiar estado de silenciamiento', {
        error,
        userId,
        chatId
      });
      throw error;
    }
  },

  /**
   * Obtiene los estados de presencia de todos los usuarios en un chat
   */
  async getChatPresenceStates(chatId: string) {
    try {
      return await prisma.chatUserState.findMany({
        where: {
          chatId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    } catch (error) {
      logger.error('Error al obtener estados de presencia', { error, chatId });
      throw error;
    }
  },

  /**
   * Obtener el contador de mensajes no leídos por chat para un usuario
   */
  async getUnreadCountsByUser(userId: string) {
    try {
      return await prisma.chatUserState.findMany({
        where: {
          userId,
          isDeleted: false,
          unreadCount: {
            gt: 0
          }
        },
        select: {
          chatId: true,
          unreadCount: true
        }
      });
    } catch (error) {
      logger.error('Error al obtener contadores de no leídos', {
        error,
        userId
      });
      throw error;
    }
  },

  /**
   * Marca todos los mensajes de un chat como leídos por un usuario
   */
  async markAllMessagesAsRead(userId: string, chatId: string) {
    try {
      // Verificar si el usuario es miembro del chat
      const membership = await prisma.chatMember.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      });

      if (!membership) {
        throw new Error('El usuario no es miembro de este chat');
      }

      // Obtener el último mensaje del chat para marcarlo como leído
      const lastMessage = await prisma.message.findFirst({
        where: { chatId },
        orderBy: { createdAt: 'desc' },
        select: { id: true, senderId: true }
      });

      if (!lastMessage) {
        // No hay mensajes en el chat
        return null;
      }

      // Actualizar el estado del chat
      const chatUserState = await prisma.chatUserState.upsert({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        },
        update: {
          lastReadMessageId: lastMessage.id,
          unreadCount: 0,
          isOnline: true,
          lastSeen: new Date()
        },
        create: {
          userId,
          chatId,
          lastReadMessageId: lastMessage.id,
          unreadCount: 0,
          isOnline: true,
          lastSeen: new Date()
        }
      });

      // Notificar al remitente del último mensaje que su mensaje fue leído
      if (io && lastMessage.senderId !== userId) {
        io.to(`user:${lastMessage.senderId}`).emit('messages_all_read', {
          chatId,
          readBy: userId,
          readAt: chatUserState.lastSeen
        });
      }

      return chatUserState;
    } catch (error) {
      logger.error('Error al marcar todos los mensajes como leídos', {
        error,
        userId,
        chatId
      });
      throw error;
    }
  },

  /**
   * Verifica si un usuario puede enviar mensajes a un chat
   * teniendo en cuenta el estado de borrado lógico
   */
  async canSendMessages(userId: string, chatId: string) {
    try {
      // Verificar si el usuario es miembro del chat
      const membership = await prisma.chatMember.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      });

      if (!membership) {
        return { canSend: false, reason: 'USER_NOT_MEMBER' };
      }

      // Verificar si el usuario ha borrado este chat
      const chatState = await prisma.chatUserState.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        },
        select: {
          isDeleted: true
        }
      });

      if (chatState?.isDeleted) {
        return { canSend: false, reason: 'CHAT_DELETED_BY_USER' };
      }

      return { canSend: true };
    } catch (error) {
      logger.error('Error al verificar permiso para enviar mensajes', {
        error,
        userId,
        chatId
      });
      return { canSend: false, reason: 'ERROR' };
    }
  },

  /**
   * Borra lógicamente un chat para un usuario específico
   */
  async softDeleteChat(userId: string, chatId: string) {
    try {
      // Verificar si el usuario es miembro del chat
      const membership = await prisma.chatMember.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      });

      if (!membership) {
        throw new Error('El usuario no es miembro de este chat');
      }

      // Marcar el chat como borrado para este usuario
      const chatUserState = await prisma.chatUserState.upsert({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        },
        update: {
          isDeleted: true,
          deletedAt: new Date()
        },
        create: {
          userId,
          chatId,
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      return chatUserState;
    } catch (error) {
      logger.error('Error al borrar lógicamente el chat', {
        error,
        userId,
        chatId
      });
      throw error;
    }
  },

  /**
   * Restaura un chat previamente borrado lógicamente para un usuario
   */
  async restoreChat(userId: string, chatId: string) {
    try {
      // Verificar si el usuario es miembro del chat
      const membership = await prisma.chatMember.findUnique({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        }
      });

      if (!membership) {
        throw new Error('El usuario no es miembro de este chat');
      }

      // Restaurar el chat para este usuario
      const chatUserState = await prisma.chatUserState.upsert({
        where: {
          userId_chatId: {
            userId,
            chatId
          }
        },
        update: {
          isDeleted: false,
          deletedAt: null
        },
        create: {
          userId,
          chatId,
          isDeleted: false
        }
      });

      return chatUserState;
    } catch (error) {
      logger.error('Error al restaurar el chat', {
        error,
        userId,
        chatId
      });
      throw error;
    }
  },

  /**
   * Elimina permanentemente un chat (solo para administradores)
   */
  async permanentlyDeleteChat(adminUserId: string, chatId: string) {
    try {
      // Verificar si el usuario es administrador
      const admin = await prisma.user.findUnique({
        where: { id: adminUserId },
        select: { role: true }
      });

      if (!admin || admin.role !== 'admin') {
        throw new Error(
          'Solo los administradores pueden eliminar chats permanentemente'
        );
      }

      // Eliminar el chat y todas sus relaciones (cascada)
      await prisma.$transaction([
        // Eliminar notificaciones relacionadas
        prisma.notification.deleteMany({
          where: { chatId }
        }),
        // Eliminar mensajes
        prisma.message.deleteMany({
          where: { chatId }
        }),
        // Eliminar estados de usuario
        prisma.chatUserState.deleteMany({
          where: { chatId }
        }),
        // Eliminar membresías
        prisma.chatMember.deleteMany({
          where: { chatId }
        }),
        // Finalmente eliminar el chat
        prisma.chat.delete({
          where: { id: chatId }
        })
      ]);

      return { success: true };
    } catch (error) {
      logger.error('Error al eliminar permanentemente el chat', {
        error,
        adminUserId,
        chatId
      });
      throw error;
    }
  }
};
