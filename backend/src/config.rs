use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub meta_database_url: String,
    pub default_tenant_db: String,
    pub jwt_secret: String,
    pub cookie_domain: Option<String>,
    pub cors_allowed_origins: Vec<String>,
    pub port: u16,
    pub aes_key: [u8; 32],
}

impl Config {
    pub fn from_env() -> anyhow::Result<Self> {
        dotenvy::dotenv().ok();

        let meta_database_url = env::var("META_DATABASE_URL")
            .unwrap_or_else(|_| "postgres://localhost:5432/meta".to_string());

        let default_tenant_db = env::var("DEFAULT_TENANT_DB")
            .unwrap_or_else(|_| "postgres://localhost:5432/school_demo".to_string());

        let jwt_secret = env::var("JWT_SECRET")
            .unwrap_or_else(|_| "dev_32bytes_minimum_secret________________________________".to_string());

        let cookie_domain = env::var("COOKIE_DOMAIN").ok();

        let cors_origins = env::var("CORS_ALLOWED_ORIGINS")
            .unwrap_or_else(|_| "http://localhost:5173".to_string());
        let cors_allowed_origins = cors_origins.split(',').map(|s| s.trim().to_string()).collect();

        let port = env::var("PORT")
            .unwrap_or_else(|_| "8787".to_string())
            .parse()?;

        let aes_key_hex = env::var("AES_KEY_HEX")
            .unwrap_or_else(|_| "32bytes_hex_for_AESGCM_encrypt_NID".to_string());
        
        let aes_key = if aes_key_hex.len() == 64 {
            let mut key = [0u8; 32];
            hex::decode_to_slice(&aes_key_hex, &mut key)?;
            key
        } else {
            // For dev, use the string as bytes and pad/truncate to 32 bytes
            let mut key = [0u8; 32];
            let bytes = aes_key_hex.as_bytes();
            let len = bytes.len().min(32);
            key[..len].copy_from_slice(&bytes[..len]);
            key
        };

        Ok(Config {
            meta_database_url,
            default_tenant_db,
            jwt_secret,
            cookie_domain,
            cors_allowed_origins,
            port,
            aes_key,
        })
    }
}