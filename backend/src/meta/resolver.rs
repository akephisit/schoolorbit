use sqlx::{PgPool, Row};
use uuid::Uuid;
use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct TenantInfo {
    pub school_id: Uuid,
    pub dsn: String,
}

pub struct MetaResolver {
    meta_pool: PgPool,
    default_tenant_db: String,
    // Cache for development - in production you'd use Redis or similar
    cache: std::sync::RwLock<HashMap<String, TenantInfo>>,
}

impl MetaResolver {
    pub fn new(meta_pool: PgPool, default_tenant_db: String) -> Self {
        Self {
            meta_pool,
            default_tenant_db,
            cache: std::sync::RwLock::new(HashMap::new()),
        }
    }

    pub async fn resolve_tenant(&self, host: &str) -> anyhow::Result<TenantInfo> {
        // Check cache first
        if let Ok(cache) = self.cache.read() {
            if let Some(info) = cache.get(host) {
                return Ok(info.clone());
            }
        }

        // For localhost development, return default tenant
        if host.starts_with("localhost") || host.starts_with("127.0.0.1") {
            let info = TenantInfo {
                school_id: Uuid::parse_str("00000000-0000-0000-0000-000000000001")?,
                dsn: self.default_tenant_db.clone(),
            };
            
            // Cache the result
            if let Ok(mut cache) = self.cache.write() {
                cache.insert(host.to_string(), info.clone());
            }
            
            return Ok(info);
        }

        // Query meta database for tenant info
        let result = sqlx::query(
            r#"
            SELECT 
                tdm.school_id,
                tdb.dsn
            FROM tenant_domain_map tdm
            JOIN tenant_db_map tdb ON tdm.school_id = tdb.school_id
            WHERE tdm.domain = $1 AND tdb.status = 'active'
            "#
        )
        .bind(host)
        .fetch_optional(&self.meta_pool)
        .await?;

        match result {
            Some(row) => {
                let info = TenantInfo {
                    school_id: row.get("school_id"),
                    dsn: row.get("dsn"),
                };
                
                // Cache the result
                if let Ok(mut cache) = self.cache.write() {
                    cache.insert(host.to_string(), info.clone());
                }
                
                Ok(info)
            },
            None => Err(anyhow::anyhow!("Tenant not found for domain: {}", host))
        }
    }
}