import { Server as SocketServer } from 'socket.io';
import prisma from '../../config/prisma';
import logger from '../../utils/logger';
import { notificationService } from '../notifications/services/notificationService';
import { chatPresenceService } from '../chats/services/chatPresenceService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { setupChatServiceSocketIO } from '../chats/services/chatService';
import { setupChatPresenceSocketIO } from '../chats/services/chatPresenceService';
import { setupMessageServiceSocketIO } from '../messages/services/messageService';

// Función auxiliar para reconectar Prisma si es necesario
const ensurePrismaConnection = async () => {
  try {
    // Consulta simple para probar la conexión
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    if (
      error instanceof PrismaClientKnownRequestError &&
      error.code === 'P1001'
    ) {
      logger.error(
        'Error de conexión a la base de datos. Intentando reconectar...',
        { error }
      );
      try {
        await prisma.$disconnect();
        // Un pequeño delay antes de intentar reconectar
        await new Promise(resolve => setTimeout(resolve, 1000));
        return false;
      } catch (_) {
        return false;
      }
    }
    return false;
  }
};

export const setupSocketHandlers = (io: SocketServer) => {
  // Configurar el servicio de chat con Socket.IO
  setupChatServiceSocketIO(io);
  setupChatPresenceSocketIO(io);
  setupMessageServiceSocketIO(io); // Configurar servicio de mensajes

  // Manejar conexiones de socket
  io.on('connection', socket => {
    logger.info('Nuevo cliente conectado', { socketId: socket.id });

    // Autenticar usuario y suscribirse a su canal personal
    socket.on('authenticate', (userId: string) => {
      if (userId) {
        // Suscribir al canal específico del usuario para notificaciones personales
        socket.join(`user:${userId}`);
        logger.info('Usuario autenticado y suscrito a su canal personal', {
          socketId: socket.id,
          userId
        });
      }
    });

    // Unirse a una sala de chat
    socket.on('join_chat', async data => {
      try {
        const { chatId, userId } =
          typeof data === 'object' && data
            ? data
            : { chatId: data, userId: null };

        socket.join(chatId);
        logger.info('Cliente unido a chat', {
          socketId: socket.id,
          chatId,
          userId
        });

        // Si tenemos el userId, actualizar el estado de presencia
        if (userId) {
          try {
            await chatPresenceService.updatePresence(userId, chatId, true);
            logger.info('Estado de presencia actualizado', {
              userId,
              chatId,
              isOnline: true
            });
          } catch (presenceError) {
            logger.error('Error al actualizar estado de presencia', {
              error: presenceError,
              userId,
              chatId
            });
            // No lanzamos el error para no interrumpir el flujo principal
          }
        }
      } catch (error) {
        logger.error('Error al unirse al chat', { error });
      }
    });

    // Manejar mensajes nuevos
    socket.on('new_message', async data => {
      try {
        // Verificar conexión a la base de datos antes de operar
        const isConnected = await ensurePrismaConnection();
        if (!isConnected) {
          throw new Error(
            'No se pudo establecer conexión con la base de datos'
          );
        }

        const { content, senderId, chatId, replyToId } = data;

        // Crear mensaje en la base de datos
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

        // NUEVO: Buscar usuarios que tienen el chat eliminado (excepto el remitente)
        const usersWithDeletedChat = await prisma.chatUserState.findMany({
          where: {
            chatId,
            isDeleted: true,
            userId: { not: senderId }
          },
          select: {
            userId: true
          }
        });

        // NUEVO: Restaurar el chat para estos usuarios
        for (const userState of usersWithDeletedChat) {
          try {
            // Restaurar el chat para este usuario
            await prisma.chatUserState.update({
              where: {
                userId_chatId: {
                  userId: userState.userId,
                  chatId
                }
              },
              data: {
                isDeleted: false,
                deletedAt: null
              }
            });

            // Notificar al usuario que el chat ha sido restaurado
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

            logger.info(
              `Chat ${chatId} restaurado para usuario ${userState.userId} debido a nuevo mensaje`
            );
          } catch (restoreError) {
            logger.error(
              `Error al restaurar chat ${chatId} para usuario ${userState.userId}`,
              {
                error: restoreError
              }
            );
            // No lanzamos el error para no interrumpir el flujo principal
          }
        }

        // Emitir mensaje a todos los clientes en la sala de chat
        io.to(chatId).emit('message_received', message);

        // Incrementar contador de no leídos para los destinatarios
        // Usando try/catch para que si esto falla, no afecte el resto del flujo
        try {
          if (message) {
            await chatPresenceService.incrementUnreadCounter({
              id: message.id,
              chatId: message.chatId,
              senderId: message.senderId
            });
          }
        } catch (counterError) {
          logger.warn('Error al incrementar contadores de no leídos', {
            error: counterError,
            messageId: message.id
          });
          // No relanzo el error para no interrumpir el flujo principal
        }

        // Notificar a los usuarios sobre el nuevo mensaje utilizando el servicio de notificaciones
        try {
          if (message.sender.name) {
            notificationService.notifyNewMessage({
              id: message.id,
              content: message.content,
              senderId: message.senderId,
              chatId: message.chatId,
              sender: {
                name: message.sender.name
              }
            });
          }
        } catch (notificationError) {
          logger.warn('Error al enviar notificaciones de nuevo mensaje', {
            error: notificationError,
            messageId: message.id
          });
          // No relanzo el error para no interrumpir el flujo principal
        }

        logger.info('Mensaje enviado', {
          chatId,
          messageId: message.id,
          senderId
        });
      } catch (error) {
        logger.error('Error al procesar mensaje', { error });
        socket.emit('message_error', {
          message: 'Error al procesar el mensaje'
        });
      }
    });

    // Manejar escritura en curso
    socket.on('typing', data => {
      const { chatId, userId, userName } = data;
      socket.to(chatId).emit('user_typing', { userId, userName });
    });

    // Obtener chats de un usuario
    socket.on('get_user_chats', async (userId: string) => {
      try {
        // Obtener todos los chats del usuario
        const userChats = await prisma.chat.findMany({
          where: {
            members: {
              some: {
                userId
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

        // Emitir los chats al usuario
        socket.emit('user_chats', userChats);

        logger.info('Chats de usuario enviados', {
          socketId: socket.id,
          userId,
          chatCount: userChats.length
        });
      } catch (error) {
        logger.error('Error al obtener chats de usuario', { error });
        socket.emit('chats_error', {
          message: 'Error al obtener chats del usuario'
        });
      }
    });

    // Manejar desconexión
    socket.on('disconnect', async () => {
      try {
        // Obtener el userId del socket
        const userId = Object.keys(socket.rooms)
          .find(room => room.startsWith('user:'))
          ?.replace('user:', '');

        if (userId) {
          // Buscar todos los chats a los que el usuario está unido
          const chatMembers = await prisma.chatMember.findMany({
            where: { userId },
            select: { chatId: true }
          });

          // Actualizar estado de presencia en todos los chats
          for (const member of chatMembers) {
            try {
              await chatPresenceService.updatePresence(
                userId,
                member.chatId,
                false
              );
              logger.info('Estado de presencia actualizado a offline', {
                userId,
                chatId: member.chatId
              });
            } catch (presenceError) {
              logger.error(
                'Error al actualizar estado de presencia a offline',
                {
                  error: presenceError,
                  userId,
                  chatId: member.chatId
                }
              );
            }
          }
        }

        logger.info('Cliente desconectado', { socketId: socket.id, userId });
      } catch (error) {
        logger.error('Error al manejar desconexión de socket', { error });
      }
    });
  });
};
