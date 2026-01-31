import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { MessageList } from './MessageList';
import { useMessages } from '../hooks/useMessage';
import { useTypingIndicator } from '../hooks/useTyping';
import { useConversationStore } from '../store/conversationStore';
import { createConversationId, createMessageId, createUserId, MessageStatus } from '../domain/types';

jest.mock('../hooks/useMessage');
jest.mock('../hooks/useTyping');
jest.mock('../store/conversationStore');

describe('MessageList', () => {
  const conversationId = createConversationId('conv1');
  const mockMessages = [
    {
      id: createMessageId('msg1'),
      conversationId,
      senderId: createUserId('user1'),
      content: 'Hello',
      files: [],
      status: MessageStatus.SENT,
      createdAt: new Date(),
      updatedAt: new Date(),
      readAt: null,
      deletedAt: null,
    },
  ];

  beforeEach(() => {
    (useMessages as jest.Mock).mockReturnValue({
      messages: mockMessages,
      loading: false,
      loadMore: jest.fn(),
      retryFailed: jest.fn(),
    });

    (useTypingIndicator as jest.Mock).mockReturnValue({
      typingUsers: [],
    });

    (useConversationStore as unknown as jest.Mock).mockReturnValue({
      conversations: [],
    });
  });

  it('should render messages', () => {
    render(<MessageList conversationId={conversationId} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useMessages as jest.Mock).mockReturnValue({
      messages: [],
      loading: true,
      loadMore: jest.fn(),
      retryFailed: jest.fn(),
    });

    render(<MessageList conversationId={conversationId} />);
    expect(screen.getByText(/loading messages/i)).toBeInTheDocument();
  });

  it('should show deleted message placeholder', () => {
    (useMessages as jest.Mock).mockReturnValue({
      messages: [
        {
          ...mockMessages[0],
          deletedAt: new Date(),
        },
      ],
      loading: false,
      loadMore: jest.fn(),
      retryFailed: jest.fn(),
    });

    render(<MessageList conversationId={conversationId} />);
    expect(screen.getByText('[Message deleted]')).toBeInTheDocument();
  });

  it('should show retry button for failed messages', () => {
    (useMessages as jest.Mock).mockReturnValue({
      messages: [
        {
          ...mockMessages[0],
          status: MessageStatus.FAILED,
        },
      ],
      loading: false,
      loadMore: jest.fn(),
      retryFailed: jest.fn(),
    });

    render(<MessageList conversationId={conversationId} />);
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should render file attachments', () => {
    (useMessages as jest.Mock).mockReturnValue({
      messages: [
        {
          ...mockMessages[0],
          files: [
            {
              id: 'file1',
              name: 'document.pdf',
              type: 'document',
              size: 1024,
              url: 'https://example.com/file.pdf',
            },
          ],
        },
      ],
      loading: false,
      loadMore: jest.fn(),
      retryFailed: jest.fn(),
    });

    render(<MessageList conversationId={conversationId} />);
    expect(screen.getByText(/document.pdf/i)).toBeInTheDocument();
  });
});