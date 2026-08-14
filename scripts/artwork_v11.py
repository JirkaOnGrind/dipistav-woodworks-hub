#!/usr/bin/env python3
"""Shared deterministic renderer for DIPISTAV artwork-system v11.

The renderer owns geometry, opacity, clean contours, auto-fit, and layer order.
Wood faces reuse the repository's approved 12 August 19:45:37 beam Unit Tile as
the canonical texture source.  Only the inset face texture is transferred;
geometry, alpha, seams, and corner pixels are rebuilt from exact polygons.
"""

from __future__ import annotations

import hashlib
import json
import math
import random
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Iterable, Sequence

from PIL import Image, ImageChops, ImageDraw, ImageFilter


CANVAS = (1536, 1024)
SUPER_SAMPLE = 4
SAFE_INSET = 0.07
CONTOUR_RESERVE = 8.0
MAX_AUTO_FIT = 2.0
SEED = 20260813

OUTER = "#501801"
EDGE = "#501801"
SEAM = "#6B310B"
GRAIN = "#804015"
SIDE_SHADOW = "#965622"
SIDE = "#C5813B"
TOP_BASE = "#F0A242"
TOP = "#F4A847"
END = "#EEA847"

OUTER_PX = 4.0
EDGE_PX = 3.0
SEAM_PX = 3.0
RING_PX = 1.5
GRAIN_PX = 1.25

PLANK_COLUMN = (280.0, -58.0)
PLANK_ROW = (0.0, 119.0)
PLANK_DEPTH = (-372.0, -183.0)

BOARD_COLUMN = (225.0, -47.0)
BOARD_ROW = (0.0, 48.0)
BOARD_DEPTH = (-380.0, -187.0)

LATH_COLUMN = (90.0, -19.0)
LATH_ROW = (0.0, 67.0)
LATH_DEPTH = (-430.0, -211.0)

BEAM_COLUMN = (135.0, -28.0)
BEAM_ROW = (0.0, 130.0)
BEAM_DEPTH = (-560.0, -275.0)

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_UNIT_TILE = (
    REPOSITORY_ROOT / "artwork-sources" / "beams" / "beam-unit-tile-master-v1-4x.png"
)
CANONICAL_REFERENCE = REPOSITORY_ROOT / "Obrázek Codex 12. 8. 2026 19_45_37.png"


Vec = tuple[float, float]


@dataclass(frozen=True)
class FamilyGeometry:
    family: str
    column: Vec
    row: Vec
    depth: Vec
    top_grain_lines: int
    side_grain_lines: int
    end_rings: int


@dataclass(frozen=True)
class Unit:
    column: float
    row: int
    key: str

    @property
    def anchor_indices(self) -> tuple[float, int]:
        return self.column, self.row


@dataclass(frozen=True)
class Layout:
    count: int
    name: str
    columns: int
    rows: int
    units: tuple[Unit, ...]
    band: tuple[int, int | None]
    suffix: str


FAMILIES = {
    "beam": FamilyGeometry("beam", BEAM_COLUMN, BEAM_ROW, BEAM_DEPTH, 5, 4, 5),
    "plank": FamilyGeometry("plank", PLANK_COLUMN, PLANK_ROW, PLANK_DEPTH, 6, 4, 5),
    "board": FamilyGeometry("board", BOARD_COLUMN, BOARD_ROW, BOARD_DEPTH, 5, 3, 4),
    "lath": FamilyGeometry("lath", LATH_COLUMN, LATH_ROW, LATH_DEPTH, 4, 3, 4),
}


def add(left: Vec, right: Vec) -> Vec:
    return left[0] + right[0], left[1] + right[1]


def mul(vector: Vec, factor: float) -> Vec:
    return vector[0] * factor, vector[1] * factor


def lerp(left: Vec, right: Vec, factor: float) -> Vec:
    return (
        left[0] + (right[0] - left[0]) * factor,
        left[1] + (right[1] - left[1]) * factor,
    )


