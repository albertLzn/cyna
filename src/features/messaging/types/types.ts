
export type UserId = string & { readonly __brand: 'UserId' };


export type MessageId = string & { readonly __brand: 'MessageId' };

export type ConversationId = string & { readonly __brand: 'ConversationId' };

export const createUserId = (id: string): UserId => id as UserId;
export const createMessageId = (id: string): MessageId => id as MessageId;

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed', 
}

export enum FileType {
  IMAGE = 'image',
  PDF = 'pdf',
  DOCUMENT = 'document',
  OTHER = 'other',
}


export interface User {
  id: UserId;
  name: string;
  avatar: string | null;
  lastSeenAt: Date | null;
}

export interface MessageFile {
  id: string;
  name: string;
  type: FileType;
  size: number;
  url: string;
}

export interface Message {
  id: MessageId;
  conversationId: ConversationId;
  senderId: UserId;
  content: string | null;
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;
  readAt: Date | null;
  deletedAt: Date | null;
}


export type WebSocketEvent =
  | { type: 'message:sent'; payload: Message }
  | { type: 'message:delivered'; payload: { messageId: MessageId; deliveredAt: Date } }
  | { type: 'message:read'; payload: { messageId: MessageId; readAt: Date } }
  | { type: 'message:deleted'; payload: { messageId: MessageId; deletedAt: Date } }
  // need to determine types. Ex: Discussion
  | { type: 'user:typing'; payload: any }
  | { type: 'user:presence'; payload: any }
  | { type: 'conversation:updated'; payload: any };

export type ApiResponse<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

export interface CreateMessagePayload {
  conversationId: ConversationId;
  content: string | null;
}

export interface UpdateMessageStatusPayload {
  messageId: MessageId;
  status: MessageStatus;
}

export interface MessageQueryParams {
  conversationId: ConversationId;
  limit?: number;
}

// Type guard for WebSocket events
export function isMessage(obj: unknown): obj is Message {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'conversationId' in obj &&
    'senderId' in obj &&
    'status' in obj &&
    Object.values(MessageStatus).includes((obj as Message).status)
  );
}

export function isWebSocketEvent(obj: unknown): obj is WebSocketEvent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'type' in obj &&
    'payload' in obj &&
    typeof (obj as WebSocketEvent).type === 'string'
  );
}