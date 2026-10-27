"""Decode a browser-transfer dump ({path: base64}) into public/img/legacy/.

The browser pane fetched images from mdpravo.ru (same origin) and returned
them as base64; oversized tool results are saved as JSON files. This script
reads such a file, verifies image signatures and writes the files.

usage: python3 decode_transfer.py <tool-result.txt> [out_dir]
"""
import base64
import json
import os
import sys

SIGS = {b"RIFF": "webp", b"\xff\xd8\xff": "jpeg", b"\x89PNG": "png"}


def kind(raw: bytes) -> str:
    for sig, k in SIGS.items():
        if raw.startswith(sig):
            return k
    if raw[4:12] in (b"ftypavif", b"ftypavis"):
        return "avif"
    return "unknown"


def main(src, out_dir):
    data = json.load(open(src, encoding="utf-8"))
    txt = data[0]["text"] if isinstance(data, list) else data
    start = txt.index('"{')
    end = txt.index('}"', start) + 2
    obj = json.loads(json.loads(txt[start:end]))
    os.makedirs(out_dir, exist_ok=True)
    for path, b64 in obj.items():
        raw = base64.b64decode(b64)
        k = kind(raw)
        if k == "unknown":
            raise SystemExit(f"refusing {path}: not a known image signature")
        dest = os.path.join(out_dir, os.path.basename(path))
        with open(dest, "wb") as f:
            f.write(raw)
        print(f"{dest}\t{len(raw)}\t{k}")


if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else os.path.join(here, "../../public/img/legacy"))
