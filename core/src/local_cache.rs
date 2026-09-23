use std::collections::HashMap;
use crate::object_store::FlushedFile;
use crate::memtable::MemtableEntry;

#[derive(Debug, Clone, Default)]
pub struct LocalCache {
    cached_files: HashMap<String, FlushedFile>,
}

impl LocalCache {
    pub fn new() -> Self {
        Self {
            cached_files: HashMap::new(),
        }
    }

    pub fn cache_file(&mut self, file: FlushedFile) {
        self.cached_files.insert(file.id.clone(), file);
    }

    pub fn get_file(&self, file_id: &str) -> Option<&FlushedFile> {
        self.cached_files.get(file_id)
    }

    pub fn get_key(&self, key: &str) -> Option<(MemtableEntry, String)> {
        // Search cached files for key. Highest level or newest file wins.
        let mut candidates: Vec<(&FlushedFile, &MemtableEntry)> = Vec::new();

        for file in self.cached_files.values() {
            // Quick range check
            if key >= file.min_key.as_str() && key <= file.max_key.as_str() {
                if let Some(record) = file.records.iter().find(|r| r.key == key) {
                    candidates.push((file, record));
                }
            }
        }

        // Sort candidates by sequence number descending (newest wins)
        candidates.sort_by(|a, b| b.1.seq.cmp(&a.1.seq));

        candidates.first().map(|(file, record)| ((*record).clone(), file.id.clone()))
    }

    pub fn remove(&mut self, file_id: &str) -> Option<FlushedFile> {
        self.cached_files.remove(file_id)
    }

    pub fn clear(&mut self) {
        self.cached_files.clear();
    }

    pub fn cached_file_ids(&self) -> Vec<String> {
        let mut ids: Vec<String> = self.cached_files.keys().cloned().collect();
        ids.sort();
        ids
    }
}
