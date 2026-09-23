use std::collections::BTreeMap;
use serde::{Serialize, Deserialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct MemtableEntry {
    pub key: String,
    pub value: String,
    pub seq: u64,
}

#[derive(Debug, Clone, Default)]
pub struct Memtable {
    store: BTreeMap<String, (String, u64)>,
}

impl Memtable {
    pub fn new() -> Self {
        Self {
            store: BTreeMap::new(),
        }
    }

    pub fn insert(&mut self, key: String, value: String, seq: u64) -> Option<(String, u64)> {
        self.store.insert(key, (value, seq))
    }

    pub fn get(&self, key: &str) -> Option<&(String, u64)> {
        self.store.get(key)
    }

    pub fn len(&self) -> usize {
        self.store.len()
    }

    pub fn is_empty(&self) -> bool {
        self.store.is_empty()
    }

    pub fn clear(&mut self) {
        self.store.clear();
    }

    pub fn entries(&self) -> Vec<MemtableEntry> {
        self.store
            .iter()
            .map(|(k, (v, seq))| MemtableEntry {
                key: k.clone(),
                value: v.clone(),
                seq: *seq,
            })
            .collect()
    }
}
