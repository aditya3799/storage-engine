// Test that initSync works correctly with the WASM binary
const fs = require('fs');

// Minimal browser API shims needed by wasm-bindgen
global.TextDecoder = require('util').TextDecoder;
global.TextEncoder = require('util').TextEncoder;
global.FinalizationRegistry = class { constructor(cb){} register(){} unregister(){} };
global.Symbol = global.Symbol || {};

// Read and process the wasm-bindgen JS
let wasmJs = fs.readFileSync('./pkg/hydradb_storage_core.js', 'utf8');
// Strip ES module syntax so we can eval it
wasmJs = wasmJs.replace(/^export\s+(class\s)/mg, '$1');
wasmJs = wasmJs.replace(/^export\s+\{[^}]+\};\s*$/m, '');
wasmJs = wasmJs.replace(/import\.meta\.url/g, '""');

eval(wasmJs);

// Load the actual WASM file
const wasmBuf = fs.readFileSync('./pkg/hydradb_storage_core_bg.wasm');

try {
  initSync(wasmBuf.buffer);
  console.log('initSync: WASM loaded successfully');
  
  const engine = new HydraEngine(4);
  console.log('HydraEngine created');
  
  const writeEvents = JSON.parse(engine.write('k1', 'v1'));
  console.log('Write events:', writeEvents.map(e => e.event_type));
  
  const readEvt = JSON.parse(engine.read('k1'));
  console.log('Read hit_layer:', readEvt.hit_layer, 'latency_ms:', readEvt.latency_ms);
  
  console.log('\n✅ initSync test PASSED!');
} catch(e) {
  console.error('❌ Test FAILED:', e);
  process.exit(1);
}
