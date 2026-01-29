import {
  createUserId,
  createMessageId,
  MessageStatus,
  isMessage,
  isWebSocketEvent,
  type Message,
  type WebSocketEvent,
  type UserId,
} from './types';

describe('Domain Types', () => {
  describe('Branded Types Helpers', () => {
    it('should create branded UserId', () => {
      const userId = createUserId('userTest');
      expect(userId).toBe('userTest');

      const rawString: string = 'wrongUserTest';
    });

    it('should create MessageId', () => {
      const messageId = createMessageId('testMessage');
      expect(messageId).toBe('testMessage');
    });

    it('should avoid mixing IDs', () => {
      const userId = createUserId('123');
      const messageId = createMessageId('123');
    });
  });

  describe('Type Guards', () => {
    describe('isMessage', () => {
      it('should validate correct Message object', () => {
        const validMessage: Message = {
          id: createMessageId('testMessage'),
          conversationId: 'convTest' as any,
          senderId: createUserId('userTest'),
          content: 'descr',
          status: MessageStatus.SENT,
          createdAt: new Date(),
          updatedAt: new Date(),
          readAt: null,
          deletedAt: null,
        };

        expect(isMessage(validMessage)).toBe(true);
      });

      it('should reject wrong values', () => {
        expect(isMessage(null)).toBe(false);
        expect(isMessage(undefined)).toBe(false);
        expect(isMessage('string')).toBe(false);
        expect(isMessage(123)).toBe(false);
        expect(isMessage({})).toBe(false);
      });

      it('should reject object missing required fields', () => {
        const invalidMessage = {
          id: createMessageId('testMessage'),
          content: 'descr',
        };

        expect(isMessage(invalidMessage)).toBe(false);
      });

      it('should reject object with invalid status', () => {
        const invalidMessage = {
          id: createMessageId('testMessage'),
          conversationId: 'convTest',
          senderId: createUserId('userTest'),
          status: 'INVALID_STATUS',
        };

        expect(isMessage(invalidMessage)).toBe(false);
      });
    });

    describe('isWebSocketEvent', () => {
      it('should validate message:sent event', () => {
        const event: WebSocketEvent = {
          type: 'message:sent',
          payload: {
            id: createMessageId('testMessage'),
            conversationId: 'convTest' as any,
            senderId: createUserId('userTest'),
            content: 'Test',
            status: MessageStatus.SENT,
            createdAt: new Date(),
            updatedAt: new Date(),
            readAt: null,
            deletedAt: null,
          },
        };

        expect(isWebSocketEvent(event)).toBe(true);
      });

      it('should reject events', () => {
        const events: WebSocketEvent[] = [
          { type: 'user:typing', payload: {} },
          { type: 'user:presence', payload: {} },
          { type: 'conversation:updated', payload: {} },
        ];

        events.forEach(event => {
          expect(isWebSocketEvent(event)).toBe(true);
        });
      });

      it('should reject invalid events', () => {
        expect(isWebSocketEvent(null)).toBe(false);
        expect(isWebSocketEvent({})).toBe(false);
        expect(isWebSocketEvent({ type: 'test' })).toBe(false);
        expect(isWebSocketEvent({ payload: {} })).toBe(false);
      });
    });
  });

  describe('MessageStatus Enum', () => {
    it('should show message statuses', () => {
      expect(MessageStatus.SENDING).toBe('sending');
      expect(MessageStatus.SENT).toBe('sent');
      expect(MessageStatus.DELIVERED).toBe('delivered');
      expect(MessageStatus.READ).toBe('read');
      expect(MessageStatus.FAILED).toBe('failed');
    });

    it('should allow switch', () => {
      const labelFor = (status: MessageStatus): string => {
        switch (status) {
          case MessageStatus.SENDING:
            return 'Sending';
          case MessageStatus.SENT:
            return 'Sent';
          case MessageStatus.DELIVERED:
            return 'Delivered';
          case MessageStatus.READ:
            return 'Read';
          case MessageStatus.FAILED:
            return 'Failed';
          default:
            const _exhaustive: never = status;
            return _exhaustive;
        }
      };

      expect(labelFor(MessageStatus.SENT)).toBe('Sent');
    });
  });
});
