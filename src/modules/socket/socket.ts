import { Server as SocketServer } from 'socket.io';
import prisma from '../../config/prisma';
import logger from '../../utils/logger';

export const setupSocketHandlers = (io: SocketServer) => {
  // Manejar conexiones de socket
  io.on('connection', socket => {
    logger.info('Nuevo cliente conectado', { socketId: socket.id });

    // Unirse a una sala de chat
    socket.on('join_chat', (chatId: string) => {
      socket.join(chatId);
      logger.info('Cliente unido a chat', { socketId: socket.id, chatId });
    });

    // Manejar mensajes nuevos
    socket.on('new_message', async data => {
      try {
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

    // Manejar desconexión
    socket.on('disconnect', () => {
      logger.info('Cliente desconectado', { socketId: socket.id });
    });
  });
};
