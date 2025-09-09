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
pub struct DashboardCard {
    pub title: String,
    pub value: String,
    pub description: String,
    pub icon: String,
    pub color: String, // For styling
}

#[derive(Debug, Serialize)]
pub struct DashboardResponse {
    pub data: Vec<DashboardCard>,
}

pub async fn get_dashboard_summary(
    State(_app_state): State<Arc<AppState>>,
    auth_user: AuthUser,
) -> ApiResult<impl IntoResponse> {
    let cards = match get_user_type(&auth_user) {
        "admin" => get_admin_cards().await,
        "teacher" => get_teacher_cards(&auth_user).await,
        "student" => get_student_cards(&auth_user).await,
        "parent" => get_guardian_cards(&auth_user).await,
        _ => vec![],
    };

    let response = DashboardResponse { data: cards };
    Ok(Json(response))
}

fn get_user_type(auth_user: &AuthUser) -> &str {
    if auth_user.has_role("admin") {
        "admin"
    } else if auth_user.has_role("teacher") {
        "teacher"
    } else if auth_user.has_role("student") {
        "student"
    } else if auth_user.has_role("parent") {
        "parent"
    } else {
        "unknown"
    }
}

async fn get_admin_cards() -> Vec<DashboardCard> {
    vec![
        DashboardCard {
            title: "Total Users".to_string(),
            value: "1,234".to_string(),
            description: "Active users in system".to_string(),
            icon: "users".to_string(),
            color: "blue".to_string(),
        },
        DashboardCard {
            title: "Active Classes".to_string(),
            value: "45".to_string(),
            description: "Currently active classes".to_string(),
            icon: "book".to_string(),
            color: "green".to_string(),
        },
        DashboardCard {
            title: "Attendance Rate".to_string(),
            value: "94.2%".to_string(),
            description: "Overall attendance this month".to_string(),
            icon: "calendar".to_string(),
            color: "purple".to_string(),
        },
        DashboardCard {
            title: "System Health".to_string(),
            value: "Optimal".to_string(),
            description: "All systems operational".to_string(),
            icon: "activity".to_string(),
            color: "emerald".to_string(),
        },
    ]
}

async fn get_teacher_cards(_auth_user: &AuthUser) -> Vec<DashboardCard> {
    // In a real app, you'd query based on auth_user.context (class assignments)
    vec![
        DashboardCard {
            title: "My Classes".to_string(),
            value: "3".to_string(),
            description: "Classes assigned to you".to_string(),
            icon: "book".to_string(),
            color: "blue".to_string(),
        },
        DashboardCard {
            title: "Today's Attendance".to_string(),
            value: "87/92".to_string(),
            description: "Students present today".to_string(),
            icon: "check".to_string(),
            color: "green".to_string(),
        },
        DashboardCard {
            title: "Pending Grades".to_string(),
            value: "12".to_string(),
            description: "Assignments to grade".to_string(),
            icon: "award".to_string(),
            color: "orange".to_string(),
        },
        DashboardCard {
            title: "Class Average".to_string(),
            value: "B+".to_string(),
            description: "Overall class performance".to_string(),
            icon: "trending-up".to_string(),
            color: "purple".to_string(),
        },
    ]
}

async fn get_student_cards(_auth_user: &AuthUser) -> Vec<DashboardCard> {
    vec![
        DashboardCard {
            title: "My Classes Today".to_string(),
            value: "6".to_string(),
            description: "Scheduled classes for today".to_string(),
            icon: "calendar".to_string(),
            color: "blue".to_string(),
        },
        DashboardCard {
            title: "Attendance Rate".to_string(),
            value: "96.8%".to_string(),
            description: "Your attendance this semester".to_string(),
            icon: "check".to_string(),
            color: "green".to_string(),
        },
        DashboardCard {
            title: "Current GPA".to_string(),
            value: "3.7".to_string(),
            description: "Grade point average".to_string(),
            icon: "award".to_string(),
            color: "purple".to_string(),
        },
        DashboardCard {
            title: "Upcoming Tests".to_string(),
            value: "2".to_string(),
            description: "Tests scheduled this week".to_string(),
            icon: "file-text".to_string(),
            color: "orange".to_string(),
        },
    ]
}

async fn get_guardian_cards(_auth_user: &AuthUser) -> Vec<DashboardCard> {
    // In a real app, you'd query based on auth_user.context (children IDs)
    vec![
        DashboardCard {
            title: "Children".to_string(),
            value: "2".to_string(),
            description: "Students you're guardian for".to_string(),
            icon: "users".to_string(),
            color: "blue".to_string(),
        },
        DashboardCard {
            title: "Attendance This Week".to_string(),
            value: "9/10".to_string(),
            description: "Combined attendance".to_string(),
            icon: "calendar".to_string(),
            color: "green".to_string(),
        },
        DashboardCard {
            title: "Recent Grades".to_string(),
            value: "A-".to_string(),
            description: "Latest grade average".to_string(),
            icon: "award".to_string(),
            color: "purple".to_string(),
        },
        DashboardCard {
            title: "Notifications".to_string(),
            value: "3".to_string(),
            description: "Unread school notifications".to_string(),
            icon: "bell".to_string(),
            color: "red".to_string(),
        },
    ]
}