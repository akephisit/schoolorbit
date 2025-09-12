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
```

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

## Deployment

Optimized for Vercel serverless deployment:

```sh
# Build and deploy
npm run vercel-build
```

The project is configured for Singapore region (sin1) with Node.js 20.x runtime for optimal performance in Asia.
