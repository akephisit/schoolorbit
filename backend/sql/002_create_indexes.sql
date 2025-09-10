-- Indexes for performance and constraints

-- Unique index on student_code
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_profile_student_code ON student_profile(student_code);

-- Index on student_profile for class queries
CREATE INDEX IF NOT EXISTS idx_student_profile_class_student ON student_profile(class_id, student_code);

-- Unique index on personnel national_id_hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_personnel_profile_national_id_hash ON personnel_profile(national_id_hash);

-- Unique index on guardian national_id_hash
CREATE UNIQUE INDEX IF NOT EXISTS idx_guardian_profile_national_id_hash ON guardian_profile(national_id_hash);

-- Partial index on active users for performance
CREATE INDEX IF NOT EXISTS idx_app_user_active_status ON app_user(status) WHERE status = 'active';

-- Indexes on auth_session for cleanup and lookups
CREATE INDEX IF NOT EXISTS idx_auth_session_user_id ON auth_session(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_session_expires_at ON auth_session(expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_session_refresh_hash ON auth_session(refresh_hash);

-- Index on user_role for permission checks
CREATE INDEX IF NOT EXISTS idx_user_role_user_id ON user_role(user_id);

-- Index on role_permission for permission resolution
CREATE INDEX IF NOT EXISTS idx_role_permission_role_id ON role_permission(role_id);