import type {
  Message,
  MessageId,
  Conversation,
  ConversationId,
  UserId,
  CreateMessagePayload,
  UpdateMessageStatusPayload,
  MessageQueryParams,
  PaginatedResult,
  PresenceStatus,
  WebSocketEvent,
  ApiResponse,
} from '../types/types';

// Abstraction (HTTP, WebSocket)
export interface IMessageRepository {
  getMessages(params: MessageQueryParams): Promise<ApiResponse<PaginatedResult<Message>>>;
  createMessage(payload: CreateMessagePayload): Promise<ApiResponse<Message>>;
  updateMessageStatus(payload: UpdateMessageStatusPayload): Promise<ApiResponse<Message>>;
  deleteMessage(messageId: MessageId): Promise<ApiResponse<Message>>;
  markConversationAsRead(conversationId: ConversationId): Promise<ApiResponse<MessageId[]>>;
}

export interface IConversationRepository {
  getConversations(): Promise<ApiResponse<Conversation[]>>;
  getConversation(conversationId: ConversationId): Promise<ApiResponse<Conversation>>;
  getOrCreateConversation(participantId: UserId): Promise<ApiResponse<Conversation>>;
  updateUnreadCount(conversationId: ConversationId): Promise<ApiResponse<Conversation>>;
}

// Business logic 

export interface IMessageService {
  getMessages(params: MessageQueryParams): Promise<PaginatedResult<Message>>;
  sendMessage(payload: CreateMessagePayload): Promise<Message>;
  markAsRead(messageId: MessageId): Promise<Message>;
  deleteMessage(messageId: MessageId): Promise<Message>;
  retryFailedMessage(messageId: MessageId): Promise<Message>;
}

export interface IConversationService {
  getConversations(): Promise<Conversation[]>;
  openConversation(participantId: UserId): Promise<Conversation>;
  markConversationAsRead(conversationId: ConversationId): Promise<void>;
}

// connexion websocket/ UserId pour auth WS
export interface IWebSocketService {
  connect(userId: UserId): Promise<void>;
  disconnect(): void;
  send(event: WebSocketEvent): void;
  subscribe<T extends WebSocketEvent['type']>(
    eventType: T,
    callback: (event: Extract<WebSocketEvent, { type: T }>) => void
  ): () => void;

  isConnected(): boolean;
}

// Gestion du  du "X is typing..."
export interface ITypingService {
  startTyping(conversationId: ConversationId): void;
  stopTyping(conversationId: ConversationId): void;
  getTypingUsers(conversationId: ConversationId): UserId[];
}

export interface IPresenceService {
  updateStatus(status: PresenceStatus): Promise<void>;
  getStatus(userId: UserId): PresenceStatus;
  subscribeToUser(userId: UserId, callback: (status: PresenceStatus) => void): () => void;
}

// ERRORS 
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public readonly statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class WebSocketNotConnectedError extends Error {
  constructor() {
    super('WebSocket is not connected');
    this.name = 'WebSocketNotConnectedError';
  }
}
