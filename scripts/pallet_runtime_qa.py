#!/usr/bin/env python3
"""Build a review sheet from browser-captured modular-pallet runtime scenes."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw


QUANTITIES = (1, 2, 3, 5, 9, 12, 16)


def build_sheet(source_dir: Path, output: Path, crop: tuple[int, int, int, int]) -> None:
    cell = (560, 520)
    columns = 4
    rows = math.ceil(len(QUANTITIES) / columns)
    sheet = Image.new("RGB", (cell[0] * columns, cell[1] * rows + 64), "#F8F1E5")
    draw = ImageDraw.Draw(sheet)
    draw.text((20, 22), "Modular pallet - runtime QA", fill="#2B2118")
    left, top, width, height = crop

    for index, quantity in enumerate(QUANTITIES):
        page = Image.open(source_dir / f"page-{quantity}.png").convert("RGB")
        preview = page.crop((left, top, left + width, top + height))
        x = index % columns * cell[0] + (cell[0] - preview.width) // 2
        y = 64 + index // columns * cell[1] + 10
        sheet.paste(preview, (x, y))
        label = (
            f"{quantity} baleni"
            + (" -> 6 pallets (4 ground + 2 directly supported)" if quantity == 5 else "")
        )
        draw.text((index % columns * cell[0] + 18, y + preview.height + 10), label, fill="#2B2118")

    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--crop", default="83,461,517,392")
    arguments = parser.parse_args()
    crop_values = tuple(int(value) for value in arguments.crop.split(","))
    if len(crop_values) != 4:
        parser.error("--crop must be left,top,width,height")
    build_sheet(arguments.source_dir, arguments.output, crop_values)
