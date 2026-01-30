import { useEffect } from 'react';
import { useConversationStore } from '../store/conversationStore';

export function useConversations() {
  const {
    conversations,
    loading,
    error,
    loadConversations,
    openConversation,
    markAsRead,
    clearError,
  } = useConversationStore();

  useEffect(() => {
    loadConversations();
  }, []);

  return {
    conversations,
    loading,
    error,
    openConversation,
    markAsRead,
    refresh: loadConversations,
    clearError,
  };
}