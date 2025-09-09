use sqlx::PgPool;

pub async fn run_migrations(pool: &PgPool) -> anyhow::Result<()> {
    let migration_files = vec![
        ("001_init_schema.sql", include_str!("../../sql/001_init_schema.sql")),
        ("002_create_indexes.sql", include_str!("../../sql/002_create_indexes.sql")),
    ];

    for (name, sql) in migration_files {
        tracing::info!("Running migration: {}", name);
        // Split SQL by semicolon and run each statement separately
        for statement in sql.split(';') {
            let statement = statement.trim();
            if !statement.is_empty() {
                sqlx::query(statement).execute(pool).await?;
            }
        }
    }

    Ok(())
}

pub async fn run_meta_migrations(pool: &PgPool) -> anyhow::Result<()> {
    let sql = include_str!("../../sql/meta_001_tenant_routing.sql");
    tracing::info!("Running meta migration");
    // Split SQL by semicolon and run each statement separately
    for statement in sql.split(';') {
        let statement = statement.trim();
        if !statement.is_empty() {
            sqlx::query(statement).execute(pool).await?;
        }
    }
    Ok(())
}