

    // Exemple utilisation des constants dans tout ce fichier.

    import type { IMessageRepository, IMessageService } from '../domain/interfaces';
    import type {
        Message,
        MessageId,
        CreateMessagePayload,
        MessageQueryParams,
        PaginatedResult,
        ConversationId,
    } from '../domain/types';
    import {
        MessageStatus,
        createMessageId,
    } from '../domain/types';
    import {
        ValidationError,
        NotFoundError,
        NetworkError,
    } from '../domain/interfaces';
    import { CONVERSATION_CACHE, MESSAGE_SERVICE_CONSTANTS } from '../domain/constants';



    interface CacheEntry {
        data: PaginatedResult<Message>;
        timestamp: number;
        params: MessageQueryParams;
    }


    interface RetryMetadata {
        messageId: MessageId;
        payload: CreateMessagePayload;
        attempts: number;
        nextRetryAt: number;
    }


    export class MessageService implements IMessageService {
        private config: Required<any>;
        private cache = new Map<string, CacheEntry>();
        private retryQueue = new Map<MessageId, RetryMetadata>();
        private pendingMessages = new Map<MessageId, Message>();
        private broadcastChannel: BroadcastChannel | null = null;

        constructor(
            private readonly repository: IMessageRepository,
            config: any = {}
        ) {
            this.config = {
                optimisticTimeout: config.optimisticTimeout ?? MESSAGE_SERVICE_CONSTANTS.OPTIMISTIC_TIMEOUT_MS,
                maxRetries: config.maxRetries ?? MESSAGE_SERVICE_CONSTANTS.MAX_RETRIES,
                retryDelay: config.retryDelay ?? MESSAGE_SERVICE_CONSTANTS.RETRY_BASE_DELAY_MS,
                cacheTTL: config.cacheTTL ?? MESSAGE_SERVICE_CONSTANTS.CACHE_TTL_MS,

            };

            // sync multi-tabs
            if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
                this.broadcastChannel = new BroadcastChannel(
                    MESSAGE_SERVICE_CONSTANTS.BROADCAST_CHANNEL_NAME
                ); this.setupBroadcastListeners();
            }
        }

        async getMessages(params: MessageQueryParams): Promise<PaginatedResult<Message>> {
            if (!params.conversationId) {
                throw new ValidationError('conversationId is required');
            }

            const cacheKey = this.getCacheKey(params);
            const cached = this.cache.get(cacheKey);

            if (cached && Date.now() - cached.timestamp < this.config.cacheTTL) {
                return this.mergePendingMessages(cached.data, params.conversationId);
            }

            const result = await this.repository.getMessages(params);

            if ('error' in result) {
                throw new NetworkError(result.error);
            }

            this.cache.set(cacheKey, {
                data: result.data,
                timestamp: Date.now(),
                params,
            });

            return this.mergePendingMessages(result.data, params.conversationId);
        }

        async sendMessage(payload: CreateMessagePayload): Promise<Message> {
            this.validateCreatePayload(payload);

            const tempId = createMessageId(`temp_${Date.now()}_${Math.random()}`);
            const optimisticMessage: Message = {
                id: tempId,
                conversationId: payload.conversationId,
                senderId: this.getCurrentUserId(), // From JWT context
                content: payload.content,
                files: payload.files || [],
                status: MessageStatus.SENDING,
                createdAt: new Date(),
                updatedAt: new Date(),
                readAt: null,
                deletedAt: null,
            };

            this.pendingMessages.set(tempId, optimisticMessage);

            this.broadcastMessageUpdate(optimisticMessage);

            this.invalidateCache(payload.conversationId);

            try {
                const result = await this.withTimeout(
                    this.repository.createMessage(payload),
                    this.config.optimisticTimeout
                );

                if ('error' in result) {
                    throw new NetworkError(result.error);
                }

                const serverMessage = result.data;

                // TODO remplacer tempID par serverID
                this.pendingMessages.delete(tempId);
                this.pendingMessages.set(serverMessage.id, serverMessage);

                this.broadcastMessageUpdate(serverMessage);

                setTimeout(() => {
                    this.pendingMessages.delete(serverMessage.id);
                }, MESSAGE_SERVICE_CONSTANTS.PENDING_MESSAGE_CLEANUP_DELAY_MS);


                return serverMessage;

            } catch (error) {
                const failedMessage: Message = {
                    ...optimisticMessage,
                    status: MessageStatus.FAILED,
                    updatedAt: new Date(),
                };

                this.pendingMessages.set(tempId, failedMessage);
                this.broadcastMessageUpdate(failedMessage);

                // push to retry queue
                this.retryQueue.set(tempId, {
                    messageId: tempId,
                    payload,
                    attempts: 0,
                    nextRetryAt: Date.now() + MESSAGE_SERVICE_CONSTANTS.RETRY_BASE_DELAY_MS,
                });

                return failedMessage;
            }
        }

        async markAsRead(messageId: MessageId): Promise<Message> {
            const pending = this.pendingMessages.get(messageId);
            if (pending) {
                pending.status = MessageStatus.READ;
                pending.readAt = new Date();
                pending.updatedAt = new Date();
                this.broadcastMessageUpdate(pending);
            }

            const result = await this.repository.updateMessageStatus({
                messageId,
                status: MessageStatus.READ,
            });

            if ('error' in result) {
                if (pending) {
                    pending.status = MessageStatus.DELIVERED;
                    pending.readAt = null;
                }
                throw new NetworkError(result.error);
            }

            this.invalidateCacheForMessage(messageId);

            return result.data;
        }

        async deleteMessage(messageId: MessageId): Promise<Message> {
            const pending = this.pendingMessages.get(messageId);
            if (pending) {
                pending.deletedAt = new Date();
                pending.updatedAt = new Date();
                this.broadcastMessageUpdate(pending);
            }

            const result = await this.repository.deleteMessage(messageId);

            if ('error' in result) {
                if (pending) {
                    pending.deletedAt = null;
                }
                throw new NetworkError(result.error);
            }

            this.invalidateCacheForMessage(messageId);
            setTimeout(() => {
                this.pendingMessages.delete(messageId);
            }, 1000);

            return result.data;
        }

        async retryFailedMessage(messageId: MessageId): Promise<Message> {
            const retryMeta = this.retryQueue.get(messageId);

            if (!retryMeta) {
                throw new NotFoundError('Message', messageId);
            }

            if (retryMeta.attempts >= this.config.maxRetries) {
                throw new ValidationError(`Max retries (${this.config.maxRetries}) exceeded`);
            }

            if (Date.now() < retryMeta.nextRetryAt) {
                throw new ValidationError(
                    `Retry available in ${Math.ceil((retryMeta.nextRetryAt - Date.now()) / 1000)}s`
                );
            }

            retryMeta.attempts++;
            retryMeta.nextRetryAt =
                Date.now() +
                MESSAGE_SERVICE_CONSTANTS.RETRY_BASE_DELAY_MS *
                Math.pow(2, retryMeta.attempts);
            this.pendingMessages.delete(messageId);

            try {
                const message = await this.sendMessage(retryMeta.payload);

                // Success => remove from retry queue
                if (message.status === MessageStatus.SENT) {
                    this.retryQueue.delete(messageId);
                }

                return message;
            } catch (error) {
                throw error;
            }
        }

        // ==================== PRIVATE HELPERS ====================

        private validateCreatePayload(payload: CreateMessagePayload): void {
            if (!payload.conversationId) {
                throw new ValidationError('conversationId is required');
            }

            if (!payload.content && (!payload.files || payload.files.length === 0)) {
                throw new ValidationError('content or files required');
            }

            if (
                payload.files &&
                payload.files.length > MESSAGE_SERVICE_CONSTANTS.MAX_FILES_PER_MESSAGE
            ) {
                throw new ValidationError('max 5 files allowed');
            }
        }

        private getCacheKey(params: MessageQueryParams): string {
            return `${params.conversationId}_${params.limit || MESSAGE_SERVICE_CONSTANTS.DEFAULT_PAGE_LIMIT
                }_${params.cursor || 'initial'}`;
        }

        private mergePendingMessages(
            data: PaginatedResult<Message>,
            conversationId: ConversationId
        ): PaginatedResult<Message> {
            const pendingForConv = Array.from(this.pendingMessages.values())
                .filter(m => m.conversationId === conversationId);

            // Merge et dédupe par ID
            const merged = [...pendingForConv, ...data.data];
            const uniqueMap = new Map<MessageId, Message>();

            merged.forEach(msg => {
                uniqueMap.set(msg.id, msg);
            });

            // Sort par createdAt DESC
            const sorted = Array.from(uniqueMap.values())
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

            return {
                data: sorted,
                nextCursor: data.nextCursor,
                hasMore: data.hasMore,
            };
        }


        private invalidateCache(conversationId: ConversationId): void {
            const keysToDelete: string[] = [];

            this.cache.forEach((entry, key) => {
                if (entry.params.conversationId === conversationId) {
                    keysToDelete.push(key);
                }
            });

            keysToDelete.forEach(key => this.cache.delete(key));
        }


        private invalidateCacheForMessage(messageId: MessageId): void {
            // Find conversation du message dans pending ou cache
            const pending = this.pendingMessages.get(messageId);
            if (pending) {
                this.invalidateCache(pending.conversationId);
            }
        }

        private async withTimeout<T>(
            promise: Promise<T>,
            timeoutMs: number
        ): Promise<T> {
            return Promise.race([
                promise,
                new Promise<never>((_, reject) =>
                    setTimeout(
                        () => reject(new NetworkError(MESSAGE_SERVICE_CONSTANTS.REQUEST_TIMEOUT_ERROR)),
                        timeoutMs
                    )),
            ]);
        }


        private getCurrentUserId() {
            // TODO: Extract from JWT context in production
            return MESSAGE_SERVICE_CONSTANTS.MOCK_CURRENT_USER_ID as any;
        }

        private setupBroadcastListeners(): void {
            if (!this.broadcastChannel) return;

            this.broadcastChannel.onmessage = (event) => {
                const { type, payload } = event.data;

                if (type === 'message:update') {
                    const message = payload as Message;
                    this.pendingMessages.set(message.id, message);

                    // Trigger re-render si hook subscribed
                    // (géré par store Zustand dans l'implémentation réelle)
                }
            };
        }


        private broadcastMessageUpdate(message: Message): void {
            if (!this.broadcastChannel) return;

            this.broadcastChannel.postMessage({
                type: 'message:update',
                payload: message,
            });
        }

        destroy(): void {
            this.cache.clear();
            this.pendingMessages.clear();
            this.retryQueue.clear();

            if (this.broadcastChannel) {
                this.broadcastChannel.close();
                this.broadcastChannel = null;
            }
        }
    }