//! HTTP proxy for intercepting LLM API requests.
//!
//! This module provides a transparent proxy that sits between AI tools
//! (Claude Code, Codex, etc.) and their upstream APIs. It captures
//! requests and responses for visualization while streaming SSE
//! responses back to clients.

pub mod error;
mod handler;

use axum::{routing::any, Router};
use reqwest::Client;
use std::sync::Arc;
use std::time::Duration;
use tokio::net::TcpListener;
use tracing::info;

use self::error::ProxyError;

/// Default port for the proxy server.
pub const DEFAULT_PORT: u16 = 5400;

/// Maximum request body size (10 MB).
pub(crate) const MAX_BODY_SIZE: usize = 10 * 1024 * 1024;

/// Upstream API configuration.
#[derive(Debug, Clone)]
pub struct UpstreamConfig {
    /// Base URL for Anthropic API.
    pub anthropic_url: String,
    /// Base URL for OpenAI API.
    pub openai_url: String,
}

impl Default for UpstreamConfig {
    fn default() -> Self {
        Self {
            anthropic_url: "https://api.anthropic.com".to_string(),
            openai_url: "https://api.openai.com".to_string(),
        }
    }
}

/// Shared proxy state.
#[derive(Clone)]
pub struct ProxyState {
    pub(crate) client: Client,
    pub(crate) config: UpstreamConfig,
}

impl ProxyState {
    fn build_client(builder: reqwest::ClientBuilder) -> Result<Client, ProxyError> {
        builder.build().map_err(ProxyError::ClientBuildFailed)
    }

    /// Create new proxy state with default configuration.
    pub fn new() -> Result<Self, ProxyError> {
        let client = Self::build_client(Client::builder().timeout(Duration::from_secs(120)))?;
        Ok(Self {
            client,
            config: UpstreamConfig::default(),
        })
    }

    /// Create proxy state with custom upstream configuration.
    pub fn with_config(config: UpstreamConfig) -> Result<Self, ProxyError> {
        let client = Self::build_client(Client::builder().timeout(Duration::from_secs(120)))?;
        Ok(Self { client, config })
    }
}

/// Start the proxy server.
pub async fn start_proxy(port: u16) -> Result<(), ProxyError> {
    let state = Arc::new(ProxyState::new()?);

    let app = Router::new()
        .route("/{*path}", any(handler::proxy_handler))
        .route("/", any(handler::proxy_handler))
        .with_state(state);

    let addr = format!("127.0.0.1:{port}");
    info!("Starting proxy server on {}", addr);

    let listener = TcpListener::bind(&addr)
        .await
        .map_err(|e| ProxyError::BindFailed {
            address: addr.clone(),
            source: e,
        })?;

    axum::serve(listener, app)
        .await
        .map_err(|e| ProxyError::BindFailed {
            address: addr,
            source: e,
        })?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_proxy_state_with_config_uses_custom_urls() {
        let config = UpstreamConfig {
            anthropic_url: "https://example-anthropic.invalid".to_string(),
            openai_url: "https://example-openai.invalid".to_string(),
        };

        let state = ProxyState::with_config(config.clone()).expect("should build client");
        assert_eq!(state.config.anthropic_url, config.anthropic_url);
        assert_eq!(state.config.openai_url, config.openai_url);
    }

    #[test]
    fn test_build_client_maps_reqwest_builder_errors() {
        let builder = Client::builder().user_agent("invalid\nuser-agent");
        let result = ProxyState::build_client(builder);

        assert!(matches!(result, Err(ProxyError::ClientBuildFailed(_))));
    }
}
