#!/usr/bin/env python3
"""Fail when the exposed top shoulders of a new timber layer are transparent."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw

from artwork_v11 import auto_fit_transform, face_polygons, unit_anchor, unit_geometry
from compose_timber_dynamic_v35 import DEFAULT_CONFIG, DEFAULT_OUTPUT, configured_geometry, exact_layout


def polygon_on_canvas(points: list[tuple[float, float]], transform: tuple[float, float, float]):
    scale, tx, ty = transform
    return [(x * scale + tx, y * scale + ty) for x, y in points]


def masked_alpha_coverage(image: Image.Image, polygon: list[tuple[float, float]]) -> float:
    mask = Image.new("L", image.size, 0)
    ImageDraw.Draw(mask).polygon(polygon, fill=255)
    alpha = image.getchannel("A")
    mask_values = list(mask.get_flattened_data())
    alpha_values = list(alpha.get_flattened_data())
    selected = [alpha_value for alpha_value, mask_value in zip(alpha_values, mask_values) if mask_value]
    return sum(value > 0 for value in selected) / len(selected)


def main() -> None:
    config = json.loads(DEFAULT_CONFIG.read_text(encoding="utf-8"))
    minimum_coverage = 0.98
    failures: list[str] = []

    for family, settings in config["families"].items():
        geometry = configured_geometry(family, settings)
        layout = exact_layout(6, config["piecesPerLayer"], geometry)
        bottom_row = max(unit.row for unit in layout.units)
        bottom_units = sorted(
            (unit for unit in layout.units if unit.row == bottom_row),
            key=lambda unit: unit.column,
        )
        image_path = DEFAULT_OUTPUT / f"{settings['assetPrefix']}-6-master-v35.webp"
        image = Image.open(image_path).convert("RGBA")
        transform = auto_fit_transform(layout, geometry)

        for side, unit in (("left", bottom_units[0]), ("right", bottom_units[-1])):
            top = face_polygons(unit_anchor(unit, geometry), unit_geometry(unit, geometry))["top"]
            coverage = masked_alpha_coverage(image, polygon_on_canvas(top, transform))
            if coverage < minimum_coverage:
                failures.append(f"{family} {side}: {coverage:.4f}")

    if failures:
        raise AssertionError("Transparent lower top faces: " + ", ".join(failures))
    print("Top-face QA passed for all six timber families at the first layer transition")


if __name__ == "__main__":
    main()
