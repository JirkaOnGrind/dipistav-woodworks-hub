#!/usr/bin/env python3
"""Create a Current vs New QA board for the v11 structural-seam iteration."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CURRENT = ROOT / "tmp/artwork-v11-refined"
NEW = ROOT / "tmp/artwork-v11-seams-v2"
PRODUCTION = ROOT / "tmp/artwork-v11-production"

ROWS = (
    (
        "BEAMS - CURRENT",
        CURRENT / "beam-refined/beam-refined-2-master-v11.webp",
        "BEAMS - NEW 4 PX STRUCTURAL SEAMS",
        NEW / "beam-seams-v2/beam-seams-v2-2-master-v11.webp",
    ),
    (
        "PLANKS - GHOST TOP SEAM",
        NEW / "plank-texture-v2/plank-texture-v2-2-master-v11.webp",
        "PLANKS - PRODUCTION V3 / ONE TRUE SEAM",
        PRODUCTION / "plank-production-v3/plank-production-v3-2-master-v11.webp",
    ),
    (
        "BOARDS - CURRENT PROCEDURAL TOP",
        CURRENT / "board-refined/board-refined-2-master-v11.webp",
        "BOARDS - NEW TEXTURE + 4 PX SEAMS",
        NEW / "board-texture-v2/board-texture-v2-2-master-v11.webp",
    ),
    (
        "UNSORTED NARROW - CURRENT",
        CURRENT / "board-unsorted-narrow/board-unsorted-narrow-5-8-master-v11.webp",
        "UNSORTED NARROW - NEW",
        NEW / "board-unsorted-narrow-v2/board-unsorted-narrow-v2-5-8-master-v11.webp",
    ),
    (
        "UNSORTED WIDE - CURRENT",
        CURRENT / "board-unsorted-wide/board-unsorted-wide-5-8-master-v11.webp",
        "UNSORTED WIDE - NEW",
        NEW / "board-unsorted-wide-v2/board-unsorted-wide-v2-5-8-master-v11.webp",
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=PRODUCTION / "qa/full-v11-promotion-current-vs-production.png",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cell_width, cell_height, label_height = 860, 560, 44
    canvas = Image.new("RGB", (cell_width * 2, len(ROWS) * cell_height), "#F4EFE5")
    draw = ImageDraw.Draw(canvas)
    for row_index, row in enumerate(ROWS):
        for column_index, (label, path) in enumerate(((row[0], row[1]), (row[2], row[3]))):
            image = Image.open(path).convert("RGBA")
            max_size = (cell_width - 40, cell_height - label_height - 30)
            image.thumbnail(max_size, Image.Resampling.LANCZOS)
            x = column_index * cell_width + (cell_width - image.width) // 2
            y = row_index * cell_height + label_height + (cell_height - label_height - image.height) // 2
            canvas.paste(image, (x, y), image)
            draw.text((column_index * cell_width + 24, row_index * cell_height + 16), label, fill="#2B160A")
            draw.rectangle(
                (
                    column_index * cell_width,
                    row_index * cell_height,
                    (column_index + 1) * cell_width - 1,
                    (row_index + 1) * cell_height - 1,
                ),
                outline="#D8C6AE",
                width=1,
            )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(args.output)
    print(args.output)

    detail_width, detail_height = 760, 450
    detail = Image.new(
        "RGB",
        (detail_width * 2, len(ROWS) * (detail_height + label_height)),
        "#F4EFE5",
    )
    detail_draw = ImageDraw.Draw(detail)
    for row_index, row in enumerate(ROWS):
        row_top = row_index * (detail_height + label_height)
        for column_index, (label, path) in enumerate(((row[0], row[1]), (row[2], row[3]))):
            image = Image.open(path).convert("RGBA")
            bounds = image.getchannel("A").getbbox()
            if bounds is None:
                raise ValueError(f"Empty artwork: {path}")
            left, top, right, bottom = bounds
            center_x = left + (right - left) * 0.68
            center_y = top + (bottom - top) * 0.56
            crop_box = (
                round(center_x - detail_width / 2),
                round(center_y - detail_height / 2),
                round(center_x + detail_width / 2),
                round(center_y + detail_height / 2),
            )
            crop = image.crop(crop_box)
            x = column_index * detail_width
            detail.paste(crop, (x, row_top + label_height), crop)
            detail_draw.text((x + 18, row_top + 16), f"{label} - 100%", fill="#2B160A")
            detail_draw.rectangle(
                (x, row_top, x + detail_width - 1, row_top + detail_height + label_height - 1),
                outline="#D8C6AE",
                width=1,
            )
    detail_path = args.output.with_name("current-vs-new-detail-100pct.png")
    detail.save(detail_path)
    print(detail_path)


if __name__ == "__main__":
    main()
