#!/usr/bin/env python3
"""Catalog public 21st.dev components and extract their Copy prompt output."""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import quote

import requests
from playwright.sync_api import Page, sync_playwright

BASE_URL = "https://21st.dev"
LIST_ENDPOINT = f"{BASE_URL}/api/trpc/demos.list"
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36"
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Catalog 21st.dev components and extract AI-ready prompts."
    )
    parser.add_argument(
        "--cookies-file",
        type=Path,
        help="Chrome TSV cookie export. Required unless --catalog-only is used.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parent / "output",
        help="Output directory (default: ./output).",
    )
    parser.add_argument(
        "--prompt-type",
        default="extended",
        choices=("extended", "short", "default"),
        help="Prompt variant sent to /api/prompts.",
    )
    parser.add_argument(
        "--catalog-only",
        action="store_true",
        help="Collect metadata without calling the authenticated prompt endpoint.",
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=0,
        help="Limit prompt extraction for testing; 0 means all catalog entries.",
    )
    parser.add_argument(
        "--start-at",
        type=int,
        default=0,
        help="Skip this many catalog entries before extracting prompts.",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.35,
        help="Delay in seconds between prompt requests.",
    )
    parser.add_argument(
        "--headed",
        action="store_true",
        help="Show the browser used to maintain the authenticated session.",
    )
    parser.add_argument(
        "--refresh-catalog",
        action="store_true",
        help="Ignore an existing catalog.json and fetch the catalog again.",
    )
    return parser.parse_args()


def safe_slug(value: str) -> str:
    value = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip())
    return value.strip("-")[:120] or "unnamed"


def trpc_json(response: requests.Response) -> dict:
    response.raise_for_status()
    body = response.json()
    return body["result"]["data"]["json"]


def fetch_catalog(session: requests.Session) -> list[dict]:
    items: list[dict] = []
    cursor = 0

    while True:
        payload = {
            "json": {
                "sortBy": "date",
                "limit": 200,
                "includePrivate": False,
                "onlyDefaultDemo": True,
                "cursor": cursor,
            }
        }
        url = f"{LIST_ENDPOINT}?input={quote(json.dumps(payload, separators=(',', ':')))}"
        data = trpc_json(session.get(url, timeout=90))
        page_items = data.get("items") or []
        items.extend(page_items)
        print(f"Catalog: {len(items)}/{data.get('totalCount', '?')}")

        next_cursor = data.get("nextCursor")
        if next_cursor is None or not page_items:
            break
        cursor = next_cursor

    unique: dict[int, dict] = {}
    for item in items:
        unique[int(item["id"])] = normalize_item(item)
    return sorted(unique.values(), key=lambda item: int(item["demo_id"]), reverse=True)


def normalize_item(item: dict) -> dict:
    component = item.get("component_data") or item.get("component") or {}
    user = (
        item.get("component_user_data")
        or item.get("user_data")
        or component.get("user")
        or item.get("user")
        or {}
    )
    username = user.get("display_username") or user.get("username") or "unknown"
    component_slug = component.get("component_slug") or safe_slug(
        component.get("name") or str(component.get("id") or "component")
    )
    demo_slug = item.get("demo_slug") or "default"
    tags = item.get("tags") or []
    tag_names = [
        tag.get("name") or tag.get("tags", {}).get("name")
        for tag in tags
        if isinstance(tag, dict)
    ]

    return {
        "demo_id": int(item["id"]),
        "component_id": component.get("id") or item.get("component_id"),
        "name": component.get("name") or item.get("name") or component_slug,
        "demo_name": item.get("name") or "Default",
        "username": username,
        "author_name": user.get("display_name") or user.get("name") or username,
        "component_slug": component_slug,
        "demo_slug": demo_slug,
        "description": component.get("description") or "",
        "tags": [name for name in tag_names if name],
        "dependencies": component.get("dependencies") or {},
        "downloads_count": component.get("downloads_count") or 0,
        "view_count": item.get("view_count") or 0,
        "bookmarks_count": item.get("bookmarks_count") or 0,
        "created_at": item.get("created_at"),
        "updated_at": item.get("updated_at"),
        "preview_url": item.get("preview_url") or component.get("preview_url"),
        "video_url": item.get("video_url") or component.get("video_url"),
        "code_url": component.get("code"),
        "demo_code_url": item.get("demo_code"),
        "registry_url": component.get("registry_url"),
        "bundle_url": item.get("bundle_html_url")
        or (item.get("bundle_url") or {}).get("html"),
        "source_url": (
            f"{BASE_URL}/community/components/{username}/"
            f"{component_slug}/{demo_slug}"
        ),
    }


def load_cookie_export(path: Path) -> list[dict]:
    if not path.is_file():
        raise FileNotFoundError(f"Cookie file not found: {path}")

    cookies: list[dict] = []
    allowed_domains = {"21st.dev", "clerk.21st.dev"}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        columns = line.split("\t")
        if len(columns) < 4:
            continue
        name, value, domain, cookie_path = columns[:4]
        if domain.lstrip(".") not in allowed_domains:
            continue
        cookies.append(
            {
                "name": name,
                "value": value,
                "domain": domain,
                "path": cookie_path or "/",
            }
        )

    if not any(cookie["name"] == "__client" for cookie in cookies):
        raise ValueError(
            "The export does not contain the Clerk __client cookie needed "
            "to renew the 21st.dev session."
        )
    return cookies


