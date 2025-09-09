use cookie::{Cookie, SameSite, time::Duration as CookieDuration};
use axum::http::HeaderValue;

pub struct CookieConfig {
    pub domain: Option<String>,
    pub secure: bool,
}

impl CookieConfig {
    pub fn from_domain(domain: Option<String>) -> Self {
        let secure = domain.is_some();
        Self { domain, secure }
    }
}

pub fn create_access_token_cookie(token: &str, config: &CookieConfig) -> HeaderValue {
    let mut cookie = Cookie::build(("at", token))
        .http_only(true)
        .same_site(SameSite::Lax)
        .path("/")
        .max_age(CookieDuration::minutes(15));

    if let Some(domain) = &config.domain {
        cookie = cookie.domain(domain.clone());
    }
    
    if config.secure {
        cookie = cookie.secure(true);
    }

    let cookie_str = cookie.build().to_string();
    HeaderValue::from_str(&cookie_str).unwrap()
}

pub fn create_refresh_token_cookie(token: &str, config: &CookieConfig) -> HeaderValue {
    let mut cookie = Cookie::build(("rt", token))
        .http_only(true)
        .same_site(SameSite::Strict)
        .path("/auth")
        .max_age(CookieDuration::days(14));

    if let Some(domain) = &config.domain {
        cookie = cookie.domain(domain.clone());
    }
    
    if config.secure {
        cookie = cookie.secure(true);
    }

    let cookie_str = cookie.build().to_string();
    HeaderValue::from_str(&cookie_str).unwrap()
}

pub fn create_csrf_cookie(token: &str, config: &CookieConfig) -> HeaderValue {
    let mut cookie = Cookie::build(("csrf", token))
        .http_only(false) // Needs to be accessible to JS for double-submit
        .same_site(SameSite::Strict)
        .path("/")
        .max_age(CookieDuration::hours(1));

    if let Some(domain) = &config.domain {
        cookie = cookie.domain(domain.clone());
    }
    
    if config.secure {
        cookie = cookie.secure(true);
    }

    let cookie_str = cookie.build().to_string();
    HeaderValue::from_str(&cookie_str).unwrap()
}

pub fn clear_auth_cookies(_config: &CookieConfig) -> Vec<HeaderValue> {
    let clear_at = Cookie::build(("at", ""))
        .http_only(true)
        .same_site(SameSite::Lax)
        .path("/")
        .max_age(CookieDuration::ZERO);

    let clear_rt = Cookie::build(("rt", ""))
        .http_only(true)
        .same_site(SameSite::Strict)
        .path("/auth")
        .max_age(CookieDuration::ZERO);

    let clear_csrf = Cookie::build(("csrf", ""))
        .http_only(false)
        .same_site(SameSite::Strict)
        .path("/")
        .max_age(CookieDuration::ZERO);

    vec![
        HeaderValue::from_str(&clear_at.build().to_string()).unwrap(),
        HeaderValue::from_str(&clear_rt.build().to_string()).unwrap(),
        HeaderValue::from_str(&clear_csrf.build().to_string()).unwrap(),
    ]
}