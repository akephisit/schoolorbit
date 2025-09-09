# SchoolOrbit

A comprehensive school management system built with modern technologies, featuring multi-tenancy, role-based access control (RBAC), and secure authentication.

## Architecture

- **Frontend**: SvelteKit + TypeScript + Tailwind CSS + shadcn-svelte
- **Backend**: Rust + Axum + SQLx + PostgreSQL
- **Authentication**: JWT (15min access) + HttpOnly refresh tokens (14d, rotating)
- **Authorization**: Role-Based Access Control (RBAC) with light Attribute-Based Access Control (ABAC)
- **Multi-tenancy**: One PostgreSQL database per school with meta database for routing

## Features

### Authentication & Authorization
- 3 login portals: Personnel, Student, Guardian
- Secure JWT + rotating refresh token authentication
- HttpOnly cookies for token storage
- CSRF protection with double-submit cookie pattern
- Role-based permissions system

### User Roles & Permissions
- **Admin**: Full system access, user management
- **Teacher**: Class management, attendance, grading  
- **Student**: View classes, attendance, grades
- **Guardian**: View child's attendance and grades

### Multi-tenant Architecture
- Single codebase serves multiple schools
- Per-tenant database isolation
- Meta database for domain routing
- Tenant-specific branding (ready for customization)

### Security Features
- Password hashing with Argon2id
- National ID encryption with AES-GCM
- SHA256 hashing for ID lookups
- Secure token generation
- CORS protection
- Rate limiting (ready for implementation)

## Database Schema

### Core Tables
- `app_user`: Unified user accounts
- `personnel_profile`, `student_profile`, `guardian_profile`: Role-specific data
- `role`, `permission`, `role_permission`, `user_role`: RBAC system
- `auth_session`: Refresh token management
- `student_guardian`: Student-guardian relationships

### Meta Database
- `tenant_domain_map`: Domain to school mapping
- `tenant_db_map`: School to database connection mapping

## Quick Start

### Prerequisites
- Rust 1.70+
- Node.js 18+
- PostgreSQL 14+
- pnpm

### Database Setup
```bash
# Create databases
createdb meta
createdb school_demo
```

### Backend Setup
```bash
cd backend
cp .env.example .env

# Install dependencies and run migrations
cargo build
cargo run --bin migrate

# Seed demo data
cargo run --bin seed

# Start server (port 8787)
cargo run
```

### Frontend Setup
```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev  # Starts on port 5173
```

### Access the Application
Navigate to http://localhost:5173

## Demo Accounts

| Role | Login | Password |
|------|-------|----------|
| Admin | admin@demo | Passw0rd! |
| Teacher | teacher@demo | Passw0rd! |
| Student | STD-650123 | Passw0rd! |
| Guardian | parent@demo | Passw0rd! |

### Login Portals
- Personnel: http://localhost:5173/login/personnel
- Students: http://localhost:5173/login/student  
- Guardians: http://localhost:5173/login/guardian

## API Endpoints

### Authentication
- `POST /auth/login` - Login with credentials
- `POST /auth/refresh` - Rotate refresh token
- `POST /auth/logout` - Revoke session and clear cookies
- `GET /auth/me` - Get current user info

### Protected Routes
- `GET /menu` - Get navigation menu (filtered by permissions)
- `GET /dashboard/summary` - Get dashboard cards (role-specific)

### API Response Format
**Success:**
```json
{
  "data": { ... },
  "meta": { ... }  // optional
}
```

**Error (RFC 7807 Problem Details):**
```json
{
  "type": "about:blank",
  "title": "Error message",
  "status": 400,
  "code": "ERROR_CODE",
  "detail": "Detailed description",
  "traceId": "uuid"
}
```

## Development

### Running Tests
```bash
# Backend tests
cd backend
cargo test

# Frontend tests  
cd frontend
pnpm test
```

### Code Quality
```bash
# Backend linting
cargo fmt
cargo clippy

# Frontend linting
pnpm lint
pnpm check
```

## Deployment

### Environment Variables

**Backend (.env):**
```
META_DATABASE_URL=postgres://user:pass@host:5432/meta
DEFAULT_TENANT_DB=postgres://user:pass@host:5432/school_demo  
JWT_SECRET=your-256-bit-secret-key
COOKIE_DOMAIN=.yourschool.app
CORS_ALLOWED_ORIGINS=https://yourschool.app
PORT=8787
AES_KEY_HEX=64-char-hex-string-for-aes-gcm-encryption
```

**Frontend (.env):**
```
PUBLIC_API_BASE=https://api.yourschool.app
PUBLIC_APP_NAME=YourSchool
```

### Production Considerations
- Use secure cookies with Domain attribute
- Enable HTTPS everywhere  
- Set up proper CORS origins
- Configure rate limiting
- Set up database connection pooling
- Implement proper logging and monitoring
- Set up automated backups

## Architecture Notes

### Security
- Access tokens (JWT) expire in 15 minutes
- Refresh tokens are opaque, hashed with Argon2, and rotate on use
- Token reuse detection revokes all user sessions
- National IDs are encrypted at rest and hashed for lookups
- CSRF protection via double-submit cookie pattern

### Multi-tenancy
- Each school gets its own database for data isolation
- Meta database routes requests to correct tenant database
- Local development uses single tenant with localhost domain
- Production ready for multiple schools with custom domains

### Performance
- Database indexes on frequently queried fields
- Connection pooling with configurable limits
- Efficient permission checking with JWTs
- Client-side menu filtering as fallback security

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.