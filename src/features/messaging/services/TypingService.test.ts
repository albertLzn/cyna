import { TypingService } from './TypingService';
import type { IWebSocketService } from '../domain/interfaces';
import { createConversationId, createUserId } from '../domain/types';

class MockWebSocketService implements Partial<IWebSocketService> {
  private listeners = new Map<string, Function[]>();
  
  send = jest.fn();
  
  subscribe = jest.fn((eventType: string, callback: Function) => {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType)!.push(callback);
    return () => {
      const callbacks = this.listeners.get(eventType);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  });
  
  simulateEvent(eventType: string, payload: any) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(cb => cb({ type: eventType, payload }));
    }
  }
}

describe('TypingService', () => {
  let service: TypingService;
  let mockWsService: MockWebSocketService;
  const currentUserId = createUserId('user1');
  const conversationId = createConversationId('conv1');
  const otherUserId = createUserId('user2');

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockWsService = new MockWebSocketService();
    service = new TypingService(mockWsService as any, currentUserId);
  });

  afterEach(() => {
    service.destroy();
    jest.useRealTimers();
  });

  describe('startTyping', () => {
    it('should send typing event', () => {
      service.startTyping(conversationId);

      expect(mockWsService.send).toHaveBeenCalledWith({
        type: 'user:typing',
        payload: {
          userId: currentUserId,
          conversationId,
          isTyping: true,
        },
      });
    });
  });

  describe('stopTyping', () => {
    it('should send stop typing event', () => {
      service.startTyping(conversationId);
      mockWsService.send.mockClear();

      service.stopTyping(conversationId);

      expect(mockWsService.send).toHaveBeenCalledWith({
        type: 'user:typing',
        payload: {
          userId: currentUserId,
          conversationId,
          isTyping: false,
        },
      });
    });

    it('should clear throttle timer', () => {
      service.startTyping(conversationId);
      service.stopTyping(conversationId);

      mockWsService.send.mockClear();
      service.startTyping(conversationId);

      expect(mockWsService.send).toHaveBeenCalled();
    });
  });

  describe('getTypingUsers', () => {
    it('should return empty array when no one typing', () => {
      const users = service.getTypingUsers(conversationId);
      expect(users).toEqual([]);
    });

    it('should return typing users from WebSocket events', () => {
      mockWsService.simulateEvent('user:typing', {
        userId: otherUserId,
        conversationId,
        isTyping: true,
      });

      const users = service.getTypingUsers(conversationId);
      expect(users).toContain(otherUserId);
    });

    it('should not include current user in typing list', () => {
      mockWsService.simulateEvent('user:typing', {
        userId: currentUserId,
        conversationId,
        isTyping: true,
      });

      const users = service.getTypingUsers(conversationId);
      expect(users).not.toContain(currentUserId);
    });

    it('should remove user when they stop typing', () => {
      mockWsService.simulateEvent('user:typing', {
        userId: otherUserId,
        conversationId,
        isTyping: true,
      });

      expect(service.getTypingUsers(conversationId)).toContain(otherUserId);

      mockWsService.simulateEvent('user:typing', {
        userId: otherUserId,
        conversationId,
        isTyping: false,
      });

      expect(service.getTypingUsers(conversationId)).not.toContain(otherUserId);
    });

  });

});