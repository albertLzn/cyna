import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConversationList } from './ConversationList';
import { TypingIndicator } from './TypingIndicator';
import {
  createConversationId,
  createUserId,
  Conversation,
  PresenceStatus,
  MessageId,
  createMessageId,
  MessageStatus,
} from '../domain/types';

jest.mock('./TypingIndicator', () => ({
  TypingIndicator: jest.fn(() => <div data-testid="typing-indicator" />),
}));

describe('ConversationList', () => {
  const onSelect = jest.fn();

  const conversations: Conversation[] = [
    {
      id: createConversationId('conv1'),
      participants: [
        {
          id: createUserId('user2'),
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
        senderId: createUserId('user2'),
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
    {
      id: createConversationId('conv2'),
      participants: [
        {
          id: createUserId('user1'),
          name: 'Kevin',
          avatar: null,
          presenceStatus: PresenceStatus.ONLINE,
          lastSeenAt: null,
        },
      ],
      unreadCount: 0,
      lastMessage: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render conversations', () => {
    render(
      <ConversationList
        conversations={conversations}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('should display unread count when > 0', () => {
    render(
      <ConversationList
        conversations={conversations}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('should display last message content', () => {
    render(
      <ConversationList
        conversations={conversations}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    expect(screen.getByText('Hello Alice')).toBeInTheDocument();
    expect(screen.getByText('No messages')).toBeInTheDocument();
  });

  it('should call onSelect when a conversation is clicked', () => {
    render(
      <ConversationList
        conversations={conversations}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    fireEvent.click(screen.getByText('Alice'));
    expect(onSelect).toHaveBeenCalledWith(conversations[0].id);
  });

  it('should highlight selected conversation', () => {
    render(
      <ConversationList
        conversations={conversations}
        selectedId={conversations[0].id}
        onSelect={onSelect}
      />
    );

    const selectedButton = screen.getByText('Alice').closest('button');
    expect(selectedButton).toHaveClass('bg-blue-50');
  });

  it('should render TypingIndicator for each conversation', () => {
    render(
      <ConversationList
        conversations={conversations}
        selectedId={null}
        onSelect={onSelect}
      />
    );

    expect(screen.getAllByTestId('typing-indicator')).toHaveLength(
      conversations.length
    );
  });
});