def stable_rng(*parts: object) -> random.Random:
    payload = ":".join([str(SEED), *(str(part) for part in parts)]).encode("utf-8")
    return random.Random(int.from_bytes(hashlib.sha256(payload).digest()[:8], "big"))


def rectangular_layout(
    count: int,
    columns: int,
    rows: int,
    band: tuple[int, int | None],
    suffix: str,
) -> Layout:
    units = tuple(
        Unit(float(column), row, f"r{row}c{column}")
        for row in reversed(range(rows))
        for column in range(columns)
    )
    return Layout(count, f"{columns}x{rows}", columns, rows, units, band, suffix)


def quantity_layouts() -> tuple[Layout, ...]:
    return (
        rectangular_layout(1, 1, 1, (1, 1), "1"),
        rectangular_layout(2, 2, 1, (2, 2), "2"),
        Layout(
            3,
            "2+1-centered",
            2,
            2,
            (
                Unit(0.0, 1, "bottom-left"),
                Unit(1.0, 1, "bottom-right"),
                Unit(0.5, 0, "top-center"),
            ),
            (3, 4),
            "3-4",
        ),
        rectangular_layout(6, 3, 2, (5, 8), "5-8"),
        rectangular_layout(9, 3, 3, (9, 11), "9-11"),
        rectangular_layout(12, 4, 3, (12, 15), "12-15"),
        rectangular_layout(16, 4, 4, (16, None), "16plus"),
    )


def unit_anchor(unit: Unit, geometry: FamilyGeometry) -> Vec:
    return add(mul(geometry.column, unit.column), mul(geometry.row, unit.row))


def face_polygons(anchor: Vec, geometry: FamilyGeometry) -> dict[str, list[Vec]]:
    front_left = anchor
    front_right = add(anchor, geometry.column)
    front_bottom_right = add(front_right, geometry.row)
    front_bottom_left = add(anchor, geometry.row)
    back_left = add(anchor, geometry.depth)
    back_right = add(front_right, geometry.depth)
    back_bottom_left = add(front_bottom_left, geometry.depth)
    return {
        "side": [back_left, front_left, front_bottom_left, back_bottom_left],
        "top": [back_left, back_right, front_right, front_left],
        "front": [front_left, front_right, front_bottom_right, front_bottom_left],
    }


def geometry_bounds(layout: Layout, geometry: FamilyGeometry) -> tuple[float, float, float, float]:
    points: list[Vec] = []
    for unit in layout.units:
        for polygon in face_polygons(unit_anchor(unit, geometry), geometry).values():
            points.extend(polygon)
    xs = [point[0] for point in points]
    ys = [point[1] for point in points]
    return min(xs), min(ys), max(xs), max(ys)


def auto_fit_transform(layout: Layout, geometry: FamilyGeometry) -> tuple[float, float, float]:
    left, top, right, bottom = geometry_bounds(layout, geometry)
    usable_width = CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE
    usable_height = CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE
    scale = min(MAX_AUTO_FIT, usable_width / (right - left), usable_height / (bottom - top))
    tx = CANVAS[0] / 2 - scale * (left + right) / 2
    ty = CANVAS[1] / 2 - scale * (top + bottom) / 2
    return scale, tx, ty


def transform_point(point: Vec, transform: tuple[float, float, float]) -> Vec:
    scale, tx, ty = transform
    return (
        (point[0] * scale + tx) * SUPER_SAMPLE,
        (point[1] * scale + ty) * SUPER_SAMPLE,
    )


def transform_points(points: Iterable[Vec], transform: tuple[float, float, float]) -> list[Vec]:
    return [transform_point(point, transform) for point in points]


def closed(points: Sequence[Vec]) -> list[Vec]:
    return [*points, points[0]]


def contract_polygon(points: Sequence[Vec], factor: float) -> list[Vec]:
    """Contract a convex face toward its centroid for clean texture sampling."""
    center = (
        sum(point[0] for point in points) / len(points),
        sum(point[1] for point in points) / len(points),
    )
    return [add(center, mul((point[0] - center[0], point[1] - center[1]), factor)) for point in points]


