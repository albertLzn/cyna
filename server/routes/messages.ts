import { Hono } from 'hono';
import { db } from '../db/client';
import { z } from 'zod';
import { broadcastWSEvent, extractUserId } from '../utils/helpers';

const app = new Hono();

const createMessageSchema = z.object({
  conversationId: z.string().min(1),
  content: z.string().nullable(),
  files: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    size: z.number(),
    url: z.string(),
  })).optional(),
}).refine(
  (data) => data.content || (data.files && data.files.length > 0),
  { message: 'content or files required' }
);

const updateStatusSchema = z.object({
  status: z.enum(['sending', 'sent', 'delivered', 'read', 'failed']),
});

app.get('/messages', async (c) => {
  const conversationId = c.req.query('conversationId');
  const limit = parseInt(c.req.query('limit') || '50');
  const cursor = c.req.query('cursor');

  if (!conversationId) {
    return c.json({ error: 'conversationId is required' }, 400);
  }

  // Extract userId from JWT (mock for now)
  const userId = extractUserId(c);

  // Check if participant
  const isParticipant = await db.query(
    `SELECT 1 FROM conversation_participants 
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (isParticipant.rows.length === 0) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  let query = `
    SELECT * FROM messages
    WHERE conversation_id = $1 
    AND deleted_at IS NULL
  `;
  const params: any[] = [conversationId];

  if (cursor) {
    query += ` AND id < $${params.length + 1}`;
    params.push(cursor);
  }

  query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
  params.push(limit + 1); // Fetch one extra to check hasMore

  const result = await db.query(query, params);
  const messages = result.rows;

  const hasMore = messages.length > limit;
  const data = hasMore ? messages.slice(0, limit) : messages;
  const nextCursor = hasMore ? data[data.length - 1].id : null;

  return c.json({
    data,
    nextCursor,
    hasMore,
  });
});

app.post('/messages', async (c) => {
  const body = await c.req.json();
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Validate payload
  const parsed = createMessageSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors[0].message }, 400);
  }

  const { conversationId, content, files } = parsed.data;
  const userId = extractUserId(c);

  // Check user is participant
  const isParticipant = await db.query(
    `SELECT 1 FROM conversation_participants 
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (isParticipant.rows.length === 0) {
    return c.json({ error: 'Forbidden' }, 403);
  }

const result = await db.query(
  `INSERT INTO messages (id, conversation_id, sender_id, content, files, status, created_at, updated_at)
   VALUES ($1, $2, $3, $4, $5, 'sent', NOW(), NOW())
   RETURNING *`,
  [messageId, conversationId, userId, content, JSON.stringify(files || [])]
);
  const message = result.rows[0];

  // Update conversation lastMessage
  await db.query(
    `UPDATE conversations 
     SET last_message_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [message.id, conversationId]
  );

  // Broadcast WebSocket event (mock for now)
  broadcastWSEvent({
    type: 'message:sent',
    payload: message,
  });

  return c.json({ data: message }, 201);
});

app.patch('/messages/:id/status', async (c) => {
  const messageId = c.req.param('id');
  const body = await c.req.json();

  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: 'Invalid status' }, 400);
  }

  const { status } = parsed.data;
  const userId = extractUserId(c);

  // Check message exists and user is participant
  const check = await db.query(
    `SELECT m.*, cp.user_id 
     FROM messages m
     JOIN conversation_participants cp ON m.conversation_id = cp.conversation_id
     WHERE m.id = $1 AND cp.user_id = $2`,
    [messageId, userId]
  );

  if (check.rows.length === 0) {
    return c.json({ error: 'Message not found' }, 404);
  }

  // Update status
  const readAt = status === 'read' ? 'NOW()' : 'NULL';
  const result = await db.query(
    `UPDATE messages 
     SET status = $1, read_at = ${readAt}, updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [status, messageId]
  );

  const message = result.rows[0];

  // Spread ws event
  if (status === 'read') {
    broadcastWSEvent({
      type: 'message:read',
      payload: { messageId, readAt: message.read_at },
    });
  }

  return c.json({ data: message });
});


app.delete('/messages/:id', async (c) => {
  const messageId = c.req.param('id');
  const userId = extractUserId(c);

  // Check if sender
  const check = await db.query(
    `SELECT * FROM messages WHERE id = $1 AND sender_id = $2`,
    [messageId, userId]
  );

  if (check.rows.length === 0) {
    return c.json({ error: 'Only sender can delete message' }, 403);
  }

  const result = await db.query(
    `UPDATE messages 
     SET deleted_at = NOW(), updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [messageId]
  );

  const message = result.rows[0];

  broadcastWSEvent({
    type: 'message:deleted',
    payload: { messageId, deletedAt: message.deleted_at },
  });

  return c.json({ data: message });
});

app.post('/conversations/:id/mark-read', async (c) => {
  const conversationId = c.req.param('id');
  const userId = extractUserId(c);
  const isParticipant = await db.query(
    `SELECT 1 FROM conversation_participants 
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  if (isParticipant.rows.length === 0) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const result = await db.query(
    `UPDATE messages 
     SET status = 'read', read_at = NOW(), updated_at = NOW()
     WHERE conversation_id = $1 
     AND sender_id != $2
     AND status != 'read'
     RETURNING id`,
    [conversationId, userId]
  );

  const messageIds = result.rows.map((row) => row.id);

  await db.query(
    `UPDATE conversations 
     SET unread_count = 0
     WHERE id = $1`,
    [conversationId]
  );

  messageIds.forEach((msgId) => {
    broadcastWSEvent({
      type: 'message:read',
      payload: { messageId: msgId, readAt: new Date() },
    });
  });

  return c.json({ data: messageIds });
});

export default app;