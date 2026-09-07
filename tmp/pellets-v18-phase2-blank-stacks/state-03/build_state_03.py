from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[3]
STATE_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks" / "state-03"
VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
RUN_ROOT = STATE_ROOT / "determinism-verify" if VERIFY_RUN else STATE_ROOT / "candidates"
SOURCE_ROOT = STATE_ROOT / "source"
MASTER_ROOT = RUN_ROOT / "masters"
QA_ROOT = RUN_ROOT / "qa"
SOURCE = SOURCE_ROOT / "pellets-blank-prone-unit-source-b-v18.png"
PRONE_UNIT = SOURCE_ROOT / "pellets-blank-prone-unit-candidate-b-v18.png"
PROMPT = STATE_ROOT / "pellets-blank-state-03-candidate-a-v18.prompt.md"
MASTER_PNG = MASTER_ROOT / "pellets-blank-03-master-candidate-b-v18.png"
MASTER_WEBP = MASTER_ROOT / "pellets-blank-03-master-candidate-b-v18.webp"
MANIFEST = MASTER_ROOT / "pellets-blank-03-master-candidate-b-v18.manifest.json"
UNIT_UPRIGHT = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.png"
UNIT_UPRIGHT_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.lock.json"
LOGO_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-logo-flat-master-v18.lock.json"
LAYOUT_REFERENCE = ROOT / "Obrázek Codex 27. 8. 2026 13_05_38.png"

CANVAS = (2560, 1536)
EXPECTED_SOURCE_BOUNDS = (239, 141, 1299, 911)
PRONE_SIZE = (1060, 770)
ROW_VECTOR = (520, 170)
PLACEMENTS = ((230, 213), (750, 383), (1270, 553))
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


def clean_prone_unit(source: Image.Image) -> Image.Image:
    bounds = alpha_bbox(source)
    if bounds != EXPECTED_SOURCE_BOUNDS:
        raise ValueError(f"Generated prone source bounds changed: {bounds}")
    crop = sanitize_antialias_alpha(source.crop(bounds).convert("RGBA"))
    pixels = np.asarray(crop).copy()
    alpha = pixels[:, :, 3]
    bright_fringe = (
        (alpha > 0)
        & (alpha < 240)
        & (pixels[:, :, :3].min(axis=2) >= 225)
    )
    pixels[bright_fringe, 3] = 0
    rgb = pixels[:, :, :3].astype(np.int16)
    chroma = rgb.max(axis=2) - rgb.min(axis=2)
    neutral_contact_fringe = (pixels[:, :, 3] > 0) & (chroma < 18)
    pixels[neutral_contact_fringe, 3] = 0
    pixels[pixels[:, :, 3] < 2, 3] = 0
    pixels[pixels[:, :, 3] == 0, :3] = 0
    cleaned = Image.fromarray(pixels, "RGBA")
    if cleaned.size != PRONE_SIZE:
        raise ValueError(f"Prone unit footprint changed: {cleaned.size}")
    return cleaned


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


def validate_expanded(master: Image.Image) -> dict[str, object]:
    pixels = np.asarray(master)
    alpha = pixels[:, :, 3]
    bounds = alpha_bbox(master)
    margins = (bounds[0], bounds[1], master.width - bounds[2], master.height - bounds[3])
    bright_edge = int(
        np.count_nonzero(
            (alpha > 0)
            & (alpha < 240)
            & (pixels[:, :, :3].min(axis=2) >= 225)
        )
    )
    errors: list[str] = []
    if master.size != CANVAS:
        errors.append(f"canvas mismatch: {master.size} != {CANVAS}")
    if any(alpha[y, x] for x, y in ((0, 0), (master.width - 1, 0), (0, master.height - 1), (master.width - 1, master.height - 1))):
        errors.append("canvas corners are not fully transparent")
    if margins[0] < master.width * SAFE_INSET or margins[2] < master.width * SAFE_INSET:
        errors.append(f"horizontal safe inset failed: {margins[0]},{margins[2]}")
    if margins[1] < master.height * SAFE_INSET or margins[3] < master.height * SAFE_INSET:
        errors.append(f"vertical safe inset failed: {margins[1]},{margins[3]}")
    if bright_edge:
        errors.append(f"white/bright semi-transparent edge pixels: {bright_edge}")
    return {
        "canvas": {"width": master.width, "height": master.height},
        "alphaBoundsPixels": {"left": bounds[0], "top": bounds[1], "right": bounds[2], "bottom": bounds[3]},
        "marginsPixels": {"left": margins[0], "top": margins[1], "right": margins[2], "bottom": margins[3]},
        "safeInset": SAFE_INSET,
        "whiteOrBrightEdgePixels": bright_edge,
        "transparentRgbClean": bool(np.all(pixels[:, :, :3][alpha == 0] == 0)),
        "errors": errors,
        "status": "pass" if not errors else "fail",
    }


