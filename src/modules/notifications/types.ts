/**
 * Enum para los tipos de notificaciones
 */
export enum NotificationType {
  NEW_MESSAGE = 'NEW_MESSAGE',
  MESSAGE_READ = 'MESSAGE_READ',
  USER_JOINED_CHAT = 'USER_JOINED_CHAT',
  USER_LEFT_CHAT = 'USER_LEFT_CHAT',
  CHAT_CREATED = 'CHAT_CREATED',
  MENTIONED = 'MENTIONED'
}

/**
 * Interfaz para las notificaciones
 */
export interface Notification {
  id: string;
  type: NotificationType;
  recipientId: string;
  senderId?: string;
  chatId?: string;
  messageId?: string;
  content: string;
  read: boolean;
  createdAt: Date;
}

/**
 * DTO para crear notificaciones
 */
export interface CreateNotificationDTO {
  type: NotificationType;
  recipientId: string;
  senderId?: string;
  chatId?: string;
  messageId?: string;
  content: string;
}
