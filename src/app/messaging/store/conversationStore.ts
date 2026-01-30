import { create } from 'zustand';
import type { Conversation, UserId } from '../domain/types';
import { ConversationService } from '../services/ConversationService';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { LOCAL_URL } from '../domain/constants';

interface ConversationState {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
  
  loadConversations: () => Promise<void>;
  openConversation: (participantId: UserId) => Promise<Conversation>;
  markAsRead: (conversationId: string) => Promise<void>;
  clearError: () => void;
}

// Initialize services
const conversationRepo = new ConversationRepository({
  baseURL: process.env.NEXT_PUBLIC_API_URL || LOCAL_URL,
  getAuthToken: () => localStorage.getItem('auth_token'),
});

const messageRepo = new MessageRepository({
  baseURL: process.env.NEXT_PUBLIC_API_URL || LOCAL_URL,
  getAuthToken: () => localStorage.getItem('auth_token'),
});

const conversationService = new ConversationService(conversationRepo, messageRepo);

export const useConversationStore = create<ConversationState>((set) => ({
  conversations: [],
  loading: false,
  error: null,

  loadConversations: async () => {
    set({ loading: true, error: null });
    
    try {
      const conversations = await conversationService.getConversations();
      set({ conversations, loading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load conversations',
        loading: false,
      });
    }
  },

  openConversation: async (participantId) => {
    set({ loading: true, error: null });
    
    try {
      const conversation = await conversationService.openConversation(participantId);
      
      // Add to list if new
      set((state) => {
        const exists = state.conversations.find((c) => c.id === conversation.id);
        if (exists) return { loading: false };
        
        return {
          conversations: [conversation, ...state.conversations],
          loading: false,
        };
      });
      
      return conversation;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to open conversation',
        loading: false,
      });
      throw error;
    }
  },

  markAsRead: async (conversationId) => {
    try {
      await conversationService.markConversationAsRead(conversationId as any);
      
      // Update unread count local
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to mark as read',
      });
    }
  },

  clearError: () => set({ error: null }),
}));
