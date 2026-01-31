import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageInput } from './MessageInput';
import { useMessageStore } from '../store/messageStore';
import { useTypingIndicator } from '../hooks/useTyping';
import { createConversationId } from '../domain/types';

jest.mock('../store/messageStore');
jest.mock('../hooks/useTyping');

describe('MessageInput', () => {
  const conversationId = createConversationId('conv1');
  const mockSendMessage = jest.fn();
  const mockStartTyping = jest.fn();
  const mockStopTyping = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useMessageStore as unknown as jest.Mock).mockReturnValue({
      sendMessage: mockSendMessage,
    });

    (useTypingIndicator as jest.Mock).mockReturnValue({
      typingService: {
        startTyping: mockStartTyping,
        stopTyping: mockStopTyping,
      },
      typingUsers: [],
    });
  });

  it('should render input field', () => {
    render(<MessageInput conversationId={conversationId} />);
    expect(screen.getByPlaceholderText(/testMessage/i)).toBeInTheDocument();
  });

  it('should send message on button click', async () => {
    const user = userEvent.setup();
    render(<MessageInput conversationId={conversationId} />);

    const input = screen.getByPlaceholderText(/testMessage/i);
    const sendButton = screen.getByRole('button', { name: '' });

    await user.type(input, 'Hello');
    await user.click(sendButton);

    expect(mockSendMessage).toHaveBeenCalledWith(conversationId, 'Hello', []);
  });

  it('should send message on Enter key', async () => {
    const user = userEvent.setup();
    render(<MessageInput conversationId={conversationId} />);

    const input = screen.getByPlaceholderText(/testMessage/i);

    await user.type(input, 'Hello{Enter}');

    expect(mockSendMessage).toHaveBeenCalledWith(conversationId, 'Hello', []);
  });

  it('should trigger typing indicator on input', async () => {
    const user = userEvent.setup();
    render(<MessageInput conversationId={conversationId} />);

    const input = screen.getByPlaceholderText(/testMessage/i);

    await user.type(input, 'H');

    expect(mockStartTyping).toHaveBeenCalledWith(conversationId);
  });

  it('should stop typing when input is cleared', async () => {
    const user = userEvent.setup();
    render(<MessageInput conversationId={conversationId} />);

    const input = screen.getByPlaceholderText(/testMessage/i);

    await user.type(input, 'Hello');
    await user.clear(input);

    expect(mockStopTyping).toHaveBeenCalledWith(conversationId);
  });

  it('should disable send button when input is empty', () => {
    render(<MessageInput conversationId={conversationId} />);

    const sendButton = screen.getByRole('button', { name: '' });
    expect(sendButton).toBeDisabled();
  });

  it('should show character count warning', async () => {
    const user = userEvent.setup();
    render(<MessageInput conversationId={conversationId} />);

    const input = screen.getByPlaceholderText(/testMessage/i);
    const longText = 'a'.repeat(900);

    await user.type(input, longText);

    expect(screen.getByText(/characters/i)).toBeInTheDocument();
  });
});