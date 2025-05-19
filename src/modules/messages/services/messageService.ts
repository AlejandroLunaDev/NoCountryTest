import prisma from '../../../config/prisma';
import { CreateMessageDTO, QueryMessagesDTO } from '../types';
import { chatPresenceService } from '../../chats/services/chatPresenceService';
import { Server as SocketServer } from 'socket.io';
import logger from '../../../utils/logger';

// Variable para almacenar la instancia de Socket.IO
let io: SocketServer | null = null;

// Función para configurar la instancia de Socket.IO
export const setupMessageServiceSocketIO = (socketIO: SocketServer) => {
  io = socketIO;
};

export const messageService = {
  async createMessage(data: CreateMessageDTO) {
    const { content, senderId, chatId, replyToId } = data;

    // Crear el mensaje
    const message = await prisma.message.create({
      data: {
        content,
        senderId,
        chatId,
        replyToId
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        },
        replyTo: true
      }
    });

    // Buscar miembros del chat que lo tienen eliminado (excepto el remitente)
    const usersWithDeletedChat = await prisma.chatUserState.findMany({
      where: {
        chatId,
        isDeleted: true,
        userId: { not: senderId } // No incluir al remitente
      },
      include: {
        user: {
          select: {
            name: true
          }
        }
      }
    });

    // Restaurar el chat para estos usuarios
    for (const userState of usersWithDeletedChat) {
      try {
        // Restaurar el chat para este usuario
        await chatPresenceService.restoreChat(userState.userId, chatId);

        // Notificar al usuario que el chat ha sido restaurado
        if (io) {
          io.to(`user:${userState.userId}`).emit('chat_restored', {
            chatId,
            restoredBecause: 'new_message',
            messageFrom: {
              id: senderId,
              name: message.sender.name
            },
            messagePreview:
              content.substring(0, 50) + (content.length > 50 ? '...' : '')
          });
        }

        logger.info(
          `Chat ${chatId} restaurado para usuario ${userState.userId} debido a nuevo mensaje`
        );
      } catch (error) {
        logger.error(
          `Error al restaurar chat ${chatId} para usuario ${userState.userId}`,
          { error }
        );
      }
    }

    return message;
  },

  async getMessages(query: QueryMessagesDTO) {
    const { chatId, userId, limit = 50, offset = 0 } = query;

    const whereClause: any = {};

    if (chatId) {
      whereClause.chatId = chatId;
    }

    if (userId) {
      whereClause.senderId = userId;
    }

    return prisma.message.findMany({
      where: whereClause,
      skip: offset,
      take: limit,
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        },
        replyTo: {
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  },

  async getMessageById(id: string) {
    return prisma.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            name: true
          }
        },
        replyTo: true,
        replies: {
          include: {
            sender: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });
  }
};
