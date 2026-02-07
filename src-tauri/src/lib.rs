//! Aperture - Universal LLM context visualization, management, and control proxy.
//!
//! Aperture is a transparent proxy that sits between AI coding tools (Claude Code,
//! Codex, OpenCode, etc.) and their upstream APIs. It captures and visualizes
//! context without requiring any API keys of its own — the tools' existing
//! credentials pass through transparently.

pub mod engine;
pub mod events;
pub mod proxy;
pub mod terminal;

use std::env;
use tracing::{error, info};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// Load environment from .env file (if present).
fn load_env() {
    // Try to load from project root first, then current dir
    let paths = [".env", "../.env", "../../.env"];
    for path in paths {
        if dotenvy::from_filename(path).is_ok() {
            return;
        }
    }
    // No .env found is fine — not required
}

/// Initialize logging with tracing.
fn init_logging() {
    tracing_subscriber::registry()
        .with(EnvFilter::try_from_default_env().unwrap_or_else(|_| {
            // Default to info level, with debug for our crate
            "info,aperture_lib=debug".into()
        }))
        .with(tracing_subscriber::fmt::layer())
        .init();
}

/// Get configured proxy port from environment or default.
fn get_proxy_port() -> u16 {
    env::var("APERTURE_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(proxy::DEFAULT_PORT)
}

/// Tauri command: Get the proxy server address.
#[tauri::command]
fn get_proxy_address() -> String {
    format!("http://127.0.0.1:{}", get_proxy_port())
}

/// Tauri command: Check if proxy is running via TCP health check.
#[tauri::command]
fn is_proxy_running() -> bool {
    use std::net::{SocketAddr, TcpStream};
    use std::time::Duration;

    let port = get_proxy_port();
    let addr: SocketAddr = ([127, 0, 0, 1], port).into();
    TcpStream::connect_timeout(&addr, Duration::from_millis(500)).is_ok()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env before anything else
    load_env();

    init_logging();

    let port = get_proxy_port();

    info!("Starting Aperture");
    info!("Transparent proxy mode — tools' API keys pass through, no Aperture key needed");

    // Start proxy server in background
    std::thread::spawn(move || {
        let rt = match tokio::runtime::Runtime::new() {
            Ok(rt) => rt,
            Err(e) => {
                error!("Failed to create tokio runtime: {}", e);
                return;
            }
        };
        rt.block_on(async move {
            if let Err(e) = proxy::start_proxy(port).await {
                error!("Proxy server error: {}", e);
            }
        });
    });

    info!("Proxy listening on http://127.0.0.1:{}", port);
    info!("Usage: ANTHROPIC_BASE_URL=http://localhost:{} claude", port);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(terminal::TerminalState::new())
        .invoke_handler(tauri::generate_handler![
            get_proxy_address,
            is_proxy_running,
            terminal::spawn_shell,
            terminal::send_input,
            terminal::resize_terminal,
            terminal::kill_session,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
