use sqlx::PgPool;
use uuid::Uuid;
use argon2::{Argon2, PasswordHasher};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use anyhow::Result;
// Include the modules from main.rs
use schoolorbit_backend::{
    config::Config,
    db::{create_pool, run_migrations, run_meta_migrations},
    util::crypto::{encrypt_national_id, hash_national_id},
};

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    let config = Config::from_env()?;
    
    // Create and setup databases
    let meta_pool = create_pool(&config.meta_database_url).await?;
    run_meta_migrations(&meta_pool).await?;
    
    let tenant_pool = create_pool(&config.default_tenant_db).await?;
    run_migrations(&tenant_pool).await?;

    println!("🌱 Starting database seeding...");

    // Seed meta database
    seed_meta_database(&meta_pool).await?;
    println!("✅ Meta database seeded");

    // Seed tenant database
    seed_tenant_database(&tenant_pool, &config).await?;
    println!("✅ Tenant database seeded");

    println!("🎉 Database seeding completed!");
    println!("Demo accounts created:");
    println!("  Admin:    admin@demo / Passw0rd!");
    println!("  Teacher:  teacher@demo / Passw0rd!");
    println!("  Student:  STD-650123 / Passw0rd!");
    println!("  Guardian: parent@demo / Passw0rd!");

    Ok(())
}

