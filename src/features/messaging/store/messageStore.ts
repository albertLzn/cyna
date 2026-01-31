import { create } from 'zustand';
import type { Message, ConversationId, MessageId } from '../domain/types';
import { MessageService } from '../services/MessageService';
import { MessageRepository } from '../repositories/MessageRepository';
import { LOCAL_URL } from '../domain/constants';

interface MessageState {
  messagesByConversation: Map<ConversationId, Message[]>;
  loading: boolean;
  error: string | null;
  
  loadMessages: (conversationId: ConversationId, cursor?: MessageId) => Promise<void>;
  sendMessage: (conversationId: ConversationId, content: string, files?: any[]) => Promise<void>;
  markAsRead: (messageId: MessageId) => Promise<void>;
  deleteMessage: (messageId: MessageId) => Promise<void>;
  retryFailed: (messageId: MessageId) => Promise<void>;
  
  getMessages: (conversationId: ConversationId) => Message[];
  clearError: () => void;
}

// Initialize service
const repository = new MessageRepository({
  baseURL: process.env.NEXT_PUBLIC_API_URL ||  LOCAL_URL,
  getAuthToken: () => localStorage.getItem('auth_token'),
});

const messageService = new MessageService(repository);

export const useMessageStore = create<MessageState>((set, get) => ({
  messagesByConversation: new Map(),
  loading: false,
  error: null,

  loadMessages: async (conversationId, cursor) => {
    set({ loading: true, error: null });
    
    try {
      const result = await messageService.getMessages({
        conversationId,
        cursor,
        limit: 50,
      });
      
      set((state) => {
        const updated = new Map(state.messagesByConversation);
        const existing = updated.get(conversationId) || [];
        const merged = cursor 
          ? [...existing, ...result.data]
          : result.data;
        
        updated.set(conversationId, merged);
        
        return { messagesByConversation: updated, loading: false };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to load messages', loading: false });
    }
  },

  sendMessage: async (conversationId, content, files = []) => {
    set({ loading: true, error: null });
    
    try {
      const message = await messageService.sendMessage({
        conversationId,
        content,
        files,
      });
      
      set((state) => {
        const updated = new Map(state.messagesByConversation);
        const existing = updated.get(conversationId) || [];
        updated.set(conversationId, [message, ...existing]);
        
        return { messagesByConversation: updated, loading: false };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send message', loading: false });
    }
  },

  markAsRead: async (messageId) => {
    try {
      await messageService.markAsRead(messageId);
      
      // Update local state
      set((state) => {
        const updated = new Map(state.messagesByConversation);
        
        updated.forEach((messages, convId) => {
          const index = messages.findIndex((m) => m.id === messageId);
          if (index !== -1) {
            const updatedMessages = [...messages];
            updatedMessages[index] = {
              ...updatedMessages[index],
              status: 'read' as any,
              readAt: new Date(),
            };
            updated.set(convId, updatedMessages);
          }
        });
        
        return { messagesByConversation: updated };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to mark as read' });
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await messageService.deleteMessage(messageId);
      
      set((state) => {
        const updated = new Map(state.messagesByConversation);
        
        updated.forEach((messages, convId) => {
          const index = messages.findIndex((m) => m.id === messageId);
          if (index !== -1) {
            const updatedMessages = [...messages];
            updatedMessages[index] = {
              ...updatedMessages[index],
              deletedAt: new Date(),
            };
            updated.set(convId, updatedMessages);
          }
        });
        
        return { messagesByConversation: updated };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete message' });
    }
  },

  retryFailed: async (messageId) => {
    try {
      await messageService.retryFailedMessage(messageId);
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Retry failed' });
    }
  },

  getMessages: (conversationId) => {
    return get().messagesByConversation.get(conversationId) || [];
  },

  clearError: () => set({ error: null }),
}));
