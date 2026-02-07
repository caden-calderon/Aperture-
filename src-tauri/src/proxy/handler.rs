//! Request handler for the proxy.

use axum::{
    body::Body,
    extract::State,
    http::{header, HeaderMap, Request, StatusCode},
    response::{IntoResponse, Response},
};
use std::sync::Arc;
use tracing::{debug, error, info, instrument};
use uuid::Uuid;

use super::{error::ProxyError, ProxyState, UpstreamConfig, MAX_BODY_SIZE};

/// Main proxy handler for all requests.
#[instrument(skip_all, fields(request_id = %Uuid::new_v4()))]
pub(crate) async fn proxy_handler(
    State(state): State<Arc<ProxyState>>,
    req: Request<Body>,
) -> impl IntoResponse {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let path = uri.path();

    info!("--> {} {}", method, path);
    log_headers("Request", req.headers());

    let upstream_base = determine_upstream(&state.config, req.headers(), path);
    let upstream_url = format!("{}{}", upstream_base, path);

    debug!("Forwarding to: {}", upstream_url);

    match forward_request(&state.client, req, &upstream_url).await {
        Ok(response) => {
            let status = response.status();
            info!("<-- {} {} -> {}", method, path, status);
            response
        }
        Err(e) => {
            error!("Proxy error: {}", e);
            let status = match &e {
                ProxyError::RequestTooLarge { .. } => StatusCode::PAYLOAD_TOO_LARGE,
                ProxyError::UpstreamTimeout => StatusCode::GATEWAY_TIMEOUT,
                _ => StatusCode::BAD_GATEWAY,
            };
            (status, format!("Proxy error: {e}")).into_response()
        }
    }
}

/// Determine which upstream to use based on request characteristics.
fn determine_upstream<'a>(config: &'a UpstreamConfig, headers: &HeaderMap, path: &str) -> &'a str {
    // Check for Anthropic-specific header
    if headers.contains_key("x-api-key") || headers.contains_key("anthropic-version") {
        return &config.anthropic_url;
    }

    // Check for OpenAI-style authorization
    if let Some(auth) = headers.get(header::AUTHORIZATION) {
        if let Ok(auth_str) = auth.to_str() {
            if auth_str.starts_with("Bearer sk-") {
                return &config.openai_url;
            }
        }
    }

    // Path-based detection
    if path.contains("/v1/messages") {
        return &config.anthropic_url;
    }
    if path.contains("/v1/chat/completions") {
        return &config.openai_url;
    }

    // Default to Anthropic (primary use case)
    &config.anthropic_url
}

/// Forward a request to the upstream server.
async fn forward_request(
    client: &reqwest::Client,
    req: Request<Body>,
    upstream_url: &str,
) -> Result<Response, ProxyError> {
    let (parts, body) = req.into_parts();

    // Read body for logging (we'll need to capture this later for context analysis)
    let body_bytes = axum::body::to_bytes(body, MAX_BODY_SIZE)
        .await
        .map_err(|e| {
            if e.to_string().contains("length limit") {
                ProxyError::RequestTooLarge {
                    size: 0, // actual size unknown when limit exceeded
                    limit: MAX_BODY_SIZE,
                }
            } else {
                ProxyError::InvalidRequest(e.to_string())
            }
        })?;

    // Log request body (truncated for readability)
    if !body_bytes.is_empty() {
        let body_preview = String::from_utf8_lossy(&body_bytes);
        let preview = if body_preview.len() > 500 {
            format!(
                "{}... ({} bytes total)",
                &body_preview[..500],
                body_bytes.len()
            )
        } else {
            body_preview.to_string()
        };
        debug!("Request body: {}", preview);
    }

    // Build upstream request
    let mut upstream_req = client.request(parts.method, upstream_url);

    // Forward headers (except host)
    for (key, value) in parts.headers.iter() {
        if key != header::HOST {
            upstream_req = upstream_req.header(key, value);
        }
    }

    // Send request
    let upstream_response = upstream_req
        .body(body_bytes.to_vec())
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                ProxyError::UpstreamTimeout
            } else {
                ProxyError::UpstreamFailed(e)
            }
        })?;

    let status = upstream_response.status();
    let headers = upstream_response.headers().clone();

    log_headers("Response", &headers);

    // Check if this is a streaming response (SSE)
    let is_streaming = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .map(|ct| ct.contains("text/event-stream"))
        .unwrap_or(false);

    if is_streaming {
        debug!("Streaming SSE response");
        let stream = upstream_response.bytes_stream();
        let body = Body::from_stream(stream);

        let mut response = Response::new(body);
        *response.status_mut() = status;
        *response.headers_mut() = convert_headers(&headers);

        Ok(response)
    } else {
        let response_bytes = upstream_response.bytes().await?;

        let body_preview = String::from_utf8_lossy(&response_bytes);
        let preview = if body_preview.len() > 500 {
            format!(
                "{}... ({} bytes total)",
                &body_preview[..500],
                response_bytes.len()
            )
        } else {
            body_preview.to_string()
        };
        debug!("Response body: {}", preview);

        let mut response = Response::new(Body::from(response_bytes.to_vec()));
        *response.status_mut() = status;
        *response.headers_mut() = convert_headers(&headers);

        Ok(response)
    }
}

/// Convert reqwest headers to axum headers.
fn convert_headers(headers: &reqwest::header::HeaderMap) -> HeaderMap {
    let mut axum_headers = HeaderMap::new();
    for (key, value) in headers.iter() {
        if let Ok(name) = axum::http::header::HeaderName::from_bytes(key.as_str().as_bytes()) {
            if let Ok(val) = axum::http::header::HeaderValue::from_bytes(value.as_bytes()) {
                axum_headers.insert(name, val);
            }
        }
    }
    axum_headers
}

/// Log headers at debug level.
fn log_headers(label: &str, headers: &HeaderMap) {
    for (key, value) in headers.iter() {
        if key == header::AUTHORIZATION || key == "x-api-key" {
            debug!("{} header: {} = [REDACTED]", label, key);
        } else {
            debug!("{} header: {} = {:?}", label, key, value);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_determine_upstream_anthropic_header() {
        let config = UpstreamConfig::default();
        let mut headers = HeaderMap::new();
        headers.insert("x-api-key", "test".parse().unwrap());

        let result = determine_upstream(&config, &headers, "/v1/messages");
        assert_eq!(result, "https://api.anthropic.com");
    }

    #[test]
    fn test_determine_upstream_openai_path() {
        let config = UpstreamConfig::default();
        let headers = HeaderMap::new();

        let result = determine_upstream(&config, &headers, "/v1/chat/completions");
        assert_eq!(result, "https://api.openai.com");
    }

    #[test]
    fn test_upstream_config_default() {
        let config = UpstreamConfig::default();
        assert_eq!(config.anthropic_url, "https://api.anthropic.com");
        assert_eq!(config.openai_url, "https://api.openai.com");
    }
}
