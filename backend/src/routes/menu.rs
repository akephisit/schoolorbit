use axum::{
    extract::State,
    response::IntoResponse,
    Json,
};
use serde::{Serialize, Deserialize};
use std::sync::Arc;

use crate::{
    auth::AuthUser,
    error::ApiResult,
    routes::auth::AppState,
};

#[derive(Debug, Serialize, Deserialize)]
pub struct MenuItem {
    pub label: String,
    pub href: String,
    pub icon: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub requires: Option<Vec<String>>,
}

#[derive(Debug, Serialize)]
pub struct MenuResponse {
    pub data: Vec<MenuItem>,
}

pub async fn get_menu(
    State(_app_state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> ApiResult<impl IntoResponse> {
    let menu_items = vec![
        MenuItem {
            label: "Dashboard".to_string(),
            href: "/dashboard".to_string(),
            icon: "home".to_string(),
            requires: None, // Dashboard is accessible to all authenticated users
        },
        MenuItem {
            label: "Classes".to_string(),
            href: "/classes".to_string(),
            icon: "book".to_string(),
            requires: Some(vec!["class:read".to_string()]),
        },
        MenuItem {
            label: "Attendance".to_string(),
            href: "/attendance".to_string(),
            icon: "calendar".to_string(),
            requires: Some(vec!["attend:read".to_string()]),
        },
        MenuItem {
            label: "Record Attendance".to_string(),
            href: "/attendance/mark".to_string(),
            icon: "check".to_string(),
            requires: Some(vec!["attend:write".to_string()]),
        },
        MenuItem {
            label: "Grades".to_string(),
            href: "/grades".to_string(),
            icon: "award".to_string(),
            requires: Some(vec!["grade:read".to_string()]),
        },
        MenuItem {
            label: "Users".to_string(),
            href: "/users".to_string(),
            icon: "users".to_string(),
            requires: Some(vec!["user:manage".to_string()]),
        },
    ];

    // Filter menu items based on user permissions
    let filtered_items: Vec<MenuItem> = menu_items
        .into_iter()
        .filter(|item| {
            if let Some(required_perms) = &item.requires {
                // User needs at least one of the required permissions
                required_perms.iter().any(|perm| auth_user.has_permission(perm))
            } else {
                // No specific permissions required
                true
            }
        })
        .collect();

    let response = MenuResponse {
        data: filtered_items,
    };

    Ok(Json(response))
}