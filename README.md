Technical Test Cyna. LinkedIn chat replica

Real-time messaging with floating chat, typing indicators, and multi-device sync.

    Stack
    Frontend
    Next.js 14
    TypeScript
    Tailwind
    shadcn/ui
    Backend
    Hono
    PostgreSQL
    State
    Zustand
    Real-time
    WebSocket
    Tests
    Playwright


Setup. Install dependencies:

    npm install


Copy environment file:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your database credentials.

## Database Setup

### Option 1: Local PostgreSQL (macOS)

Install and start PostgreSQL:
```bash
brew install postgresql@16
brew services start postgresql@16
```

Create superuser:
```bash
psql postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"
```

Create database:
```bash
createdb cyna_chat
```

Initialize schema:
```bash
npm run db:setup
```

### Option 2: Neon (Cloud Postgres)

1. Create account at https://neon.tech
2. Create project: `cyna-chat`
3. Copy connection string from dashboard
4. Add to `.env.local`:
```env
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
```

5. Initialize schema:
```bash
psql 'YOUR_CONNECTION_STRING' -f server/db/schema.sql
```

6. Verify tables:
```bash
psql 'YOUR_CONNECTION_STRING' -c "\dt"
```

### Reset Database

Local:
```bash
npm run db:reset
```

Neon:
```bash
psql 'YOUR_CONNECTION_STRING' -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
psql 'YOUR_CONNECTION_STRING' -f server/db/schema.sql
```
```

Run backend:

    npm run dev:server

Run frontend:

    npm run dev


Open:

    http://localhost:3000

Project Structure
    src/
    ├── app/                    Next.js pages
    ├── features/messaging/     All messaging logic
    │   ├── domain/             Types, interfaces
    │   ├── services/           Business logic
    │   ├── repositories/       API calls
    │   ├── store/              Zustand
    │   ├── hooks/              React hooks
    │   └── components/         UI
    ├── /messages               Messages page/module
    ├── lib/                    Shared utils
    ├── domain/                 Types, interfaces, constants

    server/
    ├── index.ts                Hono server
    ├── db/schema.sql           Database
    ├── routes/                 API endpoints
    └── websocket/              WS handlers
    └── utils/     

Key Features

    Floating chat 

    Detachable windows 

    Multi-device sync 

    Message status 

    Typing indicators (throttle 2s)

    Optimistic updates 

    Message delete 

Testing

    Run E2E tests:

    npm run test:e2e


Database

    Schema in server/db/schema.sql.

    Includes seed data:

    5 users

    4 conversations

Tables:

    users

    conversations

    messages

    conversation_participants