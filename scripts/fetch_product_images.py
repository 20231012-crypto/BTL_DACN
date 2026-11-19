#!/usr/bin/env python3
"""Fetch high-resolution product images from nhathuoclongchau.com.vn."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import io
import json
from pathlib import Path
import random
import re
import sqlite3
import sys
import time
import unicodedata
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from PIL import Image, UnidentifiedImageError
import requests

SEARCH_URL = "https://nhathuoclongchau.com.vn/tim-kiem"
IMAGE_EXTENSIONS = (".webp", ".jpg", ".jpeg", ".png")
CONTENT_TYPE_TO_EXT = {
    "image/webp": ".webp",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
}
DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/131.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
}
GENERIC_PREFIXES = (
    "thuoc ke don ",
    "thuoc khong ke don ",
    "thuc pham chuc nang ",
    "san pham ",
)


class BlockedError(RuntimeError):
    """Raised when HTTP scraping is blocked or missing SSR product data."""


def normalize_text(value: str) -> str:
    """Lowercase, fold Vietnamese diacritics, and normalize decimal separators."""
    text = (value or "").replace("đ", "d").replace("Đ", "D")
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    text = text.lower()
    text = re.sub(r"(\d),(\d)", r"\1.\2", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize(value: str) -> list[str]:
    """Split normalized text into alphanumeric tokens (keeping decimals like 0.9)."""
    return re.findall(r"[a-z0-9]+(?:\.[a-z0-9]+)?", normalize_text(value))


def clean_search_name(name: str, max_words: int = 5) -> str:
    """Remove bracketed packaging notes and generic prefixes for higher search hit rate."""
    cleaned = re.sub(r"[\(\[][^)\]]*[\)\]]", " ", name)
    cleaned = re.sub(r"\s*[-–—]\s*.*$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    folded = normalize_text(cleaned)
    for prefix in GENERIC_PREFIXES:
        if folded.startswith(prefix):
            cleaned = cleaned[len(prefix) :].strip()
            break

    cleaned = re.sub(r"(\d),(\d)", r"\1.\2", cleaned)
    words = cleaned.split()
    if len(words) > max_words:
        cleaned = " ".join(words[:max_words])
    return cleaned.strip()


def build_query_candidates(name: str) -> list[str]:
    """Build ordered search queries from specific cleaned name to shorter fallback."""
    primary = clean_search_name(name, max_words=5)
    shorter = clean_search_name(name, max_words=4)
    words = primary.split()
    shortest = " ".join(words[:3]) if len(words) > 3 else ""

    queries: list[str] = []
    for candidate in (primary, shorter, shortest, name.strip()):
        if candidate and candidate not in queries:
            queries.append(candidate)
    return queries


def _parse_js_string(source: str, index: int) -> tuple[str, int]:
    """Parse a single- or double-quoted JS string literal starting at index."""
    quote = source[index]
    index += 1
    chars: list[str] = []
    while index < len(source):
        ch = source[index]
        if ch == "\\" and index + 1 < len(source):
            nxt = source[index + 1]
            escapes = {"n": "\n", "r": "\r", "t": "\t", "\\": "\\", "'": "'", '"': '"'}
            chars.append(escapes.get(nxt, nxt))
            index += 2
            continue
        if ch == quote:
            return "".join(chars), index + 1
        chars.append(ch)
        index += 1
    raise ValueError("Unterminated JS string in seed file")


def _extract_js_array_literal(source: str, marker: str = "const products = [") -> str:
    """Extract the balanced JS array literal starting at marker."""
    start = source.find(marker)
    if start == -1:
        raise ValueError(f"Could not find `{marker}` in seed file")
    index = source.index("[", start)
    depth = 0
    in_string: str | None = None
    i = index
    while i < len(source):
        ch = source[i]
        if in_string:
            if ch == "\\":
                i += 2
                continue
            if ch == in_string:
                in_string = None
            i += 1
            continue
        if ch in ("'", '"'):
            in_string = ch
        elif ch == "[":
            depth += 1
        elif ch == "]":
            depth -= 1
            if depth == 0:
                return source[index : i + 1]
        i += 1
    raise ValueError("Unbalanced array literal in seed file")


def _parse_js_products_array(array_text: str) -> list[list[Any]]:
    """Parse nested JS arrays containing strings, numbers, booleans, and null."""
    tokens: list[tuple[str, Any]] = []
    i = 0
    length = len(array_text)
    while i < length:
        ch = array_text[i]
        if ch.isspace() or ch == ",":
            i += 1
        elif ch in ("[", "]"):
            tokens.append((ch, ch))
            i += 1
        elif ch in ("'", '"'):
            value, i = _parse_js_string(array_text, i)
            tokens.append(("VAL", value))
        elif ch == "/" and i + 1 < length and array_text[i + 1] == "/":
            newline = array_text.find("\n", i)
            i = length if newline == -1 else newline + 1
        else:
            m = re.match(r"-?\d+(?:\.\d+)?|true|false|null", array_text[i:])
            if not m:
                raise ValueError(f"Unexpected token in seed array near: {array_text[i : i + 30]!r}")
            raw = m.group(0)
            if raw == "true":
                val: Any = True
            elif raw == "false":
                val = False
            elif raw == "null":
                val = None
            elif "." in raw:
                val = float(raw)
            else:
                val = int(raw)
            tokens.append(("VAL", val))
            i += len(raw)

    pos = 0

    def parse_list() -> list[Any]:
        nonlocal pos
        if tokens[pos][0] != "[":
            raise ValueError("Expected `[`")
        pos += 1
        items: list[Any] = []
        while tokens[pos][0] != "]":
            if tokens[pos][0] == "[":
                items.append(parse_list())
            else:
                items.append(tokens[pos][1])
                pos += 1
        pos += 1
        return items

    return parse_list()


def load_products(source_path: Path) -> list[dict[str, Any]]:
    """Load product records ({id, name, unit, ingredient}) from .js, .json, or .sqlite."""
    suffix = source_path.suffix.lower()
    if suffix == ".js":
        content = source_path.read_text(encoding="utf-8")
        rows = _parse_js_products_array(_extract_js_array_literal(content))
        return [
            {
                "id": idx,
                "name": str(row[0]),
                "ingredient": str(row[3] or ""),
                "unit": str(row[5] or ""),
            }
            for idx, row in enumerate(rows, start=1)
        ]

    if suffix == ".json":
        payload = json.loads(source_path.read_text(encoding="utf-8"))
        items = payload["products"] if isinstance(payload, dict) else payload
        return [
            {
                "id": int(item["id"]),
                "name": str(item["name"]),
                "ingredient": str(item.get("ingredient", "")),
                "unit": str(item.get("unit", "")),
                "image_url": str(item.get("image_url", "")),
            }
            for item in items
        ]

    if suffix in (".sqlite", ".db", ".sqlite3"):
        conn = sqlite3.connect(source_path)
        try:
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT id, name, ingredient, unit FROM thuoc WHERE active = 1 ORDER BY id"
            ).fetchall()
            return [dict(row) for row in rows]
        finally:
            conn.close()

    raise ValueError(f"Unsupported input file format: {source_path}")


def extract_next_data_products(html: str) -> list[dict[str, Any]]:
    """Extract products from Long Chau Next.js __NEXT_DATA__ payload."""
    match = re.search(
        r'<script[^>]*id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.DOTALL
    )
    if not match:
        raise BlockedError("Missing __NEXT_DATA__ in Long Chau response")
    data = json.loads(match.group(1))
    page_props = data.get("props", {}).get("pageProps", {})
    products = page_props.get("initProducts", {}).get("products")
    if products is None:
        raise BlockedError("Missing initProducts.products in __NEXT_DATA__")
    return products


def search_via_requests(session: requests.Session, query: str) -> list[dict[str, Any]]:
    """Query Long Chau search page via requests and extract SSR product candidates."""
    response = session.get(
        SEARCH_URL, params={"s": query}, headers=DEFAULT_HEADERS, timeout=20
    )
    if response.status_code in (403, 429, 503):
        raise BlockedError(f"HTTP {response.status_code} from Long Chau")
    response.raise_for_status()
    return extract_next_data_products(response.text)


def search_via_playwright(query: str) -> list[dict[str, Any]]:
    """Fallback search using Playwright headless Chromium."""
    from playwright.sync_api import sync_playwright

    url = f"{SEARCH_URL}?{urlencode({'s': query})}"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        try:
            page = browser.new_page(user_agent=DEFAULT_HEADERS["User-Agent"], locale="vi-VN")
            page.goto(url, wait_until="domcontentloaded", timeout=30000)
            page.wait_for_timeout(1500)
            html = page.content()
            try:
                return extract_next_data_products(html)
            except BlockedError:
                cards = page.evaluate(
                    """() => {
                        const out = [];
                        for (const img of document.querySelectorAll('img[src*="cdn.nhathuoclongchau.com.vn"]')) {
                            const card = img.closest('a, article, div');
                            const title = img.getAttribute('alt') || card?.innerText?.split('\\n')[0] || '';
                            out.push({ name: title.trim(), webName: title.trim(), image: img.getAttribute('src') });
                        }
                        return out;
                    }"""
                )
                return cards
        finally:
            browser.close()


def search_products(
    session: requests.Session, query: str, prefer_playwright: bool = False
) -> tuple[list[dict[str, Any]], str]:
    """Search Long Chau using requests first and Playwright headless if blocked."""
    if not prefer_playwright:
        try:
            return search_via_requests(session, query), "requests"
        except (BlockedError, requests.RequestException) as exc:
            print(f"    [fallback->playwright] requests failed: {exc}")
    return search_via_playwright(query), "playwright"


def strip_cdn_resize(image_url: str) -> str:
    """Remove Imgproxy/CDN resize segments and query parameters to fetch original image."""
    url = (image_url or "").strip()
    if not url:
        return ""

    # Handle wrapped CDN URLs such as:
    # https://cdn.nhathuoclongchau.com.vn/unsafe/375x0/filters:quality(90)/https://...
    wrapped = re.search(r"/unsafe/(?:.+?/)?(https?://.+)$", url)
    if wrapped:
        url = wrapped.group(1)
    else:
        # Handle path-based resize such as:
        # https://cdn.nhathuoclongchau.com.vn/unsafe/fit-in/600x600/filters:.../v1/static/...
        url = re.sub(
            r"(https?://[^/]+/)unsafe/(?:fit-in/)?(?:\d+x\d+/)?(?:filters:[^/]+/)*",
            r"\1",
            url,
        )

    parsed = urlparse(url)
    filtered_query = [
        (k, v)
        for k, v in parse_qsl(parsed.query, keep_blank_values=True)
        if k.lower() not in {"w", "width", "h", "height", "quality", "q", "resize", "fit"}
    ]
    return urlunparse(parsed._replace(query=urlencode(filtered_query)))


def _token_present(token: str, text_norm: str, tokens_set: set[str]) -> bool:
    """Match short tokens by exact word boundary and longer tokens by substring."""
    if len(token) <= 2:
        return token in tokens_set
    return token in tokens_set or token in text_norm


def score_candidate(product: dict[str, Any], candidate: dict[str, Any], rank: int) -> float:
    """Score how closely a Long Chau candidate matches our local product."""
    image_url = (candidate.get("image") or "").strip()
    if not image_url:
        return -1.0

    cand_title = candidate.get("webName") or candidate.get("name") or ""
    cand_ing = candidate.get("ingredients") or ""
    cand_spec = candidate.get("specification") or ""
    haystack = normalize_text(f"{cand_title} {cand_ing} {cand_spec}")
    title_norm = normalize_text(cand_title)
    title_tokens = set(tokenize(cand_title))
    haystack_tokens = set(tokenize(f"{cand_title} {cand_ing} {cand_spec}"))

    query_text = clean_search_name(product["name"], max_words=8)
    query_norm = normalize_text(query_text)
    query_tokens = tokenize(query_text)
    if not query_tokens:
        return 0.0

    matched_in_title = sum(
        1 for tok in query_tokens if _token_present(tok, title_norm, title_tokens)
    )
    matched_in_any = sum(
        1 for tok in query_tokens if _token_present(tok, haystack, haystack_tokens)
    )

    if matched_in_title == 0 and matched_in_any == 0:
        return -1.0

    score = (matched_in_title / len(query_tokens)) * 60.0
    score += (matched_in_any / len(query_tokens)) * 20.0

    if query_norm and query_norm in title_norm:
        score += 35.0
    elif query_norm and query_norm in haystack:
        score += 15.0

    # Reward matching numeric/dosage tokens such as 1000mg, 500mg, 0.9, d3, 4.
    dosage_tokens = [tok for tok in query_tokens if any(ch.isdigit() for ch in tok)]
    for tok in dosage_tokens:
        if _token_present(tok, title_norm, title_tokens):
            score += 12.0

    # Gentle tie-breaker using packaging/volume from `unit` (e.g., "500ml", "60").
    unit_tokens = tokenize(product.get("unit", ""))
    unit_compact = normalize_text(product.get("unit", "")).replace(" ", "")
    haystack_compact = haystack.replace(" ", "")
    if unit_compact and unit_compact in haystack_compact:
        score += 20.0
    for tok in unit_tokens:
        if any(ch.isdigit() for ch in tok):
            if _token_present(tok, haystack, haystack_tokens) or f"{tok}ml" in haystack_compact:
                score += 14.0
        elif tok in ("chai", "tuyp", "hop", "goi", "vien") and tok in haystack_tokens:
            score += 6.0

    # Preserve Long Chau relevance order as tie-breaker.
    score -= rank * 0.5
    return score


def pick_best_candidate(
    product: dict[str, Any], candidates: list[dict[str, Any]]
) -> tuple[dict[str, Any] | None, float]:
    """Return the best matching Long Chau product and its match score."""
    best_item: dict[str, Any] | None = None
    best_score = -1.0
    for idx, candidate in enumerate(candidates):
        score = score_candidate(product, candidate, idx)
        if score > best_score:
            best_score = score
            best_item = candidate
    if best_score < 20.0:
        return None, best_score
    return best_item, best_score


def find_existing_image(output_dir: Path, product_id: int) -> Path | None:
    """Return existing image path for {id}.{ext} if already downloaded."""
    for ext in IMAGE_EXTENSIONS:
        candidate = output_dir / f"{product_id}{ext}"
        if candidate.is_file() and candidate.stat().st_size > 0:
            return candidate
    return None


def resolve_extension(url: str, content_type: str, pil_format: str | None) -> str:
    """Determine clean file extension preserving original image format."""
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in CONTENT_TYPE_TO_EXT:
        return CONTENT_TYPE_TO_EXT[ct]
    if pil_format:
        fmt = pil_format.lower()
        if fmt == "jpeg":
            return ".jpg"
        if fmt in ("webp", "png"):
            return f".{fmt}"
    path_ext = Path(urlparse(url).path).suffix.lower()
    return path_ext if path_ext in IMAGE_EXTENSIONS else ".webp"


def download_and_verify_image(
    session: requests.Session, raw_url: str, output_dir: Path, product_id: int
) -> dict[str, Any]:
    """Download original-resolution image, verify via Pillow, and save as {id}.{ext}."""
    original_url = strip_cdn_resize(raw_url)
    urls_to_try = [original_url]
    if raw_url and raw_url != original_url:
        urls_to_try.append(raw_url)

    last_error: Exception | None = None
    for candidate_url in urls_to_try:
        try:
            resp = session.get(
                candidate_url,
                headers={"User-Agent": DEFAULT_HEADERS["User-Agent"], "Accept": "image/*,*/*;q=0.8"},
                timeout=25,
            )
            resp.raise_for_status()
            data = resp.content
            with Image.open(io.BytesIO(data)) as img:
                img.verify()
            with Image.open(io.BytesIO(data)) as img:
                width, height = img.size
                pil_format = img.format

            ext = resolve_extension(
                candidate_url, resp.headers.get("Content-Type", ""), pil_format
            )
            output_dir.mkdir(parents=True, exist_ok=True)
            for old_ext in IMAGE_EXTENSIONS:
                old_file = output_dir / f"{product_id}{old_ext}"
                if old_ext != ext and old_file.exists():
                    old_file.unlink()
            dest = output_dir / f"{product_id}{ext}"
            tmp_dest = output_dir / f".{product_id}{ext}.tmp"
            tmp_dest.write_bytes(data)
            tmp_dest.replace(dest)

            return {
                "file": str(dest),
                "url": candidate_url,
                "original_stripped": candidate_url == original_url,
                "format": pil_format,
                "width": width,
                "height": height,
                "bytes": len(data),
            }
        except (requests.RequestException, UnidentifiedImageError, OSError) as exc:
            last_error = exc

    raise RuntimeError(f"Failed downloading image from {urls_to_try}: {last_error}")


def polite_delay() -> None:
    """Sleep 1.0-1.5 seconds between requests to avoid rate limits."""
    time.sleep(random.uniform(1.0, 1.5))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Fetch product images from nhathuoclongchau.com.vn."
    )
    parser.add_argument(
        "--input",
        type=Path,
        default=Path("backend/repositories/seed.js"),
        help="Path to seed.js, JSON file, or SQLite database.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("frontend/public/assets/products"),
        help="Directory where {id}.{ext} images will be saved.",
    )
    parser.add_argument(
        "--missing-log",
        type=Path,
        default=Path("scripts/missing_images.json"),
        help="Path to write products with no found image.",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Maximum number of products to process (e.g., --limit 3).",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Re-download even if {id}.{ext} already exists.",
    )
    parser.add_argument(
        "--prefer-playwright",
        action="store_true",
        help="Use Playwright headless directly instead of requests.",
    )
    args = parser.parse_args()

    products = load_products(args.input)
    if args.limit is not None:
        products = products[: args.limit]

    print(f"Loaded {len(products)} product(s) from {args.input}")
    missing: list[dict[str, Any]] = []
    session = requests.Session()
    first_network_call = True

    for product in products:
        pid = product["id"]
        name = product["name"]

        if not args.force:
            existing = find_existing_image(args.output_dir, pid)
            if existing is not None:
                with Image.open(existing) as img:
                    w, h = img.size
                    fmt = img.format
                print(f"[{pid}] SKIP (exists): {existing} ({w}x{h} {fmt}) - {name}")
                continue

        queries = build_query_candidates(name)
        best_candidate: dict[str, Any] | None = None
        best_score = -1.0
        used_query = queries[0]
        method_used = "requests"

        preset_url = (product.get("image_url") or "").strip()
        if preset_url:
            best_candidate = {"webName": name, "image": preset_url}
            best_score = 100.0
            used_query = "<preset_url>"
            method_used = "direct"
        else:
            for query in queries:
                if not first_network_call:
                    polite_delay()
                first_network_call = False

                try:
                    candidates, method_used = search_products(
                        session, query, prefer_playwright=args.prefer_playwright
                    )
                except Exception as exc:
                    print(f"[{pid}] ERROR searching `{query}`: {exc}")
                    candidates = []

                candidate, score = pick_best_candidate(product, candidates)
                if candidate is not None and score > best_score:
                    best_candidate = candidate
                    best_score = score
                    used_query = query
                    if score >= 55.0:
                        break

        if best_candidate is None:
            reason = f"No matching product found on Long Chau for queries: {queries}"
            print(f"[{pid}] MISSING: {name} -> {reason}")
            missing.append(
                {
                    "id": pid,
                    "name": name,
                    "queries": queries,
                    "reason": reason,
                    "checked_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            continue

        polite_delay()
        try:
            saved = download_and_verify_image(
                session, best_candidate["image"], args.output_dir, pid
            )
        except Exception as exc:
            print(f"[{pid}] DOWNLOAD ERROR: {name} -> {exc}")
            missing.append(
                {
                    "id": pid,
                    "name": name,
                    "queries": queries,
                    "matched_name": best_candidate.get("webName") or best_candidate.get("name"),
                    "image_url": best_candidate.get("image"),
                    "reason": str(exc),
                    "checked_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            continue

        matched_name = best_candidate.get("webName") or best_candidate.get("name")
        print(
            f"[{pid}] OK ({method_used}, score={best_score:.1f}, q={used_query!r})\n"
            f"    DB name : {name}\n"
            f"    Matched : {matched_name}\n"
            f"    Saved   : {saved['file']} ({saved['width']}x{saved['height']} {saved['format']}, {saved['bytes']:,} bytes)\n"
            f"    URL     : {saved['url']}"
        )

    args.missing_log.parent.mkdir(parents=True, exist_ok=True)
    args.missing_log.write_text(
        json.dumps(missing, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"\nMissing count: {len(missing)} -> logged to {args.missing_log}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
