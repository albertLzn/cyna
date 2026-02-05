
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

  // Connection state
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  // Reconnection logic
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private userId: UserId | null = null;
  // Event listeners
  private listeners = new Map<string, Set<EventCallback<any>>>();
  private connected = false;

  constructor(config: WebSocketConfig = {}) {
    const isProd = process.env.NODE_ENV === 'production';
    this.config = {
      // Refacto l url API_URL dans local.env et supprimer /api pour accès généralisé.
      url: isProd
        ? 'wss://cyna-backend.onrender.com/ws'
        : 'ws://localhost:10000/ws',
      reconnectInterval: config.reconnectInterval ?? WS_CONSTANTS.THROTTLE,
      maxReconnectAttempts: config.maxReconnectAttempts ?? WS_CONSTANTS.RECONNECT_MAX_ATTEMPTS,
      heartbeatInterval: config.heartbeatInterval ?? WS_CONSTANTS.HEARTBEAT_INTERVAL,
    };
  }
  // Establish WebSocket connection with userId in query params
  async connect(userId: UserId): Promise<void> {
    this.userId = userId;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(`${this.config.url}?userId=${userId}`);

        this.ws.onopen = () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onerror = (error) => {
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onclose = () => {
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
  // Send JSON event to server

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

  private handleMessage(data: string): void {
    try {
      const event = JSON.parse(data) as WebSocketEvent;
      const listeners = this.listeners.get(event.type);
      if (listeners) {
        listeners.forEach((callback) => callback(event as any));
      }
    } catch (error) {
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      return;
    }

    if (!this.userId) {
      return;
    }

    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect(this.userId!).catch((error) => {
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
  // Send ping to keep connection alive
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