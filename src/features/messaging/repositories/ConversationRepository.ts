import { BaseRepository } from '@/lib/api/http-client';
import { parseConversation } from '@/lib/api/parsers';
import { IConversationRepository } from '../domain/interfaces';
import type {
  Conversation,
  ConversationId,
  UserId,
  ApiResponse,
} from '../domain/types';

export class ConversationRepository extends BaseRepository implements IConversationRepository {
  async getConversations(): Promise<ApiResponse<Conversation[]>> {
    try {
      const response = await fetch(`${this.baseURL}/conversations`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();
      return { data: json.data.map(parseConversation) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  async getConversation(conversationId: ConversationId): Promise<ApiResponse<Conversation>> {
    try {
      const response = await fetch(`${this.baseURL}/conversations/${conversationId}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();
      return { data: parseConversation(json.data) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  async getOrCreateConversation(participantId: UserId): Promise<ApiResponse<Conversation>> {
    try {
      const response = await fetch(`${this.baseURL}/conversations/with/${participantId}`, {
        method: 'POST',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();
      return { data: parseConversation(json.data) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  async updateUnreadCount(conversationId: ConversationId): Promise<ApiResponse<Conversation>> {
    try {
      const response = await fetch(
        `${this.baseURL}/conversations/${conversationId}/unread`,
        {
          method: 'PATCH',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();
      return { data: parseConversation(json.data) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }
}