def inverse_affine(target: Sequence[Vec], source: Sequence[Vec]) -> tuple[float, ...]:
    """Return PIL affine coefficients mapping a target patch into the source."""
    (x1, y1), (x2, y2), (x3, y3) = target[:3]
    determinant = x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2)
    if math.isclose(determinant, 0.0):
        raise ValueError("Cannot solve affine transform for a degenerate target face")

    def coefficients(values: Sequence[float]) -> tuple[float, float, float]:
        value1, value2, value3 = values
        return (
            (value1 * (y2 - y3) + value2 * (y3 - y1) + value3 * (y1 - y2))
            / determinant,
            (value1 * (x3 - x2) + value2 * (x1 - x3) + value3 * (x2 - x1))
            / determinant,
            (
                value1 * (x2 * y3 - x3 * y2)
                + value2 * (x3 * y1 - x1 * y3)
                + value3 * (x1 * y2 - x2 * y1)
            )
            / determinant,
        )

    return (*coefficients([point[0] for point in source[:3]]), *coefficients([point[1] for point in source[:3]]))


@lru_cache(maxsize=1)
def canonical_texture_faces() -> tuple[dict[str, Image.Image], dict[str, list[Vec]]]:
    """Extract clean face interiors from the canonical 4x beam Unit Tile."""
    if not CANONICAL_UNIT_TILE.exists():
        raise FileNotFoundError(f"Missing canonical Unit Tile: {CANONICAL_UNIT_TILE}")
    source = Image.open(CANONICAL_UNIT_TILE).convert("RGBA")
    source_geometry = face_polygons((800.0, 450.0), FAMILIES["beam"])
    face_polygons_4x = {
        name: [mul(point, SUPER_SAMPLE) for point in polygon]
        for name, polygon in source_geometry.items()
    }
    # Sample from a safely inset region. The old mapping used the original
    # polygon after eroding its alpha, exposing the bright base fill as an
    # inner halo. Contracting the sampling polygon makes the approved texture
    # cover every destination pixel while keeping source contours out.
    sampling_polygons = {
        name: contract_polygon(polygon, 0.90)
        for name, polygon in face_polygons_4x.items()
    }
    # Sampling polygons are already safely inside their source faces, so the
    # raw approved source can be sampled directly. Applying a second eroded
    # alpha mask here was the cause of the exposed light fallback band.
    faces = {name: source.copy() for name in face_polygons_4x}
    return faces, sampling_polygons


def render_reference_texture_face(
    canvas: Image.Image,
    face_name: str,
    polygon: Sequence[Vec],
    texture_key: str,
) -> None:
    """Map the approved face texture into an exact, fully opaque polygon."""
    source_faces, sampling_polygons = canonical_texture_faces()
    xs = [point[0] for point in polygon]
    ys = [point[1] for point in polygon]
    padding = 2 * SUPER_SAMPLE
    left = math.floor(min(xs)) - padding
    top = math.floor(min(ys)) - padding
    right = math.ceil(max(xs)) + padding
    bottom = math.ceil(max(ys)) + padding
    size = (right - left, bottom - top)
    local_polygon = [(x - left, y - top) for x, y in polygon]
    rng = stable_rng("texture-sample", texture_key, face_name)
    sample_offset = (rng.uniform(-14.0, 14.0), rng.uniform(-10.0, 10.0))
    source_polygon = [
        add(point, sample_offset)
        for point in sampling_polygons[face_name]
    ]
    patch = source_faces[face_name].transform(
        size,
        Image.Transform.AFFINE,
        inverse_affine(local_polygon, source_polygon),
        resample=Image.Resampling.BICUBIC,
    )
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).polygon(local_polygon, fill=255)
    interior = mask.filter(ImageFilter.MinFilter(17))
    patch_alpha = patch.getchannel("A")
    covered = patch_alpha.point(lambda value: 255 if value >= 248 else 0)
    uncovered = ImageChops.subtract(interior, covered)
    if uncovered.getbbox() is not None:
        raise ValueError(f"Canonical texture does not fully cover {face_name} face interior")
    base = Image.new(
        "RGBA",
        size,
        {"side": SIDE, "top": TOP, "front": END}[face_name],
    )
    base.putalpha(mask)
    patch.putalpha(ImageChops.multiply(patch_alpha, mask))
    base.alpha_composite(patch)
    canvas.alpha_composite(base, (left, top))


