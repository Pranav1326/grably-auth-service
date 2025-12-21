# Grably Auth Service

Authentication microservice for the Grably application built with Bun.js, Hono, and PostgreSQL.

## Features

- User registration and login
- JWT-based authentication
- Access and refresh token management
- Password hashing with bcrypt
- PostgreSQL database with Drizzle ORM
- Input validation with Zod
- CORS support
- Health check endpoints

## Prerequisites

- Bun.js (latest version)
- PostgreSQL database

## Setup

1. Install dependencies:
```bash
bun install
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Update the `.env` file with your database credentials and JWT secrets.

4. Generate database migrations:
```bash
bun run db:generate
```

5. Run migrations:
```bash
bun run db:migrate
```

## Development

Start the development server with auto-reload:
```bash
bun run dev
```

## Production

Start the production server:
```bash
bun run start
```

## API Endpoints

### Public Endpoints

- `GET /` - Service information
- `GET /health` - Health check
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout user

### Protected Endpoints

- `GET /api/auth/profile` - Get user profile (requires Bearer token)

## Database Commands

- `bun run db:generate` - Generate migrations from schema
- `bun run db:migrate` - Run migrations
- `bun run db:push` - Push schema changes directly to database
- `bun run db:studio` - Open Drizzle Studio

## Environment Variables

See `.env.example` for all required environment variables.

## Tech Stack

- **Runtime**: Bun.js
- **Framework**: Hono
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Validation**: Zod
- **Authentication**: JWT
- **Password Hashing**: bcryptjs
# grably-auth-service
