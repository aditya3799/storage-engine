use std::collections::HashSet;
use crate::memtable::{Memtable, MemtableEntry};
use crate::object_store::MockObjectStore;
use crate::local_cache::LocalCache;
use crate::event_log::{Event, EngineStateSnapshot, FileSummarySnapshot};

// Latency constants in milliseconds (ms) as requested:
// Memory access: ~100ns = 0.0001 ms
pub const LATENCY_MEMTABLE_MS: f64 = 0.0001;
// Local disk/cache access: ~0.1 - 1ms (we use 0.5 ms)
pub const LATENCY_LOCAL_CACHE_MS: f64 = 0.5;
// Object store fetch: ~50 - 150ms (we use 95.0 ms)
pub const LATENCY_OBJECT_STORE_MS: f64 = 95.0;
// Object store upload/flush: ~75.0 ms
pub const LATENCY_FLUSH_MS: f64 = 75.0;
// Compaction latency: ~150.0 ms
pub const LATENCY_COMPACTION_MS: f64 = 150.0;

#[derive(Debug)]
pub struct StorageEngine {
    memtable: Memtable,
    local_cache: LocalCache,
    object_store: MockObjectStore,
    event_log: Vec<Event>,
    sequence_counter: u64,
    event_counter: u64,
    memtable_threshold: usize,
}

impl StorageEngine {
    pub fn new(memtable_threshold: usize) -> Self {
        Self {
            memtable: Memtable::new(),
            local_cache: LocalCache::new(),
            object_store: MockObjectStore::new(),
            event_log: Vec::new(),
            sequence_counter: 1,
            event_counter: 1,
            memtable_threshold,
        }
    }

    fn snapshot(&self) -> EngineStateSnapshot {
        let memtable_entries = self.memtable.entries();
        let cached_ids = self.local_cache.cached_file_ids();
        let cached_set: HashSet<String> = cached_ids.iter().cloned().collect();

        let object_store_files: Vec<FileSummarySnapshot> = self
            .object_store
            .list_files()
            .into_iter()
            .map(|f| FileSummarySnapshot {
                id: f.id.clone(),
                level: f.level,
                record_count: f.records.len(),
                min_key: f.min_key.clone(),
                max_key: f.max_key.clone(),
                size_bytes: f.size_bytes,
                is_cached: cached_set.contains(&f.id),
            })
            .collect();

        // Calculate unique durable keys in object store
        let mut unique_keys = HashSet::new();
        let mut total_bytes = 0;
        for file in self.object_store.list_files() {
            total_bytes += file.size_bytes;
            for rec in &file.records {
                unique_keys.insert(rec.key.clone());
            }
        }

        EngineStateSnapshot {
            memtable_entries,
            cached_file_ids: cached_ids,
            object_store_files,
            total_durable_keys: unique_keys.len(),
            total_durable_bytes: total_bytes,
        }
    }

    fn record_event(
        &mut self,
        event_type: &str,
        key: Option<String>,
        value: Option<String>,
        hit_layer: Option<String>,
        latency_ms: f64,
        details: String,
    ) -> Event {
        let evt = Event {
            id: self.event_counter,
            event_type: event_type.to_string(),
            key,
            value,
            hit_layer,
            latency_ms,
            details,
            state_snapshot: self.snapshot(),
        };
        self.event_counter += 1;
        self.event_log.push(evt.clone());
        evt
    }

    pub fn write(&mut self, key: String, value: String) -> Vec<Event> {
        let mut events = Vec::new();
        let seq = self.sequence_counter;
        self.sequence_counter += 1;

        self.memtable.insert(key.clone(), value.clone(), seq);

        let write_evt = self.record_event(
            "Write",
            Some(key.clone()),
            Some(value.clone()),
            Some("Memtable".to_string()),
            LATENCY_MEMTABLE_MS,
            format!("Write landed in RAM Memtable (seq #{}). Buffer size: {}/{}", seq, self.memtable.len(), self.memtable_threshold),
        );
        events.push(write_evt);

        // Auto-flush if threshold crossed
        if self.memtable.len() >= self.memtable_threshold {
            if let Some(flush_evt) = self.flush_internal() {
                events.push(flush_evt);
            }
        }

        events
    }

    pub fn flush(&mut self) -> Option<Event> {
        self.flush_internal()
    }

    fn flush_internal(&mut self) -> Option<Event> {
        if self.memtable.is_empty() {
            return None;
        }

        let records = self.memtable.entries();
        self.memtable.clear();

        let seq = self.sequence_counter;

        // Write immutable file to MockObjectStore at Level 0
        let flushed_file = self.object_store.put_file(0, records.clone(), seq);
        
        // Cache file locally
        self.local_cache.cache_file(flushed_file.clone());

        let evt = self.record_event(
            "Flush",
            None,
            None,
            Some("ObjectStore".to_string()),
            LATENCY_FLUSH_MS,
            format!(
                "Flushed {} keys to immutable file '{}' in Object Store & Local SSD Cache ({} bytes).",
                flushed_file.records.len(),
                flushed_file.id,
                flushed_file.size_bytes
            ),
        );

        Some(evt)
    }

