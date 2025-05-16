import { Request, Response, NextFunction } from 'express';
import { chatService } from '../services/chatService';
import { catchAsync } from '../../../middlewares/errorHandler';
import { notFoundError } from '../../../utils/errors';

export const chatController = {
  createChat: catchAsync(async (req: Request, res: Response) => {
    const chatData = req.body;
    const chat = await chatService.createChat(chatData);

    res.status(201).json({
      success: true,
      data: chat
    });
  }),

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
  })
};
