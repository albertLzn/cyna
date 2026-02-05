import type { IConversationRepository, IConversationService, IMessageRepository } from '../domain/interfaces';
import type {
  Conversation,
  ConversationId,
  UserId,
} from '../domain/types';
import { ValidationError, NetworkError } from '../domain/interfaces';
import { CONVERSATION_CACHE } from '../domain/constants';

export class ConversationService implements IConversationService {
  // Cached list of conversations
  private conversationsCache: Conversation[] | null = null;
  // Timestamp when cache was last updated 
  private cacheTimestamp: number | null = null;
  //  How long cache stays valid 
  private readonly cacheTTL = CONVERSATION_CACHE.TTL_MS;

  constructor(
    private readonly conversationRepo: IConversationRepository,
    private readonly messageRepo: IMessageRepository
  ) { }

  //  Fetches all conversations with caching 
  async getConversations(): Promise<Conversation[]> {
    // Return cached data if still valid
    if (
      this.conversationsCache &&
      this.cacheTimestamp &&
      Date.now() - this.cacheTimestamp < this.cacheTTL
    ) {
      return this.conversationsCache;
    }

    const result = await this.conversationRepo.getConversations();

    if ('error' in result) {
      const msg = result.error;
      if (!msg) throw new NetworkError('Unknown network error');
      throw new NetworkError(msg);
    }

    // Update cache
    this.conversationsCache = result.data;
    this.cacheTimestamp = Date.now();

    return result.data;
  }

  // Opens existing conversation or creates new one with participant
  async openConversation(participantId: UserId): Promise<Conversation> {
    if (!participantId) {
      throw new ValidationError('participantId is required');
    }

    const result = await this.conversationRepo.getOrCreateConversation(participantId);

    if ('error' in result) {
      const msg = result.error;
      if (!msg) throw new NetworkError('Unknown network error');
      throw new NetworkError(msg);
    }

    this.invalidateCache();

    return result.data;
  }

  // Marks all messages in conversation as read and updates unread count
  async markConversationAsRead(conversationId: ConversationId): Promise<void> {
    if (!conversationId) {
      throw new ValidationError('conversationId is required');
    }
    // Mark messages as read
    const messagesResult = await this.messageRepo.markConversationAsRead(conversationId);

    if ('error' in messagesResult) {
      const msg = messagesResult.error;
      if (!msg) throw new NetworkError('Unknown network error');
      throw new NetworkError(msg);
    }
    // Update conversation's unread count
    const convResult = await this.conversationRepo.updateUnreadCount(conversationId);

    if ('error' in convResult) {
      const msg = convResult.error;
      if (!msg) throw new NetworkError('Unknown network error');
      throw new NetworkError(msg);
    }

    this.invalidateCache();
  }

  private invalidateCache(): void {
    this.conversationsCache = null;
    this.cacheTimestamp = null;
  }
}