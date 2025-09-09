use axum::{
    extract::State,
    http::{StatusCode, HeaderMap},
    response::IntoResponse,
    Json,
};
use axum_extra::extract::CookieJar;
use serde::{Deserialize, Serialize};
use sqlx::PgPool;
use uuid::Uuid;
use argon2::{Argon2, PasswordHash, PasswordVerifier};
use std::sync::Arc;

use crate::{
    auth::{JwtService, CookieConfig, Claims, RefreshService, AuthUser},
    auth::{create_access_token_cookie, create_refresh_token_cookie, create_csrf_cookie, clear_auth_cookies},
    rbac::RbacService,
    util::crypto::{hash_national_id, generate_secure_token},
    error::{ApiError, ApiResult},
    config::Config,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginRequest {
    pub actor_type: String, // "personnel", "student", "guardian"
    pub id: String,         // national_id for personnel/guardian, student_code for student
    pub password: Option<String>,
    pub otp: Option<String>,
    pub school_id: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginResponse {
    pub data: LoginData,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LoginData {
    pub user_id: Uuid,
    pub roles: Vec<String>,
    pub perms: Vec<String>,
    pub ctx: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    pub data: MeData,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MeData {
    pub user: UserInfo,
    pub roles: Vec<String>,
    pub perms: Vec<String>,
    pub ctx: Option<serde_json::Value>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UserInfo {
    pub id: Uuid,
    pub email: Option<String>,
    pub display_name: String,
}

pub async fn login(
    State(app_state): State<Arc<AppState>>,
    _jar: CookieJar,
    Json(req): Json<LoginRequest>,
) -> ApiResult<impl IntoResponse> {
    // Validate request
    if req.actor_type.is_empty() || req.id.is_empty() {
        return Err(ApiError::bad_request("Missing required fields"));
    }

    match req.password {
        Some(password) if password.is_empty() => {
            return Err(ApiError::bad_request("Password cannot be empty"));
        },
        None if req.otp.is_none() => {
            return Err(ApiError::bad_request("Either password or OTP is required"));
        },
        _ => {}
    }

    // For now, we'll use a fixed school_id for development
    let school_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")
        .map_err(|_| ApiError::bad_request("Invalid school ID"))?;

    let user_id = match req.actor_type.as_str() {
        "personnel" => authenticate_personnel(&app_state.pool, &req.id, req.password.as_deref()).await?,
        "student" => authenticate_student(&app_state.pool, &req.id, req.password.as_deref()).await?,
        "guardian" => authenticate_guardian(&app_state.pool, &req.id, req.password.as_deref(), req.otp.as_deref()).await?,
        _ => return Err(ApiError::bad_request("Invalid actor type")),
    };

    // Get user permissions
    let permissions = app_state.rbac_service.get_user_permissions(user_id).await?;
    
    // Create JWT claims
    let claims = Claims::new(
        user_id,
        school_id,
        permissions.roles.clone(),
        permissions.permissions.clone(),
        permissions.context.clone(),
    );

    // Create tokens
    let access_token = app_state.jwt_service.create_token(&claims)?;
    let (_session_id, refresh_token) = app_state.refresh_service
        .create_session(user_id, None, None)
        .await?;
    let csrf_token = generate_secure_token();

    // Set cookies
    let cookie_config = CookieConfig::from_domain(app_state.config.cookie_domain.clone());
    let mut headers = HeaderMap::new();
    headers.insert("set-cookie", create_access_token_cookie(&access_token, &cookie_config));
    headers.append("set-cookie", create_refresh_token_cookie(&refresh_token, &cookie_config));
    headers.append("set-cookie", create_csrf_cookie(&csrf_token, &cookie_config));

    let response = LoginResponse {
        data: LoginData {
            user_id,
            roles: permissions.roles,
            perms: permissions.permissions,
            ctx: permissions.context,
        },
    };

    Ok((headers, Json(response)))
}

async fn authenticate_personnel(
    pool: &PgPool,
    national_id: &str,
    password: Option<&str>,
) -> ApiResult<Uuid> {
    let password = password.ok_or_else(|| ApiError::bad_request("Password required for personnel"))?;
    
    // Hash the national ID for lookup
    let national_id_hash = hash_national_id(national_id, "demo_salt");
    
    let user = sqlx::query!(
        r#"
        SELECT au.id, au.password_hash
        FROM app_user au
        JOIN personnel_profile pp ON au.id = pp.user_id
        WHERE pp.national_id_hash = $1 AND au.status = 'active'
        "#,
        national_id_hash
    )
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::bad_request("Invalid credentials"))?;

    let password_hash = user.password_hash
        .ok_or_else(|| ApiError::bad_request("Account not configured for password login"))?;

    // Verify password
    let parsed_hash = PasswordHash::new(&password_hash)
        .map_err(|_| ApiError::internal_error())?;
    
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::bad_request("Invalid credentials"))?;

    Ok(user.id)
}

async fn authenticate_student(
    pool: &PgPool,
    student_code: &str,
    password: Option<&str>,
) -> ApiResult<Uuid> {
    let password = password.ok_or_else(|| ApiError::bad_request("Password required for student"))?;
    
    let user = sqlx::query!(
        r#"
        SELECT au.id, au.password_hash
        FROM app_user au
        JOIN student_profile sp ON au.id = sp.user_id
        WHERE sp.student_code = $1 AND au.status = 'active'
        "#,
        student_code
    )
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::bad_request("Invalid credentials"))?;

    let password_hash = user.password_hash
        .ok_or_else(|| ApiError::bad_request("Account not configured for password login"))?;

    // Verify password
    let parsed_hash = PasswordHash::new(&password_hash)
        .map_err(|_| ApiError::internal_error())?;
    
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::bad_request("Invalid credentials"))?;

    Ok(user.id)
}

async fn authenticate_guardian(
    pool: &PgPool,
    national_id: &str,
    password: Option<&str>,
    _otp: Option<&str>,
) -> ApiResult<Uuid> {
    // For now, just implement password auth. OTP can be added later.
    let password = password.ok_or_else(|| ApiError::bad_request("Password required for guardian"))?;
    
    // Hash the national ID for lookup
    let national_id_hash = hash_national_id(national_id, "demo_salt");
    
    let user = sqlx::query!(
        r#"
        SELECT au.id, au.password_hash
        FROM app_user au
        JOIN guardian_profile gp ON au.id = gp.user_id
        WHERE gp.national_id_hash = $1 AND au.status = 'active'
        "#,
        national_id_hash
    )
    .fetch_optional(pool)
    .await?
    .ok_or_else(|| ApiError::bad_request("Invalid credentials"))?;

    let password_hash = user.password_hash
        .ok_or_else(|| ApiError::bad_request("Account not configured for password login"))?;

    // Verify password
    let parsed_hash = PasswordHash::new(&password_hash)
        .map_err(|_| ApiError::internal_error())?;
    
    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .map_err(|_| ApiError::bad_request("Invalid credentials"))?;

    Ok(user.id)
}

pub async fn refresh(
    State(app_state): State<Arc<AppState>>,
    jar: CookieJar,
) -> ApiResult<impl IntoResponse> {
    let refresh_token = jar
        .get("rt")
        .and_then(|cookie| Some(cookie.value()))
        .ok_or_else(|| ApiError::unauthorized())?;

    let (user_id, new_refresh_token) = app_state.refresh_service
        .verify_and_rotate(refresh_token)
        .await
        .map_err(|_| ApiError::unauthorized())?;

    // Get updated user permissions
    let permissions = app_state.rbac_service.get_user_permissions(user_id).await?;
    
    // For now, use fixed school_id
    let school_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001").unwrap();
    
    // Create new JWT
    let claims = Claims::new(
        user_id,
        school_id,
        permissions.roles,
        permissions.permissions,
        permissions.context,
    );

    let access_token = app_state.jwt_service.create_token(&claims)?;

    // Set new cookies
    let cookie_config = CookieConfig::from_domain(app_state.config.cookie_domain.clone());
    let mut headers = HeaderMap::new();
    headers.insert("set-cookie", create_access_token_cookie(&access_token, &cookie_config));
    headers.append("set-cookie", create_refresh_token_cookie(&new_refresh_token, &cookie_config));

    Ok((StatusCode::NO_CONTENT, headers))
}

pub async fn logout(
    State(app_state): State<Arc<AppState>>,
    _jar: CookieJar,
    auth_user: AuthUser,
) -> ApiResult<impl IntoResponse> {
    // Revoke user sessions
    app_state.refresh_service.revoke_user_sessions(auth_user.user_id).await?;

    // Clear cookies
    let cookie_config = CookieConfig::from_domain(app_state.config.cookie_domain.clone());
    let clear_cookies = clear_auth_cookies(&cookie_config);
    
    let mut headers = HeaderMap::new();
    for cookie in clear_cookies {
        headers.append("set-cookie", cookie);
    }

    Ok((StatusCode::NO_CONTENT, headers))
}

pub async fn me(
    State(app_state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> ApiResult<impl IntoResponse> {
    let user = sqlx::query!(
        r#"
        SELECT id, email, display_name
        FROM app_user
        WHERE id = $1 AND status = 'active'
        "#,
        auth_user.user_id
    )
    .fetch_optional(&app_state.pool)
    .await?
    .ok_or_else(|| ApiError::not_found())?;

    let response = MeResponse {
        data: MeData {
            user: UserInfo {
                id: user.id,
                email: user.email,
                display_name: user.display_name,
            },
            roles: auth_user.roles,
            perms: auth_user.permissions,
            ctx: auth_user.context,
        },
    };

    Ok(Json(response))
}

// App state structure (we'll need to create this in main.rs)
pub struct AppState {
    pub pool: PgPool,
    pub jwt_service: JwtService,
    pub refresh_service: RefreshService,
    pub rbac_service: RbacService,
    pub config: Config,
}