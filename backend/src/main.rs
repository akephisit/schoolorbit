use axum::{
    routing::{get, post},
    Router,
    extract::DefaultBodyLimit,
    http::{Method, HeaderValue},
};
use tower::ServiceBuilder;
use tower_http::{
    cors::CorsLayer,
    trace::{TraceLayer, DefaultMakeSpan, DefaultOnRequest, DefaultOnResponse},
};
use tracing::{info, Level};
use std::sync::Arc;

mod config;
mod db;
mod meta;
mod auth;
mod rbac;
mod util;
mod error;
mod routes;

use config::Config;
use db::{create_pool, run_migrations, run_meta_migrations};
use meta::MetaResolver;
use auth::{JwtService, RefreshService};
use rbac::RbacService;
use routes::{AppState, login, refresh, logout, me, get_menu, get_dashboard_summary};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_target(false)
        .compact()
        .init();

    // Load configuration
    let config = Config::from_env()?;
    info!("Configuration loaded");

    // Create meta database pool and run migrations
    let meta_pool = create_pool(&config.meta_database_url).await?;
    run_meta_migrations(&meta_pool).await?;
    info!("Meta database migrations completed");

    // Create tenant database pool and run migrations
    let tenant_pool = create_pool(&config.default_tenant_db).await?;
    run_migrations(&tenant_pool).await?;
    info!("Tenant database migrations completed");

    // Initialize services
    let jwt_service = JwtService::new(&config.jwt_secret);
    let refresh_service = RefreshService::new(tenant_pool.clone());
    let rbac_service = RbacService::new(tenant_pool.clone());
    let meta_resolver = MetaResolver::new(meta_pool, config.default_tenant_db.clone());

    // Create app state
    let app_state = Arc::new(AppState {
        pool: tenant_pool,
        jwt_service,
        refresh_service,
        rbac_service,
        config: config.clone(),
    });

    // Create CORS layer
    let cors_origins: Vec<HeaderValue> = config
        .cors_allowed_origins
        .iter()
        .map(|origin| origin.parse().unwrap())
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(cors_origins)
        .allow_methods([Method::GET, Method::POST, Method::PUT, Method::DELETE])
        .allow_headers([
            axum::http::header::CONTENT_TYPE,
            axum::http::header::AUTHORIZATION,
            axum::http::header::ACCEPT,
        ])
        .allow_credentials(true);

    // Create routes
    let app = Router::new()
        // Auth routes
        .route("/auth/login", post(login))
        .route("/auth/refresh", post(refresh))
        .route("/auth/logout", post(logout))
        .route("/auth/me", get(me))
        // Protected routes
        .route("/menu", get(get_menu))
        .route("/dashboard/summary", get(get_dashboard_summary))
        // Add the app state
        .with_state(app_state.clone())
        // Add middleware layers
        .layer(
            ServiceBuilder::new()
                .layer(DefaultBodyLimit::max(1024 * 1024)) // 1MB limit
                .layer(
                    TraceLayer::new_for_http()
                        .make_span_with(DefaultMakeSpan::new().level(Level::INFO))
                        .on_request(DefaultOnRequest::new().level(Level::INFO))
                        .on_response(DefaultOnResponse::new().level(Level::INFO))
                )
                .layer(cors),
        );

    // Add JWT service to extensions for extractors
    let app = app.layer(axum::Extension(Arc::new(app_state.jwt_service.clone())));

    // Start server
    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{}", config.port)).await?;
    info!("Server starting on port {}", config.port);
    
    axum::serve(listener, app).await?;

    Ok(())
}
