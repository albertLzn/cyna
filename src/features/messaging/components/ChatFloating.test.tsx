import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatFloating } from './ChatFloating';
import { useConversationStore } from '../store/conversationStore';
import {
  createConversationId,
  createUserId,
  createMessageId,
  MessageStatus,
  PresenceStatus,
  type Conversation,
} from '../domain/types';

jest.mock('../store/conversationStore');
jest.mock('./ConversationWindow', () => ({
  ConversationWindow: ({ conversation, onClose }: any) => (
    <div data-testid={`conversation-window-${conversation.id}`}>
      <span>{conversation.participants[0]?.name}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

jest.mock('./TypingIndicator', () => ({
  TypingIndicator: () => <div data-testid="typing-indicator" />,
}));

describe('ChatFloating', () => {
  const loadConversations = jest.fn();

  const conversations: Conversation[] = [
    {
      id: createConversationId('conv1'),
      participants: [
        {
          id: createUserId('user1'),
          name: 'Alice',
          avatar: null,
          presenceStatus: PresenceStatus.ONLINE,
          lastSeenAt: null,
        },
      ],
      unreadCount: 2,
      lastMessage: {
        id: createMessageId('msg1'),
        conversationId: createConversationId('conv1'),
        senderId: createUserId('user1'),
        content: 'Hello Alice',
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

  beforeEach(() => {
    jest.clearAllMocks();

    (useConversationStore as unknown as jest.Mock).mockReturnValue({
      conversations,
      loadConversations,
    });
  });

  it('should call loadConversations on mount', () => {
    render(<ChatFloating />);
    expect(loadConversations).toHaveBeenCalledTimes(1);
  });

  it('should show floating button when closed', () => {
    render(<ChatFloating />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should open chat window when clicking floating button', () => {
    render(<ChatFloating />);

    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Messages')).toBeInTheDocument();
  });

  it('should show empty state when no conversations', () => {
    (useConversationStore as unknown as jest.Mock).mockReturnValue({
      conversations: [],
      loadConversations,
    });

    render(<ChatFloating />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText(/no conversations yet/i)).toBeInTheDocument();
  });

  it('should render conversation list', () => {
    render(<ChatFloating />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Hello Alice')).toBeInTheDocument();
  });

  it('should open a ConversationWindow when clicking a conversation', () => {
    render(<ChatFloating />);
    fireEvent.click(screen.getByRole('button'));

    fireEvent.click(screen.getByText('Alice'));
    expect(
      screen.getByTestId('conversation-window-conv1')
    ).toBeInTheDocument();
  });

  it('should close a ConversationWindow', () => {
    render(<ChatFloating />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Alice'));

    fireEvent.click(screen.getByText('Close'));
    expect(
      screen.queryByTestId('conversation-window-conv1')
    ).not.toBeInTheDocument();
  });

  it('should render TypingIndicator for each conversation', () => {
    render(<ChatFloating />);
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
  });
});
