
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { createUserId } from '../domain/types';
import { WebSocketNotConnectedError } from '../domain/interfaces';
import type { ConversationId, MessageId, WebSocketEvent } from '../domain/types';
import { WebSocketService } from './WebsocketService';

class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  readyState = MockWebSocket.OPEN;

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: unknown) => void) | null = null;
  onclose: (() => void) | null = null;

  send = jest.fn();
  close = jest.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  });

  constructor(public readonly url: string) {}

  simulateOpen() {
    this.readyState = MockWebSocket.OPEN;
    this.onopen?.();
  }

  simulateMessage(event: WebSocketEvent) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }

  simulateError(error: unknown) {
    this.onerror?.(error);
  }

  simulateClose() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }
}

(global as any).WebSocket = MockWebSocket;

describe('WebSocketService', () => {
  let service: WebSocketService;
  let ws: MockWebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();

    service = new WebSocketService({
      url: 'ws://localhost:3001/ws',
      reconnectInterval: 100,
      maxReconnectAttempts: 3,
      heartbeatInterval: 1000,
    });
  });

  afterEach(() => {
    service.disconnect();
    jest.useRealTimers();
  });


  describe('connect', () => {
    it('connects successfully', async () => {
      const promise = service.connect(createUserId('user1'));

      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();

      await promise;

      expect(service.isConnected()).toBe(true);
    });

    it('does nothing if already connected', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      const existingWs = (service as any).ws;

      await service.connect(createUserId('user1'));

      expect((service as any).ws).toBe(existingWs);
    });

    it('rejects on connection error', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;

      ws.simulateError(new Error('boom'));

      await expect(promise).rejects.toThrow('WebSocket connection failed');
    });
  });

  describe('disconnect', () => {
    it('closes websocket and resets state', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      service.disconnect();

      expect(ws.close).toHaveBeenCalled();
      expect(service.isConnected()).toBe(false);
    });
  });


  describe('send', () => {
    it('sends event when connected', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      const event: WebSocketEvent = {
        type: 'user:typing',
        payload: {
          userId: createUserId('user1'),
          conversationId: 'conv_1' as any,
          isTyping: true,
        },
      };

      service.send(event);

      expect(ws.send).toHaveBeenCalledWith(JSON.stringify(event));
    });

    it('throws if not connected', () => {
      expect(() =>
        service.send({
          type: 'user:typing',
          payload: {
            userId: createUserId('user1'),
            conversationId: 'conv_1' as any,
            isTyping: true,
          },
        })
      ).toThrow(WebSocketNotConnectedError);
    });
  });

  describe('subscribe', () => {
    it('dispatches subscribed events', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      const callback = jest.fn();

      service.subscribe('message:sent', callback);

      ws.simulateMessage({
        type: 'message:sent',
        payload: { id: 'msg_1' as MessageId, content: 'Hello' },
      });

      expect(callback).toHaveBeenCalledWith({
        type: 'message:sent',
        payload: { id: 'msg_1', content: 'Hello' },
      });
    });

    it('unsubscribes correctly', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      const callback = jest.fn();
      const unsubscribe = service.subscribe('message:sent', callback);

      unsubscribe();

      ws.simulateMessage({
        type: 'message:sent',
        payload: { id: 'msg_1' },
      });

      expect(callback).not.toHaveBeenCalled();
    });

    it('supports multiple subscribers', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      const cb1 = jest.fn();
      const cb2 = jest.fn();

      service.subscribe('message:sent', cb1);
      service.subscribe('message:sent', cb2);

      ws.simulateMessage({
        type: 'message:sent',
        payload: { id: 'msg_1' as ConversationId},
      });

      expect(cb1).toHaveBeenCalled();
      expect(cb2).toHaveBeenCalled();
    });
  });

  describe('reconnect', () => {
    it('attempts reconnect on close', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      ws.simulateClose();

      jest.advanceTimersByTime(100);

      expect((service as any).reconnectAttempts).toBe(1);
    });

    it('stops after max reconnect attempts', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      ws.simulateClose();

      jest.advanceTimersByTime(2000);

      expect((service as any).reconnectAttempts)
        .toBeLessThanOrEqual(3);
    });
  });

  describe('isConnected', () => {
    it('returns true when connected', async () => {
      const promise = service.connect(createUserId('user1'));
      ws = (service as any).ws as MockWebSocket;
      ws.simulateOpen();
      await promise;

      expect(service.isConnected()).toBe(true);
    });

    it('returns false when disconnected', () => {
      expect(service.isConnected()).toBe(false);
    });
  });
});
