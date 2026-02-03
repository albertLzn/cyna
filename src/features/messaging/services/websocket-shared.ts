import { WebSocketService } from './WebsocketService';
import { createUserId } from '../domain/types';

let wsInstance: WebSocketService | null = null;
let isConnecting = false;

export function getWebSocketService(): WebSocketService {
  if (!wsInstance) {
    wsInstance = new WebSocketService();
    
    if (!isConnecting) {
      isConnecting = true;
      
      wsInstance.connect(createUserId('user1'))
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