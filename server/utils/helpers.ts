export function extractUserId(c: any): string {
  const mockUserId = c.req.header('X-Mock-User-Id');
  if (mockUserId && /^user[1-5]$/.test(mockUserId)) {
    return mockUserId;
  }
  return 'user1';
}

export function broadcastWSEvent(event: any): void {
  // TODO: Implement with WebSocket server
  console.log('[WS Broadcast]', event.type, event.payload);
}