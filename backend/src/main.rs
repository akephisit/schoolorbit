use axum::{Router, routing::get};
use std::net::SocketAddr;

#[tokio::main]
async fn main() {
    // สร้างแอปพลิเคชันของเราด้วย route เดียว
    let app = Router::new().route("/", get(handler));

    // ตั้งค่าที่อยู่ที่จะให้เซิร์ฟเวอร์รัน
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("listening on {}", addr);

    // รันเซิร์ฟเวอร์โดยใช้ Tokio
    axum::serve(tokio::net::TcpListener::bind(&addr).await.unwrap(), app)
        .await
        .unwrap();
}

// Handler function ที่จะรับ request
async fn handler() -> &'static str {
    "Hello, World!"
}
