
import { WS_CONSTANTS } from '../domain/constants';
import type { ITypingService, IWebSocketService } from '../domain/interfaces';
import type { ConversationId, UserId } from '../domain/types';

export class TypingService implements ITypingService {
  private typingUsers = new Map<ConversationId, Set<UserId>>();
  private typingTimers = new Map<ConversationId, NodeJS.Timeout>();
  private localTypingTimers = new Map<ConversationId, NodeJS.Timeout>();

  constructor(
    private readonly wsService: IWebSocketService,
    private readonly currentUserId: UserId
  ) {
    this.setupWebSocketListeners();
  }

  startTyping(conversationId: ConversationId): void {
    const existingTimer = this.localTypingTimers.get(conversationId);
    if (existingTimer) {
      return; 
    }

    //  typing event
    this.wsService.send({
      type: 'user:typing',
      payload: {
        userId: this.currentUserId,
        conversationId,
        isTyping: true,
      },
    });

    //  throttle timer 
    const timer = setTimeout(() => {
      this.localTypingTimers.delete(conversationId);
    }, WS_CONSTANTS.THROTTLE);

    this.localTypingTimers.set(conversationId, timer);
  }

  stopTyping(conversationId: ConversationId): void {
    const timer = this.localTypingTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.localTypingTimers.delete(conversationId);
    }
    this.wsService.send({
      type: 'user:typing',
      payload: {
        userId: this.currentUserId,
        conversationId,
        isTyping: false,
      },
    });
  }

  getTypingUsers(conversationId: ConversationId): UserId[] {
    const users = this.typingUsers.get(conversationId);
    return users ? Array.from(users) : [];
  }

  destroy(): void {
    this.localTypingTimers.forEach((timer) => clearTimeout(timer));
    this.typingTimers.forEach((timer) => clearTimeout(timer));
    this.localTypingTimers.clear();
    this.typingTimers.clear();
    this.typingUsers.clear();
  }


  private setupWebSocketListeners(): void {
    this.wsService.subscribe('user:typing', (event) => {
      const { userId, conversationId, isTyping } = event.payload;

      // Avoid showing typing indicator for the current user typing
      if (userId === this.currentUserId) {
        return;
      }

      if (isTyping) {
        this.addTypingUser(conversationId, userId);
      } else {
        this.removeTypingUser(conversationId, userId);
      }
    });
  }

  private addTypingUser(conversationId: ConversationId, userId: UserId): void {
    if (!this.typingUsers.has(conversationId)) {
      this.typingUsers.set(conversationId, new Set());
    }

    this.typingUsers.get(conversationId)!.add(userId);

    // Auto-remove (in case stop event is lost)
    const existingTimer = this.typingTimers.get(conversationId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.removeTypingUser(conversationId, userId);
    }, WS_CONSTANTS.DISPLAY_TIMEOUT_MS);

    this.typingTimers.set(conversationId, timer);
  }

  private removeTypingUser(conversationId: ConversationId, userId: UserId): void {
    const users = this.typingUsers.get(conversationId);
    if (users) {
      users.delete(userId);
      if (users.size === 0) {
        this.typingUsers.delete(conversationId);
      }
    }

    const timer = this.typingTimers.get(conversationId);
    if (timer) {
      clearTimeout(timer);
      this.typingTimers.delete(conversationId);
    }
  }
}