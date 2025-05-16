export interface CreateMessageDTO {
  content: string;
  senderId: string;
  chatId: string;
  replyToId?: string;
}

export interface QueryMessagesDTO {
  chatId?: string;
  userId?: string;
  limit?: number;
  offset?: number;
}
