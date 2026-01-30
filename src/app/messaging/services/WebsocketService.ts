
import type { IWebSocketService } from '../domain/interfaces';
import type { WebSocketEvent, UserId } from '../domain/types';
import { WebSocketNotConnectedError } from '../domain/interfaces';
import { WS_CONSTANTS } from '../domain/constants';

interface WebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
}

type EventCallback<T extends WebSocketEvent['type']> = (
  event: Extract<WebSocketEvent, { type: T }>
) => void;

export class WebSocketService implements IWebSocketService {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private userId: UserId | null = null;
  private listeners = new Map<string, Set<EventCallback<any>>>();
  private connected = false;

  constructor(config: WebSocketConfig = {}) {
    this.config = {
      url: config.url || 'ws://localhost:3001/ws',
      reconnectInterval: config.reconnectInterval ?? WS_CONSTANTS.THROTTLE,
      maxReconnectAttempts: config.maxReconnectAttempts ?? WS_CONSTANTS.RECONNECT_MAX_ATTEMPTS,
      heartbeatInterval: config.heartbeatInterval ?? WS_CONSTANTS.HEARTBEAT_INTERVAL,
    };
  }

  async connect(userId: UserId): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected');
      return;
    }

    this.userId = userId;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.config.url}?userId=${userId}`);

        this.ws.onopen = () => {
          console.log('[WS] Connected');
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          console.error('[WS] Error:', error);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
          console.log('[WS] Disconnected');
          this.connected = false;
          this.stopHeartbeat();
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.stopReconnect();
    this.stopHeartbeat();

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.userId = null;
  }

  send(event: WebSocketEvent): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new WebSocketNotConnectedError();
    }

    this.ws.send(JSON.stringify(event));
  }

  subscribe<T extends WebSocketEvent['type']>(
    eventType: T,
    callback: EventCallback<T>
  ): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    const listeners = this.listeners.get(eventType)!;
    listeners.add(callback);

    return () => {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    };
  }

  isConnected(): boolean {
    return this.connected && this.ws?.readyState === WebSocket.OPEN;
  }

  // To Do Move to helpers
  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as WebSocketEvent;

      const listeners = this.listeners.get(event.type);
      if (listeners) {
        listeners.forEach((callback) => callback(event as any));
      }
    } catch (error) {
      console.error('[WS] Failed to parse message:', error);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('[WS] Max reconnect attempts reached');
      return;
    }

    if (!this.userId) {
      console.error('[WS] Cannot reconnect: no userId');
      return;
    }

    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.userId!).catch((error) => {
        console.error('[WS] Reconnect failed:', error);
      });
    }, delay);
  }

  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = 0;
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}