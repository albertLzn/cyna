import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import messageRoutes from './routes/messages';
import conversationRoutes from './routes/conversations';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://cyna-chat-app.onrender.com',
  ],
  credentials: true,
}));

app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date() })
);

app.route('/api', messageRoutes);
app.route('/api', conversationRoutes);

app.onError((err, c) => {
  console.error('[Server Error]', err);
  return c.json(
    { error: err.message || 'Internal server error' },
    500
  );
});

Bun.serve({
  port: parseInt(process.env.PORT || '3001'),
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws') {
      const userId = url.searchParams.get('userId');

      if (!userId) {
        return new Response('Missing userId', { status: 400 });
      }

      const upgraded = server.upgrade(req, {
        data: { userId },
      } as any);

      if (upgraded) return;
    }

    return app.fetch(req, { server });
  },
  websocket: require('./websocket/handler').wsHandler,
});

console.log('Server OK');
