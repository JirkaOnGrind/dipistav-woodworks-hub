from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[3]
STATE_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks" / "state-01"
SOURCE = STATE_ROOT / "source" / "pellets-blank-upright-source-a-v18.png"
PROMPT = STATE_ROOT / "pellets-blank-state-01-candidate-a-v18.prompt.md"
MASTER_ROOT = STATE_ROOT / "candidates" / "masters"
QA_ROOT = STATE_ROOT / "candidates" / "qa"
MASTER_PNG = MASTER_ROOT / "pellets-blank-01-master-candidate-b-v18.png"
MASTER_WEBP = MASTER_ROOT / "pellets-blank-01-master-candidate-b-v18.webp"
MANIFEST = MASTER_ROOT / "pellets-blank-01-master-candidate-b-v18.manifest.json"
LOCKED_UNIT = ROOT / "artwork-sources" / "pellets" / "pellets-bag-unit-tile-master-v17.png"
LOCKED_UNIT_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-bag-unit-tile-master-v17.lock.json"
LOCKED_LOGO = ROOT / "artwork-sources" / "pellets" / "pellets-logo-flat-master-v18.png"
LOCKED_LOGO_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-logo-flat-master-v18.lock.json"
LAYOUT_REFERENCE = ROOT / "Obrázek Codex 27. 8. 2026 13_05_38.png"

CANVAS = (1536, 1024)
WORK_SCALE = 4
LOCKED_BOUNDS = (508, 80, 1028, 943)
UNIT_FOOTPRINT = (LOCKED_BOUNDS[2] - LOCKED_BOUNDS[0], LOCKED_BOUNDS[3] - LOCKED_BOUNDS[1])

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import sanitize_antialias_alpha, save_webp  # noqa: E402
from pellet_artwork_v15 import alpha_bbox, composite, metadata, source_rgba  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_lock(asset: Path, lock_path: Path, key: str = "png") -> str:
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    actual = sha256(asset)
    expected = lock[key]["sha256"]
    if actual != expected:
        raise ValueError(f"Locked source changed: {asset}: {actual} != {expected}")
    return actual


def normalize_unit(source: Image.Image) -> Image.Image:
    bounds = alpha_bbox(source)
    crop = source.crop(bounds)
    work = crop.resize(
        (UNIT_FOOTPRINT[0] * WORK_SCALE, UNIT_FOOTPRINT[1] * WORK_SCALE),
        Image.Resampling.BICUBIC,
    )
    normalized = work.resize(UNIT_FOOTPRINT, Image.Resampling.LANCZOS)
    normalized = sanitize_antialias_alpha(normalized.convert("RGBA"))
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    canvas.alpha_composite(normalized, (LOCKED_BOUNDS[0], LOCKED_BOUNDS[1]))
    pixels = np.asarray(canvas).copy()
    alpha = pixels[:, :, 3]
    bright_fringe = (
        (alpha > 0)
        & (alpha < 240)
        & (pixels[:, :, :3].min(axis=2) >= 225)
    )
    pixels[bright_fringe, 3] = 0
    pixels[pixels[:, :, 3] < 2, 3] = 0
    pixels[pixels[:, :, 3] == 0, :3] = 0
    return Image.fromarray(pixels, "RGBA")


def checkerboard(size: tuple[int, int], cell: int = 24) -> Image.Image:
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


def save_qa(master: Image.Image) -> None:
    QA_ROOT.mkdir(parents=True, exist_ok=True)
    composite(master, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-01-candidate-b-v18-light.png")
    composite(master, (55, 49, 44, 255)).save(QA_ROOT / "pellets-blank-01-candidate-b-v18-dark.png")
    alpha = checkerboard(master.size)
    alpha.alpha_composite(master)
    alpha.save(QA_ROOT / "pellets-blank-01-candidate-b-v18-alpha.png")
    thumbnail_panel(master, 320, (248, 241, 229, 255)).save(
        QA_ROOT / "pellets-blank-01-candidate-b-v18-320px.png"
    )
    thumbnail_panel(master, 80, (248, 241, 229, 255)).save(
        QA_ROOT / "pellets-blank-01-candidate-b-v18-80px.png"
    )


def main() -> None:
    for required in (
        SOURCE,
        PROMPT,
        LOCKED_UNIT,
        LOCKED_UNIT_LOCK,
        LOCKED_LOGO,
        LOCKED_LOGO_LOCK,
        LAYOUT_REFERENCE,
    ):
        if not required.exists():
            raise FileNotFoundError(required)
    unit_hash = verify_lock(LOCKED_UNIT, LOCKED_UNIT_LOCK)
    logo_hash = verify_lock(LOCKED_LOGO, LOCKED_LOGO_LOCK)
    generated, alpha_method = source_rgba(SOURCE)
    generated_bounds = alpha_bbox(generated)
    master = normalize_unit(generated)

    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    master.save(MASTER_PNG, format="PNG", optimize=True)
    save_webp(master, MASTER_WEBP)
    save_qa(master)

    manifest = {
        "candidateId": "pellets-blank-01-master-candidate-b-v18",
        "supersedesTechnicalCandidate": "pellets-blank-01-master-candidate-a-v18",
        "phase": 2,
        "stateIndex": 1,
        "quantity": 1,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        **metadata(master),
        "brandingPolicy": "zero-branding-all-surfaces",
        "cameraLock": {
            "projection": "orthographic",
            "azimuthDegrees": 40,
            "elevationDegrees": 27,
            "zoomFactor": 1.0,
            "canvasMayExpand": True,
        },
        "scaleLock": {
            "anchorState": 1,
            "uprightBagAlphaFootprintPixels": {"width": UNIT_FOOTPRINT[0], "height": UNIT_FOOTPRINT[1]},
            "uprightBagAlphaBoundsPixels": {
                "left": LOCKED_BOUNDS[0],
                "top": LOCKED_BOUNDS[1],
                "right": LOCKED_BOUNDS[2],
                "bottom": LOCKED_BOUNDS[3],
            },
            "futureBagScalePercent": 100,
            "futureZoomOutAllowed": False,
        },
        "layout": "one-upright-bag",
        "sourceGeneratedBoundsPixels": {
            "left": generated_bounds[0],
            "top": generated_bounds[1],
            "right": generated_bounds[2],
            "bottom": generated_bounds[3],
        },
        "sourceAlphaMethod": alpha_method,
        "source": str(SOURCE.relative_to(ROOT)).replace("\\", "/"),
        "sourceSha256": sha256(SOURCE),
        "lockedUnitTileSha256": unit_hash,
        "lockedLogoSha256": logo_hash,
        "layoutReferenceSha256": sha256(LAYOUT_REFERENCE),
        "promptSpec": str(PROMPT.relative_to(ROOT)).replace("\\", "/"),
        "promptSpecSha256": sha256(PROMPT),
        "masterPngSha256": sha256(MASTER_PNG),
        "masterWebpSha256": sha256(MASTER_WEBP),
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps(manifest, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
