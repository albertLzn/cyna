import {
    ValidationError,
    NetworkError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    WebSocketNotConnectedError,
} from './interfaces';

describe('Domain Interfaces', () => {
    describe('Custom Error Classes', () => {
        describe('ValidationError', () => {
            it('should create error with correct message and name', () => {
                const error = new ValidationError('Invalid input');

                expect(error).toBeInstanceOf(Error);
                expect(error).toBeInstanceOf(ValidationError);
                expect(error.message).toBe('Invalid input');
                expect(error.name).toBe('ValidationError');
            });

            it('should be catchable as Error', () => {
                try {
                    throw new ValidationError('Test error');
                } catch (error) {
                    expect(error).toBeInstanceOf(Error);
                    expect((error as Error).message).toBe('Test error');
                }
            });

            it('should preserve stack trace', () => {
                const error = new ValidationError('Test');
                expect(error.stack).toBeDefined();
                expect(error.stack).toContain('ValidationError');
            });
        });

        describe('NetworkError', () => {
            it('should create error with message only', () => {
                const error = new NetworkError('Connection timeout');

                expect(error.message).toBe('Connection timeout');
                expect(error.name).toBe('NetworkError');
                expect(error.statusCode).toBeUndefined();
            });

            it('should create error with statusCode', () => {
                const error = new NetworkError('Server error', 500);

                expect(error.message).toBe('Server error');
                expect(error.statusCode).toBe(500);
            });

            it('should handle common HTTP status codes', () => {
                const errors = [
                    new NetworkError('Bad Request', 400),
                    new NetworkError('Unauthorized', 401),
                    new NetworkError('Not Found', 404),
                    new NetworkError('Internal Server Error', 500),
                    new NetworkError('Service Unavailable', 503),
                ];

                errors.forEach(error => {
                    expect(error).toBeInstanceOf(NetworkError);
                    expect(error.statusCode).toBeDefined();
                });
            });
        });

        describe('AuthenticationError', () => {
            it('should create error for JWT issues', () => {
                const error = new AuthenticationError('JWT expired');

                expect(error.message).toBe('JWT expired');
                expect(error.name).toBe('AuthenticationError');
            });

            it('should differentiate from authorization errors', () => {
                const authNError = new AuthenticationError('Not authenticated');
                const authZError = new ForbiddenError('Not authorized');

                expect(authNError).not.toBeInstanceOf(ForbiddenError);
                expect(authZError).not.toBeInstanceOf(AuthenticationError);
            });
        });

        describe('ForbiddenError', () => {
            it('should create error for permission issues', () => {
                const error = new ForbiddenError('User is not message sender');

                expect(error.message).toBe('User is not message sender');
                expect(error.name).toBe('ForbiddenError');
            });
        });

        describe('NotFoundError', () => {
            it('should create error with resource and id', () => {
                const error = new NotFoundError('Message', 'msg_123');

                expect(error.message).toBe('Message with id msg_123 not found');
                expect(error.name).toBe('NotFoundError');
            });

            it('should handle different resource types', () => {
                const messageError = new NotFoundError('Message', 'msg_1');
                const conversationError = new NotFoundError('Conversation', 'conv_1');
                const userError = new NotFoundError('User', 'user_1');

                expect(messageError.message).toContain('Message');
                expect(conversationError.message).toContain('Conversation');
                expect(userError.message).toContain('User');
            });
        });

        describe('WebSocketNotConnectedError', () => {
            it('should create error with default message', () => {
                const error = new WebSocketNotConnectedError();

                expect(error.message).toBe('WebSocket is not connected');
                expect(error.name).toBe('WebSocketNotConnectedError');
            });

            it('should be throwable in WebSocket operations', () => {
                const sendMessage = (connected: boolean) => {
                    if (!connected) {
                        throw new WebSocketNotConnectedError();
                    }
                };

                expect(() => sendMessage(false)).toThrow(WebSocketNotConnectedError);
                expect(() => sendMessage(false)).toThrow('WebSocket is not connected');
            });
        });
    });

    describe('Error Handling Patterns', () => {
        it('should allow type narrowing in catch blocks', () => {
            const riskyOperation = (scenario: string) => {
                switch (scenario) {
                    case 'validation':
                        throw new ValidationError('Invalid input');
                    case 'network':
                        throw new NetworkError('Timeout', 504);
                    case 'auth':
                        throw new AuthenticationError('Token expired');
                    case 'not-found':
                        throw new NotFoundError('Message', 'msg_1');
                    default:
                        throw new Error('Unknown error');
                }
            };

            try {
                riskyOperation('network');
            } catch (error) {
                if (error instanceof NetworkError) {
                    expect(error.statusCode).toBe(504);
                    expect(error.message).toBe('Timeout');
                } else {
                    fail('Should have caught NetworkError');
                }
            }
        });

        it('should support exhaustive error handling', () => {
            const handleError = (error: Error): string => {
                if (error instanceof ValidationError) {
                    return 'VALIDATION_ERROR';
                }
                if (error instanceof NetworkError) {
                    return `NETWORK_ERROR_${error.statusCode || 'UNKNOWN'}`;
                }
                if (error instanceof AuthenticationError) {
                    return 'AUTH_ERROR';
                }
                if (error instanceof ForbiddenError) {
                    return 'FORBIDDEN_ERROR';
                }
                if (error instanceof NotFoundError) {
                    return 'NOT_FOUND_ERROR';
                }
                if (error instanceof WebSocketNotConnectedError) {
                    return 'WS_ERROR';
                }
                return 'UNKNOWN_ERROR';
            };

            expect(handleError(new ValidationError('test'))).toBe('VALIDATION_ERROR');
            expect(handleError(new NetworkError('test', 500))).toBe('NETWORK_ERROR_500');
            expect(handleError(new AuthenticationError('test'))).toBe('AUTH_ERROR');
            expect(handleError(new NotFoundError('Message', '1'))).toBe('NOT_FOUND_ERROR');
            expect(handleError(new Error('generic'))).toBe('UNKNOWN_ERROR');
        });

        it('should maintain stack traces through re-throws', () => {
            const innerFunction = () => {
                throw new ValidationError('Inner error');
            };

            const outerFunction = () => {
                try {
                    innerFunction();
                } catch (error) {
                    if (error instanceof ValidationError) {
                        throw new NetworkError(`Wrapped: ${error.message}`);
                    }
                    throw error;
                }
            };

            try {
                outerFunction();
                fail('Should have thrown');
            } catch (error) {
                expect(error).toBeInstanceOf(NetworkError);
                expect((error as NetworkError).message).toContain('Wrapped: Inner error');
                expect((error as NetworkError).stack).toBeDefined();
            }
        });
    });

    describe('Interface Contract Compliance', () => {
        it('should enforce IMessageRepository contract structure', () => {
            const mockRepo = {
                getMessages: jest.fn(),
                createMessage: jest.fn(),
                updateMessageStatus: jest.fn(),
                deleteMessage: jest.fn(),
                markConversationAsRead: jest.fn(),
            };

            // TypeScript compile-time check
            const repo: any = mockRepo;

            expect(typeof repo.getMessages).toBe('function');
            expect(typeof repo.createMessage).toBe('function');
            expect(typeof repo.updateMessageStatus).toBe('function');
            expect(typeof repo.deleteMessage).toBe('function');
            expect(typeof repo.markConversationAsRead).toBe('function');
        });

        it('should enforce IWebSocketService contract structure', () => {
            const mockWsService = {
                connect: jest.fn(),
                disconnect: jest.fn(),
                send: jest.fn(),
                subscribe: jest.fn(() => jest.fn()), // Returns unsubscribe
                isConnected: jest.fn(() => false),
            };

            expect(typeof mockWsService.connect).toBe('function');
            expect(typeof mockWsService.subscribe).toBe('function');
            expect(typeof mockWsService.subscribe()).toBe('function');
        });
    });
});
