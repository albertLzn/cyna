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
      const msg = result.error;
      if (!msg) throw new NetworkError('Unknown network error');
      throw new NetworkError(msg);
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
      const msg = result.error;
      if (!msg) throw new NetworkError('Unknown network error');
      throw new NetworkError(msg);
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
      const msg = messagesResult.error;
      if (!msg) throw new NetworkError('Unknown network error');
      throw new NetworkError(msg);
    }
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