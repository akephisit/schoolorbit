use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
    async_trait,
};
use axum_extra::extract::CookieJar;
use uuid::Uuid;
use std::sync::Arc;
use crate::auth::jwt::JwtService;

#[derive(Debug, Clone)]
pub struct AuthUser {
    pub user_id: Uuid,
    pub tenant_id: Uuid,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub context: Option<serde_json::Value>,
}

impl AuthUser {
    pub fn has_permission(&self, permission: &str) -> bool {
        self.permissions.iter().any(|p| p == permission)
    }

    pub fn has_any_permission(&self, permissions: &[&str]) -> bool {
        permissions.iter().any(|&p| self.has_permission(p))
    }

    pub fn has_role(&self, role: &str) -> bool {
        self.roles.iter().any(|r| r == role)
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        // Get JWT service from app state (we'll need to add this to app state)
        let jwt_service = parts
            .extensions
            .get::<Arc<JwtService>>()
            .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?
            .clone();

        let jar = CookieJar::from_request_parts(parts, state)
            .await
            .map_err(|_| StatusCode::UNAUTHORIZED)?;

        let access_token = jar
            .get("at")
            .and_then(|cookie| Some(cookie.value()))
            .ok_or(StatusCode::UNAUTHORIZED)?;

        let claims = jwt_service
            .verify_token(access_token)
            .map_err(|_| StatusCode::UNAUTHORIZED)?;

        Ok(AuthUser {
            user_id: claims.sub,
            tenant_id: claims.tenant,
            roles: claims.roles,
            permissions: claims.perms,
            context: claims.ctx,
        })
    }
}

pub struct RequirePermission(pub String);

#[async_trait]
impl<S> FromRequestParts<S> for RequirePermission
where
    S: Send + Sync,
{
    type Rejection = StatusCode;

    async fn from_request_parts(parts: &mut Parts, state: &S) -> Result<Self, Self::Rejection> {
        let _auth_user = AuthUser::from_request_parts(parts, state).await?;
        
        // This is a marker - the actual permission check happens in route handlers
        Ok(RequirePermission(String::new()))
    }
}