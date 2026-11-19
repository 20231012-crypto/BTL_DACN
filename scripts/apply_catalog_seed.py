#!/usr/bin/env python3
"""Generate backend/repositories/catalog-extra.js and update seed.js image paths."""

from __future__ import annotations

import json
from pathlib import Path
import sys

IMAGE_EXTENSIONS = (".webp", ".jpg", ".jpeg", ".png")

EXISTING_MANUFACTURERS = [
    ("An Tâm Pharma", "Việt Nam"),
    ("An Khang Healthcare", "Việt Nam"),
    ("Wellness Labs", "Đức"),
    ("Healthy Life", "Úc"),
]

BRAND_COUNTRY = {
    "Gsk": "Anh",
    "Upsa Sas": "Pháp",
    "Dhg": "Việt Nam",
    "United": "Việt Nam",
    "Mega We Care": "Thái Lan",
    "Engelhard": "Đức",
    "Ipsen": "Pháp",
    "Sanofi": "Pháp",
    "Pharimexco": "Việt Nam",
    "Reckitt Benckiser": "Anh",
    "Traphaco": "Việt Nam",
    "Hisamitsu": "Nhật Bản",
    "Vidipha": "Việt Nam",
    "Dhc": "Nhật Bản",
    "Bayer": "Đức",
    "Np Pharma": "Ba Lan",
    "Ostelin": "Úc",
    "Mediplantex": "Việt Nam",
    "Blackmores": "Úc",
    "Listerine": "Thái Lan",
    "Xisat": "Việt Nam",
    "Lactacyd": "Việt Nam",
    "Hoa Linh": "Việt Nam",
    "Sensodyne": "Anh",
    "La Beauty": "Việt Nam",
    "Silcot": "Nhật Bản",
    "Vaseline": "Mỹ",
    "Trường Sơn": "Việt Nam",
    "V.Rohto": "Nhật Bản",
    "Omron": "Nhật Bản",
    "Accu-Chek": "Đức",
    "Microlife": "Thụy Sĩ",
    "Urgo": "Pháp",
    "Opv": "Việt Nam",
    "B.Braun": "Đức",
    "3m": "Mỹ",
    "Imexpharm": "Việt Nam",
    "Trường Thọ Pharma": "Việt Nam",
    "Tipharco": "Việt Nam",
    "Tv.Pharm": "Việt Nam",
    "Organon": "Hà Lan",
    "Nam Dược": "Việt Nam",
    "Biogaia": "Thụy Điển",
    "Ergopharma": "Slovenia",
    "Fysoline": "Pháp",
    "Densmore": "Pháp",
    "Promum": "Ba Lan",
    "Laroche Posay": "Pháp",
    "Bioderma": "Pháp",
    "Anessa": "Nhật Bản",
    "Cerave": "Pháp",
    "Glenmark": "Ấn Độ",
    "Cetaphil": "Canada",
    "Eucerin": "Đức",
    "Garnier": "Pháp",
    "Vitatree": "Úc",
    "Ecogreen": "Mỹ",
    "Thái Minh": "Việt Nam",
    "Tâm Bình": "Việt Nam",
    "Hongjitang": "Trung Quốc",
    "Opc": "Việt Nam",
    "Jpanwell": "Nhật Bản",
}


def find_image_url(assets_dir: Path, product_id: int) -> str | None:
    """Return /assets/products/{id}.{ext} if downloaded image exists."""
    for ext in IMAGE_EXTENSIONS:
        if (assets_dir / f"{product_id}{ext}").is_file():
            return f"/assets/products/{product_id}{ext}"
    return None


def main() -> int:
    catalog = json.loads(Path("scripts/catalog_100.json").read_text(encoding="utf-8"))
    assets_dir = Path("frontend/public/assets/products")

    seed_images: dict[int, str] = {}
    missing_ids: list[int] = []

    manufacturers = list(EXISTING_MANUFACTURERS)
    mfr_index = {name.lower(): idx for idx, (name, _) in enumerate(manufacturers, start=1)}

    extra_products = []
    for p in catalog["products"]:
        pid = int(p["id"])
        img_url = find_image_url(assets_dir, pid)
        if not img_url:
            missing_ids.append(pid)
            img_url = "/assets/products/vitamin-c.svg"

        if p.get("existing_seed"):
            seed_images[pid] = img_url
            continue

        brand = (p.get("brand") or "An Tâm Pharma").strip()
        key = brand.lower()
        if key not in mfr_index:
            country = BRAND_COUNTRY.get(brand, "Quốc tế")
            manufacturers.append((brand, country))
            mfr_index[key] = len(manufacturers)

        extra_products.append([
            p["name"],
            int(p["category_id"]),
            mfr_index[key],
            p["ingredient"],
            p["description"],
            p["unit"],
            int(p["price"]),
            int(p["old_price"]) if p.get("old_price") else None,
            img_url,
            bool(p["rx"]),
            bool(p["featured"]),
            int(p["stock"]),
        ])

    extra_categories = [
        [c["name"], c["slug"], c["description"]]
        for c in catalog["categories"][6:]
    ]
    extra_manufacturers = [list(m) for m in manufacturers[len(EXISTING_MANUFACTURERS) :]]

    out = Path("backend/repositories/catalog-extra.js")
    out.write_text(
        "// Generated from scripts/catalog_100.json after verifying downloaded Long Chau images.\n"
        f"export const seedImageOverrides = {json.dumps({str(k): v for k, v in sorted(seed_images.items())}, ensure_ascii=False, indent=2)};\n\n"
        f"export const extraCategories = {json.dumps(extra_categories, ensure_ascii=False, indent=2)};\n\n"
        f"export const extraManufacturers = {json.dumps(extra_manufacturers, ensure_ascii=False, indent=2)};\n\n"
        f"export const extraProducts = {json.dumps(extra_products, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )

    print(f"Wrote {out}: {len(seed_images)} seed overrides, {len(extra_categories)} extra categories, {len(extra_manufacturers)} extra manufacturers, {len(extra_products)} extra products.")
    if missing_ids:
        print(f"WARNING missing images for IDs: {missing_ids}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
