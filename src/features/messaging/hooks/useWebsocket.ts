
// src/features/messaging/hooks/useWebSocketService.ts

import { useEffect, useMemo } from 'react';
import { WebSocketService } from '../services/WebsocketService';
import { createUserId } from '../domain/types';
import { MESSAGE_SERVICE_CONSTANTS } from '../domain/constants';

let wsServiceInstance: WebSocketService | null = null;

export function useWebSocketService(): WebSocketService {
  const service = useMemo(() => {
    if (!wsServiceInstance) {
      wsServiceInstance = new WebSocketService();
    }
    return wsServiceInstance;
  }, []);

  useEffect(() => {
    // Auto-connect on mount
    if (!service.isConnected()) {
      service.connect(createUserId(MESSAGE_SERVICE_CONSTANTS.MOCK_CURRENT_USER_ID)).catch((err) => {
        console.error('[WS] Connection failed:', err);
      });
    }

    return () => {
      // Don't disconnect on unmount (keep alive for other components)
    };
  }, [service]);

  return service;
}