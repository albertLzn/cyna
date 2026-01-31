import { renderHook } from '@testing-library/react';
import { useWebSocketService } from './useWebsocket';
import { WebSocketService } from '../services/WebsocketService';

jest.mock('../services/WebsocketService');

describe('useWebSocketService', () => {
    const mockConnect = jest.fn();
    const mockIsConnected = jest.fn();
    const mockDisconnect = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockConnect.mockResolvedValue(undefined);

        (WebSocketService as jest.Mock).mockImplementation(() => ({
            connect: mockConnect,
            isConnected: mockIsConnected,
            disconnect: mockDisconnect,
        }));
    });

    it('should create WebSocket service instance', () => {
        mockIsConnected.mockReturnValue(true);

        const { result } = renderHook(() => useWebSocketService());

        expect(result.current).toBeDefined();
    });

    it('should reuse same instance across renders', () => {
        mockIsConnected.mockReturnValue(true);

        const { result, rerender } = renderHook(() => useWebSocketService());
        const firstInstance = result.current;

        rerender();
        const secondInstance = result.current;

        expect(firstInstance).toBe(secondInstance);
    });

    it('should auto-connect when not connected', async () => {
        mockIsConnected.mockReturnValue(false);

        renderHook(() => useWebSocketService());

        await Promise.resolve();

        expect(mockConnect).toHaveBeenCalled();
    });
});