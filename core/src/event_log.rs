use serde::{Serialize, Deserialize};
use crate::memtable::MemtableEntry;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileSummarySnapshot {
    pub id: String,
    pub level: u32,
    pub record_count: usize,
    pub min_key: String,
    pub max_key: String,
    pub size_bytes: usize,
    pub is_cached: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EngineStateSnapshot {
    pub memtable_entries: Vec<MemtableEntry>,
    pub cached_file_ids: Vec<String>,
    pub object_store_files: Vec<FileSummarySnapshot>,
    pub total_durable_keys: usize,
    pub total_durable_bytes: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Event {
    pub id: u64,
    pub event_type: String, // "Write" | "Flush" | "Compaction" | "Read" | "Crash" | "Tick"
    pub key: Option<String>,
    pub value: Option<String>,
    pub hit_layer: Option<String>, // "Memtable" | "LocalCache" | "ObjectStore" | "None"
    pub latency_ms: f64,
    pub details: String,
    pub state_snapshot: EngineStateSnapshot,
}
