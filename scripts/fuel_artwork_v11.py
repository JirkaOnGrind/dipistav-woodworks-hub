#!/usr/bin/env python3
"""Inactive deterministic scene contract for DIPISTAV fuel artwork v11.

This module defines quantity truth and reusable modules only. It intentionally
does not render or promote fuel artwork before Unit Tile approval.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal, Mapping, Sequence

from PIL import Image, ImageOps

from artwork_v11 import (
    CANVAS,
    CONTOUR_RESERVE,
    SAFE_INSET,
    SEED,
    SUPER_SAMPLE,
    add_outer_contour,
    alpha_metadata,
    contact_sheet,
    sanitize_antialias_alpha,
    save_webp,
    sha256,
    write_json,
)


CompositionBasis = Literal["exact", "aggregate-volume", "optical-density"]


@dataclass(frozen=True)
class ContainedEquivalent:
    count: int
    unit: str
    mass_kg: int | None = None


@dataclass(frozen=True)
class FuelBand:
    suffix: str
    minimum: int
    maximum: int | None
    representative_selling_units: int
    rendered_module_counts: Mapping[str, int]
    composition_basis: CompositionBasis
    contained_unit_equivalent: ContainedEquivalent | None = None


@dataclass(frozen=True)
class FuelFamily:
    id: str
    category_id: str
    illustration_variants: Sequence[str]
    unit_tiles: Sequence[str]
    bands: Sequence[FuelBand]
    notes: Sequence[str]


def band(
    suffix: str,
    minimum: int,
    maximum: int | None,
    selling_units: int,
    modules: Mapping[str, int],
    basis: CompositionBasis = "exact",
    equivalent: ContainedEquivalent | None = None,
) -> FuelBand:
    return FuelBand(suffix, minimum, maximum, selling_units, modules, basis, equivalent)


PELLET_BAG_BANDS = (
    band("1", 1, 1, 1, {"pellet-bag-15kg": 1}),
    band("2", 2, 2, 2, {"pellet-bag-15kg": 2}),
    band("3-4", 3, 4, 4, {"pellet-bag-15kg": 4}),
    band("5-9", 5, 9, 7, {"pellet-bag-15kg": 7}),
    band("10-19", 10, 19, 15, {"pellet-bag-15kg": 15}),
    band("20plus", 20, None, 20, {"pellet-bag-15kg": 20}),
)

PELLET_SET_BANDS = tuple(
    band(suffix, minimum, maximum, sets, {"pellet-bag-15kg": bags})
    for suffix, minimum, maximum, sets, bags in (
        ("1", 1, 1, 1, 10),
        ("2", 2, 2, 2, 20),
        ("3-4", 3, 4, 3, 30),
        ("5plus", 5, None, 5, 50),
    )
)

PELLET_PALLET_BANDS = tuple(
    band(
        suffix,
        minimum,
        maximum,
        pallets,
        {"pellet-pallet": pallets, "pellet-bag-15kg": pallets * 40, "pallet": pallets, "wrap": pallets},
        "optical-density",
        ContainedEquivalent(65 * pallets, "pellet-bag-15kg", 975 * pallets),
    )
    for suffix, minimum, maximum, pallets in (
        ("1", 1, 1, 1),
        ("2", 2, 2, 2),
        ("3", 3, 3, 3),
        ("4-5", 4, 5, 4),
        ("6plus", 6, None, 6),
    )
)

LOOSE_LOG_COUNTS = (12, 18, 24, 36, 48, 60, 72)
FIREWOOD_BANDS = tuple(
    band(suffix, minimum, maximum, selling_units, {"split-log": logs}, "aggregate-volume")
    for (suffix, minimum, maximum, selling_units), logs in zip(
        (
            ("1", 1, 1, 1),
            ("2", 2, 2, 2),
            ("3-4", 3, 4, 3),
            ("5-8", 5, 8, 6),
            ("9-11", 9, 11, 9),
            ("12-15", 12, 15, 12),
            ("16plus", 16, None, 16),
        ),
        LOOSE_LOG_COUNTS,
        strict=True,
    )
)

BIG_BAG_BANDS = tuple(
    band(suffix, minimum, maximum, bags, {"big-bag": bags, "split-log": bags * 12}, "optical-density")
    for suffix, minimum, maximum, bags in (
        ("1", 1, 1, 1),
        ("2", 2, 2, 2),
        ("3-4", 3, 4, 4),
        ("5-8", 5, 8, 5),
        ("9plus", 9, None, 9),
    )
)

PALLET_BANDS = tuple(
    band(suffix, minimum, maximum, pallets, {"firewood-pallet": pallets, "pallet": pallets})
    for suffix, minimum, maximum, pallets in (
        ("1", 1, 1, 1),
        ("2", 2, 2, 2),
        ("3-4", 3, 4, 4),
        ("5-8", 5, 8, 6),
        ("9plus", 9, None, 9),
    )
)

SLAB_BANDS = tuple(
    band(suffix, minimum, maximum, bundles, {"slab-bundle": bundles, "strap": bundles * 2})
    for suffix, minimum, maximum, bundles in (
        ("1", 1, 1, 1),
        ("2", 2, 2, 2),
        ("3-4", 3, 4, 4),
        ("5plus", 5, None, 5),
    )
)

FUEL_FAMILIES = {
    "pellets-bag": FuelFamily(
        "pellets-bag", "pelety", ("pellets-bag",), ("pellet-bag-15kg",), PELLET_BAG_BANDS,
        ("Preserve the approved v3 tree print and 15 kg only.",),
    ),
    "pellets-set": FuelFamily(
        "pellets-set", "pelety", ("pellets-set",), ("pellet-bag-15kg",), PELLET_SET_BANDS,
        ("One selling set equals ten bags.",),
    ),
    "pellets-pallet": FuelFamily(
        "pellets-pallet", "pelety", ("pellets-pallet",), ("pellet-bag-15kg", "pallet", "wrap"), PELLET_PALLET_BANDS,
        ("Use eight layers of five rendered bags; commercial equivalent is 65 bags / 975 kg.",),
    ),
    "firewood-loose": FuelFamily(
        "firewood-loose", "stipane-drevo", ("firewood-loose",),
        ("split-triangular", "split-quarter", "split-triangular-irregular"), FIREWOOD_BANDS,
        ("Bark is allowed only on the outer rounded edge.",),
    ),
    "firewood-bigbag": FuelFamily(
        "firewood-bigbag", "stipane-drevo", ("firewood-bag",),
        ("big-bag", "split-half-round", "split-quarter", "split-triangular"), BIG_BAG_BANDS,
        ("Use fully opaque warm canvas.",),
    ),
    "firewood-pallet-16": FuelFamily(
        "firewood-pallet-16", "stipane-drevo", ("firewood-pallet", "pallet-16"),
        ("pallet", "pallet-frame-16", "split-half-round", "split-quarter", "split-triangular"), PALLET_BANDS,
        ("Share the same 1.6 prm master across both runtime variants.",),
    ),
    "firewood-pallet-25": FuelFamily(
        "firewood-pallet-25", "drivi-na-paletach", ("pallet-25",),
        ("pallet", "pallet-frame-25", "split-half-round", "split-quarter", "split-triangular"), PALLET_BANDS,
        ("Parameterize 25 cm log length and denser cut faces.",),
    ),
    "firewood-pallet-33": FuelFamily(
        "firewood-pallet-33", "drivi-na-paletach", ("pallet-33",),
        ("pallet", "pallet-frame-33", "split-half-round", "split-quarter", "split-triangular"), PALLET_BANDS,
        ("Parameterize 33 cm log length; use its 1 prm master for the future homepage icon.",),
    ),
    "slabs": FuelFamily(
        "slabs", "krajinky", ("slabs-2m", "slabs-3m", "slabs-4m"),
        ("slab-a", "slab-b", "slab-c", "strap"), SLAB_BANDS,
        ("Render separate 2/3/4 m geometry without runtime stretching; use two straps per bundle.",),
    ),
}


LOOSE_FIREWOOD_PREFIX = "firewood-loose-production-v2"
LOOSE_TILE_SIZE = (360, 240)
LOOSE_TILE_ORIGINS = ((178, 392), (588, 392), (998, 392))
LOOSE_TILE_KINDS = ("split-triangular", "split-quarter", "split-triangular-irregular")
LOOSE_SOURCE_X_RANGES = ((0, 540), (520, 1025), (995, 1536))
LOOSE_TILE_TARGET_SIZE = (330, 170)
LOOSE_PROMPT_SPEC = Path(__file__).with_name("firewood_loose_prompt_v2.json")
LOOSE_LAYER_COUNTS = {
    1: (5, 4, 3),
    2: (7, 6, 5),
    3: (8, 7, 5, 4),
    6: (11, 10, 8, 7),
    9: (13, 11, 10, 8, 6),
    12: (16, 14, 12, 10, 8),
    16: (18, 16, 14, 13, 11),
}


def _principal_axis_degrees(image: Image.Image) -> float:
    alpha = image.getchannel("A")
    points = [
        (x, y)
        for y in range(alpha.height)
        for x in range(alpha.width)
        if alpha.getpixel((x, y)) >= 128
    ]
    if not points:
        raise ValueError("Generated Unit Tile component has no opaque pixels")
    mean_x = sum(point[0] for point in points) / len(points)
    mean_y = sum(point[1] for point in points) / len(points)
    covariance_xx = sum((x - mean_x) ** 2 for x, _ in points)
    covariance_yy = sum((y - mean_y) ** 2 for _, y in points)
    covariance_xy = sum((x - mean_x) * (y - mean_y) for x, y in points)
    return math.degrees(
        0.5 * math.atan2(2 * covariance_xy, covariance_xx - covariance_yy)
    )


def _prepare_generated_tile(source: Image.Image, x_range: tuple[int, int]) -> Image.Image:
    component = source.crop((x_range[0], 0, x_range[1], source.height))
    bounds = component.getchannel("A").getbbox()
    if bounds is None:
        raise ValueError(f"Missing Unit Tile component in source range {x_range}")
    component = component.crop(bounds)
    component = component.rotate(
        _principal_axis_degrees(component),
        resample=Image.Resampling.BICUBIC,
        expand=True,
    )
    rotated_bounds = component.getchannel("A").getbbox()
    if rotated_bounds is None:
        raise ValueError(f"Empty Unit Tile component after rotation in source range {x_range}")
    component = component.crop(rotated_bounds)
    return ImageOps.contain(
        component,
        (LOOSE_TILE_TARGET_SIZE[0] * SUPER_SAMPLE, LOOSE_TILE_TARGET_SIZE[1] * SUPER_SAMPLE),
        Image.Resampling.LANCZOS,
    )


def render_loose_firewood_unit_tile(
    output_dir: Path,
    unit_tile_source: Path,
) -> tuple[Image.Image, Path, dict[str, object]]:
    source = Image.open(unit_tile_source).convert("RGBA")
    if source.size != CANVAS:
        raise ValueError(f"Unexpected generated Unit Tile canvas: {source.size}")
    if any(
        source.getpixel(corner)[3] != 0
        for corner in (
            (0, 0),
            (CANVAS[0] - 1, 0),
            (0, CANVAS[1] - 1),
            (CANVAS[0] - 1, CANVAS[1] - 1),
        )
    ):
        raise ValueError("Generated Unit Tile source must have transparent corners")

    atlas_4x = Image.new(
        "RGBA", (CANVAS[0] * SUPER_SAMPLE, CANVAS[1] * SUPER_SAMPLE), (0, 0, 0, 0)
    )
    component_bounds: list[dict[str, object]] = []
    for origin, kind, x_range in zip(
        LOOSE_TILE_ORIGINS,
        LOOSE_TILE_KINDS,
        LOOSE_SOURCE_X_RANGES,
        strict=True,
    ):
        tile = _prepare_generated_tile(source, x_range)
        region_x = origin[0] * SUPER_SAMPLE
        region_y = origin[1] * SUPER_SAMPLE
        paste_x = region_x + (LOOSE_TILE_SIZE[0] * SUPER_SAMPLE - tile.width) // 2
        paste_y = region_y + (LOOSE_TILE_SIZE[1] * SUPER_SAMPLE - tile.height) // 2
        atlas_4x.alpha_composite(tile, (paste_x, paste_y))
        component_bounds.append(
            {
                "kind": kind,
                "sourceXRange": list(x_range),
                "normalizedSize4x": {"width": tile.width, "height": tile.height},
            }
        )
    atlas = sanitize_antialias_alpha(atlas_4x.resize(CANVAS, Image.Resampling.LANCZOS))
    unit_path = output_dir / "unit-tiles" / f"{LOOSE_FIREWOOD_PREFIX}-unit-tile-master-v11.png"
    unit_path.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(unit_path)
    metadata = alpha_metadata(atlas)
    metadata.update(
        {
            "styleVersion": "v11",
            "approvalStatus": "awaiting-approval",
            "family": "firewood-loose",
            "seed": SEED,
            "camera": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27},
            "tileKinds": list(LOOSE_TILE_KINDS),
            "tileSize": {"width": LOOSE_TILE_SIZE[0], "height": LOOSE_TILE_SIZE[1]},
            "tileOrigins": [list(origin) for origin in LOOSE_TILE_ORIGINS],
            "componentBounds": component_bounds,
            "unitScale": 1,
            "barkPolicy": "outer-rounded-surface-only",
            "renderTechnique": "imagegen-style-reference-plus-deterministic-composition",
            "sourceGeneratedPath": unit_tile_source.as_posix(),
            "sourceGeneratedSha256": sha256(unit_tile_source),
            "promptSpec": LOOSE_PROMPT_SPEC.as_posix(),
            "promptSpecSha256": sha256(LOOSE_PROMPT_SPEC),
        }
    )
    write_json(unit_path.with_suffix(".json"), metadata)
    return atlas_4x, unit_path, metadata


def _rotated_tile(atlas_4x: Image.Image, tile_index: int, angle: float) -> Image.Image:
    ox, oy = LOOSE_TILE_ORIGINS[tile_index]
    region = (
        ox * SUPER_SAMPLE,
        oy * SUPER_SAMPLE,
        (ox + LOOSE_TILE_SIZE[0]) * SUPER_SAMPLE,
        (oy + LOOSE_TILE_SIZE[1]) * SUPER_SAMPLE,
    )
    return atlas_4x.crop(region).rotate(angle, resample=Image.Resampling.BICUBIC, expand=True)


def _render_loose_band(
    atlas_4x: Image.Image,
    item: FuelBand,
    tile_cache: dict[tuple[int, float], Image.Image],
) -> tuple[Image.Image, dict[str, object]]:
    representative = item.representative_selling_units
    layer_counts = LOOSE_LAYER_COUNTS[representative]
    if sum(layer_counts) != item.rendered_module_counts["split-log"]:
        raise ValueError(f"Loose-firewood layer count mismatch for {item.suffix}")

    canvas = Image.new(
        "RGBA", (CANVAS[0] * SUPER_SAMPLE, CANVAS[1] * SUPER_SAMPLE), (0, 0, 0, 0)
    )
    rng = random.Random(SEED + representative * 101)
    angles = (-44, -34, -24, -14, -6, 7, 16, 26, 36, 45)
    rendered = 0
    for layer_index, count in enumerate(layer_counts):
        y = 760 - layer_index * 72
        step = 59 if representative == 3 else (55 if representative >= 16 else 57)
        start_x = CANVAS[0] / 2 - ((count - 1) * step) / 2
        row: list[tuple[int, int, int, float]] = []
        for column in range(count):
            tile_index = (rendered + layer_index) % len(LOOSE_TILE_KINDS)
            if column == 0:
                angle = 7
            elif column == count - 1:
                angle = -6
            else:
                angle = angles[(rendered * 7 + layer_index * 3) % len(angles)]
            jitter_x = rng.randint(-20, 20)
            jitter_y = rng.randint(-23, 23)
            center_x = round((start_x + column * step + jitter_x) * SUPER_SAMPLE)
            center_y = round((y + jitter_y) * SUPER_SAMPLE)
            row.append((center_y, center_x, tile_index, angle))
            rendered += 1
        for center_y, center_x, tile_index, angle in sorted(row):
            cache_key = (tile_index, angle)
            tile = tile_cache.get(cache_key)
            if tile is None:
                tile = _rotated_tile(atlas_4x, tile_index, angle)
                tile_cache[cache_key] = tile
            canvas.alpha_composite(tile, (center_x - tile.width // 2, center_y - tile.height // 2))

    image = sanitize_antialias_alpha(canvas.resize(CANVAS, Image.Resampling.LANCZOS))
    image = add_outer_contour(image)
    metadata = alpha_metadata(image)
    metadata.update(
        {
            "styleVersion": "v11",
            "approvalStatus": "awaiting-approval",
            "family": "firewood-loose",
            "quantityBand": {
                "min": item.minimum,
                **({} if item.maximum is None else {"max": item.maximum}),
            },
            "representativeCount": representative,
            "renderedModuleCounts": dict(item.rendered_module_counts),
            "layerCountsBottomToTop": list(layer_counts),
            "unitScale": 1,
            "pileEnvelopeExponents": {"width": 0.45, "depth": 0.35, "height": 0.20},
            "supportPolicy": "ground-or-two-lower-neighbours",
            "seed": SEED + representative * 101,
            "safeInset": SAFE_INSET,
            "contourReservePixels": CONTOUR_RESERVE,
        }
    )
    return image, metadata


def _assert_loose_candidate(metadata: Mapping[str, object], suffix: str) -> None:
    bounds = metadata["alphaBoundsPixels"]
    if not isinstance(bounds, Mapping):
        raise AssertionError(f"Missing alpha bounds for {suffix}")
    inset_x = CANVAS[0] * SAFE_INSET + CONTOUR_RESERVE
    inset_y = CANVAS[1] * SAFE_INSET + CONTOUR_RESERVE
    if float(bounds["left"]) < inset_x or float(bounds["right"]) > CANVAS[0] - inset_x:
        raise AssertionError(f"Horizontal safe inset violated for {suffix}: {bounds}")
    if float(bounds["top"]) < inset_y or float(bounds["bottom"]) > CANVAS[1] - inset_y:
        raise AssertionError(f"Vertical safe inset violated for {suffix}: {bounds}")


def render_loose_firewood_candidates(
    output_dir: Path,
    unit_tile_source: Path,
) -> list[dict[str, object]]:
    atlas_4x, unit_path, unit_metadata = render_loose_firewood_unit_tile(
        output_dir,
        unit_tile_source,
    )
    unit_hash = sha256(unit_path)
    entries: list[dict[str, object]] = []
    tile_cache: dict[tuple[int, float], Image.Image] = {}
    for item in FIREWOOD_BANDS:
        image, metadata = _render_loose_band(atlas_4x, item, tile_cache)
        _assert_loose_candidate(metadata, item.suffix)
        filename = f"{LOOSE_FIREWOOD_PREFIX}-{item.suffix}-master-v11.webp"
        image_path = output_dir / LOOSE_FIREWOOD_PREFIX / filename
        save_webp(image, image_path)
        metadata.update(
            {
                "source": unit_path.as_posix(),
                "sourceSha256": unit_hash,
                "outputSha256": sha256(image_path),
                "plannedRuntimePath": f"/images/illustrations/configurator-v11/{filename}",
            }
        )
        manifest_path = image_path.with_suffix(".manifest.json")
        write_json(manifest_path, metadata)
        entries.append({"image": image_path, "manifest": manifest_path, **metadata})

    qa_dir = output_dir / "qa"
    contact_sheet(entries, qa_dir / "firewood-loose-v11-light.png", "Volné dřevo v11 — light", "#F8F1E5")
    contact_sheet(entries, qa_dir / "firewood-loose-v11-dark.png", "Volné dřevo v11 — dark", "#3B352F")
    contact_sheet(
        entries,
        qa_dir / "firewood-loose-v11-320.png",
        "Volné dřevo v11 — 320 px",
        "#F8F1E5",
        cell_size=(320, 220),
        columns=4,
    )
    write_json(
        output_dir / f"{LOOSE_FIREWOOD_PREFIX}-index.json",
        {
            "approvalStatus": "awaiting-approval",
            "runtimeActivation": "blocked-until-explicit-visual-approval",
            "unitTile": {"path": unit_path.as_posix(), "sha256": unit_hash, **unit_metadata},
            "candidates": [
                {
                    "image": Path(entry["image"]).as_posix(),
                    "manifest": Path(entry["manifest"]).as_posix(),
                    "outputSha256": entry["outputSha256"],
                }
                for entry in entries
            ],
        },
    )
    return entries


def validate_loose_firewood_candidates(output_dir: Path) -> dict[str, object]:
    index_path = output_dir / f"{LOOSE_FIREWOOD_PREFIX}-index.json"
    index = json.loads(index_path.read_text(encoding="utf-8"))
    unit_tile = index["unitTile"]
    generated_source = Path(unit_tile["sourceGeneratedPath"])
    prompt_spec = Path(unit_tile["promptSpec"])
    if sha256(generated_source) != unit_tile["sourceGeneratedSha256"]:
        raise AssertionError("Generated Unit Tile source hash mismatch")
    if sha256(prompt_spec) != unit_tile["promptSpecSha256"]:
        raise AssertionError("Loose-firewood prompt specification hash mismatch")
    if unit_tile["renderTechnique"] != "imagegen-style-reference-plus-deterministic-composition":
        raise AssertionError("Unexpected loose-firewood rendering technique")
    if any("half-round" in kind for kind in unit_tile["tileKinds"]):
        raise AssertionError("Round or half-round Unit Tile morphology is not allowed")
    candidates = index["candidates"]
    if len(candidates) != len(FIREWOOD_BANDS):
        raise AssertionError(f"Expected {len(FIREWOOD_BANDS)} loose-firewood candidates")

    previous_width = 0
    previous_coverage = 0.0
    validated: list[dict[str, object]] = []
    for expected_band, expected_logs, candidate in zip(
        FIREWOOD_BANDS, LOOSE_LOG_COUNTS, candidates, strict=True
    ):
        image_path = Path(candidate["image"])
        manifest_path = Path(candidate["manifest"])
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        image = Image.open(image_path).convert("RGBA")
        if image.size != CANVAS:
            raise AssertionError(f"Unexpected canvas for {image_path}: {image.size}")
        if any(image.getpixel(corner)[3] != 0 for corner in ((0, 0), (1535, 0), (0, 1023), (1535, 1023))):
            raise AssertionError(f"Opaque canvas corner in {image_path}")
        if sha256(image_path) != manifest["outputSha256"]:
            raise AssertionError(f"Output hash mismatch for {image_path}")
        if manifest["sourceSha256"] != unit_tile["sha256"]:
            raise AssertionError(f"Unit Tile hash mismatch for {image_path}")
        if manifest["unitScale"] != 1:
            raise AssertionError(f"Unit scale changed in {image_path}")
        if manifest["renderedModuleCounts"]["split-log"] != expected_logs:
            raise AssertionError(f"Rendered log count mismatch in {image_path}")
        if manifest["quantityBand"]["min"] != expected_band.minimum:
            raise AssertionError(f"Quantity band mismatch in {image_path}")
        _assert_loose_candidate(manifest, expected_band.suffix)

        width = int(manifest["alphaBoundsPixels"]["right"]) - int(
            manifest["alphaBoundsPixels"]["left"]
        )
        coverage = float(manifest["alphaCoverage"])
        if width < previous_width:
            raise AssertionError(f"Pile footprint shrank in {image_path}")
        if coverage <= previous_coverage:
            raise AssertionError(f"Visible mass did not increase in {image_path}")
        previous_width = width
        previous_coverage = coverage
        validated.append(
            {
                "image": image_path.as_posix(),
                "sha256": manifest["outputSha256"],
                "alphaWidth": width,
                "alphaCoverage": coverage,
                "renderedLogs": expected_logs,
            }
        )

    result = {
        "valid": True,
        "approvalStatus": "awaiting-approval",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "unitTileSha256": unit_tile["sha256"],
        "sourceGeneratedSha256": unit_tile["sourceGeneratedSha256"],
        "promptSpecSha256": unit_tile["promptSpecSha256"],
        "candidates": validated,
    }
    write_json(output_dir / "validation.json", result)
    return result


def validate_family(family: FuelFamily) -> None:
    expected_minimum = 1
    for item in family.bands:
        if item.minimum != expected_minimum:
            raise ValueError(f"Band gap in {family.id}: expected {expected_minimum}, got {item.minimum}")
        if item.representative_selling_units < 1 or any(count < 1 for count in item.rendered_module_counts.values()):
            raise ValueError(f"Invalid representative count in {family.id}:{item.suffix}")
        expected_minimum = (item.maximum + 1) if item.maximum is not None else expected_minimum
    if family.bands[-1].maximum is not None:
        raise ValueError(f"Final band must be open-ended: {family.id}")


def family_plan(family_id: str) -> dict[str, object]:
    family = FUEL_FAMILIES[family_id]
    validate_family(family)
    payload = {
        "styleVersion": "v11",
        "approvalStatus": "planned",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "camera": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27},
        "safeInset": SAFE_INSET,
        "seed": SEED,
        "family": asdict(family),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    payload["planSha256"] = hashlib.sha256(encoded).hexdigest()
    return payload


def write_family_plan(family_ids: Sequence[str], output: Path) -> None:
    plans = [family_plan(family_id) for family_id in family_ids]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"families": plans}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
