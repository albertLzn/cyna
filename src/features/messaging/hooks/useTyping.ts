import { useEffect, useState, useMemo } from 'react';
import type { ConversationId, User } from '../domain/types';
import { useConversationStore } from '../store/conversationStore';
import { TypingService } from '../services/TypingService';
import { useWebSocketService } from './useWebsocket';
import { createUserId } from '../domain/types';

let typingServiceInstance: TypingService | null = null;

export function useTypingIndicator(conversationId: ConversationId) {
  const wsService = useWebSocketService();
  const { conversations } = useConversationStore();
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  const typingService = useMemo(() => {
    if (!typingServiceInstance) {
      typingServiceInstance = new TypingService(
        wsService,
        createUserId('user1')
      );
    }
    return typingServiceInstance;
  }, [wsService]);

  useEffect(() => {
    const interval = setInterval(() => {
      const userIds = typingService.getTypingUsers(conversationId);
      setTypingUserIds(userIds);
    }, 500);

    return () => clearInterval(interval);
  }, [conversationId, typingService]);

  const conversation = conversations.find((c) => c.id === conversationId);
  const typingUsers: User[] = typingUserIds
    .map((id) => conversation?.participants.find((p) => p.id === id))
    .filter((user): user is User => user !== undefined);

  return {
    typingUsers,
    isTyping: typingUsers.length > 0,
    typingService, // Export pour MessageInput
  };
}