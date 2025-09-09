-- Meta database schema for tenant routing
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Domain to tenant mapping
CREATE TABLE tenant_domain_map (
    school_id UUID NOT NULL,
    domain TEXT PRIMARY KEY,
    is_primary BOOLEAN DEFAULT TRUE NOT NULL
);

-- Tenant database connection mapping  
CREATE TABLE tenant_db_map (
    school_id UUID PRIMARY KEY,
    dsn TEXT NOT NULL,
    mode TEXT DEFAULT 'per_db' NOT NULL,
    schema_version INTEGER DEFAULT 0 NOT NULL,
    status TEXT DEFAULT 'active' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);