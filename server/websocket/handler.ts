
import type { ServerWebSocket } from 'bun';

interface WebSocketData {
  userId: string;
}

const clients = new Map<string, Set<ServerWebSocket<WebSocketData>>>();

export const wsHandler = {

  open(ws: ServerWebSocket<WebSocketData>) {
    const { userId } = ws.data;
    
    if (!clients.has(userId)) {
      clients.set(userId, new Set());
    }
    
    clients.get(userId)!.add(ws);
    
    console.log(`[WS] User ${userId} connected (${clients.get(userId)!.size} devices)`);
    
    // Broadcast presence update
    broadcast({
      type: 'user:presence',
      payload: {
        userId,
        status: 'online',
        lastSeenAt: null,
      },
    });
  },


  message(ws: ServerWebSocket<WebSocketData>, message: string) {
    try {
      const event = JSON.parse(message);
      
      //  ping/pong
      if (event.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }
      
      // typing event
      if (event.type === 'user:typing') {
        broadcastToConversation(event.payload.conversationId, event, ws.data.userId);
        return;
      }
      
      console.log('[WS] Received:', event.type, event.payload);
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  },
  close(ws: ServerWebSocket<WebSocketData>) {
    const { userId } = ws.data;
    
    const userClients = clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      
      if (userClients.size === 0) {
        clients.delete(userId);
        
        // Broadcast offline status
        broadcast({
          type: 'user:presence',
          payload: {
            userId,
            status: 'offline',
            lastSeenAt: new Date(),
          },
        });
      }
    }
    
    console.log(`[WS] User ${userId} disconnected`);
  },
};

export function broadcast(event: any, excludeUserId?: string) {
  const message = JSON.stringify(event);
  
  clients.forEach((userClients, userId) => {
    if (userId === excludeUserId) return;
    
    userClients.forEach((ws) => {
      ws.send(message);
    });
  });
}

export function broadcastToUser(userId: string, event: any) {
  const userClients = clients.get(userId);
  if (!userClients) return;
  
  const message = JSON.stringify(event);
  userClients.forEach((ws) => {
    ws.send(message);
  });
}

export function broadcastToConversation(conversationId: string, event: any, excludeUserId?: string) {
  // Mock: broadcast to all for now
  broadcast(event, excludeUserId);
}