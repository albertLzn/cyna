import { create } from 'zustand';
import type { Conversation, ConversationId, UserId } from '../domain/types';
import { ConversationService } from '../services/ConversationService';
import { ConversationRepository } from '../repositories/ConversationRepository';
import { MessageRepository } from '../repositories/MessageRepository';
import { getWebSocketService } from '../services/websocket-shared';
import { LOCAL_URL } from '../domain/constants';

interface ConversationState {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;

  loadConversations: () => Promise<void>;
  openConversation: (participantId: UserId) => Promise<Conversation>;
  markAsRead: (conversationId: string) => Promise<void>;
  flushNotif: (conversationId: ConversationId) => void;
  clearError: () => void;
}
// Initialize repositories and service

const conversationRepo = new ConversationRepository({
  baseURL: process.env.NEXT_PUBLIC_API_URL || LOCAL_URL,
  getAuthToken: () => localStorage.getItem('auth_token'),
});

const messageRepo = new MessageRepository({
  baseURL: process.env.NEXT_PUBLIC_API_URL || LOCAL_URL,
  getAuthToken: () => localStorage.getItem('auth_token'),
});

const conversationService = new ConversationService(conversationRepo, messageRepo);

let wsInitialized = false;

export const useConversationStore = create<ConversationState>((set, get) => {
  // Setup WebSocket listeners once on mount

  if (typeof window !== 'undefined' && !wsInitialized) {
    wsInitialized = true;

    const wsService = getWebSocketService();

    const setupListeners = async () => {
      try {
        if (!wsService.isConnected()) {
          await new Promise(resolve => setTimeout(resolve, 60));
        }


        wsService.subscribe('message:sent', (event) => {
          const message = event.payload;
          // Update conversation with new lastMessage

          set((state) => {
            const updated = state.conversations.map(conv => {
              if (conv.id === message.conversationId) {
                return {
                  ...conv,
                  lastMessage: message,
                  updatedAt: new Date(),
                };
              }
              return conv;
            });

            updated.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

            return { conversations: updated };
          });
        });

        wsService.subscribe('message:read', (event) => {
          const { loadConversations } = get();
          loadConversations();
        });

        wsService.subscribe('message:deleted', (event) => {
          const { messageId } = event.payload;
          set((state) => {
            const updated = state.conversations.map(conv => {
              if (conv.lastMessage?.id === messageId) {
                return {
                  ...conv,
                  lastMessage: {
                    ...conv.lastMessage,
                    deletedAt: new Date(),
                  },
                };
              }
              return conv;
            });

            return { conversations: updated };
          });
        });


      } catch (err) {
      }
    };

    setupListeners();
  }

  return {
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
          error: error instanceof Error ? error.message : 'Failed to load conv',
          loading: false,
        });
      }
    },

    openConversation: async (participantId) => {
      set({ loading: true, error: null });

      try {
        const conversation = await conversationService.openConversation(participantId);

        set((state) => {
          const exists = state.conversations.find((c) => c.id === conversation.id);

          if (exists) {
            return { loading: false };
          }

          return {
            conversations: [conversation, ...state.conversations],
            loading: false,
          };
        });

        return conversation;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to open conv',
          loading: false,
        });
        throw error;
      }
    },

    flushNotif: (conversationId) => {
      set((state) => ({
        conversations: state.conversations.map((conv) =>
          conv.id === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        ),
      }));
    },

    markAsRead: async (conversationId) => {
      try {
        await conversationService.markConversationAsRead(conversationId as any);

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
  };
});