    pub fn read(&mut self, key: &str) -> Event {
        // Step 1: Memtable check
        if let Some((value, seq)) = self.memtable.get(key) {
            return self.record_event(
                "Read",
                Some(key.to_string()),
                Some(value.clone()),
                Some("Memtable".to_string()),
                LATENCY_MEMTABLE_MS,
                format!("Read HIT in Memtable (seq #{}). Latency: ~100ns.", seq),
            );
        }

        // Step 2: Local Cache check
        if let Some((record, file_id)) = self.local_cache.get_key(key) {
            return self.record_event(
                "Read",
                Some(key.to_string()),
                Some(record.value.clone()),
                Some("LocalCache".to_string()),
                LATENCY_LOCAL_CACHE_MS,
                format!("Read HIT in Local SSD Cache file '{}' (seq #{}). Latency: ~0.5ms.", file_id, record.seq),
            );
        }

        // Step 3: Mock Object Store check
        // Check files in object store from highest level / newest sequence downwards
        let mut files = self.object_store.list_files();
        files.sort_by(|a, b| b.created_at_seq.cmp(&a.created_at_seq));

        for file in &files {
            if key >= file.min_key.as_str() && key <= file.max_key.as_str() {
                if let Some(record) = file.records.iter().find(|r| r.key == key) {
                    // Populate Local Cache lazily upon Object Store fetch!
                    self.local_cache.cache_file(file.clone());

                    return self.record_event(
                        "Read",
                        Some(key.to_string()),
                        Some(record.value.clone()),
                        Some("ObjectStore".to_string()),
                        LATENCY_OBJECT_STORE_MS,
                        format!(
                            "Read HIT in Object Store (S3) file '{}' (seq #{}). Fetched over network into Local Cache. Latency: ~95ms.",
                            file.id, record.seq
                        ),
                    );
                }
            }
        }

        // Step 4: Not Found
        let total_latency = LATENCY_MEMTABLE_MS + LATENCY_LOCAL_CACHE_MS + LATENCY_OBJECT_STORE_MS;
        self.record_event(
            "Read",
            Some(key.to_string()),
            None,
            Some("None".to_string()),
            total_latency,
            format!("Key '{}' NOT FOUND after checking Memtable, Local Cache, and Object Store.", key),
        )
    }

    pub fn compact(&mut self) -> Option<Event> {
        let l0_files = self.object_store.get_files_by_level(0);
        if l0_files.len() < 2 {
            return None;
        }

        let input_ids: Vec<String> = l0_files.iter().map(|f| f.id.clone()).collect();
        let total_input_records: usize = l0_files.iter().map(|f| f.records.len()).sum();
        let total_input_bytes: usize = l0_files.iter().map(|f| f.size_bytes).sum();

        // Collect all records and deduplicate by key (newest seq wins)
        let mut merged_map: std::collections::BTreeMap<String, MemtableEntry> = std::collections::BTreeMap::new();
        for file in &l0_files {
            for record in &file.records {
                match merged_map.get(&record.key) {
                    Some(existing) if existing.seq >= record.seq => {
                        // existing is newer or equal, keep it
                    }
                    _ => {
                        merged_map.insert(record.key.clone(), record.clone());
                    }
                }
            }
        }

        let merged_records: Vec<MemtableEntry> = merged_map.into_values().collect();
        let seq = self.sequence_counter;

        // Delete old L0 files from ObjectStore and LocalCache
        for file in &l0_files {
            self.object_store.delete_file(&file.id);
            self.local_cache.remove(&file.id);
        }

        // Create new Level 1 file in ObjectStore
        let l1_file = self.object_store.put_file(1, merged_records.clone(), seq);

        // Cache new Level 1 file locally
        self.local_cache.cache_file(l1_file.clone());

        let space_reclaimed = if total_input_bytes > l1_file.size_bytes {
            total_input_bytes - l1_file.size_bytes
        } else {
            0
        };

        let evt = self.record_event(
            "Compaction",
            None,
            None,
            Some("ObjectStore".to_string()),
            LATENCY_COMPACTION_MS,
            format!(
                "Compacted {} Level 0 files ({:?}) into 1 Level 1 file '{}'. Merged {} records -> {} unique records (reclaimed {} bytes).",
                l0_files.len(),
                input_ids,
                l1_file.id,
                total_input_records,
                l1_file.records.len(),
                space_reclaimed
            ),
        );

        Some(evt)
    }

    pub fn simulate_crash(&mut self) -> Event {
        let memtable_count = self.memtable.len();
        let cached_count = self.local_cache.cached_file_ids().len();

        self.memtable.clear();
        self.local_cache.clear();

        self.record_event(
            "Crash",
            None,
            None,
            None,
            0.0,
            format!(
                "CRASH SIMULATED! Cleared RAM Memtable ({} un-flushed keys) and Local SSD Cache ({} files). Object Store state remains 100% intact.",
                memtable_count, cached_count
            ),
        )
    }

    pub fn tick(&mut self) -> Vec<Event> {
        let mut events = Vec::new();

        // Check auto-compaction trigger (if L0 files >= 3)
        if self.object_store.get_files_by_level(0).len() >= 3 {
            if let Some(compact_evt) = self.compact() {
                events.push(compact_evt);
            }
        }

        events
    }

    pub fn event_log(&self) -> &Vec<Event> {
        &self.event_log
    }

    pub fn get_event_log_json(&self) -> String {
        serde_json::to_string(&self.event_log).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn get_state_json(&self) -> String {
        serde_json::to_string(&self.snapshot()).unwrap_or_else(|_| "{}".to_string())
    }
}
