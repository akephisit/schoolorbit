use sqlx::PgPool;
use uuid::Uuid;
use crate::rbac::model::UserPermissions;

pub struct RbacService {
    pool: PgPool,
}

impl RbacService {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn get_user_permissions(&self, user_id: Uuid) -> anyhow::Result<UserPermissions> {
        // Get user roles
        let roles = sqlx::query!(
            r#"
            SELECT r.code
            FROM user_role ur
            JOIN role r ON ur.role_id = r.id
            WHERE ur.user_id = $1
            "#,
            user_id
        )
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .map(|row| row.code)
        .collect::<Vec<_>>();

        // Get permissions for those roles
        let permissions = sqlx::query!(
            r#"
            SELECT DISTINCT p.code
            FROM user_role ur
            JOIN role_permission rp ON ur.role_id = rp.role_id
            JOIN permission p ON rp.permission_id = p.id
            WHERE ur.user_id = $1
            "#,
            user_id
        )
        .fetch_all(&self.pool)
        .await?
        .into_iter()
        .map(|row| row.code)
        .collect::<Vec<_>>();

        // Get context based on user profile (e.g., teacher's class IDs)
        let context = self.get_user_context(user_id).await?;

        Ok(UserPermissions {
            user_id,
            roles,
            permissions,
            context,
        })
    }

    async fn get_user_context(&self, user_id: Uuid) -> anyhow::Result<Option<serde_json::Value>> {
        // Check if user is a teacher and get their class context
        let teacher_context = sqlx::query!(
            r#"
            SELECT personnel_no, is_teacher, department_id
            FROM personnel_profile
            WHERE user_id = $1 AND is_teacher = true
            "#,
            user_id
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(teacher) = teacher_context {
            // In a real app, you'd query for class assignments
            // For now, return mock class IDs
            return Ok(Some(serde_json::json!({
                "type": "teacher",
                "personnel_no": teacher.personnel_no,
                "department_id": teacher.department_id,
                "class_ids": ["class-1", "class-2"] // Mock data
            })));
        }

        // Check if user is a student
        let student_context = sqlx::query!(
            r#"
            SELECT student_code, class_id
            FROM student_profile
            WHERE user_id = $1
            "#,
            user_id
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(student) = student_context {
            return Ok(Some(serde_json::json!({
                "type": "student",
                "student_code": student.student_code,
                "class_id": student.class_id
            })));
        }

        // Check if user is a guardian
        let guardian_context = sqlx::query!(
            r#"
            SELECT ARRAY_AGG(sg.student_user_id) as children
            FROM guardian_profile gp
            JOIN student_guardian sg ON gp.user_id = sg.guardian_user_id
            WHERE gp.user_id = $1
            "#,
            user_id
        )
        .fetch_optional(&self.pool)
        .await?;

        if let Some(guardian) = guardian_context {
            if let Some(children) = guardian.children {
                return Ok(Some(serde_json::json!({
                    "type": "guardian",
                    "children": children
                })));
            }
        }

        Ok(None)
    }

    pub async fn user_has_permission(&self, user_id: Uuid, permission: &str) -> anyhow::Result<bool> {
        let result = sqlx::query!(
            r#"
            SELECT COUNT(*) as count
            FROM user_role ur
            JOIN role_permission rp ON ur.role_id = rp.role_id
            JOIN permission p ON rp.permission_id = p.id
            WHERE ur.user_id = $1 AND p.code = $2
            "#,
            user_id,
            permission
        )
        .fetch_one(&self.pool)
        .await?;

        Ok(result.count.unwrap_or(0) > 0)
    }
}