import { WebSocketService } from './WebsocketService';
import { createUserId } from '../domain/types';
import { MESSAGE_SERVICE_CONSTANTS } from '../domain/constants';

let wsInstance: WebSocketService | null = null;
let isConnecting = false;

export function getWebSocketService(): WebSocketService {
  if (!wsInstance) {
    wsInstance = new WebSocketService();
    
    if (!isConnecting) {
      isConnecting = true;
      
      wsInstance.connect(createUserId(MESSAGE_SERVICE_CONSTANTS.MOCK_CURRENT_USER_ID))
        .then(() => {
          isConnecting = false;
        })
        .catch(err => {
          isConnecting = false;
        });
    }
  }
  
  return wsInstance;
}