def draw_longitudinal_grain(
    draw: ImageDraw.ImageDraw,
    anchor: Vec,
    geometry: FamilyGeometry,
    face: str,
    transform: tuple[float, float, float],
    unit_key: str,
) -> None:
    count = geometry.top_grain_lines if face == "top" else geometry.side_grain_lines
    cross = geometry.column if face == "top" else geometry.row
    origin = anchor
    rng = stable_rng(geometry.family, unit_key, face)
    for line_index in range(1, count + 1):
        fraction = line_index / (count + 1)
        points: list[Vec] = []
        for step in range(9):
            travel = step / 8
            base = add(add(origin, mul(geometry.depth, 1 - travel)), mul(cross, fraction))
            wobble = math.sin(travel * math.tau * 1.5 + rng.random() * 0.8) * 0.006
            points.append(add(base, mul(cross, wobble)))
        draw.line(
            transform_points(points, transform),
            fill=GRAIN,
            width=round(GRAIN_PX * SUPER_SAMPLE),
            joint="curve",
        )


def draw_end_grain(
    draw: ImageDraw.ImageDraw,
    anchor: Vec,
    geometry: FamilyGeometry,
    transform: tuple[float, float, float],
    unit_key: str,
) -> None:
    rng = stable_rng(geometry.family, unit_key, "rings")
    center = add(add(anchor, mul(geometry.column, 0.48 + rng.uniform(-0.05, 0.05))), mul(geometry.row, 0.54))
    for ring in range(1, geometry.end_rings + 1):
        radius = ring / (geometry.end_rings + 1) * 0.46
        points: list[Vec] = []
        for step in range(49):
            angle = math.tau * step / 48
            wobble = 1 + math.sin(angle * 3 + rng.random() * 0.5) * 0.025
            point = add(
                center,
                add(
                    mul(geometry.column, math.cos(angle) * radius * wobble),
                    mul(geometry.row, math.sin(angle) * radius * 0.88 * wobble),
                ),
            )
            points.append(point)
        draw.line(
            transform_points(points, transform),
            fill=GRAIN,
            width=round(RING_PX * SUPER_SAMPLE),
            joint="curve",
        )


def render_unit(
    image: Image.Image,
    unit: Unit,
    geometry: FamilyGeometry,
    transform: tuple[float, float, float],
    visible_faces: Sequence[str],
) -> None:
    draw = ImageDraw.Draw(image)
    anchor = unit_anchor(unit, geometry)
    polygons = face_polygons(anchor, geometry)
    for face in ("side", "top", "front"):
        if face not in visible_faces:
            continue
        polygon = transform_points(polygons[face], transform)
        render_reference_texture_face(image, face, polygon, f"{geometry.family}:{unit.key}")
        draw.line(
            closed(polygon),
            fill=EDGE,
            width=round(EDGE_PX * SUPER_SAMPLE),
            joint="curve",
        )


def add_outer_contour(image: Image.Image, sample_scale: int = 1) -> Image.Image:
    alpha = image.getchannel("A")
    erosion_size = round(OUTER_PX * sample_scale) * 2 + 1
    eroded = alpha.filter(ImageFilter.MinFilter(erosion_size))
    boundary = ImageChops.subtract(alpha, eroded)
    contour = Image.new("RGBA", image.size, OUTER)
    contour.putalpha(boundary)
    return Image.alpha_composite(image, contour)


def sanitize_antialias_alpha(image: Image.Image) -> Image.Image:
    """Remove sub-visible Lanczos ringing without widening the visible edge."""
    alpha = image.getchannel("A").point(
        lambda value: 0 if value < 8 else 255 if value > 247 else value
    )
    image.putalpha(alpha)
    return image


