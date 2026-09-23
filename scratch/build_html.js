const fs = require('fs');
const path = require('path');

const wasmBase64 = fs.readFileSync(path.join(__dirname, 'pkg', 'wasm_base64.txt'), 'utf8').trim();
const wasmJsContent = fs.readFileSync(path.join(__dirname, 'pkg', 'hydradb_storage_core.js'), 'utf8');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>How HydraDB's Storage Layer Works — Interactive Engine Explainer</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-dark: #070A12;
      --bg-card: #0F172A;
      --bg-card-hover: #162036;
      --bg-panel: #1E293B;
      --border-color: rgba(255, 255, 255, 0.08);
      --border-focus: rgba(6, 182, 212, 0.4);
      
      --memtable-color: #06B6D4;
      --memtable-glow: rgba(6, 182, 212, 0.25);
      --cache-color: #10B981;
      --cache-glow: rgba(16, 185, 129, 0.25);
      --objectstore-color: #8B5CF6;
      --objectstore-glow: rgba(139, 92, 246, 0.25);
      --amber-color: #F59E0B;
      --amber-glow: rgba(245, 158, 11, 0.25);
      --danger-color: #EF4444;
      --danger-glow: rgba(239, 68, 68, 0.3);
      
      --text-main: #F8FAFC;
      --text-muted: #94A3B8;
      --text-dim: #64748B;
      
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: var(--bg-dark);
      color: var(--text-main);
      font-family: var(--font-sans);
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 80px;
    }

    /* Layout Containers */
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 24px;
    }

    /* Hero & Header */
    header {
      padding: 60px 0 40px;
      text-align: center;
      position: relative;
      background: radial-gradient(circle at 50% 0%, rgba(6, 182, 212, 0.12) 0%, rgba(139, 92, 246, 0.05) 50%, transparent 80%);
      border-bottom: 1px solid var(--border-color);
    }

    .badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(6, 182, 212, 0.1);
      border: 1px solid rgba(6, 182, 212, 0.3);
      color: var(--memtable-color);
      font-size: 0.8rem;
      font-weight: 600;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--memtable-color);
      box-shadow: 0 0 10px var(--memtable-color);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    h1 {
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      line-height: 1.15;
      background: linear-gradient(135deg, #FFFFFF 0%, #CBD5E1 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 16px;
    }

    .subtitle {
      font-size: 1.2rem;
      color: var(--text-muted);
      max-width: 760px;
      margin: 0 auto;
      font-weight: 400;
    }

    /* Narrative Article Cards */
    .prose-section {
      margin: 48px 0;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 32px;
      position: relative;
      overflow: hidden;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .prose-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
      background: var(--memtable-color);
    }

    .prose-section.type-flush::before { background: var(--cache-color); }
    .prose-section.type-read::before { background: var(--amber-color); }
    .prose-section.type-compact::before { background: var(--objectstore-color); }
    .prose-section.type-crash::before { background: var(--danger-color); }

    .prose-tag {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-dim);
      margin-bottom: 8px;
    }

    .prose-title {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-main);
      margin-bottom: 12px;
      letter-spacing: -0.01em;
    }

    .prose-body {
      color: #CBD5E1;
      font-size: 1.05rem;
      line-height: 1.7;
    }

    .prose-body p {
      margin-bottom: 12px;
    }

    .prose-body p:last-child {
      margin-bottom: 0;
    }

    .highlight-code {
      font-family: var(--font-mono);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.9em;
      color: var(--memtable-color);
    }

    /* Interactive Visualizer Canvas Area */
    .interactive-workspace {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 20px;
      padding: 28px;
      margin: 40px 0;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    .workspace-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }

    .workspace-title {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .live-indicator {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--cache-color);
      background: rgba(16, 185, 129, 0.1);
      padding: 4px 10px;
      border-radius: 20px;
      border: 1px solid rgba(16, 185, 129, 0.2);
    }

    /* Metric Counters Bar */
    .metrics-bar {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 28px;
    }

    .metric-card {
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      transition: transform 0.2s ease, border-color 0.2s ease;
    }

    .metric-card:hover {
      border-color: rgba(255, 255, 255, 0.15);
    }

    .metric-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-dim);
      margin-bottom: 6px;
    }

    .metric-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-main);
    }

    .metric-unit {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-weight: 400;
    }

    /* Controls Panel */
    .controls-panel {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 20px;
      margin-bottom: 28px;
      background: var(--bg-panel);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 20px;
    }

    .control-group {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .control-label {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .form-row {
      display: flex;
      gap: 8px;
    }

    input[type="text"] {
      background: rgba(0, 0, 0, 0.3);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 14px;
      color: var(--text-main);
      font-family: var(--font-mono);
      font-size: 0.9rem;
      flex: 1;
      outline: none;
      transition: border-color 0.2s ease;
    }

    input[type="text"]:focus {
      border-color: var(--memtable-color);
      box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.15);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
      white-space: nowrap;
      user-select: none;
    }

    .btn-primary {
      background: linear-gradient(135deg, var(--memtable-color) 0%, #0891B2 100%);
      color: #000;
      box-shadow: 0 4px 14px var(--memtable-glow);
    }

    .btn-primary:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .btn-read {
      background: linear-gradient(135deg, var(--amber-color) 0%, #D97706 100%);
      color: #000;
      box-shadow: 0 4px 14px var(--amber-glow);
    }

    .btn-read:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .btn-secondary {
      background: rgba(255, 255, 255, 0.06);
      color: var(--text-main);
      border: 1px solid var(--border-color);
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.12);
      border-color: rgba(255, 255, 255, 0.2);
    }

    .btn-danger {
      background: linear-gradient(135deg, var(--danger-color) 0%, #DC2626 100%);
      color: #FFF;
      box-shadow: 0 4px 14px var(--danger-glow);
    }

    .btn-danger:hover {
      filter: brightness(1.15);
      transform: translateY(-1px);
    }

    .presets-row {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .btn-chip {
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid var(--border-color);
      color: var(--text-muted);
      padding: 4px 10px;
      border-radius: 6px;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-chip:hover {
      border-color: var(--memtable-color);
      color: var(--memtable-color);
      background: rgba(6, 182, 212, 0.08);
    }

    /* Simulation Canvas Stage */
    .stage-container {
      position: relative;
      background: #090E1A;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      overflow: hidden;
      margin-bottom: 28px;
    }

    canvas {
      display: block;
      width: 100%;
      height: 480px;
    }

    /* Execution Log Stream */
    .log-panel {
      background: #050811;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 20px;
      font-family: var(--font-mono);
    }

    .log-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border-color);
    }

    .log-title {
      font-size: 0.85rem;
      font-weight: 700;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .log-stream {
      height: 180px;
      overflow-y: auto;
      display: flex;
      flex-direction: column-reverse;
      gap: 8px;
      padding-right: 8px;
    }

    .log-entry {
      font-size: 0.82rem;
      padding: 8px 12px;
      border-radius: 6px;
      background: rgba(255, 255, 255, 0.02);
      border-left: 3px solid var(--text-dim);
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .log-entry.evt-Write { border-left-color: var(--memtable-color); }
    .log-entry.evt-Flush { border-left-color: var(--cache-color); }
    .log-entry.evt-Compaction { border-left-color: var(--objectstore-color); }
    .log-entry.evt-Read { border-left-color: var(--amber-color); }
    .log-entry.evt-Crash { border-left-color: var(--danger-color); }

    .log-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(255, 255, 255, 0.08);
    }

    .log-latency {
      color: var(--amber-color);
      font-weight: 600;
    }

    /* Footer */
    footer {
      margin-top: 60px;
      text-align: center;
      color: var(--text-dim);
      font-size: 0.85rem;
      border-top: 1px solid var(--border-color);
      padding-top: 30px;
    }
  </style>
</head>
<body>

  <header>
    <div class="container">
      <div class="badge">
        <div class="badge-dot"></div>
        Disaggregated Storage Engine Architecture
      </div>
      <h1>How HydraDB's Storage Layer Works</h1>
      <p class="subtitle">An interactive, latency-correct simulation of LSM-tree memory buffering, cloud object store flushes, multi-tier reads, and zero-data-loss node recovery.</p>
    </div>
  </header>

  <main class="container">

    <!-- Narrative Section 1 -->
    <article class="prose-section">
      <div class="prose-tag">01. Architectural Fundamentals</div>
      <h2 class="prose-title">The Disaggregated Storage Revolution</h2>
      <div class="prose-body">
        <p>Traditional databases couple compute and storage onto the same machine, forcing expensive over-provisioning. Modern cloud-native engines like HydraDB decouple compute nodes from durable storage, utilizing cloud object stores (like AWS S3) as their primary persistence tier.</p>
        <p>However, S3 brings a challenge: network round-trips take ~50–150ms per request. To achieve sub-millisecond database writes and reads, HydraDB employs an in-memory <strong>Memtable</strong> write-buffer paired with a local SSD read-cache.</p>
      </div>
    </article>

    <!-- Interactive Simulation Widget Stage -->
    <section class="interactive-workspace">
      
      <div class="workspace-header">
        <div class="workspace-title">
          <span>⚡ Live Storage Engine Simulation</span>
          <div class="live-indicator">
            <span class="badge-dot" style="width: 6px; height: 6px;"></span> WASM Core Active
          </div>
        </div>
        <div style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-muted);">
          Memtable Threshold: <strong style="color: var(--memtable-color);">4 keys</strong>
        </div>
      </div>

      <!-- Realtime Metric Counters -->
      <div class="metrics-bar">
        <div class="metric-card">
          <div class="metric-label">RAM Memtable</div>
          <div class="metric-value" id="metric-memtable">0 <span class="metric-unit">/ 4 keys</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Local SSD Cache</div>
          <div class="metric-value" id="metric-cache">0 <span class="metric-unit">cached SSTs</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Object Store (S3)</div>
          <div class="metric-value" id="metric-objectstore">0 <span class="metric-unit">files (0 B)</span></div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Last Served Read</div>
          <div class="metric-value" id="metric-last-hit" style="color: var(--amber-color);">—</div>
        </div>
        <div class="metric-card">
          <div class="metric-label">Logged Latency</div>
          <div class="metric-value" id="metric-latency" style="color: var(--amber-color);">0.000 <span class="metric-unit">ms</span></div>
        </div>
      </div>

      <!-- Interactive Controls Panel -->
      <div class="controls-panel">
        
        <!-- Write Controls -->
        <div class="control-group">
          <div class="control-label">
            <span>Write Key-Value</span>
            <span style="font-size: 0.75rem; color: var(--memtable-color);">RAM ~100ns</span>
          </div>
          <div class="form-row">
            <input type="text" id="write-key" placeholder="Key (e.g. user:101)" value="user:101">
            <input type="text" id="write-val" placeholder="Value (e.g. Alice)" value="Alice">
            <button class="btn btn-primary" id="btn-write">Write</button>
          </div>
          <div class="presets-row">
            <span style="font-size: 0.75rem; color: var(--text-dim); align-self: center;">Fill to Flush:</span>
            <button class="btn-chip" onclick="quickWrite('user:101', 'Alice')">+ user:101</button>
            <button class="btn-chip" onclick="quickWrite('user:102', 'Bob')">+ user:102</button>
            <button class="btn-chip" onclick="quickWrite('user:103', 'Charlie')">+ user:103</button>
            <button class="btn-chip" onclick="quickWrite('user:104', 'Dave')">+ user:104 ⚡</button>
          </div>
        </div>

        <!-- Read Controls -->
        <div class="control-group">
          <div class="control-label">
            <span>Read Hierarchy Lookup</span>
            <span style="font-size: 0.75rem; color: var(--amber-color);">Probe Mem → SSD → S3</span>
          </div>
          <div class="form-row">
            <input type="text" id="read-key" placeholder="Key to read" value="user:101">
            <button class="btn btn-read" id="btn-read">Read Key</button>
          </div>
          <div class="presets-row">
            <span style="font-size: 0.75rem; color: var(--text-dim); align-self: center;">Quick Read:</span>
            <button class="btn-chip" onclick="quickRead('user:101')">user:101</button>
            <button class="btn-chip" onclick="quickRead('user:104')">user:104</button>
            <button class="btn-chip" onclick="quickRead('missing:key')">missing:key</button>
          </div>
        </div>

        <!-- Engine Operations -->
        <div class="control-group" style="grid-column: 1 / -1;">
          <div class="control-label">
            <span>Storage Maintenance & Disaster Simulation</span>
          </div>
          <div class="form-row" style="flex-wrap: wrap;">
            <button class="btn btn-secondary" id="btn-flush">📦 Force Flush to S3</button>
            <button class="btn btn-secondary" id="btn-compact">🗜️ Force Compaction (L0 → L1)</button>
            <button class="btn btn-danger" id="btn-crash">💥 Simulate Node Crash</button>
          </div>
        </div>

      </div>

      <!-- Canvas Stage -->
      <div class="stage-container">
        <canvas id="simCanvas" width="1140" height="500"></canvas>
      </div>

      <!-- Event Log Stream -->
      <div class="log-panel">
        <div class="log-header">
          <div class="log-title">WASM Event Execution Log (Single Source of Truth)</div>
          <div style="font-size: 0.75rem; color: var(--text-dim);" id="log-count">0 events</div>
        </div>
        <div class="log-stream" id="log-stream">
          <!-- WASM events render here -->
        </div>
      </div>

    </section>

    <!-- Narrative Section 2 -->
    <article class="prose-section">
      <div class="prose-tag">02. The Write Path</div>
      <h2 class="prose-title">Memtable Buffering: Turning Random Writes into Sequential I/O</h2>
      <div class="prose-body">
        <p>When an application writes to HydraDB, the record lands in an in-memory <strong>Memtable</strong> sorted by key (implemented as a Rust <code>BTreeMap</code>). Because RAM access takes ~100 nanoseconds, write operations respond instantaneously.</p>
        <p>Buffering writes in memory serves a critical architectural purpose: instead of issuing thousands of slow, random I/O requests to cloud storage, HydraDB accumulates writes in memory until a threshold is crossed (set to 4 keys in this demo), converting random writes into bulk sequential files.</p>
      </div>
    </article>

    <!-- Narrative Section 3 -->
    <article class="prose-section type-flush">
      <div class="prose-tag">03. Cloud Persistence</div>
      <h2 class="prose-title">Flushing: Creating Immutable SSTables in Object Storage</h2>
      <div class="prose-body">
        <p>When the Memtable reaches capacity, a background worker triggers a <strong>Flush</strong>. The contents of the Memtable are serialized into a binary, sorted string table (SSTable) and uploaded to the mock Object Store (S3).</p>
        <p>These flushed files are strictly <strong>immutable</strong>. Once written to object storage, they are never modified in place. To ensure fast subsequent access, the newly written SSTable is also populated into the node's local SSD cache. Once durable in S3, the RAM Memtable is safely cleared to receive new writes.</p>
      </div>
    </article>

    <!-- Narrative Section 4 -->
    <article class="prose-section type-read">
      <div class="prose-tag">04. The Read Path</div>
      <h2 class="prose-title">Multi-Tier Read Hierarchy: 100ns RAM to 100ms Cloud</h2>
      <div class="prose-body">
        <p>Point lookups traverse a strict 3-tier hierarchy: first checking <strong>Memtable</strong> (~100ns), then <strong>Local SSD Cache</strong> (~0.5ms), and finally fetching from the <strong>Object Store</strong> (~95ms) over simulated network HTTP.</p>
        <p>Try reading a key after writing it: if it's still in RAM, latency is ~100ns. After a flush, it hits the local SSD cache (~0.5ms). If the local cache is cold or cleared, the probe fetches directly from S3 (~95ms) and lazily caches the SSTable for future queries.</p>
      </div>
    </article>

    <!-- Narrative Section 5 -->
    <article class="prose-section type-compact">
      <div class="prose-tag">05. Storage Optimization</div>
      <h2 class="prose-title">Compaction: Bounding Read Amplification & Reclaiming Space</h2>
      <div class="prose-body">
        <p>As flushes recur, multiple Level 0 SSTables accumulate in Object Storage. Searching across dozens of files increases <i>read amplification</i>. Furthermore, overwrites or deletes leave obsolete key versions occupying paid storage.</p>
        <p>Periodically, background <strong>Compaction</strong> merges multiple Level 0 files into a single Level 1 file. During compaction, key versions are deduplicated (keeping only the newest sequence number), reclaiming cloud disk space and bounding read latency.</p>
      </div>
    </article>

    <!-- Narrative Section 6 -->
    <article class="prose-section type-crash">
      <div class="prose-tag">06. Production Architecture</div>
      <h2 class="prose-title">Stateless Recovery: SlateDB & HydraDB in Production</h2>
      <div class="prose-body">
        <p>In production engines like SlateDB and HydraDB, compute data-nodes maintain no state that isn't durable in object storage. Click the <strong>Simulate Node Crash</strong> button above to observe this resilience in action.</p>
        <p>When a node crashes, all RAM Memtables and local SSD caches are wiped out. However, because every flushed SSTable lives durably in S3, the new replacement node boots up immediately, serving reads directly from object storage while lazily rebuilding its local SSD cache — achieving zero data loss and instant cloud recovery.</p>
      </div>
    </article>

  </main>

  <footer>
    <div class="container">
      <p>HydraDB Storage Engine Explainer &bull; Built with Rust compiled to WASM &bull; Latency-accurate event-driven simulation</p>
    </div>
  </footer>

  <!-- Embedded WebAssembly Engine & App Logic -->
  <script type="module">
    // Inlined WASM Base64 Payload
    const WASM_BASE64 = "${wasmBase64}";

    ${wasmJsContent.replace('export { initSync, __wbg_init as default };', '')}

    // Main Application Controller
    class HydraExplainerApp {
      constructor() {
        this.engine = null;
        this.canvas = document.getElementById('simCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.animatingEvents = [];
        this.activeProbe = null; // Read probe animation object
        this.activeFlushAnim = null;
        this.activeCompactAnim = null;
        this.crashPulse = 0;
        
        // Setup Canvas Resolution for Retina Display
        this.setupCanvas();
      }

      setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
      }

      async init() {
        try {
          // Initialize WASM core using base64 buffer
          const binaryString = atob(WASM_BASE64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await __wbg_init(bytes.buffer);
          
          this.engine = new HydraEngine(4); // Threshold = 4 keys
          console.log("HydraDB WASM Engine initialized!");

          this.bindEvents();
          this.updateUI();
          this.startRenderLoop();
        } catch (err) {
          console.error("Failed to initialize WASM core:", err);
        }
      }

      bindEvents() {
        document.getElementById('btn-write').addEventListener('click', () => {
          const k = document.getElementById('write-key').value.trim();
          const v = document.getElementById('write-val').value.trim();
          if (k && v) this.write(k, v);
        });

        document.getElementById('btn-read').addEventListener('click', () => {
          const k = document.getElementById('read-key').value.trim();
          if (k) this.read(k);
        });

        document.getElementById('btn-flush').addEventListener('click', () => this.flush());
        document.getElementById('btn-compact').addEventListener('click', () => this.compact());
        document.getElementById('btn-crash').addEventListener('click', () => this.crash());

        window.addEventListener('resize', () => this.setupCanvas());
      }

      getState() {
        if (!this.engine) return null;
        return JSON.parse(this.engine.get_state());
      }

      write(key, value) {
        const eventsJson = this.engine.write(key, value);
        const events = JSON.parse(eventsJson);
        events.forEach(evt => this.handleWasmEvent(evt));
        this.updateUI();
      }

      read(key) {
        const evtJson = this.engine.read(key);
        const evt = JSON.parse(evtJson);
        this.handleWasmEvent(evt);
        this.updateUI();
      }

      flush() {
        const evtJson = this.engine.flush();
        if (evtJson && evtJson !== "null") {
          const evt = JSON.parse(evtJson);
          this.handleWasmEvent(evt);
          this.updateUI();
        }
      }

      compact() {
        const evtJson = this.engine.compact();
        if (evtJson && evtJson !== "null") {
          const evt = JSON.parse(evtJson);
          this.handleWasmEvent(evt);
          this.updateUI();
        }
      }

      crash() {
        const evtJson = this.engine.simulate_crash();
        const evt = JSON.parse(evtJson);
        this.crashPulse = 1.0;
        this.handleWasmEvent(evt);
        this.updateUI();
      }

      handleWasmEvent(evt) {
        // Render in log panel
        this.addLogEntry(evt);

        // Calculate Proportional Animation Duration based on actual logged latency_ms:
        // 0.0001 ms -> 250ms
        // 0.5 ms -> 600ms
        // 95 ms -> 1800ms
        let animDuration = 400;
        if (evt.latency_ms > 50) {
          animDuration = 1800; // Object store network traversal
        } else if (evt.latency_ms > 0.1) {
          animDuration = 700;  // Local SSD cache traversal
        } else {
          animDuration = 300;  // RAM Memtable lookup
        }

        if (evt.event_type === 'Read') {
          let targetY = 100; // Memtable lane
          if (evt.hit_layer === 'LocalCache') targetY = 240;
          else if (evt.hit_layer === 'ObjectStore' || evt.hit_layer === 'None') targetY = 380;

          this.activeProbe = {
            key: evt.key,
            hitLayer: evt.hit_layer,
            latencyMs: evt.latency_ms,
            startTime: performance.now(),
            duration: animDuration,
            currentY: 80,
            targetY: targetY,
            progress: 0
          };
        } else if (evt.event_type === 'Flush') {
          this.activeFlushAnim = {
            startTime: performance.now(),
            duration: 1000
          };
        } else if (evt.event_type === 'Compaction') {
          this.activeCompactAnim = {
            startTime: performance.now(),
            duration: 1200
          };
        }
      }

      addLogEntry(evt) {
        const stream = document.getElementById('log-stream');
        const entry = document.createElement('div');
        entry.className = \`log-entry evt-\${evt.event_type}\`;
        
        const layerBadge = evt.hit_layer ? \`<span class="log-badge">\${evt.hit_layer}</span>\` : '';
        const latencyText = evt.latency_ms !== undefined ? \`<span class="log-latency">\${evt.latency_ms < 0.01 ? (evt.latency_ms * 1000).toFixed(0) + 'ns' : evt.latency_ms.toFixed(3) + 'ms'}</span>\` : '';
        
        entry.innerHTML = \`
          <div>
            <strong>[\${evt.event_type}]</strong> \${evt.details}
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            \${layerBadge}
            \${latencyText}
          </div>
        \`;

        stream.insertBefore(entry, stream.firstChild);

        // Update log count
        const totalLogs = stream.children.length;
        document.getElementById('log-count').innerText = \`\${totalLogs} event\${totalLogs === 1 ? '' : 's'}\`;
      }

      updateUI() {
        const st = this.getState();
        if (!st) return;

        // Metrics
        document.getElementById('metric-memtable').innerHTML = \`\${st.memtable_entries.length} <span class="metric-unit">/ 4 keys</span>\`;
        document.getElementById('metric-cache').innerHTML = \`\${st.cached_file_ids.length} <span class="metric-unit">cached SSTs</span>\`;
        document.getElementById('metric-objectstore').innerHTML = \`\${st.object_store_files.length} <span class="metric-unit">files (\${st.total_durable_bytes} B)</span>\`;

        const logStream = document.getElementById('log-stream');
        const lastEntry = logStream.firstChild;
        if (this.activeProbe) {
          document.getElementById('metric-last-hit').innerText = this.activeProbe.hitLayer || 'None';
          const lat = this.activeProbe.latencyMs;
          document.getElementById('metric-latency').innerHTML = \`\${lat < 0.01 ? (lat * 1000).toFixed(0) + ' ns' : lat.toFixed(3) + ' ms'}\`;
        }
      }

      startRenderLoop() {
        const render = (now) => {
          this.drawCanvas(now);
          requestAnimationFrame(render);
        };
        requestAnimationFrame(render);
      }

      drawCanvas(now) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        // Draw Lane Backgrounds & Divider Lines
        this.drawLanes(ctx, w, h);

        const st = this.getState();
        if (!st) return;

        // Draw Lane 1: Memtable Entries
        this.drawMemtableLane(ctx, st.memtable_entries, w);

        // Draw Lane 2: Local SSD Cache SSTable File Cards
        this.drawCacheLane(ctx, st.cached_file_ids, st.object_store_files, w);

        // Draw Lane 3: Object Store (S3) Immutable Files
        this.drawObjectStoreLane(ctx, st.object_store_files, w);

        // Draw Active Animations & Overlay Effects
        this.drawAnimations(ctx, now, w);
      }

      drawLanes(ctx, w, h) {
        // Lane 1: Memtable (Y: 20 to 140)
        ctx.fillStyle = 'rgba(6, 182, 212, 0.03)';
        ctx.fillRect(16, 20, w - 32, 120);
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(16, 20, w - 32, 120);

        ctx.fillStyle = '#06B6D4';
        ctx.font = '600 12px "JetBrains Mono"';
        ctx.fillText('RAM MEMTABLE (BTreeMap Buffer — ~100ns)', 32, 44);

        // Lane 2: Local SSD Cache (Y: 160 to 280)
        ctx.fillStyle = 'rgba(16, 185, 129, 0.03)';
        ctx.fillRect(16, 160, w - 32, 120);
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.2)';
        ctx.strokeRect(16, 160, w - 32, 120);

        ctx.fillStyle = '#10B981';
        ctx.fillText('LOCAL SSD CACHE (Cached SSTables — ~0.5ms)', 32, 184);

        // Lane 3: Object Store (S3) (Y: 300 to 460)
        ctx.fillStyle = 'rgba(139, 92, 246, 0.03)';
        ctx.fillRect(16, 300, w - 32, 160);
        ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
        ctx.strokeRect(16, 300, w - 32, 160);

        ctx.fillStyle = '#A78BFA';
        ctx.fillText('MOCK OBJECT STORE (S3 Immutable SSTables — ~95ms)', 32, 324);
      }

      drawMemtableLane(ctx, entries, w) {
        const startX = 32;
        const startY = 60;
        const slotW = 160;
        const slotH = 60;

        for (let i = 0; i < 4; i++) {
          const x = startX + i * (slotW + 16);
          const entry = entries[i];

          if (entry) {
            ctx.fillStyle = 'rgba(6, 182, 212, 0.15)';
            ctx.strokeStyle = '#06B6D4';
            ctx.lineWidth = 1.5;
            ctx.fillRect(x, startY, slotW, slotH);
            ctx.strokeRect(x, startY, slotW, slotH);

            ctx.fillStyle = '#FFF';
            ctx.font = '600 13px "JetBrains Mono"';
            ctx.fillText(entry.key, x + 12, startY + 24);

            ctx.fillStyle = '#94A3B8';
            ctx.font = '11px "Inter"';
            ctx.fillText(\`=\${entry.value} (seq #\${entry.seq})\`, x + 12, startY + 44);
          } else {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
            ctx.lineWidth = 1;
            ctx.fillRect(x, startY, slotW, slotH);
            ctx.strokeRect(x, startY, slotW, slotH);

            ctx.fillStyle = '#475569';
            ctx.font = '12px "Inter"';
            ctx.fillText(\`[Empty Slot \${i+1}]\`, x + 12, startY + 36);
          }
        }
      }

      drawCacheLane(ctx, cachedIds, allFiles, w) {
        const startX = 32;
        const startY = 200;
        const cardW = 180;
        const cardH = 65;

        if (cachedIds.length === 0) {
          ctx.fillStyle = '#64748B';
          ctx.font = '13px "Inter"';
          ctx.fillText('No cached SSTables (Local SSD state is cold or cleared)', startX, startY + 30);
          return;
        }

        cachedIds.forEach((id, idx) => {
          const x = startX + idx * (cardW + 16);
          const fileMeta = allFiles.find(f => f.id === id);

          ctx.fillStyle = 'rgba(16, 185, 129, 0.12)';
          ctx.strokeStyle = '#10B981';
          ctx.lineWidth = 1.5;
          ctx.fillRect(x, startY, cardW, cardH);
          ctx.strokeRect(x, startY, cardW, cardH);

          ctx.fillStyle = '#34D399';
          ctx.font = '600 12px "JetBrains Mono"';
          ctx.fillText(id, x + 12, startY + 22);

          if (fileMeta) {
            ctx.fillStyle = '#94A3B8';
            ctx.font = '11px "Inter"';
            ctx.fillText(\`\${fileMeta.record_count} keys [\${fileMeta.min_key}..\${fileMeta.max_key}]\`, x + 12, startY + 42);
            ctx.fillText(\`L\${fileMeta.level} SST (\${fileMeta.size_bytes} B)\`, x + 12, startY + 56);
          }
        });
      }

      drawObjectStoreLane(ctx, files, w) {
        const startX = 32;
        const startY = 345;
        const cardW = 200;
        const cardH = 80;

        if (files.length === 0) {
          ctx.fillStyle = '#64748B';
          ctx.font = '13px "Inter"';
          ctx.fillText('Object store empty (No SSTs flushed yet. Write 4 keys to trigger first flush!)', startX, startY + 40);
          return;
        }

        files.forEach((file, idx) => {
          const x = startX + idx * (cardW + 18);
          const isL1 = file.level > 0;

          ctx.fillStyle = isL1 ? 'rgba(245, 158, 11, 0.12)' : 'rgba(139, 92, 246, 0.12)';
          ctx.strokeStyle = isL1 ? '#F59E0B' : '#8B5CF6';
          ctx.lineWidth = 1.5;
          ctx.fillRect(x, startY, cardW, cardH);
          ctx.strokeRect(x, startY, cardW, cardH);

          // Level badge
          ctx.fillStyle = isL1 ? '#F59E0B' : '#A78BFA';
          ctx.font = '700 11px "JetBrains Mono"';
          ctx.fillText(\`LEVEL \${file.level} SST\`, x + 12, startY + 20);

          ctx.fillStyle = '#FFF';
          ctx.font = '600 13px "JetBrains Mono"';
          ctx.fillText(file.id, x + 12, startY + 40);

          ctx.fillStyle = '#94A3B8';
          ctx.font = '11px "Inter"';
          ctx.fillText(\`\${file.record_count} keys (\${file.size_bytes} Bytes)\`, x + 12, startY + 58);
          ctx.fillText(\`Range: \${file.min_key} → \${file.max_key}\`, x + 12, startY + 72);
        });
      }

      drawAnimations(ctx, now, w) {
        // Draw Read Probe Beam
        if (this.activeProbe) {
          const p = this.activeProbe;
          const elapsed = now - p.startTime;
          p.progress = Math.min(1, elapsed / p.duration);

          const currentY = 80 + (p.targetY - 80) * p.progress;

          // Glowing laser beam line down
          ctx.strokeStyle = '#F59E0B';
          ctx.lineWidth = 3;
          ctx.shadowColor = '#F59E0B';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(w / 2, 80);
          ctx.lineTo(w / 2, currentY);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Moving probe head
          ctx.fillStyle = '#FBBF24';
          ctx.beginPath();
          ctx.arc(w / 2, currentY, 8, 0, Math.PI * 2);
          ctx.fill();

          // Probe readout text badge
          ctx.fillStyle = '#FFF';
          ctx.font = '600 12px "JetBrains Mono"';
          const latText = p.latencyMs < 0.01 ? (p.latencyMs * 1000).toFixed(0) + ' ns' : p.latencyMs.toFixed(2) + ' ms';
          ctx.fillText(\`LOOKUP '\${p.key}' → \${p.hitLayer || 'Searching'} (\${latText})\`, w / 2 + 16, currentY + 4);

          if (p.progress >= 1) {
            this.activeProbe = null; // Animation completed
          }
        }

        // Draw Crash Effect Overlay
        if (this.crashPulse > 0) {
          ctx.fillStyle = \`rgba(239, 68, 68, \${this.crashPulse * 0.25})\`;
          ctx.fillRect(0, 0, w, this.height);
          this.crashPulse -= 0.02;
        }
      }
    }

    // Helper functions for preset buttons
    window.quickWrite = function(k, v) {
      document.getElementById('write-key').value = k;
      document.getElementById('write-val').value = v;
      window.app.write(k, v);
    };

    window.quickRead = function(k) {
      document.getElementById('read-key').value = k;
      window.app.read(k);
    };

    // Initialize Application
    window.addEventListener('DOMContentLoaded', () => {
      window.app = new HydraExplainerApp();
      window.app.init();
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'index.html'), htmlContent);
console.log('Successfully generated self-contained index.html!');
"
