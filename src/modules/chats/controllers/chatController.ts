import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chatService';
import { catchAsync } from '../../../middlewares/errorHandler';
import { notFoundError } from '../../../utils/errors';

export const chatController = {
  createChat: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const chatData = {
          ...req.body,
          creatorId: req.body.creatorId || req.user?.id
        };

        const chat = await chatService.createChat(chatData);

        res.status(201).json({
          success: true,
          data: chat
        });
      } catch (error) {
        // Manejar errores específicos de validación de chat
        if (error instanceof Error) {
          if (error.message.includes('Ya existe un chat individual')) {
            return res.status(409).json({
              success: false,
              message: error.message,
              error: 'DUPLICATE_CHAT'
            });
          } else if (
            error.message.includes('Los chats individuales deben tener')
          ) {
            return res.status(400).json({
              success: false,
              message: error.message,
              error: 'INVALID_MEMBERS_COUNT'
            });
          }
        }

        // Si no es un error controlado, lo pasamos al manejador de errores global
        next(error);
      }
    }
  ),

  getChatById: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const chat = await chatService.findChatById(id);

      if (!chat) {
        return next(notFoundError('Chat'));
      }

      res.status(200).json({
        success: true,
        data: chat
      });
    }
  ),

  getUserChats: catchAsync(async (req: Request, res: Response) => {
    const { userId } = req.params;
    const chats = await chatService.getChatsByUserId(userId);

    res.status(200).json({
      success: true,
      data: chats
    });
  }),

  addMemberToChat: catchAsync(async (req: Request, res: Response) => {
    const { chatId } = req.params;
    const { userId } = req.body;

    const memberData = {
      chatId,
      userId
    };

    const member = await chatService.addMemberToChat(memberData);

    res.status(201).json({
      success: true,
      data: member
    });
  }),

  deleteChat: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      // El userId debería venir de la sesión del usuario autenticado
      // Aquí lo tomamos del cuerpo por simplicidad, pero en una app real
      // debería ser: const userId = req.user.id;
      const userId = req.body.userId || req.user?.id;

      if (!userId) {
        return next(
          new Error('Se requiere ID de usuario para eliminar el chat')
        );
      }

      const result = await chatService.deleteChat(id, userId);

      res.status(200).json({
        success: true,
        message: result.message,
        data: { deletedAt: result.deletedAt }
      });
    }
  ),

  // Controlador para borrado físico (solo para administradores)
  hardDeleteChat: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const userId = req.body.userId || req.user?.id;

      // En una aplicación real, deberías verificar si el usuario es administrador
      // Por ahora, asumimos que el parámetro isAdmin viene en el cuerpo
      const isAdmin = req.body.isAdmin || false;

      if (!userId) {
        return next(
          new Error('Se requiere ID de usuario para eliminar el chat')
        );
      }

      const result = await chatService.hardDeleteChat(id, userId, isAdmin);

      res.status(200).json({
        success: true,
        message: result.message
      });
    }
  )
};