async fn seed_meta_database(pool: &PgPool) -> Result<()> {
    let school_id = Uuid::parse_str("00000000-0000-0000-0000-000000000001")?;
    
    // Insert tenant domain mapping
    sqlx::query!(
        r#"
        INSERT INTO tenant_domain_map (school_id, domain, is_primary)
        VALUES ($1, $2, $3)
        ON CONFLICT (domain) DO NOTHING
        "#,
        school_id,
        "localhost",
        true
    )
    .execute(pool)
    .await?;

    // Insert tenant database mapping
    sqlx::query!(
        r#"
        INSERT INTO tenant_db_map (school_id, dsn, mode, schema_version, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (school_id) DO NOTHING
        "#,
        school_id,
        "postgres://localhost:5432/school_demo",
        "per_db",
        1,
        "active"
    )
    .execute(pool)
    .await?;

    Ok(())
}

async fn seed_tenant_database(pool: &PgPool, config: &Config) -> Result<()> {
    // Create permissions
    let permissions = [
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

    for (code, description) in &permissions {
        sqlx::query!(
            r#"
            INSERT INTO permission (id, code, description)
            VALUES ($1, $2, $3)
            ON CONFLICT (code) DO NOTHING
            "#,
            Uuid::new_v4(),
            code,
            description
        )
        .execute(pool)
        .await?;
    }

    // Create roles
    let roles = [
        ("admin", "System Administrator"),
        ("teacher", "Teacher"),
        ("student", "Student"),  
        ("parent", "Parent/Guardian"),
    ];

    let mut role_ids = std::collections::HashMap::new();
    for (code, name) in &roles {
        let role_id = Uuid::new_v4();
        role_ids.insert(*code, role_id);
        
        sqlx::query!(
            r#"
            INSERT INTO role (id, code, name)
            VALUES ($1, $2, $3)
            ON CONFLICT (code) DO NOTHING
            "#,
            role_id,
            code,
            name
        )
        .execute(pool)
        .await?;
    }

    // Create role-permission mappings
    let role_permissions = [
        ("admin", vec!["user:manage", "class:read", "class:write", "attend:read", "attend:write", "grade:read", "grade:write", "report:read", "system:admin"]),
        ("teacher", vec!["class:read", "attend:read", "attend:write", "grade:read", "grade:write"]),
        ("student", vec!["class:read", "attend:read", "grade:read"]),
        ("parent", vec!["attend:read", "grade:read"]),
    ];

    for (role_code, perms) in &role_permissions {
        let role_id = role_ids.get(role_code).unwrap();
        
        for perm_code in perms {
            let perm_id = sqlx::query!(
                "SELECT id FROM permission WHERE code = $1",
                perm_code
            )
            .fetch_one(pool)
            .await?
            .id;

            sqlx::query!(
                r#"
                INSERT INTO role_permission (role_id, permission_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                "#,
                role_id,
                perm_id
            )
            .execute(pool)
            .await?;
        }
    }

    // Create demo users
    let password_hash = hash_password("Passw0rd!")?;

    // Admin user
    let admin_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO app_user (id, email, password_hash, display_name, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
        "#,
        admin_id,
        "admin@demo",
        password_hash,
        "System Administrator",
        "active"
    )
    .execute(pool)
    .await?;

    // Assign admin role
    if let Some(role_id) = role_ids.get("admin") {
        sqlx::query!(
            r#"
            INSERT INTO user_role (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
            admin_id,
            role_id
        )
        .execute(pool)
        .await?;
    }

    // Teacher user
    let teacher_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO app_user (id, email, password_hash, display_name, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
        "#,
        teacher_id,
        "teacher@demo",
        password_hash,
        "Demo Teacher",
        "active"
    )
    .execute(pool)
    .await?;

    // Create personnel profile for teacher
    let teacher_national_id = "1234567890123";
    let teacher_national_id_hash = hash_national_id(teacher_national_id, "demo_salt");
    let teacher_national_id_enc = encrypt_national_id(teacher_national_id, &config.aes_key)?;

    sqlx::query!(
        r#"
        INSERT INTO personnel_profile (user_id, national_id_hash, national_id_enc, personnel_no, position_title, is_teacher)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id) DO NOTHING
        "#,
        teacher_id,
        teacher_national_id_hash,
        teacher_national_id_enc,
        "T001",
        "Mathematics Teacher",
        true
    )
    .execute(pool)
    .await?;

    // Assign teacher role
    if let Some(role_id) = role_ids.get("teacher") {
        sqlx::query!(
            r#"
            INSERT INTO user_role (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
            teacher_id,
            role_id
        )
        .execute(pool)
        .await?;
    }

    // Student user
    let student_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO app_user (id, email, password_hash, display_name, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
        "#,
        student_id,
        "student@demo",
        password_hash,
        "Demo Student",
        "active"
    )
    .execute(pool)
    .await?;

    // Create student profile
    sqlx::query!(
        r#"
        INSERT INTO student_profile (user_id, student_code, class_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id) DO NOTHING
        "#,
        student_id,
        "STD-650123",
        Uuid::new_v4() // Mock class ID
    )
    .execute(pool)
    .await?;

    // Assign student role
    if let Some(role_id) = role_ids.get("student") {
        sqlx::query!(
            r#"
            INSERT INTO user_role (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
            student_id,
            role_id
        )
        .execute(pool)
        .await?;
    }

    // Guardian user
    let guardian_id = Uuid::new_v4();
    sqlx::query!(
        r#"
        INSERT INTO app_user (id, email, password_hash, display_name, status)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (email) DO NOTHING
        "#,
        guardian_id,
        "parent@demo",
        password_hash,
        "Demo Guardian",
        "active"
    )
    .execute(pool)
    .await?;

    // Create guardian profile
    let guardian_national_id = "9876543210987";
    let guardian_national_id_hash = hash_national_id(guardian_national_id, "demo_salt");
    let guardian_national_id_enc = encrypt_national_id(guardian_national_id, &config.aes_key)?;

    sqlx::query!(
        r#"
        INSERT INTO guardian_profile (user_id, national_id_hash, national_id_enc, phone)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id) DO NOTHING
        "#,
        guardian_id,
        guardian_national_id_hash,
        guardian_national_id_enc,
        "0812345678"
    )
    .execute(pool)
    .await?;

    // Link guardian to student
    sqlx::query!(
        r#"
        INSERT INTO student_guardian (student_user_id, guardian_user_id, relation)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        "#,
        student_id,
        guardian_id,
        "parent"
    )
    .execute(pool)
    .await?;

    // Assign parent role
    if let Some(role_id) = role_ids.get("parent") {
        sqlx::query!(
            r#"
            INSERT INTO user_role (user_id, role_id)
            VALUES ($1, $2)
            ON CONFLICT DO NOTHING
            "#,
            guardian_id,
            role_id
        )
        .execute(pool)
        .await?;
    }

    Ok(())
}

fn hash_password(password: &str) -> Result<String> {
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();
    let hash = argon2
        .hash_password(password.as_bytes(), &salt)
        .map_err(|e| anyhow::anyhow!("Password hashing failed: {}", e))?
        .to_string();
    Ok(hash)
}