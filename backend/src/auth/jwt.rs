use jsonwebtoken::{encode, decode, Header, Algorithm, Validation, EncodingKey, DecodingKey};
use serde::{Serialize, Deserialize};
use uuid::Uuid;
use chrono::{Utc, Duration};

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: Uuid,          // user_id
    pub tenant: Uuid,       // school_id
    pub roles: Vec<String>, // role codes
    pub perms: Vec<String>, // permission codes
    pub ctx: Option<serde_json::Value>, // additional context (e.g., class_ids for teachers)
    pub exp: i64,           // expiration timestamp
    pub iat: i64,           // issued at timestamp
}

impl Claims {
    pub fn new(
        user_id: Uuid, 
        tenant_id: Uuid, 
        roles: Vec<String>, 
        permissions: Vec<String>,
        context: Option<serde_json::Value>
    ) -> Self {
        let now = Utc::now();
        let exp = now + Duration::minutes(15); // 15 minute expiry
        
        Self {
            sub: user_id,
            tenant: tenant_id,
            roles,
            perms: permissions,
            ctx: context,
            exp: exp.timestamp(),
            iat: now.timestamp(),
        }
    }
}

#[derive(Clone)]
pub struct JwtService {
    encoding_key: EncodingKey,
    decoding_key: DecodingKey,
}

impl JwtService {
    pub fn new(secret: &str) -> Self {
        Self {
            encoding_key: EncodingKey::from_secret(secret.as_bytes()),
            decoding_key: DecodingKey::from_secret(secret.as_bytes()),
        }
    }

    pub fn create_token(&self, claims: &Claims) -> anyhow::Result<String> {
        let token = encode(&Header::new(Algorithm::HS256), claims, &self.encoding_key)?;
        Ok(token)
    }

    pub fn verify_token(&self, token: &str) -> anyhow::Result<Claims> {
        let token_data = decode::<Claims>(token, &self.decoding_key, &Validation::new(Algorithm::HS256))?;
        Ok(token_data.claims)
    }
}