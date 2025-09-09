use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use aes_gcm::aead::{Aead, OsRng, generic_array::GenericArray};
use sha2::{Sha256, Digest};
use rand::RngCore;
use base64::{Engine as _, engine::general_purpose};

pub fn encrypt_national_id(national_id: &str, key: &[u8; 32]) -> anyhow::Result<Vec<u8>> {
    let cipher = Aes256Gcm::new(GenericArray::from_slice(key));
    
    let mut nonce_bytes = [0u8; 12];
    OsRng.fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);
    
    let ciphertext = cipher.encrypt(nonce, national_id.as_bytes())
        .map_err(|e| anyhow::anyhow!("Encryption failed: {}", e))?;
    
    // Prepend nonce to ciphertext
    let mut result = Vec::with_capacity(12 + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);
    
    Ok(result)
}

pub fn decrypt_national_id(encrypted_data: &[u8], key: &[u8; 32]) -> anyhow::Result<String> {
    if encrypted_data.len() < 12 {
        return Err(anyhow::anyhow!("Invalid encrypted data length"));
    }
    
    let cipher = Aes256Gcm::new(GenericArray::from_slice(key));
    let nonce = Nonce::from_slice(&encrypted_data[0..12]);
    let ciphertext = &encrypted_data[12..];
    
    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| anyhow::anyhow!("Decryption failed: {}", e))?;
    let result = String::from_utf8(plaintext)?;
    
    Ok(result)
}

pub fn hash_national_id(national_id: &str, tenant_salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(tenant_salt.as_bytes());
    hasher.update(national_id.as_bytes());
    let result = hasher.finalize();
    hex::encode(result)
}

pub fn generate_secure_token() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    general_purpose::URL_SAFE_NO_PAD.encode(bytes)
}