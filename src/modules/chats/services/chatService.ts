import prisma from '../../../config/prisma';
import { CreateChatDTO, AddMemberDTO } from '../types';

export const chatService = {
  async createChat(data: CreateChatDTO) {
    const { name, type, memberIds } = data;

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

    return chat;
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
    return prisma.chat.findMany({
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
  },

  async addMemberToChat(data: AddMemberDTO) {
    const { chatId, userId } = data;

    return prisma.chatMember.create({
      data: {
        chatId,
        userId
      }
    });
  }
};
