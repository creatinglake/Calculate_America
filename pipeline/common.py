"""Shared helpers for the Fair Share data pipeline."""
from __future__ import annotations

import hashlib
import json
from datetime import date
from pathlib import Path

import requests

PIPELINE = Path(__file__).resolve().parent
RAW = PIPELINE / "raw"
REPO = PIPELINE.parent
OUT = REPO / "public" / "data"
FETCH_LOG = RAW / "fetch_log.json"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def download(url: str, dest: Path, force: bool = False) -> dict:
    """Download url to dest (skipped if present unless force) and log it.

    Returns the log record: url, file, bytes, sha256, retrieved date and the
    server's Last-Modified header, which build.py copies into manifest.json.
    """
    dest.parent.mkdir(parents=True, exist_ok=True)
    log = json.loads(FETCH_LOG.read_text()) if FETCH_LOG.exists() else {}
    if dest.exists() and not force and dest.name in log:
        return log[dest.name]

    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        tmp = dest.with_suffix(dest.suffix + ".part")
        with tmp.open("wb") as f:
            for chunk in r.iter_content(1 << 20):
                f.write(chunk)
        tmp.replace(dest)
        record = {
            "url": url,
            "file": dest.name,
            "bytes": dest.stat().st_size,
            "sha256": sha256(dest),
            "retrieved": date.today().isoformat(),
            "last_modified": r.headers.get("Last-Modified"),
        }
    log[dest.name] = record
    FETCH_LOG.write_text(json.dumps(log, indent=2, sort_keys=True) + "\n")
    return record
