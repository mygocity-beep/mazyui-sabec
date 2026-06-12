# 21st.dev Component Catalog

This scraper catalogs public components from 21st.dev and extracts the exact
AI-ready text produced by the `data-test="copy-prompt-button"` action.

It uses:

- `GET /api/trpc/demos.list` for the complete paginated public catalog.
- `POST /api/prompts` with `prompt_type=extended` and each `demo_id`.
- A Playwright page with Clerk cookies so short-lived session tokens renew
  while a long extraction is running.

## Setup

```powershell
cd C:\Users\mygoc\Downloads\Aplicativos\scrap\21st_component_catalog
python -m pip install -r requirements.txt
python -m playwright install chromium
```

## Run

Use a current Chrome TSV cookie export as an external input. Do not place it
inside this folder or commit it.

```powershell
python .\scrape_21st.py `
  --cookies-file "C:\path\to\21st-cookies.txt"
```

Test with two prompts:

```powershell
python .\scrape_21st.py `
  --cookies-file "C:\path\to\21st-cookies.txt" `
  --max-items 2
```

Catalog metadata without authentication:

```powershell
python .\scrape_21st.py --catalog-only
```

The process is resumable. Existing prompt files are skipped. Main outputs:

- `output/catalog.json`
- `output/catalog.csv`
- `output/README.md`
- `output/prompts/<author>/<demo-id>_<component>_<variant>.md`

The cookie export must contain the `.clerk.21st.dev` `__client` cookie. The
short-lived `__session` value alone is insufficient for a long run.
