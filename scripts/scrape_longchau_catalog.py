#!/usr/bin/env python3
"""Collect real pharmacy products from nhathuoclongchau.com.vn to reach 100 catalog items."""

from __future__ import annotations

import json
from pathlib import Path
import random
import re
import sys
import time
import unicodedata
from typing import Any

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_product_images import (  # noqa: E402
    DEFAULT_HEADERS,
    load_products,
    search_products,
)

CATEGORIES = [
    (1, "Thuốc không kê đơn", "thuoc-khong-ke-don", "Thuốc cần được sử dụng đúng hướng dẫn"),
    (2, "Vitamin & khoáng chất", "vitamin-khoang-chat", "Sản phẩm bổ sung dưỡng chất"),
    (3, "Chăm sóc cá nhân", "cham-soc-ca-nhan", "Chăm sóc sức khỏe hằng ngày"),
    (4, "Thiết bị y tế", "thiet-bi-y-te", "Dụng cụ và vật tư y tế"),
    (5, "Thuốc kê đơn", "thuoc-ke-don", "Cần đơn thuốc và dược sĩ kiểm duyệt"),
    (6, "Mẹ & bé", "me-va-be", "Chăm sóc mẹ và bé"),
    (7, "Dược mỹ phẩm", "duoc-my-pham", "Chăm sóc da và làm đẹp chuẩn nhà thuốc"),
    (8, "Thực phẩm chức năng", "thuc-pham-chuc-nang", "Hỗ trợ tăng cường và bảo vệ sức khỏe"),
]

# Category targets -> existing + added = 100 total (90 OTC + 10 Rx).
CATEGORY_TARGETS: dict[int, dict[str, Any]] = {
    1: {
        "target_add": 13,
        "rx": False,
        "queries": [
            "Panadol Extra",
            "Efferalgan 500mg",
            "Hapacol 650",
            "Decolgen Forte",
            "Eugica",
            "Prospan siro ho",
            "Smecta",
            "Phosphalugel",
            "Berberin",
            "Gaviscon",
            "Loratadin 10mg",
            "Oresol",
            "Salonpas",
            "Tiffy Dey",
            "Bổ phế Nam Hà",
            "Strepsils",
            "Enterogermina",
            "Coldacmin",
        ],
    },
    2: {
        "target_add": 11,
        "rx": False,
        "queries": [
            "Vitamin E 400",
            "Vitamin B Complex",
            "Sắt Ferrovit",
            "Magie B6",
            "DHC Vitamin C",
            "Berocca",
            "Plusssz",
            "Ostelin Calcium",
            "Biotin",
            "DHC Kẽm",
            "Blackmores Multivitamin",
            "Vitamin A D",
            "Doppelherz Vitamin",
            "Nature Made Fish Oil",
            "Canxi Nano",
        ],
    },
    3: {
        "target_add": 11,
        "rx": False,
        "queries": [
            "Nước súc miệng Listerine",
            "Xịt mũi Xisat",
            "Dung dịch vệ sinh Lactacyd",
            "Dung dịch vệ sinh Dạ Hương",
            "Kem đánh răng Sensodyne",
            "Xịt họng keo ong",
            "Nước rửa tay Lifebuoy",
            "Bông tẩy trang Silcot",
            "Sáp dưỡng môi Vaseline",
            "Dầu gió Trường Sơn",
            "Nước nhỏ mắt V.Rohto",
            "Nước nhỏ mắt Eyemiru",
            "Lăn khử mùi Etiaxil",
            "Sữa tắm Lifebuoy",
        ],
    },
    4: {
        "target_add": 10,
        "rx": False,
        "queries": [
            "Máy đo huyết áp Omron",
            "Máy đo đường huyết",
            "Nhiệt kế hồng ngoại",
            "Băng keo cá nhân Urgo",
            "Cồn 70 độ",
            "Oxy già",
            "Povidon iod",
            "Máy xông khí dung",
            "Túi chườm nóng lạnh",
            "Que thử thai",
            "Băng thun y tế",
            "Khẩu trang 3M",
            "Máy đo SpO2",
        ],
    },
    5: {
        "target_add": 8,
        "rx": True,
        "queries": [
            "Augmentin 1g",
            "Cefuroxim 500mg",
            "Amlodipin 5mg",
            "Metformin 500mg",
            "Omeprazol 20mg",
            "Atorvastatin 10mg",
            "Losartan 50mg",
            "Ciprofloxacin 500mg",
            "Clarithromycin 500mg",
            "Medrol 16mg",
            "Glimepirid 2mg",
        ],
    },
    6: {
        "target_add": 11,
        "rx": False,
        "queries": [
            "Dầu tràm Cung Đình",
            "Kem chống hăm Bepanthen",
            "Miếng dán hạ sốt Koolfever",
            "Men vi sinh BioGaia",
            "Sữa tắm gội Lactacyd Baby",
            "Vitamin D3K2 Lineabon",
            "Elevit cho bà bầu",
            "Nước muối nhỏ mũi Fysoline",
            "Kem dưỡng ẩm Chicco",
            "Sắt Chela Ferr Forte",
            "Bio Island DHA cho bé",
            "Siro ăn ngon Pediakid",
            "Canxi Osteocare",
        ],
    },
    7: {
        "target_add": 10,
        "rx": False,
        "queries": [
            "Sữa rửa mặt La Roche-Posay",
            "Nước tẩy trang Bioderma",
            "Kem chống nắng Anessa",
            "Kem dưỡng ẩm CeraVe",
            "Gel trị mụn Klenzit",
            "Sữa rửa mặt Cetaphil",
            "Kem chống nắng La Roche-Posay",
            "Kem dưỡng ẩm Bioderma",
            "Kem dưỡng ẩm Eucerin",
            "Serum Garnier",
            "Nước tẩy trang Garnier",
            "Sữa rửa mặt Simple",
        ],
    },
    8: {
        "target_add": 10,
        "rx": False,
        "queries": [
            "Hoạt huyết dưỡng não",
            "Bổ gan Boganic",
            "Glucosamine",
            "Viên uống sáng mắt Wit",
            "Tràng Phục Linh",
            "Đại tràng Tâm Bình",
            "Sâm Alipas",
            "An cung ngưu hoàng",
            "Cao ích mẫu",
            "Viên uống bổ phổi",
            "Bảo Xuân",
            "Dầu gấc Vinaga",
        ],
    },
}