def save_qa(master: Image.Image, validation: dict[str, object]) -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    composite(master, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-b-v18-light.png")
    composite(master, (55, 49, 44, 255)).save(QA_ROOT / "pellets-blank-03-candidate-b-v18-dark.png")
    alpha = checkerboard(master.size)
    alpha.alpha_composite(master)
    alpha.save(QA_ROOT / "pellets-blank-03-candidate-b-v18-alpha.png")
    thumbnail_panel(master, 320, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-b-v18-320px.png")
    thumbnail_panel(master, 80, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-03-candidate-b-v18-80px.png")
    (QA_ROOT / "pellets-blank-03-candidate-b-v18-validation.json").write_text(
        json.dumps(validation, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    for required in (SOURCE, PROMPT, UNIT_UPRIGHT, UNIT_UPRIGHT_LOCK, LOGO_LOCK, LAYOUT_REFERENCE):
        if not required.exists():
            raise FileNotFoundError(required)
    upright_hash = verify_lock(UNIT_UPRIGHT, UNIT_UPRIGHT_LOCK)
    source, alpha_method = source_rgba(SOURCE)
    prone = clean_prone_unit(source)
    SOURCE_ROOT.mkdir(parents=True, exist_ok=True)
    prone.save(PRONE_UNIT, format="PNG", optimize=True)

    master = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for position in PLACEMENTS:
        master.alpha_composite(prone, position)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    master = Image.fromarray(pixels, "RGBA")
    validation = validate_expanded(master)
    if validation["status"] != "pass":
        raise ValueError(json.dumps(validation, indent=2))

    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    master.save(MASTER_PNG, format="PNG", optimize=True)
    save_webp(master, MASTER_WEBP)
    save_qa(master, validation)

    unit_pixel_hash = hashlib.sha256(prone.tobytes()).hexdigest()
    bounds = alpha_bbox(master)
    manifest = {
        "candidateId": "pellets-blank-03-master-candidate-b-v18",
        "supersedesTechnicalCandidate": "pellets-blank-03-master-candidate-a-v18",
        "phase": 2,
        "tier": 3,
        "quantity": 3,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "alphaBoundsPixels": {"left": bounds[0], "top": bounds[1], "right": bounds[2], "bottom": bounds[3]},
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": "three-byte-identical-prone-units-no-resampling",
        "cameraLock": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27, "zoomFactor": 1.0},
        "scaleLock": {
            "uprightAnchorFootprintPixels": {"width": 520, "height": 863},
            "proneProjectedFootprintPixels": {"width": PRONE_SIZE[0], "height": PRONE_SIZE[1]},
            "instanceScalePercent": [100, 100, 100],
            "zoomOutAllowed": False,
            "canvasExpanded": True,
        },
        "layout": "one-flat-ground-layer-three-prone-bags-side-by-side-aligned",
        "rowVectorPixels": {"x": ROW_VECTOR[0], "y": ROW_VECTOR[1]},
        "placements": [
            {"id": f"prone-{index + 1}", "x": position[0], "y": position[1], "width": PRONE_SIZE[0], "height": PRONE_SIZE[1], "layer": 1}
            for index, position in enumerate(PLACEMENTS)
        ],
        "proneUnitSource": str(PRONE_UNIT.relative_to(ROOT)).replace("\\", "/"),
        "proneUnitSourceSha256": sha256(PRONE_UNIT),
        "instancePixelSourceSha256": [unit_pixel_hash, unit_pixel_hash, unit_pixel_hash],
        "generatedSource": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "generatedSourceSha256": sha256(SOURCE),
        "sourceAlphaMethod": alpha_method,
        "lockedUprightUnitSha256": upright_hash,
        "lockedLogoSha256": json.loads(LOGO_LOCK.read_text(encoding="utf-8"))["png"]["sha256"],
        "layoutReferenceSha256": sha256(LAYOUT_REFERENCE),
        "promptSpec": str(PROMPT.relative_to(ROOT)).replace("\\", "/"),
        "promptSpecSha256": sha256(PROMPT),
        "validation": validation,
        "masterPngSha256": sha256(MASTER_PNG),
        "masterWebpSha256": sha256(MASTER_WEBP),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
