import { ChatType } from '@prisma/client';

export interface CreateChatDTO {
  name?: string;
  type: ChatType;
  memberIds: string[];
  creatorId?: string;
}

export interface AddMemberDTO {
  chatId: string;
  userId: string;
}
