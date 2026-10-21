# Data pipeline

Downloads source data, validates it, and writes the small JSON files the site
reads (`public/data/`). Raw downloads go to `pipeline/raw/` (gitignored); each
file's URL, size, SHA-256 and retrieval date are logged in `raw/fetch_log.json`
and copied into `public/data/manifest.json`.

```
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
.venv/bin/python fetch_wid.py      # WID per-country files
.venv/bin/python build.py          # validate and write public/data/
.venv/bin/pytest                   # pipeline tests
```

Every source check is logged in [VERIFICATION.md](VERIFICATION.md).
