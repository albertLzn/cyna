/**
 * Tests unitaires MessageRepository
 * Vérifie les appels HTTP et parsing des réponses
 */

import { MessageRepository } from './MessageRepository';
import { MessageStatus, createMessageId, createConversationId } from '../domain/types';

const mockFetch = jest.fn<
  Promise<Response>,
  [RequestInfo | URL, RequestInit?]
>();
global.fetch = mockFetch as unknown as typeof fetch;

const mockResponse = (
  body: any,
  options: Partial<Response> = {}
): Response =>
  ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => body,
    ...options,
  }) as Response;

  const mockErrorResponse = (
  body: any,
  status = 400,
  statusText = 'Error'
): Response =>
  ({
    ok: false,
    status,
    statusText,
    json: async () => body,
  }) as Response;


describe('MessageRepository', () => {
  let repository: MessageRepository;
  beforeEach(() => {
    repository = new MessageRepository({
      baseURL: 'http://localhost:3000/api',
      getAuthToken: () => 'mock-token-123',
    });
    mockFetch.mockClear();
  });

  // ==================== getMessages ====================

  describe('getMessages', () => {
    it('should fetch messages with correct query params', async () => {
      const mockResponse = {
        data: [
          {
            id: 'msg_1',
            conversationId: 'conv_1',
            senderId: 'user1',
            content: 'Hello',
            files: [],
            status: MessageStatus.SENT,
            createdAt: '2024-01-01T10:00:00Z',
            updatedAt: '2024-01-01T10:00:00Z',
            readAt: null,
            deletedAt: null,
          },
        ],
        nextCursor: 'msg_2',
        hasMore: true,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await repository.getMessages({
        conversationId: createConversationId('conv_1'),
        limit: 50,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/messages?conversationId=conv_1&limit=50',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-123',
          }),
        })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.data).toHaveLength(1);
      expect(result.data!.data[0].content).toBe('Hello');
      expect(result.data!.hasMore).toBe(true);
    });

    it('should parse ISO dates to Date objects', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'msg_1',
              conversationId: 'conv_1',
              senderId: 'user1',
              content: 'Test',
              files: [],
              status: MessageStatus.READ,
              createdAt: '2024-01-01T10:00:00Z',
              updatedAt: '2024-01-01T10:00:00Z',
              readAt: '2024-01-01T11:00:00Z',
              deletedAt: null,
            },
          ],
          nextCursor: null,
          hasMore: false,
        }),
      } as Response);

      const result = await repository.getMessages({
        conversationId: createConversationId('conv_1'),
      });

      const message = result.data!.data[0];
      expect(message.createdAt).toBeInstanceOf(Date);
      expect(message.updatedAt).toBeInstanceOf(Date);
      expect(message.readAt).toBeInstanceOf(Date);
      expect(message.deletedAt).toBeNull();
    });

    it('should include cursor in query params if provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], nextCursor: null, hasMore: false }),
      } as Response);

      await repository.getMessages({
        conversationId: createConversationId('conv_1'),
        cursor: createMessageId('msg_10'),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('cursor=msg_10'),
        expect.anything()
      );
    });

    it('should return error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Conversation not found' }),
      } as Response);

      const result = await repository.getMessages({
        conversationId: createConversationId('conv_999'),
      });

      expect(result.error).toBe('Conversation not found');
      expect(result.data).toBeUndefined();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await repository.getMessages({
        conversationId: createConversationId('conv_1'),
      });

      expect(result.error).toBe('Network error. Please check your connection.');
    });
  });

  // ==================== createMessage ====================

  describe('createMessage', () => {
    it('should send POST request with correct payload', async () => {
      const mockMessage = {
        id: 'msg_new',
        conversationId: 'conv_1',
        senderId: 'user1',
        content: 'New message',
        files: [],
        status: MessageStatus.SENT,
        createdAt: '2024-01-01T12:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        readAt: null,
        deletedAt: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockMessage }),
      } as Response);

      const result = await repository.createMessage({
        conversationId: createConversationId('conv_1'),
        content: 'New message',
        files: [],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-token-123',
          }),
          body: JSON.stringify({
            conversationId: 'conv_1',
            content: 'New message',
            files: [],
          }),
        })
      );

      expect(result.data).toBeDefined();
      expect(result.data!.content).toBe('New message');
    });

    it('should handle message with files', async () => {
      const files = [
        {
          id: 'file_1',
          name: 'doc.pdf',
          type: 'pdf' as any,
          size: 1024,
          url: 'https://example.com/doc.pdf',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            id: 'msg_new',
            conversationId: 'conv_1',
            senderId: 'user1',
            content: null,
            files,
            status: MessageStatus.SENT,
            createdAt: '2024-01-01T12:00:00Z',
            updatedAt: '2024-01-01T12:00:00Z',
            readAt: null,
            deletedAt: null,
          },
        }),
      } as Response);

      const result = await repository.createMessage({
        conversationId: createConversationId('conv_1'),
        content: null,
        files,
      });

      expect(result.data!.files).toHaveLength(1);
      expect(result.data!.files[0].name).toBe('doc.pdf');
    });

    it('should return error on validation failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'content or files required' }),
      } as Response);

      const result = await repository.createMessage({
        conversationId: createConversationId('conv_1'),
        content: null,
        files: [],
      });

      expect(result.error).toBe('content or files required');
    });
  });

  // ==================== updateMessageStatus ====================

  describe('updateMessageStatus', () => {
    it('should send PATCH request to update status', async () => {
      const mockMessage = {
        id: 'msg_1',
        conversationId: 'conv_1',
        senderId: 'user1',
        content: 'Test',
        files: [],
        status: MessageStatus.READ,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T10:00:00Z',
        readAt: '2024-01-01T11:00:00Z',
        deletedAt: null,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockMessage }),
      } as Response);

      const result = await repository.updateMessageStatus({
        messageId: createMessageId('msg_1'),
        status: MessageStatus.READ,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/messages/msg_1/status',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: MessageStatus.READ }),
        })
      );

      expect(result.data!.status).toBe(MessageStatus.READ);
      expect(result.data!.readAt).toBeInstanceOf(Date);
    });

    it('should return error if message not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'Message not found' }),
      } as Response);

      const result = await repository.updateMessageStatus({
        messageId: createMessageId('msg_999'),
        status: MessageStatus.READ,
      });

      expect(result.error).toBe('Message not found');
    });
  });

  // ==================== deleteMessage ====================

  describe('deleteMessage', () => {
    it('should send DELETE request', async () => {
      const mockMessage = {
        id: 'msg_1',
        conversationId: 'conv_1',
        senderId: 'user1',
        content: 'Deleted message',
        files: [],
        status: MessageStatus.SENT,
        createdAt: '2024-01-01T10:00:00Z',
        updatedAt: '2024-01-01T12:00:00Z',
        readAt: null,
        deletedAt: '2024-01-01T12:00:00Z',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockMessage }),
      } as Response);

      const result = await repository.deleteMessage(createMessageId('msg_1'));

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/messages/msg_1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );

      expect(result.data!.deletedAt).toBeInstanceOf(Date);
    });

    it('should return error on forbidden delete', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: 'Only sender can delete message' }),
      } as Response);

      const result = await repository.deleteMessage(createMessageId('msg_1'));

      expect(result.error).toBe('Only sender can delete message');
    });
  });

  // ==================== markConversationAsRead ====================

  describe('markConversationAsRead', () => {
    it('should send POST request and return message IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: ['msg_1', 'msg_2', 'msg_3'] }),
      } as Response);

      const result = await repository.markConversationAsRead(
        createConversationId('conv_1')
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/conversations/conv_1/mark-read',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.data).toHaveLength(3);
      expect(result.data![0]).toBe('msg_1');
    });

    it('should return empty array if no unread messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [] }),
      } as Response);

      const result = await repository.markConversationAsRead(
        createConversationId('conv_1')
      );

      expect(result.data).toEqual([]);
    });
  });

  // ==================== Error handling ====================

  describe('Error handling', () => {
    it('should handle HTTP error without JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => {
          throw new Error('No JSON');
        },
      } as Response);

      const result = await repository.getMessages({
        conversationId: createConversationId('conv_1'),
      });

      expect(result.error).toContain('500');
    });

    it('should handle unknown errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce('Random error');

      const result = await repository.createMessage({
        conversationId: createConversationId('conv_1'),
        content: 'Test',
      });

      expect(result.error).toBe('Unknown error');
    });
  });

  // ==================== Headers ====================

  describe('Authentication headers', () => {
    it('should include auth token in headers', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], nextCursor: null, hasMore: false }),
      } as Response);

      await repository.getMessages({
        conversationId: createConversationId('conv_1'),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token-123',
          }),
        })
      );
    });

    it('should work without auth token', async () => {
      const repoNoAuth = new MessageRepository({
        baseURL: 'http://localhost:3001/api',
      });

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], nextCursor: null, hasMore: false }),
      } as Response);

      await repoNoAuth.getMessages({
        conversationId: createConversationId('conv_1'),
      });

      const callHeaders = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(callHeaders['Authorization']).toBeUndefined();
    });
  });
});