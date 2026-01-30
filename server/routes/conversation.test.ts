import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import app from './conversations';
import { db } from '../db/client';

jest.mock('../db/client', () => ({
  db: {
    query: jest.fn(),
  },
}));

const mockDb = db as jest.Mocked<typeof db>;

describe('Conversation Routes', () => {
  beforeEach(() => {
    mockDb.query.mockClear();
  });

  describe('GET /conversations', () => {
    it('should return all conversations for user', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'conv1',
            participants: [
              { id: 'user1', name: 'Alice', avatar: null, presence_status: 'online' },
              { id: 'user2', name: 'Bob', avatar: null, presence_status: 'offline' },
            ],
            last_message: { id: 'msg_1', content: 'Hello' },
            unread_count: 2,
            created_at: new Date(),
            updated_at: new Date(),
          },
        ],
      });

      const res = await app.request('/conversations');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data).toHaveLength(1);
      expect(json.data[0].participants).toHaveLength(2);
    });

    it('should return empty array if no conversations', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await app.request('/conversations');
      const json = await res.json();

      expect(json.data).toEqual([]);
    });
  });


  describe('GET /conversations/:id', () => {
    it('should return conversation by ID', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ user_id: 'user1' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'conv_1',
              participants: [{ id: 'user1', name: 'Alice' }],
              last_message: null,
              unread_count: 0,
            },
          ],
        });

      const res = await app.request('/conversations/conv_1');
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.id).toBe('conv_1');
    });

    it('should return 403 if user not participant', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const res = await app.request('/conversations/conv_1');
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe('Forbidden');
    });

    it('should return 404 if conversation not found', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ user_id: 'user1' }] })
        .mockResolvedValueOnce({ rows: [] }); 

      const res = await app.request('/conversations/conv_999');
      const json = await res.json();

      expect(res.status).toBe(404);
    });
  });

  describe('POST /conversations/with/:userId', () => {
    it('should return existing conversation if already exists', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [{ id: 'conv_existing' }] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'conv_existing',
              participants: [{ id: 'user1' }, { id: 'user2' }],
            },
          ],
        });

      const res = await app.request('/conversations/with/user2', { method: 'POST' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.id).toBe('conv_existing');
    });

    it('should create new conversation if does not exist', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'conv_new' }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'conv_new',
              participants: [{ id: 'user1' }, { id: 'user3' }],
            },
          ],
        });

      const res = await app.request('/conversations/with/user3', { method: 'POST' });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.data.id).toBe('conv_new');
    });

    it('should return 400 if trying to create conversation with self', async () => {
      const res = await app.request('/conversations/with/user1', { method: 'POST' });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toContain('yourself');
    });
  });


  describe('PATCH /conversations/:id/unread', () => {
    it('should reset unread count to 0', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'conv_1',
              unread_count: 0,
            },
          ],
        });

      const res = await app.request('/conversations/conv_1/unread', { method: 'PATCH' });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.unread_count).toBe(0);
    });

    it('should call UPDATE query with correct params', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ id: 'conv_1', unread_count: 0 }] });

      await app.request('/conversations/conv_1/unread', { method: 'PATCH' });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversation_participants'),
        expect.arrayContaining(['conv_1', 'user1'])
      );
    });
  });
});