import { useEffect } from 'react';
import { useMessageStore } from '../store/messageStore';
import type { ConversationId } from '../domain/types';

export function useMessages(conversationId: ConversationId) {
  const {
    getMessages,
    loadMessages,
    sendMessage,
    markAsRead,
    deleteMessage,
    retryFailed,
    loading,
    error,
    clearError,
  } = useMessageStore();

  const messages = getMessages(conversationId);

  // Auto-load messages on mount
  useEffect(() => {
    loadMessages(conversationId);
  }, [conversationId]);

  return {
    messages,
    loading,
    error,
    sendMessage: (content: string, files?: any[]) => sendMessage(conversationId, content, files),
    markAsRead,
    deleteMessage,
    retryFailed,
    loadMore: () => {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg) loadMessages(conversationId, lastMsg.id);
    },
    clearError,
  };
}