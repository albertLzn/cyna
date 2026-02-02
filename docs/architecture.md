# Architecture

## Overview

Feature-based structure. All messaging logic in `src/features/messaging/`.

## Layers
```
UI → Hooks → Stores → Services → Repositories → API
```

**UI**: React components  
**Hooks**: Connect UI to stores  
**Stores**: Zustand state  
**Services**: Business logic  
**Repositories**: HTTP calls  
**API**: Backend (Hono)

### Multi-Device Sync

**WebSocket**: Cross-device  
**BroadcastChannel**: Same device, multiple tabs

Send message → broadcast to tabs + devices

### Typing Indicator

Throttled 2s. Auto-remove after 5s if no stop event.


## Services

**MessageService**: Send, retry, cache, optimistic updates  
**ConversationService**: List, mark as read  
**WebSocketService**: Connect, reconnect, heartbeat  
**TypingService**: Throttle typing events
