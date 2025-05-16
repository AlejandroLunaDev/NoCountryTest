import { Request, Response, NextFunction } from 'express';
import { messageService } from '../services/messageService';
import { activityService } from '../../simulations/services/activity';
import { ActivityType } from '@prisma/client';
import { catchAsync } from '../../../middlewares/errorHandler';
import { notFoundError } from '../../../utils/errors';

export const messageController = {
  createMessage: catchAsync(async (req: Request, res: Response) => {
    const messageData = req.body;
    const message = await messageService.createMessage(messageData);

    // Registrar actividad
    await activityService.recordActivity({
      userId: messageData.senderId,
      simulationId: messageData.chatId, // Asume que el chat pertenece a una simulación
      type: ActivityType.SEND_MESSAGE,
      details: `Message sent to chat ${messageData.chatId}`
    });

    res.status(201).json({
      success: true,
      data: message
    });
  }),

  getMessages: catchAsync(async (req: Request, res: Response) => {
    const { chatId, userId, limit, offset } = req.query;

    const queryParams: any = {};

    if (chatId) queryParams.chatId = chatId as string;
    if (userId) queryParams.userId = userId as string;
    if (limit) queryParams.limit = parseInt(limit as string);
    if (offset) queryParams.offset = parseInt(offset as string);

    const messages = await messageService.getMessages(queryParams);

    res.status(200).json({
      success: true,
      data: messages
    });
  }),

  getMessageById: catchAsync(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const message = await messageService.getMessageById(id);

      if (!message) {
        return next(notFoundError('Mensaje'));
      }

      res.status(200).json({
        success: true,
        data: message
      });
    }
  )
};
