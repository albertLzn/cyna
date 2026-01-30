import { Hono } from 'hono';
import { db } from '../db/client';
import { extractUserId } from '../utils/helpers';

const app = new Hono();

app.get('/conversations', async (c) => {
  const userId = extractUserId(c);

  const result = await db.query(
    `SELECT 
      c.id,
      c.created_at,
      c.updated_at,
      json_agg(
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar', u.avatar,
          'presence_status', u.presence_status,
          'last_seen_at', u.last_seen_at
        )
      ) FILTER (WHERE u.id IS NOT NULL) as participants,
      (
        SELECT json_build_object(
          'id', m.id,
          'conversation_id', m.conversation_id,
          'sender_id', m.sender_id,
          'content', m.content,
          'files', m.files,
          'status', m.status,
          'created_at', m.created_at,
          'updated_at', m.updated_at,
          'read_at', m.read_at,
          'deleted_at', m.deleted_at
        )
        FROM messages m
        WHERE m.id = c.last_message_id
      ) as last_message,
      COALESCE(cp.unread_count, 0) as unread_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    JOIN users u ON cp2.user_id = u.id
    WHERE cp.user_id = $1
    GROUP BY c.id, c.created_at, c.updated_at, cp.unread_count
    ORDER BY c.updated_at DESC`,
    [userId]
  );

  return c.json({ data: result.rows });
});

app.get('/conversations/:id', async (c) => {
  const conversationId = c.req.param('id');
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
    `SELECT 
      c.id,
      c.created_at,
      c.updated_at,
      json_agg(
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar', u.avatar,
          'presence_status', u.presence_status,
          'last_seen_at', u.last_seen_at
        )
      ) FILTER (WHERE u.id IS NOT NULL) as participants,
      (
        SELECT json_build_object(
          'id', m.id,
          'conversation_id', m.conversation_id,
          'sender_id', m.sender_id,
          'content', m.content,
          'files', m.files,
          'status', m.status,
          'created_at', m.created_at,
          'updated_at', m.updated_at,
          'read_at', m.read_at,
          'deleted_at', m.deleted_at
        )
        FROM messages m
        WHERE m.id = c.last_message_id
      ) as last_message,
      COALESCE(cp.unread_count, 0) as unread_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id AND cp.user_id = $2
    JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
    JOIN users u ON cp2.user_id = u.id
    WHERE c.id = $1
    GROUP BY c.id, c.created_at, c.updated_at, cp.unread_count`,
    [conversationId, userId]
  );

  if (result.rows.length === 0) {
    return c.json({ error: 'Conversation not found' }, 404);
  }

  return c.json({ data: result.rows[0] });
});

app.post('/conversations/with/:userId', async (c) => {
  const participantId = c.req.param('userId');
  const currentUserId = extractUserId(c);

  if (participantId === currentUserId) {
    return c.json({ error: 'Cannot create conversation with yourself' }, 400);
  }

  const existing = await db.query(
    `SELECT c.id
     FROM conversations c
     JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
     JOIN conversation_participants cp2 ON c.id = cp2.conversation_id
     WHERE cp1.user_id = $1 AND cp2.user_id = $2
     LIMIT 1`,
    [currentUserId, participantId]
  );

  let conversationId: string;

  if (existing.rows.length > 0) {
    conversationId = existing.rows[0].id;
  } else {
    const newConv = await db.query(
      `INSERT INTO conversations (id, created_at, updated_at)
       VALUES ($1, NOW(), NOW())
       RETURNING id`,
      [`conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`]
    );

    conversationId = newConv.rows[0].id;

    await db.query(
      `INSERT INTO conversation_participants (conversation_id, user_id, unread_count)
       VALUES ($1, $2, 0), ($1, $3, 0)`,
      [conversationId, currentUserId, participantId]
    );
  }

  const result = await db.query(
    `SELECT 
      c.id,
      c.created_at,
      c.updated_at,
      json_agg(
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar', u.avatar,
          'presence_status', u.presence_status,
          'last_seen_at', u.last_seen_at
        )
      ) FILTER (WHERE u.id IS NOT NULL) as participants,
      NULL as last_message,
      0 as unread_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    JOIN users u ON cp.user_id = u.id
    WHERE c.id = $1
    GROUP BY c.id`,
    [conversationId]
  );

  return c.json({ data: result.rows[0] }, existing.rows.length > 0 ? 200 : 201);
});

app.patch('/conversations/:id/unread', async (c) => {
  const conversationId = c.req.param('id');
  const userId = extractUserId(c);

  await db.query(
    `UPDATE conversation_participants
     SET unread_count = 0
     WHERE conversation_id = $1 AND user_id = $2`,
    [conversationId, userId]
  );

  const result = await db.query(
    `SELECT 
      c.id,
      c.created_at,
      c.updated_at,
      json_agg(
        json_build_object(
          'id', u.id,
          'name', u.name,
          'avatar', u.avatar,
          'presence_status', u.presence_status,
          'last_seen_at', u.last_seen_at
        )
      ) FILTER (WHERE u.id IS NOT NULL) as participants,
      (
        SELECT json_build_object(
          'id', m.id,
          'conversation_id', m.conversation_id,
          'sender_id', m.sender_id,
          'content', m.content,
          'files', m.files,
          'status', m.status,
          'created_at', m.created_at,
          'updated_at', m.updated_at,
          'read_at', m.read_at,
          'deleted_at', m.deleted_at
        )
        FROM messages m
        WHERE m.id = c.last_message_id
      ) as last_message,
      0 as unread_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    JOIN users u ON cp.user_id = u.id
    WHERE c.id = $1
    GROUP BY c.id`,
    [conversationId]
  );

  return c.json({ data: result.rows[0] });
});



export default app;