def prompt_path(output: Path, item: dict) -> Path:
    folder = output / "prompts" / safe_slug(item["username"])
    filename = (
        f"{item['demo_id']}_"
        f"{safe_slug(item['component_slug'])}_"
        f"{safe_slug(item['demo_slug'])}.md"
    )
    return folder / filename


def fetch_prompt(page: Page, demo_id: int, prompt_type: str) -> str:
    result = page.evaluate(
        """async ({demoId, promptType}) => {
          const response = await fetch("/api/prompts", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({prompt_type: promptType, demo_id: demoId})
          });
          return {status: response.status, text: await response.text()};
        }""",
        {"demoId": demo_id, "promptType": prompt_type},
    )
    status = int(result["status"])
    text = result["text"]
    if status != 200:
        try:
            message = json.loads(text).get("error", text)
        except json.JSONDecodeError:
            message = text
        raise RuntimeError(f"HTTP {status}: {message}")
    prompt = json.loads(text).get("prompt")
    if not prompt:
        raise RuntimeError("The prompt endpoint returned no prompt.")
    return prompt


def write_prompt(path: Path, item: dict, prompt: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    header = (
        f"# {item['name']}\n\n"
        f"- Source: {item['source_url']}\n"
        f"- Author: {item['author_name']} (`{item['username']}`)\n"
        f"- Demo ID: `{item['demo_id']}`\n"
        f"- Tags: {', '.join(item['tags']) or 'none'}\n\n"
        "## Prompt\n\n"
    )
    path.write_text(header + prompt.rstrip() + "\n", encoding="utf-8")


def write_catalog(output: Path, catalog: list[dict]) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / "catalog.json").write_text(
        json.dumps(catalog, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    columns = [
        "demo_id",
        "component_id",
        "name",
        "demo_name",
        "username",
        "author_name",
        "component_slug",
        "demo_slug",
        "tags",
        "downloads_count",
        "view_count",
        "bookmarks_count",
        "source_url",
        "preview_url",
        "code_url",
        "demo_code_url",
        "registry_url",
        "prompt_file",
    ]
    with (output / "catalog.csv").open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=columns, extrasaction="ignore")
        writer.writeheader()
        for item in catalog:
            row = dict(item)
            row["tags"] = ", ".join(item["tags"])
            row["prompt_file"] = str(prompt_path(output, item).relative_to(output))
            writer.writerow(row)


def write_index(output: Path, catalog: list[dict]) -> None:
    completed = sum(prompt_path(output, item).is_file() for item in catalog)
    lines = [
        "# 21st.dev Component Catalog",
        "",
        f"- Cataloged demos: {len(catalog)}",
        f"- Extracted prompts: {completed}",
        f"- Updated: {datetime.now(timezone.utc).isoformat()}",
        "",
        "| Component | Author | Tags | Prompt |",
        "|---|---|---|---|",
    ]
    for item in catalog:
        path = prompt_path(output, item)
        prompt_link = (
            f"[prompt]({path.relative_to(output).as_posix()})"
            if path.is_file()
            else "pending"
        )
        name = str(item["name"]).replace("|", "\\|")
        tags = ", ".join(item["tags"]).replace("|", "\\|")
        lines.append(
            f"| [{name}]({item['source_url']}) | {item['username']} | "
            f"{tags} | {prompt_link} |"
        )
    (output / "README.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def extract_prompts(args: argparse.Namespace, catalog: list[dict]) -> None:
    cookies = load_cookie_export(args.cookies_file)
    selected = catalog[args.start_at :]
    if args.max_items > 0:
        selected = selected[: args.max_items]

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(headless=not args.headed)
        context = browser.new_context(user_agent=USER_AGENT, locale="en-US")
        context.add_cookies(cookies)
        page = context.new_page()
        page.goto(
            f"{BASE_URL}/community/components",
            wait_until="domcontentloaded",
            timeout=90_000,
        )
        page.wait_for_timeout(4_000)

        for index, item in enumerate(selected, start=1):
            path = prompt_path(args.output, item)
            if path.is_file():
                print(f"[{index}/{len(selected)}] skip {item['name']}")
                continue

            for attempt in range(1, 5):
                try:
                    prompt = fetch_prompt(page, item["demo_id"], args.prompt_type)
                    write_prompt(path, item, prompt)
                    print(f"[{index}/{len(selected)}] saved {item['name']}")
                    break
                except RuntimeError as error:
                    message = str(error)
                    if "HTTP 401" in message and attempt < 4:
                        page.reload(wait_until="domcontentloaded", timeout=90_000)
                        page.wait_for_timeout(4_000)
                        continue
                    if "HTTP 429" in message and attempt < 4:
                        time.sleep(15 * attempt)
                        continue
                    print(
                        f"[{index}/{len(selected)}] failed {item['name']}: {error}",
                        file=sys.stderr,
                    )
                    break
            write_index(args.output, catalog)
            time.sleep(max(0, args.delay))

        browser.close()


def main() -> int:
    args = parse_args()
    args.output = args.output.resolve()
    catalog_file = args.output / "catalog.json"

    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept": "application/json"})
    if catalog_file.is_file() and not args.refresh_catalog:
        catalog = json.loads(catalog_file.read_text(encoding="utf-8"))
        print(f"Using cached catalog with {len(catalog)} demos.")
    else:
        catalog = fetch_catalog(session)
        write_catalog(args.output, catalog)

    write_catalog(args.output, catalog)
    write_index(args.output, catalog)

    if not args.catalog_only:
        if not args.cookies_file:
            print("--cookies-file is required to extract prompts.", file=sys.stderr)
            return 2
        extract_prompts(args, catalog)
        write_index(args.output, catalog)

    print(f"Output: {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
