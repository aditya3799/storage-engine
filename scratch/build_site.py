import os
import base64
import re

pkg_dir = os.path.join(os.path.dirname(__file__), "..", "pkg")
wasm_file_path = os.path.join(pkg_dir, "hydradb_storage_core_bg.wasm")
wasm_js_path = os.path.join(pkg_dir, "hydradb_storage_core.js")
template_path = os.path.join(os.path.dirname(__file__), "template.html")
output_path = os.path.join(os.path.dirname(__file__), "..", "index.html")

with open(wasm_file_path, "rb") as f:
    wasm_bytes = f.read()
    wasm_base64 = base64.b64encode(wasm_bytes).decode("utf-8")

with open(wasm_js_path, "r", encoding="utf-8") as f:
    wasm_js = f.read()

# Clean WASM JS for inline script execution
wasm_js_clean = re.sub(r'export\s+{[^}]*};?', '', wasm_js)
wasm_js_clean = re.sub(r'export\s+class\s+', 'class ', wasm_js_clean)
wasm_js_clean = re.sub(r'export\s+function\s+', 'function ', wasm_js_clean)
wasm_js_clean = re.sub(r'export\s+default\s+function\s+', 'async function ', wasm_js_clean)
wasm_js_clean = re.sub(r'export\s+', '', wasm_js_clean)
wasm_js_clean = wasm_js_clean.replace("import.meta.url", '""')

with open(template_path, "r", encoding="utf-8") as f:
    template = f.read()

final_html = template.replace("__WASM_BASE64__", wasm_base64).replace("__WASM_JS_BODY__", wasm_js_clean)

with open(output_path, "w", encoding="utf-8") as f:
    f.write(final_html)

print(f"Successfully generated clean {output_path} ({len(final_html)} bytes)")
