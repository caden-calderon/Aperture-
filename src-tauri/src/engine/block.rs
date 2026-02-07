//! Universal context block.
//!
//! A Block is the fundamental unit of context in Aperture. It represents
//! a piece of conversation content (message, tool call, tool result, etc.)
//! with associated metadata for visualization and management.

use serde::{Deserialize, Serialize};

use super::types::{CompressionLevel, PinPosition, Role, Zone};

/// A single compressed version of block content.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionVersion {
    pub content: String,
    pub tokens: u32,
}

/// All compression versions of a block.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompressionVersions {
    pub original: CompressionVersion,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub trimmed: Option<CompressionVersion>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summarized: Option<CompressionVersion>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub minimal: Option<CompressionVersion>,
}

/// Provider-specific metadata for a block.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BlockMetadata {
    pub provider: String,
    pub turn_index: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub tool_name: Option<String>,
    #[serde(default)]
    pub file_paths: Vec<String>,
}

/// A universal context block.
///
/// This struct mirrors the TypeScript `Block` interface in `src/lib/types.ts`,
/// providing a canonical Rust representation for backend processing.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Block {
    pub id: String,
    pub role: Role,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub block_type: Option<String>,
    pub content: String,
    pub tokens: u32,
    pub timestamp: String, // ISO 8601
    pub zone: Zone,
    pub pinned: Option<PinPosition>,

    // Compression
    pub compression_level: CompressionLevel,
    pub compressed_versions: CompressionVersions,

    // Heat & attention
    pub usage_heat: f64,
    pub position_relevance: f64,
    pub last_referenced_turn: u32,
    pub reference_count: u32,

    // Topic clustering
    pub topic_cluster: Option<String>,
    #[serde(default)]
    pub topic_keywords: Vec<String>,

    // Metadata
    pub metadata: BlockMetadata,
}
