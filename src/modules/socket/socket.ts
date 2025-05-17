import { Server as SocketServer } from 'socket.io';
import prisma from '../../config/prisma';
import logger from '../../utils/logger';
import { notificationService } from '../notifications/services/notificationService';
import { chatPresenceService } from '../chats/services/chatPresenceService';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

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
    socket.on('join_chat', (chatId: string) => {
      socket.join(chatId);
      logger.info('Cliente unido a chat', { socketId: socket.id, chatId });
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
    socket.on('disconnect', () => {
      logger.info('Cliente desconectado', { socketId: socket.id });
    });
  });
};
