import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MessagesPage from './page';

import { useConversationStore } from '@/features/messaging/store/conversationStore';
import type { Conversation } from '@/features/messaging/domain/types';
import {
  createConversationId,
  createUserId,
  createMessageId,
  MessageStatus,
  PresenceStatus,
} from '@/features/messaging/domain/types';


jest.mock('@/features/messaging/store/conversationStore');

jest.mock('@/features/messaging/components/ConversationList', () => ({
  ConversationList: ({ conversations, onSelect }: any) => (
    <div data-testid="conversation-list">
      {conversations.map((conv: any) => (
        <button
          key={conv.id}
          data-testid={`conv-${conv.id}`}
          onClick={() => onSelect(conv.id)}
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

jest.mock('@/features/messaging/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

jest.mock('@/features/messaging/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

jest.mock('@/features/messaging/components/ui/card', () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

jest.mock('@/features/messaging/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

const conv1Id = createConversationId('conv1');
const conv2Id = createConversationId('conv2');

const aliceId = createUserId('user1');
const bobId = createUserId('user2');

const mockConversations: Conversation[] = [
  {
    id: conv1Id,
    participants: [
      {
        id: aliceId,
        name: 'Alice',
        avatar: null,
        presenceStatus: PresenceStatus.ONLINE,
        lastSeenAt: null,
      },
    ],
    unreadCount: 2,
    lastMessage: {
      id: createMessageId('msg1'),
      conversationId: conv1Id,
      senderId: aliceId,
      content: 'Hey Alice',
      files: [],
      status: MessageStatus.READ,
      createdAt: new Date(),
      updatedAt: new Date(),
      readAt: new Date(),
      deletedAt: null,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: conv2Id,
    participants: [
      {
        id: bobId,
        name: 'Bob',
        avatar: null,
        presenceStatus: PresenceStatus.OFFLINE,
        lastSeenAt: new Date(),
      },
    ],
    unreadCount: 0,
    lastMessage: {
      id: createMessageId('msg2'),
      conversationId: conv2Id,
      senderId: bobId,
      content: 'See you',
      files: [],
      status: MessageStatus.READ,
      createdAt: new Date(),
      updatedAt: new Date(),
      readAt: null,
      deletedAt: null,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

describe('MessagesPage', () => {
  const loadConversations = jest.fn();
  const clearError = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useConversationStore as unknown as jest.Mock).mockReturnValue({
      conversations: mockConversations,
      loading: false,
      error: null,
      loadConversations,
      clearError,
    });
  });

  describe('initialisation', () => {
    it('loads conversations on mount', () => {
      render(<MessagesPage />);
      expect(loadConversations).toHaveBeenCalledTimes(1);
    });

    it('auto-selects first conversation', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
      });

      expect(screen.getByText('Messages for conv1')).toBeInTheDocument();
    });
  });

  describe('conversation list', () => {
    it('renders all conversations', () => {
      render(<MessagesPage />);

      expect(screen.getByTestId('conversation-list')).toBeInTheDocument();
      expect(screen.getByTestId('conv-conv1')).toBeInTheDocument();
      expect(screen.getByTestId('conv-conv2')).toBeInTheDocument();
    });

    it('shows empty state when no conversations', () => {
      (useConversationStore as unknown as jest.Mock).mockReturnValue({
        conversations: [],
        loading: false,
        error: null,
        loadConversations,
        clearError,
      });

      render(<MessagesPage />);

      expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
    });
  });

  describe('conversation content', () => {
    it('shows presence status', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('Online')).toBeInTheDocument();
      });
    });

    it('switches conversation when clicked', async () => {
      const user = userEvent.setup();
      render(<MessagesPage />);

      await user.click(screen.getByTestId('conv-conv2'));

      await waitFor(() => {
        expect(screen.getByText('Messages for conv2')).toBeInTheDocument();
      });

      expect(screen.getByText('Offline')).toBeInTheDocument();
    });

    it('shows unread badge only when needed', async () => {
      render(<MessagesPage />);

      await waitFor(() => {
        expect(screen.getByText('2 unread')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByTestId('conv-conv2'));

      expect(screen.queryByText(/unread/i)).not.toBeInTheDocument();
    });
  });

  describe('error handling', () => {
    it('displays error state', () => {
      (useConversationStore as unknown as jest.Mock).mockReturnValue({
        conversations: [],
        loading: false,
        error: 'Network error',
        loadConversations,
        clearError,
      });

      render(<MessagesPage />);

      expect(screen.getByText(/error loading conversations/i)).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('retries loading on retry click', async () => {
      const user = userEvent.setup();

      (useConversationStore as unknown as jest.Mock).mockReturnValue({
        conversations: [],
        loading: false,
        error: 'Network error',
        loadConversations,
        clearError,
      });

      render(<MessagesPage />);

      await user.click(screen.getByText(/retry/i));

      expect(clearError).toHaveBeenCalledTimes(1);
      expect(loadConversations).toHaveBeenCalledTimes(2);
    });
  });
});