def alpha_metadata(image: Image.Image) -> dict[str, object]:
    alpha = image.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise ValueError("Artwork has no opaque content")
    left, top, right, bottom = bounds
    values = alpha.get_flattened_data()
    coverage = sum(value > 0 for value in values) / (image.width * image.height)
    interior_alpha_min = min((value for value in values if value >= 248), default=0)
    return {
        "canvas": {"width": image.width, "height": image.height},
        "alphaBoundsPixels": {"left": left, "top": top, "right": right, "bottom": bottom},
        "alphaBounds": {
            "x": round(left / image.width, 6),
            "y": round(top / image.height, 6),
            "width": round((right - left) / image.width, 6),
            "height": round((bottom - top) / image.height, 6),
        },
        "opticalCenter": {
            "x": round((left + right) / (2 * image.width), 6),
            "y": round((top + bottom) / (2 * image.height), 6),
        },
        "alphaCoverage": round(coverage, 6),
        "interiorAlphaMin": interior_alpha_min,
        "margins": {
            "left": left,
            "top": top,
            "right": image.width - right,
            "bottom": image.height - bottom,
        },
    }


def expected_seam_count(layout: Layout) -> int:
    if layout.count == 3:
        return 2
    front = (layout.columns - 1) * layout.rows + (layout.rows - 1) * layout.columns
    top = layout.columns - 1
    side = layout.rows - 1
    return front + top + side


def render_stack(layout: Layout, geometry: FamilyGeometry) -> tuple[Image.Image, dict[str, object]]:
    transform = auto_fit_transform(layout, geometry)
    image = Image.new("RGBA", (CANVAS[0] * SUPER_SAMPLE, CANVAS[1] * SUPER_SAMPLE), (0, 0, 0, 0))
    for unit in layout.units:
        row_columns = [candidate.column for candidate in layout.units if candidate.row == unit.row]
        faces = ["front"]
        if unit.column == min(row_columns):
            faces.insert(0, "side")
        if unit.row == 0 or layout.count == 3:
            faces.insert(1 if "side" in faces else 0, "top")
        render_unit(image, unit, geometry, transform, faces)
    image = sanitize_antialias_alpha(image.resize(CANVAS, Image.Resampling.LANCZOS))
    # The authoritative alpha is antialiased once, then the four-pixel contour
    # is derived inside that final mask.  This is mathematically equivalent to
    # a 24 px supersampled erosion and avoids a prohibitively large 49x49
    # minimum filter over the 6144x4096 working canvas.
    image = add_outer_contour(image)
    metadata = alpha_metadata(image)
    band_min, band_max = layout.band
    metadata.update(
        {
            "family": geometry.family,
            "quantityBand": {"min": band_min, **({} if band_max is None else {"max": band_max})},
            "representativeCount": layout.count,
            "layout": layout.name,
            "expectedVisibleConstructionSeams": expected_seam_count(layout),
            "camera": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27},
            "designVectors": {
                "column": list(geometry.column),
                "rowDown": list(geometry.row),
                "back": list(geometry.depth),
            },
            "autoFit": {
                "policy": "adaptive-bounds",
                "safeInset": SAFE_INSET,
                "contourReservePixels": CONTOUR_RESERVE,
                "maxScale": MAX_AUTO_FIT,
                "renderScale": round(transform[0], 8),
                "translation": [round(transform[1], 4), round(transform[2], 4)],
            },
            "lineWeights": {
                "outer": OUTER_PX,
                "edge": EDGE_PX,
                "seam": SEAM_PX,
                "rings": RING_PX,
                "grain": GRAIN_PX,
            },
            "palette": [OUTER, EDGE, SEAM, GRAIN, SIDE_SHADOW, SIDE, TOP_BASE, TOP, END],
            "canonicalTextureSource": CANONICAL_UNIT_TILE.relative_to(REPOSITORY_ROOT).as_posix(),
            "canonicalTextureSha256": hashlib.sha256(CANONICAL_UNIT_TILE.read_bytes()).hexdigest(),
            "visualReference": CANONICAL_REFERENCE.name,
            "texturePolicy": "reference-face-transfer-with-clean-polygon-corners",
            "cornerCleanup": "no-corner-discoloration-no-dirty-corner-shading-no-ao",
            "edgePolicy": "dark-timber-edges-no-white-halo-no-bright-inner-fringe",
            "textureCoverage": "full-face-to-contour",
            "antiCloning": {
                "policy": "deterministic-inset-source-sampling",
                "maximumSourceOffsetPixels4x": [14, 10],
                "changesGeometryOrColor": False,
            },
            "seed": SEED,
            "styleVersion": "v11",
            "approvalStatus": "awaiting-approval",
        }
    )
    return image, metadata


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def save_webp(image: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="WEBP", lossless=True, method=6, exact=True)


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def compose_family(family: str, output_dir: Path) -> list[dict[str, object]]:
    geometry = FAMILIES[family]
    results: list[dict[str, object]] = []
    unit_tile, unit_metadata = render_stack(quantity_layouts()[0], geometry)
    unit_path = output_dir / "unit-tiles" / f"{family}-unit-tile-master-v11.png"
    unit_path.parent.mkdir(parents=True, exist_ok=True)
    unit_tile.save(unit_path)
    unit_hash = sha256(unit_path)
    write_json(unit_path.with_suffix(".json"), unit_metadata)

    for layout in quantity_layouts():
        image, metadata = render_stack(layout, geometry)
        filename = f"{family}-{layout.suffix}-master-v11.webp"
        image_path = output_dir / family / filename
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
        results.append({"image": image_path, "manifest": manifest_path, **metadata})
    return results


