import prisma from '../../../config/prisma';
import { CreateMessageDTO, QueryMessagesDTO } from '../types';

export const messageService = {
  async createMessage(data: CreateMessageDTO) {
    const { content, senderId, chatId, replyToId } = data;

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
