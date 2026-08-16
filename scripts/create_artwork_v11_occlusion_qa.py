#!/usr/bin/env python3
"""Create Current vs New QA boards for the v11 occlusion revision."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
CURRENT = ROOT / "public/images/illustrations/configurator-v11"
NEW = ROOT / "tmp/artwork-v11-occlusion-v3"

ROWS = (
    (
        "TRAMY - CURRENT",
        CURRENT / "beam-seams-v2-3-4-master-v11.webp",
        "TRAMY - NEW OPAQUE LAYERS",
        NEW / "beam-occlusion-v3/beam-occlusion-v3-3-4-master-v11.webp",
    ),
    (
        "FOSNY - CURRENT",
        CURRENT / "plank-production-v3-3-4-master-v11.webp",
        "FOSNY - NEW CLEAN TOP + OCCLUSION",
        NEW / "plank-occlusion-clean-v4/plank-occlusion-clean-v4-3-4-master-v11.webp",
    ),
    (
        "FOSNY 6 KS - CURRENT",
        CURRENT / "plank-production-v3-5-8-master-v11.webp",
        "FOSNY 6 KS - NEW",
        NEW / "plank-occlusion-clean-v4/plank-occlusion-clean-v4-5-8-master-v11.webp",
    ),
    (
        "PRKNA - CURRENT",
        CURRENT / "board-texture-v2-3-4-master-v11.webp",
        "PRKNA - NEW OPAQUE LAYERS",
        NEW / "board-occlusion-v3/board-occlusion-v3-3-4-master-v11.webp",
    ),
    (
        "NETRIDENA SIROKA - CURRENT",
        CURRENT / "board-unsorted-wide-v2-5-8-master-v11.webp",
        "NETRIDENA SIROKA - NEW",
        NEW / "board-unsorted-wide-occlusion-v3/board-unsorted-wide-occlusion-v3-5-8-master-v11.webp",
    ),
)

HOMEPAGE_ROWS = (
    (
        "TRAMY IKONA - CURRENT",
        ROOT / "public/images/illustrations/homepage-v11/tramy-icon-production-v2-master-v11.webp",
        "TRAMY IKONA - NEW",
        NEW / "homepage-candidates/tramy-icon-occlusion-v3-master-v11.webp",
    ),
    (
        "FOSNY IKONA - CURRENT",
        ROOT / "public/images/illustrations/homepage-v11/fosny-icon-production-v3-master-v11.webp",
        "FOSNY IKONA - NEW",
        NEW / "homepage-candidates/fosny-icon-occlusion-clean-v4-master-v11.webp",
    ),
    (
        "PRKNA IKONA - CURRENT",
        ROOT / "public/images/illustrations/homepage-v11/prkna-icon-production-v2-master-v11.webp",
        "PRKNA IKONA - NEW",
        NEW / "homepage-candidates/prkna-icon-occlusion-v3-master-v11.webp",
    ),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=NEW / "qa",
    )
    return parser.parse_args()


def paste_artwork(canvas: Image.Image, image: Image.Image, box: tuple[int, int, int, int]) -> None:
    left, top, right, bottom = box
    image.thumbnail((right - left, bottom - top), Image.Resampling.LANCZOS)
    x = left + (right - left - image.width) // 2
    y = top + (bottom - top - image.height) // 2
    canvas.paste(image, (x, y), image)


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)

    cell_width, cell_height, label_height = 820, 540, 42
    overview = Image.new("RGB", (cell_width * 2, cell_height * len(ROWS)), "#F4EFE5")
    overview_draw = ImageDraw.Draw(overview)

    detail_width, detail_height = 720, 420
    detail = Image.new(
        "RGB",
        (detail_width * 2, (detail_height + label_height) * len(ROWS)),
        "#F4EFE5",
    )
    detail_draw = ImageDraw.Draw(detail)

    for row_index, row in enumerate(ROWS):
        pairs = ((row[0], row[1]), (row[2], row[3]))
        for column_index, (label, path) in enumerate(pairs):
            image = Image.open(path).convert("RGBA")
            x0 = column_index * cell_width
            y0 = row_index * cell_height
            paste_artwork(
                overview,
                image.copy(),
                (x0 + 24, y0 + label_height + 16, x0 + cell_width - 24, y0 + cell_height - 16),
            )
            overview_draw.text((x0 + 20, y0 + 14), label, fill="#2B160A")
            overview_draw.rectangle(
                (x0, y0, x0 + cell_width - 1, y0 + cell_height - 1),
                outline="#D8C6AE",
            )

            bounds = image.getchannel("A").getbbox()
            if bounds is None:
                raise ValueError(f"Empty artwork: {path}")
            left, top, right, bottom = bounds
            center_x = left + (right - left) * 0.58
            center_y = top + (bottom - top) * 0.50
            crop = image.crop(
                (
                    round(center_x - detail_width / 2),
                    round(center_y - detail_height / 2),
                    round(center_x + detail_width / 2),
                    round(center_y + detail_height / 2),
                )
            )
            detail_x = column_index * detail_width
            detail_y = row_index * (detail_height + label_height)
            detail.paste(crop, (detail_x, detail_y + label_height), crop)
            detail_draw.text((detail_x + 18, detail_y + 14), f"{label} - 100%", fill="#2B160A")
            detail_draw.rectangle(
                (detail_x, detail_y, detail_x + detail_width - 1, detail_y + detail_height + label_height - 1),
                outline="#D8C6AE",
            )

    overview_path = args.output_dir / "current-vs-occlusion-v3.png"
    detail_path = args.output_dir / "current-vs-occlusion-v3-detail-100pct.png"
    overview.save(overview_path)
    detail.save(detail_path)
    print(overview_path.resolve())
    print(detail_path.resolve())

    icon_cell_width, icon_cell_height = 620, 390
    icons = Image.new(
        "RGB",
        (icon_cell_width * 2, icon_cell_height * len(HOMEPAGE_ROWS)),
        "#F4EFE5",
    )
    icons_draw = ImageDraw.Draw(icons)
    for row_index, row in enumerate(HOMEPAGE_ROWS):
        for column_index, (label, path) in enumerate(((row[0], row[1]), (row[2], row[3]))):
            image = Image.open(path).convert("RGBA")
            x0 = column_index * icon_cell_width
            y0 = row_index * icon_cell_height
            paste_artwork(
                icons,
                image,
                (x0 + 24, y0 + label_height + 14, x0 + icon_cell_width - 24, y0 + icon_cell_height - 14),
            )
            icons_draw.text((x0 + 18, y0 + 14), label, fill="#2B160A")
            icons_draw.rectangle(
                (x0, y0, x0 + icon_cell_width - 1, y0 + icon_cell_height - 1),
                outline="#D8C6AE",
            )
    icons_path = args.output_dir / "homepage-current-vs-occlusion-v3.png"
    icons.save(icons_path)
    print(icons_path.resolve())


if __name__ == "__main__":
    main()
