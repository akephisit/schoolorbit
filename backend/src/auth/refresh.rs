use sqlx::PgPool;
use uuid::Uuid;
use chrono::{DateTime, Utc, Duration};
use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use crate::util::crypto::generate_secure_token;

#[derive(Debug, sqlx::FromRow)]
pub struct AuthSession {
    pub id: Uuid,
    pub user_id: Uuid,
    pub refresh_hash: String,
    pub user_agent: Option<String>,
    pub ip: Option<String>,
    pub created_at: DateTime<Utc>,
    pub rotated_at: Option<DateTime<Utc>>,
    pub expires_at: DateTime<Utc>,
    pub revoked_at: Option<DateTime<Utc>>,
}

pub struct RefreshService {
    pool: PgPool,
}

impl RefreshService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn create_session(
        &self,
        user_id: Uuid,
        user_agent: Option<String>,
        ip: Option<String>,
    ) -> anyhow::Result<(Uuid, String)> {
        let session_id = Uuid::new_v4();
        let refresh_token = generate_secure_token();
        let expires_at = Utc::now() + Duration::days(14);
        
        // Hash the refresh token
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();
        let refresh_hash = argon2
            .hash_password(refresh_token.as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("Password hashing failed: {}", e))?
            .to_string();

        sqlx::query!(
            r#"
            INSERT INTO auth_session (id, user_id, refresh_hash, user_agent, ip, expires_at)
            VALUES ($1, $2, $3, $4, $5, $6)
            "#,
            session_id,
            user_id,
            refresh_hash,
            user_agent,
            ip.as_deref(),
            expires_at
        )
        .execute(&self.pool)
        .await?;

        Ok((session_id, refresh_token))
    }

    pub async fn verify_and_rotate(
        &self,
        refresh_token: &str,
    ) -> anyhow::Result<(Uuid, String)> {
        // Find all active sessions with this token hash
        let sessions = sqlx::query_as!(
            AuthSession,
            r#"
            SELECT id, user_id, refresh_hash, user_agent, ip, 
                   created_at, rotated_at, expires_at, revoked_at
            FROM auth_session
            WHERE revoked_at IS NULL AND expires_at > NOW()
            "#
        )
        .fetch_all(&self.pool)
        .await?;

        let mut matching_session = None;
        let argon2 = Argon2::default();
        
        for session in sessions {
            if let Ok(parsed_hash) = PasswordHash::new(&session.refresh_hash) {
                if argon2.verify_password(refresh_token.as_bytes(), &parsed_hash).is_ok() {
                    matching_session = Some(session);
                    break;
                }
            }
        }

        let session = matching_session.ok_or_else(|| {
            anyhow::anyhow!("Invalid or expired refresh token")
        })?;

        // Check for token reuse (security issue)
        if session.rotated_at.is_some() {
            // Token reuse detected - revoke all sessions for this user
            sqlx::query!(
                "UPDATE auth_session SET revoked_at = NOW() WHERE user_id = $1",
                session.user_id
            )
            .execute(&self.pool)
            .await?;
            
            return Err(anyhow::anyhow!("Token reuse detected - all sessions revoked"));
        }

        // Generate new refresh token
        let new_refresh_token = generate_secure_token();
        let salt = SaltString::generate(&mut OsRng);
        let new_refresh_hash = argon2
            .hash_password(new_refresh_token.as_bytes(), &salt)
            .map_err(|e| anyhow::anyhow!("Password hashing failed: {}", e))?
            .to_string();

        // Mark old session as rotated and update with new hash
        sqlx::query!(
            r#"
            UPDATE auth_session 
            SET rotated_at = NOW(), refresh_hash = $1
            WHERE id = $2
            "#,
            new_refresh_hash,
            session.id
        )
        .execute(&self.pool)
        .await?;

        Ok((session.user_id, new_refresh_token))
    }

    pub async fn revoke_session(&self, session_id: Uuid) -> anyhow::Result<()> {
        sqlx::query!(
            "UPDATE auth_session SET revoked_at = NOW() WHERE id = $1",
            session_id
        )
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    pub async fn revoke_user_sessions(&self, user_id: Uuid) -> anyhow::Result<()> {
        sqlx::query!(
            "UPDATE auth_session SET revoked_at = NOW() WHERE user_id = $1",
            user_id
        )
        .execute(&self.pool)
        .await?;
        
        Ok(())
    }

    pub async fn cleanup_expired(&self) -> anyhow::Result<u64> {
        let result = sqlx::query!(
            "DELETE FROM auth_session WHERE expires_at < NOW() OR revoked_at < NOW() - INTERVAL '7 days'"
        )
        .execute(&self.pool)
        .await?;

        Ok(result.rows_affected())
    }
}