use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use crate::memtable::MemtableEntry;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct FlushedFile {
    pub id: String,
    pub level: u32,
    pub min_key: String,
    pub max_key: String,
    pub records: Vec<MemtableEntry>,
    pub size_bytes: usize,
    pub created_at_seq: u64,
}

#[derive(Debug, Clone, Default)]
pub struct MockObjectStore {
    files: HashMap<String, FlushedFile>,
    next_file_id: usize,
}

impl MockObjectStore {
    pub fn new() -> Self {
        Self {
            files: HashMap::new(),
            next_file_id: 1,
        }
    }

    pub fn put_file(&mut self, level: u32, mut records: Vec<MemtableEntry>, created_seq: u64) -> FlushedFile {
        // Sort records by key to maintain invariant
        records.sort_by(|a, b| a.key.cmp(&b.key));

        let min_key = records.first().map(|r| r.key.clone()).unwrap_or_default();
        let max_key = records.last().map(|r| r.key.clone()).unwrap_or_default();
        
        let size_bytes = records.iter().map(|r| r.key.len() + r.value.len() + 16).sum::<usize>() + 64;
        let id = format!("sst_L{}_{:03}.db", level, self.next_file_id);
        self.next_file_id += 1;

        let file = FlushedFile {
            id: id.clone(),
            level,
            min_key,
            max_key,
            records,
            size_bytes,
            created_at_seq: created_seq,
        };

        self.files.insert(id, file.clone());
        file
    }

    pub fn put_exact_file(&mut self, file: FlushedFile) {
        self.files.insert(file.id.clone(), file);
    }

    pub fn get_file(&self, id: &str) -> Option<&FlushedFile> {
        self.files.get(id)
    }

    pub fn delete_file(&mut self, id: &str) -> Option<FlushedFile> {
        self.files.remove(id)
    }

    pub fn list_files(&self) -> Vec<FlushedFile> {
        let mut list: Vec<FlushedFile> = self.files.values().cloned().collect();
        list.sort_by(|a, b| a.id.cmp(&b.id));
        list
    }

    pub fn get_files_by_level(&self, level: u32) -> Vec<FlushedFile> {
        let mut list: Vec<FlushedFile> = self.files.values().filter(|f| f.level == level).cloned().collect();
        list.sort_by(|a, b| a.id.cmp(&b.id));
        list
    }
}
