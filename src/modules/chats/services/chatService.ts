import prisma from '../../../config/prisma';
import { CreateChatDTO, AddMemberDTO } from '../types';
import { notificationIntegrationService } from '../../notifications/services/notificationIntegrationService';
import { Server as SocketServer } from 'socket.io';
import { ChatType } from '@prisma/client';

// Variable para almacenar la instancia de Socket.IO
let io: SocketServer | null = null;

// Función para configurar la instancia de Socket.IO
export const setupChatServiceSocketIO = (socketIO: SocketServer) => {
  io = socketIO;
};

export const chatService = {
  async createChat(data: CreateChatDTO) {
    const { name, type, memberIds, creatorId } = data;

    // Validación: Si es un chat INDIVIDUAL, solo debe tener exactamente 2 miembros
    if (type === ChatType.INDIVIDUAL) {
      if (memberIds.length !== 2) {
        throw new Error(
          'Los chats individuales deben tener exactamente 2 miembros'
        );
      }

      // Verificar si ya existe un chat individual entre estos dos usuarios
      const existingChat = await this.findExistingIndividualChat(
        memberIds[0],
        memberIds[1]
      );

      if (existingChat) {
        throw new Error('Ya existe un chat individual entre estos usuarios');
      }
    }

    // Crear el chat
    const chat = await prisma.chat.create({
      data: {
        name,
        type,
        members: {
          create: memberIds.map(userId => ({
            userId
          }))
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    // Notificar a los usuarios añadidos al chat (excepto al creador)
    try {
      // Solo si tenemos la información del creador
      if (creatorId) {
        await notificationIntegrationService.notifyChatCreated(
          chat.id,
          chat.name || 'Nuevo chat',
          creatorId,
          memberIds
        );
      }

      // Notificar a través de WebSocket que se ha creado un chat
      if (io) {
        // Para cada miembro, emitir un evento a su canal personalizado
        memberIds.forEach(userId => {
          // No notificar al creador, solo a los demás usuarios
          if (userId !== creatorId && io !== null) {
            io.to(`user:${userId}`).emit('new_chat', {
              chatId: chat.id,
              chatName: chat.name,
              creatorId,
              type: chat.type
            });
          }
        });
      }
    } catch (error) {
      console.error('Error al notificar la creación del chat:', error);
      // No interrumpimos el flujo principal si falla la notificación
    }

    return chat;
  },

  /**
   * Busca si ya existe un chat individual entre dos usuarios específicos
   */
  async findExistingIndividualChat(userId1: string, userId2: string) {
    // Buscar chats donde ambos usuarios son miembros
    const chats = await prisma.chat.findMany({
      where: {
        type: ChatType.INDIVIDUAL,
        members: {
          every: {
            userId: {
              in: [userId1, userId2]
            }
          }
        }
      },
      include: {
        members: {
          select: {
            userId: true
          }
        },
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    // Filtrar para asegurarse de que el chat contiene exactamente estos dos usuarios
    return chats.find(chat => {
      const chatUserIds = chat.members.map(member => member.userId);
      return (
        chatUserIds.includes(userId1) &&
        chatUserIds.includes(userId2) &&
        chat._count.members === 2
      );
    });
  },

  async findChatById(id: string) {
    return prisma.chat.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        messages: {
          orderBy: {
            createdAt: 'asc'
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
        }
      }
    });
  },

  async getChatsByUserId(userId: string) {
    // Obtenemos chats donde el usuario es miembro y no los ha eliminado
    return prisma.chat.findMany({
      where: {
        members: {
          some: {
            userId
          }
        },
        // No mostrar chats marcados como eliminados para este usuario
        NOT: {
          userStates: {
            some: {
              userId,
              isDeleted: true
            }
          }
        }
      },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        messages: {
          take: 1,
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });
  },

  async addMemberToChat(data: AddMemberDTO) {
    const { chatId, userId } = data;

    return prisma.chatMember.create({
      data: {
        chatId,
        userId
      }
    });
  },

  async deleteChat(chatId: string, requestUserId: string) {
    try {
      // 1. Verificar que el usuario tenga permiso para eliminar el chat (es un miembro)
      const chatMembership = await prisma.chatMember.findFirst({
        where: {
          chatId,
          userId: requestUserId
        }
      });

      if (!chatMembership) {
        throw new Error('No tienes permiso para eliminar este chat');
      }

      // 2. Marcar el chat como eliminado solo para este usuario
      const chatUserState = await prisma.chatUserState.upsert({
        where: {
          userId_chatId: {
            userId: requestUserId,
            chatId
          }
        },
        update: {
          isDeleted: true,
          deletedAt: new Date()
        },
        create: {
          userId: requestUserId,
          chatId,
          isDeleted: true,
          deletedAt: new Date()
        }
      });

      // 3. Comprobar si todos los miembros han eliminado el chat
      // Obtener información de los miembros del chat
      const chatMembers = await prisma.chatMember.findMany({
        where: { chatId },
        select: { userId: true }
      });

      // Obtener los estados de chat para verificar cuáles están marcados como eliminados
      const chatUserStates = await prisma.chatUserState.findMany({
        where: {
          chatId,
          isDeleted: true
        },
        select: { userId: true }
      });

      if (chatMembers.length === 0) {
        throw new Error('Chat no encontrado o sin miembros');
      }

      // Si todos los miembros han eliminado el chat, eliminarlo permanentemente
      const allMemberIds = chatMembers.map(member => member.userId);
      const deletedByMemberIds = chatUserStates.map(state => state.userId);

      // Verificar si todos los miembros han eliminado el chat
      const allMembersDeleted = allMemberIds.every(memberId =>
        deletedByMemberIds.includes(memberId)
      );

      // Si todos los miembros han eliminado el chat, proceder con la eliminación física
      if (allMembersDeleted) {
        console.log(
          `Todos los miembros han eliminado el chat ${chatId}. Procediendo con eliminación permanente.`
        );

        // Usar el método hardDeleteChatInternal pero saltando las verificaciones de admin
        await this.hardDeleteChatInternal(chatId, requestUserId);

        return {
          success: true,
          message:
            'Chat eliminado permanentemente ya que todos los miembros lo han eliminado',
          deletedAt: chatUserState.deletedAt,
          permanentlyDeleted: true
        };
      }

      // 4. Notificar solo al usuario que solicitó la eliminación
      if (io) {
        io.to(`user:${requestUserId}`).emit('chat_deleted', {
          chatId,
          deletedBy: requestUserId,
          deletedAt: chatUserState.deletedAt
        });
      }

      return {
        success: true,
        message: 'Chat eliminado (solo para ti)',
        deletedAt: chatUserState.deletedAt,
        permanentlyDeleted: false
      };
    } catch (error) {
      console.error('Error al eliminar chat:', error);
      throw error;
    }
  },

  // Método interno para la eliminación física del chat (usado cuando todos los miembros han eliminado el chat)
  async hardDeleteChatInternal(chatId: string, requestUserId: string) {
    try {
      // 1. Obtener los miembros para notificar después
      const membersToNotify = await prisma.chatMember.findMany({
        where: { chatId },
        select: { userId: true }
      });

      // 2. Eliminar mensajes
      await prisma.message.deleteMany({
        where: { chatId }
      });

      // 3. Eliminar estados de chat
      await prisma.chatUserState.deleteMany({
        where: { chatId }
      });

      // 4. Eliminar miembros
      await prisma.chatMember.deleteMany({
        where: { chatId }
      });

      // 5. Eliminar notificaciones
      await prisma.notification.deleteMany({
        where: { chatId }
      });

      // 6. Eliminar el chat
      await prisma.chat.delete({
        where: { id: chatId }
      });

      // 7. Notificar a todos los miembros sobre el borrado permanente
      if (io) {
        membersToNotify.forEach(member => {
          io?.to(`user:${member.userId}`).emit('chat_hard_deleted', {
            chatId,
            deletedBy: requestUserId,
            permanent: true
          });
        });
      }

      return {
        success: true,
        message: 'Chat eliminado permanentemente'
      };
    } catch (error) {
      console.error('Error al eliminar permanentemente el chat:', error);
      throw error;
    }
  },

  // Método para eliminar completamente un chat (borrado físico - solo para administradores o casos especiales)
  async hardDeleteChat(
    chatId: string,
    requestUserId: string,
    isAdmin: boolean = false
  ) {
    try {
      // 1. Verificar permiso (debe ser admin o creador)
      if (!isAdmin) {
        // Implementar lógica para verificar si es creador del chat
        // Aquí podrías añadir un campo "createdBy" al modelo de Chat
        throw new Error(
          'Operación no permitida: se requieren privilegios de administrador'
        );
      }

      return await this.hardDeleteChatInternal(chatId, requestUserId);
    } catch (error) {
      console.error('Error al eliminar permanentemente el chat:', error);
      throw error;
    }
  }
};