def slugify_js(text: str) -> str:
    """Replicate JS slugify() from backend/repositories/database.js."""
    s = (text or "").replace("đ", "d").replace("Đ", "D")
    s = unicodedata.normalize("NFD", s)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn").lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def clean_product_title(raw_name: str, fallback: str) -> str:
    """Shorten overly long SEO descriptions cleanly while keeping product identity."""
    title = re.sub(r"\s+", " ", (raw_name or fallback or "")).strip()
    if len(title) <= 105:
        return title
    # Keep packaging info in parentheses at end if present, trim middle filler clauses.
    short = re.split(r"\s+(?:giúp|hỗ trợ|điều trị|làm giảm|dùng cho|bổ sung)\s+", title, maxsplit=1, flags=re.I)[0].strip()
    if 15 <= len(short) <= 105:
        return short.rstrip(",;:- ")
    return title[:102].rstrip() + "..."


def extract_price(item: dict[str, Any], rx: bool, seed_idx: int) -> tuple[int, int | None]:
    """Extract VND selling price and optional original price."""
    price_obj = item.get("price") or {}
    candidates: list[tuple[int, int | None]] = []

    for entry in [price_obj, *(item.get("prices") or [])]:
        if not isinstance(entry, dict):
            continue
        raw_price = entry.get("price")
        if isinstance(raw_price, (int, float)) and raw_price >= 1000:
            discount = entry.get("discount") or {}
            final_price = discount.get("finalPrice")
            if isinstance(final_price, (int, float)) and 1000 <= final_price < raw_price:
                candidates.append((int(final_price), int(raw_price)))
            else:
                candidates.append((int(raw_price), None))

    if candidates:
        # Prefer box/package price (highest sensible price if multiple units like viên/vỉ/hộp)
        candidates.sort(key=lambda pair: pair[0], reverse=True)
        p, old_p = candidates[0]
        if old_p is None and not rx and seed_idx % 4 == 0:
            old_p = int(round(p * 1.15 / 1000) * 1000)
            if old_p <= p:
                old_p = None
        return p, old_p

    # Prescription drugs on Long Chau hide online price; assign realistic pharmacy price.
    fallback_prices = [68000, 85000, 95000, 115000, 135000, 155000, 78000, 125000]
    return fallback_prices[seed_idx % len(fallback_prices)], None


