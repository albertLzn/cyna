import { ConversationRepository } from './ConversationRepository';
import {
  createConversationId,
  createUserId,
} from '../domain/types';


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


describe('ConversationRepository', () => {
  let repository: ConversationRepository;

  beforeEach(() => {
    repository = new ConversationRepository({
      baseURL: 'http://localhost:3000/api',
      getAuthToken: () => 'mock-token-123',
    });

    mockFetch.mockClear();
  });


  describe('getConversations', () => {
    it('should fetch and parse conversations', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: [
            {
              id: 'conv_1',
              participants: ['user_1', 'user_2'],
              unreadCount: 2,
              lastMessageAt: '2024-01-01T10:00:00Z',
            },
          ],
        })
      );

      const result = await repository.getConversations();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/conversations',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-123',
          }),
        })
      );

      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('conv_1');
      expect(result.data![0].lastMessage).toBeInstanceOf(Date);
    });

    it('should return error on HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse({ error: 'Unauthorized' }, 401)
      );

      const result = await repository.getConversations();

      expect(result.error).toBe('Unauthorized');
      expect(result.data).toBeUndefined();
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

      const result = await repository.getConversations();

      expect(result.error).toBe('Network error. Please check your connection.');
    });
  });

  describe('getConversation', () => {
    it('should fetch a single conversation', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            id: 'conv_1',
            participants: ['user_1', 'user_2'],
            unreadCount: 0,
            lastMessageAt: '2024-01-01T10:00:00Z',
          },
        })
      );

      const result = await repository.getConversation(
        createConversationId('conv_1')
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/conversations/conv_1',
        expect.anything()
      );

      expect(result.data!.id).toBe('conv_1');
      expect(result.data!.lastMessageAt).toBeInstanceOf(Date);
    });

    it('should return error if conversation not found', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse({ error: 'Conversation not found' }, 404)
      );

      const result = await repository.getConversation(
        createConversationId('conv_999')
      );

      expect(result.error).toBe('Conversation not found');
    });
  });

  describe('getOrCreateConversation', () => {
    it('should create or return existing conversation', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            id: 'conv_2',
            participants: ['user_1', 'user_3'],
            unreadCount: 0,
            lastMessageAt: null,
          },
        })
      );

      const result = await repository.getOrCreateConversation(
        createUserId('user_3')
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/conversations/with/user_3',
        expect.objectContaining({
          method: 'POST',
        })
      );

      expect(result.data!.id).toBe('conv_2');
    });

    it('should return error on forbidden access', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse({ error: 'Forbidden' }, 403)
      );

      const result = await repository.getOrCreateConversation(
        createUserId('user_999')
      );

      expect(result.error).toBe('Forbidden');
    });
  });

  describe('updateUnreadCount', () => {
    it('should update unread count', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({
          data: {
            id: 'conv_1',
            participants: ['user_1', 'user_2'],
            unreadCount: 0,
            lastMessageAt: '2024-01-01T10:00:00Z',
          },
        })
      );

      const result = await repository.updateUnreadCount(
        createConversationId('conv_1')
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/conversations/conv_1/unread',
        expect.objectContaining({
          method: 'PATCH',
        })
      );

      expect(result.data!.unreadCount).toBe(0);
    });

    it('should return error if update fails', async () => {
      mockFetch.mockResolvedValueOnce(
        mockErrorResponse({ error: 'Update failed' }, 500)
      );

      const result = await repository.updateUnreadCount(
        createConversationId('conv_1')
      );

      expect(result.error).toBe('Update failed');
    });
  });

  describe('Authentication headers', () => {
    it('should include auth token when available', async () => {
      mockFetch.mockResolvedValueOnce(
        mockResponse({ data: [] })
      );

      await repository.getConversations();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token-123',
          }),
        })
      );
    });

    it('should work without auth token', async () => {
      const repoNoAuth = new ConversationRepository({
        baseURL: 'http://localhost:3001/api',
      });

      mockFetch.mockResolvedValueOnce(
        mockResponse({ data: [] })
      );

      await repoNoAuth.getConversations();

      const headers = mockFetch.mock.calls[0][1]?.headers as Record<string, string>;
      expect(headers.Authorization).toBeUndefined();
    });
  });
});
