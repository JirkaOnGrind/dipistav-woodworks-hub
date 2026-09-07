from __future__ import annotations

import hashlib
import json
import math
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[3]
STATE_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks" / "state-03"
VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
RUN_ROOT = STATE_ROOT / "determinism-verify-c" if VERIFY_RUN else STATE_ROOT / "candidates"
SOURCE_ROOT = STATE_ROOT / "source"
MASTER_ROOT = RUN_ROOT / "masters"
QA_ROOT = RUN_ROOT / "qa"
SOURCE = SOURCE_ROOT / "pellets-blank-prone-heavy-source-c-v18.png"
PRONE_UNIT = SOURCE_ROOT / "pellets-blank-prone-heavy-unit-candidate-c-v18.png"
PROMPT = STATE_ROOT / "pellets-blank-state-03-candidate-c-v18.prompt.md"
MASTER_PNG = MASTER_ROOT / "pellets-blank-03-master-candidate-c-v18.png"
MASTER_WEBP = MASTER_ROOT / "pellets-blank-03-master-candidate-c-v18.webp"
MANIFEST = MASTER_ROOT / "pellets-blank-03-master-candidate-c-v18.manifest.json"
UPRIGHT = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.png"
UPRIGHT_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.lock.json"
LOGO_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-logo-flat-master-v18.lock.json"
LAYOUT_REFERENCE = ROOT / "Obrázek Codex 27. 8. 2026 13_05_38.png"

EXPECTED_SOURCE_BOUNDS = (39, 163, 1230, 1102)
TARGET_WIDTH = 1060
TARGET_HEIGHT = 836
WORK_SCALE = 4
ROW_SLOPE = 170 / 520
MICRO_GAP_PIXELS = 8
SAFE_INSET = 0.07

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import sanitize_antialias_alpha, save_webp  # noqa: E402
from pellet_artwork_v15 import alpha_bbox, composite, source_rgba  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_lock(asset: Path, lock_path: Path) -> str:
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    actual = sha256(asset)
    expected = lock["png"]["sha256"]
    if actual != expected:
        raise ValueError(f"Locked source changed: {actual} != {expected}")
    return actual


def clean_warm_alpha(image: Image.Image) -> Image.Image:
    pixels = np.asarray(sanitize_antialias_alpha(image.convert("RGBA"))).copy()
    alpha = pixels[:, :, 3]
    rgb = pixels[:, :, :3].astype(np.int16)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    bright_neutral = (alpha > 0) & (alpha < 245) & (pixels[:, :, :3].min(axis=2) >= 220)
    neutral_shadow = (alpha > 0) & (chroma < 18)
    pixels[bright_neutral | neutral_shadow, 3] = 0
    pixels[pixels[:, :, 3] < 2, 3] = 0
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def normalize_heavy_unit(source: Image.Image) -> Image.Image:
    bounds = alpha_bbox(source)
    if bounds != EXPECTED_SOURCE_BOUNDS:
        raise ValueError(f"Heavy source bounds changed: {bounds}")
    crop = clean_warm_alpha(source.crop(bounds))
    work = crop.resize((TARGET_WIDTH * WORK_SCALE, TARGET_HEIGHT * WORK_SCALE), Image.Resampling.BICUBIC)
    unit = work.resize((TARGET_WIDTH, TARGET_HEIGHT), Image.Resampling.LANCZOS)
    return clean_warm_alpha(unit)


def overlap_count(first: np.ndarray, second: np.ndarray, dx: int, dy: int) -> int:
    height, width = first.shape
    if dx >= width or dy >= height:
        return 0
    return int(np.count_nonzero(first[dy:height, dx:width] & second[: height - dy, : width - dx]))


def find_collision_free_row_vector(unit: Image.Image) -> tuple[int, int, int, int]:
    mask = np.asarray(unit.getchannel("A")) > 8
    radius = MICRO_GAP_PIXELS // 2
    dilated = np.asarray(
        Image.fromarray((mask.astype(np.uint8) * 255), "L").filter(ImageFilter.MaxFilter(radius * 2 + 1))
    ) > 0
    for dx in range(500, 901):
        dy = round(dx * ROW_SLOPE)
        raw_overlap = overlap_count(mask, mask, dx, dy)
        expanded_overlap = overlap_count(dilated, dilated, dx, dy)
        if raw_overlap == 0 and expanded_overlap == 0:
            return dx, dy, raw_overlap, expanded_overlap
    raise ValueError("Could not find a collision-free row vector")


