use serde::{Serialize, Deserialize};
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Role {
    pub id: Uuid,
    pub code: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, sqlx::FromRow)]
pub struct Permission {
    pub id: Uuid,
    pub code: String,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserPermissions {
    pub user_id: Uuid,
    pub roles: Vec<String>,
    pub permissions: Vec<String>,
    pub context: Option<serde_json::Value>,
}

pub const PERMISSIONS: &[(&str, &str)] = &[
    ("user:manage", "Manage users and profiles"),
    ("class:read", "View class information"),
    ("class:write", "Create and edit classes"),
    ("attend:read", "View attendance records"),
    ("attend:write", "Record attendance"),
    ("grade:read", "View grades and assessments"),
    ("grade:write", "Enter and modify grades"),
    ("report:read", "View reports and analytics"),
    ("system:admin", "System administration access"),
];

pub const ROLES: &[(&str, &str, &[&str])] = &[
    ("admin", "System Administrator", &[
        "user:manage", "class:read", "class:write", "attend:read", "attend:write",
        "grade:read", "grade:write", "report:read", "system:admin"
    ]),
    ("teacher", "Teacher", &[
        "class:read", "attend:read", "attend:write", "grade:read", "grade:write"
    ]),
    ("student", "Student", &[
        "class:read", "attend:read", "grade:read"
    ]),
    ("parent", "Parent/Guardian", &[
        "attend:read", "grade:read"
    ]),
];