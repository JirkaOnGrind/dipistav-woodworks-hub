#!/usr/bin/env python3
"""Render exact timber quantities 1..20 as five-wide, four-layer master artwork.

The JSON config is the configurator: changing column, rowDown, or back moves
the complete family through the shared projection instead of offsetting one
DOM clone. Counts 1 and 2 are copied from the approved v11 golden masters by
default, so those customer-approved states remain byte-for-byte unchanged.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import shutil
from dataclasses import replace
from pathlib import Path

from PIL import Image

import artwork_v11 as renderer
from artwork_v11 import Layout, Unit, alpha_metadata, apply_mixed_widths, render_stack, write_json


REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONFIG = Path(__file__).with_name("timber_dynamic_config_v35.json")
DEFAULT_OUTPUT = REPOSITORY_ROOT / "public/images/illustrations/timber-dynamic-v35"
GOLDEN_ROOT = REPOSITORY_ROOT / "public/images/illustrations/configurator-v11"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", type=Path, default=DEFAULT_CONFIG)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--family", choices=tuple(renderer.FAMILIES))
    parser.add_argument("--min-count", type=int, default=1)
    parser.add_argument("--max-count", type=int)
    parser.add_argument("--counts", help="Comma-separated exact counts to render")
    parser.add_argument("--skip-existing", action="store_true")
    parser.add_argument("--allow-golden-drift", action="store_true")
    return parser.parse_args()


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def exact_layout(count: int, pieces_per_layer: int, geometry: renderer.FamilyGeometry) -> Layout:
    levels = math.ceil(count / pieces_per_layer)
    remaining = count
    units: list[Unit] = []

    # Fill the bottom row first. A partial newest row is centered above it.
    for level_from_bottom in range(levels):
        row_count = min(pieces_per_layer, remaining)
        row = levels - level_from_bottom - 1
        offset = (pieces_per_layer - row_count) / 2
        units.extend(
            Unit(offset + column, row, f"r{row}c{column}")
            for column in range(row_count)
        )
        remaining -= row_count

    layout = Layout(
        count=count,
        name=f"{pieces_per_layer}-wide-exact-{count}",
        columns=pieces_per_layer,
        rows=levels,
        units=tuple(units),
        band=(count, count),
        suffix=str(count),
    )
    return apply_mixed_widths(layout, geometry) if geometry.member_widths_cm else layout


def configured_geometry(family: str, settings: dict[str, object]) -> renderer.FamilyGeometry:
    base = renderer.FAMILIES[family]
    return replace(
        base,
        column=tuple(float(value) for value in settings["column"]),
        row=tuple(float(value) for value in settings["rowDown"]),
        depth=tuple(float(value) for value in settings["back"]),
    )


def save_webp(image: Image.Image, path: Path, options: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(
        path,
        format="WEBP",
        lossless=bool(options["lossless"]),
        quality=float(options["quality"]),
        method=int(options["method"]),
        exact=True,
    )


def golden_source(settings: dict[str, object], count: int) -> Path:
    return GOLDEN_ROOT / f"{settings['goldenPrefix']}-{count}-master-v11.webp"


def main() -> None:
    args = parse_args()
    config = json.loads(args.config.read_text(encoding="utf-8"))
    pieces_per_layer = int(config["piecesPerLayer"])
    max_pieces = int(config["maxPieces"])
    preserve_counts = set(int(value) for value in config["preserveGoldenCounts"])
    if pieces_per_layer != 5 or max_pieces != 20:
        raise ValueError("The storefront contract requires exactly 5 pieces per layer and 20 maximum")

    index_entries: list[dict[str, object]] = []
    original_seam_width = renderer.SEAM_PX
    original_seam_color = renderer.SEAM

    try:
        selected_families = {
            family: settings
            for family, settings in config["families"].items()
            if args.family is None or family == args.family
        }
        for family, settings in selected_families.items():
            geometry = configured_geometry(family, settings)
            prefix = settings["assetPrefix"]
            renderer.SEAM_PX = float(settings["seamWidth"])
            renderer.SEAM = str(settings["seamColor"])

            last_count = min(max_pieces, args.max_count or max_pieces)
            counts = (
                [int(value) for value in args.counts.split(",")]
                if args.counts
                else range(max(1, args.min_count), last_count + 1)
            )
            for count in counts:
                if count < 1 or count > max_pieces:
                    raise ValueError(f"Count must be between 1 and {max_pieces}: {count}")
                layout = exact_layout(count, pieces_per_layer, geometry)
                output_path = args.output_dir / f"{prefix}-{count}-master-v35.webp"
                manifest_path = output_path.with_suffix(".manifest.json")
                output_path.parent.mkdir(parents=True, exist_ok=True)

                if args.skip_existing and output_path.exists() and manifest_path.exists():
                    index_entries.append(
                        {"image": output_path.name, **json.loads(manifest_path.read_text("utf-8"))}
                    )
                    continue

                if count in preserve_counts and not args.allow_golden_drift:
                    source_path = golden_source(settings, count)
                    if not source_path.exists():
                        raise FileNotFoundError(f"Missing approved golden master: {source_path}")
                    shutil.copyfile(source_path, output_path)
                    image = Image.open(output_path).convert("RGBA")
                    metadata = alpha_metadata(image)
                    render_origin = "approved-v11-byte-copy"
                else:
                    image, metadata = render_stack(layout, geometry)
                    save_webp(image, output_path, config["webp"])
                    render_origin = "deterministic-v11-vector-renderer"

                metadata.update(
                    {
                        "family": family,
                        "quantityBand": {"min": count, "max": count},
                        "representativeCount": count,
                        "layout": layout.name,
                        "piecesPerLayer": pieces_per_layer,
                        "levelCount": layout.rows,
                        "renderOrigin": render_origin,
                        "designVectors": {
                            "column": list(geometry.column),
                            "rowDown": list(geometry.row),
                            "back": list(geometry.depth),
                        },
                        "outputSha256": sha256(output_path),
                        "runtimePath": f"/images/illustrations/timber-dynamic-v35/{output_path.name}",
                        "styleVersion": config["version"],
                    }
                )
                write_json(manifest_path, metadata)
                index_entries.append({"image": output_path.name, **metadata})
    finally:
        renderer.SEAM_PX = original_seam_width
        renderer.SEAM = original_seam_color

    index = {
        "version": config["version"],
        "piecesPerLayer": pieces_per_layer,
        "maxPieces": max_pieces,
        "config": args.config.relative_to(REPOSITORY_ROOT).as_posix(),
        "entries": index_entries,
    }
    index_name = f"index-{args.family}.json" if args.family else "index.json"
    write_json(args.output_dir / index_name, index)
    print(json.dumps({"output": args.output_dir.as_posix(), "entries": len(index_entries)}, indent=2))


if __name__ == "__main__":
    main()