def expanded_canvas(union_width: int, union_height: int) -> tuple[int, int]:
    required_width = math.ceil(union_width / (1 - SAFE_INSET * 2))
    required_height = math.ceil(union_height / (1 - SAFE_INSET * 2))
    return (
        math.ceil(required_width / 256) * 256,
        math.ceil(required_height / 256) * 256,
    )


def checkerboard(size: tuple[int, int], cell: int = 32) -> Image.Image:
    image = Image.new("RGBA", size, (238, 238, 238, 255))
    draw = ImageDraw.Draw(image)
    for y in range(0, size[1], cell):
        for x in range(0, size[0], cell):
            if (x // cell + y // cell) % 2:
                draw.rectangle((x, y, x + cell - 1, y + cell - 1), fill=(207, 207, 207, 255))
    return image


def thumbnail_panel(image: Image.Image, size: int, background: tuple[int, int, int, int]) -> Image.Image:
    panel = Image.new("RGBA", (size, size), background)
    crop = image.crop(alpha_bbox(image))
    scale = min((size - 8) / crop.width, (size - 8) / crop.height)
    thumb = crop.resize(
        (max(1, round(crop.width * scale)), max(1, round(crop.height * scale))),
        Image.Resampling.LANCZOS,
    )
    panel.alpha_composite(thumb, ((size - thumb.width) // 2, (size - thumb.height) // 2))
    return panel


def validate(master: Image.Image, canvas: tuple[int, int], unit: Image.Image, row: tuple[int, int]) -> dict[str, object]:
    pixels = np.asarray(master)
    alpha = pixels[:, :, 3]
    bounds = alpha_bbox(master)
    margins = (bounds[0], bounds[1], master.width - bounds[2], master.height - bounds[3])
    mask = np.asarray(unit.getchannel("A")) > 8
    radius = MICRO_GAP_PIXELS // 2
    dilated = np.asarray(
        Image.fromarray((mask.astype(np.uint8) * 255), "L").filter(ImageFilter.MaxFilter(radius * 2 + 1))
    ) > 0
    raw_overlap = overlap_count(mask, mask, row[0], row[1])
    expanded_overlap = overlap_count(dilated, dilated, row[0], row[1])
    bright_edge = int(np.count_nonzero((alpha > 0) & (alpha < 240) & (pixels[:, :, :3].min(axis=2) >= 225)))
    errors: list[str] = []
    if master.size != canvas:
        errors.append(f"canvas mismatch: {master.size} != {canvas}")
    if any(alpha[y, x] for x, y in ((0, 0), (master.width - 1, 0), (0, master.height - 1), (master.width - 1, master.height - 1))):
        errors.append("corners are not transparent")
    if margins[0] < master.width * SAFE_INSET or margins[2] < master.width * SAFE_INSET:
        errors.append("horizontal safe inset failed")
    if margins[1] < master.height * SAFE_INSET or margins[3] < master.height * SAFE_INSET:
        errors.append("vertical safe inset failed")
    if raw_overlap:
        errors.append(f"instance alpha overlap: {raw_overlap}")
    if expanded_overlap:
        errors.append(f"verified micro-gap below {MICRO_GAP_PIXELS}px")
    if bright_edge:
        errors.append(f"bright edge pixels: {bright_edge}")
    return {
        "canvas": {"width": canvas[0], "height": canvas[1]},
        "alphaBoundsPixels": {"left": bounds[0], "top": bounds[1], "right": bounds[2], "bottom": bounds[3]},
        "marginsPixels": {"left": margins[0], "top": margins[1], "right": margins[2], "bottom": margins[3]},
        "safeInset": SAFE_INSET,
        "adjacentAlphaOverlapPixels": raw_overlap,
        "dilatedGapOverlapPixels": expanded_overlap,
        "verifiedMinimumMicroGapPixels": MICRO_GAP_PIXELS,
        "whiteOrBrightEdgePixels": bright_edge,
        "transparentRgbClean": bool(np.all(pixels[:, :, :3][alpha == 0] == 0)),
        "errors": errors,
        "status": "pass" if not errors else "fail",
    }


def save_qa(master: Image.Image, report: dict[str, object]) -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    composite(master, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-c-v18-light.png")
    composite(master, (55, 49, 44, 255)).save(QA_ROOT / "pellets-blank-03-candidate-c-v18-dark.png")
    alpha = checkerboard(master.size)
    alpha.alpha_composite(master)
    alpha.save(QA_ROOT / "pellets-blank-03-candidate-c-v18-alpha.png")
    thumbnail_panel(master, 320, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-c-v18-320px.png")
    thumbnail_panel(master, 80, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-c-v18-80px.png")
    (QA_ROOT / "pellets-blank-03-candidate-c-v18-validation.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    for required in (SOURCE, PROMPT, UPRIGHT, UPRIGHT_LOCK, LOGO_LOCK, LAYOUT_REFERENCE):
        if not required.exists():
            raise FileNotFoundError(required)
    upright_hash = verify_lock(UPRIGHT, UPRIGHT_LOCK)
    source, alpha_method = source_rgba(SOURCE)
    unit = normalize_heavy_unit(source)
    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    unit.save(PRONE_UNIT, format="PNG", optimize=True)

    dx, dy, _, _ = find_collision_free_row_vector(unit)
    union_width = unit.width + dx * 2
    union_height = unit.height + dy * 2
    canvas = expanded_canvas(union_width, union_height)
    origin = ((canvas[0] - union_width) // 2, (canvas[1] - union_height) // 2)
    placements = tuple((origin[0] + dx * index, origin[1] + dy * index) for index in range(3))

    master = Image.new("RGBA", canvas, (0, 0, 0, 0))
    for position in placements:
        master.alpha_composite(unit, position)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    master = Image.fromarray(pixels, "RGBA")
    report = validate(master, canvas, unit, (dx, dy))
    if report["status"] != "pass":
        raise ValueError(json.dumps(report, indent=2))

    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    master.save(MASTER_PNG, format="PNG", optimize=True)
    save_webp(master, MASTER_WEBP)
    save_qa(master, report)

    pixel_hash = hashlib.sha256(unit.tobytes()).hexdigest()
    manifest = {
        "candidateId": "pellets-blank-03-master-candidate-c-v18",
        "supersedesRejectedCandidate": "pellets-blank-03-master-candidate-b-v18",
        "phase": 2,
        "tier": 3,
        "quantity": 3,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "canvas": {"width": canvas[0], "height": canvas[1]},
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": "three-byte-identical-heavy-prone-units-collision-free-no-instance-resampling",
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {
            "uprightAnchorFootprintPixels": {"width": 520, "height": 863},
            "proneProjectedWidthPixels": TARGET_WIDTH,
            "proneProjectedHeightPixels": TARGET_HEIGHT,
            "instanceScalePercent": [100, 100, 100],
            "zoomOutAllowed": False,
            "canvasExpanded": True,
        },
        "massProfile": "full-heavy-stuffed-15kg-with-convex-load-surface-and-deep-gussets",
        "layout": "one-ground-layer-three-separated-prone-bags-side-by-side",
        "rowVectorPixels": {"x": dx, "y": dy},
        "verifiedMicroGapPixels": MICRO_GAP_PIXELS,
        "placements": [
            {"id": f"prone-{index + 1}", "x": position[0], "y": position[1], "width": unit.width, "height": unit.height, "layer": 1}
            for index, position in enumerate(placements)
        ],
        "proneUnitSource": str(PRONE_UNIT.relative_to(ROOT)).replace("\\", "/"),
        "proneUnitSourceSha256": sha256(PRONE_UNIT),
        "instancePixelSourceSha256": [pixel_hash, pixel_hash, pixel_hash],
        "generatedSource": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "generatedSourceSha256": sha256(SOURCE),
        "sourceAlphaMethod": alpha_method,
        "lockedUprightUnitSha256": upright_hash,
        "lockedLogoSha256": json.loads(LOGO_LOCK.read_text(encoding="utf-8"))["png"]["sha256"],
        "layoutReferenceSha256": sha256(LAYOUT_REFERENCE),
        "promptSpec": str(PROMPT.relative_to(ROOT)).replace("\\", "/"),
        "promptSpecSha256": sha256(PROMPT),
        "validation": report,
        "masterPngSha256": sha256(MASTER_PNG),
        "masterWebpSha256": sha256(MASTER_WEBP),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
