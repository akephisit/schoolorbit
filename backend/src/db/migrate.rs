use sqlx::PgPool;

pub async fn run_migrations(pool: &PgPool) -> anyhow::Result<()> {
    let migration_files = vec![
        ("001_init_schema.sql", include_str!("../../sql/001_init_schema.sql")),
        ("002_create_indexes.sql", include_str!("../../sql/002_create_indexes.sql")),
    ];

    for (name, sql) in migration_files {
        tracing::info!("Running migration: {}", name);
        sqlx::query(sql).execute(pool).await?;
    }

    Ok(())
}

pub async fn run_meta_migrations(pool: &PgPool) -> anyhow::Result<()> {
    let sql = include_str!("../../sql/meta_001_tenant_routing.sql");
    tracing::info!("Running meta migration");
    sqlx::query(sql).execute(pool).await?;
    Ok(())
}