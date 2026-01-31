import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessagesPage from './page';
import { useConversationStore } from '@/features/messaging/store/conversationStore';
import { useMessageStore } from '@/features/messaging/store/messageStore';
import type { Conversation } from '@/features/messaging/domain/types';
import { createConversationId, createUserId, createMessageId, MessageStatus, PresenceStatus } from '@/features/messaging/domain/types';

jest.mock('@/features/messaging/store/conversationStore');
jest.mock('@/features/messaging/store/messageStore');

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, className, ...props }: any) => (
    <button onClick={onClick} className={className} {...props}>
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, className }: any) => <span className={className}>{children}</span>,
}));

jest.mock('@/features/messaging/components/ConversationList', () => ({
  ConversationList: ({ conversations, selectedId, onSelect }: any) => (
    <div data-testid="conversation-list">
      {conversations.map((conv: any) => (
        <button
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          data-testid={`conv-${conv.id}`}
          aria-label={conv.participants[0]?.name}
        >
          {conv.participants[0]?.name}
        </button>
      ))}
    </div>
  ),
}));

jest.mock('@/features/messaging/components/MessageList', () => ({
  MessageList: ({ conversationId }: any) => (
    <div data-testid="message-list">Messages for {conversationId}</div>
  ),
}));

jest.mock('@/features/messaging/components/MessageInput', () => ({
  MessageInput: ({ conversationId }: any) => (
    <div data-testid="message-input">Input for {conversationId}</div>
  ),
}));

const mockConversations: Conversation[] = [
  {
    id: createConversationId('conv_1'),
    participants: [
      {
        id: createUserId('user_2'),
        name: 'Alice Johnson',
        avatar: 'https://i.pravatar.cc/150?u=alice',
        presenceStatus: PresenceStatus.ONLINE,
        lastSeenAt: null,
      },
    ],
    lastMessage: {
      id: createMessageId('msg_1'),
      conversationId: createConversationId('conv_1'),
      senderId: createUserId('user_2'),
      content: 'Hey, how are you?',
      files: [],
      status: MessageStatus.READ,
      createdAt: new Date('2024-01-30T10:00:00Z'),
      updatedAt: new Date('2024-01-30T10:00:00Z'),
      readAt: new Date('2024-01-30T10:05:00Z'),
      deletedAt: null,
    },
    unreadCount: 2,
    createdAt: new Date('2024-01-29T10:00:00Z'),
    updatedAt: new Date('2024-01-30T10:00:00Z'),
  },
  {
    id: createConversationId('conv_2'),
    participants: [
      {
        id: createUserId('user_3'),
        name: 'Bob Smith',
        avatar: 'https://i.pravatar.cc/150?u=bob',
        presenceStatus: PresenceStatus.OFFLINE,
        lastSeenAt: new Date('2024-01-30T08:00:00Z'),
      },
    ],
    lastMessage: {
      id: createMessageId('msg_2'),
      conversationId: createConversationId('conv_2'),
      senderId: createUserId('user_1'),
      content: 'See you tomorrow!',
      files: [],
      status: MessageStatus.READ,
      createdAt: new Date('2024-01-29T15:00:00Z'),
      updatedAt: new Date('2024-01-29T15:00:00Z'),
      readAt: null,
      deletedAt: null,
    },
    unreadCount: 0,
    createdAt: new Date('2024-01-28T10:00:00Z'),
    updatedAt: new Date('2024-01-29T15:00:00Z'),
  },
];

describe('MessagesPage', () => {
  const mockLoadConversations = jest.fn();
  const mockClearError = jest.fn();
  const mockOpenConversation = jest.fn();
  const mockMarkAsRead = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useConversationStore as unknown as jest.Mock).mockReturnValue({
      conversations: mockConversations,
      loading: false,
      error: null,
      loadConversations: mockLoadConversations,
      clearError: mockClearError,
      openConversation: mockOpenConversation,
      markAsRead: mockMarkAsRead,
    });

    (useMessageStore as unknown as jest.Mock).mockReturnValue({
      messagesByConversation: new Map(),
      loading: false,
      error: null,
      sendMessage: jest.fn(),
    });
  });

  describe('Initial Load', () => {
    it('should call loadConversations on mount', () => {
      render(<MessagesPage />);
      expect(mockLoadConversations).toHaveBeenCalledTimes(1);
    });

    it('should auto-select first conversation when none selected', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });
    });
  });


  describe('Conversation List', () => {
    it('should render conversation list with all conversations', () => {
      render(<MessagesPage />);

      expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
      expect(screen.getByTestId('conv-conv_1')).toBeInTheDocument();
      expect(screen.getByTestId('conv-conv_2')).toBeInTheDocument();
    });

    it('should show empty state when no conversations', () => {
      (useConversationStore as unknown as jest.Mock).mockReturnValue({
        conversations: [],
        loading: false,
        error: null,
        loadConversations: mockLoadConversations,
        clearError: mockClearError,
      });

      render(<MessagesPage />);

      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    });
  });

  describe('Conversation', () => {
    it('should display selected conversation header', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
      });
    });

    it('should show online status for active users', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Online')).toBeInTheDocument();
      });
    });

    it('should show offline status for inactive users', async () => {
      const user = userEvent.setup();
      render(<MessagesPage />);

      const bobConversation = screen.getByTestId('conv-conv_2');
      await user.click(bobConversation);

      await waitFor(() => {
        expect(screen.getByText('Offline')).toBeInTheDocument();
      });
    });

    it('should display unread count badge when messages unread', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('2 unread')).toBeInTheDocument();
      });
    });

    it('should not display unread badge when no unread messages', async () => {
      const user = userEvent.setup();
      render(<MessagesPage />);

      const bobConversation = screen.getByTestId('conv-conv_2');
      await user.click(bobConversation);

      await waitFor(() => {
        expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
      });
    });

    it('should switch between conversations', async () => {
      const user = userEvent.setup();
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Messages for conv_1')).toBeInTheDocument();
      });

      const bobConversation = screen.getByTestId('conv-conv_2');
      await user.click(bobConversation);

      await waitFor(() => {
        expect(screen.getByText('Messages for conv_2')).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message when error occurs', () => {
      (useConversationStore as unknown as jest.Mock).mockReturnValue({
        conversations: [],
        loading: false,
        error: 'Failed to load conversations',
        loadConversations: mockLoadConversations,
        clearError: mockClearError,
      });

      render(<MessagesPage />);

      expect(screen.getByText(/error loading conversations/i)).toBeInTheDocument();
      expect(screen.getByText('Failed to load conversations')).toBeInTheDocument();
    });

    it('should retry loading conversations on error retry click', async () => {
      const user = userEvent.setup();
      (useConversationStore as unknown as jest.Mock).mockReturnValue({
        conversations: [],
        loading: false,
        error: 'Network error',
        loadConversations: mockLoadConversations,
        clearError: mockClearError,
      });

      render(<MessagesPage />);

      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);

      expect(mockClearError).toHaveBeenCalledTimes(1);
      expect(mockLoadConversations).toHaveBeenCalledTimes(2);
    });

    it('should clear error when retry button clicked', async () => {
      const user = userEvent.setup();
      (useConversationStore as unknown as jest.Mock).mockReturnValue({
        conversations: [],
        loading: false,
        error: 'Error occurred',
        loadConversations: mockLoadConversations,
        clearError: mockClearError,
      });

      render(<MessagesPage />);

      const retryButton = screen.getByText(/retry/i);
      await user.click(retryButton);

      expect(mockClearError).toHaveBeenCalled();
    });
  });
});
