use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use uuid::Uuid;

#[derive(Debug)]
pub struct ApiError {
    pub status: StatusCode,
    pub code: String,
    pub title: String,
    pub detail: Option<String>,
    pub fields: Option<serde_json::Value>,
}

impl ApiError {
    pub fn new(status: StatusCode, code: &str, title: &str) -> Self {
        Self {
            status,
            code: code.to_string(),
            title: title.to_string(),
            detail: None,
            fields: None,
        }
    }

    pub fn with_detail(mut self, detail: &str) -> Self {
        self.detail = Some(detail.to_string());
        self
    }

    pub fn with_fields(mut self, fields: serde_json::Value) -> Self {
        self.fields = Some(fields);
        self
    }

    pub fn unauthorized() -> Self {
        Self::new(StatusCode::UNAUTHORIZED, "UNAUTHORIZED", "Authentication required")
    }

    pub fn forbidden() -> Self {
        Self::new(StatusCode::FORBIDDEN, "FORBIDDEN", "Access denied")
    }

    pub fn not_found() -> Self {
        Self::new(StatusCode::NOT_FOUND, "NOT_FOUND", "Resource not found")
    }

    pub fn bad_request(detail: &str) -> Self {
        Self::new(StatusCode::BAD_REQUEST, "BAD_REQUEST", "Invalid request")
            .with_detail(detail)
    }

    pub fn validation_error(fields: serde_json::Value) -> Self {
        Self::new(StatusCode::BAD_REQUEST, "VALIDATION_ERROR", "Validation failed")
            .with_fields(fields)
    }

    pub fn internal_error() -> Self {
        Self::new(StatusCode::INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "Internal server error")
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let trace_id = Uuid::new_v4();
        
        let mut problem = json!({
            "type": "about:blank",
            "title": self.title,
            "status": self.status.as_u16(),
            "code": self.code,
            "traceId": trace_id
        });

        if let Some(detail) = self.detail {
            problem["detail"] = json!(detail);
        }

        if let Some(fields) = self.fields {
            problem["fields"] = fields;
        }

        (
            self.status,
            [("content-type", "application/problem+json")],
            Json(problem)
        ).into_response()
    }
}

impl From<anyhow::Error> for ApiError {
    fn from(error: anyhow::Error) -> Self {
        tracing::error!("Internal error: {:?}", error);
        Self::internal_error()
    }
}

impl From<sqlx::Error> for ApiError {
    fn from(error: sqlx::Error) -> Self {
        tracing::error!("Database error: {:?}", error);
        Self::internal_error()
    }
}

pub type ApiResult<T> = Result<T, ApiError>;