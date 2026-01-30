import { BaseRepository } from '@/lib/api/http-client';
import { parseMessage } from '@/lib/api/parsers';
import { IMessageRepository } from '../domain/interfaces';
import type {
  Message,
  MessageId,
  ConversationId,
  CreateMessagePayload,
  UpdateMessageStatusPayload,
  MessageQueryParams,
  PaginatedResult,
  ApiResponse,
} from '../domain/types';
import { createMessageId } from '../domain/types';

export class MessageRepository extends BaseRepository implements IMessageRepository {
  async getMessages(
    params: MessageQueryParams
  ): Promise<ApiResponse<PaginatedResult<Message>>> {
    try {
      const queryString = new URLSearchParams({
        conversationId: params.conversationId,
        limit: String(params.limit || 50),
        ...(params.cursor && { cursor: params.cursor }),
      }).toString();

      const response = await fetch(`${this.baseURL}/messages?${queryString}`, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();

      return {
        data: {
          data: json.data.map(parseMessage),
          nextCursor: json.nextCursor,
          hasMore: json.hasMore,
        },
      };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  async createMessage(payload: CreateMessagePayload): Promise<ApiResponse<Message>> {
    try {
      const response = await fetch(`${this.baseURL}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          conversationId: payload.conversationId,
          content: payload.content,
          files: payload.files || [],
        }),
      });

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();
      return { data: parseMessage(json.data) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  async updateMessageStatus(
    payload: UpdateMessageStatusPayload
  ): Promise<ApiResponse<Message>> {
    try {
      const response = await fetch(
        `${this.baseURL}/messages/${payload.messageId}/status`,
        {
          method: 'PATCH',
          headers: this.getHeaders(),
          body: JSON.stringify({ status: payload.status }),
        }
      );

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();
      return { data: parseMessage(json.data) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  async deleteMessage(messageId: MessageId): Promise<ApiResponse<Message>> {
    try {
      const response = await fetch(`${this.baseURL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();
      return { data: parseMessage(json.data) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }

  async markConversationAsRead(
    conversationId: ConversationId
  ): Promise<ApiResponse<MessageId[]>> {
    try {
      const response = await fetch(
        `${this.baseURL}/conversations/${conversationId}/mark-read`,
        {
          method: 'POST',
          headers: this.getHeaders(),
        }
      );

      if (!response.ok) {
        return { error: await this.extractError(response) };
      }

      const json = await response.json();
      return { data: json.data.map((id: string) => createMessageId(id)) };
    } catch (error) {
      return { error: this.handleError(error) };
    }
  }
}