def extract_unit(item: dict[str, Any]) -> str:
    """Extract clean unit string within 50 chars."""
    spec = (item.get("specification") or "").strip()
    if spec and len(spec) <= 50:
        return spec
    unit_name = ((item.get("price") or {}).get("measureUnitName") or "").strip()
    if unit_name:
        return unit_name[:50]
    return "Hộp"


def main() -> int:
    seed_path = Path("backend/repositories/seed.js")
    existing = load_products(seed_path)
    seen_slugs = {slugify_js(p["name"]) for p in existing}
    seen_skus: set[str] = set()

    collected: list[dict[str, Any]] = []
    next_id = len(existing) + 1
    session = requests.Session()
    session.headers.update(DEFAULT_HEADERS)

    for cat_id, cfg in CATEGORY_TARGETS.items():
        cat_name = next(c[1] for c in CATEGORIES if c[0] == cat_id)
        target = cfg["target_add"]
        rx = cfg["rx"]
        added_here = 0
        print(f"\n=== Category {cat_id}: {cat_name} (target +{target}) ===")

        for query in cfg["queries"]:
            if added_here >= target:
                break
            time.sleep(random.uniform(1.0, 1.4))
            try:
                results, method = search_products(session, query)
            except Exception as exc:
                print(f"  [WARN] Search failed for `{query}`: {exc}")
                continue

            picked = None
            for cand in results:
                sku = str(cand.get("sku") or "")
                img = (cand.get("image") or "").strip()
                if not img or (sku and sku in seen_skus):
                    continue
                name = clean_product_title(cand.get("webName") or "", cand.get("name") or query)
                slug = slugify_js(name)
                if not slug or slug in seen_slugs:
                    continue
                # For prescription category, prefer items without public price or matching query tightly.
                picked = (cand, name, slug, sku, img)
                break

            if not picked:
                print(f"  [SKIP] No unique result for `{query}`")
                continue

            cand, name, slug, sku, img = picked
            seen_slugs.add(slug)
            if sku:
                seen_skus.add(sku)

            price, old_price = extract_price(cand, rx=rx, seed_idx=next_id)
            unit = extract_unit(cand)
            ingredient = (cand.get("ingredients") or "").strip()[:240] or name
            brand = (cand.get("brand") or "").strip().title() or "An Tâm Pharma"
            dosage = (cand.get("dosageForm") or "").strip()
            raw_desc = (cand.get("webName") or name).strip()
            desc = f"{raw_desc}. Dạng bào chế: {dosage}." if dosage and dosage.lower() not in raw_desc.lower() else f"{raw_desc}."
            stock = 35 + ((next_id * 17) % 140)

            record = {
                "id": next_id,
                "name": name,
                "slug": slug,
                "category_id": cat_id,
                "brand": brand,
                "ingredient": ingredient,
                "description": desc[:500],
                "unit": unit,
                "price": price,
                "old_price": old_price,
                "rx": rx,
                "featured": False,
                "stock": stock,
                "image_url": img,
                "source_sku": sku,
                "source_query": query,
            }
            collected.append(record)
            added_here += 1
            next_id += 1
            print(f"  [{record['id']}] ({method}) {name} | {unit} | {price:,}d | {brand}")

        if added_here < target:
            print(f"  [WARN] Category {cat_id} only added {added_here}/{target}")

    all_products = [
        {
            "id": p["id"],
            "name": p["name"],
            "ingredient": p["ingredient"],
            "unit": p["unit"],
            "existing_seed": True,
        }
        for p in existing
    ] + collected

    out_path = Path("scripts/catalog_100.json")
    out_path.write_text(
        json.dumps(
            {
                "categories": [
                    {"id": cid, "name": cname, "slug": cslug, "description": cdesc}
                    for cid, cname, cslug, cdesc in CATEGORIES
                ],
                "total": len(all_products),
                "products": all_products,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"\nSaved {len(all_products)} products to {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
