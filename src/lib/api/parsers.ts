import {
  createMessageId,
  createConversationId,
  createUserId,
  type Message,
  type Conversation,
  type User,
} from '@/features/messaging/domain/types';

export function parseMessage(dto: any): Message {
  return {
    id: createMessageId(dto.id),
    conversationId: createConversationId(dto.conversation_id || dto.conversationId),
    senderId: createUserId(dto.sender_id || dto.senderId),
    content: dto.content,
    files: dto.files || [],
    status: dto.status,
    createdAt: new Date(dto.created_at || dto.createdAt),
    updatedAt: new Date(dto.updated_at || dto.updatedAt),
    readAt: dto.read_at || dto.readAt ? new Date(dto.read_at || dto.readAt) : null,
    deletedAt: dto.deleted_at || dto.deletedAt ? new Date(dto.deleted_at || dto.deletedAt) : null,
  };
}

export function parseConversation(dto: any): Conversation {
  return {
    id: createConversationId(dto.id),
    participants: dto.participants.map((p: any) => parseUser(p)),
    lastMessage: dto.last_message ? parseMessage(dto.last_message) : null,
    unreadCount: dto.unread_count || 0,
    createdAt: new Date(dto.created_at),
    updatedAt: new Date(dto.updated_at),
  };
}

export function parseUser(dto: any): User {
  return {
    id: createUserId(dto.id),
    name: dto.name,
    avatar: dto.avatar,
    presenceStatus: dto.presence_status || 'offline',
    lastSeenAt: dto.last_seen_at ? new Date(dto.last_seen_at) : null,
  };
}