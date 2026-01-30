import { ConversationService } from './ConversationService';
import type {
  IConversationRepository,
  IMessageRepository,
} from '../domain/interfaces';
import type {
  Conversation,
  ConversationId,
  UserId,
  ApiResponse,
} from '../domain/types';
import {
  ValidationError,
  NetworkError,
} from '../domain/interfaces';
import { CONVERSATION_CACHE } from '../domain/constants';


class MockConversationRepository implements IConversationRepository {
  getConversationsSpy = jest.fn();
  getConversationSpy = jest.fn();
  getOrCreateConversationSpy = jest.fn();
  updateUnreadCountSpy = jest.fn();

  private shouldFail = false;

  setFailure() {
    this.shouldFail = true;
  }

  clearFailure() {
    this.shouldFail = false;
  }

  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    this.getConversationsSpy();

    if (this.shouldFail) {
      return { error: 'network error' };
    }

    return {
      data: [
        {
          id: 'conv_1' as ConversationId,
          participants: ['user_1', 'user_2'],
          unreadCount: 1,
          lastMessageAt: new Date(),
        },
      ],
    };
  }

  async getConversation(
    conversationId: ConversationId
  ): Promise<ApiResponse<Conversation>> {
    this.getConversationSpy(conversationId);

    if (this.shouldFail) {
      return { error: 'network error' };
    }

    return {
      data: {
        id: conversationId,
        participants: ['user_1', 'user_2'],
        unreadCount: 0,
        lastMessageAt: new Date(),
      },
    };
  }

  async getOrCreateConversation(
    participantId: UserId
  ): Promise<ApiResponse<Conversation>> {
    this.getOrCreateConversationSpy(participantId);

    if (this.shouldFail) {
      return { error: 'network error' };
    }

    return {
      data: {
        id: 'conv_new' as ConversationId,
        participants: ['me', participantId],
        unreadCount: 0,
        lastMessageAt: new Date(),
      },
    };
  }

  async updateUnreadCount(
    conversationId: ConversationId
  ): Promise<ApiResponse<Conversation>> {
    this.updateUnreadCountSpy(conversationId);

    if (this.shouldFail) {
      return { error: 'network error' };
    }

    return {
      data: {
        id: conversationId,
        participants: ['user_1', 'user_2'],
        unreadCount: 0,
        lastMessageAt: new Date(),
      },
    };
  }
}

class MockMessageRepository implements IMessageRepository {
  markConversationAsReadSpy = jest.fn();
  private shouldFail = false;

  setFailure() {
    this.shouldFail = true;
  }

  clearFailure() {
    this.shouldFail = false;
  }

  async markConversationAsRead(
    conversationId: ConversationId
  ): Promise<ApiResponse<string[]>> {
    this.markConversationAsReadSpy(conversationId);

    if (this.shouldFail) {
      return { error: 'network error' };
    }

    return { data: [] };
  }

  // --- unused methods but required by interface ---
  async getMessages(): Promise<any> {
    throw new Error('not used in ConversationService tests');
  }
  async createMessage(): Promise<any> {
    throw new Error('not used in ConversationService tests');
  }
  async updateMessageStatus(): Promise<any> {
    throw new Error('not used in ConversationService tests');
  }
  async deleteMessage(): Promise<any> {
    throw new Error('not used in ConversationService tests');
  }
}

describe('ConversationService', () => {
  let service: ConversationService;
  let conversationRepo: MockConversationRepository;
  let messageRepo: MockMessageRepository;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(Date.now());

    conversationRepo = new MockConversationRepository();
    messageRepo = new MockMessageRepository();

    service = new ConversationService(conversationRepo, messageRepo);
  });

  afterEach(() => {
    jest.useRealTimers();
  });


  describe('getConversations', () => {
    it('fetches conversations from repository', async () => {
      const result = await service.getConversations();

      expect(conversationRepo.getConversationsSpy).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
    });

    it('uses cache within TTL', async () => {
      await service.getConversations();
      await service.getConversations();

      expect(conversationRepo.getConversationsSpy).toHaveBeenCalledTimes(1);
    });

    it('invalidates cache after TTL', async () => {
      await service.getConversations();

      jest.advanceTimersByTime(CONVERSATION_CACHE.TTL_MS + 1);

      await service.getConversations();

      expect(conversationRepo.getConversationsSpy).toHaveBeenCalledTimes(2);
    });

    it('throws NetworkError on repository failure', async () => {
      conversationRepo.setFailure();

      await expect(service.getConversations()).rejects.toThrow(NetworkError);
    });
  });


  describe('openConversation', () => {
    it('throws ValidationError if participantId missing', async () => {
      await expect(
        service.openConversation(undefined as unknown as UserId)
      ).rejects.toThrow(ValidationError);
    });

    it('creates or retrieves conversation', async () => {
      const participantId = 'user_42' as UserId;

      const conversation = await service.openConversation(participantId);

      expect(conversationRepo.getOrCreateConversationSpy)
        .toHaveBeenCalledWith(participantId);

      expect(conversation.id).toBeDefined();
    });

    it('invalidates cache after opening conversation', async () => {
      await service.getConversations();
      expect(conversationRepo.getConversationsSpy).toHaveBeenCalledTimes(1);

      await service.openConversation('user_42' as UserId);
      await service.getConversations();

      expect(conversationRepo.getConversationsSpy).toHaveBeenCalledTimes(2);
    });

    it('throws NetworkError on repository failure', async () => {
      conversationRepo.setFailure();

      await expect(
        service.openConversation('user_42' as UserId)
      ).rejects.toThrow(NetworkError);
    });
  });


  describe('markConversationAsRead', () => {
    it('throws ValidationError if conversationId missing', async () => {
      await expect(
        service.markConversationAsRead(undefined as unknown as ConversationId)
      ).rejects.toThrow(ValidationError);
    });

    it('marks messages as read and updates unread count', async () => {
      const conversationId = 'conv_1' as ConversationId;

      await service.markConversationAsRead(conversationId);

      expect(messageRepo.markConversationAsReadSpy)
        .toHaveBeenCalledWith(conversationId);

      expect(conversationRepo.updateUnreadCountSpy)
        .toHaveBeenCalledWith(conversationId);
    });

    it('invalidates cache after marking as read', async () => {
      await service.getConversations();
      expect(conversationRepo.getConversationsSpy).toHaveBeenCalledTimes(1);

      await service.markConversationAsRead('conv_1' as ConversationId);
      await service.getConversations();

      expect(conversationRepo.getConversationsSpy).toHaveBeenCalledTimes(2);
    });

    it('throws NetworkError if message repository fails', async () => {
      messageRepo.setFailure();

      await expect(
        service.markConversationAsRead('conv_1' as ConversationId)
      ).rejects.toThrow(NetworkError);
    });

    it('throws NetworkError if conversation repository fails', async () => {
      conversationRepo.setFailure();

      await expect(
        service.markConversationAsRead('conv_1' as ConversationId)
      ).rejects.toThrow(NetworkError);
    });
  });
});
