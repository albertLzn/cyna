import { renderHook, act } from '@testing-library/react';
import { useTypingIndicator } from './useTyping';
import { useConversationStore } from '../store/conversationStore';
import { useWebSocketService } from './useWebsocket';
import { TypingService } from '../services/TypingService';
import { createConversationId, createUserId, PresenceStatus } from '../domain/types';

jest.mock('../store/conversationStore');
jest.mock('./useWebsocket');
jest.mock('../services/TypingService');

describe('useTyping', () => {
  const conversationId = createConversationId('conv1');
  const mockTypingService = {
    getTypingUsers: jest.fn(() => []),
  };

  const mockConversations = [
    {
      id: conversationId,
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
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    (useConversationStore as unknown as jest.Mock).mockReturnValue({
      conversations: mockConversations,
    });

    (useWebSocketService as jest.Mock).mockReturnValue({});

    (TypingService as jest.Mock).mockImplementation(() => mockTypingService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should return no typing users initially', () => {
    const { result } = renderHook(() => useTypingIndicator(conversationId));

    expect(result.current.typingUsers).toEqual([]);
    expect(result.current.isTyping).toBe(false);
  });

  it('should update typing users from service', () => {
    mockTypingService.getTypingUsers.mockReturnValue([createUserId('user2')]);

    const { result } = renderHook(() => useTypingIndicator(conversationId));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(result.current.typingUsers).toHaveLength(1);
    expect(result.current.isTyping).toBe(true);
  })
});