from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[3]
STATE_ROOT = ROOT / "tmp" / "pellets-v18-phase2-blank-stacks" / "state-02"
VERIFY_RUN = os.environ.get("DIPISTAV_VERIFY_RUN") == "1"
RUN_ROOT = STATE_ROOT / "determinism-verify" if VERIFY_RUN else STATE_ROOT / "candidates"
MASTER_ROOT = RUN_ROOT / "masters"
QA_ROOT = RUN_ROOT / "qa"
PROMPT = STATE_ROOT / "pellets-blank-state-02-candidate-a-v18.prompt.md"
MASTER_PNG = MASTER_ROOT / "pellets-blank-02-master-candidate-a-v18.png"
MASTER_WEBP = MASTER_ROOT / "pellets-blank-02-master-candidate-a-v18.webp"
MANIFEST = MASTER_ROOT / "pellets-blank-02-master-candidate-a-v18.manifest.json"
UNIT = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.png"
UNIT_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-blank-upright-unit-master-v18.lock.json"
LOGO_LOCK = ROOT / "artwork-sources" / "pellets" / "pellets-logo-flat-master-v18.lock.json"
LAYOUT_REFERENCE = ROOT / "Obrázek Codex 27. 8. 2026 13_05_38.png"

CANVAS = (1536, 1024)
UNIT_BOUNDS = (508, 80, 1028, 943)
UNIT_SIZE = (520, 863)
GAP = 16
PLACEMENTS = ((240, 80), (776, 80))

sys.path.insert(0, str(ROOT / "scripts"))
from artwork_v11 import save_webp  # noqa: E402
from pellet_artwork_v15 import alpha_bbox, composite, metadata  # noqa: E402


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def verify_lock(asset: Path, lock_path: Path) -> str:
    lock = json.loads(lock_path.read_text(encoding="utf-8"))
    actual = sha256(asset)
    expected = lock["png"]["sha256"]
    if actual != expected:
        raise ValueError(f"Locked blank unit changed: {actual} != {expected}")
    return actual


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
    composite(master, (248, 241, 229, 255)).save(QA_ROOT / "pellets-blank-02-candidate-a-v18-light.png")
    composite(master, (55, 49, 44, 255)).save(QA_ROOT / "pellets-blank-02-candidate-a-v18-dark.png")
    alpha = checkerboard(master.size)
    alpha.alpha_composite(master)
    alpha.save(QA_ROOT / "pellets-blank-02-candidate-a-v18-alpha.png")
    thumbnail_panel(master, 320, (248, 241, 229, 255)).save(
        QA_ROOT / "pellets-blank-02-candidate-a-v18-320px.png"
    )
    thumbnail_panel(master, 80, (248, 241, 229, 255)).save(
        QA_ROOT / "pellets-blank-02-candidate-a-v18-80px.png"
    )


def main() -> None:
    for required in (UNIT, UNIT_LOCK, LOGO_LOCK, LAYOUT_REFERENCE, PROMPT):
        if not required.exists():
            raise FileNotFoundError(required)
    unit_hash = verify_lock(UNIT, UNIT_LOCK)
    locked = Image.open(UNIT).convert("RGBA")
    if alpha_bbox(locked) != UNIT_BOUNDS:
        raise ValueError(f"Locked unit bounds changed: {alpha_bbox(locked)}")
    unit = locked.crop(UNIT_BOUNDS)
    if unit.size != UNIT_SIZE:
        raise ValueError(f"Locked unit size changed: {unit.size}")

    master = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    for position in PLACEMENTS:
        master.alpha_composite(unit, position)
    pixels = np.asarray(master).copy()
    pixels[pixels[:, :, 3] == 0, :3] = 0
    master = Image.fromarray(pixels, "RGBA")

    MASTER_ROOT.mkdir(parents=True, exist_ok=True)
    master.save(MASTER_PNG, format="PNG", optimize=True)
    save_webp(master, MASTER_WEBP)
    save_qa(master)

    unit_pixel_hash = hashlib.sha256(unit.tobytes()).hexdigest()
    manifest = {
        "candidateId": "pellets-blank-02-master-candidate-a-v18",
        "phase": 2,
        "stateIndex": 2,
        "quantity": 2,
        "approvalStatus": "awaiting-visual-approval",
        "runtimeActive": False,
        **metadata(master),
        "brandingPolicy": "zero-branding-all-surfaces",
        "compositionMode": "byte-identical-unit-composite-no-resampling",
        "cameraLock": {
            "projection": "orthographic",
            "azimuthDegrees": 40,
            "elevationDegrees": 27,
            "zoomFactor": 1.0,
            "canvasMayExpand": True,
        },
        "scaleLock": {
            "unitAlphaFootprintPixels": {"width": UNIT_SIZE[0], "height": UNIT_SIZE[1]},
            "instanceScalePercent": [100, 100],
            "zoomOutAllowed": False,
        },
        "layout": "two-upright-parallel-side-by-side",
        "gapPixels": GAP,
        "placements": [
            {"id": "upright-1", "x": PLACEMENTS[0][0], "y": PLACEMENTS[0][1], "width": 520, "height": 863},
            {"id": "upright-2", "x": PLACEMENTS[1][0], "y": PLACEMENTS[1][1], "width": 520, "height": 863},
        ],
        "unitSource": str(UNIT.relative_to(ROOT)).replace("\\", "/"),
        "unitSourceSha256": unit_hash,
        "instancePixelSourceSha256": [unit_pixel_hash, unit_pixel_hash],
        "lockedLogoSha256": json.loads(LOGO_LOCK.read_text(encoding="utf-8"))["png"]["sha256"],
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
