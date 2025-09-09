-- Create extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Main user table
CREATE TABLE app_user (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE,
    phone TEXT UNIQUE,
    password_hash TEXT,
    status TEXT DEFAULT 'active' NOT NULL,
    display_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    
    CONSTRAINT app_user_contact_check CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Roles table
CREATE TABLE role (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL
);

-- Permissions table
CREATE TABLE permission (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL
);

-- Role-Permission mapping
CREATE TABLE role_permission (
    role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permission(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- User-Role mapping
CREATE TABLE user_role (
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES role(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Personnel profile
CREATE TABLE personnel_profile (
    user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    national_id_hash TEXT UNIQUE NOT NULL,
    national_id_enc BYTEA NOT NULL,
    personnel_no TEXT UNIQUE,
    position_title TEXT,
    is_teacher BOOLEAN DEFAULT FALSE NOT NULL,
    department_id UUID
);

-- Student profile
CREATE TABLE student_profile (
    user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    student_code TEXT UNIQUE NOT NULL,
    class_id UUID
);

-- Guardian profile
CREATE TABLE guardian_profile (
    user_id UUID PRIMARY KEY REFERENCES app_user(id) ON DELETE CASCADE,
    national_id_hash TEXT UNIQUE NOT NULL,
    national_id_enc BYTEA NOT NULL,
    phone TEXT
);

-- Student-Guardian relationship
CREATE TABLE student_guardian (
    student_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    guardian_user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    relation TEXT NOT NULL,
    PRIMARY KEY (student_user_id, guardian_user_id)
);

-- Authentication sessions
CREATE TABLE auth_session (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    refresh_hash TEXT NOT NULL,
    user_agent TEXT,
    ip INET,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    rotated_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ
);