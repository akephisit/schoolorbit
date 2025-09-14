# SchoolOrbit

Modern school management system built with SvelteKit and Drizzle ORM.

## Tech Stack

- **Frontend**: SvelteKit 5 with TypeScript
- **Database**: Neon PostgreSQL with Drizzle ORM
- **Authentication**: JWT with HttpOnly cookies
- **Deployment**: Vercel Serverless (Singapore region)
- **UI**: Tailwind CSS with shadcn/ui components

## Environment Setup

Create a `.env` file with:

```env
DATABASE_URL="your-neon-db-url"
JWT_SECRET="your-jwt-secret"
CORS_ALLOWED_ORIGINS="http://localhost:5173"
PUBLIC_APP_NAME="SchoolOrbit"
# Salt for national ID hashing (required for personnel/guardian login)
NATIONAL_ID_SALT="your_national_id_salt"
```

- In development, restart `npm run dev` after changing `.env` so values are reloaded.
- In production (Vercel), set ENV in Project Settings. The app reads runtime variables (dynamic env), so redeploy after changes.

## Development

```sh
# Install dependencies
npm install

# Generate database schema
npm run db:generate

# Run migrations
npm run db:migrate

# Start development server
npm run dev
```

## Database Management

```sh
# Generate new migration
npm run db:generate

# Run migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

- Run migrations against a specific database by prefixing the command:
  - `DATABASE_URL='postgres://...' npm run db:migrate`
- If migration errors on `gen_random_uuid()`, enable the extension in your DB:
  - `CREATE EXTENSION IF NOT EXISTS pgcrypto;`

## Test Data Seeding

Seed example users for local testing (admin, teacher, student, guardian):

```sh
# Ensure .env has DATABASE_URL set to your Neon/Postgres
# Optional: set NATIONAL_ID_SALT for hashing national IDs
npm run seed:users
```

Default credentials (all use the same password `12345678`):

- teacher@school.test
- student@school.test
- parent@school.test
- admin@school.test

- Note: Personnel/Guardian login uses national ID (13 digits), Student uses student code.
- Ensure `NATIONAL_ID_SALT` matches the one used during seeding; otherwise ID lookups won’t match.

## Auth Notes

- Access/Refresh cookies: `at` (HttpOnly, 15m) and `rt` (HttpOnly, 14d).
- Refresh tokens use the format `sessionId.secret` and rotate on use.
- Legacy refresh tokens are no longer supported; users may need to log in again after deploy.

## Production Notes

- Uses Neon HTTP driver with connection caching (no WebSockets) for Vercel serverless.
- Required ENV in production: `DATABASE_URL`, `JWT_SECRET`, `NATIONAL_ID_SALT`.
- If you see auth query errors in logs, verify ENV values and that migrations ran on the right database.

## Housekeeping

- Deprecated scripts removed: `check-users.ts`, `debug-db.ts`, `seed-users.ts`.
- Use only `scripts/seed-users.mjs` via `npm run seed:users`.

## Deployment

Optimized for Vercel serverless deployment:

```sh
# Build and deploy
npm run vercel-build
```

The project is configured for Singapore region (sin1) with Node.js 20.x runtime for optimal performance in Asia.
