pub mod memtable;
pub mod object_store;
pub mod local_cache;
pub mod event_log;
pub mod storage_engine;

use wasm_bindgen::prelude::*;
use storage_engine::StorageEngine;

#[wasm_bindgen]
pub struct HydraEngine {
    engine: StorageEngine,
}

#[wasm_bindgen]
impl HydraEngine {
    #[wasm_bindgen(constructor)]
    pub fn new(memtable_threshold: usize) -> HydraEngine {
        let threshold = if memtable_threshold == 0 { 4 } else { memtable_threshold };
        HydraEngine {
            engine: StorageEngine::new(threshold),
        }
    }

    pub fn write(&mut self, key: String, value: String) -> String {
        let events = self.engine.write(key, value);
        serde_json::to_string(&events).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn read(&mut self, key: String) -> String {
        let event = self.engine.read(&key);
        serde_json::to_string(&event).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn flush(&mut self) -> String {
        let opt = self.engine.flush();
        serde_json::to_string(&opt).unwrap_or_else(|_| "null".to_string())
    }

    pub fn compact(&mut self) -> String {
        let opt = self.engine.compact();
        serde_json::to_string(&opt).unwrap_or_else(|_| "null".to_string())
    }

    pub fn simulate_crash(&mut self) -> String {
        let event = self.engine.simulate_crash();
        serde_json::to_string(&event).unwrap_or_else(|_| "{}".to_string())
    }

    pub fn tick(&mut self) -> String {
        let events = self.engine.tick();
        serde_json::to_string(&events).unwrap_or_else(|_| "[]".to_string())
    }

    pub fn get_event_log(&self) -> String {
        self.engine.get_event_log_json()
    }

    pub fn get_state(&self) -> String {
        self.engine.get_state_json()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_write_and_memtable_read() {
        let mut engine = StorageEngine::new(4);
        engine.write("user:101".to_string(), "Alice".to_string());
        
        let read_evt = engine.read("user:101");
        assert_eq!(read_evt.hit_layer, Some("Memtable".to_string()));
        assert_eq!(read_evt.value, Some("Alice".to_string()));
        assert_eq!(read_evt.latency_ms, storage_engine::LATENCY_MEMTABLE_MS);
    }

    #[test]
    fn test_flush_to_object_store_and_cache_read() {
        let mut engine = StorageEngine::new(2);
        engine.write("user:101".to_string(), "Alice".to_string());
        engine.write("user:102".to_string(), "Bob".to_string()); // Auto-flushes!

        // Read user:101 after flush -> hits LocalCache
        let read_evt = engine.read("user:101");
        assert_eq!(read_evt.hit_layer, Some("LocalCache".to_string()));
        assert_eq!(read_evt.value, Some("Alice".to_string()));
        assert_eq!(read_evt.latency_ms, storage_engine::LATENCY_LOCAL_CACHE_MS);
    }

    #[test]
    fn test_crash_recovery_from_object_store() {
        let mut engine = StorageEngine::new(2);
        engine.write("key1".to_string(), "val1".to_string());
        engine.write("key2".to_string(), "val2".to_string()); // Flushed to ObjectStore & LocalCache

        // Simulate crash -> clears Memtable & LocalCache
        engine.simulate_crash();

        // Read key1 -> misses Memtable & LocalCache, hits ObjectStore directly!
        let read_evt = engine.read("key1");
        assert_eq!(read_evt.hit_layer, Some("ObjectStore".to_string()));
        assert_eq!(read_evt.value, Some("val1".to_string()));
        assert_eq!(read_evt.latency_ms, storage_engine::LATENCY_OBJECT_STORE_MS);

        // Next read for key1 -> now cached in LocalCache due to lazy loading!
        let second_read = engine.read("key1");
        assert_eq!(second_read.hit_layer, Some("LocalCache".to_string()));
    }

    #[test]
    fn test_compaction_deduplication() {
        let mut engine = StorageEngine::new(2);

        // Batch 1 (flushes to sst_L0_001.db)
        engine.write("k1".to_string(), "old_val1".to_string());
        engine.write("k2".to_string(), "val2".to_string());

        // Batch 2 (flushes to sst_L0_002.db, overwrites k1)
        engine.write("k1".to_string(), "new_val1".to_string());
        engine.write("k3".to_string(), "val3".to_string());

        // Trigger compaction
        let compact_evt = engine.compact();
        assert!(compact_evt.is_some());

        // Verify read k1 returns newest value ("new_val1")
        let read_evt = engine.read("k1");
        assert_eq!(read_evt.value, Some("new_val1".to_string()));

        // All keys k1, k2, k3 must be readable
        assert_eq!(engine.read("k2").value, Some("val2".to_string()));
        assert_eq!(engine.read("k3").value, Some("val3".to_string()));
    }
}
