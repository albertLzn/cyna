import type { IConversationRepository, IConversationService, IMessageRepository } from '../domain/interfaces';
import type {
  Conversation,
  ConversationId,
  UserId,
} from '../domain/types';
import { ValidationError, NetworkError } from '../domain/interfaces';
import { CONVERSATION_CACHE } from '../domain/constants';

export class ConversationService implements IConversationService {
  private conversationsCache: Conversation[] | null = null;
  private cacheTimestamp: number | null = null;
  private readonly cacheTTL = CONVERSATION_CACHE.TTL_MS;

  constructor(
    private readonly conversationRepo: IConversationRepository,
    private readonly messageRepo: IMessageRepository
  ) { }


  async getConversations(): Promise<Conversation[]> {
    if (
      this.conversationsCache &&
      this.cacheTimestamp &&
      Date.now() - this.cacheTimestamp < this.cacheTTL
    ) {
      return this.conversationsCache;
    }

    const result = await this.conversationRepo.getConversations();

    if ('error' in result) {
      throw new NetworkError(result.error);
    }

    this.conversationsCache = result.data;
    this.cacheTimestamp = Date.now();

    return result.data;
  }

  async openConversation(participantId: UserId): Promise<Conversation> {
    if (!participantId) {
      throw new ValidationError('participantId is required');
    }

    const result = await this.conversationRepo.getOrCreateConversation(participantId);

    if ('error' in result) {
      throw new NetworkError(result.error);
    }

    this.invalidateCache();

    return result.data;
  }

  async markConversationAsRead(conversationId: ConversationId): Promise<void> {
    if (!conversationId) {
      throw new ValidationError('conversationId is required');
    }

    const messagesResult = await this.messageRepo.markConversationAsRead(conversationId);

    if ('error' in messagesResult) {
      throw new NetworkError(messagesResult.error);
    }

    const convResult = await this.conversationRepo.updateUnreadCount(conversationId);

    if ('error' in convResult) {
      throw new NetworkError(convResult.error);
    }

    this.invalidateCache();
  }

  private invalidateCache(): void {
    this.conversationsCache = null;
    this.cacheTimestamp = null;
  }
}