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

    cp .env.local


Database setup (macOS)

Start PostgreSQL locally using Homebrew:

# Install PostgreSQL
brew install postgresql@16

# Start PostgreSQL service
brew services start postgresql@16

# Create superuser named postgres for local dev
psql postgres -c "CREATE ROLE postgres WITH LOGIN SUPERUSER PASSWORD 'postgres';"

# Create the database:

createdb cyna_chat


Initialize schema and seed data:

npm run db:setup

Reset the database:

npm run db:reset

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