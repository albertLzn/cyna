import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConversationWindow } from './ConversationWindow';
import { useTypingIndicator } from '../hooks/useTyping';
import { createConversationId, createUserId, PresenceStatus } from '../domain/types';

jest.mock('./MessageList', () => ({
  MessageList: () => <div data-testid="message-list">Messages</div>,
}));

jest.mock('./MessageInput', () => ({
  MessageInput: () => <div data-testid="message-input">Input</div>,
}));

jest.mock('../hooks/useTyping');

describe('ConversationWindow', () => {
  const mockConversation = {
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
    lastMessage: null,
    unreadCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useTypingIndicator as jest.Mock).mockReturnValue({
      typingUsers: [],
    });
  });

  it('should render conversation window', () => {
    render(<ConversationWindow conversation={mockConversation} onClose={mockOnClose} />);

    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('should show message list and input when expanded', () => {
    render(<ConversationWindow conversation={mockConversation} onClose={mockOnClose} />);

    expect(screen.getByTestId('message-list')).toBeInTheDocument();
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
  });

  it('should minimize window on minimize button click', async () => {
    const user = userEvent.setup();
    render(<ConversationWindow conversation={mockConversation} onClose={mockOnClose} />);

    const minimizeButton = screen.getAllByRole('button')[0];
    await user.click(minimizeButton);

    expect(screen.queryByTestId('message-list')).not.toBeInTheDocument();
  });

  it('should call onClose when close button clicked', async () => {
    const user = userEvent.setup();
    render(<ConversationWindow conversation={mockConversation} onClose={mockOnClose} />);

    const closeButton = screen.getAllByRole('button')[1];
    await user.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should position window correctly', () => {
    const { container } = render(
      <ConversationWindow conversation={mockConversation} onClose={mockOnClose} />
    );

    const window = container.firstChild as HTMLElement;
    expect(window.style.bottom).toBe('0px');
    expect(window.style.right).toBe('400px');
  });
});