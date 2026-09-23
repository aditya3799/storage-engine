# Disaggregated Storage Engine — Interactive Storage Mechanics Explainer

An interactive, latency-correct explainer web application combining concise narrative sections with an authoritative, interactive simulation of a cloud-native disaggregated storage engine.

The system demonstrates the core mechanics of modern log-structured storage engines that decouple compute nodes from persistent cloud storage:
- **Memtable Buffering**: In-memory sorted write buffer (~100ns RAM latency).
- **Immutable Flush**: Spilling memtable snapshots to cloud object storage (e.g. AWS S3, ~95ms network round-trip).
- **L0 → L1 Compaction**: Size-tiered background merge, deduplicating keys by sequence number and bounding read amplification.
- **Multi-Tier Read Hierarchy**: Hierarchical lookup traversing Memtable → Local SSD Cache (~0.5ms) → Object Store (~95ms) with lazy SSD caching.
- **Stateless Crash Recovery**: Instant node restart with zero data loss, rebuilding local cache on-demand from durable cloud SSTables.

---

## 🛠️ Architecture & Latency Model

| Tier / Operation | Implementation Mechanism | Simulated Latency Cost |
| :--- | :--- | :--- |
| **RAM Memtable** | In-memory sorted key-value write-buffer (`BTreeMap` / ordered map) | `~100 ns` (`0.0001 ms`) |
| **Local SSD Cache** | Node-local SSD cache storing hot SSTables | `~0.5 ms` |
| **Cloud Object Store** | Distributed object storage (e.g., S3) storing immutable SSTables | `~95.0 ms` |
| **Compaction** | Background merge of multiple L0 SSTables into unified L1 SSTable | `~150.0 ms` |
| **Crash Recovery** | Volatile RAM and local cache wiped; durable SSTables preserved in S3 | `0 ms` data loss |

---

## 📦 Directory Structure

```
storage/
├── index.html                    # Self-contained interactive web explainer & visualizer
├── core/                         # Authoritative Rust Storage Engine
│   ├── Cargo.toml                # Rust crate configuration & dependencies
│   └── src/
│       ├── lib.rs                # WASM bindings & Rust unit test suite
│       ├── memtable.rs           # In-memory sorted BTreeMap write buffer
│       ├── object_store.rs       # Cloud object store & immutable SSTable structs
│       ├── local_cache.rs        # Local SSD cache with lazy-loading logic
│       ├── event_log.rs          # Latency-stamped event tracking & state snapshots
│       └── storage_engine.rs     # Master engine coordinating writes, flush, compact, reads & crash
├── pkg/                          # WebAssembly package artifacts (wasm-bindgen output)
├── scratch/                      # Build helpers, browser tests & templates
├── .gitignore                    # Git ignore file for Rust, Node, Python, and OS artifacts
└── README.md                     # Project documentation
```

---

## 💻 Prerequisites & Package Installation

Depending on how you wish to interact with the project, follow the corresponding setup below:

### 1. Running the Interactive Explainer (Zero-Install)
The visualizer in `index.html` is completely self-contained with no external runtime dependencies.

- **Option A (Direct File)**: Double-click or open `index.html` in any modern web browser (Edge, Chrome, Firefox, Safari).
- **Option B (Local Web Server)**:
  - If Python is installed:
    ```bash
    python -m http.server 8000
    ```
  - If Node.js is installed:
    ```bash
    npx serve .
    ```
  Then navigate to `http://localhost:8000/index.html`.

---

### 2. Rust Core Engine (Development & Testing)

To compile the core engine and run unit tests locally, install the Rust toolchain:

#### Installation
- **Windows**: Download and run [rustup-init.exe](https://rustup.rs/) or install via winget:
  ```powershell
  winget install Rustlang.Rustup
  ```
- **macOS / Linux**:
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  ```

#### Running Rust Unit Tests
The test suite verifies write buffering, flush thresholds, multi-tier read order, compaction key deduplication, and crash resilience:

```bash
cd core
cargo test
```

Expected output:
```text
running 4 tests
test tests::test_write_and_memtable_read ... ok
test tests::test_flush_to_object_store_and_cache_read ... ok
test tests::test_compaction_deduplication ... ok
test tests::test_crash_recovery_from_object_store ... ok

test result: ok. 4 passed; 0 failed; 0 ignored
```

---

### 3. WebAssembly Build Pipeline (Optional / Advanced)

If you modify the Rust core and wish to rebuild the WebAssembly bundle:

#### Package Requirements
1. **WASM target**:
   ```bash
   rustup target add wasm32-unknown-unknown
   ```
2. **`wasm-bindgen-cli`** (matches crate version):
   ```bash
   cargo install wasm-bindgen-cli --version 0.2.128
   ```
3. **Python 3.8+** (for bundling):
   Standard library only (uses built-in `base64`, `re`, `os`).

#### Build Steps
```bash
# 1. Compile Rust engine to wasm32 target in release mode
cargo build --target wasm32-unknown-unknown --release --manifest-path core/Cargo.toml

# 2. Generate JavaScript WebAssembly bindings
wasm-bindgen core/target/wasm32-unknown-unknown/release/hydradb_storage_core.wasm --out-dir pkg --target web

# 3. Assemble self-contained site
python scratch/build_site.py
```

---

### 4. Headless Browser Testing (Optional)

For automated end-to-end testing of user interactions via Chrome DevTools Protocol (CDP):

#### Package Requirements
- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))

#### Running Browser Test
```bash
node scratch/test_browser.js
```

---

## 🔍 How to Test the Mechanics Interactively

1. **Memtable Hit (~100ns)**:
   - Type Key `user:200`, Value `Zara`, and click **⚡ Write**.
   - Type Key `user:200` in the Read box and click **🔍 Read Key**.
   - *Observation*: Served from RAM Memtable with `~100ns` logged latency.
2. **Flush to Object Storage**:
   - Click the preset chips `+ user:101`, `+ user:102`, `+ user:103`, `+ user:104 ⚡`.
   - *Observation*: The 4th key crosses the Memtable threshold, automatically triggering a flush. An immutable SSTable (`sst-1`) is written to S3 and mirrored into the local SSD cache.
3. **Local SSD Cache Hit (~0.5ms)**:
   - Read `user:101`.
   - *Observation*: Served from Local SSD Cache with `~0.5ms` latency.
4. **Stateless Node Crash & Cloud Fetch (~95ms)**:
   - Click **💥 Simulate Node Crash**.
   - Notice that RAM Memtable and Local SSD Cache are completely wiped (0 keys, 0 cached SSTs).
   - Now read `user:101`.
   - *Observation*: The storage engine fetches the key directly from the cloud Object Store (`~95ms`), then lazily caches `sst-1` onto the local SSD for subsequent sub-millisecond reads.
5. **Compaction (L0 → L1)**:
   - Write additional keys to trigger another flush (creating a second L0 file).
   - Click **🗜️ Force Compaction (L0 → L1)**.
   - *Observation*: Multiple Level 0 files merge into a single, deduplicated Level 1 SSTable, bounding read amplification and reclaiming cloud storage space.
