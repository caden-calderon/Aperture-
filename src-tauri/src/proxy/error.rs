//! Proxy error types.

use thiserror::Error;

/// Errors that can occur during proxy operations.
#[derive(Debug, Error)]
pub enum ProxyError {
    /// Failed to construct the HTTP client.
    #[error("failed to build HTTP client: {0}")]
    ClientBuildFailed(#[source] reqwest::Error),

    /// Failed to bind to the specified address.
    #[error("failed to bind to {address}: {source}")]
    BindFailed {
        address: String,
        #[source]
        source: std::io::Error,
    },

    /// Failed to forward request to upstream.
    #[error("upstream request failed: {0}")]
    UpstreamFailed(#[from] reqwest::Error),

    /// Invalid request format.
    #[error("invalid request: {0}")]
    InvalidRequest(String),

    /// Failed to parse URL.
    #[error("invalid URL: {0}")]
    InvalidUrl(String),

    /// Request body exceeds size limit.
    #[error("request too large: {size} bytes exceeds {limit} byte limit")]
    RequestTooLarge { size: usize, limit: usize },

    /// Upstream server did not respond in time.
    #[error("upstream request timed out")]
    UpstreamTimeout,

    /// Failed to parse request or response body.
    #[error("parsing failed: {0}")]
    ParsingFailed(String),
}
