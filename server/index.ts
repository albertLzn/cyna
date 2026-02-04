import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import messageRoutes from './routes/messages';
import conversationRoutes from './routes/conversations';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:10000',
    'https://cyna-chat-app.onrender.com',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowHeaders: ['Content-Type', 'Authorization', 'x-mock-user-id']
}));

app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date() }));

app.route('/api', messageRoutes);
app.route('/api', conversationRoutes);

app.onError((err, c) => {
  console.error('[Server Error]', err);
  return c.json({ error: err.message || 'Internal server error' }, 500);
});

const port = parseInt(process.env.PORT || '10000');

const server = createServer((req, res) => {
  let body: any = undefined;

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      body = Buffer.concat(chunks);
      processRequest();
    });
  } else {
    processRequest();
  }

  async function processRequest() {
    try {
      const response = await app.fetch(new Request(`http://${req.headers.host}${req.url}`, {
        method: req.method,
        headers: req.headers as any,
        body: body,
      }));

      res.writeHead(response.status, Object.fromEntries(response.headers));
      const buffer = await response.arrayBuffer();
      res.end(Buffer.from(buffer));
    } catch (err) {
      console.error('Server error:', err);
      res.writeHead(500);
      res.end('Internal Server Error');
    }
  }
});

const wss = new WebSocketServer({ server, path: '/ws' });

const clients = new Map<string, Set<any>>();

wss.on('connection', (ws, req) => {
  const url = new URL(req.url!, `http://${req.headers.host}`);
  const userId = url.searchParams.get('userId');

  if (!userId) {
    ws.close(1008, 'Missing userId');
    return;
  }

  if (!clients.has(userId)) {
    clients.set(userId, new Set());
  }
  clients.get(userId)!.add(ws);

  ws.on('message', (data) => {
    try {
      const event = JSON.parse(data.toString());
      if (event.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
      }
    } catch (err) {
      console.error('[WS] Parse error:', err);
    }
  });

  ws.on('close', () => {
    const userClients = clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        clients.delete(userId);
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});