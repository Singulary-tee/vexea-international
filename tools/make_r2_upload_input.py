#!/usr/bin/env python3
import base64
import json
import sys
from pathlib import Path

if len(sys.argv) != 4:
    raise SystemExit("usage: make_r2_upload_input.py <source> <r2_key> <output_json>")
source = Path(sys.argv[1])
r2_key = sys.argv[2]
out = Path(sys.argv[3])
data = base64.b64encode(source.read_bytes()).decode("ascii")
js = (
    "async () => { "
    f"const bytes = Uint8Array.from(atob({json.dumps(data)}), c => c.charCodeAt(0)); "
    f"return cloudflare.request({{ method: 'PUT', path: '/accounts/' + accountId + '/r2/buckets/vexea-international-bucket/objects/{r2_key}', "
    "body: bytes, contentType: 'audio/ogg', rawBody: true }); "
    "}"
)
out.write_text(json.dumps({"code": js}, ensure_ascii=False))
print(f"prepared {source} -> {r2_key} ({source.stat().st_size} bytes)")
