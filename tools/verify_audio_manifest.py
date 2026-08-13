#!/usr/bin/env python3
"""Verify that every canonical client audio path exists in an R2 object-list export.

Usage:
    python3 tools/verify_audio_manifest.py /path/to/r2_audio_object_list.json

Generate the input through the Cloudflare R2 object-list operation with the
`Audio/` prefix, then save its JSON response locally.
"""

import json
import re
import sys
from pathlib import Path

if len(sys.argv) != 2:
    raise SystemExit("usage: verify_audio_manifest.py <r2_audio_object_list.json>")

repo = Path(__file__).resolve().parents[1]
listing_path = Path(sys.argv[1])
if not listing_path.is_file():
    raise SystemExit(f"R2 object-list file not found: {listing_path}")

manifest_text = (repo / "client" / "audio-manifest.ts").read_text(encoding="utf-8")
listing = json.loads(listing_path.read_text(encoding="utf-8"))
objects = listing.get("objects", listing.get("result", {}).get("objects", []))
if not isinstance(objects, list):
    raise SystemExit("Could not find an 'objects' list in the supplied R2 export")

manifest_paths = set(re.findall(r"path: '([^']+)'", manifest_text))
r2_objects = [obj for obj in objects if obj.get("size", 0) > 0 and obj.get("key", "").endswith(".opus")]
r2_paths = {obj["key"] for obj in r2_objects}

print(f"manifest_paths={len(manifest_paths)}")
print(f"r2_audio_objects={len(r2_paths)}")
print("missing_from_r2:", sorted(manifest_paths - r2_paths))
print("missing_from_manifest:", sorted(r2_paths - manifest_paths))
print("all_audio_ogg:", all(obj.get("contentType") == "audio/ogg" for obj in r2_objects))

if manifest_paths != r2_paths:
    raise SystemExit(1)