def normalize_icon(source_path: Path, output_path: Path) -> dict[str, object]:
    source = Image.open(source_path).convert("RGBA")
    alpha_bounds = source.getchannel("A").getbbox()
    if alpha_bounds is None:
        raise ValueError(f"Homepage icon source is empty: {source_path}")
    crop = source.crop(alpha_bounds)
    usable_width = round(CANVAS[0] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE)
    usable_height = round(CANVAS[1] * (1 - 2 * SAFE_INSET) - 2 * CONTOUR_RESERVE)
    scale = min(usable_width / crop.width, usable_height / crop.height)
    size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    crop = crop.resize(size, Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    position = ((CANVAS[0] - size[0]) // 2, (CANVAS[1] - size[1]) // 2)
    canvas.alpha_composite(crop, position)
    save_webp(canvas, output_path)
    metadata = alpha_metadata(canvas)
    metadata.update(
        {
            "styleVersion": "v11",
            "fitPolicy": "adaptive-bounds",
            "safeInset": SAFE_INSET,
            "approvalStatus": "awaiting-approval",
            "source": source_path.as_posix(),
            "sourceSha256": sha256(source_path),
            "visualReference": CANONICAL_REFERENCE.name,
            "styleContract": "canonical-19-45-37-warm-engraved-comic",
            "cornerCleanup": "no-corner-discoloration-no-dirty-corner-shading-no-ao",
            "outputSha256": sha256(output_path),
            "plannedRuntimePath": f"/images/illustrations/homepage-v11/{output_path.name}",
        }
    )
    write_json(output_path.with_suffix(".manifest.json"), metadata)
    return {"image": output_path, **metadata}


def contact_sheet(
    entries: Sequence[dict[str, object]],
    output_path: Path,
    title: str,
    background: str,
    cell_size: tuple[int, int] = (480, 320),
    columns: int = 4,
) -> None:
    rows = math.ceil(len(entries) / columns)
    header = 72
    sheet = Image.new("RGB", (cell_size[0] * columns, header + cell_size[1] * rows), background)
    draw = ImageDraw.Draw(sheet)
    ink = "#2B160A" if background.lower() != "#3b352f" else "#FFF7E8"
    draw.text((24, 22), title, fill=ink, stroke_width=0)
    for index, entry in enumerate(entries):
        image = Image.open(Path(entry["image"])).convert("RGBA")
        cell_x = index % columns * cell_size[0]
        cell_y = header + index // columns * cell_size[1]
        max_width = cell_size[0] - 36
        max_height = cell_size[1] - 58
        scale = min(max_width / image.width, max_height / image.height)
        size = (round(image.width * scale), round(image.height * scale))
        preview = image.resize(size, Image.Resampling.LANCZOS)
        sheet.paste(
            preview,
            (cell_x + (cell_size[0] - size[0]) // 2, cell_y + 8),
            preview,
        )
        manifest = Path(entry.get("manifest", ""))
        label = manifest.stem.replace(".manifest", "") if manifest.name else Path(entry["image"]).stem
        draw.text((cell_x + 14, cell_y + cell_size[1] - 34), label, fill=ink)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output_path)


def assert_family_contract(results: Sequence[dict[str, object]], family: str) -> None:
    expected_counts = [1, 2, 3, 6, 9, 12, 16]
    actual_counts = [int(result["representativeCount"]) for result in results]
    if actual_counts != expected_counts:
        raise AssertionError(f"{family}: expected counts {expected_counts}, got {actual_counts}")
    for result in results:
        bounds = result["alphaBounds"]
        if not isinstance(bounds, dict):
            raise AssertionError(f"{family}: missing alpha bounds")
        if float(bounds["x"]) < SAFE_INSET - 0.002 or float(bounds["y"]) < SAFE_INSET - 0.002:
            raise AssertionError(f"{family}: artwork crosses leading safe inset: {bounds}")
        if float(bounds["x"]) + float(bounds["width"]) > 1 - SAFE_INSET + 0.002:
            raise AssertionError(f"{family}: artwork crosses trailing horizontal inset: {bounds}")
        if float(bounds["y"]) + float(bounds["height"]) > 1 - SAFE_INSET + 0.002:
            raise AssertionError(f"{family}: artwork crosses trailing vertical inset: {bounds}")
        image = Image.open(Path(result["image"])).convert("RGBA")
        alpha = image.getchannel("A")
        if alpha.getpixel((0, 0)) != 0 or alpha.getpixel((image.width - 1, image.height - 1)) != 0:
            raise AssertionError(f"{family}: canvas corners must remain transparent")
        if result.get("canonicalTextureSha256") != hashlib.sha256(CANONICAL_UNIT_TILE.read_bytes()).hexdigest():
            raise AssertionError(f"{family}: canonical reference texture hash mismatch")
        if result.get("cornerCleanup") != "no-corner-discoloration-no-dirty-corner-shading-no-ao":
            raise AssertionError(f"{family}: missing clean-corner contract")


def geometry_contract() -> dict[str, float]:
    column_length = math.hypot(*PLANK_COLUMN)
    row_length = math.hypot(*PLANK_ROW)
    depth_length = math.hypot(*PLANK_DEPTH)
    cross_section_ratio = column_length / row_length
    depth_ratio = depth_length / column_length
    if not 2.3 <= cross_section_ratio <= 2.5:
        raise AssertionError(f"Plank cross-section ratio out of contract: {cross_section_ratio}")
    if not math.isclose(depth_ratio, 1.45, abs_tol=0.003):
        raise AssertionError(f"Plank compact-depth ratio out of contract: {depth_ratio}")
    board_ratio = math.hypot(*FAMILIES["board"].column) / math.hypot(*FAMILIES["board"].row)
    lath_ratio = math.hypot(*FAMILIES["lath"].column) / math.hypot(*FAMILIES["lath"].row)
    if not 4.5 <= board_ratio <= 5.0:
        raise AssertionError(f"Board cross-section ratio out of contract: {board_ratio}")
    if not 1.25 <= lath_ratio <= 1.5:
        raise AssertionError(f"Lath cross-section ratio out of contract: {lath_ratio}")
    return {
        "crossSectionRatio": round(cross_section_ratio, 6),
        "depthToWidthRatio": round(depth_ratio, 6),
        "boardCrossSectionRatio": round(board_ratio, 6),
        "lathCrossSectionRatio": round(lath_ratio, 6),
    }
